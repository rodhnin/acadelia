// backend/middlewares/frontendAuthenticationMIddleware.js - REFACTORIZADO
import pool from "../lib/dbPool.js";
import { logSecurityEvent } from '../utils/securityLogger.js';
// 🔑 IMPORTAR EL SISTEMA PRINCIPAL DE AUTH CON RENOVACIÓN
import { authenticateUser, optionalAuthenticateUser } from './authMiddleware.js';

/**
 * Helper para detectar si es una solicitud de página HTML vs API
 */
const isHtmlPageRequest = (req) => {
  return !req.path.startsWith('/api/') && 
         !req.xhr && 
         !req.get('accept')?.includes('application/json') &&
         !req.get('Content-Type')?.includes('application/json');
};

/**
 * Verifica si el usuario es administrador
 */
const checkAdminRole = async (userId) => {
  try {
    const rolQuery = `
      SELECT id_rol 
      FROM perfil 
      WHERE id_usuario = $1
    `;
    
    const result = await pool.query(rolQuery, [userId]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].id_rol === 3; // 3 = admin
  } catch (error) {
    console.error("Error verificando rol de administrador:", error);
    return false;
  }
};

/**
 * 🔒 MIDDLEWARE UNIFICADO DE AUTENTICACIÓN Y ROLES - CORREGIDO
 * 
 * NUEVO: Maneja redirecciones a /login correctamente
 * 
 * Maneja:
 * - Verificación del token JWT CON RENOVACIÓN AUTOMÁTICA
 * - Redirección obligatoria a /login para páginas HTML
 * - Verificación de rol admin para rutas admin
 * - Respuestas JSON apropiadas para APIs
 */
export const requireAuthentication = (options = {}) => {
  const { 
    requireAdmin = false,
    category = null,
    redirectOnAuthFail = '/login',
    redirectOnAdminFail = '/principal'
  } = options;

  return async (req, res, next) => {
    try {
      console.log(`🔐 requireAuthentication ejecutándose para: ${req.path}`);
      console.log(`📋 Opciones: requireAdmin=${requireAdmin}, category=${category}`);

      // 🔍 VERIFICAR PRIMERO SI ES SOLICITUD HTML
      const isHtmlRequest = isHtmlPageRequest(req);
      console.log(`🌐 Es solicitud HTML: ${isHtmlRequest}`);

      // 🔑 INTERCEPTAR RESPUESTAS DE authenticateUser PARA MANEJAR REDIRECCIONES
      let authenticationComplete = false;
      let originalJson = res.json;
      let originalSend = res.send;
      let originalStatus = res.status;
      
      // Interceptar respuestas JSON para convertirlas en redirecciones si es HTML
      if (isHtmlRequest) {
        res.json = function(data) {
          if (!authenticationComplete && (data?.error || data?.code === 'AUTH_REQUIRED' || data?.code === 'TOKEN_EXPIRED')) {
            console.log(`🔄 Interceptando respuesta JSON para redirección: ${JSON.stringify(data)}`);
            return res.redirect(redirectOnAuthFail);
          }
          return originalJson.call(this, data);
        };

        res.status = function(statusCode) {
          if (!authenticationComplete && (statusCode === 401 || statusCode === 403)) {
            console.log(`🔄 Interceptando status ${statusCode} para redirección`);
            return {
              json: (data) => res.redirect(redirectOnAuthFail),
              send: (data) => res.redirect(redirectOnAuthFail)
            };
          }
          return originalStatus.call(this, statusCode);
        };
      }

      // 🔑 USAR AUTHMIDDLEWARE COMO BASE
      return authenticateUser(req, res, async (authError) => {
        // Restaurar métodos originales
        res.json = originalJson;
        res.send = originalSend;
        res.status = originalStatus;
        authenticationComplete = true;

        // Si hay error de autenticación
        if (authError) {
          logSecurityEvent('AUTH_REQUIRED_FAILED', 'Autenticación requerida falló', {
            path: req.path,
            category: category,
            requireAdmin: requireAdmin,
            error: authError?.message || 'Unknown auth error',
            ip: req.ip
          }, 'medium');

          console.log(`❌ Autenticación falló para ${req.path}: ${authError?.message || 'Unknown error'}`);
          
          // GARANTIZAR redirección para HTML
          if (isHtmlRequest) {
            console.log(`🔄 FORZANDO redirección a ${redirectOnAuthFail} desde ${req.path}`);
            return res.redirect(redirectOnAuthFail);
          } else {
            return res.status(401).json({ 
              error: "Autenticación requerida", 
              code: "AUTH_REQUIRED" 
            });
          }
        }

        // ✅ AUTENTICACIÓN EXITOSA - req.user ya está establecido por authMiddleware
        console.log(`✅ Usuario autenticado: ${req.user.id_user} (${req.user.correo || 'sin email'})`);
        
        // Si se renovó el token, loggear
        if (req.tokenWasRenewed) {
          console.log(`🔄 Token fue renovado durante la autenticación para usuario ${req.user.id_user}`);
        }

        // 4. VERIFICAR ROL ADMIN SI ES REQUERIDO
        if (requireAdmin) {
          console.log(`🔍 Verificando rol admin para usuario ${req.user.id_user}...`);

          try {
            // Primero verificar si el token ya tiene el rol admin
            let isAdmin = req.user.id_rol === 3;

            // Si no está en el token, verificar en BD
            if (!isAdmin) {
              console.log(`⚠️ Rol no encontrado en token, consultando BD...`);
              isAdmin = await checkAdminRole(req.user.id_user);
            }

            if (!isAdmin) {
              logSecurityEvent('ADMIN_ACCESS_DENIED', 'Acceso denegado - usuario sin privilegios admin', {
                userId: req.user.id_user,
                path: req.path,
                userRole: req.user.id_rol || 'unknown',
                category: category,
                ip: req.ip
              }, 'high');

              console.log(`❌ Usuario ${req.user.id_user} no es admin, redirigiendo...`);
              
              if (isHtmlRequest) {
                console.log(`🔄 FORZANDO redirección a ${redirectOnAdminFail} desde ${req.path}`);
                return res.redirect(redirectOnAdminFail);
              } else {
                return res.status(403).json({ 
                  error: "Permisos de administrador requeridos", 
                  code: "ADMIN_REQUIRED" 
                });
              }
            }

            console.log(`✅ Usuario ${req.user.id_user} verificado como admin`);
          } catch (adminError) {
            console.error('Error verificando rol admin:', adminError);
            
            logSecurityEvent('AUTH_MIDDLEWARE_ERROR', 'Error verificando rol admin', {
              path: req.path,
              error: adminError.message,
              userId: req.user?.id_user,
              ip: req.ip
            }, 'high');

            if (isHtmlRequest) {
              console.log(`🔄 FORZANDO redirección a ${redirectOnAuthFail} por error`);
              return res.redirect(redirectOnAuthFail);
            } else {
              return res.status(500).json({ 
                error: "Error interno de autenticación", 
                code: "AUTH_ERROR" 
              });
            }
          }
        }

        // 5. ACCESO CONCEDIDO
        logSecurityEvent('AUTH_ACCESS_GRANTED', 'Acceso concedido', {
          userId: req.user.id_user,
          path: req.path,
          category: category,
          isAdmin: requireAdmin,
          tokenRenewed: req.tokenWasRenewed,
          ip: req.ip
        }, 'info');

        console.log(`✅ Acceso concedido a ${req.path} para usuario ${req.user.id_user}`);
        next();
      });

    } catch (error) {
      console.error('Error en requireAuthentication middleware:', error);
      
      logSecurityEvent('AUTH_MIDDLEWARE_ERROR', 'Error en middleware de autenticación', {
        path: req.path,
        error: error.message,
        userId: req.user?.id_user,
        ip: req.ip
      }, 'high');

      // En caso de error, GARANTIZAR redirección a login por seguridad
      console.log(`⚠️ Error en autenticación, FORZANDO redirección a login por seguridad`);
      
      if (isHtmlPageRequest(req)) {
        console.log(`🔄 FORZANDO redirección a ${redirectOnAuthFail} por error de sistema`);
        return res.redirect(redirectOnAuthFail);
      } else {
        return res.status(500).json({ 
          error: "Error interno de autenticación", 
          code: "AUTH_ERROR" 
        });
      }
    }
  };
};

/**
 * 🔄 NUEVA FUNCIÓN: Middleware opcional que USA authMiddleware como base
 * Para rutas que pueden o no requerir autenticación pero quieren renovación
 */
export const optionalAuthentication = (options = {}) => {
  const { 
    category = null 
  } = options;

  return async (req, res, next) => {
    try {
      console.log(`🔍 optionalAuthentication REFACTORIZADO ejecutándose para: ${req.path}`);

      // 🔑 USAR optionalAuthenticateUser que SÍ maneja renovaciones
      return optionalAuthenticateUser(req, res, (authError) => {
        // optionalAuthenticateUser nunca debería fallar, pero por si acaso
        if (authError) {
          console.warn(`⚠️ Error en auth opcional para ${req.path}:`, authError.message);
          req.user = null; // Asegurar que no hay usuario parcial
        }

        // Loggear resultado
        if (req.user) {
          console.log(`✅ Usuario opcional autenticado: ${req.user.id_user}${req.tokenWasRenewed ? ' (token renovado)' : ''}`);
          
          logSecurityEvent('OPTIONAL_AUTH_SUCCESS', 'Autenticación opcional exitosa', {
            userId: req.user.id_user,
            path: req.path,
            category: category,
            tokenRenewed: req.tokenWasRenewed,
            ip: req.ip
          }, 'info');
        } else {
          console.log(`🔍 Sin usuario para auth opcional en ${req.path}`);
        }

        next();
      });

    } catch (error) {
      console.error('Error en optionalAuthentication middleware:', error);
      
      // En caso de error, continuar sin usuario
      req.user = null;
      next();
    }
  };
};

/**
 * 🎯 HELPERS PRE-CONFIGURADOS - MEJORADOS
 * Funciones de conveniencia para casos comunes usando el sistema refactorizado
 */

/**
 * Middleware para vistas que requieren autenticación (dashboard, payments)
 * MEJORADO: Usa authMiddleware como base
 */
export const requireAuth = requireAuthentication({
  requireAdmin: false,
  redirectOnAuthFail: '/login'
});

/**
 * Middleware para vistas de administración
 * MEJORADO: Usa authMiddleware como base
 */
export const requireAdmin = requireAuthentication({
  requireAdmin: true,
  redirectOnAuthFail: '/login',
  redirectOnAdminFail: '/principal'
});

/**
 * Middleware para rutas de contenido que pueden requerir autenticación
 * NUEVO: Usa optionalAuthenticateUser como base para permitir renovaciones
 */
export const requireOptionalAuth = optionalAuthentication({
  category: 'content'
});

/**
 * Middleware personalizable para categorías específicas
 * MEJORADO: Usa el sistema refactorizado
 */
export const requireAuthForCategory = (category) => {
  const config = {
    dashboard: {
      requireAdmin: false,
      category: 'dashboard',
      redirectOnAuthFail: '/login'
    },
    payments: {
      requireAdmin: false,
      category: 'payments', 
      redirectOnAuthFail: '/login'
    },
    admin: {
      requireAdmin: true,
      category: 'admin',
      redirectOnAuthFail: '/login',
      redirectOnAdminFail: '/principal'
    },
    content: {
      requireAdmin: false,
      category: 'content',
      redirectOnAuthFail: '/login'
    }
  };

  return requireAuthentication(config[category] || {});
};

// ===== AGREGAR AL FINAL DEL ARCHIVO frontendAuthenticationMIddleware.js =====

/**
 * 🔄 NUEVO: Middleware para redirigir usuarios YA autenticados
 * Útil para páginas como /login que no deberían ser accesibles si ya estás logueado
 */
export const redirectIfAuthenticated = (options = {}) => {
  const { 
    redirectTo = '/principal',
    authRoutes = ['login', 'registro'] // Rutas que requieren redirección
  } = options;

  return async (req, res, next) => {
    try {
      // Solo aplicar a rutas específicas de autenticación
      const currentView = req.params.view || req.path.replace('/', '');
      
      if (!authRoutes.includes(currentView)) {
        return next();
      }

      console.log(`🔍 redirectIfAuthenticated verificando: ${currentView}`);

      // Usar optionalAuthenticateUser para verificar sin forzar login
      return optionalAuthenticateUser(req, res, (authError) => {
        // Si hay error de autenticación, continuar normalmente (mostrar login)
        if (authError) {
          console.log(`🔍 Usuario no autenticado en ${currentView}, mostrando página`);
          return next();
        }

        // Si hay usuario autenticado, redirigir
        if (req.user && req.user.id_user) {
          console.log(`🔄 Usuario ${req.user.id_user} ya autenticado, redirigiendo desde ${currentView} a ${redirectTo}`);
          
          // Log de seguridad
          logSecurityEvent('AUTH_REDIRECT', 'Usuario autenticado redirigido desde página de auth', {
            userId: req.user.id_user,
            fromPath: req.path,
            toPath: redirectTo,
            ip: req.ip
          }, 'info');
          
          return res.redirect(redirectTo);
        }

        // Sin usuario, continuar normalmente
        console.log(`🔍 Sin usuario en ${currentView}, mostrando página normalmente`);
        next();
      });

    } catch (error) {
      console.error('Error en redirectIfAuthenticated middleware:', error);
      
      // En caso de error, continuar sin redirección por seguridad
      next();
    }
  };
};

/**
 * 🎯 HELPER PRE-CONFIGURADO: Middleware para páginas de login/registro
 */
export const redirectAuthenticatedUsers = redirectIfAuthenticated({
  redirectTo: '/principal',
  authRoutes: ['login', 'registro', '']
});

console.log('[FRONTEND-AUTH] ✅ redirectIfAuthenticated añadido al middleware existente');

console.log('[FRONTEND-AUTH] ✅ Frontend AuthMiddleware REFACTORIZADO cargado correctamente');