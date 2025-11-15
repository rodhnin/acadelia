// explainComponent.js - VERSIÓN LIMPIA SIN CORRECCIÓN DE NEGRITA
import { getDecisionVisualization, getExplanation } from '../api/marketingAPI.js';

// ✨ IMPORTAR SOLO FUNCIONES CENTRALIZADAS
import { renderMarkdownComplete, processSpecialElements } from '../utils/markdownParser.js';

// ✨ FUNCIÓN DE LIMPIEZA BÁSICA - SIN CORRECCIÓN DE NEGRITA
function preCleanMarkdownContent(content) {
  if (!content || typeof content !== 'string') {
    return content || '';
  }
  
  // Solo limpieza básica de saltos de línea y espacios
  let cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
  
  return cleaned;
}

/**
 * Crea un componente de explicabilidad usando el Sistema Unificado de Mermaid
 */
export function createExplainComponent(explanation, agentsUsed = [], agentSelection = null) {
  const container = document.createElement('div');
  container.className = 'explanation-container';
  
  const header = document.createElement('div');
  header.className = 'explanation-header';
  header.innerHTML = `
    <h3><i class='bx bx-brain'></i> Proceso de Decisión IA</h3>
    <div class="explanation-controls">
      <button class="explain-level-btn" data-level="basic">Simplificado</button>
      <button class="explain-level-btn active" data-level="intermediate">Estándar</button>
      <button class="explain-level-btn" data-level="technical">Técnico</button>
    </div>
  `;
  container.appendChild(header);
  
  // Sección de agentes utilizados
  const agentsSection = createAgentsSection(agentSelection, agentsUsed);
  container.appendChild(agentsSection);
  
  // Contenido de la explicación
  const content = createExplanationContent(explanation);
  container.appendChild(content);
  
  // Sección de visualización
  const visualizationContainer = createVisualizationSection(explanation, agentsUsed);
  container.appendChild(visualizationContainer);
  
  setupInteractivityUnified(container, explanation);
  
  return container;
}

function createAgentsSection(agentSelection, agentsUsed) {
  const agentsSection = document.createElement('div');
  agentsSection.className = 'agents-used-section';
  
  const agentNames = {
    'strategist': 'Estratega',
    'analyst': 'Analista de Datos',
    'creative': 'Creativo',
    'profile': 'Especialista en Perfiles'
  };
  
  if (agentSelection && typeof agentSelection === 'object') {
    agentsSection.innerHTML = `
      <div class="agents-header">
        <h4>Agentes Involucrados</h4>
        <span class="tooltip-trigger" data-tooltip="El Director determina qué agentes especializados se necesitan para cada consulta">
          <i class='bx bx-info-circle'></i>
        </span>
      </div>
      <div class="agents-container">
        ${Object.entries(agentSelection)
          .filter(([key, value]) => key !== 'reasoning' && typeof value === 'boolean')
          .map(([agent, used]) => `
            <div class="agent-badge ${used ? 'active' : 'inactive'}" data-agent="${agent}">
              <i class='bx ${getAgentIcon(agent)}'></i>
              <span>${agentNames[agent] || agent}</span>
              ${used ? '<i class="bx bx-check"></i>' : '<i class="bx bx-x"></i>'}
            </div>
          `).join('')}
      </div>
      ${agentSelection.reasoning ? `<div class="agent-reasoning">${agentSelection.reasoning}</div>` : ''}
    `;
  } else if (agentsUsed && Array.isArray(agentsUsed) && agentsUsed.length > 0) {
    agentsSection.innerHTML = `
      <div class="agents-header">
        <h4>Agentes Involucrados</h4>
        <span class="tooltip-trigger" data-tooltip="Estos agentes especializados trabajaron en tu consulta">
          <i class='bx bx-info-circle'></i>
        </span>
      </div>
      <div class="agents-container">
        ${agentsUsed.map(agent => `
          <div class="agent-badge active" data-agent="${agent}">
            <i class='bx ${getAgentIcon(agent)}'></i>
            <span>${agentNames[agent] || agent}</span>
            <i class="bx bx-check"></i>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    agentsSection.innerHTML = `
      <div class="agents-header">
        <h4>Agentes Involucrados</h4>
      </div>
      <div class="agents-container">
        <div class="agent-badge active" data-agent="strategist">
          <i class='bx ${getAgentIcon('strategist')}'></i>
          <span>${agentNames['strategist']}</span>
          <i class="bx bx-check"></i>
        </div>
      </div>
      <div class="agent-reasoning">Procesado por el agente estratega principal.</div>
    `;
  }
  
  return agentsSection;
}

/**
 * Crear contenido de explicación - LA CORRECCIÓN DE NEGRITA SE HACE EN markdownParser.js
 */
function createExplanationContent(explanation) {
  const content = document.createElement('div');
  content.className = 'explanation-content';
  
  if (explanation && explanation.explanation) {
    // Solo limpieza básica, la corrección de negrita se hace en markdownParser.js
    const cleanedExplanation = preCleanMarkdownContent(explanation.explanation);
    
    const explanationHtml = renderMarkdownComplete(cleanedExplanation);
    content.innerHTML = explanationHtml;
  } else {
    content.innerHTML = `
      <div class="explanation-placeholder">
        <p>El sistema procesó tu consulta utilizando agentes especializados en marketing educativo. Cada agente aporta su experiencia para generar una respuesta completa y precisa.</p>
      </div>
    `;
  }
  
  return content;
}

function createVisualizationSection(explanation, agentsUsed) {
  const visualizationContainer = document.createElement('div');
  visualizationContainer.className = 'visualization-container';
  
  const actualAgentsUsed = agentsUsed && Array.isArray(agentsUsed) ? agentsUsed : ['strategist'];
  const mermaidCode = generateMermaidCode(explanation, actualAgentsUsed);
  
  visualizationContainer.innerHTML = `
    <button class="visualization-toggle" data-diagram-type="flow">
      <i class='bx bx-network-chart'></i> Ver Diagrama de Decisión
    </button>
    <div class="mermaid-container" style="display: none;" data-diagram-type="flow">
      <div class="mermaid">${mermaidCode}</div>
    </div>
  `;
  
  return visualizationContainer;
}

function generateMermaidCode(explanation, actualAgentsUsed) {
  const queryText = explanation && explanation.query 
    ? explanation.query.substring(0, 25) + (explanation.query.length > 25 ? '...' : '') 
    : 'Consulta de Usuario';
    
  return `graph TD
  Query["📝 ${queryText}"] --> Router{🎯 Director}
  
  ${actualAgentsUsed.includes('strategist') ? 'Router --> Strategy[📋 Estratega]' : ''}
  ${actualAgentsUsed.includes('analyst') ? 'Router --> Analysis[📊 Analista]' : ''}
  ${actualAgentsUsed.includes('creative') ? 'Router --> Creative[🎨 Creativo]' : ''}
  ${actualAgentsUsed.includes('profile') ? 'Router --> Profile[👤 Perfiles]' : ''}
  
  ${actualAgentsUsed.includes('strategist') ? 'Strategy --> Response[📤 Respuesta]' : ''}
  ${actualAgentsUsed.includes('analyst') ? 'Analysis --> Response' : ''}
  ${actualAgentsUsed.includes('creative') ? 'Creative --> Response' : ''}
  ${actualAgentsUsed.includes('profile') ? 'Profile --> Response' : ''}
  
  Response --> Explain[💡 Explicación]
  
  style Query fill:#e3f2fd
  style Response fill:#e8f5e8
  style Explain fill:#f3e5f5
  style Router fill:#fff3e0`;
}

function setupInteractivityUnified(container, explanation) {
  const levelButtons = container.querySelectorAll('.explain-level-btn');
  levelButtons.forEach(button => {
    button.addEventListener('click', async () => {
      levelButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const level = button.getAttribute('data-level');
      
      if (explanation && explanation.query) {
        const content = container.querySelector('.explanation-content');
        content.innerHTML = '<div class="loading-indicator">Actualizando explicación...</div>';
        
        try {
          const newExplanation = await getExplanation(explanation.query, level);
          
          if (newExplanation && newExplanation.explanation) {
            const cleanedExplanation = preCleanMarkdownContent(newExplanation.explanation);
            const explanationHtml = renderMarkdownComplete(cleanedExplanation);
            content.innerHTML = explanationHtml;
            processSpecialElements(content);
          } else {
            content.innerHTML = `<div class="explanation-text">No se pudo obtener la explicación en nivel "${level}".</div>`;
          }
        } catch (error) {
          content.innerHTML = `<div class="explanation-text error">Error al cambiar nivel de explicación: ${error.message}</div>`;
        }
      }
    });
  });
  
  setupVisualizationToggleUnified(container, explanation);
}

function setupVisualizationToggleUnified(container, explanation) {
  const visualizationToggle = container.querySelector('.visualization-toggle');
  const mermaidContainer = container.querySelector('.mermaid-container');
  const mermaidElement = container.querySelector('.mermaid');
  const diagramType = visualizationToggle.getAttribute('data-diagram-type');
  
  if (visualizationToggle.hasAttribute('data-listener-attached')) {
    return;
  }
  visualizationToggle.setAttribute('data-listener-attached', 'true');
  
  visualizationToggle.addEventListener('click', async () => {
    const isVisible = mermaidContainer.style.display !== 'none';
    
    if (isVisible) {
      mermaidContainer.style.display = 'none';
      const buttonText = diagramType === 'pie' ? 'Ver Distribución de Participación' : 'Ver Diagrama de Decisión';
      const iconClass = diagramType === 'pie' ? 'bx-pie-chart-alt' : 'bx-network-chart';
      visualizationToggle.innerHTML = `<i class="bx ${iconClass}"></i> ${buttonText}`;
      return;
    }
    
    mermaidContainer.style.display = 'block';
    const buttonText = diagramType === 'pie' ? 'Ocultar Gráfico' : 'Ocultar Diagrama';
    visualizationToggle.innerHTML = `<i class="bx bx-collapse"></i> ${buttonText}`;
    
    await processDiagramWithUnifiedSystem(mermaidElement, explanation);
  });
}

async function processDiagramWithUnifiedSystem(mermaidElement, explanation) {
  try {
    if (!window.mermaidManager || !window.mermaidManager.isInitialized) {
      mermaidElement.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <i class="bx bx-loader-alt bx-spin" style="font-size: 2rem;"></i>
          <div style="margin-top: 0.5rem;">Inicializando sistema de diagramas...</div>
        </div>
      `;
      
      setTimeout(async () => {
        if (window.mermaidManager && window.mermaidManager.isInitialized) {
          await processDiagramWithUnifiedSystem(mermaidElement, explanation);
        } else {
          showDiagramError(mermaidElement, 'Sistema de diagramas no disponible');
        }
      }, 1000);
      
      return;
    }
    
    if (mermaidElement.getAttribute('data-processed') === 'true' && 
        mermaidElement.querySelector('svg')) {
      return;
    }
    
    if (explanation && explanation.query) {
      try {
        const visualization = await getDecisionVisualization(explanation.query);
        if (visualization && visualization.mermaidDiagram) {
          mermaidElement.innerHTML = visualization.mermaidDiagram;
        }
      } catch (apiError) {
      }
    }
    
    await window.mermaidManager.processContainer(mermaidElement.parentElement);
    
  } catch (error) {
    showDiagramError(mermaidElement, error.message);
  }
}

function showDiagramError(mermaidElement, message) {
  mermaidElement.innerHTML = `
    <div style="text-align: center; padding: 1.5rem; background: #fee; color: #c33; border-radius: 6px; border: 1px solid #fcc;">
      <i class="bx bx-error" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
      <div style="font-weight: 500; margin-bottom: 0.5rem;">Error al generar diagrama</div>
      <div style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">
        ${message || 'Error al generar el diagrama'}
      </div>
      <button onclick="window.retryExplainComponentDiagram && window.retryExplainComponentDiagram(this)" 
              style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
        <i class="bx bx-refresh"></i> Reintentar
      </button>
    </div>
  `;
  
  mermaidElement.setAttribute('data-error', 'true');
}

window.retryExplainComponentDiagram = function(buttonElement) {
  const mermaidElement = buttonElement.closest('.mermaid');
  if (!mermaidElement) return;
  
  mermaidElement.removeAttribute('data-error');
  mermaidElement.removeAttribute('data-processed');
  
  processDiagramWithUnifiedSystem(mermaidElement, null);
};

function getAgentIcon(agent) {
  switch (agent) {
    case 'strategist': return 'bx-compass';
    case 'analyst': return 'bx-bar-chart-alt-2';
    case 'creative': return 'bx-palette';
    case 'profile': return 'bx-user-voice';
    default: return 'bx-bot';
  }
}

export function integrateExplainComponent(responseData, query, chatElement) {
  if (!responseData || !chatElement) {
    return null;
  }
  
  let explanation = null;
  let agentsUsed = [];
  let agentSelection = null;
  
  if (responseData.explanation) {
    explanation = responseData.explanation;
    if (!explanation.query) {
      explanation.query = query;
    }
  } else {
    explanation = {
      explanation: "El sistema procesó tu consulta utilizando agentes especializados en marketing educativo.",
      query: query,
      level: 'intermediate'
    };
  }
  
  if (responseData.agentsUsed && Array.isArray(responseData.agentsUsed)) {
    agentsUsed = responseData.agentsUsed;
  } else if (responseData['agents Used'] && Array.isArray(responseData['agents Used'])) {
    agentsUsed = responseData['agents Used'];
  } else if (responseData.agentsUsed && typeof responseData.agentsUsed === 'string') {
    try {
      agentsUsed = JSON.parse(responseData.agentsUsed);
    } catch (e) {
      agentsUsed = [responseData.agentsUsed];
    }
  }
  
  if (responseData.agentSelection) {
    agentSelection = responseData.agentSelection;
  }
  
  if (!explanation && agentsUsed.length === 0 && !agentSelection) {
    agentsUsed = ['strategist'];
    explanation = {
      explanation: "Tu consulta fue procesada por el sistema de agentes especializados de Acadelia.",
      query: query,
      level: 'intermediate'
    };
  }
  
  const explainComponent = createExplainComponent(explanation, agentsUsed, agentSelection);
  
  const messageContent = chatElement.querySelector('.message-content');
  if (messageContent) {
    const separator = document.createElement('div');
    separator.className = 'explanation-separator';
    separator.style.cssText = `
      margin: 20px 0 15px 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(164, 172, 134, 0.3), transparent);
    `;
    messageContent.appendChild(separator);
    messageContent.appendChild(explainComponent);
    processSpecialElements(explainComponent);
  } else {
    chatElement.appendChild(explainComponent);
    processSpecialElements(explainComponent);
  }
  
  setTimeout(async () => {
    if (window.mermaidManager && window.mermaidManager.isInitialized) {
      await window.mermaidManager.processContainer(explainComponent);
    }
    
    if (typeof window.ensureScrollToBottom === 'function') {
      window.ensureScrollToBottom();
    }
  }, 200);
  
  return explainComponent;
}

window.integrateExplainComponent = integrateExplainComponent;