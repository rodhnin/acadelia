/**
 * Módulo para la sección principal del dashboard
 */

import { getSecurityMetrics, getSecurityEvents } from '../utils/api.js';
import { createActivityChart, createEventTypesChart, createLoginResultsChart } from '../utils/charts.js';
import { formatDateTime } from '../utils/formatters.js';
import { createTableRow } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import modals from '../ui/modals.js';

const dashboard = {
    /**
     * Estado del dashboard
     */
    state: {
        metrics: null,
        criticalEvents: [],
        charts: {},
        timeRange: '24h'
    },

    /**
     * Inicializa el módulo de dashboard
     */
    async init() {
        try {
            this.initCharts();
            
            await this.loadDashboardData();
            
            this.setupEventListeners();
            
            // Programar refresco automático cada 5 minutos
            this.startAutoRefresh();
        } catch (error) {
            console.error('Error inicializando dashboard:', error);
            showNotification('Error', 'No se pudo cargar el dashboard', 'error');
        }
    },

    /**
     * Inicializa los gráficos vacíos
     */
    initCharts() {
        // Gráfico de actividad por hora
        this.state.charts.activity = createActivityChart('activity-chart', {});
        
        // Gráfico de tipos de eventos
        this.state.charts.eventTypes = createEventTypesChart('event-types-chart', {});
        
        // Gráfico de resultados de login
        this.state.charts.loginResults = createLoginResultsChart('login-results-chart', {});
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botones de cambio de período
        document.getElementById('chart-24h')?.addEventListener('click', () => this.changeTimeRange('24h'));
        document.getElementById('chart-7d')?.addEventListener('click', () => this.changeTimeRange('7d'));
        document.getElementById('chart-30d')?.addEventListener('click', () => this.changeTimeRange('30d'));
        
        // Botón para ver todos los eventos
        document.getElementById('view-all-events')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('viewAllCriticalEvents'));
        });
        
        // Botones de acción rápida
        document.getElementById('export-events-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('exportSecurityEvents'));
        });
        
        window.addEventListener('securityDataUpdated', () => {
            this.loadDashboardData();
        });
    },

    /**
     * Carga los datos del dashboard
     */
    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            const metrics = await getSecurityMetrics();
            
            this.state.metrics = this.processMetrics(metrics);
            
            this.updateCounters(this.state.metrics);
            
            await this.prepareChartData();
            
            this.updateCharts(this.state.metrics);
            
            await this.loadCriticalEvents();
            
            this.showLoading(false);
            
            document.getElementById('last-update-time').textContent = 'ahora';
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            showNotification('Error', 'No se pudieron cargar los datos del dashboard', 'error');
            this.showLoading(false);
        }
    },
    
    /**
     * Procesa las métricas recibidas de la API
     * @param {Object} apiMetrics - Métricas recibidas de la API
     * @returns {Object} Métricas procesadas
     */
    processMetrics(apiMetrics) {
        // Si la API devuelve exactamente el formato esperado, no hace falta procesamiento
        if (apiMetrics.events24h !== undefined) {
            return apiMetrics;
        }
        
        // Si no, adaptar el formato de la API real al esperado por el dashboard
        const processedMetrics = {
            events24h: apiMetrics.events24h || 0,
            critical24h: apiMetrics.critical24h || 0,
            highSeverity24h: apiMetrics.highSeverity24h || 0,
            blockedIPs: apiMetrics.blockedIPs || 0,
            failedLogins: apiMetrics.failedLogins || 0
        };
        
        return processedMetrics;
    },

    /**
     * Prepara datos para gráficos si no vienen en la respuesta de la API
     */
    async prepareChartData() {
        try {
            // Si ya tenemos los datos de gráficos, no hacer nada
            if (this.state.metrics.activityByHour && 
                this.state.metrics.eventTypes && 
                this.state.metrics.loginResults) {
                return;
            }
            
            if (!this.state.metrics.activityByHour) {
                const activityByHour = {};
                const criticalByHour = {};
                
                const now = new Date();
                for (let i = 0; i < 24; i++) {
                    const hour = new Date(now);
                    hour.setHours(now.getHours() - 23 + i);
                    const hourKey = `${hour.getHours()}:00`;
                    activityByHour[hourKey] = 0;
                    criticalByHour[hourKey] = 0;
                }
                
                const endDate = new Date().toISOString();
                const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                
                const eventsResult = await getSecurityEvents({
                    startDate,
                    endDate
                }, 1, 1000); // Obtener hasta 1000 eventos
                
                if (eventsResult && eventsResult.events && eventsResult.events.length > 0) {
                    eventsResult.events.forEach(event => {
                        const eventDate = new Date(event.timestamp);
                        const hourKey = `${eventDate.getHours()}:00`;
                        
                        if (activityByHour[hourKey] !== undefined) {
                            activityByHour[hourKey]++;
                        }
                        
                        if (event.severity === 'critical' && criticalByHour[hourKey] !== undefined) {
                            criticalByHour[hourKey]++;
                        }
                    });
                }
                
                this.state.metrics.activityByHour = activityByHour;
                this.state.metrics.criticalByHour = criticalByHour;
            }
            
            if (!this.state.metrics.eventTypes) {
                const eventsResult = await getSecurityEvents({}, 1, 1000);
                
                const eventTypes = {};
                
                if (eventsResult && eventsResult.events && eventsResult.events.length > 0) {
                    eventsResult.events.forEach(event => {
                        const eventType = event.eventType || 'UNKNOWN';
                        eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
                    });
                    
                    // Limitar a los 5 tipos más comunes
                    const sortedTypes = Object.entries(eventTypes)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);
                    
                    const topEventTypes = {};
                    sortedTypes.forEach(([type, count]) => {
                        topEventTypes[type] = count;
                    });
                    
                    this.state.metrics.eventTypes = topEventTypes;
                } else {
                    // Si no hay datos, mostrar algo para que el gráfico no esté vacío
                    this.state.metrics.eventTypes = {
                        'Sin datos': 1
                    };
                }
            }
            
            if (!this.state.metrics.loginResults) {
                const loginEvents = await getSecurityEvents({
                    eventType: 'LOGIN_'
                }, 1, 100);
                
                const loginResults = {
                    success: 0,
                    failure: 0,
                    blocked: 0
                };
                
                if (loginEvents && loginEvents.events && loginEvents.events.length > 0) {
                    loginEvents.events.forEach(event => {
                        if (event.eventType === 'LOGIN_SUCCESS') {
                            loginResults.success++;
                        } else if (event.eventType === 'LOGIN_FAILURE') {
                            loginResults.failure++;
                        } else if (event.eventType === 'BLOCKED_IP' || event.eventType === 'LOGIN_BLOCKED') {
                            loginResults.blocked++;
                        }
                    });
                }
                
                this.state.metrics.loginResults = loginResults;
            }
        } catch (error) {
            console.error('Error preparando datos para gráficos:', error);
            this.state.metrics.activityByHour = { '0:00': 0 };
            this.state.metrics.criticalByHour = { '0:00': 0 };
            this.state.metrics.eventTypes = { 'Sin datos': 1 };
            this.state.metrics.loginResults = { success: 0, failure: 0, blocked: 0 };
        }
    },

    /**
     * Carga eventos críticos recientes
     */
    async loadCriticalEvents() {
        try {
            const result = await getSecurityEvents({ severity: 'critical' }, 1, 5);
            
            if (result && result.events) {
                this.state.criticalEvents = result.events;
                this.renderCriticalEvents(result.events);
            }
        } catch (error) {
            console.error('Error cargando eventos críticos:', error);
            // En caso de error, mostrar tabla vacía
            this.renderCriticalEvents([]);
        }
    },

    /**
     * Actualiza los contadores con las métricas
     * @param {Object} metrics - Métricas de seguridad
     */
    updateCounters(metrics) {
        document.getElementById('events-24h-count').textContent = metrics.events24h?.toLocaleString() || '0';
        
        const criticalAndHigh = (metrics.critical24h || 0) + (metrics.highSeverity24h || 0);
        document.getElementById('critical-high-count').textContent = criticalAndHigh.toLocaleString();
        
        const criticalPercent = metrics.events24h > 0 
            ? Math.round((criticalAndHigh / metrics.events24h) * 100) 
            : 0;
        
        document.getElementById('critical-percent').textContent = `${criticalPercent}%`;
        
        document.getElementById('blocked-ips-count').textContent = metrics.blockedIPs?.toLocaleString() || '0';
        
        document.getElementById('failed-logins-count').textContent = metrics.failedLogins?.toLocaleString() || '0';
    },

    /**
     * Actualiza los gráficos con las métricas
     * @param {Object} metrics - Métricas de seguridad
     */
    updateCharts(metrics) {
        if (this.state.charts.activity && metrics.activityByHour) {
            this.state.charts.activity.data.labels = Object.keys(metrics.activityByHour);
            this.state.charts.activity.data.datasets[0].data = Object.values(metrics.activityByHour);
            
            if (metrics.criticalByHour) {
                // Si no existe el dataset de eventos críticos, agregarlo
                if (this.state.charts.activity.data.datasets.length < 2) {
                    this.state.charts.activity.data.datasets.push({
                        label: 'Eventos Críticos',
                        data: Object.values(metrics.criticalByHour),
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.2)',
                        fill: true,
                        tension: 0.2
                    });
                } else {
                    this.state.charts.activity.data.datasets[1].data = Object.values(metrics.criticalByHour);
                }
            }
            
            this.state.charts.activity.update();
        }
        
        if (this.state.charts.eventTypes && metrics.eventTypes) {
            this.state.charts.eventTypes.data.labels = Object.keys(metrics.eventTypes);
            this.state.charts.eventTypes.data.datasets[0].data = Object.values(metrics.eventTypes);
            this.state.charts.eventTypes.update();
        }
        
        if (this.state.charts.loginResults && metrics.loginResults) {
            this.state.charts.loginResults.data.datasets[0].data = [
                metrics.loginResults.success || 0,
                metrics.loginResults.failure || 0,
                metrics.loginResults.blocked || 0
            ];
            this.state.charts.loginResults.update();
        }
    },

    /**
     * Renderiza los eventos críticos en la tabla
     * @param {Array} events - Eventos críticos
     */
    renderCriticalEvents(events) {
        const tableBody = document.getElementById('critical-events-table');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!events || events.length === 0) {
            const emptyRow = createTableRow([
                { colspan: 5, className: 'text-center', text: 'No hay eventos críticos recientes' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        events.forEach(event => {
            const row = createTableRow([
                { text: event.eventType || 'UNKNOWN', className: 'text-nowrap' },
                { text: event.message || 'Sin descripción', className: 'text-truncate', style: { maxWidth: '200px' } },
                { text: event.ipAddress || '-', className: 'text-nowrap' },
                { 
                    text: formatDateTime(event.timestamp) || 'Fecha desconocida', 
                    className: 'text-nowrap' 
                },
                { 
                    html: '<button class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></button>',
                    className: 'text-end'
                }
            ], {
                onClick: () => this.handleEventClick(event)
            });
            
            tableBody.appendChild(row);
        });
    },

    /**
     * Maneja el clic en un evento
     * @param {Object} event - Evento de seguridad
     */
    handleEventClick(event) {
        modals.showEventDetails(event);
    },

    /**
     * Cambia el rango de tiempo de los gráficos
     * @param {string} range - Rango de tiempo (24h, 7d, 30d)
     */
    async changeTimeRange(range) {
        this.state.timeRange = range;
        
        document.getElementById('chart-24h')?.classList.toggle('active', range === '24h');
        document.getElementById('chart-7d')?.classList.toggle('active', range === '7d');
        document.getElementById('chart-30d')?.classList.toggle('active', range === '30d');
        
        try {
            // Primero limpiar datos de actividad para que se regeneren
            if (this.state.metrics) {
                delete this.state.metrics.activityByHour;
                delete this.state.metrics.criticalByHour;
            }
            
            this.showLoading(true);
            
            // Recargar métricas con nuevo rango
            const params = {};
            if (range === '7d') {
                params.days = 7;
            } else if (range === '30d') {
                params.days = 30;
            }
            
            const metrics = await getSecurityMetrics(params);
            
            this.state.metrics = this.processMetrics(metrics);
            
            await this.prepareChartData();
            
            this.updateCounters(this.state.metrics);
            this.updateCharts(this.state.metrics);
            
            this.showLoading(false);
        } catch (error) {
            console.error('Error cambiando rango de tiempo:', error);
            showNotification('Error', 'No se pudieron cargar los datos para el rango seleccionado', 'error');
            this.showLoading(false);
        }
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        // Implementar lógica para mostrar/ocultar spinners o placeholders
        const containers = [
            'events-24h-count',
            'critical-high-count',
            'blocked-ips-count',
            'failed-logins-count',
            'critical-events-table'
        ];
        
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (show) {
                    if (id === 'critical-events-table') {
                        element.innerHTML = '<tr><td colspan="5" class="text-center">Cargando datos...</td></tr>';
                    } else {
                        element.innerHTML = '<span class="placeholder col-6"></span>';
                    }
                }
            }
        });
    },

    /**
     * Inicia el refresco automático de datos
     */
    startAutoRefresh() {
        // Refrescar datos cada 5 minutos
        this.autoRefreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
    },

    /**
     * Detiene el refresco automático
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        this.stopAutoRefresh();
        
        document.getElementById('chart-24h')?.removeEventListener('click', () => this.changeTimeRange('24h'));
        document.getElementById('chart-7d')?.removeEventListener('click', () => this.changeTimeRange('7d'));
        document.getElementById('chart-30d')?.removeEventListener('click', () => this.changeTimeRange('30d'));
        
        window.removeEventListener('securityDataUpdated', () => this.loadDashboardData());
    }
};

export default dashboard;