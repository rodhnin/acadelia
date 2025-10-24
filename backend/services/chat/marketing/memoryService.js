// memoryService.js - CORREGIDO CON SISTEMA DE NOTIFICACIONES
import pool from "../../../lib/dbPool.js";
import { supabase } from "../../../lib/supabaseService.js";
import { embeddings } from '../../../lib/openai.js';
import { notificationTracker } from '../../../utils/marketing/notificationTracker.js'; // ✅ IMPORTAR TRACKER

export const memoryService = {
  async saveToMemory(memoryData) {
    const { type, content, source, importance = 0.5 } = memoryData;
    const client = await pool.connect();
    
    try {
      // Procesar content para asegurar que sea un objeto JSON válido
      let processedContent;
      
      if (typeof content === 'string') {
        processedContent = { text: content };
      } else if (content === null) {
        processedContent = { };
      } else if (typeof content !== 'object') {
        processedContent = { value: String(content) };
      } else {
        processedContent = content;
      }
      
      // Generar embedding para el contenido de memoria
      const contentString = JSON.stringify(processedContent);
      const embeddingVector = await embeddings.embedQuery(contentString);
      const formattedVector = `[${embeddingVector.join(',')}]`;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO marketing_memory (type, content, source, importance, embedding) 
        VALUES ($1, $2, $3, $4, $5::vector(1536)) 
        RETURNING id, type, content, importance, created_at`,
        [type, processedContent, source, importance, formattedVector]
      );
      
      await client.query('COMMIT');
      
      // ✅ REGISTRAR NOTIFICACIÓN SIEMPRE QUE SE GUARDE EN MEMORIA
      if (result.rows[0]) {
        try {
          const notification = notificationTracker.trackMemory(result.rows[0]);
          console.log('📱 Insight de memoria registrado para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de memoria:', notificationError.message);
          // No fallar la operación por un error de notificación
        }
      }
      
      return { success: true, memory: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error guardando memoria:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },
  
  // NUEVA FUNCIÓN: Fusionar insights relacionados
  async fuseInsights(newInsight, existingId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Obtener el insight existente
      const existingQuery = `SELECT * FROM marketing_memory WHERE id = $1`;
      const existingResult = await client.query(existingQuery, [existingId]);
      
      if (existingResult.rows.length === 0) {
        throw new Error(`Insight para fusión no encontrado: ${existingId}`);
      }
      
      const existingInsight = existingResult.rows[0];
      
      // 2. Crear una versión fusionada
      // Extraer el contenido existente
      let existingContent = existingInsight.content;
      
      // Preparar el contenido fusionado
      const fusedContent = {
        insight: existingContent.insight, // Mantener el insight principal
        fused_insights: existingContent.fused_insights || [], // Array de insights adicionales
        last_update: new Date().toISOString(),
        evidence_count: (existingContent.evidence_count || 1) + 1,
        confidence: Math.min(1.0, (existingContent.confidence || 0.7) + 0.05), // Aumentar confianza
        // Preservar campos originales importantes
        original_type: existingContent.original_type || existingInsight.type
      };
      
      // Añadir el nuevo insight a la colección
      fusedContent.fused_insights.push({
        insight: newInsight.insight || (typeof newInsight === 'string' ? newInsight : JSON.stringify(newInsight)),
        added_at: new Date().toISOString(),
        source: newInsight.source || "fusion"
      });
      
      // 3. Actualizar en base de datos
      const updateQuery = `
        UPDATE marketing_memory 
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [fusedContent, existingId]);
      
      await client.query('COMMIT');
      
      // ✅ REGISTRAR NOTIFICACIÓN PARA FUSIÓN DE INSIGHTS
      if (updateResult.rows[0]) {
        try {
          const notification = notificationTracker.trackMemory(updateResult.rows[0]);
          console.log('📱 Insight fusionado registrado para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de fusión:', notificationError.message);
        }
      }
      
      console.log(`Insights fusionados exitosamente. ID: ${existingId}`);
      return {
        success: true,
        memory: updateResult.rows[0],
        fusionPerformed: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error fusionando insights:", error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  },
  
  async searchMemory(query, type = null, limit = 5) {
    try {
      // Generar embedding para la consulta
      const queryEmbedding = await embeddings.embedQuery(query);
      
      // Buscar en memoria usando función SQL
      const { data, error } = await supabase.rpc('search_marketing_memory', {
        query_embedding: queryEmbedding,
        memory_type: type,
        match_count: limit
      });
      
      if (error) throw error;
      
      return { success: true, memories: data };
    } catch (error) {
      console.error("Error buscando en memoria:", error);
      return { success: false, error: error.message };
    }
  },
  
  async getMemoryByType(type, limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, type, content, source, importance, created_at 
         FROM marketing_memory 
         WHERE type = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [type, limit]
      );
      
      return { success: true, memories: result.rows };
    } catch (error) {
      console.error("Error obteniendo memorias por tipo:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Método mejorado para consolidar memorias
  async consolidateMemories() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Identificar memorias similares con umbral más alto
      const similarMemories = await client.query(`
        WITH memory_pairs AS (
          SELECT 
            a.id as id_a, 
            b.id as id_b,
            1 - (a.embedding <=> b.embedding) AS similarity,
            a.importance as importance_a,
            b.importance as importance_b,
            a.type as type
          FROM marketing_memory a
          JOIN marketing_memory b ON a.id < b.id AND a.type = b.type
          WHERE 1 - (a.embedding <=> b.embedding) > 0.95
        )
        SELECT id_a, id_b, similarity, importance_a, importance_b, type
        FROM memory_pairs
        ORDER BY similarity DESC
      `);
      
      // 2. Consolidar memorias muy similares usando el sistema de fusión
      let consolidatedCount = 0;
      
      for (const pair of similarMemories.rows) {
        const [memoryA, memoryB] = await Promise.all([
          client.query('SELECT * FROM marketing_memory WHERE id = $1', [pair.id_a]),
          client.query('SELECT * FROM marketing_memory WHERE id = $1', [pair.id_b])
        ]);
        
        if (memoryA.rows.length > 0 && memoryB.rows.length > 0) {
          const memA = memoryA.rows[0];
          const memB = memoryB.rows[0];
          
          // Determinar cuál tiene mayor importancia para mantenerlo como base
          let baseMemory, secondaryMemory;
          
          if (memA.importance >= memB.importance) {
            baseMemory = memA;
            secondaryMemory = memB;
          } else {
            baseMemory = memB;
            secondaryMemory = memA;
          }
          
          // Usar el método de fusión para combinar
          const fusionResult = await this.fuseInsights(secondaryMemory.content, baseMemory.id);
          
          if (fusionResult.success) {
            // Eliminar la memoria secundaria ya que se fusionó
            await client.query('DELETE FROM marketing_memory WHERE id = $1', [secondaryMemory.id]);
            consolidatedCount++;
          }
        }
      }
      
      await client.query('COMMIT');
      return { 
        success: true, 
        consolidated: consolidatedCount,
        processedPairs: similarMemories.rows.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error consolidando memorias:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
};