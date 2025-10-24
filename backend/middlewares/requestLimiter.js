// backend/middlewares/requestLimiter.js
import { acquireSemaphore, completeSemaphore, failSemaphore } from '../lib/throttleService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Obtener la ruta base del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * Middleware para limitar peticiones concurrentes
 * @param {string} type - Tipo de operación (openai, pdf, audio, youtube)
 * @param {Object} options - Opciones adicionales
 * @returns {Function} - Middleware de Express
 */
export function limitRequests(type, options = {}) {
  const defaults = {
    waitIfFull: true,          // Esperar en cola o rechazar inmediatamente
    maxWaitTime: 30000,        // Tiempo máximo de espera (30 segundos)
    rejectStatusCode: 429      // Código HTTP para rechazos
  };
  
  const config = { ...defaults, ...options };
  
  return async (req, res, next) => {
    // Extraer metadatos básicos para el seguimiento
    const metadata = {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous'
    };
    
    try {
      // Intentar adquirir un semáforo (esperar si está lleno)
      const jobId = await acquireSemaphore(
        type, 
        metadata, 
        config.waitIfFull, 
        config.maxWaitTime
      );
      
      // Si no se pudo adquirir, rechazar la petición
      if (!jobId) {
        // Si es solicitud de API, devolver JSON
        if (req.path.startsWith('/api/') || req.xhr || req.get('accept')?.includes('application/json')) {
          return res.status(config.rejectStatusCode).json({
            success: false,
            error: 'Demasiadas solicitudes en proceso. Inténtalo de nuevo más tarde.'
          });
        }
        
        // Para navegación web, mostrar página 429
        const errorPath = path.join(projectRoot, 'frontend', 'views', 'error', '429.html');
        if (fs.existsSync(errorPath)) {
          return res.status(config.rejectStatusCode).sendFile(errorPath);
        }
        
        // Fallback
        return res.status(config.rejectStatusCode).send('Demasiadas solicitudes en proceso. Inténtalo de nuevo más tarde.');
      }
      
      // Guardar jobId en la petición para uso posterior
      req.throttleJobId = jobId;
      
      // Interceptar métodos de respuesta para detectar finalización
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;
      
      // Función para marcar trabajo como completado
      const markComplete = () => {
        if (req.throttleJobId) {
          const result = {
            statusCode: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300
          };
          
          if (result.success) {
            completeSemaphore(req.throttleJobId, result);
          } else {
            failSemaphore(req.throttleJobId, `Error HTTP ${res.statusCode}`);
          }
          
          // Limpiar para evitar duplicados
          req.throttleJobId = null;
        }
      };
      
      // Sobreescribir métodos para detectar finalización
      res.send = function(body) {
        markComplete();
        return originalSend.call(this, body);
      };
      
      res.json = function(body) {
        markComplete();
        return originalJson.call(this, body);
      };
      
      res.end = function(...args) {
        markComplete();
        return originalEnd.apply(this, args);
      };
      
      // Manejar errores para marcar trabajos como fallidos
      const originalNext = next;
      const errorHandlingNext = (err) => {
        if (err && req.throttleJobId) {
          failSemaphore(req.throttleJobId, err);
          req.throttleJobId = null;
        }
        return originalNext(err);
      };
      
      // Continuar con el próximo middleware
      errorHandlingNext();
    } catch (error) {
      // Si hubo un error al adquirir semáforo (ej: timeout de espera)
      console.error(`Error al adquirir semáforo para ${type}:`, error);
      return res.status(503).json({
        success: false,
        error: error.message || 'Servicio temporalmente no disponible'
      });
    }
  };
}