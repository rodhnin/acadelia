import express from "express";
import { getTransactions } from "../../controllers/usuarios/transactionController.js";
import { getSubscriptions } from "../../controllers/usuarios/suscriptionController.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// CORRECCIÓN CRÍTICA: Middleware ANTES del controlador
// El middleware debe ejecutarse ANTES de la función del controlador

// Ruta para obtener todas las transacciones de un usuario
router.get("/user/transactions/:userId", 
  authenticateUser, 
  getTransactions
);

// Ruta para obtener las suscripciones de un usuario
router.get("/user/subscriptions/:userId", 
  authenticateUser, 
  getSubscriptions
);

export default router;