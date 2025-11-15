// admin-panel.js - Panel de Administración JavaScript - VERSIÓN MEJORADA

(function() {
    'use strict';
    
    console.log('🔧 [ADMIN] Inicializando panel de administración... v2.1 - Event Listeners Mejorados');
    
    // ===== CONFIGURACIÓN ===== 
    const CONFIG = {
        API_BASE: '/api/admin/argentina',
        REFRESH_INTERVAL: 30000, // 30 segundos
        ITEMS_PER_PAGE: 20,
        POLLING_ENABLED: true
    };
    
    // ===== ESTADO GLOBAL =====
    const AppState = {
        currentSection: 'dashboard',
        transfers: [],
        payments: [],
        subscriptions: [],
        users: [],
        stats: {},
        pagination: {
            payments: { current: 1, total: 1, perPage: CONFIG.ITEMS_PER_PAGE },
            transfers: { current: 1, total: 1, perPage: CONFIG.ITEMS_PER_PAGE },
            subscriptions: { current: 1, total: 1, perPage: CONFIG.ITEMS_PER_PAGE },
            users: { current: 1, total: 1, perPage: 20 }
        },
        filters: {
            payments: { status: '', method: '', search: '' },
            transfers: { search: '' },
            subscriptions: { status: '', search: '' },
            users: { role: '', search: '' }
        },
        currentTransfer: null,
        refreshTimer: null,
        isMobile: window.innerWidth <= 992,
        lastUserSearch: null,
        sectionStates: new Map(),
        activeEventListeners: new Map()
    };
    
    // ===== ELEMENTOS DOM =====
    const Elements = {
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.content-section'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.querySelector('.admin-sidebar'),
        
        // Dashboard
        pendingTransfers: document.getElementById('pendingTransfers'),
        totalRevenue: document.getElementById('totalRevenue'),
        totalUsers: document.getElementById('totalUsers'),
        activeSubscriptions: document.getElementById('activeSubscriptions'),
        pendingCount: document.getElementById('pendingCount'),
        
        // Transfers
        transfersTableBody: document.getElementById('transfersTableBody'),
        transfersLoading: document.getElementById('transfersLoading'),
        transfersEmpty: document.getElementById('transfersEmpty'),
        transferSearch: document.getElementById('transferSearch'),
        refreshTransfers: document.getElementById('refreshTransfers'),
        
        // Payments
        paymentsTableBody: document.getElementById('paymentsTableBody'),
        paymentsSearch: document.getElementById('paymentsSearch'),
        paymentStatusFilter: document.getElementById('paymentStatusFilter'),
        paymentMethodFilter: document.getElementById('paymentMethodFilter'),
        paymentsInfo: document.getElementById('paymentsInfo'),
        paymentsPrevBtn: document.getElementById('paymentsPrevBtn'),
        paymentsNextBtn: document.getElementById('paymentsNextBtn'),
        paymentsPages: document.getElementById('paymentsPages'),
        
        transferModal: document.getElementById('transferModal'),
        transferModalBody: document.getElementById('transferModalBody'),
        closeTransferModal: document.getElementById('closeTransferModal'),
        approveTransferBtn: document.getElementById('approveTransferBtn'),
        rejectTransferBtn: document.getElementById('rejectTransferBtn'),
        
        rejectModal: document.getElementById('rejectModal'),
        closeRejectModal: document.getElementById('closeRejectModal'),
        rejectReason: document.getElementById('rejectReason'),
        cancelRejectBtn: document.getElementById('cancelRejectBtn'),
        confirmRejectBtn: document.getElementById('confirmRejectBtn'),
        
        // Users
        userSearchInput: document.getElementById('userSearchInput'),
        userSearchBtn: document.getElementById('userSearchBtn'),
        userResults: document.getElementById('userResults'),
        
        // Quick actions
        actionBtns: document.querySelectorAll('.action-btn')
    };
    
    // ===== UTILIDADES MEJORADAS =====
    const Utils = {
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS'
            }).format(amount);
        },
        
        formatDate: (dateString) => {
            return new Date(dateString).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        showNotification: (message, type = 'info', duration = 3000) => {
            // Prioridad 1: notification service
            if (window.notifyService && typeof window.notifyService.add === 'function') {
                return window.notifyService.add(message, type, duration);
            }
            // Prioridad 2: showAlert global
            else if (window.showAlert && typeof window.showAlert === 'function') {
                return window.showAlert(message, type, duration);
            }
            // Prioridad 3: Fallback básico mejorado
            else {
                console.log(`[${type.toUpperCase()}] ${message}`);
                
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#3498db'};
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    z-index: 10000;
                    font-weight: 500;
                    max-width: 300px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, duration);
            }
        },
        
        showLoadingNotification: (message = 'Cargando...') => {
            if (window.notifyService && typeof window.notifyService.loading === 'function') {
                return window.notifyService.loading(message);
            }
            return Utils.showNotification(message, 'info', 0);
        },
        
        updateNotification: (id, message, type = 'success', duration = 2000) => {
            if (window.notifyService && typeof window.notifyService.update === 'function') {
                return window.notifyService.update(id, message, type, duration);
            }
            return Utils.showNotification(message, type, duration);
        },
        
        removeNotification: (id) => {
            if (window.notifyService && typeof window.notifyService.remove === 'function') {
                return window.notifyService.remove(id);
            }
        },
        
        getStatusBadge: (status) => {
            const statusMap = {
                'pendiente': { class: 'status-pending', text: 'Pendiente' },
                'procesando': { class: 'status-processing', text: 'Procesando' },
                'completado': { class: 'status-completed', text: 'Completado' },
                'fallido': { class: 'status-failed', text: 'Fallido' },
                'en_revision_manual': { class: 'status-review', text: 'En Revisión' },
                'rechazado': { class: 'status-rejected', text: 'Rechazado' },
                'expirado': { class: 'status-failed', text: 'Expirado' }
            };
            
            const config = statusMap[status] || { class: 'status-pending', text: status };
            return `<span class="status-badge ${config.class}">${config.text}</span>`;
        },
        
        // Debounce
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        validateApiResponse: (response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        },
        
        parseTransferDetails: (transferDetails) => {
            try {
                if (!transferDetails) return {};
                
                if (typeof transferDetails === 'object') {
                    return transferDetails;
                }
                
                if (typeof transferDetails === 'string') {
                    return JSON.parse(transferDetails);
                }
                
                return {};
            } catch (error) {
                console.warn('Error parseando transfer_details:', error);
                return {};
            }
        },
        
        cleanupSectionEvents: (sectionName) => {
            const listeners = AppState.activeEventListeners.get(sectionName) || [];
            console.log(`🧹 [EVENTS] Limpiando ${listeners.length} event listeners de sección ${sectionName}`);
            
            listeners.forEach(({ element, event, handler }, index) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler);
                    console.log(`  ✅ Removido ${event} listener ${index + 1}/${listeners.length}`);
                } else {
                    console.warn(`  ⚠️ Elemento inválido en listener ${index + 1}:`, element);
                }
            });
            AppState.activeEventListeners.set(sectionName, []);
            console.log(`✅ [EVENTS] Limpieza completada para sección ${sectionName}`);
        },
        
        registerEventListener: (sectionName, element, event, handler) => {
            if (!element || typeof element.addEventListener !== 'function') {
                console.warn(`⚠️ [EVENTS] Elemento no válido para sección ${sectionName}:`, element);
                return;
            }
            
            console.log(`🔗 [EVENTS] Registrando ${event} en sección ${sectionName} para:`, element.id || element.tagName);
            
            element.addEventListener(event, handler);
            
            const listeners = AppState.activeEventListeners.get(sectionName) || [];
            listeners.push({ element, event, handler });
            AppState.activeEventListeners.set(sectionName, listeners);
        }
    };
    
    // ===== API SERVICE =====
    const ApiService = {
        // Método base para requests
        async request(endpoint, options = {}) {
            try {
                const url = `${CONFIG.API_BASE}${endpoint}`;
                const defaultOptions = {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                
                const response = await fetch(url, { ...defaultOptions, ...options });
                return await Utils.validateApiResponse(response);
            } catch (error) {
                console.error(`[API] Error en ${endpoint}:`, error);
                throw error;
            }
        },
        
        async getStats(period = 30) {
            return this.request(`/stats?period=${period}`);
        },
        
        async getTransfers(filters = {}) {
            const params = new URLSearchParams({
                status: 'en_revision_manual',
                method: 'bank_transfer',
                ...filters
            });
            return this.request(`/payments?${params}`);
        },
        
        async getPayments(page = 1, filters = {}) {
            const params = new URLSearchParams({
                page,
                limit: CONFIG.ITEMS_PER_PAGE,
                ...filters
            });
            return this.request(`/payments?${params}`);
        },
        
        async getPaymentDetails(paymentId) {
            return this.request(`/payments/${paymentId}`);
        },
        
        // Aprobar transferencia
        async approveTransfer(paymentId, notes = '') {
            return this.request(`/payments/${paymentId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ notes })
            });
        },
        
        async rejectTransfer(paymentId, reason) {
            return this.request(`/payments/${paymentId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
        },
        
        async getSubscriptions(page = 1, filters = {}) {
            const params = new URLSearchParams({
                page,
                limit: CONFIG.ITEMS_PER_PAGE,
                ...filters
            });
            return this.request(`/subscriptions?${params}`);
        },
        
        async updateSubscriptionStatus(subscriptionId, status, reason = '') {
            return this.request(`/subscriptions/${subscriptionId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, reason })
            });
        },
        
        async updateExpiredSubscriptions() {
            try {
                const response = await fetch('/api/admin/actualizar-suscripciones-vencidas', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return await Utils.validateApiResponse(response);
            } catch (error) {
                console.error('[API] Error actualizando suscripciones vencidas:', error);
                throw error;
            }
        },
        
        async searchUsers(filters = {}) {
            const params = new URLSearchParams(filters);
            return this.request(`/users/search?${params}`);
        },
        
        async getUserDetails(userId) {
            return this.request(`/users/${userId}`);
        }
    };

    // ===== NAVEGACIÓN MEJORADA =====
    const Navigation = {
        init() {
            this.bindEvents();
            this.setupMobile();
        },
        
        bindEvents() {
            // Navigation items
            Elements.navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = e.currentTarget.dataset.section;
                    this.navigateToSection(section);
                });
            });
            
            // Quick action buttons
            Elements.actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = e.currentTarget.dataset.action;
                    this.navigateToSection(action);
                });
            });
            
            // Mobile menu toggle
            if (Elements.menuToggle) {
                Elements.menuToggle.addEventListener('click', () => {
                    this.toggleMobileMenu();
                });
            }
        },
        
        navigateToSection(sectionName) {
            console.log(`🔧 [NAV] Navegando a: ${sectionName}`);
            
            if (AppState.currentSection && AppState.currentSection !== sectionName) {
                this.cleanupSection(AppState.currentSection);
            }
            
            // Update navigation
            Elements.navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.section === sectionName);
            });
            
            // Update sections
            Elements.sections.forEach(section => {
                section.classList.toggle('active', section.id === `${sectionName}-section`);
            });
            
            // Update state
            AppState.currentSection = sectionName;
            
            // Load section content
            this.loadSectionContent(sectionName);
            
            // Close mobile menu
            if (AppState.isMobile) {
                this.closeMobileMenu();
            }
        },
        
        cleanupSection(sectionName) {
            console.log(`🧹 [NAV] Limpiando sección: ${sectionName}`);
            
            Utils.cleanupSectionEvents(sectionName);
            
            this.closeAllModals();
            
            switch (sectionName) {
                case 'payments':
                    AppState.filters.payments = { status: '', method: '', search: '' };
                    AppState.pagination.payments.current = 1;
                    AppState.payments = []; // ✅ Limpiar datos existentes
                    
                    Payments.needsReinit = true;
                    
                    if (Elements.paymentsSearch) Elements.paymentsSearch.value = '';
                    if (Elements.paymentStatusFilter) Elements.paymentStatusFilter.value = '';
                    if (Elements.paymentMethodFilter) Elements.paymentMethodFilter.value = '';
                    
                    if (Elements.paymentsTableBody) {
                        Elements.paymentsTableBody.innerHTML = '';
                    }
                    break;
                    
                case 'transfers':
                    AppState.filters.transfers = { search: '' };
                    AppState.transfers = []; // ✅ Limpiar datos existentes
                    
                    Transfers.needsReinit = true;
                    
                    if (Elements.transferSearch) Elements.transferSearch.value = '';
                    
                    if (Elements.transfersTableBody) {
                        Elements.transfersTableBody.innerHTML = '';
                    }
                    break;
                    
                case 'subscriptions':
                    AppState.filters.subscriptions = { status: '', search: '' };
                    AppState.pagination.subscriptions.current = 1;
                    AppState.subscriptions = [];
                    
                    Subscriptions.isInitialized = false;
                    
                    const subscriptionSearch = document.getElementById('subscriptionSearch');
                    const subscriptionStatusFilter = document.getElementById('subscriptionStatusFilter');
                    if (subscriptionSearch) subscriptionSearch.value = '';
                    if (subscriptionStatusFilter) subscriptionStatusFilter.value = '';
                    break;
                    
                case 'users':
                    AppState.filters.users = { role: '', search: '' };
                    AppState.pagination.users.current = 1;
                    AppState.lastUserSearch = null;
                    AppState.users = []; // ✅ Limpiar datos existentes
                    
                    Users.needsReinit = true;
                    
                    if (Elements.userSearchInput) Elements.userSearchInput.value = '';
                    const roleFilter = document.getElementById('roleFilter');
                    if (roleFilter) roleFilter.value = '';
                    
                    const usersPagination = document.getElementById('usersPagination');
                    if (usersPagination) usersPagination.style.display = 'none';
                    
                    if (Elements.userResults) {
                        Elements.userResults.innerHTML = `
                            <div class="empty-state">
                                <i class='bx bx-search-alt-2'></i>
                                <h3>Búsqueda de Usuarios</h3>
                                <p>Utiliza el buscador para encontrar usuarios específicos</p>
                            </div>
                        `;
                    }
                    break;
            }
            
            AppState.sectionStates.set(sectionName, {
                cleanedAt: Date.now(),
                filters: { ...AppState.filters[sectionName] },
                pagination: { ...AppState.pagination[sectionName] }
            });
        },

        closeAllModals() {
            const modals = document.querySelectorAll('.modal-overlay.show');
            modals.forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';
        },
        
        async loadSectionContent(sectionName) {
            try {
                switch (sectionName) {
                    case 'dashboard':
                        await Dashboard.load();
                        break;
                    case 'transfers':
                        await Transfers.load();
                        break;
                    case 'payments':
                        await Payments.load();
                        break;
                    case 'subscriptions':
                        await Subscriptions.load();
                        break;
                    case 'users':
                        await Users.load();
                        break;
                }
                
                setTimeout(() => {
                    this.verifyEventListeners(sectionName);
                }, 500);
                
            } catch (error) {
                console.error(`[NAV] Error cargando sección ${sectionName}:`, error);
                Utils.showNotification(`Error cargando ${sectionName}`, 'error');
            }
        },
        
        verifyEventListeners(sectionName) {
            const listeners = AppState.activeEventListeners.get(sectionName) || [];
            console.log(`🔍 [NAV] Verificando ${listeners.length} event listeners en sección ${sectionName}`);
            
            if (listeners.length === 0) {
                console.warn(`⚠️ [NAV] ADVERTENCIA: No hay event listeners registrados para ${sectionName}`);
            } else {
                console.log(`✅ [NAV] Event listeners registrados correctamente para ${sectionName}`);
            }
            
            // Verificaciones específicas por sección
            if (sectionName === 'subscriptions') {
                const updateBtn = document.getElementById('updateExpiredBtn');
                if (updateBtn) {
                    console.log('✅ [NAV] Botón "Actualizar Vencidas" presente en DOM');
                } else {
                    console.error('❌ [NAV] Botón "Actualizar Vencidas" NO encontrado en DOM');
                }
            }
            
            if (sectionName === 'payments') {
                const tableBody = document.getElementById('paymentsTableBody');
                if (tableBody) {
                    console.log('✅ [NAV] Tabla de pagos presente en DOM');
                } else {
                    console.error('❌ [NAV] Tabla de pagos NO encontrada en DOM');
                }
            }
        },
        
        setupMobile() {
            window.addEventListener('resize', Utils.debounce(() => {
                AppState.isMobile = window.innerWidth <= 992;
            }, 250));
        },
        
        toggleMobileMenu() {
            Elements.sidebar.classList.toggle('mobile-open');
        },
        
        closeMobileMenu() {
            Elements.sidebar.classList.remove('mobile-open');
        }
    };
    
    // ===== DASHBOARD =====
    const Dashboard = {
        async load() {
            console.log('🔧 [DASHBOARD] Cargando estadísticas...');
            
            const loadingId = Utils.showLoadingNotification('Cargando estadísticas...');
            
            try {
                const stats = await ApiService.getStats();
                this.renderStats(stats.data);
                AppState.stats = stats.data;
                
                Utils.updateNotification(loadingId, 'Estadísticas cargadas', 'success');
                
            } catch (error) {
                console.error('[DASHBOARD] Error:', error);
                Utils.updateNotification(loadingId, 'Error cargando estadísticas', 'error');
            }
        },
        
        renderStats(data) {
            const summary = data.summary || {};
            
            if (Elements.pendingTransfers) {
                Elements.pendingTransfers.textContent = summary.pending_transfers || '0';
            }
            
            if (Elements.totalUsers) {
                Elements.totalUsers.textContent = summary.total_users || '0';
            }
            
            if (Elements.activeSubscriptions) {
                Elements.activeSubscriptions.textContent = summary.active_subscriptions || '0';
            }
            
            if (Elements.pendingCount) {
                const pendingCount = summary.pending_transfers || 0;
                Elements.pendingCount.textContent = pendingCount;
                Elements.pendingCount.style.display = pendingCount > 0 ? 'block' : 'none';
            }
        }
    };
    
    // ===== TRANSFERENCIAS MEJORADAS =====
    const Transfers = {
        needsReinit: false, // ✅ NUEVO: Flag de reinicialización
        
        init() {
            this.bindEvents();
        },
        
        async load() {
            console.log('🔧 [TRANSFERS] Cargando transferencias...');
            
            Utils.cleanupSectionEvents('transfers');
            
            console.log('🔄 [TRANSFERS] Re-inicializando eventos...');
            this.bindEvents();
            this.needsReinit = false;
            
            // Siempre cargar datos frescos
            await this.loadData();
        },

        async loadData() {
            this.showLoading(true);
            
            try {
                const response = await ApiService.getTransfers(AppState.filters.transfers);
                AppState.transfers = response.data.payments || [];
                this.render();
            } catch (error) {
                console.error('[TRANSFERS] Error:', error);
                Utils.showNotification('Error cargando transferencias', 'error');
            } finally {
                this.showLoading(false);
            }
        },
        
        bindEvents() {
            console.log('🔧 [TRANSFERS] Vinculando eventos...');
            
            // Search
            if (Elements.transferSearch) {
                const searchHandler = Utils.debounce((e) => {
                    AppState.filters.transfers.search = e.target.value;
                    this.loadData(); // ✅ Cambiar a loadData
                }, 500);
                
                Utils.registerEventListener('transfers', Elements.transferSearch, 'input', searchHandler);
            }
            
            // Refresh button
            if (Elements.refreshTransfers) {
                const refreshHandler = () => this.loadData(); // ✅ Cambiar a loadData
                Utils.registerEventListener('transfers', Elements.refreshTransfers, 'click', refreshHandler);
            }
            
            if (Elements.transfersTableBody) {
                console.log('✅ [TRANSFERS] Vinculando eventos de tabla...');
                const tableHandler = (e) => {
                    const button = e.target.closest('[data-action]');
                    if (!button) return;
                    
                    const action = button.dataset.action;
                    const paymentId = button.dataset.paymentId;
                    
                    console.log(`🔧 [TRANSFERS] Botón clickeado - Acción: ${action}, ID: ${paymentId}`);
                    
                    if (action === 'view-details' && paymentId) {
                        this.showDetails(parseInt(paymentId));
                    }
                };
                
                Utils.registerEventListener('transfers', Elements.transfersTableBody, 'click', tableHandler);
            } else {
                console.warn('⚠️ [TRANSFERS] Tabla de transferencias NO encontrada');
            }
        },
        
        render() {
            if (!Elements.transfersTableBody) return;
            
            const transfers = AppState.transfers;
            
            if (transfers.length === 0) {
                Elements.transfersTableBody.innerHTML = '';
                this.showEmpty(true);
                return;
            }
            
            this.showEmpty(false);
            
            Elements.transfersTableBody.innerHTML = transfers.map(transfer => {
                const transferDetails = Utils.parseTransferDetails(transfer.transfer_details);
                
                return `
                    <tr>
                        <td>
                            <div>
                                <strong>${transfer.email}</strong><br>
                                <small>${transfer.nombres} ${transfer.apellidos}</small>
                            </div>
                        </td>
                        <td>${transfer.carrera_nombre || 'N/A'}</td>
                        <td><strong>${Utils.formatCurrency(transfer.amount)}</strong></td>
                        <td>${transferDetails.transferDate ? Utils.formatDate(transferDetails.transferDate) : 'N/A'}</td>
                        <td>
                            ${transfer.transfer_image_url ? 
                                `<a href="${transfer.transfer_image_url}" target="_blank" class="btn btn-sm btn-outline">
                                    <i class='bx bx-image'></i> Ver
                                </a>` : 
                                '<span class="text-muted">Sin imagen</span>'
                            }
                        </td>
                        <td>${Utils.getStatusBadge(transfer.payment_status)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" data-action="view-details" data-payment-id="${transfer.id}">
                                    <i class='bx bx-show'></i> Ver
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        },
        
        async showDetails(paymentId) {
            try {
                console.log(`🔧 [TRANSFERS] Mostrando detalles: ${paymentId}`);
                
                this.renderModalLoader();
                Modals.show('transferModal');
                
                const response = await ApiService.getPaymentDetails(paymentId);
                const payment = response.data.payment;
                
                AppState.currentTransfer = payment;
                this.renderModal(payment);
                
            } catch (error) {
                console.error('[TRANSFERS] Error obteniendo detalles:', error);
                Utils.showNotification('Error obteniendo detalles', 'error');
                Modals.hide('transferModal');
            }
        },

        renderModalLoader() {
            if (!Elements.transferModalBody) return;
            
            Elements.transferModalBody.innerHTML = `
                <div class="loading-state" style="padding: 3rem; text-align: center;">
                    <i class='bx bx-loader-alt' style="font-size: 3rem; color: var(--admin-primary); animation: spin 1s linear infinite;"></i>
                    <h3 style="margin: 1rem 0 0.5rem; color: var(--admin-primary);">Cargando detalles</h3>
                    <p>Obteniendo información de la transferencia...</p>
                </div>
            `;
            
            const approveBtn = document.getElementById('approveTransferBtn');
            const rejectBtn = document.getElementById('rejectTransferBtn');
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'none';
        },

        renderModal(payment) {
            if (!Elements.transferModalBody || !payment) return;
            
            const transferDetails = Utils.parseTransferDetails(payment.transfer_details);
            
            Elements.transferModalBody.innerHTML = `
                <div class="transfer-details">
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Usuario</span>
                            <span class="detail-value">${payment.email}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Nombre Completo</span>
                            <span class="detail-value">${payment.nombres} ${payment.apellidos}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Carrera</span>
                            <span class="detail-value">${payment.carrera_nombre}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Plan</span>
                            <span class="detail-value">${payment.billing_cycle === 'month' ? 'Mensual' : 'Anual'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Monto</span>
                            <span class="detail-value"><strong>${Utils.formatCurrency(payment.amount)}</strong></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Estado</span>
                            <span class="detail-value">${Utils.getStatusBadge(payment.payment_status)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Fecha de Transferencia</span>
                            <span class="detail-value">${transferDetails.transferDate ? Utils.formatDate(transferDetails.transferDate) : 'No especificada'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Titular de la Cuenta</span>
                            <span class="detail-value">${transferDetails.accountHolder || 'No especificado'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Número de Referencia</span>
                            <span class="detail-value">${transferDetails.referenceNumber || 'No especificado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Fecha de Solicitud</span>
                            <span class="detail-value">${Utils.formatDate(payment.created_at)}</span>
                        </div>
                    </div>
                    
                    ${payment.transfer_image_url ? `
                        <div class="transfer-image">
                            <span class="detail-label">Comprobante</span>
                            <div class="mt-2">
                                <a href="${payment.transfer_image_url}" target="_blank" class="image-link">
                                    <i class='bx bx-image'></i>
                                    Abrir Comprobante
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${payment.admin_notes ? `
                        <div class="detail-item">
                            <span class="detail-label">Notas del Admin</span>
                            <span class="detail-value">${payment.admin_notes}</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.updateModalButtons(payment.payment_status);
        },
        
        async approve(notes = '') {
            if (!AppState.currentTransfer) return;
            
            const approveBtn = document.getElementById('approveTransferBtn');
            const rejectBtn = document.getElementById('rejectTransferBtn');
            
            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.innerHTML = '<i class="bx bx-loader-alt" style="animation: spin 1s linear infinite;"></i> Aprobando...';
            }
            if (rejectBtn) {
                rejectBtn.disabled = true;
            }
            
            const loadingId = Utils.showLoadingNotification('Aprobando transferencia...');
            
            try {
                console.log(`🔧 [TRANSFERS] Aprobando: ${AppState.currentTransfer.id}`);
                
                await ApiService.approveTransfer(AppState.currentTransfer.id, notes);
                
                Utils.updateNotification(loadingId, 'Transferencia aprobada exitosamente', 'success');
                Modals.hide('transferModal');
                
                await this.loadData(); // ✅ Cambiar a loadData
                await Dashboard.load();
                
            } catch (error) {
                console.error('[TRANSFERS] Error aprobando:', error);
                Utils.updateNotification(loadingId, 'Error al aprobar transferencia', 'error');
            } finally {
                if (approveBtn) {
                    approveBtn.disabled = false;
                    approveBtn.innerHTML = '<i class="bx bx-check"></i> Aprobar';
                }
                if (rejectBtn) {
                    rejectBtn.disabled = false;
                }
            }
        },
        
        async reject(reason) {
            if (!AppState.currentTransfer || !reason.trim()) return;
            
            const confirmBtn = document.getElementById('confirmRejectBtn');
            const cancelBtn = document.getElementById('cancelRejectBtn');
            
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="bx bx-loader-alt" style="animation: spin 1s linear infinite;"></i> Rechazando...';
            }
            if (cancelBtn) {
                cancelBtn.disabled = true;
            }
            
            const loadingId = Utils.showLoadingNotification('Rechazando transferencia...');
            
            try {
                console.log(`🔧 [TRANSFERS] Rechazando: ${AppState.currentTransfer.id}`);
                
                await ApiService.rejectTransfer(AppState.currentTransfer.id, reason);
                
                Utils.updateNotification(loadingId, 'Transferencia rechazada', 'warning');
                Modals.hide('rejectModal');
                Modals.hide('transferModal');
                
                await this.loadData(); // ✅ Cambiar a loadData
                await Dashboard.load();
                
            } catch (error) {
                console.error('[TRANSFERS] Error rechazando:', error);
                Utils.updateNotification(loadingId, 'Error al rechazar transferencia', 'error');
            } finally {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="bx bx-x"></i> Confirmar Rechazo';
                }
                if (cancelBtn) {
                    cancelBtn.disabled = false;
                }
            }
        },
        
        showLoading(show) {
            if (Elements.transfersLoading) {
                Elements.transfersLoading.style.display = show ? 'block' : 'none';
            }
        },
        
        showEmpty(show) {
            if (Elements.transfersEmpty) {
                Elements.transfersEmpty.style.display = show ? 'block' : 'none';
            }
        },

        updateModalButtons(paymentStatus) {
            const approveBtn = document.getElementById('approveTransferBtn');
            const rejectBtn = document.getElementById('rejectTransferBtn');
            
            const showButtons = paymentStatus === 'en_revision_manual';
            
            if (approveBtn) {
                approveBtn.style.display = showButtons ? 'flex' : 'none';
            }
            if (rejectBtn) {
                rejectBtn.style.display = showButtons ? 'flex' : 'none';
            }
            
            console.log(`🔧 [TRANSFERS] Botones ${showButtons ? 'mostrados' : 'ocultos'} para estado: ${paymentStatus}`);
        }
    };
    
    // ===== PAGOS MEJORADOS =====
    const Payments = {
        needsReinit: false, // ✅ NUEVO: Flag de reinicialización
        
        init() {
            this.bindEvents();
        },
        
        async load() {
            console.log('🔧 [PAYMENTS] Cargando pagos...');
            
            Utils.cleanupSectionEvents('payments');
            
            console.log('🔄 [PAYMENTS] Re-inicializando eventos...');
            this.bindEvents();
            this.needsReinit = false;
            
            // Siempre cargar datos frescos
            await this.loadData();
        },

        async loadData() {
            const loadingId = Utils.showLoadingNotification('Cargando pagos...');
            
            try {
                const response = await ApiService.getPayments(
                    AppState.pagination.payments.current,
                    AppState.filters.payments
                );
                
                AppState.payments = response.data.payments || [];
                AppState.pagination.payments = {
                    current: response.data.pagination.current_page,
                    total: response.data.pagination.total_pages,
                    perPage: response.data.pagination.per_page,
                    totalRecords: response.data.pagination.total_records
                };
                
                this.render();
                this.updatePagination();
                
                Utils.updateNotification(loadingId, 'Pagos cargados', 'success');
                
            } catch (error) {
                console.error('[PAYMENTS] Error:', error);
                Utils.updateNotification(loadingId, 'Error cargando pagos', 'error');
            }
        },
        
        
        bindEvents() {
            console.log('🔧 [PAYMENTS] Vinculando eventos...');
            
            // Filters
            if (Elements.paymentsSearch) {
                const searchHandler = Utils.debounce((e) => {
                    AppState.filters.payments.search = e.target.value;
                    AppState.pagination.payments.current = 1;
                    this.loadData(); // ✅ Cambiar a loadData
                }, 500);
                
                Utils.registerEventListener('payments', Elements.paymentsSearch, 'input', searchHandler);
            }
            
            if (Elements.paymentStatusFilter) {
                const statusHandler = (e) => {
                    AppState.filters.payments.status = e.target.value;
                    AppState.pagination.payments.current = 1;
                    this.loadData(); // ✅ Cambiar a loadData
                };
                
                Utils.registerEventListener('payments', Elements.paymentStatusFilter, 'change', statusHandler);
            }
            
            if (Elements.paymentMethodFilter) {
                const methodHandler = (e) => {
                    AppState.filters.payments.method = e.target.value;
                    AppState.pagination.payments.current = 1;
                    this.loadData(); // ✅ Cambiar a loadData
                };
                
                Utils.registerEventListener('payments', Elements.paymentMethodFilter, 'change', methodHandler);
            }
            
            // Pagination
            if (Elements.paymentsPrevBtn) {
                const prevHandler = () => {
                    if (AppState.pagination.payments.current > 1) {
                        AppState.pagination.payments.current--;
                        this.loadData(); // ✅ Cambiar a loadData
                    }
                };
                
                Utils.registerEventListener('payments', Elements.paymentsPrevBtn, 'click', prevHandler);
            }
            
            if (Elements.paymentsNextBtn) {
                const nextHandler = () => {
                    if (AppState.pagination.payments.current < AppState.pagination.payments.total) {
                        AppState.pagination.payments.current++;
                        this.loadData(); // ✅ Cambiar a loadData
                    }
                };
                
                Utils.registerEventListener('payments', Elements.paymentsNextBtn, 'click', nextHandler);
            }
            
            // Page numbers
            if (Elements.paymentsPages) {
                const pageHandler = (e) => {
                    const pageButton = e.target.closest('.page-number');
                    if (!pageButton) return;
                    
                    const page = parseInt(pageButton.dataset.page);
                    if (page && !isNaN(page)) {
                        this.goToPage(page);
                    }
                };
                
                Utils.registerEventListener('payments', Elements.paymentsPages, 'click', pageHandler);
            }
            
            if (Elements.paymentsTableBody) {
                console.log('✅ [PAYMENTS] Vinculando eventos de tabla...');
                const tableHandler = (e) => {
                    const button = e.target.closest('[data-action]');
                    if (!button) return;
                    
                    const action = button.dataset.action;
                    const paymentId = button.dataset.paymentId;
                    
                    console.log(`🔧 [PAYMENTS] Botón clickeado - Acción: ${action}, ID: ${paymentId}`);
                    
                    if (action === 'view-details' && paymentId) {
                        this.showDetails(parseInt(paymentId));
                    }
                };
                
                Utils.registerEventListener('payments', Elements.paymentsTableBody, 'click', tableHandler);
            } else {
                console.warn('⚠️ [PAYMENTS] Tabla de pagos NO encontrada');
            }
        },
        
        render() {
            if (!Elements.paymentsTableBody) return;
            
            const payments = AppState.payments;
            
            Elements.paymentsTableBody.innerHTML = payments.map(payment => `
                <tr>
                    <td><strong>#${payment.id}</strong></td>
                    <td>
                        <div>
                            <strong>${payment.email}</strong><br>
                            <small>${payment.nombres} ${payment.apellidos}</small>
                        </div>
                    </td>
                    <td><strong>${Utils.formatCurrency(payment.amount)}</strong></td>
                    <td>
                        ${payment.payment_method === 'uala_bis' ? 'Ualá Bis' : 
                          payment.payment_method === 'bank_transfer' ? 'Transferencia' : 
                          payment.payment_method}
                    </td>
                    <td>${Utils.getStatusBadge(payment.payment_status)}</td>
                    <td>${Utils.formatDate(payment.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary" data-action="view-details" data-payment-id="${payment.id}">
                                <i class='bx bx-show'></i> Ver
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },
        
        async showDetails(paymentId) {
            try {
                console.log(`🔧 [PAYMENTS] Mostrando detalles: ${paymentId}`);
                
                Transfers.renderModalLoader();
                Modals.show('transferModal');
                
                const response = await ApiService.getPaymentDetails(paymentId);
                const payment = response.data.payment;
                
                AppState.currentTransfer = payment;
                Transfers.renderModal(payment);
                
            } catch (error) {
                console.error('[PAYMENTS] Error obteniendo detalles:', error);
                Utils.showNotification('Error obteniendo detalles', 'error');
                Modals.hide('transferModal');
            }
        },
        
        updatePagination() {
            const pagination = AppState.pagination.payments;
            
            if (Elements.paymentsInfo) {
                const start = ((pagination.current - 1) * pagination.perPage) + 1;
                const end = Math.min(pagination.current * pagination.perPage, pagination.totalRecords);
                Elements.paymentsInfo.textContent = 
                    `Mostrando ${start}-${end} de ${pagination.totalRecords} pagos`;
            }
            
            if (Elements.paymentsPrevBtn) {
                Elements.paymentsPrevBtn.disabled = pagination.current <= 1;
            }
            
            if (Elements.paymentsNextBtn) {
                Elements.paymentsNextBtn.disabled = pagination.current >= pagination.total;
            }
            
            if (Elements.paymentsPages) {
                Elements.paymentsPages.innerHTML = this.generatePageNumbers();
            }
        },
        
        generatePageNumbers() {
            const pagination = AppState.pagination.payments;
            const current = pagination.current;
            const total = pagination.total;
            
            let pages = [];
            
            if (current > 3) {
                pages.push(1);
                if (current > 4) pages.push('...');
            }
            
            for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
                pages.push(i);
            }
            
            if (current < total - 2) {
                if (current < total - 3) pages.push('...');
                pages.push(total);
            }
            
            return pages.map(page => {
                if (page === '...') {
                    return '<span class="page-ellipsis">...</span>';
                }
                
                const isActive = page === current;
                return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
            }).join('');
        },
        
        goToPage(page) {
            AppState.pagination.payments.current = page;
            this.loadData(); // ✅ Cambiar a loadData
        }
    };
    
    // ===== SUSCRIPCIONES MEJORADAS =====
    const Subscriptions = {
        isInitialized: false,
        
        init() {
            if (this.isInitialized) {
                console.log('🔧 [SUBSCRIPTIONS] Ya inicializado, omitiendo...');
                return;
            }
            
            console.log('🔧 [SUBSCRIPTIONS] Inicializando...');
            this.isInitialized = true;
        },

        async load() {
            console.log('🔧 [SUBSCRIPTIONS] Cargando suscripciones...');
            
            const section = document.getElementById('subscriptions-section');
            const existingTable = document.getElementById('subscriptionsTableBody');
            
            Utils.cleanupSectionEvents('subscriptions');
            
            console.log('🔄 [SUBSCRIPTIONS] Recreando estructura de sección...');
            this.createSubscriptionsSection();
            this.isInitialized = true;
            
            // Siempre cargar datos frescos
            await this.loadData();
        },

        async loadData() {
            this.showLoading(true);
            
            const loadingId = Utils.showLoadingNotification('Cargando suscripciones...');
            
            try {
                AppState.pagination.subscriptions = AppState.pagination.subscriptions || { current: 1, total: 1, perPage: CONFIG.ITEMS_PER_PAGE };
                AppState.filters.subscriptions = AppState.filters.subscriptions || {};
                
                const response = await ApiService.getSubscriptions(
                    AppState.pagination.subscriptions.current,
                    AppState.filters.subscriptions
                );
                
                AppState.subscriptions = response.data.subscriptions || [];
                AppState.pagination.subscriptions = {
                    current: response.data.pagination.current_page,
                    total: response.data.pagination.total_pages,
                    perPage: response.data.pagination.per_page,
                    totalRecords: response.data.pagination.total_records
                };
                
                this.render();
                this.updatePagination();
                
                Utils.updateNotification(loadingId, 'Suscripciones cargadas', 'success');
                
            } catch (error) {
                console.error('[SUBSCRIPTIONS] Error:', error);
                Utils.updateNotification(loadingId, 'Error cargando suscripciones', 'error');
            } finally {
                this.showLoading(false);
            }
        },

        bindEvents() {
            console.log('🔧 [SUBSCRIPTIONS] Vinculando eventos...');
            
            const subscriptionSearch = document.getElementById('subscriptionSearch');
            const subscriptionStatusFilter = document.getElementById('subscriptionStatusFilter');
            const updateExpiredBtn = document.getElementById('updateExpiredBtn'); // ✅ NUEVO: Botón para actualización manual
            
            console.log('🔍 [SUBSCRIPTIONS] Elementos encontrados:', {
                search: !!subscriptionSearch,
                filter: !!subscriptionStatusFilter,
                updateBtn: !!updateExpiredBtn
            });
            
            if (subscriptionSearch) {
                const searchHandler = Utils.debounce((e) => {
                    AppState.filters.subscriptions = AppState.filters.subscriptions || {};
                    AppState.filters.subscriptions.search = e.target.value;
                    AppState.pagination.subscriptions.current = 1;
                    this.loadData();
                }, 500);
                
                Utils.registerEventListener('subscriptions', subscriptionSearch, 'input', searchHandler);
            }
            
            if (subscriptionStatusFilter) {
                const statusHandler = (e) => {
                    AppState.filters.subscriptions = AppState.filters.subscriptions || {};
                    AppState.filters.subscriptions.status = e.target.value;
                    AppState.pagination.subscriptions.current = 1;
                    this.loadData();
                };
                
                Utils.registerEventListener('subscriptions', subscriptionStatusFilter, 'change', statusHandler);
            }

            if (updateExpiredBtn) {
                console.log('✅ [SUBSCRIPTIONS] Botón "Actualizar Vencidas" encontrado, vinculando evento...');
                const updateHandler = () => {
                    console.log('🔧 [SUBSCRIPTIONS] Botón "Actualizar Vencidas" clickeado');
                    this.updateExpiredSubscriptions();
                };
                Utils.registerEventListener('subscriptions', updateExpiredBtn, 'click', updateHandler);
            } else {
                console.warn('⚠️ [SUBSCRIPTIONS] Botón "Actualizar Vencidas" NO encontrado');
            }

            // Paginación
            const subscriptionsPrevBtn = document.getElementById('subscriptionsPrevBtn');
            const subscriptionsNextBtn = document.getElementById('subscriptionsNextBtn');
            
            if (subscriptionsPrevBtn) {
                const prevHandler = () => {
                    if (AppState.pagination.subscriptions.current > 1) {
                        AppState.pagination.subscriptions.current--;
                        this.loadData();
                    }
                };
                
                Utils.registerEventListener('subscriptions', subscriptionsPrevBtn, 'click', prevHandler);
            }
            
            if (subscriptionsNextBtn) {
                const nextHandler = () => {
                    if (AppState.pagination.subscriptions.current < AppState.pagination.subscriptions.total) {
                        AppState.pagination.subscriptions.current++;
                        this.loadData();
                    }
                };
                
                Utils.registerEventListener('subscriptions', subscriptionsNextBtn, 'click', nextHandler);
            }

            // Page numbers
            const subscriptionsPages = document.getElementById('subscriptionsPages');
            if (subscriptionsPages) {
                const pageHandler = (e) => {
                    const pageButton = e.target.closest('.page-number');
                    if (!pageButton) return;
                    
                    const page = parseInt(pageButton.dataset.page);
                    if (page && !isNaN(page)) {
                        this.goToPage(page);
                    }
                };
                
                Utils.registerEventListener('subscriptions', subscriptionsPages, 'click', pageHandler);
            }

            // Table events
            const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
            if (subscriptionsTableBody) {
                const tableHandler = (e) => {
                    const button = e.target.closest('[data-action]');
                    if (!button) return;
                    
                    const action = button.dataset.action;
                    const subscriptionId = button.dataset.subscriptionId;
                    const currentStatus = button.dataset.currentStatus;
                    
                    if (action && subscriptionId) {
                        this.handleSubscriptionAction(action, parseInt(subscriptionId), currentStatus);
                    }
                };
                
                Utils.registerEventListener('subscriptions', subscriptionsTableBody, 'click', tableHandler);
            }
        },

        async updateExpiredSubscriptions() {
            const updateExpiredBtn = document.getElementById('updateExpiredBtn');
            
            if (updateExpiredBtn) {
                updateExpiredBtn.disabled = true;
                updateExpiredBtn.innerHTML = '<i class="bx bx-loader-alt" style="animation: spin 1s linear infinite;"></i> Actualizando...';
            }
            
            const loadingId = Utils.showLoadingNotification('Actualizando suscripciones vencidas...');
            
            try {
                console.log('🔧 [SUBSCRIPTIONS] Ejecutando actualización manual de suscripciones vencidas...');
                
                const response = await ApiService.updateExpiredSubscriptions();
                
                if (response.success) {
                    const message = response.message || 'Suscripciones actualizadas correctamente';
                    Utils.updateNotification(loadingId, message, 'success');
                    
                    // Recargar datos para mostrar cambios
                    await this.loadData();
                    
                    // También recargar dashboard para actualizar estadísticas
                    if (AppState.currentSection === 'subscriptions') {
                        await Dashboard.load();
                    }
                } else {
                    Utils.updateNotification(loadingId, response.message || 'Error en la actualización', 'warning');
                }
                
            } catch (error) {
                console.error('[SUBSCRIPTIONS] Error actualizando suscripciones vencidas:', error);
                Utils.updateNotification(loadingId, 'Error al actualizar suscripciones vencidas', 'error');
            } finally {
                if (updateExpiredBtn) {
                    updateExpiredBtn.disabled = false;
                    updateExpiredBtn.innerHTML = '<i class="bx bx-refresh"></i> Actualizar Vencidas';
                }
            }
        },

        render() {
            const subscriptionsTableBody = document.getElementById('subscriptionsTableBody');
            if (!subscriptionsTableBody) {
                console.warn('[SUBSCRIPTIONS] Tabla no encontrada, recreando sección...');
                this.createSubscriptionsSection();
                return;
            }
            
            const subscriptions = AppState.subscriptions || [];
            
            if (subscriptions.length === 0) {
                subscriptionsTableBody.innerHTML = '';
                this.showEmpty(true);
                return;
            }
            
            this.showEmpty(false);
            
            subscriptionsTableBody.innerHTML = subscriptions.map(subscription => `
                <tr>
                    <td><strong>#${subscription.id}</strong></td>
                    <td>
                        <div>
                            <strong>${subscription.email}</strong><br>
                            <small>${subscription.nombres} ${subscription.apellidos}</small>
                        </div>
                    </td>
                    <td>${subscription.carrera_nombre || 'N/A'}</td>
                    <td>
                        <strong>${subscription.amount ? Utils.formatCurrency(subscription.amount) : 'N/A'}</strong><br>
                        <small>${subscription.billing_cycle === 'month' ? 'Mensual' : 'Anual'}</small>
                    </td>
                    <td>${this.getSubscriptionStatusBadge(subscription.status)}</td>
                    <td>
                        ${subscription.start_date ? Utils.formatDate(subscription.start_date) : 'N/A'}<br>
                        <small>Hasta: ${subscription.end_date ? Utils.formatDate(subscription.end_date) : 'N/A'}</small>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${this.getSubscriptionActionButtons(subscription)}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        getSubscriptionStatusBadge(status) {
            const statusMap = {
                'activo': { class: 'status-completed', text: 'Activo' },
                'pausado': { class: 'status-warning', text: 'Pausado' },
                'cancelado': { class: 'status-failed', text: 'Cancelado' },
                'expirado': { class: 'status-rejected', text: 'Expirado' }
            };
            
            const config = statusMap[status] || { class: 'status-pending', text: status };
            return `<span class="status-badge ${config.class}">${config.text}</span>`;
        },

        getSubscriptionActionButtons(subscription) {
            const buttons = [];
            
            if (subscription.status === 'activo') {
                buttons.push(`
                    <button class="btn btn-sm btn-danger" 
                            data-action="cancel" 
                            data-subscription-id="${subscription.id}" 
                            data-current-status="${subscription.status}">
                        <i class='bx bx-x'></i> Cancelar
                    </button>
                `);
            } else if (subscription.status === 'pausado') {
                buttons.push(`
                    <button class="btn btn-sm btn-success" 
                            data-action="activate" 
                            data-subscription-id="${subscription.id}" 
                            data-current-status="${subscription.status}">
                        <i class='bx bx-play'></i> Reactivar
                    </button>
                `);
                buttons.push(`
                    <button class="btn btn-sm btn-danger" 
                            data-action="cancel" 
                            data-subscription-id="${subscription.id}" 
                            data-current-status="${subscription.status}">
                        <i class='bx bx-x'></i> Cancelar
                    </button>
                `);
            }
            
            return buttons.join('');
        },

        async handleSubscriptionAction(action, subscriptionId, currentStatus) {
            const actionMap = {
                'activate': { 
                    status: 'activo', 
                    title: 'Reactivar Suscripción',
                    message: '¿Estás seguro de que deseas reactivar esta suscripción?',
                    confirmText: 'Sí, Reactivar',
                    loadingMsg: 'Reactivando suscripción...',
                    successMsg: 'Suscripción reactivada exitosamente'
                },
                'cancel': { 
                    status: 'cancelado', 
                    title: 'Cancelar Suscripción',
                    message: '¿Estás seguro de que deseas cancelar definitivamente esta suscripción? Esta acción no se puede deshacer.',
                    confirmText: 'Sí, Cancelar',
                    loadingMsg: 'Cancelando suscripción...',
                    successMsg: 'Suscripción cancelada exitosamente'
                }
            };
            
            const actionConfig = actionMap[action];
            if (!actionConfig) return;
            
            const confirmed = await this.showConfirmationModal(actionConfig);
            if (!confirmed) return;
            
            const loadingId = Utils.showLoadingNotification(actionConfig.loadingMsg);
            
            try {
                console.log(`🔧 [SUBSCRIPTIONS] ${action}: ${subscriptionId}`);
                
                await ApiService.updateSubscriptionStatus(subscriptionId, actionConfig.status);
                
                Utils.updateNotification(loadingId, actionConfig.successMsg, 'success');
                
                // Recargar datos
                await this.loadData();
                
            } catch (error) {
                console.error(`[SUBSCRIPTIONS] Error en ${action}:`, error);
                Utils.updateNotification(loadingId, `Error al actualizar suscripción`, 'error');
            }
        },

        showConfirmationModal(config) {
            return new Promise((resolve) => {
                const modalHtml = `
                    <div class="modal-overlay" id="confirmationModal" style="display: flex; opacity: 1;">
                        <div class="modal-content" style="max-width: 400px;">
                            <div class="modal-header">
                                <h2>${config.title}</h2>
                                <button class="modal-close" id="closeConfirmationModal">
                                    <i class='bx bx-x'></i>
                                </button>
                            </div>
                            <div class="modal-body">
                                <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem;">
                                    ${config.message}
                                </p>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" id="cancelConfirmationBtn">
                                    <i class='bx bx-x'></i>
                                    Cancelar
                                </button>
                                <button class="btn btn-danger" id="confirmActionBtn">
                                    <i class='bx bx-check'></i>
                                    ${config.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                document.body.style.overflow = 'hidden';
                
                const modal = document.getElementById('confirmationModal');
                const closeBtn = document.getElementById('closeConfirmationModal');
                const cancelBtn = document.getElementById('cancelConfirmationBtn');
                const confirmBtn = document.getElementById('confirmActionBtn');
                
                const cleanup = () => {
                    if (modal && modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                    document.body.style.overflow = '';
                };
                
                // Event listeners
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };
                
                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };
                
                closeBtn.addEventListener('click', handleCancel);
                cancelBtn.addEventListener('click', handleCancel);
                confirmBtn.addEventListener('click', handleConfirm);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) handleCancel();
                });
                
                // Auto-focus en botón de confirmación
                setTimeout(() => confirmBtn.focus(), 100);
            });
        },

        createSubscriptionsSection() {
            const section = document.getElementById('subscriptions-section');
            if (!section) return;
            
            console.log('🔧 [SUBSCRIPTIONS] Creando estructura de sección...');
            
            section.innerHTML = `
                <div class="section-header">
                    <h1>Gestión de Suscripciones</h1>
                    <p>Administración de planes y suscripciones de usuarios</p>
                </div>

                <!-- Filtros -->
                <div class="filters-bar">
                    <div class="search-group">
                        <input type="text" id="subscriptionSearch" placeholder="Buscar por usuario o carrera...">
                        <i class='bx bx-search'></i>
                    </div>
                    <select id="subscriptionStatusFilter">
                        <option value="">Todos los estados</option>
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="expirado">Expirado</option>
                    </select>
                    <button class="filter-btn" id="updateExpiredBtn" style="background: linear-gradient(135deg, #e67e22, #d35400);">
                        <i class='bx bx-refresh'></i>
                        Actualizar Vencidas
                    </button>
                </div>

                <!-- Tabla -->
                <div class="table-container">
                    <table class="admin-table" id="subscriptionsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Carrera</th>
                                <th>Pago</th>
                                <th>Estado</th>
                                <th>Fechas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="subscriptionsTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                    
                    <div class="loading-state" id="subscriptionsLoading" style="display: none;">
                        <i class='bx bx-loader-alt'></i>
                        <h3>Cargando suscripciones</h3>
                        <p>Obteniendo información de suscripciones...</p>
                    </div>
                    
                    <div class="empty-state" id="subscriptionsEmpty" style="display: none;">
                        <i class='bx bx-crown'></i>
                        <h3>No hay suscripciones</h3>
                        <p>No se encontraron suscripciones con los filtros aplicados</p>
                    </div>
                </div>

                <!-- Paginación -->
                <div class="pagination-container">
                    <div class="pagination-info">
                        <span id="subscriptionsInfo">Mostrando 0 de 0 suscripciones</span>
                    </div>
                    <div class="pagination-controls">
                        <button class="pagination-btn" id="subscriptionsPrevBtn" disabled>
                            <i class='bx bx-chevron-left'></i>
                        </button>
                        <span class="pagination-numbers" id="subscriptionsPages"></span>
                        <button class="pagination-btn" id="subscriptionsNextBtn" disabled>
                            <i class='bx bx-chevron-right'></i>
                        </button>
                    </div>
                </div>
            `;
            
            requestAnimationFrame(() => {
                console.log('🔧 [SUBSCRIPTIONS] Vinculando eventos después de crear HTML...');
                this.bindEvents();
            });
        },

        updatePagination() {
            const pagination = AppState.pagination.subscriptions;
            
            const subscriptionsInfo = document.getElementById('subscriptionsInfo');
            if (subscriptionsInfo && pagination) {
                const start = ((pagination.current - 1) * pagination.perPage) + 1;
                const end = Math.min(pagination.current * pagination.perPage, pagination.totalRecords);
                subscriptionsInfo.textContent = 
                    `Mostrando ${start}-${end} de ${pagination.totalRecords} suscripciones`;
            }
            
            const subscriptionsPrevBtn = document.getElementById('subscriptionsPrevBtn');
            const subscriptionsNextBtn = document.getElementById('subscriptionsNextBtn');
            
            if (subscriptionsPrevBtn && pagination) {
                subscriptionsPrevBtn.disabled = pagination.current <= 1;
            }
            
            if (subscriptionsNextBtn && pagination) {
                subscriptionsNextBtn.disabled = pagination.current >= pagination.total;
            }
            
            const subscriptionsPages = document.getElementById('subscriptionsPages');
            if (subscriptionsPages && pagination) {
                subscriptionsPages.innerHTML = this.generatePageNumbers();
            }
        },

        generatePageNumbers() {
            const pagination = AppState.pagination.subscriptions;
            if (!pagination) return '';
            
            const current = pagination.current;
            const total = pagination.total;
            
            let pages = [];
            
            if (current > 3) {
                pages.push(1);
                if (current > 4) pages.push('...');
            }
            
            for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
                pages.push(i);
            }
            
            if (current < total - 2) {
                if (current < total - 3) pages.push('...');
                pages.push(total);
            }
            
            return pages.map(page => {
                if (page === '...') {
                    return '<span class="page-ellipsis">...</span>';
                }
                
                const isActive = page === current;
                return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
            }).join('');
        },

        goToPage(page) {
            AppState.pagination.subscriptions.current = page;
            this.loadData();
        },

        showLoading(show) {
            const subscriptionsLoading = document.getElementById('subscriptionsLoading');
            if (subscriptionsLoading) {
                subscriptionsLoading.style.display = show ? 'block' : 'none';
            }
        },

        showEmpty(show) {
            const subscriptionsEmpty = document.getElementById('subscriptionsEmpty');
            if (subscriptionsEmpty) {
                subscriptionsEmpty.style.display = show ? 'block' : 'none';
            }
        }
    };
    
    // ===== USUARIOS MEJORADOS =====
    const Users = {
        init() {
            this.bindEvents();
        },

        bindEvents() {
            const userSearchBtn = document.getElementById('userSearchBtn');
            const userSearchInput = document.getElementById('userSearchInput');
            const roleFilter = document.getElementById('roleFilter');

            if (userSearchBtn) {
                const searchHandler = () => this.search();
                Utils.registerEventListener('users', userSearchBtn, 'click', searchHandler);
            }
            
            if (userSearchInput) {
                const enterHandler = (e) => {
                    if (e.key === 'Enter') {
                        this.search();
                    }
                };
                Utils.registerEventListener('users', userSearchInput, 'keypress', enterHandler);
            }

            if (roleFilter) {
                const roleHandler = () => {
                    if (AppState.lastUserSearch) {
                        this.search();
                    }
                };
                Utils.registerEventListener('users', roleFilter, 'change', roleHandler);
            }

            // Paginación de usuarios
            const usersPrevBtn = document.getElementById('usersPrevBtn');
            const usersNextBtn = document.getElementById('usersNextBtn');
            
            if (usersPrevBtn) {
                const prevHandler = () => {
                    if (AppState.pagination.users && AppState.pagination.users.current > 1) {
                        AppState.pagination.users.current--;
                        this.search();
                    }
                };
                Utils.registerEventListener('users', usersPrevBtn, 'click', prevHandler);
            }
            
            if (usersNextBtn) {
                const nextHandler = () => {
                    if (AppState.pagination.users && AppState.pagination.users.current < AppState.pagination.users.total) {
                        AppState.pagination.users.current++;
                        this.search();
                    }
                };
                Utils.registerEventListener('users', usersNextBtn, 'click', nextHandler);
            }

            // Page numbers
            const usersPages = document.getElementById('usersPages');
            if (usersPages) {
                const pageHandler = (e) => {
                    const pageButton = e.target.closest('.page-number');
                    if (!pageButton) return;
                    
                    const page = parseInt(pageButton.dataset.page);
                    if (page && !isNaN(page)) {
                        this.goToPage(page);
                    }
                };
                Utils.registerEventListener('users', usersPages, 'click', pageHandler);
            }

            // Table events
            const userResults = document.getElementById('userResults');
            if (userResults) {
                const tableHandler = (e) => {
                    const button = e.target.closest('[data-action]');
                    if (!button) return;
                    
                    const action = button.dataset.action;
                    const userId = button.dataset.userId;
                    
                    if (action === 'view-details' && userId) {
                        this.showUserDetails(parseInt(userId));
                    }
                };
                Utils.registerEventListener('users', userResults, 'click', tableHandler);
            }
        },

        async load() {
            console.log('🔧 [USERS] Cargando sección de usuarios...');
            
            Utils.cleanupSectionEvents('users');
            this.createUsersSection();
        },

        async search() {
            const userSearchInput = document.getElementById('userSearchInput');
            const roleFilter = document.getElementById('roleFilter');
            
            const query = userSearchInput?.value?.trim();
            
            if (!query || query.length < 2) {
                Utils.showNotification('Ingresa al menos 2 caracteres para buscar', 'warning');
                return;
            }

            console.log(`🔧 [USERS] Buscando: ${query}`);
            
            AppState.lastUserSearch = query;
            AppState.pagination.users = AppState.pagination.users || { current: 1, total: 1, perPage: 20 };
            
            this.showLoading(true);
            
            const loadingId = Utils.showLoadingNotification('Buscando usuarios...');
            
            try {
                const filters = {
                    q: query,
                    page: AppState.pagination.users.current
                };
                
                if (roleFilter?.value) {
                    filters.role = roleFilter.value;
                }
                
                const response = await ApiService.searchUsers(filters);
                
                AppState.users = response.data.users || [];
                AppState.pagination.users = {
                    current: response.data.pagination.current_page,
                    total: response.data.pagination.total_pages,
                    perPage: response.data.pagination.per_page,
                    totalRecords: response.data.pagination.total_records
                };
                
                this.renderResults();
                this.updatePagination();
                
                Utils.updateNotification(loadingId, `${AppState.users.length} usuarios encontrados`, 'success');
                
            } catch (error) {
                console.error('[USERS] Error en búsqueda:', error);
                if (error.message.includes('400')) {
                    Utils.updateNotification(loadingId, 'Término de búsqueda demasiado corto', 'warning');
                } else {
                    Utils.updateNotification(loadingId, 'Error en la búsqueda de usuarios', 'error');
                }
                this.showEmpty(true);
            } finally {
                this.showLoading(false);
            }
        },

        renderResults() {
            const userResults = document.getElementById('userResults');
            if (!userResults) return;
            
            const users = AppState.users || [];
            
            if (users.length === 0) {
                this.showEmpty(true);
                return;
            }
            
            this.showEmpty(false);
            
            const resultsHtml = `
        <div class="table-container">
            <table class="admin-table" id="usersTable">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Suscripciones</th>
                        <th>Total Gastado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div>
                                    <strong>${user.nombres} ${user.apellidos}</strong><br>
                                    <small>ID: ${user.id_user} ${user.email_verified ? '✓' : '⚠'}</small>
                                </div>
                            </td>
                            <td>
                                <div>
                                    <strong>${user.correo}</strong><br>
                                    <small>${user.google_id ? 'Cuenta Google' : 'Cuenta Email'}</small>
                                </div>
                            </td>
                            <td>${this.getRoleBadge(user.id_rol)}</td>
                            <td>
                                <strong>${user.active_subscriptions || 0}</strong><br>
                                <small>${user.last_subscription || 'Ninguna'}</small>
                            </td>
                            <td><strong>${Utils.formatCurrency(user.total_spent || 0)}</strong></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-primary" 
                                            data-action="view-details" 
                                            data-user-id="${user.id_user}">
                                        <i class='bx bx-show'></i> Ver
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
            
            userResults.innerHTML = resultsHtml;
        },

        getRoleBadge(roleId) {
            const roleMap = {
                1: { class: 'status-pending', text: 'Usuario' },
                2: { class: 'status-completed', text: 'Premium' },
                3: { class: 'status-review', text: 'Admin' }
            };
            
            const config = roleMap[roleId] || { class: 'status-pending', text: 'Desconocido' };
            return `<span class="status-badge ${config.class}">${config.text}</span>`;
        },

        getVerificationBadge(verified) {
            return verified ? 
                '<span class="status-badge status-completed">Verificado</span>' :
                '<span class="status-badge status-warning">Sin verificar</span>';
        },

        async showUserDetails(userId) {
            try {
                console.log(`🔧 [USERS] Mostrando detalles: ${userId}`);
                
                this.renderUserModalLoader();
                Modals.show('userModal');
                
                const response = await ApiService.getUserDetails(userId);
                const data = response.data;
                
                this.renderUserModal(data);
                
            } catch (error) {
                console.error('[USERS] Error obteniendo detalles:', error);
                Utils.showNotification('Error obteniendo detalles del usuario', 'error');
                Modals.hide('userModal');
            }
        },

        renderUserModalLoader() {
            const userModalBody = document.getElementById('userModalBody');
            if (!userModalBody) return;
            
            userModalBody.innerHTML = `
                <div class="loading-state" style="padding: 3rem; text-align: center;">
                    <i class='bx bx-loader-alt' style="font-size: 3rem; color: var(--admin-primary); animation: spin 1s linear infinite;"></i>
                    <h3 style="margin: 1rem 0 0.5rem; color: var(--admin-primary);">Cargando detalles</h3>
                    <p>Obteniendo información del usuario...</p>
                </div>
            `;
        },

        renderUserModal(data) {
            const userModalBody = document.getElementById('userModalBody');
            if (!userModalBody) return;
            
            const user = data.user;
            const stats = data.stats;
            const subscriptions = data.subscriptions || [];
            const payments = data.payments || [];
            
            userModalBody.innerHTML = `
                <div class="user-details">
                    <!-- Información del Usuario -->
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Nombre Completo</span>
                            <span class="detail-value">${user.nombres} ${user.apellidos}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${user.correo}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Rol</span>
                            <span class="detail-value">${this.getRoleBadge(user.id_rol)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Estado</span>
                            <span class="detail-value">${this.getVerificationBadge(user.email_verified)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-item">
                            <span class="detail-label">Registro</span>
                            <span class="detail-value">${Utils.formatDate(user.user_created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Último Login</span>
                            <span class="detail-value">${user.last_login ? Utils.formatDate(user.last_login) : 'Nunca'}</span>
                        </div>
                    </div>

                    <!-- Estadísticas -->
                    <div class="stats-summary">
                        <h3>Estadísticas</h3>
                        <div class="stats-grid-small">
                            <div class="stat-item">
                                <strong>${stats.active_subscriptions}</strong>
                                <span>Suscripciones Activas</span>
                            </div>
                            <div class="stat-item">
                                <strong>${stats.total_payments}</strong>
                                <span>Total Pagos</span>
                            </div>
                            <div class="stat-item">
                                <strong>${Utils.formatCurrency(stats.total_spent)}</strong>
                                <span>Total Gastado</span>
                            </div>
                        </div>
                    </div>

                    <!-- Suscripciones -->
                    ${subscriptions.length > 0 ? `
                        <div class="section-data">
                            <h3>Suscripciones Recientes</h3>
                            <div class="mini-table">
                                ${subscriptions.slice(0, 3).map(sub => `
                                    <div class="mini-row">
                                        <span>${sub.carrera_nombre}</span>
                                        <span>${this.getSubscriptionStatusBadge(sub.status)}</span>
                                        <span>${Utils.formatDate(sub.created_at)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Pagos -->
                    ${payments.length > 0 ? `
                        <div class="section-data">
                            <h3>Pagos Recientes</h3>
                            <div class="mini-table">
                                ${payments.slice(0, 3).map(payment => `
                                    <div class="mini-row">
                                        <span>${Utils.formatCurrency(payment.amount)}</span>
                                        <span>${Utils.getStatusBadge(payment.payment_status)}</span>
                                        <span>${Utils.formatDate(payment.created_at)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            setTimeout(() => {
                const closeBtn = document.getElementById('closeUserModal');
                if (closeBtn) {
                    console.log('🔧 [USERS] Botón cerrar modal configurado');
                }
            }, 100);
        },

        getSubscriptionStatusBadge(status) {
            return Subscriptions.getSubscriptionStatusBadge(status);
        },

        createUsersSection() {
            const section = document.getElementById('users-section');
            if (!section) return;
            
            section.innerHTML = `
                <div class="section-header">
                    <h1>Búsqueda de Usuarios</h1>
                    <p>Herramientas para encontrar y gestionar usuarios del sistema</p>
                </div>

                <!-- Búsqueda de Usuarios -->
                <div class="user-search">
                    <div class="filters-bar">
                        <div class="search-group">
                            <input type="text" id="userSearchInput" placeholder="Buscar por email, nombre o apellido...">
                            <i class='bx bx-search'></i>
                        </div>
                        <select id="roleFilter">
                            <option value="">Todos los roles</option>
                            <option value="1">Usuario</option>
                            <option value="2">Premium</option>
                            <option value="3">Admin</option>
                        </select>
                        <button class="search-btn" id="userSearchBtn">
                            <i class='bx bx-search'></i>
                            Buscar Usuario
                        </button>
                    </div>
                </div>

                <!-- Resultados de Búsqueda -->
                <div id="userResults" class="user-results">
                    <div class="empty-state">
                        <i class='bx bx-search-alt-2'></i>
                        <h3>Búsqueda de Usuarios</h3>
                        <p>Utiliza el buscador para encontrar usuarios específicos</p>
                    </div>
                </div>

                <!-- Loading y Empty states -->
                <div class="loading-state" id="usersLoading" style="display: none;">
                    <i class='bx bx-loader-alt'></i>
                    <h3>Buscando usuarios</h3>
                    <p>Procesando búsqueda...</p>
                </div>

                <!-- Paginación -->
                <div class="pagination-container" id="usersPagination" style="display: none;">
                    <div class="pagination-info">
                        <span id="usersInfo">Mostrando 0 de 0 usuarios</span>
                    </div>
                    <div class="pagination-controls">
                        <button class="pagination-btn" id="usersPrevBtn" disabled>
                            <i class='bx bx-chevron-left'></i>
                        </button>
                        <span class="pagination-numbers" id="usersPages"></span>
                        <button class="pagination-btn" id="usersNextBtn" disabled>
                            <i class='bx bx-chevron-right'></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Reinicializar eventos inmediatamente después de crear el HTML
            requestAnimationFrame(() => {
                console.log('🔧 [USERS] Vinculando eventos después de crear HTML...');
                this.bindEvents();
            });
        },

        updatePagination() {
            const pagination = AppState.pagination.users;
            const usersPagination = document.getElementById('usersPagination');
            
            if (!pagination || !usersPagination) return;
            
            usersPagination.style.display = pagination.total > 1 ? 'flex' : 'none';
            
            const usersInfo = document.getElementById('usersInfo');
            if (usersInfo) {
                const start = ((pagination.current - 1) * pagination.perPage) + 1;
                const end = Math.min(pagination.current * pagination.perPage, pagination.totalRecords);
                usersInfo.textContent = 
                    `Mostrando ${start}-${end} de ${pagination.totalRecords} usuarios`;
            }
            
            const usersPrevBtn = document.getElementById('usersPrevBtn');
            const usersNextBtn = document.getElementById('usersNextBtn');
            
            if (usersPrevBtn) {
                usersPrevBtn.disabled = pagination.current <= 1;
            }
            
            if (usersNextBtn) {
                usersNextBtn.disabled = pagination.current >= pagination.total;
            }
            
            const usersPages = document.getElementById('usersPages');
            if (usersPages) {
                usersPages.innerHTML = this.generatePageNumbers();
            }
        },

        generatePageNumbers() {
            const pagination = AppState.pagination.users;
            const current = pagination.current;
            const total = pagination.total;
            
            let pages = [];
            
            if (current > 3) {
                pages.push(1);
                if (current > 4) pages.push('...');
            }
            
            for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
                pages.push(i);
            }
            
            if (current < total - 2) {
                if (current < total - 3) pages.push('...');
                pages.push(total);
            }
            
            return pages.map(page => {
                if (page === '...') {
                    return '<span class="page-ellipsis">...</span>';
                }
                
                const isActive = page === current;
                return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
            }).join('');
        },

        goToPage(page) {
            AppState.pagination.users.current = page;
            this.search();
        },

        showLoading(show) {
            const usersLoading = document.getElementById('usersLoading');
            if (usersLoading) {
                usersLoading.style.display = show ? 'block' : 'none';
            }
        },

        showEmpty(show) {
            const userResults = document.getElementById('userResults');
            if (!userResults) return;
            
            if (show) {
                userResults.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-user-x'></i>
                        <h3>No se encontraron usuarios</h3>
                        <p>Intenta con otros términos de búsqueda</p>
                    </div>
                `;
            }
        }
    };
    
    // ===== MODALES =====
    const Modals = {
        init() {
            this.bindEvents();
        },
        
        bindEvents() {
            // Transfer modal
            if (Elements.closeTransferModal) {
                Elements.closeTransferModal.addEventListener('click', () => {
                    this.hide('transferModal');
                });
            }
            
            if (Elements.approveTransferBtn) {
                Elements.approveTransferBtn.addEventListener('click', async () => {
                    Elements.approveTransferBtn.disabled = true;
                    Elements.approveTransferBtn.innerHTML = '<i class="bx bx-loader-alt" style="animation: spin 1s linear infinite;"></i> Aprobando...';
                    
                    try {
                        await Transfers.approve();
                    } finally {
                        Elements.approveTransferBtn.disabled = false;
                        Elements.approveTransferBtn.innerHTML = '<i class="bx bx-check"></i> Aprobar';
                    }
                });
            }
            
            if (Elements.rejectTransferBtn) {
                Elements.rejectTransferBtn.addEventListener('click', () => {
                    this.show('rejectModal');
                });
            }
            
            // Reject modal
            if (Elements.closeRejectModal) {
                Elements.closeRejectModal.addEventListener('click', () => {
                    this.hide('rejectModal');
                });
            }
            
            if (Elements.cancelRejectBtn) {
                Elements.cancelRejectBtn.addEventListener('click', () => {
                    this.hide('rejectModal');
                });
            }
            
            if (Elements.confirmRejectBtn) {
                Elements.confirmRejectBtn.addEventListener('click', async () => {
                    const reason = Elements.rejectReason?.value?.trim();
                    if (reason) {
                        Elements.confirmRejectBtn.disabled = true;
                        Elements.confirmRejectBtn.innerHTML = '<i class="bx bx-loader-alt" style="animation: spin 1s linear infinite;"></i> Rechazando...';
                        
                        try {
                            await Transfers.reject(reason);
                            Elements.rejectReason.value = '';
                        } finally {
                            Elements.confirmRejectBtn.disabled = false;
                            Elements.confirmRejectBtn.innerHTML = '<i class="bx bx-x"></i> Confirmar Rechazo';
                        }
                    } else {
                        Utils.showNotification('Especifica la razón del rechazo', 'warning');
                    }
                });
            }

            this.setupUserModalEvents();
            
            // Close modals on overlay click
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hide(modal.id);
                    }
                });
            });
        },

        setupUserModalEvents() {
            document.addEventListener('click', (e) => {
                if (e.target.id === 'closeUserModal' || e.target.closest('#closeUserModal')) {
                    console.log('🔧 [MODAL] Cerrando modal de usuario');
                    this.hide('userModal');
                    return;
                }
                
                if (e.target.closest('.modal-footer .btn-secondary') && 
                    e.target.closest('#userModal')) {
                    this.hide('userModal');
                    return;
                }
            });
        },
        
        show(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        },
        
        hide(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    };
    
    // ===== AUTO REFRESH =====
    const AutoRefresh = {
        start() {
            if (!CONFIG.POLLING_ENABLED) return;
            
            AppState.refreshTimer = setInterval(async () => {
                if (AppState.currentSection === 'dashboard') {
                    await Dashboard.load();
                } else if (AppState.currentSection === 'transfers') {
                    await Transfers.load();
                }
            }, CONFIG.REFRESH_INTERVAL);
            
            console.log(`🔧 [REFRESH] Auto-refresh iniciado (${CONFIG.REFRESH_INTERVAL}ms)`);
        },
        
        stop() {
            if (AppState.refreshTimer) {
                clearInterval(AppState.refreshTimer);
                AppState.refreshTimer = null;
                console.log('🔧 [REFRESH] Auto-refresh detenido');
            }
        }
    };
    
    // ===== LOGOUT =====
    const Logout = {
        init() {
            document.querySelectorAll('.logout-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            });
        },
        
        async logout() {
            const loadingId = Utils.showLoadingNotification('Cerrando sesión...');
            
            try {
                const response = await fetch('/api/usuarios/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    Utils.updateNotification(loadingId, 'Sesión cerrada exitosamente', 'success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1000);
                } else {
                    Utils.updateNotification(loadingId, 'Error al cerrar sesión', 'error');
                }
            } catch (error) {
                console.error('[LOGOUT] Error:', error);
                Utils.updateNotification(loadingId, 'Error de conexión', 'error');
                // Forzar redirección aunque haya error
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
        }
    };
    
    // ===== INICIALIZACIÓN =====
    const AdminPanel = {
        async init() {
            console.log('🔧 [ADMIN] Inicializando...');
            
            this.waitForNotificationService();
            
            this.addLoadingStyles();
            
            try {
                Navigation.init();
                Transfers.init();
                Payments.init();
                Subscriptions.init();
                Users.init();
                Modals.init();
                Logout.init();
                
                await Navigation.loadSectionContent('dashboard');
                
                AutoRefresh.start();
                
                console.log('✅ [ADMIN] Panel inicializado correctamente');
                Utils.showNotification('Panel de administración cargado', 'success');
                
            } catch (error) {
                console.error('❌ [ADMIN] Error en inicialización:', error);
                Utils.showNotification('Error inicializando panel', 'error');
            }
        },

        addLoadingStyles() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                
                .btn:disabled:hover {
                    transform: none;
                    box-shadow: var(--shadow-light);
                }
                
                .loading-button {
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        },
        
        waitForNotificationService() {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkService = () => {
                attempts++;
                
                if (window.notifyService && typeof window.notifyService.add === 'function') {
                    console.log('✅ [ADMIN] Notification service disponible');
                    return true;
                }
                
                if (window.notificationService && typeof window.notificationService.show === 'function') {
                    console.log('✅ [ADMIN] Legacy notification service disponible');
                    return true;
                }
                
                if (attempts < maxAttempts) {
                    console.log(`🔄 [ADMIN] Esperando notification service... (${attempts}/${maxAttempts})`);
                    setTimeout(checkService, 200);
                } else {
                    console.warn('⚠️ [ADMIN] Notification service no disponible, usando fallback');
                }
                
                return false;
            };
            
            checkService();
        },
        
        // Exponer funciones públicas
        Navigation,
        Dashboard,
        Transfers,
        Payments,
        Subscriptions,
        Users,
        Modals,
        Utils
    };
    
    // ===== MANEJO DE ERRORES GLOBALES =====
    window.addEventListener('error', (e) => {
        console.error('[GLOBAL] Error:', e.error);
        Utils.showNotification('Error inesperado en la aplicación', 'error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('[GLOBAL] Promise rejection:', e.reason);
        Utils.showNotification('Error de conexión o servidor', 'error');
    });
    
    // ===== CLEANUP =====
    window.addEventListener('beforeunload', () => {
        AutoRefresh.stop();
        
        AppState.activeEventListeners.clear();
    });
    
    // ===== EXPOSER AL SCOPE GLOBAL =====
    window.AdminPanel = AdminPanel;
    
    // ===== INICIALIZAR CUANDO EL DOM ESTÉ LISTO =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AdminPanel.init());
    } else {
        AdminPanel.init();
    }
    
})();