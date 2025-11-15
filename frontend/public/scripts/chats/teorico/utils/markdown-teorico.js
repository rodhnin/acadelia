/**
 * markdown.js - Sistema optimizado para procesar Markdown a HTML
 * Diseñado con arquitectura de pipeline mejorada para preservar fielmente saltos de línea
 * y manejar múltiples formatos Markdown simultáneamente
 */

import { sanitizeText } from '../../shared/dom-helpers.js';

// CONSTANTES Y CONFIGURACIÓN

// Patrones de expresiones regulares precompilados para mejor rendimiento
const REGEX = {
  // Formatos básicos de texto 
  BOLD: /\*\*((?:[^*]|\*(?!\*))+?)\*\*/g,  // Mejorado: no captura ** internos
  ITALIC: /(?<!\*)\*([^*\s][^*]*?[^*\s]|\w)\*(?!\*)/g,  // Mejorado: más restrictivo
  STRIKETHROUGH: /~~(.*?)~~/g,
  SPOILER: /\|\|(.*?)\|\|/g,
  HIGHLIGHT: /==(.*?)==/g,
  SUPERSCRIPT: /\^(.*?)\^/g,
  SUBSCRIPT: /~(.*?)~/g,
  
  // Enlaces e imágenes (sin cambios)
  MARKDOWN_LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  MARKDOWN_IMAGE: /!\[([^\]]*)\]\(([^)]+)\)(\{([^\}]*)\})?/g,
  URL: /((https?:\/\/|www\.)[^\s]+)/g,
  
  // Resto sin cambios...
  CODE_BLOCK: /```([a-zA-Z]*)\n([\s\S]*?)```/g,
  INLINE_CODE: /`([^`]+)`/g,
  BLOCKQUOTE: /^(>\s?)(.*)$/gm,
  HORIZONTAL_RULE: /^(\*{3,}|-{3,}|_{3,})$/gm,
  MERMAID_PATTERN: /^(graph |flowchart |sequenceDiagram|classDiagram|gitGraph|pie title|gantt|stateDiagram)/m,
  
  // Encabezados (sin cambios)
  HEADING6: /^###### (.*)$/gm,
  HEADING5: /^##### (.*)$/gm,
  HEADING4: /^#### (.*)$/gm,
  HEADING3: /^### (.*)$/gm,
  HEADING2: /^## (.*)$/gm,
  HEADING1: /^# (.*)$/gm,
  
  // Tablas (sin cambios)
  TABLE_ROW: /^\|(.+)\|$/gm,
  
  // Listas (sin cambios)
  TASK_LIST: /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/gm,
  BULLET_LIST: /^([ \t]*)([-*+])[ \t]+(.+)$/gm,
  NUMBERED_LIST: /^([ \t]*)(\d+)\.[ \t]+(.+)$/gm
};


/**
 * Función principal para convertir Markdown a HTML
 * Versión mejorada con pipeline secuencial y mejor manejo de múltiples formatos
 */
export function parseMarkdownToHTML(markdownText) {
  if (!markdownText) return '';
  
  const normalizedText = markdownText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detección temprana de características para optimizar procesamiento
  const features = detectMarkdownFeatures(normalizedText);
  
  // Caso especial: texto completo es solo una línea horizontal
  if (/^\s*(\*{3,}|-{3,}|_{3,})\s*$/.test(normalizedText.trim()) && !normalizedText.includes('\n')) {
    return '<hr>';
  }
  
  // Ruta rápida para texto plano sin elementos Markdown
  if (features.hasNothing) {
    return processPlainText(normalizedText);
  }
  
  // MEJORA: Sistema de protección de contenido mejorado en fases
  // FASE 1: Proteger bloques de código y código en línea
  const { 
    text: textWithoutCode, 
    blocks: codeBlocks 
  } = protectContentBlocks(normalizedText, [
    {
      pattern: /```([a-zA-Z]*)\n([\s\S]*?)```/g,
      type: 'code-block',
      processor: (match, language, code) => ({ language, code })
    },
    {
      pattern: /`([^`]+)`/g,
      type: 'inline-code',
      processor: (match, code) => code
    }
  ]);
  
  // FASE 2: Proteger imágenes y enlaces
  const { 
    text: processableText, 
    blocks: linkImageBlocks 
  } = protectContentBlocks(textWithoutCode, [
    // Importante: procesar imágenes ANTES que enlaces
    {
      pattern: /!\[([^\]]*)\]\(([^)]+)\)(\{([^\}]*)\})?/g,
      type: 'image',
      processor: (match, alt, src, _, attributes) => ({ alt, src, attributes })
    },
    {
      pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
      type: 'link',
      processor: (match, text, url) => ({ text, url })
    }
  ]);
  
  // MEJORA: Iniciar pipeline de procesamiento secuencial en lugar de condicional
  let htmlText = processableText;
  
  // 1. Procesar elementos de bloque
  htmlText = processTables(htmlText);        // Tablas primero para evitar conflictos
  htmlText = processBlockquotes(htmlText);   // Blockquotes
  htmlText = htmlText.replace(REGEX.HORIZONTAL_RULE, '<hr>'); // Líneas horizontales
  
  // 2. Procesar listas (antes que elementos en línea)
  htmlText = processTaskLists(htmlText);    // Listas de tareas
  htmlText = processLists(htmlText);        // Listas normales
  
  // 3. Procesar encabezados
  htmlText = processHeadings(htmlText);
  
  // 4. Procesar elementos en línea (orden importante)
  htmlText = processTextFormatting(htmlText);   // Tachado, resaltado, etc.
  htmlText = processEmphasis(htmlText);         // Negritas e itálicas
  htmlText = processSuperSubScript(htmlText);   // Superíndice y subíndice
  
  // 5. MEJORA: Procesar párrafos y saltos de línea con método mejorado
  htmlText = processParagraphsAndLineBreaks(htmlText);
  
  // 6. URLs normales en enlaces (después de procesar párrafos)
  htmlText = convertPlainUrls(htmlText);
  
  // RESTAURACIÓN: Restaurar bloques protegidos en orden inverso
  
  // 1. Restaurar imágenes y enlaces
  htmlText = restoreContentBlocks(htmlText, linkImageBlocks, (block) => {
    if (block.type === 'link') {
      let safeUrl = block.content.url.trim();
      if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('/')) {
        if (safeUrl.includes('.')) {
          safeUrl = 'https://' + safeUrl;
        }
      }
      
      safeUrl = encodeURI(safeUrl)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
      
      const safeText = sanitizeText(block.content.text);
      
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
    }
    else if (block.type === 'image') {
      let safeSrc = block.content.src.trim();
      if (!/^https?:\/\//i.test(safeSrc) && !safeSrc.startsWith('/')) {
        if (safeSrc.includes('.')) {
          safeSrc = 'https://' + safeSrc;
        }
      }
      
      safeSrc = encodeURI(safeSrc)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
      
      let attrHTML = '';
      if (block.content.attributes) {
        const attrMatches = block.content.attributes.match(/(\w+)=(['"]?)([^'"=\s]+)\2/g) || [];
        attrMatches.forEach(attr => {
          const [name, value] = attr.split('=');
          const cleanValue = value.replace(/^['"]|['"]$/g, '');
          const safeName = sanitizeText(name);
          const safeValue = sanitizeText(cleanValue);
          attrHTML += ` ${safeName}="${safeValue}"`;
        });
      }
      
      return createImagePreviewHTML(safeSrc, block.content.alt, attrHTML);
    }
    return '';
  });
  
  // 2. Restaurar bloques de código y código en línea
  htmlText = restoreContentBlocks(htmlText, codeBlocks, (block) => {
    if (block.type === 'code-block') {
      if (isMermaidCode(block.content.code, block.content.language)) {
        return createMermaidBlockHTML(block.content.code);
      } else {
        return createCodeBlockHTML(block.content.code, block.content.language);
      }
    } else if (block.type === 'inline-code') {
      return `<span class="inline-code">${escapeHTML(block.content)}</span>`;
    }
    return '';
  });
  
  return htmlText;
}


/**
 * Sistema genérico para proteger bloques de contenido durante procesamiento
 * @param {string} text - Texto original a procesar
 * @param {Array} blockTypes - Tipos de bloque a proteger con sus procesadores
 * @returns {Object} - Texto con marcadores y bloques protegidos
 */
function protectContentBlocks(text, blockTypes) {
  if (!text) return { text: '', blocks: [] };
  
  let processedText = text;
  const blocks = [];
  
  blockTypes.forEach(({ pattern, type, processor }) => {
    processedText = processedText.replace(pattern, (...args) => {
      const content = processor(...args);
      const id = `___${type.toUpperCase()}_${blocks.length}___`;
      
      blocks.push({ 
        type, 
        content,
        id
      });
      
      return id;
    });
  });
  
  return { text: processedText, blocks };
}

/**
 * Restaura contenido protegido con su HTML correspondiente
 * @param {string} html - HTML con marcadores de protección
 * @param {Array} blocks - Bloques protegidos para restaurar
 * @param {Function} formatter - Función para formatear cada bloque
 * @returns {string} HTML con contenido restaurado
 */
function restoreContentBlocks(html, blocks, formatter) {
  if (!html || !blocks || !blocks.length) return html;
  
  let resultHtml = html;
  
  blocks.forEach(block => {
    const replacementHtml = formatter(block);
    resultHtml = resultHtml.replace(block.id, replacementHtml);
  });
  
  return resultHtml;
}

// NUEVA FUNCIÓN PARA PROCESAR PÁRRAFOS Y SALTOS DE LÍNEA

/**
 * Procesa párrafos y saltos de línea con mayor precisión
 * Preserva el formato original en múltiples tipos de contenido
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con párrafos y saltos de línea procesados
 */
function processParagraphsAndLineBreaks(html) {
  // Si está vacío, retornar inmediatamente
  if (!html.trim()) return '';

  const lines = html.split('\n');
  
  let result = [];
  let currentParagraph = [];
  let inBlockElement = false;
  let blockStack = [];
  let consecutiveEmptyLines = 0;
  
  // Expresión regular para detectar inicio de elemento de bloque
  const blockStartRegex = /<(p|div|h[1-6]|table|tr|th|td|thead|tbody|tfoot|blockquote|ul|ol|li|pre|code)[\s>]/i;
  // Expresión regular para detectar fin de elemento de bloque
  const blockEndRegex = /<\/(p|div|h[1-6]|table|tr|th|td|thead|tbody|tfoot|blockquote|ul|ol|li|pre|code)>/i;
  
  // Lista de elementos de bloque para rastrear
  const blockElements = [
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
    'blockquote', 'pre', 'code', 'ul', 'ol', 'li'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    const justClosedList = /<\/(ul|ol)>/.test(line);
    
    const openMatches = [...line.matchAll(/<([a-z][a-z0-9]*)[^>]*>/gi)];
    const closeMatches = [...line.matchAll(/<\/([a-z][a-z0-9]*)>/gi)];
    
    for (const match of openMatches) {
      const tag = match[1].toLowerCase();
      if (blockElements.includes(tag)) {
        blockStack.push(tag);
        inBlockElement = true;
      }
    }
    
    for (const match of closeMatches) {
      const tag = match[1].toLowerCase();
      const index = blockStack.lastIndexOf(tag);
      if (index !== -1) {
        blockStack.splice(index, 1);
      }
      inBlockElement = blockStack.length > 0;
    }
    
    // 1. Si la línea es un elemento HTML de bloque o ya estamos dentro de uno
    if (blockStartRegex.test(line) || inBlockElement) {
      // Si teníamos un párrafo acumulándose, lo añadimos ahora
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      
      result.push(line);
      consecutiveEmptyLines = 0; // Reiniciar contador de líneas vacías
    }
    // 2. Línea vacía - finaliza un párrafo si lo había
    else if (trimmedLine === '') {
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
        consecutiveEmptyLines = 0;
      }
      else {
        // Limitar número de líneas vacías consecutivas
        if (consecutiveEmptyLines < 1) {
          result.push('');
          consecutiveEmptyLines++;
        }
      }
    }
    // 3. Texto normal - acumula en párrafo actual
    else {
      currentParagraph.push(line);
      consecutiveEmptyLines = 0;
    }
  }
  
  // No olvidar añadir el último párrafo si queda algo
  if (currentParagraph.length > 0) {
    result.push('<p>' + currentParagraph.join('<br>') + '</p>');
  }
  
  let finalResult = result.join('\n');
  
  finalResult = finalResult.replace(/<br>\s*<br>\s*<br>/g, '<br><br>');
  
  return finalResult;
}

// PROCESADORES DE ELEMENTOS ESPECÍFICOS

/**
 * Procesa texto plano preservando fielmente todos los saltos de línea
 * @param {string} text - Texto plano
 * @returns {string} HTML con párrafos y saltos preservados
 */
function processPlainText(text) {
  if (!text.includes('\n')) return text;
  
  const lines = text.split('\n');
  const paragraphs = [];
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Línea vacía marca fin de párrafo
    if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        // CLAVE: Unir líneas con <br> para preservar saltos internos
        paragraphs.push(`<p>${currentParagraph.join('<br data-nl="plaintext">')}</p>`);
        currentParagraph = [];
      } else if (paragraphs.length > 0) {
        // Párrafo vacío (doble salto de línea)
        paragraphs.push('<p><br></p>');
      }
    } else {
      currentParagraph.push(line);
    }
  }
  
  if (currentParagraph.length > 0) {
    paragraphs.push(`<p>${currentParagraph.join('<br data-nl="plaintext">')}</p>`);
  }
  
  return paragraphs.join('\n');
}

/**
 * Procesa encabezados Markdown (h1-h6)
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con encabezados procesados
 */
function processHeadings(html) {
  let processed = html;
  processed = processed.replace(REGEX.HEADING6, '<h6>$1</h6>');
  processed = processed.replace(REGEX.HEADING5, '<h5>$1</h5>');
  processed = processed.replace(REGEX.HEADING4, '<h4>$1</h4>');
  processed = processed.replace(REGEX.HEADING3, '<h3>$1</h3>');
  processed = processed.replace(REGEX.HEADING2, '<h2>$1</h2>');
  processed = processed.replace(REGEX.HEADING1, '<h1>$1</h1>');
  return processed;
}

/**
 * Procesa formatos de texto (tachado, spoilers, resaltado)
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con formato de texto procesado
 */
function processTextFormatting(html) {
  let processed = html;
  processed = processed.replace(REGEX.STRIKETHROUGH, '<del>$1</del>');
  processed = processed.replace(REGEX.SPOILER, '<span class="spoiler">$1</span>');
  processed = processed.replace(REGEX.HIGHLIGHT, '<mark>$1</mark>');
  return processed;
}

/**
 * Procesa énfasis (negritas y cursivas) SIN tocar contenido HTML existente
 * VERSIÓN ULTRA PRECISA: Evita procesar dentro de elementos HTML
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con énfasis procesado
 */
function processEmphasis(html) {
  console.log('🔍 [EMPHASIS] ENTRADA:', {
    length: html?.length,
    hasEm: html?.includes('<em>'),
    sample: html?.substring(0, 200)
  });

  // NUEVO: Si ya hay elementos HTML complejos, ser MUY cuidadoso
  const hasComplexHTML = html.includes('<div') || html.includes('<span') || html.includes('<p');
  
  if (hasComplexHTML) {
    // ESTRATEGIA ULTRA CONSERVADORA: Solo procesar énfasis en texto plano entre tags
    let processed = html;
    
    const segments = [];
    let currentIndex = 0;
    const tagRegex = /<[^>]+>/g;
    let match;
    
    while ((match = tagRegex.exec(html)) !== null) {
      // Texto antes del tag
      if (match.index > currentIndex) {
        segments.push({
          type: 'text',
          content: html.substring(currentIndex, match.index)
        });
      }
      
      // Tag HTML
      segments.push({
        type: 'tag',
        content: match[0]
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Texto después del último tag
    if (currentIndex < html.length) {
      segments.push({
        type: 'text',
        content: html.substring(currentIndex)
      });
    }
    
    processed = segments.map(segment => {
      if (segment.type === 'text' && segment.content.trim()) {
        let textProcessed = segment.content;
        
        if (!textProcessed.includes('<') && !textProcessed.includes('>')) {
          textProcessed = textProcessed.replace(REGEX.BOLD, '<strong>$1</strong>');
          textProcessed = textProcessed.replace(REGEX.ITALIC, '<em>$1</em>');
        }
        
        return textProcessed;
      }
      return segment.content;
    }).join('');
    
    console.log('🔍 [EMPHASIS] SALIDA (HTML complejo):', {
      length: processed?.length,
      hasEm: processed?.includes('<em>'),
      changed: html !== processed
    });
    
    return processed;
  }
  
  // ESTRATEGIA NORMAL: Para texto sin HTML complejo
  let processed = html;
  processed = processed.replace(REGEX.BOLD, '<strong>$1</strong>');
  processed = processed.replace(REGEX.ITALIC, '<em>$1</em>');
  
  console.log('🔍 [EMPHASIS] SALIDA (texto simple):', {
    length: processed?.length,
    hasEm: processed?.includes('<em>'),
    changed: html !== processed
  });
  
  return processed;
}

/**
 * Procesa superíndice y subíndice
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con superíndice y subíndice procesados
 */
function processSuperSubScript(html) {
  let processed = html;
  processed = processed.replace(REGEX.SUPERSCRIPT, '<sup>$1</sup>');
  processed = processed.replace(REGEX.SUBSCRIPT, '<sub>$1</sub>');
  return processed;
}

/**
 * Genera HTML para previsualización de imagen - VERSIÓN CORREGIDA
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {string} attrHTML - Atributos HTML adicionales
 * @returns {string} HTML de la previsualización
 */
export function createImagePreviewHTML(src, alt, attrHTML = '') {
  function getChatIdSafe() {
    try {
      // Método 1: Desde URL
      const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
      
      // Método 2: Desde app state
      if (typeof window !== 'undefined' && window.app?.state?.currentChat?.id) {
        return window.app.state.currentChat.id;
      }
      
      // Método 3: Desde getState si existe
      if (typeof getState === 'function') {
        const currentChat = getState('currentChat');
        if (currentChat?.id) {
          return currentChat.id;
        }
      }
      
      return 'default_chat';
    } catch (e) {
      console.warn('Error obteniendo chatId:', e);
      return 'default_chat';
    }
  }

  let finalSrc = src;
  let isStored = false;
  
  try {
    const chatId = getChatIdSafe();
    
    if (typeof window !== 'undefined' && window.imageUrlCache?.getLocalPath) {
      const cachedPath = window.imageUrlCache.getLocalPath(chatId, src);
      if (cachedPath) {
        finalSrc = cachedPath;
        isStored = true;
      }
    }
    
    if (src.startsWith('/uploads/')) {
      isStored = true;
      finalSrc = src;
    }
  } catch (e) {
    console.warn('Error verificando cache de imagen:', e);
  }
  
  const needsPlaceholder = !isStored && 
                          !finalSrc.startsWith('data:') && 
                          (finalSrc.match(/^(https?:\/\/|www\.)/i) || finalSrc.startsWith('//'));
  
  const placeholderHTML = needsPlaceholder ? `
    <div class="image-placeholder" style="display: flex;">
      <i class="bx bx-image"></i>
    </div>
  ` : '';
  
  const initialStyles = isStored ? 
    'style="visibility: visible; opacity: 1;"' : 
    '';
  
  return `
    <div class="markdown-image-container">
      <div class="markdown-image-wrapper">
        ${placeholderHTML}
        <img 
          src="${finalSrc}" 
          alt="${alt}" 
          class="markdown-image ${isStored ? 'stored-image' : 'external-image'}" 
          data-original-src="${src}" 
          ${!isStored ? 'data-needs-storage="true"' : ''}
          ${initialStyles}
        />
      </div>
    </div>
  `;
}

/**
 * Convierte URLs planas en enlaces clicables
 * Versión mejorada para mejor detección
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con URLs convertidas en enlaces
 */
function convertPlainUrls(html) {
  // Si no hay URLs, retornar el texto original
  if (!html.includes('http://') && !html.includes('https://') && !html.includes('www.')) {
    return html;
  }
  
  const segments = splitHtmlIntoSegments(html);
  
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].isTag) {
      // Expresión regular mejorada para URLs planas
      const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>'"()]+\.[^\s<>'"()[\]{}]+\b/g;
      
      segments[i].content = segments[i].content.replace(urlRegex, (match) => {
        const url = match.startsWith('www.') ? 'http://' + match : match;
        const safeUrl = sanitizeText(url);
        const displayUrl = sanitizeText(match);
        
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
      });
    }
  }
  
  // Recombinar los segmentos procesados
  return segments.map(segment => segment.content).join('');
}

/**
 * Divide HTML en segmentos de etiquetas y texto
 * @param {string} html - HTML a dividir
 * @returns {Array} Array de segmentos {isTag, content}
 */
function splitHtmlIntoSegments(html) {
  const segments = [];
  let currentIndex = 0;
  const tagRegex = /<[^>]+>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    // Si hay texto antes de la etiqueta
    if (match.index > currentIndex) {
      segments.push({
        isTag: false,
        content: html.substring(currentIndex, match.index)
      });
    }
    
    segments.push({
      isTag: true,
      content: match[0]
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  if (currentIndex < html.length) {
    segments.push({
      isTag: false,
      content: html.substring(currentIndex)
    });
  }
  
  return segments;
}

/**
 * Procesa tablas en formato Markdown
 * Versión mejorada para manejar tablas complejas
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con tablas procesadas
 */
function processTables(html) {
  if (!html.includes('|')) return html;
  
  const lines = html.split('\n');
  const result = [];
  let inTable = false;
  let tableLines = [];
  
  // Recorrer líneas buscando tablas
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Línea de tabla (comienza y termina con |)
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } 
    // No es línea de tabla pero estábamos en una
    else if (inTable) {
      // Si hay suficientes líneas para una tabla válida (encabezado + separador + datos)
      if (tableLines.length >= 3) {
        const isValidTable = tableLines[1].includes('-') && 
                            tableLines[1].startsWith('|') && 
                            tableLines[1].endsWith('|');
        
        if (isValidTable) {
          result.push(processMarkdownTable(tableLines));
        } else {
          // No es una tabla válida, mantener líneas
          result.push(...tableLines);
        }
      } else {
        // No es una tabla válida, mantener líneas
        result.push(...tableLines);
      }
      
      inTable = false;
      tableLines = [];
      result.push(lines[i]);
    } 
    // Línea normal
    else {
      result.push(lines[i]);
    }
  }
  
  if (inTable && tableLines.length >= 3) {
    const isValidTable = tableLines[1].includes('-') && 
                        tableLines[1].startsWith('|') && 
                        tableLines[1].endsWith('|');
    
    if (isValidTable) {
      result.push(processMarkdownTable(tableLines));
    } else {
      result.push(...tableLines);
    }
  } else if (inTable) {
    result.push(...tableLines);
  }
  
  return result.join('\n');
}

/**
 * Procesa una tabla en formato Markdown y la convierte a HTML
 * @param {Array<string>} tableLines - Líneas de la tabla
 * @returns {string} HTML de la tabla
 */
function processMarkdownTable(tableLines) {
  const headerLine = tableLines[0];
  const separatorLine = tableLines[1];
  const dataLines = tableLines.slice(2);

  const alignments = separatorLine
    .split('|')
    .filter((cell, index, array) => index > 0 && index < array.length - 1)
    .map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      if (trimmed.startsWith(':')) return 'left';
      return '';
    });

  const headers = headerLine
    .split('|')
    .filter((cell, index, array) => index > 0 && index < array.length - 1)
    .map(cell => parseMarkdownInCell(cell.trim()));

  const rows = dataLines.map(line => {
    return line
      .split('|')
      .filter((cell, index, array) => index > 0 && index < array.length - 1)
      .map(cell => parseMarkdownInCell(cell.trim()));
  });

  return createTableHTML(headers, rows, alignments);
}

/**
 * Crea HTML para una tabla
 * @param {Array} headers - Encabezados de la tabla
 * @param {Array} rows - Filas de datos
 * @param {Array} alignments - Alineaciones de columnas
 * @returns {string} HTML de la tabla
 */
export function createTableHTML(headers, rows, alignments = []) {
  let tableHTML = '<div class="table-container"><table class="data-table"><thead><tr>';
  
  // Encabezados
  headers.forEach((header, index) => {
    const align = alignments[index] ? ` style="text-align: ${alignments[index]};"` : '';
    tableHTML += `<th${align}>${header}</th>`;
  });
  
  tableHTML += '</tr></thead><tbody>';
  
  // Filas de datos
  rows.forEach(row => {
    tableHTML += '<tr>';
    row.forEach((cell, index) => {
      const align = alignments[index] ? ` style="text-align: ${alignments[index]};"` : '';
      tableHTML += `<td${align}>${cell}</td>`;
    });
    tableHTML += '</tr>';
  });
  
  tableHTML += '</tbody></table></div>';
  
  return tableHTML;
}

/**
 * Procesa elementos markdown dentro de celdas de tabla
 * @param {string} cellContent - Contenido de celda
 * @returns {string} Contenido procesado con HTML
 */
export function parseMarkdownInCell(cellContent) {
  if (!cellContent || typeof cellContent !== 'string') return '';
  
  // Preprocesamiento para manejar saltos de línea
  let processed = cellContent.replace(/<br>/g, '__BR_MARKER__');
  processed = processed.replace(/&lt;br&gt;/g, '__BR_MARKER__');
  
  if (processed.includes('**')) {
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
  
  if (processed.includes('*')) {
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
  
  if (processed.includes('~~')) {
    processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');
  }
  
  if (processed.includes('`')) {
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  
  if (processed.includes('[') && processed.includes('](')) {
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  
  if (processed.includes('![') && processed.includes('](')) {
    processed = processed.replace(/!\[(.*?)\]\((.*?)\)/g, 
      '<img src="$2" alt="$1" class="table-image" style="max-width:100px;max-height:80px;">');
  }
  
  if (processed.includes('==')) {
    processed = processed.replace(/==(.*?)==/g, '<mark>$1</mark>');
  }
  
  if (processed.includes('^')) {
    processed = processed.replace(/\^(.*?)\^/g, '<sup>$1</sup>');
  }
  
  if (processed.includes('~') && !processed.includes('~~')) {
    processed = processed.replace(/~(.*?)~/g, '<sub>$1</sub>');
  }
  
  processed = processed.replace(/\n/g, '<br>');
  processed = processed.replace(/__BR_MARKER__/g, '<br>');
  
  return processed;
}

/**
 * Procesa blockquotes para preservar formato interno
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con blockquotes procesados
 */
function processBlockquotes(html) {
  if (!html) return '';
  if (!html.includes('>')) return html;
  
  const lines = html.split('\n');
  const result = [];
  let inBlockquote = false;
  let blockquoteContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Línea que comienza con '>'
    if (trimmedLine.startsWith('>')) {
      if (!inBlockquote) {
        inBlockquote = true;
      }
      
      const content = line.replace(/^(\s*)>\s?/, '$1');
      blockquoteContent.push(content);
    } 
    // Línea vacía dentro de un blockquote que continúa
    else if (trimmedLine === '' && inBlockquote && 
             i < lines.length - 1 && lines[i+1].trim().startsWith('>')) {
      blockquoteContent.push('');
    }
    // Línea normal o fin de blockquote
    else {
      if (inBlockquote) {
        const blockquoteHTML = `<blockquote>${blockquoteContent.join('<br>')}</blockquote>`;
        result.push(blockquoteHTML);
        
        inBlockquote = false;
        blockquoteContent = [];
      }
      result.push(line);
    }
  }

  // No olvidar cerrar blockquote al final
  if (inBlockquote) {
    const blockquoteHTML = `<blockquote>${blockquoteContent.join('<br>')}</blockquote>`;
    result.push(blockquoteHTML);
  }

  return result.join('\n');
}

/**
* Procesa listas de tareas (checkboxes)
* @param {string} html - HTML a procesar
* @returns {string} HTML con listas de tareas procesadas
*/
function processTaskLists(html) {
  return html.replace(/^\s*[-*+]\s+\[( |x|X)\]\s+(.+)$/gm, (match, status, content) => {
    const checked = (status.toLowerCase() === 'x') ? 'checked' : '';
    return `<li class="task-list-item"><input type="checkbox" disabled ${checked}> ${content}</li>`;
  });
}

/**
* Procesa listas ordenadas y no ordenadas con soporte para anidamiento
* @param {string} html - HTML a procesar
* @returns {string} HTML con listas procesadas
*/
function processLists(html) {
  if (!html) return '';
  if (!/^[ \t]*[-*+]\s+|^[ \t]*\d+\.\s+/m.test(html)) return html;

  const lines = html.split('\n');
  const result = [];

  // Estado de procesamiento
  let listStack = [];
  let inList = false;
  let emptyLineCount = 0;
  let lastIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimRight(); // Preservar espacios iniciales
    
    // Línea vacía dentro de lista
    if (line.trim() === '') {
      if (inList) {
        emptyLineCount++;
        // Preservar como máximo una línea vacía en listas
        if (emptyLineCount === 1) {
          result.push('<div class="list-spacer"></div>');
        }
      } else {
        result.push(line);
      }
      continue;
    }
    
    emptyLineCount = 0;
    
    const bulletMatch = line.match(/^([ \t]*)([-*+])[ \t]+(.+)$/);
    const numberMatch = line.match(/^([ \t]*)(\d+)\.[ \t]+(.+)$/);
    
    if (bulletMatch || numberMatch) {
      // Datos de esta línea de lista
      const match = bulletMatch || numberMatch;
      const indent = match[1].length;
      const content = match[3];
      const isBullet = bulletMatch !== null;
      const listType = isBullet ? 'ul' : 'ol';
      
      // Si no estamos en lista, iniciar una
      if (!inList) {
        let startAttr = '';
        if (!isBullet && match[2] !== '1') {
          startAttr = ` start="${match[2]}"`;
        }
        
        const listClass = isBullet ? 'bullet-list' : 'numbered-list';
        result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
        listStack.push({ type: listType, level: indent });
        inList = true;
        lastIndent = indent;
      } 
      // Ya estamos en lista, gestionar niveles
      else {
        const currentList = listStack[listStack.length - 1];
        
        // Elemento más indentado - crear sublista
        if (indent > currentList.level) {
          if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
            result[result.length - 1] += '</li>';
          }
          
          let startAttr = '';
          if (!isBullet && match[2] !== '1') {
            startAttr = ` start="${match[2]}"`;
          }
          
          const listClass = isBullet ? 'bullet-list' : 'numbered-list';
          result.push(`<${listType} class="${listClass} nested-list"${startAttr}>`);
          listStack.push({ type: listType, level: indent });
        } 
        // Elemento menos indentado - cerrar listas hasta nivel adecuado
        else if (indent < currentList.level) {
          if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
            result[result.length - 1] += '</li>';
          }
          
          while (listStack.length > 0 && listStack[listStack.length - 1].level > indent) {
            result.push(`</${listStack.pop().type}></li>`);
          }
          
          // Si cambió tipo de lista en el mismo nivel
          if (listStack.length > 0 && listStack[listStack.length - 1].type !== listType) {
            const oldList = listStack.pop();
            result.push(`</${oldList.type}>`);
            
            let startAttr = '';
            if (!isBullet && match[2] !== '1') {
              startAttr = ` start="${match[2]}"`;
            }
            
            const listClass = isBullet ? 'bullet-list' : 'numbered-list';
            result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
            listStack.push({ type: listType, level: indent });
          }
        } 
        // Mismo nivel de indentación
        else {
          if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
            result[result.length - 1] += '</li>';
          }
          
          // Si cambió tipo de lista
          if (listStack[listStack.length - 1].type !== listType) {
            const oldList = listStack.pop();
            result.push(`</${oldList.type}>`);
            
            let startAttr = '';
            if (!isBullet && match[2] !== '1') {
              startAttr = ` start="${match[2]}"`;
            }
            
            const listClass = isBullet ? 'bullet-list' : 'numbered-list';
            result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
            listStack.push({ type: listType, level: indent });
          }
        }
      }
      
      // Clases para el elemento de lista
      const isFirstLevel = listStack.length === 1;
      const indentClass = indent > lastIndent ? "indented-item" : "same-level-item";
      const itemClass = isFirstLevel ? 
                        `compact-item first-item ${indentClass}` : 
                        `compact-item ${indentClass}`;
      
      result.push(`<li class="${itemClass}">${content}`);
      lastIndent = indent;
    } 
    // No es elemento de lista pero estábamos en lista
    else if (inList) {
      if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
        result[result.length - 1] += '</li>';
      }
      
      while (listStack.length > 0) {
        result.push(`</${listStack.pop().type}>`);
      }
      
      inList = false;
      result.push(line);
    } 
    // Línea normal
    else {
      result.push(line);
    }
  }

  if (inList) {
    if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
      result[result.length - 1] += '</li>';
    }
    
    while (listStack.length > 0) {
      result.push(`</${listStack.pop().type}>`);
    }
  }

  return result.join('\n');
}

/**
* Crea HTML para un bloque de código con resaltado de sintaxis
* @param {string} code - Código a mostrar
* @param {string} language - Lenguaje del código
* @returns {string} HTML del bloque de código
*/
export function createCodeBlockHTML(code, language = '') {
  const blockId = `code-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const lang = language ? language.trim() : 'text';

  const safeCode = typeof sanitizeText === 'function' ? 
    sanitizeText(code) : 
    code.replace(/[&<>"']/g, m => ({ 
      '&': '&amp;', 
      '<': '&lt;', 
      '>': '&gt;', 
      '"': '&quot;', 
      "'": '&#039;' 
    }[m]));

  return `
<div class="code-block" id="${blockId}">
  <div class="code-header">
    <span class="code-language">${lang.toUpperCase()}</span>
    <button class="copy-button" data-target="${blockId}">
      <i class='bx bx-copy'></i> Copiar
    </button>
  </div>
  <pre><code class="language-${lang}">${safeCode}</code></pre>
</div>
`;
}

/**
* Verifica si un bloque de código contiene un diagrama Mermaid
* @param {string} code - Código a verificar
* @param {string} language - Lenguaje especificado
* @returns {boolean} true si es un diagrama Mermaid
*/
export function isMermaidCode(code, language) {
  return language.toLowerCase() === 'mermaid' || 
       (language === '' && REGEX.MERMAID_PATTERN.test(code));
}

/**
* Crea HTML para un diagrama Mermaid
* @param {string} code - Código Mermaid
* @returns {string} HTML del diagrama
*/
export function createMermaidBlockHTML(code) {
  const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Escapar código para atributos HTML
  const escapedCode = escapeHTML(code, true);

  return `
  <div class="mermaid-diagram-container">
    <h4 class="concept-map-title">Mapa Conceptual</h4>
    <div class="mermaid-diagram" 
         id="${uniqueId}" 
         data-code="${escapedCode}"
         data-title="Mapa Conceptual">
      <div class="mermaid-loading">
        <i class="bx bx-loader-alt bx-spin"></i>
        <span>Cargando diagrama...</span>
      </div>
    </div>
    <button class="concept-map-expand-btn" 
            data-code="${escapedCode}"
            data-diagram-id="${uniqueId}"
            onclick="window.showMermaidPreview(this)">
      <i class="bx bx-expand-alt"></i>
      Ver diagrama completo
    </button>
  </div>
`;
}

// FUNCIONES DE ANÁLISIS DE CARACTERÍSTICAS

/**
* Detecta qué características de Markdown están presentes
* @param {string} text - Texto a analizar
* @returns {Object} Objeto con banderas de características
*/
function detectMarkdownFeatures(text) {
  if (typeof text !== 'string' || !text) {
    return { hasNothing: true };
  }

  // Verificaciones rápidas para eficiencia
  const hasAsterisks = text.includes('*');
  const hasBackticks = text.includes('`');
  const hasSquareBrackets = text.includes('[');
  const hasPipes = text.includes('|');
  const hasHashes = text.includes('#');
  const hasTildes = text.includes('~');
  const hasCarets = text.includes('^');
  const hasDashes = text.includes('-');
  const hasUnderscores = text.includes('_');
  const hasGreaterThan = text.includes('>');

  // Detección de líneas horizontales - mejorada para capturar incluso en contexto
  const hasHorizontalRules = (hasAsterisks && /\*{3,}/.test(text)) || 
                             (hasDashes && /-{3,}/.test(text)) || 
                             (hasUnderscores && /_{3,}/.test(text)) ||
                             REGEX.HORIZONTAL_RULE.test(text);

  // Detección de blockquotes - mejorada para capturar incluso en contexto
  const hasBlockquotes = hasGreaterThan && 
                        (text.startsWith('>') || 
                         text.includes('\n>') || 
                         /^[^\n]*>\s[^\n]*$/m.test(text) ||
                         /\n>\s/.test(text));

  // Si no hay caracteres especiales marcados arriba y no tiene características, no es markdown
  if (!hasAsterisks && !hasBackticks && !hasSquareBrackets && 
      !hasPipes && !hasHashes && !hasTildes && !hasCarets && 
      !hasDashes && !hasUnderscores && !hasGreaterThan &&
      !text.includes('http')) {
    return { hasNothing: true };
  }

  return {
    hasCodeBlocks: hasBackticks && text.includes('```'),
    hasInlineCode: hasBackticks && text.includes('`') && !text.includes('```'),
    hasTables: hasPipes && 
               /\|[^|]+\|/.test(text) && 
               /\|[\s-:]+\|/.test(text) && 
               /^\s*\|.*\|\s*$[\r\n]+\s*\|[\s-:]+\|/m.test(text),
    hasBlockquotes: hasBlockquotes,
    hasHorizontalRules: hasHorizontalRules,
    hasImages: hasSquareBrackets && text.includes('!['),
    hasLinks: hasSquareBrackets && text.includes(']('),
    hasHeadings: hasHashes && /^#{1,6}\s+/m.test(text),
    hasFormatting: (hasTildes && text.includes('~~')) || 
                   (hasPipes && text.includes('||')) || 
                   text.includes('=='),
    hasTaskLists: /^(\s*)[-*+]\s+\[([ xX])\]\s/m.test(text),
    hasLists: /^(\s*)[-*+]\s+\S/m.test(text) ||
              /^(\s*)\d+\.\s+\S/m.test(text),
    hasEmphasis: hasAsterisks && (text.includes('**') || text.includes('*')),
    hasSuperSubScript: (hasCarets && text.includes('^')) || 
                       (hasTildes && text.includes('~')),
    hasPlainUrls: /\b(https?:\/\/|www\.)[^\s<>]+\.[^\s<>]+\b/.test(text)
  };
}

// FUNCIONES AUXILIARES DE SEGURIDAD Y UTILIDAD

/**
* Escapa caracteres HTML especiales
* @param {string} text - Texto a escapar
* @param {boolean} forAttr - Si es para atributo HTML
* @returns {string} Texto escapado
*/
export function escapeHTML(text, forAttr = false) {
  if (typeof text !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(forAttr ? /[&<>"']/g : /[&<>]/g, m => map[m]);
}

// FUNCIONES DE DETECCIÓN Y PROCESAMIENTO ESPECÍFICAS

/**
* Detecta y procesa tablas en texto
* @param {string} text - Texto a analizar
* @returns {Object} Resultado con HTML y estado de éxito
*/
export function detectTableInText(text) {
  if (typeof text !== 'string') return { success: false, html: '' };

  const lines = text.split('\n');

  const tableRanges = [];
  let inTable = false;
  let tableStart = -1;
  let hasHeaderSeparator = false;
  let columnCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Posible inicio de tabla
    if (!inTable && line.startsWith('|') && line.endsWith('|') && line.slice(1, -1).includes('|')) {
      inTable = true;
      tableStart = i;
      columnCount = line.split('|').length - 2; // Excluir pipes exteriores
      continue;
    }
    
    if (inTable && !hasHeaderSeparator && line.startsWith('|') && line.endsWith('|')) {
      const separatorCells = line.slice(1, -1).split('|');
      
      if (separatorCells.length === columnCount) {
        const isValidSeparator = separatorCells.every(cell => {
          const trimmed = cell.trim();
          return trimmed.length > 0 && /^[-:]+$/.test(trimmed) && trimmed.includes('-');
        });
        
        if (isValidSeparator) {
          hasHeaderSeparator = true;
          continue;
        }
      }
    }
    
    if (inTable) {
      if (!line.startsWith('|') || !line.endsWith('|') || !line || 
          (line.split('|').length - 2 !== columnCount)) {
        
        if (hasHeaderSeparator && i - tableStart >= 3) {
          tableRanges.push({ start: tableStart, end: i - 1 });
        }
        
        inTable = false;
        hasHeaderSeparator = false;
        columnCount = 0;
      }
    }
  }

  if (inTable && hasHeaderSeparator && lines.length - tableStart >= 3) {
    tableRanges.push({ start: tableStart, end: lines.length - 1 });
  }

  // Si no hay tablas válidas
  if (tableRanges.length === 0) {
    return { success: false, html: '' };
  }

  if (tableRanges.length === 1 && tableRanges[0].start <= 1 && tableRanges[0].end >= lines.length - 2) {
    try {
      const tableLines = lines.slice(tableRanges[0].start, tableRanges[0].end + 1);
      const tableHtml = processMarkdownTable(tableLines);
      return { success: true, html: tableHtml };
    } catch (error) {
      console.error('Error procesando tabla:', error);
      return { success: false, html: '' };
    }
  }

  let resultHTML = '';
  let lastEnd = 0;

  for (const range of tableRanges) {
    // Texto antes de tabla
    if (range.start > lastEnd) {
      const textBefore = lines.slice(lastEnd, range.start).join('\n');
      if (textBefore.trim()) {
        resultHTML += `<div class="text-section">${parseMarkdownToHTML(textBefore)}</div>`;
      }
    }
    
    try {
      const tableLines = lines.slice(range.start, range.end + 1);
      resultHTML += processMarkdownTable(tableLines);
    } catch (error) {
      console.error('Error procesando tabla:', error);
      resultHTML += `<div class="table-error">Error al procesar tabla: ${error.message}</div>`;
    }
    
    lastEnd = range.end + 1;
  }

  // Texto después de la última tabla
  if (lastEnd < lines.length) {
    const textAfter = lines.slice(lastEnd).join('\n');
    if (textAfter.trim()) {
      resultHTML += `<div class="text-section">${parseMarkdownToHTML(textAfter)}</div>`;
    }
  }

  return { success: true, html: resultHTML };
}

/**
* Detecta y procesa bloques de código
* @param {string} text - Texto a analizar
* @returns {Object} Resultado con HTML y estadísticas
*/
export function detectAndProcessCode(text) {
  if (typeof text !== 'string') {
    return { success: false, html: '', stats: { codeBlocks: 0 } };
  }

  const codeBlockRegex = /```([a-zA-Z]*)\s*\n([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];

  if (matches.length === 0) {
    return { success: false, html: '', stats: { codeBlocks: 0 } };
  }

  try {
    const firstMatch = matches[0];
    const firstMatchStart = text.indexOf(firstMatch[0]);
    const introText = firstMatchStart > 0 ? text.substring(0, firstMatchStart).trim() : '';
    
    let contentHTML = '';
    
    // Texto introducción
    if (introText) {
      contentHTML += `<div class="code-intro">${parseMarkdownToHTML(introText)}</div>`;
    }
    
    matches.forEach((match, index) => {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      if (isMermaidCode(code, language)) {
        contentHTML += createMermaidBlockHTML(code);
      } else {
        contentHTML += createCodeBlockHTML(code, language);
      }
      
      // Texto entre bloques
      if (index < matches.length - 1) {
        const currentMatchEnd = text.indexOf(match[0]) + match[0].length;
        const nextMatchStart = text.indexOf(matches[index + 1][0]);
        
        if (nextMatchStart > currentMatchEnd) {
          const betweenText = text.substring(currentMatchEnd, nextMatchStart).trim();
          if (betweenText) {
            contentHTML += `<div class="between-code">${parseMarkdownToHTML(betweenText)}</div>`;
          }
        }
      }
    });
    
    // Texto después del último bloque
    const lastMatch = matches[matches.length - 1];
    const lastMatchEnd = text.indexOf(lastMatch[0]) + lastMatch[0].length;
    
    if (lastMatchEnd < text.length) {
      const outroText = text.substring(lastMatchEnd).trim();
      if (outroText) {
        contentHTML += `<div class="code-outro">${parseMarkdownToHTML(outroText)}</div>`;
      }
    }
    
    return {
      success: true,
      html: contentHTML,
      stats: {
        codeBlocks: matches.length,
        languages: [...new Set(matches.map(m => m[1] || 'text'))]
      }
    };
    
  } catch (error) {
    console.error('Error procesando bloques de código:', error);
    return { 
      success: false, 
      html: '', 
      stats: { codeBlocks: matches.length },
      error: error.message
    };
  }
}

// EXPORTACIONES UNIFICADAS

export default {
  // Funciones principales
  parseMarkdownToHTML,
  detectTableInText,
  createCodeBlockHTML,
  createImagePreviewHTML,
  createTableHTML,
  detectAndProcessCode,

  // Funciones auxiliares
  escapeHTML,
  isMermaidCode,
  createMermaidBlockHTML,
  parseMarkdownInCell
};