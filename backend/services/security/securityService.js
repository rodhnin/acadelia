// services/security/securityService.js
import pool from '../../lib/dbPool.js';
import { redisService } from '../../lib/redis.js';
import { AuthService } from '../usuarios/authService.js';
import crypto from 'crypto';


class SecurityService {
  /**
   * Registra un evento de seguridad en la base de datos
   * @param {string} eventType - Tipo de evento
   * @param {string} message - Mensaje descriptivo
   * @param {Object} data - Datos adicionales
   * @param {string} severity - Nivel de severidad
   * @param {string} userId - ID del usuario relacionado (si aplica)
   * @param {string} ip - Dirección IP relacionada (si aplica)
   */
  async registerSecurityEvent(eventType, message, data = {}, severity = 'info', userId = null, ip = null) {
    try {
      const query = `
        INSERT INTO security_events (
          event_type, 
          message,
          data,
          severity,
          user_id,
          ip_address,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `;
      
      // Asegurar que data sea un string JSON válido
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      const values = [
        eventType,
        message,
        jsonData,
        severity,
        userId,
        ip
      ];
      
      console.log('📝 Guardando evento de seguridad en BD:', {
        type: eventType,
        message: message.substring(0, 30) + (message.length > 30 ? '...' : '')
      });
      
      const result = await pool.query(query, values);
      const eventId = result.rows[0]?.id;
      
      if (eventId) {
        console.log(`✅ Evento guardado con ID: ${eventId}`);
      } else {
        console.warn('⚠️ Evento guardado pero sin ID retornado');
      }
      
      if (severity === 'high' || severity === 'critical') {
        await this.notifyRealtime(eventType, message, data, severity, userId);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error registrando evento de seguridad en BD:', error);
      console.error('Datos que se intentaron guardar:', {
        eventType, message, data: typeof data, severity, userId, ip
      });
      return false;
    }
  }
  
  /**
   * Notifica eventos de seguridad en tiempo real
   * @private
   */
  async notifyRealtime(eventType, message, data, severity, userId) {
    try {
      const notification = {
        eventType,
        message,
        data,
        severity,
        timestamp: new Date().toISOString()
      };
      
      if (redisService.client && redisService.isConnected) {
        // Canal general de seguridad
        await redisService.client.publish(
          'security:notifications',
          JSON.stringify(notification)
        );
        
        // Si afecta a un usuario específico, también enviar a su canal
        if (userId) {
          await redisService.client.publish(
            `security:user:${userId}`,
            JSON.stringify(notification)
          );
        }
      }
    } catch (error) {
      console.error('Error notificando evento en tiempo real:', error);
    }
  }
  
  /**
   * Obtiene eventos de seguridad para mostrar en el frontend
   * @param {Object} filters - Filtros a aplicar
   * @param {number} page - Número de página
   * @param {number} limit - Límite de registros por página
   */
  async getSecurityEvents(filters = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      const values = [];
      let paramCount = 1;
      
      if (Object.keys(filters).length > 0) {
        const conditions = [];
        
        // Filtro por tipo de evento
        if (filters.eventType) {
          conditions.push(`event_type = $${paramCount++}`);
          values.push(filters.eventType);
        }
        
        // Filtro por severidad
        if (filters.severity) {
          conditions.push(`severity = $${paramCount++}`);
          values.push(filters.severity);
        }
        
        // Filtro por usuario
        if (filters.userId) {
          conditions.push(`user_id = $${paramCount++}`);
          values.push(filters.userId);
        }
        
        // Filtro por IP
        if (filters.ip) {
          conditions.push(`ip_address = $${paramCount++}`);
          values.push(filters.ip);
        }
        
        // Filtro por fecha inicial
        if (filters.startDate) {
          conditions.push(`created_at >= $${paramCount++}`);
          values.push(filters.startDate);
        }
        
        // Filtro por fecha final
        if (filters.endDate) {
          conditions.push(`created_at <= $${paramCount++}`);
          values.push(filters.endDate);
        }
        
        if (conditions.length > 0) {
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      // Consultar eventos
      const query = `
        SELECT 
          id,
          event_type as "eventType",
          message,
          data,
          severity,
          user_id as "userId",
          ip_address as "ipAddress",
          created_at as "timestamp"
        FROM security_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      
      values.push(limit, offset);
      
      const { rows } = await pool.query(query, values);
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM security_events
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        events: rows,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error obteniendo eventos de seguridad:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene resumen de métricas de seguridad
   */
  async getSecurityMetrics() {
    try {
      // Métricas de base de datos
      const dbQuery = `
        SELECT
          (SELECT COUNT(*) FROM security_events WHERE created_at >= NOW() - INTERVAL '24 hours') as events_24h,
          (SELECT COUNT(*) FROM security_events WHERE severity = 'high' AND created_at >= NOW() - INTERVAL '24 hours') as high_severity_24h,
          (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at >= NOW() - INTERVAL '24 hours') as critical_24h,
          (SELECT COUNT(DISTINCT ip_address) FROM security_events WHERE event_type = 'BLOCKED_IP' AND created_at >= NOW() - INTERVAL '24 hours') as blocked_ips_24h
      `;
      
      const { rows: dbMetrics } = await pool.query(dbQuery);
      
      // Métricas de Redis (intentos de login fallidos, solicitudes bloqueadas, etc.)
      let blockedIPs = [];
      let failedLogins = [];
      
      if (redisService.client && redisService.isConnected) {
        blockedIPs = await redisService.client.keys('security:blacklist:*');
        failedLogins = await redisService.client.keys('security:failed-login:*');
      }
      
      return {
        events24h: parseInt(dbMetrics[0].events_24h) || 0,
        highSeverity24h: parseInt(dbMetrics[0].high_severity_24h) || 0,
        critical24h: parseInt(dbMetrics[0].critical_24h) || 0,
        blockedIPs: blockedIPs.length,
        failedLogins: failedLogins.length,
        activeBlacklist: blockedIPs.length
      };
    } catch (error) {
      console.error('Error obteniendo métricas de seguridad:', error);
      throw error;
    }
  }
  
  /**
   * Revoca tokens de un usuario por razones de seguridad
   * @param {string} userId - ID del usuario
   * @param {string} reason - Razón de la revocación
   */
  async revokeUserTokens(userId, reason) {
    try {
      await this.registerSecurityEvent(
        'TOKEN_REVOCATION',
        `Tokens revocados por razones de seguridad: ${reason}`,
        { userId, reason },
        'high',
        userId
      );
      
      // Revocar todos los tokens del usuario usando AuthService existente
      const revocationResult = await AuthService.revokeAllTokens(userId);
      
      return {
        success: true,
        tokensRevoked: revocationResult.tokensRevoked || 0,
        userId
      };
    } catch (error) {
      console.error('Error revocando tokens:', error);
      throw error;
    }
  }
  
  /**
   * Bloquea una IP por razones de seguridad
   * @param {string} ip - Dirección IP
   * @param {string} reason - Razón del bloqueo
   * @param {number} duration - Duración en segundos (default: 1 hora)
   */
  async blockIP(ip, reason, duration = 3600) {
    try {
      await redisService.set(`security:blacklist:${ip}`, 'blocked', duration);
      
      await this.registerSecurityEvent(
        'MANUAL_IP_BLOCK',
        `IP bloqueada manualmente: ${reason}`,
        { ip, reason, duration },
        'medium',
        null,
        ip
      );
      
      return { success: true, ip, duration };
    } catch (error) {
      console.error('Error bloqueando IP:', error);
      throw error;
    }
  }
  
  /**
   * Desbloquea una IP
   * @param {string} ip - Dirección IP
   */
  async unblockIP(ip) {
    try {
      await redisService.delete(`security:blacklist:${ip}`);
      
      await this.registerSecurityEvent(
        'MANUAL_IP_UNBLOCK',
        `IP desbloqueada manualmente`,
        { ip },
        'info',
        null,
        ip
      );
      
      return { success: true, ip };
    } catch (error) {
      console.error('Error desbloqueando IP:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene las IPs actualmente bloqueadas
   */
  async getBlockedIPs() {
    try {
      const blockedIPs = [];
      
      if (redisService.client && redisService.isConnected) {
        const blockedKeys = await redisService.client.keys('security:blacklist:*');
        
        for (const key of blockedKeys) {
          const ip = key.replace('security:blacklist:', '');
          const ttl = await redisService.client.ttl(key);
          
          blockedIPs.push({
            ip,
            ttl,
            expiresIn: ttl > 0 ? `${Math.floor(ttl / 60)} minutos` : 'Permanente'
          });
        }
      }
      
      return blockedIPs;
    } catch (error) {
      console.error('Error obteniendo IPs bloqueadas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene intentos de login fallidos recientes
   */
  async getFailedLoginAttempts() {
    try {
      const failedAttempts = [];
      
      if (redisService.client && redisService.isConnected) {
        const failedKeys = await redisService.client.keys('security:failed-login:*');
        
        for (const key of failedKeys) {
          const ip = key.replace('security:failed-login:', '');
          // CORREGIDO: llen en minúsculas
          const attempts = await redisService.client.llen(key);
          
          if (attempts > 0) {
            // CORREGIDO: lrange en minúsculas
            const timestamps = await redisService.client.lrange(key, 0, -1);
            
            failedAttempts.push({
              ip,
              attempts,
              lastAttempt: new Date(parseInt(timestamps[0])).toISOString()
            });
          }
        }
      }
      
      return failedAttempts;
    } catch (error) {
      console.error('Error obteniendo intentos fallidos:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene actividad sospechosa reciente
   */
  async getSuspiciousActivity() {
    try {
      const query = `
        SELECT 
          id,
          event_type as "eventType",
          message,
          data,
          severity,
          user_id as "userId",
          ip_address as "ipAddress",
          created_at as "timestamp"
        FROM security_events
        WHERE event_type IN ('SUSPICIOUS_ACTIVITY', 'SUSPICIOUS_NAVIGATION', 'SENSITIVE_ENDPOINT_ABUSE', 'IP_CHANGE', 'BRUTE_FORCE')
        AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const { rows } = await pool.query(query);
      
      const redisActivity = [];
      
      if (redisService.client && redisService.isConnected) {
        const suspiciousIPs = await redisService.client.keys('security:suspicious:*');
        
        for (const key of suspiciousIPs) {
          const ip = key.replace('security:suspicious:', '');
          const count = await redisService.get(key);
          
          if (count && parseInt(count) > 0) {
            redisActivity.push({
              ipAddress: ip,
              count: parseInt(count),
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
      
      return {
        dbEvents: rows,
        recentActivity: redisActivity
      };
    } catch (error) {
      console.error('Error obteniendo actividad sospechosa:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene información de un usuario para fines de seguridad
   * @param {string} userId - ID del usuario
   */
  async getUserSecurityInfo(userId) {
    try {
      // Información de eventos de seguridad asociados al usuario
      const eventsQuery = `
        SELECT 
          event_type as "eventType",
          COUNT(*) as count
        FROM security_events
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY event_type
      `;
      
      const { rows: eventCounts } = await pool.query(eventsQuery, [userId]);
      
      const loginAttemptsQuery = `
        SELECT 
          id,
          ip_address as "ipAddress",
          user_agent as "userAgent",
          status,
          created_at as "createdAt"
        FROM login_attempts
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const { rows: loginAttempts } = await pool.query(loginAttemptsQuery, [userId]);
      
      const userIpKey = `security:user-ip:${userId}`;
      const lastKnownIp = await redisService.get(userIpKey);
      
      return {
        userId,
        eventSummary: eventCounts,
        recentLoginAttempts: loginAttempts,
        lastKnownIp
      };
    } catch (error) {
      console.error('Error obteniendo información de seguridad del usuario:', error);
      throw error;
    }
  }

/**
 * Obtiene la configuración del sistema de seguridad
 */
async getSecurityConfig() {
  try {
    // Primero intentar obtener de Redis (para mejor rendimiento)
    const cachedConfig = await redisService.get('security:config');
    
    if (cachedConfig) {
      return cachedConfig;
    }
    
    // Si no está en caché, obtener de la base de datos
    const query = `
      SELECT config_value
      FROM system_config
      WHERE config_key = 'security_config'
    `;
    
    const { rows } = await pool.query(query);
    
    // Si no hay configuración, devolver configuración por defecto
    if (rows.length === 0) {
      const defaultConfig = this.getDefaultSecurityConfig();
      
      await redisService.set('security:config', defaultConfig, 3600); // 1 hora
      
      return defaultConfig;
    }
    
    const config = JSON.parse(rows[0].config_value);
    
    await redisService.set('security:config', config, 3600); // 1 hora
    
    return config;
  } catch (error) {
    console.error('Error obteniendo configuración de seguridad:', error);
    
    // En caso de error, devolver configuración por defecto
    return this.getDefaultSecurityConfig();
  }
}

/**
 * Devuelve la configuración por defecto
 * @private
 */
getDefaultSecurityConfig() {
  return {
    thresholds: {
      failedLogins: process.env.NODE_ENV === 'production' ? 5 : 10,
      apiRequests: process.env.NODE_ENV === 'production' ? 100 : 500,
      suspiciousActivities: process.env.NODE_ENV === 'production' ? 3 : 10
    },
    blockDurations: {
      default: 60 * 60, // 1 hora en segundos
      bruteForce: 30 * 60, // 30 minutos en segundos
      manual: 60 * 60 // 1 hora en segundos
    },
    retention: {
      archiveEvents: 90, // días
      deleteEvents: 365, // días
      deleteLogins: 30 // días
    },
    advanced: {
      enableGeolocation: true,
      enableAutoBlock: true,
      emergencyUnblockKey: process.env.EMERGENCY_UNBLOCK_KEY || crypto.randomBytes(8).toString('hex')
    },
    whitelistIPs: [
      '127.0.0.1',
      '::1',
      'localhost'
    ]
  };
}

/**
 * Guarda la configuración del sistema de seguridad
 * @param {Object} config - Configuración a guardar
 */
async saveSecurityConfig(config) {
  try {
    const sanitizedConfig = this.sanitizeConfig(config);
    
    const query = `
      INSERT INTO system_config (config_key, config_value, updated_at)
      VALUES ('security_config', $1, NOW())
      ON CONFLICT (config_key) 
      DO UPDATE SET config_value = $1, updated_at = NOW()
    `;
    
    await pool.query(query, [JSON.stringify(sanitizedConfig)]);
    
    await redisService.set('security:config', sanitizedConfig, 3600); // 1 hora
    
    return { success: true, config: sanitizedConfig };
  } catch (error) {
    console.error('Error guardando configuración de seguridad:', error);
    throw error;
  }
}

/**
 * Sanitiza y valida la configuración
 * @private
 */
sanitizeConfig(config) {
  const defaultConfig = this.getDefaultSecurityConfig();
  
  const sanitized = {
    thresholds: {
      failedLogins: this.validateNumber(config.thresholds?.failedLogins, defaultConfig.thresholds.failedLogins, 1, 20),
      apiRequests: this.validateNumber(config.thresholds?.apiRequests, defaultConfig.thresholds.apiRequests, 10, 1000),
      suspiciousActivities: this.validateNumber(config.thresholds?.suspiciousActivities, defaultConfig.thresholds.suspiciousActivities, 1, 20)
    },
    blockDurations: {
      default: this.validateNumber(config.blockDurations?.default, defaultConfig.blockDurations.default, 300, 86400) * 60, // convertir minutos a segundos
      bruteForce: this.validateNumber(config.blockDurations?.bruteForce, defaultConfig.blockDurations.bruteForce, 300, 86400) * 60,
      manual: this.validateNumber(config.blockDurations?.manual, defaultConfig.blockDurations.manual, 300, 86400) * 60
    },
    retention: {
      archiveEvents: this.validateNumber(config.retention?.archiveEvents, defaultConfig.retention.archiveEvents, 7, 365),
      deleteEvents: this.validateNumber(config.retention?.deleteEvents, defaultConfig.retention.deleteEvents, 30, 730),
      deleteLogins: this.validateNumber(config.retention?.deleteLogins, defaultConfig.retention.deleteLogins, 7, 180)
    },
    advanced: {
      enableGeolocation: Boolean(config.advanced?.enableGeolocation),
      enableAutoBlock: Boolean(config.advanced?.enableAutoBlock),
      emergencyUnblockKey: typeof config.advanced?.emergencyUnblockKey === 'string' && 
                          config.advanced.emergencyUnblockKey.length >= 8 ? 
                          config.advanced.emergencyUnblockKey : 
                          defaultConfig.advanced.emergencyUnblockKey
    },
    whitelistIPs: Array.isArray(config.whitelistIPs) ? 
                 config.whitelistIPs.filter(ip => this.isValidIP(ip)) : 
                 defaultConfig.whitelistIPs
  };
  
  return sanitized;
}

/**
 * Valida un número y devuelve un valor por defecto si no es válido
 * @private
 */
validateNumber(value, defaultValue, min, max) {
  const num = parseInt(value);
  if (isNaN(num) || num < min || num > max) {
    return defaultValue;
  }
  return num;
}

/**
 * Valida si una cadena es una IP válida
 * @private
 */
isValidIP(ip) {
  // IPv4 simple regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 simple check (validación completa sería más compleja)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  return (typeof ip === 'string') && (ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost');
}

/**
 * Reinicia los contadores de seguridad
 */
async resetSecurityCounters() {
  try {
    if (!redisService.client || !redisService.isConnected) {
      throw new Error('Servicio Redis no disponible');
    }
    
    const failedLoginKeys = await redisService.client.keys('security:failed-login:*');
    const suspiciousKeys = await redisService.client.keys('security:suspicious:*');
    const sensitiveKeys = await redisService.client.keys('security:sensitive:*');
    const navigationKeys = await redisService.client.keys('security:navigation:*');
    
    const allKeys = [
      ...failedLoginKeys,
      ...suspiciousKeys,
      ...sensitiveKeys,
      ...navigationKeys
    ];
    
    // Si hay claves, eliminarlas
    let deletedCount = 0;
    if (allKeys.length > 0) {
      deletedCount = await redisService.client.del(...allKeys);
    }
    
    return {
      success: true,
      message: `Se han reiniciado ${deletedCount} contadores de seguridad`,
      countersReset: deletedCount
    };
  } catch (error) {
    console.error('Error reiniciando contadores de seguridad:', error);
    throw error;
  }
}

/**
 * Ejecuta un diagnóstico completo del sistema de seguridad
 */
async runSecurityDiagnostic() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      systemStatus: 'healthy',
      components: {},
      tests: [],
      recommendations: []
    };
    
    // 1. Verificar conexión a la base de datos
    try {
      const startTime = Date.now();
      await pool.query('SELECT 1');
      const endTime = Date.now();
      
      results.components.database = {
        status: 'operational',
        responseTime: endTime - startTime,
        message: 'Conexión exitosa a la base de datos'
      };
      
      results.tests.push({
        name: 'database_connection',
        status: 'pass',
        message: 'Conexión correcta a la base de datos'
      });
    } catch (dbError) {
      results.components.database = {
        status: 'error',
        error: dbError.message
      };
      
      results.tests.push({
        name: 'database_connection',
        status: 'fail',
        message: 'Error conectando a la base de datos: ' + dbError.message
      });
      
      results.recommendations.push(
        'Verificar credenciales y conexión a la base de datos'
      );
      
      results.systemStatus = 'degraded';
    }
    
    // 2. Verificar conexión a Redis
    try {
      const startTime = Date.now();
      if (!redisService.client || !redisService.isConnected) {
        throw new Error('Servicio Redis no disponible');
      }
      
      await redisService.client.set('security:diagnostic:test', 'ok', 'EX', 10);
      const testValue = await redisService.client.get('security:diagnostic:test');
      const endTime = Date.now();
      
      if (testValue !== 'ok') {
        throw new Error('Valor de prueba incorrecto');
      }
      
      results.components.redis = {
        status: 'operational',
        responseTime: endTime - startTime,
        message: 'Conexión exitosa a Redis'
      };
      
      results.tests.push({
        name: 'redis_connection',
        status: 'pass',
        message: 'Conexión correcta a Redis'
      });
    } catch (redisError) {
      results.components.redis = {
        status: 'error',
        error: redisError.message
      };
      
      results.tests.push({
        name: 'redis_connection',
        status: 'fail',
        message: 'Error conectando a Redis: ' + redisError.message
      });
      
      results.recommendations.push(
        'Verificar que el servicio Redis esté activo y accesible'
      );
      
      results.systemStatus = 'degraded';
    }
    
    // 3. Verificar tabla de eventos de seguridad
    try {
      const { rows } = await pool.query(`
        SELECT COUNT(*) FROM security_events
      `);
      
      const eventCount = parseInt(rows[0].count);
      
      results.components.security_events = {
        status: 'operational',
        count: eventCount,
        message: `Tabla de eventos contiene ${eventCount} registros`
      };
      
      results.tests.push({
        name: 'security_events_table',
        status: 'pass',
        message: 'Tabla de eventos de seguridad accesible'
      });
      
      if (eventCount > 10000) {
        results.recommendations.push(
          'Gran cantidad de eventos de seguridad. Considere ejecutar la limpieza programada'
        );
      }
    } catch (tableError) {
      results.components.security_events = {
        status: 'error',
        error: tableError.message
      };
      
      results.tests.push({
        name: 'security_events_table',
        status: 'fail',
        message: 'Error accediendo a la tabla de eventos: ' + tableError.message
      });
      
      results.recommendations.push(
        'Verificar que la tabla security_events existe en la base de datos'
      );
      
      results.systemStatus = 'degraded';
    }
    
    // 4. Verificar servicio de geolocalización
    try {
      const testIP = '8.8.8.8'; // IP de Google DNS para prueba
      const geo = getLocationFromIP(testIP);
      
      if (geo && geo.country) {
        results.components.geolocation = {
          status: 'operational',
          message: 'Servicio de geolocalización funcionando'
        };
        
        results.tests.push({
          name: 'geolocation_service',
          status: 'pass',
          message: 'Servicio de geolocalización operativo'
        });
      } else {
        throw new Error('Información de geolocalización no disponible');
      }
    } catch (geoError) {
      results.components.geolocation = {
        status: 'warning',
        message: geoError.message
      };
      
      results.tests.push({
        name: 'geolocation_service',
        status: 'warning',
        message: 'Problema con el servicio de geolocalización: ' + geoError.message
      });
      
      results.recommendations.push(
        'Verificar la integración con el servicio de geolocalización'
      );
    }
    
    return results;
  } catch (error) {
    console.error('Error ejecutando diagnóstico de seguridad:', error);
    return {
      timestamp: new Date().toISOString(),
      systemStatus: 'error',
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Obtiene logs del sistema
 * @param {string} type - Tipo de log (security, error, combined)
 * @param {number} lines - Número de líneas
 */
async getSecurityLogs(type = 'security', lines = 100) {
  try {
    const logFilePath = this.getLogFilePath(type);
    
    // Leer últimas líneas del archivo
    const logContent = await this.readLastLines(logFilePath, lines);
    
    return {
      type,
      lines: logContent.length,
      content: logContent.join('\n')
    };
  } catch (error) {
    console.error('Error obteniendo logs del sistema:', error);
    throw error;
  }
}

/**
 * Obtiene la ruta del archivo de log según el tipo
 * @private
 */
getLogFilePath(type) {
  // Directorio base de logs
  const logsDir = process.env.LOGS_DIR || './logs';
  
  switch (type) {
    case 'security':
      return `${logsDir}/security.log`;
    case 'error':
      return `${logsDir}/error.log`;
    case 'combined':
      return `${logsDir}/combined.log`;
    default:
      return `${logsDir}/security.log`;
  }
}

/**
 * Lee las últimas líneas de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {number} lines - Número de líneas a leer
 * @private
 */
async readLastLines(filePath, lines) {
  try {
    // Importación dinámica de fs
    const fs = await import('fs');
    
    if (!fs.existsSync(filePath)) {
      return [`Archivo de log no encontrado: ${filePath}`];
    }
    
    // Leer todo el archivo usando promises de fs
    const data = await fs.promises.readFile(filePath, 'utf8');
    const allLines = data.split('\n').filter(line => line.trim() !== '');
    
    return allLines.slice(-lines);
  } catch (error) {
    console.error('Error leyendo archivo de log:', error);
    return [`Error leyendo archivo de log: ${error.message}`];
  }
}

async exportSecurityEvents(filters = {}, format = 'csv') {
  try {
    const { events } = await this.getSecurityEvents(filters, 1, 10000);
    
    // Fecha actual para el nombre del archivo
    const date = new Date().toISOString().split('T')[0];
    const filename = `eventos_seguridad_${date}.${format}`;
    
    let fileContent;
    
    if (format === 'json') {
      fileContent = JSON.stringify(events, null, 2);
    }
    else if (format === 'csv') {
      fileContent = this.convertToCSV(events);
    }
    else if (format === 'excel') {
      // Importación dinámica de xlsx
      const xlsx = (await import('xlsx')).default;
      
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(events);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Eventos');
      fileContent = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    
    return { events, fileContent, filename };
  } catch (error) {
    console.error('Error exportando eventos:', error);
    throw error;
  }
}

/**
 * Convierte un array de objetos a CSV
 * @private
 */
convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]);
  
  const headerRow = headers.join(',');
  
  const rows = data.map(obj => {
    return headers.map(header => {
      const val = obj[header];
      
      if (val === null || val === undefined) {
        return '';
      }
      
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      
      // Escapar comillas y poner entre comillas si es string
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      
      return val;
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}
}

export const securityService = new SecurityService();