import { getUserSubscriptions, getSubscriptionsByStatus } from "../../services/usuarios/suscriptionService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const getSubscriptions = async (req, res) => {
    try {
        const userId = req.params.userId;
        const status = req.query.status; // Opcional: filtrar por estado
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "ID de usuario no proporcionado"
            });
        }

        let subscriptions;
        if (status) {
            subscriptions = await getSubscriptionsByStatus(userId, status);
        } else {
            subscriptions = await getUserSubscriptions(userId);
        }
        
        return res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        // Log de error en acceso a suscripciones
        logSecurityEvent('SUBSCRIPTION_ACCESS_ERROR', 'Error accediendo a información de suscripciones', {
            targetUserId: req.params.userId,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};