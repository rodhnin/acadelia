import path from 'path';
import fs from 'fs';
import * as chatService from '../../services/chat/chatServices.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { imageStorageService } from '../../services/chat/imageStorageService.js';
import { documentStorageService } from '../../services/chat/documentStorageService.js';

export const createChat = async (req, res) => {
    const { userId, avaId, herramientaId, query } = req.body;

    console.log('🔍 createChat Controller - req.body:', req.body);

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: 'Se requiere una query inicial para el chat' });
    }

    try {
        let chat;

        if (herramientaId !== null && herramientaId !== undefined && !isNaN(Number(herramientaId))) {
            console.log(`🔧 Creando chat para herramienta ${herramientaId}`);
            chat = await chatService.createChat(
                Number(userId),
                null,
                query,
                Number(herramientaId)
            );
        } else if (avaId !== null && avaId !== undefined && !isNaN(Number(avaId))) {
            console.log(`🎭 Creando chat para AVA ${avaId}`);
            chat = await chatService.createChat(
                Number(userId),
                Number(avaId),
                query,
                null
            );
        } else {
            return res.status(400).json({
                error: 'Se requiere avaId O herramientaId para crear un chat',
                received: { avaId, herramientaId }
            });
        }

        console.log('✅ Chat creado desde controlador:', chat.id);
        res.status(201).json(chat);

    } catch (error) {
        console.error('❌ Error en createChat Controller:', {
            error: error.message,
            stack: error.stack,
            params: { userId, avaId, herramientaId }
        });

        res.status(500).json({
            error: 'Error al crear el chat',
            details: error.message
        });
    }
};

export const cancelPendingRequest = async (req, res) => {
    const { chatId } = req.params;
    const userId = Number(req.headers['id_user'] || req.body.userId);
    let avaId = req.body.avaId ? Number(req.body.avaId) : null;
    let herramientaId = req.body.herramientaId ? Number(req.body.herramientaId) : null;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: 'ID de chat inválido' });
    }

    try {
        console.log(`🔄 Iniciando cancelación para chat ${chatId}, usuario ${userId}`);

        if (!avaId && !herramientaId) {
            try {
                console.log(`🔍 Obteniendo información del chat usando servicio para ${chatId}...`);

                const pool = (await import('../../lib/dbPool.js')).default;
                const result = await pool.query(
                    'SELECT id_ava, id_herramienta FROM chat WHERE id_chat = $1',
                    [chatId]
                );

                if (result.rows.length > 0) {
                    const { id_ava, id_herramienta } = result.rows[0];

                    if (id_herramienta !== null && id_herramienta !== undefined) {
                        herramientaId = id_herramienta;
                        avaId = null;
                        console.log(`✅ Chat ${chatId} es de HERRAMIENTA: ${herramientaId}`);
                    } else if (id_ava !== null && id_ava !== undefined) {
                        avaId = id_ava;
                        herramientaId = null;
                        console.log(`✅ Chat ${chatId} es de AVA: ${avaId}`);
                    } else {
                        herramientaId = 2;
                        avaId = null;
                        console.log(`⚠️ Chat ${chatId} sin tipo definido, usando herramienta por defecto: ${herramientaId}`);
                    }
                } else {
                    console.warn(`⚠️ Chat ${chatId} no encontrado, usando herramienta por defecto`);
                    herramientaId = 2;
                    avaId = null;
                }
            } catch (e) {
                console.warn("⚠️ Error obteniendo información del chat:", e.message);
                herramientaId = 2;
                avaId = null;
                console.log(`🔧 Usando fallback: herramientaId = 2`);
            }
        }

        const hasAva = avaId !== null && avaId !== undefined && !isNaN(avaId) && avaId > 0;
        const hasHerramienta = herramientaId !== null && herramientaId !== undefined && !isNaN(herramientaId) && herramientaId > 0;

        if (hasAva && hasHerramienta) {
            console.error(`❌ ERROR CRÍTICO: Chat ${chatId} tiene tanto AVA (${avaId}) como herramienta (${herramientaId})`);
            avaId = null;
            console.log(`🔧 CORRIGIENDO: Limpiando avaId, manteniendo herramientaId = ${herramientaId}`);
        }

        if (!hasAva && !hasHerramienta) {
            console.warn(`⚠️ No se pudo determinar el tipo de chat para ${chatId}, usando herramienta por defecto`);
            herramientaId = 2;
            avaId = null;
        }

        const finalAvaId = hasAva && !hasHerramienta ? avaId : null;
        const finalHerramientaId = hasHerramienta ? herramientaId : null;

        console.log(`🎯 Cancelando solicitud para chat ${chatId}, usuario ${userId}, AVA: ${finalAvaId}, Herramienta: ${finalHerramientaId}`);

        const result = await chatService.registerCancelledRequest(chatId, userId, finalAvaId, finalHerramientaId);

        if (!result.success) {
            console.error(`❌ Error en cancelación: ${result.error}`);
            return res.status(404).json({
                success: false,
                error: result.error || 'Error al cancelar solicitud',
                details: {
                    chatId,
                    userId,
                    detectedAvaId: finalAvaId,
                    detectedHerramientaId: finalHerramientaId
                }
            });
        }

        console.log(`✅ Cancelación exitosa para chat ${chatId}`);
        res.json({
            success: true,
            message: 'Solicitud cancelada con éxito',
            data: result.data,
            info: {
                chatId,
                userId,
                avaId: finalAvaId,
                herramientaId: finalHerramientaId,
                detectionMethod: (req.body.avaId || req.body.herramientaId) ? 'provided' : 'auto-detected'
            }
        });
    } catch (error) {
        logSecurityEvent('CHAT_CANCEL_ERROR', 'Error al cancelar solicitud de chat', {
            userId: userId,
            chatId: chatId,
            providedAvaId: req.body.avaId,
            providedHerramientaId: req.body.herramientaId,
            error: error.message,
            stack: error.stack,
            ip: req.ip
        }, 'medium');

        console.error('❌ Error cancelando solicitud:', {
            error: error.message,
            stack: error.stack,
            chatId,
            userId,
            providedAvaId: req.body.avaId,
            providedHerramientaId: req.body.herramientaId
        });

        res.status(500).json({
            success: false,
            error: 'Error al cancelar solicitud',
            details: error.message,
            info: {
                chatId,
                userId,
                providedAvaId: req.body.avaId,
                providedHerramientaId: req.body.herramientaId
            }
        });
    }
};

/**
 * ✅ FUNCIÓN CORREGIDA: cancelChatMessage
 */
export const cancelChatMessage = async (req, res) => {
    const { chatId } = req.params;
    const userId = Number(req.headers['id_user'] || req.body.userId);

    let avaId = null;
    let herramientaId = null;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: 'ID de chat inválido' });
    }

    try {
        console.log(`🔄 Iniciando cancelación de mensaje para chat ${chatId}, usuario ${userId}`);

        try {
            console.log(`🔍 Detectando tipo de chat automáticamente para ${chatId}...`);

            const pool = (await import('../../lib/dbPool.js')).default;
            const result = await pool.query(
                'SELECT id_ava, id_herramienta FROM chat WHERE id_chat = $1',
                [chatId]
            );

            if (result.rows.length > 0) {
                const { id_ava, id_herramienta } = result.rows[0];

                if (id_herramienta !== null && id_herramienta !== undefined) {
                    herramientaId = id_herramienta;
                    avaId = null;
                    console.log(`✅ cancelChatMessage: Chat ${chatId} es de HERRAMIENTA: ${herramientaId}`);
                } else if (id_ava !== null && id_ava !== undefined) {
                    avaId = id_ava;
                    herramientaId = null;
                    console.log(`✅ cancelChatMessage: Chat ${chatId} es de AVA: ${avaId}`);
                } else {
                    herramientaId = 2;
                    avaId = null;
                    console.log(`⚠️ cancelChatMessage: Chat ${chatId} sin tipo definido, usando herramienta por defecto: ${herramientaId}`);
                }
            } else {
                console.warn(`⚠️ cancelChatMessage: Chat ${chatId} no encontrado, usando herramienta por defecto`);
                herramientaId = 2;
                avaId = null;
            }
        } catch (e) {
            console.warn("⚠️ cancelChatMessage: Error detectando tipo de chat:", e.message);
            herramientaId = 2;
            avaId = null;
            console.log(`🔧 cancelChatMessage: Usando fallback: herramientaId = 2`);
        }

        const hasAva = avaId !== null && avaId !== undefined && !isNaN(avaId) && avaId > 0;
        const hasHerramienta = herramientaId !== null && herramientaId !== undefined && !isNaN(herramientaId) && herramientaId > 0;

        if (hasAva && hasHerramienta) {
            console.error(`❌ ERROR CRÍTICO en cancelChatMessage: Chat ${chatId} tiene tanto AVA (${avaId}) como herramienta (${herramientaId})`);
            avaId = null; // Priorizar herramienta
            console.log(`🔧 cancelChatMessage CORRIGIENDO: Limpiando avaId, manteniendo herramientaId = ${herramientaId}`);
        }

        if (!hasAva && !hasHerramienta) {
            console.warn(`⚠️ cancelChatMessage: No se pudo determinar el tipo de chat para ${chatId}, usando herramienta por defecto`);
            herramientaId = 2;
            avaId = null;
        }

        const finalAvaId = hasAva && !hasHerramienta ? avaId : null;
        const finalHerramientaId = hasHerramienta ? herramientaId : null;

        console.log(`🎯 cancelChatMessage: Intentando cancelar mensaje en chat ${chatId} para usuario ${userId} con AVA: ${finalAvaId}, Herramienta: ${finalHerramientaId}`);

        const result = await chatService.markMessageAsCancelled(chatId, userId, finalAvaId, finalHerramientaId);

        if (!result.success) {
            console.log('❌ cancelChatMessage: No se pudo cancelar el mensaje:', result.message || result.error);
            return res.status(404).json({
                success: false,
                error: result.message || result.error || 'Error al cancelar el mensaje',
                details: {
                    chatId,
                    userId,
                    detectedAvaId: finalAvaId,
                    detectedHerramientaId: finalHerramientaId,
                    source: 'cancelChatMessage'
                }
            });
        }

        console.log('✅ cancelChatMessage: Mensaje cancelado exitosamente:', result.data?.id);
        res.json({
            success: true,
            message: 'Mensaje marcado como cancelado con éxito',
            data: result.data,
            info: {
                chatId,
                userId,
                avaId: finalAvaId,
                herramientaId: finalHerramientaId,
                messageId: result.data?.id,
                source: 'cancelChatMessage'
            }
        });
    } catch (error) {
        console.error('❌ cancelChatMessage: Error cancelando mensaje:', {
            error: error.message,
            stack: error.stack,
            chatId,
            userId
        });

        res.status(500).json({
            success: false,
            error: 'Error al cancelar el mensaje',
            details: error.message,
            info: {
                chatId,
                userId,
                source: 'cancelChatMessage'
            }
        });
    }
};

export const getChats = async (req, res) => {
    const { userId, avaId, herramientaId } = req.params;

    if (!userId || isNaN(Number(userId))) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    console.log('🔍 getChats - Parámetros recibidos:', {
        userId,
        avaId,
        herramientaId,
        path: req.path,
        url: req.url
    });

    try {
        if (req.path.includes('/tool/')) {
            // RUTA DE HERRAMIENTAS: /chats/:userId/tool/:herramientaId
            console.log('📊 Procesando ruta de herramientas');

            if (!herramientaId || isNaN(Number(herramientaId))) {
                return res.status(400).json({
                    error: 'ID de herramienta requerido y debe ser numérico',
                    received: { herramientaId, type: typeof herramientaId }
                });
            }

            console.log(`🔧 Obteniendo chats para usuario ${userId} y herramienta ${herramientaId}`);

            const chats = await chatService.getChatsByTool(Number(userId), Number(herramientaId));

            console.log(`✅ Chats obtenidos por herramienta: ${chats.length} chats`);
            res.json(chats);
            return;
        }
        else {
            // RUTA DE AVAS: /chats/:userId/:avaId
            console.log('🤖 Procesando ruta de AVAs');

            if (!avaId || isNaN(Number(avaId))) {
                return res.status(400).json({
                    error: 'ID de AVA requerido y debe ser numérico',
                    received: { avaId, type: typeof avaId }
                });
            }

            console.log(`🎭 Obteniendo chats para usuario ${userId} y AVA ${avaId}`);

            const chats = await chatService.getChats(Number(userId), Number(avaId));

            console.log(`✅ Chats obtenidos por AVA: ${chats.length} chats`);
            res.json(chats);
            return;
        }
    } catch (error) {
        console.error('❌ Error en getChats:', {
            error: error.message,
            stack: error.stack,
            params: { userId, avaId, herramientaId },
            path: req.path
        });

        if (error.message === 'Chat no encontrado o acceso no autorizado') {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener chats'
        });
    }
};

export const getChatMessages = async (req, res) => {
    const { chatId } = req.params;
    const userId = Number(req.headers['id_user']);

    if (!userId || isNaN(userId) || userId < 1) {
        return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: "ID de chat inválido" });
    }

    try {
        const chatInfo = await chatService.getChatInfo(chatId);

        const pool = (await import('../../lib/dbPool.js')).default;
        const ownerCheck = await pool.query(
            'SELECT id_user FROM chat WHERE id_chat = $1',
            [chatId]
        );

        if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].id_user !== userId) {
            return res.status(404).json({ error: 'Chat no encontrado o acceso no autorizado' });
        }

        const messages = await chatService.getChatMessages(chatId, userId);
        res.json(messages);
    } catch (error) {
        console.error('Error obteniendo mensajes:', error);
        if (error.message === 'Chat no encontrado o acceso no autorizado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Error interno al recuperar el historial',
            details: error.message
        });
    }
};

export const editChatTitle = async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: "El título no puede estar vacío" });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: "ID de chat inválido" });
    }

    try {
        const updatedChat = await chatService.updateChatTitle(chatId, title);
        res.json({
            message: 'Título de chat actualizado con éxito',
            chat: updatedChat
        });
    } catch (error) {
        console.error('Error actualizando título del chat:', error);
        if (error.message === 'Chat no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Error al actualizar el título',
            details: error.message
        });
    }
};

export const deleteChat = async (req, res) => {
    const { chatId } = req.params;
    const userId = Number(req.headers['id_user']);

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: "ID de chat inválido" });
    }

    try {
        const deletedChat = await chatService.deleteChat(chatId, userId);

        console.log(`🗑️ Iniciando eliminación de archivos para chat: ${chatId}`);

        const documentsDeleted = await documentStorageService.deleteFilesForChat(chatId);
        console.log(`📄 Documentos eliminados: ${documentsDeleted ? 'Sí' : 'No'}`);

        const imagesDeleted = await imageStorageService.deleteImagesForChat(chatId);
        console.log(`🖼️ Imágenes eliminadas: ${imagesDeleted ? 'Sí' : 'No'}`);

        logSecurityEvent('CHAT_DELETED', 'Chat eliminado exitosamente', {
            userId: userId,
            chatId: chatId,
            documentsDeleted,
            imagesDeleted,
            ip: req.ip
        }, 'medium');

        res.json({
            message: 'Chat marcado como eliminado exitosamente',
            chat: deletedChat,
            filesCleanup: {
                documentsDeleted,
                imagesDeleted
            }
        });
    } catch (error) {
        logSecurityEvent('CHAT_DELETION_ERROR', 'Error al eliminar chat', {
            userId: userId,
            chatId: chatId,
            error: error.message,
            ip: req.ip
        }, 'medium');

        console.error('Error eliminando chat:', error);
        if (error.message === 'Chat no encontrado o ya fue eliminado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Error al eliminar el chat',
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIÓN SIMPLIFICADA SIN VALIDACIÓN DE TOKENS: updateChatMessage
 */
export const updateChatMessage = async (req, res) => {
    const { chatId } = req.params;
    const { messageId, content } = req.body;
    const userId = Number(req.headers['id_user'] || req.body.userId);

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: 'ID de chat inválido' });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ error: 'Contenido del mensaje requerido' });
    }

    try {
        const updatedMessage = await chatService.updateChatMessage(chatId, userId, messageId, content);

        const response = {
            success: true,
            message: 'Mensaje actualizado con éxito',
            data: updatedMessage
        };

        res.json(response);

    } catch (error) {
        logSecurityEvent('MESSAGE_UPDATE_ERROR', 'Error al actualizar mensaje de chat', {
            userId: userId,
            chatId: chatId,
            messageId: messageId,
            error: error.message,
            ip: req.ip
        }, 'medium');
        console.error('Error actualizando mensaje:', error);

        if (error.message === 'Chat no encontrado o acceso no autorizado') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        if (error.message === 'Mensaje no encontrado') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al actualizar el mensaje',
            details: error.message
        });
    }
};

/**
 * ✅ FUNCIÓN SIMPLIFICADA SIN VALIDACIÓN DE TOKENS: replaceInteraction
 */
export const replaceInteraction = async (req, res) => {
    const { chatId } = req.params;
    const { userMessageId, aiMessageId, userContent, aiContent } = req.body;
    const userId = Number(req.headers['id_user'] || req.body.userId);

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: 'ID de chat inválido' });
    }

    if ((!userContent || typeof userContent !== 'string') &&
        (!aiContent || typeof aiContent !== 'string')) {
        return res.status(400).json({ error: 'Se requiere al menos uno de los contenidos (usuario o IA)' });
    }

    try {
        const result = await chatService.replaceInteraction(
            chatId,
            userId,
            userMessageId,
            aiMessageId,
            userContent,
            aiContent
        );

        const response = {
            success: true,
            message: 'Interacción actualizada con éxito',
            data: result
        };

        res.json(response);

    } catch (error) {
        logSecurityEvent('INTERACTION_REPLACE_ERROR', 'Error al reemplazar interacción en chat', {
            userId: userId,
            chatId: chatId,
            userMessageId: userMessageId,
            aiMessageId: aiMessageId,
            error: error.message,
            ip: req.ip
        }, 'medium');
        console.error('Error actualizando interacción:', error);

        if (error.message === 'Chat no encontrado o acceso no autorizado') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al actualizar la interacción',
            details: error.message
        });
    }
};

/**
 * SOLUCIÓN CRÍTICA 4: Mejorar sistema de locks en chatController.js
 * REEMPLAZAR la función saveMarkdownImage completa (línea ~680-780 aproximadamente)
 */

export const saveMarkdownImage = async (req, res) => {
    const { imageUrl, chatId, checkDuplicate = true } = req.body;

    if (!imageUrl) {
        return res.status(400).json({
            success: false,
            error: 'URL de imagen requerida'
        });
    }

    try {
        if (imageUrl.startsWith('/uploads/')) {
            const fullPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
            if (fs.existsSync(fullPath)) {
                console.log(`✅ URL ya es ruta local válida: ${imageUrl}`);
                return res.json({
                    success: true,
                    filePath: imageUrl,
                    originalUrl: imageUrl,
                    securityInfo: { localPath: true }
                });
            } else {
                console.log(`⚠️ Ruta local no existe, reprocesando: ${imageUrl}`);
            }
        }

        if (!global._saveImageLocks) {
            global._saveImageLocks = new Map();
        }

        const locks = global._saveImageLocks;
        const lockKey = `${chatId || 'default'}:${imageUrl}`;

        if (locks.has(lockKey)) {
            console.log(`⏳ Imagen ya en procesamiento, esperando resultado: ${imageUrl.substring(0, 50)}...`);

            try {
                const existingPromise = locks.get(lockKey);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout esperando procesamiento concurrente')), 10000)
                );

                const result = await Promise.race([existingPromise, timeoutPromise]);

                if (result && result.success && result.filePath) {
                    console.log(`✅ Usando resultado exitoso de procesamiento concurrente: ${result.filePath}`);
                    return res.json(result);
                } else {
                    console.log(`❌ Resultado de procesamiento concurrente no válido, eliminando lock`);
                    locks.delete(lockKey);
                }
            } catch (error) {
                console.log(`❌ Error esperando procesamiento concurrente: ${error.message}`);
                locks.delete(lockKey);
            }
        }

        if (checkDuplicate) {
            const existingImage = await imageStorageService.findExistingImage(imageUrl, chatId || 'markdown_images');

            if (existingImage) {
                const fullPath = path.join(process.cwd(), existingImage.replace(/^\//, ''));
                if (fs.existsSync(fullPath)) {
                    console.log(`📦 Imagen duplicada encontrada y verificada: ${existingImage}`);
                    return res.json({
                        success: true,
                        filePath: existingImage,
                        originalUrl: imageUrl,
                        securityInfo: { reused: true, verified: true }
                    });
                } else {
                    console.log(`🗑️ Imagen duplicada no válida, reprocesando: ${existingImage}`);
                }
            }
        }

        const processingPromise = (async () => {
            try {
                const result = await imageStorageService.saveImageFromUrl(imageUrl, chatId || 'markdown_images');

                if (!result || !result.success) {
                    throw new Error(result?.error || 'Resultado de procesamiento inválido');
                }

                return result;
            } catch (error) {
                console.error(`❌ Error en procesamiento de imagen: ${error.message}`);
                throw error;
            } finally {
                setTimeout(() => {
                    if (locks.has(lockKey)) {
                        locks.delete(lockKey);
                        console.log(`🧹 Lock limpiado para: ${lockKey.substring(0, 50)}...`);
                    }
                }, 2000);
            }
        })();

        locks.set(lockKey, processingPromise);

        try {
            const result = await processingPromise;

            console.log(`✅ Imagen procesada exitosamente: ${result.filePath || 'error'}`);

            res.json({
                success: result.success,
                filePath: result.filePath,
                originalUrl: imageUrl,
                securityInfo: result.securityInfo
            });
        } catch (error) {
            locks.delete(lockKey);
            throw error;
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};