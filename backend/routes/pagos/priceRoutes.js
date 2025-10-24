// backend/routes/pagos/priceRoutes.js
import express from 'express';
import * as priceController from '../../controllers/pagos/priceController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Rutas públicas (información de precios)
router.get('/', priceController.getAllCourses);
router.get('/:id', priceController.getCourseById);

// CORRECCIÓN: Clear cache ahora requiere autenticación de admin
// Esta operación puede afectar el rendimiento del sistema
router.post('/clear-cache', authenticateUser, isAdmin, priceController.clearCache);

export default router;