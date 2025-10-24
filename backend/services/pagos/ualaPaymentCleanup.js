// backend/services/ualaPaymentCleanup.js - ✅ CORREGIDO
import pool from '../../lib/dbPool.js';
import cron from 'node-cron';

class UalaPaymentCleanup {
  constructor() {
    this.isRunning = false;
    this.cleanupIntervalMinutes = 120; // Ejecutar cada 2 horas
    this.paymentTimeoutHours = 6;      // Expirar pagos Ualá después de 1 hora
  }

  // ✅ INICIALIZAR LIMPIEZA AUTOMÁTICA
  initialize() {
    console.log('🧹 Inicializando limpieza de pagos Ualá abandonados...');
    
    // Ejecutar limpieza inicial al arrancar (después de 2 minutos)
    setTimeout(() => {
      this.expireAbandonedUalaPayments().catch(error => {
        console.error('❌ Error en limpieza inicial Ualá:', error);
      });
    }, 120000); // 2 minutos

    // Programar limpieza cada 6 horas
    cron.schedule(`*/${this.cleanupIntervalMinutes} * * * *`, () => {
      this.expireAbandonedUalaPayments().catch(error => {
        console.error('❌ Error en limpieza programada Ualá:', error);
      });
    });

    console.log(`✅ Limpieza Ualá programada: cada ${this.cleanupIntervalMinutes} minutos`);
    console.log(`⏰ Timeout pagos Ualá: ${this.paymentTimeoutHours} hora(s)`);
  }

  // ✅ EXPIRAR SOLO PAGOS UALÁ ABANDONADOS
  async expireAbandonedUalaPayments() {
    if (this.isRunning) {
      console.log('⏳ Limpieza Ualá ya en progreso...');
      return { expired: 0 };
    }

    this.isRunning = true;
    
    try {
      console.log(`🔍 Buscando pagos Ualá "procesando" de más de ${this.paymentTimeoutHours} hora(s)...`);

      // ✅ SOLO BUSCAR PAGOS UALÁ BIS EN ESTADO PROCESANDO
      const abandonedPayments = await pool.query(`
        SELECT 
          id, 
          user_id, 
          external_payment_id, 
          amount,
          created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_elapsed
        FROM payments_arg 
        WHERE payment_method = 'uala_bis' 
        AND payment_status = 'procesando' 
        AND created_at < NOW() - INTERVAL '${this.paymentTimeoutHours} hours'
        ORDER BY created_at ASC
      `);

      if (abandonedPayments.rows.length === 0) {
        console.log('✅ No hay pagos Ualá para expirar');
        return { expired: 0 };
      }

      console.log(`⏰ Encontrados ${abandonedPayments.rows.length} pagos Ualá abandonados:`);
      abandonedPayments.rows.forEach(payment => {
        // ✅ CORREGIDO: Convertir a número antes de usar toFixed
        const hoursElapsed = parseFloat(payment.hours_elapsed) || 0;
        console.log(`   💳 Payment ID: ${payment.id}, Usuario: ${payment.user_id}, Tiempo: ${hoursElapsed.toFixed(1)}h, Orden: ${payment.external_payment_id}`);
      });

      // ✅ ACTUALIZAR SOLO PAGOS UALÁ A "EXPIRADO"
      const updateResult = await pool.query(`
        UPDATE payments_arg 
        SET 
          payment_status = 'expirado',
          admin_notes = CONCAT(
            COALESCE(admin_notes, ''), 
            CASE 
              WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN ' | ' 
              ELSE '' 
            END,
            'Pago Ualá expirado automáticamente después de ${this.paymentTimeoutHours}h - ', 
            TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI')
          ),
          updated_at = NOW()
        WHERE payment_method = 'uala_bis' 
        AND payment_status = 'procesando' 
        AND created_at < NOW() - INTERVAL '${this.paymentTimeoutHours} hours'
        RETURNING id, user_id, external_payment_id, amount
      `);

      const expiredCount = updateResult.rows.length;
      
      if (expiredCount > 0) {
        console.log(`✅ ${expiredCount} pagos Ualá marcados como expirados:`);
        updateResult.rows.forEach(payment => {
          console.log(`   ⌛ Expirado: ID ${payment.id} | Usuario ${payment.user_id} | $${payment.amount} ARS | Orden ${payment.external_payment_id}`);
        });

        // ✅ LOG PARA AUDITORÍA
        await this.logCleanupActivity(updateResult.rows);
      }

      return { expired: expiredCount };

    } catch (error) {
      console.error('❌ Error expirando pagos Ualá:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // ✅ LOG DE AUDITORÍA
  async logCleanupActivity(expiredPayments) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'auto_expire_uala_payments',
        count: expiredPayments.length,
        total_amount: expiredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        payment_ids: expiredPayments.map(p => p.id),
        user_ids: [...new Set(expiredPayments.map(p => p.user_id))]
      };

      console.log('📋 Log de auditoría:', JSON.stringify(logEntry, null, 2));
      
      // Opcional: Guardar en tabla de logs si existe
      // await pool.query('INSERT INTO cleanup_logs (data) VALUES ($1)', [JSON.stringify(logEntry)]);
      
    } catch (error) {
      console.error('❌ Error logging cleanup activity:', error);
    }
  }

  // ✅ EJECUTAR LIMPIEZA MANUAL
  async executeManualCleanup() {
    console.log('🔧 Ejecutando limpieza manual de pagos Ualá...');
    return await this.expireAbandonedUalaPayments();
  }

  // ✅ OBTENER ESTADÍSTICAS
  async getCleanupStats() {
    try {
      const stats = await pool.query(`
        SELECT 
          payment_status,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM payments_arg 
        WHERE payment_method = 'uala_bis'
        GROUP BY payment_status
        ORDER BY 
          CASE payment_status 
            WHEN 'completado' THEN 1
            WHEN 'procesando' THEN 2  
            WHEN 'expirado' THEN 3
            WHEN 'fallido' THEN 4
            ELSE 5
          END
      `);

      const summary = {
        total_uala_payments: 0,
        by_status: {},
        pending_cleanup: 0
      };

      for (const row of stats.rows) {
        const count = parseInt(row.count);
        summary.total_uala_payments += count;
        summary.by_status[row.payment_status] = {
          count,
          amount: parseFloat(row.total_amount) || 0,
          oldest: row.oldest,
          newest: row.newest
        };
      }

      // Calcular cuántos están pendientes de expirar
      const pendingResult = await pool.query(`
        SELECT COUNT(*) as pending_count
        FROM payments_arg 
        WHERE payment_method = 'uala_bis' 
        AND payment_status = 'procesando' 
        AND created_at < NOW() - INTERVAL '${this.paymentTimeoutHours} hours'
      `);

      summary.pending_cleanup = parseInt(pendingResult.rows[0].pending_count);

      return summary;

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  // ✅ ESTADO DEL SERVICIO
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      cleanupIntervalMinutes: this.cleanupIntervalMinutes,
      paymentTimeoutHours: this.paymentTimeoutHours,
      onlyUalaBis: true,
      preservesTransfers: true
    };
  }
}

export default new UalaPaymentCleanup();