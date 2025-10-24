// routes/api/activityMenteLogRoutes.js
import express from "express";
import activityMenteLogService from "../../services/security/activityMenteLogService.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";
import { isAdmin } from "../../middlewares/adminMiddleware.js";

const router = express.Router();

/**
 * @route GET /api/activity
 * @desc Obtiene las actividades más recientes
 * @access Private (Admin)
 */
router.get("/", authenticateUser, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await activityMenteLogService.getRecentActivities(limit);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      activities: result.activities
    });
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener actividades",
      details: error.message
    });
  }
});

/**
 * @route POST /api/activity/log
 * @desc Registra una nueva actividad
 * @access Public (pero con token opcional)
 */
router.post("/log", async (req, res) => {
  try {
    const {
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      id_usuario,
      usuario_nombre
    } = req.body;

    // Validación básica
    if (!action_type || !entity_type || !entity_id) {
      return res.status(400).json({
        success: false,
        error: "Se requieren action_type, entity_type y entity_id"
      });
    }

    // Usar ID de usuario de la sesión como fallback si no se proporciona en el cuerpo
    const userId = id_usuario || req.user?.id_user || null;
    
    // Usar nombre de usuario de la sesión como fallback si no se proporciona
    let userName = usuario_nombre;
    if (!userName && req.user?.id_user) {
      // Intentar obtener el nombre del usuario desde la BD
      try {
        userName = await activityMenteLogService.getUserName(req.user.id_user);
      } catch (error) {
        console.warn("No se pudo obtener el nombre del usuario:", error);
      }
    }
    
    // Si no hay nombre de usuario, usar un valor predeterminado
    if (!userName) {
      userName = "Sistema";
    }

    // Registrar la actividad
    const result = await activityMenteLogService.logActivity({
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      id_usuario: userId,
      usuario_nombre: userName
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      activity: result.activity
    });
  } catch (error) {
    console.error("Error al registrar actividad:", error);
    res.status(500).json({
      success: false,
      error: "Error al registrar actividad",
      details: error.message
    });
  }
});

export default router;