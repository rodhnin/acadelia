// utils/securityLogger.js
import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';
import pool from '../lib/dbPool.js';

// Asegurar que el directorio de logs exista
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    // Escribir logs de error a error.log
    new transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Escribir logs de todos los niveles a combined.log
    new transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

const securityLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    // Escribir logs de seguridad a security.log
    new transports.File({ 
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// En entorno de desarrollo, imprimir a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  }));
  
  securityLogger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(info => `${info.timestamp} ${info.level}: [SECURITY] ${info.message}`)
    )
  }));
}

// Funciones de ayuda para enmascarar datos sensibles
const maskSensitiveData = (obj, fields = ['contraseña', 'password', 'token', 'accessToken', 'refreshToken']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj };
  
  for (const field of fields) {
    if (field in masked) {
      masked[field] = '********';
    }
  }
  
  return masked;
};

/**
 * Guardar evento directamente en la base de datos
 * @private
 */
const saveToDatabase = async (eventType, message, data, severity, userId, ip) => {
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
    
    const result = await pool.query(query, values);
    return result.rows[0]?.id;
  } catch (error) {
    console.error('Error guardando evento en BD directamente:', error);
    return null;
  }
};

// Funciones de logging de seguridad
const logSecurityEvent = async (eventType, message, data = {}, severity = 'info', userId = null, ip = null) => {
  // Enmascarar datos sensibles
  const sanitizedData = maskSensitiveData(data);
  
  // 1. Registrar en archivo de log
  securityLogger.info(`${eventType}: ${message}`, sanitizedData);
  
  // Si es un evento crítico, también loguearlo como error
  if (severity === 'critical' || severity === 'high' || eventType === 'ATTACK') {
    securityLogger.error(`${eventType}: ${message}`, sanitizedData);
  }
  
  // 2. Registrar en base de datos directamente
  try {
    const eventId = await saveToDatabase(
      eventType,
      message,
      sanitizedData,
      severity,
      userId,
      ip
    );
    
    if (eventId) {
      // Si el registro se hizo en modo desarrollo, mostrar confirmación
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Evento de seguridad guardado con ID: ${eventId}`);
      }
    }
  } catch (dbError) {
    // Capturar errores para no interrumpir el flujo
    console.error('Error guardando evento de seguridad en BD:', dbError);
  }
};

export { 
  logger, 
  securityLogger,
  logSecurityEvent
};