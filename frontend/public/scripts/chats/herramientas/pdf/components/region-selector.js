/**
 * region-selector.js - Componente para seleccionar regiones en el PDF
 * Permite seleccionar áreas del PDF para extraer texto o capturar como imagen.
 */

import { getPDFState, setSelectedRegion } from '../services/pdf-state.js';
import { sendMessage } from '../api/messages-pdf.js';

// Elementos DOM
let container;
let selectionOverlay;
let regionToolbar;
let selectButton; // Nueva referencia al botón de selección

// Estado del selector
const selectorState = {
  isSelecting: false,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  currentRegion: null,
  isToolbarVisible: false
};

// Variable para guardar la referencia al módulo pdf-viewer
let pdfViewerModule;

/**
 * Inicializa el selector de regiones con mejores referencias al zoom
 * Modificada para conectar las funciones necesarias
 */
export function initRegionSelector() {
  const pdfViewerToolbar = document.querySelector('.pdf-viewer-toolbar .pdf-viewer-actions');
  if (pdfViewerToolbar) {
    selectButton = document.createElement('button');
    selectButton.className = 'pdf-region-select-btn';
    selectButton.title = 'Seleccionar región';
    selectButton.innerHTML = '<i class="bx bx-selection"></i>';
    pdfViewerToolbar.appendChild(selectButton);

    selectButton.addEventListener('click', toggleSelectionMode);
  } else {
    console.error('No se encontró la toolbar del visor PDF');
  }

  createSelectorElements();
  attachEventListeners();

  setupResizeObserver();

  document.addEventListener('zoom-changed', handleZoomChange);

  import('./pdf-viewer.js')
    .then(module => {
      pdfViewerModule = module;
      console.log('Módulo pdf-viewer cargado correctamente para region-selector');

      if (typeof pdfViewerModule.subscribeToZoomChanges === 'function') {
        pdfViewerModule.subscribeToZoomChanges(handleZoomChange);
      }

      if (typeof pdfViewerModule.onZoomUpdated === 'function') {
        pdfViewerModule.onZoomUpdated(updateSelectionForZoom);
      } else {
        // Si no existe esa función, intentar agregar un event listener al botón de zoom
        const zoomButtons = document.querySelectorAll('.pdf-zoom-in, .pdf-zoom-out, .pdf-zoom-reset');
        zoomButtons.forEach(button => {
          button.addEventListener('click', () => {
            // Pequeño delay para permitir que el zoom se actualice
            setTimeout(() => {
              const newZoom = getCurrentZoom();
              updateSelectionForZoom(newZoom);
            }, 50);
          });
        });
      }
    })
    .catch(error => {
      console.error('Error al cargar el módulo pdf-viewer:', error);
    });

  // También observar la rueda del ratón para cambios de zoom
  // (muchos usuarios usan Ctrl+Rueda para hacer zoom)
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey && selectorState.currentRegion) {
      // Pequeño delay para permitir que el zoom se actualice
      setTimeout(() => {
        const newZoom = getCurrentZoom();
        updateSelectionForZoom(newZoom);
      }, 50);
    }
  }, { passive: true });
}


/**
 * Maneja cambios en el nivel de zoom
 * @param {Event|number} zoomEvent - Evento o valor directo del zoom
 */
function handleZoomChange(zoomEvent) {
  // Si hay una selección activa, actualizarla con el nuevo zoom
  if (selectorState.currentRegion) {
    // Capturar el nuevo zoom
    const newZoom = typeof zoomEvent === 'number' ? zoomEvent : getCurrentZoom();

    selectorState.currentRegion.scale = newZoom;

    updateSelectionForZoom(newZoom);

    // También actualizar la visualización si es necesario
    const box = selectionOverlay.querySelector('.region-selection-box');
    if (box && box.style.display !== 'none') {
      updateSelectionVisual();
    }

    console.log(`Zoom actualizado: ${newZoom}, selección actualizada`);
  }
}

/**
 * Modifica el overlay del selector para que se ajuste al contenedor de imagen
 * en lugar de utilizar posición fija
 */
function adjustOverlayToImageContainer() {
  const pdfImageContainer = document.querySelector('.pdf-image-container');
  const pdfImage = document.querySelector('.pdf-image');

  if (!selectionOverlay || !pdfImageContainer || !pdfImage) return;

  // Asegurar que el overlay tenga el mismo tamaño que el contenedor de imagen
  const containerRect = pdfImageContainer.getBoundingClientRect();
  const imageRect = pdfImage.getBoundingClientRect();

  // Ajustar el estilo del overlay para que cubra exactamente la imagen
  selectionOverlay.style.position = 'absolute';
  selectionOverlay.style.top = '0';
  selectionOverlay.style.left = '0';
  selectionOverlay.style.width = '100%';
  selectionOverlay.style.height = '100%';
  selectionOverlay.style.pointerEvents = 'none';

  // Hacer que los elementos dentro puedan recibir eventos cuando sea necesario
  if (selectorState.isSelecting) {
    selectionOverlay.style.pointerEvents = 'auto';
  }
}

/**
 * Actualiza la selección cuando cambia el nivel de zoom
 * @param {number} newZoom - Nuevo nivel de zoom
 */
function updateSelectionForZoom(newZoom) {
  if (!selectorState.currentRegion) return;

  const oldZoom = selectorState.currentRegion.scale || 1;
  selectorState.currentRegion.scale = newZoom;

  const box = selectionOverlay.querySelector('.region-selection-box');
  if (box && box.style.display !== 'none') {
    updateSelectionVisual();
  }

  // Ajustar el overlay al nuevo tamaño de la imagen
  adjustOverlayToImageContainer();
}

/**
 * Actualiza los elementos DOM que se usan para la selección cuando cambian
 * dimensiones como en resize o cambios de zoom
 */
function updateSelectorElements() {
  const pdfImageContainer = document.querySelector('.pdf-image-container');
  const pdfImage = document.querySelector('.pdf-image');

  if (!pdfImageContainer || !pdfImage) return;

  // Ajustar el overlay al contenedor
  adjustOverlayToImageContainer();

  // Si hay una selección activa, actualizarla
  if (selectorState.currentRegion) {
    updateSelectionVisual();
  }
}

function setupResizeObserver() {
  const pdfImageContainer = document.querySelector('.pdf-image-container');
  if (!pdfImageContainer) return;

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(entries => {
      // Cuando el contenedor cambia de tamaño (por zoom u otras razones)
      updateSelectorElements();
    });

    resizeObserver.observe(pdfImageContainer);
  } else {
    window.addEventListener('resize', updateSelectorElements);
  }
}


/**
 * Crea los elementos DOM necesarios
 */
function createSelectorElements() {
  // Identificar contenedor de PDF
  container = document.querySelector('.pdf-viewer-container');
  if (!container) {
    console.error('No se encontró el contenedor del visor PDF');
    return;
  }

  const pdfImageContainer = container.querySelector('.pdf-image-container');
  if (!pdfImageContainer) {
    console.error('No se encontró el contenedor de la imagen PDF');
    return;
  }

  // 1. Contenedor de selección (se inyecta en el contenedor de imagen)
  selectionOverlay = document.createElement('div');
  selectionOverlay.className = 'pdf-region-selection-overlay';
  selectionOverlay.innerHTML = `
    <div class="region-selection-box">
      <!-- Manejadores para redimensionar -->
      <div class="resize-handle top-left"></div>
      <div class="resize-handle top-right"></div>
      <div class="resize-handle bottom-left"></div>
      <div class="resize-handle bottom-right"></div>
    </div>
  `;

  pdfImageContainer.appendChild(selectionOverlay);

  // Ajustar el estilo del overlay para que cubra solo el contenedor de imagen
  selectionOverlay.style.position = 'absolute';
  selectionOverlay.style.top = '0';
  selectionOverlay.style.left = '0';
  selectionOverlay.style.width = '100%';
  selectionOverlay.style.height = '100%';
  selectionOverlay.style.pointerEvents = 'none';
  selectionOverlay.style.zIndex = '50';

  // Estilo para la caja de selección
  const selectionBox = selectionOverlay.querySelector('.region-selection-box');
  if (selectionBox) {
    selectionBox.style.display = 'none';
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '2px solid rgba(0, 120, 212, 0.9)';
    selectionBox.style.backgroundColor = 'rgba(0, 120, 212, 0.1)';
    selectionBox.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.5)';
    selectionBox.style.pointerEvents = 'none';

    // Estilo para los manejadores de redimensión
    const handles = selectionBox.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.style.position = 'absolute';
      handle.style.width = '8px';
      handle.style.height = '8px';
      handle.style.backgroundColor = 'white';
      handle.style.border = '1px solid rgba(0, 120, 212, 1)';

      // Posicionar los manejadores
      if (handle.classList.contains('top-left')) {
        handle.style.top = '-5px';
        handle.style.left = '-5px';
      } else if (handle.classList.contains('top-right')) {
        handle.style.top = '-5px';
        handle.style.right = '-5px';
      } else if (handle.classList.contains('bottom-left')) {
        handle.style.bottom = '-5px';
        handle.style.left = '-5px';
      } else if (handle.classList.contains('bottom-right')) {
        handle.style.bottom = '-5px';
        handle.style.right = '-5px';
      }
    });
  }

  // 2. Barra de herramientas para regiones
  regionToolbar = document.createElement('div');
  regionToolbar.className = 'pdf-region-toolbar';
  regionToolbar.innerHTML = `
    <div class="region-toolbar-title">Selección</div>
    <div class="region-toolbar-actions">
      <button class="region-action-btn" data-action="capture" title="Capturar como imagen">
        <i class='bx bx-image'></i>
      </button>
      <button class="region-action-btn" data-action="text" title="Generar informe">
        <i class='bx bx-file-blank'></i>
      </button>
      <button class="region-action-btn" data-action="analyze" title="Analizar contenido">
        <i class='bx bx-analyse'></i>
      </button>
      <button class="region-action-btn" data-action="cancel" title="Cancelar">
        <i class='bx bx-x'></i>
      </button>
    </div>
  `;
  document.body.appendChild(regionToolbar);

  // Estilo para toolbar
  regionToolbar.style.display = 'none';
  regionToolbar.style.position = 'fixed';
  regionToolbar.style.backgroundColor = 'white';
  regionToolbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  regionToolbar.style.borderRadius = '4px';
  regionToolbar.style.padding = '4px 8px';
  regionToolbar.style.zIndex = '9300';
}

/**
 * Agrega event listeners
 */
function attachEventListeners() {
  // 2. Eventos para dibujar la selección
  const pdfImageContainer = document.querySelector('.pdf-image-container');
  if (pdfImageContainer) {
    pdfImageContainer.addEventListener('mousedown', handleMouseDown);
    // El mousemove y mouseup los manejaremos solo cuando esté activa una selección
  }

  // 3. Eventos para acciones de la barra de herramientas de región
  if (regionToolbar) {
    regionToolbar.querySelectorAll('.region-action-btn').forEach(button => {
      button.addEventListener('click', handleRegionAction);
    });
  }

  // 4. Detectar clics fuera para cancelar
  document.addEventListener('mousedown', (e) => {
    // Si la toolbar está visible y se hace clic fuera
    if (selectorState.isToolbarVisible) {
      const selectionBox = selectionOverlay.querySelector('.region-selection-box');
      const clickedInToolbar = regionToolbar.contains(e.target);
      const clickedInSelection = selectionBox && selectionBox.contains(e.target);

      // Si el clic fue fuera de ambos elementos, ocultar la toolbar
      if (!clickedInToolbar && !clickedInSelection) {
        hideRegionTools();
        // Importante: no cancelar aquí el evento para permitir la propagación normal
      }
    }

    // NUEVO: Desactivar modo selección si está activo y se hace clic fuera del PDF
    if (selectorState.isSelecting) {
      const pdfContainer = document.querySelector('.pdf-viewer-container');
      const pdfImageContainer = document.querySelector('.pdf-image-container');
      const selectButton = document.querySelector('.pdf-region-select-btn');

      const clickedOnSelectButton = selectButton && selectButton.contains(e.target);

      if (pdfContainer && pdfImageContainer &&
        !pdfImageContainer.contains(e.target) &&
        !clickedOnSelectButton &&
        !regionToolbar.contains(e.target)) {
        selectorState.isSelecting = false;
        if (selectButton) selectButton.classList.remove('active');
        if (selectionOverlay) selectionOverlay.classList.remove('active');

        if (pdfContainer) {
          pdfContainer.classList.remove('region-selecting');
        }

        console.log('Modo selección desactivado por clic fuera del PDF');
      }
    }
  });

  // 5. Tecla Escape para cancelar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (selectorState.isSelecting || selectorState.isToolbarVisible) {
        cancelSelection();
      }
    }
  });
}

/**
 * Obtiene el factor de zoom actual del PDF
 * @returns {number} Factor de zoom (1 por defecto si no se puede obtener)
 */
function getCurrentZoom() {
  // 1. Primero intentar obtener el zoom desde el estado del visor
  try {
    if (pdfViewerModule && typeof pdfViewerModule.getCurrentZoom === 'function') {
      return pdfViewerModule.getCurrentZoom();
    }
  } catch (moduleError) {
    console.warn('Error al obtener zoom desde módulo:', moduleError);
  }

  // 2. Intentar obtener el zoom desde el DOM con mayor precisión
  try {
    const zoomText = document.querySelector('.pdf-zoom-level');
    if (zoomText) {
      // El formato es "100%", así que extraemos el número y lo convertimos
      const zoomPercentage = parseInt(zoomText.textContent.replace(/[^0-9]/g, ''));
      if (!isNaN(zoomPercentage) && zoomPercentage > 0) {
        return zoomPercentage / 100;
      }
    }

    // 3. Si no funciona, calcular basado en transformaciones CSS
    const pdfImage = document.querySelector('.pdf-image');
    if (pdfImage) {
      const style = window.getComputedStyle(pdfImage);
      if (style.transform && style.transform !== 'none') {
        try {
          const matrix = new DOMMatrix(style.transform);
          // La escala generalmente está en matrix.a (escalaX) y matrix.d (escalaY)
          // Usamos el promedio por si hay distorsión
          const scaleX = matrix.a || 1;
          const scaleY = matrix.d || 1;
          return (scaleX + scaleY) / 2;
        } catch (matrixError) {
          console.warn('Error al analizar matriz de transformación:', matrixError);
        }
      }

      // 4. Último recurso: comparar tamaño natural con tamaño mostrado
      if (pdfImage.naturalWidth && pdfImage.offsetWidth) {
        return pdfImage.offsetWidth / pdfImage.naturalWidth;
      }
    }
  } catch (domError) {
    console.warn('Error al obtener zoom desde DOM:', domError);
  }

  // 5. Valor por defecto si todo falla
  console.warn('No se pudo determinar el zoom, usando valor por defecto: 1');
  return 1;
}

/**
 * Maneja el evento mousedown en el contenedor de imagen
 * @param {MouseEvent} e - Evento mousedown
 */
function handleMouseDown(e) {
  if (!selectorState.isSelecting) return;

  startSelection(e);

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Evitar comportamientos por defecto como arrastrar imágenes
  e.preventDefault();
}

/**
 * Maneja el evento mousemove durante la selección
 * @param {MouseEvent} e - Evento mousemove
 */
function handleMouseMove(e) {
  if (!selectorState.isSelecting) return;
  updateSelection(e);
  e.preventDefault();
}

/**
 * Maneja el evento mouseup al finalizar la selección
 * @param {MouseEvent} e - Evento mouseup
 */
function handleMouseUp(e) {
  if (!selectorState.isSelecting) return;

  endSelection(e);

  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);

  e.preventDefault();
}

/**
 * Activa/desactiva el modo de selección
 */
function toggleSelectionMode() {
  if (selectorState.isSelecting) {
    selectorState.isSelecting = false;
    selectButton.classList.remove('active');
    selectionOverlay.classList.remove('active');

    // Solo cambiar el cursor del contenedor de PDF, no de todo el documento
    const pdfContainer = document.querySelector('.pdf-viewer-container');
    if (pdfContainer) {
      pdfContainer.classList.remove('region-selecting');
    }
  } else {
    selectorState.isSelecting = true;
    selectButton.classList.add('active');
    selectionOverlay.classList.add('active');

    // Solo cambiar el cursor del contenedor de PDF
    const pdfContainer = document.querySelector('.pdf-viewer-container');
    if (pdfContainer) {
      pdfContainer.classList.add('region-selecting');
    }

    // Restablecer zoom automáticamente antes de la selección
    if (pdfViewerModule && typeof pdfViewerModule.updateZoom === 'function') {
      pdfViewerModule.updateZoom(1);
    } else {
      const resetButton = document.querySelector('.pdf-zoom-reset');
      if (resetButton) {
        resetButton.click();
      }
    }
  }
}

/**
 * Inicia el proceso de selección
 * @param {MouseEvent} e - Evento mousedown
 */
function startSelection(e) {
  if (!selectorState.isSelecting) return;

  const pdfImageContainer = document.querySelector('.pdf-image-container');
  const pdfImage = document.querySelector('.pdf-image');

  if (!pdfImageContainer || !pdfImage) return;

  const containerRect = pdfImageContainer.getBoundingClientRect();
  const imageRect = pdfImage.getBoundingClientRect();

  if (
    e.clientX < containerRect.left ||
    e.clientX > containerRect.right ||
    e.clientY < containerRect.top ||
    e.clientY > containerRect.bottom
  ) {
    return; // El clic está fuera del contenedor, no iniciar selección
  }

  const zoom = getCurrentZoom();

  const imageOffsetX = imageRect.left - containerRect.left;
  const imageOffsetY = imageRect.top - containerRect.top;

  const relativeX = e.clientX - imageRect.left;
  const relativeY = e.clientY - imageRect.top;

  const rawX = relativeX / zoom;
  const rawY = relativeY / zoom;

  console.log(`Inicio selección - Clic en: (${e.clientX}, ${e.clientY})`);
  console.log(`Relativo a imagen: (${relativeX}, ${relativeY}), Zoom: ${zoom}`);
  console.log(`Coordenadas ajustadas: (${rawX}, ${rawY})`);

  selectorState.startX = rawX;
  selectorState.startY = rawY;

  selectorState.endX = selectorState.startX;
  selectorState.endY = selectorState.startY;

  selectorState.imageRect = imageRect;
  selectorState.containerRect = containerRect;
  selectorState.initialZoom = zoom;

  updateSelectionVisual();
}

/**
 * Actualiza la selección mientras se mueve el mouse
 * @param {MouseEvent} e - Evento mousemove
 */
function updateSelection(e) {
  if (!selectorState.isSelecting || selectorState.startX === null) return;

  const { imageRect, containerRect, initialZoom } = selectorState;

  if (!imageRect || !containerRect) {
    // Si no tenemos información guardada, obtenerla ahora
    const pdfImageContainer = document.querySelector('.pdf-image-container');
    const pdfImage = document.querySelector('.pdf-image');

    if (!pdfImageContainer || !pdfImage) return;

    selectorState.imageRect = pdfImage.getBoundingClientRect();
    selectorState.containerRect = pdfImageContainer.getBoundingClientRect();
  }

  const currentImageRect = selectorState.imageRect;

  const zoom = getCurrentZoom();

  const relativeX = e.clientX - currentImageRect.left;
  const relativeY = e.clientY - currentImageRect.top;

  if (
    relativeX < 0 || relativeX > currentImageRect.width ||
    relativeY < 0 || relativeY > currentImageRect.height
  ) {
    // El ratón está fuera de la imagen, limitar al borde
    const boundedX = Math.max(0, Math.min(currentImageRect.width, relativeX));
    const boundedY = Math.max(0, Math.min(currentImageRect.height, relativeY));

    const rawX = boundedX / zoom;
    const rawY = boundedY / zoom;

    selectorState.endX = rawX;
    selectorState.endY = rawY;
  } else {
    // El ratón está dentro de la imagen, usar coordenadas directas
    const rawX = relativeX / zoom;
    const rawY = relativeY / zoom;

    selectorState.endX = rawX;
    selectorState.endY = rawY;
  }

  updateSelectionVisual();
}

/**
 * Actualiza el visual de la selección con mayor precisión
 */
function updateSelectionVisual() {
  const box = selectionOverlay.querySelector('.region-selection-box');
  if (!box) return;

  const pdfImage = document.querySelector('.pdf-image');
  const pdfImageContainer = document.querySelector('.pdf-image-container');

  if (!pdfImage || !pdfImageContainer) {
    console.warn('No se pudo obtener imagen o contenedor para actualizar visualización');
    return;
  }

  const normalizedRegion = normalizeRegion({
    x1: selectorState.startX,
    y1: selectorState.startY,
    x2: selectorState.endX,
    y2: selectorState.endY
  });

  const zoom = getCurrentZoom();

  box.style.left = `${normalizedRegion.x1 * zoom}px`;
  box.style.top = `${normalizedRegion.y1 * zoom}px`;
  box.style.width = `${(normalizedRegion.x2 - normalizedRegion.x1) * zoom}px`;
  box.style.height = `${(normalizedRegion.y2 - normalizedRegion.y1) * zoom}px`;
  box.style.display = 'block';

  box.style.border = '2px solid rgba(0, 120, 212, 0.9)';
  box.style.backgroundColor = 'rgba(0, 120, 212, 0.1)';
  box.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.5)';

  // Dimensiones reales (sin zoom)
  const realWidth = Math.round(normalizedRegion.x2 - normalizedRegion.x1);
  const realHeight = Math.round(normalizedRegion.y2 - normalizedRegion.y1);

  if ((normalizedRegion.x2 - normalizedRegion.x1) * zoom > 60 &&
    (normalizedRegion.y2 - normalizedRegion.y1) * zoom > 30) {
    let dimensions = box.querySelector('.selection-dimensions');
    if (!dimensions) {
      dimensions = document.createElement('div');
      dimensions.className = 'selection-dimensions';
      dimensions.style.position = 'absolute';
      dimensions.style.bottom = '2px';
      dimensions.style.right = '5px';
      dimensions.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      dimensions.style.color = '#fff';
      dimensions.style.padding = '3px 6px';
      dimensions.style.fontSize = '10px';
      dimensions.style.borderRadius = '3px';
      dimensions.style.pointerEvents = 'none';
      box.appendChild(dimensions);
    }

    // Incluir coordenadas para ayudar a depurar problemas
    dimensions.textContent = `${realWidth} × ${realHeight} px (zoom: ${Math.round(zoom * 100)}%)`;
    dimensions.title = `x1:${Math.round(normalizedRegion.x1)}, y1:${Math.round(normalizedRegion.y1)}`;
  } else {
    const existingDimensions = box.querySelector('.selection-dimensions');
    if (existingDimensions) {
      existingDimensions.remove();
    }
  }
}

/**
 * Finaliza el proceso de selección
 * @param {MouseEvent} e - Evento mouseup
 */
function endSelection(e) {
  if (!selectorState.isSelecting || selectorState.startX === null) return;

  const width = Math.abs(selectorState.endX - selectorState.startX);
  const height = Math.abs(selectorState.endY - selectorState.startY);

  if (width < 20 || height < 20) {
    // Selección demasiado pequeña, cancelar
    cancelSelection();
    return;
  }

  const normalizedRegion = normalizeRegion({
    x1: selectorState.startX,
    y1: selectorState.startY,
    x2: selectorState.endX,
    y2: selectorState.endY
  });

  const currentZoom = getCurrentZoom();

  selectorState.currentRegion = {
    ...normalizedRegion,
    page: getPDFState('currentPage'),
    scale: currentZoom,
    width: normalizedRegion.x2 - normalizedRegion.x1,
    height: normalizedRegion.y2 - normalizedRegion.y1,
    originalCoords: {
      x1: normalizedRegion.x1,
      y1: normalizedRegion.y1,
      x2: normalizedRegion.x2,
      y2: normalizedRegion.y2,
    }
  };

  console.log('Región seleccionada:', selectorState.currentRegion);

  showRegionToolbar(normalizedRegion);

  setSelectedRegion(selectorState.currentRegion);

  selectorState.isSelecting = false;
  selectButton.classList.remove('active');
}

/**
 * Normaliza las coordenadas de una región
 * @param {Object} region - Región a normalizar
 * @returns {Object} - Región normalizada
 */
function normalizeRegion(region) {
  return {
    x1: Math.min(region.x1, region.x2),
    y1: Math.min(region.y1, region.y2),
    x2: Math.max(region.x1, region.x2),
    y2: Math.max(region.y1, region.y2)
  };
}

/**
 * Muestra la barra de herramientas para la región seleccionada
 * @param {Object} region - Región seleccionada
 */
function showRegionToolbar(region) {
  const pdfImageContainer = document.querySelector('.pdf-image-container');
  if (!pdfImageContainer) return;

  const imageRect = pdfImageContainer.getBoundingClientRect();

  const zoom = getCurrentZoom();

  const centerX = imageRect.left + (region.x1 + region.x2) / 2 * zoom;
  const centerY = imageRect.top + region.y2 * zoom + 10; // 10px debajo de la selección

  // Posicionar toolbar
  regionToolbar.style.position = 'fixed';
  regionToolbar.style.left = `${centerX}px`;
  regionToolbar.style.top = `${centerY}px`;
  regionToolbar.style.transform = 'translate(-50%, 0)';
  regionToolbar.style.zIndex = '9300';

  regionToolbar.style.display = 'flex';
  regionToolbar.style.opacity = '1';
  regionToolbar.classList.add('active');
  selectorState.isToolbarVisible = true;

  console.log('Toolbar mostrado en:', centerX, centerY, 'para región:', region, 'zoom:', zoom);
}

/**
 * Oculta las herramientas de región
 */
function hideRegionTools() {
  if (regionToolbar) {
    regionToolbar.classList.remove('active');
    regionToolbar.style.display = 'none';
    regionToolbar.style.opacity = '0';
  }

  if (selectionOverlay) {
    selectionOverlay.classList.remove('active');
  }

  const pdfContainer = document.querySelector('.pdf-viewer-container');
  if (pdfContainer) {
    pdfContainer.classList.remove('region-selecting');
  }

  const box = selectionOverlay.querySelector('.region-selection-box');
  if (box) {
    box.style.display = 'none';
  }

  selectorState.isToolbarVisible = false;
  selectorState.currentRegion = null;

  setSelectedRegion(null);
}

/**
 * Cancela la selección actual
 */
function cancelSelection() {
  selectorState.startX = null;
  selectorState.startY = null;
  selectorState.endX = null;
  selectorState.endY = null;

  hideRegionTools();
}

/**
 * Maneja las acciones de la barra de herramientas de región
 * @param {Event} e - Evento de clic
 */
async function handleRegionAction(e) {
  const action = e.currentTarget.getAttribute('data-action');

  if (!selectorState.currentRegion) {
    cancelSelection();
    return;
  }

  const currentRegion = { ...selectorState.currentRegion };

  hideRegionToolbar();

  // Mantener la selección visual mientras se procesa la acción
  const selectionBox = selectionOverlay.querySelector('.region-selection-box');
  if (selectionBox) {
    selectionBox.style.display = 'block';
  }

  // Ahora procesar la acción seleccionada
  switch (action) {
    case 'capture':
      await captureRegionAsImage(currentRegion);
      break;

    case 'text':
      await extractRegionText(currentRegion);
      break;

    case 'analyze':
      await analyzeRegionContent(currentRegion);
      break;

    case 'cancel':
      break;

    default:
      console.warn('Acción no implementada:', action);
  }

  // Finalmente, cancelar la selección completamente
  cancelSelection();
}

/**
 * Oculta solo la barra de herramientas sin afectar la selección
 */
function hideRegionToolbar() {
  if (regionToolbar) {
    regionToolbar.classList.remove('active');
    regionToolbar.style.display = 'none';
    regionToolbar.style.opacity = '0';
    selectorState.isToolbarVisible = false;
  }
}

/**
 * Captura la región seleccionada como imagen - MINIATURA COMPLETA
 * @param {Object} region - Región a capturar (opcional, usa selectorState.currentRegion si no se proporciona)
 * @param {string} promptType - Tipo de prompt a incluir ('none', 'analyze', 'extract')
 * @returns {Promise<string>} La URL base64 de la imagen capturada
 */
async function captureRegionAsImage(region = null, promptType = 'none') {
  console.log('🎯 Capturando región del PDF...');
  
  let canvas = null;
  
  try {
    // ============================================
    // PASO 1: VALIDACIONES INICIALES
    // ============================================
    const targetRegion = region || selectorState.currentRegion;
    if (!targetRegion) {
      acadelWarning("Falta seleccionar región", "Acadel necesita que selecciones una parte del PDF primero");
      return;
    }

    showTemporaryMessage('Acadel está capturando la región...', false, true);

    const pdfImage = document.querySelector('.pdf-image');
    if (!pdfImage || !pdfImage.complete || pdfImage.naturalWidth === 0) {
      acadelError("PDF no cargado", "Acadel no puede ver la imagen del PDF. Intenta recargar la página");
      return;
    }

    // ============================================
    // PASO 2: NORMALIZACIÓN DE COORDENADAS
    // ============================================
    const captureRegion = normalizeRegion({
      x1: targetRegion.x1 || targetRegion.startX || 0,
      y1: targetRegion.y1 || targetRegion.startY || 0,
      x2: targetRegion.x2 || targetRegion.endX || 100,
      y2: targetRegion.y2 || targetRegion.endY || 100
    });

    const width = Math.abs(captureRegion.x2 - captureRegion.x1);
    const height = Math.abs(captureRegion.y2 - captureRegion.y1);

    if (width < 10 || height < 10) {
      acadelInfo("Región muy pequeña", "Acadel necesita que selecciones un área más grande para poder capturarla bien");
      return;
    }

    // ============================================
    // PASO 3: CÁLCULO DE COORDENADAS Y ESCALA
    // ============================================
    
    // Coordenadas normalizadas (esquina superior-izquierda)
    const x = Math.min(captureRegion.x1, captureRegion.x2);
    const y = Math.min(captureRegion.y1, captureRegion.y2);

    // CORREGIDO: Usar clientWidth/Height para cálculo preciso de escala
    const scaleX = pdfImage.naturalWidth / pdfImage.clientWidth;
    const scaleY = pdfImage.naturalHeight / pdfImage.clientHeight;

    console.log('🔍 Imagen info:', {
      natural: `${pdfImage.naturalWidth}x${pdfImage.naturalHeight}`,
      displayed: `${pdfImage.clientWidth}x${pdfImage.clientHeight}`,
      scale: `${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`
    });

    // CORREGIDO: Coordenadas finales ajustadas por escala
    const sourceX = Math.max(0, Math.round(x * scaleX));
    const sourceY = Math.max(0, Math.round(y * scaleY));
    const sourceWidth = Math.min(Math.round(width * scaleX), pdfImage.naturalWidth - sourceX);
    const sourceHeight = Math.min(Math.round(height * scaleY), pdfImage.naturalHeight - sourceY);

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      acadelError("Región inválida", "La región seleccionada es demasiado pequeña o está fuera del PDF");
      return;
    }

    console.log('📐 Coordenadas de captura:', {
      region: `${sourceX},${sourceY} ${sourceWidth}×${sourceHeight}`,
      scale: `${scaleX.toFixed(2)}×${scaleY.toFixed(2)}`
    });

    // ============================================
    // PASO 4: CREACIÓN Y CONFIGURACIÓN DEL CANVAS
    // ============================================
    
    canvas = document.createElement('canvas');
    // OPTIMIZADO: Usar dimensiones razonables (máximo 1000px, mínimo 100px)
    const maxDimension = 1000;
    const aspectRatio = sourceWidth / sourceHeight;
    
    if (sourceWidth > sourceHeight) {
      canvas.width = Math.min(maxDimension, Math.max(100, sourceWidth / 2));
      canvas.height = Math.max(100, canvas.width / aspectRatio);
    } else {
      canvas.height = Math.min(maxDimension, Math.max(100, sourceHeight / 2));
      canvas.width = Math.max(100, canvas.height * aspectRatio);
    }

    // Asegurar que las dimensiones sean enteras
    canvas.width = Math.round(canvas.width);
    canvas.height = Math.round(canvas.height);
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ============================================
    // PASO 5: CAPTURA DE LA REGIÓN
    // ============================================
    
    try {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // CORREGIDO: Dibujar la región específica
      ctx.drawImage(
        pdfImage,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Región fuente
        0, 0, canvas.width, canvas.height            // Destino (todo el canvas)
      );
      console.log('✅ Región dibujada en canvas exitosamente');
    } catch (drawError) {
      console.error('❌ Error dibujando en canvas:', drawError);
      acadelError("Error en captura", "No se pudo dibujar la región seleccionada");
      return;
    }

    // ============================================
    // PASO 6: VALIDACIÓN DE CONTENIDO
    // ============================================
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    let hasNonWhiteContent = false;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Si encontramos un píxel que no sea blanco puro y tenga alpha > 0
      if (a > 0 && !(r === 255 && g === 255 && b === 255)) {
        hasNonWhiteContent = true;
        break;
      }
    }

    if (!hasNonWhiteContent) {
      acadelWarning("Región posiblemente vacía", "La región seleccionada parece contener solo fondo blanco. Aún así se procesará.");
    }

    // ============================================
    // PASO 7: CONVERSIÓN A BASE64
    // ============================================
    
    const base64Image = canvas.toDataURL('image/png', 0.9);
    if (!base64Image || base64Image === 'data:,' || base64Image.length < 1000) {
      acadelError("No pudo crear imagen", "Error generando la captura. La imagen está vacía o corrupta");
      return;
    }

    console.log('✅ Imagen generada:', `${Math.round(base64Image.length/1024)}KB`);

    // ============================================
    // PASO 8: PREPARACIÓN DEL PROMPT
    // ============================================
    
    const currentPage = getPDFState('currentPage');
    let prompt = `Región seleccionada de la página ${currentPage} del PDF`;
    
    if (promptType === 'analyze') {
      prompt = `Analiza profundamente el contenido de esta imagen capturada de la página ${currentPage} del PDF. Explica detalladamente los conceptos, metodologías y principios subyacentes.`;
    } else if (promptType === 'extract') {
      prompt = `Genera un informe completo basado en la información visible en esta imagen de la página ${currentPage} del PDF. Incluye resumen ejecutivo, análisis detallado, interpretación y conclusiones.`;
    }

    // ============================================
    // PASO 9: PREVIEW COMPLETO - MINIATURA OCUPA TODO EL ESPACIO
    // ============================================

    const byteString = atob(base64Image.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: 'image/png' });
    const file = new File([blob], 'captura-pdf.png', { type: 'image/png' });

    console.log('📤 Configurando imagen para envío automático...');

    // ⭐ SISTEMA DE ARCHIVOS TEMPORALES ⭐
    window.temporaryWelcomeFiles = [{
      type: 'image',
      file: file,
      data: { base64: base64Image }
    }];

    // ⭐ CREAR PREVIEW CON IMAGEN COMPLETA DE FONDO ⭐
    const previewContainer = document.querySelector('.file-preview-container');
    if (previewContainer) {
      const fileId = `file-${Date.now()}`;
      
      // ⭐ ESTRUCTURA COMPLETAMENTE NUEVA - IMAGEN COMO FONDO COMPLETO ⭐
      const previewDiv = document.createElement('div');
      previewDiv.className = 'file-preview full-image-preview captured-region-preview';
      previewDiv.setAttribute('data-file-id', fileId);
      previewDiv.setAttribute('data-file-type', 'image');
      previewDiv.setAttribute('data-image-src', base64Image);

      // ⭐ HTML CON IMAGEN DE FONDO COMPLETA ⭐
      previewDiv.innerHTML = `
        <div class="full-image-background" style="background-image: url('${base64Image}')"></div>
        <div class="image-preview-overlay">
          <div class="preview-info">
            <div class="preview-icon">
              <i class='bx bx-image'></i>
            </div>
            <div class="preview-details">
              <div class="preview-name">${file.name}</div>
              <div class="preview-meta">${(file.size / 1024).toFixed(1)} KB • Página ${currentPage}</div>
            </div>
          </div>
          <button class="file-preview-remove" data-file-id="${fileId}" title="Eliminar archivo">
            <i class='bx bx-x'></i>
          </button>
        </div>
      `;

      // ⭐ INSERTAR EN DOM ⭐
      previewContainer.appendChild(previewDiv);

      // ⭐ CONFIGURAR CLICK PARA MODAL ⭐
      previewDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.file-preview-remove')) {
          let modal = document.getElementById('preview-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'preview-modal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
              <div class="preview-modal-content">
                <div class="preview-title">
                  <i class="bx bx-image"></i>
                  <span>${file.name}</span>
                  <button onclick="this.closest('.preview-modal').classList.remove('show')" class="preview-close-btn">
                    <i class="bx bx-x"></i>
                  </button>
                </div>
                <div class="preview-body image-preview">
                  <div class="image-container">
                    <img src="${base64Image}" alt="${file.name}" class="image-preview-img" />
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(modal);
          } else {
            modal.querySelector('.preview-title span').textContent = file.name;
            modal.querySelector('.preview-body').innerHTML = `
              <div class="image-container">
                <img src="${base64Image}" alt="${file.name}" class="image-preview-img" />
              </div>
            `;
          }
          modal.classList.add('show');
        }
      });
      
      // ⭐ EFECTO VISUAL DE APARICIÓN ⭐
      setTimeout(() => {
        previewDiv.classList.add('newly-captured');
        
        setTimeout(() => {
          previewDiv.classList.remove('newly-captured');
        }, 2000);
      }, 100);
    }

    // ⭐ CONFIGURAR TEXTAREA ⭐
    const textarea = document.getElementById('messageInput');
    if (textarea) {
      textarea.value = prompt;
      textarea.focus();
    }

    // ⭐ ENVÍO AUTOMÁTICO SIMPLE ⭐
    setTimeout(() => {
      console.log('🚀 Iniciando envío automático...');
      
      if (typeof window.handleSendMessage === 'function') {
        window.handleSendMessage();
        console.log('✅ Envío automático via handleSendMessage');
      } else {
        console.warn('⚠️ handleSendMessage no encontrada');
        showTemporaryMessage('Imagen lista. Presiona Enter para enviar.', false);
      }
    }, 500);

    showTemporaryMessage('¡Imagen capturada! Enviando automáticamente...');
    console.log('📤 Sistema configurado para envío automático');

    return base64Image;

  } catch (error) {
    console.error('❌ Error en captura:', error);
    showTemporaryMessage(`Error: ${error.message}`, true);
    throw error;
    
  } finally {
    // ============================================
    // LIMPIEZA FINAL
    // ============================================
    if (canvas) {
      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 1;
        canvas.height = 1;
        canvas = null;
      } catch (cleanupError) {
        console.warn('⚠️ Error limpiando canvas:', cleanupError);
      }
    }
  }
}

/**
 * Extrae el texto de la región seleccionada
 * @param {Object} region - Región para extraer texto (opcional)
 */
async function extractRegionText(region = null) {
  try {
    const targetRegion = region || selectorState.currentRegion;
    if (!targetRegion) {
      throw new Error('No hay región seleccionada para extraer texto');
    }

    showTemporaryMessage('Preparando extracción de texto...', false, true);
    await captureRegionAsImage(targetRegion, 'extract');

  } catch (error) {
    console.error('❌ Error al extraer texto:', error);
    showTemporaryMessage('Acadel no pudo extraer el texto de esa región', true);
  }
}


/**
 * Analiza el contenido de la región seleccionada
 * @param {Object} region - Región para analizar (opcional)
 */
async function analyzeRegionContent(region = null) {
  try {
    const targetRegion = region || selectorState.currentRegion;
    if (!targetRegion) {
      throw new Error('No hay región seleccionada para analizar');
    }

    showTemporaryMessage('Preparando análisis de región...', false, true);
    await captureRegionAsImage(targetRegion, 'analyze');

  } catch (error) {
    console.error('❌ Error al analizar región:', error);
    showTemporaryMessage('Acadel no pudo analizar esa parte del PDF', true);
  }
}

/**
 * Muestra un mensaje temporal
 * @param {string} message - Mensaje a mostrar
 * @param {boolean} isError - Si es un mensaje de error
 * @param {boolean} isLoading - Si es un indicador de carga
 */
function showTemporaryMessage(message, isError = false, isLoading = false) {
  let messageElement = document.querySelector('.temporary-message');

  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.className = 'temporary-message';
    document.body.appendChild(messageElement);
  }

  let content = message;

  if (isLoading) {
    content = `<div class="temp-message-loader"></div> ${message}`;
  } else if (isError) {
    content = `<i class='bx bx-error-circle'></i> ${message}`;
  } else {
    content = `<i class='bx bx-check-circle'></i> ${message}`;
  }

  messageElement.innerHTML = content;
  messageElement.classList.toggle('error', isError);
  messageElement.classList.toggle('loading', isLoading);
  messageElement.classList.add('active');

  // No ocultar automáticamente si está cargando
  if (!isLoading) {
    setTimeout(() => {
      messageElement.classList.remove('active', 'loading');
    }, 3000);
  }

  return messageElement;
}

export default {
  initRegionSelector
};