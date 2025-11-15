// ========================================
// ========================================

import { UserService } from "../../services/usuarios/userService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { Logger } from "../../utils/logger.js";

/**
 * Crear nuevo usuario con perfil
 */
export const createUser = async (req, res) => {
    try {
        const { correo, contraseña, confirmarContraseña, aceptarTerminos } = req.body;

        // Validaciones HTTP básicas
        const validationError = validateCreateUserInput({
            correo,
            contraseña,
            confirmarContraseña,
            aceptarTerminos
        });

        if (validationError) {
            return res.status(400).json(validationError);
        }

        const result = await UserService.createUserWithProfile({
            correo,
            contraseña,
            aceptarTerminos,
            metadata: {
                ip: req.ip || req.connection.remoteAddress || 'Unknown',
                userAgent: req.headers['user-agent'] || 'Unknown'
            }
        });

        if (!result.success) {
            const statusCode = getHttpStatusFromError(result.errorCode);
            return res.status(statusCode).json({
                success: false,
                error: result.error,
                code: result.errorCode,
                details: result.details
            });
        }

        res.status(201).json({
            success: true,
            message: result.message,
            user: result.user,
            requiresVerification: result.requiresVerification,
            emailSent: result.emailSent,
            details: result.details
        });

    } catch (error) {
        Logger.error('Error en createUser controller', error, {
            ip: req.ip
        });

        logSecurityEvent('CONTROLLER_ERROR', 'Error crítico en controller de registro', {
            error: error.message,
            ip: req.ip
        }, 'high');

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * Verificar tipo de autenticación de usuario
 */
export const checkUserAuthType = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: "ID de usuario inválido",
                code: "INVALID_USER_ID"
            });
        }

        const result = await UserService.checkGoogleAuth(parseInt(id));

        logSecurityEvent('AUTH_TYPE_CHECK', 'Verificación de tipo de autenticación', {
            userId: id,
            requesterId: req.user?.id_user,
            authType: result.isGoogleUser ? 'google' : 'email',
            ip: req.ip
        }, 'info');

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        Logger.error('Error en checkUserAuthType', error, {
            userId: req.params.id,
            requesterId: req.user?.id_user,
            ip: req.ip
        });

        logSecurityEvent('AUTH_TYPE_CHECK_ERROR', 'Error al verificar tipo de autenticación', {
            userId: req.params.id,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');

        const statusCode = error.message === "Usuario no encontrado" ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            code: statusCode === 404 ? "USER_NOT_FOUND" : "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Verificar correo electrónico con token
 */
export const verifyUserEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: "Token de verificación no proporcionado",
                code: "MISSING_TOKEN"
            });
        }

        const result = await UserService.verifyEmail(token);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.message,
                code: "INVALID_TOKEN"
            });
        }

        logSecurityEvent('EMAIL_VERIFIED', 'Usuario verificó su correo electrónico', {
            userId: result.user.id_user,
            email: result.user.correo,
            ip: req.ip
        }, 'medium');

        res.status(200).json({
            success: true,
            message: result.message,
            user: {
                id: result.user.id_user,
                correo: result.user.correo
            }
        });

    } catch (error) {
        Logger.error("Error en verifyUserEmail", error, {
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            error: "Error al verificar correo electrónico",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Reenviar correo de verificación
 */
export const resendVerificationEmail = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                success: false,
                error: "Correo electrónico no proporcionado",
                code: "MISSING_EMAIL"
            });
        }

        const result = await UserService.regenerateVerificationToken(correo);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.message,
                code: "TOKEN_REGENERATION_FAILED"
            });
        }

        try {
            const { emailService } = await import('../../services/email/emailService.js');
            await emailService.sendWelcomeVerificationEmail(correo, result.user.verification_token);
        } catch (emailError) {
            Logger.error("Error enviando correo de verificación", emailError, {
                email: correo,
                ip: req.ip
            });
            return res.status(500).json({
                success: false,
                error: "Error al enviar correo de verificación",
                code: "EMAIL_SEND_ERROR"
            });
        }

        logSecurityEvent('VERIFICATION_EMAIL_RESENT', 'Reenvío de correo de verificación', {
            email: correo,
            ip: req.ip
        }, 'medium');

        res.status(200).json({
            success: true,
            message: "Correo de verificación reenviado exitosamente"
        });

    } catch (error) {
        Logger.error("Error en resendVerificationEmail", error, {
            email: req.body.correo,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            error: "Error al reenviar correo de verificación",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Obtener todos los usuarios
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await UserService.getAllUsers();

        logSecurityEvent('ALL_USERS_ACCESS', 'Acceso a lista completa de usuarios', {
            requesterId: req.user?.id_user,
            ip: req.ip
        }, 'high');

        res.status(200).json({
            success: true,
            users: users
        });

    } catch (error) {
        Logger.error("Error en getAllUsers", error, {
            requesterId: req.user?.id_user,
            ip: req.ip
        });

        logSecurityEvent('ALL_USERS_ACCESS_ERROR', 'Error al acceder a lista de usuarios', {
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');

        res.status(500).json({
            success: false,
            error: "Error al obtener usuarios",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Actualizar usuario
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { correo, contraseña, currentPassword, revokeAllSessions } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: "ID de usuario inválido",
                code: "INVALID_USER_ID"
            });
        }

        if (!correo && !contraseña) {
            return res.status(400).json({
                success: false,
                error: "Correo o contraseña son obligatorios para actualizar",
                code: "MISSING_UPDATE_DATA"
            });
        }

        const isSelfUpdate = req.user?.id_user == id;

        logSecurityEvent('USER_UPDATE_ATTEMPT', 'Intento de actualización de usuario', {
            targetUserId: id,
            requesterId: req.user?.id_user,
            isSelfUpdate: isSelfUpdate,
            updatingEmail: !!correo,
            updatingPassword: !!contraseña,
            hasCurrentPassword: !!currentPassword,
            ip: req.ip
        }, 'medium');

        // 🆕 NUEVO: Verificar tipo de autenticación si se está cambiando contraseña
        if (contraseña) {
            const authInfo = await UserService.checkGoogleAuth(parseInt(id));
            
            // 🆕 LÓGICA ESPECÍFICA: Solo verificar contraseña actual si el usuario tiene una contraseña establecida
            if (!authInfo.isGoogleUser || authInfo.hasPassword) {
                // Usuario normal O usuario de Google CON contraseña - requiere verificación
                if (!currentPassword) {
                    return res.status(400).json({
                        success: false,
                        error: "Se requiere la contraseña actual para cambiar la contraseña",
                        code: "CURRENT_PASSWORD_REQUIRED"
                    });
                }

                try {
                    const isValidPassword = await UserService.verifyUserPassword(
                        req.user.correo, 
                        currentPassword
                    );
                    
                    if (!isValidPassword) {
                        return res.status(401).json({
                            success: false,
                            error: "La contraseña actual es incorrecta",
                            code: "INVALID_CURRENT_PASSWORD"
                        });
                    }
                } catch (verifyError) {
                    Logger.error('Error verificando contraseña actual', verifyError, {
                        userId: id,
                        ip: req.ip
                    });
                    return res.status(500).json({
                        success: false,
                        error: "Error al verificar contraseña actual",
                        code: "PASSWORD_VERIFICATION_ERROR"
                    });
                }
            } else {
                // Usuario de Google SIN contraseña - estableciendo contraseña por primera vez
                logSecurityEvent('GOOGLE_USER_PASSWORD_SETUP', 'Usuario de Google estableciendo contraseña', {
                    userId: id,
                    requesterId: req.user?.id_user,
                    ip: req.ip
                }, 'medium');
            }
        }

        const result = await UserService.updateUserWithEmail(parseInt(id), correo, contraseña);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
                code: result.errorCode || "UPDATE_FAILED"
            });
        }

        // Si se actualizó la contraseña, manejar sesiones y notificaciones
        if (contraseña) {
            await handlePasswordChange(id, result.user.correo, req, revokeAllSessions);
        }

        logSecurityEvent('USER_UPDATED', 'Usuario actualizado exitosamente', {
            userId: id,
            requesterId: req.user?.id_user,
            updatedEmail: !!correo,
            updatedPassword: !!contraseña,
            wasPasswordSetup: contraseña && !currentPassword,
            ip: req.ip
        }, 'medium');

        res.status(200).json({
            success: true,
            message: contraseña && !currentPassword 
                ? "Contraseña establecida exitosamente" 
                : "Usuario actualizado con éxito",
            user: result.user,
            sessionsRevoked: (contraseña && revokeAllSessions) ? true : false,
            passwordChangeEmailSent: !!contraseña,
            isPasswordSetup: contraseña && !currentPassword
        });

    } catch (error) {
        Logger.error("Error en updateUser", error, {
            targetUserId: req.params.id,
            requesterId: req.user?.id_user,
            ip: req.ip
        });

        logSecurityEvent('USER_UPDATE_ERROR', 'Error al actualizar usuario', {
            targetUserId: req.params.id,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');

        res.status(500).json({
            success: false,
            error: "Error al actualizar usuario",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};


/**
 * Eliminar usuario
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: "ID de usuario inválido",
                code: "INVALID_USER_ID"
            });
        }

        logSecurityEvent('USER_DELETE_ATTEMPT', 'Intento de eliminación de usuario', {
            targetUserId: id,
            requesterId: req.user?.id_user,
            ip: req.ip
        }, 'high');

        const isDeleted = await UserService.deleteUser(parseInt(id));

        if (!isDeleted) {
            return res.status(404).json({
                success: false,
                error: "Usuario no encontrado",
                code: "USER_NOT_FOUND"
            });
        }

        logSecurityEvent('USER_DELETED', 'Usuario eliminado exitosamente', {
            targetUserId: id,
            requesterId: req.user?.id_user,
            ip: req.ip
        }, 'high');

        res.status(200).json({
            success: true,
            message: "Usuario eliminado con éxito"
        });

    } catch (error) {
        Logger.error("Error en deleteUser", error, {
            targetUserId: req.params.id,
            requesterId: req.user?.id_user,
            ip: req.ip
        });

        logSecurityEvent('USER_DELETE_ERROR', 'Error al eliminar usuario', {
            targetUserId: req.params.id,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'high');

        res.status(500).json({
            success: false,
            error: "Error al eliminar usuario",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Verificar contraseña actual
 */
export const verifyPassword = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({
                success: false,
                error: "Correo y contraseña son obligatorios",
                code: "MISSING_CREDENTIALS"
            });
        }

        logSecurityEvent('PASSWORD_VERIFICATION_ATTEMPT', 'Intento de verificación de contraseña', {
            email: correo,
            requesterId: req.user?.id_user,
            ip: req.ip
        }, 'medium');

        const isValid = await UserService.verifyUserPassword(correo, contraseña);

        if (isValid) {
            logSecurityEvent('PASSWORD_VERIFICATION_SUCCESS', 'Contraseña verificada correctamente', {
                email: correo,
                requesterId: req.user?.id_user,
                ip: req.ip
            }, 'medium');

            return res.status(200).json({
                success: true,
                message: "Contraseña correcta"
            });
        } else {
            logSecurityEvent('PASSWORD_VERIFICATION_FAILURE', 'Contraseña incorrecta', {
                email: correo,
                requesterId: req.user?.id_user,
                ip: req.ip
            }, 'medium');

            return res.status(401).json({
                success: false,
                error: "Contraseña incorrecta",
                code: "INVALID_PASSWORD"
            });
        }

    } catch (error) {
        Logger.error("Error en verifyPassword", error, {
            email: req.body.correo,
            requesterId: req.user?.id_user,
            ip: req.ip
        });

        logSecurityEvent('PASSWORD_VERIFICATION_ERROR', 'Error verificando contraseña', {
            email: req.body.correo,
            requesterId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');

        if (error.message === "Usuario no encontrado") {
            return res.status(404).json({
                success: false,
                error: "Usuario no encontrado",
                code: "USER_NOT_FOUND"
            });
        }

        res.status(500).json({
            success: false,
            error: "Error al verificar contraseña",
            code: "INTERNAL_SERVER_ERROR"
        });
    }
};

/**
 * Verificar disponibilidad de correo para registro
 */
export const checkUserRegistrationStatus = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(200).json({
                available: false,
                reason: "MISSING_EMAIL",
                message: "El correo electrónico es obligatorio"
            });
        }

        const isAvailable = await UserService.isEmailAvailable(correo);

        if (!isAvailable) {
            logSecurityEvent('REGISTRATION_STATUS_CHECK', 'Correo ya registrado', {
                email: correo,
                ip: req.ip
            }, 'info');

            return res.status(200).json({
                available: false,
                reason: "EMAIL_EXISTS",
                message: "Este correo electrónico ya está registrado"
            });
        }

        return res.status(200).json({
            available: true,
            message: "Correo electrónico disponible para registro"
        });

    } catch (error) {
        Logger.error("Error en checkUserRegistrationStatus", error, {
            email: req.body.correo,
            ip: req.ip
        });

        logSecurityEvent('REGISTRATION_STATUS_ERROR', 'Error al verificar disponibilidad de correo', {
            email: req.body.correo,
            error: error.message,
            ip: req.ip
        }, 'medium');

        return res.status(200).json({
            available: false,
            reason: "SERVER_ERROR",
            message: "Error al verificar disponibilidad del correo"
        });
    }
};

// ========================================
// FUNCIONES HELPER PRIVADAS
// ========================================

/**
 * Valida entrada HTTP para creación de usuario
 */
function validateCreateUserInput({ correo, contraseña, confirmarContraseña, aceptarTerminos }) {
    if (!correo || !contraseña || !confirmarContraseña) {
        return {
            success: false,
            error: "Datos incompletos",
            code: "MISSING_FIELDS",
            details: {
                correo: !correo ? "Correo es obligatorio" : null,
                contraseña: !contraseña ? "Contraseña es obligatoria" : null,
                confirmarContraseña: !confirmarContraseña ? "Confirmación de contraseña es obligatoria" : null
            }
        };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        return {
            success: false,
            error: "Formato de correo electrónico inválido",
            code: "INVALID_EMAIL_FORMAT"
        };
    }

    if (contraseña !== confirmarContraseña) {
        return {
            success: false,
            error: "Las contraseñas no coinciden",
            code: "PASSWORD_MISMATCH"
        };
    }

    if (contraseña.length < 6) {
        return {
            success: false,
            error: "La contraseña debe tener al menos 6 caracteres",
            code: "PASSWORD_TOO_SHORT",
            details: {
                minLength: 6,
                currentLength: contraseña.length
            }
        };
    }

    if (!aceptarTerminos) {
        return {
            success: false,
            error: "Debes aceptar los términos y condiciones para registrarte",
            code: "TERMS_NOT_ACCEPTED"
        };
    }

    return null;
}

/**
 * Mapea códigos de error del servicio a códigos HTTP
 */
function getHttpStatusFromError(errorCode) {
    const errorMap = {
        'MISSING_FIELDS': 400,
        'INVALID_EMAIL_FORMAT': 400,
        'PASSWORD_MISMATCH': 400,
        'PASSWORD_TOO_SHORT': 400,
        'TERMS_NOT_ACCEPTED': 400,
        'EMAIL_ALREADY_EXISTS': 409,
        'EMAIL_ALREADY_EXISTS_DB': 409,
        'DATA_VALIDATION_ERROR': 400,
        'SERVICE_UNAVAILABLE': 503,
        'PROFILE_CREATION_ERROR': 500,
        'INTERNAL_SERVER_ERROR': 500
    };

    return errorMap[errorCode] || 500;
}

/**
 * Manejar cambio de contraseña (sesiones y notificaciones)
 */
async function handlePasswordChange(userId, userEmail, req, revokeAllSessions, isPasswordSetup = false) {
    logSecurityEvent(
        isPasswordSetup ? 'PASSWORD_SETUP' : 'PASSWORD_CHANGE', 
        isPasswordSetup ? 'Usuario estableció contraseña' : 'Usuario cambió su contraseña', 
        {
            userId: userId,
            requesterId: req.user?.id_user,
            isSelfUpdate: req.user?.id_user == userId,
            isPasswordSetup: isPasswordSetup,
            ip: req.ip
        }, 
        'high'
    );

    if (userEmail) {
        try {
            const { emailService } = await import('../../services/email/emailService.js');

            const deviceInfo = {
                ipAddress: req.ip || 'Desconocido',
                userAgent: req.headers['user-agent'] || 'Desconocido'
            };

            const userData = {
                id: userId,
                correo: userEmail
            };

            if (isPasswordSetup) {
                // 🆕 NUEVO: Email específico para establecimiento de contraseña
                await emailService.sendPasswordSetupConfirmation(
                    userEmail,
                    userData,
                    deviceInfo
                );
                Logger.info(`Correo de confirmación de establecimiento de contraseña enviado`, { email: userEmail });
            } else {
                // Email normal para cambio de contraseña
                await emailService.sendPasswordChangeConfirmation(
                    userEmail,
                    userData,
                    {
                        ipAddress: deviceInfo.ipAddress,
                        userAgent: deviceInfo.userAgent,
                        showSecurityWarning: true
                    }
                );
                Logger.info(`Correo de confirmación de cambio de contraseña enviado`, { email: userEmail });
            }
        } catch (emailError) {
            Logger.error("Error al enviar correo de confirmación", emailError, {
                email: userEmail,
                userId: userId
            });
        }
    }

    // Revocar sesiones si se solicita
    if (revokeAllSessions === true) {
        try {
            const currentToken = req.cookies.token || req.headers.authorization?.split(' ')[1];

            if (currentToken) {
                const { AuthService } = await import('../../services/usuarios/authService.js');
                await AuthService.revokeOtherSessions(userId, currentToken);

                logSecurityEvent('SESSIONS_REVOKED', 'Sesiones revocadas tras cambio de contraseña', {
                    userId: userId,
                    requesterId: req.user?.id_user,
                    ip: req.ip
                }, 'high');

                Logger.info(`Sesiones revocadas para usuario ${userId} tras ${isPasswordSetup ? 'establecimiento' : 'cambio'} de contraseña`);
            }
        } catch (revokeError) {
            Logger.error("Error al revocar sesiones", revokeError, {
                userId: userId,
                requesterId: req.user?.id_user,
                ip: req.ip
            });

            logSecurityEvent('SESSION_REVOCATION_ERROR', 'Error al revocar sesiones', {
                userId: userId,
                requesterId: req.user?.id_user,
                error: revokeError.message,
                ip: req.ip
            }, 'high');
        }
    }
}