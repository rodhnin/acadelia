// marketingAPI.js - API con limpieza por sección específica
import { api, sanitizeJsonResponse } from './apiClient.js';

const MARKETING_ENDPOINT = '/marketing';

let currentNotifications = {
  total: 0,
  byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
  notifications: { profiles: [], contents: [], trends: [], memory: [] },
  sessionId: null
};

// Datos de ejemplo para fallback cuando las APIs no están disponibles
const FALLBACK_DATA = {
  trends: [
    {
      id: '9c2e8400-e29b-41d4-a716-334455667001',
      theme: 'Tutoriales en formato de shorts',
      popularity: 0.85,
      created_at: new Date().toISOString(),
      analysis: {
        categories: ['educación', 'tecnología'],
        marketing_opportunities: [
          'Crear serie de TikToks con Capibara Profesor resolviendo problemas típicos',
          'Desarrollar formato de challenge para problemas complejos',
          'Crear hashtag específico para tutoriales de Acadelia'
        ],
        recommended_channels: ['TikTok', 'Instagram Reels', 'YouTube Shorts']
      }
    },
    {
      id: '9c2e8400-e29b-41d4-a716-334455667002',
      theme: 'Gamificación del estudio',
      popularity: 0.72,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      analysis: {
        categories: ['educación', 'entretenimiento'],
        marketing_opportunities: [
          'Crear desafíos semanales con recompensas virtuales',
          'Implementar sistema de niveles de dominio por asignatura',
          'Desarrollar trivias educativas con Capibara Profesor como presentador'
        ],
        recommended_channels: ['App', 'Discord', 'Instagram']
      }
    }
  ],
  profiles: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      metadata: {
        edad: 21,
        carrera: 'Medicina',
        nivel_academico: 'Pregrado',
        curso: 'Primer año',
        hobbies: ['deportes', 'videojuegos', 'lectura'],
        actitudes: {
          humor: 0.8,
          risk_taking: 0.3,
          organización: 0.7
        },
        canales_preferidos: ['Instagram', 'WhatsApp'],
        desafíos: ['anatomía', 'química orgánica', 'tiempo de estudio']
      }
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      metadata: {
        edad: 23,
        carrera: 'Ingeniería',
        nivel_academico: 'Pregrado',
        curso: 'Tercer año',
        hobbies: ['programación', 'música', 'videojuegos'],
        actitudes: {
          humor: 0.6,
          risk_taking: 0.7,
          organización: 0.5
        },
        canales_preferidos: ['TikTok', 'Discord'],
        desafíos: ['cálculo', 'física', 'proyectos']
      }
    }
  ],
  contents: [
    {
      id: '7a1e8400-f39b-41d4-b716-556699440001',
      type: 'meme',
      channel: 'Instagram',
      payload: {
        title: 'Capibara vs. Anatomía',
        description: 'Capibara Profesor con bata blanca explicando huesos del cráneo con analogías divertidas',
        caption: 'Cuando memorizas los huesos del cráneo usando analogías de comida',
        subcaption: 'Capibara Profesor aprueba este método',
        target_emotion: 'alivio humorístico',
        educational_value: 'técnica mnemotécnica para huesos del cráneo'
      }
    },
    {
      id: '7a1e8400-f39b-41d4-b716-556699440002',
      type: 'email',
      channel: 'Email',
      payload: {
        title: 'Domina los exámenes de física con Capibara Profesor',
        description: 'Email educativo con consejos para prepararse para exámenes de física',
        subject: '🔬 5 trucos infalibles para aprobar Física I',
        body_preview: 'Estimado estudiante, ¿te sientes abrumado por los exámenes de física? Capibara Profesor tiene la solución...',
        cta: 'Ver consejos completos',
        target_audience: 'Estudiantes de ingeniería y ciencias'
      }
    }
  ],
  summary: {
    stats: {
      profilesCount: 48,
      contentsCount: 156,
      interactions: [
        { action: 'viewed', count: 320, unique_profiles: 48, unique_contents: 35 },
        { action: 'clicked', count: 85, unique_profiles: 42, unique_contents: 28 },
        { action: 'shared', count: 12, unique_profiles: 10, unique_contents: 8 }
      ],
      recentTrends: [
        { theme: 'Tutoriales en formato de shorts', popularity: 0.85 },
        { theme: 'Gamificación del estudio', popularity: 0.72 }
      ]
    },
    predictions: [
      {
        campaign: 'Email para estudiantes de medicina',
        metrics: {
          open_rate: 0.42,
          click_rate: 0.12,
          conversion: 0.08
        },
        confidence: 0.75
      },
      {
        campaign: 'Memes para Instagram sobre física',
        metrics: {
          engagement: 0.38,
          shares: 0.15,
          conversion: 0.05
        },
        confidence: 0.82
      }
    ]
  }
};

function sanitizeMetadataJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return jsonString;
  }
  
  let cleaned = jsonString.trim();
  
  cleaned = cleaned
    .replace(/^\s*[\*\_\-\s]*\s*/, '')
    .replace(/\s*[\*\_\-\s]*\s*$/, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/([^\\])"/g, '$1\\"')
    .trim();
  
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const startMatch = cleaned.match(/[\{\[]/);
    if (startMatch) {
      cleaned = cleaned.substring(cleaned.indexOf(startMatch[0]));
    }
  }
  
  if (!cleaned.endsWith('}') && !cleaned.endsWith(']')) {
    const endMatch = cleaned.match(/.*[\}\]]/);
    if (endMatch) {
      cleaned = endMatch[0];
    }
  }
  
  return cleaned;
}

function processStreamMetadata(chunk, responseMetadata) {
  let cleanChunk = chunk;
  let hasMetadata = false;
  let hasNotifications = false;
  
  const notificationsRegex = /\*\*NOTIFICATIONS_START\*\*([\s\S]*?)\*\*NOTIFICATIONS_END\*\*/g;
  let notificationMatch;
  
  while ((notificationMatch = notificationsRegex.exec(chunk)) !== null) {
    try {
      const notificationData = JSON.parse(notificationMatch[1].trim());
      if (notificationData.notifications) {
        currentNotifications = notificationData.notifications;
        window.dispatchEvent(new CustomEvent('newNotifications', {
          detail: {
            notifications: currentNotifications,
            hasNewContent: notificationData.hasNewContent || false
          }
        }));
        hasNotifications = true;
      }
    } catch (e) {
      console.error('❌ Error procesando notificaciones:', e);
    }
  }
  
  const mainMetadataRegex = /\*\*METADATA_START\*\*([\s\S]*?)\*\*METADATA_END\*\*/g;
  let metadataMatch;
  
  while ((metadataMatch = mainMetadataRegex.exec(chunk)) !== null) {
    try {
      let sanitizedMetadataJson = sanitizeMetadataJson(metadataMatch[1].trim());
      let metadata = null;
      
      try {
        metadata = JSON.parse(sanitizedMetadataJson);
      } catch (directError) {
        try {
          const advancedSanitized = api.sanitizeJsonForFrontend(metadataMatch[1]);
          metadata = JSON.parse(advancedSanitized);
        } catch (advancedError) {
          try {
            metadata = api.debugJsonParsing(metadataMatch[1], 'stream-metadata');
            if (metadata && metadata.error) {
              throw new Error('Debug también falló');
            }
          } catch (debugError) {
            console.error('❌ Todas las estrategias de parsing fallaron:', debugError);
            continue;
          }
        }
      }
      
      if (metadata && !metadata.error) {
        hasMetadata = true;
        updateResponseMetadata(metadata, responseMetadata);
      }
      
    } catch (e) {
      console.error('❌ Error crítico procesando metadatos:', e);
    }
  }
  
  if (hasNotifications) {
    cleanChunk = cleanChunk.replace(notificationsRegex, '');
  }
  
  if (hasMetadata) {
    cleanChunk = cleanChunk.replace(mainMetadataRegex, '');
  }
  
  // Filtros específicos y precisos - solo para líneas exactas
  const strictForbiddenPatterns = [
    /^\s*\*\*METADATA_START\*\*\s*$/,
    /^\s*\*\*METADATA_END\*\*\s*$/,
    /^\s*\*\*NOTIFICATIONS_START\*\*\s*$/,
    /^\s*\*\*NOTIFICATIONS_END\*\*\s*$/,
    /^\s*agentSelection\s*:\s*\{.*\}\s*$/,
    /^\s*agentsUsed\s*:\s*\[.*\]\s*$/,
  ];
  
  const hasForbiddenContent = strictForbiddenPatterns.some(pattern => pattern.test(cleanChunk));
  
  if (hasForbiddenContent) {
    return '';
  }
  
  const trimmedChunk = cleanChunk.trim();
  const isActuallyEmpty = !trimmedChunk || 
                         trimmedChunk.length === 0 ||
                         /^\s*$/.test(trimmedChunk);
  
  if (isActuallyEmpty) {
    return '';
  }
  
  return cleanChunk;
}

function updateResponseMetadata(metadata, responseMetadata) {
  if (metadata.agentsUsed || metadata['agents Used'] || metadata.agentes) {
    const agents = metadata.agentsUsed || metadata['agents Used'] || metadata.agentes;
    if (Array.isArray(agents)) {
      responseMetadata.agentsUsed = agents;
    } else if (typeof agents === 'string') {
      responseMetadata.agentsUsed = agents.split(',').map(a => a.trim());
    }
  }
  
  if (metadata.agentSelection || metadata['agent Selection'] || metadata.seleccion) {
    responseMetadata.agentSelection = metadata.agentSelection || metadata['agent Selection'] || metadata.seleccion;
  }
  
  if (metadata.explanation || metadata.explicacion) {
    responseMetadata.explanation = metadata.explanation || metadata.explicacion;
  }
  
  if (metadata.detectedElements || metadata.elementos || metadata.detected) {
    responseMetadata.detectedElements = metadata.detectedElements || metadata.elementos || metadata.detected;
  }
  
  if (metadata.stats || metadata.estadisticas || metadata.statistics) {
    responseMetadata.stats = metadata.stats || metadata.estadisticas || metadata.statistics;
  }
}

// API para chat con sanitización
export async function sendQuery(query, explainLevel = 'intermediate') {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/query`, {
      query,
      explain: true,
      explainLevel
    });
    
    if (response.notifications) {
      currentNotifications = response.notifications;
      
      if (response.hasNewContent) {
        window.dispatchEvent(new CustomEvent('newNotifications', {
          detail: {
            notifications: currentNotifications,
            hasNewContent: response.hasNewContent
          }
        }));
      }
    }
    
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API sendQuery:', error);
    return {
      success: true,
      response: "Lo siento, el servidor no está disponible actualmente. Esta es una respuesta de prueba.",
      agentsUsed: ["strategist"],
      explanation: {
        explanation: "Esta es una explicación simulada por fallo de conexión.",
        level: explainLevel
      },
      notifications: currentNotifications,
      hasNewContent: false
    };
  }
}

// API para streaming de consultas
export async function streamQuery(query, onChunk, onComplete, onError, explainLevel = 'intermediate') {
  let responseMetadata = {
    agentsUsed: [],
    agentSelection: null,
    explanation: null,
    detectedElements: null,
    stats: null,
    notifications: null
  };
  
  // Wrapper para onChunk que procesa metadatos
  const enhancedOnChunk = (chunk) => {
    try {
      const cleanChunk = processStreamMetadata(chunk, responseMetadata);
      
      if (cleanChunk && cleanChunk.trim()) {
        onChunk(cleanChunk);
      }
    } catch (chunkError) {
      console.error('❌ Error procesando chunk:', chunkError);
      const safeChunk = chunk.replace(/\*\*METADATA.*?\*\*/g, '').replace(/\*\*NOTIFICATIONS.*?\*\*/g, '').trim();
      if (safeChunk.length > 2) {
        onChunk(safeChunk);
      }
    }
  };
  
  const enhancedComplete = () => {
    responseMetadata.notifications = currentNotifications;
    
    if (!responseMetadata.explanation && query) {
      getExplanation(query, explainLevel)
        .then(explanationData => {
          responseMetadata.explanation = explanationData;
          onComplete && onComplete(responseMetadata);
        })
        .catch(error => {
          console.warn("⚠️ Error obteniendo explicación:", error);
          onComplete && onComplete(responseMetadata);
        });
    } else {
      onComplete && onComplete(responseMetadata);
    }
  };
  
  try {
    await api.stream(
      `${MARKETING_ENDPOINT}/query-stream`, 
      { 
        query, 
        chatHistory: [],
        explain: true,
        explainLevel
      },
      enhancedOnChunk,
      enhancedComplete,
      onError
    );
  } catch (error) {
    console.warn('⚠️ Error grave en API streamQuery:', error);
    
    try {
      const response = await sendQuery(query, explainLevel);
      
      if (response && response.success) {
        responseMetadata.agentsUsed = response.agentsUsed || ["strategist"];
        responseMetadata.explanation = response.explanation;
        responseMetadata.agentSelection = response.agentSelection;
        responseMetadata.detectedElements = response.detectedElements;
        responseMetadata.stats = response.stats;
        
        if (response.notifications) {
          currentNotifications = response.notifications;
          responseMetadata.notifications = currentNotifications;
          
          window.dispatchEvent(new CustomEvent('newNotifications', {
            detail: {
              notifications: currentNotifications,
              hasNewContent: response.hasNewContent || false
            }
          }));
        }
        
        const responseText = response.response || "Sin respuesta del servidor";
        simulateStreamResponse(
          responseText, 
          onChunk, 
          () => onComplete && onComplete(responseMetadata)
        );
      } else {
        throw new Error("Respuesta no válida del servidor");
      }
    } catch (fallbackError) {
      console.error("❌ Error en fallback:", fallbackError);
      responseMetadata.agentsUsed = ["strategist"];
      
      const errorMessage = "Lo siento, no puedo procesar tu consulta en este momento debido a problemas de conexión.";
      simulateStreamResponse(
        errorMessage, 
        onChunk, 
        () => onComplete && onComplete(responseMetadata)
      );
      
      if (onError) {
        onError(fallbackError);
      }
    }
  }
}

function simulateStreamResponse(text, onChunk, onComplete, delay = 20) {
  const words = text.split(' ');
  let index = 0;
  
  const sendNextWord = () => {
    if (index < words.length) {
      const chunk = (index === 0 ? '' : ' ') + words[index];
      onChunk(chunk);
      index++;
      setTimeout(sendNextWord, delay);
    } else {
      onComplete && onComplete();
    }
  };
  
  sendNextWord();
}

// Nueva función para obtener explicación aparte con sanitización
export async function getExplanation(query, level = 'intermediate') {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/explain`, {
      query,
      level
    });
    
    const sanitizedResponse = sanitizeJsonResponse(response);
    
    return sanitizedResponse.explanation || {
      explanation: "No se pudo obtener una explicación detallada.",
      level: level,
      query: query
    };
  } catch (error) {
    console.warn('Error obteniendo explicación:', error);
    return {
      explanation: "No se pudo obtener una explicación detallada debido a un error de conexión.",
      level: level,
      query: query
    };
  }
}

// Nueva función para obtener visualización de decisiones con sanitización
export async function getDecisionVisualization(query) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/visualize`, {
      query
    });
    
    const sanitizedResponse = sanitizeJsonResponse(response);
    
    return sanitizedResponse.visualization || {
      mermaidDiagram: "graph TD\n  Query[Consulta] --> Estratega\n  Estratega --> Respuesta[Respuesta]",
      format: 'mermaid'
    };
  } catch (error) {
    console.warn('Error obteniendo visualización:', error);
    return {
      mermaidDiagram: "graph TD\n  Query[Consulta] --> Error[Error de conexión]",
      format: 'mermaid'
    };
  }
}

// Wrapper para aplicar sanitización a todas las APIs
function wrapApiCall(apiFunction, ...args) {
  return apiFunction(...args)
    .then(response => sanitizeJsonResponse(response))
    .catch(error => {
      console.warn(`Error en API call:`, error);
      throw error;
    });
}

// API para perfiles con sanitización
export async function getProfiles(filters = {}) {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/profiles`, filters);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API getProfiles:', error);
    return {
      success: true,
      profiles: FALLBACK_DATA.profiles
    };
  }
}

export async function createProfile(profileData) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/profiles`, profileData);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API createProfile:', error);
    const newId = 'profile_' + Math.random().toString(36).substring(2, 12);
    return {
      success: true,
      profile: {
        id: newId,
        metadata: profileData,
        created_at: new Date().toISOString()
      }
    };
  }
}

export async function updateProfile(id, profileData) {
  try {
    const response = await api.put(`${MARKETING_ENDPOINT}/profiles/${id}`, profileData);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API updateProfile:', error);
    return {
      success: true,
      profile: {
        id: id,
        metadata: profileData,
        updated_at: new Date().toISOString()
      }
    };
  }
}

export async function deleteProfile(profileId) {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/profiles/${profileId}`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteProfile:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Perfil eliminado correctamente (simulado)',
        deletedId: profileId
      };
    }
    
    throw error;
  }
}

export async function deleteAllProfiles() {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/profiles/all`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteAllProfiles:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Todos los perfiles eliminados correctamente (simulado)',
        deletedCount: 0
      };
    }
    
    throw error;
  }
}

// API para contenidos con sanitización
export async function getContents(filters = {}) {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/contents`, filters);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API getContents:', error);
    return {
      success: true,
      contents: FALLBACK_DATA.contents
    };
  }
}

export async function createContent(contentData) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/contents`, contentData);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API createContent:', error);
    const newId = 'content_' + Math.random().toString(36).substring(2, 12);
    return {
      success: true,
      content: {
        id: newId,
        ...contentData,
        created_at: new Date().toISOString()
      }
    };
  }
}

export async function generateContent(params) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/generate-content`, params);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API generateContent:', error);
    return {
      success: true,
      content: {
        id: 'gen_' + Math.random().toString(36).substring(2, 12),
        type: params.type || 'post',
        channel: params.channel || 'Instagram',
        payload: {
          title: `Contenido generado para ${params.theme || 'tema genérico'}`,
          description: `Descripción simulada para ${params.theme || 'tema genérico'}`,
          target_audience: JSON.stringify(params.target || 'Estudiantes universitarios')
        },
        created_at: new Date().toISOString()
      }
    };
  }
}

export async function deleteContent(contentId) {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/contents/${contentId}`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteContent:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Contenido eliminado correctamente (simulado)',
        deletedId: contentId
      };
    }
    
    throw error;
  }
}

export async function deleteAllContents() {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/contents/all`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteAllContents:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Todos los contenidos eliminados correctamente (simulado)',
        deletedCount: 0
      };
    }
    
    throw error;
  }
}

// API para matching con sanitización
export async function matchProfileToContent(profileId, contentType, limit = 5) {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/match/profile/${profileId}/contents`, {
      contentType,
      limit
    });
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API matchProfileToContent:', error);
    return {
      success: true,
      matches: FALLBACK_DATA.contents.slice(0, limit),
      profile: FALLBACK_DATA.profiles.find(p => p.id === profileId) || FALLBACK_DATA.profiles[0]
    };
  }
}

export async function matchContentToProfiles(contentId, limit = 5) {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/match/content/${contentId}/profiles`, { limit });
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API matchContentToProfiles:', error);
    return {
      success: true,
      matches: FALLBACK_DATA.profiles.slice(0, limit),
      content: FALLBACK_DATA.contents.find(c => c.id === contentId) || FALLBACK_DATA.contents[0]
    };
  }
}

export async function recordInteraction(profileId, contentId, channel, action) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/interactions`, {
      profileId,
      contentId,
      channel,
      action
    });
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API recordInteraction:', error);
    return {
      success: true,
      interaction: {
        id: 'int_' + Math.random().toString(36).substring(2, 12),
        profile_id: profileId,
        content_id: contentId,
        channel,
        action,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// API para simulación con sanitización
export async function simulateCampaign(campaignData, audienceData) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/simulate`, {
      campaignData,
      audienceData
    });
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API simulateCampaign:', error);
    return {
      success: true,
      results: {
        metrics: {
          open_rate: 0.35,
          click_rate: 0.12,
          conversion: 0.05
        },
        confidence: 0.7,
        recommendations: [
          "Optimizar el asunto del email para incrementar tasa de apertura",
          "Incluir más elementos visuales con Capibara Profesor"
        ]
      }
    };
  }
}

// API para tendencias con sanitización
export async function getTrends() {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/trends`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API getTrends:', error);
    return {
      success: true,
      trends: FALLBACK_DATA.trends
    };
  }
}

export async function createTrend(trendData) {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/trends`, trendData);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API createTrend:', error);
    const newId = 'trend_' + Math.random().toString(36).substring(2, 12);
    return {
      success: true,
      trend: {
        id: newId,
        theme: trendData.theme,
        popularity: trendData.popularity,
        created_at: new Date().toISOString()
      },
      analysis: {
        categories: trendData.metadata?.categories || ['educación'],
        recommended_channels: trendData.metadata?.recommended_channels || ['Instagram', 'TikTok'],
        marketing_opportunities: trendData.metadata?.marketing_opportunities || ['Crear contenido relacionado con esta tendencia']
      }
    };
  }
}

export async function deleteTrend(trendId) {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/trends/${trendId}`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteTrend:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Tendencia eliminada correctamente (simulado)',
        deletedId: trendId
      };
    }
    
    throw error;
  }
}

export async function deleteAllTrends() {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/trends/all`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('❌ Error en API deleteAllTrends:', error);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        success: true,
        message: 'Todas las tendencias eliminadas correctamente (simulado)',
        deletedCount: 0
      };
    }
    
    throw error;
  }
}

// API para resumen con sanitización
export async function getMarketingSummary() {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/summary`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.warn('Error en API getMarketingSummary:', error);
    return {
      success: true,
      summary: "Resumen simulado del estado del marketing de Acadelia. Este es un texto de ejemplo que se muestra cuando la API no está disponible.",
      stats: FALLBACK_DATA.summary.stats
    };
  }
}

// API para obtener insights de memoria
export async function getMemoryInsights(filters = {}) {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/memory`, filters);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('Error en API getMemoryInsights:', error);
    throw error;
  }
}

export async function deleteMemoryInsight(memoryId) {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/memory/${memoryId}`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('Error en API deleteMemoryInsight:', error);
    throw error;
  }
}

export async function updateMemoryInsight(memoryId, updateData) {
  try {
    const response = await api.put(`${MARKETING_ENDPOINT}/memory/${memoryId}`, updateData);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('Error en API updateMemoryInsight:', error);
    throw error;
  }
}

export async function resetAllMemory() {
  try {
    const response = await api.delete(`${MARKETING_ENDPOINT}/memory/reset-all`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('Error en API resetAllMemory:', error);
    throw error;
  }
}

export async function getMemoryStats() {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/memory/stats`);
    return sanitizeJsonResponse(response);
  } catch (error) {
    console.error('Error en API getMemoryStats:', error);
    throw error;
  }
}

export async function getNotifications() {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/notifications`);
    
    if (response.notifications) {
      currentNotifications = response.notifications;
    }
    
    return response;
  } catch (error) {
    console.warn('Error obteniendo notificaciones:', error);
    return {
      success: false,
      error: error.message,
      notifications: currentNotifications
    };
  }
}

export async function getNotificationCounts() {
  try {
    const response = await api.get(`${MARKETING_ENDPOINT}/notifications/counts`);
    return response;
  } catch (error) {
    console.warn('Error obteniendo conteos de notificaciones:', error);
    return {
      success: false,
      error: error.message,
      counts: { profiles: 0, contents: 0, trends: 0, memory: 0, total: 0 }
    };
  }
}

export async function clearNotifications() {
  try {
    const response = await api.post(`${MARKETING_ENDPOINT}/notifications/clear`);
    
    if (response.success) {
      currentNotifications = {
        total: 0,
        byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
        notifications: { profiles: [], contents: [], trends: [], memory: [] },
        sessionId: null
      };
      
      window.dispatchEvent(new CustomEvent('notificationsCleared'));
    }
    
    return response;
  } catch (error) {
    console.warn('Error limpiando notificaciones:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function clearSectionNotifications(section) {
  try {
    console.log(`🧹 Limpiando notificaciones de la sección: ${section}`);
    
    const response = await api.post(`${MARKETING_ENDPOINT}/notifications/clear/${section}`);
    
    if (response.success && response.updatedNotifications) {
      currentNotifications = response.updatedNotifications;
      
      window.dispatchEvent(new CustomEvent('sectionNotificationsCleared', {
        detail: {
          section: section,
          notifications: currentNotifications
        }
      }));
      
      console.log(`✅ Notificaciones de ${section} limpiadas exitosamente`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Error limpiando notificaciones de ${section}:`, error);
    return {
      success: false,
      error: error.message,
      section: section
    };
  }
}

export async function markSectionAsViewed(section, userId = null) {
  try {
    console.log(`👁️ Marcando sección ${section} como vista`);
    
    const requestBody = userId ? { userId } : {};
    const response = await api.post(`${MARKETING_ENDPOINT}/notifications/mark-viewed/${section}`, requestBody);
    
    if (response.success && response.updatedNotifications) {
      currentNotifications = response.updatedNotifications;
      
      window.dispatchEvent(new CustomEvent('sectionMarkedAsViewed', {
        detail: {
          section: section,
          notifications: currentNotifications,
          userId: userId
        }
      }));
      
      console.log(`✅ Sección ${section} marcada como vista exitosamente`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Error marcando sección ${section} como vista:`, error);
    return {
      success: false,
      error: error.message,
      section: section
    };
  }
}

export function getCurrentNotifications() {
  return currentNotifications;
}

export function hasNotifications() {
  return currentNotifications.total > 0;
}