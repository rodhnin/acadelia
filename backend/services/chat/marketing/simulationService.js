import { contentService } from "./contentService.js";
import { profileService } from "./profileService.js";
import { openai } from "../../../lib/openai.js";
import { memoryService } from "./memoryService.js";
import pool from "../../../lib/dbPool.js";
import { EXPLAIN_PROMPTS } from '../../../utils/marketing/AcadeliaDNA.js';

export const simulationService = {
  async simulateCampaignResults(campaignData, audienceData) {
    try {
      // 1. Buscar campañas históricas similares
      const similarCampaigns = await contentService.findSimilarContents({
        type: campaignData.type,
        channel: campaignData.channel,
        description: JSON.stringify(campaignData)
      }, 5);
      
      // 2. Buscar perfiles similares al público objetivo
      const similarProfiles = await profileService.findSimilarProfiles(audienceData, 5);
      
      // 3. Buscar interacciones históricas relevantes
      const interactionsQuery = `
        SELECT 
          i.action, 
          COUNT(*) as count, 
          AVG(CASE WHEN i.action = 'clicked' THEN 1.0 ELSE 0.0 END) as click_rate,
          AVG(CASE WHEN i.action = 'shared' THEN 1.0 ELSE 0.0 END) as share_rate,
          AVG(CASE WHEN i.action = 'purchased' THEN 1.0 ELSE 0.0 END) as conversion_rate
        FROM marketing_interactions i
        JOIN marketing_contents c ON i.content_id = c.id
        WHERE c.type = $1 AND c.channel = $2
        GROUP BY i.action
      `;
      
      const interactionsResult = await pool.query(interactionsQuery, [
        campaignData.type,
        campaignData.channel
      ]);
      
      // 4. Compilar datos para simulación
      const simulationData = {
        campaign: campaignData,
        audience: audienceData,
        historicalCampaigns: similarCampaigns.success ? similarCampaigns.contents : [],
        similarProfiles: similarProfiles.success ? similarProfiles.profiles : [],
        historicalInteractions: interactionsResult.rows
      };
      
      // 5. Usar IA para simular resultados
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { 
            role: "system", 
            content: `${EXPLAIN_PROMPTS}
            
            Tus predicciones deben incluir:
            1. Métricas clave (CTR, tasa de conversión, engagement)
            2. Nivel de confianza en la predicción (0-100%)
            3. Factores que más influirían en el éxito
            4. Posibles riesgos o desafíos
            5. Recomendaciones para optimizar resultados
            
            Formatea tu respuesta como un objeto JSON válido.` 
          },
          { 
            role: "user", 
            content: `Simula los resultados de esta campaña de marketing educativo:
            ${JSON.stringify(simulationData, null, 2)}` 
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      
      // 6. Parsear y devolver resultados
      const simulationResults = JSON.parse(completion.choices[0].message.content);
      
      // 7. Guardar simulación en memoria
      await memoryService.saveToMemory({
        type: "campaign_simulation",
        content: {
          simulationData,
          results: simulationResults,
          timestamp: new Date().toISOString()
        },
        source: "simulation_engine",
        importance: 0.7
      });
      
      return {
        success: true,
        results: simulationResults,
        confidence: simulationResults.confidence || 0,
        metrics: simulationResults.metrics || {},
        recommendations: simulationResults.recommendations || []
      };
    } catch (error) {
      console.error("Error en simulación de campaña:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};