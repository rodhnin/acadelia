import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Verifica si existe la carpeta uploads, si no la crea
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Subcarpeta según tipo de entidad
    let entityFolder = '';
    if (req.baseUrl.includes('carrera')) {
      entityFolder = 'carreras';
    } else if (req.baseUrl.includes('ava')) {
      entityFolder = 'avas';
    } else if (req.baseUrl.includes('herramienta')) {
      entityFolder = 'herramientas';
    } else {
      entityFolder = 'otros';
    }
    
    const entityDir = path.join(uploadDir, entityFolder);
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }
    
    cb(null, entityDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default upload;