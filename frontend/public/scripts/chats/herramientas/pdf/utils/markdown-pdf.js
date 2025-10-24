/**
 * markdown.js - Sistema optimizado para procesar Markdown a HTML con soporte LaTeX mejorado
 * Versión optimizada con mejor procesamiento de LaTeX integrado y pipeline mejorado
 */

import { sanitizeText } from '../../../shared/dom-helpers.js';
import { LATEX_PATTERNS } from '../core/config-pdf.js';

// Patrones de expresiones regulares precompilados para mejor rendimiento
const REGEX = {
  // Formatos básicos de texto 
  BOLD: /\*\*(.*?)\*\*/g,
  ITALIC: /\*([^*\s][^*]*?[^*\s]|\w)\*/g,
  STRIKETHROUGH: /~~(.*?)~~/g,
  SPOILER: /\|\|(.*?)\|\|/g,
  HIGHLIGHT: /==(.*?)==/g,
  SUPERSCRIPT: /\^(.*?)\^/g,
  SUBSCRIPT: /~(.*?)~/g,
  
  // Enlaces e imágenes
  MARKDOWN_LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  MARKDOWN_IMAGE: /!\[([^\]]*)\]\(([^)]+)\)(\{([^\}]*)\})?/g,
  URL: /((https?:\/\/|www\.)[^\s]+)/g,
  
  // Bloques especiales
  CODE_BLOCK: /```([a-zA-Z]*)\n([\s\S]*?)```/g,
  INLINE_CODE: /`([^`]+)`/g,
  BLOCKQUOTE: /^(>\s?)(.*)$/gm,
  HORIZONTAL_RULE: /^(\*{3,}|-{3,}|_{3,})$/gm,
  MERMAID_PATTERN: /^(graph |flowchart |sequenceDiagram|classDiagram|gitGraph|pie title|gantt|stateDiagram)/m,
  
  // Encabezados
  HEADING6: /^###### (.*)$/gm,
  HEADING5: /^##### (.*)$/gm,
  HEADING4: /^#### (.*)$/gm,
  HEADING3: /^### (.*)$/gm,
  HEADING2: /^## (.*)$/gm,
  HEADING1: /^# (.*)$/gm,
  
  // Tablas
  TABLE_ROW: /^\|(.+)\|$/gm,
  
  // Listas
  TASK_LIST: /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/gm,
  BULLET_LIST: /^([ \t]*)([-*+])[ \t]+(.+)$/gm,
  NUMBERED_LIST: /^([ \t]*)(\d+)\.[ \t]+(.+)$/gm,

  // Patrones LaTeX - Optimizados para mejor detección
  LATEX_DISPLAY_DOLLARS: /\$\$([\s\S]*?)\$\$/g,
  LATEX_DISPLAY_BRACKETS: /\\\[([\s\S]*?)\\\]/g,
  LATEX_INLINE_DOLLARS: /\$([^\n$]*?)\$/g,
  LATEX_INLINE_PARENTHESES: /\\\(([\s\S]*?)\\\)/g,
  
  // Patrones de comandos LaTeX comunes para mejor detección
  LATEX_COMMANDS: /\\(?:frac|sum|int|prod|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|epsilon|theta|pi|infty|sqrt|begin|end|text|textbf|mathrm|operatorname|overrightarrow|hat|bar|vec|dot|ddot|cdot|div|times|pm|mp|oplus|otimes|leq|geq|neq|approx|equiv|cong|prec|succ)/g,
  
  // Patrones específicos para PDF
  PAGE_HEADER: /^[-]{3}\s*Página\s+(\d+)\s*[-]{3}/gm
};

// Set para almacenar en caché documentos ya procesados para LaTeX
const processedForLatexCache = new Set();

// Flag para indicar si estamos procesando el preview de un PDF
let isPDFPreview = false;

/**
 * Establece si estamos procesando un preview de PDF
 * @param {boolean} value - true si es preview de PDF
 */
export function setPDFPreviewMode(value) {
  isPDFPreview = !!value;
  console.log(`[markdown.js] Modo PDF preview establecido: ${isPDFPreview}`);
}

/**
 * Verifica el estado actual del modo PDF preview
 * @returns {boolean} El estado actual del modo
 */
export function isPDFPreviewMode() {
  return isPDFPreview;
}

/**
 * Corrige el formato de las páginas del PDF con mejor visibilidad
 * @param {string} text - Texto a procesar
 * @returns {string} Texto procesado
 */
function preprocessPDFPageHeaders(text) {
  if (!isPDFPreview) return text;
  
  // Patrón mejorado para capturar la mayoría de formatos de cabeceras de página
  const pageHeaderPattern = /^[-]{2,}\s*P[aáàä]gina\s+(\d+)[-\s]*$/gim;
  
  return text.replace(pageHeaderPattern, (match, pageNum) => {
    return `<div class="pdf-page-divider">
              <hr class="pdf-page-hr">
              <span class="pdf-page-number">Página ${pageNum}</span>
              <hr class="pdf-page-hr">
            </div>`;
  });
}

/**
 * Función principal para convertir Markdown a HTML con soporte LaTeX
 * Implementa pipeline secuencial para mejor manejo de múltiples formatos
 * @param {string} markdownText - Texto en formato Markdown
 * @returns {string} HTML resultante
 */
export function parseMarkdownToHTML(markdownText) {
  // Validación de entrada
  if (!markdownText) return '';
  
  // Normalizar saltos de línea para consistencia
  const normalizedText = markdownText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Procesamiento especial para visualización de páginas PDF
  const preprocessedText = preprocessPDFPageHeaders(normalizedText);

  // Detección temprana de características para optimizar procesamiento
  const features = detectMarkdownFeatures(preprocessedText);
  
  // Caso especial: texto completo es solo una línea horizontal
  if (/^\s*(\*{3,}|-{3,}|_{3,})\s*$/.test(preprocessedText.trim()) && !preprocessedText.includes('\n')) {
    return '<hr>';
  }
  
  // Ruta rápida para texto plano sin elementos Markdown
  if (features.hasNothing) {
    return processPlainText(preprocessedText);
  }
  
  // Sistema de protección de contenido mejorado
  
  // FASE 1: Proteger fórmulas LaTeX primero con mejor detección
  const { text: textWithoutLatex, blocks: latexBlocks } = protectContentBlocks(
    preprocessedText,
    [
      {
        pattern: REGEX.LATEX_DISPLAY_DOLLARS,
        type: 'display-latex',
        processor: (match, content) => content
      },
      {
        pattern: REGEX.LATEX_DISPLAY_BRACKETS,
        type: 'display-latex',
        processor: (match, content) => content
      },
      {
        pattern: REGEX.LATEX_INLINE_DOLLARS,
        type: 'inline-latex',
        processor: (match, content) => ({ type: 'dollar', content })
      },
      {
        pattern: REGEX.LATEX_INLINE_PARENTHESES,
        type: 'inline-latex',
        processor: (match, content) => ({ type: 'parentheses', content })
      }
    ]
  );
  
  // FASE 2: Proteger bloques de código (después de LaTeX)
  const { text: textWithoutCode, blocks: codeBlocks } = protectContentBlocks(
    textWithoutLatex,
    [
      {
        pattern: REGEX.CODE_BLOCK,
        type: 'code-block',
        processor: (match, language, code) => ({ language, code })
      },
      {
        pattern: REGEX.INLINE_CODE,
        type: 'inline-code',
        processor: (match, code) => code
      }
    ]
  );
  
  // FASE 3: Proteger imágenes y enlaces
  const { text: processableText, blocks: linkImageBlocks } = protectContentBlocks(
    textWithoutCode,
    [
      // Importante: procesar imágenes ANTES que enlaces
      {
        pattern: REGEX.MARKDOWN_IMAGE,
        type: 'image',
        processor: (match, alt, src, _, attributes) => ({ alt, src, attributes })
      },
      {
        pattern: REGEX.MARKDOWN_LINK,
        type: 'link',
        processor: (match, text, url) => ({ text, url })
      }
    ]
  );
  
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
  
  // FASE DE RESTAURACIÓN: Restaurar bloques protegidos en orden inverso
  
  // 1. Restaurar imágenes y enlaces
  htmlText = restoreContentBlocks(htmlText, linkImageBlocks, (block) => {
    // Si es una imagen y estamos en modo PDF preview, omitirla completamente
    if (isPDFPreview && block.type === 'image') {
      console.log(`[markdown.js] Omitiendo imagen en modo PDF`);
      return ''; // Reemplazar con string vacío
    }
    
    if (block.type === 'link') {
      // Procesar enlaces
      let safeUrl = block.content.url.trim();
      if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('/')) {
        if (safeUrl.includes('.')) {
          safeUrl = 'https://' + safeUrl;
        }
      }
      
      // Sanitizar URL
      safeUrl = encodeURI(safeUrl)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
      
      // Sanitizar texto
      const safeText = sanitizeText(block.content.text);
      
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
    }
    else if (block.type === 'image') {
      // Procesar imágenes
      let safeSrc = block.content.src.trim();
      if (!/^https?:\/\//i.test(safeSrc) && !safeSrc.startsWith('/')) {
        if (safeSrc.includes('.')) {
          safeSrc = 'https://' + safeSrc;
        }
      }
      
      // Sanitizar URL
      safeSrc = encodeURI(safeSrc)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
      
      // Procesar atributos adicionales
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
  
  // 2. Restaurar bloques de código
  htmlText = restoreContentBlocks(htmlText, codeBlocks, (block) => {
    if (block.type === 'code-block') {
      // Detectar si es un diagrama Mermaid
      if (isMermaidCode(block.content.code, block.content.language)) {
        return createMermaidBlockHTML(block.content.code);
      } else {
        return buildCodeBlockHTML(block.content.code, block.content.language);
      }
    } else if (block.type === 'inline-code') {
      return `<span class="inline-code">${escapeHTML(block.content)}</span>`;
    }
    return '';
  });
  
  // 3. Restaurar expresiones LaTeX al final
  htmlText = restoreContentBlocks(htmlText, latexBlocks, (block, id) => {
    if (block.type === 'display-latex') {
      // Verificar si estamos dentro de una tabla o un caption de imagen
      const isInTable = block.id.indexOf('<td') >= 0 || block.id.indexOf('<th') >= 0 ||
        /(?:<table|<tr|<td|<th)[^>]*>[^<]*___DISPLAY-LATEX/.test(htmlText);
      const isInImageCaption = /markdown-image-caption[^>]*>[^<]*___DISPLAY-LATEX/.test(htmlText);
      
      // Ajustar presentación según contexto
      if (isInTable || isInImageCaption) {
        return `<span class="math-inline math-display-small">\\[${block.content}\\]</span>`;
      } else {
        return `<div class="math-block">\\[${block.content}\\]</div>`;
      }
    } else if (block.type === 'inline-latex') {
      if (block.content.type === 'parentheses') {
        return `<span class="math-inline">\\(${block.content.content}\\)</span>`;
      } else {
        return `<span class="math-inline">$${block.content.content}$</span>`;
      }
    }
    return '';
  });
  
  // MEJORA: marcar el contenedor para procesamiento MathJax si hay fórmulas LaTeX
  if (features.hasLatex) {
    htmlText = `<div class="math-content" data-has-math="true">${htmlText}</div>`;
  }
  
  return htmlText;
}

/**
 * NUEVA FUNCIÓN: Procesa párrafos y saltos de línea con precisión
 * Enfoque mejorado para manejar múltiples formatos markdown simultáneamente
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con párrafos y saltos de línea procesados
 */
function processParagraphsAndLineBreaks(html) {
  // Si está vacío, retornar inmediatamente
  if (!html.trim()) return '';

  // Dividir por líneas para procesar cada una
  const lines = html.split('\n');
  
  // Información sobre el estado actual de procesamiento
  let result = [];
  let currentParagraph = [];
  let inBlockElement = false;
  let blockStack = [];
  let consecutiveEmptyLines = 0;
  
  // Expresión regular para detectar inicio de elemento de bloque
  const blockStartRegex = /<(p|div|h[1-6]|table|tr|th|td|thead|tbody|tfoot|blockquote|ul|ol|li|pre|code)[\s>]/i;
  // Expresión regular para detectar fin de elemento de bloque
  const blockEndRegex = /<\/(p|div|h[1-6]|table|tr|th|td|thead|tbody|tfoot|blockquote|ul|ol|li|pre|code)>/i;
  
  // Expresión regular para marcadores LaTeX
  const latexMarkerRegex = /___(?:DISPLAY-LATEX|INLINE-LATEX)_\d+___/;
  
  // Lista de elementos de bloque para rastrear
  const blockElements = [
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
    'blockquote', 'pre', 'code', 'ul', 'ol', 'li'
  ];
  
  // Procesar cada línea individualmente
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Verificar si la línea actual contiene cierre de lista
    const justClosedList = /<\/(ul|ol)>/.test(line);
    
    // Verificar si la línea siguiente contiene un marcador LaTeX
    const nextLineHasLatex = i < lines.length - 1 && latexMarkerRegex.test(lines[i + 1]);
    
    // Detectar elementos de bloque en esta línea
    const openMatches = [...line.matchAll(/<([a-z][a-z0-9]*)[^>]*>/gi)];
    const closeMatches = [...line.matchAll(/<\/([a-z][a-z0-9]*)>/gi)];
    
    // Procesar aperturas de bloques
    for (const match of openMatches) {
      const tag = match[1].toLowerCase();
      if (blockElements.includes(tag)) {
        blockStack.push(tag);
        inBlockElement = true;
      }
    }
    
    // Procesar cierres de bloques
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
      
      // Añadir la línea del bloque directamente
      result.push(line);
      consecutiveEmptyLines = 0; // Reiniciar contador de líneas vacías
    }
    // 2. Línea vacía - finaliza un párrafo si lo había
    else if (trimmedLine === '') {
      // Si acabamos de cerrar una lista y la siguiente línea tiene LaTeX, 
      // no añadimos línea vacía ni cerramos párrafo
      if (justClosedList && nextLineHasLatex) {
        // No hacemos nada para evitar el espacio adicional
        consecutiveEmptyLines = 0; // Reiniciar contador
      }
      else if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
        consecutiveEmptyLines = 0;
      }
      else {
        // Limitar número de líneas vacías consecutivas
        if (consecutiveEmptyLines < 1) { // Solo permitir 1 línea vacía como máximo
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
  
  // Unir el resultado final
  let finalResult = result.join('\n');
  
  // Corrección adicional: eliminar cualquier <br> que pueda aparecer entre un cierre de lista y un marcador LaTeX
  finalResult = finalResult.replace(/(<\/(?:ul|ol)>)\s*<br[^>]*>\s*(___(?:DISPLAY-LATEX|INLINE-LATEX)_\d+___)/g, '$1$2');
  
  // Limpiar múltiples <br> consecutivos en el resultado final
  finalResult = finalResult.replace(/<br>\s*<br>\s*<br>/g, '<br><br>');
  
  return finalResult;
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
  
  // Procesar cada tipo de bloque
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
 * Restaura bloques de contenido protegido
 * @param {string} html - HTML con marcadores
 * @param {Array} blocks - Bloques a restaurar
 * @param {Function} formatter - Función para formatear cada bloque
 * @returns {string} - HTML con bloques restaurados
 */
function restoreContentBlocks(html, blocks, formatter) {
  let result = html;
  
  for (const block of blocks) {
    try {
      const htmlContent = formatter(block, blocks.indexOf(block));
      result = result.replace(block.id, htmlContent);
    } catch (error) {
      console.error(`Error al restaurar bloque ${block.type}:`, error);
      // En caso de error, intentar una sustitución básica
      result = result.replace(block.id, `<span class="error-block">Error al procesar contenido</span>`);
    }
  }
  
  return result;
}

/**
 * Crea HTML para un bloque de código adaptado para PDF
 * @param {string} code - Código a mostrar
 * @param {string} language - Lenguaje del código
 * @param {string|number} id - ID para el bloque
 * @returns {string} HTML del bloque de código
 */
export function buildCodeBlockHTML(code, language, id = null) {
  const blockId = typeof id === 'string' ? id : `code-block-${id || Date.now()}`;
  const lang = language ? language.trim() : 'text';

  // Sanitizar el código
  const safeCode = typeof sanitizeText === 'function' ?
    sanitizeText(code) :
    code.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
    
  // Verificar si el código contiene LaTeX
  const codeHasLatex = containsMathExpressions(code);
  const containerClass = codeHasLatex ? 'code-block math-content' : 'code-block';
  const mathDataAttr = codeHasLatex ? ' data-has-math="true"' : '';
    
  // Versión simplificada para PDF
  if (isPDFPreview) {
    return `
    <div class="${containerClass}" id="${blockId}"${mathDataAttr}>
      <div class="code-header">
        <span class="code-language">${lang.toUpperCase()}</span>
      </div>
      <pre><code class="language-${lang}">${safeCode}</code></pre>
    </div>
    `;
  }

  // Versión completa para uso normal
  return `
  <div class="${containerClass}" id="${blockId}"${mathDataAttr}>
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
 * Función mejorada para el manejo de bloques protegidos específicos para PDF
 * Esta implementa mejoras para el modo PDF sin reescribir toda la lógica existente
 */
export function parseWithPDFSupport(markdownText) {
  // Primero activamos explícitamente el modo PDF
  setPDFPreviewMode(true);
  
  // Llamamos a la función original parseMarkdownToHTML
  let htmlResult = parseMarkdownToHTML(markdownText);
  
  // Post-procesamiento para asegurar que no quedan imágenes
  htmlResult = htmlResult.replace(/<img[^>]*>/g, '');
  
  // Añadimos clase para MathJax
  htmlResult = `<div class="math-content" data-has-math="true">${htmlResult}</div>`;
  
  return htmlResult;
}

/**
 * Procesa texto plano preservando fielmente todos los saltos de línea
 * @param {string} text - Texto plano
 * @returns {string} HTML con párrafos y saltos preservados
 */
function processPlainText(text) {
  // Para texto de una sola línea, simplemente devolverlo
  if (!text.includes('\n')) return text;
  
  // Dividir en líneas para procesar párrafos y saltos
  const lines = text.split('\n');
  const paragraphs = [];
  let currentParagraph = [];
  
  // Procesar cada línea
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
      // Añadir línea al párrafo actual
      currentParagraph.push(line);
    }
  }
  
  // Procesar el último párrafo si hay alguno
  if (currentParagraph.length > 0) {
    paragraphs.push(`<p>${currentParagraph.join('<br data-nl="plaintext">')}</p>`);
  }
  
  // MEJORA: Verificar si hay LaTeX en el texto plano y marcar apropiadamente
  const result = paragraphs.join('\n');
  if (containsMathExpressions(text)) {
    return `<div class="math-content" data-has-math="true">${result}</div>`;
  }
  
  return result;
}

/**
 * Procesa encabezados Markdown (h1-h6)
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con encabezados procesados
 */
function processHeadings(html) {
  // Procesar en orden de mayor a menor (h6->h1) para evitar conflictos
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
 * Procesa énfasis (negritas y cursivas)
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con énfasis procesado
 */
function processEmphasis(html) {
  // Primero negritas para evitar conflictos con cursivas
  let processed = html;
  processed = processed.replace(REGEX.BOLD, '<strong>$1</strong>');
  processed = processed.replace(REGEX.ITALIC, '<em>$1</em>');
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
  // ✅ FUNCIÓN getChatId SEGURA SIN DEPENDENCIAS
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
      
      // Fallback seguro
      return 'default_chat';
    } catch (e) {
      console.warn('Error obteniendo chatId:', e);
      return 'default_chat';
    }
  }

  // ✅ VERIFICAR CACHE ANTES DE DECIDIR SI CREAR PLACEHOLDER - CON FALLBACK SEGURO
  let finalSrc = src;
  let isStored = false;
  
  try {
    const chatId = getChatIdSafe();
    
    // Solo verificar cache si imageUrlCache está disponible
    if (typeof window !== 'undefined' && window.imageUrlCache?.getLocalPath) {
      const cachedPath = window.imageUrlCache.getLocalPath(chatId, src);
      if (cachedPath) {
        finalSrc = cachedPath;
        isStored = true;
      }
    }
    
    // Verificar si ya es ruta local
    if (src.startsWith('/uploads/')) {
      isStored = true;
      finalSrc = src;
    }
  } catch (e) {
    console.warn('Error verificando cache de imagen:', e);
    // Continuar sin cache - no es crítico
  }
  
  // ✅ SOLO crear placeholder para imágenes realmente externas sin cache
  const needsPlaceholder = !isStored && 
                          !finalSrc.startsWith('data:') && 
                          (finalSrc.match(/^(https?:\/\/|www\.)/i) || finalSrc.startsWith('//'));
  
  const placeholderHTML = needsPlaceholder ? `
    <div class="image-placeholder" style="display: flex;">
      <i class="bx bx-image"></i>
    </div>
  ` : '';
  
  // ✅ ESTILOS INICIALES CORRECTOS - visible si ya está disponible
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
 * Procesa enlaces en formato Markdown
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con enlaces procesados
 */
function processLinks(html) {
  return html.replace(REGEX.MARKDOWN_LINK, (match, text, url) => {
    // Asegurar protocolo correcto
    let safeUrl = url.trim();
    if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('/')) {
      if (safeUrl.includes('.')) {
        safeUrl = 'https://' + safeUrl;
      }
    }
    
    // Sanitizar URL
    safeUrl = safeUrl
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    // Sanitizar texto
    const safeText = sanitizeText(text);
    
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
  });
}

/**
 * Convierte URLs planas en enlaces clicables
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con URLs convertidas en enlaces
 */
function convertPlainUrls(html) {
  if (!html || typeof html !== 'string') return html;
  
  // Dividir el HTML en segmentos de etiquetas y texto
  const segments = splitHtmlIntoSegments(html);
  
  // Procesar solo los segmentos de texto
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].isTag) {
      // Expresión regular mejorada para URLs planas
      const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>'"()]+\.[^\s<>'"()[\]{}]+\b/g;
      
      // Convertir URLs en enlaces
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
  
  // Buscar todas las etiquetas HTML
  while ((match = tagRegex.exec(html)) !== null) {
    // Si hay texto antes de la etiqueta
    if (match.index > currentIndex) {
      segments.push({
        isTag: false,
        content: html.substring(currentIndex, match.index)
      });
    }
    
    // Añadir la etiqueta
    segments.push({
      isTag: true,
      content: match[0]
    });
    
    currentIndex = match.index + match[0].length;
  }
  
  // Añadir texto restante después de última etiqueta
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
      // Si hay suficientes líneas para una tabla válida
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
  
  // Procesar tabla final si quedó alguna
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

  // Extraer información de alineación
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

  // Extraer encabezados
  const headers = headerLine
    .split('|')
    .filter((cell, index, array) => index > 0 && index < array.length - 1)
    .map(cell => parseMarkdownInCell(cell.trim()));

  // Extraer filas de datos
  const rows = dataLines.map(line => {
    return line
      .split('|')
      .filter((cell, index, array) => index > 0 && index < array.length - 1)
      .map(cell => parseMarkdownInCell(cell.trim()));
  });

  // MEJORA: Verificar si la tabla contiene LaTeX
  const tableHasLatex = headers.some(header => containsMathExpressions(header)) || 
                       rows.some(row => row.some(cell => containsMathExpressions(cell)));
  
  return createTableHTML(headers, rows, alignments, tableHasLatex);
}

/**
 * Crea HTML para una tabla con soporte LaTeX mejorado
 * @param {Array} headers - Encabezados de la tabla
 * @param {Array} rows - Filas de datos
 * @param {Array} alignments - Alineaciones de columnas
 * @param {boolean} hasLatex - Indica si la tabla contiene LaTeX
 * @returns {string} HTML de la tabla
 */
export function createTableHTML(headers, rows, alignments = [], hasLatex = false) {
  // MEJORA: Añadir atributos para procesamiento LaTeX si es necesario
  const tableClass = hasLatex ? 'data-table math-content' : 'data-table';
  const tableDataAttr = hasLatex ? ' data-has-math="true"' : '';
  
  let tableHTML = `<div class="table-container"><table class="${tableClass}"${tableDataAttr}><thead><tr>`;
  
  // Encabezados
  headers.forEach((header, index) => {
    const align = alignments[index] ? ` style="text-align: ${alignments[index]};"` : '';
    const cellHasLatex = containsMathExpressions(header);
    const cellClass = cellHasLatex ? ' class="math-content"' : '';
    const cellDataAttr = cellHasLatex ? ' data-has-math="true"' : '';
    
    tableHTML += `<th${align}${cellClass}${cellDataAttr}>${header}</th>`;
  });
  
  tableHTML += '</tr></thead><tbody>';
  
  // Filas de datos
  rows.forEach(row => {
    tableHTML += '<tr>';
    row.forEach((cell, index) => {
      const align = alignments[index] ? ` style="text-align: ${alignments[index]};"` : '';
      const cellHasLatex = containsMathExpressions(cell);
      const cellClass = cellHasLatex ? ' class="math-content"' : '';
      const cellDataAttr = cellHasLatex ? ' data-has-math="true"' : '';
      
      tableHTML += `<td${align}${cellClass}${cellDataAttr}>${cell}</td>`;
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
  
  // Procesar formatos en la celda
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
  
  // En modo PDF, omitir imágenes
  if (!isPDFPreview && processed.includes('![') && processed.includes('](')) {
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
  
  // Manejar saltos de línea
  processed = processed.replace(/\n/g, '<br>');
  processed = processed.replace(/__BR_MARKER__/g, '<br>');
  
  return processed;
}

/**
 * Procesa blockquotes (texto citado)
 * @param {string} html - HTML a procesar
 * @returns {string} HTML con blockquotes procesados
 */
function processBlockquotes(html) {
  if (!html) return '';
  
  // Dividir por líneas para procesamiento línea por línea
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
      
      // Extraer contenido después del '>' manteniendo espacios internos pero quitando el prefijo
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
        // Verificar si hay LaTeX en la cita
        const blockquoteHasLatex = blockquoteContent.some(content => containsMathExpressions(content));
        const blockquoteClass = blockquoteHasLatex ? 'blockquote math-content' : 'blockquote';
        const mathDataAttr = blockquoteHasLatex ? ' data-has-math="true"' : '';
        
        // Crear blockquote con contenido acumulado
        const blockquoteHTML = `<blockquote class="${blockquoteClass}"${mathDataAttr}>${blockquoteContent.join('<br>')}</blockquote>`;
        result.push(blockquoteHTML);
        
        inBlockquote = false;
        blockquoteContent = [];
      }
      result.push(line);
    }
  }

  // No olvidar cerrar blockquote al final
  if (inBlockquote) {
    // Verificar si hay LaTeX en la cita
    const blockquoteHasLatex = blockquoteContent.some(content => containsMathExpressions(content));
    const blockquoteClass = blockquoteHasLatex ? 'blockquote math-content' : 'blockquote';
    const mathDataAttr = blockquoteHasLatex ? ' data-has-math="true"' : '';
    
    const blockquoteHTML = `<blockquote class="${blockquoteClass}"${mathDataAttr}>${blockquoteContent.join('<br>')}</blockquote>`;
    result.push(blockquoteHTML);
  }

  // Unir resultado
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
    
    // Verificar si el contenido tiene LaTeX
    const contentHasLatex = containsMathExpressions(content);
    const itemClass = contentHasLatex ? 'task-list-item math-content' : 'task-list-item';
    const mathDataAttr = contentHasLatex ? ' data-has-math="true"' : '';
    
    return `<li class="${itemClass}"${mathDataAttr}><input type="checkbox" disabled ${checked}> ${content}</li>`;
  });
}

/**
 * Procesa listas ordenadas y no ordenadas con soporte para anidamiento
 * Versión con corrección de error: manejo de listStack vacío
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
    
    // Resetear contador de líneas vacías
    emptyLineCount = 0;
    
    // Detectar tipo de línea de lista
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
        // CORRECCIÓN: Verificar que listStack no está vacío
        if (listStack.length === 0) {
          // Si el stack está vacío pero inList es true, reiniciar lista
          let startAttr = '';
          if (!isBullet && match[2] !== '1') {
            startAttr = ` start="${match[2]}"`;
          }
          
          const listClass = isBullet ? 'bullet-list' : 'numbered-list';
          result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
          listStack.push({ type: listType, level: indent });
          lastIndent = indent;
          
          // Añadir el elemento actual
          const itemClass = `compact-item first-item`;
          result.push(`<li class="${itemClass}">${content}`);
          continue;
        }
        
        const currentList = listStack[listStack.length - 1];
        
        // Elemento más indentado - crear sublista
        if (indent > currentList.level) {
          // Cerrar ítem actual para iniciar sublista
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
          // Cerrar ítem abierto
          if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
            result[result.length - 1] += '</li>';
          }
          
          // Cerrar listas hasta nivel correcto
          while (listStack.length > 0 && listStack[listStack.length - 1].level > indent) {
            result.push(`</${listStack.pop().type}></li>`);
          }
          
          // CORRECCIÓN: Verificar nuevamente si el stack está vacío después de los pops
          if (listStack.length === 0) {
            // El stack se vació, reiniciar lista
            let startAttr = '';
            if (!isBullet && match[2] !== '1') {
              startAttr = ` start="${match[2]}"`;
            }
            
            const listClass = isBullet ? 'bullet-list' : 'numbered-list';
            result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
            listStack.push({ type: listType, level: indent });
          } 
          // Si cambió tipo de lista en el mismo nivel
          else if (listStack[listStack.length - 1].type !== listType) {
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
          // Cerrar ítem anterior
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
      
      // MEJORA: Verificar si el contenido tiene LaTeX y marcarlo apropiadamente
      const contentHasLatex = containsMathExpressions ? containsMathExpressions(content) : false;
      const itemClassWithMath = contentHasLatex ? `${itemClass} math-content` : itemClass;
      const mathDataAttr = contentHasLatex ? ' data-has-math="true"' : '';
      
      // Añadir ítem actual
      result.push(`<li class="${itemClassWithMath}"${mathDataAttr}>${content}`);
      lastIndent = indent;
    } 
    // No es elemento de lista pero estábamos en lista
    else if (inList) {
      // Cerrar ítem abierto
      if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
        result[result.length - 1] += '</li>';
      }
      
      // Cerrar todas las listas
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

  // Cerrar lista al final si quedó abierta
  if (inList) {
    // Cerrar ítem pendiente
    if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
      result[result.length - 1] += '</li>';
    }
    
    // Cerrar listas
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
  return buildCodeBlockHTML(code, language);
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
  
  // Versión simplificada para PDF
  if (isPDFPreview) {
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
    </div>
    `;
  }

  // Versión completa para uso normal
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

// ======================================
// FUNCIONES DE ANÁLISIS DE CARACTERÍSTICAS
// ======================================

/**
 * Detecta qué características de Markdown están presentes
 * Optimizado con búsqueda mejorada de LaTeX
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
  const hasDollars = text.includes('$');

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
                         
  // MEJORA: Detección de expresiones LaTeX más exhaustiva
  const hasLatex = (hasDollars && (/\$.*?\$/.test(text) || /\$\$.*?\$\$/.test(text))) ||
                   text.includes('\\(') || text.includes('\\)') ||
                   text.includes('\\[') || text.includes('\\]') ||
                   (LATEX_PATTERNS && LATEX_PATTERNS.commands && LATEX_PATTERNS.commands.test(text)) ||
                   REGEX.LATEX_COMMANDS.test(text);

  // Si no hay caracteres especiales marcados arriba y no tiene características, no es markdown
  if (!hasAsterisks && !hasBackticks && !hasSquareBrackets && 
      !hasPipes && !hasHashes && !hasTildes && !hasCarets && 
      !hasDashes && !hasUnderscores && !hasGreaterThan && !hasDollars &&
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
    hasPlainUrls: /\b(https?:\/\/|www\.)[^\s<>]+\.[^\s<>]+\b/.test(text),
    hasLatex: hasLatex
  };
}

// ======================================
// FUNCIONES AUXILIARES DE SEGURIDAD Y UTILIDAD
// ======================================

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

// ======================================
// FUNCIONES DE DETECCIÓN Y PROCESAMIENTO ESPECÍFICAS
// ======================================

/**
 * Detecta y procesa tablas en texto
 * @param {string} text - Texto a analizar
 * @returns {Object} Resultado con HTML y estado de éxito
 */
export function detectTableInText(text) {
  if (typeof text !== 'string') return { success: false, html: '' };

  // Dividir en líneas
  const lines = text.split('\n');

  // Buscar tablas
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
    
    // Verificar si es separador después del encabezado
    if (inTable && !hasHeaderSeparator && line.startsWith('|') && line.endsWith('|')) {
      // Verificar formato de separador (debe tener guiones)
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
    
    // Detectar fin de tabla
    if (inTable) {
      if (!line.startsWith('|') || !line.endsWith('|') || !line || 
          (line.split('|').length - 2 !== columnCount)) {
        
        // Guardar tabla válida (encabezado + separador + al menos una fila)
        if (hasHeaderSeparator && i - tableStart >= 3) {
          tableRanges.push({ start: tableStart, end: i - 1 });
        }
        
        inTable = false;
        hasHeaderSeparator = false;
        columnCount = 0;
      }
    }
  }

  // Revisar última tabla si quedó abierta
  if (inTable && hasHeaderSeparator && lines.length - tableStart >= 3) {
    tableRanges.push({ start: tableStart, end: lines.length - 1 });
  }

  // Si no hay tablas válidas
  if (tableRanges.length === 0) {
    return { success: false, html: '' };
  }

  // Si todo el texto es una sola tabla
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

  // Para contenido mixto, combinar texto y tablas
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
    
    // Procesar la tabla
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

  // Buscar bloques de código
  const codeBlockRegex = /```([a-zA-Z]*)\s*\n([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];

  if (matches.length === 0) {
    return { success: false, html: '', stats: { codeBlocks: 0 } };
  }

  try {
    // ===== CAMBIO CLAVE: En lugar de extraer y procesar todo el texto =====
    // Reemplazamos cada bloque de código con un marcador único para procesarlo después
    let processedText = text;
    const codeBlocks = [];
    
    // Guardar cada bloque de código y reemplazarlo con un marcador
    matches.forEach((match, index) => {
      const id = `___CODE_BLOCK_${index}___`;
      const fullMatch = match[0];
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      codeBlocks.push({
        id,
        language,
        code,
        fullMatch
      });
      
      // Reemplazar el bloque de código con el marcador
      processedText = processedText.replace(fullMatch, id);
    });
    
    // Procesar todo el texto normalmente con markdown
    let htmlContent = parseMarkdownToHTML(processedText);
    
    // Restaurar los bloques de código con su HTML correspondiente
    codeBlocks.forEach(block => {
      let codeHtml;
      if (isMermaidCode(block.code, block.language)) {
        codeHtml = createMermaidBlockHTML(block.code);
      } else {
        codeHtml = buildCodeBlockHTML(block.code, block.language);
      }
      
      htmlContent = htmlContent.replace(block.id, codeHtml);
    });
    
    return {
      success: true,
      html: htmlContent,
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

/**
 * Procesa texto para hacerlo compatible con LaTeX
 * Mejora: Mejor detección y manejo de comandos
 * @param {string} text - Texto a procesar
 * @returns {string} Texto procesado para LaTeX
 */
export function processLatexText(text) {
  if (!text) return '';

  // Cache para evitar reprocesamiento
  const cacheKey = text;
  if (processedForLatexCache.has(cacheKey)) {
    return text; // Ya está procesado, devolver sin cambios
  }

  // Detecta si ya existen delimitadores matemáticos
  const hasMathDelimiters = REGEX.LATEX_DISPLAY_DOLLARS.test(text) || 
                           REGEX.LATEX_DISPLAY_BRACKETS.test(text) ||
                           REGEX.LATEX_INLINE_DOLLARS.test(text) ||
                           REGEX.LATEX_INLINE_PARENTHESES.test(text);

  // Detecta comandos LaTeX comunes con expresión mejorada
  const containsLatexCommands = REGEX.LATEX_COMMANDS.test(text);

  // Si se detectan comandos LaTeX y no hay delimitadores, envuelve el contenido
  let processedText = text;
  if (containsLatexCommands && !hasMathDelimiters) {
    processedText = `$${text}$`;
  }

  // Reemplazo de operadores y símbolos matemáticos
  processedText = processedText
    .replace(/\s*>=\s*/g, ' \\geq ')
    .replace(/\s*<=\s*/g, ' \\leq ')
    .replace(/\s*!=\s*/g, ' \\neq ');
    
  // Añadir al caché para evitar reprocesar
  processedForLatexCache.add(cacheKey);

  return processedText;
}

/**
 * Detecta si un texto contiene expresiones matemáticas de forma más exhaustiva
 * Mejora significativa en la detección de fórmulas
 * @param {string} text - Texto a analizar
 * @returns {boolean} true si contiene expresiones matemáticas
 */
export function containsMathExpressions(text) {
  if (typeof text !== 'string') return false;

  // Verificación rápida para texto vacío o nulo
  if (!text.trim()) return false;
  
  // Detección por delimitadores explícitos de LaTeX (más común)
  if (text.includes('$') || 
      text.includes('\\(') || 
      text.includes('\\)') || 
      text.includes('\\[') || 
      text.includes('\\]')) {
    // Verificación más precisa con regex
    return REGEX.LATEX_DISPLAY_DOLLARS.test(text) || 
           REGEX.LATEX_DISPLAY_BRACKETS.test(text) ||
           REGEX.LATEX_INLINE_DOLLARS.test(text) ||
           REGEX.LATEX_INLINE_PARENTHESES.test(text);
  }
  
  // Detección por comandos LaTeX comunes
  if (text.includes('\\')) {
    return REGEX.LATEX_COMMANDS.test(text);
  }
  
  // Detección inteligente de patrones que suelen aparecer en contexto matemático
  // pero sólo cuando no están dentro de código o como parte de sintaxis
  
  // Patrón para secuencias matemáticas sin delimitadores explícitos
  const noDelimMathPattern = /[^a-zA-Z0-9\\/]([a-z]_[0-9a-z]|[a-z]\^[0-9a-z]|\\[a-zA-Z]+(\{.*?\})?)/i;
  
  return noDelimMathPattern.test(text);
}

/**
 * Procesa específicamente el contenido LaTeX para su visualización en PDF
 * @param {string} content - Contenido LaTeX
 * @returns {string} Contenido LaTeX preparado para visualización
 */
function processPDFLaTeX(content) {
  // Asegurar que siempre haya espacios alrededor de los operadores
  let processed = content
    .replace(/([^\\])([\+\-\=])/g, '$1 $2 ') // Espacio alrededor de operadores
    .replace(/([^\\])\*/g, '$1 \\cdot ');    // Convertir * a \cdot
  
  return processed;
}

/**
 * Renderiza matemáticas en un contenedor
 * @param {HTMLElement} container - Contenedor donde renderizar matemáticas
 * @param {Object} options - Opciones adicionales
 * @returns {Promise} Promesa que se resuelve cuando finaliza el renderizado
 */
export function renderMathInContainer(container, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Verificar si MathJax está disponible
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([container])
          .then(resolve)
          .catch(reject);
      } else {
        // Importar dinámicamente el módulo mathjax-config.js
        import('../utils/mathjax-config.js')
          .then(module => {
            if (typeof module.renderMath === 'function') {
              module.renderMath(container, options)
                .then(resolve)
                .catch(reject);
            } else {
              // Sin sistema de renderizado matemático
              resolve();
            }
          })
          .catch(err => {
            console.warn('Error al cargar mathjax-config.js:', err);
            resolve(); // Resolver de todos modos para no bloquear
          });
      }
    } catch (error) {
      console.warn('Error al renderizar matemáticas:', error);
      resolve(); // Resolver de todos modos para no bloquear
    }
  });
}

/**
 * Verifica si el texto contiene una tabla Markdown válida
 * @param {string} text - Texto a evaluar
 * @returns {boolean} Verdadero si se detecta tabla Markdown válida
 */
export function containsMarkdownTable(text) {
  // Dividir el texto en líneas y limpiar
  const lines = text.split('\n').map(line => line.trim());

  // Debe tener al menos 3 líneas (encabezado, separador, datos)
  if (lines.length < 3) return false;

  // Primera línea debe contener | y tener al menos 2 celdas
  const headerLine = lines[0];
  const headerCells = headerLine.split('|').filter(cell => cell.trim() !== '');
  if (headerCells.length < 2 || !headerLine.includes('|')) return false;

  // Segunda línea debe ser un separador de tabla válido
  const separatorLine = lines[1];
  const isValidSeparator = /^(\|?[ ]*:?[-]+:?[ ]*\|)+$/.test(separatorLine);

  // Al menos una línea de datos
  const hasDataLine = lines.slice(2).some(line =>
    line.trim().startsWith('|') &&
    line.trim().endsWith('|') &&
    line.split('|').filter(cell => cell.trim() !== '').length >= headerCells.length
  );

  return isValidSeparator && hasDataLine;
}

/**
 * Verifica si el texto contiene bloques de código
 * @param {string} text - Texto a evaluar
 * @returns {boolean} Verdadero si se detecta bloques de código
 */
export function containsCodeBlocks(text) {
  return /```/.test(text);
}

/**
 * Verifica si el texto contiene listas (viñetas o numeradas)
 * @param {string} text - Texto a evaluar
 * @returns {boolean} Verdadero si se detecta alguna lista
 */
export function containsLists(text) {
  return /(^\s*[-*+]\s+)|(^\s*\d+\.\s+)/m.test(text);
}

/**
 * Verifica si el texto contiene listas de tareas (por ejemplo, "- [ ]" o "- [x]")
 * @param {string} text - Texto a evaluar
 * @returns {boolean} Verdadero si se detecta alguna lista de tareas
 */
export function containsTaskLists(text) {
  return /^\s*[-*+]\s+\[( |x|X)\]/m.test(text);
}

/**
 * Convierte URLs simples en enlaces (wrapper para convertPlainUrls)
 * @param {string} text - Texto a procesar
 * @returns {string} Texto con URLs enlazadas
 */
export function linkify(text) {
  return convertPlainUrls(text);
}

// ======================================
// EXPORTACIONES UNIFICADAS
// ======================================

export default {
  // Funciones principales
  parseMarkdownToHTML,
  detectTableInText,
  createCodeBlockHTML,
  createImagePreviewHTML,
  createTableHTML,
  detectAndProcessCode,
  processLatexText,
  containsMathExpressions,
  renderMathInContainer,
  
  // Funciones auxiliares
  escapeHTML,
  isMermaidCode,
  createMermaidBlockHTML,
  parseMarkdownInCell,
  linkify,
  containsCodeBlocks,
  containsLists,
  containsTaskLists,
  containsMarkdownTable,
  
  // Funciones específicas para PDF
  setPDFPreviewMode,
  isPDFPreviewMode,
  parseWithPDFSupport,
  buildCodeBlockHTML
}