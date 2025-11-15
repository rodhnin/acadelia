/**
 * latex-utils.js - Utilidades centralizadas para la manipulación de expresiones LaTeX
 * OPTIMIZADO: Mejor rendimiento, gestión de memoria y seguridad
 */

import { DOM_SELECTORS, LATEX_PATTERNS } from '../core/config-agente.js';
import { eventBus } from '../core/event-bus-agente.js';
import {
  hasClass
} from '../../../shared/dom-helpers.js';

// Configuración
const CONFIG = {
  CACHE_LIMIT: 100,
  DEBOUNCE_TIME: 100,
  RETRY_ATTEMPTS: 3
};

// Expresiones regulares precompiladas
const REGEX = {
  FRAC: /\\frac{([^{}]+)}{([^{}]+)}/g,
  COMPLEX_FRAC: /\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
  MATRIX_BEGIN: /\\begin\{(p?matrix)\}/g,
  MATRIX_END: /\\end\{(p?matrix)\}/g,
  CASES_BEGIN: /\\begin\{cases\}/g,
  CASES_END: /\\end\{cases\}/g,
  MATRIX_CONVERT_BEGIN: /\\begin\{matrix\}/g,
  MATRIX_CONVERT_END: /\\end\{matrix\}/g,
  OPERATORS: /([=><+\-*/])/g,
  PLACEHOLDERS: /\$\d+/g,
  DOLLARS: /\$\$/g,
  SINGLE_DOLLAR: /\$/g,
  BRACKET_OPEN: /\\\[/g,
  BRACKET_CLOSE: /\\\]/g,
  PAREN_OPEN: /\\\(/g,
  PAREN_CLOSE: /\\\)/g,
  BRACE_OPEN: /\{/g,
  BRACE_CLOSE: /\}/g,
  INTS: {
    DOUBLE: /\\int\\int/g,
    TRIPLE: /\\int\\int\\int/g
  },
  TRIG: {
    COS: /\\cos\s*(\(|\{)/g,
    SIN: /\\sin\s*(\(|\{)/g,
    TAN: /\\tan\s*(\(|\{)/g,
    COT: /\\cot\s*(\(|\{)/g,
    SEC: /\\sec\s*(\(|\{)/g,
    CSC: /\\csc\s*(\(|\{)/g,
    ARCCOS: /\\arccos\s*(\(|\{)/g,
    ARCSIN: /\\arcsin\s*(\(|\{)/g,
    ARCTAN: /\\arctan\s*(\(|\{)/g,
    ARCTG: /\\arctg\s*(\(|\{)/g,
    SEN: /\\sen\s*(\(|\{)/g,
    TG: /\\tg\s*(\(|\{)/g
  }
};

const processedFormulaCache = new Map();

// Referencia al editor matemático
let mathEditor = null;

// Control para prevenir registros múltiples
let isInsertLatexRegistered = false;

/**
 * Mantiene la caché dentro del límite de tamaño
 */
function trimCache() {
  if (processedFormulaCache.size > CONFIG.CACHE_LIMIT) {
    const keysToDelete = Array.from(processedFormulaCache.keys())
      .slice(0, Math.max(1, processedFormulaCache.size - CONFIG.CACHE_LIMIT / 2));
    keysToDelete.forEach(key => processedFormulaCache.delete(key));
  }
}

/**
 * Limpia la caché de fórmulas
 * @param {string|null} key - Clave específica o null para limpiar toda la caché
 */
export function clearFormulaCache(key = null) {
  if (key === null) {
    processedFormulaCache.clear();
  } else if (processedFormulaCache.has(key)) {
    processedFormulaCache.delete(key);
  }
}

/**
 * Establece la referencia al editor interactivo
 * @param {Object} editor - Referencia al editor interactivo
 */
export function setMathEditor(editor) {
  mathEditor = editor;
}

/**
 * Inserta una expresión LaTeX en la posición actual del cursor
 * @param {string} latex - Expresión LaTeX a insertar
 */
export function insertLatex(latex) {
  
  // Si el editor interactivo está visible, utilizar su función de inserción
  if (mathEditor && mathEditor.isVisible) {
    mathEditor.insertLatexSymbol(latex);
    return;
  }

  // Inserción estándar en el textarea
  insertLatexToTextarea(latex);
}

/**
 * Función auxiliar para insertar LaTeX en el textarea
 * @param {string} latex - Expresión LaTeX a insertar
 * @param {string} textareaSelector - Selector CSS para el textarea (opcional)
 */
function insertLatexToTextarea(latex, textareaSelector) {
  const textarea = document.querySelector(textareaSelector || DOM_SELECTORS.textarea);
  if (!textarea) return;
  
  try {
    const processedLatex = improveLatexFormatting(preprocessComplexFormula(latex));
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Proceso especial si hay texto seleccionado
    let finalLatex = processedLatex;
    if (start !== end) {
      const selectedText = textarea.value.substring(start, end);
      finalLatex = processedLatex.replace('$1', selectedText);
      finalLatex = finalLatex.replace(REGEX.PLACEHOLDERS, '');
    }
    
    // Asegurar delimitadores
    finalLatex = ensureLatexDelimiters(finalLatex);
    
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + finalLatex + after;
    
    if (start === end) {
      const cursorOffset = finalLatex.indexOf('$1');
      const finalPos = cursorOffset >= 0 ? start + cursorOffset : start + finalLatex.length;
      textarea.selectionStart = finalPos;
      textarea.selectionEnd = finalPos;
      
      textarea.value = textarea.value.replace(REGEX.PLACEHOLDERS, '');
    } else {
      // Si había texto seleccionado, colocar el cursor al final
      const finalPos = start + finalLatex.length;
      textarea.selectionStart = finalPos;
      textarea.selectionEnd = finalPos;
    }
    
    // Enfocar el textarea
    textarea.focus();
    
    textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    eventBus.emit('latexInserted', { source: 'textarea' });
  } catch (error) {
    // Error logging para producción (puede ser silenciado o usar sistema centralizado)
  }
}

/**
 * Asegura que una expresión LaTeX tenga delimitadores apropiados
 * @param {string} latex - Expresión LaTeX a procesar
 * @returns {string} - Expresión con delimitadores correctos
 */
function ensureLatexDelimiters(latex) {
  if (!latex) return '';
  
  // Si ya tiene delimitadores, verificar si están completos
  if (latex.startsWith('$') || latex.startsWith('\\(') || 
      latex.startsWith('$$') || latex.startsWith('\\[')) {
    
    // Asegurar que los delimitadores estén completos
    if (latex.startsWith('$') && !latex.endsWith('$')) {
      return latex + '$';
    } else if (latex.startsWith('\\(') && !latex.endsWith('\\)')) {
      return latex + '\\)';
    } else if (latex.startsWith('$$') && !latex.endsWith('$$')) {
      return latex + '$$';
    } else if (latex.startsWith('\\[') && !latex.endsWith('\\]')) {
      return latex + '\\]';
    }
    
    return latex;
  }
  
  // Si no tiene delimitadores, añadir $
  return '$' + latex + '$';
}

/**
 * Mejora el formato de expresiones LaTeX
 * @param {string} latex - Expresión LaTeX a mejorar
 * @returns {string} - Expresión LaTeX mejorada
 */
export function improveLatexFormatting(latex) {
  if (!latex) return '';
  
  const cacheKey = latex.trim();
  if (processedFormulaCache.has(cacheKey)) {
    return processedFormulaCache.get(cacheKey);
  }

  const improved = latex
    .replace(REGEX.FRAC, (_, num, den) => {
      return num.length > 10 || den.length > 10 ? 
        `\\dfrac{${num}}{${den}}` : 
        `\\frac{${num}}{${den}}`;
    })
    .replace(REGEX.MATRIX_BEGIN, '\\begin{$1}\n')
    .replace(REGEX.MATRIX_END, '\n\\end{$1}')
    .replace(/&/g, ' & ')
    .replace(REGEX.OPERATORS, ' $1 ')
    .replace(REGEX.INTS.DOUBLE, '\\iint')
    .replace(REGEX.INTS.TRIPLE, '\\iiint')
    .trim();

  processedFormulaCache.set(cacheKey, improved);
  trimCache();
  
  return improved;
}

/**
 * Detecta y procesa fórmulas complejas
 * @param {string} formula - Fórmula a procesar
 * @returns {string} - Fórmula procesada
 */
export function preprocessComplexFormula(formula) {
  if (!formula) return '';
  
  return formula
    .replace(REGEX.COMPLEX_FRAC, (_, num, den) => {
      const processedNum = preprocessComplexFormula(num);
      const processedDen = preprocessComplexFormula(den);
      return `\\dfrac{${processedNum}}{${processedDen}}`;
    })
    .replace(REGEX.CASES_BEGIN, '\\begin{cases}\n')
    .replace(REGEX.CASES_END, '\n\\end{cases}')
    .replace(REGEX.MATRIX_CONVERT_BEGIN, '\\begin{pmatrix}')
    .replace(REGEX.MATRIX_CONVERT_END, '\\end{pmatrix}');
}

/**
 * Verifica si un texto contiene LaTeX sin delimitadores
 * @param {string} text - Texto a verificar
 * @returns {boolean} - true si contiene LaTeX sin delimitadores
 */
export function containsUnwrappedLatex(text) {
  if (!text) return false;
  
  const { delimiters } = LATEX_PATTERNS;
  if (delimiters.test(text)) return false;
  
  return LATEX_PATTERNS.commands.test(text);
}

/**
 * Envuelve el texto con delimitadores LaTeX apropiados
 * @param {string} text - Texto a envolver
 * @param {boolean} forceInline - Si debe forzar el uso de delimitadores inline
 * @returns {string} - Texto envuelto con delimitadores
 */
export function wrapWithDelimiters(text, forceInline = true) {
  if (!text || !containsUnwrappedLatex(text)) return text;
  
  if (forceInline) return `$${text}$`;
  
  const needsDisplayMode = text.includes('\\begin{') || 
                          text.includes('\\end{') || 
                          text.includes('\\frac') ||
                          text.includes('\\sum') || 
                          text.includes('\\int') ||
                          text.includes('\n');
  
  return needsDisplayMode ? `$$${text}$$` : `$${text}$`;
}

/**
 * Formatea una expresión LaTeX para garantizar un formato correcto
 * @param {string} latex - Expresión LaTeX a formatear
 * @returns {string} - Expresión formateada
 */
export function formatLatexExpression(latex) {
  if (!latex) return '';
  
  return ensureLatexDelimiters(latex.trim());
}

/**
 * Valida una expresión LaTeX
 * @param {string} latex - Expresión LaTeX a validar
 * @returns {boolean} - true si la expresión es válida
 */
export function validateLatex(latex) {
  if (!latex) return false;
  
  const dollarPairs = (latex.match(REGEX.DOLLARS) || []).length;
  if (dollarPairs % 2 !== 0) return false;
  
  const singleDollar = (latex.match(REGEX.SINGLE_DOLLAR) || []).length - dollarPairs * 2;
  if (singleDollar % 2 !== 0) return false;
  
  const bracketOpen = (latex.match(REGEX.BRACKET_OPEN) || []).length;
  const bracketClose = (latex.match(REGEX.BRACKET_CLOSE) || []).length;
  if (bracketOpen !== bracketClose) return false;
  
  const parenOpen = (latex.match(REGEX.PAREN_OPEN) || []).length;
  const parenClose = (latex.match(REGEX.PAREN_CLOSE) || []).length;
  if (parenOpen !== parenClose) return false;
  
  const braceOpen = (latex.match(REGEX.BRACE_OPEN) || []).length;
  const braceClose = (latex.match(REGEX.BRACE_CLOSE) || []).length;
  if (braceOpen !== braceClose) return false;
  
  return true;
}

/**
 * Procesa funciones trigonométricas para mejorar su renderizado
 * @param {string} text - Texto a procesar
 * @returns {string} Texto procesado
 */
export function processTrigFunctions(text) {
  if (!text) return '';
  
  return text
    .replace(REGEX.TRIG.COS, '\\cos $1')
    .replace(REGEX.TRIG.SIN, '\\sin $1') 
    .replace(REGEX.TRIG.TAN, '\\tan $1')
    .replace(REGEX.TRIG.COT, '\\cot $1')
    .replace(REGEX.TRIG.SEC, '\\sec $1')
    .replace(REGEX.TRIG.CSC, '\\csc $1')
    // Funciones inversas
    .replace(REGEX.TRIG.ARCCOS, '\\arccos $1')
    .replace(REGEX.TRIG.ARCSIN, '\\arcsin $1')
    .replace(REGEX.TRIG.ARCTAN, '\\arctan $1')
    .replace(REGEX.TRIG.ARCTG, '\\arctan $1')
    // Alias en español
    .replace(REGEX.TRIG.SEN, '\\sin $1')
    .replace(REGEX.TRIG.TG, '\\tan $1');
}

/**
 * Registra la función insertLatex globalmente con prevención de doble inserción
 */
export function registerGlobalInsertLatex() {
  // Evitar registros múltiples
  if (isInsertLatexRegistered) {
    return;
  }
  
  // Si ya existe una función insertLatex, guardarla como referencia
  const originalInsertLatex = window.insertLatex;
  
  let lastLatexInsertTime = 0;
  
  // Redefinir la función insertLatex para manejar todos los casos
  window.insertLatex = function(latex) {
    // Prevención de llamadas duplicadas mediante debounce
    const now = Date.now();
    if (now - lastLatexInsertTime < CONFIG.DEBOUNCE_TIME) {
      return;
    }
    lastLatexInsertTime = now;
    
    
    // Detección de contexto mejorada
    const mathEditorContainer = document.querySelector(DOM_SELECTORS.mathEditorContainer);
    const isEditorVisible = mathEditorContainer && 
                           hasClass(mathEditorContainer, 'show');
    
    const mathPanel = document.querySelector(DOM_SELECTORS.mathPanel);
    const isPanelVisible = mathPanel && 
                          hasClass(mathPanel, 'show');
    
    if (isEditorVisible && mathEditor) {
      mathEditor.insertLatexSymbol(latex);
    } else if (isPanelVisible) {
      insertLatexToTextarea(latex);
    } else {
      try {
        insertLatexToTextarea(latex);
      } catch (error) {
        
        if (typeof originalInsertLatex === 'function') {
          originalInsertLatex(latex);
        }
      }
    }
  };
  
  isInsertLatexRegistered = true;
  
  eventBus.emit('latexUtilsReady');
}

/**
 * Desregistra la función insertLatex global
 */
export function unregisterGlobalInsertLatex() {
  if (!isInsertLatexRegistered) return;
  
  if (window.insertLatex) {
    delete window.insertLatex;
  }
  
  isInsertLatexRegistered = false;
}

export default {
  setMathEditor,
  insertLatex,
  improveLatexFormatting,
  preprocessComplexFormula,
  containsUnwrappedLatex,
  wrapWithDelimiters,
  formatLatexExpression,
  validateLatex,
  processTrigFunctions,
  registerGlobalInsertLatex,
  unregisterGlobalInsertLatex,
  clearFormulaCache
};