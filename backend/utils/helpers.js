const crypto = require('crypto');

const helpers = {
  /**
   * Genera un string aleatorio
   * @param {number} length Longitud del string
   * @returns {string} String aleatorio
   */
  generateRandomString: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Sanitiza un objeto eliminando campos sensibles
   * @param {Object} obj Objeto a sanitizar
   * @param {Array} fieldsToRemove Campos a eliminar
   * @returns {Object} Objeto sanitizado
   */
  sanitizeObject: (obj, fieldsToRemove = ['password', 'token']) => {
    const sanitized = { ...obj };
    fieldsToRemove.forEach(field => delete sanitized[field]);
    return sanitized;
  },

  /**
   * Formatea una fecha a string
   * @param {Date} date Fecha a formatear
   * @param {string} format Formato deseado
   * @returns {string} Fecha formateada
   */
  formatDate: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  },

  /**
   * Valida un email
   * @param {string} email Email a validar
   * @returns {boolean} True si es válido
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Trunca un texto a una longitud máxima
   * @param {string} text Texto a truncar
   * @param {number} maxLength Longitud máxima
   * @returns {string} Texto truncado
   */
  truncateText: (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  },

  /**
   * Retorna un número aleatorio entre min y max
   * @param {number} min Número mínimo
   * @param {number} max Número máximo
   * @returns {number} Número aleatorio
   */
  getRandomNumber: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Parsea un string a JSON de forma segura
   * @param {string} str String a parsear
   * @returns {Object|null} Objeto parseado o null si hay error
   */
  safeJSONParse: (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  },

  /**
   * Delay promise
   * @param {number} ms Milisegundos a esperar
   * @returns {Promise} Promise que se resuelve después de ms milisegundos
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

module.exports = helpers;