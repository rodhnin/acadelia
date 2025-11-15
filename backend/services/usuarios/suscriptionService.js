// services/usuarios/subscriptionService.js
import pool from "../../lib/dbPool.js";

export const getUserSubscriptions = async (userId) => {
    try {
        const query = `
            SELECT 
                s.*,
                u.correo,
                u.google_id
            FROM suscripciones s
            INNER JOIN usuario u ON s.id_user = u.id_user
            WHERE s.id_user = $1
            ORDER BY s.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        
        const subscriptions = result.rows.map(subscription => {
            return {
                ...subscription,
                status_details: getStatusDetails(subscription.status),
                is_active: subscription.status === 'active',
                is_paused: subscription.status === 'paused',
                is_canceled: subscription.status === 'canceled'
            };
        });
        
        return subscriptions;
    } catch (error) {
        throw new Error(`Error al obtener las suscripciones: ${error.message}`);
    }
};

const getStatusDetails = (status) => {
    const statusMap = {
        'active': {
            label: 'Activa',
            description: 'Tu suscripción está activa y se renovará automáticamente',
            class: 'status-active'
        },
        'paused': {
            label: 'Pausada',
            description: 'Tu suscripción está pausada temporalmente',
            class: 'status-paused'
        },
        'canceled': {
            label: 'Cancelada',
            description: 'Tu suscripción ha sido cancelada',
            class: 'status-canceled'
        },
        'default': {
            label: 'Estado Desconocido',
            description: 'Estado de suscripción no reconocido',
            class: 'status-unknown'
        }
    };
    
    return statusMap[status] || statusMap.default;
};

export const getSubscriptionsByStatus = async (userId, status) => {
    try {
        const query = `
            SELECT 
                s.*,
                u.correo,
                u.google_id
            FROM suscripciones s
            INNER JOIN usuario u ON s.id_user = u.id_user
            WHERE s.id_user = $1 AND s.status = $2
            ORDER BY s.created_at DESC
        `;
        
        const result = await pool.query(query, [userId, status]);
        return result.rows.map(subscription => ({
            ...subscription,
            status_details: getStatusDetails(subscription.status),
            is_active: subscription.status === 'active',
            is_paused: subscription.status === 'paused',
            is_canceled: subscription.status === 'canceled'
        }));
    } catch (error) {
        throw new Error(`Error al obtener las suscripciones por estado: ${error.message}`);
    }
};
