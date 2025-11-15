// utils/geoLocation.js
import geoip from 'geoip-lite';

/**
 * Obtiene información de ubicación a partir de una dirección IP
 * @param {string} ip - Dirección IP
 * @returns {Object} Información de ubicación o null
 */
export const getLocationFromIP = (ip) => {
  try {
    const cleanIP = ip.replace('::ffff:', '');
    
    const geo = geoip.lookup(cleanIP);
    
    if (!geo) {
      return {
        country: 'Desconocido',
        region: 'Desconocido',
        city: 'Ubicación desconocida',
        formattedLocation: 'Ubicación desconocida'
      };
    }
    
    const location = {
      country: geo.country || 'Desconocido',
      region: geo.region || 'Desconocido',
      city: geo.city || 'Desconocido',
      ll: geo.ll, // Latitud y longitud [lat, lng]
      formattedLocation: `${geo.city || ''}, ${geo.region || ''}, ${geo.country || 'Ubicación desconocida'}`
    };
    
    location.formattedLocation = location.formattedLocation
      .replace(/, ,/g, ',')
      .replace(/^, /g, '')
      .replace(/, $/g, '')
      .trim();
      
    if (location.formattedLocation === '') {
      location.formattedLocation = 'Ubicación desconocida';
    }
    
    return location;
  } catch (error) {
    console.error('Error al obtener geolocalización:', error);
    return {
      country: 'Error',
      region: 'Error',
      city: 'Error de geolocalización',
      formattedLocation: 'Error de geolocalización'
    };
  }
};

/**
 * Comprueba si una IP es local o de servicios internos
 * @param {string} ip - Dirección IP a comprobar
 * @returns {boolean} true si es una IP local/interna
 */
export const isLocalIP = (ip) => {
  const localPatterns = [
    '127.0.0.1',
    '::1',
    'localhost',
    '::ffff:127.0.0.1',
    '192.168.',
    '10.'
  ];
  
  return localPatterns.some(pattern => ip.includes(pattern));
};

export default {
  getLocationFromIP,
  isLocalIP
};