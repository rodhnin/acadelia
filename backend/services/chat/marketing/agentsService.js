// agentsService.js - VERSIÓN CON HERRAMIENTAS ESPECIALIZADAS + SISTEMA INTELIGENTE
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { llm } from "../../../lib/openai.js";
import { getMarketingTools, resetSessionTracker } from "./toolsService.js";
import { memoryService } from "./memoryService.js";
import { AGENT_PROMPTS, COORDINATION_ADDENDUM, toolsInstructions, FINAL_COORDINATOR_PROMPT } from '../../../utils/marketing/AcadeliaDNA.js';
import UniquenessMiddleware from "./uniquenessMiddleware.js";

export const agentService = {
  escapePromptBraces(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    return text
      .replace(/{/g, "{{")    // Escapar {
      .replace(/}/g, "}}")   // Escapar }
      .replace(/\$/g, "$")  // Escapar $ por si acaso
      .replace(/\[/g, "\\[") // Escapar [ por si acaso
      .replace(/\]/g, "\\]"); // Escapar ] por si acaso
  },

  async createAgent(type, extraContext = {}) {
    if (!AGENT_PROMPTS[type]) {
      throw new Error(`Tipo de agente desconocido: ${type}`);
    }
    
    const tools = getMarketingTools(type);
    console.log(`🛠️ Agente ${type.toUpperCase()} configurado con ${tools.length} herramientas específicas (Sistema Inteligente)`);
    
    const systemPrompt = AGENT_PROMPTS[type];
    
    let contextString = "";
    if (Object.keys(extraContext).length > 0) {
      contextString = Object.entries(extraContext)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            let jsonString = JSON.stringify(value, null, 2);
            jsonString = jsonString
              .replace(/{/g, "{{")    
              .replace(/}/g, "}}")   
              .replace(/\$/g, "$");  
            return `${key}:\n${jsonString}`;
          }
          const stringValue = String(value)
            .replace(/{/g, "{{")
            .replace(/}/g, "}}")
            .replace(/\$/g, "$");
          return `${key}: ${stringValue}`;
        })
        .join("\n\n");
    }
      
    let coordinationString = "";
    if (type !== "strategist" && COORDINATION_ADDENDUM[type]) {
      coordinationString = COORDINATION_ADDENDUM[type];
      
      coordinationString += `\n\n🧠 SISTEMA INTELIGENTE ACTIVO: Embeddings + IA detectarán automáticamente duplicados.`;
      
      if (extraContext.elementsAlreadySaved) {
        const safeElementsInfo = String(extraContext.elementsAlreadySaved)
          .replace(/{/g, "{{")
          .replace(/}/g, "}}")
          .replace(/\$/g, "$");
        coordinationString += `\n\n🚨 ELEMENTOS YA PROCESADOS:\n${safeElementsInfo}\n\n⚠️ NO DUPLICAR - El Sistema Inteligente validará automáticamente la unicidad.`;
      }
    }
    
    const specificToolInstructions = toolsInstructions[type] || `
  🎯 HERRAMIENTAS CON SISTEMA INTELIGENTE:
  - Cada herramienta usa embeddings + IA para detectar duplicados
  - El sistema analizará automáticamente similitudes psicográficas y semánticas
  - Coordina con otros agentes para máxima eficiencia`;
    
    // Prompt con instrucciones específicas
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["system", specificToolInstructions],
      ["system", coordinationString],
      ["system", `Contexto adicional:\n${contextString}`],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    
    const agent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt,
    });
    
    return agent;
  },
  
  async createAgentExecutor(agent, tools) {
    return new AgentExecutor({
      agent,
      tools,
      verbose: false,
      maxIterations: 3,
      returnIntermediateSteps: true,
      
      handleToolError: async (error, toolCall) => {
        if (error.message && (
            error.message.includes("ya existe") || 
            error.message.includes("existente") || 
            error.message.includes("duplicado") || 
            error.message.includes("similar ya") ||
            error.message.includes("detectado por IA") ||
            error.message.includes("Sistema Inteligente"))) {
          return `El Sistema Inteligente (embeddings + IA) detectó que esta información ya existe. Tu agente especializado debe buscar elementos únicos y nuevos.`;
        }
        
        if (error.message && error.message.includes("no tiene acceso")) {
          return `Esta herramienta es exclusiva de otro agente especializado. El Sistema Inteligente coordinará automáticamente - enfócate en tu área de especialización.`;
        }
        
        if (error.message && error.message.includes("embedding")) {
          return `Error en análisis semántico. El Sistema Inteligente continuará con métodos alternativos de verificación.`;
        }
        
        return `Error al usar ${toolCall.tool}: ${error.message}`;
      }
    });
  },
  
  async processWithMultiAgentStreaming(query, chatHistory = [], options = {}) {
    const { onPartialResponse = null, explainLevel = 'intermediate' } = options;
    
    try {
      console.log("🚀 Procesando consulta con multi-agente ESPECIALIZADO + Sistema Inteligente:", query);
      
      // 1. RESET del tracker de sesión
      resetSessionTracker();
      
      // 2. Usar el agente director para determinar qué agentes se necesitan
      const directorModule = await import('./directorAgent.js');
      const agentDecision = await directorModule.directorAgent.determineRequiredAgents(query);
      
      console.log("🎯 Decisión del agente director:", agentDecision);
      
      // 3. ENVIAR METADATOS DE SELECCIÓN DE AGENTES AL FRONTEND
      if (onPartialResponse) {
        const agentSelectionMetadata = {
          agentSelection: agentDecision,
          specialization_note: "Cada agente tiene herramientas específicas con Sistema Inteligente (embeddings + IA)",
          intelligent_system: true
        };
        
        const metadataChunk = `**METADATA_START**${JSON.stringify(agentSelectionMetadata)}**METADATA_END**`;
        console.log('📤 Enviando metadatos de selección con Sistema Inteligente:', metadataChunk);
        onPartialResponse(metadataChunk);
      }
      
      // 4. Ejecutar agentes especializados y recopilar resultados
      const agentResults = {
        strategist: null,
        analyst: null,
        creative: null,
        profile: null
      };
      
      const sharedContext = {
        savedProfiles: [],
        savedContents: [],
        savedTrends: [],
        savedInsights: [],
        decisions: {},
        memoryCount: 0,
        intelligentSystemUsed: true
      };
      
      console.log("🎯 Ejecutando STRATEGIST con Sistema Inteligente...");
      const strategistAgent = await this.createAgent("strategist");
      const strategistExecutor = await this.createAgentExecutor(strategistAgent, getMarketingTools('strategist'));
      
      const strategistResult = await strategistExecutor.invoke({
        input: query,
        chat_history: chatHistory
      });
      
      agentResults.strategist = strategistResult.output;
      
      this.extractAgentDecisions(strategistResult, sharedContext, 'strategist');
      
      if (agentDecision.analyst) {
        console.log("📊 Ejecutando ANALYST con Sistema Inteligente...");
        const analystResult = await this.executeSpecializedAgent('analyst', query, chatHistory, sharedContext, agentResults);
        agentResults.analyst = analystResult;
      }
      
      if (agentDecision.creative) {
        console.log("🎨 Ejecutando CREATIVE con Sistema Inteligente...");
        const creativeResult = await this.executeSpecializedAgent('creative', query, chatHistory, sharedContext, agentResults);
        agentResults.creative = creativeResult;
      }
      
      if (agentDecision.profile) {
        console.log("👥 Ejecutando PROFILE con Sistema Inteligente...");
        const profileResult = await this.executeSpecializedAgent('profile', query, chatHistory, sharedContext, agentResults);
        agentResults.profile = profileResult;
      }
      
      // 7. ENVIAR METADATOS DE AGENTES USADOS AL FRONTEND
      const agentsUsed = Object.keys(agentResults).filter(key => agentResults[key] !== null);
      
      if (onPartialResponse) {
        const agentsMetadata = {
          agentsUsed: agentsUsed,
          specialization_summary: {
            strategist: "Insights estratégicos únicos (IA + embeddings)",
            analyst: "Trends e interacciones únicas (IA + embeddings)",
            creative: "Contenido viral único (IA + embeddings)",
            profile: "Perfiles de estudiantes únicos (IA + embeddings)"
          },
          intelligent_system: true,
          duplication_prevention: "embeddings + AI analysis"
        };
        
        const metadataChunk = `**METADATA_START**${JSON.stringify(agentsMetadata)}**METADATA_END**`;
        console.log('📤 Enviando metadatos de especialización con Sistema Inteligente:', metadataChunk);
        onPartialResponse(metadataChunk);
      }
      
      // 8. Consolidar y generar respuesta final con streaming
      console.log("🔗 Consolidando respuesta final...");
      
      const finalPrompt = this.buildFinalPrompt(query, agentResults, sharedContext);
      
      // 9. Hacer streaming de la respuesta final
      let fullResponse = "";
      
      const formattedPrompt = await finalPrompt.formatMessages({});
      const completion = await llm.stream(formattedPrompt);
      
      for await (const chunk of completion) {
        if (chunk.content) {
          fullResponse += chunk.content;
          if (onPartialResponse) {
            onPartialResponse(chunk.content);
          }
        }
      }
      
      await this.finalizeResponseWithIntelligentSystem(query, fullResponse, sharedContext, agentsUsed, explainLevel, onPartialResponse);
      
      return {
        response: fullResponse,
        agentsUsed: agentsUsed,
        agentSelection: agentDecision,
        specialization_used: true,
        intelligent_system_used: true,
        stats: {
          savedProfiles: sharedContext.savedProfiles.length,
          savedContents: sharedContext.savedContents.length,
          savedTrends: sharedContext.savedTrends.length,
          savedInsights: sharedContext.memoryCount
        }
      };
      
    } catch (error) {
      console.error("❌ Error en procesamiento multi-agente con Sistema Inteligente:", error);
      
      if (onPartialResponse) {
        const errorMessage = `\n\nLo siento, ocurrió un error al procesar tu consulta con el Sistema Inteligente: ${error.message}`;
        onPartialResponse(errorMessage);
      }
      
      return {
        response: `Lo siento, ocurrió un error al procesar tu consulta con el Sistema Inteligente: ${error.message}`,
        agentsUsed: [],
        error: error.message,
        intelligent_system_used: false
      };
    }
  },
  
  async executeSpecializedAgent(agentType, query, chatHistory, sharedContext, agentResults) {
    try {
      const savedItemsInfo = this.buildSavedItemsInfo(sharedContext);
      
      const strategistThoughts = agentResults.strategist ? 
        this.escapePromptBraces(agentResults.strategist.substring(0, 1000)) : "";
      
      const cleanSavedItemsInfo = this.escapePromptBraces(savedItemsInfo);
      
      console.log(`🔧 Ejecutando agente especializado ${agentType.toUpperCase()} con Sistema Inteligente`);
      
      const agent = await this.createAgent(agentType, {
        strategistThoughts: strategistThoughts,
        elementsAlreadySaved: cleanSavedItemsInfo,
        intelligentSystemActive: true
      });
      
      const specificTools = getMarketingTools(agentType);
      const executor = await this.createAgentExecutor(agent, specificTools);
      
      let specializedQuery = "";
      switch (agentType) {
        case 'profile':
          specializedQuery = `${query}\n\n🎯 PROFILE AGENT con Sistema Inteligente: Identifica y guarda SOLO perfiles únicos de estudiantes. El sistema usará embeddings + IA para detectar automáticamente perfiles similares y evitar duplicados psicográficos.`;
          break;
        case 'creative':
          specializedQuery = `${query}\n\n🎨 CREATIVE AGENT con Sistema Inteligente: Crea y guarda SOLO contenido viral único donde Profesor Acadel sea protagonista. El sistema analizará automáticamente similitudes estructurales y temáticas con IA.`;
          break;
        case 'analyst':
          specializedQuery = `${query}\n\n📊 ANALYST AGENT con Sistema Inteligente: Analiza datos y guarda SOLO trends/interacciones únicas. El sistema detectará automáticamente tendencias conceptualmente similares usando embeddings + IA.`;
          break;
        default:
          specializedQuery = `${query}\n\nNOTA: Sistema Inteligente activo - embeddings + IA detectarán automáticamente duplicados en tu especialización.`;
      }
      
      const result = await executor.invoke({
        input: specializedQuery,
        chat_history: chatHistory
      });
      
      this.extractAgentDecisions(result, sharedContext, agentType);
      
      console.log(`✅ Agente especializado ${agentType.toUpperCase()} ejecutado exitosamente con Sistema Inteligente`);
      return result.output;
      
    } catch (error) {
      console.error(`❌ Error ejecutando agente especializado ${agentType} con Sistema Inteligente:`, error);
      return null;
    }
  },
  
  extractAgentDecisions(agentResult, sharedContext, agentType) {
    if (agentResult.intermediateSteps) {
      for (const step of agentResult.intermediateSteps) {
        if (step.action && step.action.tool) {
          if (!sharedContext.decisions[step.action.tool]) {
            sharedContext.decisions[step.action.tool] = [];
          }
          
          let observationData = null;
          try {
            observationData = JSON.parse(step.observation);
          } catch (e) {
            // Si no es JSON, dejar como null
          }
          
          sharedContext.decisions[step.action.tool].push({
            input: step.action.toolInput,
            result: observationData,
            timestamp: new Date().toISOString(),
            agent: agentType,
            intelligentSystemUsed: true
          });
          
          if (step.action.tool === 'saveProfile' && observationData && observationData.profileId) {
            if (!sharedContext.savedProfiles.includes(observationData.profileId)) {
              sharedContext.savedProfiles.push(observationData.profileId);
              console.log(`👥 ${agentType.toUpperCase()} + Sistema Inteligente: Perfil único ${observationData.profileId} guardado`);
              if (observationData.analysisType) {
                console.log(`📊 Análisis IA: ${observationData.analysisType}`);
              }
            }
          }
          else if (step.action.tool === 'saveContent' && observationData && observationData.contentId) {
            if (!sharedContext.savedContents.includes(observationData.contentId)) {
              sharedContext.savedContents.push(observationData.contentId);
              console.log(`🎨 ${agentType.toUpperCase()} + Sistema Inteligente: Contenido único ${observationData.contentId} guardado`);
              if (observationData.analysisType) {
                console.log(`📊 Análisis IA: ${observationData.analysisType}`);
              }
            }
          }
          else if (step.action.tool === 'saveTrend' && observationData && observationData.trendId) {
            if (!sharedContext.savedTrends.includes(observationData.trendId)) {
              sharedContext.savedTrends.push(observationData.trendId);
              console.log(`📊 ${agentType.toUpperCase()} + Sistema Inteligente: Tendencia única ${observationData.trendId} guardada`);
              if (observationData.analysisType) {
                console.log(`📊 Análisis IA: ${observationData.analysisType}`);
              }
            }
          }
          else if (step.action.tool === 'memorySave' && observationData && observationData.memory && !observationData.skipped) {
            if (!observationData.wasExisting) {
              sharedContext.memoryCount++;
              if (!sharedContext.savedInsights.includes(observationData.memory.id)) {
                sharedContext.savedInsights.push(observationData.memory.id);
                console.log(`🧠 ${agentType.toUpperCase()} + Sistema Inteligente: Insight único ${observationData.memory.id} guardado`);
                if (observationData.analysisType) {
                  console.log(`📊 Análisis IA: ${observationData.analysisType}`);
                }
              }
            }
          }
        }
      }
    }
  },
  
  buildSavedItemsInfo(sharedContext) {
    let savedItemsInfo = "";
    if (sharedContext.savedProfiles.length > 0) {
      savedItemsInfo += `Perfiles únicos ya guardados: ${sharedContext.savedProfiles.length} (IDs: ${sharedContext.savedProfiles.join(', ')})\n`;
    }
    if (sharedContext.savedContents.length > 0) {
      savedItemsInfo += `Contenidos únicos ya guardados: ${sharedContext.savedContents.length} (IDs: ${sharedContext.savedContents.join(', ')})\n`;
    }
    if (sharedContext.savedTrends.length > 0) {
      savedItemsInfo += `Tendencias únicas ya guardadas: ${sharedContext.savedTrends.length} (IDs: ${sharedContext.savedTrends.join(', ')})\n`;
    }
    if (sharedContext.memoryCount > 0) {
      savedItemsInfo += `IMPORTANTE: Ya se han guardado ${sharedContext.memoryCount} insights únicos en memoria. Sistema Inteligente evitará duplicar automáticamente.\n`;
    }
    
    if (sharedContext.intelligentSystemUsed) {
      savedItemsInfo += `🧠 Sistema Inteligente activo: Embeddings + IA analizando unicidad automáticamente.\n`;
    }
    
    return savedItemsInfo;
  },
  
  buildFinalPrompt(query, agentResults, sharedContext) {
    const activeAgents = Object.entries(agentResults)
      .filter(([_, value]) => value !== null)
      .map(([key, _]) => `- ${key}`)
      .join('\n');
    
    const agentContributions = Object.entries(agentResults)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => {
        const escapedValue = this.escapePromptBraces(value || "");
        return `=== AGENTE ${key.toUpperCase()} ESPECIALIZADO + IA ===\n${escapedValue}`;
      })
      .join('\n\n');
    
    const escapedQuery = this.escapePromptBraces(query);
    
    const systemMessage = `${FINAL_COORDINATOR_PROMPT}
  
    Agentes especializados que participaron con Sistema Inteligente:
    ${activeAgents}

    Cada agente usó herramientas específicas con embeddings + IA para evitar duplicación:
    - STRATEGIST: Insights estratégicos únicos (${sharedContext.memoryCount} insights) - IA detectó duplicados automáticamente
    - PROFILE: Perfiles únicos de estudiantes (${sharedContext.savedProfiles.length} perfiles) - Análisis psicográfico con IA
    - CREATIVE: Contenido viral único (${sharedContext.savedContents.length} contenidos) - Análisis estructural con IA
    - ANALYST: Trends e interacciones únicas (${sharedContext.savedTrends.length} trends) - Análisis conceptual con IA

    Esta especialización + Sistema Inteligente eliminó completamente la duplicación y maximizó la eficiencia.`;

    const userMessage = `Consulta original: ${escapedQuery}

    Aportes especializados de cada agente (verificados por IA):
    ${agentContributions}

    Sintetiza estos aportes especializados y únicos en una respuesta ÉPICA del Profesor Acadel.`;
    
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemMessage],
        ["user", userMessage]
      ]);
      
      return prompt;
    } catch (error) {
      console.error('❌ Error construyendo prompt final:', error);
      throw error;
    }
  },
  
  async finalizeResponseWithIntelligentSystem(query, fullResponse, sharedContext, agentsUsed, explainLevel, onPartialResponse) {
    try {
      if (sharedContext.memoryCount < 3) {
        console.log("🧠 Generando insight final estratégico con Sistema Inteligente...");
        
        const toolsService = await import('./toolsService.js');
        if (toolsService.generateMemorySummary) {
          const insight = await toolsService.generateMemorySummary('strategic_final_insight', {
            query_type: query.substring(0, 100),
            agentsUsed: agentsUsed,
            specialization_used: true,
            intelligent_system_used: true,
            responseSummary: fullResponse.substring(0, 200)
          });
          
          if (insight && insight.insight && insight.insight.length > 5 && insight.insight.length < 100) {
            console.log("🔍 Verificando unicidad del insight final con Sistema Inteligente...");
            
            const verification = await UniquenessMiddleware.beforeSave('memory', {
              memoryType: "strategic_final_insight",
              content: insight
            });
            
            if (verification.success) {
              await memoryService.saveToMemory({
                type: "strategic_final_insight",
                content: insight,
                source: "specialized_coordination_intelligent",
                importance: 0.8
              });
              
              sharedContext.memoryCount++;
              console.log("✅ Insight final único guardado con Sistema Inteligente");
            } else if (verification.shouldFuse) {
              // Fusionar con insight existente
              console.log("🔗 Fusionando insight final con existente usando IA...");
              
              const fusionResult = await memoryService.fuseInsights(insight, verification.fusionTarget.id);
              
              if (fusionResult.success) {
                console.log("✅ Insight final fusionado inteligentemente");
              }
            } else {
              console.log("🚫 Insight final no guardado: similar detectado por Sistema Inteligente");
              console.log(`📊 Razón: ${verification.reason}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
            }
          }
        }
      }
      
      const explainServiceModule = await import('./explainService.js');
      
      const decisionContext = {
        query,
        agentsUsed: agentsUsed,
        decisions: sharedContext.decisions,
        savedElements: {
          profiles: sharedContext.savedProfiles,
          contents: sharedContext.savedContents,
          trends: sharedContext.savedTrends,
          insights: sharedContext.savedInsights
        },
        recommendations: fullResponse.substring(0, 200),
        specialization_note: "Cada agente usó herramientas específicas con Sistema Inteligente (embeddings + IA) para eliminar duplicación",
        intelligent_system_used: true
      };
      
      const explanation = await explainServiceModule.explainService.generateExplanation(decisionContext, explainLevel);
      
      if (onPartialResponse && explanation) {
        const explanationMetadata = {
          explanation: explanation,
          specialization_benefit: "Sin duplicación gracias al Sistema Inteligente (embeddings + IA)",
          intelligent_features: {
            embedding_search: "Búsqueda semántica avanzada",
            ai_analysis: "Análisis psicográfico y estructural con IA",
            intelligent_fusion: "Fusión inteligente de insights complementarios",
            real_time_deduplication: "Detección de duplicados en tiempo real"
          }
        };
        
        const metadataChunk = `**METADATA_START**${JSON.stringify(explanationMetadata)}**METADATA_END**`;
        console.log('📤 Enviando metadatos de explicación con Sistema Inteligente:', metadataChunk);
        onPartialResponse(metadataChunk);
      }
      
    } catch (error) {
      console.error("❌ Error finalizando respuesta con Sistema Inteligente:", error);
    }
  },
  
  async processWithMultiAgent(query, chatHistory = []) {
    try {
      console.log("🚀 Procesando consulta con multi-agente especializado + Sistema Inteligente (sin streaming):", query);
      
      // 1. RESET del tracker de sesión
      resetSessionTracker();
      
      // 2. CONTEXTO COMPARTIDO entre agentes especializados con Sistema Inteligente
      const sharedContext = {
        savedProfiles: [],
        savedContents: [],
        savedTrends: [],
        savedInsights: [],
        decisions: {},
        memoryCount: 0,
        specialization_used: true,
        intelligentSystemUsed: true
      };
      
      // 3. Usar el agente director para determinar qué agentes especializados se necesitan
      const directorModule = await import('./directorAgent.js');
      const agentDecision = await directorModule.directorAgent.determineRequiredAgents(query);
      
      console.log("🎯 Decisión del agente director para especialización con Sistema Inteligente:", agentDecision);
      
      // 4. Obtener memoria relevante
      const memories = await memoryService.searchMemory(query);
      const relevantMemories = memories.success ? memories.memories : [];
      
      // 5. Inicializar resultados de agentes
      const agentResults = {
        strategist: null,
        analyst: null,
        creative: null,
        profile: null
      };
      
      console.log("🎯 Ejecutando STRATEGIST con Sistema Inteligente...");
      const strategistAgent = await this.createAgent("strategist");
      const strategistExecutor = await this.createAgentExecutor(strategistAgent, getMarketingTools('strategist'));
      
      const strategistQuery = query; // No modificamos para strategist
      
      const strategistResult = await strategistExecutor.invoke({
        input: strategistQuery,
        chat_history: chatHistory
      });
      
      agentResults.strategist = strategistResult.output;
      
      // 7. Extraer decisiones del estratega con Sistema Inteligente
      this.extractAgentDecisions(strategistResult, sharedContext, 'strategist');
      
      console.log("🎯 Decisiones del STRATEGIST con Sistema Inteligente:", JSON.stringify(sharedContext.decisions, null, 2));
      console.log(`🧠 Insights estratégicos únicos guardados: ${sharedContext.memoryCount}`);
      
      let savedItemsInfo = this.buildSavedItemsInfo(sharedContext);
      
      // 8.1 ANALYST especializado con Sistema Inteligente
      if (agentDecision.analyst) {
        console.log("📊 Ejecutando ANALYST especializado con Sistema Inteligente...");
        agentResults.analyst = await this.executeSpecializedAgent('analyst', query, chatHistory, sharedContext, agentResults);
        savedItemsInfo = this.buildSavedItemsInfo(sharedContext);
      }
      
      // 8.2 CREATIVE especializado con Sistema Inteligente
      if (agentDecision.creative) {
        console.log("🎨 Ejecutando CREATIVE especializado con Sistema Inteligente...");
        agentResults.creative = await this.executeSpecializedAgent('creative', query, chatHistory, sharedContext, agentResults);
        savedItemsInfo = this.buildSavedItemsInfo(sharedContext);
      }
      
      // 8.3 PROFILE especializado con Sistema Inteligente
      if (agentDecision.profile) {
        console.log("👥 Ejecutando PROFILE especializado con Sistema Inteligente...");
        agentResults.profile = await this.executeSpecializedAgent('profile', query, chatHistory, sharedContext, agentResults);
        savedItemsInfo = this.buildSavedItemsInfo(sharedContext);
      }
      
      // 9. Consolidar resultados
      console.log("🔗 Consolidando resultados especializados con Sistema Inteligente...");
      const finalPrompt = this.buildFinalPrompt(query, agentResults, sharedContext);
      
      const finalResponse = await llm.invoke(await finalPrompt.formatMessages({}));
      
      await this.finalizeResponseWithIntelligentSystem(query, finalResponse.content, sharedContext, Object.keys(agentResults).filter(key => agentResults[key] !== null), 'intermediate', null);
      
      // 11. Generar explicación con información del Sistema Inteligente
      let explanation = null;
      try {
        const explainServiceModule = await import('./explainService.js');
        
        const decisionContext = {
          query,
          agentsUsed: Object.keys(agentResults).filter(key => agentResults[key] !== null),
          decisions: sharedContext.decisions,
          savedElements: {
            profiles: sharedContext.savedProfiles,
            contents: sharedContext.savedContents,
            trends: sharedContext.savedTrends,
            insights: sharedContext.savedInsights
          },
          recommendations: finalResponse.content.substring(0, 200),
          specialization_note: "Sistema especializado con Sistema Inteligente sin duplicación",
          intelligent_system_used: true
        };
        
        explanation = await explainServiceModule.explainService.generateExplanation(decisionContext, 'intermediate');
      } catch (explainError) {
        console.error("❌ Error generando explicación:", explainError);
      }
      
      return {
        response: finalResponse.content,
        agentsUsed: Object.keys(agentResults).filter(key => agentResults[key] !== null),
        specialization_used: true,
        intelligent_system_used: true,
        no_duplication: true,
        stats: {
          savedProfiles: sharedContext.savedProfiles.length,
          savedContents: sharedContext.savedContents.length,
          savedTrends: sharedContext.savedTrends.length,
          savedInsights: sharedContext.memoryCount
        },
        agentSelection: agentDecision,
        explanation: explanation,
        intelligent_features: {
          embedding_based_search: true,
          ai_similarity_analysis: true,
          psychographic_analysis: true,
          intelligent_fusion: true,
          real_time_deduplication: true
        }
      };
    } catch (error) {
      console.error("❌ Error en el procesamiento multi-agente con Sistema Inteligente:", error);
      
      return {
        response: `Lo siento, ocurrió un error al procesar tu consulta con el Sistema Inteligente: ${error.message}. Por favor, intenta con una consulta diferente.`,
        agentsUsed: [],
        error: error.message,
        specialization_used: false,
        intelligent_system_used: false
      };
    }
  },
  
  getMarketingTools(agentType = 'strategist') {
    return getMarketingTools(agentType);
  },
  
  async processStrategistAgent(query, chatHistory) {
    try {
      resetSessionTracker();
      
      const tools = getMarketingTools('strategist');
      const strategistAgent = await this.createAgent("strategist");
      const strategistExecutor = await this.createAgentExecutor(strategistAgent, tools);
      
      const strategistResult = await strategistExecutor.invoke({
        input: query,
        chat_history: chatHistory
      });
      
      return strategistResult.output;
    } catch (error) {
      console.error("❌ Error procesando agente estratega con Sistema Inteligente:", error);
      return `Error procesando estrategia con Sistema Inteligente: ${error.message}`;
    }
  },

  async getIntelligentSystemStats() {
    try {
      console.log("📊 Obteniendo estadísticas del Sistema Inteligente...");
      
      const stats = await UniquenessMiddleware.getDuplicationStats();
      
      return {
        success: true,
        stats: stats,
        system_type: "intelligent_embedding_based",
        features: {
          embedding_search: "Búsqueda semántica con vectores 1536D",
          ai_analysis: "Análisis psicográfico, estructural y conceptual",
          real_time_deduplication: "Detección automática de duplicados",
          intelligent_fusion: "Fusión inteligente de insights complementarios"
        }
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas del Sistema Inteligente:", error);
      return {
        success: false,
        error: error.message,
        system_type: "error"
      };
    }
  },

  async diagnosticIntelligentSystem() {
    try {
      console.log("🔍 Ejecutando diagnóstico del Sistema Inteligente...");
      
      const diagnostic = await UniquenessMiddleware.diagnosticReport();
      
      return {
        success: true,
        diagnostic: diagnostic,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico del Sistema Inteligente:", error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};