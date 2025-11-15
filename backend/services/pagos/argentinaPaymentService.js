import pool from '../../lib/dbPool.js';
import { ualaBisConfig } from '../../lib/ualaBisConfig.js';
import { argentinaEmailService } from '../email/argentinaEmailService.js';
import { googleDriveService } from '../../utils/googleDriveService.js';

class ArgentinaPaymentService {
  validatePaymentData(data) {
    const errors = [];

    const userId = typeof data.userId === 'string' ? parseInt(data.userId) : data.userId;
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
        errors.push('ID de usuario inválido');
    }

    const carreraId = typeof data.carreraId === 'string' ? parseInt(data.carreraId) : data.carreraId;
    if (!carreraId || !Number.isInteger(carreraId) || carreraId <= 0) {
        errors.push('ID de carrera inválido');
    }

    const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
    if (!amount || isNaN(amount) || amount <= 0) {
        errors.push('Monto inválido');
    }

    if (!['month', 'year'].includes(data.billingCycle)) {
        errors.push('Ciclo de facturación inválido');
    }

    console.log('🔍 Validación de datos:');
    console.log('userId original:', data.userId, '→ procesado:', userId, '✅');
    console.log('carreraId original:', data.carreraId, '→ procesado:', carreraId, '✅');
    console.log('amount original:', data.amount, '→ procesado:', amount, '✅');
    console.log('billingCycle:', data.billingCycle, '✅');
    console.log('Errores encontrados:', errors);

    return errors;
  }

  async createUalaOrder(userId, carreraId, amount, billingCycle, carreraName) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const validationErrors = this.validatePaymentData({
        userId, carreraId, amount, billingCycle
      });

      if (validationErrors.length > 0) {
        throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
      }

      const existingSub = await client.query(
        `SELECT id, status FROM subscriptions_arg 
         WHERE user_id = $1 AND carrera_id = $2 AND status IN ('activo', 'procesando')`,
        [userId, carreraId]
      );

      if (existingSub.rows.length > 0) {
        const status = existingSub.rows[0].status;
        if (status === 'activo') {
          throw new Error('Ya tienes una suscripción activa para esta carrera');
        } else if (status === 'procesando') {
          throw new Error('Ya tienes una suscripción en proceso para esta carrera. Revisa tu historial de pagos.');
        }
      }

      const paymentResult = await client.query(
        `INSERT INTO payments_arg 
         (user_id, carrera_id, amount, currency, payment_method, payment_status, billing_cycle)
         VALUES ($1, $2, $3, 'ARS', 'uala_bis', 'pendiente', $4)
         RETURNING id`,
        [userId, carreraId, amount, billingCycle]
      );

      const paymentId = paymentResult.rows[0].id;

      const { success: callbackSuccess, fail: callbackFail } = ualaBisConfig.getCallbackUrls(paymentId);

      const orderData = {
        amount: parseFloat(amount),
        description: `${carreraName} - Plan ${billingCycle === 'month' ? 'Mensual' : 'Anual'}`,
        callback_fail: callbackFail,
        callback_success: callbackSuccess,
        notification_url: ualaBisConfig.getWebhookUrl(),
        external_reference: `PAY_${paymentId}_USER_${userId}_CARRERA_${carreraId}`
      };

      console.log('📤 Creando orden en Ualá Bis:', {
        ...orderData,
        notification_url: orderData.notification_url
      });

      console.log('🔄 Llamando a ualaBisConfig.createOrder...');
      const order = await ualaBisConfig.createOrder(orderData);

      console.log('📦 Orden recibida en service:', {
        uuid: order?.uuid,
        status: order?.status,
        checkout_link: order?.links?.checkout_link
      });

      if (!order || !order.uuid) {
        console.error('❌ Orden inválida o sin UUID');
        throw new Error('Respuesta inválida de Ualá Bis - sin UUID');
      }

      const checkoutUrl = order.links?.checkout_link;
      if (!checkoutUrl) {
        console.error('❌ No se encontró checkout_link en la orden');
        console.error('Links disponibles:', order.links);
        throw new Error('Respuesta inválida de Ualá Bis - sin URL de checkout');
      }

      console.log(`✅ Validación exitosa - UUID: ${order.uuid}, URL: ${checkoutUrl}`);

      await client.query(
        `UPDATE payments_arg 
         SET external_payment_id = $1, 
             external_payment_url = $2, 
             payment_status = 'procesando'
         WHERE id = $3`,
        [order.uuid, checkoutUrl, paymentId]
      );

      await client.query('COMMIT');

      console.log(`✅ Orden Ualá creada exitosamente: ${order.uuid}`);

      return {
        success: true,
        paymentUrl: checkoutUrl,
        paymentId: paymentId,
        orderId: order.uuid
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creando orden Ualá:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async processBankTransfer(userId, carreraId, amount, billingCycle, transferData, imageUrl) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const validationErrors = this.validatePaymentData({
        userId, carreraId, amount, billingCycle
      });

      if (validationErrors.length > 0) {
        throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
      }

      const existingSub = await client.query(
        `SELECT id, status FROM subscriptions_arg 
         WHERE user_id = $1 AND carrera_id = $2 AND status IN ('activo', 'procesando')`,
        [userId, carreraId]
      );

      if (existingSub.rows.length > 0) {
        const status = existingSub.rows[0].status;
        if (status === 'activo') {
          throw new Error('Ya tienes una suscripción activa para esta carrera');
        } else if (status === 'procesando') {
          throw new Error('Ya tienes una suscripción en proceso para esta carrera. Revisa tu historial de pagos.');
        }
      }

      const paymentResult = await client.query(
        `INSERT INTO payments_arg 
         (user_id, carrera_id, amount, currency, payment_method, payment_status, 
          billing_cycle, transfer_details, transfer_image_url)
         VALUES ($1, $2, $3, 'ARS', 'bank_transfer', 'en_revision_manual', $4, $5, $6)
         RETURNING id`,
        [userId, carreraId, amount, billingCycle, JSON.stringify(transferData), imageUrl]
      );

      const paymentId = paymentResult.rows[0].id;

      const endDateQuery = billingCycle === 'month' 
        ? "CURRENT_TIMESTAMP + INTERVAL '1 month'"
        : "CURRENT_TIMESTAMP + INTERVAL '1 year'";

      const subscriptionResult = await client.query(
        `INSERT INTO subscriptions_arg 
         (user_id, carrera_id, payment_id, status, start_date, end_date)
         VALUES ($1, $2, $3, 'procesando', CURRENT_TIMESTAMP, ${endDateQuery})
         RETURNING id`,
        [userId, carreraId, paymentId]
      );

      const subscriptionId = subscriptionResult.rows[0].id;

      await client.query('COMMIT');

      console.log(`✅ Transferencia registrada - Payment ID: ${paymentId}, Subscription ID: ${subscriptionId}`);
      console.log(`✅ Suscripción creada con estado "procesando" para evitar compras duplicadas`);

      return {
        success: true,
        paymentId: paymentId,
        subscriptionId: subscriptionId,
        message: 'Transferencia registrada. Será revisada en 24-48 horas.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error procesando transferencia bancaria:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmPayment(paymentId, source = 'webhook') {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const paymentResult = await client.query(
        `SELECT user_id, carrera_id, billing_cycle, payment_status, external_payment_id
        FROM payments_arg 
        WHERE id = $1 FOR UPDATE`,
        [paymentId]
        );

        if (paymentResult.rows.length === 0) {
        throw new Error(`Pago ${paymentId} no encontrado`);
        }

        const payment = paymentResult.rows[0];

        if (payment.payment_status === 'completado') {
        console.log(`⚠️ Pago ${paymentId} ya estaba completado`);
        await client.query('COMMIT');
        return { success: true, alreadyCompleted: true };
        }

        const userResult = await client.query(
        'SELECT id_rol FROM usuario WHERE id_user = $1',
        [payment.user_id]
        );

        if (userResult.rows.length === 0) {
        throw new Error(`Usuario ${payment.user_id} no encontrado`);
        }

        const currentRole = userResult.rows[0].id_rol;

        if (source === 'webhook' && payment.external_payment_id) {
        try {
            const order = await ualaBisConfig.getOrder(payment.external_payment_id);
            
            const paidStatuses = ['PAID', 'COMPLETED', 'SUCCESS', 'PAGADA'];
            if (!order.status || !paidStatuses.includes(order.status.toUpperCase())) {
            throw new Error(`Estado no válido en Ualá: ${order.status}`);
            }
        } catch (verifyError) {
            console.error('❌ Error verificando con Ualá:', verifyError);
            if (process.env.NODE_ENV === 'production') {
            throw verifyError;
            }
        }
        }

        await client.query(
        `UPDATE payments_arg 
        SET payment_status = 'completado', 
            payment_date = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [paymentId]
        );

        const endDateQuery = payment.billing_cycle === 'month' 
        ? "CURRENT_TIMESTAMP + INTERVAL '1 month'"
        : "CURRENT_TIMESTAMP + INTERVAL '1 year'";

        const subResult = await client.query(
        `INSERT INTO subscriptions_arg 
        (user_id, carrera_id, payment_id, status, start_date, end_date)
        VALUES ($1, $2, $3, 'activo', CURRENT_TIMESTAMP, ${endDateQuery})
        ON CONFLICT (user_id, carrera_id, status) 
        WHERE status = 'activo'
        DO UPDATE SET 
            payment_id = $3,
            end_date = ${endDateQuery},
            updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [payment.user_id, payment.carrera_id, paymentId]
        );

        if (currentRole === 1) {
        await client.query(
            'UPDATE usuario SET id_rol = 2 WHERE id_user = $1',
            [payment.user_id]
        );
        
        console.log(`✅ Usuario ${payment.user_id} promovido de rol 1 a rol 2`);
        } else {
        console.log(`ℹ️ Usuario ${payment.user_id} ya tiene rol ${currentRole}, no se cambia`);
        }

        await client.query('COMMIT');

        console.log(`✅ Pago ${paymentId} confirmado desde ${source}`);
        console.log(`✅ Suscripción creada/actualizada: ${subResult.rows[0].id}`);

        return { 
        success: true, 
        subscriptionId: subResult.rows[0].id,
        roleChanged: currentRole === 1
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
  }

  async failPayment(paymentId, reason) {
    try {
      // Primero obtener datos del pago para verificar si es Ualá
      const paymentData = await pool.query(
        'SELECT payment_method, user_id FROM payments_arg WHERE id = $1',
        [paymentId]
      );

      if (paymentData.rows.length === 0) {
        throw new Error(`Pago ${paymentId} no encontrado`);
      }

      const payment = paymentData.rows[0];

      await pool.query(
        `UPDATE payments_arg 
         SET payment_status = 'fallido',
             admin_notes = $2
         WHERE id = $1`,
        [paymentId, reason]
      );

      console.log(`❌ Pago ${paymentId} marcado como fallido`);

      if (payment.payment_method === 'uala_bis') {
        try {
          await argentinaEmailService.sendUalaPaymentFailedFromId(paymentId);
          console.log(`📧 Email de pago Ualá fallido enviado para pago ${paymentId}`);
        } catch (emailError) {
          console.error('❌ Error enviando email de pago Ualá fallido:', emailError);
          // No fallar la operación principal por email, solo logear
        }
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

export default new ArgentinaPaymentService();