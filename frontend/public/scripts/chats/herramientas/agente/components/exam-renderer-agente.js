/**
 * exam-renderer.js - Renderiza exámenes interactivos con soporte para contenido matemático
 */

import { 
  createElement, 
  clearElement, 
  addEvent, 
  removeAllEvents,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../../shared/dom-helpers.js';

// Constantes para la gestión de timeouts
const TIMEOUT_KEYS = {
  EXPLANATION: 'exam-explanation',
  SAFETY: 'exam-safety-check',
  INTERACTION: 'exam-interaction-clear',
  NAVIGATION: 'exam-navigation-clear'
};

/**
 * Renderiza un examen interactivo en el contenedor especificado
 * @param {Object} examData - Datos del examen a renderizar
 * @param {HTMLElement} container - Contenedor donde renderizar el examen
 */
export function renderExam(examData, container) {
  if (!container) return;
  
  // Limpiar timeouts previos si los hubiera
  clearExamTimeouts();
  
  // Limpiar eventos previos si los hubiera (en caso de rerenderizado)
  removeAllEvents(container);
  
  // Asegurar que el contenedor tenga la clase correcta
  container.className = 'exam-container';
  // Marcar el contenedor como interactivo para el ScrollManager
  container.setAttribute('data-exam-interactive', 'true');
  clearElement(container);
  
  // Verificar que los datos del examen sean válidos
  if (!isValidExamData(examData)) {
    appendErrorMessage(container);
    return;
  }
  
  // Inicializar MathJax de forma temprana
  const mathJaxPromise = initializeMathJax();
  
  // Estado del examen
  const examState = {
    currentQuestion: 0,
    correctAnswers: 0,
    questions: examData.questions
  };
  
  // Crear estructura del examen
  const exam = buildExamStructure(examData, examState);
  container.appendChild(exam);
  
  // Marcar el contenedor principal para asegurar que se procese
  container.setAttribute('data-has-math', 'true');
  
  // Iniciar el examen
  updateProgress(exam, examState);
  showQuestion(container, exam, examState, mathJaxPromise);
  
  // Asegurar limpieza cuando el contenedor se elimine
  return () => {
    clearExamTimeouts();
    removeAllEvents(container);
  };
}

/**
 * Verifica si los datos del examen son válidos
 * @param {Object} examData - Datos del examen
 * @returns {boolean} True si los datos son válidos
 */
function isValidExamData(examData) {
  return examData && 
         examData.questions && 
         Array.isArray(examData.questions) && 
         examData.questions.length > 0;
}

/**
 * Añade un mensaje de error al contenedor
 * @param {HTMLElement} container - Contenedor donde mostrar el error
 */
function appendErrorMessage(container) {
  const errorMsg = createElement('div', { className: 'exam-error' });
  errorMsg.innerHTML = `
    <i class='bx bx-error'></i>
    Error: Formato de examen inválido recibido
  `;
  container.appendChild(errorMsg);
}

/**
 * Construye la estructura básica del examen
 * @param {Object} examData - Datos del examen
 * @param {Object} examState - Estado del examen
 * @returns {HTMLElement} Elemento del examen
 */
function buildExamStructure(examData, examState) {
  const exam = createElement('div', { className: 'exam' });
  
  // Crear header del examen usando createElementWithHTML para contenido estático seguro
  const examHeader = createElement('div', { className: 'exam-header' });
  
  const title = createElement('h3', { className: 'exam-title' }, `Examen: ${examData.topic}`);
  const progress = createElement('div', { className: 'exam-progress' });
  
  examHeader.appendChild(title);
  examHeader.appendChild(progress);
  exam.appendChild(examHeader);
  
  // Crear contenedor de preguntas
  const questionContainer = createElement('div', { className: 'question-container' });
  exam.appendChild(questionContainer);
  
  return exam;
}

/**
 * Actualiza el indicador de progreso
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function updateProgress(exam, examState) {
  const progress = exam.querySelector('.exam-progress');
  if (progress) {
    progress.textContent = `Pregunta ${examState.currentQuestion + 1} de ${examState.questions.length}`;
  }
}

/**
 * Muestra la pregunta actual con optimizaciones para MathJax
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 * @param {Promise} mathJaxPromise - Promesa de inicialización de MathJax
 */
async function showQuestion(container, exam, examState, mathJaxPromise) {
  const questionContainer = exam.querySelector('.question-container');
  if (!questionContainer) return;
  
  const question = examState.questions[examState.currentQuestion];
  
  // Limpiar
  clearElement(questionContainer);
  removeAllEvents(questionContainer);
  
  // Crear pregunta SIMPLE
  const questionElement = createElement('div', { className: 'question' });
  
  const questionTextElement = createElement('h4', { className: 'question-text' });
  questionTextElement.innerHTML = question.question; // Usar innerHTML directamente
  questionElement.appendChild(questionTextElement);
  
  // Crear opciones SIMPLES
  const optionsContainer = createElement('div', { className: 'options' });
  
  question.options.forEach((option, i) => {
    const letter = String.fromCharCode(97 + i);
    const cleanOption = option.replace(new RegExp(`^${letter}\\)\\s*`, 'i'), '');
    
    const button = createElement('button', { 
      className: 'option',
      dataset: { index: i, examOption: 'true' }
    });
    
    button.innerHTML = `<span class="option-letter">${letter.toUpperCase()})</span><span class="option-text">${cleanOption}</span>`;
    
    addEvent(button, 'click', (e) => handleAnswer(e, container, exam, examState, mathJaxPromise));
    optionsContainer.appendChild(button);
  });
  
  questionElement.appendChild(optionsContainer);
  questionContainer.appendChild(questionElement);
  
  // Renderizar MathJax DESPUÉS, sin bloquear
  setTimeout(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([questionElement]).catch(() => {});
    }
  }, 100);
}

/**
 * Maneja la respuesta del usuario
 * @param {Event} e - Evento del clic
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 * @param {Promise} mathJaxPromise - Promesa de inicialización de MathJax
 */
async function handleAnswer(e, container, exam, examState, mathJaxPromise) {
  const questionContainer = exam.querySelector('.question-container');
  const selected = e.target.closest('.option');
  if (!selected || !questionContainer) return;
  
  const correctIndex = examState.questions[examState.currentQuestion].correctAnswer.charCodeAt(0) - 97;
  
  // Deshabilitar opciones
  questionContainer.querySelectorAll('.option').forEach(opt => opt.disabled = true);
  
  // Aplicar estilos
  if (parseInt(selected.dataset.index) === correctIndex) {
    examState.correctAnswers++;
    selected.classList.add('correct');
    acadelInfo("¡Correcto! 🎯", "¡Excelente!");
  } else {
    selected.classList.add('incorrect');
    const correctOption = questionContainer.querySelector(`[data-index="${correctIndex}"]`);
    if (correctOption) correctOption.classList.add('correct');
    acadelInfo("¡Inténtalo! 💭", "Aprendemos de los errores");
  }
  
  // Mostrar explicación SIN timeouts complejos
  setTimeout(() => {
    const explanation = createElement('div', { className: 'explanation' });
    explanation.innerHTML = `<p><strong>Explicación:</strong> ${examState.questions[examState.currentQuestion].explanation}</p>`;
    
    const nextButton = createElement('button', { className: 'next-question' }, 
      examState.currentQuestion < examState.questions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados');
    
    addEvent(nextButton, 'click', () => {
      if (examState.currentQuestion < examState.questions.length - 1) {
        examState.currentQuestion++;
        updateProgress(exam, examState);
        showQuestion(container, exam, examState, mathJaxPromise);
      } else {
        showResults(container, exam, examState);
      }
    });
    
    explanation.appendChild(nextButton);
    questionContainer.appendChild(explanation);
    
    // MathJax en explicación
    setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([explanation]).catch(() => {});
      }
    }, 50);
    
  }, 1500);
}

/**
 * Muestra los resultados finales del examen
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function showResults(container, exam, examState) {
  // Marcar que ya no hay interacciones activas
  container.removeAttribute('data-exam-interaction-active');
  container.removeAttribute('data-exam-navigation');
  
  // Limpiar el contenido actual y eventos
  clearElement(exam);
  removeAllEvents(exam);
  
  const percentage = (examState.correctAnswers / examState.questions.length) * 100;

  // 🎯 NOTIFICACIONES DEL PROFESOR ACADEL BASADAS EN RENDIMIENTO (CONTEXTO ACADÉMICO GENERAL)
  if (percentage >= 95) {
    // EXCELENCIA ABSOLUTA - CONFETTI
    acadelConfetti(
      "🏆 ¡EXCELENCIA ACADÉMICA ABSOLUTA! 🏆", 
      "¡Acadel está en shock! Ese nivel de conocimiento es digno de un verdadero erudito. ¡Los grandes pensadores estarían celosos!"
    );
  } else if (percentage >= 90) {
    // EXCELENTE - CONFETTI
    acadelConfetti(
      "🎉 ¡EXCELENTE DESEMPEÑO ACADÉMICO! 🎉", 
      "¡Acadel está súper orgulloso! Dominas el tema como todo un académico profesional"
    );
  } else if (percentage >= 80) {
    // MUY BUENO - ÉXITO
    acadelExito(
      "🌟 ¡Muy buen resultado académico! 🌟", 
      "Acadel ve que tienes talento intelectual natural. Con un poco más de estudio serás imparable"
    );
  } else if (percentage >= 70) {
    // BUENO - ÉXITO
    acadelExito(
      "👍 ¡Buen trabajo intelectual! 👍", 
      "Acadel nota que entiendes los conceptos fundamentales. Sigue así y mejorarás aún más"
    );
  } else if (percentage >= 60) {
    // REGULAR - INFO MOTIVACIONAL
    acadelInfo(
      "📚 ¡Vas por buen camino académico! 📚", 
      "Acadel cree en tu potencial. Estos temas requieren dedicación, pero ya tienes la base. ¡No te rindas!"
    );
  } else if (percentage >= 40) {
    // NECESITA MEJORAR - WARNING MOTIVACIONAL
    acadelWarning(
      "💪 ¡A estudiar más! 💪", 
      "Acadel sugiere repasar los conceptos fundamentales. Todos los grandes intelectuales empezaron así. ¡Tú puedes!"
    );
  } else {
    // NECESITA MUCHO TRABAJO - INFO ALENTADOR
    acadelInfo(
      "🦫 Acadel está aquí para guiarte", 
      "No te desanimes. Hasta los grandes filósofos tuvieron que empezar desde cero. Repasemos juntos paso a paso"
    );
  }
  
  // Crear componentes de resultados
  const resultsContainer = createElement('div', { className: 'exam-completed' });
  
  const title = createElement('h4', {}, '¡Examen completado! 🎉');
  
  const scoreText = createElement('p', { className: 'score' }, 'Respuestas correctas: ');
  const correctSpan = createElement('span', { className: 'correct' }, `${examState.correctAnswers}`);
  const separatorSpan = createElement('span', {}, ' / ');
  const totalSpan = createElement('span', { className: 'total' }, `${examState.questions.length}`);
  
  scoreText.appendChild(correctSpan);
  scoreText.appendChild(separatorSpan);
  scoreText.appendChild(totalSpan);
  
  // Determinar mensaje según porcentaje
  let resultClass, resultMessage;
  if (percentage >= 90) {
    resultClass = 'result-excellent';
    resultMessage = '¡Excelente trabajo! Dominas el tema 👏';
  } else if (percentage >= 70) {
    resultClass = 'result-good';
    resultMessage = 'Buen resultado, pero puedes mejorar 💪';
  } else {
    resultClass = 'result-improve';
    resultMessage = 'Sigue estudiando para mejorar tu puntuación 📚';
  }
  
  const resultText = createElement('p', { className: `result-message ${resultClass}` }, resultMessage);
  
  // Añadir componentes al contenedor
  resultsContainer.appendChild(title);
  resultsContainer.appendChild(scoreText);
  resultsContainer.appendChild(resultText);
  
  exam.appendChild(resultsContainer);
  
  // Desbloquear el scroll después de mostrar resultados
  if (window.scrollManager) {
    window.scrollManager.unlockScrollWithReason('exam-completed');
  }
  
  // Limpiar todos los timeouts asociados al examen
  clearExamTimeouts();
}

/**
 * Inicializa MathJax de forma más confiable
 * @returns {Promise} Promesa que se resuelve cuando MathJax está listo
 */
function initializeMathJax() {
  // Importante: Resetear la promesa de inicialización previa al cambiar de chat
  window._mathJaxInitPromise = null;
  
  return new Promise(async (resolve, reject) => {
    try {
      // Importar el módulo de mathjax-config
      const mathModule = await import('../math/mathjax-config-agente.js');
      if (!mathModule || typeof mathModule.renderMath !== 'function') {
        console.warn('Módulo MathJax no disponible');
        resolve(null); // Resolver en lugar de rechazar para evitar bloqueo
        return;
      }
      
      // Crear una nueva promesa de inicialización
      window._mathJaxInitPromise = new Promise(async (resolveInit) => {
        try {
          // Si MathJax ya está disponible
          if (window.MathJax && window.MathJax.typesetPromise) {
            resolveInit(window.MathJax);
            return;
          }
          
          // Si no, inicializar
          if (mathModule.initMathJax) {
            await mathModule.initMathJax();
            resolveInit(window.MathJax);
          } else {
            console.warn('Función initMathJax no disponible');
            resolveInit(null);
          }
        } catch (err) {
          console.error('Error en inicialización de MathJax:', err);
          resolveInit(null);
        }
      });
      
      await window._mathJaxInitPromise;
      resolve(mathModule);
    } catch (err) {
      console.error('Error en wrapper de inicialización MathJax:', err);
      resolve(null); // Resolver con null en lugar de rechazar
    }
  });
}

/**
 * Renderiza el contenido matemático en un elemento con priorización
 * @param {HTMLElement} element - Elemento a renderizar
 * @returns {Promise} Promesa que se resuelve cuando se completa el renderizado
 */
async function renderMathContent(element) {
  if (!element || !element.isConnected) return;
  
  try {
    const mathModule = await import('../math/mathjax-config-agente.js');
    if (mathModule?.renderMath) {
      await mathModule.renderMath(element, { 
        useCache: false, // Deshabilitar caché para exámenes
        maxRetries: 1 
      });
    }
  } catch (err) {
    console.warn('MathJax no disponible para examen:', err);
  }
}

/**
 * Prepara el contenido LaTeX para renderizarlo correctamente
 * @param {string} text - Texto a preparar
 * @returns {string} Texto preparado para renderizado LaTeX
 */
function prepareLatexContent(text) {
  if (!text) return '';
  
  // Asegurar que los símbolos $ no estén escapados
  text = text.replace(/\\\$/g, '$');
  
  // Patrones matemáticos comunes
  const mathPatterns = [
    /x\^2/g,                 // x^2
    /\b([a-z])(\^[0-9])/g,   // cualquier letra con exponente
    /\\frac/g,               // fracciones
    /\\int/g,                // integrales
    /\\sum/g,                // sumas
    /\\prod/g,               // productos
    /\\lim/g,                // límites
    /\\sin|\\cos|\\tan/g,    // funciones trigonométricas
    /\\sqrt/g,               // raíz cuadrada
    /\\infty/g,              // infinito
    /\\partial/g             // derivadas parciales
  ];
  
  // Si el texto no tiene delimitadores $ pero contiene patrones matemáticos,
  // buscar y envolver esos patrones con delimitadores
  if (!text.includes('$')) {
    for (const pattern of mathPatterns) {
      // Si encuentra el patrón, buscar la palabra completa o expresión
      if (pattern.test(text)) {
        // Buscar expresiones matemáticas y envolverlas con $
        text = text.replace(/([a-z0-9]+(\^[0-9]+)?(\s*[\+\-\*\/]\s*[a-z0-9]+(\^[0-9]+)?)+)/g, 
                          match => {
                            // Verificar si ya está envuelto en $
                            if (match.startsWith('$') && match.endsWith('$')) {
                              return match;
                            }
                            return `$${match}$`;
                          });
        
        // Si aún no hay delimitadores, hacer un intento más específico
        if (!text.includes('$')) {
          mathPatterns.forEach(p => {
            text = text.replace(p, match => `$${match}$`);
          });
        }
      }
    }
  }
  
  return text;
}

/**
 * Limpia todos los timeouts asociados al examen
 */
function clearExamTimeouts() {
  Object.values(TIMEOUT_KEYS).forEach(key => {
    clearManagedTimeouts(key);
  });
}

export default {
  renderExam
};