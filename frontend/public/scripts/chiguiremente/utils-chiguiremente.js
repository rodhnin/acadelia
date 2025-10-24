// Utilidades y funciones compartidas

/**
 * Configuración del tema claro/oscuro
 * @param {Function} callback - Función callback opcional para ejecutar después del cambio de tema
 */
export function setupThemeToggle(callback = null) {
    const themeToggle = document.getElementById('theme-toggle');
    const userAvatar = document.getElementById('user-avatar');
    const loaderImage = document.getElementById('loader-gif');
    const mainLogo = document.getElementById('main-logo');
    
    // Verificar que los elementos existen antes de continuar
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }
    
    // Comprobar preferencia guardada
    const savedTheme = localStorage.getItem('theme');
    
    // Función para aplicar tema
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            if (themeToggle) themeToggle.innerHTML = '<i class="bx bx-sun"></i>';
            if (userAvatar) userAvatar.src = '/images/Perfil_oscuro.gif';
            if (loaderImage) loaderImage.src = '/images/Pensando_oscuro.gif';
            if (mainLogo) mainLogo.src = '/images/Imagotipo-Negativo.webp';
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            if (themeToggle) themeToggle.innerHTML = '<i class="bx bx-moon"></i>';
            if (userAvatar) userAvatar.src = '/images/Perfil_claro.gif';
            if (loaderImage) loaderImage.src = '/images/Pensando_claro.gif';
            if (mainLogo) mainLogo.src = '/images/Imagotipo.webp';
        }
        
        // Ejecutar callback si existe
        if (typeof callback === 'function') {
            callback();
        }
    }
    
    // Aplicar tema según la preferencia guardada o según la preferencia del sistema
    const shouldUseDarkTheme = savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    applyTheme(shouldUseDarkTheme);
    
    // Cambiar tema al hacer clic en el botón
    themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-theme');
        
        if (isCurrentlyLight) {
            applyTheme(true);
            localStorage.setItem('theme', 'dark');
        } else {
            applyTheme(false);
            localStorage.setItem('theme', 'light');
        }
    });
}

/**
 * Configuración del loader inicial
 */
export function setupLoader() {
    // Ocultar loader cuando todo esté cargado
    window.addEventListener('load', () => {
        const loader = document.getElementById('app-loader');
        
        if (!loader) return;
        
        // Agregar transición de salida
        loader.style.opacity = '0';
        
        // Eliminar loader después de la transición
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    });
}

/**
 * Sistema de notificaciones
 * @param {Object} options - Opciones de notificación
 * @param {string} options.title - Título de la notificación
 * @param {string} options.message - Mensaje de la notificación
 * @param {string} options.type - Tipo de notificación (success, error, warning, info)
 * @param {number} options.duration - Duración en milisegundos (0 para no desaparecer)
 */
export function showNotification({ title, message, type = 'info', duration = 4000 }) {
    const container = document.getElementById('notification-container');
    
    if (!container) {
        console.warn('Notification container not found');
        return null;
    }
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Icono según tipo
    let icon;
    switch (type) {
        case 'success':
            icon = 'bx-check-circle';
            break;
        case 'error':
            icon = 'bx-error-circle';
            break;
        case 'warning':
            icon = 'bx-error';
            break;
        default:
            icon = 'bx-info-circle';
    }
    
    // Estructura interna - Usar textContent para evitar inyección XSS
    const notificationHTML = `
        <i class='bx ${icon}'></i>
        <div class="notification-content">
            <div class="notification-title"></div>
            <div class="notification-message"></div>
        </div>
        <button class="notification-close">
            <i class='bx bx-x'></i>
        </button>
    `;
    
    notification.innerHTML = notificationHTML;
    
    // Establecer contenido de forma segura
    const titleElement = notification.querySelector('.notification-title');
    const messageElement = notification.querySelector('.notification-message');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    // Agregar al contenedor
    container.appendChild(notification);
    
    // Configurar botón de cierre
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            closeNotification(notification);
        });
    }
    
    // Auto cerrar después de la duración
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }
    
    return notification;
}

/**
 * Cerrar notificación con animación
 * @param {HTMLElement} notification - Elemento de notificación a cerrar
 */
function closeNotification(notification) {
    if (!notification) return;
    
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 300);
}

/**
 * Configuración del modal de confirmación
 */
export function setupConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmCancel = document.getElementById('confirm-cancel');
    
    if (!confirmModal || !confirmCancel) {
        console.warn('Confirm modal elements not found');
        return;
    }
    
    // Cerrar modal al hacer clic en cancelar
    confirmCancel.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && confirmModal.style.display === 'flex') {
            confirmModal.style.display = 'none';
        }
    });
}

/**
 * Muestra un modal de confirmación
 * @param {Object} options - Opciones del modal
 * @param {string} options.title - Título del modal
 * @param {string} options.message - Mensaje del modal (solo texto plano para seguridad)
 * @param {string} options.okText - Texto del botón de confirmar
 * @param {string} options.cancelText - Texto del botón de cancelar
 * @param {string} options.okType - Tipo del botón de confirmar (danger, primary, etc)
 * @param {Function} options.onConfirm - Función a ejecutar al confirmar
 * @param {Function} options.onCancel - Función a ejecutar al cancelar
 */
export function showConfirmModal(options = {}) {
    const modal = document.getElementById('confirm-modal');
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const okButton = document.getElementById('confirm-ok');
    const cancelButton = document.getElementById('confirm-cancel');
    
    if (!modal || !title || !message || !okButton || !cancelButton) {
        console.warn('Confirm modal elements not found');
        return;
    }
    
    // Establecer textos usando textContent para seguridad
    title.textContent = options.title || 'Confirmar acción';
    message.textContent = options.message || '¿Estás seguro de que deseas realizar esta acción?';
    okButton.textContent = options.okText || 'Confirmar';
    cancelButton.textContent = options.cancelText || 'Cancelar';
    
    // Establecer clase del botón OK
    okButton.className = options.okType === 'danger' ? 'danger-button' : 'primary-button';
    
    // Limpiar eventos previos creando nuevos elementos
    const newOkButton = okButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);
    okButton.parentNode.replaceChild(newOkButton, okButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    
    // Configurar eventos
    newOkButton.addEventListener('click', () => {
        if (typeof options.onConfirm === 'function') {
            options.onConfirm();
        }
        modal.style.display = 'none';
    });
    
    newCancelButton.addEventListener('click', () => {
        if (typeof options.onCancel === 'function') {
            options.onCancel();
        }
        modal.style.display = 'none';
    });
    
    // Mostrar modal
    modal.style.display = 'flex';
}

/**
 * Validación de formularios
 * @param {HTMLFormElement} form - Formulario a validar
 * @param {Object} customValidations - Validaciones personalizadas
 * @returns {boolean} - Indica si el formulario es válido
 */
export function validateForm(form, customValidations = {}) {
    if (!form) {
        console.warn('Form element not provided for validation');
        return false;
    }
    
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    // Limpiar mensajes de error previos
    clearFormErrors(form);
    
    // Validar cada campo
    inputs.forEach(input => {
        const fieldName = input.name;
        const fieldValue = input.value ? input.value.trim() : '';
        
        if (input.hasAttribute('required') && !fieldValue) {
            addErrorToField(input, 'Este campo es obligatorio');
            isValid = false;
        }
        
        // Validaciones personalizadas
        if (fieldName && customValidations[fieldName]) {
            const validation = customValidations[fieldName](fieldValue);
            if (validation !== true) {
                addErrorToField(input, validation);
                isValid = false;
            }
        }
    });
    
    return isValid;
}

/**
 * Limpiar errores de formulario
 * @param {HTMLFormElement} form - Formulario a limpiar
 */
export function clearFormErrors(form) {
    if (!form) return;
    
    const errorMessages = form.querySelectorAll('.field-error-message');
    errorMessages.forEach(error => error.remove());
    
    const errorFields = form.querySelectorAll('.field-error');
    errorFields.forEach(field => field.classList.remove('field-error'));
}

/**
 * Añadir mensaje de error a un campo
 * @param {HTMLElement} field - Campo de formulario
 * @param {string} message - Mensaje de error
 */
function addErrorToField(field, message) {
    if (!field) return;
    
    field.classList.add('field-error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error-message';
    errorElement.textContent = message; // Usar textContent por seguridad
    
    const parent = field.parentElement;
    if (parent) {
        parent.appendChild(errorElement);
    }
}

/**
 * Obtener datos de formulario como FormData
 * @param {HTMLFormElement} form - Formulario
 * @returns {FormData|null} - FormData del formulario o null si no válido
 */
export function getFormData(form) {
    if (!form) {
        console.warn('Form element not provided');
        return null;
    }
    
    return new FormData(form);
}

/**
 * Funciones de seguridad para manejo de CSRF
 * @returns {string} - Token CSRF o cadena vacía
 */
export function getCSRFToken() {
    // Obtener token de elemento meta
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        return csrfMeta.getAttribute('content') || '';
    }
    
    // Si hay token en objeto global (añadido por middleware CSRF)
    if (typeof window !== 'undefined' && window.CSRF_TOKEN) {
        return window.CSRF_TOKEN;
    }
    
    return '';
}

/**
 * Formatear fecha YYYY-MM-DD
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export function formatDate(date) {
    const d = new Date(date);
    
    // Verificar que la fecha es válida
    if (isNaN(d.getTime())) {
        console.warn('Invalid date provided to formatDate');
        return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Función para realizar peticiones HTTP con manejo de CSRF
 * @param {string} url - URL de la petición
 * @param {Object} options - Opciones de fetch
 * @returns {Promise} - Promesa con la respuesta
 */
export async function fetchWithCSRF(url, options = {}) {
    const csrfToken = getCSRFToken();
    
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'X-CSRF-Token': csrfToken,
        }
    };
    
    // Combinar opciones
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, finalOptions);
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            let errorMessage = `Error de servidor: ${response.status}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                // Si no se puede parsear como JSON, usar mensaje genérico
                console.warn('Could not parse error response as JSON');
            }
            
            throw new Error(errorMessage);
        }
        
        // Si la respuesta está vacía, devolver true
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return true;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}

/**
 * Formatea bytes a tamaño legible
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Número de decimales
 * @returns {string} - Tamaño formateado
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Crea un retraso (sleep) con Promise
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} - Promesa que se resuelve después del retraso
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trunca texto a una longitud máxima y añade puntos suspensivos si es necesario
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Verifica si un elemento está visible en el viewport
 * @param {HTMLElement} element - Elemento a verificar
 * @returns {boolean} - True si está visible
 */
export function isElementInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Configuración de manejo de errores de imagen
 * @param {HTMLImageElement} imageElement - Elemento de imagen
 * @param {string} fallbackSrc - URL de imagen de respaldo
 */
export function setupImageFallback(imageElement, fallbackSrc = '/images/placeholder.jpg') {
    if (!imageElement || imageElement.tagName !== 'IMG') return;
    
    imageElement.addEventListener('error', function() {
        if (this.src !== fallbackSrc) {
            this.src = fallbackSrc;
        }
    });
    
    imageElement.addEventListener('load', function() {
        this.classList.add('loaded');
    });
}