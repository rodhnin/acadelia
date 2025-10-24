/**
 * message-renderer.js - Sistema optimizado de renderizado de mensajes basado en tipos
 * Versión optimizada para seguridad, rendimiento y mantenibilidad
 * 🦫 INTEGRADO CON SISTEMA DE NOTIFICACIONES ACADEL
 * ✅ REFACTORIZADO: Usa sistema avanzado de procesamiento de imágenes del PDF
 */
import { APP_CONFIG } from '../core/config-teorico.js';
import { getElement } from './ui-manager-teorico.js';
import {
  parseMarkdownToHTML,
  detectTableInText,
  createCodeBlockHTML,
  detectAndProcessCode,
  createTableHTML,
} from '../utils/markdown-teorico.js';
import { renderExam } from '../components/exam-renderer-teorico.js';
import { copyToClipboard } from '../utils/clipboard-teorico.js';
import {
  createElement,
  createElementWithHTML,
  addEvent,
  clearElement,
  setManagedTimeout,
  sanitizeText
} from '../../shared/dom-helpers.js';
import { 
  initializeMermaidDiagram,
  initMermaidSystem
} from '../../shared/mermaid-utils.js';
// Importar contentProcessing desde el nuevo archivo
import contentProcessing, { detectMultimodalContent, cleanMultimodalExistingContent } from './content-processing-teorico.js';

// ==========================================
// ✅ NUEVA IMPORTACIÓN: PROCESADOR DE IMÁGENES OPTIMIZADO DEL PDF
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
let mermaidObserverInitialized = false;

/**
 * Inicializa y registra todos los renderizadores
 * Se llama automáticamente cuando se necesita
 */
export function initializeMessageRenderers() {
  if (renderersInitialized) return;

  // Registrar todos los renderizadores básicos
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

  // ✅ CARGA EL CACHE DEL SISTEMA EXTERNO
  imageUrlCache.loadFromStorage();

  // Inicializar el procesador de contenido multimodal
  contentProcessing.initialize({
    initializeFileAttachmentHandlers: initializeFileAttachmentHandlers
  });

  // Inicializar limpieza para mensajes existentes
  initializeCleanupForExistingMessages();
  
  // Inicializar observador para Mermaid
  initializeMermaidObserver();

  renderersInitialized = true;
}

/**
 * Inicializa el proceso de limpieza automática para mensajes multimodales
 */
function initializeCleanupForExistingMessages() {
  const scheduleCleanup = (delay, id) => {
    if (typeof setManagedTimeout === 'function') {
      setManagedTimeout(performInitialCleanup, delay, id);
    } else {
      setTimeout(performInitialCleanup, delay);
    }
  };

  // Ejecutar limpieza inmediatamente
  scheduleCleanup(0, 'initial-cleanup');

  // Ejecutar después del DOM completamente cargado
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleCleanup(500, 'delayed-cleanup');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleCleanup(500, 'dom-ready-cleanup');
    });
  }

  // Ejecutar cuando se cambia de chat
  window.addEventListener('popstate', () => {
    scheduleCleanup(500, 'popstate-cleanup');
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
    
    // Obtener datos del archivo
    const fileName = fileElement.getAttribute('data-file-name') || '';
    const fileType = fileElement.getAttribute('data-file-type') || 'document';
    const language = fileElement.getAttribute('data-language') || '';
    const originalMessage = fileElement.getAttribute('data-original-message') || '';
    
    // Hacer el elemento clickeable con cursor y estilo
    fileElement.style.cursor = 'pointer';
    fileElement.style.color = 'var(--primary-color)';
    fileElement.style.textDecoration = 'underline';
    
    // Agregar evento de clic
    fileElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      handleFilePreview(fileType, fileName, language, originalMessage);
    });
    
    // Marcar como inicializado para evitar duplicar eventos
    fileElement.setAttribute('data-handler-attached', 'true');
  });
  
  // Verificar si ya existe un botón de expansión para evitar duplicados
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
      // Crear un ID único para este archivo
      const tempId = `temp-file-${Date.now()}`;
      window.showFilePreview(tempId, fileType);
      return;
    } catch (error) {
      console.error('Error mostrando vista previa del archivo:', error);
    }
  }
  
  // Alternativa: usar el panel de vista previa directamente
  try {
    // Importar el módulo de vista previa
    import('../components/preview-panel-pdf.js')
      .then(module => {
        if (typeof module.showPreviewPanel === 'function') {
          // Preparar datos según el tipo de archivo
          let previewData = {};
          
          if (fileType === 'document') {
            let textContent = extractDocumentContent(originalMessage, fileName);
            
            // Mejorar presentación
            previewData = {
              codeContent: `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 15px; font-family: 'Consolas', monospace; font-size: 14px; line-height: 1.6;">${textContent}</pre>`,
              title: fileName,
              language: 'text',
              isDocument: true
            };
          } else if (fileType === 'code') {
            // Extraer código específico para este archivo
            let code = extractCodeContent(originalMessage, fileName);
            
            previewData = {
              code: code,
              language: language,
              title: fileName
            };
          }
          
          // Definir el tipo correcto para la vista previa
          const previewType = fileType === 'document' ? 'code' : fileType;
          
          // Mostrar panel con datos del archivo
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
      
    // Decodificar el mensaje limpio
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
      // Si no se encontró un patrón claro, buscar múltiples saltos de línea como separador
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
    // 🦫 CAMBIO: Error más amigable
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
    
    // Decodificar el mensaje sanitizado
    const decodedMessage = decodeURIComponent(cleanedMessage);
    
    // PASO 3: Normalizar el nombre del archivo eliminando comillas si las tiene
    const normalizedFileName = fileName.replace(/^["']|["']$/g, '');
    
    // PASO 4: Construir un patrón para buscar el bloque de código específico para este archivo
    const codeBlockPattern = new RegExp(`Código de ["']?${normalizedFileName}["']?[^\\n]*:\\s*\`\`\`[\\w]*\\s*([\\s\\S]*?)(?=\`\`\`|$)`, 'i');
    
    // Buscar el bloque específico
    const codeMatch = decodedMessage.match(codeBlockPattern);
    
    // Si encontramos el bloque, devolver su contenido
    if (codeMatch && codeMatch[1]) {
      // Sanitizar cualquier HTML restante
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
      // Sanitizar cualquier HTML restante
      return genericMatch[1].trim()
        .replace(/<a\s+[^>]*>/gi, '')
        .replace(/<\/a>/gi, '')
        .replace(/<em>/gi, '')
        .replace(/<\/em>/gi, '')
        .replace(/<[^>]*>/g, '');
    }
    
    return `// Acadel buscó por todas partes pero no encontró código para: ${normalizedFileName}\n// ¿Estás seguro de que hay código aquí?`;
  } catch (e) {
    // 🦫 CAMBIO: Error más amigable
    acadelError(
      "Error extrayendo código", 
      `Acadel tuvo problemas extrayendo el código de "${fileName}": ${e.message}`
    );
    return '// Acadel se confundió extrayendo el código: ' + e.message;
  }
}

// ==========================================
// ✅ PROCESAMIENTO DE IMÁGENES OPTIMIZADO - INTEGRADO DEL PDF
// ==========================================

/**
 * ✅ NUEVA FUNCIÓN: Procesa imágenes externas inmediatamente usando el sistema del PDF
 * @param {HTMLElement} container - Contenedor con imágenes
 * @param {NodeList} externalImages - Lista de imágenes externas (opcional)
 */
async function processExternalImagesRealTime(container, externalImages) {
  if (!externalImages) {
    externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
  }
  
  if (externalImages.length === 0) {
    console.log('🖼️ [REALTIME] No hay imágenes externas para procesar');
    return { total: 0, successful: 0, failed: 0 };
  }

  console.log(`🖼️ [REALTIME] Procesando ${externalImages.length} imágenes INMEDIATAMENTE`);
  
  // ✅ USAR EL SISTEMA OPTIMIZADO DEL PDF
  const result = await processImagesOptimized(container, externalImages);
  
  console.log(`🎉 [REALTIME] Procesamiento completado: ${result.successful}/${result.total} imágenes`);
  
  return result;
}

/**
 * ✅ REFACTORIZADO: Usa el sistema de manejo de imágenes del PDF
 * @param {HTMLElement} container - Contenedor con imágenes
 */
function initializeImagePreviewHandlersOptimized(container) {
  // ✅ DELEGAR AL SISTEMA OPTIMIZADO DEL PDF
  return initializeImagePreviewHandlers(container);
}

/**
 * ✅ REFACTORIZADO: Maneja errores de imagen usando el nuevo sistema del PDF
 * @param {HTMLElement} img - Elemento de imagen con error
 * @param {string} mode - Modo de manejo ('inline' o 'modal')
 * @param {Object} options - Opciones adicionales
 */
function handleImageErrorOptimized(img, mode = 'inline', options = {}) {
  // ✅ DELEGAR AL SISTEMA NUEVO DEL PDF
  return handleImageError(img, mode, {
    isMultimodal: options.isMultimodal || false,
    imageCount: options.imageCount || 1,
    chatId: options.chatId || getChatId(),
    cacheFailure: true,
    modalTitle: options.modalTitle || 'Imagen no disponible'
  });
}

/**
 * Inicializa un observador para detectar nuevos diagramas Mermaid
 * y renderizarlos automáticamente
 */
function initializeMermaidObserver() {
  if (mermaidObserverInitialized) return;
  
  console.log("🦫 Acadel: Inicializando observador de Mermaid");
  
  // Delegar completamente al sistema centralizado en mermaid-utils.js
  initMermaidSystem()
    .then(() => {
      console.log("🦫 Acadel: Sistema Mermaid inicializado correctamente");
      mermaidObserverInitialized = true;
    })
    .catch(error => {
      console.error("🦫 Acadel: Error inicializando sistema Mermaid:", error);
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

  // Configurar observer para nuevos mensajes
  setupCleanupObserver();
}

/**
 * Configura un observador para la limpieza automática de nuevos mensajes
 */
function setupCleanupObserver() {
  // Acumular elementos para procesar en lotes
  let pendingElements = [];
  let processingScheduled = false;
  
  // Función para procesar elementos acumulados
  const processPendingElements = () => {
    const elementsToProcess = [...pendingElements];
    pendingElements = [];
    processingScheduled = false;
    
    // Procesar todos los elementos en un solo batch
    const uniqueElements = new Set(elementsToProcess);
    uniqueElements.forEach(element => {
      if (element && element.isConnected) {
        cleanMultimodalExistingContent(element);
        processMermaidDiagrams(element);
        
        // ✅ PROCESAMIENTO DE IMÁGENES OPTIMIZADO INTEGRADO
        const externalImages = element.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
        if (externalImages.length > 0) {
          processExternalImagesRealTime(element, externalImages);
        }
      }
    });
  };
  
  // Crear un observador optimizado que acumule cambios
  const observer = new MutationObserver(mutations => {
    let hasNewContent = false;
    
    // Procesar todas las mutaciones para identificar elementos
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        hasNewContent = true;
        
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Solo nodos de elemento
            // Verificar si es un mensaje o contiene mensajes
            const messages = node.classList?.contains('message') 
              ? [node]
              : Array.from(node.querySelectorAll('.message'));
              
            messages.forEach(message => {
              const contentElement = message.querySelector('.message-content');
              if (contentElement) {
                pendingElements.push(contentElement);
              }
            });
          }
        });
      }
    }
    
    // Si hay nuevos contenidos y no hay procesamiento programado, programar uno
    if (hasNewContent && !processingScheduled) {
      processingScheduled = true;
      // Usar requestAnimationFrame para optimizar rendimiento
      requestAnimationFrame(() => {
        setManagedTimeout(processPendingElements, 100, 'cleanup-observer');
      });
    }
  });

  // Observar cambios en el contenedor de mensajes
  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    observer.observe(chatMessages, {
      childList: true,
      subtree: true
    });
  }
}

/**
 * Procesa diagramas Mermaid en un elemento
 * @param {HTMLElement} element - Elemento contenedor
 */
function processMermaidDiagrams(element) {
  // Verificar si hay diagramas Mermaid no procesados
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
  
  // Verificar bloques explícitos de mermaid
  const explicitMatches = [...text.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  if (explicitMatches.length > 0) {
    mermaidMatches.push(...explicitMatches);
    return mermaidMatches;
  }
  
  // Verificar bloques de código sin lenguaje pero con contenido Mermaid
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
  
  // Buscar bloques de código Mermaid explícitos
  const mermaidBlockMatches = [...text.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  for (const match of mermaidBlockMatches) {
    // Limpiar y normalizar el código extraído
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
  
  // Buscar bloques de código sin lenguaje pero con contenido Mermaid
  const codeBlockMatches = [...text.matchAll(/```\s*\n([\s\S]*?)```/g)];
  
  for (const match of codeBlockMatches) {
    const rawCode = match[1].trim();
    // Verificar si es código Mermaid
    if (MERMAID_TYPE_PATTERN.test(rawCode)) {
      // Normalizar el código
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
  
  // Eliminar puntos y coma después del tipo de diagrama
  normalizedCode = normalizedCode.replace(new RegExp(`^(${diagramType}(?:-v2)?);`, 'm'), '$1\n');
  
  // 3. Caso especial para diagramas de clase
  if (diagramType.toLowerCase().includes('classdiagram')) {
    // Normalizar caracteres especiales/acentuados en clases
    const accentMap = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
      'ñ': 'n', 'Ñ': 'N'
    };
    
    // Procesar línea por línea para mayor control
    const lines = normalizedCode.split('\n');
    const processedLines = [];
    
    // Reemplazar acentos en todo el código primero
    if (/[áéíóúÁÉÍÓÚñÑ]/.test(normalizedCode)) {
      for (let i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace(/[áéíóúÁÉÍÓÚñÑ]/g, match => accentMap[match] || match);
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Eliminar punto y coma al principio del diagrama
      if (line.startsWith('classDiagram;')) {
        line = 'classDiagram';
      }
      
      // Manejar relaciones de herencia (<|--)
      if (line.includes('<|--')) {
        // Quitar punto y coma al final
        if (line.endsWith(';')) {
          line = line.substring(0, line.length - 1);
        }
        
        // Asegurar espacios adecuados alrededor del operador de herencia
        line = line.replace(/([^\s])<\|--([^\s])/, '$1 <|-- $2')
                  .replace(/([^\s])<\|--\s/, '$1 <|-- ')
                  .replace(/\s<\|--([^\s])/, ' <|-- $1');
        
        processedLines.push(line);
      }
      // Manejar relaciones de asociación (-->)
      else if (line.includes('-->')) {
        // Quitar punto y coma al final
        if (line.endsWith(';')) {
          line = line.substring(0, line.length - 1);
        }
        
        // Asegurar espacios adecuados alrededor del operador de asociación
        line = line.replace(/([^\s])-->([^\s])/, '$1 --> $2')
                  .replace(/([^\s])-->\s/, '$1 --> ')
                  .replace(/\s-->([^\s])/, ' --> $1');
        
        processedLines.push(line);
      }
      // Manejar múltiples relaciones en la misma línea
      else if (line.includes(';') && (line.includes('-->') || line.includes('<|--'))) {
        // Separar por punto y coma y procesar cada relación
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
    
    // Arreglar cualquier línea de class que tenga problemas
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
 * Extraer texto alrededor de un diagrama Mermaid
 * @param {string} text - Texto completo
 * @param {Object} diagramInfo - Información del diagrama
 * @param {boolean} before - Si extraer texto antes (true) o después (false)
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
 * @param {Object} diagram1 - Primer diagrama
 * @param {Object} diagram2 - Segundo diagrama
 * @returns {string} Texto entre diagramas
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
  // Validación básica
  if (!content) {
    return { type: MESSAGE_TYPES.MESSAGE, content: '' };
  }

  // Caso 1: Es un objeto
  if (typeof content === 'object' && content !== null) {
    // Si tiene un tipo explícito, procesarlo
    if (content.type) {
      return processExplicitTypeObject(content);
    }

    // Detectar por estructura
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
 * @returns {Object} Objeto procesado
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
 * @returns {Object} Objeto procesado
 */
function detectTypeByStructure(content) {
  // Detectar imagen por propiedades
  if (content.url && (content.caption || content.prompt)) {
    return {
      type: MESSAGE_TYPES.IMAGE,
      content: content
    };
  }

  // Verificar si es código por estructura
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
 * @returns {Object} Objeto procesado
 */
function processStringContent(content) {
  // Verificar si es JSON
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(content);

      // Verificar si el objeto parseado es una imagen
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
 * Renderiza un mensaje con múltiples diagramas Mermaid
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {string|Object} content - Contenido con código Mermaid
 */
function renderMermaidMessage(container, content) {
  try {
    // Crear contenedor principal para el mensaje
    const messageWithDiagrams = createElement('div', { className: 'message-with-diagrams' });
    
    // Extraer todos los diagramas Mermaid
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
    
    // Procesar cada diagrama
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
      
      // Agregar evento para expandir
      addEvent(expandButton, 'click', () => {
        if (typeof window.showMermaidPreview === 'function') {
          window.showMermaidPreview(expandButton);
        } else {
          // Fallback
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
    
    // Agregar al contenedor
    container.appendChild(messageWithDiagrams);
    
    // Renderizar todos los diagramas con un ligero retraso entre ellos
    mermaidDiagrams.forEach((diagram, index) => {
      const uniqueId = container.querySelector(`.mermaid-diagram[data-diagram-index="${index}"]`)?.id;
      if (uniqueId) {
        // Usar función centralizada en mermaid-utils
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
 * ✅ REFACTORIZADO: Renderiza un mensaje de texto con procesamiento optimizado de imágenes
 * @param {HTMLElement} container - Contenedor donde renderizar
 * @param {string} content - Contenido del mensaje
 * @param {string} role - Rol del mensaje (user o ai)
 */
function renderTextMessage(container, content, role = '') {
  // VERIFICACIÓN CRÍTICA: Si es mensaje de IA, NO procesar como multimodal
  const isAIMessage = role === 'ai' || role === 'assistant';
  
  if (!isAIMessage) {
    // Solo procesar como multimodal si es mensaje de usuario
    const processedContent = detectMultimodalContent(content, false);

    // Si el contenido cambió, es porque se procesó un mensaje multimodal
    if (processedContent !== content && typeof processedContent === 'string') {
      container.innerHTML = processedContent;
      
      // Inicializar manejadores para archivos adjuntos
      if (processedContent.includes('file-name-clickable')) {
        initializeFileAttachmentHandlers(container);
      }
      
      return;
    }
  }

  // Continuar con el comportamiento normal para contenido no multimodal o mensajes de IA
  const safeContent = typeof content === 'string' ? content : String(content);

  // Verificar si contiene un diagrama Mermaid
  if (containsMermaidDiagram(safeContent)) {
    renderMermaidMessage(container, safeContent);
    return;
  }

  // Si hay tablas markdown pero no bloques de código, usar el renderizador de tablas
  const tableResult = detectTableInText(safeContent);
  if (tableResult.success && !safeContent.includes('```')) {
    // Verificación ADICIONAL para confirmar que es una tabla markdown válida
    const hasValidTableStructure = /\|\s*[-:]+\s*\|/.test(safeContent) && 
                                /^\s*\|.*\|\s*$[\r\n]+\s*\|[\s-:]+\|/m.test(safeContent);
    
    if (hasValidTableStructure) {
      container.innerHTML = tableResult.html;

      // Asegurarnos de agregar el botón de expansión
      setManagedTimeout(() => {
        addExpandButton(container, {
          content: tableResult.html,
          title: 'Tabla de datos',
          type: 'table'
        });
      }, 0, 'add-table-expand-button');
      return;
    }
  }

  // Si hay bloques de código, usar detectAndProcessCode de markdown.js
  if (safeContent.includes('```')) {
    const codeResult = detectAndProcessCode(safeContent);
    if (codeResult.success) {
      container.innerHTML = codeResult.html;

      // Configurar botones de copia
      setupCodeBlocksInteractivity(container);

      // Agregar botón para expandir el código SOLO si no hay diagramas Mermaid
      setManagedTimeout(() => {
        // Evitar añadir botón si ya existe o si hay diagramas Mermaid
        if (!container.querySelector('.expand-content-btn') && !container.querySelector('.mermaid-diagram')) {
          addExpandButton(container, {
            content: container.innerHTML,
            title: 'Bloques de código',
            type: 'code'
          });
        }
      }, 0, 'add-code-expand-button');
      return;
    }
  }

  // Detectar si hay imágenes en el contenido
  const hasImages = safeContent.includes('![') || safeContent.includes('<img');

  // Para contenido simple, renderizar markdown directamente
  container.innerHTML = parseMarkdownToHTML(safeContent);
  
  if (hasImages) {
    // ⭐ SOLO procesar si NO es contenido multimodal del usuario
    if (!container.querySelector('.multimodal-container .chat-image-item')) {
      // ✅ USAR SISTEMA OPTIMIZADO DEL PDF
      initializeImagePreviewHandlersOptimized(container);
    }
  } else {
    // Verificar explícitamente imágenes que necesitan procesamiento
    const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    if (externalImages.length > 0 && !container.querySelector('.multimodal-container .chat-image-item')) {
      // ✅ USAR SISTEMA OPTIMIZADO DEL PDF
      initializeImagePreviewHandlersOptimized(container);
    }
  }
}

/**
 * Configura la interactividad de los bloques de código
 * @param {HTMLElement} container - Contenedor con bloques de código
 */
function setupCodeBlocksInteractivity(container) {
  // Aplicar highlight.js
  if (window.hljs) {
    container.querySelectorAll('pre code').forEach(block => {
      try {
        window.hljs.highlightElement(block);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  // Configurar botones de copia utilizando clipboard.js
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

  // Verificar si el contenedor tiene un diagrama Mermaid
  const hasMermaidDiagram = container.querySelector('.mermaid-diagram') !== null;
  
  // Agregar botón para expandir el código solo si no hay diagramas Mermaid
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
 * @param {string} [explicitType] - Tipo de contenido (opcional)
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

  // Determinar el tipo de contenido (del parámetro explícito o del objeto data)
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

  // Crear el botón
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

  // Preparar datos para la vista previa
  const dataKey = type === 'table' ? 'tableContent' :
    type === 'code' ? 'codeContent' : 'content';

  const previewData = {
    [dataKey]: data.content,
    title: data.title || config.text
  };

  // Configurar el evento de clic
  addEvent(expandButton, 'click', () => {
    // Verificar si el panel está abierto
    const isPanelOpen = document.querySelector('#preview-panel')?.classList.contains('open');

    if (isPanelOpen) {
      // Si está abierto, cerrarlo
      if (typeof window.closePreviewPanel === 'function') {
        window.closePreviewPanel();
      } else {
        // Importar dinámicamente
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
        // Importar dinámicamente
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

  // Añadir al contenedor
  container.appendChild(expandButton);
}

/**
 * Renderiza un mensaje de examen
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Datos del examen
 */
function renderExamMessage(container, content) {
  // Preparar el contenedor
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
    
  } catch (error) {
    renderErrorContent(examContainer, 'Error al cargar el examen', error.message);
  }
}

/**
 * Extrae el contenido textual de la respuesta del servidor
 * @param {Object} data - Datos de la respuesta
 * @returns {string|null} - Contenido textual o null
 */
function extractTextContent(data) {
  // Priorizar campos específicos para texto
  const textProps = ['answer', 'content', 'message', 'text', 'response'];

  for (const prop of textProps) {
    if (typeof data[prop] === 'string' && data[prop].trim()) {
      return data[prop];
    }
  }

  // Buscar en propiedades anidadas
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

  // Intentar convertir objetos como último recurso
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
 * Renderiza un mensaje de código con resaltado de sintaxis
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object|string} content - Contenido con código y lenguaje
 */
function renderCodeMessage(container, content) {
  try {
    // Normalizar el contenido
    const codeData = normalizeCodeContent(content);

    // Validar código
    if (!codeData.code.trim()) {
      renderErrorContent(container, 'No se proporcionó código para renderizar');
      return;
    }

    // Usar createCodeBlockHTML de markdown.js para generar el HTML
    container.innerHTML = createCodeBlockHTML(codeData.code, codeData.language);

    // Aplicar highlight.js y configurar botón de copia
    setupCodeBlockHighlighting(container);

    // Configurar botón de copia utilizando clipboard.js
    const copyBtn = container.querySelector('.copy-button');
    if (copyBtn) {
      addEvent(copyBtn, 'click', () => {
        copyToClipboard(codeData.code, { button: copyBtn });
      });
    }

    // Añadir botón de expansión
    addExpandButton(container, {
      content: codeData,
      title: `Código ${codeData.language}`,
      type: 'code'
    });
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

  // Procesar bloques markdown
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

/**
 * Renderiza un mensaje tipo tabla
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object|string} content - Datos de la tabla
 */
function renderTableMessage(container, content) {
  try {
    // Procesar diferentes formatos de datos de tabla
    const tableData = processTableData(content);

    if (tableData) {
      // Renderizar la tabla
      container.innerHTML = tableData.html;

      // Añadir botón de expansión
      setManagedTimeout(() => {
        addExpandButton(container, {
          content: tableData.html,
          title: tableData.caption || 'Tabla de datos',
          type: 'table'
        });
      }, 200, 'add-table-expand-button');
      
    } else {
      renderErrorContent(container, 'No se pudo renderizar la tabla con los datos proporcionados');

      // Aún así, mostrar datos originales
      setManagedTimeout(() => {
        addExpandButton(container, {
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          title: 'Datos originales',
          type: 'table'
        });
      }, 0, 'add-original-data-button');
    }
  } catch (error) {
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
    // Buscar en data
    if (content.data && typeof content.data === 'object' &&
      Array.isArray(content.data.headers) && Array.isArray(content.data.rows)) {
      return {
        html: createTableHTML(content.data.headers, content.data.rows),
        caption: content.data.caption || 'Tabla de datos'
      };
    }

    // Buscar en table
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
    // Intentar parsear como JSON
    try {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        const parsed = JSON.parse(content);
        return processTableData(parsed); // Llamada recursiva
      }
    } catch (e) {
      // Verificar si es tabla markdown
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

/**
 * ✅ REFACTORIZADO: Renderiza un mensaje de imagen - VERSIÓN CORREGIDA CON SISTEMA DEL PDF
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object|string} content - Datos de la imagen
 */
function renderImageMessage(container, content) {
  try {
    console.log('🖼️ [DEBUG] Renderizando imagen, content recibido:', content);
    
    // Normalizar estructura de contenido con mejor manejo de anidamiento
    let imageData;
    
    if (typeof content === 'string') {
      try {
        imageData = JSON.parse(content);
      } catch (e) {
        console.error('❌ Error parseando content string:', e);
        renderErrorContent(container, 'Error procesando datos de imagen');
        return;
      }
    } else if (typeof content === 'object' && content !== null) {
      imageData = content;
    } else {
      console.error('❌ Tipo de content inválido:', typeof content);
      renderErrorContent(container, 'Formato de imagen inválido');
      return;
    }

    console.log('🖼️ [DEBUG] ImageData procesado:', imageData);

    // Extraer URL de imagen con múltiples fallbacks
    let imageUrl = '';
    
    // Método 1: URL directa
    if (imageData.url) {
      imageUrl = imageData.url;
      console.log('✅ [DEBUG] URL encontrada en imageData.url:', imageUrl);
    }
    // Método 2: En data anidado
    else if (imageData.data && imageData.data.url) {
      imageUrl = imageData.data.url;
      console.log('✅ [DEBUG] URL encontrada en imageData.data.url:', imageUrl);
    }
    // Método 3: En response anidado
    else if (imageData.response && imageData.response.url) {
      imageUrl = imageData.response.url;
      console.log('✅ [DEBUG] URL encontrada en imageData.response.url:', imageUrl);
    }
    // Método 4: Buscar en todas las propiedades por URL-like strings
    else {
      const findUrlInObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string' && (
            value.startsWith('http') || 
            value.startsWith('/uploads') || 
            value.startsWith('data:image') ||
            value.includes('.webp') ||
            value.includes('.jpg') ||
            value.includes('.png')
          )) {
            console.log(`✅ [DEBUG] URL encontrada en ${currentPath}:`, value);
            return value;
          }
          
          if (typeof value === 'object' && value !== null) {
            const nestedUrl = findUrlInObject(value, currentPath);
            if (nestedUrl) return nestedUrl;
          }
        }
        return null;
      };
      
      imageUrl = findUrlInObject(imageData) || '';
    }

    console.log('🖼️ [DEBUG] URL final extraída:', imageUrl);

    // Verificar si hay URL válida
    if (!imageUrl || imageUrl.trim() === '') {
      console.error('❌ [DEBUG] No se encontró URL de imagen en:', imageData);
      renderErrorContent(container, 'No se pudo extraer la URL de la imagen generada');
      return;
    }

    // Extraer otras propiedades con fallbacks mejorados
    const altText = imageData.caption || imageData.data?.caption || imageData.prompt || imageData.data?.prompt || 'Imagen generada por Dr. Acadel';
    const originalUrl = imageData.originalUrl || imageData.data?.originalUrl || imageUrl;
    const isLocallyStored = imageData.locallyStored || imageData.data?.locallyStored || imageUrl.includes('/uploads');

    console.log('🖼️ [DEBUG] Propiedades extraídas:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      altText,
      isLocallyStored
    });

    // Sanitizar URLs
    const safeImageUrl = sanitizeText(imageUrl);
    const safeOriginalUrl = originalUrl ? sanitizeText(originalUrl) : '';

    // Crear estructura multimodal para la imagen
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

    // Configurar manejadores de eventos
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
        console.log('✅ [DEBUG] Imagen cargada exitosamente');
      });

      // Mejorar manejo de errores de carga
      addEvent(imgElement, 'error', () => {
        console.error('❌ [DEBUG] Error cargando imagen:', safeImageUrl);
        
        // Si tenemos URL original como respaldo y es diferente de la URL actual
        const backupSrc = imgElement.getAttribute('data-backup-src');
        if (backupSrc && backupSrc !== imgElement.src) {
          console.log('🔄 [DEBUG] Intentando con URL de respaldo:', backupSrc);
          imgElement.src = backupSrc;
          return;
        }

        // Mostrar placeholder cuando todo falla
        imgElement.style.display = 'none';
        const placeholder = imgContainer.querySelector('.image-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        
        acadelWarning(
          "👻 Imagen fantasma detectada", 
          "Dr. Acadel generó la imagen pero no pudo mostrarla. Parece que se volvió invisible."
        );
      });
    }

    // ✅ INICIALIZAR MANEJADORES OPTIMIZADOS PARA PROCESAMIENTO DE IMÁGENES
    initializeImagePreviewHandlersOptimized(container);

    console.log('✅ [DEBUG] Imagen renderizada exitosamente');

  } catch (error) {
    console.error('❌ [DEBUG] Error en renderImageMessage:', error);
    console.error('❌ [DEBUG] Content que causó error:', content);
    
    acadelError(
      "Error procesando imagen", 
      `Dr. Acadel tuvo problemas técnicos con la imagen: ${error.message}`
    );
    renderErrorContent(container, 'Error técnico al mostrar la imagen', error.message);
  }
}

/**
 * Renderiza un mensaje de error
 * @param {HTMLElement} container - Contenedor del mensaje
 * @param {Object} content - Objeto con mensaje de error y mensaje original
 */
function renderErrorMessage(container, content) {
    const errorMessage = content.errorMessage || 'Error desconocido';
    
    // 🦫 Mensajes graciosos de Acadel para diferentes tipos de error (enseñanza general)
    const acadelErrorMessages = [
        "🦫 ¡Ups! Parece que mi cerebro de capibara tuvo un cortocircuito. Como cuando intentas estudiar sin cafeína...",
        "🦫 Mi peludo intelecto se trabó como estudiante en examen final. ¡Pero tranquilo, no es grave!",
        "🦫 Error detectado: mi sabiduría capibarina necesita un momento de meditación acuática 💭",
        "🦫 ¡Rayos! Me pasó como a esos conceptos que parecían obvios pero no... ¡El misterio continúa!",
        "🦫 Mi procesador peludo dice 'no encontrado'. Es como buscar una respuesta en un libro sin índice 📚",
        "🦫 ¡Oops! Parece que mi conexión neuronal tuvo una crisis existencial. Típico de lunes...",
        "🦫 Error 404: Sabiduría temporalmente en la piscina. Los capibaras necesitamos nuestros descansos acuáticos 🌊"
    ];
    
    // 🦫 Consejos graciosos para el usuario (enseñanza general)
    const acadelAdvice = [
        "Mientras tanto, ¿qué tal si repasas esos apuntes que tienes pendientes? 📝",
        "Aprovecha para hidratarte, como buen capibara recomiendo agua abundante 💧",
        "Momento perfecto para estirar esas neuronas con un poco de lectura básica 🧠",
        "¿Has intentado contar hasta 10 en diferentes idiomas? ¡Es relajante!",
        "Respira profundo y recuerda: incluso Einstein tuvo días malos 😌",
        "Tiempo perfecto para una pausa capibarina: ¡medita como los grandes sabios peludos! 🧘‍♂️",
        "¿Sabías que los capibaras resolvemos problemas mejor después de un chapuzón mental? 🏊‍♂️"
    ];
    
    const randomMessage = acadelErrorMessages[Math.floor(Math.random() * acadelErrorMessages.length)];
    const randomAdvice = acadelAdvice[Math.floor(Math.random() * acadelAdvice.length)];
    
    // 🦫 ESTRUCTURA EXACTA CON INLINE STYLES COMO EN cancelCurrentRequest()
    const errorContainer = createElement('div', { className: 'cancelled-message' });
    // Aplicar inline styles exactos de la función que funciona
    errorContainer.style.display = 'flex';
    errorContainer.style.alignItems = 'center';
    errorContainer.style.gap = '8px';
    errorContainer.style.padding = '12px';
    errorContainer.style.color = '#666';
    errorContainer.style.backgroundColor = 'rgba(231,76,60,0.05)';
    errorContainer.style.borderRadius = '8px';
    errorContainer.style.margin = '5px 0';
    errorContainer.style.borderLeft = '3px solid rgba(231,76,60,0.3)';
    
    // 🦫 Icono divertido de Acadel confundido
    const icon = createElement('i', { className: 'bx bx-confused' });
    icon.style.fontSize = '1.3rem';
    icon.style.color = '#e74c3c';
    errorContainer.appendChild(icon);
    
    // 🦫 Span con el mensaje principal
    const errorSpan = createElement('span', {}, randomMessage);
    errorContainer.appendChild(errorSpan);
    
    // 🦫 Detalles adicionales con inline styles
    const errorDetails = createElement('div', { className: 'cancelled-details' });
    errorDetails.style.fontSize = '0.85rem';
    errorDetails.style.color = '#888';
    errorDetails.style.margin = '8px 0 0 20px';
    
    errorDetails.innerHTML = `
        <p><strong>💡 Consejo del Profesor Acadel:</strong> ${randomAdvice}</p>
        <p>💪 ¡El conocimiento no se detiene por errores técnicos! ¡Sigamos aprendiendo!</p>
    `;
    
    clearElement(container);
    container.appendChild(errorContainer);
    container.appendChild(errorDetails);
    
    // 🦫 Notificación de error específica pero amigable
    if (window.acadelInfo) {
        acadelInfo(
            "🦫 Momento de pausa capibarina",
            "Acadel necesita un segundo para reorganizar sus ideas peludas"
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

  const icon = createElement('i', { className: 'bx bx-dizzy' }); // 🦫 CAMBIO: Icono más expresivo
  errorContainer.appendChild(icon);

  // 🦫 CAMBIO: Texto más divertido
  const titleElem = createElement('p', {}, `🦫 ${sanitizeText(title)}`);
  errorContainer.appendChild(titleElem);

  if (details) {
    const detailsElem = createElement('p', { className: 'error-details' }, `Detalles técnicos: ${sanitizeText(details)}`);
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
    // 🦫 CAMBIO: Título más personalizado
    const titleElem = createElement('h4', { className: 'alert-title' }, `🦫 Acadel ${type === 'info' ? 'informa' : type === 'warning' ? 'advierte' : type === 'success' ? 'celebra' : 'reporta'}: ${sanitizeText(title)}`);
    alertContent.appendChild(titleElem);
  }

  const messageElem = createElement('p', {}, sanitizeText(message));
  alertContent.appendChild(messageElem);

  alertMessage.appendChild(alertIcon);
  alertMessage.appendChild(alertContent);

  clearElement(container);
  container.appendChild(alertMessage);

  // 🦫 CAMBIO: Notificación según el tipo de alerta
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
    // 🦫 CAMBIO: Botones más atractivos
    const button = createElement('button', {
      className: 'action-button',
      dataset: { action: action.id }
    }, `🎯 ${sanitizeText(action.label)}`);

    // Agregar eventos a los botones
    addEvent(button, 'click', (e) => {
      // 🦫 CAMBIO: Notificación al hacer clic en acción
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

  // 🦫 CAMBIO: Notificación de acciones disponibles
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
    // 🦫 CAMBIO: Notificación cuando no hay mensajes
    acadelInfo(
      "💬 Chat vacío", 
      "Acadel está listo para una nueva conversación. ¡Pregúntame lo que quieras!"
    );
    return;
  }

  // Crear una copia para no modificar el array original y agregar metadatos
  const messagesWithMetadata = [...messages].map((msg, index) => {
    return {
      originalIndex: index,
      message: msg,
      timestamp: getMessageTimestamp(msg),
      role: (msg.role || '').toLowerCase()
    };
  });

  // Ordenar los mensajes por timestamp con mejor manejo de casos especiales
  const sortedMessages = messagesWithMetadata.sort((a, b) => {
    // Comparar timestamps si ambos existen
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

  // Renderizar los mensajes ordenados
  sortedMessages.forEach(item => {
    try {
      const msg = item.message;
      const role = msg.role?.toLowerCase();
      const isAI = role === 'assistant' || role === 'ai';

      // Intentar detectar si este es un mensaje multimodal basado en su contenido
      let contentToRender = msg.content || msg.message || '';
      let typeToUse = MESSAGE_TYPES.MESSAGE;

      // Lógica para detectar contenido multimodal y determinar el tipo
      if (typeof contentToRender === 'string' &&
        (contentToRender.includes('hasImage') || contentToRender.includes('imageCount') || 
         contentToRender.includes('Contenido del documento') || contentToRender.includes('Código de'))) {
        // Intentar procesarlo como multimodal si muestra indicios de serlo
        const processedContent = detectMultimodalContent(contentToRender, isAI);
        if (processedContent !== contentToRender) {
          contentToRender = processedContent;
        } else {
          // Si no se procesó como multimodal, determinar tipo normal
          const { type, content } = determineMessageType(contentToRender);
          typeToUse = type;
          contentToRender = content;
        }
      } else {
        // Lógica normal para mensajes no multimodales
        const { type, content } = determineMessageType(contentToRender);
        typeToUse = type;
        contentToRender = content;
      }

      // Renderizar el mensaje con el tipo y contenido determinados
      lastMessageElement = addMessageToChat(isAI ? 'ai' : 'user', contentToRender, typeToUse);

      // Almacenar el ID del servidor en el elemento del mensaje
      if (lastMessageElement && msg.id) {
        // Guardar el ID del servidor para futuras operaciones
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

  // Limpiar espacios excesivos en los mensajes multimodales existentes
  setManagedTimeout(() => {
    // Limpiar cualquier contenido multimodal problemático
    document.querySelectorAll('.message-content').forEach(messageContent => {
      cleanMultimodalExistingContent(messageContent);
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
        // Continuar con el siguiente campo
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

  // Crear el contenedor base del mensaje
  const messageDiv = createElement('div', {
    className: `message ${role === 'ai' ? 'ai-message' : 'user-message'}`
  });

  if (role === 'ai') {
    // Generar un ID único para el mensaje si no existe
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

    // Obtener y llamar al renderizador apropiado
    const renderer = getRenderer(type);
    renderer(contentElem, content, role);
  } else {
    // Mensajes de usuario con soporte para markdown
    const safeContent = typeof content === 'string' ? content : String(content);

    // Crear estructura básica del mensaje
    const contentDiv = createElement('div', { className: 'message-content' });
    const textDiv = createElement('div', { className: 'message-text' });
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);

    // Aplicar markdown
    if (typeof parseMarkdownToHTML === 'function') {
      textDiv.innerHTML = parseMarkdownToHTML(safeContent);
    } else {
      // Fallback temporal: solo convertir saltos de línea
      textDiv.innerHTML = sanitizeText(safeContent).replace(/\n/g, '<br data-nl="true">');

      // Intentar cargar dinámicamente el módulo markdown
      import('../utils/markdown-teorico.js').then(module => {
        if (module && module.parseMarkdownToHTML) {
          // Actualizar con markdown completo cuando esté disponible
          textDiv.innerHTML = module.parseMarkdownToHTML(safeContent);
        }
      }).catch(() => {
        // Error silencioso - continuar con el fallback
      });
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
    alt: "🦫 Acadel pensando"
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

  // Restaurar la imagen de perfil al estado normal
  const profileElement = loader.querySelector('.ai-profile');
  if (profileElement) {
    profileElement.classList.remove('thinking');
  }

  loader.classList.remove('processing');

  const contentElem = loader.querySelector('.message-content');
  if (!contentElem) return;

  clearElement(contentElem);

  // Renderizar según el tipo
  const renderer = getRenderer(type);
  renderer(contentElem, content, 'ai');

  // Aplicar highlight.js después de la inserción en DOM
  requestAnimationFrame(() => {
    if (window.hljs) {
      contentElem.querySelectorAll('pre code').forEach(block => {
        try {
          window.hljs.highlightElement(block);
        } catch (e) {
          // Error silencioso
        }
      });
    }

    // Efecto visual de renderizado completado
    loader.classList.add('rendered');
    setManagedTimeout(() => loader.classList.remove('rendered'), 50, 'remove-rendered-class');

    // Inicializar botones de interacción y hacer scroll
    initializeInteractionAndScroll(loader);
  });
}

/**
 * Función auxiliar para inicializar botones de interacción y realizar scroll
 * @param {HTMLElement} messageElement - Elemento del mensaje
 */
function initializeInteractionAndScroll(messageElement) {
  // Agregar botones de interacción una vez que el mensaje esté completamente renderizado
  setManagedTimeout(() => {
    import('../utils/response-interaction-teorico.js').then(module => {
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
 * Reemplaza el mensaje de carga con un mensaje de error
 * @param {HTMLElement} loadingMessage - Elemento de mensaje de carga
 * @param {string} errorMessage - Mensaje de error
 * @param {string} originalQuery - Consulta original (opcional)
 */
export function replaceWithError(loadingMessage, errorMessage, originalQuery = '') {
    if (!loadingMessage) return;
    
    // 🦫 Mensajes de error contextual según el tipo de problema (enseñanza general)
    const getContextualErrorMessage = (error) => {
        const errorLower = error.toLowerCase();
        
        if (errorLower.includes('network') || errorLower.includes('conexión') || errorLower.includes('connection')) {
            return "🦫 ¡Mi WiFi capibarina está más perdida que estudiante el primer día de clases! Las redes y yo tenemos una relación complicada...";
        }
        if (errorLower.includes('timeout') || errorLower.includes('tiempo')) {
            return "🦫 Me quedé pensando tanto en tu pregunta que el tiempo se agotó. ¡Como cuando intentas recordar todas las fórmulas en un examen!";
        }
        if (errorLower.includes('server') || errorLower.includes('servidor')) {
            return "🦫 El servidor está más saturado que biblioteca en época de finales. ¡Hasta la tecnología necesita descansos!";
        }
        if (errorLower.includes('404') || errorLower.includes('not found')) {
            return "🦫 Mi respuesta se escondió mejor que la página que necesitas en un libro de 1000 páginas. ¡El misterio educativo continúa!";
        }
        
        // Mensaje genérico gracioso (enseñanza general)
        const genericMessages = [
            "🦫 ¡Vaya! Mi cerebro peludo tuvo un momento de confusión cósmica. Pasa hasta en las mejores familias de capibaras...",
            "🦫 Error detectado en mi matriz capibarina. ¡Pero hey, los mejores profesores también tienen días complicados!",
            "🦫 Mi sabiduría acuática necesita recalibrarse. Es como cuando el proyector se desenfoca justo en la explicación crucial 📽️",
            "🦫 ¡Ups! Mi procesador peludo dice 'necesito una siesta'. Los genios también descansamos, ¿sabías?"
        ];
        
        return genericMessages[Math.floor(Math.random() * genericMessages.length)];
    };
    
    // 🦫 Frases motivacionales educativas para no desanimar
    const motivationalPhrases = [
        "💡 Recuerda: Los grandes descubrimientos requieren paciencia y perseverancia",
        "🎯 Cada error es una oportunidad de aprender algo nuevo",
        "⚡ La curiosidad no se detiene por contratiempos técnicos",
        "🌟 ¡Sigamos explorando los misterios del conocimiento juntos!",
        "📚 Como decía Sócrates: 'Solo sé que no sé nada' (y eso está bien)",
        "💪 Los mejores estudiantes son aquellos que nunca dejan de preguntarse 'por qué'"
    ];
    
    // Eliminar atributo de carga
    loadingMessage.removeAttribute('data-is-loading');
    
    // Eliminar clase de carga y añadir clases del CSS existente
    loadingMessage.classList.remove('processing');
    loadingMessage.classList.add('error-message');
    
    // Restaurar la imagen de perfil al estado normal
    const aiProfile = loadingMessage.querySelector('.ai-profile');
    if (aiProfile) {
        aiProfile.classList.remove('thinking');
    }
    
    // Buscar el contenedor de contenido o crear uno si no existe
    let messageContent = loadingMessage.querySelector('.message-content');
    if (!messageContent) {
        messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        loadingMessage.appendChild(messageContent);
    }
    
    // Limpiar cualquier contenido existente primero
    messageContent.innerHTML = '';
    
    const contextualMessage = getContextualErrorMessage(errorMessage);
    const randomMotivation = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
    
    // 🦫 ESTRUCTURA EXACTA CON INLINE STYLES COMO EN cancelCurrentRequest()
    const errorContent = `
        <div class="cancelled-message" style="display:flex;align-items:center;gap:8px;padding:12px;color:#666;background-color:rgba(231,76,60,0.05);border-radius:8px;margin:5px 0;border-left:3px solid rgba(231,76,60,0.3);">
            <i class="bx bx-confused" style="font-size:1.3rem;color:#e74c3c;"></i>
            <span>🦫 Momento de reflexión capibarina</span>
        </div>
        <div class="cancelled-details" style="font-size:0.85rem;color:#888;margin:8px 0 0 20px;">
            <p class="message-text">${contextualMessage}</p>
            <p class="message-text"><strong>💡 Consejo del Profesor Acadel:</strong> ${randomMotivation}</p>
            <p class="message-text">🌊 Mientras tanto, ¿qué tal si revisamos algún concepto interesante?</p>
        </div>
    `;
    
    // Actualizar el contenido
    messageContent.innerHTML = errorContent;
    
    // Agregar marcadores para prevenir limpieza automatizada
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
            // Fallback básico para scroll
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
    
    // 🦫 Cerrar loading y mostrar mensaje amigable
    if (window.acadelCerrar && window.acadelInfo) {
        // Cerrar cualquier loading activo
        document.querySelectorAll('.notificacion-acadel.loading').forEach(notification => {
            const id = notification.dataset.id;
            if (id) window.acadelCerrar(parseInt(id));
        });
        
        // Notificación amigable en lugar de error estresante
        acadelInfo(
            "🦫 Pausa para la reflexión",
            "Acadel está reorganizando sus ideas. ¡La enseñanza es así, requiere paciencia!"
        );
    }
}

/**
 * Procesa la respuesta del servidor para determinar el tipo de mensaje y su contenido
 * @param {Object} data - Datos recibidos del servidor
 * @returns {Object} Objeto con tipo y contenido procesado
 */
export function processServerResponse(data) {
  // Validación básica
  if (!data) {
    return { type: MESSAGE_TYPES.MESSAGE, content: 'Acadel no pudo procesar la respuesta del servidor' };
  }

  // Verificar tipos específicos
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
    // Normalizar la estructura de datos
    let examData = null;

    // Buscar datos del examen en diferentes lugares
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

  // Procesar contenido textual
  const answer = data.answer || data.content || data.message || '';

  // Intentar detectar JSON en el texto
  if (typeof answer === 'string' && answer.trim().startsWith('{') && answer.trim().endsWith('}')) {
    try {
      const parsedAnswer = JSON.parse(answer);

      // Para otros tipos especiales
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

/**
 * Función mejorada para procesar la respuesta del servidor
 * @param {Object} data - Respuesta del servidor
 * @param {HTMLElement} loadingMessage - Elemento de mensaje en carga
 * @returns {boolean} true si se ha renderizado con éxito
 */
export function processAndRenderResponse(data, loadingMessage) {
  // Validación básica
  if (!loadingMessage || !data) return false;

  // Detectar si es un examen de forma directa
  if (data.type === 'exam' && data.exam) {
    replaceLoadingMessage(loadingMessage, data.exam, MESSAGE_TYPES.EXAM);
    return true;
  }

  const contentElem = loadingMessage.querySelector('.message-content');
  if (!contentElem) return false;

  // Restaurar la imagen de perfil al estado normal
  const profileElement = loadingMessage.querySelector('.ai-profile');
  if (profileElement) {
    profileElement.classList.remove('thinking');
  }

  // Verificar si ya se procesó
  if (contentElem.getAttribute('data-processed')) {
    return true;
  }
  contentElem.setAttribute('data-processed', 'true');

  // Extraer contenido textual
  let textContent = extractTextContent(data);

  if (textContent) {
    // AÑADIDO: Verificar explícitamente si contiene un diagrama Mermaid primero
    if (containsMermaidDiagram(textContent)) {
      clearElement(contentElem);
      renderMermaidMessage(contentElem, textContent);
      loadingMessage.classList.remove('processing');
      
      // Inicializar botones de interacción
      setTimeout(() => {
        initializeInteractionAndScroll(loadingMessage);
      }, 50);
      
      return true;
    }
    
    // Detectar tablas markdown
    const tableResult = detectTableInText(textContent);

    // Detectar bloques de código
    const codeResult = detectAndProcessCode(textContent);

    // Procesar según el contenido detectado
    if (tableResult.success && !codeResult.success) {
      contentElem.innerHTML = tableResult.html;

      // Agregar botón de expandir tabla
      addExpandButton(contentElem, {
        content: tableResult.html,
        title: 'Tabla de datos',
        type: 'table'
      });

      loadingMessage.classList.remove('processing');
      return true;
    }

    if (codeResult.success) {
      contentElem.innerHTML = codeResult.html;

      // Configurar interactividad
      setupCodeBlocksInteractivity(contentElem);

      loadingMessage.classList.remove('processing');
      return true;
    }

    // Contenido general - USAR renderTextMessage con role 'ai' para evitar procesamiento multimodal
    clearElement(contentElem);
    renderTextMessage(contentElem, textContent, 'ai');
    loadingMessage.classList.remove('processing');

    // Forzar actualización visual
    requestAnimationFrame(() => {
      loadingMessage.style.opacity = '0.99';
      setManagedTimeout(() => loadingMessage.style.opacity = '1', 30, 'restore-opacity');
    });

    return true;
  }

  // Verificar objetos para tipos especiales
  if (detectAndRenderStructuredContent(data, contentElem)) {
    loadingMessage.classList.remove('processing');
    return true;
  }

  // Procesamiento estándar
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
  // Verificar tipos específicos en el objeto raíz
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

  // Verificar en propiedades anidadas comunes
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
        import('../utils/response-interaction-teorico.js').then(module => {
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

// Mostrar vista previa de Mermaid
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
    // Fallback - cargar dinámicamente
    import('../components/preview-panel-teorico.js')
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
  
  // Verificar si la imagen existe
  const img = new Image();
  
  img.onload = function() {
    // La imagen existe, mostrar modal
    try {
      // Crear contenedor para la imagen
      const imgContainer = document.createElement('div');
      Object.assign(imgContainer.style, {
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });
      
      // Crear la imagen
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
      
      // Añadir la animación para el spinner si no existe
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
      
      // Crear el modal con la imagen y el spinner
      const modal = createModal({
        className: 'image-fullscreen-modal',
        content: [spinner, imgContainer],
        onClose: () => {
          window._showingFullImage = false;
        }
      });
      
      // Ocultar spinner cuando la imagen cargue
      imageElement.onload = function() {
        spinner.style.display = 'none';
      };
      
      // Manejar error de carga
      imageElement.onerror = function() {
        // Si hay error en la imagen dentro del modal, mostrar error
        spinner.style.display = 'none';
        showErrorModal();
        
        // Cerrar el modal actual si existe
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
  
  // Eliminar modales existentes del mismo tipo
  const existingModals = document.querySelectorAll(`.${className}`);
  existingModals.forEach(modal => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });
  
  // Crear el modal
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
  
  // 🦫 CAMBIO: Botón de cierre más atractivo
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
      // Manejar array de elementos
      content.forEach(item => {
        if (typeof item === 'string') {
          modal.innerHTML += item;
        } else if (item instanceof HTMLElement) {
          modal.appendChild(item);
        }
      });
    }
  }
  
  // Agregar al DOM
  document.body.appendChild(modal);
  
  // Configurar eventos de cierre
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
  
  // Configurar escape para cerrar
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
  // Crear contenedor de error
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
  icon.className = 'bx bx-confused'; // 🦫 CAMBIO: Icono más expresivo
  Object.assign(icon.style, {
    fontSize: '3rem',
    color: 'white',
    marginBottom: '15px'
  });
  
  // 🦫 CAMBIO: Mensaje más divertido
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
  
  // Crear modal con el mensaje de error
  createModal({
    className: 'image-fullscreen-modal',
    content: errorContainer,
    onClose: () => {
      window._showingFullImage = false;
    }
  });
  
  // 🦫 CAMBIO: Notificación de error
  acadelWarning(
    "👻 Imagen fantasma", 
    "Acadel no pudo cargar la imagen. Parece que se volvió invisible."
  );
}

/**
 * ✅ SISTEMA OPTIMIZADO PARA VISTA PREVIA DE IMÁGENES (ADAPTADO DEL PDF)
 */
function setupImagePreviewSystem() {
  if (window._imagePreviewSystemConfigured) return;
  window._imagePreviewSystemConfigured = true;
  
  // 1. Configurar delegación de eventos en el contenedor de mensajes
  const chatMessagesContainer = document.querySelector('.chat-messages');
  if (!chatMessagesContainer) {
    console.warn('🦫 Acadel: No se encontró el contenedor de mensajes para configurar vistas previas de imágenes');
    return;
  }
  
  // Usar delegación de eventos para capturar clics en cualquier imagen o contenedor de imagen
  chatMessagesContainer.addEventListener('click', function(e) {
    // Buscar si el clic fue en una imagen o en un contenedor de imagen
    const imgTarget = e.target.closest('.image-preview img') || 
                      e.target.closest('.markdown-image') ||
                      e.target.closest('.multimodal-container img') ||
                      e.target.closest('.markdown-image-container') ||
                      e.target.closest('.chat-image-item'); // ⭐ AGREGAR ESTE SELECTOR
                      
    if (imgTarget) {
      e.preventDefault();
      e.stopPropagation();
      
      // ⭐ MEJORAR LA LÓGICA DE EXTRACCIÓN DE URL:
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
      
      // Solo mostrar vista previa si tenemos una URL válida
      if (imageSrc && typeof window.showFullImage === 'function') {
        console.log('🦫 Acadel: Abriendo imagen:', imageSrc);
        window.showFullImage(imageSrc);
      }
    }
  });
  
  console.log('🦫 Acadel: Sistema de vista previa de imágenes configurado correctamente');
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', setupImagePreviewSystem);
// Backup para asegurar que se aplica incluso si el DOM ya está cargado
setTimeout(setupImagePreviewSystem, 1000);

// ✅ ESCUCHAR CAMBIOS EN EL HISTORIAL CON PROCESAMIENTO OPTIMIZADO
window.addEventListener('popstate', () => {
  // Usar el sistema optimizado del PDF para procesar imágenes después de cambio de URL
  if (typeof setManagedTimeout === 'function') {
    setManagedTimeout(() => {
      try {
        console.log('🖼️ [POPSTATE] Procesando imágenes después de cambio de URL INMEDIATAMENTE');
        document.querySelectorAll('.message-content').forEach(container => {
          const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
          if (externalImages.length > 0) {
            processExternalImagesRealTime(container, externalImages);
          }
        });
      } catch (e) {
        console.warn('🦫 Acadel: Error procesando imágenes después de cambio de URL:', e);
      }
    }, 300, 'popstate-images-processing');
  }
});

// También exposición global controlada para admitir acceso directo
if (typeof window !== 'undefined') {
  window.initializeFileAttachmentHandlers = initializeFileAttachmentHandlers;
  // ✅ USAR EL CACHE DEL SISTEMA OPTIMIZADO
  window.imageUrlCache = imageUrlCache;
}

// Mantener compatibilidad con exports existentes
export {
  // ✅ NUEVAS EXPORTACIONES DEL SISTEMA OPTIMIZADO
  processExternalImagesRealTime,
  initializeImagePreviewHandlersOptimized,
  handleImageErrorOptimized
};

// Exportación con todas las funciones principales
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