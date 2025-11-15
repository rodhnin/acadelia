import feedbackService from '../../services/chat/feedbackService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Procesa y guarda el feedback del usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const processFeedback = async (req, res) => {
  try {
    const { chatId, messageId, type, feedback, messageContent } = req.body;
    
    if (!type || !messageId) {
      logSecurityEvent('INCOMPLETE_FEEDBACK', 'Intento de enviar feedback con datos incompletos', {
        userId: req.user?.id_user,
        chatId: chatId,
        ip: req.ip
      }, 'low');
      
      return res.status(400).json({ 
        success: false, 
        error: 'Datos incompletos para el feedback' 
      });
    }

    const feedbackData = {
      type,
      feedback: feedback || '',
      id_chat: chatId,
      id_message: messageId,
      messageContent: messageContent || '',
      id_user: req.user ? req.user.id_user : null
    };

    const savedFeedback = await feedbackService.saveFeedback(feedbackData);
    
    setTimeout(() => {
      feedbackService.sendFeedbackEmail(savedFeedback.id)
        .catch(emailError => {
          logSecurityEvent('FEEDBACK_EMAIL_ERROR', 'Error enviando correo de feedback', {
            feedbackId: savedFeedback.id,
            userId: req.user?.id_user,
            error: emailError.message,
            ip: req.ip
          }, 'low');
          
          console.error('Error enviando correo de feedback (asíncrono):', emailError);
        });
    }, 100);
    
    // Responder al cliente inmediatamente después de guardar en BD
    return res.status(200).json({
      success: true,
      message: 'Feedback guardado correctamente',
      data: { id: savedFeedback.id }
    });
  } catch (error) {
    logSecurityEvent('FEEDBACK_PROCESSING_ERROR', 'Error procesando feedback', {
      userId: req.user?.id_user,
      chatId: req.body.chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error('Error procesando feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar el feedback',
      message: error.message
    });
  }
};

/**
 * Procesa todos los feedbacks pendientes de envío por correo
 * Solo accesible para administradores
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
export const processPendingFeedbacks = async (req, res) => {
  try {
    logSecurityEvent('ADMIN_PROCESS_FEEDBACKS', 'Administrador procesando feedbacks pendientes', {
      adminId: req.user?.id_user,
      ip: req.ip
    }, 'medium');
    
    const results = await feedbackService.processPendingFeedbacks();
    return res.status(200).json({
      success: true,
      message: 'Procesamiento de feedbacks pendientes completado',
      data: results
    });
  } catch (error) {
    logSecurityEvent('PENDING_FEEDBACKS_ERROR', 'Error procesando feedbacks pendientes', {
      adminId: req.user?.id_user,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error('Error procesando feedbacks pendientes:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar feedbacks pendientes',
      message: error.message
    });
  }
};

export const getMessageOriginalContent = async (req, res) => {
    const { chatId, messageId } = req.params;
    const userId = req.user?.id_user;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario requerido y debe ser numérico' });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId)) {
        return res.status(400).json({ error: 'ID de chat inválido' });
    }

    if (!messageId || isNaN(Number(messageId))) {
        return res.status(400).json({ error: 'ID de mensaje requerido y debe ser numérico' });
    }

    try {
        console.log(`📋 [FEEDBACK] Obteniendo contenido original - Chat: ${chatId}, Mensaje: ${messageId}, Usuario: ${userId}`);
        
        const result = await feedbackService.getMessageOriginalContent(chatId, userId, Number(messageId));
        
        if (!result.success) {
            logSecurityEvent('MESSAGE_CONTENT_ACCESS_DENIED', 'Acceso denegado al contenido original del mensaje', {
                userId: userId,
                chatId: chatId,
                messageId: messageId,
                error: result.error,
                ip: req.ip
            }, 'medium');
            
            return res.status(404).json({ 
                success: false,
                error: result.error 
            });
        }

        console.log(`✅ [FEEDBACK] Contenido original obtenido exitosamente - ${result.data.filteredContent?.length || 0} caracteres filtrados`);

        res.json({
            success: true,
            data: {
                messageId: result.data.id,
                role: result.data.role,
                originalContent: result.data.originalContent,
                filteredContent: result.data.filteredContent,
                timestamp: result.data.timestamp
            }
        });
        
    } catch (error) {
        logSecurityEvent('MESSAGE_CONTENT_ERROR', 'Error obteniendo contenido original del mensaje', {
            userId: userId,
            chatId: chatId,
            messageId: messageId,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        console.error('Error obteniendo contenido original del mensaje:', error);
        
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener el contenido original del mensaje',
            details: error.message 
        });
    }
};