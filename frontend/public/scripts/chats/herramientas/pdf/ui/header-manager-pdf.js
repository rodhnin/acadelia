/**
 * header-manager.js - Gestión del header y sus funcionalidades
 * Versión optimizada con mejor seguridad y rendimiento
 */

import { getState } from '../core/state-pdf.js';
import { updateChatTitle } from '../api/chat-pdf.js';
import { handleNewChat, handleDeleteChat } from '../core/chat-controller-pdf.js';
import { validateUUID } from '../../../shared/validators.js';
import {
  addClass,
  removeClass,
  toggleClass,
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts,
  sanitizeText,
  setAttribute,
  getAttribute,
  removeAttribute,
} from '../../../shared/dom-helpers.js';

// Configuración para el truncado de títulos
const TITLE_MAX_LENGTH = 25;

// Control de inicialización
let isInitialized = false;

const elements = {
  actionButton: null,
  dropdownContent: null,
  headerSubtitle: null,
  newChatButton: null,
  renameOption: null,
  deleteOption: null
};

/**
 * Inicializa los eventos y funcionalidades del header
 */
export function setupHeaderEventListeners() {
  // Evitar inicializaciones múltiples
  if (isInitialized) return;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHeaderComponents);
  } else {
    initializeHeaderComponents();
  }
  
  const currentChatId = getState('currentChatId');
  if (currentChatId && validateUUID(currentChatId)) {
    updateHeaderForChat(currentChatId, true);
  }
}

/**
 * Inicializa todos los componentes del header una vez que el DOM está cargado
 */
function initializeHeaderComponents() {
  // Evitar inicialización múltiple
  if (isInitialized) return;
  
  cacheElements();
  
  if (elements.actionButton && elements.dropdownContent) {
    setupDropdownMenu();
  }
  
  if (elements.newChatButton) {
    setupNewChatButton();
  }
  
  if (elements.renameOption) {
    setupRenameOption();
  }
  
  if (elements.deleteOption) {
    setupDeleteOption();
  }
  
  isInitialized = true;
}

/**
 * Cachea elementos DOM para evitar consultas repetitivas
 */
function cacheElements() {
  elements.actionButton = document.querySelector('.action-button');
  elements.dropdownContent = document.querySelector('.dropdown-content');
  elements.headerSubtitle = document.querySelector('.header-subtitle');
  elements.newChatButton = document.getElementById('new-chat-btn');
  elements.renameOption = document.querySelector('.dropdown-item:nth-child(1)');
  elements.deleteOption = document.querySelector('.dropdown-item:nth-child(2)');
}

/**
 * Configura el comportamiento del menú desplegable
 */
function setupDropdownMenu() {
  const { actionButton, dropdownContent } = elements;
  
  if (getAttribute(actionButton, 'data-event-configured')) return;
  
  addEvent(actionButton, 'click', function(e) {
    e.stopPropagation();
    toggleClass(dropdownContent, 'show');
  });
  
  setAttribute(actionButton, 'data-event-configured', 'true');
  
  if (!getAttribute(document.documentElement, 'data-dropdown-listener')) {
    addEvent(document, 'click', function(e) {
      if (!actionButton.contains(e.target)) {
        removeClass(dropdownContent, 'show');
      }
    });
    setAttribute(document.documentElement, 'data-dropdown-listener', 'true');
  }
  
  // Prevenir que los clicks dentro del dropdown lo cierren
  addEvent(dropdownContent, 'click', e => e.stopPropagation());
}

/**
 * Configura el botón de nuevo chat
 */
function setupNewChatButton() {
  const { newChatButton, dropdownContent } = elements;
  
  // Evitar duplicación de eventos
  if (getAttribute(newChatButton, 'data-event-configured')) return;
  
  addEvent(newChatButton, 'click', function() {
    if (dropdownContent) removeClass(dropdownContent, 'show');
    
    // Reutilizar la función existente de handleNewChat
    handleNewChat();
    
    updateHeaderSubtitle(null);
  });
  
  setAttribute(newChatButton, 'data-event-configured', 'true');
}

/**
 * Configura la opción de renombrar chat
 */
function setupRenameOption() {
  const { renameOption, dropdownContent } = elements;
  
  // Evitar duplicación de eventos
  if (getAttribute(renameOption, 'data-event-configured')) return;
  
  addEvent(renameOption, 'click', function() {
    const currentChatId = getState('currentChatId');
    
    if (!currentChatId || !validateUUID(currentChatId)) {
      acadelWarning("📝 ¡Nada que renombrar!", "Acadel nota que no hay ningún chat seleccionado");
      return;
    }
    
    if (dropdownContent) removeClass(dropdownContent, 'show');
    
    enableTitleEditing(currentChatId);
  });
  
  setAttribute(renameOption, 'data-event-configured', 'true');
}

/**
 * Activa el modo de edición inline para el título del chat
 * @param {string} chatId - ID del chat a renombrar
 */
function enableTitleEditing(chatId) {
  const headerSubtitle = elements.headerSubtitle;
  
  if (!headerSubtitle) return;
  
  const currentTitle = headerSubtitle.textContent;
  setAttribute(headerSubtitle, 'data-original-title', currentTitle);
  setAttribute(headerSubtitle, 'data-chat-id', chatId);
  
  addClass(headerSubtitle, 'editing');
  headerSubtitle.contentEditable = true;
  
  // Enfocar y seleccionar todo el texto usando la API moderna
  headerSubtitle.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(headerSubtitle);
  selection.removeAllRanges();
  selection.addRange(range);
  
  removeEvent(headerSubtitle, 'keydown', handleTitleKeydown);
  removeEvent(headerSubtitle, 'blur', saveTitleChanges);
  
  addEvent(headerSubtitle, 'keydown', handleTitleKeydown);
  addEvent(headerSubtitle, 'blur', saveTitleChanges);
}

/**
 * Maneja las pulsaciones de teclas durante la edición del título
 * @param {KeyboardEvent} event - Evento de teclado
 */
function handleTitleKeydown(event) {
  // Si se presiona Enter, guardar cambios
  if (event.key === 'Enter') {
    event.preventDefault();
    saveTitleChanges();
    return;
  }
  
  // Si se presiona Escape, cancelar la edición
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelTitleEditing();
    return;
  }
}

/**
 * Cancela la edición del título y restaura el valor original
 */
function cancelTitleEditing() {
  const headerSubtitle = elements.headerSubtitle;
  
  if (!headerSubtitle) return;
  
  const originalTitle = getAttribute(headerSubtitle, 'data-original-title');
  headerSubtitle.textContent = originalTitle;
  
  removeAttribute(headerSubtitle, 'data-original-title');
  headerSubtitle.contentEditable = false;
  removeClass(headerSubtitle, 'editing');
  
  removeEvent(headerSubtitle, 'keydown', handleTitleKeydown);
  removeEvent(headerSubtitle, 'blur', saveTitleChanges);
}

/**
 * Guarda los cambios del título del chat
 */
async function saveTitleChanges() {
  const headerSubtitle = elements.headerSubtitle;
  
  if (!headerSubtitle) return;
  
  let newTitle = headerSubtitle.textContent.trim();
  const chatId = getAttribute(headerSubtitle, 'data-chat-id');
  
  const displayTitle = newTitle; // Este es el título sin sanitizar para mostrar
  
  newTitle = sanitizeText(newTitle);
  
  headerSubtitle.contentEditable = false;
  removeClass(headerSubtitle, 'editing');
  
  removeEvent(headerSubtitle, 'keydown', handleTitleKeydown);
  removeEvent(headerSubtitle, 'blur', saveTitleChanges);
  
  // Si no hay título o no hay ID de chat, restaurar el título original
  if (!newTitle || !chatId) {
    cancelTitleEditing();
    return;
  }
  
  const originalTitle = getAttribute(headerSubtitle, 'data-original-title');
  headerSubtitle.textContent = 'Guardando...';
  
  try {
    const result = await updateChatTitle(chatId, newTitle);
    
    if (result) {
      acadelExito("✏️ ¡Título perfecto!", `Acadel cambió el nombre a: "${displayTitle}"`);
      
      updateHeaderSubtitle(newTitle);
      
      const chatItem = document.querySelector(`[data-chat-id="${chatId}"] .chat-title`);
      if (chatItem) {
        // Preservar el icono al actualizar el título
        const icon = '<i class="bx bx-message-square-dots"></i>';
        
        let displayTitle = newTitle;
        if (newTitle.length > TITLE_MAX_LENGTH) {
          displayTitle = newTitle.substring(0, TITLE_MAX_LENGTH) + '...';
        }
        
        const safeHTMLContent = `${icon} ${sanitizeText(displayTitle)}`;
        chatItem.innerHTML = safeHTMLContent;
        setAttribute(chatItem, 'title', newTitle);
      }
      
      // ELIMINADO: El bloque que recargaba todo el historial de chats
      // Esta parte causaba la duplicación y los problemas
    } else {
      // Si hubo un error, restaurar el título original
      headerSubtitle.textContent = originalTitle;
      acadelError("✏️ ¡No pude cambiar el título!", "Acadel tuvo problemas guardando el nuevo nombre");
    }
  } catch (error) {
    headerSubtitle.textContent = originalTitle;
    acadelError("✏️ ¡Algo salió mal!", "Acadel no pudo guardar el título, pero no te preocupes");
  } finally {
    removeAttribute(headerSubtitle, 'data-original-title');
  }
}

/**
 * Configuración mejorada para la opción de eliminar chat con verificación de modal abierta
 */
function setupDeleteOption() {
  const { deleteOption, dropdownContent } = elements;
  
  // Evitar duplicación de eventos
  if (getAttribute(deleteOption, 'data-event-configured')) return;
  
  addEvent(deleteOption, 'click', async function() {
    const currentChatId = getState('currentChatId');
    
    if (!currentChatId || !validateUUID(currentChatId)) {
      acadelWarning("🗑️ ¡Nada que eliminar!", "Acadel no ve ningún chat activo para borrar");
      return;
    }
    
    if (dropdownContent) removeClass(dropdownContent, 'show');
    
    // MEJORA: Verificar si ya hay una modal abierta antes de llamar a handleDeleteChat
    try {
      const modalsModule = await import('./modals-pdf.js');
      if (modalsModule.isAnyModalOpen && modalsModule.isAnyModalOpen()) {
        console.warn('Ya hay una modal abierta. No se mostrará la confirmación para eliminar chat.');
        return;
      }
    } catch (error) {
      console.warn('No se pudo verificar el estado de la modal:', error);
    }
    
    handleDeleteChat(currentChatId);
  });
  
  setAttribute(deleteOption, 'data-event-configured', 'true');
}

/**
 * Trunca un título si excede la longitud máxima
 * @param {string} title - Título original
 * @returns {string} Título truncado si es necesario
 */
function truncateTitle(title) {
  if (!title) return '';
  
  title = sanitizeText(title);
  
  // Si el título es más largo que el máximo, truncarlo y añadir "..."
  if (title.length > TITLE_MAX_LENGTH) {
    return title.substring(0, TITLE_MAX_LENGTH) + '...';
  }
  
  return title;
}

/**
 * Actualiza solo el subtítulo en el header con el nombre del chat
 * @param {string} chatTitle - Título del chat a mostrar en el subtítulo
 */
export function updateHeaderSubtitle(chatTitle) {
  // Asegurarse de que tenemos acceso al elemento
  const headerSubtitle = elements.headerSubtitle || document.querySelector('.header-subtitle');
  
  if (!headerSubtitle) return;
  
  if (!chatTitle) {
    // Valor por defecto si no hay título de chat
    headerSubtitle.textContent = 'Asistente virtual académico';
    removeAttribute(headerSubtitle, 'title');
  } else {
    const safeTitle = sanitizeText(chatTitle);
    const truncatedTitle = truncateTitle(safeTitle);
    
    headerSubtitle.textContent = truncatedTitle;
    
    setAttribute(headerSubtitle, 'title', safeTitle);
  }
}

/**
 * Actualiza el subtítulo del header cuando se cambia de chat
 * @param {string} chatId - ID del chat activo
 * @param {boolean} silentErrors - Si es true, no mostrará errores
 */
export async function updateHeaderForChat(chatId, silentErrors = false) {
  try {
    const uiModule = await import('./ui-manager-pdf.js');
    if (typeof uiModule.applyHeaderSkeleton === 'function') {
      uiModule.applyHeaderSkeleton();
    }
    
    const cleanupSkeleton = () => {
      if (typeof uiModule.removeHeaderSkeleton === 'function') {
        setManagedTimeout(() => uiModule.removeHeaderSkeleton(), 300, 'header-skeleton-cleanup');
      }
    };
    
    // Si no hay chat válido, mostrar valor por defecto
    if (!chatId || !validateUUID(chatId)) {
      updateHeaderSubtitle(null);
      cleanupSkeleton();
      return;
    }
    
    const chatFromState = getState(`chats.${chatId}`);
    if (chatFromState && chatFromState.title) {
      updateHeaderSubtitle(chatFromState.title);
      cleanupSkeleton();
      return;
    }
    
    try {
      const chatModule = await import('../api/chat-pdf.js');
      if (typeof chatModule.loadChatHistory === 'function') {
        const chats = await chatModule.loadChatHistory();
        const chat = chats.allChats?.find(c => c.id === chatId);
        
        if (chat && chat.title) {
          updateHeaderSubtitle(chat.title);
        } else {
          updateHeaderSubtitle('Nuevo chat');
        }
      } else {
        updateHeaderSubtitle('Nuevo chat');
      }
    } catch (error) {
      updateHeaderSubtitle('Nuevo chat');
    } finally {
      setManagedTimeout(cleanupSkeleton, 500, 'header-skeleton-final-cleanup');
    }
  } catch (error) {
    // Si falla la importación, continuar con la funcionalidad básica
    if (!chatId || !validateUUID(chatId)) {
      updateHeaderSubtitle(null);
      return;
    }
    
    const chatFromState = getState(`chats.${chatId}`);
    if (chatFromState && chatFromState.title) {
      updateHeaderSubtitle(chatFromState.title);
    } else {
      updateHeaderSubtitle('Nuevo chat');
    }
  }
}

// Asegurar limpieza de timeouts antes de descargar la página
window.addEventListener('beforeunload', clearManagedTimeouts);

export default {
  setupHeaderEventListeners,
  updateHeaderForChat,
  updateHeaderSubtitle,
  enableTitleEditing
};

setupHeaderEventListeners();