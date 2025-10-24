// backend/middlewares/authMiddleware.js - VERSIÓN MEJORADA PARA PRODUCCIÓN
import jwt from "jsonwebtoken";
import { AuthService } from "../services/usuarios/authService.js";
import { redisService } from "../lib/redis.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logSecurityEvent } from '../utils/securityLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

// 🆕 Cache mejorado con cleanup automático
const renewalCache = new Map();
const RENEWAL_CACHE_TTL = 30000; // 30 segundos

// 🆕 Cleanup automático para prevenir memory leaks
const cleanupRenewalCache = () => {
    const now = Date.now();
    for (const [key, data] of renewalCache) {
        if (data.expiry && data.expiry < now) {
            renewalCache.delete(key);
        }
    }
};

// 🆕 Ejecutar cleanup cada 5 minutos
setInterval(cleanupRenewalCache, 5 * 60 * 1000);

/**
 * Maneja respuestas 401 según el tipo de solicitud
 */
const handle401 = (req, res, errorMessage = "Acceso denegado, no hay token", errorCode = "NO_TOKEN") => {
    // Log básico para monitoreo
    console.log(`[AUTH] 401 - ${errorCode}: ${errorMessage} | Path: ${req.path} | RefreshToken: ${!!req.cookies.refresh_token}`);
    
    // Respuesta JSON para APIs
    if (req.path.startsWith('/api/') || 
        req.xhr || 
        req.get('accept')?.includes('application/json') ||
        req.get('Content-Type')?.includes('application/json')) {
        
        return res.status(401).json({ 
            error: errorMessage, 
            code: errorCode 
        });
    }
    
    // Respuesta HTML para páginas web
    const errorPath = path.join(projectRoot, 'frontend', 'views', 'error', '401.html');
    if (fs.existsSync(errorPath)) {
        return res.status(401).sendFile(errorPath);
    }
    
    res.status(401).send('Es necesario iniciar sesión para acceder a este recurso');
};

/**
 * 🆕 Renueva tokens de forma segura con sistema de locks mejorado
 */
async function renewTokenWithLock(refreshToken, res, req) {
    const lockKey = `renewal_lock:${refreshToken}`;
    const traceId = Math.random().toString(36).substring(2, 8);
    
    try {
        // 🆕 Verificar si ya hay una renovación en progreso con TTL
        const existingRenewal = renewalCache.get(refreshToken);
        if (existingRenewal) {
            if (existingRenewal.expiry > Date.now()) {
                console.log(`[AUTH] Esperando renovación en progreso [${traceId}]`);
                return await existingRenewal.promise;
            } else {
                // 🆕 Cleanup de entrada expirada
                renewalCache.delete(refreshToken);
            }
        }
        
        // 🆕 Verificar lock en Redis con timeout
        const existingLock = await Promise.race([
            redisService.get(lockKey),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Lock check timeout')), 1000)
            )
        ]).catch(() => null);
        
        if (existingLock) {
            console.log(`[AUTH] Lock Redis detectado, esperando... [${traceId}]`);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 🆕 Intentar una vez más después de esperar
            try {
                return await AuthService.refreshTokens(refreshToken);
            } catch (retryError) {
                console.warn(`[AUTH] Retry after lock failed [${traceId}]:`, retryError.message);
                throw retryError;
            }
        }
        
        // 🆕 Crear lock en Redis con timeout más corto
        const lockSet = await Promise.race([
            redisService.set(lockKey, traceId, 10), // 10 segundos
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Lock set timeout')), 1000)
            )
        ]).catch(() => false);
        
        if (!lockSet) {
            console.warn(`[AUTH] No se pudo establecer lock [${traceId}]`);
        }
        
        // 🆕 Crear promesa de renovación con TTL
        const renewalPromise = AuthService.refreshTokens(refreshToken);
        renewalCache.set(refreshToken, {
            promise: renewalPromise,
            expiry: Date.now() + RENEWAL_CACHE_TTL
        });
        
        const tokens = await renewalPromise;
        
        // 🆕 Establecer nueva cookie inmediatamente con verificación
        if (res && typeof res.cookie === 'function') {
            res.cookie("token", tokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                sameSite: "Strict",
                maxAge: 900000, // 15 minutos
                path: "/",
                domain: process.env.COOKIE_DOMAIN || undefined,
            });
            console.log(`[AUTH] Token renovado exitosamente para usuario ${tokens.user?.id_user} [${traceId}]`);
        }
        
        return tokens;
        
    } catch (error) {
        console.error(`[AUTH] Error en renovación [${traceId}]:`, error.message);
        
        // 🆕 Cleanup en caso de error
        renewalCache.delete(refreshToken);
        
        throw error;
    } finally {
        // 🆕 Limpiar cache y lock con timeout para evitar bloqueos
        setTimeout(() => {
            renewalCache.delete(refreshToken);
        }, 100);
        
        // 🆕 Limpiar lock con timeout para evitar bloqueos
        setTimeout(async () => {
            try {
                await Promise.race([
                    redisService.delete(lockKey),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Lock cleanup timeout')), 1000)
                    )
                ]);
            } catch (cleanupError) {
                console.warn(`[AUTH] Error cleaning up lock [${traceId}]:`, cleanupError.message);
            }
        }, 50);
    }
}

/**
 * 🆕 Verificar sesión con reintentos mejorados
 */
async function verifySessionWithRetry(decoded, tokenWasRenewed = false) {
    const maxRetries = tokenWasRenewed ? 3 : 1;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            const activeSession = await Promise.race([
                redisService.get(`session:${decoded.id_user}`),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Session check timeout')), 2000)
                )
            ]);
            
            if (!activeSession) {
                if (retryCount < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retryCount++;
                    continue;
                }
                return { valid: false, reason: "SESSION_NOT_FOUND" };
            }
            
            if (activeSession.sessionId !== decoded.sessionId) {
                if (tokenWasRenewed && retryCount < maxRetries - 1) {
                    console.log(`[AUTH] SessionId no coincide, reintentando... (${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retryCount++;
                    continue;
                }
                return { valid: false, reason: "SESSION_REVOKED" };
            }
            
            return { valid: true, session: activeSession };
            
        } catch (sessionError) {
            if (retryCount < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retryCount++;
            } else {
                console.error(`[AUTH] Error verificando sesión:`, sessionError.message);
                return { valid: false, reason: "SESSION_ERROR" };
            }
        }
    }
    
    return { valid: false, reason: "MAX_RETRIES_EXCEEDED" };
}

/**
 * Middleware principal de autenticación
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        const refreshToken = req.cookies.refresh_token;

        // NUEVA LÓGICA: Renovación inmediata si no hay access token pero sí refresh token
        if (!token) {
            if (refreshToken) {
                console.log(`[AUTH] Sin access token, intentando renovación inmediata | Path: ${req.path}`);
                
                try {
                    // 🆕 Renovar usando refresh token con manejo de errores mejorado
                    const tokens = await renewTokenWithLock(refreshToken, res, req);
                    
                    // 🆕 Verificar token inmediatamente después de renovación
                    const decoded = jwt.verify(tokens.accessToken, ACCESS_TOKEN_SECRET);
                    
                    // 🆕 Verificar sesión con reintentos
                    const sessionCheck = await verifySessionWithRetry(decoded, true);
                    if (!sessionCheck.valid) {
                        console.error(`[AUTH] Sesión no válida después de renovación inmediata: ${sessionCheck.reason}`);
                        return handle401(req, res, "Sesión no válida después de renovación", "SESSION_INVALID");
                    }
                    
                    req.user = decoded;
                    req.tokenWasRenewed = true;
                    
                    console.log(`[AUTH] Renovación inmediata exitosa para usuario ${decoded.id_user}`);
                    return next();
                    
                } catch (renewalError) {
                    console.error(`[AUTH] Error en renovación inmediata:`, renewalError.message);
                    return handle401(req, res, "Error al renovar token", "RENEWAL_FAILED");
                }
            } else {
                return handle401(req, res);
            }
        }

        // Si hay access token, verificarlo
        let decoded;
        let tokenWasRenewed = false;
        
        try {
            decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        } catch (jwtError) {
            // Token expirado, intentar renovación automática
            if (jwtError.name === 'TokenExpiredError' && refreshToken) {
                try {
                    console.log(`[AUTH] Token expirado, renovando automáticamente`);
                    
                    const tokens = await renewTokenWithLock(refreshToken, res, req);
                    decoded = jwt.verify(tokens.accessToken, ACCESS_TOKEN_SECRET);
                    tokenWasRenewed = true;
                    
                    console.log(`[AUTH] Token renovado automáticamente para usuario ${decoded.id_user}`);
                    
                } catch (refreshError) {
                    console.error(`[AUTH] Error en renovación automática:`, refreshError.message);
                    return handle401(req, res, "Sesión expirada", "SESSION_EXPIRED");
                }
            } else {
                return handle401(req, res, "Token inválido", "INVALID_TOKEN");
            }
        }
        
        // Verificar estructura del token
        if (!decoded.id_user || !decoded.sessionId) {
            console.error(`[AUTH] Token con formato incorrecto`);
            return handle401(req, res, "Token inválido: formato incorrecto", "INVALID_TOKEN");
        }

        // 🆕 Verificar sesión activa con sistema de reintentos mejorado
        const sessionCheck = await verifySessionWithRetry(decoded, tokenWasRenewed);
        if (!sessionCheck.valid) {
            return handle401(req, res, `Sesión no válida: ${sessionCheck.reason}`, sessionCheck.reason);
        }

        // Autenticación exitosa
        req.user = decoded;
        req.tokenWasRenewed = tokenWasRenewed;
        
        next();
        
    } catch (error) {
        console.error(`[AUTH] Error general en authenticateUser:`, error.message);
        return handle401(req, res, "Error de autenticación", "AUTH_ERROR");
    }
};

/**
 * Verifica el estado de autenticación (endpoint público)
 */
export const checkAuthStatus = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(200).json({ 
                authenticated: false, 
                reason: "NO_TOKEN",
                message: "No se encontró token de autenticación"
            });
        }

        let decoded;
        let tokenRenewed = false;

        try {
            decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        } catch (jwtError) {
            // Token expirado, intentar renovación
            if (jwtError.name === 'TokenExpiredError' && req.cookies.refresh_token) {
                try {
                    const tokens = await renewTokenWithLock(req.cookies.refresh_token, res, req);
                    decoded = jwt.verify(tokens.accessToken, ACCESS_TOKEN_SECRET);
                    tokenRenewed = true;
                    
                } catch (refreshError) {
                    return res.status(200).json({ 
                        authenticated: false, 
                        reason: "SESSION_EXPIRED",
                        message: "Sesión expirada, por favor inicie sesión nuevamente"
                    });
                }
            } else {
                return res.status(200).json({ 
                    authenticated: false, 
                    reason: "INVALID_TOKEN",
                    message: "Token inválido"
                });
            }
        }

        if (!decoded.id_user || !decoded.sessionId) {
            return res.status(200).json({ 
                authenticated: false,
                reason: "INVALID_TOKEN",
                message: "Token inválido: formato incorrecto"
            });
        }

        // 🆕 Verificar sesión activa con sistema de reintentos
        const sessionCheck = await verifySessionWithRetry(decoded, tokenRenewed);
        if (!sessionCheck.valid) {
            return res.status(200).json({ 
                authenticated: false, 
                reason: sessionCheck.reason,
                message: sessionCheck.reason === "SESSION_REVOKED" 
                    ? "Sesión cerrada en otro dispositivo"
                    : "Sesión no encontrada"
            });
        }

        return res.status(200).json({
            authenticated: true,
            tokenRenewed,
            user: {
                id_user: decoded.id_user,
                correo: decoded.correo,
                id_rol: decoded.id_rol || 1
            }
        });
        
    } catch (error) {
        console.error(`[AUTH] Error en checkAuthStatus:`, error.message);
        return res.status(200).json({ 
            authenticated: false, 
            reason: "AUTH_ERROR",
            message: "Error en el sistema de autenticación"
        });
    }
};

/**
 * Middleware de autenticación opcional (no falla si no hay token)
 */
export const optionalAuthenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            req.user = null;
            return next();
        }

        let decoded;
        try {
            decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
            
            if (!decoded.id_user || !decoded.sessionId) {
                req.user = null;
                return next();
            }

            // 🆕 Verificar sesión activa (sin retry para optional auth)
            const sessionCheck = await verifySessionWithRetry(decoded, false);
            if (!sessionCheck.valid) {
                req.user = null;
                return next();
            }

            req.user = decoded;
            next();
            
        } catch (jwtError) {
            // Intentar renovación si el token expiró
            if (jwtError.name === 'TokenExpiredError' && req.cookies.refresh_token) {
                try {
                    const tokens = await renewTokenWithLock(req.cookies.refresh_token, res, req);
                    decoded = jwt.verify(tokens.accessToken, ACCESS_TOKEN_SECRET);
                    
                    // 🆕 Verificar sesión para el token renovado
                    const sessionCheck = await verifySessionWithRetry(decoded, true);
                    if (sessionCheck.valid) {
                        req.user = decoded;
                        req.tokenWasRenewed = true;
                    } else {
                        req.user = null;
                    }
                    
                    next();
                } catch (refreshError) {
                    req.user = null;
                    next();
                }
            } else {
                req.user = null;
                next();
            }
        }
    } catch (error) {
        console.warn(`[AUTH] Error en optionalAuth:`, error.message);
        req.user = null;
        next();
    }
};

/**
 * Obtiene información del usuario autenticado
 */
export const getAuthenticatedUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user?.id_user) {
            return res.status(404).json({ error: "Usuario no autenticado" });
        }

        res.status(200).json({
            id_user: user.id_user,
            correo: user.correo,
            id_rol: user.id_rol || 1,
            tokenWasRenewed: req.tokenWasRenewed || false
        });
    } catch (error) {
        console.error(`[AUTH] Error obteniendo usuario:`, error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * Middleware para verificar roles específicos
 */
export const hasRole = (roleId) => {
    return (req, res, next) => {
        if (!req.user) {
            logSecurityEvent('ROLE_CHECK_NO_AUTH', 'Intento de acceso a recurso protegido sin autenticación', {
                path: req.path,
                roleRequired: roleId,
                ip: req.ip
            }, 'medium');
            
            return res.status(401).json({ error: "Acceso denegado" });
        }
        
        if (req.user.id_rol !== roleId) {
            logSecurityEvent('INSUFFICIENT_ROLE', 'Intento de acceso con privilegios insuficientes', {
                userId: req.user.id_user,
                path: req.path,
                userRole: req.user.id_rol,
                requiredRole: roleId,
                ip: req.ip
            }, 'high');
            
            return res.status(403).json({ error: "No tiene permisos para acceder a este recurso" });
        }
        
        next();
    };
};

// 🆕 Cleanup al cerrar la aplicación
process.on('SIGINT', () => {
    console.log('[AUTH] Limpiando cache de renovaciones...');
    renewalCache.clear();
});

process.on('SIGTERM', () => {
    renewalCache.clear();
});

console.log('[AUTH] ✅ AuthMiddleware mejorado cargado correctamente');