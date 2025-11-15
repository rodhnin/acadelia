/**
 * ui-manager.js - Gestión general de la interfaz de usuario
 */

import { DOM_SELECTORS, UI_CONFIG, getCurrentVariant, getAppConfig } from '../core/config-matematico.js';
import { setProcessingState, getState } from '../core/state-matematico.js';
import scrollManager from '../../shared/scroll-manager.js';
import { handleSendMessage } from '../core/chat-controller-matematico.js';
import {
  createElement,
  addEvent,
  removeEvent,
  removeAllEvents,
  setManagedTimeout,
  clearManagedTimeouts,
  addClass,
  removeClass,
  clearElement
} from '../../shared/dom-helpers.js';
import modals from './modals-matematico.js';

/**
 * Referencias a elementos del DOM
 */
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
window.isCancellationInProgress = false;

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
 * @param {string} elementName - Nombre del elemento
 * @returns {HTMLElement} Elemento del DOM
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
 * Cambia el estado de la interfaz (habilitar/deshabilitar textarea y botón).
 * Versión actualizada que cambia el botón de enviar por uno de cancelar.
 * 
 * @param {boolean} disabled - true para deshabilitar.
 */
export function toggleUIState(disabled) {
  if (!disabled && window.isCancellationInProgress) {
    console.log("🚫 Bloqueando desbloqueo de UI - Cancelación en progreso");
    return; // SALIR SIN HACER NADA
  }

  if (!elements.sendButton || !elements.textarea) {
    return;
  }

  if (disabled) {
    disableInteractionButtons();
  } else {
    enableInteractionButtons();
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
    window._buttonChangeTime = Date.now();

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

      const timeSinceButtonChange = Date.now() - (window._buttonChangeTime || 0);

      // 150ms es más efectivo para detectar doble click real
      if (timeSinceButtonChange < 350) {
        console.log(`🚫 [CANCEL] Doble click detectado (${timeSinceButtonChange}ms). Ignorando.`);
        return;
      }

      const hasController = currentFetchController || window.currentAbortController;
      const isProcessing = getState('isProcessing');

      const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
      const minTimeout = isProduction ? 50 : 500;

      const hasAnyProcessingIndicator = hasController || isProcessing ||
        document.querySelector('.message.ai-message.processing') ||
        document.querySelector('.message .thought-bubble') ||
        document.querySelector('.message .typing-loader') ||
        elements.sendButton?.classList.contains('cancel-mode');

      if (hasAnyProcessingIndicator && timeSinceButtonChange > minTimeout) {
        console.log(`✅ [CANCEL] Cancelación válida después de ${timeSinceButtonChange}ms`);
        if (typeof cancelCurrentRequest === 'function') {
          cancelCurrentRequest();
        }
      } else {
        console.log(`🚫 [CANCEL] Cancelación rechazada:`, {
          hasIndicators: hasAnyProcessingIndicator,
          timeSinceChange: timeSinceButtonChange,
          minTimeout: minTimeout,
          isProduction
        });
      }
    });

  } else {
    window._buttonChangeTime = Date.now();

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

  // Rehabilitar botones de edición de usuario
  const userActions = document.querySelectorAll('.user-response-actions');
  userActions.forEach(container => {
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

  console.log('✅ Botones de interacción rehabilitados');
}


export function cancelCurrentRequest() {
  if (window._cancelInProgress) {
    console.log('🚫 [CANCEL] Ya hay una cancelación en progreso');
    return;
  }

  const isProcessing = getState('isProcessing');

  const sendButton = elements.sendButton || document.querySelector('#sendButton') || document.querySelector('.send-button');
  const isInCancelMode = sendButton && (
    sendButton.classList.contains('cancel-mode') ||
    sendButton.querySelector('.bx-x') ||
    sendButton.title.includes('Cancelar')
  );

  const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

  let loadingMessage = null;

  // Prioridad 1: Mensaje explícitamente marcado como loading
  if (window._currentLoadingMessage &&
    window._currentLoadingMessage.parentNode &&
    window._currentLoadingMessage.getAttribute('data-is-loading') === 'true') {
    loadingMessage = window._currentLoadingMessage;
    console.log('✅ [CANCEL] Usando mensaje de referencia global');
  }
  // Prioridad 2: Mensaje con indicadores visuales de carga
  else if (document.querySelector('.message .thought-bubble')) {
    loadingMessage = document.querySelector('.message .thought-bubble').closest('.message');
    console.log('✅ [CANCEL] Usando mensaje con thought-bubble');
  }
  else if (document.querySelector('.message .typing-loader')) {
    loadingMessage = document.querySelector('.message .typing-loader').closest('.message');
    console.log('✅ [CANCEL] Usando mensaje con typing-loader');
  }
  // Prioridad 3: Mensaje marcado como processing
  else if (document.querySelector('.message.ai-message.processing[data-is-loading="true"]')) {
    loadingMessage = document.querySelector('.message.ai-message.processing[data-is-loading="true"]');
    console.log('✅ [CANCEL] Usando mensaje processing con data-is-loading');
  }
  else if (document.querySelector('.message.ai-message.processing')) {
    loadingMessage = document.querySelector('.message.ai-message.processing');
    console.log('✅ [CANCEL] Usando mensaje processing');
  }

  if (loadingMessage) {
    const messageTimestamp = loadingMessage.dataset.messageId;
    const currentTime = Date.now();

    if (messageTimestamp) {
      const extractedTime = messageTimestamp.match(/(\d{13})/);
      if (extractedTime) {
        const msgTime = parseInt(extractedTime[1]);
        const timeDiff = currentTime - msgTime;

        if (timeDiff > 30000) {
          console.warn(`⚠️ [CANCEL] Mensaje parece antiguo (${timeDiff}ms), buscando alternativa...`);

          const recentLoadingMessage = Array.from(document.querySelectorAll('.message.ai-message'))
            .reverse()
            .find(msg => {
              const hasLoadingIndicator = msg.querySelector('.thought-bubble') ||
                msg.querySelector('.typing-loader') ||
                msg.classList.contains('processing') ||
                msg.getAttribute('data-is-loading') === 'true';

              if (hasLoadingIndicator) {
                const msgId = msg.dataset.messageId;
                if (msgId) {
                  const extracted = msgId.match(/(\d{13})/);
                  if (extracted) {
                    const time = parseInt(extracted[1]);
                    return (currentTime - time) < 30000;
                  }
                }
                return true;
              }
              return false;
            });

          if (recentLoadingMessage) {
            loadingMessage = recentLoadingMessage;
            console.log('✅ [CANCEL] Encontrado mensaje más reciente con indicadores de carga');
          }
        }
      }
    }
  }

  const hasValidCancelContext = isInCancelMode ||
    (isProduction && (loadingMessage || window._currentLoadingMessage));

  if (!hasValidCancelContext && !isProcessing) {
    console.log('🚫 [CANCEL] No hay operación activa para cancelar:', {
      isProcessing,
      isInCancelMode,
      hasLoadingMessage: !!loadingMessage,
      isProduction,
      hasValidCancelContext
    });
    return;
  }

  console.log('🛑 [CANCEL] Iniciando cancelación válida');

  window._cancelInProgress = true;
  window.isCancellationInProgress = true;

  let abortedCount = 0;

  if (currentFetchController && !currentFetchController.signal.aborted) {
    try {
      currentFetchController.abort();
      abortedCount++;
      console.log('✅ [CANCEL] UI Manager controller abortado');
    } catch (e) {
      console.warn('❌ [CANCEL] Error abortando UI controller:', e);
    }
  }

  if (window.currentAbortController && !window.currentAbortController.signal.aborted) {
    try {
      window.currentAbortController.abort();
      abortedCount++;
      console.log('✅ [CANCEL] Global controller abortado');
    } catch (e) {
      console.warn('❌ [CANCEL] Error abortando global controller:', e);
    }
  }

  currentFetchController = null;
  window.currentAbortController = null;

  if (!window._cancelNotificationShown) {
    window._cancelNotificationShown = true;

    window._cancelNotificationAlreadyShown = true;

    acadelInfo(
      "¡Operación cancelada! 🛑",
      "Acadel detuvo la consulta como pediste. ¡No hay problema!"
    );

    setTimeout(() => {
      window._cancelNotificationShown = false;
      window._cancelNotificationAlreadyShown = false;
    }, 7000);
  }

  changeButtonToLoading();

  if (loadingMessage) {
    console.log('✅ [CANCEL] Aplicando cancelación a mensaje:', loadingMessage.dataset.messageId);

    const hasResponseButtons = loadingMessage.querySelector('.response-actions');

    if (hasResponseButtons) {
      console.log('✅ [CANCEL] Mensaje con botones detectado - preservando respuesta real');

      const aiProfile = loadingMessage.querySelector('.ai-profile');
      if (aiProfile) {
        aiProfile.classList.remove('thinking');
      }

      loadingMessage.classList.remove('processing');
      loadingMessage.removeAttribute('data-is-loading');

      restoreButtonFromLoading();

      setTimeout(() => {
        window.isCancellationInProgress = false;
        window._cancelInProgress = false;
        toggleUIState(false);
      }, 100);

      return;
    }

    const aiProfile = loadingMessage.querySelector('.ai-profile');
    if (aiProfile) {
      aiProfile.classList.remove('thinking');
    }

    loadingMessage.classList.remove('processing');
    loadingMessage.classList.add('cancelled', 'just-cancelled');
    loadingMessage.removeAttribute('data-is-loading');

    loadingMessage.dataset.cancelled = "true";
    loadingMessage.dataset.cancelTime = Date.now().toString();

    if (window._currentLoadingMessage === loadingMessage) {
      window._currentLoadingMessage = null;
    }

    const userMessage = loadingMessage.previousElementSibling;
    if (userMessage && userMessage.classList.contains('user-message')) {
      const userActions = userMessage.querySelector('.user-response-actions');
      if (userActions) {
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

    setTimeout(() => {
      if (loadingMessage && loadingMessage.parentNode && messageContent) {
        console.log('🔄 [CANCEL] Finalizando cancelación después de sincronización con backend');

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
          }
        ];

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
        restoreButtonFromLoading();
      }
    }, 7000);

    setTimeout(() => {
      try {
        loadingMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.error("Error al hacer scroll:", e);
      }
    }, 100);
  } else {
    console.log('✅ [CANCEL] Cancelación sin mensaje visible, restaurando botón con retraso');
    setTimeout(() => {
      restoreButtonFromLoading();
    }, 7000);
  }

  const chatId = getState('currentChatId');
  if (chatId) {
    sendCancellationRequest(chatId).catch(e =>
      console.warn('Error enviando cancelación al servidor:', e)
    );
  }

  setTimeout(() => {
    console.log('🔄 [CANCEL] Finalizando limpieza de estado después de sincronización completa');
    window.isCancellationInProgress = false;
    window._cancelInProgress = false;
    toggleUIState(false);
  }, 7000);

  console.log(`🛑 [CANCEL] Cancelación iniciada. Controllers abortados: ${abortedCount}. Sincronización en progreso...`);
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

    console.log(`📡 [CANCEL] Enviando señal de cancelación al backend para chat: ${chatId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

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
    console.log('✅ [CANCEL] Cancelación registrada exitosamente en el servidor:', result);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ [CANCEL] Timeout enviando cancelación al servidor (normal en operaciones rápidas)');
    } else {
      console.warn('❌ [CANCEL] Error enviando solicitud de cancelación:', error.message);
    }
  }
}

/**
 * Establece el controlador de fetch actual para poder cancelarlo si es necesario.
 * @param {AbortController} controller - Controlador de fetch.
 */
export function setCurrentFetchController(controller) {
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
 * @param {string} message - Mensaje opcional a mostrar durante la carga
 */
export function showLoading(message = 'Cargando...') {
  const loadingOverlay = createElement('div', {
    className: 'loading-overlay'
  });

  loadingOverlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p>${message}</p>
  `;

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
    }, 300, 'hide-loading'); // Esperar a que termine la animación
  }
}

/**
 * Ajusta dinámicamente la altura del textarea y contenedor.
 * @param {Event} event - Evento de input
 */
export function handleTextareaResize(event) {
  const textarea = event?.target || elements.textarea || document.querySelector(DOM_SELECTORS.textarea) || document.querySelector('#messageInput');

  const container = elements.container || document.querySelector(DOM_SELECTORS.container);

  if (!textarea || !container) {
    console.warn('handleTextareaResize: elementos no encontrados');
    return;
  }

  // Temporarily disable transitions to prevent jarring animation
  container.style.transition = 'none';
  textarea.style.transition = 'none';

  // Reset height to calculate actual content height
  textarea.style.height = 'auto';

  // Calculate actual content height
  const contentHeight = textarea.scrollHeight;

  const textareaHeight = Math.min(
    contentHeight,
    UI_CONFIG.maxTextareaHeight || 200
  );

  // Set textarea height
  textarea.style.height = `${textareaHeight}px`;

  // Manage textarea overflow
  textarea.style.overflowY = contentHeight > (UI_CONFIG.maxTextareaHeight || 200)
    ? 'auto'
    : 'hidden';

  // Calculate container height with smooth expansion logic
  const containerPadding = 20;
  const newContainerHeight = Math.min(
    Math.max(
      UI_CONFIG.initialContainerHeight || 60,
      textareaHeight + containerPadding
    ),
    UI_CONFIG.maxContainerHeight || 300
  );

  requestAnimationFrame(() => {
    container.style.height = `${newContainerHeight}px`;

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
 * Limpia los event listeners configurados para la interfaz.
 */
export function cleanupUIEventListeners() {
  if (elements.textarea) {
    removeEvent(elements.textarea, "input", handleTextareaResize);
  }

  clearManagedTimeouts();
}

/**
 * Configura los event listeners para scroll inteligente
 */
export function setupScrollBehavior() {
  const chatMessages = elements.chatMessages;
  if (!chatMessages) return;

  let userScrollTimeoutKey = 'user-scroll-timeout';

  const scrollHandler = () => {
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

      clearManagedTimeouts(userScrollTimeoutKey);

      // Programar desbloqueo automático después de inactividad
      setManagedTimeout(() => {
        // No desbloquear si hay una interacción de respuesta activa
        if (isResponseInteractionActive()) {
          return;
        }

        // Si el usuario está cerca del fondo después del timeout, desbloquear
        if (scrollManager.isNearBottom(50)) {
          scrollManager.unlockScroll();
        }
      }, 5000, userScrollTimeoutKey);
    } else {
      // Si está cerca del fondo, desbloquear
      scrollManager.unlockScroll();
    }
  };

  addEvent(chatMessages, 'scroll', scrollHandler);

  const keydownHandler = (e) => {
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
  };

  addEvent(document, 'keydown', keydownHandler);
}

/**
 * Limpia los event listeners de scroll configurados
 */
export function cleanupScrollBehavior() {
  const chatMessages = elements.chatMessages;
  if (chatMessages) {
    removeAllEvents(chatMessages);
  }

  // También limpiar el listener de keydown en el documento
  // Nota: No podemos usar removeAllEvents con document
  document.removeEventListener('keydown', keydownHandler);

  clearManagedTimeouts('user-scroll-timeout');
}

/**
 * Muestra un diálogo de confirmación personalizado
 * @param {string} title - Título del diálogo
 * @param {string} message - Mensaje a mostrar
 * @param {Function} onConfirm - Función a ejecutar si el usuario confirma
 * @param {Function} onCancel - Función a ejecutar si el usuario cancela
 */
export function showConfirmation(title, message, onConfirm, onCancel = null) {
  return modals.showConfirmation(title, message, onConfirm, onCancel);
}

/**
 * Aplica skeleton loading para el título del chat en el header
 */
export function applyHeaderSkeleton() {
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (!headerSubtitle) return;

  if (!headerSubtitle.getAttribute('data-original-text')) {
    headerSubtitle.setAttribute('data-original-text', headerSubtitle.textContent);
  }

  addClass(headerSubtitle, 'skeleton-text');
  headerSubtitle.innerHTML = '<span class="skeleton-line"></span>';
}

/**
 * Remueve skeleton loading del header
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
 * Aplica skeleton loading para toda la aplicación
 * con detección inteligente para no afectar al nuevo chat
 */
export function applyAppSkeleton() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2]; // Asumiendo que la URL es /:chatId
  const isNewChat = !chatId;

  document.documentElement.classList.add('app-loading');

  // Si es un nuevo chat, aplicar clase especial
  if (isNewChat) {
    document.documentElement.classList.add('new-chat-loading');
  }

  if (!isNewChat) {
    applyHeaderSkeleton();
    applyMessagesSkeleton();
  } else {
    // En nuevo chat, solo aplicar skeleton al sidebar si está vacío
    const chatList = document.getElementById('chatList');
    if (chatList && chatList.children.length === 0) {
    }
  }

  if (!window.initialLoadComplete) {
    applyInitialLoader();
  }

  const inputContainer = document.querySelector('.input-container');
  if (inputContainer) {
    addClass(inputContainer, 'skeleton-loading');
  }
}

/**
 * Remueve skeleton loading de toda la aplicación de manera sutil
 */
export function removeAppSkeleton() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];
  const isNewChat = !chatId;

  removeInitialLoader();

  if (!isNewChat) {
    setManagedTimeout(() => {
      removeHeaderSkeleton();
      removeMessagesSkeleton();
    }, 200, 'remove-specific-skeletons'); // Con pequeño retraso para suavizar transición
  } else {
    // En nuevo chat, solo quitar el skeleton del sidebar
  }

  const inputContainer = document.querySelector('.input-container');
  if (inputContainer) {
    removeClass(inputContainer, 'skeleton-loading');
  }

  setManagedTimeout(() => {
    document.documentElement.classList.remove('app-loading', 'new-chat-loading');
  }, isNewChat ? 100 : 300, 'remove-app-loading'); // Más rápido para nuevo chat

  window.initialLoadComplete = true;
}

/**
 * Aplica skeleton loading para los mensajes de chat
 */
export function applyMessagesSkeleton() {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;

  chatMessages.querySelectorAll('.skeleton-message').forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Contenedor para mensajes skeleton
  const skeletonContainer = createElement('div', {
    className: 'skeleton-container'
  });

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 3; i++) {
    const skeletonMessage = createElement('div', {
      className: i % 2 === 0 ? 'skeleton-message ai-skeleton' : 'skeleton-message user-skeleton'
    });

    if (i % 2 === 0) {
      // Mensaje del AI
      const skeletonAvatar = createElement('div', {
        className: 'skeleton-avatar'
      });

      const skeletonContent = createElement('div', {
        className: 'skeleton-message-content'
      });

      for (let j = 0; j < 4; j++) {
        const skeletonLine = createElement('div', {
          className: 'skeleton-message-line'
        });
        skeletonContent.appendChild(skeletonLine);
      }

      skeletonMessage.appendChild(skeletonAvatar);
      skeletonMessage.appendChild(skeletonContent);
    } else {
      // Mensaje del usuario
      const skeletonContent = createElement('div', {
        className: 'skeleton-message-content'
      });

      for (let j = 0; j < 2; j++) {
        const skeletonLine = createElement('div', {
          className: 'skeleton-message-line'
        });
        skeletonContent.appendChild(skeletonLine);
      }

      skeletonMessage.appendChild(skeletonContent);
    }

    fragment.appendChild(skeletonMessage);
  }

  skeletonContainer.appendChild(fragment);
  chatMessages.appendChild(skeletonContainer);
}

/**
 * Remueve skeleton loading de los mensajes
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
  }, 300, 'remove-skeleton-container');
}

/**
 * Aplica el cargador inicial de Acadel con pizarrón responsivo
 */
export function applyInitialLoader() {
  // Si ya existe, no crear otro
  if (document.querySelector('.acadel-initial-loader')) return;

  const currentVariant = getCurrentVariant();
  const appConfig = getAppConfig();

  const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
    localStorage.getItem('theme') === 'dark';
  const logoPath = isDarkTheme
    ? '/images/Papeles_oscuro.gif'
    : '/images/Papeles_claro.gif';

  // Mensajes matemáticos del Profesor Acadel
  const mensajesAcadel = [
    "🦫 Preparando las ecuaciones más complejas del universo...",
    "📊 Calculando la derivada de la diversión académica...",
    "🧮 Integrando conocimiento de cálculo infinitesimal...",
    "📐 Construyendo teoremas tan sólidos como mis dientes...",
    "🔢 Factorizando problemas complejos en soluciones simples...",
    "📈 Graficando el camino hacia tu éxito matemático...",
    "∞ Sumando paciencia + humor = Aprendizaje perfecto",
    "🎯 Optimizando funciones pedagógicas con métodos únicos...",
    "🌟 Transformando el miedo a las mates en pura diversión...",
    "📏 Midiendo la infinitud de tu potencial matemático...",
    "⚡ Resolviendo sistemas de ecuaciones pedagógicas...",
    "🎓 Calibrando la calculadora cuántica del capibara..."
  ];

  // Pasos matemáticos creativos
  const pasosMatematicos = [
    "Despejando incógnitas pedagógicas",
    "Resolviendo sistemas de aprendizaje",
    "Aplicando teoremas de paciencia infinita"
  ];

  // Mensaje inicial aleatorio
  const mensajeInicial = mensajesAcadel[Math.floor(Math.random() * mensajesAcadel.length)];

  const logo = createElement('img', {
    src: logoPath,
    alt: 'Profesor Acadel',
    className: 'acadel-loader-avatar'
  });

  const mensajeContainer = createElement('div', {
    className: 'acadel-mensaje-container'
  });

  const loaderText = createElement('div',
    { className: 'acadel-loader-text' },
    mensajeInicial
  );

  // Contenedor de progreso matemático
  const progressContainer = createElement('div', {
    className: 'acadel-progress-container'
  });

  const progressBar = createElement('div', {
    className: 'acadel-progress-bar',
    id: 'acadelLoadProgress'
  });

  const progressEquation = createElement('div', {
    className: 'acadel-progress-equation'
  }, '∫ Progreso dx = ');

  const progressPercent = createElement('span', {
    className: 'acadel-progress-percent',
    id: 'acadelProgressPercent'
  }, '0%');

  progressContainer.appendChild(progressEquation);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressPercent);

  const stepsContainer = createElement('div', {
    className: 'acadel-steps-container'
  });

  pasosMatematicos.forEach((texto, index) => {
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

  // Frase motivacional
  const fraseMotivacional = createElement('div', {
    className: 'acadel-frase-motivacional'
  }, '"Las matemáticas son como los chistes: si tienes que explicarlos, pierden la gracia... ¡pero yo te los explico tan bien que te reirás igual!" 🦫');

  // Ensamblar contenido
  mensajeContainer.appendChild(loaderText);

  const content = createElement('div',
    { className: 'acadel-loader-content' },
    [logo, mensajeContainer, progressContainer, stepsContainer, fraseMotivacional]
  );

  const initialLoader = createElement('div',
    { className: 'acadel-initial-loader' },
    content
  );

  initialLoader.setAttribute('data-variant', currentVariant);
  document.body.appendChild(initialLoader);

  // Estado global del Profesor Acadel
  window.acadelLoadingState = {
    progress: 0,
    phase: 1,
    startTime: Date.now(),
    ready: false,
    mensajes: mensajesAcadel,
    mensajeActual: 0,
    intervalosActivos: [],
    chalkEffectActive: false
  };

  const intervaloMensajes = setInterval(() => {
    window.acadelLoadingState.mensajeActual =
      (window.acadelLoadingState.mensajeActual + 1) % mensajesAcadel.length;

    const nuevoMensaje = mensajesAcadel[window.acadelLoadingState.mensajeActual];
    loaderText.textContent = nuevoMensaje;

    // Efecto de escritura con tiza
    loaderText.classList.add('pensando');
    setTimeout(() => {
      loaderText.classList.remove('pensando');
    }, 600);

    // Efecto de tiza aleatorio al cambiar mensaje
    if (Math.random() > 0.6) {
      createChalkEffect();
    }

  }, 3500); // Cada 3.5 segundos

  window.acadelLoadingState.intervalosActivos.push(intervaloMensajes);

  // Progreso inicial
  updateAcadelLoaderProgress(5);

  // Precargar recursos
  preloadCriticalResources();

  setTimeout(() => {
    const firstStep = document.querySelector('.acadel-step[data-step="1"]');
    if (firstStep) {
      addClass(firstStep, 'active');
      firstStep.querySelector('.acadel-step-icon').textContent = '⚡';
      createChalkEffect(); // Efecto de tiza al activar primer paso
    }
  }, 500);

  // Ecuaciones matemáticas flotantes
  setTimeout(() => {
    createFloatingEquations();
  }, 1200);

  console.log('🦫 Profesor Acadel: Pizarrón matemático inicializado');
}

/**
 * Actualiza el progreso con efectos de tiza - VERSIÓN CORREGIDA
 */
export function updateAcadelLoaderProgress(progress) {
  if (!window.acadelLoadingState) return;

  window.acadelLoadingState.progress = Math.max(window.acadelLoadingState.progress, progress);

  let phase;
  let ecuacion = '';

  if (progress < 30) {
    phase = 1;
    ecuacion = 'f(x) = preparación × entusiasmo';
  } else if (progress < 70) {
    phase = 2;
    ecuacion = 'g(x) = ∑(conocimiento + diversión)';
  } else {
    phase = 3;
    ecuacion = 'h(x) = lim(aprendizaje → ∞)';
  }

  window.acadelLoadingState.phase = phase;

  document.querySelectorAll('.acadel-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    const icon = step.querySelector('.acadel-step-icon');

    if (stepNum <= phase) {
      addClass(step, 'active');

      if (progress >= 100) {
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
      icon.textContent = '📚';
    }
  });

  const progressBar = document.getElementById('acadelLoadProgress');
  const progressPercent = document.getElementById('acadelProgressPercent');
  const progressEquation = document.querySelector('.acadel-progress-equation');

  if (progressBar && progressPercent) {
    progressBar.style.width = `${window.acadelLoadingState.progress}%`;
    progressPercent.textContent = `${Math.round(window.acadelLoadingState.progress)}%`;

    if (progressEquation) {
      if (progress >= 100) {
        progressEquation.textContent = '🎯 Éxito = 100% ';
      } else {
        progressEquation.textContent = ecuacion + ' = ';
      }
    }

    // Efectos de tiza en hitos importantes
    if (progress === 50 || progress === 75 || progress === 90 || progress === 100) {
      createChalkEffect();
    }
  }

  if (progress >= 100) {
    // Pequeño retraso para que se vea la transición
    setTimeout(() => {
      console.log('🦫 Acadel: ¡Todos los teoremas de paciencia aplicados exitosamente!');
    }, 300);
  }
}

/**
 * NUEVA FUNCIÓN: Forzar completar todos los pasos
 * Útil para asegurar que todo esté marcado como completado al final
 */
export function completeAllAcadelSteps() {
  document.querySelectorAll('.acadel-step').forEach((step, index) => {
    const icon = step.querySelector('.acadel-step-icon');

    addClass(step, 'active');
    addClass(step, 'completed');
    removeClass(step, 'current');

    setTimeout(() => {
      icon.textContent = '✅';

      // Efecto de tiza al completar cada paso
      if (index === 2) { // Último paso (teoremas de paciencia)
        createChalkEffect();
      }
    }, index * 200);
  });
}

/**
 * Crea efecto de polvo de tiza realista
 */
function createChalkEffect() {
  if (!window.acadelLoadingState || window.acadelLoadingState.chalkEffectActive) return;

  window.acadelLoadingState.chalkEffectActive = true;

  const loader = document.querySelector('.acadel-initial-loader');
  if (!loader) {
    window.acadelLoadingState.chalkEffectActive = false;
    return;
  }

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const chalkDust = createElement('div', {
        className: 'chalk-dust-effect'
      });

      // Posición aleatoria
      chalkDust.style.left = (Math.random() * 80 + 10) + '%';
      chalkDust.style.top = (Math.random() * 60 + 20) + '%';

      loader.appendChild(chalkDust);

      setTimeout(() => {
        if (chalkDust.parentNode) {
          chalkDust.parentNode.removeChild(chalkDust);
        }
      }, 1200);
    }, i * 200);
  }

  setTimeout(() => {
    if (window.acadelLoadingState) {
      window.acadelLoadingState.chalkEffectActive = false;
    }
  }, 2000);
}

/**
 * Crea ecuaciones flotantes sutiles
 */
function createFloatingEquations() {
  const equations = [
    '∫ dx', '∂f/∂x', 'Σn²', '√π', 'e^iπ', 'lim→∞', 'dx/dt', '∇²φ', 'Δy/Δx', '∀x∈ℝ'
  ];

  const loader = document.querySelector('.acadel-initial-loader');
  if (!loader) return;

  equations.forEach((eq, index) => {
    setTimeout(() => {
      const equation = createElement('div', {
        className: 'floating-equation'
      }, eq);

      equation.style.left = Math.random() * 90 + '%';
      equation.style.animationDelay = Math.random() * 2 + 's';
      equation.style.animationDuration = (4 + Math.random() * 3) + 's';

      loader.appendChild(equation);

      setTimeout(() => {
        if (equation.parentNode) {
          equation.parentNode.removeChild(equation);
        }
      }, 7000);
    }, index * 1000);
  });

  // Repetir ecuaciones cada 15 segundos
  setTimeout(() => {
    if (window.acadelLoadingState && !window.acadelLoadingState.ready) {
      createFloatingEquations();
    }
  }, 15000);
}

/**
 * Remueve el loading con transición de tiza
 */
export function removeAcadelInitialLoader(forceRemove = false) {
  const initialLoader = document.querySelector('.acadel-initial-loader');
  if (!initialLoader) return;

  if (window.acadelLoadingState?.intervalosActivos) {
    window.acadelLoadingState.intervalosActivos.forEach(clearInterval);
  }

  // Mensaje final
  const loaderText = initialLoader.querySelector('.acadel-loader-text');
  if (loaderText) {
    loaderText.textContent = '🎓 ¡Pizarrón listo! Tu aula matemática está preparada 🦫✨';
  }

  if (window.acadelLoadingState) {
    window.acadelLoadingState.ready = true;

    // Forzar 100% y completar todos los pasos
    updateAcadelLoaderProgress(100);

    // Doble verificación: forzar completar pasos
    setTimeout(() => {
      completeAllAcadelSteps();
    }, 100);

    const progressEquation = document.querySelector('.acadel-progress-equation');
    if (progressEquation) {
      progressEquation.textContent = '🎯 Éxito Completo = ';
    }
  }

  // Efecto final de tiza
  setTimeout(() => {
    createChalkEffect();
  }, 400);

  // Transición de salida
  addClass(initialLoader, 'fade-out-acadel');

  setManagedTimeout(() => {
    if (initialLoader.parentNode) {
      initialLoader.parentNode.removeChild(initialLoader);
    }
    console.log('🦫 Profesor Acadel: ¡Todos los teoremas completados y pizarrón cerrado!');
  }, 1500, 'remove-acadel-loader');
}

/**
 * Actualiza el progreso del loader inicial
 * @param {number} progress - Porcentaje de progreso (0-100)
 */
export function updateLoaderProgress(progress) {
  return updateAcadelLoaderProgress(progress);
}

/**
 * Precarga recursos críticos para la aplicación
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
      updateAcadelLoaderProgress(10 + (loaded / criticalImages.length * 15));
    };
    img.src = src;
  });
}

/**
 * Remueve el loader inicial con una transición suave y coordinada
 * @param {boolean} forceRemove - Forzar eliminación inmediata
 */
export function removeInitialLoader(forceRemove = false) {
  return removeAcadelInitialLoader(forceRemove);
}

/**
 * Aplica loader de carga específico para cambio de chat
 * Con mejoras para prevenir superposición de loaders
 */
export function applyChatSwitchSkeleton() {
  // Primero, eliminar cualquier overlay existente para evitar duplicados
  const existingOverlays = document.querySelectorAll('.chat-switch-overlay');
  if (existingOverlays.length > 0) {
    existingOverlays.forEach(overlay => {
      removeClass(overlay, 'active');
      setManagedTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 100, `remove-existing-overlay-${Date.now()}`); // Tiempo corto para asegurar una transición visual suave
    });
  }

  const overlay = createElement('div', {
    className: 'chat-switch-overlay',
    id: 'chat-switch-overlay-' + Date.now() // ID único para evitar conflictos
  });

  overlay.innerHTML = `
    <div class="chat-switch-spinner-container">
      <div class="chat-switch-spinner"></div>
      <div class="chat-switch-text">Cambiando de chat...</div>
    </div>
  `;

  // Asegurar que no haya conflictos de estilo
  overlay.style.cssText = 'z-index:9999;'; // Establecer un z-index alto para asegurar visibilidad

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
  }, 10000, `safety-remove-chat-switch-${Date.now()}`); // 10 segundos como máximo
}

/**
 * Remueve loader de carga específico para cambio de chat
 * Con mejoras para prevenir superposición de loaders
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
      clearManagedTimeouts(`safety-remove-chat-switch-${overlay.id.split('-').pop()}`);
    }

    // Programar eliminación con un pequeño retraso para overlay visual suave
    setManagedTimeout(() => {
      removeClass(overlay, 'active');

      setManagedTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 400, `remove-overlay-${index}`);
    }, index * 50, `remove-overlay-transition-${index}`); // Pequeño retraso incremental para cada overlay
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    removeClass(chatMessages, 'switching');
  }

  removeHeaderSkeleton();
}

// Variable para referenciar al manejador de keydown
let keydownHandler;

/**
 * Función de conveniencia para mostrar una modal de chat vacío
 * Delegada al módulo de modales
 * @param {string} message - Mensaje opcional para mostrar
 */
export function showEmptyChatModal(message = null) {
  return modals.showEmptyChatModal(message);
}

/**
 * Función de conveniencia para cerrar la modal de chat vacío
 * Delegada al módulo de modales
 */
export function closeEmptyChatModal() {
  return modals.closeEmptyChatModal();
}


/**
 * Reinicia explícitamente los listeners del textarea
 * Útil después de transiciones o cambios en el DOM
 */
export function reinitializeTextareaListeners() {
  // Actualizamos las referencias a elementos
  initializeElements();

  // Limpiamos eventos existentes del textarea
  if (elements.textarea) {
    removeEvent(elements.textarea, "input", handleTextareaResize);

    // Configuramos de nuevo el evento
    addEvent(elements.textarea, "input", handleTextareaResize);

    // Forzamos un resize inicial
    handleTextareaResize({ target: elements.textarea });
  } else {
    console.warn('reinitializeTextareaListeners: textarea no encontrado');
  }
}

export default {
  initializeElements,
  getElement,
  showError,
  showSuccess,
  toggleUIState,
  clearChatMessages,
  handleTextareaResize,
  setupUIEventListeners,
  cleanupUIEventListeners,
  showConfirmation,
  showNotification,
  showLoading,
  hideLoading,
  applyHeaderSkeleton,
  removeHeaderSkeleton,
  applyAppSkeleton,
  removeAppSkeleton,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton,
  setupScrollBehavior,
  cleanupScrollBehavior,
  // Funciones de modales delegadas
  showEmptyChatModal,
  closeEmptyChatModal,
  reinitializeTextareaListeners
};