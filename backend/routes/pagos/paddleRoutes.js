// routes/payment/paddleRoutes.js
import express from 'express';
import { PaddleController } from '../../controllers/pagos/paddleController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Ruta existente para manejar cambios de estado
router.post(
    '/:action(resume|cancel|delete)',
    authenticateUser,
    PaddleController.handleStatusChange
);

// Nueva ruta para obtener facturas
router.get(
    '/invoice/:transactionId',
    authenticateUser,
    PaddleController.getInvoice
);

// Nueva ruta para obtener URL del portal del cliente
router.get(
    '/portal/:transactionId',
    authenticateUser,
    PaddleController.getPortalUrl
);

export default router;