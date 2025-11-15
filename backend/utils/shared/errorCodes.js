
/**
 * Códigos de error estandarizados para el sistema de control de acceso
 * Facilita el manejo consistente de errores en toda la aplicación
 */

export const ERROR_CODES = {
  // Errores de autenticación y autorización
  AUTH: {
    UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS'
  },

  // Errores de acceso a herramientas
  TOOL_ACCESS: {
    LIMIT_EXCEEDED: 'TOOL_LIMIT_EXCEEDED',
    DAILY_LIMIT_REACHED: 'TOOL_DAILY_LIMIT_REACHED',
    HOURLY_LIMIT_REACHED: 'TOOL_HOURLY_LIMIT_REACHED',
    UPGRADE_REQUIRED: 'TOOL_UPGRADE_REQUIRED',
    INVALID_TOOL: 'TOOL_INVALID_TOOL',
    
    // 🆕 NUEVOS: Códigos específicos por herramienta
    SPECIFIC_TOOL: {
      PDF_DAILY_LIMIT_REACHED: 'TOOL_PDF_DAILY_LIMIT_REACHED',
      PDF_HOURLY_LIMIT_REACHED: 'TOOL_PDF_HOURLY_LIMIT_REACHED',
      AGENT_DAILY_LIMIT_REACHED: 'TOOL_AGENT_DAILY_LIMIT_REACHED',
      AGENT_HOURLY_LIMIT_REACHED: 'TOOL_AGENT_HOURLY_LIMIT_REACHED',
      UNKNOWN_TOOL_LIMIT_REACHED: 'TOOL_UNKNOWN_TOOL_LIMIT_REACHED'
    }
  },

  // Errores de acceso a AVAs
  AVA_ACCESS: {
    CAREER_REQUIRED: 'AVA_CAREER_REQUIRED',
    SUBSCRIPTION_EXPIRED: 'AVA_SUBSCRIPTION_EXPIRED',
    INVALID_AVA: 'AVA_INVALID_AVA',
    CAREER_NOT_PURCHASED: 'AVA_CAREER_NOT_PURCHASED',
    ACCESS_DENIED: 'AVA_ACCESS_DENIED'
  },

  // Errores de límites de tokens
  TOKEN_LIMITS: {
    CHAT_LIMIT_EXCEEDED: 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
    WARNING_THRESHOLD: 'TOKEN_LIMITS.WARNING_THRESHOLD',
    ESTIMATED_LIMIT_EXCEEDED: 'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED',
  },

  // Errores de validación
  VALIDATION: {
    MISSING_REQUIRED_FIELDS: 'VALIDATION_MISSING_REQUIRED_FIELDS',
    INVALID_USER_ID: 'VALIDATION_INVALID_USER_ID',
    INVALID_AVA_ID: 'VALIDATION_INVALID_AVA_ID',
    INVALID_CHAT_ID: 'VALIDATION_INVALID_CHAT_ID',
    INVALID_CAREER_ID: 'VALIDATION_INVALID_CAREER_ID',
    INVALID_TOOL_SLUG: 'VALIDATION_INVALID_TOOL_SLUG' // 🆕 NUEVO
  },

  // Errores del sistema
  SYSTEM: {
    DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
    INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
    CONFIGURATION_ERROR: 'SYSTEM_CONFIGURATION_ERROR',
    TOOL_INFO_ERROR: 'SYSTEM_TOOL_INFO_ERROR' // 🆕 NUEVO
  },

  // Errores de frontend/rutas
  FRONTEND: {
    PAGE_ACCESS_DENIED: 'FRONTEND_PAGE_ACCESS_DENIED',
    ROUTE_PROTECTED: 'FRONTEND_ROUTE_PROTECTED',
    CAREER_REQUIRED_FOR_PAGE: 'FRONTEND_CAREER_REQUIRED_FOR_PAGE'
  }
};

/**
 * Mensajes de error localizados
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH.UNAUTHORIZED]: 'No tienes autorización para acceder a este recurso',
  [ERROR_CODES.AUTH.INVALID_TOKEN]: 'Token de acceso inválido',
  [ERROR_CODES.AUTH.TOKEN_EXPIRED]: 'Tu sesión ha expirado, por favor inicia sesión nuevamente',
  [ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS]: 'No tienes permisos suficientes para esta acción',

  [ERROR_CODES.TOOL_ACCESS.LIMIT_EXCEEDED]: 'Has alcanzado el límite de uso para esta herramienta',
  [ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED]: 'Has alcanzado tu límite diario de mensajes',
  [ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED]: 'Has alcanzado tu límite por hora de mensajes',
  [ERROR_CODES.TOOL_ACCESS.UPGRADE_REQUIRED]: 'Actualiza a premium para acceso ilimitado',
  [ERROR_CODES.TOOL_ACCESS.INVALID_TOOL]: 'Herramienta no válida o no disponible',

  // 🆕 NUEVOS: Mensajes específicos por herramienta
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_DAILY_LIMIT_REACHED]: 'Has alcanzado tu límite diario para la herramienta PDF',
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_HOURLY_LIMIT_REACHED]: 'Has alcanzado tu límite por hora para la herramienta PDF',
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_DAILY_LIMIT_REACHED]: 'Has alcanzado tu límite diario para la herramienta Agente',
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_HOURLY_LIMIT_REACHED]: 'Has alcanzado tu límite por hora para la herramienta Agente',
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.UNKNOWN_TOOL_LIMIT_REACHED]: 'Has alcanzado tu límite para esta herramienta',

  [ERROR_CODES.AVA_ACCESS.CAREER_REQUIRED]: 'Necesitas comprar la carrera específica para acceder a este AVA',
  [ERROR_CODES.AVA_ACCESS.SUBSCRIPTION_EXPIRED]: 'Tu suscripción ha expirado',
  [ERROR_CODES.AVA_ACCESS.INVALID_AVA]: 'AVA no válido o no disponible',
  [ERROR_CODES.AVA_ACCESS.CAREER_NOT_PURCHASED]: 'No has comprado la carrera requerida para este AVA',
  [ERROR_CODES.AVA_ACCESS.ACCESS_DENIED]: 'Acceso denegado a este AVA',

  [ERROR_CODES.TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED]: 'Has alcanzado el límite de 50,000 tokens en esta conversación',
  [ERROR_CODES.TOKEN_LIMITS.WARNING_THRESHOLD]: 'Te acercas al límite de tokens (75% alcanzado)',
  [ERROR_CODES.TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED]: 'La consulta excedería el límite de tokens estimado',

  [ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELDS]: 'Faltan campos requeridos',
  [ERROR_CODES.VALIDATION.INVALID_USER_ID]: 'ID de usuario inválido',
  [ERROR_CODES.VALIDATION.INVALID_AVA_ID]: 'ID de AVA inválido',
  [ERROR_CODES.VALIDATION.INVALID_CHAT_ID]: 'ID de chat inválido',
  [ERROR_CODES.VALIDATION.INVALID_CAREER_ID]: 'ID de carrera inválido',
  [ERROR_CODES.VALIDATION.INVALID_TOOL_SLUG]: 'Slug de herramienta inválido', // 🆕 NUEVO

  [ERROR_CODES.SYSTEM.DATABASE_ERROR]: 'Error en la base de datos',
  [ERROR_CODES.SYSTEM.SERVICE_UNAVAILABLE]: 'Servicio temporalmente no disponible',
  [ERROR_CODES.SYSTEM.INTERNAL_ERROR]: 'Error interno del servidor',
  [ERROR_CODES.SYSTEM.CONFIGURATION_ERROR]: 'Error de configuración del sistema',
  [ERROR_CODES.SYSTEM.TOOL_INFO_ERROR]: 'Error obteniendo información de herramienta', // 🆕 NUEVO

  [ERROR_CODES.FRONTEND.PAGE_ACCESS_DENIED]: 'No tienes acceso a esta página',
  [ERROR_CODES.FRONTEND.ROUTE_PROTECTED]: 'Esta ruta está protegida',
  [ERROR_CODES.FRONTEND.CAREER_REQUIRED_FOR_PAGE]: 'Necesitas comprar una carrera para acceder a esta página'
};

/**
 * Códigos de estado HTTP asociados
 */
export const ERROR_STATUS_CODES = {
  [ERROR_CODES.AUTH.UNAUTHORIZED]: 401,
  [ERROR_CODES.AUTH.INVALID_TOKEN]: 401,
  [ERROR_CODES.AUTH.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS]: 403,

  [ERROR_CODES.TOOL_ACCESS.LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.UPGRADE_REQUIRED]: 402,
  [ERROR_CODES.TOOL_ACCESS.INVALID_TOOL]: 400,

  // 🆕 NUEVOS: Códigos HTTP específicos por herramienta
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_DAILY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_HOURLY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_DAILY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_HOURLY_LIMIT_REACHED]: 429,
  [ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.UNKNOWN_TOOL_LIMIT_REACHED]: 429,

  [ERROR_CODES.AVA_ACCESS.CAREER_REQUIRED]: 402,
  [ERROR_CODES.AVA_ACCESS.SUBSCRIPTION_EXPIRED]: 402,
  [ERROR_CODES.AVA_ACCESS.INVALID_AVA]: 400,
  [ERROR_CODES.AVA_ACCESS.CAREER_NOT_PURCHASED]: 402,
  [ERROR_CODES.AVA_ACCESS.ACCESS_DENIED]: 403,

  [ERROR_CODES.TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.TOKEN_LIMITS.WARNING_THRESHOLD]: 200,
  [ERROR_CODES.TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED]: 400,

  [ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELDS]: 400,
  [ERROR_CODES.VALIDATION.INVALID_USER_ID]: 400,
  [ERROR_CODES.VALIDATION.INVALID_AVA_ID]: 400,
  [ERROR_CODES.VALIDATION.INVALID_CHAT_ID]: 400,
  [ERROR_CODES.VALIDATION.INVALID_CAREER_ID]: 400,
  [ERROR_CODES.VALIDATION.INVALID_TOOL_SLUG]: 400, // 🆕 NUEVO

  [ERROR_CODES.SYSTEM.DATABASE_ERROR]: 500,
  [ERROR_CODES.SYSTEM.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.SYSTEM.INTERNAL_ERROR]: 500,
  [ERROR_CODES.SYSTEM.CONFIGURATION_ERROR]: 500,
  [ERROR_CODES.SYSTEM.TOOL_INFO_ERROR]: 500, // 🆕 NUEVO

  [ERROR_CODES.FRONTEND.PAGE_ACCESS_DENIED]: 403,
  [ERROR_CODES.FRONTEND.ROUTE_PROTECTED]: 403,
  [ERROR_CODES.FRONTEND.CAREER_REQUIRED_FOR_PAGE]: 402
};

/**
 * 🆕 NUEVO: Helper para generar códigos de error específicos por herramienta
 */
export const getSpecificToolErrorCode = (toolSlug, limitType) => {
  const slugMap = {
    'pdf': limitType === 'daily' 
      ? ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_DAILY_LIMIT_REACHED
      : ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.PDF_HOURLY_LIMIT_REACHED,
    'agente': limitType === 'daily'
      ? ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_DAILY_LIMIT_REACHED
      : ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_HOURLY_LIMIT_REACHED,
    'agent': limitType === 'daily'
      ? ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_DAILY_LIMIT_REACHED
      : ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.AGENT_HOURLY_LIMIT_REACHED
  };

  return slugMap[toolSlug] || ERROR_CODES.TOOL_ACCESS.SPECIFIC_TOOL.UNKNOWN_TOOL_LIMIT_REACHED;
};

/**
 * Helper para crear respuestas de error estandarizadas
 * @param {string} errorCode - Código de error
 * @param {Object} additionalData - Datos adicionales del error
 * @returns {Object} Objeto de error estandarizado
 */
export const createErrorResponse = (errorCode, additionalData = {}) => {
  return {
    success: false,
    error: {
      code: errorCode,
      message: ERROR_MESSAGES[errorCode] || 'Error desconocido',
      timestamp: new Date().toISOString(),
      ...additionalData
    }
  };
};

/**
 * 🆕 NUEVO: Helper para crear respuestas de error específicas por herramienta
 */
export const createSpecificToolErrorResponse = (toolSlug, limitType, additionalData = {}) => {
  const errorCode = getSpecificToolErrorCode(toolSlug, limitType);
  
  return createErrorResponse(errorCode, {
    toolSlug,
    limitType,
    specificTool: true,
    ...additionalData
  });
};

/**
 * Helper para obtener el código de estado HTTP de un error
 * @param {string} errorCode - Código de error
 * @returns {number} Código de estado HTTP
 */
export const getErrorStatusCode = (errorCode) => {
  return ERROR_STATUS_CODES[errorCode] || 500;
};