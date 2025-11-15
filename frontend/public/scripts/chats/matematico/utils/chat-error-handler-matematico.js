/**
 * chat-error-handler.js - Componente para manejar errores en chats
 * 
 * Este módulo proporciona funciones para manejar chats "fantasma" o con problemas
 * de acceso en la base de datos.
 */

import { getState } from '../core/state-matematico.js';
import { validateUUID } from '../../shared/validators.js';
import { handleNewChat } from '../core/chat-controller-matematico.js';
import { deleteChat } from '../api/chat-matematico.js';
import { 
  removeAllEvents, 
  setManagedTimeout, 
  clearManagedTimeouts,
  removeClass,
} from '../../shared/dom-helpers.js';

// Prefijos para identificar timeouts
const TIMEOUT_MODAL_CLOSE = 'modal_close_';
const TIMEOUT_CLEANUP_DIALOG = 'cleanup_dialog_';

// Lista de IDs de chats con problemas 
export const problematicChatIds = new Set();

/**
 * Guarda chats problemáticos en localStorage de forma segura
 * @param {Set<string>} chatIds - Conjunto de IDs de chats problemáticos
 */
function saveProblematicChatsToStorage(chatIds) {
  try {
    localStorage.setItem('problematicChats', JSON.stringify([...chatIds]));
  } catch (e) {
    // Error silencioso en producción
  }
}

/**
 * Realiza una limpieza completa de todos los chats problemáticos
 * Esta función se llama durante la inicialización y periódicamente
 * @param {boolean} silent - Si es true, no muestra notificaciones de éxito
 * @returns {Promise<number>} - Número de chats procesados
 */
export async function cleanupAllProblematicChats(silent = false) {
  try {
    // Primero cargar los chats problemáticos del almacenamiento
    loadProblematicChats();
    
    // Si no hay chats problemáticos, terminar
    if (problematicChatIds.size === 0) {
      return 0;
    }
    
    console.log(`Iniciando limpieza de ${problematicChatIds.size} chats problemáticos`);
    
    // Hacer una copia de los IDs para iterar (ya que vamos a modificar el Set original)
    const chatIdsToProcess = [...problematicChatIds];
    let processedCount = 0;
    
    for (const chatId of chatIdsToProcess) {
      try {
        await removeProblematicChat(chatId);
        processedCount++;
      } catch (error) {
        console.warn(`Error al procesar chat problemático ${chatId}, eliminando de la lista:`, error);
        // A pesar del error, eliminar de la lista de problemáticos para evitar intentos futuros
        problematicChatIds.delete(chatId);
      }
      
      // Pequeña pausa entre operaciones para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    saveProblematicChatsToStorage(problematicChatIds);
    
    if (processedCount > 0 && !silent) {
      if (typeof window.acadelExito === 'function') {
        window.acadelExito(
          "🧹 Mantenimiento completado", 
          `Acadel limpió ${processedCount} chat${processedCount > 1 ? 's' : ''} problemático${processedCount > 1 ? 's' : ''} automáticamente. ¡Tu academia está perfecta!`
        );
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error durante la limpieza de chats problemáticos:', error);
    return 0;
  }
}

/**
 * Marca un chat como problemático
 * @param {string} chatId - ID del chat problemático
 */
export function markChatAsProblem(chatId) {
  if (!validateUUID(chatId)) return;
  
  problematicChatIds.add(chatId);
  
  try {
    const storedProblems = new Set(JSON.parse(localStorage.getItem('problematicChats') || '[]'));
    storedProblems.add(chatId);
    localStorage.setItem('problematicChats', JSON.stringify([...storedProblems]));
    
    // Forzar actualización del sidebar si está disponible
    import('../ui/sidebar-matematico.js').then(module => {
      if (typeof module.removeChatFromSidebar === 'function') {
        module.removeChatFromSidebar(chatId);
      }
      
      import('../api/chat-matematico.js').then(chatModule => {
        if (typeof chatModule.loadChatHistory === 'function') {
          chatModule.loadChatHistory().then(updatedChats => {
            if (typeof module.renderChatHistory === 'function') {
              module.renderChatHistory(updatedChats);
            }
          }).catch(e => console.warn('Error al recargar historial:', e));
        }
      }).catch(e => console.warn('Error al importar módulo de chat:', e));
    }).catch(e => console.warn('Error al importar módulo sidebar:', e));
  } catch (e) {
    console.warn('Error al guardar chat problemático:', e);
  }
}

/**
 * Verifica si un chat ha sido marcado como problemático
 * @param {string} chatId - ID del chat a verificar
 * @returns {boolean} true si el chat es problemático
 */
export function isChatProblematic(chatId) {
  return problematicChatIds.has(chatId);
}

/**
 * Carga la lista de chats problemáticos desde localStorage
 */
export function loadProblematicChats() {
  try {
    const storedProblems = JSON.parse(localStorage.getItem('problematicChats') || '[]');
    
    problematicChatIds.clear();
    
    storedProblems.forEach(chatId => {
      if (validateUUID(chatId)) {
        problematicChatIds.add(chatId);
      }
    });
    
    localStorage.setItem('problematicChats', JSON.stringify([...problematicChatIds]));
    
    return problematicChatIds.size;
  } catch (e) {
    console.warn('Error al cargar chats problemáticos:', e);
    return 0;
  }
}

/**
 * Cierra modales activos de forma segura
 * @returns {Promise<void>} Promesa que se resuelve cuando los modales se han cerrado
 */
function closeActiveModals() {
  return new Promise(resolve => {
    const activeModals = document.querySelectorAll('.modal, .custom-modal, .modal-backdrop, .empty-chat-modal');
    
    if (activeModals.length === 0) {
      return resolve();
    }
    
    activeModals.forEach(modal => {
      const closeButtons = modal.querySelectorAll('.close-modal, .modal-close, #emptyModalClose, .btn-close, .close');
      
      let closed = false;
      if (closeButtons.length > 0) {
        closeButtons[0].click();
        closed = true;
      }
      
      // Si no hay botones, eliminar manualmente
      if (!closed) {
        removeClass(modal, 'show');
        removeClass(modal, 'fade');
        removeClass(modal, 'in');
        modal.style.display = 'none';
        
        const modalId = modal.id || `modal_${Math.random().toString(36).substring(2, 9)}`;
        setManagedTimeout(() => {
          if (modal.parentNode) {
            removeAllEvents(modal);
            modal.parentNode.removeChild(modal);
          }
        }, 100, `${TIMEOUT_MODAL_CLOSE}${modalId}`);
      }
    });
    
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    
    // Dar tiempo para que se completen las animaciones
    setManagedTimeout(resolve, 150, TIMEOUT_MODAL_CLOSE);
  });
}

/**
 * Función para limpiar un chat problemático de la UI y la BD
 * @param {string} chatId - ID del chat a limpiar
 * @returns {Promise<boolean>} - true si se limpió correctamente
 */
/**
 * Función para limpiar un chat problemático de la UI y la BD
 * @param {string} chatId - ID del chat a limpiar
 * @returns {Promise<boolean>} - true si se limpió correctamente
 */
export async function removeProblematicChat(chatId) {
  if (!validateUUID(chatId)) return false;
  
  try {
    // 1. Intentar eliminar de la BD primero
    try {
      await deleteChat(chatId, true); // forceDelete=true
    } catch (dbError) {
      console.warn(`Error al eliminar chat ${chatId} del servidor:`, dbError.message);
    }
    
    // 2. Eliminar del DOM (UI) - Método mejorado
    removeChatFromDOM(chatId);
    
    // 3. Eliminar de la lista de problemáticos
    problematicChatIds.delete(chatId);
    
    // 4. Actualizar localStorage con implementación más robusta
    try {
      const storedProblems = new Set(JSON.parse(localStorage.getItem('problematicChats') || '[]'));
      storedProblems.delete(chatId);
      localStorage.setItem('problematicChats', JSON.stringify([...storedProblems]));
    } catch (storageError) {
      // Reintentar con otra aproximación si falla
      try {
        localStorage.setItem('problematicChats', JSON.stringify([...problematicChatIds]));
      } catch (e) {
        // Error silencioso final
      }
    }
    
    return true;
  } catch (e) {
    console.warn('Error general al eliminar chat problemático:', e);
    
    // A pesar del error, eliminamos el chat de la lista de problemáticos
    problematicChatIds.delete(chatId);
    try {
      localStorage.setItem('problematicChats', JSON.stringify([...problematicChatIds]));
    } catch (e) {
      // Error silencioso
    }
    
    return false;
  }
}

/**
 * Función auxiliar para remover un chat del DOM de forma segura
 * Versión corregida que evita el problema de sanitización en selectores CSS
 */
function removeChatFromDOM(chatId) {
  if (!validateUUID(chatId)) return; // Validación adicional
  
  // Método 1: Usando selectores DOM directos (CORREGIDO)
  try {
    // No usar sanitizeText aquí, ya que convierte las comillas en entidades HTML
    // que no funcionan en selectores CSS
    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (chatItem) {
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(chatItem);
      }
      
      chatItem.style.opacity = '0.5';
      chatItem.style.transition = 'opacity 0.2s ease-out';
      
      setTimeout(() => {
        if (chatItem && chatItem.parentNode) {
          chatItem.remove();
        }
      }, 200);
    }
  } catch (e) {
    console.warn('Error al remover chat del DOM:', e);
    
    try {
      const items = document.querySelectorAll('.sidebar-item');
      for (const item of items) {
        const itemChatId = item.getAttribute('data-chat-id');
        if (itemChatId === chatId) {
          if (typeof removeAllEvents === 'function') {
            removeAllEvents(item);
          }
          item.remove();
          break;
        }
      }
    } catch (fallbackError) {
      console.warn('Error en fallback de eliminación DOM:', fallbackError);
    }
  }
  
  // Método 2: Usando la función especializada del sidebar como respaldo
  try {
    import('../ui/sidebar-matematico.js').then(module => {
      if (typeof module.removeChatFromSidebar === 'function') {
        module.removeChatFromSidebar(chatId);
      }
    }).catch(e => {
      console.warn('Error al importar sidebar:', e);
    });
  } catch (e) {
    console.warn('Error al importar módulo para eliminar chat:', e);
  }
}


/**
 * Muestra un diálogo para eliminar un chat problemático
 * con cierre explícito de modales existentes
 * @param {string} chatId - ID del chat problemático
 */
export async function showCleanupDialog(chatId) {
  if (!validateUUID(chatId)) return;
  
  // Paso 1: Cerrar modales existentes
  await closeActiveModals();
  
  // Paso 2: Mostrar el diálogo de confirmación
  try {
    const { showConfirmation } = await import('../ui/ui-manager-matematico.js');
    
    if (typeof showConfirmation === 'function') {
      showConfirmation(
        '🔧 Chat problemático detectado',
        'Acadel encontró un chat corrupto. ¿Le damos sepultura académica digna?',
        () => {
          removeProblematicChat(chatId).then(success => {
            // Si era el chat actual, crear uno nuevo
            if (getState('currentChatId') === chatId) {
              handleNewChat();
            }
            
            if (success) {
            window.acadelExito("¡Chat eliminado! 🗑️", "Acadel mantuvo todo ordenado en tu espacio académico");            }
          });
        },
        () => {
          // Si era el chat actual, crear uno nuevo incluso si se cancela
          if (getState('currentChatId') === chatId) {
            handleNewChat();
          }
        }
      );
    } else {
      if (confirm('Este chat tiene problemas técnicos. ¿Quieres que Acadel lo elimine por ti?')) {
        removeProblematicChat(chatId).then(success => {
          if (getState('currentChatId') === chatId) {
            handleNewChat();
          }
        });
      } else {
        // Incluso si cancela, crear un nuevo chat si era el actual
        if (getState('currentChatId') === chatId) {
          handleNewChat();
        }
      }
    }
  } catch (error) {
    // Si falla la importación, usar confirm nativo
    if (confirm('Este chat parece estar corrupto o inaccesible. ¿Deseas eliminarlo de la lista?')) {
      removeProblematicChat(chatId).then(success => {
        if (getState('currentChatId') === chatId) {
          handleNewChat();
        }
      });
    } else if (getState('currentChatId') === chatId) {
      handleNewChat();
    }
  }
}

/**
 * Maneja errores específicos al interactuar con un chat
 * @param {string} chatId - ID del chat
 * @param {Error} error - Error ocurrido
 * @param {string} action - Acción que se estaba realizando
 */
export async function handleChatError(chatId, error, action = 'acceso') {
  if (!validateUUID(chatId)) return;
  
  const errorMsg = error?.message || '';
  const isCriticalError = errorMsg.includes('no encontrado') || 
                         errorMsg.includes('no autorizado') ||
                         errorMsg.includes('timeout') ||
                         errorMsg.includes('acceso');
  
  if (isCriticalError) {
  acadelWarning("⚠️ Chat inaccesible", "Acadel no puede abrir este chat. Lo marcaremos para revisión");
  markChatAsProblem(chatId);
    
    // Si es el chat actual, mostrar diálogo de limpieza
    if (getState('currentChatId') === chatId) {
      await closeActiveModals();
      
      const timeoutKey = `${TIMEOUT_CLEANUP_DIALOG}${chatId}`;
      clearManagedTimeouts(timeoutKey); // Limpiar timeouts previos con la misma clave
      
      setManagedTimeout(() => {
        showCleanupDialog(chatId);
      }, 150, timeoutKey);
    }
  }
}

/**
 * Intento seguro de interacción con chat, con manejo de errores integrado
 * @param {string} chatId - ID del chat
 * @param {Function} action - Función a ejecutar
 * @param {string} actionName - Nombre de la acción (para logs)
 * @returns {Promise} Resultado de la acción
 */
export async function safeChatAction(chatId, action, actionName = 'operación') {
  if (!validateUUID(chatId)) {
    return Promise.reject(new Error('ID de chat inválido'));
  }
  
  // Si ya sabemos que el chat es problemático, mostrar diálogo inmediatamente
  if (isChatProblematic(chatId)) {
    await closeActiveModals();
    
    const timeoutKey = `${TIMEOUT_CLEANUP_DIALOG}${chatId}`;
    setManagedTimeout(() => {
      showCleanupDialog(chatId);
    }, 150, timeoutKey);
    
    return Promise.reject(new Error('Chat inaccesible'));
  }
  
  try {
    return await action();
  } catch (error) {
    handleChatError(chatId, error, actionName);
    return Promise.reject(error);
  }
}

loadProblematicChats();

export default {
  markChatAsProblem,
  isChatProblematic,
  removeProblematicChat,
  showCleanupDialog,
  handleChatError,
  safeChatAction
};