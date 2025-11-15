
import { AccessValidationService } from "../services/shared/accessValidationService.js";
import { ERROR_CODES, getErrorStatusCode } from "../utils/shared/errorCodes.js";
import { 
  toolLimitReached, 
  specificToolLimitReached,
  avaAccessDenied, 
  tokenLimitResponse,
  withUpgradeInfo,
  preValidationFailed 
} from "../utils/shared/responseTemplates.js";
import { logSecurityEvent } from '../utils/securityLogger.js';
import logger from '../utils/logger.js';


export const verifyToolAccess = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const userFromAuth = req.user?.id_user;

    if (!userId || (userFromAuth && userId !== userFromAuth)) {
      logSecurityEvent('TOOL_ACCESS_USER_MISMATCH', 'Intento de acceso con userId diferente al autenticado', {
        requestedUserId: userId,
        authenticatedUserId: userFromAuth,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'high');

      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
          message: 'No tienes permisos para realizar esta acción'
        }
      });
    }

    const userStatus = await AccessValidationService.getUserStatus(userId);
    
    if (userStatus.isAdmin) {
      logSecurityEvent('TOOL_ACCESS_ADMIN_GRANTED', 'Acceso administrativo concedido a herramienta', {
        userId: userId,
        isAdmin: true,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'info');

      logger.debug('Usuario es ADMIN - Acceso ilimitado concedido (BYPASS)', { userId });

      req.accessInfo = {
        isPremium: true,
        isAdmin: true,
        toolAccess: {
          success: true,
          canProceed: true,
          type: 'admin_unlimited',
          limits: {
            daily: { unlimited: true },
            hourly: { unlimited: true }
          }
        },
        userId
      };

      return next();
    }

    logger.debug('Usuario regular - Validando límites', { 
      userId, 
      isPremium: userStatus.isPremium 
    });
    
    const validation = await AccessValidationService.validateToolAccess(userId, userStatus.isPremium);

    if (!validation.canProceed) {
      logSecurityEvent('TOOL_ACCESS_DENIED', 'Acceso denegado a herramienta por límite', {
        userId: userId,
        isPremium: userStatus.isPremium,
        isAdmin: false,
        errorCode: validation.errorCode,
        limits: validation.limits,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'low');

      const statusCode = getErrorStatusCode(validation.errorCode);
      
      const limitType = validation.limits?.daily?.exceeded ? 'daily' : 'hourly';
      const resetTime = validation.limits?.[limitType]?.resetTime;
      
      const response = withUpgradeInfo(
        toolLimitReached(limitType, resetTime),
        'premium'
      );

      return res.status(statusCode).json(response);
    }

    logSecurityEvent('TOOL_ACCESS_GRANTED', 'Acceso concedido a herramienta', {
      userId: userId,
      isPremium: userStatus.isPremium,
      isAdmin: false,
      accessType: validation.type,
      ip: req.ip,
      endpoint: req.originalUrl
    }, 'info');

    req.accessInfo = {
      isPremium: userStatus.isPremium,
      isAdmin: false,
      toolAccess: validation,
      userId
    };

    next();

  } catch (error) {
    logSecurityEvent('TOOL_ACCESS_ERROR', 'Error verificando acceso a herramienta', {
      userId: req.body.userId,
      error: error.message,
      ip: req.ip,
      endpoint: req.originalUrl
    }, 'medium');

    logger.error('Error in verifyToolAccess', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        message: 'Error interno verificando acceso'
      }
    });
  }
};

export const verifyAvaAccess = async (req, res, next) => {
  try {
    const { userId, avaId } = req.body;
    const userFromAuth = req.user?.id_user;

    if (!userId || (userFromAuth && userId !== userFromAuth)) {
      logSecurityEvent('AVA_ACCESS_USER_MISMATCH', 'Intento de acceso a AVA con userId diferente al autenticado', {
        requestedUserId: userId,
        authenticatedUserId: userFromAuth,
        avaId: avaId,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'high');

      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
          message: 'No tienes permisos para realizar esta acción'
        }
      });
    }

    if (!avaId || !Number.isInteger(avaId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION.INVALID_AVA_ID,
          message: 'ID de AVA inválido'
        }
      });
    }

    const userStatus = await AccessValidationService.getUserStatus(userId);
    
    if (userStatus.isAdmin) {
      logSecurityEvent('AVA_ACCESS_ADMIN_GRANTED', 'Acceso administrativo concedido a AVA', {
        userId: userId,
        avaId: avaId,
        isAdmin: true,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'info');

      logger.debug('Usuario es ADMIN - Acceso completo a AVA concedido (BYPASS)', { 
        userId, 
        avaId 
      });

      req.accessInfo = {
        isAdmin: true,
        avaAccess: {
          success: true,
          canProceed: true,
          accessType: 'admin_unlimited'
        },
        userId,
        avaId
      };

      setImmediate(async () => {
        try {
          const validation = await AccessValidationService.validateAvaAccess(userId, avaId);
          // Info disponible para logs posteriores si es necesario
        } catch (error) {
          logger.warn('Error obteniendo info del AVA para admin (background)', { 
            avaId, 
            error: error.message 
          });
        }
      });

      return next();
    }

    const validation = await AccessValidationService.validateAvaAccess(userId, avaId);

    if (!validation.canProceed) {
      logSecurityEvent('AVA_ACCESS_DENIED', 'Acceso denegado a AVA', {
        userId: userId,
        avaId: avaId,
        isAdmin: false,
        errorCode: validation.errorCode,
        careerRequired: validation.careerInfo?.nombre,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'medium');

      const statusCode = getErrorStatusCode(validation.errorCode);
      
      const response = withUpgradeInfo(
        avaAccessDenied(avaId, validation.careerInfo),
        'career'
      );

      return res.status(statusCode).json(response);
    }

    logSecurityEvent('AVA_ACCESS_GRANTED', 'Acceso concedido a AVA', {
      userId: userId,
      avaId: avaId,
      isAdmin: false,
      avaName: validation.avaInfo?.nom_ava,
      careerName: validation.careerInfo?.nombre,
      ip: req.ip,
      endpoint: req.originalUrl
    }, 'info');

    req.accessInfo = {
      isAdmin: false,
      avaAccess: validation,
      userId,
      avaId
    };

    next();

  } catch (error) {
    logSecurityEvent('AVA_ACCESS_ERROR', 'Error verificando acceso a AVA', {
      userId: req.body.userId,
      avaId: req.body.avaId,
      error: error.message,
      ip: req.ip,
      endpoint: req.originalUrl
    }, 'high');

    logger.error('Error in verifyAvaAccess', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        message: 'Error interno verificando acceso al AVA'
      }
    });
  }
};

export const checkTokenLimitsUnified = async (req, res, next) => {
  try {
    const { chatId, query, content } = req.body;
    
    let userId = req.body.userId || req.user?.id_user || req.user?.id || null;
    
    logger.debug('Validación ultrarrápida de tokens iniciada', { chatId, userId });

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION.INVALID_CHAT_ID,
          message: 'ID de chat requerido'
        }
      });
    }

    if (userId) {
      const userStatus = await AccessValidationService.getUserStatus(userId);
      
      if (userStatus.isAdmin) {
        logSecurityEvent('TOKEN_LIMIT_ADMIN_EXEMPTION', 'Admin exento de límites de tokens', {
          userId: userId,
          chatId: chatId,
          isAdmin: true,
          ip: req.ip,
          endpoint: req.originalUrl
        }, 'info');

        logger.debug('Usuario es ADMIN - Sin límites de tokens (ULTRARRÁPIDO)', { userId });

        req.tokenInfo = {
          current: 0,
          max: 'unlimited',
          percentage: 0,
          remaining: 'unlimited',
          warningLevel: 'none',
          messageCount: 0,
          isAdmin: true,
          method: 'admin_unlimited_bypass'
        };
        req.tokenWarning = null;
        req.preValidationInfo = null;

        return next();
      }
    }

    logger.debug('Ejecutando validación optimizada para usuarios regulares', { userId });

    const validationPromises = [];
    
    validationPromises.push(
      AccessValidationService.validateTokenLimits(chatId, userId)
        .then(result => ({ type: 'current', result }))
    );

    const textToValidate = query || (content && Array.isArray(content) ? 
      content.filter(item => item && item.type === 'text')
             .map(item => item.text)
             .join('\n\n') : '');

    if (textToValidate && textToValidate.trim()) {
      const responseType = content && Array.isArray(content) ? 'multimodal' : 'normal';
      validationPromises.push(
        AccessValidationService.validateTokensWithResponseEstimate(
          chatId, userId, textToValidate, responseType
        ).then(result => ({ type: 'prevalidation', result }))
      );
    }

    const validationResults = await Promise.all(validationPromises);
    
    let currentValidation = null;
    let preValidation = null;
    
    for (const validation of validationResults) {
      if (validation.type === 'current') {
        currentValidation = validation.result;
      } else if (validation.type === 'prevalidation') {
        preValidation = validation.result;
      }
    }

    if (!currentValidation.canProceed) {
      logSecurityEvent('TOKEN_LIMIT_EXCEEDED', 'Límite de tokens excedido en chat', {
        userId: userId,
        chatId: chatId,
        isAdmin: false,
        tokenInfo: currentValidation.tokenInfo,
        method: currentValidation.tokenInfo?.method,
        exactCalculation: true,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'medium');

      const statusCode = getErrorStatusCode(currentValidation.errorCode);
      const response = tokenLimitResponse(
        currentValidation.tokenInfo.current,
        currentValidation.tokenInfo.max,
        'exceeded'
      );

      return res.status(statusCode).json({
        ...response,
        exactCalculation: true,
        method: currentValidation.tokenInfo.method
      });
    }

    if (preValidation && !preValidation.canProceed) {
      logSecurityEvent('PRE_VALIDATION_FAILED', 'Pre-validación falló en validación unificada', {
        userId,
        chatId,
        tokenInfo: preValidation.preValidation,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'medium');

      const errorResponse = preValidationFailed(preValidation.preValidation, preValidation.suggestion);

      return res.status(400).json({
        ...errorResponse,
        isPreValidationLimit: true,
        exactTokens: true
      });
    }

    const tokenInfo = {
      ...currentValidation.tokenInfo,
      exactCalculation: true
    };

    const tokenWarning = currentValidation.warning ? {
      ...currentValidation.warning,
      exactCalculation: true,
      method: currentValidation.tokenInfo?.method
    } : null;

    const preValidationWarning = preValidation?.warning ? {
      ...preValidation.warning,
      exactTokens: true
    } : null;

    const preValidationInfo = preValidation?.preValidation ? {
      queryTokensExact: preValidation.preValidation.queryTokens,
      estimatedResponse: preValidation.preValidation.responseEstimated,
      projectedTotal: preValidation.preValidation.projected,
      method: 'optimized_unified_parallel'
    } : null;

    if (tokenWarning) {
      logSecurityEvent('TOKEN_LIMIT_WARNING', 'Advertencia de límite de tokens', {
        userId: userId,
        chatId: chatId,
        isAdmin: false,
        tokenInfo: tokenInfo,
        warningLevel: tokenInfo.warningLevel,
        method: tokenInfo.method,
        exactCalculation: true,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'low');
    }

    req.tokenInfo = tokenInfo;
    req.tokenWarning = tokenWarning;
    req.preValidationWarning = preValidationWarning;
    req.preValidationInfo = preValidationInfo;

    logger.info('Validación ultrarrápida completada', {
      chatId,
      currentTokens: tokenInfo.current,
      maxTokens: tokenInfo.max,
      percentage: tokenInfo.percentage,
      method: tokenInfo.method
    });

    next();

  } catch (error) {
    logSecurityEvent('TOKEN_UNIFIED_ERROR', 'Error en validación unificada de tokens', {
      userId: req.body.userId || req.user?.id_user,
      chatId: req.body.chatId,
      error: error.message,
      ip: req.ip,
      endpoint: req.originalUrl
    }, 'medium');

    logger.error('Error en validación unificada de tokens', { error: error.message });

    try {
      logger.debug('Usando fallback ultrarrápido');
      
      const query = req.body.query || req.body.content || '';
      const estimatedTokens = Math.ceil(String(query).length / 4);
      const maxTokens = 50000;
      
      if (estimatedTokens > maxTokens * 0.9) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED,
            message: 'Chat cerca del límite de tokens (estimación fallback)'
          },
          fallback: true,
          exactCalculation: false
        });
      }

      req.tokenInfo = {
        current: estimatedTokens,
        max: maxTokens,
        percentage: Math.round((estimatedTokens / maxTokens) * 100),
        remaining: maxTokens - estimatedTokens,
        warningLevel: 'normal',
        messageCount: 0,
        method: 'fallback_estimation_ultrafast',
        exactCalculation: false,
        error: error.message
      };
      req.tokenWarning = null;
      req.preValidationWarning = null;
      req.preValidationInfo = null;

      logger.warn('Fallback ultrarrápido aplicado', { estimatedTokens });
      
      next();

    } catch (fallbackError) {
      logger.error('Error en fallback', { error: fallbackError.message });
      
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: 'Error interno verificando límites de tokens'
        }
      });
    }
  }
};

export const verifyToolAccessWithTokensUnified = async (req, res, next) => {
  verifyToolAccess(req, res, (error) => {
    if (error) return next(error);
    
    if (req.accessInfo?.isAdmin) {
      logger.debug('Admin detectado - Saltando verificación de tokens (ULTRARRÁPIDO)');
      req.tokenInfo = {
        current: 0,
        max: 'unlimited',
        percentage: 0,
        remaining: 'unlimited',
        warningLevel: 'none',
        messageCount: 0,
        isAdmin: true,
        method: 'admin_unlimited_bypass',
        exactCalculation: true
      };
      req.tokenWarning = null;
      req.preValidationWarning = null;
      req.preValidationInfo = null;
      return next();
    }
    
    checkTokenLimitsUnified(req, res, next);
  });
};

export const verifyAvaAccessWithTokensUnified = async (req, res, next) => {
  verifyAvaAccess(req, res, (error) => {
    if (error) return next(error);
    
    if (req.accessInfo?.isAdmin) {
      logger.debug('Admin detectado - Saltando verificación de tokens (ULTRARRÁPIDO)');
      req.tokenInfo = {
        current: 0,
        max: 'unlimited',
        percentage: 0,
        remaining: 'unlimited',
        warningLevel: 'none',
        messageCount: 0,
        isAdmin: true,
        method: 'admin_unlimited_bypass',
        exactCalculation: true
      };
      req.tokenWarning = null;
      req.preValidationWarning = null;
      req.preValidationInfo = null;
      return next();
    }
    
    checkTokenLimitsUnified(req, res, next);
  });
};

export const verifySpecificToolAccess = (toolSlug) => {
  return async (req, res, next) => {
    try {
      logger.debug('Verificando acceso ultrarrápido a herramienta específica', { toolSlug });

      if (!toolSlug || typeof toolSlug !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.TOOL_ACCESS.INVALID_TOOL,
            message: 'Slug de herramienta no válido'
          }
        });
      }

      const userId = req.body.userId || req.user?.id_user;
      
      if (userId) {
        const userStatus = await AccessValidationService.getUserStatus(userId);
        
        if (userStatus.isAdmin) {
          logSecurityEvent('SPECIFIC_TOOL_ACCESS_ADMIN', 'Admin accediendo a herramienta específica', {
            userId: userId,
            toolSlug: toolSlug,
            isAdmin: true,
            ip: req.ip,
            endpoint: req.originalUrl
          }, 'info');

          logger.debug('Usuario es ADMIN - Acceso directo a herramienta (BYPASS)', { 
            userId, 
            toolSlug 
          });

          req.toolSlug = toolSlug;
          req.toolId = null; // Se puede obtener después si es necesario
          req.toolInfo = { slug: toolSlug, nombre: toolSlug };
          req.accessInfo = {
            isPremium: true,
            isAdmin: true,
            toolAccess: {
              success: true,
              canProceed: true,
              type: 'admin_unlimited',
              toolSlug: toolSlug,
              toolId: null,
              toolName: toolSlug
            },
            userId
          };
          req.tokenInfo = {
            current: 0,
            max: 'unlimited',
            percentage: 0,
            remaining: 'unlimited',
            warningLevel: 'none',
            messageCount: 0,
            isAdmin: true,
            method: 'admin_unlimited_bypass',
            exactCalculation: true
          };
          req.tokenWarning = null;
          req.preValidationWarning = null;
          req.preValidationInfo = null;

          return next();
        }
      }

      logger.debug('Usuario regular - Validando límites específicos', { toolSlug, userId });

      const userStatus = await AccessValidationService.getUserStatus(userId);
      const validation = await AccessValidationService.validateSpecificToolAccess(userId, toolSlug, userStatus.isPremium);

      if (!validation.canProceed) {
        logSecurityEvent('SPECIFIC_TOOL_ACCESS_DENIED', 'Acceso denegado a herramienta específica por límite', {
          userId: userId,
          toolSlug: toolSlug,
          isPremium: userStatus.isPremium,
          isAdmin: false,
          errorCode: validation.errorCode,
          limits: validation.limits,
          ip: req.ip,
          endpoint: req.originalUrl
        }, 'low');

        const statusCode = getErrorStatusCode(validation.errorCode);
        
        const limitType = validation.limits?.daily?.exceeded ? 'daily' : 'hourly';
        const resetTime = validation.limits?.[limitType]?.resetTime;
        
        const response = withUpgradeInfo(
          specificToolLimitReached(toolSlug, limitType, resetTime, validation.limits, {
            toolSlug,
            type: userStatus.isPremium ? 'premium' : 'free_user_limits',
            daily: validation.limits?.daily,
            hourly: validation.limits?.hourly,
            source: 'middleware_validation'
          }),
          'premium'
        );

        return res.status(statusCode).json(response);
      }

      req.toolSlug = toolSlug;
      req.toolId = validation.toolId;
      req.toolInfo = {
        id: validation.toolId,
        slug: toolSlug,
        nombre: validation.toolName
      };
      req.accessInfo = {
        isPremium: userStatus.isPremium,
        isAdmin: false,
        toolAccess: validation,
        userId,
        
        specificToolLimits: {
          toolSlug,
          type: userStatus.isPremium ? 'premium' : 'free_user_limits',
          daily: validation.limits?.daily,
          hourly: validation.limits?.hourly,
          source: 'middleware_specific'
        }
      };

      checkTokenLimitsUnified(req, res, next);

    } catch (error) {
      logSecurityEvent('SPECIFIC_TOOL_ACCESS_ERROR', 'Error verificando acceso a herramienta específica', {
        userId: req.body.userId || req.user?.id_user,
        toolSlug: toolSlug,
        error: error.message,
        ip: req.ip,
        endpoint: req.originalUrl
      }, 'medium');

      logger.error('Error verificando acceso a herramienta específica', { 
        toolSlug, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: 'Error interno verificando acceso a herramienta específica'
        }
      });
    }
  };
};

const TOOL_TYPE_TO_SLUG_MAP = {
  'agent': 'agente',
  'agente': 'agente', 
  'pdf': 'pdf'
};

export const verifySpecificToolAccessByType = (toolType) => {
  return async (req, res, next) => {
    try {
      const toolSlug = TOOL_TYPE_TO_SLUG_MAP[toolType.toLowerCase()];
      
      if (!toolSlug) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.TOOL_ACCESS.INVALID_TOOL,
            message: 'Tipo de herramienta no válido'
          }
        });
      }

      logger.debug('Convirtiendo tipo a slug (ULTRARRÁPIDO)', { 
        toolType, 
        toolSlug 
      });

      const specificMiddleware = verifySpecificToolAccess(toolSlug);
      return specificMiddleware(req, res, next);

    } catch (error) {
      logger.error('Error verificando acceso por tipo de herramienta', { 
        toolType, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: 'Error interno verificando acceso a herramienta por tipo'
        }
      });
    }
  };
};


export const clearUserStatusCache = (userId = null) => {
  AccessValidationService.clearUserStatusCache(userId);
  logger.debug('User status cache cleared', { 
    userId: userId || 'all_users', 
    source: 'centralized' 
  });
};


export const checkTokenLimits = checkTokenLimitsUnified;
export const verifyToolAccessWithTokens = verifyToolAccessWithTokensUnified;
export const verifyAvaAccessWithTokens = verifyAvaAccessWithTokensUnified;
export const preValidateTokensWithQuery = async (req, res, next) => {
  logger.warn('preValidateTokensWithQuery está deprecado. Use checkTokenLimitsUnified que incluye pre-validación.');
  next();
};
export const verifyAvaAccessWithTokensAndPreValidation = verifyAvaAccessWithTokensUnified;