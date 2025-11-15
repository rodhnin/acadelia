/**
 * preview-panel.js - Gestión del panel de previsualización de contenido especial
 */
import { renderExam } from './exam-renderer-teorico.js';
import { 
  copyToClipboard, 
  copyElementContent, 
  attachCopyEvents 
} from '../utils/clipboard-teorico.js';
import scrollManager from '../../shared/scroll-manager.js';
import {
  createElement,
  sanitizeText,
  clearElement,
  setManagedTimeout,
  clearManagedTimeouts,
  createElementWithHTML,
  addEvent
} from '../../shared/dom-helpers.js';

// Estado del panel
const previewPanelState = {
  isOpen: false,
  currentContent: null,
  currentType: null,
  eventListeners: new Map(),
  themeListenerAttached: false  // Nuevo flag para controlar listener de tema
};

/**
 * Inicializa el panel de previsualización
 */
export function initPreviewPanel() {
  const existingPanel = document.querySelector('#preview-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  createPreviewPanel();
  
  setupPanelEvents();
  
  document.addEventListener('click', function(event) {
    if (event.target.closest('.preview-control.close') || 
        event.target.classList.contains('preview-control') && 
        event.target.classList.contains('close')) {
      closePreviewPanel();
    }
  });
}

/**
 * Crea la estructura del panel de previsualización
 */
function createPreviewPanel() {
  const panelTitle = createElement('h3', { className: 'preview-panel-title' }, 'Vista detallada');
  
  // Nuevos botones de zoom
  const zoomInIcon = createElement('i', { className: 'bx bx-zoom-in' });
  const zoomInBtn = createElement('button', 
    { className: 'preview-control zoom-in', title: 'Acercar' }, 
    zoomInIcon
  );
  
  const zoomOutIcon = createElement('i', { className: 'bx bx-zoom-out' });
  const zoomOutBtn = createElement('button', 
    { className: 'preview-control zoom-out', title: 'Alejar' }, 
    zoomOutIcon
  );
  
  const resetIcon = createElement('i', { className: 'bx bx-reset' });
  const resetBtn = createElement('button', 
    { className: 'preview-control reset-view', title: 'Restablecer vista' }, 
    resetIcon
  );
  
  // Botones originales
  const copyIcon = createElement('i', { className: 'bx bx-copy-alt' });
  // MODIFICACIÓN AQUÍ - Añadimos id y data-action al botón de copia
  const copyAllBtn = createElement('button', 
    { 
      id: 'preview-copy-all-btn',
      className: 'preview-control copy-all', 
      title: 'Copiar todo el contenido',
      'data-action': 'copy-all'  // Añadimos el atributo data-action
    }, 
    copyIcon
  );
  
  const closeIcon = createElement('i', { className: 'bx bx-x' });
  const closeBtn = createElement('button', 
    { className: 'preview-control close', title: 'Cerrar' }, 
    closeIcon
  );
  
  closeBtn.setAttribute('data-action', 'close-panel');
  
  closeBtn.setAttribute('onclick', 'window.previewPanel && window.previewPanel.closePreviewPanel()');
  
  const controlsDiv = createElement('div', 
    { className: 'preview-panel-controls' }, 
    [zoomInBtn, zoomOutBtn, resetBtn, copyAllBtn, closeBtn]
  );
  
  const headerDiv = createElement('div', 
    { className: 'preview-panel-header' }, 
    [panelTitle, controlsDiv]
  );
  
  const contentDiv = createElement('div', { className: 'preview-panel-content' });
  
  const panel = createElement('div', 
    { id: 'preview-panel', className: 'preview-panel' }, 
    [headerDiv, contentDiv]
  );
  
  document.body.appendChild(panel);
  
  // Exponer el módulo de previsualización globalmente para que el botón pueda acceder a él
  window.previewPanel = {
    closePreviewPanel: closePreviewPanel,
    copyContent: function() {
      const contentContainer = document.querySelector('.preview-panel-content');
      if (contentContainer) {
        try {
          copyFullPanelContent(contentContainer, document.getElementById('preview-copy-all-btn'));
          return true;
        } catch (e) {
          console.error('Error en copyContent global:', e);
          return false;
        }
      }
      return false;
    }
  };
  
  // Agregamos un respaldo directo para el botón de copia
  copyAllBtn.onclick = function() {
    window.previewPanel && window.previewPanel.copyContent();
  };
}

/**
 * Maneja cambios de tema en el panel de vista previa
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
        import('../../shared/mermaid-utils.js').then(module => {
          if (module.initializeMermaidDiagram) {
            module.initializeMermaidDiagram(id, code);
          }
        });
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
  
  clearPanelEventListeners();
  
  document.addEventListener('themeChanged', handlePanelThemeChange);
  
  previewPanelState.eventListeners.set(document, { 
    event: 'themeChanged', 
    handler: handlePanelThemeChange 
  });
  
  // Botón de cierre - Implementación directa para garantizar su funcionamiento
  const closeBtn = panel.querySelector('.preview-control.close');
  if (closeBtn) {
    closeBtn.removeEventListener('click', closePreviewPanel);
    
    function handleClose() {
      closePreviewPanel();
    }
    
    closeBtn.addEventListener('click', handleClose);
    
    previewPanelState.eventListeners.set(closeBtn, { 
      event: 'click', 
      handler: handleClose 
    });
  }
  
  // Botones de zoom
  const zoomInBtn = panel.querySelector('.preview-control.zoom-in');
  const zoomOutBtn = panel.querySelector('.preview-control.zoom-out');
  const resetBtn = panel.querySelector('.preview-control.reset-view');
  
  if (zoomInBtn && zoomOutBtn && resetBtn) {
    setupZoomControls(zoomInBtn, zoomOutBtn, resetBtn);
  }
  
// Botón para copiar todo el contenido
const copyAllBtn = document.getElementById('preview-copy-all-btn');
if (copyAllBtn) {
  if (previewPanelState.eventListeners.has(copyAllBtn)) {
    const oldHandler = previewPanelState.eventListeners.get(copyAllBtn).handler;
    copyAllBtn.removeEventListener('click', oldHandler);
  }
  
  const copyAllHandler = () => {
    console.log('Botón de copia pulsado');
    const contentContainer = document.querySelector('.preview-panel-content');
    if (contentContainer) {
      try {
        copyFullPanelContent(contentContainer, copyAllBtn);
      } catch (e) {
        console.error('Error al intentar copiar:', e);
        
        try {
          const text = contentContainer.innerText || contentContainer.textContent;
          navigator.clipboard.writeText(text)
            .then(() => {
              copyAllBtn.innerHTML = '<i class="bx bx-check"></i> ¡Copiado!';
              setTimeout(() => {
                copyAllBtn.innerHTML = '<i class="bx bx-copy-alt"></i>';
              }, 2000);
            });
        } catch (clipboardError) {
          console.error('Error en fallback de copia:', clipboardError);
        }
      }
    }
  };
  
  previewPanelState.eventListeners.set(copyAllBtn, { event: 'click', handler: copyAllHandler });
  copyAllBtn.addEventListener('click', copyAllHandler);
}
}


/**
 * Configura los controles de zoom
 */
function setupZoomControls(zoomInBtn, zoomOutBtn, resetBtn) {
  let scale = 1;
  const contentContainer = document.querySelector('.preview-panel-content');
  
  const zoomInHandler = () => {
    scale = Math.min(scale + 0.1, 3);
    applyZoom(contentContainer, scale);
  };
  
  const zoomOutHandler = () => {
    scale = Math.max(scale - 0.1, 0.5);
    applyZoom(contentContainer, scale);
  };
  
  const resetHandler = () => {
    scale = 1;
    applyZoom(contentContainer, scale);
  };
  
  previewPanelState.eventListeners.set(zoomInBtn, { event: 'click', handler: zoomInHandler });
  previewPanelState.eventListeners.set(zoomOutBtn, { event: 'click', handler: zoomOutHandler });
  previewPanelState.eventListeners.set(resetBtn, { event: 'click', handler: resetHandler });
  
  zoomInBtn.addEventListener('click', zoomInHandler);
  zoomOutBtn.addEventListener('click', zoomOutHandler);
  resetBtn.addEventListener('click', resetHandler);
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
 * Función mejorada para copiar todo el contenido del panel
 * @param {HTMLElement} container - Contenedor del contenido a copiar
 * @param {HTMLElement} button - Botón de copia (para retroalimentación)
 */
// Actualización para la función copyFullPanelContent
function copyFullPanelContent(container, button) {
  if (!container) return;
  
  try {
    const tempDiv = document.createElement('div');
    
    const clone = container.cloneNode(true);
    
    const elementsToRemove = clone.querySelectorAll('.copy-button, .preview-control, .expand-content-btn, .button, [type="button"]');
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
        // Si la celda tiene un título pero está vacía, usar el título como contenido
        if (cell.title && !cell.textContent.trim()) {
          cell.textContent = cell.title;
        }
        
        // Si hay contenido truncado, buscar el texto completo
        const fullContent = cell.getAttribute('data-full-content') || 
                           cell.getAttribute('data-original') || 
                           cell.getAttribute('data-content');
        if (fullContent && fullContent.length > cell.textContent.length) {
          cell.textContent = fullContent;
        }
      });
    });
    
    // Tratar exámenes y cuestionarios especialmente
    const examQuestions = clone.querySelectorAll('.exam-question, .quiz-question, .question-item');
    if (examQuestions.length > 0) {
      // Es un examen, dar formato especial
      formatExamForCopy(clone);
    }
    
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
 * Muestra el panel de previsualización con el contenido especificado
 * @param {Object} content - Contenido a mostrar
 * @param {string} type - Tipo de contenido ('exam', 'code', 'table')
 */
export function showPreviewPanel(content, type) {
  const panel = document.querySelector('#preview-panel');
  if (!panel) return;
  
  cleanupPanelState();
  
  if (scrollManager && typeof scrollManager.lockScrollWithReason === 'function') {
    scrollManager.lockScrollWithReason('preview-panel-show', 800);
  } else if (scrollManager) {
    scrollManager.lockScrollWithReason('preview-panel-show', 800);
  }

  previewPanelState.isOpen = true;
  previewPanelState.currentContent = content;
  previewPanelState.currentType = type;
  
  updatePanelTitle(type, content);
  
  panel.classList.add('open');
  document.body.classList.add('preview-panel-active');
  
  renderContentInPanel(content, type);
  
  // IMPORTANTE: Asegurar que el listener de tema esté activo
  setupThemeListener();
  
  // Si es Mermaid, asegurar que el tema es correcto
  if (type === 'mermaid') {
    const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
    setTimeout(() => {
      syncMermaidTheme(currentTheme);
    }, 300);
  }
}

/**
 * Configurar listener de tema específico para el panel
 */
function setupThemeListener() {
  // Evitar duplicar listeners
  if (previewPanelState.themeListenerAttached) return;
  
  console.log("Configurando listener de tema para panel de vista previa");
  
  document.addEventListener('themeChanged', handlePreviewThemeChange, true);
  previewPanelState.themeListenerAttached = true;
  
  previewPanelState.eventListeners.set(document, {
    event: 'themeChanged',
    handler: handlePreviewThemeChange,
    options: true // Captura
  });
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
  
  import('../../shared/mermaid-utils.js').then(module => {
    if (typeof module.initializeMermaidDiagram === 'function') {
      module.updateMermaidTheme(theme); // Asegurar que el tema esté actualizado
      
      setTimeout(() => {
        module.initializeMermaidDiagram(id, code).then(() => {
          console.log("Diagrama en panel actualizado correctamente");
        }).catch(error => {
          console.error("Error actualizando diagrama en panel:", error);
        });
      }, 100);
    }
  }).catch(error => {
    console.error("Error importando utilidades de Mermaid:", error);
  });
}

/**
 * Actualiza el título del panel según el tipo de contenido
 */
function updatePanelTitle(type, content) {
  const titleElement = document.querySelector('.preview-panel-title');
  if (!titleElement) return;
  
  switch (type) {
    case 'exam':
      const examHeading = document.querySelector('.exam-preview-container .exam h3');
      if (examHeading && examHeading.textContent.startsWith('Examen:')) {
        titleElement.textContent = examHeading.textContent;
        return;
      }
      
      let examTitle = null;
      
      if (content.topic) {
        examTitle = content.topic;
      } else if (content.title && content.title !== 'Examen completo') {
        examTitle = content.title;
      } else if (content.content && content.content.topic) {
        examTitle = content.content.topic;
      } else if (content.exam && content.exam.topic) {
        examTitle = content.exam.topic;
      } else if (typeof content === 'object') {
        for (const key in content) {
          if (content[key] && typeof content[key] === 'object' && content[key].topic) {
            examTitle = content[key].topic;
            break;
          }
        }
      }
      
      titleElement.textContent = `Examen: ${examTitle || 'Sin título'}`;
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
      const errorDiv = createElement('div', 
        { className: 'error-message' }, 
        'Tipo de contenido no soportado'
      );
      contentContainer.appendChild(errorDiv);
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
      import('../../shared/mermaid-utils.js').then(module => {
        if (typeof module.downloadMermaidAsSVG === 'function') {
          const code = downloadBtn.getAttribute('data-code');
          const title = downloadBtn.getAttribute('data-title');
          module.downloadMermaidAsSVG(code, title.replace(/[^a-z0-9]/gi, '_').toLowerCase());
        }
      }).catch(error => {
        console.error('Error al importar utilidades Mermaid:', error);
      });
    });
    
    downloadContainer.appendChild(downloadBtn);
    previewContainer.appendChild(downloadContainer);
    
    container.appendChild(previewContainer);
    
    import('../../shared/mermaid-utils.js').then(module => {
      if (typeof module.initializeMermaidDiagram === 'function') {
        module.initializeMermaidDiagram(uniqueId, mermaidData.code);
      }
    }).catch(error => {
      console.error('Error al importar utilidades Mermaid:', error);
      
      diagramDiv.innerHTML = `
        <div class="mermaid-error">
          <i class="bx bx-error"></i>
          <p>Error al cargar utilidades: ${sanitizeText(error.message)}</p>
        </div>
      `;
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
 * Renderiza un diagrama Mermaid (implementación local)
 * @param {string} containerId - ID del contenedor
 * @param {string} code - Código Mermaid
 */
function renderMermaidDiagram(containerId, code) {
  if (!code) return;
  
  if (!window.mermaid) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="mermaid-loading">
          <i class="bx bx-loader-alt bx-spin"></i>
          <span>Cargando Mermaid.js...</span>
        </div>
      `;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11.5.0/dist/mermaid.min.js';
    script.onload = () => {
      // Una vez cargado, inicializar y renderizar
      initializeMermaid();
      renderDiagram();
    };
    script.onerror = () => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="mermaid-error">
            <i class="bx bx-error"></i>
            <p>Error al cargar Mermaid.js</p>
          </div>
        `;
      }
    };
    document.head.appendChild(script);
    return;
  }
  
  // Si Mermaid.js ya está cargado, inicializar y renderizar
  initializeMermaid();
  renderDiagram();
  
  function initializeMermaid() {
    if (!window.mermaid) return;
    
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    
    window.mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
      fontSize: 16,
      fontFamily: 'Arial,sans-serif',
      useMaxWidth: false,
      logLevel: 'error',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        diagramPadding: 20
      }
    });
  }
  
  function renderDiagram() {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
      container.innerHTML = '';
      
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = code;
      
      container.appendChild(mermaidDiv);
      
      window.mermaid.init(undefined, mermaidDiv);
    } catch (error) {
      container.innerHTML = `
        <div class="mermaid-error">
          <i class="bx bx-error"></i>
          <p>Error al renderizar diagrama: ${sanitizeText(error.message || 'Error desconocido')}</p>
          <button class="retry-render-btn">
            <i class="bx bx-refresh"></i> Reintentar
          </button>
        </div>
      `;
      
      const retryBtn = container.querySelector('.retry-render-btn');
      if (retryBtn) {
        addEvent(retryBtn, 'click', () => {
          renderMermaidDiagram(containerId, code);
        });
      }
    }
  }
}

/**
 * Renderiza un examen en el panel
 */
function renderExamInPanel(examData, container) {
  const examContainer = createElement('div', { className: 'exam-preview-container' });
  container.appendChild(examContainer);
  
  try {
    // Encontrar el objeto con las preguntas del examen
    let examContent = null;
    
    let examTitle = null;
    if (examData.topic) {
      examTitle = examData.topic;
    } else if (examData.title && examData.title !== 'Examen completo') {
      examTitle = examData.title;
    } else if (examData.content && examData.content.topic) {
      examTitle = examData.content.topic;
    } else if (examData.exam && examData.exam.topic) {
      examTitle = examData.exam.topic;
    }
    
    if (examData.content && examData.content.questions && Array.isArray(examData.content.questions)) {
      examContent = examData.content;
    } else if (examData.questions && Array.isArray(examData.questions)) {
      examContent = examData;
    } else if (examData.exam && typeof examData.exam === 'object') {
      if (examData.exam.questions && Array.isArray(examData.exam.questions)) {
        examContent = examData.exam;
      } else if (examData.exam.content && examData.exam.content.questions) {
        examContent = examData.exam.content;
      }
    }
    
    if (!examContent || !examContent.questions || !Array.isArray(examContent.questions)) {
      throw new Error('Formato de examen inválido recibido');
    }
    
    // Asegurar que el título se conserve
    if (examTitle && !examContent.topic) {
      examContent.topic = examTitle;
    }
    
    renderExam(examContent, examContainer);
  } catch (error) {
    clearElement(container);
    
    const errorIcon = createElement('i', { className: 'bx bx-error' });
    const errorText = createElement('p', {}, `Error al renderizar el examen: ${sanitizeText(error.message)}`);
    
    const errorDiv = createElement('div', 
      { className: 'preview-error' }, 
      [errorIcon, errorText]
    );
    
    container.appendChild(errorDiv);
  }
}

/**
 * Oculta la capa de carga con animación
 */
function hideLoadingOverlay(loadingOverlay) {
  if (!loadingOverlay) return;
  
  loadingOverlay.style.opacity = '0';
  
  setManagedTimeout(() => {
    if (loadingOverlay.parentNode) {
      loadingOverlay.parentNode.removeChild(loadingOverlay);
    }
  }, 500, 'hide-loading');
}

/**
 * Renderiza código en el panel
 */
function renderCodeInPanel(codeData, container) {
  try {
    // CASO 1: Formato con contenido HTML completo
    if (codeData.codeContent) {
      const codeContainer = createElement('div', { className: 'code-content-preview' });
      
      // Esto es necesario para que el código conserve su formato y resaltado
      if (typeof DOMPurify !== 'undefined') {
        codeContainer.innerHTML = DOMPurify.sanitize(codeData.codeContent);
      } else {
        // Si no está disponible DOMPurify, usar innerHTML con precaución
        codeContainer.innerHTML = codeData.codeContent;
      }
      
      if (window.hljs) {
        codeContainer.querySelectorAll('pre code').forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
      
      attachCopyEvents(codeContainer);
      
      container.appendChild(codeContainer);
      return;
    }
    
    // CASO 2: Formato con un solo bloque de código
    const { code, language } = codeData;
    
    const safeLang = sanitizeText(language || 'text');
    
    const languageSpan = createElement('span', 
      { className: 'code-language' }, 
      safeLang
    );
    
    const copyIcon = createElement('i', { className: 'bx bx-copy' });
    const copyButton = createElement('button', 
      { className: 'copy-button' }, 
      [copyIcon, ' Copiar']
    );
    
    const codeHeader = createElement('div', 
      { className: 'code-header' }, 
      [languageSpan, copyButton]
    );
    
    const codeElement = createElement('code', { className: `language-${safeLang}` });
    codeElement.textContent = code; // Usar textContent para evitar XSS
    
    const preElement = createElement('pre', {}, codeElement);
    
    const codeBlock = createElement('div', 
      { className: 'code-block-preview' }, 
      [codeHeader, preElement]
    );
    
    container.appendChild(codeBlock);
    
    if (window.hljs) {
      container.querySelectorAll('pre code').forEach(block => {
        window.hljs.highlightElement(block);
      });
    }
    
    // Evento para copiar
    const copyHandler = () => copyToClipboard(code, { button: copyButton });
    previewPanelState.eventListeners.set(copyButton, { event: 'click', handler: copyHandler });
    copyButton.addEventListener('click', copyHandler);
    
  } catch (error) {
    clearElement(container);
    
    const errorIcon = createElement('i', { className: 'bx bx-error' });
    const errorText = createElement('p', {}, `Error al renderizar el código: ${sanitizeText(error.message)}`);
    
    const errorDiv = createElement('div', 
      { className: 'preview-error' }, 
      [errorIcon, errorText]
    );
    
    container.appendChild(errorDiv);
  }
}

/**
 * Renderiza una tabla en el panel
 */
function renderTableInPanel(tableData, container) {
  try {
    const tableContainer = createElement('div', { className: 'table-preview-container' });
    
    // CASO 1: Si hay contenido HTML directo
    if (tableData.tableContent) {
      if (typeof DOMPurify !== 'undefined') {
        tableContainer.innerHTML = DOMPurify.sanitize(tableData.tableContent);
      } else {
        // Si no hay DOMPurify, usar innerHTML con precaución
        tableContainer.innerHTML = tableData.tableContent;
      }
      
      const expandButtons = tableContainer.querySelectorAll('.expand-content-btn');
      expandButtons.forEach(button => button.remove());
      
      if (tableData.caption) {
        addTableCaption(tableContainer, tableData.caption);
      }
    }
    // CASO 2: Formato JSON
    else if (Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
      tableContainer.appendChild(createTableFromJSON(tableData));
      
      if (tableData.caption) {
        addTableCaption(tableContainer, tableData.caption);
      }
    } 
    // CASO 3: Formato markdown o raw
    else if (typeof tableData === 'string') {
      if (typeof DOMPurify !== 'undefined') {
        tableContainer.innerHTML = DOMPurify.sanitize(tableData);
      } else {
        tableContainer.innerHTML = tableData;
      }
    }
    
    container.appendChild(tableContainer);
  } catch (error) {
    clearElement(container);
    
    const errorIcon = createElement('i', { className: 'bx bx-error' });
    const errorText = createElement('p', {}, `Error al renderizar la tabla: ${sanitizeText(error.message)}`);
    
    const errorDiv = createElement('div', 
      { className: 'preview-error' }, 
      [errorIcon, errorText]
    );
    
    container.appendChild(errorDiv);
  }
}

/**
 * Crea una tabla a partir de datos JSON
 */
function createTableFromJSON(tableData) {
  const safeHeaders = tableData.headers.map(header => sanitizeText(header));
  
  const headerRow = createElement('tr');
  
  safeHeaders.forEach(header => {
    const th = createElement('th', {}, header);
    headerRow.appendChild(th);
  });
  
  const thead = createElement('thead', {}, headerRow);
  
  const tbody = createElement('tbody');
  
  tableData.rows.forEach(row => {
    const tr = createElement('tr');
    
    row.forEach(cell => {
      const safeCell = sanitizeText(cell);
      const td = createElement('td', {}, safeCell);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  const table = createElement('table', 
    { className: 'preview-table' }, 
    [thead, tbody]
  );
  
  return table;
}

/**
 * Agrega una leyenda a una tabla
 */
function addTableCaption(container, caption) {
  const safeCaption = sanitizeText(caption);
  const captionElement = createElement('p', 
    { className: 'table-caption' }, 
    safeCaption
  );
  container.appendChild(captionElement);
}

/**
 * Restablecer botones del panel
 */
function resetPanelButtons() {
  const copyButton = document.getElementById('preview-copy-all-btn');
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

  if (scrollManager?.lockScrollWithReason) {
    scrollManager.lockScrollWithReason('preview-panel-close', 800);
  }
  
  panel.classList.remove('open');
  document.body.classList.remove('preview-panel-active');
  
  clearManagedTimeouts();
  clearPanelEventListeners();
  
  previewPanelState.isOpen = false;
  previewPanelState.currentContent = null;
  previewPanelState.currentType = null;
  // Mantenemos themeListenerAttached para evitar agregar/quitar demasiado
  
  panel.style.display = 'none';
  setTimeout(() => panel.style.removeProperty('display'), 1000);
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

export default {
  initPreviewPanel,
  showPreviewPanel,
  closePreviewPanel
};