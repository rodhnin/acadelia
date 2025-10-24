/**
 * Módulo para la sección de eventos de seguridad
 */

import { getSecurityEvents, exportSecurityEvents } from '../utils/api.js';
import { formatDateTime, getSeverityClass } from '../utils/formatters.js';
import { createTableRow, updatePaginationInfo, downloadBlob } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import modals from '../ui/modals.js';

const events = {
    /**
     * Estado del módulo
     */
    state: {
        currentPage: 1,
        limit: 50,
        filters: {},
        events: [],
        pagination: {
            total: 0,
            pages: 0
        },
        isLoading: false
    },

    /**
     * Inicializa el módulo de eventos
     */
    async init() {
        // Inicializar filtros
        this.initFilters();
        
        // Cargar eventos iniciales
        await this.loadEvents();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Escuchar eventos globales
        window.addEventListener('viewAllCriticalEvents', () => {
            this.filterCriticalEvents();
        });
        
        window.addEventListener('exportSecurityEvents', () => {
            this.exportEvents();
        });
    },

    /**
     * Inicializa los filtros
     */
    initFilters() {
        // Establecer fecha final como hoy
        const today = new Date();
        const endDateInput = document.getElementById('date-end');
        if (endDateInput) {
            endDateInput.valueAsDate = today;
        }
        
        // Establecer fecha inicial como hace 7 días
        const startDate = new Date();
        startDate.setDate(today.getDate() - 7);
        const startDateInput = document.getElementById('date-start');
        if (startDateInput) {
            startDateInput.valueAsDate = startDate;
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de aplicar filtros
        document.getElementById('apply-event-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        // Botón de resetear filtros
        document.getElementById('reset-event-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });
        
        // Botones de paginación
        document.getElementById('prev-page-btn')?.addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.changePage(this.state.currentPage - 1);
            }
        });
        
        document.getElementById('next-page-btn')?.addEventListener('click', () => {
            if (this.state.currentPage < this.state.pagination.pages) {
                this.changePage(this.state.currentPage + 1);
            }
        });
        
        // Botón de exportar eventos filtrados
        document.getElementById('export-filtered-events')?.addEventListener('click', () => {
            this.exportEvents();
        });
        
        // Campo de búsqueda (submit con Enter)
        document.getElementById('events-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
    },

    /**
     * Carga los eventos con los filtros actuales
     * @param {number} [page=1] - Página a cargar
     */
    async loadEvents(page = 1) {
        try {
            // Mostrar indicador de carga
            this.state.isLoading = true;
            this.showLoading(true);
            
            // Actualizar página actual
            this.state.currentPage = page;
            
            // Obtener eventos con filtros
            const result = await getSecurityEvents(
                this.state.filters,
                page,
                this.state.limit
            );
            
            // Actualizar estado
            this.state.events = result.events;
            this.state.pagination = result.pagination;
            
            // Renderizar eventos
            this.renderEvents(result.events);
            
            // Actualizar información de paginación
            updatePaginationInfo(
                this.state.currentPage,
                this.state.pagination.pages,
                this.state.pagination.total,
                this.state.limit
            );
            
            // Ocultar indicador de carga
            this.state.isLoading = false;
            this.showLoading(false);
        } catch (error) {
            console.error('Error cargando eventos:', error);
            showNotification('Error', 'No se pudieron cargar los eventos', 'error');
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Renderiza los eventos en la tabla
     * @param {Array} events - Eventos a renderizar
     */
    renderEvents(events) {
        const tableBody = document.getElementById('events-table');
        if (!tableBody) return;
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        if (events.length === 0) {
            // Mostrar mensaje si no hay eventos
            const emptyRow = createTableRow([
                { colspan: 8, className: 'text-center', text: 'No se encontraron eventos con los filtros aplicados' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Añadir filas de eventos
        events.forEach(event => {
            const row = createTableRow([
                { text: event.id, className: 'text-nowrap' },
                { text: event.eventType, className: 'text-nowrap' },
                { 
                    html: `<span class="badge badge-severity severity-${event.severity}">${this.formatSeverity(event.severity)}</span>`,
                    className: 'text-center'
                },
                { text: event.message, className: 'text-truncate', style: { maxWidth: '300px' } },
                { text: event.ipAddress || '-', className: 'text-nowrap' },
                { text: event.userId || '-', className: 'text-nowrap' },
                { text: formatDateTime(event.timestamp), className: 'text-nowrap' },
                { 
                    html: '<button class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></button>',
                    className: 'text-end'
                }
            ], {
                className: `severity-${event.severity}-row`,
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
        // Mostrar detalles del evento en modal
        modals.showEventDetails(event);
    },

    /**
     * Aplica los filtros actuales
     */
    applyFilters() {
        // Recopilar valores de filtros
        const filters = {
            eventType: document.getElementById('event-type-filter')?.value,
            severity: document.getElementById('severity-filter')?.value,
            startDate: document.getElementById('date-start')?.value,
            endDate: document.getElementById('date-end')?.value,
            ip: document.getElementById('ip-filter')?.value,
            userId: document.getElementById('user-filter')?.value,
            search: document.getElementById('events-search')?.value
        };
        
        // Filtrar propiedades vacías
        Object.keys(filters).forEach(key => {
            if (!filters[key]) {
                delete filters[key];
            }
        });
        
        // Actualizar estado
        this.state.filters = filters;
        
        // Recargar eventos (volver a primera página)
        this.loadEvents(1);
    },

    /**
     * Resetea todos los filtros
     */
    resetFilters() {
        // Limpiar campos de filtro
        if (document.getElementById('event-type-filter')) {
            document.getElementById('event-type-filter').value = '';
        }
        
        if (document.getElementById('severity-filter')) {
            document.getElementById('severity-filter').value = '';
        }
        
        if (document.getElementById('events-search')) {
            document.getElementById('events-search').value = '';
        }
        
        if (document.getElementById('ip-filter')) {
            document.getElementById('ip-filter').value = '';
        }
        
        if (document.getElementById('user-filter')) {
            document.getElementById('user-filter').value = '';
        }
        
        // Fechas: mantener últimos 7 días
        this.initFilters();
        
        // Resetear estado de filtros
        this.state.filters = {};
        
        // Recargar eventos
        this.loadEvents(1);
    },

    /**
     * Aplica filtro para mostrar solo eventos críticos
     */
    filterCriticalEvents() {
        // Resetear primero
        this.resetFilters();
        
        // Establecer filtro de severidad crítica
        if (document.getElementById('severity-filter')) {
            document.getElementById('severity-filter').value = 'critical';
        }
        
        // Aplicar filtros
        this.applyFilters();
    },

    /**
     * Cambia a una página específica
     * @param {number} page - Número de página
     */
    changePage(page) {
        // Validar página
        if (page < 1 || page > this.state.pagination.pages) return;
        
        // Cargar eventos de la página
        this.loadEvents(page);
    },

    /**
     * Exporta los eventos con los filtros actuales
     * @param {string} [format='csv'] - Formato de exportación
     */
    async exportEvents(format = 'csv') {
        try {
            // Mostrar notificación
            showNotification('Info', 'Preparando exportación...', 'info');
            
            // Realizar la exportación
            const blob = await exportSecurityEvents(this.state.filters, format);
            
            // Generar nombre de archivo
            const date = new Date().toISOString().split('T')[0];
            const filename = `eventos_seguridad_${date}.${format}`;
            
            // Descargar archivo
            downloadBlob(blob, filename);
            
            // Mostrar notificación de éxito
            showNotification('Éxito', 'Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando eventos:', error);
            showNotification('Error', 'No se pudieron exportar los eventos', 'error');
        }
    },

    /**
     * Formatea un valor de severidad
     * @param {string} severity - Valor de severidad
     * @returns {string} Texto formateado
     */
    formatSeverity(severity) {
        const severityMap = {
            'critical': 'Crítico',
            'high': 'Alto',
            'medium': 'Medio',
            'low': 'Bajo',
            'info': 'Info'
        };
        
        return severityMap[severity] || severity;
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        const tableBody = document.getElementById('events-table');
        if (!tableBody) return;
        
        if (show) {
            // Mostrar indicador de carga
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando eventos...</td></tr>';
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        // Limpiar event listeners
        document.getElementById('apply-event-filters')?.removeEventListener('click', () => this.applyFilters());
        document.getElementById('reset-event-filters')?.removeEventListener('click', () => this.resetFilters());
        document.getElementById('prev-page-btn')?.removeEventListener('click', () => this.changePage(this.state.currentPage - 1));
        document.getElementById('next-page-btn')?.removeEventListener('click', () => this.changePage(this.state.currentPage + 1));
        document.getElementById('export-filtered-events')?.removeEventListener('click', () => this.exportEvents());
        
        window.removeEventListener('viewAllCriticalEvents', () => this.filterCriticalEvents());
        window.removeEventListener('exportSecurityEvents', () => this.exportEvents());
    }
};

export default events;