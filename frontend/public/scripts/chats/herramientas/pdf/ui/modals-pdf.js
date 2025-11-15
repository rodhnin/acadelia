/**
 * modals.js - Gestión centralizada de modales de la aplicación
 */

import { DOM_SELECTORS } from '../core/config-pdf.js';

// Registro centralizado de timeouts
const timeouts = new Map();

// Variable global para controlar si hay una modal abierta actualmente
let isModalOpen = false;

/**
 * Establece un timeout gestionado para evitar timeouts huérfanos
 */
function setManagedTimeout(callback, delay, key) {
  if (timeouts.has(key)) {
    clearTimeout(timeouts.get(key));
  }
  
  const id = setTimeout(() => {
    timeouts.delete(key);
    callback();
  }, delay);
  
  timeouts.set(key, id);
  return id;
}

/**
 * Muestra una modal de confirmación estática (usando el DOM existente).
 * @param {string} message - Mensaje de confirmación.
 * @returns {Promise<boolean>} Promise que se resuelve a true si se confirma, false si se cancela.
 */
export function showConfirmationModal(message) {
  // Si ya hay una modal abierta, no abrir otra
  if (isModalOpen) {
    console.warn('Ya hay una modal abierta. No se abrirá otra modal.');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const modal = document.getElementById(DOM_SELECTORS.modals.confirmationModal.substring(1));
    const modalMessage = document.getElementById(DOM_SELECTORS.modals.modalMessage.substring(1));
    const confirmBtn = document.getElementById(DOM_SELECTORS.modals.modalConfirm.substring(1));
    const cancelBtn = document.getElementById(DOM_SELECTORS.modals.modalCancel.substring(1));

    if (!modal || !modalMessage || !confirmBtn || !cancelBtn) {
      console.warn('Elementos de modal no encontrados, usando modal dinámico');
      // Si no encontramos el modal estático, usar versión dinámica
      return showDynamicConfirmModal(null, message).then(resolve);
    }

    modalMessage.textContent = message;
    modal.style.display = 'block';
    
    isModalOpen = true;

    function cleanup() {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      // Indicar que la modal se ha cerrado
      isModalOpen = false;
    }

    function onConfirm(e) {
      e.stopPropagation();
      cleanup();
      resolve(true);
    }

    function onCancel(e) {
      e.stopPropagation();
      cleanup();
      resolve(false);
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/**
 * Muestra un diálogo de confirmación dinámico con soporte para título.
 * @param {string} title - Título del diálogo
 * @param {string} message - Mensaje a mostrar
 * @returns {Promise<boolean>} Promise que se resuelve a true si se confirma, false si se cancela
 */
export function showDynamicConfirmModal(title, message) {
  // Si ya hay una modal abierta, no abrir otra
  if (isModalOpen) {
    console.warn('Ya hay una modal abierta. No se abrirá otra modal.');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    document.querySelectorAll('.custom-modal').forEach(existingModal => {
      if (existingModal && existingModal.parentNode) {
        existingModal.parentNode.removeChild(existingModal);
      }
    });
    
    isModalOpen = true;
    
    const modal = document.createElement('div');
    modal.className = 'custom-modal confirmation-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title || 'Confirmar'}</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary confirm-btn">Confirmar</button>
          <button class="btn btn-secondary cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Forzar reflow para asegurar que se apliquen los estilos
    void modal.offsetHeight;
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const confirmBtn = modal.querySelector('.confirm-btn');
    
    const closeModal = () => {
      modal.classList.remove('show');
      // Indicar que ya no hay modal abierta
      isModalOpen = false;
      
      setManagedTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300, 'close-modal');
    };
    
    // Eventos de botones
    closeBtn.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });
    
    cancelBtn.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });
    
    confirmBtn.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    
    const escKeyHandler = function(e) {
      if (e.key === 'Escape') {
        closeModal();
        resolve(false);
        document.removeEventListener('keydown', escKeyHandler);
      }
    };
    
    document.addEventListener('keydown', escKeyHandler);
  });
}

/**
 * ⭐ NUEVA FUNCIÓN: Modal especial de Acadel para copia manual
 * Muestra una modal académica para copiar texto manualmente cuando fallan los métodos automáticos
 * @param {string} text - Texto que se debe copiar manualmente
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} Promise que se resuelve cuando el usuario cierra la modal
 */
export function showAcadelManualCopyModal(text, options = {}) {
  // Si ya hay una modal abierta, no abrir otra
  if (isModalOpen) {
    console.warn('Ya hay una modal abierta. No se abrirá otra modal.');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    // Mensajes aleatorios del profesor Acadel
    const mensajesAcadel = [
      "¡No te preocupes! 🦫 El profesor Acadel preparó todo el contenido académico para ti",
      "🎓 ¡Perfecto! Acadel organizó la información de manera impecable para tu portapapeles",
      "📚 ¡Excelente! Tu chigüire académico favorito tiene todo listo para copiar",
      "🦫 ¡Fantástico! El profesor Acadel compiló toda la sabiduría en formato copiable",
      "✨ ¡Increíble! Acadel procesó cada detalle académico para facilitarte la copia"
    ];
    
    const mensajeElegido = mensajesAcadel[Math.floor(Math.random() * mensajesAcadel.length)];
    
    isModalOpen = true;
    
    const modal = document.createElement('div');
    modal.className = 'custom-modal acadel-copy-modal';
    
    const textareaId = 'acadel-copy-textarea-' + Date.now();
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🦫 Copia Manual Acadel</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="acadel-copy-intro">
            <div class="acadel-copy-avatar">🦫</div>
            <div class="acadel-copy-message">
              <p><strong>${mensajeElegido}</strong></p>
              <p class="acadel-copy-instructions">
                Simplemente selecciona todo el texto de abajo y usa <kbd>Ctrl+C</kbd> (o <kbd>Cmd+C</kbd> en Mac) para copiarlo. 
                ¡Acadel ya tiene todo perfectamente organizado! 📋✨
              </p>
            </div>
          </div>
          
          <div class="acadel-copy-content">
            <label for="${textareaId}" class="acadel-copy-label">
              📚 Contenido académico preparado por Acadel:
            </label>
            <textarea 
              id="${textareaId}"
              class="acadel-copy-textarea" 
              readonly 
              spellcheck="false"
              aria-label="Contenido para copiar manualmente"
            >${text}</textarea>
          </div>
          
          <div class="acadel-copy-tips">
            <div class="acadel-tip">
              <i class="bx bx-lightbulb"></i>
              <span><strong>Tip de Acadel:</strong> Haz triple clic para seleccionar todo el texto de una vez</span>
            </div>
            <div class="acadel-tip">
              <i class="bx bx-keyboard"></i>
              <span><strong>Atajo rápido:</strong> <kbd>Ctrl+A</kbd> (seleccionar todo) + <kbd>Ctrl+C</kbd> (copiar)</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary acadel-copy-got-it">¡Entendido, Acadel! 🦫</button>
          <button class="btn btn-secondary acadel-copy-select-all">Seleccionar Todo 📋</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    const closeBtn = modal.querySelector('.close-modal');
    const gotItBtn = modal.querySelector('.acadel-copy-got-it');
    const selectAllBtn = modal.querySelector('.acadel-copy-select-all');
    const textarea = modal.querySelector('.acadel-copy-textarea');
    
    const closeModal = () => {
      modal.classList.remove('show');
      // Indicar que ya no hay modal abierta
      isModalOpen = false;
      
      setManagedTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300, 'close-acadel-copy-modal');
    };
    
    // Auto-seleccionar el texto cuando se abre la modal
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
    
    // Eventos de botones
    closeBtn.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    
    gotItBtn.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    
    selectAllBtn.addEventListener('click', () => {
      if (textarea) {
        textarea.focus();
        textarea.select();
        
        // Feedback visual
        selectAllBtn.innerHTML = '<i class="bx bx-check"></i> ¡Seleccionado!';
        selectAllBtn.classList.add('selected');
        
        setTimeout(() => {
          selectAllBtn.innerHTML = 'Seleccionar Todo 📋';
          selectAllBtn.classList.remove('selected');
        }, 1500);
      }
    });
    
    const escKeyHandler = function(e) {
      if (e.key === 'Escape') {
        closeModal();
        resolve(true);
        document.removeEventListener('keydown', escKeyHandler);
      }
    };
    
    document.addEventListener('keydown', escKeyHandler);
    
    textarea.addEventListener('select', () => {
      if (textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length) {
        if (window.acadelInfo) {
          window.acadelInfo("🦫✨ ¡Perfecto!", "Acadel ve que seleccionaste todo el texto. ¡Ahora usa Ctrl+C para copiarlo!");
        }
      }
    });
  });
}

/**
 * Función unificada para mostrar confirmaciones, soportando tanto la API original
 * como la API con callbacks.
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje a mostrar
 * @param {Function} onConfirm - Callback para confirmación (opcional)
 * @param {Function} onCancel - Callback para cancelación (opcional)
 * @returns {Promise<boolean>} Promise que se resuelve con la respuesta (si no se proporcionan callbacks)
 */
export async function showConfirmation(title, message, onConfirm, onCancel) {
  // Si ya hay una modal abierta, no abrir otra
  if (isModalOpen) {
    console.warn('Ya hay una modal abierta. No se abrirá otra modal.');
    return false;
  }

  // Si se proporcionan callbacks, usar el patrón de callbacks
  if (typeof onConfirm === 'function' || typeof onCancel === 'function') {
    return showDynamicConfirmModal(title, message).then(confirmed => {
      if (confirmed && onConfirm) {
        onConfirm();
      } else if (!confirmed && onCancel) {
        onCancel();
      }
      return confirmed;
    });
  }
  
  // Si no hay callbacks, devolver la promesa directamente
  return showDynamicConfirmModal(title, message);
}

/**
 * Muestra la modal de chat vacío.
 * @param {string} message - Mensaje opcional para mostrar en la modal
 */
export function showEmptyChatModal(message = null) {
  // Si ya hay una modal abierta, no abrir otra
  if (isModalOpen) {
    console.warn('Ya hay una modal abierta. No se abrirá otra modal.');
    return;
  }

  const modal = document.getElementById(DOM_SELECTORS.modals.emptyChatModal.substring(1));
  
  if (!modal) {
    return;
  }
  
  isModalOpen = true;
  
  // Si se proporciona un mensaje personalizado, actualizarlo
  if (message) {
    const contentElement = modal.querySelector('.modal-content p');
    if (contentElement) {
      contentElement.textContent = message;
    }
  }
  
  modal.style.display = 'block';
}

/**
 * Cierra la modal de chat vacío.
 */
export function closeEmptyChatModal() {
  const modal = document.getElementById(DOM_SELECTORS.modals.emptyChatModal.substring(1));
  
  if (modal) {
    modal.style.display = 'none';
    // Indicar que ya no hay modal abierta
    isModalOpen = false;
  }
}

/**
 * Fuerza el cierre de cualquier modal abierta.
 * Útil para limpiar el estado en cambios de contexto como cambio de chat.
 */
export function closeAllModals() {
  const staticModals = document.querySelectorAll('.modal');
  staticModals.forEach(modal => {
    modal.style.display = 'none';
  });
  
  const dynamicModals = document.querySelectorAll('.custom-modal');
  dynamicModals.forEach(modal => {
    modal.classList.remove('show');
    setManagedTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300, 'close-all-modals');
  });
  
  isModalOpen = false;
}

/**
 * Verifica si hay alguna modal abierta actualmente.
 * @returns {boolean} true si hay una modal abierta, false en caso contrario
 */
export function isAnyModalOpen() {
  return isModalOpen;
}

/**
 * Configura los listeners de las modales
 */
export function setupModalListeners() {
  const emptyModalClose = document.getElementById(DOM_SELECTORS.modals.emptyModalClose.substring(1));
  const emptyChatModal = document.getElementById(DOM_SELECTORS.modals.emptyChatModal.substring(1));
  
  if (emptyModalClose) {
    emptyModalClose.addEventListener('click', closeEmptyChatModal);
  }
  
  if (emptyChatModal) {
    emptyChatModal.addEventListener('click', (e) => {
      if (e.target === emptyChatModal) {
        closeEmptyChatModal();
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeAllModals();
    }
  });
}

export default {
  showConfirmationModal,
  showDynamicConfirmModal,
  showAcadelManualCopyModal,  // ⭐ NUEVA EXPORTACIÓN
  showConfirmation,
  showEmptyChatModal,
  closeEmptyChatModal,
  closeAllModals,
  isAnyModalOpen,
  setupModalListeners
};