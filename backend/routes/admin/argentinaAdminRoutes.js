// backend/routes/admin/argentinaAdminRoutes.js - ✅ TU ARCHIVO CON AGREGADOS MÍNIMOS
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

// ✅ MIDDLEWARE: Requiere autenticación + admin para todas las rutas
router.use(authenticateUser);
router.use(isAdmin);

// ===== 📊 ESTADÍSTICAS =====
router.get('/stats', getPaymentStats);

// ===== 💰 GESTIÓN DE PAGOS =====
// Obtener todos los pagos con filtros y paginación
router.get('/payments', getAllPayments);

// Obtener detalles de un pago específico
router.get('/payments/:paymentId', getPaymentDetails);

// ===== 📋 GESTIÓN DE SUSCRIPCIONES =====
// Obtener todas las suscripciones con filtros y paginación
router.get('/subscriptions', getAllSubscriptions);

// ✅ NUEVO: Actualizar estado de suscripción (pausar/reactivar/cancelar)
router.put('/subscriptions/:subscriptionId/status', updateSubscriptionStatus);

// ===== ✅ APROBACIÓN DE TRANSFERENCIAS =====
// Aprobar transferencia bancaria
router.post('/payments/:paymentId/approve', approveTransfer);

// Rechazar transferencia bancaria
router.post('/payments/:paymentId/reject', rejectTransfer);

// ===== 👥 GESTIÓN DE USUARIOS =====
// ✅ NUEVO: Buscar usuarios
router.get('/users/search', searchUsers);

// ✅ NUEVO: Obtener detalles de un usuario específico
router.get('/users/:userId', getUserDetails);

// ===== 🔄 GESTIÓN DE SUSCRIPCIONES VENCIDAS (ESPAÑOL) =====
// Ejecutar manualmente actualización de suscripciones vencidas
router.post('/suscripciones/actualizar-vencidas', actualizarSuscripcionesVencidas);

router.get('/job/estado', obtenerEstadoJob);                    // Ver estado del job
router.post('/job/detener', detenerJob);                        // Detener job (emergencia)
router.post('/job/reiniciar', reiniciarJob);                    // Reiniciar job
// Obtener estadísticas detalladas de suscripciones
router.get('/suscripciones/estadisticas', obtenerEstadisticasSuscripciones);

// ✅ AGREGAR ESTA RUTA:
// Consultar próximas expiraciones (opcional, para ver qué vence pronto)
router.get('/suscripciones/proximas-expiraciones', notificarProximasExpiraciones);

// Verificar estado de pg_cron
router.get('/sistema/verificar-pgcron', verificarEstadoPgCron);

export default router;