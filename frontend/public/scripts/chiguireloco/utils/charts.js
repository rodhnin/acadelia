/**
 * Módulo para gestionar gráficos del dashboard
 */

/**
 * Colores por defecto para gráficos
 * @type {Object}
 */
const CHART_COLORS = {
    primary: '#656d4a',
    secondary: '#a4ac86',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    light: '#f8f9fa',
    dark: '#343a40',
    marron: '#582f0e',
    marronOscuro: '#442409',
    
    // Colores para estados de severidad
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#0dcaf0',
    
    // Colores para tipos de eventos
    login: '#198754',
    threat: '#dc3545',
    suspicious: '#ffc107',
    admin: '#0dcaf0',
    system: '#6c757d'
};

/**
 * Mapeo de colores para tipos de eventos
 * @type {Object}
 */
const EVENT_TYPE_COLORS = {
    'LOGIN_SUCCESS': CHART_COLORS.login,
    'LOGIN_FAILURE': CHART_COLORS.danger,
    'PASSWORD_CHANGE': CHART_COLORS.info,
    'PASSWORD_RESET': CHART_COLORS.warning,
    'TOKEN_REVOCATION': CHART_COLORS.secondary,
    'THREAT_DETECTED': CHART_COLORS.critical,
    'SUSPICIOUS_ACTIVITY': CHART_COLORS.warning,
    'BLOCKED_IP': CHART_COLORS.danger,
    'BRUTE_FORCE': CHART_COLORS.danger,
    'SERVER_ERROR': CHART_COLORS.danger,
    'SLOW_RESPONSE': CHART_COLORS.warning,
    'ADMIN_ACTION': CHART_COLORS.info,
    'MANUAL_IP_BLOCK': CHART_COLORS.danger,
    'SECURITY_CONFIG_CHANGE': CHART_COLORS.secondary
};

/**
 * Configuración por defecto para ejes
 * @type {Object}
 */
const DEFAULT_SCALES = {
    x: {
        grid: {
            color: 'rgba(0,0,0,0.05)',
            borderColor: 'rgba(0,0,0,0.1)'
        }
    },
    y: {
        beginAtZero: true,
        grid: {
            color: 'rgba(0,0,0,0.05)',
            borderColor: 'rgba(0,0,0,0.1)'
        }
    }
};

/**
 * Configuración para tema oscuro
 * @type {Object}
 */
const DARK_MODE_SCALES = {
    x: {
        grid: {
            color: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)'
        },
        ticks: {
            color: 'rgba(255,255,255,0.7)'
        }
    },
    y: {
        beginAtZero: true,
        grid: {
            color: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)'
        },
        ticks: {
            color: 'rgba(255,255,255,0.7)'
        }
    }
};

/**
 * Instancias de gráficos activas
 * @type {Object}
 */
const activeCharts = {};

/**
 * Inicializa un gráfico de líneas
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} data - Datos para el gráfico
 * @param {Object} [options] - Opciones adicionales
 * @returns {Object} Instancia del gráfico
 */
export function createLineChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
        console.error(`Elemento canvas con ID ${elementId} no encontrado`);
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (activeCharts[elementId]) {
        activeCharts[elementId].destroy();
    }
    
    // Aplicar el tema según el modo actual
    const isDarkMode = document.body.classList.contains('dark-mode');
    const scales = isDarkMode ? DARK_MODE_SCALES : DEFAULT_SCALES;
    
    // Configuración del gráfico
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : undefined
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        scales
    };
    
    // Combinar opciones
    const chartOptions = { ...defaultOptions, ...options };
    
    // Crear gráfico
    const chart = new Chart(canvas, {
        type: 'line',
        data,
        options: chartOptions
    });
    
    // Guardar referencia
    activeCharts[elementId] = chart;
    
    return chart;
}

/**
 * Inicializa un gráfico de barras
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} data - Datos para el gráfico
 * @param {Object} [options] - Opciones adicionales
 * @returns {Object} Instancia del gráfico
 */
export function createBarChart(elementId, data, options = {}) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
        console.error(`Elemento canvas con ID ${elementId} no encontrado`);
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (activeCharts[elementId]) {
        activeCharts[elementId].destroy();
    }
    
    // Aplicar el tema según el modo actual
    const isDarkMode = document.body.classList.contains('dark-mode');
    const scales = isDarkMode ? DARK_MODE_SCALES : DEFAULT_SCALES;
    
    // Configuración del gráfico
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : undefined
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales
    };
    
    // Combinar opciones
    const chartOptions = { ...defaultOptions, ...options };
    
    // Crear gráfico
    const chart = new Chart(canvas, {
        type: 'bar',
        data,
        options: chartOptions
    });
    
    // Guardar referencia
    activeCharts[elementId] = chart;
    
    return chart;
}

/**
 * Inicializa un gráfico de dona o pastel
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} data - Datos para el gráfico
 * @param {Object} [options] - Opciones adicionales
 * @param {boolean} [doughnut=true] - Si es dona (true) o pastel (false)
 * @returns {Object} Instancia del gráfico
 */
export function createPieChart(elementId, data, options = {}, doughnut = true) {
    const canvas = document.getElementById(elementId);
    if (!canvas) {
        console.error(`Elemento canvas con ID ${elementId} no encontrado`);
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (activeCharts[elementId]) {
        activeCharts[elementId].destroy();
    }
    
    // Aplicar el tema según el modo actual
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Configuración del gráfico
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : undefined
                }
            }
        }
    };
    
    // Combinar opciones
    const chartOptions = { ...defaultOptions, ...options };
    
    // Crear gráfico
    const chart = new Chart(canvas, {
        type: doughnut ? 'doughnut' : 'pie',
        data,
        options: chartOptions
    });
    
    // Guardar referencia
    activeCharts[elementId] = chart;
    
    return chart;
}

/**
 * Actualiza un gráfico existente
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} newData - Nuevos datos para el gráfico
 * @param {boolean} [animate=true] - Si debe animarse la actualización
 */
export function updateChart(elementId, newData, animate = true) {
    const chart = activeCharts[elementId];
    
    if (!chart) {
        console.warn(`No se encontró un gráfico con ID ${elementId}`);
        return;
    }
    
    // Actualizar datos
    chart.data = newData;
    
    // Actualizar gráfico
    chart.update(animate ? undefined : 0);
}

/**
 * Crea un gráfico de actividad por hora
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} activityData - Datos de actividad por hora
 * @param {Object} [criticalData] - Datos de actividad crítica por hora (opcional)
 * @returns {Object} Instancia del gráfico
 */
export function createActivityChart(elementId, activityData, criticalData = null) {
    const labels = [];
    const totalEvents = [];
    const criticalEvents = criticalData ? [] : null;
    
    // Ordenar horas y formatear datos
    const hours = Object.keys(activityData).sort();
    
    for (const hour of hours) {
        labels.push(hour);
        totalEvents.push(activityData[hour]);
        
        if (criticalData && criticalData[hour] !== undefined) {
            criticalEvents.push(criticalData[hour]);
        }
    }
    
    // Configurar conjuntos de datos
    const datasets = [
        {
            label: 'Total de Eventos',
            data: totalEvents,
            borderColor: CHART_COLORS.primary,
            backgroundColor: 'rgba(101, 109, 74, 0.2)',
            fill: true,
            tension: 0.2
        }
    ];
    
    // Añadir datos críticos si existen
    if (criticalEvents) {
        datasets.push({
            label: 'Eventos Críticos',
            data: criticalEvents,
            borderColor: CHART_COLORS.critical,
            backgroundColor: 'rgba(220, 53, 69, 0.2)',
            fill: true,
            tension: 0.2
        });
    }
    
    // Crear gráfico
    return createLineChart(elementId, { labels, datasets });
}

/**
 * Crea un gráfico de distribución por tipo de evento
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} eventTypesData - Datos de tipos de eventos
 * @returns {Object} Instancia del gráfico
 */
export function createEventTypesChart(elementId, eventTypesData) {
    const labels = [];
    const data = [];
    const backgroundColor = [];
    
    // Preparar datos
    for (const [type, count] of Object.entries(eventTypesData)) {
        labels.push(type);
        data.push(count);
        backgroundColor.push(EVENT_TYPE_COLORS[type] || CHART_COLORS.secondary);
    }
    
    // Crear gráfico
    return createPieChart(elementId, {
        labels,
        datasets: [{
            data,
            backgroundColor,
            borderWidth: 1
        }]
    });
}

/**
 * Crea un gráfico de resultados de login
 * @param {string} elementId - ID del elemento canvas
 * @param {Object} loginResultsData - Datos de resultados de login
 * @returns {Object} Instancia del gráfico
 */
export function createLoginResultsChart(elementId, loginResultsData) {
    const data = {
        labels: ['Exitosos', 'Fallidos', 'Bloqueados'],
        datasets: [{
            data: [
                loginResultsData.success || 0,
                loginResultsData.failure || 0,
                loginResultsData.blocked || 0
            ],
            backgroundColor: [
                CHART_COLORS.success,
                CHART_COLORS.danger,
                CHART_COLORS.warning
            ],
            borderWidth: 1
        }]
    };
    
    // Crear gráfico
    return createPieChart(elementId, data);
}

/**
 * Actualiza los colores de todos los gráficos según el tema
 * @param {boolean} darkMode - Si está en modo oscuro
 */
export function updateChartsTheme(darkMode) {
    const scales = darkMode ? DARK_MODE_SCALES : DEFAULT_SCALES;
    const labelColor = darkMode ? 'rgba(255,255,255,0.7)' : undefined;
    
    // Actualizar cada gráfico activo
    for (const chartId in activeCharts) {
        const chart = activeCharts[chartId];
        
        // Actualizar escalas
        chart.options.scales = scales;
        
        // Actualizar color de etiquetas de leyenda
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels = {
                ...chart.options.plugins.legend.labels,
                color: labelColor
            };
        }
        
        // Actualizar el gráfico
        chart.update();
    }
}

/**
 * Obtiene los colores por defecto
 * @returns {Object} Colores por defecto
 */
export function getChartColors() {
    return CHART_COLORS;
}

/**
 * Obtiene el color para un tipo de evento específico
 * @param {string} eventType - Tipo de evento
 * @returns {string} Color asignado
 */
export function getEventTypeColor(eventType) {
    return EVENT_TYPE_COLORS[eventType] || CHART_COLORS.secondary;
}

/**
 * Destruye todos los gráficos activos
 */
export function destroyAllCharts() {
    for (const chartId in activeCharts) {
        activeCharts[chartId].destroy();
    }
    
    // Limpiar referencias
    Object.keys(activeCharts).forEach(key => delete activeCharts[key]);
}