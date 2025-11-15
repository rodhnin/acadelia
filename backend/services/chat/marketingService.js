// marketingService.js - ACTUALIZADO PARA SISTEMA ESPECIALIZADO SIN DUPLICACIÓN
import { profileService } from "./marketing/profileService.js";
import { contentService } from "./marketing/contentService.js";
import { memoryService } from "./marketing/memoryService.js";
import { matchingService } from "./marketing/matchingService.js";
import { simulationService } from "./marketing/simulationService.js";
import { notificationTracker } from '../../utils/marketing/notificationTracker.js';
import { agentService } from "./marketing/agentsService.js"; // ✅ UPDATED
import { embeddings, openai } from "../../lib/openai.js";
import pool from "../../lib/dbPool.js";
import { TREND_ANALYSIS_PROMPT } from '../../utils/marketing/AcadeliaDNA.js';

export const marketingService = {
  async createProfile(profileData) {
    return await profileService.createProfile(profileData);
  },
  
  async createContent(contentData) {
    return await contentService.createContent(contentData);
  },
  
  async saveToMemory(memoryData) {
    return await memoryService.saveToMemory(memoryData);
  },
  
  async generateContent(params) {
    return await contentService.generateContent(params);
  },
  
  async saveTrend(trendData) {
    const { theme, popularity, metadata = {} } = trendData;
    const client = await pool.connect();
    
    try {
      const embeddingString = JSON.stringify({
        theme,
        ...metadata
      });
      
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      const formattedVector = `[${embeddingVector.join(',')}]`;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO marketing_trends (theme, popularity, metadata, embedding) 
         VALUES ($1, $2, $3, $4::vector(1536)) 
         RETURNING id, theme, popularity, created_at`,
        [theme, popularity, metadata, formattedVector]
      );
      
      if (result.rows[0]) {
        try {
          const trendForNotification = {
            id: result.rows[0].id,
            theme: theme,
            popularity: popularity,
            metadata: metadata,
            created_at: result.rows[0].created_at
          };
          
          const notification = notificationTracker.trackTrend(trendForNotification);
          console.log('📱 Tendencia registrada para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de tendencia:', notificationError.message);
        }
      }
      
      const analysis = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
          messages: [
          {
            role: "system",
            content: TREND_ANALYSIS_PROMPT
          },
          {
            role: "user", 
            content: `Tendencia: ${theme}\nPopularidad: ${popularity}\nMetadata: ${JSON.stringify(metadata)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      const analysisData = JSON.parse(analysis.choices[0].message.content);
      
      await memoryService.saveToMemory({
        type: "trend_analysis",
        content: {
          trend: {
            id: result.rows[0].id,
            theme,
            popularity,
            metadata
          },
          analysis: analysisData,
          timestamp: new Date().toISOString()
        },
        source: "trend_analysis",
        importance: 0.8
      });
      
      await client.query('COMMIT');
      
      return { 
        success: true, 
        trend: result.rows[0],
        analysis: analysisData
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error guardando tendencia:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async processMarketingQuery(query, chatHistory = [], options = {}) {
    try {
      // PASO 1: Resetear el tracker al inicio de cada consulta
      notificationTracker.reset();
      console.log('🔄 Tracker de notificaciones reiniciado para nueva consulta');
      console.log('🚀 Usando sistema ESPECIALIZADO sin duplicación');
      
      const { 
        streamEnabled = false, 
        onPartialResponse = null, 
        explainLevel = 'intermediate' 
      } = options;
      
      let result;
      if (streamEnabled && typeof onPartialResponse === 'function') {
        console.log("🎯 Procesando consulta con sistema especializado + streaming");
        result = await agentService.processWithMultiAgentStreaming(query, chatHistory, {
          onPartialResponse: onPartialResponse,
          explainLevel: explainLevel
        });
      } else {
        console.log("🎯 Procesando consulta con sistema especializado sin streaming");
        result = await agentService.processWithMultiAgent(query, chatHistory);
      }
      
      // PASO 2: Las notificaciones ya se registraron automáticamente durante la ejecución
      const notifications = notificationTracker.getNotificationSummary();
      
      notificationTracker.logSummary();
      
      // PASO 3: Enriquecer la respuesta con notificaciones y metadatos del sistema especializado
      const enrichedResult = {
        ...result,
        notifications: notifications,
        hasNewContent: notifications.total > 0,
        system_used: "specialized_agents",
        duplication_eliminated: true,
        agent_specialization: {
          strategist: "Insights estratégicos únicos",
          profile: "Perfiles de estudiantes únicos", 
          creative: "Contenido viral único",
          analyst: "Trends e interacciones únicos"
        }
      };
      
      console.log(`📱 Consulta completada con sistema especializado: ${notifications.total} notificaciones`);
      console.log(`🎯 Agentes usados sin duplicación: ${result.agentsUsed?.join(', ') || 'ninguno'}`);
      
      return enrichedResult;
      
    } catch (error) {
      console.error("❌ Error en processMarketingQuery con sistema especializado:", error);
      
      // Incluir notificaciones parciales incluso en caso de error
      const notifications = notificationTracker.getNotificationSummary();
      
      return {
        response: `Lo siento, ocurrió un error al procesar tu consulta: ${error.message}`,
        agentsUsed: [],
        error: error.message,
        notifications: notifications,
        hasNewContent: notifications.total > 0,
        system_used: "specialized_agents",
        error_in_specialization: true
      };
    }
  },
  
  async processMarketingQueryStream(query, chatHistory = [], explainLevel = 'intermediate', res) {
    try {
      console.log("🚀 Iniciando streaming con sistema especializado:", query.substring(0, 50));
      
      // PASO 1: Resetear el tracker al inicio
      notificationTracker.reset();
      console.log('🔄 Tracker de notificaciones reiniciado para streaming especializado');
      
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
      const onPartialResponse = (chunk) => {
        try {
          if (!res.writableEnded) {
            res.write(chunk);
          }
        } catch (writeError) {
          console.error("Error escribiendo chunk:", writeError);
        }
      };
      
      const result = await this.processMarketingQuery(query, chatHistory, {
        streamEnabled: true,
        onPartialResponse: onPartialResponse,
        explainLevel: explainLevel
      });
      
      // PASO 2: Enviar notificaciones al final del stream
      const notifications = notificationTracker.getNotificationSummary();
      
      if (notifications.total > 0) {
        const notificationMetadata = {
          notifications: notifications,
          hasNewContent: true,
          system_specialization: "Cada tipo de elemento guardado por agente específico"
        };
        
        const notificationChunk = `**NOTIFICATIONS_START**${JSON.stringify(notificationMetadata)}**NOTIFICATIONS_END**`;
        console.log('📤 Enviando notificaciones especializadas:', notifications.total);
        onPartialResponse(notificationChunk);
      }
      
      if (result.stats || result.detectedElements) {
        const finalMetadata = {
          stats: result.stats,
          detectedElements: result.detectedElements || [],
          specialization_summary: result.agent_specialization || {},
          no_duplication: result.duplication_eliminated || false
        };
        
        const metadataChunk = `**METADATA_START**${JSON.stringify(finalMetadata)}**METADATA_END**`;
        console.log('📤 Enviando metadatos especializados finales');
        onPartialResponse(metadataChunk);
      }
      
      if (!res.writableEnded) {
        res.end();
      }
      
      return result;
      
    } catch (error) {
      console.error("❌ Error en processMarketingQueryStream especializado:", error);
      
      try {
        if (!res.writableEnded) {
          res.write(`\n\nError: No se pudo procesar la consulta con sistema especializado: ${error.message}`);
          res.end();
        }
      } catch (endError) {
        console.error("Error cerrando respuesta de stream:", endError);
      }
      
      throw error;
    }
  },

  async getProfiles(filters) {
    return await profileService.getProfiles(filters);
  },
  
  async updateProfile(id, profileData) {
    return await profileService.updateProfile(id, profileData);
  },

  async deleteProfile(profileId) {
    return await profileService.deleteProfile(profileId);
  },

  async deleteAllProfiles() {
    return await profileService.deleteAllProfiles();
  },
  
  async getContents(filters) {
    return await contentService.getContents(filters);
  },
    
  async deleteContent(contentId) {
    return await contentService.deleteContent(contentId);
  },

  async deleteAllContents() {
    return await contentService.deleteAllContents();
  },
  
  async matchProfileToContent(profileId, contentType, limit) {
    return await matchingService.matchProfileToContent(profileId, contentType, limit);
  },
  
  async matchContentToProfiles(contentId, limit) {
    return await matchingService.matchContentToProfiles(contentId, limit);
  },
  
  async recordInteraction(profileId, contentId, channel, action) {
    return await matchingService.recordInteraction(profileId, contentId, channel, action);
  },
  
  async searchMemory(query, type, limit) {
    return await memoryService.searchMemory(query, type, limit);
  },
  
  async simulateCampaign(campaignData, audienceData) {
    return await simulationService.simulateCampaignResults(campaignData, audienceData);
  },
  
  async generateExplanation(query, level = 'intermediate') {
    try {
      console.log(`Generando explicación nivel ${level} para sistema especializado:`, query.substring(0, 50));
      
      const explainServiceModule = await import('./marketing/explainService.js');
      
      const basicContext = {
        query,
        agentsUsed: ["strategist"], // Por defecto
        decisions: {},
        savedElements: {
          profiles: [],
          contents: [],
          trends: [],
          insights: []
        },
        recommendations: "Análisis de consulta individual con sistema especializado",
        specialization_note: "Cada agente tiene herramientas específicas sin duplicación"
      };
      
      const explanation = await explainServiceModule.explainService.generateExplanation(basicContext, level);
      
      return {
        success: true,
        explanation: explanation,
        system_used: "specialized_agents"
      };
    } catch (error) {
      console.error("Error generando explicación:", error);
      return {
        success: false,
        error: error.message,
        explanation: {
          explanation: "No se pudo generar una explicación debido a un error en el sistema especializado.",
          level: level,
          query: query
        }
      };
    }
  },

  async generateDecisionVisualization(query) {
    try {
      console.log("Generando visualización para sistema especializado:", query.substring(0, 50));
      
      const explainServiceModule = await import('./marketing/explainService.js');
      
      const basicContext = {
        query,
        agentsUsed: ["strategist", "analyst"], // Ejemplo
        decisions: {},
        savedElements: {
          profiles: [],
          contents: [],
          trends: [],
          insights: []
        },
        specialization_used: true
      };
      
      const visualization = await explainServiceModule.explainService.generateDecisionVisualization(basicContext);
      
      return {
        success: true,
        visualization: visualization,
        system_used: "specialized_agents"
      };
    } catch (error) {
      console.error("Error generando visualización:", error);
      return {
        success: false,
        error: error.message,
        visualization: {
          mermaidDiagram: "graph TD\n  Query[Consulta] --> SpecializedSystem[Sistema Especializado]\n  SpecializedSystem --> Error[Error generando diagrama]",
          format: 'mermaid'
        }
      };
    }
  },

  async generateMarketingSummary() {
    try {
      const [
        profilesResult,
        contentsResult,
        interactionsResult,
        trendsResult,
        memoriesResult
      ] = await Promise.all([
        profileService.getProfiles({ limit: 100 }),
        contentService.getContents({ limit: 100 }),
        pool.query(`
          SELECT 
            action, 
            COUNT(*) as count,
            COUNT(DISTINCT profile_id) as unique_profiles,
            COUNT(DISTINCT content_id) as unique_contents
          FROM marketing_interactions
          GROUP BY action
        `),
        pool.query(`
          SELECT theme, popularity, created_at
          FROM marketing_trends
          ORDER BY created_at DESC
          LIMIT 10
        `),
        memoryService.getMemoryByType("agent_insight", 10)
      ]);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "system",
            content: `Genera un resumen ejecutivo del estado actual del marketing para Acadelia.
            
            El sistema ahora usa agentes especializados sin duplicación:
            - STRATEGIST: Solo insights estratégicos
            - PROFILE: Solo perfiles únicos de estudiantes  
            - CREATIVE: Solo contenido viral único
            - ANALYST: Solo trends e interacciones únicas
            
            El resumen debe incluir:
            1. Estadísticas clave (perfiles, contenidos, interacciones)
            2. Tendencias recientes y su relevancia
            3. Segmentos de audiencia más activos
            4. Tipos de contenido con mejor rendimiento
            5. Recomendaciones estratégicas
            6. Beneficios del sistema especializado
            
            Formatea tu respuesta de forma clara y profesional con secciones.`
          },
          {
            role: "user", 
            content: `Datos actuales del sistema especializado:
            - Perfiles únicos: ${profilesResult.success ? profilesResult.profiles.length : 0}
            - Contenidos únicos: ${contentsResult.success ? contentsResult.contents.length : 0}
            - Interacciones: ${JSON.stringify(interactionsResult.rows)}
            - Tendencias recientes: ${JSON.stringify(trendsResult.rows)}
            - Insights únicos: ${memoriesResult.success ? JSON.stringify(memoriesResult.memories.map(m => m.content)) : '[]'}`
          }
        ],
        temperature: 0.7
      });
      
      return {
        success: true,
        summary: completion.choices[0].message.content,
        stats: {
          profilesCount: profilesResult.success ? profilesResult.profiles.length : 0,
          contentsCount: contentsResult.success ? contentsResult.contents.length : 0,
          interactions: interactionsResult.rows,
          recentTrends: trendsResult.rows,
        },
        system_used: "specialized_agents",
        efficiency_note: "Sin duplicación entre agentes especializados"
      };
    } catch (error) {
      console.error("Error generando resumen de marketing:", error);
      return { 
        success: false, 
        error: error.message,
        system_used: "specialized_agents" 
      };
    }
  },

  async getTrends() {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          theme, 
          popularity, 
          metadata, 
          created_at
        FROM marketing_trends
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      return {
        success: true,
        trends: result.rows || []
      };
    } catch (error) {
      console.error("Error obteniendo tendencias:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async deleteTrend(trendId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Verificando existencia de tendencia:', trendId);
      
      const checkResult = await client.query(
        'SELECT id, theme FROM marketing_trends WHERE id = $1',
        [trendId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log('❌ Tendencia no encontrada:', trendId);
        return {
          success: false,
          error: 'Tendencia no encontrada'
        };
      }
      
      const trend = checkResult.rows[0];
      console.log('✅ Tendencia encontrada:', trend.theme);
      
      try {
        await client.query(`
          DELETE FROM marketing_memory 
          WHERE type = 'trend_analysis' 
          AND content::jsonb @> $1::jsonb
        `, [JSON.stringify({ trend: { id: trendId } })]);
        
        console.log('🧹 Memoria relacionada eliminada');
      } catch (memoryError) {
        console.warn('⚠️ Error eliminando memoria relacionada:', memoryError.message);
      }
      
      const deleteResult = await client.query(
        'DELETE FROM marketing_trends WHERE id = $1 RETURNING id, theme',
        [trendId]
      );
      
      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'No se pudo eliminar la tendencia'
        };
      }
      
      await client.query('COMMIT');
      
      console.log('✅ Tendencia eliminada exitosamente:', deleteResult.rows[0].theme);
      
      return {
        success: true,
        message: 'Tendencia eliminada correctamente',
        deletedTrend: deleteResult.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando tendencia:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async deleteAllTrends() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Contando tendencias antes de eliminar...');
      
      const countResult = await client.query('SELECT COUNT(*) FROM marketing_trends');
      const totalTrends = parseInt(countResult.rows[0].count);
      
      console.log(`📊 Total de tendencias a eliminar: ${totalTrends}`);
      
      if (totalTrends === 0) {
        await client.query('ROLLBACK');
        return {
          success: true,
          message: 'No hay tendencias para eliminar',
          deletedCount: 0
        };
      }
      
      try {
        const memoryDeleteResult = await client.query(`
          DELETE FROM marketing_memory 
          WHERE type = 'trend_analysis'
        `);
        
        console.log(`🧹 ${memoryDeleteResult.rowCount} registros de memoria eliminados`);
      } catch (memoryError) {
        console.warn('⚠️ Error eliminando memoria relacionada:', memoryError.message);
      }
      
      const deleteResult = await client.query('DELETE FROM marketing_trends');
      const deletedCount = deleteResult.rowCount;
      
      console.log(`🗑️ ${deletedCount} tendencias eliminadas`);
      
      try {
        await client.query('ALTER SEQUENCE IF EXISTS marketing_trends_id_seq RESTART WITH 1');
        console.log('🔄 Secuencia reiniciada');
      } catch (sequenceError) {
        console.log('ℹ️ No hay secuencia para reiniciar o error reiniciando:', sequenceError.message);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Eliminación masiva completada: ${deletedCount} tendencias eliminadas`);
      
      return {
        success: true,
        message: 'Todas las tendencias eliminadas correctamente',
        deletedCount: deletedCount
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando todas las tendencias:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async getCurrentNotifications() {
    return notificationTracker.getNotificationSummary();
  },

  async hasNotifications() {
    return notificationTracker.hasNotifications();
  },

  async getNotificationCounts() {
    return {
      profiles: notificationTracker.getCountByType('profiles'),
      contents: notificationTracker.getCountByType('contents'),
      trends: notificationTracker.getCountByType('trends'),
      memory: notificationTracker.getCountByType('memory'),
      total: notificationTracker.hasNotifications() ? 
        Object.values(notificationTracker.savedElements).reduce((sum, arr) => sum + arr.length, 0) : 0
    };
  },

  async clearSectionNotifications(section) {
    try {
      console.log(`🧹 Limpiando notificaciones de sección: ${section}`);
      
      const validSections = ['profiles', 'contents', 'trends', 'memory'];
      if (!validSections.includes(section)) {
        return {
          success: false,
          error: `Sección inválida: ${section}. Debe ser una de: ${validSections.join(', ')}`
        };
      }
      
      const result = notificationTracker.clearSection(section);
      
      if (result.success) {
        console.log(`✅ Notificaciones de ${section} limpiadas exitosamente con sistema especializado`);
        
        return {
          success: true,
          message: `Notificaciones de ${section} limpiadas`,
          section: section,
          updatedNotifications: notificationTracker.getNotificationSummary(),
          system_used: "specialized_agents"
        };
      } else {
        return {
          success: false,
          error: result.error || `No se pudieron limpiar las notificaciones de ${section}`
        };
      }
      
    } catch (error) {
      console.error(`❌ Error limpiando notificaciones de ${section}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async markSectionAsViewed(section, userId = null) {
    try {
      console.log(`👁️ Marcando sección ${section} como vista${userId ? ` para usuario ${userId}` : ''}`);
      
      const validSections = ['profiles', 'contents', 'trends', 'memory'];
      if (!validSections.includes(section)) {
        return {
          success: false,
          error: `Sección inválida: ${section}. Debe ser una de: ${validSections.join(', ')}`
        };
      }
      
      const result = notificationTracker.clearSection(section);
      
      if (result.success) {
        console.log(`✅ Sección ${section} marcada como vista exitosamente con sistema especializado`);
        
        return {
          success: true,
          message: `Sección ${section} marcada como vista`,
          section: section,
          userId: userId,
          timestamp: new Date().toISOString(),
          updatedNotifications: notificationTracker.getNotificationSummary(),
          system_used: "specialized_agents"
        };
      } else {
        return {
          success: false,
          error: result.error || `No se pudo marcar la sección ${section} como vista`
        };
      }
      
    } catch (error) {
      console.error(`❌ Error marcando sección ${section} como vista:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getMemoryInsights(filters = {}) {
    try {
      const { type, source, limit = 1000, offset = 0 } = filters;
      
      let query = `
        SELECT id, type, content, source, importance, created_at 
        FROM marketing_memory 
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;
      
      if (type && type !== 'all') {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }
      
      if (source && source !== 'all') {
        query += ` AND source = $${paramIndex}`;
        params.push(source);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      return {
        success: true,
        memories: result.rows || []
      };
    } catch (error) {
      console.error('Error obteniendo insights de memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async getMemoryInsight(id) {
    try {
      const result = await pool.query(
        'SELECT id, type, content, source, importance, created_at FROM marketing_memory WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Insight de memoria no encontrado'
        };
      }
      
      return {
        success: true,
        memory: result.rows[0]
      };
    } catch (error) {
      console.error('Error obteniendo insight de memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async updateMemoryInsight(id, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const currentResult = await client.query(
        'SELECT * FROM marketing_memory WHERE id = $1',
        [id]
      );
      
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Insight de memoria no encontrado'
        };
      }
      
      const currentMemory = currentResult.rows[0];
      let currentContent = currentMemory.content;
      
      if (typeof currentContent === 'string') {
        try {
          currentContent = JSON.parse(currentContent);
        } catch (e) {
          currentContent = { raw_content: currentContent };
        }
      }
      
      const updatedContent = { ...currentContent };
      
      if (updateData.insight) {
        updatedContent.insight = updateData.insight;
      }
      
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (updateData.insight) {
        updateFields.push(`content = $${paramIndex}`);
        updateValues.push(updatedContent);
        paramIndex++;
      }
      
      if (updateData.importance !== undefined) {
        updateFields.push(`importance = $${paramIndex}`);
        updateValues.push(parseFloat(updateData.importance));
        paramIndex++;
      }
      
      if (updateData.type) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(updateData.type);
        paramIndex++;
      }
      
      if (updateData.source) {
        updateFields.push(`source = $${paramIndex}`);
        updateValues.push(updateData.source);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'No hay campos para actualizar'
        };
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
      
      const updateQuery = `
        UPDATE marketing_memory 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, updateValues);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        memory: result.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error actualizando insight de memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async deleteMemoryInsight(id) {
    try {
      const result = await pool.query(
        'DELETE FROM marketing_memory WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Insight de memoria no encontrado'
        };
      }
      
      return {
        success: true,
        message: 'Insight de memoria eliminado correctamente',
        deletedId: id
      };
    } catch (error) {
      console.error('Error eliminando insight de memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async resetAllMemory() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const countResult = await client.query('SELECT COUNT(*) FROM marketing_memory');
      const totalRecords = parseInt(countResult.rows[0].count);
      
      await client.query('DELETE FROM marketing_memory');
      
      try {
        await client.query('ALTER SEQUENCE IF EXISTS marketing_memory_id_seq RESTART WITH 1');
      } catch (e) {
        console.log('No hay secuencia para reiniciar');
      }
      
      await client.query('COMMIT');
      
      console.log(`🧠 Memoria reiniciada con sistema especializado: ${totalRecords} registros eliminados`);
      
      return {
        success: true,
        message: 'Memoria de la IA reiniciada completamente',
        deletedRecords: totalRecords,
        system_used: "specialized_agents"
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reiniciando memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async getMemoryStats() {
    try {
      const statsQueries = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM marketing_memory'),
        pool.query(`
          SELECT type, COUNT(*) as count 
          FROM marketing_memory 
          GROUP BY type 
          ORDER BY count DESC
        `),
        pool.query(`
          SELECT source, COUNT(*) as count 
          FROM marketing_memory 
          GROUP BY source 
          ORDER BY count DESC
        `),
        pool.query(`
          SELECT 
            CASE 
              WHEN importance >= 0.8 THEN 'high'
              WHEN importance >= 0.6 THEN 'medium'
              WHEN importance >= 0.4 THEN 'low'
              ELSE 'very_low'
            END as importance_level,
            COUNT(*) as count
          FROM marketing_memory 
          GROUP BY importance_level
          ORDER BY importance_level
        `),
        pool.query(`
          SELECT 
            AVG(importance) as avg_importance,
            MIN(importance) as min_importance,
            MAX(importance) as max_importance,
            STDDEV(importance) as std_importance
          FROM marketing_memory
        `),
        pool.query(`
          SELECT COUNT(*) as recent_count 
          FROM marketing_memory 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `)
      ]);
      
      return {
        success: true,
        stats: {
          total: parseInt(statsQueries[0].rows[0].total),
          byType: statsQueries[1].rows,
          bySource: statsQueries[2].rows,
          byImportance: statsQueries[3].rows,
          importanceStats: statsQueries[4].rows[0],
          recentCount: parseInt(statsQueries[5].rows[0].recent_count)
        },
        system_used: "specialized_agents"
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de memoria:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async searchMemoryBySimilarity(query, type = null, limit = 10) {
    try {
      const result = await memoryService.searchMemory(query, type, limit);
      
      if (!result.success) {
        return result;
      }
      
      return {
        success: true,
        memories: result.memories || [],
        query: query,
        system_used: "specialized_agents"
      };
    } catch (error) {
      console.error('Error buscando en memoria por similitud:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
};