// routes/pagos/subscriptionsRoutes.js
import express from 'express';
import { SubscriptionsController } from '../../controllers/pagos/subscriptionsController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Ruta para obtener todas las suscripciones (solo admin)
router.get('/subscriptions', 
    authenticateUser, 
    isAdmin, 
    SubscriptionsController.getAllSubscriptions
);


// Ruta para obtener estadísticas de suscripciones (solo admin)
router.get('/subscriptions/stats', 
    authenticateUser, 
    isAdmin, 
    SubscriptionsController.getSubscriptionStats
);


// Ruta para obtener las suscripciones de un usuario específico
router.get('/subscriptions/:userId', 
    authenticateUser, 
    SubscriptionsController.getUserSubscriptions
);

// Ruta para obtener una suscripción específica
router.get('/subscription/:id', 
    authenticateUser, 
    SubscriptionsController.getSubscriptionById
);

// Ruta para actualizar el estado de una suscripción (solo admin)
router.put('/subscription/:id/status', 
    authenticateUser, 
    isAdmin, 
    SubscriptionsController.updateSubscriptionStatus
);

export default router;