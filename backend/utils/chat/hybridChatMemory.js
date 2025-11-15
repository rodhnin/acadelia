import pool from "../../lib/dbPool.js";
import { supabase } from "../../lib/supabaseService.js";
import { embeddings } from '../../lib/openai.js';
import { isValidUUID } from './validators.js';

class HybridChatMemory {
  constructor() {
    // Configuración balanceada y profesional
    this.config = {
      immediateContext: {
        maxMessages: 4,        // Suficiente para mantener flujo conversacional
        maxTokens: 1500        // Permitir contexto adecuado
      },
      semanticMemory: {
        maxRetrievals: 2,      // Conservador para evitar ruido
        similarityThreshold: 0.85, // Más estricto - solo muy relevante
        maxTokensPerRetrieval: 250  // Más compacto
      },
      userMemory: {
        extractPersonalInfo: true,
        maxPersonalFacts: 1
      },
      conversationFlow: {
        continuationThreshold: 0.7,  // Umbral para detectar continuaciones
        maxMessagesForContinuation: 2, // Revisar últimos 2 mensajes para contexto
        continuationKeywords: [
          'me gustaría discutir más', 'no entendí bien', 'puedes explicar más',
          'sigue explicando', 'continúa', 'más detalles', 'profundiza',
          'no me queda claro', 'puedes ampliar', 'no comprendo',
          'explícame mejor', 'dame más información', 'quiero saber más'
        ]
      }
    };
  }

  
  async loadHybridChatMemory(userId, avaId, chatId, currentQuery, herramientaId = null) {
    console.log(`🧠 ========== MEMORIA HÍBRIDA ACTIVADA ==========`);
    console.log(`👤 Usuario: ${userId} | 💬 Chat: ${chatId}`);
    console.log(`🔍 Query actual: "${currentQuery.substring(0, 100)}..."`);
    
    try {
      if (!isValidUUID(chatId)) {
        throw new Error("UUID de chat inválido");
      }

      const isContinuation = await this.detectConversationContinuation(
        userId, avaId, chatId, currentQuery, herramientaId
      );
      
      console.log(`🔄 Tipo de query: ${isContinuation ? 'CONTINUACIÓN' : 'NUEVA CONSULTA'}`);

      // 1. CARGAR MEMORIA DEL CHAT PARA EL PROFESOR ACADEL (siempre necesario)
      const immediateContext = await this.loadImmediateContext(
        userId, avaId, chatId, herramientaId
      );
      
      let semanticMemory = [];
      let userMemory = [];

      // 2. LÓGICA INTELIGENTE: Solo buscar memoria adicional si NO es continuación
      if (!isContinuation) {
        console.log(`🔍 Activando búsqueda semántica (nueva consulta)`);
        
        semanticMemory = await this.loadSemanticMemory(
          userId, avaId, chatId, currentQuery, herramientaId
        );
        
        userMemory = await this.loadUserMemory(
          userId, avaId, chatId, herramientaId
        );
      } else {
        console.log(`⏭️ Omitiendo búsqueda semántica (continuación detectada)`);
      }
      
      // 3. COMBINAR CON LÓGICA CONTEXTUAL
      const hybridMemory = this.combineMemorySourcesIntelligently(
        immediateContext, semanticMemory, userMemory, currentQuery, isContinuation
      );
      
      console.log(`🧠 ========== MEMORIA HÍBRIDA COMPLETADA ==========`);
      console.log(`📊 MEMORIA DEL CHAT PARA EL PROFESOR ACADEL: ${immediateContext.length} mensajes`);
      console.log(`🔍 Memoria semántica: ${semanticMemory.length} recuperaciones`);
      console.log(`👤 Memoria de usuario: ${userMemory.length} hechos`);
      console.log(`🎯 Total híbrido: ${hybridMemory.length} elementos`);
      
      return hybridMemory;
      
    } catch (error) {
      console.error("Error en memoria híbrida:", error);
      return await this.loadImmediateContext(userId, avaId, chatId, herramientaId);
    }
  }

  
  async detectConversationContinuation(userId, avaId, chatId, currentQuery, herramientaId = null) {
    const client = await pool.connect();
    
    try {
      // 1. Verificar palabras clave de continuación
      const hasKeywords = this.config.conversationFlow.continuationKeywords.some(keyword =>
        currentQuery.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeywords) {
        console.log(`🔄 Continuación detectada por palabras clave`);
        return true;
      }

      // 2. Verificar si la query es muy corta y específica (posible continuación)
      if (currentQuery.length < 50 && 
          (currentQuery.toLowerCase().includes('más') || 
           currentQuery.toLowerCase().includes('mejor') ||
           currentQuery.toLowerCase().includes('explica') ||
           currentQuery.toLowerCase().includes('no entiendo'))) {
        
        const recentMessages = await client.query(`
          SELECT message, role, timestamp
          FROM chat_history 
          WHERE id_user = $1 
            AND id_chat = $2::UUID 
            AND ($3::INTEGER IS NULL OR id_ava = $3)
            AND ($4::INTEGER IS NULL OR id_herramienta = $4)
            AND status != 'cancelled'
          ORDER BY timestamp DESC 
          LIMIT $5
        `, [
          userId, 
          chatId, 
          avaId || null, 
          herramientaId || null,
          this.config.conversationFlow.maxMessagesForContinuation
        ]);

        if (recentMessages.rows.length >= 2) {
          console.log(`🔄 Continuación detectada por contexto reciente y query corta`);
          return true;
        }
      }

      // 3. Verificar si el último mensaje del asistente es educativo/explicativo
      const lastAssistantMessage = await client.query(`
        SELECT message, timestamp
        FROM chat_history 
        WHERE id_user = $1 
          AND id_chat = $2::UUID 
          AND role = 'assistant'
          AND ($3::INTEGER IS NULL OR id_ava = $3)
          AND ($4::INTEGER IS NULL OR id_herramienta = $4)
          AND status != 'cancelled'
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [userId, chatId, avaId || null, herramientaId || null]);

      if (lastAssistantMessage.rows.length > 0) {
        const lastMessage = lastAssistantMessage.rows[0].message;
        
        // Si el último mensaje es educativo y la query actual pide más info
        const isEducationalResponse = lastMessage.length > 300 && (
          lastMessage.includes('ejemplo') || 
          lastMessage.includes('explicación') ||
          lastMessage.includes('concepto') ||
          lastMessage.includes('fórmula') ||
          lastMessage.includes('interpretación')
        );

        const queryAsksForMore = currentQuery.toLowerCase().includes('más') ||
                                currentQuery.toLowerCase().includes('mejor') ||
                                currentQuery.toLowerCase().includes('claro');

        if (isEducationalResponse && queryAsksForMore) {
          console.log(`🔄 Continuación detectada por respuesta educativa previa`);
          return true;
        }
      }

      return false;
      
    } catch (error) {
      console.error("Error detectando continuación:", error);
      return false; // Por defecto, tratar como nueva consulta
    } finally {
      client.release();
    }
  }

  
  async loadImmediateContext(userId, avaId, chatId, herramientaId = null) {
    const client = await pool.connect();
    
    try {
      console.log(`📅 Cargando MEMORIA DEL CHAT PARA EL PROFESOR ACADEL cronológico...`);
      
      const query = `
        SELECT role, message, timestamp, is_multimodal
        FROM chat_history 
        WHERE id_user = $1 
          AND id_chat = $2::UUID 
          AND ($3::INTEGER IS NULL OR id_ava = $3)
          AND ($4::INTEGER IS NULL OR id_herramienta = $4)
          AND status != 'cancelled'
        ORDER BY timestamp DESC 
        LIMIT $5
      `;
      
      const values = [
        userId, 
        chatId, 
        avaId || null, 
        herramientaId || null,
        this.config.immediateContext.maxMessages
      ];
      
      const result = await client.query(query, values);
      
      // Revertir orden para cronología (más antiguo primero)
      const chronologicalMessages = result.rows.reverse();
      
      return chronologicalMessages.map((msg, index) => ({
        type: 'immediate_context',
        role: msg.role === "user" ? "human" : "ai",
        content: `[MEMORIA DEL CHAT PARA EL PROFESOR ACADEL] ${msg.message}`,
        timestamp: msg.timestamp,
        priority: 20 + (10 - index), // Prioridad MUY ALTA para MEMORIA DEL CHAT PARA EL PROFESOR ACADEL
        source: 'chronological',
        isRecent: true
      }));
      
    } catch (error) {
      console.error("Error cargando MEMORIA DEL CHAT PARA EL PROFESOR ACADEL:", error);
      return [];
    } finally {
      client.release();
    }
  }

  
  async loadSemanticMemory(userId, avaId, chatId, currentQuery, herramientaId = null) {
    try {
      console.log(`🔍 Buscando memoria semántica relevante...`);
      
      const queryEmbedding = await embeddings.embedQuery(currentQuery);
      
      let rpcParams;
      if (herramientaId !== null && herramientaId !== undefined) {
        rpcParams = {
          query_embedding: queryEmbedding,
          id_user_param: userId,
          id_ava_param: null,
          id_herramienta_param: herramientaId,
          id_chat_param: chatId,
          match_count: this.config.semanticMemory.maxRetrievals,
        };
      } else {
        rpcParams = {
          query_embedding: queryEmbedding,
          id_user_param: userId,
          id_ava_param: avaId,
          id_herramienta_param: null,
          id_chat_param: chatId,
          match_count: this.config.semanticMemory.maxRetrievals,
        };
      }
      
      const { data, error } = await supabase.rpc('match_chat_history', rpcParams);
      
      if (error) throw error;
      
      const relevantMemories = (data || []).filter(item => 
        item.similarity >= this.config.semanticMemory.similarityThreshold
      );
      
      console.log(`🔍 Memoria semántica: ${relevantMemories.length} recuperaciones válidas`);
      
      return relevantMemories.map((item, index) => ({
        type: 'semantic_memory',
        role: item.role === "user" ? "human" : "ai",
        content: `[MEMORIA RELEVANTE] ${item.message.substring(0, this.config.semanticMemory.maxTokensPerRetrieval)}`,
        similarity: item.similarity,
        priority: item.similarity * 10, // Prioridad basada en similitud
        source: 'semantic_retrieval',
        isRecent: false
      }));
      
    } catch (error) {
      console.error("Error cargando memoria semántica:", error);
      return [];
    }
  }

  
  async loadUserMemory(userId, avaId, chatId, herramientaId = null) {
    const client = await pool.connect();
    
    try {
      console.log(`👤 Extrayendo memoria de usuario...`);
      
      const query = `
        SELECT message, timestamp
        FROM chat_history 
        WHERE id_user = $1 
          AND id_chat = $2::UUID 
          AND role = 'user'
          AND ($3::INTEGER IS NULL OR id_ava = $3)
          AND ($4::INTEGER IS NULL OR id_herramienta = $4)
          AND status != 'cancelled'
          AND (
            message ILIKE '%mi nombre es%' OR
            message ILIKE '%me llamo%' OR
            message ILIKE '%soy estudiante de%' OR
            message ILIKE '%estudio%' OR
            message ILIKE '%trabajo en%'
          )
        ORDER BY timestamp DESC
        LIMIT $5
      `;
      
      const values = [
        userId, 
        chatId, 
        avaId || null, 
        herramientaId || null,
        this.config.userMemory.maxPersonalFacts
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return [];
      }
      
      const mostImportantFact = result.rows[0];
      const fact = this.extractPersonalInfo(mostImportantFact.message);
      
      return [{
        type: 'user_memory',
        role: 'system',
        content: `[DATOS DEL USUARIO] ${fact}`,
        timestamp: mostImportantFact.timestamp,
        priority: 15, // Prioridad media-alta para datos personales
        source: 'user_extraction',
        isRecent: false
      }];
      
    } catch (error) {
      console.error("Error cargando memoria de usuario:", error);
      return [];
    } finally {
      client.release();
    }
  }

  
  combineMemorySourcesIntelligently(immediateContext, semanticMemory, userMemory, currentQuery, isContinuation) {
    console.log(`🎯 Combinando fuentes de memoria (continuación: ${isContinuation})...`);
    
    let allMemory = [];
    
    if (isContinuation) {
      console.log(`⏭️ Modo continuación: priorizando MEMORIA DEL CHAT PARA EL PROFESOR ACADEL`);
      allMemory = [
        ...immediateContext,   // Prioridad MÁXIMA
        ...userMemory.slice(0, 1)
      ];
    } else {
      console.log(`🆕 Modo nueva consulta: incluyendo memoria completa`);
      allMemory = [
        ...immediateContext,   // Prioridad alta
        ...userMemory,         // Prioridad media-alta 
        ...semanticMemory      // Prioridad media
      ];
    }
    
    allMemory = this.removeDuplicatesIntelligently(allMemory);
    
    allMemory.sort((a, b) => b.priority - a.priority);
    
    // Limitar tokens de forma más inteligente
    const maxTotalTokens = isContinuation ? 2000 : 3000; // Menos tokens para continuaciones
    let currentTokens = 0;
    const finalMemory = [];
    
    for (const memory of allMemory) {
      const memoryTokens = Math.ceil(memory.content.length / 4);
      
      if (currentTokens + memoryTokens <= maxTotalTokens) {
        finalMemory.push(memory);
        currentTokens += memoryTokens;
      } else {
        break;
      }
    }
    
    console.log(`✅ Memoria final: ${finalMemory.length} elementos, ~${currentTokens} tokens`);
    
    return finalMemory.map(memory => ({
      role: memory.role,
      content: memory.content
    }));
  }

  
  extractPersonalInfo(message) {
    // Patrones más específicos para información realmente importante
    const patterns = [
      /mi nombre es ([^.,!?]+)/i,
      /me llamo ([^.,!?]+)/i,
      /soy estudiante de ([^.,!?]+)/i,
      /estudio ([^.,!?]+) en/i,
      /trabajo en ([^.,!?]+)/i,
      /soy ([^.,!?]+ ingeniero|médico|estudiante)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return message.length > 150 ? message.substring(0, 100) + "..." : message;
  }
  
  removeDuplicatesIntelligently(memories) {
    const seen = new Set();
    const recentContent = new Set();
    
    return memories.filter(memory => {
      if (memory.isRecent) {
        const recentFingerprint = memory.content.substring(20, 80).toLowerCase();
        if (recentContent.has(recentFingerprint)) {
          return false;
        }
        recentContent.add(recentFingerprint);
        return true;
      }
      
      const fingerprint = memory.content.substring(0, 60).toLowerCase();
      if (seen.has(fingerprint)) {
        return false;
      }
      
      seen.add(fingerprint);
      return true;
    });
  }
}


const hybridMemory = new HybridChatMemory();

const loadHybridChatMemory = async (userId, avaId, chatId, currentQuery, herramientaId = null) => {
  return await hybridMemory.loadHybridChatMemory(userId, avaId, chatId, currentQuery, herramientaId);
};

const formatHybridMemoryForPrompt = (hybridMemory) => {
  if (!hybridMemory || hybridMemory.length === 0) {
    return [];
  }

  console.log(`🎯 ========== MEMORIA HÍBRIDA PARA PROMPT ==========`);
  
  // Agrupar por tipo para logging
  const byType = hybridMemory.reduce((acc, memory) => {
    const type = memory.content.includes('[DATOS DEL USUARIO]') ? 'user_data' :
                memory.content.includes('[MEMORIA DEL CHAT PARA EL PROFESOR ACADEL]') ? 'immediate' :
                memory.content.includes('[MEMORIA RELEVANTE]') ? 'semantic' : 'other';
    
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`👤 Datos de usuario: ${byType.user_data || 0}`);
  console.log(`📅 MEMORIA DEL CHAT PARA EL PROFESOR ACADEL: ${byType.immediate || 0}`);
  console.log(`🔍 Memoria semántica: ${byType.semantic || 0}`);
  console.log(`🎯 Total elementos: ${hybridMemory.length}`);
  
  console.log(`🎯 ========== FIN MEMORIA HÍBRIDA ==========`);
  
  return hybridMemory;
};

export {
  HybridChatMemory,
  loadHybridChatMemory,
  formatHybridMemoryForPrompt,
  hybridMemory
};