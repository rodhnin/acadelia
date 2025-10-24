// services/pagos/subscriptionsService.js
import pool from "../../lib/dbPool.js";
import { PaddleService } from "./paddleService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export class SubscriptionsService {
    /**
     * Obtiene todas las suscripciones con filtros opcionales
     * @param {Object} filters - Filtros a aplicar (status, date_from, date_to, etc)
     * @param {Object} pagination - Datos de paginación (page, limit)
     * @returns {Promise<Object>} - Suscripciones y metadata de paginación
     */
    async getAllSubscriptions(filters = {}, pagination = { page: 1, limit: 50 }) {
        try {
            // Construir la consulta base
            let query = `
                SELECT s.*, u.correo as user_email, c.nombre as carrera_nombre
                FROM suscripciones s
                LEFT JOIN usuario u ON s.id_user = u.id_user
                LEFT JOIN carrera c ON s.id_carrera = c.id_carrera
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            // Aplicar filtros
            if (filters.status) {
                query += ` AND s.status = $${paramIndex}`;
                queryParams.push(filters.status);
                paramIndex++;
            }
            
            if (filters.id_user) {
                query += ` AND s.id_user = $${paramIndex}`;
                queryParams.push(filters.id_user);
                paramIndex++;
            }
            
            if (filters.id_carrera) {
                query += ` AND s.id_carrera = $${paramIndex}`;
                queryParams.push(filters.id_carrera);
                paramIndex++;
            }
            
            if (filters.date_from) {
                query += ` AND s.created_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND s.created_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            if (filters.search) {
                query += ` AND (
                    u.correo ILIKE $${paramIndex} OR 
                    c.nombre ILIKE $${paramIndex} OR 
                    s.product_name ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            
            // Consultar el total de registros para la paginación
            const countQuery = `SELECT COUNT(*) FROM (${query}) as subquery`;
            const countResult = await pool.query(countQuery, queryParams);
            const totalCount = parseInt(countResult.rows[0].count);
            
            // Aplicar ordenamiento y paginación
            const sortField = filters.sort_by || 'created_at';
            const sortDirection = filters.sort_direction || 'DESC';
            
            query += ` ORDER BY s.${sortField} ${sortDirection}`;
            
            // Paginación
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
            const offset = (page - 1) * limit;
            
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(limit, offset);
            
            // Ejecutar la consulta final
            const result = await pool.query(query, queryParams);
            
            return {
                data: result.rows,
                pagination: {
                    total: totalCount,
                    page: page,
                    limit: limit,
                    pages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('Error obteniendo suscripciones:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene todas las suscripciones de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Array>} - Suscripciones del usuario
     */
    async getUserSubscriptions(userId) {
        try {
            const query = `
                SELECT s.*, c.nombre as carrera_nombre, c.descripcion as carrera_descripcion
                FROM suscripciones s
                LEFT JOIN carrera c ON s.id_carrera = c.id_carrera
                WHERE s.id_user = $1
                ORDER BY s.created_at DESC
            `;
            
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error(`Error obteniendo suscripciones del usuario ${userId}:`, error);
            throw error;
        }
    }
    
    /**
     * Obtiene una suscripción por su ID
     * @param {string} subscriptionId - ID de la suscripción
     * @returns {Promise<Object>} - Datos de la suscripción
     */
    async getSubscriptionById(subscriptionId) {
        try {
            const query = `
                SELECT s.*, u.correo as user_email, c.nombre as carrera_nombre, c.descripcion as carrera_descripcion
                FROM suscripciones s
                LEFT JOIN usuario u ON s.id_user = u.id_user
                LEFT JOIN carrera c ON s.id_carrera = c.id_carrera
                WHERE s.subscription_id = $1
            `;
            
            const result = await pool.query(query, [subscriptionId]);
            
            if (result.rows.length === 0) {
                throw new Error('Suscripción no encontrada');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error(`Error obteniendo suscripción ${subscriptionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Actualiza el estado de una suscripción
     * @param {string} subscriptionId - ID de la suscripción
     * @param {string} newStatus - Nuevo estado
     * @param {number} adminUserId - ID del administrador que realiza el cambio
     * @returns {Promise<Object>} - Suscripción actualizada
     */
    async updateSubscriptionStatus(subscriptionId, newStatus, adminUserId) {
        try {
            // 1. Verificar existencia de la suscripción
            const subscriptionQuery = `SELECT * FROM suscripciones WHERE subscription_id = $1`;
            const subscriptionResult = await pool.query(subscriptionQuery, [subscriptionId]);
            
            if (subscriptionResult.rows.length === 0) {
                throw new Error('Suscripción no encontrada');
            }
            
            const subscription = subscriptionResult.rows[0];
            
            // 2. Validar estado solicitado
            const validStates = ['active', 'paused', 'canceled'];
            if (!validStates.includes(newStatus)) {
                throw new Error(`Estado ${newStatus} no válido. Estados permitidos: ${validStates.join(', ')}`);
            }
            
            // 3. Actualizar en Paddle (delegando al servicio existente)
            const paddleResult = await PaddleService.updateSubscriptionStatus(subscriptionId, newStatus);
            
            // Log de acción administrativa
            logSecurityEvent('ADMIN_SUBSCRIPTION_UPDATE', `Suscripción ${subscriptionId} actualizada a ${newStatus}`, {
                adminUserId: adminUserId,
                subscriptionId: subscriptionId,
                userId: subscription.id_user,
                oldStatus: subscription.status,
                newStatus: newStatus
            }, 'medium');
            
            return paddleResult;
        } catch (error) {
            console.error(`Error actualizando estado de suscripción ${subscriptionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Obtiene estadísticas de suscripciones
     * @param {Object} filters - Filtros opcionales (date_from, date_to, etc)
     * @returns {Promise<Object>} - Estadísticas de suscripciones
     */
    async getSubscriptionStats(filters = {}) {
        try {
            console.log('Service: procesando estadísticas con filtros:', filters);
            
            // Parámetros de consulta
            const queryParams = [];
            let paramIndex = 1;
            
            // Construir todas las condiciones de filtrado (no solo fechas)
            let conditions = ' WHERE 1=1';
            
            // Filtro por estado
            if (filters.status) {
                conditions += ` AND status = $${paramIndex}`;
                queryParams.push(filters.status);
                paramIndex++;
            }
            
            // Filtro por usuario
            if (filters.id_user) {
                conditions += ` AND id_user = $${paramIndex}`;
                queryParams.push(filters.id_user);
                paramIndex++;
            }
            
            // Filtro por carrera/producto
            if (filters.id_carrera) {
                conditions += ` AND id_carrera = $${paramIndex}`;
                queryParams.push(filters.id_carrera);
                paramIndex++;
            }
            
            // Filtros de fecha
            if (filters.date_from) {
                conditions += ` AND created_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                conditions += ` AND created_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            // Filtro por término de búsqueda
            // Necesitamos una subconsulta para el filtro de búsqueda ya que involucra joins
            let searchCondition = '';
            if (filters.search) {
                // Crear subconsulta para obtener IDs que coincidan con la búsqueda
                const searchQuery = `
                    SELECT DISTINCT s.subscription_id
                    FROM suscripciones s
                    LEFT JOIN usuario u ON s.id_user = u.id_user
                    LEFT JOIN carrera c ON s.id_carrera = c.id_carrera
                    WHERE 
                        u.correo ILIKE $${paramIndex} OR 
                        c.nombre ILIKE $${paramIndex} OR 
                        s.product_name ILIKE $${paramIndex}
                `;
                
                // Ejecutar subconsulta
                const searchResult = await pool.query(searchQuery, [`%${filters.search}%`]);
                
                // Si hay resultados, añadir condición
                if (searchResult.rows.length > 0) {
                    const subscriptionIds = searchResult.rows.map(row => row.subscription_id);
                    searchCondition = ` AND subscription_id = ANY($${paramIndex})`;
                    queryParams.push(subscriptionIds);
                    paramIndex++;
                } else {
                    // Si no hay coincidencias, forzar cero resultados
                    searchCondition = ' AND 1=0';
                }
            }
            
            conditions += searchCondition;
            
            console.log(`Condiciones para estadísticas: ${conditions}`);
            console.log(`Parámetros: ${queryParams}`);
            
            // Estadísticas por estado
            const statusQuery = `
                SELECT status, COUNT(*) as count
                FROM suscripciones
                ${conditions}
                GROUP BY status
            `;
            
            // Estadísticas por producto/carrera
            const productQuery = `
                SELECT id_carrera, COUNT(*) as count
                FROM suscripciones
                ${conditions}
                GROUP BY id_carrera
            `;
            
            // Estadísticas de crecimiento (nuevas suscripciones por mes)
            const growthQuery = `
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as new_subscriptions
                FROM suscripciones
                ${conditions}
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
            `;
            
            // Estadísticas de cancelaciones por mes
            const cancellationsConditions = conditions + ` AND status = 'canceled'`;
            const cancellationsQuery = `
                SELECT 
                    DATE_TRUNC('month', updated_at) as month,
                    COUNT(*) as cancellations
                FROM suscripciones
                ${cancellationsConditions}
                GROUP BY DATE_TRUNC('month', updated_at)
                ORDER BY month
            `;
            
            // Estadísticas de suscripciones expiradas por mes
            const expiredConditions = conditions + ` AND status = 'expired'`;
            const expiredQuery = `
                SELECT 
                    DATE_TRUNC('month', updated_at) as month,
                    COUNT(*) as expirations
                FROM suscripciones
                ${expiredConditions}
                GROUP BY DATE_TRUNC('month', updated_at)
                ORDER BY month
            `;
            
            // Ejecutar consultas
            const statusResult = await pool.query(statusQuery, queryParams);
            const productResult = await pool.query(productQuery, queryParams);
            const growthResult = await pool.query(growthQuery, queryParams);
            const cancellationsResult = await pool.query(cancellationsQuery, queryParams);
            const expiredResult = await pool.query(expiredQuery, queryParams);
            
            // Cargar nombres de carreras para los productos
            const carreraIds = productResult.rows.map(row => row.id_carrera).filter(id => id);
            let carreraNames = {};
            
            if (carreraIds.length > 0) {
                const carrerasQuery = `
                    SELECT id_carrera, nombre
                    FROM carrera
                    WHERE id_carrera = ANY($1)
                `;
                
                const carrerasResult = await pool.query(carrerasQuery, [carreraIds]);
                carreraNames = Object.fromEntries(
                    carrerasResult.rows.map(row => [row.id_carrera, row.nombre])
                );
            }
            
            // Enriquecer datos de productos con nombres
            const productsWithNames = productResult.rows.map(row => ({
                id_carrera: row.id_carrera,
                nombre: carreraNames[row.id_carrera] || `Carrera ${row.id_carrera}`,
                count: row.count
            }));
            
            console.log(`Encontradas ${statusResult.rows.length} estados diferentes con los filtros aplicados`);
            
            // Compilar resultados
            return {
                by_status: statusResult.rows,
                by_product: productsWithNames,
                growth_by_month: growthResult.rows,
                cancellations_by_month: cancellationsResult.rows,
                expirations_by_month: expiredResult.rows, // Nuevo: añadir datos de expiradas
                total_active: statusResult.rows.find(r => r.status === 'active')?.count || 0,
                total_paused: statusResult.rows.find(r => r.status === 'paused')?.count || 0,
                total_canceled: statusResult.rows.find(r => r.status === 'canceled')?.count || 0,
                total_expired: statusResult.rows.find(r => r.status === 'expired')?.count || 0 // Nuevo: añadir conteo de expiradas
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas de suscripciones:', error);
            throw error;
        }
    }
}

export const subscriptionsService = new SubscriptionsService();