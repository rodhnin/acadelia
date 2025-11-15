import { TermsService } from "../../services/usuarios/termsService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Verifica si el usuario ha aceptado la versión actual de términos
 */
export const checkTermsAcceptance = async (req, res) => {
    try {
        const userId = req.user?.id_user;
        
        if (!userId) {
            return res.status(401).json({ error: "Usuario no autenticado" });
        }
        
        const hasAccepted = await TermsService.hasAcceptedLatestTerms(userId);
        
        res.status(200).json({
            hasAccepted,
            currentVersion: process.env.TERMS_VERSION || '1.0'
        });
    } catch (error) {
        console.error("Error verificando aceptación de términos:", error);
        res.status(500).json({ error: "Error interno al verificar términos" });
    }
};

/**
 * Registra la aceptación de los términos
 */
export const acceptTerms = async (req, res) => {
    try {
        const { token, version } = req.query;
        let userId;
        
        // Si hay un token, verificarlo
        if (token) {
            const tokenData = await TermsService.verifyAcceptanceToken(token);
            
            if (!tokenData) {
                return res.status(400).json({ 
                    error: "Token inválido o expirado",
                    redirect: "/terminos_condiciones"
                });
            }
            
            userId = tokenData.userId;
            
            await pool.query(
                "UPDATE terms_acceptance_tokens SET used_at = NOW() WHERE token = $1",
                [token]
            );
        } else {
            // Si no hay token, usar el ID del usuario autenticado
            userId = req.user?.id_user;
            
            if (!userId) {
                return res.status(401).json({ error: "Usuario no autenticado" });
            }
        }
        
        const termsVersion = version || process.env.TERMS_VERSION || '1.0';
        
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        await TermsService.recordTermsAcceptance(
            userId,
            termsVersion,
            ipAddress,
            userAgent,
            token ? 'email_link' : 'web_form'
        );
        
        logSecurityEvent('TERMS_ACCEPTED', 'Usuario aceptó términos y condiciones', {
            userId,
            termsVersion,
            method: token ? 'email_link' : 'web_form',
            ip: req.ip
        }, 'medium');
        
        // Responder según el formato solicitado
        if (req.headers.accept?.includes('application/json')) {
            res.status(200).json({
                success: true,
                message: "Términos y condiciones aceptados correctamente",
                version: termsVersion
            });
        } else {
            // Redireccionar a página de éxito
            res.redirect('/terminos/aceptacion-exitosa');
        }
    } catch (error) {
        console.error("Error aceptando términos:", error);
        
        if (req.headers.accept?.includes('application/json')) {
            res.status(500).json({ error: "Error al procesar la aceptación de términos" });
        } else {
            res.redirect('/terminos/error');
        }
    }
};

/**
 * Actualiza los términos y envía notificaciones (Admin)
 */
export const updateTermsAndNotify = async (req, res) => {
    try {
        if (req.user.id_rol !== 3) { // Asumiendo que 3 es el rol de admin
            return res.status(403).json({ error: "No tienes permisos para esta acción" });
        }
        
        const { newVersion, daysToAccept = 30 } = req.body;
        
        if (!newVersion) {
            return res.status(400).json({ error: "Nueva versión de términos requerida" });
        }
        
        const result = await TermsService.notifyTermsUpdate(newVersion, daysToAccept);
        
        logSecurityEvent('TERMS_UPDATED', 'Términos y condiciones actualizados', {
            adminId: req.user.id_user,
            newVersion,
            daysToAccept,
            emailsSent: result.emailsSent,
            ip: req.ip
        }, 'high');
        
        res.status(200).json({
            success: true,
            message: `Actualización de términos v${newVersion} iniciada`,
            ...result
        });
    } catch (error) {
        console.error("Error actualizando términos:", error);
        res.status(500).json({ error: "Error al actualizar términos y condiciones" });
    }
};