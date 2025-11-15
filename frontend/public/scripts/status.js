/**
 * Estado de suscripción - Integrando con el sistema centralizado de notificaciones
 */

const LoadingOverlay = {
    overlay: null,
    count: 0,
    
    init() {
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'loading-overlay';
            this.overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                    <div class="spinner-text">Procesando solicitud...</div>
                </div>
            `;
            document.body.appendChild(this.overlay);
            
            // Inyectar estilos
            const style = document.createElement('style');
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    backdrop-filter: blur(5px);
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                
                .loading-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                
                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    color: white;
                }
                
                .spinner-circle {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255, 255, 255, 0.2);
                    border-top-color: var(--marron, #582f0e);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .spinner-text {
                    font-size: 1.2rem;
                    font-weight: 500;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                [data-theme="dark"] .spinner-circle {
                    border-top-color: var(--secondary-color, #2B3230);
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    show(message = 'Procesando solicitud...') {
        this.init();
        this.count++;
        
        const textElement = this.overlay.querySelector('.spinner-text');
        if (textElement) {
            textElement.textContent = message;
        }
        
        this.overlay.classList.add('active');
        document.body.classList.add('modal-open');
    },
    
    hide() {
        if (!this.overlay) return;
        
        this.count = Math.max(0, this.count - 1);
        
        if (this.count === 0) {
            this.overlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    },
    
    // Método para envolver cualquier función asíncrona con la pantalla de carga
    async withLoading(fn, message = 'Procesando solicitud...') {
        this.show(message);
        try {
            return await fn();
        } finally {
            this.hide();
        }
    }
};

// Configuración de estados actualizada
const STATUS_CONFIG = {
    active: {
        label: 'Activa',
        description: 'Tu suscripción está activa y se renovará automáticamente',
        class: 'status-active',
        icon: 'bx-check'
    },
    paused: {
        label: 'Cancelación Pendiente',
        description: 'Tu suscripción se cancelará al final del período de facturación. Puedes reanudarla antes de esa fecha.',
        class: 'status-paused',
        icon: 'bx-pause'
    },
    canceled: {
        label: 'Cancelada',
        description: 'La suscripción ha sido cancelada. Para volver a acceder a los beneficios, deberás adquirir una nueva suscripción desde la tienda.',
        class: 'status-expired',
        icon: 'bx-x'
    },
    expired: {
        label: 'Expirada',
        description: 'La suscripción ha expirado. Para volver a acceder a los beneficios, adquiere una nueva suscripción desde la tienda.',
        class: 'status-expired',
        icon: 'bx-x'
    },
    unknown: {
        label: 'Estado Desconocido',
        description: 'Estado de suscripción no reconocido',
        class: 'status-unknown',
        icon: 'bx-question-mark'
    }
};

// Funciones de utilidad
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatAmount(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

function calculateRemainingDays(nextBilledAt) {
    const now = new Date();
    const nextBill = new Date(nextBilledAt);
    const diffTime = nextBill - now;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function getStatusConfig(subscription) {
    return STATUS_CONFIG[subscription.status.toLowerCase()] || STATUS_CONFIG.unknown;
}

function getTimeDisplay(subscription) {
    const remainingDays = calculateRemainingDays(subscription.next_billed_at);
    
    switch(subscription.status.toLowerCase()) {
        case 'expired':
        case 'canceled':
            return { label: 'Expiró el', value: formatDate(subscription.next_billed_at) };
        case 'paused':
            return { label: 'Pausada hasta', value: formatDate(subscription.next_billed_at) };
        default:
            return { label: 'Tiempo Restante', value: `${remainingDays} días` };
    }
}

class SubscriptionManager {
    constructor() {
        this.mainContainer = document.querySelector('.main-content');
        this.userId = null;
        this.init();
    }
    
    async init() {
        await this.obtenerUsuarioId();
        
        if (this.userId) this.loadSubscriptions();
        
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }
    
    // Método para manejar todos los clics mediante delegación de eventos
    handleGlobalClick(event) {
        const target = event.target;
        
        const portalButton = target.closest('.portal-button');
        const actionButton = target.closest('.action-button');
        const retryButton = target.closest('.retry-button');
        
        if (portalButton) {
            event.preventDefault();
            const subscriptionId = portalButton.getAttribute('data-subscription-id');
            const priceId = portalButton.getAttribute('data-price-id');
            const productId = portalButton.getAttribute('data-product-id');
            this.handlePortalAccess(subscriptionId, priceId, productId);
        } 
        else if (actionButton) {
            event.preventDefault();
            const action = actionButton.getAttribute('data-action');
            const subId = actionButton.getAttribute('data-subscription-id');
            this.handleAction(action, subId);
        }
        else if (retryButton) {
            event.preventDefault();
            this.loadSubscriptions();
        }
    }
    
    async obtenerUsuarioId() {
        return await LoadingOverlay.withLoading(async () => {
            try {
                const response = await fetch('/api/usuarios/authenticate');
                if (!response.ok) throw new Error('Error de autenticación');
                const userData = await response.json();
                this.userId = userData.id_user;
                return userData.id_user;
            } catch (error) {
                console.error("Error de autenticación:", error);
                this.showAlert('Error al obtener información del usuario', 'error');
                return null;
            }
        }, 'Verificando autenticación...');
    }
    
    createNewContainer() {
        const container = document.createElement('div');
        container.className = 'content-box premium-status';
        // Asegurarse de que el nuevo contenedor se coloque después del último existente
        this.mainContainer.appendChild(container);
        return container;
    }
    
    showSkeleton(container) {
        container.innerHTML = `
            <div class="status-list skeleton">
                <div class="status-header">
                    <div class="skeleton-text-long"></div>
                    <div class="skeleton-button"></div>
                </div>
                ${Array(3).fill().map(() => `
                <div class="status-item">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-lines">
                        <div class="skeleton-text-long"></div>
                        <div class="skeleton-text-short"></div>
                    </div>
                </div>
                `).join('')}
            </div>
        `;
    }
    
    createSubscriptionHTML(subscription) {
        const statusConfig = getStatusConfig(subscription);
        const timeDisplay = getTimeDisplay(subscription);
        
        // Aseguramos que tenemos los IDs necesarios
        const subscriptionId = subscription.subscription_id || '';
        const priceId = subscription.price_id || '';
        const productId = subscription.product_id || '';
        
        return `
            <div class="status-list">
                <div class="status-header">
                    <h2>${subscription.product_name}</h2>
                    <button class="portal-button" 
                        data-subscription-id="${subscriptionId}" 
                        data-price-id="${priceId}" 
                        data-product-id="${productId}">
                        <i class='bx bx-credit-card'></i> Datos de pago
                    </button>
                </div>
                
                <div class="status-item">
                    <div class="status-icon">
                        <i class='bx bx-timer'></i>
                        <i class='bx bx-stopwatch'></i>
                    </div>
                    <div class="status-details">
                        <h3>${timeDisplay.label}</h3>
                        <span class="status-value">${timeDisplay.value}</span>
                    </div>
                    <div class="status-badge ${statusConfig.class}">
                        <i class='bx ${statusConfig.icon}'></i>
                        ${statusConfig.label}
                    </div>
                </div>
                
                <div class="status-item">
                    <div class="status-icon">
                        <i class='bx bx-calendar-alt'></i>
                        <i class='bx bx-calendar-exclamation'></i>
                    </div>
                    <div class="status-details">
                        <h3>${subscription.status === 'expired' ? 'Fecha de Expiración' : 'Próximo Pago'}</h3>
                        <span class="status-value">${formatDate(subscription.next_billed_at)}</span>
                    </div>
                    <div class="status-description">
                        ${statusConfig.description}
                    </div>
                </div>
                
                <div class="status-item">
                    <div class="status-icon">
                        <i class='bx bx-diamond'></i>
                        <i class='bx bx-medal'></i>
                    </div>
                    <div class="status-details">
                        <h3>Plan Actual</h3>
                        <span class="status-value">${subscription.product_name} - ${subscription.interval}</span>
                    </div>
                    ${this.renderActions(subscription)}
                </div>
            </div>
        `;
    }
    
    async handlePortalAccess(subscriptionId, priceId, productId) {
        return await LoadingOverlay.withLoading(async () => {
            try {
                this.showAlert('Accediendo al portal de pagos...', 'info');
                
                const response = await fetch(`/api/payment/user/transactions/${this.userId}`, {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error('Error al cargar transacciones');
                }
                
                const { data } = await response.json();
                
                if (!data || data.length === 0) {
                    this.showAlert('No se encontraron transacciones para este usuario', 'error');
                    return;
                }
                
                const relatedTransactions = data.filter(tx => 
                    tx.price_id === priceId && 
                    tx.product_id === productId
                );
                
                if (relatedTransactions.length === 0) {
                    this.showAlert('No se encontraron transacciones para esta suscripción', 'error');
                    return;
                }
                
                const latestTransaction = relatedTransactions[0];
                
                if (!latestTransaction.transaction_id) {
                    this.showAlert('ID de transacción no disponible', 'error');
                    return;
                }
                
                const portalResponse = await fetch(`/api/paddle/portal/${latestTransaction.transaction_id}`, {
                    credentials: 'include'
                });
                
                if (!portalResponse.ok) {
                    const errorData = await portalResponse.json();
                    throw new Error(errorData.message || 'Error al abrir portal de pagos');
                }
                
                const portalData = await portalResponse.json();
                
                if (portalData.success) {
                    // Primero intentamos con la URL estándar que sabemos que funcionaba antes
                    if (portalData.data.portalUrl) {
                        window.open(portalData.data.portalUrl, '_blank');
                        this.showAlert('Portal de pagos abierto correctamente', 'success');
                        return;
                    }
                    
                    // Si por alguna razón no tenemos la URL estándar pero sí la directa, usamos esa
                    if (portalData.data.directPaymentUrl) {
                        window.open(portalData.data.directPaymentUrl, '_blank');
                        this.showAlert('Portal de pagos abierto correctamente', 'success');
                        return;
                    }
                    
                    throw new Error('No se encontró ninguna URL válida para el portal');
                } else {
                    throw new Error('No se pudo obtener el enlace al portal');
                }
            } catch (error) {
                console.error('Error al acceder al portal de pagos:', error);
                this.showAlert(`Error: ${error.message}`, 'error');
            }
        }, 'Preparando portal de pagos...');
    }
    
    createConfirmDialog(title, message, action) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <div class="confirm-header">
                    <i class='bx ${this.getActionIcon(action)}'></i>
                    <h3>${title}</h3>
                </div>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-btn cancel">Regresar</button>
                    <button class="confirm-btn confirm">${this.getActionButton(action)}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        document.body.classList.add('modal-open');
        
        // Forzar un reflow antes de añadir la clase show
        dialog.offsetHeight;
        dialog.classList.add('show');
        
        return new Promise((resolve) => {
            const confirmBtn = dialog.querySelector('.confirm-btn.confirm');
            const cancelBtn = dialog.querySelector('.confirm-btn.cancel');
            
            const closeDialog = (result) => {
                dialog.classList.remove('show');
                setTimeout(() => {
                    dialog.remove();
                    document.body.classList.remove('modal-open');
                    resolve(result);
                }, 300);
            };
            
            confirmBtn.addEventListener('click', () => closeDialog(true));
            cancelBtn.addEventListener('click', () => closeDialog(false));
            
            // Prevenir que el clic en el contenido cierre el diálogo
            dialog.querySelector('.confirm-content').addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }
    
    getActionIcon(action) {
        const icons = {
            resume: 'bx-play-circle',
            cancel: 'bx-x-circle',
            delete: 'bx-trash'
        };
        return icons[action] || 'bx-question-mark';
    }
    
    getActionButton(action) {
        const buttons = {
            resume: 'Reanudar',
            cancel: 'Cancelar',
            delete: 'Eliminar'
        };
        return buttons[action] || 'Confirmar';
    }
    
    getConfirmConfig(action) {
        const configs = {
            resume: {
                title: 'Reanudar Suscripción',
                message: 'Al reanudar tu suscripción, continuarás teniendo acceso a todos los beneficios. Se te cobrará según tu ciclo de facturación.'
            },
            cancel: {
                title: 'Cancelar Suscripción',
                message: 'Tu suscripción permanecerá activa hasta el final del período de facturación actual. Después de eso, se cancelará automáticamente. Puedes reanudarla en cualquier momento antes de que expire.'
            },
            delete: {
                title: 'Eliminar Suscripción',
                message: '¿Estás seguro de que deseas eliminar esta suscripción de tu lista? Esta acción solo la ocultará de tu vista y no afectará al estado real de la suscripción.'
            }
        };
        return configs[action] || { title: 'Confirmar Acción', message: '¿Deseas continuar?' };
    }
    
    renderActions(subscription) {
        const { status, subscription_id: subId } = subscription;
        const actions = {
            active: `
                <button class="action-button cancel" data-action="cancel" data-subscription-id="${subId}">
                    <i class='bx bx-x'></i> Cancelar
                </button>
            `,
            paused: `
                <button class="action-button resume" data-action="resume" data-subscription-id="${subId}">
                    <i class='bx bx-play'></i> Reanudar
                </button>
            `,
            canceled: `
                <div class="subscription-actions">
                    <button class="action-button delete" data-action="delete" data-subscription-id="${subId}">
                        <i class='bx bx-trash'></i> Eliminar
                    </button>
                </div>
            `,
            expired: `
                <div class="subscription-actions">
                    <button class="action-button delete" data-action="delete" data-subscription-id="${subId}">
                        <i class='bx bx-trash'></i> Eliminar
                    </button>
                </div>
            `
        };
        
        return `
            <div class="subscription-actions">
                ${actions[status.toLowerCase()] || ''}
            </div>
        `;
    }
    
    async loadTransactions(subscriptionId) {
        return await LoadingOverlay.withLoading(async () => {
            try {
                const response = await fetch(`/api/payment/user/transactions/${this.userId}?subscription_id=${subscriptionId}`);
                if (!response.ok) throw new Error('Error al cargar transacciones');
                
                const { data } = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error al cargar transacciones:', error);
                this.showAlert('Error al cargar transacciones', 'error');
                return [];
            }
        }, 'Cargando transacciones...');
    }
    
    async openPaymentPortal(transactionId) {
        return await LoadingOverlay.withLoading(async () => {
            try {
                this.showAlert('Preparando portal de pagos...', 'info');
                
                const response = await fetch(`/api/paddle/portal/${transactionId}`, {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al abrir portal de pagos');
                }
                
                const data = await response.json();
                
                if (data.success && data.data.portalUrl) {
                    window.open(data.data.portalUrl, '_blank');
                    return true;
                } else {
                    throw new Error('No se pudo obtener el enlace al portal');
                }
            } catch (error) {
                console.error('Error al abrir portal de pagos:', error);
                this.showAlert(`Error: ${error.message}`, 'error');
                return false;
            }
        }, 'Accediendo al portal de pagos...');
    }
    
    async loadSubscriptions() {
        if (!this.userId) return;
        
        const existingContainers = document.querySelectorAll('.content-box.premium-status');
        existingContainers.forEach(container => container.remove());
        
        return await LoadingOverlay.withLoading(async () => {
            try {
                const response = await fetch(`/api/payment/user/subscriptions/${this.userId}`);
                if (!response.ok) throw new Error('Error al cargar suscripciones');
                
                const { data } = await response.json();
                
                const filteredData = data.filter(subscription => 
                    !['expired', 'canceled'].includes(subscription.status.toLowerCase())
                );
                
                if (filteredData.length) {
                    // Agrupar suscripciones por producto
                    const grouped = filteredData.reduce((acc, sub) => {
                        (acc[sub.product_name] = acc[sub.product_name] || []).push(sub);
                        return acc;
                    }, {});
                    
                    Object.entries(grouped).forEach(([product, subs]) => {
                        const container = this.createNewContainer();
                        this.showSkeleton(container);
                        
                        setTimeout(() => {
                            // Usamos la nueva estructura para cada suscripción
                            container.innerHTML = subs.map(sub => this.createSubscriptionHTML(sub)).join('');
                        }, 500); // Pequeño delay para mostrar el skeleton
                    });
                } else {
                    const container = this.createNewContainer();
                    this.showNoSubscriptions(container);
                }
            } catch (error) {
                console.error('Error:', error);
                const container = this.createNewContainer();
                this.showError('Error al cargar suscripciones', container);
            }
        }, 'Cargando información de suscripciones...');
    }
    
    async handleAction(action, subId) {
        const endpoints = {
            resume: '/api/paddle/resume',
            cancel: '/api/paddle/cancel',
            delete: '/api/paddle/delete'
        };
        
        const config = this.getConfirmConfig(action);
        const confirmed = await this.createConfirmDialog(config.title, config.message, action);
        
        if (!confirmed) return;
        
        return await LoadingOverlay.withLoading(async () => {
            try {
                const response = await fetch(endpoints[action], {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        subscriptionId: subId,
                        userId: this.userId
                    }),
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error en ${action}`);
                }
                
                await this.loadSubscriptions();
                this.showAlert(`Acción realizada: ${action} exitosamente`, 'success');
                return true;
            } catch (error) {
                console.error('Error en la acción:', error);
                this.showAlert(`Error al ${action}: ${error.message}`, 'error');
                return false;
            }
        }, `Procesando ${action}...`);
    }
    
    showError(message, container) {
        container.innerHTML = `
            <div class="error-message">
                <i class='bx bx-error-circle'></i>
                <p>${message}</p>
                <button class="retry-button">
                    <i class='bx bx-refresh'></i> Reintentar
                </button>
            </div>
        `;
    }
    
    showNoSubscriptions(container) {
        container.innerHTML = `
            <div class="no-subscription">
                <i class='bx bx-package'></i>
                <p>No se encontraron suscripciones activas</p>
                <a href="/tienda" class="shop-link">
                    <i class='bx bx-cart'></i> Explorar planes
                </a>
            </div>
        `;
    }
    
    // Método para mostrar alertas usando el servicio centralizado
    showAlert(message, type = 'info', duration = 3000) {
        if (window.showAlert) {
            return window.showAlert(message, type, duration);
        } else if (window.notifyService) {
            return window.notifyService.add(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Inyectar estilos
    injectStyles();
    
    window.subscriptionManager = new SubscriptionManager();
});

// Estilos dinámicos
function injectStyles() {
    // Si ya existe un estilo con este ID, no hacer nada
    if (document.getElementById('status-dynamic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'status-dynamic-styles';
    style.textContent = `
        /* Status Badges */
        .status-badge {
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: white;
            font-weight: 500;
        }
        
        .status-active { 
            background: #4CAF50;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        .status-paused { 
            background: #FFA726;
            box-shadow: 0 2px 8px rgba(255, 167, 38, 0.3);
        }
        .status-expired { 
            background: #EF5350;
            box-shadow: 0 2px 8px rgba(239, 83, 80, 0.3);
        }
        .status-canceled { 
            background: #757575;
            box-shadow: 0 2px 8px rgba(117, 117, 117, 0.3);
        }
        .status-unknown { 
            background: #9E9E9E;
            box-shadow: 0 2px 8px rgba(158, 158, 158, 0.3);
        }
        
        /* Action Buttons */
        .subscription-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .action-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 80px;
            justify-content: center;
        }
        
        .action-button i {
            font-size: 1.2rem;
        }
        
        .action-button.pause {
            background: #FFA726;
            box-shadow: 0 2px 8px rgba(255, 167, 38, 0.3);
        }
        
        .action-button.resume {
            background: #4CAF50;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        
        .action-button.cancel {
            background: #EF5350;
            box-shadow: 0 2px 8px rgba(239, 83, 80, 0.3);
        }
        
        .action-button.renew {
            background: #2196F3;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            filter: brightness(1.1);
        }
        
        .action-button:active {
            transform: translateY(0);
        }
        
        /* Skeletons */
        .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        /* Status Items Enhancements */
        .status-item {
            position: relative;
            overflow: hidden;
        }
        
        .status-item::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            transform: translateX(-100%);
            transition: transform 0.5s;
        }
        
        .status-item:hover::after {
            transform: translateX(100%);
        }
        
        .action-button.delete {
            background: #757575;
            box-shadow: 0 2px 8px rgba(117, 117, 117, 0.3);
        }
        
        /* Status icon enhancements */
        .status-icon i {
            font-size: 1.5rem;
            color: white;
            transition: var(--transition-normal, 0.3s ease);
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .status-icon i:first-child {
            transform: translate(-50%, -50%) rotateY(0deg);
            opacity: 1;
            backface-visibility: visible;
        }
        
        .status-icon i:last-child {
            transform: translate(-50%, -50%) rotateY(180deg);
            opacity: 0;
            backface-visibility: visible;
        }
        
        .status-item:hover .status-icon i:first-child {
            opacity: 0;
        }
        
        .status-item:hover .status-icon i:last-child {
            opacity: 1;
        }
        
        /* Confirm Dialog Styles */
        .confirm-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(5px);
            padding-top: 100px;
        }
        
        .confirm-dialog.show {
            opacity: 1;
        }
        
        .confirm-content {
            background: var(--bg-color, white);
            border-radius: 15px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            position: relative;
            margin: 20px;
        }
        
        body.modal-open {
            overflow: hidden;
            pointer-events: none;
        }
        
        body.modal-open .confirm-dialog {
            pointer-events: auto;
        }
        
        .confirm-dialog.show .confirm-content {
            transform: translateY(0);
        }
        
        .confirm-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .confirm-header i {
            font-size: 2.5rem;
            color: var(--marron, #582f0e);
        }
        
        .confirm-header h3 {
            font-size: 1.5rem;
            color: var(--text-color, #333);
            margin: 0;
            font-weight: 600;
        }
        
        .confirm-content p {
            color: var(--text-color, #333);
            margin-bottom: 2rem;
            line-height: 1.6;
            font-size: 1rem;
        }
        
        .confirm-buttons {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        
        .confirm-btn {
            padding: 0.8rem 1.8rem;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            transition: all 0.3s ease;
            min-width: 120px;
            text-align: center;
        }
        
        .confirm-btn.cancel {
            background: var(--bg-color, white);
            color: var(--text-color, #333);
            border: 2px solid var(--marron, #582f0e);
        }
        
        .confirm-btn.confirm {
            background: var(--marron, #582f0e);
            color: white;
        }
        
        .confirm-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .confirm-btn:active {
            transform: translateY(0);
        }
        
        [data-theme="dark"] .confirm-content {
            background: var(--bg-color, #1A1A1A);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        [data-theme="dark"] .confirm-btn.cancel {
            border-color: var(--marron, #3C4748);
            background: rgba(0, 0, 0, 0.2);
            color: var(--text-color, #ecf0f1);
        }
        
        /* Error State */
        .error-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .error-message i {
            font-size: 4rem;
            color: #EF5350;
            opacity: 0.8;
        }
        
        .error-message p {
            font-size: 1.2rem;
            color: var(--text-color, #333);
            max-width: 500px;
            line-height: 1.6;
        }
        
        .retry-button {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.8rem 1.5rem;
            background: var(--marron, #582f0e);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }
        
        .retry-button:hover {
            background: var(--marron-oscuro, #442409);
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .retry-button i {
            font-size: 1.2rem;
        }
        
        /* No Subscription State */
        .no-subscription {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .no-subscription i {
            font-size: 5rem;
            color: var(--third-color, #656d4a);
            opacity: 0.7;
        }
        
        .no-subscription p {
            font-size: 1.3rem;
            color: var(--text-color, #333);
            font-weight: 500;
            margin-bottom: 1rem;
        }
        
        .shop-link {
            display: inline-flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.8rem 1.5rem;
            background: var(--marron, #582f0e);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }
        
        .shop-link:hover {
            background: var(--marron-oscuro, #442409);
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .shop-link i {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
}