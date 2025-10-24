/**
 * scroll-manager.js - Sistema centralizado de gestión de scroll para el chat
 * 
 * Este módulo centraliza toda la lógica de scroll para evitar comportamientos inconsistentes
 * causados por múltiples implementaciones en diferentes partes de la aplicación.
 */

// Configuración del sistema de scroll
const SCROLL_CONFIG = {
  // Retardos para los intentos de scroll (en ms)
  delays: {
    immediate: 0,    // Inmediato (siguiente ciclo de eventos)
    fast: 10,        // Muy rápido para capturar cambios pequeños
    medium: 50,      // Para cuando el contenido podría estar aún renderizándose
    slow: 150,       // Para cuando el DOM podría estar cambiando
    final: 300       // Intento final en caso de que todo lo demás falle
  },
  
  // Banderas de comportamiento
  behavior: {
    useAutoInsteadOfSmooth: true,    // Usar 'auto' en lugar de 'smooth' para evitar animaciones lentas
    forceReflowBeforeScroll: true,   // Forzar reflow antes del scroll para garantizar dimensiones correctas
    useMultipleAttempts: true,       // Usar múltiples intentos escalonados para scroll robusto
    useAggressiveScroll: true,       // Usar técnicas más agresivas para situaciones difíciles
    debugMode: false                 // Activar logs de depuración detallados (false en producción)
  }
};

// Registro centralizado de timeouts
const timeoutRegistry = {};

/**
 * Establece un timeout con gestión centralizada
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Tiempo de espera en ms
 * @param {string} key - Identificador único para el timeout
 * @returns {number} ID del timeout
 */
function setManagedTimeout(callback, delay, key) {
  // Limpiar timeout previo si existe con la misma clave
  if (key && timeoutRegistry[key]) {
    clearTimeout(timeoutRegistry[key]);
  }
  
  const timeoutId = setTimeout(() => {
    if (key) {
      delete timeoutRegistry[key];
    }
    callback();
  }, delay);
  
  if (key) {
    timeoutRegistry[key] = timeoutId;
  }
  
  return timeoutId;
}

/**
 * Limpia un timeout gestionado
 * @param {string} key - Identificador del timeout
 */
function clearManagedTimeout(key) {
  if (key && timeoutRegistry[key]) {
    clearTimeout(timeoutRegistry[key]);
    delete timeoutRegistry[key];
  }
}

/**
 * Limpia todos los timeouts gestionados
 */
function clearAllManagedTimeouts() {
  Object.keys(timeoutRegistry).forEach(key => {
    clearTimeout(timeoutRegistry[key]);
    delete timeoutRegistry[key];
  });
}

/**
 * Clase principal para gestionar todas las operaciones de scroll
 */
class ScrollManager {
  constructor() {
    this.pendingScrollOperations = 0;
    this.scrollLocked = false;
    this.chatContainer = null;
    this.lastScrollTarget = null;
    this.observers = [];
    this.isInitialized = false;
    this.lockReason = null;
    this._lockStartTime = null;
    this._lockHistory = [];
    this.lockTimeout = null;
  }
  
  /**
   * Inicializa el administrador de scroll con soporte para exámenes
   * @param {Object} config - Configuración opcional
   */
  init(config = {}) {
    // Fusionar configuración personalizada con la predeterminada
    this.config = { ...SCROLL_CONFIG };
    if (config.delays) this.config.delays = { ...this.config.delays, ...config.delays };
    if (config.behavior) this.config.behavior = { ...this.config.behavior, ...config.behavior };
    
    // Inicializar timestamp para la última interacción con examen
    this._lastExamInteractionTime = null;
    
    // Obtener el contenedor de chat
    this.chatContainer = document.querySelector('.chat-messages');
    
    if (!this.chatContainer) {
      if (this.config.behavior.debugMode) {
        console.warn('ScrollManager: No se encontró el contenedor de chat. El scroll podría no funcionar correctamente.');
      }
    } else {
      // Configurar observador de mutación para detectar cambios en los mensajes
      this.setupMutationObserver();
      
      // Configurar observador de resize para manejar cambios de tamaño
      this.setupResizeObserver();
      
      // Observador específico para el indicador de carga
      this.setupTypingLoaderObserver();
      
      // Configurar observador específico para interacciones con exámenes
      this.setupExamInteractionObserver();
      
      this.isInitialized = true;
      this.log('ScrollManager inicializado correctamente con soporte para exámenes');
    }
    
    // Intervalo de seguridad para evitar bloqueos permanentes
    this._safetyInterval = setInterval(() => {
      // Si hay un bloqueo activo de más de 5 segundos con razón de examen, desbloquearlo
      if (this.scrollLocked && this.lockReason && 
          (this.lockReason.includes('exam') || this._lastExamInteractionTime)) {
        
        const timeSinceLock = this._lockStartTime ? (Date.now() - this._lockStartTime) : 5000;
        
        if (timeSinceLock > 5000) { // 5 segundos como tiempo máximo de bloqueo
          this.log('Seguridad: Desbloqueando scroll bloqueado por examen por más de 5 segundos');
          this.unlockScrollWithReason('safety-timeout');
          
          // Limpiar cualquier atributo de interacción de examen
          const examContainers = document.querySelectorAll('[data-exam-interaction-active], [data-exam-navigation]');
          examContainers.forEach(container => {
            container.removeAttribute('data-exam-interaction-active');
            container.removeAttribute('data-exam-navigation');
          });
        }
      }
    }, 1000); // Verificar cada segundo
    
    // Guardar para limpieza en destroy()
    this.observers.push({ disconnect: () => clearInterval(this._safetyInterval) });
    
    if (this.chatContainer) {
      this.setupImageObserver();
    }
    
    return this;
  }

  /**
 * Añadir este método a la clase ScrollManager
 * Configura un observador para detectar nuevas imágenes añadidas al chat
 */
setupImageObserver() {
  if (!this.chatContainer) return;
  
  const imageObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Buscar nuevas imágenes en nodos añadidos
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const container = node.classList?.contains('message') ? node : null;
            const images = node.querySelectorAll?.('.markdown-image') || [];
            
            if (container && images.length > 0) {
              this.setupImagePositionMaintenance(container);
            }
          }
        });
      }
    }
  });
  
  // Observar cambios en el contenedor de chat
  imageObserver.observe(this.chatContainer, {
    childList: true,
    subtree: true
  });
  
  // Guardar referencia al observador
  this.observers.push(imageObserver);
  
  this.log('Observador de imágenes configurado');
}

  /**
   * Configura un observador específico para detectar interacciones con exámenes
   */
  setupExamInteractionObserver() {
    if (!this.chatContainer) return;
    
    const examClickHandler = (e) => {
      // Verificar si el click fue en una opción de examen
      if (e.target.closest('[data-exam-option]') || 
          e.target.closest('.option') ||
          e.target.closest('[data-exam-navigation]') ||
          e.target.closest('.next-question')) {
        
        this._lastExamInteractionTime = Date.now();
        this.log('Click detectado en elemento de examen, bloqueando scroll');
        
        // Bloquear scroll temporalmente
        this.lockScrollWithReason('exam-interaction-click', 2000);
      }
    };
    
    // Agregar listener de click al contenedor principal
    this.chatContainer.addEventListener('click', examClickHandler);
    
    // Guardar referencia para poder removerlo después
    this._examClickHandler = examClickHandler;
    
    this.log('Observador de interacciones con exámenes configurado');
  }

  /**
 * Verifica si hay un cambio de tema en progreso
 * @returns {boolean} - true si hay un cambio de tema activo
 */
isThemeChanging() {
  // Verificar el atributo específico en documentElement
  if (document.documentElement && document.documentElement.getAttribute('data-theme-changing') === 'true') {
    this.log('Detectado cambio de tema en progreso');
    return true;
  }
  
  // Verificar si hay un bloqueo de scroll por razón de cambio de tema
  if (this.scrollLocked && this.lockReason === 'theme-toggle-operation') {
    this.log('Bloqueo de scroll por cambio de tema activo');
    return true;
  }
  
  return false;
}
    
  /**
   * Configura observador de mutaciones para detectar cambios en los mensajes
   * con exclusión de interacciones de response-interaction
   */
  setupMutationObserver() {
    if (!this.chatContainer) return;
    
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScroll = false;
      let newMessageAdded = false;
      let loadingMessageAdded = false;
      let targetElement = null;
      
      // Verificar si la mutación está relacionada con response-interaction
      const isResponseInteractionMutation = (mutation) => {
        // Caso 1: Añadiendo botones de interacción a un mensaje
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('response-actions') || 
                  node.classList?.contains('user-response-actions') ||
                  node.classList?.contains('edit-overlay')) {
                return true;
              }
            }
          }
        }
        
        // Caso 2: Cambiando clases relacionadas con ratings
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const targetClassList = mutation.target.classList;
          if (targetClassList && (
              targetClassList.contains('rated-positive') || 
              targetClassList.contains('rated-negative') ||
              targetClassList.contains('message-rated') ||
              targetClassList.contains('editing-message'))) {
            return true;
          }
        }
        
        // Caso 3: Atributos relacionados con feedback
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-feedback-saved' || 
             mutation.attributeName === 'data-server-id')) {
          return true;
        }
        
        return false;
      };
      
      // Analizar las mutaciones para determinar si debemos hacer scroll
      for (const mutation of mutations) {
        // Omitir mutaciones relacionadas con response-interaction
        if (isResponseInteractionMutation(mutation)) {
          this.log('Ignorando mutación relacionada con response-interaction');
          continue;
        }

        // Omitir mutaciones de sidebar/preview
        if (isSidebarOrPreviewPanelMutation.call(this, mutation)) {
          this.log('Ignorando mutación relacionada con sidebar o preview panel');
          continue;
        }
        
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isMessage = node.classList?.contains('message');
              const isAiMessage = node.classList?.contains('ai-message');
              const isLoading = node.classList?.contains('processing');
              
              if (isMessage) {
                shouldScroll = true;
                targetElement = node;
                newMessageAdded = true;
                
                if (isAiMessage && isLoading) {
                  loadingMessageAdded = true;
                }
              }
              
              // Buscar anidados también (por ejemplo, un loader dentro de un mensaje)
              const typingLoader = node.querySelector('.typing-loader');
              if (typingLoader) {
                loadingMessageAdded = true;
                shouldScroll = true;
                // Priorizar el contenedor del loader si lo encontramos
                targetElement = node.closest('.message') || node;
              }
            }
          }
        }
      }
      
      // Prioridad de scroll: loading > nuevo mensaje > cambio general
      if (shouldScroll) {
        if (loadingMessageAdded) {
          this.scrollToElement(targetElement, { 
            priority: 'high', 
            reason: 'loading-message-added' 
          });
        } else if (newMessageAdded) {
          this.scrollToElement(targetElement, { 
            priority: 'medium', 
            reason: 'new-message-added' 
          });
        } else {
          this.scrollToBottom({ 
            priority: 'low', 
            reason: 'content-changed' 
          });
        }
      }
    });
    
    // Observar cambios en el contenedor de chat y sus hijos
    mutationObserver.observe(this.chatContainer, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
      attributeOldValue: true // Importante para comparar valores anteriores
    });
    
    // Observar cambios en el body para preview-panel-active
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true
    });
    
    this.observers.push(mutationObserver);
  }

  /**
 * Añadir este método a la clase ScrollManager
 * Este método no bloquea el scroll, solo mantiene la posición relativa durante cambios de imagen
 */
maintainPositionDuringImageLoad(imageElement) {
  if (!imageElement || !this.chatContainer) return;
  
  const messageElement = imageElement.closest('.message');
  if (!messageElement) return;
  
  // Calcular posición relativa del mensaje antes de la carga
  const messageTopPosition = messageElement.offsetTop - this.chatContainer.scrollTop;
  
  // Evento para cuando la imagen termina de cargar
  const handleImageLoad = () => {
    // Solo ajustar si el usuario no ha scrolleado manualmente mientras tanto
    if (!this._userScrolled) {
      // Calcular la nueva posición manteniendo la posición relativa del mensaje
      const newScrollTop = messageElement.offsetTop - messageTopPosition;
      
      // Solo aplicar si la diferencia es significativa para evitar micro-ajustes
      if (Math.abs(this.chatContainer.scrollTop - newScrollTop) > 5) {
        // Usar scrollTo con behavior auto para evitar animación
        this.chatContainer.scrollTo({
          top: newScrollTop,
          behavior: 'auto'
        });
        
        this.log(`Posición de scroll ajustada durante carga de imagen: ${newScrollTop}px`);
      }
    }
    
    // Limpiar listeners
    imageElement.removeEventListener('load', handleImageLoad);
    this.chatContainer.removeEventListener('wheel', markUserScrolled);
    this.chatContainer.removeEventListener('touchmove', markUserScrolled);
  };
  
  // Función para detectar si el usuario scrollea manualmente
  const markUserScrolled = () => {
    this._userScrolled = true;
    // Limpiar después de un tiempo
    setTimeout(() => {
      this._userScrolled = false;
    }, 1000);
  };
  
  // Si la imagen ya está cargada, no hacer nada
  if (imageElement.complete && imageElement.naturalWidth > 0) {
    return;
  }
  
  // Registrar eventos
  this._userScrolled = false;
  imageElement.addEventListener('load', handleImageLoad);
  this.chatContainer.addEventListener('wheel', markUserScrolled);
  this.chatContainer.addEventListener('touchmove', markUserScrolled);
}

/**
 * Añadir este método a la clase ScrollManager
 * Establece imágenes para mantener posición durante carga en un contenedor
 */
setupImagePositionMaintenance(container) {
  if (!container || !this.chatContainer) return;
  
  // Encontrar todas las imágenes en el contenedor
  const images = container.querySelectorAll('.markdown-image');
  
  if (images.length === 0) return;
  
  // Configurar mantenimiento de posición para cada imagen
  for (const image of images) {
    this.maintainPositionDuringImageLoad(image);
  }
  
  this.log(`Configurado mantenimiento de posición para ${images.length} imágenes`);
}

  /**
   * Verifica si hay diagramas actualizándose
   * @returns {boolean} - true si hay diagramas actualizándose
   */
  isDiagramsUpdating() {
    // 1. Verificar atributo en el body
    if (document.body.getAttribute('data-updating-diagrams') === 'true') {
      this.log('Bloqueando scroll automático porque hay diagramas actualizándose');
      return true;
    }
    
    // 2. Verificar elementos individuales
    const updatingDiagrams = document.querySelectorAll('[data-updating="true"]');
    if (updatingDiagrams.length > 0) {
      this.log(`Bloqueando scroll automático porque hay ${updatingDiagrams.length} diagramas actualizándose`);
      return true;
    }
    
    // 3. Verificar si el scroll está bloqueado por operaciones de zoom
    if (this.scrollLocked && this.lockReason && this.lockReason.startsWith('mermaid-')) {
      const lockDuration = this._lockStartTime ? (Date.now() - this._lockStartTime) : 0;
      this.log(`Scroll bloqueado por operación de zoom: ${this.lockReason} durante ${lockDuration}ms`);
      return true;
    }
    
    // 4. Verificar elementos con atributos de zoom activo
    const activeZoomElements = document.querySelectorAll('[data-zoom-active="true"]');
    if (activeZoomElements.length > 0) {
      this.log(`Detectados ${activeZoomElements.length} elementos con zoom activo`);
      return true;
    }
    
    return false;
  }

  /**
   * Método para obtener información de diagnóstico sobre el estado del scroll
   * Útil para depuración y para mostrar al usuario en caso de problemas
   * @returns {Object} - Información de diagnóstico
   */
  getScrollDiagnostics() {
    return {
      isScrollLocked: this.scrollLocked,
      lockReason: this.lockReason,
      lockStartTime: this._lockStartTime,
      lockDuration: this._lockStartTime ? (Date.now() - this._lockStartTime) : 0,
      lockHistory: this._lockHistory ? this._lockHistory.slice(-10) : [],
      pendingOperations: this.pendingScrollOperations,
      diagramsUpdating: document.body.getAttribute('data-updating-diagrams') === 'true',
      updatingElements: document.querySelectorAll('[data-updating="true"]').length,
      zoomActiveElements: document.querySelectorAll('[data-zoom-active="true"]').length,
      examInteractionActive: this.isExamInteractionActive(),
      responseInteractionActive: this.isResponseInteractionActive(),
      lastExamInteraction: this._lastExamInteractionTime ? (Date.now() - this._lastExamInteractionTime) : null
    };
  }

  /**
   * Método para verificar y reparar bloqueos de scroll que hayan quedado huérfanos
   * Se puede llamar periódicamente o cuando se detecte un problema
   * @returns {boolean} - true si se realizó alguna reparación
   */
  checkAndRepairScrollLocks() {
    let repaired = false;
    
    // 1. Verificar bloqueos de larga duración
    if (this.scrollLocked && this._lockStartTime) {
      const lockDuration = Date.now() - this._lockStartTime;
      
      // Si un bloqueo dura más de 15 segundos, probablemente está huérfano
      if (lockDuration > 15000) {
        this.log(`Reparando bloqueo huérfano: ${this.lockReason} (duración: ${lockDuration}ms)`);
        this.unlockScrollWithReason('lock-repair-timeout');
        repaired = true;
      }
    }
    
    // 2. Verificar atributos de actualización huérfanos
    if (document.body.getAttribute('data-updating-diagrams') === 'true') {
      // Verificar si realmente hay elementos actualizándose
      const updatingElements = document.querySelectorAll('[data-updating="true"]');
      if (updatingElements.length === 0) {
        // No hay elementos actualizándose, podría ser un atributo huérfano
        document.body.removeAttribute('data-updating-diagrams');
        this.log('Reparando atributo data-updating-diagrams huérfano');
        repaired = true;
      }
    }
    
    // 3. Verificar y limpiar atributos de zoom activo huérfanos
    const zoomActiveElements = document.querySelectorAll('[data-zoom-active="true"]');
    zoomActiveElements.forEach(el => {
      // Verificar si el elemento está realmente en el DOM
      if (!document.body.contains(el)) {
        el.removeAttribute('data-zoom-active');
        repaired = true;
      }
    });
    
    return repaired;
  }
    
  /**
   * Configurar observador de resize para manejar cambios de tamaño
   */
  setupResizeObserver() {
    if (!this.chatContainer || !window.ResizeObserver) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      // Solo hacer scroll si estamos cerca del final (para no interrumpir lectura)
      if (this.isNearBottom()) {
        this.scrollToBottom({ 
          priority: 'low', 
          reason: 'container-resized',
          delay: this.config.delays.medium 
        });
      }
    });
    
    resizeObserver.observe(this.chatContainer);
    this.observers.push(resizeObserver);
  }
    
  /**
   * Configurar observador específico para el indicador de escritura
   * con exclusión de interacciones de response-interaction
   */
  setupTypingLoaderObserver() {
    if (!this.chatContainer) return;
    
    const loaderObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Ignorar si el cambio está dentro de un elemento de response-interaction
              if (node.closest('.response-actions') || 
                  node.closest('.user-response-actions') ||
                  node.closest('.edit-overlay')) {
                continue;
              }
              
              // Buscar loaders tanto directamente como anidados
              const isLoader = node.classList?.contains('typing-loader');
              const hasLoader = node.querySelector?.('.typing-loader');
              
              if (isLoader || hasLoader) {
                const targetElement = isLoader ? 
                  node.closest('.message') : 
                  (hasLoader ? node : null);
                
                if (targetElement) {
                  this.log('Typing loader detectado, aplicando scroll inmediato');
                  this.scrollToElement(targetElement, {
                    priority: 'critical',
                    reason: 'typing-loader-added',
                    forceAggressiveScroll: true
                  });
                }
              }
            }
          }
        }
      }
    });
    
    loaderObserver.observe(this.chatContainer, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(loaderObserver);
  }

  /**
   * Verifica si hay una interacción activa con el response
   * @returns {boolean} - true si hay una interacción activa
   */
  isResponseInteractionActive() {
    return (
      // Detectar mensaje en edición
      document.querySelector('.message.editing-message') !== null ||
      
      // Detectar modal de feedback
      document.querySelector('.feedback-modal') !== null ||
      
      // Detectar overlay de edición
      document.querySelector('.edit-overlay') !== null ||
      
      // Detectar atributos de data-response-interaction
      document.querySelector('[data-response-interaction="true"]') !== null ||
      
      // Detectar mensajes en proceso de retry
      document.querySelector('[data-response-interaction-processing="true"]') !== null ||
      
      // Detectar botones específicos en acción
      document.querySelector('.edit-confirm-btn, .edit-cancel-btn, .retry-btn.processing') !== null ||
      
      // Detectar interacciones con exámenes
      this.isExamInteractionActive()
    );
  }

  /**
   * Verifica si hay una interacción activa con un examen
   * @returns {boolean} - true si hay una interacción activa con un examen
   */
  isExamInteractionActive() {
    // Verificar si hay interacciones EXPLÍCITAS con exámenes
    const activeExamInteraction = document.querySelector('[data-exam-interaction-active="true"]');
    if (activeExamInteraction) {
      this.log('Detectada interacción activa con examen');
      return true;
    }
    
    // Verificar si hay navegación entre preguntas de examen
    const examNavigation = document.querySelector('[data-exam-navigation="true"]');
    if (examNavigation) {
      this.log('Detectada navegación entre preguntas de examen');
      return true;
    }
    
    // Reducir el tiempo de bloqueo después de un clic
    if (this._lastExamInteractionTime && (Date.now() - this._lastExamInteractionTime < 1000)) {
      this.log('Interacción reciente con examen (hace menos de 1s)');
      return true;
    }
    
    return false;
  }

  /**
   * Verificar si la mutación está relacionada con interacciones de examen
   * @param {MutationRecord} mutation - El objeto de mutación a verificar
   * @returns {boolean} - true si la mutación está relacionada con interacciones de examen
   */
  isExamInteractionMutation(mutation) {
    // Caso 1: Click en opciones de examen o cambios en su estado
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'class' || mutation.attributeName === 'disabled')) {
      const target = mutation.target;
      
      // Solo detectar interacciones con opciones/botones existentes, no el renderizado inicial
      if ((target.classList?.contains('option') && target.classList.contains('correct')) || 
          (target.classList?.contains('option') && target.classList.contains('incorrect')) ||
          (target.hasAttribute('data-exam-option') && target.disabled)) {
        
        // Registrar el momento de la interacción
        this._lastExamInteractionTime = Date.now();
        this.log('Detectada interacción con opción de examen (click en opción)');
        return true;
      }
      
      // Verificar si es un botón de navegación que ha sido activado
      if (target.closest('[data-exam-navigation]') || 
          target.hasAttribute('data-exam-navigation') ||
          target.classList?.contains('next-question')) {
        
        if (target.disabled || target.classList.contains('clicked')) {
          this.log('Detectada interacción con navegación de examen');
          return true;
        }
      }
    }
    
    // Caso 2: Cambios específicos que ocurren DESPUÉS de interactuar con el examen
    if (mutation.type === 'childList') {
      const explanationAdded = Array.from(mutation.addedNodes).some(node => 
        node.nodeType === Node.ELEMENT_NODE && 
        (node.classList?.contains('explanation') || node.querySelector?.('.explanation'))
      );
      
      if (explanationAdded) {
        this.log('Detectada adición de explicación (después de responder)');
        return true;
      }
    }
    
    // Caso 3: Atributos específicos que indican interacción activa
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'data-exam-interaction-active' || 
         mutation.attributeName === 'data-exam-navigation')) {
      // Solo cuando el valor es "true"
      if (mutation.target.getAttribute(mutation.attributeName) === 'true') {
        this.log('Detectado cambio en atributo de interacción de examen');
        return true;
      }
    }
    
    return false;
  }
    
  /**
   * Verifica si la vista está cerca del fondo del contenedor
   * con manejo adicional para interacciones de respuesta
   * @param {number} threshold - Umbral en píxeles
   * @returns {boolean} - true si está cerca del fondo
   */
  isNearBottom(threshold = 100) {
    if (!this.chatContainer) return true;
    
    // Usar el método central para verificar interacciones de respuesta
    if (this.isResponseInteractionActive()) {
      this.log('isNearBottom: Interacción de respuesta activa, evitando scroll automático');
      return false;
    }
    
    // Evitar scroll automático si hay diagramas actualizándose
    if (this.isDiagramsUpdating()) {
      this.log('isNearBottom: Diagramas actualizándose, evitando scroll automático');
      return false;
    }

    if (this.isThemeChanging()) {
      this.log('isNearBottom: Cambio de tema en progreso, evitando scroll automático');
      return false;
    }
    
    const { scrollTop, scrollHeight, clientHeight } = this.chatContainer;
    return scrollHeight - (scrollTop + clientHeight) <= threshold;
  }

  saveScrollPosition() {
    if (!this.chatContainer) return;
    
    this._savedScrollPosition = {
      top: this.chatContainer.scrollTop,
      left: this.chatContainer.scrollLeft,
      height: this.chatContainer.scrollHeight,
      timestamp: Date.now()
    };
    
    this.log(`Posición de scroll guardada: ${this._savedScrollPosition.top}px`);
  }

  /**
 * Restaura la posición de scroll guardada previamente
 * @param {boolean} force - Si es true, restaura incluso si han pasado más de 3 segundos
 */
restoreScrollPosition(force = false) {
  if (!this.chatContainer || !this._savedScrollPosition) return;
  
  // Verificar si la posición guardada es reciente (menos de 3 segundos)
  const elapsedTime = Date.now() - this._savedScrollPosition.timestamp;
  if (!force && elapsedTime > 3000) {
    this.log(`Posición de scroll descartada por antigüedad (${elapsedTime}ms)`);
    this._savedScrollPosition = null;
    return;
  }
  
  // Calcular ajuste si la altura del contenido ha cambiado
  const heightDiff = this.chatContainer.scrollHeight - this._savedScrollPosition.height;
  
  // Aplicar la posición guardada con posible ajuste
  this.chatContainer.scrollTop = this._savedScrollPosition.top + (heightDiff > 0 ? heightDiff : 0);
  this.chatContainer.scrollLeft = this._savedScrollPosition.left;
  
  this.log(`Posición de scroll restaurada a: ${this.chatContainer.scrollTop}px (ajuste: ${heightDiff}px)`);
  
  // Limpiar posición guardada después de usarla
  this._savedScrollPosition = null;
}
    
  /**
   * Función principal para hacer scroll al fondo del contenedor
   * @param {Object} options - Opciones de configuración
   */
  scrollToBottom(options = {}) {
    if (!this.chatContainer || this.scrollLocked) return false;
    
    const defaultOptions = {
      behavior: this.config.behavior.useAutoInsteadOfSmooth ? 'auto' : 'smooth',
      priority: 'medium',  // 'low', 'medium', 'high', 'critical'
      reason: 'manual',
      delay: 0,
      forceAggressiveScroll: false
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Si es el primer intento, programarlo para el siguiente ciclo
    if (opts.delay === 0 && !opts.isRetry) {
      setManagedTimeout(() => {
        this.scrollToBottom({ ...opts, delay: this.config.delays.immediate });
      }, 0, `scroll_bottom_${Date.now()}`);
      return true;
    }
    
    this.log(`Ejecutando scrollToBottom (prioridad: ${opts.priority}, razón: ${opts.reason})`);
    
    // Ejecutar scroll inmediato
    this.executeScroll(null, opts);
    
    // Configurar múltiples intentos si está habilitado
    if (this.config.behavior.useMultipleAttempts && !opts.isRetry) {
      this.scheduleMultipleScrollAttempts(null, opts);
    }
    
    return true;
  }
    
  /**
   * Hace scroll a un elemento específico
   * @param {HTMLElement} element - Elemento al que hacer scroll
   * @param {Object} options - Opciones de configuración
   */
  scrollToElement(element, options = {}) {
    if (!this.chatContainer || !element || this.scrollLocked) return false;
    
    const defaultOptions = {
      behavior: this.config.behavior.useAutoInsteadOfSmooth ? 'auto' : 'smooth',
      block: 'end',
      priority: 'medium',
      reason: 'manual',
      delay: 0,
      forceAggressiveScroll: false
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Si es el primer intento, programarlo para el siguiente ciclo
    if (opts.delay === 0 && !opts.isRetry) {
      setManagedTimeout(() => {
        this.scrollToElement(element, { ...opts, delay: this.config.delays.immediate });
      }, 0, `scroll_element_${Date.now()}`);
      return true;
    }
    
    this.log(`Ejecutando scrollToElement (prioridad: ${opts.priority}, razón: ${opts.reason})`);
    
    // Guardar referencia al último elemento objetivo
    this.lastScrollTarget = element;
    
    // Ejecutar scroll inmediato
    this.executeScroll(element, opts);
    
    // Configurar múltiples intentos si está habilitado
    if (this.config.behavior.useMultipleAttempts && !opts.isRetry) {
      this.scheduleMultipleScrollAttempts(element, opts);
    }
    
    return true;
  }
    
  /**
   * Programa múltiples intentos de scroll con diferentes retrasos
   * @param {HTMLElement|null} element - Elemento al que hacer scroll (o null para scrollToBottom)
   * @param {Object} options - Opciones de configuración
   */
  scheduleMultipleScrollAttempts(element, options) {
    const delays = [
      this.config.delays.fast,
      this.config.delays.medium,
      this.config.delays.slow,
      this.config.delays.final
    ];
    
    let attemptCount = 0;
    delays.forEach((delay, index) => {
      const isLastAttempt = index === delays.length - 1;
      const attemptOptions = {
        ...options,
        delay,
        isRetry: true,
        forceAggressiveScroll: options.forceAggressiveScroll || isLastAttempt
      };
      
      const timeoutKey = `scroll_attempt_${element ? element.id || Date.now() : Date.now()}_${index}`;
      
      setManagedTimeout(() => {
        attemptCount++;
        if (element) {
          this.executeScroll(element, attemptOptions);
        } else {
          this.executeScroll(null, attemptOptions);
        }
        
        if (isLastAttempt) {
          this.log(`Completados ${attemptCount} intentos de scroll`);
        }
      }, delay, timeoutKey);
    });
  }
    
  /**
   * Ejecuta una operación de scroll, ya sea a un elemento o al fondo
   * con verificación de interacciones de respuesta activas
   * @param {HTMLElement|null} element - Elemento al que hacer scroll (o null para scrollToBottom)
   * @param {Object} options - Opciones de configuración
   */
  executeScroll(element, options) {
    if (!this.chatContainer) return;
    
    // Usar el método central para verificar interacciones de respuesta
    if (this.isResponseInteractionActive()) {
      this.log('executeScroll: Omitiendo scroll debido a una interacción de respuesta activa');
      return;
    }
    
    // Incrementar contador de operaciones pendientes
    this.pendingScrollOperations++;
    
    try {
      // Forzar un reflow para que el navegador recalcule las dimensiones
      if (this.config.behavior.forceReflowBeforeScroll) {
        const reflow = this.chatContainer.offsetHeight;
      }
      
      // Primera técnica: scroll al contenedor
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      
      // Segunda técnica: scroll al elemento si existe
      if (element) {
        element.scrollIntoView({
          behavior: options.behavior,
          block: options.block
        });
      }
      
      // Técnicas agresivas para casos difíciles
      if (options.forceAggressiveScroll && this.config.behavior.useAggressiveScroll) {
        // Forzar otro reflow
        const forceReflow = this.chatContainer.offsetHeight;
        
        // Intentar mover el viewport también
        window.scrollTo(0, document.body.scrollHeight);
        
        // Combinar todas las técnicas de scroll
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight + 1000; // Valor grande para asegurar
      }
    } catch (error) {
      if (this.config.behavior.debugMode) {
        console.error('Error durante la operación de scroll:', error);
      }
    } finally {
      // Decrementar contador de operaciones pendientes
      this.pendingScrollOperations--;
    }
  }
    
  /**
   * Enfoca específicamente el elemento del typing-loader
   * @returns {boolean} - true si se encontró y enfocó un loader
   */
  focusTypingLoader() {
    const loader = document.querySelector('.typing-loader');
    if (!loader) return false;
    
    const loaderMessage = loader.closest('.message');
    if (!loaderMessage) return false;
    
    this.scrollToElement(loaderMessage, {
      priority: 'critical',
      reason: 'focus-typing-loader',
      forceAggressiveScroll: true
    });
    
    return true;
  }
    
  /**
   * Enfoca el último mensaje del chat
   * @returns {boolean} - true si se encontró y enfocó un mensaje
   */
  focusLastMessage() {
    if (!this.chatContainer) return false;
    
    const messages = this.chatContainer.querySelectorAll('.message');
    if (messages.length === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    
    this.scrollToElement(lastMessage, {
      priority: 'high',
      reason: 'focus-last-message'
    });
    
    return true;
  }
    
  /**
   * Inicia monitoreo periódico de scroll para mensajes de carga
   * Útil para casos especiales donde necesitamos asegurar que el loader sea visible
   * @param {number} duration - Duración total del monitoreo en milisegundos
   * @param {number} interval - Intervalo entre comprobaciones en milisegundos
   */
  startScrollMonitor(duration = 5000, interval = 250) {
    let elapsedTime = 0;
    let monitorTimeoutKey = `scroll_monitor_${Date.now()}`;
    
    const checkInterval = setInterval(() => {
      const loadingMessage = document.querySelector('.message.processing');
      if (loadingMessage) {
        this.scrollToElement(loadingMessage, {
          priority: 'high',
          reason: 'scroll-monitor',
          forceAggressiveScroll: elapsedTime > 1000 // Ser más agresivo después de 1 segundo
        });
      } else {
        // Si no hay mensajes de carga, intentar con el último mensaje
        this.focusLastMessage();
      }
      
      elapsedTime += interval;
      if (elapsedTime >= duration) {
        clearInterval(checkInterval);
        delete timeoutRegistry[monitorTimeoutKey];
        this.log('Monitoreo de scroll finalizado');
      }
    }, interval);
    
    // Guardar referencia al intervalo para poder cancelarlo si es necesario
    timeoutRegistry[monitorTimeoutKey] = checkInterval;
    
    return {
      stop: () => {
        if (timeoutRegistry[monitorTimeoutKey]) {
          clearInterval(timeoutRegistry[monitorTimeoutKey]);
          delete timeoutRegistry[monitorTimeoutKey];
          this.log('Monitoreo de scroll cancelado manualmente');
        }
      }
    };
  }

  /**
   * Bloquea el scroll con una razón específica
   * @param {string} reason - Razón del bloqueo
   * @param {number} duration - Duración del bloqueo en ms (0 = indefinido)
   */
  lockScrollWithReason(reason, duration = 0) {
    // Si ya está bloqueado con la misma razón, simplemente actualizar el tiempo
    if (this.scrollLocked && this.lockReason === reason) {
      this._lockStartTime = Date.now();
      
      // Si hay un timeout existente, renovarlo
      if (this.lockTimeout && duration > 0) {
        clearTimeout(this.lockTimeout);
        
        const timeoutKey = `scroll_lock_${reason}_${Date.now()}`;
        this.lockTimeout = setManagedTimeout(() => {
          this.scrollLocked = false;
          this.lockReason = null;
          this._lockStartTime = null;
          this.log(`Bloqueo de scroll liberado automáticamente después de ${duration}ms`);
        }, duration, timeoutKey);
      }
      
      this.log(`Bloqueo de scroll renovado: ${this.lockReason}`);
      return;
    }
    
    // Nuevo bloqueo
    this.scrollLocked = true;
    this.lockReason = reason || 'manual';
    this._lockStartTime = Date.now();
    
    // Registrar razones de bloqueo con timestamps
    if (!this._lockHistory) this._lockHistory = [];
    this._lockHistory.push({
      reason: this.lockReason,
      timestamp: this._lockStartTime,
      action: 'lock'
    });
    
    // Mantener el historial de tamaño razonable
    if (this._lockHistory.length > 50) {
      this._lockHistory = this._lockHistory.slice(-30);
    }
    
    if (duration > 0) {
      // Limpiar timeout anterior si existe
      if (this.lockTimeout) {
        clearTimeout(this.lockTimeout);
      }
      
      const timeoutKey = `scroll_lock_${reason}_${Date.now()}`;
      this.lockTimeout = setManagedTimeout(() => {
        this.scrollLocked = false;
        this.lockReason = null;
        this._lockStartTime = null;
        
        // Registrar desbloqueo en historial
        if (this._lockHistory) {
          this._lockHistory.push({
            reason: `${reason}-auto-timeout`,
            timestamp: Date.now(),
            action: 'unlock-auto'
          });
        }
        
        this.log(`Bloqueo de scroll liberado automáticamente después de ${duration}ms`);
      }, duration, timeoutKey);
    }
    
    this.log(`Scroll bloqueado por: ${this.lockReason} ${duration > 0 ? `por ${duration}ms` : 'indefinidamente'}`);
  }

  /**
   * Desbloquea el scroll con una razón específica
   * @param {string} reason - Razón del desbloqueo
   */
  unlockScrollWithReason(reason) {
    // Si no está bloqueado, no hacer nada
    if (!this.scrollLocked) {
      return;
    }
    
    // Limpiar timeout si existe
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
    
    const wasLocked = this.scrollLocked;
    const previousReason = this.lockReason;
    
    this.scrollLocked = false;
    this.lockReason = null;
    this._lockStartTime = null;
    
    // Registrar en historial
    if (this._lockHistory) {
      this._lockHistory.push({
        previousReason: previousReason,
        unlockReason: reason || 'manual',
        timestamp: Date.now(),
        action: 'unlock'
      });
    }
    
    if (wasLocked) {
      this.log(`Bloqueo de scroll liberado por: ${reason || 'manual'} (prev: ${previousReason || 'unknown'})`);
    }
  }
    
  /**
   * Bloquea temporalmente el scroll automático
   * Útil cuando el usuario está leyendo mensajes antiguos
   * @param {number} duration - Duración del bloqueo en ms (0 = indefinido)
   */
  lockScroll(duration = 0) {
    this.lockScrollWithReason('manual-lock', duration);
  }
    
  /**
   * Desbloquea el scroll automático
   */
  unlockScroll() {
    this.unlockScrollWithReason('manual-unlock');
  }
    
  /**
   * Registra mensajes de depuración si el modo debug está activo
   * @param {string} message - Mensaje a registrar
   */
  log(message) {
    if (this.config.behavior.debugMode) {
      console.log(`[ScrollManager] ${message}`);
    }
  }
    
  /**
   * Limpia todos los observadores y recursos
   */
  destroy() {
    // Detener todos los observadores
    this.observers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    
    // Eliminar event listener de exámenes
    if (this.chatContainer && this._examClickHandler) {
      this.chatContainer.removeEventListener('click', this._examClickHandler);
      this._examClickHandler = null;
    }
    
    // Limpiar todas las referencias y timeouts
    clearAllManagedTimeouts();
    this.observers = [];
    this.lastScrollTarget = null;
    this._lastExamInteractionTime = null;
    this.isInitialized = false;
    
    this.log('ScrollManager destruido');
  }

  /**
   * Configura detector de zoom del navegador
   */
  setupBrowserZoomHandler() {
    // Verificar que scrollManager existe
    if (!window.scrollManager) {
      if (this.config.behavior.debugMode) {
        console.warn('ScrollManager no está disponible, no se puede configurar el detector de zoom');
      }
      return;
    }
    
    // Variables para detectar zoom
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    let lastRatio = lastWidth / lastHeight;
    let isHandlingZoom = false;
    
    // Función para detectar si un cambio de tamaño es probablemente debido al zoom del navegador
    function isLikelyZoom(newWidth, newHeight) {
      // Si el tamaño cambia pero la relación de aspecto se mantiene (o cambia muy poco),
      // es probable que sea zoom del navegador en lugar de un redimensionamiento de ventana
      const newRatio = newWidth / newHeight;
      const ratioDifference = Math.abs(newRatio - lastRatio);
      
      // Cambio de tamaño con relación de aspecto muy similar (umbral ajustable)
      return ratioDifference < 0.01;
    }
    
    // Manejador para el evento de redimensionamiento de ventana
    window.addEventListener('resize', () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // Verificar si este evento parece un zoom
      if (isLikelyZoom(newWidth, newHeight) && !isHandlingZoom) {
        // Marcar que estamos manejando un zoom
        isHandlingZoom = true;
        
        // Bloquear el scroll
        window.scrollManager.lockScrollWithReason('browser-zoom-detected');
        
        if (this.config.behavior.debugMode) {
          console.log('Zoom del navegador detectado, scroll bloqueado temporalmente');
        }
      }
      
      // Establecer un timeout para desbloquear el scroll después de un breve retraso
      setManagedTimeout(() => {
        if (isHandlingZoom) {
          // Desbloquear el scroll
          window.scrollManager.unlockScrollWithReason('browser-zoom-complete');
          isHandlingZoom = false;
          
          if (this.config.behavior.debugMode) {
            console.log('Zoom del navegador completado, scroll desbloqueado');
          }
        }
        
        // Actualizar los valores de referencia para la próxima detección
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
        lastRatio = lastWidth / lastHeight;
        
      }, 500, 'browser_zoom_timeout'); // Esperar 500ms después del último evento de resize
    });
    
    // También detectar eventos de zoom con la rueda del ratón cuando se mantiene Ctrl
    window.addEventListener('wheel', (e) => {
      // Verificar si se está presionando Ctrl (común para zoom del navegador)
      if (e.ctrlKey) {
        // Bloquear el scroll durante el zoom con la rueda
        if (!isHandlingZoom) {
          isHandlingZoom = true;
          window.scrollManager.lockScrollWithReason('browser-wheel-zoom');
          
          if (this.config.behavior.debugMode) {
            console.log('Zoom con rueda detectado, scroll bloqueado temporalmente');
          }
        }
        
        // Establecer un timeout para desbloquear después del zoom
        setManagedTimeout(() => {
          window.scrollManager.unlockScrollWithReason('browser-wheel-zoom-complete');
          isHandlingZoom = false;
          
          if (this.config.behavior.debugMode) {
            console.log('Zoom con rueda completado, scroll desbloqueado');
          }
        }, 300, 'browser_wheel_zoom_timeout');
      }
    }, { passive: false });
    
    // Detectar gestos de pinch en trackpads/touchpads (principalmente para MacOS)
    let lastDistance = 0;
    
    // Función para calcular la distancia entre dos puntos de toque
    function getTouchDistance(touches) {
      if (touches.length < 2) return 0;
      
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Eventos para gestos touch
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length >= 2) {
        lastDistance = getTouchDistance(e.touches);
      }
    }, { passive: true });
    
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length >= 2) {
        const currentDistance = getTouchDistance(e.touches);
        
        // Si hay un cambio significativo de distancia, es un gesto de pinch
        if (Math.abs(currentDistance - lastDistance) > 10) {
          if (!isHandlingZoom) {
            isHandlingZoom = true;
            window.scrollManager.lockScrollWithReason('touch-pinch-zoom');
            
            if (this.config.behavior.debugMode) {
              console.log('Gesto de pinch detectado, scroll bloqueado temporalmente');
            }
          }
          
          // Establecer timeout para desbloquear
          setManagedTimeout(() => {
            window.scrollManager.unlockScrollWithReason('touch-pinch-zoom-complete');
            isHandlingZoom = false;
            
            if (this.config.behavior.debugMode) {
              console.log('Gesto de pinch completado, scroll desbloqueado');
            }
          }, 300, 'touch_pinch_zoom_timeout');
        }
        
        lastDistance = currentDistance;
      }
    }, { passive: true });
    
    if (this.config.behavior.debugMode) {
      console.log('Detector de zoom del navegador configurado correctamente');
    }
  }
}

// Exportar una única instancia para toda la aplicación
const scrollManager = new ScrollManager();

export default scrollManager;
window.scrollManager = scrollManager;

/**
 * Verifica si la mutación está relacionada con interacciones de sidebar o preview panel
 * @param {MutationRecord} mutation - El objeto de mutación a verificar
 * @returns {boolean} true si la mutación está relacionada con sidebar/preview
 */
function isSidebarOrPreviewPanelMutation(mutation) {
  // Caso 1: Cambios de clase en main-content (causados por sidebar o preview)
  if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
    // Cambios en main-content
    if (mutation.target.classList?.contains('main-content')) {
      // Verificar si se añadió o quitó la clase 'sidebar-pinned'
      if (mutation.oldValue && 
          (mutation.oldValue.includes('sidebar-pinned') !== mutation.target.classList.contains('sidebar-pinned'))) {
        this.log('Ignorando mutación relacionada con sidebar-pinned en main-content');
        return true;
      }
    }
    
    // Cambios en sidebar
    if (mutation.target.classList?.contains('sidebar')) {
      // Verificar si se añadió o quitó la clase 'pinned' o 'collapsed'
      if (mutation.oldValue && 
          (mutation.oldValue.includes('pinned') !== mutation.target.classList.contains('pinned') ||
           mutation.oldValue.includes('collapsed') !== mutation.target.classList.contains('collapsed'))) {
        this.log('Ignorando mutación relacionada con estados del sidebar');
        return true;
      }
    }
    
    // Cambios en el body relacionados con preview panel
    if (mutation.target.tagName === 'BODY') {
      if (mutation.oldValue && 
          (mutation.oldValue.includes('preview-panel-active') !== 
           mutation.target.classList.contains('preview-panel-active'))) {
        this.log('Ignorando mutación relacionada con preview-panel-active');
        return true;
      }
    }
  }
  
  // Caso 2: Cambios de estilo que afectan al transform/width/max-width
  if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
    const styleChanges = ['transform', 'width', 'max-width'];
    const target = mutation.target;
    
    // Verificar si el estilo contiene propiedades relevantes
    if (target.style && styleChanges.some(prop => target.style[prop])) {
      // Verificar si el elemento está relacionado con sidebar o preview
      if (target.classList?.contains('main-content') || 
          target.classList?.contains('sidebar') ||
          target.closest('.sidebar') ||
          target.closest('.preview-panel')) {
        this.log('Ignorando mutación de estilo relacionada con UI');
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Configura manejadores avanzados de gestos para un diagrama
 * @param {HTMLElement} wrapper - Contenedor del diagrama
 * @param {HTMLElement} svgElement - Elemento SVG del diagrama
 */
function setupAdvancedZoomGestures(wrapper, svgElement) {
  if (!wrapper || !svgElement) return;
  
  // Crear o recuperar estado de zoom
  const zoomState = wrapper._zoomState || {
    currentScale: 1,
    translateX: 0,
    translateY: 0
  };
  
  // Guardar estado para referencia futura
  wrapper._zoomState = zoomState;
  
  // Función para aplicar transformación
  function applyTransform() {
    svgElement.style.transform = `translate(${zoomState.translateX}px, ${zoomState.translateY}px) scale(${zoomState.currentScale})`;
  }
  
  // Configurar manejadores
  setupAdvancedWheelHandler(wrapper, svgElement, zoomState, applyTransform);
  setupTouchGestureHandlers(wrapper, svgElement, zoomState, applyTransform);
  
  if (SCROLL_CONFIG.behavior.debugMode) {
    console.log('Gestos avanzados de zoom configurados para el diagrama');
  }
}

/**
 * Configura un controlador avanzado de eventos de rueda para diagramas Mermaid
 * @param {HTMLElement} wrapper - Contenedor del diagrama
 * @param {HTMLElement} svgElement - Elemento SVG del diagrama
 * @param {Object} zoomState - Estado de zoom del diagrama
 * @param {Function} applyTransform - Función para aplicar la transformación
 */
function setupAdvancedWheelHandler(wrapper, svgElement, zoomState, applyTransform) {
  if (!wrapper || !svgElement || !applyTransform) {
    if (SCROLL_CONFIG.behavior.debugMode) {
      console.error('Faltan parámetros requeridos para setupAdvancedWheelHandler');
    }
    return;
  }
  
  // Verificar si tenemos acceso al ScrollManager
  const scrollManager = window.scrollManager;
  const canLockScroll = scrollManager && typeof scrollManager.lockScrollWithReason === 'function';
  
  // Configuración específica para eventos de rueda
  const wheelConfig = {
    // Umbral de tiempo entre eventos de rueda para considerar una serie continua
    continuousThreshold: 200,
    // Tiempo mínimo de bloqueo para eventos de rueda
    minLockDuration: 500,
    // Tiempo adicional de bloqueo después del último evento
    extraLockTime: 300,
    // Factor de amortiguación para el zoom con rueda (mayor = más suave)
    dampingFactor: 2.0
  };
  
  // Estado interno para eventos de rueda
  const wheelState = {
    lastWheelTime: 0,
    isWheelZooming: false,
    continuousEvents: 0,
    lockId: null
  };
  
  // Función para bloquear el scroll durante zoom con rueda
  function lockScrollForWheelZoom() {
    if (!canLockScroll) return false;
    
    // Generar un ID único para este bloqueo si no existe
    if (!wheelState.lockId) {
      wheelState.lockId = `mermaid-wheel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // Calcular la duración del bloqueo basada en la actividad reciente
    const lockDuration = Math.max(
      wheelConfig.minLockDuration,
      wheelConfig.continuousThreshold * Math.min(wheelState.continuousEvents, 5) + 
      wheelConfig.extraLockTime
    );
    
    // Bloquear o renovar el bloqueo
    scrollManager.lockScrollWithReason(wheelState.lockId, lockDuration);
    
    return true;
  }
  
  // Función para determinar si un evento es probablemente un zoom de gesto de touchpad
  function isProbablyGestureZoom(e) {
    // Detectar características típicas de gestos de pinch-zoom en touchpads
    return (
      // Chrome y Firefox en macOS suelen enviar eventos con ctrlKey para gestos de pinch
      (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) ||
      // Algunos navegadores usan metaKey para gestos de pinch
      (e.metaKey && !e.ctrlKey) ||
      // Eventos no estándar que podrían indicar gestos
      (typeof e.wheelDeltaY === 'number' && typeof e.deltaMode === 'number' && e.deltaMode === 0)
    );
  }
  
  // Manejador principal de eventos de rueda
  wrapper.addEventListener('wheel', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Registrar tiempo del evento
    const now = Date.now();
    const timeSinceLastWheel = now - wheelState.lastWheelTime;
    wheelState.lastWheelTime = now;
    
    // Determinar si es parte de una serie continua de eventos
    if (timeSinceLastWheel < wheelConfig.continuousThreshold) {
      wheelState.continuousEvents++;
    } else {
      wheelState.continuousEvents = 1;
    }
    
    // Marcar inicio de zoom con rueda si es el primer evento
    if (!wheelState.isWheelZooming) {
      wheelState.isWheelZooming = true;
      
      // Actualizar estado global si existe
      if (typeof window._activeZoomOperations !== 'undefined') {
        window._activeZoomOperations++;
      }
      
      // Aplicar cursor de zoom
      svgElement.style.cursor = 'zoom-in';
    }
    
    // Bloquear o renovar bloqueo de scroll
    lockScrollForWheelZoom();
    
    // Determinar factor de zoom basado en evento
    let zoomFactor;
    
    if (isProbablyGestureZoom(e)) {
      // Para gestos de pinch, usar deltaY directamente pero con más suavidad
      zoomFactor = -e.deltaY / (wheelConfig.dampingFactor * 200);
    } else {
      // Para rueda normal, valor discreto con signo
      zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
    }
    
    // Aplicar zoom al estado
    zoomState.currentScale = Math.max(0.5, Math.min(zoomState.currentScale + zoomFactor, 3));
    
    // Aplicar transformación
    applyTransform();
    
    // Configurar timeout para finalizar el zoom
    setManagedTimeout(() => {
      // Finalizar el zoom
      wheelState.isWheelZooming = false;
      wheelState.continuousEvents = 0;
      wheelState.lockId = null;
      
      // Restaurar cursor
      svgElement.style.cursor = 'grab';
      
      // Actualizar estado global si existe
      if (typeof window._activeZoomOperations !== 'undefined') {
        window._activeZoomOperations = Math.max(0, window._activeZoomOperations - 1);
      }
      
      // Desbloqueo ya ocurrirá por el tiempo especificado en lockScrollForWheelZoom
    }, wheelConfig.extraLockTime, `wheel_zoom_end_${Date.now()}`);
    
  }, { passive: false });
}

/**
 * Configura manejadores específicos para gestos táctiles (pinch-zoom) en dispositivos
 * @param {HTMLElement} wrapper - Contenedor del diagrama
 * @param {HTMLElement} svgElement - Elemento SVG del diagrama
 * @param {Object} zoomState - Estado de zoom del diagrama
 * @param {Function} applyTransform - Función para aplicar la transformación
 */
function setupTouchGestureHandlers(wrapper, svgElement, zoomState, applyTransform) {
  if (!wrapper || !svgElement || !applyTransform) {
    if (SCROLL_CONFIG.behavior.debugMode) {
      console.error('Faltan parámetros requeridos para setupTouchGestureHandlers');
    }
    return;
  }
  
  // Verificar si tenemos acceso al ScrollManager
  const scrollManager = window.scrollManager;
  const canLockScroll = scrollManager && typeof scrollManager.lockScrollWithReason === 'function';
  
  // Estado para gestos táctiles
  const touchState = {
    isGestureActive: false,
    startDistance: 0,
    startScale: 1,
    lastTouchTime: 0,
    touchStartPositions: [],
    lockId: null
  };
  
  // Función para calcular distancia entre dos puntos de toque
  function getTouchDistance(touches) {
    if (touches.length < 2) return 0;
    
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Función para calcular el centro de dos puntos de toque
  function getTouchCenter(touches) {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }
  
  // Función para bloquear el scroll durante gestos
  function lockScrollForGesture() {
    if (!canLockScroll) return false;
    
    // Generar un ID único para este bloqueo si no existe
    if (!touchState.lockId) {
      touchState.lockId = `mermaid-touch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // Bloquear por al menos 1 segundo para gestos táctiles
    scrollManager.lockScrollWithReason(touchState.lockId, 1000);
    
    return true;
  }
  
  // Manejador de inicio de toque
  wrapper.addEventListener('touchstart', function(e) {
    if (e.touches.length >= 2) {
      e.preventDefault();
      
      // Registrar posiciones iniciales
      touchState.touchStartPositions = [];
      for (let i = 0; i < e.touches.length; i++) {
        touchState.touchStartPositions.push({
          x: e.touches[i].clientX,
          y: e.touches[i].clientY
        });
      }
      
      // Registrar distancia y escala inicial
      touchState.startDistance = getTouchDistance(e.touches);
      touchState.startScale = zoomState.currentScale;
      touchState.lastTouchTime = Date.now();
      touchState.isGestureActive = true;
      
      // Bloquear scroll
      lockScrollForGesture();
      
      // Actualizar estado global si existe
      if (typeof window._activeZoomOperations !== 'undefined') {
        window._activeZoomOperations++;
      }
    }
  }, { passive: false });
  
  // Manejador de movimiento durante toque
  wrapper.addEventListener('touchmove', function(e) {
    if (touchState.isGestureActive && e.touches.length >= 2) {
      e.preventDefault();
      
      // Calcular nueva distancia
      const currentDistance = getTouchDistance(e.touches);
      
      // Solo procesar si hay cambio significativo
      if (Math.abs(currentDistance - touchState.startDistance) > 5) {
        // Actualizar tiempo de último toque
        touchState.lastTouchTime = Date.now();
        
        // Renovar bloqueo de scroll
        lockScrollForGesture();
        
        // Calcular y aplicar nueva escala
        const scaleFactor = currentDistance / touchState.startDistance;
        zoomState.currentScale = Math.max(0.5, Math.min(touchState.startScale * scaleFactor, 3));
        
        // Si hay información de centro, ajustar también la traslación
        if (zoomState.translateX !== undefined && zoomState.translateY !== undefined) {
          const touchCenter = getTouchCenter(e.touches);
          const startCenter = getTouchCenter(touchState.touchStartPositions);
          
          // Ajustar traslación para mantener el centro del gesto como punto fijo
          zoomState.translateX += (touchCenter.x - startCenter.x);
          zoomState.translateY += (touchCenter.y - startCenter.y);
        }
        
        // Aplicar transformación
        applyTransform();
      }
    }
  }, { passive: false });
  
  // Función para finalizar el gesto
  function finishGesture() {
    // Restablecer el estado
    touchState.isGestureActive = false;
    touchState.lockId = null;
    
    // Actualizar estado global si existe
    if (typeof window._activeZoomOperations !== 'undefined') {
      window._activeZoomOperations = Math.max(0, window._activeZoomOperations - 1);
    }
  }
  
  // Manejador de fin de toque
  wrapper.addEventListener('touchend', function(e) {
    if (touchState.isGestureActive) {
      // Si quedan menos de 2 dedos, finalizar gesto
      if (e.touches.length < 2) {
        finishGesture();
      }
    }
  }, { passive: false });
  
  // Manejador de cancelación de toque
  wrapper.addEventListener('touchcancel', function() {
    if (touchState.isGestureActive) {
      finishGesture();
    }
  }, { passive: false });
}

// Exportar función principal
export { setupAdvancedZoomGestures };