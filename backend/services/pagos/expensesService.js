// services/pagos/expensesService.js
import pool from "../../lib/dbPool.js";

export class ExpensesService {
    /**
     * Crea un nuevo egreso/gasto
     * @param {Object} expenseData - Datos del egreso
     * @returns {Promise<Object>} - Egreso creado
     */
    async createExpense(expenseData) {
        try {
            if (!expenseData.amount || !expenseData.description || !expenseData.date || 
                !expenseData.category_id || !expenseData.created_by) {
                throw new Error('Faltan campos obligatorios para crear el egreso');
            }
            
            const query = `
                INSERT INTO egresos (
                    amount, description, date, category_id, 
                    payment_method, reference, tax_amount, 
                    is_tax_deductible, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9
                ) RETURNING *
            `;
            
            const result = await pool.query(query, [
                expenseData.amount,
                expenseData.description,
                expenseData.date,
                expenseData.category_id,
                expenseData.payment_method || null,
                expenseData.reference || null,
                expenseData.tax_amount || null,
                expenseData.is_tax_deductible || false,
                expenseData.created_by
            ]);
            
            const categoryResult = await pool.query(
                'SELECT name FROM categorias_egresos WHERE id = $1',
                [expenseData.category_id]
            );
            
            const categoryName = categoryResult.rows[0]?.name || 'Desconocida';
            
            return {
                ...result.rows[0],
                category_name: categoryName
            };
        } catch (error) {
            console.error('Error creando egreso:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene todos los egresos con filtros opcionales
     * @param {Object} filters - Filtros a aplicar
     * @param {Object} pagination - Configuración de paginación
     * @returns {Promise<Array>} - Lista de egresos
     */
    async getAllExpenses(filters = {}, pagination = { page: 1, limit: 50 }) {
        try {
            let query = `
                SELECT e.*, c.name as category_name, u.correo as created_by_email
                FROM egresos e
                LEFT JOIN categorias_egresos c ON e.category_id = c.id
                LEFT JOIN usuario u ON e.created_by = u.id_user
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            if (filters.category_id) {
                query += ` AND e.category_id = $${paramIndex}`;
                queryParams.push(filters.category_id);
                paramIndex++;
            }
            
            if (filters.payment_method) {
                query += ` AND e.payment_method = $${paramIndex}`;
                queryParams.push(filters.payment_method);
                paramIndex++;
            }
            
            if (filters.date_from) {
                query += ` AND e.date >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND e.date <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            if (filters.min_amount) {
                query += ` AND e.amount >= $${paramIndex}`;
                queryParams.push(filters.min_amount);
                paramIndex++;
            }
            
            if (filters.max_amount) {
                query += ` AND e.amount <= $${paramIndex}`;
                queryParams.push(filters.max_amount);
                paramIndex++;
            }
            
            if (filters.is_tax_deductible === true || filters.is_tax_deductible === false) {
                query += ` AND e.is_tax_deductible = $${paramIndex}`;
                queryParams.push(filters.is_tax_deductible);
                paramIndex++;
            }
            
            if (filters.search) {
                query += ` AND (
                    e.description ILIKE $${paramIndex} OR 
                    e.reference ILIKE $${paramIndex} OR 
                    c.name ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            
            // Consultar el total de registros para la paginación
            const countQuery = `SELECT COUNT(*) FROM (${query}) as subquery`;
            const countResult = await pool.query(countQuery, queryParams);
            const totalCount = parseInt(countResult.rows[0].count);
            
            const sortField = filters.sort_by || 'date';
            const sortDirection = filters.sort_direction || 'DESC';
            
            query += ` ORDER BY e.${sortField} ${sortDirection}`;
            
            // Paginación
            const page = pagination.page || 1;
            const limit = pagination.limit || 50;
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
            console.error('Error obteniendo egresos:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene un egreso específico por su ID
     * @param {number} expenseId - ID del egreso
     * @returns {Promise<Object>} - Datos del egreso
     */
    async getExpenseById(expenseId) {
        try {
            const query = `
                SELECT e.*, c.name as category_name, u.correo as created_by_email
                FROM egresos e
                LEFT JOIN categorias_egresos c ON e.category_id = c.id
                LEFT JOIN usuario u ON e.created_by = u.id_user
                WHERE e.id = $1
            `;
            
            const result = await pool.query(query, [expenseId]);
            
            if (result.rows.length === 0) {
                throw new Error('Egreso no encontrado');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error(`Error obteniendo egreso ${expenseId}:`, error);
            throw error;
        }
    }
    
    /**
     * Actualiza un egreso existente
     * @param {number} expenseId - ID del egreso
     * @param {Object} expenseData - Nuevos datos
     * @returns {Promise<Object>} - Egreso actualizado
     */
    async updateExpense(expenseId, expenseData) {
        try {
            const checkQuery = 'SELECT * FROM egresos WHERE id = $1';
            const checkResult = await pool.query(checkQuery, [expenseId]);
            
            if (checkResult.rows.length === 0) {
                throw new Error('Egreso no encontrado');
            }
            
            let query = 'UPDATE egresos SET updated_at = NOW()';
            const queryParams = [];
            const setValues = [];
            
            if (expenseData.amount !== undefined) {
                queryParams.push(expenseData.amount);
                setValues.push(`amount = $${queryParams.length}`);
            }
            
            if (expenseData.description !== undefined) {
                queryParams.push(expenseData.description);
                setValues.push(`description = $${queryParams.length}`);
            }
            
            if (expenseData.date !== undefined) {
                queryParams.push(expenseData.date);
                setValues.push(`date = $${queryParams.length}`);
            }
            
            if (expenseData.category_id !== undefined) {
                queryParams.push(expenseData.category_id);
                setValues.push(`category_id = $${queryParams.length}`);
            }
            
            if (expenseData.payment_method !== undefined) {
                queryParams.push(expenseData.payment_method);
                setValues.push(`payment_method = $${queryParams.length}`);
            }
            
            if (expenseData.reference !== undefined) {
                queryParams.push(expenseData.reference);
                setValues.push(`reference = $${queryParams.length}`);
            }
            
            if (expenseData.tax_amount !== undefined) {
                queryParams.push(expenseData.tax_amount);
                setValues.push(`tax_amount = $${queryParams.length}`);
            }
            
            if (expenseData.is_tax_deductible !== undefined) {
                queryParams.push(expenseData.is_tax_deductible);
                setValues.push(`is_tax_deductible = $${queryParams.length}`);
            }
            
            // Si no hay campos para actualizar, retornar el egreso original
            if (setValues.length === 0) {
                return checkResult.rows[0];
            }
            
            query += `, ${setValues.join(', ')} WHERE id = $${queryParams.length + 1} RETURNING *`;
            queryParams.push(expenseId);
            
            const result = await pool.query(query, queryParams);
            
            const categoryResult = await pool.query(
                'SELECT name FROM categorias_egresos WHERE id = $1',
                [result.rows[0].category_id]
            );
            
            const categoryName = categoryResult.rows[0]?.name || 'Desconocida';
            
            return {
                ...result.rows[0],
                category_name: categoryName
            };
        } catch (error) {
            console.error(`Error actualizando egreso ${expenseId}:`, error);
            throw error;
        }
    }

    /**
 * Actualiza un egreso con la URL de la factura
 * @param {number} expenseId - ID del egreso
 * @param {string} invoiceUrl - URL de la factura en Google Drive
 * @returns {Promise<Object>} - Egreso actualizado
 */
async updateExpenseWithInvoice(expenseId, invoiceUrl) {
    try {
      const query = `
        UPDATE egresos 
        SET invoice_url = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [invoiceUrl, expenseId]);
      
      if (result.rows.length === 0) {
        throw new Error('Egreso no encontrado');
      }
      
      const categoryResult = await pool.query(
        'SELECT name FROM categorias_egresos WHERE id = $1',
        [result.rows[0].category_id]
      );
      
      const categoryName = categoryResult.rows[0]?.name || 'Desconocida';
      
      return {
        ...result.rows[0],
        category_name: categoryName
      };
    } catch (error) {
      console.error(`Error actualizando egreso con factura ${expenseId}:`, error);
      throw error;
    }
  }
    
    /**
     * Elimina un egreso
     * @param {number} expenseId - ID del egreso
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async deleteExpense(expenseId) {
        try {
            const query = 'DELETE FROM egresos WHERE id = $1 RETURNING id';
            const result = await pool.query(query, [expenseId]);
            
            if (result.rows.length === 0) {
                throw new Error('Egreso no encontrado');
            }
            
            return true;
        } catch (error) {
            console.error(`Error eliminando egreso ${expenseId}:`, error);
            throw error;
        }
    }
    
    /**
     * Obtiene todas las categorías de egresos
     * @returns {Promise<Array>} - Lista de categorías
     */
    async getExpenseCategories() {
        try {
            const query = 'SELECT * FROM categorias_egresos ORDER BY name';
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo categorías de egresos:', error);
            throw error;
        }
    }
    
    /**
     * Crea una nueva categoría de egresos
     * @param {Object} categoryData - Datos de la categoría
     * @returns {Promise<Object>} - Categoría creada
     */
    async createExpenseCategory(categoryData) {
        try {
            if (!categoryData.name) {
                throw new Error('El nombre de la categoría es obligatorio');
            }
            
            const query = `
                INSERT INTO categorias_egresos (
                    name, description
                ) VALUES (
                    $1, $2
                ) RETURNING *
            `;
            
            const result = await pool.query(query, [
                categoryData.name,
                categoryData.description || null
            ]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error creando categoría de egresos:', error);
            throw error;
        }
    }
    
/**
 * Obtiene totales de egresos con filtros opcionales
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<Object>} - Totales de egresos
 */
async getExpensesTotals(filters = {}) {
    try {
        let query = `
            SELECT 
                SUM(amount) as total,
                SUM(CASE WHEN is_tax_deductible = true THEN amount ELSE 0 END) as tax_deductible,
                COUNT(*) as count
            FROM egresos
            WHERE 1=1
        `;
        
        // Array para los parámetros
        const queryParams = [];
        let paramIndex = 1;
        
        if (filters.category_id) {
            query += ` AND category_id = $${paramIndex}`;
            queryParams.push(filters.category_id);
            paramIndex++;
        }
        
        if (filters.date_from) {
            query += ` AND date >= $${paramIndex}`;
            queryParams.push(filters.date_from);
            paramIndex++;
        }
        
        if (filters.date_to) {
            query += ` AND date <= $${paramIndex}`;
            queryParams.push(filters.date_to);
            paramIndex++;
        }
        
        const result = await pool.query(query, queryParams);
        
        // Reiniciar los parámetros para la segunda consulta
        // IMPORTANTE: crear un nuevo array de parámetros para evitar el error
        const categoryQueryParams = [];
        let categoryParamIndex = 1;
        
        // Consulta para obtener totales por categoría
        let categoryQuery = `
            SELECT 
                c.id, c.name, SUM(e.amount) as total, COUNT(*) as count
            FROM egresos e
            JOIN categorias_egresos c ON e.category_id = c.id
            WHERE 1=1
        `;
        
        if (filters.date_from) {
            categoryQuery += ` AND e.date >= $${categoryParamIndex}`;
            categoryQueryParams.push(filters.date_from);
            categoryParamIndex++;
        }
        
        if (filters.date_to) {
            categoryQuery += ` AND e.date <= $${categoryParamIndex}`;
            categoryQueryParams.push(filters.date_to);
            categoryParamIndex++;
        }
        
        categoryQuery += ` GROUP BY c.id, c.name ORDER BY total DESC`;
        
        const categoryResult = await pool.query(categoryQuery, categoryQueryParams);
        
        return {
            total: parseFloat(result.rows[0]?.total || 0),
            tax_deductible: parseFloat(result.rows[0]?.tax_deductible || 0),
            count: parseInt(result.rows[0]?.count || 0),
            by_category: categoryResult.rows.map(row => ({
                id: row.id,
                name: row.name,
                total: parseFloat(row.total || 0),
                count: parseInt(row.count || 0),
                percentage: parseFloat(row.total || 0) / parseFloat(result.rows[0]?.total || 1) * 100
            }))
        };
    } catch (error) {
        console.error('Error obteniendo totales de egresos:', error);
        throw error;
    }
}
    
    /**
     * Obtiene egresos agrupados por mes
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>} - Egresos por mes
     */
    async getExpensesByMonth(filters = {}) {
        try {
            let query = `
                SELECT 
                    DATE_TRUNC('month', date) as month,
                    SUM(amount) as total,
                    COUNT(*) as count
                FROM egresos
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            if (filters.category_id) {
                query += ` AND category_id = $${paramIndex}`;
                queryParams.push(filters.category_id);
                paramIndex++;
            }
            
            if (filters.date_from) {
                query += ` AND date >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND date <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            query += ` GROUP BY DATE_TRUNC('month', date) ORDER BY month`;
            
            const result = await pool.query(query, queryParams);
            
            return result.rows.map(row => ({
                month: row.month,
                total: parseFloat(row.total),
                count: parseInt(row.count)
            }));
        } catch (error) {
            console.error('Error obteniendo egresos por mes:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene egresos agrupados por categoría
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>} - Egresos por categoría
     */
    async getExpensesByCategory(filters = {}) {
        try {
            let query = `
                SELECT 
                    c.id, c.name, SUM(e.amount) as total, COUNT(*) as count
                FROM egresos e
                JOIN categorias_egresos c ON e.category_id = c.id
                WHERE 1=1
            `;
            
            // Array para los parámetros
            const queryParams = [];
            let paramIndex = 1;
            
            if (filters.date_from) {
                query += ` AND e.date >= $${paramIndex}`;
                queryParams.push(filters.date_from);
                paramIndex++;
            }
            
            if (filters.date_to) {
                query += ` AND e.date <= $${paramIndex}`;
                queryParams.push(filters.date_to);
                paramIndex++;
            }
            
            query += ` GROUP BY c.id, c.name ORDER BY total DESC`;
            
            const result = await pool.query(query, queryParams);
            
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                total: parseFloat(row.total),
                count: parseInt(row.count)
            }));
        } catch (error) {
            console.error('Error obteniendo egresos por categoría:', error);
            throw error;
        }
    }
}

export const expensesService = new ExpensesService();