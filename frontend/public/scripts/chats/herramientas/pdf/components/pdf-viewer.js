/**
 * pdf-viewer.js - Componente para visualizar el PDF original
 * Maneja la renderización de las páginas del PDF.
 */

import { getPDFState, cacheThumbnail } from '../services/pdf-state.js';
import { getPDFPreview, getPDFDownloadUrl } from '../services/pdf-api.js';

// Referencias DOM
let container;
let pdfImageElement;
let zoomControls;
let downloadButton;
let pageNavigator;
const zoomChangeCallbacks = [];

// Estado local
const viewerState = {
  currentZoom: 1,
  isFullscreen: false,
  pageUrls: {}, // Cache de URLs de imágenes por página
  isInitialized: false
};

/**
 * Permite a otros módulos suscribirse a cambios de zoom
 * @param {Function} callback - Función a llamar cuando cambia el zoom
 */
export function subscribeToZoomChanges(callback) {
  if (typeof callback === 'function' && !zoomChangeCallbacks.includes(callback)) {
    zoomChangeCallbacks.push(callback);
    console.log(`Suscrito a cambios de zoom: ${zoomChangeCallbacks.length} suscriptores`);
  }
}

/**
 * Función para notificar cambios de zoom a los suscriptores
 * @param {number} newZoom - Nuevo nivel de zoom
 */
function notifyZoomChange(newZoom) {
  zoomChangeCallbacks.forEach(callback => {
    try {
      callback(newZoom);
    } catch (error) {
      console.error('Error en callback de zoom:', error);
    }
  });
}

/**
 * Inicializa el visor de PDF
 * @param {HTMLElement} containerElement - Elemento contenedor
 */
export function initPDFViewer(containerElement) {
  if (!containerElement) {
    console.error('No se proporcionó un contenedor para el visor de PDF');
    return;
  }

  container = containerElement;
  
  createViewerElements();
  attachEventListeners();
  enableImageDragging();
  setupThumbnailsResponsiveness();
  
  viewerState.isInitialized = true;
}

/**
 * Añade la funcionalidad de arrastre a la imagen del PDF
 * Esta función debe añadirse al archivo pdf-viewer.js
 */
function enableImageDragging() {
  const imageContainer = document.querySelector('.pdf-image-container');
  const pdfImage = document.querySelector('.pdf-image');
  
  if (!imageContainer || !pdfImage) return;
  
  let isDragging = false;
  let startX, startY;
  let scrollLeft, scrollTop;
  
  const handleMouseDown = (e) => {
    if (imageContainer.closest('.region-selecting')) {
      return; // No activar arrastre en modo selección
    }
    
    if (viewerState.currentZoom <= 1) return;
    
    isDragging = true;
    imageContainer.classList.add('grabbing');
    startX = e.pageX - imageContainer.offsetLeft;
    startY = e.pageY - imageContainer.offsetTop;
    scrollLeft = imageContainer.scrollLeft;
    scrollTop = imageContainer.scrollTop;
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const x = e.pageX - imageContainer.offsetLeft;
    const y = e.pageY - imageContainer.offsetTop;
    
    const moveX = (x - startX) * -1;
    const moveY = (y - startY) * -1;
    
    imageContainer.scrollLeft = scrollLeft + moveX;
    imageContainer.scrollTop = scrollTop + moveY;
  };
  
  const handleMouseUp = () => {
    isDragging = false;
    imageContainer.classList.remove('grabbing');
  };
  
  imageContainer.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  
  // También desactivar el comportamiento de arrastre estándar de la imagen
  pdfImage.addEventListener('dragstart', (e) => e.preventDefault());
}

/**
 * Crea los elementos DOM del visor
 */
function createViewerElements() {
  container.innerHTML = `
    <div class="pdf-viewer-toolbar">
      <div class="pdf-viewer-zoom-controls">
        <button class="pdf-zoom-out" title="Reducir">
          <i class='bx bx-zoom-out'></i>
        </button>
        <span class="pdf-zoom-level">100%</span>
        <button class="pdf-zoom-in" title="Ampliar">
          <i class='bx bx-zoom-in'></i>
        </button>
        <button class="pdf-zoom-reset" title="Restablecer zoom">
          <i class='bx bx-reset'></i>
        </button>
      </div>
      <div class="pdf-viewer-actions">
        <button class="pdf-download" title="Descargar PDF">
          <i class='bx bx-download'></i>
        </button>
      </div>
    </div>
    <div class="pdf-viewer-content">
      <div class="pdf-image-container">
        <img class="pdf-image" alt="Página PDF" />
      </div>
    </div>
    <div class="pdf-viewer-pages-navigator">
      <div class="pdf-thumbnails-container"></div>
    </div>
  `;
  
  pdfImageElement = container.querySelector('.pdf-image');
  zoomControls = container.querySelector('.pdf-viewer-zoom-controls');
  downloadButton = container.querySelector('.pdf-download');
  pageNavigator = container.querySelector('.pdf-viewer-pages-navigator');
}

/**
 * Agrega event listeners a los controles
 */
function attachEventListeners() {
  // Zoom
  container.querySelector('.pdf-zoom-in').addEventListener('click', () => {
    updateZoom(viewerState.currentZoom + 0.25);
  });
  
  container.querySelector('.pdf-zoom-out').addEventListener('click', () => {
    updateZoom(Math.max(0.5, viewerState.currentZoom - 0.25));
  });
  
  container.querySelector('.pdf-zoom-reset').addEventListener('click', () => {
    updateZoom(1);
  });
  
  // Descarga
  downloadButton.addEventListener('click', handleDownload);
  
  pdfImageElement.addEventListener('wheel', handleZoomGesture, { 
    passive: false // Necesario para preventDefault en zoom
  });
  
  pdfImageElement.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (viewerState.currentZoom > 1) {
      updateZoom(1); // Reset al zoom normal
    } else {
      updateZoom(2); // Zoom in al doble
    }
  });
}


/**
 * Versión mínima modificada de updateZoom que permite scroll hacia la izquierda
 */
function updateZoom(newZoom) {
  // Limitar zoom entre 0.5 y 3
  newZoom = Math.max(0.5, Math.min(3, newZoom));
  
  viewerState.currentZoom = newZoom;
  
  const imageContainer = container.querySelector('.pdf-image-container');
  const scrollFractionX = imageContainer.scrollWidth > 0 ? 
    imageContainer.scrollLeft / imageContainer.scrollWidth : 0;
  const scrollFractionY = imageContainer.scrollHeight > 0 ? 
    imageContainer.scrollTop / imageContainer.scrollHeight : 0;
  
  pdfImageElement.style.transform = `scale(${newZoom})`;
  container.querySelector('.pdf-zoom-level').textContent = `${Math.round(newZoom * 100)}%`;
  
  imageContainer.classList.remove('zoomed-in', 'zoomed-out');
  
  if (newZoom > 1) {
    imageContainer.classList.add('zoomed-in');
    
    // Importante: ajustar las dimensiones del contenedor para permitir scroll
    const imgWidth = pdfImageElement.offsetWidth;
    const imgHeight = pdfImageElement.offsetHeight;
    
    pdfImageElement.style.width = `${imgWidth}px`;
    pdfImageElement.style.height = `${imgHeight}px`;
    
    // CAMBIO CLAVE: Mantener transformOrigin en 'top left'
    pdfImageElement.style.transformOrigin = 'top left';
    
    // NUEVO: Calcular espacio extra necesario
    const extraWidth = imgWidth * (newZoom - 1);
    const extraHeight = imgHeight * (newZoom - 1);
    
    // CAMBIO CLAVE: Añadir marginLeft para permitir scroll hacia la izquierda
    // Tomamos una porción del espacio extra (ej. 70%) para permitir movimiento a la izquierda
    const leftMargin = extraWidth * 0.7; // 70% del espacio extra
    const rightMargin = extraWidth * 0.7; // 70% restante para la derecha
    
    pdfImageElement.style.marginLeft = `${leftMargin}px`;
    pdfImageElement.style.marginRight = `${rightMargin}px`;
    pdfImageElement.style.marginBottom = `${extraHeight}px`;
    
    // NUEVO: Asegurar que la posición inicial acomoda el nuevo margen izquierdo
    setTimeout(() => {
      if (imageContainer.scrollWidth > 0 && imageContainer.scrollHeight > 0) {
        // Ajustar la posición de scroll considerando el nuevo margen izquierdo
        imageContainer.scrollLeft = (imageContainer.scrollWidth * scrollFractionX) + (leftMargin * scrollFractionX);
        imageContainer.scrollTop = imageContainer.scrollHeight * scrollFractionY;
      }
    }, 0);
    
  } else if (newZoom < 1) {
    imageContainer.classList.add('zoomed-out');
    // Restablecer todos los márgenes cuando el zoom es menor que 1
    pdfImageElement.style.marginLeft = '0';
    pdfImageElement.style.marginRight = '0';
    pdfImageElement.style.marginBottom = '0';
  } else {
    // Zoom exactamente 1, restablecer todo
    pdfImageElement.style.width = '';
    pdfImageElement.style.height = '';
    pdfImageElement.style.marginLeft = '0';
    pdfImageElement.style.marginRight = '0';
    pdfImageElement.style.marginBottom = '0';
  }
  
  notifyZoomChange(newZoom);
}

/**
 * Devuelve el zoom actual
 * @returns {number} Nivel de zoom actual
 */
export function getCurrentZoom() {
  return viewerState.currentZoom;
}

/**
 * Maneja la descarga del PDF
 */
function handleDownload() {
  const downloadUrl = getPDFDownloadUrl({
    pdfId: getPDFState('currentPDFId')
  });
  
  if (!downloadUrl) {
  acadelError("No se puede descargar", "Acadel no puede generar el enlace de descarga. Intenta recargar la página");
  return;
}
  
  const tempLink = document.createElement('a');
  tempLink.href = downloadUrl;
  tempLink.setAttribute('download', getPDFState('pdfInfo')?.originalName || 'documento.pdf');
  tempLink.setAttribute('target', '_blank');
  tempLink.style.display = 'none';
  document.body.appendChild(tempLink);
  
  // Simular clic
  tempLink.click();
  
  setTimeout(() => {
    document.body.removeChild(tempLink);
  }, 100);
}

/**
 * Maneja los gestos de zoom con la rueda del ratón
 * @param {WheelEvent} e - Evento de rueda
 */
function handleZoomGesture(e) {
  if (e.ctrlKey) {
    // Prevenir el default solo cuando vamos a hacer zoom
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY || e.detail || e.wheelDelta;
    
    if (delta > 0) {
      // Zoom out
      updateZoom(Math.max(0.5, viewerState.currentZoom - 0.1));
    } else {
      // Zoom in
      updateZoom(Math.min(3, viewerState.currentZoom + 0.1));
    }
  }
  // Si no hay Ctrl presionado, dejar que el evento se propague normalmente (scroll)
}

/**
 * Alternativa con detección más robusta de necesidad de preventDefault
 * Esta función puede reemplazar a handleZoomGesture si se prefiere mayor control
 */
function handleZoomGestureRobust(e) {
  const shouldZoom = e.ctrlKey || e.metaKey; // Ctrl en Windows/Linux, Cmd en Mac
  
  if (shouldZoom) {
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (err) {
      console.warn('No se pudo prevenir el evento wheel:', err);
      return; // Salir si no podemos controlar el evento
    }
    
    let delta = 0;
    if (e.deltaY !== undefined) {
      delta = e.deltaY;
    } else if (e.detail !== undefined) {
      delta = e.detail * 40; // Firefox
    } else if (e.wheelDelta !== undefined) {
      delta = -e.wheelDelta; // IE/Edge/Safari
    }
    
    const zoomFactor = 0.1;
    const newZoom = delta > 0 
      ? Math.max(0.5, viewerState.currentZoom - zoomFactor)
      : Math.min(3, viewerState.currentZoom + zoomFactor);
    
    updateZoom(newZoom);
  }
  // Si no hay tecla modificadora, permitir scroll normal sin interferir
}

/**
 * Renderiza una página del PDF
 * @param {string} imageUrl - URL de la imagen de la página
 * @param {number} pageNumber - Número de página
 */
export function renderPDFPage(imageUrl, pageNumber) {
  if (!pdfImageElement) return;
  
  viewerState.pageUrls[pageNumber] = imageUrl;
  
  pdfImageElement.onload = () => {
    const aspectRatio = pdfImageElement.naturalWidth / pdfImageElement.naturalHeight;
    container.style.setProperty('--pdf-aspect-ratio', aspectRatio);
    
    cacheThumbnail(pageNumber, imageUrl);
  };
  
  pdfImageElement.src = imageUrl;
  pdfImageElement.setAttribute('data-page', pageNumber);
  
  updateZoom(1);
  
  updateThumbnails();
}

/**
 * Actualiza las miniaturas de navegación
 */
async function updateThumbnails() {
  const currentPage = getPDFState('currentPage');
  const totalPages = getPDFState('totalPages');
  const viewMode = getPDFState('viewMode');
  
  if (totalPages <= 1) {
    pageNavigator.style.display = 'none';
    return;
  }
  
  pageNavigator.style.display = 'block';
  
  const thumbnailsContainer = container.querySelector('.pdf-thumbnails-container');
  thumbnailsContainer.innerHTML = '';
  
  const containerWidth = thumbnailsContainer.offsetWidth || 
                         thumbnailsContainer.clientWidth || 
                         thumbnailsContainer.getBoundingClientRect().width;
  
  // Estimar cuántas miniaturas caben (basado en los 70px de tu CSS + margen)
  const thumbnailTotalWidth = 82; // 70px + 12px de gap
  let maxThumbnails = Math.floor(containerWidth / thumbnailTotalWidth);
  
  // CAMBIO PRINCIPAL: Adaptar según el modo de visualización con mínimo garantizado
  if (viewMode === 'split') {
    // FIJO: En modo dividido, MÍNIMO 4 thumbnails, máximo 8
    maxThumbnails = Math.max(4, Math.min(maxThumbnails, 8));
  } else {
    // En modo completo permitimos más
    maxThumbnails = Math.min(maxThumbnails, 12);
    // FIJO: Corregir el Math.max sin parámetros
    maxThumbnails = Math.max(3, maxThumbnails); // Mínimo 3 en otros modos
  }
  
  // Limitar al número total de páginas
  maxThumbnails = Math.min(maxThumbnails, totalPages);
  
  // NUEVA LÓGICA: Simplificada para garantizar el mínimo en split
  let pagesToShow = [];
  
  if (viewMode === 'split' && totalPages >= 4) {
    
    // Estrategia: página actual + 3 páginas inteligentemente distribuidas
    pagesToShow.push(currentPage); // Siempre incluir la página actual
    
    // Página anterior (si existe)
    if (currentPage > 1) {
      pagesToShow.push(currentPage - 1);
    }
    
    // Página siguiente (si existe) 
    if (currentPage < totalPages) {
      pagesToShow.push(currentPage + 1);
    }
    
    const needed = maxThumbnails - pagesToShow.length;
    
    for (let i = 2; i <= needed && pagesToShow.length < maxThumbnails; i++) {
      // Página anterior más lejana
      if (currentPage - i >= 1 && !pagesToShow.includes(currentPage - i)) {
        pagesToShow.push(currentPage - i);
      }
      // Página siguiente más lejana
      if (currentPage + i <= totalPages && !pagesToShow.includes(currentPage + i) && pagesToShow.length < maxThumbnails) {
        pagesToShow.push(currentPage + i);
      }
    }
    
    // Si aún necesitamos más páginas, agregar desde el inicio o final
    if (pagesToShow.length < 4) {
      for (let i = 1; i <= totalPages && pagesToShow.length < 4; i++) {
        if (!pagesToShow.includes(i)) {
          pagesToShow.push(i);
        }
      }
    }
    
    // Si TODAVÍA no tenemos 4 (caso extremo), agregar las primeras páginas
    if (pagesToShow.length < 4) {
      for (let i = 1; i <= Math.min(4, totalPages); i++) {
        if (!pagesToShow.includes(i)) {
          pagesToShow.push(i);
        }
      }
    }
    
  } else {
    
    // Siempre incluir la primera página
    pagesToShow.push(1);
    
    // Siempre incluir la última página si hay más de una
    if (totalPages > 1) {
      pagesToShow.push(totalPages);
    }
    
    if (currentPage > 1 && currentPage < totalPages) {
      pagesToShow.push(currentPage);
    }
    
    const remainingSlots = maxThumbnails - pagesToShow.length;
    
    if (remainingSlots > 0) {
      // Distribuir las miniaturas alrededor de la página actual
      let before = Math.floor(remainingSlots / 2);
      let after = remainingSlots - before;
      
      // Ajustar si estamos cerca del inicio o fin
      if (currentPage - before < 2) {
        after += (before - (currentPage - 2));
        before = currentPage - 2;
        if (before < 0) before = 0;
      }
      
      if (currentPage + after > totalPages - 1) {
        before += (after - (totalPages - 1 - currentPage));
        after = totalPages - 1 - currentPage;
        if (after < 0) after = 0;
      }
      
      for (let i = 1; i <= before; i++) {
        const pageNum = currentPage - i;
        if (pageNum > 1 && !pagesToShow.includes(pageNum)) {
          pagesToShow.push(pageNum);
        }
      }
      
      for (let i = 1; i <= after; i++) {
        const pageNum = currentPage + i;
        if (pageNum < totalPages && !pagesToShow.includes(pageNum)) {
          pagesToShow.push(pageNum);
        }
      }
      
      // Si todavía quedan espacios, llenar con páginas secuenciales
      let additionalPages = 2;
      while (pagesToShow.length < maxThumbnails && additionalPages < totalPages) {
        if (!pagesToShow.includes(additionalPages)) {
          pagesToShow.push(additionalPages);
        }
        additionalPages++;
      }
    }
  }
  
  pagesToShow = [...new Set(pagesToShow)].sort((a, b) => a - b);
  
  // GARANTÍA FINAL para modo split: Si no tenemos 4 páginas y hay suficientes páginas totales
  if (viewMode === 'split' && pagesToShow.length < 4 && totalPages >= 4) {
    console.warn(`Split mode: Solo ${pagesToShow.length} thumbnails, forzando a 4`);
    
    // Forzar las primeras 4 páginas como último recurso
    pagesToShow = [1, 2, 3, 4].filter(page => page <= totalPages);
    
    // Si la página actual no está, reemplazar la última con la actual
    if (!pagesToShow.includes(currentPage) && currentPage <= totalPages) {
      pagesToShow[pagesToShow.length - 1] = currentPage;
      pagesToShow.sort((a, b) => a - b);
    }
  }
  
  // Debug para verificar
  if (viewMode === 'split') {
    console.log(`Split mode: Mostrando ${pagesToShow.length} thumbnails para página ${currentPage}/${totalPages}:`, pagesToShow);
  }
  
  for (const pageNum of pagesToShow) {
    const thumbnailElement = document.createElement('div');
    thumbnailElement.className = `pdf-thumbnail${pageNum === currentPage ? ' active' : ''}`;
    thumbnailElement.setAttribute('data-page', pageNum);
    thumbnailElement.title = `Página ${pageNum}`;
    
    thumbnailElement.innerHTML = `
      <div class="pdf-thumbnail-loader"></div>
      <span class="pdf-thumbnail-page-num">${pageNum}</span>
    `;
    
    const thumbnails = getPDFState('thumbnails');
    
    if (thumbnails[pageNum]) {
      addThumbnailImage(thumbnailElement, thumbnails[pageNum]);
    } else if (viewerState.pageUrls[pageNum]) {
      addThumbnailImage(thumbnailElement, viewerState.pageUrls[pageNum]);
    } else {
      loadThumbnail(thumbnailElement, pageNum);
    }
    
    thumbnailElement.addEventListener('click', () => {
      import('../services/pdf-state.js').then(module => {
        if (module.setCurrentPage) {
          module.setCurrentPage(pageNum);
        }
      });
    });
    
    thumbnailsContainer.appendChild(thumbnailElement);
  }
}

/**
 * Añade listener para actualizar miniaturas cuando cambia el tamaño de ventana
 * y cuando cambia el modo de visualización
 */
function setupThumbnailsResponsiveness() {
  // Debounce para evitar actualizaciones demasiado frecuentes
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateThumbnails();
    }, 200);
  });
  
  // También necesitamos actualizar cuando cambie el modo de visualización
  import('../services/pdf-state.js').then(module => {
    if (module.on) {
      module.on('onViewModeChanged', () => {
        // Dar tiempo para que el CSS se aplique
        setTimeout(updateThumbnails, 10);
      });
    }
  });
}

/**
 * Agrega una imagen miniatura al elemento contenedor
 * @param {HTMLElement} container - Elemento contenedor
 * @param {string} imageUrl - URL de la imagen
 */
function addThumbnailImage(container, imageUrl) {
  const loader = container.querySelector('.pdf-thumbnail-loader');
  
  const img = document.createElement('img');
  img.className = 'pdf-thumbnail-img';
  img.alt = 'Miniatura de página';
  img.onload = () => {
    if (loader) loader.style.display = 'none';
  };
  img.onerror = () => {
    if (loader) loader.style.display = 'none';
  };
  img.src = imageUrl;
  
  container.appendChild(img);
}

/**
 * Carga una miniatura para una página específica
 * @param {HTMLElement} container - Elemento contenedor
 * @param {number} pageNum - Número de página
 */
async function loadThumbnail(container, pageNum) {
  try {
    const imageUrl = await getPDFPreview({
      page: pageNum,
      width: 120,
      pdfId: getPDFState('currentPDFId')
    });
    
    addThumbnailImage(container, imageUrl);
    
    cacheThumbnail(pageNum, imageUrl);
  } catch (error) {
    console.error(`Error cargando miniatura para página ${pageNum}:`, error);
    container.querySelector('.pdf-thumbnail-loader').innerHTML = '<i class="bx bx-error"></i>';
  }
}

export default {
  initPDFViewer,
  renderPDFPage,
  getCurrentZoom,
  subscribeToZoomChanges
};