// explainService.js
import { openai } from "../../../lib/openai.js";
import { EXPLAIN_PROMPTS } from '../../../utils/marketing/AcadeliaDNA.js';

export const explainService = {
  /**
   * Genera una explicación de las decisiones y recomendaciones del sistema
   * @param {Object} decisionContext - Contexto de las decisiones tomadas
   * @param {string} level - Nivel de detalle ('basic', 'intermediate', 'technical')
   * @returns {Promise<Object>} - Explicación generada
   */
  async generateExplanation(decisionContext, level = 'intermediate') {
    try {
      const { 
        query, 
        agentsUsed, 
        decisions, 
        savedElements, 
        simulationResults,
        recommendations 
      } = decisionContext;
      
      let systemPrompt = EXPLAIN_PROMPTS[level] || EXPLAIN_PROMPTS.intermediate;

      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          {
            role: "user",
            content: `Explica las siguientes decisiones de marketing para hacer viral al PROFESOR ACADEL:
            Consulta original: ${query}
            Agentes involucrados: ${agentsUsed.join(', ')}
            Elementos guardados: ${JSON.stringify(savedElements)}
            ${simulationResults ? `Resultados de simulación: ${JSON.stringify(simulationResults)}` : ''}
            Decisiones clave: ${summarizeDecisions(decisions)}
            Recomendaciones finales: ${recommendations}
            ENFOQUE: Explica cómo estas decisiones posicionan a Acadel como el chigüire educativo 
            más querido del internet latino y generan conexión auténtica con estudiantes.`
          }
        ],
        temperature: 0.4, // Bajo para maximizar precisión
      });
      
      // Estructurar la respuesta
      return {
        explanation: completion.choices[0].message.content,
        level,
        query,
        timestamp: new Date().toISOString(),
        context: {
          agentsUsed,
          elementsCount: countElements(savedElements),
          decisionTypes: Object.keys(decisions || {})
        }
      };
    } catch (error) {
      console.error("Error generando explicación:", error);
      return {
        explanation: "El Profesor Acadel está teniendo problemas técnicos, pero seguimos trabajando para conectar mejor con estudiantes.",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  /**
   * Genera una visualización del proceso de decisión
   * @param {Object} decisionContext - Contexto de las decisiones
   * @returns {Promise<Object>} - Código de visualización
   */
  async generateDecisionVisualization(decisionContext) {
    try {
      const { agentsUsed, decisions, savedElements } = decisionContext;
      
      const mermaidDiagram = await this.generateMermaidDiagram(agentsUsed, decisions, savedElements);
      
      return {
        visualization: mermaidDiagram,
        format: 'mermaid',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error generando visualización:", error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  /**
   * Genera un diagrama Mermaid para visualizar el proceso de decisión
   * @private
   */
  async generateMermaidDiagram(agentsUsed, decisions, savedElements) {
    let diagram = 'graph TD\n';
    
    // Nodo inicial
    diagram += '  Query[Consulta de Usuario] --> Estratega\n';
    
    // Conexiones entre agentes
    if (agentsUsed.includes('strategist')) {
      diagram += '  Estratega';
      if (agentsUsed.includes('analyst')) diagram += ' --> Analista';
      if (agentsUsed.includes('creative')) diagram += ' --> Creativo';
      if (agentsUsed.includes('profile')) diagram += ' --> Perfiles';
      diagram += '\n';
    }
    
    if (savedElements) {
      if (savedElements.profiles && savedElements.profiles.length > 0) {
        diagram += '  Perfiles --> PerfilesGuardados[Perfiles Guardados: ' + savedElements.profiles.length + ']\n';
      }
      if (savedElements.contents && savedElements.contents.length > 0) {
        diagram += '  Creativo --> ContenidosGuardados[Contenidos Guardados: ' + savedElements.contents.length + ']\n';
      }
      if (savedElements.trends && savedElements.trends.length > 0) {
        diagram += '  Analista --> TendenciasGuardadas[Tendencias Guardadas: ' + savedElements.trends.length + ']\n';
      }
      if (savedElements.insights && savedElements.insights.length > 0) {
        diagram += '  Estratega --> InsightsGuardados[Insights Guardados: ' + savedElements.insights.length + ']\n';
      }
    }
    
    if (decisions) {
      let decisionIdx = 0;
      for (const [tool, instances] of Object.entries(decisions)) {
        if (instances && instances.length > 0) {
          // Limitar a algunas decisiones clave para no sobrecargar el diagrama
          const limitedInstances = instances.slice(0, 2);
          for (const instance of limitedInstances) {
            if (instance.agent) {
              const agentName = mapAgentToSpanish(instance.agent);
              diagram += `  ${agentName} --> Decision${decisionIdx}["${tool}: ${summarizeToolInput(instance.input)}"]\n`;
              decisionIdx++;
            }
          }
        }
      }
    }
    
    // Nodo final
    diagram += '  Estratega --> Respuesta[Respuesta Final]\n';
    
    return diagram;
  }
};

// Funciones auxiliares
function summarizeDecisions(decisions) {
  if (!decisions) return "No hay información sobre decisiones";
  
  return Object.entries(decisions)
    .map(([tool, instances]) => {
      if (!instances || instances.length === 0) return "";
      
      return `${tool}: ${instances.length} usos`;
    })
    .filter(text => text.length > 0)
    .join(', ');
}

function countElements(savedElements) {
  if (!savedElements) return 0;
  
  let count = 0;
  if (savedElements.profiles) count += savedElements.profiles.length;
  if (savedElements.contents) count += savedElements.contents.length;
  if (savedElements.trends) count += savedElements.trends.length;
  if (savedElements.insights) count += savedElements.insights.length;
  
  return count;
}

function summarizeToolInput(toolInput) {
  if (!toolInput) return "Sin detalles";
  
  if (typeof toolInput === 'string') {
    return toolInput.length > 20 ? toolInput.substring(0, 20) + '...' : toolInput;
  }
  
  if (typeof toolInput === 'object') {
    if (toolInput.query) return `Búsqueda: ${toolInput.query.substring(0, 15)}...`;
    if (toolInput.profileId) return `Perfil: ${toolInput.profileId.substring(0, 10)}...`;
    if (toolInput.contentId) return `Contenido: ${toolInput.contentId.substring(0, 10)}...`;
    if (toolInput.type) return `Tipo: ${toolInput.type}`;
    
    return "Datos complejos";
  }
  
  return "Datos no reconocidos";
}

function mapAgentToSpanish(agent) {
  const mapping = {
    'strategist': 'Estratega',
    'analyst': 'Analista',
    'creative': 'Creativo',
    'profile': 'Perfiles'
  };
  
  return mapping[agent] || agent;
}