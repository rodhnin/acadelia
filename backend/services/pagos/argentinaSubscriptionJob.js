import cron from 'node-cron';
import pool from '../../lib/dbPool.js';
import { argentinaEmailService } from '../email/argentinaEmailService.js';

class ArgentinaSubscriptionJob {
  constructor() {
    this.isRunning = false;
    this.jobSchedule = '0 */6 * * *'; // Cada 6 horas: 00:00, 06:00, 12:00, 18:00
    this.job = null;
  }

  start() {
    if (this.job) {
      console.log('⚠️ Job de suscripciones Argentina ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando job de suscripciones Argentina...');
    console.log(`📅 Programado para ejecutarse: ${this.jobSchedule} (cada 6 horas)`);

    this.job = cron.schedule(this.jobSchedule, async () => {
      await this.executeJob();
    }, {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires" // Zona horaria Argentina
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Modo desarrollo: ejecutando job inicial en 10 segundos...');
      setTimeout(() => {
        this.executeJob();
      }, 10000);
    }

    console.log('✅ Job de suscripciones Argentina iniciado correctamente');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Job de suscripciones Argentina detenido');
    }
  }

  async executeManually() {
    console.log('🔧 Ejecutando job de suscripciones Argentina manualmente...');
    return await this.executeJob();
  }

  async executeJob() {
    if (this.isRunning) {
      console.log('⏳ Job de suscripciones Argentina ya está ejecutándose, saltando...');
      return { skipped: true };
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log('');
      console.log('🔄='.repeat(40));
      console.log(`🇦🇷 INICIANDO JOB SUSCRIPCIONES ARGENTINA`);
      console.log(`🕒 Hora: ${startTime.toLocaleString('es-AR')}`);
      console.log('🔄='.repeat(40));

      // PASO 1: Ejecutar función SQL para expirar suscripciones
      console.log('📊 PASO 1: Expirando suscripciones vencidas...');
      
      const result = await pool.query('SELECT * FROM actualizar_suscripciones_vencidas()');
      
      if (result.rows.length === 0) {
        throw new Error('No se obtuvo respuesta de la función actualizar_suscripciones_vencidas()');
      }

      const estadisticas = result.rows[0];
      
        console.log(`✅ Función SQL completada:`);
        console.log(`   • Suscripciones expiradas: ${estadisticas.total_vencidas}`);
        console.log(`   • Usuarios degradados: ${estadisticas.usuarios_degradados}`);
        console.log(`   • Tiempo de ejecución: ${estadisticas.tiempo_ejecucion || 'N/A'}`);

      // PASO 2: Enviar emails si hay suscripciones expiradas
      let emailResults = { sent: 0, failed: 0, details: [] };
      
      if (estadisticas.total_vencidas > 0) {
        console.log('');
        console.log('📧 PASO 2: Enviando emails de suscripciones expiradas...');
        
        const expiredSubscriptions = await pool.query(`
          SELECT 
            s.id as subscription_id,
            s.user_id,
            u.correo,
            COALESCE(pf.nombre, 'Sin nombre') as nombres,
            c.nombre as carrera_nombre
          FROM subscriptions_arg s
          LEFT JOIN usuario u ON s.user_id = u.id_user
          LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
          LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
          WHERE s.status = 'expirado' 
          AND s.updated_at >= NOW() - INTERVAL '10 minutes'
          ORDER BY s.updated_at DESC
        `);

        const expiredIds = expiredSubscriptions.rows.map(row => row.subscription_id);
        
        console.log(`📋 Encontradas ${expiredIds.length} suscripciones para notificar:`);
        expiredSubscriptions.rows.forEach(sub => {
          console.log(`   • ${sub.correo} - ${sub.carrera_nombre} (ID: ${sub.subscription_id})`);
        });

        if (expiredIds.length > 0) {
          emailResults = await argentinaEmailService.sendExpiredSubscriptionEmails(expiredIds);
          
          console.log('');
          console.log(`📊 RESULTADOS DE EMAIL:`);
          console.log(`   • ✅ Enviados exitosamente: ${emailResults.sent}`);
          console.log(`   • ❌ Fallidos: ${emailResults.failed}`);
          
          if (emailResults.failed > 0) {
            console.log(`   • 📋 Detalles de fallos:`);
            emailResults.details
              .filter(detail => detail.status === 'failed')
              .forEach(detail => {
                console.log(`     - Suscripción ${detail.subscriptionId}: ${detail.error}`);
              });
          }
        }
      } else {
        console.log('ℹ️ No hay suscripciones expiradas, no se envían emails');
      }

      // PASO 3: Estadísticas finales
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log('');
      console.log('📈 RESUMEN FINAL:');
      console.log(`   • Duración total: ${Math.round(duration / 1000)}s`);
      console.log(`   • Suscripciones procesadas: ${estadisticas.total_vencidas}`);
      console.log(`   • Emails enviados: ${emailResults.sent}`);
      console.log(`   • Usuarios degradados: ${estadisticas.usuarios_degradados}`);

      // PASO 4: Log para auditoría (opcional - guardar en BD)
      try {
        await this.logJobExecution({
          start_time: startTime,
          end_time: endTime,
          duration_ms: duration,
          expired_subscriptions: estadisticas.total_vencidas,
          emails_sent: emailResults.sent,
          emails_failed: emailResults.failed,
          users_downgraded: estadisticas.usuarios_degradados,
          success: true
        });
      } catch (logError) {
        console.error('⚠️ Error guardando log de auditoría:', logError.message);
      }

      console.log('🔄='.repeat(40));
      console.log('✅ JOB COMPLETADO EXITOSAMENTE');
      console.log('🔄='.repeat(40));
      console.log('');

      return {
        success: true,
        executed_at: startTime.toISOString(),
        duration_ms: duration,
        sql_stats: {
          expired_subscriptions: estadisticas.total_vencidas,
          users_downgraded: estadisticas.usuarios_degradados,
          execution_time: estadisticas.tiempo_ejecucion
        },
        email_stats: emailResults
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime - startTime;

      console.error('');
      console.error('❌='.repeat(40));
      console.error('❌ ERROR EN JOB SUSCRIPCIONES ARGENTINA');
      console.error(`❌ Error: ${error.message}`);
      console.error(`❌ Duración antes del error: ${Math.round(duration / 1000)}s`);
      console.error('❌='.repeat(40));
      console.error('');

      try {
        await this.logJobExecution({
          start_time: startTime,
          end_time: endTime,
          duration_ms: duration,
          error_message: error.message,
          success: false
        });
      } catch (logError) {
        console.error('⚠️ Error guardando log de error:', logError.message);
      }

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async logJobExecution(data) {
    try {
      // Opcional: Si quieres guardar logs en BD, crear tabla job_executions_arg
      /*
      await pool.query(`
        INSERT INTO job_executions_arg 
        (job_name, start_time, end_time, duration_ms, data, success)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'argentina_subscription_expiry',
        data.start_time,
        data.end_time,
        data.duration_ms,
        JSON.stringify(data),
        data.success
      ]);
      */
      
      // Por ahora solo log en consola estructurado
      const logEntry = {
        timestamp: new Date().toISOString(),
        job_name: 'argentina_subscription_expiry',
        ...data
      };
      
      console.log('📝 Log de auditoría:', JSON.stringify(logEntry, null, 2));
      
    } catch (error) {
      console.error('Error en log de auditoría:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.job,
      schedule: this.jobSchedule,
      timezone: "America/Argentina/Buenos_Aires",
      next_execution: this.job ? 'Calculado por node-cron' : null
    };
  }

  async getUpcomingExpirations(hours = 24) {
    try {
      const result = await pool.query(`
        SELECT 
          s.id,
          s.end_date,
          u.correo,
          c.nombre as carrera,
          EXTRACT(EPOCH FROM (s.end_date - NOW())) / 3600 as hours_remaining
        FROM subscriptions_arg s
        LEFT JOIN usuario u ON s.user_id = u.id_user
        LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
        WHERE s.status = 'activo'
        AND s.end_date <= NOW() + INTERVAL '${hours} hours'
        AND s.end_date > NOW()
        ORDER BY s.end_date ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo próximas expiraciones:', error);
      return [];
    }
  }
}

const argentinaSubscriptionJob = new ArgentinaSubscriptionJob();

export { argentinaSubscriptionJob };