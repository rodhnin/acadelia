// modalManager.js - Gestión centralizada de modales CON RESET AL CERRAR
// Configurar los modales de la aplicación
export function setupModalManager() {
  // Obtener todos los modales
  const modals = document.querySelectorAll('.modal');
  
  // Configurar botones de cierre para cada modal
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      // Obtener el modal padre
      const modal = button.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    });
  });
  
  // Cerrar modal al hacer clic fuera del contenido
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      // Si el clic fue directamente en el fondo del modal (no en su contenido)
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
  
  // Cerrar con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Cerrar el modal activo (si hay alguno)
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        closeModal(activeModal);
      }
    }
  });
  
  // Exponer funciones para uso global
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.refreshModalContent = refreshModalContent;
  
  console.log('✅ Modal Manager configurado con reset automático');
}

// Abrir un modal específico
export function openModal(modalIdOrElement) {
  let modal;
  
  if (typeof modalIdOrElement === 'string') {
    modal = document.getElementById(modalIdOrElement);
  } else {
    modal = modalIdOrElement;
  }
  
  if (!modal) {
    console.error(`Modal no encontrado: ${modalIdOrElement}`);
    return;
  }
  
  // Cerrar cualquier otro modal abierto
  document.querySelectorAll('.modal.active').forEach(openModal => {
    if (openModal !== modal) {
      closeModal(openModal);
    }
  });
  
  // Añadir clase active para mostrar el modal
  modal.classList.add('active');
  
  // Deshabilitar scroll del body
  document.body.style.overflow = 'hidden';
  
  // Disparar evento personalizado
  modal.dispatchEvent(new CustomEvent('modal:open'));
  
  console.log(`📖 Modal abierta: ${modal.id}`);
  return modal;
}

// 🆕 CERRAR MODAL CON RESET AUTOMÁTICO
export function closeModal(modalIdOrElement) {
  let modal;
  
  if (typeof modalIdOrElement === 'string') {
    modal = document.getElementById(modalIdOrElement);
  } else {
    modal = modalIdOrElement;
  }
  
  if (!modal || !modal.classList.contains('active')) {
    return;
  }
  
  console.log(`📕 Cerrando modal: ${modal.id}`);
  
  // Quitar clase active para ocultar el modal
  modal.classList.remove('active');
  
  // Restaurar scroll del body si no hay otros modales abiertos
  if (document.querySelectorAll('.modal.active').length === 0) {
    document.body.style.overflow = '';
  }
  
  // Disparar evento personalizado
  modal.dispatchEvent(new CustomEvent('modal:close'));
  
  // 🆕 RESET AUTOMÁTICO AL CERRAR (opcional pero recomendado)
  const modalId = modal.id;
  if (modalId) {
    const modalType = modalId.replace('Modal', '').toLowerCase();
    
    // Aplicar reset después de la animación de cierre
    setTimeout(() => {
      if (window.resetModalState && typeof window.resetModalState === 'function') {
        console.log(`🔄 Aplicando reset post-cierre para: ${modalType}`);
        try {
          window.resetModalState(modalType);
        } catch (resetError) {
          console.warn(`⚠️ Error en reset post-cierre de ${modalType}:`, resetError);
        }
      }
    }, 300); // Después de la animación de cierre CSS
  }
  
  return modal;
}

// Actualizar el contenido de un modal
export function refreshModalContent(modalId, content) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const modalBody = modal.querySelector('.modal-body');
  if (modalBody) {
    // Si content es un string, establecerlo como innerHTML
    if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } 
    // Si content es un elemento del DOM, reemplazar el contenido
    else if (content instanceof Element) {
      modalBody.innerHTML = '';
      modalBody.appendChild(content);
    } 
    // Si content es una función, ejecutarla con modalBody como argumento
    else if (typeof content === 'function') {
      content(modalBody);
    }
  }
  
  return modal;
}

// Crear un modal dinámicamente
export function createDynamicModal({ id, title, content, footerButtons = [] }) {
  // Verificar si ya existe un modal con ese ID
  let modal = document.getElementById(id);
  
  if (modal) {
    // Si existe, actualizar su contenido
    const titleEl = modal.querySelector('.modal-header h2');
    if (titleEl) {
      titleEl.textContent = title;
    }
    
    refreshModalContent(id, content);
  } else {
    // Crear estructura del modal
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    
    // Estructura interna
    const modalHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${typeof content === 'string' ? content : ''}
        </div>
        ${footerButtons.length > 0 ? `
          <div class="modal-footer">
            ${footerButtons.map(btn => `
              <button class="${btn.class || ''}" id="${btn.id || ''}">${btn.text}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    modal.innerHTML = modalHTML;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    
    // Si content es un elemento DOM o una función, procesarlo
    if (typeof content !== 'string') {
      refreshModalContent(id, content);
    }
    
    // Configurar botón de cierre
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(modal));
    }
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
    
    // Configurar botones del footer
    footerButtons.forEach(btnConfig => {
      if (btnConfig.id) {
        const btn = modal.querySelector(`#${btnConfig.id}`);
        if (btn && btnConfig.onClick) {
          btn.addEventListener('click', (e) => btnConfig.onClick(e, modal));
        }
      }
    });
  }
  
  return modal;
}

// Funciones auxiliares para modales comunes

// Modal de confirmación
export function showConfirmModal(message, onConfirm, onCancel) {
  return new Promise((resolve) => {
    const id = 'confirm-modal-' + Date.now();
    
    const modal = createDynamicModal({
      id,
      title: 'Confirmar',
      content: `<p>${message}</p>`,
      footerButtons: [
        {
          id: `${id}-confirm`,
          text: 'Confirmar',
          class: 'btn-primary',
          onClick: (e, modal) => {
            closeModal(modal);
            if (onConfirm) onConfirm();
            resolve(true);
          }
        },
        {
          id: `${id}-cancel`,
          text: 'Cancelar',
          class: 'btn-secondary',
          onClick: (e, modal) => {
            closeModal(modal);
            if (onCancel) onCancel();
            resolve(false);
          }
        }
      ]
    });
    
    openModal(modal);
  });
}

// Modal de alerta
export function showAlertModal(message, title = 'Aviso') {
  return new Promise((resolve) => {
    const id = 'alert-modal-' + Date.now();
    
    const modal = createDynamicModal({
      id,
      title,
      content: `<p>${message}</p>`,
      footerButtons: [
        {
          id: `${id}-ok`,
          text: 'Aceptar',
          class: 'btn-primary',
          onClick: (e, modal) => {
            closeModal(modal);
            resolve();
          }
        }
      ]
    });
    
    openModal(modal);
  });
}

// 🆕 FUNCIÓN PARA RESETEAR MODAL MANUALMENTE
export function resetModal(modalIdOrElement) {
  let modal;
  
  if (typeof modalIdOrElement === 'string') {
    modal = document.getElementById(modalIdOrElement);
  } else {
    modal = modalIdOrElement;
  }
  
  if (!modal) {
    console.warn(`No se puede resetear modal: ${modalIdOrElement}`);
    return;
  }
  
  const modalId = modal.id;
  if (modalId) {
    const modalType = modalId.replace('Modal', '').toLowerCase();
    
    if (window.resetModalState && typeof window.resetModalState === 'function') {
      console.log(`🔄 Reset manual de modal: ${modalType}`);
      try {
        window.resetModalState(modalType);
      } catch (resetError) {
        console.warn(`⚠️ Error en reset manual de ${modalType}:`, resetError);
      }
    } else {
      console.warn('⚠️ Función resetModalState no disponible');
    }
  }
  
  return modal;
}

// Exportar funciones públicas
export default {
  setupModalManager,
  openModal,
  closeModal,
  refreshModalContent,
  createDynamicModal,
  showConfirmModal,
  showAlertModal,
  resetModal
};