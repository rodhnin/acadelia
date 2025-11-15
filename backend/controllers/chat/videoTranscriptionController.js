import pool from "../../lib/dbPool.js";
import { isValidUUID } from '../../utils/chat/validators.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Verifica si un chat contiene transcripciones (videos o audios)
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const checkChatHasTranscription = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    logSecurityEvent('INVALID_CHAT_ID', 'Intento de verificar transcripción con chatId inválido', {
      chatId: chatId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'medium');
    
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Consultar si existe al menos un registro de transcripción en este chat
      const query = `
        SELECT COUNT(*) as count
        FROM agentetube 
        WHERE id_chat = $1 
        LIMIT 1
      `;
      
      const result = await client.query(query, [chatId]);
      const hasTranscription = parseInt(result.rows[0].count) > 0;
      
      return res.status(200).json({
        success: true,
        hasTranscription
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logSecurityEvent('TRANSCRIPTION_CHECK_ERROR', 'Error verificando transcripciones en chat', {
      chatId: chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error("Error verificando transcripciones en chat:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Verifica si un chat contiene videos transcriptos
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const checkChatHasVideo = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    logSecurityEvent('INVALID_CHAT_ID', 'Intento de obtener datos de video con chatId inválido', {
      chatId: chatId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'medium');
    
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Consultar si existe al menos un registro de YouTube en este chat
      const query = `
        SELECT COUNT(*) as count
        FROM agentetube 
        WHERE id_chat = $1 
        AND metadata->>'source' = 'youtube'
        LIMIT 1
      `;
      
      const result = await client.query(query, [chatId]);
      const hasVideo = parseInt(result.rows[0].count) > 0;
      
      return res.status(200).json({
        success: true,
        hasVideo
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error verificando videos en chat:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Verifica si un chat contiene audios transcriptos
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const checkChatHasAudio = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // Consultar si existe al menos un registro de audio en este chat
      const query = `
        SELECT COUNT(*) as count
        FROM agentetube 
        WHERE id_chat = $1 
        AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
        AND metadata->>'source' != 'youtube'
        LIMIT 1
      `;
      
      const result = await client.query(query, [chatId]);
      const hasAudio = parseInt(result.rows[0].count) > 0;
      
      return res.status(200).json({
        success: true,
        hasAudio
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error verificando audios en chat:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Verifica si hay un procesamiento de YouTube en curso para un chat específico
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const checkYouTubeProcessingStatus = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // 1. Primero, encontrar el mensaje más reciente del usuario que sea una URL de YouTube
      const lastYouTubeUploadQuery = `
        SELECT id, timestamp 
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'user'
        AND (
          message LIKE '%youtube.com%' 
          OR message LIKE '%youtu.be%'
        )
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const lastUploadResult = await client.query(lastYouTubeUploadQuery, [chatId]);
      
      // Si no hay ningún intento de subida, no hay nada que procesar
      if (lastUploadResult.rows.length === 0) {
        return res.status(200).json({
          success: false,
          processing: false,
          error: "No se encontró ningún intento de subida de YouTube"
        });
      }
      
      const lastUploadTimestamp = lastUploadResult.rows[0].timestamp;
      
      // 2. Buscar mensaje de confirmación después del último intento
      const successQuery = `
        SELECT COUNT(*) as count
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'assistant'
        AND message LIKE '%¡ÉPICO! He devorado ese video como capibara hambriento%'
        AND timestamp > $2
        LIMIT 1
      `;
      
      // 3. Buscar mensaje de error después del último intento
      const errorQuery = `
        SELECT COUNT(*) as count
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'assistant'
        AND (
          message LIKE '%El procesamiento del video fue cancelado%' 
          OR message LIKE '%¡Ups! Mi sistema de procesamiento tuvo un momento existencial%' 
          OR message LIKE '%¡Tranqui! El procesamiento del audio fue cancelado%' 
          OR message LIKE '%¡Oye! Tu solicitud fue cancelada como capibara%'
          OR message LIKE '%¡Auch! YouTube me está haciendo la vida más complicada%'
        )
        AND timestamp > $2
        LIMIT 1
      `;
      
      const [successResult, errorResult] = await Promise.all([
        client.query(successQuery, [chatId, lastUploadTimestamp]),
        client.query(errorQuery, [chatId, lastUploadTimestamp])
      ]);
      
      const isSuccess = parseInt(successResult.rows[0].count) > 0;
      const hasError = parseInt(errorResult.rows[0].count) > 0;
      
      // Si hay mensaje de error después del último intento, notificar al frontend
      if (hasError) {
        return res.status(200).json({
          success: false,
          processing: false,
          error: "Se detectó un mensaje de error para el intento actual"
        });
      }
      
      // Si hay mensaje de éxito después del último intento, notificar proceso completado
      if (isSuccess) {
        return res.status(200).json({
          success: true,
          processing: false
        });
      }
      
      // Si no hay ni éxito ni error después del último intento, sigue en procesamiento
      return res.status(200).json({
        success: true,
        processing: true
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error verificando estado de procesamiento de video:", error);
    
    // En caso de error en la consulta, indicar que no está procesando para liberar UI
    return res.status(500).json({
      success: false,
      error: error.message,
      processing: false
    });
  }
};


/**
 * Verifica si hay un procesamiento de audio en curso para un chat específico
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const checkAudioProcessingStatus = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      // 1. Primero, encontrar el mensaje más reciente del usuario relacionado con audio
      const lastAudioUploadQuery = `
        SELECT id, timestamp 
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'user'
        AND (
          message LIKE '%Subió archivo de audio%' 
          OR message LIKE '%archivo de audio%'
        )
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const lastUploadResult = await client.query(lastAudioUploadQuery, [chatId]);
      
      // Si no hay ningún intento de subida, no hay nada que procesar
      if (lastUploadResult.rows.length === 0) {
        return res.status(200).json({
          success: false,
          processing: false,
          error: "No se encontró ningún intento de subida de audio"
        });
      }
      
      const lastUploadTimestamp = lastUploadResult.rows[0].timestamp;
      
      // 2. Buscar mensaje de confirmación después del último intento
      const successQuery = `
        SELECT COUNT(*) as count
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'assistant'
        AND message LIKE '%¡BRUTAL! He devorado ese audio como capibara hambriento%'
        AND timestamp > $2
        LIMIT 1
      `;
      
      // 3. Buscar mensaje de error después del último intento
      const errorQuery = `
        SELECT COUNT(*) as count
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'assistant'
        AND (
          message LIKE '%¡Auch! Mi sistema de procesamiento de audio%' 
          OR message LIKE '%El procesamiento del audio fue cancelado%' 
          OR message LIKE '%Lo siento%' 
          OR message LIKE '%no válido%'
          OR message LIKE '%problema%'
        )
        AND timestamp > $2
        LIMIT 1
      `;
      
      const [successResult, errorResult] = await Promise.all([
        client.query(successQuery, [chatId, lastUploadTimestamp]),
        client.query(errorQuery, [chatId, lastUploadTimestamp])
      ]);
      
      const isSuccess = parseInt(successResult.rows[0].count) > 0;
      const hasError = parseInt(errorResult.rows[0].count) > 0;
      
      // Si hay mensaje de error después del último intento, notificar al frontend
      if (hasError) {
        return res.status(200).json({
          success: false,
          processing: false,
          error: "Se detectó un mensaje de error para el intento actual"
        });
      }
      
      // Si hay mensaje de éxito después del último intento, notificar proceso completado
      if (isSuccess) {
        return res.status(200).json({
          success: true,
          processing: false
        });
      }
      
      // Si no hay ni éxito ni error después del último intento, sigue en procesamiento
      return res.status(200).json({
        success: true,
        processing: true
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error verificando estado de procesamiento de audio:", error);
    
    // En caso de error en la consulta, indicar que no está procesando para liberar UI
    return res.status(500).json({
      success: false,
      error: error.message,
      processing: false
    });
  }
};

/**
 * Obtiene los datos del video transcripto en un chat
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getVideoData = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const metadataQuery = `
        SELECT metadata
        FROM agentetube 
        WHERE id_chat = $1 
        AND metadata->>'source' = 'youtube'
        ORDER BY metadata->>'chunkIndex' ASC
        LIMIT 1
      `;
      
      const metadataResult = await client.query(metadataQuery, [chatId]);
      
      if (metadataResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No se encontró video transcrito en este chat"
        });
      }
      
      const metadata = metadataResult.rows[0].metadata;
      const videoId = metadata.videoId;
      
      if (!videoId) {
        logSecurityEvent('INVALID_VIDEO_METADATA', 'Video sin ID válido en metadatos', {
          chatId: chatId,
          metadata: JSON.stringify(metadata),
          ip: req.ip
        }, 'medium');
        
        return res.status(400).json({
          success: false,
          error: "No se encontró ID de video válido"
        });
      }
      
      const transcriptionsQuery = `
        SELECT content, special_elements
        FROM agentetube 
        WHERE id_chat = $1 
        AND metadata->>'source' = 'youtube'
        ORDER BY metadata->>'chunkIndex' ASC
      `;
      
      const transcriptionsResult = await client.query(transcriptionsQuery, [chatId]);
      
      const transcriptions = transcriptionsResult.rows.map(row => {
        const content = row.content;
        const special_elements = row.special_elements;
        
        let timestamps = [];
        if (special_elements && typeof special_elements === 'object') {
          if (Array.isArray(special_elements.timestamps)) {
            timestamps = special_elements.timestamps;
          }
        }
        
        return { content, timestamps };
      });
      
      return res.status(200).json({
        success: true,
        video: {
          metadata,
          transcriptions
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logSecurityEvent('VIDEO_DATA_ERROR', 'Error obteniendo datos del video', {
      chatId: chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error("Error obteniendo datos del video:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene los datos del audio transcripto en un chat
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getAudioData = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const metadataQuery = `
        SELECT metadata
        FROM agentetube 
        WHERE id_chat = $1 
        AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
        AND metadata->>'source' != 'youtube'
        ORDER BY metadata->>'chunkIndex' ASC
        LIMIT 1
      `;
      
      const metadataResult = await client.query(metadataQuery, [chatId]);
      
      if (metadataResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No se encontró audio transcrito en este chat"
        });
      }
      
      const metadata = metadataResult.rows[0].metadata;
      const audioId = metadata.audioId;
      
      const transcriptionsQuery = `
        SELECT content, special_elements
        FROM agentetube 
        WHERE id_chat = $1 
        AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
        AND metadata->>'source' != 'youtube'
        ORDER BY metadata->>'chunkIndex' ASC
      `;
      
      const transcriptionsResult = await client.query(transcriptionsQuery, [chatId]);
      
      const transcriptions = transcriptionsResult.rows.map(row => {
        const content = row.content;
        const special_elements = row.special_elements;
        
        let timestamps = [];
        if (special_elements && typeof special_elements === 'object') {
          if (Array.isArray(special_elements.timestamps)) {
            timestamps = special_elements.timestamps;
          }
        }
        
        return { content, timestamps };
      });
      
      return res.status(200).json({
        success: true,
        audio: {
          metadata,
          transcriptions
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error obteniendo datos del audio:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene solo las marcas de tiempo específicas
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getVideoTimestamps = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT special_elements
        FROM agentetube 
        WHERE id_chat = $1 
        AND metadata->>'source' = 'youtube'
        AND special_elements::text != '{}'::text
        ORDER BY metadata->>'chunkIndex' ASC
      `;
      
      const result = await client.query(query, [chatId]);
      
      const allTimestamps = [];
      
      result.rows.forEach(row => {
        if (row.special_elements && 
            typeof row.special_elements === 'object' && 
            Array.isArray(row.special_elements.timestamps)) {
          allTimestamps.push(...row.special_elements.timestamps);
        }
      });
      
      return res.status(200).json({
        success: true,
        timestamps: allTimestamps
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error obteniendo marcas de tiempo:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene solo las marcas de tiempo específicas de un audio
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getAudioTimestamps = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT special_elements
        FROM agentetube 
        WHERE id_chat = $1 
        AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
        AND metadata->>'source' != 'youtube'
        AND special_elements::text != '{}'::text
        ORDER BY metadata->>'chunkIndex' ASC
      `;
      
      const result = await client.query(query, [chatId]);
      
      const allTimestamps = [];
      
      result.rows.forEach(row => {
        if (row.special_elements && 
            typeof row.special_elements === 'object' && 
            Array.isArray(row.special_elements.timestamps)) {
          allTimestamps.push(...row.special_elements.timestamps);
        }
      });
      
      return res.status(200).json({
        success: true,
        timestamps: allTimestamps
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error obteniendo marcas de tiempo del audio:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene el progreso del procesamiento de YouTube para un chat específico
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getYouTubeProcessingProgress = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    logSecurityEvent('INVALID_CHAT_ID', 'Intento de verificar progreso de YouTube con chatId inválido', {
      chatId: chatId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'medium');
    
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const cancellationQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM chat_history 
    WHERE id_chat = $1 
    AND role = 'assistant'
    AND message LIKE '%procesamiento fue cancelado%'
  ) as was_cancelled
`;

const cancellationResult = await client.query(cancellationQuery, [chatId]);
const wasCancelled = cancellationResult.rows[0].was_cancelled;
      
      if (wasCancelled) {
        return res.status(200).json({
          success: true,
          processing: false,
          progress: 100,
          cancelled: true,
          stage: "Procesamiento cancelado por el usuario"
        });
      }
      
      const chunksQuery = `
        SELECT COUNT(*) as count, MAX(CAST(metadata->>'chunkIndex' AS INTEGER)) as max_chunk
        FROM agentetube 
        WHERE id_chat = $1 
        AND metadata->>'source' = 'youtube'
      `;
      
      const chunksResult = await client.query(chunksQuery, [chatId]);
      const chunkCount = parseInt(chunksResult.rows[0].count || 0);
      const maxChunkIndex = parseInt(chunksResult.rows[0].max_chunk || -1);
      
      // Si ya hay chunks, el procesamiento está avanzado
      if (chunkCount > 0) {
        // Estimar progreso basado en el número de chunks
        // Típicamente un video genera entre 10-20 chunks
        // Si tenemos metadata de totalChunks, usarla
        let progress = 0;
        let stage = "";
        
        const metadataQuery = `
          SELECT metadata
          FROM agentetube 
          WHERE id_chat = $1 
          AND metadata->>'source' = 'youtube'
          ORDER BY metadata->>'chunkIndex' ASC
          LIMIT 1
        `;
        
        const metadataResult = await client.query(metadataQuery, [chatId]);
        const totalChunks = metadataResult.rows.length > 0 ? 
                          parseInt(metadataResult.rows[0].metadata.totalChunks || 0) : 0;
        
        if (totalChunks > 0) {
          progress = Math.min(95, Math.round((chunkCount / totalChunks) * 100));
          
          if (progress < 40) {
            stage = "Transcribiendo contenido...";
          } else if (progress < 80) {
            stage = "Preparando datos para la conversación...";
          } else {
            stage = "Finalizando procesamiento...";
          }
        } else {
          // Estimación si no conocemos el total
          if (chunkCount <= 3) {
            progress = 30;
            stage = "Transcribiendo contenido...";
          } else if (chunkCount <= 8) {
            progress = 60;
            stage = "Preparando datos para la conversación...";
          } else {
            progress = 85;
            stage = "Finalizando procesamiento...";
          }
        }
        
        return res.status(200).json({
          success: true,
          processing: true,
          progress,
          stage,
          chunkCount,
          maxChunkIndex: maxChunkIndex + 1
        });
      }
      
      // Si no hay chunks pero hay un intento reciente, está en fase inicial
      const lastYouTubeUploadQuery = `
        SELECT id, timestamp 
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'user'
        AND (
          message LIKE '%youtube.com%' 
          OR message LIKE '%youtu.be%'
        )
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const lastUploadResult = await client.query(lastYouTubeUploadQuery, [chatId]);
      
      if (lastUploadResult.rows.length > 0) {
        const uploadTime = new Date(lastUploadResult.rows[0].timestamp);
        const currentTime = new Date();
        const elapsedSeconds = Math.floor((currentTime - uploadTime) / 1000);
        
        // Estimar etapa basada en tiempo transcurrido
        let progress = 0;
        let stage = "";
        
        if (elapsedSeconds < 10) {
          progress = 5;
          stage = "Iniciando procesamiento...";
        } else if (elapsedSeconds < 30) {
          progress = 15;
          stage = "Obteniendo metadatos del video...";
        } else if (elapsedSeconds < 60) {
          progress = 25;
          stage = "Descargando audio del video...";
        } else {
          progress = 30;
          stage = "Transcribiendo contenido...";
        }
        
        return res.status(200).json({
          success: true,
          processing: true,
          progress,
          stage,
          elapsedSeconds
        });
      }
      
      // Si no hay intentos ni chunks, no hay procesamiento activo
      return res.status(200).json({
        success: false,
        processing: false,
        progress: 0,
        error: "No se detectó procesamiento activo"
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    logSecurityEvent('YOUTUBE_PROGRESS_ERROR', 'Error obteniendo progreso de procesamiento de YouTube', {
      chatId: chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');
    
    console.error("Error obteniendo progreso de procesamiento:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtiene el progreso del procesamiento de audio para un chat específico
 * @param {Object} req - Solicitud HTTP con chatId
 * @param {Object} res - Respuesta HTTP
 */
export const getAudioProcessingProgress = async (req, res) => {
  const { chatId } = req.params;
  
  if (!isValidUUID(chatId)) {
    return res.status(400).json({
      success: false,
      error: "El formato de chatId es inválido (debe ser UUID)"
    });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const cancellationQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM chat_history 
    WHERE id_chat = $1 
    AND role = 'assistant'
    AND message LIKE '%procesamiento fue cancelado%'
  ) as was_cancelled
`;

const cancellationResult = await client.query(cancellationQuery, [chatId]);
const wasCancelled = cancellationResult.rows[0].was_cancelled;
      
      if (wasCancelled) {
        return res.status(200).json({
          success: true,
          processing: false,
          progress: 100,
          cancelled: true,
          stage: "Procesamiento cancelado por el usuario"
        });
      }
      
      const chunksQuery = `
        SELECT COUNT(*) as count, MAX(CAST(metadata->>'chunkIndex' AS INTEGER)) as max_chunk
        FROM agentetube 
        WHERE id_chat = $1 
        AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
        AND metadata->>'source' != 'youtube'
      `;
      
      const chunksResult = await client.query(chunksQuery, [chatId]);
      const chunkCount = parseInt(chunksResult.rows[0].count || 0);
      const maxChunkIndex = parseInt(chunksResult.rows[0].max_chunk || -1);
      
      // Si ya hay chunks, el procesamiento está avanzado
      if (chunkCount > 0) {
        // Estimar progreso basado en el número de chunks
        let progress = 0;
        let stage = "";
        
        const metadataQuery = `
          SELECT metadata
          FROM agentetube 
          WHERE id_chat = $1 
          AND (metadata->>'source' = 'audio' OR metadata->>'contentType' = 'audio')
          AND metadata->>'source' != 'youtube'
          ORDER BY metadata->>'chunkIndex' ASC
          LIMIT 1
        `;
        
        const metadataResult = await client.query(metadataQuery, [chatId]);
        const totalChunks = metadataResult.rows.length > 0 ? 
                          parseInt(metadataResult.rows[0].metadata.totalChunks || 0) : 0;
        
        if (totalChunks > 0) {
          progress = Math.min(95, Math.round((chunkCount / totalChunks) * 100));
          
          if (progress < 40) {
            stage = "Transcribiendo audio...";
          } else if (progress < 80) {
            stage = "Preparando datos para la conversación...";
          } else {
            stage = "Finalizando procesamiento...";
          }
        } else {
          // Estimación si no conocemos el total
          if (chunkCount <= 3) {
            progress = 30;
            stage = "Transcribiendo audio...";
          } else if (chunkCount <= 8) {
            progress = 60;
            stage = "Preparando datos para la conversación...";
          } else {
            progress = 85;
            stage = "Finalizando procesamiento...";
          }
        }
        
        return res.status(200).json({
          success: true,
          processing: true,
          progress,
          stage,
          chunkCount,
          maxChunkIndex: maxChunkIndex + 1
        });
      }
      
      // Si no hay chunks pero hay un intento reciente, está en fase inicial
      const lastAudioUploadQuery = `
        SELECT id, timestamp 
        FROM chat_history 
        WHERE id_chat = $1 
        AND role = 'user'
        AND (
          message LIKE '%Subió archivo de audio%' 
          OR message LIKE '%archivo de audio%'
        )
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const lastUploadResult = await client.query(lastAudioUploadQuery, [chatId]);
      
      if (lastUploadResult.rows.length > 0) {
        const uploadTime = new Date(lastUploadResult.rows[0].timestamp);
        const currentTime = new Date();
        const elapsedSeconds = Math.floor((currentTime - uploadTime) / 1000);
        
        // Estimar etapa basada en tiempo transcurrido
        let progress = 0;
        let stage = "";
        
        if (elapsedSeconds < 10) {
          progress = 5;
          stage = "Iniciando procesamiento...";
        } else if (elapsedSeconds < 30) {
          progress = 15;
          stage = "Procesando formato de audio...";
        } else if (elapsedSeconds < 60) {
          progress = 25;
          stage = "Analizando audio...";
        } else {
          progress = 30;
          stage = "Transcribiendo audio...";
        }
        
        return res.status(200).json({
          success: true,
          processing: true,
          progress,
          stage,
          elapsedSeconds
        });
      }
      
      // Si no hay intentos ni chunks, no hay procesamiento activo
      return res.status(200).json({
        success: false,
        processing: false,
        progress: 0,
        error: "No se detectó procesamiento activo"
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error obteniendo progreso de procesamiento de audio:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  checkChatHasTranscription,
  checkChatHasVideo,
  checkChatHasAudio,
  getVideoData,
  getAudioData,
  getVideoTimestamps,
  getAudioTimestamps,
  checkYouTubeProcessingStatus,
  checkAudioProcessingStatus,
  getYouTubeProcessingProgress,
  getAudioProcessingProgress
};