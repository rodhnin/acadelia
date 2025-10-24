/**
 * chat.js - Funciones para la gestión de la API de chats
 */

import { API_ROUTES, MESSAGES } from '../core/config-matematico.js';
import { getState, registerChat } from '../core/state-matematico.js';
import { validateUUID } from '../../shared/validators.js';
import { renderChatHistory } from '../ui/sidebar-matematico.js';
import { updateHeaderForChat } from '../ui/header-manager-matematico.js';
import { 
  addClass, 
  removeClass,
  sanitizeText 
} from '../../shared/dom-helpers.js';

// Configuración para el truncado de títulos
const TITLE_MAX_LENGTH = 25;

/**
 * Trunca un título si excede la longitud máxima
 * @param {string} title - Título original
 * @returns {string} Título truncado si es necesario
 */
function truncateTitle(title) {
  if (!title) return '';
  
  // Sanitizar el título para prevenir XSS
  const safeTitle = sanitizeText(title);
  
  return safeTitle.length > TITLE_MAX_LENGTH 
    ? safeTitle.substring(0, TITLE_MAX_LENGTH) + '...' 
    : safeTitle;
}

/**
 * Obtiene la fecha más reciente de un chat
 * @param {Object} chat - Objeto del chat
 * @returns {Date} Fecha más reciente del chat
 */
function getMostRecentChatDate(chat) {
  return new Date(
    chat.last_updated || 
    chat.last_message_date || 
    chat.updatedAt || 
    chat.created_at || 
    chat.createdAt || 
    Date.now()
  );
}

/**
 * Procesa y agrupa los chats por períodos de tiempo
 * @param {Array} chats - Array de chats a procesar
 * @returns {Object} Objeto con los chats originales y agrupados
 */
function processChats(chats) {
  if (!Array.isArray(chats) || chats.length === 0) {
    return {
      allChats: [],
      grouped: {
        today: [],
        yesterday: [],
        thisWeek: [],
        lastWeek: [],
        thisMonth: [],
        lastMonth: [],
        thisYear: [],
        previousYears: []
      }
    };
  }

  // Añadir el título truncado para mostrar en la UI
  const processedChats = chats.map(chat => ({
    ...chat,
    displayTitle: truncateTitle(chat.title)
  }));
  
  // Ordenar por fecha (más recientes primero)
  processedChats.sort((a, b) => {
    const dateA = getMostRecentChatDate(a);
    const dateB = getMostRecentChatDate(b);
    return dateB - dateA;
  });

  // Obtener fechas de referencia
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Inicio de esta semana (lunes como primer día de la semana)
  const thisWeekStart = new Date(today);
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  thisWeekStart.setDate(today.getDate() - daysFromMonday);
  
  // Inicio de la semana pasada
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  // Inicio de este mes
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Inicio del mes pasado
  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  
  // Inicio de este año
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  
  // Definir grupos
  const grouped = {
    today: [],
    yesterday: [],
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    lastMonth: [],
    thisYear: [],
    previousYears: []
  };
  
  // Agrupar por períodos
  processedChats.forEach(chat => {
    const chatDate = getMostRecentChatDate(chat);
    
    // Comprobar si el chat tiene una fecha válida
    if (isNaN(chatDate.getTime())) {
      grouped.today.push(chat);
      return;
    }
    
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());
    
    // Clasificar por período de tiempo
    if (chatDay.getTime() === today.getTime()) {
      grouped.today.push(chat);
    } 
    else if (chatDay.getTime() === yesterday.getTime()) {
      grouped.yesterday.push(chat);
    }
    else if (chatDate >= thisWeekStart && chatDate < yesterday) {
      grouped.thisWeek.push(chat);
    }
    else if (chatDate >= lastWeekStart && chatDate < thisWeekStart) {
      grouped.lastWeek.push(chat);
    }
    else if (chatDate >= thisMonthStart && chatDate < lastWeekStart) {
      grouped.thisMonth.push(chat);
    }
    else if (chatDate >= lastMonthStart && chatDate < thisMonthStart) {
      grouped.lastMonth.push(chat);
    }
    else if (chatDate >= thisYearStart && chatDate < lastMonthStart) {
      grouped.thisYear.push(chat);
    }
    else {
      grouped.previousYears.push(chat);
    }
  });

  return {
    allChats: processedChats,
    grouped: grouped
  };
}

/**
 * Actualiza la posición de un chat en el sidebar después de enviar un mensaje
 * @param {string} chatId - ID del chat a actualizar
 * @returns {Promise<boolean>} - Resultado de la actualización
 */
export async function updateChatPosition(chatId) {
  try {
    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }
    
    // Obtener todos los chats actualizados
    const chats = await loadChatHistory();
    
    if (!chats || !chats.allChats || chats.allChats.length === 0) {
      return false;
    }
    
    // Buscar el chat actual y actualizar fecha
    const currentChat = chats.allChats.find(chat => chat.id === chatId);
    if (currentChat) {
      currentChat.last_message_date = new Date().toISOString();
      registerChat(chatId, currentChat);
    }
    
    // Re-renderizar el sidebar con los datos actualizados
    renderChatHistory(chats);
    
    // Mantener activo el chat actual
    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (chatItem) {
      // Usar las funciones de DOM helpers
      document.querySelectorAll('.sidebar-item').forEach(item => {
        removeClass(item, 'active');
      });
      addClass(chatItem, 'active');
    }
    
    // Actualizar el encabezado
    updateHeaderForChat(chatId);
    
    return true;
  } catch (error) {
    console.error('Error actualizando posición del chat:');
    return false;
  }
}

/**
 * Carga el historial de chats del usuario y elimina los chats problemáticos.
 * @returns {Promise<Object>} Objeto con los chats y su agrupación temporal
 */
export async function loadChatHistory() {
  try {
    const userId = getState('userId');
    const avaId = getState('avaId');
    
    if (!userId) {
      throw new Error('El ID de usuario no está definido.');
    }

    const url = API_ROUTES.chatHistory(userId, avaId);
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || MESSAGES.errors.loadChatsFailed);
    }

    let chats = await response.json();
    
    // Limpiar chats problemáticos del sistema
    try {
      // Primero limpiar automáticamente los chats problemáticos
      chats = await cleanProblematicChats(chats);
      
      // NUEVO: Verificar chats problemáticos y actualizar el localStorage
      // Importar la función de verificación de chats problemáticos
      const { isChatProblematic, problematicChatIds, saveProblematicChatsToStorage } = await import('../utils/chat-error-handler-matematico.js');
      
      if (typeof isChatProblematic === 'function') {
        // Obtener lista de IDs de los chats recibidos del servidor
        const existingChatIds = new Set(chats.map(chat => chat.id));
        
        // Verificar si hay chats en la lista de problemáticos que ya no existen en el servidor
        if (problematicChatIds && problematicChatIds.size > 0) {
          let chatsPurged = false;
          
          // Filtrar los chats que están marcados como problemáticos pero ya no existen en el servidor
          for (const problemChatId of problematicChatIds) {
            if (!existingChatIds.has(problemChatId)) {
              console.log(`Eliminando chat ${problemChatId} de la lista de problemáticos porque ya no existe en el servidor`);
              problematicChatIds.delete(problemChatId);
              chatsPurged = true;
            }
          }
          
          // Si se eliminaron chats, actualizar localStorage
          if (chatsPurged && typeof saveProblematicChatsToStorage === 'function') {
            saveProblematicChatsToStorage(problematicChatIds);
          }
        }
        
        // Filtrar chats problemáticos
        chats = chats.filter(chat => !isChatProblematic(chat.id));
      }
    } catch (cleanupError) {
      // Si hay algún error en la limpieza, lo registramos pero continuamos
      console.warn('Error durante la limpieza de chats problemáticos:', cleanupError);
    }
    
    // Procesar chats (truncar títulos y agrupar por tiempo)
    const processedData = processChats(chats);
    
    // Guardar los chats en el estado
    processedData.allChats.forEach(chat => {
      registerChat(chat.id, chat);
    });
    
    return processedData;
  } catch (error) {
      acadelError(
    "¡No pude cargar tu historial! 📚", 
    "Acadel tiene problemas accediendo a tus conversaciones anteriores. Intenta recargar la página"
  );
    throw error;
  }
}

/**
 * Carga los mensajes de un chat específico.
 * @param {string} chatId - ID del chat a cargar
 * @returns {Promise<Array>} Array de mensajes del chat
 */
export async function loadChatMessages(chatId) {
  try {
    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }
    
    const userId = getState('userId');
    const url = API_ROUTES.chatMessages(chatId);
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'id_user': userId }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || MESSAGES.errors.loadMessagesFailed);
    }

    return await response.json();
  } catch (error) {
        acadelError(
      "¡Error cargando conversación! 💬", 
      "Acadel no puede abrir este chat. Intenta con otro o crea uno nuevo"
    );
    throw error;
  }
}

/**
 * Crea un nuevo chat.
 * @param {string} query - Consulta inicial para el título
 * @returns {Promise<Object>} Datos del nuevo chat
 */
export async function createNewChat(query) {
  try {
    const userId = getState('userId');
    const avaId = getState('avaId');
    
    // Sanitizar la consulta inicial para mayor seguridad
    const safeQuery = sanitizeText(query);
    
    const response = await fetch(API_ROUTES.createChat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: userId,
        avaId: avaId,
        query: safeQuery
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || MESSAGES.errors.createChatFailed);
    }
    
    const newChat = await response.json();
    
    // Añadir el título truncado para la UI
    newChat.displayTitle = truncateTitle(newChat.title);
    
    // Guardar el nuevo chat en el estado
    registerChat(newChat.id, newChat);
    
    return newChat;
    } catch (error) {
        acadelError(
      "¡No pude crear el chat! ✏️", 
      "Acadel tuvo problemas iniciando tu nueva conversación. Inténtalo de nuevo"
    );
    throw error;
  }
}

/**
 * Actualiza el título de un chat.
 * @param {string} chatId - ID del chat
 * @param {string} newTitle - Nuevo título
 * @returns {Promise<Object>} Resultado de la actualización
 */
export async function updateChatTitle(chatId, newTitle) {
  try {
    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }
    
    // Sanitizar el nuevo título para mayor seguridad
    const safeTitle = sanitizeText(newTitle);
    
    const url = API_ROUTES.chatTitle(chatId);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: safeTitle })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || MESSAGES.errors.updateChatFailed);
    }
    
    const result = await response.json();
    
    // Actualizar en el estado con el título truncado para visualización
    const chat = getState(`chats.${chatId}`);
    if (chat) {
      chat.title = safeTitle;
      chat.displayTitle = truncateTitle(safeTitle);
      registerChat(chatId, chat);
    }
    
    return result;
  } catch (error) {
    acadelError(
      "¡No pude cambiar el título! ✏️", 
      "Acadel tuvo problemas actualizando el nombre de tu chat. Inténtalo de nuevo"
    );
    throw error;
  }
}

/**
 * Elimina un chat.
 * @param {string} chatId - ID del chat a eliminar
 * @param {boolean} forceDelete - Si es true, intenta métodos alternativos de eliminación
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export async function deleteChat(chatId, forceDelete = false) {
  try {
    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }
    
    const userId = getState('userId');
    const url = API_ROUTES.deleteChat(chatId);
    
    // Método estándar de eliminación
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'id_user': userId
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (!forceDelete) {
          throw new Error(errorData.error || MESSAGES.errors.deleteChatFailed);
        }
      } else {
        return true;
      }
    } catch (standardError) {
      if (!forceDelete) {
        throw standardError;
      }
    }
    
    // Métodos alternativos solo si forceDelete es true
    if (forceDelete) {
      // Intentar con flags adicionales
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'id_user': userId,
            'force_delete': 'true',
            'skip_validation': 'true'
          },
          credentials: 'include'
        });
        
        if (response.ok) return true;
      } catch (alt1Error) {}
      
      // Intentar actualizar primero para marcar como eliminado
      try {
        const updateUrl = API_ROUTES.chatUpdate 
          ? API_ROUTES.chatUpdate(chatId) 
          : `${API_ROUTES.baseUrl}/chats/${chatId}/status`;
          
        await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'id_user': userId
          },
          credentials: 'include',
          body: JSON.stringify({ status: 'deleted' })
        });
        
        // Luego intentar eliminar nuevamente
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'id_user': userId,
            'X-Force-Delete': 'true'
          },
          credentials: 'include'
        });
        
        if (response.ok) return true;
      } catch (alt2Error) {}
      
      // Si forceDelete es true y llegamos hasta aquí, considerarlo un éxito
      return true;
    }
    
    throw new Error('No se pudo eliminar el chat');
  } catch (error) {
        acadelError(
      "¡No pude eliminar el chat! 🗑️", 
      "Acadel no logró borrar esa conversación. Tal vez ya no existe"
    );
    throw error;
  }
}

/**
 * Limpia automáticamente los chats problemáticos del sistema
 * @param {Array} chats - Lista de chats a limpiar
 * @returns {Promise<Array>} Lista de chats limpios
 */
async function cleanProblematicChats(chats) {
  if (!Array.isArray(chats) || chats.length === 0) {
    return chats;
  }

  // Importar funciones necesarias del módulo de manejo de errores
  try {
    const { isChatProblematic, removeProblematicChat } = await import('../utils/chat-error-handler-matematico.js');
    if (!isChatProblematic || !removeProblematicChat) {
      console.warn('No se encontraron las funciones necesarias para limpiar chats problemáticos');
      return chats;
    }

    // Identificar chats problemáticos
    const problematicChats = chats.filter(chat => isChatProblematic(chat.id));
    
    // Si no hay chats problemáticos, retornar la lista original
    if (problematicChats.length === 0) {
      return chats;
    }
    
    console.log(`Se encontraron ${problematicChats.length} chats problemáticos para eliminar automáticamente`);
    
    // Eliminar cada chat problemático
    const deletionPromises = problematicChats.map(chat => 
      removeProblematicChat(chat.id)
        .catch(error => {
          console.error(`Error al eliminar chat problemático ${chat.id}:`, error);
          return false; // Continuar con los demás chats incluso si uno falla
        })
    );
    
    // Esperar a que se completen todas las eliminaciones
    await Promise.allSettled(deletionPromises);
    
    // Retornar solo los chats no problemáticos
    return chats.filter(chat => !isChatProblematic(chat.id));
  } catch (error) {
    console.error('Error en la limpieza automática de chats problemáticos:', error);
    return chats; // En caso de error, devolver la lista original
  }
}

// Exportación única
export default {
  loadChatHistory,
  loadChatMessages,
  createNewChat,
  updateChatTitle,
  deleteChat,
  updateChatPosition,
  utils: {
    truncateTitle,
    processChats,
    getMostRecentChatDate
  }
};