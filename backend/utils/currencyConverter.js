/**
 * Utilidad para conversión de monedas usando Frankfurter API
 * 
 * Este módulo proporciona funciones para convertir entre diferentes monedas
 * utilizando la API Frankfurter, que obtiene tasas de cambio del Banco Central Europeo.
 * Incluye caché y mecanismos de respaldo.
 */

// URL base de la API Frankfurter (no requiere API key)
const API_BASE = 'https://api.frankfurter.dev/v1';

// Caché de tasas de cambio para reducir llamadas a la API
const exchangeRateCache = {
  // Formato: 'FROM_TO': { rate: 1.23, timestamp: 1620000000000 }
};

// Tiempo de caducidad del caché en milisegundos (1 hora)
const CACHE_EXPIRY = 60 * 60 * 1000;

// Tasas de cambio de respaldo (actualizadas al 04/05/2025)
// Estas se utilizan cuando la API no está disponible
const FALLBACK_EUR_RATES = {
  'USD': 0.91,
  'GBP': 1.17,
  'MXN': 0.049,
  'COP': 0.00023,
  'ARS': 0.001,
  'CLP': 0.00096,
  'PEN': 0.25,
  'VES': 0.0026,
  'BOB': 0.13,
  'PYG': 0.00012,
  'UYU': 0.023,
  'GTQ': 0.12,
  'HNL': 0.037,
  'NIO': 0.024,
  'CRC': 0.0018,
  'PAB': 0.91,
  'DOP': 0.016,
  'SVC': 0.10,
  'EUR': 1.0
};

/**
 * Obtiene la tasa de cambio entre dos monedas usando Frankfurter API
 * @param {string} from - Código de moneda origen (ej. 'USD')
 * @param {string} to - Código de moneda destino (ej. 'EUR')
 * @returns {Promise<number>} - Tasa de cambio (1 unidad de 'from' = X unidades de 'to')
 */
export async function getExchangeRate(from, to) {
  // Caso base: misma moneda
  if (from === to) return 1;
  
  const cacheKey = `${from}_${to}`;
  const now = Date.now();
  
  // Verificar caché primero
  if (exchangeRateCache[cacheKey]) {
    const cachedData = exchangeRateCache[cacheKey];
    
    // Si el caché aún es válido, usarlo
    if (now - cachedData.timestamp < CACHE_EXPIRY) {
      console.log(`Usando tasa en caché para ${from} -> ${to}: ${cachedData.rate}`);
      return cachedData.rate;
    }
  }
  
  try {
    // Construir URL para Frankfurter API
    const url = `${API_BASE}/latest?from=${from}&symbols=${to}`;
    console.log(`Consultando Frankfurter API: ${url}`);
    
    // Realizar la petición a la API
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error en Frankfurter API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verificar que tenemos la tasa para la moneda solicitada
    if (data && data.rates && data.rates[to]) {
      const rate = data.rates[to];
      
      // Guardar en caché
      exchangeRateCache[cacheKey] = {
        rate,
        timestamp: now
      };
      
      console.log(`Tasa obtenida para ${from} -> ${to}: ${rate}`);
      return rate;
    } else {
      throw new Error(`Tasa no encontrada para ${from} a ${to} en la respuesta`);
    }
  } catch (error) {
    console.warn(`Error obteniendo tasa de cambio de Frankfurter API: ${error.message}`);
    
    // Intentar usar el mecanismo de respaldo
    return getFallbackExchangeRate(from, to);
  }
}

/**
 * Obtiene la tasa de cambio utilizando el método de respaldo
 * @param {string} from - Código de moneda origen
 * @param {string} to - Código de moneda destino
 * @returns {number} - Tasa de cambio o error si no se encuentra
 */
function getFallbackExchangeRate(from, to) {
  console.log(`Intentando usar tasas de respaldo para ${from} -> ${to}`);
  
  // Si es conversión a EUR, usamos tabla de respaldo
  if (to === 'EUR' && FALLBACK_EUR_RATES[from]) {
    return FALLBACK_EUR_RATES[from];
  }
  
  // Si es conversión desde EUR, invertimos tasa
  if (from === 'EUR' && FALLBACK_EUR_RATES[to]) {
    return 1 / FALLBACK_EUR_RATES[to];
  }
  
  // Para otras combinaciones, calculamos a través de EUR
  if (FALLBACK_EUR_RATES[from] && FALLBACK_EUR_RATES[to]) {
    const fromEurRate = FALLBACK_EUR_RATES[from];
    const toEurRate = FALLBACK_EUR_RATES[to];
    
    return toEurRate / fromEurRate;
  }
  
  // Si no hay datos de respaldo, devolver error
  throw new Error(`No se pudo determinar tasa de cambio para ${from} a ${to}`);
}

/**
 * Convierte un monto de una moneda a otra
 * @param {number} amount - Monto a convertir
 * @param {string} from - Código de moneda origen
 * @param {string} to - Código de moneda destino
 * @returns {Promise<number>} - Monto convertido
 */
export async function convertCurrency(amount, from, to) {
  // Si la moneda origen y destino son iguales, devolver el mismo monto
  if (from === to) return amount;
  
  try {
    // Obtener tasa de cambio
    const rate = await getExchangeRate(from, to);
    
    // Realizar la conversión
    const converted = amount * rate;
    
    // Redondear a 2 decimales para evitar imprecisiones
    return parseFloat(converted.toFixed(2));
  } catch (error) {
    console.error(`Error al convertir ${amount} ${from} a ${to}: ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene la lista de monedas disponibles en Frankfurter
 * @returns {Promise<Object>} - Objeto con códigos de moneda y nombres
 */
export async function getAvailableCurrencies() {
  try {
    const response = await fetch(`${API_BASE}/currencies`);
    
    if (!response.ok) {
      throw new Error(`Error en Frankfurter API: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`Error obteniendo monedas disponibles: ${error.message}`);
    
    // Devolver un conjunto básico de monedas como respaldo
    return {
      EUR: "Euro",
      USD: "US Dollar",
      GBP: "British Pound",
      MXN: "Mexican Peso",
      COP: "Colombian Peso",
      ARS: "Argentine Peso",
      CLP: "Chilean Peso"
    };
  }
}

/**
 * Limpia la caché de tasas de cambio
 */
export function clearExchangeRateCache() {
  Object.keys(exchangeRateCache).forEach(key => {
    delete exchangeRateCache[key];
  });
  console.log("Caché de tasas de cambio limpiada");
}

// Para debug: exponer información del estado de la caché
export function getExchangeRateCacheInfo() {
  return {
    cacheSize: Object.keys(exchangeRateCache).length,
    cachedCurrencyPairs: Object.keys(exchangeRateCache),
    cacheExpiry: CACHE_EXPIRY / 1000 / 60 + " minutos"
  };
}