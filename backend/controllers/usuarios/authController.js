import { AuthService } from "../../services/usuarios/authService.js";
import { notificationService } from "../../services/usuarios/notificationService.js";
import { Logger } from "../../utils/logger.js";
import {
    parseUserAgent,
    formatUserAgentForDisplay,
    getSecurityAlertInfo
} from '../../utils/userAgentParser.js';

const activeConnections = new Map();

const cleanupActiveConnections = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, connection] of activeConnections) {
        if (connection.expiry && connection.expiry < now) {
            if (connection.timeoutId) {
                clearTimeout(connection.timeoutId);
            }
            activeConnections.delete(key);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        Logger.debug(`Cleaned up ${cleanedCount} expired connections`);
    }
};

setInterval(cleanupActiveConnections, 2 * 60 * 1000);

const cleanupConnection = (connectionId) => {
    const connection = activeConnections.get(connectionId);
    if (connection) {
        if (connection.timeoutId) {
            clearTimeout(connection.timeoutId);
        }
        activeConnections.delete(connectionId);
        Logger.debug(`Connection ${connectionId} cleaned up`);
    }
};

const sendLongpollResponse = (res, data, statusCode = 200) => {
    if (!res.headersSent) {
        try {
            res.status(statusCode).json({
                ...data,
                timestamp: Date.now()
            });
        } catch (error) {
            Logger.error('Error enviando respuesta longpolling', error);
        }
    }
};

/**
 * Endpoint para longpolling de intentos de inicio de sesión
 * Espera hasta que haya un intento nuevo o se alcance el timeout
 * Nota: Este endpoint siempre devuelve 200 para evitar errores en consola durante polling
 */
export const longPollLoginAttempts = async (req, res) => {
    const connectionId = `longpoll_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    try {
        req.setTimeout(40000); // 40 segundos - un poco más que el timeout del cliente

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const userId = req.params.userId;

        if (!userId || userId === 'undefined' || userId === 'null') {
            Logger.warn('Longpoll: ID de usuario inválido', { userId, ip: req.ip });
            return sendLongpollResponse(res, {
                status: "error",
                message: "ID de usuario inválido",
                pendingAttempt: null
            });
        }

        // Verificaciones de autenticación (código existente)
        if (!req.user || !req.user.id_user) {
            Logger.warn('Longpoll: Usuario no autenticado', { ip: req.ip });
            return sendLongpollResponse(res, {
                status: "unauthenticated",
                message: "No hay sesión activa",
                pendingAttempt: null
            });
        }

        if (req.user.id_user != userId) {
            Logger.security(`Longpoll: Usuario ${req.user.id_user} intenta acceder a intentos de ${userId}`, {
                requesterId: req.user.id_user,
                targetUserId: userId,
                ip: req.ip
            });
            return sendLongpollResponse(res, {
                status: "unauthorized",
                message: "No tienes permiso para ver estos intentos",
                pendingAttempt: null
            });
        }

        Logger.info(`Longpoll iniciado para usuario ${userId}`, { userId, ip: req.ip, connectionId });

        try {
            const pendingAttempt = await notificationService.checkForPendingAttempt(userId);

            if (pendingAttempt) {
                Logger.info(`Longpoll: Intento pendiente encontrado inmediatamente para usuario ${userId}`, { userId });

                // NUEVO: Enriquecer con información parseada si no la tiene
                if (!pendingAttempt.userAgentInfo && pendingAttempt.userAgent) {
                    const userAgentInfo = parseUserAgent(pendingAttempt.userAgent);
                    const userAgentDisplay = formatUserAgentForDisplay(pendingAttempt.userAgent, {
                        showIcons: true,
                        format: 'full'
                    });
                    const securityInfo = getSecurityAlertInfo(pendingAttempt.userAgent);

                    pendingAttempt.userAgentInfo = userAgentInfo;
                    pendingAttempt.userAgentDisplay = userAgentDisplay;
                    pendingAttempt.securityInfo = securityInfo;
                }

                // Si hay un intento pendiente, responder de inmediato
                return sendLongpollResponse(res, {
                    status: "success",
                    pendingAttempt
                });
            }
        } catch (pendingCheckError) {
            Logger.error('Error verificando intentos pendientes', pendingCheckError, { userId });
        }

        let connectionClosed = false;

        const handleConnectionClose = () => {
            Logger.info(`Longpoll: Conexión cerrada por cliente para usuario ${userId}`, { userId, connectionId });
            connectionClosed = true;
            cleanupConnection(connectionId);
        };

        req.on('close', handleConnectionClose);
        req.on('aborted', handleConnectionClose);

        const timeoutId = setTimeout(() => {
            if (!res.headersSent && !connectionClosed) {
                Logger.info(`Longpoll: Timeout alcanzado para usuario ${userId}`, { userId, connectionId });
                sendLongpollResponse(res, {
                    status: "timeout",
                    message: "Timeout de longpolling alcanzado",
                    pendingAttempt: null
                });
            }
            cleanupConnection(connectionId);
        }, 35000); // 35 segundos

        activeConnections.set(connectionId, {
            userId,
            req,
            res,
            timeoutId,
            expiry: Date.now() + 40000 // 40 segundos
        });

        res.on('finish', () => {
            cleanupConnection(connectionId);
        });

        res.on('close', () => {
            cleanupConnection(connectionId);
        });

        res.on('error', (error) => {
            Logger.error('Error en respuesta longpolling', error, { userId, connectionId });
            cleanupConnection(connectionId);
        });

        // Si no hay intento pendiente, registrar la conexión para notificación futura
        Logger.info(`Longpoll: Registrando conexión para usuario ${userId}`, { userId, connectionId });
        notificationService.registerConnection(userId, res);

    } catch (error) {
        Logger.error('Error en longpolling de intentos de login', error, {
            userId: req.params.userId,
            ip: req.ip,
            path: req.path,
            connectionId
        });

        cleanupConnection(connectionId);

        if (!res.headersSent) {
            sendLongpollResponse(res, {
                status: "error",
                message: "Error interno del servidor",
                pendingAttempt: null,
                errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Configurar cookies de autenticación
 */
function setCookies(res, tokens) {
    res.cookie("token", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Strict",
        maxAge: 900000, // 15 minutos
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
    });

    res.cookie("refresh_token", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Strict",
        maxAge: 604800000, // 7 días
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
    });
}

/**
 * Limpiar cookies de autenticación
 */
function clearCookies(res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Strict",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Strict",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.clearCookie("XSRF-TOKEN", {
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined
    });
}

/**
 * Extraer datos de request para el servicio
 */
function extractRequestData(req) {
    return {
        ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
        headers: req.headers,
        sessionID: req.sessionID
    };
}

function handleError(res, error, additionalInfo = {}) {
    Logger.error("Error en operación de autenticación", error, additionalInfo);

    if (res.headersSent) {
        Logger.warn("Intento de enviar respuesta cuando headers ya fueron enviados", additionalInfo);
        return;
    }

    switch (error.message) {
        case "USER_NOT_FOUND":
            return res.status(200).json({
                status: "error",
                error: "Usuario no encontrado",
                code: "USER_NOT_FOUND"
            });

        case "INVALID_CREDENTIALS":
            return res.status(200).json({
                status: "error",
                error: "Credenciales inválidas",
                code: "INVALID_CREDENTIALS"
            });

        case "EMAIL_NOT_VERIFIED":
            return res.status(200).json({
                status: "error",
                error: "Por favor verifica tu correo electrónico para iniciar sesión",
                code: "EMAIL_NOT_VERIFIED",
                requiresVerification: true
            });

        case "Usuario no encontrado":
            return res.status(404).json({ error: error.message });

        case "Credenciales inválidas":
            return res.status(401).json({ error: error.message });

        case "Token de refresco inválido o expirado":
            return res.status(401).json({
                error: "Token de refresco inválido",
                code: "INVALID_REFRESH_TOKEN"
            });

        default:
            return res.status(500).json({
                status: "error",
                error: "Error interno del servidor",
                code: "SERVER_ERROR",
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
    }
}

// ENDPOINTS HTTP (Solo manejo de Request/Response)

/**
 * Login de usuario
 */
export const loginUser = async (req, res) => {
    try {
        const { correo, contraseña, mantenerSesionesActivas = false } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({ error: "Datos de acceso incompletos" });
        }

        const requestData = extractRequestData(req);

        const result = await AuthService.performLogin(correo, contraseña, {
            mantenerSesionesActivas,
            requestData
        });

        if (result.status === "verification_required") {
            return res.status(200).json(result);
        }

        // Si el login fue exitoso, configurar cookies y responder
        if (result.status === "success") {
            setCookies(res, {
                accessToken: result.token,
                refreshToken: result.refreshToken
            });

            return res.status(200).json({
                message: result.message,
                token: result.token,
                user: result.user,
                loginTime: result.loginTime
            });
        }

        return res.status(500).json({ error: "Respuesta de servicio inesperada" });

    } catch (error) {
        return handleError(res, error, {
            endpoint: 'loginUser',
            email: req.body.correo,
            ip: req.ip
        });
    }
};

/**
 * Endpoint para obtener intentos de inicio de sesión pendientes
 */
export const getPendingLoginAttempts = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    try {
        const userId = req.params.userId;

        // Validaciones de entrada
        if (!userId || userId === 'undefined' || userId === 'null') {
            return sendLongpollResponse(res, {
                status: "error",
                message: "ID de usuario inválido",
                pendingAttempt: null
            });
        }

        if (!req.user || !req.user.id_user) {
            return sendLongpollResponse(res, {
                status: "unauthenticated",
                message: "No hay sesión activa",
                pendingAttempt: null
            });
        }

        if (req.user.id_user != userId) {
            return sendLongpollResponse(res, {
                status: "unauthorized",
                message: "No tienes permiso para ver estos intentos",
                pendingAttempt: null
            });
        }

        Logger.info(`Verificando intentos pendientes para usuario ${userId}`, { userId });

        const pendingAttempt = await AuthService.getPendingLoginAttemptsLogic(userId);

        sendLongpollResponse(res, {
            status: "success",
            pendingAttempt
        });

    } catch (error) {
        Logger.error("Error obteniendo intentos de login pendientes", error, {
            userId: req.params.userId,
            ip: req.ip
        });

        if (!res.headersSent) {
            sendLongpollResponse(res, {
                status: "error",
                message: "Error interno del servidor",
                pendingAttempt: null,
                errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Endpoint para responder a intento de inicio de sesión
 */
export const respondToLoginAttempt = async (req, res) => {
    try {
        const { attemptId, approved } = req.body;

        if (!attemptId) {
            return res.status(400).json({ error: "ID de intento requerido" });
        }

        const result = await AuthService.respondToLoginAttemptLogic(
            attemptId,
            approved,
            req.user.id_user
        );

        res.status(200).json(result);

    } catch (error) {
        if (error.message.includes("no encontrado") || error.message.includes("ya procesado")) {
            return res.status(404).json({ error: error.message });
        }

        if (error.message.includes("No tienes permiso")) {
            return res.status(403).json({ error: error.message });
        }

        return handleError(res, error, {
            endpoint: 'respondToLoginAttempt',
            attemptId: req.body.attemptId,
            userId: req.user.id_user,
            ip: req.ip
        });
    }
};

/**
 * Endpoint para verificar código
 */
export const verifyLoginCode = async (req, res) => {
    try {
        const { email, code, attemptId, forceLogin } = req.body;

        if (!email || !code || !attemptId) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        const result = await AuthService.verifyLoginCodeLogic(email, code, attemptId, forceLogin);

        // Si se forzó el login, configurar cookies
        if (result.forceLogin && result.tokens) {
            setCookies(res, result.tokens);

            return res.status(200).json({
                message: result.message,
                token: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                user: result.user
            });
        } else {
            return res.status(200).json({
                message: result.message,
                approved: result.approved
            });
        }

    } catch (error) {
        if (error.message === "Usuario no encontrado") {
            return res.status(404).json({ error: error.message });
        }

        if (error.message.includes("no encontrado")) {
            return res.status(404).json({ error: error.message });
        }

        if (error.message.includes("expirado") || error.message.includes("incorrecto") || error.message.includes("rechazado")) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message.includes("rechazado")) {
            return res.status(403).json({ error: error.message });
        }

        return handleError(res, error, {
            endpoint: 'verifyLoginCode',
            email: req.body.email,
            attemptId: req.body.attemptId,
            ip: req.ip
        });
    }
};

/**
 * Endpoint para reenviar código
 */
export const resendVerificationCode = async (req, res) => {
    try {
        const { email, attemptId } = req.body;

        if (!email || !attemptId) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        const result = await AuthService.resendVerificationCodeLogic(email, attemptId);

        res.status(200).json(result);

    } catch (error) {
        if (error.message.includes("no encontrado")) {
            return res.status(404).json({ error: error.message });
        }

        return handleError(res, error, {
            endpoint: 'resendVerificationCode',
            email: req.body.email,
            attemptId: req.body.attemptId,
            ip: req.ip
        });
    }
};

/**
 * Endpoint para verificar estado de sesión
 */
export const checkSessionStatus = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const userId = req.user?.id_user;
        const sessionId = req.user?.sessionId;

        if (!userId || !sessionId) {
            return sendLongpollResponse(res, {
                status: "unauthenticated",
                message: "No hay sesión activa"
            });
        }

        const result = await AuthService.checkSessionStatusLogic(userId, sessionId);

        return sendLongpollResponse(res, result);

    } catch (error) {
        Logger.error("Error en verificación de sesión", error, {
            userId: req.user?.id_user,
            sessionId: req.user?.sessionId,
            ip: req.ip
        });

        if (!res.headersSent) {
            sendLongpollResponse(res, {
                status: "error",
                message: "Error interno al verificar sesión"
            });
        }
    }
};

/**
 * Revoca todas las sesiones activas de un usuario
 */
export const revokeAllSessions = async (req, res) => {
    try {
        Logger.info('Petición de revocación recibida', {
            body: req.body,
            user: req.user,
            params: req.params,
            ip: req.ip
        });

        const userId = req.params.userId || req.user?.id_user;

        if (!userId) {
            Logger.warn('Error: ID de usuario no proporcionado', {
                requesterId: req.user?.id_user,
                ip: req.ip
            });
            return res.status(400).json({ error: "ID de usuario no proporcionado" });
        }

        if (req.user.id_user != userId && req.user.id_rol !== 3) { // 3 = admin
            Logger.security(`Error de permisos: ${req.user.id_user} intenta revocar sesiones de ${userId}`, {
                requesterId: req.user.id_user,
                targetUserId: userId,
                ip: req.ip
            });
            return res.status(403).json({
                error: "No tienes permiso para revocar sesiones de este usuario"
            });
        }

        const { currentToken, keepCurrentSession } = req.body;
        const requestData = extractRequestData(req);

        Logger.info('Parámetros de revocación', {
            userId,
            keepCurrentSession,
            hasCurrentToken: !!currentToken
        });

        const result = await AuthService.revokeSessionsLogic(userId, {
            currentToken,
            keepCurrentSession,
            reason: req.body.reason || 'user_initiated',
            requestData
        });

        // Si se deben limpiar cookies (revocación total del usuario actual)
        if (result.shouldClearCookies && req.user.id_user == userId) {
            Logger.info('Limpiando cookies para el usuario actual', {
                userId: req.user.id_user,
                ip: req.ip
            });
            clearCookies(res);
        }

        Logger.info('Enviando respuesta exitosa de revocación', {
            userId: req.user.id_user,
            ip: req.ip
        });
        res.status(200).json(result);

    } catch (error) {
        return handleError(res, error, {
            endpoint: 'revokeAllSessions',
            userId: req.params.userId,
            requesterId: req.user?.id_user,
            ip: req.ip
        });
    }
};

/**
 * Endpoint para refrescar token
 */
export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({
                error: "No se proporcionó token de refresco",
                code: "NO_REFRESH_TOKEN"
            });
        }

        const tokens = await AuthService.refreshTokens(refreshToken);

        res.cookie("token", tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "Strict",
            maxAge: 900000, // 15 minutos
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined,
        });

        res.status(200).json({
            message: "Token renovado exitosamente",
            token: tokens.accessToken,
            user: {
                id: tokens.user.id_user,
                correo: tokens.user.correo,
                id_rol: tokens.user.id_rol
            }
        });
    } catch (error) {
        return handleError(res, error, {
            endpoint: 'refreshToken',
            hasRefreshToken: !!req.cookies.refresh_token,
            ip: req.ip
        });
    }
};


/**
 * Login con Google (solo redirecciones)
 */
export const googleLogin = async (req, res) => {
    try {
        const requestData = extractRequestData(req);
        requestData.protocol = req.protocol;
        requestData.host = req.get('host');

        const { code, error } = req.query;

        if (error) {
            return res.redirect('/login?error=google_auth_cancelled');
        }

        if (!code) {
            return res.redirect('/login?error=google_auth_failed');
        }

        const result = await AuthService.googleLogin(code, requestData);

        setCookies(res, {
            accessToken: result.token,
            refreshToken: result.refreshToken
        });

        res.redirect('/principal');
    } catch (error) {
        Logger.error("Error en Google login", error, {
            code: req.query.code ? 'present' : 'missing',
            ip: req.ip
        });
        res.redirect('/login?error=google_auth_error');
    }
};

/**
 * Logout de usuario
 */
export const logoutUser = async (req, res) => {
    try {
        const userId = req.user?.id_user;
        const refreshToken = req.cookies.refresh_token;
        const sessionData = extractRequestData(req);

        const result = await AuthService.performLogout(userId, refreshToken, sessionData);

        if (result.shouldClearCookies) {
            clearCookies(res);
        }

        res.status(200).json({ message: result.message });
    } catch (error) {
        return handleError(res, error, {
            endpoint: 'logoutUser',
            userId: req.user?.id_user,
            ip: req.ip
        });
    }
};

/**
 * Verificar credenciales sin generar tokens
 */
export const checkLoginStatus = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        const requestData = extractRequestData(req);

        const result = await AuthService.checkLoginStatusLogic(correo, contraseña, requestData);

        res.status(200).json(result);

    } catch (error) {
        Logger.error("Error en verificación de login", error, {
            email: req.body.correo,
            ip: req.ip
        });
        return res.status(200).json({
            authenticated: false,
            reason: "SERVER_ERROR",
            message: "Error interno del servidor"
        });
    }
};

process.on('SIGINT', () => {
    console.log('[AUTH] Limpiando conexiones activas...');
    for (const [connectionId, connection] of activeConnections) {
        if (connection.timeoutId) {
            clearTimeout(connection.timeoutId);
        }
    }
    activeConnections.clear();
});

process.on('SIGTERM', () => {
    for (const [connectionId, connection] of activeConnections) {
        if (connection.timeoutId) {
            clearTimeout(connection.timeoutId);
        }
    }
    activeConnections.clear();
});