/**
 * mathjax-config.js - Versión CORREGIDA que funciona desde el inicio
 * Basado en el reset nuclear que funciona + inicialización robusta
 */
import { createElement, addEvent, setManagedTimeout } from '../../shared/dom-helpers.js';

// Configuración mejorada
const CONFIG = {
  CDN_URL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',
  MAX_RETRIES: 5,
  RETRY_DELAY: 300,
  CACHE_SIZE_LIMIT: 100,
  INITIALIZATION_TIMEOUT: 15000,
  READY_CHECK_INTERVAL: 100
};

// Estado robusto
let mathJaxReady = false;
let mathJaxPromise = null;
let isInitializing = false;
let initializationAttempts = 0;

// Caché
const mathJaxCache = new Map();

/**
 * ✅ CONFIGURACIÓN ROBUSTA - Basada en el reset que funciona
 */
function setupMathJaxConfig() {
  console.log('🔧 Configurando MathJax con configuración robusta...');
  
  if (window.MathJax) {
    console.log('🗑️ Limpiando configuración MathJax previa...');
    try {
      delete window.MathJax;
    } catch (e) {
      window.MathJax = undefined;
    }
  }

  // Configuración robusta basada en el reset nuclear
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
      processEnvironments: true,
      packages: {'[+]': ['base', 'ams', 'physics', 'autoload']},
      macros: {
        'sen': '\\sin',
        'degree': '^{\\circ}',
        'arctg': '\\arctan',
        'tg': '\\tan'
      }
    },
    chtml: {
      scale: 1,
      minScale: 0.5,
      matchFontHeight: true
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
      processHtmlClass: 'math-container|question-text|option-text|chat-message',
      ignoreHtmlClass: 'no-math'
    },
    startup: {
      typeset: false, // ✅ CRÍTICO: Evitar renderizado automático
      ready: function() {
        console.log('🎯 MathJax ready callback ejecutado');
        
        // Suprimir warnings de AMS (como en el reset)
        const originalWarn = console.warn;
        console.warn = function(...args) {
          const message = args.join(' ');
          if (message.includes('No version information available for component [tex]/ams') ||
              message.includes('component [tex]/ams')) {
            return;
          }
          originalWarn.apply(console, args);
        };
        
        try {
          window.MathJax.startup.defaultReady();
          
          // Verificación robusta de funcionalidad
          setManagedTimeout(async () => {
            const isReallyReady = await verifyMathJaxFunctionality();
            if (isReallyReady) {
              mathJaxReady = true;
              isInitializing = false;
              console.log('✅ MathJax completamente funcional');
            } else {
              console.warn('⚠️ MathJax cargado pero no funcional, reiniciando...');
              await forceReinitialize();
            }
          }, 500);
          
        } catch (error) {
          console.error('❌ Error en defaultReady:', error);
          forceReinitialize();
        }
      }
    }
  };
}

/**
 * ✅ VERIFICACIÓN DE FUNCIONALIDAD - Como el test del reset
 */
async function verifyMathJaxFunctionality() {
  if (!window.MathJax || !window.MathJax.typesetPromise) {
    console.log('❌ MathJax.typesetPromise no disponible');
    return false;
  }

  try {
    const testElement = document.createElement('div');
    testElement.innerHTML = 'Test funcionalidad: $x^2 + y^2 = r^2$';
    testElement.style.position = 'absolute';
    testElement.style.top = '-1000px';
    testElement.style.left = '-1000px';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);
    
    // Probar renderizado
    await window.MathJax.typesetPromise([testElement]);
    
    const mathElements = testElement.querySelectorAll('.MathJax, mjx-container, mjx-math');
    const isWorking = mathElements.length > 0;
    
    testElement.remove();
    
    console.log(`🧪 Test de funcionalidad: ${isWorking ? 'EXITOSO' : 'FALLIDO'} (${mathElements.length} elementos)`);
    return isWorking;
    
  } catch (error) {
    console.error('❌ Error en test de funcionalidad:', error);
    return false;
  }
}

/**
 * ✅ REINICIALIZACIÓN FORZADA - Como el reset nuclear
 */
async function forceReinitialize() {
  console.log('🔄 Forzando reinicialización MathJax...');
  
  initializationAttempts++;
  if (initializationAttempts > 3) {
    console.error('❌ Demasiados intentos de reinicialización');
    return;
  }
  
  mathJaxReady = false;
  isInitializing = false;
  mathJaxPromise = null;
  
  const oldMathJax = document.querySelectorAll('.MathJax, mjx-container, mjx-math');
  oldMathJax.forEach(el => {
    if (el.parentNode) {
      const originalText = el.getAttribute('data-original-text') || 
                          el.textContent || 
                          el.getAttribute('title') || '';
      if (originalText) {
        const textNode = document.createTextNode(originalText);
        el.parentNode.replaceChild(textNode, el);
      } else {
        el.remove();
      }
    }
  });
  
  const mathJaxScripts = document.querySelectorAll('script[src*="mathjax"]');
  mathJaxScripts.forEach(script => script.remove());
  
  if (window.MathJax) {
    try {
      delete window.MathJax;
    } catch (e) {
      window.MathJax = undefined;
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  return initMathJax();
}

/**
 * ✅ INICIALIZACIÓN MEJORADA
 */
export function initMathJax() {
  console.log('🚀 Iniciando MathJax mejorado...');
  
  // Evitar inicializaciones concurrentes
  if (isInitializing) {
    console.log('⏳ Ya inicializando, esperando...');
    return new Promise((resolve) => {
      const checkReady = () => {
        if (mathJaxReady && !isInitializing) {
          resolve();
        } else if (!isInitializing) {
          // Si dejó de inicializar pero no está listo, hay un problema
          console.warn('⚠️ Inicialización terminó pero MathJax no está listo');
          forceReinitialize().then(resolve);
        } else {
          setTimeout(checkReady, CONFIG.READY_CHECK_INTERVAL);
        }
      };
      checkReady();
    });
  }
  
  // Si ya está listo y funcional, devolver promesa resuelta
  if (mathJaxReady && window.MathJax && window.MathJax.typesetPromise) {
    console.log('✅ MathJax ya está listo');
    if (!mathJaxPromise) {
      mathJaxPromise = Promise.resolve();
    }
    return mathJaxPromise;
  }

  // Si hay promesa en progreso, devolverla
  if (mathJaxPromise) {
    console.log('⏳ Devolviendo promesa existente');
    return mathJaxPromise;
  }

  isInitializing = true;

  mathJaxPromise = new Promise((resolve, reject) => {
    console.log('🔄 Creando nueva promesa MathJax...');
    
    const existingScript = document.querySelector('script[src*="mathjax"]');
    if (existingScript && window.MathJax) {
      console.log('📜 Script y objeto MathJax existentes');
      
      verifyMathJaxFunctionality().then(isWorking => {
        if (isWorking) {
          mathJaxReady = true;
          isInitializing = false;
          resolve();
        } else {
          console.log('⚠️ MathJax existe pero no funciona, reiniciando...');
          forceReinitialize().then(resolve);
        }
      });
      return;
    }

    setupMathJaxConfig();

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Timeout de inicialización, forzando reinicio...');
      forceReinitialize().then(resolve);
    }, CONFIG.INITIALIZATION_TIMEOUT);

    // Si script existe pero no MathJax, esperar
    if (existingScript) {
      console.log('📜 Esperando script existente...');
      const checkExisting = () => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          clearTimeout(timeoutId);
          verifyMathJaxFunctionality().then(isWorking => {
            if (isWorking) {
              mathJaxReady = true;
              isInitializing = false;
              resolve();
            } else {
              forceReinitialize().then(resolve);
            }
          });
        } else {
          setTimeout(checkExisting, CONFIG.READY_CHECK_INTERVAL);
        }
      };
      checkExisting();
      return;
    }

    console.log('📥 Cargando script MathJax...');
    const script = createElement('script', {
      src: CONFIG.CDN_URL,
      async: true
    });

    addEvent(script, 'load', () => {
      console.log('✅ Script MathJax cargado');
      clearTimeout(timeoutId);
      
      setTimeout(async () => {
        const isWorking = await verifyMathJaxFunctionality();
        if (isWorking) {
          mathJaxReady = true;
          isInitializing = false;
          resolve();
        } else {
          console.warn('⚠️ Script cargado pero no funcional');
          forceReinitialize().then(resolve);
        }
      }, 800);
    });

    addEvent(script, 'error', () => {
      console.error('❌ Error cargando script MathJax');
      clearTimeout(timeoutId);
      isInitializing = false;
      resolve(); // No fallar para evitar bloqueos
    });

    document.head.appendChild(script);
  });

  return mathJaxPromise;
}

/**
 * ✅ RENDERIZADO MEJORADO
 */
export function renderMath(containerOrElements, options = {}) {
  const opts = {
    useCache: true,
    maxRetries: CONFIG.MAX_RETRIES,
    retryDelay: CONFIG.RETRY_DELAY,
    ...options
  };

  if (!containerOrElements) {
    return Promise.reject(new Error('Contenedor no válido'));
  }

  return ensureMathJaxInitialized().then(() => {
    let elements = [];
    if (Array.isArray(containerOrElements)) {
      elements = containerOrElements;
    } else if (containerOrElements.length !== undefined) {
      elements = Array.from(containerOrElements);
    } else {
      elements = [containerOrElements];
    }
    
    const validElements = elements.filter(el => {
      return el && 
             el.nodeType === 1 && 
             el.isConnected && 
             containsMath(el.textContent || el.innerHTML || '');
    });

    if (validElements.length === 0) {
      return Promise.resolve();
    }

    // Preservar texto original antes del renderizado
    validElements.forEach(el => {
      if (!el.hasAttribute('data-original-text')) {
        el.setAttribute('data-original-text', el.textContent || '');
      }
    });

    function tryRender(attempt = 1) {
      if (!window.MathJax || !window.MathJax.typesetPromise) {
        if (attempt >= opts.maxRetries) {
          console.warn('❌ MathJax no disponible después de reintentos');
          return Promise.resolve();
        }
        return new Promise(resolve => {
          setTimeout(() => resolve(tryRender(attempt + 1)), opts.retryDelay);
        });
      }

      try {
        return window.MathJax.typesetPromise(validElements)
          .then(() => {
            validElements.forEach(el => {
              el.setAttribute('data-mathjax-processed', 'true');
            });
            return Promise.resolve();
          })
          .catch(error => {
            console.error('❌ Error en typesetPromise:', error);
            if (attempt >= opts.maxRetries) {
              return Promise.resolve();
            }
            return new Promise(resolve => {
              setTimeout(() => resolve(tryRender(attempt + 1)), opts.retryDelay);
            });
          });
      } catch (error) {
        console.error('❌ Error general en renderizado:', error);
        return Promise.resolve();
      }
    }

    return tryRender();
  });
}

/**
 * ✅ ASEGURAR INICIALIZACIÓN
 */
export function ensureMathJaxInitialized() {
  if (mathJaxReady && window.MathJax && window.MathJax.typesetPromise) {
    return Promise.resolve();
  }
  return initMathJax();
}

/**
 * Verificar si texto contiene matemáticas
 */
export function containsMath(text) {
  if (!text || typeof text !== 'string') return false;
  
  const patterns = {
    delimiters: /\$((?!\$).+?)\$|\\\((.*?)\\\)|\$\$(.*?)\$\$|\\\[(.*?)\\\]/,
    commands: /\\[a-zA-Z]+(\{|\s|$)/
  };
  
  return patterns.delimiters.test(text) || patterns.commands.test(text);
}

/**
 * Funciones de utilidad
 */
export function clearMathCache() {
  mathJaxCache.clear();
}

export function resetMathJax() {
  console.log('🔄 Reset completo de MathJax...');
  mathJaxReady = false;
  mathJaxPromise = null;
  isInitializing = false;
  initializationAttempts = 0;
  clearMathCache();
  return forceReinitialize();
}

export function getMathJaxDebugInfo() {
  return {
    ready: mathJaxReady,
    initializing: isInitializing,
    attempts: initializationAttempts,
    hasWindow: !!window.MathJax,
    hasTypesetPromise: !!(window.MathJax && window.MathJax.typesetPromise),
    version: window.MathJax ? window.MathJax.version : null,
    cacheSize: mathJaxCache.size,
    promiseExists: !!mathJaxPromise
  };
}

// Funciones globales de debug
if (typeof window !== 'undefined') {
  window.debugMathJax = {
    info: getMathJaxDebugInfo,
    reset: resetMathJax,
    clearCache: clearMathCache,
    forceInit: initMathJax,
    verify: verifyMathJaxFunctionality
  };
}

export default {
  initMathJax,
  renderMath,
  ensureMathJaxInitialized,
  containsMath,
  clearMathCache,
  resetMathJax,
  getMathJaxDebugInfo
};