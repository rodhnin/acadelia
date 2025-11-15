/**
 * message-renderer.js - AGENTE Sistema optimizado de renderizado de mensajes con soporte matemático
 * VERSIÓN REFACTORIZADA - Funcionalidad de imágenes delegada a markdown-image-processor.js compartido
 */

import { APP_CONFIG } from '../core/config-agente.js';
import { getElement } from './ui-manager-agente.js';
import { getState} from '../core/state-agente.js';
import {
  parseMarkdownToHTML,
  containsMarkdownTable,
  containsCodeBlocks,
  containsMathExpressions,
  detectAndRenderMarkdownTables,
  detectAndRenderTable,
  processContentWithCodeBlocks,
  renderFormattedTable,
  buildCodeBlockHTML
} from '../utils/markdown-agente.js';
import { renderMath } from '../math/mathjax-config-agente.js';
import { renderExam } from '../components/exam-renderer-agente.js';
import { copyToClipboard } from '../utils/clipboard-agente.js';
import { createElement, clearElement, addEvent, getAttribute, createElementWithHTML, setManagedTimeout } from '../../../shared/dom-helpers.js';
import {
  initializeMermaidDiagram,
  initMermaidSystem
} from '../../../shared/mermaid-utils.js';
import contentProcessing from './content-processing-agente.js';
import { saveMarkdownImage } from '../api/messages-agente.js';

// IMPORTACIONES DEL PROCESADOR DE IMÁGENES COMPARTIDO

import {
  processImagesOptimized,
  initializeImagePreviewHandlers,
  imageUrlCache,
  updateImageDisplay,
  filterValidImages,
  isValidExternalImageURL,
  getChatId,
  handleImageError,
  IMAGE_CONFIG
} from '../utils/markdown-image-processor.js';

// NOTA: El sistema de caché ahora se importa del módulo compartido
// y se adapta automáticamente para el contexto del agente

// INICIALIZACIÓN Y REGISTRO DE RENDERIZADORES

const acadelConfetti = window.acadelConfetti || ((title, msg) => console.log(`CONFETTI: ${title} - ${msg}`));
const acadelExito = window.acadelExito || ((title, msg) => console.log(`ÉXITO: ${title} - ${msg}`));
const acadelInfo = window.acadelInfo || ((title, msg) => console.log(`INFO: ${title} - ${msg}`));
const acadelWarning = window.acadelWarning || ((title, msg) => console.log(`WARNING: ${title} - ${msg}`));
const acadelError = window.acadelError || ((title, msg) => console.log(`ERROR: ${title} - ${msg}`));

// Patrón para detectar tipos de diagramas Mermaid
const MERMAID_TYPE_PATTERN = /^(graph |flowchart |sequenceDiagram|classDiagram|classDiagram-v2|gitGraph|pie title|gantt|stateDiagram|stateDiagram-v2|mindmap|timeline|journey|erDiagram|requirementDiagram)/m;

const renderersMap = {};
let renderersInitialized = false;
let mermaidObserverInitialized = false;

// Inicialización bajo demanda
const rendererInitializers = {
  'message': () => renderTextMessage,
  'exam': () => renderExamMessage,
  'error': () => renderErrorMessage,
  'loading': () => renderLoadingMessage,
  'code': () => renderCodeMessage,
  'table': () => renderTableMessage,
  'alert': () => renderAlertMessage,
  'action': () => renderActionMessage,
  'mermaid': () => renderMermaidMessage,
  'audio': () => renderAudioMessage,
};

// Contador de uso de renderizadores
const rendererUsageCounts = {};

/**
 * Inicializa y renderiza LaTeX en un contenedor
 * @param {HTMLElement} container - Contenedor donde buscar y renderizar fórmulas
 * @param {Object} options - Opciones adicionales 
 */
function initializeMathJaxInContent(container, options = {}) {
  console.log('🔍 AGENTE DEBUG: initializeMathJaxInContent llamada', { container, options });
  
  if (!container || !container.nodeType) {
    console.warn('🔍 AGENTE DEBUG: Container no válido para MathJax');
    return Promise.resolve();
  }
  
  const mathSelectors = [
    '.math-content', 
    '[data-has-math="true"]',
    'p', 'div', 'span', 'td', 'th', 'li'
  ];
  
  let mathElements = [];
  
  // Primero verificar el propio contenedor
  if (container.textContent && containsMath(container.textContent)) {
    mathElements.push(container);
  }
  
  // Luego buscar dentro del contenedor
  mathSelectors.forEach(selector => {
    const elements = container.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.textContent && containsMath(el.textContent)) {
        if (!mathElements.includes(el)) {
          mathElements.push(el);
        }
      }
    });
  });
  
  console.log('🔍 AGENTE DEBUG: Elementos matemáticos encontrados:', mathElements.length);
  
  if (mathElements.length === 0) {
    console.log('🔍 AGENTE DEBUG: No se encontraron elementos matemáticos en el container');
    return Promise.resolve();
  }
  
  const unprocessedElements = mathElements.filter(el => 
    !el.hasAttribute('data-mathjax-processed')
  );
  
  if (unprocessedElements.length === 0) {
    console.log('🔍 AGENTE DEBUG: Todos los elementos ya han sido procesados');
    return Promise.resolve();
  }
  
  console.log('🔍 AGENTE DEBUG: Elementos sin procesar:', unprocessedElements.length);
  
  try {
    console.log('✅ AGENTE DEBUG: Usando renderMath del sistema agente');
    
    return renderMath(unprocessedElements, {
      useCache: true,
      cacheKey: options.cacheKey || `math-agente-${Date.now()}`,
      maxRetries: 2,
      ...options
    }).then(() => {
      console.log('🎯 AGENTE DEBUG: MathJax renderizado exitosamente');
      unprocessedElements.forEach(el => {
        el.setAttribute('data-mathjax-processed', 'true');
      });
    }).catch(error => {
      console.error('❌ AGENTE DEBUG: Error al renderizar LaTeX:', error);
    });
  } catch (error) {
    console.error('❌ AGENTE DEBUG: Error al inicializar MathJax:', error);
    return Promise.resolve();
  }
}

/**
 * Asegura que los renderizadores necesarios estén inicializados
 * @param {string} type - Tipo de mensaje que se va a renderizar
 */
export function ensureRendererInitialized(type) {
  if (!renderersInitialized) {
    // Inicialización básica
    renderersMap['message'] = renderTextMessage;
    renderersMap['error'] = renderErrorMessage;
    renderersMap['loading'] = renderLoadingMessage;
    renderersInitialized = true;
  }

  if (type && !renderersMap[type] && rendererInitializers[type]) {
    renderersMap[type] = rendererInitializers[type]();
    rendererUsageCounts[type] = (rendererUsageCounts[type] || 0) + 1;
  }
}

/**
 * Obtiene el renderizador para un tipo de mensaje
 * @param {string} type - Tipo de mensaje 
 * @returns {Function} Función renderizadora
 */
function getRenderer(type) {
  ensureRendererInitialized(type);
  return renderersMap[type] || renderersMap['message'];
}

/**
 * Registra un renderizador para un tipo específico de mensaje
 * @param {string} type - Tipo de mensaje 
 * @param {Function} renderer - Función renderizadora
 */
export function registerMessageRenderer(type, renderer) {
  if (typeof renderer === 'function') {
    renderersMap[type] = renderer;
  }
}

/**
 * Inicializa y registra todos los renderizadores
 */
export function initializeMessageRenderers() {
  if (!renderersInitialized) {
    ensureRendererInitialized();
  }

  initializeMermaidObserver();
  initializeCleanupForExistingMessages();
}

/**
 * Inicializa la limpieza para mensajes existentes
 */
export function initializeCleanupForExistingMessages() {
  setTimeout(performInitialCleanup, 0);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(performInitialCleanup, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(performInitialCleanup, 500));
  }

  window.addEventListener('popstate', () => {
    setTimeout(performInitialCleanup, 500);
  });
}

/**
 * Realiza la limpieza inicial de mensajes multimodales
 */
function performInitialCleanup() {
  console.log('Realizando limpieza inicial de mensajes multimodales...');

  // Primera pasada: arreglar mensajes con estructura problemática
  document.querySelectorAll('.message-text > .multimodal-container').forEach(problematic => {
    const message = problematic.closest('.message');
    const contentElement = message?.querySelector('.message-content');
    const isAIMessage = message?.classList.contains('ai-message');

    if (contentElement) {
      contentProcessing.cleanMultimodalExistingContent(contentElement, isAIMessage);
    }
  });

  // Segunda pasada: limpiar todos los mensajes
  document.querySelectorAll('.message').forEach(message => {
    const contentElement = message.querySelector('.message-content');
    const isAIMessage = message.classList.contains('ai-message');

    if (contentElement) {
      contentProcessing.cleanMultimodalExistingContent(contentElement, isAIMessage);
    }
  });

  setupUnifiedObserver();
  setTimeout(processExistingAudioMessages, 600);
}

function setupUnifiedObserver() {
  if (window._unifiedObserverConfigured) return;
  window._unifiedObserverConfigured = true;

  let pendingElements = [];
  let processingScheduled = false;
  let imageProcessingThrottle = new Map();

  const processPendingElements = () => {
    const elementsToProcess = [...pendingElements];
    pendingElements = [];
    processingScheduled = false;

    const uniqueElements = new Set(elementsToProcess);
    uniqueElements.forEach(element => {
      if (element && element.isConnected) {
        const isAIMessage = element.closest('.ai-message') !== null;
        contentProcessing.cleanMultimodalExistingContent(element, isAIMessage);
      }
    });
  };

  const observer = new MutationObserver(mutations => {
    let newMessagesAdded = false;
    let hasNewImages = false;
    let hasNewContent = false;
    let messagesToProcess = new Set();

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.classList?.contains('message') || node.querySelector?.('.message')) {
              newMessagesAdded = true;
              
              const messageElement = node.classList?.contains('message') ? node : node.querySelector('.message');
              if (messageElement) {
                messagesToProcess.add(messageElement);
              }
              
              const contentElement = node.querySelector('.message-content') || 
                                   (node.classList?.contains('message') ? node.querySelector('.message-content') : null);
              if (contentElement) {
                pendingElements.push(contentElement);
                hasNewContent = true;
              }
            }

            const hasImages = node.querySelector('img') ||
              node.querySelector('.image-preview') ||
              node.querySelector('.multimodal-container');
            if (hasImages) {
              hasNewImages = true;
            }
          }
        }
      }
    });

    if (newMessagesAdded && messagesToProcess.size > 0) {
      setTimeout(() => {
        console.log(`🔍 [OBSERVER] ${messagesToProcess.size} mensajes únicos detectados`);
        
        messagesToProcess.forEach(message => {
          if (message.hasAttribute('data-images-processed')) {
            console.log('📦 [OBSERVER] Mensaje ya procesado, saltando');
            return;
          }
          
          const container = message.querySelector('.message-content');
          if (container) {
            const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
            if (externalImages.length > 0) {
              const containerKey = container.dataset.containerId || container.outerHTML.slice(0, 100);
              
              const lastProcessed = imageProcessingThrottle.get(containerKey);
              const now = Date.now();
              
              if (!lastProcessed || (now - lastProcessed) > 2000) { // 2 segundos de throttle
                console.log(`🖼️ [OBSERVER] Procesando ${externalImages.length} imágenes externas en mensaje nuevo`);
                imageProcessingThrottle.set(containerKey, now);
                processImagesOptimized(container);
                
                setTimeout(() => {
                  imageProcessingThrottle.delete(containerKey);
                }, 10000); // 10 segundos
              } else {
                console.log('⏭️ [OBSERVER] Mensaje throttled, saltando procesamiento');
              }
            }
          }
          
          message.setAttribute('data-images-processed', 'true');
        });
        
      }, 150); // Reducido de 300ms a 150ms
    }

    if (hasNewImages) {
      setTimeout(handleNewImages, 200);
    }

    if (hasNewContent && !processingScheduled) {
      processingScheduled = true;
      requestAnimationFrame(() => {
        setManagedTimeout(processPendingElements, 100, 'cleanup-observer');
      });
    }
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    observer.observe(chatMessages, {
      childList: true,
      subtree: true
    });
    console.log('✅ Observador unificado configurado para agente');
  }
}

/**
 * Maneja nuevas imágenes detectadas por el observador
 */
function handleNewImages() {
  document.querySelectorAll('.multimodal-container').forEach(container => {
    const images = container.querySelectorAll('img');
    const imageCount = images.length;
    let failedCount = 0;

    images.forEach(img => {
      if (img.complete && img.naturalWidth === 0) {
        failedCount++;
      }
    });

    if (failedCount === imageCount && imageCount > 0) {
      const img = images[0];
      if (img) {
        handleImageError(img, 'inline', {
          isMultimodal: true,
          imageCount,
          chatId: getChatId()
        });
      }
    }
  });

  document.querySelectorAll('.image-preview:not(.multimodal-container .image-preview)').forEach(preview => {
    const img = preview.querySelector('img');
    if (img && img.complete && img.naturalWidth === 0) {
      handleImageError(img, 'inline', {
        isMultimodal: false,
        chatId: getChatId()
      });
    }
  });
}

function processExistingAudioMessages() {
  console.log('Procesando mensajes de audio existentes...');

  document.querySelectorAll('.message-text, .multimodal-text').forEach(textElement => {
    const content = textElement.textContent || textElement.innerHTML;
    
    // PATRONES ACTUALIZADOS - incluir el patrón real que se guarda
    if (content.includes('Archivo de audio grabado:') || 
        content.includes('Archivo de audio subido:') ||
        content.includes('Subió archivo de audio:') ||  // ← NUEVO PATRÓN
        content.includes('📊 Detalles del archivo:') ||
        (content.includes('Duración:') && content.includes('Formato:') && content.includes('audio'))) {
      
      console.log('Encontrado mensaje de audio, mejorando renderizado...');
      
      const audioData = extractAudioInfoFromText(content);
      
      // Re-renderizar con el formato mejorado
      const messageContent = textElement.closest('.message-content');
      if (messageContent && !messageContent.hasAttribute('data-audio-enhanced')) {
        renderAudioMessage(messageContent, audioData);
        messageContent.setAttribute('data-audio-enhanced', 'true');
      }
    }
  });

  document.querySelectorAll('.attachment-indicator.audio').forEach(audioElement => {
    if (!audioElement.hasAttribute('data-enhanced')) {
      enhanceSimpleAudioIndicator(audioElement);
    }
  });
}

// También actualizar la función extractAudioInfoFromText para manejar el nuevo patrón:
function extractAudioInfoFromText(content) {
  const audioInfo = {};
  
  // PATRÓN ACTUALIZADO - manejar "Subió archivo de audio:"
  const fileMatch = content.match(/Subió archivo de audio:\s*([^\n]+)/) ||
                   content.match(/Archivo de audio subido:\s*([^\n]+)/) ||
                   content.match(/\*\*Nombre:\*\*\s*([^\n]+)/);
  if (fileMatch) {
    audioInfo.fileName = fileMatch[1].trim();
  }
  
  const durationMatch = content.match(/\*\*Duración:\*\*\s*([^\n]+)/);
  if (durationMatch) {
    audioInfo.duration = durationMatch[1].trim();
  }
  
  const sizeMatch = content.match(/\*\*Tamaño:\*\*\s*([^\n]+)/);
  if (sizeMatch) {
    audioInfo.size = sizeMatch[1].trim();
  }
  
  const formatMatch = content.match(/\*\*Formato:\*\*\s*([^\n]+)/);
  if (formatMatch) {
    audioInfo.format = formatMatch[1].trim();
  }
  
  if (content.includes('grabado')) {
    audioInfo.source = 'grabación directa';
  } else if (content.includes('subido') || content.includes('Subió')) {
    audioInfo.source = 'archivo subido';
  }
  
  if (!audioInfo.format && audioInfo.fileName) {
    const extension = audioInfo.fileName.split('.').pop().toUpperCase();
    if (extension) {
      audioInfo.format = extension;
    }
  }
  
  return audioInfo;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function enhanceSimpleAudioIndicator(audioElement) {
  const textContent = audioElement.textContent || '';
  const fileName = textContent.replace('Archivo de audio:', '').trim() || 'Audio';
  
  const truncatedName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
  
  const enhancedHTML = `
    <div class="audio-preview-card simple">
      <div class="audio-card-header simple">
        <div class="audio-icon-section">
          <div class="audio-icon-circle small">
            <i class="bx bxs-music"></i>
          </div>
        </div>
        <div class="audio-title-section">
          <h5 class="audio-file-title small" title="${escapeHtml(fileName)}">${escapeHtml(truncatedName)}</h5>
          <p class="audio-subtitle">Archivo de audio procesado</p>
        </div>
        <div class="audio-status-section">
          <div class="status-indicator success small">
            <i class="bx bx-check-circle"></i>
            <span>Transcrito</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  audioElement.innerHTML = enhancedHTML;
  audioElement.setAttribute('data-enhanced', 'true');
}

/**
 * Inicializa un observador para detectar nuevos diagramas Mermaid
 */
function initializeMermaidObserver() {
  if (mermaidObserverInitialized) return;

  console.log("Inicializando observador de Mermaid");

  initMermaidSystem()
    .then(() => {
      console.log("Sistema Mermaid inicializado correctamente");
      mermaidObserverInitialized = true;
    })
    .catch(error => {
      console.error("Error inicializando sistema Mermaid:", error);
    });
}

/**
 * Inicializa manejadores de eventos para archivos adjuntos
 * @param {HTMLElement} container - Contenedor con archivos adjuntos
 */
function initializeFileAttachmentHandlers(container) {
  // Seleccionar todos los elementos clickeables de archivos
  const fileElements = container.querySelectorAll('.file-name-clickable');
  if (fileElements.length === 0) return;

  fileElements.forEach(fileElement => {
    // Evitar duplicar eventos
    if (fileElement.getAttribute('data-handler-attached')) return;

    const fileName = fileElement.getAttribute('data-file-name') || '';
    const fileType = fileElement.getAttribute('data-file-type') || 'document';
    const language = fileElement.getAttribute('data-language') || '';
    const originalMessage = fileElement.getAttribute('data-original-message') || '';

    // Hacer el elemento clickeable con cursor y estilo
    fileElement.style.cursor = 'pointer';
    fileElement.style.color = 'var(--primary-color)';
    fileElement.style.textDecoration = 'underline';

    fileElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      handleFilePreview(fileType, fileName, language, originalMessage);
    });

    fileElement.setAttribute('data-handler-attached', 'true');
  });

  if (container.querySelector('.expand-content-btn')) {
    return;
  }
}

/**
 * Maneja la vista previa de archivos
 */
function handleFilePreview(fileType, fileName, language, originalMessage) {
  // Si existe window.showFilePreview, usarla directamente
  if (typeof window.showFilePreview === 'function') {
    try {
      const tempId = `temp-file-${Date.now()}`;
      window.showFilePreview(tempId, fileType);
      return;
    } catch (error) {
      console.error('Error mostrando vista previa del archivo:', error);
    }
  }

  // Alternativa: usar el panel de vista previa directamente
  try {
    import('../components/preview-panel-agente.js')
      .then(module => {
        if (typeof module.showPreviewPanel === 'function') {
          let previewData = {};

          if (fileType === 'document') {
            let textContent = extractDocumentContent(originalMessage, fileName);

            previewData = {
              codeContent: `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 15px; font-family: 'Consolas', monospace; font-size: 14px; line-height: 1.6;">${textContent}</pre>`,
              title: fileName,
              language: 'text',
              isDocument: true
            };
          } else if (fileType === 'code') {
            let code = extractCodeContent(originalMessage, fileName);

            previewData = {
              code: code,
              language: language,
              title: fileName
            };
          }

          const previewType = fileType === 'document' ? 'code' : fileType;

          module.showPreviewPanel(previewData, previewType);
        }
      })
      .catch(error => {
        console.error('Error al cargar panel de vista previa:', error);
      });
  } catch (error) {
    console.error('Error al procesar vista previa:', error);
  }
}

/**
 * Extrae el contenido de un documento del mensaje original
 * @param {string} originalMessage - Mensaje original codificado
 * @param {string} fileName - Nombre del archivo a extraer
 * @returns {string} Contenido extraído del documento
 */
function extractDocumentContent(originalMessage, fileName) {
  if (!originalMessage) return 'No se pudo extraer el contenido del archivo.';

  try {
    // PASO 1: Verificar si es un objeto JSON
    try {
      // Si el mensaje es un JSON, intentar parsearlo
      const parsedMessage = JSON.parse(decodeURIComponent(originalMessage));

      // Si tiene documentContent directo, usarlo
      if (parsedMessage.documentContent) {
        return parsedMessage.documentContent;
      }

      // Si tiene contenido específico para este archivo
      if (parsedMessage.fileName === fileName && parsedMessage.documentContent) {
        return parsedMessage.documentContent;
      }
    } catch (jsonError) {
      // No es JSON, continuar con el método tradicional
    }

    // PASO 2: Sanitizar cualquier HTML problemático en el mensaje original
    let cleanedMessage = originalMessage
      .replace(/%3Ca%20href%3D/gi, '%20')  // Eliminar <a href=
      .replace(/%3E/gi, '%20')            // Eliminar >
      .replace(/%3C%2Fa%3E/gi, '%20')     // Eliminar </a>
      .replace(/%3Cem%3E/gi, '%20')       // Eliminar <em>
      .replace(/%3C%2Fem%3E/gi, '%20');   // Eliminar </em>

    const decodedMessage = decodeURIComponent(cleanedMessage);

    // PASO 3: Búsqueda del documento específico
    const possibleMarkers = [
      `Contenido del documento "${fileName}":`,
      `Contenido del documento '${fileName}':`,
      `Contenido del documento ${fileName}:`
    ];

    let startPos = -1;
    let markerUsed = '';

    for (const marker of possibleMarkers) {
      const pos = decodedMessage.indexOf(marker);
      if (pos !== -1) {
        startPos = pos;
        markerUsed = marker;
        break;
      }
    }

    if (startPos === -1) {
      return 'No se pudo encontrar el documento especificado.';
    }

    // PASO 4: Extraer el contenido entre los marcadores
    const contentStart = startPos + markerUsed.length;
    let contentAfterMarker = decodedMessage.substring(contentStart).trim();

    // Patrones que indican el inicio de otro contenido
    const endPatterns = [
      /\n\s*Contenido del documento/i,       // Otro documento
      /\n\s*Código de/i,                     // Archivo de código
      /\n\s*```/,                            // Bloque de código
      /\n\s*\n\s*\n+\s*Contenido del/i,      // Separación clara + otro documento
      /\n\s*\n\s*\n+\s*Código de/i,          // Separación clara + código
      /\n\s*\n\s*\n+\s*```/                  // Separación clara + bloque de código
    ];

    let endPos = -1;

    for (const pattern of endPatterns) {
      const match = contentAfterMarker.match(pattern);
      if (match && match.index) {
        // Si encontramos un patrón de fin, guardar la posición si es la primera o está antes que otras encontradas
        if (endPos === -1 || match.index < endPos) {
          endPos = match.index;
        }
      }
    }

    // PASO 5: Extraer el contenido hasta el final identificado o todo si no se encontró un final claro
    let textContent = '';

    if (endPos !== -1) {
      textContent = contentAfterMarker.substring(0, endPos).trim();
    } else {
      const nlMatch = contentAfterMarker.match(/\n\s*\n\s*\n+/);
      if (nlMatch && nlMatch.index) {
        textContent = contentAfterMarker.substring(0, nlMatch.index).trim();
      } else {
        // Si no hay separación clara, usar todo el contenido restante
        textContent = contentAfterMarker;
      }
    }

    // PASO 6: Sanitización final para eliminar cualquier HTML restante
    textContent = textContent
      .replace(/<a\s+[^>]*>/gi, '')
      .replace(/<\/a>/gi, '')
      .replace(/<em>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<[^>]*>/g, '');

    return textContent;

  } catch (e) {
    console.error('Error al extraer contenido del documento:', e);
    return `Error al procesar el contenido: ${e.message}`;
  }
}

/**
 * Extrae el código del mensaje original para un archivo específico
 * @param {string} originalMessage - Mensaje original codificado
 * @param {string} fileName - Nombre del archivo cuyo código queremos extraer
 * @returns {string} Código extraído o mensaje de error
 */
function extractCodeContent(originalMessage, fileName) {
  if (!originalMessage) return '// Error al extraer código';
  if (!fileName) return '// Error: Nombre de archivo no especificado';

  try {
    // PASO 1: Verificar si es un objeto JSON
    try {
      // Si el mensaje es un JSON, intentar parsearlo
      const parsedMessage = JSON.parse(decodeURIComponent(originalMessage));

      // Si tiene código directo, usarlo
      if (parsedMessage.code) {
        // MEJORA: Sanitizar específicamente para CSS y HTML
        let code = parsedMessage.code;

        // Si es CSS, eliminar etiquetas <em> específicamente
        if (fileName.toLowerCase().endsWith('.css')) {
          code = code.replace(/<em>/g, '')
            .replace(/<\/em>/g, '');
        }

        return code;
      }

      // Si tiene contenido específico para este archivo
      if (parsedMessage.fileName === fileName && parsedMessage.code) {
        let code = parsedMessage.code;

        // Si es CSS, eliminar etiquetas <em> específicamente
        if (fileName.toLowerCase().endsWith('.css')) {
          code = code.replace(/<em>/g, '')
            .replace(/<\/em>/g, '');
        }

        return code;
      }
    } catch (jsonError) {
      // No es JSON, continuar con el método tradicional
    }

    // PASO 2: Sanitizar HTML problemático en el mensaje original
    let cleanedMessage = originalMessage;

    // MEJORA: Sanitización diferenciada por tipo de archivo
    if (fileName.toLowerCase().endsWith('.html')) {
      cleanedMessage = originalMessage
        .replace(/%3Ca%20href%3D[^%]*%3E/gi, '')
        .replace(/%3C%2Fa%3E/gi, '')           // </a>
        // No tocar otros tags que pueden ser parte del HTML válido
        .replace(/%0A/g, '')                  // Eliminar saltos de línea encodificados que causan problemas
        .replace(/%0D/g, '')                  // Eliminar retornos de carro encodificados
        .replace(/%09/g, '');                 // Eliminar tabs encodificados
    } else if (fileName.toLowerCase().endsWith('.css')) {
      cleanedMessage = originalMessage
        .replace(/%3Cem%3E/gi, '')            // <em>
        .replace(/%3C%2Fem%3E/gi, '')         // </em>
      // No reemplazar otros tags que pueden ser parte de comentarios CSS
    } else {
      cleanedMessage = originalMessage
        .replace(/%3Ca%20href%3D[^%]*%3E/gi, '')
        .replace(/%3C%2Fa%3E/gi, '')           // </a>
        .replace(/%3Cem%3E/gi, '')             // <em>
        .replace(/%3C%2Fem%3E/gi, '');         // </em>
      // NO reemplazar %3E o %3C genéricos ya que pueden ser operadores
    }

    let decodedMessage;
    try {
      decodedMessage = decodeURIComponent(cleanedMessage);
    } catch (e) {
      // Si falla la decodificación, usar el mensaje limpio directamente
      decodedMessage = cleanedMessage;
    }

    // PASO 3: Normalizar el nombre del archivo
    const normalizedFileName = fileName.replace(/^["']|["']$/g, '');

    // PASO 4: Construir un patrón para buscar el bloque de código
    // MEJORA: Patrón más robusto para capturar código completo
    const codeBlockPattern = new RegExp(
      `Código de\\s*["']?${normalizedFileName}["']?[^\\n]*:\\s*\`\`\`[\\w]*\\s*([\\s\\S]*?)(?=\`\`\`|$)`,
      'i'
    );

    const codeMatch = decodedMessage.match(codeBlockPattern);

    // Si encontramos el bloque, devolver su contenido con sanitización específica
    if (codeMatch && codeMatch[1]) {
      let code = codeMatch[1].trim();

      // Sanitización específica por tipo de archivo
      if (fileName.toLowerCase().endsWith('.css')) {
        code = code.replace(/<em>/g, '')
          .replace(/<\/em>/g, '');
      } else {
        // Sanitización estándar para otros tipos de archivo
        code = code.replace(/<a\s+[^>]*>/gi, '')
          .replace(/<\/a>/gi, '')
          .replace(/<em>/gi, '')
          .replace(/<\/em>/gi, '');
      }

      return code;
    }

    // PASO 5: MEJORA - Búsqueda más precisa por tipo de archivo
    if (fileName.toLowerCase().endsWith('.css') || fileName.toLowerCase().endsWith('.html')) {
      // Búsqueda específica con marcadores
      const markers = [
        `Código de "${normalizedFileName}":`,
        `Código de '${normalizedFileName}':`,
        `Código de ${normalizedFileName}:`
      ];

      for (const marker of markers) {
        const pos = decodedMessage.indexOf(marker);
        if (pos !== -1) {
          const blockStart = decodedMessage.indexOf('```', pos);
          if (blockStart !== -1) {
            let contentStart = blockStart + 3;

            // Saltar lenguaje si está presente
            const nextLine = decodedMessage.indexOf('\n', contentStart);
            if (nextLine !== -1 && nextLine - contentStart < 20) {
              const firstLine = decodedMessage.substring(contentStart, nextLine).trim();
              if (firstLine === 'css' || firstLine === 'html') {
                contentStart = nextLine + 1;
              }
            }

            const blockEnd = decodedMessage.indexOf('```', contentStart);
            if (blockEnd !== -1) {
              let code = decodedMessage.substring(contentStart, blockEnd).trim();

              // Sanitización específica por tipo
              if (fileName.toLowerCase().endsWith('.css')) {
                code = code.replace(/<em>/g, '')
                  .replace(/<\/em>/g, '');
              }

              return code;
            }
          }
        }
      }
    }

    // Si no encontramos el bloque específico, buscar cualquier bloque como fallback
    const genericMatch = decodedMessage.match(/```[\w]*\s*([\s\S]*?)```/);
    if (genericMatch && genericMatch[1]) {
      let code = genericMatch[1].trim();

      // Sanitización final según tipo de archivo
      if (fileName.toLowerCase().endsWith('.css')) {
        code = code.replace(/<em>/g, '')
          .replace(/<\/em>/g, '');
      }

      return code;
    }

    return `// No se encontró código para: ${normalizedFileName}`;
  } catch (e) {
    console.error('Error al extraer código:', e);
    return '// Error al extraer código: ' + e.message;
  }
}

contentProcessing.initialize({
  initializeFileAttachmentHandlers: initializeFileAttachmentHandlers
});

// RENDERIZADO DE TIPOS DE MENSAJES

/**
 * Verifica si el texto contiene diagramas Mermaid
 * @param {string} text - Texto a verificar
 * @returns {Array|false} - Array de coincidencias si contiene diagramas, false en caso contrario
 */
function containsMermaidDiagram(text) {
  if (!text) return false;

  // Array para almacenar todas las coincidencias de diagramas
  let mermaidMatches = [];

  const explicitMatches = [...text.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  if (explicitMatches.length > 0) {
    mermaidMatches.push(...explicitMatches);
    return mermaidMatches;
  }

  const codeBlockMatches = [...text.matchAll(/```\s*\n([\s\S]*?)```/g)];
  if (codeBlockMatches) {
    for (const match of codeBlockMatches) {
      const code = match[1].trim();
      if (MERMAID_TYPE_PATTERN.test(code)) {
        mermaidMatches.push(match);
      }
    }

    if (mermaidMatches.length > 0) {
      return mermaidMatches;
    }
  }

  return false;
}

/**
 * Extrae todos los códigos Mermaid de un texto
 * @param {string} text - Texto con código Mermaid
 * @returns {Array} - Array de objetos con el código Mermaid y su posición en el texto
 */
function extractMermaidCodes(text) {
  const results = [];

  const mermaidBlockMatches = [...text.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  for (const match of mermaidBlockMatches) {
    const rawCode = match[1].trim();
    const cleanedCode = normalizeMermaidSyntax(rawCode);

    results.push({
      code: cleanedCode,
      start: match.index,
      end: match.index + match[0].length,
      fullMatch: match[0]
    });
  }

  // Si encontramos bloques explícitos, no buscamos implícitos
  if (results.length > 0) {
    return results;
  }

  const codeBlockMatches = [...text.matchAll(/```\s*\n([\s\S]*?)```/g)];

  for (const match of codeBlockMatches) {
    const rawCode = match[1].trim();
    if (MERMAID_TYPE_PATTERN.test(rawCode)) {
      const cleanedCode = normalizeMermaidSyntax(rawCode);

      results.push({
        code: cleanedCode,
        start: match.index,
        end: match.index + match[0].length,
        fullMatch: match[0]
      });
    }
  }

  return results;
}

/**
 * Normaliza la sintaxis de código Mermaid, corrigiendo problemas comunes
 * @param {string} code - Código Mermaid original
 * @returns {string} - Código normalizado
 */
function normalizeMermaidSyntax(code) {
  if (!code) return '';

  // 1. Detectar tipo de diagrama
  const diagramTypeMatch = code.match(/^(graph|flowchart|sequenceDiagram|classDiagram|classDiagram-v2|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)(\s|;|\n|$)/i);

  if (!diagramTypeMatch) return code; // No es un tipo conocido

  const diagramType = diagramTypeMatch[1];

  // 2. Normalizar el código según el tipo de diagrama
  let normalizedCode = code;

  normalizedCode = normalizedCode.replace(new RegExp(`^(${diagramType}(?:-v2)?);`, 'm'), '$1\n');

  // 3. Caso especial para diagramas de clase
  if (diagramType.toLowerCase().includes('classdiagram')) {
    const accentMap = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
      'ñ': 'n', 'Ñ': 'N'
    };

    const lines = normalizedCode.split('\n');
    const processedLines = [];

    if (/[áéíóúÁÉÍÓÚñÑ]/.test(normalizedCode)) {
      for (let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace(/[áéíóúÁÉÍÓÚñÑ]/g, match => accentMap[match] || match);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line.startsWith('classDiagram;')) {
        line = 'classDiagram';
      }

      if (line.includes('<|--')) {
        if (line.endsWith(';')) {
          line = line.substring(0, line.length - 1);
        }

        // Asegurar espacios adecuados alrededor del operador de herencia
        line = line.replace(/([^\s])<\|--([^\s])/, '$1 <|-- $2')
          .replace(/([^\s])<\|--\s/, '$1 <|-- ')
          .replace(/\s<\|--([^\s])/, ' <|-- $1');

        processedLines.push(line);
      }
      else if (line.includes('-->')) {
        if (line.endsWith(';')) {
          line = line.substring(0, line.length - 1);
        }

        // Asegurar espacios adecuados alrededor del operador de asociación
        line = line.replace(/([^\s])-->([^\s])/, '$1 --> $2')
          .replace(/([^\s])-->\s/, '$1 --> ')
          .replace(/\s-->([^\s])/, ' --> $1');

        processedLines.push(line);
      }
      else if (line.includes(';') && (line.includes('-->') || line.includes('<|--'))) {
        const relations = line.split(';');
        for (let relation of relations) {
          relation = relation.trim();
          if (relation) {
            processedLines.push(relation);
          }
        }
      }
      else {
        processedLines.push(line);
      }
    }

    normalizedCode = processedLines.join('\n');

    normalizedCode = normalizedCode.replace(/^(\s*)class\s+/gm, '$1class ');

    // Asegurar salto de línea después de la declaración de tipo
    normalizedCode = normalizedCode.replace(/^(classDiagram(?:-v2)?)\s+/, '$1\n');

    // Asegurar salto de línea antes de la primera declaración
    if (/^classDiagram(?:-v2)?\s+class\s+/m.test(normalizedCode)) {
      normalizedCode = normalizedCode.replace(/^(classDiagram(?:-v2)?)\s+(class\s+)/m, '$1\n$2');
    }
  }

  return normalizedCode;
}

/**
 * Extrae texto alrededor de un diagrama Mermaid específico
 * @param {string} text - Texto completo
 * @param {Object} diagramInfo - Información del diagrama (start, end)
 * @param {boolean} before - true para texto antes, false para texto después
 * @returns {string} Texto extraído
 */
function extractTextAroundMermaid(text, diagramInfo, before) {
  if (before) {
    return text.substring(0, diagramInfo.start).trim();
  } else {
    return text.substring(diagramInfo.end).trim();
  }
}

/**
 * Extrae texto entre dos diagramas Mermaid
 * @param {string} text - Texto completo
 * @param {Object} diagram1 - Información del primer diagrama
 * @param {Object} diagram2 - Información del segundo diagrama
 * @returns {string} Texto entre los diagramas
 */
function extractTextBetweenDiagrams(text, diagram1, diagram2) {
  if (typeof text !== 'string') return '';

  return text.substring(diagram1.end, diagram2.start).trim();
}

export function renderTextMessage(container, content, role = '') {
  const safeContent = typeof content === 'string' ? content : String(content);
  const isAIMessage = role === 'ai';

  const hasDocumentIndicator = safeContent.includes('Contenido del documento') ||
    safeContent.includes('Contexto adicional de documentos adjuntos:');
  const hasCodeIndicator = safeContent.includes('Código de ');
  const hasImageIndicator = safeContent.includes('imagen adjunta') ||
    safeContent.includes('imágenes adjuntas');
    
  // ← ACTUALIZAR ESTA LÍNEA para incluir el patrón correcto
  const hasAudioIndicator = safeContent.includes('Subió archivo de audio:') ||
    safeContent.includes('Archivo de audio subido:') ||
    safeContent.includes('Archivo de audio grabado:') ||
    safeContent.match(/Subió (?:un )?archivo de audio/) !== null;

  const hasMultipleTypes =
    (hasDocumentIndicator && hasCodeIndicator) ||
    (hasDocumentIndicator && hasImageIndicator) ||
    (hasDocumentIndicator && hasAudioIndicator) ||
    (hasCodeIndicator && hasImageIndicator) ||
    (hasCodeIndicator && hasAudioIndicator) ||
    (hasImageIndicator && hasAudioIndicator) ||
    safeContent.match(/Contenido del documento/g)?.length > 1;

  if (containsMermaidDiagram(safeContent)) {
    renderMermaidMessage(container, safeContent);
    return;
  }

  // CASO 1: Múltiples adjuntos - para mensajes de usuario solamente
  if (!isAIMessage && hasMultipleTypes) {
    container.innerHTML = contentProcessing.formatMultipleAttachments(safeContent);
    initializeFileAttachmentHandlers(container);
    return;
  }

  // CASO 2: 'Contexto adicional de documentos adjuntos:' para mensajes de usuario solamente
  if (!isAIMessage && safeContent.includes('Contexto adicional de documentos adjuntos:')) {
    container.innerHTML = contentProcessing.detectMultimodalContent(safeContent, false);
    initializeFileAttachmentHandlers(container);
    return;
  }

  // CASO 3: Audio adjunto para mensajes de usuario - ESTO DEBERÍA FUNCIONAR AHORA
  if (!isAIMessage && hasAudioIndicator) {
    console.log('🎵 Detectado audio en renderTextMessage:', safeContent.substring(0, 100));
    renderAudioMessage(container, safeContent);
    return;
  }

  // Procesamiento de contenido multimodal SOLO para mensajes de usuario
  const processedContent = contentProcessing.detectMultimodalContent(safeContent, isAIMessage);

  if (processedContent !== safeContent && typeof processedContent === 'string') {
    container.innerHTML = processedContent;
    const hasNonAudioAttachments = processedContent.includes('file-name-clickable') ||
      (processedContent.includes('attachment-indicator') &&
        !processedContent.includes('attachment-indicator audio'));
    if (hasNonAudioAttachments) {
      initializeFileAttachmentHandlers(container);
    }
    return;
  }

  // Detección de tablas
  const hasValidTableStructure = /\|\s*[-:]+\s*\|/.test(safeContent) &&
    /^\s*\|.*\|\s*$[\r\n]+\s*\|[\s-:]+\|/m.test(safeContent);

  const hasTable = containsMarkdownTable(safeContent) || hasValidTableStructure;
  const hasCode = containsCodeBlocks(safeContent);
  const hasTablesAndCode = hasTable && hasCode;

  // CASO: Si tenemos tanto tablas como código
  if (hasTablesAndCode) {
    processContentWithCodeBlocks(safeContent, container);
    applyHighlighting(container);
    attachCopyButtonEvents(container);

    const hasImages = container.querySelectorAll('.markdown-image').length > 0;
    if (hasImages) {
      initializeImagePreviewHandlers(container);
      
      const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
      if (externalImages.length > 0) {
        processImagesOptimized(container);
      }
    }

    if (typeof addExpandButton === 'function') {
      addExpandButton(container, {
        content: container.innerHTML,
        title: 'Código',
        language: 'code'
      }, 'code');

      if (container.querySelector('table')) {
        try {
          addExpandButton(container, {
            content: container.innerHTML,
            title: 'Tabla de datos',
            type: 'table'
          }, 'table');
        } catch (btnError) {
          console.warn('Error al agregar botón de tabla:', btnError);
        }
      }
    }

    return;
  }

  // CASO: Solo tablas sin código
  if (hasTable) {
    const tablesProcessed = detectAndRenderMarkdownTables(safeContent, container, true);

    if (tablesProcessed) {
      const hasImages = container.querySelectorAll('.markdown-image').length > 0;
      if (hasImages) {
        initializeImagePreviewHandlers(container);
        
        const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
        if (externalImages.length > 0) {
          processImagesOptimized(container);
        }
      }

      // Comprobación SINCRÓNICA para botón de tabla
      if (container.querySelector('table') && typeof addExpandButton === 'function') {
        try {
          addExpandButton(container, {
            content: container.innerHTML,
            title: 'Tabla de datos',
            type: 'table'
          }, 'table');
        } catch (btnError) {
          console.warn('Error al agregar botón de tabla:', btnError);
        }
      }

      // Verificación secundaria con timeout
      setTimeout(() => {
        if (container.querySelector('table') &&
          !container.querySelector('.table-expand-btn') &&
          typeof addExpandButton === 'function') {
          try {
            addExpandButton(container, {
              content: container.innerHTML,
              title: 'Tabla de datos',
              type: 'table'
            }, 'table');
          } catch (btnError) {
            console.warn('Error en comprobación secundaria de botón de tabla:', btnError);
          }
        }
      }, 100);

      if (!hasCode) {
        return;
      }
    }
  }

  // CASO: Solo código sin tablas
  if (hasCode) {
    processContentWithCodeBlocks(safeContent, container);
    applyHighlighting(container);
    attachCopyButtonEvents(container);

    const hasImages = container.querySelectorAll('.markdown-image').length > 0;
    if (hasImages) {
      initializeImagePreviewHandlers(container);
      
      const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
      if (externalImages.length > 0) {
        processImagesOptimized(container);
      }
    }

    if (typeof addExpandButton === 'function') {
      addExpandButton(container, {
        content: container.innerHTML,
        title: 'Código',
        language: 'code'
      }, 'code');
    }

    return;
  }

  // Si llegamos aquí, renderizar como Markdown normal
  const parsedContent = parseMarkdownToHTML(safeContent);
  container.innerHTML = parsedContent;

  // COMPROBACIÓN FINAL: Verificar si hay tablas en el contenido parseado
  if (container.querySelector('table') && !container.querySelector('.table-expand-btn') &&
    typeof addExpandButton === 'function') {
    try {
      addExpandButton(container, {
        content: container.innerHTML,
        title: 'Tabla de datos',
        type: 'table'
      }, 'table');
    } catch (btnError) {
      console.warn('Error en comprobación final de botón de tabla:', btnError);
    }
  }

  const hasImages = container.querySelectorAll('.markdown-image').length > 0;
  if (hasImages) {
    initializeImagePreviewHandlers(container);

    const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    if (externalImages.length > 0) {
      console.log(`🖼️ [RENDER] ${externalImages.length} imágenes externas detectadas`);
      processImagesOptimized(container);
    }

    if (window.scrollManager) {
      window.scrollManager.setupImagePositionMaintenance(container);

      const messageElement = container.closest('.message');
      if (messageElement) {
        messageElement.setAttribute('data-contains-images', 'true');
      }
    }
  }

  if (containsMathExpressions(safeContent)) {
    renderMathWithRetry(container);
  }
  
  const hasFileAttachments = container.querySelector('.attachment-indicator') ||
    container.querySelector('.file-name-clickable');
  if (hasFileAttachments) {
    initializeFileAttachmentHandlers(container);
  }
}

/**
 * Renderiza un mensaje con múltiples diagramas Mermaid
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {string|Object} content - Contenido con código Mermaid
 */
function renderMermaidMessage(container, content) {
  try {
    const messageWithDiagrams = createElement('div', { className: 'message-with-diagrams' });

    const mermaidDiagrams = extractMermaidCodes(typeof content === 'string' ? content : (content.code || ''));

    if (mermaidDiagrams.length === 0) {
          acadelError("🧩 Diagrama complicado", "Acadel no pudo procesar este mapa conceptual. ¿Podrías intentar con una versión más simple?");
    return;
    }

    // Texto antes del primer diagrama
    if (typeof content === 'string' && mermaidDiagrams.length > 0) {
      const textBeforeFirstDiagram = extractTextAroundMermaid(content, mermaidDiagrams[0], true);
      if (textBeforeFirstDiagram) {
        const textDiv = createElementWithHTML('div',
          { className: 'text-before-diagram' },
          parseMarkdownToHTML(textBeforeFirstDiagram)
        );
        messageWithDiagrams.appendChild(textDiv);
      }
    }

    mermaidDiagrams.forEach((diagram, index) => {
      // Contenedor del diagrama
      const diagramContainer = createElement('div', {
        className: 'mermaid-diagram-container',
        'data-diagram-index': index
      });

      // Título
      const titleText = typeof content === 'object' && content.title
        ? content.title
        : `Mapa Conceptual ${index > 0 ? (index + 1) : ''}`;
      const title = createElement('h4', { className: 'concept-map-title' }, titleText);
      diagramContainer.appendChild(title);

      // Diagrama
      const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}-${index}`;
      const diagramDiv = createElement('div', {
        className: 'mermaid-diagram',
        id: uniqueId,
        'data-code': diagram.code,
        'data-title': titleText,
        'data-diagram-index': index
      });

      // Mensaje de carga
      const loadingDiv = createElementWithHTML('div', { className: 'mermaid-loading' },
        '<i class="bx bx-loader-alt bx-spin"></i> Cargando diagrama...'
      );
      diagramDiv.appendChild(loadingDiv);

      diagramContainer.appendChild(diagramDiv);

      // Botón para expandir
      const expandIcon = createElement('i', { className: 'bx bx-expand-alt' });
      const expandButton = createElement('button', {
        className: 'concept-map-expand-btn',
        'data-code': diagram.code,
        'data-diagram-id': uniqueId,
        title: 'Ver diagrama completo'
      }, [expandIcon, ' Ver diagrama completo']);

      addEvent(expandButton, 'click', () => {
        if (typeof window.showMermaidPreview === 'function') {
          window.showMermaidPreview(expandButton);
        } else {
          import('../components/preview-panel-agente.js')
            .then(module => {
              if (typeof module.showPreviewPanel === 'function') {
                module.showPreviewPanel({
                  code: diagram.code,
                  title: titleText
                }, 'mermaid');
              }
            });
        }
      });

      diagramContainer.appendChild(expandButton);
      messageWithDiagrams.appendChild(diagramContainer);

      // Texto entre diagramas
      if (index < mermaidDiagrams.length - 1) {
        const textBetween = extractTextBetweenDiagrams(content, mermaidDiagrams[index], mermaidDiagrams[index + 1]);
        if (textBetween) {
          const textDiv = createElementWithHTML('div',
            { className: 'text-between-diagrams' },
            parseMarkdownToHTML(textBetween)
          );
          messageWithDiagrams.appendChild(textDiv);
        }
      }
    });

    // Texto después del último diagrama
    if (typeof content === 'string' && mermaidDiagrams.length > 0) {
      const lastDiagram = mermaidDiagrams[mermaidDiagrams.length - 1];
      const textAfterLastDiagram = extractTextAroundMermaid(content, lastDiagram, false);
      if (textAfterLastDiagram) {
        const textDiv = createElementWithHTML('div',
          { className: 'text-after-diagram' },
          parseMarkdownToHTML(textAfterLastDiagram)
        );
        messageWithDiagrams.appendChild(textDiv);
      }
    }

    container.appendChild(messageWithDiagrams);

    mermaidDiagrams.forEach((diagram, index) => {
      const uniqueId = container.querySelector(`.mermaid-diagram[data-diagram-index="${index}"]`)?.id;
      if (uniqueId) {
        initializeMermaidDiagram(uniqueId, diagram.code);
      }
    });

  } catch (error) {
    container.innerHTML = `
      <div class="error-message">
        <i class='bx bx-error'></i>
        <p>Error al renderizar diagrama Mermaid: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Renderiza un mensaje de código con resaltado de sintaxis
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Contenido con código y lenguaje
 */
function renderCodeMessage(container, content) {
  try {
    let code = '';
    let language = 'javascript';

    if (typeof content === 'object' && content !== null) {
      code = content.code || '';
      language = content.language || 'javascript';
    } else if (typeof content === 'string') {
      code = content;
    }

if (containsMathExpressions(code)) {
        renderMathWithRetry(container);
    }

    if (!code.trim()) {
      acadelWarning("📝 Código vacío", "Acadel no encontró código para mostrar. ¿Olvidaste pegarlo?");
return;
    }

    const codeHTML = buildCodeBlockHTML(code, language);
    container.innerHTML = codeHTML;

    applyHighlighting(container);

    // Adjuntar eventos a botones de copia
    attachCopyButtonEvents(container);

    addExpandButton(container, { code, language }, 'code');

    if (containsMathExpressions(code)) {
      renderMathWithRetry(container);
    }
  } catch (error) {
    acadelError("💻 Error de código", "Acadel tuvo problemas renderizando este código. ¿Podrías verificar la sintaxis?");
return;
  }
}

/**
 * Renderiza un mensaje tipo tabla de datos
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos para la tabla
 */
function renderTableMessage(container, content) {
  try {
    let tableRendered = false;

    // Caso 1: Estructura correcta de tabla {headers, rows}
    if (content && Array.isArray(content.headers) && Array.isArray(content.rows)) {
      renderFormattedTable(container, content);
      renderMathInTable(container);
      tableRendered = true;
    }

    // Caso 2: Estructura anidada (content.data o content.table)
    else if (content && typeof content === 'object') {
      if (content.data && typeof content.data === 'object') {
        const data = content.data;
        if (Array.isArray(data.headers) && Array.isArray(data.rows)) {
          renderFormattedTable(container, data);
          renderMathInTable(container);
          tableRendered = true;
        }
      }

      else if (content.table && typeof content.table === 'object') {
        const table = content.table;
        if (Array.isArray(table.headers) && Array.isArray(table.rows)) {
          renderFormattedTable(container, table);
          renderMathInTable(container);
          tableRendered = true;
        }
      }

      // Objeto plano convertido a tabla
      else if (Object.keys(content).length > 0) {
        const headers = Object.keys(content);
        const rows = [Object.values(content)];

        renderFormattedTable(container, { headers, rows, caption: "Datos" });
        renderMathInTable(container);
        tableRendered = true;
      }
    }

    // Caso 3: String JSON o markdown
    else if (typeof content === 'string') {
      try {
        const parsed = contentProcessing.parseJsonPreservingMath(content);
        // Llamada recursiva con el objeto parseado
        if (typeof parsed === 'object' && parsed !== null) {
          renderTableMessage(container, parsed);
          tableRendered = true;
          return;
        }
      } catch (e) {
        // No es JSON, intentar como markdown
        if (detectAndRenderTable(content, container)) {
          renderMathInTable(container);
          tableRendered = true;
        }
      }
    }

    // Si se renderizó la tabla correctamente, agregar botón de expandir
    if (tableRendered) {
      addExpandButton(container, content, 'table');
      return;
    }

    acadelWarning("📊 Datos de tabla confusos", "Acadel no pudo organizar estos datos en tabla. ¿Podrías formatearlos mejor?");
return;
  } catch (error) {
    acadelError("📈 Error de tabla", "Acadel se confundió con esta tabla. ¡Incluso los capibara más listos tienen límites!");
return;
  }
}

/**
 * Renderiza matemáticas dentro de una tabla
 * @param {HTMLElement} container - Contenedor de la tabla
 */
function renderMathInTable(container) {
  container.setAttribute('data-has-math', 'true');

  container.querySelectorAll('th, td').forEach(cell => {
    if (cell.textContent.includes('$') ||
      cell.textContent.includes('\\') ||
      cell.textContent.includes('^') ||
      cell.textContent.includes('_')) {
      cell.classList.add('math-content');
      cell.setAttribute('data-has-math', 'true');
    }
  });

  renderMathWithRetry(container);
}

/**
 * Renderiza matemáticas con sistema de backoff exponencial
 * @param {HTMLElement} container - Contenedor con contenido matemático
 * @param {number} attempt - Número de intento actual (interno)
 * @param {number} maxAttempts - Número máximo de intentos
 */
function renderMathWithRetry(container, attempt = 1, maxAttempts = 3) {
  const messageId = container.closest('.message')?.dataset?.messageId || Date.now();
  const timeoutKey = `math-render-${messageId}-${attempt}`;

  // Primer intento
  renderMath(container).catch(error => {
    if (attempt < maxAttempts) {
      console.warn(`Intento ${attempt} de renderizado matemático falló, reintentando...`, error);

      // Cálculo de retraso exponencial (300ms, 600ms, 1200ms...)
      const delay = Math.min(300 * Math.pow(2, attempt - 1), 2000);

      setManagedTimeout(() => {
        renderMathWithRetry(container, attempt + 1, maxAttempts);
      }, delay, timeoutKey);
    } else {
      console.error(`Todos los intentos de renderizado matemático fallaron (${maxAttempts})`, error);
    }
  });
}

/**
 * Renderiza un mensaje de examen
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos del examen
 */
function renderExamMessage(container, content) {
  container.innerHTML = '<div class="exam-container"></div>';
  container.setAttribute('data-contains-exam', 'true');

  const examContainer = container.querySelector('.exam-container');

  if (examContainer) {
    try {
      // Pre-procesar el contenido de examen para manejar expresiones LaTeX
      if (content && content.questions && Array.isArray(content.questions)) {
        content.questions = content.questions.map(question => {
          // Asegurar que los símbolos $ no estén escapados
          if (typeof question.question === 'string') {
            question.question = question.question.replace(/\\\$/g, '$');
          }

          if (Array.isArray(question.options)) {
            question.options = question.options.map(option =>
              typeof option === 'string' ? option.replace(/\\\$/g, '$') : option
            );
          }

          if (typeof question.explanation === 'string') {
            question.explanation = question.explanation.replace(/\\\$/g, '$');
          }

          return question;
        });
      }

      renderExam(content, examContainer);

      addExpandButton(container, content, 'exam', true);

      container.setAttribute('data-has-math', 'true');
      examContainer.setAttribute('data-has-math', 'true');


      
      renderMathWithRetry(container);

      setTimeout(() => {
        examContainer.setAttribute('data-exam-rendered', 'true');

        // Evento personalizado para notificar que el examen está listo
        const examReadyEvent = new CustomEvent('examRendered', {
          detail: { examContainer, messageContainer: container }
        });
        document.dispatchEvent(examReadyEvent);
      }, 800);

    } catch (error) {
      acadelError("📝 Examen problemático", "Acadel no pudo preparar este examen. ¡Parece que las preguntas se pusieron tímidas!");
return;
    }
  }
}

/**
 * Renderiza un mensaje de audio
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos para el audio
 */
function renderAudioMessage(container, content) {
  try {
    let audioData = {
      fileName: 'Audio grabado',
      duration: 'No disponible',
      format: 'AUDIO',
      size: 'No disponible',
      source: 'archivo de audio',
      timestamp: new Date().toLocaleString(),
      quality: 'estándar'
    };

    if (typeof content === 'object' && content !== null) {
      audioData = { ...audioData, ...content };
    } else if (typeof content === 'string') {
      const extractedData = extractAudioInfoFromText(content);
      audioData = { ...audioData, ...extractedData };
    }

    const truncatedName = audioData.fileName.length > 25 ? 
      audioData.fileName.substring(0, 22) + '...' : audioData.fileName;

    const audioHTML = `
      <div class="multimodal-container">
        <div class="multimodal-attachments enhanced-audio-container">
          <div class="audio-preview-card">
            
            <!-- Header del archivo de audio -->
            <div class="audio-card-header">
              <div class="audio-icon-section">
                <div class="audio-icon-circle">
                  <i class="bx bxs-music"></i>
                </div>
                <span class="audio-format-tag">${audioData.format}</span>
              </div>
              
              <div class="audio-title-section">
                <h4 class="audio-file-title" title="${escapeHtml(audioData.fileName)}">${escapeHtml(truncatedName)}</h4>
                <p class="audio-subtitle">Archivo de audio procesado</p>
              </div>
              
              <div class="audio-status-section">
                <div class="status-indicator success">
                  <i class="bx bx-check-circle"></i>
                  <span>Transcrito</span>
                </div>
              </div>
            </div>
            
            <!-- Visualización de onda de audio -->
            <div class="audio-waveform-container">
              <div class="audio-waveform-display">
                <div class="wave-bar" style="height: 20%"></div>
                <div class="wave-bar" style="height: 45%"></div>
                <div class="wave-bar" style="height: 70%"></div>
                <div class="wave-bar" style="height: 35%"></div>
                <div class="wave-bar" style="height: 80%"></div>
                <div class="wave-bar" style="height: 25%"></div>
                <div class="wave-bar" style="height: 55%"></div>
                <div class="wave-bar" style="height: 40%"></div>
                <div class="wave-bar" style="height: 65%"></div>
                <div class="wave-bar" style="height: 30%"></div>
                <div class="wave-bar" style="height: 75%"></div>
                <div class="wave-bar" style="height: 50%"></div>
              </div>
              <div class="waveform-overlay">
                <span class="play-indicator">▶️ Audio transcrito automáticamente</span>
              </div>
            </div>
            
            <!-- Detalles técnicos -->
            <div class="audio-technical-details">
              <div class="tech-detail-grid">
                <div class="tech-detail-item">
                  <i class="bx bx-time"></i>
                  <div class="detail-content">
                    <span class="detail-label">Duración</span>
                    <span class="detail-value" title="${escapeHtml(audioData.duration)}">${escapeHtml(audioData.duration)}</span>
                  </div>
                </div>
                
                <div class="tech-detail-item">
                  <i class="bx bx-data"></i>
                  <div class="detail-content">
                    <span class="detail-label">Tamaño</span>
                    <span class="detail-value" title="${escapeHtml(audioData.size)}">${escapeHtml(audioData.size)}</span>
                  </div>
                </div>
                
                <div class="tech-detail-item">
                  <i class="bx bx-microphone"></i>
                  <div class="detail-content">
                    <span class="detail-label">Fuente</span>
                    <span class="detail-value" title="${escapeHtml(audioData.source)}">${escapeHtml(audioData.source)}</span>
                  </div>
                </div>
                
                <div class="tech-detail-item">
                  <i class="bx bx-calendar"></i>
                  <div class="detail-content">
                    <span class="detail-label">Procesado</span>
                    <span class="detail-value" title="${escapeHtml(audioData.timestamp)}">${escapeHtml(audioData.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Footer con acciones -->
            <div class="audio-card-footer">
              <div class="processing-info">
                <i class="bx bx-check-circle" style="color: #10b981;"></i>
                <span>La transcripción ha sido completada y estará disponible en los próximos mensajes.</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    `;

    container.innerHTML = audioHTML;
  } catch (error) {
    console.error('Error al renderizar audio mejorado:', error);
    container.innerHTML = `
      <div class="audio-error">
        <i class='bx bx-error'></i>
        <p>Error al renderizar el audio: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Renderiza un mensaje de error
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos del error
 */
function renderErrorMessage(container, content) {
    const { errorMessage, originalMessage } = content;
    
    const studyAgentErrorMessages = [
        {
            main: "🦫 ¡Ups! Mi cerebro multimodal peludo tuvo un cortocircuito. ¡Como cuando intentas procesar un video de 3 horas en 5 minutos!",
            tip: "Los agentes de estudio también necesitamos pausas para procesar toda esa información multimedia"
        },
        {
            main: "🦫 Mi procesador de YouTube capibarina se trabó como estudiante viendo tutoriales a doble velocidad. ¡Pero tranquilo, es temporal!",
            tip: "Momento perfecto para organizar esos enlaces de YouTube que tienes guardados sin clasificar"
        },
        {
            main: "🦫 Error detectado en mi transcriptor de audio peludo. ¡Es como cuando la grabación de la clase tiene eco y ruido de fondo!",
            tip: "¿Has verificado que el audio esté claro y sin mucho ruido de fondo?"
        },
        {
            main: "🦫 ¡Rayos! Mi analizador de contenido académico tuvo una sobrecarga de información. ¡Típico de procesar demasiados PDFs y videos a la vez!",
            tip: "Los mejores estudiantes también necesitan dividir el material en sesiones más pequeñas"
        },
        {
            main: "🦫 Mi motor de búsqueda educativo se perdió como estudiante en biblioteca infinita. ¡Hay tanto contenido por explorar!",
            tip: "¿Sabías que los capibaras organizamos mejor el conocimiento cuando lo dividimos por temas?"
        },
        {
            main: "🦫 ¡Oops! Mi extractor de conocimiento peludo dice 'formato de entrada inesperado'. ¡Como cuando el profesor cambia el temario sin avisar!",
            tip: "Intenta ser más específico con tu consulta o prueba un enfoque diferente"
        },
        {
            main: "🦫 Mi síntesis de contenido capibarina necesita un momento de recalibración. ¡Procesar videos, audios y textos a la vez es intenso!",
            tip: "Como decía Feynman: 'Si no puedes explicarlo simple, no lo entiendes bien' - ¡vamos paso a paso!"
        },
        {
            main: "🦫 Error en mi sistema de aprendizaje adaptativo. ¡Es como cuando tu app de notas se crashea justo antes del examen!",
            tip: "Los mejores sistemas de estudio necesitan mantenimiento - ¡incluso los peludos!"
        }
    ];
    
    const randomResponse = studyAgentErrorMessages[Math.floor(Math.random() * studyAgentErrorMessages.length)];
    
    clearElement(container);
    
    const errorContainer = createElement('div', { className: 'cancelled-message' });
    errorContainer.style.display = 'flex';
    errorContainer.style.alignItems = 'center';
    errorContainer.style.gap = '8px';
    errorContainer.style.padding = '12px';
    errorContainer.style.color = '#666';
    errorContainer.style.backgroundColor = 'rgba(231,76,60,0.05)';
    errorContainer.style.borderRadius = '8px';
    errorContainer.style.margin = '5px 0';
    errorContainer.style.borderLeft = '3px solid rgba(231,76,60,0.3)';
    
    const icon = createElement('i', { className: 'bx bx-brain' });
    icon.style.fontSize = '1.3rem';
    icon.style.color = '#e74c3c';
    errorContainer.appendChild(icon);
    
    const errorSpan = createElement('span', {}, '🦫 Pausa en el agente de estudio');
    errorContainer.appendChild(errorSpan);
    
    const errorDetails = createElement('div', { className: 'cancelled-details' });
    errorDetails.style.fontSize = '0.85rem';
    errorDetails.style.color = '#888';
    errorDetails.style.margin = '8px 0 0 20px';
    
    const messageParagraph = createElement('p', {});
    messageParagraph.innerHTML = randomResponse.main;
    errorDetails.appendChild(messageParagraph);
    
    const suggestionParagraph = createElement('p', {});
    suggestionParagraph.innerHTML = `💡 <strong>Consejo del Agente Acadel:</strong> ${randomResponse.tip}`;
    errorDetails.appendChild(suggestionParagraph);
    
    const studyAgentMotivations = [
        '🎥 ¡El aprendizaje multimedia continúa! ¿Qué tal si exploramos otro video o documento?',
        '🎧 ¡Las transcripciones siguen! ¿Tienes algún audio interesante para analizar?',
        '📚 ¡Tu material de estudio te espera! Podemos explorar desde PDFs hasta videos de YouTube',
        '🧠 ¡El conocimiento no se detiene! ¿Seguimos con matemáticas, ciencias, o lo que necesites?',
        '🔍 ¡La investigación académica continúa! Tengo herramientas para todo tipo de contenido',
        '📖 ¡Sigamos aprendiendo juntos! Desde transcribir audios hasta resolver ecuaciones complejas'
    ];
    const randomMotivation = studyAgentMotivations[Math.floor(Math.random() * studyAgentMotivations.length)];
    
    const motivationParagraph = createElement('p', {});
    motivationParagraph.innerHTML = randomMotivation;
    errorDetails.appendChild(motivationParagraph);
    
    container.appendChild(errorContainer);
    container.appendChild(errorDetails);
    
    if (window.acadelInfo) {
        const studyAgentNotifications = [
            {
                title: "🦫 Recalibrando agente de estudio",
                message: "Acadel está optimizando sus capacidades multimedia para ayudarte mejor"
            },
            {
                title: "🦫 Actualizando sistema de aprendizaje",
                message: "El agente capibara está sincronizando sus herramientas de YouTube, audio y documentos"
            },
            {
                title: "🦫 Reorganizando arsenal académico",
                message: "Acadel ajusta sus algoritmos para procesar mejor videos, audios y textos"
            },
            {
                title: "🦫 Optimizando modo estudio",
                message: "El agente peludo está preparando sus mejores herramientas educativas"
            }
        ];
        const randomNotification = studyAgentNotifications[Math.floor(Math.random() * studyAgentNotifications.length)];
        
        acadelInfo(
            randomNotification.title,
            randomNotification.message
        );
    }
}

/**
 * Renderiza un mensaje tipo alerta/notificación
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos para la alerta
 */
function renderAlertMessage(container, content) {
  const { type, message, title } = content;
  const alertTypes = {
    info: { icon: 'bx-info-circle', class: 'info-alert' },
    warning: { icon: 'bx-error', class: 'warning-alert' },
    success: { icon: 'bx-check-circle', class: 'success-alert' },
    error: { icon: 'bx-x-circle', class: 'error-alert' }
  };

  const alertInfo = alertTypes[type] || alertTypes.info;

  clearElement(container);

  const alertDiv = createElement('div', {
    className: `alert-message ${alertInfo.class}`
  });

  const iconDiv = createElement('div', { className: 'alert-icon' });
  iconDiv.appendChild(createElement('i', { className: `bx ${alertInfo.icon}` }));
  alertDiv.appendChild(iconDiv);

  const contentDiv = createElement('div', { className: 'alert-content' });

  if (title) {
    contentDiv.appendChild(createElement('h4', { className: 'alert-title' }, title));
  }

  contentDiv.appendChild(createElement('p', {}, message));

  alertDiv.appendChild(contentDiv);

  container.appendChild(alertDiv);

  if (containsMathExpressions(message)) {
    renderMathWithRetry(container);
  }
}

/**
 * Renderiza un mensaje con botones de acción
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Contenido con mensaje y botones
 */
function renderActionMessage(container, content) {
  const { message, actions } = content;

  let buttonsHTML = '<div class="action-buttons">';
  actions.forEach(action => {
    buttonsHTML += `<button class="action-button" data-action="${action.id}">${action.label}</button>`;
  });
  buttonsHTML += '</div>';

  container.innerHTML = `
    <div class="action-message">
      ${parseMarkdownToHTML(message)}
      ${buttonsHTML}
    </div>
  `;

  container.querySelectorAll('.action-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const actionId = e.target.dataset.action;
      const action = actions.find(a => a.id === actionId);
      if (action && action.handler) {
        action.handler();
      } else if (action && action.message) {
        // Si hay un mensaje asociado, enviarlo automáticamente
        const textarea = getElement('textarea');
        if (textarea) {
          textarea.value = action.message;
          window.dispatchEvent(new CustomEvent('sendMessageRequest'));
        }
      }
    });
  });

  if (containsMathExpressions(message)) {
    renderMathWithRetry(container);
  }
}

/**
 * Renderiza un mensaje de carga
 * @param {HTMLElement} container - Contenedor del mensaje
 */
function renderLoadingMessage(container) {
  container.innerHTML = `
    <div class="typing-loader"></div>
  `;
}

// FUNCIONES AUXILIARES DE RENDERIZADO

/**
 * Aplica highlight.js a todos los bloques de código en un contenedor
 * @param {HTMLElement} container - Elemento que contiene los bloques de código
 */
export function applyHighlighting(container) {
  if (window.hljs) {
    container.querySelectorAll('pre code').forEach(block => {
      if (!block.classList.contains('hljs')) {
         window.hljs.highlightElement(block);
      }
    });
  }
}

/**
 * Añade eventos a los botones de copiar código
 * @param {HTMLElement} container - Contenedor con botones de copia
 */
function attachCopyButtonEvents(container) {
  container.querySelectorAll('.copy-button').forEach(button => {
    if (!button.hasAttribute('data-original-content')) {
      button.setAttribute('data-original-content', '<i class="bx bx-copy"></i> Copiar');
    }

    addEvent(button, 'click', () => {
      const blockId = getAttribute(button, 'data-target');
      const codeBlock = blockId ? document.getElementById(blockId) : button.closest('.code-block');

      if (codeBlock) {
        const codeElement = codeBlock.querySelector('code');
        const textToCopy = codeElement.textContent;

        copyToClipboard(textToCopy)
          .then(() => {
            button.innerHTML = '<i class="bx bx-check"></i> Copiado';
            setManagedTimeout(() => {
              button.innerHTML = button.getAttribute('data-original-content');
            }, 2000, `copy-reset-${button.id || Date.now()}`);
          })
          .catch(() => {
            button.innerHTML = '<i class="bx bx-x"></i> Error';
            setManagedTimeout(() => {
              button.innerHTML = button.getAttribute('data-original-content');
            }, 2000, `copy-reset-${button.id || Date.now()}`);
          });
      }
    });
  });
}

/**
 * Añade un botón para expandir contenido
 * @param {HTMLElement} container - Contenedor donde agregar el botón
 * @param {Object} data - Contenido a mostrar en el panel expandido
 * @param {string} type - Tipo de contenido ('table', 'code', etc.)
 */
function addExpandButton(container, data, type = 'table') {
  if (container.querySelector('.expand-content-btn')) return;

  // Texto personalizado según el tipo de contenido
  let buttonText = 'Ver completo';
  let buttonClass = 'expand-content-btn';

  if (type === 'code') {
    buttonText = 'Ver código completo';
    buttonClass += ' code-expand-btn';
  } else if (type === 'table') {
    buttonText = 'Ver tabla completa';
    buttonClass += ' table-expand-btn';
  } else if (type === 'exam') {
    buttonText = 'Ver examen completo';
    buttonClass += ' exam-expand-btn';
  } else if (type === 'audio') {
    buttonText = 'Reproducir audio';
    buttonClass += ' audio-expand-btn';
  }

  const expandButton = document.createElement('button');
  expandButton.className = buttonClass;
  expandButton.innerHTML = `<i class="bx bx-expand-alt"></i> ${buttonText}`;

  let previewData = {};

  if (type === 'table') {
    previewData = {
      tableContent: data.content,
      caption: data.title || 'Tabla de datos'
    };
  } else if (type === 'code') {
    previewData = {
      codeContent: data.content,
      title: data.title || 'Código'
    };
  } else if (type === 'audio') {
    previewData = {
      title: data.fileName || 'Audio',
      audioUrl: data.audioUrl || '',
      audioLabel: data.audioLabel || "Archivo de audio"
    };
  } else {
    previewData = data;
  }

  expandButton.addEventListener('click', () => {
    import('../components/preview-panel-agente.js').then(module => {
      const previewPanel = document.querySelector('#preview-panel');
      const isPanelOpen = previewPanel && previewPanel.classList.contains('open');

      if (isPanelOpen) {
        // El panel ya está abierto, cerrarlo
        module.closePreviewPanel();
      } else {
        // El panel está cerrado, abrirlo
        module.showPreviewPanel(previewData, type);
      }
    }).catch(error => {
      console.error('Error al cargar el módulo de previsualización:', error);
    });
  });

  // Asegurarse de que el botón se agregue al final
  container.appendChild(expandButton);
}

// GESTIÓN DE MENSAJES DEL CHAT

/**
 * Renderiza los mensajes del chat
 * @param {Array} messages - Array de mensajes a renderizar
 */
export function renderChatMessages(messages) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return;

  clearElement(chatMessages);

  // Verificación rápida para conjunto vacío
  if (!messages || messages.length === 0) return;

  // Optimización: si solo hay un mensaje, evitamos ordenar
  if (messages.length === 1) {
    renderSingleMessage(messages[0], chatMessages);
    return;
  }

  // Optimización: verificar si los mensajes ya están ordenados
  let alreadySorted = true;
  let prevTimestamp = getMessageTimestamp(messages[0]) || 0;

  for (let i = 1; i < messages.length && alreadySorted; i++) {
    const currentTimestamp = getMessageTimestamp(messages[i]) || Infinity;
    if (currentTimestamp < prevTimestamp) {
      alreadySorted = false;
    }
    prevTimestamp = currentTimestamp;
  }

  // Si los mensajes ya están ordenados, evitar el proceso costoso de ordenación
  if (alreadySorted) {
    renderMessagesInOrder(messages, chatMessages);
    return;
  }

  const messagesWithMetadata = messages.map((msg, i) => ({
    originalIndex: i,
    message: msg,
    timestamp: getMessageTimestamp(msg) || 0,
    role: (msg.role || '').toLowerCase()
  }));

  messagesWithMetadata.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    // Si timestamps son idénticos, mantener lógica de usuario/asistente
    if (a.role === 'user' && b.role === 'assistant') {
      return -1;
    } else if (a.role === 'assistant' && b.role === 'user') {
      return 1;
    }

    // Preservar orden original
    return a.originalIndex - b.originalIndex;
  });

  // Optimización: fragmento de documento para inserción por lotes
  const fragment = document.createDocumentFragment();

  messagesWithMetadata.forEach(item => {
    renderMessageItem(item, fragment);
  });

  chatMessages.appendChild(fragment);

  setManagedTimeout(() => {
    chatMessages.querySelectorAll('.ai-message, .user-message').forEach(messageElement => {
      const contentElement = messageElement.querySelector('.message-content');
      if (contentElement) {
        contentProcessing.cleanMultimodalExistingContent(contentElement);
      }
    });
  }, 100, 'clean-multimodal-messages');

  // Asegurar que los botones de feedback se reestablezcan
  initializeInteractions();
}

/**
 * Función para crear elementos de mensaje
 * @param {Object} options - Opciones para crear el mensaje
 * @returns {HTMLElement} Elemento de mensaje creado
 */
function _createMessageElement(options) {
  const { role, content, type, messageId, serverId } = options;

  const isAI = role === 'ai' || role === 'assistant';

  const messageDiv = document.createElement('div');
  const messageType = isAI ? 'ai-message' : 'user-message';
  messageDiv.className = `message ${messageType}`;

  if (messageId) {
    messageDiv.dataset.messageId = messageId;
  } else if (isAI) {
    const generatedId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    messageDiv.dataset.messageId = generatedId;
  }

  if (serverId) {
    messageDiv.dataset.serverId = serverId;
  }

  if (isAI) {
    messageDiv.innerHTML = `
      <div class="ai-profile">
        <img src="${APP_CONFIG.assistantImagePath}" alt="Perfil IA">
      </div>
      <div class="message-content"></div>
    `;

    const contentElem = messageDiv.querySelector('.message-content');
    const renderer = getRenderer(type);
    renderer(contentElem, content, role);
  } else {
    const safeContent = typeof content === 'string' ? content : String(content);
    const encodedOriginalText = encodeURIComponent(safeContent);

    const contentDiv = createElement('div', { className: 'message-content' });
    const textDiv = createElement('div', {
      className: 'message-text',
      dataset: { originalText: encodedOriginalText }
    });

    if (typeof parseMarkdownToHTML === 'function') {
      textDiv.innerHTML = parseMarkdownToHTML(safeContent);
    } else {
      textDiv.innerHTML = typeof sanitizeText === 'function' ?
        sanitizeText(safeContent).replace(/\n/g, '<br data-nl="true">') :
        safeContent.replace(/\n/g, '<br data-nl="true">');

      import('../utils/markdown-agente.js').then(module => {
        if (module && module.parseMarkdownToHTML) {
          textDiv.innerHTML = module.parseMarkdownToHTML(safeContent);
        }
      }).catch(() => {
        // Error silencioso - continuar con el fallback
      });
    }

    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);
  }

  return messageDiv;
}

/**
 * Renderiza un solo mensaje
 * @param {Object} msg - Mensaje a renderizar
 * @param {HTMLElement} container - Contenedor donde renderizarlo
 * @returns {HTMLElement} Elemento de mensaje creado
 */
function renderSingleMessage(msg, container) {
  try {
    const role = msg.role?.toLowerCase();
    const isAI = role === 'assistant' || role === 'ai';

    const { type, content } = messageProcessing.extractMessageContent(msg);

    const prefix = isAI ? 'ai-msg' : 'user-msg';
    const timestamp = new Date().getTime();
    const messageId = `${prefix}-${timestamp}-${msg.id || ''}`;

    const messageElement = _createMessageElement({
      role: isAI ? 'ai' : 'user',
      content,
      type,
      messageId,
      serverId: msg.id
    });

    container.appendChild(messageElement);
    return messageElement;
  } catch (error) {
    acadelError("💬 Mensaje confuso", "Acadel no pudo procesar este mensaje completamente. ¿Podrías reformularlo?");
    return null;
  }
}

/**
 * Renderiza mensajes ya ordenados
 * @param {Array} messages - Mensajes a renderizar
 * @param {HTMLElement} container - Contenedor donde renderizarlos
 */
function renderMessagesInOrder(messages, container) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const messageElement = renderSingleMessage(msg, fragment);

    if (messageElement) {
      const contentElem = messageElement.querySelector('.message-content');
      if (contentElem && typeof contentElem.textContent === 'string' &&
        containsMathExpressions(contentElem.textContent)) {
        renderMathWithRetry(contentElem);
      }
    }
  }

  container.appendChild(fragment);
}

/**
 * Renderiza un elemento de mensaje en un contexto de ordenación
 * @param {Object} item - Ítem con información del mensaje
 * @param {HTMLElement} container - Contenedor donde renderizarlo
 * @returns {HTMLElement} Elemento de mensaje creado
 */
function renderMessageItem(item, container) {
  try {
    const msg = item.message;
    const isAI = item.role === 'assistant' || item.role === 'ai';

    // Optimización: verificar tipos de mensajes multimodales rápidamente
    const isRawMultimodal = typeof msg.content === 'string' && (
      msg.content.includes('"hasImage"') ||
      msg.content.includes('"imageCount"') ||
      msg.content.includes('Subió archivo de audio') ||
      (msg.content.startsWith('{') && msg.content.endsWith('}') && msg.content.includes('text'))
    );

    const { type, content } = isRawMultimodal ?
      { type: 'message', content: contentProcessing.detectMultimodalContent(msg.content, isAI) } :
      messageProcessing.extractMessageContent(msg);

    const prefix = isAI ? 'ai-msg' : 'user-msg';
    const timestamp = new Date().getTime();
    const messageId = `${prefix}-${timestamp}-${msg.id || ''}`;

    const messageElement = _createMessageElement({
      role: isAI ? 'ai' : 'user',
      content,
      type,
      messageId,
      serverId: msg.id
    });

    container.appendChild(messageElement);
    return messageElement;
  } catch (error) {
    acadelError("💬 Mensaje confuso", "Acadel no pudo procesar este mensaje completamente. ¿Podrías reformularlo?");
    return null;
  }
}

/**
 * Obtiene el timestamp de un mensaje
 * @param {Object} msg - Mensaje del que obtener el timestamp
 * @returns {Date|null} Timestamp del mensaje o null
 */
function getMessageTimestamp(msg) {
  // Diferentes posibles nombres para el campo de timestamp
  const possibleFields = ['timestamp', 'created_at', 'time', 'date', 'createdAt'];

  for (const field of possibleFields) {
    if (msg[field]) {
      try {
        return new Date(msg[field]);
      } catch (e) {
        console.warn(`Error al convertir ${field} a fecha:`, e);
      }
    }
  }

  return null;
}

/**
 * Agrega un mensaje al área de chat
 * @param {string} role - 'user' o 'ai'
 * @param {string|Object} content - Contenido del mensaje
 * @param {string} type - Tipo de mensaje ('message', 'exam', etc.)
 * @returns {HTMLElement} El elemento del mensaje creado
 */
export function addMessageToChat(role, content, type = 'message') {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return null;

  // Asegurar que el renderizador esté inicializado
  ensureRendererInitialized(type);

  const timestamp = new Date().getTime();
  const messageId = `msg-${timestamp}-${Math.floor(Math.random() * 1000)}`;

  const messageElement = _createMessageElement({
    role,
    content,
    type,
    messageId
  });

  chatMessages.appendChild(messageElement);

  // Renderizado matemático si es necesario
  if ((typeof content === 'string' && containsMathExpressions(content)) || type === 'exam') {
    const contentElem = messageElement.querySelector('.message-content');
    if (contentElem) {
      renderMathWithRetry(contentElem);
    }
  }

  return messageElement;
}

/**
 * Crea un mensaje de carga (loading) con la nube de pensamiento
 * @returns {HTMLElement} Elemento de mensaje con loader
 */
export function createLoadingMessage() {
  const loader = document.createElement('div');
  loader.className = 'message ai-message processing';
  loader.setAttribute('data-is-loading', 'true');

  loader.innerHTML = `
    <div class="ai-profile thinking">
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="IA pensando">
    </div>
    <div class="message-content">
      <div class="thought-bubble">
        <div class="thought-bubbles">
          <div class="thought-bubble-dot"></div>
          <div class="thought-bubble-dot"></div>
          <div class="thought-bubble-dot"></div>
        </div>
      </div>
    </div>
  `;

  return loader;
}

/**
 * Renderiza el mensaje de carga sin problemas
 * @param {HTMLElement} loader - Elemento de carga
 * @param {string|Object} content - Contenido a renderizar
 * @param {string} type - Tipo de contenido
 */
export function replaceLoadingMessage(loader, content, type = 'message') {
  if (!loader) return;

  ensureRendererInitialized(type);

  loader.removeAttribute('data-is-loading');
  
  const profileElement = loader.querySelector('.ai-profile');
  if (profileElement) {
    profileElement.classList.remove('thinking');
  }

  loader.classList.remove('processing');

  const contentElem = loader.querySelector('.message-content');
  if (!contentElem) return;

  contentElem.innerHTML = '';

  const renderer = getRenderer(type);
  renderer(contentElem, content, 'ai');

  if (window.hljs && contentElem) {
    contentElem.querySelectorAll('pre code').forEach(block => {
       window.hljs.highlightElement(block);
    });
  }

  setTimeout(() => {
    initializeInteractions(loader);
  }, 50);

  setTimeout(() => {
    console.log('🖼️ [AUTO-PROCESS] Iniciando procesamiento automático después de renderizar IA');
    
    const images = contentElem.querySelectorAll('img.markdown-image');
    if (images.length > 0) {
      console.log(`🖼️ [AUTO-PROCESS] ${images.length} imágenes encontradas`);
      
      initializeImagePreviewHandlers(contentElem);
      
      const externalImages = contentElem.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
      if (externalImages.length > 0) {
        console.log(`🖼️ [AUTO-PROCESS] Procesando ${externalImages.length} imágenes externas`);
        
        processImagesOptimized(contentElem, Array.from(externalImages))
          .then(() => {
            console.log(`✅ [AUTO-PROCESS] Procesamiento completado exitosamente`);
          })
          .catch(error => {
            console.error(`❌ [AUTO-PROCESS] Error en procesamiento:`, error);
          });
      }
    }
  }, 100);

  // Forzar actualización visual para asegurar renderizado correcto
  requestAnimationFrame(() => {
    loader.style.opacity = '0.99';
    setTimeout(() => {
      loader.style.opacity = '1';

      // Forzar reconocimiento de MathJax en cualquier contenido matemático
      if (containsMathExpressions(contentElem.innerHTML) || type === 'exam' || type === 'table') {
        renderMathWithRetry(contentElem);
      }
    }, 30);
  });
}

/**
 * Reemplaza el mensaje de carga con un mensaje de error
 * @param {HTMLElement} loadingMessage - Elemento de mensaje de carga
 * @param {string} errorMessage - Mensaje de error
 * @param {string} originalQuery - Consulta original (opcional)
 */
export function replaceWithError(loadingMessage, errorMessage, originalQuery = '') {

    if (window.tempChatIdForFiles) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado por error en respuesta`);
    }
    
    if (!loadingMessage) return;
    
    const getStudyAgentErrorMessage = (error) => {
        const errorLower = error.toLowerCase();
        
        if (errorLower.includes('network') || errorLower.includes('conexión') || errorLower.includes('connection')) {
            return "🦫 ¡Mi conexión con YouTube está más perdida que estudiante buscando videos de última hora! Las plataformas multimedia y yo tenemos una relación complicada...";
        }
        if (errorLower.includes('timeout') || errorLower.includes('tiempo')) {
            return "🦫 Me quedé procesando tanto tu contenido multimedia que el tiempo se agotó. ¡Como cuando intentas transcribir un audio de 2 horas en tiempo récord!";
        }
        if (errorLower.includes('server') || errorLower.includes('servidor')) {
            return "🦫 El servidor está más sobrecargado que estudiante en época de finales procesando videos, audios y PDFs. ¡Hasta los agentes de estudio necesitan descansos!";
        }
        if (errorLower.includes('404') || errorLower.includes('not found')) {
            return "🦫 El contenido se escondió mejor que una respuesta de examen en un video de 3 horas. ¡El misterio académico multimedia continúa!";
        }
        
        // Mensajes genéricos para agente de estudio
        const genericStudyMessages = [
            "🦫 ¡Vaya! Mi procesador multimedia peludo tuvo un momento de confusión académica. ¡Como cuando intentas abrir 50 pestañas de YouTube para estudiar!",
            "🦫 Error detectado en mi sistema de aprendizaje capibarina. Es como cuando tu transcripción automática confunde 'derivada' con 'desesperada'...",
            "🦫 Mi motor de síntesis educativo necesita un momento de reorganización. ¡Procesar videos, audios, PDFs y matemáticas es intenso!",
            "🦫 ¡Ups! Mi agente de estudio peludo dice 'sobrecarga de contenido detectada'. Los genios multimedia también necesitamos pausas..."
        ];
        
        return genericStudyMessages[Math.floor(Math.random() * genericStudyMessages.length)];
    };
    
    const studyAgentAdvice = [
        "🎥 Mientras tanto, ¿qué tal si organizas esos videos de YouTube que tienes en 'Ver más tarde'?",
        "🎧 Momento perfecto para revisar si tienes audios pendientes de transcribir",
        "📱 Aprovecha para hacer backup de esas notas importantes que tienes dispersas",
        "🧮 ¿Has intentado dividir tu problema de matemáticas en pasos más pequeños?",
        "📚 Tiempo ideal para organizar tu biblioteca digital por materias",
        "💡 ¿Qué tal si pruebas con un enfoque diferente para tu consulta de estudio?"
    ];
    
    loadingMessage.removeAttribute('data-is-loading');
    
    loadingMessage.classList.remove('processing');
    loadingMessage.classList.add('error-message');
    
    const aiProfile = loadingMessage.querySelector('.ai-profile');
    if (aiProfile) {
        aiProfile.classList.remove('thinking');
    }
    
    let messageContent = loadingMessage.querySelector('.message-content');
    if (!messageContent) {
        messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        loadingMessage.appendChild(messageContent);
    }
    
    messageContent.innerHTML = '';
    
    const contextualMessage = getStudyAgentErrorMessage(errorMessage);
    const randomAdvice = studyAgentAdvice[Math.floor(Math.random() * studyAgentAdvice.length)];
    
    const errorContent = `
        <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(231,76,60,0.05);border-radius:8px;margin:5px 0;border-left:3px solid rgba(231,76,60,0.3);">
            <i class="bx bx-confused" style="font-size:1.3rem;color:#e74c3c;"></i>
            <span>🦫 Problemas en el agente de estudio</span>
        </div>
        <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
            <p>${contextualMessage}</p>
            <p><strong>💡 Consejo del Agente Acadel:</strong> ${randomAdvice}</p>
            <p>🎓 ¡El aprendizaje multimedia no se detiene por contratiempos técnicos! ¿Exploramos otro enfoque académico?</p>
        </div>
    `;
    
    messageContent.innerHTML = errorContent;
    
    loadingMessage.setAttribute('data-error-rendered', 'true');
    messageContent.setAttribute('data-error-content', 'true');
    
    // Forzar visibilidad
    loadingMessage.style.display = '';
    loadingMessage.style.visibility = 'visible';
    loadingMessage.style.opacity = '1';
    
    // Hacer scroll si es necesario
    try {
        if (typeof scrollToBottom === 'function') {
            scrollToBottom();
        } else {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    } catch (e) {
        console.warn('Error al hacer scroll:', e);
    }
    
    // Asegurarse de que el mensaje permanezca visible usando un timer
    setTimeout(() => {
        if (loadingMessage && loadingMessage.parentNode) {
            loadingMessage.style.display = '';
            loadingMessage.style.visibility = 'visible';
            loadingMessage.style.opacity = '1';
        }
    }, 100);
    
    if (window.acadelInfo) {
        const studyAgentNotifications = [
            "Acadel está reorganizando su arsenal de herramientas educativas",
            "El agente capibara está sincronizando YouTube, audios y documentos",
            "Acadel ajusta sus algoritmos de aprendizaje multimedia",
            "El profesor peludo está optimizando sus capacidades de estudio"
        ];
        const randomNotification = studyAgentNotifications[Math.floor(Math.random() * studyAgentNotifications.length)];
        
        acadelInfo(
            "🦫 Recalibrando agente de estudio",
            randomNotification
        );
    }
}

/**
 * Inicializa los botones de interacción en los mensajes
 * @param {HTMLElement} specificMessage - Mensaje específico a inicializar (opcional)
 */
function initializeInteractions(specificMessage = null) {
  import('../utils/response-interaction-agente.js').then(module => {
    if (typeof module.initResponseInteraction === 'function') {
      const interaction = module.initResponseInteraction();

      if (specificMessage) {
        if (!specificMessage.querySelector('.response-actions')) {
          interaction.addInteractionButtons(specificMessage);
        }
      } else {
        if (interaction && typeof interaction.processExistingMessages === 'function') {
          interaction.processExistingMessages(true);
        }
      }
    }
  }).catch(err => {
    console.warn('No se pudo cargar el módulo de interacción:', err);
  });
}

/**
 * Módulo para procesamiento de mensajes
 */
const messageProcessing = {
  /**
   * Extrae tipo y contenido de un mensaje
   * @param {Object} message - Mensaje a procesar
   * @returns {Object} Tipo y contenido extraído
   */
  extractMessageContent(message) {
    let contentToRender = message.content || message.message || '';
    let type = 'message';

    if (typeof contentToRender === 'string') {
      // 1. Primera prioridad: Detectar si es multimodal
      const isAIMessage = message.role === 'assistant' || message.role === 'ai';
      const processedMultimodal = contentProcessing.detectMultimodalContent(contentToRender, isAIMessage);

      // Si el contenido cambió, es porque se procesó un mensaje multimodal
      if (processedMultimodal !== contentToRender && typeof processedMultimodal === 'string') {
        return { type: 'message', content: processedMultimodal };
      }

      // 2. Segunda prioridad: JSON general
      if ((contentToRender.trim().startsWith('{') && contentToRender.trim().endsWith('}')) ||
        (contentToRender.trim().startsWith('[') && contentToRender.trim().endsWith(']'))) {
        try {
          const parsed = contentProcessing.parseJsonPreservingMath(contentToRender);

          // Si el parsing fue exitoso y tiene una propiedad type
          if (parsed && typeof parsed === 'object' && parsed.type) {
            type = parsed.type;

            if (type === 'exam') {
              contentToRender = parsed.exam || parsed.data;
            } else if (type === 'code') {
              contentToRender = parsed;
            } else if (type === 'table') {
              contentToRender = parsed;
            } else if (type === 'image') {
              contentToRender = parsed;
            } else if (type === 'alert') {
              contentToRender = parsed;
            } else if (type === 'action') {
              contentToRender = parsed;
            } else if (type === 'conversation') {
              type = 'message';
              contentToRender = parsed.answer || parsed.message || parsed.content;
            } else if (type === 'audio') {
              contentToRender = parsed;
            }
          }
        } catch (e) {
          // No es JSON válido, tratar como mensaje normal
          console.warn('Error al parsear posible JSON:', e);
        }
      }
    } else if (contentToRender && typeof contentToRender === 'object') {
      // Si ya es un objeto, verificar si tiene tipo
      if (contentToRender.type) {
        type = contentToRender.type;

        if (type === 'exam') {
          contentToRender = contentToRender.exam || contentToRender.data;
        } else if (type === 'conversation') {
          type = 'message';
          contentToRender = contentToRender.answer || contentToRender.message || contentToRender.content;
        } else if (type === 'audio') {
          contentToRender = contentToRender;
        }
      }
    }

    return { type, content: contentToRender };
  },

  /**
   * Procesa la respuesta del servidor para determinar tipo y contenido
   * @param {Object} data - Datos de la respuesta
   * @returns {Object} Tipo y contenido procesado
   */
  processResponse(data) {
    // CASO 1: La respuesta ya tiene tipo específico
    if (data && data.type) {
      switch (data.type) {
        case 'exam':
          return {
            type: 'exam',
            content: data.exam || data.data || {}
          };

        case 'code':
          return {
            type: 'code',
            content: {
              code: data.code || '',
              language: data.language || 'javascript'
            }
          };

        case 'conversation':
          return {
            type: 'message',
            content: data.answer || data.content || ''
          };

        case 'table':
          return {
            type: 'table',
            content: data
          };

        case 'alert':
          return {
            type: 'alert',
            content: {
              type: data.alertType || 'info',
              message: data.message || data.alertMessage || '',
              title: data.title || data.alertTitle || ''
            }
          };

        case 'action':
          return {
            type: 'action',
            content: {
              message: data.message || '',
              actions: data.actions || []
            }
          };

        case 'audio':
          return {
            type: 'audio',
            content: {
              fileName: data.fileName || 'Audio grabado',
              audioUrl: data.audioUrl || ''
            }
          };
      }
    }

    // CASO 2: Analizar el contenido en data.answer o data.content
    const content = data.answer || data.content || '';

    // Si el contenido es string que parece JSON
    if (typeof content === 'string') {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          const parsed = contentProcessing.parseJsonPreservingMath(content);

          if (typeof parsed === 'object' && parsed !== null) {
            // Verificación de mermaid
            if (parsed.type === 'mermaid' && parsed.code) {
              return {
                type: 'mermaid',
                content: {
                  code: parsed.code,
                  title: parsed.title || 'Diagrama Mermaid'
                }
              };
            }

            if (parsed.type === 'code' && parsed.code) {
              return {
                type: 'code',
                content: {
                  code: parsed.code,
                  language: parsed.language || 'javascript'
                }
              };
            } else if (parsed.type === 'table' ||
              (Array.isArray(parsed.headers) && Array.isArray(parsed.rows))) {
              return {
                type: 'table',
                content: parsed
              };
            } else if (parsed.type === 'audio') {
              return {
                type: 'audio',
                content: parsed
              };
            } else if (parsed.type) {
              return this.processResponse(parsed);
            }
          }
        } catch (e) {
          // No es un JSON válido, continuar
          console.warn('Error al parsear JSON potencial:', e);
        }
      }

      if (content.includes('|') && content.includes('\n')) {
        const tableLines = content.split('\n').filter(line =>
          line.trim().startsWith('|') && line.trim().endsWith('|')
        );

        if (tableLines.length >= 3) {
          return {
            type: 'table',
            content: content
          };
        }
      }

      if (content.includes('Subió archivo de audio:') || content.match(/Subió (?:un )?archivo de audio/)) {
        return {
          type: 'audio',
          content: {
            fileName: 'Audio grabado',
            message: content
          }
        };
      }
    }

    // Si el contenido ya es un objeto
    if (typeof content === 'object' && content !== null) {
      if (content.code && (content.language || typeof content.code === 'string')) {
        return {
          type: 'code',
          content: {
            code: content.code,
            language: content.language || 'javascript'
          }
        };
      }

      if (Array.isArray(content.headers) && Array.isArray(content.rows)) {
        return {
          type: 'table',
          content: content
        };
      }

      if (content.type === 'audio' || content.audioUrl) {
        return {
          type: 'audio',
          content: content
        };
      }
    }

    // Por defecto, devolver como mensaje de texto
    return {
      type: 'message',
      content: content
    };
  }
};

/**
 * Procesa la respuesta del servidor
 * @param {Object} data - Datos recibidos del servidor
 * @returns {Object} Objeto con tipo y contenido procesado
 */
export function processServerResponse(data) {
  return messageProcessing.processResponse(data);
}

// PROCESAMIENTO DE IMÁGENES - FUNCIONES SIMPLIFICADAS QUE DELEGAN AL MÓDULO COMPARTIDO

function processAllExistingImages() {
  const messages = document.querySelectorAll('.message');
  if (messages.length === 0) return;

  console.log(`🖼️ [BATCH] Procesando proactivamente imágenes en ${messages.length} mensajes con sistema de locks...`);

  const messagesWithExternalImages = [];
  
  messages.forEach(message => {
    const container = message.querySelector('.message-content');
    if (!container) return;

    const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    if (externalImages.length > 0) {
      messagesWithExternalImages.push({ container, count: externalImages.length });
    }
  });

  if (messagesWithExternalImages.length === 0) {
    console.log(`📦 [BATCH] No hay imágenes externas para procesar`);
    return;
  }

  console.log(`📦 [BATCH] ${messagesWithExternalImages.length} mensajes contienen imágenes externas`);

  messagesWithExternalImages.forEach(({ container, count }, index) => {
    setTimeout(() => {
      console.log(`📦 [BATCH] Procesando mensaje ${index + 1}/${messagesWithExternalImages.length} (${count} imágenes)`);
      processImagesOptimized(container);
    }, index * 100); // Spread temporal para evitar saturación
  });
}

function setupImagePreviewSystem() {
  if (window._imagePreviewSystemConfigured) return;
  window._imagePreviewSystemConfigured = true;

  const chatMessagesContainer = document.querySelector('.chat-messages');
  if (!chatMessagesContainer) {
    console.warn('No se encontró el contenedor de mensajes para configurar vistas previas de imágenes');
    return;
  }

  chatMessagesContainer.addEventListener('click', function (e) {
    const imgTarget = e.target.closest('.image-preview img') || 
      e.target.closest('.markdown-image') ||
      e.target.closest('.multimodal-container img') ||
      e.target.closest('.markdown-image-container') ||
      e.target.closest('.chat-image-item');

    if (imgTarget) {
      e.preventDefault();
      e.stopPropagation();

      let imageSrc;
      
      if (imgTarget.classList && imgTarget.classList.contains('chat-image-item')) {
        const img = imgTarget.querySelector('img');
        if (img) {
          imageSrc = img.getAttribute('data-original-src') || img.src;
        }
      }
      else if (imgTarget.classList && imgTarget.classList.contains('markdown-image-container')) {
        const img = imgTarget.querySelector('img.markdown-image');
        if (img) {
          imageSrc = img.getAttribute('data-original-src') || img.src;
        }
      }
      else {
        imageSrc = imgTarget.getAttribute('data-original-src') || imgTarget.src;
      }

      if (imageSrc) {
        window.showFullImage(imageSrc);
      }
    }
  });

  console.log('Sistema de vista previa de imágenes configurado correctamente');
}

window.showFullImage = function (imagePath) {
  console.log("Mostrando imagen a tamaño completo:", imagePath);

  if (window._showingFullImage) {
    console.log("Evitando modal duplicada");
    return;
  }

  window._showingFullImage = true;

  const img = new Image();

  img.onload = function () {
    try {
      const imgContainer = document.createElement('div');
      Object.assign(imgContainer.style, {
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });

      const imageElement = document.createElement('img');
      imageElement.src = imagePath;
      imageElement.alt = 'Vista ampliada';
      Object.assign(imageElement.style, {
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain',
        borderRadius: '8px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.3)'
      });

      imgContainer.appendChild(imageElement);

      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        border: '5px solid rgba(255,255,255,0.3)',
        borderTop: '5px solid white',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        animation: 'spin 1s linear infinite',
        position: 'absolute'
      });

      if (!document.getElementById('spin-animation')) {
        const style = document.createElement('style');
        style.id = 'spin-animation';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      const modal = createModal({
        className: 'image-fullscreen-modal',
        content: [spinner, imgContainer],
        onClose: () => {
          window._showingFullImage = false;
        }
      });

      imageElement.onload = function () {
        spinner.style.display = 'none';
      };

      imageElement.onerror = function () {
        spinner.style.display = 'none';
        showErrorModal();

        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }

        window._showingFullImage = false;
      };
    } finally {
      window._showingFullImage = false;
    }
  };

  img.onerror = function () {
    try {
      showErrorModal();
    } finally {
      window._showingFullImage = false;
    }
  };

  img.src = imagePath;
};

function createModal(options = {}) {
  const {
    className = 'fullscreen-modal',
    role = 'dialog',
    closeOnBackdrop = true,
    content,
    onClose
  } = options;

  const existingModals = document.querySelectorAll(`.${className}`);
  existingModals.forEach(modal => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });

  const modal = document.createElement('div');
  modal.className = className;
  modal.setAttribute('role', role);
  modal.setAttribute('aria-modal', 'true');

  Object.assign(modal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  });

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '❌ Cerrar';
  
  Object.assign(closeButton.style, {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid white',
    borderRadius: '25px',
    color: 'white',
    fontSize: '16px',
    padding: '8px 16px',
    cursor: 'pointer',
    zIndex: '10000',
    backdropFilter: 'blur(10px)'
  });
  
  modal.appendChild(closeButton);

  if (content) {
    if (typeof content === 'string') {
      modal.innerHTML += content;
    } else if (content instanceof HTMLElement) {
      modal.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'string') {
          modal.innerHTML += item;
        } else if (item instanceof HTMLElement) {
          modal.appendChild(item);
        }
      });
    }
  }

  document.body.appendChild(modal);

  const closeModal = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
      if (typeof onClose === 'function') {
        onClose();
      }
    }
  };

  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  if (closeOnBackdrop) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };

  document.addEventListener('keydown', escHandler);

  return modal;
}

function showErrorModal(options = {}) {
  const title = options.title || 'Imagen invisible! 👻 Acadel no puede identificar esta imagen. Las imagenes fantasma existen';
  const description = options.description || '';

  const errorContainer = document.createElement('div');
  Object.assign(errorContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px'
  });

  const icon = document.createElement('i');
  icon.className = 'bx bx-confused';
  Object.assign(icon.style, {
    fontSize: '3rem',
    color: 'white',
    marginBottom: '15px'
  });

  const message = document.createElement('p');
  message.textContent = title;
  Object.assign(message.style, {
    color: 'white',
    fontSize: '1.2rem',
    margin: '0'
  });

  errorContainer.appendChild(icon);
  errorContainer.appendChild(message);

  if (description) {
    const descEl = document.createElement('p');
    descEl.textContent = description;
    Object.assign(descEl.style, {
      color: 'rgba(255,255,255,0.7)',
      fontSize: '0.9rem',
      margin: '10px 0 0 0'
    });
    errorContainer.appendChild(descEl);
  }

  if (typeof createModal === 'function') {
    createModal({
      className: 'image-fullscreen-modal',
      content: errorContainer,
      onClose: () => {
        window._showingFullImage = false;
      }
    });
  }
  
  if (window.acadelWarning) {
    window.acadelWarning(
      "👻 Imagen fantasma", 
      "Acadel no pudo cargar la imagen. Parece que se volvió invisible."
    );
  }
}

/**
 * Verifica si un texto contiene expresiones matemáticas
 * @param {string} text - Texto a verificar  
 * @returns {boolean} - true si contiene expresiones matemáticas
 */
function containsMath(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Patrones para detectar matemáticas
  const mathPatterns = [
    /\$.*?\$/,                    // Inline math: $...$
    /\$\$[\s\S]*?\$\$/,          // Display math: $...$
    /\\[\[\(][\s\S]*?\\[\]\)]/,  // LaTeX brackets: \[...\] or \(...\)
    /\\[a-zA-Z]+\{[^}]*\}/,      // LaTeX commands: \command{...}
    /\\\w+/,                     // LaTeX commands: \alpha, \beta, etc.
    /[_^]\{[^}]*\}/,             // Subscripts/superscripts: _{...} ^{...}
    /\\frac\{[^}]*\}\{[^}]*\}/,  // Fractions: \frac{...}{...}
    /\\sqrt(\[[^\]]*\])?\{[^}]*\}/, // Square roots: \sqrt{...}
    /\\[lr][(\[\|)\]]/           // Left/right delimiters: \left(, \right), etc.
  ];
  
  return mathPatterns.some(pattern => pattern.test(text));
}

// INICIALIZACIÓN DE EVENTOS PARA SCROLL E IMÁGENES - SIMPLIFICADO

let processingScrollThrottled = false;
window.addEventListener('scroll', () => {
  if (processingScrollThrottled) return;

  processingScrollThrottled = true;
  setTimeout(() => {
    processingScrollThrottled = false;

    const visibleExternalImages = Array.from(
      document.querySelectorAll('img.markdown-image:not(.stored-image)')
    ).filter(img => {
      const rect = img.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );
    });

    if (visibleExternalImages.length > 0) {
      const containers = new Set();
      visibleExternalImages.forEach(img => {
        const container = img.closest('.message-content');
        if (container) containers.add(container);
      });

      containers.forEach(container => {
        processImagesOptimized(container);
      });
    }
  }, 150);
});

window.addEventListener('popstate', () => {
  setTimeout(() => {
    try {
      processAllExistingImages();
    } catch (e) {
      if (window.acadelInfo) {
        window.acadelInfo("🔄 Recargando imágenes", "Acadel está actualizando las imágenes después del cambio");
      }
    }
  }, 800);
});

document.addEventListener('DOMContentLoaded', () => {
  setupImagePreviewSystem();

  setTimeout(() => {
    processAllExistingImages();
  }, 500);
});

// EXPOSICIÓN GLOBAL CONTROLADA

// Exposición global controlada para admitir acceso directo
if (typeof window !== 'undefined') {
  window.initializeFileAttachmentHandlers = initializeFileAttachmentHandlers;
  // imageUrlCache ahora se importa del módulo compartido
  window.imageUrlCache = imageUrlCache;
}

// EXPORTACIONES PRINCIPALES

// Exportaciones individuales
export {
  renderTableMessage,
  renderCodeMessage,
  renderAudioMessage,
  initializeMathJaxInContent
};

// Exportación por defecto con todas las funciones principales
export default {
  processServerResponse,
  renderChatMessages,
  addMessageToChat,
  createLoadingMessage,
  replaceLoadingMessage,
  replaceWithError,
  registerMessageRenderer,
  initializeMessageRenderers,
  initializeFileAttachmentHandlers,
  ensureRendererInitialized,
  applyHighlighting,
  initializeMathJaxInContent
};