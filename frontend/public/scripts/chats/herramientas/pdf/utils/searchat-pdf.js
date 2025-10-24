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
import { isChatProblematic } from './chat-error-handler-pdf.js'; // Importar la función


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
  
  // Si no se encuentra el botón principal, buscar alternativas
  if (!searchBtn) {
    const searchIconBtn = document.querySelector('button i.bx-search');
    if (searchIconBtn) {
      const btnParent = searchIconBtn.closest('button');
      if (btnParent) {
        await setupButtonEvents(btnParent);
      }
    } else {
      // Crear un botón de prueba solo si estamos en desarrollo
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
  
  // Guardar referencias a elementos del modal
  const searchModal = state.searchModal;
  
  if (!searchModal) return;
  
  // Eliminar eventos anteriores y agregar nuevo
  removeAllEvents(btn);
  addEvent(btn, 'click', function(e) {
    if (e) e.preventDefault();
    openSearchModal();
    return false;
  });
  
  // Configurar cierre del modal
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
  
  // Cerrar al hacer clic fuera del modal
  addEvent(document, 'mousedown', function(e) {
    const modalBox = searchModal.querySelector('.search-modal-box');
    if (searchModal.classList.contains('visible') && 
        modalBox && !modalBox.contains(e.target) && 
        e.target !== btn) {
      closeSearchModal();
    }
  });
  
  // Cerrar con ESC
  addEvent(document, 'keydown', function(e) {
    if (e.key === 'Escape' && searchModal.classList.contains('visible')) {
      closeSearchModal();
    }
  });
  
  // Configurar botón de nuevo chat
  const newChatBtn = searchModal.querySelector('.search-new-chat');
  if (newChatBtn) {
    // Sanitizar y establecer el contenido
    newChatBtn.innerHTML = `
      <i class='bx bx-plus'></i>
      <span>New chat</span>
    `;
    
    // Añadir la clase correcta si no la tiene
    if (!newChatBtn.classList.contains('search-chat-item')) {
      newChatBtn.classList.add('search-chat-item');
    }
    
    removeAllEvents(newChatBtn);
    addEvent(newChatBtn, 'click', function() {
      closeSearchModal();
      // Ejecutar la acción de nuevo chat
      const mainNewChatBtn = document.querySelector('.new-chat-btn');
      if (mainNewChatBtn) {
        mainNewChatBtn.click();
      }
    });
  }
  
  // Marcar el modal como configurado
  searchModal.classList.add('setup-complete');
}

/**
 * Función para abrir el modal sin mover el scroll
 */
function openSearchModal() {
  const btn = state.searchBtn;
  const searchModal = state.searchModal;
  
  if (!btn || !searchModal) return;
  
  // Almacenar la posición actual del scroll sin moverlo
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // Usar ScrollManager si está disponible
  if (window.scrollManager && window.scrollManager.isInitialized) {
    window.scrollManager.lockScrollWithReason('search-modal-open');
  } else {
    // Enfoque alternativo: fijar la posición del body
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${currentScrollPosition}px`;
    document.body.dataset.scrollPosition = currentScrollPosition;
  }
  
  // Añadir clase al botón
  btn.classList.add('search-button-active');
  
  // Comprobar el estado del sidebar y ajustar la visibilidad del botón
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    updateButtonVisibility(sidebar, btn);
    startHoverObserver(sidebar, btn);
  }
  
  // Calcular el ancho del scrollbar para compensación
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
  
  // Manejar el comportamiento del body
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  
  // Mostrar el modal
  searchModal.classList.add('visible');

  acadelInfo("🔍 Buscador activado", "Acadel está listo para encontrar tus conversaciones");
  
  // Enfocar el input y cargar los chats
  setManagedTimeout(() => {
    const input = document.getElementById('chatSearchInput');
    if (input) {
      input.focus();
      input.setAttribute('placeholder', 'Search chats...');
      
      // Obtener información de usuario y cargar chats
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
  
  // Quitar clase del botón
  btn.classList.remove('search-button-active');
  
  // Detener el observador de hover y limpiar timeout
  clearManagedTimeouts(TIMEOUT_HOVER);
  
  // Restaurar la opacidad original
  btn.style.opacity = '';
  
  // Ocultar el modal
  searchModal.classList.remove('visible');
  
  // Usar ScrollManager si está disponible
  if (window.scrollManager && window.scrollManager.isInitialized) {
    window.scrollManager.unlockScrollWithReason('search-modal-closed');
  } else {
    // Enfoque alternativo: restaurar la posición del body
    const scrollPosition = parseInt(document.body.dataset.scrollPosition || '0');
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition); // Solo hacer scroll después de restaurar la posición del body
  }
  
  // Eliminar estilos que bloquean el scroll
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
    // Obtener userId y herramientaId del state
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
    // Si no se puede obtener del state, intentar con API de autenticación
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
    // Construir URL de la API según config.js
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
    
    // Mostrar chats en la lista
    displayChats(state.allChats);

    // ⭐ NUEVO: Notificación de éxito
    if (state.allChats.length > 0) {
      acadelExito("📚 Historial cargado", `Acadel encontró ${state.allChats.length} conversaciones en tu academia`);
    }
    
    // Configurar evento de búsqueda
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
    // Sanitizar el mensaje
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

  // Limpiar lista actual y sus eventos
  const oldItems = searchChatList.querySelectorAll('.search-chat-item');
  oldItems.forEach(item => {
    removeAllEvents(item);
  });
  searchChatList.innerHTML = '';

  // Filtrar los chats problemáticos
  const filteredChats = chats.filter(chat => !isChatProblematic(chat.id));

  // Ordenar chats por fecha - más reciente primero
  const sortedChats = [...filteredChats].sort((a, b) => {
    const dateA = new Date(a.last_message_date || a.created_at);
    const dateB = new Date(b.last_message_date || b.created_at);
    return dateB - dateA; // Orden descendente (más reciente primero)
  });

  // Agregar el encabezado "Previous 30 Days" si hay chats
  if (sortedChats.length > 0) {
    const headerElement = createElement('div', {
      className: 'search-date-header',
      textContent: 'Previous 30 Days'
    });
    searchChatList.appendChild(headerElement);
  }

  sortedChats.forEach(chat => {
    // Calcular días de diferencia
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

    // Sanitizar datos
    const chatTitle = sanitizeText(chat.title || 'Chat sin título');

    // Crear elemento de chat
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
  
  // Remover eventos anteriores
  removeAllEvents(searchInput);
  
  // Filtrar chats en tiempo real al escribir
  addEvent(searchInput, 'input', function() {
    const query = this.value.toLowerCase().trim();
    
    if (!query) {
      // Si la búsqueda está vacía, mostrar todos los chats
      displayChats(state.allChats);
      return;
    }
    
    // Filtrar chats por título
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
  
  // Configurar el botón de búsqueda
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
  // Usar la configuración específica del URL_CONFIG
  const chatPath = URL_CONFIG.chatPath(chatId);

    // ⭐ NUEVO: Notificación de éxito antes de navegar
  acadelExito("🎯 Chat encontrado", "Acadel te lleva a tu conversación");
  
  // Cerrar el modal primero
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
  // Comprobar si el sidebar está fijado o tiene hover
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
  // Limpiar cualquier timeout existente
  clearManagedTimeouts(TIMEOUT_HOVER);
  
  // Crear un nuevo intervalo para verificar el estado del hover
  const checkHoverState = () => {
    if (button.classList.contains('search-button-active')) {
      updateButtonVisibility(sidebar, button);
      setManagedTimeout(checkHoverState, 100, TIMEOUT_HOVER);
    }
  };
  
  // Iniciar comprobación
  setManagedTimeout(checkHoverState, 100, TIMEOUT_HOVER);
}

/**
 * Configura el listener para detectar cambios en el pin/unpin del sidebar
 */
function setupPinUnpinListener() {
  // Eliminar eventos previos para evitar duplicados
  removeEvent(document, 'click', handlePinUnpinClick);
  
  // Añadir nuevo evento
  addEvent(document, 'click', handlePinUnpinClick);
}

/**
 * Manejador de eventos para pin/unpin
 * @param {Event} e - Evento de clic
 */
function handlePinUnpinClick(e) {
  // Verificar si se hizo clic en los botones de pin/unpin
  if (e.target.matches('.pin-button') || e.target.matches('.unpin-button') || 
      e.target.closest('.pin-button') || e.target.closest('.unpin-button')) {
      
    // Dar tiempo a que se actualice el estado del sidebar
    setManagedTimeout(function() {
      // Verificar visibilidad del botón
      const searchBtn = state.searchBtn;
      
      if (searchBtn && searchBtn.classList.contains('search-button-active')) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          // Verificar si el sidebar está pinned
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