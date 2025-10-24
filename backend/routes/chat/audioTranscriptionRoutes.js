import express from 'express';
import { 
  processAudioFile, 
  processRecordedAudio, 
  isAudioFile 
} from '../../controllers/chat/audioTranscriptionController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import axios from 'axios';

const router = express.Router();

// TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN
// Esto protege el procesamiento de audio contra uso no autorizado

// Ruta para procesar archivo de audio subido
router.post('/process-audio-file', authenticateUser, processAudioFile);

// Ruta para procesar audio grabado (base64)
router.post('/process-recorded-audio', authenticateUser, processRecordedAudio);

// Ruta para verificar si un archivo es un tipo de audio válido
router.post('/check-audio-file', authenticateUser, (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({
      success: false,
      error: "Se requiere el nombre del archivo para verificar"
    });
  }
  
  res.json({
    success: true,
    isAudioFile: isAudioFile(filename)
  });
});

// Nueva ruta: verificar estado del procesamiento de audio directamente
// Similar al endpoint de YouTube pero específico para audio
router.get('/check-audio-processing/:chatId', authenticateUser, async (req, res) => {
  const { chatId } = req.params;
  
  // Redirigir a la ruta existente en videoTranscriptionRoutes
  try {
    // Usar axios para llamar al endpoint existente
    const apiUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/transcription/chat/${chatId}/audio-processing-status`;
    const response = await axios.get(apiUrl);
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Error al verificar estado de procesamiento de audio"
    });
  }
});

export default router;