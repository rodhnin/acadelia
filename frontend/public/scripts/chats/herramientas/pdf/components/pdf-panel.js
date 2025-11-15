/**
 * pdf-panel.js - Panel principal de visualización de PDF
 * Gestiona el panel lateral derecho para la visualización de PDFs
 * MEJORADO: Incluye buscador de páginas integrado
 */

import { 
  getPDFState, 
  on as onPDFState, 
  setViewMode, 
  setCurrentPage, 
  togglePDFPanel 
} from '../services/pdf-state.js';
import { 
  getPDFPreview, 
  getPDFText, 
  deletePDF 
} from '../services/pdf-api.js';
import { 
  initPDFViewer, 
  renderPDFPage
} from './pdf-viewer.js';
import { 
  initMarkdownViewer, 
  renderMarkdownContent 
} from './markdown-viewer-pdf.js';
import { 
  initRegionSelector 
} from './region-selector.js';
import {
  createElement,
  addEvent,
  showElement,
  hideElement,
  setManagedTimeout
} from '../../../shared/dom-helpers.js';
import { updatePDFButtonsVisibility } from '../utils/pdf-button-controller.js';

// Referencias DOM
let pdfPanel;
let pdfContainer;
let markdownContainer;
let panelHeader;
let pageControls;
let viewControls;
let closeButton;
let pageDisplay;
let prevPageButton;
let nextPageButton;
let pdfViewButton;
let markdownViewButton;
let splitViewButton;
let deleteButton;
let loadingIndicator;

// NUEVO: Referencias DOM para el buscador de páginas
let pageJumpButton;
let pageJumpModal;
let pageJumpInput;
let pageJumpSubmit;
let pageJumpCancel;
let pageJumpClose;

// Estado local
const panelState = {
  isInitialized: false,
  isLoadingContent: false,
  activeTab: 'split',
  isVisible: false
};

/**
 * Inicializa el panel de PDF
 */
export function initPDFPanel() {
  if (panelState.isInitialized) return;
  
  createPanelTriggerButton();
  createDOMElements();
  attachEventListeners();
  
  initPDFViewer(pdfContainer);
  initMarkdownViewer(markdownContainer);
  initRegionSelector();
  
  // ASEGURAR EXPLÍCITAMENTE QUE EL PANEL ESTÉ CERRADO
  togglePanelVisibility(false);
  
  panelState.isInitialized = true;
  
  setupStateListeners();
}

/**
 * Crea el botón para desplegar el panel de PDF
 */
function createPanelTriggerButton() {
  const triggerButton = document.createElement('button');
  triggerButton.className = 'pdf-panel-trigger';
  triggerButton.title = 'Abrir panel PDF';
  triggerButton.innerHTML = '<i class="bx bxs-file-pdf"></i>';
  
  document.body.appendChild(triggerButton);
  
  triggerButton.addEventListener('click', () => {
    import('../services/pdf-state.js').then(module => {
      module.togglePDFPanel(true);
    });
  });
  
  const uploaderButton = document.querySelector('.pdf-upload-button');
  
  import('../utils/pdf-button-controller.js').then(module => {
    if (typeof module.initPDFButtonController === 'function') {
      module.initPDFButtonController(uploaderButton, triggerButton);
    }
  });
}

/**
 * Crea los elementos DOM necesarios para el panel usando dom-helpers
 */
function createDOMElements() {
  // Panel principal
  pdfPanel = createElement('div', { className: 'pdf-panel' });
  
  // Header del panel
  panelHeader = createElement('div', { className: 'pdf-panel-header' });
  
  // 1. SECCIÓN IZQUIERDA: Título del panel con icono
  const titleContainer = createElement('div', { className: 'pdf-panel-title' });
  titleContainer.innerHTML = '<i class="bx bxs-file-pdf"></i>';
  const filename = createElement('span', { className: 'pdf-panel-filename' }, 'Documento PDF');
  titleContainer.appendChild(filename);
  
  // 2. SECCIÓN CENTRAL: Navegación de páginas
  const navigationContainer = createElement('div', { className: 'pdf-panel-navigation' });
  
  // Controles de página
  pageControls = createElement('div', { className: 'pdf-panel-page-controls' });
  
  prevPageButton = createElement('button', { 
    className: 'pdf-prev-page', 
    title: 'Página anterior' 
  });
  prevPageButton.innerHTML = '<i class="bx bx-chevron-left"></i>';
  
  pageDisplay = createElement('span', { className: 'pdf-page-display' }, 'Página 1 de 1');
  
  nextPageButton = createElement('button', { 
    className: 'pdf-next-page', 
    title: 'Página siguiente' 
  });
  nextPageButton.innerHTML = '<i class="bx bx-chevron-right"></i>';
  
  // NUEVO: Botón para ir a página específica
  pageJumpButton = createElement('button', {
    className: 'pdf-jump-page',
    title: 'Ir a página específica'
  });
  pageJumpButton.innerHTML = '<i class="bx bx-search"></i>';
  
  pageControls.appendChild(prevPageButton);
  pageControls.appendChild(pageDisplay);
  pageControls.appendChild(nextPageButton);
  pageControls.appendChild(pageJumpButton); // NUEVO
  
  navigationContainer.appendChild(pageControls);
  
  // 3. SECCIÓN DERECHA: Controles del panel
  const controlsContainer = createElement('div', { className: 'pdf-panel-controls' });
  
  // Controles de vista
  viewControls = createElement('div', { className: 'pdf-panel-view-controls' });
  
  // 1. Botón de PDF
  pdfViewButton = createElement('button', {
    className: 'pdf-view-mode-btn pdf-view',
    title: 'Ver PDF original'
  });
  pdfViewButton.innerHTML = '<i class="bx bxs-file-pdf"></i>';

  // 2. Botón de vista dividida (en medio)
  splitViewButton = createElement('button', {
    className: 'pdf-view-mode-btn pdf-split active',
    title: 'Vista dividida'
  });
  splitViewButton.innerHTML = '<i class="bx bx-columns"></i>';

  // 3. Botón de texto
  markdownViewButton = createElement('button', {
    className: 'pdf-view-mode-btn pdf-markdown',
    title: 'Ver contenido procesado'
  });
  markdownViewButton.innerHTML = '<i class="bx bx-cube-alt"></i>'; // Usar el mismo icono para consistencia
    
  viewControls.appendChild(pdfViewButton);
  viewControls.appendChild(splitViewButton);
  viewControls.appendChild(markdownViewButton);
  
  // Botón eliminar
  deleteButton = createElement('button', {
    className: 'pdf-delete-button',
    title: 'Eliminar PDF'
  });
  deleteButton.innerHTML = '<i class="bx bx-trash"></i>';
  
  // Botón cerrar
  closeButton = createElement('button', {
    className: 'pdf-panel-close',
    title: 'Cerrar panel'
  });
  closeButton.innerHTML = '<i class="bx bx-x"></i>';
  
  // Ensamblar controles
  controlsContainer.appendChild(viewControls);
  controlsContainer.appendChild(deleteButton);
  controlsContainer.appendChild(closeButton);
  
  // Ensamblar header
  panelHeader.appendChild(titleContainer);
  panelHeader.appendChild(navigationContainer);
  panelHeader.appendChild(controlsContainer);
  
  // NUEVO: Crear modal para búsqueda de página
  pageJumpModal = createElement('div', { className: 'pdf-jump-modal' });
  pageJumpModal.innerHTML = `
    <div class="pdf-jump-modal-content">
      <div class="pdf-jump-modal-header">
        <h4>Ir a página</h4>
        <button class="pdf-jump-modal-close" type="button" aria-label="Cerrar">&times;</button>
      </div>
      <div class="pdf-jump-modal-body">
        <div class="pdf-jump-input-group">
          <label for="pdf-jump-input">Número de página:</label>
          <input type="number" id="pdf-jump-input" class="pdf-jump-input" min="1" placeholder="Ej: 5">
          <span class="pdf-jump-range"></span>
        </div>
      </div>
      <div class="pdf-jump-modal-footer">
        <button type="button" class="pdf-jump-cancel">Cancelar</button>
        <button type="button" class="pdf-jump-submit">Ir a página</button>
      </div>
    </div>
  `;
  
  // Indicador de carga
  loadingIndicator = createElement('div', { className: 'pdf-panel-loading' });
  loadingIndicator.innerHTML = `
    <div class="pdf-loading-spinner"></div>
    <span>Cargando contenido...</span>
  `;
  
  // Contenedor de contenido
  const contentContainer = createElement('div', { className: 'pdf-panel-content' });
  
  // Contenedores para PDF y Markdown
  pdfContainer = createElement('div', { className: 'pdf-viewer-container' });
  markdownContainer = createElement('div', { className: 'pdf-markdown-container' });
  
  contentContainer.appendChild(pdfContainer);
  contentContainer.appendChild(markdownContainer);
  
  // Ensamblar panel completo
  pdfPanel.appendChild(panelHeader);
  pdfPanel.appendChild(loadingIndicator);
  pdfPanel.appendChild(contentContainer);
  
  document.body.appendChild(pdfPanel);
  
  // NUEVO: Agregar modal al body (después del panel)
  document.body.appendChild(pageJumpModal);
  
  // NUEVO: Obtener referencias a elementos del modal
  pageJumpInput = pageJumpModal.querySelector('.pdf-jump-input');
  pageJumpSubmit = pageJumpModal.querySelector('.pdf-jump-submit');
  pageJumpCancel = pageJumpModal.querySelector('.pdf-jump-cancel');
  pageJumpClose = pageJumpModal.querySelector('.pdf-jump-modal-close');
  
  hideElement(loadingIndicator);
}

/**
 * Agrega los event listeners necesarios usando dom-helpers
 */
function attachEventListeners() {
  addEvent(closeButton, 'click', () => {
    togglePDFPanel(false);
  });
  
  // Navegación de páginas
  addEvent(prevPageButton, 'click', () => {
    const currentPage = getPDFState('currentPage');
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  });
  
  addEvent(nextPageButton, 'click', () => {
    const currentPage = getPDFState('currentPage');
    const totalPages = getPDFState('totalPages');
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  });
  
  // NUEVO: Event listeners para el buscador de páginas
  addEvent(pageJumpButton, 'click', showPageJumpModal);
  
  addEvent(pageJumpCancel, 'click', hidePageJumpModal);
  addEvent(pageJumpClose, 'click', hidePageJumpModal);
  
  addEvent(pageJumpModal, 'click', (e) => {
    if (e.target === pageJumpModal) {
      hidePageJumpModal();
    }
  });
  
  addEvent(pageJumpInput, 'keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePageJump();
    }
  });
  
  addEvent(pageJumpSubmit, 'click', handlePageJump);
  
  addEvent(pageJumpInput, 'input', validatePageInput);
  
  // Modos de visualización
  addEvent(pdfViewButton, 'click', () => {
    setViewMode('pdf');
    updateActiveViewButton('pdf');
  });
  
  addEvent(markdownViewButton, 'click', () => {
    setViewMode('markdown');
    updateActiveViewButton('markdown');
  });
  
  addEvent(splitViewButton, 'click', () => {
    setViewMode('split');
    updateActiveViewButton('split');
  });
  
  addEvent(deleteButton, 'click', handlePDFDelete);
}

/**
 * NUEVO: Muestra el modal de salto de página
 */
function showPageJumpModal() {
  const totalPages = getPDFState('totalPages');
  const currentPage = getPDFState('currentPage');
  
  pageJumpInput.setAttribute('max', totalPages);
  pageJumpInput.value = currentPage;
  
  const rangeElement = pageJumpModal.querySelector('.pdf-jump-range');
  rangeElement.textContent = `(1 - ${totalPages})`;
  
  pageJumpModal.classList.add('show');
  
  // Enfocar y seleccionar el input
  setTimeout(() => {
    pageJumpInput.focus();
    pageJumpInput.select();
  }, 100);
}

/**
 * NUEVO: Oculta el modal de salto de página
 */
function hidePageJumpModal() {
  pageJumpModal.classList.remove('show');
  pageJumpInput.value = '';
}

/**
 * NUEVO: Valida la entrada del usuario en tiempo real
 */
function validatePageInput() {
  const value = parseInt(pageJumpInput.value);
  const totalPages = getPDFState('totalPages');
  
  pageJumpInput.classList.remove('valid', 'invalid');
  pageJumpSubmit.disabled = false;
  
  if (!value || isNaN(value)) {
    pageJumpSubmit.disabled = true;
    return;
  }
  
  if (value < 1 || value > totalPages) {
    pageJumpInput.classList.add('invalid');
    pageJumpSubmit.disabled = true;
  } else {
    pageJumpInput.classList.add('valid');
    pageJumpSubmit.disabled = false;
  }
}

/**
 * NUEVO: Maneja el salto a la página especificada
 */
function handlePageJump() {
  const targetPage = parseInt(pageJumpInput.value);
  const totalPages = getPDFState('totalPages');
  const currentPage = getPDFState('currentPage');
  
  if (!targetPage || isNaN(targetPage)) {
    acadelWarning("Número inválido", "Acadel necesita un número de página válido");
    pageJumpInput.focus();
    return;
  }
  
  if (targetPage < 1 || targetPage > totalPages) {
    acadelWarning("Página fuera de rango", `Acadel solo puede ir a páginas del 1 al ${totalPages}`);
    pageJumpInput.focus();
    return;
  }
  
  // Si es la misma página, no hacer nada pero cerrar modal
  if (targetPage === currentPage) {
    acadelInfo("Ya estás ahí", `Acadel ya está mostrando la página ${targetPage}`);
    hidePageJumpModal();
    return;
  }
  
  // Navegar a la página
  setCurrentPage(targetPage);
  
  hidePageJumpModal();
  
  // Notificación de éxito
  acadelExito(`📄 Página ${targetPage}`, `Acadel te llevó directo a la página que buscabas`);
}

/**
 * Actualiza el botón activo según el modo de visualización
 * @param {string} mode - Modo de visualización
 */
function updateActiveViewButton(mode) {
  pdfViewButton.classList.toggle('active', mode === 'pdf');
  markdownViewButton.classList.toggle('active', mode === 'markdown');
  splitViewButton.classList.toggle('active', mode === 'split');
  
  panelState.activeTab = mode;
  updateViewMode();
}

/**
 * Actualiza el diseño según el modo de visualización y restablece el zoom
 */
function updateViewMode() {
  if (['pdf', 'split'].includes(panelState.activeTab)) {
    showElement(pdfContainer, 'block');
  } else {
    hideElement(pdfContainer);
  }
  
  if (['markdown', 'split'].includes(panelState.activeTab)) {
    showElement(markdownContainer, 'block');
  } else {
    hideElement(markdownContainer);
  }
  
  // Ajustar clases para el diseño
  pdfPanel.classList.remove('pdf-mode', 'markdown-mode', 'split-mode');
  pdfPanel.classList.add(`${panelState.activeTab}-mode`);
  
  if (panelState.activeTab === 'split') {
    // En modo split, ambos contenedores ocupan 50%
    pdfContainer.style.width = '50%';
    markdownContainer.style.width = '50%';
  } else {
    // En modo único, el contenedor visible ocupa 100%
    pdfContainer.style.width = '100%';
    markdownContainer.style.width = '100%';
  }
  
  // CAMBIO: Restablecer zoom al cambiar de pestaña
  resetPDFZoom();
}

/**
 * Función para restablecer el zoom del PDF
 * Esta función debe ser añadida al archivo pdf-panel.js
 */
function resetPDFZoom() {
  import('./pdf-viewer.js')
    .then(pdfViewerModule => {
      if (typeof pdfViewerModule.updateZoom === 'function') {
        // Restablecer zoom a 1 (100%)
        pdfViewerModule.updateZoom(1);
        console.log('Zoom restablecido al cambiar de pestaña');
      } else if (pdfViewerModule.default && typeof pdfViewerModule.default.updateZoom === 'function') {
        // Algunos módulos exportan funciones a través de default
        pdfViewerModule.default.updateZoom(1);
        console.log('Zoom restablecido al cambiar de pestaña (default)');
      } else {
        // Alternativa: buscar el botón de reset y hacer clic en él
        const resetButton = document.querySelector('.pdf-zoom-reset');
        if (resetButton) {
          resetButton.click();
          console.log('Zoom restablecido usando botón reset');
        } else {
          console.warn('No se pudo restablecer el zoom: función no encontrada');
        }
      }
    })
    .catch(error => {
      console.error('Error al intentar restablecer el zoom:', error);
      
      // Plan B: intentar usar el botón de reset directamente
      const resetButton = document.querySelector('.pdf-zoom-reset');
      if (resetButton) {
        resetButton.click();
        console.log('Zoom restablecido usando botón reset (fallback)');
      }
    });
}

/**
 * Configura listeners para los cambios en el estado del PDF
 */
function setupStateListeners() {
  // Cuando cambia el modo de visualización
  onPDFState('onViewModeChanged', mode => {
    updateActiveViewButton(mode);
  });
  
  // Cuando cambia la página actual
  onPDFState('onPageChanged', () => {
    updatePageInfo();
    loadPDFContent(); // Añadir esta línea para recargar el contenido cuando la página cambia
  });
  
  // Cuando se muestra/oculta el panel
  onPDFState('onPanelToggled', isVisible => {
    togglePanelVisibility(isVisible);
  });
  
  // Cuando se carga un PDF
  onPDFState('onPDFLoaded', pdfInfo => {
    updatePDFInfo(pdfInfo);
    loadPDFContent();
  });
  
  // Cuando se elimina un PDF
  onPDFState('onPDFRemoved', () => {
    togglePanelVisibility(false);
  });
}

/**
 * Actualiza la información del PDF en el panel
 * @param {Object} pdfInfo - Información del PDF
 */
function updatePDFInfo(pdfInfo) {
  if (!pdfInfo) return;
  
  const filenameElement = pdfPanel.querySelector('.pdf-panel-filename');
  if (filenameElement) {
    filenameElement.textContent = pdfInfo.originalName || 'Documento PDF';
    filenameElement.title = pdfInfo.originalName || 'Documento PDF';
  }
  
  // IMPORTANTE: Forzar actualización de totalPages en el estado
  if (pdfInfo.pageCount && pdfInfo.pageCount > 0) {
    import('../services/pdf-state.js').then(module => {
      module.updatePDFState({ totalPages: pdfInfo.pageCount });
      console.log(`PDF Info: Actualizando total páginas a ${pdfInfo.pageCount}`);
      
      setTimeout(() => updatePageInfo(), 0);
    });
  } else {
    updatePageInfo();
  }
}

/**
 * Actualiza la información de página
 */
function updatePageInfo() {
  const currentPage = getPDFState('currentPage');
  const totalPages = getPDFState('totalPages');
  
  pageDisplay.textContent = `Página ${currentPage} de ${totalPages}`;
  
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
  
  // NUEVO: Actualizar estado del botón de búsqueda
  pageJumpButton.disabled = totalPages <= 1;
}

/**
 * Carga el contenido del PDF para la página actual
 */
async function loadPDFContent() {
  if (panelState.isLoadingContent) return;
  
  panelState.isLoadingContent = true;
  setLoading(true);
  
  const currentPage = getPDFState('currentPage');
  const pdfId = getPDFState('currentPDFId');
  
  try {
    // NUEVO: Obtener info completa del PDF antes de cargar la página
    const pdfInfo = getPDFState('pdfInfo');
    
    // Si tenemos info del PDF pero el totalPages no está actualizado en la interfaz, actualizarlo
    if (pdfInfo && pdfInfo.pageCount && getPDFState('totalPages') !== pdfInfo.pageCount) {
      console.log(`Actualizando conteo de páginas: ${pdfInfo.pageCount}`);
      const pdfStateModule = await import('../services/pdf-state.js');
      pdfStateModule.updatePDFState({ totalPages: pdfInfo.pageCount });
      
      // Forzar actualización de la info de página
      updatePageInfo();
    }
    
    const [pdfPreviewPromise, pdfTextPromise] = await Promise.allSettled([
      getPDFPreview({ page: currentPage, pdfId }),
      getPDFText({ specificPage: currentPage, pdfId })
    ]);
    
    if (pdfPreviewPromise.status === 'fulfilled') {
      const imageUrl = pdfPreviewPromise.value;
      renderPDFPage(imageUrl, currentPage);
    } else {
      console.error('Error cargando vista previa:', pdfPreviewPromise.reason);
    }
    
    if (pdfTextPromise.status === 'fulfilled') {
      const textData = pdfTextPromise.value;
      
      if (textData.success && textData.formattedText) {
        renderMarkdownContent(textData.formattedText);
      } else {
        console.error('Error en respuesta de texto:', textData.error);
        renderMarkdownContent("**Error:** No se pudo cargar el contenido de texto.");
      }
    } else {
      console.error('Error cargando texto:', pdfTextPromise.reason);
      renderMarkdownContent("**Error:** No se pudo cargar el contenido de texto.");
    }
  } catch (error) {
    console.error('Error cargando contenido del PDF:', error);
  } finally {
    panelState.isLoadingContent = false;
    setLoading(false);
  }
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} isLoading - Si está cargando
 */
function setLoading(isLoading) {
  if (isLoading) {
    showElement(loadingIndicator, 'flex');
  } else {
    hideElement(loadingIndicator);
  }
}

/**
 * Muestra u oculta el panel
 * @param {boolean} visible - Si debe ser visible
 */
function togglePanelVisibility(visible) {
  console.log(`Toggle panel visibility: ${visible} (estado actual: ${panelState.isVisible})`);
  
  // NUEVO: Cerrar preview panel si está abierto y vamos a mostrar PDF panel
  if (visible) {
    const previewPanel = document.querySelector('#preview-panel');
    if (previewPanel && previewPanel.classList.contains('open')) {
      console.log('PDF Panel: Cerrando preview panel antes de abrir PDF panel');
      previewPanel.classList.remove('open');
      document.body.classList.remove('preview-panel-active');
      setTimeout(() => {
        if (previewPanel && !previewPanel.classList.contains('open')) {
          previewPanel.style.display = 'none';
        }
      }, 300);
    }
  }
  
  // Incluso si ya está en el estado deseado, aplicar de todos modos
  panelState.isVisible = visible;
  
  if (visible) {
    // Asegurar que el panel existe
    if (!pdfPanel) {
      console.warn('Panel PDF no existe, recreando elementos DOM');
      createDOMElements();
      attachEventListeners();
    }
    
    // Asegurar que se muestra correctamente
    pdfPanel.classList.add('visible');
    document.body.classList.add('pdf-panel-active');
    
    // Forzar visibilidad con estilos inline por si acaso
    pdfPanel.style.display = 'flex';
    pdfPanel.style.opacity = '1';
    pdfPanel.style.visibility = 'visible';
    
    loadPDFContent();
    
    // NUEVO: Forzar actualización del conteo de páginas al mostrar el panel
    // Acceder directamente a la información del PDF actual
    const pdfInfo = getPDFState('pdfInfo');
    if (pdfInfo && pdfInfo.pageCount) {
      import('../services/pdf-state.js').then(module => {
        console.log(`Panel visible: Actualizando páginas a ${pdfInfo.pageCount}`);
        module.updatePDFState({ totalPages: pdfInfo.pageCount });
        
        // Forzar actualización de UI después de un breve retraso
        setTimeout(() => {
          const totalPages = getPDFState('totalPages');
          const currentPage = getPDFState('currentPage');
          console.log(`Actualizando display de página: ${currentPage} de ${totalPages}`);
          pageDisplay.textContent = `Página ${currentPage} de ${totalPages}`;
          
          prevPageButton.disabled = currentPage <= 1;
          nextPageButton.disabled = currentPage >= totalPages;
          pageJumpButton.disabled = totalPages <= 1; // NUEVO
        }, 50);
      });
    }
  } else {
    pdfPanel.classList.remove('visible');
    document.body.classList.remove('pdf-panel-active');
    
    // NUEVO: Ocultar modal de búsqueda si está abierto
    if (pageJumpModal && pageJumpModal.classList.contains('show')) {
      hidePageJumpModal();
    }
    
    // Forzar ocultamiento con estilos inline
    setTimeout(() => {
      if (!panelState.isVisible && pdfPanel) {
        pdfPanel.style.display = 'none';
      }
    }, 300); // Esperar a que termine la animación
  }
}

/**
 * Maneja la eliminación del PDF con modal de confirmación estilizada
 */
async function handlePDFDelete() {
  try {
    const modalsModule = await import('../ui/modals-pdf.js');
    
    // MEJORA: Verificar si ya hay una modal abierta
    if (modalsModule.isAnyModalOpen && modalsModule.isAnyModalOpen()) {
      console.warn('Ya hay una modal abierta. No se mostrará la confirmación para eliminar PDF.');
      return;
    }
    
    if (typeof modalsModule.showConfirmation === 'function') {
      modalsModule.showConfirmation(
        'Eliminar PDF',
        '¿Estás seguro que deseas eliminar este PDF? Esta acción no se puede deshacer.',
        async () => {
          setLoading(true);
          
          try {
            const pdfId = getPDFState('currentPDFId');
            await deletePDF(pdfId);
            
            // Reiniciar estado y ocultar panel
            togglePDFPanel(false);
            
            setManagedTimeout(() => {
              import('../services/pdf-state.js').then(module => {
                if (module.initPDFCheck) {
                  module.initPDFCheck();
                }
              });
              
              updatePDFButtonsVisibility(false);
            }, 500, 'pdf-state-check');
            
          } catch (error) {
            console.error('Error eliminando PDF:', error);
            
            acadelError("No se pudo eliminar", "Acadel tuvo problemas eliminando el PDF. Intenta de nuevo");
          } finally {
            setLoading(false);
          }
        },
        null // No hacer nada si el usuario cancela
      );
    } else {
      const confirmed = confirm('¿Estás seguro que deseas eliminar este PDF?');
      
      if (confirmed) {
        setLoading(true);
        
        try {
          const pdfId = getPDFState('currentPDFId');
          await deletePDF(pdfId);
          
          // Reiniciar estado y ocultar panel
          togglePDFPanel(false);
          
          setManagedTimeout(() => {
            import('../services/pdf-state.js').then(module => {
              if (module.initPDFCheck) {
                module.initPDFCheck();
              }
            });
            
            updatePDFButtonsVisibility(false);
          }, 500, 'pdf-state-check');
          
        } catch (error) {
          console.error('Error eliminando PDF:', error);
          acadelError("Error eliminando PDF", "Acadel no pudo completar la eliminación. Intenta recargar la página");
        } finally {
          setLoading(false);
        }
      }
    }
  } catch (error) {
    console.error('Error al importar módulos:', error);
    
    const confirmed = confirm('¿Estás seguro que deseas eliminar este PDF?');
    
    if (!confirmed) return;
    
    setLoading(true);
    
    try {
      const pdfId = getPDFState('currentPDFId');
      await deletePDF(pdfId);
      
      // Reiniciar estado y ocultar panel
      togglePDFPanel(false);
      
      setManagedTimeout(() => {
        import('../services/pdf-state.js').then(module => {
          if (module.initPDFCheck) {
            module.initPDFCheck();
          }
        });
        
        updatePDFButtonsVisibility(false);
      }, 500, 'pdf-state-check');
      
    } catch (error) {
      console.error('Error eliminando PDF:', error);
      alert('Error al eliminar el PDF. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }
}

// Asegurarse de exportar la función en el objeto por defecto
export default {
  initPDFPanel,
  loadPDFContent,
};