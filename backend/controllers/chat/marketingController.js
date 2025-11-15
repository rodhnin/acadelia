// marketingController.js - IMPLEMENTACIÓN COMPLETA CON LIMPIEZA POR SECCIÓN
import { marketingService } from "../../services/chat/marketingService.js";
import { sanitizeMarketingContent, sanitizationMiddleware } from '../../utils/jsonSanitizer.js';
import { notificationTracker } from '../../utils/marketing/notificationTracker.js';
import { 
  validateMarketingParams, 
  validateProfileData, 
  validateContentData, 
  validateTrendData 
} from "../../utils/marketing/validators.js";

// Controlador para chat de marketing con IA
export const queryMarketing = async (req, res) => {
  try {
    if (req.body && typeof req.body === 'object') {
      const sanitizationResult = sanitizeMarketingContent(req.body);
      if (sanitizationResult.success) {
        req.body = sanitizationResult.data;
        if (sanitizationResult.warnings.length > 0) {
          console.warn("⚠️ Advertencias en sanitización de request:", sanitizationResult.warnings);
        }
      }
    }
    
    const { userId, query, chatHistory, explain = false, explainLevel = 'intermediate' } = req.body;
    
    const validationErrors = validateMarketingParams(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }
    
    const options = {
      explain,
      explainLevel
    };
    
    const result = await marketingService.processMarketingQuery(query, chatHistory || [], options);
    
    // NUEVO: Obtener notificaciones de la sesión
    const notifications = await marketingService.getCurrentNotifications();
    
    const sanitizedResponse = {
      success: true,
      response: result.response,
      agentsUsed: result.agentsUsed,
      agentSelection: result.agentSelection,
      explanation: result.explanation,
      // NUEVO: Incluir notificaciones
      notifications: notifications,
      hasNewContent: notifications.total > 0,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📱 Respuesta incluye ${notifications.total} notificaciones`);
    
    const finalSanitization = sanitizeMarketingContent(sanitizedResponse);
    
    if (finalSanitization.success) {
      res.json(finalSanitization.data);
    } else {
      // Si hay error en la sanitización final, enviar respuesta básica pero con notificaciones
      res.json({
        success: true,
        response: "Respuesta procesada con sanitización de emergencia",
        error_info: finalSanitization.error,
        notifications: notifications,
        hasNewContent: notifications.total > 0,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("Error en queryMarketing:", error);
    
    // Incluir notificaciones parciales incluso en caso de error
    let notifications = { total: 0, byType: {}, notifications: {}, sessionId: null };
    try {
      notifications = await marketingService.getCurrentNotifications();
    } catch (notifError) {
      console.warn("No se pudieron obtener notificaciones:", notifError);
    }
    
    res.status(500).json({
      success: false,
      error: "Error en el procesamiento",
      details: error.message,
      notifications: notifications,
      hasNewContent: notifications.total > 0
    });
  }
};

export const queryMarketingStream = async (req, res) => {
  try {
    const { userId, query, chatHistory, explain = false, explainLevel = 'intermediate' } = req.body;
    
    const validationErrors = validateMarketingParams(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    
    const sendChunk = (text) => {
      res.write(text);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };
    
    // Incluir opción de explicabilidad en la solicitud
    const options = {
      streamEnabled: true,
      onPartialResponse: (chunk) => {
        sendChunk(chunk);
      },
      explain,
      explainLevel
    };
    
    const result = await marketingService.processMarketingQuery(query, chatHistory || [], options);
    
    // NUEVO: Enviar notificaciones al cliente
    const notifications = await marketingService.getCurrentNotifications();
    
    if (notifications.total > 0) {
      const notificationMetadata = {
        notifications: notifications,
        hasNewContent: true
      };
      
      const notificationChunk = `**NOTIFICATIONS_START**${JSON.stringify(notificationMetadata)}**NOTIFICATIONS_END**`;
      console.log('📤 Enviando notificaciones vía streaming:', notifications.total);
      sendChunk(notificationChunk);
    }
    
    if (result && (result.agentsUsed || result.agentSelection || result.explanation)) {
      const metadata = {
        agentsUsed: result.agentsUsed,
        agentSelection: result.agentSelection,
        explanation: result.explanation
      };
      
      const metadataChunk = `**METADATA_START**${JSON.stringify(metadata)}**METADATA_END**`;
      sendChunk(metadataChunk);
    }
    
    res.end();
  } catch (error) {
    console.error("Error en queryMarketingStream:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Error en el procesamiento del stream",
        details: error.message,
      });
    } else {
      try {
        res.write(`\n\nError: ${error.message}`);
        res.end();
      } catch (e) {
        console.error("No se pudo enviar mensaje de error en stream:", e);
      }
    }
  }
};

// NUEVO: Controlador para obtener notificaciones actuales
export const getNotifications = async (req, res) => {
  try {
    const notifications = await marketingService.getCurrentNotifications();
    
    res.json({
      success: true,
      notifications: notifications,
      hasNewContent: notifications.total > 0
    });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo notificaciones",
      details: error.message
    });
  }
};

// NUEVO: Controlador para obtener conteo de notificaciones
export const getNotificationCounts = async (req, res) => {
  try {
    const counts = await marketingService.getNotificationCounts();
    
    res.json({
      success: true,
      counts: counts
    });
  } catch (error) {
    console.error("Error obteniendo conteos de notificaciones:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo conteos",
      details: error.message
    });
  }
};

// NUEVO: Controlador para limpiar notificaciones (marcar como leídas)
export const clearNotifications = async (req, res) => {
  try {
    notificationTracker.reset();
    
    res.json({
      success: true,
      message: "Notificaciones marcadas como leídas"
    });
  } catch (error) {
    console.error("Error limpiando notificaciones:", error);
    res.status(500).json({
      success: false,
      error: "Error limpiando notificaciones",
      details: error.message
    });
  }
};

// 🆕 NUEVO: Controlador para limpiar notificaciones por sección específica
export const clearSectionNotifications = async (req, res) => {
  try {
    const { section } = req.params;
    
    const validSections = ['profiles', 'contents', 'trends', 'memory', 'information'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: `Sección inválida. Debe ser una de: ${validSections.join(', ')}`
      });
    }
    
    console.log(`🧹 Limpiando notificaciones de la sección: ${section}`);
    
    const sectionMapping = {
      'information': 'all', // Information muestra todas, así que limpia todas
      'profiles': 'profiles',
      'contents': 'contents', // Note: plural en el backend
      'content': 'contents',  // Alias para compatibilidad
      'trends': 'trends',
      'memory': 'memory'
    };
    
    const notificationType = sectionMapping[section];
    
    if (notificationType === 'all') {
      // Si es 'information', limpiar todas las notificaciones
      notificationTracker.reset();
      console.log('🧹 Todas las notificaciones limpiadas (sección information)');
    } else {
      const result = await marketingService.clearSectionNotifications(notificationType);
      console.log(`🧹 Notificaciones de ${notificationType} limpiadas:`, result);
    }
    
    const updatedNotifications = await marketingService.getCurrentNotifications();
    
    res.json({
      success: true,
      message: `Notificaciones de ${section} marcadas como leídas`,
      section: section,
      notificationType: notificationType,
      updatedNotifications: updatedNotifications
    });
    
  } catch (error) {
    console.error("Error limpiando notificaciones por sección:", error);
    res.status(500).json({
      success: false,
      error: "Error limpiando notificaciones por sección",
      details: error.message,
      section: req.params.section
    });
  }
};

// 🆕 NUEVO: Controlador para marcar sección como vista (alternativo más específico)
export const markSectionAsViewed = async (req, res) => {
  try {
    const { section } = req.params;
    const { userId } = req.body; // Opcional: para trackear por usuario específico
    
    const validSections = ['profiles', 'contents', 'trends', 'memory'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: `Sección inválida. Debe ser una de: ${validSections.join(', ')}`
      });
    }
    
    console.log(`👁️ Marcando sección ${section} como vista${userId ? ` para usuario ${userId}` : ''}`);
    
    const result = await marketingService.markSectionAsViewed(section, userId);
    
    const updatedNotifications = await marketingService.getCurrentNotifications();
    
    res.json({
      success: true,
      message: `Sección ${section} marcada como vista`,
      section: section,
      userId: userId,
      result: result,
      updatedNotifications: updatedNotifications
    });
    
  } catch (error) {
    console.error("Error marcando sección como vista:", error);
    res.status(500).json({
      success: false,
      error: "Error marcando sección como vista",
      details: error.message,
      section: req.params.section
    });
  }
};

// Controlador para explicaciones de consultas
export const explainQueryController = async (req, res) => {
  try {
    const { query, level = 'intermediate' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "La consulta es requerida"
      });
    }
    
    const explainService = await import('../../services/chat/marketing/explainService.js');
    
    // En un sistema real, buscarías esta información en la base de datos
    const decisionContext = {
      query,
      agentsUsed: ["strategist"],  // Por defecto, usar al menos el estratega
      decisions: {},
      savedElements: {
        profiles: [],
        contents: [],
        trends: [],
        insights: []
      },
      recommendations: "Esta es una explicación generada bajo demanda sin contexto previo."
    };
    
    const explanation = await explainService.explainService.generateExplanation(decisionContext, level);
    
    res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error("Error generando explicación:", error);
    res.status(500).json({
      success: false,
      error: "Error generando explicación",
      details: error.message
    });
  }
};

// Controlador para visualización de decisiones
export const visualizeDecisionController = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "La consulta es requerida"
      });
    }
    
    const explainService = await import('../../services/chat/marketing/explainService.js');
    
    // En un sistema real, buscarías esta información en la base de datos
    const decisionContext = {
      query,
      agentsUsed: ["strategist"],
      decisions: {},
      savedElements: {
        profiles: [],
        contents: [],
        trends: [],
        insights: []
      }
    };
    
    const visualization = await explainService.explainService.generateDecisionVisualization(decisionContext);
    
    res.json({
      success: true,
      visualization
    });
  } catch (error) {
    console.error("Error generando visualización:", error);
    res.status(500).json({
      success: false,
      error: "Error generando visualización",
      details: error.message
    });
  }
};

// Controlador para perfiles de marketing
export const profileController = {
  async createProfile(req, res) {
    try {
      const validationErrors = validateProfileData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: validationErrors
        });
      }
      
      const result = await marketingService.createProfile(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creando perfil:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async getProfiles(req, res) {
    try {
      const result = await marketingService.getProfiles(req.query);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error obteniendo perfiles:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async updateProfile(req, res) {
    try {
      const { id } = req.params;
      
      const validationErrors = validateProfileData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: validationErrors
        });
      }
      
      const result = await marketingService.updateProfile(id, req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },

  async deleteProfile(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID de perfil es requerido"
        });
      }
      
      console.log('🗑️ Eliminando perfil con ID:', id);
      
      const result = await marketingService.deleteProfile(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando perfil:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async deleteAllProfiles(req, res) {
    try {
      console.log('🗑️ Eliminando todos los perfiles');
      
      const result = await marketingService.deleteAllProfiles();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando todos los perfiles:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para contenidos de marketing
export const contentController = {
  async createContent(req, res) {
    try {
      const validationErrors = validateContentData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: validationErrors
        });
      }
      
      const result = await marketingService.createContent(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creando contenido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async getContents(req, res) {
    try {
      const result = await marketingService.getContents(req.query);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error obteniendo contenidos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
async generateContent(req, res) {
    try {
      const result = await marketingService.generateContent(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error generando contenido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },

  async deleteContent(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID de contenido es requerido"
        });
      }
      
      console.log('🗑️ Eliminando contenido con ID:', id);
      
      const result = await marketingService.deleteContent(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando contenido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async deleteAllContents(req, res) {
    try {
      console.log('🗑️ Eliminando todos los contenidos');
      
      const result = await marketingService.deleteAllContents();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando todos los contenidos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para matching
export const matchingController = {
  async matchProfileToContent(req, res) {
    try {
      const { profileId } = req.params;
      const { contentType, limit } = req.query;
      
      const result = await marketingService.matchProfileToContent(
        profileId,
        contentType || null,
        limit ? parseInt(limit) : 5
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error en match de perfil a contenido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async matchContentToProfiles(req, res) {
    try {
      const { contentId } = req.params;
      const { limit } = req.query;
      
      const result = await marketingService.matchContentToProfiles(
        contentId,
        limit ? parseInt(limit) : 5
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error en match de contenido a perfiles:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async recordInteraction(req, res) {
    try {
      const { profileId, contentId, channel, action } = req.body;
      
      const result = await marketingService.recordInteraction(
        profileId,
        contentId,
        channel,
        action
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error registrando interacción:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para simulación
export const simulationController = {
  async simulateCampaign(req, res) {
    try {
      const { campaignData, audienceData } = req.body;
      
      const result = await marketingService.simulateCampaign(
        campaignData,
        audienceData
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error en simulación de campaña:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para tendencias CON NUEVAS FUNCIONES DE ELIMINACIÓN
export const trendController = {
  async saveTrend(req, res) {
    try {
      const validationErrors = validateTrendData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: validationErrors
        });
      }
      
      const result = await marketingService.saveTrend(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error guardando tendencia:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async getTrends(req, res) {
    try {
      const result = await marketingService.getTrends();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error obteniendo tendencias:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async deleteTrend(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID de tendencia es requerido"
        });
      }
      
      console.log('🗑️ Eliminando tendencia con ID:', id);
      
      const result = await marketingService.deleteTrend(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando tendencia:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  },
  
  async deleteAllTrends(req, res) {
    try {
      console.log('🗑️ Eliminando todas las tendencias');
      
      const result = await marketingService.deleteAllTrends();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error eliminando todas las tendencias:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para resumen
export const summaryController = {
  async getMarketingSummary(req, res) {
    try {
      const result = await marketingService.generateMarketingSummary();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error generando resumen:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }
};

// Controlador para gestión de memoria
export const memoryController = {
  async getMemoryInsights(req, res) {
    try {
      const { type, source, limit = 1000, offset = 0 } = req.query;
      
      const result = await marketingService.getMemoryInsights({
        type,
        source,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo insights de memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  async getMemoryInsight(req, res) {
    try {
      const { id } = req.params;
      
      const result = await marketingService.getMemoryInsight(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo insight de memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  async updateMemoryInsight(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!updateData.insight && !updateData.importance && !updateData.type && !updateData.source) {
        return res.status(400).json({
          success: false,
          error: 'Al menos un campo debe ser proporcionado para actualizar'
        });
      }
      
      const result = await marketingService.updateMemoryInsight(id, updateData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error actualizando insight de memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  async deleteMemoryInsight(req, res) {
    try {
      const { id } = req.params;
      
      const result = await marketingService.deleteMemoryInsight(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error eliminando insight de memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  // Reiniciar toda la memoria
  async resetAllMemory(req, res) {
    try {
      const result = await marketingService.resetAllMemory();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error reiniciando memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  async getMemoryStats(req, res) {
    try {
      const result = await marketingService.getMemoryStats();
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo estadísticas de memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },
  
  async searchMemory(req, res) {
    try {
      const { query, type, limit = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query de búsqueda es requerido'
        });
      }
      
      const result = await marketingService.searchMemoryBySimilarity(query, type, parseInt(limit));
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error buscando en memoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
};