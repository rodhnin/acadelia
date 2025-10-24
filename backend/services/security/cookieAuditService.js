// backend/services/security/cookieAuditService.js
import pool from "../../lib/dbPool.js";
import { redisService } from "../../lib/redis.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { getLocationFromIP } from '../../utils/geoLocation.js';

class CookieAuditService {
  /**
   * Registrar una auditoría de evento de cookies
   * @param {Object} params - Parámetros del evento
   * @param {string} params.action - Tipo de acción (consent_granted, consent_updated, consent_revoked)
   * @param {string|number} params.userId - ID del usuario (si está autenticado)
   * @param {string} params.ipAddress - Dirección IP del usuario
   * @param {string} params.userAgent - User Agent del navegador
   * @param {Object} params.preferences - Preferencias de consentimiento
   * @param {string} params.consentToken - Token de consentimiento
   * @param {Object} params.geoData - Datos de geolocalización
   */
  async logAudit({ action, userId, ipAddress, userAgent, preferences, consentToken, geoData }) {
    try {
      // Si no se proporcionaron datos de geolocalización, obtenerlos ahora
      if (!geoData) {
        geoData = getLocationFromIP(ipAddress);
      }
      
      // Preparar datos para el evento
      const eventType = `COOKIE_${action.toUpperCase()}`;
      const message = this.formatMessage(action, preferences);
      const data = {
        preferences,
        consentToken,
        timestamp: new Date().toISOString(),
        pais: geoData.country,
        ubicacion: geoData.formattedLocation,
        geoLocation: geoData
      };
      
      // Usar la función logSecurityEvent para registrar el evento
      // Esta función ya maneja correctamente los nombres de columnas
      await logSecurityEvent(
        eventType,
        message,
        data,
        'info',
        userId,
        ipAddress
      );
      
      // Almacenar en Redis para consultas rápidas (30 días)
      const key = `cookie_audit:${userId || 'anonymous'}:${Date.now()}`;
      await redisService.set(key, {
        action,
        userId,
        ipAddress,
        preferences,
        pais: geoData.country,
        ciudad: geoData.city,
        region: geoData.region,
        ubicacion: geoData.formattedLocation,
        timestamp: Date.now()
      }, 30 * 24 * 60 * 60); // 30 días
      
      return true;
    } catch (error) {
      console.error("Error registrando auditoría de cookies:", error);
      throw error;
    }
  }
  
  /**
   * Obtener historial de auditoría para un usuario
   * @param {string|number} userId - ID del usuario o 'anonymous'
   * @param {number} limit - Límite de registros a obtener
   */
  async getAuditHistory(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          id, 
          event_type, 
          message, 
          data, 
          ip_address, 
          created_at 
        FROM security_events 
        WHERE user_id = $1 AND event_type LIKE 'COOKIE_%'
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const { rows } = await pool.query(query, [userId, limit]);
      
      return rows.map(row => {
        // Parsear los datos JSON
        let parsedData = {};
        try {
          parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        } catch (e) {
          console.error('Error al parsear datos JSON:', e);
          parsedData = row.data;
        }
        
        return {
          id: row.id,
          eventType: row.event_type,
          message: row.message,
          data: parsedData,
          ipAddress: row.ip_address,
          pais: parsedData.pais || 'Desconocido',
          ubicacion: parsedData.ubicacion || 'Ubicación desconocida',
          timestamp: row.created_at
        };
      });
    } catch (error) {
      console.error("Error obteniendo historial de auditoría de cookies:", error);
      return [];
    }
  }
  
  /**
   * Generar un mensaje descriptivo para el evento
   * @private
   */
  formatMessage(action, preferences) {
    const categories = [];
    if (preferences.essential) categories.push('esenciales');
    if (preferences.functional) categories.push('funcionales');
    if (preferences.analytics) categories.push('analíticas');
    if (preferences.marketing) categories.push('marketing');
    
    const categoriesStr = categories.join(', ');
    
    switch (action) {
      case 'consent_granted':
        return `Consentimiento de cookies otorgado para: ${categoriesStr}`;
      case 'consent_updated':
        return `Consentimiento de cookies actualizado a: ${categoriesStr}`;
      case 'consent_revoked':
        return `Consentimiento de cookies revocado excepto: ${categoriesStr}`;
      default:
        return `Acción de consentimiento de cookies: ${action} - Categorías: ${categoriesStr}`;
    }
  }
}

export const cookieAuditService = new CookieAuditService();