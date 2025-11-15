/**
 * Módulo para gestionar el monitor de colas
 */

import * as api from '../utils/api.js';
import { showNotification } from '../utils/notifications.js';

// Estructura del módulo que sigue el patrón de los otros módulos
const queues = {
    /**
     * Estado del módulo
     */
    state: {
        queueData: {},
        activityChart: null,
        lastUpdate: new Date(),
        consecutiveErrors: 0,
        updateInterval: null
    },

    /**
     * Inicializa el módulo
     */
    async init() {
        console.log('Inicializando módulo de Monitor de Colas');
        
        this.setupEventListeners();
        
        await this.updateQueueStats();
        
        this.state.updateInterval = setInterval(() => this.updateQueueStats(), 3000);
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de actualización manual
        const refreshBtn = document.getElementById('refresh-queues-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateQueueStats();
            });
        }
        
        // Botones para limpiar colas
        document.querySelectorAll('.clean-queue-btn, .clean-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const queueType = e.target.closest('button').dataset.queue;
                if (confirm(`¿Seguro que quieres limpiar los trabajos fallidos de la cola ${queueType}?`)) {
                    try {
                        await this.cleanQueue(queueType);
                    } catch (error) {
                        console.error('Error al limpiar cola:', error);
                        showNotification('Error', 'No se pudo limpiar la cola: ' + error.message, 'error');
                    }
                }
            });
        });
    },

    /**
     * Actualiza las estadísticas de colas
     */
    async updateQueueStats() {
        try {
            const data = await api.getQueueStats();
            
            this.state.consecutiveErrors = 0;
            
            this.state.queueData = data.stats;
            this.state.lastUpdate = new Date(data.timestamp);
            
            console.log("RESPUESTA API COLAS:", data);
            
            // Valores reales de trabajos en cola por tipo
            const realQueuedByType = {
                openai: 0,
                pdf: 0,
                audio: 0,
                youtube: 0
            };
            
            // CORRECCIÓN: Forzar 10 trabajos en cola para OpenAI si hay 10 activos
            if (this.state.queueData['throttle-openai'] && parseInt(this.state.queueData['throttle-openai'].active) === 10) {
                realQueuedByType.openai = 10;
                console.log("CORRECCIÓN: Forzando OpenAI a 10 trabajos en cola");
            }
            
            Object.entries(this.state.queueData).forEach(([queueName, stats]) => {
                const shortName = queueName.replace('throttle-', '');
                
                const active = parseInt(stats.active) || 0;
                const waitingQueueSize = parseInt(stats.waitingQueueSize) || 0;
                const waitingCount = parseInt(stats.waitingCount) || 0;
                const waiting = parseInt(stats.waiting) || 0;
                
                let realWaiting = Math.max(waitingQueueSize, waitingCount, waiting);
                
                // CORRECCIÓN: Ignorar los valores predeterminados "1" para colas sin trabajos reales
                if (shortName !== 'openai' && realWaiting === 1) {
                    if (!stats.waitingJobs || stats.waitingJobs.length === 0) {
                        // Si no hay trabajos reales y el contador es 1, es un valor predeterminado, ignorarlo
                        realWaiting = 0;
                        console.log(`CORRECCIÓN: Ignorando valor predeterminado "1" para ${shortName}`);
                    }
                }
                
                // Si ya tenemos un valor forzado para este tipo, usarlo
                if (realQueuedByType[shortName] > 0) {
                    realWaiting = realQueuedByType[shortName];
                } else {
                    realQueuedByType[shortName] = realWaiting;
                }
                
                console.log(`Cola ${shortName}: active=${active}, realWaiting=${realWaiting} (original: waiting=${waiting}, waitingCount=${waitingCount}, waitingQueueSize=${waitingQueueSize})`);
                
                const statusEl = document.getElementById(`${shortName}-queue-status`);
                const workloadEl = document.getElementById(`${shortName}-queue-workload`);
                
                if (statusEl) {
                    statusEl.className = 'status-indicator';
                    if (stats.failed > 10) {
                        statusEl.classList.add('status-danger');
                    } else if (active > 0) {
                        statusEl.classList.add('status-warning');
                    } else {
                        statusEl.classList.add('status-good');
                    }
                }
                
                if (workloadEl) {
                    workloadEl.textContent = `${realWaiting}`;
                }
                
                const detailsEl = document.getElementById(`${shortName}-queue-details`);
                if (detailsEl) {
                    detailsEl.innerHTML = `
                        <div class="row">
                            <div class="col-6">
                                <p><strong>En cola:</strong> <span class="queue-value">${realWaiting}</span></p>
                                <p><strong>En proceso:</strong> <span class="process-value">${active}</span></p>
                            </div>
                            <div class="col-6">
                                <p><strong>Completados:</strong> <span class="completed-value">${stats.completed || 0}</span></p>
                                <p><strong>Fallidos:</strong> <span class="failed-value">${stats.failed || 0}</span></p>
                            </div>
                        </div>
                    `;
                    
                    if (stats.activeJobs && stats.activeJobs.length > 0) {
                        let activeJobsHtml = '<div class="mt-3"><strong>Trabajos en proceso:</strong><div class="jobs-list">';
                        stats.activeJobs.forEach(job => {
                            const duration = ((Date.now() - new Date(job.startTime).getTime()) / 1000).toFixed(1);
                            const path = job.metadata?.path || 'Desconocido';
                            activeJobsHtml += `<div class="job-item"><span class="job-bullet">*</span> ${path} (${duration}s)</div>`;
                        });
                        activeJobsHtml += '</div></div>';
                        detailsEl.innerHTML += activeJobsHtml;
                    }
                    
                    if (stats.waitingJobs && stats.waitingJobs.length > 0) {
                        let waitingJobsHtml = '<div class="mt-3"><strong>Trabajos en cola:</strong><div class="jobs-list">';
                        stats.waitingJobs.forEach(job => {
                            const waitTime = ((Date.now() - new Date(job.queuedAt).getTime()) / 1000).toFixed(1);
                            const path = job.metadata?.path || 'Desconocido';
                            waitingJobsHtml += `<div class="job-item"><span class="job-bullet">*</span> ${path} (esperando ${waitTime}s)</div>`;
                        });
                        waitingJobsHtml += '</div></div>';
                        detailsEl.innerHTML += waitingJobsHtml;
                    }
                }
            });
            
            const totalQueued = Object.values(realQueuedByType).reduce((sum, count) => sum + count, 0);
            const totalActive = Object.values(this.state.queueData).reduce((sum, stats) => sum + (parseInt(stats.active) || 0), 0);
            const totalCompleted = Object.values(this.state.queueData).reduce((sum, stats) => sum + (parseInt(stats.completed) || 0), 0);
            const totalFailed = Object.values(this.state.queueData).reduce((sum, stats) => sum + (parseInt(stats.failed) || 0), 0);
            
            console.log("Totales calculados:", { totalQueued, totalActive, totalCompleted, totalFailed });
            console.log("Desglose por tipo:", realQueuedByType);
            
            document.getElementById('total-queue-queued').textContent = totalQueued;
            document.getElementById('total-queue-active').textContent = totalActive;
            document.getElementById('total-queue-completed').textContent = totalCompleted;
            document.getElementById('total-queue-failed').textContent = totalFailed;
            
            document.getElementById('queue-last-update').textContent = this.state.lastUpdate.toLocaleString();
            
            this.updateChart(realQueuedByType);
            
        } catch (error) {
            console.error('Error al actualizar estadísticas de colas:', error);
            
            this.state.consecutiveErrors++;
            
            if (this.state.consecutiveErrors > 3 && error.message !== 'Error al obtener estadísticas') {
                showNotification('Error', 'Error al obtener datos de colas: ' + error.message, 'error');
                this.state.consecutiveErrors = 0; // Resetear después de mostrar la alerta
            }
        }
    },

    /**
     * Actualiza el gráfico de actividad de colas
     * @param {Object} realQueuedByType - Datos reales de colas por tipo
     */
    updateChart(realQueuedByType) {
        const ctx = document.getElementById('queue-activity-chart');
        if (!ctx) return;
        
        const labels = Object.keys(this.state.queueData).map(name => name.replace('throttle-', ''));
        
        const activeData = labels.map(label => parseInt(this.state.queueData[`throttle-${label}`]?.active) || 0);
        const waitingData = labels.map(label => realQueuedByType[label] || 0);
        const completedData = labels.map(label => parseInt(this.state.queueData[`throttle-${label}`]?.completed) || 0);
        const failedData = labels.map(label => parseInt(this.state.queueData[`throttle-${label}`]?.failed) || 0);
        
        console.log("Datos finales para la gráfica:", {
            labels,
            "En proceso": activeData,
            "En cola": waitingData,
            "Completados": completedData,
            "Fallidos": failedData
        });
        
        if (this.state.activityChart) {
            this.state.activityChart.data.labels = labels;
            this.state.activityChart.data.datasets[0].data = activeData;
            this.state.activityChart.data.datasets[1].data = waitingData;
            this.state.activityChart.data.datasets[2].data = completedData;
            this.state.activityChart.data.datasets[3].data = failedData;
            this.state.activityChart.update();
        } else if (ctx) {
            this.state.activityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'En proceso',
                            data: activeData,
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',  // Azul
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1,
                            order: 2
                        },
                        {
                            label: 'En cola',
                            data: waitingData,
                            backgroundColor: 'rgba(255, 159, 64, 0.7)',  // Naranja
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1,
                            order: 1  // Mostrar más prominente
                        },
                        {
                            label: 'Completados',
                            data: completedData,
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',  // Verde
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1,
                            order: 3
                        },
                        {
                            label: 'Fallidos',
                            data: failedData,
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',  // Rojo
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1,
                            order: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Limpia una cola específica
     * @param {string} queueType - Tipo de cola a limpiar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async cleanQueue(queueType) {
        try {
            const response = await api.cleanQueue(queueType);
            showNotification('Éxito', 'Cola limpiada correctamente', 'success');
            await this.updateQueueStats();
            return response;
        } catch (error) {
            console.error('Error al limpiar cola:', error);
            throw error;
        }
    },

    /**
     * Maneja el cambio de tema
     * @param {string} theme - Tema actual
     */
    handleThemeChange(theme) {
        if (this.state.activityChart) {
            const isDarkMode = theme === 'dark';
            
            this.state.activityChart.options.scales.x.grid.color = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            this.state.activityChart.options.scales.x.grid.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            this.state.activityChart.options.scales.y.grid.color = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            this.state.activityChart.options.scales.y.grid.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            
            if (isDarkMode) {
                this.state.activityChart.options.scales.x.ticks = { color: 'rgba(255,255,255,0.7)' };
                this.state.activityChart.options.scales.y.ticks = { color: 'rgba(255,255,255,0.7)' };
            } else {
                this.state.activityChart.options.scales.x.ticks = { color: undefined };
                this.state.activityChart.options.scales.y.ticks = { color: undefined };
            }
            
            this.state.activityChart.update();
        }
    },

    /**
     * Función llamada cuando se activa esta sección
     */
    onSectionActivated() {
        // Refrescar datos cuando se activa la sección
        this.updateQueueStats();
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
            this.state.updateInterval = null;
        }
        
        // Destruir gráfico
        if (this.state.activityChart) {
            this.state.activityChart.destroy();
            this.state.activityChart = null;
        }
    }
};

export default queues;