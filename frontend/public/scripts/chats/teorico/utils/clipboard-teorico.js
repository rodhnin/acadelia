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

// ⭐ NUEVA IMPORTACIÓN: Modal de copia manual de Acadel
import { showAcadelManualCopyModal } from '../ui/modals-teorico.js';

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
  
  // Guardar el contenido original del botón si existe
  let originalButtonContent = '';
  if (button) {
    originalButtonContent = button.innerHTML;
  }
  
  // Intentar usar la API moderna de portapapeles
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      
      // ⭐ MEJORADO: Notificación más académica y amigable
      if (showNotification) {
        if (window.acadelExito) {
          window.acadelExito("🦫📋 ¡Copiado por Acadel!", "Tu chigüire académico favorito guardó todo perfectamente en el portapapeles");
        } else {
          // Fallback si no existe la función de notificaciones
          console.log('✅ Texto copiado exitosamente al portapapeles');
        }
      }
      
      // Actualizar botón con estado de éxito
      if (button) {
        updateButtonState(button, 'success', originalButtonContent);
      }
      
      return true;
    } catch (error) {
      console.warn('Error al copiar con API moderna:', error);
      
      // Actualizar el botón con estado de error si se proporcionó
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

/**
 * ⭐ COMPLETAMENTE RENOVADO: Manejador de fallback usando la modal de Acadel
 * @param {string} text - Texto a copiar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise} - Promesa que se resuelve según el resultado
 */
async function copyToClipboardFallback(text, options = {}) {
  const { button, showNotification = true } = options;
  
  // Guardar el contenido original del botón si existe
  let originalButtonContent = '';
  if (button) {
    originalButtonContent = button.innerHTML;
  }
  
  try {
    // ⭐ NUEVO: Usar la modal académica de Acadel en lugar de window.prompt
    console.log('🦫 Acadel: Usando método de copia manual con modal académica');
    
    // Actualizar botón para mostrar que se está procesando
    if (button) {
      updateButtonState(button, 'processing', originalButtonContent);
    }
    
    // Mostrar la modal de Acadel para copia manual
    const userInteracted = await showAcadelManualCopyModal(text, options);
    
    if (userInteracted) {
      // El usuario interactuó con la modal de Acadel
      if (button) {
        updateButtonState(button, 'success', originalButtonContent);
      }
      
      // ⭐ NUEVA NOTIFICACIÓN: Mensaje académico personalizado
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
      // Si por alguna razón no se pudo mostrar la modal
      throw new Error('No se pudo mostrar la interfaz de copia manual');
    }
    
  } catch (error) {
    console.error('Error en fallback de copia:', error);
    
    // ⭐ ÚLTIMO RECURSO: Solo si la modal también falla
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

/**
 * ⭐ MEJORADO: Actualiza el estado visual de un botón de copia con nuevos estados
 * @param {HTMLElement} button - Elemento botón
 * @param {string} state - Estado ('success', 'error', 'processing', 'default')
 * @param {string} originalContent - Contenido original para restaurar
 */
export function updateButtonState(button, state, originalContent) {
  if (!button) return;
  
  let newContent = '';
  const timeoutKey = `${CLIPBOARD_TIMEOUT_PREFIX}${button.id || Math.random().toString(36).substring(2, 9)}`;
  
  switch (state) {
    case 'success':
      newContent = '<i class="bx bx-check"></i> ¡Listo!';
      button.classList.add('copied');
      button.classList.remove('error', 'processing');
      break;
    case 'error':
      newContent = '<i class="bx bx-x"></i> Error';
      button.classList.add('error');
      button.classList.remove('copied', 'processing');
      break;
    case 'processing':  // ⭐ NUEVO ESTADO
      newContent = '<i class="bx bx-loader-alt bx-spin"></i> Acadel...';
      button.classList.add('processing');
      button.classList.remove('copied', 'error');
      break;
    default:
      newContent = originalContent || '<i class="bx bx-copy"></i> Copiar';
      button.classList.remove('copied', 'error', 'processing');
  }
  
  // Usar createElementWithHTML para mayor seguridad
  const tempElement = createElementWithHTML('div', {}, newContent);
  button.innerHTML = tempElement.innerHTML;
  
  // Restaurar el estado original después de un tiempo usando el sistema centralizado de timeouts
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
    // Eliminar eventos anteriores para evitar duplicados
    removeAllEvents(button);
    
    // Añadir nuevo evento con sistema de registro
    addEvent(button, 'click', async () => {
      const blockId = getAttribute(button, 'data-target');
      const codeBlock = blockId ? document.getElementById(blockId) : button.closest('.code-block');
      
      if (codeBlock) {
        const codeElement = codeBlock.querySelector('code');
        if (codeElement) {
          // ⭐ MEJORADO: Mejor manejo de errores y feedback
          try {
            await copyToClipboard(codeElement.textContent, { button });
          } catch (error) {
            console.error('Error al copiar código:', error);
            updateButtonState(button, 'error', button.innerHTML);
          }
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
  
  // Extraer el contenido en texto plano
  let textContent = '';
  
  // Verificar bloques de código primero
  const codeBlocks = container.querySelectorAll('pre code');
  
  if (codeBlocks.length > 0) {
    // Si hay bloques de código, extraerlos específicamente
    codeBlocks.forEach((block, index) => {
      if (index > 0) textContent += '\n\n';
      
      // Intentar obtener el lenguaje
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
    // Extraer texto usando una versión optimizada del algoritmo recursivo
    textContent = extractTextContent(container);
  }
  
  // Limpiar el texto (eliminar múltiples saltos de línea y espacios en blanco)
  textContent = textContent.replace(/\n{3,}/g, '\n\n').trim();
  
  // ⭐ NUEVO: Añadir firma académica de Acadel si el texto es largo
  if (textContent.length > 500) {
    textContent += '\n\n---\n📚 Contenido copiado con Acadel - Tu asistente académico favorito 🦫';
  }
  
  // Copiar al portapapeles
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
  
  // Usar textContent para casos simples que no requieren formato especial
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
    
    // Para el resto de nodos, recorrer hijos
    let result = '';
    const childNodes = Array.from(node.childNodes);
    
    // Optimización: pre-calcular capacidad
    let capacity = 0;
    childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        capacity += child.textContent.length;
      }
    });
    
    // Construir resultado de manera eficiente
    childNodes.forEach(child => {
      result += extractTextContent(child);
    });
    
    // Añadir saltos de línea después del elemento según corresponda
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
 * ⭐ MEJORADO: Verifica si es posible copiar al portapapeles y proporciona información útil
 * @returns {Object} - Objeto con información sobre las capacidades de copia
 */
export function canCopyToClipboard() {
  const hasModernAPI = !!(navigator.clipboard && navigator.clipboard.writeText);
  const hasSecureContext = window.isSecureContext;
  const hasFallback = typeof showAcadelManualCopyModal === 'function';
  
  return {
    modern: hasModernAPI,
    secure: hasSecureContext,
    fallback: hasFallback,
    available: hasModernAPI || hasFallback,
    // ⭐ NUEVO: Mensaje académico sobre el estado
    acadelMessage: hasModernAPI ? 
      "🦫✨ Acadel tiene acceso completo al portapapeles" : 
      "🦫📋 Acadel usará el método manual académico para copiar"
  };
}

/**
 * ⭐ NUEVA FUNCIÓN: Copia inteligente que decide automáticamente el mejor método
 * @param {string} text - Texto a copiar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise} - Promesa que se resuelve cuando se completa la copia
 */
export function smartCopyToClipboard(text, options = {}) {
  const capabilities = canCopyToClipboard();
  
  // Log académico para debugging
  console.log('🦫 Acadel Smart Copy:', capabilities.acadelMessage);
  
  return copyToClipboard(text, {
    ...options,
    showNotification: options.showNotification !== false // Por defecto mostrar notificaciones
  });
}

export default {
  copyToClipboard,
  smartCopyToClipboard,  // ⭐ NUEVA EXPORTACIÓN
  updateButtonState,
  attachCopyEvents,
  copyElementContent,
  canCopyToClipboard
};