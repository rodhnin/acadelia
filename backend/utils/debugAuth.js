// backend/utils/debugAuth.js - HERRAMIENTAS DE DEBUGGING INTENSIVO
import jwt from 'jsonwebtoken';
import { redisService } from '../lib/redis.js';

/**
 * SISTEMA DE DEBUGGING PARA IDENTIFICAR PROBLEMAS DE DESCONEXIÓN
 * 
 * PASO 1: Agregar este archivo a tu backend
 * PASO 2: Importarlo en authMiddleware.js
 * PASO 3: Usar las funciones de debugging
 */

class AuthDebugger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.isEnabled = true; // SIEMPRE habilitado para debugging
    }
    
    /**
     * Log con timestamp y contexto detallado
     */
    log(type, message, data = {}) {
        if (!this.isEnabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type, // 'INFO', 'WARN', 'ERROR', 'TOKEN', 'REDIS', 'RENEWAL'
            message,
            data,
            stack: new Error().stack.split('\n').slice(2, 4) // Context de dónde se llamó
        };
        
        // Agregar a logs internos
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-500); // Mantener últimos 500
        }
        
        // Log a consola con formato claro
        const prefix = this.getLogPrefix(type);
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        if (Object.keys(data).length > 0) {
            console.log(`${prefix} Data:`, JSON.stringify(data, null, 2));
        }
    }
    
    getLogPrefix(type) {
        const prefixes = {
            'INFO': '🔍',
            'WARN': '⚠️',
            'ERROR': '❌',
            'TOKEN': '🎫',
            'REDIS': '🔴',
            'RENEWAL': '🔄',
            'SUCCESS': '✅',
            'FAILURE': '💥'
        };
        return prefixes[type] || '📝';
    }
    
    /**
     * Analizar token JWT en detalle
     */
    analyzeToken(token, secret, context = '') {
        this.log('TOKEN', `Analizando token - ${context}`);
        
        if (!token) {
            this.log('ERROR', 'Token no proporcionado', { context });
            return { valid: false, reason: 'NO_TOKEN' };
        }
        
        try {
            // 1. Decodificar sin verificar
            const decoded = jwt.decode(token, { complete: true });
            
            if (!decoded) {
                this.log('ERROR', 'Token no se puede decodificar', { context, token: token.substring(0, 20) + '...' });
                return { valid: false, reason: 'DECODE_FAILED' };
            }
            
            const { header, payload } = decoded;
            const now = Math.floor(Date.now() / 1000);
            
            // 2. Verificar estructura
            const requiredFields = ['id_user', 'correo', 'sessionId', 'iat', 'exp'];
            const missingFields = requiredFields.filter(field => !payload[field]);
            
            if (missingFields.length > 0) {
                this.log('ERROR', 'Token con campos faltantes', { 
                    context, 
                    missingFields,
                    payload: this.sanitizePayload(payload)
                });
                return { valid: false, reason: 'MISSING_FIELDS', missingFields };
            }
            
            // 3. Verificar tiempos
            const timeInfo = {
                issued: payload.iat,
                expires: payload.exp,
                now,
                age: now - payload.iat,
                timeToExpiry: payload.exp - now,
                isExpired: now > payload.exp,
                issuedDate: new Date(payload.iat * 1000).toISOString(),
                expiresDate: new Date(payload.exp * 1000).toISOString()
            };
            
            this.log('TOKEN', 'Información de tiempo del token', { 
                context,
                ...timeInfo,
                userId: payload.id_user,
                sessionId: payload.sessionId?.substring(0, 8) + '...'
            });
            
            // 4. Verificar firma si se proporciona secreto
            let signatureValid = null;
            let signatureError = null;
            
            if (secret) {
                try {
                    jwt.verify(token, secret);
                    signatureValid = true;
                    this.log('SUCCESS', 'Firma del token válida', { context });
                } catch (verifyError) {
                    signatureValid = false;
                    signatureError = verifyError.name;
                    this.log('ERROR', 'Firma del token inválida', { 
                        context, 
                        error: verifyError.name,
                        message: verifyError.message
                    });
                }
            }
            
            const analysis = {
                valid: signatureValid !== false && !timeInfo.isExpired,
                header,
                payload: this.sanitizePayload(payload),
                timeInfo,
                signatureValid,
                signatureError,
                context
            };
            
            return analysis;
            
        } catch (error) {
            this.log('ERROR', 'Error analizando token', { 
                context, 
                error: error.message,
                stack: error.stack
            });
            return { valid: false, reason: 'ANALYSIS_ERROR', error: error.message };
        }
    }
    
    /**
     * Verificar estado de Redis
     */
    async checkRedisState(userId, sessionId, refreshToken, context = '') {
        this.log('REDIS', `Verificando estado Redis - ${context}`, { userId, sessionId: sessionId?.substring(0, 8) + '...' });
        
        const state = {
            userId,
            sessionId,
            refreshToken: refreshToken?.substring(0, 8) + '...',
            context,
            checks: {},
            timestamp: Date.now()
        };
        
        try {
            // 1. Verificar conexión Redis
            state.checks.redisConnected = redisService.isReady();
            this.log('REDIS', 'Estado conexión Redis', { connected: state.checks.redisConnected });
            
            if (!state.checks.redisConnected) {
                this.log('ERROR', 'Redis no está conectado');
                return state;
            }
            
            // 2. Verificar sesión principal
            const session = await redisService.get(`session:${userId}`);
            state.checks.sessionExists = !!session;
            state.checks.sessionData = session;
            
            this.log('REDIS', 'Sesión en Redis', { 
                exists: state.checks.sessionExists,
                sessionId: session?.sessionId?.substring(0, 8) + '...',
                refreshToken: session?.refreshToken?.substring(0, 8) + '...',
                createdAt: session?.createdAt ? new Date(session.createdAt).toISOString() : null
            });
            
            // 3. Verificar coincidencia de sessionId
            if (session && sessionId) {
                state.checks.sessionIdMatches = session.sessionId === sessionId;
                this.log('REDIS', 'Coincidencia SessionId', { 
                    matches: state.checks.sessionIdMatches,
                    expected: sessionId?.substring(0, 8) + '...',
                    actual: session.sessionId?.substring(0, 8) + '...'
                });
            }
            
            // 4. Verificar refresh token
            if (refreshToken) {
                const storedUserId = await redisService.get(`refresh_token:${refreshToken}`);
                state.checks.refreshTokenExists = !!storedUserId;
                state.checks.refreshTokenMatches = storedUserId == userId;
                
                this.log('REDIS', 'Estado refresh token', {
                    exists: state.checks.refreshTokenExists,
                    matches: state.checks.refreshTokenMatches,
                    storedUserId,
                    expectedUserId: userId
                });
            }
            
            // 5. Calcular coherencia general
            state.checks.coherent = state.checks.sessionExists && 
                                   state.checks.sessionIdMatches && 
                                   (!refreshToken || (state.checks.refreshTokenExists && state.checks.refreshTokenMatches));
            
            this.log('REDIS', 'Coherencia general', { 
                coherent: state.checks.coherent,
                summary: state.checks
            });
            
            return state;
            
        } catch (error) {
            this.log('ERROR', 'Error verificando Redis', { 
                context,
                error: error.message,
                stack: error.stack
            });
            state.error = error.message;
            return state;
        }
    }
    
    /**
     * Trace completo de una verificación de autenticación
     */
    async traceAuthentication(req, context = 'middleware') {
        const traceId = Math.random().toString(36).substring(2, 8);
        
        this.log('INFO', `🔍 INICIANDO TRACE AUTENTICACIÓN [${traceId}]`, { 
            context,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
        });
        
        const trace = {
            traceId,
            context,
            path: req.path,
            method: req.method,
            startTime: Date.now(),
            steps: []
        };
        
        try {
            // PASO 1: Extraer tokens
            const accessToken = req.cookies.token || req.headers.authorization?.split(' ')[1];
            const refreshToken = req.cookies.refresh_token;
            
            trace.steps.push({
                step: 1,
                name: 'Token extraction',
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                accessTokenPreview: accessToken?.substring(0, 20) + '...',
                refreshTokenPreview: refreshToken?.substring(0, 20) + '...'
            });
            
            this.log('INFO', `[${traceId}] PASO 1: Extracción de tokens`, trace.steps[0]);
            
            if (!accessToken) {
                this.log('FAILURE', `[${traceId}] Sin access token`, {});
                return { ...trace, result: 'NO_ACCESS_TOKEN' };
            }
            
            // PASO 2: Analizar access token
            const tokenAnalysis = this.analyzeToken(accessToken, process.env.JWT_SECRET, `trace-${traceId}`);
            trace.steps.push({
                step: 2,
                name: 'Access token analysis',
                ...tokenAnalysis
            });
            
            this.log('INFO', `[${traceId}] PASO 2: Análisis de access token`, {
                valid: tokenAnalysis.valid,
                expired: tokenAnalysis.timeInfo?.isExpired,
                timeToExpiry: tokenAnalysis.timeInfo?.timeToExpiry
            });
            
            // PASO 3: Verificar estado en Redis
            if (tokenAnalysis.valid && tokenAnalysis.payload) {
                const redisState = await this.checkRedisState(
                    tokenAnalysis.payload.id_user,
                    tokenAnalysis.payload.sessionId,
                    refreshToken,
                    `trace-${traceId}`
                );
                
                trace.steps.push({
                    step: 3,
                    name: 'Redis state verification',
                    ...redisState
                });
                
                this.log('INFO', `[${traceId}] PASO 3: Verificación Redis`, {
                    coherent: redisState.checks?.coherent,
                    sessionExists: redisState.checks?.sessionExists,
                    sessionIdMatches: redisState.checks?.sessionIdMatches
                });
                
                // PASO 4: Determinar resultado
                if (tokenAnalysis.valid && redisState.checks?.coherent) {
                    trace.result = 'SUCCESS';
                    this.log('SUCCESS', `[${traceId}] ✅ AUTENTICACIÓN EXITOSA`);
                } else if (tokenAnalysis.timeInfo?.isExpired && refreshToken) {
                    trace.result = 'NEEDS_RENEWAL';
                    this.log('RENEWAL', `[${traceId}] 🔄 REQUIERE RENOVACIÓN`);
                } else {
                    trace.result = 'FAILURE';
                    this.log('FAILURE', `[${traceId}] 💥 AUTENTICACIÓN FALLIDA`, {
                        tokenValid: tokenAnalysis.valid,
                        redisCoherent: redisState.checks?.coherent
                    });
                }
            } else {
                trace.result = 'INVALID_TOKEN';
                this.log('FAILURE', `[${traceId}] 💥 TOKEN INVÁLIDO`);
            }
            
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            
            this.log('INFO', `🏁 FINALIZANDO TRACE [${traceId}]`, {
                result: trace.result,
                duration: `${trace.duration}ms`,
                steps: trace.steps.length
            });
            
            return trace;
            
        } catch (error) {
            this.log('ERROR', `[${traceId}] Error en trace`, {
                error: error.message,
                stack: error.stack
            });
            
            trace.error = error.message;
            trace.result = 'ERROR';
            return trace;
        }
    }
    
    /**
     * Monitoreo en tiempo real de renovaciones
     */
    startRenewalMonitoring() {
        this.log('INFO', '🚀 Iniciando monitoreo de renovaciones');
        
        // Tracking de renovaciones en progreso
        this.renewalTracking = new Map();
        
        // Interceptar función de renovación (si existe)
        this.originalRenewalFunction = null;
    }
    
    /**
     * Limpiar payload de información sensible para logs
     */
    sanitizePayload(payload) {
        const sanitized = { ...payload };
        // Mantener campos importantes, remover sensibles si los hay
        return {
            id_user: sanitized.id_user,
            correo: sanitized.correo,
            sessionId: sanitized.sessionId?.substring(0, 8) + '...',
            id_rol: sanitized.id_rol,
            iat: sanitized.iat,
            exp: sanitized.exp
        };
    }
    
    /**
     * Obtener últimos logs filtrados
     */
    getRecentLogs(type = null, limit = 50) {
        let logs = this.logs;
        
        if (type) {
            logs = logs.filter(log => log.type === type);
        }
        
        return logs.slice(-limit);
    }
    
    /**
     * Generar reporte de debugging
     */
    generateDebugReport() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const recentLogs = this.logs.filter(log => 
            now - new Date(log.timestamp).getTime() < oneHour
        );
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalLogs: this.logs.length,
                recentLogs: recentLogs.length,
                errors: recentLogs.filter(log => log.type === 'ERROR').length,
                warnings: recentLogs.filter(log => log.type === 'WARN').length,
                renewals: recentLogs.filter(log => log.type === 'RENEWAL').length,
                redisIssues: recentLogs.filter(log => log.type === 'REDIS' && log.message.includes('Error')).length
            },
            recentErrors: recentLogs
                .filter(log => log.type === 'ERROR')
                .map(log => ({
                    timestamp: log.timestamp,
                    message: log.message,
                    data: log.data
                })),
            recentWarnings: recentLogs
                .filter(log => log.type === 'WARN')
                .map(log => ({
                    timestamp: log.timestamp,
                    message: log.message,
                    data: log.data
                })),
            systemHealth: {
                redisConnected: redisService.isReady(),
                jwtSecret: !!process.env.JWT_SECRET,
                nodeEnv: process.env.NODE_ENV
            }
        };
        
        return report;
    }
}

// Instancia global del debugger
export const authDebugger = new AuthDebugger();

// Middleware de debugging para insertar en rutas
export const debugAuthMiddleware = (req, res, next) => {
    // Solo ejecutar en rutas que requieren autenticación
    if (req.path.startsWith('/api/') && req.method !== 'GET') {
        authDebugger.traceAuthentication(req, 'middleware')
            .then(trace => {
                req.authTrace = trace;
                next();
            })
            .catch(error => {
                authDebugger.log('ERROR', 'Error en debug middleware', {
                    error: error.message,
                    path: req.path
                });
                next();
            });
    } else {
        next();
    }
};

// Endpoint de debugging (agregar a rutas)
export const debugEndpoint = (req, res) => {
    const { action } = req.query;
    
    switch (action) {
        case 'report':
            return res.json(authDebugger.generateDebugReport());
            
        case 'logs':
            const type = req.query.type;
            const limit = parseInt(req.query.limit) || 50;
            return res.json(authDebugger.getRecentLogs(type, limit));
            
        case 'trace':
            authDebugger.traceAuthentication(req, 'manual')
                .then(trace => res.json(trace))
                .catch(error => res.status(500).json({ error: error.message }));
            break;
            
        case 'analyze-token':
            const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(400).json({ error: 'No token found' });
            }
            const analysis = authDebugger.analyzeToken(token, process.env.JWT_SECRET, 'manual');
            return res.json(analysis);
            
        case 'redis-state':
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            authDebugger.checkRedisState(
                req.user.id_user,
                req.user.sessionId,
                req.cookies.refresh_token,
                'manual'
            ).then(state => res.json(state))
             .catch(error => res.status(500).json({ error: error.message }));
            break;
            
        default:
            return res.json({
                availableActions: ['report', 'logs', 'trace', 'analyze-token', 'redis-state'],
                examples: [
                    '/api/debug/auth?action=report',
                    '/api/debug/auth?action=logs&type=ERROR&limit=20',
                    '/api/debug/auth?action=trace',
                    '/api/debug/auth?action=analyze-token',
                    '/api/debug/auth?action=redis-state'
                ]
            });
    }
};

console.log('🔍 AuthDebugger inicializado - Debugging intensivo habilitado');