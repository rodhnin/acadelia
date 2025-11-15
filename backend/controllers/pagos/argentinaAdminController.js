import pool from '../../lib/dbPool.js';
import { argentinaEmailService } from '../../services/email/argentinaEmailService.js';
import { argentinaSubscriptionJob } from '../../services/pagos/argentinaSubscriptionJob.js';

export const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      method, 
      search,
      startDate,
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filtros
    if (status) {
      whereClause += ` AND p.payment_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND p.payment_method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        u.correo ILIKE $${paramIndex} OR 
        pf.nombre ILIKE $${paramIndex} OR 
        pf.apellido ILIKE $${paramIndex} OR
        c.nombre ILIKE $${paramIndex} OR
        p.external_payment_id ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND p.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND p.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Query principal - USANDO ESTRUCTURA REAL: usuario + perfil
    const query = `
      SELECT 
        p.id,
        p.user_id,
        p.carrera_id,
        p.amount,
        p.currency,
        p.payment_method,
        p.payment_status,
        p.billing_cycle,
        p.external_payment_id,
        p.external_payment_url,
        p.transfer_details,
        p.transfer_image_url,
        p.processed_by_admin_id,
        p.admin_notes,
        p.payment_date,
        p.created_at,
        p.updated_at,
        u.correo as email,
        COALESCE(pf.nombre, 'Sin nombre') as nombres,
        COALESCE(pf.apellido, 'Sin apellido') as apellidos,
        c.nombre as carrera_nombre,
        admin_u.correo as processed_by_admin_email
      FROM payments_arg p
      LEFT JOIN usuario u ON p.user_id = u.id_user
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
      LEFT JOIN usuario admin_u ON p.processed_by_admin_id = admin_u.id_user
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments_arg p
      LEFT JOIN usuario u ON p.user_id = u.id_user
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
      ${whereClause}
    `;

    const [paymentsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        payments: paymentsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: total,
          per_page: parseInt(limit),
          has_next: page < totalPages,
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo todos los pagos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo pagos'
    });
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        u.correo ILIKE $${paramIndex} OR 
        pf.nombre ILIKE $${paramIndex} OR 
        pf.apellido ILIKE $${paramIndex} OR
        c.nombre ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        s.id,
        s.user_id,
        s.carrera_id,
        s.payment_id,
        s.status,
        s.start_date,
        s.end_date,
        s.created_at,
        s.updated_at,
        u.correo as email,
        COALESCE(pf.nombre, 'Sin nombre') as nombres,
        COALESCE(pf.apellido, 'Sin apellido') as apellidos,
        pf.id_rol,
        c.nombre as carrera_nombre,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.billing_cycle
      FROM subscriptions_arg s
      LEFT JOIN usuario u ON s.user_id = u.id_user
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
      LEFT JOIN payments_arg p ON s.payment_id = p.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM subscriptions_arg s
      LEFT JOIN usuario u ON s.user_id = u.id_user
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
      ${whereClause}
    `;

    const [subscriptionsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        subscriptions: subscriptionsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: total,
          per_page: parseInt(limit),
          has_next: page < totalPages,
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo todas las suscripciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo suscripciones'
    });
  }
};

export const approveTransfer = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { paymentId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id_user;

    console.log(`👨‍💼 Admin ${adminId} aprobando transferencia ${paymentId}`);

    const paymentCheck = await client.query(
      `SELECT payment_method, payment_status, user_id, carrera_id, billing_cycle 
       FROM payments_arg 
       WHERE id = $1`,
      [paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    const payment = paymentCheck.rows[0];

    if (payment.payment_method !== 'bank_transfer') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden aprobar transferencias bancarias'
      });
    }

    if (payment.payment_status !== 'en_revision_manual') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden aprobar pagos en revisión manual'
      });
    }

    const existingSubCheck = await client.query(
      `SELECT id FROM subscriptions_arg 
       WHERE user_id = $1 AND carrera_id = $2 AND status = 'procesando' AND payment_id = $3`,
      [payment.user_id, payment.carrera_id, paymentId]
    );

    if (existingSubCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No se encontró la suscripción en procesamiento para este pago. Esto puede indicar un problema en el flujo de pagos.'
      });
    }

    const existingSubscriptionId = existingSubCheck.rows[0].id;
    console.log(`✅ Suscripción en procesamiento encontrada: ${existingSubscriptionId}`);

    const userCheck = await client.query(
      'SELECT id_rol FROM perfil WHERE id_usuario = $1',
      [payment.user_id]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Perfil de usuario no encontrado'
      });
    }

    const currentRole = userCheck.rows[0].id_rol;

    // 1. Actualizar el pago a completado
    await client.query(
      `UPDATE payments_arg 
       SET payment_status = 'completado', 
           payment_date = CURRENT_TIMESTAMP,
           processed_by_admin_id = $1
       WHERE id = $2`,
      [adminId, paymentId]
    );

    // 2. Calcular fecha de fin según billing_cycle
    const endDate = new Date();
    if (payment.billing_cycle === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const updateResult = await client.query(
      `UPDATE subscriptions_arg 
       SET status = 'activo',
           start_date = CURRENT_TIMESTAMP,
           end_date = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [endDate, existingSubscriptionId]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        error: 'Error actualizando la suscripción'
      });
    }

    console.log(`✅ Suscripción ${existingSubscriptionId} actualizada de "procesando" a "activo"`);

    // 4. Cambiar rol del usuario si es necesario (de rol 1 a rol 2)
    let roleChanged = false;
    if (currentRole === 1) {
      await client.query(
        'UPDATE perfil SET id_rol = 2 WHERE id_usuario = $1',
        [payment.user_id]
      );
      roleChanged = true;
      console.log(`✅ Usuario ${payment.user_id} promovido de rol 1 a rol 2`);
    }

    // 5. Agregar nota del admin
    const noteText = `Aprobado por admin ${adminId} - ${new Date().toLocaleString('es-AR')}${notes ? ` - Notas: ${notes}` : ''}`;
    
    await client.query(
      `UPDATE payments_arg 
       SET admin_notes = CASE 
           WHEN admin_notes IS NULL OR admin_notes = '' THEN $1
           ELSE admin_notes || ' | ' || $1
         END
       WHERE id = $2`,
      [noteText, paymentId]
    );

    await client.query('COMMIT');

    console.log(`✅ Transferencia ${paymentId} aprobada por admin ${adminId}`);

    try {
      await argentinaEmailService.sendNewSubscriptionFromId(existingSubscriptionId);
      console.log(`📧 Email de nueva suscripción enviado para suscripción ${existingSubscriptionId}`);
    } catch (emailError) {
      console.error('❌ Error enviando email de nueva suscripción:', emailError);
      // No fallar la transacción por email, solo logear
    }

    res.json({
      success: true,
      message: 'Transferencia aprobada exitosamente',
      data: {
        payment_id: paymentId,
        subscription_id: existingSubscriptionId,
        subscription_updated: true,
        role_changed: roleChanged,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        email_sent: true
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error aprobando transferencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar transferencia'
    });
  } finally {
    client.release();
  }
};

export const rejectTransfer = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { paymentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id_user;

    if (!reason || reason.trim() === '') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'La razón del rechazo es requerida'
      });
    }

    console.log(`👨‍💼 Admin ${adminId} rechazando transferencia ${paymentId}`);

    const paymentCheck = await client.query(
      `SELECT payment_method, payment_status, user_id, carrera_id 
       FROM payments_arg 
       WHERE id = $1`,
      [paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    const payment = paymentCheck.rows[0];

    if (payment.payment_method !== 'bank_transfer') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden rechazar transferencias bancarias'
      });
    }

    if (payment.payment_status !== 'en_revision_manual') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden rechazar pagos en revisión manual'
      });
    }

    const existingSubCheck = await client.query(
      `SELECT id FROM subscriptions_arg 
       WHERE user_id = $1 AND carrera_id = $2 AND status = 'procesando' AND payment_id = $3`,
      [payment.user_id, payment.carrera_id, paymentId]
    );

    if (existingSubCheck.rows.length > 0) {
      const subscriptionId = existingSubCheck.rows[0].id;
      
      await client.query(
        'DELETE FROM subscriptions_arg WHERE id = $1',
        [subscriptionId]
      );
      
      console.log(`✅ Suscripción en procesamiento ${subscriptionId} eliminada debido al rechazo`);
    } else {
      console.log(`⚠️ No se encontró suscripción en procesamiento para pago ${paymentId}`);
    }

    const noteText = `Rechazado por admin ${adminId} - ${new Date().toLocaleString('es-AR')} - Razón: ${reason.trim()}`;
    
    await client.query(
      `UPDATE payments_arg 
       SET 
         payment_status = 'rechazado',
         processed_by_admin_id = $1,
         admin_notes = CASE 
           WHEN admin_notes IS NULL OR admin_notes = '' THEN $2
           ELSE admin_notes || ' | ' || $2
         END,
         updated_at = NOW()
       WHERE id = $3`,
      [adminId, noteText, paymentId]
    );

    await client.query('COMMIT');

    try {
      await argentinaEmailService.sendTransferRejectedFromId(paymentId);
      console.log(`📧 Email de transferencia rechazada enviado para pago ${paymentId}`);
    } catch (emailError) {
      console.error('❌ Error enviando email de transferencia rechazada:', emailError);
      // No fallar la operación por email, solo logear
    }

    res.json({
      success: true,
      message: 'Transferencia rechazada',
      data: {
        payment_id: paymentId,
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        reason: reason.trim(),
        subscription_removed: existingSubCheck.rows.length > 0,
        email_sent: true
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rechazando transferencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar transferencia'
    });
  } finally {
    client.release();
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const statsQuery = `
      SELECT 
        payment_status,
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payments_arg 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY payment_status, payment_method
      ORDER BY payment_status, payment_method
    `;

    const recentQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN payment_status = 'completado' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN payment_status = 'en_revision_manual' THEN 1 END) as pending_review
      FROM payments_arg 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(period)} days'
    `;

    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as payments,
        SUM(CASE WHEN payment_status = 'completado' THEN amount ELSE 0 END) as revenue
      FROM payments_arg 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const generalStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM usuario) as total_users,
        (SELECT COUNT(*) FROM subscriptions_arg WHERE status = 'activo') as active_subscriptions,
        (SELECT COUNT(*) FROM payments_arg WHERE payment_status = 'en_revision_manual' AND payment_method = 'bank_transfer') as pending_transfers
    `;

    const [statsResult, recentResult, dailyResult, generalResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(recentQuery),
      pool.query(dailyQuery),
      pool.query(generalStatsQuery)
    ]);

    const summary = {
      ...recentResult.rows[0],
      ...generalResult.rows[0]
    };

    res.json({
      success: true,
      data: {
        period_days: parseInt(period),
        summary: summary,
        by_status_method: statsResult.rows,
        daily_stats: dailyResult.rows,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
};

export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const query = `
      SELECT 
        p.*,
        u.correo as email,
        COALESCE(pf.nombre, 'Sin nombre') as nombres,
        COALESCE(pf.apellido, 'Sin apellido') as apellidos,
        pf.id_rol,
        c.nombre as carrera_nombre,
        admin_u.correo as processed_by_admin_email,
        COALESCE(admin_pf.nombre, 'Sin nombre') as processed_by_admin_name
      FROM payments_arg p
      LEFT JOIN usuario u ON p.user_id = u.id_user
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
      LEFT JOIN usuario admin_u ON p.processed_by_admin_id = admin_u.id_user
      LEFT JOIN perfil admin_pf ON admin_u.id_user = admin_pf.id_usuario
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    const subscriptionQuery = `
      SELECT * FROM subscriptions_arg 
      WHERE payment_id = $1
    `;

    const subscriptionResult = await pool.query(subscriptionQuery, [paymentId]);

    res.json({
      success: true,
      data: {
        payment: result.rows[0],
        subscription: subscriptionResult.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo detalles del pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo detalles'
    });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { 
      q: searchQuery, 
      page = 1, 
      limit = 20,
      role,
      status 
    } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un término de búsqueda de al menos 2 caracteres'
      });
    }

    const offset = (page - 1) * limit;
    let whereClause = `WHERE (
      u.correo ILIKE $1 OR 
      pf.nombre ILIKE $1 OR 
      pf.apellido ILIKE $1 OR
      CONCAT(pf.nombre, ' ', pf.apellido) ILIKE $1
    )`;
    
    const params = [`%${searchQuery.trim()}%`];
    let paramIndex = 2;

    // Filtro por rol
    if (role) {
      whereClause += ` AND pf.id_rol = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // Filtro por estado de verificación
    if (status === 'verified') {
      whereClause += ` AND u.email_verified = true`;
    } else if (status === 'unverified') {
      whereClause += ` AND u.email_verified = false`;
    }

  const query = `
    SELECT 
      u.id_user,
      u.correo,
      u.email_verified,
      u.google_id,
      u.created_at as user_created_at,
      u.last_login,
      COALESCE(pf.nombre, 'Sin nombre') as nombres,
      COALESCE(pf.apellido, 'Sin apellido') as apellidos,
      pf.id_rol,
      u.created_at as profile_created_at,  -- ✅ CAMBIO: usar u.created_at en vez de pf.created_at
      -- Contar suscripciones activas
      (SELECT COUNT(*) FROM subscriptions_arg s 
      WHERE s.user_id = u.id_user AND s.status = 'activo') as active_subscriptions,
      -- Última suscripción
      (SELECT c.nombre FROM subscriptions_arg s 
      LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
      WHERE s.user_id = u.id_user 
      ORDER BY s.created_at DESC LIMIT 1) as last_subscription,
      -- Total gastado
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments_arg p 
      WHERE p.user_id = u.id_user AND p.payment_status = 'completado') as total_spent
    FROM usuario u
    LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

    params.push(limit, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usuario u
      LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
      ${whereClause}
    `;

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: total,
          per_page: parseInt(limit),
          has_next: page < totalPages,
          has_prev: page > 1
        },
        search_query: searchQuery
      }
    });

  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al buscar usuarios'
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const userQuery = `
    SELECT 
      u.id_user,
      u.correo,
      u.email_verified,
      u.google_id,
      u.created_at as user_created_at,
      u.last_login,
      u.verification_token,
      COALESCE(pf.nombre, 'Sin nombre') as nombres,
      COALESCE(pf.apellido, 'Sin apellido') as apellidos,
      pf.id_rol,
      u.created_at as profile_created_at  -- ✅ CAMBIO: usar u.created_at en vez de pf.created_at
    FROM usuario u
    LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
    WHERE u.id_user = $1
  `;

    const subscriptionsQuery = `
      SELECT 
        s.*,
        c.nombre as carrera_nombre,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.created_at as payment_date
      FROM subscriptions_arg s
      LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
      LEFT JOIN payments_arg p ON s.payment_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `;

    const paymentsQuery = `
      SELECT 
        p.*,
        c.nombre as carrera_nombre
      FROM payments_arg p
      LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const [userResult, subscriptionsResult, paymentsResult] = await Promise.all([
      pool.query(userQuery, [userId]),
      pool.query(subscriptionsQuery, [userId]),
      pool.query(paymentsQuery, [userId])
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.rows[0];
    const subscriptions = subscriptionsResult.rows;
    const payments = paymentsResult.rows;

    const stats = {
      total_subscriptions: subscriptions.length,
      active_subscriptions: subscriptions.filter(s => s.status === 'activo').length,
      total_payments: payments.length,
      total_spent: payments
        .filter(p => p.payment_status === 'completado')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      last_payment_date: payments.length > 0 ? payments[0].created_at : null
    };

    res.json({
      success: true,
      data: {
        user,
        subscriptions,
        payments,
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo detalles del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo detalles del usuario'
    });
  }
};

export const updateSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id_user;

    if (!subscriptionId || isNaN(parseInt(subscriptionId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de suscripción inválido'
      });
    }

    const validStatuses = ['activo', 'pausado', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado de suscripción inválido'
      });
    }

    const subscriptionCheck = await pool.query(
      'SELECT * FROM subscriptions_arg WHERE id = $1',
      [subscriptionId]
    );

    if (subscriptionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Suscripción no encontrada'
      });
    }

    const currentSubscription = subscriptionCheck.rows[0];

    await pool.query(
      `UPDATE subscriptions_arg 
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, subscriptionId]
    );

    // Si se cancela o pausa, verificar si hay que cambiar el rol del usuario
    if (status === 'cancelado' || status === 'pausado') {
      const otherActiveSubscriptions = await pool.query(
        `SELECT COUNT(*) as count 
         FROM subscriptions_arg 
         WHERE user_id = $1 AND status = 'activo' AND id != $2`,
        [currentSubscription.user_id, subscriptionId]
      );

      // Si no tiene otras suscripciones activas, cambiar rol a 1 (usuario básico)
      if (parseInt(otherActiveSubscriptions.rows[0].count) === 0) {
        await pool.query(
          'UPDATE perfil SET id_rol = 1 WHERE id_usuario = $1',
          [currentSubscription.user_id]
        );
      }
    }

    // Si se reactiva, cambiar rol a 2 (usuario premium)
    if (status === 'activo') {
      await pool.query(
        'UPDATE perfil SET id_rol = 2 WHERE id_usuario = $1',
        [currentSubscription.user_id]
      );
    }

    console.log(`✅ Suscripción ${subscriptionId} actualizada a ${status} por admin ${adminId}`);

    res.json({
      success: true,
      message: `Suscripción ${status} exitosamente`,
      data: {
        subscription_id: subscriptionId,
        new_status: status,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
        reason: reason || null
      }
    });

  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando estado de suscripción'
    });
  }
};

export const actualizarSuscripcionesVencidas = async (req, res) => {
  try {
    const adminId = req.user.id_user;
    console.log(`👨‍💼 Admin ${adminId} ejecutando actualización manual de suscripciones vencidas`);

    const result = await argentinaSubscriptionJob.executeManually();

    res.json({
      success: true,
      message: 'Actualización de suscripciones ejecutada manualmente',
      data: {
        ...result,
        executed_by: adminId,
        execution_type: 'manual'
      }
    });

  } catch (error) {
    console.error('❌ Error ejecutando actualización manual:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error ejecutando actualización de suscripciones',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const obtenerEstadisticasSuscripciones = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM obtener_estadisticas_suscripciones()');
    
    if (result.rows.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las estadísticas'
      });
    }

    const estadisticas = result.rows[0];

    let infoCron = null;
    try {
      const cronResult = await pool.query(`
        SELECT 
          jobname as nombre_job,
          schedule as horario,
          active as activo,
          jobid as id_job,
          database as base_datos,
          username as usuario
        FROM cron.job 
        WHERE jobname = 'actualizacion_suscripciones_vencidas'
      `);
      
      if (cronResult.rows.length > 0) {
        infoCron = cronResult.rows[0];
        
        const historialResult = await pool.query(`
          SELECT 
            start_time as hora_inicio,
            end_time as hora_fin,
            (end_time - start_time) as duracion,
            return_message as mensaje,
            status as estado
          FROM cron.job_run_details 
          WHERE jobid = $1
          ORDER BY start_time DESC 
          LIMIT 5
        `, [infoCron.id_job]);
        
        infoCron.ejecuciones_recientes = historialResult.rows;
        
        const ahora = new Date();
        const horasHastaSiguiente = 6 - (ahora.getHours() % 6);
        const proximaEjecucion = new Date(ahora);
        proximaEjecucion.setHours(ahora.getHours() + horasHastaSiguiente, 0, 0, 0);
        
        infoCron.proxima_ejecucion_aproximada = proximaEjecucion.toISOString();
      }
    } catch (cronError) {
      console.log('ℹ️ pg_cron no disponible o sin permisos:', cronError.message);
      infoCron = {
        error: 'pg_cron no disponible o sin permisos',
        solucion: 'Verifica la instalación y configuración de pg_cron'
      };
    }

    let proximasVencer = [];
    try {
      const proximasResult = await pool.query(`
        SELECT 
          s.id,
          s.user_id,
          u.correo,
          pf.nombre,
          pf.apellido,
          c.nombre as carrera,
          s.end_date,
          EXTRACT(EPOCH FROM (s.end_date - NOW())) / 3600 as horas_restantes
        FROM subscriptions_arg s
        LEFT JOIN usuario u ON s.user_id = u.id_user
        LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
        LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
        WHERE s.status = 'activo' 
        AND s.end_date <= NOW() + INTERVAL '7 days'
        AND s.end_date > NOW()
        ORDER BY s.end_date
        LIMIT 10
      `);
      
      proximasVencer = proximasResult.rows;
    } catch (error) {
      console.error('Error obteniendo próximas a vencer:', error);
    }

    res.json({
      success: true,
      data: {
        estadisticas: {
          total_suscripciones: parseInt(estadisticas.total_suscripciones),
          suscripciones_activas: parseInt(estadisticas.suscripciones_activas),
          suscripciones_vencidas: parseInt(estadisticas.suscripciones_vencidas),
          suscripciones_pendientes: parseInt(estadisticas.suscripciones_pendientes),
          suscripciones_canceladas: parseInt(estadisticas.suscripciones_canceladas),
          vencen_en_24h: parseInt(estadisticas.vencen_en_24h),
          vencen_en_7d: parseInt(estadisticas.vencen_en_7d)
        },
        info_cron: infoCron,
        proximas_vencer: proximasVencer,
        generado_en: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de suscripciones:', error);
    
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      return res.status(500).json({
        success: false,
        error: 'Función de estadísticas no encontrada',
        details: 'La función obtener_estadisticas_suscripciones() no está instalada',
        solucion: 'Ejecuta el script SQL de instalación'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
};

export const verificarEstadoPgCron = async (req, res) => {
  try {
    const verificaciones = {
      extension_instalada: false,
      esquema_accesible: false,
      job_existe: false,
      job_activo: false,
      configuracion_correcta: false,
      permisos_suficientes: false
    };

    let detalles = [];
    let recomendaciones = [];

    // 1. Verificar extensión pg_cron
    try {
      const extResult = await pool.query(
        "SELECT * FROM pg_extension WHERE extname = 'pg_cron'"
      );
      verificaciones.extension_instalada = extResult.rows.length > 0;
      
      if (verificaciones.extension_instalada) {
        detalles.push('✅ Extensión pg_cron instalada');
      } else {
        detalles.push('❌ Extensión pg_cron NO instalada');
        recomendaciones.push('Ejecutar: CREATE EXTENSION pg_cron;');
      }
    } catch (error) {
      detalles.push('❌ Error verificando extensión pg_cron');
      recomendaciones.push('Instalar pg_cron en el sistema y reiniciar PostgreSQL');
    }

    // 2. Verificar acceso al esquema cron
    try {
      const schemaResult = await pool.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'"
      );
      verificaciones.esquema_accesible = schemaResult.rows.length > 0;
      
      if (verificaciones.esquema_accesible) {
        detalles.push('✅ Esquema cron accesible');
        verificaciones.permisos_suficientes = true;
      } else {
        detalles.push('❌ Esquema cron NO accesible');
        recomendaciones.push('Conectar como superusuario y dar permisos al esquema cron');
      }
    } catch (error) {
      detalles.push('❌ Sin permisos para acceder al esquema cron');
      recomendaciones.push('Solicitar permisos de superusuario o permisos específicos');
    }

    // 3. Verificar job existe y está activo
    if (verificaciones.esquema_accesible) {
      try {
        const jobResult = await pool.query(
          "SELECT * FROM cron.job WHERE jobname = 'actualizacion_suscripciones_vencidas'"
        );
        
        verificaciones.job_existe = jobResult.rows.length > 0;
        
        if (verificaciones.job_existe) {
          const job = jobResult.rows[0];
          verificaciones.job_activo = job.active;
          
          detalles.push(`✅ Job existe (ID: ${job.jobid})`);
          detalles.push(`${job.active ? '✅' : '❌'} Job ${job.active ? 'activo' : 'inactivo'}`);
          detalles.push(`📅 Horario: ${job.schedule}`);
          
          if (!job.active) {
            recomendaciones.push('Activar job con: UPDATE cron.job SET active = true WHERE jobname = \'actualizacion_suscripciones_vencidas\'');
          }
        } else {
          detalles.push('❌ Job NO existe');
          recomendaciones.push('Ejecutar script de creación del job');
        }
      } catch (error) {
        detalles.push('❌ Error verificando job');
      }
    }

    // 4. Verificar configuración de PostgreSQL
    try {
      const configResult = await pool.query("SHOW shared_preload_libraries");
      const preloadLibs = configResult.rows[0].shared_preload_libraries;
      verificaciones.configuracion_correcta = preloadLibs.includes('pg_cron');
      
      if (verificaciones.configuracion_correcta) {
        detalles.push('✅ pg_cron en shared_preload_libraries');
      } else {
        detalles.push('❌ pg_cron NO en shared_preload_libraries');
        recomendaciones.push('Agregar pg_cron a shared_preload_libraries en postgresql.conf');
        recomendaciones.push('Reiniciar PostgreSQL después del cambio');
      }
    } catch (error) {
      detalles.push('❌ Error verificando configuración PostgreSQL');
    }

    const totalVerificaciones = Object.keys(verificaciones).length;
    const verificacionesExitosas = Object.values(verificaciones).filter(Boolean).length;
    const estadoGeneral = verificacionesExitosas === totalVerificaciones ? 'perfecto' :
                         verificacionesExitosas >= totalVerificaciones * 0.7 ? 'bueno' :
                         verificacionesExitosas >= totalVerificaciones * 0.4 ? 'parcial' : 'critico';

    res.json({
      success: true,
      data: {
        estado_general: estadoGeneral,
        puntuacion: `${verificacionesExitosas}/${totalVerificaciones}`,
        verificaciones,
        detalles,
        recomendaciones,
        verificado_en: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado de pg_cron:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando estado del sistema',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const notificarProximasExpiraciones = async (req, res) => {
  try {
    const adminId = req.user.id_user;
    const daysAhead = parseInt(req.query.days) || 3;
    
    console.log(`👨‍💼 Admin ${adminId} consultando suscripciones que vencen en ${daysAhead} días`);

    const upcomingExpirations = await argentinaEmailService.getUpcomingExpirations(daysAhead);
    
    if (upcomingExpirations.length === 0) {
      return res.json({
        success: true,
        message: `No hay suscripciones que venzan en los próximos ${daysAhead} días`,
        data: { 
          proximas_expiraciones: 0,
          dias_consultados: daysAhead
        }
      });
    }

    console.log(`📅 Encontradas ${upcomingExpirations.length} suscripciones que vencen pronto`);
    
    res.json({
      success: true,
      message: `${upcomingExpirations.length} suscripciones vencen en los próximos ${daysAhead} días`,
      data: {
        proximas_expiraciones: upcomingExpirations.length,
        dias_consultados: daysAhead,
        suscripciones: upcomingExpirations,
        consultado_por: adminId,
        consultado_en: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo próximas expiraciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo próximas expiraciones'
    });
  }
};

export const obtenerEstadoJob = async (req, res) => {
  try {
    const adminId = req.user.id_user;
    console.log(`👨‍💼 Admin ${adminId} consultando estado del job`);

    const status = argentinaSubscriptionJob.getStatus();
    const upcomingExpirations = await argentinaSubscriptionJob.getUpcomingExpirations(24);

    res.json({
      success: true,
      data: {
        job_status: status,
        upcoming_expirations: {
          count: upcomingExpirations.length,
          next_24h: upcomingExpirations
        },
        consulted_by: adminId,
        consulted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado del job:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del job'
    });
  }
};

export const detenerJob = async (req, res) => {
  try {
    const adminId = req.user.id_user;
    console.log(`👨‍💼 Admin ${adminId} deteniendo job de emergencia`);

    argentinaSubscriptionJob.stop();

    res.json({
      success: true,
      message: 'Job de suscripciones detenido',
      data: {
        stopped_by: adminId,
        stopped_at: new Date().toISOString(),
        warning: 'El job no se ejecutará automáticamente hasta reiniciar la aplicación'
      }
    });

  } catch (error) {
    console.error('❌ Error deteniendo job:', error);
    res.status(500).json({
      success: false,
      error: 'Error deteniendo job'
    });
  }
};

export const reiniciarJob = async (req, res) => {
  try {
    const adminId = req.user.id_user;
    console.log(`👨‍💼 Admin ${adminId} reiniciando job`);

    argentinaSubscriptionJob.stop();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reiniciar
    argentinaSubscriptionJob.start();

    res.json({
      success: true,
      message: 'Job de suscripciones reiniciado exitosamente',
      data: {
        restarted_by: adminId,
        restarted_at: new Date().toISOString(),
        status: argentinaSubscriptionJob.getStatus()
      }
    });

  } catch (error) {
    console.error('❌ Error reiniciando job:', error);
    res.status(500).json({
      success: false,
      error: 'Error reiniciando job'
    });
  }
};