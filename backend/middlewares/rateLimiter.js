import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { redisService } from '../lib/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * Configuración de rate limiting con soporte para Redis
 */
export const configureLimiters = (app) => {
  const getStore = () => {
    if (redisService.isReady()) {
      return new RedisStore({
        // Adaptar a la versión actual de rate-limit-redis
        sendCommand: (...args) => redisService.client.sendCommand(args)
      });
    }
    return null; // Usar memoria si Redis no está disponible
  };
  
  // Handler personalizado para rate limits
  const createRateLimitHandler = (defaultMessage) => {
    return (req, res, next, options) => {
      // Si es una solicitud de API, devolver JSON
      if (req.path.startsWith('/api/') || 
          req.xhr || 
          req.get('accept')?.includes('application/json') ||
          req.get('Content-Type')?.includes('application/json')) {
        return res.status(options.statusCode).json(defaultMessage);
      }
      
      const errorPath = path.join(projectRoot, 'frontend', 'views', 'error', '429.html');
      if (fs.existsSync(errorPath)) {
        return res.status(options.statusCode).sendFile(errorPath);
      }
      
      res.status(options.statusCode).send(`${defaultMessage.error}. ${defaultMessage.message}`);
    };
  };
  
  // Limiter global para toda la API
  const globalLimiter = rateLimit({
    store: getStore(),
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10000, // 10000 solicitudes por ventana
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes, intenta más tarde'
    })
  });
  
  // Limiter más estricto para autenticación (prevenir fuerza bruta)
  const authLimiter = rateLimit({
    store: getStore(),
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por ventana
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiados intentos',
      message: 'Has excedido el límite de intentos de acceso, intenta más tarde'
    })
  });
  
  // Limiter para APIs de IA (prevenir abuso de recursos costosos)
  const aiLimiter = rateLimit({
    store: getStore(),
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // 20 solicitudes por minuto
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiadas solicitudes a la IA',
      message: 'Has excedido el límite de solicitudes a la IA, intenta más tarde'
    })
  });
  
  // Limiter para procesamiento de YouTube
  const youtubeLimiter = rateLimit({
    store: getStore(),
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 200, // 200 solicitudes por 5 minutos
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiadas solicitudes a YouTube',
      message: 'Has excedido el límite de procesamiento de videos de YouTube, intenta más tarde'
    })
  });
  
  // Limiter para transcripción de audio/video
  const transcriptionLimiter = rateLimit({
    store: getStore(),
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 200, // 200 solicitudes por 5 minutos
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiadas solicitudes de transcripción',
      message: 'Has excedido el límite de solicitudes de transcripción, intenta más tarde'
    })
  });

  // Limiter para procesamiento de PDF
  const PDFLimiter = rateLimit({
    store: getStore(),
    windowMs: 3 * 60 * 1000, // 3 minutos
    max: 100, // 100 solicitudes por 3 minutos
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler({
      error: 'Demasiadas solicitudes a PDF',
      message: 'Has excedido el límite de procesamiento de archivos PDF, intenta más tarde'
    })
  });
  
  app.use('/api/', globalLimiter);
  app.use('/api/usuarios/login', authLimiter);
  app.use('/api/openai', aiLimiter);
  app.use('/api/file', PDFLimiter);
  app.use('/api/chat/messages', aiLimiter);
  
  // Limites para rutas de Media/YouTube
  app.use('/api/media/process-youtube', youtubeLimiter);
  
  // Limites para Video Transcription
  app.use('/api/video-transcription', transcriptionLimiter);
  
  // Limites para Audio Transcription
  app.use('/api/audio-transcription/process-audio-file', transcriptionLimiter);
  app.use('/api/audio-transcription/process-recorded-audio', transcriptionLimiter);
  
  return app;
};