/**
 * ui-manager.js - Gestión general de la interfaz de usuario (Versión Optimizada)
 */

import { DOM_SELECTORS, UI_CONFIG } from '../core/config-agente.js';
import { setProcessingState, getState } from '../core/state-agente.js';
import scrollManager from '../../../shared/scroll-manager.js';
import { handleSendMessage } from '../core/chat-controller-agente.js';
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
} from '../../../shared/dom-helpers.js';
import modals from './modals-agente.js';

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
    return;
  }

  if (!elements.sendButton || !elements.textarea) {
    return;
  }

  if (disabled) {
    disableInteractionButtons();
  } else {
    enableInteractionButtons();
  }

  // BLOQUEO COMPLETO DEL TEXTAREA
  if (disabled) {
    elements.textarea.disabled = true;
    elements.textarea.readOnly = true;
    elements.textarea.setAttribute('aria-disabled', 'true');
    elements.textarea.style.pointerEvents = 'none';
    elements.textarea.classList.add('textarea-disabled');

    if (!elements.textarea.dataset.originalTabIndex) {
      elements.textarea.dataset.originalTabIndex = elements.textarea.tabIndex || '0';
    }
    elements.textarea.tabIndex = -1;
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

      const isProduction = !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1');
      const minTimeout = isProduction ? 50 : 350; // MUY CORTO EN PRODUCCIÓN

      const timeSinceButtonChange = Date.now() - (window._buttonChangeTime || 0);

      const hasController = currentFetchController || window.currentAbortController;
      const isProcessing = getState('isProcessing');

      const hasAnyProcessingIndicator = hasController || isProcessing ||
        document.querySelector('.message.ai-message.processing') ||
        document.querySelector('.message .thought-bubble') ||
        document.querySelector('.message .typing-loader') ||
        elements.sendButton?.classList.contains('cancel-mode');

      if (hasAnyProcessingIndicator && timeSinceButtonChange > minTimeout) {
        console.log(`✅ [CANCEL] Cancelación válida después de ${timeSinceButtonChange}ms (producción: ${isProduction})`);
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
      restoreButtonToSend();
    }
  }

  elements.sendButton.disabled = false;
  setProcessingState(disabled);
}

/**
 * *** NUEVA FUNCIÓN: Deshabilita todos los botones de interacción de mensajes de manera no intrusiva ***
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
 * *** NUEVA FUNCIÓN: Rehabilita todos los botones de interacción de mensajes ***
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
  window._cancelInProgress = true;

  const isProduction = !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1');

  const isProcessing = getState('isProcessing');

  const sendButton = elements.sendButton || document.querySelector('#sendButton') ||
    document.querySelector('.send-button');
  const isInCancelMode = sendButton && (
    sendButton.classList.contains('cancel-mode') ||
    sendButton.querySelector('.bx-x') ||
    sendButton.title.includes('Cancelar')
  );

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
    window._cancelInProgress = false;
    return;
  }

  console.log('🛑 [CANCEL] Iniciando cancelación válida');

  window.isCancellationInProgress = true;

  let abortedCount = 0;

  const controllersToCancel = [
    { controller: currentFetchController, name: 'currentFetchController' },
    { controller: window.currentAbortController, name: 'window.currentAbortController' },
    { controller: window.fetchController, name: 'window.fetchController' }
  ];

  controllersToCancel.forEach(({ controller, name }) => {
    if (controller) {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
          abortedCount++;
          console.log(`✅ [CANCEL] ${name} cancelado exitosamente`);
        } else {
          console.log(`⚠️ [CANCEL] ${name} ya estaba abortado`);
        }
      } catch (e) {
        console.warn(`⚠️ [CANCEL] Error cancelando ${name}:`, e);
      }
    }
  });

  currentFetchController = null;
  window.currentAbortController = null;
  window.fetchController = null;

  console.log('🛑 [CANCEL] Controllers cancelados:', { abortedCount });

  changeButtonToLoading();

  if (loadingMessage) {
    console.log('✅ [CANCEL] Aplicando cancelación a mensaje válido:', loadingMessage.dataset.messageId);
    handleMessageCancellation(loadingMessage);
  }

  if (!window._cancelNotificationShown) {
    window._cancelNotificationShown = true;

    window._cancelNotificationAlreadyShown = true;

    acadelInfo(
      "🛑 ¡Operación cancelada!",
      "Acadel detuvo la consulta como pediste. ¡No hay problema!"
    );

    setTimeout(() => {
      window._cancelNotificationShown = false;
      window._cancelNotificationAlreadyShown = false;
    }, 7000);
  }

  const chatId = getState('currentChatId');
  if (chatId) {
    sendCancellationRequest(chatId).finally(() => {
      window._cancelInProgress = false;
    });
  } else {
    window._cancelInProgress = false;
  }

  console.log(`🛑 [CANCEL] Cancelación iniciada. Controllers abortados: ${abortedCount}`);
}

/**
 * Maneja la cancelación visual de un mensaje
 */
function handleMessageCancellation(loadingMessage) {
  const hasResponseButtons = loadingMessage.querySelector('.response-actions');

  if (hasResponseButtons) {
    console.log('✅ [CANCEL AGENTE] Mensaje con botones detectado - preservando respuesta real');

    const aiProfile = loadingMessage.querySelector('.ai-profile');
    if (aiProfile) {
      aiProfile.classList.remove('thinking');
    }

    loadingMessage.classList.remove('processing');
    loadingMessage.removeAttribute('data-is-loading');

    setTimeout(() => {
      restoreUIAfterCancellation();
    }, 100);

    return;
  }

  const aiProfile = loadingMessage.querySelector('.ai-profile');
  if (aiProfile) {
    aiProfile.classList.remove('thinking');
  }

  loadingMessage.classList.remove('processing');
  loadingMessage.classList.add('cancelled', 'just-cancelled');
  loadingMessage.dataset.cancelled = "true";
  loadingMessage.dataset.cancelTime = Date.now().toString();

  const userMessage = loadingMessage.previousElementSibling;
  if (userMessage?.classList.contains('user-message')) {
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

  // Mensaje temporal del profesor Acadel
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
    showFinalCancellationMessage(loadingMessage, messageContent);
  }, 7000);
}

function showFinalCancellationMessage(loadingMessage, messageContent) {
  const hasResponseButtons = loadingMessage.querySelector('.response-actions');

  if (hasResponseButtons) {
    console.log('✅ [CANCEL AGENTE] Respuesta real detectada en verificación final - omitiendo mensaje de cancelación');

    setTimeout(() => {
      restoreUIAfterCancellation();
    }, 100);

    return;
  }

  const mensajesGraciosos = [
    {
      titulo: "¡Listo! El profesor Acadel detuvo tu consulta",
      detalle: "La consulta fue cancelada exitosamente por nuestro chigüire académico 🦫"
    },
    {
      titulo: "¡Misión cumplida! Consulta cancelada por el profesor Acadel",
      detalle: "El chigüire más inteligente de la academia ya terminó su trabajo 🦫"
    },
    {
      titulo: "¡Operación exitosa! El profesor Acadel canceló la consulta",
      detalle: "Nuestro querido chigüire académico dice: '¡Tarea completada!' 🦫"
    }
  ];

  const mensajeElegido = mensajesGraciosos[Math.floor(Math.random() * mensajesGraciosos.length)];

  if (messageContent) {
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

    setTimeout(() => {
      restoreUIAfterCancellation();
    }, 300);
  }
}

/**
 * Funciones auxiliares para el botón
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

function restoreUIAfterCancellation() {
  try {
    window.isCancellationInProgress = false;
    window._cancelInProgress = false;

    const sendButton = elements.sendButton;
    if (sendButton) {
      if (sendButton.dataset.originalContent) {
        sendButton.innerHTML = sendButton.dataset.originalContent;
      } else {
        sendButton.innerHTML = '<i class="bx bx-up-arrow-alt"></i>';
      }

      sendButton.title = "Enviar mensaje";
      sendButton.disabled = false;
      sendButton.style.pointerEvents = 'auto';
      sendButton.style.opacity = '1';
      sendButton.classList.remove('cancel-mode', 'loading-mode');

      removeAllEvents(sendButton, 'click');
      addEvent(sendButton, 'click', handleSendMessage);
    }

    const textarea = elements.textarea;
    if (textarea) {
      textarea.removeAttribute('disabled');
      textarea.removeAttribute('readonly');
      textarea.removeAttribute('aria-disabled');
      textarea.style.pointerEvents = 'auto';
      textarea.style.opacity = '1';
      textarea.classList.remove('textarea-disabled');
    }

    toggleUIState(false);

    console.log('✅ [CANCEL] UI restaurada completamente');

  } catch (error) {
    console.warn('Error durante restauración:', error);
    window.isCancellationInProgress = false;
    window._cancelInProgress = false;
    toggleUIState(false);
  }
}

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
 * Establece el controlador de fetch actual
 */
export function setCurrentFetchController(controller) {
  currentFetchController = controller;
}

/**
 * Limpia los mensajes del área de chat
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
  const loadingOverlay = createElement('div', {
    className: 'loading-overlay'
  });

  loadingOverlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p>${message}</p>
  `;

  document.body.appendChild(loadingOverlay);

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
 * Ajusta dinámicamente la altura del textarea y contenedor
 */
export function handleTextareaResize(event) {
  const textarea = event?.target || elements.textarea || document.querySelector(DOM_SELECTORS.textarea) || document.querySelector('#messageInput');
  const container = elements.container || document.querySelector(DOM_SELECTORS.container);

  if (!textarea || !container) {
    console.warn('handleTextareaResize: elementos no encontrados');
    return;
  }

  container.style.transition = 'none';
  textarea.style.transition = 'none';
  textarea.style.height = 'auto';

  const contentHeight = textarea.scrollHeight;
  const textareaHeight = Math.min(contentHeight, UI_CONFIG.maxTextareaHeight || 200);

  textarea.style.height = `${textareaHeight}px`;
  textarea.style.overflowY = contentHeight > (UI_CONFIG.maxTextareaHeight || 200) ? 'auto' : 'hidden';

  const containerPadding = 20;
  const newContainerHeight = Math.min(
    Math.max(UI_CONFIG.initialContainerHeight || 60, textareaHeight + containerPadding),
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
 * Reinicia explícitamente los listeners del textarea
 */
export function reinitializeTextareaListeners() {
  initializeElements();

  if (elements.textarea) {
    removeEvent(elements.textarea, "input", handleTextareaResize);
    addEvent(elements.textarea, "input", handleTextareaResize);
    handleTextareaResize({ target: elements.textarea });
  } else {
    console.warn('reinitializeTextareaListeners: textarea no encontrado');
  }
}

/**
 * Configura los event listeners para los elementos de la interfaz
 */
export function setupUIEventListeners() {
  if (elements.textarea) {
    addEvent(elements.textarea, "input", handleTextareaResize);
  }
}

/**
 * Limpia los event listeners configurados para la interfaz
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

    if (isResponseInteractionActive()) {
      return;
    }

    if (!scrollManager.isNearBottom(150)) {
      scrollManager.lockScroll();

      clearManagedTimeouts(userScrollTimeoutKey);

      setManagedTimeout(() => {
        if (isResponseInteractionActive()) {
          return;
        }

        if (scrollManager.isNearBottom(50)) {
          scrollManager.unlockScroll();
        }
      }, 5000, userScrollTimeoutKey);
    } else {
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

    if (isResponseInteractionActive()) {
      return;
    }

    const isScrollKey = [
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'
    ].includes(e.code);

    if (isScrollKey && document.activeElement !== elements.textarea) {
      if (scrollManager.isNearBottom(150)) {
        scrollManager.unlockScroll();
      } else {
        scrollManager.lockScroll(3000);
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

  document.removeEventListener('keydown', keydownHandler);
  clearManagedTimeouts('user-scroll-timeout');
}

/**
 * Muestra un diálogo de confirmación personalizado
 */
export function showConfirmation(title, message, onConfirm, onCancel = null) {
  return modals.showConfirmation(title, message, onConfirm, onCancel);
}


export function applySidebarSkeleton() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;

  clearElement(chatList);
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 5; i++) {
    const skeletonItem = createElement('div', { className: 'sidebar-item skeleton-item' });
    const skeletonCircle = createElement('div', { className: 'skeleton-circle' });
    const skeletonLine = createElement('div', { className: 'skeleton-line' });

    skeletonItem.appendChild(skeletonCircle);
    skeletonItem.appendChild(skeletonLine);
    fragment.appendChild(skeletonItem);
  }

  chatList.appendChild(fragment);
  addClass(chatList, 'loading-skeleton');
}

export function removeSidebarSkeleton() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;
  removeClass(chatList, 'loading-skeleton');
}

export function applyHeaderSkeleton() {
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (!headerSubtitle) return;

  if (!headerSubtitle.getAttribute('data-original-text')) {
    headerSubtitle.setAttribute('data-original-text', headerSubtitle.textContent);
  }

  addClass(headerSubtitle, 'skeleton-text');
  headerSubtitle.innerHTML = '<span class="skeleton-line"></span>';
}

export function removeHeaderSkeleton() {
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (!headerSubtitle) return;

  removeClass(headerSubtitle, 'skeleton-text');

  if (headerSubtitle.textContent.trim() === '' && headerSubtitle.getAttribute('data-original-text')) {
    headerSubtitle.textContent = headerSubtitle.getAttribute('data-original-text');
  }
}

export function applyAppSkeleton() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];
  const isNewChat = !chatId;

  document.documentElement.classList.add('app-loading');

  if (isNewChat) {
    document.documentElement.classList.add('new-chat-loading');
  }

  if (!isNewChat) {
    applySidebarSkeleton();
    applyHeaderSkeleton();
    applyMessagesSkeleton();
  } else {
    const chatList = document.getElementById('chatList');
    if (chatList && chatList.children.length === 0) {
      applySidebarSkeleton();
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

export function removeAppSkeleton() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];
  const isNewChat = !chatId;

  removeInitialLoader();

  if (!isNewChat) {
    setManagedTimeout(() => {
      removeSidebarSkeleton();
      removeHeaderSkeleton();
      removeMessagesSkeleton();
    }, 200, 'remove-specific-skeletons');
  } else {
    removeSidebarSkeleton();
  }

  const inputContainer = document.querySelector('.input-container');
  if (inputContainer) {
    removeClass(inputContainer, 'skeleton-loading');
  }

  setManagedTimeout(() => {
    document.documentElement.classList.remove('app-loading', 'new-chat-loading');
  }, isNewChat ? 100 : 300, 'remove-app-loading');

  window.initialLoadComplete = true;
}

export function applyMessagesSkeleton() {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;

  chatMessages.querySelectorAll('.skeleton-message').forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  const skeletonContainer = createElement('div', { className: 'skeleton-container' });
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 3; i++) {
    const skeletonMessage = createElement('div', {
      className: i % 2 === 0 ? 'skeleton-message ai-skeleton' : 'skeleton-message user-skeleton'
    });

    if (i % 2 === 0) {
      const skeletonAvatar = createElement('div', { className: 'skeleton-avatar' });
      const skeletonContent = createElement('div', { className: 'skeleton-message-content' });

      for (let j = 0; j < 4; j++) {
        const skeletonLine = createElement('div', { className: 'skeleton-message-line' });
        skeletonContent.appendChild(skeletonLine);
      }

      skeletonMessage.appendChild(skeletonAvatar);
      skeletonMessage.appendChild(skeletonContent);
    } else {
      const skeletonContent = createElement('div', { className: 'skeleton-message-content' });

      for (let j = 0; j < 2; j++) {
        const skeletonLine = createElement('div', { className: 'skeleton-message-line' });
        skeletonContent.appendChild(skeletonLine);
      }

      skeletonMessage.appendChild(skeletonContent);
    }

    fragment.appendChild(skeletonMessage);
  }

  skeletonContainer.appendChild(fragment);
  chatMessages.appendChild(skeletonContainer);
}

export function removeMessagesSkeleton() {
  const skeletonContainer = document.querySelector('.skeleton-container');
  if (!skeletonContainer) return;

  skeletonContainer.style.opacity = '0';
  setManagedTimeout(() => {
    if (skeletonContainer.parentNode) {
      skeletonContainer.parentNode.removeChild(skeletonContainer);
    }
  }, 300, 'remove-skeleton-container');
}

export function applyInitialLoader() {
  // Si ya existe, no crear otro
  if (document.querySelector('.acadel-tech-loader')) return;

  const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
    localStorage.getItem('theme') === 'dark';
  const logoPath = isDarkTheme
    ? '/images/Papeles_oscuro.gif'
    : '/images/Papeles_claro.gif';

  // Mensajes tecnológicos del Agente Acadel
  const mensajesTech = [
    "🤖 Inicializando protocolos de asistencia académica avanzada...",
    "🧠 Calibrando redes neuronales para optimización de aprendizaje...",
    "📊 Sincronizando bases de datos académicas multidisciplinarias...",
    "🎯 Configurando algoritmos de búsqueda inteligente...",
    "🎧 Preparando sistemas de transcripción de audio y video...",
    "📚 Indexando conocimiento universal en la nube de Acadel...",
    "⚡ Estableciendo conexión con servidores de excelencia académica...",
    "🔍 Activando sensores de detección de dudas estudiantiles...",
    "💡 Cargando matriz de soluciones creativas e innovadoras...",
    "🚀 Desplegando arsenal completo de herramientas de estudio...",
    "🌟 Sincronizando con la frecuencia de la sabiduría capibara...",
    "🔬 Preparando laboratorio virtual para experimentos académicos..."
  ];

  // Pasos tecnológicos del proceso
  const pasosTech = [
    "Inicializando núcleo de IA académica",
    "Estableciendo protocolos de comunicación",
    "Activando modo asistente inteligente"
  ];

  // Mensaje inicial aleatorio
  const mensajeInicial = mensajesTech[Math.floor(Math.random() * mensajesTech.length)];

  const logo = createElement('img', {
    src: logoPath,
    alt: 'Agente Acadel',
    className: 'acadel-tech-avatar'
  });

  const mensajeContainer = createElement('div', {
    className: 'acadel-tech-message-container'
  });

  const loaderText = createElement('div',
    { className: 'acadel-tech-text' },
    mensajeInicial
  );

  // Contenedor de progreso tecnológico
  const progressContainer = createElement('div', {
    className: 'acadel-tech-progress-container'
  });

  const progressBar = createElement('div', {
    className: 'acadel-tech-progress-bar',
    id: 'acadelTechProgress'
  });

  const progressLabel = createElement('div', {
    className: 'acadel-tech-progress-label'
  }, 'CARGANDO AGENTE ACADEL');

  const progressPercent = createElement('span', {
    className: 'acadel-tech-progress-percent',
    id: 'acadelTechProgressPercent'
  }, '0%');

  const progressInfo = createElement('div', {
    className: 'acadel-tech-progress-info'
  });

  progressInfo.appendChild(progressLabel);
  progressInfo.appendChild(progressPercent);
  progressContainer.appendChild(progressInfo);
  progressContainer.appendChild(progressBar);

  const stepsContainer = createElement('div', {
    className: 'acadel-tech-steps-container'
  });

  pasosTech.forEach((texto, index) => {
    const step = createElement('div', {
      className: 'acadel-tech-step',
      dataset: { step: index + 1 }
    });

    const stepIndicator = createElement('div', {
      className: 'acadel-tech-step-indicator'
    });

    const stepIcon = createElement('span', {
      className: 'acadel-tech-step-icon'
    }, '⚪');

    const stepText = createElement('span', {
      className: 'acadel-tech-step-text'
    }, texto);

    stepIndicator.appendChild(stepIcon);
    step.appendChild(stepIndicator);
    step.appendChild(stepText);
    stepsContainer.appendChild(step);
  });

  // Descripción del agente
  const agentDescription = createElement('div', {
    className: 'acadel-tech-description'
  }, '🦫 Agente de IA especializado en asistencia académica integral • Transcripción automática • Búsqueda inteligente • Análisis multimodal');

  // Terminal de estado
  const statusTerminal = createElement('div', {
    className: 'acadel-tech-terminal'
  });

  const terminalContent = createElement('div', {
    className: 'acadel-tech-terminal-content',
    id: 'acadelTerminalContent'
  }, '$ Iniciando sistema Acadel...\n> Verificando compatibilidad neural...\n> ✓ Conexión establecida');

  statusTerminal.appendChild(terminalContent);

  // Ensamblar contenido
  mensajeContainer.appendChild(loaderText);

  const content = createElement('div',
    { className: 'acadel-tech-content' },
    [logo, mensajeContainer, progressContainer, stepsContainer, statusTerminal, agentDescription]
  );

  const initialLoader = createElement('div',
    { className: 'acadel-tech-loader' },
    content
  );

  document.body.appendChild(initialLoader);

  // Estado global del Agente Acadel
  window.acadelTechLoadingState = {
    progress: 0,
    phase: 1,
    startTime: Date.now(),
    ready: false,
    mensajes: mensajesTech,
    mensajeActual: 0,
    intervalosActivos: [],
    dataStreamActive: false,
    terminalLines: [
      '$ Iniciando sistema Acadel...',
      '> Verificando compatibilidad neural...',
      '> ✓ Conexión establecida'
    ]
  };

  const intervaloMensajes = setInterval(() => {
    window.acadelTechLoadingState.mensajeActual =
      (window.acadelTechLoadingState.mensajeActual + 1) % mensajesTech.length;

    const nuevoMensaje = mensajesTech[window.acadelTechLoadingState.mensajeActual];
    loaderText.textContent = nuevoMensaje;

    // Efecto de procesamiento de datos
    loaderText.classList.add('processing');
    setTimeout(() => {
      loaderText.classList.remove('processing');
    }, 600);

    // Efecto de datos aleatorio
    if (Math.random() > 0.6) {
      createDataStreamEffect();
    }

  }, 3500);

  window.acadelTechLoadingState.intervalosActivos.push(intervaloMensajes);

  const intervaloTerminal = setInterval(() => {
    updateTerminalContent();
  }, 2000);

  window.acadelTechLoadingState.intervalosActivos.push(intervaloTerminal);

  // Progreso inicial
  updateAcadelTechProgress(5);

  // Precargar recursos
  preloadCriticalResources();

  setTimeout(() => {
    const firstStep = document.querySelector('.acadel-tech-step[data-step="1"]');
    if (firstStep) {
      addClass(firstStep, 'active');
      firstStep.querySelector('.acadel-tech-step-icon').textContent = '🔄';
      createDataStreamEffect();
    }
  }, 500);

  // Elementos tecnológicos flotantes
  setTimeout(() => {
    createFloatingTechElements();
  }, 1200);

  console.log('🤖 Agente Acadel: Terminal tecnológico inicializado');
}

/**
 * Actualiza el progreso del sistema tecnológico
 */
export function updateAcadelTechProgress(progress) {
  if (!window.acadelTechLoadingState) return;

  window.acadelTechLoadingState.progress = Math.max(window.acadelTechLoadingState.progress, progress);

  let phase;
  let systemStatus = '';

  if (progress < 30) {
    phase = 1;
    systemStatus = 'INICIALIZANDO NÚCLEO';
  } else if (progress < 70) {
    phase = 2;
    systemStatus = 'ESTABLECIENDO PROTOCOLOS';
  } else {
    phase = 3;
    systemStatus = 'ACTIVANDO ASISTENTE';
  }

  window.acadelTechLoadingState.phase = phase;

  document.querySelectorAll('.acadel-tech-step').forEach(step => {
    const stepNum = parseInt(step.dataset.step);
    const icon = step.querySelector('.acadel-tech-step-icon');

    if (stepNum <= phase) {
      addClass(step, 'active');

      if (progress >= 100) {
        // Al 100%, todos completados
        icon.textContent = '✅';
        removeClass(step, 'current');
        addClass(step, 'completed');
      } else if (stepNum === phase) {
        // Paso actual
        icon.textContent = '🔄';
        addClass(step, 'current');
        removeClass(step, 'completed');
      } else {
        // Pasos anteriores
        icon.textContent = '✅';
        removeClass(step, 'current');
        addClass(step, 'completed');
      }
    } else {
      removeClass(step, 'active');
      removeClass(step, 'current');
      removeClass(step, 'completed');
      icon.textContent = '⚪';
    }
  });

  const progressBar = document.getElementById('acadelTechProgress');
  const progressPercent = document.getElementById('acadelTechProgressPercent');
  const progressLabel = document.querySelector('.acadel-tech-progress-label');

  if (progressBar && progressPercent) {
    progressBar.style.width = `${window.acadelTechLoadingState.progress}%`;
    progressPercent.textContent = `${Math.round(window.acadelTechLoadingState.progress)}%`;

    if (progressLabel) {
      if (progress >= 100) {
        progressLabel.textContent = 'AGENTE ACADEL LISTO';
      } else {
        progressLabel.textContent = systemStatus;
      }
    }

    // Efectos de datos en hitos importantes
    if (progress === 50 || progress === 75 || progress === 90 || progress === 100) {
      createDataStreamEffect();
    }
  }
}

/**
 * Crea efecto de flujo de datos tecnológico
 */
function createDataStreamEffect() {
  if (!window.acadelTechLoadingState || window.acadelTechLoadingState.dataStreamActive) return;

  window.acadelTechLoadingState.dataStreamActive = true;

  const loader = document.querySelector('.acadel-tech-loader');
  if (!loader) {
    window.acadelTechLoadingState.dataStreamActive = false;
    return;
  }

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const dataStream = createElement('div', {
        className: 'data-stream-effect'
      });

      // Datos tecnológicos aleatorios
      const dataTypes = ['01001010', 'DATA_SYNC', 'AI_PROC', 'NEURAL_NET', 'ACADEL_SYS', 'TRANSCR_OK', 'SEARCH_IDX'];
      dataStream.textContent = dataTypes[Math.floor(Math.random() * dataTypes.length)];

      // Posición aleatoria
      dataStream.style.left = (Math.random() * 90 + 5) + '%';
      dataStream.style.top = (Math.random() * 70 + 15) + '%';

      loader.appendChild(dataStream);

      setTimeout(() => {
        if (dataStream.parentNode) {
          dataStream.parentNode.removeChild(dataStream);
        }
      }, 1500);
    }, i * 150);
  }

  setTimeout(() => {
    if (window.acadelTechLoadingState) {
      window.acadelTechLoadingState.dataStreamActive = false;
    }
  }, 2000);
}

/**
 * Actualiza el contenido del terminal
 */
function updateTerminalContent() {
  const terminal = document.getElementById('acadelTerminalContent');
  if (!terminal || !window.acadelTechLoadingState) return;

  const newLines = [
    '> Indexando conocimiento académico...',
    '> Configurando transcriptor de audio...',
    '> Activando motor de búsqueda...',
    '> Sincronizando con base de datos...',
    '> Optimizando algoritmos de IA...',
    '> Calibrando detector de consultas...',
    '> Preparando análisis multimodal...',
    '> Estableciendo protocolo de ayuda...'
  ];

  const randomLine = newLines[Math.floor(Math.random() * newLines.length)];
  window.acadelTechLoadingState.terminalLines.push(randomLine);

  // Mantener solo las últimas 5 líneas
  if (window.acadelTechLoadingState.terminalLines.length > 5) {
    window.acadelTechLoadingState.terminalLines.shift();
  }

  terminal.textContent = window.acadelTechLoadingState.terminalLines.join('\n');

  // Efecto de scroll automático
  terminal.scrollTop = terminal.scrollHeight;
}

/**
 * Crea elementos tecnológicos flotantes
 */
function createFloatingTechElements() {
  const techElements = [
    '{ }', '[ ]', '</>', '&&', '||', '->', '=>', 'AI', 'ML', 'NLP', 'API', 'SQL', 'JSON', 'HTTP'
  ];

  const loader = document.querySelector('.acadel-tech-loader');
  if (!loader) return;

  techElements.forEach((element, index) => {
    setTimeout(() => {
      const techElement = createElement('div', {
        className: 'floating-tech-element'
      }, element);

      techElement.style.left = Math.random() * 90 + '%';
      techElement.style.animationDelay = Math.random() * 2 + 's';
      techElement.style.animationDuration = (4 + Math.random() * 3) + 's';

      loader.appendChild(techElement);

      setTimeout(() => {
        if (techElement.parentNode) {
          techElement.parentNode.removeChild(techElement);
        }
      }, 7000);
    }, index * 800);
  });

  // Repetir cada 12 segundos
  setTimeout(() => {
    if (window.acadelTechLoadingState && !window.acadelTechLoadingState.ready) {
      createFloatingTechElements();
    }
  }, 12000);
}

/**
 * Remueve el loading tecnológico
 */
export function removeAcadelTechLoader(forceRemove = false) {
  const initialLoader = document.querySelector('.acadel-tech-loader');
  if (!initialLoader) return;

  if (window.acadelTechLoadingState?.intervalosActivos) {
    window.acadelTechLoadingState.intervalosActivos.forEach(clearInterval);
  }

  // Mensaje final
  const loaderText = initialLoader.querySelector('.acadel-tech-text');
  if (loaderText) {
    loaderText.textContent = '🚀 ¡Agente Acadel operativo! Sistema de asistencia académica totalmente activado 🤖✨';
  }

  // Terminal final
  const terminal = document.getElementById('acadelTerminalContent');
  if (terminal) {
    terminal.textContent = window.acadelTechLoadingState.terminalLines.join('\n') + '\n> ✓ AGENTE ACADEL READY\n> Esperando consultas...';
  }

  // Progreso final
  if (window.acadelTechLoadingState) {
    window.acadelTechLoadingState.ready = true;
    updateAcadelTechProgress(100);

    const progressLabel = document.querySelector('.acadel-tech-progress-label');
    if (progressLabel) {
      progressLabel.textContent = '✅ SISTEMA ACTIVADO';
    }
  }

  // Efecto final de datos
  setTimeout(() => {
    createDataStreamEffect();
  }, 300);

  // Transición de salida
  addClass(initialLoader, 'fade-out-tech');

  setManagedTimeout(() => {
    if (initialLoader.parentNode) {
      initialLoader.parentNode.removeChild(initialLoader);
    }
    console.log('🤖 Agente Acadel: Terminal tecnológico cerrado correctamente!');
  }, 1500, 'remove-acadel-tech-loader');
}

/**
 * Forzar completar todos los pasos
 */
export function completeAllAcadelTechSteps() {
  document.querySelectorAll('.acadel-tech-step').forEach((step, index) => {
    const icon = step.querySelector('.acadel-tech-step-icon');

    addClass(step, 'active');
    addClass(step, 'completed');
    removeClass(step, 'current');

    setTimeout(() => {
      icon.textContent = '✅';

      if (index === 2) { // Último paso
        createDataStreamEffect();
      }
    }, index * 200);
  });
}

export function updateLoaderProgress(progress) {
  return updateAcadelTechProgress(progress);
}

function preloadCriticalResources() {
  const criticalImages = [
    '/images/Pensando_claro.gif',
    '/images/Pensando_oscuro.gif',
    '/images/Laptop_claro.gif',
    '/images/Laptop_oscuro.gif'
  ];

  let loaded = 0;
  criticalImages.forEach(src => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      updateAcadelTechProgress(10 + (loaded / criticalImages.length * 15));
    };
    img.src = src;
  });
}

export function removeInitialLoader(forceRemove = false) {
  return removeAcadelTechLoader(forceRemove);
}

export function applyChatSwitchSkeleton() {
  const existingOverlays = document.querySelectorAll('.chat-switch-overlay');
  if (existingOverlays.length > 0) {
    existingOverlays.forEach(overlay => {
      removeClass(overlay, 'active');
      setManagedTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 100, `remove-existing-overlay-${Date.now()}`);
    });
  }

  const overlay = createElement('div', {
    className: 'chat-switch-overlay',
    id: 'chat-switch-overlay-' + Date.now()
  });

  overlay.dataset.startTime = Date.now();

  overlay.innerHTML = `
    <div class="chat-switch-spinner-container">
      <div class="chat-switch-spinner"></div>
      <div class="chat-switch-text">Cambiando de chat...</div>
    </div>
  `;

  overlay.style.cssText = 'z-index:9999;';

  document.body.appendChild(overlay);

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
  }, 10000, `safety-remove-chat-switch-${Date.now()}`);
}

export function removeChatSwitchSkeleton() {
  const overlays = document.querySelectorAll('.chat-switch-overlay');

  if (overlays.length === 0) {
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

    setManagedTimeout(() => {
      removeClass(overlay, 'active');

      setManagedTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 400, `remove-overlay-${index}`);
    }, index * 50, `remove-overlay-transition-${index}`);
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    removeClass(chatMessages, 'switching');
  }

  removeHeaderSkeleton();
}

let keydownHandler;

export function showEmptyChatModal(message = null) {
  return modals.showEmptyChatModal(message);
}

export function closeEmptyChatModal() {
  return modals.closeEmptyChatModal();
}


/**
 * Configuración unificada para tipos de medios
 */
const MEDIA_CONFIG = {
  youtube: {
    icon: '<i class="fa fa-youtube media-type-icon" aria-hidden="true"></i>',
    iconFallback: '📺',
    processingMessage: 'Procesando video de YouTube',
    submessage: 'Preparando el video para interactuar con la IA',
    progressEndpoint: 'video-processing-status',
    progressDetailEndpoint: 'video-progress'
  },
  audio: {
    icon: '<i class="fa fa-headphones media-type-icon" aria-hidden="true"></i>',
    iconFallback: '🎧',
    processingMessage: 'Procesando archivo de audio',
    submessage: 'Analizando el contenido para interactuar con la IA',
    progressEndpoint: 'audio-processing-status',
    progressDetailEndpoint: 'audio-progress'
  }
};

/**
 * Verifica si hay procesamiento activo y muestra loader si es necesario
 */
export function checkMediaProcessingStatus(mediaType, chatId) {
  return new Promise(async (resolve) => {
    try {
      const transcriptionResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-transcription`);
      const transcriptionData = await transcriptionResponse.json();

      if (transcriptionData.success && transcriptionData.hasTranscription) {
        hideMediaProcessingLoader(mediaType);
        resolve(false);
        return;
      }

      const processingChat = localStorage.getItem(`${mediaType}ProcessingChat`);
      const loaderId = localStorage.getItem(`${mediaType}ProcessingLoader`);

      if (processingChat === chatId && loaderId) {
        if (!document.getElementById(loaderId)) {
          showMediaProcessingLoader(chatId, null, mediaType === 'audio');
        }

        startMediaProcessingCheck(mediaType, chatId);
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      console.error(`Error verificando estado de procesamiento:`, error);
      resolve(false);
    }
  });
}

/**
 * Inicia verificación periódica del estado de procesamiento
 */
export function startMediaProcessingCheck(mediaType, chatId) {
  if (window[`${mediaType}ProcessingInterval`]) {
    clearInterval(window[`${mediaType}ProcessingInterval`]);
  }

  const config = MEDIA_CONFIG[mediaType];
  const endpoint = `/api/video-transcription/chat/${chatId}/${config.progressEndpoint}`;

  console.log(`Iniciando verificación de procesamiento de ${mediaType} para chat ${chatId}`);

  let checkCount = 0;
  const maxChecks = 100;

  window[`${mediaType}ProcessingInterval`] = setInterval(async () => {
    try {
      checkCount++;

      if (checkCount > maxChecks) {
        console.warn(`Alcanzado límite de verificaciones para ${mediaType}, deteniendo`);
        clearInterval(window[`${mediaType}ProcessingInterval`]);
        hideMediaProcessingLoader(mediaType);
        acadelWarning(
          "⏰ Mi cerebro de capibara se tomó un café extra",
          "El procesamiento está más lento que mi internet rural. Dame un momentito más..."
        );
        return;
      }

      const processingChat = localStorage.getItem(`${mediaType}ProcessingChat`);

      if (!processingChat || processingChat !== chatId) {
        console.log(`No hay procesamiento activo de ${mediaType} para chat ${chatId}, deteniendo`);
        clearInterval(window[`${mediaType}ProcessingInterval`]);
        return;
      }

      console.log(`Verificando estado de procesamiento de ${mediaType} para chat ${chatId} (intento ${checkCount})`);

      const response = await fetch(endpoint);
      const data = await response.json();

      console.log(`Resultado de verificación para ${mediaType}:`, data);

      if (data.success && !data.processing) {
        console.log(`Procesamiento de ${mediaType} completado para chat ${chatId}`);
        handleProcessingCompleted(mediaType, chatId);
        clearInterval(window[`${mediaType}ProcessingInterval`]);
      } else if (data.success === false && data.processing === false) {
        console.warn(`Se detectó un error en el procesamiento de ${mediaType}`);
        handleProcessingError(mediaType, data);
        clearInterval(window[`${mediaType}ProcessingInterval`]);
      } else if (data.success && data.processing && data.error) {
        console.warn(`Error detectado durante el procesamiento de ${mediaType}:`, data.error);
        handleProcessingError(mediaType, data);
        clearInterval(window[`${mediaType}ProcessingInterval`]);
      }

    } catch (error) {
      console.error(`Error verificando estado de procesamiento de ${mediaType}:`, error);

      if (checkCount > 20) {
        clearInterval(window[`${mediaType}ProcessingInterval`]);
        hideMediaProcessingLoader(mediaType);
        updateUIAfterError(mediaType);
      }
    }
  }, 6000);
}

/**
 * Maneja la finalización exitosa del procesamiento
 */
function handleProcessingCompleted(mediaType, chatId) {
  hideMediaProcessingLoader(mediaType);

  if (mediaType === 'youtube') {
    import('../components/youtube-panel.js').then(module => {
      if (module.youtubePanel?.checkForVideo) {
        module.youtubePanel.checkForVideo();
      }
    }).catch(err => console.error('Error al cargar el panel de YouTube:', err));
  } else {
    import('../components/audio-panel.js').then(module => {
      if (module.audioPanel?.resetPanel) {
        console.log('Reiniciando panel de audio después de procesamiento completado');
        module.audioPanel.resetPanel();
      } else if (module.audioPanel?.checkForAudio) {
        module.audioPanel.checkForAudio();
      }
    }).catch(err => console.error('Error al cargar el panel de audio:', err));
  }

  try {
    import('../core/event-bus-agente.js').then(module => {
      if (module.default?.emit) {
        console.log(`Emitiendo evento media:processing:completed para ${mediaType}`);

        module.default.emit('media:processing:completed', {
          chatId,
          mediaType,
          success: true
        });

        module.default.emit('transcription:completed', {
          chatId,
          mediaType,
          success: true
        });
      }
    }).catch(err => console.error('Error al emitir evento de procesamiento completado:', err));
  } catch (eventError) {
    console.error('Error al emitir evento:', eventError);
  }

  acadelConfetti(
    "🎉 ¡Tarea completada como todo un académico!",
    "Acadel terminó de procesar tu contenido. ¡Mi cerebro peludo funcionó perfectamente!"
  );
}

/**
 * Maneja errores durante el procesamiento
 */
function handleProcessingError(mediaType, data) {
  if (data && (
    data.cancelled === true ||
    data.status === 'cancelled' ||
    (data.error && data.error.includes('cancelado')) ||
    (data.error && data.error.includes('cancelled')) ||
    (data.message && data.message.includes('cancelado'))
  )) {
    console.log('Procesamiento cancelado correctamente, no mostrando como error');

    hideMediaProcessingLoader(mediaType);

    try {
      import('../core/event-bus-agente.js').then(module => {
        if (module.default?.emit) {
          module.default.emit('media:processing:cancelled', {
            chatId: localStorage.getItem(`${mediaType}ProcessingChat`),
            mediaType
          });
        }
      }).catch(err => console.error('Error al emitir evento de cancelación:', err));
    } catch (eventError) {
      console.error('Error al emitir evento de cancelación:', eventError);
    }

    return;
  }

  const loaderId = localStorage.getItem(`${mediaType}ProcessingLoader`);

  if (loaderId) {
    let errorMessage = data.error || `Error durante el procesamiento de ${mediaType}`;
    let errorDetails = data.details || {};

    if (errorMessage.includes('malicioso') ||
      errorMessage.includes('virus') ||
      errorMessage.includes('detectado') ||
      (errorDetails?.viruses)) {

      errorMessage = '🦠 ¡Mi detector de bichos malvados se activó!';

      if (errorDetails && !errorDetails.message) {
        errorDetails.message = 'Acadel encontró algo sospechoso en tu archivo. ¡Mi instinto de capibara dice que mejor no toquemos eso!';
      }
    }

    showMediaLoadingError(mediaType, errorMessage, { details: errorDetails });
  } else {
    hideMediaProcessingLoader(mediaType);
    acadelError(
      "🤖 ¡Mi circuito interno hizo cortocircuito!",
      `Acadel tuvo un momento confuso. ¡Pero tranquilo, estos bichos peludos somos resistentes!`
    );
  }

  try {
    import('../core/event-bus-agente.js').then(module => {
      if (module.default?.emit) {
        console.log(`Emitiendo evento media:processing:failed para ${mediaType}`);

        module.default.emit('media:processing:failed', {
          chatId: localStorage.getItem(`${mediaType}ProcessingChat`),
          mediaType,
          success: false,
          error: data.error || 'Error desconocido'
        });

        module.default.emit('transcription:completed', {
          chatId: localStorage.getItem(`${mediaType}ProcessingChat`),
          mediaType,
          success: false,
          error: data.error || 'Error desconocido'
        });
      }
    }).catch(err => console.error('Error al emitir evento de procesamiento fallido:', err));
  } catch (eventError) {
    console.error('Error al emitir evento:', eventError);
  }

  // Reiniciar panel para futuros procesos
  if (mediaType === 'audio') {
    import('../components/audio-panel.js').then(module => {
      if (module.audioPanel?.resetPanel) {
        console.log('Reiniciando panel de audio después de error en procesamiento');
        setTimeout(() => module.audioPanel.resetPanel(), 500);
      }
    }).catch(err => console.error('Error al reiniciar panel de audio:', err));
  }
}
/**
 * Función unificada para mostrar loader de procesamiento de medios
 */
export function showMediaProcessingLoader(chatId, url = null, isAudio = false) {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(`/api/video-transcription/chat/${chatId}/has-transcription`);
      const data = await response.json();

      if (data.success && data.hasTranscription) {
        hideMediaProcessingLoader('youtube');
        hideMediaProcessingLoader('audio');
        resolve(null);
        return;
      }

      const mediaType = isAudio ? 'audio' : 'youtube';
      const config = MEDIA_CONFIG[mediaType];
      const loaderId = `media-loading-${mediaType}-${chatId}-${Date.now()}`;

      const existingLoaders = document.querySelectorAll(`.media-loading-overlay.${mediaType}-type`);
      existingLoaders.forEach(loader => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      });

      const loadingOverlay = createElement('div', {
        className: `media-loading-overlay ${mediaType}-type`,
        id: loaderId
      });

      const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
        localStorage.getItem('theme') === 'dark';
      const logoPath = isDarkTheme
        ? '/images/Laptop_oscuro.gif'
        : '/images/Laptop_claro.gif';

      const hasFA = document.querySelector('link[href*="font-awesome"]') !== null;
      const iconHTML = hasFA ? config.icon : config.iconFallback;

      const particlesHTML = createParticlesHTML(mediaType, 15);

      loadingOverlay.innerHTML = `
        <div class="floating-particles">
          ${particlesHTML}
        </div>
        <div class="media-loading-content">
          <div class="media-loading-gif-container">
            <img src="${logoPath}" alt="Cargando" class="media-loading-gif" />
          </div>
          <p class="media-loading-message">${iconHTML} ${config.processingMessage}<span class="loading-dots"></span></p>
          <p class="media-loading-submessage">${config.submessage}</p>
          
          <button id="cancel-transcription-btn" class="media-cancel-button">
            <i class="bx bx-x-circle"></i> Cancelar procesamiento
          </button>
          
          <div class="media-loading-progress"></div>
        </div>
      `;

      const cancelBtn = loadingOverlay.querySelector('#cancel-transcription-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
          cancelBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelando...';
          cancelBtn.disabled = true;

          loadingOverlay.classList.add('error-state');

          const messageElement = loadingOverlay.querySelector('.media-loading-message');
          const submessageElement = loadingOverlay.querySelector('.media-loading-submessage');
          const gifElement = loadingOverlay.querySelector('.media-loading-gif');
          const progressElement = loadingOverlay.querySelector('.media-loading-progress');

          if (messageElement) {
            messageElement.innerHTML = '<i class="bx bx-x-circle"></i> Cancelando procesamiento';
          }

          if (submessageElement) {
            submessageElement.textContent = 'Deteniendo el procesamiento actual...';
          }

          if (gifElement) {
            gifElement.classList.add('cancelling');
          }

          if (progressElement) {
            progressElement.style.width = '100%';
            progressElement.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
          }

          try {
            await cancelTranscriptionProcess(chatId, mediaType);
          } catch (error) {
            console.error('Error en la cancelación:', error);
            setTimeout(() => {
              hideMediaProcessingLoader(mediaType);
              acadelError(
                "🤯 ¡Mi sistema de parada se trabó!",
                "Acadel se enredó intentando cancelar. Es como tratar de parar de comer pizza... imposible."
              );
            }, 2000);
          }
        });
      }

      document.body.appendChild(loadingOverlay);

      setTimeout(() => {
        addClass(loadingOverlay, 'visible');
      }, 10);

      localStorage.setItem(`${mediaType}ProcessingLoader`, loaderId);
      localStorage.setItem(`${mediaType}ProcessingChat`, chatId);

      startProgressAnimation(loaderId, mediaType);

      resolve(loaderId);
    } catch (error) {
      console.error('Error verificando transcripciones existentes:', error);
      resolve(null);
    }
  });
}

/**
 * Cancela el proceso de transcripción
 */

// 1. REEMPLAZAR cancelTranscriptionProcess() - línea ~1140 aprox
async function cancelTranscriptionProcess(chatId, mediaType) {
  try {
    const userId = getState('userId');
    const loaderId = localStorage.getItem(`${mediaType}ProcessingLoader`);
    const loadingOverlay = document.getElementById(loaderId);

    if (!loadingOverlay) {
      console.warn(`No se encontró el overlay de carga para cancelar ${mediaType}`);

      hideMediaProcessingLoader(mediaType);
      localStorage.removeItem(`${mediaType}ProcessingLoader`);
      localStorage.removeItem(`${mediaType}ProcessingChat`);

      if (window[`${mediaType}ProcessingInterval`]) {
        clearInterval(window[`${mediaType}ProcessingInterval`]);
        window[`${mediaType}ProcessingInterval`] = null;
      }

      acadelInfo(
        "🛑 ¡Operación cancelada por el jefe peludo!",
        "Acadel detuvo todo como un capibara obediente. ¡No hay drama, solo eficiencia!"
      );
      return;
    }

    loadingOverlay.classList.add('error-state');

    if (loadingOverlay.progressCheckInterval) {
      clearInterval(loadingOverlay.progressCheckInterval);
      loadingOverlay.progressCheckInterval = null;
    }
    if (loadingOverlay.updateInterval) {
      clearInterval(loadingOverlay.updateInterval);
      loadingOverlay.updateInterval = null;
    }

    const cancelResponse = await fetch(`/api/chats/chats/${chatId}/cancel-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || window.CSRF_TOKEN,
        'id_user': userId
      },
      credentials: 'include',
      body: JSON.stringify({ userId, mediaType })
    });

    if (!cancelResponse.ok) {
      console.error('❌ Error en request de cancelación:', cancelResponse.status);

      setTimeout(() => {
        hideMediaProcessingLoader(mediaType);
        acadelError(
          "🤯 ¡Mi sistema de parada se trabó!",
          "Acadel se enredó intentando cancelar. Es como tratar de parar de comer pizza... imposible."
        );
      }, 2000);
      return;
    }

    const cancelResult = await cancelResponse.json();
    console.log('✅ Cancelación enviada exitosamente:', cancelResult);

    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 3; // Reducido de 4 a 3

    while (!isCancelled && attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 800)); // Reducido de 1000 a 800

        const config = MEDIA_CONFIG[mediaType];
        const endpoint = `/api/video-transcription/chat/${chatId}/${config.progressDetailEndpoint}`;
        const progressResponse = await fetch(endpoint);

        if (!progressResponse.ok) {
          console.warn('Error verificando estado después de cancelación, pero esto es normal');
          isCancelled = true; // Asumir que se canceló si no podemos verificar
          break;
        }

        const progressData = await progressResponse.json();

        if (progressData.cancelled || !progressData.processing) {
          isCancelled = true;

          const submessageElement = loadingOverlay.querySelector('.media-loading-submessage');
          if (submessageElement?.parentNode) {
            submessageElement.innerHTML = '<span style="color:#4CAF50">Cancelación completada. Cerrando...</span>';
          }
          break;
        }
      } catch (checkError) {
        console.warn('Error verificando estado de cancelación (normal durante cancelación):', checkError);
        isCancelled = true; // Asumir cancelación exitosa
        break;
      }

      attempts++;
    }

    await new Promise(resolve => setTimeout(resolve, 1200)); // Reducido de 1500

    hideMediaProcessingLoader(mediaType, loaderId);

    if (window[`${mediaType}ProcessingInterval`]) {
      clearInterval(window[`${mediaType}ProcessingInterval`]);
      window[`${mediaType}ProcessingInterval`] = null;
    }

    localStorage.removeItem(`${mediaType}ProcessingLoader`);
    localStorage.removeItem(`${mediaType}ProcessingChat`);

    window.acadelInfo(
      "✋ ¡Cancelación nivel ninja completada!",
      "Acadel paró todo más rápido que un capibara huyendo de un cocodrilo. ¡Todo bajo control!"
    );

    try {
      import('../core/event-bus-agente.js').then(module => {
        if (module.default?.emit) {
          console.log(`Emitiendo evento media:processing:cancelled para ${mediaType}`);

          module.default.emit('media:processing:cancelled', {
            chatId,
            mediaType
          });

          module.default.emit('transcription:cancelled', {
            chatId,
            mediaType
          });
        }
      }).catch(err => console.error('Error al emitir evento de cancelación:', err));
    } catch (eventError) {
      console.error('Error al emitir evento de cancelación:', eventError);
    }

    const isNewChat = document.querySelectorAll('.chat-messages .message').length <= 1;
    const currentChatId = getState('currentChatId');
    const isCurrentChat = currentChatId === chatId;

    if (isNewChat && isCurrentChat) {
      console.log("Cancelando chat nuevo y volviendo a pantalla de bienvenida");

      try {
        const { deleteChat } = await import('../api/chat-agente.js').catch(() => ({ deleteChat: null }));
        if (typeof deleteChat === 'function') {
          await deleteChat(chatId);
          console.log(`Chat nuevo cancelado ${chatId} eliminado del servidor`);

          const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
          if (chatItem) {
            chatItem.remove();
          }
        }

        setTimeout(() => {
          const fixedSpace = document.querySelector('.fixed-space');
          if (fixedSpace) {
            fixedSpace.style.opacity = '0';
            fixedSpace.style.display = 'none';
            fixedSpace.style.pointerEvents = 'none';
            fixedSpace.style.overflow = 'hidden';

            if (typeof updateHeaderSubtitle === 'function') {
              updateHeaderSubtitle(null);
            }
            void fixedSpace.offsetHeight;
          }

          if (typeof clearChatMessages === 'function') {
            clearChatMessages();
          } else {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
              chatMessages.innerHTML = '';
            }
          }

          import('../core/state-agente.js').then(module => {
            if (module?.setCurrentChat) {
              module.setCurrentChat(null);
            }
          }).catch(e => console.warn('Error al actualizar estado:', e));

          import('../core/config-agente.js').then(module => {
            if (module?.URL_CONFIG?.basePath) {
              history.pushState({}, '', module.URL_CONFIG.basePath);
            } else {
              history.pushState({}, '', '/agente');
            }
          }).catch(() => {
            history.pushState({}, '', '/agente');
          });

          setTimeout(() => {
            import('./welcome-message-agente.js').then(module => {
              if (module?.showWelcomeMessage) {
                module.showWelcomeMessage();
              }
            }).catch(e => console.warn('Error al mostrar mensaje de bienvenida:', e));
          }, 150);
        }, 500);
      } catch (resetError) {
        console.error('Error al volver a pantalla de bienvenida:', resetError);
      }
    } else {
      updateUIAfterError(mediaType);
    }

  } catch (error) {
    console.error('Error procesando cancelación:', error);

    window.acadelError(
      "🤯 ¡Error en la operación de parada!",
      "Acadel se enredó tratando de cancelar. Es como intentar parar de comer cuando hay pizza disponible."
    );

    hideMediaProcessingLoader(mediaType);

    try {
      setTimeout(() => {
        const audioButton = document.querySelector('.audio-panel-trigger');
        const youtubeButton = document.querySelector('.youtube-panel-trigger');

        if (audioButton && mediaType === 'audio') {
          audioButton.style.display = 'flex';
        }

        if (youtubeButton && mediaType === 'youtube') {
          youtubeButton.style.display = 'flex';
        }
      }, 500);
    } catch (e) {
      console.error('Error al restaurar botones después de cancelación con error:', e);
    }
  }
}

/**
 * Inicia animación de progreso
 */
function startProgressAnimation(loaderId, mediaType) {
  const loadingElement = document.getElementById(loaderId);
  if (!loadingElement) return;

  const messageElement = loadingElement.querySelector('.media-loading-submessage');
  const initialMessage = messageElement?.textContent || '';

  let progressBar = loadingElement.querySelector('.media-loading-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'media-loading-progress';
    loadingElement.querySelector('.media-loading-content').appendChild(progressBar);
  }

  let stage = 0;
  const messages = {
    youtube: [
      'Acadel está olfateando los metadatos del video...',
      'Separando el audio como quien pela una zanahoria...',
      'Mi cerebro peludo está transcribiendo cada palabra...',
      'Preparando todo para una charla académica épica...',
      'Acadel está puliendo los últimos detalles...'
    ],
    audio: [
      'Acadel está desenredando las ondas sonoras...',
      'Mi oído de capibara está captando cada detalle...',
      'Convirtiendo sonidos en texto como por arte de magia...',
      'Organizando todo para una sesión de estudio increíble...',
      'Acadel está dando los toques finales...'
    ]
  };

  let lastProgress = 0;

  if (progressBar) {
    progressBar.style.width = '5%';
    progressBar.style.transition = 'width 0.8s ease';
  }

  const progressCheckInterval = setInterval(async () => {
    try {
      const loadingElement = document.getElementById(loaderId);
      if (!loadingElement || loadingElement.dataset.cancelling === "true") {
        clearInterval(progressCheckInterval);
        return;
      }

      const chatId = localStorage.getItem(`${mediaType}ProcessingChat`);
      if (!chatId) {
        clearInterval(progressCheckInterval);
        return;
      }

      const config = MEDIA_CONFIG[mediaType];
      const endpoint = `/api/video-transcription/chat/${chatId}/${config.progressDetailEndpoint}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        console.warn('Respuesta no exitosa del endpoint de progreso');
        return;
      }

      const data = await response.json();

      if (!data.processing || data.cancelled) {
        clearInterval(progressCheckInterval);

        if (loadingElement.updateInterval) {
          clearInterval(loadingElement.updateInterval);
          loadingElement.updateInterval = null;
        }

        if (data.cancelled && messageElement && !loadingElement.dataset.cancelling) {
          messageElement.innerHTML = '<span style="color:#e74c3c">El procesamiento fue cancelado</span>';
        }

        return;
      }

      if (data.progress && progressBar) {
        if (data.progress > lastProgress) {
          lastProgress = data.progress;
          progressBar.style.width = `${data.progress}%`;
        }
      }

      if (data.stage && messageElement && !loadingElement.dataset.cancelling) {
        messageElement.textContent = data.stage;
        messageElement.style.animation = 'none';
        void messageElement.offsetWidth;
        messageElement.style.animation = 'fade-in 0.5s ease-out both';
      }

    } catch (error) {
      console.warn('Error verificando progreso:', error);
    }
  }, 5000);

  // Actualización visual de respaldo
  const updateInterval = setInterval(() => {
    const loaderStillExists = document.getElementById(loaderId);
    if (!loaderStillExists ||
      loaderStillExists.dataset.cancelling === "true" ||
      stage >= messages[mediaType].length) {
      clearInterval(updateInterval);
      return;
    }

    const simulatedProgress = 10 + (stage * 20);
    if (messageElement && !loaderStillExists.dataset.cancelling) {
      if (lastProgress < simulatedProgress) {
        messageElement.textContent = messages[mediaType][stage];
        messageElement.style.animation = 'none';
        void messageElement.offsetWidth;
        messageElement.style.animation = 'fade-in 0.5s ease-out both';
      }
    }

    if (progressBar && lastProgress < simulatedProgress) {
      progressBar.style.width = `${simulatedProgress}%`;
    }

    stage++;
  }, 5000);

  loadingElement.progressCheckInterval = progressCheckInterval;
  loadingElement.updateInterval = updateInterval;
}

/**
 * Genera HTML para partículas animadas
 */
function createParticlesHTML(mediaType, count = 10) {
  let particlesHTML = '';

  for (let i = 0; i < count; i++) {
    const size = Math.floor(Math.random() * 6) + 4;
    const startPositionLeft = Math.floor(Math.random() * 100);
    const startPositionTop = Math.floor(Math.random() * 100);
    const duration = Math.floor(Math.random() * 15) + 10;
    const delay = Math.floor(Math.random() * 5);
    const translateX = Math.floor(Math.random() * 60) - 30;

    particlesHTML += `
      <div class="particle" 
           style="left: ${startPositionLeft}%; 
                  top: ${startPositionTop}%; 
                  width: ${size}px; 
                  height: ${size}px;
                  --duration: ${duration}s;
                  --translateX: ${translateX}px;
                  animation-delay: ${delay}s;">
      </div>
    `;
  }

  return particlesHTML;
}

/**
 * Oculta el indicador de carga de medios
 */
export function hideMediaProcessingLoader(mediaType, loaderId) {
  console.log(`Ocultando loader de ${mediaType}, ID: ${loaderId}`);

  if (!loaderId) {
    loaderId = localStorage.getItem(`${mediaType}ProcessingLoader`);
    console.log(`Obtenido loaderId de localStorage: ${loaderId}`);
  }

  localStorage.removeItem(`${mediaType}ProcessingLoader`);
  localStorage.removeItem(`${mediaType}ProcessingChat`);

  if (window[`${mediaType}ProcessingInterval`]) {
    clearInterval(window[`${mediaType}ProcessingInterval`]);
    window[`${mediaType}ProcessingInterval`] = null;
  }

  if (loaderId) {
    const loadingOverlay = document.getElementById(loaderId);
    if (loadingOverlay) {
      if (loadingOverlay.progressCheckInterval) {
        clearInterval(loadingOverlay.progressCheckInterval);
        loadingOverlay.progressCheckInterval = null;
      }
      if (loadingOverlay.updateInterval) {
        clearInterval(loadingOverlay.updateInterval);
        loadingOverlay.updateInterval = null;
      }

      addClass(loadingOverlay, 'closing');
      removeClass(loadingOverlay, 'visible');

      setManagedTimeout(() => {
        if (loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
      }, 500, `hide-${mediaType}-loading-${loaderId}`);

      return;
    }
  }

  console.log(`Buscando todos los loaders de tipo ${mediaType}`);
  const allLoaders = document.querySelectorAll(`.media-loading-overlay.${mediaType}-type`);

  if (allLoaders.length > 0) {
    console.log(`Encontrados ${allLoaders.length} loaders de tipo ${mediaType}`);
    allLoaders.forEach((loader, index) => {
      if (loader.progressCheckInterval) {
        clearInterval(loader.progressCheckInterval);
        loader.progressCheckInterval = null;
      }
      if (loader.updateInterval) {
        clearInterval(loader.updateInterval);
        loader.updateInterval = null;
      }

      addClass(loader, 'closing');
      removeClass(loader, 'visible');

      setManagedTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 500, `hide-${mediaType}-all-${index}`);
    });
  } else {
    console.log(`No se encontraron loaders de tipo ${mediaType}`);
  }
}

/**
 * Muestra error en loader de medios
 */
export function showMediaLoadingError(mediaType, errorMessage, errorDetails = {}) {
  const chatId = localStorage.getItem(`${mediaType}ProcessingChat`);

  if (!chatId) {
    console.warn(`No se encontró chatId para ${mediaType} en localStorage`);
    window.acadelError(
      "🚨 ¡Alerta en el laboratorio de capibara!",
      `Acadel detectó un problemita. ¡Pero tranquilo, estos bichos peludos somos resistentes!`
    );
    return false;
  }

  if (errorMessage && (
    errorMessage.includes('cancelado') ||
    errorMessage.includes('cancelled') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('Procesamiento cancelado por el usuario')
  )) {
    console.log('Detectada cancelación, no mostrando como error');
    hideMediaProcessingLoader(mediaType);
    return false;
  }

  if (errorDetails && (
    errorDetails.cancelled === true ||
    errorDetails.status === 'cancelled' ||
    (errorDetails.details && errorDetails.details.includes('cancelado'))
  )) {
    console.log('Detectada cancelación en errorDetails, no mostrando como error');
    hideMediaProcessingLoader(mediaType);
    return false;
  }

  try {
    const loaderId = localStorage.getItem(`${mediaType}ProcessingLoader`);
    let loadingOverlay = null;

    if (loaderId) {
      loadingOverlay = document.getElementById(loaderId);
    }

    if (!loadingOverlay) {
      console.warn(`No se encontró un loader activo de ${mediaType} para mostrar error. Intentando crear uno...`);

      const newLoaderId = `media-loading-${mediaType}-${chatId}-${Date.now()}`;

      const overlay = document.createElement('div');
      overlay.className = `media-loading-overlay ${mediaType}-type`;
      overlay.id = newLoaderId;

      const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' ||
        localStorage.getItem('theme') === 'dark';
      const logoPath = isDarkTheme
        ? '/images/Laptop_oscuro.gif'
        : '/images/Laptop_claro.gif';

      overlay.innerHTML = `
        <div class="media-loading-content">
          <div class="media-loading-gif-container">
            <img src="${logoPath}" alt="Error" class="media-loading-gif cancelling" />
          </div>
          <p class="media-loading-message"><i class="bx bx-error-circle"></i> Error de procesamiento</p>
          <p class="media-loading-submessage">${errorMessage || 'Ha ocurrido un error durante el procesamiento'}</p>
          <button id="cancel-transcription-btn" class="media-cancel-button" disabled>
            <i class="bx bx-loader-alt bx-spin"></i> Cancelando...
          </button>
          <div class="media-loading-progress" style="width: 100%; background: linear-gradient(90deg, #e74c3c, #c0392b);"></div>
        </div>
      `;

      document.body.appendChild(overlay);
      loadingOverlay = overlay;
      localStorage.setItem(`${mediaType}ProcessingLoader`, newLoaderId);
      loadingOverlay.classList.add('error-state');

      setTimeout(() => {
        loadingOverlay.classList.add('visible');
      }, 50);

    } else {
      if (loadingOverlay.progressCheckInterval) {
        clearInterval(loadingOverlay.progressCheckInterval);
        loadingOverlay.progressCheckInterval = null;
      }
      if (loadingOverlay.updateInterval) {
        clearInterval(loadingOverlay.updateInterval);
        loadingOverlay.updateInterval = null;
      }

      loadingOverlay.classList.add('error-state');

      const messageElement = loadingOverlay.querySelector('.media-loading-message');
      const submessageElement = loadingOverlay.querySelector('.media-loading-submessage');
      const gifElement = loadingOverlay.querySelector('.media-loading-gif');
      const progressElement = loadingOverlay.querySelector('.media-loading-progress');
      const cancelButton = loadingOverlay.querySelector('#cancel-transcription-btn');

      if (messageElement) {
        messageElement.innerHTML = `<i class="bx bx-error-circle"></i> Error de procesamiento`;
      }

      if (submessageElement) {
        submessageElement.textContent = 'Acadel tuvo un momento de confusión académica. ¡Pero no te preocupes, los capibaras somos resilientes!';

        if (errorDetails?.details) {
          const errorDetailsElement = document.createElement('div');
          errorDetailsElement.className = 'error-details';
          errorDetailsElement.style.fontSize = '0.85rem';
          errorDetailsElement.style.marginTop = '8px';
          errorDetailsElement.style.opacity = '0.8';

          if (typeof errorDetails.details === 'string') {
            errorDetailsElement.textContent = errorDetails.details;
          } else if (errorDetails.details.message) {
            errorDetailsElement.textContent = errorDetails.details.message;
          }

          if (submessageElement.parentNode && !submessageElement.parentNode.querySelector('.error-details')) {
            submessageElement.parentNode.appendChild(errorDetailsElement);
          }
        }
      }

      if (gifElement) {
        gifElement.classList.add('cancelling');
      }

      if (progressElement) {
        progressElement.style.width = '100%';
        progressElement.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      }

      if (cancelButton) {
        cancelButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelando...';
        cancelButton.classList.add('error-button');
        cancelButton.disabled = true;
      }
    }

    setTimeout(async () => {
      try {
        const userId = getState('userId');

        if (!chatId || !userId) {
          console.warn('No se pudo obtener chatId o userId para cancelación automática');
          setTimeout(() => {
            hideMediaProcessingLoader(mediaType, loadingOverlay.id);
            updateUIAfterError(mediaType);
          }, 2000);
          return;
        }

        console.log(`Enviando cancelación automática para ${mediaType} en chat ${chatId}`);

        try {
          const cancelResponse = await fetch(`/api/chats/chats/${chatId}/cancel-request`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || window.CSRF_TOKEN,
              'id_user': userId
            },
            credentials: 'include',
            body: JSON.stringify({ userId, mediaType })
          });

          const markResponse = await fetch(`/api/chats/chats/${chatId}/cancel`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || window.CSRF_TOKEN,
              'id_user': userId
            },
            credentials: 'include',
            body: JSON.stringify({
              userId,
              avaId: getState('currentAvaId') || 2
            })
          });
        } catch (cancelError) {
          console.warn('Error en cancelación automática (continuando con limpieza):', cancelError);
        }

        const submessageElement = loadingOverlay.querySelector('.media-loading-submessage');
        if (submessageElement) {
          submessageElement.innerHTML = '<span style="color:#4CAF50">Cancelación completada. Cerrando...</span>';
        }

        setTimeout(async () => {
          const isNewChat = document.querySelectorAll('.chat-messages .message').length <= 1;
          const currentChatId = chatId;
          const isCurrentChat = getState('currentChatId') === chatId;

          hideMediaProcessingLoader(mediaType, loadingOverlay.id);
          localStorage.removeItem(`${mediaType}ProcessingLoader`);
          localStorage.removeItem(`${mediaType}ProcessingChat`);

          if (window[`${mediaType}ProcessingInterval`]) {
            clearInterval(window[`${mediaType}ProcessingInterval`]);
            window[`${mediaType}ProcessingInterval`] = null;
          }

          if (isNewChat && isCurrentChat) {
            console.log("Detectado chat nuevo después de error, volviendo a pantalla de bienvenida");

            try {
              const deleteChat = async (chatId) => {
                try {
                  const response = await fetch(`/api/chats/chats/${chatId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || window.CSRF_TOKEN,
                      'id_user': userId
                    }
                  });
                  return response.ok;
                } catch (e) {
                  console.error('Error eliminando chat:', e);
                  return false;
                }
              };

              await deleteChat(chatId);
              console.log(`Chat nuevo con error ${chatId} eliminado del servidor`);

              const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
              if (chatItem) {
                chatItem.remove();
              }

              setTimeout(() => {
                const fixedSpace = document.querySelector('.fixed-space');
                if (fixedSpace) {
                  fixedSpace.style.opacity = '0';
                  fixedSpace.style.display = 'none';
                  fixedSpace.style.pointerEvents = 'none';
                  fixedSpace.style.overflow = 'hidden';
                  void fixedSpace.offsetHeight;
                }

                const clearChatMessages = () => {
                  const chatMessages = document.querySelector('.chat-messages');
                  if (chatMessages) {
                    chatMessages.innerHTML = '';
                  }
                };
                clearChatMessages();

                import('../core/state-agente.js').then(module => {
                  if (module?.setCurrentChat) {
                    module.setCurrentChat(null);
                  }
                }).catch(e => console.warn('Error al actualizar estado:', e));

                import('../core/config-agente.js').then(module => {
                  if (module?.URL_CONFIG?.basePath) {
                    history.pushState({}, '', module.URL_CONFIG.basePath);
                  } else {
                    history.pushState({}, '', '/agente');
                  }
                }).catch(() => {
                  history.pushState({}, '', '/agente');
                });

                setTimeout(() => {
                  import('./welcome-message-agente.js').then(module => {
                    if (module?.showWelcomeMessage) {
                      module.showWelcomeMessage();
                    }
                  }).catch(e => console.warn('Error al mostrar mensaje de bienvenida:', e));
                }, 150);
              }, 300);
            } catch (resetError) {
              console.error('Error al volver a pantalla de bienvenida después de error:', resetError);
              updateUIAfterError(mediaType);
            }
          } else {
            updateUIAfterError(mediaType);
          }

          acadelInfo(
            "✅ ¡Cancelación ejecutada como un ninja peludo!",
            "Acadel paró todo perfectamente. Operación: No hacer nada... ¡COMPLETADA!"
          );
        }, 1500);

      } catch (error) {
        console.error('Error durante cancelación automática:', error);

        setTimeout(() => {
          hideMediaProcessingLoader(mediaType, loadingOverlay.id);
          updateUIAfterError(mediaType);

          acadelError(
            "💥 ¡Se enredó mi cola de capibara!",
            "Acadel se confundió tratando de cancelar. Es como intentar desconectar el wifi mientras mamá trabaja."
          );
        }, 2000);
      }
    }, 500);

    return true;
  } catch (error) {
    console.error('Error al mostrar error de carga de medios:', error);
    try {
      hideMediaProcessingLoader(mediaType);
    } catch (e) { }

    window.acadelError(
      "🔥 ¡Mi cerebro de capibara hizo chispas!",
      `Acadel tuvo un momento técnico confuso. ¡Pero hey, hasta Einstein se equivocaba!`
    );

    return false;
  }
}

/**
 * Actualiza la UI después de un error
 */
function updateUIAfterError(mediaType) {
  try {
    setTimeout(() => {
      if (window.buttonUpdater?.updateButtons) {
        console.log(`Usando buttonUpdater para mostrar botón después de error`);
        window.buttonUpdater.updateButtons(true);
      } else if (window.transcriptionController?.refreshTranscriptionButtons) {
        console.log(`Usando transcriptionController para mostrar botón después de error`);
        window.transcriptionController.refreshTranscriptionButtons();
      } else if (mediaType === 'audio' && window.audioPanel) {
        console.log(`Usando audioPanel directamente para mostrar botón después de error`);

        if (typeof window.audioPanel.resetPanel === 'function') {
          window.audioPanel.resetPanel();
        } else if (typeof window.audioPanel.checkForAudio === 'function') {
          window.audioPanel.checkForAudio();
        } else {
          const audioButton = document.querySelector('.audio-panel-trigger');
          if (audioButton) {
            audioButton.style.display = 'flex';
          }
        }
      } else if (mediaType === 'youtube' && window.youtubePanel) {
        console.log(`Usando youtubePanel directamente para mostrar botón después de error`);

        if (typeof window.youtubePanel.checkForVideo === 'function') {
          window.youtubePanel.checkForVideo();
        } else {
          const youtubeButton = document.querySelector('.youtube-panel-trigger');
          if (youtubeButton) {
            youtubeButton.style.display = 'flex';
          }
        }
      } else {
        console.log(`Mostrando botones directamente como último recurso`);
        const audioButton = document.querySelector('.audio-panel-trigger');
        const youtubeButton = document.querySelector('.youtube-panel-trigger');

        if (audioButton && mediaType === 'audio') {
          audioButton.style.display = 'flex';
        }

        if (youtubeButton && mediaType === 'youtube') {
          youtubeButton.style.display = 'flex';
        }
      }
    }, 500);
  } catch (e) {
    console.error('Error al actualizar UI después de error:', e);
  }
}

// Funciones de conveniencia para mantener compatibilidad
export function showYouTubeProcessingLoader(chatId) {
  return showMediaProcessingLoader(chatId, null, false);
}

export function hideYouTubeProcessingLoader(loaderId) {
  hideMediaProcessingLoader('youtube', loaderId);
}

export function checkYouTubeProcessingStatus(chatId) {
  return checkMediaProcessingStatus('youtube', chatId);
}

export function startYouTubeProcessingCheck(chatId) {
  startMediaProcessingCheck('youtube', chatId);
}

export function showAudioProcessingLoader(chatId) {
  return showMediaProcessingLoader(chatId, null, true);
}

export function hideAudioProcessingLoader(loaderId) {
  hideMediaProcessingLoader('audio', loaderId);
}

export function checkAudioProcessingStatus(chatId) {
  return checkMediaProcessingStatus('audio', chatId);
}

export function startAudioProcessingCheck(chatId) {
  startMediaProcessingCheck('audio', chatId);
}

export function startProcessingCheck(chatId, isAudio = false) {
  if (isAudio) {
    startAudioProcessingCheck(chatId);
  } else {
    startYouTubeProcessingCheck(chatId);
  }
}

export function checkProcessingStatus(chatId) {
  checkYouTubeProcessingStatus(chatId);
  checkAudioProcessingStatus(chatId);
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
  applySidebarSkeleton,
  removeSidebarSkeleton,
  applyHeaderSkeleton,
  removeHeaderSkeleton,
  applyAppSkeleton,
  removeAppSkeleton,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton,
  setupScrollBehavior,
  cleanupScrollBehavior,
  showEmptyChatModal,
  closeEmptyChatModal,
  showYouTubeProcessingLoader,
  hideYouTubeProcessingLoader,
  checkYouTubeProcessingStatus,
  startYouTubeProcessingCheck,
  showMediaProcessingLoader,
  startProcessingCheck,
  reinitializeTextareaListeners
};