// controllers/pagos/reportsController.js
import { reportsService } from "../../services/pagos/reportsService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import pool from "../../lib/dbPool.js";

export const ReportsController = {
    /**
     * Genera un informe según los parámetros especificados
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async generateReport(req, res) {
        try {
            // Extraer parámetros del cuerpo de la petición
            const { type, name, format, filters, options } = req.body;
            
            if (!type) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere especificar el tipo de informe'
                });
            }
            
            // Log de acceso
            logSecurityEvent('REPORT_GENERATION', 'Generación de informe', {
                userId: req.user?.id_user,
                type,
                name,
                format,
                ip: req.ip
            }, 'medium');
            
            const report = await reportsService.generateReport({
                type,
                name,
                format: format || 'json',
                filters,
                options,
                created_by: req.user.id_user
            });
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Error generando informe:', error);
            
            logSecurityEvent('REPORT_GENERATION_ERROR', 'Error al generar informe', {
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
     * Obtiene una lista de informes generados
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getReportsList(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                type: req.query.type,
                created_by: req.query.created_by,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                search: req.query.search
            };
            
            // Extraer datos de paginación
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            };
            
            // Log de acceso
            logSecurityEvent('REPORTS_LIST_ACCESS', 'Acceso a lista de informes', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const reports = await reportsService.getReportsList(filters, pagination);
            
            res.json({
                success: true,
                data: reports.data,
                pagination: reports.pagination
            });
        } catch (error) {
            console.error('Error obteniendo lista de informes:', error);
            
            logSecurityEvent('REPORTS_LIST_ERROR', 'Error al obtener lista de informes', {
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
     * Obtiene un informe específico por su ID
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getReportById(req, res) {
        try {
            const { id } = req.params;
            
            // Log de acceso
            logSecurityEvent('REPORT_DETAIL_ACCESS', 'Acceso a detalle de informe', {
                userId: req.user?.id_user,
                reportId: id,
                ip: req.ip
            }, 'medium');
            
            const report = await reportsService.getReportById(id);
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error(`Error obteniendo informe ${req.params.id}:`, error);
            
            logSecurityEvent('REPORT_DETAIL_ERROR', 'Error al obtener detalle de informe', {
                userId: req.user?.id_user,
                reportId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si el informe no existe, devolver 404
            if (error.message === 'Informe no encontrado') {
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
     * Descarga un informe generado
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async downloadReport(req, res) {
        try {
            const { id } = req.params;
            
            // Log de acceso
            logSecurityEvent('REPORT_DOWNLOAD', 'Descarga de informe', {
                userId: req.user?.id_user,
                reportId: id,
                ip: req.ip
            }, 'medium');
            
            const report = await reportsService.getReportById(id);
            
            if (!report.file_path) {
                return res.status(404).json({
                    success: false,
                    message: 'Archivo de informe no disponible'
                });
            }
            
            // Enviar el archivo
            res.download(report.file_path);
        } catch (error) {
            console.error(`Error descargando informe ${req.params.id}:`, error);
            
            logSecurityEvent('REPORT_DOWNLOAD_ERROR', 'Error al descargar informe', {
                userId: req.user?.id_user,
                reportId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si el informe no existe, devolver 404
            if (error.message === 'Informe no encontrado') {
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
 * Genera un informe integral completo
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
async generateIntegralReport(req, res) {
    try {
      // Extraer parámetros del cuerpo de la petición
      const { 
        date_from, 
        date_to, 
        title, 
        recipients, 
        logoUrl 
      } = req.body;
      
      // Log de acceso
      logSecurityEvent('INTEGRAL_REPORT_GENERATION', 'Generación de informe integral', {
        userId: req.user?.id_user,
        period: { date_from, date_to },
        title,
        ip: req.ip
      }, 'high');
      
      const report = await reportsService.generateIntegralReport({
        date_from,
        date_to,
        title,
        recipients: recipients || [],
        created_by: req.user.id_user,
        logoUrl
      });
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generando informe integral:', error);
      
      logSecurityEvent('INTEGRAL_REPORT_ERROR', 'Error al generar informe integral', {
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
   * Configura la programación automática de informes integrales
   * @param {Object} req - Objeto de petición
   * @param {Object} res - Objeto de respuesta
   */
  async configureAutomaticReports(req, res) {
    try {
      // Extraer parámetros del cuerpo de la petición
      const { 
        cronExpression,
        recipients,
        title,
        enabled
      } = req.body;
      
      if (!cronExpression) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere una expresión cron para la programación'
        });
      }
      
      // Log de acceso
      logSecurityEvent('AUTOMATIC_REPORTS_CONFIG', 'Configuración de informes automáticos', {
        userId: req.user?.id_user,
        cronExpression,
        recipients,
        enabled,
        ip: req.ip
      }, 'high');
      
      // Si está deshabilitado, detener los trabajos existentes
      if (enabled === false) {
        // Aquí implementarías la lógica para detener la programación
        // (Esto dependerá de cómo manejes el almacenamiento de los jobs)
        
        // Actualizar la configuración en la base de datos
        await pool.query(
          'UPDATE config SET value = $1 WHERE key = $2',
          [JSON.stringify({ enabled: false }), 'automatic_reports']
        );
        
        return res.json({
          success: true,
          message: 'Informes automáticos deshabilitados correctamente',
          data: { enabled: false }
        });
      }
      
      // Programar la generación automática - siempre con usuario 43
      const job = await reportsService.scheduleAutomaticReports({
        cronExpression,
        recipients: recipients || [],
        title: title || 'Informe Integral Mensual Automático',
        createdBy: 43 // Siempre usar ID 43 independientemente de quién configura
      });
      
      // Guardar configuración en la base de datos
      const configValue = {
        enabled: true,
        cronExpression,
        recipients,
        title,
        updatedAt: new Date().toISOString(),
        updatedBy: 43 // ID fijo 43
      };
      
      // Usar upsert para crear o actualizar
      await pool.query(
        `
        INSERT INTO config (key, value) 
        VALUES ($1, $2)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2
        `,
        ['automatic_reports', JSON.stringify(configValue)]
      );
      
      res.json({
        success: true,
        message: 'Informes automáticos configurados correctamente',
        data: configValue
      });
    } catch (error) {
      console.error('Error configurando informes automáticos:', error);
      
      logSecurityEvent('AUTOMATIC_REPORTS_ERROR', 'Error al configurar informes automáticos', {
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
   * Obtiene la configuración actual de informes automáticos
   * @param {Object} req - Objeto de petición
   * @param {Object} res - Objeto de respuesta
   */
  async getAutomaticReportsConfig(req, res) {
    try {
      // Obtener configuración de la base de datos
      const configResult = await pool.query(
        'SELECT value FROM config WHERE key = $1',
        ['automatic_reports']
      );
      
      // Configuración por defecto si no existe
      let config = {
        enabled: false,
        cronExpression: '0 3 1 * *', // "At 03:00 on day-of-month 1"
        recipients: [],
        title: 'Informe Integral Mensual Automático'
      };
      
      // Si hay configuración en la BD, usarla
      if (configResult.rows.length > 0) {
        config = {
          ...config,
          ...configResult.rows[0].value
        };
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error obteniendo configuración de informes automáticos:', error);
      
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
 * Elimina un informe específico por su ID
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
async deleteReport(req, res) {
  try {
    const { id } = req.params;
    
    // Log de seguridad para la acción
    logSecurityEvent('REPORT_DELETE', 'Eliminación de informe', {
      userId: req.user?.id_user,
      reportId: id,
      ip: req.ip
    }, 'high');
    
    // Verificar que el informe exista
    const reportExists = await pool.query(
      'SELECT id FROM informes WHERE id = $1',
      [id]
    );
    
    if (reportExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Informe no encontrado'
      });
    }
    
    // Obtener la información del informe antes de eliminarlo (para manejar archivos)
    const reportInfo = await pool.query(
      'SELECT file_path, drive_url FROM informes WHERE id = $1',
      [id]
    );
    
    // Eliminar el informe de la base de datos
    await pool.query(
      'DELETE FROM informes WHERE id = $1',
      [id]
    );
    
    // Si tiene archivo local, intentar eliminarlo
    if (reportInfo.rows[0]?.file_path) {
      try {
        await fsPromises.unlink(reportInfo.rows[0].file_path);
      } catch (fileError) {
        console.warn(`No se pudo eliminar el archivo: ${reportInfo.rows[0].file_path}`, fileError);
        // Continuamos aunque no se pueda eliminar el archivo
      }
    }
    
    // Responder con éxito
    res.json({
      success: true,
      message: 'Informe eliminado correctamente'
    });
  } catch (error) {
    console.error(`Error eliminando informe ${req.params.id}:`, error);
    
    logSecurityEvent('REPORT_DELETE_ERROR', 'Error al eliminar informe', {
      userId: req.user?.id_user,
      reportId: req.params.id,
      error: error.message,
      ip: req.ip
    }, 'high');
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
};

export default ReportsController;