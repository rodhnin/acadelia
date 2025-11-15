// mermaidZoomPan.js - VERSIÓN CORREGIDA para mantener contenedores y posición

export class MermaidZoomPan {
  constructor(container, options = {}) {
    this.container = container;
    this.svg = container.querySelector('svg');
    if (!this.svg) {
      console.error('No se encontró SVG en el contenedor');
      return;
    }
    
    this.isExplanation = container.closest('.explanation-container') !== null ||
                        container.closest('.visualization-container') !== null;
    
    this.originalParent = container.parentElement;
    this.originalNextSibling = container.nextElementSibling;
    this.originalPosition = {
      top: container.offsetTop,
      left: container.offsetLeft,
      width: container.offsetWidth,
      height: container.offsetHeight
    };
    
    // Opciones mejoradas
    this.options = {
      minZoom: this.isExplanation ? 0.2 : 0.1,
      maxZoom: this.isExplanation ? 4 : 5,
      zoomStep: 0.1,
      smoothZoom: true,
      controlsPosition: 'top-right',
      controlsScale: this.isExplanation ? 0.9 : 1,
      preserveContainerPosition: true, // NUEVA OPCIÓN
      ...options
    };
    
    // Estado
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.lastTouchDistance = 0;
    this.isFullscreen = false;
    
    this.boundHandlers = {
      mouseDown: this.handleMouseDown.bind(this),
      mouseMove: this.handleMouseMove.bind(this),
      mouseUp: this.handleMouseUp.bind(this),
      touchStart: this.handleTouchStart.bind(this),
      touchMove: this.handleTouchMove.bind(this),
      touchEnd: this.handleTouchEnd.bind(this),
      wheel: this.handleWheel.bind(this),
      keydown: this.handleKeydown.bind(this),
      dblclick: () => this.reset(),
      fullscreenChange: this.handleFullscreenChange.bind(this)
    };
    
    this.createWrapperSafely();
    
    this.createControls();
    
    this.setupEvents();
    
    this.applyTransform();
    
    this.container.setAttribute('data-zoom-enabled', 'true');
    
    // Ajustar para componente de explicación si es necesario
    if (this.isExplanation) {
      this.adjustForExplanationComponent();
    }
    
    console.log('✅ MermaidZoomPan inicializado con preservación de contenedor');
  }
  
  /**
   * Creación segura del wrapper manteniendo la estructura del contenedor
   */
  createWrapperSafely() {
    if (!this.container.contains(this.svg)) {
      console.error('SVG no está dentro del contenedor especificado');
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-svg-wrapper';
    
    // Conservar estilos del contenedor
    const containerStyles = window.getComputedStyle(this.container);
    const computedHeight = parseInt(containerStyles.height) || 
                          this.container.offsetHeight || 
                          200;
    
    wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: ${Math.max(computedHeight, 200)}px;
      overflow: hidden;
      position: relative;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      background: transparent;
    `;
    
    const svgParent = this.svg.parentElement;
    svgParent.insertBefore(wrapper, this.svg);
    wrapper.appendChild(this.svg);
    
    this.wrapper = wrapper;
    this.svgOriginalParent = svgParent; // Guardar referencia al padre original del SVG
    
    this.svg.style.cssText = `
      width: 100%;
      height: auto;
      max-width: none;
      display: block;
      transform-origin: center center;
      transition: ${this.options.smoothZoom ? 'transform 0.2s ease' : 'none'};
    `;
  }
  
  createControls() {
    const controls = document.createElement('div');
    controls.className = 'mermaid-zoom-controls';
    
    if (this.options.controlsScale !== 1) {
      controls.style.transform = `scale(${this.options.controlsScale})`;
    }
    
    // Botón de zoom in
    const zoomInBtn = this.createButton('bx-zoom-in', 'Aumentar zoom', () => this.zoomIn());
    
    // Botón de zoom out
    const zoomOutBtn = this.createButton('bx-zoom-out', 'Reducir zoom', () => this.zoomOut());
    
    // Botón de reset
    const resetBtn = this.createButton('bx-reset', 'Restablecer vista', () => this.reset());
    
    // Botón de pantalla completa
    const fullscreenBtn = this.createButton('bx-fullscreen', 'Pantalla completa', () => this.toggleFullscreen());
    
    // Indicador de zoom
    const zoomIndicator = document.createElement('div');
    zoomIndicator.className = 'zoom-indicator';
    zoomIndicator.textContent = '100%';
    this.zoomIndicator = zoomIndicator;
    
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomIndicator);
    controls.appendChild(zoomOutBtn);
    controls.appendChild(resetBtn);
    controls.appendChild(fullscreenBtn);
    
    this.container.appendChild(controls);
    this.controls = controls;
  }
  
  createButton(iconClass, title, onClick) {
    const button = document.createElement('button');
    button.className = 'mermaid-control-btn';
    button.title = title;
    button.innerHTML = `<i class='bx ${iconClass}'></i>`;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    
    return button;
  }
  
  setupEvents() {
    // Mouse events en el wrapper
    this.wrapper.addEventListener('mousedown', this.boundHandlers.mouseDown);
    document.addEventListener('mousemove', this.boundHandlers.mouseMove);
    document.addEventListener('mouseup', this.boundHandlers.mouseUp);
    
    // Touch events
    this.wrapper.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
    this.wrapper.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
    this.wrapper.addEventListener('touchend', this.boundHandlers.touchEnd);
    
    // Wheel event para zoom
    this.wrapper.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    
    // Keyboard shortcuts
    this.container.addEventListener('keydown', this.boundHandlers.keydown);
    
    // Doble click para reset
    this.wrapper.addEventListener('dblclick', this.boundHandlers.dblclick);
    
    // Listener para cambios de fullscreen
    document.addEventListener('fullscreenchange', this.boundHandlers.fullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.boundHandlers.fullscreenChange);
    document.addEventListener('mozfullscreenchange', this.boundHandlers.fullscreenChange);
    document.addEventListener('MSFullscreenChange', this.boundHandlers.fullscreenChange);
  }
  
  /**
   * NUEVO: Manejo mejorado de fullscreen con preservación de posición
   */
  handleFullscreenChange() {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    if (isCurrentlyFullscreen && !this.isFullscreen) {
      // Entrando a fullscreen
      this.isFullscreen = true;
      this.container.classList.add('fullscreen-mode');
      console.log('📺 Entrando a modo fullscreen');
      
      // Ajustar wrapper para fullscreen
      setTimeout(() => {
        this.adjustForFullscreen(true);
      }, 100);
      
    } else if (!isCurrentlyFullscreen && this.isFullscreen) {
      // Saliendo de fullscreen
      this.isFullscreen = false;
      this.container.classList.remove('fullscreen-mode');
      console.log('📱 Saliendo de modo fullscreen - restaurando posición');
      
      setTimeout(() => {
        this.restoreOriginalPosition();
      }, 100);
    }
  }
  
  /**
   * NUEVO: Ajustar para modo fullscreen
   */
  adjustForFullscreen(entering) {
    if (entering) {
      this.preFullscreenState = {
        scale: this.scale,
        translateX: this.translateX,
        translateY: this.translateY
      };
      
      // Ajustar wrapper para pantalla completa
      if (this.wrapper) {
        this.wrapper.style.width = '100vw';
        this.wrapper.style.height = '100vh';
        this.wrapper.style.minHeight = '100vh';
      }
    }
  }
  
  /**
   * NUEVO: Restaurar posición original después de fullscreen
   */
  restoreOriginalPosition() {
    try {
      if (this.originalParent && !this.originalParent.contains(this.container)) {
        console.log('🔄 Restaurando contenedor a su posición original');
        
        if (this.originalNextSibling) {
          this.originalParent.insertBefore(this.container, this.originalNextSibling);
        } else {
          this.originalParent.appendChild(this.container);
        }
      }
      
      if (this.wrapper) {
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = '100%';
        this.wrapper.style.minHeight = `${Math.max(this.originalPosition.height, 200)}px`;
      }
      
      if (this.preFullscreenState) {
        this.scale = this.preFullscreenState.scale;
        this.translateX = this.preFullscreenState.translateX;
        this.translateY = this.preFullscreenState.translateY;
        this.applyTransform();
        this.updateZoomIndicator();
      }
      
      // Forzar re-layout
      setTimeout(() => {
        if (this.wrapper) {
          this.wrapper.style.display = 'none';
          this.wrapper.offsetHeight; // Forzar reflow
          this.wrapper.style.display = '';
        }
        this.applyTransform();
      }, 50);
      
      console.log('✅ Posición original restaurada exitosamente');
      
    } catch (error) {
      console.error('❌ Error restaurando posición original:', error);
    }
  }
  
  // [Métodos de mouse, touch y zoom permanecen igual...]
  handleMouseDown(e) {
    if (e.button !== 0) return;
    
    this.isPanning = true;
    this.wrapper.style.cursor = 'grabbing';
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    
    this.svg.style.transition = 'none';
    e.preventDefault();
  }
  
  handleMouseMove(e) {
    if (!this.isPanning) return;
    
    this.translateX = e.clientX - this.startX;
    this.translateY = e.clientY - this.startY;
    
    this.applyTransform();
  }
  
  handleMouseUp() {
    if (!this.isPanning) return;
    
    this.isPanning = false;
    this.wrapper.style.cursor = 'grab';
    
    if (this.options.smoothZoom) {
      this.svg.style.transition = 'transform 0.2s ease';
    }
  }
  
  handleTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isPanning = true;
      this.startX = touch.clientX - this.translateX;
      this.startY = touch.clientY - this.translateY;
      this.svg.style.transition = 'none';
    } else if (e.touches.length === 2) {
      this.isPanning = false;
      const distance = this.getTouchDistance(e.touches[0], e.touches[1]);
      this.lastTouchDistance = distance;
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 1 && this.isPanning) {
      const touch = e.touches[0];
      this.translateX = touch.clientX - this.startX;
      this.translateY = touch.clientY - this.startY;
      this.applyTransform();
    } else if (e.touches.length === 2) {
      const distance = this.getTouchDistance(e.touches[0], e.touches[1]);
      if (this.lastTouchDistance > 0) {
        const delta = distance / this.lastTouchDistance;
        this.zoom(delta, e.touches[0].clientX, e.touches[0].clientY);
      }
      this.lastTouchDistance = distance;
    }
  }
  
  handleTouchEnd() {
    this.isPanning = false;
    this.lastTouchDistance = 0;
    
    if (this.options.smoothZoom) {
      this.svg.style.transition = 'transform 0.2s ease';
    }
  }
  
  handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = this.wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.zoom(delta, x, y);
  }
  
  handleKeydown(e) {
    switch(e.key) {
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      case '0':
        this.reset();
        break;
      case 'f':
      case 'F':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleFullscreen();
        }
        break;
    }
  }
  
  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  zoom(delta, centerX = null, centerY = null) {
    const oldScale = this.scale;
    this.scale = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, this.scale * delta));
    
    if (centerX !== null && centerY !== null) {
      const rect = this.wrapper.getBoundingClientRect();
      const x = centerX - rect.width / 2;
      const y = centerY - rect.height / 2;
      
      this.translateX -= x * (this.scale / oldScale - 1);
      this.translateY -= y * (this.scale / oldScale - 1);
    }
    
    this.applyTransform();
    this.updateZoomIndicator();
  }
  
  zoomIn() {
    this.zoom(1 + this.options.zoomStep);
  }
  
  zoomOut() {
    this.zoom(1 - this.options.zoomStep);
  }
  
  reset() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    
    this.svg.style.transition = 'transform 0.3s ease';
    this.applyTransform();
    this.updateZoomIndicator();
    
    setTimeout(() => {
      if (this.options.smoothZoom) {
        this.svg.style.transition = 'transform 0.2s ease';
      } else {
        this.svg.style.transition = 'none';
      }
    }, 300);
  }
  
  applyTransform() {
    if (this.svg) {
      this.svg.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }
  }
  
  updateZoomIndicator() {
    if (this.zoomIndicator) {
      this.zoomIndicator.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }
  
  /**
   * MEJORADO: Toggle fullscreen con mejor manejo
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Entrar a fullscreen
      const fullscreenPromise = this.container.requestFullscreen ? 
        this.container.requestFullscreen() :
        this.container.webkitRequestFullscreen ? 
        this.container.webkitRequestFullscreen() :
        this.container.mozRequestFullScreen ?
        this.container.mozRequestFullScreen() :
        this.container.msRequestFullscreen ?
        this.container.msRequestFullscreen() :
        null;
        
      if (fullscreenPromise) {
        fullscreenPromise.then(() => {
          console.log('📺 Pantalla completa activada');
        }).catch(err => {
          console.warn('Error intentando pantalla completa:', err);
        });
      }
    } else {
      // Salir de fullscreen
      const exitPromise = document.exitFullscreen ? 
        document.exitFullscreen() :
        document.webkitExitFullscreen ?
        document.webkitExitFullscreen() :
        document.mozCancelFullScreen ?
        document.mozCancelFullScreen() :
        document.msExitFullscreen ?
        document.msExitFullscreen() :
        null;
        
      if (exitPromise) {
        exitPromise.then(() => {
          console.log('📱 Pantalla completa desactivada');
        }).catch(err => {
          console.warn('Error saliendo de pantalla completa:', err);
        });
      }
    }
  }
  
  adjustForExplanationComponent() {
    this.container.style.minHeight = 'auto';
    
    if (this.container.closest('.visualization-container')) {
      this.container.style.margin = '0.5rem 0';
    }
  }
  
  /**
   * VERSIÓN MEJORADA del método destroy con mejor restauración
   */
  destroy() {
    try {
      console.log('🧹 Destruyendo MermaidZoomPan...');
      
      document.removeEventListener('fullscreenchange', this.boundHandlers.fullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.boundHandlers.fullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.boundHandlers.fullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.boundHandlers.fullscreenChange);
      
      if (this.wrapper) {
        this.wrapper.removeEventListener('mousedown', this.boundHandlers.mouseDown);
        this.wrapper.removeEventListener('touchstart', this.boundHandlers.touchStart);
        this.wrapper.removeEventListener('touchmove', this.boundHandlers.touchMove);
        this.wrapper.removeEventListener('touchend', this.boundHandlers.touchEnd);
        this.wrapper.removeEventListener('wheel', this.boundHandlers.wheel);
        this.wrapper.removeEventListener('dblclick', this.boundHandlers.dblclick);
      }
      
      document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
      document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
      
      if (this.container) {
        this.container.removeEventListener('keydown', this.boundHandlers.keydown);
      }
      
      // RESTAURACIÓN MEJORADA DEL SVG
      if (this.wrapper && this.svg && this.svgOriginalParent) {
        try {
          this.svgOriginalParent.insertBefore(this.svg, this.wrapper);
          
          this.svg.style.transform = '';
          this.svg.style.transition = '';
          this.svg.style.transformOrigin = '';
          
          if (this.wrapper.parentNode) {
            this.wrapper.remove();
          }
          
          console.log('✅ SVG restaurado a su contenedor original');
          
        } catch (domError) {
          console.warn('⚠️ Error restaurando estructura DOM:', domError);
          
          if (this.svg && this.container && !this.container.contains(this.svg)) {
            this.container.appendChild(this.svg);
          }
        }
      }
      
      if (this.controls && this.controls.parentNode) {
        this.controls.remove();
      }
      
      if (this.container) {
        this.container.removeAttribute('data-zoom-enabled');
        this.container.classList.remove('fullscreen-mode');
        delete this.container._zoomPanInstance;
      }
      
      this.svg = null;
      this.wrapper = null;
      this.controls = null;
      this.zoomIndicator = null;
      this.container = null;
      this.originalParent = null;
      this.svgOriginalParent = null;
      this.boundHandlers = null;
      
      console.log('✅ MermaidZoomPan destruido exitosamente');
      
    } catch (error) {
      console.error('❌ Error en destroy():', error);
      
      // Limpieza de emergencia
      if (this.container) {
        this.container.removeAttribute('data-zoom-enabled');
        this.container.classList.remove('fullscreen-mode');
        delete this.container._zoomPanInstance;
      }
    }
  }
}

// [Resto de funciones de utilidad permanecen igual con algunas mejoras menores...]

export function initializeMermaidZoomPan() {
  const chatMermaidContainers = document.querySelectorAll('.message-content .mermaid[data-processed="true"]:not([data-zoom-enabled="true"])');
  const explanationMermaidContainers = document.querySelectorAll('.explanation-container .mermaid[data-processed="true"]:not([data-zoom-enabled="true"]), .visualization-container .mermaid[data-processed="true"]:not([data-zoom-enabled="true"])');
  
  chatMermaidContainers.forEach(container => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const zoomPan = new MermaidZoomPan(container);
    container._zoomPanInstance = zoomPan;
  });
  
  explanationMermaidContainers.forEach(container => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const zoomPan = new MermaidZoomPan(container, {
      controlsScale: 0.9,
      minZoom: 0.2,
      maxZoom: 4,
      preserveContainerPosition: true
    });
    
    container._zoomPanInstance = zoomPan;
  });
  
  const totalProcessed = chatMermaidContainers.length + explanationMermaidContainers.length;
  if (totalProcessed > 0) {
    console.log(`✅ Zoom/Pan mejorado habilitado en ${totalProcessed} diagramas`);
  }
}

export function setupMermaidZoomObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-processed' &&
          mutation.target.classList.contains('mermaid') &&
          mutation.target.getAttribute('data-processed') === 'true' &&
          !mutation.target.hasAttribute('data-zoom-enabled')) {
        shouldCheck = true;
      }
      
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('mermaid') && 
                node.getAttribute('data-processed') === 'true' &&
                !node.hasAttribute('data-zoom-enabled')) {
              shouldCheck = true;
            }
            
            const mermaidNodes = node.querySelectorAll('.mermaid[data-processed="true"]:not([data-zoom-enabled="true"])');
            if (mermaidNodes.length > 0) {
              shouldCheck = true;
            }
          }
        });
      }
    });
    
    if (shouldCheck) {
      setTimeout(() => {
        initializeMermaidZoomPan();
      }, 200);
    }
  });
  
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['data-processed']
  });
  
  return observer;
}

export function initZoomForSelector(selector) {
  const container = document.querySelector(selector);
  if (container && container.classList.contains('mermaid') && container.getAttribute('data-processed') === 'true') {
    if (container._zoomPanInstance) {
      container._zoomPanInstance.destroy();
    }
    
    const isExplanation = container.closest('.explanation-container') !== null ||
                         container.closest('.visualization-container') !== null;
                         
    const options = isExplanation ? 
                   { controlsScale: 0.9, minZoom: 0.2, maxZoom: 4, preserveContainerPosition: true } : 
                   { preserveContainerPosition: true };
                   
    const zoomPan = new MermaidZoomPan(container, options);
    container._zoomPanInstance = zoomPan;
    
    return zoomPan;
  }
  
  return null;
}

// Auto-inicializar
if (typeof window !== 'undefined') {
  const observer = setupMermaidZoomObserver();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeMermaidZoomPan, 500);
    });
  } else {
    setTimeout(initializeMermaidZoomPan, 500);
  }
}

window.MermaidZoomPan = MermaidZoomPan;
window.initializeMermaidZoomPan = initializeMermaidZoomPan;
window.initZoomForSelector = initZoomForSelector;