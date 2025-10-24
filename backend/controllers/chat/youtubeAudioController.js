import { YouTubeAudioService } from '../../services/chat/youtubeAudioService.js';
import { isValidUUID } from '../../utils/chat/validators.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Procesa una URL de YouTube, extrae el audio, transcribe y almacena para interacción
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
export const processYouTubeURL = async (req, res) => {
  const processingStart = Date.now();
  
  try {
    const { url, userId, chatId } = req.body;
    
    // Validación básica
    if (!url || !userId || !chatId) {
      // Log de solicitud con datos incompletos
      logSecurityEvent('YOUTUBE_INCOMPLETE_REQUEST', 'Solicitud incompleta de procesamiento de YouTube', {
        url: url ? url.substring(0, 100) + '...' : 'no proporcionada',
        userId: userId || 'no proporcionado',
        chatId: chatId || 'no proporcionado',
        ip: req.ip
      }, 'medium');
      
      return res.status(400).json({
        success: false,
        error: "Se requiere URL de YouTube, userId y chatId"
      });
    }
    
    // Validar formato de chatId (UUID)
    if (!isValidUUID(chatId)) {
      // Log de intento con chatId inválido
      logSecurityEvent('INVALID_CHAT_ID', 'Intento de procesar YouTube con chatId inválido', {
        userId: userId,
        chatId: chatId,
        ip: req.ip
      }, 'medium');
      
      return res.status(400).json({
        success: false,
        error: "El formato de chatId es inválido (debe ser UUID)"
      });
    }
    
    // Validar URL de YouTube
    if (!YouTubeAudioService.isValidYouTubeUrl(url)) {
      // Log de intento con URL de YouTube inválida
      logSecurityEvent('INVALID_YOUTUBE_URL', 'Intento de procesar URL de YouTube inválida', {
        userId: userId,
        url: url,
        ip: req.ip
      }, 'medium');
      
      return res.status(400).json({
        success: false,
        error: "URL de YouTube no válida"
      });
    }

    // Procesar URL
    console.log(`Iniciando procesamiento de URL de YouTube: ${url} para chat ${chatId}`);
    const result = await YouTubeAudioService.processYouTubeURL(
      url, 
      parseInt(userId),
      chatId, 
      {
        processingType: 'youtube',
        userAgent: req.headers['user-agent']
      }
    );

    res.status(200).json({
      success: true,
      message: "Video de YouTube procesado exitosamente",
      data: {
        url: url,
        title: result.metadata.title,
        channel: result.metadata.channel,
        duration: result.metadata.duration,
        chunkCount: result.chunks,
        timestamp: Date.now()
      },
      metrics: result.metrics
    });

  } catch (error) {
    // Log de error en procesamiento de YouTube
    logSecurityEvent('YOUTUBE_PROCESSING_ERROR', 'Error procesando URL de YouTube', {
      userId: req.body.userId,
      chatId: req.body.chatId,
      url: req.body.url ? req.body.url.substring(0, 100) + '...' : 'no proporcionada',
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error("Error procesando URL de YouTube:", error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details || {},
      processingTime: Date.now() - processingStart
    });
  }
};

/**
 * Detecta si un texto es una URL de YouTube
 * @param {string} text - Texto a analizar
 * @returns {boolean} - True si es una URL de YouTube
 */
export const isYouTubeURL = (text) => {
  return YouTubeAudioService.isValidYouTubeUrl(text);
};

export default {
  processYouTubeURL,
  isYouTubeURL
};