import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'warn' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Archivo para errores
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // Archivo para todos los logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

// Solo agregar consola en desarrollo
if (!IS_PRODUCTION) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Funciones helper para mantener compatibilidad con console.log
class Logger {
  static info(message, metadata = {}) {
    logger.info(message, metadata);
  }

  static warn(message, metadata = {}) {
    logger.warn(message, metadata);
  }

  static error(message, error = null, metadata = {}) {
    const logData = {
      ...metadata,
      ...(error && { 
        error: error.message, 
        stack: error.stack 
      })
    };
    logger.error(message, logData);
  }

  static debug(message, metadata = {}) {
    logger.debug(message, metadata);
  }

  // Funciones específicas para el contexto de la aplicación
  static auth(message, metadata = {}) {
    logger.info(`[AUTH] ${message}`, metadata);
  }

  static security(message, metadata = {}) {
    logger.warn(`[SECURITY] ${message}`, metadata);
  }

  static api(message, metadata = {}) {
    logger.info(`[API] ${message}`, metadata);
  }

  static database(message, metadata = {}) {
    logger.info(`[DATABASE] ${message}`, metadata);
  }

  static dev(message, metadata = {}) {
    if (!IS_PRODUCTION) {
      console.log(`[DEV] ${message}`, metadata);
    }
  }
}

export default logger;
export { Logger };