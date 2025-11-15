import { isValidUUID } from '../../utils/chat/validators.js';
import { processAudioQuery } from '../../services/chat/ias/herramienta/agentService.js'
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pool from "../../lib/dbPool.js";
import { validateAudioSecurity } from '../../middlewares/audioSecurityMiddleware.js';
import { AudioSecurityService } from '../../services/chat/AudioSecurityService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { wasRequestCancelled } from '../../services/chat/chatServices.js';

const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const AUDIO_UPLOADS_DIR = path.join(UPLOADS_DIR, 'audio');
const TEMP_DIR = path.join(ROOT_DIR, 'tmp', 'audio_processing');

// Asegurar que existan los directorios necesarios
[UPLOADS_DIR, AUDIO_UPLOADS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // const uploadsDir = path.join(__dirname, '../../uploads/audio');

    // CON ESTA:
    const uploadsDir = AUDIO_UPLOADS_DIR;

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const fileFilter = (req, file, cb) => {
  const validMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
    'audio/x-wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac',
    'audio/flac', 'audio/mp4'
  ];

  if (validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado. Solo se permiten archivos de audio.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * Procesa un archivo de audio subido, extrae el audio, transcribe y almacena para interacción
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
export const processAudioFile = (req, res) => {
  const processingStart = Date.now();
  let audioFilePath = null;

  const uploadWithSecurity = (req, res, next) => {
    upload.single('audioFile')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        logSecurityEvent('AUDIO_UPLOAD_ERROR', 'Error en la carga del archivo de audio', {
          userId: req.body.userId,
          error: err.message,
          errorType: 'MulterError',
          ip: req.ip
        }, 'medium');

        return res.status(400).json({
          success: false,
          error: `Error en la carga del archivo: ${err.message}`
        });
      } else if (err) {
        logSecurityEvent('AUDIO_UPLOAD_ERROR', 'Error en la carga del archivo de audio', {
          userId: req.body.userId,
          error: err.message,
          ip: req.ip
        }, 'medium');

        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No se ha proporcionado ningún archivo de audio"
        });
      }

      audioFilePath = req.file.path;

      try {
        // en lugar de llamar al middleware como un paso separado

        // 1. Verificación de firma de audio
        try {
          // Leer solo los primeros 4KB para verificar la firma
          const fd = fs.openSync(audioFilePath, 'r');
          const buffer = Buffer.alloc(4096);
          fs.readSync(fd, buffer, 0, 4096, 0);
          fs.closeSync(fd);

          const audioType = AudioSecurityService.identifyAudioType(buffer);
          if (!audioType.valid) {
            logSecurityEvent('INVALID_AUDIO_SIGNATURE', 'Archivo sin firma de audio válida', {
              userId: req.body.userId,
              fileInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
              },
              reason: audioType.reason,
              ip: req.ip
            }, 'high');
            cleanupFile(audioFilePath);

            return res.status(400).json({
              success: false,
              error: "El archivo no tiene una firma de audio válida",
              details: audioType.reason
            });
          }
          console.log(`Tipo de audio identificado: ${audioType.name}`);
        } catch (error) {
          console.error("Error al leer archivo para verificación:", error);
        }

        // 2. Escaneo con ClamAV
        console.log("Realizando escaneo con ClamAV...");
        const scanResult = await AudioSecurityService.scanFile(audioFilePath);

        if (!scanResult.clean && !scanResult.skipped && scanResult.viruses && scanResult.viruses.length > 0) {
          logSecurityEvent('MALWARE_DETECTED', 'Malware detectado en archivo de audio', {
            userId: req.body.userId,
            fileInfo: {
              originalName: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype
            },
            viruses: scanResult.viruses,
            ip: req.ip
          }, 'critical');

          cleanupFile(audioFilePath);

          return res.status(400).json({
            success: false,
            error: "Se ha detectado contenido malicioso en el archivo de audio",
            processing: false, // Importante: indicar que el procesamiento ha terminado con error
            details: {
              viruses: scanResult.viruses,
              message: scanResult.message,
              errorType: "SecurityError",
              securityInfo: {
                clean: false,
                scanned: true,
                virusDetected: true
              }
            }
          });
        }

        req.securityInfo = scanResult.securityNotes || {
          scanned: true,
          clean: true,
          overridden: scanResult.overridden
        };

        next();
      } catch (securityError) {
        logSecurityEvent('AUDIO_SECURITY_ERROR', 'Error en verificación de seguridad de audio', {
          userId: req.body.userId,
          fileInfo: req.file ? {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          } : null,
          error: securityError.message,
          ip: req.ip
        }, 'high');
        cleanupFile(audioFilePath);

        console.error("Error en verificación de seguridad:", securityError);
        return res.status(400).json({
          success: false,
          error: `Error en la verificación de seguridad: ${securityError.message}`
        });
      }
    });
  };

  uploadWithSecurity(req, res, async () => {
    const { userId, chatId, herramientaId } = req.body;

    try {
      await (await import('../../services/chat/chatServices.js')).resetCancellationFlagsForNewProcess(chatId, 'audio');
      console.log(`✅ Banderas de cancelación limpiadas para nuevo procesamiento de audio en chat ${chatId}`);
    } catch (error) {
      console.warn('Error limpiando banderas de cancelación:', error);
    }

    if (!userId || !chatId) {
      cleanupFile(audioFilePath);
      return res.status(400).json({
        success: false,
        error: "Se requieren userId y chatId"
      });
    }

    if (!isValidUUID(chatId)) {
      cleanupFile(audioFilePath);
      return res.status(400).json({
        success: false,
        error: "El formato de chatId es inválido (debe ser UUID)"
      });
    }

    try {
      const client = await pool.connect();

      try {
        const securityInfo = req.securityNotes || { scanned: true, clean: true };

        const fileInfo = {
          path: req.file.path,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          initialResponse: false,
          securityInfo
        };

        const result = await processAudioQuery({
          userId: parseInt(userId),
          fileInfo,
          avaId: null,
          herramientaId: parseInt(herramientaId) || 2,
          chatId,
          client
        });

        return res.status(200).json({
          ...result,
          securityInfo: {
            scanned: true,
            details: securityInfo
          },
          processingTime: Date.now() - processingStart
        });

      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error procesando archivo de audio:", error);

      cleanupFile(audioFilePath);

      const errorResponse = {
        success: false,
        error: error.message || "Error desconocido",
        processing: false,
        details: {
          ...(error.details || {}),
          errorType: error.name || "ProcessingError",
          ...(error.viruses ? { viruses: error.viruses } : {}),
          ...(error.securityInfo ? { securityInfo: error.securityInfo } : {})
        },
        processingTime: Date.now() - processingStart
      };

      res.status(500).json(errorResponse);
    }
  });
};

/**
 * Procesa audio de una grabación, transcribe y almacena para interacción
 * @param {Object} req - Solicitud HTTP
 * @param {Object} res - Respuesta HTTP
 */
export const processRecordedAudio = async (req, res) => {
  const processingStart = Date.now();
  let audioFilePath = null;
  let rawAudioData = null;

  try {
    const { userId, chatId, audioData, herramientaId } = req.body;

    if (!userId || !chatId || !audioData) {
      return res.status(400).json({
        success: false,
        error: "Se requieren userId, chatId y datos de audio",
        processing: false
      });
    }

    if (!isValidUUID(chatId)) {
      return res.status(400).json({
        success: false,
        error: "El formato de chatId es inválido (debe ser UUID)",
        processing: false
      });
    }

    if (!audioData.startsWith('data:audio/')) {
      return res.status(400).json({
        success: false,
        error: "El formato de los datos de audio no es válido",
        processing: false
      });
    }

    const securityReq = {
      body: { audioData },
      file: null
    };

    let securityInfo = null;
    try {
      await new Promise((resolve, reject) => {
        validateAudioSecurity(securityReq, {
          status: (code) => ({
            json: (data) => {
              if (code !== 200) {
                const error = new Error(data.error || "Error en validación de seguridad");
                error.details = data.details || {};
                error.status = code;
                error.processing = false;
                return reject(error);
              }
              resolve();
              return null;
            }
          })
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      securityInfo = securityReq.securityNotes || { scanned: true, clean: true };
    } catch (securityError) {
      logSecurityEvent('RECORDED_AUDIO_SECURITY_ERROR', 'Error en validación de seguridad de audio grabado', {
        userId: req.body.userId,
        chatId: req.body.chatId,
        error: securityError.message,
        ip: req.ip
      }, 'high');

      return res.status(securityError.status || 400).json({
        success: false,
        error: `Error en la validación de seguridad: ${securityError.message}`,
        processing: false,
        details: securityError.details || {}
      });
    }

    const mimeMatch = audioData.match(/^data:(audio\/[^;]+)/);
    let mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
    console.log('Tipo MIME detectado:', mimeType);

    const codecMatch = audioData.match(/^data:audio\/[^;]+;codecs=([^;,]+)/);
    if (codecMatch) {
      console.log('Codec detectado:', codecMatch[1]);
    }

    const base64Data = audioData.replace(/^data:audio\/[^;]+;?(?:codecs=[^;,]+)?;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    rawAudioData = audioData;

    let extension = '.wav';

    if (mimeType === 'audio/mp3' || mimeType === 'audio/mpeg') {
      extension = '.mp3';
    } else if (mimeType === 'audio/wav') {
      extension = '.wav';
    } else if (mimeType === 'audio/ogg') {
      extension = '.ogg';
    } else if (mimeType === 'audio/webm') {
      extension = '.webm';
    } else if (mimeType.includes('mp4')) {
      extension = '.wav';
    }

    console.log(`Usando extensión: ${extension} para MIME type: ${mimeType}`);

    const uploadsDir = AUDIO_UPLOADS_DIR;
    const audioFilename = `${Date.now()}_${uuidv4()}${extension}`;
    audioFilePath = path.join(uploadsDir, audioFilename);

    fs.writeFileSync(audioFilePath, audioBuffer);

    const client = await pool.connect();

    try {
      const fileInfo = {
        path: audioFilePath,
        fileName: "Audio grabado",
        fileType: mimeType,
        fileSize: audioBuffer.length,
        source: 'recording',
        initialResponse: false,
        rawAudioData: rawAudioData,
        securityInfo
      };

      const result = await processAudioQuery({
        userId: parseInt(userId),
        fileInfo,
        avaId: null,
        herramientaId: parseInt(herramientaId) || 2,
        chatId,
        client
      });

      return res.status(200).json({
        ...result,
        securityInfo: {
          scanned: true,
          details: securityInfo
        },
        processingTime: Date.now() - processingStart
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Error procesando audio grabado:", error);

    logSecurityEvent('AUDIO_PROCESSING_ERROR', 'Error procesando audio grabado', {
      userId: req.body.userId,
      chatId: req.body.chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');

    // En caso de error, intentamos limpiar el archivo temporal
    cleanupFile(audioFilePath);

    const errorResponse = {
      success: false,
      error: error.message || "Error desconocido",
      processing: false,
      details: {
        ...(error.details || {}),
        errorType: error.name || "ProcessingError",
        ...(error.viruses ? { viruses: error.viruses } : {}),
        ...(error.securityInfo ? { securityInfo: error.securityInfo } : {})
      },
      processingTime: Date.now() - processingStart
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Función auxiliar para limpiar un archivo si existe
 * @param {string} filePath - Ruta del archivo a eliminar
 */
function cleanupFile(filePath) {
  if (!filePath) return;

  try {
    // Asegurar que existe el archivo antes de intentar eliminar
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo eliminado en manejo de errores: ${filePath}`);
    }
  } catch (cleanupError) {
    console.error(`Error eliminando archivo ${filePath}:`, cleanupError);
  }
}

/**
 * Detecta si un archivo es un archivo de audio válido
 * @param {string} filename - Nombre del archivo a analizar
 * @returns {boolean} - True si es un archivo de audio
 */
export const isAudioFile = (filename) => {
  if (!filename) return false;

  const extension = path.extname(filename).toLowerCase();
  const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm', '.mp4'];

  return validExtensions.includes(extension);
};

export default {
  processAudioFile,
  processRecordedAudio,
  isAudioFile
};