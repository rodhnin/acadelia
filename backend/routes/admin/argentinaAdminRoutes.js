import express from 'express';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';
import {
  getAllPayments,
  getAllSubscriptions,
  approveTransfer,
  rejectTransfer,
  getPaymentStats,
  getPaymentDetails,
  searchUsers,
  getUserDetails,
  updateSubscriptionStatus,
  actualizarSuscripcionesVencidas,
  obtenerEstadisticasSuscripciones,
  verificarEstadoPgCron,
  notificarProximasExpiraciones,
  obtenerEstadoJob,
  detenerJob,
  reiniciarJob
} from '../../controllers/pagos/argentinaAdminController.js';

const router = express.Router();

router.use(authenticateUser);
router.use(isAdmin);

router.get('/stats', getPaymentStats);

router.get('/payments', getAllPayments);

router.get('/payments/:paymentId', getPaymentDetails);

router.get('/subscriptions', getAllSubscriptions);

router.put('/subscriptions/:subscriptionId/status', updateSubscriptionStatus);

// Aprobar transferencia bancaria
router.post('/payments/:paymentId/approve', approveTransfer);

router.post('/payments/:paymentId/reject', rejectTransfer);

router.get('/users/search', searchUsers);

router.get('/users/:userId', getUserDetails);

router.post('/suscripciones/actualizar-vencidas', actualizarSuscripcionesVencidas);

router.get('/job/estado', obtenerEstadoJob);                    // Ver estado del job
router.post('/job/detener', detenerJob);                        // Detener job (emergencia)
router.post('/job/reiniciar', reiniciarJob);                    // Reiniciar job
router.get('/suscripciones/estadisticas', obtenerEstadisticasSuscripciones);

// Consultar próximas expiraciones (opcional, para ver qué vence pronto)
router.get('/suscripciones/proximas-expiraciones', notificarProximasExpiraciones);

router.get('/sistema/verificar-pgcron', verificarEstadoPgCron);

export default router;