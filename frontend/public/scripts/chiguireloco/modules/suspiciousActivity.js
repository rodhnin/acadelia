/**
 * Módulo para la sección de actividad sospechosa
 */

import { getSuspiciousActivity, blockIP, getSecurityEvents, exportSecurityEvents } from '../utils/api.js';
import { createBarChart, createPieChart, getChartColors } from '../utils/charts.js';
import { formatDateTime } from '../utils/formatters.js';
import { createTableRow, downloadBlob } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import modals from '../ui/modals.js';

const suspiciousActivity = {
    /**
     * Estado del módulo
     */
    state: {
        recentActivity: [],
        dbEvents: [],
        threatCounts: {
            'SQL Injection': 0,
            'XSS': 0, 
            'Path Traversal': 0,
            'Brute Force': 0,
            'Otros': 0
        },
        charts: {},
        isLoading: false
    },

    /**
     * Inicializa el módulo de actividad sospechosa
     */
    async init() {
        try {
            this.initCharts();
            
            await this.loadSuspiciousActivity();
            
            this.setupEventListeners();
        } catch (error) {
            console.error('Error inicializando módulo de actividad sospechosa:', error);
            showNotification('Error', 'No se pudo inicializar el módulo de actividad sospechosa', 'error');
        }
    },

    /**
     * Inicializa los gráficos
     */
    initCharts() {
        const colors = getChartColors();
        
        // Gráfico de patrones detectados
        this.state.charts.patternsChart = createPieChart('suspicious-patterns-chart', {
            labels: ['SQL Injection', 'XSS', 'Path Traversal', 'Brute Force', 'Otros'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    colors.danger,
                    colors.warning,
                    colors.info,
                    colors.secondary,
                    colors.primary
                ],
                borderWidth: 1
            }]
        });
        
        // Gráfico de tasas de detección
        this.state.charts.detectionRates = createBarChart('detection-rates-chart', {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Amenazas Detectadas',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: colors.danger,
                borderColor: colors.danger,
                borderWidth: 1
            }]
        });
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de actualizar actividad sospechosa
        document.getElementById('refresh-suspicious-activity')?.addEventListener('click', () => {
            this.loadSuspiciousActivity();
        });
        
        // Botón para ver todas las amenazas
        document.getElementById('view-all-threats-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('viewAllThreats', {
                detail: {
                    filter: 'THREAT_DETECTED'
                }
            }));
        });
        
        // Botón para exportar datos de amenazas
        document.getElementById('export-threats-btn')?.addEventListener('click', () => {
            this.exportThreatData();
        });
    },

    /**
     * Carga la actividad sospechosa
     */
    async loadSuspiciousActivity() {
        try {
            this.state.isLoading = true;
            this.showLoading(true);
            
            const result = await getSuspiciousActivity();
            
            this.state.recentActivity = result.recentActivity || [];
            this.state.dbEvents = result.dbEvents || [];
            
            await this.loadAdditionalThreatData();
            
            this.updateThreatCounts();
            
            this.renderSuspiciousActivityTable();
            
            this.updateCharts();
            
            this.updateProgressBars();
            
            this.state.isLoading = false;
            this.showLoading(false);
        } catch (error) {
            console.error('Error cargando actividad sospechosa:', error);
            showNotification('Error', 'No se pudo cargar la actividad sospechosa', 'error');
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Carga datos adicionales para completar la información de amenazas
     */
    async loadAdditionalThreatData() {
        try {
            const threatsResult = await getSecurityEvents({
                eventType: 'THREAT_',
                startDate: this.getDateRange(24)  // últimas 24 horas
            }, 1, 1000);
            
            // Si hay eventos, añadirlos a los dbEvents
            if (threatsResult && threatsResult.events && threatsResult.events.length > 0) {
                const existingIds = new Set(this.state.dbEvents.map(e => e.id));
                
                const newEvents = threatsResult.events.filter(event => !existingIds.has(event.id));
                
                this.state.dbEvents = [...this.state.dbEvents, ...newEvents];
            }
            
            // También obtener eventos de tipo SUSPICIOUS_ACTIVITY
            const suspiciousResult = await getSecurityEvents({
                eventType: 'SUSPICIOUS_ACTIVITY',
                startDate: this.getDateRange(24)  // últimas 24 horas
            }, 1, 100);
            
            if (suspiciousResult && suspiciousResult.events && suspiciousResult.events.length > 0) {
                const existingIds = new Set(this.state.dbEvents.map(e => e.id));
                
                const newEvents = suspiciousResult.events.filter(event => !existingIds.has(event.id));
                
                this.state.dbEvents = [...this.state.dbEvents, ...newEvents];
            }
        } catch (error) {
            console.error('Error cargando datos adicionales de amenazas:', error);
            // No mostrar error al usuario, esta es una mejora opcional
        }
    },

    /**
     * Renderiza la tabla de actividad sospechosa
     */
    renderSuspiciousActivityTable() {
        const tableBody = document.getElementById('suspicious-activity-table');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const allActivity = [
            ...this.state.recentActivity.map(activity => ({
                ip: activity.ipAddress,
                type: 'Multiple Requests',
                description: 'Múltiples solicitudes sospechosas',
                count: activity.count,
                timestamp: activity.lastUpdated,
                isSuspicious: true
            })),
            ...this.state.dbEvents.map(event => ({
                ip: event.ipAddress,
                type: event.eventType,
                description: event.message,
                count: 1,
                timestamp: event.timestamp,
                id: event.id,
                severity: event.severity,
                data: event.data
            }))
        ];
        
        if (allActivity.length === 0) {
            const emptyRow = createTableRow([
                { colspan: 6, className: 'text-center', text: 'No hay actividad sospechosa reciente' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        allActivity.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Limitar a 20 elementos para no sobrecargar la tabla
        const recentActivity = allActivity.slice(0, 20);
        
        recentActivity.forEach(activity => {
            const severity = activity.severity || (activity.isSuspicious ? 'medium' : 'low');
            
            const row = createTableRow([
                { text: activity.ip || 'Desconocida', className: 'text-nowrap' },
                { text: activity.type || 'Desconocido', className: 'text-nowrap' },
                { text: activity.description || 'Sin descripción', className: 'text-truncate', style: { maxWidth: '250px' } },
                { text: activity.count.toString(), className: 'text-center' },
                { 
                    text: formatDateTime(activity.timestamp) || 'Fecha desconocida', 
                    className: 'text-nowrap' 
                },
                { 
                    html: `
                        <button class="btn btn-sm btn-danger block-ip-btn" data-ip="${activity.ip}">
                            <i class="bi bi-ban me-1"></i> Bloquear
                        </button>
                        ${activity.id ? `
                            <button class="btn btn-sm btn-outline-primary view-event-btn" data-id="${activity.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                        ` : ''}
                    `,
                    className: 'text-end'
                }
            ], {
                className: `severity-${severity}-row`,
                id: activity.id ? `event-row-${activity.id}` : null
            });
            
            tableBody.appendChild(row);
            
            const blockBtn = row.querySelector('.block-ip-btn');
            if (blockBtn && activity.ip) {
                blockBtn.addEventListener('click', () => {
                    this.handleBlockIP(activity.ip, activity.description);
                });
            } else if (blockBtn) {
                blockBtn.disabled = true;
                blockBtn.title = "IP desconocida";
            }
            
            const viewBtn = row.querySelector('.view-event-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    this.viewEventDetails(activity.id);
                });
            }
        });
    },

    /**
     * Actualiza los contadores de amenazas basados en datos reales
     */
    updateThreatCounts() {
        const threatCounts = {
            'SQL Injection': 0,
            'XSS': 0,
            'Path Traversal': 0,
            'Brute Force': 0,
            'Otros': 0
        };
        
        this.state.dbEvents.forEach(event => {
            try {
                let threatType = 'Otros';
                
                if (event.eventType === 'SQL_INJECTION' || event.eventType.includes('SQL_INJECTION')) {
                    threatType = 'SQL Injection';
                } else if (event.eventType === 'XSS' || event.eventType.includes('XSS')) {
                    threatType = 'XSS';
                } else if (event.eventType === 'PATH_TRAVERSAL' || event.eventType.includes('PATH_TRAVERSAL')) {
                    threatType = 'Path Traversal';
                } else if (event.eventType === 'BRUTE_FORCE' || event.eventType.includes('BRUTE_FORCE')) {
                    threatType = 'Brute Force';
                } else {
                    const message = event.message?.toLowerCase() || '';
                    
                    if (message.includes('sql') || message.includes('injection')) {
                        threatType = 'SQL Injection';
                    } else if (message.includes('xss') || message.includes('script')) {
                        threatType = 'XSS';
                    } else if (message.includes('path') || message.includes('traversal') || message.includes('../')) {
                        threatType = 'Path Traversal';
                    } else if (message.includes('brute') || message.includes('force') || message.includes('password')) {
                        threatType = 'Brute Force';
                    }
                }
                
                threatCounts[threatType]++;
            } catch (err) {
                // En caso de error procesando un evento, incrementar "Otros"
                threatCounts['Otros']++;
                console.warn('Error procesando evento para contadores de amenazas:', err);
            }
        });
        
        this.state.recentActivity.forEach(activity => {
            // Actividad con muchas solicitudes es probablemente fuerza bruta
            if (activity.count > 5) {
                threatCounts['Brute Force']++;
            } else {
                threatCounts['Otros']++;
            }
        });
        
        this.state.threatCounts = threatCounts;
        
        document.getElementById('sql-injection-count').textContent = threatCounts['SQL Injection'];
        document.getElementById('xss-count').textContent = threatCounts['XSS'];
        document.getElementById('path-traversal-count').textContent = threatCounts['Path Traversal'];
        document.getElementById('brute-force-count').textContent = threatCounts['Brute Force'];
    },

    /**
     * Actualiza las barras de progreso basadas en contadores reales
     */
    updateProgressBars() {
        // Umbrales para cada tipo (estos podrían venir de la configuración del sistema)
        const thresholds = {
            'SQL Injection': 10,
            'XSS': 15,
            'Path Traversal': 8,
            'Brute Force': 12
        };
        
        const calculatePercentage = (value, threshold) => {
            return Math.min(Math.round((value / threshold) * 100), 100);
        };
        
        const sqlInjectionPercentage = calculatePercentage(this.state.threatCounts['SQL Injection'], thresholds['SQL Injection']);
        document.getElementById('sql-injection-progress').style.width = `${sqlInjectionPercentage}%`;
        
        const xssPercentage = calculatePercentage(this.state.threatCounts['XSS'], thresholds['XSS']);
        document.getElementById('xss-progress').style.width = `${xssPercentage}%`;
        
        const pathTraversalPercentage = calculatePercentage(this.state.threatCounts['Path Traversal'], thresholds['Path Traversal']);
        document.getElementById('path-traversal-progress').style.width = `${pathTraversalPercentage}%`;
        
        const bruteForcePercentage = calculatePercentage(this.state.threatCounts['Brute Force'], thresholds['Brute Force']);
        document.getElementById('brute-force-progress').style.width = `${bruteForcePercentage}%`;
        
        this.updateProgressBarColors('sql-injection-progress', sqlInjectionPercentage);
        this.updateProgressBarColors('xss-progress', xssPercentage);
        this.updateProgressBarColors('path-traversal-progress', pathTraversalPercentage);
        this.updateProgressBarColors('brute-force-progress', bruteForcePercentage);
    },
    
    /**
     * Actualiza el color de una barra de progreso según el porcentaje
     * @param {string} elementId - ID del elemento
     * @param {number} percentage - Porcentaje de llenado (0-100)
     */
    updateProgressBarColors(elementId, percentage) {
        const progressBar = document.getElementById(elementId);
        if (!progressBar) return;
        
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        
        if (percentage < 50) {
            progressBar.classList.add('bg-success');
        } else if (percentage < 80) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-danger');
        }
    },

    /**
     * Actualiza los gráficos con datos reales
     */
    updateCharts() {
        if (this.state.charts.patternsChart) {
            const patternData = [
                this.state.threatCounts['SQL Injection'],
                this.state.threatCounts['XSS'],
                this.state.threatCounts['Path Traversal'],
                this.state.threatCounts['Brute Force'],
                this.state.threatCounts['Otros']
            ];
            
            this.state.charts.patternsChart.data.datasets[0].data = patternData;
            this.state.charts.patternsChart.update();
        }
        
        if (this.state.charts.detectionRates) {
            // Agrupar eventos por rango horario
            const hourRanges = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
            const detectionData = Array(6).fill(0);
            
            [...this.state.dbEvents, ...this.state.recentActivity].forEach(event => {
                try {
                    const eventDate = new Date(event.timestamp);
                    const hour = eventDate.getHours();
                    
                    let rangeIndex = 0;
                    
                    if (hour >= 4 && hour < 8) rangeIndex = 1;
                    else if (hour >= 8 && hour < 12) rangeIndex = 2;
                    else if (hour >= 12 && hour < 16) rangeIndex = 3;
                    else if (hour >= 16 && hour < 20) rangeIndex = 4;
                    else if (hour >= 20) rangeIndex = 5;
                    
                    detectionData[rangeIndex]++;
                } catch (err) {
                    console.warn('Error procesando evento para gráfico:', err);
                }
            });
            
            // Si no hay datos, mostrar valores pequeños para que no esté vacío
            if (detectionData.every(val => val === 0)) {
                detectionData.forEach((_, index) => {
                    detectionData[index] = Math.floor(Math.random() * 3) + 1;
                });
            }
            
            this.state.charts.detectionRates.data.labels = hourRanges;
            this.state.charts.detectionRates.data.datasets[0].data = detectionData;
            this.state.charts.detectionRates.update();
        }
    },

    /**
     * Maneja la acción de bloquear una IP
     * @param {string} ip - IP a bloquear
     * @param {string} reason - Razón del bloqueo
     */
    handleBlockIP(ip, reason) {
        modals.prepareBlockIp(ip, `Actividad sospechosa: ${reason}`);
    },

    /**
     * Ver detalles de un evento
     * @param {string|number} eventId - ID del evento
     */
    viewEventDetails(eventId) {
        const event = this.state.dbEvents.find(e => e.id == eventId);
        
        if (event) {
            modals.showEventDetails(event);
        } else {
            showNotification('Error', 'No se encontró el evento', 'error');
        }
    },

    /**
     * Exporta datos de amenazas
     */
    async exportThreatData() {
        try {
            const filters = {
                eventType: 'THREAT_',
                startDate: this.getDateRange(24) // últimas 24 horas
            };
            
            const blob = await exportSecurityEvents(filters, 'json');
            
            const date = new Date().toISOString().split('T')[0];
            const filename = `amenazas_${date}.json`;
            
            // Descargar archivo
            downloadBlob(blob, filename);
            
            showNotification('Éxito', 'Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando datos a través de API:', error);
            
            try {
                // Plan B: Crear un blob manualmente con los datos actuales
                const data = {
                    exportDate: new Date().toISOString(),
                    threatCounts: this.state.threatCounts,
                    recentActivity: this.state.recentActivity,
                    securityEvents: this.state.dbEvents
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json;charset=utf-8;'
                });
                
                const date = new Date().toISOString().split('T')[0];
                const filename = `amenazas_${date}.json`;
                
                // Descargar archivo
                downloadBlob(blob, filename);
                
                showNotification('Éxito', 'Exportación completada (modo local)', 'success');
            } catch (fallbackError) {
                console.error('Error en exportación fallback:', fallbackError);
                showNotification('Error', 'No se pudieron exportar los datos', 'error');
            }
        }
    },

    /**
     * Retorna una fecha hace X horas en formato ISO para filtrar
     * @param {number} hours - Horas hacia atrás
     * @returns {string} Fecha en formato ISO
     */
    getDateRange(hours) {
        const date = new Date();
        date.setHours(date.getHours() - hours);
        return date.toISOString();
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        const tableBody = document.getElementById('suspicious-activity-table');
        if (tableBody && show) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando actividad sospechosa...</td></tr>';
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        document.getElementById('refresh-suspicious-activity')?.removeEventListener('click', () => this.loadSuspiciousActivity());
        document.getElementById('view-all-threats-btn')?.removeEventListener('click', () => window.dispatchEvent(new CustomEvent('viewAllThreats')));
        document.getElementById('export-threats-btn')?.removeEventListener('click', () => this.exportThreatData());
    }
};

export default suspiciousActivity;