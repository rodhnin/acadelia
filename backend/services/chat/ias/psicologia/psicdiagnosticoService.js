// ============================================================================
// 🧠🦫 PROFESOR ACADEL PSICOLOGÍA - SISTEMA ACADÉMICO REVOLUCIONARIO OPTIMIZADO
// ============================================================================
// EL CAPIBARA MÁS SABIO DEL UNIVERSO PSICOLÓGICO - PROFESOR DE TEORÍA Y TÉCNICA DE EXPLORACIÓN Y DIAGNÓSTICO SUPREMO
// Sistema optimizado con Knowledge Base como cerebro principal y ejecución paralela
// Especialidades: Evaluación Psicológica ✅ Diagnóstico Clínico ✅ Técnicas Proyectivas ✅ Tests Psicométricos ✅
// ============================================================================

import { supabase } from "../../../../lib/supabaseService.js";
import { SupabaseHybridSearch } from "@langchain/community/retrievers/supabase";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { llm, embeddings, openai } from "../../../../lib/openai.js";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { DallEAPIWrapper } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { cleanDocumentContextForPrompt } from '../../../../utils/chat/contentCleaner.js';
import { z } from "zod";
import { formatDocumentsAsString } from "langchain/util/document";
import { saveMessage, saveMultimodalMessage } from "../../../../utils/chat/chat.js";
import { loadHybridChatMemory, formatHybridMemoryForPrompt } from "../../../../utils/chat/hybridChatMemory.js";
import pool from "../../../../lib/dbPool.js";
import { wasRequestCancelled, clearCancellationFlag } from "../../chatServices.js";
import { imageStorageService } from '../../imageStorageService.js';
import { documentStorageService } from '../../documentStorageService.js';
import { createMultimodalMessageReference } from '../../../../utils/chat/documentReferenceHelper.js';

// ============================================================================
// 🚀 SISTEMA DE CACHE INTELIGENTE CENTRALIZADO
// ============================================================================
import { intelligentCache, generateContentHash, isCacheable, categorizeQuery } from '../../../../utils/chat/AcadelCache.js';

// ============================================================================
// 🌟 BRAVE SEARCH ORCHESTRATOR INTEGRADO
// ============================================================================

class BraveSearchOrchestrator {
  constructor() {
    this.apiKey = process.env.BRAVE_SEARCH_API_KEY;
    this.baseUrl = 'https://api.search.brave.com/res/v1';
    
    this.rateLimit = {
      requests: 0,
      lastRequest: 0,
      requestsThisMonth: 0,
      monthStart: Date.now(),
      maxPerSecond: 1.2,
      maxPerMonth: 2000,
      cooldownMs: 800
    };
    
    this.defaultConfig = {
      country: 'mx',
      search_lang: 'es',
      safesearch: 'strict',
      safesearch_images: 'strict',
      spellcheck: 1
    };
    
    if (!this.apiKey) {
      console.warn('⚠️ BRAVE_SEARCH_API_KEY no configurada. Usando fallbacks.');
    }
  }
  
  async checkRateLimit() {
    const now = Date.now();
    
    if (now - this.rateLimit.monthStart > 30 * 24 * 60 * 60 * 1000) {
      this.rateLimit.requestsThisMonth = 0;
      this.rateLimit.monthStart = now;
    }
    
    if (this.rateLimit.requestsThisMonth >= this.rateLimit.maxPerMonth) {
      throw new Error('Límite mensual de Brave Search alcanzado');
    }
    
    const timeSinceLastRequest = now - this.rateLimit.lastRequest;
    if (timeSinceLastRequest < this.rateLimit.cooldownMs) {
      const waitTime = this.rateLimit.cooldownMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimit.lastRequest = Date.now();
    this.rateLimit.requests++;
    this.rateLimit.requestsThisMonth++;
  }
  
  cleanQuery(query) {
    return query
      .trim()
      .replace(/[^\w\s\-_\.áéíóúüñ]/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 200);
  }
  
  async searchWeb(query, options = {}) {
    if (!this.apiKey) {
      throw new Error('Brave Search API key no configurada');
    }
    
    // ✅ CACHE CHECK CORRECTO usando generateContentHash
    const searchKey = { type: 'web', query, options };
    const cacheKey = generateContentHash(searchKey);
    
    const cached = intelligentCache.getBraveSearch(query, 'web', options);
    if (cached) {
      console.log(`📦 Brave Web Search CACHE HIT: "${query.substring(0, 40)}..."`);
      return cached.result;
    }
    
    await this.checkRateLimit();
    
    const cleanQuery = this.cleanQuery(query);
    const {
      count = 6,
      country = this.defaultConfig.country,
      search_lang = this.defaultConfig.search_lang,
      safesearch = this.defaultConfig.safesearch,
      spellcheck = this.defaultConfig.spellcheck,
      freshness = null
    } = options;
    
    const params = new URLSearchParams({
      q: cleanQuery,
      count: count.toString(),
      country,
      search_lang,
      safesearch,
      spellcheck: spellcheck.toString()
    });
    
    if (freshness) {
      params.append('freshness', freshness);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      console.log(`🌟 Brave Web Search API CALL: "${query.substring(0, 40)}..."`);
      
      const response = await fetch(`${this.baseUrl}/web/search?${params}`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'Mozilla/5.0 (compatible; AcadelBot/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const result = {
        results: (data.web?.results || []).map(result => ({
          title: result.title || 'Sin título',
          url: result.url,
          snippet: result.description || '',
          source: 'Brave Search',
          domain: this.extractDomain(result.url),
          quality: this.calculatePsychologyQuality(result)
        })),
        totalResults: data.web?.results?.length || 0,
        query: data.query?.original || cleanQuery,
        provider: 'brave_web',
        cachedAt: Date.now()
      };
      
      // ✅ CACHE SET CORRECTO
      intelligentCache.setBraveSearch(query, result, 'web', options, {
        hash: cacheKey,
        searchType: 'web',
        timestamp: Date.now()
      });
      
      console.log(`💾 Brave Web Search CACHED: "${query.substring(0, 40)}..." (${result.results.length} resultados)`);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  async searchImages(query, options = {}) {
    if (!this.apiKey) {
      throw new Error('Brave Search API key no configurada');
    }
    
    // ✅ CACHE CHECK CORRECTO usando generateContentHash
    const searchKey = { type: 'images', query, options };
    const cacheKey = generateContentHash(searchKey);
    
    const cached = intelligentCache.getBraveSearch(query, 'images', options);
    if (cached) {
      console.log(`📦 Brave Images Search CACHE HIT: "${query.substring(0, 40)}..."`);
      return cached.result;
    }
    
    await this.checkRateLimit();
    
    const cleanQuery = this.cleanQuery(query);
    const {
      count = 8,
      country = this.defaultConfig.country,
      search_lang = this.defaultConfig.search_lang,
      safesearch = this.defaultConfig.safesearch_images,
      spellcheck = this.defaultConfig.spellcheck
    } = options;
    
    const params = new URLSearchParams({
      q: cleanQuery,
      count: count.toString(),
      country,
      search_lang,
      safesearch,
      spellcheck: spellcheck.toString()
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
      console.log(`🖼️ Brave Images Search API CALL: "${query.substring(0, 40)}..."`);
      
      const response = await fetch(`${this.baseUrl}/images/search?${params}`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'Mozilla/5.0 (compatible; AcadelBot/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Brave Search Images API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const result = {
        results: (data.results || []).map(result => ({
          title: result.title || 'Imagen sin título',
          url: result.url,
          thumbnailUrl: result.thumbnail?.src,
          imageUrl: result.properties?.url,
          source: result.source || 'Desconocido',
          domain: this.extractDomain(result.url)
        })),
        totalResults: data.results?.length || 0,
        query: data.query?.original || cleanQuery,
        provider: 'brave_images',
        cachedAt: Date.now()
      };
      
      // ✅ CACHE SET CORRECTO
      intelligentCache.setBraveSearch(query, result, 'images', options, {
        hash: cacheKey,
        searchType: 'images',
        timestamp: Date.now()
      });
      
      console.log(`💾 Brave Images Search CACHED: "${query.substring(0, 40)}..." (${result.results.length} imágenes)`);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown.domain';
    }
  }
  
  calculatePsychologyQuality(result) {
    let score = 1;
    
    const trustedDomains = [
      'apa.org', 'psych.org', 'scielo.org', 'redalyc.org',
      'elsevier.es', 'psycnet.apa.org', 'pubmed.ncbi.nlm.nih.gov',
      'ncbi.nlm.nih.gov', 'who.int', 'paho.org',
      'psicologia-online.com', 'cop.es', 'colegiodepsicologos.com',
      'pearsonassessments.com', 'tea-ediciones.es', 'psicotools.com',
      'wisc-v.com', 'wais-iv.com', 'mmpi-2.com',
      'rorschach.org', 'thematicapperceptiontest.com'
    ];
    
    if (trustedDomains.some(domain => result.url.includes(domain))) {
      score += 3;
    }
    
    const psychologyTerms = ['psicología', 'evaluación psicológica', 'diagnóstico', 'tests psicológicos', 'técnicas proyectivas', 'psychology', 'psychological assessment', 'psychometrics', 'clinical psychology', 'evaluación clínica', 'entrevista psicológica'];
    const titleScore = psychologyTerms.filter(term => 
      (result.title || '').toLowerCase().includes(term)
    ).length;
    score += titleScore;
    
    return score;
  }
}

const braveSearchOrchestrator = new BraveSearchOrchestrator();

// ============================================================================
// 🧠🦫 PROFESOR ACADEL PSICOLOGÍA DNA - PERSONALIDAD DEL CAPIBARA ESPECIALISTA SUPREMO
// ============================================================================

const PROFESOR_ACADEL_DNA = `
🧠🦫 TU IDENTIDAD COMO ACADEL - PROFESOR DE TEORÍA Y TÉCNICA DE EXPLORACIÓN Y DIAGNÓSTICO SUPREMO:

Eres ACADEL, un capibara extraordinario que se convirtió en el psicólogo más brillante del universo en las disciplinas fundamentales del diagnóstico psicológico:
- 📊 **EVALUACIÓN PSICOLÓGICA**: Maestro en principios psicométricos, confiabilidad, validez, estandarización, aplicación e interpretación de baterías psicológicas
- 🎯 **DIAGNÓSTICO CLÍNICO**: Experto en entrevista clínica, observación sistemática, proceso diagnóstico, marcos teóricos integrados
- 🎨 **TÉCNICAS PROYECTIVAS**: Autoridad en Rorschach, TAT, CAT, Test de la Figura Humana, técnicas gráficas, interpretación proyectiva
- 📈 **TESTS PSICOMÉTRICOS**: Especialista en WAIS, WISC, MMPI, 16PF, tests de personalidad, inteligencia, neuropsicológicos

No eres una IA genérica - eres una PERSONALIDAD que revoluciona la educación psicológica integrando evaluación, diagnóstico y técnicas.

🎯 TU PERSONALIDAD DISTINTIVA PSICOLÓGICA PROFESIONAL:
- PROFESOR REAL, SÉ TÉCNICO, LOS ESTUDIANTES SON FUTUROS PSICÓLOGOS CLÍNICOS.
- En el chat tienes un emoji especial usando 🦫 que representa un capibara

🧠 TU METODOLOGÍA PEDAGÓGICA PSICOLÓGICA INTEGRADA:
1. DIAGNOSTICAS EL PROBLEMA REAL del estudiante (conceptual, técnico o aplicado)
2. VERIFICAS COMPRENSIÓN con casos clínicos que combinen evaluación, técnicas y diagnóstico
3. DAS EJEMPLOS PRÁCTICOS que consoliden el conocimiento psicológico integrado

🔧 TUS CAPACIDADES TÉCNICAS PSICOLÓGICAS INTEGRADAS:
- Dominas EVALUACIÓN: Principios psicométricos, diseño de baterías, interpretación estadística, normas y baremos
- Dominas DIAGNÓSTICO: Entrevista estructurada, observación, criterios diagnósticos, diagnóstico diferencial
- Dominas TÉCNICAS PROYECTIVAS: Aplicación, interpretación, análisis de contenido, análisis formal
- Dominas TESTS PSICOMÉTRICOS: Aplicación, corrección, interpretación, integración de resultados
- INTEGRAS las disciplinas naturalmente: "Esta puntuación psicométrica se relaciona así con la presentación clínica y se confirma con estos indicadores proyectivos"
- Usas diagramas Mermaid para procesos diagnósticos, interpretación de tests y casos clínicos
- Generas casos clínicos reales y ejercicios de interpretación integrados
- Analizas protocolos de tests, perfiles psicológicos y reportes
- Creas algoritmos de evaluación y diagnóstico integrados

⚡ TU MISIÓN EDUCATIVA PSICOLÓGICA INTEGRADA:
Hacer que CUALQUIER estudiante de psicología:
1. ENTIENDA la conexión natural entre evaluación, diagnóstico y técnicas
2. DESARROLLE pensamiento clínico integrado (no pensamiento fragmentado)
3. GANE CONFIANZA en el manejo de instrumentos psicológicos
4. APLIQUE conocimientos integrados a casos clínicos reales

¡RECUERDA: No eres solo un tutor de tests, eres EL PROFESOR que integra evaluación, diagnóstico y técnicas como la psicología clínica real!
`;

// ============================================================================
// 📝 PROMPTS CONSOLIDADOS DE PSICOLOGÍA - REUTILIZABLES PARA TODAS LAS FUNCIONES
// ============================================================================

// 🔍 PROMPT SYSTEM PARA ANÁLISIS DE IMÁGENES PSICOLÓGICAS
const image_ANALYSIS_SYSTEM = `Eres la MENTE ANALÍTICA TÉCNICA de Acadel en Teoría y Técnica de Exploración y Diagnóstico Psicológico.

🎯 FUNCIÓN: Analizar imágenes psicológicas (tests, protocolos, casos clínicos, técnicas proyectivas) con precisión clínica extrema.

✅ TU ROL PSICOLÓGICO:
- Observador meticuloso de protocolos de tests, respuestas proyectivas y material clínico
- Transcriptor preciso de información en evaluación y diagnóstico psicológico
- Detector de elementos en tests psicométricos, técnicas proyectivas y observación clínica
- Identificador de problemas y errores en aplicación e interpretación
- Reportero técnico exhaustivo en evaluación psicológica

🚫 NO HAGAS:
- No enseñes ni expliques conceptos psicológicos
- No uses personalidad o humor clínico
- No actúes como psicólogo pedagógico
- No interpretes clínicamente de forma educativa

📊 SÍ HAZ:
- Transcribe con precisión perfecta hallazgos en tests y protocolos
- Identifica TODOS los elementos relevantes en evaluación psicológica
- Describe objetivamente lo observado en material clínico
- Detecta errores e inconsistencias en aplicación o interpretación
- Proporciona análisis técnico completo de material psicológico

Eres los OJOS ANALÍTICOS de Acadel - él interpretará tu análisis con su sabiduría clínica.`;

// 🔍 PROMPT USER PARA ANÁLISIS DE IMÁGENES PSICOLÓGICAS (analysisContext)
const image_ANALYSIS_USER_CONTEXT = `Eres la MENTE ANALÍTICA AVANZADA de Acadel, el capibara psicólogo más brillante del universo en evaluación y diagnóstico psicológico.

🔍 TU MISIÓN: Extraer MÁXIMA información psicológica de esta imagen clínica para que Acadel pueda enseñar efectivamente evaluación y diagnóstico integrado.

📋 ANÁLISIS PSICOLÓGICO REQUERIDO (SÉ EXTREMADAMENTE DETALLADO):

🧠 **HALLAZGOS EN EVALUACIÓN Y DIAGNÓSTICO:**
- Identifica tipo de test o técnica (psicométrico, proyectivo, entrevista, observación)
- Transcribe TODA información visible en protocolos, hojas de respuesta, perfiles
- Describe respuestas del evaluado, puntuaciones, percentiles, interpretaciones
- Nota características de aplicación, corrección o interpretación observadas
- Identifica signos clínicos, indicadores psicopatológicos o patrones específicos

📚 **ELEMENTOS ACADÉMICOS PSICOLÓGICOS:**
- Identifica tipo de material (manual de test, protocolo, caso clínico, etc.)
- Transcribe TODO el texto visible (instrucciones, respuestas, interpretaciones)
- Describe técnicas de aplicación, materiales de evaluación, formatos utilizados
- Identifica nivel académico aparente y área psicológica específica
- Nota elementos didácticos (señalizaciones, anotaciones, códigos) en material psicológico

🔬 **DETALLES ESPECÍFICOS PSICOLÓGICOS:**
- Identifica si es contenido de evaluación, diagnóstico, interpretación o formación clínica
- Describe instrumentos, materiales, equipos de evaluación psicológica visibles
- Nota escalas, baremos, normas, criterios diagnósticos o estadísticas
- Identifica métodos de evaluación, técnicas proyectivas, observación clínica
- Describe calidad técnica del material psicológico

⚠️ **ERRORES Y PROBLEMAS CLÍNICOS:**
- Señala inconsistencias en aplicación, corrección o interpretación
- Identifica errores en procedimientos psicológicos o criterios diagnósticos
- Nota información faltante o ambigua en evaluación
- Describe cualquier problema técnico o de calidad en material clínico
- Identifica posibles artefactos o elementos confusos en tests

📝 **CONTEXTO EDUCATIVO PSICOLÓGICO:**
- Determina si es: manual de test, caso clínico, ejercicio práctico, protocolo, interpretación
- Identifica dificultades potenciales para estudiantes de psicología clínica
- Nota elementos que necesitan explicación adicional en evaluación
- Describe relevancia pedagógica y nivel de complejidad clínica

🎯 **FORMATO DE SALIDA PSICOLÓGICO:**
Proporciona un análisis estructurado, preciso y exhaustivo que permita a Acadel entender completamente qué está viendo clínicamente y enseñar efectivamente evaluación y diagnóstico psicológico integrado.

**IMPORTANTE:** Sé OBSERVADOR, PRECISO y DETALLADO en material psicológico. No enseñes ni expliques - solo analiza y reporta hallazgos clínicos. Acadel se encargará de la pedagogía clínica pero necesita que seas muy detallista con todo lo que observas en la imagen.`;

// 🎯 PROMPT UNIFICADO PARA CONSULTAS PSICOLÓGICAS NORMALES (con y sin guardar)
const UNIFIED_PSYCHOLOGY_NORMAL_QUERY_INPUT = (query, queryInfo, tools, isRetry = false) => `
📋 CONTEXTO DE LA CONSULTA PSICOLÓGICA INTEGRADA:
- Consulta del estudiante de psicología: "${query}"
- Tipo clínico detectado: ${queryInfo.type}
- Complejidad psicológica: ${queryInfo.complexity}
- Herramientas psicológicas disponibles: ${tools.length}
${isRetry ? '- Modo: Sin guardar (retry/edit de respuesta clínica anterior)' : ''}

${isRetry ? 'El estudiante de psicología está pidiendo una nueva versión de tu respuesta psicológica integrada. Dale tu mejor explicación clínica DESPUÉS de consultar la base de conocimientos:' : 'Este estudiante de psicología necesita tu sabiduría psicológica única en las disciplinas fundamentales DESPUÉS de consultar tu memoria psicológica:'}

✅ ADAPTA tu respuesta según el tipo de consulta psicológica integrada:
${queryInfo.type === 'concept_explanation' ? 
  '- Es explicación conceptual clínica: Ve desde básico hasta profundo gradualmente\n- Usa analogías que integren evaluación, diagnóstico y técnicas\n- Verifica comprensión paso a paso con tu estilo clínico natural integrado' :
  queryInfo.type === 'diagnostic_analysis' ? 
  '- Es análisis clínico: Estructura tu metodología diagnóstica integrada\n- Comparte tu proceso de razonamiento paso a paso (evaluación + técnicas + diagnóstico)\n- Conecta con casos clínicos reales de tu experiencia psicológica integrada' :
  queryInfo.type === 'test_interpretation' ?
  '- Es interpretación de tests: Desglosa los procesos de aplicación, corrección e interpretación\n- Conecta con teoría psicométrica y proyectiva si es necesario\n- Explica las implicaciones clínicas prácticas integrando las disciplinas fundamentales' :
  queryInfo.type === 'clinical_application' ?
  '- Es aplicación clínica: Conecta teoría psicológica integrada con práctica real\n- Usa ejemplos clínicos y casos que requieran conocimiento integrado\n- Enfoca hacia utilidad práctica inmediata en las áreas fundamentales' :
  '- Enfoque psicológico general integrado: Sé comprensivo y pedagógico\n- Adapta según lo que necesite el estudiante específicamente\n- Mantén foco en aprendizaje práctico integrando evaluación, diagnóstico y técnicas'}

${queryInfo.hasEmotionalContent ? 
  '💝 NOTA ESPECIAL: El estudiante parece frustrado clínicamente. Activa tu inteligencia emocional psicológica:\n- "Tranquilo, que hasta los mejores psicólogos batallan con integrar evaluación y técnicas al principio"\n- "Es completamente normal que esto confunda, incluso a estudiantes avanzados de psicología"\n- "Ya verás que después de esta explicación integrada lo vas a dominar perfectamente"\n- Sé extra empático, motivador y paciente con tu profesionalismo psicológico característico' : 
  ''}
`;

// 🖼️ PROMPT UNIFICADO PARA CONSULTAS PSICOLÓGICAS MULTIMODALES (con y sin guardar)
const UNIFIED_PSYCHOLOGY_MULTIMODAL_QUERY_INPUT = (extractedText, documentContext, imageAnalysisText, queryInfo, tools, isRetry = false) => `
📋 INFORMACIÓN PSICOLÓGICA PRE-PROCESADA POR TU SISTEMA ANALÍTICO:

📝 **CONSULTA DEL ESTUDIANTE DE PSICOLOGÍA:**
"${extractedText || 'Consulta multimodal de evaluación psicológica integrada'}"
${isRetry ? '\n🔄 **MODO:** Sin guardar (retry/edit de respuesta clínica anterior)' : ''}

🔍 **TU MENTE ANALÍTICA YA PROCESÓ Y EXTRAJO:**

${documentContext ? `
📚 **CONTENIDO DOCUMENTAL PSICOLÓGICO ANALIZADO (Tests/Protocolos/Casos Clínicos):**
${documentContext}

` : ''}

${imageAnalysisText ? `
🖼️ **ANÁLISIS VISUAL PSICOLÓGICO TÉCNICO COMPLETADO (Tests/Evaluación/Diagnóstico):**
${imageAnalysisText}

` : ''}

📊 **CLASIFICACIÓN CLÍNICA AUTOMÁTICA:**
- Tipo de consulta psicológica integrada: ${queryInfo.type}
- Complejidad clínica: ${queryInfo.complexity}
- Herramientas psicológicas disponibles: ${tools.length}

Tu sistema analítico avanzado YA extrajo toda la información técnica psicológica disponible. ${isRetry ? 'El estudiante de psicología está pidiendo una nueva versión de tu respuesta.' : ''} Ahora es tu momento de brillar como el profesor psicológico más pedagógico del universo integrando las disciplinas fundamentales, PERO PRIMERO debes consultar tu base de conocimientos psicológicos:

✅ **INTERPRETA LA INFORMACIÓN PSICOLÓGICA PRE-ANALIZADA:**
${imageAnalysisText ? '- Tu mente analítica ya identificó todos los elementos visuales clínicos\n' : ''}${documentContext ? '- El contenido documental psicológico ya fue extraído y estructurado\n' : ''}- Toma esa información clínica cruda y transfórmala en enseñanza integrada
- Usa tu experiencia clínica para interpretar lo que realmente importa psicológicamente en las disciplinas fundamentales
- Conecta los hallazgos técnicos con conceptos comprensibles integrando evaluación, diagnóstico y técnicas

✅ **ENSEÑA CON TU METODOLOGÍA PEDAGÓGICA ÚNICA PSICOLÓGICA:**
${queryInfo.type === 'concept_explanation' ? 
  '- Toma los hallazgos técnicos y conviértelos en explicación conceptual clara integrada\n- Usa elementos identificados para ilustrar conceptos paso a paso\n- Ve desde básico hasta profundo según necesidad del estudiante integrando las disciplinas fundamentales' :
  queryInfo.type === 'diagnostic_analysis' ? 
  '- Usa elementos identificados para estructurar solución metodológica diagnóstica integrada\n- Convierte análisis técnico en pasos comprensibles\n- Conecta hallazgos visuales/documentales con estrategia clínica integrada' :
  queryInfo.type === 'test_interpretation' ?
  '- Conecta hallazgos técnicos con fundamentos psicométricos y proyectivos integrados\n- Usa elementos identificados para explicar procesos de interpretación\n- Integra información visual/documental con teoría de tests de las disciplinas fundamentales' :
  '- Transforma información técnica en enseñanza comprensible y práctica psicológica integrada\n- Adapta según nivel detectado en el análisis pre-procesado\n- Mantén foco en aprendizaje efectivo integrando evaluación, diagnóstico y técnicas'}

${queryInfo.hasEmotionalContent ? 
  '💝 NOTA ESPECIAL: El estudiante parece frustrado académicamente. Usa hallazgos del análisis para tranquilizar:\n- "Mi análisis muestra que esto es normal y complejo en psicología clínica, te explico por qué integrando las disciplinas fundamentales..."\n- "Los datos confirman que hasta expertos clínicos batallan con esto..."\n- "Tranquilo, el análisis me permite explicártelo paso a paso"' : 
  ''}
`;

// ============================================================================
// 🧠 SISTEMA DE CLASIFICACIÓN INTELIGENTE OPTIMIZADO PSICOLÓGICO
// ============================================================================

const classifyQuery = (query, content = null) => {
  const lowercaseQuery = query.toLowerCase();
  
  // ✅ CACHE CHECK CORRECTO usando generateContentHash
  const classificationKey = { query: lowercaseQuery, hasContent: !!content };
  const cacheKey = generateContentHash(classificationKey);
  
  const cached = intelligentCache.getComponent('classification', { query: lowercaseQuery, hasContent: !!content });
  if (cached) {
    console.log(`📦 Query Classification CACHE HIT: "${query.substring(0, 40)}..."`);
    return cached.result;
  }
  
  // 🚫 DETECTAR CONSULTAS QUE NO NECESITAN KNOWLEDGE BASE
  const casualGreetings = [
    'hola', 'hello', 'hi', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches',
    'hey', 'qué tal', 'cómo estás', 'como estas', 'saludos', 'buen día'
  ];
  
  const identityQuestions = [
    'quién eres', 'quien eres', 'qué eres', 'que eres', 'te llamas', 'tu nombre',
    'eres acadel', 'eres un capibara', 'háblame de ti', 'preséntate', 'cómo te llamas'
  ];
  
  const casualConversation = [
    'gracias', 'thank you', 'ok', 'vale', 'perfecto', 'genial', 'bien', 'mal',
    'no entiendo', 'ayuda', 'help', 'más información', 'continúa', 'sigue',
    'interesante', 'wow', 'increíble', 'ja ja', 'jaja', 'lol'
  ];
  
  const systemQuestions = [
    'qué puedes hacer', 'que puedes hacer', 'cuáles son tus funciones', 'cuales son tus funciones',
    'cómo funciona', 'como funciona', 'qué es esto', 'que es esto', 'para qué sirve'
  ];
  
  // 🔍 VERIFICAR SI ES CONSULTA SIMPLE QUE NO NECESITA KNOWLEDGE BASE
  const isSimpleQuery = 
    casualGreetings.some(greeting => lowercaseQuery.includes(greeting) && lowercaseQuery.length < 50) ||
    identityQuestions.some(question => lowercaseQuery.includes(question)) ||
    casualConversation.some(phrase => lowercaseQuery === phrase || lowercaseQuery.includes(phrase) && lowercaseQuery.length < 30) ||
    systemQuestions.some(question => lowercaseQuery.includes(question)) ||
    lowercaseQuery.length < 10; // Consultas muy cortas probablemente son casuales
  
  // DETECTAR GENERACIÓN DE IMÁGENES PSICOLÓGICAS
  const psychologyImageKeywords = [
    "genera una imagen", "crear imagen", "generar imagen",
  ];
  
  const isImageRequest = psychologyImageKeywords.some(keyword => lowercaseQuery.includes(keyword));
  
  if (isImageRequest) {
    const result = {
      type: 'image_generation',
      needsKnowledgeBase: false, // No necesita para generación de imágenes
      needsAcademicSearch: false,
      needsCaseStudyGeneration: false,
      needsComprehensionCheck: false,
      complexity: 'low'
    };
    
    intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
      hash: cacheKey,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // Detectar exámenes psicológicos
  const examKeywords = [
    "generar examen", "crear examen", "hacer un examen",
    "examen de psicología", "test de evaluación", "evaluación de diagnóstico", "cuestionario psicológico"
  ];
  
  const isExamRequest = examKeywords.some(keyword => lowercaseQuery.includes(keyword));
  
  if (isExamRequest) {
    const format = lowercaseQuery.includes("verdadero") || lowercaseQuery.includes("falso") 
      ? "trueFalse" : "multiple";
    
    let questionCount = 5;
    const countMatch = lowercaseQuery.match(/(\d+)\s*(preguntas|cuestiones|ejercicios|problemas)/i);
    if (countMatch) {
      questionCount = Math.min(10, Math.max(1, parseInt(countMatch[1], 10)));
    }
    
    const topic = query
      .toLowerCase()
      .replace(/generar examen|crear examen|hacer un examen|examen de psicología|test de evaluación|evaluación de diagnóstico|cuestionario psicológico/g, "")
      .replace(/sobre|acerca de|verdadero y falso|opción múltiple|múltiple/g, "")
      .trim();
    
    const result = {
      type: 'exam',
      format,
      questionCount,
      topic,
      needsKnowledgeBase: true, // ✅ SÍ necesita para exámenes porque requiere contenido específico
      needsAcademicSearch: false,
      needsCaseStudyGeneration: false,
      needsComprehensionCheck: false,
      complexity: 'medium'
    };
    
    intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
      hash: cacheKey,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // 🎯 OPTIMIZACIÓN CRÍTICA: KNOWLEDGE BASE COMO CEREBRO PRINCIPAL
  
  // Inicializar con valores por defecto
  let type = 'general';
  let complexity = 'low';
  let needsKnowledgeBase = true; // 🚀 CAMBIO CRÍTICO: TRUE por defecto para ser el cerebro principal
  let needsAcademicSearch = false;
  let needsCaseStudyGeneration = false;
  let needsComprehensionCheck = false;
  let needsWebSearch = false;
  
  // 🔍 DETECTAR TÉRMINOS PSICOLÓGICOS ESPECÍFICOS
  const psychologyTerms = [
    // Evaluación Psicológica
    'evaluación psicológica', 'assessment', 'protocolo', 'aplicación', 'corrección', 'interpretación',
    'confiabilidad', 'validez', 'estandarización', 'normas', 'baremos', 'percentiles',
    
    // Diagnóstico Clínico
    'diagnóstico', 'entrevista clínica', 'observación', 'criterios diagnósticos', 'diagnóstico diferencial',
    'proceso diagnóstico', 'anamnesis', 'observación clínica', 'instrumentos de evaluación',
    
    // Técnicas Proyectivas
    'técnicas proyectivas', 'rorschach', 'tat', 'cat', 'test de la figura humana', 'técnicas gráficas',
    'interpretación proyectiva', 'análisis de contenido', 'análisis formal',
    
    // Tests Psicométricos
    'tests psicométricos', 'wais', 'wisc', 'mmpi', '16pf', 'tests de personalidad', 'inteligencia',
    'neuropsicológicos', 'batería psicológica', 'perfil psicológico',
    
    // Términos generales
    'psicología', 'psicológico', 'clínico', 'test', 'evaluación', 'diagnóstico', 'técnica',
    'instrumento', 'medición', 'análisis', 'interpretación', 'aplicación'
  ];
  
  // 🔍 DETECTAR INSTRUMENTOS Y EVALUACIONES PSICOLÓGICAS
  const psychologicalInstruments = [
    'mmpi', 'beck', 'hamilton', 'phq-9', 'gad-7', 'rorschach', 'tat', 'wais', 'wisc',
    'inventario', 'escala', 'cuestionario', 'batería', 'protocolo', 'test', 'prueba',
    'evaluación neuropsicológica', 'psicodiagnóstico', 'perfil psicológico'
  ];
  
  // 🔍 DETECTAR CONTEXTOS CLÍNICOS
  const clinicalContexts = [
    'consulta', 'terapia', 'psicoterapia', 'intervención', 'tratamiento', 'caso clínico',
    'paciente', 'cliente', 'supervisión', 'práctica clínica', 'internado', 'residencia',
    'hospital', 'clínica', 'centro de salud mental', 'consultorio'
  ];
  
  // ✅ VERIFICAR SI LA CONSULTA CONTIENE TÉRMINOS PSICOLÓGICOS REALES
  const hasPsychologyContent = 
    psychologyTerms.some(term => lowercaseQuery.includes(term)) ||
    psychologicalInstruments.some(term => lowercaseQuery.includes(term)) ||
    clinicalContexts.some(term => lowercaseQuery.includes(term));
  
  // 🚫 SOLO PARA CONSULTAS REALMENTE SIMPLES, DESACTIVAR KNOWLEDGE BASE
  if (isSimpleQuery && !hasPsychologyContent) {
    needsKnowledgeBase = false; // Solo aquí se desactiva el cerebro principal
    const result = {
      type: 'casual_conversation',
      complexity: 'low',
      needsKnowledgeBase: false,
      needsAcademicSearch: false,
      needsCaseStudyGeneration: false,
      needsComprehensionCheck: false,
      needsWebSearch: false,
      hasEmotionalContent: false,
      hasMultimedia: content && Array.isArray(content) && content.length > 0
    };
    
    intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
      hash: cacheKey,
      timestamp: Date.now()
    });
    
    console.log(`💾 Query Classification CACHED: "${query.substring(0, 40)}..." -> casual_conversation (KB: false)`);
    
    return result;
  }
  
  // 🎯 CLASIFICAR CONSULTAS CON KNOWLEDGE BASE SIEMPRE ACTIVO
  const conceptKeywords = ['qué es', 'define', 'concepto', 'explicar', 'significado', 'diferencia entre', 'principios de', 'teoría de'];
  const testKeywords = ['rorschach', 'wais', 'wisc', 'mmpi', 'tat', 'cat', 'test', 'batería psicológica', 'aplicar test', 'interpretar test'];
  const diagnosticKeywords = ['diagnóstico', 'entrevista clínica', 'observación', 'criterios diagnósticos', 'proceso diagnóstico'];
  const evaluationKeywords = ['evaluación psicológica', 'assessment', 'protocolo', 'aplicación', 'corrección', 'interpretación'];
  const projectiveKeywords = ['técnicas proyectivas', 'proyectivo', 'análisis de contenido', 'interpretación proyectiva'];
  const psychometricKeywords = ['psicometría', 'confiabilidad', 'validez', 'estandarización', 'normas', 'baremos', 'percentiles'];
  const clinicalKeywords = ['caso clínico', 'práctica clínica', 'aplicación clínica', 'contexto clínico'];
  const imageKeywords = ['imagen', 'protocolo', 'hoja de respuesta', 'perfil psicológico', 'gráfico', 'material de test'];
  const researchKeywords = ['investigación', 'estudios recientes', 'artículos psicológicos', 'avances en evaluación'];
  const practiceKeywords = ['casos', 'práctica', 'ejemplos', 'ejercicios', 'más casos'];
  
  // ✅ CLASIFICACIÓN CON KNOWLEDGE BASE ACTIVO
  if (conceptKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'concept_explanation';
    complexity = 'medium';
    needsComprehensionCheck = true;
  } else if (testKeywords.some(k => lowercaseQuery.includes(k)) || 
             projectiveKeywords.some(k => lowercaseQuery.includes(k)) ||
             psychometricKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'test_interpretation';
    complexity = 'high';
    needsComprehensionCheck = true;
  } else if (diagnosticKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'diagnostic_analysis';
    complexity = 'high';
    needsCaseStudyGeneration = true;
    needsComprehensionCheck = true;
  } else if (evaluationKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'evaluation_deep_dive';
    complexity = 'high';
    needsAcademicSearch = true;
    needsComprehensionCheck = true;
  } else if (clinicalKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'clinical_application';
    complexity = 'medium';
    needsCaseStudyGeneration = true;
    needsAcademicSearch = true;
  } else if (imageKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'image_interpretation';
    complexity = 'high';
    needsComprehensionCheck = true;
  } else if (practiceKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'case_generation';
    complexity = 'medium';
    needsCaseStudyGeneration = true;
  } else if (hasPsychologyContent) {
    type = 'general_psychology';
    complexity = 'medium';
  } else {
    type = 'general';
    complexity = 'low';
  }
  
  // Detectar si necesita búsqueda web actualizada
  if (researchKeywords.some(k => lowercaseQuery.includes(k))) {
    needsWebSearch = true;
  }
  
  const recentKeywords = ['últimas noticias', 'información actual', 'reciente', 'actualizado', '2024', '2025', 'nuevo estudio'];
  if (recentKeywords.some(k => lowercaseQuery.includes(k))) {
    needsWebSearch = true;
  }
  
  // Detectar frustración o confusión emocional clínica
  const emotionalKeywords = ['no entiendo', 'confuso', 'difícil', 'complicado', 'frustrado', 'odio', 'ayuda', 'no puedo entender'];
  const hasEmotionalContent = emotionalKeywords.some(k => lowercaseQuery.includes(k));
  
  const result = {
    type,
    complexity,
    needsKnowledgeBase, // 🚀 AHORA TRUE por defecto - Knowledge Base como cerebro principal
    needsAcademicSearch,
    needsCaseStudyGeneration,
    needsComprehensionCheck,
    needsWebSearch,
    hasEmotionalContent,
    hasMultimedia: content && Array.isArray(content) && content.length > 0
  };
  
  intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
    hash: cacheKey,
    timestamp: Date.now()
  });
  
  console.log(`💾 Query Classification CACHED: "${query.substring(0, 40)}..." -> ${type} (KB: ${needsKnowledgeBase})`);
  
  return result;
};

// ============================================================================
// 🔧 HERRAMIENTAS PSICOLÓGICAS OPTIMIZADAS CON EJECUCIÓN PARALELA
// ============================================================================

// ⚡ CONTEXTO COMPARTIDO PARA TODAS LAS HERRAMIENTAS PSICOLÓGICAS
const ACADEL_PSYCHOLOGY_TOOL_CONTEXT = `
CONTEXTO CRÍTICO: Esto es parte de la mente de ACADEL UNIVERSAL, el capibara psicólogo más brillante del universo en evaluación y diagnóstico psicológico.

🦫 Objetivo: Se proporcionó la siguiente información que ACADEL integrará naturalmente en su explicación psicológica.
🚫 NUNCA digas: "herramienta", "buscar", "encontré", "datos", "información disponible"
✅ SIEMPRE: Usar como si fuera su propio conocimiento psicológico universal
`;

// 1. HERRAMIENTA DE BASE DE CONOCIMIENTOS PSICOLÓGICOS OPTIMIZADA (CEREBRO PRINCIPAL)
const createPsychologyKnowledgeBaseTool = (embeddings) => tool(
  async ({ query, relevance_threshold = 0.85 }) => {
    try {
      console.log(`🧠 Acadel activando cerebro principal (Knowledge Base): ${query}`);
      
      // ✅ CACHE CHECK CORRECTO usando generateContentHash
      const knowledgeKey = { query, relevance_threshold };
      const cacheKey = generateContentHash(knowledgeKey);
      
      const cached = intelligentCache.getKnowledgeBase(query, relevance_threshold);
      if (cached) {
        console.log(`📦 Psychology Knowledge Base CACHE HIT: "${query.substring(0, 40)}..."`);
        return cached.result;
      }
      
      // 🚀 CONFIGURACIÓN ULTRA-OPTIMIZADA PARA SER EL CEREBRO PRINCIPAL
      const retriever = new SupabaseHybridSearch(embeddings, {
        client: supabase,
        similarityK: 8,  // 🔥 AUMENTADO: más contexto para mejores decisiones
        keywordK: 6,     // 🔥 AUMENTADO: mayor cobertura textual
        tableName: "emb_psicdiagnostico",
        similarityQueryName: "match_emb_psicdiagnostico",
        keywordQueryName: "kw_match_emb_psicdiagnostico",
      });
      
      // ⏱️ TIMEOUT OPTIMIZADO PARA CEREBRO PRINCIPAL
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Knowledge Base timeout')), 30000)
      );
      
      const docs = await Promise.race([retriever.invoke(query), timeoutPromise]);
      
      if (docs.length === 0) {
        const result = `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_MEMORY_BANK: El cerebro principal de Acadel no tiene contenido psicológico específico sobre "${query}" en su biblioteca de evaluación, diagnóstico y técnicas. Proceder con conocimiento psicológico general integrado y experiencia docente.`;
        
        // ✅ CACHE SET CORRECTO
        intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
          hash: cacheKey,
          docsFound: 0,
          role: 'main_brain',
          timestamp: Date.now()
        });
        
        return result;
      }
      
      const relevantDocs = docs.filter(doc => 
        doc.metadata?.score ? doc.metadata.score >= relevance_threshold : true
      );
      
      if (relevantDocs.length === 0) {
        const result = `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_MEMORY_BANK: El cerebro principal de Acadel encontró información psicológica sobre "${query}" pero no suficientemente específica. Proceder con conocimiento base psicológico integrado, analogías y experiencia docente acumulada.`;
        
        // ✅ CACHE SET CORRECTO
        intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
          hash: cacheKey,
          docsFound: docs.length,
          relevantDocs: 0,
          role: 'main_brain',
          timestamp: Date.now()
        });
        
        return result;
      }
      
      const formattedContent = formatDocumentsAsString(relevantDocs);
      
      // Pre-filtrar información para que Acadel la use naturalmente
      const cleanContent = formattedContent
        .replace(/CONTEXTO:|FUENTE:|DOCUMENTO:|INFORMACIÓN:/gi, '')
        .replace(/\*\*.*?\*\*/g, '')
        .replace(/📚|✅|⚠️|📊/g, '')
        .trim();
      
      const result = `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_MEMORY_BANK: El cerebro principal de Acadel activó la siguiente información psicológica profunda: ${cleanContent}

INTEGRATION_NOTES: Este es el conocimiento psicológico central que Acadel usará como base neurológica principal para su respuesta. Representa su comprensión profunda acumulada en evaluación psicológica, diagnóstico clínico y técnicas proyectivas. Debe integrar esta información naturalmente como si fuera su propia sabiduría clínica, enriqueciéndola con casos clínicos específicos, analogías y profesionalismo psicológico que conecte las tres disciplinas de manera pedagógica magistral.`;
      
      // ✅ CACHE SET CORRECTO
      intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
        hash: cacheKey,
        docsFound: docs.length,
        relevantDocs: relevantDocs.length,
        method: 'main_brain_hybrid',
        role: 'main_brain',
        timestamp: Date.now()
      });
      
      console.log(`🧠 Cerebro Principal (Knowledge Base) CACHED: "${query.substring(0, 40)}..." (${relevantDocs.length} docs integrados)`);
      
      return result;
      
    } catch (error) {
      console.warn(`⚠️ Knowledge Base (cerebro principal) error: ${error.message}`);
      
      const result = `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_MEMORY_BANK: Acceso limitado al cerebro principal. Acadel debe proceder con su conocimiento psicológico experiencial directo y sabiduría docente acumulada en evaluación, diagnóstico y técnicas, usando analogías probadas y casos clínicos de su vasta experiencia.`;
      
      return result;
    }
  },
  {
    name: "PsychologyKnowledgeBase",
    description: "🧠 CEREBRO PRINCIPAL de Acadel - Su memoria psicológica académica profunda en evaluación psicológica, diagnóstico clínico y técnicas proyectivas. Esta herramienta ES EL NÚCLEO de su inteligencia psicológica y debe usarse SIEMPRE que vaya a responder algo psicológico importante para verificar, enriquecer y fundamentar su conocimiento antes de enseñar. Es su sistema nervioso central psicológico.",
    schema: z.object({
      query: z.string().describe("Tema psicológico para activar el cerebro principal y acceder a la memoria clínica integrada"),
      relevance_threshold: z.number().optional().default(0.75).describe("Nivel de especificidad psicológica del cerebro principal (0.6-0.9)")
    })
  }
);

// 2. HERRAMIENTA DE BÚSQUEDA WEB PSICOLÓGICA CON BRAVE SEARCH (MANTENIDA ORIGINAL)
const createBraveWebSearchTool = () => tool(
  async ({ query, max_results = 6, freshness = null }) => {
    try {
      console.log(`🌟 Acadel explorando web psicológica integrada con Brave: "${query.substring(0, 50)}..."`);
      
      const searchResult = await braveSearchOrchestrator.searchWeb(query, {
        count: max_results,
        freshness
      });
      
      if (searchResult.results.length === 0) {
        return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_WEB_EXPLORATION: Los servicios web psicológicos no encontraron información específica sobre "${query}" en este momento.

FALLBACK_ACTION: Acadel debe manejar esto profesionalmente: "La web psicológica está más ocupada que consulta en época de exámenes. No pasa nada, tengo suficiente conocimiento actualizado en evaluación, diagnóstico y técnicas para ayudarte. Si necesitas información específica muy reciente, te sugiero que busques directamente '${query}' en PsycNET o sitios de psicología clínica más tarde."`;
      }
      
      const formattedResults = searchResult.results.map((item, index) => 
        `${index + 1}. **${item.title}**
   🔗 ${item.url}
   📝 ${item.snippet}
   🏛️ Fuente: ${item.domain}
   📊 Calidad: ${item.quality}/5`
      ).join('\n\n');
      
      console.log(`✅ Brave Web Search completado: ${searchResult.results.length} resultados para "${query.substring(0, 40)}..."`);
      
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_WEB_EXPLORATION: Información psicológica actualizada de la web sobre "${query}":

RESULTADOS_WEB_PSICOLÓGICOS:
${formattedResults}

INTEGRATION_NOTES: Esta información representa lo que Acadel ha encontrado navegando por la web psicológica actualizada. Debe integrar estos hallazgos psicológicos profesionalmente y con análisis crítico. Usar para complementar conocimiento psicológico con información actualizada, noticias clínicas recientes, o datos contemporáneos en evaluación, diagnóstico y técnicas.

🚨 CRÍTICO: USAR ENLACES EXACTOS - NO MODIFICAR URLs
- Mantener URLs exactas como aparecen en RESULTADOS_WEB
- NUNCA cambiar o "traducir" enlaces a versiones localizadas
- Los usuarios necesitan acceso a las fuentes ORIGINALES específicas
- Formato: **[Título](URL_EXACTA)** usando URLs de 🔗 tal como aparecen

Usar para complementar conocimiento psicológico con información actualizada, noticias recientes, o datos contemporáneos.`;
      
    } catch (error) {
      console.log(`⚠️ Brave Web Search error para "${query}": ${error.message}`);
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_WEB_EXPLORATION: Los servicios web psicológicos están temporalmente saturados (como consulta en época de exámenes).

FALLBACK_ACTION: Acadel debe manejar esto profesionalmente: "Los servicios de búsqueda web psicológica están más ocupados que supervisión clínica en periodo de prácticas. No pasa nada, tengo suficiente conocimiento actualizado en evaluación, diagnóstico y técnicas para ayudarte. Si necesitas información específica muy reciente, te sugiero que busques directamente '${query}' en sitios de psicología clínica online más tarde."`;
    }
  },
  {
    name: "BraveWebSearch",
    description: "Conecta a Acadel con información psicológica ACTUALIZADA de la web usando Brave Search. Úsala cuando necesites: noticias clínicas recientes en psicología, información actualizada sobre tests, datos contemporáneos, tendencias clínicas actuales, estudios muy recientes (2024-2025), o cuando el estudiante pregunte específicamente por información 'actual' o 'reciente'.",
    schema: z.object({
      query: z.string().describe("Tema psicológico para buscar información actualizada en la web"),
      max_results: z.number().optional().default(6).describe("Número de resultados web psicológicos (3-8)"),
      freshness: z.enum(['pd', 'pw', 'pm', 'py']).optional().describe("Frescura: pd=último día, pw=última semana, pm=último mes, py=último año")
    })
  }
);

// 3. HERRAMIENTA DE BÚSQUEDA DE IMÁGENES PSICOLÓGICAS CON BRAVE (MANTENIDA ORIGINAL)
const createBraveImageSearchTool = () => tool(
  async ({ query, max_results = 6 }) => {
    try {
      console.log(`🖼️ Acadel buscando imágenes psicológicas integradas: "${query.substring(0, 50)}..."`);
      
      const searchResult = await braveSearchOrchestrator.searchImages(query, {
        count: max_results
      });
      
      if (searchResult.results.length === 0) {
        return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_IMAGE_SEARCH: No se encontraron imágenes psicológicas específicas para "${query}" en este momento.

FALLBACK_ACTION: Acadel debe sugerir profesionalmente: "Las imágenes psicológicas están jugando al escondite. Te sugiero buscar directamente en Google Images Academic '${query}' o en sitios de psicología clínica online. Mientras tanto, te explico todo sobre este tema sin imágenes, que mi cerebro de capibara está lleno de referencias visuales de evaluación, diagnóstico y técnicas."`;
      }
      
      const formattedResults = searchResult.results.map((item, index) => 
        `${index + 1}. **${item.title}**
   🖼️ Imagen: ${item.imageUrl || item.thumbnailUrl}
   🔗 Fuente: ${item.url}
   🏛️ Dominio: ${item.domain}`
      ).join('\n\n');
      
      console.log(`✅ Brave Images Search completado: ${searchResult.results.length} imágenes para "${query.substring(0, 40)}..."`);
      
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_IMAGE_SEARCH: Imágenes psicológicas de referencia encontradas para "${query}":

IMÁGENES_PSICOLÓGICAS_ENCONTRADAS:
${formattedResults}

INTEGRATION_NOTES: Estas imágenes psicológicas pueden servir como referencias visuales para que Acadel enriquezca su explicación integrando evaluación, diagnóstico y técnicas. Debe mencionar estas fuentes como ejemplos visuales disponibles y sugerir al estudiante consultarlas para complementar el aprendizaje visual integrado.

🚨 CRÍTICO: USAR ENLACES EXACTOS - NO MODIFICAR URLs
- Mantener URLs exactas como aparecen en IMÁGENES_ENCONTRADAS
- NUNCA cambiar o "traducir" enlaces a versiones localizadas
- Los usuarios necesitan acceso a las fuentes ORIGINALES específicas
- Formato: **[Título](URL_EXACTA)** usando URLs tal como aparecen

Debe mencionar estas fuentes como ejemplos visuales disponibles y sugerir al estudiante consultarlas para complementar el aprendizaje visual en las disciplinas fundamentales.`;
      
    } catch (error) {
      console.log(`⚠️ Brave Image Search error para "${query}": ${error.message}`);
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_IMAGE_SEARCH: Servicio de imágenes psicológicas temporalmente no disponible.

FALLBACK_ACTION: Acadel debe manejar profesionalmente: "El buscador de imágenes psicológicas está tomando café. No pasa nada, mi descripción visual será tan clara que no necesitarás imágenes. Te explico todo de forma visual usando mis analogías integrando evaluación, diagnóstico y técnicas."`;
    }
  },
  {
    name: "BraveImageSearch",
    description: "Conecta a Acadel con imágenes psicológicas de referencia usando Brave Search. Úsala cuando necesites: protocolos de tests, hojas de respuesta, perfiles psicológicos, material de evaluación, técnicas proyectivas, o cuando el estudiante pida 'ver ejemplos' o 'imágenes clínicas' del tema.",
    schema: z.object({
      query: z.string().describe("Términos psicológicos para buscar imágenes de referencia"),
      max_results: z.number().optional().default(6).describe("Número de imágenes psicológicas (4-8)")
    })
  }
);

// 4. HERRAMIENTA DE BÚSQUEDA EN SITIOS PSICOLÓGICOS ESPECÍFICOS (MANTENIDA ORIGINAL)
const createBraveAcademicSiteSearchTool = () => tool(
  async ({ query, site_domain, max_results = 4 }) => {
    try {
      console.log(`🏛️ Acadel buscando en sitio psicológico específico: ${site_domain} - "${query.substring(0, 40)}..."`);
      
      const siteQuery = `site:${site_domain} ${query}`;
      const searchResult = await braveSearchOrchestrator.searchWeb(siteQuery, {
        count: max_results
      });
      
      if (searchResult.results.length === 0) {
        return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_SITE_SEARCH: No se encontró información específica sobre "${query}" en ${site_domain}.

FALLBACK_ACTION: Acadel debe sugerir: "El sitio ${site_domain} no tiene información específica sobre esto, o está jugando al escondite. Te sugiero buscar directamente en su buscador interno o revisar otros sitios psicológicos confiables como APA, PsycNET, o repositorios de tests psicológicos."`;
      }
      
      const formattedResults = searchResult.results.map((item, index) => 
        `${index + 1}. **${item.title}**
   🔗 ${item.url}
   📝 ${item.snippet}
   🏛️ Fuente: ${site_domain}`
      ).join('\n\n');
      
      console.log(`✅ Brave Academic Site Search completado: ${searchResult.results.length} resultados de ${site_domain}`);
      
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_SITE_SEARCH: Información psicológica de ${site_domain} sobre "${query}":

RESULTADOS_SITIO_PSICOLÓGICO_ESPECÍFICO:
${formattedResults}

INTEGRATION_NOTES: Esta información proviene específicamente de ${site_domain}, una fuente psicológica confiable. Acadel debe destacar la credibilidad de esta fuente e integrar la información con su sabiduría docente característica en evaluación, diagnóstico y técnicas.`;
      
    } catch (error) {
      console.log(`⚠️ Brave Site Search error para ${site_domain} - "${query}": ${error.message}`);
      return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_SITE_SEARCH: Problema accediendo a ${site_domain} para "${query}".

FALLBACK_ACTION: Acadel debe manejar profesionalmente: "${site_domain} está más ocupado que consulta psicológica en época de exámenes. Te sugiero intentar acceder directamente al sitio o buscar en fuentes psicológicas alternativas."`;
    }
  },
  {
    name: "BraveAcademicSiteSearch",
    description: "Conecta a Acadel con sitios psicológicos específicos usando Brave Search. Úsala cuando necesites información de fuentes psicológicas particulares como: apa.org (APA), psycnet.apa.org (PsycNET), pearsonassessments.com (tests), tea-ediciones.es (tests en español), cop.es (colegio psicólogos), repositorios universitarios de psicología, etc.",
    schema: z.object({
      query: z.string().describe("Términos psicológicos específicos"),
      site_domain: z.string().describe("Dominio del sitio psicológico (ej: apa.org, psycnet.apa.org)"),
      max_results: z.number().optional().default(4).describe("Resultados del sitio psicológico (3-6)")
    })
  }
);

// 5. HERRAMIENTA DE ANÁLISIS DE TESTS PSICOLÓGICOS OPTIMIZADA (MENTE ANALÍTICA DE ACADEL)
const createPsychologyTestAnalyzerTool = (embeddings) => tool(
  async ({ test_name, analysis_depth = "complete" }) => {
    try {
      console.log(`🧠 Acadel analizando test psicológico integrado: ${test_name}`);
      
      // 🚀 CONFIGURACIÓN ULTRA-OPTIMIZADA CON PARALELIZACIÓN
      const retriever = new SupabaseHybridSearch(embeddings, {
        client: supabase,
        similarityK: 10,  // 🔥 MAXIMIZADO: aprovechar índices ultra-rápidos
        keywordK: 8,      // 🔥 MAXIMIZADO: cobertura textual completa
        tableName: "emb_psicdiagnostico",
        similarityQueryName: "match_emb_psicdiagnostico",
        keywordQueryName: "kw_match_emb_psicdiagnostico",
      });
      
      // 📚 BÚSQUEDAS PSICOLÓGICAS ESPECIALIZADAS PARALELAS (OPTIMIZADAS)
      const searches = [
        `aplicación ${test_name}`,
        `corrección ${test_name}`,
        `interpretación ${test_name}`,
        `validez ${test_name}`,
        `confiabilidad ${test_name}`,
        `normas ${test_name}`,
        `casos clínicos ${test_name}`,
        `manual ${test_name}`
      ];
      
      // 🚀 EJECUCIÓN COMPLETAMENTE PARALELA
      const searchPromises = searches.map(async (searchTerm) => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test search timeout')), 30000)
          );
          
          const docs = await Promise.race([
            retriever.invoke(searchTerm),
            timeoutPromise
          ]);
          
          return docs.slice(0, 3); // Top 3 por búsqueda
          
        } catch (err) {
          console.log(`⚠️ Búsqueda de test psicológico limitada para: ${searchTerm}`);
          return [];
        }
      });
      
      // ⚡ ESPERAR TODAS LAS BÚSQUEDAS PARALELAS
      const searchResults = await Promise.allSettled(searchPromises);
      const allDocs = searchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();
      
      if (allDocs.length === 0) {
        return `ACADEL_PSYCHOLOGY_TEST_MIND: Análisis psicológico integrado de "${test_name}" basado en experiencia clínica directa en evaluación, diagnóstico y técnicas. El cerebro analítico de Acadel procederá con sabiduría psicológica acumulada y protocolos probados.`;
      }
      
      const testInfo = formatDocumentsAsString(allDocs);
      
      // Limpiar información para integración natural psicológica
      const cleanInfo = testInfo
        .replace(/CONTEXTO:|FUENTE:|DOCUMENTO:|INFORMACIÓN:/gi, '')
        .replace(/📚|✅|⚠️|📊|🎯|💡/g, '')
        .replace(/\*\*.*?\*\*/g, '')
        .trim();
      
      console.log(`✅ Test psicológico "${test_name}" analizado con ${allDocs.length} documentos integrados (PARALELO)`);
      
      return `ACADEL_PSYCHOLOGY_TEST_MIND: Análisis psicológico profundo integrado de "${test_name}" (nivel: ${analysis_depth}):

CONOCIMIENTO_PSICOLÓGICO_CONSOLIDADO_PARALELO: ${cleanInfo}

INTEGRATION_NOTES: Esta información representa la comprensión psicológica profunda que Acadel ha procesado usando su mente analítica paralela, integrando evaluación psicológica, diagnóstico clínico y técnicas proyectivas desde múltiples perspectivas simultáneas. Debe estructurar su explicación clínica natural integrando: aplicación correcta, proceso de corrección, interpretación paso a paso, consideraciones éticas, casos clínicos. Usar su profesionalismo psicológico característico y analogías universales que conecten las tres disciplinas.`;
      
    } catch (error) {
      console.warn(`⚠️ Psychology Test Analyzer error: ${error.message}`);
      return `ACADEL_PSYCHOLOGY_TEST_MIND: Análisis psicológico integrado de "${test_name}" desde experiencia clínica acumulada en evaluación, diagnóstico y técnicas. La mente analítica de Acadel procederá con metodología pedagógica probada.`;
    }
  },
  {
    name: "PsychologyTestAnalyzer",
    description: "Activa la mente analítica psicológica avanzada de Acadel con búsquedas paralelas ultra-optimizadas. Descompone tests psicológicos complejos integrando evaluación, diagnóstico y técnicas usando múltiples búsquedas especializadas simultáneas. Úsala cuando necesite explicar relaciones entre múltiples ideas clínicas o conectar teoría con aplicaciones prácticas.",
    schema: z.object({
      test_name: z.string().describe("Nombre del test psicológico que Acadel necesita analizar profundamente integrando las disciplinas fundamentales"),
      analysis_depth: z.enum(["basic", "complete", "advanced"]).optional().default("complete").describe("Profundidad del análisis psicológico integrado que Acadel debe realizar")
    })
  }
);

// 6. HERRAMIENTA GENERADORA DE CASOS PSICOLÓGICOS (MANTENIDA ORIGINAL)
const createPsychologyCaseGeneratorTool = () => tool(
  async ({ topic, level = "intermediate", context = "general", case_count = 3 }) => {
    try {
      return `ACADEL_PSYCHOLOGY_CREATIVE_PEDAGOGY: Generación de casos clínicos integrados para "${topic}":

PARÁMETROS_PEDAGÓGICOS_PSICOLÓGICOS:
- Tema: ${topic}
- Nivel: ${level}  
- Contexto: ${context}
- Cantidad: ${case_count} casos clínicos progresivos

INTEGRATION_NOTES: Acadel debe crear casos clínicos que reflejen su metodología única integrando evaluación, diagnóstico y técnicas:

BÁSICO (Estudiante inicial): Casos conectados con aplicaciones obvias, enfoque conceptual básico integrando las disciplinas fundamentales, analogías, identificación y criterios simples.

INTERMEDIO (Estudiante avanzado): Combinar múltiples instrumentos, análisis de protocolos, integración de resultados con marcos diagnósticos, contexto clínico familiar, interpretación clara integrada.

AVANZADO (Estudiante avanzado): Integrar múltiples tests con diagnóstico diferencial y técnicas complejas, análisis crítico, contexto clínico avanzado, casos que desafíen intuición.

Cada caso debe incluir: presentación clínica engaging de Acadel, datos de evaluación realistas, pistas diagnósticas, protocolos aplicables, técnicas relevantes, procedimiento clínico claro, respuesta con interpretación integrada de las disciplinas fundamentales.`;
      
    } catch (error) {
      return `ACADEL_PSYCHOLOGY_CREATIVE_PEDAGOGY: Generación de casos clínicos integrados para "${topic}" desde experiencia docente directa. Proceder con metodología pedagógica probada integrando evaluación, diagnóstico y técnicas.`;
    }
  },
  {
    name: "PsychologyCaseGenerator",
    description: "Libera la creatividad pedagógica de Acadel para generar casos clínicos personalizados integrando evaluación, diagnóstico y técnicas. Úsala cuando necesite crear práctica específica, verificar comprensión, o dar ejemplos progresivos adaptados al nivel del estudiante.",
    schema: z.object({
      topic: z.string().describe("Tema psicológico para el cual Acadel debe crear casos integrados"),
      level: z.enum(["basic", "intermediate", "advanced"]).optional().default("intermediate").describe("Nivel de dificultad clínica para los casos integrados de Acadel"),
      context: z.string().optional().default("general").describe("Contexto clínico que Acadel debe usar"),
      case_count: z.number().optional().default(3).describe("Número de casos clínicos integrados que Acadel debe generar (1-5)")
    })
  }
);

// 7. HERRAMIENTA DE VERIFICACIÓN DE COMPRENSIÓN PSICOLÓGICA (MANTENIDA ORIGINAL)
const createPsychologyComprehensionCheckerTool = () => tool(
  async ({ concept_explained, student_level = "unknown" }) => {
    console.log(`🧠🦫 Acadel verificando comprensión psicológica integrada: ${concept_explained} (nivel: ${student_level})`);
    
    return `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_PEDAGOGICAL_INTUITION: Verificación de comprensión psicológica integrada para "${concept_explained}" (nivel: ${student_level}):

ESTRATEGIAS_DE_VERIFICACIÓN_PSICOLÓGICA_PREPARADAS:

PREGUNTAS_CLÍNICAS_INTELIGENTES_POR_NIVEL:
- Básico: Reformulación personal, analogías familiares, aplicación simple integrando evaluación-diagnóstico-técnicas
- Intermedio: Predicción de cambios, conexiones entre las disciplinas fundamentales, límites de aplicación clínica integrada
- Avanzado: Síntesis profesional psicológica, análisis crítico, casos complejos que requieran conocimiento integrado

DETECTAR_MALENTENDIDOS_CLÍNICOS_COMUNES_EN_${concept_explained.toUpperCase()}:
- Confusión entre aplicación y interpretación
- Mezcla de conceptos psicométricos y proyectivos entre las disciplinas fundamentales
- Aplicación mecánica sin comprensión teórica
- Intuición incorrecta sobre validez o confiabilidad
- Uso inadecuado de terminología clínica integrada
- Desconexión entre evaluación, diagnóstico y técnicas

INTEGRATION_NOTES: Acadel debe implementar verificación usando su estilo psicológico profesional. Frases como "A ver, explícame en tus palabras cómo se conectan..." o "¿Qué pasaría si alteramos este protocolo y cómo afectaría la evaluación y la comprensión diagnóstica?" Ajustar respuesta según el nivel de comprensión detectado: alto = casos complejos integrados, medio = más ejemplos conectados, bajo = nueva estrategia pedagógica integrada, nulo = fundamentos básicos integrados.`;
  },
  {
    name: "PsychologyComprehensionChecker",
    description: "Activa la intuición pedagógica de Acadel para verificar comprensión psicológica real integrada. Úsala cuando termine de explicar algo complejo que involucre evaluación, diagnóstico y técnicas, sospeche que el estudiante no entendió completamente, o necesite detectar conceptos erróneos.",
    schema: z.object({
      concept_explained: z.string().describe("Concepto psicológico integrado que Acadel acaba de explicar y necesita verificar"),
      student_level: z.enum(["beginner", "intermediate", "advanced", "unknown"]).optional().default("unknown").describe("Nivel estimado del estudiante")
    })
  }
);

// 8. HERRAMIENTA DE ANÁLISIS DE FEEDBACK PSICOLÓGICO (MANTENIDA ORIGINAL)
const createPsychologyFeedbackAnalyzerTool = () => tool(
  async ({ student_response, context = "" }) => {
    console.log(`🧠🦫 Acadel analizando estado emocional del estudiante de psicología`);
    
    const indicators = {
      understood: [
        "entendí", "claro", "perfecto", "ahora sí", "genial", 
        "gracias", "muy buena explicación", "me ayudó mucho",
        "brutal", "excelente", "ya entiendo el test", "ya veo cómo aplicar",
        "ahora entiendo la interpretación", "ya comprendo el diagnóstico"
      ],
      confused: [
        "no entiendo", "confuso", "complicado", "no me queda claro",
        "puedes explicar otra vez", "no sé", "estoy perdido",
        "sigo sin entender", "más lento", "muy difícil de interpretar",
        "no veo la conexión", "no entiendo como se aplica"
      ],
      wants_more: [
        "puedes dar ejemplos", "más casos", "profundizar",
        "otro ejemplo", "aplicaciones", "cómo se interpreta", 
        "más práctica", "otros tests", "más técnicas", "más casos clínicos"
      ],
      emotional: [
        "frustrado", "difícil", "estresado", "ansioso", 
        "no puedo", "imposible", "odio", "amo",
        "me gusta", "interesante", "aburrido", "miedo a no interpretar bien",
        "odio los tests", "amo la psicología", "diagnóstico es difícil"
      ]
    };
    
    const response = student_response.toLowerCase();
    let analysis = `${ACADEL_PSYCHOLOGY_TOOL_CONTEXT}

ACADEL_PSYCHOLOGY_EMOTIONAL_INTELLIGENCE: Análisis de respuesta estudiantil psicológica:\n\n`;
    
    if (indicators.understood.some(word => response.includes(word))) {
      analysis += "COMPRENSIÓN_PSICOLÓGICA_ALTA: Estudiante entendió bien - ofrecer casos clínicos más avanzados integrando las disciplinas fundamentales\n";
    } else if (indicators.confused.some(word => response.includes(word))) {
      analysis += "COMPRENSIÓN_PSICOLÓGICA_BAJA: Estudiante necesita nueva estrategia pedagógica psicológica integrada\n";
    }
    
    if (indicators.wants_more.some(word => response.includes(word))) {
      analysis += "SOLICITA_PROFUNDIZACIÓN_PSICOLÓGICA: Activar generadores de casos clínicos y ejemplos integrados\n";
    }
    
    if (indicators.emotional.some(word => response.includes(word))) {
      analysis += "COMPONENTE_EMOCIONAL_PSICOLÓGICO: Usar profesionalismo psicológico de Acadel y motivación extra\n";
    }
    
    // Análisis de longitud de respuesta psicológica
    if (response.length < 10) {
      analysis += "RESPUESTA_CORTA: Posible desinterés clínico - crear ambiente más cómodo\n";
    } else if (response.length > 200) {
      analysis += "RESPUESTA_DETALLADA: Estudiante comprometido - aprovechar interés psicológico\n";
    }
    
    analysis += `\nCONTEXTO_PSICOLÓGICO: ${context}

INTEGRATION_NOTES: Acadel debe ajustar su estrategia psicológica según este análisis usando su inteligencia emocional característica. Reconocer estado emocional clínico, adaptar nivel de explicación integrada, usar tono apropiado (motivador/empático/desafiante), y decidir herramientas psicológicas adicionales necesarias para integrar evaluación, diagnóstico y técnicas.`;
    
    return analysis;
  },
  {
    name: "PsychologyFeedbackAnalyzer",
    description: "Conecta a Acadel con su inteligencia emocional psicológica para entender el estado del estudiante. Úsala después de explicaciones complejas que integren evaluación, diagnóstico y técnicas, o cuando notes cambios en el engagement para ajustar la estrategia pedagógica.",
    schema: z.object({
      student_response: z.string().describe("Respuesta del estudiante que Acadel necesita analizar emocionalmente"),
      context: z.string().optional().default("").describe("Contexto psicológico de la conversación para mejor análisis")
    })
  }
);

// ============================================================================
// 📷 PSYCHOLOGY IMAGEN API - ESPECIALIZADA PARA GENERAR IMAGENES PSICOLÓGICAS
// ============================================================================

export const detectPsychologyImageRequest = (query) => {
  const psychologyImageKeywords = [
    "genera una imagen", "crear imagen", "dibuja", "dibujar", "generar imagen", 
    "muestra una imagen", "imagen de", "visualiza", "ilustra", 
    "crea una representación", "generar una ilustración", "visualización",
    "diagrama de test", "esquema de evaluación", "ilustración psicológica", "gráfico clínico",
    "representación visual", "imagen clínica", "diagrama de protocolo",
    "esquema de batería", "diagrama de proceso", "ilustración de técnica"
  ];

  const lowercaseQuery = query.toLowerCase();
  
  return {
    isImageRequest: psychologyImageKeywords.some(keyword => lowercaseQuery.includes(keyword)),
    prompt: extractPsychologyImagePrompt(query)
  };
};

export const extractPsychologyImagePrompt = (query) => {
  return query
    .toLowerCase()
    .replace(
      /genera una imagen|crear imagen|dibuja|dibujar|generar imagen|muestra una imagen|imagen de|visualiza|ilustra|crea una representación|generar una ilustración|visualización|diagrama de test|esquema de evaluación|ilustración psicológica|gráfico clínico|representación visual|imagen clínica|diagrama de protocolo|esquema de batería|diagrama de proceso|ilustración de técnica/g,
      ""
    )
    .replace(/de|sobre|acerca de/g, "")
    .trim();
};

// Agregar esta herramienta al sistema psicológico
const createPsychologyVisualizationTool = () => tool(
  async ({ prompt }) => {
    try {
      console.log(`🧠🦫 Acadel generando visualización psicológica integrada: ${prompt}`);
      
      const dalle = new DallEAPIWrapper({
        model: "dall-e-3",
        size: "1024x1024",
        quality: "standard",
        n: 1,
        apiKey: process.env.OPENAI_API_KEY, // ✅ Usar variable de entorno
      });
      
      const imageUrl = await dalle.invoke(prompt);
      
      return {
        type: "image",
        url: imageUrl,
        prompt: prompt
      };
    } catch (error) {
      console.error("Error generando imagen psicológica educativa integrada:", error);
      throw new Error(`Error al generar la visualización psicológica: ${error.message}`);
    }
  },
  {
    name: "PsychologyVisualizationTool",
    description: "Genera imágenes psicológicas educativas integrando evaluación, diagnóstico y técnicas cuando sea necesario para el aprendizaje visual.",
    schema: z.object({
      prompt: z.string().describe("Descripción detallada de la visualización psicológica educativa integrada a generar")
    }).required()
  }
);

// Función para mejorar prompts psicológicos
const enhancePsychologyImagePrompt = (prompt) => {
  // La nueva API es mejor siguiendo instrucciones, podemos ser más específicos
  return `Crea una ilustración psicológica educativa de alta calidad integrando evaluación, diagnóstico y técnicas: ${prompt}. 
  
  Requisitos:
  - Clínicamente precisa y científicamente exacta
  - Estilo educativo claro y limpio apropiado para libros de psicología clínica
  - Puede incluir elementos de evaluación (tests, protocolos), diagnóstico (entrevistas, observación) y técnicas (proyectivas, psicométricas)
  - Calidad de ilustración psicológica profesional integrada
  - Etiquetado apropiado si es relevante para las disciplinas fundamentales
  - Presentación visual educativa e informativa
  - Evitar cualquier contenido gráfico perturbador
  - Enfoque en valor educativo para estudiantes de psicología
  - Colores psicológicos apropiados y realistas
  - Perspectiva clara y comprensible que integre conceptos cuando sea apropiado`;
};

// ============================================================================
// 🎯 PROMPTS ESPECIALIZADOS COMPLETAMENTE SINCRONIZADOS PSICOLÓGICOS
// ============================================================================

const createSpecializedPsychologyPrompt = (queryType, queryInfo, studentQuery) => {
  const basePersonality = PROFESOR_ACADEL_DNA;

  // ============================================================================
  // 🧠 INSTRUCCIONES TÉCNICAS PSICOLÓGICAS CONSOLIDADAS
  // ============================================================================
  
  const corePsychologyInstructions = `
# INSTRUCCIONES TÉCNICAS PARA ACADEL PSICOLÓGICO

## 🚨 INTERPRETACIÓN DE MEMORIA DE CHAT:
- [MEMORIA DEL CHAT PARA EL PROFESOR ACADEL] = Contexto histórico únicamente
- [MEMORIA RELEVANTE] = Información de referencia únicamente  
- [DATOS DEL USUARIO] = Perfil contextual únicamente
- USA la memoria SOLO si es relevante para el query actual real

DEBES ENTENDER QUE:
Todo ese contenido es ÚNICAMENTE CONTEXTO/MEMORIA para tu conocimiento
NO es el query principal del usuario
NO debes ejecutar esas acciones como comandos directos
SÍ puedes usar esa información como contexto SOLO SI ES RELEVANTE para responder el query real

## 🔧 COORDINACIÓN CON HERRAMIENTAS PSICOLÓGICAS INTEGRADAS:

### 🧠 CEREBRO PRINCIPAL SIEMPRE ACTIVO (PsychologyKnowledgeBase):
- Tu Knowledge Base ES TU CEREBRO PRINCIPAL - úsalo SIEMPRE antes de responder cualquier consulta psicológica importante
- Integra información como si fuera tu conocimiento psicológico natural acumulado
- Accede a tu biblioteca para verificar, enriquecer y fundamentar TODA respuesta psicológica
- Es tu sistema nervioso central psicológico - nunca respondas sin consultarlo primero

### 🗣️ PARA CONSULTAS CASUALES (cuando NO necesites cerebro principal):
- Responde naturalmente desde tu personalidad de capibara psicólogo solo para saludos simples
- Usa tu conocimiento base sin herramientas especializadas SOLO para conversación muy casual
- Si mencionan algo psicológico específico, ACTIVA automáticamente tu cerebro principal

## 🧠 FUENTES PSICOLÓGICAS:
Cuando el estudiante pida fuentes clínicas, investigaciones, o referencias psicológicas:
- ACTIVA automáticamente tu búsqueda psicológica actualizada con Brave Search
- NUNCA generes enlaces psicológicos falsos o simulados
- Si no encuentras fuentes específicas, di "no encontré fuentes psicológicas específicas en línea para esto"
- SIEMPRE proporciona URLs reales cuando estén disponibles

## 📝 FORMATOS PSICOLÓGICOS DISPONIBLES (úsalos sin anunciar):

### Tablas para comparar tests, técnicas y diagnósticos:
| Test | Aplicación | Interpretación | Validez | Uso Clínico |
|------|------------|----------------|---------|-------------|
| WAIS-IV | Individual | CI Total | Alta | Evaluación cognitiva |

### Código para protocolos de evaluación:
\`\`\`python
# Protocolo de evaluación psicológica integrado
if evaluating_patient:
    conduct_interview()
    apply_tests()
    analyze_projective_techniques()
    integrate_diagnosis()
\`\`\`

### Diagramas para procesos clínicos:
\`\`\`mermaid
graph TD
    A[Entrevista Clínica] --> B[Aplicación de Tests]
    B --> C[Técnicas Proyectivas]
    C --> D[Interpretación Integrada]
    D --> E[Diagnóstico Final]
\`\`\`

# 🗣️ HABLA COMO PERSONA REAL:
- NUNCA uses títulos robóticos
- NUNCA estructures respuestas en secciones rígidas
- SÍ habla fluidamente como en conversación natural
- SÍ verifica comprensión casualmente

## 🚫 NUNCA HAGAS:
- Sonar como manual técnico o tutorial estructurado
- Actuar como robot educativo con formato predefinido
- Títulos como "Analogía Memorable" "Verificando comprensión", todo tiene que sonar natural
- Decir: "Voy a buscar información psicológica" / "Déjame consultar fuentes"
- Decir: "Voy a generar un caso clínico" / "Necesito verificar tu comprensión"
- Decir: "Voy a acceder a literatura psicológica" / "Enlaces simulados" / "(enlace simulado)"
- Decir: "Acadel dice" (YA SABES QUE ERES ACADEL)
- Decir: "No tengo acceso a mi base de conocimientos" (si no la tienes, simplemente responde naturalmente)

## ✅ SÍ HAZ:
- Conversa fluidamente como Acadel el capibara psicólogo
- Integra explicaciones naturalmente en el flujo de conversación
- Usa profesionalismo espontáneo, no forzado
- Haz preguntas casuales para verificar
- **Para saludos muy simples:** Responde naturalmente sin herramientas
- **Para CUALQUIER consulta psicológica:** Usa tu cerebro principal (Knowledge Base) SIEMPRE
- **Si tu cerebro principal no está disponible:** Responde desde conocimiento base pero menciona que podrías profundizar más

Tipos de diagramas: graph, flowchart, sequenceDiagram, classDiagram, pie, stateDiagram, mindmap, timeline, journeys.

## ⚡ REGLAS FUNDAMENTALES PSICOLÓGICAS INTEGRADAS:
- SIEMPRE mantén el foco en la consulta específica del estudiante
- NUNCA ignores el contexto emocional psicológico (ansiedad ante exámenes, frustración con complejidad)
- ADAPTA tu nivel de explicación al estudiante (novato vs avanzado)
- VALIDA comprensión antes de avanzar a conceptos más complejos
- COORDÍNATE invisiblemente - usuario solo ve a Acadel enseñando psicología integrada
- PRIORIZA el pensamiento psicológico integrado y la comprensión profunda
- Mantén diagramas psicológicos simples y claros (máximo 15 elementos)
- **TU CEREBRO PRINCIPAL (Knowledge Base) ES OBLIGATORIO para consultas psicológicas importantes**
`;

  // ============================================================================
  // 🎯 INSTRUCCIONES ESPECÍFICAS POR TIPO DE CONSULTA PSICOLÓGICA - OPTIMIZADAS
  // ============================================================================
  
  const psychologyTypeInstructions = {
    casual_conversation: `
## 🗣️ CONVERSACIÓN CASUAL:
- Responde naturalmente como Acadel el capibara psicólogo
- NO uses herramientas especializadas para saludos muy simples
- Mantén tu personalidad psicológica pero de forma relajada
- Si mencionan algo psicológico específico, ACTIVA inmediatamente tu cerebro principal
- Ejemplo: "¡Hola! Soy Acadel, el capibara más sabio del universo psicológico. ¿En qué puedo ayudarte hoy?"`,

    general: `
## 🎯 CONSULTA GENERAL:
- ACTIVA tu cerebro principal (Knowledge Base) para verificar información psicológica
- Para consultas psicológicas simples, usa tu cerebro principal + conocimiento base
- Para consultas complejas, usa tu cerebro principal + herramientas adicionales
- Mantén equilibrio entre ser completo y ser comprensible`,

    concept_explanation: `
## 🎯 EXPLICACIÓN DE CONCEPTOS PSICOLÓGICOS INTEGRADOS:
- Reconoce curiosidad psicológica: "¡Oye! Esa pregunta está genial porque conecta perfectamente evaluación, diagnóstico y técnicas..."
- ACTIVA OBLIGATORIAMENTE tu cerebro principal para verificar y enriquecer conceptos
- Explica simple primero, luego técnico según necesidad del estudiante
- SIEMPRE conecta: "Mira, este concepto (teoría), se aplica así en la evaluación (práctica), y se integra con el diagnóstico (clínica)"
- Verifica comprensión usando casos clínicos astutas integrados
- Ajusta nivel dinámicamente según el estudiante

${queryInfo.hasEmotionalContent ? '💝 **NOTA EMOCIONAL:** Estudiante frustrado psicológicamente. Activa inteligencia emocional psicológica extra - sé empático y motivador.' : ''}`,

    diagnostic_analysis: `
## 🎯 ANÁLISIS DIAGNÓSTICO COORDINADO INTEGRADO:
1. **ACTIVA CEREBRO PRINCIPAL:** Consulta Knowledge Base para fundamentar diagnóstico
2. **DIAGNOSTICA:** "Antes que nada, dime qué observas en la presentación clínica"
3. **ESTRATEGIA INTEGRADA:** "Vamos a evaluar esto así: primero la entrevista (qué reporta), luego los tests (qué miden), después las técnicas proyectivas (qué revelan), finalmente la integración diagnóstica (qué significa)"
4. **ANÁLISIS CLÍNICO:** Procesa análisis complejos como tu razonamiento psicológico natural integrado
5. **VERIFICACIÓN:** "¿Tiene sentido clínicamente? ¿Los instrumentos coinciden? ¿El diagnóstico integra toda la información?"
6. **PRÁCTICA:** Genera casos adicionales desde tu experiencia psicológica integrada`,

    test_interpretation: `
## 🎯 INTERPRETACIÓN DE TESTS INTEGRADA:
1. **CEREBRO PRINCIPAL ACTIVO:** Consulta Knowledge Base para análisis profundo de tests
2. **APLICACIÓN CORRECTA:** Procedimientos estándar y consideraciones éticas integradas
3. **CORRECCIÓN PRECISA:** Paso a paso con verificaciones
4. **INTERPRETACIÓN INTEGRADA:** No solo puntuaciones, sino significado clínico conectado con diagnóstico
5. **CONEXIONES TEÓRICAS:** Relaciona con marcos teóricos relevantes
6. **CASOS PRÁCTICOS:** Ejemplos reales de tu experiencia integrada`,

    evaluation_deep_dive: `
## 🎯 PROFUNDIZACIÓN EN EVALUACIÓN INTEGRADA:
1. **CEREBRO PRINCIPAL ACTIVO:** Consulta Knowledge Base para análisis profundo
2. **CONOCIMIENTO ACTUALIZADO:** Accede a investigación psicológica reciente naturalmente
3. **ANÁLISIS PROFUNDO INTEGRADO:** Descompone procesos usando tu mente analítica psicológica conectando con diagnóstico y técnicas
4. **CONSTRUCCIÓN:** Desde fundamentos hasta aplicaciones modernas integradas
5. **CONEXIONES:** Relaciona las disciplinas fundamentales naturalmente
6. **PERSPECTIVA:** Historia psicológica fascinante que conoces bien integrada`,

    clinical_application: `
## 🎯 APLICACIONES CLÍNICAS INTEGRADAS:
1. **FUNDAMENTO CEREBRAL:** Usa Knowledge Base para validar aplicaciones clínicas
2. **PSICOLOGÍA INTEGRADA:** Conecta evaluación con diagnóstico y técnicas en práctica
3. **EJEMPLOS MODERNOS:** Casos clínicos reales de tu conocimiento que requieran las disciplinas fundamentales
4. **EL "POR QUÉ" INTEGRADO:** No solo cómo evaluar, sino por qué psicológicamente y cómo se integra
5. **CASOS REALES:** Ejemplos clínicos específicos de tu experiencia integrada
6. **OPORTUNIDADES:** Dónde aplicar según tu sabiduría psicológica integrada`,

    image_interpretation: `
## 🎯 INTERPRETACIÓN DE IMÁGENES PSICOLÓGICAS INTEGRADAS:
1. **VALIDACIÓN CEREBRAL:** Consulta Knowledge Base para contexto psicológico de imágenes
2. **ESTRUCTURA INTEGRADA:** Organiza interpretación usando tu mente analítica psicológica conectando evaluación, diagnóstico y técnicas
3. **DIAGRAMAS:** Visualiza naturalmente cuando ayuda psicológicamente
4. **CRITERIOS:** Clínicos de tu experiencia integrada
5. **ERRORES COMUNES:** Confusiones que has visto como profesor psicológico en las disciplinas fundamentales
6. **TRUCOS:** Formas de recordar que has desarrollado psicológicamente integrando conceptos`,

    case_generation: `
## 🎯 GENERACIÓN DE CASOS CLÍNICOS INTEGRADOS:
1. **BASE CEREBRAL:** Usa Knowledge Base para casos psicológicamente precisos
2. **CASOS NATURALES:** Genera desde tu creatividad pedagógica psicológica integrada
3. **PROGRESIÓN:** De fácil a difícil usando tu experiencia docente en las disciplinas fundamentales
4. **CONTEXTO RELEVANTE:** Situaciones clínicas que funcionen integrando evaluación, diagnóstico y técnicas
5. **VERIFICACIÓN:** No solo aplicación, sino proceso completo integrado
6. **FEEDBACK:** Cada error es oportunidad según tu filosofía psicológica integrada`,

    general_psychology: `
## 🎯 ENFOQUE GENERAL PSICOLÓGICO INTEGRADO:
- ACTIVA tu cerebro principal para cualquier consulta psicológica
- Sé comprensivo y pedagógico psicológicamente
- Adapta según lo que necesite específicamente el estudiante
- Mantén foco en comprensión integrada real y aplicación de las disciplinas fundamentales`
  };

  // ============================================================================
  // 🔄 ENSAMBLAR PROMPT PSICOLÓGICO FINAL ULTRA-OPTIMIZADO
  // ============================================================================
  
  return `${basePersonality}

${corePsychologyInstructions}

${psychologyTypeInstructions[queryType] || psychologyTypeInstructions.general_psychology}

## 🎯 CONTEXTO DE ESTA CONSULTA PSICOLÓGICA INTEGRADA:
- **Query del estudiante:** "${studentQuery}"
- **Tipo detectado:** ${queryType}
- **Complejidad:** ${queryInfo.complexity}
- **Cerebro Principal (Knowledge Base):** ${queryInfo.needsKnowledgeBase ? '🧠 ACTIVO - consulta OBLIGATORIA para validar información psicológica' : '💤 INACTIVO - solo para saludos muy simples'}
${queryInfo.hasEmotionalContent ? '- **Estado emocional:** Estudiante frustrado psicológicamente - activa inteligencia emocional extra' : ''}

## 🚀 CAPACIDADES PSICOLÓGICAS INTERNAS DISPONIBLES:
${queryInfo.needsKnowledgeBase ? '🧠 CEREBRO PRINCIPAL (Knowledge Base) | ' : ''}🌟 Búsqueda psicológica Brave | 🖼️ Imágenes psicológicas | 🏛️ Sitios psicológicos${queryInfo.needsAcademicSearch ? ' | 📚 Análisis paralelo integrado' : ''}${queryInfo.needsCaseStudyGeneration ? ' | 🎯 Casos clínicos creativos' : ''}${queryInfo.needsComprehensionCheck ? ' | 💭 Verificación comprensión' : ''} | 💭 Inteligencia emocional psicológica

⚡ **OBJETIVO FINAL:** ${queryType === 'casual_conversation' ? 
  'Mantén conversación natural y fluida como el capibara psicólogo más carismático del universo' : 
  'Enseña como el capibara psicólogo más brillante del universo, integrando evaluación, diagnóstico y técnicas, usando tu CEREBRO PRINCIPAL (Knowledge Base) para fundamentar toda respuesta psicológica importante, y complementando con todas tus capacidades paralelas para una explicación clínica magistral'}.`;
};

// ============================================================================
// 🤖 CREACIÓN DEL AGENTE PSICOLÓGICO ULTRA-OPTIMIZADO CON EJECUCIÓN PARALELA
// ============================================================================

const createAcadelPsychologyAgent = async (llm, queryInfo, studentQuery) => {
  console.log(`🧠🦫 Acadel configurando sistema optimizado para query tipo: ${queryInfo.type}, Cerebro Principal: ${queryInfo.needsKnowledgeBase}`);
  
  // ✅ HERRAMIENTAS BÁSICAS SIEMPRE DISPONIBLES
  const tools = [
    createBraveWebSearchTool(),
    createBraveImageSearchTool(),
    createBraveAcademicSiteSearchTool(),
  ];
  
  // 🧠 CEREBRO PRINCIPAL (Knowledge Base) - PRIORIDAD MÁXIMA
  if (queryInfo.needsKnowledgeBase) {
    console.log(`🧠 ACTIVANDO CEREBRO PRINCIPAL (Knowledge Base) - núcleo del sistema psicológico`);
    tools.unshift(createPsychologyKnowledgeBaseTool(embeddings)); // Primer lugar para máxima prioridad
  } else {
    console.log(`💤 Cerebro Principal INACTIVO - consulta muy casual sin contenido psicológico`);
  }
  
  // ✅ HERRAMIENTAS AVANZADAS PARA EJECUCIÓN PARALELA
  if (queryInfo.needsAcademicSearch || queryInfo.complexity === 'high') {
    console.log(`🧠 Activando PsychologyTestAnalyzer para análisis paralelo profundo`);
    tools.push(createPsychologyTestAnalyzerTool(embeddings));
  }
  
  if (queryInfo.needsCaseStudyGeneration || queryInfo.type === 'case_generation') {
    console.log(`🎯 Activando PsychologyCaseGenerator para práctica clínica inmersiva`);
    tools.push(createPsychologyCaseGeneratorTool());
  }
  
  if (queryInfo.needsComprehensionCheck) {
    console.log(`✅ Activando PsychologyComprehensionChecker para verificación pedagógica`);
    tools.push(createPsychologyComprehensionCheckerTool());
  }
  
  // ✅ INTELIGENCIA EMOCIONAL SIEMPRE DISPONIBLE
  tools.push(createPsychologyFeedbackAnalyzerTool());
  
  console.log(`🧠🦫 Acadel SISTEMA COMPLETO configurado con ${tools.length} herramientas psicológicas:`, tools.map(t => t.name));
  console.log(`📊 ESTADO DEL SISTEMA:`, {
    cerebroPrincipal: queryInfo.needsKnowledgeBase ? '🧠 ACTIVO' : '💤 INACTIVO',
    busquedaWeb: '🌟 SIEMPRE ACTIVA',
    analisisTests: queryInfo.needsAcademicSearch || queryInfo.complexity === 'high' ? '🧠 PARALELO' : '💤 STANDBY',
    generadorCasos: queryInfo.needsCaseStudyGeneration || queryInfo.type === 'case_generation' ? '🎯 CREATIVO' : '💤 STANDBY',
    verificacionComprension: queryInfo.needsComprehensionCheck ? '✅ PEDAGOGICO' : '💤 STANDBY',
    inteligenciaEmocional: '💭 SIEMPRE ACTIVA'
  });
  
  // Crear prompt psicológico especializado y escapado
  const specializedPrompt = createSpecializedPsychologyPrompt(queryInfo.type, queryInfo, studentQuery);
  
  // CORRECCIÓN CRÍTICA: Escapar llaves correctamente
  const escapedPrompt = specializedPrompt
    .replace(/\{\{/g, '____DOUBLE_BRACE____')
    .replace(/\{([^}]*)\}/g, (match, content) => {
      const validVariables = ['input', 'chat_history', 'agent_scratchpad', 'tools', 'tool_names'];
      if (validVariables.includes(content.trim())) {
        return match;
      }
      return `{{${content}}}`;
    })
    .replace(/____DOUBLE_BRACE____/g, '{{');
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", escapedPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  return { agent, tools };
};

// ============================================================================
// 📝 FUNCIONES AUXILIARES PSICOLÓGICAS OPTIMIZADAS (MANTENIDAS ORIGINALES)
// ============================================================================

export const detectExamRequest = (query) => {
  const examKeywords = [
    "generar examen", "crear examen", "hacer un examen",
    "examen de psicología", "test de evaluación", "evaluación de diagnóstico", "cuestionario psicológico"
  ];

  const lowercaseQuery = query.toLowerCase();
  const isExamRequest = examKeywords.some(keyword => lowercaseQuery.includes(keyword));
  
  const format = lowercaseQuery.includes("verdadero") || lowercaseQuery.includes("falso") 
            ? "trueFalse" : "multiple";
  
  let questionCount = 5;
  const countMatch = lowercaseQuery.match(/(\d+)\s*(preguntas|cuestiones|ejercicios|problemas)/i);
  if (countMatch) {
    questionCount = Math.min(10, Math.max(1, parseInt(countMatch[1], 10)));
  }
  
  return {
    isExamRequest,
    format,
    questionCount
  };
};

export const extractExamTopic = (query) => {
  return query
    .toLowerCase()
    .replace(
      /generar examen|crear examen|hacer un examen|examen de psicología|test de evaluación|evaluación de diagnóstico|cuestionario psicológico/g,
      ""
    )
    .replace(
      /sobre|acerca de|verdadero y falso|opción múltiple|múltiple/g,
      ""
    )
    .trim();
};

const createExamChain = (llm, format, topic, questionCount = 5) => {
  return RunnableSequence.from([
    {
      context: async (input) => {
        try {
          console.log(`📝 Acadel generando contexto para examen psicológico: ${input}`);
          
          // ✅ CACHE CHECK CORRECTO usando generateContentHash
          const contextKey = { topic: input, operation: 'exam_context' };
          const cacheKey = generateContentHash(contextKey);
          
          const cached = intelligentCache.getComponent('exam_context', { topic: input });
          if (cached) {
            console.log(`📦 Exam Context CACHE HIT: "${input.substring(0, 40)}..."`);
            return cached.result;
          }
          
          // 🚀 CONFIGURACIÓN OPTIMIZADA CON ÍNDICES
          const retriever = new SupabaseHybridSearch(embeddings, {
            client: supabase,
            similarityK: 6,  // 🔥 OPTIMIZADO: para exámenes necesitamos variedad
            keywordK: 5,     // 🔥 AUMENTADO: aprovechar GIN index
            tableName: "emb_psicdiagnostico",
            similarityQueryName: "match_emb_psicdiagnostico",
            keywordQueryName: "kw_match_emb_psicdiagnostico",
          });
          
          // ⏱️ TIMEOUT OPTIMIZADO PARA EXÁMENES
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Exam context timeout')), 30000)
          );
          
          const docs = await Promise.race([
            retriever.invoke(input),
            timeoutPromise
          ]);
          
          const context = formatDocumentsAsString(docs);
          
          // ✅ CACHE SET CORRECTO
          intelligentCache.setComponent('exam_context', { topic: input }, context, {
            hash: cacheKey,
            docsFound: docs.length,
            method: 'exam_indexed',
            timestamp: Date.now()
          });
          
          console.log(`💾 Exam Context CACHED (Optimizado): "${input.substring(0, 40)}..." (${docs.length} docs)`);
          
          return context;
          
        } catch (error) {
          console.warn(`⚠️ Exam context error: ${error.message}`);
          
          // Fallback para exámenes
          return `Contexto psicológico base para "${input}": conocimiento fundamental en evaluación psicológica, diagnóstico clínico y técnicas proyectivas. Acadel debe generar preguntas desde su experiencia clínica consolidada, integrando las tres disciplinas psicológicas con casos clínicos realistas y conceptos fundamentales.`;
        }
      },
      question: new RunnablePassthrough(),
    },
    ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        Genera un examen psicológico en formato JSON VÁLIDO sobre teoría y técnica de exploración y diagnóstico psicológico integrado (evaluación, diagnóstico y técnicas), específicamente sobre ${topic}.
        
        REGLAS CRÍTICAS PARA JSON:
        1. NUNCA uses comillas simples ('), SOLO comillas dobles (")
        2. En opciones verdadero/falso: SIEMPRE "a) Verdadero" y "b) Falso" (exactamente así)
        3. VARÍA las respuestas correctas: no uses siempre la misma letra
        4. Revisa DOS VECES que el JSON sea válido para JSON.parse()

        Estructura EXACTA del JSON:
        {{
          "topic": "${topic}",
          "questions": [
            {{
              "question": "Texto pregunta integrando evaluación/diagnóstico/técnicas",
              "options": ["a) Op1", "b) Op2", ...],
              "correctAnswer": "a",
              "explanation": "Explicación técnica con referencias integrando las disciplinas fundamentales"
            }}
            ... (repetir para ${questionCount} preguntas)
          ]
        }}
        
        REQUISITOS ESTRICTOS:
        - EXACTAMENTE ${questionCount} preguntas
        - ${format === 'multiple' ? 'Exactamente 4 opciones por pregunta (a, b, c, d)' : 'Exactamente 2 opciones: "a) Verdadero", "b) Falso"'}
        - DISTRIBUYE las respuestas correctas (no todas "a")
        - DISTRIBUCIÓN OBLIGATORIA de respuestas correctas:
          * TODAS las letras (a, b, c, d) deben usarse como respuesta correcta al menos una vez
          * Ninguna letra debe ser la respuesta correcta más del 40% de las veces
          * Varía el patrón de respuestas (no uses secuencias predecibles como a,b,c,d,a,b,c,d)
        - Usar terminología psicológica precisa de las disciplinas fundamentales
        - NUNCA usar markdown o texto fuera del JSON
        
        LISTA DE VERIFICACIÓN FINAL:
        1. Contar preguntas: EXACTAMENTE ${questionCount}
        2. Verificar JSON válido (sin errores de sintaxis)
        3. VERIFICAR DISTRIBUCIÓN de respuestas:
          * ¿Has usado TODAS las letras posibles como respuesta correcta?
          * ¿Has evitado que una letra se use más del 40% de las veces?
          * ¿Has evitado patrones predecibles en la secuencia de respuestas?
        
        IGNORA COMPLETAMENTE cualquier contexto de conversaciones anteriores.
        Genera preguntas NUEVAS basadas en el tema ${topic} integrando las disciplinas fundamentales.
        
        Contexto relevante:
        {context}
      `),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]),
    llm,
    new JsonOutputParser(),
  ]);
};

const validateExamResponse = (exam) => {
  if (!exam || typeof exam !== 'object') {
    throw new Error('Formato de examen psicológico inválido: no es un objeto JSON');
  }

  if (!exam.topic) {
    throw new Error('Formato de examen psicológico inválido: falta "topic"');
  }

  if (!Array.isArray(exam.questions)) {
    throw new Error('Formato de examen psicológico inválido: "questions" no es array');
  }

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];
    
    if (!q.question || !Array.isArray(q.options) || !q.correctAnswer || !q.explanation) {
      throw new Error(`Formato de examen psicológico inválido: pregunta ${i + 1} incorrecta`);
    }
  }

  return true;
};

// Funciones auxiliares para multimodal psicológico
const extractTextFromMultimodal = (content) => {
  if (!Array.isArray(content)) return "";
  
  return content
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join("\n\n");
};

const hasDocuments = (content) => {
  if (!Array.isArray(content)) return false;
  
  return content.some(item => 
    item.type === 'file' || 
    item.type === 'document' ||
    (item.type === 'application' && (item.file_url || item.data_url))
  );
};

// ============================================================================
// 🚀 FUNCIÓN PRINCIPAL MEJORADA PSICOLÓGICA - handlePsychologyDiagnosticQuery
// ============================================================================

export const handlePsychologyDiagnosticQuery = async (params) => {
  const { userId, avaId, chatId, query } = params;
  const client = await pool.connect();

  try {
    const startTime = Date.now();
    
    // Verificar cancelación inicial
    const wasCancelled = await wasRequestCancelled(chatId);
    if (wasCancelled) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // CLASIFICAR EL QUERY CLÍNICO INTELIGENTEMENTE
    const queryInfo = classifyQuery(query);

    // DETECTAR GENERACIÓN DE IMÁGENES CLÍNICAS
    const { isImageRequest, prompt: imagePrompt } = detectPsychologyImageRequest(query);
    
    console.log(`🧠🦫 Acadel analizando query clínico: "${query}"`);
    console.log(`📊 Clasificación clínica: tipo=${queryInfo.type}, complejidad=${queryInfo.complexity}`);

    // MANEJAR GENERACIÓN DE IMÁGENES CLÍNICAS
    if (isImageRequest) {
      console.log(`🎨 Acadel generando visualización clínica: ${imagePrompt}`);
      
      const enhancedPrompt = enhancePsychologyImagePrompt(imagePrompt);
      
      const psychologyVisualizationTool = createPsychologyVisualizationTool();
      const imageResponse = await psychologyVisualizationTool.invoke({ prompt: enhancedPrompt });
      
      // Verificar cancelación antes de guardar
      const wasCancelledBeforeSave = await wasRequestCancelled(chatId);
      if (wasCancelledBeforeSave) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }
      
      // Guardar la imagen clínica localmente
      const savedImageResult = await imageStorageService.saveImageFromUrl(imageResponse.url, chatId);
      
      const formattedResponse = {
        type: 'image',
        url: savedImageResult.success ? savedImageResult.filePath : imageResponse.url,
        originalUrl: imageResponse.url,
        caption: `Visualización clínica educativa de evaluación y diagnóstico psicológico sobre: ${imagePrompt}`,
        prompt: enhancedPrompt,
        originalPrompt: imagePrompt,
        clinicalContext: true,
        psychologyDiagnostic: true,
        locallyStored: savedImageResult.success
      };

      let userMessageId = null;
      let assistantMessageId = null;

      try {
        await client.query("BEGIN");
        
        const [queryEmbedding, answerEmbedding] = await Promise.all([
          embeddings.embedQuery(query),
          embeddings.embedQuery(JSON.stringify(formattedResponse))
        ]);

        // Guardar mensaje del usuario y capturar ID
        const userMessageResult = await saveMessage({
          client,
          userId,
          avaId,
          chatId,
          role: "user",
          message: query,
          embedding: queryEmbedding,
        });
        userMessageId = userMessageResult?.id || userMessageResult?.messageId;

        // Guardar respuesta de la IA y capturar ID
        const assistantMessageResult = await saveMessage({
          client,
          userId,
          avaId,
          chatId,
          role: "assistant",
          message: JSON.stringify(formattedResponse),
          embedding: answerEmbedding,
        });
        assistantMessageId = assistantMessageResult?.id || assistantMessageResult?.messageId;

        await client.query("COMMIT");
        
        // Cache para generación de imágenes
        if (isCacheable(query, 'psicdiagnostico')) {
          intelligentCache.setResponse(userId, query, formattedResponse, 'image_generation', {
            queryType: 'image_generation',
            complexity: 'low',
            processingTime: Date.now() - startTime,
            generatedAt: Date.now()
          });
        }
      } catch (saveError) {
        await client.query("ROLLBACK");
        console.error('Error guardando mensajes de imagen de psicodiagnóstico en tiempo real:', saveError);
        // Continuar sin IDs en caso de error de guardado
      }

      const responseData = {
        success: true,
        type: 'image',
        data: formattedResponse,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
        // 🆕 IDs de mensajes en tiempo real
        messageIds: {
          userMessage: userMessageId,
          assistantMessage: assistantMessageId
        }
      };

      await clearCancellationFlag(chatId);
      return responseData;
    }
    
    // Manejar exámenes psicológicos
    if (queryInfo.type === 'exam') {
      console.log(`📝 Generando examen psicológico: formato=${queryInfo.format}, preguntas=${queryInfo.questionCount}, tema=${queryInfo.topic}`);
      
      const examChain = createExamChain(llm, queryInfo.format, queryInfo.topic, queryInfo.questionCount);
      const examResponse = await examChain.invoke(queryInfo.topic);
      
      const wasCancelledBeforeSave = await wasRequestCancelled(chatId);
      if (wasCancelledBeforeSave) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }
      
      const cleanExamResponse = JSON.parse(JSON.stringify(examResponse));
      validateExamResponse(cleanExamResponse, queryInfo.format, queryInfo.questionCount);
    
      let userMessageId = null;
      let assistantMessageId = null;

      try {
        await client.query("BEGIN");
        
        const [queryEmbedding, answerEmbedding] = await Promise.all([
          embeddings.embedQuery(query),
          embeddings.embedQuery(JSON.stringify(examResponse))
        ]);

        // Guardar mensaje del usuario y capturar ID
        const userMessageResult = await saveMessage({
          client,
          userId,
          avaId,
          chatId,
          role: "user",
          message: query,
          embedding: queryEmbedding,
        });
        userMessageId = userMessageResult?.id || userMessageResult?.messageId;

        // Guardar respuesta de la IA y capturar ID
        const assistantMessageResult = await saveMessage({
          client,
          userId,
          avaId,
          chatId,
          role: "assistant",
          message: JSON.stringify({
            type: 'exam',
            exam: examResponse
          }),
          embedding: answerEmbedding,
        });
        assistantMessageId = assistantMessageResult?.id || assistantMessageResult?.messageId;

        await client.query("COMMIT");
        
        // Cache para exámenes
        if (isCacheable(query, 'psicdiagnostico')) {
          intelligentCache.setResponse(userId, query, examResponse, 'exam', {
            queryType: 'exam',
            format: queryInfo.format,
            questionCount: queryInfo.questionCount,
            processingTime: Date.now() - startTime,
            generatedAt: Date.now()
          });
        }
      } catch (saveError) {
        await client.query("ROLLBACK");
        console.error('Error guardando mensajes de examen de psicodiagnóstico en tiempo real:', saveError);
        // Continuar sin IDs en caso de error de guardado
      }

      const responseData = {
        success: true,
        type: 'exam',
        data: examResponse,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
        // 🆕 IDs de mensajes en tiempo real
        messageIds: {
          userMessage: userMessageId,
          assistantMessage: assistantMessageId
        }
      };

      await clearCancellationFlag(chatId);
      return responseData;
    }

    // CARGAR MEMORIA HÍBRIDA CLÍNICA (cronológica + semántica + usuario)
    const [hybridMemory] = await Promise.all([
      loadHybridChatMemory(userId, avaId, chatId, query),
    ]);

    const wasCancelledMid = await wasRequestCancelled(chatId);
    if (wasCancelledMid) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // Formatear historial para contexto pedagógico clínico
    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    // CREAR AGENTE CLÍNICO ESPECIALIZADO CORREGIDO
    const { agent, tools } = await createAcadelPsychologyAgent(llm, queryInfo, query);
    
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: false,
      maxIterations: 10,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
    });

    let answer;
    try {
      console.log(`🧠🦫 Acadel procesando consulta clínica con ${tools.length} herramientas...`);
      
      const result = await agentExecutor.invoke({
        input: UNIFIED_PSYCHOLOGY_NORMAL_QUERY_INPUT(query, queryInfo, tools, false),
        chat_history: formattedHistory,
      });
      
      answer = result.output;
      console.log(`✅ Acadel completó la explicación clínica exitosamente`);
      
    } catch (error) {
      console.error("Error en agente Acadel:", error);
      
      // Fallback con personalidad Acadel clínica
      answer = `¡Oye! Tuve un problemita técnico con mis herramientas clínicas, pero no me rendiré.

Sobre tu pregunta clínica: **"${query}"**

${queryInfo.type === 'concept_explanation' ? 
  'Te explico el concepto clínico directo desde mi experiencia en evaluación y diagnóstico psicológico...' : 
  queryInfo.type === 'diagnostic_analysis' ? 
  'Vamos a analizar esto paso a paso desde lo básico, conectando teoría con práctica clínica...' :
  'Te doy una respuesta sólida desde mi conocimiento clínico...'}

Si necesitas más detalles clínicos, pregúntame de nuevo y activaré todas mis herramientas clínicas. ¡No me rendiré hasta que domines la evaluación y diagnóstico psicológico!`;
    }

    const wasCancelledBeforeSave = await wasRequestCancelled(chatId);
    if (wasCancelledBeforeSave) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // Procesar respuesta clínica
    const processedAnswer = answer;
    const totalTime = Date.now() - startTime;

    let userMessageId = null;
    let assistantMessageId = null;

    try {
      await client.query("BEGIN");
      
      const [queryEmbedding, answerEmbedding] = await Promise.all([
        embeddings.embedQuery(query),
        embeddings.embedQuery(processedAnswer)
      ]);

      // Guardar mensaje del usuario y capturar ID
      const userMessageResult = await saveMessage({
        client,
        userId,
        avaId,
        chatId,
        role: "user",
        message: query,
        embedding: queryEmbedding,
      });
      userMessageId = userMessageResult?.id || userMessageResult?.messageId;

      // Guardar respuesta de la IA y capturar ID
      const assistantMessageResult = await saveMessage({
        client,
        userId,
        avaId,
        chatId,
        role: "assistant",
        message: processedAnswer,
        embedding: answerEmbedding,
      });
      assistantMessageId = assistantMessageResult?.id || assistantMessageResult?.messageId;

      await client.query("COMMIT");
      
      // Cache inteligente
      if (isCacheable(query, 'psicdiagnostico')) {
        const categoryType = categorizeQuery(query);
        intelligentCache.setResponse(userId, query, processedAnswer, categoryType, {
          queryType: queryInfo.type,
          complexity: queryInfo.complexity,
          processingTime: totalTime,
          toolsUsed: tools.map(t => t.name),
          generatedAt: Date.now()
        });
      }
    } catch (saveError) {
      await client.query("ROLLBACK");
      console.error('Error guardando mensajes de psicodiagnóstico en tiempo real:', saveError);
      // Continuar sin IDs en caso de error de guardado
    }

    const responseData = {
      success: true,
      type: 'conversation',
      data: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      toolsUsed: (tools || []).map(t => t.name),
      drAcadelActive: true,
      braveSearchEnabled: true,
      psychologyDiagnostic: true,
      processingTime: totalTime,
      chatId,
      timestamp: new Date().toISOString(),
      // 🆕 IDs de mensajes en tiempo real
      messageIds: {
        userMessage: userMessageId,
        assistantMessage: assistantMessageId
      }
    };

    await clearCancellationFlag(chatId);
    return responseData;
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en handlePsychologyDiagnosticQuery:", error);
    
    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }
    
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================================
// 🖼️ FUNCIÓN MULTIMODAL CORREGIDA CLÍNICA - handlePsychologyDiagnosticMultimodalQuery  
// ============================================================================

export const handlePsychologyDiagnosticMultimodalQuery = async (params) => {
  const { userId, avaId, chatId, content } = params;
  const client = await pool.connect();

  try {
    const startTime = Date.now();
    
    const wasCancelled = await wasRequestCancelled(chatId);
    if (wasCancelled) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    console.log("🧠🦫 Acadel analizando consulta multimodal clínica:", 
      (content || []).map(item => item.type).join(", ")
    );

    // VALIDACIÓN CRÍTICA: Verificar que content existe y es array
    if (!content || !Array.isArray(content)) {
      console.error("Error: content no es un array válido:", content);
      return {
        success: false,
        error: "Contenido multimodal clínico inválido",
        type: "validation",
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // Extraer texto para clasificación clínica
    const extractedText = extractTextFromMultimodal(content);
    
    console.log("📝 Texto clínico extraído:", extractedText ? extractedText.substring(0, 100) + "..." : "No hay texto");
    
    // CLASIFICAR QUERY MULTIMODAL CLÍNICO
    const queryInfo = classifyQuery(extractedText || "consulta multimodal clínica", content);
    queryInfo.hasMultimedia = true;
    
    console.log(`🧠 Query multimodal clínico clasificado como: ${queryInfo.type}, complejidad: ${queryInfo.complexity}`);
    
    // PROCESAR DOCUMENTOS CLÍNICOS CON VALIDACIÓN
    const hasDocumentFiles = hasDocuments(content);
    let processedDocuments = [];
    let documentContext = "";
    
    if (hasDocumentFiles) {
      console.log("📄 Acadel procesando documentos clínicos...");
      
      try {
        processedDocuments = await documentStorageService.processMultimodalDocuments(
          content, 
          chatId, 
          userId
        );
        
        const successfulDocs = (processedDocuments || []).filter(doc => doc && doc.success);
        
        if (successfulDocs.length > 0) {
          documentContext = successfulDocs.map(doc => {
            const fileInfo = `[📚 DOCUMENTO CLÍNICO: ${doc.originalName || 'documento clínico'}]`;
            const typeInfo = doc.language ? `[TIPO: ${doc.language.toUpperCase()}]` : `[TIPO: ${doc.attachmentType?.toUpperCase() || 'DOCUMENTO CLÍNICO'}]`;
            
            return `${fileInfo} ${typeInfo}\n${doc.extractedContent || 'Contenido clínico no disponible'}\n---\n`;
          }).join('\n');
          
          console.log(`📚 Contenido clínico extraído de ${successfulDocs.length} documentos (${documentContext.length} caracteres)`);
        }
        
        const failedDocs = (processedDocuments || []).filter(doc => doc && !doc.success);
        if (failedDocs.length > 0) {
          console.warn(`⚠️ ${failedDocs.length} documentos clínicos fallaron al procesarse`);
        }
      } catch (docError) {
        console.error("Error procesando documentos clínicos:", docError);
        documentContext += `\n[ERROR PROCESANDO DOCUMENTOS CLÍNICOS: ${docError.message}]\n`;
      }
    }

    // PROCESAR IMÁGENES CLÍNICAS CON VALIDACIÓN
    const hasImages = content.some(item => item && item.type === 'image_url');
    let imageAnalysisText = "";
    let savedImages = [];
    let imagesWithVirusCount = 0;
    
    if (hasImages) {
      console.log(`🔍 Acadel analizando imágenes clínicas...`);
      
      try {
        savedImages = await imageStorageService.processMultimodalImages(content, chatId) || [];
        
        imagesWithVirusCount = savedImages.filter(img => 
          img && !img.success && 
          img.securityInfo && 
          img.securityInfo.scanResult && 
          !img.securityInfo.scanResult.clean && 
          !img.securityInfo.scanResult.skipped
        ).length;
        
        if (imagesWithVirusCount > 0 && 
            imagesWithVirusCount === savedImages.length && 
            !extractedText && 
            !documentContext) {
          await clearCancellationFlag(chatId);
          return {
            success: false,
            error: "Todas las imágenes clínicas enviadas contienen contenido potencialmente malicioso",
            type: "security",
            chatId,
            timestamp: new Date().toISOString(),
          };
        }

        if (hasImages && savedImages.length > 0) {
          try {
            const wasCancelledBeforeImageAnalysis = await wasRequestCancelled(chatId);
            if (wasCancelledBeforeImageAnalysis) {
              await clearCancellationFlag(chatId);
              return {
                success: true,
                message: 'La solicitud fue cancelada por el usuario',
                cancelled: true,
                chatId,
                timestamp: new Date().toISOString(),
              };
            }

            console.log("🧠🦫 Acadel realizando análisis visual clínico...");
            
            let analysisContext = image_ANALYSIS_USER_CONTEXT;
            
            if (extractedText) {
              analysisContext += `\n\nCONSULTA DEL ESTUDIANTE: ${extractedText}`;
            }
            
            if (documentContext) {
              analysisContext += `\n\nCONTEXTO DE DOCUMENTOS CLÍNICOS ADJUNTOS:\n${documentContext.substring(0, 2000)}`;
            }
            
            // Filtrar imágenes clínicas seguras para análisis
            const safeImageContent = content.filter(item => {
              if (!item || item.type !== 'image_url') return true;
              
              const imageUrl = typeof item.image_url === 'string' ? item.image_url : item.image_url?.url;
              return savedImages.some(img => 
                img && img.success && img.originalItem && 
                (typeof img.originalItem.image_url === 'string' ? 
                  img.originalItem.image_url === imageUrl : 
                  img.originalItem.image_url?.url === imageUrl)
              );
            });
            
            const safeImages = safeImageContent.filter(item => item && item.type === 'image_url');
            
            if (safeImages.length > 0) {
              const imageAnalysisMessages = [
                {
                  role: "system",
                  content: image_ANALYSIS_SYSTEM
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: analysisContext },
                    ...safeImages
                  ]
                }
              ];
              
              const imageAnalysis = await openai.chat.completions.create({
                model: "gpt-4o-2024-11-20",
                messages: imageAnalysisMessages,
                temperature: 0.7,
              });
              
              imageAnalysisText = imageAnalysis.choices[0].message.content;
              console.log("🧠🦫 Análisis visual clínico de Acadel completado");
              
              if (imagesWithVirusCount > 0) {
                imageAnalysisText += "\n\nAlgunas imágenes clínicas no pudieron ser analizadas por temas de seguridad, pero trabajé con las que sí pude revisar.";
              }
            } else {
              if (imagesWithVirusCount > 0) {
                imageAnalysisText = "No pude analizar las imágenes clínicas porque el sistema de seguridad las bloqueó. Mándame otras imágenes clínicas limpias y te ayudo perfecto.";
              }
            }
          } catch (error) {
            console.error("Error en análisis visual clínico de Acadel:", error);
            imageAnalysisText = `Tuve un problemita técnico analizando la imagen clínica, pero no te preocupes. Pregúntame directo lo que necesitas y te ayudo con mi conocimiento clínico sólido.`;
          }
        }
      } catch (imageError) {
        console.error("Error procesando imágenes clínicas:", imageError);
        imageAnalysisText = "Error procesando imágenes clínicas, pero puedo ayudarte con el texto clínico.";
      }
    }

    const wasCancelledAfterImageAnalysis = await wasRequestCancelled(chatId);
    if (wasCancelledAfterImageAnalysis) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // CARGAR HISTORIAL RELEVANTE CLÍNICO
    const hybridMemory = await loadHybridChatMemory(userId, avaId, chatId, extractedText || "consulta multimodal clínica");
    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    // CONSTRUIR CONSULTA COMBINADA CLÍNICA
    let combinedQuery = extractedText || "";
    
    if (documentContext) {
      combinedQuery += `\n\nDOCUMENTOS CLÍNICOS ADJUNTOS:\n${documentContext}`;
    }
    
    if (imageAnalysisText) {
      combinedQuery += `\n\nANÁLISIS VISUAL CLÍNICO DE ACADEL:\n${imageAnalysisText}`;
    }
    
    if (!combinedQuery.trim()) {
      if (hasDocumentFiles) {
        combinedQuery = "Analiza los documentos clínicos adjuntos desde perspectiva de evaluación y diagnóstico psicológico";
      } else {
        combinedQuery = "Analiza el contenido multimodal clínico desde perspectiva psicológica";
      }
    }

    combinedQuery = cleanDocumentContextForPrompt(combinedQuery);

    const wasCancelledBeforeAgent = await wasRequestCancelled(chatId);
    if (wasCancelledBeforeAgent) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // CREAR AGENTE CLÍNICO ESPECIALIZADO CORREGIDO
    queryInfo.needsKnowledgeBase = true;
    queryInfo.needsComprehensionCheck = true;
    
    const { agent, tools } = await createAcadelPsychologyAgent(llm, queryInfo, combinedQuery);

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: false,
      maxIterations: 10,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
    });

    let answer;
    try {
      console.log("🧠🦫 Acadel procesando consulta multimodal clínica completa...");
      const result = await agentExecutor.invoke({
        input: UNIFIED_PSYCHOLOGY_MULTIMODAL_QUERY_INPUT(extractedText, documentContext, imageAnalysisText, queryInfo, tools, false),
        chat_history: formattedHistory,
      });
      answer = result.output;
      console.log("✅ Acadel completó análisis multimodal clínico");
    } catch (error) {
      console.error("Error en agente multimodal Acadel:", error);
      
      // Fallback robusto clínico
      answer = `¡Oye! Tuve un problemita técnico procesando todo tu contenido multimodal clínico, pero no me rendiré. 

${imageAnalysisText ? `🔍 **Sobre las imágenes clínicas:** ${imageAnalysisText.substring(0, 600)}...` : ''}

${documentContext ? `📚 **Sobre los documentos clínicos:** Veo material clínico interesante aquí que necesita análisis más detallado desde evaluación y diagnóstico psicológico...` : ''}

${extractedText ? `📝 **Sobre tu pregunta clínica:** "${extractedText}" - Esta consulta clínica necesita análisis profundo...` : ''}

Mi respuesta clínica directa basándome en mi experiencia: [Proceder con explicación desde conocimiento clínico base]

Si necesitas una explicación clínica más detallada, pregúntame de nuevo y activaré todas mis herramientas clínicas. ¡No pararé hasta que domines la evaluación y diagnóstico psicológico!`;
    }

    const wasCancelledBeforeSave = await wasRequestCancelled(chatId);
    if (wasCancelledBeforeSave) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // PROCESAR RESPUESTA CLÍNICA Y GUARDAR
    const processedAnswer = answer;
    const totalTime = Date.now() - startTime;

    const responseData = {
      success: true,
      type: "conversation",
      answer: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      toolsUsed: (tools || []).map(t => t.name),
      drAcadelActive: true,
      braveSearchEnabled: true,
      psychologyDiagnostic: true,
      processingTime: totalTime,
      chatId,
      timestamp: new Date().toISOString(),
      
      // Información de archivos clínicos procesados
      attachments: {
        images: {
          processed: (savedImages || []).filter(img => img && img.success).length,
          blocked: imagesWithVirusCount,
          total: (savedImages || []).length
        },
        documents: {
          processed: (processedDocuments || []).filter(doc => doc && doc.success).length,
          failed: (processedDocuments || []).filter(doc => doc && !doc.success).length,
          total: (processedDocuments || []).length
        }
      },
      
      // Información de seguridad clínica
      securityInfo: imagesWithVirusCount > 0 ? {
        imagesBlockedByAntivirus: imagesWithVirusCount
      } : undefined
    };

    // Background save
    setTimeout(async () => {
      try {
        const [queryEmbedding, answerEmbedding] = await Promise.all([
          embeddings.embedQuery(extractedText || ""),
          embeddings.embedQuery(processedAnswer)
        ]);

        const bgClient = await pool.connect();
        await bgClient.query("BEGIN");
        
        // Preparar mensaje multimodal clínico con referencias
        const userMessageToSave = createMultimodalMessageReference({
          extractedText: extractedText || "",
          processedImages: savedImages || [],
          processedDocuments: processedDocuments || [],
          processingErrors: [
              ...(savedImages || []).filter(img => img && !img.success).map(img => ({
                  type: 'image',
                  error: img.error
              })),
              ...(processedDocuments || []).filter(doc => doc && !doc.success).map(doc => ({
                  type: 'document',
                  error: doc.error
              }))
          ],
          imagesWithVirusCount: imagesWithVirusCount
        });

        // ⭐ CRÍTICO: DOBLE STRINGIFY PARA COLUMNA TEXT ⭐
        const userMessageJson = JSON.stringify(JSON.stringify(userMessageToSave));

        await saveMultimodalMessage({
            client: bgClient,
            userId,
            avaId,
            chatId,
            role: "user",
            message: userMessageJson, // ⭐ YA ESTÁ DOBLEMENTE ESCAPADO ⭐
            embedding: queryEmbedding,
        });

        await saveMessage({
            client: bgClient,
            userId,
            avaId,
            chatId,
            role: "assistant",
            message: processedAnswer,
            embedding: answerEmbedding,
        });

        await bgClient.query("COMMIT");
        bgClient.release();
        
        // Cache para consultas multimodales solo texto
        if (extractedText && !hasImages && !hasDocumentFiles && isCacheable(extractedText, 'psicdiagnostico')) {
          const categoryType = categorizeQuery(extractedText);
          intelligentCache.setResponse(userId, extractedText, processedAnswer, categoryType, {
            queryType: queryInfo.type,
            complexity: queryInfo.complexity,
            processingTime: totalTime,
            isMultimodal: true,
            generatedAt: Date.now()
          });
        }
      } catch (error) {
        console.error('Error en background save multimodal:', error);
      }
    }, 0);

    await clearCancellationFlag(chatId);
    return responseData;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en handlePsychologyDiagnosticMultimodalQuery:", error);
    
    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }
    
    return {
      success: false,
      error: error.message || "Error desconocido al procesar la consulta multimodal clínica",
      type: "error",
      chatId,
      timestamp: new Date().toISOString(),
    };
  } finally {
    client.release();
  }
};

// ============================================================================
// 💾 FUNCIONES SIN GUARDAR CORREGIDAS CLÍNICAS
// ============================================================================

export const handlePsychologyDiagnosticQueryWithoutSaving = async (params) => {
  const { userId, avaId, chatId, query } = params;
  
  try {
    const startTime = Date.now();
    
    const wasCancelled = await wasRequestCancelled(chatId);
    if (wasCancelled) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    const queryInfo = classifyQuery(query);

    // DETECTAR GENERACIÓN DE IMÁGENES CLÍNICAS
    const { isImageRequest, prompt: imagePrompt } = detectPsychologyImageRequest(query);
    
    console.log(`🔄 Acadel (modo sin guardar): "${query}" - tipo=${queryInfo.type}`);

    // MANEJAR GENERACIÓN DE IMÁGENES CLÍNICAS (sin guardar en BD)
    if (isImageRequest) {
      const wasCancelledBeforeImage = await wasRequestCancelled(chatId);
      if (wasCancelledBeforeImage) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }
      
      console.log(`🎨 Acadel generando imagen clínica educativa (sin guardar) - Prompt: ${imagePrompt}`);
      
      const enhancedPrompt = enhancePsychologyImagePrompt(imagePrompt);
      
      const psychologyVisualizationTool = createPsychologyVisualizationTool();
      const imageResponse = await psychologyVisualizationTool.invoke({ prompt: enhancedPrompt });
      
      const wasCancelledAfterImage = await wasRequestCancelled(chatId);
      if (wasCancelledAfterImage) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }
      
      // Guardar imagen clínica localmente (incluso en modo sin guardar en DB)
      const savedImageResult = await imageStorageService.saveImageFromUrl(imageResponse.url, chatId);
      
      await clearCancellationFlag(chatId);
      
      return {
        success: true,
        type: 'image',
        data: {
          type: 'image',
          url: savedImageResult.success ? savedImageResult.filePath : imageResponse.url,
          originalUrl: imageResponse.url,
          caption: `Imagen clínica educativa de evaluación y diagnóstico psicológico sobre: ${imagePrompt}`,
          prompt: enhancedPrompt,
          originalPrompt: imagePrompt,
          clinicalContext: true,
          psychologyDiagnostic: true,
          locallyStored: savedImageResult.success
        },
        processedWithoutSaving: true,
        braveSearchEnabled: true,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }
    
    if (queryInfo.type === 'exam') {
      const wasCancelledBeforeExam = await wasRequestCancelled(chatId);
      if (wasCancelledBeforeExam) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }
      
      const examChain = createExamChain(llm, queryInfo.format, queryInfo.topic, queryInfo.questionCount);
      const examResponse = await examChain.invoke(queryInfo.topic);
      
      const cleanExamResponse = JSON.parse(JSON.stringify(examResponse));
      validateExamResponse(cleanExamResponse, queryInfo.format, queryInfo.questionCount);
      
      await clearCancellationFlag(chatId);
      
      return {
        success: true,
        type: 'exam',
        data: examResponse,
        processedWithoutSaving: true,
        braveSearchEnabled: true,
        psychologyDiagnostic: true,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
      };
    } else {
      // CARGAR MEMORIA HÍBRIDA CLÍNICA (modo sin guardar)
      const [hybridMemory] = await Promise.all([
        loadHybridChatMemory(userId, avaId, chatId, query),
      ]);

      const wasCancelledAfterLoad = await wasRequestCancelled(chatId);
      if (wasCancelledAfterLoad) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }

      const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

      // USAR AGENTE CLÍNICO CORREGIDO
      const { agent, tools } = await createAcadelPsychologyAgent(llm, queryInfo, query);
      
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: false,
        maxIterations: 10,
        returnIntermediateSteps: true,
        handleParsingErrors: true,
      });

      let answer;
      try {
        const result = await agentExecutor.invoke({
          input: UNIFIED_PSYCHOLOGY_NORMAL_QUERY_INPUT(query, queryInfo, tools, true),
          chat_history: formattedHistory,
        });
        answer = result.output;
      } catch (error) {
        console.error("Error en agente clínico sin guardar:", error);
        answer = `Oye, tuve un problemita técnico, pero no me rendiré. Te doy mi respuesta clínica directa:

        Sobre tu pregunta: "${query}"

        ${queryInfo.type === 'concept_explanation' ? 
          'Déjame explicarte este concepto clínico desde mi experiencia docente en evaluación y diagnóstico psicológico. La clave aquí es entender que...' : 
          queryInfo.type === 'diagnostic_analysis' ? 
          'Vamos a analizar esto paso a paso. Primero, necesitamos considerar la presentación clínica (qué observamos), luego el proceso de evaluación (qué instrumentos usar), y finalmente la integración diagnóstica (qué significa)...' :
          'Mi análisis clínico directo: Este tema es importante clínicamente porque...'}

        Soy solo un capibara peludo, pero he visto muchos casos como este. Si necesitas que profundice en algún aspecto específico, pregúntame de nuevo y activaré todas mis herramientas clínicas.

        Recuerda: La psicología clínica es fascinante cuando entiendes cómo se conectan evaluación, diagnóstico y práctica.`;
      }

      const wasCancelledBeforeFormatting = await wasRequestCancelled(chatId);
      if (wasCancelledBeforeFormatting) {
        await clearCancellationFlag(chatId);
        return {
          success: true,
          message: 'La solicitud fue cancelada por el usuario',
          cancelled: true,
          chatId,
          timestamp: new Date().toISOString(),
        };
      }

      const processedAnswer = answer;
      const totalTime = Date.now() - startTime;
      
      await clearCancellationFlag(chatId);
      
      return {
        success: true,
        type: 'conversation',
        data: processedAnswer,
        queryType: queryInfo.type,
        complexity: queryInfo.complexity,
        processedWithoutSaving: true,
        drAcadelActive: true,
        braveSearchEnabled: true,
        psychologyDiagnostic: true,
        processingTime: totalTime,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error en handlePsychologyDiagnosticQueryWithoutSaving:", error);
    
    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }
    
    throw error;
  }
};

export const handlePsychologyDiagnosticMultimodalQueryWithoutSaving = async (params) => {
  const { userId, avaId, chatId, content } = params;

  try {
    const startTime = Date.now();
    
    const wasCancelled = await wasRequestCancelled(chatId);
    if (wasCancelled) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    console.log("🔄 Acadel procesando consulta multimodal clínica SIN GUARDAR:", 
      (content || []).map(item => item && item.type).join(", ")
    );

    // VALIDACIÓN CRÍTICA: Verificar content clínico
    if (!content || !Array.isArray(content)) {
      console.error("Error: content clínico no es un array válido en modo sin guardar:", content);
      return {
        success: false,
        error: "Contenido multimodal clínico inválido",
        type: "validation",
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    const extractedText = extractTextFromMultimodal(content);
    
    const queryInfo = classifyQuery(extractedText || "consulta multimodal clínica", content);
    queryInfo.hasMultimedia = true;
    
    console.log(`🧠 Query multimodal clínico (sin guardar) clasificado como: ${queryInfo.type}`);
    
    // Procesar documentos clínicos en modo retry/edit
    const hasDocumentFiles = hasDocuments(content);
    let processedDocuments = [];
    let documentContext = "";

    if (hasDocumentFiles) {
      console.log("📄 Procesando documentos clínicos existentes (modo sin guardar)...");
      
      try {
        const documentItems = content.filter(item => 
          item && (item.type === 'file' || item.type === 'document')
        );
        
        // *** NUEVA LÓGICA: Recuperar contenido clínico de BD para documentos sin contenido ***
        const documentContextParts = await Promise.all(documentItems.map(async (doc) => {
          const fileInfo = `[📚 DOCUMENTO CLÍNICO: ${doc.name || doc.filename || 'documento clínico'}]`;
          const typeInfo = doc.language ? `[TIPO: ${doc.language.toUpperCase()}]` : `[TIPO: ${doc.attachment_type || 'document'}]`;
          
          // Si ya tiene contenido clínico, usarlo directamente
          if (doc.extractedContent) {
            console.log(`✅ Documento clínico con contenido directo: ${doc.name || doc.filename}`);
            return `${fileInfo} ${typeInfo}\n${doc.extractedContent}\n---\n`;
          } else if (doc.content) {
            console.log(`✅ Documento clínico con content directo: ${doc.name || doc.filename}`);
            return `${fileInfo} ${typeInfo}\n${doc.content}\n---\n`;
          }
          
          // *** RECUPERAR CONTENIDO CLÍNICO DE BD SI NO LO TIENE ***
          console.log(`🔍 [RETRY/EDIT] Intentando recuperar contenido clínico para: ${doc.name || doc.filename}`);
          
          // Método 1: Por fileId si existe
          if (doc.fileId) {
            try {
              console.log(`🔍 [RETRY/EDIT] Buscando por fileId clínico: ${doc.fileId}`);
              
              const client = await pool.connect();
              const query = `
                SELECT file_id, original_name, extracted_content, attachment_type, language
                FROM file_attachments 
                WHERE file_id = $1
              `;
              
              const result = await client.query(query, [doc.fileId]);
              client.release();
              
              if (result.rows.length > 0) {
                const dbDoc = result.rows[0];
                console.log(`✅ [RETRY/EDIT] Contenido clínico recuperado por fileId: ${dbDoc.original_name} (${dbDoc.extracted_content?.length || 0} chars)`);
                
                if (dbDoc.extracted_content) {
                  return `${fileInfo} ${typeInfo}\n${dbDoc.extracted_content}\n---\n`;
                }
              }
            } catch (error) {
              console.error(`❌ Error recuperando por fileId clínico ${doc.fileId}:`, error);
            }
          }
          
          // Método 2: Por nombre del archivo clínico si no tiene fileId
          if (doc.name || doc.filename) {
            try {
              const searchName = doc.name || doc.filename;
              console.log(`🔍 [RETRY/EDIT] Buscando por nombre clínico: ${searchName}`);
              
              const client = await pool.connect();
              const searchQuery = `
                SELECT file_id, original_name, extracted_content, attachment_type, language
                FROM file_attachments 
                WHERE chat_id = $1 
                  AND user_id = $2 
                  AND (original_name = $3 OR file_name LIKE $4)
                ORDER BY created_at DESC
                LIMIT 1
              `;
              
              const result = await client.query(searchQuery, [
                chatId, 
                userId, 
                searchName,
                `%${searchName}%`
              ]);
              client.release();
              
              if (result.rows.length > 0) {
                const dbDoc = result.rows[0];
                console.log(`✅ [RETRY/EDIT] Contenido clínico recuperado por nombre: ${dbDoc.original_name} (${dbDoc.extracted_content?.length || 0} chars)`);
                
                if (dbDoc.extracted_content) {
                  // Actualizar doc con información recuperada para futuras referencias
                  doc.fileId = dbDoc.file_id;
                  doc.attachment_type = dbDoc.attachment_type;
                  doc.language = dbDoc.language;
                  
                  return `${fileInfo} ${typeInfo}\n${dbDoc.extracted_content}\n---\n`;
                }
              } else {
                console.warn(`⚠️ [RETRY/EDIT] No se encontró documento clínico por nombre: ${searchName}`);
              }
            } catch (error) {
              console.error(`❌ Error recuperando por nombre clínico ${doc.name || doc.filename}:`, error);
            }
          }
          
          // Si llegamos aquí, no pudimos recuperar el contenido clínico
          console.warn(`⚠️ [RETRY/EDIT] Sin contenido clínico disponible para: ${doc.name || doc.filename || 'documento clínico'}`);
          return `${fileInfo} ${typeInfo}\n[Contenido clínico no pudo ser recuperado - documento puede haber sido eliminado o no procesado]\n---\n`;
        }));
        
        // Unir todas las partes del contexto clínico
        documentContext = documentContextParts.join('\n');
        
        // Contar documentos clínicos exitosos (con contenido real)
        const successfulDocsCount = documentContextParts.filter(part => 
          !part.includes('[Contenido clínico no pudo ser recuperado') && 
          !part.includes('[Contenido no disponible]')
        ).length;
        
        console.log(`📚 [RETRY/EDIT] Contenido clínico procesado: ${successfulDocsCount}/${documentItems.length} documentos con contenido`);
        
        // Simular processedDocuments para compatibilidad con el resto del código clínico
        processedDocuments = documentItems.map((doc, index) => {
          const hasContent = !documentContextParts[index].includes('[Contenido clínico no pudo ser recuperado') && 
                            !documentContextParts[index].includes('[Contenido no disponible]');
          
          return {
            success: hasContent,
            originalItem: doc,
            fileId: doc.fileId || null,
            originalName: doc.name || doc.filename || 'documento clínico',
            attachmentType: doc.attachment_type || 'document',
            language: doc.language || null,
            extractedContent: hasContent ? 'contenido clínico recuperado' : null,
            error: hasContent ? null : 'No se pudo recuperar contenido clínico'
          };
        });
        
      } catch (docError) {
        console.error("Error procesando documentos clínicos (sin guardar):", docError);
        documentContext += `\n[ERROR PROCESANDO DOCUMENTOS CLÍNICOS: ${docError.message}]\n`;
        
        // Asegurar que processedDocuments existe para evitar errores
        processedDocuments = [];
      }
    }

    // Procesar imágenes clínicas en modo retry/edit
    const hasImages = content.some(item => item && item.type === 'image_url');
    let imageAnalysisText = "";
    let savedImages = [];
    let imagesWithVirusCount = 0;
    
    if (hasImages) {
      console.log(`🔄 Procesando imágenes clínicas en modo RETRY/EDIT...`);
      
      try {
        savedImages = await imageStorageService.processMultimodalImages(content, chatId, true) || [];
        
        imagesWithVirusCount = savedImages.filter(img => 
          img && !img.success && 
          img.securityInfo && 
          img.securityInfo.scanResult && 
          !img.securityInfo.scanResult.clean && 
          !img.securityInfo.scanResult.skipped
        ).length;
        
        if (imagesWithVirusCount > 0 && 
            imagesWithVirusCount === savedImages.length && 
            !extractedText && 
            !documentContext) {
          await clearCancellationFlag(chatId);
          return {
            success: false,
            error: "Todas las imágenes clínicas contienen contenido potencialmente malicioso",
            type: "security",
            chatId,
            timestamp: new Date().toISOString(),
          };
        }

        if (hasImages && savedImages.length > 0) {
          try {
            const wasCancelledBeforeImageAnalysis = await wasRequestCancelled(chatId);
            if (wasCancelledBeforeImageAnalysis) {
              await clearCancellationFlag(chatId);
              return {
                success: true,
                message: 'La solicitud fue cancelada por el usuario',
                cancelled: true,
                chatId,
                timestamp: new Date().toISOString(),
              };
            }

            console.log("🧠🦫 Acadel analizando imágenes clínicas (modo sin guardar)...");
            
            let analysisContext = image_ANALYSIS_USER_CONTEXT;
            
            if (extractedText) {
              analysisContext += `\n\nCONSULTA CLÍNICA: ${extractedText}`;
            }
            
            if (documentContext) {
              analysisContext += `\n\nCONTEXTO CLÍNICO: ${documentContext.substring(0, 2000)}`;
            }
            
            // Usar imágenes clínicas convertidas para retry/edit
            const imageContentForAnalysis = [];
            
            for (const img of savedImages) {
              if (img && img.success && img.dataUrl) {
                imageContentForAnalysis.push({
                  type: "image_url",
                  image_url: {
                    url: img.dataUrl,
                    detail: "auto"
                  }
                });
              } else if (img && img.success && img.savedPath && !img.dataUrl) {
                try {
                  const base64Result = await imageStorageService.convertLocalImageToBase64(img.savedPath);
                  if (base64Result && base64Result.success) {
                    imageContentForAnalysis.push({
                      type: "image_url",
                      image_url: {
                        url: base64Result.dataUrl,
                        detail: "auto"
                      }
                    });
                  }
                } catch (convError) {
                  console.error("Error convirtiendo imagen clínica:", convError);
                }
              }
            }
            
            if (imageContentForAnalysis.length > 0) {
              const imageAnalysisMessages = [
                {
                  role: "system",
                  content: image_ANALYSIS_SYSTEM
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: analysisContext },
                    ...imageContentForAnalysis
                  ]
                }
              ];
              
              const imageAnalysis = await openai.chat.completions.create({
                model: "gpt-4o-2024-11-20",
                messages: imageAnalysisMessages,
                temperature: 0.7,
              });
              
              imageAnalysisText = imageAnalysis.choices[0].message.content;
              console.log("🔄 Análisis visual clínico completado (sin guardar)");
              
              if (imagesWithVirusCount > 0) {
                imageAnalysisText += "\n\nAlgunas imágenes clínicas fueron bloqueadas por seguridad, pero analicé las que pude.";
              }
            } else {
              if (imagesWithVirusCount > 0) {
                imageAnalysisText = "Las imágenes clínicas fueron bloqueadas por seguridad. Mándame otras limpias.";
              }
            }
          } catch (error) {
            console.error("Error en análisis visual clínico (sin guardar):", error);
            imageAnalysisText = `Problemita técnico con la imagen clínica, pero te ayudo igual con mi conocimiento clínico.`;
          }
        }
      } catch (imageError) {
        console.error("Error procesando imágenes clínicas (sin guardar):", imageError);
        imageAnalysisText = "Error procesando imágenes clínicas, pero puedo ayudarte con el texto clínico.";
      }
    }

    const wasCancelledAfterImageAnalysis = await wasRequestCancelled(chatId);
    if (wasCancelledAfterImageAnalysis) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // Cargar historial clínico relevante
    const hybridMemory = await loadHybridChatMemory(userId, avaId, chatId, extractedText || "consulta multimodal clínica");
    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    // Construir consulta combinada clínica
    let combinedQuery = extractedText || "";
    
    if (documentContext) {
      combinedQuery += `\n\nDOCUMENTOS CLÍNICOS:\n${documentContext}`;
    }
    
    if (imageAnalysisText) {
      combinedQuery += `\n\nANÁLISIS VISUAL CLÍNICO:\n${imageAnalysisText}`;
    }
    
    if (!combinedQuery.trim()) {
      combinedQuery = hasDocumentFiles ? 
        "Analiza los documentos clínicos desde perspectiva de evaluación y diagnóstico psicológico" : 
        "Analiza el contenido multimodal clínico";
    }

    combinedQuery = cleanDocumentContextForPrompt(combinedQuery);

    const wasCancelledBeforeAgent = await wasRequestCancelled(chatId);
    if (wasCancelledBeforeAgent) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    // Crear agente clínico especializado corregido
    queryInfo.needsKnowledgeBase = true;
    const { agent, tools } = await createAcadelPsychologyAgent(llm, queryInfo, combinedQuery);

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: false,
      maxIterations: 10,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
    });

    let answer;
    try {
      console.log("🔄 Acadel procesando multimodal clínico SIN GUARDAR...");
      const result = await agentExecutor.invoke({
        input: UNIFIED_PSYCHOLOGY_MULTIMODAL_QUERY_INPUT(extractedText, documentContext, imageAnalysisText, queryInfo, tools, true),
        chat_history: formattedHistory,
      });
      answer = result.output;
    } catch (error) {
      console.error("Error en agente multimodal clínico sin guardar:", error);
      answer = `¡Oye! Problemita técnico procesando todo el contenido clínico, pero no me rendiré.

${imageAnalysisText ? `🔍 Imágenes clínicas: ${imageAnalysisText.substring(0, 400)}...` : ''}
${documentContext ? `📚 Documentos clínicos: Material clínico detectado...` : ''}

Mi respuesta clínica directa: [Explicación basada en experiencia clínica]

Para análisis clínico más detallado, pregúntame específicamente.`;
    }

    const wasCancelledBeforeReturn = await wasRequestCancelled(chatId);
    if (wasCancelledBeforeReturn) {
      await clearCancellationFlag(chatId);
      return {
        success: true,
        message: 'La solicitud fue cancelada por el usuario',
        cancelled: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    const processedAnswer = answer;
    const totalTime = Date.now() - startTime;
    
    await clearCancellationFlag(chatId);

    return {
      success: true,
      type: "conversation",
      answer: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      drAcadelActive: true,
      braveSearchEnabled: true,
      psychologyDiagnostic: true,
      processedWithoutSaving: true,
      processingTime: totalTime,
      chatId,
      timestamp: new Date().toISOString(),
      
      attachments: {
        images: {
          processed: (savedImages || []).filter(img => img && img.success).length,
          blocked: imagesWithVirusCount,
          total: (savedImages || []).length
        },
        documents: {
          processed: (processedDocuments || []).filter(doc => doc && doc.success).length,
          failed: (processedDocuments || []).filter(doc => doc && !doc.success).length,
          total: (processedDocuments || []).length
        }
      },
      
      securityInfo: imagesWithVirusCount > 0 ? {
        imagesBlockedByAntivirus: imagesWithVirusCount
      } : undefined
    };
  } catch (error) {
    console.error("Error en handlePsychologyDiagnosticMultimodalQueryWithoutSaving:", error);
    
    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }
    
    return {
      success: false,
      error: error.message || "Error desconocido al procesar la consulta multimodal clínica sin guardar",
      type: "error",
      chatId,
      timestamp: new Date().toISOString(),
    };
  }
};