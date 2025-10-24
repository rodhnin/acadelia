import express from 'express';
import { sendContactEmail } from '../../controllers/shared/contactController.js';

const router = express.Router();

// Ruta para enviar email de contacto
router.post('/send', sendContactEmail);

export default router;