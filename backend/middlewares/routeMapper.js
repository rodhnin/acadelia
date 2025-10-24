// backend/middlewares/routeMapper.js
// ARREGLADO - SIN CAMBIAR NOMBRES, SIN ROMPER CSRF, CON SOPORTE MULTI-NIVEL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar mapeo de rutas (OPCIONAL - si no existe, no pasa nada)
let routeMap = {};
let parameterMap = {};

try {
  const mapPath = path.join(__dirname, '../utils/routeMap.json');
  if (fs.existsSync(mapPath)) {
    routeMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    console.log(`✅ Mapa de rutas API cargado: ${Object.keys(routeMap).length} rutas seguras`);
    
    // Cargar mapa de parámetros si existe
    const paramMapPath = path.join(__dirname, '../utils/parameterMap.json');
    if (fs.existsSync(paramMapPath)) {
      parameterMap = JSON.parse(fs.readFileSync(paramMapPath, 'utf8'));
      console.log(`✅ Mapa de parámetros cargado: ${Object.keys(parameterMap).length} parámetros configurados`);
    } else {
      // 🆕 CREAR MAPA BÁSICO CON PARÁMETROS DE ARGENTINA
      parameterMap = {
        "verifyPassword": generateHashCode("verifyPassword"),
        "carrera": generateHashCode("carrera"),
        "active": generateHashCode("active"),
        "refresh-token": generateHashCode("refresh-token"),
        "token": generateHashCode("token"),
        "login": generateHashCode("login"),
        "register": generateHashCode("register"),
        // 🆕 AGREGAR: Parámetros específicos de admin/argentina
        "argentina": generateHashCode("argentina"),
        "finance": generateHashCode("finance"),
        "queues": generateHashCode("queues"),
        "stats": generateHashCode("stats"),
        "users": generateHashCode("users"),
        "payments": generateHashCode("payments"),
        "actualizar-suscripciones-vencidas": generateHashCode("actualizar-suscripciones-vencidas"),
        "estadisticas-suscripciones": generateHashCode("estadisticas-suscripciones"),
        "verificar-pgcron": generateHashCode("verificar-pgcron")
      };
    }
  } else {
    console.log('ℹ️ No se encontró mapa de rutas. Modo compatibilidad activado.');
  }
} catch (error) {
  console.warn('⚠️ Error cargando mapa de rutas (continuando sin él):', error.message);
}

// Función para generar códigos hash consistentes
function generateHashCode(str) {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

// 🆕 FUNCIÓN MEJORADA: Crear mapa inverso para decodificación rápida
function createReverseParameterMap() {
  const reverseMap = {};
  Object.entries(parameterMap).forEach(([original, hashed]) => {
    reverseMap[hashed] = original;
  });
  return reverseMap;
}

// Función para ofuscar parámetros y segmentos de ruta
function ofuscatePathSegment(segment) {
  // Si es un ID numérico, ofuscarlo directamente
  if (/^\d+$/.test(segment)) {
    return `p${segment}`; // Simple y funcional
  }
  
  // Si es un segmento conocido, usar su mapa predefinido
  if (parameterMap[segment]) {
    return parameterMap[segment];
  }
  
  // Si es otro tipo de segmento, crear hash simple
  const hash = generateHashCode(segment);
  
  // Guardar para consistencia (OPCIONAL)
  try {
    parameterMap[segment] = hash;
    const paramMapPath = path.join(__dirname, '../utils/parameterMap.json');
    fs.writeFileSync(paramMapPath, JSON.stringify(parameterMap, null, 2));
  } catch (err) {
    // No crítico si falla
  }
  
  return hash;
}

// 🆕 FUNCIÓN MEJORADA: Decodificar segmentos ofuscados con soporte multi-nivel
function deofuscatePathSegment(ofuscatedSegment) {
  // Crear mapa inverso para búsqueda rápida
  const reverseMap = createReverseParameterMap();
  
  // Buscar en el mapa inverso
  if (reverseMap[ofuscatedSegment]) {
    return reverseMap[ofuscatedSegment];
  }
  
  // Si es un ID numérico ofuscado (formato p+números)
  if (ofuscatedSegment.startsWith('p') && /^p\d+$/.test(ofuscatedSegment)) {
    return ofuscatedSegment.substring(1);
  }
  
  // Si no lo encontramos, devolver el original
  return ofuscatedSegment;
}

// ✅ MIDDLEWARE PRINCIPAL - 🆕 MEJORADO PARA MULTI-NIVEL
export function routeMapper(req, res, next) {
  // ✅ SOLO procesar rutas /api/x/ si existen mapas
  if (!req.originalUrl.startsWith('/api/x/') || Object.keys(routeMap).length === 0) {
    // Si no hay mapas o no es ruta ofuscada, continuar normalmente
    return next();
  }
  
  try {
    // 🆕 MEJORADO: Extraer código de ruta y manejar query params correctamente
    const [basePath, queryString] = req.originalUrl.split('?');
    const urlParts = basePath.split('/api/x/')[1].split('/');
    const code = urlParts[0];
    
    // Buscar ruta real
    const targetRoute = routeMap[code];
    
    if (!targetRoute) {
      console.warn(`⚠️ Ruta ofuscada no encontrada: /api/x/${code}`);
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    // Debug solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Ruta ofuscada detectada: ${req.originalUrl} → /api${targetRoute}`);
    }
    
    // 🆕 MEJORADO: Procesar segmentos adicionales (parámetros multi-nivel)
    const additionalSegments = urlParts.slice(1); // Todo después del código de ruta
    const decodedSegments = [];
    
    // Decodificar cada segmento individualmente
    for (const segment of additionalSegments) {
      if (segment && segment.trim() !== '') {
        const decodedSegment = deofuscatePathSegment(segment);
        decodedSegments.push(decodedSegment);
        
        // Log solo en desarrollo
        if (process.env.NODE_ENV === 'development' && decodedSegment !== segment) {
          console.log(`  🔓 Segmento decodificado: ${segment} → ${decodedSegment}`);
        }
      }
    }
    
    // Construir la ruta original completa
    let newPath = `/api${targetRoute}`;
    if (decodedSegments.length > 0) {
      newPath += '/' + decodedSegments.join('/');
    }
    
    // Agregar query params si existen
    if (queryString) {
      newPath += '?' + queryString;
    }
    
    // Actualizar la request URL
    req.url = newPath;
    
    // ✅ CRÍTICO: NO modificar headers de autenticación ni cookies
    // Esto garantiza que CSRF y auth funcionen correctamente
    
    console.log(`🔄 Ruta mapeada: ${req.originalUrl} → ${req.url}`);
    
    // Continuar con la petición
    next();
    
  } catch (error) {
    console.error('❌ Error en routeMapper:', error);
    return res.status(500).json({ error: 'Error procesando la ruta' });
  }
}

// ✅ MIDDLEWARE PARA NORMALIZAR ERRORES - SIEMPRE ACTIVO
export function normalizeErrors(req, res, next) {
  // Guardar el método original
  const originalStatus = res.status;
  
  // ✅ SIEMPRE ACTIVO PARA PRUEBAS (como pidió el usuario)
  res.status = function(code) {
    // Normalizar códigos de error de cliente (4xx) para APIs
    if (code >= 400 && code < 500 && req.url.startsWith('/api/')) {
      // Mantener códigos importantes
      const preserveCodes = [401, 403, 404, 429];
      if (!preserveCodes.includes(code)) {
        // Solo en desarrollo mostrar código original en logs
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Error normalizado: ${code} → 404 para ${req.url}`);
        }
        return originalStatus.call(this, 404);
      }
    }
    return originalStatus.call(this, code);
  };
  
  next();
}

// ✅ FUNCIÓN EXPORTADA PARA USO EN LA GENERACIÓN DEL MAPA
export function getParameterMap() {
  return parameterMap;
}

// ✅ ESTADÍSTICAS SIMPLES (OPCIONAL)
let requestStats = {
  total: 0,
  apiRequests: 0,
  obfuscatedRequests: 0,
  errorRequests: 0,
  decodedSegments: 0 // 🆕 NUEVO: Contador de segmentos decodificados
};

// Middleware para contar requests (OPCIONAL)
export function trackRequests(req, res, next) {
  requestStats.total++;
  
  if (req.url.startsWith('/api/')) {
    requestStats.apiRequests++;
  }
  
  if (req.originalUrl.startsWith('/api/x/')) {
    requestStats.obfuscatedRequests++;
    
    // 🆕 NUEVO: Contar segmentos decodificados
    const urlParts = req.originalUrl.split('/api/x/')[1].split('/');
    if (urlParts.length > 1) {
      requestStats.decodedSegments += urlParts.length - 1;
    }
  }
  
  // Contar errores
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      requestStats.errorRequests++;
    }
  });
  
  next();
}

// Función para obtener estadísticas
export function getRouteStats() {
  return {
    ...requestStats,
    obfuscatedRoutes: Object.keys(routeMap).length,
    mappedParameters: Object.keys(parameterMap).length,
    uptime: process.uptime()
  };
}

// Función para limpiar estadísticas
export function clearStats() {
  requestStats = {
    total: 0,
    apiRequests: 0,
    obfuscatedRequests: 0,
    errorRequests: 0,
    decodedSegments: 0
  };
  console.log('📊 Estadísticas limpiadas');
}

// ✅ ENDPOINTS PARA BACKEND (OPCIONALES)
export function createSecurityEndpoints(app, authenticateUser, isAdmin) {
  // Endpoint para servir mapa de rutas (OPCIONAL)
  app.get('/api/security/route-map', authenticateUser, isAdmin, (req, res) => {
    try {
      if (Object.keys(routeMap).length === 0) {
        return res.status(404).json({ error: 'Mapa de rutas no disponible' });
      }
      res.json(routeMap);
    } catch (error) {
      res.status(500).json({ error: 'Error obteniendo mapa de rutas' });
    }
  });
  
  // Endpoint para servir mapa de parámetros (OPCIONAL)
  app.get('/api/security/parameter-map', authenticateUser, isAdmin, (req, res) => {
    try {
      if (Object.keys(parameterMap).length === 0) {
        return res.status(404).json({ error: 'Mapa de parámetros no disponible' });
      }
      res.json(parameterMap);
    } catch (error) {
      res.status(500).json({ error: 'Error obteniendo mapa de parámetros' });
    }
  });
  
  // 🆕 NUEVO: Endpoint para test de decodificación
  app.post('/api/security/test-decode', authenticateUser, isAdmin, (req, res) => {
    try {
      const { obfuscatedUrl } = req.body;
      
      if (!obfuscatedUrl || !obfuscatedUrl.startsWith('/api/x/')) {
        return res.status(400).json({ error: 'URL ofuscada inválida' });
      }
      
      // Simular decodificación
      const urlParts = obfuscatedUrl.split('/api/x/')[1].split('/');
      const code = urlParts[0];
      const targetRoute = routeMap[code];
      
      if (!targetRoute) {
        return res.status(404).json({ error: 'Ruta no encontrada' });
      }
      
      const additionalSegments = urlParts.slice(1);
      const decodedSegments = additionalSegments.map(deofuscatePathSegment);
      
      let decodedPath = `/api${targetRoute}`;
      if (decodedSegments.length > 0) {
        decodedPath += '/' + decodedSegments.join('/');
      }
      
      res.json({
        original: obfuscatedUrl,
        decoded: decodedPath,
        routeCode: code,
        targetRoute: targetRoute,
        segments: {
          obfuscated: additionalSegments,
          decoded: decodedSegments
        }
      });
      
    } catch (error) {
      res.status(500).json({ error: 'Error en test de decodificación' });
    }
  });
  
  // Estadísticas (OPCIONAL)
  app.get('/api/security/stats', authenticateUser, isAdmin, (req, res) => {
    try {
      res.json(getRouteStats());
    } catch (error) {
      res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
  });
}

console.log('✅ RouteMapper cargado correctamente (compatible con CSRF + soporte multi-nivel)');