import express from "express";
import { 
  createAva, 
  getAllAvas, 
  getAvasByCarrera, 
  updateAva, 
  deleteAva,
  clearAvaCache,
  getCacheStats
} from "../../controllers/chat/avaController.js";
import upload from "../../middlewares/fileUpload.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";
import { isAdmin } from "../../middlewares/adminMiddleware.js";

const avaRouter = express.Router();

// Middleware para procesar la imagen y añadir la ruta al body
function handleImageUpload(req, res, next) {
  if (req.file) {
    req.body.imagen = `/uploads/avas/${req.file.filename}`;
  }
  next();
}

// Las operaciones de creación, actualización y eliminación requieren autenticación y rol de administrador
avaRouter.post("/", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, createAva);
avaRouter.get("/", getAllAvas); // Esta ruta permanece pública
avaRouter.get("/carrera/:id_carrera", getAvasByCarrera); // Esta ruta permanece pública
avaRouter.put("/:id", authenticateUser, isAdmin, upload.single('imagen'), handleImageUpload, updateAva);
avaRouter.delete("/:id", authenticateUser, isAdmin, deleteAva);

// Rutas para gestionar el cache de AVAs (solo administradores)
avaRouter.post("/cache/clear", authenticateUser, isAdmin, clearAvaCache);
avaRouter.get("/cache/stats", authenticateUser, isAdmin, getCacheStats);

export default avaRouter;