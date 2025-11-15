
import { DOM_SELECTORS } from '../core/config-pdf.js';
import scrollManager from '../../../shared/scroll-manager.js';
import {
  addClass,
  removeClass,
  addEvent,
  setAttribute,
  getAttribute,
  removeAttribute,
  setManagedTimeout,
  clearManagedTimeouts,
  sanitizeText
} from '../../../shared/dom-helpers.js';
import { 
  initMermaidSystem, 
  updateMermaidTheme, 
  refreshAllMermaidDiagrams 
} from '../../../shared/mermaid-utils.js';

// Constantes para temas
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// Tema predeterminado si no hay consentimiento o preferencia
const DEFAULT_THEME = THEMES.LIGHT;

// Variable para controlar si ya hay una actualización en progreso
let themeUpdateInProgress = false;

/**
 * Verifica si existe consentimiento para una categoría específica de cookies
 * @param {string} category - Categoría de cookie (functional, analytics, marketing)
 * @returns {boolean} - true si hay consentimiento, false en caso contrario
 */
function hasCookieConsent(category) {
  try {
    const cookiePreferences = localStorage.getItem('cookiePreferences');
    if (!cookiePreferences) return false;
    
    const preferences = JSON.parse(cookiePreferences);
    return preferences && preferences[category] === true;
  } catch (error) {
    console.error(`Error verificando consentimiento para cookies ${category}:`, error);
    return false;
  }
}

/**
 * Accede de manera segura a un valor en localStorage, verificando primero el consentimiento
 * @param {string} key - Clave a buscar en localStorage
 * @param {string} cookieCategory - Categoría de cookie requerida (functional, analytics, marketing)
 * @param {*} defaultValue - Valor predeterminado si no hay consentimiento o la clave no existe
 * @returns {*} - Valor almacenado o valor predeterminado
 */
function getStorageWithConsent(key, cookieCategory, defaultValue) {
  if (hasCookieConsent(cookieCategory) && localStorage.getItem(key) !== null) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error accediendo a ${key} en localStorage:`, error);
    }
  }
  return defaultValue;
}

/**
 * Guarda un valor en localStorage, verificando primero el consentimiento
 * @param {string} key - Clave para almacenar en localStorage
 * @param {*} value - Valor a almacenar
 * @param {string} cookieCategory - Categoría de cookie requerida (functional, analytics, marketing)
 * @returns {boolean} - true si se guardó correctamente, false en caso contrario
 */
function setStorageWithConsent(key, value, cookieCategory) {
  if (!hasCookieConsent(cookieCategory)) {
    console.log(`No hay consentimiento para cookies ${cookieCategory}, no se guardará ${key}`);
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error guardando ${key} en localStorage:`, error);
    return false;
  }
}

function updateHighlightTheme(theme) {
  const lightTheme = document.getElementById('hljs-light-theme');
  const darkTheme = document.getElementById('hljs-dark-theme');
  
  if (!lightTheme || !darkTheme) {
    console.warn('No se encontraron los elementos de tema de highlight.js');
    return;
  }
  
  if (theme === THEMES.DARK) {
    lightTheme.disabled = true;
    darkTheme.disabled = false;
    console.log('🔥 Tema cacheroso Tokyo Night Dark activado (PDF)');
  } else {
    lightTheme.disabled = false;
    darkTheme.disabled = true;
    console.log('☀️ Tema GitHub claro activado (PDF)');
  }
  
  // Volver a aplicar highlight.js a todos los bloques de código existentes
  if (window.hljs) {
    requestAnimationFrame(() => {
      document.querySelectorAll('pre code').forEach(block => {
        try {
          block.removeAttribute('data-highlighted');
          block.className = block.className.replace(/hljs[^\s]*/g, '').trim();
          
          // Re-aplicar highlighting con el nuevo tema
          window.hljs.highlightElement(block);
        } catch (error) {
          console.warn('Error re-aplicando highlight.js:', error);
        }
      });
    });
  }
}

/**
 * Establece el tema inicial sin esperar a que cargue el DOM
 * Esta función debe ejecutarse lo antes posible
 */
export function preloadTheme() {
  const savedTheme = getStorageWithConsent('theme', 'functional', DEFAULT_THEME);
  
  if (document.documentElement) {
    setAttribute(document.documentElement, 'data-theme', savedTheme);
  }
  
  if (document.body) {
    setAttribute(document.body, 'data-theme', savedTheme);
  }
  
  updateMetaThemeColor(savedTheme);
  
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateHighlightTheme(savedTheme);
  } else {
    // Si aún está cargando, esperar a que esté listo
    document.addEventListener('DOMContentLoaded', () => {
      updateHighlightTheme(savedTheme);
    });
  }
}

/**
 * Inicializa completamente el tema una vez que el DOM está listo
 */
export function initializeTheme() {
  const savedTheme = getStorageWithConsent('theme', 'functional', DEFAULT_THEME);
  
  if (document.documentElement) {
    setAttribute(document.documentElement, 'data-theme', savedTheme);
  }
  
  if (document.body) {
    setAttribute(document.body, 'data-theme', savedTheme);
  }
  
  updateMetaThemeColor(savedTheme);
  
  updateToggleIcon(savedTheme);
  
  updateHighlightTheme(savedTheme);
  
  initMermaidSystem().then(() => {
    console.log("Sistema Mermaid iniciado correctamente");
  }).catch(error => {
    console.warn("Error inicializando Mermaid:", error);
  });
  
  dispatchThemeChangeEvent(savedTheme);
}

/**
 * Cambia el tema de la interfaz y actualiza el localStorage.
 * Versión mejorada con bloqueo definitivo del scroll y verificación de consentimiento
 */
export function toggleTheme() {
  // Evitar actualizaciones superpuestas
  if (themeUpdateInProgress) {
    return;
  }
  
  themeUpdateInProgress = true;
  
  const currentTheme = getAttribute(document.documentElement, 'data-theme') || THEMES.LIGHT;
  const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  
  // PUNTO CLAVE 1: Bloquear scroll inmediatamente antes de cualquier operación
  if (typeof scrollManager !== 'undefined' && scrollManager.lockScrollWithReason) {
    scrollManager.lockScrollWithReason('theme-toggle-operation', 0);
    
    if (document.documentElement) {
      setAttribute(document.documentElement, 'data-theme-changing', 'true');
    }
  }

  if (typeof scrollManager !== 'undefined' && scrollManager.saveScrollPosition) {
    scrollManager.saveScrollPosition();
  }
  
  if (document.body) {
    setAttribute(document.body, 'data-updating-diagrams', 'true');
  }
  
  if (document.documentElement) {
    addClass(document.documentElement, 'theme-transition');
  }
  
  const diagramsData = [];
  document.querySelectorAll('.mermaid-diagram').forEach(diagram => {
    if (diagram.id) {
      diagramsData.push({
        id: diagram.id,
        code: getAttribute(diagram, 'data-code'),
        title: getAttribute(diagram, 'data-title') || 'Mapa Conceptual'
      });
      
      // PUNTO CLAVE 2: Marcar cada diagrama individual como actualizándose
      setAttribute(diagram, 'data-updating', 'true');
    }
  });
  
  if (document.documentElement) {
    setAttribute(document.documentElement, 'data-theme', newTheme);
  }
  
  if (document.body) {
    setAttribute(document.body, 'data-theme', newTheme);
  }
  
  updateMetaThemeColor(newTheme);
  
  setStorageWithConsent('theme', newTheme, 'functional');
  
  updateToggleIcon(newTheme);
  
  updateHighlightTheme(newTheme);

  if (newTheme === THEMES.DARK) {
    acadelInfo("🌙 ¡Modo nocturno activado!", "Acadel configuró el tema oscuro para estudiar sin cansar la vista");
  } else {
    acadelInfo("☀️ ¡Modo diurno activado!", "Acadel configuró el tema claro, perfecto para estudiar de día");
  }
  
  if (window.mermaid) {
    updateMermaidTheme(newTheme);
  }
  
  const event = new CustomEvent('themeChanged', {
    detail: { 
      theme: newTheme,
      skipDiagramRefresh: true  // Flag para evitar actualización redundante
    }
  });
  document.dispatchEvent(event);
  
  document.querySelectorAll('.mermaid-diagram').forEach(diagram => {
    const loadingHTML = `
      <div class="mermaid-loading">
        <i class='bx bx-loader-alt bx-spin'></i>
        Actualizando diagrama...
      </div>
    `;
    diagram.innerHTML = loadingHTML;
  });
  
  if (window.mermaid && diagramsData.length > 0) {
    refreshAllMermaidDiagrams().then(() => {
      cleanupAfterThemeChange();
    }).catch(error => {
      console.error("Error actualizando diagramas Mermaid:", error);
      cleanupAfterThemeChange();
    });
  } else {
    // Si no hay diagramas Mermaid, continuar con limpieza normal
    setManagedTimeout(() => {
      cleanupAfterThemeChange();
    }, 300, 'theme-cleanup-timeout');
  }
  
  // PUNTO CLAVE 3: Usar un timeout de seguridad para asegurar que el scroll se desbloquee
  const safetyTimeout = setManagedTimeout(() => {
    cleanupAfterThemeChange();
  }, 5000, 'theme-safety-timeout'); // 5 segundos como máximo
  
  
  // PUNTO CLAVE 5: Función centralizada para limpiar todo después del cambio de tema
  function cleanupAfterThemeChange() {
    // Evitar ejecutar esta función varias veces
    if (!themeUpdateInProgress) return;
    
    if (document.documentElement) {
      removeClass(document.documentElement, 'theme-transition');
    }
    
    if (document.body) {
      removeAttribute(document.body, 'data-updating-diagrams');
    }
    
    // Desmarcar diagramas individuales
    document.querySelectorAll('.mermaid-diagram[data-updating="true"]').forEach(diagram => {
      removeAttribute(diagram, 'data-updating');
    });
    
    if (typeof scrollManager !== 'undefined' && scrollManager.unlockScrollWithReason) {
      // Pequeño retraso adicional para asegurar que todos los renders estén completos
      setManagedTimeout(() => {
        scrollManager.unlockScrollWithReason('theme-toggle-complete');
        
        if (document.documentElement) {
          removeAttribute(document.documentElement, 'data-theme-changing');
        }
        
        if (typeof scrollManager.restoreScrollPosition === 'function') {
          scrollManager.restoreScrollPosition();
        }
      }, 100, 'final-scroll-unlock');
    }
    
    themeUpdateInProgress = false;
  }
}

/**
 * Actualiza el meta tag de theme-color para dispositivos móviles
 * @param {string} theme 'dark' o 'light'.
 */
function updateMetaThemeColor(theme) {
  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  if (metaTags.length) {
    metaTags.forEach(tag => {
      const metaTheme = getAttribute(tag, 'data-theme-color');
      if (metaTheme === theme) {
        // El meta tag ya tiene el valor correcto, no necesitamos modificarlo
      }
    });
  } else {
    // En caso de que no haya meta tags con data-theme-color
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (metaTag) {
      const color = theme === THEMES.DARK ? '#1a1a1a' : '#656d4a';
      setAttribute(metaTag, 'content', color);
    }
  }
}

/**
 * Método de recreación manual para diagramas Mermaid
 * NOTA: Mantenemos esta función lo más fiel posible al original
 * ya que es crítica para el funcionamiento de los diagramas
 */
function manuallyRecreateAllDiagrams(diagramsData, theme) {
  if (!window.mermaid) {
    return;
  }
  
  window.mermaid.initialize({
    theme: theme === THEMES.DARK ? 'dark' : 'default',
    startOnLoad: false,
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true
    }
  });
  
  // Recrear cada diagrama usando los datos guardados
  diagramsData.forEach((diagramData, index) => {
    setManagedTimeout(() => {
      const diagramContainer = document.getElementById(diagramData.id);
      if (!diagramContainer) {
        return;
      }
      
      try {
        diagramContainer.innerHTML = '';
        setAttribute(diagramContainer, 'data-code', diagramData.code);
        setAttribute(diagramContainer, 'data-theme', theme);
        setAttribute(diagramContainer, 'data-title', diagramData.title);
        
        const newDiagramId = `manual-${diagramData.id}-${Date.now()}`;
        const newContainer = document.createElement('div');
        newContainer.id = newDiagramId;
        newContainer.className = 'mermaid';
        newContainer.textContent = diagramData.code;
        
        diagramContainer.appendChild(newContainer);
        
        setManagedTimeout(() => {
          try {
            window.mermaid.init(undefined, newContainer);
          } catch (renderError) {
            const errorHTML = `
              <div class="mermaid-error">
                <i class='bx bx-error'></i>
                <p>Error al renderizar el diagrama: ${sanitizeText(renderError.message || 'Error desconocido')}</p>
                <button class="retry-render-btn"><i class="bx bx-refresh"></i> Reintentar</button>
              </div>
            `;
            diagramContainer.innerHTML = errorHTML;
            
            const retryBtn = diagramContainer.querySelector('.retry-render-btn');
            if (retryBtn) {
              addEvent(retryBtn, 'click', () => {
                manuallyRecreateAllDiagrams([diagramData], theme);
              });
            }
          }
        }, 100, `render-diagram-${newDiagramId}`);
      } catch (error) {
        // Error silencioso para no interrumpir el proceso
      }
    }, index * 150, `prepare-diagram-${index}`); // Retraso escalonado para cada diagrama
  });
}

/**
 * Método de último recurso para recrear diagramas Mermaid
 */
function recreateMermaidDiagrams() {
  if (!window.mermaid) return;
  
  const currentTheme = getAttribute(document.documentElement, 'data-theme') || THEMES.LIGHT;
  window.mermaid.initialize({
    theme: currentTheme === THEMES.DARK ? 'dark' : 'default',
    startOnLoad: false
  });
  
  // Recrear cada diagrama manualmente
  document.querySelectorAll('.mermaid-diagram').forEach((diagramContainer, index) => {
    const code = getAttribute(diagramContainer, 'data-code');
    if (!code) return;
    
    try {
      // Mensaje de carga (usar innerHTML para preservar el formato HTML)
      const loadingHTML = `
        <div class="mermaid-loading">
          <i class='bx bx-loader-alt bx-spin'></i>
          Actualizando diagrama...
        </div>
      `;
      diagramContainer.innerHTML = loadingHTML;
      
      // Recrear después de un breve retraso
      setManagedTimeout(() => {
        diagramContainer.innerHTML = '';
        diagramContainer.textContent = code;
        window.mermaid.init(undefined, diagramContainer);
      }, 100, `recreate-diagram-${index}`);
    } catch (error) {
      // Error silencioso
    }
  });
}

/**
 * Actualiza el ícono del toggle de tema según el tema actual.
 * @param {string} theme 'dark' o 'light'.
 */
export function updateToggleIcon(theme) {
  const themeToggle = document.querySelector(DOM_SELECTORS.themeToggle);
  if (themeToggle) {
    const iconHTML = theme === THEMES.DARK
      ? '<i class="bx bxs-sun"></i>'
      : '<i class="bx bxs-moon"></i>';
    
    themeToggle.innerHTML = iconHTML;
  }
}

/**
 * Configura los event listeners relacionados con el tema
 */
export function setupThemeListeners() {
  const themeToggle = document.querySelector(DOM_SELECTORS.themeToggle);
  if (themeToggle) {
    addEvent(themeToggle, 'click', toggleTheme);
  }
  
  // También escuchar cambios de tema que puedan ocurrir en otras partes de la aplicación
  addEvent(document, 'themeChanged', handleThemeChangeEvent);
  
  // Asegurar limpieza al cerrar la página
  addEvent(window, 'beforeunload', clearManagedTimeouts);
}

/**
 * Maneja los eventos de cambio de tema
 * @param {CustomEvent} e - Evento de cambio de tema
 */
function handleThemeChangeEvent(e) {
  if (e.detail && e.detail.theme) {
    const theme = e.detail.theme;
    
    // Si hay un flag para omitir la actualización de diagramas, lo respetamos
    if (e.detail.skipDiagramRefresh) {
      return;
    }
    
    updateHighlightTheme(theme);
    
    const hasMermaidDiagrams = document.querySelectorAll('.mermaid-diagram').length > 0;
    
    if (hasMermaidDiagrams) {
      // Asegurarse de que scrollManager está disponible globalmente
      if (typeof scrollManager !== 'undefined') {
        window.scrollManager = scrollManager;
      }
    }
    
    // Reconfigurar highlight.js si está disponible
    if (window.hljs) {
      document.querySelectorAll('pre code').forEach(block => {
        try {
          hljs.highlightElement(block);
        } catch (error) {
          console.warn('Error aplicando highlight.js:', error);
        }
      });
    }
    
    if (window.MathJax) {
      window.MathJax.typeset();
    }
  }
}

/**
 * Dispara un evento personalizado cuando cambia el tema
 * @param {string} theme - Nuevo tema
 */
export function dispatchThemeChangeEvent(theme) {
  const event = new CustomEvent('themeChanged', {
    detail: { theme: theme }
  });
  document.dispatchEvent(event);
}

/**
 * Inicializa todo el sistema de temas
 */
export function initThemeSystem() {
  preloadTheme();
  
  if (document.readyState === 'loading') {
    addEvent(document, 'DOMContentLoaded', () => {
      initializeTheme();
      setupThemeListeners();
    });
  } else {
    initializeTheme();
    setupThemeListeners();
  }
}

export default {
  preloadTheme,
  initializeTheme,
  toggleTheme,
  updateToggleIcon,
  setupThemeListeners,
  dispatchThemeChangeEvent,
  initThemeSystem,
  updateHighlightTheme
};