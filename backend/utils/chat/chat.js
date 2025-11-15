
import pool from "../../lib/dbPool.js";
import { supabase } from "../../lib/supabaseService.js";
import { embeddings } from '../../lib/openai.js';
import { isValidUUID } from './validators.js';
import { extractTextFromMultimodal } from './mathematicutils.js';


async function saveMessage({ 
    client = pool,
    userId, 
    avaId, 
    chatId, 
    role, 
    message, 
    embedding,
    herramientaId = null
}) {
    try {
        // 1. Validar parámetros esenciales
        if ([userId, chatId, role, message, embedding].some(p => p === undefined)) {
            throw new Error("Parámetros incompletos");
        }

        const hasAva = avaId !== null && avaId !== undefined;
        const hasHerramienta = herramientaId !== null && herramientaId !== undefined;
        
        if (!hasAva && !hasHerramienta) {
            throw new Error("Se requiere avaId O herramientaId");
        }
        
        if (hasAva && hasHerramienta) {
            throw new Error("No se puede usar avaId Y herramientaId simultáneamente");
        }

        let finalMessage = message;

        // 2. Convertir embedding a array numérico
        let embeddingArray;
        if (typeof embedding === 'string') {
            try {
                embeddingArray = JSON.parse(embedding);
            } catch (e) {
                throw new Error(`Error parseando embedding: ${e.message}`);
            }
        } else if (Array.isArray(embedding)) { 
            embeddingArray = embedding;
        } else if (embedding?.length) {
            embeddingArray = Array.from(embedding);
        } else {
            throw new Error(`Tipo de embedding no soportado: ${typeof embedding}`);
        }

        // 3. Validación numérica estricta
        if (!embeddingArray.every(v => typeof v === 'number' && !isNaN(v))) {
            throw new Error("Embedding contiene valores no numéricos");
        }

        // 4. Formatear para PostgreSQL
        const embeddingVector = `[${embeddingArray.join(',')}]`;

        const query = `
            INSERT INTO chat_history 
                (id_user, id_ava, id_herramienta, id_chat, role, message, embedding)
            VALUES ($1, $2, $3, $4::UUID, $5, $6, $7::vector(1536))
            RETURNING id, timestamp`;

        const values = [
            Number(userId),
            hasAva ? Number(avaId) : null,
            hasHerramienta ? Number(herramientaId) : null,
            chatId,
            role,
            finalMessage, // ✅ MENSAJE SIN TRUNCAR
            embeddingVector
        ];

        // 6. Ejecutar con el cliente proporcionado
        const result = await client.query(query, values);
        
        // 7. Actualizar last_message_date en la tabla chat
        const updateQuery = `
            UPDATE chat
            SET last_message_date = NOW()
            WHERE id_chat = $1::UUID
            RETURNING id_chat`;
            
        await client.query(updateQuery, [chatId]);
        
        return { 
            success: true, 
            id: result.rows[0].id,
            timestamp: result.rows[0].timestamp
        };

    } catch (error) {
        console.error("Error guardando mensaje:", {
            error: error.message,
            stack: error.stack,
            parámetros: { userId, avaId, herramientaId, chatId, role, messageLength: message?.length }
        });
        return { success: false, error: error.message };
    }
}

async function saveMultimodalMessage({ 
    client = pool,
    userId, 
    avaId, 
    chatId, 
    role, 
    message, 
    embedding,
    herramientaId = null
}) {
    try {
        // 1. Validar parámetros esenciales
        if ([userId, chatId, role, message, embedding].some(p => p === undefined)) {
            throw new Error("Parámetros incompletos");
        }

        const hasAva = avaId !== null && avaId !== undefined;
        const hasHerramienta = herramientaId !== null && herramientaId !== undefined;
        
        if (!hasAva && !hasHerramienta) {
            throw new Error("Se requiere avaId O herramientaId");
        }
        
        if (hasAva && hasHerramienta) {
            throw new Error("No se puede usar avaId Y herramientaId simultáneamente");
        }

        // ⭐ FORMATEO PARA COLUMNA TEXT CON DOBLE STRINGIFY ⭐
        let finalMessage = message;
        
        const isDoubleStringified = typeof message === 'string' && 
                                   message.startsWith('"{') && 
                                   message.endsWith('}"');
        const isSingleStringified = typeof message === 'string' && 
                                   message.startsWith('{') && 
                                   message.endsWith('}') &&
                                   !isDoubleStringified;
        const isObjectMessage = typeof message === 'object' && message !== null;
        
        if (isDoubleStringified) {
            // Ya está doblemente escapado
            finalMessage = message;
        } else if (isSingleStringified) {
            // Necesita un stringify más
            finalMessage = JSON.stringify(message);
        } else if (isObjectMessage) {
            // Necesita doble stringify completo
            finalMessage = JSON.stringify(JSON.stringify(message));
        } else {
            // String normal, mantener como está
            finalMessage = message;
        }

        // Verificación final para contenido multimodal
        if (typeof finalMessage === 'string' && 
            (finalMessage.includes('hasImage') || finalMessage.includes('hasDocuments'))) {
            
            if (!finalMessage.startsWith('"{') || !finalMessage.endsWith('}"')) {
                if (finalMessage.startsWith('{')) {
                    finalMessage = JSON.stringify(finalMessage);
                } else {
                    try {
                        const parsed = JSON.parse(finalMessage);
                        finalMessage = JSON.stringify(JSON.stringify(parsed));
                    } catch (e) {
                        finalMessage = JSON.stringify(finalMessage);
                    }
                }
            }
        }

        // 2. Procesar embedding
        let embeddingArray;
        if (typeof embedding === 'string') {
            try {
                embeddingArray = JSON.parse(embedding);
            } catch (e) {
                throw new Error(`Error parseando embedding: ${e.message}`);
            }
        } else if (Array.isArray(embedding)) { 
            embeddingArray = embedding;
        } else if (embedding?.length) {
            embeddingArray = Array.from(embedding);
        } else {
            throw new Error(`Tipo de embedding no soportado: ${typeof embedding}`);
        }

        if (!embeddingArray.every(v => typeof v === 'number' && !isNaN(v))) {
            throw new Error("Embedding contiene valores no numéricos");
        }

        const embeddingVector = `[${embeddingArray.join(',')}]`;

        // 3. Ejecutar query
        const query = `
            INSERT INTO chat_history 
                (id_user, id_ava, id_herramienta, id_chat, role, message, embedding, is_multimodal)
            VALUES ($1, $2, $3, $4::UUID, $5, $6, $7::vector(1536), true)
            RETURNING id, timestamp`;

        const values = [
            Number(userId),
            hasAva ? Number(avaId) : null,
            hasHerramienta ? Number(herramientaId) : null,
            chatId,
            role,
            finalMessage, // ✅ MENSAJE SIN TRUNCAR
            embeddingVector
        ];

        const result = await client.query(query, values);
        
        await client.query(
            `UPDATE chat SET last_message_date = NOW() WHERE id_chat = $1::UUID`,
            [chatId]
        );
        
        return { 
            success: true, 
            id: result.rows[0].id,
            timestamp: result.rows[0].timestamp
        };

    } catch (error) {
        console.error("Error guardando mensaje multimodal:", {
            error: error.message,
            parámetros: { userId, avaId, herramientaId, chatId, role, messageType: typeof message }
        });
        return { success: false, error: error.message };
    }
}

async function loadRelevantChatHistory(userId, avaId, chatId, query, herramientaId = null) {
    try {
        if (!isValidUUID(chatId)) {
            throw new Error("UUID inválido");
        }

        const queryEmbedding = await embeddings.embedQuery(query);
        
        let rpcParams;
        if (herramientaId !== null && herramientaId !== undefined) {
            rpcParams = {
                query_embedding: queryEmbedding,
                id_user_param: userId,
                id_ava_param: null,
                id_herramienta_param: herramientaId,
                id_chat_param: chatId,
                match_count: 6,
            };
        } else {
            rpcParams = {
                query_embedding: queryEmbedding,
                id_user_param: userId,
                id_ava_param: avaId,
                id_herramienta_param: null,
                id_chat_param: chatId,
                match_count: 6,
            };
        }
        
        const { data, error } = await supabase.rpc('match_chat_history', rpcParams);

        if (error) throw error;

        if (!Array.isArray(data)) {
            throw new Error("Formato de respuesta inválido de Supabase");
        }

        return data.map(item => ({
            role: item.role,
            content: item.message,
            similarity: item.similarity
        }));

    } catch (error) {
        console.error("Error cargando historial:", error);
        return [];
    }
}

async function loadChatHistoryForOpenAI(userId, avaId, chatId, query, herramientaId = null) {
    try {
        if (!isValidUUID(chatId)) {
            throw new Error("UUID inválido");
        }

        const queryEmbedding = await embeddings.embedQuery(
            typeof query === 'string' ? query : extractTextFromMultimodal(query)
        );
        
        let rpcParams;
        if (herramientaId !== null && herramientaId !== undefined) {
            rpcParams = {
                query_embedding: queryEmbedding,
                id_user_param: userId,
                id_ava_param: null,
                id_herramienta_param: herramientaId,
                id_chat_param: chatId,
                match_count: 5,
            };
        } else {
            rpcParams = {
                query_embedding: queryEmbedding,
                id_user_param: userId,
                id_ava_param: avaId,
                id_herramienta_param: null,
                id_chat_param: chatId,
                match_count: 5,
            };
        }
        
        const { data, error } = await supabase.rpc('match_chat_history', rpcParams);

        if (error) throw error;

        if (!Array.isArray(data)) {
            throw new Error("Formato de respuesta inválido de Supabase");
        }

        return data.map(item => {
            if (item.is_multimodal) {
                try {
                    const content = JSON.parse(item.message);
                    return {
                        role: item.role === 'user' ? 'user' : 'assistant',
                        content: content
                    };
                } catch (err) {
                    console.error("Error parseando mensaje multimodal:", err);
                    return {
                        role: item.role === 'user' ? 'user' : 'assistant',
                        content: item.message
                    };
                }
            } else {
                return {
                    role: item.role === 'user' ? 'user' : 'assistant',
                    content: item.message
                };
            }
        });

    } catch (error) {
        console.error("Error cargando historial para OpenAI:", error);
        return [];
    }
}

// ===== FUNCIONES PARA MANEJO DE DOCUMENTOS (SIN CAMBIOS) =====

/**
 * Obtiene información de documentos adjuntos de un chat
 */
async function getChatDocuments(chatId, userId) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT file_id, original_name, file_size, mime_type, 
                   file_extension, attachment_type, language, 
                   is_processed, created_at,
                   CASE WHEN extracted_content IS NOT NULL THEN true ELSE false END as has_content
            FROM file_attachments
            WHERE chat_id = $1 AND user_id = $2
            ORDER BY created_at DESC
        `;
        
        const result = await client.query(query, [chatId, userId]);
        return result.rows;
    } catch (error) {
        console.error("Error obteniendo documentos del chat:", error);
        return [];
    } finally {
        client.release();
    }
}

/**
 * Obtiene el contenido de un documento específico
 */
async function getDocumentContent(fileId, userId) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT file_id, original_name, attachment_type, language,
                   extracted_content, created_at, file_size, mime_type
            FROM file_attachments
            WHERE file_id = $1 AND user_id = $2
        `;
        
        const result = await client.query(query, [fileId, userId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        await client.query(
            'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
            [fileId]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error("Error obteniendo contenido del documento:", error);
        return null;
    } finally {
        client.release();
    }
}

/**
 * Busca documentos por contenido en un chat específico
 */
async function searchDocumentsInChat(chatId, userId, searchTerm) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT file_id, original_name, attachment_type, language,
                   file_size, created_at,
                   SUBSTRING(extracted_content FROM 1 FOR 200) as content_preview
            FROM file_attachments
            WHERE chat_id = $1 AND user_id = $2 
            AND (
                extracted_content ILIKE $3 
                OR original_name ILIKE $3
            )
            ORDER BY created_at DESC
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const result = await client.query(query, [chatId, userId, searchPattern]);
        
        return result.rows;
    } catch (error) {
        console.error("Error buscando documentos:", error);
        return [];
    } finally {
        client.release();
    }
}

/**
 * Obtiene estadísticas de documentos de un usuario
 */
async function getDocumentStats(userId) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT 
                COUNT(*) as total_documents,
                COUNT(CASE WHEN attachment_type = 'document' THEN 1 END) as text_documents,
                COUNT(CASE WHEN attachment_type = 'code' THEN 1 END) as code_files,
                SUM(file_size) as total_size,
                COUNT(DISTINCT chat_id) as chats_with_documents,
                COUNT(DISTINCT language) as different_languages
            FROM file_attachments
            WHERE user_id = $1
        `;
        
        const result = await client.query(query, [userId]);
        return result.rows[0] || {};
    } catch (error) {
        console.error("Error obteniendo estadísticas de documentos:", error);
        return {};
    } finally {
        client.release();
    }
}

/**
 * Verifica si un usuario tiene documentos en un chat específico
 */
async function hasDocumentsInChat(chatId, userId) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM file_attachments 
                WHERE chat_id = $1 AND user_id = $2
            ) as has_documents
        `;
        
        const result = await client.query(query, [chatId, userId]);
        return result.rows[0]?.has_documents || false;
    } catch (error) {
        console.error("Error verificando documentos en chat:", error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Obtiene documentos recientes de un usuario
 */
async function getRecentDocuments(userId, limit = 10) {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT fa.file_id, fa.original_name, fa.attachment_type, fa.language,
                   fa.file_size, fa.created_at, fa.chat_id,
                   c.title as chat_title
            FROM file_attachments fa
            LEFT JOIN chat c ON fa.chat_id = c.id_chat
            WHERE fa.user_id = $1
            ORDER BY fa.created_at DESC
            LIMIT $2
        `;
        
        const result = await client.query(query, [userId, limit]);
        return result.rows;
    } catch (error) {
        console.error("Error obteniendo documentos recientes:", error);
        return [];
    } finally {
        client.release();
    }
}

export { 
    saveMessage, 
    saveMultimodalMessage, 
    loadRelevantChatHistory, 
    loadChatHistoryForOpenAI,
    // Funciones para manejo de documentos
    getChatDocuments,
    getDocumentContent,
    searchDocumentsInChat,
    getDocumentStats,
    hasDocumentsInChat,
    getRecentDocuments
};