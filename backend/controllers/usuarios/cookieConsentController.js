import { cookieConsentService } from "../../services/usuarios/cookieConsentService.js";
import { cookieAuditService } from "../../services/security/cookieAuditService.js";
import { getLocationFromIP } from "../../utils/geoLocation.js";

// Almacén para controlar solicitudes duplicadas
const pendingRequests = new Map();

export const getConsent = async (req, res) => {
  try {
    // MEJORADO: Verificar múltiples fuentes para el token
    const consentToken = req.cookies?.consent_token || 
                        req.cookies?.['consent_token'] || 
                        req.headers['x-consent-token'] || 
                        null;
    
    const userId = req.user?.id_user || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    console.log(`getConsent para: userId=${userId}, IP=${ipAddress}, token=${consentToken?.substring(0, 10) || 'none'}...`);
    console.log('Cookies disponibles:', Object.keys(req.cookies || {})); // DEBUG: Ver qué cookies están disponibles

    const consent = await cookieConsentService.getConsent({
      consentToken,
      userId,
      ipAddress
    });

    if (consent.exists && consent.userId && userId && consent.userId !== userId) {
      console.log(`Consentimiento encontrado pertenece a otro usuario (${consent.userId} vs ${userId})`);
      consent.shouldShowBanner = true;
      consent.userMismatch = true;
    } else {
      consent.shouldShowBanner = await cookieConsentService.shouldShowBanner(ipAddress, userId);
    }

    const geoData = getLocationFromIP(ipAddress);

    res.status(200).json({
      ...consent,
      currentUserId: userId,
      geoData,
      debugInfo: process.env.NODE_ENV === "development" ? {
        receivedToken: consentToken,
        allCookies: req.cookies
      } : undefined
    });
  } catch (error) {
    console.error("Error obteniendo preferencias de cookies:", error);
    res.status(500).json({ error: "Error obteniendo preferencias de cookies" });
  }
};

export const checkCookieConsentStatus = async (req, res) => {
  try {
    // MEJORADO: Verificar múltiples fuentes para el token
    const consentToken = req.cookies?.consent_token || 
                        req.cookies?.['consent_token'] || 
                        req.headers['x-consent-token'] || 
                        null;
    
    const userId = req.user?.id_user || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    console.log(`checkCookieConsentStatus para: userId=${userId}, IP=${ipAddress}, token=${consentToken?.substring(0, 10) || 'none'}...`);
    console.log('Cookies recibidas:', Object.keys(req.cookies || {})); // DEBUG

    // Si no hay usuario autenticado ni token, verificar si hay consentimiento por IP
    if (!userId && !consentToken && ipAddress) {
      const ipConsent = await cookieConsentService.getConsent({ ipAddress });
      
      if (ipConsent.exists) {
        console.log(`Consentimiento encontrado para IP ${ipAddress}`);
        return res.status(200).json({
          ...ipConsent,
          authenticated: false,
          shouldShowBanner: false
        });
      }
      
      return res.status(200).json({
        exists: false,
        authenticated: false,
        shouldShowBanner: true,
        preferences: {
          essential: true,
          functional: false,
          analytics: false,
          marketing: false
        }
      });
    }

    // Si hay usuario autenticado y token de consentimiento, verificar si podemos vincular automáticamente
    if (userId && consentToken) {
      const tokenConsent = await cookieConsentService.getConsent({ consentToken });
      
      if (tokenConsent.exists && (!tokenConsent.userId || tokenConsent.userId === userId)) {
        console.log(`Vinculando automáticamente token ${consentToken} al usuario ${userId}`);
        const linked = await cookieConsentService.linkConsentToUser(consentToken, userId);
        
        if (linked) {
          console.log(`Consentimiento vinculado exitosamente`);
          return res.status(200).json({
            exists: true,
            authenticated: true,
            shouldShowBanner: false,
            linked: true,
            preferences: tokenConsent.preferences,
            consentToken,
            currentUserId: userId
          });
        }
      }
    }

    try {
      const consent = await cookieConsentService.getConsent({
        consentToken,
        userId,
        ipAddress
      });

      const shouldShowBanner = await cookieConsentService.shouldShowBanner(ipAddress, userId);
      const geoData = getLocationFromIP(ipAddress);

      return res.status(200).json({
        ...consent,
        authenticated: !!userId,
        shouldShowBanner,
        geoData,
        currentUserId: userId,
        debugInfo: process.env.NODE_ENV === "development" ? {
          receivedToken: consentToken,
          allCookies: req.cookies
        } : undefined
      });
    } catch (error) {
      console.error("Error en checkCookieConsentStatus:", error);
      return res.status(200).json({
        exists: false,
        authenticated: !!userId,
        shouldShowBanner: true,
        error: true,
        errorMessage: error.message,
        preferences: {
          essential: true,
          functional: false,
          analytics: false,
          marketing: false
        }
      });
    }
  } catch (error) {
    console.error("Error general en checkCookieConsentStatus:", error);
    return res.status(200).json({
      exists: false,
      error: true,
      errorMessage: error.message,
      shouldShowBanner: true,
      preferences: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false
      }
    });
  }
};

export const saveConsent = async (req, res) => {
  try {
    const { essential, functional, analytics, marketing } = req.body;
    const userId = req.user?.id_user || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    const requestId = `${ipAddress}-${userId || 'anon'}-${Date.now()}`;

    if (pendingRequests.has(requestId)) {
      console.log(`Solicitud duplicada detectada: ${requestId}`);
      return res.status(200).json({
        status: "error",
        code: "RATE_LIMITED",
        error: "Solicitud en proceso, por favor espere",
        duplicate: true,
        retryAfter: 5
      });
    }

    pendingRequests.set(requestId, Date.now());
    setTimeout(() => {
      pendingRequests.delete(requestId);
    }, 5000);

    console.log(`Solicitud saveConsent: userId=${userId}, IP=${ipAddress}`);

    let existingConsent = null;
    // MEJORADO: Verificar múltiples fuentes para el token
    let consentToken = req.cookies?.consent_token || 
                      req.cookies?.['consent_token'] || 
                      req.headers['x-consent-token'] || 
                      null;

    console.log('Token recibido en saveConsent:', consentToken); // DEBUG

    if (consentToken) {
      try {
        existingConsent = await cookieConsentService.getConsent({
          consentToken,
          userId,
          ipAddress
        });
        
        if (existingConsent.exists && existingConsent.userId && userId && 
            existingConsent.userId !== userId) {
          console.log(`Consentimiento existente pertenece a otro usuario: ${existingConsent.userId} vs ${userId}`);
          consentToken = null;
        }
      } catch (e) {
        console.log("Error buscando consentimiento existente:", e);
        consentToken = null;
      }
    }

    const geoData = getLocationFromIP(ipAddress);

    const result = await cookieConsentService.saveConsent({
      consentToken,
      userId,
      ipAddress,
      userAgent,
      preferences: {
        essential: essential === undefined ? true : essential,
        functional: !!functional,
        analytics: !!analytics,
        marketing: !!marketing
      }
    });

    // MEJORADO: Configuración específica para desarrollo y producción
    const cookieOptions = {
      httpOnly: false, // Permitir acceso desde JavaScript
      secure: false, // NO usar secure en localhost
      sameSite: "Lax", // Lax funciona mejor en desarrollo
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
      path: "/",
    };

    if (process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
      cookieOptions.secure = true;
      cookieOptions.sameSite = "Strict";
    }

    // DEBUG: Log antes de establecer la cookie
    console.log('Estableciendo cookie consent_token con opciones:', cookieOptions);
    console.log('Token a establecer:', result.consentToken.substring(0, 10) + '...');

    res.cookie("consent_token", result.consentToken, cookieOptions);

    // DEBUG: Verificar que la cookie se estableció
    console.log('Cookie consent_token establecida en response headers');

    console.log(`Cookie establecida: consent_token=${result.consentToken.substring(0, 10)}...`); // DEBUG

    pendingRequests.delete(requestId);

    res.status(200).json({
      success: true,
      ...result,
      userId: userId,
      pais: result.pais || geoData.country,
      ciudad: geoData.city,
      region: geoData.region,
      ubicacion: geoData.formattedLocation,
      debugInfo: process.env.NODE_ENV === "development" ? {
        cookieSet: result.consentToken,
        cookieOptions
      } : undefined
    });
  } catch (error) {
    console.error("Error guardando preferencias de cookies:", error);
    res.status(500).json({ error: "Error guardando preferencias de cookies" });
  }
};

export const getConsentHistory = async (req, res) => {
  try {
    const userId = req.user?.id_user || null;

    // Si no hay usuario autenticado, devolver error
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const limit = parseInt(req.query.limit) || 10;

    const history = await cookieAuditService.getAuditHistory(userId, limit);

    res.status(200).json({ history });
  } catch (error) {
    console.error("Error obteniendo historial de consentimiento:", error);
    res.status(500).json({ error: "Error obteniendo historial de consentimiento" });
  }
};

// Revocar el consentimiento actual (rechazar todas las cookies opcionales)
export const revokeConsent = async (req, res) => {
  try {
    const consentToken = req.cookies.consent_token || null;

    const userId = req.user?.id_user || null;

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    const geoData = getLocationFromIP(ipAddress);

    const result = await cookieConsentService.saveConsent({
      consentToken,
      userId,
      ipAddress,
      userAgent,
      preferences: {
        essential: true, // Siempre necesarias
        functional: false,
        analytics: false,
        marketing: false
      }
    });

    await cookieAuditService.logAudit({
      action: 'consent_revoked',
      userId,
      ipAddress,
      userAgent,
      preferences: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false
      },
      consentToken: result.consentToken,
      geoData
    });

    res.status(200).json({
      success: true,
      message: "Consentimiento revocado exitosamente",
      pais: geoData.country,
      ubicacion: geoData.formattedLocation
    });
  } catch (error) {
    console.error("Error revocando consentimiento:", error);
    res.status(500).json({ error: "Error revocando consentimiento" });
  }
};

// Vincular consentimiento anónimo a usuario autenticado
export const linkAnonymousConsent = async (req, res) => {
  try {
    const consentToken = req.cookies.consent_token || req.body.consentToken || null;

    const userId = req.user?.id_user || null;

    // Si no hay usuario autenticado, devolver error
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Si no hay token, devolver error
    if (!consentToken) {
      return res.status(400).json({ error: "Token de consentimiento no proporcionado" });
    }

    console.log(`Intentando vincular token ${consentToken} al usuario ${userId}`);

    const linked = await cookieConsentService.linkConsentToUser(consentToken, userId);

    if (!linked) {
      return res.status(200).json({
        success: false,
        message: "No se pudo vincular el consentimiento al usuario"
      });
    }

    const consent = await cookieConsentService.getConsent({ userId });

    res.status(200).json({
      success: true,
      message: "Consentimiento vinculado exitosamente",
      userId,
      consentToken,
      preferences: consent.preferences
    });
  } catch (error) {
    console.error("Error vinculando consentimiento:", error);
    res.status(500).json({ error: "Error vinculando consentimiento" });
  }
};