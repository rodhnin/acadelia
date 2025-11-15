// universalMathProcessor.js - SISTEMA COMPLETAMENTE NUEVO Y ROBUSTO

/**
 * SISTEMA UNIVERSAL DE MATHJAX
 * Detecta y renderiza CUALQUIER formato de matemáticas que envíe la IA
 */

class UniversalMathProcessor {
  constructor() {
    this.isInitialized = false;
    this.processingQueue = [];
    this.config = {
      // Patrones de detección ultra-amplios
      patterns: {
        // Delimitadores estándar
        displayMath: [
          /\$\$[\s\S]*?\$\$/g,                    // $$...$$
          /\\\[[\s\S]*?\\\]/g,                    // \[...\]
          /\\\([\s\S]*?\\\)/g,                    // \(...\)
        ],
        
        // Delimitadores alternativos que puede usar la IA
        alternativeDelimiters: [
          /\[[\s\S]*?\]/g,                        // [...] (simple)
          /\(\([\s\S]*?\)\)/g,                    // ((...))
          /\$\([\s\S]*?\)\$/g,                    // $(...) 
          /math\{[\s\S]*?\}/g,                    // math{...}
          /latex\{[\s\S]*?\}/g,                   // latex{...}
          /equation\{[\s\S]*?\}/g,                // equation{...}
        ],
        
        // Contenido LaTeX sin delimitadores
        bareLatex: [
          /\\(?:text|frac|sqrt|sum|prod|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega)\b[\s\S]*?(?=\s|$|[.!?])/g,
          /\\(?:left|right)\s*[\(\)\[\]|\\|]+/g,
          /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g,
          /[a-zA-Z]\w*\^[\{\w]+/g,                // x^{2}, y^n
          /[a-zA-Z]\w*_[\{\w]+/g,                 // x_{n}, a_i
          /\\[a-zA-Z]+\s*\{[^}]*\}/g,            // \comando{...}
        ],
        
        // Símbolos matemáticos comunes
        mathSymbols: /[∑∏∫∆∇∞±≤≥≠≈√∂αβγδεζηθικλμνξπρστυφχψω]/g,
        
        // Expresiones con operadores matemáticos en contexto
        mathExpressions: /(?:^|\s)([a-zA-Z]\w*\s*[=≠<>≤≥±∓]\s*[^,.\s]+|[^,.\s]+\s*[=≠<>≤≥±∓]\s*[a-zA-Z]\w*)(?=\s|$|[,.!?])/g
      }
    };
    
    this.init();
  }
  
  async init() {
    console.log('🧮 Inicializando Sistema Universal de MathJax...');
    
    try {
      await this.waitForMathJax();
      
      this.configureMathJax();
      
      this.isInitialized = true;
      console.log('✅ Sistema Universal de MathJax inicializado');
      
      this.processQueue();
      
    } catch (error) {
      console.error('❌ Error inicializando MathJax Universal:', error);
    }
  }
  
  waitForMathJax() {
    return new Promise((resolve) => {
      if (typeof MathJax !== 'undefined') {
        if (MathJax.startup && MathJax.startup.promise) {
          MathJax.startup.promise.then(resolve);
        } else {
          resolve();
        }
      } else {
        console.log('⏳ MathJax no detectado, esperando...');
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (typeof MathJax !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          } else if (attempts > 50) { // 5 segundos máximo
            clearInterval(checkInterval);
            console.warn('⚠️ MathJax no disponible después de 5s');
            resolve();
          }
        }, 100);
      }
    });
  }
  
  configureMathJax() {
    if (typeof MathJax === 'undefined') return;
    
    try {
      // Configuración robusta y universal
      if (MathJax.config) {
        // Configuración TeX
        MathJax.config.tex = MathJax.config.tex || {};
        Object.assign(MathJax.config.tex, {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true,
          processEnvironments: true,
          processRefs: true,
          autoload: {
            color: [],
            colorV2: ['color']
          },
          packages: {
            '[+]': ['noerrors', 'noundefined', 'autoload', 'ams', 'newcommand']
          },
          macros: {
            'dx': '\\,dx',
            'dy': '\\,dy',
            'dt': '\\,dt',
            'percent': '\\%',
            'degree': '°',
            'R': '\\mathbb{R}',
            'N': '\\mathbb{N}',
            'Z': '\\mathbb{Z}',
            'Q': '\\mathbb{Q}',
            'C': '\\mathbb{C}'
          }
        });
        
        // Configuración de salida
        MathJax.config.chtml = MathJax.config.chtml || {};
        Object.assign(MathJax.config.chtml, {
          scale: 1,
          minScale: 0.5,
          matchFontHeight: false,
          displayAlign: 'left',
          displayIndent: '0'
        });
        
        // Configuración de opciones
        MathJax.config.options = MathJax.config.options || {};
        Object.assign(MathJax.config.options, {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
          ignoreHtmlClass: 'no-math',
          processHtmlClass: 'math-content|message-content'
        });
      }
      
      console.log('⚙️ MathJax configurado con parámetros universales');
      
    } catch (error) {
      console.error('❌ Error configurando MathJax:', error);
    }
  }
  
  /**
   * DETECTOR UNIVERSAL - Detecta CUALQUIER tipo de matemáticas
   */
  detectMathContent(content) {
    if (!content || typeof content !== 'string') {
      return { hasMath: false, confidence: 0, types: [] };
    }
    
    const detectedTypes = [];
    let totalMatches = 0;
    
    // 1. Detectar delimitadores estándar
    this.config.patterns.displayMath.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        detectedTypes.push(`standard-${index}`);
        totalMatches += matches.length;
      }
    });
    
    // 2. Detectar delimitadores alternativos
    this.config.patterns.alternativeDelimiters.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        const hasRealMath = matches.some(match => {
          return this.containsMathContent(match);
        });
        if (hasRealMath) {
          detectedTypes.push(`alternative-${index}`);
          totalMatches += matches.length;
        }
      }
    });
    
    // 3. Detectar LaTeX sin delimitadores
    this.config.patterns.bareLatex.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        detectedTypes.push(`latex-${index}`);
        totalMatches += matches.length;
      }
    });
    
    // 4. Detectar símbolos matemáticos
    const symbolMatches = content.match(this.config.patterns.mathSymbols);
    if (symbolMatches) {
      detectedTypes.push('symbols');
      totalMatches += symbolMatches.length;
    }
    
    // 5. Detectar expresiones matemáticas
    const exprMatches = content.match(this.config.patterns.mathExpressions);
    if (exprMatches) {
      detectedTypes.push('expressions');
      totalMatches += exprMatches.length;
    }
    
    const confidence = Math.min(totalMatches * 0.2, 1);
    
    return {
      hasMath: totalMatches > 0,
      confidence,
      types: detectedTypes,
      totalMatches
    };
  }
  
  /**
   * Verifica si un texto realmente contiene matemáticas
   */
  containsMathContent(text) {
    const mathIndicators = [
      /\\[a-zA-Z]+/,           // Comandos LaTeX
      /\^[\{\w]/,              // Exponentes
      /_[\{\w]/,               // Subíndices
      /[=≠<>≤≥±∓∑∏∫]/,        // Operadores matemáticos
      /\\(?:frac|sqrt|sum|prod|int|sin|cos|tan|log|ln)/,
      /[αβγδεζηθικλμνξπρστυφχψω]/, // Letras griegas
    ];
    
    return mathIndicators.some(pattern => pattern.test(text));
  }
  
  /**
   * NORMALIZADOR UNIVERSAL - Convierte cualquier formato a delimitadores estándar
   */
  normalizeMathContent(content) {
    if (!content || typeof content !== 'string') return content;
    
    console.log('🔄 Normalizando contenido matemático...');
    
    let normalized = content;
    
    // 1. Proteger contenido ya normalizado
    const protectedRanges = [];
    const standardPatterns = [/\$\$[\s\S]*?\$\$/g, /\\\[[\s\S]*?\\\]/g, /\$[^$\n]+\$/g, /\\\([\s\S]*?\\\)/g];
    
    standardPatterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        protectedRanges.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    });
    
    // 2. Función para verificar si una posición está protegida
    const isProtected = (start, end) => {
      return protectedRanges.some(range => 
        (start >= range.start && start < range.end) ||
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );
    };
    
    // 3. Convertir delimitadores alternativos
    const conversions = [
      // [expr] -> \[expr\] (pero solo si contiene matemáticas)
      {
        pattern: /\[([^\[\]]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^\[\]]*)\]/g,
        replacement: '\\[$1\\]'
      },
      
      // ((expr)) -> \[expr\]
      {
        pattern: /\(\(([^()]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^()]*)\)\)/g,
        replacement: '\\[$1\\]'
      },
      
      // $(expr)$ -> $$expr$$
      {
        pattern: /\$\(([^()]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^()]*)\)\$/g,
        replacement: '$$$$1$$'
      },
      
      // math{expr} -> $$expr$$
      {
        pattern: /math\{([^{}]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^{}]*)\}/g,
        replacement: '$$$$1$$'
      },
      
      // latex{expr} -> $$expr$$
      {
        pattern: /latex\{([^{}]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^{}]*)\}/g,
        replacement: '$$$$1$$'
      },
      
      // equation{expr} -> \[expr\]
      {
        pattern: /equation\{([^{}]*(?:\\[a-zA-Z]+|[=≠<>≤≥±∓∑∏∫∆∇αβγδεζηθικλμνξπρστυφχψω\^_])[^{}]*)\}/g,
        replacement: '\\[$1\\]'
      }
    ];
    
    conversions.forEach(({ pattern, replacement }) => {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(normalized)) !== null) {
        if (!isProtected(match.index, match.index + match[0].length)) {
          normalized = normalized.substring(0, match.index) + 
                      match[0].replace(pattern, replacement) + 
                      normalized.substring(match.index + match[0].length);
          // Reajustar la posición del pattern
          pattern.lastIndex = match.index + replacement.length;
        }
      }
    });
    
    // 4. Detectar y envolver LaTeX sin delimitadores
    const bareLatexPattern = /(?:^|\s)((?:\\(?:text|frac|sqrt|sum|prod|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|left|right|begin|end)\b[\s\S]*?)+)(?=\s|$|[.!?])/g;
    
    let match;
    bareLatexPattern.lastIndex = 0;
    while ((match = bareLatexPattern.exec(normalized)) !== null) {
      if (!isProtected(match.index, match.index + match[0].length)) {
        const latexContent = match[1].trim();
        const replacement = ` $$${latexContent}$$ `;
        normalized = normalized.substring(0, match.index) + 
                    replacement + 
                    normalized.substring(match.index + match[0].length);
        bareLatexPattern.lastIndex = match.index + replacement.length;
      }
    }
    
    // 5. Escapar % que no estén ya escapados
    normalized = normalized.replace(/(?<!\\)%/g, '\\%');
    
    // 6. Limpiar delimitadores duplicados
    normalized = normalized
      .replace(/\$\$\s*\$\$/g, '') // Eliminar $$ vacíos
      .replace(/\\\[\s*\\\]/g, '') // Eliminar \[ \] vacíos
      .replace(/\$\s*\$/g, '');    // Eliminar $ $ vacíos
    
    if (normalized !== content) {
      console.log('✅ Contenido matemático normalizado');
    }
    
    return normalized;
  }
  
  /**
   * PROCESADOR PRINCIPAL - Maneja tanto streaming como contenido completo
   */
  async processElement(element, options = {}) {
    const {
      isStreaming = false,
      forceProcess = false
    } = options;
    
    if (!element) return false;
    
    // Si no está inicializado, agregar a la cola
    if (!this.isInitialized) {
      this.processingQueue.push({ element, options });
      return false;
    }
    
    // Durante streaming, solo preparar el contenido
    if (isStreaming && !forceProcess) {
      return this.prepareStreamingContent(element);
    }
    
    try {
      console.log('🧮 Procesando elemento con MathJax Universal...');
      
      // 1. Detectar contenido matemático
      const detection = this.detectMathContent(element.innerHTML || element.textContent);
      
      if (!detection.hasMath) {
        console.log('📭 No se detectó contenido matemático');
        return false;
      }
      
      console.log(`🔍 Matemáticas detectadas: ${detection.types.join(', ')} (confianza: ${(detection.confidence * 100).toFixed(1)}%)`);
      
      // 2. Normalizar contenido
      let content = element.innerHTML;
      const normalizedContent = this.normalizeMathContent(content);
      
      if (normalizedContent !== content) {
        element.innerHTML = normalizedContent;
        console.log('🔄 Contenido normalizado para MathJax');
      }
      
      // 3. Renderizar con MathJax
      return await this.renderMathJax(element);
      
    } catch (error) {
      console.error('❌ Error procesando elemento:', error);
      return false;
    }
  }
  
  /**
   * Preparar contenido durante streaming
   */
  prepareStreamingContent(element) {
    if (!element) return false;
    
    // Solo detectar y marcar el elemento para procesamiento posterior
    const detection = this.detectMathContent(element.innerHTML || element.textContent);
    
    if (detection.hasMath) {
      element.classList.add('has-math-content');
      element.setAttribute('data-math-confidence', detection.confidence);
      element.setAttribute('data-math-types', detection.types.join(','));
      console.log('🏷️ Elemento marcado con contenido matemático para procesamiento posterior');
      return true;
    }
    
    return false;
  }
  
  /**
   * RENDERIZADOR ROBUSTO de MathJax
   */
  async renderMathJax(element) {
    if (typeof MathJax === 'undefined') {
      console.warn('⚠️ MathJax no disponible para renderizado');
      return false;
    }
    
    try {
      if (MathJax.typesetPromise) {
        await MathJax.typesetPromise([element]);
        console.log('✅ MathJax renderizado exitosamente (API moderna)');
        
        element.classList.remove('has-math-content');
        element.removeAttribute('data-math-confidence');
        element.removeAttribute('data-math-types');
        
        // Hacer responsive
        this.makeMathResponsive(element);
        
        return true;
        
      } else if (MathJax.Hub && MathJax.Hub.Queue) {
        return new Promise((resolve) => {
          MathJax.Hub.Queue(
            ["Typeset", MathJax.Hub, element],
            () => {
              console.log('✅ MathJax renderizado exitosamente (API legacy)');
              element.classList.remove('has-math-content');
              element.removeAttribute('data-math-confidence');
              element.removeAttribute('data-math-types');
              this.makeMathResponsive(element);
              resolve(true);
            }
          );
        });
        
      } else {
        console.warn('⚠️ No se encontró API de renderizado de MathJax');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error renderizando MathJax:', error);
      
      return this.emergencyRender(element);
    }
  }
  
  /**
   * Renderizado de emergencia
   */
  async emergencyRender(element) {
    try {
      console.log('🚨 Intentando renderizado de emergencia...');
      
      if (typeof MathJax !== 'undefined' && MathJax.startup) {
        await MathJax.startup.promise;
        
        if (MathJax.typesetPromise) {
          await MathJax.typesetPromise([element]);
          console.log('✅ Renderizado de emergencia exitoso');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Fallo en renderizado de emergencia:', error);
      return false;
    }
  }
  
  /**
   * Hacer matemáticas responsive
   */
  makeMathResponsive(element) {
    const mathElements = element.querySelectorAll('.MathJax, mjx-container, .MathJax_Display');
    
    mathElements.forEach(mathEl => {
      const parent = mathEl.closest('.message-content') || element;
      const parentWidth = parent.clientWidth;
      const mathWidth = mathEl.scrollWidth || mathEl.offsetWidth;
      
      if (mathWidth > parentWidth * 0.95) {
        mathEl.style.maxWidth = '100%';
        mathEl.style.overflowX = 'auto';
        mathEl.style.overflowY = 'hidden';
        
        if (mathEl.classList.contains('MathJax_Display') || 
            mathEl.getAttribute('display') === 'true') {
          mathEl.style.textAlign = 'left';
        }
        
        mathEl.classList.add('math-responsive');
      }
    });
  }
  
  /**
   * Procesar elementos en cola
   */
  processQueue() {
    if (this.processingQueue.length === 0) return;
    
    console.log(`📝 Procesando ${this.processingQueue.length} elementos en cola...`);
    
    const queue = [...this.processingQueue];
    this.processingQueue = [];
    
    queue.forEach(async ({ element, options }) => {
      try {
        await this.processElement(element, { ...options, forceProcess: true });
      } catch (error) {
        console.error('❌ Error procesando elemento de la cola:', error);
      }
    });
  }
  
  /**
   * PROCESAR CONTENIDO COMPLETO - Para cuando el streaming termina
   */
  async processCompleteContent(element) {
    if (!element) return false;
    
    const markedElements = element.querySelectorAll('.has-math-content');
    
    if (markedElements.length > 0) {
      console.log(`🎯 Procesando ${markedElements.length} elementos marcados con matemáticas...`);
      
      for (const markedEl of markedElements) {
        await this.processElement(markedEl, { isStreaming: false, forceProcess: true });
      }
    }
    
    return await this.processElement(element, { isStreaming: false, forceProcess: true });
  }
  
  /**
   * REPROCESSAR TODO - Para elementos que pueden haber fallado
   */
  async reprocessAll(container = document) {
    console.log('🔄 Reprocesando todo el contenido matemático...');
    
    const messageContents = container.querySelectorAll('.message-content, .math-content');
    
    for (const element of messageContents) {
      try {
        await this.processElement(element, { isStreaming: false, forceProcess: true });
      } catch (error) {
        console.error('❌ Error reprocesando elemento:', error);
      }
    }
    
    return messageContents.length;
  }
  
  /**
   * DIAGNÓSTICO - Para debug
   */
  diagnose(element) {
    if (!element) element = document.body;
    
    const diagnosis = {
      mathJaxAvailable: typeof MathJax !== 'undefined',
      mathJaxVersion: typeof MathJax !== 'undefined' ? (MathJax.version || 'unknown') : null,
      systemInitialized: this.isInitialized,
      queueLength: this.processingQueue.length,
      elementsWithMath: element.querySelectorAll('.has-math-content').length,
      renderedMath: element.querySelectorAll('.MathJax, mjx-container').length,
      unresolvedMath: element.querySelectorAll('.has-math-content').length
    };
    
    console.table(diagnosis);
    return diagnosis;
  }
}

const universalMathProcessor = new UniversalMathProcessor();

// Funciones de conveniencia para integrar con el sistema existente
export function processUniversalMath(element, isStreaming = false) {
  return universalMathProcessor.processElement(element, { isStreaming });
}

export function processCompleteMath(element) {
  return universalMathProcessor.processCompleteContent(element);
}

export function reprocessAllMath(container) {
  return universalMathProcessor.reprocessAll(container);
}

export function diagnoseMath(element) {
  return universalMathProcessor.diagnose(element);
}

export function isUniversalMathReady() {
  return universalMathProcessor.isInitialized;
}

// Funciones para integración con markdown
export function preprocessUniversalMath(content) {
  return universalMathProcessor.normalizeMathContent(content);
}

export function detectUniversalMath(content) {
  return universalMathProcessor.detectMathContent(content);
}

// Exponer globalmente
window.universalMathProcessor = universalMathProcessor;
window.processUniversalMath = processUniversalMath;
window.processCompleteMath = processCompleteMath;
window.reprocessAllMath = reprocessAllMath;
window.diagnoseMath = diagnoseMath;

console.log('🚀 Sistema Universal de MathJax cargado');