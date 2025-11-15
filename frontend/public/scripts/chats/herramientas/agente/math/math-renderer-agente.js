/**
 * math-renderer.js - Sistema optimizado para el renderizado de expresiones matemáticas
 * Versión optimizada con mejor rendimiento y gestión de recursos
 */

import { LATEX_PATTERNS } from '../core/config-agente.js';
import { renderMath } from './mathjax-config-agente.js';
import { wrapWithDelimiters, processTrigFunctions } from './latex-utils-agente.js';
import {
  createElement,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../../shared/dom-helpers.js';

// Configuración
const CONFIG = {
  OBSERVER_DEBOUNCE: 100,
  PROCESS_BATCH_KEY: 'math-process-batch'
};

// Expresiones regulares precompiladas
const REGEX = {
  MATH_DELIMITERS: /\$\$(.*?)\$\$|\$(.*?)\$|\\\[(.*?)\\\]|\\\((.*?)\\\)/gs,
  HAS_DELIMITERS: /\$|\\\(|\\\[/,
  WHITESPACE: /(\s+)/
};

const processedNodesCache = new WeakMap();

// Observador central para matemáticas
let mathObserver = null;

/**
 * Detecta y prepara expresiones matemáticas en un texto
 * @param {string} text - Texto a procesar
 * @returns {string} - Texto procesado con delimitadores
 */
export function prepareTextWithMath(text) {
  if (!text) return '';
  
  // Si ya tiene delimitadores, devolverlo tal cual
  if (LATEX_PATTERNS.delimiters.test(text)) {
    return text;
  }
  
  const parts = text.split(REGEX.WHITESPACE);
  const processedParts = parts.map(part => {
    if (LATEX_PATTERNS.commands.test(part)) {
      return wrapWithDelimiters(part, true);
    }
    return part;
  });
  
  return processedParts.join('');
}

/**
 * Detecta y marca matemáticas en un elemento para renderizado
 * @param {HTMLElement} element - Elemento a procesar
 */
export function detectAndMarkMathInElement(element) {
  if (!element) return;
  
  if (processedNodesCache.has(element)) {
    return;
  }
  
  const textNodes = Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE);
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    
    if (LATEX_PATTERNS.commands.test(text) && !LATEX_PATTERNS.delimiters.test(text)) {
      const span = createElement('span', {
        className: 'math-content'
      });
      span.innerHTML = wrapWithDelimiters(text, true);
      
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
  
  processedNodesCache.set(element, true);
  
  const childElements = Array.from(element.children)
    .filter(child => 
      !child.classList.contains('math-content') && 
      !child.classList.contains('MathJax') &&
      !processedNodesCache.has(child)
    );
                    
  childElements.forEach(detectAndMarkMathInElement);
}

/**
 * Preprocesa un mensaje antes de enviarlo
 * @param {string} message - Mensaje a procesar
 * @returns {string} - Mensaje procesado
 */
export function preprocessMathForSubmission(message) {
  if (!message || !hasMathDelimiters(message)) return message;

  return message.replace(REGEX.MATH_DELIMITERS, 
    (match, block, inline) => {
      const math = block || inline;
      if (!math) return match;
      
      let processed = processTrigFunctions(math);
      
      return match.startsWith('$$') ? 
        `$$${processed}$$` : 
        `$${processed}$`;
    });
}

/**
 * Verifica si hay delimitadores matemáticos en el texto
 * @param {string} text - Texto a verificar
 * @returns {boolean} - true si contiene delimitadores
 */
function hasMathDelimiters(text) {
  return REGEX.HAS_DELIMITERS.test(text);
}

/**
 * Limpia el observador de matemáticas
 */
export function cleanupMathObserver() {
  if (mathObserver) {
    mathObserver.disconnect();
    mathObserver = null;
  }
  
  clearManagedTimeouts(CONFIG.PROCESS_BATCH_KEY);
}

/**
 * Configura un observador único para el renderizado de matemáticas
 * @returns {MutationObserver} - Observador configurado
 */
export function setupMathObserver() {
  // Evitar observadores duplicados
  cleanupMathObserver();
  
  mathObserver = new MutationObserver(mutations => {
    const elementsToProcess = [];
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const contentElem = node.querySelector('.message-content');
            if (contentElem && !processedNodesCache.has(contentElem)) {
              elementsToProcess.push(contentElem);
            }
          }
        });
      }
    });
    
    if (elementsToProcess.length > 0) {
      setManagedTimeout(() => {
        elementsToProcess.forEach(detectAndMarkMathInElement);
        renderMath(elementsToProcess).catch(() => {
          // Silenciar errores en producción
        });
      }, CONFIG.OBSERVER_DEBOUNCE, CONFIG.PROCESS_BATCH_KEY);
    }
  });
  
  const chatMessages = document.querySelector('.chat-messages');
  if (chatMessages) {
    mathObserver.observe(chatMessages, { childList: true, subtree: true });
  }
  
  return mathObserver;
}

/**
 * Procesa y renderiza matemáticas en todos los mensajes existentes
 * @returns {Promise} - Promesa que se resuelve cuando termina el procesamiento
 */
export function processAllChatMessages() {
  const messages = document.querySelectorAll('.message-content');
  
  if (messages.length === 0) {
    return Promise.resolve();
  }
  
  const messagesToProcess = Array.from(messages).filter(
    msg => !processedNodesCache.has(msg)
  );
  
  if (messagesToProcess.length === 0) {
    return Promise.resolve();
  }
  
  messagesToProcess.forEach(detectAndMarkMathInElement);
  
  return renderMath(messagesToProcess).catch(() => {
    // Silenciar errores en producción
  });
}

/**
 * Limpia la caché de nodos procesados
 * @param {HTMLElement} [node] - Nodo específico a limpiar, si se omite se limpia todo
 */
export function clearProcessedCache(node = null) {
  if (node) {
    processedNodesCache.delete(node);
  } else {
    // No podemos limpiar un WeakMap completamente, pero será recolectado por el GC
    // cuando los nodos sean eliminados
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMathObserver);
}

export default {
  prepareTextWithMath,
  detectAndMarkMathInElement,
  preprocessMathForSubmission,
  setupMathObserver,
  cleanupMathObserver,
  processAllChatMessages,
  clearProcessedCache
};