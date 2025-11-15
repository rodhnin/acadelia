import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import transferUpload from '../../middlewares/uploadMiddleware.js';  // ✅ USAR EL NUEVO
import {
  createUalaOrder,
  submitBankTransfer,
  handleUalaCallback,
  getUserPayments,
  getUserSubscriptions,
  getCarreraPrices,        // ✅ NUEVO
  getAllCarrerasWithPrices  // ✅ NUEVO
} from '../../controllers/pagos/argentinaPaymentController.js';
import {
  handleUalaWebhook,
  cleanupOldEvents
} from '../../controllers/pagos/argentinaWebhookController.js';

const router = express.Router();

// Rate limiters (TUS ORIGINALES)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de pago
  message: 'Demasiados intentos de pago, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 webhooks por minuto
  message: 'Demasiados webhooks',
  standardHeaders: true,
  legacyHeaders: false
});

// ===== RUTAS PÚBLICAS (SIN AUTENTICACIÓN) =====
router.get('/carreras/precios', getAllCarrerasWithPrices);

router.get('/carreras/:carreraId/precios', getCarreraPrices);

// Callbacks de Ualá (TUS ORIGINALES)
router.get('/uala/callback/success', handleUalaCallback);
router.get('/uala/callback/fail', handleUalaCallback);

// ===== RUTAS PROTEGIDAS (CON AUTENTICACIÓN) =====
router.post('/uala/create-order',
  authenticateUser,
  paymentLimiter,
  createUalaOrder
);

router.post('/bank-transfer/submit',
  authenticateUser,
  paymentLimiter,
  transferUpload.single('transferProof'),  // ✅ USAR EL NUEVO UPLOAD
  submitBankTransfer
);

// ===== NUEVAS RUTAS PARA FRONTEND =====
router.get('/user/payments', 
  authenticateUser,
  getUserPayments
);

router.get('/user/subscriptions', 
  authenticateUser,
  getUserSubscriptions
);

// ===== WEBHOOKS Y ADMIN =====
router.post('/webhook/uala',
  webhookLimiter,
  express.json(), // Hookdeck envía JSON
  handleUalaWebhook
);

router.post('/cleanup-webhooks',
  authenticateUser,
  async (req, res) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await cleanupOldEvents();
    res.json({ success: true });
  }
);

export default router;