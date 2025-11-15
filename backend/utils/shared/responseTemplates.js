
import { ERROR_CODES, createErrorResponse } from './errorCodes.js';

/**
 * Plantillas de respuesta estandarizadas para diferentes tipos de acceso
 * Mantiene consistencia en las respuestas de la API
 */

/**
 * Respuestas exitosas para herramientas
 */
export const toolAccessSuccess = (data, usageInfo = {}) => ({
  success: true,
  type: 'tool_access_granted',
  data,
  usage: {
    remainingMessages: usageInfo.remainingMessages || null,
    resetTime: usageInfo.resetTime || null,
    isPremium: usageInfo.isPremium || false,
    ...usageInfo
  },
  timestamp: new Date().toISOString()
});

/**
 * Respuestas de límite alcanzado para herramientas (GENERAL)
 */
export const toolLimitReached = (limitType, resetTime = null, upgradeMessage = null) => {
  const baseResponse = createErrorResponse(
    limitType === 'daily' 
      ? ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED 
      : ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED,
    {
      limitType,
      resetTime,
      upgradeMessage: upgradeMessage || 'Actualiza a premium para acceso ilimitado',
      upgradeAction: {
        type: 'upgrade_required',
        url: '/tienda',
        buttonText: 'Actualizar a Premium'
      }
    }
  );
  
  return baseResponse;
};


export const specificToolLimitReached = (toolSlug, limitType, resetTime = null, limits = {}, toolLimits = null) => {
  const toolFriendlyNames = {
    'pdf': 'PDF',
    'agente': 'Agente', 
    'agent': 'Agente'
  };

  const toolName = toolFriendlyNames[toolSlug] || toolSlug.toUpperCase();
  const limitInfo = limits[limitType] || {};
  
  const specificLimits = toolLimits?.[limitType] || limitInfo;
  const used = specificLimits.used || 0;
  const limit = specificLimits.limit || 10;
  const remaining = specificLimits.remaining || 0;
  const resetTimeToUse = specificLimits.resetTime || resetTime;
  
  const baseResponse = createErrorResponse(
    limitType === 'daily' 
      ? ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED 
      : ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED,
    {
      toolSlug,
      toolName,
      limitType,
      resetTime: resetTimeToUse,
      
      specificLimits: {
        used: used,
        limit: limit,
        remaining: remaining,
        resetTime: resetTimeToUse,
        source: toolLimits?.source || 'backend_direct'
      },
      
      toolLimits: toolLimits || {
        toolSlug,
        type: 'free_user_limits',
        [limitType]: specificLimits,
        source: 'response_template'
      },
      
      message: `Has alcanzado tu límite ${limitType === 'daily' ? 'diario' : 'por hora'} para la herramienta ${toolName} (${used}/${limit} mensajes)`,
      upgradeMessage: `Actualiza a premium para acceso ilimitado a ${toolName}`,
      upgradeAction: {
        type: 'upgrade_required',
        url: '/tienda',
        buttonText: 'Actualizar a Premium',
        specificTool: toolName
      }
    }
  );
  
  return baseResponse;
};

export const specificToolAccessSuccess = (toolSlug, data, usageInfo = {}) => {
  const toolFriendlyNames = {
    'pdf': 'PDF',
    'agente': 'Agente',
    'agent': 'Agente'
  };

  const toolName = toolFriendlyNames[toolSlug] || toolSlug.toUpperCase();

  return {
    success: true,
    type: 'specific_tool_access_granted',
    toolSlug,
    toolName,
    data,
    usage: {
      toolSpecific: {
        dailyUsed: usageInfo.dailyUsed || 0,
        dailyLimit: usageInfo.dailyLimit || 0,
        dailyRemaining: usageInfo.dailyRemaining || 0,
        hourlyUsed: usageInfo.hourlyUsed || 0,
        hourlyLimit: usageInfo.hourlyLimit || 0,
        hourlyRemaining: usageInfo.hourlyRemaining || 0,
        resetTimes: {
          daily: usageInfo.dailyResetTime || null,
          hourly: usageInfo.hourlyResetTime || null
        }
      },
      isPremium: usageInfo.isPremium || false,
      isAdmin: usageInfo.isAdmin || false,
      ...usageInfo
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Respuestas de acceso denegado a AVAs
 */
export const avaAccessDenied = (avaId, careerInfo = {}) => {
  return createErrorResponse(ERROR_CODES.AVA_ACCESS.CAREER_REQUIRED, {
    avaId,
    requiredCareer: careerInfo,
    purchaseAction: {
      type: 'career_purchase_required',
      url: '/tienda',
      buttonText: 'Comprar Carrera',
      careerName: careerInfo.nombre || 'Carrera requerida'
    }
  });
};

/**
 * Respuestas exitosas para AVAs
 */
export const avaAccessSuccess = (data, careerInfo = {}) => ({
  success: true,
  type: 'ava_access_granted',
  data,
  career: careerInfo,
  timestamp: new Date().toISOString()
});

/**
 * Respuestas de límite de tokens
 */
export const tokenLimitResponse = (currentTokens, maxTokens, warningLevel = 'normal') => {
  const percentage = (currentTokens / maxTokens) * 100;
  
  if (percentage >= 100) {
    return createErrorResponse(ERROR_CODES.TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED, {
      currentTokens,
      maxTokens,
      percentage: 100,
      action: {
        type: 'new_chat_required',
        message: 'Inicia una nueva conversación para continuar',
        buttonText: 'Nueva Conversación'
      }
    });
  }
  
  if (percentage >= 80) {
    return {
      success: true,
      warning: {
        type: 'token_limit_warning',
        code: ERROR_CODES.TOKEN_LIMITS.WARNING_THRESHOLD,
        message: `Te acercas al límite de tokens (${currentTokens}/${maxTokens})`,
        currentTokens,
        maxTokens,
        percentage: Math.round(percentage),
        remainingTokens: maxTokens - currentTokens
      }
    };
  }
  
  return {
    success: true,
    tokenInfo: {
      currentTokens,
      maxTokens,
      percentage: Math.round(percentage),
      remainingTokens: maxTokens - currentTokens
    }
  };
};

/**
 * Respuestas de estado de acceso del usuario
 */
export const userAccessStatus = (userId, accessData) => ({
  success: true,
  userId,
  accessStatus: {
    isPremium: accessData.isPremium || false,
    isAdmin: accessData.isAdmin || false,
    activeSubscriptions: accessData.subscriptions || [],
    accessibleAvas: accessData.avas || [],
    toolLimits: {
      daily: accessData.dailyLimits || {},
      hourly: accessData.hourlyLimits || {},
      specificTools: accessData.toolLimits || {}
    },
    features: {
      unlimitedTools: accessData.isPremium || accessData.isAdmin || false,
      avaAccess: (accessData.avas || []).length > 0,
      premiumSupport: accessData.isPremium || accessData.isAdmin || false,
      adminPrivileges: accessData.isAdmin || false
    }
  },
  timestamp: new Date().toISOString()
});

export const usageStats = (userId, stats) => ({
  success: true,
  userId,
  stats: {
    today: {
      messagesUsed: stats.todayMessages || 0,
      tokensUsed: stats.todayTokens || 0,
      toolsUsed: stats.todayTools || [],
      specificToolUsage: stats.specificToolUsage || {}
    },
    thisHour: {
      messagesUsed: stats.hourMessages || 0,
      tokensUsed: stats.hourTokens || 0,
      specificToolUsage: stats.hourlySpecificToolUsage || {}
    },
    total: {
      messagesUsed: stats.totalMessages || 0,
      tokensUsed: stats.totalTokens || 0,
      chatsCreated: stats.totalChats || 0
    },
    limits: {
      // Límites generales (para compatibilidad)
      dailyMessageLimit: stats.dailyLimit || (stats.isPremium || stats.isAdmin ? 1000 : 15),
      hourlyMessageLimit: stats.hourlyLimit || (stats.isPremium || stats.isAdmin ? 100 : 15),
      tokenLimitPerChat: stats.isAdmin ? 'unlimited' : 50000,
      specificToolLimits: stats.toolLimits || {},
      isAdmin: stats.isAdmin || false,
      isPremium: stats.isPremium || false
    }
  },
  timestamp: new Date().toISOString()
});

/**
 * Respuestas para páginas protegidas del frontend
 */
export const frontendAccessDenied = (page, reason = 'career_required') => {
  const reasonMap = {
    'career_required': {
      code: ERROR_CODES.FRONTEND.CAREER_REQUIRED_FOR_PAGE,
      action: {
        type: 'career_purchase',
        url: '/tienda',
        buttonText: 'Comprar Carrera'
      }
    },
    'premium_required': {
      code: ERROR_CODES.TOOL_ACCESS.UPGRADE_REQUIRED,
      action: {
        type: 'premium_upgrade',
        url: '/tienda',
        buttonText: 'Actualizar a Premium'
      }
    },
    'auth_required': {
      code: ERROR_CODES.AUTH.UNAUTHORIZED,
      action: {
        type: 'login_required',
        url: '/login',
        buttonText: 'Iniciar Sesión'
      }
    }
  };
  
  const reasonData = reasonMap[reason] || reasonMap['auth_required'];
  
  return createErrorResponse(reasonData.code, {
    page,
    reason,
    action: reasonData.action
  });
};

export const formatLimitResponse = (limitInfo, isPremium = false, isAdmin = false, toolSpecificLimits = {}) => {
  if (isAdmin) {
    return {
      success: true,
      limits: {
        type: 'admin_unlimited',
        message: 'Acceso administrativo ilimitado',
        isPremium: true,
        isAdmin: true,
        specificTools: 'unlimited'
      }
    };
  }

  if (isPremium) {
    return {
      success: true,
      limits: {
        type: 'unlimited',
        message: 'Acceso ilimitado con premium',
        isPremium: true,
        isAdmin: false,
        specificTools: Object.keys(toolSpecificLimits).reduce((acc, toolSlug) => {
          acc[toolSlug] = { daily: 'unlimited', hourly: 'unlimited' };
          return acc;
        }, {})
      }
    };
  }
  
  return {
    success: limitInfo.canProceed,
    limits: {
      type: 'free',
      // Límites generales (para compatibilidad)
      daily: {
        used: limitInfo.dailyUsed || 0,
        limit: limitInfo.dailyLimit || 15,
        remaining: Math.max(0, (limitInfo.dailyLimit || 15) - (limitInfo.dailyUsed || 0)),
        resetTime: limitInfo.dailyResetTime
      },
      hourly: {
        used: limitInfo.hourlyUsed || 0,
        limit: limitInfo.hourlyLimit || 15,
        remaining: Math.max(0, (limitInfo.hourlyLimit || 15) - (limitInfo.hourlyUsed || 0)),
        resetTime: limitInfo.hourlyResetTime
      },
      specificTools: toolSpecificLimits,
      nextUpgrade: {
        benefits: [
          'Acceso ilimitado a todas las herramientas',
          'Sin límites de mensajes por día',
          'Sin límites específicos por herramienta',
          'Soporte prioritario'
        ],
        url: '/tienda'
      }
    }
  };
};

/**
 * Helper para crear respuestas con información de upgrade
 */
export const withUpgradeInfo = (response, upgradeType = 'premium') => {
  const upgradeInfo = {
    premium: {
      title: 'Actualiza a Premium',
      benefits: [
        'Acceso ilimitado a todas las herramientas',
        'Sin límites de mensajes',
        'Sin límites específicos por herramienta',
        'Soporte prioritario'
      ],
      url: '/tienda',
      buttonText: 'Actualizar Ahora'
    },
    career: {
      title: 'Compra la Carrera',
      benefits: [
        'Acceso completo a AVAs especializados',
        'Contenido académico exclusivo',
        'Soporte especializado'
      ],
      url: '/tienda',
      buttonText: 'Comprar Carrera'
    }
  };
  
  return {
    ...response,
    upgradeInfo: upgradeInfo[upgradeType] || upgradeInfo.premium
  };
};

export const preValidationFailed = (tokenInfo, suggestion = null) => {
  return createErrorResponse(ERROR_CODES.TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED, {
    currentTokens: tokenInfo.current,
    estimatedTokens: tokenInfo.estimated,
    projectedTokens: tokenInfo.projected,
    maxTokens: tokenInfo.max,
    suggestion: suggestion || "Haz una pregunta más específica o inicia un nuevo chat",
    action: {
      type: 'new_chat_required',
      message: 'La respuesta estimada excedería el límite de tokens',
      buttonText: 'Nuevo Chat'
    }
  });
};

export const truncatedResponse = (originalResponse, truncationInfo, tokenInfo) => ({
  success: true,
  type: 'truncated_response',
  answer: originalResponse,
  truncationInfo: {
    wasTruncated: true,
    originalLength: truncationInfo.originalLength,
    truncatedLength: truncationInfo.truncatedLength,
    reason: truncationInfo.reason,
    message: 'Respuesta truncada por límite de tokens'
  },
  tokenInfo: {
    current: tokenInfo.final,
    max: tokenInfo.max,
    percentage: Math.round((tokenInfo.final / tokenInfo.max) * 100),
    remaining: tokenInfo.remaining
  },
  warning: {
    type: 'token_limit_reached',
    message: 'Límite de tokens alcanzado en este chat',
    action: {
      type: 'new_chat_recommended',
      message: 'Inicia un nuevo chat para continuar la conversación',
      buttonText: 'Nuevo Chat'
    }
  },
  _hasTruncationWarning: true, // Flag para el frontend
  timestamp: new Date().toISOString()
});

export const preValidationWarning = (tokenInfo) => ({
  success: true,
  warning: {
    type: 'token_pre_validation_warning',
    message: 'La respuesta podría acercarse al límite de tokens',
    level: 'medium',
    tokenInfo: {
      current: tokenInfo.current,
      estimated: tokenInfo.estimated,
      projected: tokenInfo.projected,
      max: tokenInfo.max,
      safeLimit: tokenInfo.safeLimit
    }
  },
  _hasPreWarning: true // Flag para el frontend
});