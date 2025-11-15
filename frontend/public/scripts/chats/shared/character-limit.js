/**
 * character-limit.js - Limitador de caracteres para chats CON PROFESOR ACADEL
 */

// Configuración global
const CONFIG = {
  // El modelo soporta aproximadamente 8164 tokens
  MAX_CHARS: 3000,
  
  // Límites por variante (ajustar según necesidades)
  VARIANT_LIMITS: {
    matematico: 3000,
    teorico: 3000,
    herramientas: 3000
  },
  
  // Umbrales de advertencia (porcentaje del límite)
  WARNING_THRESHOLD: 0.8,
  DANGER_THRESHOLD: 0.95,
  
  // Duración de la alerta en ms (4 segundos como solicitaste)
  ALERT_DURATION: 4000,
  
  // Retraso de actualización para evitar cálculos excesivos
  UPDATE_DELAY: 100
};

// Estado del módulo
let state = {
  textareas: new Map(), // Mapa de todos los textareas monitoreados
  counters: new Map(),  // Mapa de contadores por textarea
  alertElement: null,   // Elemento de alerta
  alertTimeout: null,   // Timeout para ocultar alerta
  currentLimit: CONFIG.MAX_CHARS, // Límite actual aplicado
  isExceeded: false     // Si actualmente se excede el límite
};

function showAcadelLimitAlert() {
  if (typeof window.acadelWarning === 'function') {
    window.acadelWarning(
      "📝 ¡Mensaje muy extenso!",
      "Acadel dice: 'Incluso mi cerebro de capibara tiene límites'. Haz tu consulta más concisa, por favor"
    );
  } else {
    showAlert(); // Usar el método original como respaldo
  }
}

/**
 * Crea el elemento de alerta para mostrar cuando se excede el límite
 * MANTENER como fallback, pero ya no se usa normalmente
 * @returns {HTMLElement} El elemento de alerta
 */
function createAlertElement() {
  // Si ya existe, devolverlo
  if (state.alertElement && document.body.contains(state.alertElement)) {
    return state.alertElement;
  }
  
  const alert = document.createElement('div');
  alert.className = 'character-limit-alert';
  alert.setAttribute('role', 'alert');
  alert.id = 'character-limit-alert';
  
  alert.innerHTML = `
    <i class="bx bx-error-circle"></i>
    <span>Acadel dice: "¡Ey! Ese mensaje está muy largo para mi cerebro de capibara"</span>
  `;
  
  document.body.appendChild(alert);
  
  state.alertElement = alert;
  
  return alert;
}

/**
 * Muestra la alerta de límite excedido (FALLBACK)
 * Normalmente se usa showAcadelLimitAlert()
 */
function showAlert() {
  const alert = createAlertElement();
  
  if (state.alertTimeout) {
    clearTimeout(state.alertTimeout);
    state.alertTimeout = null;
  }
  
  alert.classList.add('visible');
  
  state.alertTimeout = setTimeout(() => {
    hideAlert();
  }, CONFIG.ALERT_DURATION);
}

/**
 * Oculta la alerta de límite excedido
 */
function hideAlert() {
  if (state.alertElement) {
    state.alertElement.classList.remove('visible');
  }
  
  if (state.alertTimeout) {
    clearTimeout(state.alertTimeout);
    state.alertTimeout = null;
  }
}

/**
 * Crea o encuentra el contador de caracteres para un textarea
 * @param {HTMLTextAreaElement} textarea - El textarea a monitorear
 * @returns {HTMLElement} El elemento contador
 */
function createCounter(textarea) {
  // Si ya existe un contador para este textarea, devolverlo
  if (state.counters.has(textarea)) {
    return state.counters.get(textarea);
  }
  
  const isWelcomeTextarea = textarea.id === 'welcome-message-input';
  const container = textarea.closest('.input-container') || 
                   textarea.closest('.input-box') ||
                   textarea.closest('.welcome-input-container') ||
                   textarea.parentNode;
  
  if (!container) return null;
  
  const counter = document.createElement('div');
  counter.className = 'character-counter';
  container.appendChild(counter);
  
  state.counters.set(textarea, counter);
  
  return counter;
}

function updateCounter(textarea) {
  if (!textarea) return;
  
  const counter = state.counters.get(textarea);
  if (!counter) return;
  
  const currentLength = textarea.value.length;
  const remaining = state.currentLimit - currentLength;
  const ratio = currentLength / state.currentLimit;
  
  if (remaining >= 0) {
    if (ratio >= CONFIG.DANGER_THRESHOLD) {
      counter.textContent = `⚠️ Solo ${remaining} caracteres restantes (Acadel está preocupado)`;
    } else if (ratio >= CONFIG.WARNING_THRESHOLD) {
      counter.textContent = `⚡ ${remaining} caracteres restantes (Acadel sugiere ir resumiendo)`;
    } else {
      counter.textContent = `✨ ${remaining} caracteres restantes`;
    }
  } else {
    counter.textContent = `🚫 Excedido por ${Math.abs(remaining)} caracteres (¡Acadel no puede procesar tanto!)`;
  }
  
  counter.classList.remove('warning', 'danger', 'limit-reached');
  textarea.classList.remove('limit-exceeded');
  
  const exceeds = remaining < 0;
  
  state.isExceeded = exceeds;
  
  if (exceeds) {
    counter.classList.add('limit-reached');
    textarea.classList.add('limit-exceeded');
    
    showAcadelLimitAlert();
  } else if (ratio >= CONFIG.DANGER_THRESHOLD) {
    counter.classList.add('danger');
  } else if (ratio >= CONFIG.WARNING_THRESHOLD) {
    counter.classList.add('warning');
  }
}

/**
 * Manejador de eventos para el textarea
 * @param {Event} e - Evento de input
 */
function handleTextareaInput(e) {
  const textarea = e.target;
  
  if (textarea._updateTimeout) {
    clearTimeout(textarea._updateTimeout);
  }
  
  // Programar actualización con delay
  textarea._updateTimeout = setTimeout(() => {
    updateCounter(textarea);
  }, CONFIG.UPDATE_DELAY);
}

/**
 * Inicializa el limitador de caracteres para un textarea
 * @param {HTMLTextAreaElement} textarea - Elemento a limitar
 * @param {Object} options - Opciones de configuración
 * @param {string} options.variant - Variante del chat (matematico, teorico, etc)
 * @param {number} options.limit - Límite personalizado (sobrescribe variante)
 */
export function initCharacterLimit(textarea, options = {}) {
  if (!textarea || (textarea.tagName !== 'TEXTAREA')) {
    console.warn('El elemento debe ser un textarea válido');
    return;
  }
  
  cleanupTextarea(textarea);
  
  if (options.limit && typeof options.limit === 'number') {
    state.currentLimit = options.limit;
  } else if (options.variant && CONFIG.VARIANT_LIMITS[options.variant]) {
    state.currentLimit = CONFIG.VARIANT_LIMITS[options.variant];
  } else {
    state.currentLimit = CONFIG.MAX_CHARS;
  }
  
  createCounter(textarea);
  
  textarea.addEventListener('input', handleTextareaInput);
  
  state.textareas.set(textarea, {
    options: options
  });
  
  // Actualización inicial
  updateCounter(textarea);
}

/**
 * Limpia los recursos de un textarea específico
 * @param {HTMLTextAreaElement} textarea - El textarea a limpiar
 */
function cleanupTextarea(textarea) {
  if (!textarea) return;
  
  textarea.removeEventListener('input', handleTextareaInput);
  
  if (textarea._updateTimeout) {
    clearTimeout(textarea._updateTimeout);
    delete textarea._updateTimeout;
  }
  
  textarea.classList.remove('limit-exceeded');
  
  const counter = state.counters.get(textarea);
  if (counter && counter.parentNode) {
    counter.parentNode.removeChild(counter);
  }
  
  state.counters.delete(textarea);
  state.textareas.delete(textarea);
}

/**
 * Verifica si el texto dado excede el límite configurado
 * @param {string} text - Texto a verificar
 * @returns {boolean} True si excede el límite
 */
export function exceedsLimit(text) {
  if (!text) return false;
  return text.length > state.currentLimit;
}

export function showLimitExceededAlert() {
  showAcadelLimitAlert();
}

/**
 * Oculta la alerta de límite excedido manualmente
 * Útil para cuando se cambia de chat o se cierra la aplicación
 */
export function hideLimitAlert() {
  hideAlert();
}

/**
 * Limpia todas las instancias del limitador (todos los textareas)
 */
export function cleanup() {
  hideAlert();
  if (state.alertElement && state.alertElement.parentNode) {
    state.alertElement.parentNode.removeChild(state.alertElement);
    state.alertElement = null;
  }
  
  state.textareas.forEach((_, textarea) => {
    cleanupTextarea(textarea);
  });
  
  state.textareas.clear();
  state.counters.clear();
}

export default {
  initCharacterLimit,
  exceedsLimit,
  showLimitExceededAlert,
  hideLimitAlert,
  cleanup
};