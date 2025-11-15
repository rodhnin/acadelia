// services/pagos/reportsService.js
import pool from "../../lib/dbPool.js";
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { transactionsService } from './transactionsService.js';
import { taxService } from './taxService.js';
import { subscriptionsService } from './subscriptionsService.js';
import PDFDocument from 'pdfkit';
import { googleDriveService } from '../../utils/googleDriveService.js';
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';

export class ReportsService {
    /**
     * Genera un informe según los parámetros especificados
     * @param {Object} params - Parámetros para la generación del informe
     * @returns {Promise<Object>} - Datos del informe generado
     */
    async generateReport(params) {
        try {
            if (!params.type || !params.created_by) {
                throw new Error('Se requiere tipo de informe y usuario creador');
            }
            
            let reportName = params.name || `Informe ${params.type} - ${new Date().toISOString().substring(0, 10)}`;
            const format = params.format || 'json';
            
            let reportData;
            
            switch (params.type) {
                case 'transactions':
                    reportData = await this.generateTransactionsReport(params);
                    if (!params.name) {
                        reportName = `Informe de Transacciones ${reportData.period.from.substring(0, 10)} a ${reportData.period.to.substring(0, 10)}`;
                    }
                    break;
                    
                case 'subscriptions':
                    reportData = await this.generateSubscriptionsReport(params);
                    if (!params.name) {
                        reportName = `Informe de Suscripciones ${reportData.period.from.substring(0, 10)} a ${reportData.period.to.substring(0, 10)}`;
                    }
                    break;
                    
                case 'tax':
                    reportData = await this.generateTaxReport(params);
                    if (!params.name) {
                        reportName = `Informe de Impuestos ${reportData.period.from.substring(0, 10)} a ${reportData.period.to.substring(0, 10)}`;
                    }
                    break;
                    
                case 'users':
                    reportData = await this.generateUsersReport(params);
                    if (!params.name) {
                        reportName = `Informe de Usuarios ${reportData.generated_at.substring(0, 10)}`;
                    }
                    break;
                    
                case 'financial_summary':
                    reportData = await this.generateFinancialSummaryReport(params);
                    if (!params.name) {
                        reportName = `Resumen Financiero ${reportData.period.from.substring(0, 10)} a ${reportData.period.to.substring(0, 10)}`;
                    }
                    break;
                    
                case 'expenses':
                    reportData = await this.generateExpensesReport(params);
                    if (!params.name) {
                        reportName = `Informe de Gastos ${reportData.period.from.substring(0, 10)} a ${reportData.period.to.substring(0, 10)}`;
                    }
                    break;
                    
                default:
                    throw new Error(`Tipo de informe '${params.type}' no soportado`);
            }
            
            const query = `
                INSERT INTO informes (
                    name, type, format, parameters, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5
                ) RETURNING id
            `;
            
            const result = await pool.query(query, [
                reportName,
                params.type,
                format,
                JSON.stringify({
                    filters: params.filters || {},
                    period: reportData.period || {},
                    options: params.options || {}
                }),
                params.created_by
            ]);
            
            const reportId = result.rows[0].id;
            
            // En un sistema real, aquí se generaría un archivo físico
            // y se almacenaría la ruta en la base de datos
            
            // Por ahora, simulamos la generación del archivo
            let filePath = '';
            if (process.env.NODE_ENV !== 'test') {
                filePath = await this.saveReportToFile(reportId, reportData, format);
                
                await pool.query(
                    'UPDATE informes SET file_path = $1 WHERE id = $2',
                    [filePath, reportId]
                );
            }
            
            return {
                id: reportId,
                name: reportName,
                type: params.type,
                format: format,
                file_path: filePath,
                data: reportData
            };
        } catch (error) {
            console.error('Error generando informe:', error);
            throw error;
        }
    }
    
    /**
     * Genera un informe de transacciones
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateTransactionsReport(params) {
        const filters = params.filters || {};
        const analytics = await transactionsService.getAnalytics(filters);
        
        return {
            period: {
                from: filters.date_from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                to: filters.date_to || new Date().toISOString()
            },
            generated_at: new Date().toISOString(),
            data: analytics,
            summary: {
                total_transactions: analytics.totals.transactions,
                total_revenue: analytics.totals.revenue,
                currencies: analytics.revenue_by_currency.map(c => c.currency_code),
                top_product: analytics.revenue_by_product[0] || null,
                payment_methods: analytics.payment_methods.map(pm => pm.payment_method)
            }
        };
    }
    
    /**
     * Genera un informe de suscripciones
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateSubscriptionsReport(params) {
        const filters = params.filters || {};
        const stats = await subscriptionsService.getSubscriptionStats(filters);
        
        return {
            period: {
                from: filters.date_from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                to: filters.date_to || new Date().toISOString()
            },
            generated_at: new Date().toISOString(),
            data: stats,
            summary: {
                total_active: stats.total_active,
                total_paused: stats.total_paused,
                total_canceled: stats.total_canceled,
                top_products: stats.by_product.slice(0, 3)
            }
        };
    }
    
    /**
     * Genera un informe de impuestos
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateTaxReport(params) {
        const filters = params.filters || {};
        const taxData = await taxService.getTaxesByCountry(filters);
        
        return {
            period: {
                from: filters.date_from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                to: filters.date_to || new Date().toISOString()
            },
            generated_at: new Date().toISOString(),
            data: taxData,
            summary: {
                total_taxable_amount: taxData.totals.taxable_amount_eur,
                total_tax_amount: taxData.totals.tax_amount_eur,
                spain_tax_amount: taxData.spain_vs_others.spain.tax_amount,
                other_countries_tax_amount: taxData.spain_vs_others.others.tax_amount
            }
        };
    }
    
    /**
     * Genera un informe de usuarios
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateUsersReport(params) {
        const filters = params.filters || {};
        
        let query = `
            SELECT u.id_user, u.correo, u.created_at, p.nombre, p.apellido, p.id_pais
            FROM usuario u
            LEFT JOIN perfil p ON u.id_user = p.id_usuario
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramIndex = 1;
        
        if (filters.date_from) {
            query += ` AND u.created_at >= $${paramIndex}`;
            queryParams.push(filters.date_from);
            paramIndex++;
        }
        
        if (filters.date_to) {
            query += ` AND u.created_at <= $${paramIndex}`;
            queryParams.push(filters.date_to);
            paramIndex++;
        }
        
        if (filters.id_pais) {
            query += ` AND p.id_pais = $${paramIndex}`;
            queryParams.push(filters.id_pais);
            paramIndex++;
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        // Consultar usuarios
        const result = await pool.query(query, queryParams);
        const users = result.rows;
        
        // Consultar estadísticas adicionales
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN p.id_pais IS NOT NULL THEN 1 END) as users_with_profile,
                COUNT(DISTINCT p.id_pais) as distinct_countries,
                MAX(u.created_at) as latest_registration,
                MIN(u.created_at) as first_registration
            FROM usuario u
            LEFT JOIN perfil p ON u.id_user = p.id_usuario
            WHERE 1=1
        `;
        
        let statsQueryWithFilters = statsQuery;
        let statsParams = [];
        let statsParamIndex = 1;
        
        if (filters.date_from) {
            statsQueryWithFilters += ` AND u.created_at >= $${statsParamIndex}`;
            statsParams.push(filters.date_from);
            statsParamIndex++;
        }
        
        if (filters.date_to) {
            statsQueryWithFilters += ` AND u.created_at <= $${statsParamIndex}`;
            statsParams.push(filters.date_to);
            statsParamIndex++;
        }
        
        const statsResult = await pool.query(statsQueryWithFilters, statsParams);
        const stats = statsResult.rows[0];
        
        // Consultar distribución por país
        const countryDistributionQuery = `
            SELECT p.id_pais, COUNT(*) as count
            FROM usuario u
            JOIN perfil p ON u.id_user = p.id_usuario
            WHERE p.id_pais IS NOT NULL
            GROUP BY p.id_pais
            ORDER BY count DESC
        `;
        
        const countryResult = await pool.query(countryDistributionQuery);
        const countryDistribution = countryResult.rows;
        
        // Consultar usuarios con suscripciones activas
        const activeSubscriptionsQuery = `
            SELECT COUNT(DISTINCT id_user) as users_with_active_subscriptions
            FROM suscripciones
            WHERE status = 'active'
        `;
        
        const activeSubsResult = await pool.query(activeSubscriptionsQuery);
        const activeSubscriptions = activeSubsResult.rows[0];
        
        return {
            generated_at: new Date().toISOString(),
            users: users,
            stats: {
                total_users: parseInt(stats.total_users),
                users_with_profile: parseInt(stats.users_with_profile),
                distinct_countries: parseInt(stats.distinct_countries),
                latest_registration: stats.latest_registration,
                first_registration: stats.first_registration,
                users_with_active_subscriptions: parseInt(activeSubscriptions.users_with_active_subscriptions)
            },
            country_distribution: countryDistribution,
            filters: filters
        };
    }
    
    /**
     * Genera un informe financiero completo
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateFinancialSummaryReport(params) {
        const filters = params.filters || {};
        
        // 1. Obtener análisis de transacciones
        const transactionAnalytics = await transactionsService.getAnalytics(filters);
        
        // 2. Obtener estadísticas de suscripciones
        const subscriptionStats = await subscriptionsService.getSubscriptionStats(filters);
        
        // 3. Obtener análisis de impuestos
        const taxAnalysis = await taxService.getTaxSummary(filters);
        
        // 4. Obtener datos de gastos/egresos
        let expenses = [];
        let expensesTotals = { total: 0, by_category: [] };
        
        try {
            // Si el servicio de gastos está disponible, obtener datos
            const { expensesService } = await import('./expensesService.js');
            expenses = await expensesService.getAllExpenses(filters);
            expensesTotals = await expensesService.getExpensesTotals(filters);
        } catch (error) {
            console.warn('Servicio de gastos no disponible:', error.message);
            // Continuamos sin datos de gastos
        }
        
        // 5. Calcular métricas financieras
        // Asumimos que todas las transacciones están en la misma divisa o se han convertido
        const totalRevenue = transactionAnalytics.totals.earnings_eur || 0;
        const totalExpenses = expensesTotals.total || 0;
        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
        
        // 6. Compilar el informe completo
        return {
            period: {
                from: filters.date_from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                to: filters.date_to || new Date().toISOString()
            },
            generated_at: new Date().toISOString(),
            transactions: {
                total: transactionAnalytics.totals.transactions,
                revenue: transactionAnalytics.totals.revenue,
                by_currency: transactionAnalytics.revenue_by_currency,
                by_product: transactionAnalytics.revenue_by_product,
                by_month: transactionAnalytics.revenue_by_month
            },
            subscriptions: {
                active: subscriptionStats.total_active,
                paused: subscriptionStats.total_paused,
                canceled: subscriptionStats.total_canceled,
                by_product: subscriptionStats.by_product,
                growth_by_month: subscriptionStats.growth_by_month
            },
            taxes: {
                taxable_amount: taxAnalysis.totals.taxable_amount_eur,
                tax_amount: taxAnalysis.totals.tax_amount_eur,
                by_currency: taxAnalysis.by_currency
            },
            expenses: {
              total: totalExpenses,
              by_category: expensesTotals.by_category.map(category => {
                // Si las categorías no incluyen impuestos, agregarlos
                // Filtramos solo los gastos de esta categoría
                const categoryExpenses = Array.isArray(expenses) 
                  ? expenses.filter(e => e.category_id === category.id)
                  : [];
                
                // Calculamos el total con impuestos para esta categoría
                const totalWithTax = this.calculateTotalExpensesWithTax(categoryExpenses);
                
                // Si hay una gran diferencia, usamos el cálculo con impuestos
                if (Math.abs(totalWithTax - category.total) > 1 && totalWithTax > 0) {
                  return {
                    ...category,
                    total: totalWithTax,
                    percentage: totalExpenses > 0 ? (totalWithTax / totalExpenses * 100) : 0
                  };
                }
                
                // Si no hay diferencia significativa o no pudimos calcular
                // mantenemos el valor original
                return category;
              }),
              recent: expenses.slice(0, 10), // Primeros 10 gastos
              tax_total: Array.isArray(expenses) 
                ? expenses.reduce((sum, e) => sum + parseFloat(e.tax_amount || 0), 0)
                : 0
            },
            financial_metrics: {
              revenue: totalRevenue,
              expenses: totalExpenses,
              profit: profit,
              profit_margin: profitMargin,
              revenue_per_active_subscription: subscriptionStats.total_active > 0 ? 
                  (totalRevenue / subscriptionStats.total_active) : 0,
              revenue_per_active_user: activeUsers > 0 ? 
                  (totalRevenue / activeUsers) : 0
            },
            summary: {
              period_description: `${new Date(filters.date_from || '').toLocaleDateString()} - ${new Date(filters.date_to || '').toLocaleDateString()}`,
              total_revenue: totalRevenue,
              total_expenses: totalExpenses,
              profit: profit,
              profit_margin: profitMargin.toFixed(2) + '%',
              active_subscriptions: subscriptionStats.total_active,
              active_users: activeUsers,
              transaction_count: transactionAnalytics.totals.transactions,
              top_product: transactionAnalytics.revenue_by_product[0] || null
            }
        };
    }
    
    /**
     * Genera un informe de gastos/egresos
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async generateExpensesReport(params) {
        const filters = params.filters || {};
        
        try {
            const { expensesService } = await import('./expensesService.js');
            
            const expenses = await expensesService.getAllExpenses(filters);
            const expensesTotals = await expensesService.getExpensesTotals(filters);
            const expensesByMonth = await expensesService.getExpensesByMonth(filters);
            const expensesByCategory = await expensesService.getExpensesByCategory(filters);
            
            return {
                period: {
                    from: filters.date_from || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                    to: filters.date_to || new Date().toISOString()
                },
                generated_at: new Date().toISOString(),
                expenses: expenses,
                totals: expensesTotals,
                by_month: expensesByMonth,
                by_category: expensesByCategory,
                summary: {
                    total_expenses: expensesTotals.total,
                    top_category: expensesByCategory[0] || null,
                    tax_deductible_amount: expensesTotals.tax_deductible || 0,
                    expense_count: expenses.length
                }
            };
        } catch (error) {
            console.error('Error generando informe de gastos:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene una lista de informes generados
     * @param {Object} filters - Filtros para la consulta
     * @param {Object} pagination - Configuración de paginación
     * @returns {Promise<Object>} - Lista de informes y metadatos de paginación
     */
    async getReportsList(filters = {}, pagination = { page: 1, limit: 10 }) {
        try {
            let query = `
                SELECT i.*, u.correo as created_by_email
                FROM informes i
                LEFT JOIN usuario u ON i.created_by = u.id_user
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            if (filters.type) {
                query += ` AND i.type = $${paramIndex}`;
                queryParams.push(filters.type);
                paramIndex++;
            }
            
            if (filters.created_by) {
                query += ` AND i.created_by = $${paramIndex}`;
                queryParams.push(filters.created_by);
                paramIndex++;
            }
            
            if (filters.date_from) {
                query += ` AND i.created_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND i.created_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            if (filters.search) {
                query += ` AND i.name ILIKE $${paramIndex}`;
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            
            // Consultar el total de registros para la paginación
            const countQuery = `SELECT COUNT(*) FROM (${query}) as subquery`;
            const countResult = await pool.query(countQuery, queryParams);
            const totalCount = parseInt(countResult.rows[0].count);
            
            query += ` ORDER BY i.created_at DESC`;
            
            // Paginación
            const page = pagination.page || 1;
            const limit = pagination.limit || 10;
            const offset = (page - 1) * limit;
            
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(limit, offset);
            
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
            console.error('Error obteniendo lista de informes:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene un informe específico por su ID
     * @param {number} reportId - ID del informe
     * @returns {Promise<Object>} - Datos del informe
     */
    async getReportById(reportId) {
        try {
          const query = `
            SELECT i.*, u.correo as created_by_email
            FROM informes i
            LEFT JOIN usuario u ON i.created_by = u.id_user
            WHERE i.id = $1
          `;
          
          const result = await pool.query(query, [reportId]);
          
          if (result.rows.length === 0) {
            throw new Error('Informe no encontrado');
          }
          
          const report = result.rows[0];
          
          // Si existe un archivo, verificar si está disponible
          if (report.file_path) {
            try {
              await fsPromises.access(report.file_path);
              report.file_available = true;
            } catch (error) {
              report.file_available = false;
              report.file_error = 'Archivo no disponible';
            }
          }
          
          return report;
        } catch (error) {
          console.error(`Error obteniendo informe ${reportId}:`, error);
          throw error;
        }
      }
    
    /**
 * Guarda los datos del informe en un archivo
 * @param {number} reportId - ID del informe
 * @param {Object} data - Datos del informe
 * @param {string} format - Formato del archivo
 * @returns {Promise<string>} - Ruta del archivo generado
 */
async saveReportToFile(reportId, data, format) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      await fsPromises.mkdir(reportsDir, { recursive: true });
      
      const fileName = `report_${reportId}_${new Date().toISOString().replace(/:/g, '-')}.${format}`;
      const filePath = path.join(reportsDir, fileName);
      
      let fileContent;
      
      switch (format.toLowerCase()) {
        case 'json':
          fileContent = JSON.stringify(data, null, 2);
          break;
          
        case 'csv':
          // se usaría una biblioteca específica
          fileContent = this.convertToCSV(data);
          break;
          
        default:
          // Por defecto, JSON
          fileContent = JSON.stringify(data, null, 2);
          break;
      }
      
      // Escribir archivo usando fsPromises
      await fsPromises.writeFile(filePath, fileContent);
      
      return filePath;
    } catch (error) {
      console.error('Error guardando informe en archivo:', error);
      throw error;
    }
  }
    
    /**
     * Convierte datos a formato CSV
     * @param {Object} data - Datos a convertir
     * @returns {string} - Contenido en formato CSV
     */
    convertToCSV(data) {
        // En un caso real se usaría una biblioteca específica
        
        let csv = '';
        
        // Si hay datos de resumen, usarlos como encabezado
        if (data.summary) {
            csv += 'Resumen del Informe\n';
            Object.entries(data.summary).forEach(([key, value]) => {
                csv += `${key},${value}\n`;
            });
            csv += '\n';
        }
        
        // Si hay período, incluirlo
        if (data.period) {
            csv += `Período,${data.period.from} a ${data.period.to}\n\n`;
        }
        
        // Si hay datos tabulares, convertirlos
        if (data.data && Array.isArray(data.data)) {
            // Encabezados
            if (data.data.length > 0) {
                csv += Object.keys(data.data[0]).join(',') + '\n';
                
                // Filas
                data.data.forEach(row => {
                    csv += Object.values(row).map(value => {
                        // Escapar comillas y manejar valores complejos
                        if (typeof value === 'object') {
                            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                        }
                        return `"${value}"`; 
                    }).join(',') + '\n';
                });
            }
        }
        
        return csv;
    }

    
/**
 * Genera un Informe Integral completo
 * @param {Object} params - Parámetros para la generación del informe
 * @returns {Promise<Object>} - Datos del informe generado
 */
async generateIntegralReport(params) {
  try {
    console.log('Generando informe integral con parámetros:', params);
    
    // Parámetros por defecto si no se proporcionan
    const reportParams = {
      date_from: params.date_from || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
      date_to: params.date_to || new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString(),
      title: params.title || `Informe Integral - ${new Date().toISOString().substring(0, 7)}`,
      format: params.format || 'pdf',
      recipients: params.recipients || [],
      created_by: params.created_by || null,
      logoUrl: params.logoUrl || '/images/Imagotipo.png'
    };
    
    const filters = {
      date_from: reportParams.date_from,
      date_to: reportParams.date_to
    };
    
    console.log(`Obteniendo datos para el período: ${filters.date_from} a ${filters.date_to}`);
    
    // 1. Obtener datos de transacciones
    const transactionAnalytics = await transactionsService.getAnalytics(filters);
    console.log('Datos de transacciones obtenidos');
    
    // 2. Obtener datos de suscripciones
    const subscriptionStats = await subscriptionsService.getSubscriptionStats(filters);
    console.log('Datos de suscripciones obtenidos');
    
    // 3. Obtener datos de impuestos
    const taxAnalysis = await taxService.getTaxesByCountry(filters);
    console.log('Datos de impuestos obtenidos');
    
    // 4. Obtener datos de gastos/egresos
    let expenses = [];
    let expensesTotals = { total: 0, by_category: [] };

    try {
      // Si el servicio de gastos está disponible, obtener datos
      const { expensesService } = await import('./expensesService.js');
      const expensesResponse = await expensesService.getAllExpenses(filters);
      
      if (expensesResponse && expensesResponse.data && Array.isArray(expensesResponse.data)) {
        expenses = expensesResponse.data;
        console.log(`Obtenidos ${expenses.length} gastos para procesar`);
        
        if (expenses.length > 0) {
          console.log('Muestra de gasto:', JSON.stringify(expenses[0]));
        }
      } else if (Array.isArray(expensesResponse)) {
        expenses = expensesResponse;
        console.log(`Obtenidos ${expenses.length} gastos (formato array directo)`);
      } else {
        console.warn('Formato de respuesta de gastos inesperado:', expensesResponse);
        expenses = [];
      }
      
      expensesTotals = await expensesService.getExpensesTotals(filters);
      console.log('Datos de totales de gastos obtenidos:', expensesTotals);
    } catch (error) {
      console.warn('Servicio de gastos no disponible:', error.message);
      // Continuamos sin datos de gastos
      expenses = [];
      expensesTotals = { total: 0, by_category: [] };
    }
    
    // 5. Calcular métricas financieras principales
    const totalRevenue = transactionAnalytics.totals.earnings_eur || 0;
    let totalExpenses = 0;
    if (Array.isArray(expenses) && expenses.length > 0) {
      totalExpenses = this.calculateTotalExpensesWithTax(expenses);
      console.log(`Calculando egresos totales con IMPUESTOS incluidos: ${totalExpenses}`);
    } else {
      // Si no hay datos de gastos individuales, intentar estimar
      totalExpenses = expensesTotals.total || 0;
      
      const taxTotal = expensesTotals.tax_total || 
        (Array.isArray(expensesTotals.by_category) ? 
          expensesTotals.by_category.reduce((sum, cat) => 
            sum + (parseFloat(cat.tax_amount) || 0), 0) : 0);
            
      if (taxTotal > 0) {
        totalExpenses += taxTotal;
        console.log(`Añadiendo impuestos (${taxTotal}) al total de egresos: ${totalExpenses}`);
      }
    }
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue * 100) : 0;
    
    // 6. Calcular métricas de suscripciones
    const activeUsers = await this.countActiveUsers(filters); // Esta información tendría que venir de otro servicio
    const activeSubscriptions = parseInt(subscriptionStats.total_active || 0) + parseInt(subscriptionStats.total_paused || 0);
    console.log(`Total suscripciones activas: ${parseInt(subscriptionStats.total_active || 0)} + pausadas: ${parseInt(subscriptionStats.total_paused || 0)} = ${activeSubscriptions}`);
    
    // Asegurarnos de que el resto de valores también son números
    const totalSubscriptions = activeSubscriptions + 
                            parseInt(subscriptionStats.total_canceled || 0) + 
                            parseInt(subscriptionStats.total_expired || 0);
    
    const retentionRate = totalSubscriptions > 0 
      ? ((activeSubscriptions / totalSubscriptions) * 100) 
      : 0;
    
    const conversionRate = activeUsers > 0 
      ? ((activeSubscriptions / activeUsers) * 100)
      : 0;
    
    const avgRevenuePerSub = activeSubscriptions > 0 
      ? (totalRevenue / activeSubscriptions)
      : 0;
    
    // 7. Identificar productos top por ingresos
    console.log("Obteniendo datos de suscripciones por producto...");
    const productSubscriptionsData = await this.countSubscriptionsByProduct(filters);
    
    // Primero agrupamos los productos por product_id (para evitar que aparezcan duplicados por moneda)
    const productMap = new Map();

    // Agrupar por product_id y sumar earnings_eur
    transactionAnalytics.revenue_by_product.forEach(product => {
      const productId = product.product_id || product.id;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: product.product_name,
          earnings_eur: 0,
          transactions: 0
        });
      }
      
      const existingProduct = productMap.get(productId);
      existingProduct.earnings_eur += parseFloat(product.earnings_eur || 0);
      existingProduct.transactions += parseInt(product.transactions || 0);
    });

    const groupedProducts = Array.from(productMap.values())
      .sort((a, b) => b.earnings_eur - a.earnings_eur);

    // Ahora procesar los productos agrupados correctamente
    const topProducts = groupedProducts.map(product => {
      const productId = product.product_id;
      
      let subscriptionsInfo = productSubscriptionsData.byProductId[productId];
      
      if (!subscriptionsInfo && subscriptionStats && subscriptionStats.by_product) {
        const matchedProduct = subscriptionStats.by_product.find(p => 
          p.id_product === productId || p.id === productId || 
          p.product_id === productId || p.nombre === product.product_name);
        
        if (matchedProduct) {
          const id_carrera = matchedProduct.id_carrera;
          if (id_carrera && productSubscriptionsData.byIdCarrera[id_carrera]) {
            subscriptionsInfo = productSubscriptionsData.byIdCarrera[id_carrera];
          }
        }
      }
      
      // Valor por defecto si no se encuentra información
      if (!subscriptionsInfo) {
        subscriptionsInfo = { count: 0 };
      }
      
      // Asegurarse de que es un número
      const productSubscriptions = parseInt(subscriptionsInfo.count || 0);
      
      const revenuePercentage = totalRevenue > 0 
      ? (parseFloat(product.earnings_eur || 0) / totalRevenue * 100)
      : 0;
      
      console.log(`Producto Agrupado: ${product.product_name} (ID: ${productId}), Ingresos: ${product.earnings_eur}, Porcentaje de ingresos: ${revenuePercentage.toFixed(2)}%`);
      
      return {
        id: productId,
        name: product.product_name || subscriptionsInfo.name || `Producto ${productId}`,
        revenue: parseFloat(product.earnings_eur || 0),
        revenuePercentage: revenuePercentage,
        subscriptions: productSubscriptions
      };
    });
    
    console.log("TOP 3 productos con datos precisos de suscripciones:", topProducts);
    
    // 8. Compilar el resumen ejecutivo
    const executiveSummary = {
      totalRevenue,
      totalExpenses,
      netIncome,
      profitMargin,
      activeUsers,
      activeSubscriptions,
      retentionRate,
      conversionRate,
      avgRevenuePerSub,
      topProducts,
      transactionCount: transactionAnalytics.totals.transactions || 0,
      expenseCount: expenses.length,
      revenueVsExpensesRatio: totalExpenses > 0 ? (totalRevenue / totalExpenses) : 'N/A',
      revenuePerUser: activeUsers > 0 ? (totalRevenue / activeUsers) : 0,
      expensesPerUser: activeUsers > 0 ? (totalExpenses / activeUsers) : 0
    };
    
    // 9. Compilar el resumen de ingresos
    let paymentMethodsWithEarnings = [];
    try {
      // Consulta SQL directa para obtener earnings_eur por método de pago
      const earningsQuery = `
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(earnings_eur) as earnings_eur
        FROM historial_transacciones
        WHERE 1=1
        AND event_type != 'transaction.payment_failed'  -- FILTRO AÑADIDO: Excluir transacciones fallidas
        ${filters.date_from ? ` AND updated_at >= '${filters.date_from}'` : ''}
        ${filters.date_to ? ` AND updated_at <= '${filters.date_to}'` : ''}
        GROUP BY payment_method
        ORDER BY COUNT(*) DESC
      `;
      
      const methodsResult = await pool.query(earningsQuery);
      paymentMethodsWithEarnings = methodsResult.rows;
      
      console.log(`Obtenidos ${paymentMethodsWithEarnings.length} métodos de pago con earnings_eur`);
    } catch (error) {
      console.error("Error calculando earnings_eur por método de pago:", error);
      // Mantener métodos originales si falla la consulta
      paymentMethodsWithEarnings = [];
    }
    
    const revenueSummary = {
      totalRevenue,
      methods: paymentMethodsWithEarnings.length > 0 
        ? paymentMethodsWithEarnings.map(method => ({
            method: method.payment_method || 'Desconocido',
            total: parseFloat(method.earnings_eur || 0),
            count: parseInt(method.count || 0)
          }))
        : transactionAnalytics.payment_methods.map(method => ({
            method: method.payment_method || 'Desconocido',
            total: parseFloat(method.total_eur || 0), 
            count: parseInt(method.count || 0)
          })),
      transactionCount: transactionAnalytics.totals.transactions || 0
    };
    
    
    // 10. Compilar el resumen de impuestos
    const taxSummary = {
      totalAmount: parseFloat(taxAnalysis.totals.total_amount_eur) || 0,
      totalTax: parseFloat(taxAnalysis.totals.tax_amount_eur) || 0,
      spainTax: parseFloat(taxAnalysis.spain_vs_others.spain.tax_amount_eur || 
                          taxAnalysis.spain_vs_others.spain.tax_amount || 0),
      otherTax: parseFloat(taxAnalysis.spain_vs_others.others.tax_amount_eur || 
                          taxAnalysis.spain_vs_others.others.tax_amount || 0),
      taxableAmount: parseFloat(taxAnalysis.totals.taxable_amount_eur) || 0,
      taxRatio: parseFloat(taxAnalysis.totals.tax_amount_eur) / parseFloat(taxAnalysis.totals.total_amount_eur) || 0,
      spainTaxPercentage: parseFloat(taxAnalysis.spain_vs_others.spain.percentage) || 0,
      otherTaxPercentage: parseFloat(taxAnalysis.spain_vs_others.others.percentage) || 0
    };
    
    // 11. Compilar el resumen de gastos
    const categoriesWithTax = [];

    let deductibleAmount = 0;
    let deductibleTax = 0;

    if (Array.isArray(expenses)) {
      expenses.forEach(e => {
        const expense = e.data ? e.data : e;
        if (expense.is_tax_deductible) {
          deductibleAmount += parseFloat(expense.amount || 0);
          deductibleTax += parseFloat(expense.tax_amount || 0);
        }
      });
    }

    // Ahora procesar las categorías
    if (Array.isArray(expensesTotals.by_category)) {
      expensesTotals.by_category.forEach(category => {
        const categoryExpenses = Array.isArray(expenses) 
          ? expenses.filter(e => {
              const expense = e.data ? e.data : e;
              return expense.category_id === category.id;
            })
          : [];
        
        let totalWithTax = 0;
        categoryExpenses.forEach(e => {
          const expense = e.data ? e.data : e;
          const amount = parseFloat(expense.amount || 0);
          const taxAmount = parseFloat(expense.tax_amount || 0);
          totalWithTax += (amount + taxAmount);
        });
        
        // Si no hay gastos o el total es 0, usar el valor original
        if (categoryExpenses.length === 0 || totalWithTax === 0) {
          totalWithTax = parseFloat(category.total || 0);
        }
        
        const percentage = totalExpenses > 0 ? (totalWithTax / totalExpenses * 100) : 0;
        
        categoriesWithTax.push({
          ...category,
          total: totalWithTax,
          percentage: percentage
        });
      });
    }

    const expensesSummary = {
      totalAmount: totalExpenses,
      categoryDistribution: categoriesWithTax.length > 0 ? categoriesWithTax : (expensesTotals.by_category || []),
      totalExpenses: expenses.length,
      deductible: {
        amount: deductibleAmount,
        tax: deductibleTax,
        total: deductibleAmount + deductibleTax
      }
    };
    
    // 12. Compilar el resumen de productos
    console.log("Consultando suscripciones activas por intervalo...");
    let monthlyCount = 0;
    let yearlyCount = 0;

    try {
      // Consulta directa a la base de datos para contar suscripciones por intervalo
      const intervalQuery = `
        SELECT 
          interval, 
          COUNT(*) as count
        FROM suscripciones
        WHERE status IN ('active', 'paused')
        ${filters.date_from ? ` AND created_at >= '${filters.date_from}'` : ''}
        ${filters.date_to ? ` AND created_at <= '${filters.date_to}'` : ''}
        GROUP BY interval
      `;
      
      const intervalResult = await pool.query(intervalQuery);
      
      intervalResult.rows.forEach(row => {
        if (row.interval === 'month') {
          monthlyCount = parseInt(row.count);
          console.log(`Encontradas ${monthlyCount} suscripciones mensuales activas`);
        } else if (row.interval === 'year') {
          yearlyCount = parseInt(row.count);
          console.log(`Encontradas ${yearlyCount} suscripciones anuales activas`);
        }
      });
    } catch (error) {
      console.error("Error consultando suscripciones por intervalo:", error);
      // Si falla, intentar obtener los datos de subscriptionStats
      monthlyCount = subscriptionStats.by_status?.find(s => s.status === 'active')?.monthly_count || 0;
      yearlyCount = subscriptionStats.by_status?.find(s => s.status === 'active')?.yearly_count || 0;
    }

    // Si sigue siendo 0, intentar contarlas manualmente desde los datos de activeSubscriptions
    if (monthlyCount === 0 && yearlyCount === 0 && Array.isArray(subscriptionStats.by_product)) {
      // Iterar por las suscripciones activas
      subscriptionStats.by_product.forEach(product => {
        const activeInfo = product.by_status?.find(s => s.status === 'active');
        if (activeInfo) {
          monthlyCount += parseInt(activeInfo.monthly_count || 0);
          yearlyCount += parseInt(activeInfo.yearly_count || 0);
        }
      });
      console.log(`Conteo manual: ${monthlyCount} mensuales, ${yearlyCount} anuales`);
    }

    // Compilar el resumen de productos con los datos actualizados
    const totalActivePlans = monthlyCount + yearlyCount;
    const monthlyPercentage = totalActivePlans > 0 ? (monthlyCount / totalActivePlans * 100) : 0;
    const yearlyPercentage = totalActivePlans > 0 ? (yearlyCount / totalActivePlans * 100) : 0;

    const productsSummary = {
      topProductsByRevenue: topProducts,
      planDistribution: {
        monthly: {
          count: monthlyCount,
          percentage: monthlyPercentage
        },
        yearly: {
          count: yearlyCount,
          percentage: yearlyPercentage
        }
      }
    };

    console.log(`Distribución de planes calculada: ${monthlyCount} mensuales (${monthlyPercentage.toFixed(2)}%), ${yearlyCount} anuales (${yearlyPercentage.toFixed(2)}%)`);

    console.log("Calculando métricas adicionales de suscripciones...");

    // 1. Tasa de Cancelación (canceladas + expiradas) / total
    const canceledSubs = parseInt(subscriptionStats.total_canceled || 0);
    const expiredSubs = parseInt(subscriptionStats.total_expired || 0);
    const totalCanceled = canceledSubs + expiredSubs;
    const totalSubs = activeSubscriptions + totalCanceled;
    const cancelationRate = totalSubs > 0 ? (totalCanceled / totalSubs * 100) : 0;
    
    console.log("Analizando fechas de egresos para diagnóstico...");
    if (Array.isArray(expenses) && expenses.length > 0) {
      // Examinar la estructura para determinar si los datos están en .data
      const firstExpense = expenses[0];
      
      if (firstExpense.data) {
        console.log("Estructura detectada: Los egresos están en la propiedad 'data'");
        this.analyzeExpenseDates(expenses.map(e => e.data));
      } else {
        console.log("Estructura detectada: Los egresos están directamente en el array");
        this.analyzeExpenseDates(expenses);
      }
    } else {
      console.log("No hay datos de egresos para analizar");
    }

    // 13. Compilar tendencias mensuales (MODIFICADO CON SQL EXPLÍCITO Y MÁS LOGS)
    console.log("==================================================================");
    console.log("INICIO: CÁLCULO DE TENDENCIAS MENSUALES PARA 6 MESES");
    console.log("==================================================================");
    let monthlyTrends = [];

    // IMPORTANTE: Declarar estas variables fuera del try-catch para que estén disponibles en todo el método
    let monthlySubsRevenue = 0;
    let yearlySubsRevenue = 0;
    let projectedAnnualRevenue = 0;

    try {
      // 1. Calcular fechas para obtener 6 meses, independientemente del filtro original
      let endDate;
      if (filters.date_to) {
        endDate = new Date(filters.date_to);
      } else {
        endDate = new Date(); // Fecha actual por defecto
      }
      
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      const startMonth = new Date(endMonth);
      startMonth.setMonth(startMonth.getMonth() - 5);
      
      console.log(`[TENDENCIAS] Calculando tendencias desde ${startMonth.toISOString()} hasta ${endDate.toISOString()}`);
      
      // 2. CONSULTA DIRECTA DE EGRESOS USANDO SQL HARD-CODED
      console.log("[TENDENCIAS] *** CONSULTANDO EGRESOS DIRECTAMENTE DE LA BASE DE DATOS ***");
      
      const startDateStr = startMonth.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`[TENDENCIAS] Periodo para egresos: ${startDateStr} a ${endDateStr}`);
      
      // Consulta SQL simple y directa
      const egresosQuery = `
        SELECT * FROM egresos 
        WHERE date >= '${startDateStr}' AND date <= '${endDateStr}'
      `;
      
      console.log(`[TENDENCIAS] Ejecutando consulta SQL: ${egresosQuery}`);
      
      let egresosByMonth = {};
      try {
        const egresosResult = await pool.query(egresosQuery);
        const sixMonthsExpenses = egresosResult.rows;
        
        console.log(`[TENDENCIAS] ✅ ÉXITO! Obtenidos ${sixMonthsExpenses.length} egresos de la base de datos`);
        
        if (sixMonthsExpenses.length > 0) {
          console.log("[TENDENCIAS] Muestra del primer egreso:", JSON.stringify(sixMonthsExpenses[0]));
          
          sixMonthsExpenses.forEach(expense => {
            if (expense.date) {
              try {
                const dateObj = new Date(expense.date);
                const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                const amount = parseFloat(expense.amount || 0);
                const taxAmount = parseFloat(expense.tax_amount || 0);
                const total = amount + taxAmount;
                
                if (!egresosByMonth[monthKey]) {
                  egresosByMonth[monthKey] = {
                    total: 0,
                    items: []
                  };
                }
                
                egresosByMonth[monthKey].total += total;
                egresosByMonth[monthKey].items.push({
                  id: expense.id,
                  date: expense.date,
                  amount,
                  taxAmount,
                  total
                });
                
                console.log(`[TENDENCIAS] Procesado egreso ${expense.id} del mes ${monthKey}: ${amount} + ${taxAmount} = ${total}`);
              } catch (error) {
                console.error(`[TENDENCIAS] ⚠️ Error procesando fecha de egreso: ${expense.date}`, error);
              }
            }
          });
          
          console.log("[TENDENCIAS] Egresos agrupados por mes:");
          Object.keys(egresosByMonth).sort().forEach(month => {
            console.log(`[TENDENCIAS] 📊 ${month}: ${egresosByMonth[month].items.length} egresos, total: ${egresosByMonth[month].total.toFixed(2)}`);
          });
        } else {
          console.log("[TENDENCIAS] ⚠️ No se encontraron egresos en el periodo especificado");
        }
      } catch (sqlError) {
        console.error("[TENDENCIAS] ❌ ERROR EJECUTANDO CONSULTA SQL:", sqlError);
        egresosByMonth = {};
      }

      // 3. Obtener datos de ingresos por mes
      console.log("[TENDENCIAS] Obteniendo datos de ingresos por mes...");
      
      const trendsFilters = {
        ...filters,
        date_from: startMonth.toISOString(),
        date_to: filters.date_to
      };
      
      const monthlyRevenue = await this.calculaIngresosCorrectosPorMes(transactionAnalytics, trendsFilters);
      console.log(`[TENDENCIAS] ✅ Obtenidos ${monthlyRevenue.length} meses con datos de ingresos`);

      // 4. Generar entradas para los 6 meses requeridos
      const requiredMonths = [];
      const tempDate = new Date(startMonth);
      
      for (let i = 0; i < 6; i++) {
        const monthKey = this.normalizeMonthFormat(tempDate);
        requiredMonths.push({
          key: monthKey,
          date: new Date(tempDate),
          exists: false
        });
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      
      console.log("[TENDENCIAS] Meses requeridos:", requiredMonths.map(m => m.key).join(", "));
      
      // Complementar datos faltantes de ingresos
      let completeMonthlyRevenue = [...monthlyRevenue];
      
      for (const requiredMonth of requiredMonths) {
        const exists = completeMonthlyRevenue.some(revenue => 
          this.normalizeMonthFormat(new Date(revenue.month)) === requiredMonth.key
        );
        
        if (!exists) {
          completeMonthlyRevenue.push({
            month: requiredMonth.date,
            total_eur: 0,
            earnings_eur: 0,
            amount_eur: 0,
            transactions: 0
          });
        }
      }
      
      completeMonthlyRevenue.sort((a, b) => new Date(a.month) - new Date(b.month));
      if (completeMonthlyRevenue.length > 6) {
        completeMonthlyRevenue = completeMonthlyRevenue.slice(-6);
      }

      // 5. Obtener datos de suscripciones
      console.log("[TENDENCIAS] Obteniendo datos de suscripciones por mes...");
      const subscriptionsByMonth = await this.getSubscriptionsByMonth(trendsFilters);

      // 6. Crear tendencias mensuales combinando todos los datos
      console.log("[TENDENCIAS] Creando tendencias mensuales finales...");
      
      monthlyTrends = completeMonthlyRevenue.map(month => {
        const monthDate = new Date(month.month);
        const monthKey = this.normalizeMonthFormat(monthDate);
        
        const monthRevenue = parseFloat(month.earnings_eur || 0);
        
        const monthExpenses = egresosByMonth[monthKey] ? egresosByMonth[monthKey].total : 0;
        
        const subData = subscriptionsByMonth[monthKey] || { new_subscriptions: 0, canceled_subscriptions: 0 };
        const newSubs = parseInt(subData.new_subscriptions) || 0;
        const canceledSubs = parseInt(subData.canceled_subscriptions) || 0;
        
        console.log(`[TENDENCIAS] Mes ${monthKey} - Ingresos: ${monthRevenue.toFixed(2)}, Egresos: ${monthExpenses.toFixed(2)}, Nuevas suscripciones: ${newSubs}, Cancelaciones: ${canceledSubs}`);
        
        const label = monthDate.toLocaleDateString('es', { month: 'short', year: '2-digit' });
        
        return {
          key: monthKey,
          label,
          revenue: monthRevenue,
          expenses: monthExpenses,
          netIncome: monthRevenue - monthExpenses,
          transactions: parseInt(month.transactions) || 0,
          subscriptions: newSubs,          // Nuevas suscripciones del mes
          cancelations: canceledSubs       // Cancelaciones del mes
        };
      });
      
      // 7. Calcular métricas financieras basadas en datos históricos
      console.log("[TENDENCIAS] Calculando métricas financieras basadas en tendencias mensuales...");
      
      if (Array.isArray(monthlyTrends) && monthlyTrends.length > 0) {
        let totalHistoricalRevenue = 0;
        let monthsWithRevenue = 0;
        
        monthlyTrends.forEach(month => {
          if (month.revenue > 0) {
            totalHistoricalRevenue += month.revenue;
            monthsWithRevenue++;
          }
        });
        
        console.log(`[TENDENCIAS] Total de ingresos históricos: €${totalHistoricalRevenue.toFixed(2)} en ${monthsWithRevenue} meses`);
        
        const avgMonthlyRevenue = monthsWithRevenue > 0 ? totalHistoricalRevenue / monthsWithRevenue : 0;
        console.log(`[TENDENCIAS] Promedio mensual de ingresos: €${avgMonthlyRevenue.toFixed(2)}`);
        
        monthlySubsRevenue = avgMonthlyRevenue;
        yearlySubsRevenue = totalHistoricalRevenue; // Lo que ya se ha ganado en lo que va del año
        projectedAnnualRevenue = avgMonthlyRevenue * 12; // Proyección basada en el promedio mensual
      } else {
        // Si no hay datos históricos, usar el enfoque anterior como fallback
        console.log("[TENDENCIAS] No hay datos históricos disponibles, usando cálculo estimado");
        
        monthlySubsRevenue = monthlyCount * avgRevenuePerSub;
        
        yearlySubsRevenue = yearlyCount * avgRevenuePerSub;
        
        // Proyectar ingresos anuales
        projectedAnnualRevenue = (monthlySubsRevenue * 12) + yearlySubsRevenue;
      }

      console.log(`[TENDENCIAS] Métricas finales calculadas`);
      console.log("==================================================================");
      console.log("FIN: CÁLCULO DE TENDENCIAS MENSUALES PARA 6 MESES");
      console.log("==================================================================");

    } catch (error) {
      console.error("[TENDENCIAS] ❌ ERROR GENERAL EN TENDENCIAS MENSUALES:", error);
      // Las variables ya tienen valores por defecto inicializados, no necesitamos asignarlas de nuevo
    }

    // Recalcular totalSubscriptions para que sea consistente
    const recalculatedTotalSubscriptions = 
      parseInt(activeSubscriptions) + 
      parseInt(subscriptionStats.total_paused || 0) + 
      parseInt(subscriptionStats.total_canceled || 0) + 
      parseInt(subscriptionStats.total_expired || 0);

    const reportData = {
      title: reportParams.title,
      period: this.formatDateRange({start: reportParams.date_from, end: reportParams.date_to}),
      generatedAt: new Date().toISOString(),
      executiveSummary,
      revenueSummary,
      subscriptionSummary: {
        total: recalculatedTotalSubscriptions, // Usar el valor recalculado
        active: activeSubscriptions,
        paused: subscriptionStats.total_paused || 0,
        canceled: subscriptionStats.total_canceled || 0,
        expired: subscriptionStats.total_expired || 0,
        products: subscriptionStats.by_product || []
      },
      taxSummary,
      expensesSummary,
      productsSummary,
      monthlyTrends,
      dateRange: {
        start: reportParams.date_from,
        end: reportParams.date_to
      }
    };

    console.log('Estructura de datos del informe compilada');
    
    // 15. Generar PDF según el formato especificado
    let filePath = '';
    if (reportParams.format.toLowerCase() === 'pdf') {
      filePath = await this.generateIntegralReportPDF(reportData, reportParams);
      console.log(`PDF generado: ${filePath}`);
    }
    
    // 16. Registrar el informe en la base de datos
    const query = `
      INSERT INTO informes (
        name, type, format, parameters, created_by, file_path
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id
    `;
    
    const result = await pool.query(query, [
      reportParams.title,
      'integral',
      reportParams.format,
      JSON.stringify({
        filters: filters,
        options: {
          recipients: reportParams.recipients
        }
      }),
      reportParams.created_by,
      filePath
    ]);
    
    const reportId = result.rows[0].id;
    console.log(`Informe registrado en la base de datos con ID: ${reportId}`);
    
    // 17. Si hay destinatarios, enviar por correo electrónico
    if (reportParams.recipients && reportParams.recipients.length > 0) {
      try {
        await this.sendReportByEmail(reportParams.recipients, filePath, reportParams.title, reportData.period, reportData);
        console.log(`Informe enviado por correo a: ${reportParams.recipients.join(', ')}`);
      } catch (emailError) {
        console.error('Error al enviar el informe por correo:', emailError);
        // No interrumpimos el proceso si falla el envío de correo
      }
    }
    
    // 18. Si está configurado Google Drive, guardar ahí también
    let driveUrl = '';
    try {
      const reportDate = new Date(reportParams.date_to);
      driveUrl = await googleDriveService.uploadIntegralReport(
        filePath, 
        reportId, 
        reportDate
      );
      console.log(`Informe guardado en Google Drive: ${driveUrl}`);
      
      try {
        await pool.query(
          'UPDATE informes SET drive_url = $1 WHERE id = $2',
          [driveUrl, reportId]
        );
      } catch (dbError) {
        // Si el error es porque la columna no existe, solo loguearlo
        if (dbError.code === '42703') {
          console.warn('Columna "drive_url" no encontrada en la tabla informes. La URL de Google Drive no se guardará en la base de datos.');
          console.warn('Para solucionar este problema, ejecuta: ALTER TABLE informes ADD COLUMN drive_url TEXT;');
        } else {
          // Si es otro tipo de error, relanzarlo
          throw dbError;
        }
      }
    } catch (driveError) {
      console.error('Error al guardar el informe en Google Drive:', driveError);
      // No interrumpimos el proceso si falla el guardado en Drive
    }
    
    return {
      id: reportId,
      name: reportParams.title,
      type: 'integral',
      format: reportParams.format,
      file_path: filePath,
      drive_url: driveUrl,
      data: reportData
    };
  } catch (error) {
    console.error('Error generando informe integral:', error);
    throw error;
  }
}

  /**
 * Analiza las fechas de todos los egresos para diagnóstico
 * @param {Array} expenses - Lista de egresos
 */
analyzeExpenseDates(expenses) {
  console.log("=== ANÁLISIS DE FECHAS DE EGRESOS ===");
  
  if (!Array.isArray(expenses) || expenses.length === 0) {
    console.log("No hay egresos para analizar");
    return;
  }
  
  console.log(`Total de egresos: ${expenses.length}`);
  
  // Agrupar por mes
  const expensesByMonth = {};
  const formatIssues = [];
  
  expenses.forEach((expense, index) => {
    const expenseData = expense.data ? expense.data : expense;
    
    if (!expenseData.date) {
      formatIssues.push({index, issue: "Sin fecha", data: expenseData});
      return;
    }
    
    try {
      const dateObj = new Date(expenseData.date);
      
      if (isNaN(dateObj.getTime())) {
        formatIssues.push({index, issue: "Fecha inválida", data: expenseData});
        return;
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      const amount = parseFloat(expenseData.amount || 0);
      const taxAmount = parseFloat(expenseData.tax_amount || 0);
      const total = amount + taxAmount;
      
      // Agrupar por mes
      if (!expensesByMonth[monthKey]) {
        expensesByMonth[monthKey] = {
          count: 0,
          total: 0,
          dates: []
        };
      }
      
      expensesByMonth[monthKey].count++;
      expensesByMonth[monthKey].total += total;
      
      if (expensesByMonth[monthKey].dates.length < 3) {
        expensesByMonth[monthKey].dates.push(expenseData.date);
      }
      
    } catch (error) {
      formatIssues.push({index, issue: `Error: ${error.message}`, data: expenseData});
    }
  });
  
  console.log("Egresos por mes:");
  const months = Object.keys(expensesByMonth).sort();
  
  months.forEach(month => {
    const info = expensesByMonth[month];
    console.log(`${month}: ${info.count} egresos, total: ${info.total.toFixed(2)}`);
    console.log(`  Ejemplos de fechas: ${info.dates.join(', ')}`);
  });
  
  if (formatIssues.length > 0) {
    console.log(`Se encontraron ${formatIssues.length} problemas con fechas:`);
    formatIssues.slice(0, 5).forEach(issue => {
      console.log(`  ${issue.issue} en índice ${issue.index}: ${JSON.stringify(issue.data)}`);
    });
    
    if (formatIssues.length > 5) {
      console.log(`  ... y ${formatIssues.length - 5} problemas más`);
    }
  }
  
  console.log("=== FIN DEL ANÁLISIS ===");
}
  
/**
 * Cuenta las suscripciones activas por producto
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} - Mapa de suscripciones por producto
 */
async countSubscriptionsByProduct(filters = {}) {
  try {
    let query = `
      SELECT 
        product_id,
        id_carrera,
        product_name,
        COUNT(*) as subscription_count
      FROM 
        suscripciones
      WHERE 
        status IN ('active', 'paused')
    `;
    
    // Array para los parámetros
    const queryParams = [];
    let paramIndex = 1;
    
    if (filters.date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters.date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(filters.date_to);
      paramIndex++;
    }
    
    // Agrupar por producto
    query += ` GROUP BY product_id, id_carrera, product_name`;
    
    console.log("Ejecutando consulta para contar suscripciones por producto:", query);
    const result = await pool.query(query, queryParams);
    
    const productSubscriptionsMap = {};
    const idCarreraMap = {}; // Mapa secundario por id_carrera
    
    result.rows.forEach(row => {
      const count = parseInt(row.subscription_count);
      
      if (row.product_id) {
        productSubscriptionsMap[row.product_id] = {
          count: count,
          name: row.product_name || `Producto ${row.product_id}`,
          id_carrera: row.id_carrera
        };
      }
      
      // También guardar en el mapa por id_carrera para referencia cruzada
      if (row.id_carrera) {
        idCarreraMap[row.id_carrera] = {
          count: count,
          name: row.product_name || `Carrera ${row.id_carrera}`,
          product_id: row.product_id
        };
      }
    });
    
    console.log(`Encontradas ${result.rows.length} productos con suscripciones activas/pausadas`);
    console.log("Mapa por product_id:", productSubscriptionsMap);
    console.log("Mapa por id_carrera:", idCarreraMap);
    
    return {
      byProductId: productSubscriptionsMap,
      byIdCarrera: idCarreraMap,
      raw: result.rows
    };
  } catch (error) {
    console.error('Error contando suscripciones por producto:', error);
    return {
      byProductId: {},
      byIdCarrera: {},
      raw: []
    };
  }
}

/**
 * Normaliza una fecha a formato YYYY-MM para comparaciones consistentes
 * @param {Date|string} date - Fecha a normalizar
 * @returns {string} - Fecha normalizada en formato YYYY-MM
 */
normalizeMonthFormat(date) {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    
    return `${year}-${month}`;
  } catch (error) {
    console.error('Error normalizando fecha:', error, date);
    return '';
  }
}

/**
 * Genera el PDF del informe integral con formato mejorado y estilo corporativo
 * @param {Object} reportData - Datos estructurados del informe
 * @param {Object} options - Opciones de generación
 * @returns {Promise<string>} - Ruta del archivo PDF generado
 */
async generateIntegralReportPDF(reportData, options) {
  return new Promise(async (resolve, reject) => {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      await fsPromises.mkdir(reportsDir, { recursive: true });
      
      const fileName = `informe_integral_${new Date().toISOString().replace(/:/g, '-')}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40, // Reducir márgenes para maximizar espacio
        bufferPages: true,
        info: {
          Title: reportData.title,
          Author: 'Sistema Automático de Informes',
          Subject: `Informe Integral - ${reportData.period}`,
          Keywords: 'informe, finanzas, integral'
        },
        autoFirstPage: true
      });
      
      // Stream para escribir el PDF a un archivo
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Contador de páginas para numeración
      let pageCount = 0;
      doc.on('pageAdded', () => {
        pageCount++;
      });
      
      const colors = {
        primary: '#582f0e', // Color principal de Acadelia
        secondary: '#656d4a', // Color secundario de Acadelia
        accent: '#f0efe7', // Color de acento/fondo
        text: '#333333', // Color de texto
        textLight: '#666666', // Color de texto secundario
        headerBg: '#656d4a', // Fondo de cabeceras
        headerText: '#ffffff', // Texto de cabeceras
        alternateBg: '#f0efe7', // Fondo de filas alternas
        borders: '#582f0e', // Color de bordes
        positive: '#009900', // Verde para valores positivos
        negative: '#cc0000'  // Rojo para valores negativos
      };
      
      // Variable para rastrear el logo
      let logoDrawn = false;
      
      try {
        if (options.logoUrl && !logoDrawn) {
          console.log('Cargando logo desde:', options.logoUrl);
          
          const logoPath = path.join(process.cwd(), 'frontend', 'public', options.logoUrl.replace(/^\//, ''));
          
          try {
            await fsPromises.access(logoPath);
            
            const centerX = (doc.page.width - 140) / 2;
            
            doc.image(logoPath, centerX, 40, {
              fit: [140, 80],
              align: 'center',
              valign: 'center'
            });
            
            doc.y = 130;
            logoDrawn = true;
            console.log(`Logo cargado correctamente desde: ${logoPath}`);
          } catch (e) {
            console.warn(`No se pudo acceder al logo en: ${logoPath}`, e.message);
            doc.y = 40;
          }
        }
      } catch (logoError) {
        console.warn('Error al cargar el logo:', logoError);
        doc.y = 40;
      }
      
      const styles = {
        title: { fontSize: 20, font: 'Helvetica-Bold', color: colors.primary },
        subtitle: { fontSize: 14, font: 'Helvetica-Oblique', color: colors.textLight },
        sectionHeader: { fontSize: 16, font: 'Helvetica-Bold', color: colors.primary },
        subsectionHeader: { fontSize: 13, font: 'Helvetica-Bold', color: colors.primary },
        text: { fontSize: 10, font: 'Helvetica', color: colors.text },
        tableHeader: { fontSize: 9, font: 'Helvetica-Bold', color: colors.headerText },
        tableCell: { fontSize: 9, font: 'Helvetica', color: colors.text }
      };
      
      const applyTextStyle = (style) => {
        doc.font(style.font).fontSize(style.fontSize).fillColor(style.color);
      };
      
      applyTextStyle(styles.title);
      const titleWidth = doc.widthOfString(reportData.title);
      const titleX = (doc.page.width - titleWidth) / 2;
      doc.text(reportData.title, titleX, doc.y);
      
      // Línea debajo del título
      doc.moveDown(0.5);
      doc.moveTo(doc.page.width / 4, doc.y)
         .lineTo(doc.page.width * 3/4, doc.y)
         .strokeColor(colors.primary)
         .lineWidth(1)
         .stroke();
      
      doc.moveDown(1);
      applyTextStyle(styles.subtitle);
      const periodText = `Período: ${reportData.period}`;
      const periodWidth = doc.widthOfString(periodText);
      const periodX = (doc.page.width - periodWidth) / 2;
      doc.text(periodText, periodX, doc.y);
      
      doc.moveDown(0.5);
      const genDateText = `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`;
      const genDateWidth = doc.widthOfString(genDateText);
      const genDateX = (doc.page.width - genDateWidth) / 2;
      doc.text(genDateText, genDateX, doc.y);
      
      doc.moveDown(2);
      
      const addSectionHeader = (text) => {
        doc.addPage();
        
        doc.y = 40;
        
        applyTextStyle(styles.sectionHeader);
        
        doc.rect(40, doc.y, 8, 20)
           .fill(colors.primary);
        
        // Escribir el texto a la derecha de la barra
        doc.text(text, 55, doc.y);
        doc.moveDown(1.5);
      };
      
      const addSubsectionHeader = (text) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          doc.y = 40;
        }
        
        applyTextStyle(styles.subsectionHeader);
        doc.text(text, 40, doc.y);
        
        // Línea horizontal debajo del encabezado
        doc.moveTo(40, doc.y + 5)
           .lineTo(doc.page.width - 40, doc.y + 5)
           .strokeColor(colors.secondary)
           .lineWidth(0.5)
           .stroke();
        
        doc.moveDown(1.5);
      };
      
      // SECCIÓN: RESUMEN EJECUTIVO
      applyTextStyle(styles.sectionHeader);
      
      doc.rect(40, doc.y, 8, 20)
         .fill(colors.primary);
      
      // Escribir el texto a la derecha de la barra
      doc.text('RESUMEN EJECUTIVO', 55, doc.y);
      doc.moveDown(1.5);
      
      // Datos para la tabla de resumen ejecutivo
      const executiveSummary = reportData.executiveSummary;
      
      // Tabla de resumen ejecutivo estilo Excel
      this.drawExcelStyleTable(doc, 
        [
          { text: 'Métrica', width: 250, align: 'left' },
          { text: 'Valor', width: 250, align: 'right' }
        ],
        [
          [
            { text: 'Ingresos Totales' },
            { text: `€${executiveSummary.totalRevenue.toFixed(2)}`, align: 'right' }
          ],
          [
            { text: 'Egresos Totales' }, 
            { text: `€${executiveSummary.totalExpenses.toFixed(2)}`, align: 'right' }
          ],
          [
            { text: 'Beneficio Neto' }, 
            { text: `€${executiveSummary.netIncome.toFixed(2)}`, align: 'right' }
          ],
          [
            { text: 'Margen de Beneficio' }, 
            { text: `${executiveSummary.profitMargin.toFixed(2)}%`, align: 'right' }
          ],
          [
            { text: 'Usuarios Activos' }, 
            { text: executiveSummary.activeUsers.toString(), align: 'right' }
          ],
          [
            { text: 'Suscripciones Activas' }, 
            { text: executiveSummary.activeSubscriptions.toString(), align: 'right' }
          ],
          [
            { text: 'Tasa de Retención' }, 
            { text: `${executiveSummary.retentionRate.toFixed(2)}%`, align: 'right' }
          ],
          [
            { text: 'Tasa de Conversión' }, 
            { text: `${executiveSummary.conversionRate.toFixed(2)}%`, align: 'right' }
          ],
          [
            { text: 'Ingreso Promedio por Suscripción' }, 
            { text: `€${executiveSummary.avgRevenuePerSub.toFixed(2)}`, align: 'right' }
          ],
          [
            { text: 'Ratio Ingresos/Gastos' }, 
            { text: executiveSummary.revenueVsExpensesRatio === 'N/A' ? 'N/A' : executiveSummary.revenueVsExpensesRatio.toFixed(2), align: 'right' }
          ]
        ],
        {
          headerBg: colors.headerBg,
          headerTextColor: colors.headerText,
          alternateRowBg: colors.alternateBg,
          textColor: colors.text,
          borderColor: colors.borders
        }
      );
      
      doc.moveDown(2);
      
      // SECCIÓN: ANÁLISIS FINANCIERO
      addSectionHeader('ANÁLISIS FINANCIERO');
      
      // Subsección: Desglose de Ingresos
      addSubsectionHeader('DESGLOSE DE INGRESOS');
      
      // Tabla de métodos de pago
      if (reportData.revenueSummary && reportData.revenueSummary.methods && reportData.revenueSummary.methods.length > 0) {
        const totalRevenue = reportData.revenueSummary.totalRevenue || 1;
        const totalTransactions = reportData.revenueSummary.transactionCount || 1;
        
        const methodRows = reportData.revenueSummary.methods.map(method => [
          { text: method.method || 'Desconocido' },
          { text: `€${method.total.toFixed(2)}`, align: 'right' },
          { text: `${(method.total / totalRevenue * 100).toFixed(1)}%`, align: 'right' },
          { text: method.count.toString(), align: 'right' },
          { text: `${(method.count / totalTransactions * 100).toFixed(1)}%`, align: 'right' }
        ]);
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Método de Pago', width: 160, align: 'left' },
            { text: 'Importe', width: 110, align: 'right' },
            { text: '%', width: 60, align: 'right' },
            { text: 'Transacciones', width: 110, align: 'right' },
            { text: '%', width: 60, align: 'right' }
          ],
          methodRows,
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders
          }
        );
      }
      
      doc.moveDown(2);
      
      // Subsección: Resumen de Impuestos
      addSubsectionHeader('RESUMEN DE IMPUESTOS');
      
      if (reportData.taxSummary) {
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Concepto', width: 250, align: 'left' },
            { text: 'Importe (EUR)', width: 150, align: 'right' },
            { text: 'Porcentaje', width: 100, align: 'right' }
          ],
          [
            [
              { text: 'IVA Total' },
              { text: `€${reportData.taxSummary.totalTax.toFixed(2)}`, align: 'right' },
              { text: '100.00%', align: 'right' }
            ],
            [
              { text: 'IVA España' },
              { text: `€${reportData.taxSummary.spainTax.toFixed(2)}`, align: 'right' },
              { text: `${reportData.taxSummary.spainTaxPercentage.toFixed(2)}%`, align: 'right' }
            ],
            [
              { text: 'IVA Otros Países' },
              { text: `€${reportData.taxSummary.otherTax.toFixed(2)}`, align: 'right' },
              { text: `${reportData.taxSummary.otherTaxPercentage.toFixed(2)}%`, align: 'right' }
            ]
          ],
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders
          }
        );
      }
      
      doc.moveDown(2);
      
      // Subsección: Desglose de Egresos
      addSubsectionHeader('TOP 5 DESGLOSE DE EGRESOS');
      
      // Tabla de categorías de egresos
      if (reportData.expensesSummary && reportData.expensesSummary.categoryDistribution && 
        reportData.expensesSummary.categoryDistribution.length > 0) {
        
      const totalExpenses = reportData.expensesSummary.totalAmount || 1;
      const totalExpensesCount = reportData.expensesSummary.totalExpenses || 1;
      
      const categoryRows = reportData.expensesSummary.categoryDistribution.slice(0, 5).map(category => [
        { text: category.name || 'Sin nombre' },
        { text: `€${category.total.toFixed(2)}`, align: 'right' },
        { text: `${category.percentage.toFixed(1)}%`, align: 'right' },
        { text: category.count.toString(), align: 'right' },
        { text: `${(category.count / totalExpensesCount * 100).toFixed(1)}%`, align: 'right' }
      ]);
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Categoría', width: 160, align: 'left' },
            { text: 'Importe', width: 110, align: 'right' },
            { text: '%', width: 60, align: 'right' },
            { text: 'Cantidad', width: 110, align: 'right' },
            { text: '%', width: 60, align: 'right' }
          ],
          categoryRows,
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders
          }
        );
      }


      doc.moveDown(2);


      // Subsección: Egresos Deducibles
      addSubsectionHeader('EGRESOS DEDUCIBLES');

      if (reportData.expensesSummary && reportData.expensesSummary.deductible) {
        const deductible = reportData.expensesSummary.deductible;
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Concepto', width: 300, align: 'left' },
            { text: 'Importe (EUR)', width: 200, align: 'right' }
          ],
          [
            [
              { text: 'Gastos Deducibles' },
              { text: `€${deductible.amount.toFixed(2)}`, align: 'right' }
            ],
            [
              { text: 'IVA Deducible' },
              { text: `€${deductible.tax.toFixed(2)}`, align: 'right' }
            ],
            [
              { text: 'Total Deducible', bold: true },
              { text: `€${deductible.total.toFixed(2)}`, align: 'right', bold: true }
            ]
          ],
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders,
            highlight: { rowIndex: 2, bg: '#dbeafe' } // Destacar la fila de total
          }
        );
      }
      
      // SECCIÓN: ANÁLISIS DE PRODUCTOS
      addSectionHeader('ANÁLISIS DE PRODUCTOS');
      
      // Subsección: Top productos por ingresos
      addSubsectionHeader('TOP PRODUCTOS POR INGRESOS');
      
      // Tabla de productos top
      if (reportData.productsSummary && reportData.productsSummary.topProductsByRevenue) {
        const totalRevenue = reportData.executiveSummary.totalRevenue || 1;
        
        const productRows = reportData.productsSummary.topProductsByRevenue.map(product => [
          { text: product.name || 'Sin nombre' },
          { text: `€${product.revenue.toFixed(2)}`, align: 'right' },
          { text: `${(product.revenue / totalRevenue * 100).toFixed(2)}%`, align: 'right' },
          { text: product.subscriptions.toString(), align: 'right' }
        ]);
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Producto', width: 150, align: 'left' },
            { text: 'Ingresos (EUR)', width: 120, align: 'right' },
            { text: '%', width: 80, align: 'right' },
            { text: 'Suscripciones Activas', width: 150, align: 'right' }
          ],
          productRows,
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders
          }
        );
      }
      
      doc.moveDown(2);
      
      // Subsección: Distribución de planes
      if (reportData.productsSummary && reportData.productsSummary.planDistribution) {
        addSubsectionHeader('DISTRIBUCIÓN DE PLANES');
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Tipo de Plan', width: 300, align: 'left' },
            { text: 'Suscripciones', width: 100, align: 'right' },
            { text: 'Porcentaje', width: 100, align: 'right' }
          ],
          [
            [
              { text: 'Mensual' },
              { text: reportData.productsSummary.planDistribution.monthly.count.toString(), align: 'right' },
              { text: `${reportData.productsSummary.planDistribution.monthly.percentage.toFixed(2)}%`, align: 'right' }
            ],
            [
              { text: 'Anual' },
              { text: reportData.productsSummary.planDistribution.yearly.count.toString(), align: 'right' },
              { text: `${reportData.productsSummary.planDistribution.yearly.percentage.toFixed(2)}%`, align: 'right' }
            ]
          ],
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders
          }
        );
      }
      
      // SECCIÓN: SUSCRIPCIONES
      addSectionHeader('SUSCRIPCIONES');

      if (reportData.subscriptionSummary) {
        // Tratar canceled y expired igual, sumándolos en una sola categoría
        const active = parseInt(reportData.subscriptionSummary.active || 0);
        const paused = parseInt(reportData.subscriptionSummary.paused || 0);
        
        const canceled = parseInt(reportData.subscriptionSummary.canceled || 0);
        const expired = parseInt(reportData.subscriptionSummary.expired || 0);
        const canceledTotal = canceled + expired;
        
        const totalSubs = active + canceledTotal;
        
        const activePercent = totalSubs > 0 ? (active / totalSubs * 100) : 0;
        const canceledPercent = totalSubs > 0 ? (canceledTotal / totalSubs * 100) : 0;
        
        const subStatusRows = [
          [
            { text: 'Activas' },
            { text: active.toString(), align: 'right' },
            { text: `${activePercent.toFixed(2)}%`, align: 'right' }
          ],
          [
            { text: 'Canceladas' }, // Categoría unificada
            { text: canceledTotal.toString(), align: 'right' },
            { text: `${canceledPercent.toFixed(2)}%`, align: 'right' }
          ]
        ];
        
        subStatusRows.push([
          { text: 'Total', bold: true },
          { text: totalSubs.toString(), bold: true, align: 'right' },
          { text: '100.00%', bold: true, align: 'right' }
        ]);
        
        this.drawExcelStyleTable(doc, 
          [
            { text: 'Estado', width: 250, align: 'left' },
            { text: 'Cantidad', width: 125, align: 'right' },
            { text: 'Porcentaje', width: 125, align: 'right' }
          ],
          subStatusRows,
          {
            headerBg: colors.headerBg,
            headerTextColor: colors.headerText,
            alternateRowBg: colors.alternateBg,
            textColor: colors.text,
            borderColor: colors.borders,
            highlight: { rowIndex: subStatusRows.length - 1, bg: '#dbeafe' } // Destacar la fila de totales
          }
        );
        
        doc.moveDown(2);
      }
      
      // SECCIÓN: TENDENCIAS MENSUALES
      if (reportData.monthlyTrends && reportData.monthlyTrends.length > 0) {
        // Verificación explícita que tenemos datos
        console.log(`Tendencias mensuales disponibles: ${reportData.monthlyTrends.length} meses`);
        
        try {
          addSectionHeader('TENDENCIAS MENSUALES');
          if (!reportData.monthlyTrends || reportData.monthlyTrends.length === 0) {
            doc.text("No hay datos de tendencias mensuales disponibles.", 40, doc.y);
            doc.moveDown(1);
            return; // Salir para evitar errores
          }
          
          const trendRows = reportData.monthlyTrends.map(month => {
            try {
              const isPositive = (month.netIncome || 0) >= 0;
              const netIncomeColor = isPositive ? colors.positive : colors.negative;
              
              // Asegurar que los valores son números válidos
              const revenue = parseFloat(month.revenue || 0);
              const expenses = parseFloat(month.expenses || 0);
              const netIncome = parseFloat(month.netIncome || 0);
              const transactions = parseInt(month.transactions || 0);
              const subscriptions = parseInt(month.subscriptions || 0);
              const cancelations = parseInt(month.cancelations || 0);
              
              return [
                { text: month.label || 'N/A' },
                { text: `€${revenue.toFixed(2)}`, align: 'right' },
                { text: `€${expenses.toFixed(2)}`, align: 'right' },
                { text: `€${netIncome.toFixed(2)}`, align: 'right', color: netIncomeColor },
                { text: transactions.toString(), align: 'right' },
                { text: subscriptions.toString(), align: 'right' },
                { text: cancelations.toString(), align: 'right' }
              ];
            } catch (error) {
              console.error("Error procesando fila de tendencias:", error, month);
              return [
                { text: "Error" },
                { text: "€0.00", align: 'right' },
                { text: "€0.00", align: 'right' },
                { text: "€0.00", align: 'right' },
                { text: "0", align: 'right' },
                { text: "0", align: 'right' },
                { text: "0", align: 'right' }
              ];
            }
          });
          
          this.drawExcelStyleTable(doc, 
            [
              { text: 'Mes', width: 60, align: 'left' },
              { text: 'Ingresos', width: 85, align: 'right' },
              { text: 'Egresos', width: 85, align: 'right' },
              { text: 'Beneficio', width: 85, align: 'right' },
              { text: 'Transac.', width: 65, align: 'right' },
              { text: 'Nuevas', width: 60, align: 'right' },
              { text: 'Cancel.', width: 60, align: 'right' }
            ],
            trendRows,
            {
              headerBg: colors.headerBg,
              headerTextColor: colors.headerText,
              alternateRowBg: colors.alternateBg,
              textColor: colors.text,
              borderColor: colors.borders,
              useCustomCellColors: true
            }
          );
          
          console.log("Tabla de tendencias mensuales dibujada correctamente");
          
        } catch (error) {
          console.error("Error dibujando sección de tendencias mensuales:", error);
          
          try {
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#cc0000');
            doc.text("Error al generar la tabla de tendencias mensuales", 40, doc.y);
            doc.font('Helvetica').fontSize(10).fillColor('#333333');
            doc.moveDown(0.5);
            doc.text(`Detalles: ${error.message}`, 40, doc.y);
          } catch (finalError) {
            console.error("Error fatal en sección de tendencias mensuales:", finalError);
          }
        }
      } else {
        console.warn("No hay datos de tendencias mensuales disponibles");
      }
      
      doc.end();
      
      stream.on('finish', () => {
        // sino que confiamos en la cuenta de páginas del documento original
        resolve(filePath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}


/**
 * Dibuja una tabla con estilo de Excel en el PDF con bordes forzados a gris
 * @param {PDFDocument} doc - Documento PDF
 * @param {Array} headers - Array de objetos de cabecera con {text, width, align}
 * @param {Array} rows - Array de arrays, cada uno con celdas para una fila
 * @param {Object} options - Opciones de estilo
 */
drawExcelStyleTable(doc, headers, rows, options = {}) {
  // Opciones por defecto
  const defaultOpts = {
    x: 40,
    y: doc.y,
    headerBg: '#656d4a',           // Color Acadelia para encabezados
    headerTextColor: '#ffffff',     // Texto blanco para encabezados
    alternateRowBg: '#f0efe7',      // Color Acadelia para filas alternas
    borderColor: '#d1d5db',         // Color gris claro para bordes - NO USADO (forzamos gris)
    textColor: '#333333',           // Color de texto principal
    rowHeight: 25,                  // Altura de filas
    headerHeight: 30,               // Altura del encabezado
    fontSize: 9,                    // Tamaño de fuente para celdas
    headerFontSize: 9,              // Tamaño de fuente para encabezados
    highlight: null,                // Para destacar filas específicas {rowIndex, bg}
    useCustomCellColors: false      // Permitir colores personalizados por celda
  };
  
  const settings = { ...defaultOpts, ...options };
  
  // FORZAR color de borde gris independientemente de las opciones
  const GRAY_BORDER = '#d1d5db';
  
  const availableWidth = doc.page.width - settings.x - 40; // 40px de margen derecho
  
  // Posición inicial
  let y = settings.y;
  
  if (y + settings.headerHeight + rows.length * settings.rowHeight > doc.page.height - 50) {
    doc.addPage();
    y = 40; // Margen superior
  }
  
  const totalDefinedWidth = headers.reduce((sum, header) => sum + header.width, 0);
  
  // Factor de escala para ajustar las columnas al ancho disponible
  const scaleFactor = availableWidth / totalDefinedWidth;
  
  const tableWidth = availableWidth;
  const tableHeight = settings.headerHeight + (rows.length * settings.rowHeight);
  
  // Estado original
  const originalStrokeColor = doc.strokeColor();
  
  doc.rect(settings.x, y, tableWidth, tableHeight)
     .lineWidth(0.7)
     .strokeColor(GRAY_BORDER) // FORZAR GRIS
     .stroke();
  
  doc.rect(settings.x, y, tableWidth, settings.headerHeight)
     .fillColor(settings.headerBg)
     .fill();
  
  let columnPositions = [];
  let xOffset = settings.x;
  
  headers.forEach((header) => {
    const scaledWidth = header.width * scaleFactor;
    xOffset += scaledWidth;
    
    // No guardamos la última posición (borde derecho de la tabla)
    if (xOffset < settings.x + tableWidth - 0.1) { // pequeña tolerancia para evitar problemas de redondeo
      columnPositions.push(xOffset);
    }
  });
  
  xOffset = settings.x;
  
  doc.font('Helvetica-Bold').fontSize(settings.headerFontSize).fillColor(settings.headerTextColor);
  
  headers.forEach((header, colIndex) => {
    const scaledWidth = header.width * scaleFactor;
    
    // Centrar verticalmente el texto
    const textY = y + (settings.headerHeight - settings.headerFontSize) / 2;
    
    const textOptions = {
      width: scaledWidth - 10, // Margen interno
      align: header.align || 'left'
    };
    
    doc.text(header.text, xOffset + 5, textY, textOptions);
    
    xOffset += scaledWidth;
  });
  
  doc.moveTo(settings.x, y + settings.headerHeight)
     .lineTo(settings.x + tableWidth, y + settings.headerHeight)
     .lineWidth(0.7)
     .strokeColor(GRAY_BORDER) // FORZAR GRIS
     .stroke();
  
  y += settings.headerHeight;
  
  rows.forEach((row, rowIndex) => {
    const isAlternate = rowIndex % 2 === 1;
    const isHighlighted = settings.highlight && settings.highlight.rowIndex === rowIndex;
    
    let bgColor;
    if (isHighlighted) {
      bgColor = settings.highlight.bg;
    } else if (isAlternate) {
      bgColor = settings.alternateRowBg;
    } else {
      bgColor = '#ffffff'; // Filas pares con fondo blanco
    }
    
    doc.rect(settings.x + 0.5, y + 0.5, tableWidth - 1, settings.rowHeight - 1)
       .fillColor(bgColor)
       .fill();
    
    xOffset = settings.x;
    
    row.forEach((cell, colIndex) => {
      const header = headers[colIndex];
      const scaledWidth = header.width * scaleFactor;
      
      const cellText = typeof cell === 'object' ? cell.text : cell.toString();
      const cellAlign = (typeof cell === 'object' && cell.align) ? cell.align : header.align || 'left';
      const isBold = typeof cell === 'object' && cell.bold;
      
      // Color personalizado para la celda (si está habilitado y definido)
      const cellColor = (settings.useCustomCellColors && typeof cell === 'object' && cell.color) 
                       ? cell.color 
                       : settings.textColor;
      
      if (isBold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      doc.fontSize(settings.fontSize).fillColor(cellColor);
      
      // Centrar verticalmente el texto
      const textY = y + (settings.rowHeight - settings.fontSize) / 2;
      
      // Opciones de texto
      const textOptions = {
        width: scaledWidth - 10, // Margen interno
        align: cellAlign
      };
      
      doc.text(cellText, xOffset + 5, textY, textOptions);
      
      xOffset += scaledWidth;
    });
    
    // Si no es la última fila, dibujar línea horizontal (GRIS FORZADO)
    if (rowIndex < rows.length - 1) {
      doc.moveTo(settings.x, y + settings.rowHeight)
         .lineTo(settings.x + tableWidth, y + settings.rowHeight)
         .lineWidth(0.5)
         .strokeColor(GRAY_BORDER) // FORZAR GRIS
         .stroke();
    }
    
    y += settings.rowHeight;
  });
  
  columnPositions.forEach(xPos => {
    doc.moveTo(xPos, settings.y)
       .lineTo(xPos, settings.y + tableHeight)
       .lineWidth(0.5)
       .strokeColor(GRAY_BORDER) // FORZAR GRIS
       .stroke();
  });
  
  doc.y = y + 10;
  
  // Restablecer el color de trazo original
  doc.strokeColor(originalStrokeColor);
  
  // Restablecer estilo por defecto
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  
  return doc;
}

/**
 * Obtiene datos precisos de suscripciones nuevas y canceladas por mes
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} - Datos de suscripciones agrupados por mes
 */
async getSubscriptionsByMonth(filters = {}) {
  try {
    console.log("Obteniendo datos de suscripciones por mes (método corregido)...");
    
    // 1. Consulta para suscripciones NUEVAS por mes (basado en created_at)
    let newSubsQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscriptions
      FROM suscripciones
      WHERE 1=1
    `;
    
    // 2. Consulta para TODAS las suscripciones CANCELADAS (estados canceled Y expired)
    // Se basa en updated_at porque las cancelaciones actualizan este campo
    let canceledSubsQuery = `
      SELECT 
        DATE_TRUNC('month', updated_at) as month,
        COUNT(*) as canceled_subscriptions
      FROM suscripciones
      WHERE status IN ('canceled', 'expired')
    `;
    
    // Parámetros para las consultas
    const queryParams = [];
    let paramIndex = 1;
    
    if (filters && filters.date_from) {
      newSubsQuery += ` AND created_at >= $${paramIndex}`;
      canceledSubsQuery += ` AND updated_at >= $${paramIndex}`;
      queryParams.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters && filters.date_to) {
      newSubsQuery += ` AND created_at <= $${paramIndex}`;
      canceledSubsQuery += ` AND updated_at <= $${paramIndex}`;
      queryParams.push(filters.date_to);
      paramIndex++;
    }
    
    // Agrupar por mes y ordenar
    newSubsQuery += ` GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`;
    canceledSubsQuery += ` GROUP BY DATE_TRUNC('month', updated_at) ORDER BY month`;
    
    // Imprimir las consultas para diagnóstico
    console.log("Consulta para nuevas suscripciones:", newSubsQuery);
    console.log("Consulta para suscripciones canceladas:", canceledSubsQuery);
    
    const [newSubsResult, canceledSubsResult] = await Promise.all([
      pool.query(newSubsQuery, queryParams),
      pool.query(canceledSubsQuery, queryParams)
    ]);
    
    console.log(`Encontrados ${newSubsResult.rows.length} meses con nuevas suscripciones:`);
    newSubsResult.rows.forEach(row => {
      console.log(`  ${new Date(row.month).toISOString().substring(0, 10)}: ${row.new_subscriptions} nuevas`);
    });
    
    console.log(`Encontrados ${canceledSubsResult.rows.length} meses con cancelaciones:`);
    canceledSubsResult.rows.forEach(row => {
      console.log(`  ${new Date(row.month).toISOString().substring(0, 10)}: ${row.canceled_subscriptions} canceladas`);
    });
    
    const subscriptionsByMonth = {};
    
    newSubsResult.rows.forEach(row => {
      const monthKey = this.normalizeMonthFormat(row.month);
      
      if (!subscriptionsByMonth[monthKey]) {
        subscriptionsByMonth[monthKey] = {
          month: row.month,
          new_subscriptions: 0,
          canceled_subscriptions: 0
        };
      }
      
      subscriptionsByMonth[monthKey].new_subscriptions = parseInt(row.new_subscriptions) || 0;
    });
    
    canceledSubsResult.rows.forEach(row => {
      const monthKey = this.normalizeMonthFormat(row.month);
      
      if (!subscriptionsByMonth[monthKey]) {
        subscriptionsByMonth[monthKey] = {
          month: row.month,
          new_subscriptions: 0,
          canceled_subscriptions: 0
        };
      }
      
      subscriptionsByMonth[monthKey].canceled_subscriptions = parseInt(row.canceled_subscriptions) || 0;
    });
    
    console.log("Resumen de suscripciones por mes (mapa final):");
    Object.keys(subscriptionsByMonth).sort().forEach(monthKey => {
      const data = subscriptionsByMonth[monthKey];
      console.log(`${monthKey}: ${data.new_subscriptions} nuevas, ${data.canceled_subscriptions} canceladas`);
    });
    
    return subscriptionsByMonth;
  } catch (error) {
    console.error("Error obteniendo datos de suscripciones por mes:", error);
    return {};
  }
}

/**
 * Calcula los ingresos correctos por mes a partir de la fuente de datos original
 * @param {Object} transactionAnalytics - Datos de análisis de transacciones
 * @returns {Array} - Tendencias mensuales con ingresos calculados correctamente
 */
async calculaIngresosCorrectosPorMes(transactionAnalytics, filters) {
  try {
    console.log("Calculando ingresos por mes usando directamente la base de datos...");
    
    let query = `
      SELECT 
        DATE_TRUNC('month', updated_at) as month,
        SUM(earnings_eur) as total_earnings_eur,
        SUM(amount_eur) as total_amount_eur,
        COUNT(*) as transactions
      FROM historial_transacciones
      WHERE 1=1
      AND event_type != 'transaction.payment_failed'  -- FILTRO AÑADIDO: Excluir transacciones fallidas
    `;
    
    // Parámetros para la consulta
    const queryParams = [];
    let paramIndex = 1;
    
    if (filters && filters.date_from) {
      query += ` AND updated_at >= $${paramIndex}`;
      queryParams.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters && filters.date_to) {
      query += ` AND updated_at <= $${paramIndex}`;
      queryParams.push(filters.date_to);
      paramIndex++;
    }
    
    // Agrupar por mes y ordenar
    query += ` GROUP BY DATE_TRUNC('month', updated_at) ORDER BY month`;
    
    const result = await pool.query(query, queryParams);
    console.log(`Encontrados ${result.rows.length} meses con datos de ingresos`);
    
    const monthlyRevenue = result.rows.map(row => ({
      month: row.month,
      total_eur: parseFloat(row.total_earnings_eur) || 0, // Usar earnings_eur
      earnings_eur: parseFloat(row.total_earnings_eur) || 0, // Añadir de forma explícita
      amount_eur: parseFloat(row.total_amount_eur) || 0, // Para referencia
      transactions: parseInt(row.transactions) || 0
    }));
    
    console.log("Ingresos por mes calculados correctamente:");
    monthlyRevenue.forEach(month => {
      console.log(`${month.month.toISOString().substring(0, 10)}: earnings_eur=${month.earnings_eur}, amount_eur=${month.amount_eur}`);
    });
    
    return monthlyRevenue;
  } catch (error) {
    console.error("Error calculando ingresos por mes:", error);
    
    // En caso de error, intentar recuperar los datos existentes
    console.log("Usando datos existentes como fallback...");
    
    // Asegurarnos de que revenue_by_month use earnings_eur como valor principal
    if (Array.isArray(transactionAnalytics.revenue_by_month)) {
      return transactionAnalytics.revenue_by_month.map(month => ({
        ...month,
        total_eur: parseFloat(month.earnings_eur || month.total_eur || month.amount_eur || 0)
      }));
    }
    
    return [];
  }
}

/**
 * Cuenta los usuarios activos basado en su último inicio de sesión
 * @param {Object} filters - Filtros opcionales
 * @param {number} daysThreshold - Días para considerar "activo" (por defecto 360)
 * @returns {Promise<number>} - Número de usuarios activos
 */
async countActiveUsers(filters = {}, daysThreshold = 360) {
  try {
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - daysThreshold);
    
    let query = `
      SELECT COUNT(DISTINCT id_user) as active_count
      FROM usuario
      WHERE last_login >= $1
    `;
    
    const queryParams = [activeThreshold.toISOString()];
    let paramIndex = 2;
    
    if (filters.date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters.date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(filters.date_to);
      paramIndex++;
    }
    
    console.log(`Consultando usuarios activos con umbral de ${daysThreshold} días`);
    const result = await pool.query(query, queryParams);
    
    return parseInt(result.rows[0]?.active_count || 0);
  } catch (error) {
    console.error('Error contando usuarios activos:', error);
    return 0; // Valor por defecto en caso de error
  }
}

/**
 * Calcula el total de gastos incluyendo impuestos
 * @param {Array} expenses - Lista de gastos
 * @returns {number} - Total de gastos con impuestos
 */
calculateTotalExpensesWithTax(expenses) {
  if (!Array.isArray(expenses)) {
    console.warn('calculateTotalExpensesWithTax: expenses no es un array:', expenses);
    return 0;
  }
  
  // Asegurarnos de que todos los gastos son procesados correctamente
  let totalWithTax = 0;
  let totalAmount = 0;
  let totalTax = 0;
  
  expenses.forEach(expense => {
    try {
      const expenseData = expense.data ? expense.data : expense;
      
      const amount = parseFloat(expenseData.amount || 0);
      const taxAmount = parseFloat(expenseData.tax_amount || 0);
      
      // Asegurar que los valores son números válidos
      const validAmount = isNaN(amount) ? 0 : amount;
      const validTaxAmount = isNaN(taxAmount) ? 0 : taxAmount;
      
      totalAmount += validAmount;
      totalTax += validTaxAmount;
      totalWithTax += (validAmount + validTaxAmount);
      
      if (validAmount > 0 || validTaxAmount > 0) {
        console.log(`Gasto: ${validAmount} + IVA: ${validTaxAmount} = ${validAmount + validTaxAmount}`);
      }
    } catch (error) {
      console.error('Error procesando gasto:', error, expense);
    }
  });
  
  console.log(`Totales calculados - Importe: ${totalAmount}, IVA: ${totalTax}, Total con IVA: ${totalWithTax}`);
  return totalWithTax;
}

/**
 * Función específica para formatear la sección de tendencias mensuales
 * @param {PDFDocument} doc - Documento PDF
 * @param {Array} monthlyTrends - Datos de tendencias mensuales
 */
formatTrendsSection(doc, monthlyTrends) {
  if (!monthlyTrends || monthlyTrends.length === 0) return;
  
  const trendRows = monthlyTrends.map(month => [
    { text: month.label },
    { 
      text: `€${month.revenue.toFixed(2)}`, 
      align: 'right' 
    },
    { 
      text: `€${month.expenses.toFixed(2)}`, 
      align: 'right' 
    },
    { 
      text: `€${month.netIncome.toFixed(2)}`, 
      align: 'right'
    },
    { 
      text: month.transactions.toString(), 
      align: 'right' 
    },
    { 
      text: month.subscriptions.toString(), 
      align: 'right' 
    },
    { 
      text: month.cancelations.toString(), 
      align: 'right' 
    }
  ]);
  
  this.drawExcelStyleTable(doc, 
    [
      { text: 'Mes', width: 60, align: 'center' },
      { text: 'Ingresos', width: 85, align: 'right' },
      { text: 'Egresos', width: 85, align: 'right' },
      { text: 'Beneficio', width: 85, align: 'right' },
      { text: 'Transac.', width: 60, align: 'right' },
      { text: 'Nuevas Suscr.', width: 60, align: 'right' },
      { text: 'Cancelaciones', width: 60, align: 'right' }
    ],
    trendRows,
    {
      headerBg: '#656d4a',
      headerTextColor: '#ffffff',
      alternateRowBg: '#f0efe7',
      textColor: '#333333',
      positiveColor: '#1d4620',  // Verde para valores positivos
      negativeColor: '#a61b1b',  // Rojo para valores negativos
      borderColor: '#582f0e',
      formatNumbers: true,
      moneyColumns: [1, 2, 3]    // Índices de columnas con valores monetarios
    }
  );
}


  /**
 * Calcula correctamente los ingresos totales usando earnings_eur
 * @param {Array} transactions - Lista de transacciones
 * @returns {number} - Total de ingresos
 */
  calculateTotalRevenue(transactions) {
    console.log(`Calculando ingresos con ${transactions.length} transacciones`);
    
    if (transactions.length > 0) {
      console.log('Muestra de transacciones para verificar campos:');
      transactions.slice(0, 3).forEach((tx, index) => {
        console.log(`TX ${index + 1}: earnings_eur=${tx.earnings_eur}, amount_eur=${tx.amount_eur}, earnings=${tx.earnings}`);
      });
    }
  
    return transactions.reduce((sum, tx) => {
      let amount = 0;
      
      if (tx.earnings_eur !== undefined && tx.earnings_eur !== null && !isNaN(parseFloat(tx.earnings_eur))) {
        amount = this.normalizeAmount(tx.earnings_eur);
        // console.log(`Usando earnings_eur: ${amount} para tx ${tx.transaction_id}`);
      }
      else if (tx.amount_eur !== undefined && tx.amount_eur !== null && !isNaN(parseFloat(tx.amount_eur))) {
        amount = this.normalizeAmount(tx.amount_eur);
        // console.log(`Usando amount_eur: ${amount} para tx ${tx.transaction_id}`);
      }
      // Tercer caso: calcular basado en earnings original y tasa de cambio
      else if (tx.earnings !== undefined && tx.earnings !== null && 
               tx.exchange_rate !== undefined && tx.exchange_rate !== null && 
               !isNaN(parseFloat(tx.earnings)) && !isNaN(parseFloat(tx.exchange_rate))) {
        amount = this.normalizeAmount(tx.earnings) * this.normalizeAmount(tx.exchange_rate);
        // console.log(`Usando earnings * exchange_rate: ${amount} para tx ${tx.transaction_id}`);
      }
      // Último fallback: usar amount original y tasa de cambio
      else if (tx.amount !== undefined && tx.amount !== null && 
               tx.exchange_rate !== undefined && tx.exchange_rate !== null && 
               !isNaN(parseFloat(tx.amount)) && !isNaN(parseFloat(tx.exchange_rate))) {
        amount = this.normalizeAmount(tx.amount) * this.normalizeAmount(tx.exchange_rate);
        // console.log(`Usando amount * exchange_rate: ${amount} para tx ${tx.transaction_id}`);
      }
      else {
        const fallbackValue = tx.earnings || tx.amount || 0;
        amount = this.normalizeAmount(fallbackValue);
        // console.log(`Usando fallback: ${amount} para tx ${tx.transaction_id}`);
      }
      
      return sum + amount;
    }, 0);
  }
  
  /**
   * Calcula correctamente los totales de impuestos
   * @param {Array} transactions - Lista de transacciones
   * @returns {Object} - Resumen de impuestos
   */
  calculateTaxSummary(transactions) {
    let totalAmount = 0;
    let totalTax = 0;
    let spainTax = 0;
    let otherTax = 0;
    
    transactions.forEach(transaction => {
      const amount = this.normalizeAmount(transaction.amount_eur || 0);
      const taxAmount = this.normalizeAmount(transaction.tax_amount_eur || 0);
      
      totalAmount += amount;
      totalTax += taxAmount;
      
      // Clasificar impuesto por región
      if (transaction.country_code === 'ES') {
        spainTax += taxAmount;
      } else {
        otherTax += taxAmount;
      }
    });
  
    const spainTaxPercentage = totalTax > 0 ? (spainTax / totalTax) * 100 : 0;
    const otherTaxPercentage = totalTax > 0 ? (otherTax / totalTax) * 100 : 0;
    
    return {
      totalAmount,
      totalTax,
      spainTax,
      otherTax,
      taxableAmount: totalAmount - totalTax,
      taxRatio: totalTax / totalAmount || 0,
      spainTaxPercentage,
      otherTaxPercentage
    };
  }
  
  /**
   * Calcula correctamente los egresos totales
   * @param {Array} expenses - Lista de gastos
   * @returns {number} - Total de egresos
   */
  calculateTotalExpenses(expenses) {
    if (!Array.isArray(expenses)) {
      console.warn('calculateTotalExpenses: expenses no es un array:', expenses);
      return 0;
    }
    
    return expenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.amount || 0);
      const taxAmount = parseFloat(expense.tax_amount || 0);
      
      // Asegurar que los valores son números válidos
      const validAmount = isNaN(amount) ? 0 : amount;
      const validTaxAmount = isNaN(taxAmount) ? 0 : taxAmount;
      
      return sum + validAmount + validTaxAmount;
    }, 0);
  }
  
  /**
   * Normaliza un valor monetario
   * @param {any} amount - Valor a normalizar
   * @returns {number} - Valor normalizado
   */
  normalizeAmount(amount) {
    // Si es null, undefined o NaN, retornar 0
    if (amount === null || amount === undefined || amount === '') {
      return 0;
    }
    
    // Si ya es un número, asegurarse de que es válido
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount;
    }
    
    // Si es string, convertir a número
    if (typeof amount === 'string') {
      const cleanedAmount = amount.replace(/[^\d.,\-]/g, '');
      
      // Si está vacío después de limpiar, retornar 0
      if (!cleanedAmount) return 0;
      
      const normalizedAmount = cleanedAmount.replace(/,/g, '.');
      
      // Si no tiene punto decimal y parece un valor en centavos
      if (!normalizedAmount.includes('.') && normalizedAmount.length > 2) {
        return parseInt(normalizedAmount) / 100;
      }
      
      const result = parseFloat(normalizedAmount);
      return isNaN(result) ? 0 : result;
    }
    
    const result = Number(amount);
    return isNaN(result) ? 0 : result;
  }
  
  /**
   * Añade un encabezado de sección al PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {string} text - Texto del encabezado
   */
  addSectionHeaderToPDF(doc, text) {
    doc.fontSize(14)
      .fillColor('#582f0e')
      .font('Helvetica-Bold')
      .text(text)
      .moveDown(0.5);
    doc.fillColor('#000000').font('Helvetica');
  }
  
  /**
   * Añade un encabezado de subsección al PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {string} text - Texto del encabezado
   */
  addSubsectionHeaderToPDF(doc, text) {
    doc.fontSize(12)
      .fillColor('#582f0e')
      .font('Helvetica-Bold')
      .text(text)
      .moveDown(0.5);
    doc.fillColor('#000000').font('Helvetica');
  }
  
  /**
   * Añade un encabezado de tabla al PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {Array} columns - Columnas de la tabla
   */
  addTableHeaderToPDF(doc, columns) {
    const y = doc.y;
    
    doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20)
      .fill('#656d4a');
    
    doc.fillColor('#FFFFFF').font('Helvetica-Bold');
    
    let x = doc.page.margins.left;
    columns.forEach(column => {
      doc.text(column.text, x, y + 5, { width: column.width });
      x += column.width;
    });
    
    doc.fillColor('#000000').font('Helvetica');
    doc.moveDown(0.5);
  }
  
  /**
   * Añade una fila de tabla al PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {Array} columns - Columnas de la fila
   * @param {boolean} alternate - Si debe tener fondo alterno
   */
  addTableRowToPDF(doc, columns, alternate = false) {
    const y = doc.y;
    const rowHeight = 20;
    
    if (alternate) {
      doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, rowHeight)
        .fill('#f0efe7');
    }
    
    let x = doc.page.margins.left;
    columns.forEach(column => {
      if (column.bold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      doc.text(column.text, x, y + 5, { width: column.width });
      x += column.width;
    });
    
    doc.font('Helvetica');
    doc.moveDown(0.5);
  }
  
  /**
   * Formatea un rango de fechas para mostrar
   * @param {Object} dateRange - Rango de fechas
   * @returns {string} - Rango formateado
   */
  formatDateRange(dateRange) {
    if (!dateRange) return 'Completo';
    
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };
    
    if (dateRange.start && dateRange.end) {
      return `${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}`;
    } else if (dateRange.start) {
      return `Desde ${formatDate(dateRange.start)}`;
    } else if (dateRange.end) {
      return `Hasta ${formatDate(dateRange.end)}`;
    } else {
      return 'Completo';
    }
  }
  
  /**
   * Envía el informe por correo electrónico
   * @param {Array} recipients - Destinatarios
   * @param {string} filePath - Ruta del archivo a adjuntar
   * @param {string} reportTitle - Título del informe
   * @param {string} period - Período del informe
   * @param {Object} reportData - Datos del informe
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendReportByEmail(recipients, filePath, reportTitle, period, reportData) {
    try {
      const { emailService } = await import('../../services/email/emailService.js');
      
      const options = {
        fileName: `${reportTitle.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`
      };
      
      const result = await emailService.sendFinancialReport(
        recipients,
        filePath,
        reportTitle,
        period,
        options,
        reportData  // Pasamos los datos del informe para mostrar valores reales
      );
      
      return result;
    } catch (error) {
      console.error('Error al enviar el informe por correo:', error);
      throw error;
    }
  }
  
/**
 * Programa la generación automática de informes
 * @param {Object} scheduleConfig - Configuración de programación
 * @returns {Object} - Job programado
 */
scheduleAutomaticReports(scheduleConfig) {
    try {
      // Configuración por defecto: primer día del mes a las 3 AM
      const config = {
        cronExpression: scheduleConfig.cronExpression || '0 3 1 * *', // "At 03:00 on day-of-month 1"
        recipients: scheduleConfig.recipients || [],
        title: scheduleConfig.title || 'Informe Integral Mensual Automático',
        createdBy: 43 // Usuario fijo ID 43 para todos los informes automáticos
      };
      
      console.log(`Programando generación automática de informes: ${config.cronExpression}`);
      
      // Programar tarea
      const job = schedule.scheduleJob(config.cronExpression, async () => {
        try {
          console.log('Ejecutando generación automática de informe integral...');
          
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
          const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
          
          const report = await this.generateIntegralReport({
            date_from: startDate.toISOString(),
            date_to: endDate.toISOString(),
            title: `${config.title} - ${lastMonth.toISOString().substring(0, 7)}`,
            recipients: config.recipients,
            created_by: 43 // Asegurar que siempre sea el usuario 43
          });
          
          console.log(`Informe automático generado: ${report.id}`);
        } catch (error) {
          console.error('Error en la generación automática de informes:', error);
        }
      });
      
      return job;
    } catch (error) {
      console.error('Error al programar informes automáticos:', error);
      throw error;
    }
  }
}

export const reportsService = new ReportsService();