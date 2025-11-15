/**
 * markdown.js - Sistema híbrido optimizado para procesar Markdown a HTML con soporte para LaTeX
 * Arquitectura mejorada con pipeline de procesamiento de alta eficiencia
 * MANTIENE: Todo el sistema MathJax existente + todas las dependencias actuales
 * MEJORA: Parsing, tablas, listas, párrafos y detección inteligente
 */

import { LATEX_PATTERNS } from '../core/config-agente.js';
import { sanitizeText } from '../../../shared/dom-helpers.js';

// ========================================
// PATRONES PRECOMPILADOS MEJORADOS
// ========================================

const REGEX = {
  // Formatos básicos de texto 
  BOLD: /\*\*(.*?)\*\*/g,
  BOLD_LINE: /^\s*\*\*(.*?)\*\*(.*)$/gm,
  ITALIC: /\*(.*?)\*/g,
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
  NUMBERED_LIST: /^([ \t]*)(\d+)\.[ \t]+(.+)$/gm
};

// ========================================
// ========================================

/**
 * Función principal para convertir texto Markdown a HTML - VERSIÓN HÍBRIDA MEJORADA
 * @param {string} markdownText - Texto en formato Markdown
 * @returns {string} HTML resultante
 */
export function parseMarkdownToHTML(markdownText) {
  // 1. Validación y normalización inicial
  if (!markdownText) return '';
  
  const normalizedText = markdownText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 2. Optimización: bypass para texto plano sin markdown
  if (!containsMarkdownElements(normalizedText)) {
    const paragraphs = normalizedText.split(/\n\s*\n+/);
    return paragraphs.map(p => 
      `<p>${p.replace(/\n/g, '<br>')}</p>`
    ).join('\n');
  }
  
  // 3. Pre-procesamiento para características específicas
  let processedText = preProcessInlineHorizontalRules(normalizedText);
  
  
  // Proteger fórmulas LaTeX/matemáticas primero (usando TU sistema)
  const { text: textWithoutLatex, blocks: latexBlocks } = protectContentBlocks(
    processedText,
    [
      {
        pattern: /\$\$([\s\S]*?)\$\$/g,
        type: 'display-latex',
        processor: (match, content) => content
      },
      {
        pattern: /\\\[([\s\S]*?)\\\]/g,
        type: 'display-latex',
        processor: (match, content) => content
      },
      {
        pattern: /\$([^\n$]*?)\$/g,
        type: 'inline-latex',
        processor: (match, content) => ({ type: 'dollar', content })
      },
      {
        pattern: /\\\(([\s\S]*?)\\\)/g,
        type: 'inline-latex',
        processor: (match, content) => ({ type: 'parentheses', content })
      }
    ]
  );

  // Proteger bloques de código y diagramas
  const { text: textWithoutCode, blocks: codeBlocks } = protectContentBlocks(
    textWithoutLatex,
    [
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
    ]
  );

  // Proteger enlaces e imágenes
  const { text: processableText, blocks: linkImageBlocks } = protectContentBlocks(
    textWithoutCode,
    [
      // Imágenes primero (ya que pueden contener enlaces)
      {
        pattern: /!\[([^\]]*)\]\(([^)]+)\)(\{([^\}]*)\})?/g,
        type: 'image',
        processor: (match, alt, src, _, attributes) => {
          return { alt, src, attributes };
        }
      },
      // Luego enlaces normales
      {
        pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
        type: 'link',
        processor: (match, text, url) => ({ text, url })
      }
    ]
  );

  let html = processableText;

  // BLOQUE 1: Procesamiento de elementos de bloque (orden optimizado)
  html = processTablesImproved(html);      // Tablas primero
  html = processBlockquotes(html);         // Luego citas
  html = processHorizontalRules(html);     // Líneas horizontales
  
  // BLOQUE 2: Procesamiento de encabezados (del framework)
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // BLOQUE 3: Formatos de texto (mejorados)
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler">$1</span>');
  html = html.replace(/==(.*?)==/g, '<mark>$1</mark>');
  html = html.replace(/\^(.*?)\^/g, '<sup>$1</sup>');
  html = html.replace(/~(.*?)~/g, '<sub>$1</sub>');
  
  html = processEmphasisImproved(html);

  // BLOQUE 4: Listas (completamente mejoradas del framework)
  html = processTaskLists(html);  // Listas de tareas primero
  html = processListsImproved(html);      // Luego listas generales mejoradas

  // BLOQUE 5: URLs y enlaces (del framework)
  html = convertPlainUrls(html);

  // BLOQUE 6: Párrafos y saltos de línea (algoritmo mejorado del framework)
  html = processParagraphsAndLineBreaksImproved(html);

  
  html = restoreContentBlocks(html, latexBlocks, (block) => {
    if (block.type === 'display-latex') {
      // Mantener tu lógica existente para detectar contexto
      const isInTable = block.id.indexOf('<td') >= 0 || block.id.indexOf('<th') >= 0 ||
        /(?:<table|<tr|<td|<th)[^>]*>[^<]*___DISPLAY-LATEX/.test(html);
      const isInImageCaption = /markdown-image-caption[^>]*>[^<]*___DISPLAY-LATEX/.test(html);

      if (isInTable || isInImageCaption) {
        return `<span class="math-inline">\\[${block.content}\\]</span>`;
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

  html = restoreContentBlocks(html, codeBlocks, (block, id) => {
    if (block.type === 'code-block') {
      if (isMermaidCode(block.content.code, block.content.language)) {
        return createMermaidBlockHTML(block.content.code, id);
      } else {
        return buildCodeBlockHTML(block.content.code, block.content.language, id);
      }
    } else if (block.type === 'inline-code') {
      return `<span class="inline-code">${escapeHTML(block.content)}</span>`;
    }
    return '';
  });

  html = restoreContentBlocks(html, linkImageBlocks, (block) => {
    if (block.type === 'link') {
      let safeUrl = block.content.url.trim();
      if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('/')) {
        if (safeUrl.includes('.')) {
          safeUrl = 'http://' + safeUrl;
        }
      }
      safeUrl = encodeURI(safeUrl)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
        
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${block.content.text}</a>`;
    }
    else if (block.type === 'image') {
      let safeSrc = block.content.src.trim();
      
      safeSrc = encodeURI(safeSrc)
        .replace(/\|/g, '%7C')
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');

      // Texto alternativo usando TU función sanitizeText
      const safeAlt = sanitizeText(block.content.alt || '');

      let attrHTML = '';
      if (block.content.attributes) {
        const attrMatches = block.content.attributes.match(/(\w+)=(['"]?)([^'"=\s]+)\2/g) || [];
        attrMatches.forEach(attr => {
          const [name, value] = attr.split('=');
          const cleanValue = value.replace(/^['"]|['"]$/g, '');
          attrHTML += ` ${name}="${cleanValue}"`;
        });
      }

      return createImagePreviewHTML(safeSrc, safeAlt, attrHTML);
    }
    return '';
  });

  // 7. FASE 4: LIMPIEZA FINAL (del framework)
  html = html.replace(/<p>\s*<\/p>\s*<hr>\s*<p>\s*<\/p>/g, '<hr>');
  html = html.replace(/<p>\s*<\/p>\s*<hr>/g, '<hr>');
  html = html.replace(/<hr>\s*<p>\s*<\/p>/g, '<hr>');
  html = html.replace(/(<br>\s*){3,}/g, '<br><br>');
  
  return html;
}

// ========================================
// ========================================

/**
 * 🌟 NUEVA: Protege bloques de contenido especial durante el procesamiento (del framework)
 */
function protectContentBlocks(text, blockTypes) {
  let processedText = text;
  const blocks = [];

  blockTypes.forEach(({ pattern, type, processor }) => {
    processedText = processedText.replace(pattern, (...args) => {
      const content = processor(...args);
      const id = `___${type.toUpperCase()}_${blocks.length}___`;
      blocks.push({ type, content, id });
      return id;
    });
  });

  return { text: processedText, blocks };
}

/**
 * 🌟 NUEVA: Restaura bloques de contenido protegido (del framework)
 */
function restoreContentBlocks(text, blocks, formatter) {
  let result = text;

  blocks.forEach((block, index) => {
    const htmlContent = formatter(block, index);
    result = result.replace(block.id, htmlContent);
  });

  return result;
}

/**
 * 🌟 MEJORADA: Procesamiento de énfasis que corrige el problema \n**texto** (del framework)
 */
function processEmphasisImproved(html) {
  let processed = html.replace(/\*\*((?:[^*\n]|\*(?!\*))+?)\*\*/g, '<strong>$1</strong>');
  
  // Luego procesar itálicas - evitando conflictos con negritas ya procesadas
  processed = processed.replace(/(?<!\*)\*([^*\n<>]+?)\*(?!\*)/g, '<em>$1</em>');
  
  return processed;
}

/**
 * 🌟 MEJORADA: Procesamiento de listas con mejor manejo de anidamiento (del framework)
 */
function processListsImproved(htmlText) {
  if (!htmlText) return '';
  if (!/^[ \t]*[-*+]\s+|^[ \t]*\d+\.\s+/m.test(htmlText)) return htmlText;

  const lines = htmlText.split('\n');
  const result = [];
  let listStack = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimRight();

    if (line.trim() === '') {
      if (inList) {
        result.push('<div class="list-spacer"></div>');
      } else {
        result.push(line);
      }
      continue;
    }

    const bulletMatch = line.match(/^([ \t]*)([-*+])[ \t]+(.+)$/);
    const numberMatch = line.match(/^([ \t]*)(\d+)\.[ \t]+(.+)$/);

    if (bulletMatch || numberMatch) {
      const match = bulletMatch || numberMatch;
      const indent = match[1].length;
      const content = match[3];
      const isBullet = bulletMatch !== null;
      const listType = isBullet ? 'ul' : 'ol';

      // Si empezamos una lista
      if (!inList) {
        let startAttr = '';
        if (!isBullet && match[2] !== '1') {
          startAttr = ` start="${match[2]}"`;
        }

        const listClass = isBullet ? 'bullet-list' : 'numbered-list';
        result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
        listStack.push({ type: listType, level: indent });
        inList = true;
      }
      // Ya estamos en una lista
      else {
        if (listStack.length === 0) {
          let startAttr = '';
          if (!isBullet && match[2] !== '1') {
            startAttr = ` start="${match[2]}"`;
          }

          const listClass = isBullet ? 'bullet-list' : 'numbered-list';
          result.push(`<${listType} class="${listClass} compact-list"${startAttr}>`);
          listStack.push({ type: listType, level: indent });
        } else {
          const currentList = listStack[listStack.length - 1];

          // Más indentado - sublista
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
          // Menos indentado - cerrar sublistas
          else if (indent < currentList.level) {
            if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
              result[result.length - 1] += '</li>';
            }

            while (listStack.length > 0 && listStack[listStack.length - 1].level > indent) {
              result.push(`</${listStack.pop().type}></li>`);
            }

            // Cambio de tipo de lista
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
          // Mismo nivel
          else {
            if (result[result.length - 1] && !result[result.length - 1].endsWith('</li>')) {
              result[result.length - 1] += '</li>';
            }

            // Cambio de tipo de lista
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
        }
      }

      result.push(`<li class="compact-item">${content}`);
    }
    // No es un ítem de lista
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
 * 🌟 MEJORADA: Procesamiento de párrafos que maneja mejor \n**texto** (del framework)
 */
function processParagraphsAndLineBreaksImproved(html) {
  if (!html.trim()) return '';

  const lines = html.split('\n');
  const result = [];
  let currentParagraph = [];
  let inBlockElement = false;
  let blockStack = [];
  
  const blockStartRegex = /<(p|div|h[1-6]|table|tr|th|td|thead|tbody|tfoot|blockquote|ul|ol|li|pre|code|hr)[\s>]/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    const openMatches = [...line.matchAll(/<([a-z][a-z0-9]*)[^>]*>/gi)];
    const closeMatches = [...line.matchAll(/<\/([a-z][a-z0-9]*)>/gi)];
    
    const isHorizontalRule = trimmedLine === '<hr>';
    
    for (const match of openMatches) {
      const tag = match[1].toLowerCase();
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'th', 'td', 
           'thead', 'tbody', 'tfoot', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'hr'].includes(tag)) {
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
    
    if (isHorizontalRule) {
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      result.push('<hr>');
    }
    else if (blockStartRegex.test(line) || inBlockElement) {
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      result.push(line);
    }
    else if (trimmedLine === '') {
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      else {
        result.push('');
      }
    }
    else {
      // Texto normal - acumular en párrafo
      currentParagraph.push(line);
    }
  }
  
  // No olvidar último párrafo
  if (currentParagraph.length > 0) {
    result.push('<p>' + currentParagraph.join('<br>') + '</p>');
  }
  
  return result.join('\n');
}

// ========================================
// FUNCIONES AUXILIARES MEJORADAS
// ========================================

/**
 * Pre-procesa líneas horizontales dentro de texto
 */
function preProcessInlineHorizontalRules(text) {
  let processed = text.replace(/([^\-])\s+([-]{3,})\s+([^\-])/g, '$1\n\n---\n\n$3');
  processed = processed.replace(/([^\-])\s+([-]{3,})$/gm, '$1\n\n---');
  processed = processed.replace(/^([-]{3,})\s+([^\-])/gm, '---\n\n$2');
  
  processed = processed.replace(/([^\*])\s+(\*{3,})\s+([^\*])/g, '$1\n\n***\n\n$3');
  processed = processed.replace(/([^\*])\s+(\*{3,})$/gm, '$1\n\n***');
  processed = processed.replace(/^(\*{3,})\s+([^\*])/gm, '***\n\n$2');
  
  processed = processed.replace(/([^_])\s+(_{3,})\s+([^_])/g, '$1\n\n___\n\n$3');
  processed = processed.replace(/([^_])\s+(_{3,})$/gm, '$1\n\n___');
  processed = processed.replace(/^(_{3,})\s+([^_])/gm, '___\n\n$2');
  
  return processed;
}

/**
 * Procesa líneas horizontales 
 */
function processHorizontalRules(html) {
  return html.replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '<hr>');
}

/**
 * 🌟 MEJORADA: Procesa tablas en formato Markdown (del framework)
 */
function processTablesImproved(htmlText) {
  if (!htmlText.includes('|')) return htmlText;

  const lines = htmlText.split('\n');
  const result = [];
  let i = 0;
  let tableStart = -1;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter(cell => cell.trim() !== '');

      if (cells.length >= 2) {
        if (tableStart === -1) tableStart = i;

        if (i + 1 < lines.length) {
          const separatorLine = lines[i + 1].trim();
          const isSeparatorValid = /^(\|?[ ]*:?[-]+:?[ ]*\|)+$/.test(separatorLine);

          if (isSeparatorValid) {
            let tableEnd = i + 1;
            while (tableEnd + 1 < lines.length) {
              const nextLine = lines[tableEnd + 1].trim();
              if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
                tableEnd++;
              } else {
                break;
              }
            }

            if (tableEnd > i + 1) {
              const tableLines = lines.slice(tableStart, tableEnd + 1);
              result.push(processMarkdownTable(tableLines));

              let blankCount = 0;
              let currentIndex = tableEnd + 1;
              while (currentIndex < lines.length && lines[currentIndex].trim() === '') {
                blankCount++;
                currentIndex++;
              }

              if (blankCount > 0) {
                result.push('<div class="table-spacer" style="margin-bottom: 1em;"></div>');
                if (blankCount > 1) {
                  for (let j = 1; j < blankCount; j++) {
                    result.push('');
                  }
                }
              }

              i = tableEnd + blankCount + 1;
              tableStart = -1;
              continue;
            }
          }
        }
      }
    }

    if (tableStart !== -1) {
      result.push(...lines.slice(tableStart, i));
      tableStart = -1;
    }

    result.push(lines[i]);
    i++;
  }

  if (tableStart !== -1) {
    result.push(...lines.slice(tableStart));
  }

  return result.join('\n');
}

/**
 * 🌟 MEJORADA: Procesa una tabla individual (del framework)
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
    .map(cell => cell.trim());

  const rows = dataLines.map(line => {
    return line
      .split('|')
      .filter((cell, index, array) => index > 0 && index < array.length - 1)
      .map(cell => cell.trim());
  });

  let tableHTML = '<div class="table-container"><table class="data-table"><thead><tr>';
  
  // Encabezados
  headers.forEach((header, index) => {
    const align = alignments[index] ? ` style="text-align: ${alignments[index]};"` : '';
    tableHTML += `<th${align}>${header}</th>`;
  });
  
  tableHTML += '</tr></thead><tbody>';
  
  // Filas y celdas
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
 * Procesa citas (blockquotes)
 */
function processBlockquotes(htmlText) {
  if (!htmlText.includes('>')) return htmlText;
  
  const lines = htmlText.split('\n');
  const result = [];
  let inBlockquote = false;
  let currentBlockquote = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('>')) {
      const content = line.replace(/^>\s*/, '').trim();
      
      if (!inBlockquote) {
        inBlockquote = true;
        currentBlockquote = [content];
      } else {
        currentBlockquote.push(content);
      }
    } 
    else {
      if (inBlockquote) {
        const blockquoteContent = currentBlockquote.join('<br>');
        result.push(`<blockquote>${blockquoteContent}</blockquote>`);
        inBlockquote = false;
        currentBlockquote = [];
      }
      
      result.push(line);
    }
  }
  
  if (inBlockquote) {
    const blockquoteContent = currentBlockquote.join('<br>');
    result.push(`<blockquote>${blockquoteContent}</blockquote>`);
  }
  
  return result.join('\n');
}

/**
 * Procesa listas de tareas
 */
function processTaskLists(htmlText) {
  return htmlText.replace(REGEX.TASK_LIST, (match, status, content) => {
    const checked = (status.toLowerCase() === 'x') ? 'checked' : '';
    return `<li class="task-list-item"><input type="checkbox" disabled ${checked}> ${content}</li>`;
  });
}

/**
 * Convierte URLs planas en enlaces clicables
 */
function convertPlainUrls(html) {
  if (!html || typeof html !== 'string') return html;
  
  const segments = splitHtmlIntoSegments(html);
  
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].isTag) {
      const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>'"()]+\.[^\s<>'"()[\]{}]+\b/g;
      
      segments[i].content = segments[i].content.replace(urlRegex, (match) => {
        const url = match.startsWith('www.') ? 'http://' + match : match;
        const safeUrl = sanitizeText(url);
        const displayUrl = sanitizeText(match);
        
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
      });
    }
  }
  
  return segments.map(segment => segment.content).join('');
}

/**
 * Divide HTML en segmentos de etiquetas y texto
 */
function splitHtmlIntoSegments(html) {
  const segments = [];
  let currentIndex = 0;
  const tagRegex = /<[^>]+>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
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

// ========================================
// FUNCIONES EXISTENTES MANTENIDAS
// ========================================

/**
 * Escapa caracteres HTML especiales - MANTENIDA TU LÓGICA
 */
export function escapeHTML(text) {
  if (typeof sanitizeText === 'function') {
    return sanitizeText(text);
  }

  if (!text) return '';
  if (typeof text !== 'string') {
    try {
      text = String(text);
    } catch (e) {
      return '';
    }
  }

  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

/**
 * Detecta si el texto contiene elementos de formato Markdown - MANTENIDA TU LÓGICA
 */
export function containsMarkdownElements(text) {
  if (!text || typeof text !== 'string' || text.length < 2) {
    return false;
  }

  const hasSpecialChars = /[*_~`#\[\]|$\\<>-]/.test(text);
  if (!hasSpecialChars) return false;

  return (
    text.includes('**') ||
    text.includes('*') ||
    text.includes('`') ||
    text.includes('#') ||
    text.includes('[') && text.includes(']') && text.includes('(') ||
    text.includes('$') ||
    text.includes('\\') ||
    text.includes('|') && text.includes('|') ||
    REGEX.BOLD.test(text) ||
    REGEX.ITALIC.test(text) ||
    REGEX.MARKDOWN_LINK.test(text) ||
    REGEX.INLINE_CODE.test(text) ||
    REGEX.HEADING1.test(text) ||
    REGEX.BULLET_LIST.test(text) ||
    REGEX.NUMBERED_LIST.test(text) ||
    REGEX.BLOCKQUOTE.test(text) ||
    REGEX.CODE_BLOCK.test(text) ||
    REGEX.TABLE_ROW.test(text) ||
    REGEX.HORIZONTAL_RULE.test(text)
  );
}

/**
 * Genera HTML para un bloque de código - MANTENIDA TU LÓGICA
 */
export function buildCodeBlockHTML(code, language, index = null) {
  const blockId = index !== null ? `code-block-${index}` : 'code-block';
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
      <button class="copy-button" ${index !== null ? `data-target="${blockId}"` : ''}>
        <i class='bx bx-copy'></i> Copiar
      </button>
    </div>
    <pre><code class="language-${lang}">${safeCode}</code></pre>
  </div>
  `;
}

/**
 * Verifica si un bloque de código es un diagrama Mermaid - MANTENIDA TU LÓGICA
 */
export function isMermaidCode(code, language) {
  return language.toLowerCase() === 'mermaid' ||
    (language === '' && REGEX.MERMAID_PATTERN.test(code));
}

/**
 * Crea HTML para un diagrama Mermaid - MANTENIDA TU LÓGICA
 */
export function createMermaidBlockHTML(code, index = 0) {
  const uniqueId = `mermaid-${Date.now()}-${index}`;
  const escapedCode = escapeSpecialChars(code, true);

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
              data-diagram-id="${uniqueId}">
        <i class="bx bx-expand-alt"></i>
        Ver diagrama completo
      </button>
    </div>
  `;
}

/**
 * Escapa caracteres especiales en texto - MANTENIDA TU LÓGICA
 */
function escapeSpecialChars(text, forAttribute = false) {
  if (!text) return '';
  text = String(text);

  let escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (forAttribute) {
    escapedText = escapedText
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return escapedText;
}

/**
 * Genera HTML para previsualización de imagen - MANTENIDA TU LÓGICA
 */
export function createImagePreviewHTML(src, alt, attrHTML = '') {
  function getChatIdSafe() {
    try {
      const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
      
      if (typeof window !== 'undefined' && window.app?.state?.currentChat?.id) {
        return window.app.state.currentChat.id;
      }
      
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
 * Procesa texto para LaTeX - MANTENIDA TU LÓGICA
 */
export function processLatexText(text) {
  if (!text) return '';

  const hasMathDelimiters = LATEX_PATTERNS.delimiters.test(text);
  const containsLatexCommands = LATEX_PATTERNS.commands.test(text);

  let processedText = text;
  if (containsLatexCommands && !hasMathDelimiters) {
    processedText = `$${text}$`;
  }

  return processedText
    .replace(/\s*>=\s*/g, ' \\geq ')
    .replace(/\s*<=\s*/g, ' \\leq ')
    .replace(/\s*!=\s*/g, ' \\neq ');
}

// ========================================
// FUNCIONES DE UTILIDAD MANTENIDAS
// ========================================

export function linkify(text) {
  return convertPlainUrls(text);
}

export function containsMathExpressions(text) {
  if (typeof text !== 'string') return false;
  return text.includes('$') || text.includes('\\(') || text.includes('\\)') || text.includes('\\[') || text.includes('\\]');
}

export function containsCodeBlocks(text) {
  return /```/.test(text);
}

export function containsMarkdownTable(text) {
  const lines = text.split('\n').map(line => line.trim());
  if (lines.length < 3) return false;

  const headerLine = lines[0];
  const headerCells = headerLine.split('|').filter(cell => cell.trim() !== '');
  if (headerCells.length < 2 || !headerLine.includes('|')) return false;

  const separatorLine = lines[1];
  const isValidSeparator = /^(\|?[ ]*:?[-]+:?[ ]*\|)+$/.test(separatorLine);

  const hasDataLine = lines.slice(2).some(line =>
    line.trim().startsWith('|') &&
    line.trim().endsWith('|') &&
    line.split('|').filter(cell => cell.trim() !== '').length >= headerCells.length
  );

  return isValidSeparator && hasDataLine;
}

export function detectAndRenderMarkdownTables(text, container) {
  if (containsMarkdownTable(text)) {
    container.innerHTML = parseMarkdownToHTML(text);

    if (typeof renderMath === 'function') {
      setTimeout(() => {
        renderMath(container).catch(() => {
          setTimeout(() => renderMath(container).catch(console.error), 500);
        });
      }, 100);
    }

    return true;
  }
  return false;
}

export function detectAndRenderTable(text, container) {
  return detectAndRenderMarkdownTables(text, container);
}

export function containsLists(text) {
  return /(^\s*[-*+]\s+)|(^\s*\d+\.\s+)/m.test(text);
}

export function containsTaskLists(text) {
  return /^\s*[-*+]\s+\[( |x|X)\]/m.test(text);
}

export function processContentWithCodeBlocks(content, container) {
  const codeBlockRegex = /```([a-zA-Z]*)\s*\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    const firstMatch = matches[0];
    const firstMatchStart = content.indexOf(firstMatch[0]);
    const introText = firstMatchStart > 0 ? content.substring(0, firstMatchStart) : '';

    let contentHTML = '';

    if (introText) {
      contentHTML += `<div class="code-intro">${parseMarkdownToHTML(introText)}</div>`;
    }

    matches.forEach((match, index) => {
      const language = match[1] || 'text';
      const code = match[2].trim();

      if (isMermaidCode(code, language)) {
        contentHTML += createMermaidBlockHTML(code, index);
      } else {
        contentHTML += buildCodeBlockHTML(code, language, index);
      }

      if (index < matches.length - 1) {
        const currentMatchEnd = content.indexOf(match[0]) + match[0].length;
        const nextMatchStart = content.indexOf(matches[index + 1][0]);

        if (nextMatchStart > currentMatchEnd) {
          const betweenText = content.substring(currentMatchEnd, nextMatchStart);
          if (betweenText) {
            contentHTML += `<div class="between-code">${parseMarkdownToHTML(betweenText)}</div>`;
          }
        }
      }
    });

    const lastMatch = matches[matches.length - 1];
    const lastMatchEnd = content.indexOf(lastMatch[0]) + lastMatch[0].length;

    if (lastMatchEnd < content.length) {
      const outroText = content.substring(lastMatchEnd);
      if (outroText) {
        contentHTML += `<div class="code-outro">${parseMarkdownToHTML(outroText)}</div>`;
      }
    }

    container.innerHTML = contentHTML;

    if (window.hljs) {
      container.querySelectorAll('pre code').forEach(block => {
        if (!block.classList.contains('hljs')) {
           window.hljs.highlightElement(block);
        }
      });
    }

    if (typeof attachCopyButtonEvents === 'function') {
      attachCopyButtonEvents(container);
    }

    if (typeof containsMathExpressions === 'function' && containsMathExpressions(content)) {
      if (typeof renderMath === 'function') {
        setTimeout(() => renderMath(container).catch(console.error), 100);
      }
    }

    return true;
  }

  container.innerHTML = parseMarkdownToHTML(content);
  return false;
}

export function renderFormattedTable(container, data) {
  container.innerHTML = getFormattedTableHTML(data);
}

export function getFormattedTableHTML(data) {
  const headers = data.headers || [];
  const rows = data.rows || [];
  const caption = data.caption || '';

  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    throw new Error('Los headers y rows deben ser arrays');
  }

  if (headers.length === 0) {
    throw new Error('La tabla debe tener al menos un encabezado');
  }

  let tableHTML = '<div class="table-container"><table class="data-table"><thead><tr>';

  headers.forEach(header => {
    const headerStr = typeof header === 'string' ? header : String(header);
    tableHTML += `<th>${headerStr}</th>`;
  });

  tableHTML += '</tr></thead><tbody>';

  rows.forEach(row => {
    if (!Array.isArray(row)) {
      return;
    }

    tableHTML += '<tr>';
    row.forEach(cell => {
      const cellStr = typeof cell === 'string' ? cell : String(cell);
      tableHTML += `<td>${cellStr}</td>`;
    });
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table>';

  if (caption) {
    tableHTML += `<p class="table-caption">${caption}</p>`;
  }

  tableHTML += '</div>';

  return tableHTML;
}

// ========================================
// EXPORTACIÓN COMPLETA
// ========================================

export default {
  parseMarkdownToHTML,
  escapeHTML,
  linkify,
  processLatexText,
  containsMarkdownTable,
  containsCodeBlocks,
  containsMathExpressions,
  containsLists,
  containsTaskLists,
  buildCodeBlockHTML,
  detectAndRenderMarkdownTables,
  detectAndRenderTable,
  renderFormattedTable,
  getFormattedTableHTML,
  processContentWithCodeBlocks,
  createMermaidBlockHTML,
  isMermaidCode,
  createImagePreviewHTML
};