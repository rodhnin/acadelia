// services/pagos/taxService.js
import pool from "../../lib/dbPool.js";

export class TaxService {
    /**
     * Obtiene el resumen de impuestos para un período
     * @param {Object} filters - Filtros para el análisis (dates, country, etc)
     * @returns {Promise<Object>} - Resumen de impuestos
     */
    async getTaxSummary(filters = {}) {
        try {
            // Parámetros de consulta
            const queryParams = [];
            let paramIndex = 1;
            
            // Condiciones para filtros de fecha
            let dateCondition = '';
            if (filters.date_from) {
                dateCondition += ` AND t.updated_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                dateCondition += ` AND t.updated_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
    
            // Consulta para obtener transacciones agrupadas por divisa
            // Ahora usamos los campos tax_amount, tax_rate que vienen directamente de Paddle
            const transactionsQuery = `
                SELECT 
                    currency_code,
                    COUNT(*) as transactions,
                    SUM(amount) as total_amount,
                    SUM(tax_amount) as tax_amount,
                    AVG(tax_rate) as avg_tax_rate,
                    SUM(amount_eur) as total_amount_eur,
                    SUM(tax_amount_eur) as tax_amount_eur
                FROM historial_transacciones t
                WHERE 1=1 ${dateCondition}
                GROUP BY currency_code
                ORDER BY total_amount_eur DESC
            `;
            
            const transactions = await pool.query(transactionsQuery, queryParams);
            
            const taxSummary = transactions.rows.map(row => {
                const taxRate = parseFloat(row.avg_tax_rate) || 0;
                const totalAmount = parseFloat(row.total_amount) || 0;
                const taxAmount = parseFloat(row.tax_amount) || 0;
                const taxableAmount = totalAmount - taxAmount;
    
                // También incluir los montos en EUR para comparación entre divisas
                const totalAmountEur = parseFloat(row.total_amount_eur) || 0;
                const taxAmountEur = parseFloat(row.tax_amount_eur) || 0;
                const taxableAmountEur = totalAmountEur - taxAmountEur;
                
                return {
                    currency_code: row.currency_code,
                    tax_rate: taxRate,
                    total_amount: parseFloat(totalAmount.toFixed(2)),
                    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
                    tax_amount: parseFloat(taxAmount.toFixed(2)),
                    total_amount_eur: parseFloat(totalAmountEur.toFixed(2)),
                    taxable_amount_eur: parseFloat(taxableAmountEur.toFixed(2)),
                    tax_amount_eur: parseFloat(taxAmountEur.toFixed(2)),
                    transactions: parseInt(row.transactions)
                };
            });
            
            let totalTaxableEUR = 0;
            let totalTaxEUR = 0;
            let totalAmountEUR = 0;
            
            taxSummary.forEach(item => {
                totalTaxableEUR += item.taxable_amount_eur;
                totalTaxEUR += item.tax_amount_eur;
                totalAmountEUR += item.total_amount_eur;
            });
            
            if (filters.date_from && filters.date_to) {
                await this.saveOrUpdateTaxAnalysis(
                    filters.date_from, 
                    filters.date_to, 
                    taxSummary
                );
            }
            
            return {
                by_currency: taxSummary,
                totals: {
                    taxable_amount_eur: parseFloat(totalTaxableEUR.toFixed(2)),
                    tax_amount_eur: parseFloat(totalTaxEUR.toFixed(2)),
                    total_amount_eur: parseFloat(totalAmountEUR.toFixed(2)),
                    effective_rate: parseFloat((totalTaxEUR / totalTaxableEUR * 100).toFixed(2))
                }
            };
        } catch (error) {
            console.error('Error obteniendo resumen de impuestos:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene los impuestos por país
     * @param {Object} filters - Filtros para el análisis
     * @returns {Promise<Object>} - Impuestos por país
     */
    async getTaxesByCountry(filters = {}) {
        try {
            // Parámetros de consulta
            const queryParams = [];
            let paramIndex = 1;
            
            // Condiciones para filtros de fecha
            let dateCondition = '';
            if (filters.date_from) {
                dateCondition += ` AND t.updated_at >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                dateCondition += ` AND t.updated_at <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
    
            // Consulta para obtener impuestos agrupados por país
            // Ahora usamos el country_code que viene directamente de las transacciones
            const taxesByCountryQuery = `
                SELECT 
                    COALESCE(country_code, 'UNKNOWN') as country_code,
                    currency_code,
                    COUNT(*) as transactions,
                    SUM(amount) as total_amount,
                    SUM(tax_amount) as tax_amount,
                    AVG(tax_rate) as avg_tax_rate,
                    SUM(amount_eur) as total_amount_eur,
                    SUM(tax_amount_eur) as tax_amount_eur
                FROM historial_transacciones t
                WHERE 1=1 ${dateCondition}
                GROUP BY country_code, currency_code
                ORDER BY SUM(tax_amount_eur) DESC
            `;
            
            const taxesByCountryResult = await pool.query(taxesByCountryQuery, queryParams);
            
            const taxesByCountry = taxesByCountryResult.rows.map(row => {
                const totalAmount = parseFloat(row.total_amount) || 0;
                const taxAmount = parseFloat(row.tax_amount) || 0;
                const taxableAmount = totalAmount - taxAmount;
    
                // También incluir los montos en EUR para comparación entre países
                const totalAmountEur = parseFloat(row.total_amount_eur) || 0;
                const taxAmountEur = parseFloat(row.tax_amount_eur) || 0;
                const taxableAmountEur = totalAmountEur - taxAmountEur;
                
                return {
                    country_code: row.country_code,
                    currency_code: row.currency_code,
                    tax_rate: parseFloat(row.avg_tax_rate) || 0,
                    total_amount: totalAmount,
                    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
                    tax_amount: parseFloat(taxAmount.toFixed(2)),
                    total_amount_eur: parseFloat(totalAmountEur.toFixed(2)),
                    taxable_amount_eur: parseFloat(taxableAmountEur.toFixed(2)),
                    tax_amount_eur: parseFloat(taxAmountEur.toFixed(2)),
                    transactions: parseInt(row.transactions)
                };
            });
            
            // Consulta específica para España vs resto
            const spainVsOthersQuery = `
                SELECT 
                    CASE 
                        WHEN country_code = 'ES' THEN 'Spain'
                        ELSE 'Others'
                    END as region,
                    COUNT(*) as transactions,
                    SUM(amount_eur) as total_amount_eur,
                    SUM(tax_amount_eur) as tax_amount_eur
                FROM historial_transacciones t
                WHERE 1=1 ${dateCondition}
                GROUP BY 
                    CASE 
                        WHEN country_code = 'ES' THEN 'Spain'
                        ELSE 'Others'
                    END
            `;
            
            const spainVsOthersResult = await pool.query(spainVsOthersQuery, queryParams);
            
            // Recopilar los resultados de España vs otros
            const spainData = spainVsOthersResult.rows.find(row => row.region === 'Spain') || 
                { transactions: 0, total_amount_eur: 0, tax_amount_eur: 0 };
            
            const othersData = spainVsOthersResult.rows.find(row => row.region === 'Others') || 
                { transactions: 0, total_amount_eur: 0, tax_amount_eur: 0 };
            
            const totalTaxEur = parseFloat(spainData.tax_amount_eur) + parseFloat(othersData.tax_amount_eur);
            
            // Resumen de España vs otros
            const spainVsOthers = {
                spain: {
                    transactions: parseInt(spainData.transactions),
                    total_amount_eur: parseFloat(parseFloat(spainData.total_amount_eur).toFixed(2)),
                    tax_amount_eur: parseFloat(parseFloat(spainData.tax_amount_eur).toFixed(2)),
                    tax_amount: parseFloat(parseFloat(spainData.tax_amount_eur).toFixed(2)), // Añadir esta propiedad
                    percentage: totalTaxEur ? parseFloat((parseFloat(spainData.tax_amount_eur) / totalTaxEur * 100).toFixed(2)) : 0
                },
                others: {
                    transactions: parseInt(othersData.transactions),
                    total_amount_eur: parseFloat(parseFloat(othersData.total_amount_eur).toFixed(2)),
                    tax_amount_eur: parseFloat(parseFloat(othersData.tax_amount_eur).toFixed(2)),
                    tax_amount: parseFloat(parseFloat(othersData.tax_amount_eur).toFixed(2)), // Añadir esta propiedad
                    percentage: totalTaxEur ? parseFloat((parseFloat(othersData.tax_amount_eur) / totalTaxEur * 100).toFixed(2)) : 0
                }
            };
            
            const totalsQuery = `
                SELECT 
                    SUM(amount_eur) as total_amount_eur,
                    SUM(tax_amount_eur) as tax_amount_eur
                FROM historial_transacciones t
                WHERE 1=1 ${dateCondition}
            `;
            
            const totalsResult = await pool.query(totalsQuery, queryParams);
            const totals = totalsResult.rows[0];
            
            const totalAmountEur = parseFloat(totals.total_amount_eur) || 0;
            const taxAmountEur = parseFloat(totals.tax_amount_eur) || 0;
            const taxableAmountEur = totalAmountEur - taxAmountEur;
            
            return {
                by_country: taxesByCountry,
                spain_vs_others: spainVsOthers,
                totals: {
                    taxable_amount_eur: parseFloat(taxableAmountEur.toFixed(2)),
                    tax_amount_eur: parseFloat(taxAmountEur.toFixed(2)),
                    total_amount_eur: parseFloat(totalAmountEur.toFixed(2)),
                    effective_rate: taxableAmountEur ? parseFloat((taxAmountEur / taxableAmountEur * 100).toFixed(2)) : 0
                }
            };
        } catch (error) {
            console.error('Error obteniendo impuestos por país:', error);
            throw error;
        }
    }
    
    /**
     * Genera un informe de impuestos para el período especificado
     * @param {Object} params - Parámetros para el informe
     * @returns {Promise<Object>} - Datos del informe generado
     */
    async generateTaxReport(params) {
        try {
            if (!params.date_from || !params.date_to) {
                throw new Error('Se requiere período (date_from y date_to)');
            }
            
            const taxData = await this.getTaxesByCountry({
                date_from: params.date_from,
                date_to: params.date_to
            });
            
            const reportData = {
                period: {
                    from: params.date_from,
                    to: params.date_to
                },
                generated_at: new Date(),
                format: params.format || 'json',
                data: taxData,
                summary: {
                    total_taxable_amount: taxData.totals.taxable_amount_eur,
                    total_tax_amount: taxData.totals.tax_amount_eur,
                    spain_tax_amount: taxData.spain_vs_others.spain.tax_amount,
                    other_countries_tax_amount: taxData.spain_vs_others.others.tax_amount
                }
            };
            
            const query = `
                INSERT INTO informes (
                    name, type, format, parameters, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5
                ) RETURNING id
            `;
            
            const reportName = `Informe de Impuestos ${params.date_from.substring(0, 10)} a ${params.date_to.substring(0, 10)}`;
            const reportParams = {
                period: {
                    from: params.date_from,
                    to: params.date_to
                },
                filters: params.filters || {}
            };
            
            const result = await pool.query(query, [
                reportName,
                'tax_report',
                params.format || 'json',
                JSON.stringify(reportParams),
                params.created_by
            ]);
            
            const reportId = result.rows[0].id;
            
            // En un sistema real, aquí se generaría un archivo físico
            // y se almacenaría la ruta en la base de datos
            
            return {
                id: reportId,
                name: reportName,
                format: params.format || 'json',
                data: reportData
            };
        } catch (error) {
            console.error('Error generando informe de impuestos:', error);
            throw error;
        }
    }
    
    /**
     * Guarda o actualiza el análisis de impuestos para un período
     * @param {Date} periodStart - Inicio del período
     * @param {Date} periodEnd - Fin del período
     * @param {Array} taxData - Datos de impuestos por divisa/país
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async saveOrUpdateTaxAnalysis(periodStart, periodEnd, taxData) {
        try {
            const checkQuery = `
                SELECT id FROM analisis_impuestos
                WHERE period_start = $1 AND period_end = $2
            `;
            
            const checkResult = await pool.query(checkQuery, [
                periodStart,
                periodEnd
            ]);
            
            // Si existe, eliminar registros anteriores
            if (checkResult.rows.length > 0) {
                const deleteQuery = `
                    DELETE FROM analisis_impuestos
                    WHERE period_start = $1 AND period_end = $2
                `;
                
                await pool.query(deleteQuery, [periodStart, periodEnd]);
            }
            
            for (const item of taxData) {
                const currencyToCountry = {
                    'EUR': 'ES',
                    'USD': 'US',
                    'GBP': 'GB',
                    'Default': 'OT'
                };
                
                const countryCode = currencyToCountry[item.currency_code] || currencyToCountry.Default;
                
                const insertQuery = `
                    INSERT INTO analisis_impuestos (
                        period_start, period_end, country_code,
                        tax_rate, taxable_amount, tax_amount, transaction_count
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7
                    )
                `;
                
                await pool.query(insertQuery, [
                    periodStart,
                    periodEnd,
                    countryCode,
                    item.tax_rate,
                    item.taxable_amount,
                    item.tax_amount,
                    item.transactions
                ]);
            }
            
            return true;
        } catch (error) {
            console.error('Error guardando análisis de impuestos:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene análisis de impuestos históricos
     * @param {Object} filters - Filtros para la consulta
     * @returns {Promise<Array>} - Análisis históricos
     */
    async getHistoricalTaxAnalysis(filters = {}) {
        try {
            let query = `
                SELECT period_start, period_end, country_code,
                       tax_rate, taxable_amount, tax_amount, transaction_count
                FROM analisis_impuestos
                WHERE 1=1
            `;
            
            const queryParams = [];
            let paramIndex = 1;
            
            if (filters.date_from) {
                query += ` AND period_start >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND period_end <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            if (filters.country_code) {
                query += ` AND country_code = $${paramIndex}`;
                queryParams.push(filters.country_code);
                paramIndex++;
            }
            
            query += ` ORDER BY period_start DESC, country_code`;
            
            const result = await pool.query(query, queryParams);
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo análisis históricos de impuestos:', error);
            throw error;
        }
    }
}

export const taxService = new TaxService();