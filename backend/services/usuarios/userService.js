import pool from "../../lib/dbPool.js";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { logSecurityEvent } from '../../utils/securityLogger.js';

export class UserService {

    /**
     * Crear usuario completo con perfil y rol
     */
    static async createUserWithProfile({ correo, contraseña, aceptarTerminos, metadata }) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Verificar disponibilidad de correo
            const emailCheckResult = await this._checkEmailAvailability(correo, client);
            if (!emailCheckResult.success) {
                await client.query('ROLLBACK');
                return emailCheckResult;
            }

            // 2. Crear usuario
            const userResult = await this._createUser({ correo, contraseña }, client);
            if (!userResult.success) {
                await client.query('ROLLBACK');
                return userResult;
            }

            // 3. Crear perfil con rol gratuito
            const profileResult = await this._createUserProfile(userResult.user.id_user, client);
            if (!profileResult.success) {
                await client.query('ROLLBACK');
                return profileResult;
            }

            // 4. Registrar aceptación de términos
            await this._recordTermsAcceptance(userResult.user.id_user, aceptarTerminos, metadata, client);

            await client.query('COMMIT');

            // 5. Enviar correo de verificación (fuera de transacción)
            const emailResult = await this._sendVerificationEmail(correo, userResult.user.verification_token);

            // 6. Log de éxito
            logSecurityEvent('USER_REGISTRATION_SUCCESS', 'Usuario registrado exitosamente', {
                userId: userResult.user.id_user,
                email: correo,
                emailSent: emailResult.success,
                ip: metadata.ip
            }, 'medium');

            return {
                success: true,
                message: "Usuario creado con éxito. Por favor verifica tu correo electrónico.",
                user: {
                    id_user: userResult.user.id_user,
                    correo: userResult.user.correo,
                    created_at: userResult.user.created_at,
                    email_verified: false,
                    fecha_registro_formatada: new Date(userResult.user.created_at).toLocaleString()
                },
                requiresVerification: true,
                emailSent: emailResult.success,
                details: {
                    nextSteps: [
                        "Revisa tu correo electrónico (incluye la carpeta de spam)",
                        "Haz clic en el enlace de verificación",
                        "Inicia sesión con tus credenciales"
                    ]
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            return this._handleCreateUserError(error, correo, metadata);
        } finally {
            client.release();
        }
    }

    /**
     * Actualizar usuario con email y retornar correo actual
     * Método específico para el controlador refactorizado
     */
    static async updateUserWithEmail(userId, correo, contraseña) {
        try {
            // Primero obtener el correo actual antes de actualizar
            const currentUserQuery = "SELECT correo FROM usuario WHERE id_user = $1";
            const currentUserResult = await pool.query(currentUserQuery, [userId]);

            if (currentUserResult.rows.length === 0) {
                return {
                    success: false,
                    error: "Usuario no encontrado",
                    errorCode: "USER_NOT_FOUND"
                };
            }

            const currentEmail = currentUserResult.rows[0].correo;

            let query = "UPDATE usuario SET ";
            let values = [];
            let setClauses = [];
            let paramIndex = 1;

            if (correo && correo.trim() !== '') {
                setClauses.push(`correo = LOWER($${paramIndex})`);
                values.push(correo.trim());
                paramIndex++;
            }

            if (contraseña && contraseña.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(contraseña, salt);
                setClauses.push(`contraseña = $${paramIndex}`);
                values.push(hashedPassword);
                paramIndex++;
            }

            // Si no hay nada que actualizar
            if (setClauses.length === 0) {
                return {
                    success: false,
                    error: "No se proporcionaron datos para actualizar",
                    errorCode: "NO_UPDATE_DATA"
                };
            }

            query += setClauses.join(', ');
            query += ` WHERE id_user = $${paramIndex} RETURNING id_user, correo`;
            values.push(userId);

            const { rows } = await pool.query(query, values);

            if (rows.length === 0) {
                return {
                    success: false,
                    error: "Usuario no encontrado",
                    errorCode: "USER_NOT_FOUND"
                };
            }

            const updatedUser = rows[0];

            return {
                success: true,
                user: {
                    id_user: updatedUser.id_user,
                    correo: currentEmail,
                    updatedEmail: updatedUser.correo // Nuevo correo si se actualizó
                }
            };

        } catch (error) {
            console.error('Error en updateUserWithEmail:', error);

            if (error.code === '23505' && error.constraint === 'usuario_correo_key') {
                return {
                    success: false,
                    error: "Este correo electrónico ya está en uso por otro usuario",
                    errorCode: "EMAIL_ALREADY_EXISTS"
                };
            }

            return {
                success: false,
                error: "Error al actualizar usuario",
                errorCode: "UPDATE_ERROR"
            };
        }
    }

    // MÉTODOS PRIVADOS - LÓGICA DE NEGOCIO

    /**
     * Verificar disponibilidad de correo
     */
    static async _checkEmailAvailability(correo, client) {
        try {
            const query = "SELECT id_user, email_verified FROM usuario WHERE LOWER(correo) = LOWER($1)";
            const { rows } = await client.query(query, [correo.trim()]);

            if (rows.length > 0) {
                const existingUser = rows[0];

                logSecurityEvent('DUPLICATE_EMAIL_REGISTRATION', 'Intento de registro con correo existente', {
                    email: correo,
                    existingUserId: existingUser.id_user,
                    isVerified: existingUser.email_verified
                }, 'medium');

                return {
                    success: false,
                    error: "Este correo electrónico ya está registrado",
                    errorCode: "EMAIL_ALREADY_EXISTS",
                    details: {
                        isVerified: existingUser.email_verified,
                        suggestion: existingUser.email_verified
                            ? "Intenta iniciar sesión en su lugar"
                            : "Verifica tu correo electrónico o solicita un nuevo enlace de verificación"
                    }
                };
            }

            return { success: true };
        } catch (error) {
            console.error('Error verificando disponibilidad de correo:', error);
            return {
                success: false,
                error: "Error verificando disponibilidad del correo",
                errorCode: "EMAIL_CHECK_ERROR"
            };
        }
    }

    /**
     * Crear usuario en base de datos
     */
    static async _createUser({ correo, contraseña }, client) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(contraseña, salt);

            const verificationToken = crypto.randomBytes(32).toString('hex');
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            const query = `
                INSERT INTO usuario (
                    correo, 
                    contraseña, 
                    created_at, 
                    email_verified, 
                    verification_token, 
                    token_expiry
                ) 
                VALUES (LOWER($1), $2, NOW(), FALSE, $3, $4) 
                RETURNING id_user, correo, created_at, verification_token, token_expiry
            `;

            const values = [correo.trim(), hashedPassword, verificationToken, expiryDate];
            const { rows } = await client.query(query, values);

            return {
                success: true,
                user: rows[0]
            };
        } catch (error) {
            console.error('Error creando usuario:', error);
            return {
                success: false,
                error: "Error creando usuario",
                errorCode: "USER_CREATION_ERROR"
            };
        }
    }

    /**
     * Crear perfil con rol gratuito
     */
    static async _createUserProfile(userId, client) {
        try {
            const query = `INSERT INTO perfil (id_usuario, id_rol) VALUES ($1, $2)`;
            await client.query(query, [userId, 1]); // rol 1 = gratuito

            console.log(`✅ Perfil creado con rol gratuito para usuario ${userId}`);

            return { success: true };
        } catch (error) {
            console.error('Error creando perfil:', error);
            return {
                success: false,
                error: "Error configurando cuenta de usuario",
                errorCode: "PROFILE_CREATION_ERROR"
            };
        }
    }

    /**
     * Registrar aceptación de términos
     */
    static async _recordTermsAcceptance(userId, aceptarTerminos, metadata, client) {
        if (!aceptarTerminos) return;

        try {
            const termsVersion = process.env.TERMS_VERSION || '1.0';

            await client.query(
                `INSERT INTO terms_acceptances (user_id, terms_version, ip_address, user_agent, acceptance_method)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, termsVersion, metadata.ip, metadata.userAgent, 'registro_web']
            );

            console.log(`✅ Aceptación de términos registrada para usuario ${userId}`);
        } catch (error) {
            console.error('Error registrando aceptación de términos:', error);
            // No es crítico, no interrumpir el flujo
        }
    }

    /**
     * Enviar correo de verificación
     */
    static async _sendVerificationEmail(correo, verificationToken) {
        try {
            const { emailService } = await import('../../services/email/emailService.js');
            await emailService.sendWelcomeVerificationEmail(correo, verificationToken);

            console.log(`✅ Correo de verificación enviado a: ${correo}`);
            return { success: true };
        } catch (error) {
            console.error('Error enviando correo de verificación:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Manejar errores específicos de creación de usuario
     */
    static _handleCreateUserError(error, correo, metadata) {
        console.error('Error en createUserWithProfile:', error);

        // Error de constraint de PostgreSQL (correo duplicado)
        if (error.code === '23505' && error.constraint === 'usuario_correo_key') {
            logSecurityEvent('DUPLICATE_EMAIL_CONSTRAINT', 'Error de constraint de correo duplicado', {
                email: correo,
                error: error.message,
                ip: metadata.ip
            }, 'medium');

            return {
                success: false,
                error: "Este correo electrónico ya está registrado",
                errorCode: "EMAIL_ALREADY_EXISTS_DB",
                details: {
                    suggestion: "Intenta iniciar sesión o usar un correo diferente"
                }
            };
        }

        // Error de conexión a base de datos
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            logSecurityEvent('DB_CONNECTION_ERROR', 'Error de conexión a BD durante registro', {
                email: correo,
                error: error.message,
                ip: metadata.ip
            }, 'high');

            return {
                success: false,
                error: "Servicio temporalmente no disponible. Intenta nuevamente en unos minutos.",
                errorCode: "SERVICE_UNAVAILABLE"
            };
        }

        // Error genérico de base de datos
        if (error.code && error.code.startsWith('23')) {
            return {
                success: false,
                error: "Error de validación de datos",
                errorCode: "DATA_VALIDATION_ERROR"
            };
        }

        logSecurityEvent('USER_REGISTRATION_ERROR', 'Error general al registrar usuario', {
            email: correo,
            error: error.message,
            stack: error.stack,
            ip: metadata.ip
        }, 'high');

        return {
            success: false,
            error: "Error interno del servidor",
            errorCode: "INTERNAL_SERVER_ERROR"
        };
    }

    // MÉTODOS EXISTENTES (mantener compatibilidad)

    static async createUser(correo, contraseña) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(contraseña, salt);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);

        const query = `
          INSERT INTO usuario (
            correo, 
            contraseña, 
            created_at, 
            email_verified, 
            verification_token, 
            token_expiry
          ) 
          VALUES (LOWER($1), $2, NOW(), FALSE, $3, $4) 
          RETURNING id_user, correo, created_at, verification_token, token_expiry
        `;

        const values = [correo.trim(), hashedPassword, verificationToken, expiryDate];
        const { rows } = await pool.query(query, values);

        return rows[0];
    }

    static async verifyEmail(token) {
        try {
            const query = `
                UPDATE usuario 
                SET email_verified = TRUE, 
                    verification_token = NULL,
                    token_expiry = NULL
                WHERE verification_token = $1 
                AND token_expiry > NOW()
                RETURNING id_user, correo
            `;

            const { rows } = await pool.query(query, [token]);

            if (rows.length === 0) {
                return { success: false, message: "Token inválido o expirado" };
            }

            return {
                success: true,
                message: "Correo verificado exitosamente",
                user: rows[0]
            };
        } catch (error) {
            console.error("Error verificando correo:", error);
            throw new Error("Error al verificar correo electrónico");
        }
    }

    static async regenerateVerificationToken(email) {
        try {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            const query = `
                UPDATE usuario 
                SET verification_token = $1,
                    token_expiry = $2
                WHERE LOWER(correo) = LOWER($3) 
                AND email_verified = FALSE
                RETURNING id_user, correo, verification_token, token_expiry
            `;

            const { rows } = await pool.query(query, [verificationToken, expiryDate, email.trim()]);

            if (rows.length === 0) {
                return { success: false, message: "Usuario no encontrado o ya verificado" };
            }

            return {
                success: true,
                message: "Token regenerado exitosamente",
                user: rows[0]
            };
        } catch (error) {
            console.error("Error regenerando token:", error);
            throw new Error("Error al regenerar token de verificación");
        }
    }

    static async isEmailAvailable(email) {
        try {
            const query = "SELECT COUNT(*) FROM usuario WHERE correo = $1";
            const { rows } = await pool.query(query, [email.trim()]);

            return parseInt(rows[0].count) === 0;
        } catch (error) {
            console.error("Error verificando disponibilidad de correo:", error);
            throw new Error("Error al verificar disponibilidad del correo");
        }
    }

    static async getAllUsers() {
        const query = "SELECT id_user, correo, email_verified FROM usuario";
        const { rows } = await pool.query(query);
        return rows;
    }

    static async updateUser(id, correo, contraseña) {
        let query = "UPDATE usuario SET correo = COALESCE($1, correo)";
        let values = [correo || null];

        if (contraseña) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(contraseña, salt);
            query += ", contraseña = $2";
            values.push(hashedPassword);
        }

        query += " WHERE id_user = $3 RETURNING id_user, correo";
        values.push(id);

        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    static async verifyUserPassword(correo, contraseña) {
        try {
            const query = 'SELECT id_user, contraseña FROM usuario WHERE LOWER(correo) = LOWER($1)';
            const { rows } = await pool.query(query, [correo.trim()]);

            if (rows.length === 0) {
                throw new Error("Usuario no encontrado");
            }

            const usuario = rows[0];
            const isValid = await bcrypt.compare(contraseña, usuario.contraseña);

            return isValid;

        } catch (error) {
            console.error('Error al verificar contraseña:', error.message);
            throw error;
        }
    }

    static async deleteUser(id) {
        const query = "DELETE FROM usuario WHERE id_user = $1";
        const { rowCount } = await pool.query(query, [id]);
        return rowCount > 0;
    }

    static async checkGoogleAuth(id) {
        try {
            const query = `
                SELECT 
                    u.id_user, 
                    u.correo,
                    u.email_verified,
                    u.google_id,
                    u.contraseña,
                    CASE WHEN u.google_id IS NOT NULL AND u.google_id != '' THEN true ELSE false END AS "isGoogleUser",
                    CASE WHEN u.contraseña IS NOT NULL AND LENGTH(u.contraseña) > 10 THEN true ELSE false END AS "hasPassword"
                FROM usuario u
                WHERE u.id_user = $1
            `;

            const { rows } = await pool.query(query, [id]);

            if (rows.length === 0) {
                throw new Error("Usuario no encontrado");
            }

            const userData = rows[0];

            console.log("Información de autenticación del usuario:", {
                id: userData.id_user,
                isGoogleUser: userData.isGoogleUser,
                hasPassword: userData.hasPassword,
                hasGoogleId: !!userData.google_id,
                passwordLength: userData.contraseña ? userData.contraseña.length : 0
            });

            return {
                id_user: userData.id_user,
                correo: userData.correo,
                email_verified: userData.email_verified,
                isGoogleUser: userData.isGoogleUser,
                hasPassword: userData.hasPassword
            };
        } catch (error) {
            console.error('Error al verificar tipo de autenticación:', error);
            throw error;
        }
    }

    static async cleanupUnverifiedUsers() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Obtener usuarios que serán eliminados
            const selectQuery = `
            SELECT id_user, correo
            FROM usuario
            WHERE email_verified = FALSE
            AND token_expiry < NOW()
        `;
            const { rows: usersToDelete } = await client.query(selectQuery);

            if (usersToDelete.length === 0) {
                await client.query('COMMIT');
                console.log('No se encontraron usuarios no verificados para eliminar');
                return [];
            }

            const userIds = usersToDelete.map(user => user.id_user);
            console.log(`Preparando eliminación de ${userIds.length} usuarios: ${userIds.join(', ')}`);

            const deleteTokensQuery = `
            DELETE FROM terms_acceptance_tokens
            WHERE user_id = ANY($1::int[])
        `;
            const tokensResult = await client.query(deleteTokensQuery, [userIds]);
            console.log(`Eliminados ${tokensResult.rowCount} tokens de términos`);

            const deleteAcceptancesQuery = `
            DELETE FROM terms_acceptances
            WHERE user_id = ANY($1::int[])
        `;
            const acceptancesResult = await client.query(deleteAcceptancesQuery, [userIds]);
            console.log(`Eliminadas ${acceptancesResult.rowCount} aceptaciones de términos`);

            // 4. Eliminar perfiles (como antes)
            const deleteProfilesQuery = `
            DELETE FROM perfil
            WHERE id_usuario = ANY($1::int[])
        `;
            const profilesResult = await client.query(deleteProfilesQuery, [userIds]);
            console.log(`Eliminados ${profilesResult.rowCount} perfiles`);

            // 5. Finalmente eliminar usuarios
            const deleteUsersQuery = `
            DELETE FROM usuario
            WHERE id_user = ANY($1::int[])
        `;
            const usersResult = await client.query(deleteUsersQuery, [userIds]);
            console.log(`Eliminados ${usersResult.rowCount} usuarios`);

            await client.query('COMMIT');

            console.log(`✅ Limpieza completa: ${usersToDelete.length} usuarios no verificados eliminados exitosamente`);
            return usersToDelete;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error limpiando usuarios no verificados:", error);
            throw error;
        } finally {
            client.release();
        }
    }
}