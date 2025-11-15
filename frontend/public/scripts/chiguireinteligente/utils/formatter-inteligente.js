/**
 * Utilidades para formatear datos en el panel financiero
 */

// Constantes para formateo
const DEFAULT_LOCALE = 'es-ES';
const DEFAULT_CURRENCY = 'EUR';

/**
 * Formatea un valor monetario
 * @param {number} amount - Cantidad a formatear
 * @param {string} currencyCode - Código de moneda (EUR, USD, etc.)
 * @param {string} locale - Locale para formateo
 * @returns {string} Valor formateado
 */
export function formatCurrency(amount, currencyCode = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) {
  // Si la cantidad es nula o indefinida, devolver '0.00'
  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(0);
  }
  
  // Si es string, intentar convertir a número
  if (typeof amount === 'string') {
    // Si el string representa centavos (como en respuestas de Paddle)
    if (!amount.includes('.')) {
      amount = parseInt(amount) / 100;
    } else {
      amount = parseFloat(amount);
    }
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

/**
 * Formatea una fecha en formato legible
 * @param {string|Date} date - Fecha a formatear
 * @param {string} format - Formato deseado (short, medium, long, full)
 * @param {string} locale - Locale para formateo
 * @returns {string} Fecha formateada
 */
export function formatDate(date, format = 'medium', locale = DEFAULT_LOCALE) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn(`Fecha inválida: ${date}`);
    return '';
  }
  
  // Mapeo de formatos a opciones
  const formatOptions = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  };
  
  return new Intl.DateTimeFormat(locale, formatOptions[format] || formatOptions.medium).format(dateObj);
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor a formatear (0-1 o 0-100)
 * @param {boolean} fromDecimal - Si el valor está en decimal (0-1)
 * @param {number} decimals - Número de decimales a mostrar
 * @param {string} locale - Locale para formateo
 * @returns {string} Porcentaje formateado
 */
export function formatPercentage(value, fromDecimal = true, decimals = 1, locale = DEFAULT_LOCALE) {
  if (value === null || value === undefined) {
    return '0%';
  }
  
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  
  // Si está en decimal y es mayor que 1, asumir que ya está en porcentaje
  if (fromDecimal && value <= 1) {
    value = value * 100;
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Formatea un número
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Decimales a mostrar
 * @param {string} locale - Locale para formateo
 * @returns {string} Número formateado
 */
export function formatNumber(value, decimals = 0, locale = DEFAULT_LOCALE) {
  if (value === null || value === undefined) {
    return '0';
  }
  
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formatea un estado de suscripción
 * @param {string} status - Estado (active, paused, canceled, expired)
 * @returns {string} HTML con badge formateado
 */
export function formatSubscriptionStatus(status) {
  const statusMap = {
    active: { class: 'status-active', label: 'Activa' },
    paused: { class: 'status-paused', label: 'Pausada' },
    canceled: { class: 'status-canceled', label: 'Cancelada' },
    expired: { class: 'status-expired', label: 'Expirada' },
    default: { class: 'bg-secondary', label: 'Desconocido' }
  };
  
  const statusInfo = statusMap[status] || statusMap.default;
  
  return `<span class="badge badge-status ${statusInfo.class}">${statusInfo.label}</span>`;
}

/**
 * Formatea un nombre de producto 
 * @param {string} productName - Nombre del producto
 * @param {string} productId - ID del producto
 * @returns {string} Nombre formateado
 */
export function formatProductName(productName, productId) {
  if (!productName) {
    return productId ? `Producto ${productId}` : 'Desconocido';
  }
  
  return productName;
}

/**
 * Formatea un nombre de usuario combinando nombre y email
 * @param {Object} user - Objeto de usuario
 * @returns {string} Nombre formateado
 */
export function formatUserName(user) {
  if (!user) return 'Usuario desconocido';
  
  let displayName = '';
  
  if (user.nombre && user.apellido) {
    displayName = `${user.nombre} ${user.apellido}`;
  } else if (user.nombre) {
    displayName = user.nombre;
  } else if (user.email || user.correo) {
    const email = user.email || user.correo;
    displayName = email;
  } else if (user.id || user.id_user) {
    const id = user.id || user.id_user;
    displayName = `Usuario ${id}`;
  } else {
    displayName = 'Usuario desconocido';
  }
  
  return displayName;
}

/**
 * Trunca un texto largo
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength = 30) {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Codifica una cadena para uso seguro en HTML
 * @param {string} str - Cadena a codificar
 * @returns {string} Cadena codificada
 */
export function escapeHtml(str) {
  if (!str) return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
}

/**
 * Formatea un código de país a nombre legible
 * @param {string} countryCode - Código ISO del país
 * @returns {string} Nombre del país
 */
export function formatCountryName(countryCode) {
  if (!countryCode) return 'Desconocido';
  
  // Lista de países comunes en español, ampliada
  const countries = {
    'ES': 'España',
    'MX': 'México',
    'CO': 'Colombia',
    'AR': 'Argentina',
    'PE': 'Perú',
    'CL': 'Chile',
    'EC': 'Ecuador',
    'VE': 'Venezuela',
    'US': 'Estados Unidos',
    'GB': 'Reino Unido',
    'UK': 'Reino Unido',
    'FR': 'Francia',
    'DE': 'Alemania',
    'IT': 'Italia',
    'PT': 'Portugal',
    'BO': 'Bolivia',
    'DO': 'República Dominicana',
    'HN': 'Honduras',
    'PY': 'Paraguay',
    'SV': 'El Salvador',
    'NI': 'Nicaragua',
    'CR': 'Costa Rica',
    'PA': 'Panamá',
    'UY': 'Uruguay',
    'PR': 'Puerto Rico',
    'BE': 'Bélgica',
    'NL': 'Países Bajos',
    'CH': 'Suiza',
    'AT': 'Austria',
    'GR': 'Grecia',
    'SE': 'Suecia',
    'NO': 'Noruega',
    'DK': 'Dinamarca',
    'FI': 'Finlandia',
    'IE': 'Irlanda',
    'PL': 'Polonia',
    'RU': 'Rusia',
    'UA': 'Ucrania',
    'TR': 'Turquía',
    'BR': 'Brasil',
    'CA': 'Canadá',
    'AU': 'Australia',
    'NZ': 'Nueva Zelanda',
    'JP': 'Japón',
    'CN': 'China',
    'IN': 'India',
    'ZA': 'Sudáfrica',
    'UNKNOWN': 'País Desconocido'
  };
  
  // Si el código existe en el mapa, devolver el nombre correspondiente
  // Si es un nombre de país en lugar de un código (más de 2 caracteres)
  if (countryCode.length > 2) {
    return countryCode;
  }
  
  return countries[countryCode] || countryCode;
}

/**
 * Formatea un código de moneda a símbolo
 * @param {string} currencyCode - Código de moneda (EUR, USD, etc.)
 * @returns {string} Símbolo de moneda
 */
export function getCurrencySymbol(currencyCode = DEFAULT_CURRENCY) {
  const symbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'MXN': '$',
    'ARS': '$',
    'COP': '$',
    'PEN': 'S/',
    'CLP': '$',
    'VES': 'Bs.'
  };
  
  return symbols[currencyCode] || currencyCode;
}

/**
 * Genera un identificador único
 * @returns {string} Identificador único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}