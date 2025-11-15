// ARREGLADO - SIN CAMBIAR NOMBRES, SIN ROMPER CSRF, CON SOPORTE MULTI-NIVEL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let routeMap = {};
let parameterMap = {};

try {
  const mapPath = path.join(__dirname, '../utils/routeMap.json');
  if (fs.existsSync(mapPath)) {
    routeMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    console.log(`✅ Mapa de rutas API cargado: ${Object.keys(routeMap).length} rutas seguras`);
    
    const paramMapPath = path.join(__dirname, '../utils/parameterMap.json');
    if (fs.existsSync(paramMapPath)) {
      parameterMap = JSON.parse(fs.readFileSync(paramMapPath, 'utf8'));
      console.log(`✅ Mapa de parámetros cargado: ${Object.keys(parameterMap).length} parámetros configurados`);
    } else {
      parameterMap = {
        "verifyPassword": generateHashCode("verifyPassword"),
        "carrera": generateHashCode("carrera"),
        "active": generateHashCode("active"),
        "refresh-token": generateHashCode("refresh-token"),
        "token": generateHashCode("token"),
        "login": generateHashCode("login"),
        "register": generateHashCode("register"),
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

function generateHashCode(str) {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

function createReverseParameterMap() {
  const reverseMap = {};
  Object.entries(parameterMap).forEach(([original, hashed]) => {
    reverseMap[hashed] = original;
  });
  return reverseMap;
}

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
  
  try {
    parameterMap[segment] = hash;
    const paramMapPath = path.join(__dirname, '../utils/parameterMap.json');
    fs.writeFileSync(paramMapPath, JSON.stringify(parameterMap, null, 2));
  } catch (err) {
    // No crítico si falla
  }
  
  return hash;
}

function deofuscatePathSegment(ofuscatedSegment) {
  const reverseMap = createReverseParameterMap();
  
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

export function routeMapper(req, res, next) {
  if (!req.originalUrl.startsWith('/api/x/') || Object.keys(routeMap).length === 0) {
    // Si no hay mapas o no es ruta ofuscada, continuar normalmente
    return next();
  }
  
  try {
    const [basePath, queryString] = req.originalUrl.split('?');
    const urlParts = basePath.split('/api/x/')[1].split('/');
    const code = urlParts[0];
    
    const targetRoute = routeMap[code];
    
    if (!targetRoute) {
      console.warn(`⚠️ Ruta ofuscada no encontrada: /api/x/${code}`);
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    // Debug solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Ruta ofuscada detectada: ${req.originalUrl} → /api${targetRoute}`);
    }
    
    const additionalSegments = urlParts.slice(1); // Todo después del código de ruta
    const decodedSegments = [];
    
    for (const segment of additionalSegments) {
      if (segment && segment.trim() !== '') {
        const decodedSegment = deofuscatePathSegment(segment);
        decodedSegments.push(decodedSegment);
        
        if (process.env.NODE_ENV === 'development' && decodedSegment !== segment) {
          console.log(`  🔓 Segmento decodificado: ${segment} → ${decodedSegment}`);
        }
      }
    }
    
    let newPath = `/api${targetRoute}`;
    if (decodedSegments.length > 0) {
      newPath += '/' + decodedSegments.join('/');
    }
    
    if (queryString) {
      newPath += '?' + queryString;
    }
    
    req.url = newPath;
    
    // Esto garantiza que CSRF y auth funcionen correctamente
    
    console.log(`🔄 Ruta mapeada: ${req.originalUrl} → ${req.url}`);
    
    next();
    
  } catch (error) {
    console.error('❌ Error en routeMapper:', error);
    return res.status(500).json({ error: 'Error procesando la ruta' });
  }
}

export function normalizeErrors(req, res, next) {
  const originalStatus = res.status;
  
  res.status = function(code) {
    if (code >= 400 && code < 500 && req.url.startsWith('/api/')) {
      // Mantener códigos importantes
      const preserveCodes = [401, 403, 404, 429];
      if (!preserveCodes.includes(code)) {
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

export function getParameterMap() {
  return parameterMap;
}

let requestStats = {
  total: 0,
  apiRequests: 0,
  obfuscatedRequests: 0,
  errorRequests: 0,
  decodedSegments: 0
};

// Middleware para contar requests (OPCIONAL)
export function trackRequests(req, res, next) {
  requestStats.total++;
  
  if (req.url.startsWith('/api/')) {
    requestStats.apiRequests++;
  }
  
  if (req.originalUrl.startsWith('/api/x/')) {
    requestStats.obfuscatedRequests++;
    
    const urlParts = req.originalUrl.split('/api/x/')[1].split('/');
    if (urlParts.length > 1) {
      requestStats.decodedSegments += urlParts.length - 1;
    }
  }
  
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      requestStats.errorRequests++;
    }
  });
  
  next();
}

export function getRouteStats() {
  return {
    ...requestStats,
    obfuscatedRoutes: Object.keys(routeMap).length,
    mappedParameters: Object.keys(parameterMap).length,
    uptime: process.uptime()
  };
}

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