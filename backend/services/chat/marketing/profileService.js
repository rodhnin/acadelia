// profileService.js - CORREGIDO CON SISTEMA DE NOTIFICACIONES
import pool from "../../../lib/dbPool.js";
import { supabase } from "../../../lib/supabaseService.js";
import { embeddings } from '../../../lib/openai.js';
import { notificationTracker } from '../../../utils/marketing/notificationTracker.js'; // ✅ IMPORTAR TRACKER

export const profileService = {
  async createProfile(metadata) {
    const client = await pool.connect();
    try {
      const embeddingString = JSON.stringify(metadata);
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      
      const formattedVector = `[${embeddingVector.join(',')}]`;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO marketing_profiles (metadata, embedding) 
         VALUES ($1, $2::vector(1536)) 
         RETURNING id, metadata, created_at`,
        [metadata, formattedVector]
      );
      
      await client.query('COMMIT');
      
      if (result.rows[0]) {
        try {
          const notification = notificationTracker.trackProfile(result.rows[0]);
          console.log('📱 Perfil registrado para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de perfil:', notificationError.message);
          // No fallar la operación por un error de notificación
        }
      }
      
      return { success: true, profile: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creando perfil:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async updateProfile(profileId, metadata) {
    const client = await pool.connect();
    try {
      const embeddingString = JSON.stringify(metadata);
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      const formattedVector = `[${embeddingVector.join(',')}]`;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE marketing_profiles 
         SET metadata = $1, embedding = $2::vector(1536), updated_at = NOW() 
         WHERE id = $3
         RETURNING id, metadata, updated_at`,
        [metadata, formattedVector, profileId]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: "Perfil no encontrado" };
      }
      
      await client.query('COMMIT');
      
      if (result.rows[0]) {
        try {
          const notification = notificationTracker.trackProfile(result.rows[0]);
          console.log('📱 Perfil actualizado registrado para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de actualización:', notificationError.message);
        }
      }
      
      return { success: true, profile: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error actualizando perfil:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  // Resto de métodos sin cambios...
  async getProfiles(filters = {}) {
    try {
      let query = `SELECT id, metadata, created_at FROM marketing_profiles`;
      const params = [];
      const conditions = [];
      
      if (filters.career) {
        params.push(`%"carrera":"${filters.career}"%`);
        conditions.push(`metadata::text ILIKE $${params.length}`);
      }
      
      if (filters.ageMin || filters.ageMax) {
        if (filters.ageMin) {
          params.push(filters.ageMin);
          conditions.push(`(metadata->>'edad')::int >= $${params.length}`);
        }
        
        if (filters.ageMax) {
          params.push(filters.ageMax);
          conditions.push(`(metadata->>'edad')::int <= $${params.length}`);
        }
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await pool.query(query, params);
      return { success: true, profiles: result.rows };
    } catch (error) {
      console.error("Error obteniendo perfiles:", error);
      return { success: false, error: error.message };
    }
  },
  
  async getProfileById(profileId) {
    try {
      const result = await pool.query(
        `SELECT id, metadata, created_at 
         FROM marketing_profiles 
         WHERE id = $1`,
        [profileId]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: "Perfil no encontrado" };
      }
      
      return { success: true, profile: result.rows[0] };
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      return { success: false, error: error.message };
    }
  },

  // Resto de métodos sin cambios...
  async deleteProfile(profileId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Verificando existencia de perfil:', profileId);
      
      const checkResult = await client.query(
        'SELECT id, metadata FROM marketing_profiles WHERE id = $1',
        [profileId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log('❌ Perfil no encontrado:', profileId);
        return {
          success: false,
          error: 'Perfil no encontrado'
        };
      }
      
      const profile = checkResult.rows[0];
      const profileName = profile.metadata?.nombre || `Perfil ${profileId}`;
      console.log('✅ Perfil encontrado:', profileName);
      
      try {
        await client.query(
          'DELETE FROM marketing_interactions WHERE profile_id = $1',
          [profileId]
        );
        console.log('🧹 Interacciones relacionadas eliminadas');
      } catch (interactionError) {
        console.warn('⚠️ Error eliminando interacciones:', interactionError.message);
      }
      
      try {
        await client.query(`
          DELETE FROM marketing_memory 
          WHERE content::jsonb @> $1::jsonb
        `, [JSON.stringify({ profile_id: profileId })]);
        
        console.log('🧹 Memoria relacionada eliminada');
      } catch (memoryError) {
        console.warn('⚠️ Error eliminando memoria relacionada:', memoryError.message);
      }
      
      const deleteResult = await client.query(
        'DELETE FROM marketing_profiles WHERE id = $1 RETURNING id, metadata',
        [profileId]
      );
      
      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'No se pudo eliminar el perfil'
        };
      }
      
      await client.query('COMMIT');
      
      console.log('✅ Perfil eliminado exitosamente:', profileName);
      
      return {
        success: true,
        message: 'Perfil eliminado correctamente',
        deletedProfile: {
          id: deleteResult.rows[0].id,
          nombre: deleteResult.rows[0].metadata?.nombre || 'Sin nombre'
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando perfil:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async deleteAllProfiles() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Contando perfiles antes de eliminar...');
      
      const countResult = await client.query('SELECT COUNT(*) FROM marketing_profiles');
      const totalProfiles = parseInt(countResult.rows[0].count);
      
      console.log(`📊 Total de perfiles a eliminar: ${totalProfiles}`);
      
      if (totalProfiles === 0) {
        await client.query('ROLLBACK');
        return {
          success: true,
          message: 'No hay perfiles para eliminar',
          deletedCount: 0
        };
      }
      
      try {
        const interactionsDeleteResult = await client.query(
          'DELETE FROM marketing_interactions WHERE profile_id IS NOT NULL'
        );
        console.log(`🧹 ${interactionsDeleteResult.rowCount} interacciones eliminadas`);
      } catch (interactionError) {
        console.warn('⚠️ Error eliminando interacciones:', interactionError.message);
      }
      
      try {
        const memoryDeleteResult = await client.query(`
          DELETE FROM marketing_memory 
          WHERE type = 'profile_creation' OR content::text LIKE '%profile_id%'
        `);
        console.log(`🧹 ${memoryDeleteResult.rowCount} registros de memoria eliminados`);
      } catch (memoryError) {
        console.warn('⚠️ Error eliminando memoria relacionada:', memoryError.message);
      }
      
      const deleteResult = await client.query('DELETE FROM marketing_profiles');
      const deletedCount = deleteResult.rowCount;
      
      console.log(`🗑️ ${deletedCount} perfiles eliminados`);
      
      // Reiniciar secuencia si existe
      try {
        await client.query('ALTER SEQUENCE IF EXISTS marketing_profiles_id_seq RESTART WITH 1');
        console.log('🔄 Secuencia reiniciada');
      } catch (sequenceError) {
        console.log('ℹ️ No hay secuencia para reiniciar o error reiniciando:', sequenceError.message);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Eliminación masiva completada: ${deletedCount} perfiles eliminados`);
      
      return {
        success: true,
        message: 'Todos los perfiles eliminados correctamente',
        deletedCount: deletedCount
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando todos los perfiles:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },
  
  async findSimilarProfiles(profileMetadata, limit = 5) {
    try {
      const embeddingString = JSON.stringify(profileMetadata);
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      
      const { data, error } = await supabase.rpc('match_marketing_profiles', {
        query_embedding: embeddingVector,
        match_count: limit
      });
      
      if (error) throw error;
      
      return { success: true, profiles: data };
    } catch (error) {
      console.error("Error buscando perfiles similares:", error);
      return { success: false, error: error.message };
    }
  }
};