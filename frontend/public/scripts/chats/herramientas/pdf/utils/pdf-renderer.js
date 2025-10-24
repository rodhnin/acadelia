/**
 * pdf-renderer.js - Utilidades para renderizar PDFs con PDF.js
 * Con notificaciones Acadel solo cuando es crítico para el usuario
 */

import { getPDFPreview } from '../services/pdf-api.js';

// Para un manejo optimizado, mantenemos registro de las páginas cargadas
const loadedPages = {};
const pagePromises = {};

/**
 * Carga PDF.js dinámicamente si es necesario
 * @returns {Promise<Object>} - Biblioteca PDF.js
 */
export async function loadPDFJS() {
  // Si PDF.js ya está cargado globalmente
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  try {
    // Cargar de CDN
    const pdfjsScript = document.createElement('script');
    pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    pdfjsScript.async = true;
    
    // Esperar a que cargue
    await new Promise((resolve, reject) => {
      pdfjsScript.onload = resolve;
      pdfjsScript.onerror = reject;
      document.head.appendChild(pdfjsScript);
    });
    
    // Cargar worker
    const pdfjsWorker = document.createElement('script');
    pdfjsWorker.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    pdfjsWorker.async = true;
    
    await new Promise((resolve, reject) => {
      pdfjsWorker.onload = resolve;
      pdfjsWorker.onerror = reject;
      document.head.appendChild(pdfjsWorker);
    });
    
    return window.pdfjsLib;
  } catch (error) {
    // ÚNICA notificación necesaria: si no puede cargar PDF.js afecta completamente la experiencia
    acadelWarning(
      "Problema cargando visor PDF", 
      "Acadel no puede mostrar PDFs directamente. Verifica tu conexión y recarga la página"
    );
    throw new Error('No se pudo cargar PDF.js. Verifica tu conexión a internet.');
  }
}

/**
 * Obtiene una página de PDF como imagen utilizando la API del backend
 * @param {string} pdfId - ID del PDF
 * @param {number} pageNumber - Número de página
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string>} - URL de la imagen de la página
 */
export async function getPageAsImage(pdfId, pageNumber, options = {}) {
  // Clave única para esta combinación de PDF y página
  const cacheKey = `${pdfId}-${pageNumber}-${options.width || 'default'}`;
  
  // Si ya tenemos esta página en caché, devolver la promesa
  if (pagePromises[cacheKey]) {
    return pagePromises[cacheKey];
  }
  
  // Si ya la cargamos, devolver directamente
  if (loadedPages[cacheKey]) {
    return loadedPages[cacheKey];
  }
  
  // Crear nueva promesa para este pedido
  pagePromises[cacheKey] = getPDFPreview({
    pdfId: pdfId,
    page: pageNumber,
    ...options
  }).then(imageUrl => {
    // Guardar en caché cuando termine
    loadedPages[cacheKey] = imageUrl;
    delete pagePromises[cacheKey];
    return imageUrl;
  }).catch(error => {
    // Error silencioso - la API ya maneja las notificaciones de errores
    console.error(`Error cargando página ${pageNumber}:`, error);
    delete pagePromises[cacheKey];
    throw error;
  });
  
  return pagePromises[cacheKey];
}

/**
 * Precarga varias páginas para mejorar el rendimiento
 * @param {string} pdfId - ID del PDF
 * @param {Array<number>} pageNumbers - Números de página a precargar
 * @param {Object} options - Opciones adicionales
 */
export function preloadPages(pdfId, pageNumbers, options = {}) {
  // Por cada página, iniciar carga pero no esperar
  pageNumbers.forEach(pageNumber => {
    getPageAsImage(pdfId, pageNumber, options).catch(error => {
      // Error silencioso en precarga - no afecta la funcionalidad principal
      console.warn(`Error precargando página ${pageNumber}:`, error);
    });
  });
}

/**
 * Obtiene dimensiones de la página
 * @param {string} pdfId - ID del PDF
 * @param {number} pageNumber - Número de página
 * @returns {Promise<Object>} - Dimensiones {width, height, aspectRatio}
 */
export async function getPageDimensions(pdfId, pageNumber) {
  try {
    // Cargar la imagen de la página
    const imageUrl = await getPageAsImage(pdfId, pageNumber);
    
    // Crear imagen temporal para obtener dimensiones
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };
        resolve(dimensions);
      };
      
      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen para obtener dimensiones'));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    // Error silencioso con fallback - no afecta la experiencia del usuario significativamente
    console.error('Error obteniendo dimensiones de página:', error);
    // Devolver dimensiones aproximadas como fallback
    return {
      width: 595, // Tamaño A4 estándar en puntos
      height: 842,
      aspectRatio: 595 / 842
    };
  }
}

/**
 * Limpia los recursos utilizados y caché
 */
export function cleanup() {
  // Limpiar caché de páginas (silencioso, es mantenimiento interno)
  Object.keys(loadedPages).forEach(key => {
    const url = loadedPages[key];
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  
  // Reiniciar objetos
  Object.keys(loadedPages).forEach(key => delete loadedPages[key]);
  Object.keys(pagePromises).forEach(key => delete pagePromises[key]);
}

export default {
  loadPDFJS,
  getPageAsImage,
  preloadPages,
  getPageDimensions,
  cleanup
};