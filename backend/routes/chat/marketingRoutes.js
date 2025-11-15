// marketingRoutes.js - ACTUALIZADO CON RUTAS DE NOTIFICACIONES POR SECCIÓN - ORDEN CORREGIDO
import express from 'express';
import { 
  queryMarketing, 
  queryMarketingStream,
  explainQueryController,
  visualizeDecisionController,
  // IMPORTACIONES PARA NOTIFICACIONES
  getNotifications,
  getNotificationCounts,
  clearNotifications,
  clearSectionNotifications,
  markSectionAsViewed,
  profileController, 
  contentController, 
  matchingController,
  simulationController,
  trendController,
  summaryController,
  memoryController
} from '../../controllers/chat/marketingController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas para chat de marketing
router.post('/query', authenticateUser, queryMarketing);
router.post('/query-stream', authenticateUser, queryMarketingStream);

// RUTAS PARA NOTIFICACIONES
router.get('/notifications', authenticateUser, getNotifications);
router.get('/notifications/counts', authenticateUser, getNotificationCounts);
router.post('/notifications/clear', authenticateUser, clearNotifications);

router.post('/notifications/clear/:section', authenticateUser, clearSectionNotifications);
router.post('/notifications/mark-viewed/:section', authenticateUser, markSectionAsViewed);

// Rutas para explicabilidad
router.post('/explain', authenticateUser, explainQueryController);
router.post('/visualize', authenticateUser, visualizeDecisionController);

// IMPORTANTE: Las rutas específicas (como 'all') DEBEN ir ANTES que las rutas con parámetros (:id)
router.delete('/profiles/all', authenticateUser, profileController.deleteAllProfiles);
router.post('/profiles', authenticateUser, profileController.createProfile);
router.get('/profiles', authenticateUser, profileController.getProfiles);
router.put('/profiles/:id', authenticateUser, profileController.updateProfile);
router.delete('/profiles/:id', authenticateUser, profileController.deleteProfile);

router.delete('/contents/all', authenticateUser, contentController.deleteAllContents);
router.post('/contents', authenticateUser, contentController.createContent);
router.get('/contents', authenticateUser, contentController.getContents);
router.post('/generate-content', authenticateUser, contentController.generateContent);
router.delete('/contents/:id', authenticateUser, contentController.deleteContent);

// Rutas para matching
router.get('/match/profile/:profileId/contents', authenticateUser, matchingController.matchProfileToContent);
router.get('/match/content/:contentId/profiles', authenticateUser, matchingController.matchContentToProfiles);
router.post('/interactions', authenticateUser, matchingController.recordInteraction);

// Rutas para simulación
router.post('/simulate', authenticateUser, simulationController.simulateCampaign);

router.delete('/trends/all', authenticateUser, trendController.deleteAllTrends);
router.get('/trends', authenticateUser, trendController.getTrends);
router.post('/trends', authenticateUser, trendController.saveTrend);
router.delete('/trends/:id', authenticateUser, trendController.deleteTrend);

// Rutas para resumen
router.get('/summary', authenticateUser, summaryController.getMarketingSummary);

router.delete('/memory/reset-all', authenticateUser, memoryController.resetAllMemory);
router.get('/memory', authenticateUser, memoryController.getMemoryInsights);
router.get('/memory/stats', authenticateUser, memoryController.getMemoryStats);
router.post('/memory/search', authenticateUser, memoryController.searchMemory);
router.get('/memory/:id', authenticateUser, memoryController.getMemoryInsight);
router.put('/memory/:id', authenticateUser, memoryController.updateMemoryInsight);
router.delete('/memory/:id', authenticateUser, memoryController.deleteMemoryInsight);

export default router;