// markdownParser.js - ACTUALIZADO CON SISTEMA UNIVERSAL DE MATHJAX

import { 
  processUniversalMath, 
  processCompleteMath, 
  preprocessUniversalMath,
  detectUniversalMath 
} from './universalMathProcessor.js';

let isMarkdownInitialized = false;
let globalRenderer = null;
let globalConfig = null;

// Configuración única y centralizada
const MARKDOWN_CONFIG = {
  marked: {
    breaks: true,           // CRÍTICO: Convierte \n en <br>
    gfm: true,             // GitHub Flavored Markdown
    headerIds: false,       
    mangle: false,         
    pedantic: false,       
    sanitize: false,       
    smartLists: true,      
    smartypants: false,    
    xhtml: false          
  },
  
  streaming: {
    renderDelay: 100,      
    minChunkSize: 2,       
    preserveLines: true    
  },
  
  elements: {
    allowMath: true,
    allowDiagrams: true,
    allowCharts: true,
    processOnComplete: true
  }
};

export function initMarkdownParser() {
  if (isMarkdownInitialized) {
    return true;
  }

  if (typeof marked === 'undefined') {
    console.error('❌ Marked no está disponible');
    return false;
  }

  try {
    // Configuración global única
    marked.setOptions(MARKDOWN_CONFIG.marked);
    
    // Crear renderer personalizado
    globalRenderer = new marked.Renderer();
    
    // Personalizar renderer
    globalRenderer.paragraph = function(text) {
      return `<p>${text}</p>\n`;
    };
    
    globalRenderer.code = function(code, language) {
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      
      const langDisplay = language || 'text';
      return `<div class="code-block-wrapper" data-language="${langDisplay}">
        <span class="code-language-tag">${langDisplay}</span>
        <pre><code class="language-${language || 'plaintext'}">${escapeHtml(code)}</code></pre>
      </div>`;
    };
    
    globalRenderer.table = function(header, body) {
      return `<div class="table-container">
        <table class="markdown-table">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    };
    
    globalRenderer.image = function(href, title, text) {
      return `<img src="${href}" alt="${text}" title="${title || ''}" class="markdown-image">`;
    };
    
    globalRenderer.link = function(href, title, text) {
      const target = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}" title="${title || ''}"${target}>${text}</a>`;
    };

    globalConfig = MARKDOWN_CONFIG;
    isMarkdownInitialized = true;
    
    console.log('✅ Sistema de markdown CENTRALIZADO con MathJax Universal inicializado');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando markdown:', error);
    return false;
  }
}

export function renderMarkdown(content, options = {}) {
  const {
    isStreaming = false,
    preserveLineBreaks = true,
    allowMath = true,
    allowDiagrams = true
  } = options;

  // Asegurar inicialización
  if (!isMarkdownInitialized) {
    initMarkdownParser();
  }

  // Validar entrada
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  try {
    // ✨ NUEVO: PREPROCESAMIENTO MATEMÁTICO UNIVERSAL
    let processedContent = content;
    if (allowMath) {
      // Usar el nuevo sistema universal
      processedContent = preprocessUniversalMath(processedContent);
      console.log('🧮 Contenido preprocesado con Sistema Universal de MathJax');
    }
    
    // Preprocesamiento regular CORREGIDO
    processedContent = preprocessContentFixed(processedContent, isStreaming);
    
    // Renderizado con marked
    let html;
    if (typeof marked !== 'undefined' && isMarkdownInitialized) {
      html = marked.parse(processedContent, {
        renderer: globalRenderer,
        breaks: true // Reforzar configuración crítica
      });
      
      // Verificación crítica de saltos de línea
      if (processedContent.includes('\n') && !html.includes('<br>') && !html.includes('</p>')) {
        html = applyLineBreaksCorrection(html, processedContent);
      }
      
    } else {
      html = unifiedFallbackRendererFixed(processedContent, isStreaming);
    }

    // Postprocesamiento
    html = postProcessHtml(html, isStreaming, allowMath, allowDiagrams);
    
    return html;
  } catch (error) {
    console.error('❌ Error en renderMarkdown centralizado:', error);
    return emergencyFallback(content);
  }
}

export function renderMarkdownStreaming(content) {
  return renderMarkdown(content, { 
    isStreaming: true,
    preserveLineBreaks: true,
    allowMath: true
  });
}

export function renderMarkdownComplete(content) {
  return renderMarkdown(content, { 
    isStreaming: false,
    preserveLineBreaks: true,
    allowMath: true,
    allowDiagrams: true
  });
}

// ✨ FUNCIÓN CORREGIDA PARA MANEJAR \n**texto**
function preprocessContentFixed(content, isStreaming) {
  // Normalizar saltos de línea
  content = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  console.log('🔧 Aplicando corrección PROTEGIDA para \\n\\n**texto**...');

  // ✅ PASO 1: ESCAPAR temporalmente los ** problemáticos con un placeholder único
  const BOLD_PLACEHOLDER = '___BOLD_PROTECTED___';
  const protectedPairs = [];
  
  // Proteger patrones problemáticos específicamente
  content = content.replace(/\n\n(\*\*[^*\n]+?\*\*)/g, (match, boldText) => {
    const index = protectedPairs.length;
    protectedPairs.push(boldText);
    return `\n\n ${BOLD_PLACEHOLDER}${index}${BOLD_PLACEHOLDER}`;
  });
  
  content = content.replace(/\n(\*\*[^*\n]+?\*\*)/g, (match, boldText) => {
    const index = protectedPairs.length;
    protectedPairs.push(boldText);
    return `\n ${BOLD_PLACEHOLDER}${index}${BOLD_PLACEHOLDER}`;  
  });
  
  // Proteger ** al inicio
  if (content.startsWith('**')) {
    const match = content.match(/^(\*\*[^*\n]+?\*\*)/);
    if (match) {
      const index = protectedPairs.length;
      protectedPairs.push(match[1]);
      content = content.replace(/^(\*\*[^*\n]+?\*\*)/, ` ${BOLD_PLACEHOLDER}${index}${BOLD_PLACEHOLDER}`);
    }
  }

  // Procesamiento normal para streaming/no-streaming
  if (isStreaming) {
    content = content
      .replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
      .replace(/^(\s*[-+*])([^\s])/gm, '$1 $2');
  } else {
    content = content
      .replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(\s*[-+*])([^\s])/gm, '$1 $2');
  }

  // ✅ PASO 2: RESTAURAR los ** protegidos AL FINAL
  protectedPairs.forEach((boldText, index) => {
    const placeholder = `${BOLD_PLACEHOLDER}${index}${BOLD_PLACEHOLDER}`;
    content = content.replace(placeholder, boldText);
  });

  return content;
}

function applyLineBreaksCorrection(html, originalContent) {
  const lines = originalContent.split('\n');
  let correctedHtml = html;
  
  correctedHtml = correctedHtml.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
    if (content.includes('\n')) {
      const correctedContent = content.replace(/\n/g, '<br>');
      return `<p>${correctedContent}</p>`;
    }
    return match;
  });
  
  return correctedHtml;
}

function postProcessHtml(html, isStreaming, allowMath, allowDiagrams) {
  // ✨ LIMPIEZA MEJORADA PARA EVITAR PÁRRAFOS VACÍOS CON ELEMENTOS DE NEGRITA
  html = html
    .replace(/<p><\/p>/g, '')                    // Eliminar párrafos vacíos
    .replace(/<p>\s*<\/p>/g, '')                 // Eliminar párrafos solo con espacios
    .replace(/<p><br><\/p>/g, '')                // Eliminar párrafos solo con br
    .replace(/(<\/p>)\s*(<p>)/g, '$1\n$2')       // Normalizar espacios entre párrafos
    .replace(/<p>\s*(<strong>)/g, '<p>$1')       // Limpiar espacios antes de <strong>
    .replace(/(<\/strong>)\s*<\/p>/g, '$1</p>'); // Limpiar espacios después de </strong>

  // Procesar Mermaid si está permitido
  if (allowDiagrams && html.includes('language-mermaid')) {
    html = html.replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, code) => {
        const decodedCode = decodeHtmlEntities(code);
        return `<div class="mermaid">${decodedCode}</div>`;
      }
    );
  }

  // ✨ NUEVO: MARCAR CONTENIDO MATEMÁTICO PARA SISTEMA UNIVERSAL
  if (allowMath) {
    const mathDetection = detectUniversalMath(html);
    if (mathDetection.hasMath) {
      html = `<div class="math-content" data-math-types="${mathDetection.types.join(',')}" data-math-confidence="${mathDetection.confidence}">${html}</div>`;
      console.log(`🧮 Contenido marcado para Sistema Universal de MathJax (${mathDetection.types.length} tipos detectados)`);
    }
  }

  return html;
}

// ✨ RENDERER FALLBACK CORREGIDO PARA MANEJAR \n**texto**
function unifiedFallbackRendererFixed(content, isStreaming) {
  let html = escapeHtml(content);
  
  // Procesar bloques de código primero
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)\n?```/g, (match, lang, code) => {
    const language = lang.trim() || 'text';
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    
    if (language === 'mermaid') {
      codeBlocks.push(`<div class="mermaid">${code.trim()}</div>`);
    } else {
      codeBlocks.push(`<div class="code-block-wrapper" data-language="${language}">
        <span class="code-language-tag">${language}</span>
        <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
      </div>`);
    }
    return placeholder;
  });
  
  // Procesar código inline
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  // Procesar encabezados
  html = html
    .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // ✨ PROCESAR ÉNFASIS CON MEJOR MANEJO DE SALTOS DE LÍNEA
  html = html
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Procesar listas
  html = html
    .replace(/^(\s*[-*+])\s+(.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>)\n(?!<li>)/g, '$1</ul>\n')
    .replace(/(?<!<\/ul>)\n(<li>)/g, '\n<ul>$1');
  
  // ✨ PROCESAMIENTO MEJORADO DE PÁRRAFOS CON CORRECCIÓN PARA \n**texto**
  html = processLineBreaksImproved(html);
  
  // Restaurar bloques de código
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  return html;
}

// ✨ FUNCIÓN CORREGIDA PARA PROCESAR SALTOS DE LÍNEA
function processLineBreaksImproved(html) {
  // Dividir en líneas para procesamiento
  const lines = html.split('\n');
  const result = [];
  let currentParagraph = [];
  let inSpecialBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar bloques especiales (headers, listas, código)
    const isSpecialLine = trimmedLine.match(/^<h[1-6]>/) || 
                         trimmedLine.match(/^<\/h[1-6]>/) ||
                         trimmedLine.startsWith('<ul>') ||
                         trimmedLine.startsWith('</ul>') ||
                         trimmedLine.startsWith('<li>') ||
                         trimmedLine.startsWith('__CODE_BLOCK_');
    
    if (isSpecialLine) {
      // Cerrar párrafo actual si existe
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      
      result.push(line);
      inSpecialBlock = true;
      continue;
    }
    
    // Línea vacía
    if (trimmedLine === '') {
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join('<br>') + '</p>');
        currentParagraph = [];
      }
      inSpecialBlock = false;
      continue;
    }
    
    // ✨ LÍNEA DE CONTENIDO NORMAL CON CORRECCIÓN PARA ELEMENTOS <strong>
    if (!inSpecialBlock) {
      // Si la línea contiene solo elementos <strong> al inicio, es una línea de párrafo normal
      if (trimmedLine.startsWith('<strong>')) {
        currentParagraph.push(trimmedLine);
      } else {
        currentParagraph.push(trimmedLine);
      }
    } else {
      result.push(line);
      inSpecialBlock = false;
    }
  }
  
  // Cerrar último párrafo si existe
  if (currentParagraph.length > 0) {
    result.push('<p>' + currentParagraph.join('<br>') + '</p>');
  }
  
  // ✨ LIMPIEZA FINAL PARA EVITAR PROBLEMAS CON \n**texto**
  let finalHtml = result.join('\n');
  
  // Eliminar párrafos vacíos que puedan haberse creado
  finalHtml = finalHtml
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p><\/p>/g, '')
    .replace(/\n\s*\n/g, '\n');
  
  return finalHtml;
}

function emergencyFallback(content) {
  if (!content) return '';
  
  let result = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
    
  return result;
}

// ✨ PROCESAMIENTO DE ELEMENTOS ESPECIALES COMPLETAMENTE RENOVADO
export function processSpecialElements(element, isStreamingComplete = false) {
  if (!element) return;

  console.log('🔧 Procesando elementos especiales...', isStreamingComplete ? '(completo)' : '(streaming)');

  // Procesar código con highlight.js
  const codeElements = element.querySelectorAll('pre code:not(.hljs)');
  if (codeElements.length > 0 && typeof hljs !== 'undefined') {
    codeElements.forEach(block => {
      try {
        hljs.highlightElement(block);
      } catch (error) {
        console.warn('Error con highlight.js:', error);
      }
    });
  }

  // Procesar Mermaid solo si streaming está completo
  if (isStreamingComplete) {
    const mermaidElements = element.querySelectorAll('.mermaid:not([data-processed="true"])');
    if (mermaidElements.length > 0 && typeof mermaid !== 'undefined') {
      try {
        mermaid.init(undefined, mermaidElements);
      } catch (error) {
        console.error('Error con Mermaid:', error);
      }
    }
  }

  // ✨ NUEVO: USAR SISTEMA UNIVERSAL DE MATHJAX
  if (isStreamingComplete) {
    // Procesamiento completo con el sistema universal
    processCompleteMath(element)
      .then((success) => {
        if (success) {
          console.log('✅ Matemáticas procesadas con Sistema Universal');
        } else {
          console.log('📭 No se encontraron matemáticas para procesar');
        }
      })
      .catch((error) => {
        console.error('❌ Error procesando matemáticas:', error);
      });
  } else {
    // Durante streaming, solo preparar
    processUniversalMath(element, true);
  }

  // Procesar gráficos Chart.js
  processChartElements(element);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function decodeHtmlEntities(text) {
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || '';
}

function processChartElements(element) {
  const chartElements = element.querySelectorAll('.chart-js:not([data-chart-initialized])');
  
  chartElements.forEach(canvas => {
    try {
      const config = JSON.parse(canvas.getAttribute('data-config'));
      new Chart(canvas, config);
      canvas.setAttribute('data-chart-initialized', 'true');
    } catch (error) {
      console.error('Error creating chart:', error);
      
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-container';
      errorContainer.innerHTML = `
        <p>Error al renderizar gráfico:</p>
        <pre>${error.message}</pre>
      `;
      
      canvas.parentNode.replaceChild(errorContainer, canvas);
    }
  });
}

export function getMarkdownConfig() {
  return globalConfig;
}

export function updateMarkdownConfig(newConfig) {
  if (globalConfig) {
    globalConfig = { ...globalConfig, ...newConfig };
    console.log('✅ Configuración de markdown actualizada');
  }
}

export function isMarkdownReady() {
  return isMarkdownInitialized;
}

// ✨ NUEVA: FUNCIÓN DE UTILIDAD PARA FORZAR PROCESAMIENTO MATEMÁTICO UNIVERSAL
export function forceProcessMath(selector = null) {
  const elements = selector ? 
    document.querySelectorAll(selector) : 
    [document.body];
  
  elements.forEach(element => {
    processCompleteMath(element);
  });
}

// Exposición global centralizada
window.renderMarkdownModule = renderMarkdown;
window.renderMarkdownStreaming = renderMarkdownStreaming;
window.renderMarkdownComplete = renderMarkdownComplete;
window.processSpecialElementsModule = processSpecialElements;
window.initMarkdownParser = initMarkdownParser;
window.forceProcessMath = forceProcessMath;

console.log('✅ Sistema de markdown CENTRALIZADO con MathJax Universal cargado');