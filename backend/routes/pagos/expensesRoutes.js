// routes/pagos/expensesRoutes.js
import express from 'express';
import { ExpensesController } from '../../controllers/pagos/expensesController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';
import { uploadInvoice, handleUploadErrors } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();

// IMPORTANTE: Primero van todas las rutas específicas

// Ruta para crear un nuevo egreso (solo admin)
router.post('/expenses', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.createExpense
);

// Ruta para obtener todos los egresos (solo admin)
router.get('/expenses', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getAllExpenses
);

// Rutas específicas (deben ir ANTES de los parámetros dinámicos)
router.get('/expenses/categories', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getExpenseCategories
);

router.post('/expenses/categories', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.createExpenseCategory
);

router.get('/expenses/totals', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getExpensesTotals
);

router.get('/expenses/by-month', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getExpensesByMonth
);

router.get('/expenses/by-category', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getExpensesByCategory
);

// DESPUÉS van las rutas con parámetros dinámicos (:id)

// Ruta para obtener un egreso específico (solo admin)
router.get('/expenses/:id', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.getExpenseById
);

// Ruta para actualizar un egreso (solo admin)
router.put('/expenses/:id', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.updateExpense
);

// Ruta para subir factura para un egreso específico
router.post('/expenses/:id/invoice', 
    authenticateUser, 
    isAdmin, 
    (req, res, next) => {
        uploadInvoice(req, res, (err) => {
            if (err) {
                return handleUploadErrors(err, req, res, next);
            }
            next();
        });
    },
    ExpensesController.uploadInvoice
);

// Ruta para crear un nuevo egreso con factura (solo admin)
router.post('/expenses/with-invoice', 
    authenticateUser, 
    isAdmin,
    (req, res, next) => {
        uploadInvoice(req, res, (err) => {
            if (err) {
                return handleUploadErrors(err, req, res, next);
            }
            next();
        });
    },
    ExpensesController.createExpenseWithInvoice
);

// Ruta para eliminar un egreso (solo admin)
router.delete('/expenses/:id', 
    authenticateUser, 
    isAdmin, 
    ExpensesController.deleteExpense
);

export default router;