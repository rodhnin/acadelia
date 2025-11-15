import { passwordRecoveryService } from "../../services/usuarios/passwordRecoveryService.js";

export const requestPasswordReset = async (req, res) => {
  try {
    const { correo } = req.body;
    console.log('Solicitud de recuperación para:', correo);

    if (!correo) {
      return res.status(400).json({ error: "El correo electrónico es obligatorio" });
    }

    const user = await passwordRecoveryService.findUserByEmail(correo);

    if (!user) {
      // Por seguridad, no informar si el correo existe o no
      return res.status(200).json({ 
        message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" 
      });
    }

    console.log('Usuario encontrado:', user.id_user);
    
    try {
      const { resetToken } = await passwordRecoveryService.generateResetToken(user.id_user);
      
      await passwordRecoveryService.sendResetEmail({
        email: user.correo,
        resetToken,
        userId: user.id_user
      });
      
      passwordRecoveryService.logPasswordResetRequest({
        userId: user.id_user,
        email: user.correo,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
    } catch (serviceError) {
      console.error('ERROR EN SERVICIO DE RECUPERACIÓN:', serviceError);
    }
    
    res.status(200).json({ 
      message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña" 
    });
    
  } catch (error) {
    console.error("Error en solicitud de recuperación de contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, id, newPassword, confirmPassword } = req.body;
    
    const validationError = _validateResetData({ token, id, newPassword, confirmPassword });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    const tokenValidation = await passwordRecoveryService.validateResetToken({ token, userId: id });
    
    if (!tokenValidation.valid) {
      return res.status(400).json({ error: "El token es inválido o ha expirado" });
    }
    
    const updatedUser = await passwordRecoveryService.updatePassword({
      userId: id,
      newPassword,
      confirmPassword
    });
    
    await passwordRecoveryService.deleteUsedToken(id);
    
    // Revocar todas las sesiones activas del usuario
    await passwordRecoveryService.revokeAllUserSessions(id);
    
    passwordRecoveryService.logPasswordResetCompleted({
      userId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    
    if (error.message === "Las contraseñas no coinciden") {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message === "Usuario no encontrado") {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token, id } = req.query;
    
    if (!token || !id) {
      return res.status(400).json({ error: "Token o ID de usuario no proporcionado" });
    }
    
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