import pool from "../../lib/dbPool.js";
import { emailService } from "../../services/email/emailService.js";

export async function handleSubscription(eventData) {
  const { data, event_type } = eventData;
  const subscriptionId = data.id;
  const { id_user, id_carrera } = data.custom_data || {};

  // Validaciones críticas
  if (!subscriptionId || !id_user || !id_carrera) {
    throw new Error("Datos esenciales faltantes");
  }

  const statusMap = {
    'subscription.created': 'active',
    'subscription.activated': 'active',
    'subscription.paused': 'paused',
    'subscription.resumed': 'active',
    'subscription.canceled': 'canceled',
    'subscription.past_due': 'expired'  // Agregamos el nuevo estado
  };

  const newStatus = statusMap[event_type] || data.status;
  
  try {
    // CAMBIO: En lugar de borrar, actualizamos la suscripción cancelada
    if (event_type === 'subscription.canceled') {
        await pool.query(
            `UPDATE suscripciones 
             SET status = 'canceled', 
                 next_billed_at = NULL, 
                 updated_at = NOW() 
             WHERE subscription_id = $1
             RETURNING id_user, id_carrera`, 
            [subscriptionId]
        );
        
        console.log(`🔄 Suscripción marcada como cancelada: ${subscriptionId}`);
        
        try {
          const userQuery = await pool.query(
            'SELECT correo FROM usuario WHERE id_user = $1',
            [id_user]
          );
          
          if (userQuery.rows.length > 0) {
            const userEmail = userQuery.rows[0].correo;
            
            console.log(`📧 Enviando correo de confirmación de cancelación a ${userEmail}`);
            await emailService.sendCancelConfirmationEmail(userEmail, eventData);
            console.log(`✅ Correo de confirmación enviado exitosamente a ${userEmail}`);
          } else {
            console.warn(`⚠️ No se pudo enviar correo de confirmación: Usuario #${id_user} no encontrado`);
          }
        } catch (emailError) {
          // No fallamos todo el proceso si hay error con el correo, solo lo registramos
          console.error(`❌ Error enviando correo de confirmación: ${emailError.message}`);
        }
        
        return true;
    }

    // NUEVO: Detectar si hay una cancelación programada (scheduled_change)
    let hasCancellationScheduled = false;
    if (event_type === 'subscription.updated' && 
        data.scheduled_change && 
        data.scheduled_change.action === 'cancel') {
      
      console.log(`🔔 Cancelación programada detectada para la suscripción: ${subscriptionId}`);
      hasCancellationScheduled = true;
      
      try {
        const userQuery = await pool.query(
          'SELECT correo FROM usuario WHERE id_user = $1',
          [id_user]
        );
        
        if (userQuery.rows.length > 0) {
          const userEmail = userQuery.rows[0].correo;
          
          console.log(`📧 Enviando correo de cancelación de suscripción a ${userEmail}`);
          await emailService.sendCancelSubscriptionEmail(userEmail, eventData);
          console.log(`✅ Correo de cancelación enviado exitosamente a ${userEmail}`);
        } else {
          console.warn(`⚠️ No se pudo enviar correo de cancelación: Usuario #${id_user} no encontrado`);
        }
      } catch (emailError) {
        // No fallamos todo el proceso si hay error con el correo, solo lo registramos
        console.error(`❌ Error enviando correo de cancelación: ${emailError.message}`);
      }
    }

    if (event_type === 'subscription.updated') {
      // CAMBIO AQUÍ: En lugar de "pending_cancellation", usar "paused" para cancelaciones programadas
      const statusToSet = hasCancellationScheduled ? 'paused' : data.status;
      
      // CAMBIO AQUÍ: Para cancelaciones programadas, conservar el next_billed_at existente
      if (hasCancellationScheduled) {
        // 1. Primero obtenemos el valor actual de next_billed_at
        const currentDataQuery = await pool.query(
          `SELECT next_billed_at FROM suscripciones WHERE subscription_id = $1`,
          [subscriptionId]
        );
        
        // 2. Si hay un valor existente, lo conservamos; de lo contrario, usamos el de Paddle
        const currentNextBilledAt = currentDataQuery.rows.length > 0 
          ? currentDataQuery.rows[0].next_billed_at 
          : null;
        
        // 3. Seleccionamos el valor a utilizar (prioridad al existente)
        const nextBilledAtToUse = currentNextBilledAt || data.next_billed_at;
        
        console.log(`⏰ Manteniendo fecha de próximo cobro: ${nextBilledAtToUse || 'No disponible'}`);
        
        // 4. Actualizamos la suscripción con el status "paused" y manteniendo next_billed_at
        await pool.query(
          `UPDATE suscripciones SET
            updated_at = NOW(),
            status = $1
           WHERE subscription_id = $2`,
          [statusToSet, subscriptionId]
        );
      } else {
        // Actualización normal para otros casos (sin cancelación programada)
        await pool.query(
          `UPDATE suscripciones SET
            updated_at = NOW(),
            next_billed_at = $1,
            status = $2
           WHERE subscription_id = $3`,
          [data.next_billed_at, statusToSet, subscriptionId]
        );
      }
      
      console.log(`✅ Actualización para sub:${subscriptionId} (Estado: ${statusToSet})`);
      return true;
    }

    // 1. Buscar la suscripción existente por ID
    const existingSub = await pool.query(
      `SELECT * FROM suscripciones 
       WHERE subscription_id = $1`,
      [subscriptionId]
    );

    // 2. Si existe: ACTUALIZAR ESTADO
    if (existingSub.rows.length > 0) {
      await pool.query(
        `UPDATE suscripciones SET
          status = $1,
          updated_at = NOW()
         WHERE subscription_id = $2`,
        [newStatus, subscriptionId]
      );
      console.log(`✅ Estado actualizado a ${newStatus} para sub:${subscriptionId}`);
    }
    // 3. Si no existe: CREAR NUEVA (solo para evento created)
    else if (event_type === 'subscription.created') {
      await pool.query(
        `UPDATE suscripciones SET
          status = 'canceled',
          updated_at = NOW()
         WHERE id_user = $1 AND id_carrera = $2 AND status = 'active'`,
        [id_user, id_carrera]
      );

      const item = data.items[0];
      await pool.query(
        `INSERT INTO suscripciones (
          customer_id, subscription_id, status,
          product_id, price_id, interval,
          product_name, next_billed_at, id_user, id_carrera
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          data.customer_id,
          subscriptionId,
          newStatus,
          item.product.id,
          item.price.id,
          item.price.billing_cycle?.interval,
          item.product.name,
          data.next_billed_at,
          id_user,
          id_carrera
        ]
      );
      console.log(`✅ Nueva suscripción creada: ${subscriptionId}`);
    }

    return true;

  } catch (error) {
    console.error("❌ Error en handleSubscription:", error);
    throw error;
  }
}