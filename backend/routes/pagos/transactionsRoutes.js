// routes/pagos/transactionsRoutes.js
import express from 'express';
import { TransactionsController } from '../../controllers/pagos/transactionsController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Ruta para obtener todas las transacciones (solo admin)
router.get('/transactions', 
    authenticateUser, 
    isAdmin, 
    TransactionsController.getAllTransactions
);

// Ruta para obtener una transacción específica
router.get('/transaction/:id', 
    authenticateUser, 
    TransactionsController.getTransactionById
);

// Ruta para obtener analíticas de transacciones (solo admin)
router.get('/transactions/analytics', 
    authenticateUser, 
    isAdmin, 
    TransactionsController.getAnalytics
);

// Ruta para obtener métodos de pago
router.get('/transactions/payment-methods', 
    authenticateUser, 
    isAdmin, 
    TransactionsController.getPaymentMethods
);

// Ruta para obtener divisas
router.get('/transactions/currencies', 
    authenticateUser, 
    isAdmin, 
    TransactionsController.getCurrencies
);

// Ruta para obtener la factura de una transacción (accesible para propietario y admin)
router.get('/transaction/:id/invoice', 
    authenticateUser, 
    TransactionsController.getTransactionInvoice
);

export default router;