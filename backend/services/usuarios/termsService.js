// backend/services/usuarios/termsService.js
import pool from "../../lib/dbPool.js";
import crypto from 'crypto';
import { emailService } from "../email/emailService.js";

export class TermsService {
    /**
     * Verifica si un usuario ha aceptado la versión más reciente de los términos
     * @param {number} userId - ID del usuario
     * @returns {Promise<boolean>} - true si ha aceptado, false si no
     */
    static async hasAcceptedLatestTerms(userId) {
        try {
            const currentVersion = process.env.TERMS_VERSION || '1.0';
            
            const query = `
                SELECT COUNT(*) as count 
                FROM terms_acceptances 
                WHERE user_id = $1 AND terms_version = $2
            `;
            
            const { rows } = await pool.query(query, [userId, currentVersion]);
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error verificando aceptación de términos:', error);
            return false;
        }
    }
    
    /**
     * Obtiene el historial de aceptaciones de términos de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Array>} - Lista de aceptaciones
     */
    static async getTermsAcceptanceHistory(userId) {
        try {
            const query = `
                SELECT 
                    terms_version, 
                    accepted_at, 
                    ip_address, 
                    user_agent, 
                    acceptance_method
                FROM terms_acceptances 
                WHERE user_id = $1
                ORDER BY accepted_at DESC
            `;
            
            const { rows } = await pool.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error('Error obteniendo historial de términos:', error);
            return [];
        }
    }
    
    /**
     * Registra una nueva aceptación de términos
     * @param {number} userId - ID del usuario
     * @param {string} version - Versión de los términos
     * @param {string} ipAddress - Dirección IP
     * @param {string} userAgent - User-Agent del navegador
     * @param {string} method - Método de aceptación
     * @returns {Promise<boolean>} - true si se registró correctamente
     */
    static async recordTermsAcceptance(userId, version, ipAddress, userAgent, method = 'manual') {
        try {
            const query = `
                INSERT INTO terms_acceptances (
                    user_id, 
                    terms_version, 
                    ip_address, 
                    user_agent, 
                    acceptance_method
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, terms_version) 
                DO UPDATE SET 
                    accepted_at = NOW(),
                    ip_address = $3,
                    user_agent = $4,
                    acceptance_method = $5
                RETURNING id
            `;
            
            await pool.query(query, [
                userId,
                version,
                ipAddress,
                userAgent,
                method
            ]);
            
            return true;
        } catch (error) {
            console.error('Error registrando aceptación de términos:', error);
            return false;
        }
    }

    /**
     * Genera un token único para la aceptación de términos
     * @param {number} userId - ID del usuario
     * @param {string} version - Versión de los términos
     * @returns {Promise<string>} - Token generado
     */
    static async generateAcceptanceToken(userId, version) {
        try {
            // Generar token aleatorio
            const token = crypto.randomBytes(32).toString('hex');
            
            // Guardar en base de datos
            const query = `
                INSERT INTO terms_acceptance_tokens (
                    user_id,
                    terms_version,
                    token,
                    expires_at
                ) VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
                RETURNING token
            `;
            
            const { rows } = await pool.query(query, [userId, version, token]);
            return rows[0].token;
        } catch (error) {
            console.error('Error generando token de aceptación:', error);
            throw error;
        }
    }

    /**
     * Verifica la validez de un token de aceptación
     * @param {string} token - Token a verificar
     * @returns {Promise<Object>} - Datos del token o null si no es válido
     */
    static async verifyAcceptanceToken(token) {
        try {
            const query = `
                SELECT 
                    user_id,
                    terms_version 
                FROM terms_acceptance_tokens 
                WHERE token = $1 
                AND expires_at > NOW()
            `;
            
            const { rows } = await pool.query(query, [token]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return {
                userId: rows[0].user_id,
                termsVersion: rows[0].terms_version
            };
        } catch (error) {
            console.error('Error verificando token de aceptación:', error);
            return null;
        }
    }

    /**
     * Notifica a todos los usuarios sobre la actualización de términos
     * @param {string} newVersion - Nueva versión de los términos
     * @param {number} daysToAccept - Días para la aceptación automática
     * @returns {Promise<Object>} - Resultado de la operación
     */
    static async notifyTermsUpdate(newVersion, daysToAccept = 30) {
        try {
            // 1. Actualizar versión en el entorno
            process.env.TERMS_VERSION = newVersion;
            
            // 2. Obtener todos los usuarios activos
            const usersQuery = `
                SELECT id_user, correo 
                FROM usuario 
                WHERE email_verified = TRUE
            `;
            
            const { rows } = await pool.query(usersQuery);
            
            // 3. Enviar correos a cada usuario
            let successCount = 0;
            let failureCount = 0;
            
            for (const user of rows) {
                try {
                    // Generar token único para este usuario y versión
                    const acceptToken = await this.generateAcceptanceToken(user.id_user, newVersion);
                    
                    // Enviar correo
                    await emailService.sendTermsUpdateEmail(
                        user.correo,
                        newVersion,
                        acceptToken,
                        daysToAccept
                    );
                    
                    successCount++;
                } catch (emailError) {
                    console.error(`Error enviando correo a ${user.correo}:`, emailError);
                    failureCount++;
                }
                
                // Esperar un breve tiempo entre envíos para no sobrecargar el servidor de correo
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 4. Programar la tarea para la aceptación automática después del período
            await this.scheduleAutoAcceptance(newVersion, daysToAccept);
            
            return {
                success: true,
                totalUsers: rows.length,
                emailsSent: successCount,
                emailsFailed: failureCount,
                version: newVersion,
                daysToAccept: daysToAccept
            };
        } catch (error) {
            console.error('Error notificando actualización de términos:', error);
            throw error;
        }
    }

    /**
     * Programa la aceptación automática para usuarios que no han aceptado
     * @param {string} version - Versión de los términos
     * @param {number} daysToAccept - Días para la aceptación automática
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    static async scheduleAutoAcceptance(version, daysToAccept) {
        try {
            // Crear registro en la tabla de programación
            const query = `
                INSERT INTO scheduled_tasks (
                    task_type,
                    payload,
                    execute_at,
                    status
                ) VALUES (
                    'auto_terms_acceptance',
                    $1,
                    NOW() + INTERVAL '${daysToAccept} days',
                    'pending'
                )
                RETURNING id
            `;
            
            const payload = JSON.stringify({
                termsVersion: version,
                scheduledAt: new Date().toISOString()
            });
            
            await pool.query(query, [payload]);
            
            return true;
        } catch (error) {
            console.error('Error programando aceptación automática:', error);
            return false;
        }
    }

    /**
     * Ejecuta la aceptación automática para todos los usuarios que no han aceptado
     * @param {string} version - Versión de los términos
     * @returns {Promise<Object>} - Resultado de la operación
     */
    static async executeAutoAcceptance(version) {
        try {
            // 1. Obtener todos los usuarios que no han aceptado esta versión
            const pendingQuery = `
                SELECT u.id_user
                FROM usuario u
                WHERE u.email_verified = TRUE
                AND NOT EXISTS (
                    SELECT 1 FROM terms_acceptances ta
                    WHERE ta.user_id = u.id_user
                    AND ta.terms_version = $1
                )
            `;
            
            const { rows } = await pool.query(pendingQuery, [version]);
            
            // 2. Si no hay usuarios pendientes, terminar
            if (rows.length === 0) {
                return {
                    success: true,
                    usersProcessed: 0,
                    message: "No hay usuarios pendientes de aceptación"
                };
            }
            
            // 3. Registrar aceptación automática para cada usuario
            let successCount = 0;
            
            for (const user of rows) {
                try {
                    await this.recordTermsAcceptance(
                        user.id_user,
                        version,
                        "Auto-acceptance",
                        "System",
                        "automatic"
                    );
                    
                    successCount++;
                } catch (acceptError) {
                    console.error(`Error en aceptación automática para usuario ${user.id_user}:`, acceptError);
                }
            }
            
            return {
                success: true,
                usersProcessed: successCount,
                totalPending: rows.length,
                version: version
            };
        } catch (error) {
            console.error('Error ejecutando aceptación automática:', error);
            throw error;
        }
    }
}

export default TermsService;