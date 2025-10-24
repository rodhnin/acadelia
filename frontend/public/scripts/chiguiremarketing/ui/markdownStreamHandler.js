// markdownStreamHandler.js - ACTUALIZADO CON SISTEMA UNIVERSAL DE MATHJAX

import { renderMarkdownStreaming, processSpecialElements } from '../utils/markdownParser.js';
import { 
  processUniversalMath, 
  processCompleteMath,
  detectUniversalMath 
} from '../utils/universalMathProcessor.js';

export class MarkdownStreamHandler {
  constructor(messageElement, controller) {
    this.messageEl = messageElement;
    this.controller = controller;
    this.contentEl = messageElement.querySelector('.message-content');
    
    // Estado del streaming
    this.chunks = [];
    this.fullContent = '';
    this.isComplete = false;
    this.lastRenderTime = 0;
    this.renderTimeout = null;
    
    // Configuración de timing - simplificada
    this.RENDER_DELAY = 100;
    this.MIN_CHUNK_SIZE = 2;
    
    // ✨ NUEVO: Estado de matemáticas con sistema universal
    this.mathDetection = {
      hasMath: false,
      confidence: 0,
      types: [],
      processed: false
    };
    
    // Estado de Mermaid
    this.hasMermaidContent = false;
    this.mermaidProcessed = false;
    
    if (!this.contentEl) {
      throw new Error('No se encontró elemento .message-content');
    }
    
    // Inicialización simple
    this.messageEl.classList.add('streaming');
    this.contentEl.innerHTML = '<span class="typing-indicator">●●●</span>';
    
    console.log('📝 MarkdownStreamHandler inicializado con Sistema Universal de MathJax');
  }
  
  processChunk(chunk) {
    if (!chunk || this.isComplete) return;
    
    // Guardar chunk sin modificar
    this.chunks.push(chunk);
    this.fullContent += chunk;
    
    // ✨ NUEVO: Detectar contenido matemático durante el streaming
    if (!this.mathDetection.hasMath) {
      const detection = detectUniversalMath(this.fullContent);
      if (detection.hasMath) {
        this.mathDetection = detection;
        console.log(`🔍 Matemáticas detectadas durante streaming: ${detection.types.join(', ')} (${(detection.confidence * 100).toFixed(1)}%)`);
      }
    }
    
    // Detectar contenido Mermaid durante el streaming
    if (!this.hasMermaidContent) {
      this.hasMermaidContent = this.detectMermaidContent(this.fullContent);
    }
    
    // Verificar contenido antes de renderizar
    const hasValidContent = this.fullContent.trim().length > 0;
    const hasEnoughContent = this.fullContent.length >= this.MIN_CHUNK_SIZE;
    
    if (hasValidContent && hasEnoughContent) {
      this.scheduleRender();
    }
  }
  
  /**
   * Detectar si el contenido contiene diagramas Mermaid
   */
  detectMermaidContent(content) {
    const mermaidPatterns = [
      /```mermaid/i,
      /graph\s+(TD|TB|BT|RL|LR)/i,
      /flowchart\s+(TD|TB|BT|RL|LR)/i,
      /sequenceDiagram/i,
      /classDiagram/i,
      /stateDiagram/i,
      /erDiagram/i,
      /pie\s+title/i,
      /gantt/i,
      /journey/i
    ];
    
    return mermaidPatterns.some(pattern => pattern.test(content));
  }
  
  scheduleRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    if (timeSinceLastRender >= this.RENDER_DELAY) {
      this.render();
    } else {
      this.renderTimeout = setTimeout(() => {
        this.render();
      }, this.RENDER_DELAY - timeSinceLastRender);
    }
  }
  
  render() {
    if (this.isComplete) return;
    
    this.lastRenderTime = Date.now();
    
    try {
      // Renderizado directo sin transiciones
      const html = renderMarkdownStreaming(this.fullContent, true);
      
      // Actualizar DOM directamente
      this.contentEl.innerHTML = html;
      
      // ✨ NUEVO: Procesar elementos especiales de manera limitada durante streaming
      setTimeout(() => {
        this.processElementsSafeStreaming();
      }, 50);
      
      // Mantener scroll
      this.ensureScroll();
      
    } catch (error) {
      console.error('❌ Error renderizando durante streaming:', error);
      this.handleRenderError(error);
    }
  }
  
  /**
   * ✨ NUEVO: Procesamiento seguro de elementos durante streaming
   * INCLUYE preparación de matemáticas con sistema universal
   */
  processElementsSafeStreaming() {
    try {
      // Solo highlight.js durante streaming
      const codeBlocks = this.contentEl.querySelectorAll('pre code:not(.hljs)');
      if (codeBlocks.length > 0 && typeof hljs !== 'undefined') {
        codeBlocks.forEach(block => {
          try {
            // No procesar bloques mermaid durante streaming
            if (!block.textContent.includes('graph') && 
                !block.textContent.includes('flowchart') &&
                !block.textContent.includes('sequenceDiagram')) {
              hljs.highlightElement(block);
            }
          } catch (e) {
            console.warn('Error con highlight.js:', e);
          }
        });
      }
      
      // ✨ NUEVO: Preparar matemáticas con sistema universal (sin renderizar aún)
      if (this.mathDetection.hasMath && !this.mathDetection.processed) {
        processUniversalMath(this.contentEl, true)
          .then((prepared) => {
            if (prepared) {
              console.log('🏷️ Matemáticas preparadas para procesamiento posterior');
            }
          })
          .catch((error) => {
            console.warn('⚠️ Error preparando matemáticas:', error);
          });
      }
      
      // Procesar otros elementos que no sean Mermaid o matemáticas complejas
      const mathElements = this.contentEl.querySelectorAll('.math-expression:not(.processed)');
      if (mathElements.length > 0) {
        mathElements.forEach(el => {
          try {
            if (window.processMathExpression) {
              window.processMathExpression(el);
            }
          } catch (e) {
            console.warn('Error procesando matemáticas simples:', e);
          }
        });
      }
      
    } catch (error) {
      console.warn('Error procesando elementos durante streaming:', error);
    }
  }
  
  ensureScroll() {
    if (typeof window.ensureScrollToBottom === 'function') {
      requestAnimationFrame(() => {
        window.ensureScrollToBottom();
      });
    }
  }
  
  /**
   * ✨ COMPLETAR STREAMING - RENOVADO CON SISTEMA UNIVERSAL
   */
  async complete() {
    if (this.isComplete) return;
    
    console.log('📝 Completando streaming...', { 
      hasMermaid: this.hasMermaidContent,
      hasMath: this.mathDetection.hasMath,
      mathTypes: this.mathDetection.types,
      contentLength: this.fullContent.length 
    });
    
    this.isComplete = true;
    
    // Cancelar renders pendientes
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
    
    try {
      // PASO 1: Renderizado final usando sistema centralizado sin cursor
      const finalHtml = renderMarkdownStreaming(this.fullContent, false);
      this.contentEl.innerHTML = finalHtml;
      
      // PASO 2: Remover clases de streaming inmediatamente
      this.messageEl.classList.remove('streaming');
      this.contentEl.classList.remove('loading');
      
      // PASO 3: Procesar elementos especiales (incluyendo matemáticas y Mermaid)
      await this.processAllElementsFinal();
      
      console.log('✅ Streaming completado con Sistema Universal');
      
    } catch (error) {
      console.error('❌ Error en renderizado final:', error);
      this.handleRenderError(error);
    }
    
    // Scroll final
    setTimeout(() => this.ensureScroll(), 100);
  }
  
  /**
   * ✨ PROCESAMIENTO FINAL DE ELEMENTOS - RENOVADO CON SISTEMA UNIVERSAL
   */
  async processAllElementsFinal() {
    try {
      console.log('🔧 Iniciando procesamiento final de elementos...');
      
      // PASO 1: Procesar elementos básicos primero
      processSpecialElements(this.contentEl, false); // isStreamingComplete = false para elementos básicos
      
      // PASO 2: ✨ PROCESAR MATEMÁTICAS CON SISTEMA UNIVERSAL
      if (this.mathDetection.hasMath) {
        console.log('🧮 Procesando matemáticas con Sistema Universal...');
        
        try {
          const mathSuccess = await processCompleteMath(this.contentEl);
          if (mathSuccess) {
            this.mathDetection.processed = true;
            console.log('✅ Matemáticas procesadas exitosamente con Sistema Universal');
          } else {
            console.log('📭 No se procesaron matemáticas (puede ser normal)');
          }
        } catch (mathError) {
          console.error('❌ Error procesando matemáticas:', mathError);
          
          // Fallback: intentar procesamiento básico
          console.log('🔄 Intentando procesamiento matemático de respaldo...');
          setTimeout(() => {
            if (window.forceProcessMath) {
              window.forceProcessMath();
            }
          }, 500);
        }
      }
      
      // PASO 3: Si hay contenido Mermaid, usar el sistema unificado
      if (this.hasMermaidContent && window.mermaidManager) {
        console.log('🎨 Procesando diagramas Mermaid con sistema unificado...');
        
        // Verificar que el MermaidManager esté inicializado
        if (window.mermaidManager.isInitialized) {
          await window.mermaidManager.processContainer(this.contentEl);
          this.mermaidProcessed = true;
          console.log('✅ Diagramas Mermaid procesados exitosamente');
        } else {
          console.warn('⚠️ MermaidManager no está inicializado, reintentando...');
          
          // Reintentar después de un delay
          setTimeout(async () => {
            if (window.mermaidManager?.isInitialized) {
              await window.mermaidManager.processContainer(this.contentEl);
              this.mermaidProcessed = true;
              console.log('✅ Diagramas Mermaid procesados en reintento');
            } else {
              console.error('❌ No se pudo procesar Mermaid: Manager no disponible');
            }
          }, 500);
        }
      }
      
      // PASO 4: Procesamiento final de elementos especiales
      setTimeout(() => {
        processSpecialElements(this.contentEl, true); // isStreamingComplete = true para procesamiento completo
        this.postProcessElements();
      }, 200);
      
    } catch (error) {
      console.error('❌ Error en procesamiento final:', error);
    }
  }
  
  /**
   * Post-procesamiento después de todos los sistemas especiales
   */
  postProcessElements() {
    try {
      // Actualizar highlight.js para cualquier código que pueda haberse perdido
      const newCodeBlocks = this.contentEl.querySelectorAll('pre code:not(.hljs)');
      if (newCodeBlocks.length > 0 && typeof hljs !== 'undefined') {
        newCodeBlocks.forEach(block => {
          try {
            hljs.highlightElement(block);
          } catch (e) {
            console.warn('Error en post-procesamiento de código:', e);
          }
        });
      }
      
      // ✨ NUEVO: Verificar que las matemáticas se procesaron correctamente
      if (this.mathDetection.hasMath && !this.mathDetection.processed) {
        console.warn('⚠️ Matemáticas no se procesaron completamente');
        
        // Reintento con el sistema universal
        setTimeout(() => {
          processCompleteMath(this.contentEl)
            .then((success) => {
              if (success) {
                this.mathDetection.processed = true;
                console.log('✅ Matemáticas procesadas en reintento');
              }
            })
            .catch((error) => {
              console.error('❌ Error en reintento matemático:', error);
            });
        }, 1000);
      }
      
      // Verificar que los diagramas Mermaid se procesaron correctamente
      if (this.hasMermaidContent) {
        const unprocessedMermaid = this.contentEl.querySelectorAll('.mermaid:not([data-processed])');
        if (unprocessedMermaid.length > 0) {
          console.warn(`⚠️ ${unprocessedMermaid.length} diagramas Mermaid no se procesaron`);
          
          // Reintento manual
          if (window.mermaidManager) {
            setTimeout(() => {
              window.mermaidManager.processContainer(this.contentEl);
            }, 1000);
          }
        }
      }
      
    } catch (error) {
      console.warn('Error en post-procesamiento:', error);
    }
  }
  
  /**
   * Manejo de errores de renderizado - sin transiciones
   */
  handleRenderError(error) {
    try {
      const emergencyHtml = renderMarkdownStreaming(this.fullContent, false);
      this.contentEl.innerHTML = emergencyHtml;
    } catch (emergencyError) {
      console.error('❌ Error crítico en fallback:', emergencyError);
      this.contentEl.innerHTML = this.emergencyDisplay();
    }
  }
  
  emergencyDisplay() {
    if (!this.fullContent) return 'Error renderizando contenido';
    
    return `<p>${this.fullContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')}</p>`;
  }
  
  /**
   * ✨ NUEVAS API para verificar estado de matemáticas y Mermaid
   */
  hasMathContent() {
    return this.mathDetection.hasMath;
  }
  
  getMathDetection() {
    return { ...this.mathDetection };
  }
  
  isMathProcessed() {
    return this.mathDetection.processed;
  }
  
  hasMermaidDiagrams() {
    return this.hasMermaidContent;
  }
  
  isMermaidProcessed() {
    return this.mermaidProcessed;
  }
  
  /**
   * ✨ NUEVO: Forzar reprocesamiento de matemáticas
   */
  async reprocessMath() {
    if (this.mathDetection.hasMath && this.isComplete) {
      console.log('🔄 Reprocesando matemáticas con Sistema Universal...');
      const success = await processCompleteMath(this.contentEl);
      if (success) {
        this.mathDetection.processed = true;
        console.log('✅ Matemáticas reprocesadas exitosamente');
      }
      return success;
    }
    return false;
  }
  
  /**
   * Forzar reprocesamiento de Mermaid
   */
  async reprocessMermaid() {
    if (this.hasMermaidContent && window.mermaidManager && this.isComplete) {
      console.log('🔄 Reprocesando diagramas Mermaid...');
      await window.mermaidManager.processContainer(this.contentEl);
      this.mermaidProcessed = true;
    }
  }
  
  /**
   * ✨ NUEVO: Diagnóstico completo del contenido
   */
  diagnose() {
    return {
      isComplete: this.isComplete,
      contentLength: this.fullContent.length,
      chunksReceived: this.chunks.length,
      mathDetection: { ...this.mathDetection },
      hasMermaid: this.hasMermaidContent,
      mermaidProcessed: this.mermaidProcessed,
      hasRenderedMath: this.contentEl.querySelectorAll('.MathJax, mjx-container').length > 0,
      hasUnprocessedMath: this.contentEl.querySelectorAll('.has-math-content').length > 0
    };
  }
  
  getContent() {
    return this.fullContent;
  }
  
  isCompleted() {
    return this.isComplete;
  }
  
  cleanup() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    
    this.chunks = [];
    this.fullContent = '';
    this.mathDetection = {
      hasMath: false,
      confidence: 0,
      types: [],
      processed: false
    };
    this.hasMermaidContent = false;
    this.mermaidProcessed = false;
    
    console.log('🧹 MarkdownStreamHandler limpiado');
  }
}

/**
 * Función auxiliar para crear handler sin configuraciones complejas
 */
export function createMarkdownStreamHandler(messageElement, controller) {
  return new MarkdownStreamHandler(messageElement, controller);
}

/**
 * Función auxiliar para verificar si un mensaje tiene Mermaid
 */
export function checkMessageForMermaid(messageElement) {
  const content = messageElement.querySelector('.message-content')?.textContent || '';
  
  const mermaidPatterns = [
    /```mermaid/i,
    /graph\s+(TD|TB|BT|RL|LR)/i,
    /flowchart\s+(TD|TB|BT|RL|LR)/i,
    /sequenceDiagram/i,
    /classDiagram/i,
    /stateDiagram/i
  ];
  
  return mermaidPatterns.some(pattern => pattern.test(content));
}

/**
 * ✨ NUEVA: Función para verificar matemáticas en mensaje
 */
export function checkMessageForMath(messageElement) {
  const content = messageElement.querySelector('.message-content')?.innerHTML || '';
  return detectUniversalMath(content);
}

export default {
  MarkdownStreamHandler,
  createMarkdownStreamHandler,
  checkMessageForMermaid,
  checkMessageForMath
};

console.log('✅ MarkdownStreamHandler actualizado con Sistema Universal de MathJax');