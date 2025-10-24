/**
 * chat-controller.js AGENTE - Controlador principal para las funciones de chat matemático
 * Versión optimizada con manejo robusto de transiciones y estados
 * Adaptado con funcionalidades de audio y YouTube
 * ACTUALIZADO: Sistema multimodal completo adaptado desde matemático
 */

import { URL_CONFIG, DOM_SELECTORS, API_ROUTES } from './config-agente.js';
import { getState, setCurrentChat, setProcessingState, setMathPanelState } from './state-agente.js';
import { createNewChat, loadChatMessages, loadChatHistory, deleteChat } from '../api/chat-agente.js';
import { sendMessage, sendMessageWithAttachments } from '../api/messages-agente.js';
import { processExistingDocuments, activateDocumentEvents } from '../ui/content-processing-agente.js';
import {
  clearChatMessages,
  getElement,
  toggleUIState,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton,
  handleTextareaResize,
  reinitializeTextareaListeners,
  showMediaProcessingLoader,
  startProcessingCheck
} from '../ui/ui-manager-agente.js';
import {
  renderChatMessages,
  createLoadingMessage,
  replaceWithError,
  processServerResponse,
  replaceLoadingMessage
} from '../ui/message-renderer-agente.js';
import {
  safeChatAction,
  isChatProblematic,
  showCleanupDialog,
  markChatAsProblem
} from '../utils/chat-error-handler-agente.js';
import { validateUUID } from '../../../shared/validators.js';
import { renderChatHistory, updateActiveSidebarItem } from '../ui/sidebar-agente.js';
import { getAttachedFiles, clearAttachedFiles, hasAttachedFiles } from '../utils/file-attachments-agente.js';
import { updateHeaderForChat, updateHeaderSubtitle, closeHeaderDropdown } from "../ui/header-manager-agente.js";
import { parseMarkdownToHTML } from "../utils/markdown-agente.js";
import {
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts,
  removeAllEvents,
  removeClass
} from '../../../shared/dom-helpers.js';
import { showWelcomeMessage, registerSendMessageHandler, clearDomCache, getCachedElement } from '../ui/welcome-message-agente.js';
import { initCharacterLimit, exceedsLimit, showLimitExceededAlert } from '../../../shared/character-limit.js';
// ✅ AÑADIR esta importación después de las existentes
import ChatNoticesSystem from '../../../shared/chat-notices.js';
const {
  initChatNotices,
  showTokenLimitNotice,
  showFreeUserLimitNotice,
  showSmartTokenNotice,
  clearTokenWarnings,
} = ChatNoticesSystem;

// ===== SISTEMA DE GESTIÓN CENTRALIZADA ADAPTADO =====

/**
 * Gestor centralizado de DOM para optimizar querySelector calls
 */
class DOMManager {
  constructor() {
    this.cache = new Map();
    this.refreshQueue = new Set();
  }

  /**
   * Obtiene elemento del caché o lo busca y cachea
   */
  get(selector, forceRefresh = false) {
    if (forceRefresh || !this.cache.has(selector)) {
      const element = document.querySelector(selector);
      this.cache.set(selector, element);
    }
    return this.cache.get(selector);
  }

  /**
   * Invalida caché para selectores específicos
   */
  invalidate(selectors) {
    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    selectorsArray.forEach(selector => this.cache.delete(selector));
  }

  /**
   * Limpia todo el caché
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Getters optimizados para elementos comunes
   */
  get textarea() { return this.get('#messageInput'); }
  get fixedSpace() { return this.get('.fixed-space'); }
  get chatMessages() { return this.get('.chat-messages'); }
  get inputBox() { return this.get('.input-box'); }
  get sendButton() { return this.get(DOM_SELECTORS.sendButton); }
  get mathButton() { return this.get(DOM_SELECTORS.mathButton); }
  get attachButton() { return this.get(DOM_SELECTORS.attachButton); }
  get filePreviewContainer() { return this.get('.file-preview-container'); }
  get fileUploadContainer() { return this.get('.file-upload-container'); }
  get mathPanel() { return this.get('#mathPanel'); }
  get previewModal() { return this.get('#preview-modal'); }
}

/**
 * Gestor centralizado de Event Listeners para evitar duplicación y memory leaks
 * Compatible con dom-helpers.js existente
 */
class EventManager {
  constructor() {
    this.listeners = new Map();
    this.cleanupQueue = new Set();
  }

  /**
   * Añade event listener con tracking para cleanup
   * Usa las funciones existentes de dom-helpers.js
   */
  add(element, event, handler, options = false, key = null) {
    if (!element) return false;

    const listenerKey = key || `${element.id || 'element'}_${event}_${Date.now()}`;

    // Limpiar listener previo si existe
    this.remove(listenerKey);

    // Usar la función existente de dom-helpers.js
    const success = addEvent(element, event, handler, options);

    if (success) {
      this.listeners.set(listenerKey, {
        element,
        event,
        handler,
        options
      });
    }

    return success ? listenerKey : false;
  }

  /**
   * Remueve event listener específico
   * Compatible con dom-helpers.js
   */
  remove(key) {
    const listener = this.listeners.get(key);
    if (listener) {
      // Usar la función existente de dom-helpers.js
      const success = removeEvent(listener.element, listener.event, listener.handler);
      if (success) {
        this.listeners.delete(key);
      }
      return success;
    }
    return false;
  }

  /**
   * Remueve todos los listeners de un elemento
   * Usa removeAllEvents de dom-helpers.js
   */
  removeFromElement(element) {
    const toRemove = [];
    for (const [key, listener] of this.listeners) {
      if (listener.element === element) {
        toRemove.push(key);
      }
    }

    // Usar la función existente de dom-helpers.js
    const success = removeAllEvents(element);

    // Limpiar nuestro tracking
    toRemove.forEach(key => this.listeners.delete(key));

    return success;
  }

  /**
   * Limpia todos los listeners
   */
  removeAll() {
    for (const [key] of this.listeners) {
      this.remove(key);
    }
  }
}

/**
 * Utilidades centralizadas para operaciones comunes
 * Compatible con dom-helpers.js existente
 */
class ChatUtils {
  /**
   * Limpia elementos de bienvenida con patrón optimizado
   */
  static cleanupWelcomeElements() {
    const selectors = ['.welcome-message', '.centered-input-container', '.suggestions-container'];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          // Usar función existente de dom-helpers.js
          removeAllEvents(el);
          el.remove();
        }
      });
    });

    // Limpiar paneles matemáticos específicos de bienvenida
    ['welcome-mathPanel', 'welcome-math-editor-container'].forEach(id => {
      const panel = document.getElementById(id);
      if (panel) panel.remove();
    });

    // Limpiar referencias globales
    if (window.welcomeFiles) {
      window.welcomeFiles.clear();
      window.welcomeFiles = null;
    }
    if (window.temporaryWelcomeFiles) {
      window.temporaryWelcomeFiles = null;
    }

    // ⭐ NUEVO: Limpiar ID temporal si hubo error y no se completó el flujo normal
    if (window.tempChatIdForFiles) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado en cleanup de bienvenida`);
    }
  }

  /**
   * Restaura visibilidad del área de entrada con patrón optimizado
   */
  static restoreInputVisibility() {
    const fixedSpace = domManager.fixedSpace;
    const inputBox = domManager.inputBox;
    const textarea = domManager.textarea;

    if (fixedSpace) {
      fixedSpace.removeAttribute('style');
      fixedSpace.style.opacity = '1';
      fixedSpace.style.display = '';
      fixedSpace.style.pointerEvents = 'auto';
      fixedSpace.style.visibility = 'visible';
      void fixedSpace.offsetHeight; // Forzar reflow
    }

    if (textarea) {
      textarea.removeAttribute('disabled');
      textarea.removeAttribute('readonly');
      textarea.style.display = '';
      textarea.style.visibility = 'visible';
      textarea.style.opacity = '1';
      textarea.style.pointerEvents = 'auto';
    }

    if (inputBox) {
      inputBox.style.display = '';
      inputBox.style.visibility = 'visible';
      inputBox.style.opacity = '1';
      inputBox.style.pointerEvents = 'auto';
    }
  }

  /**
   * Limpia archivos adjuntos con patrón unificado
   */
  static async cleanupFileAttachments() {
    // Cerrar contenedor de vista previa
    const filePreviewContainer = domManager.filePreviewContainer;
    if (filePreviewContainer) {
      const previewElements = filePreviewContainer.querySelectorAll('.file-preview');
      previewElements.forEach(element => {
        // Usar función existente de dom-helpers.js
        removeAllEvents(element);
      });
      filePreviewContainer.innerHTML = '';
    }

    // Limpiar función nativa si está disponible
    if (typeof clearAttachedFiles === 'function') {
      clearAttachedFiles();
    }

    // Limpiar contenedor de upload
    const fileUploadContainer = domManager.fileUploadContainer;
    if (fileUploadContainer) {
      removeClass(fileUploadContainer, 'active');
      removeClass(fileUploadContainer, 'dragging');
    }

    // Limpiar URLs de objetos
    if (window.objectURLs && Array.isArray(window.objectURLs)) {
      window.objectURLs.forEach(url => {
        if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.warn('Error al revocar URL:', e);
          }
        }
      });
      window.objectURLs = [];
    }
  }

  /**
   * Verifica y ejecuta validación de límites de caracteres
   */
  static async validateCharacterLimit(text) {
    if (!text) return true;

    try {
      if (typeof exceedsLimit === 'function' && exceedsLimit(text)) {
        if (typeof showLimitExceededAlert === 'function') {
          showLimitExceededAlert();
        } else {
          const module = await import('../../../shared/character-limit.js');
          if (typeof module.showLimitExceededAlert === 'function') {
            module.showLimitExceededAlert();
          }
        }
        return false;
      }
    } catch (e) {
      console.warn('Error al verificar límite de caracteres:', e);
      try {
        const module = await import('../../../shared/character-limit.js');
        if (module.exceedsLimit && module.exceedsLimit(text)) {
          if (module.showLimitExceededAlert) {
            module.showLimitExceededAlert();
          }
          return false;
        }
      } catch (innerError) {
        console.warn('Error en verificación alternativa de límite:', innerError);
      }
    }
    return true;
  }

  /**
   * Configura el controlador de aborto con sincronización
   */
static setupAbortController() {
  // ✅ LIMPIAR CONTROLADORES EXISTENTES DE MANERA ROBUSTA
  const controllersToAbort = [
    window.currentAbortController,
    window.currentFetchController,
    window.fetchController
  ].filter(Boolean);

  controllersToAbort.forEach(controller => {
    try {
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
    } catch (e) {
      console.warn('Error al abortar controlador existente:', e);
    }
  });

  const abortController = new AbortController();
  
  // ✅ VERIFICACIÓN DE CREACIÓN EXITOSA
  if (!abortController || !abortController.signal) {
    console.error('❌ Error: AbortController no se creó correctamente');
    throw new Error('No se pudo crear AbortController');
  }
  
  // ✅ SINCRONIZACIÓN SÍNCRONA PARA PRODUCCIÓN
  window.currentAbortController = abortController;
  window.currentFetchController = abortController;
  window.fetchController = abortController;

  // ✅ SINCRONIZACIÓN ASÍNCRONA COMO RESPALDO
  try {
    import('../ui/ui-manager-agente.js').then(module => {
      if (typeof module.setCurrentFetchController === 'function') {
        module.setCurrentFetchController(abortController);
      }
    }).catch(err => console.warn('Error al sincronizar controlador:', err));
  } catch (e) {
    console.warn('Error en import dinámico:', e);
  }

  console.log('🚀 AbortController configurado:', {
    hasSignal: !!abortController.signal,
    isAborted: abortController.signal.aborted
  });

  return abortController;
}

  /**
   * Limpia timeouts con patrón optimizado
   * Usa clearManagedTimeouts de dom-helpers.js
   */
  static cleanupTimeouts() {
    // Usar función existente de dom-helpers.js
    clearManagedTimeouts();
  }

  /**
   * Cierra paneles matemáticos con estado sincronizado
   */
  static closeMathPanels() {
    const mathPanel = domManager.mathPanel;
    if (mathPanel) {
      removeClass(mathPanel, 'show');
      mathPanel.style.display = 'none';
      if (typeof setMathPanelState === 'function') {
        setMathPanelState(false);
      }
    }

    const mathEditorContainer = document.querySelector('#math-editor-container');
    if (mathEditorContainer) {
      mathEditorContainer.style.display = 'none';
    }

    const mathButton = domManager.mathButton;
    if (mathButton) {
      removeClass(mathButton, 'active');
    }
  }
}

// Instancias globales de los gestores
const domManager = new DOMManager();
const eventManager = new EventManager();

// Variables para controlar cambios de chat y peticiones pendientes
let isSwitchingChat = false;
let pendingChatSwitch = null;

/**
 * Inicializa el controlador de chat con gestión optimizada
 */
export function initChatController() {
  // Limpiar gestores para reinicio limpio
  domManager.clearAll();
  eventManager.removeAll();

  // Cargar y limpiar chats problemáticos de forma más robusta
  Promise.all([
    import('../utils/chat-error-handler-agente.js'),
    import('../api/chat-agente.js'),
    import('../ui/sidebar-agente.js')
  ])
    .then(([errorModule, chatModule, sidebarModule]) => {
      if (typeof errorModule.loadProblematicChats === 'function') {
        const problemCount = errorModule.loadProblematicChats();
      }

      if (typeof errorModule.cleanupAllProblematicChats === 'function') {
        errorModule.cleanupAllProblematicChats(true)
          .then(count => {
            if (count > 0) {
              chatModule.loadChatHistory().then(updatedChats => {
                sidebarModule.renderChatHistory(updatedChats);
              }).catch(e => console.warn('Error al recargar historial:', e));
            }
          })
          .catch(error => {
            console.warn('Error durante la limpieza inicial de chats problemáticos:', error);
          });
      }
    })
    .catch(error => {
      console.warn('Error al cargar módulos de manejo de errores:', error);
    });

  // Inicializar limitador de caracteres para el textarea principal
  const textarea = domManager.textarea;
  if (textarea) {
    initializeCharacterLimit(textarea);

    // Configurar validación de límite en evento input
    eventManager.add(textarea, 'input', function () {
      if (typeof exceedsLimit === 'function' && textarea.value) {
        const isExceeded = exceedsLimit(textarea.value);
        textarea.classList.toggle('limit-exceeded', isExceeded);
      }
    }, false, 'main-textarea-limit-validation');
  }

  // Inicializar en el textarea de nuevo chat si existe
  const welcomeTextarea = document.querySelector('#welcome-message-input');
  if (welcomeTextarea) {
    initializeCharacterLimit(welcomeTextarea);
  }

  // Escuchar cambios de textarea globalmente para mantener la validación
  eventManager.add(document, 'focusin', function (e) {
    if (e.target.tagName === 'TEXTAREA') {
      if (!e.target._hasLimitHandler && typeof initCharacterLimit === 'function') {
        initCharacterLimit(e.target, { variant: 'agente' });
        e.target._hasLimitHandler = true;
      }
    }
  }, false, 'global-textarea-limit-init');

  // Registrar manejador de mensajes para la pantalla de bienvenida
  registerSendMessageHandler(handleSendMessage);

  // Verificar si hay un chat en la URL
  checkInitialChatFromURL();

  // Configurar eventos específicos de chat
  setupChatEventListeners();
  setupMessageRenderingInterceptor();
  setupMessageObserver();

  // Procesar mensajes existentes si los hay
  setTimeout(() => {
    processAllExistingMessages();
  }, 1000);

  // Configurar el observer para scroll en móviles
  setupScrollObserver();

  // ✅ NUEVO: Inicializar sistema de avisos al final
  try {
    initChatNotices({ variant: 'agente' });
    console.log('✅ Sistema de avisos inicializado para agente');
  } catch (error) {
    console.warn('Error al inicializar sistema de avisos:', error);
  }
}

/**
 * Inicializa límites de caracteres con patrón optimizado
 */
function initializeCharacterLimit(textarea) {
  if (typeof initCharacterLimit === 'function') {
    initCharacterLimit(textarea, { variant: 'agente' });
  } else {
    import('../../../shared/character-limit.js').then(module => {
      if (typeof module.initCharacterLimit === 'function') {
        module.initCharacterLimit(textarea, { variant: 'agente' });
      }
    }).catch(e => console.warn('Error al inicializar límite de caracteres:', e));
  }
}

/**
 * Configura los event listeners principales del chat con gestión centralizada
 */
function setupChatEventListeners() {
  const sendButton = domManager.sendButton;
  const newChatBtn = getCachedElement('#newChatBtn');
  const sidebarNewChatBtn = document.querySelector('.sidebar-item.new-chat-btn');

  // Evento de envío de mensaje
  if (sendButton) {
    eventManager.add(sendButton, 'click', handleSendMessage, false, 'main-send-button');
  }

  // Evento de tecla para enviar con Enter
  const textarea = domManager.textarea;
  if (textarea) {
    eventManager.add(textarea, 'keydown', handleKeyPress, false, 'main-textarea-keydown');
  }

  // Eventos para nuevo chat
  if (newChatBtn) {
    eventManager.add(newChatBtn, 'click', handleNewChat, false, 'new-chat-button');
  }

  if (sidebarNewChatBtn) {
    eventManager.add(sidebarNewChatBtn, 'click', handleNewChat, false, 'sidebar-new-chat-button');
  }

  // Listener para evento personalizado de retry
  eventManager.add(window, 'sendMessageRequest', handleSendMessage, false, 'send-message-request');
}

function setupScrollObserver() {
  // Limpiar observador existente si hay alguno
  if (window.chatMessagesObserver) {
    window.chatMessagesObserver.disconnect();
  }

  // Esperar a que el DOM esté completamente cargado
  setTimeout(() => {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages && window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        // Solo aplicar en móviles y cuando no estemos en pantalla de bienvenida
        if (window.innerWidth < 768 && !document.querySelector('.welcome-message')) {
          // Usar setTimeout para dar tiempo a la renderización
          setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }, 50);
        }
      });

      observer.observe(chatMessages, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Guardar referencia para limpieza posterior
      window.chatMessagesObserver = observer;
    }
  }, 500); // Esperar a que todo esté cargado
}

/**
 * Añade un mensaje al chat con posibles archivos adjuntos - VERSIÓN SIMPLIFICADA
 * @param {string} role - Rol del mensaje ('user' o 'ai')
 * @param {string} content - Contenido del mensaje
 * @param {Array} files - Archivos adjuntos sin procesar
 * @returns {HTMLElement} Elemento del mensaje
 */
function addMessageWithAttachmentsSimplified(role, content, files = []) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return null;

  const messageDiv = document.createElement('div');
  const messageType = role === 'ai' ? 'ai-message' : 'user-message';
  messageDiv.className = `message ${messageType}`;

  if (role === 'ai') {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    messageDiv.dataset.messageId = messageId;
  }

  if (role === 'ai') {
    const aiProfile = document.createElement('div');
    aiProfile.className = 'ai-profile';

    const profileImg = document.createElement('img');
    profileImg.src = window.APP_CONFIG?.assistantImagePath || './assets/img/ava-profile.png';
    profileImg.alt = 'Perfil IA';
    aiProfile.appendChild(profileImg);

    const contentElem = document.createElement('div');
    contentElem.className = 'message-content';

    messageDiv.appendChild(aiProfile);
    messageDiv.appendChild(contentElem);

    if (typeof renderTextMessage === 'function') {
      renderTextMessage(contentElem, content);
    } else {
      contentElem.innerHTML = parseMarkdownToHTML(content);
    }
  } else {
    // Mensaje del usuario
    if (files && files.length > 0) {
      const hasImages = files.some(file => file.type === 'image');

      if (hasImages) {
        messageDiv.setAttribute('data-has-images', 'true');
      }

      const multimodalContent = constructSimplifiedMultimodalContent(content, files);

      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.innerHTML = multimodalContent;
      messageDiv.appendChild(messageContent);

      messageDiv.setAttribute('data-multimodal', 'true');
    } else {
      // Mensaje de solo texto
      const safeContent = typeof content === 'string' ? content : String(content);

      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';

      const messageText = document.createElement('div');
      messageText.className = 'message-text';
      messageText.setAttribute('data-original-text', encodeURIComponent(safeContent));

      messageText.innerHTML = parseMarkdownToHTML(safeContent);

      messageContent.appendChild(messageText);
      messageDiv.appendChild(messageContent);
    }
  }

  // ⚡ AÑADIR AL DOM INMEDIATAMENTE
  chatMessages.appendChild(messageDiv);

  // ⚡ RENDERIZAR MATEMÁTICAS INMEDIATAMENTE (sin setTimeout)
  if (role === 'user' && typeof content === 'string' &&
    (content.includes('$') || content.includes('\\(') || content.includes('\\)'))) {
    const contentElem = messageDiv.querySelector('.message-content');

    // Sin setTimeout - inmediato
    import('../math/mathjax-config-agente.js').then(module => {
      if (typeof module.renderMath === 'function') {
        module.renderMath(contentElem).catch(console.error);
      }
    }).catch(console.error);
  }

  return messageDiv;
}

// ===== FUNCIÓN constructSimplifiedMultimodalContent NUEVA =====

/**
 * Construye el contenido HTML para mensajes multimodales - VERSIÓN SIMPLIFICADA
 * Solo muestra previews, no procesa contenido localmente
 * @param {string} text - Texto del mensaje
 * @param {Array} files - Archivos adjuntos sin procesar
 * @returns {string} HTML del contenido multimodal
 */
/**
 * ⭐ VERSIÓN MEJORADA: Construye contenido multimodal con mejor manejo de errores ⭐
 */
function constructSimplifiedMultimodalContent(text, files) {
  function sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  let html = '<div class="multimodal-container">';

  // Agregar texto si existe
  if (text && text.trim()) {
    html += `<div class="multimodal-text">${parseMarkdownToHTML(text)}</div>`;
  }

  if (files.length > 0) {
    html += `<div class="unified-attachments">`;

    files.forEach((file, index) => {
      try {
        if (file.type === 'image') {
          // ⭐ MANEJO SEGURO DE IMÁGENES ⭐
          if (file.data && file.data.base64) {
            // Validar que el base64 sea válido
            try {
              // Verificar formato de data URL
              if (file.data.base64.startsWith('data:') && file.data.base64.includes('base64,')) {
                html += `
                  <div class="chat-image-item clickable">
                    <img src="${sanitize(file.data.base64)}" alt="Imagen adjunta" data-original-src="${sanitize(file.data.base64)}">
                  </div>
                `;
              } else {
                throw new Error('Formato de base64 inválido');
              }
            } catch (base64Error) {
              console.warn(`⚠️ Error con imagen ${index + 1}:`, base64Error);
              html += `
                <div class="attachment-indicator image error">
                  <i class='bx bx-image-off'></i>
                  <span>Imagen no disponible</span>
                </div>
              `;
            }
          } else {
            html += `
              <div class="attachment-indicator image">
                <i class='bx bx-image'></i>
                <span>${sanitize(file.file.name)}</span>
              </div>
            `;
          }
        }
        else if (file.type === 'document' || file.type === 'code') {
          // ⭐ MANEJO SEGURO DE DOCUMENTOS CON NOMBRE EXACTO ⭐
          const extension = file.file.name.split('.').pop().toLowerCase();
          let iconClass = 'bxs-file-txt';
          let attachmentType = 'document';

          if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html', 'php', 'rb'].includes(extension)) {
            iconClass = 'bx-code-alt';
            attachmentType = 'code';
          } else if (['pdf'].includes(extension)) {
            iconClass = 'bxs-file-pdf';
          } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
            iconClass = 'bxs-spreadsheet';
          }

          const fileName = file.file.name.length > 12 ? file.file.name.substring(0, 9) + '...' : file.file.name;
          const fileSize = ((file.file.size || 0) / 1024).toFixed(1);

          // ⭐ CRÍTICO: Usar nombre completo exacto para mapeo correcto ⭐
          html += `
            <div class="document-preview temp-preview" 
                 data-file-name="${sanitize(file.file.name)}"
                 data-attachment-type="${attachmentType}"
                 data-language="${extension}"
                 data-temp-index="${index}"
                 title="${sanitize(file.file.name)}">
              <i class="bx ${iconClass} document-icon"></i>
              <span class="document-name">${sanitize(fileName)}</span>
              <small class="document-size">${fileSize} KB</small>
            </div>
          `;
        }
        else if (file.type === 'audio') {
          // ⭐ MANEJO SEGURO DE AUDIO CON NOMBRE EXACTO ⭐
          const fileName = file.file.name.length > 25 ? file.file.name.substring(0, 22) + '...' : file.file.name;
          const fileSize = ((file.file.size || 0) / 1024).toFixed(1);

          const duration = file.data?.duration ?
            `${Math.floor(file.data.duration / 60)}:${(file.data.duration % 60).toString().padStart(2, '0')}` :
            'No disponible';

          const format = file.data?.format ?
            file.data.format.split('/')[1]?.toUpperCase() || 'AUDIO' :
            'AUDIO';

          const source = file.data?.source || 'archivo de audio';
          const timestamp = file.data?.timestamp ?
            new Date(file.data.timestamp).toLocaleString() :
            new Date().toLocaleString();

          // ⭐ CRÍTICO: Usar nombre completo exacto para mapeo correcto ⭐
          html += `
            <div class="audio-preview enhanced-audio temp-preview" 
                 data-file-name="${sanitize(file.file.name)}"
                 data-attachment-type="audio"
                 data-duration="${duration}"
                 data-format="${format}"
                 data-source="${source}"
                 data-temp-index="${index}"
                 title="${sanitize(file.file.name)}">
              
              <div class="audio-preview-header">
                <div class="audio-icon-container">
                  <i class="bx bxs-music audio-icon"></i>
                  <span class="audio-format-badge">${format}</span>
                </div>
                <div class="audio-main-info">
                  <span class="audio-name" title="${sanitize(file.file.name)}">${sanitize(fileName)}</span>
                  <div class="audio-metadata">
                    <span class="audio-size">${fileSize} KB</span>
                    <span class="audio-duration">⏱️ ${duration}</span>
                  </div>
                </div>
              </div>
              
              <div class="audio-preview-details">
                <div class="audio-detail-item">
                  <i class="bx bx-info-circle"></i>
                  <span>Fuente: ${source}</span>
                </div>
                <div class="audio-detail-item">
                  <i class="bx bx-time"></i>
                  <span>Procesado: ${timestamp}</span>
                </div>
                <div class="audio-status">
                  <i class="bx bx-check-circle" style="color: #10b981;"></i>
                  <span>Listo para transcripción</span>
                </div>
              </div>
            </div>
          `;
        }
      } catch (fileError) {
        console.error(`❌ Error procesando archivo ${index + 1}:`, fileError);

        // Mostrar placeholder de error
        html += `
          <div class="attachment-indicator error">
            <i class='bx bx-error-circle'></i>
            <span>Archivo ${index + 1} no disponible</span>
          </div>
        `;
      }
    });

    html += `</div>`;
  }

  html += '</div>';
  return html;
}

/**
 * ⭐ NUEVA: Procesa la respuesta del servidor y actualiza documentos temporales ⭐
 * @param {Object} data - Respuesta del servidor
 * @param {HTMLElement} messageElement - Elemento del mensaje del usuario
 */
/**
 * ⭐ FUNCIÓN CORREGIDA: Procesa la respuesta del servidor y actualiza documentos temporales ⭐
 */
function processServerResponseDocuments(data, messageElement) {
  if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
    console.log('📄 Actualizando documentos temporales con fileIds del servidor...');
    console.log('📊 Documentos del servidor:', data.documents.map(d => ({
      name: d.originalName || d.fileName,
      id: d.fileId,
      index: data.documents.indexOf(d)
    })));

    const tempPreviews = messageElement.querySelectorAll('.document-preview.temp-preview, .audio-preview.temp-preview');
    console.log(`🔍 Encontrados ${tempPreviews.length} previews temporales`);

    // ⭐ MAPEO POR NOMBRE EN LUGAR DE ÍNDICE ⭐
    const serverDocsByName = new Map();
    data.documents.forEach((doc, index) => {
      const names = [
        doc.originalName,
        doc.fileName,
        doc.name
      ].filter(Boolean);

      // Mapear todos los nombres posibles al mismo documento
      names.forEach(name => {
        if (!serverDocsByName.has(name)) {
          serverDocsByName.set(name, { doc, used: false });
        }
      });
    });

    console.log('📋 Mapa de documentos del servidor por nombre:', Array.from(serverDocsByName.keys()));

    let matchedCount = 0;

    tempPreviews.forEach((tempPreview, tempIndex) => {
      const fileName = tempPreview.dataset.fileName;
      console.log(`📝 Procesando preview ${tempIndex + 1}: "${fileName}"`);

      let serverDoc = null;

      // ⭐ BUSCAR POR NOMBRE EXACTO PRIMERO ⭐
      if (fileName && serverDocsByName.has(fileName)) {
        const docEntry = serverDocsByName.get(fileName);
        if (!docEntry.used) {
          serverDoc = docEntry.doc;
          docEntry.used = true; // Marcar como usado
          console.log(`✅ Match por nombre exacto: "${fileName}"`);
        }
      }

      // ⭐ SI NO HAY MATCH POR NOMBRE, USAR FALLBACK POR ÍNDICE ⭐
      if (!serverDoc && data.documents[matchedCount]) {
        serverDoc = data.documents[matchedCount];
        console.log(`⚠️ Match por índice secuencial (fallback): documento ${matchedCount}`);
      }

      if (serverDoc && serverDoc.fileId) {
        console.log(`🔗 Vinculando: "${fileName}" -> "${serverDoc.originalName}" (${serverDoc.fileId})`);

        // ⭐ ACTUALIZACIÓN COMPLETA DE ATRIBUTOS ⭐
        tempPreview.dataset.fileId = serverDoc.fileId;
        tempPreview.dataset.fileName = serverDoc.originalName || fileName;
        tempPreview.dataset.attachmentType = serverDoc.attachmentType || 'document';

        if (serverDoc.language) {
          tempPreview.dataset.language = serverDoc.language;
        }

        // ⭐ CAMBIAR CLASES Y HACER CLICKEABLE ⭐
        tempPreview.classList.remove('temp-preview');
        tempPreview.classList.add('clickable');
        tempPreview.style.cursor = 'pointer';

        // ⭐ MARCAR COMO PROCESADO ⭐
        tempPreview.setAttribute('data-processed', 'true');

        matchedCount++;
        console.log(`✅ Documento vinculado exitosamente: ${serverDoc.originalName} -> ${serverDoc.fileId}`);
      } else {
        console.warn(`❌ No se pudo vincular: "${fileName}"`);

        // ⭐ MANTENER EL PREVIEW PERO MARCARLO COMO NO DISPONIBLE ⭐
        tempPreview.classList.remove('temp-preview');
        tempPreview.classList.add('no-preview', 'disabled');
        tempPreview.style.opacity = '0.6';
        tempPreview.title = 'Documento no disponible (error al procesar)';

        // Agregar indicador visual de error
        const icon = tempPreview.querySelector('.document-icon');
        if (icon) {
          icon.className = 'bx bx-error-circle document-icon';
          icon.style.color = '#e74c3c';
        }
      }
    });

    console.log(`📊 Resultado del matching: ${matchedCount}/${tempPreviews.length} documentos vinculados`);

    // ⭐ ACTIVAR EVENTOS DESPUÉS DE PROCESAR TODOS ⭐
    setTimeout(() => {
      try {
        if (typeof activateDocumentEvents === 'function') {
          activateDocumentEvents(messageElement);
        } else {
          // Importar dinámicamente la función
          import('./content-processing-agente.js').then(module => {
            if (module.activateDocumentEvents) {
              module.activateDocumentEvents(messageElement);
            }
          }).catch(err => console.warn('Error al importar activateDocumentEvents:', err));
        }
        console.log('🔧 Eventos de documentos activados correctamente');
      } catch (error) {
        console.error('❌ Error al activar eventos de documentos:', error);
      }
    }, 200);
  }
}

/**
 * ⭐ NUEVA: Detecta y procesa JSON doblemente escapado ⭐
 */
function processEscapedJSON(content) {
  // Verificar si el contenido es un string que parece JSON escapado
  if (typeof content === 'string' &&
    content.trim().startsWith('"{') &&
    content.trim().endsWith('}"')) {

    try {
      console.log('🔍 Detectado JSON doblemente escapado...');

      // Paso 1: Parsear el JSON externo (quitar comillas externas)
      const unescapedOnce = JSON.parse(content);

      // Paso 2: Parsear el JSON interno  
      const parsedData = JSON.parse(unescapedOnce);

      console.log('✅ JSON parseado exitosamente:', parsedData);

      // Verificar si es contenido multimodal
      if ((parsedData.hasDocuments && parsedData.documents) ||
        (parsedData.hasImage && parsedData.images)) {

        console.log('🎯 Convirtiendo JSON multimodal a HTML...');
        return formatMultimodalContentSync(parsedData);
      }

      // Si no es multimodal, devolver solo el texto
      return parsedData.text || content;

    } catch (e) {
      console.warn('Error al procesar JSON escapado:', e);
      return content;
    }
  }

  // Si no es JSON escapado, intentar JSON normal
  if (typeof content === 'string' &&
    content.trim().startsWith('{') &&
    content.trim().endsWith('}')) {

    try {
      const parsedData = JSON.parse(content);

      if ((parsedData.hasDocuments && parsedData.documents) ||
        (parsedData.hasImage && parsedData.images)) {

        console.log('🎯 Convirtiendo JSON normal a HTML...');
        return formatMultimodalContentSync(parsedData);
      }

      return parsedData.text || content;

    } catch (e) {
      // No es JSON válido, devolver contenido original
      return content;
    }
  }

  return content;
}

/**
 * ⭐ NUEVA: Intercepta el renderizado de mensajes usando override ⭐
 */
function setupMessageRenderingInterceptor() {
  // Método 1: Interceptar appendChild para detectar nuevos mensajes
  const originalAppendChild = Element.prototype.appendChild;

  Element.prototype.appendChild = function (newChild) {
    const result = originalAppendChild.call(this, newChild);

    // Si es un mensaje de usuario que se está agregando
    if (newChild.nodeType === Node.ELEMENT_NODE &&
      newChild.classList &&
      newChild.classList.contains('user-message')) {

      setTimeout(() => {
        processMessageElement(newChild);
      }, 10);
    }

    return result;
  };

  console.log('✅ Interceptor de renderizado configurado');
}

/**
 * ⭐ NUEVA: Procesa un elemento de mensaje después de ser agregado al DOM ⭐
 */
function processMessageElement(messageElement) {
  try {
    // Buscar elementos que puedan contener JSON
    const textElements = messageElement.querySelectorAll('.message-text, .message-content, div');

    textElements.forEach(textElement => {
      const content = textElement.textContent || textElement.innerHTML;

      // Solo procesar si parece JSON y no ha sido procesado
      if (content &&
        typeof content === 'string' &&
        !textElement.hasAttribute('data-processed') &&
        (content.includes('hasDocuments') || content.includes('documents') || content.includes('hasImage'))) {

        console.log('🔍 Procesando contenido JSON en elemento:', content.substring(0, 100) + '...');

        const processedContent = processEscapedJSON(content);

        if (processedContent !== content) {
          textElement.innerHTML = processedContent;
          textElement.setAttribute('data-processed', 'true');

          // Activar eventos de click para documentos
          setTimeout(() => {
            activateDocumentEvents(textElement);
          }, 50);

          console.log('✅ Contenido JSON procesado y reemplazado');
        }
      }
    });

  } catch (error) {
    console.error('Error al procesar elemento de mensaje:', error);
  }
}

/**
 * ⭐ NUEVA: Procesa todos los mensajes existentes al cargar ⭐
 */
function processAllExistingMessages() {
  console.log('🔍 Procesando todos los mensajes existentes...');

  const userMessages = document.querySelectorAll('.user-message');
  console.log(`Encontrados ${userMessages.length} mensajes de usuario`);

  // ⭐ CAMBIO: Procesar inmediatamente sin delays ⭐
  userMessages.forEach((messageElement) => {
    processMessageElement(messageElement);
  });

  // ⭐ NUEVO: Llamar también al procesamiento inmediato del content-processing ⭐
  import('../ui/content-processing-agente.js').then(contentModule => {
    if (typeof contentModule.processMessagesImmediately === 'function') {
      contentModule.processMessagesImmediately();
    }
  }).catch(e => console.warn('Error al importar procesamiento adicional:', e));
}

/**
 * ⭐ NUEVA: Versión mejorada de formatMultimodalContentSync ⭐
 */
function formatMultimodalContentSync(jsonData) {
  const text = jsonData.text || '';
  const images = jsonData.images || [];
  const documents = jsonData.documents || [];

  let html = '<div class="multimodal-container">';

  // Agregar texto si existe y no es consulta por defecto
  const cleanedText = text.trim();
  const isDefaultQuery = [
    "Consulta con imagen",
    "Analiza esta imagen:",
    "Consulta con archivos adjuntos",
    ""
  ].includes(cleanedText);

  if (!isDefaultQuery && cleanedText) {
    const processedText = typeof parseMarkdownToHTML === 'function' ?
      parseMarkdownToHTML(cleanedText) : cleanedText;
    html += `<div class="multimodal-text">${processedText}</div>`;
  }

  // ⭐ NUEVO: CONTENEDOR UNIFICADO PARA TODOS LOS ELEMENTOS ⭐
  const hasImages = images.length > 0;
  const hasDocuments = documents.length > 0;

  if (hasImages || hasDocuments) {
    html += `<div class="unified-attachments">`;

    // ⭐ PROCESAR IMÁGENES DIRECTAMENTE (sin contenedor separado) ⭐
    if (hasImages) {
      const validImages = images.filter(img => img && img.path);

      validImages.forEach(img => {
        html += `
            <div class="chat-image-item clickable">
              <img src="${escapeHtml(img.path)}" alt="Imagen adjunta" data-original-src="${escapeHtml(img.path)}">
            </div>
          `;
      });
    }

    // ⭐ PROCESAR DOCUMENTOS DIRECTAMENTE (sin contenedor separado) ⭐
    if (hasDocuments) {
      const validDocuments = documents.filter(doc => doc && doc.fileId);

      validDocuments.forEach(doc => {
        const iconClass = getIconForFileType(doc.attachmentType || 'document');
        const fileName = truncateFileNameSimple(doc.originalName || 'Documento', 12);
        const fileSize = formatFileSizeSimple(doc.fileSize || 0);

        html += `
          <div class="document-preview clickable" 
               data-file-id="${escapeHtml(doc.fileId)}" 
               data-file-name="${escapeHtml(doc.originalName || 'Documento')}"
               data-attachment-type="${escapeHtml(doc.attachmentType || 'document')}"
               data-language="${escapeHtml(doc.language || '')}"
               title="${escapeHtml(doc.originalName || 'Documento')}">
            <i class="bx ${iconClass} document-icon"></i>
            <span class="document-name">${escapeHtml(fileName)}</span>
            <small class="document-size">${escapeHtml(fileSize)}</small>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  html += '</div>';
  return html;
}

/**
 * ⭐ NUEVA: Función para escapar HTML ⭐
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * ⭐ NUEVA: Observer para procesar mensajes después de renderizarse ⭐
 */
function setupMessageObserver() {
  const chatMessages = domManager.chatMessages;
  if (!chatMessages) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains('user-message')) {

            setTimeout(() => {
              processExistingMessage(node);
            }, 50);
          }
        });
      }
    });
  });

  observer.observe(chatMessages, {
    childList: true,
    subtree: true
  });

  console.log('✅ Observer de mensajes configurado');
}

/**
 * ⭐ NUEVA: Procesa un mensaje individual después de renderizarse ⭐
 */
function processExistingMessage(messageElement) {
  try {
    const textElements = messageElement.querySelectorAll('.message-text, .message-content');

    textElements.forEach(textElement => {
      const content = textElement.textContent || textElement.innerHTML;

      // Si parece JSON multimodal, procesarlo
      if (typeof content === 'string' &&
        content.trim().startsWith('{') &&
        (content.includes('hasDocuments') || content.includes('documents') || content.includes('hasImage'))) {

        console.log('🔍 Procesando contenido JSON en mensaje existente...');

        try {
          const processedHTML = processMessageContent(content, false);

          if (processedHTML !== content) {
            textElement.innerHTML = processedHTML;

            // Activar eventos de click para documentos
            setTimeout(() => {
              activateDocumentEvents(textElement);
            }, 100);

            console.log('✅ Mensaje JSON procesado y documentos activados');
          }
        } catch (e) {
          console.warn('Error al procesar contenido JSON:', e);
        }
      }

      // También verificar data-original-text si existe
      const originalText = textElement.dataset?.originalText;
      if (originalText) {
        try {
          const decodedText = decodeURIComponent(originalText);
          if (decodedText.trim().startsWith('{') &&
            (decodedText.includes('hasDocuments') || decodedText.includes('documents'))) {

            const processedHTML = processMessageContent(decodedText, false);
            if (processedHTML !== decodedText) {
              textElement.innerHTML = processedHTML;

              setTimeout(() => {
                activateDocumentEvents(textElement);
              }, 100);
            }
          }
        } catch (e) {
          console.warn('Error al procesar originalText:', e);
        }
      }
    });

  } catch (error) {
    console.error('Error al procesar mensaje existente:', error);
  }
}

/**
 * ⭐ NUEVA: Procesa contenido de mensaje para detectar JSON multimodal ⭐
 */
function processMessageContent(messageContent, isAIMessage = false) {
  if (typeof messageContent === 'string' &&
    messageContent.trim().startsWith('{') &&
    messageContent.trim().endsWith('}')) {

    try {
      const parsed = JSON.parse(messageContent);

      // Si es contenido multimodal con documentos o imágenes
      if ((parsed.hasDocuments && parsed.documents && Array.isArray(parsed.documents)) ||
        (parsed.hasImage && parsed.images && Array.isArray(parsed.images))) {

        console.log('🔍 Detectado JSON multimodal, convirtiendo a HTML...');
        return formatMultimodalContentSync(parsed);
      }

    } catch (e) {
      console.warn('Error al parsear contenido JSON:', e);
    }
  }

  return messageContent;
}

/**
 * ⭐ NUEVAS: Funciones auxiliares ⭐
 */
function getIconForFileType(fileType) {
  const iconMap = {
    'document': 'bxs-file-txt',
    'code': 'bx-code-alt',
    'image': 'bx-image',
    'pdf': 'bxs-file-pdf',
    'excel': 'bxs-spreadsheet',
    'zip': 'bxs-file-archive',
    'audio': 'bxs-music'
  };
  return iconMap[fileType] || 'bxs-file-txt';
}

function truncateFileNameSimple(fileName, maxLength) {
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const maxNameLength = maxLength - extension.length - 4;

  if (maxNameLength <= 0) return '...' + extension;

  return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
}

function formatFileSizeSimple(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Función para verificar si una URL es de YouTube
 * @param {string} url - URL a verificar
 * @returns {boolean} true si es una URL de YouTube válida
 */
function isYouTubeURL(url) {
  if (!url || typeof url !== 'string') return false;
  // Expresión regular para validar URLs de YouTube
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return youtubeRegex.test(url);
}

/**
 * Función específica para procesar URLs de YouTube al crear un nuevo chat
 * @param {string} originalMessage - URL de YouTube
 * @param {string} newChatId - ID del nuevo chat
 */
async function handleYouTubeProcessingInNewChat(originalMessage, newChatId) {
  try {
    console.log('Iniciando procesamiento de YouTube para nuevo chat:', newChatId);

    // 1. Mostrar el loader de procesamiento con el nuevo ID de chat
    await showMediaProcessingLoader(newChatId, originalMessage, false);

    // 2. Actualizar localStorage con el nuevo ID de chat
    localStorage.setItem('youtubeProcessingChat', newChatId);

    // 3. Iniciar verificación de estado pero con un pequeño retraso
    // para dar tiempo a que el backend asocie el procesamiento con el nuevo chat
    setTimeout(() => {
      startProcessingCheck(newChatId);
    }, 2000);

    // 4. También programar una verificación adicional después de un tiempo más largo
    // por si acaso la primera verificación falla
    setTimeout(async () => {
      try {
        // Verificar estado actual del procesamiento
        const response = await fetch(`/api/video-transcription/chat/${newChatId}/video-processing-status`);
        const data = await response.json();

        // Si el procesamiento ya terminó pero el loader sigue visible
        if (data.success && !data.processing) {
          if (typeof hideYouTubeProcessingLoader === 'function') {
            hideYouTubeProcessingLoader();
          }

          // Actualizar mensajes y mostrar notificación
          if (typeof refreshChatWithNewMessages === 'function') {
            await refreshChatWithNewMessages(newChatId);
          }

          acadelExito(
            "🎬 ¡Video procesado exitosamente!",
            "Acadel terminó de analizar tu contenido audiovisual con precisión académica"
          );

          // Actualizar interfaz para mostrar la transcripción
          import('../components/youtube-panel.js').then(module => {
            if (module.youtubePanel && typeof module.youtubePanel.checkForVideo === 'function') {
              module.youtubePanel.checkForVideo();
              // INSERTAR AQUÍ - Forzar scroll después de procesar YouTube
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  const chatMessages = document.querySelector('.chat-messages');
                  if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                  }
                }, 400);
              }
            }
          }).catch(console.error);
        }
      } catch (error) {
        console.error('Error en verificación adicional:', error);
      }
    }, 10000); // Verificación de respaldo después de 15 segundos

    return true;
  } catch (error) {
    console.error('Error en handleYouTubeProcessingInNewChat:', error);
    return false;
  }
}

/**
 * 🦫 SISTEMA DE MENSAJES DINÁMICOS PARA ACADEL CONOCIMIENTO GENERAL
 * Mensajes variados para hacer la experiencia más divertida y educativa
 */

// 🧠 ARRAY DE MENSAJES VARIADOS PARA "ACADEL ESTÁ PENSANDO" - CONOCIMIENTO GENERAL
const ACADEL_THINKING_MESSAGES = [
  // Mensajes básicos de pensamiento
  {
    title: "🧠 Acadel está pensando",
    message: "Procesando tu consulta con sabiduría de capibara universal..."
  },
  {
    title: "🤔 Acadel analiza tu pregunta",
    message: "Su cerebro interdisciplinario está conectando conocimientos como un genio peludo"
  },
  {
    title: "💭 Acadel reflexiona profundamente",
    message: "Organizando información en su biblioteca mental multidisciplinaria"
  },

  // Mensajes más específicos y divertidos
  {
    title: "🎓 Acadel consulta sus conocimientos",
    message: "Revisando datos con la sabiduría de un capibara erudito"
  },
  {
    title: "🔍 Acadel investiga tu consulta",
    message: "Escaneando información con lupa académica interdisciplinaria"
  },
  {
    title: "⚡ Acadel procesa conocimientos",
    message: "Su CPU de capibara está funcionando a máxima velocidad educativa"
  },

  // Mensajes creativos con personalidad
  {
    title: "🌟 Acadel está inspirado",
    message: "Generando una respuesta digna de su sabiduría universal de capibara"
  },
  {
    title: "🎯 Acadel se concentra",
    message: "Enfocando toda su experiencia multidisciplinaria en tu pregunta"
  },
  {
    title: "🚀 Acadel despega mentalmente",
    message: "Su mente navega por océanos de conocimiento como capibara espacial"
  },

  // Mensajes técnicos pero divertidos
  {
    title: "⚙️ Acadel calibra su respuesta",
    message: "Ajustando parámetros para darte la mejor explicación interdisciplinaria"
  },
  {
    title: "🔬 Acadel analiza académicamente",
    message: "Aplicando método científico con toque de capibara intelectual"
  },
  {
    title: "📚 Acadel hojea su enciclopedia mental",
    message: "Consultando su vasta biblioteca de conocimientos universales"
  },

  // Mensajes para diferentes contextos
  {
    title: "🎨 Acadel crea una respuesta",
    message: "Diseñando una explicación tan bella como educativa e interdisciplinaria"
  },
  {
    title: "🧪 Acadel experimenta ideas",
    message: "Mezclando conceptos en su laboratorio mental de conocimiento universal"
  },
  {
    title: "🎪 Acadel prepara el espectáculo educativo",
    message: "Organizando sabiduría para un show académico interdisciplinario increíble"
  },

  // Mensajes específicos de conocimiento general
  {
    title: "🌍 Acadel explora disciplinas",
    message: "Navegando entre ciencias, humanidades y artes como capibara erudito"
  },
  {
    title: "🧩 Acadel conecta conocimientos",
    message: "Uniendo piezas del gran rompecabezas del saber universal"
  },
  {
    title: "📖 Acadel repasa la historia",
    message: "Consultando desde filosofía antigua hasta ciencia moderna"
  }
];

// ⏳ ARRAY DE MENSAJES VARIADOS PARA "OPERACIÓN LENTA" (8+ segundos) - CONOCIMIENTO GENERAL
const ACADEL_PATIENCE_MESSAGES = [
  // Mensajes clásicos de paciencia
  {
    title: "⏳ Acadel está trabajando intensamente...",
    message: "Esta consulta interdisciplinaria está tomando más tiempo del usual. Acadel pide paciencia mientras su cerebro de capibara procesa todo con sabiduría"
  },
  {
    title: "🔥 Acadel está en modo erudito intensivo",
    message: "Su procesador de capibara está al máximo. Un poquito más de paciencia para una respuesta genial"
  },
  {
    title: "⚡ Acadel sobrecarga su CPU académica",
    message: "Está usando toda su potencia mental multidisciplinaria. La espera valdrá la pena, lo promete"
  },

  // Mensajes divertidos sobre el tiempo
  {
    title: "🕰️ Acadel perdió la noción del tiempo",
    message: "Se emocionó tanto explorando conocimientos que está dando lo mejor de sí. Un momentito más..."
  },
  {
    title: "🐌 Acadel va más lento que caracol académico",
    message: "Pero es porque está siendo extra cuidadoso con los datos. Los capibaras eruditos no se apuran"
  },
  {
    title: "⏰ El tiempo vuela cuando Acadel investiga",
    message: "Para él han sido microsegundos explorando, pero promete acelerar su cerebrito peludo"
  },

  // Mensajes técnicos pero graciosos
  {
    title: "🔧 Acadel está en mantenimiento mental",
    message: "Reorganizando neuronas académicas para darte la mejor respuesta posible. Casi termina..."
  },
  {
    title: "💾 Acadel procesa conocimientos complejos",
    message: "Su disco duro interdisciplinario está trabajando horas extra. Un poquito más de espera"
  },
  {
    title: "🖥️ Acadel reinicia su sistema académico",
    message: "A veces hasta los capibaras más intelectuales necesitan un soft reset mental"
  },

  // Mensajes motivacionales
  {
    title: "🎯 Acadel perfecciona su explicación",
    message: "No quiere darte cualquier cosa, está puliendo cada concepto como el perfeccionista que es"
  },
  {
    title: "🏆 Acadel busca la respuesta perfecta",
    message: "Su estándar de calidad académica de capibara es muy alto. La paciencia será recompensada"
  },
  {
    title: "⭐ Acadel está creando algo especial",
    message: "Cuando tarda más es porque está preparando una explicación que te va a encantar"
  },

  // Mensajes con humor capibara académico
  {
    title: "🦫 Acadel necesita más café mental",
    message: "Su cerebro interdisciplinario está pidiendo combustible extra. Procesando... procesando..."
  },
  {
    title: "🧘 Acadel medita la respuesta perfecta",
    message: "Los capibaras sabios no se apuran. La paciencia es una virtud del conocimiento"
  },
  {
    title: "🎨 Acadel pinta su explicación con cuidado",
    message: "Cada concepto está siendo seleccionado con precisión artística de capibara erudito"
  },

  // Mensajes específicos de conocimiento general
  {
    title: "🌍 Acadel explora múltiples disciplinas",
    message: "Está conectando historia, ciencia, arte y más. Su mente de capibara es un universo en sí misma"
  },
  {
    title: "📚 Acadel consulta bibliotecas mentales",
    message: "Revisando desde filosofía griega hasta ciencia moderna. Su cerebro es una enciclopedia viviente"
  },
  {
    title: "🔬 Acadel analiza desde múltiples ángulos",
    message: "Viendo tu pregunta desde perspectivas científicas, históricas y culturales. ¡Qué capibara más completo!"
  }
];

/**
 * 🎲 FUNCIÓN PARA OBTENER MENSAJE ALEATORIO DE ACADEL PENSANDO
 * @returns {Object} Objeto con title y message aleatorios
 */
function getRandomThinkingMessage() {
  const randomIndex = Math.floor(Math.random() * ACADEL_THINKING_MESSAGES.length);
  const selectedMessage = ACADEL_THINKING_MESSAGES[randomIndex];

  console.log(`🎭 Mensaje "pensando" aleatorio seleccionado (${randomIndex + 1}/${ACADEL_THINKING_MESSAGES.length}):`, selectedMessage.title);

  return selectedMessage;
}

/**
 * ⏳ FUNCIÓN PARA OBTENER MENSAJE ALEATORIO DE PACIENCIA/OPERACIÓN LENTA
 * @returns {Object} Objeto con title y message aleatorios para operaciones lentas
 */
function getRandomPatienceMessage() {
  const randomIndex = Math.floor(Math.random() * ACADEL_PATIENCE_MESSAGES.length);
  const selectedMessage = ACADEL_PATIENCE_MESSAGES[randomIndex];

  console.log(`⏳ Mensaje "paciencia" aleatorio seleccionado (${randomIndex + 1}/${ACADEL_PATIENCE_MESSAGES.length}):`, selectedMessage.title);

  return selectedMessage;
}

/**
 * ✅ FUNCIÓN COMPLETAMENTE ACTUALIZADA: handleSendMessage
 * REEMPLAZAR la función handleSendMessage existente con esta versión
 * 
 * INCLUYE:
 * 1. Sistema completo de notificaciones dinámicas de Acadel
 * 2. Mensajes específicos para conocimiento general
 * 3. Manejo completo de límites y errores
 * 4. Limpieza automática de notificaciones
 * 5. Notificaciones para procesamiento de archivos
 */
export async function handleSendMessage() {
  // ✅ PROTECCIÓN CONTRA EJECUCIÓN MÚLTIPLE
  if (window._isHandlingSend) {
    console.log('🚫 handleSendMessage ya en ejecución');
    return;
  }

  window._isHandlingSend = true;

  // ⚡ VERIFICACIONES MÍNIMAS Y RÁPIDAS
  const textarea = domManager.textarea;
  const chatMessages = domManager.chatMessages;

  // Capturar mensaje inmediatamente
  const originalMessage = textarea ? textarea.value.trim() : '';

  // Verificación rápida de archivos
  const temporaryFiles = window.temporaryWelcomeFiles || [];
  const hasAttachments = temporaryFiles.length > 0 ||
    (typeof hasAttachedFiles === 'function' ? hasAttachedFiles() : false);

  // ⚡ VALIDACIÓN MÍNIMA - Si no hay contenido, salir inmediatamente
  if (getState('isProcessing') || (!originalMessage && !hasAttachments)) {
    window._isHandlingSend = false;
    return;
  }

  // 🚀 ACTIVAR LOADING INMEDIATAMENTE (ANTES DE TODO)
  setProcessingState(true);
  toggleUIState(true);

  // 🦫 VARIABLES PARA TRACKING DE NOTIFICACIONES
  let thinkingNotificationId = null;
  let slowOperationNotificationId = null;
  let slowOperationTimeout = null;
  let loadingMessage = null;
  let messageElement = null;
  let newChatId = null;
  const currentChatId = getState('currentChatId');
  let isNewChat = !currentChatId || !validateUUID(currentChatId);

  // ✅ FUNCIÓN DE LIMPIEZA COMPLETA
  const cleanupAllNotifications = () => {
    if (thinkingNotificationId) {
      acadelCerrar(thinkingNotificationId);
      thinkingNotificationId = null;
    }

    if (slowOperationNotificationId) {
      acadelCerrar(slowOperationNotificationId);
      slowOperationNotificationId = null;
    }

    if (slowOperationTimeout) {
      clearTimeout(slowOperationTimeout);
      slowOperationTimeout = null;
    }

    console.log('🧹 Notificaciones de Acadel limpiadas completamente');
  };

  try {
    // 🦫 NOTIFICACIÓN INMEDIATA DE PROCESAMIENTO PARA CONOCIMIENTO GENERAL
    const randomThinking = getRandomThinkingMessage();
    thinkingNotificationId = acadelLoading(
      randomThinking.title,
      randomThinking.message
    );

    // ⚡ DIFERIR VALIDACIONES PESADAS
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Validación de límite de caracteres (diferida)
    const isValidLimit = await ChatUtils.validateCharacterLimit(originalMessage);
    if (!isValidLimit) {
      cleanupAllNotifications();
      setProcessingState(false);
      toggleUIState(false);
      window._isHandlingSend = false;
      return;
    }

    // Detectar contexto
    const isInWelcomeScreen = document.querySelector('.welcome-message, .centered-input-container, .suggestions-container') !== null;

    // Preparar archivos adjuntos (diferido)
    let attachedFiles = [];
    if (temporaryFiles && temporaryFiles.length > 0) {
      attachedFiles = temporaryFiles;
    } else if (hasAttachments && typeof getAttachedFiles === 'function') {
      attachedFiles = getAttachedFiles();
    }

    console.log('📎 Archivos adjuntos detectados:', {
      cantidad: attachedFiles.length,
      tipos: attachedFiles.map(f => f.type),
      nombres: attachedFiles.map(f => f.file.name)
    });

    // ⚡ CREAR UI ELEMENTOS DE FORMA DIFERIDA
    // Crear mensaje del usuario (diferido)
    if (originalMessage || hasAttachments) {
      messageElement = addMessageWithAttachmentsSimplified('user', originalMessage, attachedFiles);
    }

    // ⚡ LIMPIAR PREVIEW CONTAINER INMEDIATAMENTE (SI HAY ATTACHMENTS)
    if (hasAttachments) {
      console.log('📎 Limpiando preview container inmediatamente...');
      ChatUtils.cleanupFileAttachments();
      window.temporaryWelcomeFiles = null;
    }

    // Limpiar textarea (diferido)
    if (textarea) {
      textarea.value = '';

      // Diferir resize
      requestAnimationFrame(() => {
        import('../ui/ui-manager-agente.js').then(module => {
          if (typeof module.handleTextareaResize === 'function') {
            module.handleTextareaResize({ target: textarea });
          }
        }).catch(() => { });
      });
    }

    // Crear loading message (diferido)
    loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);

    // ⚡ DIFERIR OPERACIONES DE SCROLL (optimizadas)
    setTimeout(() => {
      if (messageElement) {
        if (window.innerWidth < 768) {
          // En móviles, usar scroll directo por rendimiento
          setTimeout(() => {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, 50);
        } else {
          // En desktop, usar scrollManager si está disponible
          if (typeof window.scrollManager?.scrollToElement === 'function') {
            window.scrollManager.scrollToElement(messageElement, {
              priority: 'normal',
              reason: 'new-user-message'
            });
          } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }
      }

      if (loadingMessage) {
        if (window.innerWidth < 768) {
          setTimeout(() => {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, 50);
        } else {
          if (typeof window.scrollManager?.scrollToElement === 'function') {
            window.scrollManager.scrollToElement(loadingMessage, {
              priority: 'normal',
              reason: 'loading-message-added'
            });
          } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }
      }
    }, 0);

    // ⚡ DIFERIR LIMPIEZA DE WELCOME (no crítica)
    if (isInWelcomeScreen) {
      setTimeout(() => {
        ChatUtils.cleanupWelcomeElements();
        ChatUtils.restoreInputVisibility();
      }, 100);
    }

    // ⚡ DIFERIR NOTIFICACIONES DE ARCHIVOS (no críticas)
    if (hasAttachments && attachedFiles.length > 0) {
      setTimeout(() => {
        if (attachedFiles.length === 1) {
          const fileName = attachedFiles[0].file.name;
          const fileSize = (attachedFiles[0].file.size / 1024).toFixed(1);
          acadelInfo(
            "📄 Acadel examina tu documento",
            `Analizando "${fileName}" (${fileSize} KB) con sabiduría interdisciplinaria de capibara`
          );
        } else {
          const totalSize = attachedFiles.reduce((sum, file) => sum + file.file.size, 0);
          const totalSizeKB = (totalSize / 1024).toFixed(1);
          acadelInfo(
            "📎 Acadel procesa múltiples documentos",
            `Analizando ${attachedFiles.length} archivos (${totalSizeKB} KB total). ¡Su cerebro erudito está a toda velocidad interdisciplinaria!`
          );
        }
      }, 200);
    }

    // ✅ VERIFICAR TOKENS ANTES DE ENVIAR
    let tokenCheck = { canProceed: true, warningInfo: null };
    if (!isNewChat) {
      tokenCheck = await checkTokensBeforeSend(currentChatId);

      if (!tokenCheck.canProceed) {
        console.log('🚫 [TOKEN LIMIT] Pre-validación falló');

        const errorMessage = tokenCheck.error?.message ||
          'El chat ha alcanzado su límite de capacidad. Inicia un nuevo chat para continuar.';

        replaceWithError(loadingMessage, errorMessage, originalMessage);

        setTimeout(() => {
          if (typeof showTokenLimitNotice === 'function') {
            showTokenLimitNotice(loadingMessage,
              tokenCheck.error?.maxTokens || 'límite del sistema',
              tokenCheck.warningInfo
            );
          }
        }, 300);

        setTimeout(() => {
          acadelError(
            "🧠 ¡Cerebro de capibara saturado!",
            "Este chat llegó a su límite de capacidad. Acadel necesita un nuevo chat para seguir brillando académicamente"
          );
        }, 500);

        // Finalizar
        cleanupAllNotifications();
        setProcessingState(false);
        toggleUIState(false);
        window._isHandlingSend = false;
        return;
      }
    }

// ✅ CONFIGURAR CONTROLADOR DE ABORTO CON VERIFICACIÓN
    const abortController = ChatUtils.setupAbortController();
    
    // ✅ VERIFICACIÓN ADICIONAL PARA PRODUCCIÓN
    if (!abortController || !abortController.signal) {
      console.error('❌ [SEND] Error: AbortController no se creó correctamente');
      throw new Error('No se pudo crear AbortController');
    }

    console.log('🚀 [SEND] AbortController configurado:', {
      hasSignal: !!abortController.signal,
      isAborted: abortController.signal.aborted
    });

    // 🦫 AVISO PARA OPERACIONES LENTAS (GUARDANDO REFERENCIA)
    slowOperationTimeout = setTimeout(() => {
      if (getState('isProcessing')) {
        if (thinkingNotificationId) {
          acadelCerrar(thinkingNotificationId);
          thinkingNotificationId = null;
        }

        const randomPatience = getRandomPatienceMessage();
        slowOperationNotificationId = acadelLoading(
          randomPatience.title,
          randomPatience.message
        );
      }
    }, 8000);

    // 🎬 DETECCIÓN MEJORADA DE URL DE YOUTUBE (MANTENER FUNCIONALIDAD ESPECIAL)
    let isYouTubeProcessing = false;
    const youtubeURLRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    if (youtubeURLRegex.test(originalMessage)) {
      if (isNewChat) {
        isYouTubeProcessing = true;
        console.log('Detectada URL de YouTube en chat nuevo, esperando a tener newChatId');
      } else {
        try {
          const transcriptionResponse = await fetch(`/api/video-transcription/chat/${currentChatId}/has-transcription`);
          const transcriptionData = await transcriptionResponse.json();

          if (transcriptionData.success && transcriptionData.hasTranscription) {
            console.log("Ya existe una transcripción, no se mostrará loader");
          } else {
            await showMediaProcessingLoader(currentChatId);
            startProcessingCheck(currentChatId);
          }
        } catch (error) {
          console.error("Error verificando transcripciones existentes:", error);
          await showMediaProcessingLoader(currentChatId);
          startProcessingCheck(currentChatId);
        }
      }
    }

    // 🔄 CREAR NUEVO CHAT SI ES NECESARIO
    if (isNewChat) {
      const newChat = await createNewChat(originalMessage || "Nueva conversación");
      newChatId = newChat.id;
      setCurrentChat(newChat.id);
      window.tempChatIdForFiles = newChatId;

      // 🎬 PROCESAMIENTO ESPECIAL PARA YOUTUBE EN CHAT NUEVO (MANTENER)
      if (isYouTubeProcessing) {
        await handleYouTubeProcessingInNewChat(originalMessage, newChatId);
      }

      // Diferir limpieza de event listeners (NO archivos)
      setTimeout(() => {
        const usingTemporaryFiles = temporaryFiles && temporaryFiles.length > 0;
        if (!usingTemporaryFiles) {
          import('../utils/file-attachments-agente.js').then(module => {
            if (typeof module.cleanupAllEventListeners === 'function') {
              module.cleanupAllEventListeners();
            }
          });
        }
        restoreDragAndDrop();
      }, 100);
    }

    // 🚀 ENVIAR MENSAJE AL SERVIDOR
    console.log('🚀 Enviando al servidor:', {
      mensaje: originalMessage,
      archivos: attachedFiles.length,
      esMultimodal: hasAttachments
    });

    let data;
    if (hasAttachments) {
      data = await sendMessageWithAttachments(originalMessage, getState('currentChatId'), attachedFiles, abortController.signal);
    } else {
      data = await sendMessage(originalMessage, getState('currentChatId'), abortController.signal);
    }

    // 🧹 LIMPIAR NOTIFICACIONES AL RECIBIR RESPUESTA
    console.log('✅ Respuesta recibida - Limpiando notificaciones...');
    cleanupAllNotifications();

    // Verificar si fue abortado
    if (abortController.signal.aborted) {
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      return;
    }

    // Manejo de errores
    if (data && data.error) {
      console.error('Error en la respuesta:', data.error);
      await handleSendMessageError(data.error, isNewChat, newChatId, currentChatId);
      throw new Error(data.error.message || 'Error en la respuesta del servidor');
    }

    // Renderizar respuesta exitosa
    await renderSuccessfulResponse(data, loadingMessage, isNewChat, newChatId, tokenCheck);

  } catch (error) {
    console.error('Error en handleSendMessage:', error);

    // 🧹 LIMPIAR NOTIFICACIONES EN CASO DE ERROR
    console.log('❌ Error detectado - Limpiando notificaciones...');
    cleanupAllNotifications();

    await handleSendMessageCatch(error, loadingMessage, isNewChat, newChatId, currentChatId, originalMessage);
  } finally {
    // 🧹 LIMPIEZA FINAL GARANTIZADA
    console.log('🔚 Finally block - Limpieza final...');
    cleanupAllNotifications();

    setProcessingState(false);
    toggleUIState(false);
    window.currentAbortController = null;

    // Finalizar
    setTimeout(() => {
      window._isHandlingSend = false;
    }, 100);
  }
}

/**
 * ✅ FUNCIÓN CORREGIDA: Verificar límites de tokens antes de enviar
 */
async function checkTokensBeforeSend(chatId) {
  if (!chatId) return { canProceed: true, warningInfo: null };

  try {
    // ✅ USAR RUTA CORRECTA SIN HARDCODEO
    const response = await fetch(API_ROUTES.checkTokenLimits, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId })
    });

    if (response.ok) {
      const data = await response.json();

      if (data.tokenInfo && data.tokenInfo.current && data.tokenInfo.max) {
        const { current, max } = data.tokenInfo;

        console.log(`📊 [DINÁMICO] Pre-check tokens del backend: ${current}/${max}`);

        return {
          canProceed: true,
          warningInfo: {
            current,
            max,
            warningLevel: data.tokenInfo.warningLevel,
            warningThreshold: data.tokenInfo.warningThreshold,
            warningPercentage: data.tokenInfo.warningPercentage,
            source: 'pre_validation_backend',
            percentage: data.tokenInfo.percentage,
            exactCalculation: true
          }
        };
      }

      console.log(`✅ [DINÁMICO] Pre-check OK sin datos específicos de tokens`);
      return { canProceed: true, warningInfo: null };
    }

    // ✅ MANEJO MEJORADO DE ERRORES HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      console.log(`🚨 [DINÁMICO] Error HTTP ${response.status} en pre-check:`, errorData);

      // ✅ ERROR 429 - DETECTAR TIPO ESPECÍFICO
      if (response.status === 429) {
        // Detectar si es límite de tokens o límite de usuario gratuito
        const isTokenLimit = errorData.error?.code === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED' ||
          errorData.message?.includes('token') ||
          errorData.tokenLimitExceeded;

        const isFreeUserLimit = errorData.error?.code?.includes('TOOL_') ||
          errorData.error?.code?.includes('DAILY_LIMIT') ||
          errorData.error?.code?.includes('HOURLY_LIMIT') ||
          errorData.isFreeUserLimit;

        if (isTokenLimit) {
          console.log(`🚨 [DINÁMICO] Error 429 - Límite de tokens excedido`);
          return {
            canProceed: false,
            error: {
              code: 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
              message: errorData.error?.message || errorData.message || 'El chat ha alcanzado su límite de capacidad',
              maxTokens: errorData.tokenInfo?.max || errorData.maxTokens
            },
            tokenLimitExceeded: true,
            warningInfo: errorData.tokenInfo || null
          };
        }

        if (isFreeUserLimit) {
          console.log(`🚨 [DINÁMICO] Error 429 - Límite de usuario gratuito`);
          return {
            canProceed: false,
            error: {
              code: errorData.error?.code || 'TOOL_ACCESS.DAILY_LIMIT_REACHED',
              message: errorData.error?.message || errorData.message || 'Has alcanzado tu límite como usuario gratuito',
              limitType: errorData.limitType || 'daily',
              toolSlug: errorData.toolSlug || 'general'
            },
            isFreeUserLimit: true,
            limitInfo: errorData.limitInfo || errorData.limits || {},
            toolLimits: errorData.toolLimits || {}
          };
        }
      }

      // ✅ ERROR 400 con código específico
      if (response.status === 400 && errorData.error) {
        const errorCode = errorData.error.code;

        if (errorCode === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED' ||
          errorCode === 'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED') {

          console.log(`🚨 [DINÁMICO] Error 400 con código de tokens: ${errorCode}`);

          return {
            canProceed: false,
            error: {
              code: errorCode,
              message: errorData.error.message || 'El chat ha alcanzado su límite de capacidad',
              maxTokens: errorData.maxTokens || errorData.tokenInfo?.max
            },
            tokenLimitExceeded: true,
            warningInfo: errorData.tokenInfo || null
          };
        }

        if (errorCode?.includes('TOOL_') || errorCode?.includes('LIMIT_REACHED')) {
          console.log(`🚨 [DINÁMICO] Error 400 con código de límite de usuario: ${errorCode}`);

          return {
            canProceed: false,
            error: {
              code: errorCode,
              message: errorData.error.message || 'Has alcanzado tu límite como usuario gratuito',
              limitType: errorCode.includes('DAILY') ? 'daily' : 'hourly',
              toolSlug: errorData.toolSlug || 'general'
            },
            isFreeUserLimit: true,
            limitInfo: errorData.limits || {},
            toolLimits: errorData.toolLimits || {}
          };
        }
      }

      console.log(`⚠️ [DINÁMICO] Error HTTP no relacionado con límites: ${response.status}`);
      return { canProceed: true, warningInfo: null };
    }

    return { canProceed: true, warningInfo: null };

  } catch (error) {
    console.warn('Error al verificar tokens antes de enviar:', error);

    // ✅ VERIFICAR SI EL ERROR CONTIENE INFORMACIÓN DE LÍMITES
    if (error.message && (
      error.message.includes('TOKEN_LIMITS') ||
      error.message.includes('token limit') ||
      error.message.includes('límite')
    )) {
      return {
        canProceed: false,
        error: {
          code: error.code || 'TOKEN_LIMITS.UNKNOWN',
          message: error.message || 'Error de límite de tokens',
          maxTokens: error.maxTokens
        },
        tokenLimitExceeded: true,
        warningInfo: error.tokenInfo || null
      };
    }

    return { canProceed: true, warningInfo: null };
  }
}
/**
 * Maneja errores en el envío de mensajes
 */
async function handleSendMessageError(error, isNewChat, newChatId, currentChatId) {
  if (isNewChat && newChatId) {
    console.log('❌ Error en nuevo chat - marcando como problemático y eliminando:', newChatId);
    markChatAsProblem(newChatId);
    await handleNewChatError(newChatId);
  } else if (currentChatId) {
    console.log('❌ Error en chat existente - marcando como problemático:', currentChatId);
    markChatAsProblem(currentChatId);

    try {
      await deleteChat(currentChatId);
    } catch (deleteError) {
      console.warn(`Error al eliminar chat con error:`, deleteError);
    }

    const chatItem = document.querySelector(`[data-chat-id="${currentChatId}"]`);
    if (chatItem) {
      chatItem.style.opacity = '0.5';
      chatItem.style.transition = 'opacity 0.2s ease-out';
      setTimeout(() => chatItem.remove(), 200);
    }

    setTimeout(async () => {
      try {
        const { loadChatHistory } = await import('../api/chat-agente.js');
        const { renderChatHistory } = await import('../ui/sidebar-agente.js');
        const updatedChats = await loadChatHistory();
        renderChatHistory(updatedChats);
      } catch (sidebarError) {
        console.warn('Error al actualizar sidebar después de error:', sidebarError);
      }
    }, 300);
  }
}

/**
 * ✅ renderSuccessfulResponse COMPLETAMENTE CORREGIDA
 * REEMPLAZAR TODA la función renderSuccessfulResponse
 */
async function renderSuccessfulResponse(data, loadingMessage, isNewChat, newChatId, tokenCheck = null) {
  await new Promise(resolve => requestAnimationFrame(resolve));

  if (loadingMessage?.parentNode) {
    if (typeof window.processAndRenderResponse === 'function') {
      window.processAndRenderResponse(data, loadingMessage);
    } else {
      const { type, content } = processServerResponse(data);
      replaceLoadingMessage(loadingMessage, content, type);

      // ✅ SISTEMA SIMPLIFICADO: Detección inteligente de warnings
      console.group('🎯 [FRONTEND] Procesando warnings del backend');

      let shouldShowTokenWarning = false;
      let shouldShowFreeUserWarning = false;
      let tokenInfo = null;
      let freeUserLimitInfo = null;

      // ✅ 1. DETECTAR FLAGS DIRECTOS DEL BACKEND (más confiable)
      if (data._hasTokenWarning || data._shouldShowTokenWarning || data._warningPercentage) {
        shouldShowTokenWarning = true;
        tokenInfo = data.tokenInfo || data.tokenWarning || tokenCheck?.warningInfo;
        console.log('🚨 [FRONTEND] Token warning detectado por flags del backend');
      }

      // ✅ 2. DETECTAR WARNINGS DE TOKENS EN ARRAY
      if (data.warnings && Array.isArray(data.warnings)) {
        const tokenWarnings = data.warnings.filter(w =>
          w.type && w.type.includes('token') && w.level === 'high'
        );

        if (tokenWarnings.length > 0) {
          shouldShowTokenWarning = true;
          tokenInfo = tokenWarnings[0].tokenInfo || data.tokenInfo || tokenCheck?.warningInfo;
          console.log('🚨 [FRONTEND] Token warning detectado en warnings array');
        }
      }

      // ✅ 3. DETECTAR LÍMITES DE HERRAMIENTAS ESPECÍFICAS
      if (data.toolLimits && data.toolLimits.type === 'free_user_limits') {
        const { daily, hourly, warningThresholds } = data.toolLimits;

        let shouldWarn = false;
        let warningType = null;

        // Usar thresholds dinámicos del backend
        if (warningThresholds) {
          if (daily && warningThresholds.daily && daily.used >= warningThresholds.daily) {
            shouldWarn = true;
            warningType = 'daily';
          }
          if (hourly && warningThresholds.hourly && hourly.used >= warningThresholds.hourly) {
            shouldWarn = true;
            warningType = 'hourly';
          }
        } else {
          // Fallback: 80% de los límites reales
          const dailyWarning = daily?.limit ? Math.round(daily.limit * 0.8) : null;
          const hourlyWarning = hourly?.limit ? Math.round(hourly.limit * 0.8) : null;

          if (daily && dailyWarning && daily.used >= dailyWarning) {
            shouldWarn = true;
            warningType = 'daily';
          }
          if (hourly && hourlyWarning && hourly.used >= hourlyWarning) {
            shouldWarn = true;
            warningType = 'hourly';
          }
        }

        if (shouldWarn) {
          shouldShowFreeUserWarning = true;
          freeUserLimitInfo = {
            toolSlug: data.toolLimits.toolSlug,
            limitType: warningType,
            used: warningType === 'daily' ? daily.used : hourly.used,
            limit: warningType === 'daily' ? daily.limit : hourly.limit,
            remaining: warningType === 'daily' ? daily.remaining : hourly.remaining,
            resetTime: warningType === 'daily' ? daily.resetTime : hourly.resetTime,
            percentage: warningType === 'daily' ? daily.percentage : hourly.percentage,
            source: 'backend_dynamic_response'
          };
          console.log('⚠️ [FRONTEND] Free user limit warning detectado');
        }
      }

      // ✅ 4. MOSTRAR AVISOS SEGÚN PRIORIDAD
      if (shouldShowFreeUserWarning && freeUserLimitInfo) {
        setTimeout(() => {
          console.log('🎯 [FRONTEND] Mostrando aviso de límite de usuario gratuito');

          if (typeof showFreeUserLimitNotice === 'function') {
            showFreeUserLimitNotice(loadingMessage, freeUserLimitInfo.limitType, freeUserLimitInfo);
          } else if (typeof window.AcadelChatNotices?.showFreeUserLimitNotice === 'function') {
            window.AcadelChatNotices.showFreeUserLimitNotice(loadingMessage, freeUserLimitInfo.limitType, freeUserLimitInfo);
          } else {
            console.warn('⚠️ [FRONTEND] showFreeUserLimitNotice no disponible');
          }
        }, 100);
      }
      else if (shouldShowTokenWarning && tokenInfo?.current && tokenInfo?.max) {
        setTimeout(() => {
          console.log('🎯 [FRONTEND] Mostrando aviso de token');

          if (typeof window.AcadelChatNotices?.showSmartTokenNotice === 'function') {
            window.AcadelChatNotices.showSmartTokenNotice(
              loadingMessage,
              tokenInfo.current,
              tokenInfo.max,
              tokenInfo.percentage || Math.round((tokenInfo.current / tokenInfo.max) * 100),
              tokenInfo
            );
          } else if (typeof showSmartTokenNotice === 'function') {
            showSmartTokenNotice(
              loadingMessage,
              tokenInfo.current,
              tokenInfo.max,
              tokenInfo.percentage || Math.round((tokenInfo.current / tokenInfo.max) * 100),
              tokenInfo
            );
          } else {
            console.warn('⚠️ [FRONTEND] showSmartTokenNotice no disponible');
          }
        }, 100);
      }

      console.groupEnd();

      // ✅ RESTO DE LA LÓGICA EXISTENTE (mantener sin cambios)
      const chatId = data.chatId || getState('currentChatId');
      if (chatId) {
        setTimeout(async () => {
          try {
            const { loadChatMessages } = await import('../api/chat-agente.js');
            const messages = await loadChatMessages(chatId);
            if (!Array.isArray(messages) || messages.length < 2) return;

            updateMessageIds(messages);
            initializeResponseInteraction();
          } catch (error) {
            console.warn("Error al actualizar IDs:", error);
          }
        }, 300);
      }

      setTimeout(() => {
        import('../utils/response-interaction-agente.js').then(module => {
          if (typeof module.initResponseInteraction === 'function') {
            const interaction = module.initResponseInteraction();
            const lastAiMessage = document.querySelector('.chat-messages .ai-message:last-child');
            if (lastAiMessage && !lastAiMessage.querySelector('.response-actions')) {
              interaction.addInteractionButtons(lastAiMessage);
            }
          }
        }).catch(e => console.warn('Error al iniciar interacción:', e));
      }, 100);
    }

    if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
      const chatMessages = domManager.chatMessages;
      const userMessages = chatMessages.querySelectorAll('.user-message');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        processServerResponseDocuments(data, lastUserMessage);
      }
    }

    // ✅ ACTUALIZAR UI PARA NUEVO CHAT O EXISTENTE
    if (isNewChat && newChatId) {
      await handleNewChatSuccess(newChatId);
    } else {
      updateExistingChatPosition();
    }

    // ✅ VERIFICAR PANEL DE YOUTUBE DESPUÉS DE ENVIAR MENSAJE
    try {
      import('../components/youtube-panel.js').then(module => {
        if (module.youtubePanel && typeof module.youtubePanel.checkForVideo === 'function') {
          module.youtubePanel.checkForVideo();

          setTimeout(() => {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages && window.innerWidth < 768) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, 350);
        }
      }).catch(e => {
        console.warn('No se pudo importar módulo de YouTube:', e);
      });
    } catch (e) {
      console.warn('Error al verificar panel de YouTube:', e);
    }
  }
}

/**
 * Actualiza IDs de mensajes del servidor
 */
function updateMessageIds(messages) {
  const userMessages = document.querySelectorAll('.chat-messages .user-message');
  const aiMessages = document.querySelectorAll('.chat-messages .ai-message');
  const lastUserMessage = userMessages[userMessages.length - 1];
  const lastAIMessage = aiMessages[aiMessages.length - 1];

  const userMessagesData = messages.filter(m => m.role === 'user');
  if (userMessagesData.length > 0 && lastUserMessage) {
    const id = userMessagesData[userMessagesData.length - 1].id;
    lastUserMessage.dataset.serverId = id;
  }

  const aiMessagesData = messages.filter(m => m.role === 'assistant' || m.role === 'ai');
  if (aiMessagesData.length > 0 && lastAIMessage) {
    const id = aiMessagesData[aiMessagesData.length - 1].id;
    lastAIMessage.dataset.serverId = id;
  }
}

/**
 * Inicializa interacción de respuesta
 */
async function initializeResponseInteraction() {
  try {
    const { initResponseInteraction } = await import('../utils/response-interaction-agente.js');
    if (initResponseInteraction) {
      initResponseInteraction().processExistingMessages(true);
    }
  } catch (error) {
    console.warn("Error al inicializar interacción:", error);
  }
}

/**
 * Maneja éxito de nuevo chat
 */
async function handleNewChatSuccess(newChatId) {
  // Limpiar problemas potenciales
  import('../utils/chat-error-handler-agente.js').then(module => {
    // código existente...
  }).catch(e => console.warn('Error al limpiar problemas:', e));

  // Actualizar URL y cargar historial
  history.pushState({}, '', URL_CONFIG.chatPath(newChatId));

  // ⭐ NUEVO: Limpiar ID temporal después del éxito
  setTimeout(() => {
    if (window.tempChatIdForFiles === newChatId) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado después de establecer URL: ${newChatId}`);
    }
  }, 1000);

  try {
    const updatedChats = await loadChatHistory();
    renderChatHistory(updatedChats);
  } catch (error) {
    console.error('Error al cargar historial de chats:', error);
  }

  updateHeaderForChat(newChatId);
}

/**
 * Actualiza posición de chat existente
 */
function updateExistingChatPosition() {
  try {
    if (typeof updateChatPosition === 'function') {
      updateChatPosition(getState('currentChatId'));
    } else {
      import('../api/chat-agente.js').then(module => {
        if (typeof module.updateChatPosition === 'function') {
          module.updateChatPosition(getState('currentChatId'));
        }
      }).catch(error => {
        console.warn('No se pudo importar updateChatPosition:', error);
      });
    }
  } catch (error) {
    console.warn('Error al actualizar posición del chat:', error);
  }
}

/**
 * ✅ FUNCIÓN MEJORADA: handleSendMessageCatch + FREE USER LIMITS
 * REEMPLAZAR la función handleSendMessageCatch existente con esta versión
 */
async function handleSendMessageCatch(error, loadingMessage, isNewChat, newChatId, currentChatId, originalMessage) {
  console.group('🚨 HANDLE SEND MESSAGE CATCH');
  console.log('Error details:', {
    name: error.name,
    message: error.message,
    isTokenLimit: error.isTokenLimit,
    isPreValidationLimit: error.isPreValidationLimit,
    isFreeUserLimit: error.isFreeUserLimit,
    status: error.status,
    code: error.code || error.error?.code,
    isNewChat,
    hasLoadingMessage: !!loadingMessage
  });
  console.groupEnd();

  // 🦫 CASO 1: ERROR DE CANCELACIÓN
if (error.name === 'AbortError') {
  console.log("🚫 Error de cancelación detectado");

  // 🔥 SOLO MOSTRAR NOTIFICACIÓN SI NO SE HA MOSTRADO YA
  if (!window._cancelNotificationAlreadyShown) {
    acadelInfo(
      "🛑 ¡Operación cancelada!",
      "Acadel detuvo todo como pediste. No hay problema, a veces cambiamos de opinión"
    );
  }

    if (isNewChat && newChatId) {
      try {
        await deleteChat(newChatId);
        markChatAsProblem(newChatId);
      } catch (deleteError) {
        console.error('Error al eliminar chat cancelado:', deleteError);
        markChatAsProblem(newChatId);
      }
      setTimeout(() => handleNewChat(), 2500);
    }

    if (isNewChat) {
      setTimeout(() => {
        if (window.isCancellationInProgress) {
          const fixedSpace = domManager.fixedSpace;
          if (fixedSpace) {
            fixedSpace.style.opacity = '0';
            fixedSpace.style.display = 'none';
            fixedSpace.style.pointerEvents = 'none';
            fixedSpace.style.overflow = 'hidden';
            updateHeaderSubtitle(null);
            void fixedSpace.offsetHeight;
          }

          clearChatMessages();
          setCurrentChat(null);
          history.pushState({}, '', URL_CONFIG.basePath);

          setTimeout(() => {
            showWelcomeMessage();
          }, 150);
        }
      }, 1500);
    }

    return;
  }

  // 🦫 CASO ESPECIAL: ERROR DE YOUTUBE EN CHAT NUEVO
  if (error.isYouTubeNewChatError ||
    (error.error && error.error.isYouTubeNewChatError)) {
    console.log('🎬 Error de YouTube en chat nuevo detectado:', error);

    if (loadingMessage) {
      const userMessage = error.userMessage ||
        error.error?.userMessage ||
        'Error procesando video de YouTube';

      replaceWithError(loadingMessage, userMessage, originalMessage);
    }

    // ✅ ELIMINAR CHAT NUEVO Y REDIRIGIR
    if (isNewChat && newChatId) {
      console.log('🎬 Eliminando chat nuevo con error de YouTube:', newChatId);
      await handleNewChatError(newChatId);

      // ✅ NOTIFICACIÓN ESPECÍFICA PARA YOUTUBE
      setTimeout(() => {
        acadelError(
          "🎬 ¡YouTube está siendo difícil!",
          "Acadel no pudo procesar ese video. Intenta con otro enlace o súbeme un archivo de audio directamente"
        );
      }, 500);
    }
    return;
  }

  // ✅ FUNCIÓN AUXILIAR MEJORADA: Detectar errores de límites de usuario gratuito
  const isFreeUserLimitError = (error) => {
    // Verificaciones directas
    if (error.isFreeUserLimit) return true;

    // Verificaciones en códigos de error
    const errorCode = error.code || error.error?.code || '';
    const freeUserErrorCodes = [
      'TOOL_ACCESS.DAILY_LIMIT_REACHED',
      'TOOL_ACCESS.HOURLY_LIMIT_REACHED',
      'TOOL_PDF_DAILY_LIMIT_REACHED',
      'TOOL_PDF_HOURLY_LIMIT_REACHED',
      'TOOL_AGENT_DAILY_LIMIT_REACHED',
      'TOOL_AGENT_HOURLY_LIMIT_REACHED'
    ];

    if (freeUserErrorCodes.some(code => errorCode.includes(code))) return true;

    // Verificaciones en status 429 sin ser tokens
    if (error.status === 429 && !isTokenError(error)) return true;

    // Verificaciones en mensajes
    const errorMessage = error.message || error.error?.message || '';
    const freeUserKeywords = [
      'límite diario',
      'límite por hora',
      'usuario gratuito',
      'free user limit',
      'daily limit',
      'hourly limit',
      'herramienta'
    ];

    return freeUserKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // ✅ FUNCIÓN AUXILIAR MEJORADA: Detectar errores de tokens
  const isTokenError = (error) => {
    if (error.isTokenLimit || error.isPreValidationLimit) return true;

    const errorCode = error.code || error.error?.code || '';
    const tokenErrorCodes = [
      'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
      'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED',
      'TOKEN_LIMITS.WARNING_THRESHOLD'
    ];

    if (tokenErrorCodes.includes(errorCode)) return true;

    if (error.status === 429 && !isFreeUserLimitError(error)) return true;

    const errorMessage = error.message || error.error?.message || '';
    const tokenKeywords = [
      'TOKEN_LIMITS',
      'límite de tokens',
      'token limit',
      'capacidad',
      'chat limit',
      'pre-validación'
    ];

    return tokenKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // ✅ CASO 2: ERRORES DE LÍMITE DE USUARIO GRATUITO (PRIORIDAD ALTA)
  if (isFreeUserLimitError(error)) {
    console.log('💰 Error de límite de usuario gratuito detectado:', error);

    if (loadingMessage) {
      const userFriendlyMessage = error.message ||
        error.error?.message ||
        'Has alcanzado tu límite como usuario gratuito';

      replaceWithError(loadingMessage, userFriendlyMessage, originalMessage);

      // ✅ MOSTRAR AVISO ESPECÍFICO SIN HARDCODEO
      setTimeout(() => {
        const limitType = error.limitType ||
          (error.error?.code?.includes('DAILY') ? 'daily' : 'hourly');

        const limitInfo = {
          used: error.limitInfo?.used || error.limits?.daily?.used || error.limits?.hourly?.used,
          limit: error.limitInfo?.limit || error.limits?.daily?.limit || error.limits?.hourly?.limit,
          remaining: error.limitInfo?.remaining || error.limits?.daily?.remaining || error.limits?.hourly?.remaining,
          resetTime: error.limitInfo?.resetTime || error.limits?.daily?.resetTime || error.limits?.hourly?.resetTime,
          toolName: error.toolSlug || 'agente',
          percentage: error.limitInfo?.percentage,
          source: 'backend_error_response'
        };

        if (typeof showFreeUserLimitNotice === 'function') {
          showFreeUserLimitNotice(loadingMessage, limitType, limitInfo);
        } else if (typeof window.AcadelChatNotices?.showFreeUserLimitNotice === 'function') {
          window.AcadelChatNotices.showFreeUserLimitNotice(loadingMessage, limitType, limitInfo);
        } else {
          console.warn('⚠️ showFreeUserLimitNotice no disponible');
        }
      }, 300);
    }

    // ✅ NOTIFICACIÓN ESPECÍFICA SEGÚN TIPO DE LÍMITE
    setTimeout(() => {
      const limitType = error.limitType ||
        (error.error?.code?.includes('DAILY') ? 'daily' : 'hourly');

      const toolName = error.toolSlug || 'herramienta';
      const used = error.limitInfo?.used || 'todos';
      const limit = error.limitInfo?.limit || '';

      let notificationTitle = "💎 ¡Límite de usuario gratuito alcanzado!";
      let notificationMessage = "Acadel ha procesado todos los mensajes incluidos en tu plan gratuito";

      if (limitType === 'daily') {
        notificationTitle = "📅 ¡Límite diario alcanzado!";
        if (limit) {
          notificationMessage = `Has usado ${used} de tus ${limit} mensajes diarios para ${toolName}. Acadel se resetea mañana o puedes hacer upgrade`;
        } else {
          notificationMessage = `Has usado todos tus mensajes diarios para ${toolName}. Acadel se resetea mañana o puedes hacer upgrade`;
        }
      } else if (limitType === 'hourly') {
        notificationTitle = "⏰ ¡Límite por hora alcanzado!";
        if (limit) {
          notificationMessage = `Has usado ${used} de tus ${limit} mensajes por hora para ${toolName}. Acadel se resetea en una hora o puedes hacer upgrade`;
        } else {
          notificationMessage = `Has usado todos tus mensajes por hora para ${toolName}. Acadel se resetea en una hora o puedes hacer upgrade`;
        }
      }

      acadelWarning(notificationTitle, notificationMessage);
    }, 500);

    if (isNewChat && newChatId) {
      console.log('💰 Error de límite gratuito en nuevo chat - eliminando chat:', newChatId);
      await handleNewChatError(newChatId);
    }
    return;
  }

  // ✅ CASO 3: ERRORES DE TOKENS (DESPUÉS DE LÍMITES DE USUARIO)
  if (isTokenError(error)) {
    console.log('🚫 Error de tokens detectado:', error);

    const tokenInfo = {
      maxTokens: error.maxTokens ||
        error.error?.maxTokens ||
        error.tokenInfo?.max ||
        'límite del sistema',
      tokenInfo: error.tokenInfo ||
        error.error?.tokenInfo ||
        null,
      errorMessage: error.message ||
        error.error?.message ||
        'El chat ha alcanzado su límite de capacidad'
    };

    if (loadingMessage) {
      let userFriendlyMessage = tokenInfo.errorMessage;

      if (error.isPreValidationLimit) {
        userFriendlyMessage = 'La respuesta estimada excedería el límite de la conversación. Haz una pregunta más específica o inicia un nuevo chat.';
      } else if (error.status === 429) {
        userFriendlyMessage = 'El chat alcanzó su límite de capacidad. Inicia un nuevo chat para continuar.';
      }

      replaceWithError(loadingMessage, userFriendlyMessage, originalMessage);

      // ✅ MOSTRAR AVISO ESPECÍFICO DE TOKENS
      setTimeout(() => {
        if (typeof showTokenLimitNotice === 'function') {
          showTokenLimitNotice(loadingMessage, tokenInfo.maxTokens, tokenInfo.tokenInfo);
        } else if (typeof window.AcadelChatNotices?.showTokenLimitNotice === 'function') {
          window.AcadelChatNotices.showTokenLimitNotice(loadingMessage, tokenInfo.maxTokens, tokenInfo.tokenInfo);
        }
      }, 300);
    }

    // ✅ NOTIFICACIÓN ESPECÍFICA SEGÚN TIPO DE ERROR DE TOKEN
    const isPreValidation = error.isPreValidationLimit;
    const notificationTitle = isPreValidation ?
      "🧠 ¡Acadel prevé sobrecarga!" :
      "🧠 ¡Cerebro de capibara saturado!";

    const notificationMessage = isPreValidation ?
      "Acadel calculó que la respuesta sería demasiado larga. Haz una pregunta más específica para que pueda ayudarte mejor" :
      "Este chat llegó a su límite de capacidad. Acadel necesita un nuevo chat para seguir brillando académicamente";

    setTimeout(() => {
      if (isPreValidation) {
        acadelWarning(notificationTitle, notificationMessage);
      } else {
        acadelError(notificationTitle, notificationMessage);
      }
    }, 500);

    // ✅ VERIFICAR SI ES NUEVO CHAT PARA ELIMINARLO
    if (isNewChat && newChatId) {
      console.log('🧠 Error de tokens en nuevo chat - eliminando chat:', newChatId);
      await handleNewChatError(newChatId);
    }
    return;
  }

  // 🦫 CASO 4: ERRORES DE RED/CONEXIÓN
  if (error.message && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('conexión') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('ERR_NETWORK') ||
    error.message.includes('ERR_INTERNET_DISCONNECTED')
  )) {
    console.log('🌐 Error de conexión de red detectado:', error);

    if (loadingMessage) {
      replaceWithError(loadingMessage,
        "Acadel no puede conectarse al servidor 🌐",
        originalMessage
      );
    }

    acadelError(
      "🌐 ¡Problemas de conexión!",
      "Parece que tu internet está jugando al escondite. Acadel sugiere revisar tu conexión y volver a intentar"
    );

    return;
  }

  // 🦫 CASO 5: ERRORES DE TIMEOUT
  if (error.message && (
    error.message.includes('timeout') ||
    error.message.includes('tiempo') ||
    error.message.includes('Timeout') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('tiempo de espera')
  )) {
    console.log('⏰ Error de timeout detectado:', error);

    if (loadingMessage) {
      replaceWithError(loadingMessage,
        "El servidor está tardando mucho ⏰",
        originalMessage
      );
    }

    acadelError(
      "⏰ ¡Tiempo agotado!",
      "Acadel esperó pacientemente, pero el servidor está más lento que un capibara en lunes. Intenta de nuevo"
    );

    return;
  }

  // 🦫 CASO 6: ERRORES DE SERVIDOR
  if (error.message && (
    error.message.includes('servidor') ||
    error.message.includes('server') ||
    error.message.includes('500') ||
    error.message.includes('502') ||
    error.message.includes('503') ||
    error.message.includes('504') ||
    error.message.includes('Internal Server Error') ||
    error.message.includes('Service Unavailable')
  )) {
    console.log('🔧 Error de servidor detectado:', error);

    if (loadingMessage) {
      replaceWithError(loadingMessage,
        "Problemas en el servidor 🔧",
        originalMessage
      );
    }

    acadelError(
      "🔧 ¡El servidor tiene problemas!",
      "Acadel dice que los servidores también necesitan descanso. Espera un momento y vuelve a intentar"
    );

    return;
  }

  // 🦫 CASO 7: ERRORES DE AUTENTICACIÓN
  if (error.message && (
    error.message.includes('401') ||
    error.message.includes('403') ||
    error.message.includes('no autorizado') ||
    error.message.includes('unauthorized') ||
    error.message.includes('forbidden') ||
    error.message.includes('acceso') ||
    error.message.includes('autenticación')
  )) {
    console.log('🔐 Error de autenticación detectado:', error);

    if (loadingMessage) {
      replaceWithError(loadingMessage,
        "Problema de acceso 🔐",
        originalMessage
      );
    }

    acadelError(
      "🔐 ¡Problema de acceso!",
      "Acadel no puede verificar tu identidad. Parece que necesitas iniciar sesión de nuevo"
    );

    return;
  }

  // 🦫 CASO 8: ERRORES DE ARCHIVO/UPLOAD
  if (error.message && (
    error.message.includes('archivo') ||
    error.message.includes('file') ||
    error.message.includes('upload') ||
    error.message.includes('adjunto') ||
    error.message.includes('attachment')
  )) {
    console.log('📎 Error de archivo detectado:', error);

    if (loadingMessage) {
      replaceWithError(loadingMessage,
        "Problema con el archivo 📎",
        originalMessage
      );
    }

    acadelError(
      "📎 ¡Error con el archivo!",
      "Acadel tuvo problemas procesando tu documento. Tal vez está corrupto o es muy pesado para su cerebro de capibara"
    );

    return;
  }

  // 🦫 CASO 9: ERROR GENERAL (FALLBACK)
  console.log('❌ Error general detectado:', error);

  if (loadingMessage) {
    replaceWithError(loadingMessage,
      error.message || "Algo inesperado ocurrió 😅",
      originalMessage
    );
  }

  acadelError(
    "😅 ¡Ups! Algo inesperado pasó",
    "Acadel encontró un problema que no estaba en sus libros. Inténtalo de nuevo en un momento"
  );

  // 🦫 MANEJO DE CHAT PROBLEMÁTICO SOLO PARA ERRORES GENERALES
  if (isNewChat && newChatId) {
    await handleNewChatError(newChatId);
  } else if (currentChatId) {
    if (error.message && (
      error.message.includes('no encontrado') ||
      error.message.includes('no autorizado') ||
      error.message.includes('timeout') ||
      error.message.includes('acceso')
    )) {
      markChatAsProblem(currentChatId);
    }
  }
}

/**
 * Maneja error en nuevo chat
 */
async function handleNewChatError(newChatId) {
  markChatAsProblem(newChatId);
  setCurrentChat(null);
  history.pushState({}, '', URL_CONFIG.basePath);

  // ⭐ NUEVO: Limpiar ID temporal en caso de error
  if (window.tempChatIdForFiles === newChatId) {
    window.tempChatIdForFiles = null;
    console.log(`🧹 Chat temporal limpiado por error: ${newChatId}`);
  }

  try {
    await deleteChat(newChatId);
    console.log('✅ Chat nuevo eliminado exitosamente del servidor:', newChatId);
  } catch (deleteError) {
    console.warn('Error al eliminar chat del servidor:', deleteError);
  }

  const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
  if (chatItem) {
    chatItem.style.opacity = '0.5';
    chatItem.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => chatItem.remove(), 200);
  }

  import('../ui/sidebar-agente.js').then(module => {
    if (typeof module.removeChatFromSidebar === 'function') {
      module.removeChatFromSidebar(newChatId);
    }

    import('../api/chat-agente.js').then(async chatModule => {
      try {
        const updatedChats = await chatModule.loadChatHistory();
        if (typeof module.renderChatHistory === 'function') {
          module.renderChatHistory(updatedChats);
        }
      } catch (e) {
        console.warn('Error al actualizar historial de chats:', e);
      }
    }).catch(e => console.warn('Error al importar módulo de chat:', e));
  }).catch(e => console.warn('Error al importar sidebar:', e));

  setTimeout(() => handleNewChat(), 2500);
}

// 4. AGREGAR: Función auxiliar para verificar estado de cancelación
function isInCancellationState() {
  return window.isCancellationInProgress === true;
}

/**
 * Finaliza el proceso de envío de mensaje
 */
async function finalizeSendMessage(textarea) {
  try {
    // 🔧 VERIFICAR FLAG DE CANCELACIÓN PRIMERO
    if (window.isCancellationInProgress) {
      console.log("🚫 NO restaurando interactividad - Cancelación en progreso");
      return; // SALIR INMEDIATAMENTE SIN RESTAURAR NADA
    }

    // Restaurar interactividad completa SOLO si no hay cancelación
    if (textarea) {
      textarea.removeAttribute('disabled');
      textarea.removeAttribute('readonly');
      textarea.style.pointerEvents = 'auto';
      textarea.style.visibility = 'visible';
      textarea.style.opacity = '1';
      setTimeout(() => {
        textarea.focus();
        textarea.blur();
        textarea.focus();
      }, 50);
    }

    // Restaurar botones SOLO si no hay cancelación
    const sendButton = domManager.sendButton;
    const mathButton = domManager.mathButton;
    const attachButton = domManager.attachButton;

    [sendButton, mathButton, attachButton].forEach(button => {
      if (button) {
        button.style.pointerEvents = 'auto';
        button.disabled = false;
      }
    });

    void document.documentElement.offsetHeight;
  } catch (e) {
    console.warn('Error al restaurar interactividad completa:', e);
  }

  // Finalización estándar
  if (textarea && !window.isCancellationInProgress) { // AGREGAR verificación
    textarea.value = '';
  }
  setProcessingState(false);

  // 🔧 VERIFICACIÓN MEJORADA: Solo restaurar UI si no hay cancelación
  if (!window.isCancellationInProgress) {
    toggleUIState(false);
  } else {
    console.log("🚫 NO restaurando UI en finalizeSendMessage - Cancelación en progreso");
  }

  // ⭐ NUEVO: Limpieza de seguridad para ID temporal
  if (window.tempChatIdForFiles) {
    setTimeout(() => {
      if (window.tempChatIdForFiles) {
        console.log(`🧹 Limpieza de seguridad: ID temporal ${window.tempChatIdForFiles}`);
        window.tempChatIdForFiles = null;
      }
    }, 2000);
  }

  // Limpiar controlador de aborto
  window.currentAbortController = null;

  import('../ui/ui-manager-agente.js').then(module => {
    if (typeof module.setCurrentFetchController === 'function') {
      module.setCurrentFetchController(null);
    }
  }).catch(err => console.warn('Error al limpiar controlador:', err));

  // Limpiar caché de elementos DOM para obtener referencias frescas
  if (typeof clearDomCache === 'function') {
    clearDomCache(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);
  }

  domManager.invalidate(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);
}

/**
 * Función optimizada para crear un nuevo chat
 */
export function handleNewChat() {

  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }
  // Verificar si ya estamos en la pantalla de bienvenida

  // 🔽 NUEVO: Cerrar dropdown del header
  closeHeaderDropdown();

  setTimeout(() => {
    acadelInfo(
      "🆕 ¡Nueva conversación iniciada!",
      "Acadel está emocionado de ayudarte con un tema completamente nuevo"
    );
  }, 500);


  const welcomeMessageExists = document.querySelector('.welcome-message') !== null;
  const currentChatId = getState('currentChatId');

  if (!currentChatId && welcomeMessageExists) {
    return;
  }

  // Evitar concurrencia
  if (window.isHandlingNewChat) return;
  window.isHandlingNewChat = true;

  try {
    // Cerrar paneles matemáticos
    ChatUtils.closeMathPanels();

    // Cerrar panel de previsualización si está abierto
    const previewPanel = document.querySelector('#preview-panel');
    if (previewPanel && previewPanel.classList.contains('open')) {
      try {
        import('../components/preview-panel-agente.js').then(module => {
          if (module && typeof module.closePreviewPanel === 'function') {
            module.closePreviewPanel();
          }
        }).catch(e => {
          console.warn('No se pudo importar closePreviewPanel:', e);
          previewPanel.classList.remove('open');
          document.body.classList.remove('preview-panel-active');
        });
      } catch (e) {
        previewPanel.classList.remove('open');
        document.body.classList.remove('preview-panel-active');
      }
    }

    // NUEVO: Cerrar panel de YouTube y resetear estado de audio
    try {
      // Resetear panel de YouTube
      if (window.youtubePanel) {
        // Resetear datos del panel
        window.youtubePanel.videoData = null;
        window.youtubePanel.audioData = null;
        window.youtubePanel.currentMode = null;
        window.youtubePanel.timestamps = [];
        window.youtubePanel.searchResults = [];
        window.youtubePanel.currentSearchIndex = -1;
        window.youtubePanel.currentlyHighlightedSegment = null;

        // Cerrar el panel si está visible
        if (window.youtubePanel.isVisible && typeof window.youtubePanel.togglePanel === 'function') {
          window.youtubePanel.togglePanel();
        }

        console.log("Panel de transcripción reseteado para nuevo chat");
      }

      // Cerrar menú de audio si está abierto
      if (window.audioPanel) {
        const audioMenu = document.querySelector('.audio-menu');
        if (audioMenu && audioMenu.style.display === 'block') {
          if (typeof window.audioPanel.closeAudioMenu === 'function') {
            window.audioPanel.closeAudioMenu();
          }
        }
      }

      // Ocultar acciones de selección si están visibles
      const selectionActions = document.querySelector('.youtube-selection-actions');
      if (selectionActions && selectionActions.classList.contains('visible')) {
        selectionActions.classList.remove('visible');
      }
    } catch (e) {
      console.warn('Error al resetear componentes de audio/video:', e);
    }

    // Desactivar chat activo en sidebar
    document.querySelectorAll('.sidebar-item.active').forEach(item => {
      removeClass(item, 'active');
    });

    // Actualizar estado
    setCurrentChat(null);

    // Restaurar el subtítulo por defecto
    const headerSubtitle = getCachedElement('.header-subtitle');
    if (headerSubtitle) {
      headerSubtitle.textContent = 'Asistente virtual académico';
      headerSubtitle.removeAttribute('title');
    }

    // Limpiar mensajes del chat
    clearChatMessages();

    // Actualizar URL
    history.pushState({}, '', URL_CONFIG.basePath);

    // Preparar para mostrar mensaje de bienvenida
    const textarea = domManager.textarea;
    const fixedSpace = domManager.fixedSpace;

    if (textarea && fixedSpace) {
      textarea.value = '';
      fixedSpace.style.opacity = '0';
      fixedSpace.style.display = 'none';
      fixedSpace.style.pointerEvents = 'none';
      fixedSpace.style.overflow = 'hidden';
      void fixedSpace.offsetHeight;

      // Limpiar función nativa si está disponible
      if (typeof clearAttachedFiles === 'function') {
        clearAttachedFiles();
      }

      // IMPORTANTE: Usar setManagedTimeout de dom-helpers.js
      if (typeof setManagedTimeout === 'function') {
        setManagedTimeout(() => {
          showWelcomeMessage();
        }, 100, 'show-welcome-message');
      } else {
        setTimeout(() => {
          showWelcomeMessage();
        }, 100);
      }
    } else {
      showWelcomeMessage();
    }
  } catch (error) {
    console.error('Error en handleNewChat:', error);
    // Recuperación de emergencia optimizada
    emergencyRecovery();
  } finally {
    window.isHandlingNewChat = false;
  }
}

/**
 * Función optimizada para cambiar entre chats
 */
export async function switchChat(chatId) {

  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }

  // 🔽 NUEVO: Cerrar dropdown del header
  closeHeaderDropdown();

  // Control de concurrencia para evitar cambios simultáneos
  if (isSwitchingChat) {
    pendingChatSwitch = chatId;
    return;
  }

  isSwitchingChat = true;

  // NUEVO: Lista de promesas pendientes para mejor seguimiento
  const pendingPromises = [];

  // IMPORTANTE: Detener explícitamente cualquier reproducción de audio o video en curso
  try {
    // 1. Detener cualquier audio del panel de YouTube si está activo
    if (window.youtubePanel) {
      console.log('Deteniendo reproducción de audio/video en youtubePanel antes de cambiar chat');

      // Detener reproducción inmediatamente
      if (typeof window.youtubePanel.pauseMediaPlayback === 'function') {
        window.youtubePanel.pauseMediaPlayback();
      }

      // También resetear estado completo si está disponible
      if (typeof window.youtubePanel.resetPanelData === 'function') {
        window.youtubePanel.resetPanelData();
      }
    }

    // 2. Buscar y detener explícitamente cualquier elemento de audio visible
    document.querySelectorAll('audio').forEach(audio => {
      if (!audio.paused) {
        console.log('Deteniendo elemento de audio activo:', audio.id || 'sin id');
        audio.pause();

        // También intentar vaciar la fuente si es posible
        try {
          audio.src = '';
          audio.load();
        } catch (e) {
          // Ignorar errores al limpiar
        }
      }
    });
  } catch (e) {
    console.warn('Error al intentar detener medios antes de cambiar chat:', e);
    // No bloquear el cambio de chat si falla la detención de audio
  }

  // Configurar controlador de aborto
  const abortController = ChatUtils.setupAbortController();
  const signal = abortController.signal;

  try {
    // Validaciones iniciales
    const currentChatId = getState('currentChatId');
    if (currentChatId === chatId) {
      isSwitchingChat = false;
      return;
    }

    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }

    if (typeof isChatProblematic === 'function' && isChatProblematic(chatId)) {
      if (typeof showCleanupDialog === 'function') {
        showCleanupDialog(chatId);
      }
      isSwitchingChat = false;
      return;
    }

    // 💬 NOTIFICACIÓN SUTIL DE CAMBIO
    acadelInfo(
      "💬 Cambiando de conversación",
      "Acadel está preparando tu chat anterior..."
    );

    // Mostrar indicador de carga
    if (typeof applyChatSwitchSkeleton === 'function') {
      applyChatSwitchSkeleton();
    } else {
      const chatMessages = domManager.chatMessages;
      if (chatMessages) {
        chatMessages.innerHTML = '<div class="loading-skeleton"><div class="skeleton-loader"></div></div>';
      }
    }

    // FASE 1: LIMPIEZA COMPLETA optimizada
    await performCompleteCleaning();

    // FASE 2: ACTUALIZAR ESTADO E INTERFAZ
    updateChatState(chatId);

    // FASE 3: CARGAR Y RENDERIZAR MENSAJES
    await loadAndRenderMessages(chatId, signal, pendingPromises);

    // FASE 4: RESTAURAR COMPONENTES Y FUNCIONALIDAD
    await restoreComponentsAndFunctionality(signal, pendingPromises);

  } catch (error) {
    console.error('Error general en switchChat:', error);
    emergencyRecovery();
  } finally {
    await finalizeSwitch(abortController, pendingPromises);
  }
}

/**
 * Realiza limpieza completa optimizada
 * VERSIÓN CORREGIDA - Incluye cierre del preview panel
 */
async function performCompleteCleaning() {
  // Limpiar timeouts
  ChatUtils.cleanupTimeouts();

  // Limpiar elementos de bienvenida
  ChatUtils.cleanupWelcomeElements();

  // Cerrar paneles matemáticos
  ChatUtils.closeMathPanels();

  // Cerrar preview panel si está abierto
  const previewPanel = document.querySelector('#preview-panel');
  if (previewPanel && previewPanel.classList.contains('open')) {
    const { closePreviewPanel } = await import('../components/preview-panel-agente.js');
    closePreviewPanel();
  }

  // Cerrar modales
  const previewModal = domManager.previewModal;
  if (previewModal) {
    previewModal.classList.remove('show');
    previewModal.style.display = '';
  }

  // Limpiar archivos adjuntos
  await ChatUtils.cleanupFileAttachments();

  // Resetear textarea
  const textarea = domManager.textarea;
  if (textarea) {
    textarea.value = '';
    textarea.removeAttribute('style');
    textarea.removeAttribute('disabled');
    textarea.removeAttribute('readonly');
    textarea.style.display = '';
  }

  // Limpiar modales y estados
  document.querySelectorAll('.modal, .modal-backdrop, .overlay').forEach(el => {
    if (!el.classList.contains('sidebar-overlay')) {
      eventManager.removeFromElement(el);
      el.remove();
    }
  });

  // Reseteo forzado del panel de YouTube y audio ANTES de cargar el nuevo chat
  try {
    // Resetear panel de YouTube
    if (window.youtubePanel) {
      // Forzar limpieza de datos internos
      window.youtubePanel.videoData = null;
      window.youtubePanel.audioData = null;
      window.youtubePanel.currentMode = null;
      window.youtubePanel.timestamps = [];
      window.youtubePanel.searchResults = [];
      window.youtubePanel.currentSearchIndex = -1;
      window.youtubePanel.currentlyHighlightedSegment = null;

      // Si el panel está visible, cerrarlo
      if (window.youtubePanel.isVisible && typeof window.youtubePanel.togglePanel === 'function') {
        window.youtubePanel.togglePanel();
      }

      console.log("Panel de transcripción reseteado forzosamente en switchChat");
    }

    // Ocultar también cualquier menú de audio abierto
    if (window.audioPanel) {
      const audioMenu = document.querySelector('.audio-menu');
      if (audioMenu && audioMenu.style.display === 'block') {
        if (typeof window.audioPanel.closeAudioMenu === 'function') {
          window.audioPanel.closeAudioMenu();
        }
      }
    }

    // Ocultar acciones de selección si están visibles
    const selectionActions = document.querySelector('.youtube-selection-actions');
    if (selectionActions && selectionActions.classList.contains('visible')) {
      selectionActions.classList.remove('visible');
    }
  } catch (e) {
    console.warn('Error al resetear componentes de audio/video:', e);
  }

  // Limpiar URLs de objetos
  if (window.objectURLs && Array.isArray(window.objectURLs)) {
    window.objectURLs.forEach(url => {
      try {
        if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.warn('Error al revocar URL:', e);
      }
    });
    window.objectURLs = [];
  }

  // Resetear clases del body
  document.body.classList.remove(
    'modal-open', 'preview-panel-active', 'welcome-active', 'initializing',
    'sidebar-expanded', 'has-modal', 'no-scroll', 'overflow-hidden'
  );

  // Reset del editor matemático
  try {
    const resetPromise = resetMathEditor();
    await Promise.race([
      resetPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]).catch(e => console.warn('Error o timeout en resetMathEditor:', e));

    const mathButton = domManager.mathButton;
    if (mathButton) {
      mathButton.classList.remove('active');
    }
  } catch (e) {
    console.warn('Error al reiniciar editor matemático:', e);
  }
}

/**
 * Actualiza estado del chat
 */
function updateChatState(chatId) {
  if (typeof setCurrentChat === 'function') {
    // Guardar el chat anterior para eventos
    const prevChatId = getState('currentChatId');
    setCurrentChat(chatId);

    // NUEVO: Emitir evento de cambio de chat para componentes de YouTube y audio
    try {
      import('./event-bus-agente.js').then(module => {
        if (module.default && typeof module.default.emit === 'function') {
          console.log('Emitiendo evento chat:changed desde switchChat');
          module.default.emit('chat:changed', {
            chatId,
            previousChatId: prevChatId
          });
        }
      }).catch(err => console.warn('Error al emitir evento chat:changed:', err));
    } catch (err) {
      console.warn('Error al emitir evento de cambio de chat:', err);
    }
  }

  if (typeof updateHeaderForChat === 'function') {
    updateHeaderForChat(chatId);
  }

  if (typeof updateActiveSidebarItem === 'function') {
    updateActiveSidebarItem(chatId);
  }

  if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.chatPath) {
    history.pushState({}, '', URL_CONFIG.chatPath(chatId));
  } else {
    history.pushState({}, '', `/agente/${chatId}`);
  }

  if (typeof clearChatMessages === 'function') {
    clearChatMessages();
  } else {
    const chatMessages = domManager.chatMessages;
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
  }
}

/**
 * Carga y renderiza mensajes
 */
async function loadAndRenderMessages(chatId, signal, pendingPromises) {
  try {
    if (signal.aborted) return;

    let loadPromise;
    if (typeof safeChatAction === 'function' && typeof loadChatMessages === 'function') {
      loadPromise = safeChatAction(
        chatId,
        () => loadChatMessages(chatId, signal),
        'carga de mensajes'
      );
    } else if (typeof loadChatMessages === 'function') {
      loadPromise = loadChatMessages(chatId, signal);
    } else {
      console.warn('No se encontró una función para cargar mensajes');
      return;
    }

    pendingPromises.push(loadPromise);

    const abortPromise = new Promise((_, reject) => {
      const abortHandler = () => {
        reject(new DOMException('Operación abortada por el usuario', 'AbortError'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Tiempo de espera excedido al cargar mensajes'));
      }, 10000);
      signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });
    });

    const messages = await Promise.race([loadPromise, abortPromise, timeoutPromise]);

    if (signal.aborted) return;

    if (!signal.aborted && typeof renderChatMessages === 'function' && messages) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      renderChatMessages(messages);

      requestAnimationFrame(() => {
        console.log('🔍 Procesando documentos existentes inmediatamente...');
        processExistingDocuments();
        processAllExistingMessages();

        // ⭐ NUEVO: Usar procesamiento inmediato del content-processing ⭐
        import('../ui/content-processing-agente.js').then(contentModule => {
          if (typeof contentModule.processMessagesImmediately === 'function') {
            contentModule.processMessagesImmediately();
          }
        }).catch(e => console.warn('Error al importar procesamiento inmediato:', e));
      });

      // INSERTAR AQUÍ - Scroll forzado después de cambiar chat en móviles
      if (window.innerWidth < 768) {
        setTimeout(() => {
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }, 350);
      }

      // NUEVO: Emitir evento de mensajes cargados para componentes como el panel de YouTube
      try {
        import('./event-bus-agente.js').then(module => {
          if (module.default && typeof module.default.emit === 'function') {
            module.default.emit('messages:loaded', {
              chatId,
              messageCount: messages ? messages.length : 0
            });
          }
        }).catch(err => console.warn('Error al emitir evento messages:loaded:', err));
      } catch (err) {
        console.warn('Error al emitir evento de mensajes cargados:', err);
      }
    }
  } catch (error) {
    // Determinar si el error es de aborto con verificación mejorada
    const isAbortError = error.name === 'AbortError' ||
      error.message?.includes('aborted') ||
      signal.aborted;

    if (isAbortError) {
      console.log('Carga de mensajes abortada:', error.message || 'Sin detalles');
    } else {
      console.error('Error al cargar mensajes del chat:', error);
      // 📚 Notificación divertida de error de carga
      acadelError(
        "📚 ¡No pude cargar esa conversación!",
        "Acadel está teniendo problemas accediendo a ese chat. Tal vez está en el rincón más profundo de su memoria de capibara"
      );

    }
  }
}

/**
 * Restaura componentes y funcionalidad
 */
async function restoreComponentsAndFunctionality(signal, pendingPromises) {
  if (signal.aborted) return;

  // Restaurar visibilidad del área de entrada
  ChatUtils.restoreInputVisibility();

  // Restaurar funcionalidad matemática
  try {
    const setupPromise = Promise.resolve().then(async () => {
      await setupMathButton();
      repairMathButton();
      ChatUtils.closeMathPanels();
    });

    pendingPromises.push(setupPromise);

    await Promise.race([
      setupPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]).catch(e => console.warn('Error o timeout en configuración matemática:', e));

  } catch (e) {
    console.warn('Error al restaurar funcionalidad matemática:', e);
    // Fallback de emergencia
    setupMathButtonFallback();
  }

  if (signal.aborted) return;

  // Restaurar eventos del textarea
  restoreTextareaEvents();

  // Restaurar botones
  restoreButtonEvents();

  // Restaurar drag & drop
  try {
    restoreDragAndDrop();
  } catch (e) {
    console.warn('Error al restaurar drag & drop:', e);
    Promise.resolve().then(() => {
      import('../utils/file-attachments-agente.js').then(module => {
        if (typeof module.initFileAttachments === 'function') {
          module.initFileAttachments();
        } else if (typeof module.default?.initFileAttachments === 'function') {
          module.default.initFileAttachments();
        }
      });
    });
  }

  cleanupProblematicElements();
  window.hasDirectlyAccessedUrl = false;

  // NUEVO: Comprobar y restaurar panel de YouTube
  try {
    import('../components/youtube-panel.js').then(module => {
      if (module.youtubePanel && typeof module.youtubePanel.checkForVideo === 'function') {
        // Verificar si hay un video en el chat actual después de cargar los mensajes
        setTimeout(() => {
          module.youtubePanel.checkForVideo();
        }, 500);
      }
    }).catch(e => {
      console.warn('Error al verificar panel de YouTube:', e);
    });
  } catch (e) {
    console.warn('Error al verificar panel de YouTube:', e);
  }

  // NUEVO: Actualizar botón de audio si existe
  try {
    import('../components/audio-panel.js').then(module => {
      if (module.audioPanel && typeof module.audioPanel.updateButtonState === 'function') {
        // Actualizar estado del botón de audio para el chat actual
        module.audioPanel.updateButtonState();
      }
    }).catch(e => {
      console.warn('Error al actualizar panel de audio:', e);
    });
  } catch (e) {
    console.warn('Error al actualizar panel de audio:', e);
  }
}

/**
 * Restaura eventos del textarea con gestión centralizada
 */
function restoreTextareaEvents() {
  const currentTextarea = domManager.textarea;
  if (currentTextarea) {
    eventManager.removeFromElement(currentTextarea);

    currentTextarea.removeAttribute('disabled');
    currentTextarea.removeAttribute('readonly');
    currentTextarea.removeAttribute('aria-hidden');

    currentTextarea.style.display = '';
    currentTextarea.style.visibility = 'visible';
    currentTextarea.style.opacity = '1';
    currentTextarea.style.pointerEvents = 'auto';

    currentTextarea.classList.remove('disabled', 'readonly', 'no-interact');

    if (typeof handleKeyPress === 'function') {
      eventManager.add(currentTextarea, 'keydown', function (e) {
        handleKeyPress(e);
        return false;
      }, false, 'restored-textarea-keydown');
    } else {
      eventManager.add(currentTextarea, 'keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const sendEvent = new CustomEvent('sendMessageRequest');
          window.dispatchEvent(sendEvent);
        }
        return false;
      }, false, 'restored-textarea-keydown-fallback');
    }

    // Gestión de límites de caracteres
    import('../../../shared/character-limit.js').then(module => {
      if (typeof module.hideLimitAlert === 'function') {
        module.hideLimitAlert();
      }

      const existingCounters = document.querySelectorAll('.character-counter');
      existingCounters.forEach(counter => {
        if (counter && counter.parentNode) {
          counter.parentNode.removeChild(counter);
        }
      });

      if (typeof module.cleanup === 'function') {
        module.cleanup();
      }

      setTimeout(() => {
        if (typeof module.initCharacterLimit === 'function') {
          module.initCharacterLimit(currentTextarea, { variant: 'agente' });
        }
      }, 50);
    });

    // Auto-resize
    Promise.resolve().then(() => {
      import('../ui/ui-manager-agente.js').then(module => {
        if (typeof module.handleTextareaResize === 'function') {
          eventManager.add(currentTextarea, 'input', function (e) {
            module.handleTextareaResize(e);
            return false;
          }, false, 'restored-textarea-resize');
          module.handleTextareaResize({ target: currentTextarea });
        }
      });
    });
  }
}

/**
 * Restaura eventos de botones con gestión centralizada
 */
function restoreButtonEvents() {
  try {
    const sendButton = domManager.sendButton;
    const attachButton = domManager.attachButton;

    if (sendButton) {
      eventManager.removeFromElement(sendButton);

      if (sendButton.dataset.originalContent) {
        sendButton.innerHTML = sendButton.dataset.originalContent;
      } else {
        sendButton.innerHTML = '<i class="bx bx-up-arrow-alt"></i>';
      }

      sendButton.title = "Enviar mensaje";
      sendButton.classList.remove('cancel-mode');

      function handleSendClick(e) {
        e.preventDefault();
        if (typeof handleSendMessage === 'function') {
          handleSendMessage();
        } else {
          window.dispatchEvent(new CustomEvent('sendMessageRequest'));
        }
        return false;
      }

      eventManager.add(sendButton, 'click', handleSendClick, false, 'restored-send-button');

      sendButton.disabled = false;
      sendButton.style.pointerEvents = 'auto';
    }

    if (attachButton) {
      eventManager.removeFromElement(attachButton);

      function handleAttachmentClick(e) {
        e.preventDefault();
        const options = document.querySelector('.attachment-options');
        if (options) options.classList.toggle('show');
        return false;
      }

      eventManager.add(attachButton, 'click', handleAttachmentClick, false, 'restored-attach-button');
      attachButton.style.pointerEvents = 'auto';
      attachButton.disabled = false;
    }
  } catch (e) {
    console.warn('Error al restaurar botones:', e);
  }
}

/**
 * Fallback para configuración de botón matemático
 */
function setupMathButtonFallback() {
  try {
    const mathButton = domManager.mathButton;
    if (mathButton) {
      eventManager.removeFromElement(mathButton);
      mathButton.classList.remove('active');

      eventManager.add(mathButton, 'click', function () {
        const mathPanel = domManager.mathPanel;
        if (mathPanel) {
          mathPanel.classList.toggle('show');
          mathPanel.style.display = mathPanel.classList.contains('show') ? 'block' : 'none';
          this.classList.toggle('active');

          if (typeof setMathPanelState === 'function') {
            setMathPanelState(mathPanel.classList.contains('show'));
          }
        }
      }, false, 'math-button-fallback');
    }
  } catch (innerError) {
    console.error('Error en recuperación de emergencia matemática:', innerError);
  }
}

/**
 * Finaliza el proceso de switchChat
 */
async function finalizeSwitch(abortController, pendingPromises) {
  try {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }

    try {
      Promise.allSettled(pendingPromises).then(results => {
        const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
        if (errors.length > 0) {
          console.warn(`${errors.length} promesas pendientes fallaron al finalizar:`, errors);
        }
      });
    } catch (e) {
      console.warn('Error al resolver promesas pendientes:', e);
    }

    Promise.resolve().then(() => {
      import('../ui/ui-manager-agente.js').then(module => {
        if (typeof module.setCurrentFetchController === 'function') {
          module.setCurrentFetchController(null);
        }
      });
    });
  } catch (e) {
    console.warn('Error al abortar controlador:', e);
  }

  try {
    finalCleanup();
  } catch (e) {
    console.warn('Error en finalCleanup:', e);
    isSwitchingChat = false;
  }
}

/**
 * Recuperación de emergencia optimizada
 */
function emergencyRecovery() {
  try {
    ChatUtils.restoreInputVisibility();

    const mainTextarea = domManager.textarea;
    if (mainTextarea) {
      mainTextarea.removeAttribute('disabled');
      mainTextarea.removeAttribute('readonly');
      mainTextarea.style.pointerEvents = 'auto';
      mainTextarea.focus();
    }
  } catch (e) {
    console.warn('Error en recuperación de emergencia:', e);
  }
}

/**
 * Limpieza final optimizada
 */
function finalCleanup() {
  try {
    if (window.currentAbortController && !window.currentAbortController.signal.aborted) {
      try {
        window.currentAbortController.abort();
      } catch (e) {
        console.warn('Error al abortar controlador en finalCleanup:', e);
      }
    }

    // Eliminar skeleton de carga
    Promise.resolve().then(() => {
      try {
        if (typeof removeChatSwitchSkeleton === 'function') {
          removeChatSwitchSkeleton();
        }

        import('../ui/ui-manager-agente.js').then(module => {
          if (typeof module.removeChatSwitchSkeleton === 'function') {
            module.removeChatSwitchSkeleton();
          }
        }).catch(() => { });

        document.querySelectorAll('.loading-skeleton, .skeleton-loader, .chat-skeleton').forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch (skeletonError) {
        console.warn('Error al eliminar skeleton:', skeletonError);
        document.querySelectorAll('[class*="skeleton"]').forEach(el => el.remove());
      }
    });

    ChatUtils.cleanupTimeouts();
    cleanupProblematicElements();

    // Limpiar caché
    if (typeof clearDomCache === 'function') {
      clearDomCache();
    }
    domManager.clearAll();

    document.body.style.pointerEvents = '';
    isSwitchingChat = false;

    // Comprobar si hay un cambio de chat pendiente
    if (pendingChatSwitch) {
      const nextChatId = pendingChatSwitch;
      pendingChatSwitch = null;

      // Pequeño retraso para evitar problemas
      setTimeout(() => {
        switchChat(nextChatId);
      }, 300);
    }
  } catch (error) {
    console.warn('Error en finalCleanup:', error);
    isSwitchingChat = false;
  }
}

/**
 * Elimina elementos problemáticos
 */
function cleanupProblematicElements() {
  const problematicSelectors = [
    '.modal-backdrop',
    '.overlay:not(.sidebar-overlay)',
    '.input-blocker',
    '.event-capture',
    '.fullscreen-overlay',
    '.ai-typing-indicator'
  ];

  problematicSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  const previewModal = domManager.previewModal;
  if (previewModal) {
    previewModal.classList.remove('show');
    const closeButton = document.getElementById('preview-close');
    if (closeButton) {
      eventManager.removeFromElement(closeButton);
      eventManager.add(closeButton, 'click', () => {
        previewModal.classList.remove('show');
      }, false, 'preview-close-restored');
    }

    const previewBody = document.getElementById('preview-body');
    if (previewBody) {
      previewBody.innerHTML = '';
    }

    previewModal.removeAttribute('data-auto-reopen');
    previewModal.removeAttribute('data-last-file-id');
  }
}

/**
 * Verifica si hay un chat en la URL al iniciar y lo carga
 */
async function checkInitialChatFromURL() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];

  if (chatId && validateUUID(chatId)) {
    if (isChatProblematic(chatId)) {
      showCleanupDialog(chatId);
      return;
    }

    // Restaurar visibilidad del textarea inmediatamente
    document.documentElement.classList.remove('welcome-pending');
    const fixedSpace = domManager.fixedSpace;
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('visibility');
      void fixedSpace.offsetHeight;
    }

    window.isInitialChatLoad = true;
    window.hasDirectlyAccessedUrl = true;

    try {
      const chats = await loadChatHistory();
      renderChatHistory(chats);

      setCurrentChat(chatId);
      updateHeaderForChat(chatId);
      updateActiveSidebarItem(chatId);

      let messages;
      try {
        messages = await safeChatAction(
          chatId,
          () => loadChatMessages(chatId),
          'carga de mensajes'
        );
      } catch (error) {
        console.error('Error al cargar mensajes con safeChatAction:', error);
        messages = await loadChatMessages(chatId);
      }

      if (messages) {
        renderChatMessages(messages);

        // ⭐ PROCESAMIENTO INMEDIATO - SIN DELAY
        requestAnimationFrame(() => {
          console.log('🔍 Procesando documentos existentes inmediatamente...');

          // Procesamiento síncrono inmediato
          processExistingDocuments();
          processAllExistingMessages();

          // También llamar al procesamiento inmediato del content-processing
          import('../ui/content-processing-agente.js').then(contentModule => {
            if (typeof contentModule.processMessagesImmediately === 'function') {
              contentModule.processMessagesImmediately();
            }
          }).catch(e => console.warn('Error al importar procesamiento inmediato:', e));
        });
      } else {
        console.warn('No se pudieron cargar mensajes para el chat:', chatId);
        const chatMessages = domManager.chatMessages;
        if (chatMessages) {
          chatMessages.innerHTML = `
            <div class="error-message">
              <i class="bx bx-error-circle"></i>
              <p>No se pudieron cargar los mensajes. Intenta recargando la página.</p>
            </div>
          `;
        }
      }

      // Configurar eventos con EventManager
      const sendButton = domManager.sendButton;
      if (sendButton) {
        eventManager.add(sendButton, 'click', handleSendMessage, false, 'initial-send-button');
      }

      const textarea = domManager.textarea;
      if (textarea) {
        const keydownHandler = function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        };

        eventManager.add(textarea, 'keydown', keydownHandler, false, 'initial-textarea-keydown');

        textarea.removeAttribute('disabled');
        textarea.removeAttribute('readonly');
        textarea.style.pointerEvents = 'auto';

        eventManager.add(textarea, 'input', function (e) {
          if (typeof handleTextareaResize === 'function') {
            handleTextareaResize(e);
          }
        }, false, 'initial-textarea-resize');

        if (typeof handleTextareaResize === 'function') {
          handleTextareaResize({ target: textarea });
        }

        if (typeof reinitializeTextareaListeners === 'function') {
          reinitializeTextareaListeners();
        }
      }

      window.isInitialChatLoad = false;

      // Limpiar caché para referencias frescas
      domManager.invalidate(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);

      setTimeout(() => {
        const textarea = domManager.textarea;
        if (textarea) {
          eventManager.add(textarea, 'keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }, false, 'secondary-textarea-keydown');
        }
      }, 500);

    } catch (error) {
      console.error('Error al cargar chat inicial:', error);
      window.isInitialChatLoad = false;
      switchChat(chatId);
    }
  } else {
    showWelcomeMessage();
  }
}

/**
 * Envía el mensaje cuando se presiona Enter (sin shift).
 */
function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
}

/**
 * Crea el modal de previsualización
 */
function createPreviewModal() {
  if (document.getElementById('preview-modal')) return document.getElementById('preview-modal');

  const modalHTML = `
    <div id="preview-modal" class="preview-modal">
      <div class="preview-modal-content">
        <div class="preview-title">
          <i class="bx bx-file"></i>
          <span id="preview-file-name">Archivo</span>
          <button id="preview-close" class="preview-close-btn">
            <i class="bx bx-x"></i>
          </button>
        </div>
        <div id="preview-body" class="preview-body">
          <!-- El contenido se cargará dinámicamente -->
        </div>
      </div>
    </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHTML;
  const modalElement = tempDiv.firstElementChild;
  document.body.appendChild(modalElement);

  const previewClose = document.getElementById('preview-close');
  const previewModal = document.getElementById('preview-modal');

  if (previewClose && previewModal) {
    eventManager.add(previewClose, 'click', () => {
      previewModal.classList.remove('show');
    }, false, 'preview-modal-close');

    eventManager.add(document, 'keydown', (event) => {
      if (event.key === 'Escape' && previewModal.classList.contains('show')) {
        previewModal.classList.remove('show');
      }
    }, false, 'preview-modal-escape');
  }

  return modalElement;
}

/**
 * Maneja la previsualización de archivos
 */
function handleFilePreview(previewElement) {
  if (!previewElement) return;

  const fileId = previewElement.dataset.fileId;
  const fileType = previewElement.dataset.fileType;

  let modal = domManager.previewModal;
  if (!modal) {
    createPreviewModal();
    modal = domManager.previewModal;
  }

  if (modal) {
    try {
      import('../utils/file-attachments-agente.js').then(module => {
        if (module && typeof module.showFilePreview === 'function') {
          module.showFilePreview(fileId, fileType);
        } else {
          modal.classList.add('show');
        }
      }).catch(() => {
        modal.classList.add('show');
      });
    } catch (e) {
      modal.classList.add('show');
    }
  }
}

/**
 * Restaura la funcionalidad de drag & drop con manejo mejorado
 */
function restoreDragAndDrop() {
  try {
    const existingContainer = domManager.fileUploadContainer;
    if (existingContainer) {
      eventManager.removeFromElement(existingContainer);
    }

    eventManager.removeFromElement(document);

    const fileUploadContainer = domManager.fileUploadContainer;
    const dragDropArea = document.querySelector('#drag-drop-area');

    if (!fileUploadContainer) return;

    fileUploadContainer.style.display = '';
    fileUploadContainer.style.opacity = '1';
    fileUploadContainer.style.visibility = 'visible';
    fileUploadContainer.style.pointerEvents = 'auto';
    fileUploadContainer.classList.remove('active', 'dragging');

    if (dragDropArea) {
      dragDropArea.classList.remove('dragging');
      dragDropArea.classList.add('drag-drop-area');
    }

    const filePreviewContainer = domManager.filePreviewContainer;
    if (filePreviewContainer) {
      eventManager.removeFromElement(filePreviewContainer);

      filePreviewContainer.style.pointerEvents = 'auto';
      filePreviewContainer.style.visibility = 'visible';
      filePreviewContainer.style.opacity = '1';
      filePreviewContainer.style.display = '';

      eventManager.add(filePreviewContainer, 'click', (event) => {
        const removeButton = event.target.closest('.file-preview-remove');
        if (removeButton) {
          const fileId = removeButton.dataset.fileId;
          if (fileId) {
            const fileElement = document.querySelector(`.file-preview[data-file-id="${fileId}"]`);
            if (fileElement) {
              eventManager.removeFromElement(fileElement);
              fileElement.remove();
            }

            if (typeof window.removeFile === 'function') {
              window.removeFile(fileId);
            } else {
              import('../utils/file-attachments-agente.js').then(module => {
                if (typeof module.removeFile === 'function') {
                  module.removeFile(fileId);
                } else if (module.default && typeof module.default.removeFile === 'function') {
                  module.default.removeFile(fileId);
                } else {
                  if (module.attachmentState && module.attachmentState.files) {
                    module.attachmentState.files.delete(fileId);
                  } else if (module.default && module.default.attachmentState && module.default.attachmentState.files) {
                    module.default.attachmentState.files.delete(fileId);
                  }
                }
              }).catch(err => {
                console.warn('Error al eliminar archivo:', err);
              });
            }
          }
          return;
        }

        if (!event.target.closest('.file-preview-remove')) {
          const previewElement = event.target.closest('.file-preview');
          if (previewElement) {
            const fileId = previewElement.dataset.fileId;
            const fileType = previewElement.dataset.fileType;

            if (typeof showFilePreview === 'function' && fileId) {
              showFilePreview(fileId, fileType);
            } else if (typeof handleFilePreview === 'function') {
              handleFilePreview(previewElement);
            }
          }
        }
      }, false, 'file-preview-click');
    }

    // Configurar eventos de drag & drop con EventManager
    setupDragDropEvents(fileUploadContainer);

  } catch (error) {
    console.warn('Error al restaurar drag & drop:', error);
  }
}

/**
 * Configura eventos de drag & drop
 */
function setupDragDropEvents(fileUploadContainer) {
  const dragEnterHandler = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      fileUploadContainer.classList.add('active');
    }
  };
  eventManager.add(document, 'dragenter', dragEnterHandler, false, 'drag-enter');

  const dragOverHandler = (e) => {
    e.preventDefault();
    fileUploadContainer.classList.add('dragging');
  };
  eventManager.add(fileUploadContainer, 'dragover', dragOverHandler, false, 'drag-over');

  const dragLeaveHandler = (e) => {
    e.preventDefault();
    if (!e.relatedTarget || !fileUploadContainer.contains(e.relatedTarget)) {
      fileUploadContainer.classList.remove('dragging');
    }
  };
  eventManager.add(fileUploadContainer, 'dragleave', dragLeaveHandler, false, 'drag-leave');

  const docDragLeaveHandler = (e) => {
    if (e.clientX <= 0 || e.clientY <= 0 ||
      e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      fileUploadContainer.classList.remove('active', 'dragging');
    }
  };
  eventManager.add(document, 'dragleave', docDragLeaveHandler, false, 'doc-drag-leave');

  const keydownHandler = (e) => {
    if (e.key === 'Escape' && fileUploadContainer.classList.contains('active')) {
      fileUploadContainer.classList.remove('active', 'dragging');
    }
  };
  eventManager.add(document, 'keydown', keydownHandler, false, 'drag-escape');

  const clickHandler = (e) => {
    if (fileUploadContainer.classList.contains('active') &&
      !fileUploadContainer.contains(e.target)) {
      fileUploadContainer.classList.remove('active', 'dragging');
    }
  };
  eventManager.add(document, 'click', clickHandler, false, 'drag-click-outside');

  const dropHandler = (e) => {
    e.preventDefault();
    fileUploadContainer.classList.remove('dragging', 'active');

    if (e.dataTransfer.files.length > 0) {
      try {
        if (typeof window.handleDroppedFiles === 'function') {
          window.handleDroppedFiles(e.dataTransfer.files);
          return false;
        } else {
          import('../utils/file-attachments-agente.js').then(module => {
            if (module && typeof module.handleDroppedFiles === 'function') {
              module.handleDroppedFiles(e.dataTransfer.files);
            } else {
              console.warn('handleDroppedFiles no está disponible');
            }
          }).catch(err => {
            console.warn('Error al manejar archivos:', err);
          });
          return false;
        }
      } catch (error) {
        console.error('Error al procesar archivos:', error);
        return false;
      }
    }
    return false;
  };
  eventManager.add(fileUploadContainer, 'drop', dropHandler, false, 'drag-drop');
}

// ===== FUNCIONES AUXILIARES PARA EDITOR MATEMÁTICO =====

/**
 * Reinicia completamente el editor matemático
 */
async function resetMathEditor() {
  try {
    // Cerrar cualquier panel o editor matemático visible
    const mathPanel = domManager.mathPanel;
    if (mathPanel) {
      mathPanel.classList.remove('show');
      mathPanel.style.display = 'none';
    }

    const mathEditorContainer = document.querySelector('#math-editor-container');
    if (mathEditorContainer) {
      mathEditorContainer.style.display = 'none';
    }

    // Actualizar el estado global
    if (typeof setMathPanelState === 'function') {
      setMathPanelState(false);
    }

    // Restaurar estado visual del botón matemático
    const mathButton = domManager.mathButton;
    if (mathButton) {
      mathButton.classList.remove('active');
    }

    // Limpiar la instancia del editor si existe
    const mathEditorModule = await import('../math/interactive-math-editor-agente.js').catch(() => null);
    if (mathEditorModule && mathEditorModule.cleanupMathEditor) {
      mathEditorModule.cleanupMathEditor();
    }

    // Forzar eliminación de cualquier referencia global
    if (window.editorInstance) {
      window.editorInstance = null;
    }

    return true;
  } catch (error) {
    console.warn('Error al reiniciar el editor matemático:', error);
    return false;
  }
}

/**
 * Función específica para reparar el botón matemático en transiciones
 */
function repairMathButton() {
  try {
    const mathButton = domManager.mathButton;
    if (!mathButton) {
      console.warn('No se encontró el botón matemático');
      return false;
    }

    // Crear un nuevo botón para garantizar limpieza total
    const newButton = document.createElement('button');
    newButton.id = mathButton.id || 'math-button';
    newButton.className = mathButton.className || 'attach-btn';
    newButton.title = 'Fórmulas matemáticas';
    newButton.innerHTML = mathButton.innerHTML || '<i class="bx bx-math"></i>';

    // Aplicar estilos explícitos para garantizar interactividad
    newButton.style.pointerEvents = 'auto';
    newButton.style.cursor = 'pointer';

    // Reemplazar el botón antiguo con el nuevo
    if (mathButton.parentNode) {
      mathButton.parentNode.replaceChild(newButton, mathButton);
    } else {
      console.warn('No se pudo reemplazar el botón matemático - parentNode es null');
      return false;
    }

    // Configurar el handler del clic con EventManager
    eventManager.add(newButton, 'click', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const mathEditorModule = await import('../math/interactive-math-editor-agente.js').catch(() => null);

        if (mathEditorModule && mathEditorModule.initMathEditor) {
          let editor = window.editorInstance;

          if (!editor) {
            editor = mathEditorModule.initMathEditor();
            window.editorInstance = editor;
          }

          const currentTextarea = domManager.textarea;
          if (editor.textarea !== currentTextarea) {
            editor.textarea = currentTextarea;
          }

          const mathEditorContainer = document.querySelector('#math-editor-container');

          if (mathEditorContainer &&
            (window.getComputedStyle(mathEditorContainer).display === 'flex' ||
              window.getComputedStyle(mathEditorContainer).display === 'block')) {
            mathEditorContainer.style.display = 'none';
            this.classList.remove('active');

            if (typeof setMathPanelState === 'function') {
              setMathPanelState(false);
            }
          } else {
            if (mathEditorContainer) {
              mathEditorContainer.style.display = 'flex';
            }
            this.classList.add('active');

            if (typeof setMathPanelState === 'function') {
              setMathPanelState(true);
            }

            setTimeout(() => {
              const mathfield = document.querySelector('#mathfield');
              if (mathfield) {
                mathfield.focus();
              }
            }, 100);
          }
          return;
        }

        // Fallback: usar panel matemático básico
        const mathPanel = domManager.mathPanel;
        if (mathPanel) {
          mathPanel.classList.toggle('show');
          mathPanel.style.display = mathPanel.classList.contains('show') ? 'block' : 'none';
          this.classList.toggle('active');

          if (typeof setMathPanelState === 'function') {
            setMathPanelState(mathPanel.classList.contains('show'));
          }
        }
      } catch (error) {
        console.error('Error al interactuar con el editor matemático:', error);
        acadelError(
          "🧮 Editor matemático temporalmente fuera de servicio",
          "Acadel está trabajando en restaurar las funciones matemáticas"
        );
      }
    }, false, 'repaired-math-button');

    // Actualizar referencia en DOMManager
    domManager.invalidate([DOM_SELECTORS.mathButton]);

    return true;
  } catch (error) {
    console.error('Error al reparar el botón matemático:', error);
    return false;
  }
}

/**
 * Configura correctamente el botón matemático
 */
async function setupMathButton() {
  const mathButton = domManager.mathButton;
  if (!mathButton) return false;

  try {
    // Limpiar eventos existentes
    eventManager.removeFromElement(mathButton);

    // Configurar el nuevo handler optimizado
    eventManager.add(mathButton, 'click', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const mathEditorModule = await import('../math/interactive-math-editor-agente.js').catch(() => null);

        if (mathEditorModule && mathEditorModule.initMathEditor) {
          let editor = window.editorInstance;

          if (!editor) {
            editor = mathEditorModule.initMathEditor();
            window.editorInstance = editor;
          }

          const currentTextarea = domManager.textarea;
          if (editor.textarea !== currentTextarea) {
            editor.textarea = currentTextarea;
          }

          const mathEditorContainer = document.querySelector('#math-editor-container');

          if (mathEditorContainer &&
            (mathEditorContainer.style.display === 'flex' ||
              mathEditorContainer.style.display === 'block')) {
            mathEditorContainer.style.display = 'none';
            this.classList.remove('active');
            editor.isVisible = false;

            if (typeof setMathPanelState === 'function') {
              setMathPanelState(false);
            }
          } else {
            if (mathEditorContainer) {
              mathEditorContainer.style.display = 'flex';
            }
            this.classList.add('active');
            editor.isVisible = true;

            if (typeof setMathPanelState === 'function') {
              setMathPanelState(true);
            }

            setTimeout(() => {
              const mathfield = document.querySelector('#mathfield');
              if (mathfield) {
                mathfield.focus();
              }
            }, 100);
          }
          return;
        }

        // Fallback: usar el panel matemático básico
        const mathPanel = domManager.mathPanel;
        if (mathPanel) {
          mathPanel.classList.toggle('show');
          mathPanel.style.display = mathPanel.classList.contains('show') ? 'block' : 'none';
          this.classList.toggle('active');

          if (typeof setMathPanelState === 'function') {
            setMathPanelState(mathPanel.classList.contains('show'));
          }
        }
      } catch (error) {
        console.error('Error al interactuar con el editor matemático:', error);

        // Fallback de emergencia
        const mathPanel = domManager.mathPanel;
        if (mathPanel) {
          mathPanel.classList.toggle('show');
          mathPanel.style.display = mathPanel.classList.contains('show') ? 'block' : 'none';
          this.classList.toggle('active');

          if (typeof setMathPanelState === 'function') {
            setMathPanelState(mathPanel.classList.contains('show'));
          }
        }
      }
    }, false, 'setup-math-button');

    return true;
  } catch (error) {
    console.warn('Error al configurar el botón matemático:', error);
    return false;
  }
}

/**
 * Versión optimizada para eliminar un chat
 */
export async function handleDeleteChat(chatId) {
  try {
    closeExistingModals();

    closeExistingModals();
    // ... resto de la función

    const chatModule = await import('../api/chat-agente.js');
    const uiModule = await import('../ui/ui-manager-agente.js');
    const stateModule = await import('./state-agente.js');

    const deleteChat = chatModule.deleteChat;
    const setCurrentChat = stateModule.setCurrentChat;
    const getState = stateModule.getState;

    const isCurrentChat = getState('currentChatId') === chatId;

    if (typeof uiModule.showConfirmation === 'function') {
      uiModule.showConfirmation(
        '🗑️ ¡Acadel pregunta!',
        '¿Estás seguro de eliminar esta conversación? Una vez que Acadel la borre, no podrá recuperarla (ni siquiera con magia de capibara)',
        async () => {
          try {
            // ⭐ MOSTRAR OVERLAY INMEDIATAMENTE DESPUÉS DE CONFIRMAR ⭐
            if (isCurrentChat) {
              showDeleteChatOverlay();
            }

            await deleteChat(chatId, true);

            const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatItem) {
              eventManager.removeFromElement(chatItem);
              chatItem.remove();
            }

            acadelExito(
              "🗑️ ¡Conversación eliminada!",
              "Acadel limpió exitosamente tu espacio de trabajo académico"
            );

            if (isCurrentChat) {
              ChatUtils.closeMathPanels();

              // Cerrar panel de YouTube y resetear audio
              try {
                if (window.youtubePanel) {
                  window.youtubePanel.videoData = null;
                  window.youtubePanel.audioData = null;
                  window.youtubePanel.currentMode = null;

                  if (window.youtubePanel.isVisible && typeof window.youtubePanel.togglePanel === 'function') {
                    window.youtubePanel.togglePanel();
                  }
                }

                if (window.audioPanel) {
                  const audioMenu = document.querySelector('.audio-menu');
                  if (audioMenu && audioMenu.style.display === 'block') {
                    if (typeof window.audioPanel.closeAudioMenu === 'function') {
                      window.audioPanel.closeAudioMenu();
                    }
                  }
                }
              } catch (e) {
                console.warn('Error al resetear componentes de audio/video:', e);
              }

              document.querySelectorAll('.sidebar-item.active').forEach(item => {
                item.classList.remove('active');
              });

              setCurrentChat(null);

              const headerSubtitle = document.querySelector('.header-subtitle');
              if (headerSubtitle) {
                headerSubtitle.textContent = 'Asistente virtual académico';
                headerSubtitle.removeAttribute('title');
              }

              if (typeof uiModule.clearChatMessages === 'function') {
                uiModule.clearChatMessages();
              } else {
                const chatMessages = domManager.chatMessages;
                if (chatMessages) {
                  chatMessages.innerHTML = '';
                }
              }

              if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.basePath) {
                history.pushState({}, '', URL_CONFIG.basePath);
              } else {
                history.pushState({}, '', '/agente');
              }

              // ⭐ PREPARAR BIENVENIDA Y OCULTAR OVERLAY ⭐
              setTimeout(() => {
                const textarea = domManager.textarea;
                const fixedSpace = domManager.fixedSpace;

                if (textarea && fixedSpace) {
                  textarea.value = '';
                  fixedSpace.style.opacity = '0';
                  fixedSpace.style.display = 'none';
                  fixedSpace.style.pointerEvents = 'none';
                  fixedSpace.style.overflow = 'hidden';
                  void fixedSpace.offsetHeight;

                  if (typeof clearAttachedFiles === 'function') {
                    clearAttachedFiles();
                  }

                  setTimeout(() => {
                    hideDeleteChatOverlay();
                    showWelcomeMessage();
                  }, 150);
                } else {
                  hideDeleteChatOverlay();
                  showWelcomeMessage();
                }
              }, 100);
            } else {
              hideDeleteChatOverlay();
            }

            if (typeof chatModule.loadChatHistory === 'function') {
              const updatedChats = await chatModule.loadChatHistory();
              import('../ui/sidebar-agente.js').then(module => {
                if (typeof module.renderChatHistory === 'function') {
                  module.renderChatHistory(updatedChats);
                }
              }).catch(e => console.warn('Error al renderizar historial:', e));
            }
          } catch (error) {
            console.error('Error al eliminar chat:', error);
            hideDeleteChatOverlay();

            if (confirm('No se pudo eliminar el chat de la base de datos. ¿Deseas eliminarlo de la lista de todos modos?')) {
              if (isCurrentChat) {
                showDeleteChatOverlay();
              }

              const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
              if (chatItem) {
                chatItem.remove();
              }

              acadelExito(
                "📋 Chat removido de la lista",
                "Acadel organizó tu interfaz como buen profesor ordenado"
              );

              if (isCurrentChat) {
                setTimeout(() => {
                  const fixedSpace = domManager.fixedSpace;
                  if (fixedSpace) {
                    fixedSpace.style.opacity = '0';
                    fixedSpace.style.display = 'none';
                    fixedSpace.style.pointerEvents = 'none';
                    fixedSpace.style.overflow = 'hidden';
                    void fixedSpace.offsetHeight;
                  }

                  if (typeof uiModule.clearChatMessages === 'function') {
                    uiModule.clearChatMessages();
                  }

                  setCurrentChat(null);
                  history.pushState({}, '', URL_CONFIG.basePath || '/agente');

                  setTimeout(() => {
                    hideDeleteChatOverlay();
                    showWelcomeMessage();
                  }, 150);
                }, 100);
              } else {
                hideDeleteChatOverlay();
              }
            } else {
              hideDeleteChatOverlay();
            }
          }
        },
        null
      );
    } else {
      if (confirm('¿Estás seguro de que deseas eliminar esta conversación?')) {
        // Mismo código pero con confirm básico...
      }
    }
  } catch (error) {
    console.error('Error general en handleDeleteChat:', error);
    hideDeleteChatOverlay();
    acadelError(
      "❌ No se pudo eliminar la conversación",
      "Acadel encontró un obstáculo, pero puedes intentarlo de nuevo"
    );
  }

  domManager.invalidate(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);
}

function showDeleteChatOverlay() {
  if (document.querySelector('.delete-chat-overlay')) {
    console.log('Overlay de eliminación ya existe');
    return;
  }

  console.log('🗑️ Mostrando overlay de eliminación de chat');

  const spinner = document.createElement('div');
  spinner.className = 'delete-chat-spinner';

  const text = document.createElement('div');
  text.className = 'delete-chat-text';
  text.textContent = '🗑️ Eliminando conversación...';

  const subtitle = document.createElement('div');
  subtitle.className = 'delete-chat-subtitle';
  subtitle.textContent = 'Acadel está limpiando su archivo de esta conversación';

  const spinnerContainer = document.createElement('div');
  spinnerContainer.className = 'delete-chat-spinner-container';
  spinnerContainer.appendChild(spinner);
  spinnerContainer.appendChild(text);
  spinnerContainer.appendChild(subtitle);

  const overlay = document.createElement('div');
  overlay.className = 'delete-chat-overlay';
  overlay.id = 'delete-chat-overlay-' + Date.now();
  overlay.appendChild(spinnerContainer);

  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  window.currentDeleteChatOverlay = overlay;
}

/**
 * ⭐ Oculta overlay de eliminación de chat ⭐
 */
function hideDeleteChatOverlay() {
  const overlay = window.currentDeleteChatOverlay || document.querySelector('.delete-chat-overlay');

  if (!overlay) {
    console.log('No hay overlay de eliminación para ocultar');
    return;
  }

  console.log('✅ Ocultando overlay de eliminación de chat');

  overlay.style.opacity = '0';

  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    window.currentDeleteChatOverlay = null;
  }, 300);
}

/**
 * Cierra modales existentes
 */
function closeExistingModals() {
  const activeModals = document.querySelectorAll('.modal, .custom-modal, .modal-backdrop, .empty-chat-modal');

  activeModals.forEach(modal => {
    const closeButtons = modal.querySelectorAll('.close-modal, .modal-close, #emptyModalClose, .btn-close, .close');

    let closed = false;
    if (closeButtons.length > 0) {
      closeButtons[0].click();
      closed = true;
    }

    if (!closed) {
      modal.classList.remove('show', 'fade', 'in');
      modal.style.display = 'none';

      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 100);
    }
  });

  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}

/**
 * Realiza la eliminación del chat
 */
async function performChatDeletion(chatId, isCurrentChat, deleteChat, setCurrentChat, uiModule, chatModule) {
  try {
    await deleteChat(chatId, true);

    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (chatItem) {
      eventManager.removeFromElement(chatItem);
      chatItem.remove();
    }

    if (isCurrentChat) {
      ChatUtils.closeMathPanels();

      // NUEVO: Cerrar panel de YouTube y resetear audio
      try {
        // Resetear panel de YouTube
        if (window.youtubePanel) {
          window.youtubePanel.videoData = null;
          window.youtubePanel.audioData = null;
          window.youtubePanel.currentMode = null;

          // Cerrar el panel si está visible
          if (window.youtubePanel.isVisible && typeof window.youtubePanel.togglePanel === 'function') {
            window.youtubePanel.togglePanel();
          }
        }

        // Cerrar menú de audio si está abierto
        if (window.audioPanel) {
          const audioMenu = document.querySelector('.audio-menu');
          if (audioMenu && audioMenu.style.display === 'block') {
            if (typeof window.audioPanel.closeAudioMenu === 'function') {
              window.audioPanel.closeAudioMenu();
            }
          }
        }
      } catch (e) {
        console.warn('Error al resetear componentes de audio/video durante eliminación:', e);
      }

      document.querySelectorAll('.sidebar-item.active').forEach(item => {
        item.classList.remove('active');
      });

      setCurrentChat(null);

      const headerSubtitle = document.querySelector('.header-subtitle');
      if (headerSubtitle) {
        headerSubtitle.textContent = 'Asistente virtual académico';
        headerSubtitle.removeAttribute('title');
      }

      if (typeof uiModule.clearChatMessages === 'function') {
        uiModule.clearChatMessages();
      } else {
        const chatMessages = domManager.chatMessages;
        if (chatMessages) {
          chatMessages.innerHTML = '';
        }
      }

      if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.basePath) {
        history.pushState({}, '', URL_CONFIG.basePath);
      } else {
        history.pushState({}, '', '/agente');
      }

      prepareForWelcomeMessage();
    }

    if (typeof uiModule.hideLoading === 'function') {
      uiModule.hideLoading();
    }

    acadelExito(
      "🗑️ ¡Conversación eliminada!",
      "Acadel limpió exitosamente tu espacio de trabajo académico"
    );

    if (typeof chatModule.loadChatHistory === 'function') {
      const updatedChats = await chatModule.loadChatHistory();
      import('../ui/sidebar-agente.js').then(module => {
        if (typeof module.renderChatHistory === 'function') {
          module.renderChatHistory(updatedChats);
        }
      }).catch(e => console.warn('Error al renderizar historial:', e));
    }
  } catch (error) {
    console.error('Error al eliminar chat:', error);

    if (typeof uiModule.hideLoading === 'function') {
      uiModule.hideLoading();
    }

    if (confirm('No se pudo eliminar el chat de la base de datos. ¿Deseas eliminarlo de la lista de todos modos?')) {
      const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
      if (chatItem) {
        chatItem.remove();
      }

      if (isCurrentChat) {
        prepareForWelcomeMessage();
      }

      acadelExito(
        "📋 Chat removido de la lista",
        "Acadel organizó tu interfaz como buen profesor ordenado"
      );

    }
  }
}

/**
 * Prepara la interfaz para mostrar el mensaje de bienvenida
 */
function prepareForWelcomeMessage() {
  const textarea = domManager.textarea;
  const fixedSpace = domManager.fixedSpace;

  if (!textarea || !fixedSpace) {
    showWelcomeMessage();
    return;
  }

  textarea.value = '';
  fixedSpace.style.opacity = '0';
  fixedSpace.style.display = 'none';
  fixedSpace.style.pointerEvents = 'none';
  fixedSpace.style.overflow = 'hidden';

  const chatMessages = domManager.chatMessages;
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }

  updateHeaderSubtitle(null);
  void fixedSpace.offsetHeight;

  if (typeof clearAttachedFiles === 'function') {
    clearAttachedFiles();
  }

  // NUEVO: Resetear completamente los botones para la pantalla de bienvenida
  try {
    // 1. Ocultar botón de YouTube
    const ytButton = document.querySelector('.youtube-panel-trigger');
    if (ytButton) {
      ytButton.style.display = 'none';
    }

    // 2. Intentar importar y reset programático del panel de YouTube
    import('../components/youtube-panel.js').then(module => {
      if (module.youtubePanel) {
        // Resetear datos internos
        module.youtubePanel.videoData = null;
        module.youtubePanel.audioData = null;
        module.youtubePanel.currentMode = null;

        // Asegurar que el botón esté oculto
        if (module.youtubePanel.triggerButton) {
          module.youtubePanel.triggerButton.style.display = 'none';
        }

        // Si el panel está visible, cerrarlo
        if (module.youtubePanel.isVisible && typeof module.youtubePanel.togglePanel === 'function') {
          module.youtubePanel.togglePanel();
        }

        // Llamar a resetPanelData si existe
        if (typeof module.youtubePanel.resetPanelData === 'function') {
          module.youtubePanel.resetPanelData();
        }
      }
    }).catch(e => console.warn('No se pudo resetear panel de YouTube:', e));

    // 3. Reset completo del panel de audio
    import('../components/audio-panel.js').then(module => {
      if (module.audioPanel) {
        // Primer paso: reset completo del panel si existe la función
        if (typeof module.audioPanel.resetPanel === 'function') {
          module.audioPanel.resetPanel();
        } else {
          // Liberación manual de recursos en caso de que resetPanel no exista
          if (typeof module.audioPanel.releaseMediaResources === 'function') {
            module.audioPanel.releaseMediaResources();
          }

          // Cerrar menú de audio si está abierto
          if (typeof module.audioPanel.closeAudioMenu === 'function') {
            const audioMenu = document.querySelector('.audio-menu');
            if (audioMenu && (audioMenu.style.display === 'block' || audioMenu.style.display === 'flex')) {
              module.audioPanel.closeAudioMenu();
            }
          }
        }
      }
    }).catch(e => console.warn('No se pudo resetear panel de audio:', e));
  } catch (e) {
    console.warn('Error al resetear componentes de media en prepareForWelcomeMessage:', e);
  }

  if (typeof setManagedTimeout === 'function') {
    setManagedTimeout(() => {
      showWelcomeMessage();
    }, 200, 'show-welcome-message');
  } else {
    setTimeout(() => {
      showWelcomeMessage();
    }, 200);
  }
}

/**
 * Oculta el procesador de YouTube
 */
function hideYouTubeProcessingLoader() {
  try {
    const loaderContainer = document.querySelector('.youtube-processing-loader');
    if (loaderContainer) {
      loaderContainer.classList.add('hide-loader');

      setTimeout(() => {
        if (loaderContainer.parentNode) {
          loaderContainer.parentNode.removeChild(loaderContainer);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error al ocultar loader de YouTube:', error);
  }
}

/**
 * Refresca el chat con nuevos mensajes después del procesamiento
 */
async function refreshChatWithNewMessages(chatId) {
  try {
    if (getState('currentChatId') !== chatId) return;

    const messages = await loadChatMessages(chatId);
    clearChatMessages();
    renderChatMessages(messages);

    acadelInfo(
      "📝 Transcripción integrada",
      "Acadel ha actualizado tu chat con el contenido transcrito"
    );
  } catch (error) {
    console.error('Error al refrescar mensajes después de procesamiento:', error);
  }
}

export { addMessageWithAttachmentsSimplified as addMessageWithAttachments };

// ✅ AÑADIR al final del archivo, después de las exportaciones:
if (typeof window !== 'undefined') {
  window.handleNewChat = handleNewChat;
}

export default {
  initChatController,
  handleSendMessage,
  handleNewChat,
  switchChat,
  hideDeleteChatOverlay,
  showDeleteChatOverlay,
  handleDeleteChat,
  // Exponer gestores para debugging/testing
  domManager,
  eventManager,
  utils: ChatUtils
};