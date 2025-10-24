/**
 * exam-renderer.js - Renderizador de exámenes interactivos para PDF
 * VERSIÓN BASADA EN EL MATEMÁTICO QUE SÍ FUNCIONA
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
  
  // Estado del examen
  const examState = {
    currentQuestion: 0,
    correctAnswers: 0,
    questions: examData.questions
  };
  
  // Crear estructura del examen
  const exam = buildExamStructure(examData, examState);
  container.appendChild(exam);
  
  // Iniciar el examen
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
  
  // Crear header del examen
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
 * Muestra la pregunta actual
 * @param {HTMLElement} container - Contenedor principal
 * @param {HTMLElement} exam - Elemento del examen
 * @param {Object} examState - Estado del examen
 */
function showQuestion(container, exam, examState) {
  const questionContainer = exam.querySelector('.question-container');
  if (!questionContainer) return;
  
  const question = examState.questions[examState.currentQuestion];
  
  // Limpiar contenedor de preguntas y remover eventos previos
  clearElement(questionContainer);
  removeAllEvents(questionContainer);
  
  // Crear elemento de pregunta
  const questionElement = createElement('div', { 
    className: 'question',
    dataset: { hasMath: 'false' }  // PDF no necesita matemáticas
  });
  
  // Añadir texto de la pregunta
  const questionTextElement = createElement('h4', { 
    className: 'question-text' 
  });
  questionTextElement.textContent = question.question;
  questionElement.appendChild(questionTextElement);
  
  // Crear contenedor de opciones
  const optionsContainer = createElement('div', { className: 'options' });
  questionElement.appendChild(optionsContainer);
  
  // 🔧 CAMBIO CRÍTICO: Usar for loop en lugar de forEach para evitar problemas de ofuscación
  for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
    const letter = String.fromCharCode(97 + optionIndex);
    let optionText = question.options[optionIndex];
    
    // Limpiar el texto de la opción
    optionText = optionText.replace(new RegExp(`^${letter}\\)\\s*`, 'i'), '');
    
    const button = createElement('button', { 
      className: 'option',
      dataset: { 
        index: optionIndex,
        examOption: 'true'
      }
    });
    
    const letterSpan = createElement('span', { className: 'option-letter' }, `${letter.toUpperCase()})`);
    
    const textSpan = createElement('span', { className: 'option-text' });
    textSpan.textContent = ` ${optionText}`;
    
    button.appendChild(letterSpan);
    button.appendChild(textSpan);
    
    // Añadir manejador de eventos
    addEvent(button, 'click', (e) => {
      container.setAttribute('data-exam-interaction-active', 'true');
      button.classList.add('clicked');
      
      // Manejar scroll sin scrollHelper object
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
  
  // Añadir la pregunta al contenedor
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
  
  // Deshabilitar todas las opciones
  questionContainer.querySelectorAll('.option').forEach(opt => {
    opt.disabled = true;
  });
  
  // Actualizar contador y aplicar estilos
  if (parseInt(selected.dataset.index) === correctIndex) {
    examState.correctAnswers++;
    selected.classList.add('correct');
    
    // 🎯 NOTIFICACIÓN POR RESPUESTA CORRECTA - 10 MENSAJES VARIADOS PARA ESTUDIANTES CON PDF
    const motivationalMessages = [
      "¡Correcto! 🎯",
      "¡Exacto! 📄", 
      "¡Perfecto! ⭐",
      "¡Bien analizado! 🧠",
      "¡Acadel aprueba! 🦫",
      "¡Excelente! 🌟",
      "¡Brillante! 💡",
      "¡Impecable! 👌",
      "¡Magistral! 🎓",
      "¡Genial! ⚡"
    ];
    
    const motivationalDetails = [
      "Acadel ve que comprendes bien el material",
      "Tu análisis del contenido es sólido",
      "Ese enfoque es perfecto para este documento",
      "Acadel está impresionado con tu comprensión",
      "Tu interpretación del texto es evidente",
      "Así se analiza contenido de calidad",
      "Tu capibara profesor está orgulloso",
      "Demuestras un excelente entendimiento",
      "Acadel nota tu progreso constante",
      "Tu capacidad de análisis es destacable"
    ];
    
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    const randomMessage = motivationalMessages[randomIndex];
    const randomDetail = motivationalDetails[randomIndex];
    
    // Mostrar notificación sutil para respuesta correcta
    if (typeof acadelInfo === 'function') {
      acadelInfo(randomMessage, randomDetail);
    }
    
  } else {
    selected.classList.add('incorrect');
    const correctOption = questionContainer.querySelector(`[data-index="${correctIndex}"]`);
    if (correctOption) {
      correctOption.classList.add('correct');
    }
    
    // 🎯 NOTIFICACIÓN POR RESPUESTA INCORRECTA - 10 MENSAJES DE ALIENTO PARA PDF
    const encouragementMessages = [
      "¡No te preocupes! 🤔",
      "¡Casi! 💭",
      "¡Sigue intentando! 💪", 
      "¡De los errores se aprende! 📚",
      "¡Tranquilo! 🦫",
      "¡Es parte del proceso! 🔄",
      "¡No pasa nada! 😊",
      "¡Todos nos equivocamos! 🤷‍♂️",
      "¡Eso es normal! 👍",
      "¡Sigue adelante! 🚀"
    ];
    
    const encouragementDetails = [
      "Acadel sabe que dominarás este contenido repasando",
      "Los errores nos muestran qué repasar del material",
      "Hasta los mejores estudiantes fallan algunas",
      "Acadel cree que con un repaso más tendrás todo claro",
      "Este tema requiere más tiempo, pero vas bien",
      "Tu capibara profesor te anima a continuar",
      "Cada error te dice exactamente qué estudiar después",
      "Acadel ve que estás pensando correctamente",
      "Los mejores estudiantes aprenden de sus errores",
      "Tu perseverancia es lo que más valora Acadel"
    ];
    
    const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
    const randomEncouragement = encouragementMessages[randomIndex];
    const randomDetail = encouragementDetails[randomIndex];
    
    // Mostrar notificación alentadora
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
  
  // Mostrar explicación después de un delay
  setManagedTimeout(() => {
    const explanation = createElement('div', { 
      className: 'explanation',
      dataset: { hasMath: 'false' }
    });
    
    const explanationContent = createElement('div', { className: 'explanation-content' });
    
    // Crear párrafo de explicación
    const explanationParagraph = createElement('p');
    explanationParagraph.innerHTML = `<strong>Explicación:</strong> ${examState.questions[examState.currentQuestion].explanation}`;
    
    explanationContent.appendChild(explanationParagraph);
    explanation.appendChild(explanationContent);
    
    // Crear botón de siguiente
    const nextButton = createElement('button', { 
      className: 'next-question',
      dataset: { examNavigation: 'true' }
    }, examState.currentQuestion < examState.questions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados');
    
    // Añadir manejador
    addEvent(nextButton, 'click', () => {
      // Marcar como navegación activa
      container.setAttribute('data-exam-navigation', 'true');
      
      // Bloquear scroll temporalmente
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
      
      // Limpiar atributos después de tiempo suficiente
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
      
      // Desbloquear scroll explícitamente
      if (window.scrollManager && window.scrollManager.scrollLocked && 
          window.scrollManager.lockReason && 
          window.scrollManager.lockReason.includes('exam')) {
        window.scrollManager.unlockScrollWithReason('explanation-displayed');
      }
    }, 800, TIMEOUT_KEYS.EXPLANATION);
  }, 1000, TIMEOUT_KEYS.EXPLANATION);
  
  // Sistema de seguridad
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
  // Marcar que ya no hay interacciones activas
  container.removeAttribute('data-exam-interaction-active');
  container.removeAttribute('data-exam-navigation');
  
  // Limpiar el contenido actual y eventos
  clearElement(exam);
  removeAllEvents(exam);
  
  const percentage = (examState.correctAnswers / examState.questions.length) * 100;

  // 🎯 NOTIFICACIONES DEL PROFESOR ACADEL BASADAS EN RENDIMIENTO PARA PDF
  if (percentage >= 95) {
    // EXCELENCIA ABSOLUTA - CONFETTI
    if (typeof acadelConfetti === 'function') {
      acadelConfetti(
        "🏆 ¡DOMINIO TOTAL DEL CONTENIDO! 🏆", 
        "¡Acadel está en shock! Ese nivel de comprensión del material es digno de un experto"
      );
    }
  } else if (percentage >= 90) {
    // EXCELENTE - CONFETTI
    if (typeof acadelConfetti === 'function') {
      acadelConfetti(
        "🎉 ¡EXCELENTE TRABAJO! 🎉", 
        "¡Acadel está súper orgulloso! Dominas el contenido como todo un profesional"
      );
    }
  } else if (percentage >= 80) {
    // MUY BUENO - ÉXITO
    if (typeof acadelExito === 'function') {
      acadelExito(
        "🌟 ¡Muy buen resultado! 🌟", 
        "Acadel ve que tienes gran capacidad de análisis. Con un poco más de práctica serás imparable"
      );
    }
  } else if (percentage >= 70) {
    // BUENO - ÉXITO
    if (typeof acadelExito === 'function') {
      acadelExito(
        "👍 ¡Buen trabajo! 👍", 
        "Acadel nota que entiendes los conceptos principales. Sigue así y mejorarás aún más"
      );
    }
  } else if (percentage >= 60) {
    // REGULAR - INFO MOTIVACIONAL
    if (typeof acadelInfo === 'function') {
      acadelInfo(
        "📚 ¡Vas por buen camino! 📚", 
        "Acadel cree en ti. Este material requiere práctica, pero ya tienes la base. ¡No te rindas!"
      );
    }
  } else if (percentage >= 40) {
    // NECESITA MEJORAR - WARNING MOTIVACIONAL
    if (typeof acadelWarning === 'function') {
      acadelWarning(
        "💪 ¡A repasar más! 💪", 
        "Acadel sugiere revisar el contenido nuevamente. Todos los expertos empezaron así. ¡Tú puedes!"
      );
    }
  } else {
    // NECESITA MUCHO TRABAJO - INFO ALENTADOR
    if (typeof acadelInfo === 'function') {
      acadelInfo(
        "🦫 Acadel está aquí para ayudarte", 
        "No te desanimes. Hasta los más exitosos tuvieron que empezar estudiando paso a paso"
      );
    }
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