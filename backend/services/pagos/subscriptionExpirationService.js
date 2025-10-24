// backend/services/pagos/subscriptionExpirationService.js
import pool from '../../lib/dbPool.js';
import cron from 'node-cron';

class SubscriptionExpirationService {
  constructor() {
    this.isRunning = false;
    this.task = null;
  }

  start() {
    if (this.isRunning) return;

    // Ejecutar cada hora
    this.task = cron.schedule('0 * * * *', async () => {
      await this.checkExpiredSubscriptions();
    });

    // Ejecutar inmediatamente
    this.checkExpiredSubscriptions();
    
    this.isRunning = true;
    console.log('✅ Servicio de expiración iniciado');
  }

  async checkExpiredSubscriptions() {
    try {
      console.log('🔄 Verificando suscripciones...');

      const result = await pool.query(
        `UPDATE subscriptions_arg 
         SET status = 'expirado'
         WHERE status = 'activo' 
         AND end_date < CURRENT_TIMESTAMP
         RETURNING id, user_id, carrera_id`
      );

      if (result.rows.length > 0) {
        console.log(`✅ ${result.rows.length} suscripciones expiradas`);
      }

    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      console.log('🛑 Servicio detenido');
    }
  }
}

export default new SubscriptionExpirationService();