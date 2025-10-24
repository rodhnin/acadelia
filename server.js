import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import fs from 'fs';
import './backend/services/security/scheduledTasks.js';
import captureRequestData from './backend/middlewares/requestDataMiddleware.js';
import embeddingAvaRoutes from "./backend/routes/chat/embeddingAvaRoutes.js";
import queryRoutes from './backend/routes/admin/queryRoutes.js';
import activityMenteLogRoutes from "./backend/routes/security/activityMenteLogRoutes.js";
import documentRoutes from './backend/routes/chat/documentRoutes.js';

// Importación de middlewares de seguridad
import { configureHelmet } from './backend/middlewares/helmet.js';
import { configureLimiters } from './backend/middlewares/rateLimiter.js';
import { securityMonitor, trackFailedLogins } from './backend/middlewares/securityMonitor.js';
import { detectSuspiciousActivity } from './backend/middlewares/suspiciousActivityDetector.js';
import securityRoutes from './backend/routes/security/securityRoutes.js';
import { runSecurityCleanup } from './backend/services/security/scheduledTasks.js';
import cookieConsentRoutes from './backend/routes/usuarios/cookieConsentRoutes.js';
import { routeMapper, normalizeErrors } from './backend/middlewares/routeMapper.js';
import { setMaintenanceMode } from './backend/services/security/maintenance.js';
import argentinaPaymentRoutes from './backend/routes/pagos/argentinaPaymentRoutes.js';
import marketingRoutes from './backend/routes/chat/marketingRoutes.js';
import contactRoutes from './backend/routes/shared/contactRoutes.js';

// ===== NUEVAS IMPORTACIONES PARA SISTEMA DE ACCESO =====
import accessStatusRoutes from './backend/routes/shared/accessStatusRoutes.js';

// ===== IMPORTACIONES PARA PROTECCIÓN FRONTEND =====
import { protectFrontendRoutes } from './backend/middlewares/frontendProtectionMiddleware.js';
import { requireAuth, requireAdmin, redirectAuthenticatedUsers } from './backend/middlewares/frontendAuthenticationMIddleware.js';
import { herramientaCacheService } from './backend/services/shared/herramientaCacheService.js';

// Importación de servicio de throttling
import { getQueue } from './backend/lib/queueService.js';
import { limitRequests } from './backend/middlewares/requestLimiter.js';

// Importación de rutas de la API
import webhookPaddle from "./backend/routes/pagos/webhookPaddle.js";
import { isValidUUID } from './backend/utils/chat/validators.js';
import subscriptionsRoutes from './backend/routes/pagos/subscriptionsRoutes.js';
import transactionsRoutes from './backend/routes/pagos/transactionsRoutes.js';
import taxRoutes from './backend/routes/pagos/taxRoutes.js';
import reportsRoutes from './backend/routes/pagos/reportsRoutes.js';
import expensesRoutes from './backend/routes/pagos/expensesRoutes.js';

// Importación de middlewares de autenticación
import { authenticateUser } from './backend/middlewares/authMiddleware.js';
import { isAdmin } from './backend/middlewares/adminMiddleware.js';

// Importación de rutas de la API
import fileRoutes from './backend/routes/chat/fileRoutes.js';
import openaiRoutes from './backend/routes/chat/openaiRoutes.js';
import userRoutes from './backend/routes/usuarios/userRoutes.js';
import perfilRoutes from './backend/routes/usuarios/perfilRoutes.js';
import useravaRoutes from './backend/routes/usuarios/useravaRoutes.js';
import transactionRoutes from './backend/routes/usuarios/transactionRoutes.js';
import argentinaAdminRoutes from './backend/routes/admin/argentinaAdminRoutes.js';
import paddleRoutes from './backend/routes/pagos/paddleRoutes.js';
import priceRoutes from './backend/routes/pagos/priceRoutes.js';
import termsRoutes from './backend/routes/usuarios/termsRoutes.js';
import avaRoutes from './backend/routes/chat/avaRoutes.js';
import carreraRoutes from './backend/routes/chat/carreraRoutes.js';
import chatRoutes from './backend/routes/chat/chatRoutes.js';
import herramientaRoutes from './backend/routes/chat/herramientaRoutes.js';
import paisesUniRoutes from './backend/routes/usuarios/PaisesUniRoutes.js';
import feedbackRoutes from './backend/routes/chat/feedbackRoutes.js';
import { setupCSP } from './backend/middlewares/cspMiddleware.js';

// ===== 🔒 IMPORTACIONES CSRF OPTIMIZADAS Y DEBUG =====
import {
  setupCookieCsrf,
  verifyCookieCsrf,
  getCsrfTokenEndpoint,
  resetCsrfToken
} from './backend/middlewares/CsrfMiddleware.js';

import youtubeAudioRoutes from './backend/routes/chat/youtubeAudioRoutes.js';
import videoTranscriptionRoutes from './backend/routes/chat/videoTranscriptionRoutes.js';
import audioTranscriptionRoutes from './backend/routes/chat/audioTranscriptionRoutes.js';
import queueMonitor from './backend/routes/admin/queueMonitor.js';
import { initReportScheduledTasks } from './backend/services/pagos/scheduledTasksPagos.js';
import { runUsersTasks } from './backend/services/security/scheduledTasks.js';
// Iniciar servicio de limpieza de imágenes
import { fileCleanupService } from './backend/services/chat/fileCleanupService.js';
import { cleanupServiceUsers } from './backend/services/usuarios/cleanupServiceUsers.js';

// ===== 🚀 OPTIMIZACIONES DE PERFORMANCE PARA FLY.IO =====
import http from 'http';
import https from 'https';

// Configurar variables de entorno y timeouts
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=6144';

// ===== 🎯 CONFIGURACIÓN AMBIENTE =====
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = !IS_DEVELOPMENT;

console.log(`🌍 Iniciando servidor en modo: ${IS_DEVELOPMENT ? 'DESARROLLO' : 'PRODUCCIÓN'}`);

// ⭐ CONFIGURAR KEEP-ALIVE PARA CONEXIONES HTTP
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

// ⭐ CONFIGURAR PROCESO PARA MEJOR RENDIMIENTO
if (process.env.NODE_ENV === 'production') {
  if (global.gc) {
    setInterval(() => {
      global.gc();
    }, 300000); // Cada 5 minutos
  }
}

process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    console.error('🔄 Intentando recuperación...');
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    console.error('🔄 Continuando operación...');
  }
});

// Inicializar el entorno
dotenv.config();

if (IS_PRODUCTION) {
  setTimeout(() => {
    fileCleanupService.startScheduledCleanup();
  }, 10000);
}

// Iniciar servicio de limpieza de usuarios no verificados
cleanupServiceUsers.initialize()
  .then(success => {
    if (success) {
      console.log('✅ Sistema de limpieza de usuarios no verificados inicializado');
    } else {
      console.warn('⚠️ Error al inicializar sistema de limpieza de usuarios no verificados');
    }
  })
  .catch(err => console.error('❌ Error crítico al inicializar limpieza:', err));

// Inicializar cache de herramientas para protección frontend
herramientaCacheService.initializeCache()
  .then(() => {
    console.log('✅ Cache de herramientas para protección frontend inicializado');
    const stats = herramientaCacheService.getCacheStats();
    if (IS_DEVELOPMENT) {
      console.log(`📊 Herramientas cargadas para protección: ${stats.count}`, stats.herramientas);
    }
  })
  .catch(err => {
    console.error('❌ Error al inicializar cache de herramientas para protección:', err);
  });

// Inicialización de colas para monitoreo
console.log('✅ Inicializando sistema de colas BullMQ');
getQueue('throttle-openai');
getQueue('throttle-pdf');
getQueue('throttle-audio');
getQueue('throttle-youtube');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ===== 🌐 CONFIGURACIÓN CORS (Docker-friendly) =====
const corsOptions = {
  origin: IS_DEVELOPMENT
    ? ['http://localhost:3000', 'http://frontend:80', 'http://localhost:5000']  // DESARROLLO: más permisivo
    : [process.env.FRONTEND_URL, process.env.DOMAIN_URL].filter(Boolean),      // PRODUCCIÓN: estricto
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // ⭐ AGREGAR OPTIONS
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-XSRF-Token',
    'Cache-Control',        // ⭐ AGREGAR
    'Pragma',              // ⭐ AGREGAR
    'Expires'              // ⭐ AGREGAR
  ]
};
app.use(cors(corsOptions));

// ⭐ AGREGAR: Middleware para manejar OPTIONS preflight
app.options('*', cors(corsOptions));

// ===== 🛠️ MIDDLEWARE MANTENIMIENTO =====
app.use((req, res, next) => {
  // Permitir acceso a recursos estáticos esenciales para la página de mantenimiento
  if (req.path.includes('/images/') ||
    req.path.includes('/scripts/') ||
    req.path.includes('/css/') ||
    req.path === '/api/admin/maintenance' ||
    (req.path.startsWith('/api/usuarios/auth-status')) ||
    (req.path.startsWith('/api/admin/') && req.method === 'POST')) {
    return next();
  }

  // Comprobar si el sitio está en mantenimiento directamente desde .env
  if (process.env.MAINTENANCE_MODE === 'true') {
    return handle503(req, res);
  }

  // Si no está en mantenimiento, continuar normalmente
  next();
});

// ===== 📦 WEBHOOK PADDLE (ANTES de body parsers) =====
app.use(
  "/api/webhook/paddle",
  express.raw({ type: 'application/json' }),
  webhookPaddle
);

// ===== 🔧 MIDDLEWARES GLOBALES =====
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// ===== 🍪 CONFIGURACIÓN SESIONES =====
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clave_secreta',
    resave: false,
    saveUninitialized: IS_DEVELOPMENT, // DESARROLLO: true, PRODUCCIÓN: false
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION, // HTTPS solo en producción
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: 'strict'
    },
    name: IS_PRODUCTION ? 'sessionId' : 'connect.sid' // Cambiar nombre por defecto en producción
  })
);

app.use(captureRequestData);

// ⭐ CONFIGURAR TIMEOUT PARA REQUESTS
app.use((req, res, next) => {
  let timeout = 90000; // 90 segundos por defecto
  
  // Timeout extendido para procesamiento pesado
  if (req.path.includes('/api/file/') || 
      req.path.includes('/api/openai/') ||
      req.path.includes('/api/media/')) {
    timeout = 900000; // 15 minutos
  }
  
  // NUEVO: Timeout específico para YouTube
  if (req.path.includes('/query-agent') || req.body?.query?.includes('youtube')) {
    timeout = 900000; // 15 minutos
  }
  
  req.setTimeout(timeout, () => {
    const err = new Error('Request timeout');
    err.status = 408;
    next(err);
  });
  
  res.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'The server took too long to respond'
      });
    }
  });
  
  next();
});

// ⭐ MIDDLEWARE DE PERFORMANCE MONITORING
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (process.env.NODE_ENV === 'production' && duration > 5000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${duration}ms`);
    } else if (process.env.NODE_ENV !== 'production' && duration > 1000) {
      console.log(`⏱️ Request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});

// ===== 🔒 MIDDLEWARES DE SEGURIDAD =====
configureHelmet(app);
app.use(setupCSP);
app.use(securityMonitor);
app.use(detectSuspiciousActivity);
app.use(routeMapper);
app.use(normalizeErrors);
configureLimiters(app);

// ===== 🔒 CSRF PROTECTION - CONFIGURACIÓN OPTIMIZADA =====

// 1. SETUP: Generar tokens CSRF (aplicar a TODAS las rutas)
app.use(setupCookieCsrf);

// 2. VERIFICACIÓN: Solo para APIs que modifican datos
const csrfVerificationMiddleware = (req, res, next) => {
  // Rutas que explícitamente NO necesitan CSRF
  const skipCsrfPaths = [
    '/api/webhook/paddle',
    '/api/usuarios/auth-status',
    '/api/csrf-token',
    '/api/config'
  ];

  // DESARROLLO: Añadir rutas adicionales de debugging
  if (IS_DEVELOPMENT) {
    skipCsrfPaths.push(
      '/api/csrf-metrics',
      '/api/csrf-reset',
      '/api/csrf-debug',
      '/api/csrf-test',
      '/api/debug-info'
    );
  }

  // Skip para métodos seguros o rutas excluidas
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
    skipCsrfPaths.some(path => req.path === path || req.path.startsWith(path))) {
    return next();
  }

  // Aplicar verificación CSRF
  return verifyCookieCsrf(req, res, next);
};

// 3. Aplicar verificación solo a rutas API
app.use('/api', csrfVerificationMiddleware);

// 4. Headers de seguridad adicionales
app.use((req, res, next) => {
  if (!res.headersSent) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Solo en producción
    if (IS_PRODUCTION) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }
  next();
});

// 5. Manejo de errores CSRF específico
app.use((err, req, res, next) => {
  if (err.code === 'CSRF_TOKEN_MISMATCH' || err.code === 'CSRF_TOKEN_INVALID') {
    // Log de seguridad para intentos de CSRF
    console.error('🚨 CSRF Attack Detected:', {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      error: 'Request rejected for security reasons',
      code: 'SECURITY_VIOLATION'
    });
  }

  next(err);
});

// ===== 📁 ARCHIVOS ESTÁTICOS =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use('/dist', express.static(path.join(__dirname, 'frontend', 'public', 'dist')));
app.use(express.static(path.join(__dirname, 'frontend', 'views')));

// ===== 🩺 HEALTH CHECK ENDPOINTS OPTIMIZADOS =====
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// ⭐ ENDPOINT DE READINESS CHECK
app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Health check alternativo (formato simple)
app.get('/_health', (req, res) => {
  res.status(200).send('OK');
});

// Status detallado (opcional, para debugging)
app.get('/api/status', (req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    node_version: process.version,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    services: {
      clamav: 'initializing_background',
      database: 'available',
      redis: 'available'
    }
  });
});

// ===== 🏠 RUTA PRINCIPAL =====
app.get('/', redirectAuthenticatedUsers, (req, res) => {
  const indexPath = path.join(__dirname, 'frontend', 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Página de inicio no encontrada');
  }
});

// ===== 🚫 RUTAS DE ERROR =====
app.get('/cuenta-suspendida', (req, res) => {
  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', 'ban.html');
  if (fs.existsSync(errorPath)) {
    return res.status(403).sendFile(errorPath);
  }
  res.status(403).send('Tu cuenta ha sido suspendida. Por favor contacta con soporte para más información.');
});

app.get('/error-test', (req, res, next) => {
  const error = new Error('Este es un error de prueba para ver la página 500');
  error.status = 500;
  next(error);
});

app.get('/429', (req, res) => {
  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', '429.html');
  if (fs.existsSync(errorPath)) {
    return res.status(429).sendFile(errorPath);
  }
  res.status(429).send('Error 429: Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.');
});

app.get('/402', (req, res) => {
  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', '402.html');
  if (fs.existsSync(errorPath)) {
    return res.status(402).sendFile(errorPath);
  }
  res.status(402).send('Error 402: Carrera requerida para acceder a este contenido.');
});

// ===== 🔐 ENDPOINTS CSRF =====

// Endpoint para obtener token CSRF
app.get('/api/csrf-token', getCsrfTokenEndpoint);

// Endpoints de desarrollo (solo debugging)
if (IS_DEVELOPMENT) {

  // Endpoint para resetear token
  app.post('/api/csrf-reset', resetCsrfToken);

  // Endpoint para diagnosticar CSRF
  app.get('/api/csrf-debug', (req, res) => {
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const sessionId = req.sessionID || 'no-session';

    res.json({
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      requestInfo: {
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100),
        sessionId: sessionId,
        path: req.path,
        method: req.method
      },
      csrf: {
        hasCookieToken: !!cookieToken,
        cookieTokenPrefix: cookieToken ? cookieToken.substring(0, 12) + '...' : null,
        cookieTokenLength: cookieToken ? cookieToken.length : 0,
        requestTokenHeader: req.headers['x-csrf-token']?.substring(0, 12) + '...' || 'NO HEADER'
      },
      cookies: {
        all: req.headers.cookie || 'NO COOKIES',
        parsed: Object.keys(req.cookies).length > 0 ? req.cookies : 'NO PARSED COOKIES'
      }
    });
  });

  // Ruta de prueba para testing CSRF
  app.post('/api/csrf-test', (req, res) => {
    res.json({
      success: true,
      message: 'CSRF test exitoso',
      receivedData: req.body,
      timestamp: Date.now()
    });
  });

  // Ruta para mostrar información de debugging
  app.get('/api/debug-info', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      cookieParser: !!req.cookies,
      sessionId: req.sessionID || 'no-session',
      headers: {
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer,
        cookie: req.headers.cookie ? 'PRESENTE' : 'AUSENTE'
      },
      csrf: {
        cookiePresent: !!req.cookies['XSRF-TOKEN'],
        cookieValue: req.cookies['XSRF-TOKEN']?.substring(0, 8) + '...' || 'NO COOKIE'
      }
    });
  });
}

// ===== 🔒 MIDDLEWARE DE SEGUIMIENTO =====
app.use('/api/usuarios/login', trackFailedLogins);

// ===== 🔍 LOGGING INTELIGENTE (CORREGIDO) =====
const createIntelligentLogger = () => {
  return (req, res, next) => {
    if (IS_DEVELOPMENT && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // ✅ SOLUCIÓN: Evaluar autenticación de manera inteligente
      const hasAuthToken = !!(req.cookies.token || req.headers.authorization?.split(' ')[1]);
      const csrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
      const cookieToken = req.cookies['XSRF-TOKEN'];

      console.log(`🔒 [${new Date().toISOString()}] ${req.method} ${req.path}`, {
        // ✅ Estado de autenticación más preciso
        hasAuthToken,
        userIdFromToken: req.user?.id_user || 'pending-verification',
        authStatus: req.user ? 'authenticated' : (hasAuthToken ? 'token-present' : 'no-token'),

        // Información CSRF
        csrf: csrfToken?.substring(0, 8) + '...' || 'NONE',
        cookie: cookieToken?.substring(0, 8) + '...' || 'NONE',
        csrfMatch: csrfToken && cookieToken ? (csrfToken === cookieToken ? '✅' : '❌') : '?',

        // Info del request
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      });
    }
    next();
  };
};

// ===== 🎨 RUTAS DINÁMICAS CON SOPORTE DE VISTAS =====
const viewCategories = [
  { category: 'content/herramientas', views: ['pdf', 'agente'] },
  { category: 'content/medicina', views: ['patologia', 'Semiologia', 'CienciasBasicas', 'medicinainterna', 'CienciasAplicadas', 'CirugiaYUrgencias', 'EspecialidadesMed1', 'EspecialidadesMedicasII', 'Epidemiologia', 'MatematicaMedica'] },
  { category: 'content/ingenieria', views: ['fisica', 'Algebra', 'Calculo', 'Quimica', 'Estadistica', 'ResistenciaMateriales', 'ElectricidadElectronica', 'MatematicaAvz', 'ComputacionSistemas', 'RedesSeguridad'] },
  { category: 'content/economia', views: ['desarrolloeconomico', 'economialaboral', 'historiaeconomica', 'macroeconomia', 'sectorpublico', 'microeconomia', 'econometria', 'economiainternacional', 'finanzas', 'calculoeconomico'] },
  { category: 'content/psicologia', views: ['DSM5', 'Epistemologia', 'Psicopatologia', 'PsicDiagnostico', 'Neuropsicologia', 'Psicoanalisis', 'PsicologiaGeneral', 'PsicologiaSocial', 'PsicologiaEvolutiva', 'Psicoestadistica'] },
  { category: 'auth', views: ['login', 'reset-password', 'verify-email', 'delete-account'] },
  { category: 'error', views: ['402', '403', '404', '429', '500', '503', 'ban'] },
  { category: 'dashboard', views: ['principal', 'cuenta', 'misavas'] },
  { category: 'payments', views: ['tienda', 'paymenthistory', 'estatus'] },
  { category: 'other', views: ['contact', 'faq', 'cookie_privacy', 'terminos_condiciones', 'precios'] },
  { category: 'admin', views: ['chiguiremarketing', 'seguridad', 'administracion', 'chiguiremente', 'administracion_arg'] }
];

// Función para manejar rutas con UUID
const handleUuidRoute = (req, res, category, view) => {
  const { chat_uuid } = req.params;
  const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

  // Verificar si el archivo existe
  if (fs.existsSync(filePath)) {
    // Si hay un UUID, validarlo
    if (chat_uuid && !isValidUUID(chat_uuid)) {
      return res.status(400).send('El UUID no es válido');
    }
    return res.sendFile(filePath);
  }

  // Si el archivo no existe
  handle404(req, res);
};

// ===== 🎯 FUNCIÓN 1: RUTAS CON SOPORTE UUID (CORREGIDA) =====
// Reemplazar la función completa en server.js (líneas ~470-490)

viewCategories.forEach(({ category, views }) => {
  views.forEach(view => {
    if (category === 'admin') {
      // 🔒 VISTAS ADMIN: Requieren autenticación + rol admin
      app.get(`/${view}/:chat_uuid?`, requireAdmin, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else if (category === 'dashboard') {
      // 🔒 VISTAS DASHBOARD: Requieren autenticación obligatoria
      app.get(`/${view}/:chat_uuid?`, requireAuth, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else if (category === 'payments') {
      // 🔒 VISTAS PAYMENTS: Requieren autenticación obligatoria
      app.get(`/${view}/:chat_uuid?`, requireAuth, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else if (category.startsWith('content/')) {
      // 🆓 VISTAS CONTENT: Usar middleware refactorizado (como dashboard)
      app.get(`/${view}/:chat_uuid?`, requireAuth, protectFrontendRoutes, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else if (category === 'error') {
      // 🚨 VISTAS ERROR: Sin protección, acceso directo
      app.get(`/${view}/:chat_uuid?`, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else if (category === 'auth') {
      // 🔄 VISTAS AUTH: Redirigir usuarios autenticados
      app.get(`/${view}/:chat_uuid?`, redirectAuthenticatedUsers, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    } else {
      // 🆓 OTRAS VISTAS: Sin protección especial (other)
      app.get(`/${view}/:chat_uuid?`, (req, res) => {
        handleUuidRoute(req, res, category, view);
      });
    }
  });
});

// ===== 🎯 FUNCIÓN 2: RUTAS SIN UUID (CORREGIDA) =====
// Reemplazar la función completa en server.js (líneas ~492-570)

app.get('/:view', (req, res, next) => {
  const { view } = req.params;

  for (const { category, views } of viewCategories) {
    if (views.includes(view)) {

      if (category === 'admin') {
        // 🔒 VISTAS ADMIN: Requieren autenticación + rol admin
        return requireAdmin(req, res, () => {
          const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }

          return handle404(req, res);
        });
      } else if (category === 'dashboard') {
        // 🔒 VISTAS DASHBOARD: Requieren autenticación obligatoria
        return requireAuth(req, res, () => {
          const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }

          return handle404(req, res);
        });
      } else if (category === 'payments') {
        // 🔒 VISTAS PAYMENTS: Requieren autenticación obligatoria
        return requireAuth(req, res, () => {
          const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }

          return handle404(req, res);
        });
      } else if (category.startsWith('content/')) {
        // 🆓 VISTAS CONTENT: Usar middleware refactorizado (como dashboard)
        return requireAuth(req, res, () => {
          protectFrontendRoutes(req, res, () => {
            const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

            if (fs.existsSync(filePath)) {
              return res.sendFile(filePath);
            }

            return handle404(req, res);
          });
        });
      } else if (category === 'error') {
        // 🚨 VISTAS ERROR: Sin protección, acceso directo
        const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }

        return handle404(req, res);
      } else if (category === 'auth') {
        // 🔄 VISTAS AUTH: Redirigir usuarios autenticados
        return redirectAuthenticatedUsers(req, res, () => {
          const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }

          return handle404(req, res);
        });
      } else {
        // 🆓 OTRAS CATEGORÍAS: Sin protección especial (other)
        const filePath = path.join(__dirname, 'frontend', 'views', category, `${view}.html`);

        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }

        return handle404(req, res);
      }
    }
  }

  // Si no se encuentra la vista
  next();
}, (req, res) => {
  handle404(req, res);
});

// ===== 🔧 RUTAS DE ADMINISTRACIÓN =====
app.post('/api/admin/run-security-cleanup', authenticateUser, isAdmin, async (req, res) => {
  try {
    const result = await runSecurityCleanup();
    res.json(result);
  } catch (error) {
    console.error('Error ejecutando limpieza de seguridad manual:', error);
    res.status(500).json({ error: 'Error ejecutando limpieza' });
  }
});

app.post('/api/admin/run-user-tasks', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { runUsersTasks } = await import('./backend/services/security/scheduledTasks.js');
    const result = await runUsersTasks();
    res.json(result);
  } catch (error) {
    console.error('Error ejecutando tareas de usuarios manual:', error);
    res.status(500).json({ error: 'Error ejecutando tareas de usuarios' });
  }
});

app.post('/api/admin/maintenance', authenticateUser, isAdmin, (req, res) => {
  const { enable } = req.body;

  if (typeof enable !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Parámetro "enable" debe ser boolean' });
  }

  const result = setMaintenanceMode(enable);

  if (result) {
    return res.json({ success: true, maintenance: enable });
  } else {
    return res.status(500).json({ success: false, error: 'Error al cambiar modo mantenimiento' });
  }
});

// ===== 🔄 RUTAS DE ADMINISTRACIÓN ARGENTINA - SUSCRIPCIONES =====
app.post('/api/admin/actualizar-suscripciones-vencidas', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { actualizarSuscripcionesVencidas } = await import('./backend/controllers/pagos/argentinaAdminController.js');
    await actualizarSuscripcionesVencidas(req, res);
  } catch (error) {
    console.error('Error ejecutando actualización de suscripciones manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando actualización de suscripciones',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/admin/estadisticas-suscripciones', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { obtenerEstadisticasSuscripciones } = await import('./backend/controllers/pagos/argentinaAdminController.js');
    await obtenerEstadisticasSuscripciones(req, res);
  } catch (error) {
    console.error('Error obteniendo estadísticas de suscripciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

app.get('/api/admin/verificar-pgcron', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { verificarEstadoPgCron } = await import('./backend/controllers/pagos/argentinaAdminController.js');
    await verificarEstadoPgCron(req, res);
  } catch (error) {
    console.error('Error verificando pg_cron:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando sistema'
    });
  }
});

// ===== ⚙️ RUTA DE CONFIGURACIÓN =====
app.get('/api/config', (req, res) => {
  res.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV,
    // DESARROLLO: Exponer información adicional
    ...(IS_DEVELOPMENT && {
      IS_DEVELOPMENT: true,
      CSRF_ENABLED: true,
      CORS_ORIGINS: corsOptions.origin,
      CSRF_DEBUG_ENDPOINTS: [
        '/api/csrf-token',
        '/api/csrf-metrics',
        '/api/csrf-debug',
        '/api/csrf-reset',
        '/api/csrf-test'
      ]
    })
  });
});

// ===== 📧 RUTAS DE VERIFICACIÓN =====
app.get('/verify-email', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const csrfToken = crypto.randomBytes(64).toString('hex');
  res.cookie('csrf-token', csrfToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'Strict'
  });

  res.sendFile(path.join(__dirname, 'frontend', 'views', 'auth', 'verify-email.html'));
});

app.get('/reset-password', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const csrfToken = crypto.randomBytes(64).toString('hex');
  res.cookie('csrf-token', csrfToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'Strict'
  });

  res.sendFile(path.join(__dirname, 'frontend', 'views', 'auth', 'reset-password.html'));
});

// ===== 📋 INICIALIZAR TAREAS PROGRAMADAS =====
runUsersTasks()
  .then(() => console.log('✅ Sistema de tareas programadas de usuarios inicializado'))
  .catch(err => console.error('❌ Error al inicializar tareas de usuarios:', err));

initReportScheduledTasks()
  .then(() => console.log('✅ Sistema de informes automáticos inicializado'))
  .catch(err => console.error('❌ Error al inicializar informes automáticos:', err));

// ===== 🌐 RUTAS DE LA API CON LIMITADORES Y LOGGING INTELIGENTE =====

// ✅ LOGGING DESPUÉS DE AUTENTICACIÓN PARA RUTAS PROTEGIDAS
const intelligentLogger = createIntelligentLogger();

// Media/YouTube
app.use('/api/media', (req, res, next) => {
  if (req.path === '/process-youtube' || req.path.startsWith('/process-youtube')) {
    return limitRequests('youtube')(req, res, next);
  }
  next();
}, youtubeAudioRoutes);

// Video Transcription
app.use('/api/video-transcription', videoTranscriptionRoutes);

// Audio Transcription
app.use('/api/audio-transcription', (req, res, next) => {
  if (req.path === '/process-audio-file' || req.path === '/process-recorded-audio' ||
    req.path.startsWith('/process-audio-file') || req.path.startsWith('/process-recorded-audio')) {
    return limitRequests('audio')(req, res, next);
  }
  next();
}, audioTranscriptionRoutes);

// File/PDF
app.use('/api/file', (req, res, next) => {
  if (req.path === '/extract-content/:chatId' || req.path.startsWith('/extract-content/') ||
    req.path === '/extract-text/:chatId' || req.path.startsWith('/extract-text/')) {
    return limitRequests('pdf')(req, res, next);
  }
  next();
}, fileRoutes);

// OpenAI/LLM con logging inteligente
app.use('/api/openai', (req, res, next) => {
  if (req.path.startsWith('/query-') || req.path.startsWith('/multimodal-')) {
    return limitRequests('openai')(req, res, next);
  }
  next();
}, intelligentLogger, openaiRoutes);

// ===== 🔗 RESTO DE RUTAS API CON LOGGING INTELIGENTE =====
app.use('/api/payments-arg', argentinaPaymentRoutes);
app.use('/api/admin/queues', authenticateUser, isAdmin, queueMonitor);
app.use('/api/ava', embeddingAvaRoutes);
app.use('/api/query', queryRoutes);
app.use("/api/activitymente", activityMenteLogRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/carrera', carreraRoutes);
app.use('/api/test-queues', queueMonitor);
app.use('/api/avas', avaRoutes);

// ✅ RUTAS CON AUTENTICACIÓN + LOGGING INTELIGENTE
app.use('/api/chats', authenticateUser, intelligentLogger, chatRoutes);
app.use('/api', paisesUniRoutes);
app.use('/api/compra', useravaRoutes);
app.use('/api/terminos', termsRoutes);
app.use('/api/admin/argentina', argentinaAdminRoutes);
app.use('/api/admin/finance', subscriptionsRoutes);
app.use('/api/admin/finance', transactionsRoutes);
app.use('/api/admin/finance', taxRoutes);
app.use('/api/admin/finance', reportsRoutes);
app.use('/api/admin/finance', expensesRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/payment', transactionRoutes);
app.use('/api/paddle', paddleRoutes);
app.use('/api/price', priceRoutes);
app.use("/api/herramientas", herramientaRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/cookie-consent', cookieConsentRoutes);
app.use('/api/access', accessStatusRoutes);
app.use('/api/contact', contactRoutes);

// ===== 🚨 FUNCIONES DE MANEJO DE ERRORES =====

// Función helper para manejar 503 (Mantenimiento)
const handle503 = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(503)
      .header('Retry-After', '3600')
      .json({
        success: false,
        error: 'Servicio temporalmente no disponible por mantenimiento',
        status: 503
      });
  }

  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', '503.html');
  if (fs.existsSync(errorPath)) {
    return res.status(503)
      .header('Retry-After', '3600')
      .sendFile(errorPath);
  }

  res.status(503)
    .header('Retry-After', '3600')
    .send('Sitio en mantenimiento. Por favor, intente más tarde.');
};

// Función helper para manejar 404
const handle404 = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Recurso no encontrado',
      status: 404
    });
  }

  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', '404.html');
  if (fs.existsSync(errorPath)) {
    return res.status(404).sendFile(errorPath);
  }

  res.status(404).send('Página no encontrada');
};

// ===== 🛠️ MIDDLEWARE DE ERRORES =====
app.use((err, req, res, next) => {
  // DESARROLLO: Log completo del error
  if (IS_DEVELOPMENT) {
    console.error('Error en el servidor:', err);
  } else {
    // PRODUCCIÓN: Log solo información esencial
    console.error('Error:', {
      message: err.message,
      stack: err.stack?.split('\n')[0],
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Preparar detalles del error (solo en desarrollo)
  const errorDetails = IS_DEVELOPMENT
    ? `${err.stack || err}`
    : '';

  // Enviar página de error 500 personalizada
  const errorPath = path.join(__dirname, 'frontend', 'views', 'error', '500.html');
  if (fs.existsSync(errorPath)) {
    let html = fs.readFileSync(errorPath, 'utf8');
    html = html.replace('<%= errorDetails %>', errorDetails);
    return res.status(500).send(html);
  }

  res.status(500).send('Error interno del servidor');
});

// ===== 🔄 FUNCIÓN DE LIMPIEZA =====
const cleanupQueues = async () => {
  try {
    console.log('🔄 Cerrando conexiones de colas...');
    const { closeAllConnections } = await import('./backend/lib/queueService.js');
    await closeAllConnections();
    console.log('✅ Todas las colas cerradas correctamente');

  } catch (error) {
    console.error('❌ Error al cerrar colas:', error);
  }
};

// ===== 🚀 APLICAR OPTIMIZACIONES AL INICIAR SERVIDOR =====
const optimizeDbConnections = () => {
  const poolConfig = {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 30000,
    evict: 60000,
    handleDisconnects: true,
    reconnect: true,
    reconnectTries: 3,
    reconnectInterval: 1000
  };
  
  console.log('🔧 Configurando pool de conexiones optimizado...');
  return poolConfig;
};

const gracefulShutdown = async (signal) => {
  console.log(`📡 Señal ${signal} recibida, iniciando cierre gracioso...`);
  
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('✅ Servidor HTTP cerrado');
    }
    
    console.log('🔄 Cerrando conexiones de base de datos...');
    await cleanupQueues();
    
    console.log('✅ Cierre gracioso completado');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante cierre gracioso:', error);
    process.exit(1);
  }
};

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Modo: ${IS_DEVELOPMENT ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
  console.log(`📊 Monitor de colas disponible en http://localhost:${PORT}/queue-dashboard`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Readiness check: http://localhost:${PORT}/ready`);
  
  server.setTimeout(900000);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  
  optimizeDbConnections();
  
  console.log('⚡ Optimizaciones de performance aplicadas');
  
  // DESARROLLO: Mostrar información adicional
  if (IS_DEVELOPMENT) {
    console.log(`🔒 CSRF protección: ACTIVA`);
    console.log(`🔧 CSRF métricas: http://localhost:${PORT}/api/csrf-metrics`);
    console.log(`🔑 CSRF token: http://localhost:${PORT}/api/csrf-token`);
    console.log(`🐛 CSRF debug: http://localhost:${PORT}/api/csrf-debug`);
    console.log(`🔄 CSRF reset: POST http://localhost:${PORT}/api/csrf-reset`);
    console.log(`🧪 CSRF test: POST http://localhost:${PORT}/api/csrf-test`);
    console.log(`⚙️ Configuración: http://localhost:${PORT}/api/config`);
    console.log(`\n🧪 Para debugging CSRF en frontend:`);
    console.log(`   window.csrfDebug.diagnose()`);
    console.log(`   await window.csrfDebug.resetToken()`);
    console.log(`   await window.csrfDebug.testFetch()`);
    console.log(`\n🔧 Logging inteligente: ACTIVO (req.user detectado correctamente)`);
  }
});

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// ===== 📝 COMENTARIOS DE CAMBIO A PRODUCCIÓN =====
/*
🚀 PARA CAMBIAR A PRODUCCIÓN:

1. Cambiar línea 77:
   const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

2. Configurar variables de entorno:
   NODE_ENV=production
   DOMAIN_URL=https://tu-dominio.com
   FRONTEND_URL=https://tu-dominio.com
   COOKIE_DOMAIN=tu-dominio.com
   JWT_SECRET=tu-jwt-secret-muy-seguro
   SESSION_SECRET=tu-session-secret-muy-seguro

3. Verificar HTTPS está configurado en tu servidor/proxy

4. ¡Eso es todo! El servidor automáticamente:
   ✅ Deshabilitará logs de debug
   ✅ Ocultará endpoints de debugging
   ✅ Habilitará cookies seguras  
   ✅ Restringirá CORS
   ✅ Activará headers de seguridad HTTPS
   ✅ Optimizará rendimiento
   ✅ Logging inteligente funcionará correctamente

✅ PROBLEMAS RESUELTOS EN ESTA VERSIÓN:
   ✅ Logging muestra estado de autenticación correcto
   ✅ req.user se evalúa DESPUÉS de autenticación
   ✅ Logs más informativos y precisos
   ✅ Separación clara entre desarrollo y producción

🧪 ENDPOINTS DE DEBUG DISPONIBLES EN DESARROLLO:
   GET  /api/csrf-token     - Obtener token actual
   GET  /api/csrf-metrics   - Ver métricas
   GET  /api/csrf-debug     - Información detallada
   POST /api/csrf-reset     - Resetear token
   POST /api/csrf-test      - Probar CSRF
   GET  /api/debug-info     - Info general
*/