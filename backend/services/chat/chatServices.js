import { v4 as uuidv4 } from 'uuid';
import pool from '../../lib/dbPool.js';
import { embeddings } from '../../lib/openai.js';


// ============================================================================
// FUNCIÓN createChat CORREGIDA EN chatServices.js
// ============================================================================

/**
 * Crea un nuevo chat
 * @param {number} userId - ID del usuario
 * @param {number|null} avaId - ID del avatar (null para herramientas)
 * @param {string} query - Consulta inicial
 * @param {number|null} herramientaId - ID de la herramienta (null para AVAs)
 * @returns {Promise<Object>} Datos del chat creado
 */
export const createChat = async (userId, avaId, query, herramientaId = null) => {
    const chatId = uuidv4();
    const chatTitle = query.trim().substring(0, 50);

    console.log('🔍 createChat - Parámetros recibidos:', {
        userId,
        avaId,
        herramientaId,
        query: query.substring(0, 30) + '...'
    });

    // ✅ Validación: exactamente uno debe estar presente
    const hasAva = avaId !== null && avaId !== undefined;
    const hasHerramienta = herramientaId !== null && herramientaId !== undefined;

    if (hasAva && hasHerramienta) {
        console.error('❌ Error: Un chat no puede tener avaId Y herramientaId al mismo tiempo');
        throw new Error('Un chat no puede tener avaId Y herramientaId al mismo tiempo');
    }

    if (!hasAva && !hasHerramienta) {
        console.error('❌ Error: Un chat debe tener avaId O herramientaId');
        throw new Error('Un chat debe tener avaId O herramientaId');
    }

    try {
        const result = await pool.query(
            `INSERT INTO chat (id_chat, id_user, id_ava, id_herramienta, title)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_chat AS id, title, created_at, id_ava, id_herramienta`,
            [chatId, userId, avaId || null, herramientaId || null, chatTitle]
        );

        const newChat = result.rows[0];

        console.log('✅ Chat creado exitosamente:', {
            id: newChat.id,
            userId,
            avaId: newChat.id_ava,
            herramientaId: newChat.id_herramienta,
            title: newChat.title
        });

        return newChat;
    } catch (error) {
        console.error('❌ Error ejecutando query SQL:', error);
        throw new Error(`Error de base de datos: ${error.message}`);
    }
};

// ✅ AGREGAR función auxiliar para mapeo de herramientas
export const getToolIdByType = (toolType) => {
    const toolMap = {
        'agent': 2,
        'pdf': 1
    };
    return toolMap[toolType] || null;
};

/**
 * ✅ FUNCIÓN CORREGIDA: Obtiene información completa del chat (AVA o herramienta)
 * @param {string} chatId - ID del chat
 * @returns {Promise<Object>} - Información del chat con tipo claramente identificado
 */
export const getChatInfo = async (chatId) => {
    try {
        const result = await pool.query(
            `SELECT id_ava, id_herramienta 
             FROM chat 
             WHERE id_chat = $1`,
            [chatId]
        );

        if (result.rowCount === 0) {
            throw new Error(`Chat ${chatId} no encontrado`);
        }

        const row = result.rows[0];
        const hasAva = row.id_ava !== null && row.id_ava !== undefined;
        const hasHerramienta = row.id_herramienta !== null && row.id_herramienta !== undefined;

        console.log(`🔍 getChatInfo para ${chatId}: id_ava=${row.id_ava}, id_herramienta=${row.id_herramienta}`);

        // ✅ LÓGICA CORREGIDA: Validación de integridad y detección correcta
        if (hasAva && hasHerramienta) {
            console.error(`❌ INCONSISTENCIA CRÍTICA: Chat ${chatId} tiene tanto AVA (${row.id_ava}) como herramienta (${row.id_herramienta})`);
            console.warn(`🔧 CORRIGIENDO: Priorizando herramienta y limpiando AVA`);
            return {
                type: 'herramienta',
                avaId: null,                    // ✅ Limpiar avaId
                herramientaId: row.id_herramienta,
                id: row.id_herramienta // Para compatibilidad con código existente
            };
        }

        // ✅ CASO 1: Es una herramienta (verificar PRIMERO porque es más común en los logs)
        if (hasHerramienta) {
            console.log(`✅ Chat ${chatId} es de tipo HERRAMIENTA: ${row.id_herramienta}`);
            return {
                type: 'herramienta',
                avaId: null,
                herramientaId: row.id_herramienta,
                id: row.id_herramienta // Para compatibilidad con código existente
            };
        }

        // ✅ CASO 2: Es un AVA
        if (hasAva) {
            console.log(`✅ Chat ${chatId} es de tipo AVA: ${row.id_ava}`);
            return {
                type: 'ava',
                avaId: row.id_ava,
                herramientaId: null,
                id: row.id_ava // Para compatibilidad con código existente
            };
        }

        // ✅ CASO 3: Fallback si no tiene ninguno (caso edge)
        console.warn(`⚠️ Chat ${chatId} no tiene AVA ni herramienta, usando herramienta por defecto`);
        return {
            type: 'herramienta',
            avaId: null,
            herramientaId: 2, // ID de herramienta "Agente" por defecto
            id: 2
        };

    } catch (error) {
        console.error(`❌ Error obteniendo información del chat ${chatId}:`, error);

        // En caso de error, devolver herramienta por defecto pero con información del error
        console.warn(`🔧 Fallback por error: usando herramienta por defecto para chat ${chatId}`);
        return {
            type: 'herramienta',
            avaId: null,
            herramientaId: 2,
            id: 2,
            error: error.message
        };
    }
};

/**
 * Mantener función original para compatibilidad, pero deprecada
 * @deprecated Usar getChatInfo() en su lugar para mejor tipado
 */
export const getAvatarIdForChat = async (chatId) => {
    try {
        const chatInfo = await getChatInfo(chatId);
        return chatInfo.id; // Retorna el ID independientemente del tipo
    } catch (error) {
        console.error(`❌ Error obteniendo ID para chat ${chatId}:`, error);
        return 2; // Fallback original
    }
};

/**
 * ✅ FUNCIÓN CORREGIDA: markMessageAsCancelled
 */
export const markMessageAsCancelled = async (chatId, userId, avaId = null, herramientaId = null) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ✅ DETERMINAR QUÉ TIPO DE CHAT ES usando la función corregida
        let actualAvaId = avaId;
        let actualHerramientaId = herramientaId;

        if (!actualAvaId && !actualHerramientaId) {
            try {
                const chatInfo = await getChatInfo(chatId);
                actualAvaId = chatInfo.avaId;
                actualHerramientaId = chatInfo.herramientaId;
                console.log(`🔍 Información del chat obtenida: tipo=${chatInfo.type}, AVA=${actualAvaId}, Herramienta=${actualHerramientaId}`);
            } catch (error) {
                console.warn(`⚠️ Error obteniendo info del chat ${chatId}, usando fallback`);
                actualAvaId = null;
                actualHerramientaId = 2;
            }
        }

        // ✅ VALIDACIÓN FINAL CRÍTICA
        const hasAva = actualAvaId !== null && actualAvaId !== undefined;
        const hasHerramienta = actualHerramientaId !== null && actualHerramientaId !== undefined;

        // 🚨 ASEGURAR QUE NUNCA TENGAMOS AMBOS
        if (hasAva && hasHerramienta) {
            console.error(`❌ ERROR CRÍTICO en markMessageAsCancelled: Chat ${chatId} tiene tanto AVA (${actualAvaId}) como herramienta (${actualHerramientaId})`);
            // Priorizar herramienta
            actualAvaId = null;
            console.log(`🔧 CORRIGIENDO: Limpiando avaId, manteniendo herramientaId = ${actualHerramientaId}`);
        }

        if (!hasAva && !hasHerramienta) {
            console.error(`❌ Error: No se pudo obtener un ID válido para chat ${chatId}`);
            actualAvaId = null;
            actualHerramientaId = 2;
            console.log(`🔧 Usando fallback: Herramienta ID = 2`);
        }

        console.log(`🔄 Marcando mensaje como cancelado para chat ${chatId}, usuario ${userId}, AVA: ${actualAvaId}, Herramienta: ${actualHerramientaId}`);

        // ✅ QUERY CORREGIDO: Buscar mensaje usando los campos correctos
        const findQuery = `
            SELECT id, id_ava, id_herramienta
            FROM chat_history
            WHERE id_chat = $1 
            AND role = 'assistant'
            AND (status IS NULL OR status = 'processing')
            AND (
                ($2::integer IS NOT NULL AND id_ava = $2 AND id_herramienta IS NULL)
                OR
                ($3::integer IS NOT NULL AND id_herramienta = $3 AND id_ava IS NULL)
            )
            ORDER BY timestamp DESC 
            LIMIT 1
        `;

        const findResult = await client.query(findQuery, [chatId, actualAvaId, actualHerramientaId]);

        let result;

        if (findResult.rowCount > 0) {
            const messageId = findResult.rows[0].id;
            console.log(`📝 Encontrado mensaje asistente (ID: ${messageId}) para marcar como cancelado`);

            result = await client.query(
                `UPDATE chat_history 
                SET status = 'cancelled',
                    has_pending_cancellation = true,
                    cancellation_timestamp = NOW(),
                    message = CASE 
                              WHEN message ILIKE '%cancelad%' THEN message 
                              ELSE 'Mensaje cancelado por el usuario'
                              END
                WHERE id = $1
                RETURNING id, role, message AS content, timestamp AS created_at, 
                         now() AS updated_at, status, id_ava, id_herramienta`,
                [messageId]
            );
        } else {
            console.log(`📝 No se encontró mensaje asistente, creando nuevo mensaje cancelado`);

            result = await client.query(
                `INSERT INTO chat_history
                 (id_user, id_ava, id_herramienta, id_chat, role, message, status, has_pending_cancellation, cancellation_timestamp)
                 VALUES ($1, $2, $3, $4, 'assistant', 'Mensaje cancelado por el usuario', 'cancelled', true, NOW())
                 RETURNING id, role, message AS content, timestamp AS created_at, 
                          now() AS updated_at, status, id_ava, id_herramienta`,
                [userId, actualAvaId, actualHerramientaId, chatId]
            );
        }

        await client.query(
            `UPDATE chat 
            SET last_message_date = NOW() 
            WHERE id_chat = $1`,
            [chatId]
        );

        await client.query('COMMIT');
        console.log(`✅ Mensaje marcado como cancelado exitosamente: ${result.rows[0].id}`);
        return { success: true, data: result.rows[0] };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error marcando mensaje como cancelado:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
};


export const getChats = async (userId, avaId, herramientaId = null) => {
    let query;
    let params;

    if (herramientaId !== null && herramientaId !== undefined) {
        // Filtrar por herramienta
        query = `SELECT id_chat::text AS id, title, created_at, last_message_date, id_herramienta
                 FROM chat
                 WHERE id_user = $1 
                 AND id_herramienta = $2 
                 AND is_deleted = false
                 ORDER BY last_message_date DESC NULLS LAST, created_at DESC`;
        params = [userId, herramientaId];
    } else {
        // Filtrar por AVA (lógica original)
        query = `SELECT id_chat::text AS id, title, created_at, last_message_date, id_ava
                 FROM chat
                 WHERE id_user = $1 
                 AND id_ava = $2 
                 AND is_deleted = false
                 ORDER BY last_message_date DESC NULLS LAST, created_at DESC`;
        params = [userId, avaId];
    }

    const result = await pool.query(query, params);
    return result.rows;
};

export const getChatsByTool = async (userId, herramientaId) => {
    const result = await pool.query(
        `SELECT id_chat::text AS id, title, created_at, last_message_date, id_herramienta
         FROM chat
         WHERE id_user = $1 
         AND id_herramienta = $2 
         AND is_deleted = false
         ORDER BY last_message_date DESC NULLS LAST, created_at DESC`,
        [userId, herramientaId]
    );
    return result.rows;
};

/**
 * ✅ FUNCIÓN CORREGIDA: registerCancelledRequest
 */
export const registerCancelledRequest = async (chatId, userId, avaId = null, herramientaId = null) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ✅ OBTENER INFORMACIÓN DEL CHAT usando la función corregida
        let actualAvaId = avaId;
        let actualHerramientaId = herramientaId;

        if (!actualAvaId && !actualHerramientaId) {
            try {
                const chatInfo = await getChatInfo(chatId);
                actualAvaId = chatInfo.avaId;
                actualHerramientaId = chatInfo.herramientaId;
                console.log(`✅ IDs detectados automáticamente para chat ${chatId}: tipo=${chatInfo.type}, AVA=${actualAvaId}, Herramienta=${actualHerramientaId}`);
            } catch (error) {
                console.warn(`⚠️ Error obteniendo info del chat ${chatId}, usando fallback`);
                actualAvaId = null;
                actualHerramientaId = 2;
            }
        }

        // ✅ VALIDACIÓN Y FALLBACK CORREGIDO
        const hasAva = actualAvaId !== null && actualAvaId !== undefined;
        const hasHerramienta = actualHerramientaId !== null && actualHerramientaId !== undefined;

        // 🚨 ASEGURAR QUE NUNCA TENGAMOS AMBOS
        if (hasAva && hasHerramienta) {
            console.error(`❌ ERROR CRÍTICO en registerCancelledRequest: Chat ${chatId} tiene tanto AVA (${actualAvaId}) como herramienta (${actualHerramientaId})`);
            // Priorizar herramienta
            actualAvaId = null;
            console.log(`🔧 CORRIGIENDO: Limpiando avaId, manteniendo herramientaId = ${actualHerramientaId}`);
        }

        if (!hasAva && !hasHerramienta) {
            console.warn(`⚠️ No se encontró tipo de chat para ${chatId}, usando herramienta por defecto`);
            actualAvaId = null;
            actualHerramientaId = 2;
        }

        console.log(`🔄 Registrando cancelación para chat ${chatId}: AVA=${actualAvaId}, Herramienta=${actualHerramientaId}`);

        // Marcar TODOS los mensajes relacionados con este chat
        await client.query(
            `UPDATE chat_history
             SET has_pending_cancellation = true,
                 cancellation_timestamp = NOW()
             WHERE id_chat = $1`,
            [chatId]
        );

        // Crear mensaje específico de cancelación con parámetros CORRECTOS
        const result = await markMessageAsCancelled(chatId, userId, actualAvaId, actualHerramientaId);

        await client.query('COMMIT');

        console.log(`✅ Cancelación registrada exitosamente para chat ${chatId}`);

        return { success: true, data: result.data };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error registrando solicitud cancelada:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
};

/**
 * ✅ FUNCIÓN MEJORADA: Verifica si una solicitud ha sido cancelada con logging detallado
 * @param {string} chatId - ID del chat
 * @returns {Promise<boolean>} true si fue cancelada
 */
export const wasRequestCancelled = async (chatId) => {
    if (!chatId) {
        console.warn('wasRequestCancelled: No se proporcionó chatId');
        return false;
    }

    try {
        // ✅ CORRECCIÓN CRÍTICA: Solo considerar cancelaciones de los últimos 8 segundos para nuevos procesos
        const result = await pool.query(
            `SELECT COUNT(*) as count, 
              MAX(cancellation_timestamp) as latest_cancellation,
              EXTRACT(EPOCH FROM (NOW() - MAX(cancellation_timestamp))) as seconds_ago
       FROM chat_history
       WHERE id_chat = $1 
       AND has_pending_cancellation = true
       AND cancellation_timestamp > NOW() - INTERVAL '5 seconds'`,
            [chatId]
        );

        const cancelCount = parseInt(result.rows[0].count, 10);
        const latestCancellation = result.rows[0].latest_cancellation;
        const secondsAgo = parseFloat(result.rows[0].seconds_ago || 999);

        // ✅ CORRECCIÓN: Solo considerar cancelación si es MUY RECIENTE (menos de 8 segundos)
        const isCancelled = cancelCount > 0 && secondsAgo < 8;

        if (isCancelled) {
            console.log(`🚫 [${chatId}] CANCELACIÓN ACTIVA detectada hace ${secondsAgo.toFixed(1)}s (${latestCancellation})`);
        } else if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [${chatId}] Sin cancelación activa reciente`);
        }

        return isCancelled;
    } catch (error) {
        console.error(`❌ [${chatId}] Error verificando cancelación:`, error);
        return false;
    }
};


/**
 * ✅ FUNCIÓN MEJORADA: Limpia la bandera de cancelación con logging detallado
 * @param {string} chatId - ID del chat
 */
export const clearCancellationFlag = async (chatId) => {
    if (!chatId) {
        console.warn('clearCancellationFlag: No se proporcionó chatId');
        return { success: false, error: 'No se proporcionó chatId' };
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log(`🔄 clearCancellationFlag: Limpieza específica para chat ${chatId}...`);

        // ✅ LIMPIEZA MUY SELECTIVA - Solo mensajes assistant cancelados
        const updateResult = await client.query(
            `UPDATE chat_history
             SET has_pending_cancellation = false,
                 cancellation_timestamp = NULL
             WHERE id_chat = $1
             AND has_pending_cancellation = true
             AND role = 'assistant'
             AND status = 'cancelled'
             RETURNING id, role, status, cancellation_timestamp`,
            [chatId]
        );

        const updatedCount = updateResult.rowCount;

        if (updatedCount > 0) {
            console.log(`✅ clearCancellationFlag: ${updatedCount} flags de cancelación limpiados para chat ${chatId}`);

            // Log detalles solo en desarrollo
            if (process.env.NODE_ENV === 'development') {
                const cleaned = updateResult.rows;
                console.log(`📊 Limpiados: ${cleaned.map(r => `${r.role}:${r.status}`).join(', ')}`);
            }
        } else {
            console.log(`ℹ️ clearCancellationFlag: No había flags de cancelación elegibles para limpiar en chat ${chatId}`);
        }

        await client.query('COMMIT');

        return {
            success: true,
            clearedFlags: updatedCount,
            message: `Flags de cancelación limpiados: ${updatedCount}`
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ clearCancellationFlag: Error en limpieza para chat ${chatId}:`, error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
};


/**
 * ✅ FUNCIÓN MEJORADA: Limpiar banderas de cancelación al iniciar nuevo procesamiento
 * @param {string} chatId - ID del chat
 * @param {string} operationType - Tipo de operación (audio, youtube, etc.)
 * @returns {Promise<boolean>} true si se limpiaron correctamente
 */
export const resetCancellationFlagsForNewProcess = async (chatId, operationType = 'unknown') => {
    if (!chatId) {
        console.warn('resetCancellationFlagsForNewProcess: No se proporcionó chatId');
        return false;
    }

    try {
        console.log(`🔄 resetCancellationFlagsForNewProcess: Reseteando banderas de cancelación para nuevo procesamiento de ${operationType} en chat ${chatId}`);

        // ✅ PASO 1: Verificar si hay alguna bandera activa con detalles
        const isCancelled = await wasRequestCancelled(chatId);

        if (isCancelled) {
            console.log(`❗ resetCancellationFlagsForNewProcess: Se detectaron banderas de cancelación activas para chat ${chatId} al iniciar nuevo proceso de ${operationType}`);

            // ✅ PASO 2: Forzar limpieza directa para permitir nuevo procesamiento
            console.log(`✅ resetCancellationFlagsForNewProcess: Forzando limpieza de banderas para permitir nuevo procesamiento de ${operationType}`);
            const result = await clearCancellationFlag(chatId);

            if (result.success) {
                console.log(`✅ resetCancellationFlagsForNewProcess: Banderas limpiadas exitosamente para nuevo procesamiento de ${operationType} en chat ${chatId}`);
                console.log(`📊 Detalles de limpieza: ${result.clearedFlags} mensajes limpiados`);
                return true;
            } else {
                console.warn(`⚠️ resetCancellationFlagsForNewProcess: Error al limpiar banderas para chat ${chatId}: ${result.error}`);

                // ✅ PASO 3: Fallback con limpieza forzada si la normal falla
                console.log(`🔄 resetCancellationFlagsForNewProcess: Intentando limpieza forzada para chat ${chatId}`);
                const forceResult = await forceCleanCancellationFlags(chatId);

                if (forceResult) {
                    console.log(`✅ resetCancellationFlagsForNewProcess: Limpieza forzada exitosa para chat ${chatId}`);
                    return true;
                } else {
                    console.error(`❌ resetCancellationFlagsForNewProcess: Limpieza forzada falló para chat ${chatId}`);
                    return false;
                }
            }
        } else {
            // No hay banderas activas, no es necesario hacer nada
            console.log(`✅ resetCancellationFlagsForNewProcess: No hay banderas de cancelación activas para chat ${chatId}, listo para nuevo procesamiento de ${operationType}`);
            return true;
        }
    } catch (error) {
        console.error(`❌ resetCancellationFlagsForNewProcess: Error reseteando banderas de cancelación para chat ${chatId}:`, error);

        // En caso de error, intentar limpieza forzada como último recurso
        try {
            console.log(`🔄 resetCancellationFlagsForNewProcess: Error en reseteo normal, intentando limpieza forzada para chat ${chatId}`);
            const forceResult = await forceCleanCancellationFlags(chatId);

            if (forceResult) {
                console.log(`✅ resetCancellationFlagsForNewProcess: Limpieza forzada de emergencia exitosa para chat ${chatId}`);
                return true;
            }
        } catch (forceError) {
            console.error(`❌ resetCancellationFlagsForNewProcess: Limpieza forzada de emergencia falló para chat ${chatId}:`, forceError);
        }

        return false;
    }
};

/**
 * ✅ FUNCIÓN MEJORADA: Forzar limpieza de banderas de cancelación
 * @param {string} chatId - ID del chat
 * @returns {Promise<boolean>} true si se limpiaron correctamente
 */
export const forceCleanCancellationFlags = async (chatId) => {
    if (!chatId) {
        console.warn('forceCleanCancellationFlags: No se proporcionó chatId');
        return false;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log(`🔄 forceCleanCancellationFlags: FORZANDO limpieza de todas las banderas de cancelación para chat ${chatId}`);

        // ✅ PASO 1: Verificar estado antes de forzar
        const preCheckResult = await client.query(
            `SELECT COUNT(*) as count,
                    array_agg(DISTINCT id_ava) FILTER (WHERE id_ava IS NOT NULL) as ava_ids,
                    array_agg(DISTINCT id_herramienta) FILTER (WHERE id_herramienta IS NOT NULL) as herramienta_ids
             FROM chat_history 
             WHERE id_chat = $1`,
            [chatId]
        );

        const totalMessages = parseInt(preCheckResult.rows[0].count, 10);
        const avaIds = preCheckResult.rows[0].ava_ids || [];
        const herramientaIds = preCheckResult.rows[0].herramienta_ids || [];

        console.log(`📊 forceCleanCancellationFlags: Chat ${chatId} tiene ${totalMessages} mensajes total`);
        console.log(`📊 Tipos en chat: AVAs=${avaIds.join(',') || 'ninguno'}, Herramientas=${herramientaIds.join(',') || 'ninguno'}`);

        // ✅ PASO 2: Actualizar TODOS los mensajes sin importar su estado
        const updateResult = await client.query(
            `UPDATE chat_history
             SET has_pending_cancellation = false,
                 cancellation_timestamp = NULL
             WHERE id_chat = $1
             RETURNING id`,
            [chatId]
        );

        const updatedCount = updateResult.rowCount;
        console.log(`🔄 forceCleanCancellationFlags: Limpieza forzada completada para chat ${chatId}: ${updatedCount} mensajes actualizados de ${totalMessages} total`);

        await client.query('COMMIT');

        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ forceCleanCancellationFlags: Error en limpieza forzada para chat ${chatId}:`, error);
        return false;
    } finally {
        client.release();
    }
};


export const getChatMessages = async (chatId, userId) => {
    // Consulta simplificada para obtener solo mensajes del chat (sin PDFs)
    const chatQuery = `
    SELECT 
        ch.message AS content, 
        ch.role, 
        ch.timestamp AS created_at,
        ch.id,
        ch.status
    FROM chat_history ch
    INNER JOIN chat c ON ch.id_chat = c.id_chat
    WHERE ch.id_chat = $1 AND c.id_user = $2
    AND (ch.status IS NULL OR ch.status != 'cancelled')
    ORDER BY ch.timestamp ASC, ch.id ASC
    `;

    try {
        // Ejecutar la consulta de mensajes
        const result = await pool.query(chatQuery, [chatId, userId]);

        if (result.rowCount === 0) {
            // Verificar si el chat existe pero no tiene mensajes
            const chatExists = await pool.query(
                `SELECT id_chat FROM chat 
                 WHERE id_chat = $1 AND id_user = $2`,
                [chatId, userId]
            );

            if (chatExists.rowCount === 0) {
                throw new Error('Chat no encontrado o acceso no autorizado');
            }

            // El chat existe pero no tiene mensajes
            return [];
        }

        return result.rows;
    } catch (error) {
        console.error('Error obteniendo mensajes:', error);
        throw error;
    }
};

export const updateChatTitle = async (chatId, title) => {
    const result = await pool.query(
        `UPDATE chat
         SET title = $1
         WHERE id_chat = $2
         RETURNING id_chat, title`,
        [title, chatId]
    );
    if (result.rowCount === 0) {
        throw new Error('Chat no encontrado');
    }
    return result.rows[0];
};

export const deleteChat = async (chatId, userId) => {
    const result = await pool.query(
        `UPDATE chat
         SET is_deleted = true,
             title = CONCAT(title, ' (deleted)')
         WHERE id_chat = $1 
         AND id_user = $2 
         AND is_deleted = false
         RETURNING id_chat::text AS id, title, created_at, id_ava`,
        [chatId, userId]
    );

    if (result.rowCount === 0) {
        throw new Error('Chat no encontrado o ya fue eliminado');
    }

    return result.rows[0];
};

// NUEVOS SERVICIOS PARA ACTUALIZACIÓN DE MENSAJES:

/**
 * Actualiza un mensaje en el historial del chat
 * 
 * @param {string} chatId - ID del chat
 * @param {number} userId - ID del usuario
 * @param {string} messageId - ID del mensaje (opcional)
 * @param {string} content - Nuevo contenido del mensaje
 * @returns {Object} Mensaje actualizado
 */
export const updateChatMessage = async (chatId, userId, messageId, content) => {
    // Verificar que el chat existe y pertenece al usuario
    const chatCheck = await pool.query(
        `SELECT id_chat, id_ava, id_herramienta FROM chat WHERE id_chat = $1 AND id_user = $2`,
        [chatId, userId]
    );

    if (chatCheck.rowCount === 0) {
        throw new Error('Chat no encontrado o acceso no autorizado');
    }

    const chatData = chatCheck.rows[0];

    // Generar embedding
    let embeddingArray;
    try {
        embeddingArray = await embeddings.embedQuery(content);
    } catch (error) {
        console.error('Error generando embedding para mensaje actualizado:', error);
        embeddingArray = new Array(1536).fill(0);
    }

    const embeddingVector = `[${embeddingArray.join(',')}]`;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let result;

        if (messageId) {
            // ✅ ACTUALIZAR MENSAJE ESPECÍFICO
            result = await client.query(
                `UPDATE chat_history 
                SET message = $1, 
                    embedding = $2::vector(1536),
                    updated_at = NOW()
                WHERE id = $3 AND id_chat = $4
                RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                [content, embeddingVector, messageId, chatId]
            );
        } else {
            // ✅ BUSCAR ÚLTIMO MENSAJE DEL USUARIO CON FILTROS CORRECTOS
            const searchQuery = `
                UPDATE chat_history 
                SET message = $1, 
                    embedding = $2::vector(1536),
                    updated_at = NOW()
                WHERE id_chat = $3 AND role = 'user' 
                AND (
                    ($4::integer IS NOT NULL AND id_ava = $4 AND id_herramienta IS NULL)
                    OR
                    ($5::integer IS NOT NULL AND id_herramienta = $5 AND id_ava IS NULL)
                )
                ORDER BY timestamp DESC 
                LIMIT 1
                RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`;

            result = await client.query(searchQuery, [
                content,
                embeddingVector,
                chatId,
                chatData.id_ava,
                chatData.id_herramienta
            ]);
        }

        if (result.rowCount === 0) {
            throw new Error('Mensaje no encontrado');
        }

        await client.query(
            `UPDATE chat 
            SET last_message_date = NOW() 
            WHERE id_chat = $1`,
            [chatId]
        );

        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Reemplaza una interacción completa (mensaje del usuario + respuesta IA)
 * 
 * @param {string} chatId - ID del chat
 * @param {number} userId - ID del usuario
 * @param {string} userMessageId - ID del mensaje del usuario (opcional)
 * @param {string} aiMessageId - ID del mensaje de IA (opcional)
 * @param {string} userContent - Nuevo contenido del mensaje del usuario
 * @param {string} aiContent - Nuevo contenido de la respuesta de IA
 * @returns {Object} Resultado de la operación
 */
export const replaceInteraction = async (chatId, userId, userMessageId, aiMessageId, userContent, aiContent) => {
    // Verificar que el chat existe y pertenece al usuario
    const chatCheck = await pool.query(
        `SELECT id_chat, id_ava FROM chat WHERE id_chat = $1 AND id_user = $2`,
        [chatId, userId]
    );

    if (chatCheck.rowCount === 0) {
        throw new Error('Chat no encontrado o acceso no autorizado');
    }

    const avaId = chatCheck.rows[0].id_ava;

    // Cliente para transacción
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const results = {
            userMessage: null,
            aiMessage: null
        };

        // Actualizar mensaje del usuario si se proporciona contenido
        if (userContent) {
            // 🔥 NUEVO: Procesar userContent para mensajes multimodales
            let processedUserContent = userContent;

            try {
                // Verificar si userContent es un JSON string que contiene datos multimodales
                const parsed = JSON.parse(userContent);
                if (parsed && typeof parsed === 'object' &&
                    (parsed.hasImage || parsed.hasDocuments || parsed.images || parsed.documents)) {
                    // Es mensaje multimodal - hacer doble stringify para guardarlo como string escapado
                    processedUserContent = JSON.stringify(userContent);
                    console.log('🔥 Mensaje multimodal detectado - aplicando doble stringify');
                }
            } catch (e) {
                // No es JSON válido o no es multimodal, usar como está
                console.log('📝 Mensaje normal detectado - sin doble stringify');
            }

            // CLAVE: Importar el módulo de embeddings correctamente
            // Generar embedding para el mensaje del usuario
            let userEmbeddingArray;
            try {
                // Asegurarse de que embeddings.embedQuery está disponible
                if (!embeddings || typeof embeddings.embedQuery !== 'function') {
                    console.error('Error: El módulo de embeddings no está disponible o no tiene la función embedQuery');
                    throw new Error('Módulo de embeddings no disponible');
                }

                userEmbeddingArray = await embeddings.embedQuery(userContent);
                console.log('Embedding generado correctamente para mensaje del usuario:',
                    userEmbeddingArray ? userEmbeddingArray.length : 'No se generó');
            } catch (error) {
                console.error('Error generando embedding para mensaje del usuario:', error);
                // En caso de error, usar un vector de ceros como fallback
                userEmbeddingArray = new Array(1536).fill(0);
            }

            // Formatear para PostgreSQL
            const userEmbeddingVector = `[${userEmbeddingArray.join(',')}]`;

            let userResult;

            if (userMessageId) {
                // IMPORTANTE: Si se proporciona un ID específico, usar consulta directa con ese ID
                console.log(`Actualizando mensaje de usuario con ID específico: ${userMessageId}`);
                userResult = await client.query(
                    `UPDATE chat_history 
                    SET message = $1, 
                        embedding = $2::vector(1536),
                        updated_at = NOW()
                    WHERE id = $3 AND id_chat = $4
                    RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                    [processedUserContent, userEmbeddingVector, userMessageId, chatId]  // 🔥 Usar processedUserContent
                );
            } else {
                // Si no se proporciona ID, buscar el último mensaje del usuario
                console.log(`Actualizando último mensaje de usuario en chat: ${chatId}`);
                userResult = await client.query(
                    `WITH latest_user_message AS (
                      SELECT id FROM chat_history 
                      WHERE id_chat = $3 AND role = 'user' 
                      ORDER BY timestamp DESC
                      LIMIT 1
                    )
                    UPDATE chat_history 
                    SET message = $1, 
                        embedding = $2::vector(1536),
                        updated_at = NOW()
                    WHERE id IN (SELECT id FROM latest_user_message)
                    RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                    [processedUserContent, userEmbeddingVector, chatId]  // 🔥 Usar processedUserContent
                );
            }

            if (userResult.rowCount > 0) {
                results.userMessage = userResult.rows[0];
                console.log(`Mensaje de usuario actualizado con éxito: ${results.userMessage.id}`);
            } else {
                console.warn('No se pudo actualizar el mensaje del usuario');
            }
        }

        // Actualizar mensaje de IA si se proporciona contenido
        if (aiContent) {
            // CLAVE: Generar embedding para el mensaje de IA
            let aiEmbeddingArray;
            try {
                // Asegurarse de que embeddings.embedQuery está disponible
                if (!embeddings || typeof embeddings.embedQuery !== 'function') {
                    console.error('Error: El módulo de embeddings no está disponible o no tiene la función embedQuery');
                    throw new Error('Módulo de embeddings no disponible');
                }

                aiEmbeddingArray = await embeddings.embedQuery(aiContent);
                console.log('Embedding generado correctamente para respuesta de IA:',
                    aiEmbeddingArray ? aiEmbeddingArray.length : 'No se generó');
            } catch (error) {
                console.error('Error generando embedding para respuesta de IA:', error);
                // En caso de error, usar un vector de ceros como fallback
                aiEmbeddingArray = new Array(1536).fill(0);
            }

            // Formatear para PostgreSQL
            const aiEmbeddingVector = `[${aiEmbeddingArray.join(',')}]`;

            let aiResult;

            if (aiMessageId) {
                // CLAVE: Si se proporciona un ID específico, usar consulta directa con ese ID
                console.log(`Actualizando mensaje de IA con ID específico: ${aiMessageId}`);
                aiResult = await client.query(
                    `UPDATE chat_history 
                    SET message = $1, 
                        embedding = $2::vector(1536),
                        updated_at = NOW()
                    WHERE id = $3 AND id_chat = $4
                    RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                    [aiContent, aiEmbeddingVector, aiMessageId, chatId]
                );
            } else if (results.userMessage) {
                // Si actualizamos el mensaje del usuario, buscar la respuesta asociada
                console.log(`Buscando respuesta de IA asociada al mensaje de usuario: ${results.userMessage.id}`);
                aiResult = await client.query(
                    `WITH next_assistant_message AS (
                      SELECT id FROM chat_history 
                      WHERE id_chat = $3 AND role = 'assistant' 
                      AND timestamp > (SELECT timestamp FROM chat_history WHERE id = $4)
                      ORDER BY timestamp ASC
                      LIMIT 1
                    )
                    UPDATE chat_history 
                    SET message = $1, 
                        embedding = $2::vector(1536),
                        updated_at = NOW()
                    WHERE id IN (SELECT id FROM next_assistant_message)
                    RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                    [aiContent, aiEmbeddingVector, chatId, results.userMessage.id]
                );
            } else {
                // Si no hay mensaje de usuario actualizado, actualizar la última respuesta del asistente
                console.log(`Actualizando última respuesta de IA en chat: ${chatId}`);
                aiResult = await client.query(
                    `WITH latest_assistant_message AS (
                      SELECT id FROM chat_history 
                      WHERE id_chat = $3 AND role = 'assistant' 
                      ORDER BY timestamp DESC
                      LIMIT 1
                    )
                    UPDATE chat_history 
                    SET message = $1, 
                        embedding = $2::vector(1536),
                        updated_at = NOW()
                    WHERE id IN (SELECT id FROM latest_assistant_message)
                    RETURNING id, role, message AS content, timestamp AS created_at, now() AS updated_at`,
                    [aiContent, aiEmbeddingVector, chatId]
                );
            }

            if (aiResult.rowCount > 0) {
                results.aiMessage = aiResult.rows[0];
                console.log(`Mensaje de IA actualizado con éxito: ${results.aiMessage.id}`);
            } else {
                console.warn('No se pudo actualizar el mensaje de IA');
            }
        }

        // Actualizar la fecha del último mensaje en el chat
        await client.query(
            `UPDATE chat 
            SET last_message_date = NOW() 
            WHERE id_chat = $1`,
            [chatId]
        );

        await client.query('COMMIT');

        return { success: true, data: results };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en replaceInteraction:', error);
        throw error;
    } finally {
        client.release();
    }
};