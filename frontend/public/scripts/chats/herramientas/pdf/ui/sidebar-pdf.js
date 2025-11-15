/**
 * sidebar.js - Gestión del sidebar y sus elementos
 * Versión optimizada para rendimiento, seguridad y modularidad
 */

import { getElement } from './ui-manager-pdf.js';
import { createChatItem } from '../components/chat-item-pdf.js';
import { 
  createElement, 
  addClass, 
  removeClass, 
  toggleClass, 
  clearElement,
  addEvent,
  setManagedTimeout,
  clearManagedTimeouts,
  sanitizeText,
} from '../../../shared/dom-helpers.js';

const elements = {
  sidebar: null,
  chatList: null,
  mainContent: null,
  pinButton: null,
  unpinButton: null,
  sidebarToggle: null,
  accountItem: null,
  accountOptions: null,
  mobileToggle: null,
  overlay: null,
  attachBtn: null,
  attachmentOptions: null
};

// Estado de inicialización
let isInitialized = false;

/**
 * Cachea elementos DOM para evitar consultas repetitivas
 */
function cacheElements() {
  elements.sidebar = getElement('sidebar');
  elements.chatList = getElement('chatList');
  elements.mainContent = document.querySelector('.main-content');
  elements.pinButton = document.querySelector('.pin-button');
  elements.unpinButton = document.querySelector('.unpin-button');
  elements.sidebarToggle = document.querySelector('.toggle-button');
  elements.accountItem = document.getElementById('accountItem');
  elements.accountOptions = document.querySelector('.account-options');
  elements.mobileToggle = document.getElementById('mobile-sidebar-toggle');
  elements.overlay = document.getElementById('mobile-sidebar-overlay');
  elements.attachBtn = document.querySelector('.attach-btn');
  elements.attachmentOptions = document.querySelector('.attachment-options');
}

/**
 * Mejora de la función renderChatHistory para garantizar filtrado consistente de chats problemáticos
 * Este código reemplazaría la implementación actual en sidebar.js
 */
export function renderChatHistory(chats, performCleanup = true) {
  if (!elements.chatList) {
    elements.chatList = getElement('chatList');
    if (!elements.chatList) return;
  }
  
  // Preservar referencia a los chats
  let processingChats = chats;
  
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];
  const isNewChat = !chatId;
  
  // MEJORA: Cargar chats problemáticos sincrónicamente antes de renderizar
  try {
    const { loadProblematicChats } = require('../utils/chat-error-handler-pdf.js');
    if (typeof loadProblematicChats === 'function') {
      loadProblematicChats();
    }
  } catch (e) {
    import('../utils/chat-error-handler-pdf.js')
      .then(module => {
        if (typeof module.loadProblematicChats === 'function') {
          module.loadProblematicChats();
        }
      })
      .catch(error => {
        console.warn('Error al cargar chats problemáticos:', error);
      });
  }
  
  // Realizar limpieza de chats problemáticos si se solicita
  if (performCleanup) {
    import('../utils/chat-error-handler-pdf.js')
      .then(module => {
        if (typeof module.cleanupAllProblematicChats === 'function') {
          module.cleanupAllProblematicChats(true) // Silencioso
            .catch(error => {
              console.warn('Error en limpieza automática durante renderizado:', error);
            });
        }
      })
      .catch(error => {
        console.warn('Error al importar módulo de manejo de errores:', error);
      });
  }
  
  // MEJORA: Verificación previa de chats problemáticos en el DOM
  try {
    const { problematicChatIds, isChatProblematic } = require('../utils/chat-error-handler-pdf.js');
    if (problematicChatIds && problematicChatIds.size > 0) {
      document.querySelectorAll('.sidebar-item[data-chat-id]').forEach(item => {
        const itemChatId = item.getAttribute('data-chat-id');
        if (itemChatId && isChatProblematic(itemChatId)) {
          item.style.opacity = '0.5';
          item.style.transition = 'opacity 0.2s ease-out';
          setTimeout(() => {
            if (item.parentNode) item.parentNode.removeChild(item);
          }, 200);
        }
      });
    }
  } catch (e) {
    // Silenciar error, intentaremos de otra forma
  }
  
  const renderDelay = isNewChat ? 0 : 200;
  
  setManagedTimeout(() => {
    clearElement(elements.chatList);
    
    ensureChatGroupStylesExist();
    
    let isChatProblematicFn;
    try {
      const { isChatProblematic } = require('../utils/chat-error-handler-pdf.js');
      isChatProblematicFn = isChatProblematic;
    } catch (e) {
      import('../utils/chat-error-handler-pdf.js').then(module => {
        isChatProblematicFn = module.isChatProblematic;
      }).catch(e => {
        console.warn('Error al importar isChatProblematic:', e);
        isChatProblematicFn = () => false;
      });
    }
    
    // Si no tenemos la función, esperar a que se importe
    if (!isChatProblematicFn) {
      setTimeout(() => {
        import('../utils/chat-error-handler-pdf.js').then(module => {
          isChatProblematicFn = module.isChatProblematic;
          processAndRenderChats(processingChats, isChatProblematicFn);
        }).catch(e => {
          console.warn('Error al importar isChatProblematic en segundo intento:', e);
          // Último recurso: función que permite todos los chats
          processAndRenderChats(processingChats, () => false);
        });
      }, 50);
    } else {
      processAndRenderChats(processingChats, isChatProblematicFn);
    }
    
    function processAndRenderChats(chats, filterFn) {
      if (chats && chats.grouped && chats.allChats) {
        const filteredGroups = {};
        Object.keys(chats.grouped).forEach(groupKey => {
          filteredGroups[groupKey] = chats.grouped[groupKey].filter(chat => 
            !filterFn(chat.id)
          );
        });
        
        renderGroupedChats(elements.chatList, filteredGroups);
      } 
      // Compatibilidad con el formato anterior (array de chats)
      else if (Array.isArray(chats)) {
        const filteredChats = chats.filter(chat => !filterFn(chat.id));
        
        filteredChats.forEach(chat => {
          const chatItem = createChatItem(chat);
          if (chatItem) elements.chatList.appendChild(chatItem);
        });
      }
      
      import('../core/state-pdf.js').then(module => {
        const currentChatId = module.getState('currentChatId');
        if (currentChatId) {
          setManagedTimeout(() => updateActiveSidebarItem(currentChatId), 50, 'update-active-item');
        }
      }).catch(() => {
        // Silenciar error, no es crítico
      });
    }
  }, renderDelay, 'render-chat-history');
}

/**
 * Comprueba si un elemento contiene una clase
 * @param {HTMLElement} element - Elemento a comprobar
 * @param {string} className - Clase a comprobar
 * @returns {boolean} true si el elemento contiene la clase
 */
function hasClass(element, className) {
  if (!element || !className) {
    return false;
  }
  
  try {
    return element.classList.contains(className);
  } catch (error) {
    return new RegExp(`(^| )${className}( |$)`, 'gi').test(element.className);
  }
}

/**
 * Actualiza el ítem activo en el sidebar basado en el chatId actual
 * @param {string} chatId - ID del chat activo
 */
export function updateActiveSidebarItem(chatId) {
  if (!chatId) return;
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    removeClass(item, 'active');
  });
  
  const chatItem = document.querySelector(`.sidebar-item[data-chat-id="${chatId}"]`);
  if (chatItem) {
    addClass(chatItem, 'active');
  }
}

/**
 * Función para verificar si un grupo de chats está vacío
 * @param {Array} group - Grupo de chats
 * @returns {boolean} true si el grupo está vacío, false de lo contrario
 */
function isGroupEmpty(group) {
  return !group || group.length === 0;
}

/**
 * Renderiza los chats agrupados por períodos de tiempo
 * @param {HTMLElement} container - Elemento contenedor
 * @param {Object} groupedChats - Objeto con chats agrupados por período
 */
function renderGroupedChats(container, groupedChats) {
  // Variable para rastrear si se ha renderizado al menos un grupo
  let hasRenderedGroup = false;
  
  function renderGroup(group, title) {
    if (isGroupEmpty(group)) return false;
    
    if (hasRenderedGroup) {
      appendSeparator(container);
    }
    
    appendGroupHeader(container, title);
    group.forEach(chat => {
      const chatItem = createChatItem(chat);
      if (chatItem) container.appendChild(chatItem);
    });
    
    hasRenderedGroup = true;
    return true;
  }
  
  renderGroup(groupedChats.today, 'Hoy');
  renderGroup(groupedChats.yesterday, 'Ayer');
  renderGroup(groupedChats.thisWeek, 'Esta semana');
  renderGroup(groupedChats.lastWeek, 'Semana pasada');
  renderGroup(groupedChats.thisMonth, 'Este mes');
  renderGroup(groupedChats.lastMonth, 'Mes pasado');
  renderGroup(groupedChats.thisYear, 'Este año');
  renderGroup(groupedChats.previousYears, 'Años anteriores');
  
  // Si no hay ningún chat, mostrar un mensaje
  if (!hasRenderedGroup) {
    const emptyMessage = createElement('div', {
      className: 'empty-chats-message'
    }, sanitizeText('No hay conversaciones disponibles'));
    
    container.appendChild(emptyMessage);
    ensureEmptyChatsStyleExists();
  }
}

/**
 * Añade un encabezado de grupo al contenedor
 * @param {HTMLElement} container - Elemento contenedor
 * @param {string} title - Título del grupo
 */
function appendGroupHeader(container, title) {
  const header = createElement('div', {
    className: 'chat-group-header'
  }, sanitizeText(title));
  
  container.appendChild(header);
}

/**
 * Añade un separador entre grupos
 * @param {HTMLElement} container - Elemento contenedor
 */
function appendSeparator(container) {
  const separator = createElement('div', {
    className: 'chat-group-separator'
  });
  
  container.appendChild(separator);
}

/**
 * Asegura que los estilos para chat groups existen
 */
function ensureChatGroupStylesExist() {
  if (!document.getElementById('chat-group-styles')) {
    const styleEl = createElement('style', {
      id: 'chat-group-styles'
    }, `
      .chat-group-header {
        padding: 6px 12px;
        font-size: 0.8rem;
        color: #666;
        font-weight: 500;
        margin-top: 6px;
      }
      
      .chat-group-separator {
        height: 1px;
        background-color: rgba(0, 0, 0, 0.06);
        margin: 5px 12px;
      }
      
      .chat-title {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `);
    
    document.head.appendChild(styleEl);
  }
}

/**
 * Asegura que los estilos para mensaje de chats vacíos existen
 */
function ensureEmptyChatsStyleExists() {
  if (!document.getElementById('empty-chats-style')) {
    const style = createElement('style', {
      id: 'empty-chats-style'
    }, `
      .empty-chats-message {
        padding: 20px;
        text-align: center;
        color: #888;
        font-style: italic;
      }
    `);
    
    document.head.appendChild(style);
  }
}

/**
 * Alterna la visibilidad del sidebar y almacena el estado
 */
export function toggleSidebar() {
  if (!elements.sidebar) {
    elements.sidebar = getElement('sidebar');
    if (!elements.sidebar) return;
  }
  
  if (!elements.mainContent) {
    elements.mainContent = document.querySelector('.main-content');
  }
  
  if (hasClass(elements.sidebar, 'pinned')) {
    // Si está pinned, lo quitamos primero
    removeClass(elements.sidebar, 'pinned');
    if (elements.mainContent) removeClass(elements.mainContent, 'sidebar-pinned');
  }
  
  toggleClass(elements.sidebar, 'collapsed');
  localStorage.setItem('sidebarCollapsed', hasClass(elements.sidebar, 'collapsed'));
}

/**
 * Aplica el pin al sidebar
 * @param {Event} e - Evento de click
 */
export function pinSidebar(e) {
  if (e) e.stopPropagation();
  
  if (!elements.sidebar) elements.sidebar = getElement('sidebar');
  if (!elements.mainContent) elements.mainContent = document.querySelector('.main-content');
  if (!elements.pinButton) elements.pinButton = document.querySelector('.pin-button');
  if (!elements.unpinButton) elements.unpinButton = document.querySelector('.unpin-button');
  
  if (!elements.sidebar) return;
  
  if (window.scrollManager && typeof window.scrollManager.lockScrollWithReason === 'function') {
    window.scrollManager.lockScrollWithReason('sidebar-pin-action', 1000);
  }
  
  // Asegurarse de que no esté colapsado antes de pinnearlo
  removeClass(elements.sidebar, 'collapsed');
  localStorage.setItem('sidebarCollapsed', 'false');
  
  addClass(elements.sidebar, 'pinned');
  if (elements.mainContent) addClass(elements.mainContent, 'sidebar-pinned');
  
  if (elements.pinButton) elements.pinButton.style.display = 'none';
  if (elements.unpinButton) elements.unpinButton.style.display = 'block';
  
  localStorage.setItem('sidebarPinned', 'true');
}


/**
 * Quita el pin del sidebar
 * @param {Event} e - Evento de click
 */
export function unpinSidebar(e) {
  if (e) e.stopPropagation();
  
  if (!elements.sidebar) elements.sidebar = getElement('sidebar');
  if (!elements.mainContent) elements.mainContent = document.querySelector('.main-content');
  if (!elements.pinButton) elements.pinButton = document.querySelector('.pin-button');
  if (!elements.unpinButton) elements.unpinButton = document.querySelector('.unpin-button');
  
  if (!elements.sidebar) return;
  
  if (window.scrollManager && typeof window.scrollManager.lockScrollWithReason === 'function') {
    window.scrollManager.lockScrollWithReason('sidebar-unpin-action', 1000);
  }
  
  removeClass(elements.sidebar, 'pinned');
  if (elements.mainContent) removeClass(elements.mainContent, 'sidebar-pinned');
  
  if (elements.pinButton) elements.pinButton.style.display = 'block';
  if (elements.unpinButton) elements.unpinButton.style.display = 'none';
  
  localStorage.setItem('sidebarPinned', 'false');
}

/**
 * Cierra todos los menús abiertos al hacer click fuera de ellos
 * @param {Event} e - Evento click
 */
export function closeAllMenus(e) {
  document.querySelectorAll('.account-options').forEach(menu => {
    if (!menu.contains(e.target)) removeClass(menu, 'active');
  });
  document.querySelectorAll('.chat-options').forEach(menu => {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  });
}

/**
 * Alterna la visibilidad del menú de cuenta
 */
export function toggleAccountMenu() {
  if (!elements.accountOptions) {
    elements.accountOptions = document.querySelector('.account-options');
    if (!elements.accountOptions) return;
  }
  
  const isVisible = hasClass(elements.accountOptions, 'active');
  
  // Si está visible, ocultarlo; si está oculto, mostrarlo
  if (isVisible) {
    removeClass(elements.accountOptions, 'active');
  } else {
    document.querySelectorAll('.account-options').forEach(menu => {
      removeClass(menu, 'active');
    });
    
    addClass(elements.accountOptions, 'active');
  }
}

/**
 * Inicializa el estado visual del sidebar según los valores guardados
 */
export function initializeSidebarState() {
  if (!elements.sidebar) elements.sidebar = getElement('sidebar');
  if (!elements.pinButton) elements.pinButton = document.querySelector('.pin-button');
  if (!elements.unpinButton) elements.unpinButton = document.querySelector('.unpin-button');
  if (!elements.mainContent) elements.mainContent = document.querySelector('.main-content');
  
  if (!elements.sidebar) return;
  
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  const isPinned = localStorage.getItem('sidebarPinned') === 'true';
  
  if (isPinned) {
    addClass(elements.sidebar, 'pinned');
    if (elements.mainContent) addClass(elements.mainContent, 'sidebar-pinned');
    if (elements.pinButton) elements.pinButton.style.display = 'none';
    if (elements.unpinButton) elements.unpinButton.style.display = 'block';
  } else {
    removeClass(elements.sidebar, 'pinned');
    if (elements.mainContent) removeClass(elements.mainContent, 'sidebar-pinned');
    if (elements.pinButton) elements.pinButton.style.display = 'block';
    if (elements.unpinButton) elements.unpinButton.style.display = 'none';
  }
  
  if (isCollapsed && !isPinned) { // No colapsar si está pinned
    addClass(elements.sidebar, 'collapsed');
  } else {
    removeClass(elements.sidebar, 'collapsed');
  }
}

/**
 * Previene las animaciones durante la carga inicial
 */
export function preventInitialAnimations() {
  if (!elements.sidebar) elements.sidebar = getElement('sidebar');
  if (!elements.sidebar) return;
  
  addClass(elements.sidebar, 'initial-load');
  
  setManagedTimeout(() => {
    removeClass(elements.sidebar, 'initial-load');
  }, 500, 'remove-initial-load');
}

/**
 * Verifica si se está en modo móvil
 * @returns {boolean} true si es móvil, false si es escritorio
 */
function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * Maneja la apertura/cierre del sidebar en dispositivos móviles
 */
function setupMobileListeners() {
  // Recachear elementos para asegurar que existen
  if (!elements.mobileToggle) elements.mobileToggle = document.getElementById('mobile-sidebar-toggle');
  if (!elements.sidebar) elements.sidebar = document.querySelector('.sidebar');
  if (!elements.overlay) elements.overlay = document.getElementById('mobile-sidebar-overlay');
  if (!elements.accountOptions) elements.accountOptions = document.querySelector('.account-options');
  
  if (!elements.mobileToggle || !elements.sidebar || !elements.overlay) return;
  
  // Toggle sidebar en móvil
  addEvent(elements.mobileToggle, 'click', () => {
    if (!isMobile()) return;
    
    toggleClass(elements.sidebar, 'mobile-open');
    
    if (hasClass(elements.sidebar, 'mobile-open')) {
      elements.overlay.style.display = 'block';
      
      // Forzar visibilidad de elementos
      elements.sidebar.style.opacity = '1';
      elements.sidebar.style.backgroundColor = 'var(--sidebar-bg-color)';
      elements.sidebar.style.backdropFilter = 'none';
      
      const sidebarItems = elements.sidebar.querySelector('.sidebar-items');
      const newChatBtn = elements.sidebar.querySelector('.sidebar-item.new-chat-btn');
      const searchButton = elements.sidebar.querySelector('.search-button');
      
      if (sidebarItems) sidebarItems.style.opacity = '1';
      if (newChatBtn) newChatBtn.style.opacity = '1';
      if (searchButton) searchButton.style.opacity = '1';
      
      // Ajustar botones de pin/unpin
      if (elements.unpinButton) {
        elements.unpinButton.style.display = 'block';
        elements.unpinButton.style.opacity = '1';
      }
      
      if (elements.pinButton) {
        elements.pinButton.style.display = 'none';
      }
      
      elements.sidebar.querySelectorAll('.item-text, .chat-title').forEach(el => {
        el.style.display = 'inline-block';
        el.style.opacity = '1';
      });
    } else {
      elements.overlay.style.display = 'none';
    }
  });
  
  addEvent(elements.overlay, 'click', () => {
    removeClass(elements.sidebar, 'mobile-open');
    elements.overlay.style.display = 'none';
  });
  
  // Make unpin button close the sidebar on mobile
  if (elements.unpinButton) {
    addEvent(elements.unpinButton, 'click', (e) => {
      if (isMobile() && hasClass(elements.sidebar, 'mobile-open')) {
        e.preventDefault();
        removeClass(elements.sidebar, 'mobile-open');
        elements.overlay.style.display = 'none';
      }
    });
  }
  
  addEvent(document, 'keydown', (e) => {
    if (isMobile() && e.key === 'Escape') {
      removeClass(elements.sidebar, 'mobile-open');
      if (elements.overlay) elements.overlay.style.display = 'none';
      if (elements.accountOptions) removeClass(elements.accountOptions, 'active');
    }
  });
  
  addEvent(window, 'resize', () => {
    if (!isMobile()) {
      // Restablecer estado al volver a escritorio
      removeClass(elements.sidebar, 'mobile-open');
      if (elements.overlay) elements.overlay.style.display = 'none';
      
      elements.sidebar.style.opacity = '';
      elements.sidebar.style.backgroundColor = '';
      elements.sidebar.style.backdropFilter = '';
      
      const mobileElements = elements.sidebar.querySelectorAll(
        '.sidebar-items, .sidebar-item.new-chat-btn, .search-button, .pin-button, .unpin-button, .item-text, .chat-title'
      );
      
      mobileElements.forEach(el => {
        el.style.opacity = '';
        el.style.display = '';
      });
    }
  });
  
  setupAttachmentMenu();
}

/**
 * Configura el menú de adjuntos para móvil
 */
function setupAttachmentMenu() {
  // Recachear elementos para asegurar que existen
  if (!elements.attachBtn) elements.attachBtn = document.querySelector('.attach-btn');
  if (!elements.attachmentOptions) elements.attachmentOptions = document.querySelector('.attachment-options');
  
  if (!elements.attachBtn || !elements.attachmentOptions) return;
  
  function handleAttachBtnClick(e) {
    if (isMobile()) {
      toggleClass(elements.attachBtn, 'active');
      toggleClass(elements.attachmentOptions, 'active');
      e.stopPropagation();
    }
  }
  
  function handleDocumentClick(e) {
    if (isMobile() && 
        hasClass(elements.attachmentOptions, 'active') && 
        !elements.attachmentOptions.contains(e.target) && 
        !elements.attachBtn.contains(e.target)) {
      removeClass(elements.attachBtn, 'active');
      removeClass(elements.attachmentOptions, 'active');
    }
  }
  
  function handleResize() {
    if (!isMobile()) {
      removeClass(elements.attachBtn, 'active');
      removeClass(elements.attachmentOptions, 'active');
    }
  }
  
  addEvent(elements.attachBtn, 'click', handleAttachBtnClick);
  addEvent(document, 'click', handleDocumentClick);
  addEvent(window, 'resize', handleResize);
}

/**
 * Asegura que los estilos CSS iniciales estén en su lugar
 */
function ensureInitialStyles() {
  if (!document.getElementById('initial-load-styles')) {
    const style = createElement('style', {
      id: 'initial-load-styles'
    }, `
      .sidebar.initial-load, .sidebar.initial-load * {
        transition: none !important;
        animation: none !important;
      }
    `);
    
    document.head.appendChild(style);
  }
}

/**
 * Configuración inicial que debe ejecutarse inmediatamente
 * para evitar parpadeos durante la carga
 */
(function immediateInit() {
  ensureInitialStyles();
  
  if (document.readyState === 'loading') {
    addEvent(document, 'DOMContentLoaded', applyInitialSidebarState);
  } else {
    applyInitialSidebarState();
  }
  
  function applyInitialSidebarState() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    addClass(sidebar, 'initial-load');
    
    const isPinned = localStorage.getItem('sidebarPinned') === 'true';
    
    if (isPinned) {
      addClass(sidebar, 'pinned');
      const pinButton = sidebar.querySelector('.pin-button');
      const unpinButton = sidebar.querySelector('.unpin-button');
      
      if (pinButton) pinButton.style.display = 'none';
      if (unpinButton) unpinButton.style.display = 'block';
      
      // Si existe main-content, aplicar también la clase
      const mainContent = document.querySelector('.main-content');
      if (mainContent) addClass(mainContent, 'sidebar-pinned');
    }
    
    setManagedTimeout(() => {
      removeClass(sidebar, 'initial-load');
    }, 500, 'initial-animation-prevent');
  }
})();

/**
 * Configura los listeners del sidebar de manera unificada
 */
export function setupSidebarListeners() {
  if (isInitialized) return;
  
  cacheElements();
  
  // Asegurarse de que el ScrollManager esté inicializado
  if (window.scrollManager && !window.scrollManager.isInitialized) {
    try {
      window.scrollManager.init();
    } catch (e) {
      // Silenciar errores, no es crítico
      console.warn('No se pudo inicializar ScrollManager', e);
    }
  }
  
  if (elements.sidebar) {
    addClass(elements.sidebar, 'initial-load');
    
    setManagedTimeout(() => {
      removeClass(elements.sidebar, 'initial-load');
    }, 500, 'remove-initial-load-class');
  }
  
  // Toggle sidebar (colapsar/expandir)
  if (elements.sidebarToggle) {
    addEvent(elements.sidebarToggle, 'click', toggleSidebar);
  }
  
  // Pin/unpin
  if (elements.pinButton) {
    addEvent(elements.pinButton, 'click', pinSidebar);
  }
  
  if (elements.unpinButton) {
    addEvent(elements.unpinButton, 'click', unpinSidebar);
  }
  
  // Menú de cuenta
  if (elements.accountItem) {
    addEvent(elements.accountItem, 'click', function(event) {
      event.stopPropagation();
      toggleAccountMenu();
    });
  }
  
  addEvent(document, 'click', function(event) {
    if (elements.accountOptions && elements.accountItem && 
        !elements.accountOptions.contains(event.target) && 
        !elements.accountItem.contains(event.target)) {
      removeClass(elements.accountOptions, 'active');
    }
  });
  
  setupMobileListeners();
  
  isInitialized = true;
}

addEvent(document, 'DOMContentLoaded', setupSidebarListeners);

// Asegurar limpieza de timeouts antes de descargar la página
addEvent(window, 'beforeunload', clearManagedTimeouts);

/**
 * Implementación mejorada de removeChatFromSidebar
 * para asegurar eliminación efectiva
 */
export function removeChatFromSidebar(chatId) {
  if (!chatId) return;
  
  try {
    // Método 1: Selector directo
    const chatItem = document.querySelector(`.sidebar-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(chatItem);
      }
      
      chatItem.style.opacity = '0.5';
      chatItem.style.transition = 'opacity 0.2s ease-out';
      
      setTimeout(() => {
        if (chatItem && chatItem.parentNode) {
          chatItem.parentNode.removeChild(chatItem);
        }
      }, 200);
      
      console.log(`Chat ${chatId} eliminado del sidebar mediante selector directo`);
      return;
    }
    
    // Método 2: Atributo data-id (en caso de formato alternativo)
    const altChatItem = document.querySelector(`[data-id="${chatId}"]`);
    if (altChatItem) {
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(altChatItem);
      }
      altChatItem.style.opacity = '0.5';
      altChatItem.style.transition = 'opacity 0.2s ease-out';
      setTimeout(() => {
        if (altChatItem && altChatItem.parentNode) {
          altChatItem.parentNode.removeChild(altChatItem);
        }
      }, 200);
      
      console.log(`Chat ${chatId} eliminado del sidebar mediante selector alternativo`);
      return;
    }
    
    // Método 3: Buscar por ID en elementos anidados
    const nestedItems = document.querySelectorAll('.sidebar-item');
    for (let item of nestedItems) {
      if (item.textContent.includes(chatId) || 
          (item.dataset && Object.values(item.dataset).includes(chatId))) {
        
        if (typeof removeAllEvents === 'function') {
          removeAllEvents(item);
        }
        item.style.opacity = '0.5';
        item.style.transition = 'opacity 0.2s ease-out';
        setTimeout(() => {
          if (item && item.parentNode) {
            item.parentNode.removeChild(item);
          }
        }, 200);
        
        console.log(`Chat ${chatId} eliminado del sidebar mediante búsqueda de contenido`);
        return;
      }
    }
    
    // Si llegamos aquí, no encontramos el elemento
    console.log(`No se encontró el chat ${chatId} en el sidebar para eliminarlo`);
  } catch (e) {
    console.warn(`Error al eliminar chat ${chatId} del sidebar:`, e);
    
    // Último intento: forzar actualización completa del sidebar
    try {
      import('../api/chat-pdf.js').then(async module => {
        const updatedChats = await module.loadChatHistory();
        renderChatHistory(updatedChats);
      }).catch(e => console.warn('Error en actualización forzada de sidebar:', e));
    } catch (e) {
      console.warn('Error en último intento de actualización:', e);
    }
  }
}

export default {
  renderChatHistory,
  toggleSidebar,
  pinSidebar,
  unpinSidebar,
  toggleAccountMenu,
  closeAllMenus,
  setupSidebarListeners,
  initializeSidebarState,
  preventInitialAnimations,
  updateActiveSidebarItem,
  removeChatFromSidebar
};