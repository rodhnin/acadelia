/**
 * clipboard.js - Utilidades mejoradas para interacciones con el portapapeles
 * Versión optimizada con integración de DOM helpers y mejoras de seguridad
 */

import {
  createElementWithHTML,
  setManagedTimeout,
  addEvent,
  removeAllEvents,
  sanitizeText,
  getAttribute
} from '../../shared/dom-helpers.js';

import { showAcadelManualCopyModal } from '../ui/modals-matematico.js';

// Constante para identificar timeouts de botones de copia
const CLIPBOARD_TIMEOUT_PREFIX = 'clipboard_btn_';

/**
 * Copia texto al portapapeles utilizando la API Clipboard moderna
 * @param {string} text - Texto a copiar
 * @param {Object} options - Opciones adicionales (button, showNotification)
 * @returns {Promise} - Promesa que se resuelve cuando el texto se copia exitosamente
 */
export async function copyToClipboard(text, options = {}) {
  const { button, showNotification = true } = options;
  
  let originalButtonContent = '';
  if (button) {
    originalButtonContent = button.innerHTML;
  }
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      
      if (button) {
        updateButtonState(button, 'success', originalButtonContent);
      }
      
      if (showNotification) {
        acadelExito("📋 ¡Texto copiado!", "Acadel guardó todo en tu portapapeles como un profesional");
      }
      
      return true;
    } catch (error) {
      if (button) {
        updateButtonState(button, 'error', originalButtonContent);
      }
      
      // Si el error es por permisos, intentar con el método alternativo
      return copyToClipboardFallback(text, { button, showNotification });
    }
  }
  
  // Navegadores que no soportan la API Clipboard
  return copyToClipboardFallback(text, { button, showNotification });
}

async function copyToClipboardFallback(text, options = {}) {
  const { button, showNotification = true } = options;
  
  let originalButtonContent = '';
  if (button) {
    originalButtonContent = button.innerHTML;
  }
  
  try {
    console.log('🦫 Acadel: Usando método de copia manual con modal académica');
    
    if (button) {
      updateButtonState(button, 'processing', originalButtonContent);
    }
    
    const userInteracted = await showAcadelManualCopyModal(text, options);
    
    if (userInteracted) {
      // El usuario interactuó con la modal de Acadel
      if (button) {
        updateButtonState(button, 'success', originalButtonContent);
      }
      
      // Notificación académica personalizada
      if (showNotification) {
        if (window.acadelInfo) {
          window.acadelInfo(
            "🦫✨ ¡Misión de Acadel completada!", 
            "Tu profesor favorito organizó todo el contenido académico para que puedas copiarlo fácilmente. ¡Recuerda usar Ctrl+C!"
          );
        }
      }
      
      return true;
    } else {
      throw new Error('No se pudo mostrar la interfaz de copia manual');
    }
    
  } catch (error) {
    console.error('Error en fallback de copia:', error);
    
    if (button) {
      updateButtonState(button, 'error', originalButtonContent);
    }
    
    // Notificación de error académica
    if (showNotification) {
      if (window.acadelWarning) {
        window.acadelWarning(
          "🦫⚠️ Acadel necesita tu ayuda", 
          "Tu chigüire académico no pudo configurar la copia automática. Intenta seleccionar y copiar el texto manualmente con Ctrl+C"
        );
      }
    }
    
    return false;
  }
}

export function updateButtonState(button, state, originalContent) {
  if (!button) return;
  
  let newContent = '';
  const timeoutKey = `${CLIPBOARD_TIMEOUT_PREFIX}${button.id || Math.random().toString(36).substring(2, 9)}`;
  
  switch (state) {
    case 'success':
      newContent = '<i class="bx bx-check"></i>';
      button.classList.add('copied');
      button.classList.remove('error', 'processing');
      break;
    case 'error':
      newContent = '<i class="bx bx-x"></i> Error';
      button.classList.add('error');
      button.classList.remove('copied', 'processing');
      break;
    case 'processing':
      newContent = '<i class="bx bx-loader-alt bx-spin"></i> Acadel...';
      button.classList.add('processing');
      button.classList.remove('copied', 'error');
      break;
    default:
      newContent = originalContent || '<i class="bx bx-copy"></i> Copiar';
      button.classList.remove('copied', 'error', 'processing');
  }
  
  const tempElement = createElementWithHTML('div', {}, newContent);
  button.innerHTML = tempElement.innerHTML;
  
  if (state !== 'default') {
    const restoreDelay = state === 'processing' ? 5000 : 2000; // Más tiempo para processing
    
    setManagedTimeout(() => {
      const tempDefaultElement = createElementWithHTML('div', {}, originalContent || '<i class="bx bx-copy"></i> Copiar');
      button.innerHTML = tempDefaultElement.innerHTML;
      button.classList.remove('copied', 'error', 'processing');
    }, restoreDelay, timeoutKey);
  }
}

/**
 * Adjunta eventos de copia a todos los botones de copia en un contenedor
 * @param {HTMLElement} container - Contenedor con botones de copia
 */
export function attachCopyEvents(container) {
  if (!container) return;
  
  const copyButtons = container.querySelectorAll('.copy-button');
  
  copyButtons.forEach(button => {
    removeAllEvents(button);
    
    addEvent(button, 'click', () => {
      const blockId = getAttribute(button, 'data-target');
      const codeBlock = blockId ? document.getElementById(blockId) : button.closest('.code-block');
      
      if (codeBlock) {
        const codeElement = codeBlock.querySelector('code');
        if (codeElement) {
          copyToClipboard(codeElement.textContent, { button });
        }
      }
    });
  });
}

/**
 * Copia todo el contenido de un elemento, extrayendo su texto de forma inteligente
 * @param {HTMLElement} container - Elemento contenedor
 * @param {Object} options - Opciones adicionales
 * @returns {Promise} Promesa que se resuelve cuando el contenido se copia
 */
export function copyElementContent(container, options = {}) {
  if (!container) {
    return Promise.reject(new Error('Contenedor no válido'));
  }
  
  let textContent = '';
  
  const codeBlocks = container.querySelectorAll('pre code');
  
  if (codeBlocks.length > 0) {
    // Si hay bloques de código, extraerlos específicamente
    codeBlocks.forEach((block, index) => {
      if (index > 0) textContent += '\n\n';
      
      const className = block.className || '';
      const language = className.replace('language-', '').trim();
      
      if (language && language !== 'text') {
        textContent += `Código (${sanitizeText(language)}):\n`;
      } else {
        textContent += 'Código:\n';
      }
      
      textContent += block.textContent;
    });
  } else {
    textContent = extractTextContent(container);
  }
  
  textContent = textContent.replace(/\n{3,}/g, '\n\n').trim();
  
  return copyToClipboard(textContent, options);
}

/**
 * Función optimizada para extraer texto de todos los nodos
 * @param {HTMLElement} node - Nodo del que extraer texto
 * @returns {string} Texto extraído
 */
function extractTextContent(node) {
  if (!node) return '';
  
  // Elementos que requieren saltos de línea adicionales
  const needsLineBreak = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'LI'];
  const needsDoubleLineBreak = ['DIV', 'P', 'TABLE'];
  
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Casos especiales
    if (node.tagName === 'CODE' && node.parentNode && node.parentNode.tagName === 'PRE') {
      return node.textContent + '\n\n';
    } else if (node.tagName === 'TD' || node.tagName === 'TH') {
      return node.textContent + '\t';
    } else if (node.tagName === 'BR') {
      return '\n';
    }
    
    let result = '';
    const childNodes = Array.from(node.childNodes);
    
    // Optimización: pre-calcular capacidad
    let capacity = 0;
    childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        capacity += child.textContent.length;
      }
    });
    
    childNodes.forEach(child => {
      result += extractTextContent(child);
    });
    
    if (needsLineBreak.includes(node.tagName)) {
      result += '\n';
    }
    if (needsDoubleLineBreak.includes(node.tagName)) {
      result += '\n';
    }
    
    return result;
  }
  
  return '';
}

/**
 * Verifica si es posible copiar al portapapeles
 * @returns {boolean} - true si es posible copiar, false en caso contrario
 */
export function canCopyToClipboard() {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

export default {
  copyToClipboard,
  updateButtonState,
  attachCopyEvents,
  copyElementContent,
  canCopyToClipboard
};