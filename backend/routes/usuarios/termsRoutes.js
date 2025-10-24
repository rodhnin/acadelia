// backend/routes/usuarios/termsRoutes.js
import express from 'express';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { checkTermsAcceptance, acceptTerms, updateTermsAndNotify } from '../../controllers/usuarios/termsController.js';

const router = express.Router();

// Rutas públicas
router.get('/aceptar', acceptTerms); // Para aceptar vía email (con token)

// Rutas autenticadas
router.get('/verificar', authenticateUser, checkTermsAcceptance);
router.post('/aceptar', authenticateUser, acceptTerms); // Para aceptar desde la web

// Rutas de admin
router.post('/actualizar', authenticateUser, updateTermsAndNotify);

export default router;