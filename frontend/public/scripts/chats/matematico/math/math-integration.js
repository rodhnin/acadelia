/**
 * math-integration.js - Integración optimizada del editor MathLive con el sistema de chat
 * Versión optimizada con mejor rendimiento, seguridad y gestión de memoria
 */

import { DOM_SELECTORS } from '../core/config-matematico.js';
import { initMathEditor } from '../math/interactive-math-editor.js';
import { initMathJax, renderMath } from '../math/mathjax-config.js';
import { setMathEditor, registerGlobalInsertLatex } from '../math/latex-utils.js';
import { eventBus } from '../core/event-bus-matematico.js';
import {
  createElement,
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../shared/dom-helpers.js';

// Configuración
const CONFIG = {
  CHECK_INTERVAL: 100,
  TIMEOUT_LIMIT: 5000,
  RENDER_DELAY: 100,
  TIMEOUT_KEYS: {
    MATHTYPE_CHECK: 'math-type-check',
    RENDER_MATH: 'math-render'
  }
};

// Expresiones regulares precompiladas
const REGEX = {
  DELIMITERS: /^\$|\$$/g,
  PARENTHESES: /^\\\(|\\\)$/g
};

// Variable para almacenar la referencia al editor
let mathEditor = null;

// Flag para evitar inicializaciones múltiples
let isInitialized = false;

const eventHandlers = [];

/**
 * Inicializa el sistema completo de edición matemática con MathLive
 * @returns {Promise<Object>} Promesa con el editor matemático
 */
export async function initMathSystem() {
  // Evitar inicializaciones múltiples
  if (isInitialized) {
    return mathEditor;
  }
  
  try {
    // Primero asegurar que MathJax esté cargado
    await initMathJax();
    
    await ensureMathLiveLoaded();
    
    mathEditor = initMathEditor();
    
    // Proporcionar una referencia del editor a latex-utils
    setMathEditor(mathEditor);
    
    registerGlobalInsertLatex();
    
    setupMathIntegration();
    
    isInitialized = true;
    
    eventBus.emit('mathSystemInitialized', { mathEditor });
    
    return mathEditor;
  } catch (error) {
    eventBus.emit('mathSystemError', { error });
    throw error;
  }
}

/**
 * Asegura que MathLive esté cargado - optimizado para evitar cargas duplicadas
 * @returns {Promise<void>}
 */
async function ensureMathLiveLoaded() {
  // Si MathLive ya está cargado, configurar y devolver
  if (window.MathLive) {
    configureMathLiveFonts();
    return Promise.resolve();
  }
  
  const existingScript = document.querySelector('script[src*="mathlive"]');
  if (existingScript) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.MathLive) {
          configureMathLiveFonts();
          clearInterval(checkInterval);
          resolve();
        }
      }, CONFIG.CHECK_INTERVAL);
      
      // Timeout por seguridad
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, CONFIG.TIMEOUT_LIMIT);
    });
  }
  
  // Si no está cargado, añadir el script
  return new Promise((resolve, reject) => {
    const script = createElement('script', {
      src: "/scripts/mathlive.js",
      async: true
    });
    
    addEvent(script, 'load', () => {
      if (window.MathLive) {
        configureMathLiveFonts();
      }
      resolve();
    });
    
    addEvent(script, 'error', () => {
      reject(new Error('Error al cargar MathLive local'));
    });
    
    document.head.appendChild(script);
  });
}

/**
 * Configura el directorio de fuentes en MathLive - método unificado
 */
function configureMathLiveFonts() {
  if (!window.MathLive) return;
  
  const fontsPath = '/css/chats/fonts';
  
  try {
    // Método 1: MathLive.config (versiones más recientes)
    if (typeof MathLive.config !== 'undefined') {
      MathLive.config = { ...MathLive.config, fontsDirectory: fontsPath };
      return;
    }
    
    // Método 2: setConfig (versiones recientes)
    if (typeof MathLive.setConfig === 'function') {
      MathLive.setConfig({ fontsDirectory: fontsPath });
      return;
    }
    
    // Método 3: Config.set (versiones antiguas)
    if (MathLive.Config && typeof MathLive.Config.set === 'function') {
      MathLive.Config.set('fontsDirectory', fontsPath);
      return;
    }
    
    // Método 4: Configuración directa de fontMetrics (versiones específicas)
    if (MathLive.FontMetrics && typeof MathLive.FontMetrics.setFontsDirectory === 'function') {
      MathLive.FontMetrics.setFontsDirectory(fontsPath);
      return;
    }
    
    // Método 5: Como último recurso, intenta modificar la propiedad globalmente
    window.MathLiveConfig = window.MathLiveConfig || {};
    window.MathLiveConfig.fontsDirectory = fontsPath;
  } catch (error) {
    // Silenciar error en producción
  }
}

/**
 * Configura la integración con el sistema de chat
 */
function setupMathIntegration() {
  setupMathButton();
  
  setupEventListeners();
}

/**
 * Configura el botón matemático para mostrar el editor - optimizado
 */
function setupMathButton() {
  const mathButton = document.querySelector('#math-button') || 
                    document.querySelector('.input-box button:nth-child(3)');
  
  if (!mathButton) {
    return;
  }
  
  const newMathButton = mathButton.cloneNode(true);
  mathButton.parentNode.replaceChild(newMathButton, mathButton);
  
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (mathEditor) {
      mathEditor.toggle();
    }
  };
  
  addEvent(newMathButton, 'click', handleClick);
  eventHandlers.push({ element: newMathButton, type: 'click', handler: handleClick });
}

/**
 * Configura los listeners de eventos para la integración - optimizado
 */
function setupEventListeners() {
  // Cuando se envía una fórmula, renderizar las fórmulas en el chat
  const latexInsertedHandler = (data) => {
    // Pequeño retraso para asegurarse de que el DOM está actualizado
    setManagedTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer && typeof renderMath === 'function') {
        renderMath(chatContainer).catch(() => {
          // Silenciar error en producción
        });
      }
    }, CONFIG.RENDER_DELAY, CONFIG.TIMEOUT_KEYS.RENDER_MATH);
  };
  
  eventBus.on('latexInserted', latexInsertedHandler);
  
  // Capturar texto seleccionado para usar en el editor
  setupTextSelectionForEditor();
}

/**
 * Configura el manejo de texto seleccionado para el editor
 */
function setupTextSelectionForEditor() {
  const textarea = document.querySelector(DOM_SELECTORS.textarea) || 
                  document.querySelector('.input-box textarea');
  
  if (!textarea) return;
  
  const handleMouseUp = () => {
    const selectedText = textarea.value.substring(
      textarea.selectionStart, 
      textarea.selectionEnd
    ).trim();
    
    if (selectedText) {
      localStorage.setItem('math_selected_text', selectedText);
    }
  };
  
  // Capturar selección de texto en textarea
  addEvent(textarea, 'mouseup', handleMouseUp);
  eventHandlers.push({ element: textarea, type: 'mouseup', handler: handleMouseUp });
  
  const mathEditorShownHandler = () => {
    const selectedText = localStorage.getItem('math_selected_text');
    if (selectedText && mathEditor) {
      if (selectedText.includes('\\') || 
          selectedText.startsWith('$') || 
          selectedText.includes('^') || 
          selectedText.includes('_')) {
        
        let cleanLatex = selectedText.replace(REGEX.DELIMITERS, '');
        cleanLatex = cleanLatex.replace(REGEX.PARENTHESES, '');
        
        mathEditor.setLatex(cleanLatex);
      }
      
      localStorage.removeItem('math_selected_text');
    }
  };
  
  // Al abrir el editor, usar el texto seleccionado
  eventBus.on('mathEditorShown', mathEditorShownHandler);
}

/**
 * Limpia todos los recursos creados por el módulo
 */
export function cleanupMathSystem() {
  eventHandlers.forEach(({ element, type, handler }) => {
    removeEvent(element, type, handler);
  });
  
  Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
    clearManagedTimeouts(key);
  });
  
  isInitialized = false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMathSystem);
}

export default {
  initMathSystem,
  cleanupMathSystem
};