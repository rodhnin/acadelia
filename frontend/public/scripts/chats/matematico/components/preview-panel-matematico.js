/**
 * preview-panel.js - Gestión del panel de previsualización de contenido especial
 * Con soporte para diagramas Mermaid
 * Versión adaptada con funcionalidades completas
 */
import { renderMath } from '../math/mathjax-config.js';
import { renderExam } from './exam-renderer-matematico.js';
import { 
  copyToClipboard, 
  copyElementContent, 
  attachCopyEvents 
} from '../utils/clipboard-matematico.js';
import { 
  createElement, 
  createElementWithHTML, 
  sanitizeText, 
  addEvent,
  clearElement, 
  setManagedTimeout,
  clearManagedTimeouts
} from '../../shared/dom-helpers.js';
import { 
  initializeMermaidDiagram, 
  downloadMermaidAsSVG, 
  updateMermaidTheme 
} from '../../shared/mermaid-utils.js';

// Estado del panel
const previewPanelState = {
  isOpen: false,
  currentContent: null,
  currentType: null,
  eventListeners: new Map(),
  themeListenerAttached: false  // Flag para controlar listener de tema específico para Mermaid
};

/**
 * Inicializa el panel de previsualización
 */
export function initPreviewPanel() {
  if (!document.querySelector('#preview-panel')) {
    createPreviewPanel();
  }
  
  setupPanelEvents();
  
  // Exponer funciones globalmente para acceso desde eventos
  window.previewPanel = {
    closePreviewPanel: closePreviewPanel,
    copyContent: function() {
      const contentContainer = document.querySelector('.preview-panel-content');
      if (contentContainer) {
        try {
          copyFullPanelContent(contentContainer, document.querySelector('.preview-control.copy-all'));
          return true;
        } catch (e) {
          console.error('Error en copyContent global:', e);
          return false;
        }
      }
      return false;
    }
  };
}

/**
 * Crea la estructura del panel de previsualización
 */
function createPreviewPanel() {
  const panel = createElement('div', {
    id: 'preview-panel',
    className: 'preview-panel'
  });
  
  panel.innerHTML = `
    <div class="preview-panel-header">
      <h3 class="preview-panel-title">Vista detallada</h3>
      <div class="preview-panel-controls">
        <button class="preview-control zoom-in" title="Acercar">
          <i class='bx bx-zoom-in'></i>
        </button>
        <button class="preview-control zoom-out" title="Alejar">
          <i class='bx bx-zoom-out'></i>
        </button>
        <button class="preview-control reset-view" title="Restablecer vista">
          <i class='bx bx-reset'></i>
        </button>
        <button class="preview-control copy-all" title="Copiar todo el contenido">
          <i class='bx bx-copy-alt'></i>
        </button>
        <button class="preview-control close" title="Cerrar">
          <i class='bx bx-x'></i>
        </button>
      </div>
    </div>
    <div class="preview-panel-content"></div>
  `;
  
  document.body.appendChild(panel);
}

/**
 * Maneja cambios de tema en el panel de vista previa específicamente para Mermaid
 */
function handlePanelThemeChange(event) {
  if (!previewPanelState.isOpen || !event?.detail?.theme) return;
  
  const theme = event.detail.theme;
  const container = document.querySelector('.preview-panel-content');
  
  if (container && previewPanelState.currentType === 'mermaid') {
    // Re-renderizar el diagrama con el nuevo tema
    const diagramContainer = container.querySelector('.preview-diagram');
    if (diagramContainer && previewPanelState.currentContent?.code) {
      const code = previewPanelState.currentContent.code;
      const id = diagramContainer.id;
      
      diagramContainer.innerHTML = `
        <div class="mermaid-loading">
          <i class="bx bx-loader-alt bx-spin"></i>
          <span>Actualizando diagrama...</span>
        </div>
      `;
      
      setTimeout(() => {
        updateMermaidTheme(theme);
        initializeMermaidDiagram(id, code);
      }, 200);
    }
  }
}

/**
 * Configura los eventos del panel
 */
function setupPanelEvents() {
  const panel = document.querySelector('#preview-panel');
  if (!panel) return;
  
  if (!previewPanelState.themeListenerAttached) {
    document.addEventListener('themeChanged', handlePanelThemeChange);
    previewPanelState.themeListenerAttached = true;
  }
  
  // Botón de cierre
  const closeBtn = panel.querySelector('.preview-control.close');
  if (closeBtn) {
    addEvent(closeBtn, 'click', closePreviewPanel);
  }
  
  // Botones de zoom
  const zoomInBtn = panel.querySelector('.preview-control.zoom-in');
  const zoomOutBtn = panel.querySelector('.preview-control.zoom-out');
  const resetBtn = panel.querySelector('.preview-control.reset-view');
  
  if (zoomInBtn && zoomOutBtn && resetBtn) {
    setupZoomControls(zoomInBtn, zoomOutBtn, resetBtn);
  }
  
  // Botón para copiar todo el contenido
  const copyAllBtn = panel.querySelector('.preview-control.copy-all');
  if (copyAllBtn) {
    addEvent(copyAllBtn, 'click', () => {
      const contentContainer = document.querySelector('.preview-panel-content');
      if (contentContainer) {
        copyFullPanelContent(contentContainer, copyAllBtn);
      }
    });
  }
}

/**
 * Configura el listener específico para cambios de tema en el panel
 */
function setupThemeListener() {
  // Evitar duplicar listeners
  if (previewPanelState.themeListenerAttached) return;
  
  console.log("Configurando listener de tema para panel de vista previa");
  
  document.addEventListener('themeChanged', handlePreviewThemeChange, true);
  previewPanelState.themeListenerAttached = true;
}

/**
 * Maneja cambios de tema en preview panel con prioridad alta
 */
function handlePreviewThemeChange(event) {
  if (!previewPanelState.isOpen) return;
  
  const newTheme = event?.detail?.theme;
  if (!newTheme) return;
  
  console.log(`Cambio de tema detectado en panel: ${newTheme}`);
  
  // Si hay un Mermaid en el panel, actualizarlo inmediatamente
  if (previewPanelState.currentType === 'mermaid' && previewPanelState.currentContent?.code) {
    syncMermaidTheme(newTheme);
  }
}

/**
 * Sincroniza el tema de Mermaid en el panel de vista previa
 */
function syncMermaidTheme(theme) {
  console.log(`Sincronizando tema de Mermaid en panel: ${theme}`);
  
  if (!previewPanelState.isOpen || 
      !previewPanelState.currentContent?.code || 
      previewPanelState.currentType !== 'mermaid') {
    return;
  }
  
  const container = document.querySelector('.preview-panel-content');
  if (!container) return;
  
  const diagramDiv = container.querySelector('.preview-diagram');
  if (!diagramDiv) return;
  
  const code = previewPanelState.currentContent.code;
  const id = diagramDiv.id;
  
  diagramDiv.innerHTML = `
    <div class="mermaid-loading">
      <i class="bx bx-loader-alt bx-spin"></i>
      <span>Actualizando diagrama...</span>
    </div>
  `;
  
  updateMermaidTheme(theme);
  
  setTimeout(() => {
    initializeMermaidDiagram(id, code).then(() => {
      console.log("Diagrama en panel actualizado correctamente");
    }).catch(error => {
      console.error("Error actualizando diagrama en panel:", error);
    });
  }, 100);
}

/**
 * Función mejorada para copiar todo el contenido del panel
 * @param {HTMLElement} container - Contenedor del contenido a copiar
 * @param {HTMLElement} button - Botón de copia (para retroalimentación)
 */
function copyFullPanelContent(container, button) {
  if (!container) return;
  
  try {
    // CASO ESPECIAL: Si es un diagrama Mermaid, manejar de forma específica
    if (previewPanelState.currentType === 'mermaid' && previewPanelState.currentContent?.code) {
      const code = previewPanelState.currentContent.code;
      copyToClipboard(code, { 
        button, 
        successMessage: 'Código Mermaid copiado',
        errorMessage: 'Error al copiar código Mermaid'
      });
      
      if (button && button.dataset.copyFailed === 'true') {
        try {
          navigator.clipboard.writeText(code).then(() => {
            // Éxito - cambiar estado del botón temporalmente
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="bx bx-check"></i> ¡Copiado!';
            button.classList.add('copy-success');
            
            setTimeout(() => {
              button.innerHTML = originalText;
              button.classList.remove('copy-success');
            }, 2000);
          });
        } catch (clipboardError) {
          console.error('Error en fallback de copia:', clipboardError);
        }
      }
      return;
    }
    
    const tempDiv = document.createElement('div');
    
    const clone = container.cloneNode(true);
    
    const elementsToRemove = clone.querySelectorAll('.copy-button, .preview-control, .expand-content-btn');
    elementsToRemove.forEach(el => el.remove());
    
    // Asegurarse de que los bloques de código conserven su formato
    const codeBlocks = clone.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      // Mantener la indentación y espacios en blanco
      block.textContent = block.textContent;
    });
    
    // Manipular tablas para asegurar que todo el contenido sea visible
    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      // Asegurarse de que las celdas de la tabla sean visibles incluso si estaban truncadas
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        if (cell.title && !cell.textContent.trim()) {
          cell.textContent = cell.title;
        }
      });
    });
    
    tempDiv.appendChild(clone);
    
    const contentText = tempDiv.innerText || tempDiv.textContent;
    
    const cleanedText = cleanTextForCopy(contentText);
    
    copyToClipboard(cleanedText, { 
      button, 
      successMessage: 'Contenido completo copiado',
      errorMessage: 'Error al copiar contenido'
    });
    
    if (button && button.dataset.copyFailed === 'true') {
      try {
        navigator.clipboard.writeText(cleanedText).then(() => {
          // Éxito - cambiar estado del botón temporalmente
          const originalText = button.innerHTML;
          button.innerHTML = '<i class="bx bx-check"></i> ¡Copiado!';
          button.classList.add('copy-success');
          
          setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copy-success');
          }, 2000);
        });
      } catch (clipboardError) {
        console.error('Error en fallback de copia:', clipboardError);
      }
    }
  } catch (error) {
    console.error('Error al copiar contenido completo:', error);
    
    copyElementContent(container, { button });
  }
}

/**
 * Limpia el texto para la copia, eliminando espacios excesivos
 * @param {string} text - Texto a limpiar
 * @returns {string} - Texto limpio
 */
function cleanTextForCopy(text) {
  if (!text) return '';
  
  let cleaned = text.replace(/\n{3,}/g, '\n\n');
  
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  
  cleaned = cleaned.replace(/\n[ \t]{4,}/g, '\n  ');
  
  return cleaned;
}

/**
 * Da formato especial a exámenes para la copia
 * @param {HTMLElement} examContainer - Contenedor del examen
 */
function formatExamForCopy(examContainer) {
  try {
    const questions = examContainer.querySelectorAll('.exam-question, .quiz-question, .question-item');
    
    questions.forEach((question, index) => {
      if (question.getAttribute('data-formatted')) return;
      
      const questionText = question.querySelector('.question-text, .question-statement, h3, h4')?.textContent || '';
      
      const options = question.querySelectorAll('.option, .answer-option, li');
      const optionsText = Array.from(options).map(opt => {
        const prefix = opt.querySelector('.option-prefix')?.textContent || '';
        const text = opt.querySelector('.option-text')?.textContent || opt.textContent;
        return (prefix ? prefix + ' ' : '') + text;
      }).join('\n');
      
      const correctAnswer = question.querySelector('.correct-answer, .solution, .answer')?.textContent || '';
      
      const formattedQuestion = document.createElement('div');
      formattedQuestion.innerHTML = `
        <p><strong>Pregunta ${index + 1}:</strong> ${questionText}</p>
        <p>Opciones:</p>
        <p>${optionsText.replace(/\n/g, '<br>')}</p>
        ${correctAnswer ? `<p><strong>Respuesta:</strong> ${correctAnswer}</p>` : ''}
      `;
      
      formattedQuestion.setAttribute('data-formatted', 'true');
      
      question.innerHTML = formattedQuestion.innerHTML;
    });
  } catch (error) {
    console.error('Error al formatear examen para copia:', error);
    // Si falla, no modificamos nada
  }
}

/**
 * Configura los controles de zoom
 */
function setupZoomControls(zoomInBtn, zoomOutBtn, resetBtn) {
  let scale = 1;
  const contentContainer = document.querySelector('.preview-panel-content');
  
  addEvent(zoomInBtn, 'click', () => {
    scale = Math.min(scale + 0.1, 3);
    applyZoom(contentContainer, scale);
  });
  
  addEvent(zoomOutBtn, 'click', () => {
    scale = Math.max(scale - 0.1, 0.5);
    applyZoom(contentContainer, scale);
  });
  
  addEvent(resetBtn, 'click', () => {
    scale = 1;
    applyZoom(contentContainer, scale);
  });
}

/**
 * Aplica zoom al contenido
 */
function applyZoom(container, scale) {
  if (!container) return;
  
  container.style.transform = `scale(${scale})`;
  container.style.transformOrigin = 'center top';
}

/**
 * Muestra el panel de previsualización con el contenido especificado
 * @param {Object} content - Contenido a mostrar
 * @param {string} type - Tipo de contenido ('exam', 'code', 'table', 'mermaid')
 */
export function showPreviewPanel(content, type) {
  const panel = document.querySelector('#preview-panel');
  if (!panel) {
    console.error('Panel de previsualización no encontrado');
    return;
  }

  cleanupPanelState();
  
  if (window.scrollManager) {
    window.scrollManager.lockScrollWithReason('preview-panel-show', 800);
  }  
  
  previewPanelState.isOpen = true;
  previewPanelState.currentContent = content;
  previewPanelState.currentType = type;
  
  updatePanelTitle(type, content);
  
  panel.classList.add('open');
  document.body.classList.add('preview-panel-active');
  
  renderContentInPanel(content, type);
  
  // IMPORTANTE: Asegurar que el listener de tema esté activo para Mermaid
  if (type === 'mermaid') {
    setupThemeListener();
    
    const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
    setTimeout(() => {
      syncMermaidTheme(currentTheme);
    }, 300);
  }
}

/**
 * Actualiza el título del panel según el tipo de contenido
 */
function updatePanelTitle(type, content) {
  const titleElement = document.querySelector('.preview-panel-title');
  if (!titleElement) return;
  
  switch (type) {
    case 'exam':
      titleElement.textContent = `Examen: ${content.topic || 'Sin título'}`;
      break;
    case 'code':
      if (content.isDocument) {
        titleElement.textContent = `Documento: ${content.title || 'Sin título'}`;
      } else {
        titleElement.textContent = `Código: ${content.language || 'JavaScript'}`;
      }
      break;
    case 'table':
      titleElement.textContent = content.caption || 'Tabla de datos';
      break;
    case 'mermaid':
      titleElement.textContent = content.title || 'Diagrama Mermaid';
      break;
    default:
      titleElement.textContent = 'Vista detallada';
  }
}

/**
 * Renderiza el contenido en el panel según su tipo
 */
function renderContentInPanel(content, type) {
  const contentContainer = document.querySelector('.preview-panel-content');
  if (!contentContainer) return;
  
  clearElement(contentContainer);
  
  switch (type) {
    case 'exam':
      renderExamInPanel(content, contentContainer);
      break;
    case 'code':
      renderCodeInPanel(content, contentContainer);
      break;
    case 'table':
      renderTableInPanel(content, contentContainer);
      break;
    case 'mermaid':
      renderMermaidInPanel(content, contentContainer);
      break;
    default:
      contentContainer.innerHTML = '<div class="error-message">Tipo de contenido no soportado</div>';
  }
}

/**
 * Renderiza un diagrama Mermaid en el panel de previsualización
 * @param {Object} mermaidData - Datos del diagrama
 * @param {HTMLElement} container - Contenedor donde renderizar
 */
function renderMermaidInPanel(mermaidData, container) {
  try {
    if (!mermaidData || !mermaidData.code) {
      throw new Error('Datos de diagrama inválidos');
    }
    
    const previewContainer = createElement('div', { 
      className: 'concept-map-preview-container',
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    });
    
    // Título del diagrama
    const title = createElement('h3', {
      className: 'preview-diagram-title',
      style: {
        textAlign: 'center',
        margin: '0 0 16px 0'
      }
    }, sanitizeText(mermaidData.title || 'Diagrama Mermaid'));
    
    previewContainer.appendChild(title);
    
    // Contenedor del diagrama
    const uniqueId = `preview-mermaid-${Date.now()}`;
    const diagramDiv = createElement('div', { 
      className: 'preview-diagram', 
      id: uniqueId,
      style: {
        flex: 1,
        width: '100%',
        height: 'calc(100% - 110px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }
    });
    
    // Mensaje de carga
    const loadingDiv = createElementWithHTML('div', { className: 'mermaid-loading' }, 
      '<i class="bx bx-loader-alt bx-spin"></i> Cargando diagrama...'
    );
    diagramDiv.appendChild(loadingDiv);
    
    previewContainer.appendChild(diagramDiv);
    
    const downloadContainer = createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0 0 0'
      }
    });
    
    const downloadBtn = createElement('button', {
      className: 'download-diagram-btn',
      title: 'Descargar como SVG',
      'data-code': mermaidData.code,
      'data-title': mermaidData.title || 'Diagrama'
    });
    
    const downloadIcon = createElement('i', { className: 'bx bx-download' });
    downloadBtn.appendChild(downloadIcon);
    downloadBtn.appendChild(document.createTextNode(' Descargar como SVG'));
    
    addEvent(downloadBtn, 'click', () => {
      const code = downloadBtn.getAttribute('data-code');
      const title = downloadBtn.getAttribute('data-title');
      downloadMermaidAsSVG(code, title.replace(/[^a-z0-9]/gi, '_').toLowerCase());
    });
    
    downloadContainer.appendChild(downloadBtn);
    previewContainer.appendChild(downloadContainer);
    
    container.appendChild(previewContainer);
    
    initializeMermaidDiagram(uniqueId, mermaidData.code).catch(error => {
      console.error('Error al renderizar diagrama Mermaid:', error);
      
      diagramDiv.innerHTML = `
        <div class="mermaid-error">
          <i class="bx bx-error"></i>
          <p>Error al renderizar diagrama: ${sanitizeText(error.message)}</p>
          <button class="retry-render-btn">
            <i class="bx bx-refresh"></i> Reintentar
          </button>
        </div>
      `;
      
      const retryBtn = diagramDiv.querySelector('.retry-render-btn');
      if (retryBtn) {
        addEvent(retryBtn, 'click', () => {
          initializeMermaidDiagram(uniqueId, mermaidData.code);
        });
      }
    });
    
  } catch (error) {
    clearElement(container);
    
    const errorIcon = createElement('i', { className: 'bx bx-error' });
    const errorText = createElement('p', {}, `Error al renderizar el diagrama: ${sanitizeText(error.message)}`);
    
    const errorDiv = createElement('div', 
      { className: 'preview-error' }, 
      [errorIcon, errorText]
    );
    
    container.appendChild(errorDiv);
  }
}

/**
 * Renderiza un examen en el panel
 */
function renderExamInPanel(examData, container) {
  const examContainer = createElement('div', {
    className: 'exam-preview-container'
  });
  container.appendChild(examContainer);
  
  try {
    renderExam(examData, examContainer);
    
    setManagedTimeout(() => {
      renderMath(examContainer).catch(console.error);
    }, 300, 'preview-panel-exam-math');
  } catch (error) {
    container.innerHTML = `
      <div class="preview-error">
        <i class='bx bx-error'></i>
        <p>Error al renderizar el examen: ${sanitizeText(error.message)}</p>
      </div>
    `;
  }
}

/**
 * Renderiza código en el panel
 */
function renderCodeInPanel(codeData, container) {
  try {
    // CASO 1: Nuevo formato con contenido HTML completo
    if (codeData.codeContent) {
      const codeContainer = createElement('div', {
        className: 'code-content-preview'
      });
      codeContainer.innerHTML = codeData.codeContent;
      
      if (window.hljs) {
        codeContainer.querySelectorAll('pre code').forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
      
      // Adjuntar eventos de copia a los botones usando la utilidad centralizada
      attachCopyEvents(codeContainer);
      
      setManagedTimeout(() => {
        renderMath(container).catch(err => {
          console.error('Error al renderizar matemáticas en código:', err);
        });
      }, 300, 'preview-panel-code-math');

      container.appendChild(codeContainer);
      return;
    }
    
    // CASO 2: Formato anterior con un solo bloque de código
    const { code, language } = codeData;
    
    const codeBlock = createElement('div', {
      className: 'code-block-preview'
    });
    
    codeBlock.innerHTML = `
      <div class="code-header">
        <span class="code-language">${sanitizeText(language || 'text')}</span>
        <button class="copy-button">
          <i class='bx bx-copy'></i> Copiar
        </button>
      </div>
      <pre><code class="language-${sanitizeText(language || 'text')}">${sanitizeText(code)}</code></pre>
    `;
    
    container.appendChild(codeBlock);
    
    if (window.hljs) {
      container.querySelectorAll('pre code').forEach(block => {
         window.hljs.highlightElement(block);
      });
    }
    
    // Evento para copiar usando la utilidad centralizada
    const copyBtn = codeBlock.querySelector('.copy-button');
    if (copyBtn) {
      addEvent(copyBtn, 'click', () => {
        copyToClipboard(code, { button: copyBtn });
      });
    }
  } catch (error) {
    container.innerHTML = `
      <div class="preview-error">
        <i class='bx bx-error'></i>
        <p>Error al renderizar el código: ${sanitizeText(error.message)}</p>
      </div>
    `;
  }
}

/**
 * Renderiza una tabla en el panel
 */
function renderTableInPanel(tableData, container) {
  try {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-preview-container';
    
    // CASO 1: Si hay contenido HTML directo
    if (tableData.tableContent) {
      tableContainer.innerHTML = tableData.tableContent;
      
      const expandButtons = tableContainer.querySelectorAll('.expand-content-btn');
      expandButtons.forEach(button => button.remove());
    }
    // CASO 2: Verificar el formato de la tabla (JSON)
    else if (Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
      // Formato JSON
      const table = document.createElement('table');
      table.className = 'preview-table';
      
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      tableData.headers.forEach(header => {
        const th = document.createElement('th');
        th.innerHTML = header;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      const tbody = document.createElement('tbody');
      
      tableData.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        row.forEach(cell => {
          const td = document.createElement('td');
          td.innerHTML = cell;
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      
    } else if (typeof tableData === 'string') {
      // CASO 3: Formato markdown o raw
      tableContainer.innerHTML = tableData;
    }
    
    container.appendChild(tableContainer);
    
    setTimeout(() => {
      renderMath(tableContainer).catch(console.error);
    }, 300);
  } catch (error) {
    container.innerHTML = `
      <div class="preview-error">
        <i class='bx bx-error'></i>
        <p>Error al renderizar la tabla: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Limpia los event listeners del panel
 */
function clearPanelEventListeners() {
  previewPanelState.eventListeners.forEach((config, element) => {
    if (element && typeof element.removeEventListener === 'function') {
      // Preservar el listener de tema
      if (element === document && config.event === 'themeChanged') {
        return; // Mantener listener de tema global
      }
      
      element.removeEventListener(config.event, config.handler, config.options);
    }
  });
  
  const themeListener = previewPanelState.eventListeners.get(document);
  previewPanelState.eventListeners.clear();
  
  if (themeListener && themeListener.event === 'themeChanged') {
    previewPanelState.eventListeners.set(document, themeListener);
  }
}

/**
 * Limpia los event listeners específicos de Mermaid
 */
function clearMermaidEventListeners() {
  if (previewPanelState.themeListenerAttached) {
    document.removeEventListener('themeChanged', handlePreviewThemeChange, true);
    document.removeEventListener('themeChanged', handlePanelThemeChange);
    previewPanelState.themeListenerAttached = false;
  }
}

/**
 * Limpia el estado y recursos del panel
 */
function cleanupPanelState() {
  clearManagedTimeouts();
  
  clearPanelEventListeners();
  
  previewPanelState.isOpen = false;
  previewPanelState.currentContent = null;
  previewPanelState.currentType = null;
}

/**
 * Restablecer botones del panel
 */
function resetPanelButtons() {
  const copyButton = document.querySelector('.preview-control.copy-all');
  if (copyButton) {
    const copyIcon = document.createElement('i');
    copyIcon.className = 'bx bx-copy-alt';
    copyButton.innerHTML = '';
    copyButton.appendChild(copyIcon);
    copyButton.classList.remove('copy-success');
  }
}

/**
 * Cierra el panel de previsualización
 */
export function closePreviewPanel() {
  const panel = document.querySelector('#preview-panel');
  if (!panel) return;

  resetPanelButtons();

  if (window.scrollManager) {
    window.scrollManager.lockScrollWithReason('preview-panel-close', 800);
  }
  
  // Limpieza de timeouts
  clearManagedTimeouts('preview-panel-exam-math');
  clearManagedTimeouts('preview-panel-code-math');
  
  clearMermaidEventListeners();
  
  clearPanelEventListeners();
  
  panel.classList.remove('open');
  document.body.classList.remove('preview-panel-active');
  
  previewPanelState.isOpen = false;
  previewPanelState.currentContent = null;
  previewPanelState.currentType = null;
  
  panel.style.display = 'none';
  setTimeout(() => panel.style.removeProperty('display'), 1000);
}

export default {
  initPreviewPanel,
  showPreviewPanel,
  closePreviewPanel
};