/**
 * search.js - Módulo para gestionar el modal de búsqueda
 * @module search
 */

import { getState } from '../core/state-pdf.js';
import { API_ROUTES, URL_CONFIG, APP_CONFIG } from '../core/config-pdf.js';
import {
  addEvent,
  removeEvent,
  removeAllEvents,
  sanitizeText,
  createElement,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../../shared/dom-helpers.js';
import { isChatProblematic } from './chat-error-handler-pdf.js';


// Constantes para identificar timeouts
const TIMEOUT_MODAL_CLOSE = 'search_modal_close';
const TIMEOUT_MODAL_OPEN = 'search_modal_open';
const TIMEOUT_NAVIGATE = 'search_navigate';
const TIMEOUT_HOVER = 'search_hover_observer';

// Referencias globales del módulo
const state = {
  allChats: [],
  userId: null,
  herramientaId: null,
  searchBtn: null,
  searchModal: null,
  hoverCheckInterval: null
};

/**
 * Inicializa el modal de búsqueda y todas sus funcionalidades
 * @returns {Promise<boolean>} - Promesa que se resuelve cuando el modal está listo
 */
export async function initSearchModal() {
  await setupSearchModal();
  setupPinUnpinListener();
  return true;
}

/**
 * Configura el modal de búsqueda
 * @returns {Promise<void>}
 */
async function setupSearchModal() {
  // Encontrar el botón de búsqueda
  const searchBtn = document.getElementById('sidebarSearchBtn') || 
                    document.querySelector('.search-button');
  
  state.searchModal = document.getElementById('searchModalContainer');
  if (!state.searchModal) return;
  
  state.herramientaId = APP_CONFIG.herramientaId || 5; // Usar el ID del asistente
  
  if (!searchBtn) {
    const searchIconBtn = document.querySelector('button i.bx-search');
    if (searchIconBtn) {
      const btnParent = searchIconBtn.closest('button');
      if (btnParent) {
        await setupButtonEvents(btnParent);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        const testBtn = createElement('button', {
          textContent: 'Buscar (Test)',
          style: {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '9999',
            padding: '8px 16px'
          }
        });
        document.body.appendChild(testBtn);
        await setupButtonEvents(testBtn);
      }
    }
  } else {
    await setupButtonEvents(searchBtn);
  }
}

/**
 * Configura los eventos del botón de búsqueda
 * @param {HTMLElement} btn - El botón de búsqueda
 * @returns {Promise<void>}
 */
async function setupButtonEvents(btn) {
  state.searchBtn = btn;
  
  const searchModal = state.searchModal;
  
  if (!searchModal) return;
  
  removeAllEvents(btn);
  addEvent(btn, 'click', function(e) {
    if (e) e.preventDefault();
    openSearchModal();
    return false;
  });
  
  const closeBtn = document.getElementById('closeSearchModal');
  const cancelBtn = document.getElementById('cancelSearchButton');
  
  if (closeBtn) {
    removeAllEvents(closeBtn);
    addEvent(closeBtn, 'click', closeSearchModal);
  }
  
  if (cancelBtn) {
    removeAllEvents(cancelBtn);
    addEvent(cancelBtn, 'click', closeSearchModal);
  }
  
  addEvent(document, 'mousedown', function(e) {
    const modalBox = searchModal.querySelector('.search-modal-box');
    if (searchModal.classList.contains('visible') && 
        modalBox && !modalBox.contains(e.target) && 
        e.target !== btn) {
      closeSearchModal();
    }
  });
  
  addEvent(document, 'keydown', function(e) {
    if (e.key === 'Escape' && searchModal.classList.contains('visible')) {
      closeSearchModal();
    }
  });
  
  const newChatBtn = searchModal.querySelector('.search-new-chat');
  if (newChatBtn) {
    newChatBtn.innerHTML = `
      <i class='bx bx-plus'></i>
      <span>New chat</span>
    `;
    
    if (!newChatBtn.classList.contains('search-chat-item')) {
      newChatBtn.classList.add('search-chat-item');
    }
    
    removeAllEvents(newChatBtn);
    addEvent(newChatBtn, 'click', function() {
      closeSearchModal();
      const mainNewChatBtn = document.querySelector('.new-chat-btn');
      if (mainNewChatBtn) {
        mainNewChatBtn.click();
      }
    });
  }
  
  searchModal.classList.add('setup-complete');
}

/**
 * Función para abrir el modal sin mover el scroll
 */
function openSearchModal() {
  const btn = state.searchBtn;
  const searchModal = state.searchModal;
  
  if (!btn || !searchModal) return;
  
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  if (window.scrollManager && window.scrollManager.isInitialized) {
    window.scrollManager.lockScrollWithReason('search-modal-open');
  } else {
    // Enfoque alternativo: fijar la posición del body
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${currentScrollPosition}px`;
    document.body.dataset.scrollPosition = currentScrollPosition;
  }
  
  btn.classList.add('search-button-active');
  
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    updateButtonVisibility(sidebar, btn);
    startHoverObserver(sidebar, btn);
  }
  
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
  
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  
  searchModal.classList.add('visible');

  acadelInfo("🔍 Buscador activado", "Acadel está listo para encontrar tus conversaciones");
  
  // Enfocar el input y cargar los chats
  setManagedTimeout(() => {
    const input = document.getElementById('chatSearchInput');
    if (input) {
      input.focus();
      input.setAttribute('placeholder', 'Search chats...');
      
      getUserInfo().then(() => {
        if (state.userId) {
          loadChats();
        } else {
          acadelWarning("🔐 Problema de sesión", "Acadel no puede identificarte. ¿Podrías recargar la página?");
          displaySearchMessage('Recarga la página para continuar');
        }
      });
    }
  }, 100, TIMEOUT_MODAL_OPEN);
}


/**
 * Función para cerrar el modal y restaurar el scroll
 */
function closeSearchModal() {
  const btn = state.searchBtn;
  const searchModal = state.searchModal;
  
  if (!btn || !searchModal) return;
  
  btn.classList.remove('search-button-active');
  
  clearManagedTimeouts(TIMEOUT_HOVER);
  
  btn.style.opacity = '';
  
  searchModal.classList.remove('visible');
  
  if (window.scrollManager && window.scrollManager.isInitialized) {
    window.scrollManager.unlockScrollWithReason('search-modal-closed');
  } else {
    // Enfoque alternativo: restaurar la posición del body
    const scrollPosition = parseInt(document.body.dataset.scrollPosition || '0');
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
  }
  
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.removeProperty('--scrollbar-compensation');
}

/**
 * Función para obtener información del usuario
 * @returns {Promise<Object|null>} - Información del usuario o null si hay error
 */
async function getUserInfo() {
  try {
    state.userId = getState('userId');
    const stateherramientaId = getState('herramientaId');
    
    if (stateherramientaId) {
      state.herramientaId = stateherramientaId;
    }
    
    if (!state.userId) {
      throw new Error('ID de usuario no encontrado en el estado');
    }
    
    return { userId: state.userId, herramientaId: state.herramientaId };
  } catch (error) {
    try {
      const response = await fetch(API_ROUTES.authentication, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.id_user) {
          state.userId = userData.id_user;
          return { userId: state.userId, herramientaId: state.herramientaId };
        }
      }
      throw new Error('No se pudo autenticar al usuario');
    } catch (authError) {
      return null;
    }
  }
}

/**
 * Función para cargar los chats
 * @returns {Promise<void>}
 */
async function loadChats() {
  try {
    const apiUrl = API_ROUTES.chatHistory(state.userId, state.herramientaId);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    state.allChats = await response.json();
    
if (state.allChats.length === 0) {
      acadelInfo("📝 Pizarra limpia", "Acadel nota que aún no has creado ningún chat. ¡Es momento de empezar tu primera conversación!");
      displaySearchMessage('¡Crea tu primer chat académico!');
      return;
    }
    
    displayChats(state.allChats);

    if (state.allChats.length > 0) {
      acadelExito("📚 Historial cargado", `Acadel encontró ${state.allChats.length} conversaciones en tu academia`);
    }
    
    setupSearchEvent();
  } catch (error) {
    acadelError("📁 Error de carga", "Acadel no pudo acceder a tu historial de chats. ¡Su cerebro de capibara está confundido!");
    displaySearchMessage('Error temporal, intenta de nuevo');
    console.error('Error loading chats:', error);
  }
}

/**
 * Función para mostrar mensaje en la lista de búsqueda
 * @param {string} message - Mensaje a mostrar
 */
function displaySearchMessage(message) {
  const searchChatList = document.getElementById('searchChatList');
  if (searchChatList) {
    const sanitizedMessage = sanitizeText(message);
    searchChatList.innerHTML = `<div class="search-empty-result">${sanitizedMessage}</div>`;
  }
}

/**
 * Función para mostrar los chats en la lista
 * @param {Array} chats - Lista de chats a mostrar
 */
function displayChats(chats) {
  const searchChatList = document.getElementById('searchChatList');
  if (!searchChatList) return;

  const oldItems = searchChatList.querySelectorAll('.search-chat-item');
  oldItems.forEach(item => {
    removeAllEvents(item);
  });
  searchChatList.innerHTML = '';

  const filteredChats = chats.filter(chat => !isChatProblematic(chat.id));

  const sortedChats = [...filteredChats].sort((a, b) => {
    const dateA = new Date(a.last_message_date || a.created_at);
    const dateB = new Date(b.last_message_date || b.created_at);
    return dateB - dateA; // Orden descendente (más reciente primero)
  });

  if (sortedChats.length > 0) {
    const headerElement = createElement('div', {
      className: 'search-date-header',
      textContent: 'Previous 30 Days'
    });
    searchChatList.appendChild(headerElement);
  }

  sortedChats.forEach(chat => {
    const chatDate = new Date(chat.last_message_date || chat.created_at);
    const timeDiff = Math.floor((new Date() - chatDate) / (1000 * 60 * 60 * 24));
    let timeText;

    if (timeDiff === 0) {
      timeText = 'Hoy';
    } else if (timeDiff === 1) {
      timeText = 'Ayer';
    } else {
      timeText = `Hace ${timeDiff} días`;
    }

    const chatTitle = sanitizeText(chat.title || 'Chat sin título');

    const chatItem = createElement('div', {
      className: 'search-chat-item',
      dataset: { chatId: chat.id }
    });

    chatItem.innerHTML = `
      <div class="search-chat-icon">
        <i class='bx bx-message-square-dots'></i>
      </div>
      <div class="search-chat-info">
        <div class="search-chat-title">${chatTitle}</div>
        <div class="search-chat-date">${timeText}</div>
      </div>
    `;

    // Event listener para navegar al chat
    addEvent(chatItem, 'click', () => {
      navigateToChat(chat.id);
    });

    searchChatList.appendChild(chatItem);
  });
}

/**
 * Función para configurar la búsqueda dinámica
 */
function setupSearchEvent() {
  const searchInput = document.getElementById('chatSearchInput');
  if (!searchInput) return;
  
  removeAllEvents(searchInput);
  
  addEvent(searchInput, 'input', function() {
    const query = this.value.toLowerCase().trim();
    
    if (!query) {
      // Si la búsqueda está vacía, mostrar todos los chats
      displayChats(state.allChats);
      return;
    }
    
    const filteredChats = state.allChats.filter(chat => 
      chat.title && chat.title.toLowerCase().includes(query)
    );
    
    if (filteredChats.length === 0) {
      acadelInfo("🔍 Búsqueda sin resultados", "Acadel no encontró chats con ese título. ¿Probamos con otras palabras?");
      displaySearchMessage('No hay coincidencias, prueba otras palabras');
    } else {
      displayChats(filteredChats);
    }
  });
  
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    removeAllEvents(searchButton);
    addEvent(searchButton, 'click', function() {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) {
        displayChats(state.allChats);
        return;
      }
      
      // Realizar la misma búsqueda que en input
      const filteredChats = state.allChats.filter(chat => 
        chat.title && chat.title.toLowerCase().includes(query)
      );
      
      if (filteredChats.length === 0) {
        displaySearchMessage('No se encontraron chats con ese título');
      } else {
        displayChats(filteredChats);
      }
    });
  }
}

/**
 * Función para navegar a un chat específico
 * @param {string|number} chatId - ID del chat
 */
function navigateToChat(chatId) {
  const chatPath = URL_CONFIG.chatPath(chatId);

  acadelExito("🎯 Chat encontrado", "Acadel te lleva a tu conversación");
  
  closeSearchModal();
  
  // Navegar al chat después de un pequeño retraso
  setManagedTimeout(() => {
    window.location.href = chatPath;
  }, 100, TIMEOUT_NAVIGATE);
}

/**
 * Función para actualizar la visibilidad del botón
 * @param {HTMLElement} sidebar - Elemento del sidebar
 * @param {HTMLElement} button - Botón a actualizar
 */
function updateButtonVisibility(sidebar, button) {
  const isPinned = sidebar.classList.contains('pinned');
  const hasHover = sidebar.matches(':hover');
  
  // Si no está fijado y no tiene hover, ocultar el botón
  if (!isPinned && !hasHover) {
    button.style.opacity = '0';
  } else {
    // Si está pinado o tiene hover, mostrar el botón
    button.style.opacity = '1';
  }
}

/**
 * Función para iniciar el observador de hover
 * @param {HTMLElement} sidebar - Elemento del sidebar
 * @param {HTMLElement} button - Botón a observar
 */
function startHoverObserver(sidebar, button) {
  clearManagedTimeouts(TIMEOUT_HOVER);
  
  const checkHoverState = () => {
    if (button.classList.contains('search-button-active')) {
      updateButtonVisibility(sidebar, button);
      setManagedTimeout(checkHoverState, 100, TIMEOUT_HOVER);
    }
  };
  
  setManagedTimeout(checkHoverState, 100, TIMEOUT_HOVER);
}

/**
 * Configura el listener para detectar cambios en el pin/unpin del sidebar
 */
function setupPinUnpinListener() {
  removeEvent(document, 'click', handlePinUnpinClick);
  
  addEvent(document, 'click', handlePinUnpinClick);
}

/**
 * Manejador de eventos para pin/unpin
 * @param {Event} e - Evento de clic
 */
function handlePinUnpinClick(e) {
  if (e.target.matches('.pin-button') || e.target.matches('.unpin-button') || 
      e.target.closest('.pin-button') || e.target.closest('.unpin-button')) {
      
    // Dar tiempo a que se actualice el estado del sidebar
    setManagedTimeout(function() {
      const searchBtn = state.searchBtn;
      
      if (searchBtn && searchBtn.classList.contains('search-button-active')) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const isPinned = sidebar.classList.contains('pinned');
          const hasHover = sidebar.matches(':hover');
          
          // Si no está pinned y no tiene hover, ocultar el botón
          if (!isPinned && !hasHover) {
            searchBtn.style.opacity = '0';
          } else {
            // Si está pinned o tiene hover, mostrar el botón
            searchBtn.style.opacity = '1';
          }
        }
      }
    }, 100, 'pin_unpin_update');
  }
}

// Exportación única y consistente
export default {
  initSearchModal
};