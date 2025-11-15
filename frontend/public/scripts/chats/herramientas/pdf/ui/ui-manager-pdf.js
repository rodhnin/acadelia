/**
 * ui-manager.js PDF - Gestión general de la interfaz de usuario
 */

import { DOM_SELECTORS, UI_CONFIG } from '../core/config-pdf.js';
import { setProcessingState, getState } from '../core/state-pdf.js';
import scrollManager from '../../../shared/scroll-manager.js';
import { showConfirmationModal } from './modals-pdf.js';
import {
  createElement,
  sanitizeText,
  clearElement,
  addClass,
  removeClass,
  setManagedTimeout,
  clearManagedTimeouts,
  addEvent,
  removeEvent
} from '../../../shared/dom-helpers.js';

// Referencias a elementos del DOM
let elements = {
  textarea: null,
  container: null,
  chatList: null,
  newChatBtn: null,
  sendButton: null,
  chatMessages: null,
  themeToggle: null,
  body: null,
  sidebar: null
};

// Variable global para el controlador de fetch
let currentFetchController = null;

// Flag para bloquear restauración durante cancelación
let isCancellationInProgress = false;

// Variable para el manejador de eventos de envío
export let handleSendMessage;

/**
 * Permite establecer el manejador de eventos desde fuera
 */
export function setHandleSendMessage(handler) {
  handleSendMessage = handler;
}

/**
 * Inicializa todos los elementos del DOM
 */
export function initializeElements() {
  elements = {
    textarea: document.querySelector(DOM_SELECTORS.textarea),
    container: document.querySelector(DOM_SELECTORS.container),
    chatList: document.getElementById('chatList'),
    newChatBtn: document.querySelector(DOM_SELECTORS.newChatBtn),
    sendButton: document.querySelector(DOM_SELECTORS.sendButton),
    chatMessages: document.querySelector(DOM_SELECTORS.chatMessages),
    themeToggle: document.getElementById('themeToggle'),
    body: document.body,
    sidebar: document.querySelector(DOM_SELECTORS.sidebar)
  };
}

/**
 * Obtiene un elemento del DOM
 */
export function getElement(elementName) {
  return elements[elementName];
}

/**
 * Muestra una notificación temporal en pantalla.
 * @param {string} message - Mensaje a mostrar.
 * @param {string} type - Tipo de notificación ('error', 'success', 'info', 'warning').
 * @param {number} duration - Duración en milisegundos (opcional)
 * @param {number} fadeTime - Tiempo de desvanecimiento en milisegundos (opcional)
 */
export function showNotification(message, type = 'info', duration = 3000) {
  const tipoMap = {
    'error': 'error',
    'success': 'exito',
    'info': 'info',
    'warning': 'warning'
  };

  return window.acadelMostrar(tipoMap[type] || 'info', null, message, duration);
}

export function showError(message) {
  return window.acadelError(null, message);
}

export function showSuccess(message) {
  return window.acadelExito(null, message);
}

// Nuevas funciones exclusivas de Acadel
export function showAcadelWarning(titulo, mensaje, duracion = 6000) {
  return window.acadelWarning(titulo, mensaje, duracion);
}

export function showAcadelLoading(titulo, mensaje) {
  return window.acadelLoading(titulo, mensaje, 0); // Infinito
}

export function showAcadelConfetti(titulo, mensaje) {
  return window.acadelConfetti(titulo, mensaje);
}

export function closeAcadelNotification(id) {
  return window.acadelCerrar(id);
}

/**
 * Deshabilita todos los botones de interacción de mensajes de manera no intrusiva
 */
function disableInteractionButtons() {
  const responseActions = document.querySelectorAll('.response-actions');
  responseActions.forEach(container => {
    container.classList.add('disabled-during-processing');

    const buttons = container.querySelectorAll('.response-action-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.4';
      btn.setAttribute('aria-disabled', 'true');

      const originalTooltip = btn.getAttribute('data-tooltip');
      if (originalTooltip && !btn.hasAttribute('data-original-tooltip')) {
        btn.setAttribute('data-original-tooltip', originalTooltip);
        btn.setAttribute('data-tooltip', 'Esperando respuesta...');
      }
    });
  });

  const userActions = document.querySelectorAll('.user-response-actions');
  userActions.forEach(container => {
    container.classList.add('disabled-during-processing');

    const buttons = container.querySelectorAll('.response-action-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.4';
      btn.setAttribute('aria-disabled', 'true');

      const originalTooltip = btn.getAttribute('data-tooltip');
      if (originalTooltip && !btn.hasAttribute('data-original-tooltip')) {
        btn.setAttribute('data-original-tooltip', originalTooltip);
        btn.setAttribute('data-tooltip', 'Esperando respuesta...');
      }
    });
  });

  const messageInteractives = document.querySelectorAll(
    '.chat-image-item.clickable, .document-preview.clickable, .file-preview'
  );
  messageInteractives.forEach(element => {
    element.classList.add('disabled-during-processing');
    element.style.pointerEvents = 'none';
    element.style.opacity = '0.6';
    element.setAttribute('aria-disabled', 'true');
  });

  console.log('🚫 Botones de interacción deshabilitados durante procesamiento');
}

/**
 * Rehabilita todos los botones de interacción de mensajes
 */
function enableInteractionButtons() {
  const isProcessingMessage = () => {
    return document.querySelector('.ai-message.processing') !== null;
  };

  const getLastUserMessage = () => {
    const userMessages = document.querySelectorAll('.user-message');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  };

  const lastUserMessage = getLastUserMessage();
  const isCurrentlyProcessing = isProcessingMessage();

  // Rehabilitar botones de respuesta de AI
  const responseActions = document.querySelectorAll('.response-actions');
  responseActions.forEach(container => {
    container.classList.remove('disabled-during-processing');

    const buttons = container.querySelectorAll('.response-action-btn');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '';
      btn.removeAttribute('aria-disabled');

      const originalTooltip = btn.getAttribute('data-original-tooltip');
      if (originalTooltip) {
        btn.setAttribute('data-tooltip', originalTooltip);
        btn.removeAttribute('data-original-tooltip');
      }
    });
  });

  const userActions = document.querySelectorAll('.user-response-actions');
  userActions.forEach(container => {
    const userMessage = container.closest('.user-message');

    if (isCurrentlyProcessing && lastUserMessage && userMessage === lastUserMessage) {
      console.log('🚫 Manteniendo botón de edición deshabilitado para mensaje siendo procesado');
      return; // Saltar este mensaje, mantenerlo deshabilitado
    }

    container.classList.remove('disabled-during-processing');

    const buttons = container.querySelectorAll('.response-action-btn');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '';
      btn.removeAttribute('aria-disabled');

      const originalTooltip = btn.getAttribute('data-original-tooltip');
      if (originalTooltip) {
        btn.setAttribute('data-tooltip', originalTooltip);
        btn.removeAttribute('data-original-tooltip');
      }
    });
  });

  // Rehabilitar otros elementos interactivos
  const messageInteractives = document.querySelectorAll(
    '.chat-image-item.disabled-during-processing, .document-preview.disabled-during-processing, .file-preview.disabled-during-processing'
  );
  messageInteractives.forEach(element => {
    element.classList.remove('disabled-during-processing');
    element.style.pointerEvents = 'auto';
    element.style.opacity = '';
    element.removeAttribute('aria-disabled');
  });

  console.log('✅ Botones de interacción rehabilitados (excepto último mensaje si está procesando)');
}

export function toggleUIState(disabled) {
  if (!disabled && isCancellationInProgress) {
    return; // SALIR SIN HACER NADA
  }

  if (!elements.sendButton || !elements.textarea) {
    return;
  }

  if (disabled) {
    disableInteractionButtons();
  } else {
    enableInteractionButtons();

    setTimeout(async () => {
      try {
        const { refreshButtonsState } = await import('../utils/response-interaction-pdf.js');
        if (typeof refreshButtonsState === 'function') {
          refreshButtonsState();
        }
      } catch (error) {
        console.warn('Error al refrescar estado de botones:', error);
      }
    }, 200); // Pequeño delay para asegurar que el DOM se actualizó
  }

  // BLOQUEO COMPLETO DEL TEXTAREA - Múltiples métodos para asegurar bloqueo
  if (disabled) {
    elements.textarea.disabled = true;
    elements.textarea.readOnly = true;
    elements.textarea.setAttribute('aria-disabled', 'true');
    elements.textarea.style.pointerEvents = 'none';
    elements.textarea.classList.add('textarea-disabled');

    if (!elements.textarea.dataset.originalTabIndex) {
      elements.textarea.dataset.originalTabIndex = elements.textarea.tabIndex || '0';
    }
    elements.textarea.tabIndex = -1; // Evitar foco con tabulación
  } else {
    elements.textarea.disabled = false;
    elements.textarea.readOnly = false;
    elements.textarea.removeAttribute('aria-disabled');
    elements.textarea.style.pointerEvents = 'auto';
    elements.textarea.classList.remove('textarea-disabled');

    if (elements.textarea.dataset.originalTabIndex) {
      elements.textarea.tabIndex = elements.textarea.dataset.originalTabIndex;
    } else {
      elements.textarea.removeAttribute('tabIndex');
    }
  }

  if (disabled) {
    if (!elements.sendButton.dataset.originalContent) {
      elements.sendButton.dataset.originalContent = elements.sendButton.innerHTML;
    }

    clearElement(elements.sendButton);
    const cancelIcon = createElement('i', { className: 'bx bx-x' });
    elements.sendButton.appendChild(cancelIcon);
    elements.sendButton.title = "Cancelar consulta";
    addClass(elements.sendButton, 'cancel-mode');

    removeEvent(elements.sendButton, 'click', handleSendMessage);
    addEvent(elements.sendButton, 'click', function cancelHandler(e) {
      e.preventDefault();
      if (typeof cancelCurrentRequest === 'function') {
        cancelCurrentRequest();
      }
    });
  } else {
    if (!elements.sendButton.classList.contains('loading-mode')) {
      if (elements.sendButton.dataset.originalContent) {
        elements.sendButton.innerHTML = elements.sendButton.dataset.originalContent;
      } else {
        clearElement(elements.sendButton);
        const sendIcon = createElement('i', { className: 'bx bx-up-arrow-alt' });
        elements.sendButton.appendChild(sendIcon);
      }
      elements.sendButton.title = "Enviar mensaje";
      removeClass(elements.sendButton, 'cancel-mode');

      removeEvent(elements.sendButton, 'click');
      addEvent(elements.sendButton, 'click', handleSendMessage);
    } else {
      // Si está en modo cargando, restaurar completamente
      restoreButtonToSend();
    }
  }

  elements.sendButton.disabled = false;
  setProcessingState(disabled);
}

/**
 * Cancela la solicitud actual al servidor.
 */
export function cancelCurrentRequest() {
  if (currentFetchController) {
    isCancellationInProgress = true;

    currentFetchController.abort();
    currentFetchController = null;

    acadelInfo("¡Operación cancelada! 🛑", "Acadel detuvo la consulta como pediste. ¡No hay problema!");
    // NUEVO: Cambiar botón a modo cargando INMEDIATAMENTE
    changeButtonToLoading();

    let loadingMessage = document.getElementById('current-loading-message');

    if (!loadingMessage) {
      const messages = document.querySelectorAll('.message.ai-message.processing');
      loadingMessage = messages[messages.length - 1];
    }

    if (!loadingMessage) {
      const allMessages = document.querySelectorAll('.message.ai-message');
      loadingMessage = allMessages[allMessages.length - 1];
    }

    if (loadingMessage) {
      const aiProfile = loadingMessage.querySelector('.ai-profile');
      if (aiProfile) {
        aiProfile.classList.remove('thinking');
      }

      const hasResponseButtons = loadingMessage.querySelector('.response-actions');
      const hasValidContent = loadingMessage.querySelector('.message-content') &&
        !loadingMessage.querySelector('.thought-bubble') &&
        !loadingMessage.querySelector('.cancelled-message');

      const isEditingOrRetry = loadingMessage.closest('.message').hasAttribute('data-response-interaction-processing');

      if (hasResponseButtons || (hasValidContent && isEditingOrRetry)) {
        console.log('✅ [CANCEL] Mensaje con contenido válido detectado - preservando respuesta');

        loadingMessage.classList.remove('processing');
        loadingMessage.removeAttribute('data-is-loading');

        restoreButtonFromLoading();

        setTimeout(() => {
          isCancellationInProgress = false;
          toggleUIState(false);
        }, 100);

        return;
      }

      loadingMessage.classList.remove('processing');
      loadingMessage.classList.add('cancelled', 'just-cancelled');

      // NUEVA ADICIÓN: Buscar el mensaje del usuario asociado y eliminar botones de edición
      const userMessage = loadingMessage.previousElementSibling;
      if (userMessage && userMessage.classList.contains('user-message')) {
        const userActions = userMessage.querySelector('.user-response-actions');
        if (userActions) {
          console.log('Eliminando botones de edición de mensaje de usuario asociado a cancelación');
          userActions.remove();
        }
      }

      // También buscar hacia atrás en caso de que haya múltiples elementos entre ellos
      let currentElement = loadingMessage.previousElementSibling;
      while (currentElement && !currentElement.classList.contains('user-message')) {
        currentElement = currentElement.previousElementSibling;
      }

      if (currentElement && currentElement.classList.contains('user-message')) {
        const userActions = currentElement.querySelector('.user-response-actions');
        if (userActions) {
          console.log('Eliminando botones de edición de mensaje de usuario (búsqueda extendida)');
          userActions.remove();
        }
      }

      let messageContent = loadingMessage.querySelector('.message-content');
      if (!messageContent) {
        messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        loadingMessage.appendChild(messageContent);
      }

      messageContent.innerHTML = `
        <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(255,193,7,0.1);border-radius:8px;margin:5px 0;border-left:3px solid rgba(255,193,7,0.6);">
          <i class="bx bx-cog bx-spin" style="font-size:1.3rem;color:#ffc107;"></i>
          <span>¡Ups! El profesor Acadel está moviendo el sistema para cancelar tu consulta...</span>
        </div>
        <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
          El chigüire académico está trabajando en ello 🦫⚙️
        </div>
      `;

      loadingMessage.style.opacity = '1';
      loadingMessage.style.transition = 'all 0.3s ease';
      loadingMessage.style.display = 'flex';
      messageContent.style.display = 'block';

      // Después de 3 segundos, mostrar mensaje final y QUITAR loading del botón
      setTimeout(() => {
        if (loadingMessage && loadingMessage.parentNode && messageContent) {
          // Array de mensajes graciosos aleatorios
          const mensajesGraciosos = [
            {
              titulo: "¡Listo! El profesor Acadel detuvo tu consulta",
              detalle: "La consulta fue cancelada exitosamente por nuestro chigüire académico 🦫✨"
            },
            {
              titulo: "¡Misión cumplida! Consulta cancelada por el profesor Acadel",
              detalle: "El chigüire más inteligente de la academia ya terminó su trabajo 🦫🎓"
            },
            {
              titulo: "¡Operación exitosa! El profesor Acadel canceló la consulta",
              detalle: "Nuestro querido chigüire académico dice: '¡Tarea completada!' 🦫👨‍🏫"
            },
            {
              titulo: "¡Todo listo! El profesor Acadel manejó la cancelación",
              detalle: "El chigüire más sabio del sistema académico ha terminado 🦫📚"
            }
          ];

          // Seleccionar mensaje aleatorio
          const mensajeElegido = mensajesGraciosos[Math.floor(Math.random() * mensajesGraciosos.length)];

          messageContent.innerHTML = `
            <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(231,76,60,0.05);border-radius:8px;margin:5px 0;border-left:3px solid rgba(231,76,60,0.3);">
              <i class="bx bx-check-circle" style="font-size:1.3rem;color:#e74c3c;"></i>
              <span>${mensajeElegido.titulo}</span>
            </div>
            <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
              ${mensajeElegido.detalle}
            </div>
          `;

          loadingMessage.style.opacity = '0.7';

          // NUEVO: Quitar loading del botón cuando aparece la confirmación
          restoreButtonFromLoading();
        }
      }, 7000);

      // Hacer scroll para asegurar visibilidad
      setTimeout(() => {
        try {
          loadingMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
          console.error("Error al hacer scroll:", e);
        }
      }, 100);
    }

    const chatId = getState('currentChatId');
    if (chatId) {
      sendCancellationRequest(chatId);
    }

    // TIMEOUT PRINCIPAL: Restaurar UI después de 5 segundos
    setTimeout(() => {
      isCancellationInProgress = false;
      toggleUIState(false);
    }, 7000);
  }
}

/**
 * Cambia el botón a modo cargando inmediatamente al cancelar
 */
function changeButtonToLoading() {
  if (!elements.sendButton) return;

  clearElement(elements.sendButton);
  const loadingIcon = createElement('i', {
    className: 'bx bx-loader-alt bx-spin'
  });
  elements.sendButton.appendChild(loadingIcon);
  elements.sendButton.title = "Procesando cancelación...";

  removeClass(elements.sendButton, 'cancel-mode');
  addClass(elements.sendButton, 'loading-mode');

  elements.sendButton.disabled = true;

  removeEvent(elements.sendButton, 'click');
}

/**
 * Restaura el botón del modo cargando a cancelar
 */
function restoreButtonFromLoading() {
  if (!elements.sendButton) return;

  clearElement(elements.sendButton);
  const cancelIcon = createElement('i', { className: 'bx bx-x' });
  elements.sendButton.appendChild(cancelIcon);
  elements.sendButton.title = "Esperando restauración...";

  removeClass(elements.sendButton, 'loading-mode');
  addClass(elements.sendButton, 'cancel-mode');

  // Mantener deshabilitado hasta la restauración final
  elements.sendButton.disabled = true;
}

/**
 * Restaura el botón a su estado normal de envío
 */
function restoreButtonToSend() {
  if (!elements.sendButton) return;

  if (elements.sendButton.dataset.originalContent) {
    elements.sendButton.innerHTML = elements.sendButton.dataset.originalContent;
  } else {
    clearElement(elements.sendButton);
    const sendIcon = createElement('i', { className: 'bx bx-up-arrow-alt' });
    elements.sendButton.appendChild(sendIcon);
  }

  elements.sendButton.title = "Enviar mensaje";
  elements.sendButton.disabled = false;

  removeClass(elements.sendButton, 'cancel-mode');
  removeClass(elements.sendButton, 'loading-mode');

  addEvent(elements.sendButton, 'click', handleSendMessage);
}


async function sendCancellationRequest(chatId) {
  try {
    const userId = getState('userId');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout

    const response = await fetch(`/api/chats/chats/${chatId}/cancel-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'id_user': userId
      },
      credentials: 'include',
      body: JSON.stringify({ userId }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json();
    console.log('Cancelación registrada en el servidor:', result);

  } catch (error) {
    // Si es error de timeout o abort, no es crítico
    if (error.name !== 'AbortError') {
      console.error('Error enviando solicitud de cancelación:', error);
    }
  }
}

/**
 * Establece el controlador de fetch actual para poder cancelarlo si es necesario.
 */
export function setCurrentFetchController(controller) {
  if (currentFetchController && controller) {
    try {
      currentFetchController.abort();
    } catch (e) { }
  }

  currentFetchController = controller;
}

/**
 * Limpia los mensajes del área de chat.
 */
export function clearChatMessages() {
  if (elements.chatMessages) {
    clearElement(elements.chatMessages);
  }
}

/**
 * Función para mostrar un indicador de carga
 */
export function showLoading(message = 'Cargando...') {
  const safeMessage = sanitizeText(message);

  const spinner = createElement('div', { className: 'loading-spinner' });
  const messageP = createElement('p', {}, safeMessage);

  const loadingOverlay = createElement('div', { className: 'loading-overlay' }, [spinner, messageP]);

  document.body.appendChild(loadingOverlay);

  // Asegurar que esté visible con animación fluida
  requestAnimationFrame(() => {
    addClass(loadingOverlay, 'visible');
  });
}

/**
 * Oculta el indicador de carga
 */
export function hideLoading() {
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    removeClass(loadingOverlay, 'visible');
    setManagedTimeout(() => {
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }, 300, 'hide-loading');
  }
}
/**
 * Ajusta dinámicamente la altura del textarea y contenedor.
 * @param {Event} event - Evento de input
 */
export function handleTextareaResize(event) {
  const textarea = event.target;
  const container = elements.container;

  if (!textarea || !container) return;

  // Temporarily disable transitions to prevent jarring animation
  container.style.transition = 'none';
  textarea.style.transition = 'none';

  // Reset height to calculate actual content height
  textarea.style.height = 'auto';

  // Calculate actual content height
  const contentHeight = textarea.scrollHeight;

  // Determine textarea height with constraints
  const textareaHeight = Math.min(
    contentHeight,
    UI_CONFIG.maxTextareaHeight
  );

  // Set textarea height
  textarea.style.height = `${textareaHeight}px`;

  // Manage textarea overflow
  textarea.style.overflowY = contentHeight > UI_CONFIG.maxTextareaHeight
    ? 'auto'
    : 'hidden';

  // Calculate container height with smooth expansion logic
  const containerPadding = 20;
  const newContainerHeight = Math.min(
    Math.max(
      UI_CONFIG.initialContainerHeight,
      textareaHeight + containerPadding
    ),
    UI_CONFIG.maxContainerHeight
  );

  // Smoothly update container height
  requestAnimationFrame(() => {
    container.style.height = `${newContainerHeight}px`;

    // Restore transitions after a brief moment
    setTimeout(() => {
      container.style.transition = '';
      textarea.style.transition = '';
    }, 50);
  });
}
/**
 * Configura los event listeners para los elementos de la interfaz.
 */
export function setupUIEventListeners() {
  if (elements.textarea) {
    addEvent(elements.textarea, "input", handleTextareaResize);
  }
}

/**
 * Configura los event listeners para scroll inteligente
 */
export function setupScrollBehavior() {
  const chatMessages = elements.chatMessages;
  if (!chatMessages) return;

  let userScrollTimeoutId;

  addEvent(chatMessages, 'scroll', () => {
    const isResponseInteractionActive = () => {
      return (
        document.querySelector('.message.editing-message') !== null ||
        document.querySelector('.feedback-modal') !== null ||
        document.querySelector('.edit-overlay') !== null
      );
    };

    // No modificar el estado de scroll durante interacciones de respuesta
    if (isResponseInteractionActive()) {
      return;
    }

    // Si el usuario hace scroll manualmente lejos del fondo
    if (!scrollManager.isNearBottom(150)) {
      scrollManager.lockScroll();

      if (userScrollTimeoutId) {
        clearManagedTimeouts('user-scroll');
      }

      // Programar desbloqueo automático después de inactividad
      userScrollTimeoutId = setManagedTimeout(() => {
        // No desbloquear si hay una interacción de respuesta activa
        if (isResponseInteractionActive()) {
          return;
        }

        // Si el usuario está cerca del fondo después del timeout, desbloquear
        if (scrollManager.isNearBottom(50)) {
          scrollManager.unlockScroll();
        }
      }, 5000, 'user-scroll');
    } else {
      // Si está cerca del fondo, desbloquear
      scrollManager.unlockScroll();
    }
  });

  addEvent(document, 'keydown', (e) => {
    const isResponseInteractionActive = () => {
      return (
        document.querySelector('.message.editing-message') !== null ||
        document.querySelector('.feedback-modal') !== null ||
        document.querySelector('.edit-overlay') !== null
      );
    };

    // No modificar el estado de scroll durante interacciones de respuesta
    if (isResponseInteractionActive()) {
      return;
    }

    const isScrollKey = [
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'
    ].includes(e.code);

    if (isScrollKey && document.activeElement !== elements.textarea) {
      // Si se presiona una tecla de scroll mientras se está cerca del fondo
      if (scrollManager.isNearBottom(150)) {
        scrollManager.unlockScroll();
      } else {
        scrollManager.lockScroll(3000); // Bloquear por 3 segundos
      }
    }
  });
}

/**
 * Muestra un diálogo de confirmación personalizado usando el sistema centralizado de modals.js
 * @param {string} message - Mensaje a mostrar
 * @param {Function} onConfirm - Función a ejecutar si el usuario confirma
 * @param {Function} onCancel - Función a ejecutar si el usuario cancela
 */
export function showConfirmation(title, message, onConfirm, onCancel = null) {
  showConfirmationModal(message)
    .then(confirmed => {
      if (confirmed && onConfirm) {
        onConfirm();
      } else if (!confirmed && onCancel) {
        onCancel();
      }
    });
}


/**
 * Aplica un skeleton loading en el encabezado
 */
export function applyHeaderSkeleton() {
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (!headerSubtitle) return;

  if (!headerSubtitle.getAttribute('data-original-text')) {
    headerSubtitle.setAttribute('data-original-text', headerSubtitle.textContent);
  }

  addClass(headerSubtitle, 'skeleton-text');
  clearElement(headerSubtitle);

  const skeletonLine = createElement('span', { className: 'skeleton-line' });
  headerSubtitle.appendChild(skeletonLine);
}

/**
 * Elimina el skeleton loading del encabezado
 */
export function removeHeaderSkeleton() {
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (!headerSubtitle) return;

  removeClass(headerSubtitle, 'skeleton-text');

  // Si no hay contenido actual pero había contenido original, restaurarlo
  if (headerSubtitle.textContent.trim() === '' && headerSubtitle.getAttribute('data-original-text')) {
    headerSubtitle.textContent = headerSubtitle.getAttribute('data-original-text');
  }
}

/**
 * Aplica un skeleton loading en los mensajes
 */
export function applyMessagesSkeleton() {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;

  chatMessages.querySelectorAll('.skeleton-message').forEach(el => el.remove());

  // Contenedor para mensajes skeleton
  const skeletonContainer = createElement('div', { className: 'skeleton-container' });

  for (let i = 0; i < 3; i++) {
    let skeletonMessage;

    if (i % 2 === 0) {
      // Mensaje del AI
      const avatar = createElement('div', { className: 'skeleton-avatar' });

      const lines = [];
      for (let j = 0; j < 4; j++) {
        lines.push(createElement('div', { className: 'skeleton-message-line' }));
      }

      const content = createElement('div', { className: 'skeleton-message-content' }, lines);

      skeletonMessage = createElement('div',
        { className: 'skeleton-message ai-skeleton' },
        [avatar, content]
      );
    } else {
      // Mensaje del usuario
      const lines = [];
      for (let j = 0; j < 2; j++) {
        lines.push(createElement('div', { className: 'skeleton-message-line' }));
      }

      const content = createElement('div', { className: 'skeleton-message-content' }, lines);

      skeletonMessage = createElement('div',
        { className: 'skeleton-message user-skeleton' },
        [content]
      );
    }

    skeletonContainer.appendChild(skeletonMessage);
  }

  chatMessages.appendChild(skeletonContainer);
}

/**
 * Elimina el skeleton loading de los mensajes
 */
export function removeMessagesSkeleton() {
  const skeletonContainer = document.querySelector('.skeleton-container');
  if (!skeletonContainer) return;

  // Animación de desvanecimiento antes de eliminar
  skeletonContainer.style.opacity = '0';
  setManagedTimeout(() => {
    if (skeletonContainer.parentNode) {
      skeletonContainer.parentNode.removeChild(skeletonContainer);
    }
  }, 300, 'remove-skeleton');
}

/**
 * Aplica el cargador inicial de la aplicación
 */
export function applyInitialLoader() {
  // Si ya existe, no crear otro
  if (document.querySelector('.acadel-biblioteca-loader')) return;

  const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
    localStorage.getItem('theme') === 'dark';
  const logoPath = isDarkTheme
    ? '/images/Papeles_oscuro.gif'
    : '/images/Papeles_claro.gif';

  // Mensajes de la biblioteca digital del Profesor Acadel
  const mensajesBiblioteca = [
    "🦫 Organizando mi biblioteca digital personal...",
    "📚 Catalogando documentos en mi archivo cuántico...",
    "🗂️ Preparando estantes para tus PDFs favoritos...",
    "📖 Limpiando el polvo de mis documentos más preciados...",
    "🔍 Configurando mi sistema de búsqueda de documentos...",
    "📑 Ordenando mis apuntes por orden de importancia...",
    "🗃️ Sincronizando mi base de datos bibliográfica...",
    "📄 Preparando lectores de texto más avanzados...",
    "📋 Actualizando mi índice personal de conocimiento...",
    "🏛️ Abriendo las puertas de mi archivo académico...",
    "📓 Clasificando documentos por nivel de complejidad...",
    "🦫 Calibrando mi analizador de texto de capibara..."
  ];

  // Pasos de organización de la biblioteca
  const pasosOrganizacion = [
    "Ordenando estantes de la biblioteca",
    "Catalogando documentos académicos",
    "Preparando sistema de análisis textual"
  ];

  // Mensaje inicial aleatorio
  const mensajeInicial = mensajesBiblioteca[Math.floor(Math.random() * mensajesBiblioteca.length)];

  const logo = createElement('img', {
    src: logoPath,
    alt: 'Profesor Acadel - Bibliotecario',
    className: 'acadel-bibliotecario-avatar'
  });

  const mensajeContainer = createElement('div', {
    className: 'acadel-mensaje-container'
  });

  const loaderText = createElement('div',
    { className: 'acadel-biblioteca-text' },
    mensajeInicial
  );

  // Contenedor de progreso bibliográfico
  const progressContainer = createElement('div', {
    className: 'acadel-catalogo-container'
  });

  const progressBar = createElement('div', {
    className: 'acadel-catalogo-bar',
    id: 'acadelCatalogoProgress'
  });

  const progressLabel = createElement('div', {
    className: 'acadel-catalogo-label'
  }, '📖 Catalogando documentos: ');

  const progressPercent = createElement('span', {
    className: 'acadel-catalogo-percent',
    id: 'acadelCatalogoPercent'
  }, '0%');

  progressContainer.appendChild(progressLabel);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressPercent);

  const stepsContainer = createElement('div', {
    className: 'acadel-biblioteca-steps'
  });

  pasosOrganizacion.forEach((texto, index) => {
    const step = createElement('div', {
      className: 'acadel-step',
      dataset: { step: index + 1 }
    });

    const stepIcon = createElement('span', {
      className: 'acadel-step-icon'
    }, '📚');

    const stepText = createElement('span', {
      className: 'acadel-step-text'
    }, texto);

    step.appendChild(stepIcon);
    step.appendChild(stepText);
    stepsContainer.appendChild(step);
  });

  // Frase del bibliotecario
  const fraseBibliotecario = createElement('div', {
    className: 'acadel-frase-bibliotecario'
  }, '"Los documentos son como vinos añejos: mientras más tiempo los tengo organizados, mejor comprendo su verdadero valor académico." 🦫📖');

  // Ensamblar la biblioteca
  mensajeContainer.appendChild(loaderText);

  const content = createElement('div',
    { className: 'acadel-biblioteca-content' },
    [logo, mensajeContainer, progressContainer, stepsContainer, fraseBibliotecario]
  );

  const bibliotecaLoader = createElement('div',
    { className: 'acadel-biblioteca-loader' },
    content
  );

  document.body.appendChild(bibliotecaLoader);

  // Estado global de la biblioteca
  window.acadelBibliotecaState = {
    progress: 0,
    phase: 1,
    startTime: Date.now(),
    ready: false,
    mensajes: mensajesBiblioteca,
    mensajeActual: 0,
    intervalosActivos: [],
    dustEffectActive: false
  };

  // Rotación de mensajes bibliotecarios
  const intervaloMensajes = setInterval(() => {
    window.acadelBibliotecaState.mensajeActual =
      (window.acadelBibliotecaState.mensajeActual + 1) % mensajesBiblioteca.length;

    const nuevoMensaje = mensajesBiblioteca[window.acadelBibliotecaState.mensajeActual];
    loaderText.textContent = nuevoMensaje;

    // Efecto de organización
    loaderText.classList.add('organizando');
    setTimeout(() => {
      loaderText.classList.remove('organizando');
    }, 600);

    // Efecto de polvo de libros aleatorio
    if (Math.random() > 0.6) {
      createBookDustEffect();
    }

  }, 3500);

  window.acadelBibliotecaState.intervalosActivos.push(intervaloMensajes);

  // Progreso inicial
  updateAcadelBibliotecaProgress(5);

  // Precargar recursos
  preloadCriticalResources();

  setTimeout(() => {
    const firstStep = document.querySelector('.acadel-step[data-step="1"]');
    if (firstStep) {
      addClass(firstStep, 'active');
      firstStep.querySelector('.acadel-step-icon').textContent = '📖';
      createBookDustEffect();
    }
  }, 500);

  // Documentos flotantes
  setTimeout(() => {
    createFloatingDocuments();
  }, 1200);

  console.log('🦫 Profesor Acadel: Biblioteca digital inicializada');
}

/**
 * Actualiza el progreso de catalogación
 */
export function updateAcadelBibliotecaProgress(progress) {
  if (!window.acadelBibliotecaState) return;

  window.acadelBibliotecaState.progress = Math.max(window.acadelBibliotecaState.progress, progress);

  let phase;
  let descripcion = '';

  if (progress < 30) {
    phase = 1;
    descripcion = 'organizando estantes bibliográficos';
  } else if (progress < 70) {
    phase = 2;
    descripcion = 'catalogando documentos académicos';
  } else {
    phase = 3;
    descripcion = 'preparando análisis textual avanzado';
  }

  window.acadelBibliotecaState.phase = phase;

  document.querySelectorAll('.acadel-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    const icon = step.querySelector('.acadel-step-icon');

    if (stepNum <= phase) {
      addClass(step, 'active');

      // Al 100%, todos los pasos completados
      if (window.acadelBibliotecaState.progress >= 100) {
        icon.textContent = '✅';
        removeClass(step, 'current');
        addClass(step, 'completed');
      } else if (stepNum === phase) {
        // Paso actual en progreso
        icon.textContent = '📋';
        addClass(step, 'current');
        removeClass(step, 'completed');
      } else {
        // Pasos anteriores completados
        icon.textContent = '✅';
        removeClass(step, 'current');
        addClass(step, 'completed');
      }
    } else {
      // Pasos futuros inactivos
      removeClass(step, 'active');
      removeClass(step, 'current');
      removeClass(step, 'completed');
      icon.textContent = '📚';
    }
  });

  const progressBar = document.getElementById('acadelCatalogoProgress');
  const progressPercent = document.getElementById('acadelCatalogoPercent');
  const progressLabel = document.querySelector('.acadel-catalogo-label');

  if (progressBar && progressPercent) {
    progressBar.style.width = `${window.acadelBibliotecaState.progress}%`;
    progressPercent.textContent = `${Math.round(window.acadelBibliotecaState.progress)}%`;

    if (progressLabel) {
      if (progress >= 100) {
        progressLabel.textContent = '🎯 Biblioteca completa: ';
      } else {
        progressLabel.textContent = `📖 ${descripcion}: `;
      }
    }

    // Efectos de polvo en hitos importantes
    if (progress === 50 || progress === 75 || progress === 90 || progress === 100) {
      createBookDustEffect();
    }
  }
}

/**
 * Crea efecto de polvo de libros
 */
function createBookDustEffect() {
  if (!window.acadelBibliotecaState || window.acadelBibliotecaState.dustEffectActive) return;

  window.acadelBibliotecaState.dustEffectActive = true;

  const loader = document.querySelector('.acadel-biblioteca-loader');
  if (!loader) {
    window.acadelBibliotecaState.dustEffectActive = false;
    return;
  }

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const bookDust = createElement('div', {
        className: 'book-dust-effect'
      });

      // Posición aleatoria
      bookDust.style.left = (Math.random() * 80 + 10) + '%';
      bookDust.style.top = (Math.random() * 60 + 20) + '%';

      loader.appendChild(bookDust);

      setTimeout(() => {
        if (bookDust.parentNode) {
          bookDust.parentNode.removeChild(bookDust);
        }
      }, 1200);
    }, i * 200);
  }

  setTimeout(() => {
    if (window.acadelBibliotecaState) {
      window.acadelBibliotecaState.dustEffectActive = false;
    }
  }, 2000);
}

/**
 * Crea documentos flotantes
 */
function createFloatingDocuments() {
  const documents = [
    '📄', '📑', '📋', '📝', '📖', '📚', '🗂️', '📁', '🗃️', '📊'
  ];

  const loader = document.querySelector('.acadel-biblioteca-loader');
  if (!loader) return;

  documents.forEach((doc, index) => {
    setTimeout(() => {
      const documento = createElement('div', {
        className: 'floating-document'
      }, doc);

      documento.style.left = Math.random() * 90 + '%';
      documento.style.animationDelay = Math.random() * 2 + 's';
      documento.style.animationDuration = (4 + Math.random() * 3) + 's';

      loader.appendChild(documento);

      setTimeout(() => {
        if (documento.parentNode) {
          documento.parentNode.removeChild(documento);
        }
      }, 7000);
    }, index * 1000);
  });

  // Repetir documentos cada 15 segundos
  setTimeout(() => {
    if (window.acadelBibliotecaState && !window.acadelBibliotecaState.ready) {
      createFloatingDocuments();
    }
  }, 15000);
}

/**
 * Forzar completar todos los pasos
 */
export function completeAllAcadelSteps() {
  document.querySelectorAll('.acadel-step').forEach((step, index) => {
    const icon = step.querySelector('.acadel-step-icon');

    addClass(step, 'active');
    addClass(step, 'completed');
    removeClass(step, 'current');

    setTimeout(() => {
      icon.textContent = '✅';

      // Efecto de polvo al completar último paso
      if (index === 2) {
        createBookDustEffect();
      }
    }, index * 200);
  });
}

/**
 * Remueve el loading de la biblioteca
 */
export function removeAcadelBibliotecaLoader(forceRemove = false) {
  const bibliotecaLoader = document.querySelector('.acadel-biblioteca-loader');
  if (!bibliotecaLoader) return;

  if (window.acadelBibliotecaState?.intervalosActivos) {
    window.acadelBibliotecaState.intervalosActivos.forEach(clearInterval);
  }

  // Mensaje final
  const loaderText = bibliotecaLoader.querySelector('.acadel-biblioteca-text');
  if (loaderText) {
    loaderText.textContent = '🏛️ ¡Biblioteca lista! Tu archivo digital está organizado 🦫📚';
  }

  // Asegurar que todos los pasos estén completados
  if (window.acadelBibliotecaState) {
    window.acadelBibliotecaState.ready = true;

    // Forzar 100% y completar todos los pasos
    updateAcadelBibliotecaProgress(100);

    // Doble verificación: forzar completar pasos
    setTimeout(() => {
      completeAllAcadelSteps();
    }, 100);

    const progressLabel = document.querySelector('.acadel-catalogo-label');
    if (progressLabel) {
      progressLabel.textContent = '🎯 Archivo Completo = ';
    }
  }

  // Efecto final de polvo
  setTimeout(() => {
    createBookDustEffect();
  }, 400);

  // Transición de salida
  addClass(bibliotecaLoader, 'fade-out-biblioteca');

  setManagedTimeout(() => {
    if (bibliotecaLoader.parentNode) {
      bibliotecaLoader.parentNode.removeChild(bibliotecaLoader);
    }
    console.log('🦫 Profesor Acadel: ¡Biblioteca digital cerrada y organizada!');
  }, 1500, 'remove-biblioteca-loader');
}

/**
 * Actualiza el progreso del cargador inicial
 */
export function updateLoaderProgress(progress) {
  return updateAcadelBibliotecaProgress(progress);
}

/**
 * Precarga recursos críticos para la UI
 */
function preloadCriticalResources() {
  const criticalImages = [
    '/images/Pensando_claro.gif',
    '/images/Pensando_oscuro.gif'
  ];

  let loaded = 0;
  criticalImages.forEach(src => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      updateAcadelBibliotecaProgress(10 + (loaded / criticalImages.length * 15));
    };
    img.src = src;
  });
}

/**
 * Elimina el cargador inicial
 */
export function removeInitialLoader(forceRemove = false) {
  return removeAcadelBibliotecaLoader(forceRemove);
}

/**
 * Aplica el skeleton de cambio de chat
 */
export function applyChatSwitchSkeleton() {
  if (window.isApplyingChatSkeleton) {
    console.log('⚠️ Prevención: Ya se está aplicando skeleton de chat');
    return;
  }

  const existingOverlays = document.querySelectorAll('.chat-switch-overlay');
  if (existingOverlays.length > 0) {
    console.log('⚠️ Prevención: Ya existe skeleton de chat activo');
    return;
  }

  console.log('Aplicando skeleton de cambio de chat');

  window.isApplyingChatSkeleton = true;

  const spinner = createElement('div', { className: 'chat-switch-spinner' });
  const text = createElement('div', { className: 'chat-switch-text' }, 'Cambiando de chat...');

  const spinnerContainer = createElement('div',
    { className: 'chat-switch-spinner-container' },
    [spinner, text]
  );

  const overlay = createElement('div', {
    className: 'chat-switch-overlay',
    id: 'chat-switch-overlay-' + Date.now(),
    style: 'z-index:9999;'
  }, spinnerContainer);

  document.body.appendChild(overlay);

  // Forzar reflow y activar con delay mínimo para evitar problemas de timing
  requestAnimationFrame(() => {
    addClass(overlay, 'active');
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    addClass(chatMessages, 'switching');
  }

  applyHeaderSkeleton();

  if (!window.chatSwitchStartTime) {
    window.chatSwitchStartTime = Date.now();
    console.log('🕒 Timestamp de inicio de skeleton establecido:', window.chatSwitchStartTime);
  }

  overlay.timeoutId = setManagedTimeout(() => {
    console.warn('⏰ Timeout de seguridad activado para skeleton de cambio de chat');
    removeChatSwitchSkeleton(true); // Forzar eliminación
  }, 15000, 'chat-switch-safety');

  setTimeout(() => {
    window.isApplyingChatSkeleton = false;
  }, 100);
}

export function emergencyCleanupChatSkeleton() {
  console.log('🚨 Limpieza de emergencia de skeleton de chat');

  const allOverlays = document.querySelectorAll('.chat-switch-overlay, .loading-skeleton');
  allOverlays.forEach(overlay => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    removeClass(chatMessages, 'switching');
  }

  removeHeaderSkeleton();

  window.chatSwitchStartTime = null;
  window.isRemovingChatSkeleton = false;
  window.isApplyingChatSkeleton = false;

  console.log('✅ Limpieza de emergencia completada');
}

/**
 * Elimina el skeleton de cambio de chat - VERSIÓN CORREGIDA SIN BUCLES
 */
export function removeChatSwitchSkeleton(forceRemove = false) {
  if (window.isRemovingChatSkeleton && !forceRemove) {
    console.log('⚠️ Prevención de bucle: Ya se está removiendo skeleton');
    return;
  }

  if (!forceRemove) {
    window.isRemovingChatSkeleton = true;
  }

  const overlays = document.querySelectorAll('.chat-switch-overlay');

  if (overlays.length === 0) {
    console.log('ℹ️ No hay skeleton para remover');

    // Aún así, restaurar estado de mensajes por seguridad
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      removeClass(chatMessages, 'switching');
    }

    removeHeaderSkeleton();

    window.isRemovingChatSkeleton = false;
    window.chatSwitchStartTime = null;

    return;
  }

  let elapsedTime = 0;
  const minDisplayTime = 800;

  if (window.chatSwitchStartTime) {
    elapsedTime = Date.now() - window.chatSwitchStartTime;
    console.log(`⏱️ Tiempo transcurrido desde skeleton: ${elapsedTime}ms`);
  } else {
    console.warn('⚠️ No hay timestamp de inicio, procediendo con eliminación inmediata');
    elapsedTime = minDisplayTime; // Forzar eliminación inmediata
  }

  if (elapsedTime < minDisplayTime && !forceRemove) {
    const remainingTime = minDisplayTime - elapsedTime;
    console.log(`⏳ Esperando ${remainingTime}ms adicionales para quitar skeleton`);

    setTimeout(() => {
      const stillExistingOverlays = document.querySelectorAll('.chat-switch-overlay');
      if (stillExistingOverlays.length > 0) {
        removeChatSwitchSkeleton(true); // Forzar eliminación después del tiempo de espera
      }
    }, remainingTime);

    setTimeout(() => {
      const emergencyOverlays = document.querySelectorAll('.chat-switch-overlay');
      if (emergencyOverlays.length > 0) {
        console.warn('🚨 Timeout de emergencia: Eliminando skeleton forzadamente');
        removeChatSwitchSkeleton(true);
      }
    }, minDisplayTime + 2000); // 2 segundos adicionales como emergencia

    return;
  }

  console.log('✅ Quitando skeleton de cambio de chat');

  overlays.forEach((overlay, index) => {
    if (overlay.timeoutId) {
      clearTimeout(overlay.timeoutId);
    }

    // Programar eliminación inmediata o con pequeño retraso
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        removeClass(overlay, 'active');

        setTimeout(() => {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 400);
      }
    }, index * 50);
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    removeClass(chatMessages, 'switching');
  }

  removeHeaderSkeleton();

  window.chatSwitchStartTime = null;
  window.isRemovingChatSkeleton = false;
  window.isApplyingChatSkeleton = false;

  console.log('🎯 Skeleton de cambio de chat eliminado completamente');
}


// Se mantiene la exportación por defecto
export default {
  initializeElements,
  getElement,
  showError,
  showSuccess,
  toggleUIState,
  clearChatMessages,
  handleTextareaResize,
  setupUIEventListeners,
  setupScrollBehavior,
  showConfirmation,
  showNotification,
  setHandleSendMessage,
  showLoading,
  hideLoading,
  applyHeaderSkeleton,
  removeHeaderSkeleton,
  applyInitialLoader,
  removeInitialLoader,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton
};