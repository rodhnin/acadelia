
import express from "express";
import { AccessStatusController } from "../../controllers/shared/accessStatusController.js";
import { authenticateUser } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * =========================================================================
 * RUTAS DE ACCESO CONSOLIDADAS - ESTRUCTURA ÚNICA
 * =========================================================================
 * 
 * CONSOLIDADO: Combina accessStatusRoutes + accessRoutes
 * SIMPLIFICADO: Solo endpoints únicos y necesarios
 * CORREGIDO: Usa solo AccessValidationService vía AccessStatusController
 * =========================================================================
 */


/**
 * GET /api/access/status/:userId
 * Obtiene el estado completo de acceso del usuario
 * CONSOLIDADO: Reemplaza user-summary, quick-check, premium-status
 */
router.get("/status/:userId", 
  authenticateUser, 
  AccessStatusController.getUserAccessStatus
);

/**
 * GET /api/access/usage-stats/:userId
 * Obtener estadísticas de uso del usuario
 */
router.get("/usage-stats/:userId", 
  authenticateUser,
  AccessStatusController.getUserUsageStats
);

/**
 * GET /api/access/resources/:userId
 * Obtiene lista detallada de todos los recursos accesibles para el usuario
 * CONSOLIDADO: Reemplaza accessible-avas + incluye herramientas
 */
router.get("/resources/:userId", 
  authenticateUser, 
  AccessStatusController.getAccessibleResources
);

/**
 * GET /api/access/recommendations/:userId
 * Obtiene recomendaciones de upgrade basadas en el uso actual del usuario
 */
router.get("/recommendations/:userId", 
  authenticateUser, 
  AccessStatusController.getUpgradeRecommendations
);


/**
 * GET /api/access/ava-access/:userId/:avaId
 * Verificar acceso específico a un AVA
 * CONSOLIDADO: Reemplaza validate-access + check con resourceType 'ava'
 */
router.get("/ava-access/:userId/:avaId", 
  authenticateUser,
  AccessStatusController.checkAvaAccess
);

/**
 * GET /api/access/tool-access/:userId
 * Verificar acceso y límites de herramientas
 * CONSOLIDADO: Reemplaza validate-access + check con resourceType 'tool'
 */
router.get("/tool-access/:userId", 
  authenticateUser,
  AccessStatusController.checkToolAccess
);

/**
 * GET /api/access/career-access/:userId/:careerId
 * Verificar acceso a una carrera específica
 * CONSOLIDADO: Movido desde /api/acceso/check-access
 */
router.get("/career-access/:userId/:careerId", 
  authenticateUser,
  AccessStatusController.checkCareerAccess
);


/**
 * GET /api/access/careers/:userId
 * Obtener todas las carreras accesibles para un usuario
 * CONSOLIDADO: Movido desde /api/acceso/accessible-careers
 */
router.get("/careers/:userId", 
  authenticateUser,
  AccessStatusController.getAccessibleCareers
);


/**
 * DEPRECATED ROUTES - Temporal compatibility
 * Estas rutas serán eliminadas en versiones futuras
 */

/**
 * GET /api/access/user/:userId
 * DEPRECATED: Redirige a /status/:userId
 */
router.get("/user/:userId", 
  authenticateUser, 
  (req, res) => {
    res.redirect(301, `/api/access/status/${req.params.userId}`);
  }
);

/**
 * GET /api/access/user-summary/:userId
 * DEPRECATED: Redirige a /status/:userId
 */
router.get("/user-summary/:userId", 
  authenticateUser, 
  (req, res) => {
    res.redirect(301, `/api/access/status/${req.params.userId}`);
  }
);

/**
 * GET /api/access/quick-check/:userId
 * DEPRECATED: Redirige a /status/:userId
 */
router.get("/quick-check/:userId", 
  authenticateUser, 
  (req, res) => {
    res.redirect(301, `/api/access/status/${req.params.userId}`);
  }
);


/**
 * GET /api/access/
 * Información sobre endpoints disponibles
 */
router.get("/", (req, res) => {
  res.json({
    version: "2.0",
    description: "API de Control de Acceso Consolidada",
    endpoints: {
      status: "GET /api/access/status/:userId - Estado completo de acceso",
      usage: "GET /api/access/usage-stats/:userId - Estadísticas de uso",
      resources: "GET /api/access/resources/:userId - Recursos accesibles",
      recommendations: "GET /api/access/recommendations/:userId - Recomendaciones upgrade",
      avaAccess: "GET /api/access/ava-access/:userId/:avaId - Acceso específico AVA",
      toolAccess: "GET /api/access/tool-access/:userId - Acceso herramientas",
      careerAccess: "GET /api/access/career-access/:userId/:careerId - Acceso carrera",
      careers: "GET /api/access/careers/:userId - Carreras accesibles"
    },
    deprecated: {
      note: "Endpoints deprecated serán eliminados en v3.0",
      endpoints: [
        "GET /api/access/user/:userId",
        "GET /api/access/user-summary/:userId", 
        "GET /api/access/quick-check/:userId"
      ]
    },
    migration: {
      "user-summary": "Usar /api/access/status/:userId",
      "quick-check": "Usar /api/access/status/:userId",
      "accessible-avas": "Usar /api/access/resources/:userId",
      "premium-status": "Usar /api/access/status/:userId"
    }
  });
});

export default router;