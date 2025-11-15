// services/scheduledTasks.js
import cron from 'node-cron';
import pool from '../../lib/dbPool.js';
import { ScheduledUsersTasksService } from '../usuarios/scheduledUsersTasksService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

// Configuración de períodos de retención (en días)
// Puedes ajustar estos valores según tus necesidades
const RETENTION = {
  ARCHIVE_EVENTS: process.env.SECURITY_ARCHIVE_DAYS || 90,  // Archivar eventos después de X días
  DELETE_EVENTS: process.env.SECURITY_DELETE_DAYS || 365,   // Eliminar eventos después de X días
  DELETE_LOGINS: process.env.LOGIN_DELETE_DAYS || 30        // Eliminar intentos de login después de X días
};

/**
 * Tarea de limpieza de seguridad completa
 * - Archiva eventos antiguos
 * - Elimina eventos muy antiguos
 * - Elimina intentos de login antiguos
 */
const securityCleanupTask = async () => {
  console.log('🧹 Iniciando limpieza programada de datos de seguridad...');
  
  try {
    // 1. Archivar eventos antiguos
    const archiveResult = await pool.query(`
      UPDATE security_events
      SET archived = TRUE
      WHERE created_at < NOW() - INTERVAL '${RETENTION.ARCHIVE_EVENTS} days' 
      AND archived = FALSE
      RETURNING COUNT(*) as archived_count
    `);
    
    const archivedCount = parseInt(archiveResult.rows[0]?.archived_count || '0');
    console.log(`✅ ${archivedCount} eventos archivados (más de ${RETENTION.ARCHIVE_EVENTS} días)`);
    
    // 2. Eliminar eventos muy antiguos
    const deleteEventsResult = await pool.query(`
      DELETE FROM security_events
      WHERE created_at < NOW() - INTERVAL '${RETENTION.DELETE_EVENTS} days'
      RETURNING COUNT(*) as deleted_count
    `);
    
    const deletedEventsCount = parseInt(deleteEventsResult.rows[0]?.deleted_count || '0');
    console.log(`✅ ${deletedEventsCount} eventos eliminados (más de ${RETENTION.DELETE_EVENTS} días)`);
    
    // 3. Eliminar intentos de login antiguos
    const deleteLoginsResult = await pool.query(`
      DELETE FROM login_attempts
      WHERE created_at < NOW() - INTERVAL '${RETENTION.DELETE_LOGINS} days'
      RETURNING COUNT(*) as deleted_count
    `);
    
    const deletedLoginsCount = parseInt(deleteLoginsResult.rows[0]?.deleted_count || '0');
    console.log(`✅ ${deletedLoginsCount} intentos de login eliminados (más de ${RETENTION.DELETE_LOGINS} días)`);
    
    // 4. Registrar el evento de limpieza
    await logSecurityEvent(
      'SECURITY_CLEANUP',
      'Limpieza programada de datos de seguridad',
      {
        archivedEvents: archivedCount,
        deletedEvents: deletedEventsCount,
        deletedLogins: deletedLoginsCount,
        retentionPeriods: {
          archiveEvents: RETENTION.ARCHIVE_EVENTS,
          deleteEvents: RETENTION.DELETE_EVENTS,
          deleteLogins: RETENTION.DELETE_LOGINS
        }
      },
      'info'
    );
    
    console.log('🧹 Limpieza de datos de seguridad completada exitosamente');
    return {
      success: true,
      archivedEvents: archivedCount,
      deletedEvents: deletedEventsCount,
      deletedLogins: deletedLoginsCount
    };
  } catch (error) {
    console.error('❌ Error en limpieza de datos de seguridad:', error);
    
    await logSecurityEvent(
      'SECURITY_CLEANUP_ERROR',
      'Error en limpieza programada de datos de seguridad',
      {
        error: error.message,
        stack: error.stack
      },
      'high'
    );
    
    return {
      success: false,
      error: error.message
    };
  }
};

export const runUsersTasks = async () => {
  try {
    console.log('🔄 Iniciando tareas programadas de usuarios...');
    const result = await ScheduledUsersTasksService.executeScheduledUsersTasks();
    
    console.log(`✅ Tareas de usuarios completadas: ${result.tasksExecuted} ejecutadas, ${result.tasksFailed} fallidas`);
    
    await logSecurityEvent(
      'USER_TASKS_EXECUTED',
      'Ejecución de tareas programadas de usuarios',
      {
        tasksExecuted: result.tasksExecuted,
        tasksFailed: result.tasksFailed,
        totalTasks: result.totalTasks
      },
      'info'
    );
    
    return result;
  } catch (error) {
    console.error('❌ Error en tareas programadas de usuarios:', error);
    
    await logSecurityEvent(
      'USER_TASKS_ERROR',
      'Error en tareas programadas de usuarios',
      {
        error: error.message,
        stack: error.stack
      },
      'high'
    );
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Programar la tarea para ejecutarse cada hora (para términos y condiciones y otras tareas de usuarios)
// El intervalo de 1 hora garantiza que las aceptaciones automáticas se procesen con relativa rapidez
cron.schedule('0 * * * *', runUsersTasks, {
  timezone: 'Europe/Madrid'  // Ajusta a tu zona horaria
});

// Programar la tarea para ejecutarse cada domingo a las 3 AM
// Formato: segundo minuto hora día_mes mes día_semana
cron.schedule('0 3 * * 0', securityCleanupTask, {
  timezone: 'Europe/Madrid'  // Ajusta a tu zona horaria
});

// También exponer la función para ejecución manual (útil para pruebas)
export const runSecurityCleanup = securityCleanupTask;

// Programar otras tareas de limpieza si es necesario
// Por ejemplo, limpiar archivos temporales, logs de sistema, etc.

// Opcional: Tarea de resumen diario
cron.schedule('0 1 * * *', async () => {
  try {
    const dailySummary = await pool.query(`
      SELECT 
        event_type, 
        COUNT(*) as count,
        MAX(severity) as max_severity
      FROM security_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY event_type
      ORDER BY count DESC
    `);
    
    if (dailySummary.rows.length > 0) {
      console.log('📊 Resumen diario de seguridad:');
      dailySummary.rows.forEach(row => {
        console.log(`  - ${row.event_type}: ${row.count} eventos (severidad max: ${row.max_severity})`);
      });
      
      // Aquí podrías enviar un email con el resumen a los administradores
      // O almacenar el resumen para el dashboard
    } else {
      console.log('📊 Sin eventos de seguridad en las últimas 24 horas');
    }
  } catch (error) {
    console.error('Error generando resumen diario:', error);
  }
}, {
  timezone: 'Europe/Madrid'
});

export default cron;