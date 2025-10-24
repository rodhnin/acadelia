// backend/services/usuarios/passwordRecoveryService.js
import crypto from 'crypto';
import pool from "../../lib/dbPool.js";
import bcrypt from "bcryptjs";
import { emailService } from "../email/emailService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Busca un usuario por email
 * @param {string} email - Email del usuario
 * @returns {Object|null} - Usuario encontrado o null
 */
async function findUserByEmail(email) {
  const query = "SELECT id_user, correo FROM usuario WHERE LOWER(correo) = LOWER($1)";
  const { rows } = await pool.query(query, [email.trim()]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Elimina tokens antiguos del usuario
 * @param {number} userId - ID del usuario
 * @private
 */
async function _deleteOldTokens(userId) {
  try {
    console.log('Eliminando tokens antiguos para usuario:', userId);
    const deleteOldTokenQuery = `
      DELETE FROM password_reset_tokens 
      WHERE user_id = $1
    `;
    await pool.query(deleteOldTokenQuery, [userId]);
  } catch (deleteError) {
    console.warn('Error al eliminar tokens antiguos:', deleteError);
    // No lanzar error, continuar con el flujo
  }
}

/**
 * Genera y guarda un token de recuperación
 * @param {number} userId - ID del usuario
 * @returns {Object} - Token generado y datos relacionados
 */
async function generateResetToken(userId) {
  // Generar token único
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Establecer expiración (30 minutos)
  const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
  
  try {
    // Eliminar tokens antiguos primero
    await _deleteOldTokens(userId);
    
    // Insertar nuevo token
    console.log('Insertando nuevo token para usuario:', userId);
    const insertTokenQuery = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
    `;
    
    await pool.query(insertTokenQuery, [userId, hashedToken, tokenExpiry]);
    console.log('Token guardado en base de datos correctamente');
    
    return {
      resetToken,
      hashedToken,
      tokenExpiry
    };
    
  } catch (dbError) {
    console.error('ERROR AL GUARDAR TOKEN EN BASE DE DATOS:', dbError);
    throw dbError;
  }
}

/**
 * Envía email de recuperación de contraseña
 * @param {Object} emailData - Datos para el email
 */
async function sendResetEmail(emailData) {
  const { email, resetToken, userId } = emailData;
  
  // Crear URL de reset
  const resetUrl = `${emailService.baseUrl}/reset-password?token=${resetToken}&id=${userId}`;
  
  // Enviar correo con el link de recuperación
  await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);
}

/**
 * Registra evento de seguridad para solicitud de reset
 * @param {Object} eventData - Datos del evento
 */
function logPasswordResetRequest(eventData) {
  const { userId, email, ip, userAgent } = eventData;
  
  logSecurityEvent('PASSWORD_RESET_REQUESTED', 'Solicitud de recuperación de contraseña', {
    userId,
    email,
    ip,
    userAgent
  }, 'high');
}

/**
 * Valida un token de reset
 * @param {Object} tokenData - Datos del token a validar
 * @returns {Object} - Resultado de la validación
 */
async function validateResetToken(tokenData) {
  const { token, userId } = tokenData;
  
  // Hash del token recibido
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const checkTokenQuery = `
    SELECT user_id FROM password_reset_tokens 
    WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
  `;
  
  const { rows } = await pool.query(checkTokenQuery, [userId, hashedToken]);
  
  return {
    valid: rows.length > 0,
    userId: rows.length > 0 ? rows[0].user_id : null
  };
}

/**
 * Actualiza la contraseña del usuario
 * @param {Object} passwordData - Datos para actualizar contraseña
 * @returns {Object} - Resultado de la actualización
 */
async function updatePassword(passwordData) {
  const { userId, newPassword } = passwordData;
  
  // Validar que las contraseñas coincidan (esto debería validarse en el controlador)
  if (passwordData.newPassword !== passwordData.confirmPassword) {
    throw new Error("Las contraseñas no coinciden");
  }
  
  // Hash de la nueva contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  // Actualizar contraseña
  const updatePasswordQuery = `
    UPDATE usuario 
    SET contraseña = $1 
    WHERE id_user = $2
    RETURNING id_user, correo
  `;
  
  const updateResult = await pool.query(updatePasswordQuery, [hashedPassword, userId]);
  
  if (updateResult.rows.length === 0) {
    throw new Error("Usuario no encontrado");
  }
  
  return updateResult.rows[0];
}

/**
 * Elimina un token usado
 * @param {number} userId - ID del usuario
 */
async function deleteUsedToken(userId) {
  const deleteTokenQuery = `
    DELETE FROM password_reset_tokens 
    WHERE user_id = $1
  `;
  
  await pool.query(deleteTokenQuery, [userId]);
}

/**
 * Revoca todas las sesiones activas del usuario
 * @param {number} userId - ID del usuario
 */
async function revokeAllUserSessions(userId) {
  try {
    const { AuthService } = await import("./authService.js");
    await AuthService.revokeAllTokens(userId);
  } catch (revokeError) {
    console.warn(`Error al revocar sesiones tras cambio de contraseña: ${revokeError.message}`);
  }
}

/**
 * Registra evento de seguridad para reset completado
 * @param {Object} eventData - Datos del evento
 */
function logPasswordResetCompleted(eventData) {
  const { userId, ip, userAgent } = eventData;
  
  logSecurityEvent('PASSWORD_RESET_COMPLETED', 'Contraseña restablecida exitosamente', {
    userId,
    ip,
    userAgent
  }, 'high');
}

/**
 * Obtiene información de un token para verificación
 * @param {Object} tokenData - Datos del token
 * @returns {Object} - Información del token
 */
async function getTokenInfo(tokenData) {
  const { token, userId } = tokenData;
  
  // Hash del token recibido
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const checkTokenQuery = `
    SELECT user_id, expires_at FROM password_reset_tokens 
    WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
  `;
  
  const { rows } = await pool.query(checkTokenQuery, [userId, hashedToken]);
  
  if (rows.length === 0) {
    return {
      valid: false,
      error: "El token es inválido o ha expirado"
    };
  }
  
  // Calcular tiempo restante en minutos
  const expiryDate = new Date(rows[0].expires_at);
  const minutesRemaining = Math.floor((expiryDate - new Date()) / (1000 * 60));
  
  return {
    valid: true,
    expiresIn: minutesRemaining
  };
}

// Exportar todas las funciones
export const passwordRecoveryService = {
  findUserByEmail,
  generateResetToken,
  sendResetEmail,
  logPasswordResetRequest,
  validateResetToken,
  updatePassword,
  deleteUsedToken,
  revokeAllUserSessions,
  logPasswordResetCompleted,
  getTokenInfo
};