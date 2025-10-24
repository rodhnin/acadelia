// controllers/payment/paddleController.js
import { PaddleService } from "../../services/pagos/paddleService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const PaddleController = {
  async handleStatusChange(req, res) {
    try {
      const { action } = req.params;
      const { subscriptionId } = req.body;
      const userId = req.user.id_user;
      const userRole = req.user.id_rol
  
      console.log('[Request]', { action, subscriptionId, userId, userRole });
  
      // Verificar permisos - Permitir al propietario O a usuarios administradores
      const isOwner = await PaddleService.verifySubscriptionOwner(userId, subscriptionId);
      const isAdmin = userRole === 3; // Verificar si es administrador
      
      if (!isOwner && !isAdmin) {
        // Log de intento de acceso no autorizado
        logSecurityEvent('UNAUTHORIZED_ACCESS', 'Intento de modificar suscripción ajena', {
          userId: userId,
          subscriptionId: subscriptionId,
          action: action,
          ip: req.ip
        }, 'medium');
        
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos sobre esta suscripción' 
        });
      }
  
      // Si llega aquí, el usuario tiene permisos (es propietario o es admin)
      let result;
      if (action === 'delete') {
        result = await PaddleService.deleteSubscription(subscriptionId);
        
        // Log de eliminación de suscripción
        logSecurityEvent('SUBSCRIPTION_DELETED', `Suscripción eliminada por ${isAdmin ? 'administrador' : 'propietario'}`, {
          userId: userId,
          subscriptionId: subscriptionId,
          isAdmin: isAdmin,
          ip: req.ip
        }, 'high');
      } else {
        // Mapear acciones a estados
        const statusMap = {
          resume: 'active',
          cancel: 'canceled'
        };
  
        if (!statusMap[action]) {
          return res.status(400).json({ 
            success: false, 
            message: 'Acción no válida' 
          });
        }
  
        result = await PaddleService.updateSubscriptionStatus(subscriptionId, statusMap[action]);
        
        // Log de cambio de estado de suscripción
        logSecurityEvent('SUBSCRIPTION_STATUS_CHANGE', `Suscripción ${action} por ${isAdmin ? 'administrador' : 'propietario'}`, {
          userId: userId,
          subscriptionId: subscriptionId,
          newStatus: statusMap[action],
          isAdmin: isAdmin,
          ip: req.ip
        }, 'medium');
      }
  
      res.json({ 
        success: true, 
        data: result 
      });
  
    } catch (error) {
      console.error('[Controller Error]', error);
      
      // Log de error en la gestión de suscripción
      logSecurityEvent('SUBSCRIPTION_ERROR', 'Error en gestión de suscripción', {
        userId: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');
      
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },
  
  async getPortalUrl(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id_user;
      const userRole = req.user.id_rol
  
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "ID de transacción no proporcionado"
        });
      }
  
      // Verificar si el usuario es administrador
      const isAdmin = userRole === 3;
  
      // Si es admin, no verificamos la pertenencia de la transacción
      if (!isAdmin) {
        // Verificar que la transacción pertenece al usuario (solo para no-admin)
        const transactionBelongsToUser = await PaddleService.verifyTransactionOwner(userId, transactionId);
        if (!transactionBelongsToUser) {
          return res.status(403).json({
            success: false,
            message: "No tienes acceso a esta transacción"
          });
        }
      }
  
      // Crear sesión del portal usando el servicio
      const result = await PaddleService.createPortalSession(transactionId, isAdmin ? null : userId);
      
      // Log de acceso al portal de pago
      logSecurityEvent('PAYMENT_PORTAL_ACCESS', `Acceso al portal de pago por ${isAdmin ? 'administrador' : 'usuario'}`, {
        userId: userId,
        transactionId: transactionId,
        isAdmin: isAdmin,
        ip: req.ip
      }, 'info');
      
      res.json(result);
  
    } catch (error) {
      console.error('[Controller Error]', error);
      
      // Log de error en acceso al portal
      logSecurityEvent('PAYMENT_PORTAL_ERROR', 'Error al acceder al portal de pago', {
        userId: req.user?.id_user,
        transactionId: req.params?.transactionId,
        error: error.message,
        ip: req.ip
      }, 'medium');
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener URL del portal'
      });
    }
  },
  
  async getInvoice(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id_user;
      const userRole = req.user.id_rol
  
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "ID de transacción no proporcionado"
        });
      }
  
      // Verificar si el usuario es administrador
      const isAdmin = userRole === 3;
  
      // Si es admin, no verificamos la pertenencia de la transacción
      if (!isAdmin) {
        // Verificar que la transacción pertenece al usuario (solo para no-admin)
        const transactionBelongsToUser = await PaddleService.verifyTransactionOwner(userId, transactionId);
        if (!transactionBelongsToUser) {
          return res.status(403).json({
            success: false,
            message: "No tienes acceso a esta factura"
          });
        }
      }
  
      // Verificar y obtener la factura usando el servicio
      const result = await PaddleService.getInvoiceUrl(transactionId, isAdmin ? null : userId);
      
      // Log de acceso a factura
      logSecurityEvent('INVOICE_ACCESS', `Acceso a factura por ${isAdmin ? 'administrador' : 'usuario'}`, {
        userId: userId,
        transactionId: transactionId,
        isAdmin: isAdmin,
        ip: req.ip
      }, 'info');
      
      res.json(result);
  
    } catch (error) {
      console.error('[Controller Error]', error);
      
      // Log de error en acceso a factura
      logSecurityEvent('INVOICE_ACCESS_ERROR', 'Error al acceder a factura', {
        userId: req.user?.id_user,
        transactionId: req.params?.transactionId,
        error: error.message,
        ip: req.ip
      }, 'medium');
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener la factura'
      });
    }
  }
};