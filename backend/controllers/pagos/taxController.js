// controllers/pagos/taxController.js
import { taxService } from "../../services/pagos/taxService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const TaxController = {
    /**
     * Obtiene el resumen de impuestos para un período
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getTaxSummary(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                currency_code: req.query.currency_code
            };
            
            // Log de acceso
            logSecurityEvent('TAX_SUMMARY_ACCESS', 'Acceso a resumen de impuestos', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const taxSummary = await taxService.getTaxSummary(filters);
            
            res.json({
                success: true,
                data: taxSummary
            });
        } catch (error) {
            console.error('Error obteniendo resumen de impuestos:', error);
            
            logSecurityEvent('TAX_SUMMARY_ERROR', 'Error al obtener resumen de impuestos', {
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
     * Obtiene los impuestos por país
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getTaxesByCountry(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            
            // Log de acceso
            logSecurityEvent('TAX_BY_COUNTRY_ACCESS', 'Acceso a impuestos por país', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const taxesByCountry = await taxService.getTaxesByCountry(filters);
            
            res.json({
                success: true,
                data: taxesByCountry
            });
        } catch (error) {
            console.error('Error obteniendo impuestos por país:', error);
            
            logSecurityEvent('TAX_BY_COUNTRY_ERROR', 'Error al obtener impuestos por país', {
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
     * Genera un informe de impuestos
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async generateTaxReport(req, res) {
        try {
            // Extraer parámetros del cuerpo de la petición
            const { date_from, date_to, format, filters } = req.body;
            
            if (!date_from || !date_to) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un período (date_from y date_to)'
                });
            }
            
            // Log de acceso
            logSecurityEvent('TAX_REPORT_GENERATION', 'Generación de informe de impuestos', {
                userId: req.user?.id_user,
                period: { date_from, date_to },
                format,
                ip: req.ip
            }, 'high');
            
            const report = await taxService.generateTaxReport({
                date_from,
                date_to,
                format: format || 'json',
                filters,
                created_by: req.user.id_user
            });
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Error generando informe de impuestos:', error);
            
            logSecurityEvent('TAX_REPORT_ERROR', 'Error al generar informe de impuestos', {
                userId: req.user?.id_user,
                error: error.message,
                ip: req.ip
            }, 'high');
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Obtiene análisis de impuestos históricos
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getHistoricalTaxAnalysis(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                country_code: req.query.country_code
            };
            
            // Log de acceso
            logSecurityEvent('HISTORICAL_TAX_ACCESS', 'Acceso a análisis histórico de impuestos', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const historicalData = await taxService.getHistoricalTaxAnalysis(filters);
            
            res.json({
                success: true,
                data: historicalData
            });
        } catch (error) {
            console.error('Error obteniendo análisis histórico de impuestos:', error);
            
            logSecurityEvent('HISTORICAL_TAX_ERROR', 'Error al obtener análisis histórico de impuestos', {
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

export default TaxController;