/**
 * Gestor de la interfaz de usuario del panel
 * Maneja cambios de sección, actualizaciones de UI y mensajes
 */
export class UiManager {
    constructor() {
      this.currentSection = null;
      this.isSidebarVisible = window.innerWidth >= 992;
      this.modals = {};
      this.tooltips = [];
      
      this.notifications = []; // Array simple para almacenar todas las notificaciones
      this.maxVisibleNotifications = 4;
      this.notificationContainer = null;
    }
    
    /**
     * Inicializa el gestor de UI
     */
    init() {
      console.log('Inicializando gestor de UI');
      
      // Referencias a elementos principales
      this.sidebar = document.getElementById('sidebar');
      this.mainContent = document.getElementById('main-content');
      this.contentBackdrop = document.getElementById('content-backdrop');
      
      this.initNotifications();
      
      this.initModals();
      
      this.initTooltips();
      
      // Estado inicial según tamaño de pantalla
      this.handleResize();
    }
    
    /**
     * Inicializa el contenedor de notificaciones
     */
    initNotifications() {
      if (!document.getElementById('notifications-container')) {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notifications-container';
        this.notificationContainer.className = 'notifications-container';
        document.body.appendChild(this.notificationContainer);
      } else {
        this.notificationContainer = document.getElementById('notifications-container');
      }
    }
    
    /**
     * Inicializa modales de Bootstrap
     */
    initModals() {
      document.querySelectorAll('.modal').forEach(modalEl => {
        const modalId = modalEl.id;
        this.modals[modalId] = new bootstrap.Modal(modalEl);
      });
    }
    
    /**
     * Inicializa tooltips para elementos con data-bs-toggle="tooltip"
     */
    initTooltips() {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      this.tooltips = [...tooltipTriggerList].map(tooltipTriggerEl => {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }
    
    /**
     * Muestra una sección específica y oculta las demás
     * @param {string} sectionId - ID de la sección a mostrar
     */
    showSection(sectionId) {
      if (!sectionId) return;
      
      const sections = document.querySelectorAll('.content-section');
      sections.forEach(section => {
        section.classList.remove('active');
      });
      
      const targetSection = document.getElementById(`${sectionId}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
        this.currentSection = sectionId;
        
        this.updatePageTitle(sectionId);
        
        this.updateNavigation(sectionId);
        
        this.dispatchSectionChangeEvent(sectionId);
        
        console.log(`Sección cambiada a: ${sectionId}`);
      } else {
        console.error(`Sección no encontrada: ${sectionId}`);
      }
    }
    
    /**
     * Actualiza el título de la página según la sección
     * @param {string} sectionId - ID de la sección activa
     */
    updatePageTitle(sectionId) {
      const titleMap = {
        dashboard: 'Panel de Administración Financiera',
        subscriptions: 'Gestión de Suscripciones',
        transactions: 'Historial de Transacciones',
        users: 'Gestión de Usuarios',
        reports: 'Informes Financieros',
        taxes: 'Gestión de Impuestos',
        analytics: 'Análisis Financiero',
        settings: 'Configuración'
      };
      
      const pageTitle = document.querySelector('.page-title');
      if (pageTitle && titleMap[sectionId]) {
        pageTitle.textContent = titleMap[sectionId];
      }
    }
    
    /**
     * Actualiza la navegación para marcar el enlace activo
     * @param {string} sectionId - ID de la sección activa
     */
    updateNavigation(sectionId) {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        const linkSection = link.getAttribute('data-section');
        if (linkSection === sectionId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
    
    /**
     * Dispara un evento personalizado al cambiar de sección
     * @param {string} sectionId - ID de la sección activa
     */
    dispatchSectionChangeEvent(sectionId) {
      const event = new CustomEvent('sectionChanged', {
        detail: {
          section: sectionId,
          timestamp: new Date()
        }
      });
      document.dispatchEvent(event);
    }

    /**
     * Muestra un indicador de carga durante operaciones asíncronas
     * @param {string} message - Mensaje a mostrar
     */
    showLoading(message = 'Cargando...') {
      // Eliminamos cualquier spinner existente antes de crear uno nuevo
      this.hideLoading();
      
      const spinnerHTML = `
        <div class="spinner-overlay" id="spinner-overlay">
          <div class="spinner-container">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mb-0" id="loadingMessage">${message}</p>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', spinnerHTML);
      
      // Asegurar que tiene un z-index más alto que cualquier modal
      const spinnerOverlay = document.getElementById('spinner-overlay');
      if (spinnerOverlay) {
        spinnerOverlay.style.zIndex = '9999'; // Más alto que los modals de Bootstrap (1050)
      }
    }
    
    /**
     * Alterna la visibilidad del sidebar
     * @param {boolean|undefined} show - Si debe mostrarse (undefined para alternar)
     */
    toggleSidebar(show) {
      const isVisible = show === undefined ? !this.isSidebarVisible : show;
      
      if (isVisible) {
        this.sidebar.classList.add('expanded');
        this.contentBackdrop.classList.add('show');
      } else {
        this.sidebar.classList.remove('expanded');
        this.contentBackdrop.classList.remove('show');
      }
      
      this.isSidebarVisible = isVisible;
    }

    /**
    * Oculta el indicador de carga
    */
    hideLoading() {
      const spinnerOverlay = document.getElementById('spinner-overlay');
      if (spinnerOverlay) {
        spinnerOverlay.remove();
      }
    }

    /**
     * Añade un botón de reinicio de filtros a un contenedor de filtros
     * @param {string} containerId - ID del contenedor donde se añadirá el botón
     * @param {string} btnId - ID para el nuevo botón
     * @param {Function} resetCallback - Función a ejecutar cuando se haga clic en el botón
     * @param {string} targetSelector - Selector del elemento después del cual insertar el botón
     * @returns {HTMLElement} - El botón creado
     */
    addResetFiltersButton(containerId, btnId, resetCallback, targetSelector = '#apply-user-filters, #apply-transaction-filters, #apply-expense-filters') {
      if (document.getElementById(btnId)) {
        return document.getElementById(btnId);
      }
      
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Contenedor no encontrado: ${containerId}`);
        return null;
      }
      
      // Encontrar el elemento después del cual insertar el botón
      const targetElement = container.querySelector(targetSelector);
      if (!targetElement) {
        console.error(`Elemento objetivo no encontrado: ${targetSelector}`);
        return null;
      }
      
      const resetButton = document.createElement('button');
      resetButton.className = 'btn btn-outline-secondary ms-2';
      resetButton.id = btnId;
      resetButton.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i> Reiniciar';
      
      resetButton.addEventListener('click', resetCallback);
      
      targetElement.parentNode.insertBefore(resetButton, targetElement.nextSibling);
      
      return resetButton;
    }

    /**
     * Actualiza el estado visual del botón de reinicio según si hay filtros activos
     * @param {string} btnId - ID del botón de reinicio
     * @param {boolean} hasActiveFilters - Si hay filtros activos
     * @param {Object} options - Opciones adicionales de visualización
     */
    updateResetButtonState(btnId, hasActiveFilters, options = {}) {
      const resetButton = document.getElementById(btnId);
      if (!resetButton) return;
      
      if (hasActiveFilters) {
        resetButton.classList.remove('btn-outline-secondary');
        resetButton.classList.add('btn-secondary');
        
        // Si se especifica una etiqueta de filtro específico
        if (options.filterLabel) {
          let badge = document.getElementById(`${btnId}-badge`);
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge bg-info ms-1';
            badge.id = `${btnId}-badge`;
            resetButton.appendChild(badge);
          }
          badge.textContent = options.filterLabel;
        }
      } else {
        resetButton.classList.add('btn-outline-secondary');
        resetButton.classList.remove('btn-secondary');
        
        const badge = document.getElementById(`${btnId}-badge`);
        if (badge) {
          badge.remove();
        }
      }
    }
    
    /**
     * Maneja el redimensionamiento de la ventana
     */
    handleResize() {
      const isMobile = window.innerWidth < 992;
      
      if (isMobile && this.isSidebarVisible) {
        // En móvil, ocultar automáticamente
        this.toggleSidebar(false);
      }
    }

    /**
     * Crea y muestra una nueva notificación
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     * @param {string} title - Título de la notificación
     * @param {string} message - Mensaje de la notificación
     * @param {string} icon - Clase del icono
     * @param {number} duration - Duración en milisegundos
     */
    createNotification(type, title, message, icon, duration) {
      // Asegurar que el contenedor existe
      if (!this.notificationContainer) {
        this.initNotifications();
      }
      
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.setAttribute('role', 'alert');
      
      // Estructura interna
      notification.innerHTML = `
        <div class="notification-header">
          <h5 class="notification-title">
            <i class="bi ${icon}"></i>
            ${title}
          </h5>
          <button type="button" class="notification-close" aria-label="Cerrar">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="notification-body">
          ${message}
        </div>
        <div class="notification-progress">
          <div class="notification-progress-bar" style="animation-duration: ${duration}ms"></div>
        </div>
      `;
      
      this.notificationContainer.appendChild(notification);
      
      const notificationObj = {
        element: notification,
        timer: null,
        visible: false,
        removing: false
      };
      
      this.notifications.push(notificationObj);
      
      const closeButton = notification.querySelector('.notification-close');
      closeButton.addEventListener('click', () => {
        this.closeNotification(notificationObj);
      });
      
      // Auto-eliminar después del tiempo especificado
      notificationObj.timer = setTimeout(() => {
        this.closeNotification(notificationObj);
      }, duration);
      
      notification.addEventListener('mouseenter', () => {
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar && !notificationObj.removing) {
          progressBar.style.animationPlayState = 'paused';
          if (notificationObj.timer) {
            clearTimeout(notificationObj.timer);
            notificationObj.timer = null;
          }
        }
      });
      
      notification.addEventListener('mouseleave', () => {
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar && !notificationObj.removing) {
          progressBar.style.animationPlayState = 'running';
          
          // Estimar tiempo restante aproximado
          const remainingTime = Math.max(500, duration / 2); // Simplificado, usamos la mitad o 500ms mínimo
          
          notificationObj.timer = setTimeout(() => {
            this.closeNotification(notificationObj);
          }, remainingTime);
        }
      });
      
      this.updateNotificationsDisplay();
    }

    /**
     * Actualiza qué notificaciones se muestran según la capacidad máxima
     */
    updateNotificationsDisplay() {
      const visibleCount = this.notifications.filter(n => n.visible).length;
      
      // Si podemos mostrar más notificaciones
      if (visibleCount < this.maxVisibleNotifications) {
        const pendingNotifications = this.notifications.filter(n => !n.visible && !n.removing);
        
        const showCount = Math.min(this.maxVisibleNotifications - visibleCount, pendingNotifications.length);
        
        for (let i = 0; i < showCount; i++) {
          const notification = pendingNotifications[i];
          
          // Forzar un reflow para asegurar la transición
          void notification.element.offsetWidth;
          
          notification.visible = true;
          notification.element.classList.add('show');
        }
      }
    }

    /**
     * Inicia el proceso de cierre de una notificación
     * @param {Object} notification - Objeto de notificación a cerrar
     */
    closeNotification(notification) {
      if (notification.removing) return; // Evitar duplicados
      
      notification.removing = true;
      
      if (notification.timer) {
        clearTimeout(notification.timer);
        notification.timer = null;
      }
      
      notification.element.classList.remove('show');
      notification.element.classList.add('hide');
      
      notification.visible = false;
      
      setTimeout(() => {
        this.removeNotification(notification);
      }, 400); // Duración de la transición CSS
    }
    
    /**
     * Muestra un mensaje de error al usuario
     * @param {string} title - Título del mensaje
     * @param {string} message - Contenido del mensaje
     * @param {number} duration - Duración en ms (por defecto 8000ms)
     */
      showErrorMessage(title, message, duration = 8000) {
        this.createNotification('error', title, message, 'bi-exclamation-triangle-fill', duration);
        console.error(`${title}: ${message}`);
      }
    
    /**
     * Muestra un mensaje de éxito al usuario
     * @param {string} message - Contenido del mensaje
     * @param {string} title - Título del mensaje (opcional)
     * @param {number} duration - Duración en ms (por defecto 5000ms)
     */
    showSuccessMessage(message, title = 'Operación exitosa', duration = 5000) {
      this.createNotification('success', title, message, 'bi-check-circle-fill', duration);
    }
    
    /**
     * Muestra un mensaje de advertencia al usuario
     * @param {string} message - Contenido del mensaje
     * @param {string} title - Título del mensaje
     * @param {number} duration - Duración en ms (por defecto 7000ms)
     */
    showWarningMessage(message, title = 'Advertencia', duration = 7000) {
      this.createNotification('warning', title, message, 'bi-exclamation-circle-fill', duration);
    }
    
    /**
     * Muestra un mensaje informativo al usuario
     * @param {string} message - Contenido del mensaje
     * @param {string} title - Título del mensaje
     * @param {number} duration - Duración en ms (por defecto 6000ms)
     */
    showInfoMessage(message, title = 'Información', duration = 6000) {
      this.createNotification('info', title, message, 'bi-info-circle-fill', duration);
    }
    
    /**
     * Método central para mostrar notificaciones
     * @param {Object} options - Opciones de la notificación
     */
    showNotification(options) {
      // Asegurarse de que el contenedor existe
      if (!this.notificationContainer) {
        this.initNotifications();
      }
      
      const notification = document.createElement('div');
      notification.className = `notification notification-${options.type}`;
      notification.setAttribute('role', 'alert');
      
      // Estructura interna
      notification.innerHTML = `
        <div class="notification-header">
          <h5 class="notification-title">
            <i class="bi ${options.icon}"></i>
            ${options.title}
          </h5>
          <button type="button" class="notification-close" aria-label="Cerrar">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="notification-body">
          ${options.message}
        </div>
        <div class="notification-progress">
          <div class="notification-progress-bar" style="animation-duration: ${options.duration}ms"></div>
        </div>
      `;
      
      this.notificationContainer.appendChild(notification);
      
      const closeButton = notification.querySelector('.notification-close');
      closeButton.addEventListener('click', () => this.removeNotification(notification));
      
      this.notificationQueue.push({
        element: notification,
        timer: null
      });
      
      this.processNotificationQueue();
      
      // Auto-eliminar después del tiempo especificado
      const timer = setTimeout(() => {
        this.removeNotification(notification);
      }, options.duration);
      
      notification.dataset.timerId = this.notificationQueue.length - 1;
      this.notificationQueue[this.notificationQueue.length - 1].timer = timer;
      
      notification.addEventListener('mouseenter', () => {
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar) {
          const computedStyle = window.getComputedStyle(progressBar);
          const animationName = computedStyle.animationName;
          
          if (animationName !== 'none') {
            progressBar.style.animationPlayState = 'paused';
            
            clearTimeout(this.notificationQueue[notification.dataset.timerId].timer);
          }
        }
      });
      
      notification.addEventListener('mouseleave', () => {
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar) {
          progressBar.style.animationPlayState = 'running';
          
          const computedStyle = window.getComputedStyle(progressBar);
          const width = parseFloat(computedStyle.width);
          const totalWidth = parseFloat(window.getComputedStyle(notification.querySelector('.notification-progress')).width);
          const timeRemaining = (width / totalWidth) * options.duration;
          
          const newTimer = setTimeout(() => {
            this.removeNotification(notification);
          }, timeRemaining);
          
          this.notificationQueue[notification.dataset.timerId].timer = newTimer;
        }
      });
    }
    
    /**
     * Procesa la cola de notificaciones para mostrar
     * las que quepan según el límite establecido
     */
    processNotificationQueue() {
      const visibleCount = this.notificationContainer.querySelectorAll('.notification.show').length;
      
      const availableSlots = this.maxNotifications - visibleCount;
      
      const pendingNotifications = this.notificationQueue.filter(item => 
        !item.element.classList.contains('show') && 
        !item.element.classList.contains('hide')
      );
      
      pendingNotifications.slice(0, availableSlots).forEach(item => {
        // Forzar un reflow para asegurar la transición
        void item.element.offsetWidth;
        
        item.element.classList.add('show');
      });
    }
    
    /**
     * Elimina una notificación con animación
     * @param {HTMLElement} notification - Elemento de notificación a eliminar
     */
    removeNotification(notification) {
      if (notification.element && notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      
      const index = this.notifications.indexOf(notification);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
      
      this.updateNotificationsDisplay();
    }
    
    /**
     * Actualiza datos en una tabla
     * @param {string} tableId - ID de la tabla
     * @param {Array} data - Datos a mostrar
     * @param {Function} rowRenderer - Función para renderizar cada fila
     * @param {string} emptyMessage - Mensaje cuando no hay datos
     */
    updateTable(tableId, data, rowRenderer, emptyMessage = 'No hay datos disponibles') {
      const tableBody = document.getElementById(tableId);
      if (!tableBody) {
        console.error(`Tabla no encontrada: ${tableId}`);
        return;
      }
      
      tableBody.innerHTML = '';
      
      // Si no hay datos, mostrar mensaje
      if (!data || data.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="100%" class="text-center">${emptyMessage}</td>`;
        tableBody.appendChild(emptyRow);
        return;
      }
      
      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = rowRenderer(item);
        tableBody.appendChild(row);
      });
    }
    
    /**
     * Actualiza información de paginación
     * @param {string} prefix - Prefijo de los elementos de paginación
     * @param {number} start - Índice de inicio
     * @param {number} end - Índice de fin
     * @param {number} total - Total de elementos
     */
    updatePagination(prefix, start, end, total) {
      const startEl = document.getElementById(`${prefix}-pagination-start`);
      const endEl = document.getElementById(`${prefix}-pagination-end`);
      const totalEl = document.getElementById(`${prefix}-pagination-total`);
      
      if (startEl) startEl.textContent = start;
      if (endEl) endEl.textContent = end;
      if (totalEl) totalEl.textContent = total;
      
      const prevBtn = document.getElementById(`${prefix}-prev-page`);
      const nextBtn = document.getElementById(`${prefix}-next-page`);
      
      if (prevBtn) prevBtn.disabled = start <= 1;
      if (nextBtn) nextBtn.disabled = end >= total;
    }
    
    /**
     * Muestra un modal
     * @param {string} modalId - ID del modal a mostrar
     */
    showModal(modalId) {
      if (this.modals[modalId]) {
        this.modals[modalId].show();
      } else {
        console.error(`Modal no encontrado: ${modalId}`);
      }
    }
    
    /**
     * Oculta un modal
     * @param {string} modalId - ID del modal a ocultar
     */
    hideModal(modalId) {
      if (this.modals[modalId]) {
        this.modals[modalId].hide();
      }
    }
    
    /**
     * Configura un modal con datos específicos
     * @param {string} modalId - ID del modal
     * @param {Object} data - Datos para configurar el modal
     */
    setupModal(modalId, data) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      
      if (data.title) {
        const titleEl = modal.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = data.title;
      }
      
      if (data.fields) {
        Object.keys(data.fields).forEach(fieldId => {
          const field = modal.querySelector(`#${fieldId}`);
          if (field) {
            field.value = data.fields[fieldId];
          }
        });
      }
      
      if (data.callbacks) {
        Object.keys(data.callbacks).forEach(buttonId => {
          const button = modal.querySelector(`#${buttonId}`);
          if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', data.callbacks[buttonId]);
          }
        });
      }
    }
    
    /**
     * Actualiza el contenido de un elemento HTML
     * @param {string} elementId - ID del elemento
     * @param {string|number} content - Contenido a establecer
     */
    updateElement(elementId, content) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = content;
      }
    }
    
    /**
     * Actualiza el valor de un campo de formulario
     * @param {string} elementId - ID del elemento
     * @param {string|number} value - Valor a establecer
     */
    updateFormField(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.value = value;
      }
    }
    
    /**
     * Activa o desactiva un campo de formulario
     * @param {string} elementId - ID del elemento
     * @param {boolean} disabled - Si debe estar desactivado
     */
    setFieldDisabled(elementId, disabled) {
      const element = document.getElementById(elementId);
      if (element) {
        element.disabled = disabled;
      }
    }
    
    /**
     * Muestra o oculta un elemento
     * @param {string} elementId - ID del elemento
     * @param {boolean} visible - Si debe estar visible
     */
    toggleElementVisibility(elementId, visible) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = visible ? '' : 'none';
      }
    }
    
    /**
     * Crea dinámicamente elementos de opciones para un select
     * @param {string} selectId - ID del elemento select
     * @param {Array} options - Array de opciones {value, text}
     * @param {boolean} clearPrevious - Si debe limpiar opciones previas
     */
    populateSelect(selectId, options, clearPrevious = true) {
      const select = document.getElementById(selectId);
      if (!select) return;
      
      // Mantener primera opción (placeholder) si existe
      const firstOption = select.querySelector('option:first-child');
      
      if (clearPrevious) {
        select.innerHTML = '';
        if (firstOption) {
          select.appendChild(firstOption);
        }
      }
      
      options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        select.appendChild(optionEl);
      });
    }
  }