/**
 * exam-renderer.js - Renderizador de exámenes interactivos para TEÓRICO
 * VERSIÓN BASADA EN EL MATEMÁTICO QUE SÍ FUNCIONA
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
  container.setAttribute('data-has-math', 'true'); // Mantener para compatibilidad
  clearElement(container);
  
  if (!isValidExamData(examData)) {
    appendErrorMessage(container);
    return;
  }
  
  // Estado del examen
  const examState = {
    currentQuestion: 0,
    correctAnswers: 0,
    questions: examData.questions
  };
  
  const exam = buildExamStructure(examData, examState);
  container.appendChild(exam);
  
  updateProgress(exam, examState);
  showQuestion(container, exam, examState);
  
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

/**
 * Muestra la pregunta actual
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function showQuestion(container, exam, examState) {
  const questionContainer = exam.querySelector('.question-container');
  if (!questionContainer) return;
  
  const question = examState.questions[examState.currentQuestion];
  
  clearElement(questionContainer);
  removeAllEvents(questionContainer);
  
  const questionElement = createElement('div', { 
    className: 'question math-content',
    dataset: { hasMath: 'true' }
  });
  
  const questionTextElement = createElement('h4', { 
    className: 'question-text math-content' 
  });
  questionTextElement.textContent = question.question;
  questionElement.appendChild(questionTextElement);
  
  const optionsContainer = createElement('div', { className: 'options' });
  questionElement.appendChild(optionsContainer);
  
  for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
    const letter = String.fromCharCode(97 + optionIndex); // 🔧 SIN parseInt
    let optionText = question.options[optionIndex];
    
    optionText = optionText.replace(new RegExp(`^${letter}\\)\\s*`, 'i'), '');
    
    const button = createElement('button', { 
      className: 'option',
      dataset: { 
        index: optionIndex,
        examOption: 'true'
      }
    });
    
    const letterSpan = createElement('span', { className: 'option-letter' }, `${letter.toUpperCase()})`);
    
    const textSpan = createElement('span', { className: 'option-text math-content' });
    textSpan.textContent = ` ${optionText}`;
    
    button.appendChild(letterSpan);
    button.appendChild(textSpan);
    
    addEvent(button, 'click', (e) => {
      container.setAttribute('data-exam-interaction-active', 'true');
      button.classList.add('clicked');
      
      if (window.scrollManager) {
        window.scrollManager.lockScrollWithReason('exam-option-click', 1000);
      }
      
      handleAnswer(e, container, exam, examState);
      
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
}

/**
 * Maneja la respuesta del usuario
 * @param {Event} e - Evento del clic
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function handleAnswer(e, container, exam, examState) {
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
      "¡Exacto! 📚", 
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
      "Acadel ve que dominas el concepto teórico",
      "Tu razonamiento académico es sólido", 
      "Ese enfoque es perfecto para este tipo de teoría",
      "Acadel está impresionado con tu análisis",
      "Tu comprensión conceptual es evidente",
      "Así se abordan los conceptos teóricos",
      "Tu capibara profesor está orgulloso",
      "Demuestras un excelente dominio teórico",
      "Acadel nota tu progreso académico constante",
      "Tu intuición teórica es destacable"
    ];
    
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    const randomMessage = motivationalMessages[randomIndex];
    const randomDetail = motivationalDetails[randomIndex];
    
    if (typeof acadelInfo === 'function') {
      acadelInfo(randomMessage, randomDetail);
    }
    
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
      "Hasta los mejores teóricos se equivocaban en sus análisis",
      "Acadel cree firmemente en tu potencial académico",
      "Este concepto requiere práctica, pero vas bien",
      "Tu capibara profesor te anima a continuar",
      "Cada error te acerca más a la comprensión correcta",
      "Acadel ve que estás pensando en la dirección correcta",
      "Los mejores académicos aprenden de sus errores",
      "Tu perseverancia es lo que más valora Acadel"
    ];
    
    const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
    const randomEncouragement = encouragementMessages[randomIndex];
    const randomDetail = encouragementDetails[randomIndex];
    
    if (typeof acadelInfo === 'function') {
      acadelInfo(randomEncouragement, randomDetail);
    }
  }
  
  // Variable para control de limpieza
  let explanationRendered = false;
  
  // Control de promise para asegurar que la explicación siempre se muestre
  let explanationPromiseResolver;
  const explanationShownPromise = new Promise(resolve => {
    explanationPromiseResolver = resolve;
  });
  
  setManagedTimeout(() => {
    const explanation = createElement('div', { 
      className: 'explanation math-content',
      dataset: { hasMath: 'true' }
    });
    
    const explanationContent = createElement('div', { className: 'explanation-content' });
    
    const explanationParagraph = createElement('p', { className: 'math-content' });
    explanationParagraph.innerHTML = `<strong>Explicación:</strong> ${examState.questions[examState.currentQuestion].explanation}`;
    
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
        showQuestion(container, exam, examState);
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
    if (typeof acadelConfetti === 'function') {
      acadelConfetti(
        "🏆 ¡PERFECCIÓN ACADÉMICA! 🏆", 
        "¡Acadel está en shock! Ese nivel de dominio teórico es digno de un erudito. ¡Los grandes pensadores estarían celosos!"
      );
    }
  } else if (percentage >= 90) {
    // EXCELENTE - CONFETTI
    if (typeof acadelConfetti === 'function') {
      acadelConfetti(
        "🎉 ¡EXCELENTE TRABAJO! 🎉", 
        "¡Acadel está súper orgulloso! Dominas la teoría como todo un académico profesional"
      );
    }
  } else if (percentage >= 80) {
    // MUY BUENO - ÉXITO
    if (typeof acadelExito === 'function') {
      acadelExito(
        "🌟 ¡Muy buen resultado! 🌟", 
        "Acadel ve que tienes talento natural para la teoría. Con un poco más de estudio serás imparable"
      );
    }
  } else if (percentage >= 70) {
    // BUENO - ÉXITO
    if (typeof acadelExito === 'function') {
      acadelExito(
        "👍 ¡Buen trabajo! 👍", 
        "Acadel nota que entiendes los conceptos fundamentales. Sigue así y mejorarás aún más"
      );
    }
  } else if (percentage >= 60) {
    // REGULAR - INFO MOTIVACIONAL
    if (typeof acadelInfo === 'function') {
      acadelInfo(
        "📚 ¡Vas por buen camino! 📚", 
        "Acadel cree en ti. Estos conceptos teóricos requieren práctica, pero ya tienes la base. ¡No te rindas!"
      );
    }
  } else if (percentage >= 40) {
    // NECESITA MEJORAR - WARNING MOTIVACIONAL
    if (typeof acadelWarning === 'function') {
      acadelWarning(
        "💪 ¡A estudiar más teoría! 💪", 
        "Acadel sugiere repasar los conceptos fundamentales. Todos los grandes académicos empezaron así. ¡Tú puedes!"
      );
    }
  } else {
    // NECESITA MUCHO TRABAJO - INFO ALENTADOR
    if (typeof acadelInfo === 'function') {
      acadelInfo(
        "🦫 Acadel está aquí para ayudarte", 
        "No te desanimes. Hasta los más grandes teóricos tuvieron que empezar desde cero. Repasemos juntos paso a paso"
      );
    }
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