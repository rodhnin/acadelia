import express from 'express';
import { processYouTubeURL, isYouTubeURL } from '../../controllers/chat/youtubeAudioController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN
// Esto protege el procesamiento costoso de YouTube contra uso no autorizado

// Ruta para procesar URL de YouTube
router.post('/process-youtube', authenticateUser, processYouTubeURL);

// Ruta para verificar si un texto es una URL de YouTube válida
router.post('/check-youtube-url', authenticateUser, (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Se requiere URL para verificar"
    });
  }
  
  res.json({
    success: true,
    isYouTubeURL: isYouTubeURL(url)
  });
});

export default router;