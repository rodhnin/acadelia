/**
 * pdf-init.js - Integración del sistema PDF con app.js
 * 
 * Ofrece funciones para inicializar el sistema de PDF
 * en el momento adecuado dentro del flujo de carga de app.js
 * 
 * Versión mejorada con soporte para el chigüire y cancelación
 */

import { 
  initPDFUploader, 
  updateUploaderVisibility 
} from './components/pdf-uploader.js';
import { 
  initPDFPanel 
} from './components/pdf-panel.js';
import { 
  initPDFCheck, 
  checkPDF, 
  on as onPDFState,
  togglePDFPanel
} from './services/pdf-state.js';
import { getState } from './core/state-pdf.js';
import { ChiguireAnimation } from './utils/chiguire-animation-pdf.js';

// Rastrea el estado de inicialización
let isInitialized = false;
let chatCheckInterval = null;
let chiguireAnimation = null;

/**
 * Inicializa el sistema PDF - debe llamarse desde app.js
 * Versión mejorada con mejor soporte LaTeX
 * @param {Object} options - Opciones de configuración
 * @returns {Promise} Promesa que se resuelve cuando se inicializa el sistema
 */
export async function initializePDF(options = {}) {
  if (isInitialized) return true;
  
  try {
    console.log('Iniciando sistema PDF mejorado con soporte LaTeX...');
    
    if (window.MathJax && window.MathJax.typesetPromise) {
      console.log('✅ MathJax ya está disponible globalmente, omitiendo inicialización');
    } else {
      try {
        const mathJaxPaths = [
          './math/mathjax-config.js'
        ];
        
        let mathJaxInitialized = false;
        
        for (const path of mathJaxPaths) {
          try {
            const mathJaxModule = await import(path).catch(() => null);
            if (mathJaxModule && typeof mathJaxModule.initMathJax === 'function') {
              if (!window.MathJax || !window.MathJax.typesetPromise) {
                await mathJaxModule.initMathJax();
                console.log('MathJax inicializado correctamente para contenido PDF');
              } else {
                console.log('MathJax ya estaba inicializado, omitiendo');
              }
              mathJaxInitialized = true;
              break;
            }
          } catch (moduleError) {
            // Error silencioso
          }
        }
        
        if (!mathJaxInitialized && (!window.MathJax || !window.MathJax.typesetPromise)) {
          await loadMathJaxFromCDN();
        }
      } catch (error) {
        console.warn('Error al inicializar MathJax para PDF:', error);
      }
    }
    
    // Resto del código existente...
    initPDFUploader();
    initPDFPanel();
    setupPDFStateListeners();
    setupChatChangeListener();
    initChiguireAnimation();
    
    const chatId = getState('currentChatId');
    let hasPDF = false;
    
    if (chatId) {
      hasPDF = await initPDFCheck();
    } else {
      updateUploaderVisibility(false);
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Error al inicializar sistema PDF:', error);
    return false;
  }
}


/**
 * Función auxiliar para cargar MathJax desde CDN
 * Se usa como último recurso si no está disponible localmente
 */
async function loadMathJaxFromCDN() {
  return new Promise((resolve, reject) => {
    if (window.MathJax) {
      console.log('MathJax ya está disponible, no es necesario cargarlo');
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    
    script.onload = () => {
      console.log('MathJax cargado correctamente desde CDN');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('Error al cargar MathJax desde CDN:', error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Inicializa la animación del chigüire
 */
function initChiguireAnimation() {
  // Se inicializará cuando sea necesario en el uploader
  // pero guardamos una referencia global para acceso desde otras partes
  window.chiguireAnimation = chiguireAnimation = new ChiguireAnimation({
    particleCount: 15,
    walkingSpeed: 80
  });
  
  console.log('Animación del chigüire inicializada');
}

/**
 * Configura listeners para cambios en el estado del PDF
 */
function setupPDFStateListeners() {
  // Cuando se carga o elimina un PDF, actualizar visibilidad del botón de subida
  onPDFState('onPDFLoaded', () => {
    updateUploaderVisibility(true);
  });
  
  onPDFState('onPDFRemoved', () => {
    updateUploaderVisibility(false);
  });
  
  checkPDF().then(hasPDF => {
    updateUploaderVisibility(hasPDF);
  });
}

/**
 * Configura listener para cambios de chat
 */
function setupChatChangeListener() {
  if (chatCheckInterval) {
    clearInterval(chatCheckInterval);
  }
  
  let lastChatId = getState('currentChatId');
  
  chatCheckInterval = setInterval(() => {
    const currentChatId = getState('currentChatId');
    
    // Si cambió el chat
    if (currentChatId !== lastChatId) {
      console.log(`PDF: Chat cambió de ${lastChatId || 'ninguno'} a ${currentChatId || 'ninguno'}`);
      
      lastChatId = currentChatId;
      
      if (currentChatId) {
        console.log(`Verificando PDF para chat: ${currentChatId}`);
        initPDFCheck();
      } else {
        // Si no hay chat activo, ocultar panel y botón
        console.log('Sin chat activo, ocultando panel PDF');
        togglePDFPanel(false);
        updateUploaderVisibility(false);
      }
    }
  }, 1000);
}

/**
 * Limpia recursos del sistema PDF
 */
export function cleanupPDF() {
  if (!isInitialized) return;
  
  if (chatCheckInterval) {
    clearInterval(chatCheckInterval);
    chatCheckInterval = null;
  }
  
  togglePDFPanel(false);
  
  if (chiguireAnimation) {
    chiguireAnimation.stop();
  }
  
  import('./utils/pdf-renderer.js')
    .then(module => {
      if (module.cleanup) module.cleanup();
    })
    .catch(err => console.warn('Error limpiando renderer:', err));
  
  isInitialized = false;
}

export default {
  initializePDF,
  cleanupPDF
};