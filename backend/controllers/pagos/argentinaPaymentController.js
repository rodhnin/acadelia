// backend/controllers/pagos/argentinaPaymentController.js
import argentinaPaymentService from '../../services/pagos/argentinaPaymentService.js';
import { googleDriveService } from '../../utils/googleDriveService.js';
import { argentinaEmailService } from '../../services/email/argentinaEmailService.js';
import pool from '../../lib/dbPool.js';
import fs from 'fs/promises';

// Crear orden con Ualá
export const createUalaOrder = async (req, res) => {
  try {
    const { carreraId, billingCycle } = req.body;
    const userId = req.user.id_user;

    // Validaciones
    if (!carreraId || !billingCycle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      });
    }

    // Obtener información de la carrera usando las nuevas columnas de precios ARS
    const carreraResult = await pool.query(
      `SELECT 
        id_carrera, 
        nombre, 
        CASE 
          WHEN $2 = 'month' THEN price_month_ars 
          WHEN $2 = 'year' THEN price_year_ars 
        END as price
       FROM carrera
       WHERE id_carrera = $1`,
      [carreraId, billingCycle]
    );

    if (carreraResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Carrera no encontrada' 
      });
    }

    const carrera = carreraResult.rows[0];
    
    if (!carrera.price || carrera.price <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Precio no válido para la carrera seleccionada' 
      });
    }

    console.log(`📊 Precio obtenido: ${carrera.price} ARS para ${carrera.nombre} (${billingCycle})`);

    // ✅ CREAR ORDEN CON MEJOR MANEJO DE ERRORES
    try {
      const result = await argentinaPaymentService.createUalaOrder(
        userId, 
        carreraId, 
        carrera.price, 
        billingCycle,
        carrera.nombre
      );

      console.log('✅ Orden creada exitosamente:', result);
      res.json(result);

    } catch (ualaError) {
      console.error('❌ Error específico de Ualá:', ualaError);

      // ✅ MANEJO ESPECÍFICO DE ERRORES DE UALÁ
      if (ualaError.message?.includes('temporal') || 
          ualaError.message?.includes('Reintentando') ||
          ualaError.isRetryable) {
        
        // Error temporal/reintentable
        return res.status(503).json({
          success: false,
          error: ualaError.message || 'Servicio temporalmente no disponible',
          errorType: 'temporary',
          retryable: true,
          details: {
            message: 'La API de Ualá Bis está experimentando problemas temporales. Por favor intenta de nuevo en unos momentos.',
            suggestion: 'Puedes usar transferencia bancaria como alternativa.'
          }
        });
        
      } else if (ualaError.statusCode === 401 || ualaError.message?.includes('autenticación')) {
        
        // Error de configuración/autenticación
        return res.status(500).json({
          success: false,
          error: 'Error de configuración del sistema de pagos',
          errorType: 'configuration',
          retryable: false,
          details: {
            message: 'Hay un problema con la configuración del sistema de pagos.',
            suggestion: 'Por favor contacta al soporte o usa transferencia bancaria.'
          }
        });
        
      } else if (ualaError.statusCode === 400) {
        
        // Error de datos
        return res.status(400).json({
          success: false,
          error: 'Error en los datos del pago',
          errorType: 'validation',
          retryable: false,
          details: {
            message: 'Los datos enviados no son válidos.',
            suggestion: 'Verifica tu selección e intenta de nuevo.'
          }
        });
        
      } else {
        
        // Error genérico
        return res.status(500).json({
          success: false,
          error: 'Error al procesar el pago con Ualá Bis',
          errorType: 'unknown',
          retryable: true,
          details: {
            message: 'Ocurrió un error inesperado al procesar el pago.',
            suggestion: 'Intenta de nuevo o usa transferencia bancaria como alternativa.',
            originalError: process.env.NODE_ENV === 'development' ? ualaError.message : undefined
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general en createUalaOrder:', error);
    
    // ✅ ERROR GENERAL DEL SISTEMA
    if (error.message.includes('suscripción activa')) {
      return res.status(409).json({ 
        success: false, 
        error: error.message,
        errorType: 'duplicate',
        retryable: false
      });
    }

    // Error de base de datos u otro error del sistema
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      errorType: 'system',
      retryable: true,
      details: {
        message: 'Ocurrió un error en el servidor.',
        suggestion: 'Por favor intenta de nuevo en unos momentos.',
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// ✅ NUEVO: Endpoint para obtener precios de una carrera
export const getCarreraPrices = async (req, res) => {
  try {
    const { carreraId } = req.params;

    const result = await pool.query(
      `SELECT 
        id_carrera,
        nombre,
        price_month_ars,
        price_year_ars,
        (price_year_ars::float / price_month_ars::float) as discount_percentage
       FROM carrera 
       WHERE id_carrera = $1`,
      [carreraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Carrera no encontrada'
      });
    }

    const carrera = result.rows[0];
    
    res.json({
      success: true,
      carrera: {
        id: carrera.id_carrera,
        nombre: carrera.nombre,
        prices: {
          monthly: carrera.price_month_ars,
          yearly: carrera.price_year_ars,
          yearlyDiscountPercent: Math.round((1 - carrera.discount_percentage) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo precios de carrera:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios'
    });
  }
};

// ✅ NUEVO: Endpoint para obtener todas las carreras con precios
export const getAllCarrerasWithPrices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id_carrera,
        nombre,
        descripcion,
        price_month_ars,
        price_year_ars,
        imagen,
        (price_year_ars::float / price_month_ars::float) as discount_percentage
       FROM carrera 
       WHERE price_month_ars IS NOT NULL 
       ORDER BY id_carrera`
    );

    const carreras = result.rows.map(carrera => ({
      id: carrera.id_carrera,
      nombre: carrera.nombre,
      descripcion: carrera.descripcion,
      imagen: carrera.imagen,
      prices: {
        monthly: carrera.price_month_ars,
        yearly: carrera.price_year_ars,
        yearlyDiscountPercent: Math.round((1 - carrera.discount_percentage) * 100)
      }
    }));

    res.json({
      success: true,
      carreras
    });

  } catch (error) {
    console.error('Error obteniendo carreras con precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener carreras'
    });
  }
};

// Procesar transferencia bancaria (sin cambios en la lógica principal)
export const submitBankTransfer = async (req, res) => {
  try {
    const { 
      carreraId, 
      billingCycle, 
      accountHolder, 
      amount, 
      transferDate, 
      referenceNumber 
    } = req.body;
    const userId = req.user.id_user;
    const transferImage = req.file;

    // ✅ DEBUG: Ver qué llega exactamente
    console.log('📨 Datos recibidos en submitBankTransfer:');
    console.log('carreraId:', carreraId, '(tipo:', typeof carreraId, ')');
    console.log('billingCycle:', billingCycle);
    console.log('accountHolder:', accountHolder);
    console.log('amount:', amount, '(tipo:', typeof amount, ')');
    console.log('transferDate:', transferDate);
    console.log('referenceNumber:', referenceNumber);
    console.log('userId:', userId);
    console.log('transferImage:', transferImage ? transferImage.originalname : 'No file');

    // ✅ CONVERSIÓN DE TIPOS ANTES DE VALIDAR
    const processedData = {
      carreraId: parseInt(carreraId), // Convertir string a number
      billingCycle,
      accountHolder,
      amount: parseFloat(amount), // Convertir string a number
      transferDate,
      referenceNumber
    };

    console.log('📋 Datos procesados:');
    console.log('carreraId:', processedData.carreraId, '(tipo:', typeof processedData.carreraId, ')');
    console.log('amount:', processedData.amount, '(tipo:', typeof processedData.amount, ')');

    // Validaciones
    const errors = [];
    if (!processedData.carreraId || isNaN(processedData.carreraId)) {
      errors.push('Carrera requerida');
    }
    if (!processedData.billingCycle) errors.push('Ciclo requerido');
    if (!processedData.accountHolder?.trim()) errors.push('Titular requerido');
    if (!processedData.amount || isNaN(processedData.amount) || processedData.amount <= 0) {
      errors.push('Monto inválido');
    }
    if (!processedData.transferDate) errors.push('Fecha requerida');
    if (!processedData.referenceNumber?.trim()) errors.push('Comprobante requerido');
    if (!transferImage) errors.push('Imagen requerida');

    if (errors.length > 0) {
      console.log('❌ Errores de validación:', errors);
      return res.status(400).json({ 
        success: false, 
        error: errors.join(', ')
      });
    }

    // Validar imagen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(transferImage.mimetype)) {
      await fs.unlink(transferImage.path).catch(() => {});
      return res.status(400).json({ 
        success: false, 
        error: 'Solo JPG o PNG' 
      });
    }

    if (transferImage.size > 5 * 1024 * 1024) {
      await fs.unlink(transferImage.path).catch(() => {});
      return res.status(400).json({ 
        success: false, 
        error: 'Máximo 5MB' 
      });
    }

    // Subir imagen
    let imageUrl;
    try {
      imageUrl = await googleDriveService.uploadTransferProof(
        transferImage.path,
        `transfer_${userId}_${Date.now()}.${transferImage.mimetype.split('/')[1]}`
      );
      console.log('📤 Comprobante subido:', imageUrl);
    } finally {
      await fs.unlink(transferImage.path).catch(() => {});
    }

    // Procesar datos para el service
    const transferData = {
      accountHolder: processedData.accountHolder.trim(),
      amount: processedData.amount,
      transferDate: processedData.transferDate,
      referenceNumber: processedData.referenceNumber.trim()
    };

    console.log('📋 Enviando al service:');
    console.log('userId:', userId);
    console.log('carreraId:', processedData.carreraId);
    console.log('amount:', processedData.amount);
    console.log('billingCycle:', processedData.billingCycle);
    console.log('transferData:', transferData);
    console.log('imageUrl:', imageUrl);

    const result = await argentinaPaymentService.processBankTransfer(
      userId,
      processedData.carreraId,
      processedData.amount,
      processedData.billingCycle,
      transferData,
      imageUrl
    );

    console.log('✅ Transferencia procesada exitosamente:', result);

    // ✅ NUEVO: Enviar email de pago en revisión
    try {
      await argentinaEmailService.sendPaymentUnderReviewFromId(result.paymentId);
      console.log(`📧 Email de pago en revisión enviado para pago ${result.paymentId}`);
      result.email_sent = true; // Agregar al resultado
    } catch (emailError) {
      console.error('❌ Error enviando email de pago en revisión:', emailError);
      result.email_sent = false; // Indicar que falló
      result.email_error = emailError.message;
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error en submitBankTransfer:', error);
    
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({ 
      success: false, 
      error: 'Error al procesar transferencia',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Callbacks de Ualá (sin cambios)
export const handleUalaCallback = async (req, res) => {
  try {
    const { payment_id } = req.query;
    const isSuccess = req.path.includes('success');

    if (!payment_id || isNaN(payment_id)) {
      return res.redirect('/payment-error');
    }

    if (isSuccess) {
      res.redirect(`/payment-success?id=${payment_id}`);
    } else {
      await argentinaPaymentService.failPayment(payment_id, 'Cancelado por usuario');
      res.redirect('/payment-cancelled');
    }

  } catch (error) {
    console.error('Error en callback:', error);
    res.redirect('/payment-error');
  }
};

// Obtener pagos del usuario (sin cambios)
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id_user;
    
    const result = await pool.query(
      `SELECT 
        p.id,
        p.amount,
        p.currency,
        p.payment_method,
        p.payment_status,
        p.billing_cycle,
        p.payment_date,
        p.created_at,
        p.external_payment_url,
        p.admin_notes,
        c.nombre as carrera_nombre
       FROM payments_arg p
       LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    console.log('📊 Pagos obtenidos con URLs:', result.rows.map(p => ({
      id: p.id,
      payment_method: p.payment_method,
      payment_status: p.payment_status,
      external_payment_url: p.external_payment_url ? 'SÍ TIENE URL' : 'NO TIENE URL'
    })));

    res.json({
      success: true,
      payments: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo pagos del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de pagos'
    });
  }
};

// Obtener suscripciones del usuario (sin cambios)
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id_user;
    
    const result = await pool.query(
      `SELECT 
        s.id,
        s.status,
        s.start_date,
        s.end_date,
        c.nombre as carrera_nombre,
        p.amount,
        p.payment_method,
        p.billing_cycle
       FROM subscriptions_arg s
       LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
       LEFT JOIN payments_arg p ON s.payment_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      subscriptions: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo suscripciones del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripciones'
    });
  }
};