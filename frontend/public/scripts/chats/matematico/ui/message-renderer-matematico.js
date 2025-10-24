/**
 * message-renderer.js - Sistema optimizado de renderizado de mensajes con soporte matemático
 * VERSIÓN REFACTORIZADA - Funcionalidad de imágenes separada en markdown-image-processor.js
 */

import { APP_CONFIG } from '../core/config-matematico.js';
import { getElement } from './ui-manager-matematico.js';
import { getState } from '../core/state-matematico.js';
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
} from '../utils/markdown-matematico.js';
import { renderMath } from '../math/mathjax-config.js';
import { renderExam } from '../components/exam-renderer-matematico.js';
import { copyToClipboard } from '../utils/clipboard-matematico.js';
import { createElement, clearElement, addEvent, getAttribute, createElementWithHTML, setManagedTimeout } from '../../shared/dom-helpers.js';
import {
  initializeMermaidDiagram,
  initMermaidSystem
} from '../../shared/mermaid-utils.js';
import contentProcessing from './content-processing-matematico.js';

// ==========================================
// IMPORTACIONES DEL PROCESADOR DE IMÁGENES
// ==========================================

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

// ==========================================
// INICIALIZACIÓN Y REGISTRO DE RENDERIZADORES
// ==========================================

const MERMAID_TYPE_PATTERN = /^(graph |flowchart |sequenceDiagram|classDiagram|classDiagram-v2|gitGraph|pie title|gantt|stateDiagram|stateDiagram-v2|mindmap|timeline|journey|erDiagram|requirementDiagram)/m;

const renderersMap = {};
let renderersInitialized = false;
let mermaidObserverInitialized = false;

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
};

/**
 * Asegura que los renderizadores necesarios estén inicializados
 * @param {string} type - Tipo de mensaje que se va a renderizar
 */
export function ensureRendererInitialized(type) {
  if (!renderersInitialized) {
    // Inicialización unificada - eliminando initializeRenderersInternal redundante
    renderersMap['message'] = renderTextMessage;
    renderersMap['error'] = renderErrorMessage;
    renderersMap['loading'] = renderLoadingMessage;
    renderersInitialized = true;
  }

  if (type && !renderersMap[type] && rendererInitializers[type]) {
    renderersMap[type] = rendererInitializers[type]();
  }
}

/**
 * Obtiene el renderizador para un tipo de mensaje
 */
function getRenderer(type) {
  ensureRendererInitialized(type);
  return renderersMap[type] || renderersMap['message'];
}

/**
 * Registra un renderizador para un tipo específico de mensaje
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

  document.querySelectorAll('.message-text > .multimodal-container').forEach(problematic => {
    const message = problematic.closest('.message');
    const contentElement = message?.querySelector('.message-content');
    const isAIMessage = message?.classList.contains('ai-message');

    if (contentElement) {
      contentProcessing.cleanMultimodalExistingContent(contentElement, isAIMessage);
    }
  });

  document.querySelectorAll('.message').forEach(message => {
    const contentElement = message.querySelector('.message-content');
    const isAIMessage = message.classList.contains('ai-message');

    if (contentElement) {
      contentProcessing.cleanMultimodalExistingContent(contentElement, isAIMessage);
    }
  });

  setupUnifiedObserver();
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
 * ✅ CORRECCIÓN ADICIONAL: Observer optimizado en message-renderer-matematico.js
 * REEMPLAZAR la función setupUnifiedObserver existente
 */
function setupUnifiedObserver() {
  if (window._unifiedObserverConfigured) return;
  window._unifiedObserverConfigured = true;

  let pendingElements = [];
  let processingScheduled = false;
  let imageProcessingThrottle = new Map(); // ✅ NUEVO: Throttling para imágenes

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
    let messagesToProcess = new Set(); // ✅ NUEVO: Evitar duplicados

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Detectar nuevos mensajes
            if (node.classList?.contains('message') || node.querySelector?.('.message')) {
              newMessagesAdded = true;

              // ✅ AGREGAR a set para evitar duplicados
              const messageElement = node.classList?.contains('message') ? node : node.querySelector('.message');
              if (messageElement) {
                messagesToProcess.add(messageElement);
              }

              // Agregar a pendientes para limpieza
              const contentElement = node.querySelector('.message-content') ||
                (node.classList?.contains('message') ? node.querySelector('.message-content') : null);
              if (contentElement) {
                pendingElements.push(contentElement);
                hasNewContent = true;
              }
            }

            // Detectar nuevas imágenes
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

    // ✅ PROCESAR mensajes nuevos SIN DUPLICADOS
    if (newMessagesAdded && messagesToProcess.size > 0) {
      setTimeout(() => {
        console.log(`🔍 [OBSERVER] ${messagesToProcess.size} mensajes únicos detectados`);

        messagesToProcess.forEach(message => {
          // ✅ VERIFICAR si ya fue procesado
          if (message.hasAttribute('data-images-processed')) {
            console.log('📦 [OBSERVER] Mensaje ya procesado, saltando');
            return;
          }

          const container = message.querySelector('.message-content');
          if (container) {
            const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
            if (externalImages.length > 0) {
              const containerKey = container.dataset.containerId || container.outerHTML.slice(0, 100);

              // ✅ THROTTLING: Solo procesar si no se procesó recientemente
              const lastProcessed = imageProcessingThrottle.get(containerKey);
              const now = Date.now();

              if (!lastProcessed || (now - lastProcessed) > 2000) { // 2 segundos de throttle
                console.log(`🖼️ [OBSERVER] Procesando ${externalImages.length} imágenes externas en mensaje nuevo`);
                imageProcessingThrottle.set(containerKey, now);
                processImagesOptimized(container);

                // Limpiar throttle después de un tiempo
                setTimeout(() => {
                  imageProcessingThrottle.delete(containerKey);
                }, 10000); // 10 segundos
              } else {
                console.log('⏭️ [OBSERVER] Mensaje throttled, saltando procesamiento');
              }
            }
          }

          // ✅ MARCAR como procesado para evitar reprocesamiento
          message.setAttribute('data-images-processed', 'true');
        });

      }, 150); // Reducido de 300ms a 150ms
    }

    // Procesar imágenes con errores
    if (hasNewImages) {
      setTimeout(handleNewImages, 200);
    }

    // Procesar contenido para limpieza
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
    console.log('✅ Observador unificado optimizado configurado');
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

/**
 * Inicializa manejadores de eventos para archivos adjuntos
 */
function initializeFileAttachmentHandlers(container) {
  const fileElements = container.querySelectorAll('.file-name-clickable');
  if (fileElements.length === 0) return;

  fileElements.forEach(fileElement => {
    if (fileElement.getAttribute('data-handler-attached')) return;

    const fileName = fileElement.getAttribute('data-file-name') || '';
    const fileType = fileElement.getAttribute('data-file-type') || 'document';
    const language = fileElement.getAttribute('data-language') || '';
    const originalMessage = fileElement.getAttribute('data-original-message') || '';

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
  if (typeof window.showFilePreview === 'function') {
    try {
      const tempId = `temp-file-${Date.now()}`;
      window.showFilePreview(tempId, fileType);
      return;
    } catch (error) {
      console.error('Error mostrando vista previa del archivo:', error);
    }
  }

  try {
    import('../components/preview-panel-matematico.js')
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
 */
function extractDocumentContent(originalMessage, fileName) {
  if (!originalMessage) return 'No se pudo extraer el contenido del archivo.';

  try {
    try {
      const parsedMessage = JSON.parse(decodeURIComponent(originalMessage));

      if (parsedMessage.documentContent) {
        return parsedMessage.documentContent;
      }

      if (parsedMessage.fileName === fileName && parsedMessage.documentContent) {
        return parsedMessage.documentContent;
      }
    } catch (jsonError) {
      // No es JSON, continuar con el método tradicional
    }

    let cleanedMessage = originalMessage
      .replace(/%3Ca%20href%3D/gi, '%20')
      .replace(/%3E/gi, '%20')
      .replace(/%3C%2Fa%3E/gi, '%20')
      .replace(/%3Cem%3E/gi, '%20')
      .replace(/%3C%2Fem%3E/gi, '%20');

    const decodedMessage = decodeURIComponent(cleanedMessage);

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

    const contentStart = startPos + markerUsed.length;
    let contentAfterMarker = decodedMessage.substring(contentStart).trim();

    const endPatterns = [
      /\n\s*Contenido del documento/i,
      /\n\s*Código de/i,
      /\n\s*```/,
      /\n\s*\n\s*\n+\s*Contenido del/i,
      /\n\s*\n\s*\n+\s*Código de/i,
      /\n\s*\n\s*\n+\s*```/
    ];

    let endPos = -1;

    for (const pattern of endPatterns) {
      const match = contentAfterMarker.match(pattern);
      if (match && match.index) {
        if (endPos === -1 || match.index < endPos) {
          endPos = match.index;
        }
      }
    }

    let textContent = '';

    if (endPos !== -1) {
      textContent = contentAfterMarker.substring(0, endPos).trim();
    } else {
      const nlMatch = contentAfterMarker.match(/\n\s*\n\s*\n+/);
      if (nlMatch && nlMatch.index) {
        textContent = contentAfterMarker.substring(0, nlMatch.index).trim();
      } else {
        textContent = contentAfterMarker;
      }
    }

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
 */
function extractCodeContent(originalMessage, fileName) {
  if (!originalMessage) return '// Error al extraer código';
  if (!fileName) return '// Error: Nombre de archivo no especificado';

  try {
    try {
      const parsedMessage = JSON.parse(decodeURIComponent(originalMessage));

      if (parsedMessage.code) {
        let code = parsedMessage.code;

        if (fileName.toLowerCase().endsWith('.css')) {
          code = code.replace(/<em>/g, '')
            .replace(/<\/em>/g, '');
        }

        return code;
      }

      if (parsedMessage.fileName === fileName && parsedMessage.code) {
        let code = parsedMessage.code;

        if (fileName.toLowerCase().endsWith('.css')) {
          code = code.replace(/<em>/g, '')
            .replace(/<\/em>/g, '');
        }

        return code;
      }
    } catch (jsonError) {
      // No es JSON, continuar con el método tradicional
    }

    let cleanedMessage = originalMessage;

    if (fileName.toLowerCase().endsWith('.html')) {
      cleanedMessage = originalMessage
        .replace(/%3Ca%20href%3D[^%]*%3E/gi, '')
        .replace(/%3C%2Fa%3E/gi, '')
        .replace(/%0A/g, '')
        .replace(/%0D/g, '')
        .replace(/%09/g, '');
    } else if (fileName.toLowerCase().endsWith('.css')) {
      cleanedMessage = originalMessage
        .replace(/%3Cem%3E/gi, '')
        .replace(/%3C%2Fem%3E/gi, '');
    } else {
      cleanedMessage = originalMessage
        .replace(/%3Ca%20href%3D[^%]*%3E/gi, '')
        .replace(/%3C%2Fa%3E/gi, '')
        .replace(/%3Cem%3E/gi, '')
        .replace(/%3C%2Fem%3E/gi, '');
    }

    let decodedMessage;
    try {
      decodedMessage = decodeURIComponent(cleanedMessage);
    } catch (e) {
      decodedMessage = cleanedMessage;
    }

    const normalizedFileName = fileName.replace(/^["']|["']$/g, '');

    const codeBlockPattern = new RegExp(
      `Código de\\s*["']?${normalizedFileName}["']?[^\\n]*:\\s*\`\`\`[\\w]*\\s*([\\s\\S]*?)(?=\`\`\`|$)`,
      'i'
    );

    const codeMatch = decodedMessage.match(codeBlockPattern);

    if (codeMatch && codeMatch[1]) {
      let code = codeMatch[1].trim();

      if (fileName.toLowerCase().endsWith('.css')) {
        code = code.replace(/<em>/g, '')
          .replace(/<\/em>/g, '');
      } else {
        code = code.replace(/<a\s+[^>]*>/gi, '')
          .replace(/<\/a>/gi, '')
          .replace(/<em>/gi, '')
          .replace(/<\/em>/gi, '');
      }

      return code;
    }

    if (fileName.toLowerCase().endsWith('.css') || fileName.toLowerCase().endsWith('.html')) {
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

    const genericMatch = decodedMessage.match(/```[\w]*\s*([\s\S]*?)```/);
    if (genericMatch && genericMatch[1]) {
      let code = genericMatch[1].trim();

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

// Inicializar contentProcessing con la función de manejadores de archivos
contentProcessing.initialize({
  initializeFileAttachmentHandlers: initializeFileAttachmentHandlers
});

// ==========================================
// RENDERIZADO DE TIPOS DE MENSAJES
// ==========================================

/**
 * Verifica si el texto contiene diagramas Mermaid
 */
function containsMermaidDiagram(text) {
  if (!text) return false;

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
 * Normaliza la sintaxis de código Mermaid
 */
function normalizeMermaidSyntax(code) {
  if (!code) return '';

  const diagramTypeMatch = code.match(/^(graph|flowchart|sequenceDiagram|classDiagram|classDiagram-v2|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)(\s|;|\n|$)/i);

  if (!diagramTypeMatch) return code;

  const diagramType = diagramTypeMatch[1];
  let normalizedCode = code;

  normalizedCode = normalizedCode.replace(new RegExp(`^(${diagramType}(?:-v2)?);`, 'm'), '$1\n');

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

        line = line.replace(/([^\s])<\|--([^\s])/, '$1 <|-- $2')
          .replace(/([^\s])<\|--\s/, '$1 <|-- ')
          .replace(/\s<\|--([^\s])/, ' <|-- $1');

        processedLines.push(line);
      }
      else if (line.includes('-->')) {
        if (line.endsWith(';')) {
          line = line.substring(0, line.length - 1);
        }

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
    normalizedCode = normalizedCode.replace(/^(classDiagram(?:-v2)?)\s+/, '$1\n');

    if (/^classDiagram(?:-v2)?\s+class\s+/m.test(normalizedCode)) {
      normalizedCode = normalizedCode.replace(/^(classDiagram(?:-v2)?)\s+(class\s+)/m, '$1\n$2');
    }
  }

  return normalizedCode;
}

/**
 * Extrae texto alrededor de un diagrama Mermaid específico
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
 */
function extractTextBetweenDiagrams(text, diagram1, diagram2) {
  if (typeof text !== 'string') return '';
  return text.substring(diagram1.end, diagram2.start).trim();
}

/**
 * ✅ RENDERIZADOR PRINCIPAL DE MENSAJES DE TEXTO
 */
export function renderTextMessage(container, content, role = '') {
  const safeContent = typeof content === 'string' ? content : String(content);
  const isAIMessage = role === 'ai';

  if (isAIMessage) {
    if (containsMermaidDiagram(safeContent)) {
      renderMermaidMessage(container, safeContent);
      return;
    }

    const hasTable = containsMarkdownTable(safeContent);
    const hasCode = containsCodeBlocks(safeContent);

    if (hasTable && hasCode) {
      processContentWithCodeBlocks(safeContent, container);
      applyHighlighting(container);
      attachCopyButtonEvents(container);

      processImagesOptimized(container); // Inmediato para AI messages
      return;
    } else if (hasTable) {
      detectAndRenderMarkdownTables(safeContent, container, true);
      processImagesOptimized(container); // Inmediato para AI messages
      return;
    } else if (hasCode) {
      processContentWithCodeBlocks(safeContent, container);
      applyHighlighting(container);
      attachCopyButtonEvents(container);
      processImagesOptimized(container); // Inmediato para AI messages
      return;
    }

    container.innerHTML = parseMarkdownToHTML(safeContent);

    // ✅ OPTIMIZACIÓN: Verificar si realmente hay imágenes externas antes de procesar
    const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    const hasImages = container.querySelectorAll('.markdown-image').length > 0;

    if (hasImages) {
      initializeImagePreviewHandlers(container);
    }

    if (externalImages.length > 0) {
      console.log(`🖼️ [RENDER] ${externalImages.length} imágenes externas detectadas en mensaje IA`);
      processImagesOptimized(container);
    } else if (hasImages) {
      console.log(`📦 [RENDER] ${hasImages} imágenes locales detectadas, solo inicializando handlers`);
    }

    if (containsMathExpressions(safeContent)) {
      renderMathWithRetry(container);
    }
    return;
  }

  // Procesamiento para mensajes de usuario
  const hasDocumentIndicator = safeContent.includes('Contenido del documento') ||
    safeContent.includes('Contexto adicional de documentos adjuntos:');
  const hasCodeIndicator = safeContent.includes('Código de ');
  const hasImageIndicator = safeContent.includes('imagen adjunta') ||
    safeContent.includes('imágenes adjuntas');

  const hasMultipleTypes =
    (hasDocumentIndicator && hasCodeIndicator) ||
    (hasDocumentIndicator && hasImageIndicator) ||
    (hasCodeIndicator && hasImageIndicator) ||
    safeContent.match(/Contenido del documento/g)?.length > 1;

  if (containsMermaidDiagram(safeContent)) {
    renderMermaidMessage(container, safeContent);
    return;
  }

  if (!isAIMessage && hasMultipleTypes) {
    container.innerHTML = contentProcessing.formatMultipleAttachments(safeContent);
    initializeFileAttachmentHandlers(container);
    return;
  }

  if (!isAIMessage && safeContent.includes('Contexto adicional de documentos adjuntos:')) {
    container.innerHTML = contentProcessing.detectMultimodalContent(safeContent, false);
    initializeFileAttachmentHandlers(container);
    return;
  }

  const processedContent = contentProcessing.detectMultimodalContent(safeContent, isAIMessage);

  if (processedContent !== safeContent && typeof processedContent === 'string') {
    container.innerHTML = processedContent;
    if (processedContent.includes('file-name-clickable') || processedContent.includes('attachment-indicator')) {
      initializeFileAttachmentHandlers(container);
    }
    return;
  }

  const hasValidTableStructure = /\|\s*[-:]+\s*\|/.test(safeContent) &&
    /^\s*\|.*\|\s*$[\r\n]+\s*\|[\s-:]+\|/m.test(safeContent);

  const hasTable = containsMarkdownTable(safeContent) || hasValidTableStructure;
  const hasCode = containsCodeBlocks(safeContent);
  const hasTablesAndCode = hasTable && hasCode;

  if (hasTablesAndCode) {
    processContentWithCodeBlocks(safeContent, container);
    applyHighlighting(container);
    attachCopyButtonEvents(container);

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

  if (hasTable) {
    const tablesProcessed = detectAndRenderMarkdownTables(safeContent, container, true);

    if (tablesProcessed) {
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

  if (hasCode) {
    processContentWithCodeBlocks(safeContent, container);
    applyHighlighting(container);
    attachCopyButtonEvents(container);

    if (typeof addExpandButton === 'function') {
      addExpandButton(container, {
        content: container.innerHTML,
        title: 'Código',
        language: 'code'
      }, 'code');
    }

    return;
  }

  const parsedContent = parseMarkdownToHTML(safeContent);
  container.innerHTML = parsedContent;

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

    if (window.scrollManager) {
      window.scrollManager.setupImagePositionMaintenance(container);

      const messageElement = container.closest('.message');
      if (messageElement) {
        messageElement.setAttribute('data-contains-images', 'true');
      }
    }
  }

  const hasFileAttachments = container.querySelector('.attachment-indicator') ||
    container.querySelector('.file-name-clickable');
  if (hasFileAttachments) {
    initializeFileAttachmentHandlers(container);
  }

  if (containsMathExpressions(safeContent)) {
    renderMathWithRetry(container);
  }
}

/**
 * Renderiza un mensaje con múltiples diagramas Mermaid
 */
function renderMermaidMessage(container, content) {
  try {
    const messageWithDiagrams = createElement('div', { className: 'message-with-diagrams' });
    const mermaidDiagrams = extractMermaidCodes(typeof content === 'string' ? content : (content.code || ''));

    if (mermaidDiagrams.length === 0) {
      acadelError("🧩 Diagrama complicado", "Acadel no pudo procesar este mapa conceptual. ¿Podrías intentar con una versión más simple?");
      return;
    }

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
      const diagramContainer = createElement('div', {
        className: 'mermaid-diagram-container',
        'data-diagram-index': index
      });

      const titleText = typeof content === 'object' && content.title
        ? content.title
        : `Mapa Conceptual ${index > 0 ? (index + 1) : ''}`;
      const title = createElement('h4', { className: 'concept-map-title' }, titleText);
      diagramContainer.appendChild(title);

      const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}-${index}`;
      const diagramDiv = createElement('div', {
        className: 'mermaid-diagram',
        id: uniqueId,
        'data-code': diagram.code,
        'data-title': titleText,
        'data-diagram-index': index
      });

      const loadingDiv = createElementWithHTML('div', { className: 'mermaid-loading' },
        '<i class="bx bx-loader-alt bx-spin"></i> Cargando diagrama...'
      );
      diagramDiv.appendChild(loadingDiv);

      diagramContainer.appendChild(diagramDiv);

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
          import('../components/preview-panel-matematico.js')
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

    if (!code.trim()) {
      acadelWarning("📝 Código vacío", "Acadel no encontró código para mostrar. ¿Olvidaste pegarlo?");
      return;
    }

    const codeHTML = buildCodeBlockHTML(code, language);
    container.innerHTML = codeHTML;

    applyHighlighting(container);
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
 */
function renderTableMessage(container, content) {
  console.log('📊 Renderizando mensaje de tabla...');

  try {
    let tableRendered = false;

    if (content && Array.isArray(content.headers) && Array.isArray(content.rows)) {
      renderFormattedTable(container, content);
      renderMathWithRetry(container); // ✅ Unificado - eliminando renderMathInTable redundante
      tableRendered = true;
    }
    else if (content && typeof content === 'object') {
      if (content.data && typeof content.data === 'object') {
        const data = content.data;
        if (Array.isArray(data.headers) && Array.isArray(data.rows)) {
          renderFormattedTable(container, data);
          renderMathWithRetry(container);
          tableRendered = true;
        }
      }
      else if (content.table && typeof content.table === 'object') {
        const table = content.table;
        if (Array.isArray(table.headers) && Array.isArray(table.rows)) {
          renderFormattedTable(container, table);
          renderMathWithRetry(container);
          tableRendered = true;
        }
      }
      else if (Object.keys(content).length > 0) {
        const headers = Object.keys(content);
        const rows = [Object.values(content)];

        renderFormattedTable(container, { headers, rows, caption: "Datos" });
        renderMathWithRetry(container);
        tableRendered = true;
      }
    }
    else if (typeof content === 'string') {
      try {
        const parsed = contentProcessing.parseJsonPreservingMath(content);
        if (typeof parsed === 'object' && parsed !== null) {
          renderTableMessage(container, parsed);
          tableRendered = true;
          return;
        }
      } catch (e) {
        if (detectAndRenderTable(content, container)) {
          renderMathWithRetry(container);
          tableRendered = true;
        }
      }
    }

    if (tableRendered) {
      addExpandButton(container, content, 'table');
      return;
    }

    acadelWarning("📊 Datos de tabla confusos", "Acadel no pudo organizar estos datos en tabla. ¿Podrías formatearlos mejor?");
    return;

  } catch (error) {
    console.error('❌ Error en renderTableMessage:', error);
    acadelError("📈 Error de tabla", "Acadel se confundió con esta tabla. ¡Incluso los capibara más listos tienen límites!");
    return;
  }
}

/**
 * ✅ UNIFICADO - Renderiza matemáticas con sistema de backoff exponencial
 */
function renderMathWithRetry(container, attempt = 1, maxAttempts = 3) {
  // Marcar contenedor y celdas con contenido matemático
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

  const messageId = container.closest('.message')?.dataset?.messageId || Date.now();
  const timeoutKey = `math-render-${messageId}-${attempt}`;

  renderMath(container).catch(error => {
    if (attempt < maxAttempts) {
      console.warn(`Intento ${attempt} de renderizado matemático falló, reintentando...`, error);

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
 */
function renderExamMessage(container, content) {
  container.innerHTML = '<div class="exam-container"></div>';
  container.setAttribute('data-contains-exam', 'true');

  const examContainer = container.querySelector('.exam-container');

  if (examContainer) {
    try {
      if (content && content.questions && Array.isArray(content.questions)) {
        content.questions = content.questions.map(question => {
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
 * Renderiza un mensaje de error con apariencia de respuesta de la IA
 */
function renderErrorMessage(container, content) {
  const { errorMessage, originalMessage } = content;

  const acadelMathErrorResponses = [
    {
      main: "🦫 ¡Ups! Mi cerebro peludo tuvo una división por cero. ¡Como cuando intentas calcular la derivada de una función discontinua!",
      tip: "Respira profundo y recuerda: hasta Euler cometía errores de cálculo (pero los convertía en teoremas)"
    },
    {
      main: "🦫 Mi procesador capibarina se trabó como estudiante calculando límites infinitos. ¡Pero tranquilo, convergemos hacia la solución!",
      tip: "Momento perfecto para estirar esas neuronas con un poco de álgebra mental"
    },
    {
      main: "🦫 Error detectado en mi matriz de sabiduría: determinante = 0. ¡Es como cuando tu sistema de ecuaciones no tiene solución única!",
      tip: "Los mejores algoritmos a veces requieren varios intentos y mucha paciencia iterativa"
    },
    {
      main: "🦫 ¡Rayos! Mi función cerebral tuvo una asíntota vertical. ¡Típico de procesos que tienden al infinito!",
      tip: "¿Sabías que los capibaras resolvemos integrales mejor después de una pausa reflexiva?"
    },
    {
      main: "🦫 Mi red neuronal se comportó como una función no derivable en un punto crítico. ¡Error de continuidad detectado!",
      tip: "Como decía Gauss: 'Las matemáticas son la reina de las ciencias', ¡y las reinas también descansan!"
    },
    {
      main: "🦫 ¡Oops! Mi algoritmo entró en un bucle infinito como una serie que no converge. ¡Necesito un criterio de parada!",
      tip: "Incluso las mejores simulaciones de Monte Carlo necesitan ajustes de parámetros"
    },
    {
      main: "🦫 Error de coma flotante en mi sabiduría capibarina. ¡Como cuando calculas π con solo 2 decimales!",
      tip: "La precisión numérica es un arte, no te desanimes por errores de redondeo"
    },
    {
      main: "🦫 Mi transformada de Fourier se descompuso en frecuencias extrañas. ¡Es como analizar señales con ruido!",
      tip: "Los mejores ingenieros saben que filtrar errores es parte del proceso"
    }
  ];

  const randomResponse = acadelMathErrorResponses[Math.floor(Math.random() * acadelMathErrorResponses.length)];

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

  const icon = createElement('i', { className: 'bx bx-confused' });
  icon.style.fontSize = '1.3rem';
  icon.style.color = '#e74c3c';
  errorContainer.appendChild(icon);

  const errorSpan = createElement('span', {}, '🦫 Momento de recálculo capibarina');
  errorContainer.appendChild(errorSpan);

  const errorDetails = createElement('div', { className: 'cancelled-details' });
  errorDetails.style.fontSize = '0.85rem';
  errorDetails.style.color = '#888';
  errorDetails.style.margin = '8px 0 0 20px';

  const messageParagraph = createElement('p', { className: 'message-text' });
  messageParagraph.innerHTML = randomResponse.main;
  errorDetails.appendChild(messageParagraph);

  const suggestionParagraph = createElement('p', { className: 'message-text' });
  suggestionParagraph.innerHTML = `💡 <strong>Consejo del Profesor Acadel:</strong> ${randomResponse.tip}`;
  errorDetails.appendChild(suggestionParagraph);

  const motivationParagraph = createElement('p', { className: 'message-text' });
  const mathMotivations = [
    '🔢 ¡Las matemáticas no se detienen por contratiempos técnicos! ¿Qué tal si resolvemos una ecuación interesante?',
    '📐 ¡La lógica matemática continúa! ¿Te animas a explorar algún teorema fascinante?',
    '∫ ¡El cálculo sigue fluyendo! ¿Qué tal si derivamos algún concepto nuevo?',
    '📊 ¡La estadística nunca miente! Aprovechemos para analizar algún dato curioso',
    '⚡ ¡Los algoritmos continúan! ¿Exploramos algún método numérico interesante?'
  ];
  const randomMotivation = mathMotivations[Math.floor(Math.random() * mathMotivations.length)];
  motivationParagraph.innerHTML = randomMotivation;
  errorDetails.appendChild(motivationParagraph);

  container.appendChild(errorContainer);
  container.appendChild(errorDetails);

  const messageElement = container.closest('.message');
  if (messageElement) {
    messageElement.setAttribute('data-error-rendered', 'true');
    messageElement.classList.add('acadel-error-message');
    container.setAttribute('data-error-content', 'true');
    container.classList.add('acadel-error-content');
  }

  if (window.acadelInfo) {
    const mathNotifications = [
      {
        title: "🦫 Pausa para recompilación matemática",
        message: "Acadel está optimizando sus algoritmos peludos para darte mejores cálculos"
      },
      {
        title: "🦫 Momento de refactorización",
        message: "El profesor capibara está ajustando sus funciones matemáticas"
      },
      {
        title: "🦫 Recalculando sabiduría",
        message: "Acadel está procesando números con precisión de capibara"
      }
    ];
    const randomNotification = mathNotifications[Math.floor(Math.random() * mathNotifications.length)];

    acadelInfo(
      randomNotification.title,
      randomNotification.message
    );
  }
}

/**
 * Renderiza un mensaje tipo alerta/notificación
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
 */
function renderLoadingMessage(container) {
  container.innerHTML = `
    <div class="typing-loader"></div>
  `;
}

// ==========================================
// FUNCIONES AUXILIARES DE RENDERIZADO
// ==========================================

/**
 * Aplica highlight.js a todos los bloques de código en un contenedor
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
 */
function addExpandButton(container, data, type = 'table') {
  if (container.querySelector('.expand-content-btn')) return;

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
  } else {
    previewData = data;
  }

  expandButton.addEventListener('click', () => {
    import('../components/preview-panel-matematico.js').then(module => {
      const previewPanel = document.querySelector('#preview-panel');
      const isPanelOpen = previewPanel && previewPanel.classList.contains('open');

      if (isPanelOpen) {
        module.closePreviewPanel();
      } else {
        module.showPreviewPanel(previewData, type);
      }
    }).catch(error => {
      console.error('Error al cargar el módulo de previsualización:', error);
    });
  });

  container.appendChild(expandButton);
}

// ==========================================
// GESTIÓN DE MENSAJES DEL CHAT
// ==========================================

/**
 * Renderiza los mensajes del chat
 */
export function renderChatMessages(messages) {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return;

  clearElement(chatMessages);

  if (!messages || messages.length === 0) return;

  if (messages.length === 1) {
    renderMessageItem({ message: messages[0] }, chatMessages);
    return;
  }

  let alreadySorted = true;
  let prevTimestamp = getMessageTimestamp(messages[0]) || 0;

  for (let i = 1; i < messages.length && alreadySorted; i++) {
    const currentTimestamp = getMessageTimestamp(messages[i]) || Infinity;
    if (currentTimestamp < prevTimestamp) {
      alreadySorted = false;
    }
    prevTimestamp = currentTimestamp;
  }

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

    if (a.role === 'user' && b.role === 'assistant') {
      return -1;
    } else if (a.role === 'assistant' && b.role === 'user') {
      return 1;
    }

    return a.originalIndex - b.originalIndex;
  });

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

  initializeInteractions();
}

/**
 * Función para crear elementos de mensaje
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

      import('../utils/markdown-matematico.js').then(module => {
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
 * ✅ FUNCIÓN UNIFICADA - Renderiza mensajes ya ordenados
 */
function renderMessagesInOrder(messages, container) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const messageElement = renderMessageItem({ message: msg }, fragment);

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
 * ✅ FUNCIÓN PRINCIPAL UNIFICADA - Renderiza un elemento de mensaje
 */
function renderMessageItem(item, container) {
  try {
    const msg = item.message;
    const role = msg.role?.toLowerCase();
    const isAI = role === 'assistant' || role === 'ai';

    const isRawMultimodal = typeof msg.content === 'string' && (
      msg.content.includes('"hasImage"') ||
      msg.content.includes('"imageCount"') ||
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
 */
function getMessageTimestamp(msg) {
  const possibleFields = ['timestamp', 'created_at', 'time', 'date', 'createdAt'];

  for (const field of possibleFields) {
    if (msg[field]) {
      try {
        return new Date(msg[field]);
      } catch (e) {
        // Continuar con el siguiente campo
      }
    }
  }

  return null;
}

/**
 * Agrega un mensaje al área de chat
 */
export function addMessageToChat(role, content, type = 'message') {
  const chatMessages = getElement('chatMessages');
  if (!chatMessages) return null;

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

  // 🔥 ESTABLECER REFERENCIA GLOBAL INMEDIATAMENTE
  window._currentLoadingMessage = loader;

  // 🔥 AÑADIR TIMESTAMP PARA VALIDACIÓN
  const timestamp = Date.now();
  loader.dataset.messageId = `msg-${timestamp}-loading`;
  loader.dataset.createdAt = timestamp.toString();

  console.log(`📝 [LOADING] Mensaje de carga creado: ${loader.dataset.messageId}`);

  return loader;
}

/**
 * Reemplaza el mensaje de carga con contenido final
 */
export function replaceLoadingMessage(loader, content, type = 'message') {
  if (!loader) return;

  ensureRendererInitialized(type);

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

  // ✅ DESPUÉS:
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
  }, 100); // Reducido de 200ms a 100ms

  requestAnimationFrame(() => {
    loader.style.opacity = '0.99';
    setTimeout(() => {
      loader.style.opacity = '1';

      if (containsMathExpressions(contentElem.innerHTML) || type === 'exam' || type === 'table') {
        renderMathWithRetry(contentElem);
      }
    }, 30);
  });

  // 🔥 LIMPIAR REFERENCIA GLOBAL AL REEMPLAZAR
  if (window._currentLoadingMessage === loader) {
    window._currentLoadingMessage = null;
    console.log('🧹 [LOADING] Referencia global limpiada después de reemplazar');
  }
}


/**
 * Reemplaza el mensaje de carga con un mensaje de error
 */
export function replaceWithError(loadingMessage, errorMessage, originalQuery = '') {
  if (!loadingMessage) return;

  // 🔥 LIMPIAR REFERENCIA GLOBAL EN ERRORES
  if (window._currentLoadingMessage === loadingMessage) {
    window._currentLoadingMessage = null;
    console.log('🧹 [ERROR] Referencia global limpiada después de error');
  }

  // ⭐ SOLUCIÓN: Limpiar ID temporal si hay error
  if (window.tempChatIdForFiles) {
    window.tempChatIdForFiles = null;
    console.log(`🧹 Chat temporal limpiado por error en respuesta`);
  }

  const getAcadelMathErrorMessage = (error) => {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('network') || errorLower.includes('conexión') || errorLower.includes('connection')) {
      return {
        main: "🦫 ¡Mi WiFi capibarina está más desconectada que una función discontinua! Como cuando intentas resolver ecuaciones desde la piscina...",
        advice: "🌊 Mientras vuelve la conexión, ¿qué tal si repasas esos límites pendientes?"
      };
    }

    if (errorLower.includes('timeout') || errorLower.includes('tiempo')) {
      return {
        main: "🦫 Me quedé calculando tanto en tu pregunta que el cronómetro se impacientó. ¡Como cuando intentas resolver todas las derivadas del universo!",
        advice: "⏰ El tiempo en matemáticas es relativo, pero los números son eternos. ¡Sigamos calculando!"
      };
    }

    if (errorLower.includes('server') || errorLower.includes('servidor')) {
      return {
        main: "🦫 El servidor está más saturado que una matriz durante exámenes finales. ¡Hasta los algoritmos necesitan descansos!",
        advice: "🖥️ Momento perfecto para una pausa numérica: ¿has revisado esas integrales recientes?"
      };
    }

    if (errorLower.includes('404') || errorLower.includes('not found')) {
      return {
        main: "🦫 Mi respuesta se escondió mejor que la solución de una ecuación diferencial compleja. ¡El misterio matemático continúa!",
        advice: "🔍 Como buenos detectives numéricos, sigamos buscando patrones y respuestas juntos"
      };
    }

    const genericMathMessages = [
      {
        main: "🦫 ¡Vaya! Mi procesador peludo tuvo un overflow tan profundo que se desconectó del plano cartesiano. ¡Pasa en las mejores familias de genios!",
        advice: "💭 Los grandes matemáticos también necesitan pausas para reorganizar sus algoritmos brillantes"
      },
      {
        main: "🦫 Error detectado en mi matriz capibarina. Es como cuando tu calculadora se queda sin batería justo en el cálculo crucial...",
        advice: "🧮 Pero no te preocupes, los mejores ingenieros siempre reajustan y continúan computando"
      },
      {
        main: "🦫 Mi sabiduría estadística necesita un momento de recalibración. ¡Hasta los sabios peludos tenemos errores de redondeo!",
        advice: "📊 Recuerda: cada pausa es una oportunidad para aprender algo nuevo en matemáticas"
      }
    ];

    return genericMathMessages[Math.floor(Math.random() * genericMathMessages.length)];
  };

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

  const acadelMessage = getAcadelMathErrorMessage(errorMessage);

  const errorContent = `
    <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(231,76,60,0.05);border-radius:8px;margin:5px 0;border-left:3px solid rgba(231,76,60,0.3);">
      <i class="bx bx-confused" style="font-size:1.3rem;color:#e74c3c;"></i>
      <span>🦫 Momento de recálculo capibarina</span>
    </div>
    <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
      <p class="message-text">${acadelMessage.main}</p>
      <p class="message-text"><strong>💡 Consejo del Profesor Acadel:</strong> ${acadelMessage.advice}</p>
      <p class="message-text">📐 ¿Qué tal si aprovechamos para revisar algún teorema interesante mientras reorganizo mis algoritmos?</p>
    </div>
  `;

  messageContent.innerHTML = errorContent;

  loadingMessage.setAttribute('data-error-rendered', 'true');
  messageContent.setAttribute('data-error-content', 'true');

  loadingMessage.style.display = '';
  loadingMessage.style.visibility = 'visible';
  loadingMessage.style.opacity = '1';

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

  setTimeout(() => {
    if (loadingMessage && loadingMessage.parentNode) {
      loadingMessage.style.display = '';
      loadingMessage.style.visibility = 'visible';
      loadingMessage.style.opacity = '1';
    }
  }, 100);

  if (window.acadelInfo) {
    const mathNotifications = [
      "Acadel está recompilando sus funciones matemáticas. ¡El cálculo continúa!",
      "El profesor capibara está optimizando sus algoritmos numéricos",
      "Acadel ajusta su precisión estadística para darte mejores resultados"
    ];
    const randomNotification = mathNotifications[Math.floor(Math.random() * mathNotifications.length)];

    acadelInfo(
      "🦫 Pausa para reorganizar algoritmos",
      randomNotification
    );
  }
}

/**
 * Inicializa los botones de interacción en los mensajes
 */
function initializeInteractions(specificMessage = null) {
  import('../utils/response-interaction-matematico.js').then(module => {
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
  extractMessageContent(message) {
    let contentToRender = message.content || message.message || '';
    let type = 'message';

    if (typeof contentToRender === 'string') {
      const isAIMessage = message.role === 'assistant' || message.role === 'ai';
      const processedMultimodal = contentProcessing.detectMultimodalContent(contentToRender, isAIMessage);

      if (processedMultimodal !== contentToRender && typeof processedMultimodal === 'string') {
        return { type: 'message', content: processedMultimodal };
      }

      if ((contentToRender.trim().startsWith('{') && contentToRender.trim().endsWith('}')) ||
        (contentToRender.trim().startsWith('[') && contentToRender.trim().endsWith(']'))) {
        try {
          const parsed = contentProcessing.parseJsonPreservingMath(contentToRender);

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
            }
          }
        } catch (e) {
          console.warn('Error al parsear posible JSON:', e);
        }
      }
    } else if (contentToRender && typeof contentToRender === 'object') {
      if (contentToRender.type) {
        type = contentToRender.type;

        if (type === 'exam') {
          contentToRender = contentToRender.exam || contentToRender.data;
        } else if (type === 'conversation') {
          type = 'message';
          contentToRender = contentToRender.answer || contentToRender.message || contentToRender.content;
        }
      }
    }

    return { type, content: contentToRender };
  },

  processResponse(data) {
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
      }
    }

    const content = data.answer || data.content || '';

    if (typeof content === 'string') {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          const parsed = contentProcessing.parseJsonPreservingMath(content);

          if (typeof parsed === 'object' && parsed !== null) {
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
            } else if (parsed.type) {
              return this.processResponse(parsed);
            }
          }
        } catch (e) {
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
    }

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
    }

    return {
      type: 'message',
      content: content
    };
  }
};

/**
 * Procesa la respuesta del servidor
 */
export function processServerResponse(data) {
  return messageProcessing.processResponse(data);
}

// ==========================================
// PROCESAMIENTO DE IMÁGENES - Funciones simplificadas que delegan al nuevo módulo
// ==========================================

function processAllExistingImages() {
  const messages = document.querySelectorAll('.message');
  if (messages.length === 0) return;

  console.log(`🖼️ [BATCH] Procesando proactivamente imágenes en ${messages.length} mensajes con sistema de locks...`);

  // ✅ OPTIMIZACIÓN: Procesar solo mensajes con imágenes externas reales
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

  // ✅ PROCESAMIENTO OPTIMIZADO: Solo donde realmente se necesita
  messagesWithExternalImages.forEach(({ container, count }, index) => {
    setTimeout(() => {
      console.log(`📦 [BATCH] Procesando mensaje ${index + 1}/${messagesWithExternalImages.length} (${count} imágenes)`);
      processImagesOptimized(container);
    }, index * 100); // Spread temporal para evitar saturación
  });
}
/**
 * Sistema para capturar clics en imágenes utilizando delegación de eventos
 */
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

/**
 * Muestra una imagen a tamaño completo en un modal
 */
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

/**
 * Función para crear y mostrar modales
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
 * Función simplificada para mostrar modal de error de imagen
 */
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

// ==========================================
// INICIALIZACIÓN DE EVENTOS PARA SCROLL E IMÁGENES
// ==========================================

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
  }, 150); // Reducido de 200ms a 150ms
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
  setupUnifiedObserver();

  setTimeout(() => {
    processAllExistingImages();
  }, 500);
});

// ==========================================
// EXPOSICIÓN GLOBAL CONTROLADA
// ==========================================

// Exposición global controlada
if (typeof window !== 'undefined') {
  window.initializeFileAttachmentHandlers = initializeFileAttachmentHandlers;
  // imageUrlCache ahora se importa del módulo dedicado
  window.imageUrlCache = imageUrlCache;
}

// ==========================================
// EXPORTACIONES PRINCIPALES
// ==========================================

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
  applyHighlighting
};