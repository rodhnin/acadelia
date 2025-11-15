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

let editorInstance = null;

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
    for (const [key] of this.eventListeners) {
      this.removeEventListener(key);
    }
    
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
    
    Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
      clearManagedTimeouts(key);
    });
    
    console.log('🧹 MathEditor: Limpieza global completada');
  }
};

// Clase principal para el editor interactivo
class MathLiveEditor {
  constructor() {
    GLOBAL_REGISTRY.register(this);
    
    // Referencias a elementos DOM
    this.editorContainer = null;
    this.mathfield = null;
    this.symbolsContainer = null;
    this.textarea = null; // Textarea original del chat
    
    // Estado del editor
    this.isVisible = false;
    this.isInitialized = false;
    
    this.eventListeners = new Map();
    
    this.initializationPromise = null;
    
    this.init();
  }
  
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInit();
    return this.initializationPromise;
  }
  
  async _performInit() {
    try {
      console.log('🔧 MathEditor: Iniciando inicialización...');
      
      this.createEditorDOM();
      this.initMathLive();
      this.simplifyToolbar();
      this.setupEventListeners();
      this.injectSymbolsPanel();
      
      setManagedTimeout(() => {
        this.renderMathButtonsPreview();
      }, CONFIG.RENDER_DELAY, CONFIG.TIMEOUT_KEYS.INITIAL_RENDER);
      
      this.isInitialized = true;
      
      eventBus.emit('mathEditorInitialized', { editor: this });
      
      console.log('✅ MathEditor: Inicialización completada');
      
    } catch (error) {
      console.error('❌ MathEditor: Error en inicialización:', error);
      this.isInitialized = false;
      throw error;
    }
  }
  
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
    
    toolbar.innerHTML = '';
    
    const title = createElement('div', {
      className: 'editor-title'
    }, 'Editor de Ecuaciones');
    toolbar.appendChild(title);
    
    const sendButton = createElement('button', {
      className: 'toolbar-btn send-button'
    }, 'Enviar al Chat');
    toolbar.appendChild(sendButton);
    
    const sendHandler = () => {
      this.sendLatexToTextarea();
    };
    
    const listenerId = this.addEventListenerWithCleanup(sendButton, 'click', sendHandler);
    
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
    this.editorContainer = document.getElementById('math-editor-container');
    
    if (this.editorContainer) {
      const toolbar = this.editorContainer.querySelector('.editor-toolbar');
      const symbolsPanel = this.editorContainer.querySelector('.math-symbols-panel');
      
      // Si no existe el contenedor del mathfield, crearlo
      let mathfieldContainer = this.editorContainer.querySelector('.mathfield-container');
      if (!mathfieldContainer) {
        const editorArea = this.editorContainer.querySelector('.editor-area');
        if (editorArea) {
          // Vaciar contenido existente
          editorArea.innerHTML = '';
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
    
    this.mathfieldContainer.innerHTML = '';
    
    this.mathfieldElement = createElement('math-field', {
      id: 'mathfield'
    });
    
    this.mathfieldElement.style.width = '100%';
    this.mathfieldElement.style.minHeight = '100px';
    this.mathfieldElement.style.padding = '8px';
    this.mathfieldElement.style.fontSize = '16px';
    this.mathfieldElement.style.borderRadius = 'var(--border-radius-sm, 4px)';
    
    this.mathfieldElement.setAttribute('math-virtual-keyboard-policy', 'off');
    this.mathfieldElement.smartFence = true;
    this.mathfieldElement.smartMode = true;
    this.mathfieldElement.keypressVibration = false;
    
    this.mathfieldContainer.appendChild(this.mathfieldElement);
    
    this.mathfield = this.mathfieldElement;
    
    // Personalizar el comportamiento del espacio directamente
    if (window.MathLive && this.mathfield) {
      try {
        this.mathfield.macros = {}; 
        
        const keystrokeHandler = (ev) => {
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
    
    this.textarea = document.querySelector(DOM_SELECTORS.textarea) || 
                    document.querySelector('.input-box textarea');
    
    if (!this.textarea) {
      console.warn('No se encontró el textarea para insertar LaTeX');
      return;
    }
    
    const latexContent = this.mathfield.value.trim();
    if (!latexContent) return;
    
    let processedContent = improveLatexFormatting(preprocessComplexFormula(latexContent));
    
    // Asegurar que el contenido tiene delimitadores LaTeX
    if (!processedContent.startsWith('$') && !processedContent.startsWith('\\(')) {
      processedContent = '$' + processedContent + '$';
    } else if (processedContent.startsWith('$') && !processedContent.endsWith('$')) {
      processedContent = processedContent + '$';
    } else if (processedContent.startsWith('\\(') && !processedContent.endsWith('\\)')) {
      processedContent = processedContent + '\\)';
    }
    
    const cursorPos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, cursorPos);
    const textAfter = this.textarea.value.substring(cursorPos);
    
    this.textarea.value = textBefore + processedContent + textAfter;
    
    const newCursorPos = cursorPos + processedContent.length;
    this.textarea.selectionStart = this.textarea.selectionEnd = newCursorPos;
    
    // Enfocar el textarea para continuar escribiendo
    this.textarea.focus();
    
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
    
    sectionContents.forEach(section => {
      addClass(section, 'collapsed');
    });
    
    toggleButtons.forEach(button => {
      button.textContent = '▶';
      addClass(button, 'collapsed');
    });
  }
  
  setupExistingSymbolButtons() {
    console.log('🔧 MathEditor: Configurando botones matemáticos CSP-compatible...');
    
    const buttons = this.symbolsContainer.querySelectorAll('.math-btn');
    
    buttons.forEach(button => {
      removeAllEvents(button);
    });
    
    buttons.forEach((button, index) => {
      const latexCode = button.getAttribute('data-latex') || '';
      
      if (!latexCode) {
        console.warn(`MathEditor: Botón ${index} sin data-latex válido`);
        return;
      }
      
      button.removeAttribute('onclick');
      button.removeAttribute('onmousedown');
      button.removeAttribute('onmouseup');
      
      const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const code = button.getAttribute('data-latex');
        if (!code) return;
        
        console.log(`🔧 MathEditor: Insertando símbolo: ${code}`);
        
        if (this.mathfield) {
          try {
            this.mathfield.executeCommand(['insert', code]);
            this.mathfield.focus();
          } catch (error) {
            console.warn('Error al insertar en MathLive:', error);
            this.mathfield.insert(code);
          }
        }
        
        eventBus.emit('mathButtonClicked', { symbol: code });
      };
      
      this.addEventListenerWithCleanup(button, 'click', clickHandler);
    });
    
    this.setupSectionToggles();
    
    // Asegurar que las fórmulas en los botones se rendericen correctamente
    setManagedTimeout(() => {
      this.renderMathButtonsPreview();
    }, CONFIG.RENDER_BUTTONS_DELAY, CONFIG.TIMEOUT_KEYS.BUTTON_RENDER);
    
    console.log(`✅ MathEditor: ${buttons.length} botones matemáticos configurados`);
  }
  
  setupSectionToggles() {
    const toggleButtons = this.symbolsContainer.querySelectorAll('.toggle-btn');
    
    // Asegurar que todas las secciones estén colapsadas inicialmente
    const sectionContents = this.symbolsContainer.querySelectorAll('.section-content');
    sectionContents.forEach(section => {
      addClass(section, 'collapsed');
    });
    
    toggleButtons.forEach(button => {
      button.textContent = '▶';
      addClass(button, 'collapsed');
      
      removeAllEvents(button);
      
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
      
      this.addEventListenerWithCleanup(button, 'click', clickHandler);
    });
  }
  
  /**
   * Renderiza matemáticas en una sección específica
   */
  renderSectionMath(section) {
    if (!section) return;
    
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
    
    mathPreviews.forEach(preview => {
      if (preview.querySelector('.MathJax')) return; // Ya está renderizado
      
      let content = preview.innerHTML;
      
      // Si ya tiene delimitadores, dejarlo así
      if (content.includes('\\(') || content.includes('$')) return;
      
      // Si contiene comandos LaTeX, agregar delimitadores
      if (content.includes('\\')) {
        preview.innerHTML = `\\(${content}\\)`;
      }
    });
    
    if (window.MathJax) {
      if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([this.symbolsContainer])
          .then(() => {})
          .catch(err => {
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
    const mathButtons = this.symbolsContainer.querySelectorAll('.math-btn');
    
    mathButtons.forEach(button => {
      const preview = button.querySelector('.math-preview');
      if (!preview) return;
      
      let latex = button.getAttribute('data-latex') || '';
      if (latex && !preview.querySelector('.MathJax')) {
        const newPreview = createElement('span', {
          className: 'math-preview'
        });
        
        newPreview.innerHTML = `\\(${latex}\\)`;
        
        preview.parentNode.replaceChild(newPreview, preview);
      }
    });
    
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
    
    addClass(this.editorContainer, 'show');
    this.isVisible = true;
    
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
    
    setManagedTimeout(() => {
      this.renderMathButtonsPreview();
    }, CONFIG.RENDER_AFTER_SHOW_DELAY, CONFIG.TIMEOUT_KEYS.SHOW_RENDER);
    
    eventBus.emit('mathEditorShown');
  }
  
  /**
   * Oculta el editor
   */
  hide() {
    if (!this.editorContainer) return;
    
    removeClass(this.editorContainer, 'show');
    this.isVisible = false;
    
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
    
    eventBus.emit('mathEditorToggled', { visible: this.isVisible });
    
    return this.isVisible;
  }
  
  /**
   * Inserta un valor LaTeX en el campo MathLive
   * Para mantener compatibilidad con el sistema existente
   */
  insertLatexSymbol(latex) {
    if (!this.mathfield || !latex) return;
    
    this.mathfield.executeCommand(['insert', latex]);
    
    // Mantener el foco
    this.mathfield.focus();
    
    eventBus.emit('mathEditorSymbolInserted', { symbol: latex });
  }
  
  /**
   * Establece el valor completo del campo MathLive
   */
  setLatex(latex) {
    if (!this.mathfield || !latex) return;
    
    this.mathfield.value = latex;
    
    eventBus.emit('mathEditorContentChanged', { latex });
  }
  
  /**
   * Obtiene el valor LaTeX actual
   */
  getLatex() {
    if (!this.mathfield) return '';
    return this.mathfield.value;
  }
  
  cleanup() {
    console.log('🧹 MathEditor: Iniciando limpieza de instancia...');
    
    try {
      for (const [listenerId, listener] of this.eventListeners) {
        try {
          removeEvent(listener.element, listener.type, listener.handler);
          GLOBAL_REGISTRY.removeEventListener(listenerId);
        } catch (e) {
          console.warn(`Error al limpiar listener ${listenerId}:`, e);
        }
      }
      this.eventListeners.clear();
      
      Object.values(CONFIG.TIMEOUT_KEYS).forEach(key => {
        clearManagedTimeouts(key);
      });
      
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

export function cleanupMathEditor() {
  console.log('🧹 MathEditor: Solicitada limpieza completa...');
  
  if (editorInstance) {
    editorInstance.cleanup();
    editorInstance = null;
  }
  
  GLOBAL_REGISTRY.cleanupAll();
  
  console.log('✅ MathEditor: Limpieza completa finalizada');
}

export function getMathEditorInstance() {
  return editorInstance;
}

export function isMathEditorReady() {
  return editorInstance && editorInstance.isInitialized;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMathEditor);
  
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