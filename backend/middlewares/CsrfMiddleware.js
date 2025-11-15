// middlewares/CsrfMiddleware.js - REEMPLAZAR TODO EL ARCHIVO
import crypto from 'crypto';

// CONFIGURACIÓN SIMPLE - SIN TRANSICIONES
const CONFIG = {
    tokenExpiry: 24 * 60 * 60 * 1000,    // 24 horas
    enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Generar token CSRF seguro - 40 caracteres
 */
const generateCsrfToken = () => {
    return crypto.randomBytes(20).toString('hex');
};

/**
 * Logging simple
 */
const log = (message, ...args) => {
    if (CONFIG.enableLogging) {
        console.log(`🔒 [CSRF] ${message}`, ...args);
    }
};

const error = (message, ...args) => {
    console.error(`❌ [CSRF] ${message}`, ...args);
};

/**
 * Middleware CSRF SIMPLIFICADO - Sin transiciones
 */
export const setupCookieCsrf = (req, res, next) => {
    let csrfToken = req.cookies['XSRF-TOKEN'];
    
    // Solo generar nuevo token si no existe o es inválido
    if (!csrfToken || csrfToken.length !== 40 || !/^[a-f0-9]{40}$/i.test(csrfToken)) {
        csrfToken = generateCsrfToken();
        
        res.cookie('XSRF-TOKEN', csrfToken, {
            httpOnly: false,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: CONFIG.tokenExpiry,
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        
        log(`Nuevo token generado: ${csrfToken.substring(0, 12)}...`);
    }
    
    req.csrfToken = csrfToken;
    next();
};

/**
 * Verificación CSRF SIMPLIFICADA - Sin transiciones
 */
export const verifyCookieCsrf = (req, res, next) => {
    // Skip para métodos seguros
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    // Rutas excluidas
    const skipPaths = [
        '/api/webhook/paddle',
        '/api/csrf-token',
        '/api/usuarios/auth-status',
        '/webhooks-arg/uala'
    ];
    
    if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    
    const receivedToken = req.headers['x-csrf-token'] || 
                         req.headers['x-xsrf-token'] || 
                         req.headers['csrf-token'] ||
                         req.body?._csrf;
                         
    const cookieToken = req.cookies['XSRF-TOKEN'];
    
    if (!receivedToken) {
        error(`Token no enviado para ${req.method} ${req.path}`);
        return res.status(403).json({
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
        });
    }
    
    if (!cookieToken) {
        error(`Cookie XSRF-TOKEN no encontrada para ${req.method} ${req.path}`);
        return res.status(403).json({
            error: 'CSRF cookie missing',  
            code: 'CSRF_COOKIE_MISSING'
        });
    }
    
    // Verificación simple: tokens deben coincidir
    if (receivedToken !== cookieToken) {
        error(`Tokens NO coinciden para ${req.method} ${req.path}`);
        return res.status(403).json({
            error: 'CSRF token mismatch',
            code: 'CSRF_TOKEN_MISMATCH'
        });
    }
    
    log(`Token válido para ${req.method} ${req.path}`);
    next();
};

/**
 * Endpoint para obtener token CSRF
 */
export const getCsrfTokenEndpoint = (req, res) => {
    const token = req.csrfToken || req.cookies['XSRF-TOKEN'];
    
    if (!token) {
        return res.status(500).json({ 
            error: 'Token not available',
            code: 'CSRF_TOKEN_UNAVAILABLE'
        });
    }
    
    res.json({ 
        csrfToken: token,
        tokenLength: token.length,
        timestamp: Date.now()
    });
};

/**
 * Resetear token CSRF (solo para casos especiales)
 */
export const resetCsrfToken = (req, res) => {
    log(`Reseteando token para ${req.ip}`);
    
    res.clearCookie('XSRF-TOKEN', {
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    const newToken = generateCsrfToken();
    
    res.cookie('XSRF-TOKEN', newToken, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CONFIG.tokenExpiry,
        domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    res.json({
        success: true,
        newToken: newToken,
        tokenLength: newToken.length,
        message: 'Token CSRF reseteado exitosamente'
    });
};

if (CONFIG.enableLogging) {
    console.log('🔒 [CSRF] Sistema simplificado cargado');
    console.log('  ✅ Sin transiciones complejas');
    console.log('  ✅ Token único por sesión');
    console.log('  ✅ Renovación solo cuando es necesario');
}