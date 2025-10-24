// backend/controllers/pagos/argentinaWebhookController.js
import hookdeckValidator from '../../middlewares/hookdeckValidator.js';
import argentinaPaymentService from '../../services/pagos/argentinaPaymentService.js';
import pool from '../../lib/dbPool.js';

// Verificar eventos duplicados
async function checkDuplicateEvent(eventId) {
  try {
    const result = await pool.query(
      `INSERT INTO webhook_events_arg (event_id) 
       VALUES ($1) 
       ON CONFLICT (event_id) DO NOTHING 
       RETURNING event_id`,
      [eventId]
    );

    return result.rows.length === 0; // true si es duplicado
  } catch (error) {
    console.error('Error verificando duplicado:', error);
    return false;
  }
}

export const handleUalaWebhook = async (req, res) => {
  try {
    // ✅ VALIDACIÓN CON HEADERS REALES
    if (!hookdeckValidator.skipValidation()) {
      if (!hookdeckValidator.validateSignature(req)) {
        console.error('❌ Firma de Hookdeck inválida');
        return res.status(401).json({ error: 'Firma inválida' });
      }
    } else {
      console.log('⚠️ Validación de Hookdeck omitida');
    }

    // Obtener info del evento con headers corregidos
    const eventInfo = hookdeckValidator.getEventInfo(req);
    
    console.log('📨 Webhook recibido:', {
      eventId: eventInfo.eventId,
      attempt: eventInfo.attemptNumber,
      verified: eventInfo.verified,
      body: req.body
    });

    // Verificar duplicados
    if (await checkDuplicateEvent(eventInfo.eventId)) {
      console.log('⚠️ Evento duplicado, ignorando');
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Procesar evento
    const eventData = req.body;
    console.log('📝 Payload completo:', JSON.stringify(eventData, null, 2));

    // Resto del código sin cambios...
    const eventType = eventData.event_type || 
                     eventData.type || 
                     eventData.event ||
                     eventData.status;

    console.log('🎯 Tipo de evento:', eventType);

    // Procesar según tipo
    if (['order.paid', 'payment.success', 'PAID', 'COMPLETED'].includes(eventType)) {
      await handlePaymentSuccess(eventData);
    } else if (['order.failed', 'payment.failed', 'FAILED', 'REJECTED'].includes(eventType)) {
      await handlePaymentFailed(eventData);
    } else {
      console.log(`⚠️ Evento no manejado: ${eventType}`);
    }

    // Siempre responder 200
    res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    // Responder 200 para evitar reintentos
    res.status(200).json({ received: false, error: error.message });
  }
};

async function handlePaymentSuccess(eventData) {
  try {
    // 🆕 MEJORADO: Múltiples formas de extraer la referencia externa
    const order = eventData.order || eventData;
    const externalRef = order.external_reference || 
                       order.reference || 
                       order.ref_number ||
                       order.uuid ||
                       eventData.uuid ||
                       eventData.ref_number;

    console.log('🔍 Intentando extraer referencia de:', {
      order_external_reference: order.external_reference,
      order_reference: order.reference,
      order_ref_number: order.ref_number,
      order_uuid: order.uuid,
      eventData_uuid: eventData.uuid,
      eventData_ref_number: eventData.ref_number,
      final_externalRef: externalRef
    });

    if (!externalRef) {
      console.error('❌ No se encontró referencia externa en el payload');
      return;
    }

    console.log('🔍 Referencia externa encontrada:', externalRef);

    // 🆕 NUEVO: Buscar por UUID si no hay formato PAY_xxx
    let paymentId;
    
    // Intentar extraer payment_id del formato PAY_xxx
    const match = externalRef.match(/PAY_(\d+)/);
    if (match) {
      paymentId = parseInt(match[1]);
      console.log('💳 Payment ID extraído del formato PAY_xxx:', paymentId);
    } else {
      // 🆕 NUEVO: Buscar en BD por external_payment_id (UUID)
      console.log('🔍 Buscando pago por UUID en BD:', externalRef);
      
      try {
        const paymentQuery = await pool.query(
          'SELECT id FROM payments_arg WHERE external_payment_id = $1',
          [externalRef]
        );
        
        if (paymentQuery.rows.length > 0) {
          paymentId = paymentQuery.rows[0].id;
          console.log('💳 Payment ID encontrado en BD por UUID:', paymentId);
        } else {
          console.error('❌ No se encontró pago con UUID:', externalRef);
          return;
        }
      } catch (dbError) {
        console.error('❌ Error buscando pago en BD:', dbError);
        return;
      }
    }

    // Confirmar pago
    const result = await argentinaPaymentService.confirmPayment(paymentId, 'webhook');
    
    if (result.success && !result.alreadyCompleted) {
      console.log(`✅ Pago ${paymentId} confirmado exitosamente`);
    }

  } catch (error) {
    console.error('❌ Error en handlePaymentSuccess:', error);
    throw error;
  }
}

async function handlePaymentFailed(eventData) {
  try {
    // 🆕 MEJORADO: Múltiples formas de extraer la referencia externa  
    const order = eventData.order || eventData;
    const externalRef = order.external_reference || 
                       order.reference || 
                       order.ref_number ||
                       order.uuid ||
                       eventData.uuid ||
                       eventData.ref_number;

    console.log('🔍 Intentando extraer referencia para pago fallido:', {
      order_external_reference: order.external_reference,
      order_reference: order.reference,  
      order_ref_number: order.ref_number,
      order_uuid: order.uuid,
      eventData_uuid: eventData.uuid,
      eventData_ref_number: eventData.ref_number,
      final_externalRef: externalRef
    });

    if (!externalRef) {
      console.error('❌ No se encontró referencia externa para pago fallido');
      return;
    }

    console.log('🔍 Referencia externa para pago fallido:', externalRef);

    // 🆕 NUEVO: Buscar por UUID si no hay formato PAY_xxx
    let paymentId;
    
    // Intentar extraer payment_id del formato PAY_xxx
    const match = externalRef.match(/PAY_(\d+)/);
    if (match) {
      paymentId = parseInt(match[1]);
      console.log('💳 Payment ID extraído del formato PAY_xxx:', paymentId);
    } else {
      // 🆕 NUEVO: Buscar en BD por external_payment_id (UUID)
      console.log('🔍 Buscando pago fallido por UUID en BD:', externalRef);
      
      try {
        const paymentQuery = await pool.query(
          'SELECT id FROM payments_arg WHERE external_payment_id = $1',
          [externalRef]
        );
        
        if (paymentQuery.rows.length > 0) {
          paymentId = paymentQuery.rows[0].id;
          console.log('💳 Payment ID encontrado en BD por UUID:', paymentId);
        } else {
          console.error('❌ No se encontró pago fallido con UUID:', externalRef);
          return;
        }
      } catch (dbError) {
        console.error('❌ Error buscando pago fallido en BD:', dbError);
        return;
      }
    }

    const reason = order.failure_reason || 
                  order.reason || 
                  eventData.status ||
                  'Pago rechazado por Ualá Bis';

    await argentinaPaymentService.failPayment(paymentId, reason);
    console.log(`❌ Pago ${paymentId} marcado como fallido: ${reason}`);

  } catch (error) {
    console.error('❌ Error en handlePaymentFailed:', error);
  }
}

// Limpiar eventos viejos (ejecutar periódicamente)
export async function cleanupOldEvents() {
  try {
    const result = await pool.query(
      `DELETE FROM webhook_events_arg 
       WHERE processed_at < NOW() - INTERVAL '7 days'
       RETURNING *`
    );
    
    console.log(`🧹 Limpiados ${result.rowCount} eventos antiguos`);
  } catch (error) {
    console.error('Error limpiando eventos:', error);
  }
}