import { TermsService } from "../services/usuarios/termsService.js";

/**
 * Middleware para verificar si el usuario ha aceptado la versión actual de los términos
 * Si no los ha aceptado, redirecciona a la página de términos y condiciones
 */
export const requireTermsAcceptance = async (req, res, next) => {
    try {
        // Si no hay usuario autenticado, continuar (la autenticación se maneja en otro middleware)
        if (!req.user || !req.user.id_user) {
            return next();
        }
        
        const hasAccepted = await TermsService.hasAcceptedLatestTerms(req.user.id_user);
        
        if (!hasAccepted) {
            // Si es una solicitud AJAX o API, devolver estado 409 (Conflict)
            if (req.xhr || 
                req.path.startsWith('/api/') || 
                req.headers.accept?.includes('application/json')) {
                return res.status(409).json({
                    error: "Términos y condiciones no aceptados",
                    code: "TERMS_NOT_ACCEPTED",
                    currentVersion: process.env.TERMS_VERSION || '1.0',
                    redirect: "/terminos_condiciones"
                });
            }
            
            // Si es una solicitud normal de página, redireccionar
            return res.redirect('/terminos_condiciones?required=true');
        }
        
        // Si ha aceptado, continuar
        next();
    } catch (error) {
        console.error("Error en middleware de términos:", error);
        next(); // Continuar en caso de error para no bloquear la aplicación
    }
};