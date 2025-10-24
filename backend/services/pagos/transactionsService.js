// services/pagos/transactionsService.js
import pool from "../../lib/dbPool.js";

export class TransactionsService {
    /**
     * Obtiene todas las transacciones con filtros opcionales
     * @param {Object} filters - Filtros a aplicar
     * @param {Object} pagination - Configuración de paginación
     * @returns {Promise<Object>} - Transacciones y metadatos de paginación
     */
    async getAllTransactions(filters = {}, pagination = { page: 1, limit: 50 }) {
        try {
            // Construir la consulta base con los nuevos campos
            let query = `
                SELECT t.*, u.correo as user_email,
                       t.tax_amount, t.tax_rate, t.fee_amount, t.earnings,
                       t.country_code, t.exchange_rate, t.amount_eur, 
                       t.tax_amount_eur, t.fee_amount_eur, t.earnings_eur
                FROM historial_transacciones t
                LEFT JOIN usuario u ON t.id_user = u.id_user
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            // Aplicar filtros existentes
            if (filters.id_user) {
                query += ` AND t.id_user = $${paramIndex}`;
                queryParams.push(filters.id_user);
                paramIndex++;
            }
            
            if (filters.product_id) {
                query += ` AND t.product_id = $${paramIndex}`;
                queryParams.push(filters.product_id);
                paramIndex++;
            }
            
            if (filters.payment_method) {
                query += ` AND t.payment_method = $${paramIndex}`;
                queryParams.push(filters.payment_method);
                paramIndex++;
            }
            
            if (filters.date_from) {
                query += ` AND t.updated_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND t.updated_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            if (filters.min_amount) {
                query += ` AND t.amount >= $${paramIndex}`;
                queryParams.push(filters.min_amount);
                paramIndex++;
            }
            
            if (filters.max_amount) {
                query += ` AND t.amount <= $${paramIndex}`;
                queryParams.push(filters.max_amount);
                paramIndex++;
            }
            
            if (filters.currency_code) {
                query += ` AND t.currency_code = $${paramIndex}`;
                queryParams.push(filters.currency_code);
                paramIndex++;
            }
            
            // Nuevo: Filtro por país
            if (filters.country_code) {
                // Manejar caso especial 'ES' y 'non-ES'
                if (filters.country_code === 'ES') {
                    query += ` AND t.country_code = 'ES'`;
                } else if (filters.country_code === 'non-ES') {
                    query += ` AND (t.country_code IS NULL OR t.country_code != 'ES')`;
                } else {
                    query += ` AND t.country_code = $${paramIndex}`;
                    queryParams.push(filters.country_code);
                    paramIndex++;
                }
            }
            
            if (filters.search) {
                query += ` AND (
                    t.transaction_id ILIKE $${paramIndex} OR 
                    u.correo ILIKE $${paramIndex} OR 
                    t.product_name ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            
            // Consultar el total de registros para la paginación
            const countQuery = `SELECT COUNT(*) FROM (${query}) as subquery`;
            const countResult = await pool.query(countQuery, queryParams);
            const totalCount = parseInt(countResult.rows[0].count);
            
            // Aplicar ordenamiento y paginación
            const sortField = filters.sort_by || 'updated_at';
            const sortDirection = filters.sort_direction || 'DESC';
            
            query += ` ORDER BY t.${sortField} ${sortDirection}`;
            
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
            console.error('Error obteniendo transacciones:', error);
            throw error;
        }
    }
    
/**
 * Obtiene una transacción por su ID
 * @param {string} transactionId - ID de la transacción
 * @returns {Promise<Object>} - Datos de la transacción
 */
async getTransactionById(transactionId) {
    try {
        // Asegurarnos de que el transactionId se trata como texto
        const transactionIdStr = String(transactionId);
        
        // Modificar la consulta para usar CAST explícito en todas las comparaciones
        const query = `
            SELECT t.*, u.correo as user_email, c.nombre as carrera_nombre,
                   t.tax_amount, t.tax_rate, t.fee_amount, t.earnings,
                   t.country_code, t.exchange_rate, t.amount_eur,
                   t.tax_amount_eur, t.fee_amount_eur, t.earnings_eur,
                   t.invoice_url
            FROM historial_transacciones t
            LEFT JOIN usuario u ON CAST(t.id_user AS VARCHAR) = CAST(u.id_user AS VARCHAR)
            LEFT JOIN carrera c ON CAST(t.product_id AS VARCHAR) = CAST(c.id_carrera AS VARCHAR)
            WHERE t.transaction_id = $1
        `;
        
        console.log(`Ejecutando consulta para transacción: ${transactionIdStr}`);
        
        const result = await pool.query(query, [transactionIdStr]);
        
        if (result.rows.length === 0) {
            throw new Error('Transacción no encontrada');
        }
        
        return result.rows[0];
    } catch (error) {
        console.error(`Error obteniendo transacción ${transactionId}:`, error);
        throw error;
    }
}
    
    /**
     * Obtiene análisis de transacciones
     * @param {Object} filters - Filtros para el análisis (dates, etc)
     * @returns {Promise<Object>} - Datos de análisis
     */
    async getAnalytics(filters = {}) {
        try {
            // Parámetros de consulta
            const queryParams = [];
            let paramIndex = 1;
            
            // Condiciones para filtros de fecha
            let dateCondition = '';
            if (filters.date_from) {
                dateCondition += ` AND updated_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                dateCondition += ` AND updated_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            // 1. Ingresos totales por divisa (usando amount_eur para consistencia)
            const revenueByCurrencyQuery = `
                SELECT 
                    currency_code, 
                    SUM(amount) as total_original,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount) as tax_original,
                    SUM(tax_amount_eur) as tax_eur,
                    SUM(fee_amount) as fee_original,
                    SUM(fee_amount_eur) as fee_eur,
                    SUM(earnings) as earnings_original,
                    SUM(earnings_eur) as earnings_eur,
                    COUNT(*) as transactions
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY currency_code
                ORDER BY SUM(amount_eur) DESC
            `;
            
            // 2. Desglose por producto
            const revenueByProductQuery = `
                SELECT 
                    product_id, 
                    product_name, 
                    COUNT(*) as transactions,
                    SUM(amount) as total_original,
                    currency_code,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur,
                    SUM(earnings_eur) as earnings_eur
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY product_id, product_name, currency_code
                ORDER BY SUM(amount_eur) DESC
            `;
            
            // 3. Ingresos por periodo (mes) usando EUR para consistencia
            const revenueByMonthQuery = `
                SELECT 
                    DATE_TRUNC('month', updated_at) as month,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur,
                    COUNT(*) as transactions
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY DATE_TRUNC('month', updated_at)
                ORDER BY month
            `;
            
            // 4. Métodos de pago utilizados
            const paymentMethodsQuery = `
                SELECT 
                    payment_method,
                    COUNT(*) as count,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY payment_method
                ORDER BY count DESC
            `;
            
            // 5. Distribución geográfica (basado en country_code)
            const geographicDistributionQuery = `
                SELECT 
                    COALESCE(country_code, 'UNKNOWN') as country_code,
                    COUNT(*) as transactions,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur,
                    AVG(tax_rate) as avg_tax_rate
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY country_code
                ORDER BY SUM(amount_eur) DESC
            `;
            
            // Nuevo: 6. Análisis de España vs otros países (para IVA)
            const spainVsOthersQuery = `
                SELECT 
                    CASE 
                        WHEN country_code = 'ES' THEN 'España'
                        ELSE 'Otros países'
                    END as region,
                    COUNT(*) as transactions,
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur,
                    AVG(tax_rate) as avg_tax_rate
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
                GROUP BY 
                    CASE 
                        WHEN country_code = 'ES' THEN 'España'
                        ELSE 'Otros países'
                    END
                ORDER BY region
            `;
            
            // Ejecutar consultas
            const revenueByCurrency = await pool.query(revenueByCurrencyQuery, queryParams);
            const revenueByProduct = await pool.query(revenueByProductQuery, queryParams);
            const revenueByMonth = await pool.query(revenueByMonthQuery, queryParams);
            const paymentMethods = await pool.query(paymentMethodsQuery, queryParams);
            const geographicDistribution = await pool.query(geographicDistributionQuery, queryParams);
            const spainVsOthers = await pool.query(spainVsOthersQuery, queryParams);
            
            // Consulta para obtener el total de transacciones
            const totalTransactionsQuery = `
                SELECT 
                    COUNT(*) as count, 
                    SUM(amount_eur) as total_eur,
                    SUM(tax_amount_eur) as tax_eur,
                    SUM(fee_amount_eur) as fee_eur,
                    SUM(earnings_eur) as earnings_eur
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
            `;
            
            const totalTransactions = await pool.query(totalTransactionsQuery, queryParams);
            
            // Cálculo de transacciones por día (promedio)
            const dailyAvgQuery = `
                SELECT 
                    COUNT(*) / (EXTRACT(EPOCH FROM (MAX(updated_at) - MIN(updated_at))) / 86400) as daily_avg
                FROM historial_transacciones
                WHERE 1=1 ${dateCondition}
            `;
            
            const dailyAvg = await pool.query(dailyAvgQuery, queryParams);
            
            // Compilar resultados
            return {
                revenue_by_currency: revenueByCurrency.rows,
                revenue_by_product: revenueByProduct.rows,
                revenue_by_month: revenueByMonth.rows,
                payment_methods: paymentMethods.rows,
                geographic_distribution: geographicDistribution.rows,
                spain_vs_others: spainVsOthers.rows,
                totals: {
                    transactions: parseInt(totalTransactions.rows[0]?.count || 0),
                    revenue_eur: parseFloat(totalTransactions.rows[0]?.total_eur || 0),
                    tax_eur: parseFloat(totalTransactions.rows[0]?.tax_eur || 0),
                    fee_eur: parseFloat(totalTransactions.rows[0]?.fee_eur || 0),
                    earnings_eur: parseFloat(totalTransactions.rows[0]?.earnings_eur || 0),
                    daily_avg: parseFloat(dailyAvg.rows[0]?.daily_avg || 0)
                }
            };
        } catch (error) {
            console.error('Error obteniendo análisis de transacciones:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene los métodos de pago utilizados
     * @returns {Promise<Array>} - Lista de métodos de pago
     */
    async getPaymentMethods() {
        try {
            const query = `
                SELECT DISTINCT payment_method
                FROM historial_transacciones
                WHERE payment_method IS NOT NULL
                ORDER BY payment_method
            `;
            
            const result = await pool.query(query);
            return result.rows.map(row => row.payment_method);
        } catch (error) {
            console.error('Error obteniendo métodos de pago:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene las divisas utilizadas
     * @returns {Promise<Array>} - Lista de divisas
     */
    async getCurrencies() {
        try {
            const query = `
                SELECT DISTINCT currency_code
                FROM historial_transacciones
                WHERE currency_code IS NOT NULL
                ORDER BY currency_code
            `;
            
            const result = await pool.query(query);
            return result.rows.map(row => row.currency_code);
        } catch (error) {
            console.error('Error obteniendo divisas:', error);
            throw error;
        }
    }
}

export const transactionsService = new TransactionsService();