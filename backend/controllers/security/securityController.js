// controllers/security/securityController.js
import { securityService } from '../../services/security/securityService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Obtiene lista de eventos de seguridad con paginación y filtros
 */
export const getSecurityEvents = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) { // Asumiendo que 3 es el rol de admin
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Extraer parámetros de solicitud
    const { 
      page = 1, 
      limit = 50, 
      eventType, 
      severity, 
      userId, 
      ip, 
      startDate, 
      endDate 
    } = req.query;
    
    // Construir objeto de filtros
    const filters = {};
    if (eventType) filters.eventType = eventType;
    if (severity) filters.severity = severity;
    if (userId) filters.userId = userId;
    if (ip) filters.ip = ip;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    // Obtener eventos
    const result = await securityService.getSecurityEvents(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener eventos de seguridad:', error);
    res.status(500).json({ error: 'Error al obtener eventos de seguridad' });
  }
};

/**
 * Obtiene resumen de métricas de seguridad
 */
export const getSecurityMetrics = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const metrics = await securityService.getSecurityMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas de seguridad:', error);
    res.status(500).json({ error: 'Error al obtener métricas de seguridad' });
  }
};

/**
 * Revoca tokens de un usuario
 */
export const revokeUserTokens = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const { userId, reason } = req.body;
    
    if (!userId || !reason) {
      return res.status(400).json({ error: 'Se requiere userId y reason' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador revocó tokens de usuario', {
      adminId: req.user.id_user,
      targetUserId: userId,
      reason
    });
    
    const result = await securityService.revokeUserTokens(userId, reason);
    res.json(result);
  } catch (error) {
    console.error('Error al revocar tokens:', error);
    res.status(500).json({ error: 'Error al revocar tokens' });
  }
};

/**
 * Bloquea una dirección IP
 */
export const blockIP = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const { ip, reason, duration } = req.body;
    
    if (!ip || !reason) {
      return res.status(400).json({ error: 'Se requiere IP y razón' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador bloqueó IP', {
      adminId: req.user.id_user,
      ip,
      reason,
      duration
    });
    
    const result = await securityService.blockIP(ip, reason, duration);
    res.json(result);
  } catch (error) {
    console.error('Error al bloquear IP:', error);
    res.status(500).json({ error: 'Error al bloquear IP' });
  }
};

/**
 * Desbloquea una dirección IP
 */
export const unblockIP = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const { ip } = req.params;
    
    if (!ip) {
      return res.status(400).json({ error: 'Se requiere IP' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador desbloqueó IP', {
      adminId: req.user.id_user,
      ip
    });
    
    const result = await securityService.unblockIP(ip);
    res.json(result);
  } catch (error) {
    console.error('Error al desbloquear IP:', error);
    res.status(500).json({ error: 'Error al desbloquear IP' });
  }
};

/**
 * Obtiene la lista de IPs bloqueadas
 */
export const getBlockedIPs = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const blockedIPs = await securityService.getBlockedIPs();
    res.json(blockedIPs);
  } catch (error) {
    console.error('Error al obtener IPs bloqueadas:', error);
    res.status(500).json({ error: 'Error al obtener IPs bloqueadas' });
  }
};

/**
 * Obtiene los intentos de login fallidos
 */
export const getFailedLoginAttempts = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const failedAttempts = await securityService.getFailedLoginAttempts();
    res.json(failedAttempts);
  } catch (error) {
    console.error('Error al obtener intentos fallidos:', error);
    res.status(500).json({ error: 'Error al obtener intentos fallidos' });
  }
};

/**
 * Obtiene la actividad sospechosa
 */
export const getSuspiciousActivity = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const suspiciousActivity = await securityService.getSuspiciousActivity();
    res.json(suspiciousActivity);
  } catch (error) {
    console.error('Error al obtener actividad sospechosa:', error);
    res.status(500).json({ error: 'Error al obtener actividad sospechosa' });
  }
};

/**
 * Obtiene información de seguridad de un usuario
 */
export const getUserSecurityInfo = async (req, res) => {
  try {
    // Verificar permisos (solo admins o el propio usuario)
    const userId = req.params.userId;
    
    if (req.user.id_rol !== 3 && req.user.id_user != userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const userInfo = await securityService.getUserSecurityInfo(userId);
    res.json(userInfo);
  } catch (error) {
    console.error('Error al obtener información de seguridad del usuario:', error);
    res.status(500).json({ error: 'Error al obtener información de seguridad' });
  }
};

/**
 * Registra evento de seguridad personalizado
 */
export const logCustomSecurityEvent = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const { eventType, message, data, severity, userId, ip } = req.body;
    
    if (!eventType || !message) {
      return res.status(400).json({ error: 'Se requiere tipo de evento y mensaje' });
    }
    
    // Registrar evento
    await securityService.registerSecurityEvent(
      eventType,
      message,
      data || {},
      severity || 'info',
      userId || null,
      ip || null
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error al registrar evento personalizado:', error);
    res.status(500).json({ error: 'Error al registrar evento' });
  }
};

// Agregar estas funciones al final de securityController.js

/**
 * Obtiene la configuración del sistema de seguridad
 */
export const getSecurityConfig = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const config = await securityService.getSecurityConfig();
    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración de seguridad:', error);
    res.status(500).json({ error: 'Error al obtener configuración de seguridad' });
  }
};

/**
 * Guarda la configuración del sistema de seguridad
 */
export const saveSecurityConfig = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const config = req.body;
    
    // Validar configuración
    if (!config) {
      return res.status(400).json({ error: 'Configuración inválida' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador actualizó configuración de seguridad', {
      adminId: req.user.id_user,
      changes: config
    });
    
    const result = await securityService.saveSecurityConfig(config);
    res.json(result);
  } catch (error) {
    console.error('Error al guardar configuración de seguridad:', error);
    res.status(500).json({ error: 'Error al guardar configuración de seguridad' });
  }
};

/**
 * Reinicia los contadores de seguridad
 */
export const resetSecurityCounters = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador reinició contadores de seguridad', {
      adminId: req.user.id_user
    });
    
    const result = await securityService.resetSecurityCounters();
    res.json(result);
  } catch (error) {
    console.error('Error al reiniciar contadores:', error);
    res.status(500).json({ error: 'Error al reiniciar contadores' });
  }
};

/**
 * Ejecuta diagnóstico del sistema de seguridad
 */
export const runSecurityDiagnostic = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador ejecutó diagnóstico de seguridad', {
      adminId: req.user.id_user
    });
    
    const result = await securityService.runSecurityDiagnostic();
    res.json(result);
  } catch (error) {
    console.error('Error al ejecutar diagnóstico:', error);
    res.status(500).json({ error: 'Error al ejecutar diagnóstico' });
  }
};

/**
 * Obtiene logs del sistema
 */
export const getSecurityLogs = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    const { type = 'security', lines = 100 } = req.query;
    
    // Validar parámetros
    if (!['security', 'error', 'combined'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de log no válido' });
    }
    
    if (isNaN(lines) || lines < 1 || lines > 1000) {
      return res.status(400).json({ error: 'Número de líneas no válido' });
    }
    
    const logs = await securityService.getSecurityLogs(type, parseInt(lines));
    
    res.json({ logs });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: 'Error al obtener logs' });
  }
};

/**
 * Exporta eventos de seguridad en diferentes formatos
 */
export const exportSecurityEvents = async (req, res) => {
  try {
    // Verificar permisos (solo admins)
    if (req.user.id_rol !== 3) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Obtener parámetros
    const { format = 'csv', ...filters } = req.query;
    
    // Validar formato
    if (!['csv', 'json', 'excel'].includes(format)) {
      return res.status(400).json({ error: 'Formato no válido' });
    }
    
    // Registrar acción de administrador
    logSecurityEvent('ADMIN_ACTION', 'Administrador exportó eventos de seguridad', {
      adminId: req.user.id_user,
      format,
      filters
    });
    
    // Obtener datos
    const { events, fileContent, filename } = await securityService.exportSecurityEvents(filters, format);
    
    // Configurar cabeceras según formato
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(fileContent);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(fileContent);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(fileContent);
    }
    
    // Si llegamos aquí, algo falló
    res.status(400).json({ error: 'Formato no soportado' });
  } catch (error) {
    console.error('Error al exportar eventos:', error);
    res.status(500).json({ error: 'Error al exportar eventos' });
  }
};