/**
 * state.js matematico - Módulo optimizado para gestionar el estado global del chat de Física
 */
import { getAppConfig } from './config-matematico.js';
import { VARIANT_INITIALIZED_EVENT } from './app-matematico.js';

// Estado global de la aplicación
const state = {
  userId: null,
  avaId: null, // Se inicializará desde el evento de inicialización de variante
  currentChatId: null,
  isProcessing: false,
  chats: new Map(),
  isMathPanelOpen: false,
  lastInteraction: Date.now(),
  mathHistory: [],
  preferences: {
    mathNotation: 'latex',
    autoPreview: true,
    favorites: []
  }
};

/**
 * Inicializar el estado con datos de variante
 * @param {Object} variantData - Datos de variante (incluye avaId)
 */
export function initializeState(variantData) {
  if (variantData && variantData.avaId) {
    state.avaId = variantData.avaId;
    console.log("avaId inicializado en initializeState:", state.avaId);
    return true;
  }
  
  // Si no recibimos datos de variante, podríamos estar en una carrera
  // Escuchar el evento de inicialización como respaldo
  document.addEventListener(VARIANT_INITIALIZED_EVENT, (event) => {
    if (event.detail && event.detail.avaId && !state.avaId) {
      state.avaId = event.detail.avaId;
      console.log("avaId inicializado desde evento:", state.avaId);
    }
  });
  
  return false;
}

/**
 * Obtiene el avaId actualizado
 * @returns {number} ID del asistente virtual
 */
export function getAvaId() {
  // Si avaId ya está en el estado, devolverlo
  if (state.avaId !== null) {
    return state.avaId;
  }
  
  // Si no, avisar que hay un problema en la secuencia de inicialización
  console.warn("getAvaId() llamado antes de inicializar avaId - esto no debería ocurrir");
  
  // Intento de recuperación de emergencia
  const config = getAppConfig();
  if (config && config.avaId) {
    // Actualizar el estado para futuros usos
    state.avaId = config.avaId;
    console.warn("avaId recuperado de emergencia:", config.avaId);
    return config.avaId;
  }
  
  // Valor por defecto si todo falla
  console.error("No se pudo obtener avaId - secuencia de inicialización incorrecta");
  return;
}

/**
 * Actualiza una propiedad del estado
 * @param {string} property - Propiedad a actualizar
 * @param {any} value - Nuevo valor
 * @returns {boolean} true si se actualizó correctamente, false si no existe la propiedad
 */
export function updateState(property, value) {
  if (property in state) {
    state[property] = value;
    
    // Actualizar timestamp de última interacción
    state.lastInteraction = Date.now();
    return true;
  }
  return false;
}

/**
 * Obtiene el valor actual de una propiedad del estado
 * @param {string} property - Propiedad a obtener (soporta notación de punto para propiedades anidadas)
 * @returns {any} Valor de la propiedad o undefined si no existe
 */
export function getState(property) {
  if (!property) return undefined;
  
  // Soporte para notación de punto (ej: "chats.123abc" o "preferences.mathNotation")
  if (property.includes('.')) {
    const [mainProp, subProp] = property.split('.');
    if (mainProp === 'chats' && state.chats instanceof Map) {
      return state.chats.get(subProp);
    }
    // Para otras propiedades anidadas (como preferences)
    return state[mainProp]?.[subProp];
  }
  
  return state[property];
}

/**
 * Registra un chat en el mapa de chats
 * @param {string} chatId - ID del chat
 * @param {Object} chatData - Datos del chat
 * @returns {boolean} true si se registró correctamente
 */
export function registerChat(chatId, chatData) {
  if (!chatId) return false;
  
  state.chats.set(chatId, chatData);
  return true;
}

/**
 * Elimina un chat del mapa de chats
 * @param {string} chatId - ID del chat a eliminar
 * @returns {boolean} true si se eliminó, false si no existía
 */
export function removeChat(chatId) {
  return state.chats.delete(chatId);
}

/**
 * Establece el chat activo
 * @param {string} chatId - ID del chat activo
 * @returns {boolean} true si se estableció correctamente
 */
export function setCurrentChat(chatId) {
  state.currentChatId = chatId;
  state.lastInteraction = Date.now();
  return true;
}

/**
 * Establece el estado de procesamiento
 * @param {boolean} isProcessing - Estado de procesamiento
 * @returns {boolean} El nuevo estado de procesamiento
 */
export function setProcessingState(isProcessing) {
  state.isProcessing = Boolean(isProcessing);
  return state.isProcessing;
}

/**
 * Establece el ID de usuario
 * @param {string} userId - ID de usuario
 * @returns {boolean} true si se estableció correctamente
 */
export function setUserId(userId) {
  state.userId = userId;
  return Boolean(userId);
}

/**
 * Establece el estado del panel matemático
 * @param {boolean} isOpen - Estado del panel (abierto/cerrado)
 * @returns {boolean} El nuevo estado del panel
 */
export function setMathPanelState(isOpen) {
  state.isMathPanelOpen = Boolean(isOpen);
  return state.isMathPanelOpen;
}

/**
 * Alterna el estado del panel matemático
 * @returns {boolean} Nuevo estado del panel
 */
export function toggleMathPanel() {
  state.isMathPanelOpen = !state.isMathPanelOpen;
  return state.isMathPanelOpen;
}

/**
 * Añade una expresión matemática al historial
 * @param {string} expression - Expresión matemática en LaTeX
 * @param {boolean} isFavorite - Indica si debe marcarse como favorita
 * @returns {boolean} true si se añadió correctamente
 */
export function addMathExpression(expression, isFavorite = false) {
  if (!expression || typeof expression !== 'string') return false;
  
  // Evitar duplicados, mover al principio si ya existe
  const index = state.mathHistory.indexOf(expression);
  if (index !== -1) {
    state.mathHistory.splice(index, 1);
  }
  
  // Añadir al principio del historial
  state.mathHistory.unshift(expression);
  
  // Limitar el tamaño del historial
  if (state.mathHistory.length > 50) {
    state.mathHistory.pop();
  }
  
  // Manejar favoritos si es necesario
  if (isFavorite && !state.preferences.favorites.includes(expression)) {
    state.preferences.favorites.push(expression);
  }
  
  return true;
}

/**
 * Obtiene el historial de expresiones matemáticas
 * @param {number} limit - Número máximo de expresiones a devolver
 * @returns {Array} Historial de expresiones
 */
export function getMathHistory(limit = 10) {
  return state.mathHistory.slice(0, limit);
}

/**
 * Establece una preferencia del usuario
 * @param {string} key - Clave de la preferencia
 * @param {any} value - Valor de la preferencia
 * @returns {boolean} true si se estableció correctamente
 */
export function setPreference(key, value) {
  if (!key || typeof key !== 'string') return false;
  
  if (key in state.preferences) {
    state.preferences[key] = value;
    return true;
  }
  return false;
}

/**
 * Obtiene el estado completo (para debugging)
 * @returns {Object} Estado completo (con Map convertido a objeto para serialización)
 */
export function getFullState() {
  return { 
    ...state, 
    chats: Object.fromEntries(state.chats) 
  };
}

export default {
  initializeState,
  updateState,
  getState,
  registerChat,
  removeChat,
  setCurrentChat,
  setProcessingState,
  setUserId,
  getAvaId,
  setMathPanelState,
  toggleMathPanel,
  addMathExpression,
  getMathHistory,
  setPreference,
  getFullState
};