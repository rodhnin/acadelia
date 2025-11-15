/**
 * Middleware para capturar información de la solicitud
 * que puede ser útil para servicios que no tienen acceso directo a req
 */
export const captureRequestData = (req, res, next) => {
    global.latestRequestUserAgent = req.headers['user-agent'] || '';
    
    global.latestRequestIP = req.ip || 
                           req.headers['x-forwarded-for'] || 
                           req.connection.remoteAddress || 
                           'Unknown';
    
    global.latestRequestTimestamp = Date.now();
    
    next();
};

export default captureRequestData;