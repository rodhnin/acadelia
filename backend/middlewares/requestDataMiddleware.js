// backend/middlewares/requestDataMiddleware.js
/**
 * Middleware para capturar información de la solicitud
 * que puede ser útil para servicios que no tienen acceso directo a req
 */
export const captureRequestData = (req, res, next) => {
    // Guardar User-Agent para uso en emails y analíticas
    global.latestRequestUserAgent = req.headers['user-agent'] || '';
    
    // Guardar IP para geolocalización y seguridad
    global.latestRequestIP = req.ip || 
                           req.headers['x-forwarded-for'] || 
                           req.connection.remoteAddress || 
                           'Unknown';
    
    // Agregar timestamp de la solicitud
    global.latestRequestTimestamp = Date.now();
    
    // Continuar con la solicitud
    next();
};

export default captureRequestData;