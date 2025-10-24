// routes/security/securityRoutes.js
import express from 'express';
import {
  getSecurityEvents,
  getSecurityMetrics,
  revokeUserTokens,
  blockIP,
  unblockIP,
  getBlockedIPs,
  getFailedLoginAttempts,
  getSuspiciousActivity,
  getUserSecurityInfo,
  logCustomSecurityEvent,
  getSecurityConfig,
  saveSecurityConfig,
  resetSecurityCounters,
  runSecurityDiagnostic,
  getSecurityLogs,
  exportSecurityEvents
} from '../../controllers/security/securityController.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { getParameterMap } from '../../middlewares/routeMapper.js';

const router = express.Router();

// IMPORTANTE: Rutas públicas (ANTES del middleware de autenticación)
// Estas rutas deben ser accesibles SIN autenticación

router.get('/route-map', async (req, res) => {
  try {
    // Importar módulos necesarios
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Ruta al archivo del mapa
    const mapPath = path.join(__dirname, '../../utils/routeMap.json');
    
    // Verificar si existe el archivo
    if (!fs.existsSync(mapPath)) {
      return res.status(404).json({ 
        error: 'Mapa de rutas no encontrado. Ejecuta el proceso de build primero.' 
      });
    }
    
    // Leer y parsear el mapa de rutas
    const routeMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    // Enviar solo el mapa inverso (rutas -> códigos) por seguridad
    const clientMap = {};
    Object.entries(routeMap).forEach(([code, route]) => {
      clientMap[route] = code;
    });
    
    res.json(clientMap);
  } catch (error) {
    console.error('Error al servir mapa de rutas:', error);
    res.status(500).json({ error: 'Error interno al cargar mapa de rutas' });
  }
});

// NUEVO: Endpoint para servir el mapa de parámetros (PÚBLICO)
router.get('/parameter-map', async (req, res) => {
  try {
    // Intentar obtener mapa desde el middleware
    let parameterMap = getParameterMap();
    
    if (!parameterMap || Object.keys(parameterMap).length === 0) {
      // Si no se puede obtener del middleware, intentar leerlo del archivo
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      // Ruta al archivo del mapa de parámetros
      const mapPath = path.join(__dirname, '../../utils/parameterMap.json');
      
      // Verificar si existe el archivo
      if (fs.existsSync(mapPath)) {
        parameterMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      } else {
        // Proporcionar un mapa básico de respaldo
        parameterMap = {
          "verifyPassword": "a1b2c3d4",
          "carrera": "e5f6g7h8",
          "active": "i9j0k1l2",
          "refresh-token": "b7d9e5f3",
          "token": "c8e9f0a2",
          "login": "d1f2g3h4",
          "register": "e4f5g6h7"
        };
      }
    }
    
    // Enviar el mapa completo al cliente
    res.json(parameterMap);
  } catch (error) {
    console.error('Error al servir mapa de parámetros:', error);
    res.status(500).json({ error: 'Error interno al cargar mapa de parámetros' });
  }
});

// Middleware de autenticación para todas las DEMÁS rutas
router.use(authenticateUser);

// Rutas para obtener datos (protegidas con autenticación)
router.get('/events', getSecurityEvents);
router.get('/metrics', getSecurityMetrics);
router.get('/blocked-ips', getBlockedIPs);
router.get('/failed-logins', getFailedLoginAttempts);
router.get('/suspicious-activity', getSuspiciousActivity);
router.get('/user/:userId', getUserSecurityInfo);

// Rutas para configuración
router.get('/config', getSecurityConfig);
router.post('/config', saveSecurityConfig);

// Ruta para reiniciar contadores
router.post('/reset-counters', resetSecurityCounters);

// Ruta para diagnóstico
router.post('/diagnostic', runSecurityDiagnostic);

// Ruta para logs
router.get('/logs', getSecurityLogs);

// Ruta para exportación
router.get('/export-events', exportSecurityEvents);

// Rutas para acciones de seguridad
router.post('/revoke-tokens', revokeUserTokens);
router.post('/block-ip', blockIP);
router.delete('/unblock-ip/:ip', unblockIP);
router.post('/log-event', logCustomSecurityEvent);

export default router;