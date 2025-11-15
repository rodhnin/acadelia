import pool from "../../lib/dbPool.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import crypto from 'crypto';
import { redisService } from "../../lib/redis.js";
import { AuthService } from "./authService.js";
import { emailService } from "../email/emailService.js";

/**
 * Genera y envía código de verificación para eliminación de cuenta
 * @param {Object} userData - Datos del usuario (id, ip, userAgent)
 * @returns {Object} - Resultado con deletionToken
 */
async function generateDeletionRequest(userData) {
  const { userId, ip, userAgent } = userData;
  
  logSecurityEvent('ACCOUNT_DELETION_REQUEST', 'Usuario solicitó eliminación de cuenta', {
    userId,
    ip,
    userAgent
  }, 'high');
  
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  const deletionToken = crypto.randomBytes(32).toString('hex');
  
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);
  
  // IMPORTANTE: Convertir a formato ISO para consistencia
  const expiryISOString = expiryDate.toISOString();
  
  console.log('Creando solicitud de eliminación:');
  console.log('- Fecha actual:', new Date().toISOString());
  console.log('- Fecha expiración:', expiryISOString);
  
  const query = `
    INSERT INTO account_deletion_requests (
      user_id,
      verification_code,
      token,
      ip_address,
      user_agent,
      created_at,
      expires_at,
      status
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'pending')
    RETURNING id
  `;
  
  const values = [
    userId,
    verificationCode,
    deletionToken,
    ip,
    userAgent,
    expiryDate
  ];
  
  const { rows } = await pool.query(query, values);
  const requestId = rows[0].id;
  
  await redisService.set(
    `deletion_request:${userId}:${deletionToken}`,
    {
      userId,
      verificationCode,
      createdAt: new Date().toISOString(),
      expiresAt: expiryISOString,
      status: 'pending'
    },
    3600 // 1 hora en segundos
  );
  
  return {
    deletionToken,
    verificationCode,
    requestId
  };
}

/**
 * Obtiene el email del usuario
 * @param {number} userId - ID del usuario
 * @returns {string} - Email del usuario
 */
async function getUserEmail(userId) {
  const userQuery = "SELECT correo FROM usuario WHERE id_user = $1";
  const userResult = await pool.query(userQuery, [userId]);
  
  if (userResult.rows.length === 0) {
    throw new Error("Usuario no encontrado");
  }
  
  return userResult.rows[0].correo;
}

/**
 * Envía código de verificación por email
 * @param {string} email - Email del usuario
 * @param {string} verificationCode - Código de verificación
 */
async function sendVerificationEmail(email, verificationCode) {
  try {
    await emailService.sendAccountDeletionCode(email, verificationCode);
    console.log(`Código de verificación para eliminar cuenta enviado a: ${email}`);
  } catch (emailError) {
    console.error("Error enviando correo de verificación para eliminar cuenta:", emailError);
    // No lanzar error para no interrumpir el flujo
  }
}

/**
 * Valida la solicitud de eliminación
 * @param {Object} requestData - Datos de la solicitud
 * @returns {Object} - Estado de validación
 */
async function validateDeletionRequest(requestData) {
  const { userId, verificationCode, deletionToken } = requestData;
  
  console.log('Validando solicitud de eliminación:');
  console.log('- userId:', userId);
  console.log('- verificationCode:', verificationCode);
  console.log('- deletionToken:', deletionToken);
  
  const dbQuery = `
    SELECT verification_code, expires_at > NOW() as valid, status
    FROM account_deletion_requests
    WHERE user_id = $1 AND token = $2
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const { rows } = await pool.query(dbQuery, [userId, deletionToken]);
  
  if (rows.length === 0) {
    console.log('No se encontró solicitud en la base de datos');
    return {
      valid: false,
      error: "Solicitud de eliminación no encontrada"
    };
  }
  
  console.log('Datos de base de datos:', rows[0]);
  
  if (rows[0].status !== 'pending') {
    console.log('La solicitud ya fue procesada:', rows[0].status);
    return {
      valid: false,
      error: "Esta solicitud ya fue procesada"
    };
  }
  
  if (!rows[0].valid) {
    console.log('La solicitud ha expirado según PostgreSQL');
    return {
      valid: false,
      error: "La solicitud de eliminación ha expirado"
    };
  }
  
  if (rows[0].verification_code !== verificationCode) {
    console.log('Código incorrecto:');
    console.log('- Esperado:', rows[0].verification_code);
    console.log('- Recibido:', verificationCode);
    
    return {
      valid: false,
      error: "Código de verificación incorrecto"
    };
  }
  
  console.log('Código verificado correctamente');
  return { valid: true };
}

/**
 * Marca la solicitud como completada
 * @param {Object} requestData - Datos de la solicitud
 */
async function markRequestCompleted(requestData) {
  const { userId, deletionToken, reason } = requestData;
  
  const updateQuery = `
    UPDATE account_deletion_requests
    SET status = 'completed', updated_at = NOW(), deletion_reason = $3
    WHERE user_id = $1 AND token = $2
  `;
  
  await pool.query(updateQuery, [userId, deletionToken, reason || null]);
  
  const redisKey = `deletion_request:${userId}:${deletionToken}`;
  await redisService.delete(redisKey);
}

/**
 * Obtiene información del usuario antes de eliminarlo
 * @param {Object} client - Cliente de base de datos
 * @param {number} userId - ID del usuario
 * @returns {Object} - Información del usuario
 * @private
 */
async function _getUserInfo(client, userId) {
  const userQuery = `
    SELECT 
      u.correo, 
      u.google_id, 
      u.created_at,
      (
        SELECT EXISTS(
          SELECT 1 FROM suscripciones 
          WHERE id_user = $1 AND status = 'active'
        )
      ) as subscription_active
    FROM usuario u
    WHERE u.id_user = $1
  `;
  
  const userResult = await client.query(userQuery, [userId]);
  if (userResult.rows.length === 0) {
    throw new Error("Usuario no encontrado");
  }
  
  return userResult.rows[0];
}

/**
 * Registra la eliminación de la cuenta
 * @param {Object} client - Cliente de base de datos
 * @param {Object} data - Datos de la eliminación
 * @private
 */
async function _registerAccountDeletion(client, data) {
  const { emailHash, userAgent, ipAddress, reason, subscriptionActive } = data;
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS deleted_accounts (
      id SERIAL PRIMARY KEY,
      email_hash VARCHAR(64) NOT NULL,
      deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      user_agent TEXT,
      ip_address VARCHAR(45),
      deletion_reason TEXT,
      subscription_active BOOLEAN
    )
  `;
  
  await client.query(createTableQuery);
  
  const registerQuery = `
    INSERT INTO deleted_accounts (
      email_hash, 
      deletion_date, 
      user_agent, 
      ip_address, 
      deletion_reason,
      subscription_active
    ) VALUES ($1, NOW(), $2, $3, $4, $5)
  `;
  
  await client.query(registerQuery, [
    emailHash,
    userAgent,
    ipAddress,
    reason,
    subscriptionActive
  ]);
  console.log('Registro de eliminación creado correctamente');
}

/**
 * Elimina datos de chat del usuario
 * @param {Object} client - Cliente de base de datos
 * @param {number} userId - ID del usuario
 * @private
 */
async function _deleteChatData(client, userId) {
  const chatIdsQuery = `SELECT id_chat FROM chat WHERE id_user = $1`;
  const chatIdsResult = await client.query(chatIdsQuery, [userId]);
  
  if (chatIdsResult.rows.length > 0) {
    console.log(`Encontrados ${chatIdsResult.rows.length} chats para eliminar`);
    
    for (const chatRow of chatIdsResult.rows) {
      const chatId = chatRow.id_chat;
      try {
        await client.query('DELETE FROM chat_history WHERE id_chat = $1', [chatId]);
        console.log(`Historial eliminado para chat ${chatId}`);
      } catch (chatHistoryError) {
        console.warn(`No se pudo eliminar historial para chat ${chatId}: ${chatHistoryError.message}`);
      }
    }
    
    await client.query('DELETE FROM chat WHERE id_user = $1', [userId]);
    console.log('Chats eliminados correctamente');
  }
  
  await client.query('DELETE FROM chat_history WHERE id_user = $1', [userId]);
  console.log('Historial de chat eliminado correctamente');
}

/**
 * Operación segura de eliminación
 * @param {Object} client - Cliente de base de datos
 * @param {string} query - Query SQL
 * @param {Array} params - Parámetros
 * @private
 */
async function _safeDelete(client, query, params) {
  await client.query(query, params);
}

/**
 * Operación segura de actualización
 * @param {Object} client - Cliente de base de datos
 * @param {string} query - Query SQL
 * @param {Array} params - Parámetros
 * @private
 */
async function _safeUpdate(client, query, params) {
  await client.query(query, params);
}

/**
 * Elimina datos relacionados con el usuario
 * @param {Object} client - Cliente de base de datos
 * @param {number} userId - ID del usuario
 * @private
 */
async function _deleteRelatedData(client, userId) {
  console.log('Comenzando eliminación de datos asociados...');
  
  // ORDEN IMPORTANTE: Eliminar en orden de dependencias (hijos antes que padres)
  const deletionOperations = [
    // 1. Primero eliminar agentetube (referencia a chat)
    { name: 'agentetube', operation: () => _safeDelete(client, 'DELETE FROM agentetube WHERE id_user = $1', [userId]) },
    
    // 2. Después eliminar chat_history y chat
    { name: 'chat_history y chat', operation: () => _deleteChatData(client, userId) },
    
    // 3. Eliminar suscripciones (referencia subscriptions_arg a payments_arg)
    { name: 'subscriptions_arg', operation: () => _safeDelete(client, 'DELETE FROM subscriptions_arg WHERE user_id = $1', [userId]) },
    
    // 4. ANONIMIZAR pagos: NULL + user_deleted = true (libera FK y mantiene historial)
    { name: 'payments_arg', operation: () => _safeUpdate(client, "UPDATE payments_arg SET user_id = NULL, user_deleted = true WHERE user_id = $1", [userId]) },
    
    // 5. ANONIMIZAR suscripciones principales: NULL + cancelled + user_deleted = true
    { name: 'suscripciones', operation: () => _safeUpdate(client, "UPDATE suscripciones SET id_user = NULL, status = 'cancelled', user_deleted = true WHERE id_user = $1", [userId]) },
    
    // 6. ANONIMIZAR historial de transacciones: NULL + user_deleted = true
    { name: 'historial_transacciones', operation: () => _safeUpdate(client, "UPDATE historial_transacciones SET id_user = NULL, user_deleted = true WHERE id_user = $1", [userId]) },
    
    // 7. Eliminar otros datos del usuario
    { name: 'perfil', operation: () => _safeDelete(client, 'DELETE FROM perfil WHERE id_usuario = $1', [userId]) },
    { name: 'pdfs', operation: () => _safeDelete(client, 'DELETE FROM pdfs WHERE id_user = $1', [userId]) },
    { name: 'feedback', operation: () => _safeDelete(client, 'DELETE FROM feedback WHERE id_user = $1', [userId]) },
    
    // 8. Tokens y intentos de login
    { name: 'password_reset_tokens', operation: () => _safeDelete(client, 'DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]) },
    { name: 'login_attempts', operation: () => _safeDelete(client, 'DELETE FROM login_attempts WHERE user_id = $1', [userId]) },
    { name: 'account_deletion_requests', operation: () => _safeDelete(client, 'DELETE FROM account_deletion_requests WHERE user_id = $1', [userId]) },
    
    // 9. Consentimientos y aceptaciones
    { name: 'terms_acceptances', operation: () => _safeDelete(client, 'DELETE FROM terms_acceptances WHERE user_id = $1', [userId]) },
    { name: 'cookie_consent', operation: () => _safeDelete(client, 'DELETE FROM cookie_consent WHERE user_id = $1', [userId]) }
  ];

  for (const { name, operation } of deletionOperations) {
    try {
      await operation();
      console.log(`✅ ${name} procesado correctamente`);
    } catch (error) {
      console.error(`❌ ERROR CRÍTICO en ${name}:`, error.message);
      throw new Error(`Error crítico al procesar ${name}: ${error.message}`);
    }
  }
  
  console.log('✅ Eliminación de datos relacionados completada');
}

/**
 * Anonimiza eventos de seguridad
 * @param {Object} client - Cliente de base de datos
 * @param {number} userId - ID del usuario
 * @private
 */
async function _anonymizeSecurityEvents(client, userId) {
  console.log('🔧 Anonimizando eventos de seguridad para cumplir con FK...');
  
  const checkEventsQuery = 'SELECT COUNT(*) as count FROM security_events WHERE user_id = $1';
  const eventCountResult = await client.query(checkEventsQuery, [userId]);
  const eventCount = eventCountResult.rows[0].count;
  
  if (eventCount > 0) {
    console.log(`📊 Encontrados ${eventCount} eventos de seguridad a anonimizar`);
    
    try {
      // Anonimizar eventos: establecer user_id a NULL y añadir flag de usuario eliminado
      const anonymizeQuery = `
        UPDATE security_events 
        SET user_id = NULL,
            data = COALESCE(data, '{}'::jsonb) || 
                  jsonb_build_object(
                    'user_deleted', true, 
                    'original_user_id', $1::text,
                    'deletion_timestamp', NOW()::text
                  ),
            message = COALESCE(message, '') || ' [Usuario eliminado]'
        WHERE user_id = $1
      `;
      
      const result = await client.query(anonymizeQuery, [userId]);
      console.log(`✅ ${result.rowCount} eventos de seguridad anonimizados correctamente`);
      
      const verifyQuery = 'SELECT COUNT(*) as remaining FROM security_events WHERE user_id = $1';
      const verifyResult = await client.query(verifyQuery, [userId]);
      const remainingEvents = verifyResult.rows[0].remaining;
      
      if (remainingEvents > 0) {
        throw new Error(`Aún quedan ${remainingEvents} eventos sin anonimizar`);
      }
      
      console.log('✅ Verificación completada: todos los eventos anonimizados correctamente');
      
    } catch (securityEventsError) {
      console.error('❌ Error al anonimizar eventos de seguridad:', securityEventsError.message);
      
      // Método de último recurso
      const lastResortQuery = `
        UPDATE security_events 
        SET user_id = NULL,
            message = COALESCE(message, '') || ' [Usuario eliminado - ID: ' || $1 || ']'
        WHERE user_id = $1
      `;
      const lastResortResult = await client.query(lastResortQuery, [userId]);
      console.log(`🆘 ${lastResortResult.rowCount} eventos anonimizados con método de último recurso`);
      
      // Verificación final
      const finalVerifyQuery = 'SELECT COUNT(*) as remaining FROM security_events WHERE user_id = $1';
      const finalVerifyResult = await client.query(finalVerifyQuery, [userId]);
      const finalRemainingEvents = finalVerifyResult.rows[0].remaining;
      
      if (finalRemainingEvents > 0) {
        throw new Error(`CRÍTICO: Aún quedan ${finalRemainingEvents} eventos después del último recurso`);
      }
    }
  } else {
    console.log('ℹ️ No se encontraron eventos de seguridad para anonimizar');
  }
}

/**
 * Elimina el usuario principal
 * @param {Object} client - Cliente de base de datos
 * @param {number} userId - ID del usuario
 * @private
 */
async function _deleteMainUser(client, userId) {
  console.log('🗑️ Eliminando usuario de la tabla principal...');
  const deleteUserResult = await client.query('DELETE FROM usuario WHERE id_user = $1', [userId]);
  console.log(`✅ Usuario eliminado completamente de la base de datos (${deleteUserResult.rowCount} fila afectada)`);
}

/**
 * Elimina completamente la cuenta de un usuario
 * @param {number} userId - ID del usuario a eliminar
 * @param {string} ipAddress - Dirección IP desde donde se solicita la eliminación
 * @param {string} userAgent - User agent del navegador/dispositivo
 * @param {string} reason - Razón de la eliminación (opcional)
 */
async function deleteUserAccount(userId, ipAddress, userAgent, reason = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Iniciando eliminación de cuenta para usuario ${userId}...`);
    
    // 1. Obtener información del usuario antes de eliminarlo
    const user = await _getUserInfo(client, userId);
    const emailHash = crypto.createHash('sha256').update(user.correo).digest('hex');
    
    console.log('Información de usuario obtenida correctamente');
    
    // 2. Revocar todos los tokens
    await AuthService.revokeAllTokens(userId);
    console.log('Tokens revocados correctamente');
    
    // 3. Registrar la eliminación
    await _registerAccountDeletion(client, {
      emailHash,
      userAgent,
      ipAddress,
      reason,
      subscriptionActive: user.subscription_active
    });
    
    // 4. Eliminar datos relacionados
    await _deleteRelatedData(client, userId);
    
    // 5. Anonimizar eventos de seguridad
    await _anonymizeSecurityEvents(client, userId);
    
    // 6. Eliminar usuario principal
    await _deleteMainUser(client, userId);
    
    logSecurityEvent('ACCOUNT_DELETED', 'Cuenta de usuario eliminada permanentemente', {
      emailHash,
      hadSubscription: user.subscription_active,
      ip: ipAddress,
      userAgent: userAgent,
      user_deleted: true,
      original_user_id: userId
    }, 'critical');
    
    await client.query('COMMIT');
    console.log(`🎉 Cuenta del usuario ${userId} eliminada permanentemente con éxito`);
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Error eliminando cuenta de usuario:', error);
    logSecurityEvent('ACCOUNT_DELETION_FAILED', 'Error al eliminar cuenta de usuario', {
      userId,
      error: error.message,
      ip: ipAddress,
      user_deleted: false
    }, 'critical');
    throw error;
  } finally {
    client.release();
  }
}

export const deleteAccountService = {
  generateDeletionRequest,
  getUserEmail,
  sendVerificationEmail,
  validateDeletionRequest,
  markRequestCompleted,
  deleteUserAccount
};