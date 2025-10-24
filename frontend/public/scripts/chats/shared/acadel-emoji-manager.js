/**
 * acadel-emoji-manager.js - Sistema de emojis del Profesor Acadel
 * Detecta y cambia capibaras AL INSTANTE, sin perder ninguna notificación
 */

class AcadelEmojiManager {
  constructor() {
    this.initialized = false;
    this.processing = false;
    this.processedElements = new WeakSet();
    
    // 🎯 Ruta de tu imagen de capibara
    this.capibaraImagePath = '/images/capibara-emoji.webp';
  }

  /**
   * Inicialización del sistema Acadel
   */
  async init() {
    console.log('🦫 Cargando sistema de emojis del Profesor Acadel...');
    
    try {
      // Verificar que la imagen existe
      await this.preloadCapibaraImage();
      
      // CSS para la imagen (MISMOS ESTILOS QUE TIENES)
      this.addImageCSS();
      
      // Observer ULTRA RÁPIDO para tiempo real
      this.setupUltraFastObserver();
      
      // Observer adicional para capturas perdidas
      this.setupBackupObserver();
      
      // Procesar contenido existente
      this.replaceExistingCapibaras();
      
      this.initialized = true;
      console.log('✅ Sistema Acadel emoji activado - Chat tiempo real');
      return true;
      
    } catch (error) {
      console.warn('⚠️ No se pudo cargar el sistema Acadel emoji:', error);
      console.warn('📁 Verifica que la imagen esté en:', this.capibaraImagePath);
      return false;
    }
  }

  /**
   * Precargar imagen para verificar que existe
   */
  preloadCapibaraImage() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('📸 Imagen Acadel precargada exitosamente');
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`No se encontró la imagen: ${this.capibaraImagePath}`));
      };
      
      img.src = this.capibaraImagePath;
    });
  }

  /**
   * CSS EXACTO como lo tienes configurado
   */
  addImageCSS() {
    if (document.getElementById('acadel-emoji-styles')) return;

    const style = document.createElement('style');
    style.id = 'acadel-emoji-styles';
    style.textContent = `
      /* Imagen real del capibara Acadel */
      .acadel-emoji-image {
        height: 2em;
        width: 2em;
        margin: 0 0.05em 0 0.1em;
        vertical-align: -0.5em;
        display: inline-block;
        object-fit: contain;
        user-select: none;
        draggable: false;
        pointer-events: none;
        border-radius: 2px;
      }
      
      /* Efecto hover opcional */
      .acadel-emoji-image:hover {
        transform: scale(1.05);
        transition: transform 0.2s ease;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 CSS Acadel emoji aplicado');
  }

  /**
   * Detectar emoji de capibara en texto
   */
  containsCapibara(text) {
    if (!text) return false;
    return text.includes('🦫');
  }

  /**
   * Observer ULTRA RÁPIDO principal
   */
  setupUltraFastObserver() {
    if (this.ultraFastObserver) return;

    this.ultraFastObserver = new MutationObserver((mutations) => {
      // SIN DELAY - procesar INMEDIATAMENTE
      mutations.forEach(mutation => {
        // Procesar nodos agregados AL INSTANTE
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processElementInstantly(node);
          } else if (node.nodeType === Node.TEXT_NODE && this.containsCapibara(node.textContent)) {
            this.replaceCapibaraInTextNode(node);
          }
        });
        
        // Procesar cambios de texto AL INSTANTE
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          if (this.containsCapibara(mutation.target.textContent)) {
            this.replaceCapibaraInTextNode(mutation.target);
          }
        }
      });
    });

    // Observar con configuración ULTRA AGRESIVA
    this.ultraFastObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false, // No necesitamos atributos para velocidad
      attributeOldValue: false,
      characterDataOldValue: false
    });

    console.log('⚡ Observer Acadel ULTRA RÁPIDO activado');
  }

  /**
   * Observer de backup para capturas perdidas
   */
  setupBackupObserver() {
    // Observer adicional que verifica cada 50ms por si algo se perdió
    this.backupInterval = setInterval(() => {
      if (this.processing) return;
      
      // Buscar rápidamente si hay capibaras sin procesar
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            return this.containsCapibara(node.textContent) && 
                   !node.parentElement?.querySelector('.acadel-emoji-image') ? 
              NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        },
        false
      );

      let foundUnprocessed = false;
      let node;
      while (node = walker.nextNode()) {
        this.replaceCapibaraInTextNode(node);
        foundUnprocessed = true;
      }
      
      if (foundUnprocessed) {
        console.log('🔄 Backup Acadel: Capturados capibaras perdidos');
      }
    }, 50); // Verificar cada 50ms

    console.log('🛡️ Observer de backup Acadel activado');
  }

  /**
   * Procesar elemento INSTANTÁNEAMENTE
   */
  processElementInstantly(element) {
    if (!element || !this.initialized) return;
    
    try {
      // Buscar INMEDIATAMENTE todos los nodos de texto con capibaras
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            return this.containsCapibara(node.textContent) ? 
              NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        },
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      // Procesar TODOS los nodos encontrados SIN DELAY
      textNodes.forEach(textNode => {
        this.replaceCapibaraInTextNode(textNode);
      });
      
    } catch (error) {
      console.warn('⚠️ Error procesando elemento Acadel:', error);
    }
  }

  /**
   * Reemplazar capibara en un nodo de texto específico
   */
  replaceCapibaraInTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent;
    if (!this.containsCapibara(text)) return;

    try {
      console.log('🦫 ¡Profesor Acadel detectado! Reemplazando AL INSTANTE...');
      
      // Crear un fragment para los nuevos nodos
      const fragment = document.createDocumentFragment();
      
      // Dividir el texto en partes
      const parts = text.split('🦫');
      
      for (let i = 0; i < parts.length; i++) {
        // Agregar el texto antes del emoji
        if (parts[i]) {
          fragment.appendChild(document.createTextNode(parts[i]));
        }
        
        // Agregar la imagen del capibara (excepto en la última parte)
        if (i < parts.length - 1) {
          const img = document.createElement('img');
          img.className = 'acadel-emoji-image';
          img.src = this.capibaraImagePath;
          img.alt = '🦫';
          img.title = 'Capibara Profesor Acadel';
          img.draggable = false;
          
          fragment.appendChild(img);
        }
      }
      
      // Reemplazar el nodo de texto original con el fragment
      textNode.parentNode.replaceChild(fragment, textNode);
      
      console.log('✅ Profesor Acadel reemplazado INSTANTÁNEAMENTE');
      
    } catch (error) {
      console.warn('⚠️ Error reemplazando Profesor Acadel:', error);
    }
  }

  /**
   * Procesar todo el contenido existente de forma segura
   */
  replaceExistingCapibaras() {
    if (!this.initialized) return;
    
    console.log('🔄 Buscando Profesor Acadel en toda la app...');
    
    // Procesar body completo instantáneamente
    this.processElementInstantly(document.body);
    
    console.log('✅ Todos los Profesor Acadel procesados sin romper estructura');
  }

  /**
   * API compatible con sistema existente
   */
  enhanceWithAcadel(element) {
    this.processElementInstantly(element);
  }

  processElement(element) {
    if (this.initialized && element) {
      this.processElementInstantly(element);
    }
  }

  processExistingContent() {
    if (!this.initialized) return;
    this.replaceExistingCapibaras();
  }

  forceProcessAll() {
    // SIN delay para tiempo real
    this.replaceExistingCapibaras();
  }

  /**
   * Mantener compatibilidad
   */
  containsEmojis(element) {
    if (!element || !element.textContent) return false;
    return this.containsCapibara(element.textContent);
  }

  /**
   * Función de test con imagen
   */
  testAcadelEmoji() {
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '¡Prueba del sistema 🦫 Acadel emoji!';
    testDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #fff; padding: 15px; border: 2px solid #333; border-radius: 8px; z-index: 9999; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    document.body.appendChild(testDiv);
    
    // Procesar el test instantáneamente
    this.processElementInstantly(testDiv);
    
    // Remover después de 5 segundos
    setTimeout(() => testDiv.remove(), 5000);
    
    console.log('🦫 Test Acadel emoji ejecutado');
  }

  /**
   * Cambiar imagen (útil para testing)
   */
  setCapibaraImage(newPath) {
    console.log(`🔄 Cambiando imagen Acadel a: ${newPath}`);
    this.capibaraImagePath = newPath;
    
    this.preloadCapibaraImage().then(() => {
      console.log('✅ Nueva imagen Acadel cargada');
      this.forceProcessAll();
    }).catch(error => {
      console.error('❌ Error cargando nueva imagen Acadel:', error);
    });
  }

  /**
   * Obtener información del estado
   */
  getStatus() {
    return {
      initialized: this.initialized,
      imagePath: this.capibaraImagePath,
      processing: this.processing,
      mode: 'acadel-ultra-fast-realtime'
    };
  }

  /**
   * Limpieza
   */
  destroy() {
    if (this.ultraFastObserver) {
      this.ultraFastObserver.disconnect();
      this.ultraFastObserver = null;
    }
    
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    
    this.processedElements = new WeakSet();
    this.processing = false;
    this.initialized = false;
  }
}

// Crear instancia global
const acadelEmojiManager = new AcadelEmojiManager();

// Funciones globales útiles con nombres Acadel
window.testAcadelEmoji = () => acadelEmojiManager.testAcadelEmoji();
window.setAcadelCapibaraImage = (path) => acadelEmojiManager.setCapibaraImage(path);
window.getAcadelEmojiStatus = () => acadelEmojiManager.getStatus();

// Exportar
export default acadelEmojiManager;