// directorAgent.js
import { openai } from "../../../lib/openai.js";
import { DIRECTOR_ENHANCED_PROMPT } from '../../../utils/marketing/AcadeliaDNA.js';

/**
 * Agente Director para determinar qué agentes específicos se necesitan para cada consulta
 * Este enfoque utiliza un modelo más pequeño y ligero para analizar rápidamente la consulta
 * y determinar qué agentes especialistas deben ser invocados.
 */
export const directorAgent = {
  /**
   * Analiza una consulta y determina qué agentes especialistas necesitan ser invocados
   * @param {string} query - Consulta del usuario
   * @returns {Promise<Object>} - Decisión sobre qué agentes utilizar
   */
  async determineRequiredAgents(query) {
    try {
      console.log("Director evaluando consulta:", query);
      
      // Para consultas muy cortas o simples, podemos usar reglas básicas sin llamar a la API
      if (query.length < 20) {
        return this.determineAgentsWithRules(query);
      }
      
      // Usar un modelo más pequeño y económico para esta decisión inicial
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18", // O un modelo todavía más simple si está disponible
        messages: [
          {
            role: "system",
            content: `${DIRECTOR_ENHANCED_PROMPT}
            
            Los agentes disponibles son:
            1. ESTRATEGA: Siempre requerido. Planifica estrategias, identifica oportunidades y coordina recursos.
            2. ANALISTA: Para análisis de datos, métricas, estadísticas, tendencias y simulaciones.
            3. CREATIVO: Para ideas de contenido, campañas, memes, posts, emails, mensajes.
            4. PERFILES: Para análisis de audiencias, segmentos, perfiles de estudiantes.
            
            Responde ÚNICAMENTE con un objeto JSON que contenga:
            {
              "strategist": true,  // Siempre debe ser true
              "analyst": true/false,
              "creative": true/false,
              "profile": true/false,
              "reasoning": "Breve explicación de tu decisión (1-2 frases)"
            }`
          },
          {
            role: "user",
            content: `Determina qué agentes se requieren para responder a esta consulta: "${query}"`
          }
        ],
        temperature: 0.1, // Muy bajo para maximizar consistencia en decisiones
        response_format: { type: "json_object" }
      });
      
      // Extraer resultado
      const decision = JSON.parse(completion.choices[0].message.content);
      
      // Asegurar que strategist siempre es true (medida de seguridad)
      decision.strategist = true;
      
      // Registrar decisión
      console.log("Decisión del director:", decision);
      
      return decision;
    } catch (error) {
      console.error("Error en director determinando agentes:", error);
      
      // En caso de error, devolver una config por defecto con todos los agentes
      // Esto asegura que el sistema siga funcionando incluso si falla esta optimización
      return {
        strategist: true,
        analyst: true,
        creative: true,
        profile: true,
        reasoning: "Configuración por defecto debido a error en determinación",
        error: error.message
      };
    }
  },
  
  /**
   * Determina los agentes requeridos basado en reglas simples (sin llamada a API)
   * @private
   */
  determineAgentsWithRules(query) {
    const lowerQuery = query.toLowerCase();
    
    // Reglas para el analista
    const needsAnalyst = lowerQuery.includes("análisis") || 
                         lowerQuery.includes("datos") ||
                         lowerQuery.includes("tendencia") ||
                         lowerQuery.includes("estadística") ||
                         lowerQuery.includes("métrica") ||
                         lowerQuery.includes("simula");
                         
    // Reglas para el creativo                     
    const needsCreative = lowerQuery.includes("campaña") || 
                          lowerQuery.includes("contenido") ||
                          lowerQuery.includes("idea") ||
                          lowerQuery.includes("meme") ||
                          lowerQuery.includes("post") ||
                          lowerQuery.includes("email") ||
                          lowerQuery.includes("correo") ||
                          lowerQuery.includes("mensaje");
                            
    // Reglas para el de perfiles
    const needsProfile = lowerQuery.includes("perfil") || 
                         lowerQuery.includes("audiencia") ||
                         lowerQuery.includes("segmento") ||
                         lowerQuery.includes("estudiante") ||
                         lowerQuery.includes("alumno") ||
                         lowerQuery.includes("carrera");
    
    return {
      strategist: true, // Siempre requerido
      analyst: needsAnalyst,
      creative: needsCreative,
      profile: needsProfile,
      reasoning: "Determinado por reglas básicas de palabras clave"
    };
  }
};