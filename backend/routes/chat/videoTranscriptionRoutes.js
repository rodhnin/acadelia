// backend/routes/chat/videoTranscriptionRoutes.js
import express from 'express';
import { 
  checkChatHasTranscription,
  checkChatHasVideo, 
  checkChatHasAudio,
  getVideoData, 
  getAudioData,
  getVideoTimestamps,
  getAudioTimestamps,
  checkYouTubeProcessingStatus,
  checkAudioProcessingStatus,
  getAudioProcessingProgress,
  getYouTubeProcessingProgress
} from '../../controllers/chat/videoTranscriptionController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN
// Esto protege el acceso a datos de transcripciones y chats de usuarios

// Rutas para transcripciones generales
router.get('/chat/:chatId/has-transcription', authenticateUser, checkChatHasTranscription);

// Rutas para video
router.get('/chat/:chatId/has-video', authenticateUser, checkChatHasVideo);
router.get('/chat/:chatId/video-data', authenticateUser, getVideoData);
router.get('/chat/:chatId/video-timestamps', authenticateUser, getVideoTimestamps);
router.get('/chat/:chatId/video-processing-status', authenticateUser, checkYouTubeProcessingStatus);
router.get('/chat/:chatId/audio-progress', authenticateUser, getAudioProcessingProgress);

// Rutas para audio
router.get('/chat/:chatId/has-audio', authenticateUser, checkChatHasAudio);
router.get('/chat/:chatId/audio-data', authenticateUser, getAudioData);
router.get('/chat/:chatId/audio-timestamps', authenticateUser, getAudioTimestamps);
router.get('/chat/:chatId/audio-processing-status', authenticateUser, checkAudioProcessingStatus);
router.get('/chat/:chatId/youtube-progress', authenticateUser, getYouTubeProcessingProgress);

// Para mantener compatibilidad con el código existente
router.get('/chat/:chatId/timestamps', authenticateUser, getVideoTimestamps); // Mantener para compatibilidad
router.get('/chat/:chatId/processing-status', authenticateUser, checkYouTubeProcessingStatus); // Mantener para compatibilidad

export default router;