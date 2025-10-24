// middlewares/uploadMiddleware.js - MANTENER TODO LO ORIGINAL + AGREGAR PARA ARGENTINA
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Asegúrate de que el directorio de subidas existe
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===== TU CONFIGURACIÓN ORIGINAL (MANTENER) =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'invoice-' + uniqueSuffix + extension);
  }
});

// Filtrar solo archivos PDF (TU ORIGINAL)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

// Configurar límites (TU ORIGINAL)
const limits = {
  fileSize: 5 * 1024 * 1024, // Limitar a 5MB
};

// Exportar el middleware configurado (TU ORIGINAL)
export const uploadInvoice = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
}).single('invoice'); // 'invoice' es el nombre del campo en el formulario

// Middleware para manejar errores de multer (TU ORIGINAL)
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. El límite es 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error en la subida: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// ===== SOLO AGREGAR ESTO PARA ARGENTINA (SIN TOCAR LO DE ARRIBA) =====

// Storage específico para comprobantes de transferencia argentina
const transferStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'transfer-proof-' + uniqueSuffix + extension);
  }
});

// Filter para transferencias (imágenes + PDF)
const transferFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF, JPG o PNG'), false);
  }
};

// Multer específico para transferencias argentina
const transferUpload = multer({
  storage: transferStorage,
  fileFilter: transferFileFilter,
  limits: limits, // Usar los mismos límites
});

// Export por defecto para transferencias (para las rutas de argentina)
export default transferUpload;