/**
 * Módulo para la sección de seguridad por usuario
 */

import { getUserSecurityInfo, revokeUserTokens } from '../utils/api.js';
import { createPieChart, getChartColors } from '../utils/charts.js';
import { formatDateTime, maskEmail } from '../utils/formatters.js';
import { createTableRow, downloadBlob } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import modals from '../ui/modals.js';

const userSecurity = {
    /**
     * Estado del módulo
     */
    state: {
        currentUser: null,
        userInfo: null,
        charts: {},
        isLoading: false
    },

    /**
     * Inicializa el módulo de seguridad por usuario
     */
    async init() {
        // Configurar event listeners
        this.setupEventListeners();
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de búsqueda de usuario
        document.getElementById('search-user-btn')?.addEventListener('click', () => {
            this.searchUser();
        });
        
        // Campo de búsqueda (Enter)
        document.getElementById('user-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchUser();
            }
        });
        
        // Acciones de usuario
        document.getElementById('user-revoke-tokens-btn')?.addEventListener('click', () => {
            this.handleRevokeTokens();
        });
        
        document.getElementById('user-login-history-btn')?.addEventListener('click', () => {
            this.viewLoginHistory();
        });
        
        document.getElementById('user-security-log-btn')?.addEventListener('click', () => {
            this.viewSecurityLog();
        });
        
        document.getElementById('user-export-btn')?.addEventListener('click', () => {
            this.exportUserData();
        });
    },

    /**
     * Busca un usuario por ID o correo
     */
    async searchUser() {
        const searchTerm = document.getElementById('user-search')?.value;
        
        if (!searchTerm) {
            showNotification('Advertencia', 'Por favor introduce un ID o correo para buscar', 'warning');
            return;
        }
        
        try {
            // Mostrar indicador de carga
            this.state.isLoading = true;
            this.showLoading(true);
            
            // Guardar término de búsqueda
            this.state.currentUser = searchTerm;
            
            // En una implementación real, aquí se resolvería el ID de usuario si se introduce un correo
            const userId = isNaN(searchTerm) ? await this.resolveUserIdFromEmail(searchTerm) : searchTerm;
            
            if (!userId) {
                this.showUserNotFound();
                this.state.isLoading = false;
                this.showLoading(false);
                return;
            }
            
            // Obtener información de seguridad del usuario
            const userInfo = await getUserSecurityInfo(userId);
            
            // Actualizar estado
            this.state.userInfo = userInfo;
            
            // Mostrar información del usuario
            this.displayUserInfo(userInfo);
            
            // Inicializar gráficos
            this.initCharts(userInfo);
            
            // Ocultar indicador de carga
            this.state.isLoading = false;
            this.showLoading(false);
        } catch (error) {
            console.error('Error buscando usuario:', error);
            showNotification('Error', 'No se pudo buscar el usuario', 'error');
            this.showUserNotFound();
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Resuelve un ID de usuario a partir de un correo electrónico
     * @param {string} email - Correo electrónico
     * @returns {string|null} ID del usuario o null si no se encuentra
     */
    async resolveUserIdFromEmail(email) {
        // En una implementación real, esto haría una llamada a la API
        // Para el demo, simulamos que funciona correctamente
        
        // Simular búsqueda del usuario (en la implementación real esto sería una llamada a la API)
        if (email.includes('@')) {
            return '42'; // Usuario de demostración
        }
        
        return null;
    },

    /**
     * Muestra la información del usuario
     * @param {Object} userInfo - Información de seguridad del usuario
     */
    displayUserInfo(userInfo) {
        // Ocultar mensaje de no encontrado
        document.getElementById('user-not-found').style.display = 'none';
        
        // Mostrar sección de información
        document.getElementById('user-security-info').style.display = 'block';
        
        // Actualizar información básica
        document.getElementById('user-id').textContent = userInfo.userId;
        document.getElementById('user-email').textContent = this.getUserEmail(userInfo.userId);
        document.getElementById('user-role').textContent = this.getUserRole(userInfo.userId);
        document.getElementById('user-last-ip').textContent = userInfo.lastKnownIp || 'No disponible';
        document.getElementById('user-last-login').textContent = this.getLastLogin(userInfo);
        document.getElementById('user-event-count').textContent = this.getTotalEvents(userInfo);
        
        // Renderizar tabla de intentos de login
        this.renderLoginAttemptsTable(userInfo.recentLoginAttempts || []);
    },

    /**
     * Muestra mensaje de usuario no encontrado
     */
    showUserNotFound() {
        document.getElementById('user-not-found').style.display = 'block';
        document.getElementById('user-security-info').style.display = 'none';
    },

    /**
     * Inicializa los gráficos del usuario
     * @param {Object} userInfo - Información de seguridad del usuario
     */
    initCharts(userInfo) {
        const colors = getChartColors();
        
        // Preparar datos para el gráfico
        const eventSummary = userInfo.eventSummary || [];
        const labels = eventSummary.map(e => e.eventType);
        const data = eventSummary.map(e => e.count);
        
        // Asignar colores según el tipo de evento
        const backgroundColors = labels.map(type => {
            if (type.includes('LOGIN_SUCCESS')) return colors.success;
            if (type.includes('LOGIN_FAILURE')) return colors.danger;
            if (type.includes('PASSWORD')) return colors.info;
            if (type.includes('TOKEN')) return colors.warning;
            if (type.includes('THREAT') || type.includes('SUSPICIOUS')) return colors.critical;
            return colors.secondary;
        });
        
        // Crear o actualizar gráfico
        if (this.state.charts.userEvents) {
            // Actualizar gráfico existente
            this.state.charts.userEvents.data.labels = labels;
            this.state.charts.userEvents.data.datasets[0].data = data;
            this.state.charts.userEvents.data.datasets[0].backgroundColor = backgroundColors;
            this.state.charts.userEvents.update();
        } else {
            // Crear nuevo gráfico
            this.state.charts.userEvents = createPieChart('user-events-chart', {
                labels,
                datasets: [{
                    data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            });
        }
    },

    /**
     * Renderiza la tabla de intentos de login del usuario
     * @param {Array} attempts - Intentos de login
     */
    renderLoginAttemptsTable(attempts) {
        const tableBody = document.getElementById('user-login-attempts-table');
        if (!tableBody) return;
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        if (!attempts || attempts.length === 0) {
            // Mostrar mensaje si no hay intentos
            const emptyRow = createTableRow([
                { colspan: 6, className: 'text-center', text: 'No hay intentos de login recientes para este usuario' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Añadir filas de intentos
        attempts.forEach(attempt => {
            // Determinar clase según estado
            let statusClass = 'primary';
            switch (attempt.status) {
                case 'approved': statusClass = 'success'; break;
                case 'rejected': statusClass = 'danger'; break;
                case 'expired': statusClass = 'warning'; break;
                case 'completed': statusClass = 'info'; break;
            }
            
            // Crear fila
            const row = createTableRow([
                { text: attempt.id, className: 'text-nowrap' },
                { text: attempt.ipAddress, className: 'text-nowrap' },
                { text: attempt.location || 'Desconocida', className: 'text-nowrap' },
                { text: this.formatUserAgent(attempt.userAgent), className: 'text-truncate', style: { maxWidth: '200px' } },
                { 
                    html: `<span class="badge bg-${statusClass}">${this.formatStatus(attempt.status)}</span>`, 
                    className: 'text-center' 
                },
                { text: formatDateTime(attempt.createdAt), className: 'text-nowrap' }
            ]);
            
            tableBody.appendChild(row);
        });
    },

    /**
     * Maneja la acción de revocar tokens
     */
    handleRevokeTokens() {
        if (!this.state.userInfo) {
            showNotification('Error', 'No hay información de usuario disponible', 'error');
            return;
        }
        
        // Preparar modal de revocación de tokens
        modals.prepareRevokeTokens(
            this.state.userInfo.userId,
            `Revocación manual desde el panel de seguridad`
        );
    },

    /**
     * Ver historial de login del usuario
     */
    viewLoginHistory() {
        if (!this.state.userInfo) {
            showNotification('Error', 'No hay información de usuario disponible', 'error');
            return;
        }
        
        // En una implementación real, aquí se mostraría una vista detallada o modal
        // Para el demo, mostramos una notificación
        showNotification(
            'Historial de Login',
            `Mostrando historial para el usuario ${this.state.userInfo.userId}`,
            'info'
        );
        
        // Disparar evento para cambiar a la pestaña de intentos de login con filtro por usuario
        window.dispatchEvent(new CustomEvent('viewUserLoginHistory', {
            detail: { userId: this.state.userInfo.userId }
        }));
    },

    /**
     * Ver log de seguridad del usuario
     */
    viewSecurityLog() {
        if (!this.state.userInfo) {
            showNotification('Error', 'No hay información de usuario disponible', 'error');
            return;
        }
        
        // Disparar evento para cambiar a la pestaña de eventos con filtro por usuario
        window.dispatchEvent(new CustomEvent('viewUserSecurityLog', {
            detail: { userId: this.state.userInfo.userId }
        }));
    },

    /**
     * Exporta los datos de seguridad del usuario
     */
    exportUserData() {
        if (!this.state.userInfo) {
            showNotification('Error', 'No hay información de usuario disponible', 'error');
            return;
        }
        
        try {
            // Crear blob
            const blob = new Blob([JSON.stringify(this.state.userInfo, null, 2)], {
                type: 'application/json;charset=utf-8;'
            });
            
            // Generar nombre de archivo
            const date = new Date().toISOString().split('T')[0];
            const filename = `seguridad_usuario_${this.state.userInfo.userId}_${date}.json`;
            
            // Descargar archivo
            downloadBlob(blob, filename);
            
            // Mostrar notificación
            showNotification('Éxito', 'Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando datos de usuario:', error);
            showNotification('Error', 'No se pudieron exportar los datos', 'error');
        }
    },

    /**
     * Obtiene el correo electrónico simulado del usuario
     * @param {string} userId - ID del usuario
     * @returns {string} Correo electrónico
     */
    getUserEmail(userId) {
        // En una implementación real, esto vendría en la respuesta de la API
        // Para el demo, generamos un correo simulado
        return `usuario${userId}@acadelia.com`;
    },

    /**
     * Obtiene el rol simulado del usuario
     * @param {string} userId - ID del usuario
     * @returns {string} Rol del usuario
     */
    getUserRole(userId) {
        // En una implementación real, esto vendría en la respuesta de la API
        // Para el demo, asignamos roles simulados
        const roleMap = {
            '1': 'Administrador',
            '2': 'Profesor',
            '3': 'Estudiante'
        };
        
        return roleMap[userId] || 'Usuario';
    },

    /**
     * Obtiene la fecha del último login
     * @param {Object} userInfo - Información de seguridad del usuario
     * @returns {string} Fecha formateada
     */
    getLastLogin(userInfo) {
        if (!userInfo.recentLoginAttempts || userInfo.recentLoginAttempts.length === 0) {
            return 'No disponible';
        }
        
        // Filtrar intentos completados/aprobados
        const successfulAttempts = userInfo.recentLoginAttempts.filter(a => 
            a.status === 'completed' || a.status === 'approved'
        );
        
        if (successfulAttempts.length === 0) {
            return 'No disponible';
        }
        
        // Ordenar por fecha (más reciente primero)
        successfulAttempts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return formatDateTime(successfulAttempts[0].createdAt);
    },

    /**
     * Calcula el total de eventos para el usuario
     * @param {Object} userInfo - Información de seguridad del usuario
     * @returns {number} Total de eventos
     */
    getTotalEvents(userInfo) {
        if (!userInfo.eventSummary || userInfo.eventSummary.length === 0) {
            return 0;
        }
        
        return userInfo.eventSummary.reduce((sum, event) => sum + event.count, 0);
    },

    /**
     * Formatea un User-Agent para mostrar
     * @param {string} userAgent - User-Agent completo
     * @returns {string} User-Agent formateado
     */
    formatUserAgent(userAgent) {
        if (!userAgent) return 'Desconocido';
        
        // Extraer información relevante
        let formattedUA = userAgent;
        
        // Simplificar cadenas comunes de User-Agent
        if (userAgent.includes('Chrome/')) {
            formattedUA = 'Chrome - ' + userAgent.split('Chrome/')[1].split(' ')[0];
        } else if (userAgent.includes('Firefox/')) {
            formattedUA = 'Firefox - ' + userAgent.split('Firefox/')[1].split(' ')[0];
        } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
            formattedUA = 'Safari - ' + userAgent.split('Version/')[1]?.split(' ')[0];
        } else if (userAgent.includes('Edg/')) {
            formattedUA = 'Edge - ' + userAgent.split('Edg/')[1].split(' ')[0];
        }
        
        return formattedUA;
    },

    /**
     * Formatea el estado de un intento de login
     * @param {string} status - Estado del intento
     * @returns {string} Estado formateado
     */
    formatStatus(status) {
        if (!status) return 'Desconocido';
        
        const statusMap = {
            'pending': 'Pendiente',
            'approved': 'Aprobado',
            'rejected': 'Rechazado',
            'completed': 'Completado',
            'expired': 'Expirado'
        };
        
        return statusMap[status] || status;
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        // Si hay carga, deshabilitar botón de búsqueda
        const searchBtn = document.getElementById('search-user-btn');
        if (searchBtn) {
            searchBtn.disabled = show;
            
            if (show) {
                searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
            } else {
                searchBtn.innerHTML = '<i class="bi bi-search me-1"></i> Buscar';
            }
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        // Limpiar event listeners
        document.getElementById('search-user-btn')?.removeEventListener('click', () => this.searchUser());
        document.getElementById('user-search')?.removeEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUser();
        });
        document.getElementById('user-revoke-tokens-btn')?.removeEventListener('click', () => this.handleRevokeTokens());
        document.getElementById('user-login-history-btn')?.removeEventListener('click', () => this.viewLoginHistory());
        document.getElementById('user-security-log-btn')?.removeEventListener('click', () => this.viewSecurityLog());
        document.getElementById('user-export-btn')?.removeEventListener('click', () => this.exportUserData());
    }
};

export default userSecurity;