import express from 'express';
import { 
  getConsent, 
  saveConsent, 
  getConsentHistory, 
  revokeConsent, 
  checkCookieConsentStatus,
  linkAnonymousConsent
} from '../../controllers/usuarios/cookieConsentController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware para autenticación opcional (no obliga a estar autenticado)
const optionalAuth = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  // Si no hay token, continuar sin autenticación
  if (!token) {
    return next();
  }
  
  // Si hay token, intentar autenticar
  authenticateUser(req, res, (err) => {
    // En caso de error, ignorarlo y continuar (autenticación opcional)
    if (err) {
      console.warn('Error en autenticación opcional:', err);
    }
    next();
  });
};

router.get('/', optionalAuth, getConsent);

router.post('/', optionalAuth, saveConsent);

router.get('/history', authenticateUser, getConsentHistory);

// Revocar consentimiento (autenticación opcional)
router.post('/revoke', optionalAuth, revokeConsent);

// Rutas públicas
router.get('/status', optionalAuth, checkCookieConsentStatus);

// Vincular consentimiento anónimo a usuario autenticado
router.post('/link', authenticateUser, linkAnonymousConsent);

export default router;