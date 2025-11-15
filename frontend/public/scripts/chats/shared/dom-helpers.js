/**
 * dom-helpers.js - Utilidades para manipulación del DOM
 * Versión optimizada con mejor seguridad y rendimiento
 */

// Registro de timeouts para limpieza adecuada
const timeoutRegistry = {};

// Registro de eventos para facilitar limpieza
const eventRegistry = new WeakMap();


/**
 * Sanitiza texto para evitar ataques XSS - VERSIÓN CORREGIDA
 * @param {string} text - Texto a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {string} Texto sanitizado
 */
export function sanitizeText(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  
  const isJSON = (() => {
    const trimmed = text.trim();
    if ((!trimmed.startsWith('{') || !trimmed.endsWith('}')) && 
        (!trimmed.startsWith('[') || !trimmed.endsWith(']'))) {
      return false;
    }
    try {
      JSON.parse(trimmed);
      return true;
    } catch (e) {
      return false;
    }
  })();
  
  if (isJSON) {
    console.log('🔍 JSON detectado, preservando estructura sin escape');
    return text;
  }
  
  const forceQuoteEscape = options.forceQuoteEscape || options.htmlAttribute || false;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  };
  
  if (forceQuoteEscape) {
    map['"'] = '&quot;';
    map["'"] = '&#039;';
  }
  
  const regex = new RegExp(`[${Object.keys(map).map(k => k === '&' ? '\\&' : k).join('')}]`, 'g');
  
  const result = text.replace(regex, m => map[m]);
  
  if (result !== text) {
    console.log('🔧 Sanitización aplicada:', {
      original: text.substring(0, 50) + '...',
      sanitized: result.substring(0, 50) + '...',
      quotesEscaped: forceQuoteEscape
    });
  }
  
  return result;
}

export function sanitizeForHTMLAttribute(text) {
  return sanitizeText(text, { forceQuoteEscape: true });
}

export function isValidJSON(text) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if ((!trimmed.startsWith('{') || !trimmed.endsWith('}')) && 
      (!trimmed.startsWith('[') || !trimmed.endsWith(']'))) {
    return false;
  }
  
  try {
    JSON.parse(trimmed);
    return true;
  } catch (e) {
    return false;
  }
}
/**
 * Crea un elemento con atributos y contenido de forma segura
 * @param {string} tag - Etiqueta HTML del elemento
 * @param {Object} attributes - Atributos del elemento
 * @param {string|HTMLElement|Array} content - Contenido del elemento
 * @returns {HTMLElement} Elemento creado
 */
export function createElement(tag, attributes = {}, content = null) {
  if (!tag || typeof tag !== 'string') {
    console.warn('Tag inválido proporcionado a createElement');
    tag = 'div'; // Valor predeterminado seguro
  }
  
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      // Acumular texto y nodos para añadirlos de forma más eficiente
      const textParts = [];
      const nodeParts = [];
      
      content.forEach(item => {
        if (typeof item === 'string') {
          textParts.push(item);
        } else if (item instanceof HTMLElement) {
          // Si hay texto acumulado, lo añadimos primero
          if (textParts.length) {
            const textNode = document.createTextNode(textParts.join(''));
            nodeParts.push(textNode);
            textParts.length = 0; // Limpiar array
          }
          nodeParts.push(item);
        }
      });
      
      if (textParts.length) {
        const textNode = document.createTextNode(textParts.join(''));
        nodeParts.push(textNode);
      }
      
      nodeParts.forEach(node => element.appendChild(node));
    }
  }
  
  return element;
}

/**
 * Crea un elemento con contenido HTML (usar con precaución)
 * @param {string} tag - Etiqueta HTML del elemento
 * @param {Object} attributes - Atributos del elemento
 * @param {string} htmlContent - Contenido HTML
 * @returns {HTMLElement} Elemento creado
 */
export function createElementWithHTML(tag, attributes = {}, htmlContent = '') {
  const element = createElement(tag, attributes);
  if (htmlContent && typeof htmlContent === 'string') {
    element.innerHTML = htmlContent;
  }
  return element;
}

/**
 * Añade un evento a un elemento con registro para limpieza
 * @param {HTMLElement} element - Elemento al que añadir el evento
 * @param {string} eventType - Tipo de evento
 * @param {Function} handler - Manejador del evento
 * @param {Object} options - Opciones del evento
 * @returns {boolean} Éxito de la operación
 */
export function addEvent(element, eventType, handler, options = {}) {
  if (!element || !eventType || typeof handler !== 'function') {
    return false;
  }
  
  try {
    element.addEventListener(eventType, handler, options);
    
    if (!eventRegistry.has(element)) {
      eventRegistry.set(element, []);
    }
    eventRegistry.get(element).push({ type: eventType, handler, options });
    
    return true;
  } catch (error) {
    console.warn(`Error al añadir evento ${eventType}:`, error);
    return false;
  }
}

/**
 * Elimina un evento de un elemento
 * @param {HTMLElement} element - Elemento del que eliminar el evento
 * @param {string} eventType - Tipo de evento
 * @param {Function} handler - Manejador del evento
 * @returns {boolean} Éxito de la operación
 */
export function removeEvent(element, eventType, handler) {
  if (!element || !eventType || typeof handler !== 'function') {
    return false;
  }
  
  try {
    element.removeEventListener(eventType, handler);
    
    if (eventRegistry.has(element)) {
      const events = eventRegistry.get(element);
      const updatedEvents = events.filter(
        ev => !(ev.type === eventType && ev.handler === handler)
      );
      
      if (updatedEvents.length > 0) {
        eventRegistry.set(element, updatedEvents);
      } else {
        eventRegistry.delete(element);
      }
    }
    
    return true;
  } catch (error) {
    console.warn(`Error al eliminar evento ${eventType}:`, error);
    return false;
  }
}

/**
 * Elimina todos los eventos registrados de un elemento
 * @param {HTMLElement} element - Elemento del que eliminar los eventos
 * @returns {boolean} Éxito de la operación
 */
export function removeAllEvents(element) {
  if (!element || !eventRegistry.has(element)) {
    return false;
  }
  
  try {
    const events = eventRegistry.get(element);
    events.forEach(({ type, handler, options }) => {
      element.removeEventListener(type, handler, options);
    });
    
    eventRegistry.delete(element);
    return true;
  } catch (error) {
    console.warn('Error al eliminar todos los eventos:', error);
    return false;
  }
}

/**
 * Gestiona timeouts y permite su limpieza adecuada
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Tiempo de espera en ms
 * @param {string} key - Identificador único para el timeout
 * @returns {number} ID del timeout
 */
export function setManagedTimeout(callback, delay, key) {
  if (typeof callback !== 'function' || typeof delay !== 'number') {
    console.warn('Parámetros inválidos para setManagedTimeout');
    return -1;
  }
  
  if (key && timeoutRegistry[key]) {
    clearTimeout(timeoutRegistry[key]);
  }
  
  const timeoutId = setTimeout(() => {
    if (typeof callback === 'function') {
      callback();
    }
    if (key) delete timeoutRegistry[key];
  }, delay);
  
  if (key) timeoutRegistry[key] = timeoutId;
  
  return timeoutId;
}

/**
 * Limpia timeouts gestionados
 * @param {string} key - Identificador del timeout a limpiar, si se omite se limpian todos
 */
export function clearManagedTimeouts(key) {
  if (key && timeoutRegistry[key]) {
    clearTimeout(timeoutRegistry[key]);
    delete timeoutRegistry[key];
  } else if (!key) {
    Object.keys(timeoutRegistry).forEach(timeoutKey => {
      clearTimeout(timeoutRegistry[timeoutKey]);
      delete timeoutRegistry[timeoutKey];
    });
  }
}

/**
 * Vacía un elemento
 * @param {HTMLElement} element - Elemento a vaciar
 * @returns {boolean} Éxito de la operación
 */
export function clearElement(element) {
  if (!element) {
    return false;
  }
  
  try {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    return true;
  } catch (error) {
    console.warn('Error al vaciar elemento:', error);
    
    try {
      element.innerHTML = '';
      return true;
    } catch (innerError) {
      console.warn('Error en fallback al vaciar elemento:', innerError);
      return false;
    }
  }
}

/**
 * Oculta un elemento
 * @param {HTMLElement} element - Elemento a ocultar
 * @returns {boolean} Éxito de la operación
 */
export function hideElement(element) {
  if (!element) {
    return false;
  }
  
  try {
    element.style.display = 'none';
    return true;
  } catch (error) {
    console.warn('Error al ocultar elemento:', error);
    return false;
  }
}

/**
 * Muestra un elemento
 * @param {HTMLElement} element - Elemento a mostrar
 * @param {string} displayValue - Valor de display (por defecto 'block')
 * @returns {boolean} Éxito de la operación
 */
export function showElement(element, displayValue = 'block') {
  if (!element) {
    return false;
  }
  
  try {
    element.style.display = displayValue;
    return true;
  } catch (error) {
    console.warn('Error al mostrar elemento:', error);
    return false;
  }
}

/**
 * Comprueba si un elemento contiene una clase
 * @param {HTMLElement} element - Elemento a comprobar
 * @param {string} className - Clase a comprobar
 * @returns {boolean} true si el elemento contiene la clase
 */
export function hasClass(element, className) {
  if (!element || !className) {
    return false;
  }
  
  try {
    return element.classList.contains(className);
  } catch (error) {
    console.warn(`Error al comprobar clase ${className}:`, error);
    
    return new RegExp(`(^| )${className}( |$)`, 'gi').test(element.className);
  }
}

/**
 * Añade una clase a un elemento
 * @param {HTMLElement} element - Elemento al que añadir la clase
 * @param {string} className - Clase a añadir
 * @returns {boolean} Éxito de la operación
 */
export function addClass(element, className) {
  if (!element || !className) {
    return false;
  }
  
  try {
    element.classList.add(className);
    return true;
  } catch (error) {
    console.warn(`Error al añadir clase ${className}:`, error);
    return false;
  }
}

/**
 * Elimina una clase de un elemento
 * @param {HTMLElement} element - Elemento del que eliminar la clase
 * @param {string} className - Clase a eliminar
 * @returns {boolean} Éxito de la operación
 */
export function removeClass(element, className) {
  if (!element || !className) {
    return false;
  }
  
  try {
    element.classList.remove(className);
    return true;
  } catch (error) {
    console.warn(`Error al eliminar clase ${className}:`, error);
    return false;
  }
}

/**
 * Alterna una clase en un elemento
 * @param {HTMLElement} element - Elemento en el que alternar la clase
 * @param {string} className - Clase a alternar
 * @returns {boolean} Éxito de la operación
 */
export function toggleClass(element, className) {
  if (!element || !className) {
    return false;
  }
  
  try {
    element.classList.toggle(className);
    return true;
  } catch (error) {
    console.warn(`Error al alternar clase ${className}:`, error);
    return false;
  }
}

/**
 * Establece o modifica un atributo de forma segura
 * @param {HTMLElement} element - Elemento a modificar
 * @param {string} attributeName - Nombre del atributo
 * @param {string} value - Valor del atributo
 * @returns {boolean} Éxito de la operación
 */
export function setAttribute(element, attributeName, value) {
  if (!element || !attributeName) {
    return false;
  }
  
  try {
    element.setAttribute(attributeName, value);
    return true;
  } catch (error) {
    console.warn(`Error al establecer atributo ${attributeName}:`, error);
    return false;
  }
}

/**
 * Obtiene un atributo de forma segura
 * @param {HTMLElement} element - Elemento del que obtener el atributo
 * @param {string} attributeName - Nombre del atributo
 * @returns {string|null} Valor del atributo o null si no existe
 */
export function getAttribute(element, attributeName) {
  if (!element || !attributeName) {
    return null;
  }
  
  try {
    return element.getAttribute(attributeName);
  } catch (error) {
    console.warn(`Error al obtener atributo ${attributeName}:`, error);
    return null;
  }
}

/**
 * Elimina un atributo de forma segura
 * @param {HTMLElement} element - Elemento del que eliminar el atributo
 * @param {string} attributeName - Nombre del atributo
 * @returns {boolean} Éxito de la operación
 */
export function removeAttribute(element, attributeName) {
  if (!element || !attributeName) {
    return false;
  }
  
  try {
    element.removeAttribute(attributeName);
    return true;
  } catch (error) {
    console.warn(`Error al eliminar atributo ${attributeName}:`, error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearManagedTimeouts();
  });
}

/**
 * Detecta si el panel de preview está abierto
 * @returns {boolean} true si está abierto
 */
export function isPreviewPanelOpen() {
  const panel = document.querySelector('#preview-panel');
  return panel && panel.classList.contains('open');
}

/**
 * Detecta si el panel de PDF está abierto  
 * @returns {boolean} true si está abierto
 */
export function isPDFPanelOpen() {
  const panel = document.querySelector('.pdf-panel');
  return panel && panel.classList.contains('visible');
}

/**
 * Cierra el panel de preview de forma directa
 * @returns {boolean} true si se cerró exitosamente
 */
export function closePreviewPanel() {
  try {
    // Método 1: Intentar usar la función importada
import('../../pdf/components/preview-panel-pdf.js')
      .then(module => {
        if (typeof module.closePreviewPanel === 'function') {
          module.closePreviewPanel();
          console.log('Preview panel cerrado vía función importada');
        } else {
          closePreviewPanelDirect();
        }
      })
      .catch(() => {
        closePreviewPanelDirect();
      });
    
    return true;
  } catch (error) {
    console.warn('Error cerrando preview panel:', error);
    return closePreviewPanelDirect();
  }
}

/**
 * Cierra el panel de PDF de forma directa
 * @returns {boolean} true si se cerró exitosamente  
 */
export function closePDFPanel() {
  try {
    // Método 1: Intentar usar la función importada
import('../../pdf/services/pdf-state.js')
      .then(module => {
        if (typeof module.togglePDFPanel === 'function') {
          module.togglePDFPanel(false);
          console.log('PDF panel cerrado vía función importada');
        } else {
          closePDFPanelDirect();
        }
      })
      .catch(() => {
        closePDFPanelDirect();
      });
    
    return true;
  } catch (error) {
    console.warn('Error cerrando PDF panel:', error);
    return closePDFPanelDirect();
  }
}

/**
 * Cierra el preview panel directamente via DOM
 */
function closePreviewPanelDirect() {
  try {
    const panel = document.querySelector('#preview-panel');
    if (panel && panel.classList.contains('open')) {
      panel.classList.remove('open');
      document.body.classList.remove('preview-panel-active');
      
      setTimeout(() => {
        if (panel && !panel.classList.contains('open')) {
          panel.style.display = 'none';
        }
      }, 300);
      
      console.log('Preview panel cerrado vía DOM directo');
      return true;
    }
  } catch (error) {
    console.error('Error cerrando preview panel directamente:', error);
  }
  return false;
}

/**
 * Cierra el PDF panel directamente via DOM
 */
function closePDFPanelDirect() {
  try {
    const panel = document.querySelector('.pdf-panel');
    if (panel && panel.classList.contains('visible')) {
      panel.classList.remove('visible');
      document.body.classList.remove('pdf-panel-active');
      
      setTimeout(() => {
        if (panel && !panel.classList.contains('visible')) {
          panel.style.display = 'none';
        }
      }, 300);
      
      console.log('PDF panel cerrado vía DOM directo');
      return true;
    }
  } catch (error) {
    console.error('Error cerrando PDF panel directamente:', error);
  }
  return false;
}

export default {
  createElement,
  createElementWithHTML,
  addEvent,
  removeEvent,
  removeAllEvents,
  setManagedTimeout,
  clearManagedTimeouts,
  clearElement,
  hideElement,
  showElement,
  hasClass,
  addClass,
  removeClass,
  toggleClass,
  sanitizeText,
  setAttribute,
  getAttribute,
  removeAttribute
};