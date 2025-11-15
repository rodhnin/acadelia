/**
 * acadel-emoji-integration.js - Integración del sistema Acadel emoji
 * Sistema del Profesor Acadel para CUALQUIER chat
 */

import acadelEmojiManager from './acadel-emoji-manager.js';

class AcadelEmojiIntegration {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicialización sistema Acadel emoji - funciona en CUALQUIER chat
   */
  async init() {
    console.log('🎨 Inicializando sistema Acadel emoji...');
    
    try {
      const success = await acadelEmojiManager.init();
      
      if (success) {
        this.enhanceAcadelMessageRenderer();
        
        this.initialized = true;
        console.log('✅ Sistema Acadel emoji listo para TODOS los chats');
        return true;
      } else {
        throw new Error('No se pudo inicializar el sistema Acadel');
      }
    } catch (error) {
      console.error('❌ Error en sistema Acadel emoji:', error);
      return false;
    }
  }

  /**
   * Mejora el renderizador de mensajes con sistema Acadel
   */
  enhanceAcadelMessageRenderer() {
    // Interceptar función de renderizado si existe (cualquier nombre)
    const possibleRenderFunctions = [
      'renderMessage',
      'addMessage', 
      'displayMessage',
      'showMessage',
      'appendMessage'
    ];

    possibleRenderFunctions.forEach(funcName => {
      const originalFunction = window[funcName];
      
      if (typeof originalFunction === 'function') {
        window[funcName] = function(...args) {
          const result = originalFunction.apply(this, args);
          
          setTimeout(() => {
            const possibleSelectors = [
              '.chat-messages .message:last-child',
              '.messages .message:last-child',
              '.chat-container .message:last-child',
              '[class*="message"]:last-child',
              '.chat-messages > *:last-child'
            ];

            for (const selector of possibleSelectors) {
              const lastMessage = document.querySelector(selector);
              if (lastMessage && window.acadelEmojiManager?.initialized) {
                window.acadelEmojiManager.enhanceWithAcadel(lastMessage);
                break;
              }
            }
          }, 100);
          
          return result;
        };
        
        console.log(`🔧 Función ${funcName} mejorada con sistema Acadel`);
      }
    });
  }

  /**
   * Métodos públicos Acadel
   */
  processMessage(messageElement) {
    if (this.initialized && acadelEmojiManager.initialized) {
      acadelEmojiManager.enhanceWithAcadel(messageElement);
    }
  }

  forceProcessAll() {
    if (this.initialized && acadelEmojiManager.initialized) {
      acadelEmojiManager.forceProcessAll();
    }
  }

  /**
   * Limpieza de recursos
   */
  destroy() {
    if (acadelEmojiManager) {
      acadelEmojiManager.destroy();
    }
    this.initialized = false;
  }
}

/**
 * Hook Acadel para mejorar cualquier renderizador de mensajes
 */
export function enhanceAcadelMessageRenderer() {
  const integration = new AcadelEmojiIntegration();
  integration.enhanceAcadelMessageRenderer();
}

const acadelEmojiIntegration = new AcadelEmojiIntegration();

// Hacer disponible globalmente
window.acadelEmojiManager = acadelEmojiManager;
window.acadelEmojiIntegration = acadelEmojiIntegration;

export default acadelEmojiIntegration;