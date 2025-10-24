// routes/usuarios/PaisesUniRoutes.js - Versión mejorada

import express from "express";
import { 
    getAllPaises, 
    getUniversidadesByPais,
    getPaisById,
    getUniversidadById,
    getUsersByPais,
    getUsersByUniversidad,
    getUniversidadesWithUserCount
} from "../../controllers/usuarios/paisesUniControllers.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";
import { isAdmin } from "../../middlewares/adminMiddleware.js";

const router = express.Router();

// Rutas públicas (información general)
router.get("/paises", getAllPaises);
router.get("/paises/:idPais", getPaisById);
router.get("/paises/:idPais/universidades", getUniversidadesByPais);
router.get("/universidades/:idUniversidad", getUniversidadById);
router.get("/universidades/with-users/count", getUniversidadesWithUserCount);

// CORRECCIÓN CRÍTICA: Rutas que exponen datos de usuarios ahora requieren autenticación de admin
// Estas rutas pueden exponer información personal y deben estar protegidas

// Rutas para obtener usuarios por país/universidad (SOLO ADMIN)
router.get("/paises/:idPais/usuarios", 
  authenticateUser, 
  isAdmin, 
  getUsersByPais
);

router.get("/universidades/:idUniversidad/usuarios", 
  authenticateUser, 
  isAdmin, 
  getUsersByUniversidad
);

export default router;