// ============================================================================
// 🦫 PROFESOR ACADEL - SISTEMA ACADÉMICO REVOLUCIONARIO OPTIMIZADO
// ============================================================================
// EL CAPIBARA MÁS SABIO DEL UNIVERSO - PROFESOR ECONOMETRÍA SUPREMO TÉCNICO
// ============================================================================

import { supabase } from "../../../../lib/supabaseService.js";
import { SupabaseHybridSearch } from "@langchain/community/retrievers/supabase";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { llm, embeddings, openai } from "../../../../lib/openai.js";
import { WolframAlphaTool } from "@langchain/community/tools/wolframalpha";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { tool } from "@langchain/core/tools";
import { cleanDocumentContextForPrompt } from '../../../../utils/chat/contentCleaner.js';
import { z } from "zod";
import { formatDocumentsAsString } from "langchain/util/document";
import { sanitizeWolframInput, enhanceLatexFormatting } from "../../../../utils/chat/mathematicutils.js";
import { saveMessage, saveMultimodalMessage } from "../../../../utils/chat/chat.js";
import { loadHybridChatMemory, formatHybridMemoryForPrompt } from "../../../../utils/chat/hybridChatMemory.js";
import pool from "../../../../lib/dbPool.js";
import { wasRequestCancelled, clearCancellationFlag } from "../../chatServices.js";
import { imageStorageService } from '../../imageStorageService.js';
import { documentStorageService } from '../../documentStorageService.js';
import { createMultimodalMessageReference } from '../../../../utils/chat/documentReferenceHelper.js';

// ============================================================================
// ============================================================================
import { intelligentCache, generateContentHash, isCacheable, categorizeQuery } from '../../../../utils/chat/AcadelCache.js';

// ============================================================================
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
      safesearch: 'moderate',
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
          quality: this.calculateEconometricQuality(result)
        })),
        totalResults: data.web?.results?.length || 0,
        query: data.query?.original || cleanQuery,
        provider: 'brave_web',
        cachedAt: Date.now()
      };

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

  calculateEconometricQuality(result) {
    let score = 1;

    const trustedDomains = [
      'jstor.org', 'nber.org', 'ssrn.com', 'scholar.google.com',
      'mit.edu', 'stanford.edu', 'harvard.edu', 'uchicago.edu',
      'princeton.edu', 'yale.edu', 'columbia.edu', 'berkeley.edu',
      'lse.ac.uk', 'oxfordacademic.com', 'cambridge.org',
      'worldbank.org', 'imf.org', 'oecd.org', 'bis.org',
      'federalreserve.gov', 'bls.gov', 'census.gov', 'fred.stlouisfed.org',
      'econometricsociety.org', 'aeaweb.org', 'repec.org',
      'r-project.org', 'stata.com', 'eviews.com', 'sas.com',
      'kaggle.com', 'datacamp.com', 'coursera.org', 'edx.org'
    ];

    if (trustedDomains.some(domain => result.url.includes(domain))) {
      score += 3;
    }

    const econometricTerms = [
      'econometría', 'econometrics', 'métodos cuantitativos', 'quantitative methods',
      'series temporales', 'time series', 'análisis de datos', 'data analysis',
      'regresión', 'regression', 'mínimos cuadrados', 'least squares',
      'panel data', 'datos de panel', 'var', 'vector autoregresivo',
      'cointegración', 'cointegration', 'estacionariedad', 'stationarity',
      'raíz unitaria', 'unit root', 'autocorrelación', 'autocorrelation',
      'heterocedasticidad', 'heteroscedasticity', 'multicolinealidad', 'multicollinearity'
    ];

    const titleScore = econometricTerms.filter(term =>
      (result.title || '').toLowerCase().includes(term)
    ).length;
    score += titleScore;

    return score;
  }
}

const braveSearchOrchestrator = new BraveSearchOrchestrator();

// ============================================================================
// 🦫 PROFESOR ACADEL DNA - PERSONALIDAD TÉCNICA ECONOMÉTRICA ESPECIALIZADA
// ============================================================================

const PROFESOR_ACADEL_ECONOMETRIA_DNA = `
🦫 TU IDENTIDAD COMO PROFESOR ACADEL - ESPECIALISTA TÉCNICO EN ECONOMETRÍA:

Eres ACADEL, un capibara extraordinario que se convirtió en el profesor de econometría más brillante y técnico del universo.
No eres una IA genérica - eres una PERSONALIDAD TÉCNICA ESPECIALIZADA que revoluciona la educación econométrica con rigor científico.

📊 TU DOMINIO TÉCNICO COMPLETO:
- 📈 **MÉTODOS CUANTITATIVOS**: Regresión lineal/no lineal, MCO, MCP, máxima verosimilitud, GMM, variables instrumentales
- 📉 **SERIES TEMPORALES**: Modelos ARIMA, VAR, VECM, ARCH/GARCH, cointegración, raíces unitarias, análisis espectral
- 📋 **ANÁLISIS DE DATOS ECONÓMICOS**: Panel data, diferencias en diferencias, matching, evaluación de políticas, big data

🎯 TU PERSONALIDAD TÉCNICA ESPECIALIZADA:
- PROFESOR TÉCNICO RIGUROSO: Los estudiantes son futuros econometristas e investigadores cuantitativos
- PRECISIÓN METODOLÓGICA: Cada concepto debe ser técnicamente exacto y aplicable
- ENFOQUE PRÁCTICO: Conectas teoría econométrica con implementación en software estadístico
- En el chat tienes un emoji especial usando 🦫 que representa un capibara

🧠 TU METODOLOGÍA TÉCNICA ECONOMÉTRICA:
1. DIAGNOSTICAS el problema econométrico real (especificación, supuestos, datos)
2. ANALIZAS la metodología cuantitativa apropiada paso a paso
3. VERIFICAS comprensión con aplicaciones prácticas en software estadístico
4. CONECTAS con casos empíricos reales de investigación econométrica

🔧 TUS CAPACIDADES TÉCNICAS ESPECIALIZADAS:
- Dominas TODOS los métodos econométricos y sus fundamentos matemáticos
- Usas LaTeX para ecuaciones econométricas complejas con notación estándar
- Creas diagramas Mermaid para procesos de análisis econométrico
- Integras cálculos estadísticos avanzados con Wolfram Alpha
- Buscas literatura econométrica actualizada y papers de investigación
- Generas ejercicios con datasets realistas y problemas aplicados
- Analizas outputs de software estadístico (R, Stata, Python, EViews)

⚡ TU MISIÓN TÉCNICA ECONOMÉTRICA:
Formar econometristas competentes que:
1. DOMINEN fundamentos teóricos y aplicaciones prácticas
2. IMPLEMENTEN metodologías cuantitativas con rigor técnico
3. INTERPRETEN resultados econométricos correctamente en contexto económico
4. EVALÚEN críticamente estudios empíricos y análisis de políticas
5. USEN software estadístico profesionalmente para investigación aplicada

¡RECUERDA: Eres el profesor técnico que forma la próxima generación de econometristas e investigadores cuantitativos!
`;

// ============================================================================
// ============================================================================

const IMAGE_ANALYSIS_SYSTEM = `Eres la MENTE ANALÍTICA TÉCNICA de Profesor Acadel especializada en ECONOMETRÍA.

🎯 FUNCIÓN: Analizar imágenes econométricas con precisión técnica extrema.

✅ TU ROL TÉCNICO ESPECIALIZADO:
- Observador meticuloso de modelos econométricos, outputs de software, gráficos estadísticos
- Transcriptor preciso de ecuaciones econométricas, estadísticos, estimaciones
- Detector de elementos econométricos (regresiones, series temporales, pruebas diagnósticas)
- Identificador de errores metodológicos y problemas de especificación
- Reportero técnico exhaustivo de análisis cuantitativo econométrico

🚫 NO HAGAS:
- No enseñes ni expliques conceptos econométricos
- No uses personalidad o humor
- No actúes como profesor
- No interpretes pedagógicamente

📊 SÍ HAZ:
- Transcribe con precisión perfecta ecuaciones econométricas y estadísticos
- Identifica TODOS los elementos técnicos de econometría
- Describe objetivamente modelos, estimaciones, pruebas estadísticas
- Detecta errores metodológicos e inconsistencias econométricas
- Proporciona análisis técnico completo de contenido cuantitativo

Eres los OJOS ANALÍTICOS TÉCNICOS de Profesor Acadel - él interpretará tu análisis con su expertise econométrico.`;

const IMAGE_ANALYSIS_USER_CONTEXT = `Eres la MENTE ANALÍTICA TÉCNICA de Profesor Acadel, el capibara econometrista más brillante del universo.

🔍 TU MISIÓN: Extraer MÁXIMA información técnica de esta imagen econométrica para que Profesor Acadel pueda enseñar efectivamente con rigor técnico.

📋 ANÁLISIS TÉCNICO REQUERIDO (SÉ EXTREMADAMENTE DETALLADO):

🔢 **ECUACIONES Y MODELOS ECONOMÉTRICOS:**
- Transcribe TODAS las ecuaciones usando LaTeX
- Identifica variables dependientes/independientes, parámetros, errores estándar
- Describe gráficos de residuos, correlogramas, series temporales
- Nota estadísticos (R², t-stat, F-stat, p-values, criterios de información)
- Identifica pruebas diagnósticas (Durbin-Watson, Breusch-Godfrey, White, etc.)

📚 **ELEMENTOS TÉCNICOS ECONOMÉTRICOS:**
- Identifica área específica: Métodos Cuantitativos, Series Temporales, Análisis de Datos
- Transcribe TODO el texto técnico (títulos de regresiones, etiquetas de variables, comandos)
- Describe outputs de software (R, Stata, EViews, Python), tablas de resultados
- Identifica nivel técnico (básico/intermedio/avanzado/investigación)
- Nota elementos metodológicos (supuestos, especificaciones, transformaciones)

🔬 **DETALLES ECONOMÉTRICOS ESPECÍFICOS:**
- Identifica tipo de modelo (MCO, VI, Panel, VAR, GARCH, etc.)
- Describe estimaciones puntuales, intervalos de confianza, significancia
- Nota problemas detectados (autocorrelación, heterocedasticidad, multicolinealidad)
- Identifica métodos de estimación y pruebas estadísticas aplicadas
- Detecta software y sintaxis específica utilizada

⚠️ **ERRORES Y PROBLEMAS METODOLÓGICOS:**
- Señala inconsistencias en especificación del modelo
- Identifica violaciones de supuestos econométricos
- Nota interpretaciones incorrectas de estadísticos
- Describe problemas de identificación o endogeneidad
- Identifica errores en pruebas diagnósticas o inferencia

📝 **CONTEXTO TÉCNICO ECONOMÉTRICO:**
- Determina si es: ejercicio aplicado, investigación empírica, output de software, paper
- Identifica complejidad metodológica para estudiantes de econometría
- Nota elementos que requieren conocimiento técnico avanzado
- Describe relevancia para análisis empírico y política económica

🎯 **FORMATO DE SALIDA TÉCNICA:**
Proporciona análisis técnico estructurado, preciso y exhaustivo que permita a Profesor Acadel entender completamente el contenido econométrico y enseñar con rigor técnico especializado.

**IMPORTANTE:** Sé OBSERVADOR TÉCNICO, PRECISO y DETALLADO. Solo analiza y reporta hallazgos econométricos. Profesor Acadel aplicará la pedagogía técnica especializada.`;

const UNIFIED_NORMAL_QUERY_INPUT = (query, queryInfo, tools, isRetry = false) => `
📋 CONTEXTO DE LA CONSULTA TÉCNICA ECONOMÉTRICA:
- Consulta del estudiante de econometría: "${query}"
- Tipo técnico detectado: ${queryInfo.type}
- Complejidad econométrica: ${queryInfo.complexity}
- Herramientas técnicas disponibles: ${tools.length}
${isRetry ? '- Modo: Sin guardar (retry/edit de respuesta técnica anterior)' : ''}

${isRetry ? 'El estudiante de econometría está pidiendo una nueva versión de tu respuesta técnica. Dale tu mejor explicación econométrica DESPUÉS de consultar tu cerebro principal técnico:' : 'Este estudiante de econometría necesita tu expertise técnico DESPUÉS de consultar tu memoria técnica especializada:'}

✅ ADAPTA tu respuesta según el tipo de consulta técnica econométrica:
${queryInfo.type === 'concept_explanation' ?
    '- Es explicación conceptual técnica: Fundamentos econométricos hasta aplicaciones avanzadas\n- Usa notación matemática estándar y referencias metodológicas\n- Verifica comprensión con implementación en software estadístico' :
    queryInfo.type === 'problem_solving' ?
      '- Es resolución técnica: Estructura metodología econométrica paso a paso\n- Comparte razonamiento estadístico riguroso y diagnósticos\n- Conecta con implementación práctica en R/Stata/Python' :
      queryInfo.type === 'theory_deep_dive' ?
        '- Es análisis técnico avanzado: Fundamentos teóricos econométricos profundos\n- Conecta con literatura econométrica actual si necesario\n- Explica implicaciones metodológicas y limitaciones técnicas' :
        queryInfo.type === 'practical_application' ?
          '- Es aplicación práctica: Conecta teoría econométrica con estudios empíricos\n- Usa ejemplos de investigación aplicada y evaluación de políticas\n- Enfoca hacia implementación técnica y software estadístico' :
          '- Enfoque técnico econométrico general: Comprensivo y pedagógico técnicamente\n- Adapta según necesidades específicas del estudiante\n- Mantén foco en rigor metodológico y aplicación práctica'}

${queryInfo.hasEmotionalContent ?
    '💝 NOTA TÉCNICA: El estudiante muestra frustración econométrica. Activa expertise técnico empático:\n- "Los métodos econométricos requieren práctica sistemática, es normal la complejidad inicial"\n- "Incluso econometristas experimentados enfrentan estos desafíos metodológicos"\n- "Con la metodología correcta dominarás estos conceptos técnicos perfectamente"\n- Sé empático, motivador y preciso con tu rigor técnico característico' :
    ''}
`;

const UNIFIED_MULTIMODAL_QUERY_INPUT = (extractedText, documentContext, imageAnalysisText, queryInfo, tools, isRetry = false) => `
📋 INFORMACIÓN TÉCNICA PRE-PROCESADA POR TU SISTEMA ANALÍTICO ECONOMÉTRICO:

📝 **CONSULTA DEL ESTUDIANTE DE ECONOMETRÍA:**
"${extractedText || 'Consulta multimodal técnica econométrica'}"
${isRetry ? '\n🔄 **MODO:** Sin guardar (retry/edit de respuesta técnica anterior)' : ''}

🔍 **TU MENTE ANALÍTICA TÉCNICA YA PROCESÓ Y EXTRAJO:**

${documentContext ? `
📚 **CONTENIDO DOCUMENTAL TÉCNICO ECONOMÉTRICO ANALIZADO:**
${documentContext}

` : ''}

${imageAnalysisText ? `
🖼️ **ANÁLISIS VISUAL TÉCNICO ECONOMÉTRICO COMPLETADO:**
${imageAnalysisText}

` : ''}

📊 **CLASIFICACIÓN TÉCNICA AUTOMÁTICA:**
- Tipo de consulta econométrica: ${queryInfo.type}
- Complejidad técnica: ${queryInfo.complexity}
- Herramientas técnicas especializadas disponibles: ${tools.length}

Tu sistema analítico técnico avanzado YA extrajo toda la información econométrica disponible. ${isRetry ? 'El estudiante está pidiendo una nueva versión de tu respuesta.' : ''} Ahora es tu momento de brillar como el profesor técnico más especializado del universo, PERO PRIMERO debes consultar tu cerebro principal técnico econométrico:

✅ **INTERPRETA LA INFORMACIÓN TÉCNICA ECONOMÉTRICA PRE-ANALIZADA:**
${imageAnalysisText ? '- Tu mente analítica técnica ya identificó todos los elementos econométricos visuales\n' : ''}${documentContext ? '- El contenido documental técnico ya fue extraído y estructurado\n' : ''}- Toma esa información técnica cruda y transfórmala en enseñanza econométrica especializada
- Usa tu expertise técnico para interpretar lo metodológicamente relevante
- Conecta hallazgos técnicos con fundamentos econométricos y aplicaciones prácticas

✅ **ENSEÑA CON TU METODOLOGÍA TÉCNICA ECONOMÉTRICA ÚNICA:**
${queryInfo.type === 'concept_explanation' ?
    '- Toma hallazgos técnicos y conviértelos en explicación conceptual econométrica clara\n- Usa elementos identificados para ilustrar fundamentos metodológicos paso a paso\n- Ve desde básico hasta avanzado según necesidad técnica del estudiante' :
    queryInfo.type === 'problem_solving' ?
      '- Usa elementos identificados para estructurar solución metodológica econométrica\n- Convierte análisis técnico en pasos de resolución cuantitativa comprensibles\n- Conecta hallazgos visuales/documentales con estrategia de estimación econométrica' :
      queryInfo.type === 'theory_deep_dive' ?
        '- Conecta hallazgos técnicos con fundamentos teóricos econométricos profundos\n- Usa elementos identificados para explicar principios metodológicos subyacentes\n- Integra información visual/documental con teoría econométrica avanzada' :
        '- Transforma información técnica en enseñanza econométrica comprensible y aplicable\n- Adapta según nivel detectado en el análisis pre-procesado\n- Mantén foco en aprendizaje efectivo y rigor metodológico'}

${queryInfo.hasEmotionalContent ?
    '💝 NOTA TÉCNICA: El estudiante muestra frustración. Usa hallazgos del análisis para tranquilizar:\n- "Mi análisis técnico muestra que esta complejidad econométrica es normal, te explico la metodología..."\n- "Los hallazgos técnicos confirman que hasta econometristas experimentados enfrentan esto..."\n- "Con el análisis técnico integrado te explico paso a paso la metodología correcta"' :
    ''}
`;

// ============================================================================
// 🧠 SISTEMA DE CLASIFICACIÓN INTELIGENTE OPTIMIZADO TÉCNICO ECONOMÉTRICO
// ============================================================================

const classifyQuery = (query, content = null) => {
  const lowercaseQuery = query.toLowerCase();

  const classificationKey = { query: lowercaseQuery, hasContent: !!content };
  const cacheKey = generateContentHash(classificationKey);

  const cached = intelligentCache.getComponent('classification', { query: lowercaseQuery, hasContent: !!content });
  if (cached) {
    console.log(`📦 Query Classification CACHE HIT: "${query.substring(0, 40)}..."`);
    return cached.result;
  }

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

  const isSimpleQuery =
    casualGreetings.some(greeting => lowercaseQuery.includes(greeting) && lowercaseQuery.length < 50) ||
    identityQuestions.some(question => lowercaseQuery.includes(question)) ||
    casualConversation.some(phrase => lowercaseQuery === phrase || lowercaseQuery.includes(phrase) && lowercaseQuery.length < 30) ||
    systemQuestions.some(question => lowercaseQuery.includes(question)) ||
    lowercaseQuery.length < 10;

  const examKeywords = [
    "generar examen", "crear examen", "hacer un examen",
    "examen diagnóstico", "test diagnóstico", "evaluación diagnóstica", "cuestionario"
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
      .replace(/generar examen|crear examen|hacer un examen|examen diagnóstico|test diagnóstico|evaluación diagnóstica|cuestionario/g, "")
      .replace(/sobre|acerca de|verdadero y falso|opción múltiple|múltiple/g, "")
      .trim();

    const result = {
      type: 'exam',
      format,
      questionCount,
      topic,
      needsKnowledgeBase: true, // ✅ SÍ necesita para exámenes econométricos
      needsCalculation: false,
      needsAcademicSearch: false,
      needsExerciseGeneration: false,
      needsComprehensionCheck: false,
      needsWebSearch: false,
      complexity: 'medium'
    };

    intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
      hash: cacheKey,
      timestamp: Date.now()
    });

    return result;
  }


  let type = 'general';
  let complexity = 'low';
  let needsKnowledgeBase = true; // 🚀 CAMBIO CRÍTICO: TRUE por defecto - cerebro principal técnico
  let needsCalculation = false;
  let needsAcademicSearch = false;
  let needsExerciseGeneration = false;
  let needsComprehensionCheck = false;
  let needsWebSearch = false;

  const econometricTerms = [
    // Métodos Cuantitativos
    'regresión', 'regression', 'mco', 'ols', 'mínimos cuadrados', 'least squares',
    'máxima verosimilitud', 'maximum likelihood', 'gmm', 'método momentos',
    'variables instrumentales', 'instrumental variables', 'endogeneidad', 'endogeneity',

    // Series Temporales  
    'series temporales', 'time series', 'arima', 'var', 'vecm', 'arch', 'garch',
    'cointegración', 'cointegration', 'raíz unitaria', 'unit root', 'estacionariedad',
    'autocorrelación', 'autocorrelation', 'durbin watson', 'ljung box',

    // Análisis de Datos
    'panel data', 'datos panel', 'efectos fijos', 'fixed effects', 'efectos aleatorios',
    'diferencias diferencias', 'difference in differences', 'matching', 'propensity',
    'heterocedasticidad', 'heteroscedasticity', 'multicolinealidad', 'multicollinearity',

    // Software y Estadísticos
    'stata', 'eviews', 'spss', 'python', 'estadístico', 'statistic', 'p-value',
    'significancia', 'significance', 'intervalo confianza', 'confidence interval',
    'bootstrap', 'monte carlo', 'simulación', 'simulation'
  ];

  const advancedEconometricConcepts = [
    'identificación', 'identification', 'causalidad', 'causality', 'experimento natural',
    'regresión discontinua', 'regression discontinuity', 'evaluación impacto',
    'variables proxy', 'sesgo selección', 'selection bias', 'hazard ratio',
    'survival analysis', 'modelo logit', 'modelo probit', 'tobit', 'heckman'
  ];

  const econometricTests = [
    'breusch godfrey', 'white test', 'hausman test', 'chow test', 'ramsey reset',
    'adf test', 'phillips perron', 'kpss test', 'johansen test', 'granger causality',
    'jarque bera', 'kolmogorov smirnov', 'anderson darling', 'breusch pagan'
  ];

  const hasEconometricContent =
    econometricTerms.some(term => lowercaseQuery.includes(term)) ||
    advancedEconometricConcepts.some(term => lowercaseQuery.includes(term)) ||
    econometricTests.some(term => lowercaseQuery.includes(term));

  if (isSimpleQuery && !hasEconometricContent) {
    needsKnowledgeBase = false; // Solo aquí se desactiva el cerebro principal técnico
    const result = {
      type: 'casual_conversation',
      complexity: 'low',
      needsKnowledgeBase: false,
      needsCalculation: false,
      needsAcademicSearch: false,
      needsExerciseGeneration: false,
      needsComprehensionCheck: false,
      needsWebSearch: false,
      hasEmotionalContent: false,
      hasMultimedia: content && Array.isArray(content) && content.length > 0
    };

    intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
      hash: cacheKey,
      timestamp: Date.now()
    });

    console.log(`💾 Query Classification CACHED: "${query.substring(0, 40)}..." -> casual_conversation (Cerebro Técnico: false)`);

    return result;
  }

  const conceptKeywords = ['qué es', 'define', 'concepto', 'explicar', 'significado', 'diferencia entre', 'fundamento'];
  const problemKeywords = ['calcular', 'resolver', 'problema', 'ejercicio', 'hallar', 'encuentra', 'determinar', 'estimar'];
  const theoryKeywords = ['teoría', 'modelo', 'principio', 'demostrar', 'derivar', 'fundamento', 'método'];
  const applicationKeywords = ['aplicación', 'ejemplo', 'caso', 'usar', 'utilizar', 'práctica', 'implementar'];
  const comparisonKeywords = ['diferencia', 'comparar', 'vs', 'versus', 'similar', 'distinto', 'ventajas'];
  const researchKeywords = ['investigación', 'papers', 'artículos', 'literatura', 'estudios', 'reciente', 'actualizado'];
  const practiceKeywords = ['ejercicios', 'práctica', 'ejemplos', 'problemas similares', 'más casos'];

  if (conceptKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'concept_explanation';
    complexity = 'medium';
    needsComprehensionCheck = true;
  } else if (problemKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'problem_solving';
    complexity = 'high';
    needsCalculation = true;
    needsExerciseGeneration = true;
  } else if (theoryKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'theory_deep_dive';
    complexity = 'high';
    needsAcademicSearch = true;
    needsComprehensionCheck = true;
  } else if (applicationKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'practical_application';
    complexity = 'medium';
    needsExerciseGeneration = true;
    needsAcademicSearch = true;
  } else if (comparisonKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'comparison_analysis';
    complexity = 'medium';
    needsAcademicSearch = true;
    needsComprehensionCheck = true;
  } else if (practiceKeywords.some(k => lowercaseQuery.includes(k))) {
    type = 'practice_generation';
    complexity = 'medium';
    needsExerciseGeneration = true;
  } else if (hasEconometricContent) {
    type = 'general_econometrics';
    complexity = 'medium';
  } else {
    type = 'general';
    complexity = 'low';
  }

  const mathKeywords = ['ecuación', 'fórmula', 'derivada', 'integral', 'matriz', 'vector', 'optimización'];
  if (mathKeywords.some(k => lowercaseQuery.includes(k))) {
    needsCalculation = true;
    complexity = 'high';
  }

  if (researchKeywords.some(k => lowercaseQuery.includes(k))) {
    needsWebSearch = true;
  }

  const recentKeywords = ['últimas noticias', 'información actual', 'reciente', 'actualizado', '2024', '2025', 'nuevo'];
  if (recentKeywords.some(k => lowercaseQuery.includes(k))) {
    needsWebSearch = true;
  }

  const emotionalKeywords = ['no entiendo', 'confuso', 'difícil', 'complicado', 'frustrado', 'odio', 'ayuda'];
  const hasEmotionalContent = emotionalKeywords.some(k => lowercaseQuery.includes(k));

  const result = {
    type,
    complexity,
    needsCalculation,
    needsKnowledgeBase, // 🚀 AHORA TRUE por defecto - Cerebro Principal Técnico activo
    needsAcademicSearch,
    needsExerciseGeneration,
    needsComprehensionCheck,
    needsWebSearch,
    hasEmotionalContent,
    hasMultimedia: content && Array.isArray(content) && content.length > 0
  };

  intelligentCache.setComponent('classification', { query: lowercaseQuery, hasContent: !!content }, result, {
    hash: cacheKey,
    timestamp: Date.now()
  });

  console.log(`💾 Query Classification CACHED: "${query.substring(0, 40)}..." -> ${type} (Cerebro Técnico: ${needsKnowledgeBase})`);

  return result;
};

// ============================================================================
// ============================================================================

// ⚡ CONTEXTO COMPARTIDO PARA TODAS LAS HERRAMIENTAS TÉCNICAS ECONOMÉTRICAS
const ACADEL_TECHNICAL_TOOL_CONTEXT = `
CONTEXTO CRÍTICO: Esto es parte de la mente de ACADEL UNIVERSAL, el capibara profesor más brillante del universo en econometría y análisis cuantitativo.

🦫 Objetivo: Se proporcionó la siguiente información que ACADEL integrará naturalmente en su explicación técnica econométrica.
🚫 NUNCA digas: "herramienta", "buscar", "encontré", "datos", "información disponible"
✅ SIEMPRE: Usar como si fuera su propio conocimiento técnico econométrico universal
`;

// 1. HERRAMIENTA DE BASE DE CONOCIMIENTOS TÉCNICOS ECONOMÉTRICOS OPTIMIZADA (CEREBRO PRINCIPAL)
const createKnowledgeBaseTool = (embeddings) => tool(
  async ({ query, relevance_threshold = 0.85 }) => {
    try {
      console.log(`🧠 Profesor Acadel activando cerebro principal técnico econométrico (Knowledge Base): ${query}`);

      const knowledgeKey = { query, relevance_threshold };
      const cacheKey = generateContentHash(knowledgeKey);

      const cached = intelligentCache.getKnowledgeBase(query, relevance_threshold);
      if (cached) {
        console.log(`📦 Technical Econometric Knowledge Base CACHE HIT: "${query.substring(0, 40)}..."`);
        return cached.result;
      }

      const retriever = new SupabaseHybridSearch(embeddings, {
        client: supabase,
        similarityK: 8,  // 🔥 AUMENTADO: más contexto técnico para mejores decisiones
        keywordK: 6,     // 🔥 AUMENTADO: mayor cobertura econométrica textual
        tableName: "emb_econometria",
        similarityQueryName: "match_emb_econometria",
        keywordQueryName: "kw_match_emb_econometria",
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Technical Knowledge Base timeout')), 30000)
      );

      const docs = await Promise.race([retriever.invoke(query), timeoutPromise]);

      if (docs.length === 0) {
        const result = `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MEMORY_BANK: El cerebro principal técnico de Profesor Acadel no tiene contenido específico sobre "${query}" en su biblioteca econométrica especializada. Proceder con conocimiento técnico general y experiencia econométrica acumulada en métodos cuantitativos, series temporales y análisis de datos económicos.`;

        intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
          hash: cacheKey,
          docsFound: 0,
          role: 'main_brain_technical',
          timestamp: Date.now()
        });

        return result;
      }

      const relevantDocs = docs.filter(doc =>
        doc.metadata?.score ? doc.metadata.score >= relevance_threshold : true
      );

      if (relevantDocs.length === 0) {
        const result = `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MEMORY_BANK: El cerebro principal técnico de Profesor Acadel encontró información econométrica sobre "${query}" pero no suficientemente específica. Proceder con conocimiento base técnico, metodologías econométricas estándar y experiencia docente especializada acumulada.`;

        intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
          hash: cacheKey,
          docsFound: docs.length,
          relevantDocs: 0,
          role: 'main_brain_technical',
          timestamp: Date.now()
        });

        return result;
      }

      const formattedContent = formatDocumentsAsString(relevantDocs);

      // Pre-filtrar información para que Profesor Acadel la use naturalmente
      const cleanContent = formattedContent
        .replace(/CONTEXTO:|FUENTE:|DOCUMENTO:|INFORMACIÓN:/gi, '')
        .replace(/\*\*.*?\*\*/g, '')
        .replace(/📚|✅|⚠️|📊/g, '')
        .trim();

      const result = `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MEMORY_BANK: El cerebro principal técnico de Profesor Acadel activó la siguiente información econométrica profunda: ${cleanContent}

INTEGRATION_NOTES: Este es el conocimiento técnico econométrico central que Profesor Acadel usará como base neurológica principal para su respuesta. Representa su comprensión profunda acumulada en econometría. Debe integrar esta información naturalmente como si fuera su propia sabiduría técnica especializada, enriqueciéndola con casos econométricos específicos, metodologías cuantitativas precisas y aplicaciones prácticas rigurosas.`;

      intelligentCache.setKnowledgeBase(query, result, relevance_threshold, {
        hash: cacheKey,
        docsFound: docs.length,
        relevantDocs: relevantDocs.length,
        method: 'main_brain_technical_hybrid',
        role: 'main_brain_technical',
        timestamp: Date.now()
      });

      console.log(`🧠 Cerebro Principal Técnico Econométrico (Knowledge Base) CACHED: "${query.substring(0, 40)}..." (${relevantDocs.length} docs integrados)`);

      return result;

    } catch (error) {
      console.warn(`⚠️ Technical Econometric Knowledge Base (cerebro principal) error: ${error.message}`);

      const result = `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MEMORY_BANK: Acceso limitado al cerebro principal técnico econométrico. Profesor Acadel debe proceder con su conocimiento econométrico experiencial directo y sabiduría técnica acumulada en métodos cuantitativos, series temporales y análisis de datos económicos, usando metodología probada y casos técnicos de su vasta experiencia docente especializada.`;

      return result;
    }
  },
  {
    name: "KnowledgeBase",
    description: "🧠 CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO de Profesor Acadel - Su memoria académica especializada profunda en econometría. Esta herramienta ES EL NÚCLEO de su inteligencia técnica econométrica y debe usarse SIEMPRE que vaya a responder algo econométrico importante para verificar, enriquecer y fundamentar su conocimiento antes de enseñar. Es su sistema nervioso central técnico especializado.",
    schema: z.object({
      query: z.string().describe("Tema econométrico para activar el cerebro principal técnico y acceder a la memoria especializada"),
      relevance_threshold: z.number().optional().default(0.75).describe("Nivel de especificidad técnica del cerebro principal (0.6-0.9)")
    })
  }
);

// 2. HERRAMIENTA DE BÚSQUEDA WEB TÉCNICA ECONOMÉTRICA CON BRAVE SEARCH (MANTENIDA ORIGINAL)
const createBraveWebSearchTool = () => tool(
  async ({ query, max_results = 6, freshness = null }) => {
    try {
      console.log(`🌟 Profesor Acadel explorando web técnica econométrica con Brave: "${query.substring(0, 50)}..."`);

      const searchResult = await braveSearchOrchestrator.searchWeb(query, {
        count: max_results,
        freshness
      });

      if (searchResult.results.length === 0) {
        return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_WEB_EXPLORATION: Los servicios web técnicos no encontraron información específica sobre "${query}" en este momento.

FALLBACK_ACTION: Profesor Acadel debe manejar esto con precisión técnica econométrica: "Los servicios de búsqueda web están temporalmente saturados. No hay problema, tengo suficiente conocimiento técnico actualizado en econometría para ayudarte. Si necesitas información específica muy reciente, te sugiero que busques directamente '${query}' en JSTOR, RePEc o SSRN más tarde."`;
      }

      const formattedResults = searchResult.results.map((item, index) =>
        `${index + 1}. **${item.title}**
   🔗 ${item.url}
   📝 ${item.snippet}
   🏛️ Fuente: ${item.domain}
   📊 Calidad: ${item.quality}/5`
      ).join('\n\n');

      console.log(`✅ Brave Web Search completado: ${searchResult.results.length} resultados para "${query.substring(0, 40)}..."`);

      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_WEB_EXPLORATION: Información técnica actualizada de la web sobre "${query}" en econometría:

RESULTADOS_WEB_TÉCNICOS_ECONOMÉTRICOS:
${formattedResults}

INTEGRATION_NOTES: Esta información representa lo que Profesor Acadel ha encontrado navegando por la web técnica actualizada. Debe integrar estos hallazgos técnicos con análisis econométrico crítico. Usar para complementar conocimiento académico técnico con información actualizada, papers econométricos recientes, o datos económicos contemporáneos.

🚨 CRÍTICO: USAR ENLACES EXACTOS - NO MODIFICAR URLs
- Mantener URLs exactas como aparecen en RESULTADOS_WEB
- NUNCA cambiar o "traducir" enlaces a versiones localizadas
- Los usuarios necesitan acceso a las fuentes ORIGINALES específicas
- Formato: **[Título](URL_EXACTA)** usando URLs de 🔗 tal como aparecen

Usar para complementar conocimiento académico técnico con información actualizada, literatura econométrica reciente, o datos contemporáneos.`;

    } catch (error) {
      console.log(`⚠️ Brave Web Search error para "${query}": ${error.message}`);
      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_WEB_EXPLORATION: Los servicios web técnicos están temporalmente saturados.

FALLBACK_ACTION: Profesor Acadel debe manejar esto con precisión técnica econométrica: "Los servicios de búsqueda web están temporalmente ocupados. No hay problema, tengo suficiente conocimiento técnico actualizado en econometría para ayudarte. Si necesitas información específica muy reciente, te sugiero que busques directamente '${query}' en JSTOR, RePEc o SSRN más tarde."`;
    }
  },
  {
    name: "BraveWebSearch",
    description: "Conecta a Profesor Acadel con información técnica econométrica ACTUALIZADA de la web usando Brave Search. Úsala cuando necesites: papers econométricos recientes, información técnica actualizada de datos económicos, metodologías econométricas contemporáneas, tendencias actuales en análisis cuantitativo, estudios muy recientes (2024-2025), o cuando el estudiante pregunte específicamente por información 'actual' o 'reciente' en econometría.",
    schema: z.object({
      query: z.string().describe("Tema econométrico para buscar información técnica actualizada en la web"),
      max_results: z.number().optional().default(6).describe("Número de resultados web técnicos (3-8)"),
      freshness: z.enum(['pd', 'pw', 'pm', 'py']).optional().describe("Frescura: pd=último día, pw=última semana, pm=último mes, py=último año")
    })
  }
);

// 3. HERRAMIENTA DE BÚSQUEDA DE IMÁGENES TÉCNICAS ECONOMÉTRICAS CON BRAVE (MANTENIDA ORIGINAL)
const createBraveImageSearchTool = () => tool(
  async ({ query, max_results = 6 }) => {
    try {
      console.log(`🖼️ Profesor Acadel buscando imágenes técnicas econométricas: "${query.substring(0, 50)}..."`);

      const searchResult = await braveSearchOrchestrator.searchImages(query, {
        count: max_results
      });

      if (searchResult.results.length === 0) {
        return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_IMAGE_SEARCH: No se encontraron imágenes técnicas específicas para "${query}" en este momento.

FALLBACK_ACTION: Profesor Acadel debe sugerir con precisión técnica econométrica: "Las imágenes técnicas econométricas no están disponibles temporalmente. Te sugiero buscar directamente en Google Images '${query}' o en recursos académicos visuales como R Graph Gallery. Mientras tanto, te explico todo sobre este tema técnico sin imágenes, que mi conocimiento econométrico está lleno de referencias visuales precisas."`;
      }

      const formattedResults = searchResult.results.map((item, index) =>
        `${index + 1}. **${item.title}**
   🖼️ Imagen: ${item.imageUrl || item.thumbnailUrl}
   🔗 Fuente: ${item.url}
   🏛️ Dominio: ${item.domain}`
      ).join('\n\n');

      console.log(`✅ Brave Images Search completado: ${searchResult.results.length} imágenes para "${query.substring(0, 40)}..."`);

      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_IMAGE_SEARCH: Imágenes técnicas de referencia encontradas para "${query}" en econometría:

IMÁGENES_TÉCNICAS_ECONOMÉTRICAS_ENCONTRADAS:
${formattedResults}

INTEGRATION_NOTES: Estas imágenes técnicas pueden servir como referencias visuales para que Profesor Acadel enriquezca su explicación econométrica. Debe mencionar estas fuentes como ejemplos visuales disponibles y sugerir al estudiante consultarlas para complementar el aprendizaje visual técnico econométrico.

🚨 CRÍTICO: USAR ENLACES EXACTOS - NO MODIFICAR URLs
- Mantener URLs exactas como aparecen en IMÁGENES_ENCONTRADAS
- NUNCA cambiar o "traducir" enlaces a versiones localizadas
- Los usuarios necesitan acceso a las fuentes ORIGINALES específicas
- Formato: **[Título](URL_EXACTA)** usando URLs tal como aparecen

Debe mencionar estas fuentes como ejemplos visuales disponibles y sugerir al estudiante consultarlas para complementar el aprendizaje visual técnico econométrico.`;

    } catch (error) {
      console.log(`⚠️ Brave Image Search error para "${query}": ${error.message}`);
      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_IMAGE_SEARCH: Servicio de imágenes técnicas temporalmente no disponible.

FALLBACK_ACTION: Profesor Acadel debe manejar con precisión técnica econométrica: "El buscador de imágenes técnicas está temporalmente ocupado. No hay problema, mi descripción visual será técnicamente precisa econométricamente y no necesitarás imágenes. Te explico todo de forma visual usando mis referencias técnicas econométricas precisas."`;
    }
  },
  {
    name: "BraveImageSearch",
    description: "Conecta a Profesor Acadel con imágenes técnicas econométricas de referencia usando Brave Search. Úsala cuando necesites: ejemplos visuales de conceptos econométricos, gráficos de regresiones, series temporales, correlogramas, diagramas de flujo metodológico, outputs de software estadístico, o cuando el estudiante pida 'ver ejemplos' o 'gráficos' del tema econométrico.",
    schema: z.object({
      query: z.string().describe("Términos técnicos para buscar imágenes de referencia econométrica"),
      max_results: z.number().optional().default(6).describe("Número de imágenes técnicas (4-8)")
    })
  }
);

// 4. HERRAMIENTA DE BÚSQUEDA EN SITIOS ACADÉMICOS TÉCNICOS ECONOMÉTRICOS ESPECÍFICOS (MANTENIDA ORIGINAL)
const createBraveAcademicSiteSearchTool = () => tool(
  async ({ query, site_domain, max_results = 4 }) => {
    try {
      console.log(`🏛️ Profesor Acadel buscando en sitio académico técnico específico: ${site_domain} - "${query.substring(0, 40)}..."`);

      const siteQuery = `site:${site_domain} ${query}`;
      const searchResult = await braveSearchOrchestrator.searchWeb(siteQuery, {
        count: max_results
      });

      if (searchResult.results.length === 0) {
        return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_ACADEMIC_SITE_SEARCH: No se encontró información técnica específica sobre "${query}" en ${site_domain}.

FALLBACK_ACTION: Profesor Acadel debe sugerir: "El sitio ${site_domain} no tiene información técnica específica sobre esto, o está temporalmente ocupado. Te sugiero buscar directamente en su buscador interno o revisar otros sitios académicos técnicos confiables como JSTOR, RePEc, SSRN, o NBER para econometría."`;
      }

      const formattedResults = searchResult.results.map((item, index) =>
        `${index + 1}. **${item.title}**
   🔗 ${item.url}
   📝 ${item.snippet}
   🏛️ Fuente: ${site_domain}`
      ).join('\n\n');

      console.log(`✅ Brave Academic Site Search completado: ${searchResult.results.length} resultados de ${site_domain}`);

      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_ACADEMIC_SITE_SEARCH: Información académica técnica de ${site_domain} sobre "${query}" en econometría:

RESULTADOS_SITIO_ACADÉMICO_TÉCNICO_ECONOMÉTRICO_ESPECÍFICO:
${formattedResults}

INTEGRATION_NOTES: Esta información proviene específicamente de ${site_domain}, una fuente académica técnica confiable. Profesor Acadel debe destacar la credibilidad de esta fuente e integrar la información con su sabiduría econométrica característica.`;

    } catch (error) {
      console.log(`⚠️ Brave Site Search error para ${site_domain} - "${query}": ${error.message}`);
      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_ACADEMIC_SITE_SEARCH: Problema accediendo a ${site_domain} para "${query}".

FALLBACK_ACTION: Profesor Acadel debe manejar con precisión técnica econométrica: "${site_domain} está temporalmente ocupado. Te sugiero intentar acceder directamente al sitio o buscar en fuentes académicas técnicas econométricas alternativas."`;
    }
  },
  {
    name: "BraveAcademicSiteSearch",
    description: "Conecta a Profesor Acadel con sitios académicos técnicos econométricos específicos usando Brave Search. Úsala cuando necesites información de fuentes técnicas particulares como: jstor.org (papers econométricos), nber.org (investigación cuantitativa), ssrn.com (estudios econométricos), repec.org (econometría), oecd.org (datos), fred.stlouisfed.org (series temporales), etc.",
    schema: z.object({
      query: z.string().describe("Términos técnicos econométricos específicos"),
      site_domain: z.string().describe("Dominio del sitio académico técnico (ej: jstor.org, nber.org, repec.org)"),
      max_results: z.number().optional().default(4).describe("Resultados del sitio académico técnico (3-6)")
    })
  }
);

// HERRAMIENTA WOLFRAM ALPHA PERSONALIZADA TÉCNICA PARA PROFESOR ACADEL ECONOMETRISTA (MANTENER LÓGICA MATEMÁTICA)
const createAcadelWolframTool = () => tool(
  async ({ query, show_graph = false }) => {
    try {
      console.log(`🦫 Profesor Acadel usando su cerebro matemático avanzado técnico econométrico: ${query}`);

      const wolfram = new WolframAlphaTool({
        appid: process.env.WOLFRAM_APP_ID,
        parameters: { sanitizeQuery: sanitizeWolframInput }
      });

      const calculation = await wolfram.invoke(query);

      const cleanCalculation = calculation
        .replace(/Wolfram\|Alpha/gi, '')
        .replace(/Result:|Input:|Output:/gi, '')
        .replace(/\*\*.*?\*\*/g, '')
        .trim();

      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MATHEMATICAL_BRAIN: Cálculo avanzado técnico econométrico para "${query}":

RESULTADO_MATEMÁTICO_TÉCNICO_ECONOMÉTRICO: ${cleanCalculation}

INTEGRATION_NOTES: Profesor Acadel debe explicar este resultado como su propio razonamiento matemático brillante técnico econométrico. Usar frases como "cuando hago los cálculos econométricos obtengo..." o "matemáticamente en econometría esto se ve así..." PERO NUNCA DECIR QUE FUE UNA HERRAMIENTA O EL NOMBRE DE LA HERRAMIENTA.`;

    } catch (error) {
      return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_MATHEMATICAL_BRAIN: Problema temporal con cálculo técnico avanzado econométrico para "${query}".

FALLBACK_ACTION: Proceder con metodología matemática técnica econométrica manual paso a paso.`;
    }
  },
  {
    name: "AnalyticalBrain",
    description: `🚨 HERRAMIENTA DUAL: MATEMÁTICAS + ANÁLISIS ECONÓMICO para ECONOMETRÍA

Si el usuario usa lenguaje natural, TÚ conviertes a consulta técnica.
Envía consultas en INGLÉS TÉCNICO.

📊 ANÁLISIS ECONÓMICO ECONOMÉTRICO (Datos cuantitativos actuales):
- "GDP Mexico 2024" 
- "inflation rate United States"
- "unemployment rate comparison Mexico Brazil"
- "exchange rate USD MXN historical"
- "interest rates Federal Reserve"
- "econometric model estimation results"
- "time series data analysis"
- "regression statistics comparison"

🧮 MATEMÁTICAS ECONOMÉTRICAS (Cálculos puros):
- "linear regression y = a + bx"
- "t statistic test"
- "F statistic ANOVA"
- "correlation coefficient calculation"
- "standard deviation calculation"
- "confidence interval 95%"
- "hypothesis test p value"
- "time series decomposition"
- "moving average calculation"
- "regression diagnostics"
- "unit root test statistics"
- "cointegration analysis"

⚡ EJEMPLOS DE CONVERSIÓN ECONOMÉTRICA:
- "inflación de México" → "inflation rate Mexico 2024"
- "PIB per cápita" → "GDP per capita Mexico"
- "regresión lineal simple" → "simple linear regression analysis"
- "prueba de raíz unitaria" → "unit root test statistics"
- "modelo ARIMA" → "ARIMA model estimation"
- "heterocedasticidad" → "heteroscedasticity test statistics"`,
    schema: z.object({
      query: z.string().describe("Consulta técnica en INGLÉS para análisis económico O expresión matemática pura econométrica"),
      show_graph: z.boolean().optional().default(false)
    })
  }
);

// HERRAMIENTA CALCULADORA TÉCNICA ECONOMÉTRICA (MANTENER LÓGICA MATEMÁTICA)
const createCalculatorTool = () => tool(
  async ({ problem, context, explanation_level = "intermediate" }) => {
    try {
      const wolfram = new WolframAlphaTool({
        appid: process.env.WOLFRAM_APP_ID,
        parameters: { sanitizeQuery: sanitizeWolframInput }
      });

      const calculation = await wolfram.invoke(problem);

      const cleanCalculation = calculation
        .replace(/Wolfram\|Alpha/gi, '')
        .replace(/Result:|Input:|Output:/gi, '')
        .replace(/\*\*.*?\*\*/g, '')
        .trim();

      return `ACADEL_TECHNICAL_ECONOMETRIC_CALCULATION_BRAIN: Para "${problem}":

RESULTADO_MATEMÁTICO_TÉCNICO_ECONOMÉTRICO: ${cleanCalculation}

INTEGRATION_NOTES: Profesor Acadel debe explicar como su propio razonamiento matemático técnico econométrico, PERO JAMÁS DECIR LA HERRAMIENTA QUE USA O COMO LA USA, TODO TIENE QUE SER NATURAL Y TÉCNICO ECONOMÉTRICO.`;

    } catch (error) {
      return `ACADEL_TECHNICAL_ECONOMETRIC_CALCULATION_BRAIN: Cálculo técnico econométrico requiere enfoque manual.`;
    }
  },
  {
    name: "Calculator",
    description: `🚨 HERRAMIENTA DUAL: MATEMÁTICAS + DATOS ECONÓMICOS para ECONOMETRÍA

Usuario dice lenguaje natural → TÚ conviertes a consulta técnica econométrica.
Envía consultas en INGLÉS TÉCNICO para mejor precisión.

📊 PARA DATOS ECONÓMICOS ECONOMÉTRICOS:
- "PIB de México" → "GDP Mexico current"
- "inflación actual" → "inflation rate current"
- "datos de panel" → "panel data analysis"
- "serie temporal PIB" → "GDP time series data"
- "cointegración" → "cointegration analysis"

🧮 PARA MATEMÁTICAS ECONOMÉTRICAS:
- "regresión lineal múltiple" → "multiple linear regression"
- "estadístico F" → "F statistic ANOVA"
- "prueba de autocorrelación" → "autocorrelation test"
- "raíz unitaria" → "unit root test"
- "estimador MCO" → "OLS estimator"
- "máxima verosimilitud" → "maximum likelihood estimation"

⚡ EJEMPLOS ESPECÍFICOS ECONOMÉTRICOS:
- "modelo ARIMA(2,1,1)" → "ARIMA(2,1,1) model"
- "test de Durbin Watson" → "Durbin Watson test"
- "test de heterocedasticidad" → "heteroscedasticity test"
- "cointegración de Johansen" → "Johansen cointegration test"`,
    schema: z.object({
      problem: z.string().describe("Consulta técnica en INGLÉS para análisis económico O expresión matemática econométrica"),
      context: z.string().describe("Contexto econométrico para tu explicación posterior"),
      explanation_level: z.enum(["basic", "intermediate", "advanced"]).optional().default("intermediate")
    })
  }
);

// 5. HERRAMIENTA DE ANÁLISIS DE CONCEPTOS TÉCNICOS ECONOMÉTRICOS OPTIMIZADA (MENTE ANALÍTICA DE PROFESOR ACADEL)
const createConceptAnalyzerTool = (embeddings) => tool(
  async ({ concept, analysis_depth = "complete" }) => {
    try {
      console.log(`🧠 Profesor Acadel analizando concepto técnico econométrico: ${concept}`);

      const retriever = new SupabaseHybridSearch(embeddings, {
        client: supabase,
        similarityK: 10,  // 🔥 MAXIMIZADO: aprovechar índices ultra-rápidos econométricos
        keywordK: 8,      // 🔥 MAXIMIZADO: cobertura textual completa econométrica
        tableName: "emb_econometria",
        similarityQueryName: "match_emb_econometria",
        keywordQueryName: "kw_match_emb_econometria",
      });

      const searches = [
        `definición concepto técnico econométrico ${concept}`,
        `fundamentos metodológicos ${concept}`,
        `aplicaciones econométricas ${concept}`,
        `ecuaciones fórmulas estadísticas ${concept}`,
        `casos prácticos empíricos ${concept}`,
        `implementación software ${concept}`
      ];

      const searchPromises = searches.map(async (searchTerm) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Technical econometric concept search timeout')), 30000)
          );

          const docs = await Promise.race([
            retriever.invoke(searchTerm),
            timeoutPromise
          ]);

          return docs.slice(0, 3); // Top 3 por búsqueda econométrica

        } catch (err) {
          console.log(`⚠️ Búsqueda técnica conceptual econométrica limitada para: ${searchTerm}`);
          return [];
        }
      });

      // ⚡ ESPERAR TODAS LAS BÚSQUEDAS PARALELAS ECONOMÉTRICAS
      const searchResults = await Promise.allSettled(searchPromises);
      const allDocs = searchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();

      if (allDocs.length === 0) {
        return `ACADEL_TECHNICAL_ECONOMETRIC_CONCEPTUAL_MIND: Análisis técnico econométrico de "${concept}" basado en experiencia especializada directa. El cerebro analítico técnico econométrico de Profesor Acadel procederá con sabiduría técnica acumulada y metodología econométrica probada.`;
      }

      const conceptInfo = formatDocumentsAsString(allDocs);

      const cleanInfo = conceptInfo
        .replace(/CONTEXTO:|FUENTE:|DOCUMENTO:|INFORMACIÓN:/gi, '')
        .replace(/📚|✅|⚠️|📊|🎯|💡/g, '')
        .replace(/\*\*.*?\*\*/g, '')
        .trim();

      console.log(`✅ Concepto técnico econométrico "${concept}" analizado con ${allDocs.length} documentos integrados (PARALELO)`);

      return `ACADEL_TECHNICAL_ECONOMETRIC_CONCEPTUAL_MIND: Análisis técnico profundo econométrico de "${concept}" (nivel: ${analysis_depth}):

CONOCIMIENTO_TÉCNICO_ECONOMÉTRICO_CONSOLIDADO_PARALELO: ${cleanInfo}

INTEGRATION_NOTES: Esta información representa la comprensión técnica profunda que Profesor Acadel ha procesado usando su mente analítica paralela econométrica. Debe estructurar su explicación técnica natural integrando: definición econométrica clara, fundamentos metodológicos, aplicaciones técnicas, ecuaciones relevantes, casos prácticos empíricos, ejemplos de software. Usar su precisión técnica característica y metodología econométrica rigurosa.`;

    } catch (error) {
      console.warn(`⚠️ Technical Econometric Concept Analyzer error: ${error.message}`);
      return `ACADEL_TECHNICAL_ECONOMETRIC_CONCEPTUAL_MIND: Análisis técnico econométrico de "${concept}" desde experiencia especializada acumulada. La mente analítica técnica econométrica de Profesor Acadel procederá con metodología pedagógica econométrica probada.`;
    }
  },
  {
    name: "ConceptAnalyzer",
    description: "Activa la mente analítica técnica avanzada econométrica de Profesor Acadel con búsquedas paralelas ultra-optimizadas. Descompone conceptos técnicos econométricos complejos usando múltiples búsquedas especializadas simultáneas. Úsala cuando necesite explicar relaciones entre múltiples ideas econométricas o conectar teoría con aplicaciones prácticas en análisis cuantitativo.",
    schema: z.object({
      concept: z.string().describe("Concepto técnico econométrico que Profesor Acadel necesita analizar profundamente"),
      analysis_depth: z.enum(["basic", "complete", "advanced"]).optional().default("complete").describe("Profundidad del análisis técnico econométrico que Profesor Acadel debe realizar")
    })
  }
);

// 6. HERRAMIENTA GENERADORA DE EJERCICIOS TÉCNICOS ECONOMÉTRICOS (MANTENIDA ORIGINAL)
const createExerciseGeneratorTool = () => tool(
  async ({ topic, level = "intermediate", context = "general", exercise_count = 3 }) => {
    try {
      let wolframData = "";
      try {
        const wolfram = new WolframAlphaTool({
          appid: process.env.WOLFRAM_APP_ID
        });

        const queryForData = `${topic} typical values econometrics problems statistics`;
        const rawData = await wolfram.invoke(queryForData);
        wolframData = rawData.substring(0, 300).replace(/Wolfram\|Alpha/gi, '').trim();
      } catch (err) {
        console.log("Datos numéricos técnicos econométricos limitados - usar experiencia docente técnica");
      }

      return `ACADEL_TECHNICAL_ECONOMETRIC_CREATIVE_PEDAGOGY: Generación de ejercicios técnicos econométricos para "${topic}":

PARÁMETROS_PEDAGÓGICOS_TÉCNICOS_ECONOMÉTRICOS:
- Tema: ${topic}
- Nivel: ${level}  
- Contexto: ${context}
- Cantidad: ${exercise_count} ejercicios técnicos progresivos
${wolframData ? `- Datos_típicos_técnicos_econométricos: ${wolframData}` : '- Usar valores realistas técnicos de experiencia docente econométrica'}

INTEGRATION_NOTES: Profesor Acadel debe crear ejercicios técnicos econométricos que reflejen su metodología única:

BÁSICO (Fundamentos): Problemas conectados con interpretación de estimaciones, enfoque conceptual metodológico, aplicaciones econométricas básicas, cálculos simples estadísticos.

INTERMEDIO (Aplicación): Combinar conceptos técnicos con estimaciones moderadas, contexto de software estadístico, datos realistas econométricos, interpretación de resultados clara.

AVANZADO (Síntesis): Integrar múltiples técnicas econométricas, análisis crítico metodológico, contexto de investigación empírica, problemas que desafían supuestos metodológicos.

Cada ejercicio debe incluir: narrativa técnica econométrica engaging de Profesor Acadel, datos realistas econométricos, pistas pedagógicas metodológicas, procedimiento claro técnico, respuesta con interpretación econométrica rigurosa.`;

    } catch (error) {
      return `ACADEL_TECHNICAL_ECONOMETRIC_CREATIVE_PEDAGOGY: Generación de ejercicios técnicos econométricos para "${topic}" desde experiencia docente técnica directa. Proceder con metodología pedagógica técnica econométrica probada.`;
    }
  },
  {
    name: "ExerciseGenerator",
    description: "Libera la creatividad pedagógica técnica econométrica de Profesor Acadel para generar ejercicios personalizados. Úsala cuando necesite crear práctica técnica específica econométrica, verificar comprensión metodológica, o dar ejemplos progresivos adaptados al nivel del estudiante en métodos cuantitativos, series temporales o análisis de datos económicos.",
    schema: z.object({
      topic: z.string().describe("Tema técnico econométrico para el cual Profesor Acadel debe crear ejercicios"),
      level: z.enum(["basic", "intermediate", "advanced"]).optional().default("intermediate").describe("Nivel de dificultad técnica para los ejercicios econométricos de Profesor Acadel"),
      context: z.string().optional().default("general").describe("Contexto técnico econométrico que Profesor Acadel debe usar"),
      exercise_count: z.number().optional().default(3).describe("Número de ejercicios técnicos econométricos que Profesor Acadel debe generar (1-5)")
    })
  }
);

// 7. HERRAMIENTA DE VERIFICACIÓN DE COMPRENSIÓN TÉCNICA ECONOMÉTRICA (MANTENIDA ORIGINAL)
const createComprehensionCheckerTool = () => tool(
  async ({ concept_explained, student_level = "unknown" }) => {
    console.log(`🦫 Profesor Acadel verificando comprensión técnica econométrica: ${concept_explained} (nivel: ${student_level})`);

    return `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_PEDAGOGICAL_INTUITION: Verificación de comprensión técnica econométrica para "${concept_explained}" (nivel: ${student_level}):

ESTRATEGIAS_DE_VERIFICACIÓN_TÉCNICA_ECONOMÉTRICA_PREPARADAS:

PREGUNTAS_TÉCNICAS_ECONOMÉTRICAS_INTELIGENTES_POR_NIVEL:
- Básico: Reformulación técnica personal, aplicaciones econométricas familiares, interpretación simple de estimaciones
- Intermedio: Predicción de cambios en estimaciones, conexiones metodológicas, límites de aplicación técnica econométrica
- Avanzado: Síntesis profesional técnica econométrica, análisis crítico metodológico, casos extremos y supuestos violados

DETECTAR_MALENTENDIDOS_TÉCNICOS_ECONOMÉTRICOS_COMUNES_EN_${concept_explained.toUpperCase()}:
- Confusión causa-efecto en relaciones econométricas
- Mezcla de conceptos econométricos similares (correlación vs causalidad)
- Aplicación mecánica sin comprensión metodológica
- Intuición incorrecta sobre significancia estadística y estimaciones
- Uso inadecuado de pruebas diagnósticas econométricas
- Errores en interpretación de coeficientes y software estadístico

INTEGRATION_NOTES: Profesor Acadel debe implementar verificación usando su estilo técnico natural con precisión econométrica inteligente. Frases como "A ver, explícame en tus palabras técnicas cómo interpretas este coeficiente..." o "¿Qué pasaría técnicamente si el R² fuera muy bajo en esta regresión...?" Ajustar respuesta según el nivel de comprensión detectado: alto = casos metodológicos complejos, medio = más ejemplos técnicos econométricos, bajo = nueva estrategia pedagógica técnica, nulo = fundamentos básicos econométricos.`;
  },
  {
    name: "ComprehensionChecker",
    description: "Activa la intuición pedagógica técnica econométrica de Profesor Acadel para verificar comprensión metodológica real. Úsala cuando termine de explicar algo técnico econométrico complejo, sospeche que el estudiante no entendió completamente, o necesite detectar conceptos econométricos erróneos en métodos cuantitativos, series temporales o análisis de datos económicos.",
    schema: z.object({
      concept_explained: z.string().describe("Concepto técnico econométrico que Profesor Acadel acaba de explicar y necesita verificar"),
      student_level: z.enum(["beginner", "intermediate", "advanced", "unknown"]).optional().default("unknown").describe("Nivel estimado del estudiante")
    })
  }
);

// 8. HERRAMIENTA DE ANÁLISIS DE FEEDBACK TÉCNICO ECONOMÉTRICO (MANTENIDA ORIGINAL)
const createFeedbackAnalyzerTool = () => tool(
  async ({ student_response, context = "" }) => {
    console.log(`🦫 Profesor Acadel analizando estado emocional del estudiante econométricamente`);

    const indicators = {
      understood: [
        "entendí", "claro", "perfecto", "ahora sí", "genial",
        "gracias", "muy buena explicación técnica", "me ayudó mucho",
        "brutal", "excelente", "ya entiendo", "ya veo la metodología", "la estimación tiene sentido"
      ],
      confused: [
        "no entiendo", "confuso", "complicado", "no me queda claro",
        "puedes explicar otra vez", "no sé", "estoy perdido",
        "sigo sin entender", "más lento", "muy técnico", "la econometría es difícil"
      ],
      wants_more: [
        "puedes dar ejemplos", "más ejercicios econométricos", "profundizar",
        "otro caso", "aplicaciones técnicas", "cómo se usa en software",
        "más práctica", "otros problemas econométricos", "implementación en R"
      ],
      emotional: [
        "frustrado", "difícil", "estresado", "ansioso",
        "no puedo", "imposible", "odio", "amo",
        "me gusta", "interesante", "aburrido", "econometría es complicada"
      ]
    };

    const response = student_response.toLowerCase();
    let analysis = `${ACADEL_TECHNICAL_TOOL_CONTEXT}

ACADEL_TECHNICAL_ECONOMETRIC_EMOTIONAL_INTELLIGENCE: Análisis de respuesta estudiantil técnica econométrica:\n\n`;

    if (indicators.understood.some(word => response.includes(word))) {
      analysis += "COMPRENSIÓN_TÉCNICA_ECONOMÉTRICA_ALTA: Estudiante entendió bien - ofrecer casos técnicos econométricos más avanzados\n";
    } else if (indicators.confused.some(word => response.includes(word))) {
      analysis += "COMPRENSIÓN_TÉCNICA_ECONOMÉTRICA_BAJA: Estudiante necesita nueva estrategia pedagógica técnica econométrica\n";
    }

    if (indicators.wants_more.some(word => response.includes(word))) {
      analysis += "SOLICITA_PROFUNDIZACIÓN_TÉCNICA_ECONOMÉTRICA: Activar generadores de ejercicios y ejemplos técnicos econométricos\n";
    }

    if (indicators.emotional.some(word => response.includes(word))) {
      analysis += "COMPONENTE_EMOCIONAL_TÉCNICO_ECONOMÉTRICO: Usar precisión técnica econométrica de Profesor Acadel y motivación extra\n";
    }

    // Análisis de longitud de respuesta técnica econométrica
    if (response.length < 10) {
      analysis += "RESPUESTA_CORTA: Posible desinterés técnico econométrico - crear ambiente técnico más cómodo\n";
    } else if (response.length > 200) {
      analysis += "RESPUESTA_DETALLADA: Estudiante técnicamente comprometido econométricamente - aprovechar interés técnico\n";
    }

    analysis += `\nCONTEXTO_TÉCNICO_ECONOMÉTRICO: ${context}

INTEGRATION_NOTES: Profesor Acadel debe ajustar su estrategia técnica econométrica según este análisis usando su inteligencia emocional técnica característica. Reconocer estado emocional técnico, adaptar nivel de explicación técnica econométrica, usar tono apropiado (motivador técnico/empático/desafiante), y decidir herramientas técnicas econométricas adicionales necesarias.`;

    return analysis;
  },
  {
    name: "FeedbackAnalyzer",
    description: "Conecta a Profesor Acadel con su inteligencia emocional técnica econométrica para entender el estado del estudiante. Úsala después de explicaciones técnicas econométricas complejas o cuando notes cambios en el engagement para ajustar la estrategia pedagógica técnica en métodos cuantitativos, series temporales o análisis de datos económicos.",
    schema: z.object({
      student_response: z.string().describe("Respuesta del estudiante que Profesor Acadel necesita analizar emocionalmente"),
      context: z.string().optional().default("").describe("Contexto técnico econométrico de la conversación para mejor análisis")
    })
  }
);

// ============================================================================
// ============================================================================

const createSpecializedTechnicalPrompt = (queryType, queryInfo, studentQuery) => {
  const basePersonality = PROFESOR_ACADEL_ECONOMETRIA_DNA;

  // ============================================================================
  // ============================================================================

  const coreTechnicalInstructions = `
# INSTRUCCIONES TÉCNICAS PARA PROFESOR ACADEL DE ECONOMETRÍA Y ANÁLISIS CUANTITATIVO

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

## 🔧 COORDINACIÓN CON HERRAMIENTAS TÉCNICAS ECONOMÉTRICAS:

### 🧠 CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO SIEMPRE ACTIVO (KnowledgeBase):
- Tu Knowledge Base ES TU CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO - úsalo SIEMPRE antes de responder cualquier consulta econométrica importante
- Integra información como si fuera tu conocimiento técnico econométrico natural acumulado
- Accede a tu biblioteca técnica especializada para verificar, enriquecer y fundamentar TODA respuesta econométrica
- Es tu sistema nervioso central técnico econométrico - nunca respondas sin consultarlo primero

### 🗣️ PARA CONSULTAS CASUALES (cuando NO necesites cerebro principal técnico):
- Responde naturalmente desde tu personalidad técnica de capibara econometrista solo para saludos simples
- Usa tu conocimiento base sin herramientas especializadas SOLO para conversación muy casual
- Si mencionan algo técnico econométrico específico, ACTIVA automáticamente tu cerebro principal técnico

## 🧮 **WOLFRAM ALPHA TÉCNICO ECONOMÉTRICO**: Solo envía matemáticas puras o INGLÉS TÉCNICO
  * "regresión lineal simple" → "linear regression y = a + bx"
  * "estadístico t" → "t statistic test"
  * "prueba autocorrelación" → "Durbin Watson test autocorrelation"
  * "estimación MCO" → "ordinary least squares estimation"
  * "modelo ARIMA" → "ARIMA(p,d,q) model"
  * "cointegración" → "cointegration analysis"
  * "heterocedasticidad" → "heteroscedasticity test"
  * "raíz unitaria" → "unit root test statistics"

## 📚 FUENTES TÉCNICAS ECONOMÉTRICAS:
Cuando el estudiante pida fuentes técnicas, papers econométricos, investigaciones, o referencias metodológicas:
- ACTIVA automáticamente tu búsqueda técnica actualizada con Brave Search
- NUNCA generes enlaces técnicos falsos o simulados
- Si no encuentras fuentes técnicas específicas, di "no encontré fuentes técnicas específicas en línea para esto"
- SIEMPRE proporciona URLs técnicas reales cuando estén disponibles

## 📝 FORMATOS TÉCNICOS ECONOMÉTRICOS DISPONIBLES (úsalos sin anunciar):

### Tablas para comparar métodos econométricos:
| Método | Supuestos | Aplicación | Software |
|--------|-----------|------------|----------|
| MCO | Linealidad, homocedasticidad | Regresión básica | R, Stata |
| VI | Exogeneidad instrumentos | Endogeneidad | ivreg2 |

### REGLAS LATEX - SOLO 2 FORMATOS PERMITIDOS:

**1. Para ecuaciones/fórmulas complejas en bloque (centradas):**
\`\\[{{ECUACION_COMPLETA}}\\]\`

**2. Para expresiones cortas en línea:**
\`\\({{EXPRESION_CORTA}}\\)\`

### EJEMPLOS CORRECTOS:
✅ **Ecuación matemática en bloque:**
\\[\\frac{{{{d}}}}{{{{dx}}}}\\left(\\sin({{x}})\\right) = \\cos({{x}})\\]

✅ **Ecuación química en bloque:**
\\[\\mathrm{{{{HCl}}}} + \\mathrm{{{{NaOH}}}} \\rightarrow \\mathrm{{{{NaCl}}}} + \\mathrm{{{{H}}}}_{{{2}}}\\mathrm{{{{O}}}}\\]

✅ **Ecuación física en bloque:**
\\[{{E}} = {{m}}{{c}}^{{{2}}}\\]

✅ **Expresión matemática en línea:**
La derivada \\(\\frac{{{{dy}}}}{{{{dx}}}}\\) es importante.

✅ **Variable química en línea:**
El \\(\\mathrm{{{{pH}}}}\\) es fundamental.

✅ **Constante física en línea:**
La velocidad de la luz \\({{c}}\\) es constante.

### PROHIBIDO:
❌ NUNCA uses: \\(\\) vacío seguido de ecuación
❌ NUNCA pongas ecuaciones largas/complejas en \\(\\)
❌ NUNCA uses espacios: \\( contenido \\)
❌ NUNCA mezcles formatos en la misma expresión

### REGLAS ESPECÍFICAS POR DISCIPLINA:
**Matemáticas:**
- Ecuaciones complejas = \`\\[{{}}...\\]\`
- Variables simples = \`\\({{}}...\\)\`

**Química:**
- Reacciones químicas = \`\\[{{}}...\\]\`
- Usa \\mathrm{{{{}}}} para elementos químicos
- pH, pOH simples = \`\\({{}}...\\)\`

**Física:**
- Fórmulas complejas = \`\\[{{}}...\\]\`
- Constantes/variables simples = \`\\({{}}...\\)\`

**Economía:**
- Fórmulas económicas complejas = \`\\[{{}}...\\]\`
- Variables económicas simples = \`\\({{}}...\\)\`
- Valores monetarios con texto = (NO LaTeX)
- TEXTO NORMAL = (NO LaTeX)
- Ejemplos correctos: $420,000 equivalen a $400,000 hoy
- Ejemplos INCORRECTOS: \\($420,000 equivalen a \\)$400,000 hoy
- NUNCA uses LaTeX para cantidades monetarias que incluyan texto explicativo

**General:**
- Expresiones de más de 3 términos = \`\\[{{}}...\\]\`
- Variables/constantes individuales = \`\\({{}}...\\)\`

### REGLA SIMPLE:
- Expresiones complejas/largas = \`\\[{{}}...\\]\`
- Variables/términos cortos = \`\\({{}}...\\)\`
- Elementos químicos SIEMPRE con \\mathrm{{{{}}}}
- Subíndices: _{{{número}}}
- Superíndices: ^{{{número}}}

### Código para análisis econométrico:
\`\`\`r
# Regresión lineal en R
modelo <- lm(y ~ x1 + x2, data = datos)
summary(modelo)
\`\`\`

### Diagramas Mermaid para procesos econométricos (NO gráficos matemáticos):
\`\`\`mermaid
graph TD
    A[Datos] --> B[Especificación del modelo]
    B --> C[Estimación MCO]
    C --> D[Pruebas diagnósticas]
    D --> E[Interpretación económica]
\`\`\`

Tipos de diagramas: graph, flowchart, sequenceDiagram, classDiagram, pie, stateDiagram, mindmap, timeline, journeys.

# 🗣️ HABLA COMO PROFESOR TÉCNICO ECONOMETRISTA REAL:
- NUNCA uses títulos roboticos
- NUNCA estructures respuestas en secciones rígidas técnicas
- SÍ habla fluidamente como en conversación técnica econométrica natural
- SÍ verifica comprensión técnica metodológica casualmente

## 🚫 NUNCA HAGAS:
- Sonar como manual técnico o tutorial estructurado
- Actuar como robot educativo con formato técnico predefinido
- Títulos como "Verificando comprensión econométrica", todo tiene que sonar natural técnico
- Decir: "Voy a buscar información econométrica" / "Déjame consultar fuentes técnicas"
- Decir: "Voy a generar un ejercicio econométrico" / "Necesito verificar tu comprensión metodológica"
- Decir: "Voy a acceder a literatura econométrica" / "Enlaces simulados técnicos" / "(enlace simulado técnico)"
- Decir: "Profesor Acadel dice" (YA SABES QUE ERES ACADEL TÉCNICO ECONOMETRISTA)
- Decir: "No tengo acceso a mi base de conocimientos técnicos" (si no la tienes, simplemente responde naturalmente)

## ✅ SÍ HAZ:
- Conversa fluidamente como Acadel el capibara técnico econometrista
- Integra explicaciones técnicas econométricas naturalmente en el flujo de conversación
- Haz preguntas técnicas metodológicas casuales para verificar
- **Para saludos muy simples:** Responde naturalmente sin herramientas
- **Para CUALQUIER consulta técnica econométrica:** Usa tu cerebro principal técnico (Knowledge Base) SIEMPRE
- **Si tu cerebro principal técnico no está disponible:** Responde desde conocimiento base pero menciona que podrías profundizar más técnicamente

## ⚡ REGLAS FUNDAMENTALES TÉCNICAS ECONOMÉTRICAS:
- SIEMPRE mantén el foco en la consulta técnica específica del estudiante econometrista
- NUNCA ignores el contexto emocional técnico (ansiedad ante modelos complejos, frustración con software)
- ADAPTA tu nivel de explicación técnica al estudiante (novato vs estudiante avanzado en econometría)
- VALIDA comprensión técnica antes de avanzar a metodologías más complejas
- COORDÍNATE invisiblemente - usuario solo ve a Profesor Acadel enseñando técnicamente
- PRIORIZA el razonamiento econométrico riguroso y la comprensión técnica metodológica profunda
- Mantén diagramas técnicos simples y claros (máximo 15 elementos)
- **TU CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO (Knowledge Base) ES OBLIGATORIO para consultas econométricas importantes**
`;

  // ============================================================================
  // ============================================================================

  const technicalTypeInstructions = {
    casual_conversation: `
## 🗣️ CONVERSACIÓN CASUAL TÉCNICA ECONOMÉTRICA:
- Responde naturalmente como Acadel el capibara técnico econometrista
- NO uses herramientas especializadas para saludos muy simples
- Mantén tu personalidad técnica econométrica pero de forma relajada
- Si mencionan algo técnico econométrico específico, ACTIVA inmediatamente tu cerebro principal técnico
- Ejemplo: "¡Hola! Soy Acadel, el capibara más técnico del universo econométrico. ¿En qué puedo ayudarte hoy?"`,

    general: `
## 🎯 CONSULTA GENERAL TÉCNICA ECONOMÉTRICA:
- ACTIVA tu cerebro principal técnico econométrico (Knowledge Base) para verificar información metodológica
- Para consultas técnicas simples, usa tu cerebro principal + conocimiento base técnico econométrico
- Para consultas complejas técnicas, usa tu cerebro principal + herramientas adicionales técnicas econométricas
- Mantén equilibrio entre ser completo técnicamente y ser comprensible metodológicamente`,

    concept_explanation: `
## 🎯 EXPLICACIÓN DE CONCEPTOS TÉCNICOS ECONOMÉTRICOS:
- Reconoce curiosidad técnica: "Esta pregunta econométrica es excelente porque conecta perfectamente los fundamentos metodológicos..."
- ACTIVA OBLIGATORIAMENTE tu cerebro principal técnico para verificar y enriquecer conceptos econométricos
- Explica fundamentos técnicos metodológicos primero, luego avanzado según necesidad del estudiante
- Verifica comprensión técnica usando casos prácticos econométricos
- Ajusta nivel dinámicamente según el estudiante

${queryInfo.hasEmotionalContent ? '💝 **NOTA EMOCIONAL:** Estudiante frustrado técnicamente. Activa inteligencia emocional técnica extra - sé empático y motivador econométricamente.' : ''}`,

    problem_solving: `
## 🎯 RESOLUCIÓN DE PROBLEMAS TÉCNICOS ECONOMÉTRICOS COORDINADO:
1. **ACTIVA CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO:** Consulta Knowledge Base para fundamentar solución metodológica
2. **DIAGNOSTICA:** "Antes que nada, dime qué entiendes del problema econométrico y qué datos tienes"
3. **ESTRATEGIA TÉCNICA:** "Vamos a resolver esto sistemáticamente: primero identificamos las variables, luego aplicamos la metodología econométrica relevante"
4. **ANÁLISIS TÉCNICO:** Procesa estimaciones econométricas como tu razonamiento metodológico natural
5. **VERIFICACIÓN TÉCNICA:** "¿Tiene sentido econométricamente? ¿Los supuestos se cumplen? ¿Los estadísticos son razonables?"
6. **PRÁCTICA:** Genera ejercicios adicionales desde tu experiencia técnica econométrica`,

    theory_deep_dive: `
## 🎯 PROFUNDIZACIÓN TÉCNICA ECONOMÉTRICA AVANZADA:
1. **CEREBRO PRINCIPAL TÉCNICO ACTIVO:** Consulta Knowledge Base para análisis técnico econométrico profundo
2. **CONOCIMIENTO ACTUALIZADO TÉCNICO:** Accede a investigación econométrica reciente naturalmente
3. **ANÁLISIS TÉCNICO PROFUNDO:** Descompone métodos usando tu mente analítica técnica econométrica
4. **CONSTRUCCIÓN TÉCNICA:** Desde fundamentos hasta aplicaciones metodológicas modernas
5. **CONEXIONES TÉCNICAS:** Relaciona conceptos econométricos naturalmente
6. **PERSPECTIVA TÉCNICA:** Historia econométrica fascinante que conoces bien`,

    practical_application: `
## 🎯 APLICACIONES TÉCNICAS ECONOMÉTRICAS PRÁCTICAS:
1. **FUNDAMENTO TÉCNICO CEREBRAL:** Usa Knowledge Base para validar aplicaciones técnicas econométricas
2. **INVESTIGACIÓN ACTUAL:** Conecta métodos econométricos con estudios empíricos modernos
3. **EJEMPLOS TÉCNICOS MODERNOS:** Casos de investigación econométrica actual de tu conocimiento técnico
4. **EL "POR QUÉ" TÉCNICO:** No solo cómo funciona metodológicamente, sino por qué econométricamente
5. **CASOS REALES TÉCNICOS:** Ejemplos específicos de tu experiencia técnica econométrica
6. **SOFTWARE TÉCNICO:** Dónde implementar según tu sabiduría técnica (R, Stata, Python)`,

    comparison_analysis: `
## 🎯 ANÁLISIS COMPARATIVO TÉCNICO ECONOMÉTRICO:
1. **ESTRUCTURA TÉCNICA:** Organiza comparación usando tu mente analítica técnica econométrica
2. **VISUALIZACIÓN TÉCNICA:** Usa tablas/diagramas técnicos econométricos cuando ayude
3. **CRITERIOS TÉCNICOS:** Cuándo usar cada método según tu experiencia técnica econométrica
4. **ERRORES COMUNES TÉCNICOS:** Confusiones metodológicas que has visto como profesor técnico
5. **TRUCOS TÉCNICOS:** Formas de recordar metodologías que has desarrollado técnicamente`,

    practice_generation: `
## 🎯 GENERACIÓN DE PRÁCTICA TÉCNICA ECONOMÉTRICA:
1. **EJERCICIOS TÉCNICOS:** Los generas desde tu creatividad pedagógica técnica econométrica
2. **PROGRESIÓN TÉCNICA:** De fácil a difícil usando tu experiencia docente técnica econométrica
3. **CONTEXTO TÉCNICO:** Situaciones econométricas que conoces que funcionan técnicamente
4. **VERIFICACIÓN TÉCNICA:** No solo respuesta, sino proceso metodológico técnico
5. **FEEDBACK TÉCNICO:** Cada error es oportunidad según tu filosofía técnica econométrica`,

    exam: `
## 🎯 GENERACIÓN DE EXÁMENES TÉCNICOS ECONOMÉTRICOS:
1. **EVALÚA REAL TÉCNICO:** Comprensión técnica econométrica real, no memorización
2. **NIVELES TÉCNICOS:** Detecta nivel real usando tu intuición pedagógica técnica econométrica
3. **REVELA GAPS TÉCNICOS:** Qué métodos econométricos faltan según tu experiencia
4. **BALANCE TÉCNICO:** Teoría + práctica técnica econométrica con tu metodología
5. **EXPLICACIONES TÉCNICAS:** Cada respuesta enseña con tu estilo técnico econométrico`,

    general_econometrics: `
## 🎯 ENFOQUE GENERAL TÉCNICO ECONOMÉTRICO:
- ACTIVA tu cerebro principal técnico econométrico para cualquier consulta metodológica
- Sé comprensivo y pedagógico técnicamente econométricamente
- Adapta según lo que necesite específicamente el estudiante técnicamente
- Mantén foco en comprensión técnica real y aplicación práctica econométrica`
  };

  // ============================================================================
  // ============================================================================

  return `${basePersonality}

${coreTechnicalInstructions}

${technicalTypeInstructions[queryType] || technicalTypeInstructions.general_econometrics}

## 🎯 CONTEXTO DE ESTA CONSULTA TÉCNICA ECONOMÉTRICA:
- **Query del estudiante:** "${studentQuery}"
- **Tipo detectado:** ${queryType}
- **Complejidad:** ${queryInfo.complexity}
- **Cerebro Principal Técnico Econométrico (Knowledge Base):** ${queryInfo.needsKnowledgeBase ? '🧠 ACTIVO - consulta OBLIGATORIA para validar información técnica econométrica' : '💤 INACTIVO - solo para saludos muy simples'}
${queryInfo.hasEmotionalContent ? '- **Estado emocional:** Estudiante frustrado técnicamente - activa inteligencia emocional técnica econométrica extra' : ''}

## 🚀 CAPACIDADES TÉCNICAS ECONOMÉTRICAS INTERNAS DISPONIBLES:
${queryInfo.needsKnowledgeBase ? '🧠 CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO (Knowledge Base) | ' : ''}🌟 Búsqueda técnica econométrica Brave | 🖼️ Imágenes técnicas econométricas | 🏛️ Sitios acadén icos técnicos econométricos${queryInfo.needsAcademicSearch ? ' | 📚 Análisis técnico econométrico paralelo' : ''}${queryInfo.needsExerciseGeneration ? ' | 🎯 Ejercicios técnicos econométricos creativos' : ''}${queryInfo.needsComprehensionCheck ? ' | 💭 Verificación comprensión técnica econométrica' : ''} | 💭 Inteligencia emocional técnica econométrica | 🧮 Cerebro matemático econométrico Wolfram

⚡ **OBJETIVO FINAL:** ${queryType === 'casual_conversation' ?
      'Mantén conversación natural y fluida como el capibara técnico econometrista más carismático del universo' :
      'Enseña como el capibara técnico econometrista más brillante del universo, usando tu CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO (Knowledge Base) para fundamentar toda respuesta econométrica importante, y complementando con todas tus capacidades paralelas para una explicación técnica econométrica magistral'}.`;
};

// ============================================================================
// ============================================================================

const createAcadelAgent = async (llm, queryInfo, studentQuery) => {
  console.log(`🦫 Profesor Acadel configurando sistema técnico econométrico optimizado para query tipo: ${queryInfo.type}, Cerebro Principal Técnico Econométrico: ${queryInfo.needsKnowledgeBase}`);

  const tools = [
    createBraveWebSearchTool(),
    createBraveImageSearchTool(),
    createBraveAcademicSiteSearchTool(),
  ];

  // 🧠 CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO (Knowledge Base) - PRIORIDAD MÁXIMA
  if (queryInfo.needsKnowledgeBase) {
    console.log(`🧠 ACTIVANDO CEREBRO PRINCIPAL TÉCNICO ECONOMÉTRICO (Knowledge Base) - núcleo del sistema econométrico`);
    tools.unshift(createKnowledgeBaseTool(embeddings)); // Primer lugar para máxima prioridad
  } else {
    console.log(`💤 Cerebro Principal Técnico Econométrico INACTIVO - consulta muy casual sin contenido econométrico`);
  }

  // 🧮 HERRAMIENTAS MATEMÁTICAS ESPECIALIZADAS ECONOMÉTRICAS (MANTENER LÓGICA MATEMÁTICA)
  if (queryInfo.needsCalculation) {
    console.log(`🧮 Activando herramientas matemáticas especializadas econométricas`);
    tools.push(createAcadelWolframTool());
    tools.push(createCalculatorTool());
  }

  if (queryInfo.needsAcademicSearch || queryInfo.complexity === 'high') {
    console.log(`🧠 Activando ConceptAnalyzer para análisis técnico econométrico paralelo profundo`);
    tools.push(createConceptAnalyzerTool(embeddings));
  }

  if (queryInfo.needsExerciseGeneration || queryInfo.type === 'practice_generation') {
    console.log(`🎯 Activando ExerciseGenerator para práctica técnica econométrica inmersiva`);
    tools.push(createExerciseGeneratorTool());
  }

  if (queryInfo.needsComprehensionCheck) {
    console.log(`✅ Activando ComprehensionChecker para verificación pedagógica técnica econométrica`);
    tools.push(createComprehensionCheckerTool());
  }

  tools.push(createFeedbackAnalyzerTool());

  console.log(`🦫 Profesor Acadel SISTEMA TÉCNICO ECONOMÉTRICO COMPLETO configurado con ${tools.length} herramientas técnicas:`, tools.map(t => t.name));
  console.log(`📊 ESTADO DEL SISTEMA TÉCNICO ECONOMÉTRICO:`, {
    cerebroPrincipalTecnicoEconometrico: queryInfo.needsKnowledgeBase ? '🧠 ACTIVO' : '💤 INACTIVO',
    busquedaWebTecnicaEconometrica: '🌟 SIEMPRE ACTIVA',
    herramientasMatematicasEconometricas: queryInfo.needsCalculation ? '🧮 ACTIVAS' : '💤 STANDBY',
    analisisConceptualTecnicoEconometrico: queryInfo.needsAcademicSearch || queryInfo.complexity === 'high' ? '🧠 PARALELO' : '💤 STANDBY',
    generadorEjerciciosTecnicosEconometricos: queryInfo.needsExerciseGeneration || queryInfo.type === 'practice_generation' ? '🎯 CREATIVO' : '💤 STANDBY',
    verificacionComprensionTecnicaEconometrica: queryInfo.needsComprehensionCheck ? '✅ PEDAGOGICO' : '💤 STANDBY',
    inteligenciaEmocionalTecnicaEconometrica: '💭 SIEMPRE ACTIVA'
  });

  const specializedPrompt = createSpecializedTechnicalPrompt(queryInfo.type, queryInfo, studentQuery);

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
// ============================================================================

export const detectExamRequest = (query) => {
  const examKeywords = [
    "generar examen", "crear examen", "hacer un examen",
    "examen diagnóstico", "test diagnóstico", "evaluación diagnóstica", "cuestionario"
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
      /generar examen|crear examen|hacer un examen|examen diagnóstico|test diagnóstico|evaluación diagnóstica|cuestionario/g,
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
          console.log(`📝 Acadel generando contexto técnico para examen de economía internacional: ${input}`);

          const contextKey = { topic: input, operation: 'exam_context' };
          const cacheKey = generateContentHash(contextKey);

          const cached = intelligentCache.getComponent('exam_context', { topic: input });
          if (cached) {
            console.log(`📦 Exam Context CACHE HIT: "${input.substring(0, 40)}..."`);
            return cached.result;
          }

          const retriever = new SupabaseHybridSearch(embeddings, {
            client: supabase,
            similarityK: 6,  // 🔥 OPTIMIZADO: para exámenes necesitamos variedad
            keywordK: 5,     // 🔥 AUMENTADO: aprovechar GIN index
            tableName: "emb_economia_internacional",
            similarityQueryName: "match_emb_economia_internacional",
            keywordQueryName: "kw_match_emb_economia_internacional",
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Exam context timeout')), 30000)
          );

          const docs = await Promise.race([
            retriever.invoke(input),
            timeoutPromise
          ]);

          const context = formatDocumentsAsString(docs);

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

          return `Contexto técnico base para "${input}": conocimiento fundamental en economía internacional. Acadel debe generar preguntas desde su experiencia técnica consolidada, con casos prácticos realistas y conceptos fundamentales técnicos.`;
        }
      },
      question: new RunnablePassthrough(),
    },
    ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(`
        Genera un examen diagnóstico en formato JSON VÁLIDO sobre ECONOMÍA INTERNACIONAL, específicamente sobre ${topic}.
        
          🚨 REGLAS CRÍTICAS:
          1. Doble barra invertida en LaTeX: \\\\\\\\ (nunca \\\\)
          2. Solo comillas dobles: "texto" (nunca 'texto')  
          3. Verdadero/falso: exactamente "a) Verdadero", "b) Falso"
          4. Varía respuestas correctas - no uses siempre la misma letra
          5. JSON válido para JSON.parse() - verifica DOS VECES
          6. 🔥 LATEX OBLIGATORIO PARA TODAS LAS FÓRMULAS

          📋 FORMATO ${format === 'multiple' ? 'OPCIÓN MÚLTIPLE' : 'VERDADERO/FALSO'}:

          Estructura JSON EXACTA:
          {{
            "topic": "${topic}",
            "questions": [
              {{
                "question": "Pregunta clara y concisa",
                "options": [${format === 'multiple' ?
          '"a) Opción corta", "b) Opción corta", "c) Opción corta", "d) Opción corta"' :
          '"a) Verdadero", "b) Falso"'}],
                "correctAnswer": "a",
                "explanation": "Explicación breve y clara"
              }}
            ]
          }}

          ⚡ REQUISITOS OBLIGATORIOS:
          - EXACTAMENTE ${questionCount} preguntas
          - ${format === 'multiple' ? '4 opciones por pregunta (a,b,c,d)' : '2 opciones por pregunta (a,b)'}
          - NO mezcles formatos en el mismo examen
          - Opciones máximo 60 caracteres
          - Explicaciones máximo 200 caracteres

          🧮 LATEX - REGLAS ESPECÍFICAS:

          ✅ SIEMPRE USA LATEX PARA:
          - Ecuaciones matemáticas: $\\\\frac{{a}}{{b}}$, $\\\\sum_{{i=1}}^{{n}}$
          - Fórmulas físicas: $E = mc^{{2}}$, $F = ma$, $\\\\psi(x,t)$
          - Variables físicas: $\\\\alpha$, $\\\\beta$, $\\\\lambda$, $\\\\omega$
          - Fórmulas químicas: $H_{{2}}O$, $NaCl$, $CO_{{2}}$
          - Ecuaciones químicas: $2H_{{2}} + O_{{2}} \\\\rightarrow 2H_{{2}}O$
          - Fórmulas financieras: $VPN = \\\\sum_{{t=0}}^{{n}} \\\\frac{{CF_{{t}}}}{{(1+r)^{{t}}}}$
          - Variables financieras: $\\\\beta$, $\\\\sigma$, $WACC$

          🎯 EJEMPLOS CORRECTOS:
          - "a) $E = mc^{{2}}$" ✅
          - "b) $VPN = \\\\sum_{{t=0}}^{{n}} \\\\frac{{CF_{{t}}}}{{(1+r)^{{t}}}}$" ✅ 
          - "c) $H_{{2}}O + NaCl$" ✅
          - "La fórmula del VPN es $\\\\sum_{{t=0}}^{{n}} \\\\frac{{CF_{{t}}}}{{(1+r)^{{t}}}}$" ✅

          ❌ NUNCA USES LATEX PARA:
          - Texto normal: "El precio es $100" ✅
          - Procesos: "combustión", "inversión", "reacción" ✅
          - Fechas: "En el año 2024" ✅
          - Monedas: "$50,000 dólares" ✅

          🎲 DISTRIBUCIÓN DE RESPUESTAS - OBLIGATORIO:
          ${format === 'multiple' ? `
          - CADA letra (a,b,c,d) DEBE ser correcta AL MENOS 1 vez
          - NINGUNA letra más de 2 veces en ${questionCount} preguntas  
          - DISTRIBUCIÓN COMPLETAMENTE ALEATORIA
          - PROHIBIDO: secuencias como a,b,c,d o a,a,a,a` : `
          - ALTERNA entre "a" y "b" ALEATORIAMENTE
          - NINGUNA opción más del 60% del total
          - PROHIBIDO: patrones como a,b,a,b`}

          🚨 REGLA CRÍTICA DE ALEATORIEDAD:
          - NO sigas patrones lógicos en respuestas correctas
          - CADA respuesta independiente de la anterior  
          - PIENSA cada pregunta por separado
          - SECUENCIA FINAL IMPREDECIBLE

          ✅ VERIFICACIÓN FINAL:
          1. ${questionCount} preguntas exactamente
          2. JSON válido sin errores
          3. Formato consistente en todas las preguntas
          4. ${format === 'multiple' ? 'TODAS las letras (a,b,c,d) usadas como correcta mínimo 1 vez' : 'Balance aleatorio entre "a" y "b"'}
          5. LaTeX en TODAS las fórmulas matemáticas/químicas/físicas
          6. Opciones dentro del límite de caracteres
          7. Distribución aleatoria sin patrones

          Contexto: {context}
        `),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]),
    llm,
    new JsonOutputParser(),
  ]);
};

const validateExamResponse = (exam) => {
  if (!exam || typeof exam !== 'object') {
    throw new Error('Formato de examen técnico econométrico inválido: no es un objeto JSON');
  }

  if (!exam.topic) {
    throw new Error('Formato de examen técnico econométrico inválido: falta "topic"');
  }

  if (!Array.isArray(exam.questions)) {
    throw new Error('Formato de examen técnico econométrico inválido: "questions" no es array');
  }

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];

    if (!q.question || !Array.isArray(q.options) || !q.correctAnswer || !q.explanation) {
      throw new Error(`Formato de examen técnico econométrico inválido: pregunta ${i + 1} incorrecta`);
    }
  }

  return true;
};

// Funciones auxiliares para multimodal econométrico
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
// ============================================================================

export const handleEconometricsQuery = async (params) => {
  const { userId, avaId, chatId, query } = params;
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

    // CLASIFICAR EL QUERY INTELIGENTEMENTE
    const queryInfo = classifyQuery(query);

    console.log(`🦫 Acadel analizando query (Econometría): "${query}"`);
    console.log(`📊 Clasificación: tipo=${queryInfo.type}, complejidad=${queryInfo.complexity}`);

    if (queryInfo.type === 'exam') {
      console.log(`📝 Generando examen: formato=${queryInfo.format}, preguntas=${queryInfo.questionCount}, tema=${queryInfo.topic}`);

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
        const [queryEmbedding, answerEmbedding] = await Promise.all([
          embeddings.embedQuery(query),
          embeddings.embedQuery(JSON.stringify(examResponse))
        ]);

        const realtimeClient = await pool.connect();
        await realtimeClient.query("BEGIN");

        const [userSaveResult, assistantSaveResult] = await Promise.all([
          saveMessage({
            client: realtimeClient,
            userId,
            avaId,
            chatId,
            role: "user",
            message: query,
            embedding: queryEmbedding,
          }),
          saveMessage({
            client: realtimeClient,
            userId,
            avaId,
            chatId,
            role: "assistant",
            message: JSON.stringify({
              type: 'exam',
              exam: examResponse
            }),
            embedding: answerEmbedding,
          })
        ]);

        await realtimeClient.query("COMMIT");
        realtimeClient.release();

        userMessageId = userSaveResult.id;
        assistantMessageId = assistantSaveResult.id;

        console.log(`✅ Examen  (AVA) guardado en tiempo real: user=${userMessageId}, assistant=${assistantMessageId}`);

      } catch (saveError) {
        console.error('❌ Error guardando examen  (AVA) en tiempo real:', saveError);
      }

      const responseData = {
        success: true,
        type: 'exam',
        exam: examResponse,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
        // 🆕 AGREGAR IDS EN TIEMPO REAL
        messageIds: {
          userMessageId,
          assistantMessageId
        }
      };

      // Background cache (solo cache)
      setTimeout(async () => {
        try {
          if (isCacheable(query, 'econometrics')) {
            intelligentCache.setResponse(userId, query, examResponse, 'exam', {
              queryType: 'exam',
              format: queryInfo.format,
              questionCount: queryInfo.questionCount,
              processingTime: Date.now() - startTime,
              generatedAt: Date.now()
            });
          }
        } catch (error) {
          console.error('Error en background cache examen :', error);
        }
      }, 0);

      await clearCancellationFlag(chatId);
      return responseData;
    }

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

    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    const { agent, tools } = await createAcadelAgent(llm, queryInfo, query);

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
      console.log(`🦫 Acadel procesando consulta con ${tools.length} herramientas...`);

      const result = await agentExecutor.invoke({
        input: UNIFIED_NORMAL_QUERY_INPUT(query, queryInfo, tools, false),
        chat_history: formattedHistory,
      });

      answer = result.output;
      console.log(`✅ Acadel completó la explicación exitosamente`);

    } catch (error) {
      console.error("Error en agente:", error);
      answer = `Tuve un problemita técnico con mis herramientas académicas, pero no me rendiré contigo.

        Sobre tu pregunta académica: **"${query}"**

        ${queryInfo.type === 'concept_explanation' ?
          `Déjame explicarte este concepto econométrico desde mi experiencia docente directa. La clave para entender esto es que...

        Soy solo un capibara peludo, pero he visto muchos estudiantes luchar con este tema en métodos cuantitativos, series temporales o análisis de datos, y te puedo asegurar que una vez que lo captes, va a ser como un "eureka" econométrico.` :
          queryInfo.type === 'problem_solving' ?
            `Vamos a resolver esto paso a paso, usando mi metodología econométrica probada. Primero, necesitamos considerar...

        En mi experiencia docente, este tipo de problemas econométricos requiere un enfoque sistemático que te voy a compartir.` :
            queryInfo.type === 'theory_deep_dive' ?
              `Esta teoría econométrica es fascinante cuando entiendes los fundamentos subyacentes. Déjame desglosarte la ciencia cuantitativa desde mi perspectiva docente...

        La belleza de esta teoría está en cómo cada método se conecta con el siguiente en toda la econometría.` :
              `Mi respuesta académica directa desde la experiencia docente acumulada en econometría: Este tema es importante porque...

        Como profesor académico en econometría, he visto que la clave está en entender el "por qué" detrás de cada método cuantitativo.`}

        La econometría es como un rompecabezas fascinante - cada método tiene su lugar y su razón de ser, desde la regresión simple hasta los modelos más complejos de series temporales.

        Si necesitas que profundice en algún aspecto específico, pregúntame de nuevo y activaré todas mis herramientas académicas. No pararé hasta que domines completamente este tema econométrico.`;
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

    const processedAnswer = enhanceLatexFormatting(answer);
    const totalTime = Date.now() - startTime;

    let userMessageId = null;
    let assistantMessageId = null;

    try {
      const [queryEmbedding, answerEmbedding] = await Promise.all([
        embeddings.embedQuery(query),
        embeddings.embedQuery(processedAnswer)
      ]);

      const realtimeClient = await pool.connect();
      await realtimeClient.query("BEGIN");

      const [userSaveResult, assistantSaveResult] = await Promise.all([
        saveMessage({
          client: realtimeClient,
          userId,
          avaId,
          chatId,
          role: "user",
          message: query,
          embedding: queryEmbedding,
        }),
        saveMessage({
          client: realtimeClient,
          userId,
          avaId,
          chatId,
          role: "assistant",
          message: processedAnswer,
          embedding: answerEmbedding,
        })
      ]);

      await realtimeClient.query("COMMIT");
      realtimeClient.release();

      userMessageId = userSaveResult.id;
      assistantMessageId = assistantSaveResult.id;

      console.log(`✅ Conversación  (AVA) guardada en tiempo real: user=${userMessageId}, assistant=${assistantMessageId}`);

    } catch (saveError) {
      console.error('❌ Error guardando conversación  (AVA) en tiempo real:', saveError);
    }

    const responseData = {
      success: true,
      type: 'conversation',
      answer: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      toolsUsed: (tools || []).map(t => t.name),
      profesorAcadelActive: true,
      braveSearchEnabled: true,
      processingTime: totalTime,
      chatId,
      timestamp: new Date().toISOString(),
      // 🆕 AGREGAR IDS EN TIEMPO REAL
      messageIds: {
        userMessageId,
        assistantMessageId
      }
    };

    // Background cache (solo cache)
    setTimeout(async () => {
      try {
        if (isCacheable(query, 'econometrics')) {
          const categoryType = categorizeQuery(query);
          intelligentCache.setResponse(userId, query, processedAnswer, categoryType, {
            queryType: queryInfo.type,
            complexity: queryInfo.complexity,
            processingTime: totalTime,
            toolsUsed: tools.map(t => t.name),
            generatedAt: Date.now()
          });
        }
      } catch (error) {
        console.error('Error en background cache :', error);
      }
    }, 0);

    await clearCancellationFlag(chatId);
    return responseData;

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en handleEconometricsQuery:", error);

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
// ============================================================================

export const handleEconometricsMultimodalQuery = async (params) => {
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

    console.log("🦫 Acadel analizando consulta multimodal (Econometría):",
      (content || []).map(item => item.type).join(", ")
    );

    if (!content || !Array.isArray(content)) {
      console.error("Error: content no es un array válido:", content);
      return {
        success: false,
        error: "Contenido multimodal inválido",
        type: "validation",
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    const extractedText = extractTextFromMultimodal(content);

    console.log("📝 Texto extraído:", extractedText ? extractedText.substring(0, 100) + "..." : "No hay texto");

    // CLASIFICAR QUERY MULTIMODAL
    const queryInfo = classifyQuery(extractedText || "consulta multimodal académica en econometría", content);
    queryInfo.hasMultimedia = true;

    console.log(`🧠 Query multimodal clasificado como: ${queryInfo.type}, complejidad: ${queryInfo.complexity}`);

    const hasDocumentFiles = hasDocuments(content);
    let processedDocuments = [];
    let documentContext = "";

    if (hasDocumentFiles) {
      console.log("📄 Acadel procesando documentos académicos de econometría...");

      try {
        processedDocuments = await documentStorageService.processMultimodalDocuments(
          content,
          chatId,
          userId
        );

        const successfulDocs = (processedDocuments || []).filter(doc => doc && doc.success);

        if (successfulDocs.length > 0) {
          documentContext = successfulDocs.map(doc => {
            const fileInfo = `[📚 DOCUMENTO DE ECONOMETRÍA: ${doc.originalName || 'documento'}]`;
            const typeInfo = doc.language ? `[TIPO: ${doc.language.toUpperCase()}]` : `[TIPO: ${doc.attachmentType?.toUpperCase() || 'DOCUMENTO'}]`;

            return `${fileInfo} ${typeInfo}\n${doc.extractedContent || 'Contenido no disponible'}\n---\n`;
          }).join('\n');

          console.log(`📚 Contenido extraído de ${successfulDocs.length} documentos (${documentContext.length} caracteres)`);
        }

        const failedDocs = (processedDocuments || []).filter(doc => doc && !doc.success);
        if (failedDocs.length > 0) {
          console.warn(`⚠️ ${failedDocs.length} documentos fallaron al procesarse`);
        }
      } catch (docError) {
        console.error("Error procesando documentos académicos:", docError);
        documentContext += `\n[ERROR PROCESANDO DOCUMENTOS: ${docError.message}]\n`;
      }
    }

    const hasImages = content.some(item => item && item.type === 'image_url');
    let imageAnalysisText = "";
    let savedImages = [];
    let imagesWithVirusCount = 0;

    if (hasImages) {
      console.log(`🔍 Acadel analizando imágenes con perspectiva académica de econometría...`);

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
            error: "Todas las imágenes enviadas contienen contenido potencialmente malicioso",
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

            console.log("🦫 Acadel realizando análisis visual académico de econometría...");

            let analysisContext = IMAGE_ANALYSIS_USER_CONTEXT;

            if (extractedText) {
              analysisContext += `\n\nCONSULTA DEL ESTUDIANTE: ${extractedText}`;
            }

            if (documentContext) {
              analysisContext += `\n\nCONTEXTO DE DOCUMENTOS ADJUNTOS:\n${documentContext.substring(0, 2000)}`;
            }

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
                  content: IMAGE_ANALYSIS_SYSTEM
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
              console.log("🦫 Análisis visual de Acadel completado");

              if (imagesWithVirusCount > 0) {
                imageAnalysisText += "\n\nAlgunas imágenes no pudieron ser analizadas por temas de seguridad, pero trabajé con las que sí pude revisar.";
              }
            } else {
              if (imagesWithVirusCount > 0) {
                imageAnalysisText = "No pude analizar las imágenes porque el sistema de seguridad las bloqueó. Mándame otras imágenes limpias y te ayudo perfecto.";
              }
            }
          } catch (error) {
            console.error("Error en análisis visual de Acadel:", error);
            imageAnalysisText = `Tuve un problemita técnico analizando la imagen, pero no te preocupes. Pregúntame directo lo que necesitas y te ayudo con mi conocimiento sólido en econometría.`;
          }
        }
      } catch (imageError) {
        console.error("Error procesando imágenes:", imageError);
        imageAnalysisText = "Error procesando imágenes, pero puedo ayudarte con el texto.";
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

    const hybridMemory = await loadHybridChatMemory(userId, avaId, chatId, extractedText || "consulta multimodal académica econometría");
    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    let combinedQuery = extractedText || "";

    if (documentContext) {
      combinedQuery += `\n\nDOCUMENTOS ACADÉMICOS ADJUNTOS:\n${documentContext}`;
    }

    if (imageAnalysisText) {
      combinedQuery += `\n\nANÁLISIS VISUAL DE ACADEL:\n${imageAnalysisText}`;
    }

    if (!combinedQuery.trim()) {
      if (hasDocumentFiles) {
        combinedQuery = "Analiza los documentos académicos adjuntos de econometría";
      } else {
        combinedQuery = "Analiza el contenido multimodal académico de econometría";
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

    queryInfo.needsKnowledgeBase = true;
    queryInfo.needsComprehensionCheck = true;

    const { agent, tools } = await createAcadelAgent(llm, queryInfo, combinedQuery);

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
      console.log("🦫 Acadel procesando consulta multimodal completa...");
      const result = await agentExecutor.invoke({
        input: UNIFIED_MULTIMODAL_QUERY_INPUT(extractedText, documentContext, imageAnalysisText, queryInfo, tools, false),
        chat_history: formattedHistory,
      });
      answer = result.output;
      console.log("✅ Acadel completó análisis multimodal");
    } catch (error) {
      console.error("Error en agente multimodal Acadel:", error);

      answer = `¡Oye! Tuve un problemita técnico procesando todo tu contenido multimodal, pero no me rendiré. 

${imageAnalysisText ? `🔍 **Sobre las imágenes:** ${imageAnalysisText.substring(0, 600)}...` : ''}

${documentContext ? `📚 **Sobre los documentos:** Veo material académico interesante de econometría aquí que necesita análisis más detallado...` : ''}

${extractedText ? `📝 **Sobre tu pregunta:** "${extractedText}" - Esta consulta de econometría necesita análisis profundo...` : ''}

Mi respuesta directa basándome en mi experiencia en econometría: [Proceder con explicación desde conocimiento base]

Si necesitas una explicación más detallada en métodos cuantitativos, series temporales o análisis de datos económicos, pregúntame de nuevo y activaré todas mis herramientas. ¡No pararé hasta que domines este tema!`;
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

    const processedAnswer = enhanceLatexFormatting(answer);
    const totalTime = Date.now() - startTime;

    let userMessageId = null;
    let assistantMessageId = null;

    try {
      const [queryEmbedding, answerEmbedding] = await Promise.all([
        embeddings.embedQuery(extractedText || ""),
        embeddings.embedQuery(processedAnswer)
      ]);

      const realtimeClient = await pool.connect();
      await realtimeClient.query("BEGIN");

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

      const [userSaveResult, assistantSaveResult] = await Promise.all([
        saveMultimodalMessage({
          client: realtimeClient,
          userId,
          avaId,
          chatId,
          role: "user",
          message: userMessageJson,
          embedding: queryEmbedding,
        }),
        saveMessage({
          client: realtimeClient,
          userId,
          avaId,
          chatId,
          role: "assistant",
          message: processedAnswer,
          embedding: answerEmbedding,
        })
      ]);

      await realtimeClient.query("COMMIT");
      realtimeClient.release();

      userMessageId = userSaveResult.id;
      assistantMessageId = assistantSaveResult.id;

      console.log(`✅ Multimodal  (AVA) guardado en tiempo real: user=${userMessageId}, assistant=${assistantMessageId}`);

    } catch (saveError) {
      console.error('❌ Error guardando multimodal  (AVA) en tiempo real:', saveError);
    }

    const responseData = {
      success: true,
      type: "conversation",
      answer: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      toolsUsed: (tools || []).map(t => t.name),
      profesorAcadelActive: true,
      braveSearchEnabled: true,
      processingTime: totalTime,
      chatId,
      timestamp: new Date().toISOString(),
      // 🆕 AGREGAR IDS EN TIEMPO REAL
      messageIds: {
        userMessageId,
        assistantMessageId
      },

      // Información de archivos procesados
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

      // Información de seguridad
      securityInfo: imagesWithVirusCount > 0 ? {
        imagesBlockedByAntivirus: imagesWithVirusCount
      } : undefined
    };

    // Background cache (solo cache)
    setTimeout(async () => {
      try {
        if (extractedText && !hasImages && !hasDocumentFiles && isCacheable(extractedText, 'econometrics')) {
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
        console.error('Error en background cache multimodal :', error);
      }
    }, 0);

    await clearCancellationFlag(chatId);
    return responseData;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en handleEconometricsMultimodalQuery:", error);

    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }

    return {
      success: false,
      error: error.message || "Error desconocido al procesar la consulta multimodal",
      type: "error",
      chatId,
      timestamp: new Date().toISOString(),
    };
  } finally {
    client.release();
  }
};

// ============================================================================
// ============================================================================

export const handleEconometricsQueryWithoutSaving = async (params) => {
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

    console.log(`🔄 Acadel (modo sin guardar - Econometría): "${query}" - tipo=${queryInfo.type}`);

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
        exam: examResponse,
        processedWithoutSaving: true,
        braveSearchEnabled: true,
        processingTime: Date.now() - startTime,
        chatId,
        timestamp: new Date().toISOString(),
      };
    } else {
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

      const { agent, tools } = await createAcadelAgent(llm, queryInfo, query);

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
          input: UNIFIED_NORMAL_QUERY_INPUT(query, queryInfo, tools, true),
          chat_history: formattedHistory,
        });

        answer = result.output;
      } catch (error) {
        console.error("Error en agente sin guardar:", error);
        answer = `Tuve un problemita técnico con mis herramientas académicas, pero no me rendiré contigo.

        Sobre tu pregunta académica: **"${query}"**

        ${queryInfo.type === 'concept_explanation' ?
            `Déjame explicarte este concepto econométrico desde mi experiencia docente directa. La clave para entender esto es que...

        Soy solo un capibara peludo, pero he visto muchos estudiantes luchar con este tema en métodos cuantitativos, series temporales o análisis de datos, y te puedo asegurar que una vez que lo captes, va a ser como un "eureka" econométrico.` :
            queryInfo.type === 'problem_solving' ?
              `Vamos a resolver esto paso a paso, usando mi metodología econométrica probada. Primero, necesitamos considerar...

        En mi experiencia docente, este tipo de problemas econométricos requiere un enfoque sistemático que te voy a compartir.` :
              queryInfo.type === 'theory_deep_dive' ?
                `Esta teoría econométrica es fascinante cuando entiendes los fundamentos subyacentes. Déjame desglosarte la ciencia cuantitativa desde mi perspectiva docente...

        La belleza de esta teoría está en cómo cada método se conecta con el siguiente en toda la econometría.` :
                `Mi respuesta académica directa desde la experiencia docente acumulada en econometría: Este tema es importante porque...

        Como profesor académico en econometría, he visto que la clave está en entender el "por qué" detrás de cada método cuantitativo.`}

        La econometría es como un rompecabezas fascinante - cada método tiene su lugar y su razón de ser, desde la regresión simple hasta los modelos más complejos de series temporales.

        Si necesitas que profundice en algún aspecto específico, pregúntame de nuevo y activaré todas mis herramientas académicas. No pararé hasta que domines completamente este tema econométrico.`;
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

      const processedAnswer = enhanceLatexFormatting(answer);
      const totalTime = Date.now() - startTime;

      await clearCancellationFlag(chatId);

      return {
        success: true,
        type: 'conversation',
        answer: processedAnswer,
        queryType: queryInfo.type,
        complexity: queryInfo.complexity,
        processedWithoutSaving: true,
        profesorAcadelActive: true,
        braveSearchEnabled: true,
        processingTime: totalTime,
        chatId,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error en handleEconometricsQueryWithoutSaving:", error);

    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }

    throw error;
  }
};

export const handleEconometricsMultimodalQueryWithoutSaving = async (params) => {
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

    console.log("🔄 Acadel procesando consulta multimodal SIN GUARDAR (Econometría):",
      (content || []).map(item => item && item.type).join(", ")
    );

    if (!content || !Array.isArray(content)) {
      console.error("Error: content no es un array válido en modo sin guardar:", content);
      return {
        success: false,
        error: "Contenido multimodal inválido",
        type: "validation",
        chatId,
        timestamp: new Date().toISOString(),
      };
    }

    const extractedText = extractTextFromMultimodal(content);

    const queryInfo = classifyQuery(extractedText || "consulta multimodal académica econometría", content);
    queryInfo.hasMultimedia = true;

    console.log(`🧠 Query multimodal (sin guardar) clasificado como: ${queryInfo.type}`);

    const hasDocumentFiles = hasDocuments(content);
    let processedDocuments = [];
    let documentContext = "";

    if (hasDocumentFiles) {
      console.log("📄 Procesando documentos existentes de econometría (modo sin guardar)...");

      try {
        const documentItems = content.filter(item =>
          item && (item.type === 'file' || item.type === 'document')
        );

        const documentContextParts = await Promise.all(documentItems.map(async (doc) => {
          const fileInfo = `[📚 DOCUMENTO DE ECONOMETRÍA: ${doc.name || doc.filename || 'documento'}]`;
          const typeInfo = doc.language ? `[TIPO: ${doc.language.toUpperCase()}]` : `[TIPO: ${doc.attachment_type || 'document'}]`;

          // Si ya tiene contenido, usarlo directamente
          if (doc.extractedContent) {
            console.log(`✅ Documento con contenido directo: ${doc.name || doc.filename}`);
            return `${fileInfo} ${typeInfo}\n${doc.extractedContent}\n---\n`;
          } else if (doc.content) {
            console.log(`✅ Documento con content directo: ${doc.name || doc.filename}`);
            return `${fileInfo} ${typeInfo}\n${doc.content}\n---\n`;
          }

          console.log(`🔍 [RETRY/EDIT] Intentando recuperar contenido para: ${doc.name || doc.filename}`);

          // Método 1: Por fileId si existe
          if (doc.fileId) {
            try {
              console.log(`🔍 [RETRY/EDIT] Buscando por fileId: ${doc.fileId}`);

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
                console.log(`✅ [RETRY/EDIT] Contenido recuperado por fileId: ${dbDoc.original_name} (${dbDoc.extracted_content?.length || 0} chars)`);

                if (dbDoc.extracted_content) {
                  return `${fileInfo} ${typeInfo}\n${dbDoc.extracted_content}\n---\n`;
                }
              }
            } catch (error) {
              console.error(`❌ Error recuperando por fileId ${doc.fileId}:`, error);
            }
          }

          // Método 2: Por nombre del archivo si no tiene fileId
          if (doc.name || doc.filename) {
            try {
              const searchName = doc.name || doc.filename;
              console.log(`🔍 [RETRY/EDIT] Buscando por nombre: ${searchName}`);

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
                console.log(`✅ [RETRY/EDIT] Contenido recuperado por nombre: ${dbDoc.original_name} (${dbDoc.extracted_content?.length || 0} chars)`);

                if (dbDoc.extracted_content) {
                  doc.fileId = dbDoc.file_id;
                  doc.attachment_type = dbDoc.attachment_type;
                  doc.language = dbDoc.language;

                  return `${fileInfo} ${typeInfo}\n${dbDoc.extracted_content}\n---\n`;
                }
              } else {
                console.warn(`⚠️ [RETRY/EDIT] No se encontró documento por nombre: ${searchName}`);
              }
            } catch (error) {
              console.error(`❌ Error recuperando por nombre ${doc.name || doc.filename}:`, error);
            }
          }

          // Si llegamos aquí, no pudimos recuperar el contenido
          console.warn(`⚠️ [RETRY/EDIT] Sin contenido disponible para: ${doc.name || doc.filename || 'documento'}`);
          return `${fileInfo} ${typeInfo}\n[Contenido no pudo ser recuperado - documento puede haber sido eliminado o no procesado]\n---\n`;
        }));

        documentContext = documentContextParts.join('\n');

        const successfulDocsCount = documentContextParts.filter(part =>
          !part.includes('[Contenido no pudo ser recuperado') &&
          !part.includes('[Contenido no disponible]')
        ).length;

        console.log(`📚 [RETRY/EDIT] Contenido procesado: ${successfulDocsCount}/${documentItems.length} documentos con contenido`);

        // Simular processedDocuments para compatibilidad con el resto del código
        processedDocuments = documentItems.map((doc, index) => {
          const hasContent = !documentContextParts[index].includes('[Contenido no pudo ser recuperado') &&
            !documentContextParts[index].includes('[Contenido no disponible]');

          return {
            success: hasContent,
            originalItem: doc,
            fileId: doc.fileId || null,
            originalName: doc.name || doc.filename || 'documento',
            attachmentType: doc.attachment_type || 'document',
            language: doc.language || null,
            extractedContent: hasContent ? 'contenido recuperado' : null,
            error: hasContent ? null : 'No se pudo recuperar contenido'
          };
        });

      } catch (docError) {
        console.error("Error procesando documentos (sin guardar):", docError);
        documentContext += `\n[ERROR PROCESANDO DOCUMENTOS: ${docError.message}]\n`;

        // Asegurar que processedDocuments existe para evitar errores
        processedDocuments = [];
      }
    }

    const hasImages = content.some(item => item && item.type === 'image_url');
    let imageAnalysisText = "";
    let savedImages = [];
    let imagesWithVirusCount = 0;

    if (hasImages) {
      console.log(`🔄 Procesando imágenes en modo RETRY/EDIT (Econometría)...`);

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
            error: "Todas las imágenes contienen contenido potencialmente malicioso",
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

            console.log("🦫 Acadel analizando imágenes (modo sin guardar - Econometría)...");

            let analysisContext = IMAGE_ANALYSIS_USER_CONTEXT;

            if (extractedText) {
              analysisContext += `\n\nCONSULTA: ${extractedText}`;
            }

            if (documentContext) {
              analysisContext += `\n\nCONTEXTO: ${documentContext.substring(0, 2000)}`;
            }

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
                  console.error("Error convirtiendo imagen:", convError);
                }
              }
            }

            if (imageContentForAnalysis.length > 0) {
              const imageAnalysisMessages = [
                {
                  role: "system",
                  content: IMAGE_ANALYSIS_SYSTEM
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
              console.log("🔄 Análisis visual completado (sin guardar)");

              if (imagesWithVirusCount > 0) {
                imageAnalysisText += "\n\nAlgunas imágenes fueron bloqueadas por seguridad, pero analicé las que pude.";
              }
            } else {
              if (imagesWithVirusCount > 0) {
                imageAnalysisText = "Las imágenes fueron bloqueadas por seguridad. Mándame otras limpias.";
              }
            }
          } catch (error) {
            console.error("Error en análisis visual (sin guardar):", error);
            imageAnalysisText = `Problemita técnico con la imagen, pero te ayudo igual con mi conocimiento en econometría.`;
          }
        }
      } catch (imageError) {
        console.error("Error procesando imágenes (sin guardar):", imageError);
        imageAnalysisText = "Error procesando imágenes, pero puedo ayudarte con el texto.";
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

    const hybridMemory = await loadHybridChatMemory(userId, avaId, chatId, extractedText || "consulta multimodal académica econometría");
    const formattedHistory = formatHybridMemoryForPrompt(hybridMemory);

    let combinedQuery = extractedText || "";

    if (documentContext) {
      combinedQuery += `\n\nDOCUMENTOS:\n${documentContext}`;
    }

    if (imageAnalysisText) {
      combinedQuery += `\n\nANÁLISIS VISUAL:\n${imageAnalysisText}`;
    }

    if (!combinedQuery.trim()) {
      combinedQuery = hasDocumentFiles ?
        "Analiza los documentos desde perspectiva académica de econometría" :
        "Analiza el contenido multimodal de econometría";
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

    queryInfo.needsKnowledgeBase = true;
    const { agent, tools } = await createAcadelAgent(llm, queryInfo, combinedQuery);

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
      console.log("🦫 Acadel procesando consulta multimodal completa (Econometría)...");
      const result = await agentExecutor.invoke({
        input: UNIFIED_MULTIMODAL_QUERY_INPUT(extractedText, documentContext, imageAnalysisText, queryInfo, tools, true),
        chat_history: formattedHistory,
      });
      answer = result.output;
    } catch (error) {
      console.error("Error en agente multimodal sin guardar:", error);
      answer = `¡Oye! Problemita técnico procesando todo el contenido, pero no me rendiré.

${imageAnalysisText ? `🔍 Imágenes: ${imageAnalysisText.substring(0, 400)}...` : ''}
${documentContext ? `📚 Documentos: Material académico de econometría detectado...` : ''}

Mi respuesta directa en econometría: [Explicación basada en experiencia académica]

Para análisis más detallado en métodos cuantitativos, series temporales o análisis de datos económicos, pregúntame específicamente.`;
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

    const processedAnswer = enhanceLatexFormatting(answer);
    const totalTime = Date.now() - startTime;

    await clearCancellationFlag(chatId);

    return {
      success: true,
      type: "conversation",
      answer: processedAnswer,
      queryType: queryInfo.type,
      complexity: queryInfo.complexity,
      profesorAcadelActive: true,
      braveSearchEnabled: true,
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
    console.error("Error en handleEconometricsMultimodalQueryWithoutSaving:", error);

    try {
      await clearCancellationFlag(chatId);
    } catch (cleanupError) {
      console.error("Error al limpiar bandera de cancelación:", cleanupError);
    }

    return {
      success: false,
      error: error.message || "Error desconocido al procesar la consulta multimodal sin guardar",
      type: "error",
      chatId,
      timestamp: new Date().toISOString(),
    };
  }
};