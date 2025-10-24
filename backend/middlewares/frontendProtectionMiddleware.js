// backend/middlewares/frontendProtectionMiddleware.js - CORREGIDO

import { AccessValidationService } from "../services/shared/accessValidationService.js";
import { frontendAccessDenied } from "../utils/shared/responseTemplates.js";
import { logSecurityEvent } from '../utils/securityLogger.js';
import { avaCacheService } from "../services/shared/avaCacheService.js";
import { herramientaCacheService } from "../services/shared/herramientaCacheService.js";

/**
 * Extrae información básica del usuario con logging mejorado
 */
const extractUserFromSession = (req) => {
  try {
    console.log(`🔍 [FRONTEND-PROTECTION] Extrayendo usuario:`, {
      hasReqUser: !!req.user,
      userId: req.user?.id_user,
      userRole: req.user?.id_rol
    });

    if (req.user && req.user.id_user) {
      const userId = parseInt(req.user.id_user);

      console.log(`✅ [FRONTEND-PROTECTION] Usuario extraído: ${userId}`);

      return {
        userId: userId,
        isAuthenticated: true
      };
    }

    console.log(`❌ [FRONTEND-PROTECTION] No se encontró usuario autenticado`);
    return {
      userId: null,
      isAuthenticated: false
    };
  } catch (error) {
    console.error('❌ [FRONTEND-PROTECTION] Error extrayendo usuario:', error);
    return {
      userId: null,
      isAuthenticated: false
    };
  }
};

/**
 * Helper para detectar si es una solicitud de página HTML vs API
 */
const isHtmlPageRequest = (req) => {
  const isApi = req.path.startsWith('/api/');
  const isXhr = req.xhr;
  const acceptJson = req.get('accept')?.includes('application/json');

  const isHtml = !isApi && !isXhr && !acceptJson;

  console.log(`🔍 [FRONTEND-PROTECTION] Tipo de request para ${req.path}: ${isHtml ? 'HTML' : 'API'}`);

  return isHtml;
};

/**
 * 🔒 MIDDLEWARE DINÁMICO - PROTEGE TODAS LAS AVAs AUTOMÁTICAMENTE - CORREGIDO
 * ✅ SOLUCIONADO: Garantiza que usuarios premium solo accedan a AVAs de sus carreras
 */
export const protectFrontendRoutes = async (req, res, next) => {
  try {
    const requestPath = req.path;

    console.log(`🔍 [FRONTEND-PROTECTION] === INICIO PROTECCIÓN RUTA: ${requestPath} ===`);

    // Solo procesar rutas HTML, ignorar todo lo demás
    if (requestPath.startsWith('/api/') ||
      requestPath.includes('.') ||
      requestPath.startsWith('/css/') ||
      requestPath.startsWith('/scripts/') ||
      requestPath.startsWith('/images/') ||
      requestPath.startsWith('/uploads/') ||
      requestPath.startsWith('/dist/')) {
      console.log(`🔍 [FRONTEND-PROTECTION] Ignorando ruta estática: ${requestPath}`);
      return next();
    }

    // 🔍 EXTRAER SLUG DE LA RUTA (manejar UUIDs en la URL)
    let slug = requestPath.substring(1); // Remover el '/' inicial
    let chatUuid = null;

    // Si la ruta tiene UUID, extraer tanto el slug como el UUID
    if (slug.includes('/')) {
      const parts = slug.split('/');
      slug = parts[0];
      chatUuid = parts[1];
    }

    console.log(`🔍 [FRONTEND-PROTECTION] Slug extraído: "${slug}" de ruta: ${requestPath}`);

    // 🔒 VALIDAR COINCIDENCIA DE CHAT UUID CON TIPO DE SLUG
    if (chatUuid) {
      try {
        const { getChatInfo } = await import('../services/chat/chatServices.js');
        const chatInfo = await getChatInfo(chatUuid);

        // Verificar si es AVA y el chat también es AVA
        const isAvaSlug = await avaCacheService.isAvaRoute(slug);
        const isHerramientaSlug = await herramientaCacheService.isHerramientaRoute(slug);

        if (isAvaSlug && chatInfo.type !== 'ava') {
          console.log(`❌ [FRONTEND-PROTECTION] Chat ${chatUuid} no es AVA pero se accede desde slug AVA: ${slug}`);
          logSecurityEvent('CHAT_TYPE_MISMATCH', 'Intento de acceso a chat con tipo incorrecto', {
            chatUuid,
            slug,
            expectedType: 'ava',
            actualType: chatInfo.type,
            ip: req.ip
          }, 'high');

          if (isHtmlPageRequest(req)) {
            return res.redirect('/404');
          } else {
            return res.status(404).json({ error: 'Chat no encontrado' });
          }
        }

        if (isHerramientaSlug && chatInfo.type !== 'herramienta') {
          console.log(`❌ [FRONTEND-PROTECTION] Chat ${chatUuid} no es herramienta pero se accede desde slug herramienta: ${slug}`);
          logSecurityEvent('CHAT_TYPE_MISMATCH', 'Intento de acceso a chat con tipo incorrecto', {
            chatUuid,
            slug,
            expectedType: 'herramienta',
            actualType: chatInfo.type,
            ip: req.ip
          }, 'high');

          if (isHtmlPageRequest(req)) {
            return res.redirect('/404');
          } else {
            return res.status(404).json({ error: 'Chat no encontrado' });
          }
        }

        console.log(`✅ [FRONTEND-PROTECTION] Validación de tipo exitosa: Chat ${chatUuid} tipo ${chatInfo.type} coincide con slug ${slug}`);

      } catch (error) {
        console.error(`❌ [FRONTEND-PROTECTION] Error validando tipo de chat ${chatUuid}:`, error);
        // Si el chat no existe, redirigir a 404
        if (isHtmlPageRequest(req)) {
          return res.redirect('/404');
        } else {
          return res.status(404).json({ error: 'Chat no encontrado' });
        }
      }
    }

    // 🆓 VERIFICAR SI ES UNA HERRAMIENTA GRATUITA - Usando cache dinámico
    const isHerramienta = await herramientaCacheService.isHerramientaRoute(slug);

    console.log(`🔍 [FRONTEND-PROTECTION] ¿Es herramienta "${slug}"? ${isHerramienta}`);

    if (isHerramienta) {
      console.log(`🔧 [FRONTEND-PROTECTION] Procesando herramienta: ${slug}`);

      // ✅ HERRAMIENTAS REQUIEREN AUTENTICACIÓN
      const userInfo = extractUserFromSession(req);

      if (!userInfo.isAuthenticated) {
        logSecurityEvent('FRONTEND_TOOL_AUTH_REQUIRED', 'Usuario no autenticado intentando acceder a herramienta', {
          path: requestPath,
          slug: slug,
          ip: req.ip
        }, 'medium');

        console.log(`❌ [FRONTEND-PROTECTION] Usuario no autenticado para herramienta: ${slug}`);

        if (isHtmlPageRequest(req)) {
          console.log(`🔄 [FRONTEND-PROTECTION] Redirigiendo a login (herramienta)`);
          return res.redirect('/login');
        } else {
          return res.status(401).json(frontendAccessDenied(requestPath, 'auth_required'));
        }
      }

      // ✅ Usuario autenticado, permitir acceso a herramienta
      console.log(`✅ [FRONTEND-PROTECTION] Acceso a herramienta concedido: ${slug} para usuario ${userInfo.userId}`);
      return next();
    }

    // 🔍 VERIFICAR SI ES UN AVA - CON LOGGING DETALLADO
    console.log(`🔍 [FRONTEND-PROTECTION] Verificando si "${slug}" es un AVA...`);

    const isAva = await avaCacheService.isAvaRoute(slug);

    console.log(`🔍 [FRONTEND-PROTECTION] ¿Es AVA "${slug}"? ${isAva}`);

    // Si NO es un AVA, dejar pasar (página normal)
    if (!isAva) {
      console.log(`🔍 [FRONTEND-PROTECTION] NO es AVA, permitiendo acceso normal a: ${slug}`);
      return next();
    }

    // 🔒 *** ES UN AVA - VERIFICAR AUTENTICACIÓN ***
    console.log(`🔒 [FRONTEND-PROTECTION] === PROCESANDO AVA: ${slug} ===`);

    const userInfo = extractUserFromSession(req);

    if (!userInfo.isAuthenticated) {
      logSecurityEvent('FRONTEND_AVA_AUTH_REQUIRED', 'Usuario no autenticado intentando acceder a AVA', {
        path: requestPath,
        slug: slug,
        ip: req.ip
      }, 'medium');

      console.log(`❌ [FRONTEND-PROTECTION] Usuario no autenticado para AVA: ${slug}`);

      if (isHtmlPageRequest(req)) {
        console.log(`🔄 [FRONTEND-PROTECTION] Redirigiendo a login (AVA)`);
        return res.redirect('/login');
      } else {
        return res.status(401).json(frontendAccessDenied(requestPath, 'auth_required'));
      }
    }

    // 🎓 *** VERIFICAR ACCESO ESPECÍFICO A LA CARRERA ***
    console.log(`🎓 [FRONTEND-PROTECTION] Usuario autenticado: ${userInfo.userId}, verificando acceso a carrera...`);

    try {
      // Obtener datos completos del AVA para validación
      const avaData = await avaCacheService.getAvaBySlug(slug);

      console.log(`🔍 [FRONTEND-PROTECTION] Datos del AVA:`, {
        found: !!avaData,
        avaId: avaData?.id_ava,
        avaName: avaData?.nom_ava,
        carreraId: avaData?.id_carrera,
        carreraNombre: avaData?.carrera_nombre
      });

      if (!avaData) {
        console.log(`❌ [FRONTEND-PROTECTION] AVA no encontrado en BD: ${slug}`);
        logSecurityEvent('FRONTEND_AVA_NOT_FOUND', 'AVA no encontrado en validación', {
          path: requestPath,
          slug: slug,
          userId: userInfo.userId,
          ip: req.ip
        }, 'medium');

        // Si no existe en BD, permitir acceso como página normal
        return next();
      }

      // *** VALIDACIÓN CRÍTICA: VERIFICAR SUSCRIPCIÓN A LA CARRERA ESPECÍFICA ***
      console.log(`🔍 [FRONTEND-PROTECTION] Validando acceso del usuario ${userInfo.userId} al AVA ${avaData.id_ava} (carrera: ${avaData.carrera_nombre})`);

      const validation = await AccessValidationService.validateAvaAccess(
        userInfo.userId,
        avaData.id_ava
      );

      console.log(`🔍 [FRONTEND-PROTECTION] Resultado de validación:`, {
        success: validation.success,
        canProceed: validation.canProceed,
        isAdmin: validation.isAdmin,
        accessType: validation.accessType,
        errorCode: validation.errorCode,
        hasCareerInfo: !!validation.careerInfo,
        hasSubscription: !!validation.subscription
      });

      if (!validation.canProceed) {
        // *** ACCESO DENEGADO - USUARIO NO TIENE SUSCRIPCIÓN A ESTA CARRERA ***
        console.log(`❌ [FRONTEND-PROTECTION] ACCESO DENEGADO - Usuario ${userInfo.userId} NO tiene suscripción a carrera "${avaData.carrera_nombre}" para AVA "${avaData.nom_ava}"`);

        logSecurityEvent('FRONTEND_AVA_CAREER_REQUIRED', 'Usuario sin suscripción a carrera intentando acceder a AVA', {
          path: requestPath,
          userId: userInfo.userId,
          avaId: avaData.id_ava,
          avaName: avaData.nom_ava,
          careerRequired: avaData.carrera_nombre,
          errorCode: validation.errorCode,
          ip: req.ip
        }, 'medium');

        if (isHtmlPageRequest(req)) {
          console.log(`🔄 [FRONTEND-PROTECTION] Redirigiendo a /402 (carrera requerida)`);
          return res.redirect('/402');
        } else {
          return res.status(402).json(frontendAccessDenied(requestPath, 'career_required'));
        }
      }

      // *** ACCESO PERMITIDO - USUARIO TIENE SUSCRIPCIÓN VÁLIDA ***
      console.log(`✅ [FRONTEND-PROTECTION] ACCESO CONCEDIDO - Usuario ${userInfo.userId} tiene acceso válido a AVA "${avaData.nom_ava}" (carrera: "${avaData.carrera_nombre}")`);

      logSecurityEvent('FRONTEND_AVA_ACCESS_GRANTED', 'Acceso concedido a AVA con suscripción válida', {
        path: requestPath,
        userId: userInfo.userId,
        avaId: avaData.id_ava,
        avaName: avaData.nom_ava,
        careerName: validation.careerInfo?.nombre,
        subscriptionStatus: validation.subscription?.status,
        subscriptionId: validation.subscription?.id,
        accessType: validation.accessType,
        ip: req.ip
      }, 'info');

      next();

    } catch (error) {
      console.error('❌ [FRONTEND-PROTECTION] Error validando acceso a AVA:', error);

      logSecurityEvent('FRONTEND_AVA_ACCESS_ERROR', 'Error validando acceso a AVA', {
        path: requestPath,
        userId: userInfo.userId,
        slug: slug,
        error: error.message,
        ip: req.ip
      }, 'high');

      // Por seguridad, redirigir a login en caso de error
      if (isHtmlPageRequest(req)) {
        console.log(`🔄 [FRONTEND-PROTECTION] Error en validación, redirigiendo a login por seguridad`);
        return res.redirect('/login');
      } else {
        return res.status(500).json(frontendAccessDenied(requestPath, 'auth_required'));
      }
    }

  } catch (error) {
    console.error('❌ [FRONTEND-PROTECTION] Error en middleware de protección:', error);

    logSecurityEvent('FRONTEND_PROTECTION_ERROR', 'Error en middleware de protección', {
      path: req.path,
      error: error.message,
      ip: req.ip
    }, 'high');

    // Por seguridad, redirigir a login en caso de error
    if (isHtmlPageRequest(req)) {
      console.log(`🔄 [FRONTEND-PROTECTION] Error de sistema, redirigiendo a login por seguridad`);
      return res.redirect('/login');
    }

    next();
  }
};