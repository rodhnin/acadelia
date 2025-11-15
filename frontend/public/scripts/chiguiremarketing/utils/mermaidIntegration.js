// mermaidUnified.js - Sistema Unificado de Mermaid
// Reemplaza: mermaidIntegration.js, explanationZoomIntegration.js y parte de themeManager.js

/**
 * SISTEMA UNIFICADO DE MERMAID
 * Maneja todo: inicialización, temas, streaming, zoom, renderizado
 */

import { MermaidZoomPan } from './mermaidZoomPan.js';

export class MermaidManager {
  constructor() {
    this.isInitialized = false;
    this.currentTheme = 'light';
    this.isProcessing = false;
    this.pendingDiagrams = new Set();
    this.processedDiagrams = new Map();
    this.observer = null;
    this.themeChangeTimeout = null;
    
    // Configuraciones de tema
    this.themeConfigs = {
      light: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#a4ac86',
          primaryTextColor: '#160e0e',
          primaryBorderColor: '#7f4f24',
          lineColor: '#666666',
          secondaryColor: '#f0efe7',
          tertiaryColor: '#ffffff',
          background: '#ffffff',
          mainBkg: '#f0efe7',
          secondBkg: '#e8f4f8',
          tertiaryBkg: '#ffffff',
          textColor: '#160e0e',
          titleColor: '#160e0e'
        }
      },
      dark: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#5C5858',
          primaryTextColor: '#f3f3f3',
          primaryBorderColor: '#bbbbbb',
          lineColor: '#cccccc',
          secondaryColor: '#2d3748',
          tertiaryColor: '#1a202c',
          background: '#252525',
          mainBkg: '#2d3748',
          secondBkg: '#1a202c',
          tertiaryBkg: '#252525',
          textColor: '#f3f3f3',
          titleColor: '#f3f3f3',
          nodeBkg: '#2d3748',
          nodeTextColor: '#f3f3f3',
          edgeLabelBackground: '#1a202c',
          clusterBkg: 'rgba(26, 32, 44, 0.3)',
          clusterBorder: '#5C5858',
          defaultLinkColor: '#cccccc'
        }
      }
    };
    
    // Bind methods
    this.handleMutation = this.handleMutation.bind(this);
    this.handleThemeChange = this.handleThemeChange.bind(this);
  }
  
  /**
   * Inicialización principal del sistema
   */
  async init() {
    if (this.isInitialized) {
      console.log('🎯 MermaidManager ya está inicializado');
      return true;
    }
    
    console.log('🚀 Inicializando MermaidManager unificado...');
    
    if (typeof mermaid === 'undefined') {
      console.error('❌ Mermaid no está cargado');
      return false;
    }
    
    try {
      this.currentTheme = document.body.getAttribute('data-theme') || 'light';
      
      this.configureMermaid();
      
      this.setupObserver();
      
      this.setupThemeListener();
      
      await this.processExistingDiagrams();
      
      this.isInitialized = true;
      console.log('✅ MermaidManager inicializado correctamente');
      
      return true;
      
    } catch (error) {
      console.error('❌ Error inicializando MermaidManager:', error);
      return false;
    }
  }
  
  /**
   * Configuración de Mermaid con tema actual
   */
  configureMermaid() {
    const config = {
      startOnLoad: false,
      securityLevel: 'loose',
      fontFamily: '"Poppins", sans-serif',
      fontSize: 16,
      useMaxWidth: false,
      logLevel: 'fatal',
      suppressErrors: true,
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        diagramPadding: 20,
        nodeSpacing: 50,
        rankSpacing: 50
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        messageFontWeight: 400
      },
      ...this.themeConfigs[this.currentTheme]
    };
    
    mermaid.initialize(config);
    console.log(`🎨 Mermaid configurado para tema: ${this.currentTheme}`);
  }
  
  /**
   * Configurar observer para detectar nuevos diagramas
   */
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver(this.handleMutation);
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-processed', 'class']
    });
    
    console.log('👀 Observer de Mermaid configurado');
  }
  
  /**
   * Manejar mutaciones del DOM
   */
  handleMutation(mutations) {
    if (this.isProcessing) return;
    
    let shouldProcess = false;
    const newDiagrams = [];
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList?.contains('mermaid') && !node.getAttribute('data-processed')) {
              newDiagrams.push(node);
              shouldProcess = true;
            }
            
            const mermaidElements = node.querySelectorAll?.('.mermaid:not([data-processed])');
            if (mermaidElements?.length > 0) {
              newDiagrams.push(...mermaidElements);
              shouldProcess = true;
            }
          }
        }
      }
      
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        
        // Si un mensaje terminó de hacer streaming, procesar sus diagramas
        if (target.classList.contains('message') && 
            !target.classList.contains('streaming') &&
            mutation.oldValue?.includes('streaming')) {
          
          const messageDiagrams = target.querySelectorAll('.mermaid:not([data-processed])');
          if (messageDiagrams.length > 0) {
            newDiagrams.push(...messageDiagrams);
            shouldProcess = true;
            console.log(`📝 Streaming completado - procesando ${messageDiagrams.length} diagramas`);
          }
        }
      }
    }
    
    if (shouldProcess) {
      // Debounce para evitar múltiples llamadas
      clearTimeout(this.processTimeout);
      this.processTimeout = setTimeout(() => {
        this.processNewDiagrams(newDiagrams);
      }, 100);
    }
  }
  
  /**
   * Procesar nuevos diagramas detectados
   */
  async processNewDiagrams(diagrams) {
    if (this.isProcessing || diagrams.length === 0) return;
    
    this.isProcessing = true;
    console.log(`🔄 Procesando ${diagrams.length} nuevos diagramas...`);
    
    try {
      for (const diagram of diagrams) {
        await this.processSingleDiagram(diagram);
        
        // Pequeño delay entre diagramas para evitar bloqueo
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('❌ Error procesando diagramas:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Procesar un diagrama individual
   */
  async processSingleDiagram(diagram) {
    if (!diagram || diagram.getAttribute('data-processed') === 'true') {
      return;
    }
    
    try {
      if (!document.contains(diagram)) {
        console.log('⚠️ Diagrama no está en el DOM, omitiendo');
        return;
      }
      
      const content = this.extractDiagramContent(diagram);
      if (!content) {
        console.log('⚠️ No se pudo extraer contenido del diagrama');
        return;
      }
      
      diagram.setAttribute('data-original-code', content);
      
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      diagram.id = diagramId;
      
      this.showLoading(diagram);
      
      await this.renderDiagram(diagram, content, diagramId);
      
      diagram.setAttribute('data-processed', 'true');
      
      this.setupZoomForDiagram(diagram);
      
      this.processedDiagrams.set(diagram.id, {
        element: diagram,
        originalCode: content,
        hasZoom: false
      });
      
      console.log(`✅ Diagrama procesado: ${diagramId}`);
      
    } catch (error) {
      console.error('❌ Error procesando diagrama individual:', error);
      this.showError(diagram, error.message);
    }
  }
  
  /**
   * Extraer contenido del diagrama
   */
  extractDiagramContent(diagram) {
    let content = diagram.textContent || diagram.innerHTML || '';
    content = content.trim();
    
    if (content.includes('<svg') || content.includes('mermaid-')) {
      return null;
    }
    
    const mermaidKeywords = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'pie', 'gantt', 'erDiagram', 'journey'
    ];
    
    const isValidMermaid = mermaidKeywords.some(keyword => content.includes(keyword));
    
    return isValidMermaid ? content : null;
  }
  
  /**
   * Renderizar diagrama con Mermaid
   */
  async renderDiagram(diagram, content, diagramId) {
    try {
      diagram.innerHTML = '';
      
      if (mermaid.render) {
        const { svg } = await mermaid.render(`${diagramId}-svg`, content);
        diagram.innerHTML = svg;
      } else {
        diagram.textContent = content;
        await mermaid.init(undefined, diagram);
      }
      
    } catch (error) {
      throw new Error(`Error renderizando: ${error.message}`);
    }
  }
  
  /**
   * Configurar zoom para un diagrama
   */
  setupZoomForDiagram(diagram) {
    if (!diagram.querySelector('svg') || diagram.getAttribute('data-zoom-enabled') === 'true') {
      return;
    }
    
    try {
      const isExplanation = diagram.closest('.explanation-container') || 
                           diagram.closest('.visualization-container');
      
      const options = isExplanation ? {
        controlsScale: 0.9,
        minZoom: 0.2,
        maxZoom: 4,
        preserveContainerPosition: true
      } : {};
      
      const zoomPan = new MermaidZoomPan(diagram, options);
      diagram._zoomPanInstance = zoomPan;
      
      const diagramData = this.processedDiagrams.get(diagram.id);
      if (diagramData) {
        diagramData.hasZoom = true;
      }
      
      console.log(`🔍 Zoom configurado para: ${diagram.id}`);
      
    } catch (error) {
      console.warn('⚠️ Error configurando zoom:', error);
    }
  }
  
  /**
   * Mostrar loading en diagrama
   */
  showLoading(diagram) {
    diagram.innerHTML = `
      <div class="mermaid-loading" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--color-text);
        min-height: 120px;
      ">
        <i class="bx bx-loader-alt bx-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
        <div>Generando diagrama...</div>
      </div>
    `;
  }
  
  /**
   * Mostrar error en diagrama
   */
  showError(diagram, message) {
    diagram.innerHTML = `
      <div class="mermaid-error" style="
        text-align: center;
        padding: 1.5rem;
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border-radius: 8px;
        border: 1px solid rgba(220, 53, 69, 0.3);
        min-height: 100px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      ">
        <i class="bx bx-error" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
        <div style="font-weight: 500; margin-bottom: 0.5rem;">Error al generar diagrama</div>
        <div style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">${message}</div>
        <button onclick="window.mermaidManager?.retryDiagram('${diagram.id}')" style="
          padding: 0.5rem 1rem;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        ">
          <i class="bx bx-refresh"></i> Reintentar
        </button>
      </div>
    `;
    
    diagram.setAttribute('data-error', 'true');
  }
  
  /**
   * Configurar listener para cambios de tema
   */
  setupThemeListener() {
    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-theme' && 
            mutation.target === document.body) {
          
          const newTheme = document.body.getAttribute('data-theme') || 'light';
          
          if (newTheme !== this.currentTheme) {
            this.handleThemeChange(newTheme);
          }
        }
      }
    });
    
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    console.log('🎨 Listener de cambio de tema configurado');
  }
  
  /**
   * Manejar cambio de tema
   */
  async handleThemeChange(newTheme) {
    if (this.isProcessing) {
      console.log('⚠️ Procesamiento en curso, posponiendo cambio de tema');
      clearTimeout(this.themeChangeTimeout);
      this.themeChangeTimeout = setTimeout(() => {
        this.handleThemeChange(newTheme);
      }, 1000);
      return;
    }
    
    console.log(`🎨 Cambiando tema: ${this.currentTheme} → ${newTheme}`);
    
    this.isProcessing = true;
    this.currentTheme = newTheme;
    
    try {
      // Reconfigurar Mermaid
      this.configureMermaid();
      
      await this.updateAllDiagramsForTheme();
      
    } catch (error) {
      console.error('❌ Error en cambio de tema:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Actualizar todos los diagramas para el nuevo tema
   */
  async updateAllDiagramsForTheme() {
    const diagrams = Array.from(this.processedDiagrams.values());
    
    console.log(`🔄 Actualizando ${diagrams.length} diagramas para tema ${this.currentTheme}`);
    
    for (const diagramData of diagrams) {
      try {
        await this.updateSingleDiagramTheme(diagramData);
        
        // Delay entre actualizaciones
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`⚠️ Error actualizando diagrama ${diagramData.element.id}:`, error);
      }
    }
    
    console.log('✅ Actualización de tema completada');
  }
  
  /**
   * Actualizar un diagrama individual para el nuevo tema
   */
  async updateSingleDiagramTheme(diagramData) {
    const { element, originalCode, hasZoom } = diagramData;
    
    if (!document.contains(element) || !originalCode) {
      return;
    }
    
    try {
      // Destruir zoom si existe
      if (hasZoom && element._zoomPanInstance) {
        element._zoomPanInstance.destroy();
        diagramData.hasZoom = false;
      }
      
      this.showLoading(element);
      
      element.removeAttribute('data-processed');
      element.removeAttribute('data-zoom-enabled');
      element.removeAttribute('data-error');
      
      // Re-renderizar
      await this.renderDiagram(element, originalCode, element.id);
      
      element.setAttribute('data-processed', 'true');
      
      this.setupZoomForDiagram(element);
      
    } catch (error) {
      console.error(`❌ Error actualizando diagrama ${element.id}:`, error);
      this.showError(element, `Error actualizando tema: ${error.message}`);
    }
  }
  
  /**
   * Procesar diagramas existentes al inicializar
   */
  async processExistingDiagrams() {
    const existingDiagrams = document.querySelectorAll('.mermaid:not([data-processed])');
    
    if (existingDiagrams.length === 0) {
      console.log('📊 No hay diagramas existentes para procesar');
      return;
    }
    
    console.log(`📊 Procesando ${existingDiagrams.length} diagramas existentes...`);
    
    await this.processNewDiagrams(Array.from(existingDiagrams));
  }
  
  /**
   * Reintentar un diagrama específico
   */
  async retryDiagram(diagramId) {
    const diagramData = this.processedDiagrams.get(diagramId);
    
    if (!diagramData) {
      console.error(`❌ No se encontró diagrama con ID: ${diagramId}`);
      return;
    }
    
    const { element, originalCode } = diagramData;
    
    element.removeAttribute('data-error');
    element.removeAttribute('data-processed');
    
    try {
      await this.processSingleDiagram(element);
      console.log(`✅ Diagrama ${diagramId} reintentado exitosamente`);
    } catch (error) {
      console.error(`❌ Error reintentando diagrama ${diagramId}:`, error);
    }
  }
  
  /**
   * API pública: Procesar un contenedor específico
   */
  async processContainer(container) {
    const diagrams = container.querySelectorAll('.mermaid:not([data-processed])');
    
    if (diagrams.length > 0) {
      await this.processNewDiagrams(Array.from(diagrams));
    }
  }
  
  /**
   * API pública: Forzar reprocesamiento de todos los diagramas
   */
  async reprocessAll() {
    console.log('🔄 Reprocesando todos los diagramas...');
    
    for (const diagramData of this.processedDiagrams.values()) {
      if (diagramData.hasZoom && diagramData.element._zoomPanInstance) {
        diagramData.element._zoomPanInstance.destroy();
      }
      
      diagramData.element.removeAttribute('data-processed');
      diagramData.element.removeAttribute('data-zoom-enabled');
      diagramData.element.removeAttribute('data-error');
    }
    
    this.processedDiagrams.clear();
    
    // Reprocesar
    await this.processExistingDiagrams();
  }
  
  /**
   * Limpiar todos los recursos
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    clearTimeout(this.processTimeout);
    clearTimeout(this.themeChangeTimeout);
    
    // Destruir todas las instancias de zoom
    for (const diagramData of this.processedDiagrams.values()) {
      if (diagramData.hasZoom && diagramData.element._zoomPanInstance) {
        diagramData.element._zoomPanInstance.destroy();
      }
    }
    
    this.processedDiagrams.clear();
    this.isInitialized = false;
    
    console.log('🧹 MermaidManager limpiado');
  }
}

// Instancia global
let mermaidManager = null;

/**
 * Funciones de API pública
 */
export async function initMermaidUnified() {
  if (mermaidManager) {
    console.log('✅ MermaidManager ya existe');
    return mermaidManager;
  }
  
  mermaidManager = new MermaidManager();
  const success = await mermaidManager.init();
  
  if (success) {
    // Exponer globalmente
    window.mermaidManager = mermaidManager;
    console.log('✅ MermaidManager inicializado y disponible globalmente');
  }
  
  return success ? mermaidManager : null;
}

export function processMermaidElements(container) {
  if (mermaidManager) {
    return mermaidManager.processContainer(container);
  } else {
    console.warn('⚠️ MermaidManager no está inicializado');
  }
}

export function getMermaidStatus() {
  return {
    initialized: mermaidManager?.isInitialized || false,
    currentTheme: mermaidManager?.currentTheme || 'light',
    isProcessing: mermaidManager?.isProcessing || false,
    diagramCount: mermaidManager?.processedDiagrams.size || 0
  };
}

// Funciones auxiliares para retrocompatibilidad
export function retryMermaidDiagram(element) {
  if (mermaidManager && element?.id) {
    return mermaidManager.retryDiagram(element.id);
  }
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initMermaidUnified, 500);
  });
} else {
  setTimeout(initMermaidUnified, 500);
}

// Exponer funciones globales para retrocompatibilidad
window.processMermaidElements = processMermaidElements;
window.retryMermaidDiagram = retryMermaidDiagram;
window.getMermaidStatus = getMermaidStatus;

export default {
  MermaidManager,
  initMermaidUnified,
  processMermaidElements,
  getMermaidStatus,
  retryMermaidDiagram
};