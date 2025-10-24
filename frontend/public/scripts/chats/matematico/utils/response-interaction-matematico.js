/**
 * response-interaction.js - Sistema de botones de interacción minimalista para respuestas
 * Versión optimizada SOLO para flujo multimodal - mantiene toda la lógica existente
 */

// Importar funciones necesarias de los módulos existentes
import { copyToClipboard } from './clipboard-matematico.js';
import { showError } from '../ui/ui-manager-matematico.js';
import { getState } from '../core/state-matematico.js';
import { checkAuthentication } from '../api/auth-matematico.js';
import scrollManager from '../../shared/scroll-manager.js';
import {
  createElement, addEvent, removeEvent,
  setManagedTimeout, clearManagedTimeouts, sanitizeText,
  addClass, removeClass, hasClass
} from '../../shared/dom-helpers.js';
import { toggleUIState, setCurrentFetchController } from '../ui/ui-manager-matematico.js';
import { showTokenLimitNotice } from '../../shared/chat-notices.js';



// Clase para gestionar los botones de interacción en respuestas
class ResponseInteractionManager {
  constructor() {
    // Referencia al controlador de eventos
    this.eventHandlers = {};

    // Clave para los timeouts gestionados
    this.timeoutKeys = {
      scrollUnlock: 'response-interaction-scroll-unlock',
      safetyTimeout: 'response-interaction-safety',
      buttonReset: 'response-interaction-button-reset',
      errorCleanup: 'response-interaction-error-cleanup'
    };

    // Inicializar el sistema
    this.init();

    // Iniciar limpieza periódica
    this.startErrorMessagesCleanup();
  }

  /**
   * Inicia la limpieza periódica de mensajes de error que puedan tener botones de interacción
   */
  startErrorMessagesCleanup() {
    setManagedTimeout(() => {
      this.cleanupErrorMessages();
      this.cleanupCancelledMessageButtons();

      const cleanupInterval = setInterval(() => {
        this.cleanupErrorMessages();
        this.cleanupCancelledMessageButtons();
      }, 2000);

      this.cleanupInterval = cleanupInterval;

      setManagedTimeout(() => {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }, 120000, this.timeoutKeys.errorCleanup);

    }, 1000, 'initial-cleanup');
  }

  /**
 * ✅ NUEVO MÉTODO: Eliminar alerts genéricos cuando se muestra error específico de tokens
 * AGREGAR DENTRO DE LA CLASE
 */
  hideGenericAlerts() {
    try {
      // Eliminar cualquier alert/toast genérico que pueda estar visible
      const genericAlerts = document.querySelectorAll(
        '.alert, .toast, .notification, .error-toast, .swal2-container, .sweet-alert'
      );

      genericAlerts.forEach(alert => {
        if (alert && alert.parentNode) {
          console.log('🧹 Eliminando alert genérico:', alert.className);
          alert.remove();
        }
      });

      // Limpiar overlays y backdrops
      const overlays = document.querySelectorAll(
        '.swal2-backdrop, .sweet-alert-overlay, .alert-overlay'
      );

      overlays.forEach(overlay => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      });

    } catch (error) {
      console.warn('Error limpiando alerts genéricos:', error);
    }
  }

  /**
   * ✅ FUNCIÓN CORREGIDA: Maneja errores de tokens (REEMPLAZAR la existente)
   */
  handleTokenError(error, messageElement, forceShow = false) {
    if (this.isTokenError(error)) {
      console.log('🚫 Error de tokens detectado - Mostrando aviso');

      // Para retry/edit, limpiar estado del mensaje específico
      if (forceShow && typeof window.AcadelChatNotices?.simpleTokenManager?.messageWarnings === 'object') {
        window.AcadelChatNotices.simpleTokenManager.messageWarnings.delete(messageElement);
      }

      // Usar sistema existente
      showTokenLimitNotice(messageElement);
    }
  }

  /**
   * Verifica si un error es relacionado con tokens
   */
  isTokenError(error) {
    if (!error) return false;

    // Verificar propiedades específicas
    if (error.isTokenLimit || error.isPreValidationLimit) {
      return true;
    }

    // Verificar mensaje de error
    const errorMessage = error.message || '';
    const tokenKeywords = [
      'TOKEN_LIMITS',
      'límite de tokens',
      'token limit',
      'excedido',
      'exceeded',
      'pre-validación',
      'proyectado',
      'estimated_limit_exceeded',
      'currentTokens',
      'projectedTokens',
      'maxTokens'
    ];

    return tokenKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Busca y limpia mensajes de error o cancelados que tengan botones de interacción
   */
  cleanupErrorMessages() {
    try {
      const errorMessages = document.querySelectorAll('.message.ai-message.error-message, .message.ai-message.cancelled, .message.ai-message[data-cancelled="true"]');
      const cancelledContentMessages = document.querySelectorAll('.message.ai-message .cancelled-message, .message.ai-message .error-container');
      const cancelledParents = [];

      cancelledContentMessages.forEach(elem => {
        const parent = elem.closest('.ai-message');
        if (parent) cancelledParents.push(parent);
      });

      const messagesToClean = [...errorMessages, ...cancelledParents];

      messagesToClean.forEach(message => {
        const buttons = message.querySelector('.response-actions');
        if (buttons) {
          console.log('Limpiando botones de interacción de mensaje cancelado/error');
          buttons.remove();
        }
      });
    } catch (error) {
      console.error('Error en limpieza de mensajes:', error);
    }
  }

  /**
   * Elimina botones de interacción de mensajes asociados a respuestas canceladas
   */
  cleanupCancelledMessageButtons() {
    try {
      const cancelledAiMessages = document.querySelectorAll('.ai-message.cancelled, .ai-message.just-cancelled, .ai-message[data-cancelled="true"], .ai-message.error-message');

      cancelledAiMessages.forEach(aiMessage => {
        const userMessage = this.getPreviousUserMessage(aiMessage);
        if (userMessage) {
          const userActions = userMessage.querySelector('.user-response-actions');
          if (userActions) {
            userActions.remove(); // ← AQUÍ SE ELIMINAN LOS BOTONES DE EDITAR
          }
        }
      });

      const messagesWithCancelledContent = document.querySelectorAll('.ai-message .cancelled-message, .ai-message .error-container');
      messagesWithCancelledContent.forEach(cancelElement => {
        const aiMessage = cancelElement.closest('.ai-message');
        if (aiMessage) {
          const userMessage = this.getPreviousUserMessage(aiMessage);
          if (userMessage) {
            const userActions = userMessage.querySelector('.user-response-actions');
            if (userActions) {
              console.log('Limpieza: Eliminando botones de edición por contenido cancelado');
              userActions.remove();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error en limpieza de botones cancelados:', error);
    }
  }

  /**
   * Bloquea temporalmente el scroll durante una interacción de respuesta
   */
  blockScrollForInteraction(messageElement, interactionCallback, unlockDelay = 500) {
    const wasLocked = this.scrollLocked;
    this.scrollLocked = true;

    try {
      if (typeof interactionCallback === 'function') {
        interactionCallback();
      }
    } catch (error) {
      console.error('Error durante la interacción:', error);
    }

    setManagedTimeout(() => {
      this.scrollLocked = wasLocked;
    }, unlockDelay, this.timeoutKeys.scrollUnlock);
  }

  /**
   * Inicializa el sistema de botones de interacción
   */
  init() {
    this.validateLocalStorage();
    this.setupObserver();
    this.processExistingMessages();
    addEvent(document, 'click', this.handleGlobalClick.bind(this));
  }

  /**
   * Valida y repara localStorage si es necesario
   */
  validateLocalStorage() {
    try {
      const feedbackData = localStorage.getItem('message_feedback');

      if (!feedbackData) {
        localStorage.setItem('message_feedback', '[]');
        return;
      }

      try {
        const parsed = JSON.parse(feedbackData);
        if (!Array.isArray(parsed)) {
          localStorage.setItem('message_feedback', '[]');
        } else {
          const validItems = parsed.filter(item => item && typeof item === 'object');
          if (validItems.length !== parsed.length) {
            localStorage.setItem('message_feedback', JSON.stringify(validItems));
          }
        }
      } catch (e) {
        localStorage.setItem('message_feedback', '[]');
      }
    } catch (error) {
      console.error('Error validando localStorage:', error);
    }
  }

  /**
   * Configura el observador para detectar nuevos mensajes
   */
  setupObserver() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 &&
              node.classList.contains('ai-message') &&
              !node.classList.contains('processing') &&
              !node.classList.contains('cancelled') &&
              !node.classList.contains('just-cancelled') &&
              node.dataset.cancelled !== "true" &&
              !node.classList.contains('error-message') &&
              !node.querySelector('.cancelled-message') &&
              !node.querySelector('.error-container')) {
              this.addInteractionButtons(node);
            }

            if (node.nodeType === 1 && node.classList.contains('user-message')) {
              this.addUserInteractionButtons(node);
            }
          });
        } else if (mutation.type === 'attributes' &&
          mutation.attributeName === 'class') {
          const element = mutation.target;
          if (element.nodeType === 1 &&
            element.classList.contains('ai-message') &&
            !element.classList.contains('processing') &&
            !element.querySelector('.response-actions') &&
            !element.classList.contains('cancelled') &&
            !element.classList.contains('just-cancelled') &&
            element.dataset.cancelled !== "true" &&
            !element.classList.contains('error-message') &&
            !element.querySelector('.cancelled-message') &&
            !element.querySelector('.error-container')) {
            this.addInteractionButtons(element);
          }
        }
      });
    });

    observer.observe(chatMessages, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Procesa los mensajes existentes en el chat
   */
  processExistingMessages(includeUserMessages = false) {
    try {
      let storedFeedback = JSON.parse(localStorage.getItem('message_feedback') || '[]');
      storedFeedback = storedFeedback.filter(item => item != null);
      localStorage.setItem('message_feedback', JSON.stringify(storedFeedback));
    } catch (e) {
      console.error('Error limpiando localStorage:', e);
    }

    const aiMessages = document.querySelectorAll('.chat-messages .ai-message');

    aiMessages.forEach((message, index) => {
      try {
        if (message.classList.contains('cancelled') ||
          message.classList.contains('just-cancelled') ||
          message.dataset.cancelled === "true" ||
          message.classList.contains('error-message') ||
          message.querySelector('.cancelled-message') ||
          message.querySelector('.error-container')) {
          return;
        }

        if (message.querySelector('.response-actions')) {
          this.checkStoredRating(message);
        } else {
          this.addInteractionButtons(message);
        }
      } catch (error) {
        console.error(`Error procesando mensaje #${index + 1}:`, error);
      }
    });

    if (includeUserMessages) {
      const userMessages = document.querySelectorAll('.chat-messages .user-message');
      userMessages.forEach(message => {
        this.addUserInteractionButtons(message);
      });
    }
  }

  /**
   * Extrae el ID del mensaje en el servidor desde un elemento DOM con validación mejorada
   */
  extractServerMessageId(messageElement) {
    if (!messageElement || !messageElement.dataset) return null;

    if (messageElement.dataset.serverId) {
      return messageElement.dataset.serverId;
    }

    const frontendId = messageElement.dataset.messageId;
    if (!frontendId) return null;

    if (frontendId.includes('-')) {
      const parts = frontendId.split('-');
      if (parts.length >= 4) {
        const possibleId = parts[parts.length - 1];
        if (!isNaN(possibleId) && possibleId.trim() !== '') {
          return possibleId;
        }
      }
    }

    return null;
  }

  /**
   * [MATEMATICO] Añade botones de interacción a un mensaje del usuario
   */
  addUserInteractionButtons(messageElement) {
    if (messageElement.querySelector('.user-response-actions')) return;

    // ⭐ NUEVA VERIFICACIÓN: Verificar si hay procesamiento global activo
    const isGlobalProcessing = () => {
      return document.querySelector('.ai-message.processing') !== null ||
        getState('isProcessing') === true;
    };

    // ⭐ NUEVA VERIFICACIÓN: Verificar si este es el último mensaje de usuario
    const isLastUserMessage = () => {
      const userMessages = document.querySelectorAll('.user-message');
      const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
      return lastUserMessage === messageElement;
    };

    // ⭐ OPTIMIZADO: Verificar si la respuesta de AI asociada está cancelada O procesando
    const nextAiMessage = this.getNextAiMessage(messageElement);
    if (nextAiMessage) {
      // Verificar si está cancelada/con error (lógica existente)
      if (nextAiMessage.classList.contains('cancelled') ||
        nextAiMessage.classList.contains('just-cancelled') ||
        nextAiMessage.dataset.cancelled === "true" ||
        nextAiMessage.classList.contains('error-message') ||
        nextAiMessage.querySelector('.cancelled-message') ||
        nextAiMessage.querySelector('.error-container')) {
        console.log('Mensaje de usuario asociado a respuesta cancelada/error - no se añaden botones de edición');
        return;
      }

      // ⭐ NUEVA VERIFICACIÓN: Si está procesando
      if (nextAiMessage.classList.contains('processing')) {
        console.log('🔄 Mensaje de usuario asociado a respuesta siendo procesada - no se añaden botones de edición');
        return;
      }
    }

    // ⭐ NUEVA VERIFICACIÓN: Si es el último mensaje y hay procesamiento global activo
    if (isLastUserMessage() && isGlobalProcessing()) {
      console.log('🚫 Último mensaje de usuario durante procesamiento - no se añaden botones de edición');
      return;
    }

    if (!messageElement.dataset.messageId) {
      messageElement.dataset.messageId = `user-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const actionsContainer = createElement('div', { className: 'user-response-actions' });

    // ✅ CREAR BOTÓN DESHABILITADO INICIALMENTE
    const editBtn = createElement('button', {
      className: 'response-action-btn edit-btn',
      dataset: { tooltip: 'Sincronizando... (5s)' }
    });
    editBtn.innerHTML = `<i class='bx bx-sync bx-spin'></i>`;
    editBtn.disabled = true;
    editBtn.style.opacity = '0.5';

    actionsContainer.appendChild(editBtn);

    // ✅ HABILITAR DESPUÉS DE 5 SEGUNDOS
    setTimeout(() => {
      editBtn.disabled = false;
      editBtn.style.opacity = '1';
      editBtn.innerHTML = `<i class='bx bx-edit'></i>`;
      editBtn.setAttribute('data-tooltip', 'Editar mensaje');

      addEvent(editBtn, 'click', (e) => {
        e.stopPropagation();
        this.handleEditAction(messageElement);
      });

      console.log(`✅ [MATEMATICO] Botón de editar habilitado para: ${messageElement.dataset.messageId}`);
    }, 1000);

    messageElement.appendChild(actionsContainer);
  }

  /**
   * ⭐ NUEVA FUNCIÓN: Se ejecuta cuando una respuesta se completa para habilitar botones
   */
  onResponseComplete() {
    console.log('🎯 Respuesta completada - verificando botones de último mensaje');

    // Encontrar el último mensaje de usuario
    const userMessages = document.querySelectorAll('.user-message');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

    if (!lastUserMessage) {
      console.log('No se encontró último mensaje de usuario');
      return;
    }

    // Verificar si ya tiene botones de interacción
    const existingActions = lastUserMessage.querySelector('.user-response-actions');
    if (existingActions) {
      console.log('✅ Último mensaje ya tiene botones de interacción');
      return;
    }

    // Verificar que la respuesta asociada no esté procesando, cancelada o con error
    const nextAiMessage = this.getNextAiMessage(lastUserMessage);
    if (nextAiMessage) {
      if (nextAiMessage.classList.contains('processing') ||
        nextAiMessage.classList.contains('cancelled') ||
        nextAiMessage.classList.contains('just-cancelled') ||
        nextAiMessage.dataset.cancelled === "true" ||
        nextAiMessage.classList.contains('error-message') ||
        nextAiMessage.querySelector('.cancelled-message') ||
        nextAiMessage.querySelector('.error-container')) {
        console.log('🚫 Respuesta asociada aún no es válida para habilitar botones');
        return;
      }
    }

    // Agregar botones de interacción al último mensaje
    console.log('✅ Agregando botones de interacción a último mensaje de usuario');
    this.addUserInteractionButtons(lastUserMessage);
  }

  /**
   * ⭐ NUEVA FUNCIÓN: Verifica y actualiza el estado de todos los botones después de cambios
   */
  refreshInteractionButtons() {
    console.log('🔄 Refrescando estado de botones de interacción');

    // Verificar si hay procesamiento activo
    const isProcessing = document.querySelector('.ai-message.processing') !== null ||
      getState('isProcessing') === true;

    if (isProcessing) {
      console.log('🚫 Procesamiento activo - manteniendo botones deshabilitados');
      return;
    }

    // Si no hay procesamiento, verificar que todos los mensajes tengan sus botones correctos
    const userMessages = document.querySelectorAll('.user-message');
    userMessages.forEach((userMessage, index) => {
      const hasActions = userMessage.querySelector('.user-response-actions');
      const nextAiMessage = this.getNextAiMessage(userMessage);

      // Verificar si debería tener botones
      const shouldHaveButtons = !nextAiMessage || (
        !nextAiMessage.classList.contains('cancelled') &&
        !nextAiMessage.classList.contains('just-cancelled') &&
        nextAiMessage.dataset.cancelled !== "true" &&
        !nextAiMessage.classList.contains('error-message') &&
        !nextAiMessage.querySelector('.cancelled-message') &&
        !nextAiMessage.querySelector('.error-container') &&
        !nextAiMessage.classList.contains('processing')
      );

      if (shouldHaveButtons && !hasActions) {
        console.log(`✅ Agregando botones faltantes a mensaje de usuario ${index + 1}`);
        this.addUserInteractionButtons(userMessage);
      } else if (!shouldHaveButtons && hasActions) {
        console.log(`🚫 Removiendo botones incorrectos de mensaje de usuario ${index + 1}`);
        hasActions.remove();
      }
    });
  }

  /**
   * *** OPTIMIZADO: Detecta si un mensaje es multimodal ***
   */
  async isMultimodalMessage(userMessage) {
    try {
      const hasMultimodalMarker = userMessage.getAttribute('data-multimodal') === 'true' ||
        userMessage.querySelector('.multimodal-container') !== null;

      if (!hasMultimodalMarker) {
        return { isMultimodal: false };
      }

      const userMessageId = this.extractServerMessageId(userMessage);
      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      if (!currentChatId) {
        return { isMultimodal: false };
      }

      console.log('🔍 [MULTIMODAL] Verificando mensaje en BD:', { chatId: currentChatId, userMessageId });

      const response = await fetch('/api/documents/get-message-for-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: currentChatId,
          userMessageId: userMessageId
        })
      });

      if (!response.ok) {
        return { isMultimodal: false };
      }

      const data = await response.json();

      if (!data.success) {
        return { isMultimodal: false };
      }

      const messageData = data.messageData;

      console.log('✅ [MULTIMODAL] Mensaje recuperado:', {
        hasImages: messageData.hasImage,
        hasDocuments: messageData.hasDocuments,
        imageCount: messageData.imageCount,
        documentCount: messageData.documentCount
      });

      if (!messageData.hasImage && !messageData.hasDocuments) {
        return { isMultimodal: false };
      }

      return {
        isMultimodal: true,
        originalMessageData: messageData
      };

    } catch (error) {
      console.error('❌ [MULTIMODAL] Error verificando mensaje:', error);
      return { isMultimodal: false };
    }
  }

  /**
   * *** SISTEMA DE EDICIÓN ACADEL COMPLETAMENTE RENOVADO ***
   * Maneja la acción de edición con las nuevas clases CSS académicas
   */
  handleEditAction(messageElement) {
    // 1. MARCAR INTERACCIÓN ACTIVA INMEDIATAMENTE
    messageElement.setAttribute('data-response-interaction-processing', 'true');

    scrollManager.lockScroll();

    // 2. APLICAR CLASE ACADÉMICA AL MENSAJE
    addClass(messageElement, 'acadel-editing-mode');

    // 3. DETERMINAR EL TEXTO DEL USUARIO
    let userMessageText = '';

    const multimodalTextElement = messageElement.querySelector('.multimodal-text');
    if (multimodalTextElement) {
      userMessageText = multimodalTextElement.textContent || multimodalTextElement.innerText || '';
    } else {
      userMessageText = this.extractUserMessageText(messageElement);
    }

    // 4. CREAR PANEL DE EDICIÓN ACADÉMICO
    const editPanel = this.createAcadelEditPanel(userMessageText, messageElement);

    // 5. INSERTAR PANEL EN EL MENSAJE
    messageElement.appendChild(editPanel);

    // 6. CONFIGURAR EVENTOS Y FUNCIONALIDADES
    this.setupAcadelEditEvents(editPanel, messageElement, userMessageText);
  }

  /**
   * *** CREA EL PANEL DE EDICIÓN ACADÉMICO ***
   */
  createAcadelEditPanel(initialText, messageElement) {
    // Panel principal
    const editPanel = createElement('div', {
      className: 'acadel-edit-panel',
      dataset: { 'responseInteraction': 'true' }
    });

    // Barra de progreso (solo visual, sin estado)
    const progressBar = createElement('div', {
      className: 'acadel-edit-progress'
    });
    editPanel.appendChild(progressBar);

    // Textarea académico
    const textarea = createElement('textarea', {
      className: 'acadel-edit-textarea',
      placeholder: 'Edita tu mensaje aquí... El Profesor Acadel procesará los cambios.'
    });

    textarea.value = initialText;
    textarea.dataset.originalText = initialText;
    textarea.maxLength = 3000; // Límite de caracteres

    editPanel.appendChild(textarea);

    // Controles de edición
    const controls = this.createAcadelEditControls(initialText.length);
    editPanel.appendChild(controls);

    return editPanel;
  }

  /**
   * *** CREA LOS CONTROLES DE EDICIÓN ***
   */
  createAcadelEditControls(initialLength) {
    const controls = createElement('div', { className: 'acadel-edit-controls' });

    // Grupo de botones
    const buttonsGroup = createElement('div', { className: 'acadel-edit-buttons' });

    // Botón confirmar
    const confirmBtn = createElement('button', {
      className: 'acadel-edit-btn acadel-edit-confirm',
      dataset: { 'responseInteraction': 'true' }
    });
    confirmBtn.innerHTML = '<i class="bx bx-check"></i> Confirmar';
    buttonsGroup.appendChild(confirmBtn);

    // Botón cancelar
    const cancelBtn = createElement('button', {
      className: 'acadel-edit-btn acadel-edit-cancel',
      dataset: { 'responseInteraction': 'true' }
    });
    cancelBtn.innerHTML = '<i class="bx bx-x"></i> Cancelar';
    buttonsGroup.appendChild(cancelBtn);

    controls.appendChild(buttonsGroup);

    // Contador de caracteres académico
    const charCounter = createElement('div', {
      className: 'acadel-character-counter'
    });
    charCounter.innerHTML = `<i class="bx bx-text"></i> ${this.formatCharacterCount(initialLength)}`;
    controls.appendChild(charCounter);

    return controls;
  }

  /**
   * *** FORMATEA EL CONTADOR DE CARACTERES ***
   */
  formatCharacterCount(length) {
    const remaining = 3000 - length;
    const percentage = (length / 3000) * 100;

    if (percentage < 70) {
      return `${length.toLocaleString()} caracteres (${remaining.toLocaleString()} restantes)`;
    } else if (percentage < 90) {
      return `${length.toLocaleString()} caracteres (${remaining.toLocaleString()} restantes)`;
    } else {
      return `${length.toLocaleString()} / 30,000 caracteres`;
    }
  }

  /**
   * *** CONFIGURA EVENTOS DEL PANEL ACADÉMICO ***
   */
  setupAcadelEditEvents(editPanel, messageElement, originalText) {
    const textarea = editPanel.querySelector('.acadel-edit-textarea');
    const confirmBtn = editPanel.querySelector('.acadel-edit-confirm');
    const cancelBtn = editPanel.querySelector('.acadel-edit-cancel');
    const charCounter = editPanel.querySelector('.acadel-character-counter');
    const progressBar = editPanel.querySelector('.acadel-edit-progress');

    // Ocultar barra de progreso después de la animación inicial
    setTimeout(() => {
      addClass(progressBar, 'hidden');
    }, 400);

    // Auto-resize del textarea
    const adjustTextareaHeight = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 500; // Máximo según CSS
      const minHeight = 120; // Mínimo según CSS

      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    };

    // Configurar altura inicial
    adjustTextareaHeight();

    // Evento de entrada en textarea
    addEvent(textarea, 'input', () => {
      const currentLength = textarea.value.length;
      const percentage = (currentLength / 3000) * 100;

      // Actualizar contador
      charCounter.innerHTML = `<i class="bx bx-text"></i> ${this.formatCharacterCount(currentLength)}`;

      // Cambiar estado visual del contador
      removeClass(charCounter, 'warning');
      removeClass(charCounter, 'danger');
      if (percentage >= 90) {
        addClass(charCounter, 'danger');
      } else if (percentage >= 70) {
        addClass(charCounter, 'warning');
      }

      // Ajustar altura
      adjustTextareaHeight();

      // Habilitar/deshabilitar botón confirmar
      const hasChanges = textarea.value.trim() !== originalText.trim();
      const isValid = currentLength <= 3000;

      if (hasChanges && isValid) {
        removeClass(confirmBtn, 'disabled');
        confirmBtn.disabled = false;
      } else {
        addClass(confirmBtn, 'disabled');
        confirmBtn.disabled = true;
      }
    });

    // Configurar altura inicial del textarea
    addEvent(textarea, 'keydown', adjustTextareaHeight);
    addEvent(textarea, 'paste', () => {
      setTimeout(adjustTextareaHeight, 10);
    });

    // Enfocar textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 200);

    // *** FUNCIÓN PARA TRANSICIÓN LIMPIA DE SALIDA ***
    const cleanupEditState = (fast = false) => {
      const duration = fast ? 150 : 300;

      // Fade out suave del panel
      editPanel.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      editPanel.style.opacity = '0';
      editPanel.style.transform = 'translateY(-10px) scale(0.98)';

      setTimeout(() => {
        // Quitar clase de modo edición
        removeClass(messageElement, 'acadel-editing-mode');

        // Remover panel
        if (editPanel.parentNode) {
          editPanel.parentNode.removeChild(editPanel);
        }

        // Desbloquear scroll
        setManagedTimeout(() => {
          scrollManager.unlockScroll();
        }, 100, 'acadel-edit-cleanup-scroll-unlock');

      }, duration);
    };

    // *** EVENTO CANCELAR - MÁS LIMPIO ***
    addEvent(cancelBtn, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Limpiar inmediatamente sin animaciones de estado
      messageElement.removeAttribute('data-response-interaction-processing');

      // Transición de salida rápida y limpia
      cleanupEditState(true);
    });

    // *** EVENTO CONFIRMAR - TRANSICIÓN SUAVE ***
    addEvent(confirmBtn, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const editedText = textarea.value;
      const isValid = editedText.length <= 3000;

      if (!isValid) {
        // Mostrar error visual sutil
        addClass(editPanel, 'error');

        setTimeout(() => {
          removeClass(editPanel, 'error');
        }, 2000);

        return;
      }

      // Deshabilitar controles inmediatamente
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      textarea.disabled = true;

      // Transición de salida limpia
      cleanupEditState();

      // Bloquear scroll para la operación principal
      scrollManager.lockScroll();

      // Enviar para procesamiento con delay mínimo
      setTimeout(() => {
        this.submitEditedMessage(messageElement, editedText, originalText);
      }, 350);
    });
  }

  /**
   * *** CORREGIDO: Envía mensaje editado - PATRÓN RETRY ***
   */
  async submitEditedMessage(messageElement, editedText, originalText = "") {
    console.log('🔧 [EDIT] Iniciando edición de mensaje');

    const abortController = new AbortController();

    try {
      // *** CONFIGURAR ESTADO UI IGUAL QUE RETRY ***
      import('../ui/ui-manager-matematico.js').then(module => {
        if (typeof module.toggleUIState === 'function') {
          module.toggleUIState(true);
        }
        if (typeof module.setCurrentFetchController === 'function') {
          module.setCurrentFetchController(abortController);
        }
      }).catch(err => console.warn('No se pudo importar UI manager:', err));

      // *** FUNCIÓN PARA RESTAURAR UI IGUAL QUE RETRY ***
      const restoreUI = () => {
        import('../ui/ui-manager-matematico.js').then(module => {
          if (typeof module.toggleUIState === 'function') {
            module.toggleUIState(false);
          }
          if (typeof module.setCurrentFetchController === 'function') {
            module.setCurrentFetchController(null);
          }
        }).catch(err => console.warn('Error restaurando UI:', err));
      };

      // *** FUNCIÓN PARA DESBLOQUEAR SCROLL IGUAL QUE RETRY ***
      const ensureScrollUnlock = () => {
        setManagedTimeout(() => {
          messageElement.removeAttribute('data-response-interaction-processing');
          scrollManager.unlockScroll();
        }, 800, 'edit-scroll-unlock');
      };

      const aiMessage = this.getNextAiMessage(messageElement);
      if (!aiMessage) {
        acadelError('¡Mensaje perdido! 🔍', 'Acadel no puede encontrar la respuesta original. ¿Se escapó por ahí?');
        ensureScrollUnlock();
        restoreUI();
        return;
      }

      // *** VERIFICAR SI ES MULTIMODAL ***
      const multimodalInfo = await this.isMultimodalMessage(messageElement);

      if (multimodalInfo.isMultimodal) {
        console.log('📝 [EDIT] Mensaje multimodal detectado');
        return await this.handleMultimodalEdit(messageElement, aiMessage, editedText, multimodalInfo, abortController, ensureScrollUnlock, restoreUI);
      } else {
        console.log('📝 [EDIT] Mensaje normal detectado');
        return await this.handleStandardEdit(messageElement, aiMessage, editedText, abortController, ensureScrollUnlock, restoreUI);
      }

    } catch (error) {
      console.error('Error general en submitEditedMessage:', error);
      acadelError('¡Edición complicada! ✏️💥', 'Acadel tuvo problemas editando. Hasta los mejores editores tienen días difíciles');

      // *** LIMPIAR ESTADO EN CASO DE ERROR ***
      setManagedTimeout(() => {
        messageElement.removeAttribute('data-response-interaction-processing');
        scrollManager.unlockScroll();
      }, 0, 'edit-error-cleanup');

      import('../ui/ui-manager-matematico.js').then(module => {
        if (typeof module.toggleUIState === 'function') {
          module.toggleUIState(false);
        }
      });
    }
  }

  /**
   * ✅ REEMPLAZAR COMPLETAMENTE handleStandardEdit
   */
  async handleStandardEdit(messageElement, aiMessage, editedText, abortController, ensureScrollUnlock, restoreUI) {
    const safetyTimeout = setManagedTimeout(() => {
      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }, 80000, this.timeoutKeys.safetyTimeout);

    // ✅ GUARDAR CONTENIDO ORIGINAL ANTES DE CUALQUIER MODIFICACIÓN
    const profileElement = aiMessage.querySelector('.ai-profile');
    const profileHTML = profileElement ? profileElement.outerHTML : '';
    const aiContentElement = aiMessage.querySelector('.message-content');
    const originalAiContent = aiContentElement ? aiContentElement.innerHTML : '';

    try {
      console.log('📝 [EDIT STANDARD] Procesando edición estándar');

      // Actualizar contenido del mensaje del usuario
      await this.updateUserMessageContent(messageElement, editedText);

      // Retirar valoración si existe
      if (hasClass(aiMessage, 'message-rated')) {
        this.resetMessageRating(aiMessage);
      }

      const userMessageId = this.extractServerMessageId(messageElement);
      const aiMessageId = this.extractServerMessageId(aiMessage);

      // ✅ MOSTRAR ESTADO DE CARGA
      addClass(aiMessage, 'processing');
      messageElement.setAttribute('data-response-interaction-processing', 'true');
      if (profileElement) addClass(profileElement, 'thinking');

      if (aiContentElement) {
        aiContentElement.innerHTML = `
          <div class="thought-bubble">
            <div class="thought-bubbles">
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
            </div>
          </div>
        `;
      }

      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      // ✅ FUNCIÓN DE VERIFICACIÓN DE CANCELACIÓN
      const checkCancellation = () => {
        if (abortController.signal.aborted) {
          removeClass(aiMessage, 'processing');
          if (profileElement) {
            removeClass(profileElement, 'thinking');
          }
          ensureScrollUnlock();
          restoreUI();
          clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
          return true;
        }
        return false;
      };

      if (checkCancellation()) return;

      console.log('🔧 [EDIT STANDARD] Enviando mensaje para edición SIN GUARDAR:', {
        editedTextLength: editedText.length,
        chatId: currentChatId
      });

      const messagesModule = await import('../api/messages-matematico.js');

      if (checkCancellation()) return;

      const response = await messagesModule.getResponseOnlyWithoutSaving(
        editedText,
        currentChatId,
        abortController.signal
      );

      if (checkCancellation()) return;

      // ✅ PROCESAR RESPUESTA
      const rendererModule = await import('../ui/message-renderer-matematico.js');
      const processedResponse = this.processResponseData(response);

      rendererModule.replaceLoadingMessage(aiMessage, processedResponse.content, processedResponse.type);

      if (!aiMessage.querySelector('.ai-profile') && profileHTML) {
        aiMessage.insertAdjacentHTML('afterbegin', profileHTML);
      }

      // Preparar texto para la BD
      let aiResponseText;
      if (processedResponse.type === 'exam') {
        aiResponseText = JSON.stringify({
          type: 'exam',
          exam: processedResponse.content
        });
      } else if (typeof processedResponse.content === 'string') {
        aiResponseText = processedResponse.content;
      } else {
        aiResponseText = JSON.stringify(processedResponse.content);
      }

      acadelExito('¡Edición perfecta! ✏️', 'Acadel ha actualizado tu mensaje como un verdadero editor profesional');
      restoreUI();
      console.log('💾 [EDIT STANDARD] Actualizando BD');

      // ✅ ACTUALIZAR BD
      if (checkCancellation()) return;

      const result = await messagesModule.replaceInteraction(
        currentChatId,
        userMessageId,
        aiMessageId,
        editedText,
        aiResponseText
      );

      if (result && result.data) {
        if (result.data.userMessage && result.data.userMessage.id) {
          messageElement.dataset.serverId = result.data.userMessage.id;
        }
        if (result.data.aiMessage && result.data.aiMessage.id) {
          aiMessage.dataset.serverId = result.data.aiMessage.id;
        }
      }

      // ✅ LIMPIAR ESTADO SOLO AL FINAL
      ensureScrollUnlock();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);

    } catch (error) {
      console.error('❌ [EDIT STANDARD] Error:', error);

      // ✅ RESTAURAR CONTENIDO ORIGINAL SIEMPRE
      if (aiContentElement && originalAiContent) {
        aiContentElement.innerHTML = originalAiContent;
      }

      // ✅ LIMPIAR ESTADO SIEMPRE
      removeClass(aiMessage, 'processing');
      if (profileElement) removeClass(profileElement, 'thinking');

      // ✅ CORREGIDO: MOSTRAR aviso en mensaje de IA usando función existente
      if (this.isTokenError(error)) {
        console.log('🚫 EDIT: Error de tokens - Mostrando aviso en mensaje IA');
        setTimeout(() => {
          // ✅ USAR la función existente que funciona
          this.handleTokenError(error, aiMessage, true);
        }, 300);
      } else {
        // ✅ Solo para errores que NO son de tokens
        showError('Error al editar mensaje: ' + (error.message || 'Error desconocido'));
      }

      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }
  }

  /**
   * ✅ REEMPLAZAR COMPLETAMENTE handleMultimodalEdit
   */
  async handleMultimodalEdit(messageElement, aiMessage, editedText, multimodalInfo, abortController, ensureScrollUnlock, restoreUI) {
    const safetyTimeout = setManagedTimeout(() => {
      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }, 80000, this.timeoutKeys.safetyTimeout);

    // ✅ GUARDAR CONTENIDO ORIGINAL ANTES DE CUALQUIER MODIFICACIÓN
    const profileElement = aiMessage.querySelector('.ai-profile');
    const profileHTML = profileElement ? profileElement.outerHTML : '';
    const aiContentElement = aiMessage.querySelector('.message-content');
    const originalAiContent = aiContentElement ? aiContentElement.innerHTML : '';

    try {
      console.log('📝 [EDIT MULTIMODAL] Procesando edición multimodal');

      // Retirar valoración si existe
      if (hasClass(aiMessage, 'message-rated')) {
        this.resetMessageRating(aiMessage);
      }

      const userMessageId = this.extractServerMessageId(messageElement);
      const aiMessageId = this.extractServerMessageId(aiMessage);

      // *** MOSTRAR ESTADO DE CARGA IGUAL QUE RETRY ***
      addClass(aiMessage, 'processing');
      messageElement.setAttribute('data-response-interaction-processing', 'true');
      if (profileElement) addClass(profileElement, 'thinking');

      if (aiContentElement) {
        aiContentElement.innerHTML = `
          <div class="thought-bubble">
            <div class="thought-bubbles">
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
            </div>
          </div>
        `;
      }

      // *** MODIFICAR SOLO EL CAMPO TEXT DEL JSON ORIGINAL ***
      const modifiedMessageData = {
        ...multimodalInfo.originalMessageData,
        text: editedText.trim() || "",
        processedAt: new Date().toISOString()
      };

      console.log('📝 [EDIT MULTIMODAL] JSON modificado:', {
        originalText: multimodalInfo.originalMessageData.text?.substring(0, 50) + '...',
        newText: modifiedMessageData.text?.substring(0, 50) + '...',
        preservedDocuments: modifiedMessageData.documents?.length || 0,
        preservedImages: modifiedMessageData.images?.length || 0
      });

      // *** ACTUALIZAR UI DEL MENSAJE DEL USUARIO INMEDIATAMENTE ***
      this.updateMultimodalMessageUI(messageElement, editedText);

      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      if (!currentChatId) {
        acadelError('¡Chat invisible! 👻', 'Acadel no puede identificar esta conversación. Los chats fantasma existen');
        ensureScrollUnlock();
        restoreUI();
        clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
        return;
      }

      // *** PREPARAR ARCHIVOS PARA REENVÍO ***
      const multimodalFiles = [];

      // Recuperar documentos
      if (modifiedMessageData.hasDocuments && modifiedMessageData.documents?.length > 0) {
        console.log(`📄 [EDIT MULTIMODAL] Recuperando ${modifiedMessageData.documents.length} documentos`);

        const retrievedDocuments = await this.retrieveDocumentsFromBackend(
          currentChatId,
          modifiedMessageData.documents
        );
        multimodalFiles.push(...retrievedDocuments);
      }

      // Recuperar imágenes
      if (modifiedMessageData.hasImage && modifiedMessageData.images?.length > 0) {
        console.log(`🖼️ [EDIT MULTIMODAL] Recuperando ${modifiedMessageData.images.length} imágenes`);

        const retrievedImages = await this.retrieveImagesFromBackend(modifiedMessageData.images);
        multimodalFiles.push(...retrievedImages);
      }

      console.log('📦 [EDIT MULTIMODAL] Enviando con archivos recuperados:', {
        texto: modifiedMessageData.text?.substring(0, 100) + '...',
        archivos: multimodalFiles.length
      });

      // *** ENVIAR COMO MENSAJE MULTIMODAL SIN GUARDAR ***
      const messagesModule = await import('../api/messages-matematico.js');

      const response = await messagesModule.sendMessageWithAttachmentsWithoutSaving(
        modifiedMessageData.text || '',
        currentChatId,
        multimodalFiles,
        abortController.signal
      );

      // *** PROCESAR RESPUESTA IGUAL QUE RETRY ***
      const rendererModule = await import('../ui/message-renderer-matematico.js');
      const processedResponse = this.processResponseData(response);

      rendererModule.replaceLoadingMessage(aiMessage, processedResponse.content, processedResponse.type);

      if (!aiMessage.querySelector('.ai-profile') && profileHTML) {
        aiMessage.insertAdjacentHTML('afterbegin', profileHTML);
      }

      // *** PREPARAR TEXTO PARA LA BD ***
      let aiResponseText;
      if (processedResponse.type === 'exam') {
        aiResponseText = JSON.stringify({
          type: 'exam',
          exam: processedResponse.content
        });
      } else if (typeof processedResponse.content === 'string') {
        aiResponseText = processedResponse.content;
      } else {
        aiResponseText = JSON.stringify(processedResponse.content);
      }

      acadelExito('¡Mensaje multimedia editado! 🎨', 'Acadel ha mejorado tu consulta con archivos como un director de cine');
      restoreUI();
      console.log('💾 [EDIT MULTIMODAL] Actualizando BD');

      // *** ACTUALIZAR BD ***
      const result = await messagesModule.replaceInteraction(
        currentChatId,
        userMessageId,
        aiMessageId,
        JSON.stringify(modifiedMessageData),
        aiResponseText
      );

      if (result && result.data) {
        if (result.data.userMessage && result.data.userMessage.id) {
          messageElement.dataset.serverId = result.data.userMessage.id;
        }
        if (result.data.aiMessage && result.data.aiMessage.id) {
          aiMessage.dataset.serverId = result.data.aiMessage.id;
        }
      }

      // *** LIMPIAR ESTADO SOLO AL FINAL - IGUAL QUE RETRY ***
      ensureScrollUnlock();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);

    } catch (error) {
      console.error('❌ [EDIT MULTIMODAL] Error:', error);

      // ✅ RESTAURAR CONTENIDO ORIGINAL SIEMPRE
      if (aiContentElement && originalAiContent) {
        aiContentElement.innerHTML = originalAiContent;
      }

      // ✅ LIMPIAR ESTADO SIEMPRE
      removeClass(aiMessage, 'processing');
      if (profileElement) removeClass(profileElement, 'thinking');

      // ✅ CORREGIDO: MOSTRAR aviso en mensaje de IA usando función existente
      if (this.isTokenError(error)) {
        console.log('🚫 EDIT MULTIMODAL: Error de tokens - Mostrando aviso en mensaje IA');
        setTimeout(() => {
          // ✅ USAR la función existente que funciona
          this.handleTokenError(error, aiMessage, true);
        }, 300);
      } else {
        // ✅ Solo para errores que NO son de tokens
        showError('Error al editar mensaje multimodal: ' + (error.message || 'Error desconocido'));
      }

      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }
  }

  /**
   * *** NUEVO: Actualiza la UI de un mensaje multimodal ***
   */
  updateMultimodalMessageUI(messageElement, newText) {
    try {
      const multimodalContainer = messageElement.querySelector('.multimodal-container');
      if (!multimodalContainer) return;

      const textElement = multimodalContainer.querySelector('.multimodal-text');

      if (newText.trim()) {
        if (textElement) {
          textElement.innerHTML = typeof parseMarkdownToHTML === 'function' ?
            parseMarkdownToHTML(newText) : this.sanitizeAndFormatText(newText);
        } else {
          const newTextElement = document.createElement('div');
          newTextElement.className = 'multimodal-text';
          newTextElement.innerHTML = typeof parseMarkdownToHTML === 'function' ?
            parseMarkdownToHTML(newText) : this.sanitizeAndFormatText(newText);
          multimodalContainer.insertBefore(newTextElement, multimodalContainer.firstChild);
        }
      } else if (textElement) {
        textElement.remove();
      }

      console.log('✅ [EDIT ACADEL] UI multimodal actualizada');
    } catch (error) {
      console.error('❌ [EDIT ACADEL] Error actualizando UI multimodal:', error);
    }
  }

  /**
   * *** FUNCIÓN AUXILIAR PARA SANITIZAR Y FORMATEAR TEXTO ***
   */
  sanitizeAndFormatText(text) {
    if (typeof sanitizeText === 'function') {
      return sanitizeText(text);
    }

    // Fallback básico si sanitizeText no está disponible
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * *** OPTIMIZADO: Maneja reintento de respuesta ***
   */
  async handleRetryAction(messageElement) {
    scrollManager.lockScroll();

    let processCompleted = false;
    const abortController = new AbortController();

    try {
      import('../ui/ui-manager-matematico.js').then(module => {
        if (typeof module.toggleUIState === 'function') {
          module.toggleUIState(true);
        }
        if (typeof module.setCurrentFetchController === 'function') {
          module.setCurrentFetchController(abortController);
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado de UI:', error);
    }

    const ensureScrollUnlock = () => {
      if (!processCompleted) {
        processCompleted = true;
        setManagedTimeout(() => {
          messageElement.removeAttribute('data-response-interaction-processing');
          scrollManager.unlockScroll();
        }, 800, 'retry-scroll-unlock');
      }
    };

    const restoreUI = () => {
      import('../ui/ui-manager-matematico.js').then(module => {
        if (typeof module.toggleUIState === 'function') {
          module.toggleUIState(false);
        }
        if (typeof module.setCurrentFetchController === 'function') {
          module.setCurrentFetchController(null);
        }
      }).catch(err => console.warn('Error restaurando UI:', err));
    };

    const userMessage = this.getPreviousUserMessage(messageElement);
    if (!userMessage) {
      acadelError('¡Consulta perdida! 🔍', 'Acadel no puede encontrar tu pregunta original. ¿Se fue de vacaciones?');
      ensureScrollUnlock();
      restoreUI();
      return;
    }

    try {
      // *** VERIFICAR SI ES MULTIMODAL ***
      const multimodalInfo = await this.isMultimodalMessage(userMessage);

      if (multimodalInfo.isMultimodal) {
        console.log('🔄 [RETRY] Mensaje multimodal detectado');
        return await this.handleMultimodalRetry(messageElement, userMessage, multimodalInfo, abortController, ensureScrollUnlock, restoreUI);
      } else {
        console.log('🔄 [RETRY] Mensaje normal detectado');
        return await this.handleStandardRetry(messageElement, userMessage, abortController, ensureScrollUnlock, restoreUI);
      }
    } catch (error) {
      console.error('❌ [RETRY] Error analizando tipo de mensaje:', error);
      return await this.handleStandardRetry(messageElement, userMessage, abortController, ensureScrollUnlock, restoreUI);
    }
  }

  /**
   * ✅ PASO 3: REEMPLAZAR COMPLETAMENTE handleStandardRetry
   */
  async handleStandardRetry(messageElement, userMessage, abortController, ensureScrollUnlock, restoreUI) {
    const safetyTimeout = setManagedTimeout(() => {
      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }, 80000, this.timeoutKeys.safetyTimeout);

    let userMessageText = this.extractUserMessageText(userMessage);

    if (!userMessageText || !userMessageText.trim()) {
      userMessageText = "Por favor, repite tu última respuesta.";
    }

    const userMessageId = this.extractServerMessageId(userMessage);
    const aiMessageId = this.extractServerMessageId(messageElement);

    // ✅ GUARDAR CONTENIDO ORIGINAL ANTES DE CUALQUIER MODIFICACIÓN
    const profileElement = messageElement.querySelector('.ai-profile');
    const profileHTML = profileElement ? profileElement.outerHTML : '';
    const contentElement = messageElement.querySelector('.message-content');
    const originalContent = contentElement ? contentElement.innerHTML : '';

    addClass(messageElement, 'processing');
    messageElement.setAttribute('data-response-interaction-processing', 'true');

    if (profileElement) addClass(profileElement, 'thinking');

    if (contentElement) {
      contentElement.innerHTML = `
        <div class="thought-bubble">
          <div class="thought-bubbles">
            <div class="thought-bubble-dot"></div>
            <div class="thought-bubble-dot"></div>
            <div class="thought-bubble-dot"></div>
          </div>
        </div>
      `;
    }

    const checkCancellation = () => {
      if (abortController.signal.aborted) {
        removeClass(messageElement, 'processing');
        if (profileElement) {
          removeClass(profileElement, 'thinking');
        }
        ensureScrollUnlock();
        restoreUI();
        clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
        return true;
      }
      return false;
    };

    try {
      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      if (checkCancellation()) return;

      console.log('🔄 [RETRY STANDARD] Enviando mensaje para reintento SIN GUARDAR:', {
        userMessageLength: userMessageText.length,
        chatId: currentChatId
      });

      const messagesModule = await import('../api/messages-matematico.js');

      if (checkCancellation()) return;

      const response = await messagesModule.getResponseOnlyWithoutSaving(
        userMessageText,
        currentChatId,
        abortController.signal
      );

      if (checkCancellation()) return;

      const rendererModule = await import('../ui/message-renderer-matematico.js');
      const processedResponse = this.processResponseData(response);

      rendererModule.replaceLoadingMessage(messageElement, processedResponse.content, processedResponse.type);
      acadelExito('¡Reintento exitoso! 🔄', 'Acadel ha procesado tu consulta nuevamente. La persistencia da frutos');

      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);

      // Actualizar BD
      let aiResponseText;
      if (processedResponse.type === 'exam') {
        aiResponseText = JSON.stringify({
          type: 'exam',
          exam: processedResponse.content
        });
      } else if (typeof processedResponse.content === 'string') {
        aiResponseText = processedResponse.content;
      } else if (processedResponse.content && typeof processedResponse.content === 'object') {
        aiResponseText = JSON.stringify(processedResponse.content);
      }

      try {
        if (checkCancellation()) return;

        console.log('💾 [RETRY STANDARD] Reemplazando interacción en BD');

        const result = await messagesModule.replaceInteraction(
          currentChatId,
          userMessageId,
          aiMessageId,
          userMessageText,
          aiResponseText
        );

        if (result && result.data) {
          if (result.data.userMessage && result.data.userMessage.id) {
            userMessage.dataset.serverId = result.data.userMessage.id;
          }
          if (result.data.aiMessage && result.data.aiMessage.id) {
            messageElement.dataset.serverId = result.data.aiMessage.id;
          }
        }

      } catch (dbError) {
        console.error('Error actualizando registros en la base de datos:', dbError);
      }

    } catch (error) {
      console.error('❌ [RETRY STANDARD] Error:', error);

      // ✅ RESTAURAR CONTENIDO ORIGINAL SIEMPRE
      if (contentElement && originalContent) {
        contentElement.innerHTML = originalContent;
      }

      // ✅ LIMPIAR ESTADO SIEMPRE
      removeClass(messageElement, 'processing');
      if (profileElement) removeClass(profileElement, 'thinking');

      // ✅ CORREGIDO: USAR función existente que funciona
      if (this.isTokenError(error)) {
        console.log('🚫 RETRY: Error de tokens - Mostrando aviso');
        setTimeout(() => {
          // ✅ USAR la función existente que funciona
          this.handleTokenError(error, messageElement, true);
        }, 300);
      } else {
        // ✅ Solo para errores que NO son de tokens
        showError('Error al reintentar: ' + (error.message || 'Error desconocido'));
      }

      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }
  }


  /**
   * ✅ PASO 4: REEMPLAZAR COMPLETAMENTE handleMultimodalRetry
   */
  async handleMultimodalRetry(messageElement, userMessage, multimodalInfo, abortController, ensureScrollUnlock, restoreUI) {
    const safetyTimeout = setManagedTimeout(() => {
      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }, 80000, this.timeoutKeys.safetyTimeout);

    // ✅ GUARDAR CONTENIDO ORIGINAL ANTES DE CUALQUIER MODIFICACIÓN
    const profileElement = messageElement.querySelector('.ai-profile');
    const profileHTML = profileElement ? profileElement.outerHTML : '';
    const contentElement = messageElement.querySelector('.message-content');
    const originalContent = contentElement ? contentElement.innerHTML : '';

    try {
      console.log('🔄 [RETRY MULTIMODAL] Procesando reintento multimodal');

      const userMessageId = this.extractServerMessageId(userMessage);
      const aiMessageId = this.extractServerMessageId(messageElement);

      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      if (!currentChatId) {
        acadelError('¡Chat invisible! 👻', 'Acadel no puede identificar esta conversación. Los chats fantasma existen');
        return;
      }

      // Mostrar estado de carga
      addClass(messageElement, 'processing');
      messageElement.setAttribute('data-response-interaction-processing', 'true');

      if (profileElement) addClass(profileElement, 'thinking');

      if (contentElement) {
        contentElement.innerHTML = `
          <div class="thought-bubble">
            <div class="thought-bubbles">
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
            </div>
          </div>
        `;
      }

      // *** PREPARAR ARCHIVOS PARA REENVÍO ***
      const multimodalFiles = [];

      // Recuperar documentos
      if (multimodalInfo.originalMessageData.hasDocuments && multimodalInfo.originalMessageData.documents?.length > 0) {
        console.log(`📄 [RETRY MULTIMODAL] Recuperando ${multimodalInfo.originalMessageData.documents.length} documentos`);

        const retrievedDocuments = await this.retrieveDocumentsFromBackend(
          currentChatId,
          multimodalInfo.originalMessageData.documents
        );
        multimodalFiles.push(...retrievedDocuments);
      }

      // Recuperar imágenes
      if (multimodalInfo.originalMessageData.hasImage && multimodalInfo.originalMessageData.images?.length > 0) {
        console.log(`🖼️ [RETRY MULTIMODAL] Recuperando ${multimodalInfo.originalMessageData.images.length} imágenes`);

        const retrievedImages = await this.retrieveImagesFromBackend(multimodalInfo.originalMessageData.images);
        multimodalFiles.push(...retrievedImages);
      }

      console.log('📦 [RETRY MULTIMODAL] Enviando mensaje completo SIN GUARDAR:', {
        texto: multimodalInfo.originalMessageData.text?.substring(0, 100) + '...',
        archivos: multimodalFiles.length
      });

      // *** ENVIAR MENSAJE COMPLETO SIN GUARDAR ***
      const messagesModule = await import('../api/messages-matematico.js');

      const response = await messagesModule.sendMessageWithAttachmentsWithoutSaving(
        multimodalInfo.originalMessageData.text || 'Reintento de consulta multimodal',
        currentChatId,
        multimodalFiles,
        abortController.signal
      );

      // Procesar respuesta
      const rendererModule = await import('../ui/message-renderer-matematico.js');
      const processedResponse = this.processResponseData(response);

      rendererModule.replaceLoadingMessage(messageElement, processedResponse.content, processedResponse.type);

      if (!messageElement.querySelector('.ai-profile') && profileElement) {
        messageElement.insertAdjacentHTML('afterbegin', profileElement.outerHTML);
      }

      // *** ACTUALIZAR BD REEMPLAZANDO INTERACCIÓN ***
      let aiResponseText;
      if (processedResponse.type === 'exam') {
        aiResponseText = JSON.stringify({
          type: 'exam',
          exam: processedResponse.content
        });
      } else if (typeof processedResponse.content === 'string') {
        aiResponseText = processedResponse.content;
      } else {
        aiResponseText = JSON.stringify(processedResponse.content);
      }

      acadelExito('¡Reintento multimodal perfecto! 🎯', 'Acadel ha reprocesado tu consulta con archivos magistralmente');
      restoreUI();
      console.log('💾 [RETRY MULTIMODAL] Reemplazando interacción en BD');

      const result = await messagesModule.replaceInteraction(
        currentChatId,
        userMessageId,
        aiMessageId,
        JSON.stringify(multimodalInfo.originalMessageData),
        aiResponseText
      );

      if (result && result.data) {
        if (result.data.userMessage && result.data.userMessage.id) {
          userMessage.dataset.serverId = result.data.userMessage.id;
        }
        if (result.data.aiMessage && result.data.aiMessage.id) {
          messageElement.dataset.serverId = result.data.aiMessage.id;
        }
      }

      ensureScrollUnlock();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);

    } catch (error) {
      console.error('❌ [RETRY MULTIMODAL] Error:', error);

      // ✅ RESTAURAR CONTENIDO ORIGINAL SIEMPRE
      if (contentElement && originalContent) {
        contentElement.innerHTML = originalContent;
      }

      // ✅ LIMPIAR ESTADO SIEMPRE
      removeClass(messageElement, 'processing');
      if (profileElement) removeClass(profileElement, 'thinking');

      // ✅ CORREGIDO: USAR función existente que funciona
      if (this.isTokenError(error)) {
        console.log('🚫 RETRY MULTIMODAL: Error de tokens - Mostrando aviso');
        setTimeout(() => {
          // ✅ USAR la función existente que funciona
          this.handleTokenError(error, messageElement, true);
        }, 300);
      } else {
        // ✅ Solo para errores que NO son de tokens
        showError('Error al reintentar consulta multimodal: ' + (error.message || 'Error desconocido'));
      }

      ensureScrollUnlock();
      restoreUI();
      clearManagedTimeouts(this.timeoutKeys.safetyTimeout);
    }
  }

  /**
   * *** FUNCIONES DE RECUPERACIÓN DE ARCHIVOS (MANTENIDAS) ***
   */
  async retrieveDocumentsFromBackend(chatId, documentReferences) {
    try {
      console.log(`🔍 Recuperando ${documentReferences.length} documentos del backend`);

      const response = await fetch('/api/documents/retrieve-for-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          documentReferences: documentReferences
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      console.log(`✅ Recuperados ${data.documents.length} documentos`);

      return data.documents.map(doc => ({
        type: doc.type,
        name: doc.name,
        filename: doc.filename,
        mime_type: doc.mime_type,
        data_url: `data:${doc.mime_type};base64,${doc.content_base64}`,
        extractedContent: doc.extractedContent || '',
        attachment_type: doc.attachment_type,
        language: doc.language,
        _retrievedFromBackend: true
      }));

    } catch (error) {
      console.error('❌ Error recuperando documentos:', error);
      acadelError('¡Documentos esquivos! 📄', 'Acadel no puede recuperar los archivos. Están jugando al escondite');
      return [];
    }
  }

  async retrieveImagesFromBackend(imageReferences) {
    try {
      console.log(`🖼️ Recuperando ${imageReferences.length} imágenes del backend`);

      const response = await fetch('/api/documents/retrieve-images-for-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageReferences: imageReferences
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      console.log(`✅ Recuperadas ${data.images.length} imágenes`);

      return data.images.map(img => ({
        ...img,
        _retrievedFromBackend: true
      }));

    } catch (error) {
      console.error('❌ Error recuperando imágenes:', error);
      acadelError('¡Imágenes fugitivas! 🖼️', 'Acadel no puede encontrar las imágenes. Se fueron a un lugar sin wifi');
      return [];
    }
  }

  // *** MANTENER TODAS LAS DEMÁS FUNCIONES EXISTENTES SIN CAMBIOS ***

  getNextAiMessage(userMessage) {
    let currentElement = userMessage.nextElementSibling;
    while (currentElement) {
      if (currentElement.classList.contains('ai-message')) {
        return currentElement;
      }
      currentElement = currentElement.nextElementSibling;
    }
    return null;
  }

  getPreviousUserMessage(aiMessage) {
    let currentElement = aiMessage.previousElementSibling;
    while (currentElement) {
      if (currentElement.classList.contains('user-message')) {
        return currentElement;
      }
      currentElement = currentElement.previousElementSibling;
    }
    return null;
  }

  extractUserMessageText(userMessage) {
    if (!userMessage) return '';

    // *** DETECTAR SI ES MENSAJE MULTIMODAL ***
    const isMultimodal = userMessage.hasAttribute('data-multimodal') ||
      userMessage.querySelector('.multimodal-container');

    if (isMultimodal) {
      console.log('🔍 [EXTRACT] Mensaje multimodal detectado');

      // *** PRIORIDAD 1: Buscar data-original-text en multimodal-text ***
      const multimodalTextElement = userMessage.querySelector('.multimodal-text');
      if (multimodalTextElement && multimodalTextElement.dataset?.originalText) {
        try {
          const originalText = decodeURIComponent(multimodalTextElement.dataset.originalText);
          console.log('✅ [EXTRACT] Texto original multimodal encontrado:', originalText.substring(0, 100) + '...');
          return originalText;
        } catch (e) {
          console.warn('⚠️ [EXTRACT] Error decodificando originalText multimodal:', e);
        }
      }

      // *** PRIORIDAD 2: Buscar data-original-text en message-content ***
      const contentElement = userMessage.querySelector('.message-content');
      if (contentElement && contentElement.dataset?.originalText) {
        try {
          const decodedText = decodeURIComponent(contentElement.dataset.originalText);

          // Si es JSON multimodal, extraer solo el texto
          if (decodedText.trim().startsWith('{') || decodedText.trim().startsWith('"{')) {
            const extractedText = this.extractTextFromMultimodalJSON(decodedText);
            if (extractedText !== null) {
              console.log('✅ [EXTRACT] Texto extraído de JSON multimodal:', extractedText);
              return extractedText; // Puede ser string vacío, eso está bien
            }
          } else {
            console.log('✅ [EXTRACT] Texto original multimodal:', decodedText);
            return decodedText;
          }
        } catch (e) {
          console.warn('⚠️ [EXTRACT] Error procesando data del contenedor:', e);
        }
      }

      // *** PRIORIDAD 3: Para multimodal SIN texto original, buscar solo en multimodal-text ***
      if (multimodalTextElement) {
        const textContent = multimodalTextElement.textContent || multimodalTextElement.innerText || '';

        // *** CRÍTICO: Si no hay texto real en multimodal-text, devolver vacío ***
        if (!textContent.trim() || this.isAttachmentOnlyContent(textContent)) {
          console.log('✅ [EXTRACT] Mensaje multimodal sin texto - devolviendo vacío');
          return ''; // *** ESTO ES LO IMPORTANTE ***
        }

        console.log('✅ [EXTRACT] Texto de multimodal-text:', textContent.substring(0, 100) + '...');
        return textContent.trim();
      }

      // *** SI NO HAY multimodal-text, es solo archivos adjuntos ***
      console.log('✅ [EXTRACT] Mensaje multimodal solo con archivos - devolviendo vacío');
      return '';
    }

    // *** PARA MENSAJES NORMALES (no multimodales) ***
    const messageTextElement = userMessage.querySelector('.message-text');
    if (messageTextElement && messageTextElement.dataset?.originalText) {
      try {
        const originalText = decodeURIComponent(messageTextElement.dataset.originalText);
        console.log('✅ [EXTRACT] Texto original normal encontrado:', originalText.substring(0, 100) + '...');
        return originalText;
      } catch (e) {
        console.warn('⚠️ [EXTRACT] Error decodificando originalText:', e);
      }
    }

    // *** FALLBACK PARA MENSAJES NORMALES ***
    if (messageTextElement) {
      const textContent = messageTextElement.textContent || messageTextElement.innerText || '';
      console.log('✅ [EXTRACT] Texto normal del DOM:', textContent.substring(0, 100) + '...');
      return textContent;
    }

    const contentElement = userMessage.querySelector('.message-content');
    const fallbackText = contentElement?.textContent || contentElement?.innerText || '';
    console.log('✅ [EXTRACT] Texto de fallback:', fallbackText.substring(0, 100) + '...');
    return fallbackText;
  }

  /**
   * *** NUEVA FUNCIÓN: Detecta si el contenido es solo de archivos adjuntos ***
   */
  isAttachmentOnlyContent(text) {
    if (!text || !text.trim()) return true;

    // Solo los tipos de archivos que realmente se pueden subir
    const attachmentPatterns = [
      // Documentos
      /\.(txt|pdf|docx|md|csv)\s*\d+(\.\d+)?\s*(KB|MB)/i,

      // Código 
      /\.(js|jsx|ts|tsx|py|java|cpp|c|h|cs|php|rb|go|rs|html|css|json|xml|sql|sh)\s*\d+(\.\d+)?\s*(KB|MB)/i,

      // Imágenes
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)\s*\d+(\.\d+)?\s*(KB|MB)/i,

      // Patrones de texto que indican archivos
      /^\s*Aquí.*\.(txt|pdf|docx|md|csv|js|jsx|ts|tsx|py|java|cpp|c|h|cs|php|rb|go|rs|html|css|json|xml|sql|sh|jpg|jpeg|png|gif|webp|svg|bmp)/i,

      // Solo tamaños de archivo
      /^\s*\d+(\.\d+)?\s*(KB|MB)\s*$/i,

      // Solo espacios/saltos de línea
      /^[\s\n]*$/,
    ];

    const isAttachmentOnly = attachmentPatterns.some(pattern => pattern.test(text));

    if (isAttachmentOnly) {
      console.log('🔍 [ATTACHMENT] Contenido detectado como solo archivos adjuntos:', text.substring(0, 50) + '...');
    }

    return isAttachmentOnly;
  }

  /**
   * *** FUNCIÓN AUXILIAR: Extrae texto de JSON multimodal (mantener igual) ***
   */
  extractTextFromMultimodalJSON(jsonString) {
    try {
      let parsedData;

      if (jsonString.trim().startsWith('"{') && jsonString.trim().endsWith('}"')) {
        // JSON doblemente escapado
        const unescapedOnce = JSON.parse(jsonString);
        parsedData = JSON.parse(unescapedOnce);
      } else if (jsonString.trim().startsWith('{')) {
        // JSON normal
        parsedData = JSON.parse(jsonString);
      } else {
        return null;
      }

      // Extraer solo el texto del JSON multimodal
      if (parsedData && typeof parsedData === 'object') {
        return parsedData.text || parsedData.content || '';
      }

      return null;
    } catch (e) {
      console.warn('⚠️ [EXTRACT] Error parseando JSON multimodal:', e);
      return null;
    }
  }

  async updateUserMessageContent(messageElement, editedText) {
    if (!messageElement || !editedText) return;

    const userContentElement = messageElement.querySelector('.message-content');
    if (!userContentElement) return;

    try {
      let parseMarkdownFunction = null;
      try {
        const markdownModule = await import('./markdown-matematico.js');
        if (markdownModule && markdownModule.parseMarkdownToHTML) {
          parseMarkdownFunction = markdownModule.parseMarkdownToHTML;
        }
      } catch (importError) {
        console.warn('No se pudo importar markdown.js:', importError);
      }

      const encodedOriginalText = encodeURIComponent(editedText);

      if (parseMarkdownFunction) {
        const markdownFormatted = parseMarkdownFunction(editedText);
        const messageTextDiv = createElement('div', {
          className: 'message-text',
          dataset: { originalText: encodedOriginalText }
        });
        messageTextDiv.innerHTML = markdownFormatted;

        while (userContentElement.firstChild) {
          userContentElement.removeChild(userContentElement.firstChild);
        }
        userContentElement.appendChild(messageTextDiv);
      } else {
        const safeText = sanitizeText(editedText);
        const formattedWithBr = safeText.replace(/\n/g, '<br data-nl="true">');

        const messageTextDiv = createElement('div', {
          className: 'message-text',
          dataset: { originalText: encodedOriginalText }
        });
        messageTextDiv.innerHTML = formattedWithBr;

        while (userContentElement.firstChild) {
          userContentElement.removeChild(userContentElement.firstChild);
        }
        userContentElement.appendChild(messageTextDiv);

        const preElements = userContentElement.querySelectorAll('pre, code');
        preElements.forEach(el => {
          el.style.whiteSpace = 'pre-wrap';
        });
      }

    } catch (error) {
      console.error('Error al actualizar contenido del mensaje:', error);

      const formattedText = editedText.replace(/\n/g, '<br>');
      const messageTextDiv = createElement('div', { className: 'message-text' });
      messageTextDiv.innerHTML = formattedText;

      while (userContentElement.firstChild) {
        userContentElement.removeChild(userContentElement.firstChild);
      }
      userContentElement.appendChild(messageTextDiv);
    }
  }

  resetMessageRating(messageElement) {
    if (!messageElement) return;

    removeClass(messageElement, 'rated-positive');
    removeClass(messageElement, 'rated-negative');
    removeClass(messageElement, 'message-rated');

    const thumbsUpBtn = messageElement.querySelector('.thumbs-up-btn');
    const thumbsDownBtn = messageElement.querySelector('.thumbs-down-btn');

    if (thumbsUpBtn) {
      removeClass(thumbsUpBtn, 'active');
      thumbsUpBtn.setAttribute('data-tooltip', 'Me gusta');
    }

    if (thumbsDownBtn) {
      removeClass(thumbsDownBtn, 'active');
      thumbsDownBtn.setAttribute('data-tooltip', 'No me gusta');
    }

    try {
      const messageId = messageElement.dataset.messageId;
      const serverId = messageElement.dataset.serverId || this.extractServerMessageId(messageElement);

      if (messageId || serverId) {
        let storedFeedback = [];
        try {
          storedFeedback = JSON.parse(localStorage.getItem('message_feedback') || '[]');
        } catch (e) {
          storedFeedback = [];
        }

        const updatedFeedback = storedFeedback.filter(item => {
          if (!item) return false;

          const messageIdMatch = messageId && item.messageId === messageId;
          const serverIdMatch = serverId && (item.serverId === serverId || item.id_message === serverId);

          return !(messageIdMatch || serverIdMatch);
        });

        localStorage.setItem('message_feedback', JSON.stringify(updatedFeedback));
      }
    } catch (error) {
      console.error('Error al eliminar valoración de localStorage:', error);
    }

    delete messageElement.dataset.feedbackSaved;
  }

  extractTextFromResponse(response) {
    if (typeof response === 'string') {
      return response;
    }

    if (response.answer && typeof response.answer === 'string') {
      return response.answer;
    }

    if (response.content && typeof response.content === 'string') {
      return response.content;
    }

    if (response.message && typeof response.message === 'string') {
      return response.message;
    }

    try {
      return JSON.stringify(response, null, 2);
    } catch (e) {
      return 'No se pudo extraer respuesta';
    }
  }

  processResponseData(data) {
    try {
      if (typeof window.processServerResponse === 'function') {
        return window.processServerResponse(data);
      }
    } catch (e) {
      console.warn('No se pudo acceder a processServerResponse original');
    }

    let type = 'message';
    let content = '';

    if (data.type) {
      type = data.type;

      if (type === 'code' && data.code) {
        content = { code: data.code, language: data.language || 'javascript' };
      } else if (type === 'table' && (data.headers || data.rows)) {
        content = data;
      } else if (type === 'exam' && data.exam) {
        content = data.exam;
      } else if (type === 'conversation' || type === 'message') {
        content = data.answer || data.content || data.message || '';
      } else {
        content = data;
      }
    } else {
      content = data.answer || data.content || data.message ||
        (typeof data === 'string' ? data : JSON.stringify(data));
    }

    return { type, content };
  }

  addInteractionButtons(messageElement) {
    if (messageElement.querySelector('.response-actions')) return;

    if (messageElement.classList.contains('cancelled') ||
      messageElement.classList.contains('just-cancelled') ||
      messageElement.dataset.cancelled === "true" ||
      messageElement.classList.contains('error-message') ||
      messageElement.querySelector('.cancelled-message') ||
      messageElement.querySelector('.error-container')) {
      console.log('Mensaje cancelado o con error detectado, no se añaden botones de interacción');
      return;
    }

    if (!messageElement.dataset.messageId) {
      const prefix = 'ai-msg';
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 10000);
      messageElement.dataset.messageId = `${prefix}-${timestamp}-${randomId}`;
    }

    const actionsContainer = createElement('div', { className: 'response-actions' });

    const copyBtn = createElement('button', {
      className: 'response-action-btn copy-btn',
      dataset: { tooltip: 'Copiar' }
    });
    copyBtn.innerHTML = `<i class='bx bx-copy'></i>`;
    actionsContainer.appendChild(copyBtn);

    const thumbsUpBtn = createElement('button', {
      className: 'response-action-btn thumbs-up-btn',
      dataset: { tooltip: 'Me gusta' }
    });
    thumbsUpBtn.innerHTML = `<i class='bx bx-like'></i>`;
    actionsContainer.appendChild(thumbsUpBtn);

    const thumbsDownBtn = createElement('button', {
      className: 'response-action-btn thumbs-down-btn',
      dataset: { tooltip: 'No me gusta' }
    });
    thumbsDownBtn.innerHTML = `<i class='bx bx-dislike'></i>`;
    actionsContainer.appendChild(thumbsDownBtn);

    const retryBtn = createElement('button', {
      className: 'response-action-btn retry-btn',
      dataset: { tooltip: 'Reintentar' }
    });
    retryBtn.innerHTML = `<i class='bx bx-refresh'></i>`;
    actionsContainer.appendChild(retryBtn);

    // ✅ CRÍTICO: Pasar referencia directa al evento, no confiar en closure
    addEvent(copyBtn, 'click', (e) => {
      e.stopPropagation();

      // ✅ ENCONTRAR el mensaje desde el botón clickeado EN TIEMPO REAL
      const clickedButton = e.currentTarget;
      const currentMessageElement = clickedButton.closest('.ai-message');

      console.log('🎯 [COPY] Click detectado en mensaje:', {
        currentMessageId: currentMessageElement?.dataset?.messageId,
        originalMessageId: messageElement?.dataset?.messageId,
        areTheSame: currentMessageElement === messageElement
      });

      // ✅ USAR el mensaje encontrado desde el click, no el del closure
      this.handleCopyAction(currentMessageElement);
    });

    addEvent(retryBtn, 'click', (e) => {
      e.stopPropagation();
      this.handleRetryAction(messageElement);
    });

    addEvent(thumbsUpBtn, 'click', (e) => {
      e.stopPropagation();
      this.handleThumbsUpAction(messageElement);
    });

    addEvent(thumbsDownBtn, 'click', (e) => {
      e.stopPropagation();
      this.handleThumbsDownAction(messageElement);
    });

    messageElement.appendChild(actionsContainer);
    this.checkStoredRating(messageElement);
  }

  checkStoredRating(messageElement) {
    try {
      const messageId = messageElement.dataset.messageId;
      const serverId = this.extractServerMessageId(messageElement);

      if (!messageId && !serverId) {
        return;
      }

      const storedFeedbackStr = localStorage.getItem('message_feedback');
      if (!storedFeedbackStr) {
        return;
      }

      let storedFeedback;
      try {
        storedFeedback = JSON.parse(storedFeedbackStr);
      } catch (parseError) {
        localStorage.setItem('message_feedback', '[]');
        return;
      }

      const validFeedback = storedFeedback.filter(item => item != null);

      const existingFeedback = validFeedback.find(item => {
        const messageIdMatch = messageId && item && item.messageId === messageId;
        const serverIdMatch = serverId && item && (
          item.serverId === serverId ||
          item.id_message === serverId
        );

        return messageIdMatch || serverIdMatch;
      });

      if (existingFeedback) {
        this.markMessageRated(messageElement, existingFeedback.type);

        if (serverId && !messageElement.dataset.feedbackSaved) {
          messageElement.dataset.feedbackSaved = 'true';
        }
      }
    } catch (error) {
      console.error('Error al verificar valoración guardada:', error);
    }
  }

  /**
   * *** FUNCIÓN SIMPLIFICADA: El backend hace toda la limpieza ***
   */
  async handleCopyAction(messageElementFromContext) {
    console.log('🎯 [COPY] handleCopyAction llamado');

    // ✅ CRÍTICO: Encontrar el mensaje correcto desde el evento actual
    // NO confiar en messageElementFromContext que puede ser incorrecto
    let actualMessageElement = null;

    // ✅ MÉTODO 1: Buscar desde el botón de copia que fue clickeado
    const copyButton = document.querySelector('.copy-btn:hover') ||
      document.querySelector('.copy-btn:focus') ||
      document.querySelector('.copy-btn:active');

    if (copyButton) {
      actualMessageElement = copyButton.closest('.ai-message');
      console.log('✅ [COPY] Mensaje encontrado desde botón clickeado');
    }

    // ✅ MÉTODO 2: Si no encontramos desde hover, usar el messageElement original como fallback
    if (!actualMessageElement) {
      actualMessageElement = messageElementFromContext;
      console.log('⚠️ [COPY] Usando messageElement del contexto como fallback');
    }

    // ✅ VERIFICACIÓN FINAL: Asegurar que tenemos un mensaje de IA válido
    if (!actualMessageElement || !actualMessageElement.classList.contains('ai-message')) {
      console.error('❌ [COPY] No se pudo encontrar mensaje de IA válido');
      acadelError('¡Mensaje perdido! 🤖', 'No se pudo identificar el mensaje a copiar');
      return;
    }

    console.log('🎯 [COPY] Mensaje identificado:', {
      messageId: actualMessageElement.dataset.messageId,
      serverId: actualMessageElement.dataset.serverId,
      className: actualMessageElement.className
    });

    const copyBtn = actualMessageElement.querySelector('.copy-btn');
    const copyIcon = copyBtn?.querySelector('i');

    // Deshabilitar botón temporalmente
    if (copyBtn) {
      copyBtn.disabled = true;
      copyBtn.style.pointerEvents = 'none';
    }

    // Mostrar loading
    if (copyIcon) {
      const originalClass = copyIcon.className;
      copyIcon.className = 'bx bx-loader-alt bx-spin';
      copyIcon.dataset.originalClass = originalClass;
    }

    try {
      // ✅ USAR SIEMPRE el método fallback directo (es más confiable que el backend)
      console.log('📋 [COPY] Usando método de extracción directa...');
      await this.fallbackToOriginalCopy(actualMessageElement);

    } catch (error) {
      console.error('❌ [COPY] Error en copia:', error);

      if (copyIcon) {
        copyIcon.className = 'bx bx-x';
      }

      acadelError('¡Copia complicada! 📋', 'Acadel tuvo problemas copiando este mensaje');
    } finally {
      // RESTAURAR botón
      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.style.pointerEvents = 'auto';
      }

      // RESTAURAR ícono después de 2 segundos
      if (copyIcon && copyIcon.dataset.originalClass) {
        setTimeout(() => {
          copyIcon.className = copyIcon.dataset.originalClass;
          delete copyIcon.dataset.originalClass;
        }, 2000);
      }
    }
  }

  /**
   * *** FUNCIÓN AUXILIAR: Obtiene contenido limpio del backend ***
   */
  async getCleanContentFromBackend(messageElement) {
    try {
      // Obtener IDs necesarios
      const messageId = this.extractServerMessageId(messageElement);
      const stateModule = await import('../core/state-matematico.js');
      const currentChatId = stateModule.getState('currentChatId');

      if (!messageId || !currentChatId) {
        console.warn('No se pudo obtener IDs, usando fallback');
        return null;
      }

      // Hacer petición al backend
      const url = `/api/feedback/message/${currentChatId}/${messageId}/original-content`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`Error HTTP ${response.status}, usando fallback`);
        return null;
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('Backend reportó error:', data.error);
        return null;
      }

      // Retornar contenido filtrado (ya limpio del backend)
      return data.data.filteredContent || data.data.originalContent || null;

    } catch (error) {
      console.error('Error obteniendo del backend:', error);
      return null;
    }
  }

  /**
   * *** FUNCIÓN AUXILIAR: Copia usando clipboard nativo ***
   */
  async copyWithNativeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback para navegadores antiguos
      throw new Error('Clipboard API no disponible');
    }
  }

  /**
   * *** FUNCIÓN AUXILIAR: Fallback al método original ***
   */
  async fallbackToOriginalCopy(messageElement) {
    console.log('📋 Usando método original como fallback');

    const copyIcon = messageElement.querySelector('.copy-btn i');
    const contentElement = messageElement.querySelector('.message-content');

    if (!contentElement) {
      if (copyIcon) copyIcon.className = 'bx bx-x';
      acadelError('¡Copia rebelde! 📋', 'No se encontró contenido para copiar');
      return;
    }

    try {
      // Tu método original (simple y funcional)
      const textToCopy = contentElement.innerText || contentElement.textContent;

      // Usar tu función de clipboard existente
      await copyToClipboard(textToCopy);

      if (copyIcon) {
        copyIcon.className = 'bx bx-check';
      }

      console.log(`✅ Método original usado como fallback (${textToCopy.length} caracteres)`);

    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);

      if (copyIcon) {
        copyIcon.className = 'bx bx-x';
      }

      acadelError('¡Copia rebelde! 📋', 'Acadel no pudo copiar el texto. El portapapeles está en huelga');
    }
  }

  handleThumbsUpAction(messageElement) {
    if (hasClass(messageElement, 'rated-positive')) {
      acadelInfo('¡Ya votaste! 👍', 'Acadel recuerda que ya te gustó esta respuesta. Tu buen gusto está registrado');
      return;
    }

    if (hasClass(messageElement, 'rated-negative')) {
      this.markMessageRated(messageElement, 'positive', true);
      this.updateStoredFeedback(messageElement, 'positive', true);
      acadelExito('¡Cambio de opinión! 💭', 'Acadel ha actualizado tu valoración. Incluso los capibara cambian de parecer');
      return;
    }

    this.showFeedbackModal('¡Gracias por tu valoración!', '¿Qué te gustó de esta respuesta?', 'positive', messageElement);
  }

  handleThumbsDownAction(messageElement) {
    if (hasClass(messageElement, 'rated-negative')) {
      acadelInfo('¡Ya votaste! 👎', 'Acadel recuerda tu crítica anterior. La consistencia es virtud académica');
      return;
    }

    if (hasClass(messageElement, 'rated-positive')) {
      this.markMessageRated(messageElement, 'negative', true);
      this.updateStoredFeedback(messageElement, 'negative', true);
      acadelInfo('¡Cambio registrado! 🔄', 'Acadel ha actualizado tu valoración. A veces hay que ser más crítico');
      return;
    }

    this.showFeedbackModal('Tu opinión es importante', '¿Qué podríamos mejorar?', 'negative', messageElement);
  }

  showFeedbackModal(title, prompt, type, messageElement) {
    scrollManager.lockScroll();

    const existingModal = document.querySelector('.feedback-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = createElement('div', {
      className: 'feedback-modal',
      dataset: { responseInteraction: 'true' }
    });

    const modalContent = createElement('div', { className: 'feedback-modal-content' });

    const modalHeader = createElement('div', { className: 'feedback-modal-header' });
    const modalTitle = createElement('h3', {}, title);
    const closeBtn = createElement('button', {
      className: 'feedback-modal-close',
      dataset: { responseInteraction: 'true' }
    }, '×');
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);

    const modalBody = createElement('div', { className: 'feedback-modal-body' });
    const promptText = createElement('p', {}, prompt);
    const textarea = createElement('textarea', {
      className: 'feedback-textarea',
      placeholder: 'Escribe tu comentario aquí...'
    });
    modalBody.appendChild(promptText);
    modalBody.appendChild(textarea);

    const modalFooter = createElement('div', { className: 'feedback-modal-footer' });
    const submitBtn = createElement('button', {
      className: 'feedback-btn feedback-submit-btn',
      dataset: { responseInteraction: 'true' }
    }, 'Enviar');
    const cancelBtn = createElement('button', {
      className: 'feedback-btn feedback-cancel-btn',
      dataset: { responseInteraction: 'true' }
    }, 'Cancelar');
    modalFooter.appendChild(submitBtn);
    modalFooter.appendChild(cancelBtn);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    setManagedTimeout(() => {
      addClass(modal, 'show');
    }, 10, 'modal-show');

    setManagedTimeout(() => {
      textarea.focus();
    }, 300, 'textarea-focus');

    const self = this;

    const closeModalWithUnlock = () => {
      self.closeFeedbackModal(modal);

      setManagedTimeout(() => {
        scrollManager.unlockScroll();
      }, 400, 'modal-scroll-unlock');
    };

    addEvent(closeBtn, 'click', (e) => {
      e.stopPropagation();
      closeModalWithUnlock();
    });

    addEvent(cancelBtn, 'click', (e) => {
      e.stopPropagation();
      closeModalWithUnlock();
    });

    addEvent(submitBtn, 'click', (e) => {
      e.stopPropagation();
      const feedback = textarea.value.trim();
      self.markMessageRated(messageElement, type);

      if (feedback) {
        self.submitFeedback(type, feedback, messageElement);
      } else {
        self.updateStoredFeedback(messageElement, type, false);
        self.submitFeedback(type, '', messageElement);
      }

      closeModalWithUnlock();
    });

    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        removeEvent(document, 'keydown', handleEscKey);
        closeModalWithUnlock();
      }
    };
    addEvent(document, 'keydown', handleEscKey);

    addEvent(modalContent, 'click', (e) => {
      e.stopPropagation();
    });
  }

  closeFeedbackModal(modal) {
    if (!modal) return;

    removeClass(modal, 'show');
    setManagedTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300, 'modal-remove');
  }

  extractMessageContent(messageElement) {
    if (!messageElement) return 'Contenido no disponible';

    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement) return 'Contenido no disponible';

    const codeElement = contentElement.querySelector('pre code');
    if (codeElement) {
      return `[Código] ${codeElement.innerText || codeElement.textContent}`;
    }

    let content = contentElement.innerText || contentElement.textContent || 'Contenido vacío';

    if (content.length > 5000) {
      content = content.substring(0, 5000) + '... [contenido truncado]';
    }

    return content;
  }

  updateStoredFeedback(messageElement, type, sendToServer = false) {
    try {
      const id_chat = getState('currentChatId');
      const serverId = this.extractServerMessageId(messageElement);
      const clientId = messageElement.dataset.messageId;

      const messageId = clientId || `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      if (!messageElement.dataset.messageId) {
        messageElement.dataset.messageId = messageId;
      }

      const feedbackData = {
        id_chat,
        messageId: messageId,
        serverId: serverId,
        id_message: serverId || messageId,
        type,
        feedback_text: '',
        message_content: this.extractMessageContent(messageElement),
        timestamp: Date.now()
      };

      this.saveToLocalStorage(messageId, serverId, feedbackData);

      if (sendToServer) {
        this.submitFeedback(type, '', messageElement);
      }
    } catch (error) {
      console.error('Error al actualizar valoración:', error);
    }
  }

  submitFeedback(type, feedback, messageElement) {
    try {
      const id_chat = getState('currentChatId');
      const id_message = this.extractServerMessageId(messageElement);
      const client_id = messageElement.dataset.messageId;

      if (!id_chat) {
        acadelError('¡Chat perdido! 🔍', 'Acadel no encuentra el ID del chat. Se fue a dar una vuelta');
        return;
      }

      if (!id_message && !client_id) {
        acadelError('¡Mensaje fugitivo! 📨', 'Acadel no puede identificar este mensaje. Se escapó del radar');
        return;
      }

      if (!type) {
        acadelError('¡Feedback misterioso! ❓', 'Acadel no sabe qué tipo de valoración es. El misterio académico continúa');
        return;
      }

      const messageContent = this.extractMessageContent(messageElement);

      const feedbackData = {
        id_chat,
        messageId: client_id,
        serverId: id_message,
        id_message: id_message || client_id,
        type,
        feedback_text: feedback || '',
        message_content: messageContent,
        timestamp: Date.now()
      };

      this.saveToLocalStorage(client_id, id_message, feedbackData);
      this.markMessageRated(messageElement, type);

      checkAuthentication()
        .then(userData => {
          const userId = userData?.id_user || null;
          this.sendFeedbackRequest(id_chat, id_message || client_id, type, feedback, messageContent, userId, messageElement);
        })
        .catch(authError => {
          this.sendFeedbackRequest(id_chat, id_message || client_id, type, feedback, messageContent, null, messageElement);
        });

    } catch (err) {
      console.error('Error en procesamiento de feedback:', err);
      acadelError('¡Error sorpresa! 🎪', 'Acadel encontró un error inesperado. La vida está llena de sorpresas');
    }
  }

  sendFeedbackRequest(id_chat, id_message, type, feedback, messageContent, userId, messageElement) {
    const feedbackData = {
      chatId: id_chat,
      messageId: id_message,
      type: type,
      feedback: feedback || '',
      messageContent: messageContent || ''
    };

    if (userId) {
      feedbackData.id_user = userId;
    }

    const apiRoute = userId ? '/api/feedback/' : '/api/feedback/anonymous';

    fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData),
      credentials: 'include'
    })
      .then(response => {
        const isOk = response.ok;
        return response.json().then(data => ({ data, isOk }));
      })
      .then(({ data, isOk }) => {
        if (isOk) {
          if (data && data.id) {
            messageElement.dataset.feedbackSaved = 'true';

            const storedFeedback = JSON.parse(localStorage.getItem('message_feedback') || '[]');
            const messageId = messageElement.dataset.messageId;
            const existingIndex = storedFeedback.findIndex(item => item.messageId === messageId);

            if (existingIndex >= 0) {
              storedFeedback[existingIndex].serverId = data.id;
              localStorage.setItem('message_feedback', JSON.stringify(storedFeedback));
            }
          }
          acadelExito('¡Feedback recibido! 📝', 'Acadel agradece tu opinión. Cada comentario nos hace más inteligentes');
        } else {
          console.error('Error enviando feedback:', data);
          acadelError('¡Feedback atascado! 📮', 'Acadel no pudo enviar tu valoración. El sistema está meditando');
        }
      })
      .catch(error => {
        console.error('Error en la petición de feedback:', error);
        acadelWarning('¡Feedback en pausa! ⏸️', 'Acadel no pudo procesar tu valoración ahora. Inténtalo más tarde, la paciencia es virtud');
      });
  }

  saveToLocalStorage(messageId, serverId, data) {
    try {
      if (!data) {
        console.error('Datos de feedback inválidos');
        return;
      }

      if (!messageId && !serverId) {
        messageId = data.messageId || null;
        serverId = data.serverId || data.id_message || null;

        if (!messageId && !serverId) {
          messageId = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          data.messageId = messageId;
        }
      }

      let storedFeedback;
      try {
        storedFeedback = JSON.parse(localStorage.getItem('message_feedback') || '[]');
      } catch (e) {
        console.error('Error al parsear localStorage, reiniciando:', e);
        storedFeedback = [];
      }

      storedFeedback = storedFeedback.filter(item => item != null);

      const feedbackData = {
        ...data,
        messageId: data.messageId || messageId,
        serverId: data.serverId || serverId,
        id_message: data.id_message || serverId || messageId,
        timestamp: Date.now()
      };

      const existingIndex = storedFeedback.findIndex(item =>
        item && (
          (messageId && item.messageId === messageId) ||
          (serverId && (item.serverId === serverId || item.id_message === serverId))
        )
      );

      if (existingIndex >= 0) {
        storedFeedback[existingIndex] = feedbackData;
      } else {
        storedFeedback.push(feedbackData);
      }

      if (storedFeedback.length > 200) {
        storedFeedback.splice(0, storedFeedback.length - 200);
      }

      localStorage.setItem('message_feedback', JSON.stringify(storedFeedback));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  markMessageRated(messageElement, type, changeType = false) {
    if (changeType) {
      removeClass(messageElement, 'rated-positive');
      removeClass(messageElement, 'rated-negative');

      const thumbsUpBtn = messageElement.querySelector('.thumbs-up-btn');
      const thumbsDownBtn = messageElement.querySelector('.thumbs-down-btn');

      if (thumbsUpBtn) {
        removeClass(thumbsUpBtn, 'active');
        thumbsUpBtn.setAttribute('data-tooltip', 'Me gusta');
      }

      if (thumbsDownBtn) {
        removeClass(thumbsDownBtn, 'active');
        thumbsDownBtn.setAttribute('data-tooltip', 'No me gusta');
      }
    }

    addClass(messageElement, 'message-rated');
    addClass(messageElement, `rated-${type}`);

    const thumbsUpBtn = messageElement.querySelector('.thumbs-up-btn');
    const thumbsDownBtn = messageElement.querySelector('.thumbs-down-btn');

    if (type === 'positive' && thumbsUpBtn) {
      addClass(thumbsUpBtn, 'active');
      thumbsUpBtn.setAttribute('data-tooltip', 'Valorada positivamente');

      if (thumbsDownBtn) {
        removeClass(thumbsDownBtn, 'active');
        thumbsDownBtn.setAttribute('data-tooltip', 'No me gusta');
      }
    } else if (type === 'negative' && thumbsDownBtn) {
      addClass(thumbsDownBtn, 'active');
      thumbsDownBtn.setAttribute('data-tooltip', 'Valorada negativamente');

      if (thumbsUpBtn) {
        removeClass(thumbsUpBtn, 'active');
        thumbsUpBtn.setAttribute('data-tooltip', 'Me gusta');
      }
    }
  }

  handleGlobalClick(event) {
    const modal = document.querySelector('.feedback-modal');
    if (modal && !event.target.closest('.feedback-modal-content') &&
      !event.target.getAttribute('data-response-interaction')) {
      this.closeFeedbackModal(modal);
      setTimeout(() => {
        scrollManager.unlockScroll();
      }, 300);
    }
  }
}

// Variable para mantener una única instancia
let responseInteractionInstance = null;

export function initResponseInteraction(processExisting = true) {
  if (!responseInteractionInstance) {
    responseInteractionInstance = new ResponseInteractionManager();
  }

  if (processExisting) {
    responseInteractionInstance.processExistingMessages(true);
  }

  exportRetryAction();

  // ⭐ NUEVO: Retornar el instance con las nuevas funciones disponibles
  return {
    ...responseInteractionInstance,
    processExistingMessages: responseInteractionInstance.processExistingMessages.bind(responseInteractionInstance),
    addInteractionButtons: responseInteractionInstance.addInteractionButtons.bind(responseInteractionInstance),
    addUserInteractionButtons: responseInteractionInstance.addUserInteractionButtons.bind(responseInteractionInstance),
    onResponseComplete: responseInteractionInstance.onResponseComplete.bind(responseInteractionInstance),
    refreshInteractionButtons: responseInteractionInstance.refreshInteractionButtons.bind(responseInteractionInstance)
  };
}

// ⭐ NUEVA FUNCIÓN: Para llamar desde fuera cuando se complete una respuesta
export function notifyResponseComplete() {
  if (responseInteractionInstance && typeof responseInteractionInstance.onResponseComplete === 'function') {
    responseInteractionInstance.onResponseComplete();

    // También refrescar el estado de botones
    setTimeout(() => {
      if (typeof responseInteractionInstance.refreshInteractionButtons === 'function') {
        responseInteractionInstance.refreshInteractionButtons();
      }
    }, 100);
  }
}

// ⭐ NUEVA FUNCIÓN: Para refrescar manualmente el estado de botones
export function refreshButtonsState() {
  if (responseInteractionInstance && typeof responseInteractionInstance.refreshInteractionButtons === 'function') {
    responseInteractionInstance.refreshInteractionButtons();
  }
}

export function exportRetryAction() {
  if (!responseInteractionInstance) {
    console.error('ResponseInteractionManager no está inicializado');
    return;
  }

  window.handleMermaidRetryAction = function (messageElement) {
    responseInteractionInstance.handleRetryAction(messageElement);
  };

  window.handleRetryAction = function (messageElement) {
    responseInteractionInstance.handleRetryAction(messageElement);
  };
}

// Limpieza de timeouts al descargar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearManagedTimeouts();
  });
}

export default {
  initResponseInteraction,
  exportRetryAction
};