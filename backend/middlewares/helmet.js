import helmet from 'helmet';

/**
 * Configuración mejorada de Helmet para protección de headers
 * Complementa tu CSP existente
 */
export const configureHelmet = (app) => {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      
      // Prevenir clickjacking
      frameguard: {
        action: 'deny'
      },
      
      // Prevenir MIME sniffing
      noSniff: true,
      
      // Prevenir XSS
      xssFilter: true,
      
      // Política estricta de transporte seguro (HSTS)
      hsts: {
        maxAge: 15552000, // 180 días
        includeSubDomains: true,
        preload: true
      },
      
      // Política de referrer
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },
      
      crossOriginEmbedderPolicy: false,
      
      // Ajustar para permitir interacción con Paddle
      crossOriginOpenerPolicy: false,
      
      // Ajustar para permitir recursos de Paddle
      crossOriginResourcePolicy: false,
      
      // No permitir políticas cross-domain
      permittedCrossDomainPolicies: { permittedPolicies: 'none' }
    })
  );
  
  return app;
};