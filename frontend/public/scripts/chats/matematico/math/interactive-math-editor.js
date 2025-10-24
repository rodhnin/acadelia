/**
 * interactive-math-editor.js - Editor interactivo de fórmulas matemáticas basado en MathLive
 * Versión CSP-compatible completa SIN onclick + Reinicialización mejorada para cambio de chats
 */

import { DOM_SELECTORS } from '../core/config-matematico.js';
import { eventBus } from '../core/event-bus-matematico.js';
import { improveLatexFormatting, preprocessComplexFormula } from '../math/latex-utils.js';
import {
  createElement,
  addEvent,
  removeEvent,
  setManagedTimeout,
  clearManagedTimeouts,
  hasClass,
  addClass,
  removeClass,
  removeAllEvents
} from '../../shared/dom-helpers.js';

// Configuración
const CONFIG = {
  RENDER_DELAY: 500,
  FOCUS_DELAY: 100,
  RENDER_SECTION_DELAY: 50,
  RENDER_BUTTONS_DELAY: 100,
  FORCE_RENDER_DELAY: 200,
  RENDER_AFTER_SHOW_DELAY: 300,
  REINIT_DELAY: 200,
  TIMEOUT_KEYS: {
    INITIAL_RENDER: 'math-initial-render',
    SECTION_RENDER: 'math-section-render',
    BUTTON_RENDER: 'math-button-render',
    FORCE_RENDER: 'math-force-render',
    SHOW_RENDER: 'math-show-render',
    FOCUS: 'math-focus',
    REINIT: 'math-reinit'
  }
};

// Controlar si ya se ha inicializado
let editorInstance = null;

// 🆕 REGISTRO GLOBAL de instancias para limpieza completa
const GLOBAL_REGISTRY = {
  instances: new Set(),
  eventListeners: new Map(),
  timeouts: new Set(),
  
  register(instance) {
    this.instances.add(instance);
  },
  
  unregister(instance) {
    this.instances.delete(instance);
  },
  
  registerEventListener(element, type, handler, key) {
    const listenerKey = key || `${element.id || 'element'}_${type}_${Date.now()}`;
    this.eventListeners.set(listenerKey, { element, type, handler });
    return listenerKey;
  },
  
  removeEventListener(key) {
    const listener = this.eventListeners.get(key);
    if (listener) {
      removeEvent(listener.element, listener.type, listener.handler);
      this.eventListeners.delete(key);
    }
  },
  
  cleanupAll() {
    // Limpiar todos los event listeners
    for (const [key] of this.eventListeners) {
      this.removeEventListener(key);
    }
    
    // Limpiar todas las instancias
    for (const instance of this.instances) {
      if (instance && typeof instance.cleanup === 'function') {
        try {
          instance.cleanup();
        } catch (e) {
          console.warn('Error al limpiar instancia:', e);
        }
      }
    }
    this.instances.clear();
    
    // Limpiar timeouts
    Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
      clearManagedTimeouts(key);
    });
    
    console.log('🧹 MathEditor: Limpieza global completada');
  }
};

// Clase principal para el editor interactivo
class MathLiveEditor {
  constructor() {
    // 🆕 Registrar esta instancia globalmente
    GLOBAL_REGISTRY.register(this);
    
    // Referencias a elementos DOM
    this.editorContainer = null;
    this.mathfield = null;
    this.symbolsContainer = null;
    this.textarea = null; // Textarea original del chat
    
    // Estado del editor
    this.isVisible = false;
    this.isInitialized = false;
    
    // 🆕 Registro de event listeners para limpieza mejorada
    this.eventListeners = new Map();
    
    // 🆕 Estado de inicialización para prevenir doble inicialización
    this.initializationPromise = null;
    
    // Inicializar
    this.init();
  }
  
  /**
   * 🆕 Inicializa el editor con protección contra doble inicialización
   */
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInit();
    return this.initializationPromise;
  }
  
  /**
   * 🆕 Inicialización interna protegida
   */
  async _performInit() {
    try {
      console.log('🔧 MathEditor: Iniciando inicialización...');
      
      this.createEditorDOM();
      this.initMathLive();
      this.simplifyToolbar();
      this.setupEventListeners();
      this.injectSymbolsPanel();
      
      // Renderizar fórmulas en botones después de inyectar panel
      setManagedTimeout(() => {
        this.renderMathButtonsPreview();
      }, CONFIG.RENDER_DELAY, CONFIG.TIMEOUT_KEYS.INITIAL_RENDER);
      
      this.isInitialized = true;
      
      // Notificar inicialización completada
      eventBus.emit('mathEditorInitialized', { editor: this });
      
      console.log('✅ MathEditor: Inicialización completada');
      
    } catch (error) {
      console.error('❌ MathEditor: Error en inicialización:', error);
      this.isInitialized = false;
      throw error;
    }
  }
  
  /**
   * 🆕 Función para reinicializar completamente el editor (para cambios de chat)
   */
  async reinitialize() {
    console.log('🔄 MathEditor: Iniciando reinicialización...');
    
    try {
      // 1. Limpiar estado anterior
      this.cleanup();
      
      // 2. Resetear estado
      this.isInitialized = false;
      this.initializationPromise = null;
      this.eventListeners.clear();
      
      // 3. Pequeña pausa para asegurar limpieza
      await new Promise(resolve => {
        setManagedTimeout(resolve, CONFIG.REINIT_DELAY, CONFIG.TIMEOUT_KEYS.REINIT);
      });
      
      // 4. Inicializar de nuevo
      await this.init();
      
      console.log('✅ MathEditor: Reinicialización completada');
      
      return true;
    } catch (error) {
      console.error('❌ MathEditor: Error en reinicialización:', error);
      return false;
    }
  }
  
  /**
   * Simplifica la barra de herramientas eliminando botones innecesarios
   */
  simplifyToolbar() {
    // Encontrar la barra de herramientas
    const toolbar = this.editorContainer.querySelector('.editor-toolbar');
    if (!toolbar) return;
    
    // Limpiar contenido existente
    toolbar.innerHTML = '';
    
    // Crear título para la barra
    const title = createElement('div', {
      className: 'editor-title'
    }, 'Editor de Ecuaciones');
    toolbar.appendChild(title);
    
    // Crear botón de enviar con nuevo nombre
    const sendButton = createElement('button', {
      className: 'toolbar-btn send-button'
    }, 'Enviar al Chat');
    toolbar.appendChild(sendButton);
    
    // 🆕 Configurar evento CSP-compatible con registro
    const sendHandler = () => {
      this.sendLatexToTextarea(); // Solo envía al chat sin cerrar
    };
    
    const listenerId = this.addEventListenerWithCleanup(sendButton, 'click', sendHandler);
    
    // Agregar estilos para la barra simplificada
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'space-between';
    toolbar.style.alignItems = 'center';
    toolbar.style.padding = '10px 15px';
    
    // Estilos para el título
    title.style.fontWeight = 'bold';
    title.style.fontSize = '16px';
    
    // Estilos para el botón
    sendButton.style.fontWeight = '500';
    sendButton.style.padding = '6px 12px';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
  }
  
  /**
   * Crea la estructura DOM del editor
   */
  createEditorDOM() {
    // Verificar si ya existe
    this.editorContainer = document.getElementById('math-editor-container');
    
    if (this.editorContainer) {
      // Limpiar contenido anterior
      const toolbar = this.editorContainer.querySelector('.editor-toolbar');
      const symbolsPanel = this.editorContainer.querySelector('.math-symbols-panel');
      
      // Si no existe el contenedor del mathfield, crearlo
      let mathfieldContainer = this.editorContainer.querySelector('.mathfield-container');
      if (!mathfieldContainer) {
        // Reemplazar la estructura existente manteniendo la barra de herramientas y panel de símbolos
        const editorArea = this.editorContainer.querySelector('.editor-area');
        if (editorArea) {
          // Vaciar contenido existente
          editorArea.innerHTML = '';
          // Crear contenedor para MathLive
          mathfieldContainer = createElement('div', {
            id: 'mathfield-container',
            className: 'mathfield-container'
          });
          editorArea.appendChild(mathfieldContainer);
        }
      }
      
      this.setupReferences();
      return;
    }
  }
  
  /**
   * Configura las referencias a elementos DOM
   */
  setupReferences() {
    this.editorContainer = document.getElementById('math-editor-container');
    this.mathfieldContainer = this.editorContainer.querySelector('.mathfield-container') || 
                             this.editorContainer.querySelector('.editor-area');
    this.symbolsContainer = this.editorContainer.querySelector('.symbols-container');
    this.textarea = document.querySelector(DOM_SELECTORS.textarea) || 
                   document.querySelector('.input-box textarea');
  }
  
  /**
   * Inicializa el componente MathLive
   */
  initMathLive() {
    if (!this.mathfieldContainer) {
      return;
    }
    
    // Limpiar contenido previo
    this.mathfieldContainer.innerHTML = '';
    
    // Crear el elemento MathField
    this.mathfieldElement = createElement('math-field', {
      id: 'mathfield'
    });
    
    // Aplicar estilo para que se ajuste al diseño existente
    this.mathfieldElement.style.width = '100%';
    this.mathfieldElement.style.minHeight = '100px';
    this.mathfieldElement.style.padding = '8px';
    this.mathfieldElement.style.fontSize = '16px';
    this.mathfieldElement.style.borderRadius = 'var(--border-radius-sm, 4px)';
    
    // Configurar opciones de MathLive usando propiedades directas según la nueva API
    this.mathfieldElement.setAttribute('math-virtual-keyboard-policy', 'off');
    this.mathfieldElement.smartFence = true;
    this.mathfieldElement.smartMode = true;
    this.mathfieldElement.keypressVibration = false;
    
    // Insertar en el contenedor
    this.mathfieldContainer.appendChild(this.mathfieldElement);
    
    // Obtener la referencia al objeto MathField
    this.mathfield = this.mathfieldElement;
    
    // Personalizar el comportamiento del espacio directamente
    if (window.MathLive && this.mathfield) {
      try {
        // Establecer macros si es necesario
        this.mathfield.macros = {}; 
        
        // 🆕 Manejar eventos de teclado de forma moderna con registro
        const keystrokeHandler = (ev) => {
          // Manejar espacio de forma personalizada
          if (ev.detail.keystroke === 'Spacebar') {
            this.mathfield.insert(' ');
            ev.preventDefault(); // Prevenir comportamiento predeterminado
            return false;
          }
          return true;
        };
        
        this.addEventListenerWithCleanup(this.mathfield, 'keystroke', keystrokeHandler);
        
      } catch (e) {
        console.warn('Error al configurar opciones de MathLive:', e);
      }
    }
  }
  
  /**
   * 🆕 Método helper para agregar event listeners con limpieza automática
   */
  addEventListenerWithCleanup(element, type, handler, options = false) {
    const success = addEvent(element, type, handler, options);
    
    if (success) {
      const listenerId = `${element.id || 'element'}_${type}_${Date.now()}_${Math.random()}`;
      this.eventListeners.set(listenerId, {
        element,
        type,
        handler,
        options
      });
      
      // También registrar globalmente
      GLOBAL_REGISTRY.registerEventListener(element, type, handler, listenerId);
      
      return listenerId;
    }
    
    return null;
  }
  
  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    if (!this.editorContainer) return;
    
    // Escuchar eventos de teclado para cerrar con Escape
    const keydownHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.key === 'Enter') {
        // Si es SOLO Enter (sin Shift para permitir saltos de línea)
        if (!e.shiftKey) {
          e.preventDefault(); // Prevenir comportamiento predeterminado
          this.sendLatexToTextarea();
        }
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.sendLatexToTextarea();
        this.hide();
      }
    };
    
    this.addEventListenerWithCleanup(this.editorContainer, 'keydown', keydownHandler);
    
    // MathLive events
    if (this.mathfield) {
      const inputHandler = (e) => {
        // Notificar cambio de contenido
        eventBus.emit('mathEditorContentChanged', { 
          latex: this.mathfield.value 
        });
      };
      
      this.addEventListenerWithCleanup(this.mathfield, 'input', inputHandler);
    }
  }
  
  /**
   * Envía el contenido LaTeX al textarea principal
   */
  sendLatexToTextarea() {
    if (!this.mathfield) return;
    
    // CRÍTICO: Obtener siempre una referencia fresca al textarea
    this.textarea = document.querySelector(DOM_SELECTORS.textarea) || 
                    document.querySelector('.input-box textarea');
    
    if (!this.textarea) {
      console.warn('No se encontró el textarea para insertar LaTeX');
      return;
    }
    
    const latexContent = this.mathfield.value.trim();
    if (!latexContent) return;
    
    // Procesar el LaTeX
    let processedContent = improveLatexFormatting(preprocessComplexFormula(latexContent));
    
    // Asegurar que el contenido tiene delimitadores LaTeX
    if (!processedContent.startsWith('$') && !processedContent.startsWith('\\(')) {
      processedContent = '$' + processedContent + '$';
    } else if (processedContent.startsWith('$') && !processedContent.endsWith('$')) {
      processedContent = processedContent + '$';
    } else if (processedContent.startsWith('\\(') && !processedContent.endsWith('\\)')) {
      processedContent = processedContent + '\\)';
    }
    
    // Insertar en la posición del cursor
    const cursorPos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, cursorPos);
    const textAfter = this.textarea.value.substring(cursorPos);
    
    this.textarea.value = textBefore + processedContent + textAfter;
    
    // Actualizar la posición del cursor
    const newCursorPos = cursorPos + processedContent.length;
    this.textarea.selectionStart = this.textarea.selectionEnd = newCursorPos;
    
    // Enfocar el textarea para continuar escribiendo
    this.textarea.focus();
    
    // Notificar la inserción
    this.textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    eventBus.emit('latexInserted');
    eventBus.emit('mathEditorContentSent', { content: processedContent });
    this.mathfield.value = '';
  }
  
  /**
   * Inyecta un panel de símbolos matemáticos
   * Reutiliza el panel de símbolos existente
   */
  injectSymbolsPanel() {
    if (!this.symbolsContainer) {
      return;
    }
    
    // Verificar si ya tiene contenido adecuado 
    if (this.symbolsContainer.querySelector('.math-btn')) {
      this.setupExistingSymbolButtons();
      return;
    }
    
    // Si no existe contenido, clonar del panel matemático existente
    const existingMathPanel = document.querySelector('#mathPanel .math-grid');
    if (existingMathPanel) {
      const content = existingMathPanel.cloneNode(true);
      this.symbolsContainer.appendChild(content);
      
      // Asegurarse de que todas las secciones estén cerradas inicialmente
      this.collapseAllSections();
      
      this.setupExistingSymbolButtons();
    }
  }

  /**
   * Colapsa todas las secciones del panel de símbolos
   */
  collapseAllSections() {
    // Colapsar todas las secciones y asegurar que los botones muestren el estado correcto
    const sectionContents = this.symbolsContainer.querySelectorAll('.section-content');
    const toggleButtons = this.symbolsContainer.querySelectorAll('.toggle-btn');
    
    // Establecer todas las secciones como colapsadas
    sectionContents.forEach(section => {
      addClass(section, 'collapsed');
    });
    
    // Establecer todos los botones de toggle al estado correcto (▶)
    toggleButtons.forEach(button => {
      button.textContent = '▶';
      addClass(button, 'collapsed');
    });
  }
  
  /**
   * 🆕 COMPLETAMENTE REESCRITA: Configura los botones existentes del panel matemático - CSP COMPATIBLE
   */
  setupExistingSymbolButtons() {
    console.log('🔧 MathEditor: Configurando botones matemáticos CSP-compatible...');
    
    const buttons = this.symbolsContainer.querySelectorAll('.math-btn');
    
    // 🆕 Limpiar TODOS los event listeners existentes primero
    buttons.forEach(button => {
      removeAllEvents(button);
    });
    
    buttons.forEach((button, index) => {
      // 🆕 SOLO usar data-latex (CSP-compatible)
      const latexCode = button.getAttribute('data-latex') || '';
      
      if (!latexCode) {
        console.warn(`MathEditor: Botón ${index} sin data-latex válido`);
        return;
      }
      
      // 🆕 ASEGURAR que no hay onclick
      button.removeAttribute('onclick');
      button.removeAttribute('onmousedown');
      button.removeAttribute('onmouseup');
      
      // 🆕 Crear handler CSP-compatible
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const code = button.getAttribute('data-latex');
        if (!code) return;
        
        console.log(`🔧 MathEditor: Insertando símbolo: ${code}`);
        
        // Insertar en el campo MathLive
        if (this.mathfield) {
          try {
            // Usar MathLive API para insertar el código
            this.mathfield.executeCommand(['insert', code]);
            this.mathfield.focus();
          } catch (error) {
            console.warn('Error al insertar en MathLive:', error);
            // Fallback: insertar directamente
            this.mathfield.insert(code);
          }
        }
        
        // Notificar la inserción
        eventBus.emit('mathButtonClicked', { symbol: code });
      };
      
      // 🆕 Registrar event listener con limpieza
      this.addEventListenerWithCleanup(button, 'click', clickHandler);
    });
    
    // Configurar los botones de toggle para secciones
    this.setupSectionToggles();
    
    // Asegurar que las fórmulas en los botones se rendericen correctamente
    setManagedTimeout(() => {
      this.renderMathButtonsPreview();
    }, CONFIG.RENDER_BUTTONS_DELAY, CONFIG.TIMEOUT_KEYS.BUTTON_RENDER);
    
    console.log(`✅ MathEditor: ${buttons.length} botones matemáticos configurados`);
  }
  
  /**
   * 🆕 COMPLETAMENTE REESCRITA: Configura los botones de toggle para secciones - CSP COMPATIBLE
   */
  setupSectionToggles() {
    const toggleButtons = this.symbolsContainer.querySelectorAll('.toggle-btn');
    
    // Asegurar que todas las secciones estén colapsadas inicialmente
    const sectionContents = this.symbolsContainer.querySelectorAll('.section-content');
    sectionContents.forEach(section => {
      addClass(section, 'collapsed');
    });
    
    toggleButtons.forEach(button => {
      // Establecer el estado inicial visual
      button.textContent = '▶';
      addClass(button, 'collapsed');
      
      // 🆕 Limpiar eventos previos
      removeAllEvents(button);
      
      // 🆕 ASEGURAR que no hay onclick
      button.removeAttribute('onclick');
      button.removeAttribute('onmousedown');
      button.removeAttribute('onmouseup');
      
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const section = button.closest('.section-header');
        if (!section) return;
        
        const nextSection = section.nextElementSibling;
        if (!nextSection || !hasClass(nextSection, 'section-content')) return;
        
        const isCollapsed = hasClass(nextSection, 'collapsed');
        
        // Alternar estado
        if (isCollapsed) {
          removeClass(nextSection, 'collapsed');
          removeClass(button, 'collapsed');
          button.textContent = '▼';
        } else {
          addClass(nextSection, 'collapsed');
          addClass(button, 'collapsed');
          button.textContent = '▶';
        }
        
        // Si se expandió, renderizar fórmulas en la sección
        if (isCollapsed) {
          setManagedTimeout(() => {
            this.renderSectionMath(nextSection);
          }, CONFIG.RENDER_SECTION_DELAY, CONFIG.TIMEOUT_KEYS.SECTION_RENDER);
        }
      };
      
      // 🆕 Registrar event listener con limpieza
      this.addEventListenerWithCleanup(button, 'click', clickHandler);
    });
  }
  
  /**
   * Renderiza matemáticas en una sección específica
   */
  renderSectionMath(section) {
    if (!section) return;
    
    // Usar MathJax para renderizar la sección
    if (window.MathJax) {
      if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([section])
          .catch(err => {});
      } else if (window.MathJax.Hub) {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, section]);
      }
    }
  }
  
  /**
   * Renderiza las fórmulas en los botones matemáticos
   */
  renderMathButtonsPreview() {
    if (!this.symbolsContainer) {
      return;
    }
    
    // Encontrar todas las previsualizaciones matemáticas
    const mathPreviews = this.symbolsContainer.querySelectorAll('.math-preview');
    
    if (mathPreviews.length === 0) {
      return;
    }
    
    // Preparar cada elemento para el renderizado
    mathPreviews.forEach(preview => {
      if (preview.querySelector('.MathJax')) return; // Ya está renderizado
      
      // Verificar el contenido
      let content = preview.innerHTML;
      
      // Si ya tiene delimitadores, dejarlo así
      if (content.includes('\\(') || content.includes('$')) return;
      
      // Si contiene comandos LaTeX, agregar delimitadores
      if (content.includes('\\')) {
        preview.innerHTML = `\\(${content}\\)`;
      }
    });
    
    // Usar MathJax para renderizar
    if (window.MathJax) {
      if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([this.symbolsContainer])
          .then(() => {})
          .catch(err => {
            // Intentar método alternativo
            this.forceRenderMathPreviews();
          });
      } else if (window.MathJax.Hub) {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, this.symbolsContainer]);
      }
    }
  }
  
  /**
   * Método alternativo para forzar el renderizado en caso de problemas
   */
  forceRenderMathPreviews() {
    // Intentar renderizar cada botón individualmente
    const mathButtons = this.symbolsContainer.querySelectorAll('.math-btn');
    
    mathButtons.forEach(button => {
      const preview = button.querySelector('.math-preview');
      if (!preview) return;
      
      // Reemplazar el contenido con un formato más explícito
      let latex = button.getAttribute('data-latex') || '';
      if (latex && !preview.querySelector('.MathJax')) {
        // Crear un nuevo elemento para asegurar renderizado limpio
        const newPreview = createElement('span', {
          className: 'math-preview'
        });
        
        // Usar formato explícito para MathJax
        newPreview.innerHTML = `\\(${latex}\\)`;
        
        // Reemplazar el preview existente
        preview.parentNode.replaceChild(newPreview, preview);
      }
    });
    
    // Intentar renderizar nuevamente
    setManagedTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([this.symbolsContainer])
          .catch(err => {});
      }
    }, CONFIG.FORCE_RENDER_DELAY, CONFIG.TIMEOUT_KEYS.FORCE_RENDER);
  }
  
  /**
   * Muestra el editor
   */
  show() {
    if (!this.editorContainer) return;
    
    // Mostrar el editor
    addClass(this.editorContainer, 'show');
    this.isVisible = true;
    
    // Ocultar panel matemático si está visible
    const mathPanel = document.getElementById('mathPanel');
    if (mathPanel && hasClass(mathPanel, 'show')) {
      removeClass(mathPanel, 'show');
    }
    
    // Enfocar el campo MathLive
    if (this.mathfield) {
      setManagedTimeout(() => {
        this.mathfield.focus();
      }, CONFIG.FOCUS_DELAY, CONFIG.TIMEOUT_KEYS.FOCUS);
    }
    
    // Renderizar botones después de mostrar el editor
    setManagedTimeout(() => {
      this.renderMathButtonsPreview();
    }, CONFIG.RENDER_AFTER_SHOW_DELAY, CONFIG.TIMEOUT_KEYS.SHOW_RENDER);
    
    // Notificar que se ha mostrado
    eventBus.emit('mathEditorShown');
  }
  
  /**
   * Oculta el editor
   */
  hide() {
    if (!this.editorContainer) return;
    
    // Ocultar editor
    removeClass(this.editorContainer, 'show');
    this.isVisible = false;
    
    // Notificar que se ha ocultado
    eventBus.emit('mathEditorHidden');
  }
  
  /**
   * Alterna la visibilidad del editor
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
    
    // Notificar cambio
    eventBus.emit('mathEditorToggled', { visible: this.isVisible });
    
    return this.isVisible;
  }
  
  /**
   * Inserta un valor LaTeX en el campo MathLive
   * Para mantener compatibilidad con el sistema existente
   */
  insertLatexSymbol(latex) {
    if (!this.mathfield || !latex) return;
    
    // Insertar en la posición actual
    this.mathfield.executeCommand(['insert', latex]);
    
    // Mantener el foco
    this.mathfield.focus();
    
    // Notificar la inserción
    eventBus.emit('mathEditorSymbolInserted', { symbol: latex });
  }
  
  /**
   * Establece el valor completo del campo MathLive
   */
  setLatex(latex) {
    if (!this.mathfield || !latex) return;
    
    // Establecer el valor completo
    this.mathfield.value = latex;
    
    // Notificar el cambio
    eventBus.emit('mathEditorContentChanged', { latex });
  }
  
  /**
   * Obtiene el valor LaTeX actual
   */
  getLatex() {
    if (!this.mathfield) return '';
    return this.mathfield.value;
  }
  
  /**
   * 🆕 MEJORADA: Limpia los recursos del editor con registro completo
   */
  cleanup() {
    console.log('🧹 MathEditor: Iniciando limpieza de instancia...');
    
    try {
      // Limpiar event listeners registrados en esta instancia
      for (const [listenerId, listener] of this.eventListeners) {
        try {
          removeEvent(listener.element, listener.type, listener.handler);
          GLOBAL_REGISTRY.removeEventListener(listenerId);
        } catch (e) {
          console.warn(`Error al limpiar listener ${listenerId}:`, e);
        }
      }
      this.eventListeners.clear();
      
      // Limpiar timeouts específicos de esta instancia
      Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
        clearManagedTimeouts(key);
      });
      
      // Limpiar referencias DOM
      if (this.mathfield) {
        try {
          removeAllEvents(this.mathfield);
        } catch (e) {
          console.warn('Error al limpiar mathfield:', e);
        }
        this.mathfield = null;
      }
      
      this.editorContainer = null;
      this.symbolsContainer = null;
      this.textarea = null;
      
      // Resetear estado
      this.isVisible = false;
      this.isInitialized = false;
      this.initializationPromise = null;
      
      // Desregistrar de la lista global
      GLOBAL_REGISTRY.unregister(this);
      
      console.log('✅ MathEditor: Limpieza de instancia completada');
      
    } catch (error) {
      console.error('❌ MathEditor: Error durante limpieza:', error);
    }
  }
}

/**
 * 🆕 MEJORADA: Inicializa el editor matemático interactivo (singleton mejorado)
 * @returns {MathLiveEditor} Instancia del editor
 */
export function initMathEditor() {
  console.log('🚀 MathEditor: Solicitada inicialización...');
  
  // Si ya hay una instancia, verificar si está correctamente inicializada
  if (editorInstance) {
    if (editorInstance.isInitialized) {
      console.log('♻️ MathEditor: Reutilizando instancia existente');
      return editorInstance;
    } else {
      console.log('🔄 MathEditor: Instancia existente no inicializada, reinicializando...');
      editorInstance.reinitialize();
      return editorInstance;
    }
  }
  
  console.log('🆕 MathEditor: Creando nueva instancia...');
  editorInstance = new MathLiveEditor();
  
  return editorInstance;
}

/**
 * 🆕 NUEVA: Función para reinicializar el editor (para cambios de chat)
 */
export async function reinitMathEditor() {
  console.log('🔄 MathEditor: Solicitada reinicialización completa...');
  
  if (editorInstance) {
    return await editorInstance.reinitialize();
  } else {
    console.log('🆕 MathEditor: No hay instancia existente, creando nueva...');
    editorInstance = new MathLiveEditor();
    return true;
  }
}

/**
 * 🆕 MEJORADA: Limpia los recursos del editor con limpieza global
 */
export function cleanupMathEditor() {
  console.log('🧹 MathEditor: Solicitada limpieza completa...');
  
  // Limpiar instancia específica
  if (editorInstance) {
    editorInstance.cleanup();
    editorInstance = null;
  }
  
  // Limpiar registro global
  GLOBAL_REGISTRY.cleanupAll();
  
  console.log('✅ MathEditor: Limpieza completa finalizada');
}

/**
 * 🆕 NUEVA: Función para obtener la instancia actual (para debugging)
 */
export function getMathEditorInstance() {
  return editorInstance;
}

/**
 * 🆕 NUEVA: Función para verificar si el editor está listo
 */
export function isMathEditorReady() {
  return editorInstance && editorInstance.isInitialized;
}

// Limpiar recursos al descargar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMathEditor);
  
  // 🆕 Exponer funciones globalmente para debugging
  window.debugMathEditor = {
    getInstance: getMathEditorInstance,
    isReady: isMathEditorReady,
    reinit: reinitMathEditor,
    cleanup: cleanupMathEditor
  };
}

export default {
  initMathEditor,
  reinitMathEditor,
  cleanupMathEditor,
  getMathEditorInstance,
  isMathEditorReady
};