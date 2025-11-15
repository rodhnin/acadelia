/**
 * Módulo para la sección de mantenimiento
 */

import { runSecurityCleanup, runSecurityDiagnostic, getSecurityLogs, getSecurityEvents, exportSecurityEvents } from '../utils/api.js';
import { showNotification } from '../utils/notifications.js';
import { formatDateTime } from '../utils/formatters.js';
import { downloadBlob } from '../utils/dom.js';

const maintenance = {
    /**
     * Estado del módulo
     */
    state: {
        lastCleanup: null,
        cleanupStats: {
            archivedEvents: 0,
            deletedEvents: 0,
            deletedLogins: 0
        },
        diagnosticResults: null,
        systemStatus: {
            database: true,
            redis: true,
            eventsTable: true,
            geoService: true
        },
        isLoading: false
    },

    /**
     * Inicializa el módulo de mantenimiento
     */
    async init() {
        try {
            await this.loadMaintenanceData();
            
            this.setupEventListeners();
        } catch (error) {
            console.error('Error inicializando módulo de mantenimiento:', error);
            showNotification('Error', 'No se pudo inicializar el módulo de mantenimiento', 'error');
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de ejecutar limpieza
        document.getElementById('confirm-cleanup')?.addEventListener('click', () => {
            this.handleRunCleanup();
        });
        
        // Botón de archivar eventos antiguos
        document.getElementById('archive-events-btn')?.addEventListener('click', () => {
            this.handleArchiveEvents();
        });
        
        // Botón de ejecutar diagnóstico
        document.getElementById('run-diagnostic-btn')?.addEventListener('click', () => {
            this.handleRunDiagnostic();
        });
        
        // Botón de ver logs
        document.getElementById('view-logs-btn')?.addEventListener('click', () => {
            this.viewLogs();
        });
        
        // Botón de descargar logs
        document.getElementById('download-logs-btn')?.addEventListener('click', () => {
            this.downloadLogs();
        });
    },

    /**
     * Carga los datos de mantenimiento
     */
    async loadMaintenanceData() {
        try {
            const cleanupEvents = await getSecurityEvents({
                eventType: 'SECURITY_CLEANUP',
            }, 1, 1);
            
            if (cleanupEvents && cleanupEvents.events && cleanupEvents.events.length > 0) {
                const lastCleanupEvent = cleanupEvents.events[0];
                
                this.state.lastCleanup = new Date(lastCleanupEvent.timestamp);
                
                let stats = { archivedEvents: 0, deletedEvents: 0, deletedLogins: 0 };
                
                try {
                    // Si data es string, parsearlo
                    const data = typeof lastCleanupEvent.data === 'string' ? 
                        JSON.parse(lastCleanupEvent.data) : lastCleanupEvent.data;
                    
                    stats = {
                        archivedEvents: data.archivedEvents || 0,
                        deletedEvents: data.deletedEvents || 0,
                        deletedLogins: data.deletedLogins || 0
                    };
                } catch (e) {
                    console.warn('Error al parsear datos de limpieza:', e);
                }
                
                this.state.cleanupStats = stats;
            }
            
            this.updateCleanupInfo();
            
            await this.checkSystemStatus();
        } catch (error) {
            console.error('Error cargando datos de mantenimiento:', error);
            // No mostrar notificación para no interrumpir la carga inicial
        }
    },

    /**
     * Realiza un chequeo rápido del estado del sistema
     */
    async checkSystemStatus() {
        try {
            const diagnosticResult = await runSecurityDiagnostic();
            
            if (diagnosticResult && diagnosticResult.components) {
                this.state.systemStatus = {
                    database: diagnosticResult.components.database?.status === 'operational',
                    redis: diagnosticResult.components.redis?.status === 'operational',
                    eventsTable: diagnosticResult.components.security_events?.status === 'operational',
                    geoService: diagnosticResult.components.geolocation?.status === 'operational'
                };
                
                this.state.diagnosticResults = diagnosticResult;
            }
            
            this.updateSystemStatus();
        } catch (error) {
            console.error('Error realizando chequeo del sistema:', error);
            // Mantener estado predeterminado para evitar mostrar fallos falsos
        }
    },

    /**
     * Actualiza la información de limpieza en la interfaz
     */
    updateCleanupInfo() {
        // Fecha de última limpieza
        const lastCleanupElem = document.getElementById('last-cleanup-date');
        if (lastCleanupElem) {
            lastCleanupElem.textContent = this.state.lastCleanup ? 
                formatDateTime(this.state.lastCleanup) : 'Nunca';
        }
        
        const archivedCounter = document.getElementById('archived-events-count');
        const deletedCounter = document.getElementById('deleted-events-count');
        const loginsCounter = document.getElementById('deleted-logins-count');
        
        if (archivedCounter) archivedCounter.textContent = this.state.cleanupStats.archivedEvents.toString();
        if (deletedCounter) deletedCounter.textContent = this.state.cleanupStats.deletedEvents.toString();
        if (loginsCounter) loginsCounter.textContent = this.state.cleanupStats.deletedLogins.toString();
        
        const archiveDaysElem = document.getElementById('archive-days');
        const deleteDaysElem = document.getElementById('delete-days');
        const loginDaysElem = document.getElementById('login-days');
        
        // Valores predeterminados típicos si no hay configuración específica
        if (archiveDaysElem) archiveDaysElem.textContent = '90';
        if (deleteDaysElem) deleteDaysElem.textContent = '365';
        if (loginDaysElem) loginDaysElem.textContent = '30';
    },

    /**
     * Actualiza el estado del sistema en la interfaz
     */
    updateSystemStatus() {
        const redisStatus = document.getElementById('redis-status');
        if (redisStatus) {
            redisStatus.textContent = this.state.systemStatus.redis ? 'Conectado' : 'Desconectado';
            redisStatus.className = `badge ${this.state.systemStatus.redis ? 'bg-success' : 'bg-danger'}`;
        }
        
        const geoStatus = document.getElementById('geo-status');
        if (geoStatus) {
            geoStatus.textContent = this.state.systemStatus.geoService ? 'Activo' : 'Inactivo';
            geoStatus.className = `badge ${this.state.systemStatus.geoService ? 'bg-success' : 'bg-danger'}`;
        }
    },

    /**
     * Maneja la acción de ejecutar limpieza
     */
    async handleRunCleanup() {
        try {
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmCleanupModal'));
            if (modal) modal.hide();
            
            this.state.isLoading = true;
            const runCleanupBtn = document.getElementById('run-cleanup-btn');
            if (runCleanupBtn) {
                runCleanupBtn.disabled = true;
                runCleanupBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ejecutando...';
            }
            
            showNotification('Info', 'Ejecutando limpieza programada...', 'info');
            
            const cleanupResult = await runSecurityCleanup();
            
            if (!cleanupResult || !cleanupResult.success) {
                throw new Error(cleanupResult?.error || 'Error desconocido');
            }
            
            this.state.lastCleanup = new Date();
            this.state.cleanupStats = {
                archivedEvents: cleanupResult.archivedEvents || 0,
                deletedEvents: cleanupResult.deletedEvents || 0,
                deletedLogins: cleanupResult.deletedLogins || 0
            };
            
            this.updateCleanupInfo();
            
            this.state.isLoading = false;
            if (runCleanupBtn) {
                runCleanupBtn.disabled = false;
                runCleanupBtn.innerHTML = '<i class="bi bi-trash me-2"></i> Ejecutar Limpieza Programada';
            }
            
            showNotification('Éxito', 'Limpieza completada correctamente', 'success');
        } catch (error) {
            console.error('Error ejecutando limpieza:', error);
            showNotification('Error', `No se pudo ejecutar la limpieza: ${error.message || 'Error desconocido'}`, 'error');
            
            this.state.isLoading = false;
            const runCleanupBtn = document.getElementById('run-cleanup-btn');
            if (runCleanupBtn) {
                runCleanupBtn.disabled = false;
                runCleanupBtn.innerHTML = '<i class="bi bi-trash me-2"></i> Ejecutar Limpieza Programada';
            }
        }
    },

    /**
     * Maneja la acción de archivar eventos antiguos
     */
    async handleArchiveEvents() {
        try {
            this.state.isLoading = true;
            const archiveBtn = document.getElementById('archive-events-btn');
            if (archiveBtn) {
                archiveBtn.disabled = true;
                archiveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Archivando...';
            }
            
            showNotification('Info', 'Archivando eventos antiguos...', 'info');
            
            // Nota: Si no existe esta opción en la API, podría ser necesario implementarla
            const archiveResult = await runSecurityCleanup({ archiveOnly: true });
            
            // Si la API devuelve un resultado exitoso
            if (archiveResult && archiveResult.success) {
                this.state.cleanupStats.archivedEvents += archiveResult.archivedEvents || 0;
                
                this.updateCleanupInfo();
                
                showNotification('Éxito', `${archiveResult.archivedEvents || 0} eventos archivados correctamente`, 'success');
            } else {
                throw new Error(archiveResult?.error || 'Error desconocido');
            }
            
            this.state.isLoading = false;
            if (archiveBtn) {
                archiveBtn.disabled = false;
                archiveBtn.innerHTML = '<i class="bi bi-archive me-2"></i> Archivar Eventos Antiguos';
            }
        } catch (error) {
            console.error('Error archivando eventos:', error);
            showNotification('Error', `No se pudieron archivar los eventos: ${error.message || 'Error desconocido'}`, 'error');
            
            this.state.isLoading = false;
            const archiveBtn = document.getElementById('archive-events-btn');
            if (archiveBtn) {
                archiveBtn.disabled = false;
                archiveBtn.innerHTML = '<i class="bi bi-archive me-2"></i> Archivar Eventos Antiguos';
            }
        }
    },

    /**
     * Maneja la acción de ejecutar diagnóstico
     */
    async handleRunDiagnostic() {
        try {
            this.state.isLoading = true;
            const diagnosticBtn = document.getElementById('run-diagnostic-btn');
            if (diagnosticBtn) {
                diagnosticBtn.disabled = true;
                diagnosticBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ejecutando...';
            }
            
            const resultsContainer = document.getElementById('diagnostic-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="text-center p-4">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Ejecutando diagnóstico...</span>
                        </div>
                        <p class="mt-3">Ejecutando pruebas de diagnóstico...</p>
                    </div>
                `;
            }
            
            const diagnosticResult = await runSecurityDiagnostic();
            
            this.state.diagnosticResults = diagnosticResult;
            
            this.renderDiagnosticResults(diagnosticResult);
            
            if (diagnosticResult.components) {
                this.state.systemStatus = {
                    database: diagnosticResult.components.database?.status === 'operational',
                    redis: diagnosticResult.components.redis?.status === 'operational',
                    eventsTable: diagnosticResult.components.security_events?.status === 'operational',
                    geoService: diagnosticResult.components.geolocation?.status === 'operational'
                };
                
                this.updateSystemStatus();
            }
            
            this.state.isLoading = false;
            if (diagnosticBtn) {
                diagnosticBtn.disabled = false;
                diagnosticBtn.innerHTML = '<i class="bi bi-play me-2"></i> Ejecutar Diagnóstico';
            }
            
            if (diagnosticResult.systemStatus === 'degraded') {
                showNotification('Advertencia', 'Diagnóstico completado: El sistema está degradado', 'warning');
            } else if (diagnosticResult.systemStatus === 'error') {
                showNotification('Error', 'Diagnóstico completado: El sistema tiene errores', 'error');
            } else {
                showNotification('Éxito', 'Diagnóstico completado: El sistema está saludable', 'success');
            }
        } catch (error) {
            console.error('Error ejecutando diagnóstico:', error);
            showNotification('Error', `No se pudo ejecutar el diagnóstico: ${error.message || 'Error desconocido'}`, 'error');
            
            this.state.isLoading = false;
            const diagnosticBtn = document.getElementById('run-diagnostic-btn');
            if (diagnosticBtn) {
                diagnosticBtn.disabled = false;
                diagnosticBtn.innerHTML = '<i class="bi bi-play me-2"></i> Ejecutar Diagnóstico';
            }
            
            const resultsContainer = document.getElementById('diagnostic-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error al ejecutar el diagnóstico: ${error.message || 'Error desconocido'}
                    </div>
                `;
            }
        }
    },

    /**
     * Renderiza los resultados del diagnóstico
     * @param {Object} result - Resultados del diagnóstico
     */
    renderDiagnosticResults(result) {
        const resultsContainer = document.getElementById('diagnostic-results');
        if (!resultsContainer) return;
        
        let html = '';
        
        // Si hay un error de nivel superior
        if (result.error || result.systemStatus === 'error') {
            html = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error en el diagnóstico: ${result.error || 'Sistema en estado de error'}
                </div>
            `;
        }
        
        if (result.components) {
            html += '<div class="list-group mb-4">';
            
            for (const [name, data] of Object.entries(result.components)) {
                const isOperational = data.status === 'operational';
                const statusClass = isOperational ? 'success' : (data.status === 'warning' ? 'warning' : 'danger');
                const statusIcon = isOperational ? 'check-circle-fill' : (data.status === 'warning' ? 'exclamation-triangle-fill' : 'x-circle-fill');
                
                html += `
                    <div class="list-group-item list-group-item-${statusClass} d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-${statusIcon} me-2"></i>
                            <strong>${this.formatComponentName(name)}</strong>
                        </div>
                        <span>${data.message || data.status}</span>
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        if (result.tests && result.tests.length > 0) {
            html += '<h5 class="mt-3 mb-3">Pruebas Detalladas</h5>';
            html += '<div class="list-group">';
            
            result.tests.forEach(test => {
                const statusClass = test.status === 'pass' ? 'success' : (test.status === 'warning' ? 'warning' : 'danger');
                const statusIcon = test.status === 'pass' ? 'check-circle-fill' : (test.status === 'warning' ? 'exclamation-triangle-fill' : 'x-circle-fill');
                
                html += `
                    <div class="list-group-item list-group-item-${statusClass} d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-${statusIcon} me-2"></i>
                            <strong>${test.name}</strong>
                        </div>
                        <span>${test.message}</span>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        if (result.recommendations && result.recommendations.length > 0) {
            html += '<h5 class="mt-3 mb-3">Recomendaciones</h5>';
            html += '<ul class="list-group">';
            
            result.recommendations.forEach(recommendation => {
                html += `
                    <li class="list-group-item">
                        <i class="bi bi-lightbulb-fill me-2 text-warning"></i>
                        ${recommendation}
                    </li>
                `;
            });
            
            html += '</ul>';
        }
        
        // Si no hay contenido, mostrar mensaje predeterminado
        if (!html) {
            html = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    No hay resultados de diagnóstico disponibles.
                </div>
            `;
        }
        
        resultsContainer.innerHTML = html;
    },
    
    /**
     * Formatea el nombre de un componente para mostrar
     * @param {string} name - Nombre técnico del componente
     * @returns {string} Nombre formateado
     */
    formatComponentName(name) {
        return name.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    /**
     * Visualiza los logs
     */
    async viewLogs() {
        try {
            const logType = document.getElementById('log-type').value;
            const logLines = document.getElementById('log-lines').value;
            
            const logContent = document.getElementById('log-content');
            if (logContent) {
                logContent.textContent = 'Cargando logs...';
            }
            
            const logsResult = await getSecurityLogs(logType, parseInt(logLines));
            
            if (!logsResult || !logsResult.logs) {
                throw new Error('No se recibieron datos de logs');
            }
            
            if (logContent) {
                logContent.textContent = logsResult.logs.content || 'No hay logs disponibles';
            }
        } catch (error) {
            console.error('Error visualizando logs:', error);
            showNotification('Error', `No se pudieron visualizar los logs: ${error.message || 'Error desconocido'}`, 'error');
            
            const logContent = document.getElementById('log-content');
            if (logContent) {
                logContent.textContent = `Error cargando logs: ${error.message || 'Error desconocido'}`;
            }
        }
    },

    /**
     * Descarga los logs
     */
    async downloadLogs() {
        try {
            const logType = document.getElementById('log-type').value;
            const logLines = document.getElementById('log-lines').value;
            
            showNotification('Info', 'Preparando descarga de logs...', 'info');
            
            const logsResult = await getSecurityLogs(logType, parseInt(logLines));
            
            if (!logsResult || !logsResult.logs) {
                throw new Error('No se recibieron datos de logs');
            }
            
            const blob = new Blob([logsResult.logs.content || ''], {
                type: 'text/plain;charset=utf-8;'
            });
            
            const date = new Date().toISOString().split('T')[0];
            const filename = `log_${logType}_${date}.txt`;
            
            // Descargar archivo
            downloadBlob(blob, filename);
            
            showNotification('Éxito', 'Logs descargados correctamente', 'success');
        } catch (error) {
            console.error('Error descargando logs:', error);
            showNotification('Error', `No se pudieron descargar los logs: ${error.message || 'Error desconocido'}`, 'error');
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        document.getElementById('confirm-cleanup')?.removeEventListener('click', () => this.handleRunCleanup());
        document.getElementById('archive-events-btn')?.removeEventListener('click', () => this.handleArchiveEvents());
        document.getElementById('run-diagnostic-btn')?.removeEventListener('click', () => this.handleRunDiagnostic());
        document.getElementById('view-logs-btn')?.removeEventListener('click', () => this.viewLogs());
        document.getElementById('download-logs-btn')?.removeEventListener('click', () => this.downloadLogs());
    }
};

export default maintenance;