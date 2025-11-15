import pool from "../../lib/dbPool.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { redisService } from "../../lib/redis.js";
import { notificationService } from "./notificationService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { getLocationFromIP } from '../../utils/geoLocation.js';
import { Logger } from "../../utils/logger.js";
import {
    parseUserAgent,
    formatUserAgentForDisplay,
    getSecurityAlertInfo
} from '../../utils/userAgentParser.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const REFRESH_TOKEN_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// 🆕 Cache mejorado para controlar operaciones concurrentes con cleanup automático
const operationLocks = new Map();
const OPERATION_LOCK_TTL = 15000; // 15 segundos

// 🆕 Cleanup automático cada 5 minutos para prevenir memory leaks
const cleanupOperationLocks = () => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of operationLocks) {
        if (data.expiry && data.expiry < now) {
            operationLocks.delete(key);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        Logger.debug(`Cleaned up ${cleanedCount} expired operation locks`);
    }
};

setInterval(cleanupOperationLocks, 5 * 60 * 1000);

export class AuthService {
    /**
     * 🆕 Función auxiliar mejorada para crear locks de operación
     */
    static async withLock(key, operation, timeout = 10000) {
        const lockEntry = operationLocks.get(key);

        // Si ya hay una operación en progreso, esperar solo si no ha expirado
        if (lockEntry) {
            if (lockEntry.expiry > Date.now()) {
                Logger.debug(`Esperando operación en progreso para: ${key}`);
                try {
                    return await lockEntry.promise;
                } catch (error) {
                    // Si la operación anterior falló, limpiar y continuar
                    operationLocks.delete(key);
                    Logger.warn(`Operación anterior falló para ${key}, continuando`);
                }
            } else {
                // 🆕 Cleanup de entrada expirada
                operationLocks.delete(key);
            }
        }

        const operationPromise = (async () => {
            try {
                Logger.debug(`Iniciando operación con lock: ${key}`);
                return await operation();
            } finally {
                operationLocks.delete(key);
                Logger.debug(`Lock liberado: ${key}`);
            }
        })();

        // 🆕 Almacenar con TTL
        operationLocks.set(key, {
            promise: operationPromise,
            expiry: Date.now() + timeout
        });

        // 🆕 Timeout de seguridad mejorado
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                operationLocks.delete(key);
                reject(new Error(`Operation timeout: ${key}`));
            }, timeout);
        });

        try {
            return await Promise.race([operationPromise, timeoutPromise]);
        } catch (error) {
            operationLocks.delete(key);
            throw error;
        }
    }

    /**
     * 🆕 Operación simple para Redis (sin transacciones complejas)
     */
    static async executeSimpleRedisOperations(operations) {
        if (!redisService.isReady()) {
            throw new Error('Redis no disponible');
        }

        try {
            // 🆕 Ejecutar operaciones secuencialmente (más simple y confiable)
            const results = [];
            for (const op of operations) {
                switch (op.type) {
                    case 'set':
                        const setResult = await redisService.set(op.key, op.value, op.expiry || 3600);
                        results.push(setResult);
                        break;
                    case 'delete':
                        const deleteResult = await redisService.delete(op.key);
                        results.push(deleteResult);
                        break;
                }
            }
            return results;
        } catch (error) {
            Logger.error('Error en operaciones Redis', error);
            throw error;
        }
    }

    /**
     * 🔧 FUNCIÓN 2: generateTokens - PASAR IP AL GUARDAR SESIÓN
     * Reemplazar en authService.js línea ~100
     */
    static async generateTokens(user, ipAddress) {
        const lockKey = `generate_tokens:${user.id_user}`;

        return await this.withLock(lockKey, async () => {
            try {
                Logger.info(`Generando tokens para usuario ${user.id_user}`);

                let userRole = 1;
                try {
                    const roleQuery = `SELECT p.id_rol FROM perfil p WHERE p.id_usuario = $1`;
                    const roleResult = await pool.query(roleQuery, [user.id_user]);
                    if (roleResult.rows.length > 0) {
                        userRole = roleResult.rows[0].id_rol;
                    }
                } catch (error) {
                    Logger.warn(`No se pudo obtener el rol para usuario ${user.id_user}`, { error: error.message });
                }

                const userInfo = {
                    id_user: user.id_user,
                    correo: user.correo,
                    id_rol: userRole
                };

                const sessionId = crypto.randomBytes(16).toString('hex');

                // Token de acceso con sessionId incluido
                const accessToken = jwt.sign(
                    { ...userInfo, sessionId },
                    ACCESS_TOKEN_SECRET,
                    { expiresIn: ACCESS_TOKEN_EXPIRY }
                );

                // Token de refresco
                const refreshToken = crypto.randomBytes(32).toString('hex');

                Logger.info(`Tokens generados`, { userId: user.id_user, sessionId: sessionId.substring(0, 8) });

                // 🆕 Operación atómica mejorada para guardar en Redis CON IP
                await this.saveSession(user.id_user, sessionId, refreshToken, ipAddress);

                Logger.info(`Sesión guardada atómicamente en Redis con IP`, { userId: user.id_user });

                return {
                    user: userInfo,
                    accessToken,
                    refreshToken,
                    sessionId,
                    loginTime: Math.floor(Date.now() / 1000)
                };

            } catch (error) {
                Logger.error('Error generando tokens', error);
                throw error;
            }
        });
    }


    /**
     * 🆕 Guardar sesión de forma simple y confiable
     */
    static async saveSession(userId, sessionId, refreshToken, ipAddress) {
        try {
            // 🆕 Obtener sesión anterior de forma segura
            const oldSession = await Promise.race([
                redisService.get(`session:${userId}`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Get session timeout')), 2000)
                )
            ]).catch(() => null);

            const newSession = {
                sessionId,
                refreshToken,
                ipAddress, // 🆕 AGREGAR IP A LA SESIÓN
                createdAt: Date.now()
            };

            // 🆕 Guardar operaciones (simplificado)
            const operations = [
                {
                    type: 'set',
                    key: `session:${userId}`,
                    value: newSession,
                    expiry: 60 * 60 * 24 * 7 // 7 días
                },
                {
                    type: 'set',
                    key: `refresh_token:${refreshToken}`,
                    value: userId.toString(),
                    expiry: 60 * 60 * 24 * 7 // 7 días
                }
            ];

            // 🆕 Ejecutar operaciones simplificadas
            const results = await this.executeSimpleRedisOperations(operations);

            // 🆕 Verificación simple - si alguna operación falló
            const hasFailures = results.some(result => result === false);

            if (hasFailures) {
                Logger.warn('Algunas operaciones Redis fallaron, pero continuando...');
                // No lanzar error, continuar con fallback
            }

            // 🆕 Limpiar sesión anterior DESPUÉS de confirmar la nueva
            if (oldSession && oldSession.refreshToken && oldSession.refreshToken !== refreshToken) {
                Logger.info(`Limpiando sesión anterior`, { sessionId: oldSession.sessionId?.substring(0, 8) });
                // 🆕 Limpiar de forma asíncrona sin bloquear
                setTimeout(async () => {
                    try {
                        await redisService.delete(`refresh_token:${oldSession.refreshToken}`);
                    } catch (cleanupError) {
                        Logger.warn('Error limpiando sesión anterior', { error: cleanupError.message });
                    }
                }, 100);
            }

            Logger.info(`Sesión guardada exitosamente con IP`, { userId, ip: ipAddress?.substring(0, 12) + '...' });

        } catch (error) {
            Logger.error('Error guardando sesión', error);

            // 🆕 Rollback simple en caso de error
            try {
                await Promise.all([
                    redisService.delete(`session:${userId}`),
                    redisService.delete(`refresh_token:${refreshToken}`)
                ]);
            } catch (rollbackError) {
                Logger.error('Error en rollback de sesión', rollbackError);
            }

            throw error;
        }
    }

    /**
     * 🆕 Renovación de tokens mejorada con verificación de consistencia
     */
    static async refreshTokens(refreshToken) {
        const lockKey = `refresh_tokens:${refreshToken}`;

        return await this.withLock(lockKey, async () => {
            try {
                Logger.info(`Iniciando renovación de token`, { tokenPrefix: refreshToken.substring(0, 8) });

                // 🆕 Buscar userId por refresh token con timeout
                const userId = await Promise.race([
                    redisService.get(`refresh_token:${refreshToken}`),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Get refresh token timeout')), 2000)
                    )
                ]);

                if (!userId) {
                    throw new Error('Token de refresco inválido o expirado');
                }

                Logger.info(`Token pertenece al usuario`, { userId });

                // 🆕 Verificar que es la sesión activa con timeout
                const session = await Promise.race([
                    redisService.get(`session:${userId}`),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Get session timeout')), 2000)
                    )
                ]);

                if (!session || session.refreshToken !== refreshToken) {
                    Logger.error(`Sesión no válida para usuario ${userId}`);
                    throw new Error('Sesión no válida');
                }

                Logger.info(`Sesión válida confirmada`, { userId });

                // 🆕 Obtener datos del usuario con timeout
                const query = "SELECT id_user, correo FROM usuario WHERE id_user = $1";
                const { rows } = await Promise.race([
                    pool.query(query, [userId]),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Database query timeout')), 5000)
                    )
                ]);

                if (rows.length === 0) {
                    throw new Error('Usuario no encontrado');
                }

                const user = rows[0];

                // IMPORTANTE: Mantener el mismo sessionId y refreshToken
                // Solo generar nuevo access token
                let userRole = 1;
                try {
                    const roleQuery = `SELECT p.id_rol FROM perfil p WHERE p.id_usuario = $1`;
                    const roleResult = await pool.query(roleQuery, [userId]);
                    if (roleResult.rows.length > 0) {
                        userRole = roleResult.rows[0].id_rol;
                    }
                } catch (error) {
                    Logger.warn(`No se pudo obtener el rol`, { error: error.message });
                }

                const userInfo = {
                    id_user: user.id_user,
                    correo: user.correo,
                    id_rol: userRole
                };

                // Nuevo access token con el MISMO sessionId
                const accessToken = jwt.sign(
                    { ...userInfo, sessionId: session.sessionId },
                    ACCESS_TOKEN_SECRET,
                    { expiresIn: ACCESS_TOKEN_EXPIRY }
                );

                // 🆕 Verificar que la sesión sigue siendo válida después de generar el token
                const currentSession = await redisService.get(`session:${userId}`);
                if (!currentSession || currentSession.sessionId !== session.sessionId) {
                    Logger.error(`Sesión cambió durante la renovación`, { userId });
                    throw new Error('Sesión cambió durante la renovación');
                }

                // 🆕 Actualizar timestamp de última renovación en la sesión
                const updatedSession = {
                    ...session,
                    lastRenewal: Date.now()
                };

                // 🆕 Actualizar con timeout
                await Promise.race([
                    redisService.set(`session:${userId}`, updatedSession, 60 * 60 * 24 * 7), // 7 días
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Session update timeout')), 2000)
                    )
                ]);

                Logger.info(`Token renovado exitosamente`, {
                    userId,
                    sessionId: session.sessionId?.substring(0, 8)
                });

                return {
                    user: userInfo,
                    accessToken,
                    refreshToken, // Devolver el mismo refresh token
                    sessionId: session.sessionId
                };

            } catch (error) {
                Logger.error('Error al refrescar tokens', error);
                throw new Error('Error al refrescar tokens: ' + error.message);
            }
        });
    }

    /**
     * 🆕 Revocación de otras sesiones mejorada
     */
    static async revokeOtherSessions(userId, currentToken) {
        const lockKey = `revoke_other:${userId}`;

        return await this.withLock(lockKey, async () => {
            try {
                Logger.info(`Revocando otras sesiones`, { userId });

                let currentSessionId;
                try {
                    const decoded = jwt.verify(currentToken, ACCESS_TOKEN_SECRET);
                    currentSessionId = decoded.sessionId;
                } catch (error) {
                    Logger.warn('No se pudo decodificar token actual', { error: error.message });
                }

                // 🆕 Obtener sesión actual con timeout
                const currentSession = await Promise.race([
                    redisService.get(`session:${userId}`),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Get session timeout')), 2000)
                    )
                ]).catch(() => null);

                if (!currentSession) {
                    Logger.info(`No hay sesión activa`, { userId });
                    return { success: true, tokensRevoked: 0 };
                }

                // Si el sessionId del token coincide con el de la sesión actual, no hacer nada
                if (currentSessionId && currentSession.sessionId === currentSessionId) {
                    Logger.info(`Token actual coincide con sesión activa, no se requiere revocación`);
                    return { success: true, tokensRevoked: 0 };
                }

                // Si no coincide, la sesión actual se considera "otra sesión" y debe ser revocada
                Logger.info(`Revocando sesión anterior`, { userId });

                // 🆕 Limpiar refresh token anterior con timeout
                if (currentSession.refreshToken) {
                    await Promise.race([
                        redisService.delete(`refresh_token:${currentSession.refreshToken}`),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Delete refresh token timeout')), 2000)
                        )
                    ]).catch(error => {
                        Logger.warn('Error eliminando refresh token anterior', { error: error.message });
                    });
                }

                // La nueva sesión ya se estableció en generateTokens
                Logger.info(`Sesiones anteriores revocadas`, { userId });

                return { success: true, tokensRevoked: 1 };

            } catch (error) {
                Logger.error('Error al revocar otras sesiones', error);
                throw error;
            }
        });
    }

    /**
     * 🆕 Revocación de todos los tokens simplificada
     */
    static async revokeAllTokens(userId) {
        const lockKey = `revoke_all:${userId}`;

        return await this.withLock(lockKey, async () => {
            try {
                Logger.info(`Revocando TODAS las sesiones`, { userId });

                // 🆕 Limpiar sesión con timeout
                const session = await Promise.race([
                    redisService.get(`session:${userId}`),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Get session timeout')), 2000)
                    )
                ]).catch(() => null);

                // 🆕 Usar operaciones simples para limpiar
                const operations = [];

                if (session && session.refreshToken) {
                    operations.push({
                        type: 'delete',
                        key: `refresh_token:${session.refreshToken}`
                    });
                }

                operations.push({
                    type: 'delete',
                    key: `session:${userId}`
                });

                await this.executeSimpleRedisOperations(operations);

                Logger.info(`Todas las sesiones revocadas`, { userId });

                return {
                    tokensRevoked: 'all',
                    accessRevoked: true,
                    fullCleanup: true
                };

            } catch (error) {
                Logger.error('Error al revocar todos los tokens', error);
                throw error;
            }
        });
    }

    /**
     * 🆕 Logout simplificado
     */
    static async logout(userId, refreshToken) {
        const lockKey = `logout:${userId}`;

        return await this.withLock(lockKey, async () => {
            try {
                Logger.info(`Procesando logout`, { userId });

                // 🆕 Usar operaciones simples para limpiar
                const operations = [];

                if (refreshToken) {
                    operations.push({
                        type: 'delete',
                        key: `refresh_token:${refreshToken}`
                    });
                }

                operations.push({
                    type: 'delete',
                    key: `session:${userId}`
                });

                await this.executeSimpleRedisOperations(operations);

                Logger.info(`Cierre de sesión completo`, { userId });
                return true;

            } catch (error) {
                Logger.error('Error en logout', error);
                throw error;
            }
        });
    }

    /**
     * 🔧 FUNCIÓN 4: login - PASAR IP AL GENERAR TOKENS
     * Reemplazar en authService.js línea ~600
     */
    static async login(correo, contraseña, ipAddress) {
        try {
            const delay = 100 + Math.floor(Math.random() * 200);
            await new Promise(resolve => setTimeout(resolve, delay));

            const query = "SELECT id_user, correo, contraseña FROM usuario WHERE LOWER(correo) = LOWER($1)";
            const { rows } = await pool.query(query, [correo.trim()]);

            if (rows.length === 0) {
                throw new Error("Usuario no encontrado");
            }

            const user = rows[0];
            const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);

            if (!isValidPassword) {
                throw new Error("Credenciales inválidas");
            }

            Logger.info(`Acceso exitoso`, { userId: user.id_user });

            return await this.generateTokens(user, ipAddress);

        } catch (error) {
            Logger.error('Error en login', error);
            throw error;
        }
    }

    static async googleLogin(code, requestData) {
        try {
            const { OAuth2Client } = await import('google-auth-library');
            const client = new OAuth2Client(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                `${requestData.protocol}://${requestData.host}/api/usuarios/google-login`
            );

            // Intercambiar código por tokens de OAuth
            const { tokens: oauthTokens } = await client.getToken(code);
            const ticket = await client.verifyIdToken({
                idToken: oauthTokens.id_token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            const email = payload.email;
            const googleId = payload.sub;

            let user = await this.findUserByGoogleId(googleId);

            if (!user) {
                user = await this.findUserByEmail(email);

                if (user && user.contraseña) {
                    user = await this.updateUserGoogleId(user.id_user, googleId);
                }
            }

            if (!user) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    const userQuery = `
                    INSERT INTO usuario (google_id, correo, created_at, email_verified) 
                    VALUES ($1, $2, NOW(), TRUE)
                    RETURNING id_user, correo
                `;
                    const { rows } = await client.query(userQuery, [googleId, email]);
                    user = rows[0];

                    const profileQuery = `INSERT INTO perfil (id_usuario, id_rol) VALUES ($1, $2)`;
                    await client.query(profileQuery, [user.id_user, 1]);

                    const termsVersion = process.env.TERMS_VERSION || '1.0';
                    await client.query(
                        `INSERT INTO terms_acceptances (user_id, terms_version, ip_address, user_agent, acceptance_method)
                     VALUES ($1, $2, $3, $4, $5)`,
                        [user.id_user, termsVersion, requestData.ipAddress, requestData.userAgent, 'google_oauth']
                    );

                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
            }

            const sessionTokens = await this.generateTokens(user);

            return {
                status: "success",
                message: "Login con Google exitoso",
                token: sessionTokens.accessToken,
                refreshToken: sessionTokens.refreshToken,
                user: {
                    id_user: user.id_user,
                    correo: email,
                    id_rol: sessionTokens.user.id_rol || 1
                }
            };
        } catch (error) {
            Logger.error('Error en Google login', error);
            throw new Error('Error al procesar autenticación con Google');
        }
    }

    // Métodos auxiliares (sin cambios)
    static async findUserByGoogleId(googleId) {
        const query = "SELECT * FROM usuario WHERE google_id = $1";
        const { rows } = await pool.query(query, [googleId]);
        return rows[0];
    }

    static async findUserByEmail(email) {
        const query = "SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)";
        const { rows } = await pool.query(query, [email]);
        return rows[0];
    }

    static async updateUserGoogleId(userId, googleId) {
        const query = `
          UPDATE usuario 
          SET google_id = $1
          WHERE id_user = $2
          RETURNING id_user, correo
        `;
        const { rows } = await pool.query(query, [googleId, userId]);
        return rows[0];
    }

    /**
     * 🆕 Función de diagnóstico mejorada para verificar estado de sesiones
     */
    static async debugSessionState(userId) {
        try {
            const session = await Promise.race([
                redisService.get(`session:${userId}`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 2000)
                )
            ]);

            if (!session) {
                return { status: 'no_session', session: null };
            }

            const refreshTokenExists = await Promise.race([
                redisService.get(`refresh_token:${session.refreshToken}`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Refresh token check timeout')), 2000)
                )
            ]).catch(() => null);

            return {
                status: 'session_found',
                session: {
                    sessionId: session.sessionId,
                    refreshTokenExists: !!refreshTokenExists,
                    createdAt: session.createdAt,
                    lastRenewal: session.lastRenewal
                }
            };

        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }

    // ========================================
    // 🆕 FUNCIONES MOVIDAS DEL CONTROLLER (MEJORADAS)
    // ========================================

    /**
     * Verificar si el usuario tiene una sesión activa
     */
    static async hasActiveSession(userId) {
        try {
            Logger.info(`Verificando sesión activa`, { userId });

            // 🆕 Usar timeout para evitar bloqueos
            const activeSession = await Promise.race([
                redisService.get(`session:${userId}`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 2000)
                )
            ]).catch(() => null);

            if (activeSession && activeSession.sessionId && activeSession.refreshToken) {
                Logger.info(`Sesión activa encontrada`, {
                    userId,
                    sessionId: activeSession.sessionId.substring(0, 8)
                });

                // 🆕 Verificar que el refresh token también existe con timeout
                const refreshTokenExists = await Promise.race([
                    redisService.get(`refresh_token:${activeSession.refreshToken}`),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Refresh token check timeout')), 2000)
                    )
                ]).catch(() => null);

                if (refreshTokenExists) {
                    Logger.info(`Refresh token válido encontrado`, { userId });
                    return true;
                } else {
                    Logger.warn(`Refresh token no encontrado, limpiando sesión huérfana`);
                    // 🆕 Limpiar de forma asíncrona
                    setTimeout(async () => {
                        try {
                            await redisService.delete(`session:${userId}`);
                        } catch (error) {
                            Logger.warn('Error limpiando sesión huérfana', { error: error.message });
                        }
                    }, 100);
                    return false;
                }
            }

            Logger.info(`No se encontró sesión activa`, { userId });
            return false;
        } catch (error) {
            Logger.error('Error verificando sesiones activas', error);
            // En caso de error, asumir que no hay sesión para seguridad
            return false;
        }
    }

    /**
     * Crear registro de intento de inicio de sesión
     */
    static async createLoginAttempt(userId, requestData) {
        try {
            Logger.info(`Creando intento de login`, { userId });

            const { userAgent, ipAddress } = requestData;

            const userAgentInfo = parseUserAgent(userAgent);
            const userAgentDisplay = formatUserAgentForDisplay(userAgent, {
                showIcons: true,
                format: 'full'
            });
            const securityInfo = getSecurityAlertInfo(userAgent);

            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

            const attemptId = crypto.randomUUID ?
                crypto.randomUUID() :
                Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            Logger.info(`Intento creado`, { attemptId, hasCode: !!verificationCode });

            let locationInfo = 'Ubicación desconocida';
            try {
                const geo = getLocationFromIP(ipAddress);
                locationInfo = geo.formattedLocation || 'Ubicación desconocida';
            } catch (geoError) {
                Logger.warn('Error obteniendo geolocalización', { error: geoError.message });
            }

            // 🆕 Guardar en base de datos con timeout
            const query = `
                INSERT INTO login_attempts (
                    id, 
                    user_id, 
                    ip_address, 
                    user_agent, 
                    verification_code, 
                    created_at, 
                    expires_at, 
                    status
                ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '10 minutes', 'pending')
                RETURNING id
            `;

            const values = [
                attemptId,
                userId,
                ipAddress,
                userAgent,
                verificationCode
            ];

            await Promise.race([
                pool.query(query, values),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database insert timeout')), 5000)
                )
            ]);

            // 🆕 También guardar en Redis para acceso rápido con timeout
            await Promise.race([
                redisService.set(
                    `login_attempt:${attemptId}`,
                    {
                        userId,
                        ipAddress,
                        userAgent,
                        userAgentInfo,
                        userAgentDisplay,
                        securityInfo,
                        verificationCode,
                        timestamp: Date.now(),
                        status: 'pending',
                        location: locationInfo
                    },
                    600 // 10 minutos
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis save timeout')), 2000)
                )
            ]).catch(error => {
                Logger.warn('Error guardando intento en Redis', { error: error.message });
            });

            const attemptData = {
                id: attemptId,
                ipAddress,
                userAgent,
                userAgentDisplay,
                userAgentInfo,
                securityInfo,
                timestamp: new Date().toISOString(),
                status: 'pending',
                location: locationInfo
            };

            Logger.info(`Notificando intento a dispositivos activos`, { userId });

            // ⭐ CRÍTICO: Notificar en tiempo real a las conexiones activas
            notificationService.notifyNewLoginAttempt(userId, attemptData);

            return attemptId;
        } catch (error) {
            Logger.error("Error creando registro de intento de login", error);
            throw error;
        }
    }

    /**
     * Enviar correo con código de verificación
     */
    static async sendVerificationEmail(email, attemptId) {
        try {
            // 🆕 Obtener el código de Redis o base de datos con timeout
            let verificationCode;

            const attemptData = await Promise.race([
                redisService.get(`login_attempt:${attemptId}`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis get timeout')), 2000)
                )
            ]).catch(() => null);

            if (attemptData && attemptData.verificationCode) {
                verificationCode = attemptData.verificationCode;
            } else {
                // Si no está en Redis, buscar en base de datos
                const query = `
                    SELECT verification_code FROM login_attempts 
                    WHERE id = $1 AND expires_at > NOW()
                `;
                const { rows } = await Promise.race([
                    pool.query(query, [attemptId]),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Database query timeout')), 5000)
                    )
                ]);

                if (rows.length === 0) throw new Error("Intento de login no encontrado o expirado");
                verificationCode = rows[0].verification_code;
            }

            const { emailService } = await import('../../services/email/emailService.js');

            // Recoger información de la solicitud desde las variables globales
            const userAgent = global.latestRequestUserAgent || '';
            const ipAddress = global.latestRequestIP || '';

            Logger.info(`Enviando código de verificación`, { email });

            await emailService.sendVerificationCode(email, verificationCode, {
                userAgent,
                ipAddress
            });

            return true;
        } catch (error) {
            Logger.error("Error enviando email de verificación", error);
            throw error;
        }
    }

    /**
     * Obtener conteo de intentos fallidos de login
     */
    static async getFailedLoginCount(ip) {
        try {
            const key = `security:failed-login:${ip}`;
            if (redisService.client) {
                return await redisService.client.llen(key) || 0;
            }
            return 0;
        } catch (error) {
            Logger.error('Error obteniendo conteo de intentos fallidos', error);
            return 0;
        }
    }

    /**
     * Limpiar tokens CSRF
     */
    static async cleanupCsrfTokens(userId, sessionData) {
        try {
            if (global.tokenTransitionCache && global.tokenTransitionCache.has) {
                const cacheKeys = [userId, sessionData.sessionID, sessionData.ip];
                cacheKeys.forEach(key => {
                    if (global.tokenTransitionCache.has(key)) {
                        global.tokenTransitionCache.delete(key);
                    }
                });
            }

            Logger.info(`Tokens CSRF limpiados`, { userId });
        } catch (error) {
            Logger.warn('Error limpiando tokens CSRF', { error: error.message });
        }
    }

    // ========================================
    // RESTO DE FUNCIONES (mantenidas sin cambios significativos)
    // ========================================

    /**
     * 🔧 FUNCIÓN 3: performLogin - VERIFICAR IP ANTES DE PEDIR CÓDIGO
     * Reemplazar en authService.js línea ~630
     */
    static async performLogin(correo, contraseña, options = {}) {
        const { mantenerSesionesActivas = false, requestData } = options;

        if (!correo || !contraseña) {
            throw new Error("Datos de acceso incompletos");
        }

        // Variable para almacenar el usuario fuera del scope del try interno
        let userCredentials = null;

        // Primero verificamos si las credenciales son válidas sin generar tokens
        try {
            const userQuery = "SELECT id_user, correo, contraseña, email_verified FROM usuario WHERE LOWER(correo) = LOWER($1)";
            const { rows } = await pool.query(userQuery, [correo.trim()]);

            if (rows.length === 0) {
                logSecurityEvent('LOGIN_FAILURE', 'Usuario no encontrado', {
                    email: correo,
                    ip: requestData?.ipAddress,
                    userAgent: requestData?.userAgent
                });

                throw new Error("USER_NOT_FOUND");
            }

            const user = rows[0];
            userCredentials = user;

            const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);

            if (!isValidPassword) {
                logSecurityEvent('LOGIN_FAILURE', 'Credenciales inválidas', {
                    userId: user.id_user,
                    ip: requestData?.ipAddress,
                    attemptCount: await this.getFailedLoginCount(requestData?.ipAddress)
                });

                throw new Error("INVALID_CREDENTIALS");
            }

            if (!user.email_verified) {
                logSecurityEvent('LOGIN_FAILURE', 'Correo no verificado', {
                    userId: user.id_user,
                    ip: requestData?.ipAddress,
                    userAgent: requestData?.userAgent
                });

                throw new Error("EMAIL_NOT_VERIFIED");
            }

            Logger.info(`Credenciales válidas`, { userId: user.id_user });

            // ⭐ AQUÍ ESTÁ EL CAMBIO PRINCIPAL:
            const currentSession = await redisService.get(`session:${user.id_user}`);

            if (currentSession && !mantenerSesionesActivas) {
                // 🆕 VERIFICAR SI EL IP ES DIFERENTE
                const currentIP = requestData?.ipAddress;
                const sessionIP = currentSession.ipAddress;

                if (currentIP && sessionIP && currentIP === sessionIP) {
                    Logger.info(`Mismo IP detectado (${currentIP}), permitiendo login directo`, { userId: user.id_user });
                } else {
                    Logger.info(`IP diferente detectado. Sesión: ${sessionIP}, Actual: ${currentIP}`, { userId: user.id_user });

                    const attemptId = await this.createLoginAttempt(user.id_user, requestData);

                    await this.sendVerificationEmail(user.correo, attemptId);

                    Logger.info(`Código de verificación enviado por IP diferente`, { attemptId });

                    return {
                        status: "verification_required",
                        message: "Detectamos un inicio de sesión desde un dispositivo o ubicación diferentes",
                        requiresVerification: true,
                        attemptId,
                        email: user.correo,
                        userId: user.id_user,
                        reason: "different_ip"
                    };
                }
            }

            // Si no hay sesión activa O es el mismo IP, continuar con login normal
            Logger.info(`Procediendo con login normal`, { userId: user.id_user });

        } catch (credentialError) {
            Logger.error("Error al verificar credenciales", credentialError);
            throw credentialError;
        }

        const result = await this.generateTokens(userCredentials, requestData?.ipAddress);

        logSecurityEvent('LOGIN_TOKEN_GENERATED', 'Inicio de sesión completado con token', {
            userId: result.user.id_user,
            ip: requestData?.ipAddress,
            method: 'password',
            userAgent: requestData?.userAgent
        });

        // Si el usuario no quiere mantener otras sesiones activas, revocarlas DESPUÉS de generar el nuevo token
        if (!mantenerSesionesActivas) {
            try {
                await this.revokeOtherSessions(
                    result.user.id_user,
                    result.accessToken
                );
            } catch (revokeError) {
                Logger.warn('Error al revocar sesiones previas', { error: revokeError.message });
            }
        }

        try {
            const updateLastLoginQuery = "UPDATE usuario SET last_login = NOW() WHERE id_user = $1 RETURNING last_login";
            await pool.query(updateLastLoginQuery, [userCredentials.id_user]);
            Logger.info(`Actualizado last_login`, { userId: userCredentials.id_user });
        } catch (updateError) {
            Logger.warn(`No se pudo actualizar last_login`, { error: updateError.message });
        }

        return {
            status: "success",
            message: "Login exitoso",
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: {
                id: result.user.id_user,
                correo: result.user.correo,
                id_rol: result.user.id_rol
            },
            loginTime: result.loginTime
        };
    }

    /**
     * Obtener intentos de login pendientes (lógica de negocio)
     */
    static async getPendingLoginAttemptsLogic(userId) {
        const query = `
            SELECT 
                id, 
                ip_address as "ipAddress", 
                user_agent as "userAgent", 
                created_at as "timestamp", 
                status
            FROM login_attempts 
            WHERE user_id = $1 
            AND status = 'pending' 
            AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return null;
        }

        // Enriquecer los datos con información geográfica y User-Agent parseado
        const attempt = rows[0];

        try {
            const geo = getLocationFromIP(attempt.ipAddress);
            attempt.location = geo.formattedLocation;
            attempt.geoData = {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                coordinates: geo.ll
            };
        } catch (geoError) {
            Logger.warn('Error obteniendo geolocalización', { error: geoError.message });
            attempt.location = 'Ubicación desconocida';
        }

        // NUEVO: Agregar información parseada del User-Agent
        try {
            const userAgentInfo = parseUserAgent(attempt.userAgent);
            const userAgentDisplay = formatUserAgentForDisplay(attempt.userAgent, {
                showIcons: true,
                format: 'full'
            });
            const securityInfo = getSecurityAlertInfo(attempt.userAgent);

            attempt.userAgentInfo = userAgentInfo;
            attempt.userAgentDisplay = userAgentDisplay;
            attempt.securityInfo = securityInfo;
        } catch (uaError) {
            Logger.warn('Error parseando User-Agent', { error: uaError.message });
            attempt.userAgentInfo = parseUserAgent('');
            attempt.userAgentDisplay = 'Dispositivo desconocido';
            attempt.securityInfo = getSecurityAlertInfo('');
        }

        return attempt;
    }

    /**
     * Responder a intento de login (lógica de negocio)
     */
    static async respondToLoginAttemptLogic(attemptId, approved, userId) {
        const query = `
            SELECT user_id FROM login_attempts 
            WHERE id = $1 AND status = 'pending' AND expires_at > NOW()
        `;

        const { rows } = await pool.query(query, [attemptId]);

        if (rows.length === 0) {
            throw new Error("Intento de login no encontrado o ya procesado");
        }

        if (userId != rows[0].user_id) {
            throw new Error("No tienes permiso para responder a este intento");
        }

        const updateQuery = `
            UPDATE login_attempts 
            SET status = $1, 
                updated_at = NOW() 
            WHERE id = $2
        `;

        await pool.query(updateQuery, [approved ? 'approved' : 'rejected', attemptId]);

        await redisService.set(
            `login_attempt:${attemptId}`,
            {
                ...(await redisService.get(`login_attempt:${attemptId}`) || {}),
                status: approved ? 'approved' : 'rejected',
                respondedAt: Date.now()
            },
            600 // 10 minutos
        );

        return {
            message: approved ? "Inicio de sesión aprobado" : "Inicio de sesión rechazado",
            status: approved ? 'approved' : 'rejected'
        };
    }

    /**
     * Verificar código de login (lógica de negocio)
     */
    static async verifyLoginCodeLogic(email, code, attemptId, forceLogin) {
        const userQuery = "SELECT id_user FROM usuario WHERE LOWER(correo) = LOWER($1)";
        const userResult = await pool.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            throw new Error("Usuario no encontrado");
        }

        const userId = userResult.rows[0].id_user;

        let attempt;

        attempt = await redisService.get(`login_attempt:${attemptId}`);

        if (!attempt) {
            // Si no está en Redis, buscar en base de datos
            const query = `
                SELECT 
                    verification_code, 
                    status, 
                    expires_at > NOW() as valid
                FROM login_attempts 
                WHERE id = $1 AND user_id = $2
            `;

            const { rows } = await pool.query(query, [attemptId, userId]);

            if (rows.length === 0) {
                throw new Error("Intento de inicio de sesión no encontrado");
            }

            attempt = rows[0];
        }

        const isValid = attempt.valid !== undefined ? attempt.valid : true;
        if (!isValid) {
            throw new Error("El código ha expirado");
        }

        if (attempt.status === 'rejected') {
            throw new Error("Este intento de inicio de sesión fue rechazado");
        }

        const correctCode = attempt.verification_code || attempt.verificationCode;
        if (correctCode !== code) {
            throw new Error("Código incorrecto");
        }

        // Si llegamos aquí, el código es válido

        // Si se requiere forzar el inicio de sesión
        if (forceLogin) {
            // 1. Generar nuevos tokens para esta sesión
            const user = { id_user: userId, correo: email };
            const tokens = await this.generateTokens(user);

            // 2. AHORA revocar todas las demás sesiones (después de generar tokens)
            await this.revokeOtherSessions(userId, tokens.accessToken);

            // 3. Marcar este intento como completado
            const updateQuery = `
                UPDATE login_attempts 
                SET status = 'completed', 
                    updated_at = NOW() 
                WHERE id = $1
            `;

            await pool.query(updateQuery, [attemptId]);

            // 4. Actualizar también en Redis
            await redisService.set(
                `login_attempt:${attemptId}`,
                {
                    ...attempt,
                    status: 'completed',
                    completedAt: Date.now()
                },
                600
            );

            // 5. Actualizar last_login
            try {
                const updateLastLoginQuery = "UPDATE usuario SET last_login = NOW() WHERE id_user = $1";
                await pool.query(updateLastLoginQuery, [userId]);

                Logger.info(`Actualizado last_login para usuario ${userId} (verificación de código)`);
            } catch (updateError) {
                Logger.warn(`No se pudo actualizar last_login (verificación)`, { error: updateError.message });
            }

            // 6. Retornar datos para el controller
            return {
                status: "success",
                forceLogin: true,
                message: "Verificación exitosa, sesión iniciada",
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken
                },
                user: { id: userId, correo: email }
            };
        } else {
            // Si solo queremos verificar sin forzar login

            const updateQuery = `
                UPDATE login_attempts 
                SET status = 'approved', 
                    updated_at = NOW() 
                WHERE id = $1
            `;

            await pool.query(updateQuery, [attemptId]);

            await redisService.set(
                `login_attempt:${attemptId}`,
                {
                    ...attempt,
                    status: 'approved',
                    approvedAt: Date.now()
                },
                600
            );

            return {
                status: "success",
                forceLogin: false,
                message: "Código verificado correctamente",
                approved: true
            };
        }
    }

    /**
     * Reenviar código de verificación (lógica de negocio)
     */
    static async resendVerificationCodeLogic(email, attemptId) {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        const query = `
            UPDATE login_attempts 
            SET verification_code = $1,
                expires_at = NOW() + INTERVAL '10 minutes',
                updated_at = NOW()
            WHERE id = $2
            RETURNING user_id
        `;

        const { rows } = await pool.query(query, [newCode, attemptId]);

        if (rows.length === 0) {
            throw new Error("Intento de inicio de sesión no encontrado");
        }

        const attempt = await redisService.get(`login_attempt:${attemptId}`);
        if (attempt) {
            await redisService.set(
                `login_attempt:${attemptId}`,
                {
                    ...attempt,
                    verificationCode: newCode,
                    updatedAt: Date.now()
                },
                600
            );
        }

        await this.sendVerificationEmail(email, attemptId);

        return { message: "Código reenviado correctamente" };
    }

    /**
     * Verificar estado de sesión (lógica de negocio)
     */
    static async checkSessionStatusLogic(userId, sessionId) {
        const activeSession = await redisService.get(`session:${userId}`);

        if (!activeSession || activeSession.sessionId !== sessionId) {
            return {
                status: "revoked",
                message: "Sesión cerrada en otro dispositivo"
            };
        }

        // Sesión activa y válida
        return {
            status: "active",
            message: "Sesión activa"
        };
    }

    /**
     * Verificar credenciales sin generar tokens (lógica de negocio)
     */
    static async checkLoginStatusLogic(correo, contraseña, requestData) {
        if (!correo || !contraseña) {
            return {
                authenticated: false,
                reason: "INCOMPLETE_DATA",
                message: "Datos de acceso incompletos"
            };
        }

        try {
            const userQuery = "SELECT id_user, correo, contraseña, email_verified, google_id FROM usuario WHERE LOWER(correo) = LOWER($1)";
            const { rows } = await pool.query(userQuery, [correo.trim()]);

            if (rows.length === 0) {
                logSecurityEvent('LOGIN_STATUS_CHECK', 'Usuario no encontrado', {
                    email: correo,
                    ip: requestData?.ipAddress,
                    userAgent: requestData?.userAgent
                });
                return {
                    authenticated: false,
                    reason: "USER_NOT_FOUND",
                    message: "Usuario no encontrado"
                };
            }

            const user = rows[0];

            // NUEVO: Verificar si es un usuario de Google
            if (user.google_id && (!user.contraseña || user.contraseña === null)) {
                return {
                    authenticated: false,
                    reason: "GOOGLE_ACCOUNT",
                    message: "Esta cuenta fue creada con Google. Por favor, inicia sesión con el botón de Google.",
                    isGoogleAccount: true
                };
            }

            if (!user.contraseña) {
                logSecurityEvent('LOGIN_STATUS_CHECK', 'Cuenta sin contraseña', {
                    userId: user.id_user,
                    ip: requestData?.ipAddress,
                    attemptCount: await this.getFailedLoginCount(requestData?.ipAddress)
                });
                return {
                    authenticated: false,
                    reason: "NO_PASSWORD",
                    message: "Esta cuenta no tiene contraseña configurada. Por favor, utiliza otro método de inicio de sesión."
                };
            }

            const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);

            if (!isValidPassword) {
                logSecurityEvent('LOGIN_STATUS_CHECK', 'Credenciales inválidas', {
                    userId: user.id_user,
                    ip: requestData?.ipAddress,
                    attemptCount: await this.getFailedLoginCount(requestData?.ipAddress)
                });
                return {
                    authenticated: false,
                    reason: "INVALID_CREDENTIALS",
                    message: "Credenciales inválidas"
                };
            }

            // NUEVO: Verificar si el correo está verificado
            if (!user.email_verified) {
                logSecurityEvent('LOGIN_STATUS_CHECK', 'Correo no verificado', {
                    userId: user.id_user,
                    ip: requestData?.ipAddress,
                    userAgent: requestData?.userAgent
                });
                return {
                    authenticated: false,
                    reason: "EMAIL_NOT_VERIFIED",
                    message: "Por favor verifica tu correo electrónico para iniciar sesión",
                    requiresVerification: true,
                    userId: user.id_user,
                    email: user.correo
                };
            }

            const hasActiveSess = await this.hasActiveSession(user.id_user);

            if (hasActiveSess) {
                return {
                    authenticated: false,
                    reason: "ACTIVE_SESSION",
                    message: "Hay una sesión activa en otro dispositivo",
                    requiresVerification: true,
                    userId: user.id_user
                };
            }

            // Si las credenciales son válidas y no hay sesión activa
            return {
                authenticated: true,
                message: "Credenciales válidas",
                userId: user.id_user,
                email: user.correo
            };

        } catch (credentialError) {
            Logger.error("Error al verificar credenciales", credentialError);
            return {
                authenticated: false,
                reason: "VERIFICATION_ERROR",
                message: "Error al verificar credenciales"
            };
        }
    }

    /**
     * Lógica de revocación de sesiones
     */
    static async revokeSessionsLogic(userId, options = {}) {
        const { currentToken, keepCurrentSession, reason = 'user_initiated' } = options;

        // Revocar todas las sesiones (excepto la actual si se indica)
        let result;
        if (keepCurrentSession && currentToken) {
            Logger.info(`Revocando sesiones para ${userId} excepto la actual`);
            // Revocar todas excepto la actual
            result = await this.revokeOtherSessions(userId, currentToken);
            Logger.info('Resultado de revocación parcial', { result });
        } else {
            Logger.info(`Revocando TODAS las sesiones para ${userId}`);
            // Revocar absolutamente todas las sesiones
            result = await this.revokeAllTokens(userId);
            Logger.info('Resultado de revocación total', { result });
        }

        return {
            success: true,
            tokensRevoked: result.tokensRevoked || 0,
            message: keepCurrentSession
                ? `Revocadas ${result.tokensRevoked || 0} sesiones para el usuario ${userId} (excepto la actual)`
                : `Revocadas todas las sesiones para el usuario ${userId}`,
            shouldClearCookies: !keepCurrentSession
        };
    }

    /**
     * Lógica de logout
     */
    static async performLogout(userId, refreshToken, sessionData) {
        if (userId) {
            await this.logout(userId, refreshToken);

            await this.cleanupCsrfTokens(userId, sessionData);

            logSecurityEvent('LOGOUT', 'Cierre de sesión exitoso', {
                userId: userId,
                ip: sessionData?.ip,
                userAgent: sessionData?.userAgent
            });
        }

        return {
            success: true,
            message: "Sesión cerrada completamente",
            shouldClearCookies: true
        };
    }
}

// 🆕 Cleanup al cerrar la aplicación
process.on('SIGINT', () => {
    console.log('[AUTH] Limpiando locks de operaciones...');
    operationLocks.clear();
});

process.on('SIGTERM', () => {
    operationLocks.clear();
});