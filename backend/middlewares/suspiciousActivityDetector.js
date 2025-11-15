// middlewares/suspiciousActivityDetector.js
import { logSecurityEvent } from '../utils/securityLogger.js';
import { redisService } from '../lib/redis.js';

// Lista de IPs que siempre estarán permitidas (localhost, etc.)
const WHITELIST_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '::ffff:127.0.0.1'
];

/**
 * Detecta patrones sospechosos de actividad
 */
export const detectSuspiciousActivity = async (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const userId = req.user?.id_user || 'anonymous';
  
  // BYPASS rápido para desarrollo o IPs en lista blanca
  if (process.env.NODE_ENV === 'development' || 
      process.env.SECURITY_BYPASS === 'true' ||
      WHITELIST_IPS.includes(clientIp)) {
    return next();
  }
  
  try {
    // 1. Detectar múltiples solicitudes a endpoints sensibles
    if (isSensitiveEndpoint(req.path)) {
      const key = `security:sensitive:${clientIp}:${userId}`;
      await redisService.set(
        key, 
        (parseInt(await redisService.get(key) || '0') + 1),
        300 // 5 minutos
      );
      
      const count = parseInt(await redisService.get(key) || '0');
      
      if (count > 15) { // Más permisivo: 15 solicitudes en 5 minutos
        logSecurityEvent('SENSITIVE_ENDPOINT_ABUSE', 'Acceso excesivo a endpoints sensibles', {
          ip: clientIp,
          userId,
          endpoint: req.path,
          count
        });
      }
    }
    
    // 2. Detectar cambios de IP para el mismo usuario
    if (userId !== 'anonymous') {
      const userIpKey = `security:user-ip:${userId}`;
      const previousIp = await redisService.get(userIpKey);
      
      // Si hay IP previa y es diferente
      if (previousIp && previousIp !== clientIp) {
        logSecurityEvent('IP_CHANGE', 'Cambio de IP para el mismo usuario', {
          userId,
          previousIp,
          currentIp: clientIp
        });
      }
      
      await redisService.set(userIpKey, clientIp, 86400); // 24 horas
    }
    
    // 3. Detectar secuencias sospechosas de navegación
    // Asegúrate de que Redis esté disponible
    if (redisService.client && redisService.isConnected) {
      const navigationKey = `security:navigation:${clientIp}`;
      
      // CORREGIDO: lpush en minúsculas
      await redisService.client.lpush(navigationKey, req.path);
      
      // CORREGIDO: ltrim en minúsculas
      await redisService.client.ltrim(navigationKey, 0, 9); // Mantener últimas 10 rutas
      
      await redisService.client.expire(navigationKey, 1800); // 30 minutos
      
      // CORREGIDO: lrange en minúsculas
      const recentPaths = await redisService.client.lrange(navigationKey, 0, -1);
      
      if (isHighlySuspiciousNavigation(recentPaths)) {
        logSecurityEvent('SUSPICIOUS_NAVIGATION', 'Patrón de navegación sospechoso', {
          ip: clientIp,
          userId,
          paths: recentPaths
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error en detector de actividad sospechosa:', error);
    next(); // Continuar en caso de error
  }
};

/**
 * Determina si un endpoint es sensible
 * @private
 */
function isSensitiveEndpoint(path) {
  const sensitivePatterns = [
    /\/api\/admin\//i,
    /\/api\/security\/revoke-tokens/i,
    /\/api\/security\/block-ip/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(path));
}

/**
 * Versión más estricta - patrones de navegación REALMENTE sospechosos
 * @private
 */
function isHighlySuspiciousNavigation(paths) {
  // Patrón 1: Búsqueda de endpoints con directory traversal EXPLÍCITO
  const traversalAttempts = paths.filter(p => p.includes('../') || p.includes('/..') || p.includes('/.%2e')).length;
  if (traversalAttempts > 2) {
    return true;
  }
  
  // Patrón 2: Múltiples intentos consecutivos a endpoints restringidos de administrador
  const adminAttempts = paths.filter(p => 
    p.includes('/admin') || 
    p.includes('/config') || 
    p.includes('/internal') || 
    p.includes('/system')
  ).length;
  if (adminAttempts > 3) {
    return true;
  }
  
  // Patrón 3: Escaneo RÁPIDO de muchos endpoints diferentes (patrón de scanner)
  if (paths.length > 8 && new Set(paths).size > 7) {
    return true;
  }
  
  // No detectar patrones normales de navegación
  return false;
}

function isSuspiciousNavigation(paths) {
  // NO USAR - aquí solo para referencia
  const traversalAttempts = paths.filter(p => p.includes('../') || p.includes('/..')).length;
  if (traversalAttempts > 1) {
    return true;
  }
  
  const restrictedAttempts = paths.filter(p => p.includes('/admin') || p.includes('/config')).length;
  if (restrictedAttempts > 2) {
    return true;
  }
  
  if (paths.length > 5 && new Set(paths).size > 4) {
    return true;
  }
  
  return false;
}