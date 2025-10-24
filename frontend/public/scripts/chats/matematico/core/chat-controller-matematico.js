/**
 * chat-controller.js Mátematico - Controlador principal optimizado para las funciones de chat matemático
 * Versión optimizada con manejo robusto de transiciones, estados y gestión centralizada de DOM/eventos
 */

import { URL_CONFIG, getUrlConfig, getCurrentVariant, DOM_SELECTORS, getApiRoutes } from './config-matematico.js';
import { getState, setCurrentChat, setProcessingState, setMathPanelState } from './state-matematico.js';
import { createNewChat, loadChatMessages, loadChatHistory, deleteChat } from '../api/chat-matematico.js';
import { sendMessage, sendMessageWithAttachments } from '../api/messages-matematico.js';
import { processExistingDocuments, activateDocumentEvents } from '../ui/content-processing-matematico.js';
import {
  clearChatMessages,
  getElement,
  toggleUIState,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton,
  handleTextareaResize,
  reinitializeTextareaListeners
} from '../ui/ui-manager-matematico.js';
import {
  renderChatMessages,
  createLoadingMessage,
  replaceWithError,
  processServerResponse,
  replaceLoadingMessage
} from '../ui/message-renderer-matematico.js';
import {
  safeChatAction,
  isChatProblematic,
  showCleanupDialog,
  markChatAsProblem
} from '../utils/chat-error-handler-matematico.js';
import { validateUUID } from '../../shared/validators.js';
import { renderChatHistory, updateActiveSidebarItem } from '../ui/sidebar-matematico.js';
import { getAttachedFiles, clearAttachedFiles, hasAttachedFiles } from '../utils/file-attachments-matematico.js';
import { updateHeaderForChat, updateHeaderSubtitle } from "../ui/header-manager-matematico.js";
import { parseMarkdownToHTML } from "../utils/markdown-matematico.js";
import {
  sanitizeText,
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts,
  removeAllEvents,
  addClass,
  removeClass,
  hasClass,
  createElement
} from '../../shared/dom-helpers.js';
import { showWelcomeMessage, registerSendMessageHandler, clearDomCache, getCachedElement } from '../ui/welcome-message-matematico.js';
import { initCharacterLimit, exceedsLimit, showLimitExceededAlert, hideLimitAlert } from '../../shared/character-limit.js';
// ✅ REEMPLAZAR este import:
import { closeHeaderDropdown } from "../ui/header-manager-matematico.js";
import {
  showTokenLimitNotice,
  showSmartTokenNotice,
  clearTokenWarnings,
  showFreeUserAvaAccessNotice  // ← SOLO ESTA IMPORTACIÓN NUEVA
} from '../../shared/chat-notices.js';

// ===== SISTEMA DE GESTIÓN CENTRALIZADA =====

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
      console.log(`🧹 Chat temporal limpiado por error en creación`);
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
          const module = await import('../../shared/character-limit.js');
          if (typeof module.showLimitExceededAlert === 'function') {
            module.showLimitExceededAlert();
          }
        }
        return false;
      }
    } catch (e) {
      console.warn('Error al verificar límite de caracteres:', e);
      try {
        const module = await import('../../shared/character-limit.js');
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
    if (window.currentAbortController && !window.currentAbortController.signal.aborted) {
      try {
        window.currentAbortController.abort();
      } catch (e) {
        console.warn('Error al abortar controlador existente:', e);
      }
    }

    const abortController = new AbortController();
    window.currentAbortController = abortController;

    // Sincronización con ui-manager
    import('../ui/ui-manager-matematico.js').then(module => {
      if (typeof module.setCurrentFetchController === 'function') {
        module.setCurrentFetchController(abortController);
      }
    }).catch(err => console.warn('Error al sincronizar controlador:', err));

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

// ===== FUNCIONES PRINCIPALES OPTIMIZADAS =====

/**
 * Inicializa el controlador de chat con gestión optimizada
 */
export function initChatController() {
  // Limpiar gestores para reinicio limpio
  domManager.clearAll();
  eventManager.removeAll();

  // Cargar y limpiar chats problemáticos de forma más robusta
  Promise.all([
    import('../utils/chat-error-handler-matematico.js'),
    import('../api/chat-matematico.js'),
    import('../ui/sidebar-matematico.js')
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
        initCharacterLimit(e.target, { variant: getCurrentVariant() });
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
}


/**
 * Inicializa límites de caracteres con patrón optimizado
 */
function initializeCharacterLimit(textarea) {
  if (typeof initCharacterLimit === 'function') {
    initCharacterLimit(textarea, { variant: getCurrentVariant() });
  } else {
    import('../../shared/character-limit.js').then(module => {
      if (typeof module.initCharacterLimit === 'function') {
        module.initCharacterLimit(textarea, { variant: getCurrentVariant() });
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

/**
 * ✅ VERIFICACIÓN SIMPLIFICADA PARA AVA PREMIUM
 * Solo verifica tokens generales de conversación (50k límite)
 */
async function checkTokensBeforeSend(chatId) {
  if (!chatId) return { canProceed: true, warningInfo: null };

  try {
    const apiRoutes = getApiRoutes();
    const response = await fetch(apiRoutes.checkTokenLimits, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId })
    });

    if (response.ok) {
      const data = await response.json();

      // ✅ SOLO procesar tokenInfo general (no límites de usuario)
      if (data.tokenInfo && data.tokenInfo.current && data.tokenInfo.max) {
        const { current, max } = data.tokenInfo;
        console.log(`📊 [AVA] Tokens del chat: ${current}/${max}`);

        return {
          canProceed: true,
          warningInfo: {
            current,
            max,
            percentage: data.tokenInfo.percentage,
            source: 'ava_chat_tokens'
          }
        };
      }

      return { canProceed: true, warningInfo: null };
    }

    // ✅ SOLO manejar error 429 de tokens de chat excedidos
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));

      if (errorData.error?.code === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED') {
        return {
          canProceed: false,
          error: {
            code: 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
            message: errorData.error.message || 'Esta conversación ha alcanzado su límite de capacidad',
            maxTokens: errorData.tokenInfo?.max
          },
          tokenLimitExceeded: true,
          warningInfo: errorData.tokenInfo
        };
      }
    }

    return { canProceed: true, warningInfo: null };

  } catch (error) {
    console.warn('Error al verificar tokens del chat:', error);
    return { canProceed: true, warningInfo: null };
  }
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
    import('../math/mathjax-config.js').then(module => {
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
    // ⭐ CONTENEDOR UNIFICADO PARA TODOS LOS ARCHIVOS ⭐
    html += `<div class="unified-attachments">`;

    // ⭐ PROCESAR ARCHIVOS PRESERVANDO ORDEN ORIGINAL ⭐
    files.forEach((file, index) => {
      console.log(`📎 Procesando archivo ${index + 1}/${files.length}: ${file.file.name}`);

      if (file.type === 'image') {
        // Renderizar imagen directamente
        if (file.data && file.data.base64) {
          html += `
          <div class="chat-image-item clickable">
            <img src="${sanitize(file.data.base64)}" alt="Imagen adjunta" data-original-src="${sanitize(file.data.base64)}">
          </div>
        `;
        } else {
          html += `
            <div class="attachment-indicator image">
              <i class='bx bx-image'></i>
              <span>${sanitize(file.file.name)}</span>
            </div>
          `;
        }
      } else if (file.type === 'document' || file.type === 'code') {
        // ⭐ RENDERIZAR DOCUMENTO CON ORDEN PRESERVADO ⭐
        const extension = file.file.name.split('.').pop().toLowerCase();
        let iconClass = 'bxs-file-txt';
        let attachmentType = 'document';

        if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html', 'php', 'rb'].includes(extension)) {
          iconClass = 'bx-code-alt';
          attachmentType = 'code';
        } else if (['pdf'].includes(extension)) {
          iconClass = 'bxs-file-pdf';
          attachmentType = 'pdf';
        } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
          iconClass = 'bxs-spreadsheet';
          attachmentType = 'excel';
        } else if (['zip', 'rar', '7z'].includes(extension)) {
          iconClass = 'bxs-file-archive';
          attachmentType = 'zip';
        }

        const fileName = file.file.name.length > 12 ? file.file.name.substring(0, 9) + '...' : file.file.name;
        const fileSize = ((file.file.size || 0) / 1024).toFixed(1);

        // ⭐ CRÍTICO: Usar nombre completo en data-file-name para mapeo correcto ⭐
        html += `
          <div class="document-preview temp-preview" 
               data-file-name="${sanitize(file.file.name)}"
               data-attachment-type="${attachmentType}"
               data-language="${extension}"
               data-original-index="${index}"
               title="${sanitize(file.file.name)}">
            <i class="bx ${iconClass} document-icon"></i>
            <span class="document-name">${sanitize(fileName)}</span>
            <small class="document-size">${fileSize} KB</small>
          </div>
        `;

        console.log(`✅ Documento renderizado: "${file.file.name}" con índice ${index}`);
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
function processServerResponseDocuments(data, messageElement) {
  if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
    console.log('📄 Actualizando documentos temporales con fileIds del servidor...');

    const tempPreviews = messageElement.querySelectorAll('.document-preview.temp-preview');

    console.log(`🔍 Debug: ${tempPreviews.length} previews temporales, ${data.documents.length} documentos del servidor`);

    // ⭐ NUEVO: Crear mapas para mejor búsqueda ⭐
    const serverDocsMap = new Map();
    data.documents.forEach(doc => {
      if (doc.originalName && doc.fileId) {
        serverDocsMap.set(doc.originalName, doc);
        console.log(`📋 Mapeando servidor: "${doc.originalName}" -> ${doc.fileId}`);
      }
    });

    const tempPreviewsMap = new Map();
    tempPreviews.forEach(preview => {
      const fileName = preview.dataset.fileName;
      if (fileName) {
        tempPreviewsMap.set(fileName, preview);
        console.log(`📋 Mapeando temporal: "${fileName}"`);
      }
    });

    // ⭐ MAPEO CORREGIDO: Por nombre de archivo ⭐
    let successCount = 0;
    let failCount = 0;

    for (const [fileName, serverDoc] of serverDocsMap) {
      const tempPreview = tempPreviewsMap.get(fileName);

      if (tempPreview && serverDoc.fileId) {
        // ✅ MAPEO CORRECTO ENCONTRADO
        tempPreview.dataset.fileId = serverDoc.fileId;
        tempPreview.classList.remove('temp-preview');
        tempPreview.classList.add('clickable');

        if (serverDoc.attachmentType) {
          tempPreview.dataset.attachmentType = serverDoc.attachmentType;
        }
        if (serverDoc.language) {
          tempPreview.dataset.language = serverDoc.language;
        }

        console.log(`✅ Documento mapeado correctamente: "${fileName}" -> ${serverDoc.fileId}`);
        successCount++;
      } else {
        console.warn(`⚠️ No se pudo mapear: "${fileName}" (tempPreview: ${!!tempPreview}, fileId: ${serverDoc.fileId})`);
        failCount++;
      }
    }

    // ⭐ FALLBACK: Si hay previews que no se mapearon, intentar por posición como último recurso ⭐
    const unmappedPreviews = Array.from(tempPreviews).filter(preview =>
      preview.classList.contains('temp-preview')
    );

    if (unmappedPreviews.length > 0 && failCount > 0) {
      console.warn(`🔄 Fallback: Intentando mapear ${unmappedPreviews.length} documentos restantes por posición...`);

      unmappedPreviews.forEach((tempPreview, index) => {
        const serverDoc = data.documents[index];
        if (serverDoc && serverDoc.fileId) {
          tempPreview.dataset.fileId = serverDoc.fileId;
          tempPreview.classList.remove('temp-preview');
          tempPreview.classList.add('clickable');

          if (serverDoc.attachmentType) {
            tempPreview.dataset.attachmentType = serverDoc.attachmentType;
          }
          if (serverDoc.language) {
            tempPreview.dataset.language = serverDoc.language;
          }

          console.log(`🔄 Documento mapeado por fallback: ${serverDoc.originalName} -> ${serverDoc.fileId}`);
          successCount++;
        }
      });
    }

    console.log(`📊 Resultado del mapeo: ${successCount} exitosos, ${failCount} fallidos`);

    // Activar eventos de click para los documentos actualizados
    activateDocumentEvents(messageElement);
  }
}

/**
 * 🦫 SISTEMA DE MENSAJES DINÁMICOS PARA ACADEL PENSANDO
 * Mensajes variados para hacer la experiencia más divertida
 */

// 🧠 ARRAY DE MENSAJES VARIADOS PARA "ACADEL ESTÁ PENSANDO"
const ACADEL_THINKING_MESSAGES = [
  // Mensajes básicos de pensamiento
  {
    title: "🧠 Acadel está pensando",
    message: "Procesando tu consulta con inteligencia de capibara..."
  },
  {
    title: "🤔 Acadel analiza tu pregunta",
    message: "Su cerebro académico está conectando ideas como un genio peludo"
  },
  {
    title: "💭 Acadel reflexiona profundamente",
    message: "Organizando conocimientos en su biblioteca mental de capibara"
  },

  // Mensajes más específicos y divertidos
  {
    title: "🎓 Acadel consulta sus apuntes",
    message: "Revisando datos con la precisión de un capibara estudioso"
  },
  {
    title: "🔍 Acadel investiga tu consulta",
    message: "Escaneando información con lupa académica de alta tecnología"
  },
  {
    title: "⚡ Acadel procesa datos",
    message: "Su CPU de capibara está funcionando a máxima velocidad"
  },

  // Mensajes creativos con personalidad
  {
    title: "🌟 Acadel está inspirado",
    message: "Generando una respuesta digna de su inteligencia de capibara"
  },
  {
    title: "🎯 Acadel se concentra",
    message: "Enfocando toda su sabiduría académica en tu pregunta"
  },
  {
    title: "🚀 Acadel despega mentalmente",
    message: "Su mente vuela más alto que un capibara en cohete espacial"
  },

  // Mensajes técnicos pero divertidos
  {
    title: "⚙️ Acadel calibra su respuesta",
    message: "Ajustando parámetros para darte la mejor explicación posible"
  },
  {
    title: "🔬 Acadel analiza científicamente",
    message: "Aplicando método científico con toque de capibara genial"
  },
  {
    title: "📚 Acadel hojea sus libros",
    message: "Consultando su vasta biblioteca mental de conocimientos"
  },

  // Mensajes para diferentes contextos
  {
    title: "🎨 Acadel crea una respuesta",
    message: "Diseñando una explicación tan bella como educativa"
  },
  {
    title: "🧪 Acadel experimenta ideas",
    message: "Mezclando conceptos en su laboratorio mental de capibara"
  },
  {
    title: "🎪 Acadel prepara el espectáculo",
    message: "Organizando conocimientos para un show académico increíble"
  }
];

// ⏳ ARRAY DE MENSAJES VARIADOS PARA "OPERACIÓN LENTA" (8+ segundos)
const ACADEL_PATIENCE_MESSAGES = [
  // Mensajes clásicos de paciencia
  {
    title: "⏳ Acadel está trabajando intensamente...",
    message: "Esta consulta está tomando más tiempo del usual. Acadel pide paciencia mientras su cerebro de capibara procesa todo con cuidado"
  },
  {
    title: "🔥 Acadel está en modo intensivo",
    message: "Su procesador de capibara está al máximo. Un poquito más de paciencia para una respuesta genial"
  },
  {
    title: "⚡ Acadel sobrecarga su CPU",
    message: "Está usando toda su potencia mental de capibara. La espera valdrá la pena, lo promete"
  },

  // Mensajes divertidos sobre el tiempo
  {
    title: "🕰️ Acadel perdió la noción del tiempo",
    message: "Se emocionó tanto con tu pregunta que está dando lo mejor de sí. Un momentito más..."
  },
  {
    title: "🐌 Acadel va más lento que caracol académico",
    message: "Pero es porque está siendo extra cuidadoso. Los capibaras genios no se apuran"
  },
  {
    title: "⏰ El tiempo vuela cuando Acadel piensa",
    message: "Para él han sido microsegundos, pero promete acelerar su cerebrito peludo"
  },

  // Mensajes técnicos pero graciosos
  {
    title: "🔧 Acadel está en mantenimiento mental",
    message: "Reorganizando neuronas para darte la mejor respuesta posible. Casi termina..."
  },
  {
    title: "💾 Acadel procesa datos complejos",
    message: "Su disco duro de capibara está trabajando horas extra. Un poquito más de espera"
  },
  {
    title: "🖥️ Acadel reinicia su sistema",
    message: "A veces hasta los capibaras más inteligentes necesitan un soft reset mental"
  },

  // Mensajes motivacionales
  {
    title: "🎯 Acadel perfecciona su respuesta",
    message: "No quiere darte cualquier cosa, está puliendo cada detalle como el perfeccionista que es"
  },
  {
    title: "🏆 Acadel busca la respuesta perfecta",
    message: "Su estándar de calidad de capibara es muy alto. La paciencia será recompensada"
  },
  {
    title: "⭐ Acadel está creando algo especial",
    message: "Cuando tarda más es porque está preparando una respuesta que te va a encantar"
  },

  // Mensajes con humor capibara
  {
    title: "🦫 Acadel necesita más café mental",
    message: "Su cerebro de capibara está pidiendo combustible extra. Procesando... procesando..."
  },
  {
    title: "🧘 Acadel medita la respuesta perfecta",
    message: "Los capibaras sabios no se apuran. La paciencia es una virtud académica"
  },
  {
    title: "🎨 Acadel pinta su respuesta con cuidado",
    message: "Cada palabra está siendo seleccionada con precisión artística de capibara"
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
 * ✅ FUNCIÓN COMPLETAMENTE CORREGIDA: handleSendMessage
 * REEMPLAZAR la función handleSendMessage existente con esta versión
 * 
 * CORRIGE:
 * 1. Manejo completo cuando se excede límite en pre-validación
 * 2. Limpieza de estado y notificaciones
 * 3. Mostrar avisos apropiados al usuario
 * 4. Restauración completa de UI
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
    // 🦫 NOTIFICACIÓN INMEDIATA DE PROCESAMIENTO
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
      // Limpiar y salir
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

    // ⚡ CREAR UI ELEMENTOS DE FORMA DIFERIDA
    // Crear mensaje del usuario (diferido)
    if (originalMessage || hasAttachments) {
      messageElement = addMessageWithAttachmentsSimplified('user', originalMessage, attachedFiles);
    }

    // ⚡ LIMPIAR PREVIEW CONTAINER INMEDIATAMENTE (ANTES DEL ENVÍO)
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
        import('../ui/ui-manager-matematico.js').then(module => {
          if (typeof module.handleTextareaResize === 'function') {
            module.handleTextareaResize({ target: textarea });
          }
        }).catch(() => { });
      });
    }

    // Crear loading message (diferido)
    loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);

    // ⚡ DIFERIR OPERACIONES DE SCROLL (no críticas)
    setTimeout(() => {
      if (messageElement) {
        scrollManager.scrollToElement(messageElement, {
          priority: 'normal',
          reason: 'new-user-message'
        });
      }

      if (loadingMessage) {
        scrollManager.scrollToElement(loadingMessage, {
          priority: 'normal',
          reason: 'loading-message-added'
        });
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
            "📄 Procesando tu archivo",
            `Acadel está examinando "${fileName}" (${fileSize} KB) con lupa académica`
          );
        } else {
          const totalSize = attachedFiles.reduce((sum, file) => sum + file.file.size, 0);
          const totalSizeKB = (totalSize / 1024).toFixed(1);
          acadelInfo(
            "📎 Procesando múltiples archivos",
            `Acadel está analizando ${attachedFiles.length} archivos (${totalSizeKB} KB total).`
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

    // Configurar controlador de aborto
    const abortController = ChatUtils.setupAbortController();

    // 🦫 AVISO PARA OPERACIONES LENTAS (GUARDANDO REFERENCIA)
    slowOperationTimeout = setTimeout(() => {
      if (getState('isProcessing')) {
        // Cerrar notificación de pensamiento
        if (thinkingNotificationId) {
          acadelCerrar(thinkingNotificationId);
          thinkingNotificationId = null;
        }

        // Crear notificación de paciencia Y GUARDAR REFERENCIA
        const randomPatience = getRandomPatienceMessage();
        slowOperationNotificationId = acadelLoading(
          randomPatience.title,
          randomPatience.message
        );

        console.log('⏳ Notificación de operación lenta creada:', slowOperationNotificationId);
      }
    }, 8000);

    // 🔄 CREAR NUEVO CHAT SI ES NECESARIO
    if (isNewChat) {
      const newChat = await createNewChat(originalMessage || "Nueva conversación");
      newChatId = newChat.id;
      setCurrentChat(newChat.id);
      window.tempChatIdForFiles = newChatId;

      // CRÍTICO: Marcar que este chat está en proceso de creación
      window._chatBeingCreated = newChatId;
      console.log('🔒 Marcando chat en creación:', newChatId);

      // Diferir limpieza de event listeners (NO archivos)
      setTimeout(() => {
        const usingTemporaryFiles = temporaryFiles && temporaryFiles.length > 0;
        if (!usingTemporaryFiles) {
          import('../utils/file-attachments-matematico.js').then(module => {
            if (typeof module.cleanupAllEventListeners === 'function') {
              module.cleanupAllEventListeners();
            }
          });
        }
        restoreDragAndDrop();
      }, 100);
    }

    // 🚀 ENVIAR MENSAJE AL SERVIDOR
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
 * Maneja errores en el envío de mensajes
 */
async function handleSendMessageError(error, isNewChat, newChatId, currentChatId) {
  if (isNewChat && newChatId) {
    markChatAsProblem(newChatId);
    setTimeout(() => handleNewChat(), 2500);
  } else if (currentChatId) {
    markChatAsProblem(currentChatId);
    try {
      await deleteChat(newChatId);
    } catch (deleteError) {
      console.warn(`Error al eliminar chat con error:`, deleteError);
    }

    const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
    if (chatItem) {
      chatItem.style.opacity = '0.5';
      chatItem.style.transition = 'opacity 0.2s ease-out';
      setTimeout(() => chatItem.remove(), 200);
    }

    setTimeout(async () => {
      try {
        const { loadChatHistory } = await import('../api/chat-matematico.js');
        const { renderChatHistory } = await import('../ui/sidebar-matematico.js');
        const updatedChats = await loadChatHistory();
        renderChatHistory(updatedChats);
      } catch (sidebarError) {
        console.warn('Error al actualizar sidebar después de error:', sidebarError);
      }
    }, 300);
  }
}

/**
 * ✅ renderSuccessfulResponse CORREGIDA - SOLO BACKEND REAL
 * REEMPLAZAR TODA la función renderSuccessfulResponse en chat-controller.js
 * 
 * SIN TRUNCAMIENTO - Solo flags que SÍ existen en TokenManager actual
 */
async function renderSuccessfulResponse(data, loadingMessage, isNewChat, newChatId, tokenCheck = null) {
  await new Promise(resolve => requestAnimationFrame(resolve));

  if (loadingMessage?.parentNode) {
    if (typeof window.processAndRenderResponse === 'function') {
      window.processAndRenderResponse(data, loadingMessage);
    } else {
      const { type, content } = processServerResponse(data);
      replaceLoadingMessage(loadingMessage, content, type);

      // 🎯 SISTEMA SIMPLIFICADO: Solo usar detectAndShowNotices() 
      console.group('🎯 [FRONTEND] Procesando avisos del backend REAL');

      try {
        // ✅ MÉTODO 1: Usar detectAndShowNotices() del sistema de avisos
        if (typeof window.AcadelChatNotices?.detectAndShowNotices === 'function') {
          console.log('🎯 [FRONTEND] Usando detectAndShowNotices()...');
          window.AcadelChatNotices.detectAndShowNotices(loadingMessage, data);
        }
        // ✅ MÉTODO 2: Fallback a función importada
        else if (typeof detectAndShowNotices === 'function') {
          console.log('🎯 [FRONTEND] Usando detectAndShowNotices() importada...');
          detectAndShowNotices(loadingMessage, data);
        }
        // ✅ MÉTODO 3: Solo flags REALES del TokenManager actual
        else {
          console.log('🎯 [FRONTEND] Verificando flags REALES del TokenManager...');

          // 🚫 BYPASS ADMIN
          if (data.accessInfo?.isAdmin || data.tokenInfo?.isAdmin) {
            console.log('👑 [FRONTEND] Admin detectado - Sin avisos');
          }
          // ✅ SOLO FLAGS REALES que genera TokenManager.addWarningFlags()
          else if (data._shouldShowTokenWarning || data._hasPostWarning || data._hasPreWarning) {
            console.log('⚠️ [FRONTEND] Flags REALES del TokenManager detectados:', {
              shouldShowTokenWarning: data._shouldShowTokenWarning,
              hasPostWarning: data._hasPostWarning,
              hasPreWarning: data._hasPreWarning,
              postWarningLevel: data._postWarningLevel,
              warningPercentage: data._warningPercentage
            });

            if (data.tokenInfo && data.tokenInfo.current && data.tokenInfo.max) {
              if (typeof showSmartTokenNotice === 'function') {
                const result = showSmartTokenNotice(
                  loadingMessage,
                  data.tokenInfo.current,
                  data.tokenInfo.max,
                  data.tokenInfo.percentage || data._warningPercentage,
                  data.tokenInfo
                );
                console.log(`🎯 [FRONTEND] showSmartTokenNotice result: ${result}`);
              }
            }
          }
          // ✅ VERIFICAR warnings en array del backend
          else if (data.warnings && Array.isArray(data.warnings)) {
            const tokenWarnings = data.warnings.filter(w =>
              w.type && w.type.includes('token') && w.level === 'high'
            );

            if (tokenWarnings.length > 0) {
              console.log(`📊 [FRONTEND] Token warnings en array: ${tokenWarnings.length}`);

              const warning = tokenWarnings[0];
              if (warning.tokenInfo || data.tokenInfo) {
                const tokenInfo = warning.tokenInfo || data.tokenInfo;

                if (typeof showSmartTokenNotice === 'function') {
                  showSmartTokenNotice(
                    loadingMessage,
                    tokenInfo.current,
                    tokenInfo.max,
                    tokenInfo.percentage,
                    tokenInfo
                  );
                }
              }
            }
          }
          else {
            console.log('ℹ️ [FRONTEND] No flags de warning detectados del backend actual');
          }
        }

        // ✅ ACTUALIZAR límites dinámicos
        if (data.tokenInfo && typeof window.AcadelChatNotices?.updateDynamicLimits === 'function') {
          window.AcadelChatNotices.updateDynamicLimits(data.tokenInfo);
        }
        // 🆕 FALLBACK: Usar tokenCheck si el backend no devolvió información completa
        if (!data.tokenInfo && tokenCheck && tokenCheck.warningInfo) {
          console.log('📊 [FRONTEND] Usando tokenCheck como fallback:', tokenCheck.warningInfo);

          if (typeof window.AcadelChatNotices?.updateDynamicLimits === 'function') {
            window.AcadelChatNotices.updateDynamicLimits(tokenCheck.warningInfo);
          }

          // Si hay warning en el pre-check, verificar si debe mostrarse
          if (typeof shouldShowWarning === 'function') {
            const shouldWarn = shouldShowWarning(
              tokenCheck.warningInfo.current,
              tokenCheck.warningInfo.max,
              tokenCheck.warningInfo
            );

            if (shouldWarn && typeof showSmartTokenNotice === 'function') {
              showSmartTokenNotice(
                loadingMessage,
                tokenCheck.warningInfo.current,
                tokenCheck.warningInfo.max,
                tokenCheck.warningInfo.percentage,
                tokenCheck.warningInfo
              );
              console.log('⚠️ [FRONTEND] Warning mostrado desde tokenCheck fallback');
            }
          }
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Error al procesar avisos:', error);
      }

      console.groupEnd();

      // ✅ RESTO DE LÓGICA EXISTENTE (sin cambios)
      const chatId = data.chatId || getState('currentChatId');
      if (chatId) {
        setTimeout(async () => {
          try {
            const { loadChatMessages } = await import('../api/chat-matematico.js');
            const messages = await loadChatMessages(chatId);
            if (!Array.isArray(messages) || messages.length < 2) return;

            updateMessageIds(messages);
            initializeResponseInteraction();
          } catch (error) {
            console.warn("Error al actualizar IDs:", error);
          }
        }, 400);
      }

      setTimeout(() => {
        import('../utils/response-interaction-matematico.js').then(module => {
          if (typeof module.initResponseInteraction === 'function') {
            const interaction = module.initResponseInteraction();
            const lastAiMessage = document.querySelector('.chat-messages .ai-message:last-child');
            if (lastAiMessage && !lastAiMessage.querySelector('.response-actions')) {
              interaction.addInteractionButtons(lastAiMessage);
            }
          }
        }).catch(e => console.warn('Error al iniciar interacción:', e));
      }, 500);
    }

    // ✅ MANTENER: Lógica de documentos y nuevo chat (sin cambios)
    if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
      const chatMessages = domManager.chatMessages;
      const userMessages = chatMessages.querySelectorAll('.user-message');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        processServerResponseDocuments(data, lastUserMessage);
      }
    }

    if (isNewChat && newChatId) {
      await handleNewChatSuccess(newChatId);

      // Limpiar flag de chat en creación
      if (window._chatBeingCreated === newChatId) {
        window._chatBeingCreated = null;
        console.log('✅ Chat creación completada:', newChatId);
      }

      setTimeout(() => {
        if (window.tempChatIdForFiles === newChatId) {
          window.tempChatIdForFiles = null;
          console.log(`🧹 Chat temporal limpiado después de establecer URL: ${newChatId}`);
        }
      }, 1000);
    } else {
      updateExistingChatPosition();
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
    const { initResponseInteraction } = await import('../utils/response-interaction-matematico.js');
    if (initResponseInteraction) {
      initResponseInteraction().processExistingMessages(true);
    }
  } catch (error) {
    console.warn("Error al inicializar interacción:", error);
  }
}

async function handleNewChatSuccess(newChatId) {
  // Limpiar problemas potenciales
  import('../utils/chat-error-handler-matematico.js').then(module => {
    if (module.problematicChatIds && module.problematicChatIds.has(newChatId)) {
      module.problematicChatIds.delete(newChatId);

      try {
        const storedProblems = JSON.parse(localStorage.getItem('problematicChats') || '[]');
        const updatedProblems = storedProblems.filter(id => id !== newChatId);
        localStorage.setItem('problematicChats', JSON.stringify(updatedProblems));
      } catch (e) {
        console.error('Error al actualizar localStorage:', e);
      }
    }
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
      import('../api/chat-matematico.js').then(module => {
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
 * ✅ FUNCIÓN MEJORADA: handleSendMessageCatch
 * REEMPLAZAR la función handleSendMessageCatch existente con esta versión
 * 
 * MEJORAS:
 * 1. Detección más robusta de errores de tokens
 * 2. Manejo específico para errores HTTP 429
 * 3. Mejor extracción de información de límites del backend
 * 4. Preservación de mensajes del usuario en errores de tokens
 */
async function handleSendMessageCatch(error, loadingMessage, isNewChat, newChatId, currentChatId, originalMessage) {
  console.group('🚨 HANDLE SEND MESSAGE CATCH');
  console.log('Error details:', {
    name: error.name,
    message: error.message,
    isFreeUserAvaError: error.isFreeUserAvaError,  // ← NUEVO
    isTokenLimit: error.isTokenLimit,
    isPreValidationLimit: error.isPreValidationLimit,
    status: error.status,
    isNewChat,
    hasLoadingMessage: !!loadingMessage
  });
  console.groupEnd();

  if (window._chatBeingCreated) {
    console.log('🧹 Limpiando flag de chat en creación por error');
    window._chatBeingCreated = null;
  }

  // 🦫 CASO 1: ERROR DE CANCELACIÓN
  if (error.name === 'AbortError') {
    console.log("🚫 Error de cancelación detectado");

    // 🔥 SOLO mostrar notificación si NO se mostró ya en cancelCurrentRequest
    if (!window._cancelNotificationAlreadyShown) {
      acadelInfo(
        "🛑 ¡Operación cancelada!",
        "Acadel detuvo la consulta como pediste. ¡No hay problema!"
      );
      console.log('ℹ️ Notificación de cancelación mostrada desde handleSendMessageCatch (fallback)');
    } else {
      console.log('ℹ️ Notificación de cancelación ya mostrada, omitiendo duplicación');
    }

    // Manejo específico para nuevos chats
    if (isNewChat && newChatId) {
      try {
        await deleteChat(newChatId);
        markChatAsProblem(newChatId);
      } catch (deleteError) {
        console.error('Error al eliminar chat cancelado:', deleteError);
        markChatAsProblem(newChatId);
      }
      setTimeout(() => handleNewChat(), 1500);
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
          }, 100);
        }
      }, 1000);
    }

    return; // Salir aquí para cancelación
  }

  if (error.isFreeUserAvaError && error.status === 402) {
    console.log('💳 [AVA 402] Usuario gratuito sin acceso detectado:', error);

    if (loadingMessage) {
      const avaName = error.avaInfo?.nom_ava || error.avaInfo?.name || 'contenido académico especializado';
      const careerName = error.careerInfo?.nombre || error.careerInfo?.name || 'esta carrera';

      replaceWithError(loadingMessage,
        `🔒 Acceso restringido: ${avaName}`,
        originalMessage
      );

      // ✅ MOSTRAR AVISO ESPECÍFICO PARA USUARIOS GRATUITOS
      setTimeout(() => {
        showFreeUserAvaAccessNotice(
          loadingMessage,
          avaName,
          careerName,
          error.upgradeInfo || {}
        );
      }, 300);
    }

    // 🚨 MARCAR CHAT COMO PROBLEMÁTICO (IGUAL QUE CANCELACIÓN)
    if (isNewChat && newChatId) {
      try {
        await deleteChat(newChatId);
        markChatAsProblem(newChatId);
        console.log(`🗑️ [AVA 402] Chat nuevo ${newChatId} eliminado y marcado como problemático`);
      } catch (deleteError) {
        console.error('Error al eliminar chat 402:', deleteError);
        markChatAsProblem(newChatId);
      }
      setTimeout(() => handleNewChat(), 2500);
    } else if (currentChatId) {
      markChatAsProblem(currentChatId);
      console.log(`⚠️ [AVA 402] Chat existente ${currentChatId} marcado como problemático`);
    }

    // 🧹 LIMPIAR CHAT TEMPORAL SI EXISTE
    if (window.tempChatIdForFiles === newChatId) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado por error AVA 402: ${newChatId}`);
    }

    // ✅ LIMPIAR SIDEBAR SI ES NECESARIO
    if (isNewChat && newChatId) {
      const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
      if (chatItem) {
        chatItem.style.opacity = '0.5';
        chatItem.style.transition = 'opacity 0.2s ease-out';
        setTimeout(() => chatItem.remove(), 200);
      }

      // 🔄 ACTUALIZAR SIDEBAR
      setTimeout(async () => {
        try {
          const { loadChatHistory } = await import('../api/chat-matematico.js');
          const { renderChatHistory } = await import('../ui/sidebar-matematico.js');
          const updatedChats = await loadChatHistory();
          renderChatHistory(updatedChats);
        } catch (sidebarError) {
          console.warn('Error al actualizar sidebar después de error AVA 402:', sidebarError);
        }
      }, 300);
    }

    // ✅ NOTIFICACIÓN DE ACADEL
    setTimeout(() => {
      acadelWarning(
        "🎓 ¡Zona VIP académica!",
        `Acadel detectó que intentas acceder a contenido premium. Los usuarios gratuitos necesitan suscripción para este nivel de conocimiento`
      );
    }, 500);

    return; // ← SALIR SIN MÁS PROCESAMIENTO
  }

  // ✅ FUNCIÓN AUXILIAR: Detectar errores de tokens de forma más robusta
  const isTokenError = (error) => {
    // Verificaciones directas en propiedades del error
    if (error.isTokenLimit || error.isPreValidationLimit) {
      return true;
    }

    // Verificaciones en códigos de error
    const errorCode = error.code || error.error?.code || '';
    const tokenErrorCodes = [
      'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
      'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED',
      'TOKEN_LIMITS.WARNING_THRESHOLD'
    ];

    if (tokenErrorCodes.includes(errorCode)) {
      return true;
    }

    // Verificaciones en status HTTP
    if (error.status === 429) {
      return true;
    }

    // Verificaciones en mensajes de error
    const errorMessage = error.message || error.error?.message || '';
    const tokenKeywords = [
      'TOKEN_LIMITS',
      'límite de tokens',
      'token limit',
      'excedido',
      'exceeded',
      'pre-validación',
      'proyectado',
      'estimated_limit_exceeded',
      'capacidad',
      'chat limit'
    ];

    return tokenKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // ✅ FUNCIÓN AUXILIAR: Extraer información de tokens del error
  const extractTokenInfo = (error) => {
    return {
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
  };

  // 🦫 CASO 2: ERRORES DE TOKENS (UNIFICADO)
  if (isTokenError(error)) {
    console.log('🚫 Error de tokens detectado:', error);

    const tokenInfo = extractTokenInfo(error);

    if (loadingMessage) {
      // ✅ MENSAJE SIN CANTIDADES ESPECÍFICAS pero más informativo
      let userFriendlyMessage = tokenInfo.errorMessage;

      // Personalizar mensaje según el tipo de error
      if (error.isPreValidationLimit) {
        userFriendlyMessage = 'La respuesta estimada excedería el límite de la conversación. Haz una pregunta más específica o inicia un nuevo chat.';
      } else if (error.status === 429) {
        userFriendlyMessage = 'El chat alcanzó su límite de capacidad. Inicia un nuevo chat para continuar.';
      }

      replaceWithError(loadingMessage, userFriendlyMessage, originalMessage);

      // ✅ MOSTRAR aviso específico SIN cantidades
      setTimeout(() => {
        if (typeof showTokenLimitNotice === 'function') {
          showTokenLimitNotice(loadingMessage, tokenInfo.maxTokens, tokenInfo.tokenInfo);
        }
      }, 300);
    }

    // ✅ NOTIFICACIÓN ACADÉMICA PERSONALIZADA
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

    // ✅ NO eliminar el chat por errores de tokens
    return;
  }

  // 🦫 CASO 3: ERRORES DE RED/CONEXIÓN
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

  // 🦫 CASO 4: ERRORES DE TIMEOUT
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

  // 🦫 CASO 5: ERRORES DE SERVIDOR
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

  // 🦫 CASO 6: ERRORES DE AUTENTICACIÓN
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

  // 🦫 CASO 7: ERRORES DE ARCHIVO/UPLOAD
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

  // 🦫 CASO 8: ERROR GENERAL (FALLBACK)
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

// =============================================================================
// 🦫 MEJORA EN ChatUtils.validateCharacterLimit
// =============================================================================

// REEMPLAZAR la función validateCharacterLimit en ChatUtils:
ChatUtils.validateCharacterLimit = async function (text) {
  if (!text) return true;

  try {
    if (typeof exceedsLimit === 'function' && exceedsLimit(text)) {
      // 🦫 USAR NUEVA FUNCIÓN DE ACADEL en lugar de showLimitExceededAlert
      if (typeof acadelWarning === 'function') {
        acadelWarning(
          "📝 ¡Mensaje muy extenso!",
          "Acadel dice: 'Incluso mi cerebro de capibara tiene límites'. Haz tu consulta más concisa, por favor"
        );
      } else if (typeof showLimitExceededAlert === 'function') {
        showLimitExceededAlert(); // Fallback que ahora usa Acadel internamente
      }
      return false;
    }
  } catch (e) {
    console.warn('Error al verificar límite de caracteres:', e);
    try {
      const module = await import('../../shared/character-limit.js');
      if (module.exceedsLimit && module.exceedsLimit(text)) {
        if (typeof acadelWarning === 'function') {
          acadelWarning(
            "📝 ¡Mensaje muy extenso!",
            "Acadel dice: 'Incluso mi cerebro de capibara tiene límites'. Haz tu consulta más concisa, por favor"
          );
        } else if (module.showLimitExceededAlert) {
          module.showLimitExceededAlert(); // Ahora internamente usa Acadel
        }
        return false;
      }
    } catch (innerError) {
      console.warn('Error en verificación alternativa de límite:', innerError);
    }
  }
  return true;
};


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
  } catch (deleteError) {
    console.warn('Error al eliminar chat del servidor:', deleteError);
  }

  const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
  if (chatItem) {
    chatItem.style.opacity = '0.5';
    chatItem.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => chatItem.remove(), 200);
  }

  import('../ui/sidebar-matematico.js').then(module => {
    if (typeof module.removeChatFromSidebar === 'function') {
      module.removeChatFromSidebar(newChatId);
    }

    import('../api/chat-matematico.js').then(async chatModule => {
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

  import('../ui/ui-manager-matematico.js').then(module => {
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
 * ✅ FUNCIÓN MODIFICADA: handleNewChat con limpieza simplificada
 */
export function handleNewChat() {
  // 🧹 LIMPIAR estado de avisos de tokens
  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }


  // 🔽 NUEVO: Cerrar dropdown del header
  closeHeaderDropdown();

  setTimeout(() => {
    acadelInfo(
      "🆕 ¡Nueva conversación iniciada!",
      "Acadel está emocionado de ayudarte con un tema completamente nuevo"
    );
  }, 500);

  // Verificar si ya estamos en la pantalla de bienvenida
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
        import('../components/preview-panel-matematico.js').then(module => {
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
 * ✅ FUNCIÓN MODIFICADA: switchChat con limpieza simplificada
 */
export async function switchChat(chatId) {
  console.log('🔄 switchChat llamado:', chatId);

  // VERIFICACIÓN CRÍTICA: Si estamos cambiando DESDE un chat siendo creado
  if (window._chatBeingCreated) {
    const creatingChatId = window._chatBeingCreated;
    console.log('⚠️ Detectado cambio desde chat en creación:', creatingChatId);

    // Limpiar el flag inmediatamente
    window._chatBeingCreated = null;

    // Si el AbortController actual tiene el chat en creación, NO abortarlo
    if (window.currentAbortController && !window.currentAbortController.signal.aborted) {
      console.log('🛡️ Protegiendo operación del chat en creación');
      // NO llamar abort() para permitir que termine de guardar
      window.currentAbortController = null;
    }
  }

  // 🧹 LIMPIAR estado de avisos de tokens
  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }

  // 🔽 NUEVO: Cerrar dropdown del header
  closeHeaderDropdown();


  if (window.isSwitchingChat) {
    return;
  }

  const pendingPromises = [];
  window.isSwitchingChat = true;

  // Configurar controlador de aborto
  const abortController = ChatUtils.setupAbortController();
  const signal = abortController.signal;

  try {
    // Validaciones iniciales
    const currentChatId = getState('currentChatId');
    if (currentChatId === chatId) {
      window.isSwitchingChat = false;
      return;
    }

    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }

    if (typeof isChatProblematic === 'function' && isChatProblematic(chatId)) {
      if (typeof showCleanupDialog === 'function') {
        showCleanupDialog(chatId);
      }
      window.isSwitchingChat = false;
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
    const { closePreviewPanel } = await import('../components/preview-panel-matematico.js');
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
    setCurrentChat(chatId);
  }

  if (typeof updateHeaderForChat === 'function') {
    updateHeaderForChat(chatId);
  }

  if (typeof updateActiveSidebarItem === 'function') {
    updateActiveSidebarItem(chatId);
  }

  const currentUrlConfig = getUrlConfig();
  const currentVariant = getCurrentVariant();
  if (currentUrlConfig && currentUrlConfig.chatPath) {
    history.pushState({}, '', currentUrlConfig.chatPath(chatId));
  } else {
    history.pushState({}, '', `/${currentVariant}/${chatId}`);
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

      // ⭐ CAMBIO PRINCIPAL: Reducir delay drásticamente de 300ms a 50ms ⭐
      setTimeout(() => {
        console.log('🔍 Procesando documentos existentes tras renderizado...');
        processExistingDocuments();
        processAllExistingMessages();

        // ⭐ NUEVO: Procesamiento inmediato adicional después de un momento ⭐
        requestAnimationFrame(() => {
          import('../ui/content-processing-matematico.js').then(contentModule => {
            if (typeof contentModule.processMessagesImmediately === 'function') {
              contentModule.processMessagesImmediately();
            }
          }).catch(e => console.warn('Error al importar procesamiento inmediato:', e));
        });
      }, 50); // Reducir de 300ms a 50ms
    }
  } catch (error) {
    const isAbortError = error.name === 'AbortError' ||
      error.message?.includes('aborted') ||
      signal.aborted;

    if (!isAbortError) {
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
      import('../utils/file-attachments-matematico.js').then(module => {
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
    import('../../shared/character-limit.js').then(module => {
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
          module.initCharacterLimit(currentTextarea, { variant: getCurrentVariant() });
        }
      }, 50);
    });

    // Auto-resize
    Promise.resolve().then(() => {
      import('../ui/ui-manager-matematico.js').then(module => {
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
 * ⭐ CORREGIDA: Intercepta el renderizado de mensajes usando override ⭐
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

      // ✅ CORREGIDO: Usar processMessageElement en lugar de processMessageElementImmediately
      requestAnimationFrame(() => {
        processMessageElement(newChild);
      });
    }

    return result;
  };

  console.log('✅ Interceptor de renderizado mejorado configurado');
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

  // ⭐ CAMBIO: Usar delays muy pequeños en lugar de eliminarlos completamente ⭐
  userMessages.forEach((messageElement, index) => {
    setTimeout(() => {
      processMessageElement(messageElement); // Usar la función original
    }, index * 2); // Reducir de 10ms a 2ms entre mensajes
  });

  // ⭐ NUEVO: Agregar procesamiento adicional inmediato DESPUÉS ⭐
  setTimeout(() => {
    import('../ui/content-processing-matematico.js').then(contentModule => {
      if (typeof contentModule.processMessagesImmediately === 'function') {
        contentModule.processMessagesImmediately();
      }
    }).catch(e => console.warn('Error al importar procesamiento adicional:', e));
  }, userMessages.length * 2 + 10); // Esperar a que termine el procesamiento original
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
      import('../ui/ui-manager-matematico.js').then(module => {
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
    window.isSwitchingChat = false;
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

        import('../ui/ui-manager-matematico.js').then(module => {
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
    window.isSwitchingChat = false;
  } catch (error) {
    console.warn('Error en finalCleanup:', error);
    window.isSwitchingChat = false;
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
          import('../ui/content-processing-matematico.js').then(contentModule => {
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
    'zip': 'bxs-file-archive'
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
 * ⭐ FUNCIÓN MODIFICADA: handleDeleteChat con overlay de eliminación ⭐
 * REEMPLAZAR la función handleDeleteChat existente en chat-controller-matematico.js
 */
export async function handleDeleteChat(chatId) {
  try {
    closeExistingModals();

    closeHeaderDropdown();

    const chatModule = await import('../api/chat-matematico.js');
    const uiModule = await import('../ui/ui-manager-matematico.js');
    const stateModule = await import('./state-matematico.js');

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

              // Cerrar preview panel si está abierto (específico de matemático)
              const previewPanel = document.querySelector('#preview-panel');
              if (previewPanel && previewPanel.classList.contains('open')) {
                try {
                  import('../components/preview-panel-matematico.js').then(module => {
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

              // Cerrar modales de previsualización
              const previewModal = domManager.previewModal;
              if (previewModal) {
                previewModal.classList.remove('show');
                previewModal.style.display = '';
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

              const currentUrlConfig = getUrlConfig();
              if (currentUrlConfig && currentUrlConfig.basePath) {
                history.pushState({}, '', currentUrlConfig.basePath);
              } else {
                history.pushState({}, '', '/matematico');
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
              import('../ui/sidebar-matematico.js').then(module => {
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
                  const currentUrlConfig = getUrlConfig();
                  const basePath = currentUrlConfig?.basePath || '/matematico';
                  history.pushState({}, '', basePath);

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
        try {
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
            prepareForWelcomeMessage();
            setTimeout(() => {
              hideDeleteChatOverlay();
            }, 300);
          } else {
            hideDeleteChatOverlay();
          }

          if (typeof chatModule.loadChatHistory === 'function') {
            const updatedChats = await chatModule.loadChatHistory();
            import('../ui/sidebar-matematico.js').then(module => {
              if (typeof module.renderChatHistory === 'function') {
                module.renderChatHistory(updatedChats);
              }
            }).catch(e => console.warn('Error al renderizar historial:', e));
          }
        } catch (error) {
          console.error('Error al eliminar chat:', error);
          hideDeleteChatOverlay();
          acadelError(
            "❌ No se pudo eliminar la conversación",
            "Acadel encontró un obstáculo, pero puedes intentarlo de nuevo"
          );
        }
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

/**
 * ⭐ NUEVA FUNCIÓN: Muestra overlay de eliminación de chat ⭐
 * AÑADIR esta función al chat-controller-matematico.js
 */
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
 * ⭐ NUEVA FUNCIÓN: Oculta overlay de eliminación de chat ⭐
 * AÑADIR esta función al chat-controller-matematico.js
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

      const currentUrlConfig = getUrlConfig();
      const currentVariant = getCurrentVariant();

      if (currentUrlConfig && currentUrlConfig.basePath) {
        history.pushState({}, '', currentUrlConfig.basePath);
      } else {
        history.pushState({}, '', `/${currentVariant}`);
      }

      prepareForWelcomeMessage();
    }

    if (typeof uiModule.hideLoading === 'function') {
      uiModule.hideLoading();
    }

    if (typeof chatModule.loadChatHistory === 'function') {
      const updatedChats = await chatModule.loadChatHistory();
      import('../ui/sidebar-matematico.js').then(module => {
        if (typeof module.renderChatHistory === 'function') {
          module.renderChatHistory(updatedChats);
        }
      }).catch(e => console.warn('Error al renderizar historial:', e));
    }

    // Mostrar mensaje de éxito cuando el chat se elimina correctamente
    acadelExito(
      "📋 Chat removido de la lista",
      "Acadel organizó tu interfaz como buen profesor ordenado"
    );

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

      if (typeof uiModule.showSuccess === 'function') {
        uiModule.showSuccess('Chat eliminado de la lista');
      } else {
        alert('Chat eliminado de la lista');
      }
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

  if (typeof setManagedTimeout === 'function') {
    setManagedTimeout(() => {
      showWelcomeMessage();
    }, 100, 'show-welcome-message');
  } else {
    setTimeout(() => {
      showWelcomeMessage();
    }, 100);
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
      import('../utils/file-attachments-matematico.js').then(module => {
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
              import('../utils/file-attachments-matematico.js').then(module => {
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
          import('../utils/file-attachments-matematico.js').then(module => {
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
    const mathEditorModule = await import('../math/interactive-math-editor.js').catch(() => null);
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
        const mathEditorModule = await import('../math/interactive-math-editor.js').catch(() => null);

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
        alert('El editor matemático no está disponible en este momento.');
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
        const mathEditorModule = await import('../math/interactive-math-editor.js').catch(() => null);

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

// ===== EXPORTACIONES Y COMPATIBILIDAD =====

// ✅ AÑADIR al final del archivo, después de las exportaciones:
if (typeof window !== 'undefined') {
  window.handleNewChat = handleNewChat;
}

export default {
  initChatController,
  handleSendMessage,
  handleNewChat,
  switchChat,
  handleDeleteChat,
  showDeleteChatOverlay,
  hideDeleteChatOverlay,
  // Exponer gestores para debugging/testing
  domManager,
  eventManager,
  utils: ChatUtils
};