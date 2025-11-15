// toolsService.js - VERSIÓN ACTUALIZADA CON NUEVAS IMPORTACIONES
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { sanitizeMarketingContent, isBackupContent, hasErrorRecovery } from '../../../utils/jsonSanitizer.js';
import { profileService } from "./profileService.js";
import { contentService } from "./contentService.js";
import { memoryService } from "./memoryService.js";
import { marketingService } from "../marketingService.js";
import { matchingService } from "./matchingService.js";
import { simulationService } from "./simulationService.js";
import { openai } from "../../../lib/openai.js";
import pool from "../../../lib/dbPool.js";
import { TOOL_PROMPTS } from '../../../utils/marketing/AcadeliaDNA.js';
import UniquenessMiddleware from "./uniquenessMiddleware.js";

/**
 * ✅ FUNCIÓN DE EXTRACCIÓN SIN CAMBIOS
 */
export async function extractProfileDataFromQuery(query) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { 
          role: "system", 
          content: "Extrae información estructurada de perfiles estudiantiles. Devuelve SOLO un objeto JSON con los campos detectados sin explicaciones adicionales."
        },
        { 
          role: "user", 
          content: `Extrae los siguientes campos si están presentes en el texto: nombre, edad, carrera, ciudad/ubicación, personalidad, hobbies, actitud académica, conducta digital, redes sociales, objetivo profesional. Si no hay información para algún campo, omítelo.\n\nTexto: ${query}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const extractedData = JSON.parse(completion.choices[0].message.content);
    
    const normalizedData = {};
    
    if (extractedData.nombre) normalizedData.nombre = extractedData.nombre;
    if (extractedData.edad) normalizedData.edad = parseInt(extractedData.edad);
    if (extractedData.carrera) normalizedData.carrera = extractedData.carrera;
    
    if (extractedData.ciudad) normalizedData.ciudad = extractedData.ciudad;
    else if (extractedData.ubicacion) normalizedData.ciudad = extractedData.ubicacion;
    
    if (extractedData.personalidad) normalizedData.personalidad = extractedData.personalidad;
    
    if (extractedData.hobbies) {
      if (Array.isArray(extractedData.hobbies)) {
        normalizedData.hobbies = extractedData.hobbies;
      } else if (typeof extractedData.hobbies === 'string') {
        normalizedData.hobbies = extractedData.hobbies.split(/,|\sy\s/).map(h => h.trim()).filter(h => h.length > 0);
      }
    }
    
    if (extractedData.actitud_academica) normalizedData.actitud_academica = extractedData.actitud_academica;
    if (extractedData.conducta_digital) normalizedData.conducta_digital = extractedData.conducta_digital;
    
    if (extractedData.redes_sociales) {
      if (Array.isArray(extractedData.redes_sociales)) {
        normalizedData.red_social_favorita = extractedData.redes_sociales;
      } else if (typeof extractedData.redes_sociales === 'string') {
        normalizedData.red_social_favorita = extractedData.redes_sociales.split(/,|\sy\s/).map(r => r.trim()).filter(r => r.length > 0);
      }
    }
    
    if (extractedData.objetivo_profesional) normalizedData.objetivo_profesional = extractedData.objetivo_profesional;
    
    return normalizedData;
  } catch (error) {
    console.error("Error extrayendo datos del query:", error);
    return {};
  }
}

const sessionTracker = {
  processedProfiles: new Set(),
  processedContents: new Set(),
  processedTrends: new Set(),
  processedInsights: new Set(),
  
  reset: function() {
    this.processedProfiles.clear();
    this.processedContents.clear();
    this.processedTrends.clear();
    this.processedInsights.clear();
    console.log("Rastreador de sesión reiniciado");
  }
};

let memoryInsightCounter = 0;

export function resetSessionTracker() {
  sessionTracker.reset();
  memoryInsightCounter = 0;
  console.log("Rastreador de sesión y contador de insights reiniciados");
}

// ============== HERRAMIENTAS COMPARTIDAS SIN CAMBIOS ==============

const profileSearchTool = tool(
  async ({ query, limit = 5 }) => {
    try {
      console.log("🔍 Búsqueda de perfiles con análisis mejorado");
      
      const initialResult = await profileService.findSimilarProfiles(
        { description: query },
        limit * 2
      );
      
      if (!initialResult.success) {
        throw new Error(`Error buscando perfiles: ${initialResult.error}`);
      }
      
      if (!initialResult.profiles || initialResult.profiles.length === 0) {
        return JSON.stringify([]);
      }
      
      const profileData = await extractProfileDataFromQuery(query);
      console.log("Datos extraídos del query:", JSON.stringify(profileData, null, 2));
      
      const enrichedResults = initialResult.profiles.map(profile => ({
        id: profile.id,
        metadata: profile.metadata,
        similarity: profile.similarity,
        created_at: profile.created_at
      }));
      
      console.log(`Devolviendo ${enrichedResults.length} perfiles encontrados`);
      
      return JSON.stringify(enrichedResults.slice(0, limit));
    } catch (error) {
      console.error("Error en búsqueda de perfiles:", error);
      throw new Error(`Error buscando perfiles: ${error.message}`);
    }
  },
  {
    name: "profileSearch",
    description: TOOL_PROMPTS.profileSearch,
    schema: z.object({
      query: z.string().describe("Descripción del perfil a buscar"),
      limit: z.number().optional().describe("Número máximo de resultados")
    })
  }
);

const contentSearchTool = tool(
  async ({ query, type = null, channel = null, limit = 5 }) => {
    try {
      console.log("🔍 Búsqueda de contenido con análisis semántico");
      
      const searchParams = {
        description: query,
        type,
        channel
      };
      
      const initialResult = await contentService.findSimilarContents(searchParams, limit * 2);
      
      if (!initialResult.success) {
        throw new Error(`Error buscando contenidos: ${initialResult.error}`);
      }
      
      if (!initialResult.contents || initialResult.contents.length === 0) {
        return JSON.stringify([]);
      }
      
      const enhancedResults = await Promise.all(initialResult.contents.map(async (content) => {
        try {
          return {
            id: content.id,
            type: content.type,
            channel: content.channel,
            payload: content.payload,
            similarity: content.similarity,
            created_at: content.created_at,
            has_contextual_differences: false, // Simplificado
            key_similarities: []
          };
        } catch (error) {
          console.error(`Error analizando contenido ${content.id}:`, error);
          return {
            id: content.id,
            type: content.type,
            channel: content.channel,
            payload: content.payload,
            similarity: content.similarity,
            created_at: content.created_at,
            errorInAnalysis: true
          };
        }
      }));
      
      console.log(`Devolviendo ${enhancedResults.length} contenidos encontrados`);
      
      return JSON.stringify(enhancedResults.slice(0, limit));
    } catch (error) {
      console.error("Error en búsqueda de contenidos:", error);
      throw new Error(`Error buscando contenidos: ${error.message}`);
    }
  },
  {
    name: "contentSearch",
    description: TOOL_PROMPTS.contentSearch,
    schema: z.object({
      query: z.string().describe("Descripción del contenido a buscar"),
      type: z.string().optional().describe("Tipo de contenido"),
      channel: z.string().optional().describe("Canal de contenido"),
      limit: z.number().optional().describe("Número máximo de resultados")
    })
  }
);

const memorySearchTool = tool(
  async ({ query, type, limit = 5 }) => {
    const result = await memoryService.searchMemory(query, type, limit);
    
    if (!result.success) {
      throw new Error(`Error buscando en memoria: ${result.error}`);
    }
    
    return JSON.stringify(result.memories);
  },
  {
    name: "memorySearch",
    description: TOOL_PROMPTS.memorySearch,
    schema: z.object({
      query: z.string().describe("Texto a buscar en memoria"),
      type: z.string().optional().describe("Tipo específico de memoria a buscar"),
      limit: z.number().optional().describe("Número máximo de resultados")
    })
  }
);

const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    const search = new DuckDuckGoSearch({ maxResults });
    return await search.invoke(query);
  },
  {
    name: "webSearchTool", 
    description: TOOL_PROMPTS.webSearchTool,
    schema: z.object({
      query: z.string().describe("Términos de búsqueda para trends y cultura estudiantil"),
      maxResults: z.number().optional().describe("Número máximo de resultados")
    })
  }
);

const profileToContentMatchTool = tool(
  async ({ profileId, contentType = null, limit = 5 }) => {
    try {
      console.log(`Buscando contenido relevante para perfil ${profileId}`);
      
      if (!profileId) {
        throw new Error("ID de perfil requerido");
      }
      
      const result = await matchingService.matchProfileToContent(profileId, contentType, limit);
      
      if (!result.success) {
        throw new Error(`Error en matching: ${result.error}`);
      }
      
      return JSON.stringify({
        success: true,
        matches: result.matches,
        profile: result.profile
      });
    } catch (error) {
      console.error("Error en profileToContentMatchTool:", error);
      throw new Error(`Error encontrando contenido para el perfil: ${error.message}`);
    }
  },
  {
    name: "profileToContentMatch",
    description: TOOL_PROMPTS.profileToContentMatch,
    schema: z.object({
      profileId: z.string().describe("ID del perfil para el que buscar contenido relevante"),
      contentType: z.string().optional().describe("Tipo específico de contenido a buscar (opcional)"),
      limit: z.number().optional().describe("Número máximo de resultados a devolver")
    })
  }
);

const contentToProfilesMatchTool = tool(
  async ({ contentId, limit = 5 }) => {
    try {
      console.log(`Buscando perfiles relevantes para contenido ${contentId}`);
      
      if (!contentId) {
        throw new Error("ID de contenido requerido");
      }
      
      const result = await matchingService.matchContentToProfiles(contentId, limit);
      
      if (!result.success) {
        throw new Error(`Error en matching: ${result.error}`);
      }
      
      return JSON.stringify({
        success: true,
        matches: result.matches,
        content: result.content
      });
    } catch (error) {
      console.error("Error en contentToProfilesMatchTool:", error);
      throw new Error(`Error encontrando perfiles para el contenido: ${error.message}`);
    }
  },
  {
    name: "contentToProfilesMatch",
    description: TOOL_PROMPTS.contentToProfilesMatch,
    schema: z.object({
      contentId: z.string().describe("ID del contenido para el que buscar perfiles relevantes"),
      limit: z.number().optional().describe("Número máximo de resultados a devolver")
    })
  }
);

// ============== HERRAMIENTAS ESPECÍFICAS CON SISTEMA INTELIGENTE ==============

const strategistMemorySaveTool = tool(
  async ({ type, content, source, importance }) => {
    try {
      console.log("🧠 STRATEGIST: Iniciando guardado de insight con Sistema Inteligente de Embeddings...");
      
      if (hasErrorRecovery(content) || isBackupContent(content)) {
        console.log("🚫 STRATEGIST: Memoria con error_recovery detectado");
        return JSON.stringify({
          success: true,
          message: "Memoria no guardada: contiene datos de recuperación de errores",
          skipped: true,
          reason: "error_recovery_detected"
        });
      }
      
      if (memoryInsightCounter >= 2 && source !== "final_insight") {
        console.log(`STRATEGIST: Ya se han guardado ${memoryInsightCounter} insights estratégicos. Límite alcanzado.`);
        return JSON.stringify({
          success: true,
          message: "STRATEGIST: Límite de insights estratégicos alcanzado",
          skipped: true,
          delegation_note: "Los agentes especializados manejarán el guardado específico"
        });
      }
      
      const strategicTypes = ['strategic_insight', 'campaign_strategy', 'viral_opportunity', 'market_analysis'];
      if (!strategicTypes.includes(type)) {
        console.log(`STRATEGIST: Tipo ${type} debe ser manejado por agente especializado`);
        return JSON.stringify({
          success: true,
          message: `STRATEGIST: Tipo ${type} delegado a agente especializado`,
          skipped: true,
          delegation_note: `Agente especializado manejará guardado de tipo ${type}`
        });
      }

      console.log("🔍 STRATEGIST: Verificando unicidad con Sistema Inteligente...");
      
      const verification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: type,
        content: content
      });
      
      if (!verification.success && !verification.shouldFuse) {
        console.log("🚫 STRATEGIST: Insight duplicado detectado por Sistema Inteligente");
        console.log(`📊 Detalles: ${verification.analysisType}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
        
        return JSON.stringify({
          success: true,
          message: "STRATEGIST: Insight similar ya existe (detectado por IA + embeddings)",
          skipped: true,
          reason: verification.reason,
          similarityScore: verification.similarityScore,
          analysisType: verification.analysisType,
          intelligentSystem: true
        });
      }
      
      if (verification.shouldFuse) {
        console.log("🔗 STRATEGIST: Fusionando insight con existente usando IA...");
        
        const fusionResult = await memoryService.fuseInsights(content, verification.fusionTarget.id);
        
        if (fusionResult.success) {
          return JSON.stringify({
            success: true,
            message: "STRATEGIST: Insight estratégico fusionado inteligentemente",
            memory: fusionResult.memory,
            wasFused: true,
            analysisType: verification.analysisType,
            intelligentSystem: true
          });
        }
      }

      let calculatedImportance = Math.max(0.7, importance || 0.7);
      
      const summary = await generateMemorySummary(type, content);
      
      if (summary.insight && summary.insight.split(" ").length > 15) {
        const words = summary.insight.split(" ");
        summary.insight = words.slice(0, 15).join(" ");
        summary.truncated = true;
      }
      
      const insightKey = summary.insight ? summary.insight.substring(0, 100).toLowerCase() : "";
      
      if (insightKey && sessionTracker.processedInsights.has(insightKey)) {
        console.log("STRATEGIST: Insight ya procesado en esta sesión (tracker)");
        return JSON.stringify({
          success: true,
          message: "STRATEGIST: Insight similar ya procesado en esta sesión",
          skipped: true,
          insight: summary.insight,
          session_tracker: true
        });
      }
      
      const result = await memoryService.saveToMemory({
        type,
        content: summary,
        source: source || "strategist_insight",
        importance: calculatedImportance
      });
      
      if (!result.success) {
        throw new Error(`Error guardando insight estratégico: ${result.error}`);
      }
      
      memoryInsightCounter++;
      console.log(`✅ STRATEGIST: Insight estratégico ÚNICO guardado con Sistema Inteligente. Total: ${memoryInsightCounter}`);
      
      if (insightKey) sessionTracker.processedInsights.add(insightKey);
      
      return JSON.stringify({
        success: true,
        memory: result.memory,
        summary: summary,
        importance: calculatedImportance,
        strategist_note: "Insight único verificado por Sistema Inteligente (embeddings + IA)",
        analysisType: verification.analysisType,
        intelligentSystem: true
      });
      
    } catch (error) {
      console.error("❌ Error en strategistMemorySaveTool:", error);
      throw new Error(`Error guardando insight estratégico: ${error.message}`);
    }
  },
  {
    name: "memorySave",
    description: TOOL_PROMPTS.memorySave,
    schema: z.object({
      type: z.enum(['strategic_insight', 'campaign_strategy', 'viral_opportunity', 'market_analysis']).describe("SOLO tipos estratégicos de alto nivel"),
      content: z.any().describe("Insight estratégico crítico para viralidad de Acadel (máx. 8 palabras)"),
      source: z.string().optional().describe("Fuente: strategist_analysis, market_intelligence, etc."),
      importance: z.number().min(0.7).max(1).optional().describe("Importancia 0.7-1.0: SOLO insights estratégicos críticos")
    })
  }
);

const saveProfileTool = tool(
  async ({ profileData, source = "profile_agent", importance = 0.5 }) => {
    try {
      console.log("👥 PROFILE AGENT: Iniciando guardado de perfil con Sistema Inteligente de Embeddings...");
      
      if (hasErrorRecovery(profileData) || isBackupContent(profileData)) {
        console.log("🚫 PROFILE AGENT: Perfil con error_recovery detectado");
        return JSON.stringify({
          success: true,
          message: "PROFILE AGENT: Perfil no guardado: contiene datos de recuperación de errores",
          skipped: true,
          reason: "error_recovery_detected"
        });
      }
      
      let processedData = profileData;
      if (typeof profileData === 'string') {
        try {
          if (profileData.trim().startsWith('{')) {
            processedData = JSON.parse(profileData);
            
            if (hasErrorRecovery(processedData) || isBackupContent(processedData)) {
              console.log("🚫 PROFILE AGENT: Perfil parseado con error_recovery");
              return JSON.stringify({
                success: true,
                message: "PROFILE AGENT: Perfil no guardado: datos de recuperación después del parsing",
                skipped: true,
                reason: "error_recovery_after_parsing"
              });
            }
          } else {
            processedData = { descripcion: profileData };
          }
        } catch (parseError) {
          processedData = { descripcion: profileData };
        }
      }
      
      if (!processedData || typeof processedData !== 'object') {
        processedData = { descripcion: String(profileData) };
      }
      
      if (processedData.carrera || processedData.Carrera) {
        const carrera = (processedData.carrera || processedData.Carrera).trim();
        processedData.carrera = carrera;
        if (processedData.Carrera && processedData.carrera) {
          delete processedData.Carrera;
        }
      }
      
      if (processedData.edad || processedData.Edad) {
        const edad = parseInt(processedData.edad || processedData.Edad);
        if (!isNaN(edad)) {
          processedData.edad = edad;
          if (processedData.Edad && processedData.edad) {
            delete processedData.Edad;
          }
        }
      }
      
      if (processedData.hobbies || processedData.Hobbies) {
        const hobbies = processedData.hobbies || processedData.Hobbies;
        if (typeof hobbies === 'string') {
          processedData.hobbies = hobbies.split(/,|\sy\s/).map(h => h.trim()).filter(h => h);
        } else if (Array.isArray(hobbies)) {
          processedData.hobbies = hobbies;
        }
        if (processedData.Hobbies && processedData.hobbies) {
          delete processedData.Hobbies;
        }
      }

      console.log("🔍 PROFILE AGENT: Verificando unicidad con Sistema Inteligente...");
      
      const verification = await UniquenessMiddleware.beforeSave('profile', processedData);
      
      if (!verification.success) {
        console.log("🚫 PROFILE AGENT: Perfil duplicado detectado por Sistema Inteligente");
        console.log(`📊 Detalles: ${verification.analysisType}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
        
        return JSON.stringify({
          success: false,
          message: "PROFILE AGENT: Perfil similar detectado por IA + embeddings",
          profile: verification.existingItem,
          analysis: {
            similarityScore: verification.similarityScore,
            reason: verification.reason,
            analysisType: verification.analysisType
          },
          intelligentSystem: true
        });
      }
      
      const hasMBTI = processedData.personalidad && 
                     String(processedData.personalidad).match(/\b[EI][NS][TF][JP]\b/i);
      
      if (!hasMBTI) {
        console.log("PROFILE AGENT: Personalidad MBTI no detectada, intentando inferir...");
        
        const inferredPersonality = await inferPersonalityType(processedData);

        if (inferredPersonality) {
          if (processedData.personalidad) {
            if (typeof processedData.personalidad === 'string') {
              processedData.personalidad = `${inferredPersonality.mbti} – ${processedData.personalidad} (${inferredPersonality.descripcion})`;
            } else {
              processedData.personalidad = `${inferredPersonality.mbti} – ${inferredPersonality.descripcion}`;
            }
          } else {
            processedData.personalidad = `${inferredPersonality.mbti} – ${inferredPersonality.descripcion}`;
          }
          
          processedData.tipo_personalidad = inferredPersonality.mbti;
          
          if (!processedData.rasgos_personalidad) {
            processedData.rasgos_personalidad = inferredPersonality.rasgos;
          }
          
          console.log(`PROFILE AGENT: Personalidad inferida: ${inferredPersonality.mbti}`);
        }
      }
      
      let calculatedImportance = importance || 0.5;
      calculatedImportance = Math.min(0.9, calculatedImportance + 0.15);
      
      const profileKey = JSON.stringify(processedData);
      
      if (sessionTracker.processedProfiles.has(profileKey)) {
        console.log("PROFILE AGENT: Perfil ya procesado en esta sesión (tracker)");
        return JSON.stringify({
          success: true,
          message: "PROFILE AGENT: Perfil similar ya procesado en esta sesión",
          skipped: true,
          session_tracker: true
        });
      }
      
      const result = await profileService.createProfile(processedData);
      
      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: `PROFILE AGENT: Error guardando perfil: ${result.error}`,
          attempted_data: processedData
        });
      }
      
      const newProfileInsight = await generateMemorySummary('profile_insight', {
        profile_id: result.profile.id,
        carrera: processedData.carrera,
        edad: processedData.edad,
        nivel: processedData.nivel_academico || processedData.nivel,
        importance_level: calculatedImportance > 0.8 ? "alto" : calculatedImportance > 0.6 ? "medio" : "estándar",
        agent_source: "profile_specialist"
      });
      
      const memoryVerification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: "profile_insight",
        content: newProfileInsight
      });
      
      let memoryResult = { success: false };
      if (memoryVerification.success) {
        memoryResult = await memoryService.saveToMemory({
          type: "profile_insight",
          content: newProfileInsight,
          source: "profile_agent",
          importance: calculatedImportance
        });
      } else if (memoryVerification.shouldFuse) {
        memoryResult = await memoryService.fuseInsights(newProfileInsight, memoryVerification.fusionTarget.id);
      }
      
      sessionTracker.processedProfiles.add(profileKey);
      
      console.log(`✅ PROFILE AGENT: Perfil ÚNICO guardado con Sistema Inteligente, ID: ${result.profile.id}`);
      
      return JSON.stringify({
        success: true,
        message: `PROFILE AGENT: Perfil único verificado por IA + embeddings, ID: ${result.profile.id}`,
        profileId: result.profile.id,
        profile: result.profile,
        insight: newProfileInsight.insight,
        importance: calculatedImportance,
        memoryId: memoryResult.success ? memoryResult.memory?.id : null,
        agent_note: "Procesado por Sistema Inteligente (embeddings + análisis psicográfico IA)",
        analysisType: verification.analysisType,
        intelligentSystem: true
      });
      
    } catch (error) {
      console.error("❌ Error en PROFILE AGENT saveProfileTool:", error);
      return JSON.stringify({
        success: false,
        error: `PROFILE AGENT: ${error.message}`,
        attempted_data: profileData
      });
    }
  },
  {
    name: "saveProfile",
    description: TOOL_PROMPTS.saveProfile,
    schema: z.object({
      profileData: z.any().describe("Datos psicográficos del estudiante: carrera, personalidad, hobbies, comportamiento"),
      source: z.string().optional().describe("Fuente de detección del perfil"),
      importance: z.number().min(0).max(1).optional().describe("Importancia basada en potencial viral con Acadel")
    })
  }
);

const saveContentTool = tool(
  async ({ type, channel, payload, source = "creative_agent", importance = 0.5 }) => {
    try {
      console.log("🎨 CREATIVE AGENT: Iniciando guardado de contenido con Sistema Inteligente de Embeddings...");
      
      if (hasErrorRecovery(payload) || isBackupContent(payload)) {
        console.log("🚫 CREATIVE AGENT: Contenido con error_recovery detectado");
        return JSON.stringify({
          success: true,
          message: "CREATIVE AGENT: Contenido no guardado: contiene datos de recuperación de errores",
          skipped: true,
          reason: "error_recovery_detected"
        });
      }
      
      let sanitizedPayload = payload;
      
      if (payload && (typeof payload === 'object' || typeof payload === 'string')) {
        const sanitizationResult = sanitizeMarketingContent(payload, {
          preserveTemplates: true,
          maxStringLength: 10000,
          removeInvalidChars: true
        });
        
        if (sanitizationResult.success) {
          sanitizedPayload = sanitizationResult.data;
          
          if (hasErrorRecovery(sanitizedPayload) || isBackupContent(sanitizedPayload)) {
            console.log("🚫 CREATIVE AGENT: Contenido sanitizado con error_recovery");
            return JSON.stringify({
              success: true,
              message: "CREATIVE AGENT: Contenido no guardado: datos de recuperación después de sanitización",
              skipped: true,
              reason: "error_recovery_after_sanitization"
            });
          }
          
          if (sanitizationResult.warnings.length > 0) {
            console.warn("⚠️ CREATIVE AGENT: Advertencias en sanitización:", sanitizationResult.warnings);
          }
        } else {
          sanitizedPayload = sanitizationResult.fallbackData;
          
          if (hasErrorRecovery(sanitizedPayload) || isBackupContent(sanitizedPayload)) {
            console.log("🚫 CREATIVE AGENT: Fallback con error_recovery");
            return JSON.stringify({
              success: true,
              message: "CREATIVE AGENT: Contenido no guardado: fallback contiene datos de recuperación",
              skipped: true,
              reason: "error_recovery_in_fallback"
            });
          }
        }
      }

      let normalizedType = type;
      let normalizedChannel = channel;
      
      if (typeof normalizedType === 'string') {
        normalizedType = normalizedType.toLowerCase().trim();
      } else {
        if (source.toLowerCase().includes("meme")) {
          normalizedType = "meme";
        } else if (source.toLowerCase().includes("video")) {
          normalizedType = "video";
        } else {
          normalizedType = "content";
        }
      }
      
      if (typeof normalizedChannel === 'string') {
        normalizedChannel = normalizedChannel.trim();
        normalizedChannel = normalizedChannel.charAt(0).toUpperCase() + normalizedChannel.slice(1).toLowerCase();
      } else {
        normalizedChannel = "Instagram";
      }
      
      if (typeof sanitizedPayload === 'string') {
        try {
          if (sanitizedPayload.trim().startsWith('{')) {
            sanitizedPayload = JSON.parse(sanitizedPayload);
          } else {
            sanitizedPayload = { description: sanitizedPayload };
          }
        } catch (parseError) {
          sanitizedPayload = { description: sanitizedPayload };
        }
      }
      
      if (!sanitizedPayload) {
        sanitizedPayload = {};
      }
      
      if (typeof sanitizedPayload !== 'object') {
        sanitizedPayload = { content: String(sanitizedPayload) };
      }
      
      console.log("🔍 CREATIVE AGENT: Verificando unicidad con Sistema Inteligente...");
      
      const verification = await UniquenessMiddleware.beforeSave('content', {
        contentType: normalizedType,
        channel: normalizedChannel,
        payload: sanitizedPayload
      });
      
      if (!verification.success) {
        console.log("🚫 CREATIVE AGENT: Contenido duplicado detectado por Sistema Inteligente");
        console.log(`📊 Detalles: ${verification.analysisType}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
        
        return JSON.stringify({
          success: false,
          message: "CREATIVE AGENT: Contenido similar detectado por IA + embeddings",
          content: verification.existingItem,
          similarityScore: verification.similarityScore,
          analysisType: verification.analysisType,
          intelligentSystem: true
        });
      }
      
      let calculatedImportance = importance || 0.5;
      calculatedImportance = Math.min(0.9, calculatedImportance + 0.15);
      
      const contentKey = `${normalizedType}-${normalizedChannel}-${JSON.stringify(sanitizedPayload).substring(0, 100)}`;
      
      if (sessionTracker.processedContents.has(contentKey)) {
        console.log("CREATIVE AGENT: Contenido ya procesado en esta sesión (tracker)");
        return JSON.stringify({
          success: true,
          message: "CREATIVE AGENT: Contenido similar ya procesado en esta sesión",
          skipped: true,
          session_tracker: true
        });
      }
      
      const result = await contentService.createContent({
        type: normalizedType,
        channel: normalizedChannel,
        payload: sanitizedPayload
      });
      
      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: `CREATIVE AGENT: Error guardando contenido: ${result.error}`,
          attempted_data: { type: normalizedType, channel: normalizedChannel, payload: sanitizedPayload }
        });
      }
      
      const contentInsight = await generateMemorySummary('creative_insight', {
        content_id: result.content.id,
        type: normalizedType,
        channel: normalizedChannel,
        viral_elements: sanitizedPayload.viral_potential || "creatividad_acadel",
        agent_source: "creative_specialist"
      });
      
      const memoryVerification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: "creative_insight",
        content: contentInsight
      });
      
      let memoryResult = { success: false };
      if (memoryVerification.success) {
        memoryResult = await memoryService.saveToMemory({
          type: "creative_insight",
          content: contentInsight,
          source: "creative_agent",
          importance: calculatedImportance
        });
      } else if (memoryVerification.shouldFuse) {
        memoryResult = await memoryService.fuseInsights(contentInsight, memoryVerification.fusionTarget.id);
      }
      
      sessionTracker.processedContents.add(contentKey);
      
      console.log(`✅ CREATIVE AGENT: Contenido ÚNICO guardado con Sistema Inteligente, ID: ${result.content.id}`);
      
      return JSON.stringify({
        success: true,
        message: `CREATIVE AGENT: Contenido único verificado por IA + embeddings, ID: ${result.content.id}`,
        contentId: result.content.id,
        content: result.content,
        insight: contentInsight.insight,
        importance: calculatedImportance,
        memoryId: memoryResult.success ? memoryResult.memory?.id : null,
        agent_note: "Procesado por Sistema Inteligente (embeddings + análisis estructural IA)",
        analysisType: verification.analysisType,
        intelligentSystem: true
      });
      
    } catch (error) {
      console.error("❌ Error en CREATIVE AGENT saveContentTool:", error);
      return JSON.stringify({
        success: false,
        error: `CREATIVE AGENT: ${error.message}`,
        attempted_data: { type, channel, payload: "Error en sanitización" }
      });
    }
  },
  {
    name: "saveContent",
    description: TOOL_PROMPTS.saveContent,
    schema: z.object({
      type: z.string().describe("Tipo de contenido viral: meme, video, campaign, post"),
      channel: z.string().describe("Canal optimizado: Instagram, TikTok, Email, etc."),
      payload: z.any().describe("Contenido creativo con personalidad de Acadel y elementos virales"),
      source: z.string().optional().describe("Fuente creativa del contenido"),
      importance: z.number().min(0).max(1).optional().describe("Importancia basada en potencial viral")
    })
  }
);

const generateContentTool = tool(
  async ({ type, channel, target, theme, source = "creative_generation", importance = 0.6 }) => {
    try {
      console.log("🎨 CREATIVE AGENT: Generando contenido con Sistema Inteligente...");
      
      let processedType = type || "content";
      let processedChannel = channel || "Instagram";
      let processedTarget = target;
      let processedTheme = theme;
      
      if (typeof processedType === 'string') {
        processedType = processedType.toLowerCase().trim();
      }
      
      if (typeof processedChannel === 'string') {
        processedChannel = processedChannel.trim();
        processedChannel = processedChannel.charAt(0).toUpperCase() + processedChannel.slice(1).toLowerCase();
      }
      
      if (typeof processedTarget === 'string') {
        try {
          if (processedTarget.trim().startsWith('{')) {
            processedTarget = JSON.parse(processedTarget);
          } else {
            processedTarget = { descripcion: processedTarget };
          }
        } catch (parseError) {
          processedTarget = { descripcion: processedTarget };
        }
      }
      
      if (!processedTarget || typeof processedTarget !== 'object') {
        processedTarget = { carrera: "General" };
      }
      
      if (typeof processedTheme !== 'string') {
        processedTheme = String(processedTheme || "");
      }
      
      processedTheme = processedTheme.trim();
      
      let calculatedImportance = importance || 0.6;
      calculatedImportance = Math.min(0.85, calculatedImportance + 0.15);
      
      const contentKey = `generate-${processedType}-${processedChannel}-${processedTheme}`;
      
      if (sessionTracker.processedContents.has(contentKey)) {
        console.log("CREATIVE AGENT: Contenido similar ya generado en esta sesión (tracker)");
        return JSON.stringify({
          success: true,
          message: "CREATIVE AGENT: Contenido similar ya generado en esta sesión",
          skipped: true,
          session_tracker: true
        });
      }
      
      console.log("🔍 CREATIVE AGENT: Verificando unicidad antes de generar con Sistema Inteligente...");
      
      const verification = await UniquenessMiddleware.beforeSave('content', {
        contentType: processedType,
        channel: processedChannel,
        payload: { theme: processedTheme, target_audience: processedTarget }
      });
      
      if (!verification.success) {
        console.log("🚫 CREATIVE AGENT: Contenido similar ya existe (detectado por IA + embeddings)");
        console.log(`📊 Detalles: ${verification.analysisType}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
        
        return JSON.stringify({
          success: true,
          message: "CREATIVE AGENT: Contenido similar ya existe (detectado por Sistema Inteligente)",
          content: verification.existingItem,
          wasExisting: true,
          similarity: verification.similarityScore,
          skipped: true,
          analysisType: verification.analysisType,
          intelligentSystem: true
        });
      }
      
      const result = await contentService.generateContent({
        type: processedType,
        channel: processedChannel,
        target: processedTarget,
        theme: processedTheme
      });
      
      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: `CREATIVE AGENT: Error generando contenido: ${result.error}`,
          attempted_data: { 
            type: processedType, 
            channel: processedChannel, 
            target: processedTarget, 
            theme: processedTheme 
          }
        });
      }
      
      sessionTracker.processedContents.add(contentKey);
      
      const contentInsight = await generateMemorySummary('creative_generation', {
        content_id: result.content.id,
        type: processedType,
        channel: processedChannel,
        theme: processedTheme,
        creative_elements: "generacion_acadel_personality",
        agent_source: "creative_generation"
      });
      
      const memoryVerification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: "creative_insight",
        content: contentInsight
      });
      
      let memoryResult = { success: false };
      if (memoryVerification.success) {
        memoryResult = await memoryService.saveToMemory({
          type: "creative_insight",
          content: contentInsight,
          source: "creative_generation",
          importance: calculatedImportance
        });
      } else if (memoryVerification.shouldFuse) {
        memoryResult = await memoryService.fuseInsights(contentInsight, memoryVerification.fusionTarget.id);
      }
      
      console.log(`✅ CREATIVE AGENT: Contenido ÚNICO generado con Sistema Inteligente, ID: ${result.content.id}`);
      
      return JSON.stringify({
        success: true,
        message: `CREATIVE AGENT: Contenido "${processedType}" generado único por IA + embeddings, ID: ${result.content.id}`,
        contentId: result.content.id,
        content: result.content,
        insight: contentInsight.insight,
        importance: calculatedImportance,
        memoryId: memoryResult.success ? memoryResult.memory?.id : null,
        agent_note: "Generado por Sistema Inteligente (embeddings + análisis estructural IA)",
        analysisType: verification.analysisType,
        intelligentSystem: true
      });
    } catch (error) {
      console.error("❌ Error en CREATIVE AGENT generateContentTool:", error);
      return JSON.stringify({
        success: false,
        error: `CREATIVE AGENT: ${error.message}`,
        attempted_data: { type, channel, target, theme }
      });
    }
  },
  {
    name: "generateContent",
    description: TOOL_PROMPTS.generateContent,
    schema: z.object({
      type: z.string().describe("Tipo de contenido a generar: meme, video, campaign, post"),
      channel: z.string().describe("Canal target: Instagram, TikTok, Email, etc."),
      target: z.any().describe("Audiencia objetivo específica"),
      theme: z.string().describe("Tema central del contenido"),
      source: z.string().optional().describe("Fuente de la idea creativa"),
      importance: z.number().min(0).max(1).optional().describe("Importancia del contenido generado")
    })
  }
);

const saveTrendTool = tool(
  async ({ theme, popularity = 0.5, metadata = {}, source = "analyst_agent", importance = 0.6 }) => {
    try {
      console.log("📊 ANALYST AGENT: Iniciando guardado de tendencia con Sistema Inteligente de Embeddings...");
      
      if (hasErrorRecovery(metadata) || isBackupContent(metadata) || 
          (typeof theme === 'object' && (hasErrorRecovery(theme) || isBackupContent(theme)))) {
        console.log("🚫 ANALYST AGENT: Tendencia con error_recovery detectado");
        return JSON.stringify({
          success: true,
          message: "ANALYST AGENT: Tendencia no guardada: contiene datos de recuperación de errores",
          skipped: true,
          reason: "error_recovery_detected"
        });
      }

      let normalizedTheme = theme;
      let normalizedPopularity = popularity;
      let normalizedMetadata = metadata;
      
      if (typeof normalizedTheme === 'object' && normalizedTheme !== null) {
        if (normalizedTheme.theme) {
          normalizedMetadata = { ...normalizedTheme, ...normalizedMetadata };
          normalizedTheme = normalizedTheme.theme;
        } else {
          normalizedMetadata = { ...normalizedTheme, ...normalizedMetadata };
          normalizedTheme = JSON.stringify(normalizedTheme).substring(0, 100);
        }
      }
      
      if (typeof normalizedTheme !== 'string') {
        normalizedTheme = String(normalizedTheme);
      }
      
      normalizedTheme = normalizedTheme.trim();
      
      if (typeof normalizedPopularity !== 'number') {
        normalizedPopularity = parseFloat(normalizedPopularity);
      }
      
      if (isNaN(normalizedPopularity) || normalizedPopularity < 0 || normalizedPopularity > 1) {
        normalizedPopularity = 0.5;
      }
      
      if (typeof normalizedMetadata === 'string') {
        try {
          normalizedMetadata = JSON.parse(normalizedMetadata);
        } catch (parseError) {
          normalizedMetadata = { description: normalizedMetadata };
        }
      }
      
      if (!normalizedMetadata || typeof normalizedMetadata !== 'object') {
        normalizedMetadata = {};
      }
      
      console.log("🔍 ANALYST AGENT: Verificando unicidad con Sistema Inteligente...");
      
      const verification = await UniquenessMiddleware.beforeSave('trend', {
        theme: normalizedTheme,
        metadata: normalizedMetadata
      });
      
      if (!verification.success) {
        console.log("🚫 ANALYST AGENT: Tendencia duplicada detectada por Sistema Inteligente");
        console.log(`📊 Detalles: ${verification.analysisType}, Similitud: ${verification.similarityScore ? (verification.similarityScore * 100).toFixed(1) + '%' : 'N/A'}`);
        
        return JSON.stringify({
          success: false,
          message: "ANALYST AGENT: Tendencia similar detectada por IA + embeddings",
          trend: verification.existingItem,
          similarityScore: verification.similarityScore,
          analysisType: verification.analysisType,
          intelligentSystem: true
        });
      }
      
      let additionalNote = "";
      if (verification.isSimilar) {
        additionalNote = " (Similar detectada por IA pero suficientemente diferente)";
        console.log("⚠️ ANALYST AGENT: Tendencia similar detectada por IA pero se guardará por diferencias suficientes");
      }
      
      let calculatedImportance = importance || 0.6;
      calculatedImportance = Math.min(0.9, calculatedImportance + 0.15);
      
      const trendKey = normalizedTheme.toLowerCase().trim();
      
      if (sessionTracker.processedTrends.has(trendKey)) {
        console.log("ANALYST AGENT: Tendencia ya procesada en esta sesión (tracker)");
        return JSON.stringify({
          success: true,
          message: "ANALYST AGENT: Tendencia similar ya procesada en esta sesión",
          skipped: true,
          session_tracker: true
        });
      }
      
      const result = await marketingService.saveTrend({
        theme: normalizedTheme,
        popularity: normalizedPopularity,
        metadata: normalizedMetadata
      });
      
      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: `ANALYST AGENT: Error guardando tendencia: ${result.error}`,
          attempted_data: { theme: normalizedTheme, popularity: normalizedPopularity, metadata: normalizedMetadata }
        });
      }
      
      const trendInsight = await generateMemorySummary('trend_analysis', {
        trend_id: result.trend.id,
        theme: normalizedTheme,
        popularity: normalizedPopularity,
        market_impact: normalizedMetadata.market_impact || "analysis_pending",
        agent_source: "analyst_specialist"
      });
      
      const memoryVerification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: "trend_analysis",
        content: trendInsight
      });
      
      let memoryResult = { success: false };
      if (memoryVerification.success) {
        memoryResult = await memoryService.saveToMemory({
          type: "trend_analysis",
          content: trendInsight,
          source: "analyst_agent",
          importance: calculatedImportance
        });
      } else if (memoryVerification.shouldFuse) {
        memoryResult = await memoryService.fuseInsights(trendInsight, memoryVerification.fusionTarget.id);
      }
      
      sessionTracker.processedTrends.add(trendKey);
      
      console.log(`✅ ANALYST AGENT: Tendencia ÚNICA guardada con Sistema Inteligente, ID: ${result.trend.id}`);
      
      return JSON.stringify({
        success: true,
        message: `ANALYST AGENT: Tendencia única verificada por IA + embeddings, ID: ${result.trend.id}`,
        trendId: result.trend.id,
        trend: result.trend,
        insight: trendInsight.insight,
        importance: calculatedImportance,
        memoryId: memoryResult.success ? memoryResult.memory?.id : null,
        agent_note: "Procesado por Sistema Inteligente (embeddings + análisis conceptual IA)",
        uniqueness_note: verification.reason + additionalNote,
        analysisType: verification.analysisType,
        intelligentSystem: true
      });
      
    } catch (error) {
      console.error("❌ Error en ANALYST AGENT saveTrendTool:", error);
      return JSON.stringify({
        success: false,
        error: `ANALYST AGENT: ${error.message}`,
        attempted_data: { theme, popularity, metadata }
      });
    }
  },
  {
    name: "saveTrend",
    description: TOOL_PROMPTS.saveTrend,
    schema: z.object({
      theme: z.string().describe("Tendencia cultural/educativa con potencial analítico"),
      popularity: z.number().min(0).max(1).optional().describe("Score de popularidad basado en datos"),
      metadata: z.any().optional().describe("Datos analíticos: reach, engagement, demografía, timing"),
      source: z.string().optional().describe("Fuente de datos de la tendencia"),
      importance: z.number().min(0).max(1).optional().describe("Importancia basada en impacto proyectado")
    })
  }
);

const recordInteractionTool = tool(
  async ({ profileId, contentId, channel, action }) => {
    try {
      console.log(`📊 ANALYST AGENT: Registrando interacción ${action} con Sistema Inteligente...`);
      
      if (!profileId || !contentId || !action) {
        throw new Error("ANALYST AGENT: profileId, contentId y action son campos requeridos");
      }
      
      if (!channel) {
        try {
          const contentResult = await contentService.getContentById(contentId);
          if (contentResult.success) {
            channel = contentResult.content.channel || "Desconocido";
          } else {
            channel = "Desconocido";
          }
        } catch {
          channel = "Desconocido";
        }
      }
      
      console.log("🔍 ANALYST AGENT: Verificando unicidad de interacción...");
      
      const verification = await UniquenessMiddleware.beforeSave('interaction', {
        profileId: profileId,
        contentId: contentId,
        channel: channel,
        action: action
      });
      
      if (!verification.success) {
        console.log("🚫 ANALYST AGENT: Interacción duplicada reciente detectada");
        return JSON.stringify({
          success: true,
          message: "ANALYST AGENT: Interacción idéntica registrada recientemente",
          skipped: true,
          reason: verification.reason,
          existingInteraction: verification.existingItem,
          intelligentSystem: true
        });
      }
      
      const result = await matchingService.recordInteraction(profileId, contentId, channel, action);
      
      if (!result.success) {
        throw new Error(`ANALYST AGENT: Error registrando interacción: ${result.error}`);
      }
      
      const interactionInsight = await generateMemorySummary('interaction_analysis', {
        interaction_id: result.interaction.id,
        profile_id: profileId,
        content_id: contentId,
        action: action,
        channel: channel,
        behavioral_pattern: "analyst_tracking",
        agent_source: "analyst_specialist"
      });
      
      const memoryVerification = await UniquenessMiddleware.beforeSave('memory', {
        memoryType: "interaction_analysis",
        content: interactionInsight
      });
      
      let memoryResult = { success: false };
      if (memoryVerification.success) {
        memoryResult = await memoryService.saveToMemory({
          type: "interaction_analysis",
          content: interactionInsight,
          source: "analyst_agent",
          importance: action === 'purchased' ? 0.8 : 
                     action === 'shared' ? 0.7 : 
                     action === 'clicked' ? 0.6 : 0.5
        });
      } else if (memoryVerification.shouldFuse) {
        memoryResult = await memoryService.fuseInsights(interactionInsight, memoryVerification.fusionTarget.id);
      }
      
      console.log(`✅ ANALYST AGENT: Interacción ÚNICA registrada con Sistema Inteligente, ID: ${result.interaction.id}`);
      
      return JSON.stringify({
        success: true,
        interaction: result.interaction,
        insight: interactionInsight.insight,
        memoryId: memoryResult.success ? memoryResult.memory?.id : null,
        agent_note: "Interacción única analizada por Sistema Inteligente",
        intelligentSystem: true
      });
      
    } catch (error) {
      console.error("❌ Error en ANALYST AGENT recordInteractionTool:", error);
      throw new Error(`ANALYST AGENT: Error registrando interacción: ${error.message}`);
    }
  },
  {
    name: "recordInteraction",
    description: TOOL_PROMPTS.recordInteraction,
    schema: z.object({
      profileId: z.string().describe("ID del perfil de estudiante (se puede resolver por descripción)"),
      contentId: z.string().describe("ID del contenido de Acadel (se puede resolver por descripción)"),
      channel: z.string().optional().describe("Canal donde ocurrió la interacción"),
      action: z.string().describe("Tipo de interacción: clicked, shared, saved, purchased, viewed, commented")
    })
  }
);

const simulateCampaignTool = tool(
  async ({ campaignData, audienceData }) => {
    try {
      console.log("🎯 Simulando resultados de campaña de marketing...");
      
      if (!campaignData || !audienceData) {
        throw new Error("Datos de campaña y audiencia son requeridos");
      }
      
      let processedCampaignData = campaignData;
      if (typeof campaignData === 'string') {
        try {
          processedCampaignData = JSON.parse(campaignData);
        } catch (e) {
          processedCampaignData = { description: campaignData };
        }
      }
      
      let processedAudienceData = audienceData;
      if (typeof audienceData === 'string') {
        try {
          processedAudienceData = JSON.parse(audienceData);
        } catch (e) {
          processedAudienceData = { description: audienceData };
        }
      }
      
      const result = await simulationService.simulateCampaignResults(
        processedCampaignData,
        processedAudienceData
      );
      
      if (!result.success) {
        throw new Error(`Error en simulación: ${result.error}`);
      }
      
      return JSON.stringify({
        success: true,
        results: result.results,
        metrics: result.metrics,
        confidence: result.confidence,
        recommendations: result.recommendations,
        simulation_note: "Simulación completada (no requiere verificación de unicidad)"
      });
    } catch (error) {
      console.error("❌ Error en simulateCampaignTool:", error);
      throw new Error(`Error simulando campaña: ${error.message}`);
    }
  },
  {
    name: "simulateCampaign",
    description: TOOL_PROMPTS.simulateCampaign,
    schema: z.object({
      campaignData: z.any().describe("Datos estratégicos de la campaña: concepto, objetivos, positioning"),
      audienceData: z.any().describe("Data estratégica de audiencia: segmentos, behaviors, market size")
    })
  }
);

// ============== FUNCIÓN PRINCIPAL ACTUALIZADA ==============

export const getMarketingTools = (agentType = 'strategist') => {
  resetSessionTracker();
  
  console.log(`🛠️ Obteniendo herramientas CON Sistema Inteligente de Embeddings para: ${agentType.toUpperCase()}`);
  
  const sharedTools = [
    profileSearchTool,
    contentSearchTool,
    memorySearchTool,
    webSearchTool,
    profileToContentMatchTool,
    contentToProfilesMatchTool
  ];
  
  switch (agentType.toLowerCase()) {
    case 'strategist':
      console.log("🎯 STRATEGIST: Herramientas estratégicas CON Sistema Inteligente");
      return [
        ...sharedTools,
        strategistMemorySaveTool,  // ✅ CON Sistema Inteligente
        simulateCampaignTool       // Sin verificación (simulación)
      ];
      
    case 'profile':
      console.log("👥 PROFILE AGENT: Herramientas de perfiles CON Sistema Inteligente");
      return [
        ...sharedTools,
        saveProfileTool            // ✅ CON Sistema Inteligente
      ];
      
    case 'creative':
      console.log("🎨 CREATIVE AGENT: Herramientas creativas CON Sistema Inteligente");
      return [
        ...sharedTools,
        saveContentTool,           // ✅ CON Sistema Inteligente
        generateContentTool        // ✅ CON Sistema Inteligente
      ];
      
    case 'analyst':
      console.log("📊 ANALYST AGENT: Herramientas analíticas CON Sistema Inteligente");
      return [
        ...sharedTools,
        saveTrendTool,             // ✅ CON Sistema Inteligente
        recordInteractionTool,     // ✅ CON Sistema Inteligente
        simulateCampaignTool       // Sin verificación (simulación)
      ];
      
    default:
      console.log("⚠️ Tipo de agente desconocido, devolviendo herramientas del strategist CON Sistema Inteligente");
      return [
        ...sharedTools,
        strategistMemorySaveTool,
        simulateCampaignTool
      ];
  }
};

async function generateMemorySummary(type, content, importanceHint = null) {
  // ... [Implementación original mantenida por brevedad] ...
  // Esta función genera resúmenes, NO verifica unicidad (eso lo hace el sistema inteligente)
  try {
    let suggestedImportance = importanceHint || 0.5;
    
    if (typeof content === 'object' && content !== null) {
      if (content.importance || content.importance_level) {
        const explicitImportance = content.importance || 
                                 (content.importance_level === 'alto' ? 0.85 : 
                                  content.importance_level === 'medio' ? 0.7 : 
                                  content.importance_level === 'crítico' ? 0.95 : 0.5);
        
        suggestedImportance = explicitImportance;
      }
      
      const highImportanceKeywords = ['viral', 'acadel', 'comunidad', 'fans', 'engagement', 'shares', 'crítico', 'crucial', 'esencial', 'vital', 'clave', 'urgente'];
      if (content.insight && typeof content.insight === 'string') {
        for (const keyword of highImportanceKeywords) {
          if (content.insight.toLowerCase().includes(keyword)) {
            suggestedImportance = Math.max(suggestedImportance, 0.8);
            break;
          }
        }
      }
    }
    
    if (typeof content === 'string') {
      const strongQueryPatterns = [
        /^\s*(necesito|quiero|puedes|podrías|por favor|ayuda|ayúdame|dime|explica|genera|crea|haz)/i,
        /\?\s*$/,
        /^[^.!?]*\?/
      ];
      
      if (content.length > 20 && strongQueryPatterns.some(pattern => pattern.test(content))) {
        return { 
          insight: `Patrón Acadel sobre ${type}`, 
          note: "Generado automáticamente para evitar guardar consulta",
          original_type: type,
          importance_suggestion: 0.3
        };
      }
    }
    
    if (typeof content === 'object' && content.insight) {
      const preservedImportance = content.importance_suggestion || 
                               content.importance || 
                               suggestedImportance;
      
      if (content.insight.split(" ").length <= 8) {
        return {
          ...content,
          importance_suggestion: preservedImportance
        };
      } else {
        const words = content.insight.split(" ");
        return { 
          insight: words.slice(0, 8).join(" "),
          original_type: type,
          truncated: true,
          original_insight: content.insight,
          importance_suggestion: preservedImportance
        };
      }
    }
    
    if (typeof content === 'object' && content !== null) {
      const queryProps = ['query', 'userQuery', 'originalQuery', 'question', 
                         'pregunta', 'consulta', 'mensaje', 'text', 'input'];
      
      const cleanedContent = { ...content };
      for (const prop of queryProps) {
        if (cleanedContent[prop]) {
          delete cleanedContent[prop];
        }
      }
      
      if (Object.keys(cleanedContent).length < 2) {
        return { 
          insight: `Patrón Acadel sobre ${type}`, 
          note: "Generado automáticamente por falta de contenido procesable",
          original_type: type,
          importance_suggestion: 0.3
        };
      }
      
      content = cleanedContent;
    }
    
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content).substring(0, 300)
      : String(content).substring(0, 300);
    
    let importancePromptPart = '';
    if (suggestedImportance >= 0.9) {
      importancePromptPart = 'Esta información es CRÍTICA para hacer viral al Profesor Acadel. Extrae el insight más transformador sobre viralidad/comunidad.';
    } else if (suggestedImportance >= 0.7) {
      importancePromptPart = 'Esta información es MUY IMPORTANTE para Acadel. Extrae un insight clave sobre engagement estudiantil.';
    } else if (suggestedImportance >= 0.5) {
      importancePromptPart = 'Esta información es relevante para Acadelia. Extrae un insight útil sobre conexión con estudiantes.';
    } else {
      importancePromptPart = 'Esta información es contextual para Acadel. Extrae un insight conciso sobre la marca/audiencia.';
    }
    
    let prompt;
    
    switch (type) {
      case 'profile_insight':
      case 'new_profile_insight':
        prompt = `${importancePromptPart} Extrae SOLO una conclusión concisa (máximo 8 palabras) sobre este tipo de estudiante que puede conectar con el PROFESOR ACADEL.
        
        Datos: ${contentStr}
        
        ENFOQUE ACADELIA: Insight sobre potencial viral, engagement, o connection con nuestra marca. NO incluyas datos personales, solo insights sobre segmentos que aman a Acadel.`;
        break;
        
      case 'creative_insight':
      case 'content_insight':
        prompt = `${importancePromptPart} Extrae SOLO una conclusión concisa (máximo 8 palabras) sobre este contenido del PROFESOR ACADEL y su potencial viral.
        
        Datos: ${contentStr}
        
        ENFOQUE ACADELIA: Insight sobre viralidad, engagement estudiantil, o efectividad de la personalidad de Acadel en el contenido.`;
        break;
        
      case 'trend_analysis':
      case 'trend_insight':
        prompt = `${importancePromptPart} Extrae SOLO una conclusión concisa (máximo 8 palabras) sobre esta tendencia y cómo ACADEL puede aprovecharla.
        
        Datos: ${contentStr}
        
        ENFOQUE ACADELIA: Insight sobre oportunidades para hacer viral al Profesor Acadel o conectar con estudiantes Gen Z.`;
        break;
        
      case 'interaction_analysis':
        prompt = `${importancePromptPart} Extrae SOLO una conclusión concisa (máximo 8 palabras) sobre este patrón de interacción con contenido de ACADEL.
        
        Datos: ${contentStr}
        
        ENFOQUE ACADELIA: Insight sobre behavioral patterns que indican conexión emocional con Profesor Acadel.`;
        break;
        
      case 'strategic_insight':
      case 'campaign_strategy':
        prompt = `${importancePromptPart} Extrae SOLO una conclusión concisa (máximo 8 palabras) sobre esta estrategia para hacer viral al PROFESOR ACADEL.
        
        Datos: ${contentStr}
        
        ENFOQUE ACADELIA: Insight estratégico sobre cómo posicionar a Acadel como el chigüire educativo más querido del internet.`;
        break;
        
      default:
        prompt = `${importancePromptPart} Resume esta información en una única frase concisa (máximo 8 palabras) sobre ACADELIA y el Profesor Acadel:
        
        ${contentStr}
        
        ENFOQUE ACADELIA: Insight que ayude a hacer más viral/beloved al Profesor Acadel entre estudiantes universitarios.`;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: "Extrae insights concisos sobre el PROFESOR ACADEL y estudiantes universitarios. Responde SOLO con el insight, sin explicaciones. Enfócate en viralidad, engagement y conexión emocional." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 150
    });
    
    const rawResponse = completion.choices[0].message.content;
    
    let summary = rawResponse.trim();
    
    summary = summary
      .replace(/^(el|un|una|este|esta|estos|estas)\s+/i, "")
      .replace(/^(insight|conclusión|análisis|resumen):\s*/i, "")
      .replace(/^["']|["']$/g, "")
      .replace(/^(se necesita|necesitamos|hay que|debemos|se debe|se recomienda)\s+/i, "")
      .replace(/\.$/, "");
    
    const imperativeVerbs = /^(crear|generar|desarrollar|implementar|usar|utilizar|hacer|buscar|encontrar)/i;
    if (imperativeVerbs.test(summary)) {
      summary = summary.replace(imperativeVerbs, match => {
        const verbMap = {
          'crear': 'creación', 'generar': 'generación', 'desarrollar': 'desarrollo',
          'implementar': 'implementación', 'usar': 'uso', 'utilizar': 'utilización',
          'hacer': 'realización', 'buscar': 'búsqueda', 'encontrar': 'hallazgo'
        };
        return verbMap[match.toLowerCase()] || `${match}ción`;
      });
    }
    
    if (summary.split(" ").length > 8) {
      const words = summary.split(" ");
      summary = words.slice(0, 8).join(" ");
    }
    
    let qualityScore = 0.5;
    
    const acadeliaQualityWords = ['viral', 'engagement', 'comunidad', 'fans', 'shares', 'conexión', 'acadel', 'estudiantes', 'crucial', 'clave', 'esencial', 'vital', 'crítico', 'estratégico'];
    for (const word of acadeliaQualityWords) {
      if (summary.toLowerCase().includes(word)) {
        qualityScore = Math.min(0.9, qualityScore + 0.15);
        break;
      }
    }
    
    if (!/general|común|básico|estándar/i.test(summary)) {
      qualityScore = Math.min(0.85, qualityScore + 0.1);
    }
    
    const finalImportanceSuggestion = Math.max(
      suggestedImportance, 
      qualityScore > 0.7 ? (suggestedImportance * 0.7 + qualityScore * 0.3) : suggestedImportance
    );
    
    return {
      insight: summary,
      original_type: type,
      derived_from: typeof content === 'object' ? 'object_data' : 'text_data',
      timestamp: new Date().toISOString(),
      importance_suggestion: finalImportanceSuggestion,
      quality_score: qualityScore
    };
    
  } catch (error) {
    console.error("Error generando resumen para memoria:", error);
    return { 
      insight: `Patrón Acadel en ${type}`, 
      error: "Generación automática por fallo",
      timestamp: new Date().toISOString(),
      importance_suggestion: 0.4
    };
  }
}

async function inferPersonalityType(profileData) {
  // ... [Implementación original mantenida por brevedad] ...
  try {
    const originalFields = {
      nombre: profileData.nombre || profileData.Nombre || profileData.name || null,
      edad: profileData.edad || profileData.Edad || null,
      ubicacion: profileData.ubicacion || profileData.ciudad || profileData.pais || null,
      carrera: profileData.carrera || profileData.Carrera || null
    };
    
    let personalityText = "";
    
    if (typeof profileData === 'string') {
      personalityText = profileData;
    } 
    else if (typeof profileData === 'object' && profileData !== null) {
      if (profileData.descripcion && typeof profileData.descripcion === 'string') {
        personalityText = profileData.descripcion;
      } 
      else if (profileData.description && typeof profileData.description === 'string') {
        personalityText = profileData.description;
      }
      else {
        const allTextValues = [];
        
        for (const [key, value] of Object.entries(profileData)) {
          if (typeof value === 'string' && value.length > 0) {
            allTextValues.push(value);
          } else if (Array.isArray(value) && value.length > 0) {
            allTextValues.push(value.join(', '));
          } else if (typeof value === 'object' && value !== null) {
            try {
              allTextValues.push(JSON.stringify(value));
            } catch (e) {
              // Ignorar errores de serialización
            }
          }
        }
        
        personalityText = allTextValues.join(' ');
      }
    }
    
    if (!personalityText || personalityText.length < 10) {
      return null;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { 
          role: "system", 
          content: `Eres un experto en psicografía de marketing y personalidad MBTI. 
          Tu tarea es analizar descripciones de comportamiento y determinar el tipo MBTI.
          Incluso con información limitada, hazlo lo mejor posible.
          Responde ÚNICAMENTE con un JSON con esta estructura:
          {
            "mbti": "XXXX", // Tipo MBTI (4 letras)
            "descripcion": "Breve descripción", // 1-2 oraciones
            "rasgos": ["rasgo1", "rasgo2", "rasgo3"], // 3-5 rasgos para marketing
            "confianza": "medio" // nivel: bajo, medio, alto
          }`
        },
        { 
          role: "user", 
          content: `Determina el tipo MBTI más probable de esta persona:
          
          "${personalityText}"`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;

    try {
      const analysis = JSON.parse(responseText);
      
      if (!analysis.mbti || !analysis.descripcion || !analysis.rasgos) {
        return {
          mbti: "XXXX",
          descripcion: "No se pudo determinar con claridad",
          rasgos: ["indeterminado"],
          confianza: "bajo",
          originalFields: originalFields
        };
      }
      
      const mbtiPattern = /^[EI][NS][TF][JP]$/;
      const formattedMBTI = analysis.mbti.replace(/[^A-Za-z]/g, '').toUpperCase();
      
      const result = {
        mbti: mbtiPattern.test(formattedMBTI) ? formattedMBTI : "XXXX",
        descripcion: analysis.descripcion || "Personalidad inferida por el sistema",
        rasgos: Array.isArray(analysis.rasgos) 
          ? analysis.rasgos.map(r => typeof r === 'string' ? r.toLowerCase() : String(r))
          : ["adaptable", "orientado a resultados", "analítico"],
        confianza: analysis.confianza || "medio",
        originalFields: originalFields
      };
      
      return result;
    } catch (parseError) {
      const mbtiMatch = responseText.match(/\b([EI][NS][TF][JP])\b/i);
      if (mbtiMatch) {
        return {
          mbti: mbtiMatch[1].toUpperCase(),
          descripcion: "Tipo de personalidad inferido del análisis",
          rasgos: ["adaptable", "analítico", "comunicativo"],
          confianza: "bajo",
          rescatado: true,
          originalFields: originalFields
        };
      }
      
      return {
        mbti: "XXXX",
        descripcion: "Error en análisis de personalidad",
        rasgos: ["indeterminado"],
        confianza: "bajo",
        error: true,
        originalFields: originalFields
      };
    }
  } catch (error) {
    return {
      mbti: "XXXX",
      descripcion: "Error en inferencia MBTI",
      rasgos: ["indeterminado"],
      confianza: "bajo",
      error: true,
      originalFields: {
        nombre: profileData.nombre || profileData.Nombre || profileData.name || null,
        edad: profileData.edad || profileData.Edad || null,
        ubicacion: profileData.ubicacion || profileData.ciudad || profileData.pais || null,
        carrera: profileData.carrera || profileData.Carrera || null
      }
    };
  }
}

export { 
  generateMemorySummary,
  UniquenessMiddleware
};