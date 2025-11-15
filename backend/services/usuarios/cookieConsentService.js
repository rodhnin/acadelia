import crypto from 'crypto';
import pool from "../../lib/dbPool.js";
import { redisService } from "../../lib/redis.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { cookieAuditService } from "../security/cookieAuditService.js";
import { isMinor, getUserAge } from "../../utils/ageVerification.js";
import { getLocationFromIP } from "../../utils/geoLocation.js";

class CookieConsentService {
  async getConsent({ consentToken, userId, ipAddress }) {
    try {
      // Primero intentar caché
      const cacheKey = userId ? `consent:user:${userId}` : (consentToken ? `consent:token:${consentToken}` : null);
      
      if (cacheKey) {
        const cachedConsent = await redisService.get(cacheKey);
        if (cachedConsent) {
          return cachedConsent;
        }
      }
      
      let query = '';
      let params = [];
      
      if (userId) {
        query = `
          SELECT essential, functional, analytics, marketing, consent_token, pais, user_id
          FROM cookie_consent 
          WHERE user_id = $1 
          ORDER BY updated_at DESC 
          LIMIT 1
        `;
        params = [userId];
      } else if (consentToken) {
        query = `
          SELECT essential, functional, analytics, marketing, consent_token, pais, user_id 
          FROM cookie_consent 
          WHERE consent_token = $1 
          ORDER BY updated_at DESC 
          LIMIT 1
        `;
        params = [consentToken];
      } else if (ipAddress) {
        // IMPORTANTE: Ahora buscamos consentimiento para la IP independientemente del usuario
        query = `
          SELECT essential, functional, analytics, marketing, consent_token, pais, user_id 
          FROM cookie_consent 
          WHERE ip_address = $1
          ORDER BY updated_at DESC 
          LIMIT 1
        `;
        params = [ipAddress];
      } else {
        // No se encontró consentimiento existente
        return {
          exists: false,
          preferences: {
            essential: true,
            functional: false,
            analytics: false,
            marketing: false
          }
        };
      }
      
      const { rows } = await pool.query(query, params);
      
      if (rows.length === 0) {
        console.log("No se encontró consentimiento en la base de datos");
        return {
          exists: false,
          preferences: {
            essential: true,
            functional: false,
            analytics: false,
            marketing: false
          }
        };
      }
      
      const result = {
        exists: true,
        preferences: {
          essential: rows[0].essential,
          functional: rows[0].functional,
          analytics: rows[0].analytics,
          marketing: rows[0].marketing
        },
        consentToken: rows[0].consent_token,
        pais: rows[0].pais,
        userId: rows[0].user_id
      };
      
      if (cacheKey) {
        await redisService.set(cacheKey, result, 3600); // Cachear por 1 hora
      }
      
      return result;
    } catch (error) {
      console.error("Error obteniendo preferencias de cookies:", error);
      throw error;
    }
  }
  
  async saveConsent({ consentToken, userId, ipAddress, userAgent, preferences }) {
    try {
      if (consentToken) {
        try {
          const existingConsent = await this.getConsent({ consentToken });
          
          // Si el consentimiento existe pero pertenece a otro usuario
          if (existingConsent && existingConsent.exists && existingConsent.userId && 
              userId && existingConsent.userId !== userId) {
            console.log(`Consentimiento existente (token: ${consentToken}) pertenece a otro usuario: ${existingConsent.userId} vs ${userId}`);
            
            consentToken = null;
          } else if (!existingConsent || !existingConsent.exists) {
            console.log("Token de consentimiento inválido o expirado, se generará uno nuevo");
            consentToken = null;
          }
        } catch (error) {
          console.log("Error verificando token existente, se generará uno nuevo:", error.message);
          consentToken = null;
        }
      }
      
      if (!consentToken) {
        consentToken = crypto.randomBytes(32).toString('hex');
        console.log(`Generando nuevo token de consentimiento: ${consentToken}`);
      }
      
      const geoData = getLocationFromIP(ipAddress);
      
      let userIsMinor = false;
      if (userId) {
        userIsMinor = await isMinor(userId);
        
        if (userIsMinor) {
          // Solo permitir cookies esenciales y funcionales para menores
          preferences = {
            essential: true,
            functional: preferences.functional, // Mantener preferencia funcional
            analytics: false, // No permitir analíticas para menores
            marketing: false, // No permitir marketing para menores
          };
          
          logSecurityEvent(
            'COOKIE_GDPR_MINOR',
            'Consentimiento de cookies limitado por protección de menor de edad',
            {
              userId: userId,
              ipAddress,
              geoLocation: geoData,
              minorProtection: true
            },
            'info',
            userId,
            ipAddress
          );
        }
      }
      
      console.log("Guardando consentimiento:");
      console.log(` Existe registro previo: ${consentToken ? 'Sí' : 'No'}`);
      console.log(` ConsentToken: ${consentToken}`);
      console.log(` UserId: ${userId}`);
      console.log(` IP: ${ipAddress}`);
      console.log(` País: ${geoData.country}`);
      
      // Primero verificamos si el token ya existe en la base de datos
      const checkQuery = `SELECT id FROM cookie_consent WHERE consent_token = $1`;
      const checkResult = await pool.query(checkQuery, [consentToken]);
      const existingId = checkResult.rows.length > 0 ? checkResult.rows[0].id : null;
      
      // Luego verificamos si este usuario ya tiene un consentimiento registrado
      let userConsentId = null;
      if (userId) {
        const userCheckQuery = `SELECT id FROM cookie_consent WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`;
        const userCheckResult = await pool.query(userCheckQuery, [userId]);
        userConsentId = userCheckResult.rows.length > 0 ? userCheckResult.rows[0].id : null;
      }
      
      let query;
      let values;
      
      // Si el usuario tiene consentimiento previo, actualizar ese registro prioritariamente
      if (userId && userConsentId) {
        console.log(`Actualizando consentimiento existente para usuario ${userId} (ID: ${userConsentId})`);
        query = `
          UPDATE cookie_consent
          SET ip_address = $1,
              essential = $2,
              functional = $3,
              analytics = $4,
              marketing = $5,
              user_agent = $6,
              pais = $7,
              ciudad = $8,
              region = $9,
              ubicacion_completa = $10,
              consent_token = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
          RETURNING id, user_id, consent_token
        `;
        values = [
          ipAddress,
          preferences.essential,
          preferences.functional,
          preferences.analytics,
          preferences.marketing,
          userAgent,
          geoData.country,
          geoData.city,
          geoData.region,
          geoData.formattedLocation,
          consentToken,
          userConsentId
        ];
      } else if (existingId) {
        // Si hay un token existente pero no coincide con un usuario, actualizar ese registro
        console.log(`Ejecutando UPDATE para token existente (ID: ${existingId})`);
        query = `
          UPDATE cookie_consent
          SET user_id = $1,
              ip_address = $2,
              essential = $3,
              functional = $4,
              analytics = $5,
              marketing = $6,
              user_agent = $7,
              pais = $8,
              ciudad = $9,
              region = $10,
              ubicacion_completa = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE consent_token = $12
          RETURNING id, user_id, consent_token
        `;
        values = [
          userId,
          ipAddress,
          preferences.essential,
          preferences.functional,
          preferences.analytics,
          preferences.marketing,
          userAgent,
          geoData.country,
          geoData.city,
          geoData.region,
          geoData.formattedLocation,
          consentToken
        ];
      } else {
        console.log("Ejecutando INSERT para nuevo consentimiento");
        query = `
          INSERT INTO cookie_consent 
          (user_id, consent_token, ip_address, essential, functional, analytics, marketing, user_agent, pais, ciudad, region, ubicacion_completa) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, user_id, consent_token
        `;
        values = [
          userId,
          consentToken,
          ipAddress,
          preferences.essential,
          preferences.functional,
          preferences.analytics,
          preferences.marketing,
          userAgent,
          geoData.country,
          geoData.city,
          geoData.region,
          geoData.formattedLocation
        ];
      }
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length > 0) {
        console.log(`Consentimiento guardado con éxito, ID: ${rows[0].id}, userId: ${rows[0].user_id}, token: ${rows[0].consent_token}`);
        consentToken = rows[0].consent_token;
      }
      
      logSecurityEvent(
        'COOKIE_CONSENT_UPDATED',
        'Preferencias de cookies actualizadas',
        {
          userId: userId || 'anonymous',
          ipAddress,
          pais: geoData.country,
          ubicacion: geoData.formattedLocation,
          preferences,
          consentToken
        },
        'info',
        userId,
        ipAddress
      );
      
      const action = existingId || userConsentId ? 'consent_updated' : 'consent_granted';
      
      await cookieAuditService.logAudit({
        action,
        userId,
        ipAddress,
        userAgent,
        preferences,
        consentToken,
        geoData
      });
      
      if (userId) {
        await redisService.delete(`consent:user:${userId}`);
      }
      
      const cacheKey = userId ? `consent:user:${userId}` : `consent:token:${consentToken}`;
      const result = {
        exists: true,
        preferences: {
          essential: preferences.essential,
          functional: preferences.functional,
          analytics: preferences.analytics,
          marketing: preferences.marketing
        },
        consentToken,
        pais: geoData.country,
        geoData: geoData,
        userId: userId
      };
      
      await redisService.set(cacheKey, result, 3600); // Cachear por 1 hora
      
      console.log(`Nueva cookie de consentimiento establecida: ${consentToken} para ${userId ? `usuario ${userId}` : 'visitante anónimo'}`);
      
      return result;
    } catch (error) {
      console.error("Error guardando preferencias de cookies:", error);
      throw error;
    }
  }
  
  async shouldShowBanner(ipAddress, userId) {
    try {
      // MEJORA: Si hay un userId, primero verificar si hay consentimiento específico para ese usuario
      if (userId) {
        const userQuery = `
          SELECT id FROM cookie_consent 
          WHERE user_id = $1
          ORDER BY updated_at DESC 
          LIMIT 1
        `;
        
        const userResult = await pool.query(userQuery, [userId]);
        
        // Si encontramos consentimiento para este usuario, no mostrar banner
        if (userResult.rows.length > 0) {
          console.log(`shouldShowBanner para usuario ${userId}: No (tiene consentimiento)`);
          return false;
        }
        
        // Si el usuario no tiene consentimiento, verificar si hay algún consentimiento reciente en esta IP
        if (ipAddress) {
          const ipQuery = `
            SELECT id, user_id FROM cookie_consent 
            WHERE ip_address = $1
            ORDER BY updated_at DESC 
            LIMIT 1
          `;
          
          const ipResult = await pool.query(ipQuery, [ipAddress]);
          
          if (ipResult.rows.length > 0) {
            const consentUserId = ipResult.rows[0].user_id;
            
            // Si el consentimiento encontrado pertenece a otro usuario, mostrar banner
            if (consentUserId && consentUserId !== userId) {
              console.log(`shouldShowBanner: Sí - IP tiene consentimiento pero de otro usuario (${consentUserId})`);
              return true;
            }
            
            // Si el consentimiento es anónimo o del mismo usuario, no mostrar banner
            console.log(`shouldShowBanner: No - IP tiene consentimiento anónimo o del mismo usuario`);
            return false;
          }
        }
        
        // Si llegamos aquí, el usuario no tiene consentimiento y no hay consentimiento para esta IP
        console.log(`shouldShowBanner para usuario ${userId}: Sí (no tiene consentimiento previo)`);
        return true;
      }
      
      // MEJORA: Si no hay userId (usuario anónimo), verificar si hay algún consentimiento para esta IP
      if (ipAddress) {
        const query = `
          SELECT id FROM cookie_consent 
          WHERE ip_address = $1
          ORDER BY updated_at DESC 
          LIMIT 1
        `;
        
        const { rows } = await pool.query(query, [ipAddress]);
        
        // IMPORTANTE: Si hay cualquier consentimiento para esta IP, no mostrar banner
        // Este es el cambio clave para resolver el problema del usuario cerrando sesión
        const shouldShow = rows.length === 0;
        console.log(`shouldShowBanner para IP ${ipAddress}: ${shouldShow ? 'Sí (no tiene consentimiento previo)' : 'No (tiene consentimiento)'}`);
        return shouldShow;
      }
      
      console.log('shouldShowBanner: Sí (no hay userId ni IP válida)');
      return true; // Si no hay userId ni IP válida, mostrar el banner
    } catch (error) {
      console.error("Error verificando estado del banner de cookies:", error);
      return true; // En caso de error, mostrar el banner para estar seguros
    }
  }
  
  // Asociar consentimiento anónimo a usuario cuando inicia sesión
  async linkConsentToUser(consentToken, userId) {
    if (!consentToken || !userId) {
      console.log("No se puede vincular consentimiento: falta token o userId");
      return false;
    }
    
    try {
      const checkQuery = `
        SELECT id, user_id 
        FROM cookie_consent 
        WHERE consent_token = $1
        LIMIT 1
      `;
      
      const checkResult = await pool.query(checkQuery, [consentToken]);
      
      if (checkResult.rows.length === 0) {
        console.log(`Token ${consentToken} no encontrado en la base de datos`);
        return false;
      }
      
      const consentData = checkResult.rows[0];
      
      // Si ya está vinculado a un usuario diferente, no sobreescribir
      if (consentData.user_id && consentData.user_id !== userId) {
        console.log(`Token ${consentToken} ya está vinculado a otro usuario (${consentData.user_id})`);
        return false;
      }
      
      const userCheckQuery = `
        SELECT id 
        FROM cookie_consent 
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      
      const userCheckResult = await pool.query(userCheckQuery, [userId]);
      
      if (userCheckResult.rows.length > 0) {
        // El usuario ya tiene un consentimiento, usar ese en lugar de vincular
        console.log(`Usuario ${userId} ya tiene consentimiento previo, no se vinculará`);
        return false;
      }
      
      // Vincular el consentimiento al usuario
      const updateQuery = `
        UPDATE cookie_consent
        SET user_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE consent_token = $2 AND (user_id IS NULL OR user_id = $1)
        RETURNING id
      `;
      
      const updateResult = await pool.query(updateQuery, [userId, consentToken]);
      
      if (updateResult.rows.length === 0) {
        console.log(`No se pudo vincular el token ${consentToken} al usuario ${userId}`);
        return false;
      }
      
      console.log(`Token ${consentToken} vinculado exitosamente al usuario ${userId}`);
      
      await redisService.delete(`consent:token:${consentToken}`);
      await redisService.delete(`consent:user:${userId}`);
      
      logSecurityEvent(
        'COOKIE_CONSENT_LINKED',
        'Consentimiento de cookies vinculado a usuario',
        {
          userId,
          consentToken
        },
        'info',
        userId
      );
      
      return true;
    } catch (error) {
      console.error("Error vinculando consentimiento al usuario:", error);
      return false;
    }
  }
}

export const cookieConsentService = new CookieConsentService();