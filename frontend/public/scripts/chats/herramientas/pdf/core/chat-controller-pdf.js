/**
 * chat-controller.js PDF - Controlador principal para las funciones de chat
 * ACTUALIZADO: Con sistema completo de documentos multimodales
 */

import { URL_CONFIG, API_ROUTES } from './config-pdf.js';
import { getState, setCurrentChat, setProcessingState } from './state-pdf.js';
import { createNewChat, loadChatMessages, loadChatHistory, updateChatPosition, deleteChat } from '../api/chat-pdf.js';
import { sendMessage, sendMessageWithAttachments } from '../api/messages-pdf.js';
import {
  clearChatMessages,
  getElement,
  toggleUIState,
  setHandleSendMessage,
  applyChatSwitchSkeleton,
  removeChatSwitchSkeleton
} from '../ui/ui-manager-pdf.js';
import {
  renderChatMessages,
  createLoadingMessage,
  replaceLoadingMessage,
  replaceWithError,
  processServerResponse,
  processAndRenderResponse
} from '../ui/message-renderer-pdf.js';
import { validateUUID } from '../../../shared/validators.js';
import { renderChatHistory, updateActiveSidebarItem } from '../ui/sidebar-pdf.js';
import { getAttachedFiles, clearAttachedFiles, hasAttachedFiles } from '../utils/file-attachments-pdf.js';
import { updateHeaderForChat, updateHeaderSubtitle } from "../ui/header-manager-pdf.js";
import { isChatProblematic, showCleanupDialog, markChatAsProblem, safeChatAction } from '../utils/chat-error-handler-pdf.js';
import { parseMarkdownToHTML } from '../utils/markdown-pdf.js';
import { showWelcomeMessage, clearDomCache, getCachedElement } from '../ui/welcome-message-pdf.js';
import { initCharacterLimit, exceedsLimit, showLimitExceededAlert, hideLimitAlert } from '../../../shared/character-limit.js';

// ⭐ NUEVAS IMPORTACIONES DEL SISTEMA DE DOCUMENTOS ⭐
import contentProcessing, {
  detectMultimodalContent,
  processExistingDocuments,
  activateDocumentEvents,
  handleDocumentClick
} from '../ui/content-processing-pdf.js';

// ✅ AÑADIR ESTE IMPORT DEL SISTEMA DE AVISOS:
import ChatNoticesSystem from '../../../shared/chat-notices.js';
const {
  initChatNotices,
  showTokenLimitNotice,
  shouldShowWarning,
  showSmartTokenNotice,
  shouldShowLimit,         // ← NUEVA FUNCIÓN PRINCIPAL
  clearTokenWarnings,           // ← FUNCIÓN DE LIMPIEZA
  showFreeUserLimitNotice,  // ← AÑADIR ESTA LÍNEA
} = ChatNoticesSystem;

/**
 * Inicializa el controlador de chat
 */
export function initChatController() {
  // Realizar limpieza automática de chats problemáticos al iniciar - VERSIÓN MEJORADA
  Promise.all([
    import('../utils/chat-error-handler-pdf.js'),
    import('../api/chat-pdf.js'),
    import('../ui/sidebar-pdf.js')
  ])
    .then(([errorModule, chatModule, sidebarModule]) => {
      // Cargar primero la lista de chats problemáticos
      if (typeof errorModule.loadProblematicChats === 'function') {
        const problemCount = errorModule.loadProblematicChats();
        console.log(`Inicialización: Se cargaron ${problemCount} chats problemáticos`);
      }

      // Ejecutar limpieza automática
      if (typeof errorModule.cleanupAllProblematicChats === 'function') {
        errorModule.cleanupAllProblematicChats(true)
          .then(count => {
            if (count > 0) {
              console.log(`Inicialización: Se eliminaron automáticamente ${count} chats problemáticos`);

              // Recargar el historial de chats después de la limpieza
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

  // ⭐ NUEVO: Configurar interceptores de mensajes ⭐
  setupMessageRenderingInterceptor();

  setupMessageObserver(); // ← AGREGAR ESTA LÍNEA

  // ⭐ NUEVO: Procesar mensajes existentes si los hay ⭐
  requestAnimationFrame(() => {
    processAllExistingMessages();
  });

  // Verificar si hay un chat en la URL
  checkInitialChatFromURL();

  // Registrar el manejador de envío de mensajes
  setHandleSendMessage(handleSendMessage);

  // Configurar eventos específicos de chat
  setupChatEventListeners();

  // Inicializar limitador de caracteres
  const textarea = document.querySelector('#messageInput');
  if (textarea) {
    try {
      initCharacterLimit(textarea, { variant: 'pdf' });

      // Añadir comprobación visual durante input
      textarea.addEventListener('input', function () {
        if (textarea.value && exceedsLimit(textarea.value)) {
          textarea.classList.add('limit-exceeded');
        } else {
          textarea.classList.remove('limit-exceeded');
        }
      });
    } catch (e) {
      console.warn('Error al inicializar límite de caracteres:', e);
    }
  }

  // AGREGAR AQUÍ - Manejador de evento resize para scroll en dispositivos móviles
  window.addEventListener('resize', () => {
    if (window.innerWidth < 768 && !document.querySelector('.welcome-message')) {
      setTimeout(() => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }, 100);
    }
  });

  // INSERTAR AQUÍ - MutationObserver para garantizar scroll automático
  function setupScrollObserver() {
    // Limpiar observador existente si hay alguno
    if (window.chatMessagesObserver) {
      window.chatMessagesObserver.disconnect();
      window.chatMessagesObserver = null;
    }

    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages && window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          // Solo aplicar en móviles y cuando no estemos en pantalla de bienvenida
          if (window.innerWidth < 768 && !document.querySelector('.welcome-message')) {
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
        console.log('MutationObserver de scroll configurado');
      }
    }, 500); // Dar tiempo a que el DOM esté listo
  }

  setupScrollObserver();

  // ⭐ NUEVO: Procesar documentos existentes después de la inicialización ⭐
  setTimeout(() => {
    console.log('🔍 Procesando documentos existentes en inicialización...');
    processExistingDocuments();
  }, 1000);
}

// ✅ AÑADIR INICIALIZACIÓN DEL SISTEMA DE AVISOS:
try {
  initChatNotices({ variant: 'pdf' });
  console.log('✅ Sistema de avisos inicializado para pdf');
} catch (error) {
  console.warn('Error al inicializar sistema de avisos:', error);
}

/**
 * ⭐ NUEVO: Configura interceptores para procesamiento automático de mensajes ⭐
 */
function setupMessageRenderingInterceptor() {
  // Interceptar appendChild para detectar nuevos mensajes
  const originalAppendChild = Element.prototype.appendChild;

  Element.prototype.appendChild = function (newChild) {
    const result = originalAppendChild.call(this, newChild);

    // Si es un mensaje de usuario que se está agregando
    if (newChild.nodeType === Node.ELEMENT_NODE &&
      newChild.classList &&
      newChild.classList.contains('user-message')) {

      // ✅ CAMBIO: Procesar inmediatamente
      requestAnimationFrame(() => {
        processMessageElement(newChild);
      });
    }

    return result;
  };
}

/**
 * ⭐ NUEVO: Procesa un elemento de mensaje individual ⭐
 */
function processMessageElement(messageElement) {
  try {
    // Buscar elementos que puedan contener JSON
    const textElements = messageElement.querySelectorAll('.message-text, .message-content, .multimodal-text, div');

    textElements.forEach(textElement => {
      // Obtener contenido de diferentes fuentes
      let content = textElement.textContent || textElement.innerHTML;

      // También verificar data-original-text si existe
      const originalText = textElement.dataset?.originalText;
      if (originalText && !content.includes('hasDocuments') && !content.includes('hasImage')) {
        try {
          const decodedText = decodeURIComponent(originalText);
          if (decodedText.includes('hasDocuments') || decodedText.includes('hasImage') || decodedText.includes('documents')) {
            content = decodedText;
          }
        } catch (e) {
          console.warn('Error al decodificar originalText:', e);
        }
      }

      // Solo procesar si parece JSON y no ha sido procesado
      if (content &&
        typeof content === 'string' &&
        !textElement.hasAttribute('data-processed') &&
        (content.includes('hasDocuments') || content.includes('hasImage') || content.includes('documents'))) {

        console.log('🔍 Procesando contenido JSON en elemento PDF:', content.substring(0, 150) + '...');

        const processedContent = processEscapedJSON(content); // ← USAR NUEVA FUNCIÓN

        if (processedContent !== content) {
          textElement.innerHTML = processedContent;
          textElement.setAttribute('data-processed', 'true');

          // Activar eventos de click para documentos
          setTimeout(() => {
            try {
              if (typeof activateDocumentEvents === 'function') {
                activateDocumentEvents(textElement);
              } else {
                // Importar dinámicamente si no está disponible
                import('../ui/content-processing-pdf.js').then(module => {
                  if (module.activateDocumentEvents) {
                    module.activateDocumentEvents(textElement);
                  }
                });
              }
            } catch (e) {
              console.warn('Error al activar eventos de documentos:', e);
            }
          }, 50);

          console.log('✅ Contenido JSON procesado y reemplazado en sistema PDF');
        }
      }
    });

  } catch (error) {
    console.error('Error al procesar elemento de mensaje PDF:', error);
  }
}

/**
 * ⭐ NUEVO: Procesa documentos de respuesta del servidor ⭐
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
 * Configura los event listeners específicos del chat
 */
function setupChatEventListeners() {
  const textarea = getElement('textarea');
  const sendButton = getElement('sendButton');
  const newChatBtn = getElement('newChatBtn');

  if (sendButton) {
    sendButton.addEventListener('click', handleSendMessage);
  }

  if (textarea) {
    textarea.addEventListener('keydown', handleKeyPress);
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', handleNewChat);
  }

  // Listener para evento personalizado de reintento
  window.addEventListener('sendMessageRequest', handleSendMessage);
}

/**
 * ⭐ NUEVO: Añade un mensaje con archivos adjuntos usando el sistema unificado ⭐
 * @param {string} role - 'user' o 'ai'
 * @param {string} content - Contenido del mensaje
 * @param {Array} files - Archivos adjuntos (opcional)
 * @returns {HTMLElement} Elemento del mensaje
 */
function addMessageWithAttachmentsSimplified(role, content, files = []) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return null;

  // Crear el contenedor base del mensaje
  const messageDiv = document.createElement('div');
  const messageType = role === 'ai' ? 'ai-message' : 'user-message';
  messageDiv.className = `message ${messageType}`;

  // Generar ID único para el mensaje si es de la IA
  if (role === 'ai') {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    messageDiv.dataset.messageId = messageId;
  }

  if (role === 'ai') {
    // Configuración para mensajes de IA
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

    // Renderizar contenido de IA
    if (typeof renderTextMessage === 'function') {
      renderTextMessage(contentElem, content);
    } else {
      contentElem.innerHTML = parseMarkdownToHTML(content);
    }
  } else {
    // Para mensajes del usuario
    if (files && files.length > 0) {
      // Verificar si hay archivos de imagen
      const hasImages = files.some(file => file.type === 'image');

      // Marcar mensaje con un data-attribute si contiene imágenes
      if (hasImages) {
        messageDiv.setAttribute('data-has-images', 'true');
      }

      // ⭐ NUEVO: Usar sistema unificado multimodal ⭐
      const multimodalContent = constructSimplifiedMultimodalContent(content, files);

      // Verificar si el resultado es una promesa
      if (multimodalContent instanceof Promise) {
        // Crear primero el contentElem
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Indicador temporal mientras se resuelve la promesa
        messageContent.innerHTML = '<div class="loading-content" style="padding: 10px;">Procesando contenido...</div>';
        messageDiv.appendChild(messageContent);

        // Actualizar cuando se resuelva
        multimodalContent.then(html => {
          messageContent.innerHTML = html;
          // ⭐ Activar eventos para documentos ⭐
          activateDocumentEvents(messageContent);
        });
      } else {
        // Si ya tenemos el HTML listo
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = multimodalContent;
        messageDiv.appendChild(messageContent);

        // ⭐ Activar eventos para documentos ⭐
        setTimeout(() => activateDocumentEvents(messageContent), 0);
      }

      // Marcar como mensaje multimodal
      messageDiv.setAttribute('data-multimodal', 'true');
    } else {
      // Mensaje simple sin archivos
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

  // Añadir al DOM
  chatMessages.appendChild(messageDiv);

  // Verificar si hay expresiones matemáticas en el mensaje del usuario
  if (role === 'user' && typeof content === 'string' &&
    (content.includes('$') || content.includes('\\(') || content.includes('\\)'))) {
    const contentElem = messageDiv.querySelector('.message-content');
    import('../math/mathjax-config.js').then(module => {
      if (typeof module.renderMath === 'function') {
        module.renderMath(contentElem).catch(console.error);
      }
    }).catch(console.error);
  }

  return messageDiv;
}

/**
 * ⭐ NUEVO: Construye contenido multimodal simplificado con layout unificado ⭐
 * @param {string} text - Texto del mensaje
 * @param {Array} files - Archivos adjuntos
 * @returns {string} HTML formateado
 */
function constructSimplifiedMultimodalContent(text, files) {
  // ⭐ FUNCIÓN AUXILIAR: Sanitizar texto para evitar XSS ⭐
  function sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ⭐ FUNCIÓN AUXILIAR: Detectar tipo de archivo por extensión ⭐
  function getFileTypeInfo(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();

    // Tipos de código
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html', 'php', 'rb', 'go', 'rs', 'swift'].includes(extension)) {
      return { type: 'code', icon: 'bx-code-alt' };
    }

    // Tipos específicos
    if (['pdf'].includes(extension)) {
      return { type: 'pdf', icon: 'bxs-file-pdf' };
    }
    if (['xlsx', 'xls', 'csv'].includes(extension)) {
      return { type: 'excel', icon: 'bxs-spreadsheet' };
    }
    if (['zip', 'rar', '7z'].includes(extension)) {
      return { type: 'zip', icon: 'bxs-file-archive' };
    }

    // Por defecto: documento
    return { type: 'document', icon: 'bxs-file-txt' };
  }

  if (!files || files.length === 0) {
    return parseMarkdownToHTML(text);
  }

  let html = '<div class="multimodal-container">';

  // Agregar texto si existe
  if (text && text.trim()) {
    html += `<div class="multimodal-text">${parseMarkdownToHTML(text)}</div>`;
  }

  if (files.length > 0) {
    // ⭐ CONTENEDOR UNIFICADO ⭐
    html += `<div class="unified-attachments">`;

    // ⭐ MEJORADO: Procesar TODOS los archivos con índice y mejor detección ⭐
    files.forEach((file, index) => {
      // ⭐ VALIDACIÓN: Verificar que el archivo tenga datos válidos ⭐
      if (!file || !file.file || !file.file.name) {
        console.warn(`⚠️ Archivo ${index} tiene datos inválidos:`, file);
        return;
      }

      console.log(`📎 Procesando archivo ${index + 1}/${files.length}: ${file.file.name}`);

      if (file.type === 'image') {
        // ⭐ MEJORADO: Verificar que existe data.base64 ⭐
        if (file.data && file.data.base64) {
          html += `
            <div class="chat-image-item clickable">
              <img src="${sanitize(file.data.base64)}" alt="Imagen adjunta" data-original-src="${sanitize(file.data.base64)}">
            </div>
          `;
        } else {
          // Fallback: mostrar indicador si no hay base64
          html += `
            <div class="attachment-indicator image">
              <i class='bx bx-image'></i>
              <span>${sanitize(file.file.name)}</span>
            </div>
          `;
        }
      } else if (file.type === 'document' || file.type === 'code') {
        // ⭐ MEJORADO: Usar detección inteligente de tipo ⭐
        const fileTypeInfo = getFileTypeInfo(file.file.name);
        const attachmentType = file.type === 'code' ? 'code' : fileTypeInfo.type;
        const iconClass = file.type === 'code' ? 'bx-code-alt' : fileTypeInfo.icon;

        const fileName = truncateFileName(file.file.name, 12);
        const fileSize = Math.round((file.file.size || 0) / 1024);

        // ⭐ CRÍTICO: data-file-name debe contener el nombre COMPLETO para mapeo correcto ⭐
        html += `
          <div class="document-preview temp-preview" 
               data-file-name="${sanitize(file.file.name)}"
               data-attachment-type="${attachmentType}"
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
 * ⭐ HELPER: Trunca nombre de archivo ⭐
 */
function truncateFileName(fileName, maxLength) {
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const maxNameLength = maxLength - extension.length - 4;

  if (maxNameLength <= 0) return '...' + extension;

  return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
}

/**
 * ⭐ HELPER: Formatea tamaño de archivo ⭐
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Función optimizada para actualizar los IDs de los últimos mensajes únicamente
 * @param {string} chatId - ID del chat actual
 */
function updateMessageIds(chatId) {
  if (!chatId) return;

  // Pequeño retraso para asegurar que los mensajes están en la BD
  setTimeout(async () => {
    try {
      // Importar solo lo necesario
      const { loadChatMessages } = await import('../api/chat-pdf.js');
      if (!loadChatMessages) return;

      // Cargar mensajes y obtener los más recientes por tipo
      const messages = await loadChatMessages(chatId);
      if (!Array.isArray(messages) || messages.length < 2) return;

      // Referencias DOM
      const userMessages = document.querySelectorAll('.chat-messages .user-message');
      const aiMessages = document.querySelectorAll('.chat-messages .ai-message');
      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastAIMessage = aiMessages[aiMessages.length - 1];

      // Extraer ID del último mensaje de usuario
      const userMessagesData = messages.filter(m => m.role === 'user');
      if (userMessagesData.length > 0 && lastUserMessage) {
        const id = userMessagesData[userMessagesData.length - 1].id;
        lastUserMessage.dataset.serverId = id;
      }

      // Extraer ID del último mensaje de AI
      const aiMessagesData = messages.filter(m => m.role === 'assistant' || m.role === 'ai');
      if (aiMessagesData.length > 0 && lastAIMessage) {
        const id = aiMessagesData[aiMessagesData.length - 1].id;
        lastAIMessage.dataset.serverId = id;
      }

      // Re-inicializar interacciones
      const { initResponseInteraction } = await import('../utils/response-interaction-pdf.js');
      if (initResponseInteraction) {
        initResponseInteraction().processExistingMessages(true);
      }
    } catch (error) {
      console.warn("Error al actualizar IDs:", error);
    }
  }, 300);
}

/**
 * 🦫 SISTEMA DE MENSAJES DINÁMICOS PARA ACADEL - PROFESOR ESPECIALISTA
 * Mensajes variados para hacer la experiencia de estudio más motivadora
 */

// 🧠📖 ARRAY DE MENSAJES VARIADOS PARA "ACADEL ESTÁ ANALIZANDO"
const ACADEL_STUDY_THINKING_MESSAGES = [
  // Mensajes básicos de análisis académico
  {
    title: "🧠 Acadel analiza tus apuntes",
    message: "Revisando el material con la precisión de un capibara estudioso..."
  },
  {
    title: "📚 Acadel estudia contigo",
    message: "Su cerebro académico está conectando conceptos como un genio peludo"
  },
  {
    title: "🔍 Acadel examina los documentos",
    message: "Escaneando información con lupa de profesor especializado"
  },

  // Mensajes específicos para PDFs y apuntes
  {
    title: "📄 Acadel lee tus PDFs",
    message: "Procesando cada página con la paciencia de un capibara bibliotecario"
  },
  {
    title: "✏️ Acadel revisa tus notas",
    message: "Organizando conceptos en su mente de profesor extraordinario"
  },
  {
    title: "🎓 Acadel prepara la explicación",
    message: "Diseñando la mejor forma de enseñarte este material"
  },

  // Mensajes creativos con personalidad docente
  {
    title: "🌟 Acadel está inspirado por tu material",
    message: "Preparando una explicación digna de su sabiduría académica"
  },
  {
    title: "🎯 Acadel se concentra en los conceptos",
    message: "Enfocando toda su experiencia docente en tu consulta"
  },
  {
    title: "🚀 Acadel despega mentalmente",
    message: "Su mente académica vuela más alto que un capibara con título"
  },

  // Mensajes técnicos pero educativos
  {
    title: "⚙️ Acadel calibra su explicación",
    message: "Ajustando su método pedagógico para que entiendas perfectamente"
  },
  {
    title: "🔬 Acadel analiza científicamente",
    message: "Aplicando método académico con toque de capibara genial"
  },
  {
    title: "📖 Acadel consulta su experiencia",
    message: "Recordando sus mejores técnicas de enseñanza"
  },

  // Mensajes para diferentes contextos de estudio
  {
    title: "🎨 Acadel diseña tu aprendizaje",
    message: "Creando una explicación tan clara como efectiva"
  },
  {
    title: "🧪 Acadel experimenta metodologías",
    message: "Mezclando técnicas pedagógicas en su laboratorio mental"
  },
  {
    title: "🎪 Acadel prepara la clase magistral",
    message: "Organizando conocimientos para un show educativo increíble"
  },

  // Mensajes motivacionales para estudiantes
  {
    title: "💡 Acadel tiene una revelación",
    message: "Ha encontrado la mejor manera de explicarte este tema"
  },
  {
    title: "🏆 Acadel busca la explicación perfecta",
    message: "Su estándar de enseñanza de capibara es muy alto"
  },
  {
    title: "⭐ Acadel está creando magia educativa",
    message: "Cuando tarda más es porque está preparando algo extraordinario"
  }
];

// ⏳📚 ARRAY DE MENSAJES VARIADOS PARA "OPERACIÓN ACADÉMICA LENTA" (8+ segundos)
const ACADEL_STUDY_PATIENCE_MESSAGES = [
  // Mensajes académicos de paciencia
  {
    title: "⏳ Acadel está en análisis profundo...",
    message: "Tu material requiere atención extra. Acadel está aplicando toda su experiencia docente para darte la mejor explicación"
  },
  {
    title: "🔥 Acadel está en modo profesor intensivo",
    message: "Su cerebro académico está al máximo. Un poquito más de paciencia para una clase magistral"
  },
  {
    title: "⚡ Acadel sobrecarga su CPU educativa",
    message: "Está usando toda su potencia pedagógica. La espera valdrá la pena, lo promete"
  },

  // Mensajes específicos sobre material de estudio
  {
    title: "📚 Acadel está fascinado con tu material",
    message: "Se emocionó tanto analizando tus apuntes que está dando lo mejor de sí. Un momentito más..."
  },
  {
    title: "🐌 Acadel va más lento que estudiante en examen",
    message: "Pero es porque está siendo extra cuidadoso con cada concepto. Los profesores capibara no se apuran"
  },
  {
    title: "⏰ El tiempo vuela cuando Acadel enseña",
    message: "Para él han sido microsegundos analizando, pero promete acelerar su explicación"
  },

  // Mensajes sobre metodología pedagógica
  {
    title: "🔧 Acadel está en modo pedagógico avanzado",
    message: "Reorganizando conceptos para darte la explicación más clara posible. Casi termina..."
  },
  {
    title: "💾 Acadel procesa material académico complejo",
    message: "Su disco duro de profesor está trabajando horas extra. Un poquito más de espera"
  },
  {
    title: "🖥️ Acadel reinicia su sistema educativo",
    message: "A veces hasta los profesores capibara más brillantes necesitan reorganizar ideas"
  },

  // Mensajes motivacionales para el aprendizaje
  {
    title: "🎯 Acadel perfecciona su método de enseñanza",
    message: "No quiere darte cualquier explicación, está puliendo cada detalle como el pedagogo que es"
  },
  {
    title: "🏆 Acadel busca la explicación didáctica perfecta",
    message: "Su estándar de calidad educativa es muy alto. La paciencia será recompensada con conocimiento"
  },
  {
    title: "⭐ Acadel está creando una experiencia de aprendizaje especial",
    message: "Cuando tarda más es porque está preparando una explicación que revolucionará tu comprensión"
  },

  // Mensajes con humor académico capibara
  {
    title: "🦫 Acadel necesita más café académico",
    message: "Su cerebro de profesor está pidiendo combustible extra. Analizando... analizando..."
  },
  {
    title: "🧘 Acadel medita la explicación pedagógica perfecta",
    message: "Los profesores capibara sabios no se apuran. La paciencia es una virtud educativa"
  },
  {
    title: "🎨 Acadel pinta su explicación con precisión académica",
    message: "Cada concepto está siendo seleccionado con precisión artística de profesor experto"
  },

  // Mensajes específicos para estudio con documentos
  {
    title: "📄 Acadel está leyendo entre líneas",
    message: "Tu material tiene más capas que cebolla académica. Está descubriendo todos los conceptos ocultos"
  },
  {
    title: "🔍 Acadel examina cada detalle de tus apuntes",
    message: "Como buen profesor, no quiere que se le escape ningún concepto importante de tu material"
  },
  {
    title: "📚 Acadel está en bibliografía profunda",
    message: "Conectando tu material con todo su conocimiento académico para una explicación completa"
  }
];

/**
 * 🎲📚 FUNCIÓN PARA OBTENER MENSAJE ALEATORIO DE ACADEL ANALIZANDO
 * @returns {Object} Objeto con title y message aleatorios para contexto académico
 */
function getRandomStudyThinkingMessage() {
  const randomIndex = Math.floor(Math.random() * ACADEL_STUDY_THINKING_MESSAGES.length);
  const selectedMessage = ACADEL_STUDY_THINKING_MESSAGES[randomIndex];

  console.log(`🎭📚 Mensaje "analizando" aleatorio seleccionado (${randomIndex + 1}/${ACADEL_STUDY_THINKING_MESSAGES.length}):`, selectedMessage.title);

  return selectedMessage;
}

/**
 * ⏳📖 FUNCIÓN PARA OBTENER MENSAJE ALEATORIO DE PACIENCIA ACADÉMICA
 * @returns {Object} Objeto con title y message aleatorios para operaciones académicas lentas
 */
function getRandomStudyPatienceMessage() {
  const randomIndex = Math.floor(Math.random() * ACADEL_STUDY_PATIENCE_MESSAGES.length);
  const selectedMessage = ACADEL_STUDY_PATIENCE_MESSAGES[randomIndex];

  console.log(`⏳📚 Mensaje "paciencia académica" aleatorio seleccionado (${randomIndex + 1}/${ACADEL_STUDY_PATIENCE_MESSAGES.length}):`, selectedMessage.title);

  return selectedMessage;
}


/**
 * ✅ FUNCIÓN CORREGIDA: Verificar límites de tokens antes de enviar
 */
async function checkTokensBeforeSend(chatId) {
  if (!chatId) return { canProceed: true, warningInfo: null };

  try {
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
            criticalThreshold: data.tokenInfo.criticalThreshold,
            limitPercentage: data.tokenInfo.limitPercentage,
            source: 'pre_validation_backend',
            percentage: data.tokenInfo.percentage
          }
        };
      }

      console.log(`✅ [DINÁMICO] Pre-check OK sin datos específicos de tokens`);
      return { canProceed: true, warningInfo: null };
    }

    // Manejar errores HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`🚨 [DINÁMICO] Error HTTP ${response.status} en pre-check:`, errorData);

      // ✅ SOLO DETECTAR ERRORES DE LÍMITE - SIN PROCESAR
      if (response.status === 429 || response.status === 400) {
        const errorCode = errorData.error?.code || '';
        
        // Detectar límites de herramienta
        if (errorCode.includes('TOOL_') && errorCode.includes('_LIMIT_REACHED')) {
          console.log(`🚫 [FREE USER LIMIT] Límite detectado: ${errorCode}`);
          return {
            canProceed: false,
            isFreeUserLimit: true,
            error: errorData.error,
            fullResponse: errorData
          };
        }
        
        // Detectar límites generales
        if (errorCode.includes('DAILY_LIMIT_REACHED') || 
            errorCode.includes('HOURLY_LIMIT_REACHED') ||
            errorCode.includes('UPGRADE_REQUIRED')) {
          return {
            canProceed: false,
            isFreeUserLimit: true,
            error: errorData.error,
            fullResponse: errorData
          };
        }

        // Límites de tokens (existente)
        if (errorCode.includes('TOKEN_LIMITS')) {
          return {
            canProceed: false,
            error: errorData.error,
            tokenLimitExceeded: true,
            warningInfo: errorData.tokenInfo || null
          };
        }
      }

      return { canProceed: true, warningInfo: null };
    }

    return { canProceed: true, warningInfo: null };

  } catch (error) {
    console.warn('Error al verificar tokens antes de enviar:', error);
    
    // ✅ SOLO DETECTAR - SIN PROCESAR
    if (error.message && (
      error.message.includes('TOOL_') ||
      error.message.includes('DAILY_LIMIT') ||
      error.message.includes('HOURLY_LIMIT') ||
      error.message.includes('UPGRADE_REQUIRED')
    )) {
      return {
        canProceed: false,
        isFreeUserLimit: true,
        error: { message: error.message },
        fullResponse: null
      };
    }

    if (error.message && error.message.includes('TOKEN_LIMITS')) {
      return {
        canProceed: false,
        error: { message: error.message },
        tokenLimitExceeded: true
      };
    }

    return { canProceed: true, warningInfo: null };
  }
}

/**
 * ⭐📚 FUNCIÓN ACTUALIZADA: Maneja el envío de mensajes con el nuevo sistema académico ⭐
 * Especializada para análisis de PDFs y material de estudio
 */
export async function handleSendMessage() {
  // IMPORTANTE: Capturar archivos temporales de la bienvenida si existen
  const temporaryFiles = window.temporaryWelcomeFiles || [];

  // Detectar si estamos en la pantalla de bienvenida
  const isInWelcomeScreen = document.querySelector('.welcome-message, .centered-input-container, .suggestions-container') !== null;

  // SECCIÓN PRIORITARIA: Guardar el mensaje antes de cualquier limpieza
  const textarea = document.getElementById('messageInput');
  const messageToSend = textarea ? textarea.value.trim() : '';

  // Variables para notificaciones dinámicas académicas
  let slowOperationTimeout;
  let slowOperationNotificationId = null;
  let thinkingNotificationId = null; // 🦫 NUEVA VARIABLE PARA CONTEXTO ACADÉMICO

  // Verificar límite de caracteres antes de continuar
  if (messageToSend) {
    try {
      if (exceedsLimit(messageToSend)) {
        showLimitExceededAlert();
        return; // Detener ejecución si excede el límite
      }
    } catch (e) {
      console.warn('Error al verificar límite de caracteres:', e);
    }
  }

  // =====================================================================
  // SECCIÓN CRÍTICA 1: ELIMINAR LA UI DE BIENVENIDA
  // =====================================================================

  // 1. Eliminar elementos de bienvenida INMEDIATAMENTE
  const welcomeElements = document.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container');
  welcomeElements.forEach(el => {
    if (el && el.parentNode) {
      // Primero ocultar para evitar parpadeos
      el.style.display = 'none';
      el.parentNode.removeChild(el);
    }
  });

  // =====================================================================
  // SECCIÓN CRÍTICA 2: RESTAURAR LA UI PRINCIPAL INMEDIATAMENTE
  // =====================================================================

  // Referencias a elementos clave
  const fixedSpace = document.querySelector('.fixed-space');
  const inputBox = document.querySelector('.input-box');
  const mainTextarea = document.getElementById('messageInput');
  const attachmentsWrapper = document.querySelector('.attachments-wrapper');

  // Si estábamos en la pantalla de bienvenida, necesitamos una restauración agresiva
  if (isInWelcomeScreen) {
    // 1. Arreglar el contenedor principal primero
    if (fixedSpace) {
      // Eliminar TODOS los estilos que puedan causar problemas
      fixedSpace.removeAttribute('style');

      // Aplicar estilos cruciales con !important
      fixedSpace.style.cssText = `
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        overflow: visible !important;
      `;

      // Forzar reflow para aplicar cambios inmediatamente
      void fixedSpace.offsetHeight;
    }

    // 2. Arreglar la caja de entrada
    if (inputBox) {
      inputBox.removeAttribute('style');
      inputBox.style.cssText = `
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 10 !important;
        position: relative !important;
      `;
    }

    // 3. CRÍTICO: Corregir completamente el textarea
    if (mainTextarea) {
      // Primero, eliminar cualquier cosa que pueda estar bloqueando el textarea
      mainTextarea.disabled = false;
      mainTextarea.readOnly = false;
      mainTextarea.removeAttribute('aria-hidden');
      mainTextarea.removeAttribute('tabindex');

      // Establecer propiedades CSS cruciales
      mainTextarea.style.cssText = `
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        user-select: text !important;
        -webkit-user-select: text !important;
        z-index: 20 !important;
        position: relative !important;
        background-color: var(--input-bg, #ffffff) !important;
        color: var(--text-color, #000000) !important;
      `;

      // Eliminar cualquier clase que pueda estar bloqueando el textarea
      mainTextarea.classList.remove('disabled', 'readonly', 'hidden', 'no-events');

      // IMPORTANTE: Transferir el mensaje de la pantalla de bienvenida
      if (messageToSend) {
        mainTextarea.value = messageToSend;
      }
    }

    // 4. Restaurar el contenedor de adjuntos
    if (attachmentsWrapper) {
      attachmentsWrapper.style.cssText = `
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      `;
    }

    // 5. Forzar un reflow completo para aplicar todos los cambios
    void document.body.offsetHeight;

    // 6. Verificación adicional para los botones
    const sendButton = document.querySelector('.input-box button:nth-child(2)');
    const attachButton = document.querySelector('.attach-btn');

    if (sendButton) {
      sendButton.style.cssText = `
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      `;
      sendButton.disabled = false;
    }

    if (attachButton) {
      attachButton.style.cssText = `
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      `;
      attachButton.disabled = false;
    }
  } else {
    // Para casos no relacionados con la pantalla de bienvenida, restauración simple
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('display');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('visibility');
    }

    if (inputBox) {
      inputBox.style.display = '';
    }

    if (mainTextarea) {
      mainTextarea.style.display = '';
      mainTextarea.disabled = false;
    }

    if (attachmentsWrapper) {
      attachmentsWrapper.style.display = '';
    }
  }

  // =====================================================================
  // SECCIÓN REGULAR: PROCESAR ARCHIVOS Y CONTINUAR CON EL MENSAJE
  // =====================================================================

  // Continuar con el comportamiento normal de envío de mensaje
  const chatMessages = document.querySelector('.chat-messages');
  if (!mainTextarea || !chatMessages) return;

  // MANEJO MEJORADO DE ARCHIVOS
  let hasAttachments = false;
  let attachedFiles = [];

  // VERIFICACIÓN DE PDF: Si hay archivos PDF, manejarlos de manera especial
  const hasPDFFiles = (temporaryFiles.some(file => file.file.type === 'application/pdf') ||
    (typeof hasAttachedFiles === 'function' &&
      hasAttachedFiles() &&
      Array.from(getAttachedFiles()).some(file => file.file.type === 'application/pdf')));

  if (hasPDFFiles) {
    // Para archivos PDF, debemos usar el uploader de PDF en lugar del flujo normal
    import('../components/pdf-uploader.js').then(module => {
      if (typeof module.showUploadModal === 'function') {
        // Reestablecer UI normal primero
        setProcessingState(false);
        if (typeof toggleUIState === 'function') {
          toggleUIState(false);
        }

        // Ocultar cualquier alerta de límite que pueda estar visible
        try {
          hideLimitAlert();
        } catch (e) {
          console.warn('Error al ocultar alerta de límite:', e);
        }

        // Mostrar el modal de subida de PDF
        module.showUploadModal();
      }
    }).catch(e => {
      console.error('Error al importar PDF uploader:', e);
      // Continuar con el flujo normal si falla la importación
      processNormalMessage();
    });

    // Salir de la función para dejar que el uploader de PDF maneje el proceso
    return;
  }

  // Primero, intentar usar los archivos temporales guardados desde el mensaje de bienvenida
  if (temporaryFiles && temporaryFiles.length > 0) {
    hasAttachments = true;
    attachedFiles = temporaryFiles;
  } else {
    // Si no hay archivos temporales, usar el sistema normal
    hasAttachments = typeof hasAttachedFiles === 'function' ? hasAttachedFiles() : false;
    attachedFiles = hasAttachments && typeof getAttachedFiles === 'function' ? getAttachedFiles() : [];
  }

  // No permitir mensajes vacíos sin archivos
  if (getState('isProcessing') || (!messageToSend && !hasAttachments)) return;

  // =====================================================================
  // SECCIÓN CRÍTICA 3: LIMPIAR TEXTAREA Y MOSTRAR MENSAJES
  // =====================================================================

  // Limpiar el textarea pero mantenerlo completamente visible e interactivo
  if (mainTextarea) {
    mainTextarea.value = '';

    // Actualizar tamaño del textarea
    try {
      import('../ui/ui-manager-pdf.js').then(module => {
        if (typeof module.handleTextareaResize === 'function') {
          module.handleTextareaResize({ target: mainTextarea });
        }
      });
    } catch (error) {
      // Fallback si falla la importación
      mainTextarea.style.height = 'auto';
    }

    // CRÍTICO: Enfocar el textarea inmediatamente para garantizar interactividad
    try {
      mainTextarea.focus();
    } catch (error) {
      console.warn('Error al enfocar textarea:', error);
    }
  }

  // ⭐📚 NUEVO: Mostrar mensaje del usuario usando el sistema simplificado ⭐
  let userMessageElement;
  try {
    userMessageElement = addMessageWithAttachmentsSimplified('user', messageToSend, attachedFiles);

    console.log(`✅📚 Mensaje del usuario mostrado con ${attachedFiles.length} archivos adjuntos`);
  } catch (error) {
    console.error('Error al mostrar mensaje del usuario:', error);
  }

  // Crear y agregar mensaje de carga
  let loadingMessage;
  try {
    loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);
  } catch (error) {
    console.error('Error al crear mensaje de carga:', error);
  }

  // CAMBIO PRINCIPAL: Limpiar los archivos adjuntos INMEDIATAMENTE después de mostrarlos
  // en lugar de esperar a la respuesta final
  if (typeof clearAttachedFiles === 'function') {
    clearAttachedFiles();
  }

  // Limpiar inputs de archivos
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.value = '';
  });

  // Limpiar URLs de objetos
  if (window.objectURLs && Array.isArray(window.objectURLs)) {
    window.objectURLs.forEach(url => {
      if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    });
    window.objectURLs = [];
  }

  // =====================================================================
  // SECCIÓN REGULAR: PROCESO NORMAL DE ENVÍO DE MENSAJE
  // =====================================================================

  let currentChatId = getState('currentChatId');
  let isNewChat = !currentChatId || !validateUUID(currentChatId);
  let newChatId = null;

  // Crear un controlador de aborto para poder cancelar la solicitud
  const abortController = new AbortController();

  // Establecer el controlador actual
  try {
    import('../ui/ui-manager-pdf.js').then(module => {
      if (typeof module.setCurrentFetchController === 'function') {
        module.setCurrentFetchController(abortController);
      }
    });
  } catch (error) {
    console.warn('Error al establecer controlador de fetch:', error);
  }

  try {
    // Cambiar estado pero manteniendo visibilidad del textarea
    setProcessingState(true);

    // 🦫 NOTIFICACIÓN INMEDIATA CON MENSAJE ALEATORIO ACADÉMICO
    const randomThinking = getRandomStudyThinkingMessage();
    thinkingNotificationId = acadelLoading(
      randomThinking.title,
      randomThinking.message
    );
    console.log(`🔔📚 Notificación dinámica "analizando" creada con ID: ${thinkingNotificationId}`);

    slowOperationTimeout = setTimeout(() => {
      if (getState('isProcessing')) {
        // 🦫 CERRAR la notificación de "analizando" antes de mostrar la de operación lenta
        if (thinkingNotificationId) {
          console.log(`🔔📚 Cerrando notificación "analizando" por timeout ID: ${thinkingNotificationId}`);
          acadelCerrar(thinkingNotificationId);
          thinkingNotificationId = null;
        }

        // 🦫 MENSAJE ALEATORIO PARA OPERACIÓN ACADÉMICA LENTA
        const randomPatience = getRandomStudyPatienceMessage();
        slowOperationNotificationId = acadelLoading(
          randomPatience.title,
          randomPatience.message
        );
        console.log(`🔔📚 Notificación dinámica "paciencia académica" creada con ID: ${slowOperationNotificationId}`);
      }
    }, 8000);

    // Versión personalizada de toggleUIState que no oculta el textarea
    if (typeof toggleUIState === 'function') {
      toggleUIState(true);

      // Verificación adicional: garantizar que el textarea sigue siendo visible
      if (mainTextarea) {
        mainTextarea.disabled = false;
        mainTextarea.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        `;
      }
    }
    // Crear nuevo chat si es necesario
    if (isNewChat) {
      try {
        const newChat = await createNewChat(messageToSend || "Nueva conversación de estudio");
        newChatId = newChat.id;
        setCurrentChat(newChatId);

        // ⭐ SOLUCIÓN: Establecer ID temporal para procesamiento de imágenes
        window.tempChatIdForFiles = newChatId;
        console.log(`🆔 Chat temporal establecido para procesamiento de imágenes: ${newChatId}`);
      } catch (error) {
        console.error('Error al crear nuevo chat:', error);
        throw error;
      }
    }

    // VERIFICACIÓN INTERMEDIA: Garantizar nuevamente la visibilidad del textarea
    if (isInWelcomeScreen && mainTextarea) {
      mainTextarea.disabled = false;
      mainTextarea.style.cssText = `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  `;

      // Forzar reflow para aplicar cambios
      void mainTextarea.offsetHeight;
    }

    // ✅ AÑADIR VERIFICACIÓN DE TOKENS ANTES DE ENVIAR:
    let tokenCheck = { canProceed: true, warningInfo: null };
    if (!isNewChat) {
      tokenCheck = await checkTokensBeforeSend(currentChatId);

      // Si no puede continuar, manejar completamente
      if (!tokenCheck.canProceed) {
        console.log('🚫 [TOKEN LIMIT] Pre-validación falló - Límite de tokens excedido');

        const errorMessage = tokenCheck.error?.message ||
          'El chat ha alcanzado su límite de capacidad. Inicia un nuevo chat para continuar.';

        replaceWithError(loadingMessage, errorMessage, messageToSend);

        // Mostrar aviso específico de límite
        setTimeout(() => {
          if (typeof showTokenLimitNotice === 'function') {
            showTokenLimitNotice(loadingMessage,
              tokenCheck.error?.maxTokens || 'límite del sistema',
              tokenCheck.warningInfo
            );
          }
        }, 300);

        // Limpiar textarea
        if (mainTextarea) {
          mainTextarea.value = '';
        }

        // Notificación para el usuario
        setTimeout(() => {
          acadelError(
            "🧠 ¡Cerebro de capibara saturado!",
            "Este chat llegó a su límite de capacidad. Acadel necesita un nuevo chat para seguir brillando académicamente"
          );
        }, 500);

        return;
      }
    }

    // Enviar la consulta al servidor
    let data;
    try {
      if (hasAttachments) {
        console.log(`📤📚 Enviando mensaje con ${attachedFiles.length} archivos para análisis académico...`);
        data = await sendMessageWithAttachments(messageToSend, getState('currentChatId'), attachedFiles, abortController.signal);
      } else {
        console.log(`📤📚 Enviando consulta académica...`);
        data = await sendMessage(messageToSend, getState('currentChatId'), abortController.signal);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al enviar mensaje:', error);
      }
      throw error;
    }

    // Verificar si la solicitud fue cancelada
    if (abortController.signal.aborted) {
      // Si hay un mensaje de carga, eliminarlo
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      return;
    }

    // Verificar si hay error en la respuesta
    if (data && data.error) {
      console.error('Error en la respuesta:', data.error);

      // Marcar el chat como problemático si se detecta error
      if (isNewChat && newChatId) {
        markChatAsProblem(newChatId);
      } else if (currentChatId) {
        markChatAsProblem(currentChatId);
        // Eliminar inmediatamente del servidor para evitar que aparezca en cargas futuras
        try {
          await deleteChat(newChatId);
          console.log(`Chat nuevo con error ${newChatId} eliminado del servidor`);
        } catch (deleteError) {
          console.warn(`Error al eliminar chat con error:`, deleteError);
        }

        // Eliminar explícitamente del DOM
        const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
        if (chatItem) {
          chatItem.style.opacity = '0.5';
          chatItem.style.transition = 'opacity 0.2s ease-out';
          setTimeout(() => chatItem.remove(), 200);
        }

        // Actualizar explícitamente el sidebar después de un breve retraso
        setTimeout(async () => {
          try {
            // Recarga forzada de la lista de chats
            const updatedChats = await loadChatHistory();
            renderChatHistory(updatedChats);
          } catch (sidebarError) {
            console.warn('Error al actualizar sidebar después de error:', sidebarError);
          }
        }, 300);
      } else if (currentChatId) {
        markChatAsProblem(currentChatId);
      }

      throw new Error(data.error.message || 'Error en la respuesta del servidor');
    }

    console.log(`✅📚 Respuesta del servidor recibida para análisis académico:`, data);

    // ⭐📚 NUEVO: Procesar documentos de la respuesta ⭐
    if (userMessageElement && data.documents) {
      console.log(`🔄📚 Procesando ${data.documents.length} documentos académicos del servidor...`);
      processServerResponseDocuments(data, userMessageElement);
    }

    // Procesar y renderizar respuesta
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (loadingMessage?.parentNode) {
      // Procesar y renderizar la respuesta
      if (typeof processAndRenderResponse === 'function') {
        if (processAndRenderResponse(data, loadingMessage)) {
          // Si la función devuelve true, asumimos que se encargó de todo

          // ✅ AÑADIR VERIFICACIÓN DE AVISOS DE TOKENS DESPUÉS DEL RENDERIZADO:
          if (data.tokenInfo && data.tokenInfo.current && data.tokenInfo.max) {
            const { current, max } = data.tokenInfo;

            if (typeof shouldShowLimit === 'function' && shouldShowLimit(current, max, data.tokenInfo)) {
              if (typeof showTokenLimitNotice === 'function') {
                showTokenLimitNotice(loadingMessage, max, data.tokenInfo);
              }
            } else if (typeof shouldShowWarning === 'function' && shouldShowWarning(current, max, data.tokenInfo)) {
              if (typeof showSmartTokenNotice === 'function') {
                showSmartTokenNotice(loadingMessage, current, max, data.tokenInfo.percentage, data.tokenInfo);
              }
            }
          } else if (tokenCheck.warningInfo && tokenCheck.warningInfo.current && tokenCheck.warningInfo.max) {
            // Usar datos de pre-validación si no hay datos en la respuesta
            const { current, max } = tokenCheck.warningInfo;

            if (typeof shouldShowLimit === 'function' && shouldShowLimit(current, max, tokenCheck.warningInfo)) {
              if (typeof showTokenLimitNotice === 'function') {
                showTokenLimitNotice(loadingMessage, max, tokenCheck.warningInfo);
              }
            } else if (typeof shouldShowWarning === 'function' && shouldShowWarning(current, max, tokenCheck.warningInfo)) {
              if (typeof showSmartTokenNotice === 'function') {
                showSmartTokenNotice(loadingMessage, current, max, tokenCheck.warningInfo.percentage, tokenCheck.warningInfo);
              }
            }
          }

          // NUEVA IMPLEMENTACIÓN: Actualizar IDs usando la función optimizada
          const chatId = data.chatId || getState('currentChatId');
          if (chatId) {
            updateMessageIds(chatId);
          }
          // AGREGAR AQUÍ TAMBIÉN - Scroll forzado para dispositivos móviles
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            setTimeout(() => {
              const chatMessages = document.querySelector('.chat-messages');
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Scroll secundario con animación suave
                setTimeout(() => {
                  chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                  });
                }, 100);
              }
            }, 300);
          }

          // Mantener la interacción inmediata mientras se actualiza IDs
          setTimeout(() => {
            import('../utils/response-interaction-pdf.js').then(module => {
              if (typeof module.initResponseInteraction === 'function') {
                const interaction = module.initResponseInteraction();
                const lastAiMessage = document.querySelector('.chat-messages .ai-message:last-child');
                if (lastAiMessage && !lastAiMessage.querySelector('.response-actions')) {
                  interaction.addInteractionButtons(lastAiMessage);
                }
              }
            });
          }, 100);
        }
      } else {
        const { type, content } = processServerResponse(data);
        replaceLoadingMessage(loadingMessage, content, type);

        // NUEVA IMPLEMENTACIÓN: Actualizar IDs usando la función optimizada
        const chatId = data.chatId || getState('currentChatId');
        if (chatId) {
          updateMessageIds(chatId);
        }
      }

      // Actualizar UI para nuevo chat
      // Actualizar UI para nuevo chat
      if (isNewChat && newChatId) {
        // Quitar marca de problemático
        import('../utils/chat-error-handler-pdf.js').then(module => {
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
        });

        history.pushState({}, '', URL_CONFIG.chatPath(newChatId));

        // Cargar el historial y actualizar el sidebar
        try {
          const updatedChats = await loadChatHistory();
          renderChatHistory(updatedChats);
        } catch (error) {
          console.error('Error al cargar historial de chats:', error);
        }

        // Actualizar el header
        updateHeaderForChat(newChatId);

        // ⭐ SOLUCIÓN: Limpiar ID temporal después de que la URL se ha actualizado
        setTimeout(() => {
          if (window.tempChatIdForFiles === newChatId) {
            window.tempChatIdForFiles = null;
            console.log(`🧹 Chat temporal limpiado después de establecer URL: ${newChatId}`);
          }
        }, 1000);
      } else {
        // Para chats existentes, actualizar posición
        updateChatPosition(getState('currentChatId'));
      }
    }

  } catch (error) {
    console.error('Error en handleSendMessage:', error);

    // Manejar cancelación y errores
    if (error.name === 'AbortError') {

      // NUEVO: Eliminar el chat si era nuevo
      if (isNewChat && newChatId) {
        try {
          // Eliminar el chat del servidor para prevenir que aparezca al recargar
          await deleteChat(newChatId);
          console.log(`Chat nuevo cancelado ${newChatId} eliminado del servidor`);

          // Marcarlo también como problemático
          markChatAsProblem(newChatId);

          // Eliminar de la lista local
          const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
          if (chatItem) {
            chatItem.style.opacity = '0.5';
            chatItem.style.transition = 'opacity 0.2s ease-out';
            setTimeout(() => chatItem.remove(), 200);
          }

          // Forzar actualización del sidebar
          setTimeout(async () => {
            try {
              const updatedChats = await loadChatHistory();
              renderChatHistory(updatedChats);
            } catch (e) {
              console.warn('Error al actualizar sidebar después de cancelación:', e);
            }
          }, 300);
        } catch (deleteError) {
          console.error('Error al eliminar chat cancelado:', deleteError);
          // Intentar marcar como problemático de todos modos
          markChatAsProblem(newChatId);
        }
      }

      // Si era un chat nuevo que se canceló, restaurar la pantalla de bienvenida
      if (isNewChat) {
        setTimeout(() => {
          // Ocultar textarea explícitamente primero
          const fixedSpace = getCachedElement('.fixed-space');
          if (fixedSpace) {
            fixedSpace.style.opacity = '0';
            fixedSpace.style.display = 'none';
            fixedSpace.style.pointerEvents = 'none';
            fixedSpace.style.overflow = 'hidden';
            // Forzar reflow para aplicar estilos inmediatamente
            updateHeaderSubtitle(null);
            void fixedSpace.offsetHeight;
          }

          // Limpiar mensajes del chat
          clearChatMessages();

          // Actualizar estado
          setCurrentChat(null);

          // Actualizar URL
          history.pushState({}, '', URL_CONFIG.basePath);

          // Mostrar mensaje de bienvenida con un pequeño retraso
          setTimeout(() => {
            showWelcomeMessage();
          }, 150);
        }, 1500);
      }
} else {
      if (loadingMessage) {
        const errorMessage = error.message || 'Error desconocido';

        // ✅ SOLO DETECTAR Y PASAR A CHAT-NOTICES
        const isFreeUserLimitError = 
          error.isFreeUserLimit || 
          error.isToolLimit ||
          errorMessage.includes('TOOL_') && errorMessage.includes('_LIMIT_REACHED') ||
          errorMessage.includes('DAILY_LIMIT_REACHED') ||
          errorMessage.includes('HOURLY_LIMIT_REACHED') ||
          errorMessage.includes('UPGRADE_REQUIRED') ||
          errorMessage.includes('límite diario') ||
          errorMessage.includes('límite por hora') ||
          errorMessage.includes('Has alcanzado tu límite');

        if (isFreeUserLimitError) {
          console.log('🚫 [FREE USER LIMIT] Pasando error a chat-notices:', errorMessage);
          
          // ✅ PASAR DIRECTAMENTE A CHAT-NOTICES - SIN PROCESAR DATOS
          setTimeout(() => {
            if (typeof showFreeUserLimitNotice === 'function') {
              showFreeUserLimitNotice(loadingMessage, 'daily', {});
            }
          }, 300);

          // Notificación simple sin datos específicos
          acadelError(
            "⏰ ¡Límite alcanzado!",
            "Acadel ha alcanzado tu límite de uso. Los usuarios gratuitos tienen límites para mantener el servicio funcionando"
          );
        }
        // ✅ DETECTAR TOKENS Y PASAR A CHAT-NOTICES
        else if (errorMessage.includes('TOKEN_LIMITS') || 
                 errorMessage.includes('token limit') || 
                 errorMessage.includes('límite de tokens') ||
                 errorMessage.includes('excedería el límite')) {
          
          console.log('🚫 [TOKEN LIMIT] Pasando error a chat-notices:', errorMessage);
          
          setTimeout(() => {
            if (typeof showTokenLimitNotice === 'function') {
              showTokenLimitNotice(loadingMessage, 'límite del sistema');
            }
          }, 300);
          
          acadelError(
            "🧠 ¡Cerebro de capibara saturado!",
            "Este chat llegó a su límite de capacidad. Acadel necesita un nuevo chat para seguir brillando académicamente"
          );
        }
        // ✅ OTROS TIPOS DE ERRORES (mantener lógica existente)
        else if (errorMessage.includes('timeout') || errorMessage.includes('408')) {
          acadelError(
            "⏰ ¡Servidor más lento que capibara en lunes!",
            "La consulta tomó demasiado tiempo. Acadel sugiere intentar de nuevo"
          );
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          acadelError(
            "🌐 Tu internet está jugando al escondite",
            "Acadel no puede conectarse. Revisa tu conexión y volvemos al trabajo"
          );
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
          acadelError(
            "🔐 Acadel no puede verificar tu identidad",
            "Hay un problemilla con tu sesión. Recarga la página para que Acadel te reconozca"
          );
        } else {
          acadelError(
            "😅 ¡Algo no estaba en los libros de Acadel!",
            "Error inesperado, pero no te preocupes. Hasta el capibara más inteligente tiene días difíciles"
          );
        }

        replaceWithError(loadingMessage, error.message, messageToSend);
      }

      // Manejar errores para chats nuevos y existentes (mantener resto del código igual)
      if (isNewChat && newChatId) {
        markChatAsProblem(newChatId);
        setCurrentChat(null);
        history.pushState({}, '', URL_CONFIG.basePath);

        try {
          await deleteChat(newChatId);
          console.log(`Chat con error ${newChatId} eliminado del servidor`);
        } catch (deleteError) {
          console.warn('Error al eliminar chat del servidor:', deleteError);
        }

        // 2. Eliminación directa del DOM
        const chatItem = document.querySelector(`[data-chat-id="${newChatId}"]`);
        if (chatItem) {
          chatItem.style.opacity = '0.5';
          chatItem.style.transition = 'opacity 0.2s ease-out';
          setTimeout(() => chatItem.remove(), 200);
        }

        // 3. Forzar actualización completa del sidebar
        try {
          const updatedChats = await loadChatHistory();
          renderChatHistory(updatedChats);
        } catch (sidebarError) {
          console.error('Error al actualizar sidebar después de marcar chat como problemático:', sidebarError);
        }

        // ⭐ AGREGAR ESTE BLOQUE - RESTAURAR PANTALLA DE BIENVENIDA ⭐
        setTimeout(() => {
          // Ocultar textarea explícitamente primero
          const fixedSpace = getCachedElement('.fixed-space');
          if (fixedSpace) {
            fixedSpace.style.opacity = '0';
            fixedSpace.style.display = 'none';
            fixedSpace.style.pointerEvents = 'none';
            fixedSpace.style.overflow = 'hidden';
            // Forzar reflow para aplicar estilos inmediatamente
            updateHeaderSubtitle(null);
            void fixedSpace.offsetHeight;
          }

          // Limpiar mensajes del chat
          clearChatMessages();

          // Actualizar estado
          setCurrentChat(null);

          // Actualizar URL
          history.pushState({}, '', URL_CONFIG.basePath);

          // Mostrar mensaje de bienvenida con un pequeño retraso
          setTimeout(() => {
            showWelcomeMessage();
          }, 150);
        }, 1500);
      }
      else if (currentChatId) {
        if (error.message && (
          error.message.includes('no encontrado') ||
          error.message.includes('no autorizado') ||
          error.message.includes('timeout')
        )) {
          markChatAsProblem(currentChatId);
        }
      }
    }
  } finally {
    // =====================================================================
    // SECCIÓN CRÍTICA 4: RESTAURACIÓN FINAL DE LA INTERFAZ
    // =====================================================================

    // CRÍTICO: Realizar verificación final del DOM
    if (isInWelcomeScreen) {
      try {
        // 1. Verificar textarea nuevamente y garantizar interactividad
        const finalTextarea = document.getElementById('messageInput');
        if (finalTextarea) {
          // Reset completo de estilos
          finalTextarea.removeAttribute('style');

          // Aplicar estilos críticos finales
          finalTextarea.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            user-select: text !important;
            background-color: var(--input-bg, #ffffff) !important;
            color: var(--text-color, #000000) !important;
          `;

          // Reset de atributos
          finalTextarea.disabled = false;
          finalTextarea.readOnly = false;

          // Reset de clases bloqueantes
          finalTextarea.classList.remove('disabled', 'readonly', 'hidden', 'no-events');

          // Volver a inyectar eventos
          try {
            // Evento de autoajuste
            import('../ui/ui-manager-pdf.js').then(module => {
              if (typeof module.handleTextareaResize === 'function') {
                // Eliminar y volver a añadir para evitar duplicados
                finalTextarea.removeEventListener('input', module.handleTextareaResize);
                finalTextarea.addEventListener('input', module.handleTextareaResize);

                // Forzar un reajuste inicial
                module.handleTextareaResize({ target: finalTextarea });
              }
            }).catch(console.warn);

            // Evento de tecla Enter
            finalTextarea.removeEventListener('keydown', handleKeyPress);
            finalTextarea.addEventListener('keydown', handleKeyPress);

            // Enfocar textarea como paso final
            setTimeout(() => {
              finalTextarea.focus();

              // Truco para forzar selección del cursor
              finalTextarea.selectionStart = finalTextarea.selectionEnd = 0;

              // Segundo intento de foco después de un breve retraso
              setTimeout(() => {
                if (document.activeElement !== finalTextarea) {
                  finalTextarea.focus();
                }

                // VERIFICACIÓN FINAL: Comprobar que el input está funcionando
                // Esto creará un nodo fantasma invisible que captura eventos
                // para garantizar que el input está funcionando correctamente
                const ghostNode = document.createElement('div');
                ghostNode.id = 'textarea-event-catcher';
                ghostNode.style.cssText = `
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 1px;
                  height: 1px;
                  opacity: 0.01;
                  pointer-events: none;
                `;
                document.body.appendChild(ghostNode);

                // Eliminar el nodo fantasma después de 2 segundos
                setTimeout(() => {
                  if (ghostNode.parentNode) {
                    ghostNode.parentNode.removeChild(ghostNode);
                  }
                }, 2000);
              }, 500);
            }, 100);
          } catch (e) {
            console.warn('Error en restauración final del textarea:', e);
          }
        }

        // 2. Verificar contenedor principal y botones
        const finalFixedSpace = document.querySelector('.fixed-space');
        const finalInputBox = document.querySelector('.input-box');
        const finalSendButton = document.querySelector('.input-box button:nth-child(2)');
        const finalAttachButton = document.querySelector('.attach-btn');

        if (finalFixedSpace) {
          finalFixedSpace.style.cssText = `
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          `;
        }

        if (finalInputBox) {
          finalInputBox.style.cssText = `
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          `;
        }

        if (finalSendButton) {
          finalSendButton.style.pointerEvents = 'auto';
          finalSendButton.disabled = false;

          // Re-establecer evento del botón de envío
          finalSendButton.onclick = handleSendMessage;
        }

        if (finalAttachButton) {
          finalAttachButton.style.pointerEvents = 'auto';
          finalAttachButton.disabled = false;

          // Re-establecer evento del botón de adjuntos
          finalAttachButton.onclick = function (e) {
            e.preventDefault();
            const options = document.querySelector('.attachment-options');
            if (options) options.classList.toggle('show');
          };
        }

        // 3. Forzar un reflow completo para aplicar todos los cambios
        void document.documentElement.offsetHeight;
      } catch (e) {
        console.warn('Error en restauración final de la interfaz:', e);
      }
    }

    // 🦫 CERRAR AMBAS NOTIFICACIONES DINÁMICAS ACADÉMICAS
    if (thinkingNotificationId) {
      console.log(`🔔📚 Cerrando notificación dinámica "analizando" como fallback ID: ${thinkingNotificationId}`);
      acadelCerrar(thinkingNotificationId);
    }
    if (slowOperationTimeout) {
      clearTimeout(slowOperationTimeout);
    }
    if (slowOperationNotificationId) {
      console.log(`🔔📚 Cerrando notificación dinámica "paciencia académica" como fallback ID: ${slowOperationNotificationId}`);
      acadelCerrar(slowOperationNotificationId);
    }

    // Continuar con el resto de la limpieza estándar
    setProcessingState(false);

    if (typeof toggleUIState === 'function') {
      // Verificar si el AbortController fue abortado (indica cancelación)
      const wasCancellation = abortController && abortController.signal && abortController.signal.aborted;

      if (!wasCancellation) {
        // Solo restaurar si NO fue cancelación
        toggleUIState(false);
      }
    }

    // Limpiar el controlador de aborto
    import('../ui/ui-manager-pdf.js').then(module => {
      if (typeof module.setCurrentFetchController === 'function') {
        module.setCurrentFetchController(null);
      }
    });

    // Limpiar variables temporales
    if (window.temporaryWelcomeFiles) {
      window.temporaryWelcomeFiles = null;
    }
    if (window.welcomeFiles) {
      window.welcomeFiles.clear();
    }

    // ⭐ SOLUCIÓN: Limpiar ID temporal si hubo error y no se completó el flujo normal
    if (window.tempChatIdForFiles && (isNewChat && !newChatId)) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado por error en creación`);
    }

    // Limpiar caché de elementos para asegurar referencias frescas
    if (typeof clearDomCache === 'function') {
      clearDomCache(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);
    }
  }
}

/**
 * Reinicia el chat para iniciar uno nuevo.
 */
export function handleNewChat() {
  // ✅ AÑADIR LIMPIAR estado de avisos de tokens:
  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }

  setTimeout(() => {
    acadelExito(
      "🆕 ¡Nueva conversación iniciada!",
      "Acadel está emocionado por ayudarte con tus consultas académicas"
    );
  }, 500);
  // NUEVA VERIFICACIÓN: Comprobar si ya estamos en la pantalla de bienvenida
  const welcomeMessageExists = document.querySelector('.welcome-message') !== null;
  const currentChatId = getState('currentChatId');

  // Si ya estamos en un chat nuevo (sin ID de chat activo y con mensaje de bienvenida visible)
  // no necesitamos hacer nada
  if (!currentChatId && welcomeMessageExists) {
    return; // Salir inmediatamente si ya estamos en un nuevo chat
  }

  // AÑADIR AQUÍ: Cerrar panel de previsualización si está abierto
  const previewPanel = document.querySelector('#preview-panel');
  if (previewPanel && previewPanel.classList.contains('open')) {
    try {
      // Intentar importar y usar closePreviewPanel
      import('../components/preview-panel-pdf.js').then(module => {
        if (module && typeof module.closePreviewPanel === 'function') {
          module.closePreviewPanel();
        }
      }).catch(e => {
        console.warn('No se pudo importar closePreviewPanel:', e);

        // Fallback: cerrar el panel manualmente si falla la importación
        previewPanel.classList.remove('open');
        document.body.classList.remove('preview-panel-active');
      });
    } catch (e) {
      // Fallback seguro: cerrar el panel manualmente si algo falla
      previewPanel.classList.remove('open');
      document.body.classList.remove('preview-panel-active');
    }
  }

  // Desactivar chat activo en sidebar
  document.querySelectorAll('.sidebar-item.active').forEach(item => {
    item.classList.remove('active');
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

  // Actualizar URL primero
  history.pushState({}, '', URL_CONFIG.basePath);

  // Mostrar mensaje de bienvenida (después de limpiar todo)
  showWelcomeMessage();
}

/**
 * Función optimizada para cambiar entre chats
 * Implementación centralizada con corrección para el problema de interactividad del textarea
 * ⭐ ACTUALIZADA CON PROCESAMIENTO DE DOCUMENTOS ⭐
 * @param {string} chatId - ID del chat al que cambiar
 */
export async function switchChat(chatId) {

  // ✅ AÑADIR LIMPIAR estado de avisos de tokens:
  if (typeof clearTokenWarnings === 'function') {
    clearTokenWarnings();
  }

  try {
    // Primero, verificar si el chat seleccionado es el mismo que el actual
    const currentChatId = getState('currentChatId');
    if (currentChatId === chatId) {
      return; // Salir inmediatamente si es el mismo chat
    }

    // Control simple de concurrencia
    if (window.isSwitchingChat) return;
    window.isSwitchingChat = true;

    // Validación básica
    if (!validateUUID(chatId)) {
      throw new Error('ID de chat inválido');
    }

    // Verificar si es un chat problemático
    if (typeof isChatProblematic === 'function' && isChatProblematic(chatId)) {
      if (typeof showCleanupDialog === 'function') {
        showCleanupDialog(chatId);
      } else {
        console.warn('Chat problemático detectado pero no se encontró la función showCleanupDialog');
      }
      window.isSwitchingChat = false;
      return;
    }

    // Detectar si estamos en la pantalla de bienvenida
    const isInWelcomeScreen = document.querySelector('.welcome-message, .centered-input-container, .suggestions-container') !== null;

    // Detectar si venimos de acceso directo a URL (sin recargar)
    const isDirectUrlAccess = window.hasDirectlyAccessedUrl === true;

    // Obtener referencias importantes al inicio (evitar redeclaraciones)
    const fixedSpace = document.querySelector('.fixed-space');
    const textarea = document.querySelector('.input-box textarea');
    const inputBox = document.querySelector('.input-box');
    const filePreviewContainer = document.querySelector('.file-preview-container');
    const previewModal = document.getElementById('preview-modal');
    const sendButton = document.querySelector('.input-box button:nth-child(2)');
    const attachButton = document.querySelector('.attach-btn');
    const chatMessages = document.querySelector('.chat-messages');

    acadelInfo(
      "💬 Cambiando de conversación...",
      "Acadel está cargando tus mensajes anteriores"
    );

    // Mostrar indicador de carga
    if (typeof applyChatSwitchSkeleton === 'function') {
      applyChatSwitchSkeleton();
    } else if (chatMessages) {
      // Implementación básica si la función no está disponible
      chatMessages.innerHTML = '<div class="loading-skeleton"><div class="skeleton-loader"></div></div>';
    }

    // ------------------------------------------------
    // FASE 1: LIMPIEZA COMPLETA
    // ------------------------------------------------

    // 1.1: Limpiar elementos de bienvenida
    document.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container').forEach(el => {
      if (el && el.parentNode) {
        if (typeof removeAllEvents === 'function') {
          removeAllEvents(el);
        }
        el.remove();
      }
    });

    // 1.3: Limpiar variables globales de archivos temporales
    if (window.welcomeFiles) {
      window.welcomeFiles.clear();
      window.welcomeFiles = null;
    }

    if (window.temporaryWelcomeFiles) {
      window.temporaryWelcomeFiles = null;
    }

    // 1.5: Cerrar modal de previsualización
    if (previewModal) {
      previewModal.classList.remove('show');
      // Asegurarnos de que no esté oculto con display:none
      previewModal.style.display = '';
    }

    // 1.5b: Cerrar panel de previsualización si está abierto
    const previewPanel = document.querySelector('#preview-panel');
    if (previewPanel && previewPanel.classList.contains('open')) {
      // Remover clase que marca el panel como abierto
      previewPanel.classList.remove('open');

      // Remover clase del body
      document.body.classList.remove('preview-panel-active');

      // Intentar usar la función existente si está disponible
      try {
        import('../components/preview-panel-pdf.js').then(module => {
          if (module && typeof module.closePreviewPanel === 'function') {
            module.closePreviewPanel();
          }
        }).catch(e => {
          console.warn('No se pudo importar closePreviewPanel:', e);
        });
      } catch (e) {
        // Silenciar error - ya hemos cerrado el panel manualmente
      }
    }

    // 1.6: Limpiar archivos adjuntos
    if (typeof clearAttachedFiles === 'function') {
      clearAttachedFiles();
    } else if (filePreviewContainer) {
      // Implementación alternativa básica
      filePreviewContainer.innerHTML = '';
    }

    // 1.7: Limpiar el área de entrada y asegurar interactividad
    if (textarea) {
      // Capturar el HTML original del textarea
      const textareaId = textarea.id || 'messageInput';
      const textareaClasses = textarea.className || '';
      const textareaPlaceholder = textarea.placeholder || 'Envía un mensaje...';

      // Crear un nuevo textarea limpio para evitar comportamientos extraños
      if (isDirectUrlAccess || isInWelcomeScreen) {
        // Si venimos de acceso directo a URL, reemplazar completamente el textarea
        try {
          const newTextarea = document.createElement('textarea');
          newTextarea.id = textareaId;
          newTextarea.className = textareaClasses;
          newTextarea.placeholder = textareaPlaceholder;

          // Reemplazar el textarea existente con uno completamente nuevo
          if (textarea.parentNode) {
            textarea.parentNode.replaceChild(newTextarea, textarea);
          }
        } catch (e) {
          console.warn('Error al reemplazar textarea:', e);
          // En caso de error, intentar limpiar el existente
          textarea.value = '';
          textarea.removeAttribute('style');
          textarea.removeAttribute('disabled');
          textarea.removeAttribute('readonly');
          textarea.style.display = '';
        }
      } else {
        // Limpieza estándar
        textarea.value = '';
        textarea.removeAttribute('style');
        textarea.removeAttribute('disabled');
        textarea.removeAttribute('readonly');
        textarea.style.display = '';
      }
    }

    if (inputBox) {
      inputBox.removeAttribute('style');
      inputBox.style.display = '';
    }

    if (filePreviewContainer) {
      filePreviewContainer.innerHTML = '';
      filePreviewContainer.removeAttribute('style');
      filePreviewContainer.style.display = '';
    }

    // 1.8: Resetear estado de botones
    document.querySelectorAll('.input-box button, .attach-btn').forEach(button => {
      button.classList.remove('active', 'disabled', 'expanded', 'loading');
      button.removeAttribute('style');
      button.style.pointerEvents = 'auto';
    });

    // 1.9: Eliminar modales y backdrops sobrantes
    document.querySelectorAll('.modal, .modal-backdrop, .overlay').forEach(el => {
      if (!el.classList.contains('sidebar-overlay')) {
        if (typeof removeAllEvents === 'function') {
          removeAllEvents(el);
        }
        el.remove();
      }
    });

    // 1.10: Revocar URLs de objetos
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

    // 1.11: Limpiar timeouts
    if (typeof clearManagedTimeouts === 'function') {
      clearManagedTimeouts();
    }

    // 1.12: Eliminar clases en body
    document.body.classList.remove(
      'modal-open', 'preview-panel-active', 'welcome-active', 'initializing',
      'sidebar-expanded', 'has-modal', 'no-scroll', 'overflow-hidden'
    );

    // ------------------------------------------------
    // FASE 2: ACTUALIZAR ESTADO E INTERFAZ
    // ------------------------------------------------

    // 2.1: Actualizar estado del chat
    if (typeof setCurrentChat === 'function') {
      setCurrentChat(chatId);
    }

    // 2.2: Actualizar header
    if (typeof updateHeaderForChat === 'function') {
      updateHeaderForChat(chatId);
    }

    // 2.3: Actualizar sidebar
    if (typeof updateActiveSidebarItem === 'function') {
      updateActiveSidebarItem(chatId);
    }

    // 2.4: Actualizar URL
    if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.chatPath) {
      history.pushState({}, '', URL_CONFIG.chatPath(chatId));
    } else {
      // URL fallback si no está disponible URL_CONFIG
      history.pushState({}, '', `/pdf/chat/${chatId}`);
    }

    // 2.5: Limpiar mensajes
    if (typeof clearChatMessages === 'function') {
      clearChatMessages();
    } else if (chatMessages) {
      // Implementación alternativa
      chatMessages.innerHTML = '';
    }
    // ------------------------------------------------
    // FASE 3: CARGAR Y RENDERIZAR MENSAJES
    // ------------------------------------------------
    try {
      let messages;

      // 3.1: Cargar mensajes usando safeChatAction si está disponible
      if (typeof safeChatAction === 'function' && typeof loadChatMessages === 'function') {
        messages = await safeChatAction(
          chatId,
          () => loadChatMessages(chatId),
          'carga de mensajes'
        );
      } else if (typeof loadChatMessages === 'function') {
        // Alternativa directa
        messages = await loadChatMessages(chatId);
      }

      // 3.2: Renderizar mensajes
      if (typeof renderChatMessages === 'function' && messages) {
        renderChatMessages(messages);

        if (window.innerWidth < 768) {
          setTimeout(() => {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, 350);
        }

        // ⭐ NUEVO: Procesar documentos existentes después de renderizar ⭐
        requestAnimationFrame(() => {
          console.log('🔍 Procesando documentos existentes inmediatamente...');
          processAllExistingMessages();
        });

        // Actualizar IDs de servidor en los mensajes renderizados
        setTimeout(async () => {
          try {
            // Referencias DOM para los mensajes ya renderizados
            const userMessages = document.querySelectorAll('.chat-messages .user-message');
            const aiMessages = document.querySelectorAll('.chat-messages .ai-message');

            // Extraer IDs de los mensajes y asignarlos a los elementos DOM
            if (Array.isArray(messages)) {
              // Asignar IDs a mensajes de usuario
              const userMessagesData = messages.filter(m => m.role === 'user');
              userMessagesData.forEach((msg, index) => {
                if (userMessages[index] && msg.id) {
                  userMessages[index].dataset.serverId = msg.id;
                }
              });

              // Asignar IDs a mensajes de AI
              const aiMessagesData = messages.filter(m => m.role === 'assistant' || m.role === 'ai');
              aiMessagesData.forEach((msg, index) => {
                if (aiMessages[index] && msg.id) {
                  aiMessages[index].dataset.serverId = msg.id;
                }
              });
            }

            // Inicializar interacciones en los mensajes
            const { initResponseInteraction } = await import('../utils/response-interaction-pdf.js');
            if (initResponseInteraction) {
              initResponseInteraction().processExistingMessages(true);
            }
          } catch (error) {
            console.warn("Error al actualizar IDs en switchChat:", error);
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error al cargar mensajes del chat:', error);
    }

    // ------------------------------------------------
    // FASE 4: RESTAURAR COMPONENTES Y FUNCIONALIDAD
    // ------------------------------------------------

    // 4.1: Restaurar visibilidad del área de entrada, especialmente importante al venir de welcome screen
    if (fixedSpace) {
      // Eliminar todos los estilos que puedan ocultarlo
      fixedSpace.removeAttribute('style');

      // Establecer propiedades críticas para visibilidad
      fixedSpace.style.opacity = '1';
      fixedSpace.style.display = '';
      fixedSpace.style.pointerEvents = 'auto';
      fixedSpace.style.visibility = 'visible';

      // Forzar reflow para aplicar cambios inmediatamente
      void fixedSpace.offsetHeight;
    }

    // AÑADIR ESTA LÍNEA - Restaurar explícitamente el estado del botón
    if (typeof toggleUIState === 'function') {
      toggleUIState(false);
    }

    // 4.5: Restaurar contenedor de previsualización si no existe
    let filePreviewRef = filePreviewContainer;
    if (!filePreviewRef) {
      const attachmentsWrapper = document.querySelector('.attachments-wrapper');
      if (attachmentsWrapper) {
        filePreviewRef = document.createElement('div');
        filePreviewRef.className = 'file-preview-container';
        attachmentsWrapper.appendChild(filePreviewRef);
      }
    }

    // 4.6: Recrear preview modal si falta
    let previewModalRef = previewModal;
    if (!previewModalRef) {
      try {
        // Primera opción: usar la función existente si está disponible
        if (typeof createPreviewModal === 'function') {
          createPreviewModal();
          previewModalRef = document.getElementById('preview-modal');
        } else {
          // Implementación básica del modal de previsualización
          const previewModalHTML = `
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
          tempDiv.innerHTML = previewModalHTML;
          document.body.appendChild(tempDiv.firstElementChild);

          previewModalRef = document.getElementById('preview-modal');

          // Configurar cierre del modal sin remover otros eventos existentes
          const previewClose = document.getElementById('preview-close');
          if (previewClose && previewModalRef) {
            previewClose.addEventListener('click', (e) => {
              e.preventDefault();
              previewModalRef.classList.remove('show');
            });
          }

          // Evento de Escape para cerrar
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && previewModalRef.classList.contains('show')) {
              previewModalRef.classList.remove('show');
            }
          });
        }

        // Verificar si se creó correctamente
        if (!document.getElementById('preview-modal')) {
          throw new Error('No se pudo crear el modal de previsualización');
        }
      } catch (error) {
        console.error('Error al crear preview modal:', error);
      }
    }

    // 4.7: Reinicializar EVENT LISTENERS para la previsualización de archivos (CORREGIDO)
    if (filePreviewRef) {
      // IMPORTANTE: NO usar removeAllEvents aquí para conservar delegación de eventos original
      // Si se remueven todos los eventos, podría romper la delegación de eventos

      // En lugar de reemplazar eventos, verificar si ya tiene listeners
      if (!filePreviewRef._hasPreviewListeners) {
        filePreviewRef.addEventListener('click', (e) => {
          // Para botones de eliminación
          const removeButton = e.target.closest('.file-preview-remove');
          if (removeButton) {
            const fileId = removeButton.dataset.fileId;
            if (fileId) {
              if (typeof removeFile === 'function') {
                removeFile(fileId);
              } else {
                // Eliminación básica si la función no está disponible
                const fileElement = document.querySelector(`.file-preview[data-file-id="${fileId}"]`);
                if (fileElement) fileElement.remove();
              }
            }
            return;
          }

          // CRÍTICO: Manejo de clics en elementos de previsualización
          if (!e.target.closest('.file-preview-remove')) {
            const previewElement = e.target.closest('.file-preview');
            if (previewElement) {
              const fileId = previewElement.dataset.fileId;
              const fileType = previewElement.dataset.fileType;

              // Usar función showFilePreview si está disponible
              if (typeof showFilePreview === 'function') {
                showFilePreview(fileId, fileType);
              } else {
                // Implementación básica: intentar importar el módulo
                Promise.any([
                  import('../utils/file-attachments-pdf.js').catch(() => null),
                ]).then(module => {
                  if (module && module.showFilePreview) {
                    module.showFilePreview(fileId, fileType);
                  } else {
                    // Ultimo recurso: mostrar el modal directamente
                    const modal = document.getElementById('preview-modal');
                    if (modal) {
                      // Actualizar título del modal
                      const titleSpan = modal.querySelector('#preview-file-name');
                      if (titleSpan) {
                        const fileName = previewElement.querySelector('.document-preview-name');
                        titleSpan.textContent = fileName ? fileName.textContent : 'Archivo';
                      }

                      // Mostrar modal
                      modal.classList.add('show');
                    }
                  }
                }).catch(err => {
                  console.warn('Error al mostrar vista previa:', err);
                  // Fallback directo
                  const modal = document.getElementById('preview-modal');
                  if (modal) modal.classList.add('show');
                });
              }
            }
          }
        });

        // Marcar que ya tiene los listeners configurados
        filePreviewRef._hasPreviewListeners = true;
      }
    }

    // 4.8: SOLUCIÓN ESPECÍFICA PARA TEXTAREA NO INTERACTIVO
    // Este bloque está especializado en solucionar el problema del textarea no interactivo

    // Obtener el textarea actualizado (podría ser diferente después de reemplazos)
    const currentTextarea = document.querySelector('#messageInput') || document.querySelector('.input-box textarea');

    if (currentTextarea) {
      // 1. Asegurar que el textarea no tiene atributos restrictivos
      currentTextarea.removeAttribute('disabled');
      currentTextarea.removeAttribute('readonly');
      currentTextarea.removeAttribute('aria-hidden');

      // 2. Asegurar que el textarea está visible correctamente
      currentTextarea.style.display = '';
      currentTextarea.style.visibility = 'visible';
      currentTextarea.style.opacity = '1';
      currentTextarea.style.pointerEvents = 'auto';

      // 3. Eliminar todos los estilos personalizados y clases de deshabilitado
      currentTextarea.classList.remove('disabled', 'readonly', 'no-interact');

      // 4. Limpiar y restaurar eventos
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(currentTextarea);
      }

      // 5. Añadir eventos básicos de control
      // Importar dinámicamente el controlador de chat
      Promise.any([
        import('./chat-controller-pdf.js').catch(() => null),
      ]).then(chatControllerModule => {
        if (chatControllerModule && chatControllerModule.handleKeyPress) {
          currentTextarea.addEventListener('keydown', chatControllerModule.handleKeyPress);
        } else {
          // Fallback básico para Enter
          currentTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const sendEvent = new CustomEvent('sendMessageRequest');
              window.dispatchEvent(sendEvent);
            }
          });
        }

        // Auto-resize si está disponible
        Promise.any([
          import('../ui/ui-manager-pdf.js').catch(() => null),
        ]).then(uiModule => {
          if (uiModule && uiModule.handleTextareaResize) {
            currentTextarea.addEventListener('input', uiModule.handleTextareaResize);
            // Disparar evento input para inicializar altura
            currentTextarea.dispatchEvent(new Event('input'));
          } else {
            // Auto-resize básico
            currentTextarea.addEventListener('input', function () {
              this.style.height = 'auto';
              this.style.height = (this.scrollHeight) + 'px';
            });
            // Disparar evento input para inicializar altura
            currentTextarea.dispatchEvent(new Event('input'));
          }
        }).catch(() => {
          // Último recurso: auto-resize directo
          currentTextarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
          });
          currentTextarea.dispatchEvent(new Event('input'));
        });

        // 6. Focus + Timeout para forzar interactividad
        setTimeout(() => {
          try {
            currentTextarea.focus();
            // Provocar un reflow de la página para forzar re-renderizado
            void document.body.offsetHeight;
          } catch (e) {
            console.warn('Error al enfocar textarea:', e);
          }
        }, 100);

        // 7. Segundo intento después de un tiempo más largo (por si hay animaciones)
        setTimeout(() => {
          try {
            // Verificar si el textarea sigue siendo no interactivo
            const textarea = document.querySelector('#messageInput');
            if (textarea) {
              // Re-aplicar forzado de interactividad
              textarea.focus();
              textarea.blur();
              textarea.focus();
            }
          } catch (e) {
            console.warn('Error en segundo intento de foco:', e);
          }
        }, 500);
      }).catch(error => {
        console.warn('Error al configurar eventos del textarea:', error);
        // Fallback directo si fallan las importaciones
        currentTextarea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Enviar mensaje directo a través del botón
            const sendBtn = document.querySelector('.input-box button:nth-child(2)');
            if (sendBtn) sendBtn.click();
          }
        });

        // Añadir auto-resize básico
        currentTextarea.addEventListener('input', function () {
          this.style.height = 'auto';
          this.style.height = (this.scrollHeight) + 'px';
        });

        // Forzar interactividad
        setTimeout(() => currentTextarea.focus(), 100);
      });
      try {
        hideLimitAlert();

        // Limpiar cualquier contador existente
        const existingCounters = document.querySelectorAll('.character-counter');
        existingCounters.forEach(counter => {
          if (counter && counter.parentNode) {
            counter.parentNode.removeChild(counter);
          }
        });

        // Reinicializar el limitador
        setTimeout(() => {
          initCharacterLimit(currentTextarea, { variant: 'pdf' });
        }, 50);
      } catch (e) {
        console.warn('Error al gestionar límite de caracteres:', e);
      }
    }

    // 4.9: Reinicializar botón de envío
    if (sendButton) {
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(sendButton);
      }

      // Importar dinámicamente el controlador de chat
      Promise.any([
        import('./chat-controller-pdf.js').catch(() => null),
      ]).then(chatControllerModule => {
        if (chatControllerModule && chatControllerModule.handleSendMessage) {
          sendButton.addEventListener('click', chatControllerModule.handleSendMessage);
        } else {
          // Fallback básico
          sendButton.addEventListener('click', () => {
            const sendEvent = new CustomEvent('sendMessageRequest');
            window.dispatchEvent(sendEvent);
          });
        }
      }).catch(console.warn);
    }

    // 4.10: Reinicializar botón de adjuntos
    if (attachButton) {
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(attachButton);
      }

      attachButton.addEventListener('click', function (e) {
        e.preventDefault();
        const options = document.querySelector('.attachment-options');
        if (options) options.classList.toggle('show');
      });
    }

    // 4.11: Restaurar funcionalidad de Drag & Drop
    try {
      // Obtener referencias a los elementos de drag & drop
      const fileUploadContainer = document.querySelector('.file-upload-container');
      const dragDropArea = document.querySelector('#drag-drop-area');

      if (fileUploadContainer && !fileUploadContainer._hasDragDropEvents) {
        // Eventos para mostrar/ocultar el área de drop
        document.addEventListener('dragenter', (e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes('Files')) {
            fileUploadContainer.classList.add('active');
          }
        }, false);

        fileUploadContainer.addEventListener('dragover', (e) => {
          e.preventDefault();
          fileUploadContainer.classList.add('dragging');
        }, false);

        fileUploadContainer.addEventListener('dragleave', (e) => {
          e.preventDefault();
          if (!e.relatedTarget || !fileUploadContainer.contains(e.relatedTarget)) {
            fileUploadContainer.classList.remove('dragging');
          }
        }, false);

        // Eliminar clases al salir completamente del documento
        document.addEventListener('dragleave', (e) => {
          if (e.clientX <= 0 || e.clientY <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            fileUploadContainer.classList.remove('active', 'dragging');
          }
        }, false);

        // Escape para cerrar
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && fileUploadContainer.classList.contains('active')) {
            fileUploadContainer.classList.remove('active', 'dragging');
          }
        }, false);

        // Clic fuera para cerrar
        document.addEventListener('click', (e) => {
          if (fileUploadContainer.classList.contains('active') &&
            !fileUploadContainer.contains(e.target)) {
            fileUploadContainer.classList.remove('active', 'dragging');
          }
        }, false);

        // Procesar archivos soltados
        fileUploadContainer.addEventListener('drop', (e) => {
          e.preventDefault();
          fileUploadContainer.classList.remove('dragging', 'active');

          if (e.dataTransfer.files.length > 0) {
            // Importar dinámicamente si está disponible handleDroppedFiles
            Promise.any([
              import('../utils/file-attachments-pdf.js').catch(() => null),
            ]).then(module => {
              if (module && typeof module.handleDroppedFiles === 'function') {
                module.handleDroppedFiles(e.dataTransfer.files);
              } else if (typeof handleDroppedFiles === 'function') {
                handleDroppedFiles(e.dataTransfer.files);
              } else {
                console.warn('Función handleDroppedFiles no encontrada');
              }
            }).catch(err => {
              console.warn('Error al importar módulo de archivos:', err);
            });
          }
        }, false);

        // Marcar que ya tiene los eventos configurados
        fileUploadContainer._hasDragDropEvents = true;
      }
    } catch (error) {
      console.warn('Error al restaurar funcionalidad de Drag & Drop:', error);
    }

    // 4.12: CHECKEO DE LAST-RESORT - Eliminar elementos que puedan bloquear interactividad
    // Estos elementos son conocidos por causar problemas en algunas circunstancias
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

    // 4.13: Marcar flag para futuras detecciones de acceso directo a URL
    window.hasDirectlyAccessedUrl = false;

  } catch (error) {
    console.error('Error general en switchChat:', error);

    // Asegurar que la interfaz quede utilizable incluso en caso de error
    const fixedSpaceRef = document.querySelector('.fixed-space');
    if (fixedSpaceRef) {
      fixedSpaceRef.style.opacity = '1';
      fixedSpaceRef.style.display = '';
      fixedSpaceRef.style.pointerEvents = 'auto';
      fixedSpaceRef.style.visibility = 'visible';
    }

    // Ultimo intento de recuperación en caso de error grave
    try {
      const mainTextarea = document.querySelector('#messageInput');
      if (mainTextarea) {
        mainTextarea.removeAttribute('disabled');
        mainTextarea.removeAttribute('readonly');
        mainTextarea.style.pointerEvents = 'auto';
        mainTextarea.focus();
      }
    } catch (e) {
      console.warn('Error en recuperación de último recurso:', e);
    }
  } finally {
    // NO eliminar el skeleton de carga todavía, vamos a sincronizarlo con la verificación del PDF
    console.log('Esperando a que se complete la verificación del PDF antes de quitar el skeleton...');

    // Importar y ejecutar la verificación del PDF, esperando a que se complete
    try {
      const pdfStateModule = await import('../services/pdf-state.js');
      if (typeof pdfStateModule.checkPDF === 'function') {
        // Forzar el reinicio del estado del PDF primero
        if (typeof pdfStateModule.updatePDFState === 'function') {
          pdfStateModule.updatePDFState({
            hasPDF: false,
            loading: true,
            currentPDFId: null,
            pdfInfo: null,
            lastCheck: 0, // Importante: resetear esto para forzar nueva verificación
            totalPages: 0,
            currentPage: 1,
            showPanel: false // Aseguramos que el panel inicie cerrado
          });
        }

        // Realizar la verificación de PDF (forzar check=true)
        console.log(`Verificando PDF para chat: ${chatId}`);
        const hasPDF = await pdfStateModule.checkPDF(true);
        console.log(`Resultado verificación PDF: ${hasPDF ? 'Tiene PDF' : 'No tiene PDF'}`);
      }
    } catch (error) {
      console.error('Error al verificar PDF:', error);
    }

    // AHORA sí, quitar el skeleton una vez que se verificó el PDF
    console.log('Verificación de PDF completada, quitando skeleton...');
    if (typeof removeChatSwitchSkeleton === 'function') {
      removeChatSwitchSkeleton();
    } else {
      document.querySelectorAll('.loading-skeleton').forEach(el => el.remove());
    }

    if (window.innerWidth < 768) {
      setTimeout(() => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;

          // Scroll adicional con delay para asegurar que se aplica después de toda animación
          setTimeout(() => {
            chatMessages.scrollTo({
              top: chatMessages.scrollHeight,
              behavior: 'smooth'
            });
          }, 150);
        }
      }, 400);
    }

    // Marcar como finalizado
    window.isSwitchingChat = false;

    // Limpiar cache DOM si la función está disponible
    if (typeof clearDomCache === 'function') {
      clearDomCache();
    }

    // Eliminar cualquier bloqueo de UI global que pueda existir
    document.body.style.pointerEvents = '';
  }
}

/**
 * Envía el mensaje cuando se presiona Enter (sin shift).
 * @param {KeyboardEvent} e - Evento de teclado.
 */
function handleKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();

    // Verificar límite de caracteres antes de enviar
    const messageText = e.target.value.trim();
    if (messageText && exceedsLimit(messageText)) {
      showLimitExceededAlert();
      return; // No enviar mensaje si excede el límite
    }

    handleSendMessage();
  }
}

/**
 * Maneja la eliminación de un chat, ya sea regular o problemático
 * Versión mejorada que también elimina el PDF asociado
 * @param {string} chatId - ID del chat a eliminar
 */
export async function handleDeleteChat(chatId) {
  try {
    // Cerrar cualquier modal existente primero para evitar duplicación
    const closeExistingModals = () => {
      // Buscar todos los modales que podrían estar abiertos
      const activeModals = document.querySelectorAll('.modal, .custom-modal, .modal-backdrop, .empty-chat-modal');

      activeModals.forEach(modal => {
        // Intentar cerrar con botones primero
        const closeButtons = modal.querySelectorAll('.close-modal, .modal-close, #emptyModalClose, .btn-close, .close');

        let closed = false;
        if (closeButtons.length > 0) {
          closeButtons[0].click();
          closed = true;
        }

        // Si no hay botones, eliminar manualmente
        if (!closed) {
          modal.classList.remove('show', 'fade', 'in');
          modal.style.display = 'none';

          // Eliminar después de una breve animación
          setTimeout(() => {
            if (modal.parentNode) {
              modal.parentNode.removeChild(modal);
            }
          }, 100);
        }
      });

      // Limpiar también cualquier clase de modal en el body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };

    // Cerrar modales existentes antes de continuar
    closeExistingModals();

    // Verificar si es un chat problemático
    if (isChatProblematic(chatId)) {
      // Mostrar indicador de carga (feedback visual)
      import('../ui/ui-manager-pdf.js').then(module => {
        if (typeof module.showLoading === 'function') {
          module.showLoading('Eliminando chat problemático...');
        }
      });

      // Si es problemático, eliminar directamente con la función del módulo de error
      import('../utils/chat-error-handler-pdf.js').then(async module => {
        if (typeof module.removeProblematicChat === 'function') {
          const result = await module.removeProblematicChat(chatId);

          // Eliminar también el PDF si existe
          try {
            await deletePDFForChat(chatId);
          } catch (pdfError) {
            console.warn('Error al eliminar PDF asociado:', pdfError);
          }

          // Ocultar indicador de carga
          import('../ui/ui-manager-pdf.js').then(uiModule => {
            if (typeof uiModule.hideLoading === 'function') {
              uiModule.hideLoading();
            }

            // Mostrar mensaje de éxito o error
            if (result) {
              if (typeof uiModule.showSuccess === 'function') {
                uiModule.showSuccess('Chat eliminado de la lista');
              }
            } else {
              if (typeof uiModule.showError === 'function') {
                uiModule.showError('Error al eliminar el chat problemático');
              }
            }
          });

          // Si era el chat actual, crear uno nuevo CON OVERLAY
          if (getState('currentChatId') === chatId) {
            showDeleteChatOverlay(() => {
              // Ocultar textarea explícitamente primero
              const fixedSpace = getCachedElement('.fixed-space');
              if (fixedSpace) {
                fixedSpace.style.opacity = '0';
                fixedSpace.style.display = 'none';
                fixedSpace.style.pointerEvents = 'none';
                fixedSpace.style.overflow = 'hidden';
                // Forzar reflow para aplicar estilos inmediatamente
                updateHeaderSubtitle(null);
                void fixedSpace.offsetHeight;
              }

              // Limpiar mensajes del chat
              clearChatMessages();

              // Actualizar estado
              setCurrentChat(null);

              // Actualizar URL
              history.pushState({}, '', URL_CONFIG.basePath);

              // Mostrar mensaje de bienvenida con un pequeño retraso
              setTimeout(() => {
                hideDeleteChatOverlay();
                showWelcomeMessage();
              }, 150);
            });
          }
        }
      });

      return;
    }

    // Esperar un momento para asegurar que los modales se cerraron
    setTimeout(async () => {
      try {
        // ⭐ CAMBIO: Importar módulos necesarios directamente ⭐
        const chatModule = await import('../api/chat-pdf.js');
        const stateModule = await import('./state-pdf.js');
        const { showConfirmation } = await import('../ui/modals-pdf.js'); // ← CAMBIO CLAVE

        const deleteChat = chatModule.deleteChat;
        const setCurrentChat = stateModule.setCurrentChat;
        const getState = stateModule.getState;

        const isCurrentChat = getState('currentChatId') === chatId;

        // ⭐ CAMBIO: Mostrar confirmación DIRECTA ⭐
        const confirmed = await showConfirmation(
          '🗑️ ¡Acadel pregunta!',
          '¿Estás seguro de eliminar esta conversación? Una vez que Acadel la borre, no podrá recuperarla (ni siquiera con magia de capibara)'
        );

        if (!confirmed) {
          return; // Usuario canceló
        }

        // ⭐ RESTO IGUAL: Mostrar overlay después de confirmar ⭐
        if (isCurrentChat) {
          showDeleteChatOverlay();
        }

        // CORREGIDO: Primero eliminar el PDF asociado
        try {
          await deletePDFForChat(chatId);
        } catch (pdfError) {
          console.warn('Error al eliminar PDF asociado:', pdfError);
          // Continuar con la eliminación del chat aunque falle la eliminación del PDF
        }

        // Si no es problemático, intentar eliminar normalmente
        await deleteChat(chatId, false);

        // Eliminar de la UI
        const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatItem) {
          chatItem.remove();
        }

        // Mostrar mensaje de éxito
        acadelExito(
          "🗑️ ¡Conversación eliminada!",
          "Acadel limpió exitosamente tu espacio de trabajo académico"
        );

        // ⭐ NUEVO: Manejar transición a pantalla de bienvenida con overlay ⭐
        if (isCurrentChat) {
          setTimeout(() => {
            // Ocultar textarea explícitamente primero
            const fixedSpace = getCachedElement('.fixed-space');
            if (fixedSpace) {
              fixedSpace.style.opacity = '0';
              fixedSpace.style.display = 'none';
              fixedSpace.style.pointerEvents = 'none';
              fixedSpace.style.overflow = 'hidden';
              // Forzar reflow para aplicar estilos inmediatamente
              updateHeaderSubtitle(null);
              void fixedSpace.offsetHeight;
            }

            // Limpiar mensajes del chat
            clearChatMessages();

            // Actualizar estado
            setCurrentChat(null);

            // Actualizar URL
            history.pushState({}, '', URL_CONFIG.basePath);

            // ⭐ NUEVO: Mostrar mensaje de bienvenida y ocultar overlay ⭐
            setTimeout(() => {
              hideDeleteChatOverlay();
              showWelcomeMessage();
            }, 150);
          }, 100);
        } else {
          hideDeleteChatOverlay();
        }

        // Actualizar historial de chats
        const updatedChats = await loadChatHistory();
        renderChatHistory(updatedChats);

      } catch (error) {
        console.error('Error al eliminar chat:', error);

        // ⭐ NUEVO: Ocultar overlay en caso de error ⭐
        hideDeleteChatOverlay();

        // ⭐ CAMBIO: Preguntar si eliminar solo de la UI ⭐
        const forceDelete = await showConfirmation(
          'Error al eliminar chat',
          'No se pudo eliminar el chat de la base de datos. ¿Deseas eliminarlo de la lista de todos modos?'
        );

        if (forceDelete) {
          // Mostrar overlay nuevamente para esta operación
          const isCurrentChat = getState('currentChatId') === chatId;
          if (isCurrentChat) {
            showDeleteChatOverlay();
          }

          // Eliminar de la UI solamente
          const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
          if (chatItem) {
            chatItem.remove();
          }

          // Marcar como problemático
          import('../utils/chat-error-handler-pdf.js').then(errorModule => {
            if (typeof errorModule.markChatAsProblem === 'function') {
              errorModule.markChatAsProblem(chatId);
            }
          });

          acadelExito(
            "📋 Chat removido de la lista",
            "Acadel organizó tu interfaz como buen profesor ordenado"
          );

          if (isCurrentChat) {
            setTimeout(() => {
              // Ocultar textarea explícitamente primero
              const fixedSpace = getCachedElement('.fixed-space');
              if (fixedSpace) {
                fixedSpace.style.opacity = '0';
                fixedSpace.style.display = 'none';
                fixedSpace.style.pointerEvents = 'none';
                fixedSpace.style.overflow = 'hidden';
                // Forzar reflow para aplicar estilos inmediatamente
                updateHeaderSubtitle(null);
                void fixedSpace.offsetHeight;
              }

              // Limpiar mensajes del chat
              clearChatMessages();

              // Actualizar estado
              setCurrentChat(null);

              // Actualizar URL
              history.pushState({}, '', URL_CONFIG.basePath);

              // Mostrar mensaje de bienvenida y ocultar overlay
              setTimeout(() => {
                hideDeleteChatOverlay();
                showWelcomeMessage();
              }, 150);
            }, 100);
          } else {
            hideDeleteChatOverlay();
          }
        }
      }
    }, 150); // Pequeño retraso para asegurarse de que los modales se cerraron
  } catch (error) {
    console.error('Error general durante eliminación de chat:', error);
    hideDeleteChatOverlay(); // Asegurar que se oculte el overlay en caso de error
    acadelError(
      "😅 No pude eliminar el chat completamente",
      "Acadel tuvo problemas con el servidor, pero lo quitó de tu lista"
    );
  }
  // Limpiar caché de elementos para asegurar referencias frescas en el próximo uso
  clearDomCache(['.fixed-space', '.input-box', '#messageInput', '#sendButton']);
}

function showDeleteChatOverlay(callback = null) {
  // Verificar si ya existe un overlay
  if (document.querySelector('.delete-chat-overlay')) {
    console.log('Overlay de eliminación ya existe');
    return;
  }

  console.log('🗑️ Mostrando overlay de eliminación de chat');

  // Crear elementos del overlay
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

  // Crear overlay principal
  const overlay = document.createElement('div');
  overlay.className = 'delete-chat-overlay';
  overlay.id = 'delete-chat-overlay-' + Date.now();
  overlay.appendChild(spinnerContainer);

  // Agregar estilos inline para garantizar visibilidad
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

  // Agregar al DOM
  document.body.appendChild(overlay);

  // Activar con animación
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  // Ejecutar callback si se proporciona
  if (callback && typeof callback === 'function') {
    setTimeout(callback, 100);
  }

  // Guardar referencia global para poder ocultarlo
  window.currentDeleteChatOverlay = overlay;
}

/**
 * ⭐ NUEVA: Oculta overlay de eliminación de chat ⭐
 */
function hideDeleteChatOverlay() {
  const overlay = window.currentDeleteChatOverlay || document.querySelector('.delete-chat-overlay');

  if (!overlay) {
    console.log('No hay overlay de eliminación para ocultar');
    return;
  }

  console.log('✅ Ocultando overlay de eliminación de chat');

  // Animar salida
  overlay.style.opacity = '0';

  // Eliminar después de la animación
  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    // Limpiar referencia global
    window.currentDeleteChatOverlay = null;
  }, 300);
}

/**
 * Función auxiliar para eliminar el PDF asociado a un chat
 * @param {string} chatId - ID del chat
 * @returns {Promise} - Promesa que se resuelve cuando se elimina el PDF
 */
async function deletePDFForChat(chatId) {
  // Importar funciones necesarias
  const { hasPDF, deletePDF } = await import('../services/pdf-api.js');
  const { initPDFCheck, togglePDFPanel } = await import('../services/pdf-state.js');
  const { updatePDFButtonsVisibility } = await import('../utils/pdf-button-controller.js');

  // Verificar si el chat tiene un PDF
  const pdfResult = await hasPDF(chatId);

  if (pdfResult && pdfResult.hasPDF && pdfResult.pdfInfo) {
    console.log('Chat tiene PDF asociado, eliminando también PDF:', pdfResult.pdfInfo);

    // Si el panel está abierto, cerrarlo primero
    togglePDFPanel(false);

    // Eliminar el PDF
    await deletePDF(pdfResult.pdfInfo.pdfId);
    console.log('PDF eliminado exitosamente');

    // Actualizar el estado y la UI
    initPDFCheck();
    updatePDFButtonsVisibility(false);

    // INSERTAR AQUÍ - Asegurar scroll después de eliminar PDF
    if (window.innerWidth < 768) {
      setTimeout(() => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }, 350);
    }

    return true;
  }

  return false;
}

/**
 * ⭐ NUEVA: Verifica si hay un chat en la URL al iniciar y lo carga ⭐
 * ACTUALIZADA con procesamiento de documentos
 */
async function checkInitialChatFromURL() {
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];

  if (chatId && validateUUID(chatId)) {
    // Verificar si es un chat problemático
    if (isChatProblematic(chatId)) {
      showCleanupDialog(chatId);
      return;
    }

    // Restaurar visibilidad del textarea inmediatamente
    document.documentElement.classList.remove('welcome-pending');
    // Ensure textarea visibility
    const fixedSpace = getCachedElement('.fixed-space');
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('visibility');
      void fixedSpace.offsetHeight;
    }

    // CAMBIO IMPORTANTE: Flag para indicar carga inicial
    window.isInitialChatLoad = true;

    try {
      const chats = await loadChatHistory();
      renderChatHistory(chats);

      // Establecer el chat actual sin mostrar el skeleton de cambio
      setCurrentChat(chatId);
      updateHeaderForChat(chatId);
      updateActiveSidebarItem(chatId);

      // Cargar mensajes directamente sin usar switchChat
      const messages = await safeChatAction(
        chatId,
        () => loadChatMessages(chatId),
        'carga de mensajes'
      );

      if (messages) {
        renderChatMessages(messages);

        // ⭐ NUEVO: Procesar documentos existentes después de renderizar ⭐
        requestAnimationFrame(() => {
          console.log('🔍 Procesando documentos existentes inmediatamente...');
          processAllExistingMessages();
        });

        // NUEVA SECCIÓN: Actualizar IDs de servidor en los mensajes renderizados
        setTimeout(async () => {
          try {
            // Referencias DOM para los mensajes ya renderizados
            const userMessages = document.querySelectorAll('.chat-messages .user-message');
            const aiMessages = document.querySelectorAll('.chat-messages .ai-message');

            // Extraer IDs de los mensajes y asignarlos a los elementos DOM
            if (Array.isArray(messages)) {
              // Asignar IDs a mensajes de usuario
              const userMessagesData = messages.filter(m => m.role === 'user');
              userMessagesData.forEach((msg, index) => {
                if (userMessages[index] && msg.id) {
                  userMessages[index].dataset.serverId = msg.id;
                }
              });

              // Asignar IDs a mensajes de AI
              const aiMessagesData = messages.filter(m => m.role === 'assistant' || m.role === 'ai');
              aiMessagesData.forEach((msg, index) => {
                if (aiMessages[index] && msg.id) {
                  aiMessages[index].dataset.serverId = msg.id;
                }
              });
            }

            // Inicializar interacciones en los mensajes
            import('../utils/response-interaction-pdf.js').then(module => {
              if (module && typeof module.initResponseInteraction === 'function') {
                module.initResponseInteraction().processExistingMessages(true);
              }
            }).catch(e => console.warn('Error al inicializar interacciones:', e));
          } catch (error) {
            console.warn("Error al actualizar IDs en carga inicial:", error);
          }
        }, 300);
      }

      // Eliminar el flag después de la carga
      window.isInitialChatLoad = false;
    } catch (error) {
      console.error('Error al cargar chat inicial:', error);
      // Caer en la versión completa de switchChat solo si falla la carga directa
      window.isInitialChatLoad = false;
      switchChat(chatId);
    }
  } else {
    showWelcomeMessage();
  }
}

/**
 * ⭐ NUEVA: Procesa JSON doblemente escapado o normal ⭐
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
 * ⭐ NUEVA: Formatea contenido multimodal de forma síncrona ⭐
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
    // Limpiar el texto de marcadores de archivos adjuntos
    let processedText = cleanedText.replace(/\[Archivos adjuntos para análisis\]/g, '').trim();

    const processedMarkdown = typeof parseMarkdownToHTML === 'function' ?
      parseMarkdownToHTML(processedText) : processedText;
    html += `<div class="multimodal-text">${processedMarkdown}</div>`;
  }

  // ⭐ CONTENEDOR UNIFICADO PARA TODOS LOS ELEMENTOS ⭐
  const hasImages = images.length > 0;
  const hasDocuments = documents.length > 0;

  if (hasImages || hasDocuments) {
    html += `<div class="unified-attachments">`;

    // ⭐ PROCESAR IMÁGENES ⭐
    if (hasImages) {
      const validImages = images.filter(img => img && img.path);

      validImages.forEach(img => {
        html += `
          <div class="chat-image-item clickable" onclick="window.showFullImage('${escapeHtml(img.path)}')">
            <img src="${escapeHtml(img.path)}" alt="Imagen adjunta">
          </div>
        `;
      });
    }

    // ⭐ PROCESAR DOCUMENTOS ⭐
    if (hasDocuments) {
      const validDocuments = documents.filter(doc => doc && doc.fileId);

      validDocuments.forEach(doc => {
        const iconClass = getIconForFileType(doc.attachmentType || 'document');
        const fileName = truncateFileNameSimple(doc.originalName || 'Documento', 15);
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
 * ⭐ NUEVA: Procesa todos los mensajes existentes ⭐
 */
function processAllExistingMessages() {
  console.log('🔍 Procesando todos los mensajes existentes en sistema PDF...');

  // Método 1: Usar content-processing para buscar documentos no clickeables
  if (typeof processExistingDocuments === 'function') {
    processExistingDocuments();
  } else {
    // Importar dinámicamente si no está disponible
    import('../ui/content-processing-pdf.js').then(module => {
      if (module.processExistingDocuments) {
        module.processExistingDocuments();
      }
    }).catch(e => console.warn('Error al importar processExistingDocuments:', e));
  }

  // Método 2: Procesar mensajes de usuario específicamente para JSON multimodal
  const userMessages = document.querySelectorAll('.user-message');
  console.log(`Encontrados ${userMessages.length} mensajes de usuario para procesar`);

  userMessages.forEach((messageElement) => {
    try {
      // Buscar elementos con datos originales
      const textElements = messageElement.querySelectorAll('.message-text, .multimodal-text, .message-content');
      textElements.forEach(textElement => {
        let content = textElement.textContent || textElement.innerHTML;

        // También verificar data-original-text
        const originalText = textElement.dataset.originalText;
        if (originalText) {
          try {
            const decodedText = decodeURIComponent(originalText);

            // ⭐ DETECTAR MÚLTIPLES JSONs CONCATENADOS ⭐
            if (decodedText.includes('}{') && (decodedText.includes('hasDocuments') || decodedText.includes('hasImage'))) {
              console.log('🔍 Detectados JSONs concatenados, procesando...');
              const processedContent = processMultipleJSONs(decodedText);
              if (processedContent !== decodedText) {
                textElement.innerHTML = processedContent;
                textElement.setAttribute('data-processed', 'true');

                // Activar eventos de documentos inmediatamente
                if (typeof activateDocumentEvents === 'function') {
                  activateDocumentEvents(textElement);
                }

                console.log('✅ JSONs concatenados procesados inmediatamente');
                return;
              }
            }

            // ⭐ PROCESAR JSON INDIVIDUAL ⭐
            const processedContent = processEscapedJSON(decodedText);
            if (processedContent !== decodedText) {
              textElement.innerHTML = processedContent;
              textElement.setAttribute('data-processed', 'true');

              // Activar eventos de documentos inmediatamente
              if (typeof activateDocumentEvents === 'function') {
                activateDocumentEvents(textElement);
              }

              console.log('✅ JSON individual procesado inmediatamente');
            }
          } catch (e) {
            console.warn('Error al procesar originalText:', e);
          }
        }

        // ⭐ PROCESAR CONTENIDO DIRECTO SI NO HAY originalText ⭐
        else if (content && (content.includes('hasDocuments') || content.includes('hasImage') || content.includes('documents'))) {
          try {
            const processedContent = processEscapedJSON(content);
            if (processedContent !== content) {
              textElement.innerHTML = processedContent;
              textElement.setAttribute('data-processed', 'true');

              if (typeof activateDocumentEvents === 'function') {
                activateDocumentEvents(textElement);
              }
            }
          } catch (e) {
            console.warn('Error al procesar contenido directo:', e);
          }
        }
      });
    } catch (e) {
      console.warn('Error al procesar mensaje de usuario:', e);
    }
  });

  console.log(`✅ Procesamiento de mensajes existentes PDF completado`);
}

/**
 * ⭐ NUEVA: Procesa múltiples JSONs concatenados ⭐
 */
function processMultipleJSONs(content) {
  // Detectar múltiples JSONs concatenados
  if (typeof content === 'string' && content.includes('}{')) {
    try {
      // Intentar separar JSONs válidos
      const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

      if (jsonMatches && jsonMatches.length > 1) {
        console.log(`🔍 Detectados ${jsonMatches.length} JSONs concatenados`);

        let combinedHTML = '<div class="multimodal-container">';
        let hasProcessedContent = false;

        jsonMatches.forEach((jsonStr, index) => {
          try {
            const parsedData = JSON.parse(jsonStr);

            if ((parsedData.hasDocuments && parsedData.documents) ||
              (parsedData.hasImage && parsedData.images)) {

              const processedHTML = formatMultimodalContentSync(parsedData);
              // Extraer solo el contenido interno, no el contenedor
              const innerContent = processedHTML.replace(/<div class="multimodal-container">(.*)<\/div>/s, '$1');
              combinedHTML += innerContent;
              hasProcessedContent = true;
            }
          } catch (e) {
            console.warn(`Error al procesar JSON ${index + 1}:`, e);
          }
        });

        combinedHTML += '</div>';

        if (hasProcessedContent) {
          return combinedHTML;
        }
      }
    } catch (e) {
      console.warn('Error al procesar múltiples JSONs:', e);
    }
  }

  return content;
}

/**
 * ⭐ NUEVA: Observer para procesar mensajes después de renderizarse ⭐
 */
function setupMessageObserver() {
  const chatMessages = document.querySelector('.chat-messages');
  if (!chatMessages) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains('user-message')) {

            setTimeout(() => {
              processMessageElement(node);
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

  console.log('✅ Observer de mensajes PDF configurado');
}

/**
 * ⭐ FUNCIONES AUXILIARES ⭐
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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

window.handleSendMessage = handleSendMessage;


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
  hideDeleteChatOverlay,
  showDeleteChatOverlay
};

// ⭐ NUEVA EXPORTACIÓN: Función simplificada para añadir mensajes ⭐
export { addMessageWithAttachmentsSimplified as addMessageWithAttachments };