import express from 'express';
import { 
    processFeedback, 
    processPendingFeedbacks,
    getMessageOriginalContent
} from '../../controllers/chat/feedbackController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Ruta principal para recibir feedback
router.post('/', authenticateUser, processFeedback);

// Ruta para feedback anónimo (sin autenticación)
router.post('/anonymous', processFeedback);

// Ruta para procesar feedbacks pendientes (solo admin)
router.post('/process-pending', authenticateUser, isAdmin, processPendingFeedbacks);

router.get('/message/:chatId/:messageId/original-content', authenticateUser, getMessageOriginalContent);

export default router;