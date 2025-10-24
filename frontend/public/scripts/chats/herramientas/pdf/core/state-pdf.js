/**
 * state.js - Módulo para gestionar el estado global de la aplicación
 */

// Estado global de la aplicación
const state = {
  userId: null,
  herramientaId: 1, // ID específico para la herramienta de PDF
  currentChatId: null,
  isProcessing: false,
  chats: new Map()
};

/**
 * Actualiza una propiedad del estado
 * @param {string} property - Propiedad a actualizar
 * @param {any} value - Nuevo valor
 * @returns {boolean} true si se actualizó correctamente, false si no existe la propiedad
 */
export function updateState(property, value) {
  if (property in state) {
    state[property] = value;
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
  
  // Soporte para notación de punto (ej: "chats.123abc")
  if (property.includes('.')) {
    const [mainProp, subProp] = property.split('.');
    if (mainProp === 'chats' && state.chats instanceof Map) {
      return state.chats.get(subProp);
    }
    // Para otras propiedades anidadas en el futuro
    return state[mainProp]?.[subProp];
  }
  
  return state[property];
}

/**
 * Registra un chat en el mapa de chats
 * @param {string} chatId - ID del chat
 * @param {Object} chatData - Datos del chat
 */
export function registerChat(chatId, chatData) {
  state.chats.set(chatId, chatData);
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
 */
export function setCurrentChat(chatId) {
  state.currentChatId = chatId;
}

/**
 * Establece el estado de procesamiento
 * @param {boolean} isProcessing - Estado de procesamiento
 */
export function setProcessingState(isProcessing) {
  state.isProcessing = Boolean(isProcessing);
}

/**
 * Establece el ID de usuario
 * @param {string} userId - ID de usuario
 */
export function setUserId(userId) {
  state.userId = userId;
}

/**
 * Obtiene el estado completo (para debugging)
 * @returns {Object} Estado completo
 */
export function getFullState() {
  return { 
    ...state, 
    chats: Object.fromEntries(state.chats) 
  };
}

export default {
  updateState,
  getState,
  registerChat,
  removeChat,
  setCurrentChat,
  setProcessingState,
  setUserId,
  getFullState
};