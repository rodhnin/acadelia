// backend/routes/chat/documentRoutes.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../../lib/dbPool.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isValidUUID } from '../../utils/chat/validators.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';
import {
    getChatDocumentsController,
    getDocumentContentController,
    searchDocumentsController,
    getDocumentStatsController,
    checkChatHasDocumentsController,
    getRecentDocumentsController,
    getSupportedTypesController,
    processDocumentController
} from '../../controllers/chat/documentController.js';

const router = express.Router();

/**
 * Ruta para obtener información de un archivo por su ID
 * GET /api/documents/:fileId/info
 */
router.get('/:fileId/info', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id_user;
    
    // Validar UUID
    if (!isValidUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de archivo inválido'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Obtener información del archivo y verificar que pertenece al usuario
      const query = `
        SELECT fa.*, u.id_user
        FROM file_attachments fa
        JOIN usuario u ON fa.user_id = u.id_user
        WHERE fa.file_id = $1 AND fa.user_id = $2
      `;
      
      const result = await client.query(query, [fileId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado o sin permisos'
        });
      }
      
      const fileInfo = result.rows[0];
      
      // Actualizar accessed_at
      await client.query(
        'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
        [fileId]
      );
      
      // Log de acceso
      logSecurityEvent('DOCUMENT_ACCESS', 'Acceso a información de documento', {
        userId,
        fileId,
        fileName: fileInfo.original_name,
        attachmentType: fileInfo.attachment_type,
        ip: req.ip
      }, 'low');
      
      // Devolver información del archivo (sin contenido completo por seguridad)
      res.json({
        success: true,
        file: {
          fileId: fileInfo.file_id,
          originalName: fileInfo.original_name,
          fileName: fileInfo.file_name,
          fileSize: fileInfo.file_size,
          mimeType: fileInfo.mime_type,
          fileExtension: fileInfo.file_extension,
          attachmentType: fileInfo.attachment_type,
          language: fileInfo.language,
          hasContent: !!fileInfo.extracted_content,
          contentLength: fileInfo.extracted_content ? fileInfo.extracted_content.length : 0,
          isProcessed: fileInfo.is_processed,
          createdAt: fileInfo.created_at,
          updatedAt: fileInfo.updated_at,
          accessedAt: fileInfo.accessed_at
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error obteniendo información de archivo:', error);
    
    logSecurityEvent('DOCUMENT_ACCESS_ERROR', 'Error accediendo a información de documento', {
      userId: req.user?.id_user,
      fileId: req.params.fileId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener el contenido de un archivo por su ID
 * GET /api/documents/:fileId/content
 */
router.get('/:fileId/content', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id_user;
    
    // Validar UUID
    if (!isValidUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de archivo inválido'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Obtener el archivo y verificar permisos
      const query = `
        SELECT fa.*, u.id_user
        FROM file_attachments fa
        JOIN usuario u ON fa.user_id = u.id_user
        WHERE fa.file_id = $1 AND fa.user_id = $2
      `;
      
      const result = await client.query(query, [fileId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado o sin permisos'
        });
      }
      
      const fileInfo = result.rows[0];
      
      // Actualizar accessed_at
      await client.query(
        'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
        [fileId]
      );
      
      // Log de acceso al contenido
      logSecurityEvent('DOCUMENT_CONTENT_ACCESS', 'Acceso a contenido de documento', {
        userId,
        fileId,
        fileName: fileInfo.original_name,
        attachmentType: fileInfo.attachment_type,
        ip: req.ip
      }, 'low');
      
      // Devolver contenido
      res.json({
        success: true,
        file: {
          fileId: fileInfo.file_id,
          originalName: fileInfo.original_name,
          attachmentType: fileInfo.attachment_type,
          language: fileInfo.language,
          extractedContent: fileInfo.extracted_content,
          createdAt: fileInfo.created_at
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error obteniendo contenido de archivo:', error);
    
    logSecurityEvent('DOCUMENT_CONTENT_ACCESS_ERROR', 'Error accediendo a contenido de documento', {
      userId: req.user?.id_user,
      fileId: req.params.fileId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para descargar un archivo físico por su ID
 * GET /api/documents/:fileId/download
 */
router.get('/:fileId/download', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id_user;
    
    // Validar UUID
    if (!isValidUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de archivo inválido'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Obtener información del archivo y verificar permisos
      const query = `
        SELECT fa.*, u.id_user
        FROM file_attachments fa
        JOIN usuario u ON fa.user_id = u.id_user
        WHERE fa.file_id = $1 AND fa.user_id = $2
      `;
      
      const result = await client.query(query, [fileId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado o sin permisos'
        });
      }
      
      const fileInfo = result.rows[0];
      
      // Construir ruta completa del archivo
      const fullPath = path.join(process.cwd(), fileInfo.file_path.replace(/^\//, ''));
      
      // Verificar que el archivo existe físicamente
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          error: 'Archivo físico no encontrado'
        });
      }
      
      // Actualizar accessed_at
      await client.query(
        'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
        [fileId]
      );
      
      // Log de descarga
      logSecurityEvent('DOCUMENT_DOWNLOAD', 'Descarga de documento', {
        userId,
        fileId,
        fileName: fileInfo.original_name,
        attachmentType: fileInfo.attachment_type,
        fileSize: fileInfo.file_size,
        ip: req.ip
      }, 'low');
      
      // Configurar headers para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.original_name)}"`);
      res.setHeader('Content-Type', fileInfo.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', fileInfo.file_size);
      
      // Enviar archivo
      res.sendFile(fullPath);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error descargando archivo:', error);
    
    logSecurityEvent('DOCUMENT_DOWNLOAD_ERROR', 'Error descargando documento', {
      userId: req.user?.id_user,
      fileId: req.params.fileId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener archivos de un chat específico
 * GET /api/documents/chat/:chatId
 */
router.get('/chat/:chatId', authenticateUser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id_user;
    
    // Validar UUID
    if (!isValidUUID(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de chat inválido'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Obtener archivos del chat que pertenecen al usuario
      const query = `
        SELECT fa.file_id, fa.original_name, fa.file_size, fa.mime_type, 
               fa.file_extension, fa.attachment_type, fa.language, 
               fa.is_processed, fa.created_at,
               CASE WHEN fa.extracted_content IS NOT NULL THEN true ELSE false END as has_content
        FROM file_attachments fa
        WHERE fa.chat_id = $1 AND fa.user_id = $2
        ORDER BY fa.created_at DESC
      `;
      
      const result = await client.query(query, [chatId, userId]);
      
      res.json({
        success: true,
        files: result.rows,
        count: result.rows.length
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error obteniendo archivos del chat:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para eliminar un archivo por su ID
 * DELETE /api/documents/:fileId
 */
router.delete('/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id_user;
    
    // Validar UUID
    if (!isValidUUID(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de archivo inválido'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Obtener información del archivo antes de eliminarlo
      const selectQuery = `
        SELECT fa.*, u.id_user
        FROM file_attachments fa
        JOIN usuario u ON fa.user_id = u.id_user
        WHERE fa.file_id = $1 AND fa.user_id = $2
      `;
      
      const selectResult = await client.query(selectQuery, [fileId, userId]);
      
      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Archivo no encontrado o sin permisos'
        });
      }
      
      const fileInfo = selectResult.rows[0];
      
      // Eliminar archivo físico
      const fullPath = path.join(process.cwd(), fileInfo.file_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // Eliminar registro de la base de datos
      const deleteQuery = 'DELETE FROM file_attachments WHERE file_id = $1 AND user_id = $2';
      await client.query(deleteQuery, [fileId, userId]);
      
      await client.query('COMMIT');
      
      // Log de eliminación
      logSecurityEvent('DOCUMENT_DELETE', 'Eliminación de documento', {
        userId,
        fileId,
        fileName: fileInfo.original_name,
        attachmentType: fileInfo.attachment_type,
        ip: req.ip
      }, 'low');
      
      res.json({
        success: true,
        message: 'Archivo eliminado correctamente'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    
    logSecurityEvent('DOCUMENT_DELETE_ERROR', 'Error eliminando documento', {
      userId: req.user?.id_user,
      fileId: req.params.fileId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// NUEVAS RUTAS CON CONTROLADORES

/**
 * Obtiene documentos de un chat específico
 * GET /api/documents/chat/:chatId/list
 */
router.get('/chat/:chatId/list', authenticateUser, getChatDocumentsController);

/**
 * Verifica si un chat tiene documentos
 * GET /api/documents/chat/:chatId/check
 */
router.get('/chat/:chatId/check', authenticateUser, checkChatHasDocumentsController);

/**
 * Busca documentos en un chat
 * GET /api/documents/chat/:chatId/search?q=termino
 */
router.get('/chat/:chatId/search', authenticateUser, searchDocumentsController);

/**
 * Obtiene estadísticas de documentos del usuario
 * GET /api/documents/stats
 */
router.get('/stats', authenticateUser, getDocumentStatsController);

/**
 * Obtiene documentos recientes del usuario
 * GET /api/documents/recent?limit=10
 */
router.get('/recent', authenticateUser, getRecentDocumentsController);

/**
 * Obtiene tipos de archivo soportados
 * GET /api/documents/supported-types
 */
router.get('/supported-types', getSupportedTypesController);

/**
 * Procesa un documento manualmente
 * POST /api/documents/process
 */
router.post('/process', authenticateUser, processDocumentController);

/**
 * Obtiene contenido de un documento (usando controlador)
 * GET /api/documents/:fileId/view
 */
router.get('/:fileId/view', authenticateUser, getDocumentContentController);

/**
 * Recupera documentos de un mensaje multimodal para reintento
 * POST /api/documents/retrieve-for-retry
 */
router.post('/retrieve-for-retry', authenticateUser, async (req, res) => {
  try {
    const { chatId, documentReferences } = req.body;
    const userId = req.user.id_user;
    
    if (!chatId || !Array.isArray(documentReferences)) {
      return res.status(400).json({
        success: false,
        error: 'chatId y documentReferences son requeridos'
      });
    }
    
    console.log(`🔍 Recuperando ${documentReferences.length} documentos para reintento`);
    
    const client = await pool.connect();
    
    try {
      const fileIds = documentReferences.map(doc => doc.fileId);
      const placeholders = fileIds.map((_, index) => `$${index + 3}`).join(',');
      
      const query = `
        SELECT file_id, original_name, file_name, file_path, file_size, 
               mime_type, file_extension, attachment_type, extracted_content, 
               language, created_at
        FROM file_attachments 
        WHERE chat_id = $1 AND user_id = $2 AND file_id IN (${placeholders})
        ORDER BY created_at ASC
      `;
      
      const values = [chatId, userId, ...fileIds];
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          documents: [],
          message: 'No se encontraron documentos'
        });
      }
      
      // Convertir a formato compatible con frontend
      const documents = result.rows.map(doc => ({
        type: doc.attachment_type === 'code' ? "file" : "document",
        name: doc.original_name,
        filename: doc.original_name,
        mime_type: doc.mime_type,
        attachment_type: doc.attachment_type,
        language: doc.language,
        file_size: doc.file_size,
        // Enviar contenido como base64
        content_base64: Buffer.from(doc.extracted_content).toString('base64'),
        fileId: doc.file_id,
        filePath: doc.file_path
      }));
      
      console.log(`✅ Recuperados ${documents.length} documentos desde BD`);
      
      res.json({
        success: true,
        documents,
        count: documents.length
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error recuperando documentos para reintento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Recupera imágenes de un mensaje multimodal para reintento
 * POST /api/documents/retrieve-images-for-retry
 */
router.post('/retrieve-images-for-retry', authenticateUser, async (req, res) => {
  try {
    const { imageReferences } = req.body;
    
    if (!Array.isArray(imageReferences)) {
      return res.status(400).json({
        success: false,
        error: 'imageReferences es requerido'
      });
    }
    
    console.log(`🖼️ Recuperando ${imageReferences.length} imágenes para reintento`);
    
    const fs = await import('fs');
    const path = await import('path');
    const images = [];
    
    for (const imageRef of imageReferences) {
      try {
        const fullPath = path.join(process.cwd(), imageRef.path.replace(/^\//, ''));
        
        if (fs.existsSync(fullPath)) {
          const imageBuffer = fs.readFileSync(fullPath);
          const mimeType = imageRef.path.endsWith('.webp') ? 'image/webp' : 
                           imageRef.path.endsWith('.png') ? 'image/png' : 
                           imageRef.path.endsWith('.jpg') || imageRef.path.endsWith('.jpeg') ? 'image/jpeg' : 
                           'image/webp';
          
          images.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
              detail: "auto"
            },
            originalPath: imageRef.path,
            mimeType: mimeType
          });
          
          console.log(`✅ Imagen recuperada: ${imageRef.path}`);
        } else {
          console.warn(`⚠️ Imagen no encontrada: ${imageRef.path}`);
        }
      } catch (error) {
        console.error(`❌ Error recuperando imagen ${imageRef.path}:`, error);
      }
    }
    
    res.json({
      success: true,
      images,
      count: images.length
    });
    
  } catch (error) {
    console.error('❌ Error recuperando imágenes para reintento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

router.post('/get-message-for-retry', authenticateUser, async (req, res) => {
  try {
    const { chatId, userMessageId } = req.body;
    const userId = req.user.id_user;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId es requerido'
      });
    }
    
    console.log(`🔍 Buscando mensaje multimodal para reintento: chatId=${chatId}, userMessageId=${userMessageId}`);
    
    const client = await pool.connect();
    
    try {
      let query;
      let values;
      
      if (userMessageId) {
        // Buscar por ID específico - CORREGIDO: usar timestamp
        query = `
          SELECT id, message, is_multimodal, timestamp
          FROM chat_history 
          WHERE id_chat = $1 AND id_user = $2 AND id = $3 AND role = 'user'
          ORDER BY timestamp DESC
          LIMIT 1
        `;
        values = [chatId, userId, userMessageId];
      } else {
        // Buscar el último mensaje multimodal del usuario en este chat - CORREGIDO: usar timestamp
        query = `
          SELECT id, message, is_multimodal, timestamp
          FROM chat_history 
          WHERE id_chat = $1 AND id_user = $2 AND role = 'user' AND is_multimodal = true
          ORDER BY timestamp DESC
          LIMIT 1
        `;
        values = [chatId, userId];
      }
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return res.json({
          success: false,
          error: 'No se encontró mensaje multimodal'
        });
      }
      
      const messageRow = result.rows[0];
      
      console.log(`📋 Mensaje encontrado en BD:`, {
        id: messageRow.id,
        is_multimodal: messageRow.is_multimodal,
        message_preview: messageRow.message.substring(0, 100) + '...'
      });
      
      // Parsear el mensaje JSON
let messageData;
try {
  let rawMessage = messageRow.message;
  
  console.log('🔍 Raw message from DB:', rawMessage.substring(0, 200) + '...');
  
  // *** NUEVO: Decodificar HTML entities PRIMERO ***
  if (rawMessage.includes('&quot;') || rawMessage.includes('&amp;') || rawMessage.includes('&lt;') || rawMessage.includes('&gt;')) {
    rawMessage = rawMessage
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
    console.log('📝 Decoded HTML entities');
  }
  
  // Si el mensaje empieza con """, remover las comillas extras
  if (rawMessage.startsWith('"""') && rawMessage.endsWith('"""')) {
    rawMessage = rawMessage.slice(3, -3);
    console.log('📝 Removed triple quotes');
  }
  
  // Reemplazar escapes dobles por escapes simples
  if (rawMessage.includes('\\"')) {
    rawMessage = rawMessage.replace(/\\"/g, '"');
    console.log('📝 Fixed double escapes');
  }
  
  // *** CRÍTICO: Quitar comillas externas si el mensaje es un STRING de JSON ***
  if (rawMessage.startsWith('"') && rawMessage.endsWith('"')) {
    rawMessage = rawMessage.slice(1, -1);
    console.log('📝 Removed outer quotes - message was a JSON string');
  }
  
  console.log('🔧 Processed message:', rawMessage.substring(0, 200) + '...');
  
  messageData = JSON.parse(rawMessage);
  
  // *** NUEVO: Validar que el parsing fue exitoso ***
  console.log('✅ Parsed messageData properties:', {
    hasText: !!messageData.text,
    hasImage: messageData.hasImage,
    hasDocuments: messageData.hasDocuments,
    imageCount: messageData.imageCount,
    documentCount: messageData.documentCount,
    documentsArray: messageData.documents?.length || 0,
    imagesArray: messageData.images?.length || 0
  });
  
} catch (parseError) {
  console.error('❌ Error parseando mensaje JSON:', parseError);
  console.error('❌ Raw message causing error:', messageRow.message);
  return res.status(400).json({
    success: false,
    error: 'Mensaje con formato inválido: ' + parseError.message
  });
}
      
      // *** CORREGIDO: Acceder a las propiedades correctas ***
      console.log(`✅ Mensaje multimodal encontrado:`, {
        id: messageRow.id,
        hasDocuments: messageData.hasDocuments,           // CORRECTO
        hasImages: messageData.hasImage,                  // CORREGIDO: era hasImages
        documentCount: messageData.documentCount,         // CORRECTO
        imageCount: messageData.imageCount,               // CORRECTO
        text_preview: messageData.text?.substring(0, 50) + '...',
        documents_length: messageData.documents?.length || 0,
        images_length: messageData.images?.length || 0
      });
      
      // Verificar que realmente es multimodal
      if (!messageData.hasImage && !messageData.hasDocuments) {
        console.log('⚠️ Mensaje encontrado pero no es multimodal según su contenido');
        return res.json({
          success: false,
          error: 'Mensaje no es multimodal'
        });
      }
      
      res.json({
        success: true,
        messageData: messageData,
        messageId: messageRow.id,
        isMultimodal: messageRow.is_multimodal
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error recuperando mensaje para reintento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;