// enhancedDuplicateDetection.js - VERSIÓN COMPLETA CON EMBEDDINGS INTELIGENTES
import pool from "../../../lib/dbPool.js";
import { supabase } from "../../../lib/supabaseService.js";
import { embeddings, openai } from '../../../lib/openai.js';

/**
 * ✅ CONFIGURACIÓN DE UMBRALES INTELIGENTES BASADOS EN EMBEDDINGS
 */
const INTELLIGENT_THRESHOLDS = {
  profiles: {
    duplicate: 0.95,      // 95%+ = Duplicado exacto
    similar: 0.85,        // 85-94% = Muy similar, posible duplicado
    related: 0.75,        // 75-84% = Relacionado, evaluar contexto
    unique: 0.75          // <75% = Único
  },
  contents: {
    duplicate: 0.92,      // 92%+ = Duplicado exacto
    similar: 0.82,        // 82-91% = Muy similar
    related: 0.70,        // 70-81% = Relacionado
    unique: 0.70          // <70% = Único
  },
  trends: {
    duplicate: 0.88,      // 88%+ = Duplicado exacto
    similar: 0.78,        // 78-87% = Muy similar
    related: 0.65,        // 65-77% = Relacionado
    unique: 0.65          // <65% = Único
  },
  memory: {
    duplicate: 0.90,      // 90%+ = Duplicado exacto
    similar: 0.80,        // 80-89% = Muy similar
    related: 0.65,        // 65-79% = Relacionado (fusionar)
    unique: 0.65          // <65% = Único
  }
};

/**
 * ✅ DETECCIÓN INTELIGENTE DE PERFILES USANDO EMBEDDINGS
 * Esta función integra toda la lógica de semanticComparison.js
 */
export async function isUniqueProfileIntelligent(profileData) {
  try {
    console.log("🧠 SISTEMA EMBEDDING: Verificando unicidad de perfil con IA...");
    
    // PASO 1: Generar embedding del nuevo perfil
    const profileEmbedding = await generateProfileEmbedding(profileData);
    if (!profileEmbedding) {
      console.log("⚠️ No se pudo generar embedding, usando análisis básico");
      return { isUnique: true, reason: "Sin embedding para comparación" };
    }
    
    // PASO 2: Buscar perfiles similares usando embedding
    const { data: similarProfiles, error } = await supabase.rpc('match_marketing_profiles', {
      query_embedding: profileEmbedding,
      match_count: 20
    });
    
    if (error) {
      console.error("Error en búsqueda por embedding:", error);
      return { isUnique: true, reason: "Error en búsqueda por embedding" };
    }
    
    if (!similarProfiles || similarProfiles.length === 0) {
      console.log("✅ No se encontraron perfiles similares por embedding");
      return { isUnique: true, reason: "Sin perfiles similares por embedding" };
    }
    
    console.log(`🔍 Encontrados ${similarProfiles.length} perfiles candidatos por embedding`);
    
    // PASO 3: Análisis inteligente de similitud
    for (const candidate of similarProfiles) {
      const similarity = candidate.similarity;
      
      console.log(`🔍 Analizando perfil ${candidate.id}: similitud embedding = ${(similarity * 100).toFixed(1)}%`);
      
      // DUPLICADO EXACTO
      if (similarity >= INTELLIGENT_THRESHOLDS.profiles.duplicate) {
        console.log(`❌ DUPLICADO EXACTO detectado (${(similarity * 100).toFixed(1)}%)`);
        return {
          isUnique: false,
          similarityScore: similarity,
          existingProfile: candidate,
          reason: "Perfil duplicado exacto detectado por embedding",
          analysisType: "embedding_exact_duplicate"
        };
      }
      
      // MUY SIMILAR - Análisis psicográfico detallado
      if (similarity >= INTELLIGENT_THRESHOLDS.profiles.similar) {
        console.log(`🔍 Perfil muy similar (${(similarity * 100).toFixed(1)}%), analizando psicográficamente...`);
        
        const psychographicAnalysis = await analyzePsychographicSimilarity(profileData, candidate.metadata);
        
        if (psychographicAnalysis.isDuplicate) {
          console.log(`❌ DUPLICADO PSICOGRÁFICO confirmado: ${psychographicAnalysis.reason}`);
          return {
            isUnique: false,
            similarityScore: similarity,
            existingProfile: candidate,
            reason: `Duplicado psicográfico: ${psychographicAnalysis.reason}`,
            psychographicDetails: psychographicAnalysis,
            analysisType: "embedding_psychographic_duplicate"
          };
        }
      }
      
      // RELACIONADO - Evaluar si es suficientemente diferente
      if (similarity >= INTELLIGENT_THRESHOLDS.profiles.related) {
        console.log(`⚠️ Perfil relacionado (${(similarity * 100).toFixed(1)}%), evaluando diferencias...`);
        
        const contextualAnalysis = await analyzeContextualDifferences(profileData, candidate.metadata);
        
        if (!contextualAnalysis.hasSufficientDifferences) {
          console.log(`❌ RELACIONADO SIN DIFERENCIAS SUFICIENTES: ${contextualAnalysis.reason}`);
          return {
            isUnique: false,
            similarityScore: similarity,
            existingProfile: candidate,
            reason: `Perfil relacionado sin diferencias significativas: ${contextualAnalysis.reason}`,
            contextualDetails: contextualAnalysis,
            analysisType: "embedding_contextual_duplicate"
          };
        }
        
        console.log(`✅ Perfil relacionado pero suficientemente diferente: ${contextualAnalysis.reason}`);
      }
    }
    
    console.log("✅ Perfil es único tras análisis completo con embedding");
    return { 
      isUnique: true, 
      reason: "Perfil único confirmado por análisis embedding + psicográfico",
      analysisType: "embedding_comprehensive_unique",
      candidatesAnalyzed: similarProfiles.length
    };
    
  } catch (error) {
    console.error("❌ Error en verificación inteligente de perfil:", error);
    return { isUnique: true, reason: "Error en verificación, permitiendo guardado" };
  }
}

/**
 * ✅ DETECCIÓN INTELIGENTE DE CONTENIDO MEJORADA CON EMBEDDINGS
 */
export async function isUniqueContentIntelligent(type, channel, payload) {
  try {
    console.log("🎨 SISTEMA EMBEDDING: Verificando unicidad de contenido con IA...");
    
    // PASO 1: Generar embedding del contenido
    const contentEmbedding = await generateContentEmbedding(type, channel, payload);
    if (!contentEmbedding) {
      console.log("⚠️ No se pudo generar embedding de contenido");
      return { isUnique: true, reason: "Sin embedding para comparación" };
    }
    
    // PASO 2: Buscar contenidos similares
    const { data: similarContents, error } = await supabase.rpc('match_marketing_contents', {
      query_embedding: contentEmbedding,
      match_count: 15
    });
    
    if (error) {
      console.error("Error en búsqueda de contenido por embedding:", error);
      return { isUnique: true, reason: "Error en búsqueda por embedding" };
    }
    
    if (!similarContents || similarContents.length === 0) {
      console.log("✅ No se encontraron contenidos similares por embedding");
      return { isUnique: true, reason: "Sin contenidos similares por embedding" };
    }
    
    console.log(`🔍 Encontrados ${similarContents.length} contenidos candidatos por embedding`);
    
    // PASO 3: Análisis por similitud de embedding
    for (const candidate of similarContents) {
      const similarity = candidate.similarity;
      
      console.log(`🔍 Analizando contenido ${candidate.id}: similitud = ${(similarity * 100).toFixed(1)}%`);
      
      // DUPLICADO EXACTO
      if (similarity >= INTELLIGENT_THRESHOLDS.contents.duplicate) {
        console.log(`❌ CONTENIDO DUPLICADO exacto (${(similarity * 100).toFixed(1)}%)`);
        return {
          isUnique: false,
          similarityScore: similarity,
          existingContent: candidate,
          reason: "Contenido duplicado exacto por embedding",
          analysisType: "embedding_exact_duplicate"
        };
      }
      
      // MUY SIMILAR - Análisis estructural
      if (similarity >= INTELLIGENT_THRESHOLDS.contents.similar) {
        console.log(`🔍 Contenido muy similar (${(similarity * 100).toFixed(1)}%), analizando estructura...`);
        
        const structuralAnalysis = await analyzeContentStructure(payload, candidate.payload);
        
        if (structuralAnalysis.isDuplicate) {
          console.log(`❌ DUPLICADO ESTRUCTURAL confirmado: ${structuralAnalysis.reason}`);
          return {
            isUnique: false,
            similarityScore: similarity,
            existingContent: candidate,
            reason: `Contenido estructuralmente duplicado: ${structuralAnalysis.reason}`,
            structuralDetails: structuralAnalysis,
            analysisType: "embedding_structural_duplicate"
          };
        }
      }
    }
    
    console.log("✅ Contenido es único tras análisis embedding");
    return { 
      isUnique: true, 
      reason: "Contenido único confirmado por embedding + análisis estructural",
      analysisType: "embedding_comprehensive_unique"
    };
    
  } catch (error) {
    console.error("❌ Error en verificación inteligente de contenido:", error);
    return { isUnique: true, reason: "Error en verificación, permitiendo guardado" };
  }
}

/**
 * ✅ DETECCIÓN INTELIGENTE DE TENDENCIAS CON EMBEDDINGS
 */
export async function isUniqueTrendIntelligent(theme, metadata = {}) {
  try {
    console.log("📊 SISTEMA EMBEDDING: Verificando unicidad de tendencia con IA...");
    
    // PASO 1: Generar embedding de la tendencia
    const trendEmbedding = await generateTrendEmbedding(theme, metadata);
    if (!trendEmbedding) {
      console.log("⚠️ No se pudo generar embedding de tendencia");
      return { isUnique: true, reason: "Sin embedding para comparación" };
    }
    
    // PASO 2: Buscar tendencias similares usando SQL directo optimizado
    const query = `
      SELECT 
        id, theme, metadata,
        1 - (embedding <=> $1::vector(1536)) AS similarity
      FROM marketing_trends
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector(1536)
      LIMIT 15
    `;
    
    const result = await pool.query(query, [`[${trendEmbedding.join(',')}]`]);
    const similarTrends = result.rows;
    
    if (similarTrends.length === 0) {
      console.log("✅ No se encontraron tendencias similares por embedding");
      return { isUnique: true, reason: "Sin tendencias similares por embedding" };
    }
    
    console.log(`🔍 Encontradas ${similarTrends.length} tendencias candidatas por embedding`);
    
    // PASO 3: Análisis por similitud
    for (const candidate of similarTrends) {
      const similarity = candidate.similarity;
      
      console.log(`🔍 Analizando tendencia ${candidate.id}: similitud = ${(similarity * 100).toFixed(1)}%`);
      
      // DUPLICADO EXACTO
      if (similarity >= INTELLIGENT_THRESHOLDS.trends.duplicate) {
        console.log(`❌ TENDENCIA DUPLICADA exacta (${(similarity * 100).toFixed(1)}%)`);
        return {
          isUnique: false,
          similarityScore: similarity,
          existingTrend: candidate,
          reason: "Tendencia duplicada exacta por embedding",
          analysisType: "embedding_exact_duplicate"
        };
      }
      
      // MUY SIMILAR - Análisis conceptual
      if (similarity >= INTELLIGENT_THRESHOLDS.trends.similar) {
        console.log(`🔍 Tendencia muy similar (${(similarity * 100).toFixed(1)}%), analizando conceptos...`);
        
        const conceptualAnalysis = await analyzeConceptualSimilarity(theme, metadata, candidate.theme, candidate.metadata);
        
        if (conceptualAnalysis.isDuplicate) {
          console.log(`❌ DUPLICADO CONCEPTUAL confirmado: ${conceptualAnalysis.reason}`);
          return {
            isUnique: false,
            similarityScore: similarity,
            existingTrend: candidate,
            reason: `Tendencia conceptualmente duplicada: ${conceptualAnalysis.reason}`,
            conceptualDetails: conceptualAnalysis,
            analysisType: "embedding_conceptual_duplicate"
          };
        }
      }
    }
    
    console.log("✅ Tendencia es única tras análisis embedding");
    return { 
      isUnique: true, 
      reason: "Tendencia única confirmada por embedding + análisis conceptual",
      analysisType: "embedding_comprehensive_unique"
    };
    
  } catch (error) {
    console.error("❌ Error en verificación inteligente de tendencia:", error);
    return { isUnique: true, reason: "Error en verificación, permitiendo guardado" };
  }
}

/**
 * ✅ DETECCIÓN INTELIGENTE DE INSIGHTS CON EMBEDDINGS MEJORADA
 */
export async function isUniqueInsightIntelligent(newInsight) {
  try {
    console.log("🧠 SISTEMA EMBEDDING: Verificando unicidad de insight con IA...");
    
    // PASO 1: Generar embedding del insight
    const insightEmbedding = await generateInsightEmbedding(newInsight);
    if (!insightEmbedding) {
      console.log("⚠️ No se pudo generar embedding de insight");
      return { isUnique: true, reason: "Sin embedding para comparación" };
    }
    
    // PASO 2: Buscar insights similares
    const { data: similarInsights, error } = await supabase.rpc('search_marketing_memory', {
      query_embedding: insightEmbedding,
      memory_type: null,
      match_count: 20
    });
    
    if (error) {
      console.error("Error en búsqueda de insight por embedding:", error);
      return { isUnique: true, reason: "Error en búsqueda por embedding" };
    }
    
    if (!similarInsights || similarInsights.length === 0) {
      console.log("✅ No se encontraron insights similares por embedding");
      return { isUnique: true, reason: "Sin insights similares por embedding" };
    }
    
    console.log(`🔍 Encontrados ${similarInsights.length} insights candidatos por embedding`);
    
    // PASO 3: Análisis por similitud
    for (const candidate of similarInsights) {
      const similarity = candidate.similarity;
      
      console.log(`🔍 Analizando insight ${candidate.id}: similitud = ${(similarity * 100).toFixed(1)}%`);
      
      // DUPLICADO EXACTO
      if (similarity >= INTELLIGENT_THRESHOLDS.memory.duplicate) {
        console.log(`❌ INSIGHT DUPLICADO exacto (${(similarity * 100).toFixed(1)}%)`);
        return {
          isUnique: false,
          similarityScore: similarity,
          existingInsight: candidate,
          reason: "Insight duplicado exacto por embedding",
          analysisType: "embedding_exact_duplicate"
        };
      }
      
      // MUY SIMILAR - Rechazar
      if (similarity >= INTELLIGENT_THRESHOLDS.memory.similar) {
        console.log(`❌ INSIGHT MUY SIMILAR rechazado (${(similarity * 100).toFixed(1)}%)`);
        return {
          isUnique: false,
          similarityScore: similarity,
          existingInsight: candidate,
          reason: "Insight muy similar rechazado por embedding",
          analysisType: "embedding_similar_rejected"
        };
      }
      
      // RELACIONADO - Candidato para fusión
      if (similarity >= INTELLIGENT_THRESHOLDS.memory.related) {
        console.log(`🔗 INSIGHT RELACIONADO para fusión (${(similarity * 100).toFixed(1)}%)`);
        
        const fusionAnalysis = await analyzeFusionPotential(newInsight, candidate.content);
        
        if (fusionAnalysis.shouldFuse) {
          console.log(`🔗 FUSIÓN RECOMENDADA: ${fusionAnalysis.reason}`);
          return {
            isUnique: false,
            shouldFuse: true,
            similarityScore: similarity,
            existingInsight: candidate,
            reason: `Insight complementario para fusión: ${fusionAnalysis.reason}`,
            fusionDetails: fusionAnalysis,
            analysisType: "embedding_fusion_candidate"
          };
        }
      }
    }
    
    console.log("✅ Insight es único tras análisis embedding");
    return { 
      isUnique: true, 
      reason: "Insight único confirmado por embedding",
      analysisType: "embedding_comprehensive_unique"
    };
    
  } catch (error) {
    console.error("❌ Error en verificación inteligente de insight:", error);
    return { isUnique: true, reason: "Error en verificación, permitiendo guardado" };
  }
}

// =============== FUNCIONES DE GENERACIÓN DE EMBEDDINGS ===============

/**
 * ✅ GENERA EMBEDDING OPTIMIZADO PARA PERFILES
 */
async function generateProfileEmbedding(profileData) {
  try {
    let profileText = "";
    
    if (typeof profileData === 'string') {
      profileText = profileData;
    } else if (typeof profileData === 'object' && profileData !== null) {
      const parts = [];
      
      if (profileData.personalidad) {
        parts.push(`Personalidad: ${JSON.stringify(profileData.personalidad)}`);
      }
      if (profileData.tipo_personalidad) {
        parts.push(`MBTI: ${profileData.tipo_personalidad}`);
      }
      
      // IMPORTANTE: Comportamiento y objetivos
      if (profileData.hobbies) {
        parts.push(`Hobbies: ${Array.isArray(profileData.hobbies) ? profileData.hobbies.join(', ') : profileData.hobbies}`);
      }
      if (profileData.objetivo_profesional) {
        parts.push(`Objetivo: ${profileData.objetivo_profesional}`);
      }
      if (profileData.conducta_digital) {
        parts.push(`Digital: ${profileData.conducta_digital}`);
      }
      
      // MODERADO: Demografía
      if (profileData.carrera) {
        parts.push(`Carrera: ${profileData.carrera}`);
      }
      if (profileData.edad) {
        parts.push(`Edad: ${profileData.edad}`);
      }
      if (profileData.ciudad) {
        parts.push(`Ubicación: ${profileData.ciudad}`);
      }
      
      profileText = parts.join(' | ');
    }
    
    if (!profileText || profileText.length < 10) {
      return null;
    }
    
    const vector = await embeddings.embedQuery(profileText);
    return vector;
    
  } catch (error) {
    console.error("Error generando embedding de perfil:", error);
    return null;
  }
}

/**
 * ✅ GENERA EMBEDDING OPTIMIZADO PARA CONTENIDO
 */
async function generateContentEmbedding(type, channel, payload) {
  try {
    const parts = [
      `Tipo: ${type}`,
      `Canal: ${channel}`
    ];
    
    if (payload) {
      if (payload.theme) parts.push(`Tema: ${payload.theme}`);
      if (payload.title || payload.titulo) parts.push(`Título: ${payload.title || payload.titulo}`);
      if (payload.description || payload.descripcion) parts.push(`Descripción: ${payload.description || payload.descripcion}`);
      if (payload.concept || payload.concepto) parts.push(`Concepto: ${payload.concept || payload.concepto}`);
      if (payload.hashtags) parts.push(`Tags: ${Array.isArray(payload.hashtags) ? payload.hashtags.join(', ') : payload.hashtags}`);
      
      if (payload.video && payload.video.titulo) parts.push(`Video: ${payload.video.titulo}`);
      if (payload.meme && payload.meme.titulo) parts.push(`Meme: ${payload.meme.titulo}`);
      if (payload.email && payload.email.subject) parts.push(`Email: ${payload.email.subject}`);
    }
    
    const contentText = parts.join(' | ');
    
    if (contentText.length < 20) {
      return null;
    }
    
    const vector = await embeddings.embedQuery(contentText);
    return vector;
    
  } catch (error) {
    console.error("Error generando embedding de contenido:", error);
    return null;
  }
}

/**
 * ✅ GENERA EMBEDDING OPTIMIZADO PARA TENDENCIAS
 */
async function generateTrendEmbedding(theme, metadata) {
  try {
    const parts = [`Tendencia: ${theme}`];
    
    if (metadata) {
      if (metadata.categoria) parts.push(`Categoría: ${metadata.categoria}`);
      if (metadata.target_audience) parts.push(`Audiencia: ${metadata.target_audience}`);
      if (metadata.keywords) parts.push(`Keywords: ${Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords}`);
      if (metadata.description) parts.push(`Descripción: ${metadata.description}`);
    }
    
    const trendText = parts.join(' | ');
    const vector = await embeddings.embedQuery(trendText);
    return vector;
    
  } catch (error) {
    console.error("Error generando embedding de tendencia:", error);
    return null;
  }
}

/**
 * ✅ GENERA EMBEDDING OPTIMIZADO PARA INSIGHTS
 */
async function generateInsightEmbedding(insightData) {
  try {
    let insightText = "";
    
    if (typeof insightData === 'string') {
      insightText = insightData;
    } else if (insightData && insightData.insight) {
      insightText = insightData.insight;
      
      if (insightData.type) insightText += ` | Tipo: ${insightData.type}`;
      if (insightData.source) insightText += ` | Fuente: ${insightData.source}`;
      if (insightData.context) insightText += ` | Contexto: ${insightData.context}`;
    } else if (typeof insightData === 'object') {
      insightText = JSON.stringify(insightData);
    }
    
    if (!insightText || insightText.length < 10) {
      return null;
    }
    
    const vector = await embeddings.embedQuery(insightText);
    return vector;
    
  } catch (error) {
    console.error("Error generando embedding de insight:", error);
    return null;
  }
}

// =============== FUNCIONES DE ANÁLISIS AVANZADO ===============

/**
 * ✅ ANÁLISIS PSICOGRÁFICO PROFUNDO
 */
async function analyzePsychographicSimilarity(newProfile, existingProfile) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content: `Eres un experto en análisis psicográfico para marketing. 
          Compara dos perfiles de estudiantes y determina si son psicográficamente duplicados.
          
          Factores CRÍTICOS (peso alto):
          - Personalidad MBTI 
          - Objetivos profesionales
          - Comportamiento digital
          - Hobbies e intereses
          
          Factores MENORES (peso bajo):
          - Edad (diferencia de 1-2 años es normal)
          - Ubicación 
          - Nombre
          
          Responde SOLO con JSON:
          {
            "isDuplicate": boolean,
            "reason": "explicación breve",
            "confidence": "alto/medio/bajo",
            "criticalFactorsMatch": number // 0-4
          }`
        },
        {
          role: "user",
          content: `Nuevo perfil: ${JSON.stringify(newProfile)}\n\nPerfil existente: ${JSON.stringify(existingProfile)}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error en análisis psicográfico:", error);
    return { isDuplicate: false, reason: "Error en análisis", confidence: "bajo" };
  }
}

/**
 * ✅ ANÁLISIS CONTEXTUAL DE DIFERENCIAS
 */
async function analyzeContextualDifferences(newProfile, existingProfile) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18", 
      messages: [
        {
          role: "system",
          content: `Analiza si dos perfiles tienen diferencias contextuales suficientes para ser considerados únicos.
          
          Evalúa:
          - Diferencias en objetivos específicos
          - Variaciones en comportamiento digital
          - Contexto educativo diferente
          - Matices en personalidad
          
          Responde SOLO con JSON:
          {
            "hasSufficientDifferences": boolean,
            "reason": "explicación específica",
            "keyDifferences": ["diferencia1", "diferencia2"],
            "contextualUniqueness": "alto/medio/bajo"
          }`
        },
        {
          role: "user",
          content: `Perfil A: ${JSON.stringify(newProfile)}\n\nPerfil B: ${JSON.stringify(existingProfile)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error en análisis contextual:", error);
    return { hasSufficientDifferences: true, reason: "Error en análisis", contextualUniqueness: "medio" };
  }
}

/**
 * ✅ ANÁLISIS ESTRUCTURAL DE CONTENIDO
 */
async function analyzeContentStructure(newPayload, existingPayload) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system", 
          content: `Compara la estructura y elementos clave de dos contenidos para detectar duplicación.
          
          Evalúa:
          - Tema central idéntico
          - Estructura narrativa similar
          - Elementos creativos repetidos
          - Call-to-action duplicado
          
          Responde SOLO con JSON:
          {
            "isDuplicate": boolean,
            "reason": "explicación específica",
            "structuralSimilarity": "alta/media/baja",
            "uniqueElements": ["elemento1", "elemento2"]
          }`
        },
        {
          role: "user",
          content: `Contenido nuevo: ${JSON.stringify(newPayload)}\n\nContenido existente: ${JSON.stringify(existingPayload)}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error en análisis estructural:", error);
    return { isDuplicate: false, reason: "Error en análisis", structuralSimilarity: "baja" };
  }
}

/**
 * ✅ ANÁLISIS CONCEPTUAL DE TENDENCIAS
 */
async function analyzeConceptualSimilarity(newTheme, newMetadata, existingTheme, existingMetadata) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content: `Compara dos tendencias para detectar si son conceptualmente duplicadas.
          
          Evalúa:
          - Tema central idéntico o muy similar
          - Audiencia objetivo igual
          - Conceptos clave repetidos
          - Timing y contexto similar
          
          Responde SOLO con JSON:
          {
            "isDuplicate": boolean,
            "reason": "explicación específica", 
            "conceptualOverlap": "alto/medio/bajo",
            "uniqueAspects": ["aspecto1", "aspecto2"]
          }`
        },
        {
          role: "user",
          content: `Nueva tendencia: ${newTheme} | ${JSON.stringify(newMetadata)}\n\nTendencia existente: ${existingTheme} | ${JSON.stringify(existingMetadata)}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error en análisis conceptual:", error);
    return { isDuplicate: false, reason: "Error en análisis", conceptualOverlap: "bajo" };
  }
}

/**
 * ✅ ANÁLISIS DE POTENCIAL DE FUSIÓN
 */
async function analyzeFusionPotential(newInsight, existingInsight) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content: `Determina si dos insights pueden fusionarse de manera beneficiosa.
          
          Considera:
          - Insights complementarios (no duplicados)
          - Valor agregado de la fusión
          - Coherencia temática
          - Enriquecimiento mutuo
          
          Responde SOLO con JSON:
          {
            "shouldFuse": boolean,
            "reason": "explicación específica",
            "fusionValue": "alto/medio/bajo",
            "fusionType": "complementary/supplementary/enriching"
          }`
        },
        {
          role: "user",
          content: `Nuevo insight: ${JSON.stringify(newInsight)}\n\nInsight existente: ${JSON.stringify(existingInsight)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error en análisis de fusión:", error);
    return { shouldFuse: false, reason: "Error en análisis", fusionValue: "bajo" };
  }
}

/**
 * ✅ FUNCIÓN DE ESTADÍSTICAS INTELIGENTES
 */
export async function getIntelligentDuplicationStats() {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM marketing_profiles WHERE embedding IS NOT NULL'),
      pool.query('SELECT COUNT(*) as total FROM marketing_contents WHERE embedding IS NOT NULL'),  
      pool.query('SELECT COUNT(*) as total FROM marketing_trends WHERE embedding IS NOT NULL'),
      pool.query('SELECT COUNT(*) as total FROM marketing_memory WHERE embedding IS NOT NULL'),
      
      // Análisis de similitud promedio por embedding
      pool.query(`
        SELECT AVG(similarity) as avg_similarity
        FROM (
          SELECT 1 - (a.embedding <=> b.embedding) as similarity
          FROM marketing_profiles a, marketing_profiles b 
          WHERE a.id != b.id AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
          LIMIT 100
        ) similarities
      `),
      
      pool.query(`
        SELECT AVG(similarity) as avg_similarity
        FROM (
          SELECT 1 - (a.embedding <=> b.embedding) as similarity
          FROM marketing_contents a, marketing_contents b 
          WHERE a.id != b.id AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
          LIMIT 100
        ) similarities
      `)
    ]);
    
    return {
      profiles: parseInt(stats[0].rows[0].total),
      contents: parseInt(stats[1].rows[0].total),
      trends: parseInt(stats[2].rows[0].total),
      memory: parseInt(stats[3].rows[0].total),
      avgProfileSimilarity: parseFloat(stats[4].rows[0]?.avg_similarity || 0),
      avgContentSimilarity: parseFloat(stats[5].rows[0]?.avg_similarity || 0),
      timestamp: new Date().toISOString(),
      systemType: "intelligent_embedding_based",
      thresholds: INTELLIGENT_THRESHOLDS,
      features: {
        embeddingSearch: "Búsqueda semántica avanzada con vectores",
        psychographicAnalysis: "Análisis psicográfico profundo con IA",
        contextualEvaluation: "Evaluación contextual de diferencias",
        intelligentFusion: "Fusión inteligente de insights complementarios"
      }
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas inteligentes:", error);
    return null;
  }
}