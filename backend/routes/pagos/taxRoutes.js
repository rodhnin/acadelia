// routes/pagos/taxRoutes.js
import express from 'express';
import { TaxController } from '../../controllers/pagos/taxController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// Ruta para obtener resumen de impuestos (solo admin)
router.get('/taxes/summary', 
    authenticateUser, 
    isAdmin, 
    TaxController.getTaxSummary
);

// Ruta para obtener impuestos por país (solo admin)
router.get('/taxes/by-country', 
    authenticateUser, 
    isAdmin, 
    TaxController.getTaxesByCountry
);

// Ruta para generar informe de impuestos (solo admin)
router.post('/taxes/reports', 
    authenticateUser, 
    isAdmin, 
    TaxController.generateTaxReport
);

// Ruta para obtener análisis histórico de impuestos (solo admin)
router.get('/taxes/historical', 
    authenticateUser, 
    isAdmin, 
    TaxController.getHistoricalTaxAnalysis
);

export default router;