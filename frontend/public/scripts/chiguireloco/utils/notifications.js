/**
 * Módulo para gestionar notificaciones del sistema
 */

/**
 * Instancia del toast de Bootstrap
 * @type {Object}
 */
let toastInstance = null;

/**
 * Inicializa el sistema de notificaciones
 */
export function initNotifications() {
    // Buscar el elemento toast
    const toastElement = document.getElementById('security-toast');
    
    if (toastElement) {
        // Crear instancia del toast de Bootstrap
        toastInstance = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
    } else {
        console.error('Elemento de toast no encontrado. Revisa el HTML.');
    }
}

/**
 * Muestra una notificación toast
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {string} [type='info'] - Tipo de notificación (success, error, warning, info)
 * @param {number} [duration=5000] - Duración en milisegundos
 */
export function showNotification(title, message, type = 'info', duration = 5000) {
    // Verificar que el toast está inicializado
    if (!toastInstance) {
        // Intentar inicializar
        initNotifications();
        
        // Si sigue sin estar disponible, mostrar alerta nativa
        if (!toastInstance) {
            console.warn('Sistema de notificaciones no inicializado.');
            alert(`${title}: ${message}`);
            return;
        }
    }
    
    // Obtener elementos del toast
    const toastElement = document.getElementById('security-toast');
    const titleElement = document.getElementById('toast-title');
    const timeElement = document.getElementById('toast-time');
    const messageElement = document.getElementById('toast-message');
    const iconElement = toastElement.querySelector('.toast-header i');
    
    // Configurar tipo y estilos
    toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    iconElement.classList.remove('text-success', 'text-danger', 'text-warning', 'text-info', 
                                'bi-shield-check', 'bi-shield-exclamation', 'bi-exclamation-triangle', 'bi-info-circle');
    
    // Aplicar estilos según tipo
    switch (type) {
        case 'success':
            iconElement.classList.add('bi-shield-check', 'text-success');
            break;
        case 'error':
            iconElement.classList.add('bi-shield-exclamation', 'text-danger');
            break;
        case 'warning':
            iconElement.classList.add('bi-exclamation-triangle', 'text-warning');
            break;
        case 'info':
        default:
            iconElement.classList.add('bi-info-circle', 'text-info');
            break;
    }
    
    // Actualizar contenido
    if (titleElement) titleElement.textContent = title;
    if (timeElement) timeElement.textContent = getTimeString();
    if (messageElement) messageElement.textContent = message;
    
    // Actualizar duración si es diferente del valor por defecto
    if (duration !== 5000) {
        const bootstrapToast = bootstrap.Toast.getInstance(toastElement);
        if (bootstrapToast) {
            bootstrapToast._config.delay = duration;
        }
    }
    
    // Mostrar notificación
    toastInstance.show();
}

/**
 * Muestra una notificación de éxito
 * @param {string} message - Mensaje de la notificación
 */
export function showSuccess(message) {
    showNotification('Éxito', message, 'success');
}

/**
 * Muestra una notificación de error
 * @param {string} message - Mensaje de la notificación
 */
export function showError(message) {
    showNotification('Error', message, 'error');
}

/**
 * Muestra una notificación de advertencia
 * @param {string} message - Mensaje de la notificación
 */
export function showWarning(message) {
    showNotification('Advertencia', message, 'warning');
}

/**
 * Muestra una notificación de información
 * @param {string} message - Mensaje de la notificación
 */
export function showInfo(message) {
    showNotification('Información', message, 'info');
}

/**
 * Obtiene una representación de la hora actual
 * @returns {string} Hora formateada (ej: "hace 1 min" o "ahora")
 */
function getTimeString() {
    return 'ahora';
}