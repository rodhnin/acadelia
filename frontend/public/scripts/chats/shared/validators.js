/**
 * validators.js - Funciones de validación
 * 
 * Módulo optimizado para proporcionar validaciones robustas y eficientes.
 */

// Precompilar la expresión regular para UUID para mejor rendimiento
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mapa para sanitización (más eficiente que múltiples reemplazos)
const SANITIZE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Valida que un string tenga el formato UUID.
 * @param {string} uuid - String a validar
 * @returns {boolean} true si es válido.
 */
export function validateUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
}

/**
 * Valida si un valor está vacío (string vacío, null o undefined)
 * @param {any} value - Valor a validar
 * @returns {boolean} true si el valor está vacío
 */
export function isEmpty(value) {
  // Optimización: comprobación directa de valores comunes
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/**
 * Valida si un objeto es un JSON válido
 * @param {string} str - String a validar
 * @returns {boolean} true si es un JSON válido
 */
export function isValidJSON(str) {
  if (typeof str !== 'string') return false;
  str = str.trim();
  if (!str) return false;
  
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitiza un string para prevenir XSS
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  return str.replace(/[&<>"'`=\/]/g, match => SANITIZE_MAP[match]);
}

/**
 * Valida si un string tiene formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} true si el formato es válido
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // Regex simplificada pero efectiva para validar emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida si un string es seguro para insertar en URL
 * @param {string} str - String a validar
 * @returns {boolean} true si es seguro
 */
export function isUrlSafe(str) {
  if (typeof str !== 'string') return false;
  return !/[<>{}[\]`^\\]/.test(str);
}

/**
 * Verifica si una URL es válida
 * @param {string} url - URL a validar
 * @returns {boolean} true si la URL es válida
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  validateUUID,
  isEmpty,
  isValidJSON,
  sanitizeString,
  isValidEmail,
  isUrlSafe,
  isValidUrl
};