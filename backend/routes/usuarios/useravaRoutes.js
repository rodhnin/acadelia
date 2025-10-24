import express from 'express';
import useravaController from "../../controllers/usuarios/useravaController.js";
import userCarreraController from "../../controllers/usuarios/userCarreraController.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// CORRECCIÓN CRÍTICA: Middleware ANTES del controlador
// El middleware debe ejecutarse ANTES de la función del controlador

// Obtener AVAs activos de un usuario
router.get("/users/avas/:idUser", 
  authenticateUser, 
  useravaController.getActiveUserAvas
);

// Obtener carreras disponibles para un usuario
router.get("/carrera/available/:idUser", 
  authenticateUser, 
  userCarreraController.getAvailableCarreras
);

// Obtener carreras activas de un usuario
router.get("/carrera/active/:idUser", 
  authenticateUser, 
  userCarreraController.getActiveCarreras
);

export default router;