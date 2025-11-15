// Constantes
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// Loading Overlay
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
                    -webkit-backdrop-filter: blur(5px);
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

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        const modalStyles = document.createElement('style');
        modalStyles.textContent = `
            .payment-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                padding: 20px;
            }

            .payment-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .modal-content {
                background: var(--bg-color);
                border-radius: 20px;
                padding: 2.5rem;
                max-width: 500px;
                width: 100%;
                max-height: calc(100vh - 40px);
                transform: translateY(-20px) scale(0.95);
                transition: transform 0.3s ease;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            }

            .payment-modal.show .modal-content {
                transform: translateY(0) scale(1);
            }

            .modal-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid rgba(88, 47, 14, 0.1);
            }

            .modal-icon {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
                color: white;
                flex-shrink: 0;
            }

            .modal-icon.info {
                background: var(--info-color, #2196F3);
                box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
            }

            .modal-header h3 {
                color: var(--text-color);
                font-size: 1.4rem;
                font-weight: 600;
                margin: 0;
            }

            .modal-body {
                margin-bottom: 2rem;
                line-height: 1.6;
            }

            .modal-body p {
                color: var(--text-color);
                margin-bottom: 1rem;
                opacity: 0.9;
            }

            .modal-actions {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .modal-btn {
                flex: 1;
                padding: 0.8rem 1.5rem;
                border: none;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                min-width: 140px;
                text-decoration: none;
                font-size: 0.95rem;
            }

            .modal-btn.primary {
                background: var(--marron, #582f0e);
                color: white;
                box-shadow: 0 4px 15px rgba(88, 47, 14, 0.2);
            }

            .modal-btn.primary:hover {
                background: var(--marron-oscuro, #442409);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(88, 47, 14, 0.3);
            }

            .close-modal {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--text-color);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.3s ease;
                opacity: 0.7;
            }

            .close-modal:hover {
                opacity: 1;
                background: rgba(0, 0, 0, 0.1);
                transform: rotate(90deg);
            }

            /* Dark Mode */
            [data-theme="dark"] .modal-content {
                background: var(--bg-color);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            [data-theme="dark"] .modal-header {
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .payment-modal {
                    padding: 10px;
                    align-items: flex-start;
                    padding-top: 20px;
                }

                .modal-content {
                    padding: 2rem;
                    margin: 0;
                    max-height: calc(100vh - 20px);
                    border-radius: 15px;
                }

                .modal-actions {
                    flex-direction: column;
                    gap: 0.8rem;
                }

                .modal-btn {
                    min-width: auto;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(modalStyles);
    }

    show(content) {
        if (this.activeModal) {
            this.close();
        }

        this.activeModal = document.createElement('div');
        this.activeModal.className = 'payment-modal';
        this.activeModal.innerHTML = content;
        
        document.body.appendChild(this.activeModal);
        document.body.classList.add('modal-open');
        
        requestAnimationFrame(() => {
            this.activeModal.classList.add('show');
        });

        // Event listeners
        this.setupEventListeners();

        return this.activeModal;
    }

    setupEventListeners() {
        if (!this.activeModal) return;

        this.activeModal.addEventListener('click', (e) => {
            if (e.target === this.activeModal) {
                this.close();
            }
        });

        const closeBtn = this.activeModal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const closeModalBtns = this.activeModal.querySelectorAll('.close-modal-btn');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    close() {
        if (!this.activeModal) return;

        this.activeModal.classList.remove('show');
        document.body.classList.remove('modal-open');

        setTimeout(() => {
            if (this.activeModal && this.activeModal.parentNode) {
                this.activeModal.parentNode.removeChild(this.activeModal);
            }
            this.activeModal = null;
        }, 300);
    }

    showInvoiceInfo() {
        const content = `
            <div class="modal-content">
                <button class="close-modal">
                    <i class='bx bx-x'></i>
                </button>
                <div class="modal-header">
                    <div class="modal-icon info">
                        <i class='bx bx-receipt'></i>
                    </div>
                    <h3>Factura Obtenida</h3>
                </div>
                <div class="modal-body">
                    <p>La factura se ha abierto en una nueva pestaña.</p>
                    <p>Si no se abrió automáticamente, verifica que tu navegador no esté bloqueando ventanas emergentes.</p>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn primary close-modal-btn">
                        <i class='bx bx-check'></i>
                        Entendido
                    </button>
                </div>
            </div>
        `;
        return this.show(content);
    }
}

// Instancia global del modal manager
const modalManager = new ModalManager();

// Método para mostrar alertas usando el servicio centralizado
function showAlert(message, type = 'info', duration = 3000) {
    if (window.showAlert) {
        return window.showAlert(message, type, duration);
    } else if (window.notifyService) {
        return window.notifyService.add(message, type, duration);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

async function makeApiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(endpoint, finalOptions);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la petición');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}

// Funciones de utilidad
async function getInvoiceUrl(transactionId) {
    try {
        console.log('Solicitando factura para:', transactionId);
        return await LoadingOverlay.withLoading(async () => {
            const data = await makeApiRequest(`/api/paddle/invoice/${transactionId}`);
            
            console.log('Respuesta recibida:', data);
            
            if (!data.success || !data.data?.url) {
                throw new Error('No se pudo obtener la URL de la factura');
            }
            
            showAlert('Factura obtenida correctamente', 'success');
            return data.data.url;
        }, 'Obteniendo factura...');
    } catch (error) {
        console.error('Error al obtener la factura:', error);
        showAlert('Error al obtener la factura: ' + error.message, 'error');
        return null;
    }
}

function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatAmount(amount, currencyCode = 'USD') {
    const symbols = { 'EUR': '€', 'USD': '$' };
    const symbol = symbols[currencyCode] || currencyCode;
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

async function getCachedData(key, fetchFunction) {
    const cachedData = localStorage.getItem(key);
    const cacheTimestamp = localStorage.getItem(`${key}_timestamp`);

    if (cachedData && cacheTimestamp) {
        const now = Date.now();
        if (now - parseInt(cacheTimestamp) < CACHE_DURATION) {
            return JSON.parse(cachedData);
        }
    }

    const data = await fetchFunction();
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
    return data;
}

async function getUserId() {
    return await getCachedData('userId', async () => {
        const response = await fetch('/api/usuarios/authenticate');
        if (!response.ok) throw new Error('Error de autenticación');
        const userData = await response.json();
        return userData.id_user;
    });
}

class PaymentHistory {
    constructor() {
        this.paymentList = document.querySelector('.payment-list');
        this.filterSelect = document.querySelector('.payment-filter select');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', (e) => this.handleFilter(e));
        }
        
        // Event listener global para los botones
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (actionBtn) {
                e.preventDefault();
                const action = actionBtn.getAttribute('data-action');
                const transactionId = actionBtn.getAttribute('data-transaction-id');
                this.handlePaymentAction(action, transactionId);
            }
            
            const retryBtn = e.target.closest('.retry-button');
            if (retryBtn) {
                e.preventDefault();
                this.loadPayments();
            }
        });
    }

    handlePaymentAction(action, transactionId) {
        console.log('🎯 Acción:', action, 'Transaction ID:', transactionId);
        
        switch (action) {
            case 'invoice':
                if (transactionId) {
                    this.openInvoice(transactionId);
                } else {
                    showAlert('Error: No se encontró el ID de transacción', 'error');
                }
                break;
            case 'decorative':
                // Solo para pagos completados - no hace nada funcional
                modalManager.showInvoiceInfo();
                break;
            default:
                console.warn('⚠️ Acción no reconocida:', action);
        }
    }

    async openInvoice(transactionId) {
        try {
            console.log('Intentando abrir factura para:', transactionId);
            const invoiceUrl = await getInvoiceUrl(transactionId);
            
            if (invoiceUrl) {
                console.log('Abriendo URL:', invoiceUrl);
                window.open(invoiceUrl, '_blank');
                modalManager.showInvoiceInfo();
            } else {
                showAlert('No se pudo abrir la factura', 'error');
            }
        } catch (error) {
            console.error('Error al abrir la factura:', error);
            showAlert('Error al abrir la factura', 'error');
        }
    }

    showSkeletonLoading() {
        return `
            <div class="payment-item skeleton">
                <div class="payment-info">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-lines">
                        <div class="skeleton-text-long"></div>
                        <div class="skeleton-text-short"></div>
                    </div>
                </div>
                <div class="skeleton-badge"></div>
            </div>
        `.repeat(3);
    }

    getPaymentConfig(payment) {
        const status = payment.event_type === 'transaction.completed' ? 'success' : 'failed';
        
        if (status === 'success') {
            return {
                status: 'success',
                statusText: 'Exitoso',
                statusIcon: 'bx-check',
                secondIcon: 'bx-check-shield',
                actionIcon: 'bx-receipt',
                actionText: 'Factura',
                actionType: 'invoice'
            };
        } else {
            return {
                status: 'failed',
                statusText: 'Fallido',
                statusIcon: 'bx-x',
                secondIcon: 'bx-error-circle',
                actionIcon: 'bx-info-circle',
                actionText: 'Info',
                actionType: 'decorative'
            };
        }
    }

    createPaymentItemHTML(payment) {
        console.log('🏗️ Creando HTML para pago:', payment);
        
        const config = this.getPaymentConfig(payment);
        
        const productName = payment.product_name || 'Producto';
        const interval = payment.interval || '';
        const paymentMethod = payment.payment_method ? payment.payment_method.toUpperCase() : '';
        const last4 = payment.last4 ? `**** ${payment.last4}` : '';
        const paymentMethodDisplay = paymentMethod && last4 ? `${paymentMethod} ${last4}` : paymentMethod || 'Método de pago no disponible';
        
        console.log('Transaction ID:', payment.transaction_id);
        
        return `
            <div class="payment-item ${config.status}">
                <div class="payment-info">
                    <div class="payment-icon">
                        <i class='bx bxs-credit-card'></i>
                        <i class='bx ${config.secondIcon}'></i>
                    </div>
                    <div class="payment-details">
                        <h3>${productName}${interval ? ` - ${interval}` : ''}</h3>
                        <span class="payment-date">${formatDate(payment.updated_at)}</span>
                        <span class="payment-method">${paymentMethodDisplay}</span>
                    </div>
                </div>
                <div class="payment-status">
                    <div class="payment-amount-container">
                        <span class="payment-amount">${formatAmount(payment.amount, payment.currency_code)}</span>
                        <button class="action-btn" 
                            data-action="${config.actionType}"
                            ${payment.transaction_id ? `data-transaction-id="${payment.transaction_id}"` : ''}
                            title="${config.actionText}">
                            <i class='bx ${config.actionIcon}'></i>
                        </button>
                    </div>
                    <div class="status-badge ${config.status}">
                        <i class='bx ${config.statusIcon}'></i>
                        ${config.statusText}
                    </div>
                </div>
            </div>
        `;
    }

    handleFilter(e) {
        const filter = e.target.value;
        const payments = document.querySelectorAll('.payment-item');
        
        payments.forEach(payment => {
            const shouldShow = 
                filter === 'all' ||
                (filter === 'successful' && payment.classList.contains('success')) ||
                (filter === 'failed' && payment.classList.contains('failed'));
            
            payment.style.display = shouldShow ? 'flex' : 'none';
        });
        
        const filterTexts = {
            'all': 'Mostrando todas las transacciones',
            'successful': 'Mostrando solo transacciones exitosas',
            'failed': 'Mostrando solo transacciones fallidas'
        };
        
        showAlert(filterTexts[filter] || 'Filtro aplicado', 'info', 2000);
    }

    async loadPayments() {
        if (!this.paymentList) return;
        
        this.paymentList.innerHTML = this.showSkeletonLoading();

        try {
            const userId = await getUserId();
            if (!userId) {
                showAlert('No se pudo identificar al usuario', 'error');
                throw new Error('No se pudo obtener el ID del usuario');
            }

            const data = await LoadingOverlay.withLoading(async () => {
                return await getCachedData(
                    `payments_${userId}`,
                    async () => {
                        return await makeApiRequest(`/api/payment/user/transactions/${userId}`);
                    }
                );
            }, 'Cargando historial de pagos...');

            if (data.success && data.data.length > 0) {
                console.log('Transacciones recibidas:', data.data);
                
                const fragment = document.createDocumentFragment();
                const tempContainer = document.createElement('div');
                
                data.data.forEach(payment => {
                    tempContainer.innerHTML = this.createPaymentItemHTML(payment);
                    fragment.appendChild(tempContainer.firstElementChild);
                });

                this.paymentList.innerHTML = '';
                this.paymentList.appendChild(fragment);
            } else {
                this.paymentList.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-receipt'></i>
                        <h3>No hay transacciones</h3>
                        <p>No se encontraron pagos en tu historial. Cuando realices una compra, aparecerá aquí.</p>
                        <a href="/tienda" class="empty-state-btn">
                            <i class='bx bx-cart'></i>
                            Ir a la Tienda
                        </a>
                    </div>
                `;
                showAlert('No se encontraron transacciones en tu historial', 'info');
            }
        } catch (error) {
            console.error('Error completo:', error);
            this.paymentList.innerHTML = `
                <div class="error-message">
                    <i class='bx bx-error-circle'></i>
                    <p>Error al cargar el historial de pagos</p>
                    <button class="retry-button">
                        <i class='bx bx-refresh'></i>
                        Reintentar
                    </button>
                </div>
            `;
            showAlert('Error al cargar el historial de pagos', 'error');
        }
    }
}

// Estilos actualizados para el nuevo sistema
const styles = `
.skeleton {
    animation: loading 1.5s infinite;
}

.skeleton-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f0f0f0;
}

.skeleton-lines {
    flex: 1;
    margin-left: 12px;
}

.skeleton-text-long {
    height: 16px;
    background: #f0f0f0;
    margin-bottom: 8px;
    width: 80%;
    border-radius: 4px;
}

.skeleton-text-short {
    height: 16px;
    background: #f0f0f0;
    width: 60%;
    border-radius: 4px;
}

.skeleton-badge {
    width: 80px;
    height: 24px;
    background: #f0f0f0;
    border-radius: 12px;
}

@keyframes loading {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

.error-message {
    text-align: center;
    padding: 2rem;
}

.retry-button {
    margin-top: 1rem;
    padding: 0.8rem 1.5rem;
    background: var(--marron, #582f0e);
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(88, 47, 14, 0.2);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem auto 0;
}

.retry-button:hover {
    background: var(--marron-oscuro, #442409);
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(88, 47, 14, 0.3);
}

.payment-amount-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 50%;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
}

.action-btn i {
    font-size: 1.2rem;
    color: var(--marron, #582f0e);
}

.action-btn:hover {
    background: rgba(88, 47, 14, 0.1);
    transform: translateY(-2px);
}

.action-btn:hover i {
    color: var(--marron-oscuro, #442409);
}

[data-theme="dark"] .action-btn i {
    color: var(--secondary-color, #a4ac86);
}

[data-theme="dark"] .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .action-btn:hover i {
    color: #fff;
}

.payment-icon {
    position: relative;
    width: 50px;
    height: 50px;
    min-width: 50px;
    border-radius: 50%;
    background: var(--marron, #582f0e);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(88, 47, 14, 0.2);
    transition: all 0.3s ease;
    transform-style: preserve-3d;
    perspective: 200px;
}

.payment-item:hover .payment-icon {
    transform: rotateY(180deg);
}

.payment-icon i {
    font-size: 1.5rem;
    color: white;
    transition: all 0.3s ease;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.payment-icon i:first-child {
    transform: translate(-50%, -50%) rotateY(0deg);
    opacity: 1;
    backface-visibility: visible;
}

.payment-icon i:last-child {
    transform: translate(-50%, -50%) rotateY(180deg);
    opacity: 0;
    backface-visibility: visible;
}

.payment-item:hover .payment-icon i:first-child {
    opacity: 0;
}

.payment-item:hover .payment-icon i:last-child {
    opacity: 1;
}

.payment-method {
    font-size: 0.85rem;
    color: var(--text-color);
    opacity: 0.7;
    font-weight: 500;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1rem;
    text-align: center;
}

.empty-state i {
    font-size: 5rem;
    color: var(--marron, #582f0e);
    opacity: 0.5;
    margin-bottom: 1.5rem;
}

.empty-state h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--marron, #582f0e);
}

.empty-state p {
    max-width: 400px;
    margin-bottom: 1.5rem;
    line-height: 1.6;
    color: var(--text-color, #333);
    opacity: 0.8;
}

.empty-state-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    background: var(--marron, #582f0e);
    color: white;
    text-decoration: none;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(88, 47, 14, 0.2);
}

.empty-state-btn:hover {
    background: var(--marron-oscuro, #442409);
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(88, 47, 14, 0.3);
}

[data-theme="dark"] .empty-state i,
[data-theme="dark"] .empty-state h3 {
    color: var(--secondary-color, #a4ac86);
}

[data-theme="dark"] .skeleton-circle,
[data-theme="dark"] .skeleton-text-long,
[data-theme="dark"] .skeleton-text-short,
[data-theme="dark"] .skeleton-badge {
    background: #333;
}
`;

class CustomFilterSelect {
    constructor() {
        this.init();
    }

    init() {
        const selects = document.querySelectorAll('.payment-filter select');
        
        selects.forEach(select => {
            this.createCustomDropdown(select);
        });
    }

    createCustomDropdown(select) {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        
        const button = document.createElement('div');
        button.className = 'custom-select-button';
        button.innerHTML = `
            <span>${select.options[select.selectedIndex].text}</span>
            <i class='bx bx-chevron-down'></i>
        `;
        wrapper.appendChild(button);
        
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        wrapper.appendChild(dropdown);
        
        for (let i = 0; i < select.options.length; i++) {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.innerHTML = select.options[i].text;
            option.setAttribute('data-value', select.options[i].value);
            
            if (select.selectedIndex === i) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                select.value = option.getAttribute('data-value');
                
                button.querySelector('span').textContent = option.textContent;
                
                const event = new Event('change');
                select.dispatchEvent(event);
                
                dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                
                this.closeDropdown(dropdown);
            });
            
            dropdown.appendChild(option);
        }
        
        // Evento para abrir/cerrar el dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            document.querySelectorAll('.custom-select-dropdown.open').forEach(dd => {
                if (dd !== dropdown) {
                    dd.classList.remove('open');
                }
            });
            
            dropdown.classList.toggle('open');
            button.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            this.closeDropdown(dropdown);
            button.classList.remove('active');
        });
        
        select.style.display = 'none';
    }
    
    closeDropdown(dropdown) {
        dropdown.classList.remove('open');
        dropdown.parentNode.querySelector('.custom-select-button').classList.remove('active');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const customSelectStyles = document.createElement('style');
    customSelectStyles.textContent = `
        .custom-select-wrapper {
            position: relative;
            user-select: none;
            width: 200px;
        }
        
        .custom-select-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.8rem 1.5rem;
            border-radius: 25px;
            border: 2px solid rgba(88, 47, 14, 0.2);
            background: rgba(255, 255, 255, 0.7);
            color: var(--text-color);
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .custom-select-button i {
            font-size: 1.2rem;
            transition: transform 0.3s ease;
        }
        
        .custom-select-button.active i {
            transform: rotate(-180deg);
        }
        
        .custom-select-button:hover {
            border-color: var(--marron);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }
        
        .custom-select-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: var(--bg-color);
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
            z-index: 999;
            max-height: 0;
            opacity: 0;
            transform: translateY(-10px);
            transition: max-height 0.4s ease, opacity 0.3s ease, transform 0.3s ease;
        }
        
        .custom-select-dropdown.open {
            max-height: 300px;
            opacity: 1;
            transform: translateY(0);
        }
        
        .custom-select-option {
            padding: 12px 15px;
            cursor: pointer;
            transition: all 0.2s ease;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .custom-select-option:hover {
            background-color: var(--hover-color);
            padding-left: 20px;
        }
        
        .custom-select-option.selected {
            background-color: var(--marron);
            color: white;
            font-weight: 600;
        }
        
        [data-theme="dark"] .custom-select-button {
            background: rgba(40, 40, 40, 0.7);
            border-color: rgba(255, 255, 255, 0.15);
        }
        
        [data-theme="dark"] .custom-select-dropdown {
            background: var(--bg-color);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 768px) {
            .custom-select-wrapper {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(customSelectStyles);

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    LoadingOverlay.init();
    window.paymentHistory = new PaymentHistory();
    paymentHistory.loadPayments();
    
    setTimeout(() => {
        new CustomFilterSelect();
    }, 100);
    
    setTimeout(() => {
        showAlert('Historial de pagos cargado correctamente', 'success', 3000);
    }, 500);
});