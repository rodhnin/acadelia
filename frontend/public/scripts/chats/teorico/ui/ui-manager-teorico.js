/**
 * ui-manager.js - Gestión general de la interfaz de usuario
 */

import { DOM_SELECTORS, UI_CONFIG, getCurrentVariant, getAppConfig } from '../core/config-teorico.js';
import { setProcessingState, getState } from '../core/state-teorico.js';
import scrollManager from '../../shared/scroll-manager.js';
import { showConfirmationModal } from './modals-teorico.js';
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
} from '../../shared/dom-helpers.js';

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
  // ⭐ NUEVO: Verificar si hay un mensaje siendo procesado actualmente
  const isProcessingMessage = () => {
    return document.querySelector('.ai-message.processing') !== null;
  };

  // ⭐ NUEVO: Encontrar el último mensaje de usuario
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

  // ⭐ CORREGIDO: Rehabilitar botones de edición de usuario CON EXCEPCIÓN
  const userActions = document.querySelectorAll('.user-response-actions');
  userActions.forEach(container => {
    const userMessage = container.closest('.user-message');

    // ⭐ CRÍTICO: NO rehabilitar el último mensaje si se está procesando
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

/**
 * Cambia el estado de la interfaz (habilitar/deshabilitar textarea y botón).
 * Versión actualizada que cambia el botón de enviar por uno de cancelar.
 * ⭐ CORREGIDO: Ahora refresca el estado de botones al habilitar
 * 
 * @param {boolean} disabled - true para deshabilitar.
 */
export function toggleUIState(disabled) {
  if (!disabled && isCancellationInProgress) {
    return; // SALIR SIN HACER NADA
  }

  if (!elements.sendButton || !elements.textarea) {
    return;
  }

  // ⭐ NUEVA FUNCIONALIDAD: Deshabilitar/habilitar botones de interacción ⭐
  if (disabled) {
    disableInteractionButtons();
  } else {
    enableInteractionButtons();

    // ⭐ NUEVO: Refrescar estado de botones después de habilitar
    setTimeout(async () => {
      try {
        const { refreshButtonsState } = await import('../utils/response-interaction-teorico.js');
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

      // VERIFICACIÓN SÚPER SIMPLE: Si ya tiene botones, es respuesta real
      const hasResponseButtons = loadingMessage.querySelector('.response-actions');

      if (hasResponseButtons) {
        console.log('✅ [CANCEL] Mensaje con botones detectado - preservando respuesta real');

        // Solo limpiar estado de loading y restaurar botón
        loadingMessage.classList.remove('processing');
        loadingMessage.removeAttribute('data-is-loading');

        restoreButtonFromLoading();

        setTimeout(() => {
          isCancellationInProgress = false;
          toggleUIState(false);
        }, 100);

        return; // ✅ SALIR SIN APLICAR CLASES DE CANCELACIÓN
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
      }, 6000);

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

    // TIMEOUT PRINCIPAL: Restaurar UI después de 7 segundos
    setTimeout(() => {
      isCancellationInProgress = false;
      toggleUIState(false);
    }, 7000);
  }
}

// ====== NUEVAS FUNCIONES AUXILIARES ======
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
 * LOADING TEÓRICO DEL PROFESOR ACADEL - BIBLIOTECA ACADÉMICA RESPONSIVA
 * Versión especializada para teorías de medicina, historia, psicología, etc.
 */

/**
 * Aplica el cargador de la biblioteca académica del Profesor Acadel
 */
export function applyInitialLoader() {
  // Si ya existe, no crear otro
  if (document.querySelector('.acadel-library-loader')) return;

  const currentVariant = getCurrentVariant();
  const appConfig = getAppConfig();

  const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
    localStorage.getItem('theme') === 'dark';
  const logoPath = isDarkTheme
    ? '/images/Papeles_oscuro.gif'
    : '/images/Papeles_claro.gif';

  // Mensajes teóricos del Profesor Acadel
  const mensajesTeoricoAcadel = [
    "🦫 Consultando las teorías más profundas del conocimiento humano...",
    "📚 Revisando tratados de medicina, historia y psicología...",
    "🔍 Analizando conexiones entre disciplinas académicas...",
    "📜 Desempolvando pergaminos de sabiduría ancestral...",
    "🧠 Procesando teorías cognitivas y conductuales...",
    "⚗️ Mezclando hipótesis científicas con evidencia empírica...",
    "🏛️ Explorando los fundamentos de las ciencias sociales...",
    "📖 Compilando enciclopedias de conocimiento teórico...",
    "🎓 Organizando las mejores metodologías de investigación...",
    "🔬 Validando paradigmas científicos contemporáneos...",
    "📝 Sintetizando marcos teóricos interdisciplinarios...",
    "🌟 Conectando teoría clásica con práctica moderna..."
  ];

  // Pasos académicos creativos
  const pasosAcademicos = [
    "Catalogando fuentes bibliográficas",
    "Sintetizando marcos teóricos",
    "Aplicando metodología científica"
  ];

  // Mensaje inicial aleatorio
  const mensajeInicial = mensajesTeoricoAcadel[Math.floor(Math.random() * mensajesTeoricoAcadel.length)];

  const logo = createElement('img', {
    src: logoPath,
    alt: 'Profesor Acadel',
    className: 'acadel-library-avatar'
  });

  const mensajeContainer = createElement('div', {
    className: 'acadel-library-mensaje-container'
  });

  const loaderText = createElement('div',
    { className: 'acadel-library-text' },
    mensajeInicial
  );

  // Contenedor de progreso académico
  const progressContainer = createElement('div', {
    className: 'acadel-library-progress-container'
  });

  const progressBar = createElement('div', {
    className: 'acadel-library-progress-bar',
    id: 'acadelLibraryProgress'
  });

  const progressFormula = createElement('div', {
    className: 'acadel-library-progress-formula'
  }, '📚 Conocimiento = ');

  const progressPercent = createElement('span', {
    className: 'acadel-library-progress-percent',
    id: 'acadelLibraryPercent'
  }, '0%');

  progressContainer.appendChild(progressFormula);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressPercent);

  const stepsContainer = createElement('div', {
    className: 'acadel-library-steps-container'
  });

  pasosAcademicos.forEach((texto, index) => {
    const step = createElement('div', {
      className: 'acadel-library-step',
      dataset: { step: index + 1 }
    });

    const stepIcon = createElement('span', {
      className: 'acadel-library-step-icon'
    }, '📖');

    const stepText = createElement('span', {
      className: 'acadel-library-step-text'
    }, texto);

    step.appendChild(stepIcon);
    step.appendChild(stepText);
    stepsContainer.appendChild(step);
  });

  // Frase motivacional académica
  const fraseAcademica = createElement('div', {
    className: 'acadel-library-frase-motivacional'
  }, '"La teoría sin práctica es estéril, pero la práctica sin teoría es ciega... ¡Por suerte soy un capibara que domina ambas!" 🦫');

  // Ensamblar contenido de la biblioteca
  mensajeContainer.appendChild(loaderText);

  const content = createElement('div',
    { className: 'acadel-library-content' },
    [logo, mensajeContainer, progressContainer, stepsContainer, fraseAcademica]
  );

  const initialLoader = createElement('div',
    { className: 'acadel-library-loader' },
    content
  );

  initialLoader.setAttribute('data-variant', currentVariant);
  document.body.appendChild(initialLoader);

  // Estado global del Profesor Acadel teórico
  window.acadelLibraryState = {
    progress: 0,
    phase: 1,
    startTime: Date.now(),
    ready: false,
    mensajes: mensajesTeoricoAcadel,
    mensajeActual: 0,
    intervalosActivos: [],
    bookEffectActive: false
  };

  const intervaloMensajes = setInterval(() => {
    window.acadelLibraryState.mensajeActual =
      (window.acadelLibraryState.mensajeActual + 1) % mensajesTeoricoAcadel.length;

    const nuevoMensaje = mensajesTeoricoAcadel[window.acadelLibraryState.mensajeActual];
    loaderText.textContent = nuevoMensaje;

    // Efecto de lectura académica
    loaderText.classList.add('estudiando');
    setTimeout(() => {
      loaderText.classList.remove('estudiando');
    }, 600);

    // Efecto de libros aleatorio al cambiar mensaje
    if (Math.random() > 0.6) {
      createBookEffect();
    }

  }, 3500); // Cada 3.5 segundos

  window.acadelLibraryState.intervalosActivos.push(intervaloMensajes);

  // Progreso inicial
  updateAcadelLibraryProgress(5);

  // Precargar recursos
  preloadCriticalResources();

  setTimeout(() => {
    const firstStep = document.querySelector('.acadel-library-step[data-step="1"]');
    if (firstStep) {
      addClass(firstStep, 'active');
      firstStep.querySelector('.acadel-library-step-icon').textContent = '⚡';
      createBookEffect(); // Efecto de libros al activar primer paso
    }
  }, 500);

  // Teorías flotantes
  setTimeout(() => {
    createFloatingTheories();
  }, 1200);

  console.log('🦫 Profesor Acadel: Biblioteca académica inicializada');
}

/**
 * Actualiza el progreso con efectos de biblioteca
 */
export function updateAcadelLibraryProgress(progress) {
  if (!window.acadelLibraryState) return;

  window.acadelLibraryState.progress = Math.max(window.acadelLibraryState.progress, progress);

  let phase;
  let formula = '';

  if (progress < 30) {
    phase = 1;
    formula = 'Teoría = investigación × método';
  } else if (progress < 70) {
    phase = 2;
    formula = 'Conocimiento = ∑(evidencia + análisis)';
  } else {
    phase = 3;
    formula = 'Sabiduría = lim(experiencia → ∞)';
  }

  window.acadelLibraryState.phase = phase;

  document.querySelectorAll('.acadel-library-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    const icon = step.querySelector('.acadel-library-step-icon');

    if (stepNum <= phase) {
      addClass(step, 'active');

      if (window.acadelLibraryState.progress >= 100) {
        // Al 100%, TODOS los pasos están completados
        icon.textContent = '✅';
        removeClass(step, 'current');
        addClass(step, 'completed');
      } else if (stepNum === phase) {
        // Paso actual en progreso
        icon.textContent = '🔄';
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
      icon.textContent = '📖';
    }
  });

  const progressBar = document.getElementById('acadelLibraryProgress');
  const progressPercent = document.getElementById('acadelLibraryPercent');
  const progressFormula = document.querySelector('.acadel-library-progress-formula');

  if (progressBar && progressPercent) {
    progressBar.style.width = `${window.acadelLibraryState.progress}%`;
    progressPercent.textContent = `${Math.round(window.acadelLibraryState.progress)}%`;

    if (progressFormula) {
      if (progress >= 100) {
        progressFormula.textContent = '🎯 Éxito Académico = ';
      } else {
        progressFormula.textContent = formula + ' = ';
      }
    }

    // Efectos de libros en hitos importantes
    if (progress === 50 || progress === 75 || progress === 90 || progress === 100) {
      createBookEffect();
    }
  }

  if (progress >= 100) {
    setTimeout(() => {
      console.log('🦫 Acadel: ¡Toda la metodología científica aplicada exitosamente!');
    }, 300);
  }
}

/**
 * Crea efecto de libros volando (como polvo de libros)
 */
function createBookEffect() {
  if (!window.acadelLibraryState || window.acadelLibraryState.bookEffectActive) return;

  window.acadelLibraryState.bookEffectActive = true;

  const loader = document.querySelector('.acadel-library-loader');
  if (!loader) {
    window.acadelLibraryState.bookEffectActive = false;
    return;
  }

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const bookEffect = createElement('div', {
        className: 'acadel-book-effect'
      });

      // Posición aleatoria
      bookEffect.style.left = (Math.random() * 80 + 10) + '%';
      bookEffect.style.top = (Math.random() * 60 + 20) + '%';

      loader.appendChild(bookEffect);

      setTimeout(() => {
        if (bookEffect.parentNode) {
          bookEffect.parentNode.removeChild(bookEffect);
        }
      }, 1200);
    }, i * 200);
  }

  setTimeout(() => {
    if (window.acadelLibraryState) {
      window.acadelLibraryState.bookEffectActive = false;
    }
  }, 2000);
}

/**
 * Crea teorías flotantes académicas
 */
function createFloatingTheories() {
  const theories = [
    'Teoría', 'Hipótesis', 'Paradigma', 'Método', 'Evidencia', 'Análisis', 'Síntesis', 'Tesis', 'Axioma', 'Postulado'
  ];

  const loader = document.querySelector('.acadel-library-loader');
  if (!loader) return;

  theories.forEach((theory, index) => {
    setTimeout(() => {
      const theoryElement = createElement('div', {
        className: 'floating-theory'
      }, theory);

      theoryElement.style.left = Math.random() * 90 + '%';
      theoryElement.style.animationDelay = Math.random() * 2 + 's';
      theoryElement.style.animationDuration = (4 + Math.random() * 3) + 's';

      loader.appendChild(theoryElement);

      setTimeout(() => {
        if (theoryElement.parentNode) {
          theoryElement.parentNode.removeChild(theoryElement);
        }
      }, 7000);
    }, index * 1000);
  });

  // Repetir teorías cada 15 segundos
  setTimeout(() => {
    if (window.acadelLibraryState && !window.acadelLibraryState.ready) {
      createFloatingTheories();
    }
  }, 15000);
}

/**
 * NUEVA FUNCIÓN: Forzar completar todos los pasos teóricos
 */
export function completeAllAcadelLibrarySteps() {
  document.querySelectorAll('.acadel-library-step').forEach((step, index) => {
    const icon = step.querySelector('.acadel-library-step-icon');

    addClass(step, 'active');
    addClass(step, 'completed');
    removeClass(step, 'current');

    setTimeout(() => {
      icon.textContent = '✅';

      // Efecto de libros al completar cada paso
      if (index === 2) { // Último paso (metodología científica)
        createBookEffect();
      }
    }, index * 200);
  });
}

/**
 * Remueve el loading con transición académica
 */
export function removeAcadelLibraryLoader(forceRemove = false) {
  const initialLoader = document.querySelector('.acadel-library-loader');
  if (!initialLoader) return;

  if (window.acadelLibraryState?.intervalosActivos) {
    window.acadelLibraryState.intervalosActivos.forEach(clearInterval);
  }

  // Mensaje final
  const loaderText = initialLoader.querySelector('.acadel-library-text');
  if (loaderText) {
    loaderText.textContent = '🎓 ¡Biblioteca lista! Tu centro de conocimiento teórico está preparado 🦫📚';
  }

  if (window.acadelLibraryState) {
    window.acadelLibraryState.ready = true;

    // Forzar 100% y completar todos los pasos
    updateAcadelLibraryProgress(100);

    // Doble verificación: forzar completar pasos
    setTimeout(() => {
      completeAllAcadelLibrarySteps();
    }, 100);

    const progressFormula = document.querySelector('.acadel-library-progress-formula');
    if (progressFormula) {
      progressFormula.textContent = '🎯 Éxito Completo = ';
    }
  }

  // Efecto final de libros
  setTimeout(() => {
    createBookEffect();
  }, 400);

  // Transición de salida
  addClass(initialLoader, 'fade-out-library');

  setManagedTimeout(() => {
    if (initialLoader.parentNode) {
      initialLoader.parentNode.removeChild(initialLoader);
    }
    console.log('🦫 Profesor Acadel: ¡Toda la metodología completada y biblioteca cerrada!');
  }, 1500, 'remove-library-loader');
}

/**
 * Actualiza el progreso del cargador inicial
 */
export function updateLoaderProgress(progress) {
  return updateAcadelLibraryProgress(progress);
}

/**
 * Precarga recursos críticos para la UI
 */
function preloadCriticalResources() {
  const appConfig = getAppConfig();
  const criticalImages = [
    '/images/Pensando_claro.gif',
    '/images/Pensando_oscuro.gif'
  ];

  if (appConfig.assistantImagePath) {
    criticalImages.push(appConfig.assistantImagePath);
  }

  let loaded = 0;
  criticalImages.forEach(src => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      updateAcadelLibraryProgress(10 + (loaded / criticalImages.length * 15));
    };
    img.src = src;
  });
}

/**
 * Elimina el cargador inicial
 */
export function removeInitialLoader(forceRemove = false) {
  return removeAcadelLibraryLoader(forceRemove);
}

/**
 * Aplica el skeleton de cambio de chat
 */
export function applyChatSwitchSkeleton() {
  // Primero, eliminar cualquier overlay existente para evitar duplicados
  const existingOverlays = document.querySelectorAll('.chat-switch-overlay');
  if (existingOverlays.length > 0) {
    existingOverlays.forEach(overlay => {
      removeClass(overlay, 'active');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 100);
    });
  }

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

  overlay.timeoutId = setManagedTimeout(() => {
    removeChatSwitchSkeleton();
  }, 10000, 'chat-switch-safety');
}

/**
 * Elimina el skeleton de cambio de chat
 */
export function removeChatSwitchSkeleton() {
  const overlays = document.querySelectorAll('.chat-switch-overlay');

  if (overlays.length === 0) {
    // Aún así, restaurar estado de mensajes por seguridad
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      removeClass(chatMessages, 'switching');
    }

    removeHeaderSkeleton();

    return;
  }

  overlays.forEach((overlay, index) => {
    if (overlay.timeoutId) {
      clearTimeout(overlay.timeoutId);
    }

    // Programar eliminación con un pequeño retraso para overlay visual suave
    setTimeout(() => {
      removeClass(overlay, 'active');

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 400);
    }, index * 50);
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    removeClass(chatMessages, 'switching');
  }

  removeHeaderSkeleton();
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