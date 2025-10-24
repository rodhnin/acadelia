import express from 'express';
import multer from 'multer';
import { 
  uploadPDF, 
  servePDFFile,
  deletePDF, 
  extractPDFText, 
  extractPDFContent, 
  listChatPDFs, 
  previewPDFImage,
  extractTextSelection,
  clearCache,
  cancelPDFProcessing,         // Nuevo controlador
  getPDFProcessingStatus,
  clearExtractionCache   // Nuevo controlador
} from '../../controllers/chat/fileController.js';
import { validatePDFSecurity } from '../../middlewares/pdfSecurityMiddleware.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Configuración de Multer para procesar los archivos subidos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // Límite de 50 MB
  },
  fileFilter: (req, file, cb) => {
    // Verificación básica del tipo MIME
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'), false);
    }
    cb(null, true);
  }
});

// TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN
// Esto protege la subida y procesamiento de archivos contra uso no autorizado

// Ruta para subir un PDF
router.post('/upload', authenticateUser, upload.single('pdf'), validatePDFSecurity, uploadPDF);

// Ruta para eliminar un PDF
router.delete('/delete/:chatId', authenticateUser, deletePDF);

// Ruta para servir el archivo PDF completo
router.get('/serve/:chatId', authenticateUser, servePDFFile);

// Ruta para extraer texto del PDF
router.get('/extract-text/:chatId', authenticateUser, extractPDFText);

// Ruta para extraer contenido completo del PDF (texto, imágenes, fórmulas, tablas)
router.get('/extract-content/:chatId', authenticateUser, extractPDFContent);

// Ruta para listar todos los PDFs de un chat
router.get('/list/:chatId', authenticateUser, listChatPDFs);

// Ruta para obtener vista previa de imágenes
router.get('/preview/:chatId', authenticateUser, previewPDFImage);

// Ruta para extraer texto de una selección específica
router.get('/extract-text-selection/:chatId', authenticateUser, extractTextSelection);

// Ruta para limpiar caché
router.get('/clear-cache/:chatId', authenticateUser, clearCache);

router.get('/clear-extraction-cache/:chatId', authenticateUser, clearExtractionCache);

// NUEVAS RUTAS PARA CANCELACIÓN Y ESTADO

// Ruta para cancelar un procesamiento en curso
router.post('/cancel/:chatId', authenticateUser, cancelPDFProcessing);

// Ruta para obtener el estado actual del procesamiento
router.get('/status/:chatId', authenticateUser, getPDFProcessingStatus);

export default router;