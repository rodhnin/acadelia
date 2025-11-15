// middlewares/securityMonitor.js
import { securityLogger, logSecurityEvent } from '../utils/securityLogger.js';
import { redisService } from '../lib/redis.js';

// Patrones de posibles ataques
const ATTACK_PATTERNS = {
  sqlInjection: /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  pathTraversal: /\.\.(\/|\\)/i,
  commandInjection: /;|\||`|\$\(|\$\{|\&|\#/i
};

// Umbrales para alertas - AUMENTADOS PARA DESARROLLO
const THRESHOLDS = {
  failedLogins: process.env.NODE_ENV === 'production' ? 5 : 20,          // 20 en desarrollo
  apiRequests: process.env.NODE_ENV === 'production' ? 100 : 500,        // 500 en desarrollo
  suspiciousActivities: process.env.NODE_ENV === 'production' ? 3 : 20   // 20 en desarrollo
};

// Lista de IPs que siempre estarán permitidas (localhost, etc.)
const WHITELIST_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '::ffff:127.0.0.1'
];

/**
 * Middleware para monitoreo de seguridad
 */
export const securityMonitor = async (req, res, next) => {
  try {
    req.id = req.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    const clientIp = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id_user || 'anonymous';
    const method = req.method;
    const path = req.path;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // BYPASS: Si la IP está en la lista blanca o estamos en modo desarrollo con bypass
    if (WHITELIST_IPS.includes(clientIp) || 
        process.env.NODE_ENV || 
        process.env.SECURITY_BYPASS === 'true') {
      return next();
    }
    
    await trackRequest(clientIp, userId, method, path);
    
    const threats = analyzeRequest(req);
    
    // Si hay amenazas, registrarlas y posiblemente bloquear
    if (threats.length > 0) {
      logSecurityEvent('THREAT_DETECTED', 'Amenaza potencial detectada', {
        ip: clientIp,
        userId,
        method,
        path,
        threats
      });
      
      await redisService.set(`security:suspicious:${clientIp}`, 
        (parseInt(await redisService.get(`security:suspicious:${clientIp}`) || '0') + 1), 
        3600
      );
      
      // Si hay amenazas graves, bloquear la solicitud (SOLO EN PRODUCCIÓN)
      const severeThreats = threats.filter(t => t.severity === 'high');
      if (process.env.NODE_ENV === 'production' && severeThreats.length > 0) {
        return res.status(403).json({
          error: 'Solicitud bloqueada por motivos de seguridad'
        });
      }
    }
    
    const isBlacklisted = await checkBlacklist(clientIp);
    if (isBlacklisted) {
      logSecurityEvent('BLOCKED_IP', 'Solicitud de IP bloqueada', { ip: clientIp });
      
      // NUEVO: Incluso en lista negra, permitir ruta de escape para desbloquear
      if (path === '/api/security/emergency-unblock' || path.includes('unblock')) {
        return next();
      }
      
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Tu IP ha sido bloqueada temporalmente. Contacta al administrador o espera 1 hora.',
        // Información útil para desbloqueo (solo en desarrollo)
        unblockInfo: process.env.NODE_ENV !== 'production' ? {
          ip: clientIp,
          redisKey: `security:blacklist:${clientIp}`
        } : undefined
      });
    }
    
    const suspiciousCount = parseInt(await redisService.get(`security:suspicious:${clientIp}`) || '0');
    if (suspiciousCount >= THRESHOLDS.suspiciousActivities) {
      logSecurityEvent('SUSPICIOUS_ACTIVITY', 'Umbral de actividades sospechosas excedido', {
        ip: clientIp,
        count: suspiciousCount
      });
      
      if (process.env.NODE_ENV === 'production') {
        await redisService.set(`security:blacklist:${clientIp}`, 'blocked', 3600); // 1 hora
        
        return res.status(403).json({
          error: 'Acceso denegado temporalmente'
        });
      }
    }
    
    req.securityStartTime = Date.now();
    
    // Capturar finalización de la respuesta
    res.on('finish', () => {
      const duration = Date.now() - req.securityStartTime;
      
      if (duration > 5000) {
        logSecurityEvent('SLOW_RESPONSE', 'Respuesta lenta detectada', {
          ip: clientIp,
          userId,
          method,
          path,
          duration,
          statusCode: res.statusCode
        });
      }
      
      if (res.statusCode >= 400) {
        const eventType = res.statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
        
        logSecurityEvent(eventType, `Error HTTP ${res.statusCode}`, {
          ip: clientIp,
          userId,
          method,
          path,
          statusCode: res.statusCode
        });
      }
    });
    
    next();
  } catch (error) {
    // En caso de error en el middleware, permitir que la solicitud continúe
    console.error('Error en middleware de seguridad:', error);
    next();
  }
};

/**
 * Analiza la solicitud en busca de patrones maliciosos
 * @private
 */
function analyzeRequest(req) {
  const threats = [];
  
  const url = req.originalUrl || req.url;
  for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
    if (pattern.test(url)) {
      threats.push({
        type: `${type}_url`,
        value: url,
        severity: 'high'
      });
    }
  }
  
  if (req.query) {
    for (const [param, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
          if (pattern.test(value)) {
            threats.push({
              type: `${type}_query`,
              param,
              severity: 'high'
            });
          }
        }
      }
    }
  }
  
  if (req.body && typeof req.body === 'object') {
    analyzeObject(req.body, threats);
  }
  
  for (const [header, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
        if (pattern.test(value)) {
          threats.push({
            type: `${type}_header`,
            header,
            severity: 'medium'
          });
        }
      }
    }
  }
  
  return threats;
}

/**
 * Analiza recursivamente un objeto en busca de patrones maliciosos
 * @private
 */
function analyzeObject(obj, threats, path = '') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
        if (pattern.test(value)) {
          threats.push({
            type: `${type}_body`,
            path: currentPath,
            severity: 'high'
          });
        }
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      analyzeObject(value, threats, currentPath);
    }
  }
}

/**
 * Registra una solicitud para análisis de patrones
 * @private
 */
async function trackRequest(ip, userId, method, path) {
  try {
    const key = `security:requests:${ip}`;
    const data = JSON.stringify({
      userId,
      method,
      path,
      timestamp: Date.now()
    });
    
    if (redisService.client && redisService.isConnected) {
      await redisService.client.lpush(key, data);
      
      // Mantener solo las últimas 100 solicitudes - CORREGIDO: ltrim en minúsculas
      await redisService.client.ltrim(key, 0, 99);
      
      await redisService.client.expire(key, 86400);
    } else {
      console.log('Redis no disponible para registrar solicitud');
    }
    
    const minuteKey = `security:rate:${ip}:${Math.floor(Date.now() / 60000)}`;
    await redisService.set(minuteKey, 
      (parseInt(await redisService.get(minuteKey) || '0') + 1), 
      120); // 2 minutos
    
    const requestCount = parseInt(await redisService.get(minuteKey) || '0');
    if (requestCount > THRESHOLDS.apiRequests) {
      logSecurityEvent('RATE_LIMIT', 'Umbral de solicitudes excedido', {
        ip,
        userId,
        count: requestCount
      });
    }
  } catch (error) {
    console.error('Error al registrar solicitud:', error);
  }
}

/**
 * Verifica si una IP está en lista negra
 * @private
 */
async function checkBlacklist(ip) {
  try {
    const result = await redisService.get(`security:blacklist:${ip}`);
    return !!result;
  } catch (error) {
    console.error('Error al verificar lista negra:', error);
    return false;
  }
}

/**
 * Middleware para registrar intentos de login fallidos
 */
export const trackFailedLogins = async (req, res, next) => {
  // BYPASS: En desarrollo, no rastrear intentos fallidos
  if (process.env.NODE_ENV || 
      process.env.SECURITY_BYPASS === 'true') {
    return next();
  }
  
  const originalSend = res.send;
  
  // Sobrescribir método para capturar respuesta
  res.send = function(data) {
    res.send = originalSend;
    
    // Si es un error de autenticación
    if (res.statusCode === 401) {
      const clientIp = req.ip || req.connection.remoteAddress;
      // BYPASS: No bloquear IPs en lista blanca
      if (WHITELIST_IPS.includes(clientIp)) {
        return originalSend.call(this, data);
      }
      
      const loginAttempt = req.body.correo || 'unknown';
      
      trackFailedLoginAttempt(clientIp, loginAttempt)
        .catch(error => console.error('Error al registrar intento fallido:', error));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Registra un intento de login fallido
 * @private
 */
async function trackFailedLoginAttempt(ip, loginAttempt) {
  try {
    // Clave para identificar intentos por IP
    const key = `security:failed-login:${ip}`;
    
    if (redisService.client && redisService.isConnected) {
      await redisService.client.lpush(key, Date.now().toString());
      
      // Mantener solo los últimos 10 intentos - CORREGIDO: ltrim en minúsculas
      await redisService.client.ltrim(key, 0, 9);
      
      await redisService.client.expire(key, 3600);
      
      const attempts = await redisService.client.llen(key);
      
      // Si supera el umbral, bloquear IP temporalmente
      if (attempts >= THRESHOLDS.failedLogins) {
        await redisService.set(`security:blacklist:${ip}`, 'blocked', 1800);
        
        logSecurityEvent('BRUTE_FORCE', 'Posible ataque de fuerza bruta detectado', {
          ip,
          attempts,
          loginAttempt: maskEmail(loginAttempt)
        });
      }
    } else {
      console.log('Redis no disponible para registrar intento fallido');
    }
  } catch (error) {
    console.error('Error al registrar intento fallido:', error);
  }
}

/**
 * Enmascara un email para logging seguro
 * @private
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'invalid_email';
  }
  
  try {
    const [username, domain] = email.split('@');
    if (!username || !domain) return 'invalid_email_format';
    
    const maskedUsername = username.charAt(0) + '*'.repeat(Math.min(username.length - 1, 5));
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].charAt(0) + '*'.repeat(Math.min(domainParts[0].length - 1, 3));
    
    return `${maskedUsername}@${maskedDomain}.${domainParts[1]}`;
  } catch (error) {
    return 'error_masking_email';
  }
}

export default {
  securityMonitor,
  trackFailedLogins
};