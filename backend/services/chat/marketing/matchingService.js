import { embeddings } from "../../../lib/openai.js";
import pool from "../../../lib/dbPool.js";

export const matchingService = {
  isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  async resolveProfileIdentifier(identifier) {
    // Si ya es un UUID válido, devolverlo directamente
    if (this.isValidUUID(identifier)) {
      return { id: identifier, isResolved: true };
    }
    
    // Si no es UUID, intentar resolver por texto descriptivo
    try {
      const embeddingVector = await embeddings.embedQuery(identifier);
      
      const result = await pool.query(`
        SELECT id, metadata, 
          1 - (embedding <=> $1::vector(1536)) AS similarity
        FROM marketing_profiles
        WHERE metadata::text ILIKE $2
        ORDER BY similarity DESC
        LIMIT 1
      `, [embeddingVector, `%${identifier}%`]);
      
      if (result.rows.length > 0) {
        return { 
          id: result.rows[0].id, 
          isResolved: true,
          originalIdentifier: identifier,
          metadata: result.rows[0].metadata 
        };
      }
      
      const textResult = await pool.query(`
        SELECT id, metadata
        FROM marketing_profiles
        WHERE 
          metadata->>'nombre' ILIKE $1 OR
          metadata->>'Nombre' ILIKE $1 OR
          metadata->>'descripcion' ILIKE $1
        LIMIT 1
      `, [`%${identifier}%`]);
      
      if (textResult.rows.length > 0) {
        return { 
          id: textResult.rows[0].id, 
          isResolved: true,
          originalIdentifier: identifier,
          metadata: textResult.rows[0].metadata 
        };
      }
      
      return { 
        isResolved: false, 
        error: `No se pudo encontrar un perfil con el identificador: "${identifier}". Usa profileSearch primero para encontrar un perfil válido.`
      };
    } catch (error) {
      console.error("Error resolviendo identificador de perfil:", error);
      return { 
        isResolved: false, 
        error: `Error resolviendo identificador: ${error.message}. Usa profileSearch para encontrar un UUID válido.` 
      };
    }
  },

  async resolveContentIdentifier(identifier) {
    if (this.isValidUUID(identifier)) {
      return { id: identifier, isResolved: true };
    }
    
    try {
      const result = await pool.query(`
        SELECT id, type, channel
        FROM marketing_contents
        WHERE 
          payload->>'title' ILIKE $1 OR
          payload->>'description' ILIKE $1 OR
          type ILIKE $1
        LIMIT 1
      `, [`%${identifier}%`]);
      
      if (result.rows.length > 0) {
        return { 
          id: result.rows[0].id, 
          isResolved: true,
          originalIdentifier: identifier,
          type: result.rows[0].type,
          channel: result.rows[0].channel
        };
      }
      
      return { 
        isResolved: false, 
        error: `No se pudo encontrar un contenido con el identificador: "${identifier}". Usa contentSearch primero para encontrar un contenido válido.`
      };
    } catch (error) {
      console.error("Error resolviendo identificador de contenido:", error);
      return { 
        isResolved: false, 
        error: `Error resolviendo identificador: ${error.message}. Usa contentSearch para encontrar un UUID válido.` 
      };
    }
  },

  async matchProfileToContent(profileId, contentType = null, limit = 5) {
    try {
      console.log(`Buscando contenido relevante para perfil con identificador: ${profileId}`);
      
      // 1. Resolver el identificador del perfil
      const resolvedProfile = await this.resolveProfileIdentifier(profileId);
      
      if (!resolvedProfile.isResolved) {
        return { success: false, error: resolvedProfile.error };
      }
      
      const validProfileId = resolvedProfile.id;
      
      // Si se resolvió un identificador descriptivo, registrar
      if (resolvedProfile.originalIdentifier) {
        console.log(`Identificador resuelto: "${resolvedProfile.originalIdentifier}" → UUID: ${validProfileId}`);
      }
      
      // 2. Obtener el perfil y su embedding
      const profileResult = await pool.query(
        `SELECT id, metadata, embedding 
         FROM marketing_profiles 
         WHERE id = $1`,
        [validProfileId]
      );
      
      if (profileResult.rows.length === 0) {
        return { success: false, error: "Perfil no encontrado" };
      }
      
      const profile = profileResult.rows[0];
      
      // 3. Buscar contenidos más relevantes usando el embedding del perfil
      const contentQuery = `
        SELECT 
          c.id, c.type, c.channel, c.payload,
          1 - (c.embedding <=> $1::vector(1536)) AS similarity
        FROM marketing_contents c
        ${contentType ? 'WHERE c.type = $2' : ''}
        ORDER BY c.embedding <=> $1::vector(1536)
        LIMIT $${contentType ? 3 : 2}
      `;
      
      const queryParams = contentType 
        ? [profile.embedding, contentType, limit]
        : [profile.embedding, limit];
      
      const contentResult = await pool.query(contentQuery, queryParams);
      
      // 4. Enriquecer con datos de interacciones previas si existen
      if (contentResult.rows.length > 0) {
        const contentIds = contentResult.rows.map(row => row.id);
        
        const interactionsQuery = `
          SELECT 
            content_id, 
            COUNT(*) as interaction_count,
            jsonb_object_agg(action, count) as actions
          FROM (
            SELECT 
              content_id, 
              action, 
              COUNT(*) as count
            FROM marketing_interactions
            WHERE content_id = ANY($1::uuid[])
            GROUP BY content_id, action
          ) as subquery
          GROUP BY content_id
        `;
        
        const interactionsResult = await pool.query(interactionsQuery, [contentIds]);
        
        const matchedContents = contentResult.rows.map(content => {
          const interactions = interactionsResult.rows.find(
            i => i.content_id === content.id
          );
          
          return {
            ...content,
            interactions: interactions ? interactions.actions : null,
            interaction_count: interactions ? interactions.interaction_count : 0
          };
        });
        
        return {
          success: true,
          matches: matchedContents,
          profile: {
            id: profile.id,
            metadata: profile.metadata
          },
          resolvedFrom: resolvedProfile.originalIdentifier
        };
      } else {
        return {
          success: true,
          matches: [],
          profile: {
            id: profile.id,
            metadata: profile.metadata
          },
          resolvedFrom: resolvedProfile.originalIdentifier
        };
      }
    } catch (error) {
      console.error("Error en match de perfil a contenido:", error);
      return { success: false, error: error.message };
    }
  },
  
  async matchContentToProfiles(contentId, limit = 5) {
    try {
      console.log(`Buscando perfiles relevantes para contenido con identificador: ${contentId}`);
      
      // 1. Resolver el identificador del contenido
      const resolvedContent = await this.resolveContentIdentifier(contentId);
      
      if (!resolvedContent.isResolved) {
        return { success: false, error: resolvedContent.error };
      }
      
      const validContentId = resolvedContent.id;
      
      // Si se resolvió un identificador descriptivo, registrar
      if (resolvedContent.originalIdentifier) {
        console.log(`Identificador resuelto: "${resolvedContent.originalIdentifier}" → UUID: ${validContentId}`);
      }
      
      // 2. Obtener el contenido y su embedding
      const contentResult = await pool.query(
        `SELECT id, type, channel, payload, embedding 
         FROM marketing_contents 
         WHERE id = $1`,
        [validContentId]
      );
      
      if (contentResult.rows.length === 0) {
        return { success: false, error: "Contenido no encontrado" };
      }
      
      const content = contentResult.rows[0];
      
      // 3. Buscar perfiles más relevantes usando el embedding del contenido
      const profileQuery = `
        SELECT 
          p.id, p.metadata,
          1 - (p.embedding <=> $1::vector(1536)) AS similarity
        FROM marketing_profiles p
        WHERE p.embedding IS NOT NULL
        ORDER BY p.embedding <=> $1::vector(1536)
        LIMIT $2
      `;
      
      const profileResult = await pool.query(profileQuery, [content.embedding, limit]);
      
      return {
        success: true,
        matches: profileResult.rows,
        content: {
          id: content.id,
          type: content.type,
          channel: content.channel,
          payload: content.payload
        },
        resolvedFrom: resolvedContent.originalIdentifier
      };
    } catch (error) {
      console.error("Error en match de contenido a perfiles:", error);
      return { success: false, error: error.message };
    }
  },
  
  async recordInteraction(profileId, contentId, channel, action) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Resolver identificadores
      const [resolvedProfile, resolvedContent] = await Promise.all([
        this.resolveProfileIdentifier(profileId),
        this.resolveContentIdentifier(contentId)
      ]);
      
      if (!resolvedProfile.isResolved) {
        await client.query('ROLLBACK');
        return { success: false, error: resolvedProfile.error };
      }
      
      if (!resolvedContent.isResolved) {
        await client.query('ROLLBACK');
        return { success: false, error: resolvedContent.error };
      }
      
      const validProfileId = resolvedProfile.id;
      const validContentId = resolvedContent.id;
      
      // 2. Verificar que el perfil y contenido existen
      const [profileResult, contentResult] = await Promise.all([
        client.query('SELECT id FROM marketing_profiles WHERE id = $1', [validProfileId]),
        client.query('SELECT id FROM marketing_contents WHERE id = $1', [validContentId])
      ]);
      
      if (profileResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: "Perfil no encontrado" };
      }
      
      if (contentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: "Contenido no encontrado" };
      }
      
      // 3. Registrar interacción
      const result = await client.query(
        `INSERT INTO marketing_interactions (profile_id, content_id, channel, action) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, timestamp`,
        [validProfileId, validContentId, channel, action]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        interaction: {
          id: result.rows[0].id,
          profile_id: validProfileId,
          content_id: validContentId,
          channel,
          action,
          timestamp: result.rows[0].timestamp
        },
        resolvedIds: {
          profileResolvedFrom: resolvedProfile.originalIdentifier,
          contentResolvedFrom: resolvedContent.originalIdentifier
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error registrando interacción:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
};