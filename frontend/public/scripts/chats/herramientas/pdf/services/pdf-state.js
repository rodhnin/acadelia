/**
 * pdf-state.js - Gestión de estado para PDFs
 * Mejorado con notificaciones Acadel cuando son necesarias para el usuario
 */

import { hasPDF } from './pdf-api.js';
import { getState } from '../core/state-pdf.js';

// Estado interno del módulo
const pdfState = {
  hasPDF: false,
  loading: false,
  currentPDFId: null,
  currentPage: 1,
  totalPages: 0,
  pdfInfo: null,
  viewMode: 'split', // 'pdf', 'markdown', 'split'
  showPanel: false,
  selectedRegion: null,
  thumbnails: {},  // Cache de miniaturas {pageNum: url}
  lastCheck: 0, // Timestamp del último check de PDF
  extractedText: null, // Texto extraído en caché
  pageContents: {}, // Contenido por página {pageNum: text}
  processingQueue: [], // Cola para procesamiento en segundo plano
};

// Callbacks para eventos
const eventCallbacks = {
  onPDFLoaded: [],
  onPDFRemoved: [],
  onPageChanged: [],
  onViewModeChanged: [],
  onPanelToggled: [],
  onRegionSelected: [],
};

/**
 * Registra un callback para un evento específico
 * @param {string} eventName - Nombre del evento
 * @param {Function} callback - Función a ejecutar
 * @returns {Function} - Función para eliminar el callback
 */
export function on(eventName, callback) {
  if (!eventCallbacks[eventName]) {
    // Error silencioso para desarrolladores, no molesta al usuario
    return () => {};
  }
  
  eventCallbacks[eventName].push(callback);
  
  return () => {
    const index = eventCallbacks[eventName].indexOf(callback);
    if (index !== -1) {
      eventCallbacks[eventName].splice(index, 1);
    }
  };
}

/**
 * Dispara un evento específico con datos
 * @param {string} eventName - Nombre del evento
 * @param {any} data - Datos a enviar a los callbacks
 */
function triggerEvent(eventName, data) {
  if (!eventCallbacks[eventName]) {
    return;
  }
  
  eventCallbacks[eventName].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      // Error silencioso para no molestar al usuario
      console.error(`Error en callback de ${eventName}:`, error);
    }
  });
}

/**
 * Verifica si el chat actual tiene un PDF asociado
 * @param {boolean} forceCheck - Forzar verificación aunque se haya verificado recientemente
 * @returns {Promise<boolean>} - true si tiene PDF, false si no
 */
export async function checkPDF(forceCheck = false) {
  const chatId = getState('currentChatId');
  
  // Si no hay chatId, no tiene PDF
  if (!chatId) {
    updatePDFState({
      hasPDF: false,
      pdfInfo: null,
      currentPDFId: null
    });
    return false;
  }
  
  const now = Date.now();
  const timeSinceLastCheck = now - pdfState.lastCheck;
  
  // Si se fuerza la verificación o ha pasado suficiente tiempo, o si acabamos de cambiar de chat
  if (forceCheck || timeSinceLastCheck > 3000 || pdfState.lastChatId !== chatId) {
    pdfState.lastChatId = chatId;
    
    try {
      const result = await hasPDF(chatId);
      
      updatePDFState({
        hasPDF: result.hasPDF,
        pdfInfo: result.pdfInfo,
        currentPDFId: result.pdfInfo?.pdfId || null,
        totalPages: result.pdfInfo?.pageCount || 0,
        lastCheck: now
      });
      
      // Si pasamos de no tener PDF a tener uno, disparar evento
      if (!pdfState.hasPDF && result.hasPDF) {
        triggerEvent('onPDFLoaded', result.pdfInfo);
      }
      
      return result.hasPDF;
    } catch (error) {
      if (forceCheck && timeSinceLastCheck > 10000) {
        acadelWarning("Problema verificando PDF", "Acadel tiene dificultades accediendo a tu documento. Intenta recargar la página");
      }
      return pdfState.hasPDF;
    }
  } else {
    return pdfState.hasPDF;
  }
}

/**
 * Actualiza el estado del PDF
 * @param {Object} newState - Nuevos valores para el estado
 */
export function updatePDFState(newState) {
  const oldState = { ...pdfState };
  
  Object.assign(pdfState, newState);
  
  if (oldState.currentPage !== pdfState.currentPage && 'currentPage' in newState) {
    triggerEvent('onPageChanged', pdfState.currentPage);
  }
  
  if (oldState.viewMode !== pdfState.viewMode && 'viewMode' in newState) {
    triggerEvent('onViewModeChanged', pdfState.viewMode);
  }
  
  if (oldState.showPanel !== pdfState.showPanel && 'showPanel' in newState) {
    triggerEvent('onPanelToggled', pdfState.showPanel);
  }
  
  if (oldState.selectedRegion !== pdfState.selectedRegion && 'selectedRegion' in newState) {
    triggerEvent('onRegionSelected', pdfState.selectedRegion);
  }
  
  if (oldState.hasPDF && !pdfState.hasPDF && 'hasPDF' in newState) {
    triggerEvent('onPDFRemoved', oldState.pdfInfo);
  }
}

/**
 * Obtiene un valor específico del estado del PDF
 * @param {string} property - Propiedad a obtener
 * @returns {any} - Valor de la propiedad
 */
export function getPDFState(property) {
  return property ? pdfState[property] : { ...pdfState };
}

/**
 * Establece una página específica
 * @param {number} pageNum - Número de página
 */
export function setCurrentPage(pageNum) {
  if (pageNum < 1 || pageNum > pdfState.totalPages) {
    if (pageNum < 1 || pageNum > pdfState.totalPages + 10) {
      acadelWarning("Página no disponible", `Acadel solo puede mostrar páginas del 1 al ${pdfState.totalPages}`);
    }
    return;
  }
  
  updatePDFState({ currentPage: pageNum });
}

/**
 * Establece el modo de visualización
 * @param {string} mode - Modo de visualización ('pdf', 'markdown', 'split')
 */
export function setViewMode(mode) {
  if (!['pdf', 'markdown', 'split'].includes(mode)) {
    // Error silencioso, es un problema de desarrollo
    return;
  }
  
  updatePDFState({ viewMode: mode });
  
  // Notificación sutil del cambio de vista (solo si es relevante para el usuario)
  const modeNames = {
    'pdf': 'vista PDF',
    'markdown': 'vista texto',
    'split': 'vista dividida'
  };
  
  if (mode === 'split') {
    acadelInfo("Vista optimizada", "Acadel activó la vista dividida para que veas el PDF y el texto al mismo tiempo");
  }
}

/**
 * Muestra u oculta el panel de PDF
 * @param {boolean} show - true para mostrar, false para ocultar
 */
export function togglePDFPanel(show = !pdfState.showPanel) {
  // Si el valor es el mismo, forzar actualización de todos modos
  if (show === pdfState.showPanel) {
    triggerEvent('onPanelToggled', show);
    return;
  }
  
  updatePDFState({ showPanel: show });
  
  // Notificación útil cuando se abre el panel por primera vez
  if (show && pdfState.hasPDF) {
    acadelExito("📖 Panel PDF abierto", "Acadel tiene tu documento listo para explorar");
  }
}

/**
 * Establece una región seleccionada
 * @param {Object|null} region - Datos de la región seleccionada
 */
export function setSelectedRegion(region) {
  updatePDFState({ selectedRegion: region });
  
  // Notificación cuando se selecciona una región por primera vez
  if (region && !pdfState.selectedRegion) {
    acadelInfo("Región seleccionada", "Acadel puede extraer el texto específico de esa área");
  }
}

/**
 * Guarda el contenido de una página en caché
 * @param {number} pageNum - Número de página
 * @param {string} content - Contenido de la página
 */
export function cachePageContent(pageNum, content) {
  const newPageContents = { ...pdfState.pageContents };
  newPageContents[pageNum] = content;
  
  updatePDFState({ pageContents: newPageContents });
}

/**
 * Guarda una miniatura en caché
 * @param {number} pageNum - Número de página
 * @param {string} url - URL de la miniatura
 */
export function cacheThumbnail(pageNum, url) {
  const newThumbnails = { ...pdfState.thumbnails };
  newThumbnails[pageNum] = url;
  
  updatePDFState({ thumbnails: newThumbnails });
}

/**
 * Marca que el PDF está cargando
 * @param {boolean} isLoading - true si está cargando, false si no
 */
export function setLoading(isLoading) {
  updatePDFState({ loading: isLoading });
  
  if (isLoading) {
    setTimeout(() => {
      if (pdfState.loading) {
        acadelLoading("Preparando documento", "Acadel está organizando tu PDF para una mejor experiencia");
      }
    }, 3000); // Esperar 3 segundos antes de mostrar notificación de carga
  }
}

/**
 * Inicia procesamiento de verificación del PDF
 * @returns {Promise<boolean>} Promesa que se resuelve con true si hay PDF, false si no
 */
export async function initPDFCheck() {
  const loadingIndicatorPresent = document.querySelector('.loading-overlay') !== null;
  
  // Reiniciar estado para el nuevo chat
  updatePDFState({
    hasPDF: false,
    loading: true,
    currentPage: 1,
    totalPages: 0,
    pdfInfo: null,
    currentPDFId: null,
    extractedText: null,
    pageContents: {},
    thumbnails: {},
    selectedRegion: null,
    showPanel: false // Siempre iniciar con el panel cerrado
  });
  
  return checkPDF(true).then(hasPDF => {
    setLoading(false);
    
    return import('../utils/pdf-button-controller.js').then(module => {
      if (typeof module.updatePDFButtonsVisibility === 'function') {
        module.updatePDFButtonsVisibility(hasPDF);
      }
      
      // Precargar datos si hay PDF, pero mantener panel cerrado
      if (hasPDF) {
        // Si hay un indicador de carga, ocultarlo
        if (loadingIndicatorPresent) {
          import('../ui/ui-manager-pdf.js').then(uiModule => {
            if (typeof uiModule.hideLoading === 'function') {
              uiModule.hideLoading();
            }
          });
        }
      } else {
        // No hay PDF, ocultar indicador de carga si existe
        if (loadingIndicatorPresent) {
          import('../ui/ui-manager-pdf.js').then(uiModule => {
            if (typeof uiModule.hideLoading === 'function') {
              uiModule.hideLoading();
            }
          });
        }
      }
      
      return hasPDF;
    });
  }).catch(error => {
    setLoading(false);
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      acadelWarning("Problema de conexión", "Acadel no puede verificar si hay documentos. Revisa tu conexión");
    }
    
    return false;
  });
}

/**
 * Verifica si se está mostrando el estado de bienvenida
 * @returns {boolean} True si estamos en la bienvenida (sin chat activo)
 */
export function isWelcomeState() {
  return !getState('currentChatId');
}

/**
 * Función de recuperación para forzar verificación de PDF
 * Útil si el panel deja de mostrarse después de varios cambios de chat
 */
export function forceCheckAndShowPanel() {
  // Reiniciar estado completamente
  updatePDFState({
    hasPDF: false,
    loading: false,
    pdfInfo: null,
    currentPDFId: null,
    lastCheck: 0,
    showPanel: false
  });
  
  setTimeout(async () => {
    const chatId = getState('currentChatId');
    if (!chatId) return;
    
    const hasPDFResult = await checkPDF(true);
    
    if (hasPDFResult) {
      togglePDFPanel(true);
      acadelExito("🔄 Panel restaurado", "Acadel ha reconectado con tu documento");
    } else {
      acadelInfo("Sin documentos", "Acadel no encuentra PDFs en este chat");
    }
  }, 500);
}

export default {
  on,
  checkPDF,
  updatePDFState,
  getPDFState,
  setCurrentPage,
  setViewMode,
  togglePDFPanel,
  setSelectedRegion,
  cachePageContent,
  cacheThumbnail,
  setLoading,
  initPDFCheck,
  isWelcomeState,
  forceCheckAndShowPanel
};