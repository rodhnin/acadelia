/**
 * selection-utils.js - Utilidades para selección de texto en el PDF
 * Con notificaciones Acadel para interacciones importantes del usuario
 */

/**
 * Obtiene el texto seleccionado actualmente
 * @returns {Object} - Objeto con información de la selección
 */
export function getSelectedText() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) {
      return { 
        text: '', 
        range: null, 
        rect: null, 
        hasSelection: false 
      };
    }
    
    // Obtener información de rango y rectángulo
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    return {
      text: selectedText,
      range: range,
      rect: rect,
      hasSelection: true
    };
  }
  
  /**
   * Verifica si una selección está dentro de un contenedor específico
   * @param {Selection} selection - Objeto Selection
   * @param {HTMLElement} container - Elemento contenedor
   * @returns {boolean} - true si la selección está dentro del contenedor
   */
  export function isSelectionInContainer(selection, container) {
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    
    // El nodo común más cercano debe estar dentro del contenedor
    return container.contains(range.commonAncestorContainer);
  }
  
  /**
   * Crea un tooltip contextual para la selección
   * @param {Object} position - Posición donde mostrar el tooltip {top, left}
   * @param {Array} actions - Array de acciones {id, icon, text, handler}
   * @returns {HTMLElement} - Elemento del tooltip
   */
  export function createSelectionTooltip(position, actions) {
    // Verificar si ya existe un tooltip y eliminarlo
    removeSelectionTooltip();
    
    // Crear nuevo tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'selection-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '10000';
    tooltip.style.left = `${position.left}px`;
    tooltip.style.top = `${position.top}px`;
    
    // Crear botones para cada acción
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'selection-action-btn';
      button.title = action.text;
      button.innerHTML = `<i class='bx ${action.icon}'></i>`;
      button.dataset.action = action.id;
      
      // Agregar evento de clic
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
        removeSelectionTooltip();
      });
      
      tooltip.appendChild(button);
    });
    
    // Agregar al DOM
    document.body.appendChild(tooltip);
    
    // Centrar horizontalmente
    const tooltipWidth = tooltip.offsetWidth;
    tooltip.style.left = `${position.left - (tooltipWidth / 2)}px`;
    
    return tooltip;
  }
  
  /**
   * Elimina cualquier tooltip de selección existente
   */
  export function removeSelectionTooltip() {
    const existingTooltip = document.querySelector('.selection-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }
  
  /**
   * Copia texto al portapapeles con notificaciones Acadel
   * @param {string} text - Texto a copiar
   * @returns {Promise<boolean>} - true si se copió correctamente
   */
  export async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      
      // Notificación de éxito con Acadel
      acadelExito("📋 Texto copiado", "Acadel guardó el texto en tu portapapeles");
      
      return true;
    } catch (error) {
      // Método alternativo de copia (fallback)
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          acadelExito("📋 Texto copiado", "Acadel usó un método alternativo para copiar el texto");
          return true;
        } else {
          throw new Error('Falló el método alternativo');
        }
      } catch (fallbackError) {
        // Notificación de error con Acadel
        acadelError("No se pudo copiar", "Acadel no puede acceder al portapapeles. Intenta seleccionar y copiar manualmente");
        return false;
      }
    }
  }
  
  /**
   * Resalta temporalmente un texto en un elemento
   * @param {HTMLElement} element - Elemento donde resaltar
   * @param {string} textToHighlight - Texto a resaltar
   * @param {number} duration - Duración en ms
   */
  export function highlightText(element, textToHighlight, duration = 3000) {
    // Si no hay texto o elemento, salir (sin notificación, es uso interno)
    if (!element || !textToHighlight) return;
    
    // Texto original para restaurar
    const originalContent = element.innerHTML;
    
    // Escapar caracteres especiales en el texto a resaltar
    const escapedText = textToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Crear regex con palabras completas
    const regex = new RegExp(`(${escapedText})`, 'gi');
    
    // Aplicar resaltado
    element.innerHTML = originalContent.replace(
      regex, 
      '<span class="pdf-highlighted-text">$1</span>'
    );
    
    // Restaurar después del tiempo especificado
    setTimeout(() => {
      element.innerHTML = originalContent;
    }, duration);
  }
  
  /**
   * Determina la posición óptima para mostrar un tooltip basado en un rectángulo
   * @param {DOMRect} rect - Rectángulo de referencia
   * @returns {Object} - Posición óptima {top, left}
   */
  export function getOptimalTooltipPosition(rect) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Posición predeterminada (encima del texto)
    let top = rect.top - 40; // 40px encima
    
    // Si no hay suficiente espacio arriba, mostrar debajo
    if (top < 10) {
      top = rect.bottom + 10;
    }
    
    // Centrar horizontalmente
    let left = rect.left + (rect.width / 2);
    
    // Asegurar que no se salga del viewport
    left = Math.max(20, Math.min(viewportWidth - 20, left));
    top = Math.max(20, Math.min(viewportHeight - 60, top));
    
    return { top, left };
  }
  
  /**
   * Genera un objeto con acciones comunes para selección de texto con notificaciones Acadel
   * @param {string} selectedText - Texto seleccionado
   * @returns {Array} - Array de acciones para tooltip
   */
  export function getCommonTextActions(selectedText) {
    return [
      {
        id: 'copy',
        icon: 'bx-copy',
        text: 'Copiar',
        handler: async () => {
          await copyTextToClipboard(selectedText);
        }
      },
      {
        id: 'search',
        icon: 'bx-search-alt',
        text: 'Buscar',
        handler: () => {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`, '_blank');
          acadelInfo("🔍 Búsqueda abierta", "Acadel abrió una nueva pestaña para buscar el texto seleccionado");
        }
      },
      {
        id: 'ask',
        icon: 'bx-chat',
        text: 'Preguntar',
        handler: () => {
          sendToChat(`¿Puedes explicarme sobre "${selectedText}"?`);
        }
      },
      {
        id: 'analyze',
        icon: 'bx-analyse',
        text: 'Analizar',
        handler: () => {
          sendToChat(`Analiza detalladamente el siguiente texto:\n\n"${selectedText}"`);
        }
      }
    ];
  }
  
  /**
   * Envía un mensaje al chat con notificaciones Acadel
   * @param {string} message - Mensaje a enviar
   */
  async function sendToChat(message) {
    try {
      // Intenta usar el sistema principal de chat
      let sentSuccessfully = false;
      
      try {
        // Intentar importar handleSendMessage de chat-controller
        const chatController = await import('../../core/chat-controller.js');
        
        if (chatController && chatController.handleSendMessage) {
          // Configurar mensaje en el textarea
          const textarea = document.getElementById('messageInput');
          if (textarea) {
            textarea.value = message;
            
            // Disparar evento para avisarle al sistema de chat
            const event = new CustomEvent('sendMessageRequest');
            window.dispatchEvent(event);
            
            sentSuccessfully = true;
          }
        } else if (typeof window.handleSendMessage === 'function') {
          // Usar función global si está disponible
          const textarea = document.getElementById('messageInput');
          if (textarea) {
            textarea.value = message;
            window.handleSendMessage();
            sentSuccessfully = true;
          }
        }
      } catch (importError) {
        // Error silencioso para desarrolladores
        console.warn('No se pudo importar chat-controller:', importError);
      }
      
      // Si no se pudo enviar por métodos regulares, intenta con API
      if (!sentSuccessfully) {
        // Importar función de envío de mensaje
        const { sendMessage } = await import('../../api/messages.js');
        const { getState } = await import('../../core/state.js');
        
        const chatId = getState('currentChatId');
        if (chatId) {
          await sendMessage(message, chatId);
          sentSuccessfully = true;
          
          // Cerrar panel de PDF si está abierto
          const { togglePDFPanel } = await import('../services/pdf-state.js');
          togglePDFPanel(false);
        }
      }
      
      if (sentSuccessfully) {
        // Notificación de éxito con Acadel
        acadelExito("💬 Pregunta enviada", "Acadel recibió tu consulta sobre el texto seleccionado");
      } else {
        throw new Error('No se pudo enviar el mensaje');
      }
    } catch (error) {
      // Notificación de error con Acadel
      acadelError("No se pudo enviar", "Acadel no puede enviar tu pregunta al chat. Intenta escribirla manualmente");
    }
  }
  
  export default {
    getSelectedText,
    isSelectionInContainer,
    createSelectionTooltip,
    removeSelectionTooltip,
    copyTextToClipboard,
    highlightText,
    getOptimalTooltipPosition,
    getCommonTextActions
  };