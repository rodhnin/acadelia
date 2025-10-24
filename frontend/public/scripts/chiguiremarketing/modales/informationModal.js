// informationModal.js - Modal de información con dashboard completo (SIN INLINE HANDLERS)
import { 
  getMarketingSummary, 
  getProfiles, 
  getContents, 
  getTrends 
} from '../api/marketingAPI.js';
import { 
  formatNumber, 
  formatPercentage, 
  formatDate 
} from '../utils/formatting-marketing.js';

// Variable para controlar si Chart.js está disponible
let chartJsAvailable = false;

// Verificar disponibilidad de Chart.js
function checkChartJsAvailability() {
  chartJsAvailable = typeof Chart !== 'undefined';
  if (!chartJsAvailable) {
    console.warn('Chart.js no está disponible. Los gráficos no se mostrarán.');
  }
  return chartJsAvailable;
}

// Función principal para inicializar la modal de información
export function initInformationModal() {
  // Verificar Chart.js
  checkChartJsAvailability();
  
  // Buscar el modal de información
  const informationModal = document.getElementById('informationModal');
  if (!informationModal) {
    console.error('Modal de información no encontrado');
    return;
  }
  
  // 🔄 SOLO ESCUCHAR EL EVENTO modal:open (eliminar duplicado)
  informationModal.addEventListener('modal:open', async () => {
    console.log('🎯 Modal abierta - cargando dashboard...');
    await loadInformationDashboard();
  });
  
  console.log('✅ Modal de información inicializada (sin duplicados)');
}

// Función para cargar el dashboard completo
export async function loadInformationDashboard() {
  const modalBody = document.querySelector('#informationModal .modal-body');
  if (!modalBody) {
    console.error('Modal body no encontrado');
    return;
  }
  
  // Mostrar interfaz de carga
  showDashboardLoader(modalBody);
  
  try {
    // Cargar datos de forma paralela pero manejando errores individuales
    const [summaryResult, profilesResult, contentsResult, trendsResult] = await Promise.allSettled([
      getMarketingSummary(),
      getProfiles(),
      getContents(),
      getTrends()
    ]);
    
    // Procesar resultados
    const summary = summaryResult.status === 'fulfilled' && summaryResult.value?.success 
      ? summaryResult.value 
      : { stats: { profilesCount: 0, contentsCount: 0, interactions: [], recentTrends: [] }, predictions: [] };
      
    const profiles = profilesResult.status === 'fulfilled' && profilesResult.value?.success 
      ? profilesResult.value.profiles || [] 
      : [];
      
    const contents = contentsResult.status === 'fulfilled' && contentsResult.value?.success 
      ? contentsResult.value.contents || [] 
      : [];
      
    const trends = trendsResult.status === 'fulfilled' && trendsResult.value?.success 
      ? trendsResult.value.trends || [] 
      : [];
    
    // Renderizar dashboard
    renderDashboard(modalBody, summary, profiles, contents, trends);
    
    // Mostrar notificación de éxito
    if (window.showNotification) {
      window.showNotification('Dashboard de información cargado', 'success', 2000);
    }
    
  } catch (error) {
    console.error('Error cargando dashboard de información:', error);
    
    // Mostrar error en el dashboard
    showDashboardError(modalBody, error);
    
    if (window.showNotification) {
      window.showNotification('Error cargando información del dashboard', 'error');
    }
  }
}

// Función para mostrar loader
function showDashboardLoader(container) {
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Dashboard de Marketing</h1>
        <div class="dashboard-controls">
          <button class="refresh-button" id="dashboard-refresh-btn" data-action="refresh">
            <i class='bx bx-refresh'></i>
          </button>
        </div>
      </div>
      
      <div id="summary-section">
        <div class="summary-cards">
          ${generateSkeletonCards()}
        </div>
      </div>
      
      <div class="dashboard-grid">
        <div class="dashboard-section">
          <h2><i class='bx bx-user-circle'></i> Perfiles</h2>
          <div class="chart-wrapper">
            <div class="skeleton-chart"></div>
          </div>
        </div>
        
        <div class="dashboard-section">
          <h2><i class='bx bx-file'></i> Contenido</h2>
          <div class="chart-wrapper">
            <div class="skeleton-chart"></div>
          </div>
        </div>
        
        <div class="dashboard-section">
          <h2><i class='bx bx-trending-up'></i> Tendencias</h2>
          <div class="trends-list">
            ${generateSkeletonTrends()}
          </div>
        </div>
        
        <div class="dashboard-section">
          <h2><i class='bx bx-line-chart'></i> Predicciones</h2>
          <div class="prediction-cards">
            ${generateSkeletonPredictions()}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 🆕 AGREGAR EVENT LISTENER PARA EL BOTÓN DE REFRESH (sin inline handler)
  const refreshBtn = container.querySelector('#dashboard-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔄 Refrescando dashboard...');
      await loadInformationDashboard();
    });
  }
}

// Función para mostrar error
function showDashboardError(container, error) {
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Dashboard de Marketing</h1>
        <div class="dashboard-controls">
          <button class="refresh-button" id="dashboard-error-retry-btn" data-action="retry">
            <i class='bx bx-refresh'></i>
          </button>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; justify-content: center; height: 400px; flex-direction: column; gap: 20px;">
        <div style="text-align: center; padding: 40px; background: rgba(220, 53, 69, 0.1); border-radius: 12px; border: 1px solid rgba(220, 53, 69, 0.2);">
          <i class='bx bx-error' style="font-size: 64px; color: #dc3545; margin-bottom: 20px;"></i>
          <h3 style="color: #dc3545; margin-bottom: 16px;">Error al cargar el dashboard</h3>
          <p style="color: var(--color-text); opacity: 0.8; margin-bottom: 20px;">
            No se pudieron cargar los datos del dashboard. Revisa tu conexión e intenta nuevamente.
          </p>
          <button id="dashboard-manual-retry-btn" data-action="manual-retry"
                  style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">
            <i class='bx bx-refresh'></i> Reintentar
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 🆕 AGREGAR EVENT LISTENERS PARA BOTONES DE RETRY (sin inline handlers)
  const retryBtn = container.querySelector('#dashboard-error-retry-btn');
  const manualRetryBtn = container.querySelector('#dashboard-manual-retry-btn');
  
  if (retryBtn) {
    retryBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔄 Reintentando cargar dashboard...');
      await loadInformationDashboard();
    });
  }
  
  if (manualRetryBtn) {
    manualRetryBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔄 Reintentando cargar dashboard manualmente...');
      await loadInformationDashboard();
    });
  }
}

// Función para renderizar el dashboard completo
function renderDashboard(container, summary, profiles, contents, trends) {
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Dashboard de Marketing</h1>
        <div class="dashboard-controls">
          <button class="refresh-button" id="dashboard-main-refresh-btn" data-action="main-refresh">
            <i class='bx bx-refresh'></i>
          </button>
        </div>
      </div>
      
      <div id="summary-section">
        <div class="summary-cards" id="summary-cards">
          <!-- Se renderizarán las tarjetas -->
        </div>
      </div>
      
      <div class="dashboard-grid">
        <div id="profiles-section" class="dashboard-section">
          <h2><i class='bx bx-user-circle'></i> Perfiles</h2>
          <div class="chart-wrapper" id="profiles-chart-wrapper">
            <!-- Se renderizará el gráfico de perfiles -->
          </div>
        </div>
        
        <div id="content-section" class="dashboard-section">
          <h2><i class='bx bx-file'></i> Contenido</h2>
          <div class="content-types" id="content-types">
            <!-- Se renderizarán los filtros de tipo -->
          </div>
          <div class="chart-wrapper" id="content-chart-wrapper">
            <!-- Se renderizará el gráfico de contenidos -->
          </div>
        </div>
        
        <div id="trends-section" class="dashboard-section">
          <h2><i class='bx bx-trending-up'></i> Tendencias</h2>
          <div class="trends-list" id="trends-list">
            <!-- Se renderizarán las tendencias -->
          </div>
        </div>
        
        <div id="predictions-section" class="dashboard-section">
          <h2><i class='bx bx-line-chart'></i> Predicciones</h2>
          <div class="prediction-cards" id="prediction-cards">
            <!-- Se renderizarán las predicciones -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 🆕 CONFIGURAR EVENT LISTENERS (sin inline handlers)
  const mainRefreshBtn = container.querySelector('#dashboard-main-refresh-btn');
  
  if (mainRefreshBtn) {
    mainRefreshBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔄 Refrescando dashboard desde botón principal...');
      await loadInformationDashboard();
      if (window.showNotification) {
        window.showNotification('Dashboard actualizado', 'success');
      }
    });
  }
  
  // Renderizar cada sección
  renderSummaryCards(summary);
  renderProfilesChart(profiles);
  renderContentsChart(contents);
  renderTrendsSection(trends);
  renderPredictionsSection(summary.predictions || []);
}

// Renderizar tarjetas de resumen
function renderSummaryCards(summary) {
  const container = document.getElementById('summary-cards');
  if (!container) return;
  
  if (!summary || !summary.stats) {
    container.innerHTML = `
      <div class="summary-card">
        <div class="card-icon"><i class='bx bx-error'></i></div>
        <div class="card-value">Error</div>
        <div class="card-label">No se pudieron cargar los datos</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="summary-card">
      <div class="card-icon"><i class='bx bx-user'></i></div>
      <div class="card-value">${formatNumber(summary.stats.profilesCount || 0)}</div>
      <div class="card-label">Perfiles</div>
    </div>
    
    <div class="summary-card">
      <div class="card-icon"><i class='bx bx-file'></i></div>
      <div class="card-value">${formatNumber(summary.stats.contentsCount || 0)}</div>
      <div class="card-label">Contenidos</div>
    </div>
    
    <div class="summary-card">
      <div class="card-icon"><i class='bx bx-refresh'></i></div>
      <div class="card-value">${formatNumber(summary.stats.interactions?.length || 0)}</div>
      <div class="card-label">Interacciones</div>
    </div>
    
    <div class="summary-card">
      <div class="card-icon"><i class='bx bx-trending-up'></i></div>
      <div class="card-value">${formatNumber(summary.stats.recentTrends?.length || 0)}</div>
      <div class="card-label">Tendencias</div>
    </div>
  `;
}

// Renderizar gráfico de perfiles
function renderProfilesChart(profiles) {
  const container = document.getElementById('profiles-chart-wrapper');
  if (!container) return;
  
  if (!profiles || !profiles.length) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class='bx bx-info-circle'></i>
        <span>No hay perfiles disponibles</span>
      </div>
    `;
    return;
  }
  
  // Preparar contenedor con layout horizontal
  container.innerHTML = `
    <div class="profiles-chart">
      <div class="profiles-chart-container">
        ${chartJsAvailable ? '<canvas id="profiles-chart-canvas"></canvas>' : '<div class="chart-placeholder">Gráfico no disponible (Chart.js requerido)</div>'}
      </div>
      <div class="profiles-stats">
        <div class="stat-group">
          <h4>Distribución por nivel</h4>
          <div id="level-stats"></div>
        </div>
        <div class="stat-group">
          <h4>Canales preferidos</h4>
          <div id="channel-stats"></div>
        </div>
      </div>
    </div>
  `;
  
  // Solo crear gráficos si Chart.js está disponible
  if (chartJsAvailable) {
    // Agrupar perfiles por carrera
    const carreraGroups = {};
    profiles.forEach(profile => {
      const carrera = profile.metadata?.carrera || 'Otra';
      if (!carreraGroups[carrera]) {
        carreraGroups[carrera] = 0;
      }
      carreraGroups[carrera]++;
    });
    
    // Crear gráfico de torta para carreras
    const ctx = document.getElementById('profiles-chart-canvas');
    if (ctx) {
      new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
          labels: Object.keys(carreraGroups),
          datasets: [{
            label: 'Perfiles por Carrera',
            data: Object.values(carreraGroups),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#C9CBCF', '#7C83FD', '#96BB7C', '#F6A9A9'
            ],
            borderWidth: 2,
            borderColor: document.body.getAttribute('data-theme') === 'dark' ? '#1a1a1a' : '#f0efe7'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: document.body.getAttribute('data-theme') === 'dark' ? '#f0f0f0' : '#333333',
                font: {
                  size: 11
                }
              }
            },
            title: {
              display: true,
              text: 'Distribución por Carrera',
              color: document.body.getAttribute('data-theme') === 'dark' ? '#f0f0f0' : '#333333',
              font: {
                size: 13
              }
            }
          }
        }
      });
    }
  }
  
  // Estadísticas de nivel académico
  const levelStats = {};
  profiles.forEach(profile => {
    const level = profile.metadata?.nivel_academico || 'No especificado';
    if (!levelStats[level]) {
      levelStats[level] = 0;
    }
    levelStats[level]++;
  });
  
  const levelContainer = document.getElementById('level-stats');
  if (levelContainer) {
    levelContainer.innerHTML = Object.entries(levelStats)
      .map(([level, count]) => {
        const percentage = (count / profiles.length) * 100;
        return `
          <div class="stat-bar">
            <span class="stat-label">${level}</span>
            <div class="stat-progress" style="width: ${percentage}%"></div>
            <span class="stat-value">${formatPercentage(percentage, 0)}</span>
          </div>
        `;
      })
      .join('');
  }
  
  // Estadísticas de canales preferidos
  const channelStats = {};
  profiles.forEach(profile => {
    const channels = profile.metadata?.canales_preferidos || [];
    channels.forEach(channel => {
      if (!channelStats[channel]) {
        channelStats[channel] = 0;
      }
      channelStats[channel]++;
    });
  });
  
  const sortedChannels = Object.entries(channelStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const channelContainer = document.getElementById('channel-stats');
  if (channelContainer) {
    channelContainer.innerHTML = sortedChannels
      .map(([channel, count]) => {
        const percentage = profiles.length > 0 ? (count / profiles.length) * 100 : 0;
        return `
          <div class="stat-bar">
            <span class="stat-label">${channel}</span>
            <div class="stat-progress" style="width: ${percentage}%"></div>
            <span class="stat-value">${formatPercentage(percentage, 0)}</span>
          </div>
        `;
      })
      .join('');
  }
}

// Renderizar gráfico de contenidos
function renderContentsChart(contents) {
  const container = document.getElementById('content-chart-wrapper');
  const typesContainer = document.getElementById('content-types');
  
  if (!container) return;
  
  if (!contents || !contents.length) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class='bx bx-info-circle'></i>
        <span>No hay contenidos disponibles</span>
      </div>
    `;
    if (typesContainer) typesContainer.innerHTML = '';
    return;
  }
  
  // Agrupar contenidos por tipo
  const typeGroups = {};
  contents.forEach(content => {
    const type = content.type || 'Otro';
    if (!typeGroups[type]) {
      typeGroups[type] = 0;
    }
    typeGroups[type]++;
  });
  
  // Crear botones de filtro por tipo
  if (typesContainer) {
    typesContainer.innerHTML = `
      <button class="content-type-btn active" data-type="all">Todos</button>
      ${Object.keys(typeGroups).map(type => 
        `<button class="content-type-btn" data-type="${type}">${type}</button>`
      ).join('')}
    `;
    
    // 🆕 AÑADIR EVENT LISTENERS A BOTONES (sin inline handlers)
    typesContainer.querySelectorAll('.content-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Actualizar estado activo
        typesContainer.querySelectorAll('.content-type-btn').forEach(b => 
          b.classList.remove('active')
        );
        btn.classList.add('active');
        
        const type = btn.getAttribute('data-type');
        if (window.showNotification) {
          window.showNotification(`Filtro "${type}" aplicado`, 'info', 1500);
        }
      });
    });
  }
  
  // Preparar contenedor del gráfico
  container.innerHTML = chartJsAvailable 
    ? '<canvas id="content-chart-canvas"></canvas>'
    : '<div class="chart-placeholder">Gráfico no disponible (Chart.js requerido)</div>';
  
  // Solo crear gráfico si Chart.js está disponible
  if (chartJsAvailable) {
    // Agrupar contenidos por canal
    const channelGroups = {};
    contents.forEach(content => {
      const channel = content.channel || 'Otro';
      if (!channelGroups[channel]) {
        channelGroups[channel] = 0;
      }
      channelGroups[channel]++;
    });
    
    const sortedChannels = Object.entries(channelGroups)
      .sort((a, b) => b[1] - a[1]);
    
    const ctx = document.getElementById('content-chart-canvas');
    if (ctx) {
      new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: sortedChannels.map(([channel]) => channel),
          datasets: [{
            label: 'Contenidos por Canal',
            data: sortedChannels.map(([_, count]) => count),
            backgroundColor: '#656d4a',
            borderColor: '#582f0e',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Distribución por Canal',
              color: document.body.getAttribute('data-theme') === 'dark' ? '#f0f0f0' : '#333333'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: document.body.getAttribute('data-theme') === 'dark' ? '#f0f0f0' : '#333333'
              },
              grid: {
                color: document.body.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              ticks: {
                color: document.body.getAttribute('data-theme') === 'dark' ? '#f0f0f0' : '#333333'
              },
              grid: {
                color: document.body.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        }
      });
    }
  }
}

// Renderizar sección de tendencias
function renderTrendsSection(trends) {
  const container = document.getElementById('trends-list');
  if (!container) return;
  
  if (!trends || !trends.length) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class='bx bx-info-circle'></i>
        <span>No hay tendencias disponibles</span>
      </div>
    `;
    return;
  }
  
  const sortedTrends = [...trends].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  
  container.innerHTML = sortedTrends.map((trend, index) => `
    <div class="trend-item" data-trend-index="${index}">
      <div class="trend-item-header">
        <div class="trend-title">
          <i class='bx bx-trending-up'></i>
          ${trend.theme || 'Tendencia sin nombre'}
        </div>
        <div class="trend-popularity">
          <i class='bx bx-pulse'></i>
          ${formatPercentage(trend.popularity || 0, 0)}
        </div>
      </div>
      
      ${trend.analysis?.recommended_channels ? `
        <div class="trend-channels">
          ${trend.analysis.recommended_channels.map(channel => 
            `<span class="trend-channel">${channel}</span>`
          ).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
  
  // 🆕 AÑADIR EVENT LISTENERS A TENDENCIAS (sin inline handlers)
  container.querySelectorAll('.trend-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(item.getAttribute('data-trend-index'));
      const trend = sortedTrends[index];
      
      if (window.showNotification && trend) {
        window.showNotification(`Detalles de tendencia "${trend.theme}" no disponibles en esta versión`, 'info');
      }
    });
  });
}

// Renderizar sección de predicciones
function renderPredictionsSection(predictions) {
  const container = document.getElementById('prediction-cards');
  if (!container) return;
  
  if (!predictions || !predictions.length) {
    container.innerHTML = `
      <div class="no-data-message">
        <i class='bx bx-info-circle'></i>
        <span>No hay predicciones disponibles</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = predictions.map(prediction => {
    const mainMetric = prediction.metrics?.conversion || 
                      prediction.metrics?.engagement || 
                      (prediction.metrics ? Object.values(prediction.metrics)[0] : 0);
    
    const formattedMetrics = prediction.metrics ? Object.entries(prediction.metrics).map(([key, value]) => {
      return {
        label: formatMetricLabel(key),
        value: formatPercentage(value, 1)
      };
    }) : [];
    
    return `
      <div class="prediction-card">
        <div class="prediction-header">
          <div class="prediction-title">${prediction.campaign || 'Campaña sin nombre'}</div>
          <div class="prediction-value">${formatPercentage(mainMetric, 1)}</div>
        </div>
        
        <div class="prediction-details">
          ${formattedMetrics.map(metric => `
            <div class="prediction-metric">
              <span class="prediction-metric-label">${metric.label}</span>
              <span class="prediction-metric-value">${metric.value}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="prediction-metric">
          <span class="prediction-metric-label">Confianza</span>
          <span class="prediction-metric-value">${formatPercentage(prediction.confidence || 0, 0)}</span>
          <div class="prediction-progress">
            <div class="prediction-progress-bar" style="width: ${(prediction.confidence || 0) * 100}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Funciones auxiliares para skeletons
function generateSkeletonCards() {
  return Array.from({ length: 4 }, () => `
    <div class="summary-card skeleton">
      <div class="skeleton-line" style="width: 40%; height: 24px;"></div>
      <div class="skeleton-line" style="width: 70%; height: 36px; margin: 16px 0;"></div>
      <div class="skeleton-line" style="width: 50%; height: 18px;"></div>
    </div>
  `).join('');
}

function generateSkeletonTrends() {
  return Array.from({ length: 3 }, () => `
    <div class="trend-item skeleton">
      <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
      <div class="skeleton-line" style="width: 100%; height: 16px; margin-top: 8px;"></div>
      <div class="skeleton-line" style="width: 60%; height: 16px; margin-top: 8px;"></div>
    </div>
  `).join('');
}

function generateSkeletonPredictions() {
  return Array.from({ length: 2 }, () => `
    <div class="prediction-card skeleton">
      <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
      <div class="skeleton-line" style="width: 100%; height: 16px; margin-top: 8px;"></div>
      <div class="skeleton-line" style="width: 60%; height: 16px; margin-top: 8px;"></div>
    </div>
  `).join('');
}

// Formatear etiquetas de métricas
function formatMetricLabel(key) {
  const labels = {
    'open_rate': 'Tasa de apertura',
    'click_rate': 'Tasa de clics',
    'conversion': 'Conversión',
    'engagement': 'Engagement',
    'shares': 'Compartidos'
  };
  
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// Exportar funciones para uso global
window.loadInformationDashboard = loadInformationDashboard;
window.initInformationModal = initInformationModal;