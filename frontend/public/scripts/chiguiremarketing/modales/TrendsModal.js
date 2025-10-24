// TrendsModal.js - Modal de Tendencias con Dashboard Corporativo Y ELIMINACIÓN
import { getTrends, createTrend, deleteTrend, deleteAllTrends } from '../api/marketingAPI.js';
import { 
  formatNumber, 
  formatPercentage, 
  formatDate, 
  formatRelativeDate 
} from '../utils/formatting-marketing.js';

let trendsData = [];
let filteredTrendsData = [];
let currentView = 'grid';
let chartsInstances = {};

// Inicializar la modal de tendencias
export function initTrendsModal() {
  console.log('🎯 Inicializando modal de tendencias...');
  
  const trendsModal = document.getElementById('trendsModal');
  if (!trendsModal) {
    console.error('❌ Modal de tendencias no encontrada');
    return;
  }
  
  // Event listener para cargar datos cuando se abra la modal
  trendsModal.addEventListener('modal:open', async () => {
    console.log('📈 Modal de tendencias abierta - Cargando dashboard...');
    await loadTrendsDashboard();
    setupModalHierarchy();
  });
  
  // Event listener para limpiar cuando se cierre la modal
  trendsModal.addEventListener('modal:close', () => {
    cleanupModalHierarchy();
  });
  
  console.log('✅ Modal de tendencias inicializada correctamente');
}

// Cargar el dashboard completo de tendencias
async function loadTrendsDashboard() {
  const modalBody = document.querySelector('#trendsModal .modal-body');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="trends-loading">
      <div class="spinner"></div>
      <p>Cargando dashboard de tendencias...</p>
    </div>
  `;
  
  try {
    await loadTrendsData();
    renderTrendsDashboard();
    setupTrendsEvents();
    
    setTimeout(() => {
      initializeTrendsCharts();
    }, 100);
    
  } catch (error) {
    console.error('❌ Error cargando dashboard de tendencias:', error);
    showTrendsError('Error cargando el dashboard de tendencias');
  }
}

// Cargar datos de tendencias desde la API
async function loadTrendsData() {
  try {
    console.log('📊 Cargando datos de tendencias desde API...');
    
    const response = await getTrends();
    
    if (response && response.success && response.trends) {
      trendsData = response.trends.map(trend => processTrendData(trend));
      filteredTrendsData = [...trendsData];
      
      console.log(`✅ ${trendsData.length} tendencias cargadas exitosamente`);
    } else {
      console.warn('⚠️ Respuesta de API vacía o inválida');
      trendsData = [];
      filteredTrendsData = [];
    }
    
  } catch (error) {
    console.error('❌ Error cargando datos de tendencias:', error);
    // Usar datos de fallback para demostración
    trendsData = generateFallbackTrendsData();
    filteredTrendsData = [...trendsData];
  }
}

// Procesar datos de tendencia individuales
function processTrendData(trend) {
  let metadata = {};
  
  if (typeof trend.metadata === 'string') {
    try {
      metadata = JSON.parse(trend.metadata);
    } catch (e) {
      console.warn('⚠️ Error parseando metadata JSON:', e);
      metadata = {};
    }
  } else if (typeof trend.metadata === 'object' && trend.metadata !== null) {
    metadata = trend.metadata;
  }
  
  const processedTrend = {
    id: trend.id,
    theme: trend.theme || 'Tendencia sin título',
    popularity: parseFloat(trend.popularity) || 0,
    created_at: trend.created_at,
    
    description: metadata.description || metadata.descripcion || metadata.tema || '',
    audience: metadata.audience || metadata.audiencia || '',
    channels: extractChannels(metadata),
    contentType: metadata.content_type || metadata.tipo_contenido || metadata.tipo || '',
    categories: extractCategories(metadata),
    
    origin: metadata.origen || metadata.origin || '',
    highlightedPhrases: metadata['frases destacadas'] || metadata.phrases || metadata.frases || [],
    additionalInfo: extractAdditionalInfo(metadata),
    
    originalMetadata: metadata
  };
  
  return processedTrend;
}

// Extraer canales del metadata
function extractChannels(metadata) {
  const channels = [];
  
  if (metadata.canal) channels.push(metadata.canal);
  if (metadata.canales) {
    if (typeof metadata.canales === 'string') {
      channels.push(...metadata.canales.split(/[,\sy]+/).filter(c => c.trim()));
    } else if (Array.isArray(metadata.canales)) {
      channels.push(...metadata.canales);
    }
  }
  if (metadata.channels) {
    if (Array.isArray(metadata.channels)) {
      channels.push(...metadata.channels);
    }
  }
  
  return [...new Set(channels.map(c => c.trim()).filter(c => c))];
}

// Extraer información adicional del metadata
function extractAdditionalInfo(metadata) {
  const additionalInfo = {};
  
  const knownFields = [
    'description', 'descripcion', 'tema',
    'audience', 'audiencia',
    'canal', 'canales', 'channels',
    'content_type', 'tipo_contenido', 'tipo',
    'categories', 'categorias',
    'origen', 'origin',
    'frases destacadas', 'phrases', 'frases'
  ];
  
  Object.keys(metadata).forEach(key => {
    if (!knownFields.includes(key.toLowerCase())) {
      additionalInfo[key] = metadata[key];
    }
  });
  
  return additionalInfo;
}

// Extraer categorías del metadata
function extractCategories(metadata) {
  const categories = [];
  
  if (metadata.categories && Array.isArray(metadata.categories)) {
    categories.push(...metadata.categories);
  }
  if (metadata.tema && typeof metadata.tema === 'string') {
    if (metadata.tema.toLowerCase().includes('meme')) categories.push('Memes');
    if (metadata.tema.toLowerCase().includes('educativ')) categories.push('Educativo');
    if (metadata.tema.toLowerCase().includes('viral')) categories.push('Viral');
  }
  
  return [...new Set(categories.filter(c => c))];
}

// Renderizar el dashboard completo
function renderTrendsDashboard() {
  const modalBody = document.querySelector('#trendsModal .modal-body');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="trends-dashboard-container">
      <!-- Header con controles -->
      <div class="trends-dashboard-header">
        <h1>Dashboard de Tendencias</h1>
        <div class="trends-dashboard-controls">
          <div class="trends-search-bar">
            <i class='bx bx-search'></i>
            <input type="text" class="trends-search-input" placeholder="Buscar tendencias...">
          </div>
          <select class="trends-filter-select">
            <option value="all">Todas las tendencias</option>
            <option value="high">Alta popularidad (>0.7)</option>
            <option value="medium">Media popularidad (0.4-0.7)</option>
            <option value="low">Baja popularidad (<0.4)</option>
          </select>
          <button class="trends-refresh-button" title="Actualizar datos">
            <i class='bx bx-refresh'></i>
          </button>
          <!-- 🆕 BOTÓN PARA ELIMINAR TODAS LAS TENDENCIAS -->
          <button class="trends-delete-all-button" title="Eliminar todas las tendencias">
            <i class='bx bx-trash'></i>
            <span>Eliminar Todas</span>
          </button>
        </div>
      </div>
      
      <!-- Tarjetas de resumen -->
      <div class="trends-summary-cards">
        <div class="trends-summary-card">
          <div class="trends-card-icon">📈</div>
          <div class="trends-card-value">${formatNumber(trendsData.length)}</div>
          <div class="trends-card-label">Total Tendencias</div>
        </div>
        <div class="trends-summary-card">
          <div class="trends-card-icon">🔥</div>
          <div class="trends-card-value">${formatNumber(trendsData.filter(t => t.popularity > 0.7).length)}</div>
          <div class="trends-card-label">Alta Popularidad</div>
        </div>
        <div class="trends-summary-card">
          <div class="trends-card-icon">📊</div>
          <div class="trends-card-value">${formatPercentage(calculateAveragePopularity(), 0)}</div>
          <div class="trends-card-label">Popularidad Promedio</div>
        </div>
        <div class="trends-summary-card">
          <div class="trends-card-icon">📺</div>
          <div class="trends-card-value">${formatNumber(getUniqueChannelsCount())}</div>
          <div class="trends-card-label">Canales Activos</div>
        </div>
        <div class="trends-summary-card">
          <div class="trends-card-icon">🏷️</div>
          <div class="trends-card-value">${formatNumber(getUniqueCategoriesCount())}</div>
          <div class="trends-card-label">Categorías</div>
        </div>
      </div>
      
      <!-- Grid principal con NUEVA ESTRUCTURA -->
      <div class="trends-main-grid">
        <!-- Lista de tendencias (prioridad principal) -->
        <div class="trends-list-section">
          <div class="trends-list-header">
            <h2><i class='bx bx-list-ul'></i> Tendencias (${filteredTrendsData.length})</h2>
            <div class="trends-list-controls">
              <select class="trends-sort-select">
                <option value="newest">Más recientes</option>
                <option value="popularity">Por popularidad</option>
                <option value="oldest">Más antiguas</option>
                <option value="alphabetical">Alfabético</option>
              </select>
              <div class="trends-view-toggle">
                <button class="trends-view-btn active" data-view="grid">
                  <i class='bx bx-grid-alt'></i>
                </button>
                <button class="trends-view-btn" data-view="list">
                  <i class='bx bx-list-ul'></i>
                </button>
              </div>
            </div>
          </div>
          <div class="trends-content">
            ${renderTrendsContent()}
          </div>
        </div>
        
        <!-- Gráfico de distribución de popularidad -->
        <div class="trends-analytics-section">
          <h2><i class='bx bx-bar-chart'></i> Distribución de Popularidad</h2>
          <div class="trends-chart-wrapper">
            <div class="trends-popularity-chart-container">
              <div class="trends-popularity-chart-canvas">
                <canvas id="trendsPopularityChart"></canvas>
              </div>
              <div class="trends-popularity-stats">
                ${generatePopularityStats()}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Distribución por canales -->
        <div class="trends-analytics-section">
          <h2><i class='bx bx-devices'></i> Canales Principales</h2>
          <div class="trends-channel-distribution">
            ${generateChannelDistribution()}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de detalles de tendencia -->
    <div class="trend-detail-modal" id="trendDetailModal">
      <div class="trend-detail-content">
        <div class="trend-detail-header">
          <button class="trend-detail-close">×</button>
          <div class="trend-detail-main-info">
            <div class="trend-detail-title"></div>
            <div class="trend-detail-popularity-display">
              <div class="trend-detail-popularity-bar">
                <div class="trend-detail-popularity-fill"></div>
              </div>
              <span class="trend-detail-popularity-text"></span>
            </div>
            <div class="trend-detail-meta">
              <span class="trend-detail-date"></span>
              <span class="trend-detail-id"></span>
            </div>
          </div>
        </div>
        <div class="trend-detail-body">
          <!-- Se llenará dinámicamente -->
        </div>
      </div>
    </div>
    
    <!-- 🆕 MODAL DE CONFIRMACIÓN PARA ELIMINAR TENDENCIA INDIVIDUAL -->
    <div class="trend-delete-modal" id="trendDeleteModal">
      <div class="trend-delete-content">
        <div class="trend-delete-header">
          <h3>🗑️ Eliminar Tendencia</h3>
          <button class="trend-delete-close">×</button>
        </div>
        <div class="trend-delete-body">
          <div class="trend-delete-warning">
            <i class='bx bx-info-circle'></i>
            <p><strong>¿Estás seguro?</strong> Esta acción eliminará esta tendencia permanentemente.</p>
          </div>
          <div class="trend-delete-preview">
            <h4>Tendencia a eliminar:</h4>
            <div class="trend-delete-trend-preview"></div>
          </div>
          <div class="trend-delete-confirmation">
            <p>Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="trend-delete-footer">
          <button class="trend-delete-cancel">Cancelar</button>
          <button class="trend-delete-confirm">Sí, eliminar</button>
        </div>
      </div>
    </div>
    
    <!-- 🆕 MODAL DE CONFIRMACIÓN PARA ELIMINAR TODAS LAS TENDENCIAS -->
    <div class="trends-delete-all-modal" id="trendsDeleteAllModal">
      <div class="trends-delete-all-content">
        <div class="trends-delete-all-header">
          <h3>⚠️ Eliminar Todas las Tendencias</h3>
          <button class="trends-delete-all-close">×</button>
        </div>
        <div class="trends-delete-all-body">
          <div class="trends-delete-all-warning">
            <i class='bx bx-error-circle'></i>
            <p><strong>¡ATENCIÓN!</strong> Esta acción eliminará completamente todas las tendencias.</p>
          </div>
          <div class="trends-delete-all-details">
            <h4>Esto significa que se perderán:</h4>
            <ul>
              <li>Todas las tendencias registradas (${trendsData.length} tendencias)</li>
              <li>Datos de popularidad y metadata</li>
              <li>Análisis y insights relacionados</li>
              <li>Información de canales y categorías</li>
            </ul>
          </div>
          <div class="trends-delete-all-confirmation">
            <h4>¿Estás seguro de que quieres continuar?</h4>
            <p>Esta acción es <strong>irreversible</strong> y eliminará todos los datos de tendencias.</p>
          </div>
        </div>
        <div class="trends-delete-all-footer">
          <button class="trends-delete-all-cancel">Cancelar</button>
          <button class="trends-delete-all-confirm">Sí, eliminar todas</button>
        </div>
      </div>
    </div>
  `;
}

// Generar estadísticas de popularidad
function generatePopularityStats() {
  const ranges = [
    { label: 'Muy Alta (>0.8)', min: 0.8, max: 1, color: '#d32f2f' },
    { label: 'Alta (0.6-0.8)', min: 0.6, max: 0.8, color: '#f57c00' },
    { label: 'Media (0.4-0.6)', min: 0.4, max: 0.6, color: '#fbc02d' },
    { label: 'Baja (<0.4)', min: 0, max: 0.4, color: '#689f38' }
  ];
  
  return ranges.map(range => {
    const count = trendsData.filter(t => t.popularity >= range.min && t.popularity < range.max).length;
    return `
      <div class="trends-stat-item">
        <div class="trends-stat-color" style="background-color: ${range.color}"></div>
        <span class="trends-stat-label">${range.label}</span>
        <span class="trends-stat-count">${count}</span>
      </div>
    `;
  }).join('');
}

// Generar distribución de canales
function generateChannelDistribution() {
  const channelCounts = {};
  
  trendsData.forEach(trend => {
    trend.channels.forEach(channel => {
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
  });
  
  const sortedChannels = Object.entries(channelCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  if (sortedChannels.length === 0) {
    return '<div class="trends-no-data"><i class="bx bx-info-circle"></i><span>No hay datos de canales disponibles</span></div>';
  }
  
  return sortedChannels.map(([channel, count]) => `
    <div class="channel-item">
      <div class="channel-info">
        <div class="channel-icon">
          <i class="${getChannelIcon(channel)}"></i>
        </div>
        <span class="channel-name">${channel}</span>
      </div>
      <span class="channel-count">${count}</span>
    </div>
  `).join('');
}

// Renderizar contenido de tendencias
function renderTrendsContent() {
  if (filteredTrendsData.length === 0) {
    return `
      <div class="trends-no-data">
        <i class='bx bx-info-circle'></i>
        <span>No se encontraron tendencias</span>
      </div>
    `;
  }
  
  if (currentView === 'grid') {
    return `
      <div class="trends-grid">
        ${filteredTrendsData.map(trend => renderTrendCard(trend)).join('')}
      </div>
    `;
  } else {
    return `
      <table class="trends-table">
        <thead>
          <tr>
            <th>Tendencia</th>
            <th>Popularidad</th>
            <th>Canales</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTrendsData.map(trend => renderTrendRow(trend)).join('')}
        </tbody>
      </table>
    `;
  }
}

// Renderizar tarjeta de tendencia 🆕 CON BOTÓN DE ELIMINAR
function renderTrendCard(trend) {
  const popularityPercentage = trend.popularity * 100;
  
  return `
    <div class="trend-card" data-trend-id="${trend.id}" style="--popularity-width: ${popularityPercentage}%">
      <div class="trend-card-header">
        <div>
          <div class="trend-card-title">${trend.theme}</div>
          <div class="trend-card-popularity">
            <div class="trend-popularity-bar">
              <div class="trend-popularity-fill" style="width: ${popularityPercentage}%"></div>
            </div>
            <span class="trend-popularity-value">${formatPercentage(trend.popularity, 0)}</span>
          </div>
        </div>
        <!-- 🆕 BOTÓN DE ELIMINAR EN TARJETA -->
        <div class="trend-card-actions">
          <button class="trend-card-delete" data-trend-id="${trend.id}" title="Eliminar tendencia">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      </div>
      
      <div class="trend-card-metadata">
        ${trend.description ? `<div class="trend-card-description">${trend.description}</div>` : ''}
        
        <div class="trend-card-tags">
          ${trend.contentType ? `<span class="trend-tag">${trend.contentType}</span>` : ''}
          ${trend.categories.map(cat => `<span class="trend-tag">${cat}</span>`).join('')}
          ${trend.channels.map(ch => `<span class="trend-tag channel">${ch}</span>`).join('')}
        </div>
      </div>
      
      <div class="trend-card-footer">
        <div class="trend-card-date">
          <i class='bx bx-calendar'></i>
          ${formatRelativeDate(trend.created_at)}
        </div>
        <div class="trend-card-id">${trend.id.substring(0, 8)}...</div>
      </div>
    </div>
  `;
}

// Renderizar fila de tabla 🆕 CON BOTÓN DE ELIMINAR
function renderTrendRow(trend) {
  return `
    <tr class="trend-row" data-trend-id="${trend.id}">
      <td class="trend-theme-cell">${trend.theme}</td>
      <td class="trend-popularity-cell">
        <div class="trend-popularity-bar">
          <div class="trend-popularity-fill" style="width: ${trend.popularity * 100}%"></div>
        </div>
        ${formatPercentage(trend.popularity, 0)}
      </td>
      <td>${trend.channels.join(', ') || 'N/A'}</td>
      <td class="trend-date-cell">${formatDate(trend.created_at)}</td>
      <td class="trend-actions-cell">
        <button class="trend-action-btn trend-view-btn" data-trend-id="${trend.id}" title="Ver detalles">
          <i class='bx bx-show'></i>
        </button>
        <!-- 🆕 BOTÓN DE ELIMINAR EN TABLA -->
        <button class="trend-action-btn trend-delete-btn" data-trend-id="${trend.id}" title="Eliminar">
          <i class='bx bx-trash'></i>
        </button>
      </td>
    </tr>
  `;
}

// Configurar eventos de la modal
function setupTrendsEvents() {
  const modalBody = document.querySelector('#trendsModal .modal-body');
  if (!modalBody) return;
  
  // Búsqueda
  const searchInput = modalBody.querySelector('.trends-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleTrendsSearch);
  }
  
  // Filtros
  const filterSelect = modalBody.querySelector('.trends-filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', handleTrendsFilter);
  }
  
  // Ordenamiento
  const sortSelect = modalBody.querySelector('.trends-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', handleTrendsSort);
  }
  
  // Cambio de vista
  const viewBtns = modalBody.querySelectorAll('.trends-view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => handleViewChange(btn.dataset.view));
  });
  
  // Refresh
  const refreshBtn = modalBody.querySelector('.trends-refresh-button');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleTrendsRefresh);
  }
  
  // 🆕 BOTÓN DE ELIMINAR TODAS LAS TENDENCIAS
  const deleteAllBtn = modalBody.querySelector('.trends-delete-all-button');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', showDeleteAllTrendsModal);
  }
  
  // Delegación de eventos para acciones
  modalBody.addEventListener('click', (e) => {
    // Prevenir propagación en botones de acción
    if (e.target.closest('.trend-action-btn') || e.target.closest('.trend-card-actions')) {
      e.stopPropagation();
    }
    
    // Ver detalles
    if (e.target.closest('.trend-card:not(.trend-card-delete)') && !e.target.closest('.trend-card-actions')) {
      const trendId = e.target.closest('.trend-card').dataset.trendId;
      showTrendDetails(trendId);
    }
    
    if (e.target.closest('.trend-view-btn')) {
      const trendId = e.target.closest('.trend-view-btn').dataset.trendId;
      showTrendDetails(trendId);
    }
    
    // 🆕 ELIMINAR TENDENCIA INDIVIDUAL
    if (e.target.closest('.trend-card-delete') || e.target.closest('.trend-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const trendId = e.target.closest('[data-trend-id]').dataset.trendId;
      handleDeleteTrend(trendId);
    }
  });
  
  setupModalHierarchy();
}

// Manejar búsqueda
function handleTrendsSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  filteredTrendsData = trendsData.filter(trend => 
    trend.theme.toLowerCase().includes(searchTerm) ||
    trend.description.toLowerCase().includes(searchTerm) ||
    trend.channels.some(ch => ch.toLowerCase().includes(searchTerm)) ||
    trend.categories.some(cat => cat.toLowerCase().includes(searchTerm)) ||
    (trend.audience && trend.audience.toLowerCase().includes(searchTerm)) ||
    (trend.contentType && trend.contentType.toLowerCase().includes(searchTerm)) ||
    (trend.origin && trend.origin.toLowerCase().includes(searchTerm))
  );
  
  updateTrendsContent();
  updateSummaryCards();
}

// Manejar filtros
function handleTrendsFilter(e) {
  const filterValue = e.target.value;
  const searchTerm = document.querySelector('.trends-search-input').value.toLowerCase();
  
  let baseFilteredData = [];
  switch (filterValue) {
    case 'high':
      baseFilteredData = trendsData.filter(t => t.popularity > 0.7);
      break;
    case 'medium':
      baseFilteredData = trendsData.filter(t => t.popularity >= 0.4 && t.popularity <= 0.7);
      break;
    case 'low':
      baseFilteredData = trendsData.filter(t => t.popularity < 0.4);
      break;
    default:
      baseFilteredData = [...trendsData];
  }
  
  if (searchTerm) {
    filteredTrendsData = baseFilteredData.filter(trend => 
      trend.theme.toLowerCase().includes(searchTerm) ||
      trend.description.toLowerCase().includes(searchTerm) ||
      trend.channels.some(ch => ch.toLowerCase().includes(searchTerm)) ||
      trend.categories.some(cat => cat.toLowerCase().includes(searchTerm)) ||
      (trend.audience && trend.audience.toLowerCase().includes(searchTerm)) ||
      (trend.contentType && trend.contentType.toLowerCase().includes(searchTerm)) ||
      (trend.origin && trend.origin.toLowerCase().includes(searchTerm))
    );
  } else {
    filteredTrendsData = baseFilteredData;
  }
  
  updateTrendsContent();
  updateSummaryCards();
}

// Manejar ordenamiento
function handleTrendsSort(e) {
  const sortValue = e.target.value;
  
  switch (sortValue) {
    case 'popularity':
      filteredTrendsData.sort((a, b) => b.popularity - a.popularity);
      break;
    case 'newest':
      filteredTrendsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      filteredTrendsData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'alphabetical':
      filteredTrendsData.sort((a, b) => a.theme.localeCompare(b.theme));
      break;
  }
  
  updateTrendsContent();
}

// Cambiar vista
function handleViewChange(view) {
  currentView = view;
  
  const viewBtns = document.querySelectorAll('.trends-view-btn');
  viewBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  updateTrendsContent();
}

// Actualizar contenido de tendencias
function updateTrendsContent() {
  const trendsContent = document.querySelector('.trends-content');
  const listHeader = document.querySelector('.trends-list-header h2');
  
  if (trendsContent) {
    trendsContent.innerHTML = renderTrendsContent();
  }
  
  if (listHeader) {
    listHeader.innerHTML = `<i class='bx bx-list-ul'></i> Tendencias (${filteredTrendsData.length})`;
  }
}

// Actualizar las tarjetas de resumen
function updateSummaryCards() {
  const summaryCards = document.querySelectorAll('.trends-summary-card');
  
  if (summaryCards.length >= 5) {
    summaryCards[0].querySelector('.trends-card-value').textContent = formatNumber(filteredTrendsData.length);
    summaryCards[1].querySelector('.trends-card-value').textContent = 
      formatNumber(filteredTrendsData.filter(t => t.popularity > 0.7).length);
    
    const avgPopularity = filteredTrendsData.length > 0 ? 
      filteredTrendsData.reduce((acc, t) => acc + t.popularity, 0) / filteredTrendsData.length : 0;
    summaryCards[2].querySelector('.trends-card-value').textContent = formatPercentage(avgPopularity, 0);
    
    const uniqueChannels = new Set();
    filteredTrendsData.forEach(trend => {
      trend.channels.forEach(channel => uniqueChannels.add(channel));
    });
    summaryCards[3].querySelector('.trends-card-value').textContent = formatNumber(uniqueChannels.size);
    
    const uniqueCategories = new Set();
    filteredTrendsData.forEach(trend => {
      trend.categories.forEach(category => uniqueCategories.add(category));
    });
    summaryCards[4].querySelector('.trends-card-value').textContent = formatNumber(uniqueCategories.size);
  }
}

// Refresh de datos
async function handleTrendsRefresh() {
  const refreshBtn = document.querySelector('.trends-refresh-button');
  if (refreshBtn) {
    refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      refreshBtn.style.transform = '';
    }, 500);
  }
  
  await loadTrendsData();
  
  setTimeout(() => {
    renderTrendsDashboard();
    setupTrendsEvents();
    initializeTrendsCharts();
  }, 100);
  
  if (window.showNotification) {
    window.showNotification('Datos de tendencias actualizados', 'success', 2000);
  }
}

// 🆕 MANEJAR ELIMINACIÓN DE TENDENCIA INDIVIDUAL
async function handleDeleteTrend(trendId) {
  console.log('🗑️ Intentando eliminar tendencia con ID:', trendId);
  
  const trend = trendsData.find(t => t.id === trendId);
  if (!trend) {
    console.warn('❌ No se encontró tendencia con ID:', trendId);
    if (window.showNotification) {
      window.showNotification('Error: Tendencia no encontrada', 'error', 3000);
    }
    return;
  }
  
  console.log('✅ Tendencia encontrada, mostrando modal de confirmación');
  showDeleteTrendModal(trend);
}

// 🆕 MOSTRAR MODAL DE CONFIRMACIÓN PARA ELIMINAR TENDENCIA INDIVIDUAL
function showDeleteTrendModal(trend) {
  console.log('🚀 Mostrando modal de eliminar para:', trend.theme.substring(0, 50));
  
  const deleteModal = document.querySelector('#trendDeleteModal');
  if (!deleteModal) {
    console.error('❌ Modal de eliminar no encontrada en el DOM');
    return;
  }
  
  console.log('✅ Modal encontrada, configurando contenido...');
  
  // ✅ NUEVO: Restaurar estado inicial del botón de confirmación
  const confirmBtn = deleteModal.querySelector('.trend-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  const previewDiv = deleteModal.querySelector('.trend-delete-trend-preview');
  if (!previewDiv) {
    console.error('❌ Preview div no encontrado');
    return;
  }
  
  previewDiv.innerHTML = `
    <div class="trend-preview-content">
      <div class="trend-preview-theme">"${trend.theme}"</div>
      <div class="trend-preview-details">
        <span>Popularidad: ${formatPercentage(trend.popularity, 0)}</span>
        <span>Canales: ${trend.channels.join(', ') || 'N/A'}</span>
        <span>Creada: ${formatDate(trend.created_at)}</span>
      </div>
    </div>
  `;
  
  // ✅ LIMPIAR EVENT LISTENERS ANTERIORES
  if (deleteModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._handlers;
    const closeBtn = deleteModal.querySelector('.trend-delete-close');
    const cancelBtn = deleteModal.querySelector('.trend-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._backdropHandler);
    
    delete deleteModal._handlers;
    delete deleteModal._backdropHandler;
  }
  
  const closeBtn = deleteModal.querySelector('.trend-delete-close');
  const cancelBtn = deleteModal.querySelector('.trend-delete-cancel');
  
  if (!closeBtn || !cancelBtn || !confirmBtn) {
    console.error('❌ Botones de la modal no encontrados');
    return;
  }
  
  const closeHandler = () => {
    console.log('🚪 Cerrando modal de eliminar');
    closeDeleteTrendModal(deleteModal);
  };
  const confirmHandler = () => {
    console.log('✅ Confirmando eliminación');
    confirmDeleteTrend(trend.id, deleteModal);
  };
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  
  const backdropHandler = (e) => {
    if (e.target === deleteModal) {
      closeHandler();
    }
  };
  deleteModal.addEventListener('click', backdropHandler);
  deleteModal._backdropHandler = backdropHandler;
  
  const handleDeleteEsc = (e) => {
    if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleDeleteEsc, true);
  
  deleteModal._handlers = { 
    closeHandler, 
    confirmHandler,
    handleDeleteEsc
  };
  
  console.log('🎯 Activando modal de eliminar...');
  deleteModal.classList.add('active');
}


// 🆕 CERRAR MODAL DE ELIMINAR TENDENCIA INDIVIDUAL
function closeDeleteTrendModal(deleteModal) {
  console.log('🚪 Cerrando modal de eliminar tendencia...');
  
  // ✅ ASEGURAR QUE EL BOTÓN ESTÉ EN ESTADO CORRECTO ANTES DE CERRAR
  const confirmBtn = deleteModal.querySelector('.trend-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  deleteModal.classList.remove('active');
  
  if (deleteModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._handlers;
    const closeBtn = deleteModal.querySelector('.trend-delete-close');
    const cancelBtn = deleteModal.querySelector('.trend-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._backdropHandler);
    
    delete deleteModal._handlers;
    delete deleteModal._backdropHandler;
  }
  
  console.log('✅ Modal de eliminar tendencia cerrada y limpiada');
}

// 🆕 CONFIRMAR ELIMINACIÓN DE TENDENCIA INDIVIDUAL
async function confirmDeleteTrend(trendId, deleteModal) {
  console.log('🔥 Iniciando eliminación de tendencia:', trendId);
  
  const confirmBtn = deleteModal.querySelector('.trend-delete-confirm');
  
  // ✅ GUARDAR ESTADO ORIGINAL DEL BOTÓN
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    // Cambiar a estado de carga
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    console.log('📡 Llamando a API deleteTrend...');
    const response = await deleteTrend(trendId);
    
    console.log('📥 Respuesta de API:', response);
    
    if (response && response.success) {
      console.log('✅ Eliminación exitosa, cerrando modal...');
      
      // ✅ RESTAURAR ESTADO ANTES DE CERRAR
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeDeleteTrendModal(deleteModal);
      }, 100);
      
      console.log('🔄 Recargando datos...');
      await loadTrendsData();
      updateTrendsContent();
      updateSummaryCards();
      
      if (window.showNotification) {
        window.showNotification('Tendencia eliminada correctamente', 'success', 2000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido en la respuesta');
    }
  } catch (error) {
    console.error('❌ Error eliminando tendencia:', error);
    
    // ✅ RESTAURAR ESTADO ORIGINAL EN CASO DE ERROR
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar la tendencia: ' + error.message, 'error', 5000);
    }
  }
}

// 🆕 MOSTRAR MODAL DE CONFIRMACIÓN PARA ELIMINAR TODAS LAS TENDENCIAS
function showDeleteAllTrendsModal() {
  console.log('🚀 Mostrando modal de eliminar todas las tendencias...');
  
  const deleteAllModal = document.querySelector('#trendsDeleteAllModal');
  if (!deleteAllModal) {
    console.error('❌ Modal de eliminar todas no encontrada');
    return;
  }
  
  // ✅ NUEVO: Restaurar estado inicial del botón de confirmación
  const confirmBtn = deleteAllModal.querySelector('.trends-delete-all-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todas';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  // ✅ LIMPIAR EVENT LISTENERS ANTERIORES
  if (deleteAllModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteAllEsc } = deleteAllModal._handlers;
    const closeBtn = deleteAllModal.querySelector('.trends-delete-all-close');
    const cancelBtn = deleteAllModal.querySelector('.trends-delete-all-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteAllEsc, true);
    deleteAllModal.removeEventListener('click', deleteAllModal._backdropHandler);
    
    delete deleteAllModal._handlers;
    delete deleteAllModal._backdropHandler;
  }
  
  const closeBtn = deleteAllModal.querySelector('.trends-delete-all-close');
  const cancelBtn = deleteAllModal.querySelector('.trends-delete-all-cancel');
  
  const closeHandler = () => closeDeleteAllTrendsModal(deleteAllModal);
  const confirmHandler = () => handleDeleteAllTrends(deleteAllModal);
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  
  const backdropHandler = (e) => {
    if (e.target === deleteAllModal) {
      closeHandler();
    }
  };
  deleteAllModal.addEventListener('click', backdropHandler);
  deleteAllModal._backdropHandler = backdropHandler;
  
  const handleDeleteAllEsc = (e) => {
    if (e.key === 'Escape' && deleteAllModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleDeleteAllEsc, true);
  
  deleteAllModal._handlers = { 
    closeHandler, 
    confirmHandler,
    handleDeleteAllEsc
  };
  
  deleteAllModal.classList.add('active');
}

// 🆕 CERRAR MODAL DE ELIMINAR TODAS LAS TENDENCIAS
function closeDeleteAllTrendsModal(deleteAllModal) {
  console.log('🚪 Cerrando modal de eliminar todas las tendencias...');
  
  // ✅ ASEGURAR QUE EL BOTÓN ESTÉ EN ESTADO CORRECTO ANTES DE CERRAR
  const confirmBtn = deleteAllModal.querySelector('.trends-delete-all-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todas';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  deleteAllModal.classList.remove('active');
  
  if (deleteAllModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteAllEsc } = deleteAllModal._handlers;
    const closeBtn = deleteAllModal.querySelector('.trends-delete-all-close');
    const cancelBtn = deleteAllModal.querySelector('.trends-delete-all-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteAllEsc, true);
    deleteAllModal.removeEventListener('click', deleteAllModal._backdropHandler);
    
    delete deleteAllModal._handlers;
    delete deleteAllModal._backdropHandler;
  }
  
  console.log('✅ Modal de eliminar todas las tendencias cerrada y limpiada');
}

function resetAllTrendsDeleteModals() {
  console.log('🔄 Reseteando todas las modales de eliminación de tendencias...');
  
  // Modal de eliminación individual
  const deleteModal = document.querySelector('#trendDeleteModal');
  if (deleteModal) {
    const confirmBtn = deleteModal.querySelector('.trend-delete-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    deleteModal.classList.remove('active');
    
    if (deleteModal._handlers) {
      const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._handlers;
      const closeBtn = deleteModal.querySelector('.trend-delete-close');
      const cancelBtn = deleteModal.querySelector('.trend-delete-cancel');
      
      if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
      if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
      if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
      
      document.removeEventListener('keydown', handleDeleteEsc, true);
      deleteModal.removeEventListener('click', deleteModal._backdropHandler);
      
      delete deleteModal._handlers;
      delete deleteModal._backdropHandler;
    }
  }
  
  // Modal de eliminación masiva
  const deleteAllModal = document.querySelector('#trendsDeleteAllModal');
  if (deleteAllModal) {
    const confirmBtn = deleteAllModal.querySelector('.trends-delete-all-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar todas';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    deleteAllModal.classList.remove('active');
    
    if (deleteAllModal._handlers) {
      const { closeHandler, confirmHandler, handleDeleteAllEsc } = deleteAllModal._handlers;
      const closeBtn = deleteAllModal.querySelector('.trends-delete-all-close');
      const cancelBtn = deleteAllModal.querySelector('.trends-delete-all-cancel');
      
      if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
      if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
      if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
      
      document.removeEventListener('keydown', handleDeleteAllEsc, true);
      deleteAllModal.removeEventListener('click', deleteAllModal._backdropHandler);
      
      delete deleteAllModal._handlers;
      delete deleteAllModal._backdropHandler;
    }
  }
  
  console.log('✅ Todas las modales de eliminación de tendencias reseteadas');
}

// 🆕 MANEJAR ELIMINACIÓN DE TODAS LAS TENDENCIAS
async function handleDeleteAllTrends(deleteAllModal) {
  console.log('🔥 Iniciando eliminación masiva de tendencias...');
  
  const confirmBtn = deleteAllModal.querySelector('.trends-delete-all-confirm');
  
  // ✅ GUARDAR ESTADO ORIGINAL DEL BOTÓN
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar todas',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    // Cambiar a estado de carga
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await deleteAllTrends();
    
    if (response && response.success) {
      // ✅ RESTAURAR ESTADO ANTES DE CERRAR
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeDeleteAllTrendsModal(deleteAllModal);
      }, 100);
      
      await loadTrendsData();
      renderTrendsDashboard();
      setupTrendsEvents();
      initializeTrendsCharts();
      
      if (window.showNotification) {
        window.showNotification('Todas las tendencias eliminadas correctamente', 'success', 3000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error eliminando todas las tendencias:', error);
    
    // ✅ RESTAURAR ESTADO ORIGINAL EN CASO DE ERROR
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar las tendencias: ' + error.message, 'error', 3000);
    }
  }
}

// Mostrar detalles de tendencia
function showTrendDetails(trendId) {
  const trend = trendsData.find(t => t.id === trendId);
  if (!trend) return;
  
  const detailModal = document.querySelector('#trendDetailModal');
  if (!detailModal) return;
  
  detailModal.querySelector('.trend-detail-title').textContent = trend.theme;
  detailModal.querySelector('.trend-detail-popularity-fill').style.width = `${trend.popularity * 100}%`;
  detailModal.querySelector('.trend-detail-popularity-text').textContent = formatPercentage(trend.popularity, 0);
  detailModal.querySelector('.trend-detail-date').textContent = formatDate(trend.created_at);
  detailModal.querySelector('.trend-detail-id').textContent = `ID: ${trend.id.substring(0, 8)}...`;
  
  const detailBody = detailModal.querySelector('.trend-detail-body');
  detailBody.innerHTML = `
    <!-- Información principal en cards visuales -->
    <div class="trend-detail-section">
      <h3><i class='bx bx-info-circle'></i> Información Principal</h3>
      <div class="trend-info-cards">
        ${trend.description ? `
          <div class="trend-info-card description-card">
            <div class="trend-info-card-header">
              <i class='bx bx-text'></i>
              <span>Descripción</span>
            </div>
            <div class="trend-info-card-content">
              <p>${trend.description}</p>
            </div>
          </div>
        ` : ''}
        
        ${trend.audience ? `
          <div class="trend-info-card audience-card">
            <div class="trend-info-card-header">
              <i class='bx bx-group'></i>
              <span>Audiencia Objetivo</span>
            </div>
            <div class="trend-info-card-content">
              <p>${trend.audience}</p>
            </div>
          </div>
        ` : ''}
        
        ${trend.contentType ? `
          <div class="trend-info-card content-type-card">
            <div class="trend-info-card-header">
              <i class='bx bx-category'></i>
              <span>Tipo de Contenido</span>
            </div>
            <div class="trend-info-card-content">
              <div class="content-type-badge">${trend.contentType}</div>
            </div>
          </div>
        ` : ''}
        
        ${trend.origin ? `
          <div class="trend-info-card origin-card">
            <div class="trend-info-card-header">
              <i class='bx bx-world'></i>
              <span>Origen</span>
            </div>
            <div class="trend-info-card-content">
              <div class="origin-badge">${trend.origin}</div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Métricas de popularidad -->
    <div class="trend-detail-section">
      <h3><i class='bx bx-trending-up'></i> Métricas de Rendimiento</h3>
      <div class="trend-metrics-grid">
        <div class="trend-metric-card">
          <div class="trend-metric-icon popularity-high">
            <i class='bx bx-trending-up'></i>
          </div>
          <div class="trend-metric-content">
            <div class="trend-metric-value">${formatPercentage(trend.popularity, 1)}</div>
            <div class="trend-metric-label">Popularidad</div>
            <div class="trend-metric-description">
              ${trend.popularity > 0.8 ? 'Tendencia viral' : 
                trend.popularity > 0.6 ? 'Alta popularidad' : 
                trend.popularity > 0.4 ? 'Popularidad moderada' : 'Popularidad baja'}
            </div>
          </div>
        </div>
        
        <div class="trend-metric-card">
          <div class="trend-metric-icon date-icon">
            <i class='bx bx-calendar'></i>
          </div>
          <div class="trend-metric-content">
            <div class="trend-metric-value">${formatRelativeDate(trend.created_at)}</div>
            <div class="trend-metric-label">Antigüedad</div>
            <div class="trend-metric-description">Detectada ${formatDate(trend.created_at)}</div>
          </div>
        </div>
        
        <div class="trend-metric-card">
          <div class="trend-metric-icon channels-icon">
            <i class='bx bx-broadcast'></i>
          </div>
          <div class="trend-metric-content">
            <div class="trend-metric-value">${trend.channels.length}</div>
            <div class="trend-metric-label">Canales</div>
            <div class="trend-metric-description">Plataformas identificadas</div>
          </div>
        </div>
      </div>
    </div>
    
    ${trend.channels.length > 0 ? `
      <div class="trend-detail-section">
        <h3><i class='bx bx-devices'></i> Canales y Plataformas</h3>
        <div class="trend-channels-grid">
          ${trend.channels.map(ch => `
            <div class="trend-channel-card">
              <div class="trend-channel-icon">
                <i class="${getChannelIcon(ch)}"></i>
              </div>
              <div class="trend-channel-name">${ch}</div>
              <div class="trend-channel-status">Activo</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${trend.categories.length > 0 ? `
      <div class="trend-detail-section">
        <h3><i class='bx bx-tag'></i> Categorías y Etiquetas</h3>
        <div class="trend-categories-list">
          ${trend.categories.map(cat => `
            <div class="trend-category-item">
              <i class='bx bx-bookmark'></i>
              <span>${cat}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${trend.highlightedPhrases && trend.highlightedPhrases.length > 0 ? `
      <div class="trend-detail-section">
        <h3><i class='bx bx-chat-dots'></i> Frases Destacadas</h3>
        <div class="trend-phrases-container">
          ${trend.highlightedPhrases.map(phrase => `
            <div class="trend-phrase-item">
              <i class='bx bx-quote-alt-left'></i>
              <span class="trend-phrase-text">${phrase}</span>
              <i class='bx bx-quote-alt-right'></i>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${Object.keys(trend.additionalInfo).length > 0 ? `
      <div class="trend-detail-section">
        <h3><i class='bx bx-info-square'></i> Información Adicional</h3>
        <div class="trend-additional-info">
          ${Object.entries(trend.additionalInfo).map(([key, value]) => `
            <div class="trend-additional-item">
              <div class="trend-additional-key">${formatFieldName(key)}</div>
              <div class="trend-additional-value">
                ${Array.isArray(value) ? 
                  value.map(v => `<span class="trend-additional-tag">${v}</span>`).join('') : 
                  value}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <!-- Análisis de oportunidades -->
    <div class="trend-detail-section">
      <h3><i class='bx bx-lightbulb'></i> Análisis y Oportunidades</h3>
      <div class="trend-opportunities-grid">
        <div class="trend-opportunity-card marketing-opportunity">
          <div class="trend-opportunity-icon">
            <i class='bx bx-target-lock'></i>
          </div>
          <div class="trend-opportunity-content">
            <h4>Oportunidad de Marketing</h4>
            <p>
              ${generateMarketingOpportunity(trend)}
            </p>
          </div>
        </div>
        
        <div class="trend-opportunity-card content-opportunity">
          <div class="trend-opportunity-icon">
            <i class='bx bx-edit'></i>
          </div>
          <div class="trend-opportunity-content">
            <h4>Sugerencia de Contenido</h4>
            <p>
              ${generateContentSuggestion(trend)}
            </p>
          </div>
        </div>
        
        <div class="trend-opportunity-card engagement-opportunity">
          <div class="trend-opportunity-icon">
            <i class='bx bx-heart'></i>
          </div>
          <div class="trend-opportunity-content">
            <h4>Potencial de Engagement</h4>
            <p>
              ${generateEngagementPotential(trend)}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Metadata técnico siempre visible -->
    <div class="trend-detail-section">
      <h3><i class='bx bx-code-block'></i> Datos Técnicos</h3>
      <div class="trend-detail-json-viewer">
        <pre><code>${JSON.stringify(trend.originalMetadata, null, 2)}</code></pre>
      </div>
    </div>
  `;
  
  setupTrendDetailEvents(detailModal);
  detailModal.classList.add('active');
}

// Configurar eventos de la modal de detalles con jerarquía correcta
function setupTrendDetailEvents(detailModal) {
  const closeBtn = detailModal.querySelector('.trend-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTrendDetailModal(detailModal);
    });
  }
  
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      e.stopPropagation();
      closeTrendDetailModal(detailModal);
    }
  });
  
  const content = detailModal.querySelector('.trend-detail-content');
  if (content) {
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  const handleDetailEsc = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      closeTrendDetailModal(detailModal);
    }
  };
  
  document.addEventListener('keydown', handleDetailEsc, true);
  detailModal._escHandler = handleDetailEsc;
}

// Cerrar modal de detalles con limpieza correcta
function closeTrendDetailModal(detailModal) {
  if (!detailModal) {
    console.warn('⚠️ Intentando cerrar modal de detalles null/undefined');
    return;
  }
  
  console.log('🚪 Cerrando modal de detalles...');
  
  detailModal.classList.remove('active');
  
  if (detailModal._escHandler) {
    document.removeEventListener('keydown', detailModal._escHandler, true);
    delete detailModal._escHandler;
    console.log('🧹 Event listener ESC de detalles removido');
  }
  
  console.log('✅ Modal de detalles cerrada correctamente');
}

// Inicializar gráficos
function initializeTrendsCharts() {
  initPopularityChart();
}

// Gráfico de distribución de popularidad
function initPopularityChart() {
  const canvas = document.getElementById('trendsPopularityChart');
  if (!canvas || trendsData.length === 0) return;
  
  if (chartsInstances.popularity) {
    chartsInstances.popularity.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  
  const ranges = [
    { label: 'Muy Alta', min: 0.8, max: 1, color: '#d32f2f' },
    { label: 'Alta', min: 0.6, max: 0.8, color: '#f57c00' },
    { label: 'Media', min: 0.4, max: 0.6, color: '#fbc02d' },
    { label: 'Baja', min: 0, max: 0.4, color: '#689f38' }
  ];
  
  const data = ranges.map(range => ({
    label: range.label,
    count: trendsData.filter(t => t.popularity >= range.min && t.popularity < range.max).length,
    color: range.color
  }));
  
  chartsInstances.popularity = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: data.map(d => d.color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Configurar jerarquía de modales para ESC
function setupModalHierarchy() {
  if (window._trendsMainEscHandler) {
    document.removeEventListener('keydown', window._trendsMainEscHandler, true);
  }
  
  const handleMainModalEsc = (e) => {
    if (e.key === 'Escape') {
      const trendDetailModal = document.querySelector('#trendDetailModal');
      const trendDeleteModal = document.querySelector('#trendDeleteModal'); // 🆕
      const trendsDeleteAllModal = document.querySelector('#trendsDeleteAllModal'); // 🆕
      const trendsModal = document.querySelector('#trendsModal');
      
      if (trendsModal && trendsModal.classList.contains('active')) {
        // 🆕 Verificar TODAS las modales secundarias
        if ((trendDetailModal && trendDetailModal.classList.contains('active')) ||
            (trendDeleteModal && trendDeleteModal.classList.contains('active')) ||
            (trendsDeleteAllModal && trendsDeleteAllModal.classList.contains('active'))) {
          return; // No cerrar modal principal si hay modales secundarias activas
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (window.closeModal && typeof window.closeModal === 'function') {
          window.closeModal(trendsModal);
        } else {
          trendsModal.classList.remove('active');
        }
        
        cleanupModalHierarchy();
      }
    }
  };
  
  window._trendsMainEscHandler = handleMainModalEsc;
  document.addEventListener('keydown', handleMainModalEsc, false);
  
  console.log('🔧 Jerarquía de modales configurada para tendencias');
}

// Limpiar jerarquía de modales
function cleanupModalHierarchy() {
  if (window._trendsMainEscHandler) {
    document.removeEventListener('keydown', window._trendsMainEscHandler, true);
    delete window._trendsMainEscHandler;
    console.log('🧹 Event listener principal de ESC removido');
  }
}

function formatFieldName(fieldName) {
  const fieldMappings = {
    'content_type': 'Tipo de Contenido',
    'tipo_contenido': 'Tipo de Contenido',
    'frases_destacadas': 'Frases Destacadas',
    'origen': 'Origen',
    'audiencia': 'Audiencia',
    'tema': 'Tema',
    'descripcion': 'Descripción'
  };
  
  if (fieldMappings[fieldName]) {
    return fieldMappings[fieldName];
  }
  
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generateMarketingOpportunity(trend) {
  const opportunities = [];
  
  if (trend.popularity > 0.8) {
    opportunities.push("Esta tendencia viral presenta una excelente oportunidad para generar contenido de alto impacto.");
  } else if (trend.popularity > 0.6) {
    opportunities.push("Tendencia con buen potencial para campañas dirigidas y contenido especializado.");
  } else {
    opportunities.push("Oportunidad para contenido de nicho que puede resonar con audiencias específicas.");
  }
  
  if (trend.channels.includes('TikTok') || trend.channels.includes('Instagram')) {
    opportunities.push("Ideal para contenido visual y videos cortos.");
  }
  
  if (trend.audience && trend.audience.toLowerCase().includes('jóvenes')) {
    opportunities.push("Perfecta para conectar con audiencias jóvenes usando lenguaje y referencias actuales.");
  }
  
  return opportunities.join(' ') || "Analizar más a fondo para identificar oportunidades específicas.";
}

function generateContentSuggestion(trend) {
  const suggestions = [];
  
  if (trend.contentType && trend.contentType.toLowerCase().includes('meme')) {
    suggestions.push("Crear memes educativos que combinen humor con contenido académico.");
  }
  
  if (trend.description && trend.description.toLowerCase().includes('humor')) {
    suggestions.push("Desarrollar contenido humorístico que mantenga el valor educativo de Acadelia.");
  }
  
  if (trend.channels.includes('YouTube')) {
    suggestions.push("Considerar videos explicativos o tutoriales relacionados con esta tendencia.");
  }
  
  if (trend.origin) {
    suggestions.push(`Adaptar el contenido considerando el contexto cultural de origen (${trend.origin}).`);
  }
  
  return suggestions.join(' ') || "Desarrollar contenido original inspirado en los elementos clave de esta tendencia.";
}

function generateEngagementPotential(trend) {
  let potential = "Medio";
  let description = "";
  
  if (trend.popularity > 0.8) {
    potential = "Muy Alto";
    description = "Tendencia viral con gran potencial de alcance y interacciones.";
  } else if (trend.popularity > 0.6) {
    potential = "Alto";
    description = "Buena oportunidad para generar engagement significativo.";
  } else if (trend.popularity > 0.4) {
    potential = "Moderado";
    description = "Potencial decente para audiencias específicas.";
  } else {
    potential = "Bajo";
    description = "Mejor para contenido de nicho o experimental.";
  }
  
  if (trend.highlightedPhrases && trend.highlightedPhrases.length > 0) {
    description += " Las frases destacadas pueden ayudar a generar reconocimiento.";
  }
  
  return `${potential}. ${description}`;
}

// Funciones auxiliares originales
function calculateAveragePopularity() {
  if (trendsData.length === 0) return 0;
  const sum = trendsData.reduce((acc, trend) => acc + trend.popularity, 0);
  return sum / trendsData.length;
}

function getUniqueChannelsCount() {
  const channels = new Set();
  trendsData.forEach(trend => {
    trend.channels.forEach(channel => channels.add(channel));
  });
  return channels.size;
}

function getUniqueCategoriesCount() {
  const categories = new Set();
  trendsData.forEach(trend => {
    trend.categories.forEach(category => categories.add(category));
  });
  return categories.size;
}

function getChannelIcon(channel) {
  const channelIcons = {
    'tiktok': 'bx bxl-tiktok',
    'youtube': 'bx bxl-youtube',
    'instagram': 'bx bxl-instagram',
    'facebook': 'bx bxl-facebook',
    'twitter': 'bx bxl-twitter',
    'linkedin': 'bx bxl-linkedin',
    'whatsapp': 'bx bxl-whatsapp',
    'email': 'bx bx-envelope',
    'discord': 'bx bxl-discord',
    'telegram': 'bx bxl-telegram'
  };
  
  return channelIcons[channel.toLowerCase()] || 'bx bx-broadcast';
}

// Datos de fallback para demostración
function generateFallbackTrendsData() {
  return [
    {
      id: '658e0363-4472-4dcf-b87c-b877223e8432',
      theme: 'Italian Brainrot – Creaturas Surrealistas de IA',
      popularity: 0.8,
      created_at: '2025-05-20T16:18:05.088665+00:00',
      description: 'Imágenes y videos absurdos generados por inteligencia artificial, presentando criaturas híbridas con nombres pseudoitalianos como "Ballerina Cappuccina" y "Bombardiro Crocodilo". Estas creaciones se acompañan de narraciones sintetizadas con acento italiano, combinando surrealismo y humor post-irónico.',
      audience: 'Usuarios jóvenes activos en redes sociales, especialmente en TikTok e Instagram.',
      channels: ['TikTok', 'Instagram'],
      contentType: 'Memes',
      categories: ['Viral', 'IA', 'Humor'],
      origin: '',
      highlightedPhrases: ['Ballerina Cappuccina', 'Bombardiro Crocodilo'],
      additionalInfo: {
        'estilo_visual': 'Surrealista',
        'duracion_promedio': '15-30 segundos',
        'herramientas_ia': ['Midjourney', 'DALL-E']
      },
      originalMetadata: {
        tema: 'Memes absurdos generados por IA',
        audiencia: 'Usuarios jóvenes activos en redes sociales, especialmente en TikTok e Instagram.',
        description: 'Imágenes y videos absurdos generados por inteligencia artificial, presentando criaturas híbridas con nombres pseudoitalianos como "Ballerina Cappuccina" y "Bombardiro Crocodilo".',
        estilo_visual: 'Surrealista',
        duracion_promedio: '15-30 segundos',
        herramientas_ia: ['Midjourney', 'DALL-E']
      }
    },
    {
      id: 'a0843438-d106-482f-b2ec-bd7a1188aacf',
      theme: 'Skibidi Toilet – La Guerra de los Inodoros',
      popularity: 1.0,
      created_at: '2025-05-20T19:35:38.442309+00:00',
      description: 'Serie de cortos animados que narran una guerra ficticia entre cabezas dentro de inodoros móviles y humanoides con hardware en lugar de cabezas. Humor absurdo y escatológico. Dirigido a adolescentes y jóvenes en TikTok y YouTube.',
      audience: 'Adolescentes y jóvenes usuarios de redes sociales',
      channels: ['TikTok', 'YouTube'],
      contentType: 'meme viral',
      categories: ['Viral', 'Humor', 'Animación'],
      origin: '',
      highlightedPhrases: ['Skibidi', 'Toilet war'],
      additionalInfo: {
        'episodios': '50+',
        'duracion_serie': '1-3 minutos por episodio'
      },
      originalMetadata: {
        canal: 'TikTok',
        audience: 'Adolescentes y jóvenes usuarios de redes sociales',
        description: 'Serie de cortos animados que narran una guerra ficticia entre cabezas dentro de inodoros móviles y humanoides con hardware en lugar de cabezas.',
        content_type: 'meme viral',
        episodios: '50+',
        duracion_serie: '1-3 minutos por episodio'
      }
    },
    {
      id: 'cdd738a2-77e8-42d4-9050-0dea4320abb2',
      theme: 'Memes surrealistas y humor absurdo',
      popularity: 0.6,
      created_at: '2025-05-20T15:58:42.991555+00:00',
      description: 'Serie de cortos animados que narran una guerra ficticia entre cabezas dentro de inodoros móviles y humanoides con hardware en lugar de cabezas. Humor absurdo y escatológico.',
      audience: 'Adolescentes y jóvenes usuarios de redes sociales',
      channels: ['TikTok', 'YouTube'],
      contentType: 'Meme viral',
      categories: ['Humor', 'Absurdo'],
      origin: 'peruano',
      highlightedPhrases: ['¡Perú es clave!'],
      additionalInfo: {
        'tipo': 'contenido humorístico',
        'influencia_cultural': 'Latina'
      },
      originalMetadata: {
        canales: 'TikTok y YouTube',
        audiencia: 'Adolescentes y jóvenes usuarios de redes sociales',
        descripcion: 'Serie de cortos animados que narran una guerra ficticia entre cabezas dentro de inodoros móviles y humanoides con hardware en lugar de cabezas.',
        tipo_contenido: 'Meme viral',
        tipo: 'contenido humorístico',
        origen: 'peruano',
        'frases destacadas': ['¡Perú es clave!'],
        influencia_cultural: 'Latina'
      }
    }
  ];
}

// Mostrar error
function showTrendsError(message) {
  const modalBody = document.querySelector('#trendsModal .modal-body');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="trends-loading">
      <i class='bx bx-error-circle' style="font-size: 48px; color: var(--color-error);"></i>
      <p>${message}</p>
    </div>
  `;
}

// 🆕 FUNCIÓN DE RESET PARA TRENDS MODAL
function resetTrendsModalState() {
  console.log('🔄 Reiniciando estado de trends modal...');
  
  // Limpiar variables globales del módulo
  if (typeof trendsData !== 'undefined') {
    trendsData = [];
  }
  if (typeof filteredTrendsData !== 'undefined') {
    filteredTrendsData = [];
  }
  if (typeof currentView !== 'undefined') {
    currentView = 'grid';
  }
  
  // Destruir gráficos anteriores
  if (typeof chartsInstances !== 'undefined') {
    Object.keys(chartsInstances).forEach(key => {
      if (chartsInstances[key] && typeof chartsInstances[key].destroy === 'function') {
        try {
          chartsInstances[key].destroy();
        } catch (e) {
          console.warn(`Error destruyendo chart ${key}:`, e);
        }
      }
    });
    chartsInstances = {};
  }
  
  // ✅ NUEVO: Resetear modales de eliminación
  resetAllTrendsDeleteModals();
  
  console.log('✅ Estado de trends modal reiniciado completamente');
}


// Exponer función globalmente para trends modal
if (typeof window !== 'undefined') {
  window.initTrendsModal = initTrendsModal;
  window.handleDeleteTrend = handleDeleteTrend; // Si no existe
  window.showDeleteTrendModal = showDeleteTrendModal; // Si no existe
  window.showDeleteAllTrendsModal = showDeleteAllTrendsModal; // Si no existe
  
  // ✅ NUEVO: Exportar función de reseteo de modales
  window.resetAllTrendsDeleteModals = resetAllTrendsDeleteModals;
  
  // Actualizar objeto trendsModal
  if (!window.trendsModal) {
    window.trendsModal = {};
  }
  window.trendsModal.reset = resetTrendsModalState;
  window.trendsModal.resetDeleteModals = resetAllTrendsDeleteModals;
}