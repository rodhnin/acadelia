// controllers/pagos/expensesController.js
import { expensesService } from "../../services/pagos/expensesService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { googleDriveService } from '../../utils/googleDriveService.js';

export const ExpensesController = {
    /**
     * Crea un nuevo egreso/gasto
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async createExpense(req, res) {
        try {
            // Extraer datos del cuerpo de la petición
            const { amount, description, date, category_id, payment_method, reference, tax_amount, is_tax_deductible } = req.body;
            
            // Validar datos requeridos
            if (!amount || !description || !date || !category_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios para crear el egreso'
                });
            }
            
            // Log de creación
            logSecurityEvent('EXPENSE_CREATION', 'Creación de nuevo egreso', {
                userId: req.user?.id_user,
                amount,
                category_id,
                ip: req.ip
            }, 'medium');
            
            const expenseData = {
                amount,
                description,
                date,
                category_id,
                payment_method,
                reference,
                tax_amount,
                is_tax_deductible,
                created_by: req.user.id_user
            };
            
            const expense = await expensesService.createExpense(expenseData);
            
            res.status(201).json({
                success: true,
                data: expense,
                message: 'Egreso creado correctamente'
            });
        } catch (error) {
            console.error('Error creando egreso:', error);
            
            logSecurityEvent('EXPENSE_CREATION_ERROR', 'Error al crear egreso', {
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
 * Sube una factura para un egreso existente
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
async uploadInvoice(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar si el archivo fue subido correctamente
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo'
        });
      }
      
      // Log de subida
      logSecurityEvent('EXPENSE_INVOICE_UPLOAD', 'Subida de factura para egreso', {
        userId: req.user?.id_user,
        expenseId: id,
        fileSize: req.file.size,
        ip: req.ip
      }, 'medium');
      
      try {
        // Primero, obtener el egreso para conocer su fecha
        const expense = await expensesService.getExpenseById(id);
        const expenseDate = new Date(expense.date);
        
        // Subir archivo a Google Drive
        const invoiceUrl = await googleDriveService.uploadInvoice(
          req.file.path,
          id,
          expenseDate
        );
        
        // Actualizar el egreso con la URL de la factura
        const updatedExpense = await expensesService.updateExpenseWithInvoice(id, invoiceUrl);
        
        res.json({
          success: true,
          data: updatedExpense,
          message: 'Factura subida correctamente'
        });
      } catch (error) {
        // Si hay un error, intentar eliminar el archivo temporal
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (unlinkErr) => {
            if (unlinkErr) console.error('Error al eliminar archivo temporal:', unlinkErr);
          });
        }
        
        throw error; // Re-lanzar para que lo capture el catch exterior
      }
    } catch (error) {
      console.error(`Error subiendo factura para egreso ${req.params.id}:`, error);
      
      logSecurityEvent('EXPENSE_INVOICE_UPLOAD_ERROR', 'Error al subir factura', {
        userId: req.user?.id_user,
        expenseId: req.params.id,
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
     * Obtiene todos los egresos con filtros opcionales
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getAllExpenses(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                category_id: req.query.category_id,
                payment_method: req.query.payment_method,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                min_amount: req.query.min_amount,
                max_amount: req.query.max_amount,
                is_tax_deductible: req.query.is_tax_deductible === 'true' ? true : 
                                   req.query.is_tax_deductible === 'false' ? false : undefined,
                search: req.query.search,
                sort_by: req.query.sort_by,
                sort_direction: req.query.sort_direction
            };
            
            // Extraer datos de paginación
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };
            
            // Log de acceso
            logSecurityEvent('EXPENSES_LIST_ACCESS', 'Acceso a lista de egresos', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const expenses = await expensesService.getAllExpenses(filters, pagination);
            
            res.json({
                success: true,
                data: expenses.data,
                pagination: expenses.pagination
            });
        } catch (error) {
            console.error('Error obteniendo egresos:', error);
            
            logSecurityEvent('EXPENSES_LIST_ERROR', 'Error al obtener lista de egresos', {
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
 * Crea un nuevo egreso con factura en una sola operación
 * @param {Object} req - Objeto de petición
 * @param {Object} res - Objeto de respuesta
 */
async createExpenseWithInvoice(req, res) {
    try {
        // Extraer datos del cuerpo de la petición
        const { amount, description, date, category_id, payment_method, reference, tax_amount, is_tax_deductible } = req.body;
        
        // Validar datos requeridos
        if (!amount || !description || !date || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios para crear el egreso'
            });
        }
        
        // Verificar si el archivo fue subido correctamente
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha proporcionado ningún archivo'
            });
        }
        
        // Log de creación
        logSecurityEvent('EXPENSE_CREATION_WITH_INVOICE', 'Creación de nuevo egreso con factura', {
            userId: req.user?.id_user,
            amount,
            category_id,
            fileSize: req.file.size,
            ip: req.ip
        }, 'medium');
        
        try {
            // 1. Crear el egreso primero
            const expenseData = {
                amount,
                description,
                date,
                category_id,
                payment_method,
                reference,
                tax_amount,
                is_tax_deductible: is_tax_deductible === 'true' || is_tax_deductible === true,
                created_by: req.user.id_user
            };
            
            const expense = await expensesService.createExpense(expenseData);
            
            // 2. Subir archivo a Google Drive (usando la fecha del egreso)
            const expenseDate = new Date(date);
            const invoiceUrl = await googleDriveService.uploadInvoice(
                req.file.path,
                expense.id, // Usar el ID del egreso recién creado
                expenseDate
            );
            
            // 3. Actualizar el egreso con la URL de la factura
            const updatedExpense = await expensesService.updateExpenseWithInvoice(expense.id, invoiceUrl);
            
            // 4. Responder con el egreso actualizado
            res.status(201).json({
                success: true,
                data: updatedExpense,
                message: 'Egreso creado correctamente con factura'
            });
        } catch (error) {
            // Si hay un error, intentar eliminar el archivo temporal
            if (req.file && req.file.path) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo temporal:', unlinkErr);
                });
            }
            
            throw error; // Re-lanzar para que lo capture el catch exterior
        }
    } catch (error) {
        console.error('Error creando egreso con factura:', error);
        
        logSecurityEvent('EXPENSE_CREATION_WITH_INVOICE_ERROR', 'Error al crear egreso con factura', {
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
     * Obtiene un egreso específico por su ID
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getExpenseById(req, res) {
        try {
            const { id } = req.params;
            
            // Log de acceso
            logSecurityEvent('EXPENSE_DETAIL_ACCESS', 'Acceso a detalle de egreso', {
                userId: req.user?.id_user,
                expenseId: id,
                ip: req.ip
            }, 'medium');
            
            const expense = await expensesService.getExpenseById(id);
            
            res.json({
                success: true,
                data: expense
            });
        } catch (error) {
            console.error(`Error obteniendo egreso ${req.params.id}:`, error);
            
            logSecurityEvent('EXPENSE_DETAIL_ERROR', 'Error al obtener detalle de egreso', {
                userId: req.user?.id_user,
                expenseId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si el egreso no existe, devolver 404
            if (error.message === 'Egreso no encontrado') {
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
     * Actualiza un egreso existente
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async updateExpense(req, res) {
        try {
            const { id } = req.params;
            // Extraer datos del cuerpo de la petición
            const { amount, description, date, category_id, payment_method, reference, tax_amount, is_tax_deductible } = req.body;
            
            // Log de actualización
            logSecurityEvent('EXPENSE_UPDATE', 'Actualización de egreso', {
                userId: req.user?.id_user,
                expenseId: id,
                ip: req.ip
            }, 'medium');
            
            const expenseData = {
                amount,
                description,
                date,
                category_id,
                payment_method,
                reference,
                tax_amount,
                is_tax_deductible
            };
            
            const expense = await expensesService.updateExpense(id, expenseData);
            
            res.json({
                success: true,
                data: expense,
                message: 'Egreso actualizado correctamente'
            });
        } catch (error) {
            console.error(`Error actualizando egreso ${req.params.id}:`, error);
            
            logSecurityEvent('EXPENSE_UPDATE_ERROR', 'Error al actualizar egreso', {
                userId: req.user?.id_user,
                expenseId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'medium');
            
            // Si el egreso no existe, devolver 404
            if (error.message === 'Egreso no encontrado') {
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
     * Elimina un egreso
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            
            // Log de eliminación
            logSecurityEvent('EXPENSE_DELETE', 'Eliminación de egreso', {
                userId: req.user?.id_user,
                expenseId: id,
                ip: req.ip
            }, 'high');
            
            await expensesService.deleteExpense(id);
            
            res.json({
                success: true,
                message: 'Egreso eliminado correctamente'
            });
        } catch (error) {
            console.error(`Error eliminando egreso ${req.params.id}:`, error);
            
            logSecurityEvent('EXPENSE_DELETE_ERROR', 'Error al eliminar egreso', {
                userId: req.user?.id_user,
                expenseId: req.params.id,
                error: error.message,
                ip: req.ip
            }, 'high');
            
            // Si el egreso no existe, devolver 404
            if (error.message === 'Egreso no encontrado') {
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
     * Obtiene todas las categorías de egresos
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getExpenseCategories(req, res) {
        try {
            const categories = await expensesService.getExpenseCategories();
            
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error obteniendo categorías de egresos:', error);
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Crea una nueva categoría de egresos
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async createExpenseCategory(req, res) {
        try {
            // Extraer datos del cuerpo de la petición
            const { name, description } = req.body;
            
            // Validar datos requeridos
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la categoría es obligatorio'
                });
            }
            
            // Log de creación
            logSecurityEvent('EXPENSE_CATEGORY_CREATION', 'Creación de nueva categoría de egreso', {
                userId: req.user?.id_user,
                name,
                ip: req.ip
            }, 'medium');
            
            const category = await expensesService.createExpenseCategory({ name, description });
            
            res.status(201).json({
                success: true,
                data: category,
                message: 'Categoría de egreso creada correctamente'
            });
        } catch (error) {
            console.error('Error creando categoría de egreso:', error);
            
            logSecurityEvent('EXPENSE_CATEGORY_CREATION_ERROR', 'Error al crear categoría de egreso', {
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
     * Obtiene totales de egresos con filtros opcionales
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getExpensesTotals(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                category_id: req.query.category_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            
            // Log de acceso
            logSecurityEvent('EXPENSES_TOTALS_ACCESS', 'Acceso a totales de egresos', {
                userId: req.user?.id_user,
                filters,
                ip: req.ip
            }, 'medium');
            
            const totals = await expensesService.getExpensesTotals(filters);
            
            res.json({
                success: true,
                data: totals
            });
        } catch (error) {
            console.error('Error obteniendo totales de egresos:', error);
            
            logSecurityEvent('EXPENSES_TOTALS_ERROR', 'Error al obtener totales de egresos', {
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
     * Obtiene egresos agrupados por mes
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getExpensesByMonth(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                category_id: req.query.category_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            
            const expenses = await expensesService.getExpensesByMonth(filters);
            
            res.json({
                success: true,
                data: expenses
            });
        } catch (error) {
            console.error('Error obteniendo egresos por mes:', error);
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Obtiene egresos agrupados por categoría
     * @param {Object} req - Objeto de petición
     * @param {Object} res - Objeto de respuesta
     */
    async getExpensesByCategory(req, res) {
        try {
            // Extraer filtros de query params
            const filters = {
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            
            const expenses = await expensesService.getExpensesByCategory(filters);
            
            res.json({
                success: true,
                data: expenses
            });
        } catch (error) {
            console.error('Error obteniendo egresos por categoría:', error);
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default ExpensesController;