// MemoryModal.js - Modal de Gestión de Memoria IA MEJORADA CON SIMULACIONES DE CAMPAÑA
import { getMemoryInsights, deleteMemoryInsight, updateMemoryInsight, resetAllMemory } from '../api/marketingAPI.js';
import { 
  formatNumber, 
  formatPercentage, 
  formatDate, 
  formatRelativeDate 
} from '../utils/formatting-marketing.js';

let memoryData = [];
let filteredMemoryData = [];
let currentView = 'grid';
let currentTypeFilter = 'all';
let currentSourceFilter = 'all';

// 🆕 NUEVA FUNCIÓN: Detectar si es una simulación de campaña
function isScreenSimulation(content) {
  return (
    content.results || 
    content.simulationData ||
    content.predicciones ||
    (content.results && content.results.predicciones) ||
    (content.campaign && content.audience) ||
    (typeof content === 'object' && content.results && content.results.predicciones)
  );
}

// 🆕 NUEVA FUNCIÓN: Extraer insight enriquecido para simulaciones de campaña
function extractSimulationInsight(content) {
  let simulationData = null;
  let resultsData = null;
  
  // Detectar estructura de datos de simulación
  if (content.results && content.results.predicciones) {
    resultsData = content.results;
    simulationData = content.simulationData || content;
  } else if (content.predicciones) {
    resultsData = { predicciones: content.predicciones };
    simulationData = content;
  } else if (content.simulationData) {
    simulationData = content.simulationData;
    resultsData = content.results || {};
  }
  
  if (!resultsData && !simulationData) return null;
  
  const predicciones = resultsData.predicciones || {};
  
  // Extraer métricas clave
  const metricas = predicciones.metricas_clave || {};
  const ctr = metricas.CTR || 'N/A';
  const engagement = metricas.engagement || 'N/A';
  const conversion = metricas.tasa_conversion || 'N/A';
  const confianza = predicciones.nivel_confianza || 0;
  
  // Extraer factores de éxito
  const factoresExito = predicciones.factores_exito || [];
  
  // Extraer recomendaciones
  const recomendaciones = predicciones.recomendaciones || [];
  
  // Extraer riesgos
  const riesgos = predicciones.riesgos_desafios || [];
  
  // Extraer información de campaña
  const campaign = simulationData.campaign || {};
  const audience = simulationData.audience || {};
  
  const concepto = campaign.concept || campaign.titulo || 'Simulación de campaña';
  const objetivos = campaign.objectives || campaign.objetivos || '';
  const audienciaSegmentos = audience.segments || audience.segmentos || '';
  
  // Crear insight enriquecido
  let insight = `🎯 Simulación de Campaña: "${concepto}"`;
  
  if (confianza > 0) {
    insight += `\n📊 Nivel de confianza: ${confianza}%`;
  }
  
  if (ctr !== 'N/A' || engagement !== 'N/A' || conversion !== 'N/A') {
    insight += `\n\n📈 Métricas proyectadas:`;
    if (ctr !== 'N/A') insight += `\n• CTR: ${ctr}`;
    if (engagement !== 'N/A') insight += `\n• Engagement: ${engagement}`;
    if (conversion !== 'N/A') insight += `\n• Conversión: ${conversion}`;
  }
  
  if (factoresExito.length > 0) {
    insight += `\n\n✅ Factores de éxito clave:`;
    factoresExito.slice(0, 3).forEach((factor, index) => {
      const cleanFactor = typeof factor === 'string' ? factor : JSON.stringify(factor);
      insight += `\n• ${cleanFactor.substring(0, 80)}${cleanFactor.length > 80 ? '...' : ''}`;
    });
  }
  
  if (recomendaciones.length > 0) {
    insight += `\n\n💡 Recomendaciones principales:`;
    recomendaciones.slice(0, 2).forEach((rec, index) => {
      const cleanRec = typeof rec === 'string' ? rec : JSON.stringify(rec);
      insight += `\n• ${cleanRec.substring(0, 80)}${cleanRec.length > 80 ? '...' : ''}`;
    });
  }
  
  return {
    insight: insight,
    concepto: concepto,
    objetivos: objetivos,
    audienciaSegmentos: audienciaSegmentos,
    metricas: { ctr, engagement, conversion },
    confianza: confianza,
    factoresExito: factoresExito,
    recomendaciones: recomendaciones,
    riesgos: riesgos,
    isEnriched: true
  };
}

// 🆕 NUEVA FUNCIÓN: Detectar si es un análisis de tendencias
function isTrendAnalysis(content) {
  return (
    content.trend || 
    content.analysis || 
    content.tendencia_educativa ||
    (content.analysis && content.analysis.tendencia_educativa) ||
    (typeof content === 'object' && content.trend && content.analysis)
  );
}

// 🆕 NUEVA FUNCIÓN: Extraer insight enriquecido para análisis de tendencias
function extractTrendInsight(content) {
  let trendData = null;
  let analysisData = null;
  
  // Detectar estructura de datos
  if (content.trend && content.analysis) {
    trendData = content.trend;
    analysisData = content.analysis;
  } else if (content.tendencia_educativa) {
    trendData = content.tendencia_educativa;
    analysisData = content.tendencia_educativa;
  } else if (content.analysis && content.analysis.tendencia_educativa) {
    trendData = content.analysis.tendencia_educativa;
    analysisData = content.analysis.tendencia_educativa;
  }
  
  if (!trendData) return null;
  
  const theme = trendData.theme || trendData.nombre || 'Análisis de tendencia';
  const popularity = trendData.popularity || trendData.popularidad || 0;
  
  // Extraer oportunidades de marketing
  let marketingOpportunities = [];
  
  if (analysisData) {
    // Buscar en diferentes estructuras posibles
    const searchPaths = [
      'oportunidades_de_marketing_especificas',
      'oportunidades_de_marketing_específicas', 
      'análisis_de_marketing.oportunidades_de_marketing_específicas',
      'posibles_angulos_creativos',
      'posibles_ángulos_creativos',
      'análisis_de_marketing.posibles_ángulos_creativos'
    ];
    
    for (const path of searchPaths) {
      const opportunities = getNestedValue(analysisData, path);
      if (opportunities) {
        if (typeof opportunities === 'object') {
          marketingOpportunities = Object.values(opportunities).slice(0, 3);
        } else if (Array.isArray(opportunities)) {
          marketingOpportunities = opportunities.slice(0, 3);
        }
        break;
      }
    }
  }
  
  // Extraer canales recomendados
  let recommendedChannels = [];
  
  if (analysisData) {
    const channelPaths = [
      'canales_recomendados',
      'análisis_de_marketing.canales_recomendados',
      'recommended_channels'
    ];
    
    for (const path of channelPaths) {
      const channels = getNestedValue(analysisData, path);
      if (channels) {
        if (typeof channels === 'object') {
          recommendedChannels = Object.values(channels).slice(0, 2);
        } else if (Array.isArray(channels)) {
          recommendedChannels = channels.slice(0, 2);
        }
        break;
      }
    }
  }
  
  // Crear insight enriquecido
  let insight = `📊 Análisis de Tendencia: "${theme}"`;
  
  if (popularity > 0) {
    insight += `\n🔥 Popularidad: ${formatPercentage(popularity, 0)}`;
  }
  
  if (marketingOpportunities.length > 0) {
    insight += `\n\n💡 Oportunidades principales:`;
    marketingOpportunities.forEach((opp, index) => {
      const cleanOpp = typeof opp === 'string' ? opp : JSON.stringify(opp);
      insight += `\n• ${cleanOpp.substring(0, 80)}${cleanOpp.length > 80 ? '...' : ''}`;
    });
  }
  
  if (recommendedChannels.length > 0) {
    insight += `\n\n📱 Canales recomendados:`;
    recommendedChannels.forEach((channel, index) => {
      let channelText = typeof channel === 'string' ? channel : JSON.stringify(channel);
      // Limpiar el texto del canal
      channelText = channelText.replace(/^\d+\.\s*/, '').replace(/^"\d+":\s*"/, '').replace(/"$/, '');
      insight += `\n• ${channelText.substring(0, 60)}${channelText.length > 60 ? '...' : ''}`;
    });
  }
  
  return {
    insight: insight,
    theme: theme,
    popularity: popularity,
    marketingOpportunities: marketingOpportunities,
    recommendedChannels: recommendedChannels,
    isEnriched: true
  };
}

// 🆕 FUNCIÓN AUXILIAR: Obtener valor anidado de objeto
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// Procesar datos de memoria individuales - MEJORADO
function processMemoryData(memory) {
  let content = {};
  
  if (typeof memory.content === 'string') {
    try {
      content = JSON.parse(memory.content);
    } catch (e) {
      console.warn('⚠️ Error parseando contenido JSON:', e);
      content = { raw_content: memory.content };
    }
  } else if (typeof memory.content === 'object' && memory.content !== null) {
    content = memory.content;
  }
  
  // 🆕 MEJORADO: Detectar y procesar simulaciones Y análisis de tendencias
  let processedInsight = null;
  let enrichedData = null;
  let isSimulation = false;
  let isTrend = false;
  
  // Primero verificar si es simulación
  if (isScreenSimulation(content)) {
    isSimulation = true;
    enrichedData = extractSimulationInsight(content);
    if (enrichedData) {
      processedInsight = enrichedData.insight;
    }
  }
  // Si no es simulación, verificar si es análisis de tendencias
  else if (isTrendAnalysis(content)) {
    isTrend = true;
    enrichedData = extractTrendInsight(content);
    if (enrichedData) {
      processedInsight = enrichedData.insight;
    }
  }
  
  // Si no es ninguno de los dos o no se pudo procesar, usar lógica original
  if (!processedInsight) {
    processedInsight = content.insight || content.message || content.summary || 'Sin insight definido';
  }
  
  const processedMemory = {
    id: memory.id,
    type: memory.type || 'unknown',
    source: memory.source || 'unknown',
    importance: parseFloat(memory.importance) || 0,
    created_at: memory.created_at,
    
    insight: processedInsight,
    timestamp: content.timestamp || memory.created_at,
    quality_score: content.quality_score || 0,
    importance_suggestion: content.importance_suggestion || memory.importance,
    derived_from: content.derived_from || '',
    original_type: content.original_type || memory.type,
    
    originalContent: content,
    additionalInfo: extractAdditionalMemoryInfo(content),
    
    // 🆕 NUEVO: Datos enriquecidos para simulaciones y análisis de tendencias
    enrichedData: enrichedData,
    isScreenSimulation: isSimulation,
    isTrendAnalysis: isTrend
  };
  
  return processedMemory;
}

// Renderizar tarjeta de memoria - MEJORADO PARA SIMULACIONES Y TENDENCIAS
function renderMemoryCard(memory) {
  const importancePercentage = memory.importance * 100;
  
  // 🆕 NUEVO: Clase especial para simulaciones y análisis de tendencias
  let cardClass = 'memory-card';
  if (memory.isScreenSimulation) {
    cardClass += ' simulation-card';
  } else if (memory.isTrendAnalysis) {
    cardClass += ' trend-analysis-card';
  }
  
  // 🆕 NUEVO: Información adicional para simulaciones
  let enrichedInfo = '';
  if (memory.enrichedData && memory.enrichedData.isEnriched) {
    if (memory.isScreenSimulation) {
      const { concepto, objetivos, audienciaSegmentos, metricas, confianza, factoresExito, recomendaciones, riesgos } = memory.enrichedData;
      
      // Información específica de simulación
      let metricsPreview = '';
      if (metricas.ctr !== 'N/A' || metricas.engagement !== 'N/A' || metricas.conversion !== 'N/A') {
        metricsPreview = `
          <div class="simulation-metrics-preview">
            <div class="simulation-section-title">
              <i class='bx bx-bar-chart-alt-2'></i>
              <span>Métricas Proyectadas:</span>
            </div>
            <div class="simulation-metrics-grid">
              ${metricas.ctr !== 'N/A' ? `<div class="simulation-metric-item"><span class="metric-label">CTR:</span> <span class="metric-value">${metricas.ctr}</span></div>` : ''}
              ${metricas.engagement !== 'N/A' ? `<div class="simulation-metric-item"><span class="metric-label">Engagement:</span> <span class="metric-value">${metricas.engagement}</span></div>` : ''}
              ${metricas.conversion !== 'N/A' ? `<div class="simulation-metric-item"><span class="metric-label">Conversión:</span> <span class="metric-value">${metricas.conversion}</span></div>` : ''}
            </div>
          </div>
        `;
      }
      
      let successFactorsPreview = '';
      if (factoresExito.length > 0) {
        const firstThreeFactors = factoresExito.slice(0, 3);
        successFactorsPreview = `
          <div class="simulation-success-factors-preview">
            <div class="simulation-section-title">
              <i class='bx bx-check-circle'></i>
              <span>Factores de Éxito:</span>
            </div>
            <ul class="simulation-success-factors-list">
              ${firstThreeFactors.map(factor => {
                const cleanFactor = typeof factor === 'string' ? factor : JSON.stringify(factor);
                const shortFactor = cleanFactor.length > 100 ? cleanFactor.substring(0, 100) + '...' : cleanFactor;
                return `<li>${shortFactor}</li>`;
              }).join('')}
            </ul>
            ${factoresExito.length > 3 ? `
              <div class="simulation-more-info">
                <i class='bx bx-plus'></i>
                <span>+${factoresExito.length - 3} factores más</span>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      let recommendationsPreview = '';
      if (recomendaciones.length > 0) {
        const firstTwoRecommendations = recomendaciones.slice(0, 2);
        recommendationsPreview = `
          <div class="simulation-recommendations-preview">
            <div class="simulation-section-title">
              <i class='bx bx-lightbulb'></i>
              <span>Recomendaciones:</span>
            </div>
            <ul class="simulation-recommendations-list">
              ${firstTwoRecommendations.map(rec => {
                const cleanRec = typeof rec === 'string' ? rec : JSON.stringify(rec);
                const shortRec = cleanRec.length > 100 ? cleanRec.substring(0, 100) + '...' : cleanRec;
                return `<li>${shortRec}</li>`;
              }).join('')}
            </ul>
            ${recomendaciones.length > 2 ? `
              <div class="simulation-more-info">
                <i class='bx bx-plus'></i>
                <span>+${recomendaciones.length - 2} recomendaciones más</span>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      enrichedInfo = `
        <div class="simulation-enriched-info">
          <div class="simulation-header-info">
            <div class="simulation-concept">
              <i class='bx bx-target-lock'></i>
              <span>${concepto}</span>
            </div>
            ${confianza > 0 ? `
              <div class="simulation-confidence">
                <i class='bx bx-shield-check'></i>
                <span>Confianza: ${confianza}%</span>
              </div>
            ` : ''}
            ${audienciaSegmentos ? `
              <div class="simulation-audience">
                <i class='bx bx-group'></i>
                <span>${audienciaSegmentos.substring(0, 60)}${audienciaSegmentos.length > 60 ? '...' : ''}</span>
              </div>
            ` : ''}
          </div>
          
          ${metricsPreview}
          ${successFactorsPreview}
          ${recommendationsPreview}
        </div>
      `;
    } else if (memory.isTrendAnalysis) {
      // Lógica existente para análisis de tendencias
      const { theme, popularity, marketingOpportunities, recommendedChannels } = memory.enrichedData;
      
      // Mostrar información más detallada y útil
      let opportunitiesPreview = '';
      if (marketingOpportunities.length > 0) {
        const firstThreeOpportunities = marketingOpportunities.slice(0, 3);
        opportunitiesPreview = `
          <div class="trend-opportunities-preview">
            <div class="trend-section-title">
              <i class='bx bx-bulb'></i>
              <span>Oportunidades de Marketing:</span>
            </div>
            <ul class="trend-opportunities-list">
              ${firstThreeOpportunities.map(opp => {
                const cleanOpp = typeof opp === 'string' ? opp : JSON.stringify(opp);
                const shortOpp = cleanOpp.length > 120 ? cleanOpp.substring(0, 120) + '...' : cleanOpp;
                return `<li>${shortOpp}</li>`;
              }).join('')}
            </ul>
            ${marketingOpportunities.length > 3 ? `
              <div class="trend-more-info">
                <i class='bx bx-plus'></i>
                <span>+${marketingOpportunities.length - 3} oportunidades más</span>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      let channelsPreview = '';
      if (recommendedChannels.length > 0) {
        const firstThreeChannels = recommendedChannels.slice(0, 3);
        channelsPreview = `
          <div class="trend-channels-preview">
            <div class="trend-section-title">
              <i class='bx bx-share-alt'></i>
              <span>Canales Recomendados:</span>
            </div>
            <div class="trend-channels-list">
              ${firstThreeChannels.map(channel => {
                let channelText = typeof channel === 'string' ? channel : JSON.stringify(channel);
                channelText = channelText.replace(/^\d+\.\s*/, '').replace(/^"\d+":\s*"/, '').replace(/"$/, '');
                const shortChannel = channelText.length > 80 ? channelText.substring(0, 80) + '...' : channelText;
                return `<div class="trend-channel-item">${shortChannel}</div>`;
              }).join('')}
            </div>
            ${recommendedChannels.length > 3 ? `
              <div class="trend-more-info">
                <i class='bx bx-plus'></i>
                <span>+${recommendedChannels.length - 3} canales más</span>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      enrichedInfo = `
        <div class="trend-enriched-info">
          <div class="trend-header-info">
            <div class="trend-theme">
              <i class='bx bx-tag'></i>
              <span>${theme}</span>
            </div>
            ${popularity > 0 ? `
              <div class="trend-popularity">
                <i class='bx bx-fire'></i>
                <span>Popularidad: ${formatPercentage(popularity, 0)}</span>
              </div>
            ` : ''}
          </div>
          
          ${opportunitiesPreview}
          ${channelsPreview}
        </div>
      `;
    }
  }
  
  // 🆕 NUEVO: Badge específico según el tipo
  let typeBadgeClass = '';
  if (memory.isScreenSimulation) {
    typeBadgeClass = 'simulation-type-badge';
  } else if (memory.isTrendAnalysis) {
    typeBadgeClass = 'trend-type-badge';
  }
  
  return `
    <div class="${cardClass}" data-memory-id="${memory.id}" style="--importance-width: ${importancePercentage}%">
      <div class="memory-card-header">
        <div class="memory-card-type-badge ${typeBadgeClass}">${formatTypeName(memory.type)}</div>
        <div class="memory-card-actions">
          <button class="memory-card-edit" data-memory-id="${memory.id}">
            <i class='bx bx-edit'></i>
          </button>
          <button class="memory-card-delete" data-memory-id="${memory.id}">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      </div>
      
      <div class="memory-card-content">
        <div class="memory-card-insight ${memory.isScreenSimulation ? 'simulation-insight' : memory.isTrendAnalysis ? 'trend-insight' : ''}">${memory.insight}</div>
        
        ${enrichedInfo}
        
        <div class="memory-card-importance">
          <div class="memory-importance-bar">
            <div class="memory-importance-fill" style="width: ${importancePercentage}%"></div>
          </div>
          <span class="memory-importance-value">${formatPercentage(memory.importance, 0)}</span>
        </div>
        
        <div class="memory-card-metadata">
          <div class="memory-card-source">
            <i class='bx bx-link'></i>
            ${formatSourceName(memory.source)}
          </div>
          ${memory.quality_score > 0 ? `
            <div class="memory-card-quality">
              <i class='bx bx-star'></i>
              Calidad: ${formatPercentage(memory.quality_score, 0)}
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="memory-card-footer">
        <div class="memory-card-date">
          <i class='bx bx-calendar'></i>
          ${formatRelativeDate(memory.created_at)}
        </div>
        <div class="memory-card-id">${memory.id.substring(0, 8)}...</div>
      </div>
    </div>
  `;
}

// Inicializar la modal de memoria
export function initMemoryModal() {
  console.log('🧠 Inicializando modal de memoria...');
  
  const memoryModal = document.getElementById('memoryModal');
  if (!memoryModal) {
    console.error('❌ Modal de memoria no encontrada');
    return;
  }
  
  // Event listener para cargar datos cuando se abra la modal
  memoryModal.addEventListener('modal:open', async () => {
    console.log('🧠 Modal de memoria abierta - Cargando dashboard...');
    await loadMemoryDashboard();
    setupModalHierarchy();
  });
  
  // Event listener para limpiar cuando se cierre la modal
  memoryModal.addEventListener('modal:close', () => {
    cleanupModalHierarchy();
  });
  
  console.log('✅ Modal de memoria inicializada correctamente');
}

// Cargar el dashboard completo de memoria
async function loadMemoryDashboard() {
  const modalBody = document.querySelector('#memoryModal .modal-body');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="memory-loading">
      <div class="spinner"></div>
      <p>Cargando memoria de la IA...</p>
    </div>
  `;
  
  try {
    await loadMemoryData();
    renderMemoryDashboard();
    setupMemoryEvents();
  } catch (error) {
    console.error('❌ Error cargando dashboard de memoria:', error);
    showMemoryError('Error cargando la memoria de la IA');
  }
}

// Cargar datos de memoria desde la API
async function loadMemoryData() {
  try {
    console.log('🧠 Cargando datos de memoria desde API...');
    
    const response = await getMemoryInsights();
    
    if (response && response.success && response.memories) {
      memoryData = response.memories.map(memory => processMemoryData(memory));
      filteredMemoryData = [...memoryData];
      console.log(`✅ ${memoryData.length} insights de memoria cargados exitosamente`);
      
      // 🆕 NUEVO: Log de análisis de tendencias detectados
      const trendAnalyses = memoryData.filter(m => m.isTrendAnalysis);
      if (trendAnalyses.length > 0) {
        console.log(`📊 ${trendAnalyses.length} análisis de tendencias detectados y enriquecidos`);
      }
    } else {
      console.warn('⚠️ Respuesta de API vacía o inválida');
      memoryData = [];
      filteredMemoryData = [];
    }
  } catch (error) {
    console.error('❌ Error cargando datos de memoria:', error);
    memoryData = [];
    filteredMemoryData = [];
    throw error;
  }
}

// [El resto de las funciones permanecen igual que en el código original...]
// Copiando solo las funciones que cambiaron arriba, las demás permanecen iguales

// Extraer información adicional del contenido
function extractAdditionalMemoryInfo(content) {
  const additionalInfo = {};
  const knownFields = [
    'insight', 'message', 'summary',
    'timestamp', 'quality_score', 'importance_suggestion',
    'derived_from', 'original_type', 'trend', 'analysis'
  ];
  
  Object.keys(content).forEach(key => {
    if (!knownFields.includes(key.toLowerCase())) {
      additionalInfo[key] = content[key];
    }
  });
  
  return additionalInfo;
}

// Renderizar el dashboard completo
function renderMemoryDashboard() {
  const modalBody = document.querySelector('#memoryModal .modal-body');
  if (!modalBody) return;
  
  // 🆕 MEJORADO: Estadísticas que incluyan simulaciones y análisis de tendencias
  const simulationsCount = memoryData.filter(m => m.isScreenSimulation).length;
  const trendAnalysesCount = memoryData.filter(m => m.isTrendAnalysis).length;
  
  modalBody.innerHTML = `
    <div class="memory-dashboard-container">
      <!-- Header con controles -->
      <div class="memory-dashboard-header">
        <h1>🧠 Memoria de la IA</h1>
        <div class="memory-dashboard-controls">
          <div class="memory-search-bar">
            <i class='bx bx-search'></i>
            <input type="text" class="memory-search-input" placeholder="Buscar insights...">
          </div>
          <select class="memory-type-filter">
            <option value="all">Todos los tipos</option>
            ${getUniqueTypes().map(type => {
              const displayName = formatTypeName(type);
              const truncatedName = displayName.length > 18 ? displayName.substring(0, 15) + '...' : displayName;
              return `<option value="${type}" title="${displayName}">${truncatedName}</option>`;
            }).join('')}
          </select>
          <select class="memory-source-filter">
            <option value="all">Todas las fuentes</option>
            ${getUniqueSources().map(source => {
              const displayName = formatSourceName(source);
              const truncatedName = displayName.length > 18 ? displayName.substring(0, 15) + '...' : displayName;
              return `<option value="${source}" title="${displayName}">${truncatedName}</option>`;
            }).join('')}
          </select>
          <button class="memory-refresh-button" title="Actualizar datos">
            <i class='bx bx-refresh'></i>
          </button>
          <button class="memory-reset-button" title="Reiniciar memoria completa">
            <i class='bx bx-trash'></i>
            <span>Reiniciar Memoria</span>
          </button>
        </div>
      </div>
      
      <!-- Tarjetas de resumen MEJORADAS CON SIMULACIONES -->
      <div class="memory-summary-cards">
        <div class="memory-summary-card">
          <div class="memory-card-icon">🧠</div>
          <div class="memory-card-value">${formatNumber(memoryData.length)}</div>
          <div class="memory-card-label">Total Insights</div>
        </div>
        <div class="memory-summary-card">
          <div class="memory-card-icon">⭐</div>
          <div class="memory-card-value">${formatNumber(memoryData.filter(m => m.importance > 0.7).length)}</div>
          <div class="memory-card-label">Alta Importancia</div>
        </div>
        <div class="memory-summary-card simulation-summary ${simulationsCount > 0 ? 'has-simulations' : ''}">
          <div class="memory-card-icon">🎯</div>
          <div class="memory-card-value">${formatNumber(simulationsCount)}</div>
          <div class="memory-card-label">Simulaciones</div>
        </div>
        <div class="memory-summary-card trend-analysis-summary ${trendAnalysesCount > 0 ? 'has-trends' : ''}">
          <div class="memory-card-icon">📊</div>
          <div class="memory-card-value">${formatNumber(trendAnalysesCount)}</div>
          <div class="memory-card-label">Análisis de Tendencias</div>
        </div>
        <div class="memory-summary-card">
          <div class="memory-card-icon">🏷️</div>
          <div class="memory-card-value">${formatNumber(getUniqueTypes().length)}</div>
          <div class="memory-card-label">Tipos de Insight</div>
        </div>
      </div>
      
      <!-- Lista de insights -->
      <div class="memory-list-section">
        <div class="memory-list-header">
          <h2><i class='bx bx-list-ul'></i> Insights de Memoria (${filteredMemoryData.length})</h2>
          <div class="memory-list-controls">
            <select class="memory-sort-select">
              <option value="newest">Más recientes</option>
              <option value="simulations-first">Simulaciones primero</option>
              <option value="trends-first">Análisis de tendencias primero</option>
              <option value="importance">Por importancia</option>
              <option value="quality">Por calidad</option>
              <option value="oldest">Más antiguos</option>
              <option value="alphabetical">Alfabético</option>
            </select>
            <div class="memory-view-toggle">
              <button class="memory-view-btn active" data-view="grid">
                <i class='bx bx-grid-alt'></i>
              </button>
              <button class="memory-view-btn" data-view="list">
                <i class='bx bx-list-ul'></i>
              </button>
            </div>
          </div>
        </div>
        <div class="memory-content">
          ${renderMemoryContent()}
        </div>
      </div>
    </div>
    
    ${renderModals()}
  `;
}

function renderModals() {
  return `
    <!-- Modal de detalles de insight -->
    <div class="memory-detail-modal" id="memoryDetailModal">
      <div class="memory-detail-content">
        <div class="memory-detail-header">
          <button class="memory-detail-close">×</button>
          <div class="memory-detail-main-info">
            <div class="memory-detail-title"></div>
            <div class="memory-detail-importance-display">
              <div class="memory-detail-importance-bar">
                <div class="memory-detail-importance-fill"></div>
              </div>
              <span class="memory-detail-importance-text"></span>
            </div>
            <div class="memory-detail-meta">
              <span class="memory-detail-date"></span>
              <span class="memory-detail-id"></span>
            </div>
          </div>
        </div>
        <div class="memory-detail-body">
          <!-- Se llenará dinámicamente -->
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para reiniciar memoria -->
    <div class="memory-reset-modal" id="memoryResetModal">
      <div class="memory-reset-content">
        <div class="memory-reset-header">
          <h3>⚠️ Reiniciar Memoria Completa</h3>
          <button class="memory-reset-close">×</button>
        </div>
        <div class="memory-reset-body">
          <div class="memory-reset-warning">
            <i class='bx bx-error-circle'></i>
            <p><strong>¡ATENCIÓN!</strong> Esta acción eliminará completamente toda la memoria de la IA.</p>
          </div>
          <div class="memory-reset-details">
            <h4>Esto significa que se perderán:</h4>
            <ul>
              <li>Todos los insights generados (${memoryData.length} insights)</li>
              <li>Todo el conocimiento acumulado por la IA</li>
              <li>Patrones y tendencias detectadas</li>
              <li>Análisis de contenido y campañas</li>
            </ul>
          </div>
          <div class="memory-reset-confirmation">
            <h4>¿Estás seguro de que quieres continuar?</h4>
            <p>Esta acción es <strong>irreversible</strong> y reiniciará completamente la IA.</p>
          </div>
        </div>
        <div class="memory-reset-footer">
          <button class="memory-reset-cancel">Cancelar</button>
          <button class="memory-reset-confirm">Sí, reiniciar memoria</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de edición de insight -->
    <div class="memory-edit-modal" id="memoryEditModal">
      <div class="memory-edit-content">
        <div class="memory-edit-header">
          <h3>✏️ Editar Insight</h3>
          <button class="memory-edit-close">×</button>
        </div>
        <div class="memory-edit-body">
          <form class="memory-edit-form">
            <div class="memory-edit-field">
              <label>Insight:</label>
              <textarea class="memory-edit-insight" rows="3"></textarea>
            </div>
            <div class="memory-edit-field">
              <label>Importancia:</label>
              <input type="range" class="memory-edit-importance" min="0" max="1" step="0.1">
              <span class="memory-edit-importance-value">0.5</span>
            </div>
            <div class="memory-edit-field">
              <label>Tipo:</label>
              <select class="memory-edit-type">
                ${getUniqueTypes().map(type => {
                  const displayName = formatTypeName(type);
                  return `<option value="${type}" title="${displayName}">${displayName}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="memory-edit-field">
              <label>Fuente:</label>
              <input type="text" class="memory-edit-source">
            </div>
          </form>
        </div>
        <div class="memory-edit-footer">
          <button class="memory-edit-cancel">Cancelar</button>
          <button class="memory-edit-save">Guardar Cambios</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para eliminar insight individual -->
    <div class="memory-delete-modal" id="memoryDeleteModal">
      <div class="memory-delete-content">
        <div class="memory-delete-header">
          <h3>🗑️ Eliminar Insight</h3>
          <button class="memory-delete-close">×</button>
        </div>
        <div class="memory-delete-body">
          <div class="memory-delete-warning">
            <i class='bx bx-info-circle'></i>
            <p><strong>¿Estás seguro?</strong> Esta acción eliminará este insight de la memoria.</p>
          </div>
          <div class="memory-delete-preview">
            <h4>Insight a eliminar:</h4>
            <div class="memory-delete-insight-preview"></div>
          </div>
          <div class="memory-delete-confirmation">
            <p>Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="memory-delete-footer">
          <button class="memory-delete-cancel">Cancelar</button>
          <button class="memory-delete-confirm">Sí, eliminar</button>
        </div>
      </div>
    </div>
  `;
}

// Renderizar contenido de memoria
function renderMemoryContent() {
  if (filteredMemoryData.length === 0) {
    return `
      <div class="memory-no-data">
        <i class='bx bx-info-circle'></i>
        <span>No se encontraron insights de memoria</span>
      </div>
    `;
  }
  
  if (currentView === 'grid') {
    return `
      <div class="memory-grid">
        ${filteredMemoryData.map(memory => renderMemoryCard(memory)).join('')}
      </div>
    `;
  } else {
    return `
      <table class="memory-table">
        <thead>
          <tr>
            <th>Insight</th>
            <th>Tipo</th>
            <th>Importancia</th>
            <th>Fuente</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filteredMemoryData.map(memory => renderMemoryRow(memory)).join('')}
        </tbody>
      </table>
    `;
  }
}

// Renderizar fila de tabla - MEJORADO
function renderMemoryRow(memory) {
  let rowIndicator = '';
  let rowClass = 'memory-row';
  let badgeClass = '';
  
  // 🆕 NUEVO: Indicadores específicos para simulaciones y tendencias
  if (memory.isScreenSimulation) {
    rowIndicator = '<i class="bx bx-target-lock simulation-row-indicator" title="Simulación de Campaña"></i> ';
    rowClass += ' simulation-row';
    badgeClass = 'simulation-type-badge';
  } else if (memory.isTrendAnalysis) {
    rowIndicator = '<i class="bx bx-trending-up trend-row-indicator" title="Análisis de Tendencia"></i> ';
    rowClass += ' trend-analysis-row';
    badgeClass = 'trend-type-badge';
  }
  
  return `
    <tr class="${rowClass}" data-memory-id="${memory.id}">
      <td class="memory-insight-cell">
        <div class="memory-insight-preview">${rowIndicator}${memory.insight.substring(0, 100)}${memory.insight.length > 100 ? '...' : ''}</div>
      </td>
      <td>
        <span class="memory-type-badge ${badgeClass}">${formatTypeName(memory.type)}</span>
      </td>
      <td class="memory-importance-cell">
        <div class="memory-importance-bar">
          <div class="memory-importance-fill" style="width: ${memory.importance * 100}%"></div>
        </div>
        ${formatPercentage(memory.importance, 0)}
      </td>
      <td>${formatSourceName(memory.source)}</td>
      <td class="memory-date-cell">${formatDate(memory.created_at)}</td>
      <td class="memory-actions-cell">
        <button class="memory-action-btn memory-view-btn" data-memory-id="${memory.id}">
          <i class='bx bx-show'></i>
        </button>
        <button class="memory-action-btn memory-edit-btn" data-memory-id="${memory.id}">
          <i class='bx bx-edit'></i>
        </button>
        <button class="memory-action-btn memory-delete-btn" data-memory-id="${memory.id}">
          <i class='bx bx-trash'></i>
        </button>
      </td>
    </tr>
  `;
}

// 🆕 MEJORADO: Función de ordenamiento que incluye análisis de tendencias
function handleMemorySort(e) {
  const sortValue = e.target.value;
  
  switch (sortValue) {
    case 'simulations-first':
      filteredMemoryData.sort((a, b) => {
        // Primero simulaciones, luego por importancia
        if (a.isScreenSimulation && !b.isScreenSimulation) return -1;
        if (!a.isScreenSimulation && b.isScreenSimulation) return 1;
        return b.importance - a.importance;
      });
      break;
    case 'trends-first':
      filteredMemoryData.sort((a, b) => {
        // Primero análisis de tendencias, luego por importancia
        if (a.isTrendAnalysis && !b.isTrendAnalysis) return -1;
        if (!a.isTrendAnalysis && b.isTrendAnalysis) return 1;
        return b.importance - a.importance;
      });
      break;
    case 'importance':
      filteredMemoryData.sort((a, b) => b.importance - a.importance);
      break;
    case 'quality':
      filteredMemoryData.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
      break;
    case 'newest':
      filteredMemoryData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      filteredMemoryData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'alphabetical':
      filteredMemoryData.sort((a, b) => a.insight.localeCompare(b.insight));
      break;
  }
  
  updateMemoryContent();
}

// Funciones auxiliares
function getUniqueTypes() {
  return [...new Set(memoryData.map(m => m.type))].sort();
}

function getUniqueSources() {
  return [...new Set(memoryData.map(m => m.source))].sort();
}

function calculateAverageImportance() {
  if (memoryData.length === 0) return 0;
  const sum = memoryData.reduce((acc, memory) => acc + memory.importance, 0);
  return sum / memoryData.length;
}

function formatTypeName(type) {
  const typeNames = {
    // Tipos existentes
    'content_insight': 'Insight de Contenido',
    'campaign_simulation': 'Simulación de Campaña',
    'trend_detection': 'Detección de Tendencia',
    'trend_analysis': 'Análisis de Tendencia',
    'response_insight': 'Insight de Respuesta',
    'interaction_record': 'Registro de Interacción',
    'profile_creation': 'Creación de Perfil',
    'agent_insight': 'Insight de Agente',
    
    // 🆕 NUEVOS: Tipos específicos para simulaciones
    'screen_simulation': 'Simulación de Pantalla',
    'simulation_results': 'Resultados de Simulación',
    'campaign_metrics': 'Métricas de Campaña',
    'audience_simulation': 'Simulación de Audiencia',
    'performance_prediction': 'Predicción de Rendimiento',
    'marketing_simulation': 'Simulación de Marketing',
    'ab_test_simulation': 'Simulación A/B Test',
    'conversion_simulation': 'Simulación de Conversión',
    
    // Tipos genéricos
    'unknown': 'Desconocido',
    'general': 'General',
    'system': 'Sistema'
  };
  
  // Si el tipo está en el mapeo, devolverlo
  if (typeNames[type]) {
    return typeNames[type];
  }
  
  // Si no está mapeado, formatear automáticamente
  return type
    .replace(/_/g, ' ')
    .replace(/simulation/g, 'Simulación')
    .replace(/campaign/g, 'Campaña')
    .replace(/trend/g, 'Tendencia')
    .replace(/analysis/g, 'Análisis')
    .replace(/insight/g, 'Insight')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatSourceName(source) {
  const sourceNames = {
    'content_generation': 'Generación de Contenido',
    'simulation_engine': 'Motor de Simulación',
    'trend_analysis': 'Análisis de Tendencias',
    'final_insight': 'Insight Final',
    'interaction_tracking': 'Seguimiento de Interacciones',
    'Consulta del usuario': 'Consulta del Usuario',
    'Análisis interno': 'Análisis Interno',
    'unknown': 'Desconocido'
  };
  
  return sourceNames[source] || source;
}

function formatFieldName(fieldName) {
  const fieldMappings = {
    'quality_score': 'Puntuación de Calidad',
    'importance_suggestion': 'Importancia Sugerida',
    'derived_from': 'Derivado de',
    'original_type': 'Tipo Original',
    'timestamp': 'Marca de Tiempo'
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

// Configurar eventos de la modal
function setupMemoryEvents() {
  const modalBody = document.querySelector('#memoryModal .modal-body');
  if (!modalBody) return;
  
  // Búsqueda
  const searchInput = modalBody.querySelector('.memory-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleMemorySearch);
  }
  
  // Filtros
  const typeFilter = modalBody.querySelector('.memory-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', handleMemoryFilter);
  }
  
  const sourceFilter = modalBody.querySelector('.memory-source-filter');
  if (sourceFilter) {
    sourceFilter.addEventListener('change', handleMemoryFilter);
  }
  
  // Ordenamiento
  const sortSelect = modalBody.querySelector('.memory-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', handleMemorySort);
  }
  
  // Cambio de vista
  const viewBtns = modalBody.querySelectorAll('.memory-view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => handleViewChange(btn.dataset.view));
  });
  
  // Refresh
  const refreshBtn = modalBody.querySelector('.memory-refresh-button');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleMemoryRefresh);
  }
  
  // Reiniciar memoria
  const resetBtn = modalBody.querySelector('.memory-reset-button');
  if (resetBtn) {
    resetBtn.addEventListener('click', showResetMemoryModal);
  }
  
  // Delegación de eventos para acciones
  modalBody.addEventListener('click', (e) => {
    // Prevenir propagación en botones de acción
    if (e.target.closest('.memory-action-btn')) {
      e.stopPropagation();
    }
    
    // Ver detalles
    if (e.target.closest('.memory-card:not(.memory-card-edit):not(.memory-card-delete)') && !e.target.closest('.memory-card-actions')) {
      const memoryId = e.target.closest('.memory-card').dataset.memoryId;
      showMemoryDetails(memoryId);
    }
    
    if (e.target.closest('.memory-view-btn')) {
      const memoryId = e.target.closest('.memory-view-btn').dataset.memoryId;
      showMemoryDetails(memoryId);
    }
    
    // Editar
    if (e.target.closest('.memory-card-edit') || e.target.closest('.memory-edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const memoryId = e.target.closest('[data-memory-id]').dataset.memoryId;
      showEditMemoryModal(memoryId);
    }
    
    // Eliminar
    if (e.target.closest('.memory-card-delete') || e.target.closest('.memory-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const memoryId = e.target.closest('[data-memory-id]').dataset.memoryId;
      handleDeleteMemory(memoryId);
    }
  });
  
  setupModalHierarchy();
}

// Funciones de manejo de eventos
function handleMemorySearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  applyFilters(searchTerm);
}

function handleMemoryFilter() {
  const typeFilter = document.querySelector('.memory-type-filter').value;
  const sourceFilter = document.querySelector('.memory-source-filter').value;
  const searchTerm = document.querySelector('.memory-search-input').value.toLowerCase();
  
  currentTypeFilter = typeFilter;
  currentSourceFilter = sourceFilter;
  
  applyFilters(searchTerm);
}

function applyFilters(searchTerm = '') {
  filteredMemoryData = memoryData.filter(memory => {
    if (currentTypeFilter !== 'all' && memory.type !== currentTypeFilter) {
      return false;
    }
    
    if (currentSourceFilter !== 'all' && memory.source !== currentSourceFilter) {
      return false;
    }
    
    if (searchTerm) {
      return memory.insight.toLowerCase().includes(searchTerm) ||
             memory.type.toLowerCase().includes(searchTerm) ||
             memory.source.toLowerCase().includes(searchTerm) ||
             (memory.derived_from && memory.derived_from.toLowerCase().includes(searchTerm));
    }
    
    return true;
  });
  
  updateMemoryContent();
  updateSummaryCards();
}

function handleViewChange(view) {
  currentView = view;
  
  const viewBtns = document.querySelectorAll('.memory-view-btn');
  viewBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  updateMemoryContent();
}

function updateMemoryContent() {
  const memoryContent = document.querySelector('.memory-content');
  const listHeader = document.querySelector('.memory-list-header h2');
  
  if (memoryContent) {
    memoryContent.innerHTML = renderMemoryContent();
  }
  
  if (listHeader) {
    listHeader.innerHTML = `<i class='bx bx-list-ul'></i> Insights de Memoria (${filteredMemoryData.length})`;
  }
}

function updateSummaryCards() {
  const summaryCards = document.querySelectorAll('.memory-summary-card');
  
  if (summaryCards.length >= 5) {
    summaryCards[0].querySelector('.memory-card-value').textContent = formatNumber(filteredMemoryData.length);
    summaryCards[1].querySelector('.memory-card-value').textContent = 
      formatNumber(filteredMemoryData.filter(m => m.importance > 0.7).length);
    
    // 🆕 MEJORADO: Actualizar conteo de análisis de tendencias
    const trendAnalysesFiltered = filteredMemoryData.filter(m => m.isTrendAnalysis).length;
    summaryCards[2].querySelector('.memory-card-value').textContent = formatNumber(trendAnalysesFiltered);
    
    const avgImportance = filteredMemoryData.length > 0 ? 
      filteredMemoryData.reduce((acc, m) => acc + m.importance, 0) / filteredMemoryData.length : 0;
    summaryCards[3].querySelector('.memory-card-value').textContent = formatPercentage(avgImportance, 0);
    
    const uniqueTypesFiltered = new Set(filteredMemoryData.map(m => m.type));
    summaryCards[4].querySelector('.memory-card-value').textContent = formatNumber(uniqueTypesFiltered.size);
  }
}

async function handleMemoryRefresh() {
  const refreshBtn = document.querySelector('.memory-refresh-button');
  if (refreshBtn) {
    refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      refreshBtn.style.transform = '';
    }, 500);
  }
  
  await loadMemoryData();
  
  setTimeout(() => {
    renderMemoryDashboard();
    setupMemoryEvents();
  }, 100);
  
  if (window.showNotification) {
    window.showNotification('Memoria actualizada', 'success', 2000);
  }
}

// Modales auxiliares
function showResetMemoryModal() {
  console.log('🚀 Mostrando modal de reseteo de memoria...');
  
  const resetModal = document.querySelector('#memoryResetModal');
  if (!resetModal) {
    console.error('❌ Modal de reseteo no encontrada');
    return;
  }
  
  // ✅ NUEVO: Restaurar estado inicial del botón de confirmación
  const confirmBtn = resetModal.querySelector('.memory-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, reiniciar memoria';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  // ✅ LIMPIAR EVENT LISTENERS ANTERIORES
  if (resetModal._handlers) {
    const { closeHandler, confirmHandler, handleResetEsc } = resetModal._handlers;
    const closeBtn = resetModal.querySelector('.memory-reset-close');
    const cancelBtn = resetModal.querySelector('.memory-reset-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleResetEsc, true);
    resetModal.removeEventListener('click', resetModal._backdropHandler);
    
    delete resetModal._handlers;
    delete resetModal._backdropHandler;
  }
  
  const closeBtn = resetModal.querySelector('.memory-reset-close');
  const cancelBtn = resetModal.querySelector('.memory-reset-cancel');
  
  const closeHandler = () => closeResetModal(resetModal);
  const confirmHandler = () => handleResetMemory(resetModal);
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  
  const backdropHandler = (e) => {
    if (e.target === resetModal) {
      closeHandler();
    }
  };
  resetModal.addEventListener('click', backdropHandler);
  resetModal._backdropHandler = backdropHandler;
  
  // ✅ AGREGADO: Handler específico de ESC para resetModal
  const handleResetEsc = (e) => {
    if (e.key === 'Escape' && resetModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleResetEsc, true);
  
  // ✅ Guardar handlers para limpieza
  resetModal._handlers = { 
    closeHandler, 
    confirmHandler,
    handleResetEsc
  };
  
  resetModal.classList.add('active');
}

function closeResetModal(resetModal) {
  console.log('🚪 Cerrando modal de reseteo de memoria...');
  
  // ✅ ASEGURAR QUE EL BOTÓN ESTÉ EN ESTADO CORRECTO ANTES DE CERRAR
  const confirmBtn = resetModal.querySelector('.memory-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, reiniciar memoria';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  resetModal.classList.remove('active');
  
  // ✅ Limpiar event listeners (incluyendo ESC handler)
  if (resetModal._handlers) {
    const { closeHandler, confirmHandler, handleResetEsc } = resetModal._handlers;
    const closeBtn = resetModal.querySelector('.memory-reset-close');
    const cancelBtn = resetModal.querySelector('.memory-reset-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    // ✅ Remover ESC handler
    document.removeEventListener('keydown', handleResetEsc, true);
    resetModal.removeEventListener('click', resetModal._backdropHandler);
    
    delete resetModal._handlers;
    delete resetModal._backdropHandler;
  }
  
  console.log('✅ Modal de reseteo de memoria cerrada y limpiada');
}

async function handleResetMemory(resetModal) {
  console.log('🔥 Iniciando reinicio de memoria...');
  
  const confirmBtn = resetModal.querySelector('.memory-reset-confirm');
  
  // ✅ GUARDAR ESTADO ORIGINAL DEL BOTÓN
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, reiniciar memoria',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    // Cambiar a estado de carga
    if (confirmBtn) {
      confirmBtn.textContent = 'Reiniciando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await resetAllMemory();
    
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
        closeResetModal(resetModal);
      }, 100);
      
      await loadMemoryData();
      renderMemoryDashboard();
      setupMemoryEvents();
      
      if (window.showNotification) {
        window.showNotification('Memoria de la IA reiniciada completamente', 'success', 3000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error reiniciando memoria:', error);
    
    // ✅ RESTAURAR ESTADO ORIGINAL EN CASO DE ERROR
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al reiniciar la memoria: ' + error.message, 'error', 3000);
    }
  }
}

function showEditMemoryModal(memoryId) {
  const memory = memoryData.find(m => m.id === memoryId);
  if (!memory) return;
  
  const editModal = document.querySelector('#memoryEditModal');
  if (!editModal) return;
  
  editModal.querySelector('.memory-edit-insight').value = memory.insight;
  editModal.querySelector('.memory-edit-importance').value = memory.importance;
  editModal.querySelector('.memory-edit-importance-value').textContent = memory.importance;
  editModal.querySelector('.memory-edit-type').value = memory.type;
  editModal.querySelector('.memory-edit-source').value = memory.source;
  
  const closeBtn = editModal.querySelector('.memory-edit-close');
  const cancelBtn = editModal.querySelector('.memory-edit-cancel');
  const saveBtn = editModal.querySelector('.memory-edit-save');
  const importanceSlider = editModal.querySelector('.memory-edit-importance');
  
  const closeHandler = () => closeEditModal(editModal);
  const saveHandler = () => handleSaveMemory(memoryId, editModal);
  const sliderHandler = (e) => {
    editModal.querySelector('.memory-edit-importance-value').textContent = e.target.value;
  };
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  saveBtn.addEventListener('click', saveHandler);
  importanceSlider.addEventListener('input', sliderHandler);
  
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeHandler();
    }
  });
  
  // ✅ Handler específico de ESC con máxima prioridad
  const handleEditEsc = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleEditEsc, true);
  
  // Guardar handlers para limpieza
  editModal._handlers = { 
    closeHandler, 
    saveHandler, 
    sliderHandler,
    handleEditEsc
  };
  
  editModal.classList.add('active');
}

function closeEditModal(editModal) {
  editModal.classList.remove('active');
  
  // Limpiar event listeners
  if (editModal._handlers) {
    const { closeHandler, saveHandler, sliderHandler, handleEditEsc } = editModal._handlers;
    const closeBtn = editModal.querySelector('.memory-edit-close');
    const cancelBtn = editModal.querySelector('.memory-edit-cancel');
    const saveBtn = editModal.querySelector('.memory-edit-save');
    const importanceSlider = editModal.querySelector('.memory-edit-importance');
    
    closeBtn.removeEventListener('click', closeHandler);
    cancelBtn.removeEventListener('click', closeHandler);
    saveBtn.removeEventListener('click', saveHandler);
    importanceSlider.removeEventListener('input', sliderHandler);
    
    // Remover ESC handler
    document.removeEventListener('keydown', handleEditEsc, true);
    
    delete editModal._handlers;
  }
}

async function handleSaveMemory(memoryId, editModal) {
  console.log('💾 Guardando cambios en memoria:', memoryId);
  
  const saveBtn = editModal.querySelector('.memory-edit-save');
  
  // ✅ GUARDAR ESTADO ORIGINAL DEL BOTÓN
  const originalButtonState = {
    text: saveBtn ? saveBtn.textContent : 'Guardar Cambios',
    disabled: saveBtn ? saveBtn.disabled : false
  };
  
  try {
    // Cambiar a estado de carga
    if (saveBtn) {
      saveBtn.textContent = 'Guardando...';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.7';
      saveBtn.style.cursor = 'wait';
    }
    
    const insight = editModal.querySelector('.memory-edit-insight').value;
    const importance = parseFloat(editModal.querySelector('.memory-edit-importance').value);
    const type = editModal.querySelector('.memory-edit-type').value;
    const source = editModal.querySelector('.memory-edit-source').value;
    
    const updateData = { insight, importance, type, source };
    
    const response = await updateMemoryInsight(memoryId, updateData);
    
    if (response && response.success) {
      // ✅ RESTAURAR ESTADO ANTES DE CERRAR
      if (saveBtn) {
        saveBtn.textContent = originalButtonState.text;
        saveBtn.disabled = originalButtonState.disabled;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeEditModal(editModal);
      }, 100);
      
      await loadMemoryData();
      applyFilters(document.querySelector('.memory-search-input')?.value || '');
      
      if (window.showNotification) {
        window.showNotification('Insight actualizado correctamente', 'success', 2000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error guardando memoria:', error);
    
    // ✅ RESTAURAR ESTADO ORIGINAL EN CASO DE ERROR
    if (saveBtn) {
      saveBtn.textContent = originalButtonState.text;
      saveBtn.disabled = originalButtonState.disabled;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al guardar los cambios: ' + error.message, 'error', 3000);
    }
  }
}

async function handleDeleteMemory(memoryId) {
  console.log('🗑️ Intentando eliminar memoria con ID:', memoryId);
  
  const memory = memoryData.find(m => m.id === memoryId);
  if (!memory) {
    console.warn('❌ No se encontró memoria con ID:', memoryId);
    if (window.showNotification) {
      window.showNotification('Error: Insight no encontrado', 'error', 3000);
    }
    return;
  }
  
  console.log('✅ Memoria encontrada, mostrando modal de confirmación');
  showDeleteMemoryModal(memory);
}

function showDeleteMemoryModal(memory) {
  console.log('🚀 Mostrando modal de eliminar para:', memory.insight.substring(0, 50));
  
  const deleteModal = document.querySelector('#memoryDeleteModal');
  if (!deleteModal) {
    console.error('❌ Modal de eliminar no encontrada en el DOM');
    return;
  }
  
  console.log('✅ Modal encontrada, configurando contenido...');
  
  // ✅ NUEVO: Restaurar estado inicial del botón de confirmación
  const confirmBtn = deleteModal.querySelector('.memory-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  // Llenar la preview del insight
  const previewDiv = deleteModal.querySelector('.memory-delete-insight-preview');
  if (!previewDiv) {
    console.error('❌ Preview div no encontrado');
    return;
  }
  
  // 🆕 MEJORADO: Preview especial para análisis de tendencias
  const trendBadge = memory.isTrendAnalysis ? 
    `<div class="memory-card-type-badge trend-type-badge">${formatTypeName(memory.type)}</div>` :
    `<div class="memory-card-type-badge">${formatTypeName(memory.type)}</div>`;
  
  previewDiv.innerHTML = `
    ${trendBadge}
    <div class="memory-insight-text ${memory.isTrendAnalysis ? 'trend-insight-preview' : ''}">"${memory.insight.substring(0, 150)}${memory.insight.length > 150 ? '...' : ''}"</div>
    <div class="memory-insight-meta">
      <span>Fuente: ${formatSourceName(memory.source)}</span>
      <span>Importancia: ${formatPercentage(memory.importance, 0)}</span>
    </div>
  `;
  
  // ✅ LIMPIAR EVENT LISTENERS ANTERIORES
  if (deleteModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._handlers;
    const closeBtn = deleteModal.querySelector('.memory-delete-close');
    const cancelBtn = deleteModal.querySelector('.memory-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._backdropHandler);
    
    delete deleteModal._handlers;
    delete deleteModal._backdropHandler;
  }
  
  // Configurar eventos
  const closeBtn = deleteModal.querySelector('.memory-delete-close');
  const cancelBtn = deleteModal.querySelector('.memory-delete-cancel');
  
  if (!closeBtn || !cancelBtn || !confirmBtn) {
    console.error('❌ Botones de la modal no encontrados');
    return;
  }
  
  const closeHandler = () => {
    console.log('🚪 Cerrando modal de eliminar');
    closeDeleteModal(deleteModal);
  };
  const confirmHandler = () => {
    console.log('✅ Confirmando eliminación');
    confirmDeleteMemory(memory.id, deleteModal);
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
  
  // ✅ Handler específico de ESC con máxima prioridad
  const handleDeleteEsc = (e) => {
    if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleDeleteEsc, true);
  
  // Guardar handlers para limpieza
  deleteModal._handlers = { 
    closeHandler, 
    confirmHandler,
    handleDeleteEsc
  };
  
  console.log('🎯 Activando modal de eliminar...');
  deleteModal.classList.add('active');
  
  // Verificar que se activó correctamente
  setTimeout(() => {
    if (deleteModal.classList.contains('active')) {
      console.log('✅ Modal de eliminar activada correctamente');
    } else {
      console.error('❌ Modal de eliminar no se activó correctamente');
    }
  }, 100);
}

function closeDeleteModal(deleteModal) {
  console.log('🚪 Cerrando modal de eliminar insight...');
  
  // ✅ ASEGURAR QUE EL BOTÓN ESTÉ EN ESTADO CORRECTO ANTES DE CERRAR
  const confirmBtn = deleteModal.querySelector('.memory-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  deleteModal.classList.remove('active');
  
  // Limpiar event listeners
  if (deleteModal._handlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._handlers;
    const closeBtn = deleteModal.querySelector('.memory-delete-close');
    const cancelBtn = deleteModal.querySelector('.memory-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    // Remover ESC handler
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._backdropHandler);
    
    delete deleteModal._handlers;
    delete deleteModal._backdropHandler;
  }
  
  console.log('✅ Modal de eliminar insight cerrada y limpiada');
}

async function confirmDeleteMemory(memoryId, deleteModal) {
  console.log('🔥 Iniciando eliminación de memoria:', memoryId);
  
  const confirmBtn = deleteModal.querySelector('.memory-delete-confirm');
  
  // ✅ GUARDAR ESTADO ORIGINAL DEL BOTÓN
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    // Mostrar feedback visual
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    console.log('📡 Llamando a API deleteMemoryInsight...');
    const response = await deleteMemoryInsight(memoryId);
    
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
        closeDeleteModal(deleteModal);
      }, 100);
      
      console.log('🔄 Recargando datos...');
      await loadMemoryData();
      applyFilters(document.querySelector('.memory-search-input')?.value || '');
      
      if (window.showNotification) {
        window.showNotification('Insight eliminado correctamente', 'success', 2000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido en la respuesta');
    }
  } catch (error) {
    console.error('❌ Error eliminando memoria:', error);
    
    // ✅ RESTAURAR ESTADO ORIGINAL EN CASO DE ERROR
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar el insight: ' + error.message, 'error', 5000);
    }
  }
}

function setupMemoryDetailTitle(titleElement, fullText) {
  if (!titleElement || !fullText) {
    console.warn('⚠️ Elemento de título o texto no válido');
    return;
  }
  
  // Limpiar título anterior
  titleElement.textContent = '';
  titleElement.removeAttribute('data-full-title');
  
  // Configurar texto completo
  titleElement.textContent = fullText;
  
  // Siempre configurar el atributo data-full-title para el tooltip
  titleElement.setAttribute('data-full-title', fullText);
  
  console.log(`📝 Título configurado: "${fullText}"`);
  console.log(`📏 Longitud del título: ${fullText.length} caracteres`);
  
  // 🆕 NUEVO: Verificar si el texto se está truncando visualmente
  setTimeout(() => {
    const isOverflowing = titleElement.scrollWidth > titleElement.clientWidth;
    if (isOverflowing) {
      titleElement.style.cursor = 'help';
      console.log('✂️ Título truncado, tooltip disponible');
    } else {
      console.log('📏 Título cabe completamente');
    }
  }, 100);
}

// 🆕 FUNCIÓN MEJORADA: showMemoryDetails actualizada
function showMemoryDetails(memoryId) {
  const memory = memoryData.find(m => m.id === memoryId);
  if (!memory) {
    console.warn('❌ Memoria no encontrada:', memoryId);
    return;
  }
  
  const detailModal = document.querySelector('#memoryDetailModal');
  if (!detailModal) {
    console.error('❌ Modal de detalles no encontrado');
    return;
  }
  
  console.log('🔍 Mostrando detalles de memoria:', memoryId);
  
  // 🆕 ARREGLADO: Configurar título con manejo mejorado
  const titleElement = detailModal.querySelector('.memory-detail-title');
  if (titleElement) {
    setupMemoryDetailTitle(titleElement, memory.insight);
  } else {
    console.error('❌ Elemento .memory-detail-title no encontrado');
  }
  
  // Configurar otros elementos del modal
  const importanceFill = detailModal.querySelector('.memory-detail-importance-fill');
  const importanceText = detailModal.querySelector('.memory-detail-importance-text');
  const dateElement = detailModal.querySelector('.memory-detail-date');
  const idElement = detailModal.querySelector('.memory-detail-id');
  
  if (importanceFill) {
    importanceFill.style.width = `${memory.importance * 100}%`;
  }
  
  if (importanceText) {
    importanceText.textContent = formatPercentage(memory.importance, 0);
  }
  
  if (dateElement) {
    dateElement.textContent = formatDate(memory.created_at);
  }
  
  if (idElement) {
    idElement.textContent = `ID: ${memory.id.substring(0, 8)}...`;
  }
  
  const detailBody = detailModal.querySelector('.memory-detail-body');
  if (detailBody) {
    // 🆕 MEJORADO: Información enriquecida para simulaciones y análisis de tendencias
    let enrichedSection = '';
    
    if (memory.isScreenSimulation && memory.enrichedData && memory.enrichedData.isEnriched) {
      const { concepto, objetivos, audienciaSegmentos, metricas, confianza, factoresExito, recomendaciones, riesgos } = memory.enrichedData;
      
      enrichedSection = `
        <div class="memory-detail-section simulation-details">
          <h3><i class='bx bx-target-lock'></i> Simulación de Campaña</h3>
          <div class="memory-info-cards">
            <div class="memory-info-card simulation-info-card">
              <div class="memory-info-card-header">
                <i class='bx bx-bullseye'></i>
                <span>Concepto Principal</span>
              </div>
              <div class="memory-info-card-content">
                <p><strong>${concepto}</strong></p>
              </div>
            </div>
            
            ${confianza > 0 ? `
              <div class="memory-info-card simulation-info-card">
                <div class="memory-info-card-header">
                  <i class='bx bx-shield-check'></i>
                  <span>Nivel de Confianza</span>
                </div>
                <div class="memory-info-card-content">
                  <p><strong>${confianza}%</strong></p>
                </div>
              </div>
            ` : ''}
            
            ${audienciaSegmentos ? `
              <div class="memory-info-card simulation-info-card">
                <div class="memory-info-card-header">
                  <i class='bx bx-group'></i>
                  <span>Audiencia Objetivo</span>
                </div>
                <div class="memory-info-card-content">
                  <p>${audienciaSegmentos}</p>
                </div>
              </div>
            ` : ''}
            
            ${objetivos ? `
              <div class="memory-info-card simulation-info-card full-width">
                <div class="memory-info-card-header">
                  <i class='bx bx-flag'></i>
                  <span>Objetivos de la Campaña</span>
                </div>
                <div class="memory-info-card-content">
                  <p>${objetivos}</p>
                </div>
              </div>
            ` : ''}
          </div>
          
          ${(metricas.ctr !== 'N/A' || metricas.engagement !== 'N/A' || metricas.conversion !== 'N/A') ? `
            <h4><i class='bx bx-bar-chart-alt-2'></i> Métricas Proyectadas</h4>
            <div class="memory-info-cards">
              ${metricas.ctr !== 'N/A' ? `
                <div class="memory-info-card simulation-info-card">
                  <div class="memory-info-card-header">
                    <i class='bx bx-mouse-alt'></i>
                    <span>CTR (Click-Through Rate)</span>
                  </div>
                  <div class="memory-info-card-content">
                    <p><strong>${metricas.ctr}</strong></p>
                  </div>
                </div>
              ` : ''}
              
              ${metricas.engagement !== 'N/A' ? `
                <div class="memory-info-card simulation-info-card">
                  <div class="memory-info-card-header">
                    <i class='bx bx-heart'></i>
                    <span>Engagement</span>
                  </div>
                  <div class="memory-info-card-content">
                    <p><strong>${metricas.engagement}</strong></p>
                  </div>
                </div>
              ` : ''}
              
              ${metricas.conversion !== 'N/A' ? `
                <div class="memory-info-card simulation-info-card">
                  <div class="memory-info-card-header">
                    <i class='bx bx-shopping-bag'></i>
                    <span>Tasa de Conversión</span>
                  </div>
                  <div class="memory-info-card-content">
                    <p><strong>${metricas.conversion}</strong></p>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${factoresExito.length > 0 ? `
            <h4><i class='bx bx-check-circle'></i> Factores de Éxito</h4>
            <div class="memory-info-card simulation-info-card full-width">
              <div class="memory-info-card-header">
                <i class='bx bx-trophy'></i>
                <span>Elementos Clave para el Éxito</span>
              </div>
              <div class="memory-info-card-content">
                <ul class="simulation-success-factors-list">
                  ${factoresExito.map(factor => {
                    const cleanFactor = typeof factor === 'string' ? factor : JSON.stringify(factor);
                    return `<li>${cleanFactor}</li>`;
                  }).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
          
          ${recomendaciones.length > 0 ? `
            <h4><i class='bx bx-lightbulb'></i> Recomendaciones</h4>
            <div class="memory-info-card simulation-info-card full-width">
              <div class="memory-info-card-header">
                <i class='bx bx-bulb'></i>
                <span>Acciones Recomendadas</span>
              </div>
              <div class="memory-info-card-content">
                <ul class="simulation-recommendations-list">
                  ${recomendaciones.map(rec => {
                    const cleanRec = typeof rec === 'string' ? rec : JSON.stringify(rec);
                    return `<li>${cleanRec}</li>`;
                  }).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
          
          ${riesgos.length > 0 ? `
            <h4><i class='bx bx-error-circle'></i> Riesgos y Desafíos</h4>
            <div class="memory-info-card simulation-info-card full-width">
              <div class="memory-info-card-header">
                <i class='bx bx-shield-x'></i>
                <span>Posibles Obstáculos</span>
              </div>
              <div class="memory-info-card-content">
                <ul class="simulation-recommendations-list">
                  ${riesgos.map(riesgo => {
                    const cleanRiesgo = typeof riesgo === 'string' ? riesgo : JSON.stringify(riesgo);
                    return `<li style="border-left-color: #ef4444;">${cleanRiesgo}</li>`;
                  }).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } 
    else if (memory.isTrendAnalysis && memory.enrichedData && memory.enrichedData.isEnriched) {
      const { theme, popularity, marketingOpportunities, recommendedChannels } = memory.enrichedData;
      
      enrichedSection = `
        <div class="memory-detail-section trend-analysis-details">
          <h3><i class='bx bx-trending-up'></i> Análisis de Tendencia</h3>
          <div class="memory-info-cards">
            <div class="memory-info-card trend-info-card">
              <div class="memory-info-card-header">
                <i class='bx bx-tag'></i>
                <span>Tema Principal</span>
              </div>
              <div class="memory-info-card-content">
                <p><strong>${theme}</strong></p>
              </div>
            </div>
            
            ${popularity > 0 ? `
              <div class="memory-info-card trend-info-card">
                <div class="memory-info-card-header">
                  <i class='bx bx-fire'></i>
                  <span>Popularidad</span>
                </div>
                <div class="memory-info-card-content">
                  <p><strong>${formatPercentage(popularity, 0)}</strong></p>
                </div>
              </div>
            ` : ''}
            
            ${marketingOpportunities.length > 0 ? `
              <div class="memory-info-card trend-info-card full-width">
                <div class="memory-info-card-header">
                  <i class='bx bx-bulb'></i>
                  <span>Oportunidades de Marketing</span>
                </div>
                <div class="memory-info-card-content">
                  <ul class="trend-opportunities-list">
                    ${marketingOpportunities.map(opp => {
                      const cleanOpp = typeof opp === 'string' ? opp : JSON.stringify(opp);
                      return `<li>${cleanOpp}</li>`;
                    }).join('')}
                  </ul>
                </div>
              </div>
            ` : ''}
            
            ${recommendedChannels.length > 0 ? `
              <div class="memory-info-card trend-info-card full-width">
                <div class="memory-info-card-header">
                  <i class='bx bx-share-alt'></i>
                  <span>Canales Recomendados</span>
                </div>
                <div class="memory-info-card-content">
                  <ul class="trend-channels-list">
                    ${recommendedChannels.map(channel => {
                      let channelText = typeof channel === 'string' ? channel : JSON.stringify(channel);
                      channelText = channelText.replace(/^\d+\.\s*/, '').replace(/^"\d+":\s*"/, '').replace(/"$/, '');
                      return `<li>${channelText}</li>`;
                    }).join('')}
                  </ul>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    // Configurar el contenido completo del modal
    detailBody.innerHTML = `
      ${enrichedSection}
      
      <!-- Información principal -->
      <div class="memory-detail-section">
        <h3><i class='bx bx-info-circle'></i> Información del Insight</h3>
        <div class="memory-info-cards">
          <div class="memory-info-card">
            <div class="memory-info-card-header">
              <i class='bx bx-category'></i>
              <span>Tipo</span>
            </div>
            <div class="memory-info-card-content">
              <div class="memory-type-badge ${memory.isScreenSimulation ? 'simulation-type-badge' : memory.isTrendAnalysis ? 'trend-type-badge' : ''}">${formatTypeName(memory.type)}</div>
            </div>
          </div>
          
          <div class="memory-info-card">
            <div class="memory-info-card-header">
              <i class='bx bx-link'></i>
              <span>Fuente</span>
            </div>
            <div class="memory-info-card-content">
              <p>${formatSourceName(memory.source)}</p>
            </div>
          </div>
          
          ${memory.derived_from ? `
            <div class="memory-info-card">
              <div class="memory-info-card-header">
                <i class='bx bx-git-branch'></i>
                <span>Derivado de</span>
              </div>
              <div class="memory-info-card-content">
                <p>${memory.derived_from}</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Métricas -->
      <div class="memory-detail-section">
        <h3><i class='bx bx-trending-up'></i> Métricas del Insight</h3>
        <div class="memory-metrics-grid">
          <div class="memory-metric-card">
            <div class="memory-metric-icon importance-icon">
              <i class='bx bx-star'></i>
            </div>
            <div class="memory-metric-content">
              <div class="memory-metric-value">${formatPercentage(memory.importance, 1)}</div>
              <div class="memory-metric-label">Importancia</div>
              <div class="memory-metric-description">
                ${memory.importance > 0.8 ? 'Crítico para la IA' : 
                  memory.importance > 0.6 ? 'Alta importancia' : 
                  memory.importance > 0.4 ? 'Importancia moderada' : 'Importancia baja'}
              </div>
            </div>
          </div>
          
          ${memory.quality_score > 0 ? `
            <div class="memory-metric-card">
              <div class="memory-metric-icon quality-icon">
                <i class='bx bx-check-circle'></i>
              </div>
              <div class="memory-metric-content">
                <div class="memory-metric-value">${formatPercentage(memory.quality_score, 1)}</div>
                <div class="memory-metric-label">Calidad</div>
                <div class="memory-metric-description">Puntuación de calidad del insight</div>
              </div>
            </div>
          ` : ''}
          
          <div class="memory-metric-card">
            <div class="memory-metric-icon date-icon">
              <i class='bx bx-calendar'></i>
            </div>
            <div class="memory-metric-content">
              <div class="memory-metric-value">${formatRelativeDate(memory.created_at)}</div>
              <div class="memory-metric-label">Antigüedad</div>
              <div class="memory-metric-description">Generado ${formatDate(memory.created_at)}</div>
            </div>
          </div>
        </div>
      </div>
      
      ${Object.keys(memory.additionalInfo).length > 0 ? `
        <div class="memory-detail-section">
          <h3><i class='bx bx-info-square'></i> Información Adicional</h3>
          <div class="memory-additional-info">
            ${Object.entries(memory.additionalInfo).map(([key, value]) => `
              <div class="memory-additional-item">
                <div class="memory-additional-key">${formatFieldName(key)}</div>
                <div class="memory-additional-value">
                  ${typeof value === 'object' ? 
                    `<pre>${JSON.stringify(value, null, 2)}</pre>` : 
                    value}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Contenido técnico completo -->
      <div class="memory-detail-section">
        <h3><i class='bx bx-code-block'></i> Contenido Completo (JSON)</h3>
        <div class="memory-detail-json-viewer">
          <pre><code>${JSON.stringify(memory.originalContent, null, 2)}</code></pre>
        </div>
      </div>
    `;
  }
  
  // 🆕 MEJORADO: Configurar eventos con el sistema de stack
  setupMemoryDetailEvents(detailModal);
  detailModal.classList.add('active');
  
  
  console.log('✅ Modal de detalles mostrado correctamente');
}

function setupMemoryDetailEvents(detailModal) {
  const closeBtn = detailModal.querySelector('.memory-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMemoryDetailModal(detailModal);
    });
  }
  
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      e.stopPropagation();
      closeMemoryDetailModal(detailModal);
    }
  });
  
  const content = detailModal.querySelector('.memory-detail-content');
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
      
      closeMemoryDetailModal(detailModal);
    }
  };
  
  document.addEventListener('keydown', handleDetailEsc, true);
  detailModal._escHandler = handleDetailEsc;
}

function closeMemoryDetailModal(detailModal) {
  if (!detailModal) return;
  
  detailModal.classList.remove('active');
  
  if (detailModal._escHandler) {
    document.removeEventListener('keydown', detailModal._escHandler, true);
    delete detailModal._escHandler;
  }
}

function setupModalHierarchy() {
  if (window._memoryMainEscHandler) {
    document.removeEventListener('keydown', window._memoryMainEscHandler, true);
  }
  
  const handleMainModalEsc = (e) => {
    if (e.key === 'Escape') {
      const memoryDetailModal = document.querySelector('#memoryDetailModal');
      const memoryEditModal = document.querySelector('#memoryEditModal');
      const memoryResetModal = document.querySelector('#memoryResetModal');
      const memoryDeleteModal = document.querySelector('#memoryDeleteModal');
      const memoryModal = document.querySelector('#memoryModal');
      
      if (memoryModal && memoryModal.classList.contains('active')) {
        if ((memoryDetailModal && memoryDetailModal.classList.contains('active')) ||
            (memoryEditModal && memoryEditModal.classList.contains('active')) ||
            (memoryResetModal && memoryResetModal.classList.contains('active')) ||
            (memoryDeleteModal && memoryDeleteModal.classList.contains('active'))) {
          return; // No cerrar modal principal si hay modales secundarias activas
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (window.closeModal && typeof window.closeModal === 'function') {
          window.closeModal(memoryModal);
        } else {
          memoryModal.classList.remove('active');
        }
        
        cleanupModalHierarchy();
      }
    }
  };
  
  window._memoryMainEscHandler = handleMainModalEsc;
  document.addEventListener('keydown', handleMainModalEsc, false);
}

function cleanupModalHierarchy() {
  if (window._memoryMainEscHandler) {
    document.removeEventListener('keydown', window._memoryMainEscHandler, true);
    delete window._memoryMainEscHandler;
  }
}

function showMemoryError(message) {
  const modalBody = document.querySelector('#memoryModal .modal-body');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="memory-loading">
      <i class='bx bx-error-circle' style="font-size: 48px; color: var(--color-error);"></i>
      <p>${message}</p>
    </div>
  `;
}

// 🆕 FUNCIÓN DE RESET PARA MEMORY MODAL
function resetMemoryModalState() {
  console.log('🔄 Reiniciando estado de memory modal...');
  
  // Limpiar variables globales del módulo
  if (typeof memoryData !== 'undefined') {
    memoryData = [];
  }
  if (typeof filteredMemoryData !== 'undefined') {
    filteredMemoryData = [];
  }
  if (typeof currentView !== 'undefined') {
    currentView = 'grid';
  }
  if (typeof currentTypeFilter !== 'undefined') {
    currentTypeFilter = 'all';
  }
  if (typeof currentSourceFilter !== 'undefined') {
    currentSourceFilter = 'all';
  }
  
  console.log('✅ Estado de memory modal reiniciado completamente');
}

// Exponer función globalmente para memory modal
if (typeof window !== 'undefined') {
  window.initMemoryModal = initMemoryModal;
  
  // Actualizar objeto memoryModal
  if (!window.memoryModal) {
    window.memoryModal = {};
  }
  window.memoryModal.reset = resetMemoryModalState;
}