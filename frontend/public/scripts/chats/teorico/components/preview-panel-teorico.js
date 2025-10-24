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
  // Remover panel existente si hay uno (para evitar duplicados)
  const existingPanel = document.querySelector('#preview-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // Crear el panel nuevo
  createPreviewPanel();
  
  // Configurar eventos
  setupPanelEvents();
  
  // Agregar un listener global como respaldo para el botón de cierre
  document.addEventListener('click', function(event) {
    // Verificar si el clic fue en un botón de cierre
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
  // Crear el encabezado del panel
  const panelTitle = createElement('h3', { className: 'preview-panel-title' }, 'Vista detallada');
  
  // Crear botones de control
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
  
  // Agregar atributo data-action para facilitar selección
  closeBtn.setAttribute('data-action', 'close-panel');
  
  // Agregar evento inline como respaldo adicional
  closeBtn.setAttribute('onclick', 'window.previewPanel && window.previewPanel.closePreviewPanel()');
  
  const controlsDiv = createElement('div', 
    { className: 'preview-panel-controls' }, 
    [zoomInBtn, zoomOutBtn, resetBtn, copyAllBtn, closeBtn]
  );
  
  const headerDiv = createElement('div', 
    { className: 'preview-panel-header' }, 
    [panelTitle, controlsDiv]
  );
  
  // Crear contenedor de contenido
  const contentDiv = createElement('div', { className: 'preview-panel-content' });
  
  // Crear panel principal
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
  
  // Verificar si hay un diagrama Mermaid en el panel
  if (container && previewPanelState.currentType === 'mermaid') {
    // Re-renderizar el diagrama con el nuevo tema
    const diagramContainer = container.querySelector('.preview-diagram');
    if (diagramContainer && previewPanelState.currentContent?.code) {
      const code = previewPanelState.currentContent.code;
      const id = diagramContainer.id;
      
      // Mostrar mensaje de carga
      diagramContainer.innerHTML = `
        <div class="mermaid-loading">
          <i class="bx bx-loader-alt bx-spin"></i>
          <span>Actualizando diagrama...</span>
        </div>
      `;
      
      // Usar setTimeout para dar tiempo a que se complete el cambio de tema
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
  
  // Limpiar event listeners previos para evitar duplicados
  clearPanelEventListeners();
  
  // Añadir este listener para tema
  document.addEventListener('themeChanged', handlePanelThemeChange);
  
  // Registrar para limpieza posterior
  previewPanelState.eventListeners.set(document, { 
    event: 'themeChanged', 
    handler: handlePanelThemeChange 
  });
  
  // Botón de cierre - Implementación directa para garantizar su funcionamiento
  const closeBtn = panel.querySelector('.preview-control.close');
  if (closeBtn) {
    // Eliminar cualquier controlador anterior primero
    closeBtn.removeEventListener('click', closePreviewPanel);
    
    // Usar una función anónima para agregar un log opcional antes de cerrar
    function handleClose() {
      closePreviewPanel();
    }
    
    // Agregar el evento directamente
    closeBtn.addEventListener('click', handleClose);
    
    // Almacenar la referencia para limpieza posterior
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
  // Eliminar cualquier controlador anterior para evitar duplicación
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
        
        // Fallback directo como último recurso
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
  
  // Usar addEventListener directamente para asegurar compatibilidad
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
    // Crear un elemento temporal para manipular el contenido
    const tempDiv = document.createElement('div');
    
    // Clonar profundamente todo el contenido
    const clone = container.cloneNode(true);
    
    // Eliminar botones de copia y otros elementos interactivos que no queremos copiar
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
    
    // Añadir el clon al div temporal
    tempDiv.appendChild(clone);
    
    // Obtener el contenido como texto plano preservando el formato
    const contentText = tempDiv.innerText || tempDiv.textContent;
    
    // Limpiar el texto de espacios excesivos y formato innecesario
    const cleanedText = cleanTextForCopy(contentText);
    
    // Copiar al portapapeles usando la función existente
    copyToClipboard(cleanedText, { 
      button, 
      successMessage: 'Contenido completo copiado',
      errorMessage: 'Error al copiar contenido'
    });
    
    // Implementación directa de respaldo en caso de que la función importada falle
    if (button && button.dataset.copyFailed === 'true') {
      try {
        // Usar API de portapapeles nativa como respaldo
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
    
    // Fallback al método original
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
  
  // Reemplazar múltiples líneas en blanco con una sola
  let cleaned = text.replace(/\n{3,}/g, '\n\n');
  
  // Eliminar espacios en blanco al final de las líneas
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  
  // Eliminar espacios en blanco al principio de cada línea si hay demasiados
  cleaned = cleaned.replace(/\n[ \t]{4,}/g, '\n  ');
  
  return cleaned;
}

/**
 * Da formato especial a exámenes para la copia
 * @param {HTMLElement} examContainer - Contenedor del examen
 */
function formatExamForCopy(examContainer) {
  try {
    // Buscar todas las preguntas
    const questions = examContainer.querySelectorAll('.exam-question, .quiz-question, .question-item');
    
    questions.forEach((question, index) => {
      // Verificar si ya está formateada
      if (question.getAttribute('data-formatted')) return;
      
      // Extraer la pregunta principal
      const questionText = question.querySelector('.question-text, .question-statement, h3, h4')?.textContent || '';
      
      // Extraer las opciones
      const options = question.querySelectorAll('.option, .answer-option, li');
      const optionsText = Array.from(options).map(opt => {
        // Intentar extraer la letra/número y el texto
        const prefix = opt.querySelector('.option-prefix')?.textContent || '';
        const text = opt.querySelector('.option-text')?.textContent || opt.textContent;
        return (prefix ? prefix + ' ' : '') + text;
      }).join('\n');
      
      // Extraer la respuesta correcta si existe
      const correctAnswer = question.querySelector('.correct-answer, .solution, .answer')?.textContent || '';
      
      // Crear un nuevo formato para la pregunta
      const formattedQuestion = document.createElement('div');
      formattedQuestion.innerHTML = `
        <p><strong>Pregunta ${index + 1}:</strong> ${questionText}</p>
        <p>Opciones:</p>
        <p>${optionsText.replace(/\n/g, '<br>')}</p>
        ${correctAnswer ? `<p><strong>Respuesta:</strong> ${correctAnswer}</p>` : ''}
      `;
      
      // Marcar como formateada para evitar duplicados
      formattedQuestion.setAttribute('data-formatted', 'true');
      
      // Reemplazar la pregunta original por la formateada
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
      
      // Eliminar otros listeners
      element.removeEventListener(config.event, config.handler, config.options);
    }
  });
  
  // Limpiar registro pero preservar tema
  const themeListener = previewPanelState.eventListeners.get(document);
  previewPanelState.eventListeners.clear();
  
  // Restaurar listener de tema si existe
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
  
  // Limpiar estado anterior
  cleanupPanelState();
  
  // Bloquear scroll durante la transición
  if (scrollManager && typeof scrollManager.lockScrollWithReason === 'function') {
    scrollManager.lockScrollWithReason('preview-panel-show', 800);
  } else if (scrollManager) {
    scrollManager.lockScrollWithReason('preview-panel-show', 800);
  }

  // Actualizar el estado
  previewPanelState.isOpen = true;
  previewPanelState.currentContent = content;
  previewPanelState.currentType = type;
  
  // Actualizar el título
  updatePanelTitle(type, content);
  
  // Mostrar el panel
  panel.classList.add('open');
  document.body.classList.add('preview-panel-active');
  
  // Renderizar el contenido
  renderContentInPanel(content, type);
  
  // IMPORTANTE: Asegurar que el listener de tema esté activo
  setupThemeListener();
  
  // Si es Mermaid, asegurar que el tema es correcto
  if (type === 'mermaid') {
    const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
    // Sincronizar tema después de breve retraso para permitir renderización
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
  
  // Usar captura para asegurar que se procese antes que otros handlers
  document.addEventListener('themeChanged', handlePreviewThemeChange, true);
  previewPanelState.themeListenerAttached = true;
  
  // Registrar para limpieza
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
  
  // Mostrar indicador de carga
  diagramDiv.innerHTML = `
    <div class="mermaid-loading">
      <i class="bx bx-loader-alt bx-spin"></i>
      <span>Actualizando diagrama...</span>
    </div>
  `;
  
  // Usar la nueva utilidad de Mermaid con sincronización de tema
  import('../../shared/mermaid-utils.js').then(module => {
    if (typeof module.initializeMermaidDiagram === 'function') {
      module.updateMermaidTheme(theme); // Asegurar que el tema esté actualizado
      
      // Esperar un poco para permitir la actualización del tema
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
      // Buscar primero si hay un título directo en el examen ya renderizado
      const examHeading = document.querySelector('.exam-preview-container .exam h3');
      if (examHeading && examHeading.textContent.startsWith('Examen:')) {
        // Usar el título ya renderizado que contiene la información correcta
        titleElement.textContent = examHeading.textContent;
        return;
      }
      
      // Si no se encontró un título renderizado, buscar en múltiples lugares
      let examTitle = null;
      
      // Intentar extraer de varias ubicaciones posibles
      if (content.topic) {
        examTitle = content.topic;
      } else if (content.title && content.title !== 'Examen completo') {
        examTitle = content.title;
      } else if (content.content && content.content.topic) {
        examTitle = content.content.topic;
      } else if (content.exam && content.exam.topic) {
        examTitle = content.exam.topic;
      } else if (typeof content === 'object') {
        // Buscar más profundamente
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
      // Verificar si es un documento tratado como código
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
  
  // Limpiar el contenedor
  clearElement(contentContainer);
  
  // Renderizar según el tipo
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
    // Validar datos
    if (!mermaidData || !mermaidData.code) {
      throw new Error('Datos de diagrama inválidos');
    }
    
    // Crear contenedor para el diagrama que ocupe todo el espacio disponible
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
    
    // Añadir botón para descargar
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
    
    // Añadir evento para descargar
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
    
    // Agregar al contenedor principal
    container.appendChild(previewContainer);
    
    // Renderizar diagrama usando funciones de utilidad
    import('../../shared/mermaid-utils.js').then(module => {
      if (typeof module.initializeMermaidDiagram === 'function') {
        module.initializeMermaidDiagram(uniqueId, mermaidData.code);
      }
    }).catch(error => {
      console.error('Error al importar utilidades Mermaid:', error);
      
      // Mostrar error en el contenedor
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
  
  // Verificar si Mermaid.js está cargado
  if (!window.mermaid) {
    // Crear mensaje de carga para el contenedor
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="mermaid-loading">
          <i class="bx bx-loader-alt bx-spin"></i>
          <span>Cargando Mermaid.js...</span>
        </div>
      `;
    }
    
    // Cargar Mermaid.js dinámicamente
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
  
  // Función para inicializar Mermaid
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
  
  // Función para renderizar el diagrama
  function renderDiagram() {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
      // Limpiar el contenedor
      container.innerHTML = '';
      
      // Crear contenido Mermaid
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = code;
      
      container.appendChild(mermaidDiv);
      
      // Renderizar
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
      
      // Agregar evento al botón de reintento
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
    
    // Extraer título primero para preservarlo
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
    
    // Verificar diferentes estructuras posibles de datos
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
    
    // Comprobar que tenemos un objeto válido con preguntas
    if (!examContent || !examContent.questions || !Array.isArray(examContent.questions)) {
      throw new Error('Formato de examen inválido recibido');
    }
    
    // Asegurar que el título se conserve
    if (examTitle && !examContent.topic) {
      examContent.topic = examTitle;
    }
    
    // Renderizar el examen
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
      
      // Usar directamente innerHTML para el contenido del código
      // Esto es necesario para que el código conserve su formato y resaltado
      if (typeof DOMPurify !== 'undefined') {
        codeContainer.innerHTML = DOMPurify.sanitize(codeData.codeContent);
      } else {
        // Si no está disponible DOMPurify, usar innerHTML con precaución
        codeContainer.innerHTML = codeData.codeContent;
      }
      
      // Aplicar resaltado de sintaxis
      if (window.hljs) {
        codeContainer.querySelectorAll('pre code').forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
      
      // Configurar eventos de copia
      attachCopyEvents(codeContainer);
      
      container.appendChild(codeContainer);
      return;
    }
    
    // CASO 2: Formato con un solo bloque de código
    const { code, language } = codeData;
    
    // Sanitizar lenguaje pero no el código, ya que se agregará como textContent
    const safeLang = sanitizeText(language || 'text');
    
    // Crear elementos del bloque de código
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
    
    // Aplicar highlight.js
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
      // Para tablas, es necesario usar innerHTML directamente para preservar la estructura
      if (typeof DOMPurify !== 'undefined') {
        tableContainer.innerHTML = DOMPurify.sanitize(tableData.tableContent);
      } else {
        // Si no hay DOMPurify, usar innerHTML con precaución
        tableContainer.innerHTML = tableData.tableContent;
      }
      
      // Eliminar cualquier botón de expansión que pudiera existir
      const expandButtons = tableContainer.querySelectorAll('.expand-content-btn');
      expandButtons.forEach(button => button.remove());
      
      // Agregar leyenda si existe
      if (tableData.caption) {
        addTableCaption(tableContainer, tableData.caption);
      }
    }
    // CASO 2: Formato JSON
    else if (Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
      tableContainer.appendChild(createTableFromJSON(tableData));
      
      // Agregar leyenda si existe
      if (tableData.caption) {
        addTableCaption(tableContainer, tableData.caption);
      }
    } 
    // CASO 3: Formato markdown o raw
    else if (typeof tableData === 'string') {
      if (typeof DOMPurify !== 'undefined') {
        tableContainer.innerHTML = DOMPurify.sanitize(tableData);
      } else {
        // Usar innerHTML directamente para contenido de tabla
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
  // Sanitizar datos
  const safeHeaders = tableData.headers.map(header => sanitizeText(header));
  
  // Crear elementos de encabezado
  const headerRow = createElement('tr');
  
  safeHeaders.forEach(header => {
    const th = createElement('th', {}, header);
    headerRow.appendChild(th);
  });
  
  const thead = createElement('thead', {}, headerRow);
  
  // Crear filas de la tabla
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
  
  // Crear tabla
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

  // Restaurar botones a su estado original
  resetPanelButtons();

  // Bloquear scroll brevemente durante la transición
  if (scrollManager?.lockScrollWithReason) {
    scrollManager.lockScrollWithReason('preview-panel-close', 800);
  }
  
  // Cerrar panel
  panel.classList.remove('open');
  document.body.classList.remove('preview-panel-active');
  
  // Limpiar timeouts y event listeners
  clearManagedTimeouts();
  clearPanelEventListeners();
  
  // Actualizar estado
  previewPanelState.isOpen = false;
  previewPanelState.currentContent = null;
  previewPanelState.currentType = null;
  // Mantenemos themeListenerAttached para evitar agregar/quitar demasiado
  
  // Ocultar si las clases no funcionan
  panel.style.display = 'none';
  setTimeout(() => panel.style.removeProperty('display'), 1000);
}


/**
 * Limpia el estado y recursos del panel
 */
function cleanupPanelState() {
  // Limpiar timeouts
  clearManagedTimeouts();
  
  // Limpiar event listeners
  clearPanelEventListeners();
  
  // Actualizar estado
  previewPanelState.isOpen = false;
  previewPanelState.currentContent = null;
  previewPanelState.currentType = null;
}

export default {
  initPreviewPanel,
  showPreviewPanel,
  closePreviewPanel
};