import express from 'express';
import { 
  obtenerTodasLasHerramientas,
  crearNuevaHerramienta,
  obtenerHerramientaById,
  actualizarHerramientaById,
  eliminarHerramientaById
} from "../../controllers/chat/herramientaController.js";
import upload from "../../middlewares/fileUpload.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";
import { isAdmin } from "../../middlewares/adminMiddleware.js";

const router = express.Router();

// Middleware para procesar la imagen y añadir la ruta al body
function handleImageUpload(req, res, next) {
  if (req.file) {
    // Crear la ruta relativa para guardar en la base de datos
    req.body.imagen = `/uploads/herramientas/${req.file.filename}`;
  }
  next();
}

// Rutas para herramientas
// Las operaciones de creación, actualización y eliminación requieren autenticación y rol de administrador
router.get("/", obtenerTodasLasHerramientas); // Esta ruta permanece pública
router.post("/", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, crearNuevaHerramienta);
router.get("/:id", obtenerHerramientaById); // Esta ruta permanece pública
router.put("/:id", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, actualizarHerramientaById);
router.delete("/:id", authenticateUser, isAdmin, eliminarHerramientaById);

export default router;