import express from "express";
import * as carreraController from "../../controllers/chat/carreraController.js";
import upload from "../../middlewares/fileUpload.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";
import { isAdmin } from "../../middlewares/adminMiddleware.js";

const router = express.Router();

// Middleware para procesar la imagen y añadir la ruta al body
function handleImageUpload(req, res, next) {
  if (req.file) {
    req.body.imagen = `/uploads/carreras/${req.file.filename}`;
  }
  next();
}

// Rutas para carrera
// Las operaciones de creación, actualización y eliminación requieren autenticación y rol de administrador
router.post("/carrera", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, carreraController.create);
router.get("/carrera", carreraController.getAll); // Esta ruta permanece pública
router.get("/carrera/:id_carrera", carreraController.getById); // Esta ruta permanece pública
router.put("/carrera/:id_carrera", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, carreraController.update);
router.delete("/carrera/:id_carrera", authenticateUser, isAdmin, carreraController.remove);

export default router;