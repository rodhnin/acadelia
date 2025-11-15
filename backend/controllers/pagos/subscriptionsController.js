// controllers/pagos/subscriptionsController.js
import { subscriptionsService } from "../../services/pagos/subscriptionsService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const SubscriptionsController = {
    /**
     * Obtiene todas las suscripciones con filtros opcionales
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getAllSubscriptions(req, res) {
        try {
            const filters = {
                status: req.query.status,
                id_user: req.query.id_user,
                id_carrera: req.query.id_carrera,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                search: req.query.search,
                sort_by: req.query.sort_by,
                sort_direction: req.query.sort_direction
            };
            
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };
            
            logSecurityEvent('SUBSCRIPTION_LIST_ACCESS', 'Acceso a lista de suscripciones', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const subscriptions = await subscriptionsService.getAllSubscriptions(filters, pagination);
            
            res.json({
                success: true,
                data: subscriptions.data,
                pagination: subscriptions.pagination
            });
        } catch (error) {
            console.error('Error obteniendo suscripciones:', error);
            
            logSecurityEvent('SUBSCRIPTION_LIST_ERROR', 'Error al obtener lista de suscripciones', {
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
    
    /**
     * Obtiene las suscripciones de un usuario específico
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getUserSubscriptions(req, res) {
        try {
            const { userId } = req.params;
            
            const isOwnRequest = req.user.id_user == userId;
            const isAdmin = req.user.id_rol === 3; // Asumiendo que 3 es el ID del rol de administrador
            
            if (!isOwnRequest && !isAdmin) {
                logSecurityEvent('UNAUTHORIZED_ACCESS', 'Intento de acceso no autorizado a suscripciones de otro usuario', {
                    requestUserId: req.user.id_user,
                    targetUserId: userId,
                    ip: req.ip
                }, 'high');
                
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a estas suscripciones'
                });
            }
            
            logSecurityEvent('USER_SUBSCRIPTION_ACCESS', 'Acceso a suscripciones de usuario', {
                requestUserId: req.user.id_user,
                targetUserId: userId,
                isOwnRequest,
                ip: req.ip
            }, 'medium');
            
            const subscriptions = await subscriptionsService.getUserSubscriptions(userId);
            
            res.json({
                success: true,
                data: subscriptions
            });
        } catch (error) {
            console.error(`Error obteniendo suscripciones del usuario ${req.params.userId}:`, error);
            
            logSecurityEvent('USER_SUBSCRIPTION_ERROR', 'Error al obtener suscripciones de usuario', {
                userId: req.user?.id_user,
                targetUserId: req.params.userId,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Obtiene una suscripción específica por su ID
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getSubscriptionById(req, res) {
        try {
            const { id } = req.params;
            
            const subscription = await subscriptionsService.getSubscriptionById(id);
            
            const isOwnSubscription = req.user.id_user == subscription.id_user;
            const isAdmin = req.user.id_rol === 3; // Asumiendo que 3 es el ID del rol de administrador
            
            if (!isOwnSubscription && !isAdmin) {
                logSecurityEvent('UNAUTHORIZED_ACCESS', 'Intento de acceso no autorizado a suscripción ajena', {
                    requestUserId: req.user.id_user,
                    subscriptionId: id,
                    subscriptionUserId: subscription.id_user,
                    ip: req.ip
                }, 'high');
                
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta suscripción'
                });
            }
            
            logSecurityEvent('SUBSCRIPTION_DETAIL_ACCESS', 'Acceso a detalle de suscripción', {
                requestUserId: req.user.id_user,
                subscriptionId: id,
                isOwnSubscription,
                ip: req.ip
            }, 'medium');
            
            res.json({
                success: true,
                data: subscription
            });
        } catch (error) {
            console.error(`Error obteniendo suscripción ${req.params.id}:`, error);
            
            logSecurityEvent('SUBSCRIPTION_DETAIL_ERROR', 'Error al obtener detalle de suscripción', {
                userId: req.user?.id_user,
                subscriptionId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si la suscripción no existe, devolver 404
            if (error.message === 'Suscripción no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Actualiza el estado de una suscripción
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async updateSubscriptionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere el nuevo estado de la suscripción'
                });
            }
            
            if (req.user.id_rol !== 3) {
                logSecurityEvent('UNAUTHORIZED_ACCESS', 'Intento de actualización de suscripción sin permisos', {
                    userId: req.user.id_user,
                    subscriptionId: id,
                    ip: req.ip
                }, 'high');
                
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para actualizar suscripciones'
                });
            }
            
            logSecurityEvent('ADMIN_SUBSCRIPTION_UPDATE_ATTEMPT', 'Intento de actualización de suscripción por admin', {
                adminId: req.user.id_user,
                subscriptionId: id,
                newStatus: status,
                ip: req.ip
            }, 'high');
            
            const updatedSubscription = await subscriptionsService.updateSubscriptionStatus(
                id, 
                status, 
                req.user.id_user
            );
            
            res.json({
                success: true,
                data: updatedSubscription,
                message: `Suscripción actualizada a estado: ${status}`
            });
        } catch (error) {
            console.error(`Error actualizando suscripción ${req.params.id}:`, error);
            
            logSecurityEvent('ADMIN_SUBSCRIPTION_UPDATE_ERROR', 'Error al actualizar suscripción', {
                userId: req.user?.id_user,
                subscriptionId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'high');
            
            // Si la suscripción no existe, devolver 404
            if (error.message === 'Suscripción no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            
            // Si el estado no es válido, devolver 400
            if (error.message.includes('Estado') && error.message.includes('no válido')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
/**
 * Obtiene estadísticas de suscripciones
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
async getSubscriptionStats(req, res) {
    try {
        const filters = {
            status: req.query.status,
            id_user: req.query.id_user,
            id_carrera: req.query.id_carrera,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            search: req.query.search
            // No incluimos sort_by y sort_direction porque no aplican para estadísticas
        };
        
        logSecurityEvent('SUBSCRIPTION_STATS_ACCESS', 'Acceso a estadísticas de suscripciones', {
            userId: req.user?.id_user,
            filters,
            ip: req.ip
        }, 'medium');
        
        console.log('Obteniendo estadísticas con filtros:', filters);
        
        try {
            const stats = await subscriptionsService.getSubscriptionStats(filters);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (serviceError) {
            // Si hay un error de permisos pero el usuario es admin (ID 3), ignorarlo
            if (serviceError.message && serviceError.message.includes("permiso") && req.user.id_rol === 3) {
                console.log("Error de permisos ignorado para administrador (ID 3)");
                
                const adminFilters = {...filters};
                // No forzar filtro de usuario para admin
                delete adminFilters.id_user;
                
                console.log('Obteniendo estadísticas de admin con filtros:', adminFilters);
                const stats = await subscriptionsService.getSubscriptionStatsAdmin(adminFilters);
                
                return res.json({
                    success: true,
                    data: stats
                });
            }
            // Si no es un error de permisos o el usuario no es admin, relanzar el error
            throw serviceError;
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas de suscripciones:', error);
        
        logSecurityEvent('SUBSCRIPTION_STATS_ERROR', 'Error al obtener estadísticas de suscripciones', {
            userId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
};

export default SubscriptionsController;