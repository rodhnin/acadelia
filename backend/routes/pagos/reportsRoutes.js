// routes/pagos/reportsRoutes.js
import express from 'express';
import { ReportsController } from '../../controllers/pagos/reportsController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Ruta para generar un informe (solo admin)
router.post('/reports/generate', 
    authenticateUser, 
    isAdmin, 
    ReportsController.generateReport
);

// Ruta para obtener lista de informes (solo admin)
router.get('/reports/list', 
    authenticateUser, 
    isAdmin, 
    ReportsController.getReportsList
);

// NUEVAS RUTAS PARA INFORMES INTEGRALES

// Ruta para generar un informe integral manualmente (solo admin)
router.post('/reports/integral', 
    authenticateUser, 
    isAdmin, 
    ReportsController.generateIntegralReport
);

// Ruta para configurar la generación automática de informes (solo admin)
router.post('/reports/automatic-config', 
    authenticateUser, 
    isAdmin, 
    ReportsController.configureAutomaticReports
);

// Ruta para obtener la configuración de informes automáticos (solo admin)
router.get('/reports/automatic-config', 
    authenticateUser, 
    isAdmin, 
    ReportsController.getAutomaticReportsConfig
);

// Estas rutas con parámetros dinámicos deben ir DESPUÉS de todas las rutas específicas
// Ruta para obtener un informe específico (solo admin)
router.get('/reports/:id', 
    authenticateUser, 
    isAdmin, 
    ReportsController.getReportById
);

// Ruta para descargar un informe (solo admin)
router.get('/reports/:id/download', 
    authenticateUser, 
    isAdmin, 
    ReportsController.downloadReport
);

// Ruta para eliminar un informe (solo admin)
router.delete('/reports/:id', 
    authenticateUser, 
    isAdmin, 
    ReportsController.deleteReport
);

export default router;