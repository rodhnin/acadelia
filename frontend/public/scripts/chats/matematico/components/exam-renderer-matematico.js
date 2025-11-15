/**
 * exam-renderer.js - Renderiza exámenes interactivos con soporte para contenido matemático
 * VERSIÓN SIMPLE Y FUNCIONAL
 */

import { 
  createElement, 
  clearElement, 
  addEvent, 
  removeAllEvents,
  setManagedTimeout,
  clearManagedTimeouts
} from '../../shared/dom-helpers.js';

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
  
  clearExamTimeouts();
  
  removeAllEvents(container);
  
  // Asegurar que el contenedor tenga la clase correcta
  container.className = 'exam-container';
  container.setAttribute('data-exam-interactive', 'true');
  clearElement(container);
  
  if (!isValidExamData(examData)) {
    appendErrorMessage(container);
    return;
  }
  
  const mathJaxPromise = initializeMathJax();
  
  // Estado del examen
  const examState = {
    currentQuestion: 0,
    correctAnswers: 0,
    questions: examData.questions
  };
  
  const exam = buildExamStructure(examData, examState);
  container.appendChild(exam);
  
  container.setAttribute('data-has-math', 'true');
  
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
  
  const examHeader = createElement('div', { className: 'exam-header' });
  
  const title = createElement('h3', { className: 'exam-title' }, `Examen: ${examData.topic}`);
  const progress = createElement('div', { className: 'exam-progress' });
  
  examHeader.appendChild(title);
  examHeader.appendChild(progress);
  exam.appendChild(examHeader);
  
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

async function showQuestion(container, exam, examState, mathJaxPromise) {
  const questionContainer = exam.querySelector('.question-container');
  if (!questionContainer) return;
  
  const question = examState.questions[examState.currentQuestion];
  
  clearElement(questionContainer);
  removeAllEvents(questionContainer);
  
  let questionText = prepareLatexContent(question.question);
  
  const questionElement = createElement('div', { 
    className: 'question math-content',
    dataset: { hasMath: 'true' }
  });
  
  const styleElement = createElement('style', {}, `
    .math-pending { opacity: 0.9; }
    .math-rendered { opacity: 1; transition: opacity 0.2s; }
  `);
  
  questionElement.appendChild(styleElement);
  
  const questionTextElement = createElement('h4', { 
    className: 'question-text math-content' 
  });
  questionTextElement.innerHTML = questionText;
  questionElement.appendChild(questionTextElement);
  
  const optionsContainer = createElement('div', { className: 'options' });
  questionElement.appendChild(optionsContainer);
  
  for (let i = 0; i < question.options.length; i++) {
    const letter = String.fromCharCode(97 + i);
    let optionText = question.options[i];
    
    optionText = optionText.replace(new RegExp(`^${letter}\\)\\s*`, 'i'), '');
    optionText = prepareLatexContent(optionText);
    
    const button = createElement('button', { 
      className: 'option',
      dataset: { 
        index: i,
        examOption: 'true'
      }
    });
    
    const letterSpan = createElement('span', { className: 'option-letter' }, `${letter.toUpperCase()})`);
    
    const textSpan = createElement('span', { className: 'option-text math-content' });
    textSpan.innerHTML = optionText;
    
    button.appendChild(letterSpan);
    button.appendChild(textSpan);
    
    addEvent(button, 'click', (e) => {
      container.setAttribute('data-exam-interaction-active', 'true');
      button.classList.add('clicked');
      
      if (window.scrollManager) {
        window.scrollManager.lockScrollWithReason('exam-option-click', 1000);
      }
      
      handleAnswer(e, container, exam, examState, mathJaxPromise);
      
      setManagedTimeout(() => {
        const hasExplanation = questionContainer.querySelector('.explanation');
        if (!hasExplanation) {
          container.removeAttribute('data-exam-interaction-active');
        }
      }, 1500, TIMEOUT_KEYS.INTERACTION);
    });
    
    optionsContainer.appendChild(button);
  }
  
  questionContainer.appendChild(questionElement);

  const safetyTimeout = setManagedTimeout(() => {
    console.log('Timeout de seguridad activado - asegurando contenido visible');
    questionElement.querySelectorAll('.math-pending').forEach(el => {
      el.classList.remove('math-pending');
      el.classList.add('math-rendered');
    });
  }, 800, 'exam-visibility-safety');
  
  try {
    mathJaxPromise.then(async () => {
      try {
        await renderMathContent(questionElement);
        // Una vez renderizado, mejorar la apariencia
        questionElement.querySelectorAll('.math-pending').forEach(el => {
          el.classList.remove('math-pending');
          el.classList.add('math-rendered');
        });
      } catch (err) {
        console.warn('Error en renderizado posterior de MathJax:', err);
      } finally {
        clearManagedTimeouts('exam-visibility-safety');
      }
    });
  } catch (err) {
    console.warn('Error al iniciar renderizado en segundo plano:', err);
    // Asegurar que el contenido sigue siendo visible
    clearManagedTimeouts('exam-visibility-safety');
  }
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
  if (!questionContainer) return;
  
  const selected = e.target.closest('.option');
  if (!selected) return;
  
  const correctIndex = examState.questions[examState.currentQuestion].correctAnswer.charCodeAt(0) - 97;
  
  questionContainer.querySelectorAll('.option').forEach(opt => {
    opt.disabled = true;
  });
  
  if (parseInt(selected.dataset.index) === correctIndex) {
    examState.correctAnswers++;
    selected.classList.add('correct');
    
    const motivationalMessages = [
      "¡Correcto! 🎯",
      "¡Exacto! 🧮", 
      "¡Perfecto! ⭐",
      "¡Bien pensado! 🧠",
      "¡Acadel aprueba! 🦫",
      "¡Excelente! 🌟",
      "¡Brillante! 💡",
      "¡Impecable! 👌",
      "¡Magistral! 🎓",
      "¡Genial! ⚡"
    ];
    
    const motivationalDetails = [
      "Acadel ve que dominas el concepto",
      "Tu razonamiento matemático es sólido",
      "Ese enfoque es perfecto para este tipo de problema",
      "Acadel está impresionado con tu lógica",
      "Tu comprensión del tema es evidente",
      "Así se resuelven los problemas matemáticos",
      "Tu capibara profesor está orgulloso",
      "Demuestras un excelente dominio del tema",
      "Acadel nota tu progreso constante",
      "Tu intuición matemática es destacable"
    ];
    
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    const randomMessage = motivationalMessages[randomIndex];
    const randomDetail = motivationalDetails[randomIndex];
    
    acadelInfo(randomMessage, randomDetail);
    
  } else {
    selected.classList.add('incorrect');
    const correctOption = questionContainer.querySelector(`[data-index="${correctIndex}"]`);
    if (correctOption) {
      correctOption.classList.add('correct');
    }
    
    const encouragementMessages = [
      "¡No te preocupes! 🤔",
      "¡Casi! 💭",
      "¡Sigue intentando! 💪", 
      "¡Aprendemos de los errores! 📝",
      "¡Tranquilo! 🦫",
      "¡Es parte del proceso! 🔄",
      "¡No pasa nada! 😊",
      "¡Todos fallamos a veces! 🤷‍♂️",
      "¡Eso es normal! 👍",
      "¡Sigue adelante! 🚀"
    ];
    
    const encouragementDetails = [
      "Acadel sabe que la próxima la tendrás correcta",
      "Los errores son oportunidades de aprendizaje",
      "Hasta Newton se equivocaba en sus cálculos",
      "Acadel cree firmemente en tu potencial",
      "Este tema requiere práctica, pero vas bien",
      "Tu capibara profesor te anima a continuar",
      "Cada error te acerca más a la respuesta correcta",
      "Acadel ve que estás pensando en la dirección correcta",
      "Los mejores matemáticos aprenden de sus errores",
      "Tu perseverancia es lo que más valora Acadel"
    ];
    
    const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
    const randomEncouragement = encouragementMessages[randomIndex];
    const randomDetail = encouragementDetails[randomIndex];
    
    acadelInfo(randomEncouragement, randomDetail);
  }
  
  // Variable para control de limpieza
  let explanationRendered = false;
  
  // Control de promise para asegurar que la explicación siempre se muestre
  let explanationPromiseResolver;
  const explanationShownPromise = new Promise(resolve => {
    explanationPromiseResolver = resolve;
  });
  
  setManagedTimeout(async () => {
    const explanation = createElement('div', { 
      className: 'explanation math-content',
      dataset: { hasMath: 'true' }
    });
    
    // Pre-procesar explicación para LaTeX
    const explanationText = prepareLatexContent(examState.questions[examState.currentQuestion].explanation);
    
    const explanationContent = createElement('div', { className: 'explanation-content' });
    
    const explanationParagraph = createElement('p', { className: 'math-content' });
    explanationParagraph.innerHTML = `<strong>Explicación:</strong> ${explanationText}`;
    
    explanationContent.appendChild(explanationParagraph);
    explanation.appendChild(explanationContent);
    
    const nextButton = createElement('button', { 
      className: 'next-question',
      dataset: { examNavigation: 'true' }
    }, examState.currentQuestion < examState.questions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados');
    
    addEvent(nextButton, 'click', () => {
      container.setAttribute('data-exam-navigation', 'true');
      
      if (window.scrollManager) {
        window.scrollManager.lockScrollWithReason('exam-navigation', 800);
      }
      
      if (examState.currentQuestion < examState.questions.length - 1) {
        examState.currentQuestion++;
        updateProgress(exam, examState);
        showQuestion(container, exam, examState, mathJaxPromise);
      } else {
        showResults(container, exam, examState);
      }
      
      setManagedTimeout(() => {
        container.removeAttribute('data-exam-interaction-active');
        container.removeAttribute('data-exam-navigation');
      }, 300, TIMEOUT_KEYS.NAVIGATION);
    });
    
    explanation.appendChild(nextButton);
    questionContainer.appendChild(explanation);
    
    // IMPORTANTE: Marcar que la explicación se ha mostrado inmediatamente
    explanationRendered = true;
    explanationPromiseResolver(true);
    
    try {
      mathJaxPromise.then(async () => {
        try {
          await renderMathContent(explanation);
          console.log('MathJax aplicado a la explicación');
        } catch (err) {
          console.warn('Error al renderizar MathJax en explicación:', err);
        }
      });
    } catch (err) {
      console.warn('Error general en renderizado MathJax para explicación:', err);
    }
    
    // Tiempo para permitir scroll nuevamente
    setManagedTimeout(() => {
      container.removeAttribute('data-exam-interaction-active');
      
      if (window.scrollManager && window.scrollManager.scrollLocked && 
          window.scrollManager.lockReason && 
          window.scrollManager.lockReason.includes('exam')) {
        window.scrollManager.unlockScrollWithReason('explanation-displayed');
      }
    }, 800, TIMEOUT_KEYS.EXPLANATION);
  }, 1000, TIMEOUT_KEYS.EXPLANATION);
  
  setManagedTimeout(async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout esperando explicación')), 2000);
      });
      
      await Promise.race([explanationShownPromise, timeoutPromise]);
    } catch (e) {
      console.warn('Sistema de seguridad activado para mostrar explicación:', e);
      
      if (!explanationRendered) {
        container.removeAttribute('data-exam-interaction-active');
        
        if (window.scrollManager && window.scrollManager.scrollLocked) {
          window.scrollManager.unlockScrollWithReason('safety-timeout');
        }
        
        // Recurso de emergencia: hacer clic automático en el botón si existe
        const nextButton = questionContainer.querySelector('.next-question');
        if (nextButton) {
          console.log('Clic automático en botón de siguiente pregunta (recuperación)');
          nextButton.click();
        } else {
          console.error('No se pudo encontrar el botón de siguiente pregunta para recuperación automática');
        }
      }
    }
  }, 3500, TIMEOUT_KEYS.SAFETY);
}

/**
 * Muestra los resultados finales del examen
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function showResults(container, exam, examState) {
  container.removeAttribute('data-exam-interaction-active');
  container.removeAttribute('data-exam-navigation');
  
  clearElement(exam);
  removeAllEvents(exam);
  
  const percentage = (examState.correctAnswers / examState.questions.length) * 100;

  if (percentage >= 95) {
    // EXCELENCIA ABSOLUTA - CONFETTI
    acadelConfetti(
      "🏆 ¡PERFECCIÓN MATEMÁTICA! 🏆", 
      "¡Acadel está en shock! Ese nivel de dominio es digno de un genio. ¡Einstein estaría celoso!"
    );
  } else if (percentage >= 90) {
    // EXCELENTE - CONFETTI
    acadelConfetti(
      "🎉 ¡EXCELENTE TRABAJO! 🎉", 
      "¡Acadel está súper orgulloso! Dominas el tema como todo un matemático profesional"
    );
  } else if (percentage >= 80) {
    // MUY BUENO - ÉXITO
    acadelExito(
      "🌟 ¡Muy buen resultado! 🌟", 
      "Acadel ve que tienes talento natural. Con un poco más de práctica serás imparable"
    );
  } else if (percentage >= 70) {
    // BUENO - ÉXITO
    acadelExito(
      "👍 ¡Buen trabajo! 👍", 
      "Acadel nota que entiendes los conceptos. Sigue así y mejorarás aún más"
    );
  } else if (percentage >= 60) {
    // REGULAR - INFO MOTIVACIONAL
    acadelInfo(
      "📚 ¡Vas por buen camino! 📚", 
      "Acadel cree en ti. Estos temas requieren práctica, pero ya tienes la base. ¡No te rindas!"
    );
  } else if (percentage >= 40) {
    // NECESITA MEJORAR - WARNING MOTIVACIONAL
    acadelWarning(
      "💪 ¡A practicar más! 💪", 
      "Acadel sugiere repasar los conceptos básicos. Todos los matemáticos empezaron así. ¡Tú puedes!"
    );
  } else {
    // NECESITA MUCHO TRABAJO - INFO ALENTADOR
    acadelInfo(
      "🦫 Acadel está aquí para ayudarte", 
      "No te desanimes. Hasta Newton tuvo que empezar desde cero. Repasemos juntos paso a paso"
    );
  }
  
  const resultsContainer = createElement('div', { className: 'exam-completed' });
  
  const title = createElement('h4', {}, '¡Examen completado! 🎉');
  
  const scoreText = createElement('p', { className: 'score' }, 'Respuestas correctas: ');
  const correctSpan = createElement('span', { className: 'correct' }, `${examState.correctAnswers}`);
  const separatorSpan = createElement('span', {}, ' / ');
  const totalSpan = createElement('span', { className: 'total' }, `${examState.questions.length}`);
  
  scoreText.appendChild(correctSpan);
  scoreText.appendChild(separatorSpan);
  scoreText.appendChild(totalSpan);
  
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
  
  resultsContainer.appendChild(title);
  resultsContainer.appendChild(scoreText);
  resultsContainer.appendChild(resultText);
  
  exam.appendChild(resultsContainer);
  
  if (window.scrollManager) {
    window.scrollManager.unlockScrollWithReason('exam-completed');
  }
  
  clearExamTimeouts();
}

function initializeMathJax() {
  window._mathJaxInitPromise = null;
  
  return new Promise(async (resolve, reject) => {
    try {
      const mathModule = await import('../math/mathjax-config.js');
      if (!mathModule || typeof mathModule.renderMath !== 'function') {
        console.warn('Módulo MathJax no disponible');
        resolve(null); // Resolver en lugar de rechazar para evitar bloqueo
        return;
      }
      
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

async function renderMathContent(element) {
  if (!element) return Promise.reject(new Error('Elemento no válido'));
  
  try {
    const mathModule = await import('../math/mathjax-config.js');
    if (mathModule && typeof mathModule.renderMath === 'function') {
      try {
        const mathId = element.dataset.mathId || `math-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        element.dataset.mathId = mathId;
        
        return await mathModule.renderMath(element, {
          useCache: true,
          cacheKey: mathId,
          maxRetries: 2 // Reducir número de reintentos para mayor velocidad
        });
      } catch (renderError) {
        console.warn('Error al renderizar matemáticas:', renderError);
        // Forzar visibilidad en caso de error
        element.querySelectorAll('.math-pending').forEach(el => {
          el.classList.remove('math-pending');
        });
        return Promise.resolve(); // No rechazar para evitar bloqueos
      }
    } else {
      console.warn('Función renderMath no disponible');
      element.querySelectorAll('.math-pending').forEach(el => {
        el.classList.remove('math-pending');
      });
      return Promise.resolve();
    }
  } catch (err) {
    console.warn('Error al importar módulo mathjax-config:', err);
    element.querySelectorAll('.math-pending').forEach(el => {
      el.classList.remove('math-pending');
    });
    return Promise.resolve();
  }
}

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
  if (!text.includes('$')) {
    for (const pattern of mathPatterns) {
      // Si encuentra el patrón, buscar la palabra completa o expresión
      if (pattern.test(text)) {
        text = text.replace(/([a-z0-9]+(\^[0-9]+)?(\s*[\+\-\*\/]\s*[a-z0-9]+(\^[0-9]+)?)+)/g, 
                          match => {
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