import crypto from 'crypto';
import onHeaders from 'on-headers';

/** 
 * Middleware para generar nonce y establecer la política CSP
 * ✅ SOLUCIÓN DEFINITIVA: Permite TODAS las imágenes HTTPS
 * - Resuelve el problema de dominios desconocidos para siempre
 * - Mantiene seguridad (solo HTTPS)
 * - Cero mantenimiento
 */
export const setupCSP = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(20).toString('hex');
  }

  // Exponer el token CSRF para las vistas
  res.locals.csrfToken = req.session.csrfToken;

  // También guardar el token CSRF en una cookie JavaScript-accesible como respaldo
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false, // Necesario para que JS pueda leerlo
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  onHeaders(res, function () {
    const cspValue = "default-src 'self'; " +
      `script-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://accounts.google.com https://cdn.paddle.com https://*.paddle.com https://sandbox-checkout.paddle.com https://sandbox-cdn.paddle.com https://sandbox-buy.paddle.com https://www.youtube.com https://*.youtube.com 'unsafe-eval'; ` +
      "style-src-elem 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://accounts.google.com/gsi/ https://cdn.paddle.com https://*.paddle.com https://sandbox-cdn.paddle.com https://cdn.jsdelivr.net 'unsafe-inline'; " +
      "style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://accounts.google.com/gsi/ https://cdn.paddle.com https://*.paddle.com https://sandbox-cdn.paddle.com https://cdn.jsdelivr.net 'unsafe-inline'; " +
      "font-src 'self' https://fonts.gstatic.com https://unpkg.com https://cdn.jsdelivr.net; " +
      
      "img-src 'self' data: blob: https:; " +
      
      "connect-src 'self' https://unpkg.com https://api.openai.com https://accounts.google.com https://paddle.com https://cdn.paddle.com https://*.paddle.com https://sandbox.paddle.com https://sandbox-api.paddle.com https://sandbox-buy.paddle.com; " +
      "worker-src 'self' blob:; " +
      "frame-src 'self' https://accounts.google.com https://checkout.paddle.com https://*.paddle.com https://sandbox-checkout.paddle.com https://sandbox-buy.paddle.com https://www.youtube.com https://*.youtube.com; " +
      "frame-ancestors 'self' https://*.paddle.com https://sandbox-buy.paddle.com https://sandbox-checkout.paddle.com;";

    this.setHeader('Content-Security-Policy', cspValue);
  });

  next();
};