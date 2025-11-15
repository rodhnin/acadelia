import pool from '../../lib/dbPool.js';
import { getExchangeRate } from '../../utils/currencyConverter.js';
import { googleDriveService } from '../../utils/googleDriveService.js';
import { PaddleService } from '../../services/pagos/paddleService.js';
import { emailService } from '../../services/email/emailService.js';

/**
 * Procesa datos de transacción de Paddle y los guarda en la base de datos
 * @param {Object} eventData - Datos del evento de Paddle
 * @returns {Promise<boolean>} - true si se procesó correctamente
 */
export async function handleTransaction(eventData) {
  try {
    const paymentData = eventData.data;
    
    const primaryItem = paymentData.items?.[0];
    const lineItem = paymentData.details?.line_items?.[0];
    
    const transaction_id = paymentData.id;
    const price_id = primaryItem?.price_id;
    const product_id = lineItem?.product?.id;
    const product_name = lineItem?.product?.name;
    const invoice_id = paymentData.invoice_id;
    const invoice_number = paymentData.invoice_number;
    
    const isPaymentFailed = eventData.event_type === 'transaction.payment_failed';
    
    const originalAmount = parseFloat(paymentData.details?.totals?.grand_total) / 100;
    const currency_code = paymentData.currency_code;
    
    let amount, tax_amount, fee_amount, earnings, exchange_rate, amount_eur, tax_amount_eur, fee_amount_eur, earnings_eur, tax_rate;
    
    if (isPaymentFailed) {
      amount = 0;
      tax_amount = 0;
      fee_amount = 0;
      earnings = 0;
      exchange_rate = 0;
      amount_eur = 0;
      tax_amount_eur = 0;
      fee_amount_eur = 0;
      earnings_eur = 0;
      tax_rate = 0;
      
      console.log(`🔴 Transacción fallida detectada: ${transaction_id}.`);
      console.log(`   Moneda original: ${currency_code}, Monto original rechazado: ${originalAmount}`);
      console.log(`   Todos los valores monetarios serán almacenados como 0`);
    } 
    // TRANSACCIONES NORMALES: Procesamiento regular
    else {
      amount = originalAmount;
      tax_amount = parseFloat(paymentData.details?.totals?.tax) / 100;
      tax_rate = lineItem?.tax_rate ? parseFloat(lineItem.tax_rate) : null;
      fee_amount = parseFloat(paymentData.details?.totals?.fee) / 100;
      earnings = parseFloat(paymentData.details?.totals?.earnings) / 100;
      
      exchange_rate = 1; // Valor predeterminado para EUR
      amount_eur = amount;
      tax_amount_eur = tax_amount;
      fee_amount_eur = fee_amount;
      earnings_eur = earnings;
      
      // Si la moneda no es EUR, determinar tasa de cambio y convertir
      if (currency_code !== 'EUR') {
        console.log(`💱 Convertir ${amount} ${currency_code} a EUR...`);
        
        // CAMBIO IMPORTANTE: Si es USD, usar siempre Frankfurter API
        if (currency_code === 'USD') {
          // Siempre usar Frankfurter API para USD-EUR
          try {
            console.log(`⚠️ Moneda USD detectada: Ignorando tasa de Paddle y usando Frankfurter API`);
            
            exchange_rate = await getExchangeRate(currency_code, 'EUR');
            amount_eur = amount * exchange_rate;
            
            console.log(`   Tasa obtenida de Frankfurter API: 1 ${currency_code} = ${exchange_rate} EUR`);
            
            if (paymentData.details?.payout_totals?.exchange_rate) {
              const paddleRate = parseFloat(paymentData.details.payout_totals.exchange_rate);
              console.log(`   Tasa incorrecta ignorada de Paddle: 1 ${currency_code} = ${paddleRate} EUR`);
            }
          } catch (convError) {
            console.warn(`❌ ERROR: No se pudo obtener tasa de cambio para ${currency_code}->EUR:`, convError);
            
            exchange_rate = 0.91;
            amount_eur = amount * exchange_rate;
            console.log(`   Usando tasa de respaldo: 1 ${currency_code} = ${exchange_rate} EUR`);
          }
        }
        else {
          // Opción 1: Usar datos de Paddle si están disponibles
          if (paymentData.details?.payout_totals?.currency_code === 'EUR') {
            const payoutTotal = parseFloat(paymentData.details.payout_totals.total) / 100;
            exchange_rate = payoutTotal / amount;
            amount_eur = payoutTotal;
            
            console.log(`✅ OPCIÓN 1: Usando datos de Paddle para conversión directa a EUR`);
            console.log(`   Paddle proporcionó total en EUR: ${payoutTotal}`);
            console.log(`   Tasa calculada: 1 ${currency_code} = ${exchange_rate} EUR`);
          } 
          // Opción 2: Si Paddle proporciona una tasa de cambio explícita
          else if (paymentData.details?.payout_totals?.exchange_rate) {
            exchange_rate = parseFloat(paymentData.details.payout_totals.exchange_rate);
            amount_eur = amount * exchange_rate;
            
            console.log(`✅ OPCIÓN 2: Usando tasa de cambio explícita de Paddle`);
            console.log(`   Tasa proporcionada por Paddle: 1 ${currency_code} = ${exchange_rate} EUR`);
          } 
          // Opción 3: Usar Frankfurter API para conversión como respaldo
          else {
            try {
              console.log(`⚠️ OPCIÓN 3: Paddle no proporcionó datos de conversión, usando Frankfurter API`);
              
              exchange_rate = await getExchangeRate(currency_code, 'EUR');
              amount_eur = amount * exchange_rate;
              
              console.log(`   Tasa obtenida de Frankfurter: 1 ${currency_code} = ${exchange_rate} EUR`);
            } catch (convError) {
              console.warn(`❌ ERROR: No se pudo obtener tasa de cambio para ${currency_code}->EUR:`, convError);
              console.log(`   Usando tasa predeterminada: 1 ${currency_code} = ${exchange_rate} EUR`);
              // Mantener los valores predeterminados
            }
          }
        }
        
        tax_amount_eur = tax_amount * exchange_rate;
        fee_amount_eur = fee_amount * exchange_rate;
        earnings_eur = earnings * exchange_rate;
        
        console.log(`💰 Valores convertidos a EUR:`);
        console.log(`   Monto: ${amount} ${currency_code} = ${amount_eur} EUR`);
        console.log(`   Impuesto: ${tax_amount} ${currency_code} = ${tax_amount_eur} EUR`);
        console.log(`   Tarifa: ${fee_amount} ${currency_code} = ${fee_amount_eur} EUR`);
        console.log(`   Ganancias: ${earnings} ${currency_code} = ${earnings_eur} EUR`);
      }
      
      amount_eur = parseFloat(amount_eur.toFixed(2));
      tax_amount_eur = parseFloat(tax_amount_eur.toFixed(2));
      fee_amount_eur = parseFloat(fee_amount_eur.toFixed(2));
      earnings_eur = parseFloat(earnings_eur.toFixed(2));
    }
    
    const paymentMethod = paymentData.payments?.[0]?.method_details?.card;
    
    // 1. Intentar obtener del address_id (generalmente contiene el país)
    let country_code = null;
    
    // Si tenemos billing_details o address con country_code, usarlo
    if (paymentData.billing_details?.country_code) {
      country_code = paymentData.billing_details.country_code;
    } else if (paymentData.address?.country_code) {
      country_code = paymentData.address.country_code;
    }
    
    // 2. Si no hay país explícito, intentar inferirlo del código de moneda
    if (!country_code && currency_code) {
      // Mapeo de códigos de moneda a códigos de país
      const currencyToCountry = {
        'EUR': 'ES', // Por defecto para España, aunque no sea preciso para todos
        'USD': 'US',
        'MXN': 'MX',
        'COP': 'CO',
        'ARS': 'AR',
        'CLP': 'CL',
        'PEN': 'PE',
        'VES': 'VE',
        'BOB': 'BO',
        'PYG': 'PY',
        'UYU': 'UY',
        'GTQ': 'GT',
        'HNL': 'HN',
        'NIO': 'NI',
        'CRC': 'CR',
        'PAB': 'PA',
        'DOP': 'DO',
        'SVC': 'SV'
      };
      country_code = currencyToCountry[currency_code] || null;
    }
    
    if (!transaction_id) {
      throw new Error("Falta el ID de transacción en los datos");
    }
    
    if (!isPaymentFailed && (!price_id || !product_id)) {
      throw new Error("Faltan campos esenciales en los datos de la transacción (price_id, product_id)");
    }

    await pool.query(
      `INSERT INTO historial_transacciones 
       (transaction_id, price_id, product_id, amount, currency_code, 
        updated_at, description, interval, product_name, 
        payment_method, last4, id_user, event_type, 
        country_code, tax_amount, tax_rate, fee_amount, 
        earnings, exchange_rate, amount_eur, tax_amount_eur,
        fee_amount_eur, earnings_eur)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
               $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        transaction_id,
        price_id,
        product_id,
        amount,
        currency_code,
        new Date(paymentData.updated_at || paymentData.created_at),
        primaryItem?.price?.description,
        primaryItem?.price?.billing_cycle?.interval,
        product_name,
        paymentMethod?.type,
        paymentMethod?.last4,
        paymentData.custom_data?.id_user,
        eventData.event_type,
        country_code,
        tax_amount,
        tax_rate,
        fee_amount,
        earnings,
        exchange_rate,
        amount_eur,
        tax_amount_eur,
        fee_amount_eur,
        earnings_eur
      ]
    );

    // Diferentes mensajes según el tipo de evento
    if (isPaymentFailed) {
      console.log("💾 Transacción fallida registrada:", transaction_id);
      console.log(`   Todos los valores monetarios almacenados como 0`);
      console.log(`   Moneda original: ${currency_code}, País: ${country_code || 'No determinado'}`);
    } else {
      console.log("💾 Transacción registrada exitosamente:", transaction_id);
      console.log(`   Moneda original: ${currency_code}, Monto: ${amount}, Impuesto: ${tax_amount}`);
      console.log(`   Convertido a EUR: ${amount_eur}, Impuesto EUR: ${tax_amount_eur}`);
      console.log(`   País: ${country_code || 'No determinado'}, Tasa impositiva: ${tax_rate || 'No determinada'}`);
    }
    
    // Variable para guardar la URL de la factura (para usarla en el correo)
    let invoiceUrl = null;
    
    // Procesamiento según tipo de evento
    if (isPaymentFailed) {
      console.log("🔴 Pago fallido detectado, enviando notificación por correo...");
      
      // Esto es solo para fines de visualización en el correo, no afecta lo guardado en BD
      if (!eventData._originalAmount) {
        eventData._originalAmount = originalAmount;
      }
      
      await sendFailedPaymentEmail(eventData);
    } 
    else if (eventData.event_type === 'transaction.completed') {
      if (invoice_id) {
        try {
          console.log(`🧾 Procesando factura para transacción ${transaction_id}, factura ${invoice_id}...`);
          
          // 1. Obtener URL de la factura desde Paddle (como administrador)
          const invoiceResponse = await PaddleService.getInvoiceUrl(transaction_id, null);
          
          if (invoiceResponse && invoiceResponse.success && invoiceResponse.data.url) {
            const paddleInvoiceUrl = invoiceResponse.data.url;
            console.log(`📄 URL de factura obtenida: ${paddleInvoiceUrl}`);
            
            // Guardamos la URL para usarla en el correo
            invoiceUrl = paddleInvoiceUrl;
            
            // 2. Subir la factura a Google Drive
            const transactionDate = new Date(paymentData.updated_at || paymentData.created_at);
            const driveUrl = await googleDriveService.uploadInvoiceFromPaddle(
              paddleInvoiceUrl,
              transaction_id,
              transactionDate
            );
            
            console.log(`🔗 Factura subida a Google Drive: ${driveUrl}`);
            
            // Actualizamos la URL para usar la de Google Drive (más permanente)
            invoiceUrl = driveUrl;
            
            // 3. Guardar la URL de Google Drive en la base de datos
            await pool.query(
              'UPDATE historial_transacciones SET invoice_url = $1 WHERE transaction_id = $2',
              [driveUrl, transaction_id]
            );
            
            paymentData.invoice_url = driveUrl;
            
            console.log(`✅ URL de factura guardada en base de datos para transacción ${transaction_id}`);
          } else {
            console.warn(`⚠️ No se pudo obtener URL de factura para transacción ${transaction_id}`);
          }
        } catch (invoiceError) {
          // No fallamos todo el proceso si hay error con la factura, solo lo registramos
          console.error(`❌ Error procesando factura para transacción ${transaction_id}:`, invoiceError);
        }
      }
      
      // NUEVO: Detectar si es una renovación o una compra inicial
      const isRenewal = paymentData.origin === 'subscription_recurring';
      
      if (isRenewal) {
        console.log("🔄 Renovación automática detectada, enviando correo de confirmación...");
        await sendRenewalConfirmationEmail(eventData);
      } else {
        console.log("🛒 Compra inicial detectada, enviando correo de confirmación...");
        await sendPurchaseConfirmationEmail(eventData);
      }
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error procesando transacción:", error);
    throw error;
  }
}

/**
 * Envía el correo de confirmación de compra si corresponde
 * @param {Object} eventData - Datos del evento de Paddle
 * @returns {Promise<void>}
 */
async function sendPurchaseConfirmationEmail(eventData) {
  try {
    const userId = eventData.data?.custom_data?.id_user;
    
    if (!userId) {
      console.warn("⚠️ No se puede enviar correo de confirmación: ID de usuario no encontrado");
      return;
    }
    
    const userQuery = await pool.query(
      'SELECT correo FROM usuario WHERE id_user = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      console.warn(`⚠️ No se puede enviar correo de confirmación: Usuario #${userId} no encontrado`);
      return;
    }
    
    const userEmail = userQuery.rows[0].correo;
    
    // IMPORTANTE: Intentar obtener la URL de factura directamente de Paddle
    try {
      console.log(`🧾 Intentando obtener URL de factura para el correo de transacción ${eventData.data.id}...`);
      
      const invoiceResponse = await PaddleService.getInvoiceUrl(eventData.data.id, null);
      
      if (invoiceResponse && invoiceResponse.success && invoiceResponse.data.url) {
        eventData.data.invoice_url = invoiceResponse.data.url;
        console.log(`📄 URL de factura Paddle para email: ${eventData.data.invoice_url}`);
      } else {
        console.log(`⚠️ No se pudo obtener URL de factura de Paddle para el correo`);
      }
    } catch (invoiceError) {
      console.error("❌ Error obteniendo URL de factura para correo:", invoiceError);
      
      // Si falla, intentar usar la URL ya almacenada en la base de datos
      try {
        const invoiceQuery = await pool.query(
          'SELECT invoice_url FROM historial_transacciones WHERE transaction_id = $1',
          [eventData.data.id]
        );
        
        if (invoiceQuery.rows.length > 0 && invoiceQuery.rows[0].invoice_url) {
          eventData.data.invoice_url = invoiceQuery.rows[0].invoice_url;
          console.log(`📑 URL de factura recuperada de BD para email: ${eventData.data.invoice_url}`);
        }
      } catch (dbError) {
        console.error("❌ Error obteniendo URL de factura desde BD:", dbError);
      }
    }
    
    console.log(`📧 Enviando correo de confirmación de compra a ${userEmail}`);
    
    await emailService.sendPurchaseConfirmationEmail(userEmail, eventData);
    
    console.log(`✅ Correo de confirmación enviado exitosamente a ${userEmail}`);
  } catch (error) {
    // No fallamos todo el proceso si hay error con el correo, solo lo registramos
    console.error("❌ Error enviando correo de confirmación:", error);
  }
}

/**
 * Envía el correo de notificación de pago fallido
 * @param {Object} eventData - Datos del evento de Paddle
 * @returns {Promise<void>}
 */
async function sendFailedPaymentEmail(eventData) {
  try {
    const userId = eventData.data?.custom_data?.id_user;
    
    if (!userId) {
      console.warn("⚠️ No se puede enviar correo de notificación de pago fallido: ID de usuario no encontrado");
      return;
    }
    
    const userQuery = await pool.query(
      'SELECT correo FROM usuario WHERE id_user = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      console.warn(`⚠️ No se puede enviar correo de notificación de pago fallido: Usuario #${userId} no encontrado`);
      return;
    }
    
    const userEmail = userQuery.rows[0].correo;
    
    console.log(`📧 Enviando correo de notificación de pago fallido a ${userEmail}`);
    
    await emailService.sendFailedPaymentEmail(userEmail, eventData);
    
    console.log(`✅ Correo de notificación de pago fallido enviado exitosamente a ${userEmail}`);
  } catch (error) {
    // No fallamos todo el proceso si hay error con el correo, solo lo registramos
    console.error("❌ Error enviando correo de notificación de pago fallido:", error);
  }
}

/**
 * Envía el correo de confirmación de renovación automática
 * @param {Object} eventData - Datos del evento de Paddle
 * @returns {Promise<void>}
 */
async function sendRenewalConfirmationEmail(eventData) {
  try {
    const userId = eventData.data?.custom_data?.id_user;
    
    if (!userId) {
      console.warn("⚠️ No se puede enviar correo de renovación: ID de usuario no encontrado");
      return;
    }
    
    const userQuery = await pool.query(
      'SELECT correo FROM usuario WHERE id_user = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      console.warn(`⚠️ No se puede enviar correo de renovación: Usuario #${userId} no encontrado`);
      return;
    }
    
    const userEmail = userQuery.rows[0].correo;
    
    // IMPORTANTE: Intentar obtener la URL de factura directamente de Paddle
    try {
      console.log(`🧾 Intentando obtener URL de factura para el correo de renovación ${eventData.data.id}...`);
      
      const invoiceResponse = await PaddleService.getInvoiceUrl(eventData.data.id, null);
      
      if (invoiceResponse && invoiceResponse.success && invoiceResponse.data.url) {
        eventData.data.invoice_url = invoiceResponse.data.url;
        console.log(`📄 URL de factura Paddle para email de renovación: ${eventData.data.invoice_url}`);
      } else {
        console.log(`⚠️ No se pudo obtener URL de factura de Paddle para el correo de renovación`);
      }
    } catch (invoiceError) {
      console.error("❌ Error obteniendo URL de factura para correo de renovación:", invoiceError);
      
      // Si falla, intentar usar la URL ya almacenada en la base de datos
      try {
        const invoiceQuery = await pool.query(
          'SELECT invoice_url FROM historial_transacciones WHERE transaction_id = $1',
          [eventData.data.id]
        );
        
        if (invoiceQuery.rows.length > 0 && invoiceQuery.rows[0].invoice_url) {
          eventData.data.invoice_url = invoiceQuery.rows[0].invoice_url;
          console.log(`📑 URL de factura recuperada de BD para email de renovación: ${eventData.data.invoice_url}`);
        }
      } catch (dbError) {
        console.error("❌ Error obteniendo URL de factura desde BD para renovación:", dbError);
      }
    }
    
    console.log(`📧 Enviando correo de confirmación de renovación a ${userEmail}`);
    
    await emailService.sendRenewalConfirmationEmail(userEmail, eventData);
    
    console.log(`✅ Correo de confirmación de renovación enviado exitosamente a ${userEmail}`);
  } catch (error) {
    // No fallamos todo el proceso si hay error con el correo, solo lo registramos
    console.error("❌ Error enviando correo de confirmación de renovación:", error);
  }
}