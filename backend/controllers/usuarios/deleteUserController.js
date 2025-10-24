// backend/controllers/usuarios/deleteUserController.js
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { deleteAccountService } from '../../services/usuarios/deleteAccountService.js';

// Controlador para la eliminación de cuenta de usuario
export const deleteUserController = {
  // Solicitar eliminación de cuenta (generar código de verificación)
  requestDeletion: async (req, res) => {
    try {
      const userId = req.user.id_user;
      
      // Generar solicitud de eliminación
      const { deletionToken, verificationCode } = await deleteAccountService.generateDeletionRequest({
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Obtener email del usuario
      const email = await deleteAccountService.getUserEmail(userId);
      
      // Enviar correo con código de verificación
      await deleteAccountService.sendVerificationEmail(email, verificationCode);
      
      // Éxito - devolver deletionToken
      res.status(200).json({
        success: true,
        message: "Se ha enviado un código de verificación a tu correo electrónico",
        deletionToken
      });
      
    } catch (error) {
      console.error("Error al solicitar eliminación de cuenta:", error);
      logSecurityEvent('ACCOUNT_DELETION_REQUEST_ERROR', 'Error al solicitar eliminación de cuenta', {
        userId: req.user.id_user,
        error: error.message,
        ip: req.ip
      }, 'high');
      
      res.status(500).json({ 
        success: false, 
        error: "Error al procesar la solicitud de eliminación de cuenta" 
      });
    }
  },
  
  // Confirmar eliminación de cuenta
  confirmDeletion: async (req, res) => {
    try {
      const userId = req.user.id_user;
      const { verificationCode, deletionToken, reason } = req.body;
      
      console.log('Datos recibidos para eliminación:');
      console.log('- userId:', userId);
      console.log('- verificationCode:', verificationCode);
      console.log('- deletionToken:', deletionToken);
      console.log('- reason:', reason);
      
      // Validar datos requeridos
      if (!verificationCode || !deletionToken) {
        console.log('Error: Faltan datos obligatorios');
        return res.status(400).json({ 
          success: false, 
          error: "Código de verificación y token son requeridos" 
        });
      }
      
      // Validar solicitud de eliminación
      const validation = await deleteAccountService.validateDeletionRequest({
        userId,
        verificationCode,
        deletionToken
      });
      
      if (!validation.valid) {
        if (validation.error === "Código de verificación incorrecto") {
          logSecurityEvent('ACCOUNT_DELETION_INVALID_CODE', 'Código de verificación incorrecto para eliminación de cuenta', {
            userId,
            ip: req.ip
          }, 'high');
        }
        
        return res.status(400).json({ 
          success: false, 
          error: validation.error 
        });
      }
      
      console.log('Código verificado correctamente');
      
      // Marcar solicitud como completada
      await deleteAccountService.markRequestCompleted({
        userId,
        deletionToken,
        reason
      });
      
      // Eliminar cuenta del usuario
      await deleteAccountService.deleteUserAccount(
        userId, 
        req.ip, 
        req.headers['user-agent'], 
        reason
      );
      
      // Limpiar cookies de sesión
      _clearSessionCookies(res);
      
      // Enviar respuesta exitosa
      console.log('Cuenta eliminada correctamente y sesión terminada');
      res.status(200).json({
        success: true,
        message: "Tu cuenta ha sido eliminada correctamente",
        sessionClosed: true
      });
      
    } catch (error) {
      console.error("Error al confirmar eliminación de cuenta:", error);
      logSecurityEvent('ACCOUNT_DELETION_CONFIRM_ERROR', 'Error al confirmar eliminación de cuenta', {
        userId: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'critical');
      
      res.status(500).json({ 
        success: false, 
        error: "Error al procesar la eliminación de cuenta" 
      });
    }
  }
};

// Función auxiliar para limpiar cookies de sesión
function _clearSessionCookies(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "Strict",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined
  });
  
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "Strict",
    path: "/api/usuarios/refresh-token",
    domain: process.env.COOKIE_DOMAIN || undefined
  });
}