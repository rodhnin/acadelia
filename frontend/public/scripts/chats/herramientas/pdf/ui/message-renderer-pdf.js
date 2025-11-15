import { APP_CONFIG, LATEX_PATTERNS} from '../core/config-pdf.js';
import { getElement } from './ui-manager-pdf.js';
import {
  parseMarkdownToHTML,
  detectTableInText,
  createCodeBlockHTML,
  detectAndProcessCode,
  createTableHTML,
} from '../utils/markdown-pdf.js';
import { renderExam } from '../components/exam-renderer-pdf.js';
import { copyToClipboard } from '../utils/clipboard-pdf.js';
import {
  createElement,
  createElementWithHTML,
  addEvent,
  clearElement,
  setManagedTimeout,
  sanitizeText
} from '../../../shared/dom-helpers.js';
import { 
  initializeMermaidDiagram,
  initMermaidSystem
} from '../../../shared/mermaid-utils.js';
import contentProcessing, { detectMultimodalContent, cleanMultimodalExistingContent } from './content-processing-pdf.js';

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

let mathJaxModule = null;
let mathJaxLoading = false;
let mathJaxQueue = [];
let mathJaxProcessing = false;

async function preloadMathJaxModule() {
  if (mathJaxModule || mathJaxLoading) return mathJaxModule;
  
  if (window.MathJax && window.MathJax.typesetPromise) {
    console.log('⚡ [PRELOAD] MathJax ya disponible globalmente, creando wrapper');
    mathJaxModule = {
      renderMath: window.MathJax.typesetPromise,
      initMathJax: () => Promise.resolve(),
      ensureMathJaxInitialized: () => Promise.resolve()
    };
    return mathJaxModule;
  }
  
  mathJaxLoading = true;
  try {
    console.log('⚡ [PRELOAD] Precargando MathJax...');
    mathJaxModule = await import('../math/mathjax-config.js');
    console.log('✅ [PRELOAD] MathJax precargado exitosamente');
    return mathJaxModule;
  } catch (error) {
    console.error('❌ [PRELOAD] Error precargando MathJax:', error);
    mathJaxLoading = false;
    return null;
  }
}

preloadMathJaxModule();

async function processMathJaxQueue() {
  if (mathJaxProcessing || mathJaxQueue.length === 0) return;
  
  mathJaxProcessing = true;
  console.log(`🔄 [QUEUE] Procesando cola MathJax: ${mathJaxQueue.length} elementos`);
  
  try {
    // Agrupar todos los elementos de la cola
    const allElements = [];
    const allOptions = {};
    
    mathJaxQueue.forEach(({ container, options }) => {
      if (container && container.isConnected) {
        allElements.push(container);
        Object.assign(allOptions, options);
      }
    });
    
    mathJaxQueue = [];
    
    if (allElements.length > 0) {
      if (!mathJaxModule) {
        await preloadMathJaxModule();
      }
      
      if (mathJaxModule && mathJaxModule.renderMath) {
        await mathJaxModule.renderMath(allElements, {
          ...allOptions,
          cacheKey: `batch-${Date.now()}`,
          forceRender: true,
          timeout: 15000
        });
        
        allElements.forEach(el => {
          if (el && el.isConnected) {
            el.setAttribute('data-mathjax-processed', 'true');
            el.removeAttribute('data-mathjax-processing');
          }
        });
        
        console.log(`✅ [QUEUE] MathJax procesado en lote: ${allElements.length} elementos`);
      }
    }
  } catch (error) {
    console.error('❌ [QUEUE] Error procesando cola MathJax:', error);
  } finally {
    mathJaxProcessing = false;
    
    if (mathJaxQueue.length > 0) {
      setTimeout(() => processMathJaxQueue(), 100);
    }
  }
}

function initializeMathJaxInContent(container, options = {}) {
  if (!container || !container.nodeType || !container.isConnected) {
    return Promise.resolve();
  }
  
  const containerText = container.textContent || container.innerHTML || '';
  if (!containerText || !containsMathExpressions(containerText)) {
    return Promise.resolve();
  }
  
  if (container.hasAttribute('data-mathjax-processed') || 
      container.hasAttribute('data-mathjax-processing')) {
    return Promise.resolve();
  }
  
  container.setAttribute('data-mathjax-processing', 'true');
  
  mathJaxQueue.push({ container, options });
  
  if (!mathJaxProcessing) {
    setTimeout(() => processMathJaxQueue(), 50);
  }
  
  return Promise.resolve();
}

// Constantes para reutilización
const MESSAGE_TYPES = {
  MESSAGE: 'message',
  CODE: 'code',
  EXAM: 'exam',
  TABLE: 'table',
  ERROR: 'error',
  LOADING: 'loading',
  ALERT: 'alert',
  ACTION: 'action',
  IMAGE: 'image',
  MERMAID: 'mermaid'
};

// Patrones regex para detectar código
const REGEX = {
  CODE_BLOCK: /```([a-zA-Z]*)\s*\n([\s\S]*?)```/g,
  INLINE_CODE: /`([^`]+)`/g,
};

const MERMAID_TYPE_PATTERN = /^(graph |flowchart |sequenceDiagram|classDiagram|classDiagram-v2|gitGraph|pie title|gantt|stateDiagram|stateDiagram-v2|mindmap|timeline|journey|erDiagram|requirementDiagram)/m;

// Registro de renderizadores por tipo de mensaje
const renderersMap = {};
let renderersInitialized = false;

/**
 * Inicializa y registra todos los renderizadores
 * Se llama automáticamente cuando se necesita
 */
export function initializeMessageRenderers() {
  if (renderersInitialized) return;

  renderersMap[MESSAGE_TYPES.MESSAGE] = renderTextMessage;
  renderersMap[MESSAGE_TYPES.EXAM] = renderExamMessage;
  renderersMap[MESSAGE_TYPES.ERROR] = renderErrorMessage;
  renderersMap[MESSAGE_TYPES.LOADING] = renderLoadingMessage;
  renderersMap[MESSAGE_TYPES.CODE] = renderCodeMessage;
  renderersMap[MESSAGE_TYPES.TABLE] = renderTableMessage;
  renderersMap[MESSAGE_TYPES.ALERT] = renderAlertMessage;
  renderersMap[MESSAGE_TYPES.ACTION] = renderActionMessage;
  renderersMap[MESSAGE_TYPES.IMAGE] = renderImageMessage;
  renderersMap[MESSAGE_TYPES.MERMAID] = renderMermaidMessage;

  contentProcessing.initialize({
    initializeFileAttachmentHandlers: initializeFileAttachmentHandlers
  });

  initializeCleanupForExistingMessages();
  
  initializeMermaidObserver();

  renderersInitialized = true;
}

/**
 * Inicializa el proceso de limpieza automática para mensajes multimodales
 */
function initializeCleanupForExistingMessages() {
  if (typeof setManagedTimeout === 'function') {
    setManagedTimeout(performInitialCleanup, 0, 'initial-cleanup');
  } else {
    setTimeout(performInitialCleanup, 0);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (typeof setManagedTimeout === 'function') {
      setManagedTimeout(performInitialCleanup, 500, 'delayed-cleanup');
    } else {
      setTimeout(performInitialCleanup, 500);
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof setManagedTimeout === 'function') {
        setManagedTimeout(performInitialCleanup, 500, 'dom-ready-cleanup');
      } else {
        setTimeout(performInitialCleanup, 500);
      }
    });
  }

  window.addEventListener('popstate', () => {
    if (typeof setManagedTimeout === 'function') {
      setManagedTimeout(performInitialCleanup, 500, 'popstate-cleanup');
    } else {
      setTimeout(performInitialCleanup, 500);
    }
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
    import('../components/preview-panel-pdf.js')
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
  if (!originalMessage) return 'Acadel no encontró contenido para mostrar. El archivo parece estar vacío como mi estómago antes del almuerzo.';
  
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
      return 'Acadel buscó por todas partes pero no encontró el documento especificado. ¿Estás seguro de que está aquí?';
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
    acadelError(
      "Error extrayendo documento", 
      `Acadel tuvo problemas procesando el archivo "${fileName}". Mi cerebro de capibara se confundió.`
    );
    return `Acadel encontró un problema técnico al extraer el contenido del documento. Error.`;
  }
}

/**
 * Extrae el código del mensaje original para un archivo específico
 * @param {string} originalMessage - Mensaje original codificado
 * @param {string} fileName - Nombre del archivo cuyo código queremos extraer
 * @returns {string} Código extraído o mensaje de error
 */
function extractCodeContent(originalMessage, fileName) {
  if (!originalMessage) return '// Acadel no encontró código para extraer';
  if (!fileName) return '// Acadel dice: ¿Cómo voy a encontrar código sin saber el nombre del archivo?';
  
  try {
    // PASO 1: Verificar si es un objeto JSON
    try {
      // Si el mensaje es un JSON, intentar parsearlo
      const parsedMessage = JSON.parse(decodeURIComponent(originalMessage));
      
      // Si tiene código directo, usarlo
      if (parsedMessage.code) {
        return parsedMessage.code;
      }
      
      // Si tiene contenido específico para este archivo
      if (parsedMessage.fileName === fileName && parsedMessage.code) {
        return parsedMessage.code;
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
    
    // PASO 3: Normalizar el nombre del archivo eliminando comillas si las tiene
    const normalizedFileName = fileName.replace(/^["']|["']$/g, '');
    
    // PASO 4: Construir un patrón para buscar el bloque de código específico para este archivo
    const codeBlockPattern = new RegExp(`Código de ["']?${normalizedFileName}["']?[^\\n]*:\\s*\`\`\`[\\w]*\\s*([\\s\\S]*?)(?=\`\`\`|$)`, 'i');
    
    const codeMatch = decodedMessage.match(codeBlockPattern);
    
    // Si encontramos el bloque, devolver su contenido
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim()
        .replace(/<a\s+[^>]*>/gi, '')
        .replace(/<\/a>/gi, '')
        .replace(/<em>/gi, '')
        .replace(/<\/em>/gi, '')
        .replace(/<[^>]*>/g, '');
    }
    
    // Si no encontramos el bloque específico, buscar cualquier bloque como fallback
    const genericMatch = decodedMessage.match(/```[\w]*\s*([\s\S]*?)```/);
    if (genericMatch && genericMatch[1]) {
      return genericMatch[1].trim()
        .replace(/<a\s+[^>]*>/gi, '')
        .replace(/<\/a>/gi, '')
        .replace(/<em>/gi, '')
        .replace(/<\/em>/gi, '')
        .replace(/<[^>]*>/g, '');
    }
    
    return `// Acadel buscó por todas partes pero no encontró código para: ${normalizedFileName}\n// ¿Estás seguro de que hay código aquí?`;
  } catch (e) {
    acadelError(
      "Error extrayendo código", 
      `Acadel tuvo problemas extrayendo el código de "${fileName}": ${e.message}`
    );
    return '// Acadel se confundió extrayendo el código: ' + e.message;
  }
}


async function processExternalImagesRealTime(container, externalImages) {
  if (!externalImages) {
    externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
  }
  
  if (externalImages.length === 0) {
    console.log('🖼️ [REALTIME] No hay imágenes externas para procesar');
    return { total: 0, successful: 0, failed: 0 };
  }

  console.log(`🖼️ [REALTIME] Procesando ${externalImages.length} imágenes INMEDIATAMENTE`);
  
  showImagePlaceholdersImmediately(container);
  
  const processPromises = Array.from(externalImages).map(async (img, index) => {
    const originalSrc = img.dataset.originalSrc || img.src;
    
    if (!isValidExternalImageURL(originalSrc)) {
      img.removeAttribute('data-needs-storage');
      return { success: false, reason: 'invalid_url' };
    }
    
    const chatId = getChatId();
    const cachedPath = imageUrlCache.get(chatId, originalSrc, 'path');
    if (cachedPath) {
      updateImageRealTime(img, cachedPath);
      return { success: true, fromCache: true, filePath: cachedPath };
    }
    
    img.classList.add('image-loading');
    
    try {
      const { saveMarkdownImage } = await import('../api/messages-pdf.js');
      const result = await saveMarkdownImage(originalSrc, chatId);
      
      if (result.success && result.filePath) {
        updateImageRealTime(img, result.filePath);
        return result;
      } else {
        img.classList.remove('image-loading');
        img.removeAttribute('data-needs-storage');
        return result;
      }
    } catch (error) {
      console.error(`❌ [REALTIME] Error procesando imagen ${index + 1}:`, error);
      img.classList.remove('image-loading');
      return { success: false, error: error.message };
    }
  });
  
  const results = await Promise.allSettled(processPromises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  console.log(`🎉 [REALTIME] Procesamiento paralelo completado: ${successful}/${externalImages.length} imágenes`);
  
  return {
    total: externalImages.length,
    successful,
    failed: externalImages.length - successful
  };
}

function showImagePlaceholdersImmediately(container) {
  const imageContainers = container.querySelectorAll('.markdown-image-container');
  
  imageContainers.forEach(imageContainer => {
    const img = imageContainer.querySelector('img.markdown-image');
    if (!img || !img.hasAttribute('data-needs-storage')) return;
    
    // Evitar duplicar placeholders
    if (imageContainer.querySelector('.image-loading-placeholder')) return;
    
    const loadingPlaceholder = createElement('div', {
      className: 'image-loading-placeholder',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '8px',
        borderRadius: '8px',
        zIndex: '1'
      }
    });
    
    const spinner = createElement('div', {
      style: {
        border: '3px solid rgba(0,0,0,0.1)',
        borderTop: '3px solid #007bff',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        animation: 'spin 1s linear infinite'
      }
    });
    
    const text = createElement('span', {
      style: {
        fontSize: '0.8rem',
        color: '#666'
      }
    }, '🔄 Acadel descargando...');
    
    loadingPlaceholder.appendChild(spinner);
    loadingPlaceholder.appendChild(text);
    imageContainer.appendChild(loadingPlaceholder);
    
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
  });
}

function updateImageRealTime(img, newSrc) {
  img.src = newSrc;
  img.dataset.originalSrc = newSrc;
  img.removeAttribute('data-needs-storage');
  img.classList.remove('external-image', 'image-loading');
  img.classList.add('stored-image');
  img.style.opacity = '1';
  img.style.visibility = 'visible';
  
  const container = img.closest('.markdown-image-container');
  if (container) {
    const placeholder = container.querySelector('.image-loading-placeholder');
    if (placeholder) {
      placeholder.style.opacity = '0';
      placeholder.style.transform = 'scale(0.8)';
      placeholder.style.transition = 'all 0.3s ease';
      setTimeout(() => placeholder.remove(), 300);
    }
  }
  
  const chatId = getChatId();
  imageUrlCache.set(chatId, img.dataset.originalSrc, newSrc, 'path');
  
  console.log(`🔄 [REALTIME] Imagen actualizada inmediatamente: ${newSrc}`);
}

function initializeImagePreviewHandlersOptimized(container) {
  return initializeImagePreviewHandlers(container);
}

function handleImageErrorOptimized(img, mode = 'inline', options = {}) {
  return handleImageError(img, mode, {
    isMultimodal: options.isMultimodal || false,
    imageCount: options.imageCount || 1,
    chatId: options.chatId || getChatId(),
    cacheFailure: true,
    modalTitle: options.modalTitle || 'Imagen no disponible'
  });
}

let mermaidObserverInitialized = false;

/**
 * Inicializa un observador para detectar nuevos diagramas Mermaid
 * y renderizarlos automáticamente
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
 * Realiza la limpieza inicial de todos los mensajes multimodales
 */
function performInitialCleanup() {
  // Primera pasada: arreglar mensajes con estructura problemática
  document.querySelectorAll('.message-text > .multimodal-container').forEach(problematic => {
    const message = problematic.closest('.message');
    const contentElement = message?.querySelector('.message-content');

    if (contentElement) {
      cleanMultimodalExistingContent(contentElement);
    }
  });

  // Segunda pasada: limpiar todos los mensajes
  document.querySelectorAll('.message').forEach(message => {
    const contentElement = message.querySelector('.message-content');
    if (contentElement) {
      cleanMultimodalExistingContent(contentElement);
    }
  });

  setupCleanupObserver();
}

function setupCleanupObserver() {
  let pendingElements = [];
  let processingScheduled = false;
  
  const processPendingElements = () => {
    const elementsToProcess = [...pendingElements];
    pendingElements = [];
    processingScheduled = false;
    
    const uniqueElements = new Set(elementsToProcess);
    uniqueElements.forEach(element => {
      if (element && element.isConnected) {
        cleanMultimodalExistingContent(element);
        
        // Mermaid diagrams
        const mermaidDiagrams = element.querySelectorAll('.mermaid-diagram:not([data-processed="true"])');
        if (mermaidDiagrams.length > 0) {
          mermaidDiagrams.forEach(diagram => {
            const code = diagram.getAttribute('data-code');
            const id = diagram.id;
            if (code && id) {
              initializeMermaidDiagram(id, code);
              diagram.setAttribute('data-processed', 'true');
            }
          });
        }
        
        const elementText = element.textContent || '';
        if (elementText && containsMathExpressions(elementText)) {
          console.log('⚡ [OBSERVER] LaTeX inmediato en observer');
          initializeMathJaxInContent(element, { 
            cacheKey: `observer-immediate-${Date.now()}`,
            immediate: true 
          });
        }
      }
    });
  };
  
  const observer = new MutationObserver(mutations => {
    let hasNewContent = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        hasNewContent = true;
        
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const messages = node.classList?.contains('message') 
              ? [node]
              : Array.from(node.querySelectorAll('.message'));
              
            messages.forEach(message => {
              const contentElement = message.querySelector('.message-content');
              if (contentElement) {
                pendingElements.push(contentElement);
                
                const externalImages = contentElement.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
                if (externalImages.length > 0) {
                  processExternalImagesRealTime(contentElement, externalImages);
                }
              }
            });
          }
        });
      }
    }
    
    if (hasNewContent && !processingScheduled) {
      processingScheduled = true;
      setManagedTimeout(processPendingElements, 50, 'cleanup-observer-fast');
    }
  });

  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    observer.observe(chatMessages, {
      childList: true,
      subtree: true
    });
    
    console.log('⚡ Observer ultra-rápido configurado');
  }
}

/**
 * Verifica si el texto contiene uno o más diagramas Mermaid
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
function extractTextAroundSpecificMermaid(text, diagramInfo, before) {
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

/**
 * Registra un renderizador para un tipo específico de mensaje
 * @param {string} type - Tipo de mensaje 
 * @param {Function} renderer - Función renderizadora
 */
export function registerMessageRenderer(type, renderer) {
  if (typeof renderer !== 'function') {
    return;
  }

  renderersMap[type] = renderer;
}

/**
 * Obtiene el renderizador apropiado para un tipo de mensaje
 * @param {string} type - Tipo de mensaje
 * @returns {Function} Función renderizadora
 */
function getRenderer(type) {
  ensureRenderersInitialized();

  const renderer = renderersMap[type];
  if (!renderer) {
    return renderersMap[MESSAGE_TYPES.MESSAGE];
  }

  return renderer;
}

/**
 * Asegura que los renderizadores estén inicializados
 */
function ensureRenderersInitialized() {
  if (!renderersInitialized) {
    initializeMessageRenderers();
  }
}

/**
 * Determina el tipo de mensaje basado en su contenido
 * @param {any} content - Contenido del mensaje
 * @returns {Object} Objeto con tipo y contenido procesado
 */
export function determineMessageType(content) {
  if (!content) {
    return { type: MESSAGE_TYPES.MESSAGE, content: '' };
  }

  // Caso 1: Es un objeto
  if (typeof content === 'object' && content !== null) {
    // Si tiene un tipo explícito, procesarlo
    if (content.type) {
      return processExplicitTypeObject(content);
    }

    return detectTypeByStructure(content);
  }

  // Caso 2: Es un string
  if (typeof content === 'string') {
    return processStringContent(content);
  }

  // Caso por defecto
  return {
    type: MESSAGE_TYPES.MESSAGE,
    content: String(content)
  };
}

/**
 * Procesa objetos con tipo explícito
 * @param {Object} content - Objeto con propiedad 'type'
 * @returns {Object} Objeto con tipo y contenido procesado
 */
function processExplicitTypeObject(content) {
  const type = content.type;

  switch (type) {
    case MESSAGE_TYPES.CODE:
      return {
        type: MESSAGE_TYPES.CODE,
        content: {
          code: content.code || '',
          language: content.language || 'javascript'
        }
      };

    case MESSAGE_TYPES.EXAM:
      return {
        type: MESSAGE_TYPES.EXAM,
        content: content.exam || content.data || content
      };

    case MESSAGE_TYPES.IMAGE:
      return {
        type: MESSAGE_TYPES.IMAGE,
        content: content
      };

    case MESSAGE_TYPES.TABLE:
      return { type, content };

    case MESSAGE_TYPES.ALERT:
    case MESSAGE_TYPES.ACTION:
      return { type, content };

    case 'conversation':
      return {
        type: MESSAGE_TYPES.MESSAGE,
        content: content.answer || content.message || content.content || ''
      };

    default:
      return { type, content };
  }
}

/**
 * Detecta el tipo de mensaje por su estructura
 * @param {Object} content - Objeto a analizar
 * @returns {Object} Objeto con tipo y contenido procesado
 */
function detectTypeByStructure(content) {
  if (content.url && (content.caption || content.prompt)) {
    return {
      type: MESSAGE_TYPES.IMAGE,
      content: content
    };
  }

  if (content.code && (content.language || typeof content.code === 'string')) {
    return {
      type: MESSAGE_TYPES.CODE,
      content: {
        code: content.code,
        language: content.language || 'javascript'
      }
    };
  }

  // Por defecto, tratar como mensaje normal
  return {
    type: MESSAGE_TYPES.MESSAGE,
    content: content
  };
}

/**
 * Procesa contenido de tipo string
 * @param {string} content - String a procesar
 * @returns {Object} Objeto con tipo y contenido procesado
 */
function processStringContent(content) {
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(content);

      if (parsed.type === MESSAGE_TYPES.IMAGE || (parsed.url && (parsed.caption || parsed.prompt))) {
        return {
          type: MESSAGE_TYPES.IMAGE,
          content: parsed
        };
      }

      // Llamada recursiva para procesar el objeto
      return determineMessageType(parsed);
    } catch (e) {
      // Falló el parseo, continuar tratándolo como string
    }
  }

  // Por defecto, es un mensaje de texto
  return {
    type: MESSAGE_TYPES.MESSAGE,
    content: content
  };
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
      container.innerHTML = `
        <div class="error-message">
          <i class='bx bx-error'></i>
          <p>No se pudo extraer el código del diagrama Mermaid</p>
        </div>
      `;
      return;
    }
    
    // Texto antes del primer diagrama
    if (typeof content === 'string' && mermaidDiagrams.length > 0) {
      const textBeforeFirstDiagram = extractTextAroundSpecificMermaid(content, mermaidDiagrams[0], true);
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
          import('../components/preview-panel-pdf.js')
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
      const textAfterLastDiagram = extractTextAroundSpecificMermaid(content, lastDiagram, false);
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

function renderTextMessage(container, content, role = '') {
  console.log('🔍 DEBUG: renderTextMessage iniciada', { role, contentType: typeof content });
  
  const processedContent = detectMultimodalContent(content, role === 'ai');

  if (processedContent !== content && typeof processedContent === 'string') {
    container.innerHTML = processedContent;
    
    if (processedContent.includes('file-name-clickable')) {
      initializeFileAttachmentHandlers(container);
    }
    
    setTimeout(() => {
      const multimodalText = container.textContent || container.innerHTML || '';
      if (containsMathExpressions(multimodalText)) {
        console.log('🔍 [MULTIMODAL] Inicializando MathJax');
        initializeMathJaxInContent(container, {
          cacheKey: `multimodal-${Date.now()}`,
          forceRender: true
        });
      }
    }, 150);
    
    return;
  }

  const safeContent = typeof processedContent === 'string' ? processedContent : String(processedContent);

  if (containsMermaidDiagram(safeContent)) {
    renderMermaidMessage(container, safeContent);
    return;
  }

  const hasLatexContent = containsMathExpressions(safeContent);
  console.log('🔍 [RENDER-TEXT] Contenido tiene LaTeX:', hasLatexContent);

  const tableResult = detectTableInText(safeContent);
  if (tableResult.success && !safeContent.includes('```')) {
    const hasValidTableStructure = /\|\s*[-:]+\s*\|/.test(safeContent) && 
                                /^\s*\|.*\|\s*$[\r\n]+\s*\|[\s-:]+\|/m.test(safeContent);
    
    if (hasValidTableStructure) {
      container.innerHTML = tableResult.html;
      
      if (hasLatexContent) {
        setTimeout(() => {
          initializeMathJaxInContent(container, {
            cacheKey: `table-${Date.now()}`,
            forceRender: true
          });
        }, 100);
      }
      
      setTimeout(() => {
        addExpandButton(container, {
          content: tableResult.html,
          title: 'Tabla de datos',
          type: 'table'
        });
      }, 0);
      
      return;
    }
  }

  if (safeContent.includes('```')) {
    const codeResult = detectAndProcessCode(safeContent);
    if (codeResult.success) {
      container.innerHTML = codeResult.html;
      setupCodeBlocksInteractivity(container);
      
      setTimeout(() => {
        if (!container.querySelector('.expand-content-btn') && !container.querySelector('.mermaid-diagram')) {
          addExpandButton(container, {
            content: container.innerHTML,
            title: 'Bloques de código',
            type: 'code'
          });
        }
      }, 0);
      
      if (hasLatexContent) {
        setTimeout(() => {
          initializeMathJaxInContent(container, {
            cacheKey: `code-math-${Date.now()}`,
            forceRender: true
          });
        }, 150);
      }
      
      return;
    }
  }

  const hasImages = safeContent.includes('![') || safeContent.includes('<img');

  if (hasLatexContent) {
    const htmlContent = parseMarkdownToHTML(safeContent);
    container.innerHTML = `<div class="math-content" data-has-math="true">${htmlContent}</div>`;
    
    setTimeout(() => {
      console.log('🔍 [RENDER-TEXT] Iniciando MathJax para texto con LaTeX');
      initializeMathJaxInContent(container, { 
        cacheKey: `text-math-${Date.now()}`,
        forceRender: true,
        timeout: 10000
      }).then(() => {
        console.log('✅ [RENDER-TEXT] MathJax completado en texto');
      }).catch(error => {
        console.error('❌ [RENDER-TEXT] Error MathJax:', error);
      });
    }, 200);
    
  } else {
    // Sin matemáticas, proceso normal
    container.innerHTML = parseMarkdownToHTML(safeContent);
  }
  
  if (hasImages && !container.querySelector('.multimodal-container .chat-image-item')) {
    setTimeout(() => {
      initializeImagePreviewHandlersOptimized(container);
      
      const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
      if (externalImages.length > 0) {
        processExternalImagesRealTime(container, externalImages);
      }
    }, hasLatexContent ? 400 : 100);
  }
}

/**
 * Configura la interactividad de los bloques de código
 * @param {HTMLElement} container - Contenedor con bloques de código
 */
function setupCodeBlocksInteractivity(container) {
  if (window.hljs) {
    container.querySelectorAll('pre code').forEach(block => {
      try {
        window.hljs.highlightElement(block);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  container.querySelectorAll('.copy-button').forEach(button => {
    addEvent(button, 'click', () => {
      const blockId = button.getAttribute('data-target');
      const codeBlock = document.getElementById(blockId);
      if (codeBlock) {
        const codeElement = codeBlock.querySelector('code');
        const textToCopy = codeElement.textContent;

        copyToClipboard(textToCopy, { button });
      }
    });
  });

  const hasMermaidDiagram = container.querySelector('.mermaid-diagram') !== null;
  
  if (!container.querySelector('.expand-content-btn') && !hasMermaidDiagram) {
    addExpandButton(container, {
      content: container.innerHTML,
      title: 'Bloques de código',
      type: 'code'
    });
  }
}

/**
 * Añade un botón de expansión para cualquier tipo de contenido
 * @param {HTMLElement} container - Contenedor donde añadir el botón
 * @param {Object} data - Datos del contenido a expandir
 * @param {string} [explicitType] - Tipo de contenido (opcional, como parámetro separado)
 */
function addExpandButton(container, data, explicitType) {
  // Verificación extra del contenedor
  if (!container || typeof container.appendChild !== 'function') {
    return;
  }

  // Evitar añadir botón si ya existe
  if (container.querySelector('.expand-content-btn')) {
    return;
  }

  const hasImages = container.querySelector('img') || 
                   container.innerHTML.includes('<img') || 
                   container.innerHTML.includes('![') ||
                   container.querySelector('.image-preview') ||
                   container.querySelector('.markdown-image');
  
  if (hasImages) {
    return; // No agregar botón si hay imágenes
  }

  // Esto permite compatibilidad con ambos formatos de llamada
  const type = explicitType || data.type || 'unknown';

  // Configuración según tipo de contenido
  const buttonConfig = {
    code: { text: 'Ver código completo', class: 'code-expand-btn' },
    table: { text: 'Ver tabla completa', class: 'table-expand-btn' },
    exam: { text: 'Ver examen completo', class: 'exam-expand-btn' },
    document: { text: 'Ver documento completo', class: 'document-expand-btn' }
  };

  const config = buttonConfig[type] || { text: 'Ver completo', class: '' };

  const expandButton = createElement('button', {
    className: `expand-content-btn ${config.class}`,
    style: {
      display: 'block',
      marginTop: '10px'
    }
  });

  const icon = createElement('i', { className: 'bx bx-expand-alt' });
  expandButton.appendChild(icon);
  expandButton.appendChild(document.createTextNode(` ${config.text}`));

  const dataKey = type === 'table' ? 'tableContent' :
    type === 'code' ? 'codeContent' : 'content';

  const previewData = {
    [dataKey]: data.content,
    title: data.title || config.text
  };

  addEvent(expandButton, 'click', () => {
    const isPanelOpen = document.querySelector('#preview-panel')?.classList.contains('open');

    if (isPanelOpen) {
      // Si está abierto, cerrarlo
      if (typeof window.closePreviewPanel === 'function') {
        window.closePreviewPanel();
      } else {
        import('../components/preview-panel-pdf.js')
          .then(module => {
            if (typeof module.closePreviewPanel === 'function') {
              module.closePreviewPanel();
            }
          })
          .catch(() => {
            // Error silencioso
          });
      }
    } else {
      // Si está cerrado, abrirlo
      if (typeof window.showPreviewPanel === 'function') {
        window.showPreviewPanel(previewData, type);
      } else {
        import('../components/preview-panel-pdf.js')
          .then(module => {
            if (typeof module.showPreviewPanel === 'function') {
              module.showPreviewPanel(previewData, type);
            }
          })
          .catch(() => {
            // Error silencioso
          });
      }
    }
  });

  container.appendChild(expandButton);
}

/**
 * Renderiza un mensaje de examen
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos del examen
 */
function renderExamMessage(container, content) {
  clearElement(container);
  const examContainer = createElement('div', { className: 'exam-container' });
  container.appendChild(examContainer);
  container.setAttribute('data-contains-exam', 'true');

  try {
    // Simplificación: usar los datos directamente sin exceso de procesamiento
    renderExam(content, examContainer);
    addExpandButton(container, {
      content: content,
      title: 'Examen completo',
      type: 'exam'
    });
    
    initializeMathJaxInContent(container);
  } catch (error) {
    renderErrorContent(examContainer, 'Error al cargar el examen', error.message);
  }
}

/**
 * Renderiza un mensaje de código con resaltado de sintaxis
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object|string} content - Contenido con código y lenguaje
 */
function renderCodeMessage(container, content) {
  try {
    const codeData = normalizeCodeContent(content);

    if (!codeData.code.trim()) {
      renderErrorContent(container, 'No se proporcionó código para renderizar');
      return;
    }

    container.innerHTML = createCodeBlockHTML(codeData.code, codeData.language);

    setupCodeBlockHighlighting(container);

    const copyBtn = container.querySelector('.copy-button');
    if (copyBtn) {
      addEvent(copyBtn, 'click', () => {
        copyToClipboard(codeData.code, { button: copyBtn });
      });
    }

    addExpandButton(container, {
      content: codeData,
      title: `Código ${codeData.language}`,
      type: 'code'
    });
    
    if (codeData.code.includes('$') || codeData.code.includes('\\(') || codeData.code.includes('\\[')) {
      initializeMathJaxInContent(container);
    }

  } catch (error) {
    renderErrorContent(container, 'Error al renderizar el código', error.message);
  }
}

/**
 * Normaliza el contenido de código a un formato estándar
 * @param {Object|string} content - Contenido a normalizar
 * @returns {Object} Objeto con code y language normalizados
 */
function normalizeCodeContent(content) {
  let code = '';
  let language = 'javascript';

  // Caso 1: Objeto con propiedades code y language
  if (typeof content === 'object' && content !== null) {
    code = content.code || '';
    language = content.language || 'javascript';
  }
  // Caso 2: String directo
  else if (typeof content === 'string') {
    code = content;

    // Detección automática de lenguaje
    if (content.includes('function') || content.includes('const ') || content.includes('let ')) {
      language = 'javascript';
    } else if (content.includes('def ') || content.includes('import ') || content.includes('class ')) {
      language = 'python';
    } else if (content.includes('<html') || content.includes('<div') || content.includes('</')) {
      language = 'html';
    } else if (content.includes('SELECT ') || content.includes('FROM ') || content.includes('WHERE ')) {
      language = 'sql';
    }
  }

  if (code.startsWith('```') && code.endsWith('```')) {
    try {
      const firstLineEnd = code.indexOf('\n');
      const languageSpec = code.substring(3, firstLineEnd).trim();
      if (languageSpec) language = languageSpec;
      code = code.substring(firstLineEnd + 1, code.length - 3).trim();
    } catch (e) {
      // Error silencioso
    }
  }

  return { code, language };
}

/**
 * Configura el resaltado de código
 * @param {HTMLElement} container - Contenedor con bloques de código
 */
function setupCodeBlockHighlighting(container) {
  requestAnimationFrame(() => {
    const codeElement = container.querySelector('pre code');
    if (codeElement && window.hljs) {
      try {
        window.hljs.highlightElement(codeElement);
      } catch (e) {
        // Error silencioso
      }
    }
  });
}

function renderTableMessage(container, content) {
  try {
    const tableData = processTableData(content);

    if (tableData) {
      container.innerHTML = tableData.html;
      container.setAttribute('data-contains-table', 'true');
      container.setAttribute('data-has-math', 'true');
      
      setTimeout(() => {
        const tableText = container.textContent || container.innerHTML || '';
        if (containsMathExpressions(tableText)) {
          console.log('🔍 [TABLE] Inicializando MathJax en tabla');
          
          initializeMathJaxInContent(container, { 
            cacheKey: `table-math-${Date.now()}`,
            forceRender: true,
            timeout: 10000
          }).then(() => {
            console.log('✅ [TABLE] MathJax completado en tabla');
          }).catch(error => {
            console.error('❌ [TABLE] Error MathJax en tabla:', error);
          });
        }
      }, 100);

      // Botón de expansión
      addExpandButton(container, {
        content: tableData.html,
        title: tableData.caption || 'Tabla de datos',
        type: 'table'
      });
      
    } else {
      renderErrorContent(container, 'No se pudo renderizar la tabla');
    }
  } catch (error) {
    console.error('❌ [TABLE] Error:', error);
    renderErrorContent(container, 'Error al renderizar la tabla', error.message);
  }
}

/**
 * Procesa diferentes formatos de datos de tabla y los normaliza
 * @param {Object|string} content - Contenido a procesar
 * @returns {Object|null} Objeto con html y caption, o null si falla
 */
function processTableData(content) {
  // Caso 1: Estructura correcta con headers y rows
  if (content && typeof content === 'object' && Array.isArray(content.headers) && Array.isArray(content.rows)) {
    return {
      html: createTableHTML(content.headers, content.rows),
      caption: content.caption || 'Tabla de datos'
    };
  }

  // Caso 2: Objeto con datos anidados
  if (typeof content === 'object' && content !== null) {
    if (content.data && typeof content.data === 'object' &&
      Array.isArray(content.data.headers) && Array.isArray(content.data.rows)) {
      return {
        html: createTableHTML(content.data.headers, content.data.rows),
        caption: content.data.caption || 'Tabla de datos'
      };
    }

    if (content.table && typeof content.table === 'object' &&
      Array.isArray(content.table.headers) && Array.isArray(content.table.rows)) {
      return {
        html: createTableHTML(content.table.headers, content.table.rows),
        caption: content.table.caption || 'Tabla de datos'
      };
    }

    // Objeto plano
    if (Object.keys(content).length > 0) {
      const headers = Object.keys(content);
      const rows = [Object.values(content)];

      return {
        html: createTableHTML(headers, rows),
        caption: "Datos"
      };
    }
  }

  // Caso 3: String (markdown o JSON)
  if (typeof content === 'string') {
    try {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        const parsed = JSON.parse(content);
        return processTableData(parsed); // Llamada recursiva
      }
    } catch (e) {
      const tableResult = detectTableInText(content);
      if (tableResult.success) {
        return {
          html: tableResult.html,
          caption: 'Tabla de datos'
        };
      }
    }
  }

  return null;
}

function renderImageMessage(container, content) {

  try {
    const imageData = typeof content === 'string' ? JSON.parse(content) : content;

    const imageUrl = imageData.url || '';
    const altText = imageData.caption || 'Imagen generada';
    const originalUrl = imageData.originalUrl || '';
    const isLocallyStored = imageData.locallyStored === true;

    if (!imageUrl) {
      acadelError(
        "URL de imagen no disponible", 
        "Acadel no pudo encontrar la dirección de la imagen. ¿Se perdió en el ciberespacio?"
      );
      renderErrorContent(container, 'No se pudo cargar la imagen: URL no disponible');
      return;
    }

    const safeImageUrl = sanitizeText(imageUrl);
    const safeOriginalUrl = originalUrl ? sanitizeText(originalUrl) : '';

    const html = `
      <div class="multimodal-container">
        <div class="multimodal-attachments">
          <div class="image-previews">
            <div class="image-preview">
              <img src="${safeImageUrl}" 
                   alt="${altText}" 
                   class="markdown-image ${isLocallyStored ? 'stored-image' : 'external-image'}" 
                   data-original-src="${safeImageUrl}" 
                   ${originalUrl ? `data-backup-src="${safeOriginalUrl}"` : ''}
                   ${isLocallyStored ? '' : 'data-needs-storage="true"'}
                   loading="lazy" />
              <div class="image-overlay">
                <i class="bx bx-expand"></i>
              </div>
              <div class="image-placeholder" style="display:none">
                <i class="bx bx-image"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const imgContainer = container.querySelector('.image-preview');
    const imgElement = container.querySelector('.markdown-image');
    
    if (imgContainer && imgElement) {
      // Evento de clic para abrir modal
      addEvent(imgContainer, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.showFullImage === 'function') {
          window.showFullImage(imgElement.getAttribute('data-original-src') || safeImageUrl);
        }
      });
      
      // Evento de carga exitosa
      addEvent(imgElement, 'load', () => {
        imgElement.classList.add('loaded');
        const placeholder = imgContainer.querySelector('.image-placeholder');
        if (placeholder) placeholder.style.display = 'none';
      });

      addEvent(imgElement, 'error', () => {
        // Si tenemos URL original como respaldo y es diferente de la URL actual
        const backupSrc = imgElement.getAttribute('data-backup-src');
        if (backupSrc && backupSrc !== imgElement.src) {
          console.log('🦫 Acadel: La imagen local falló, intentando con URL original:', backupSrc);
          imgElement.src = backupSrc;
          return;
        }

        imgElement.style.display = 'none';
        const placeholder = imgContainer.querySelector('.image-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        
        acadelWarning(
          "👻 Imagen fantasma detectada", 
          "Acadel no pudo cargar la imagen. Parece que se volvió invisible."
        );
        
        if (originalUrl && !isLocallyStored) {
          console.log('🦫 Acadel: Intentando guardar imagen externamente inmediatamente...');
          processExternalImagesRealTime(container);
        }
      });
    }

    initializeImagePreviewHandlersOptimized(container);

    // Si la imagen es externa, intentar guardarla localmente INMEDIATAMENTE
    if (!isLocallyStored) {
      console.log('🖼️ [IMAGE] Procesando imagen DALL-E INMEDIATAMENTE');
      processExternalImagesRealTime(container);
    }
  } catch (error) {
    acadelError(
      "Error procesando imagen", 
      `Acadel tuvo problemas con la imagen: ${error.message}`
    );
    renderErrorContent(container, 'Error al mostrar la imagen', error.message);
  }
}

/**
 * Renderiza un mensaje de error para chat de documentos (sin botón reintentar)
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Objeto con mensaje de error y mensaje original
 */
function renderErrorMessage(container, content) {
    const errorMessage = content.errorMessage || 'Error desconocido';
    
    const documentErrorMessages = [
        "🦫 ¡Ups! Mi escáner de documentos peludo tuvo problemas leyendo tu archivo. ¡Como cuando el PDF está protegido con contraseña!",
        "🦫 Mi analizador académico se trabó como estudiante leyendo letra manuscrita. ¡Pero tranquilo, es temporal!",
        "🦫 Error detectado en mi motor de búsqueda capibarina. Es como cuando la función 'Buscar' no encuentra lo obvio...",
        "🦫 ¡Rayos! Mi indexador de contenido tuvo una crisis existencial. ¡Típico de sistemas que procesan mucha información!",
        "🦫 Mi biblioteca digital necesita un momento de reorganización. Como cuando tienes 1000 PDFs sin nombre coherente...",
        "🦫 ¡Oops! Mi extractor de texto peludo dice 'formato no compatible'. Los archivos a veces son caprichosos..."
    ];
    
    const documentTips = [
        "Verifica que tu documento esté en un formato compatible (PDF, DOCX, TXT)",
        "Intenta con una consulta más específica o usa palabras clave diferentes",
        "Asegúrate de que el archivo no esté corrupto o protegido",
        "Prueba dividiendo tu pregunta en partes más pequeñas",
        "Revisa si el documento contiene texto seleccionable (no solo imágenes)",
        "¿Qué tal si intentas subir el archivo de nuevo?"
    ];
    
    const randomMessage = documentErrorMessages[Math.floor(Math.random() * documentErrorMessages.length)];
    const randomTip = documentTips[Math.floor(Math.random() * documentTips.length)];
    
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
    
    const icon = createElement('i', { className: 'bx bx-file-blank' });
    icon.style.fontSize = '1.3rem';
    icon.style.color = '#e74c3c';
    errorContainer.appendChild(icon);
    
    const errorSpan = createElement('span', {}, '🦫 Problema en la biblioteca digital');
    errorContainer.appendChild(errorSpan);
    
    const errorDetails = createElement('div', { className: 'cancelled-details' });
    errorDetails.style.fontSize = '0.85rem';
    errorDetails.style.color = '#888';
    errorDetails.style.margin = '8px 0 0 20px';
    
    const messageParagraph = createElement('p', {});
    messageParagraph.innerHTML = randomMessage;
    errorDetails.appendChild(messageParagraph);
    
    const suggestionParagraph = createElement('p', {});
    suggestionParagraph.innerHTML = `💡 <strong>Consejo del Bibliotecario Acadel:</strong> ${randomTip}`;
    errorDetails.appendChild(suggestionParagraph);
    
    const motivationParagraph = createElement('p', {});
    const documentMotivations = [
        '📚 ¡La investigación académica continúa! Cada archivo es una nueva aventura de conocimiento',
        '🔍 ¡La búsqueda de información no se detiene! Sigamos explorando tus documentos',
        '📖 ¡El aprendizaje digital sigue! ¿Qué tal si probamos con otro enfoque?',
        '💾 ¡Los datos siguen ahí! Solo necesitamos encontrar la manera correcta de acceder',
        '📑 ¡Tu biblioteca digital te espera! Vamos a encontrar esa información juntos'
    ];
    const randomMotivation = documentMotivations[Math.floor(Math.random() * documentMotivations.length)];
    motivationParagraph.innerHTML = randomMotivation;
    errorDetails.appendChild(motivationParagraph);
    
    container.appendChild(errorContainer);
    container.appendChild(errorDetails);
    
    if (window.acadelInfo) {
        acadelInfo(
            "🦫 Pausa en el procesamiento",
            "Acadel está reorganizando su sistema de archivos peludos"
        );
    }
}

/**
 * Renderiza un error genérico en un contenedor
 * @param {HTMLElement} container - Contenedor donde mostrar el error
 * @param {string} title - Título del error
 * @param {string} details - Detalles adicionales (opcional)
 */
function renderErrorContent(container, title, details = '') {
  const errorClass = container.className.includes('code') ? 'code-error' :
    container.className.includes('table') ? 'table-error' :
        container.className.includes('image') ? 'image-error' : 'error-content';

  const errorContainer = createElement('div', { className: errorClass });

  const icon = createElement('i', { className: 'bx bx-error' });
  errorContainer.appendChild(icon);

  const titleElem = createElement('p', {}, sanitizeText(title));
  errorContainer.appendChild(titleElem);

  if (details) {
    const detailsElem = createElement('p', { className: 'error-details' }, sanitizeText(details));
    errorContainer.appendChild(detailsElem);
  }

  clearElement(container);
  container.appendChild(errorContainer);
}

/**
 * Renderiza un mensaje de carga
 * @param {HTMLElement} container - Contenedor del mensaje
 */
function renderLoadingMessage(container) {
  const loader = createElement('div', { className: 'typing-loader' });
  clearElement(container);
  container.appendChild(loader);
}

/**
 * Renderiza un mensaje tipo alerta/notificación
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos para la alerta
 */
function renderAlertMessage(container, content) {
  const type = content.type || 'info';
  const message = content.message || '';
  const title = content.title || '';

  const alertTypes = {
    info: { icon: 'bx-info-circle', class: 'info-alert' },
    warning: { icon: 'bx-error', class: 'warning-alert' },
    success: { icon: 'bx-check-circle', class: 'success-alert' },
    error: { icon: 'bx-x-circle', class: 'error-alert' }
  };

  const alertInfo = alertTypes[type] || alertTypes.info;

  const alertMessage = createElement('div', { className: `alert-message ${alertInfo.class}` });

  const alertIcon = createElement('div', { className: 'alert-icon' });
  const icon = createElement('i', { className: `bx ${alertInfo.icon}` });
  alertIcon.appendChild(icon);

  const alertContent = createElement('div', { className: 'alert-content' });

  if (title) {
    const titleElem = createElement('h4', { className: 'alert-title' }, `🦫 Acadel ${type === 'info' ? 'informa' : type === 'warning' ? 'advierte' : type === 'success' ? 'celebra' : 'reporta'}: ${sanitizeText(title)}`);
    alertContent.appendChild(titleElem);
  }

  const messageElem = createElement('p', {}, sanitizeText(message));
  alertContent.appendChild(messageElem);

  alertMessage.appendChild(alertIcon);
  alertMessage.appendChild(alertContent);

  clearElement(container);
  container.appendChild(alertMessage);

  const notificationMap = {
    info: () => acadelInfo("ℹ️ Información", message),
    warning: () => acadelWarning("⚠️ Advertencia", message),
    success: () => acadelExito("✅ Éxito", message),
    error: () => acadelError("❌ Error", message)
  };

  if (notificationMap[type]) {
    notificationMap[type]();
  }
}

/**
 * Renderiza un mensaje con botones de acción
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Contenido con mensaje y botones
 */
function renderActionMessage(container, content) {
  const message = content.message || '';
  const actions = content.actions || [];

  const actionMessage = createElement('div', { className: 'action-message' });
  actionMessage.innerHTML = parseMarkdownToHTML ? parseMarkdownToHTML(message) : message;

  const actionButtons = createElement('div', { className: 'action-buttons' });

  actions.forEach(action => {
    const button = createElement('button', {
      className: 'action-button',
      dataset: { action: action.id }
    }, `🎯 ${sanitizeText(action.label)}`);

    addEvent(button, 'click', (e) => {
      acadelInfo(
        "🎯 Acción ejecutada", 
        `Acadel está procesando: ${action.label}`
      );

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

    actionButtons.appendChild(button);
  });

  actionMessage.appendChild(actionButtons);

  clearElement(container);
  container.appendChild(actionMessage);

  acadelInfo(
    "🎯 Acciones disponibles", 
    `Acadel tiene ${actions.length} acción(es) disponible(s) para ti`
  );
}

/**
 * Renderiza todos los mensajes de un chat con ordenamiento mejorado.
 * @param {Array} messages - Array de mensajes.
 */
export function renderChatMessages(messages) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return;

  ensureRenderersInitialized();
  clearElement(chatMessages);

  if (!messages || messages.length === 0) {
    acadelInfo(
      "💬 Chat vacío", 
      "Acadel está listo para una nueva conversación. ¡Pregúntame lo que quieras!"
    );
    return;
  }

  const messagesWithMetadata = [...messages].map((msg, index) => {
    return {
      originalIndex: index,
      message: msg,
      timestamp: getMessageTimestamp(msg),
      role: (msg.role || '').toLowerCase()
    };
  });

  const sortedMessages = messagesWithMetadata.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      const timeDiff = a.timestamp - b.timestamp;
      // Si la diferencia es muy pequeña (menos de 1 segundo),
      // preservar el orden lógico (primero user, luego assistant)
      if (Math.abs(timeDiff) < 1000) {
        if (a.role === 'user' && b.role === 'assistant') {
          return -1; // El mensaje del usuario va primero
        } else if (a.role === 'assistant' && b.role === 'user') {
          return 1; // El mensaje del asistente va después
        }
      }
      return timeDiff;
    }

    // Si solo uno tiene timestamp
    if (a.timestamp) return -1;
    if (b.timestamp) return 1;

    // Si ninguno tiene timestamp, preservar el orden original
    return a.originalIndex - b.originalIndex;
  });

  // Variable para trackear el último mensaje renderizado
  let lastMessageElement = null;

  sortedMessages.forEach(item => {
    try {
      const msg = item.message;
      const role = msg.role?.toLowerCase();
      const isAI = role === 'assistant' || role === 'ai';

      let contentToRender = msg.content || msg.message || '';
      let typeToUse = MESSAGE_TYPES.MESSAGE;

      if (typeof contentToRender === 'string' &&
        (contentToRender.includes('hasImage') || contentToRender.includes('imageCount') || 
         contentToRender.includes('Contenido del documento') || contentToRender.includes('Código de'))) {
        const processedContent = detectMultimodalContent(contentToRender, isAI);
        if (processedContent !== contentToRender) {
          contentToRender = processedContent;
        } else {
          const { type, content } = determineMessageType(contentToRender);
          typeToUse = type;
          contentToRender = content;
        }
      } else {
        const { type, content } = determineMessageType(contentToRender);
        typeToUse = type;
        contentToRender = content;
      }

      lastMessageElement = addMessageToChat(isAI ? 'ai' : 'user', contentToRender, typeToUse);

      if (lastMessageElement && msg.id) {
        lastMessageElement.dataset.serverId = msg.id;

        // Mantener también un ID en formato frontend para compatibilidad
        const prefix = isAI ? 'ai-msg' : 'user-msg';
        const timestamp = new Date().getTime();
        lastMessageElement.dataset.messageId = `${prefix}-${timestamp}-${msg.id}`;
      }
    } catch (error) {
      // Error silencioso para mantener la continuidad
      console.error("🦫 Acadel: Error procesando mensaje:", error);
    }
  });

  // Asegurar que los feedback (likes/dislikes) se mantengan
  ensureFeedbackPersistence(true);

  setManagedTimeout(() => {
    document.querySelectorAll('.message-content').forEach(messageContent => {
      cleanMultimodalExistingContent(messageContent);
    });
    
    document.querySelectorAll('.math-content, [data-has-math="true"]').forEach(elem => {
      const container = elem.closest('.message-content');
      if (container) {
        initializeMathJaxInContent(container);
      }
    });
  }, 300, 'cleanup-messages-after-render');
}

/**
 * Función auxiliar para obtener el timestamp del mensaje
 * @param {Object} msg - Mensaje a procesar
 * @returns {Date|null} - Timestamp como Date o null si no existe
 */
function getMessageTimestamp(msg) {
  // Diferentes posibles nombres para el campo de timestamp
  const possibleFields = ['timestamp', 'created_at', 'time', 'date', 'createdAt'];

  for (const field of possibleFields) {
    if (msg[field]) {
      try {
        return new Date(msg[field]);
      } catch (e) {
      }
    }
  }

  return null;
}

/**
 * Agrega un mensaje al área de chat.
 * @param {string} role - 'user' o 'ai'.
 * @param {string|Object} content - Contenido del mensaje.
 * @param {string} type - Tipo de mensaje ('message', 'exam', etc.).
 * @returns {HTMLElement} El elemento del mensaje creado.
 */
export function addMessageToChat(role, content, type = MESSAGE_TYPES.MESSAGE) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return null;

  ensureRenderersInitialized();

  const messageDiv = createElement('div', {
    className: `message ${role === 'ai' ? 'ai-message' : 'user-message'}`
  });

  if (role === 'ai') {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    messageDiv.dataset.messageId = messageId;

    // Estructura para mensajes de la IA
    const aiProfile = createElement('div', { className: 'ai-profile' });
    const profileImg = createElement('img', {
      src: APP_CONFIG.assistantImagePath,
      alt: '🦫 Profesor Acadel'
    });
    aiProfile.appendChild(profileImg);

    const contentElem = createElement('div', { className: 'message-content' });

    messageDiv.appendChild(aiProfile);
    messageDiv.appendChild(contentElem);

    const renderer = getRenderer(type);
    renderer(contentElem, content, role);
  } else {
    // Mensajes de usuario con soporte para markdown
    const safeContent = typeof content === 'string' ? content : String(content);

    const contentDiv = createElement('div', { className: 'message-content' });
    const textDiv = createElement('div', { className: 'message-text' });
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);

    if (typeof parseMarkdownToHTML === 'function') {
      textDiv.innerHTML = parseMarkdownToHTML(safeContent);
    } else {
      textDiv.innerHTML = sanitizeText(safeContent).replace(/\n/g, '<br data-nl="true">');

      import('../utils/markdown-pdf.js').then(module => {
        if (module && module.parseMarkdownToHTML) {
          textDiv.innerHTML = module.parseMarkdownToHTML(safeContent);
        }
      }).catch(() => {
        // Error silencioso - continuar con el fallback
      });
    }
    
    if (typeof containsMathExpressions === 'function' && containsMathExpressions(safeContent)) {
      initializeMathJaxInContent(contentDiv);
    }
  }

  chatMessages.appendChild(messageDiv);
  return messageDiv;
}

/**
 * Crea un mensaje de carga (loading) con la nube de pensamiento
 * @returns {HTMLElement} Elemento de mensaje con loader y nube de pensamiento
 */
export function createLoadingMessage() {
  const loader = createElement('div', { className: 'message ai-message processing' });
  loader.setAttribute('data-is-loading', 'true');

  // Implementar la nube de pensamiento y la imagen especial de "pensando"
  const aiProfile = createElement('div', { className: 'ai-profile thinking' });
  const img = createElement('img', {
    src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    alt: "🦫 Profesor Acadel"
  });
  aiProfile.appendChild(img);

  const messageContent = createElement('div', { className: 'message-content' });
  const thoughtBubble = createElement('div', { className: 'thought-bubble' });
  const thoughtBubbles = createElement('div', { className: 'thought-bubbles' });

  for (let i = 0; i < 3; i++) {
    thoughtBubbles.appendChild(createElement('div', { className: 'thought-bubble-dot' }));
  }

  thoughtBubble.appendChild(thoughtBubbles);
  messageContent.appendChild(thoughtBubble);

  loader.appendChild(aiProfile);
  loader.appendChild(messageContent);

  return loader;
}

/**
 * Reemplaza el mensaje de carga por la respuesta.
 * @param {HTMLElement} loader - Elemento loader.
 * @param {string|Object} content - Respuesta del servidor.
 * @param {string} type - Tipo de contenido.
 */
export function replaceLoadingMessage(loader, content, type = MESSAGE_TYPES.MESSAGE) {
  if (!loader) return;

  ensureRenderersInitialized();

  const profileElement = loader.querySelector('.ai-profile');
  if (profileElement) {
    profileElement.classList.remove('thinking');
  }

  loader.classList.remove('processing');

  const contentElem = loader.querySelector('.message-content');
  if (!contentElem) return;

  clearElement(contentElem);

  const renderer = getRenderer(type);
  renderer(contentElem, content, 'ai');

  setTimeout(() => {
    const renderedText = contentElem.textContent || contentElem.innerHTML || '';
    if (containsMathExpressions(renderedText)) {
      console.log('🔍 [REPLACE] Detectado contenido matemático, inicializando MathJax');
      
      initializeMathJaxInContent(contentElem, { 
        cacheKey: `replace-math-${Date.now()}`,
        forceRender: true,
        timeout: 10000
      }).then(() => {
        console.log('✅ [REPLACE] MathJax completado en mensaje reemplazado');
      }).catch(error => {
        console.error('❌ [REPLACE] Error MathJax:', error);
      });
    }
    
    // Highlight.js
    if (window.hljs) {
      contentElem.querySelectorAll('pre code').forEach(block => {
        try {
          window.hljs.highlightElement(block);
        } catch (e) {
          console.warn('Error en highlight:', e);
        }
      });
    }
  }, 150);

  // Efectos visuales
  loader.classList.add('rendered');
  setTimeout(() => loader.classList.remove('rendered'), 30);

  // Botones de interacción
  initializeInteractionAndScroll(loader);
}

function initializeInteractionAndScroll(messageElement) {
  setManagedTimeout(() => {
    import('../utils/response-interaction-pdf.js').then(module => {
      if (typeof module.initResponseInteraction === 'function') {
        const interaction = module.initResponseInteraction();
        if (messageElement && !messageElement.querySelector('.response-actions')) {
          interaction.addInteractionButtons(messageElement);
        }
      }
    }).catch(() => {
      // Error silencioso
    });
  }, 50, `init-interaction-${messageElement?.dataset?.messageId || Date.now()}`);
}

/**
 * Reemplaza el mensaje de carga con un mensaje de error para chat de documentos
 * @param {HTMLElement} loadingMessage - Elemento de mensaje de carga
 * @param {string} errorMessage - Mensaje de error
 * @param {string} originalQuery - Consulta original (opcional)
 */
export function replaceWithError(loadingMessage, errorMessage, originalQuery = '') {
    if (!loadingMessage) return;
    
    if (window.tempChatIdForFiles) {
      window.tempChatIdForFiles = null;
      console.log(`🧹 Chat temporal limpiado por error en respuesta`);
    }
    
    const getDocumentErrorMessage = (error) => {
        const errorLower = error.toLowerCase();
        
        if (errorLower.includes('network') || errorLower.includes('conexión') || errorLower.includes('connection')) {
            return "🦫 ¡Mi conexión con la biblioteca digital está más perdida que una cita bibliográfica sin página! Los documentos y yo tenemos una relación complicada...";
        }
        if (errorLower.includes('timeout') || errorLower.includes('tiempo')) {
            return "🦫 Me quedé buscando tanto en tus documentos que el tiempo se agotó. ¡Como cuando intentas encontrar esa referencia específica en 500 páginas!";
        }
        if (errorLower.includes('server') || errorLower.includes('servidor')) {
            return "🦫 El servidor está más saturado que una biblioteca en época de exámenes finales. ¡Hasta las bases de datos necesitan descansos!";
        }
        if (errorLower.includes('404') || errorLower.includes('not found')) {
            return "🦫 La información se escondió mejor que un capítulo importante en un PDF sin índice. ¡El misterio académico continúa!";
        }
        
        // Mensajes genéricos para documentos
        const genericDocumentMessages = [
            "🦫 ¡Vaya! Mi escáner de documentos peludo tuvo un momento de confusión académica. ¡Como cuando el OCR lee mal el texto más importante!",
            "🦫 Error detectado en mi sistema de búsqueda capibarina. Es como cuando tu PDF favorito se corrompe justo antes del examen...",
            "🦫 Mi indexador académico necesita un momento de reorganización. ¡Hasta los mejores bibliotecarios tienen días complicados!",
            "🦫 ¡Ups! Mi motor de búsqueda peludo dice 'archivo no procesable'. Los genios documentales también necesitamos pausas..."
        ];
        
        return genericDocumentMessages[Math.floor(Math.random() * genericDocumentMessages.length)];
    };
    
    const documentAdvice = [
        "💾 Mientras tanto, ¿qué tal si organizas esos PDFs que tienes dispersos?",
        "📚 Momento perfecto para revisar el índice de tus documentos principales",
        "🔍 Aprovecha para hacer backup de tus archivos más importantes",
        "📑 ¿Has intentado buscar por palabras clave más específicas?",
        "📖 Tiempo ideal para echarle un vistazo a esos apuntes guardados",
        "💡 ¿Qué tal si reorganizas tu biblioteca digital mientras esperas?"
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
    
    const contextualMessage = getDocumentErrorMessage(errorMessage);
    const randomAdvice = documentAdvice[Math.floor(Math.random() * documentAdvice.length)];
    
    const errorContent = `
        <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(231,76,60,0.05);border-radius:8px;margin:5px 0;border-left:3px solid rgba(231,76,60,0.3);">
            <i class="bx bx-confused" style="font-size:1.3rem;color:#e74c3c;"></i>
            <span>🦫 Momento de reindexación capibarina</span>
        </div>
        <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
            <p>${contextualMessage}</p>
            <p><strong>💡 Consejo del Bibliotecario Acadel:</strong> ${randomAdvice}</p>
            <p>📚 ¡La búsqueda en documentos no se detiene por contratiempos técnicos! ¿Exploramos otro enfoque?</p>
        </div>
    `;
    
    messageContent.innerHTML = errorContent;
    
    loadingMessage.setAttribute('data-error-rendered', 'true');
    messageContent.setAttribute('data-error-content', 'true');
    
    // Forzar visibilidad
    loadingMessage.style.display = '';
    loadingMessage.style.visibility = 'visible';
    loadingMessage.style.opacity = '1';
    
    if (window.acadelInfo) {
        const documentNotifications = [
            "Acadel está reorganizando su biblioteca digital peluda",
            "El bibliotecario capibara está reindexando los documentos",
            "Acadel ajusta sus algoritmos de búsqueda académica"
        ];
        const randomNotification = documentNotifications[Math.floor(Math.random() * documentNotifications.length)];
        
        acadelInfo(
            "🦫 Pausa en la biblioteca digital",
            randomNotification
        );
    }
}

/**
 * Extrae el contenido textual de la respuesta del servidor
 * @param {Object} data - Datos de la respuesta
 * @returns {string|null} - Contenido textual o null
 */
function extractTextContent(data) {
  const textProps = ['answer', 'content', 'message', 'text', 'response'];

  for (const prop of textProps) {
    if (typeof data[prop] === 'string' && data[prop].trim()) {
      return data[prop];
    }
  }

  const nestedProps = ['data', 'result', 'output'];

  for (const prop of nestedProps) {
    if (data[prop]) {
      if (typeof data[prop] === 'string' && data[prop].trim()) {
        return data[prop];
      }

      if (typeof data[prop] === 'object' && data[prop] !== null) {
        for (const textProp of textProps) {
          if (typeof data[prop][textProp] === 'string' && data[prop][textProp].trim()) {
            return data[prop][textProp];
          }
        }
      }
    }
  }

  if (typeof data === 'object' && data !== null) {
    try {
      if (data.answer && typeof data.answer === 'object') {
        return JSON.stringify(data.answer);
      }

      if (Object.keys(data).length <= 5) {
        return JSON.stringify(data);
      }
    } catch (e) {
      // Error silencioso
    }
  }

  return null;
}

/**
 * Procesa la respuesta del servidor para determinar el tipo de mensaje y su contenido
 * @param {Object} data - Datos recibidos del servidor
 * @returns {Object} Objeto con tipo y contenido procesado
 */
export function processServerResponse(data) {
  if (!data) {
    return { type: MESSAGE_TYPES.MESSAGE, content: 'Acadel no pudo procesar la respuesta del servidor' };
  }

  if (data.type === MESSAGE_TYPES.IMAGE) {
    if (data.data) {
      return {
        type: MESSAGE_TYPES.IMAGE,
        content: data.data
      };
    }

    if (data.url) {
      return {
        type: MESSAGE_TYPES.IMAGE,
        content: data
      };
    }
  }

  if (data.type === 'conversation' && data.answer) {
    return {
      type: MESSAGE_TYPES.MESSAGE,
      content: data.answer
    };
  }

  if (data.type === MESSAGE_TYPES.EXAM) {
    let examData = null;

    if (data.exam && typeof data.exam === 'object') {
      examData = data.exam;
    }
    else if (data.data && typeof data.data === 'object') {
      examData = data.data;
    }
    else if (typeof data.exam === 'string') {
      try {
        examData = JSON.parse(data.exam);
      } catch (e) {
        // Error silencioso
      }
    }
    else if (typeof data.data === 'string') {
      try {
        examData = JSON.parse(data.data);
      } catch (e) {
        // Error silencioso
      }
    }

    // Si aún no encontramos los datos, intentar en el objeto raíz
    if (!examData && data.questions && Array.isArray(data.questions)) {
      examData = data;
    }

    // Verificación final
    if (!examData) {
      examData = {}; // Evitar errores
    }

    return {
      type: MESSAGE_TYPES.EXAM,
      content: examData
    };
  }

  const answer = data.answer || data.content || data.message || '';

  if (typeof answer === 'string' && answer.trim().startsWith('{') && answer.trim().endsWith('}')) {
    try {
      const parsedAnswer = JSON.parse(answer);

      if (parsedAnswer.type) {
        return {
          type: parsedAnswer.type,
          content: parsedAnswer
        };
      }
    } catch (error) {
      // Error silencioso
    }
  }

  // Caso por defecto
  return {
    type: data.type || MESSAGE_TYPES.MESSAGE,
    content: answer
  };
}

export function processAndRenderResponse(data, loadingMessage) {
  if (!loadingMessage || !data) return false;

  const contentElem = loadingMessage.querySelector('.message-content');
  if (!contentElem) return false;

  const profileElement = loadingMessage.querySelector('.ai-profile');
  if (profileElement) {
    profileElement.classList.remove('thinking');
  }

  if (contentElem.getAttribute('data-processed')) {
    return true;
  }
  contentElem.setAttribute('data-processed', 'true');

  let textContent = extractTextContent(data);

  if (textContent) {
    const hasMathContent = containsMathExpressions(textContent);
    console.log('🔍 [RESPONSE] Contenido con matemáticas:', hasMathContent);
    
    if (containsMermaidDiagram(textContent)) {
      clearElement(contentElem);
      renderMermaidMessage(contentElem, textContent);
      loadingMessage.classList.remove('processing');
      return true;
    }
    
    // Multimodal
    const processedContent = detectMultimodalContent(textContent);
    if (processedContent !== textContent && typeof processedContent === 'string') {
      contentElem.innerHTML = processedContent;
      loadingMessage.classList.remove('processing');
      
      if (hasMathContent) {
        setTimeout(() => {
          initializeMathJaxInContent(contentElem, {
            cacheKey: `multimodal-response-${Date.now()}`,
            forceRender: true
          });
        }, 200);
      }
      return true;
    }
    
    // Tablas (esto ya funciona)
    const tableResult = detectTableInText(textContent);
    if (tableResult.success && !textContent.includes('```')) {
      contentElem.innerHTML = tableResult.html;
      contentElem.setAttribute('data-contains-table', 'true');
      contentElem.setAttribute('data-has-math', 'true');
      
      if (hasMathContent) {
        setTimeout(() => {
          initializeMathJaxInContent(contentElem, {
            cacheKey: `response-table-${Date.now()}`,
            forceRender: true,
            timeout: 12000
          });
        }, 150);
      }
      
      addExpandButton(contentElem, {
        content: tableResult.html,
        title: 'Tabla de datos',
        type: 'table'
      });
      
      loadingMessage.classList.remove('processing');
      return true;
    }

    clearElement(contentElem);
    
    if (hasMathContent) {
      const htmlContent = parseMarkdownToHTML(textContent);
      contentElem.innerHTML = `<div class="math-content" data-has-math="true">${htmlContent}</div>`;
      
      setTimeout(() => {
        console.log('🔍 [RESPONSE-GENERAL] Iniciando MathJax para respuesta general');
        initializeMathJaxInContent(contentElem, { 
          cacheKey: `response-general-${Date.now()}`,
          forceRender: true,
          timeout: 10000
        }).then(() => {
          console.log('✅ [RESPONSE-GENERAL] MathJax completado');
        }).catch(error => {
          console.error('❌ [RESPONSE-GENERAL] Error MathJax:', error);
        });
      }, 200);
      
    } else {
      renderTextMessage(contentElem, textContent);
    }
    
    loadingMessage.classList.remove('processing');
    
    setTimeout(() => {
      const images = contentElem.querySelectorAll('img.markdown-image');
      if (images.length > 0) {
        initializeImagePreviewHandlersOptimized(contentElem);
        
        const externalImages = contentElem.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
        if (externalImages.length > 0) {
          processExternalImagesRealTime(contentElem, externalImages);
        }
      }
    }, hasMathContent ? 400 : 100);

    return true;
  }

  const { type, content } = processServerResponse(data);
  replaceLoadingMessage(loadingMessage, content, type);
  return true;
}

/**
 * Detecta y renderiza contenido estructurado (código, tablas, imágenes)
 * @param {Object} data - Datos del servidor
 * @param {HTMLElement} contentElem - Elemento donde renderizar
 * @returns {boolean} - true si se ha renderizado con éxito
 */
function detectAndRenderStructuredContent(data, contentElem) {
  if (data.type === MESSAGE_TYPES.CODE && data.code) {
    renderCodeMessage(contentElem, {
      code: data.code,
      language: data.language || 'javascript'
    });
    return true;
  }

  if (data.type === MESSAGE_TYPES.TABLE && data.headers && data.rows) {
    renderTableMessage(contentElem, data);
    return true;
  }

  if (data.type === MESSAGE_TYPES.IMAGE && (data.url || data.data)) {
    renderImageMessage(contentElem, data);
    return true;
  }

  const checkProps = ['content', 'data', 'answer', 'result'];

  for (const prop of checkProps) {
    if (data[prop] && typeof data[prop] === 'object') {
      const nestedData = data[prop];

      // Código
      if (nestedData.type === MESSAGE_TYPES.CODE && nestedData.code) {
        renderCodeMessage(contentElem, {
          code: nestedData.code,
          language: nestedData.language || 'javascript'
        });
        return true;
      }

      // Tabla
      if (nestedData.type === MESSAGE_TYPES.TABLE &&
        Array.isArray(nestedData.headers) &&
        Array.isArray(nestedData.rows)) {
        renderTableMessage(contentElem, nestedData);
        return true;
      }

      // Imagen
      if (nestedData.type === MESSAGE_TYPES.IMAGE ||
        (nestedData.url && (nestedData.caption || nestedData.prompt))) {
        renderImageMessage(contentElem, nestedData);
        return true;
      }
    }
  }

  return false;
}

/**
 * Asegura que los feedback (likes/dislikes) se mantengan al cargar el historial 
 * @param {boolean} force - Si se debe forzar la reinicialización
 */
export function ensureFeedbackPersistence(force = false) {
  const processAttempts = [300, 800, 1500]; // Tiempos en ms para intentos

  processAttempts.forEach((delay, index) => {
    setManagedTimeout(() => {
      try {
        import('../utils/response-interaction-pdf.js').then(module => {
          if (typeof module.initResponseInteraction === 'function') {
            const interaction = module.initResponseInteraction();

            if (interaction && typeof interaction.processExistingMessages === 'function') {
              interaction.processExistingMessages(true);
            }
          }
        }).catch(() => {
          // Error silencioso
        });
      } catch (e) {
        // Error silencioso
      }
    }, delay, `feedback-attempt-${index}`);
  });
}

function containsMathExpressions(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }
  
  let cleanText = text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\.(math-pending|math-rendered|MathJax)[^}]*\{[^}]*\}/g, '')
    .replace(/<[^>]*>/g, ' ')
    .trim();
  
  if (!cleanText) return false;
  
  const mathPatterns = [
    /\$[^$\n]+\$/,                    // $formula$
    /\$\$[\s\S]+?\$\$/,               // $$formula$$
    /\\\([^)]+\\\)/,                  // \(formula\)
    /\\\[[\s\S]+?\\\]/,               // \[formula\]
    /\\(?:frac|sqrt|sum|int|lim|begin|end|alpha|beta|gamma|theta|pi|sigma|mu|delta|nabla|infty)\b/,
    /(?:sin|cos|tan|log|ln|exp)\s*[\(\[{]/, // funciones matemáticas con paréntesis
    /\^[\{]?[^\s\}]+[\}]?/,           // exponentes
    /_[\{]?[^\s\}]+[\}]?/,            // subíndices
    /\\[a-zA-Z]+[\{\s]/               // comandos LaTeX genéricos
  ];
  
  const hasMatch = mathPatterns.some(pattern => pattern.test(cleanText));
  
  if (hasMatch) {
    console.log('🔍 [MATH-DETECT] LaTeX encontrado:', {
      text: cleanText.substring(0, 150),
      patterns: mathPatterns.map(p => p.test(cleanText))
    });
  }
  
  return hasMatch;
}


function setupImagePreviewSystem() {
  if (window._imagePreviewSystemConfigured) return;
  window._imagePreviewSystemConfigured = true;
  
  // 1. Configurar delegación de eventos en el contenedor de mensajes
  const chatMessagesContainer = document.querySelector('.chat-messages');
  if (!chatMessagesContainer) {
    console.warn('🦫 Acadel: No se encontró el contenedor de mensajes para configurar vistas previas de imágenes');
    return;
  }
  
  chatMessagesContainer.addEventListener('click', function(e) {
    const imgTarget = e.target.closest('.image-preview img') || 
                      e.target.closest('.markdown-image') ||
                      e.target.closest('.multimodal-container img') ||
                      e.target.closest('.markdown-image-container') ||
                      e.target.closest('.chat-image-item');
                      
    if (imgTarget) {
      e.preventDefault();
      e.stopPropagation();
      
      let imageSrc;
      
      // Caso 1: Imagen de archivo adjunto del usuario
      if (imgTarget.classList && imgTarget.classList.contains('chat-image-item')) {
        const img = imgTarget.querySelector('img');
        if (img) {
          imageSrc = img.getAttribute('data-original-src') || img.src;
        }
      }
      // Caso 2: Imagen directa
      else if (imgTarget.tagName === 'IMG') {
        imageSrc = imgTarget.getAttribute('data-original-src') || imgTarget.src;
      }
      // Caso 3: Contenedor de imagen
      else {
        const img = imgTarget.querySelector('img.markdown-image') || imgTarget.querySelector('img');
        if (img) {
          imageSrc = img.getAttribute('data-original-src') || img.src;
        }
      }
      
      if (imageSrc && typeof window.showFullImage === 'function') {
        console.log('🦫 Acadel: Abriendo imagen:', imageSrc);
        window.showFullImage(imageSrc);
      }
    }
  });
  
  console.log('🦫 Acadel: Sistema de vista previa de imágenes configurado correctamente');
}

window.showMermaidPreview = function(button) {
  const code = button.getAttribute('data-code');
  const diagramId = button.getAttribute('data-diagram-id');
  const title = document.querySelector(`#${diagramId}`).getAttribute('data-title') || '🎯 Mapa Conceptual';

  if (typeof window.showPreviewPanel === 'function') {
    window.showPreviewPanel({
      code: code,
      title: title
    }, 'mermaid');
  } else {
    import('../components/preview-panel-pdf.js')
      .then(module => {
        if (typeof module.showPreviewPanel === 'function') {
          module.showPreviewPanel({
            code: code,
            title: title
          }, 'mermaid');
        }
      });
  }
};

/**
 * Muestra una imagen a tamaño completo en un modal
 * @param {string} imagePath - Ruta de la imagen
 */
window.showFullImage = function(imagePath) {
  console.log("🦫 Acadel: Mostrando imagen a tamaño completo:", imagePath);
  
  // Evitar procesamiento múltiple
  if (window._showingFullImage) {
    console.log("🦫 Acadel: Evitando modal duplicada");
    return;
  }
  
  window._showingFullImage = true;
  
  const img = new Image();
  
  img.onload = function() {
    // La imagen existe, mostrar modal
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
      imageElement.alt = 'Vista ampliada por Acadel';
      Object.assign(imageElement.style, {
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain',
        borderRadius: '8px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.3)'
      });
      
      imgContainer.appendChild(imageElement);
      
      // Spinner de carga
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
      
      imageElement.onload = function() {
        spinner.style.display = 'none';
      };
      
      imageElement.onerror = function() {
        // Si hay error en la imagen dentro del modal, mostrar error
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
  
  img.onerror = function() {
    // La imagen no existe, mostrar mensaje de error
    try {
      showErrorModal();
    } finally {
      window._showingFullImage = false;
    }
  };
  
  img.src = imagePath;
};

/**
 * Función unificada para crear y mostrar modales
 * @param {Object} options - Opciones de configuración del modal
 * @returns {HTMLElement} El elemento modal creado
 */
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
  
  // Estilos base
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

/**
 * Muestra un modal de error cuando una imagen no se puede cargar
 */
function showErrorModal() {
  const errorContainer = document.createElement('div');
  Object.assign(errorContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px'
  });
  
  // Icono
  const icon = document.createElement('i');
  icon.className = 'bx bxs-confused';
  Object.assign(icon.style, {
    fontSize: '3rem',
    color: 'white',
    marginBottom: '15px'
  });
  
  const message = document.createElement('p');
  message.textContent = '👻 ¡Imagen fantasma detectada! Acadel no puede identificar esta imagen. Las imágenes fantasma son muy escurridizas.';
  Object.assign(message.style, {
    color: 'white',
    fontSize: '1.2rem',
    margin: '0',
    textAlign: 'center'
  });
  
  errorContainer.appendChild(icon);
  errorContainer.appendChild(message);
  
  createModal({
    className: 'image-fullscreen-modal',
    content: errorContainer,
    onClose: () => {
      window._showingFullImage = false;
    }
  });
  
  acadelWarning(
    "👻 Imagen fantasma", 
    "Acadel no pudo cargar la imagen. Parece que se volvió invisible."
  );
}


document.addEventListener('DOMContentLoaded', setupImagePreviewSystem);
setTimeout(setupImagePreviewSystem, 1000);

window.addEventListener('popstate', () => {
  try {
    console.log('🖼️ [POPSTATE] Procesando imágenes después de cambio de URL INMEDIATAMENTE');
    document.querySelectorAll('.message-content').forEach(container => {
      const externalImagesCount = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]').length;
      if (externalImagesCount > 0) {
        processExternalImagesRealTime(container);
      }
    });
  } catch (e) {
    console.warn('🦫 Acadel: Error procesando imágenes después de cambio de URL:', e);
  }
});

export {
  initializeMathJaxInContent,
  containsMathExpressions,
  processExternalImagesRealTime,
  initializeImagePreviewHandlersOptimized,
  handleImageErrorOptimized
};

// También exposición global controlada para admitir acceso directo
if (typeof window !== 'undefined') {
  window.initializeFileAttachmentHandlers = initializeFileAttachmentHandlers;
  window.imageUrlCache = imageUrlCache;
}

// Manteniendo la compatibilidad con los exports existentes
export default {
  renderChatMessages,
  addMessageToChat,
  createLoadingMessage,
  replaceLoadingMessage,
  replaceWithError,
  registerMessageRenderer,
  initializeMessageRenderers,
  initializeFileAttachmentHandlers,
  determineMessageType,
  processServerResponse,
  processAndRenderResponse,
  ensureFeedbackPersistence
};