// backend/controllers/usuarios/passwordRecoveryController.js
import { passwordRecoveryService } from "../../services/usuarios/passwordRecoveryService.js";

// Iniciar proceso de recuperación de contraseña
export const requestPasswordReset = async (req, res) => {
  try {
    const { correo } = req.body;
    console.log('Solicitud de recuperación para:', correo);

    // Validar datos de entrada
    if (!correo) {
      return res.status(400).json({ error: "El correo electrónico es obligatorio" });
    }

    // Buscar usuario por email
    const user = await passwordRecoveryService.findUserByEmail(correo);

    if (!user) {
      // Por seguridad, no informar si el correo existe o no
      return res.status(200).json({ 
        message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" 
      });
    }

    console.log('Usuario encontrado:', user.id_user);
    
    try {
      // Generar token de reset
      const { resetToken } = await passwordRecoveryService.generateResetToken(user.id_user);
      
      // Enviar email de recuperación
      await passwordRecoveryService.sendResetEmail({
        email: user.correo,
        resetToken,
        userId: user.id_user
      });
      
      // Registrar evento de seguridad
      passwordRecoveryService.logPasswordResetRequest({
        userId: user.id_user,
        email: user.correo,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
    } catch (serviceError) {
      console.error('ERROR EN SERVICIO DE RECUPERACIÓN:', serviceError);
      // Continuar con respuesta genérica para no revelar información
    }
    
    // Respuesta genérica para evitar enumeración de usuarios
    res.status(200).json({ 
      message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" 
    });
    
  } catch (error) {
    console.error("Error en solicitud de recuperación de contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Verificar token y actualizar contraseña
export const resetPassword = async (req, res) => {
  try {
    const { token, id, newPassword, confirmPassword } = req.body;
    
    // Validar datos de entrada
    const validationError = _validateResetData({ token, id, newPassword, confirmPassword });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    // Validar token
    const tokenValidation = await passwordRecoveryService.validateResetToken({ token, userId: id });
    
    if (!tokenValidation.valid) {
      return res.status(400).json({ error: "El token es inválido o ha expirado" });
    }
    
    // Actualizar contraseña
    const updatedUser = await passwordRecoveryService.updatePassword({
      userId: id,
      newPassword,
      confirmPassword
    });
    
    // Eliminar token usado
    await passwordRecoveryService.deleteUsedToken(id);
    
    // Revocar todas las sesiones activas del usuario
    await passwordRecoveryService.revokeAllUserSessions(id);
    
    // Registrar evento de seguridad
    passwordRecoveryService.logPasswordResetCompleted({
      userId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    
    // Manejar errores específicos
    if (error.message === "Las contraseñas no coinciden") {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message === "Usuario no encontrado") {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Verificar validez del token sin procesar el reset
export const verifyResetToken = async (req, res) => {
  try {
    const { token, id } = req.query;
    
    // Validar parámetros
    if (!token || !id) {
      return res.status(400).json({ error: "Token o ID de usuario no proporcionado" });
    }
    
    // Obtener información del token
    const tokenInfo = await passwordRecoveryService.getTokenInfo({ token, userId: id });
    
    if (!tokenInfo.valid) {
      return res.status(400).json({ 
        valid: false,
        error: tokenInfo.error
      });
    }
    
    res.status(200).json({ 
      valid: true,
      message: "Token válido",
      expiresIn: tokenInfo.expiresIn
    });
    
  } catch (error) {
    console.error("Error al verificar token:", error);
    res.status(500).json({ 
      valid: false,
      error: "Error interno del servidor" 
    });
  }
};

// Función auxiliar para validar datos de reset
function _validateResetData(data) {
  const { token, id, newPassword, confirmPassword } = data;
  
  if (!token || !id || !newPassword || !confirmPassword) {
    return "Datos incompletos para el restablecimiento de contraseña";
  }
  
  if (newPassword !== confirmPassword) {
    return "Las contraseñas no coinciden";
  }
  
  return null;
}