// Routes/usuarios/perfilRoutes.js - Sin cambios necesarios

import express from "express";
import { 
    createPerfil,
    getPerfiles, 
    getAllPerfiles, 
    updatePerfil, 
    deletePerfil,
    getRoles,
    getPerfilWithUniversity,
    getPerfilDetailsByUserId
} from "../../controllers/usuarios/perfilController.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Rutas públicas o con autenticación opcional
router.get("/roles", getRoles);

// Rutas que requieren autenticación
router.use(authenticateUser); // Aplica autenticación a todas las rutas siguientes

// Rutas para perfiles
router.post("/", createPerfil);
router.get("/detail/:id_usuario", getPerfilDetailsByUserId); // Nueva ruta para obtener detalles completos
router.get("/with-university/:id_usuario?", getPerfilWithUniversity); // Nueva ruta para obtener perfil con universidad
router.get("/:id_usuario?", getPerfiles);
router.get("/", getAllPerfiles);
router.put("/:id", updatePerfil);
router.delete("/:id", deletePerfil);

export default router;