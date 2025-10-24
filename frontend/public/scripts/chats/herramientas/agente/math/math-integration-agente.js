/**
 * math-integration-agente.js - VERSIÓN MEJORADA
 * Integración optimizada del editor MathLive con el sistema de chat
 * Combina las mejoras con las funciones originales manteniendo compatibilidad
 */

import { DOM_SELECTORS } from '../core/config-agente.js';
import { initMathEditor } from './interactive-math-editor-agente.js';
import { initMathJax, renderMath, resetMathJax, getMathJaxDebugInfo } from './mathjax-config-agente.js';
import { setMathEditor, registerGlobalInsertLatex } from './latex-utils-agente.js';
import { eventBus } from '../core/event-bus-agente.js';
import {
  createElement,
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../../shared/dom-helpers.js';

// Configuración mejorada
const CONFIG = {
  CHECK_INTERVAL: 100,
  TIMEOUT_LIMIT: 5000,
  RENDER_DELAY: 100,
  TIMEOUT_KEYS: {
    MATHTYPE_CHECK: 'math-type-check',
    RENDER_MATH: 'math-render',
    MATHLIVE_LOAD: 'mathlive-load'
  },
  // ✅ NUEVAS configuraciones
  MAX_INIT_RETRIES: 3,
  INIT_RETRY_DELAY: 1000
};

// Expresiones regulares precompiladas
const REGEX = {
  DELIMITERS: /^\$|\$$/g,
  PARENTHESES: /^\\\(|\\\)$/g,
  // ✅ NUEVAS regex para mejor detección
  LATEX_PATTERNS: /\\[a-zA-Z]+|[\^_]|\{.*?\}|\$.*?\$/
};

// Variables de estado mejoradas
let mathEditor = null;
let isInitialized = false;
let isInitializing = false;
let initializationAttempts = 0;

// Registrar los controladores de eventos para limpieza
const eventHandlers = [];

/**
 * MEJORADO: Inicializa el sistema completo de edición matemática con MathLive
 * @returns {Promise<Object>} Promesa con el editor matemático
 */
export async function initMathSystem() {
  // ✅ Evitar inicializaciones múltiples con mejor control
  if (isInitialized) {
    return mathEditor;
  }
  
  if (isInitializing) {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (isInitialized && mathEditor) {
          resolve(mathEditor);
        } else if (!isInitializing) {
          // Si falló la inicialización, intentar de nuevo
          initMathSystem().then(resolve);
        } else {
          setTimeout(checkReady, CONFIG.CHECK_INTERVAL);
        }
      };
      checkReady();
    });
  }
  
  isInitializing = true;
  initializationAttempts++;
  
  try {
    console.log(`🚀 Iniciando sistema matemático (intento ${initializationAttempts})...`);
    
    // ✅ Primero asegurar que MathJax esté cargado con mejor manejo de errores
    await initMathJax();
    console.log('✅ MathJax inicializado correctamente');
    
    // ✅ Cargar MathLive con reintentos mejorados
    await ensureMathLiveLoaded();
    console.log('✅ MathLive cargado correctamente');
    
    // ✅ Inicializar el editor MathLive con verificaciones
    mathEditor = initMathEditor();
    if (!mathEditor) {
      throw new Error('No se pudo inicializar el editor MathLive');
    }
    console.log('✅ Editor MathLive inicializado');
    
    // ✅ Proporcionar una referencia del editor a latex-utils
    setMathEditor(mathEditor);
    
    // ✅ Registrar función insertLatex globalmente
    registerGlobalInsertLatex();
    
    // ✅ Configurar la integración con el sistema de chat
    setupMathIntegration();
    
    // ✅ Marcar como inicializado
    isInitialized = true;
    isInitializing = false;
    
    // ✅ Notificar que el sistema matemático está listo
    eventBus.emit('mathSystemInitialized', { mathEditor });
    console.log('🎯 Sistema matemático completamente inicializado');
    
    return mathEditor;
    
  } catch (error) {
    isInitializing = false;
    console.error(`❌ Error en inicialización del sistema matemático (intento ${initializationAttempts}):`, error);
    
    // ✅ Reintentar si no hemos alcanzado el límite
    if (initializationAttempts < CONFIG.MAX_INIT_RETRIES) {
      console.log(`🔄 Reintentando inicialización en ${CONFIG.INIT_RETRY_DELAY}ms...`);
      
      return new Promise((resolve, reject) => {
        setManagedTimeout(async () => {
          try {
            const result = await initMathSystem();
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        }, CONFIG.INIT_RETRY_DELAY, CONFIG.TIMEOUT_KEYS.MATHTYPE_CHECK);
      });
    }
    
    // ✅ Si fallaron todos los intentos, emitir error y resetear
    eventBus.emit('mathSystemError', { error, attempts: initializationAttempts });
    
    // ✅ Opción de reseteo automático para recuperación
    if (initializationAttempts >= CONFIG.MAX_INIT_RETRIES) {
      console.log('🔄 Intentando resetear MathJax para recuperación...');
      try {
        resetMathJax();
        initializationAttempts = 0; // Resetear contador
      } catch (resetError) {
        console.error('❌ Error al resetear MathJax:', resetError);
      }
    }
    
    throw error;
  }
}

/**
 * MEJORADO: Asegura que MathLive esté cargado con mejor manejo de errores
 * @returns {Promise<void>}
 */
async function ensureMathLiveLoaded() {
  // ✅ Si MathLive ya está cargado, configurar y devolver
  if (window.MathLive) {
    configureMathLiveFonts();
    return Promise.resolve();
  }
  
  // ✅ Verificar si el script ya está en proceso de carga
  const existingScript = document.querySelector('script[src*="mathlive"]');
  if (existingScript) {
    console.log('📦 Script MathLive encontrado, esperando carga...');
    
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = CONFIG.TIMEOUT_LIMIT / CONFIG.CHECK_INTERVAL;
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (window.MathLive) {
          configureMathLiveFonts();
          clearInterval(checkInterval);
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          reject(new Error('Timeout esperando MathLive'));
        }
      }, CONFIG.CHECK_INTERVAL);
    });
  }
  
  // ✅ Si no está cargado, añadir el script con mejor manejo de errores
  console.log('📦 Cargando MathLive desde local...');
  
  return new Promise((resolve, reject) => {
    const script = createElement('script', {
      src: "/scripts/mathlive.js",
      async: true
    });
    
    const handleLoad = () => {
      console.log('✅ MathLive script cargado');
      
      if (window.MathLive) {
        configureMathLiveFonts();
        resolve();
      } else {
        reject(new Error('MathLive no está disponible después de cargar el script'));
      }
    };
    
    const handleError = (error) => {
      console.error('❌ Error al cargar MathLive:', error);
      reject(new Error('Error al cargar MathLive local'));
    };
    
    addEvent(script, 'load', handleLoad);
    addEvent(script, 'error', handleError);
    
    // ✅ Timeout de seguridad mejorado
    setManagedTimeout(() => {
      if (!window.MathLive) {
        console.warn('⚠️ Timeout al cargar MathLive');
        reject(new Error('Timeout al cargar MathLive'));
      }
    }, CONFIG.TIMEOUT_LIMIT, CONFIG.TIMEOUT_KEYS.MATHLIVE_LOAD);
    
    document.head.appendChild(script);
  });
}

/**
 * MEJORADO: Configura el directorio de fuentes en MathLive con mejor detección de versiones
 */
function configureMathLiveFonts() {
  if (!window.MathLive) {
    console.warn('⚠️ MathLive no disponible para configurar fuentes');
    return;
  }
  
  const fontsPath = '/css/chats/fonts';
  
  try {
    console.log('🎨 Configurando fuentes MathLive...');
    
    // ✅ Método 1: MathLive.config (versiones más recientes)
    if (typeof MathLive.config !== 'undefined') {
      MathLive.config = { ...MathLive.config, fontsDirectory: fontsPath };
      console.log('✅ Fuentes configuradas via MathLive.config');
      return;
    }
    
    // ✅ Método 2: setConfig (versiones recientes)
    if (typeof MathLive.setConfig === 'function') {
      MathLive.setConfig({ fontsDirectory: fontsPath });
      console.log('✅ Fuentes configuradas via setConfig');
      return;
    }
    
    // ✅ Método 3: Config.set (versiones antiguas)
    if (MathLive.Config && typeof MathLive.Config.set === 'function') {
      MathLive.Config.set('fontsDirectory', fontsPath);
      console.log('✅ Fuentes configuradas via Config.set');
      return;
    }
    
    // ✅ Método 4: Configuración directa de fontMetrics (versiones específicas)
    if (MathLive.FontMetrics && typeof MathLive.FontMetrics.setFontsDirectory === 'function') {
      MathLive.FontMetrics.setFontsDirectory(fontsPath);
      console.log('✅ Fuentes configuradas via FontMetrics');
      return;
    }
    
    // ✅ Método 5: Como último recurso, intenta modificar la propiedad globalmente
    window.MathLiveConfig = window.MathLiveConfig || {};
    window.MathLiveConfig.fontsDirectory = fontsPath;
    console.log('✅ Fuentes configuradas via MathLiveConfig global');
    
  } catch (error) {
    console.warn('⚠️ Error configurando fuentes MathLive (no crítico):', error);
  }
}

/**
 * MEJORADO: Configura la integración con el sistema de chat
 */
function setupMathIntegration() {
  console.log('🔗 Configurando integración con sistema de chat...');
  
  // ✅ Configurar el botón matemático con mejor detección
  setupMathButton();
  
  // ✅ Configurar eventos entre sistemas con manejo de errores
  setupEventListeners();
  
  console.log('✅ Integración configurada correctamente');
}

/**
 * MEJORADO: Configura el botón matemático con mejor detección y manejo
 */
function setupMathButton() {
  // ✅ Buscar el botón matemático con múltiples selectores
  const mathButton = document.querySelector('#math-button') || 
                    document.querySelector('.input-box button:nth-child(3)') ||
                    document.querySelector('[data-action="math"]') ||
                    document.querySelector('.math-button');
  
  if (!mathButton) {
    console.warn('⚠️ Botón matemático no encontrado');
    return;
  }
  
  console.log('🔘 Configurando botón matemático...');
  
  // ✅ Eliminar listeners previos usando clonación para evitar memory leaks
  const newMathButton = mathButton.cloneNode(true);
  mathButton.parentNode.replaceChild(newMathButton, mathButton);
  
  // ✅ Manejar el evento de clic con mejor validación
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Clic en botón matemático');
    
    if (mathEditor && typeof mathEditor.toggle === 'function') {
      try {
        mathEditor.toggle();
      } catch (error) {
        console.error('❌ Error al abrir editor matemático:', error);
        
        // ✅ Intentar reinicializar el editor si falla
        eventBus.emit('mathEditorError', { error });
      }
    } else {
      console.warn('⚠️ Editor matemático no disponible');
      
      // ✅ Intentar reinicializar el sistema
      initMathSystem().catch(error => {
        console.error('❌ Error al reinicializar sistema matemático:', error);
      });
    }
  };
  
  // ✅ Añadir el nuevo listener con gestión centralizada
  addEvent(newMathButton, 'click', handleClick);
  eventHandlers.push({ element: newMathButton, type: 'click', handler: handleClick });
  
  console.log('✅ Botón matemático configurado');
}

/**
 * MEJORADO: Configura los listeners de eventos con mejor manejo de errores
 */
function setupEventListeners() {
  console.log('👂 Configurando event listeners...');
  
  // ✅ Cuando se envía una fórmula, renderizar las fórmulas en el chat con mejor control
  const latexInsertedHandler = (data) => {
    console.log('📝 LaTeX insertado, renderizando matemáticas...');
    
    // ✅ Pequeño retraso para asegurarse de que el DOM está actualizado
    setManagedTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer && typeof renderMath === 'function') {
        renderMath(chatContainer, {
          cacheKey: `chat-${Date.now()}`,
          maxRetries: 2
        }).catch((error) => {
          console.warn('⚠️ Error renderizando matemáticas en chat:', error);
          
          // ✅ Intentar renderizado simple como fallback
          if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([chatContainer]).catch(() => {
              console.warn('⚠️ Fallback de renderizado también falló');
            });
          }
        });
      }
    }, CONFIG.RENDER_DELAY, CONFIG.TIMEOUT_KEYS.RENDER_MATH);
  };
  
  eventBus.on('latexInserted', latexInsertedHandler);
  
  // ✅ Capturar texto seleccionado para usar en el editor
  setupTextSelectionForEditor();
  
  // ✅ NUEVO: Manejar errores del sistema matemático
  const mathErrorHandler = (data) => {
    console.error('❌ Error en sistema matemático:', data.error);
    
    // ✅ Mostrar información de debug si está disponible
    if (typeof getMathJaxDebugInfo === 'function') {
      console.log('🐛 Debug info MathJax:', getMathJaxDebugInfo());
    }
  };
  
  eventBus.on('mathSystemError', mathErrorHandler);
  eventBus.on('mathEditorError', mathErrorHandler);
  
  console.log('✅ Event listeners configurados');
}

/**
 * MEJORADO: Configura el manejo de texto seleccionado con mejor detección de LaTeX
 */
function setupTextSelectionForEditor() {
  const textarea = document.querySelector(DOM_SELECTORS.textarea) || 
                  document.querySelector('.input-box textarea') ||
                  document.querySelector('textarea[data-input="main"]');
  
  if (!textarea) {
    console.warn('⚠️ Textarea no encontrado para selección de texto');
    return;
  }
  
  console.log('📝 Configurando selección de texto...');
  
  // ✅ Manejar selección de texto con mejor validación
  const handleMouseUp = () => {
    try {
      const selectedText = textarea.value.substring(
        textarea.selectionStart, 
        textarea.selectionEnd
      ).trim();
      
      if (selectedText && selectedText.length > 0) {
        localStorage.setItem('math_selected_text', selectedText);
        console.log('📋 Texto seleccionado guardado:', selectedText.substring(0, 50) + '...');
      }
    } catch (error) {
      console.warn('⚠️ Error capturando texto seleccionado:', error);
    }
  };
  
  // ✅ Capturar selección de texto en textarea
  addEvent(textarea, 'mouseup', handleMouseUp);
  addEvent(textarea, 'keyup', handleMouseUp); // También capturar selección con teclado
  
  eventHandlers.push(
    { element: textarea, type: 'mouseup', handler: handleMouseUp },
    { element: textarea, type: 'keyup', handler: handleMouseUp }
  );
  
  // ✅ Manejar apertura del editor con mejor detección de LaTeX
  const mathEditorShownHandler = () => {
    try {
      const selectedText = localStorage.getItem('math_selected_text');
      if (selectedText && mathEditor) {
        console.log('🎯 Procesando texto seleccionado en editor...');
        
        // ✅ Verificar si es una expresión LaTeX con regex mejorada
        if (REGEX.LATEX_PATTERNS.test(selectedText)) {
          console.log('📐 Expresión LaTeX detectada');
          
          // ✅ Limpiar delimitadores usando expresiones regulares precompiladas
          let cleanLatex = selectedText.replace(REGEX.DELIMITERS, '');
          cleanLatex = cleanLatex.replace(REGEX.PARENTHESES, '');
          
          // ✅ Establecer en el editor con validación
          if (typeof mathEditor.setLatex === 'function') {
            mathEditor.setLatex(cleanLatex);
            console.log('✅ LaTeX establecido en editor');
          } else {
            console.warn('⚠️ Método setLatex no disponible en editor');
          }
        } else {
          console.log('📝 Texto normal detectado, insertando como está');
          
          // ✅ Para texto normal, insertarlo directamente
          if (typeof mathEditor.setValue === 'function') {
            mathEditor.setValue(selectedText);
          } else if (typeof mathEditor.setLatex === 'function') {
            mathEditor.setLatex(selectedText);
          }
        }
        
        localStorage.removeItem('math_selected_text');
      }
    } catch (error) {
      console.error('❌ Error procesando texto seleccionado:', error);
      localStorage.removeItem('math_selected_text'); // Limpiar en caso de error
    }
  };
  
  // ✅ Al abrir el editor, usar el texto seleccionado
  eventBus.on('mathEditorShown', mathEditorShownHandler);
  
  console.log('✅ Selección de texto configurada');
}

/**
 * MEJORADO: Limpia todos los recursos con mejor control
 */
export function cleanupMathSystem() {
  console.log('🧹 Limpiando sistema matemático...');
  
  try {
    // ✅ Limpiar event handlers
    eventHandlers.forEach(({ element, type, handler }) => {
      try {
        removeEvent(element, type, handler);
      } catch (error) {
        console.warn('⚠️ Error limpiando event handler:', error);
      }
    });
    
    // ✅ Limpiar timeouts
    Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
      try {
        clearManagedTimeouts(key);
      } catch (error) {
        console.warn('⚠️ Error limpiando timeout:', error);
      }
    });
    
    // ✅ Limpiar localStorage
    try {
      localStorage.removeItem('math_selected_text');
    } catch (error) {
      console.warn('⚠️ Error limpiando localStorage:', error);
    }
    
    // ✅ Resetear estado
    isInitialized = false;
    isInitializing = false;
    initializationAttempts = 0;
    mathEditor = null;
    
    console.log('✅ Sistema matemático limpiado');
    
  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
  }
}

/**
 * ✅ NUEVA: Función para obtener información de estado del sistema
 */
export function getMathSystemInfo() {
  return {
    isInitialized,
    isInitializing,
    initializationAttempts,
    hasMathEditor: !!mathEditor,
    hasMathLive: !!window.MathLive,
    mathJaxInfo: typeof getMathJaxDebugInfo === 'function' ? getMathJaxDebugInfo() : null,
    eventHandlersCount: eventHandlers.length
  };
}

// ✅ Limpiar al descargar la página con mejor manejo
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMathSystem);
  
  // ✅ Exponer funciones de debug globalmente
  window.debugMathSystem = {
    info: getMathSystemInfo,
    cleanup: cleanupMathSystem,
    reinit: initMathSystem
  };
}

// ✅ MANTENER: Exportación original para compatibilidad
export default {
  initMathSystem,
  cleanupMathSystem,
  getMathSystemInfo
};