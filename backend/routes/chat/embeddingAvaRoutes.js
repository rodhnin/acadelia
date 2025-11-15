// routes/chat/embeddingAvaRoutes.js
import express from 'express';
import embeddingAvaController from '../../controllers/chat/embeddingAvaController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Configuración de Multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // Límite de 50 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

/**
 * @route POST /api/ava/:avaId/embeddings/upload
 * @desc Sube y procesa un PDF para un AVA específico
 * @access Private (Admin)
 */
router.post(
  '/:avaId/embeddings/upload',
  authenticateUser,
  isAdmin,
  upload.single('pdf'),
  embeddingAvaController.uploadPDF.bind(embeddingAvaController)
);

/**
 * @route GET /api/ava/:avaId/embeddings/files
 * @desc Lista los PDFs procesados para un AVA
 * @access Private (Admin)
 */
router.get(
  '/:avaId/embeddings/files',
  authenticateUser,
  isAdmin,
  embeddingAvaController.listPDFs.bind(embeddingAvaController)
);

/**
 * @route GET /api/ava/:avaId/embeddings/stats
 * @desc Obtiene estadísticas de los PDFs procesados para un AVA
 * @access Private (Admin)
 */
router.get(
  '/:avaId/embeddings/stats',
  authenticateUser,
  isAdmin,
  embeddingAvaController.getPDFStats.bind(embeddingAvaController)
);

/**
 * @route GET /api/ava/embeddings/process/:processId
 * @desc Obtiene el estado de procesamiento de un PDF
 * @access Private (Admin)
 */
router.get(
  '/embeddings/process/:processId',
  authenticateUser,
  isAdmin,
  embeddingAvaController.getProcessingStatus.bind(embeddingAvaController)
);

/**
 * @route DELETE /api/ava/:avaId/embeddings/:filename
 * @desc Elimina un PDF procesado
 * @access Private (Admin)
 */
router.delete(
  '/:avaId/embeddings/:filename',
  authenticateUser,
  isAdmin,
  embeddingAvaController.deletePDF.bind(embeddingAvaController)
);

/**
 * @route GET /api/ava/embeddings/queue
 * @desc Obtiene el estado de la cola de procesamiento
 * @access Private (Admin)
 */
router.get(
  '/embeddings/queue',
  authenticateUser,
  isAdmin,
  embeddingAvaController.getQueueStatus.bind(embeddingAvaController)
);

/**
 * @route DELETE /api/ava/:avaId/embeddings/page/:pageIdentifier
 * @desc Elimina una página específica de un embedding
 * @access Private (Admin)
 */
router.delete(
  '/:avaId/embeddings/page/:pageIdentifier',
  authenticateUser,
  isAdmin,
  embeddingAvaController.deleteEmbeddingPage.bind(embeddingAvaController)
);

export default router;