/**
 * NotificationService - Sistema centralizado de notificaciones para Acadelia
 * Usa con Boxicons para los iconos
 */
class NotificationService {
    constructor() {
        this.queue = [];
        this.activeNotifications = [];
        this.isProcessing = false;
        this.maxVisible = 3;
        
        // Definir iconos de Boxicons
        this.icons = {
            success: '<i class="bx bx-check-circle"></i>',
            error: '<i class="bx bx-error-circle"></i>',
            warning: '<i class="bx bx-error"></i>',
            info: '<i class="bx bx-info-circle"></i>',
            loading: '<div class="spinner"></div>'
        };
        
        // Crear el contenedor
        this.createContainer();
    }
    
    createContainer() {
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }
    
    add(message, type = 'info', duration = 3000, id = null) {
        const notificationId = id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.queue.push({
            id: notificationId,
            message,
            type,
            duration,
            timestamp: Date.now()
        });
        
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return notificationId;
    }
    
    loading(message = 'Cargando...') {
        return this.add(message, 'loading', 0);
    }
    
    update(id, message, type = null, duration = null) {
        // Buscar en cola
        const queueIndex = this.queue.findIndex(n => n.id === id);
        if (queueIndex >= 0) {
            if (message) this.queue[queueIndex].message = message;
            if (type) this.queue[queueIndex].type = type;
            if (duration !== null) this.queue[queueIndex].duration = duration;
            return;
        }
        
        // Buscar elemento activo
        const notification = document.getElementById(id);
        if (notification) {
            // Actualizar mensaje
            if (message) {
                const contentEl = notification.querySelector('.notification-content');
                if (contentEl) contentEl.innerHTML = message;
            }
            
            // Actualizar tipo
            if (type) {
                const types = ['success', 'error', 'warning', 'info', 'loading'];
                
                // Quitar clases anteriores
                types.forEach(t => notification.classList.remove(`notification-${t}`));
                
                // Añadir nueva clase
                notification.classList.add(`notification-${type}`);
                
                // Actualizar icono
                const iconEl = notification.querySelector('.notification-icon');
                if (iconEl) {
                    iconEl.innerHTML = this.icons[type] || this.icons.info;
                }
                
                // Si cambia de loading a otro tipo, programar eliminación
                if (type !== 'loading' && duration !== null) {
                    setTimeout(() => this.remove(id), duration);
                }
            }
        }
    }
    
    remove(id) {
        // Eliminar de cola
        const queueIndex = this.queue.findIndex(n => n.id === id);
        if (queueIndex >= 0) {
            this.queue.splice(queueIndex, 1);
            return;
        }
        
        // Eliminar elemento activo
        const notification = document.getElementById(id);
        if (notification) {
            // Añadir clase de salida
            notification.classList.add('notification-hide');
            
            // Eliminar del array de activos
            const activeIndex = this.activeNotifications.indexOf(id);
            if (activeIndex >= 0) {
                this.activeNotifications.splice(activeIndex, 1);
            }
            
            // Eliminar del DOM después de la animación
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                // Procesar siguiente si hay espacio
                if (this.activeNotifications.length < this.maxVisible && this.queue.length > 0) {
                    this.processQueue();
                }
            }, 300);
        }
    }
    
    processQueue() {
        this.isProcessing = true;
        
        if (this.queue.length === 0 || this.activeNotifications.length >= this.maxVisible) {
            this.isProcessing = false;
            return;
        }
        
        const notification = this.queue.shift();
        this.displayNotification(notification);
        
        if (this.queue.length > 0 && this.activeNotifications.length < this.maxVisible) {
            setTimeout(() => this.processQueue(), 100);
        } else {
            this.isProcessing = false;
        }
    }
    
    displayNotification(notification) {
        // Añadir al array de activos
        this.activeNotifications.push(notification.id);
        
        // Crear elemento
        const notificationEl = document.createElement('div');
        notificationEl.id = notification.id;
        notificationEl.className = `notification notification-${notification.type}`;
        
        // Añadir índice para animaciones escalonadas
        notificationEl.style.setProperty('--index', this.activeNotifications.length - 1);
        
        notificationEl.innerHTML = `
            <div class="notification-icon">${this.icons[notification.type] || this.icons.info}</div>
            <div class="notification-content">${notification.message}</div>
            ${notification.type !== 'loading' ? '<button class="notification-close"><i class="bx bx-x"></i></button>' : ''}
        `;
        
        // Añadir al contenedor
        this.container.appendChild(notificationEl);
        
        // Configurar botón de cerrar
        const closeBtn = notificationEl.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(notification.id));
        }
        
        // Mostrar con animación
        setTimeout(() => notificationEl.classList.add('notification-show'), 10);
        
        // Auto-eliminación si no es loading
        if (notification.type !== 'loading' && notification.duration > 0) {
            setTimeout(() => this.remove(notification.id), notification.duration);
        }
    }
    
    sequence(loadingMsg, successMsg, callback, delay = 1000) {
        const loadingId = this.loading(loadingMsg);
        
        setTimeout(() => {
            this.update(loadingId, successMsg, 'success', 2000);
            
            if (callback && typeof callback === 'function') {
                setTimeout(callback, delay);
            }
        }, 1000);
        
        return loadingId;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global
    window.notifyService = new NotificationService();
    
    // Reemplazar función showAlert global si existe
    if (typeof window.showAlert === 'function') {
        const originalShowAlert = window.showAlert;
        window.showAlert = function(message, type = 'info', duration = 3000) {
            // Si el servicio está disponible, usarlo
            if (window.notifyService) {
                return window.notifyService.add(message, type, duration);
            }
            // Si no, usar la implementación original
            return originalShowAlert(message, type, duration);
        };
    } else {
        // Crear la función si no existe
        window.showAlert = function(message, type = 'info', duration = 3000) {
            return window.notifyService.add(message, type, duration);
        };
    }
});