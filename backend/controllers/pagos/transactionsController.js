// controllers/pagos/transactionsController.js
import { transactionsService } from "../../services/pagos/transactionsService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import pool from "../../lib/dbPool.js";

export const TransactionsController = {
    /**
     * Obtiene todas las transacciones con filtros opcionales
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getAllTransactions(req, res) {
        try {
            const filters = {
                id_user: req.query.id_user,
                product_id: req.query.product_id,
                payment_method: req.query.payment_method,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                min_amount: req.query.min_amount,
                max_amount: req.query.max_amount,
                currency_code: req.query.currency_code,
                search: req.query.search,
                sort_by: req.query.sort_by,
                sort_direction: req.query.sort_direction
            };
            
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };
            
            logSecurityEvent('TRANSACTION_LIST_ACCESS', 'Acceso a lista de transacciones', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const transactions = await transactionsService.getAllTransactions(filters, pagination);
            
            res.json({
                success: true,
                data: transactions.data,
                pagination: transactions.pagination
            });
        } catch (error) {
            console.error('Error obteniendo transacciones:', error);
            
            logSecurityEvent('TRANSACTION_LIST_ERROR', 'Error al obtener lista de transacciones', {
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
     * Obtiene una transacción específica por su ID
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getTransactionById(req, res) {
        try {
            const { id } = req.params;
            
            const transaction = await transactionsService.getTransactionById(id);
            
            const isOwnTransaction = req.user.id_user == transaction.id_user;
            const isAdmin = req.user.id_rol === 2; // Asumiendo que 2 es el ID del rol de administrador
            
            if (!isOwnTransaction && !isAdmin) {
                logSecurityEvent('UNAUTHORIZED_ACCESS', 'Intento de acceso no autorizado a transacción ajena', {
                    requestUserId: req.user.id_user,
                    transactionId: id,
                    transactionUserId: transaction.id_user,
                    ip: req.ip
                }, 'high');
                
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta transacción'
                });
            }
            
            logSecurityEvent('TRANSACTION_DETAIL_ACCESS', 'Acceso a detalle de transacción', {
                requestUserId: req.user.id_user,
                transactionId: id,
                isOwnTransaction,
                ip: req.ip
            }, 'medium');
            
            res.json({
                success: true,
                data: transaction
            });
        } catch (error) {
            console.error(`Error obteniendo transacción ${req.params.id}:`, error);
            
            logSecurityEvent('TRANSACTION_DETAIL_ERROR', 'Error al obtener detalle de transacción', {
                userId: req.user?.id_user,
                transactionId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si la transacción no existe, devolver 404
            if (error.message === 'Transacción no encontrada') {
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
     * Obtiene análisis de transacciones
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getAnalytics(req, res) {
        try {
            const filters = {
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                product_id: req.query.product_id,
                currency_code: req.query.currency_code
            };
            
            logSecurityEvent('TRANSACTION_ANALYTICS_ACCESS', 'Acceso a analíticas de transacciones', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const analytics = await transactionsService.getAnalytics(filters);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Error obteniendo analíticas de transacciones:', error);
            
            logSecurityEvent('TRANSACTION_ANALYTICS_ERROR', 'Error al obtener analíticas de transacciones', {
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
     * Obtiene los métodos de pago utilizados
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getPaymentMethods(req, res) {
        try {
            const paymentMethods = await transactionsService.getPaymentMethods();
            
            res.json({
                success: true,
                data: paymentMethods
            });
        } catch (error) {
            console.error('Error obteniendo métodos de pago:', error);
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Obtiene las divisas utilizadas
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getCurrencies(req, res) {
        try {
            const currencies = await transactionsService.getCurrencies();
            
            res.json({
                success: true,
                data: currencies
            });
        } catch (error) {
            console.error('Error obteniendo divisas:', error);
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getTransactionInvoice(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de transacción no proporcionado'
                });
            }
            
            if (!req.user || req.user.id_rol !== 3) {
                console.error(`Intento de acceso no autorizado al panel admin por usuario: ${req.user?.id_user}`);
                return res.status(403).json({
                    success: false,
                    message: 'Acceso no autorizado. Se requieren privilegios de administrador.'
                });
            }
            
            console.log(`[ADMIN] Buscando factura para transacción: ${id}`);
            
            // Administrador verificado, ahora buscar la factura directamente
            try {
                // Consulta simple para obtener la URL de la factura
                const invoiceQuery = `
                    SELECT invoice_url
                    FROM historial_transacciones
                    WHERE transaction_id = $1
                `;
                
                console.log(`Ejecutando consulta administrativa para transaction_id: ${id}`);
                
                const invoiceResult = await pool.query(invoiceQuery, [id]);
                
                // Si encontramos la transacción y tiene URL de Google Drive, usarla
                if (invoiceResult.rows.length > 0 && invoiceResult.rows[0].invoice_url) {
                    console.log(`[ADMIN] Factura encontrada en Google Drive: ${invoiceResult.rows[0].invoice_url}`);
                    
                    return res.json({
                        success: true,
                        data: {
                            url: invoiceResult.rows[0].invoice_url,
                            source: 'google_drive'
                        }
                    });
                } else {
                    console.log(`[ADMIN] No se encontró URL de factura en base de datos para transacción ${id}`);
                }
            } catch (dbError) {
                console.error(`[ADMIN] Error al buscar URL de factura en DB: ${dbError.message}`);
            }
            
            // Si no hay URL en Google Drive, obtener de Paddle como administrador
            console.log(`[ADMIN] Intentando obtener factura desde Paddle para transacción: ${id}`);
            
            try {
                // Importación dinámica para evitar dependencias circulares
                const paddleModule = await import("../../services/pagos/paddleService.js");
                const PaddleService = paddleModule.PaddleService;
                
                console.log(`[ADMIN] Obteniendo factura como ADMIN: {
                    transactionId: '${id}',
                    environment: '${process.env.NODE_ENV || 'development'}'
                }`);
                
                const result = await PaddleService.getInvoiceUrl(id, null);
                return res.json(result);
            } catch (paddleError) {
                console.error(`[ADMIN] Error al obtener factura de Paddle: ${paddleError.message}`);
                return res.status(500).json({
                    success: false,
                    message: `Error al obtener factura desde Paddle: ${paddleError.message}`
                });
            }
        } catch (error) {
            console.error(`[ADMIN] Error general al obtener factura para transacción ${req.params.id}:`, error);
            
            res.status(500).json({
                success: false,
                message: `Error del servidor: ${error.message}`
            });
        }
    }
};

export default TransactionsController;