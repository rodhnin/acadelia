
import { AccessValidationService } from "../../services/shared/accessValidationService.js";
import { tokenCounter } from "../../services/shared/tokenCounterService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import logger from '../../utils/logger.js';

/**
 * 🚀 ULTRA-CENTRALIZADO TOKEN MANAGER - VERSIÓN COMPLETA CORREGIDA
 * OBJETIVO: 100% de lógica de tokens centralizada - CERO redundancias
 * ELIMINA: Necesidad de importar preValidationFailed, AccessValidationService en controladores
 * GARANTIZA: Un solo punto de verdad para toda la lógica de tokens
 */
export const TokenManager = {

  /**
   * 🎯 MÉTODO PRINCIPAL: Validación completa de tokens (PRE + POST + CONSTRUCCIÓN)
   * REEMPLAZA: Toda la lógica manual en controladores
   */
  async handleCompleteTokenValidation(req, res, options = {}) {
    const {
      chatId,
      userId,
      query,
      content,
      accessInfo,
      toolSlug = 'general',
      responseType = 'normal',
      skipSave = false
    } = options;

    try {
      logger.debug(`Validación completa de tokens iniciada`, { toolSlug, userId, chatId });

      // ⚡ BYPASS ADMIN INMEDIATO
      if (accessInfo?.isAdmin) {
        logger.debug(`Admin bypass - Sin validación de tokens`, { toolSlug, userId });
        return {
          success: true,
          shouldContinue: true,
          tokenInfo: this._buildAdminTokenInfo(),
          tokenWarning: null,
          preValidationWarning: null
        };
      }

      const preValidationResult = await this._handlePreValidationInternal(
        chatId, userId, query, content, responseType, toolSlug
      );

      if (!preValidationResult.canProceed) {
        return {
          success: false,
          shouldContinue: false,
          shouldReturn: true,
          statusCode: 400,
          response: preValidationResult.errorResponse
        };
      }

      const currentValidation = await this._handleCurrentValidationInternal(chatId, userId, toolSlug);

      if (!currentValidation.canProceed) {
        return {
          success: false,
          shouldContinue: false,
          shouldReturn: true,
          statusCode: 400,
          response: currentValidation.errorResponse
        };
      }

      const tokenInfo = {
        ...currentValidation.tokenInfo,
        exactCalculation: true
      };

      const tokenWarning = currentValidation.warning ? {
        ...currentValidation.warning,
        exactCalculation: true
      } : null;

      const preValidationWarning = preValidationResult.warning ? {
        ...preValidationResult.warning,
        exactTokens: true
      } : null;

      return {
        success: true,
        shouldContinue: true,
        tokenInfo,
        tokenWarning,
        preValidationWarning,
        preValidationInfo: preValidationResult.preValidationInfo
      };

    } catch (error) {
      logger.error(`Error en validación completa`, { toolSlug, userId, error: error.message });

      return {
        success: true,
        shouldContinue: true,
        tokenInfo: this._buildFallbackTokenInfo(error.message),
        tokenWarning: null,
        preValidationWarning: null,
        fallback: true
      };
    }
  },

  /**
   * 🎯 MÉTODO ULTRA-CENTRALIZADO: Manejo completo de controller de herramientas
   * REEMPLAZA: 90% del código duplicado en controladores de herramientas (Agent, PDF)
   */
  async handleCompleteToolController(req, res, options = {}) {
    const {
      validationErrors,
      accessInfo,
      tokenInfo,
      tokenWarning,
      toolSlug,
      toolId,
      toolInfo,
      serviceFunction,
      skipSave = false,
      isMultimodal = false,
      getToolNameById
    } = options;

    let responseAlreadySent = false;

    const sendResponseOnce = (statusCode, responseData) => {
      if (responseAlreadySent) {
        console.warn(`⚠️ Intento de envío de respuesta duplicada bloqueado para ${toolSlug}`);
        return;
      }

      responseAlreadySent = true;

      if (res.headersSent) {
        console.error(`❌ Headers ya enviados para ${toolSlug} - No se puede enviar respuesta`);
        return;
      }

      try {
        if (statusCode !== 200) {
          res.status(statusCode).json(responseData);
        } else {
          res.json(responseData);
        }
        console.log(`✅ Respuesta enviada exitosamente para ${toolSlug}`);
      } catch (sendError) {
        console.error(`❌ Error enviando respuesta para ${toolSlug}:`, sendError.message);
      }
    };

    try {
      // ===== VALIDACIÓN DE ENTRADA =====
      if (validationErrors.length > 0) {
        logSecurityEvent(`${toolSlug.toUpperCase()}_VALIDATION_ERROR`, `Error de validación en ${toolSlug}`, {
          userId: req.body.userId || req.user?.id_user,
          errors: validationErrors,
          ip: req.ip
        }, 'medium');

        return sendResponseOnce(400, {
          success: false,
          errors: validationErrors,
          errorType: `${toolSlug}_validation_error`
        });
      }

      const { userId, chatId, query, content } = req.body;

      this.logSuccessfulAccess(req, accessInfo, tokenInfo, tokenWarning, toolSlug, toolId, getToolNameById);

      // ===== LÓGICA PRINCIPAL DEL CONTROLADOR =====
      const skipSaveMode = skipSave || req.body.skipSave === true || req.headers['x-skip-save'] === 'true';

      logger.debug(`Ejecutando servicio`, { toolSlug, skipSave: skipSaveMode, userId, chatId });

      if (responseAlreadySent) {
        console.warn(`⚠️ Respuesta ya enviada antes de ejecutar servicio para ${toolSlug}`);
        return;
      }

      const result = await serviceFunction(req.body, skipSaveMode);

      if (responseAlreadySent) {
        console.warn(`⚠️ Respuesta ya enviada después de ejecutar servicio para ${toolSlug}`);
        return;
      }

      const postResponseWarning = await this.handlePostValidation(
        result, chatId, userId, accessInfo, skipSaveMode, toolSlug
      );

      if (isMultimodal) {
        await this.handleMultimodalCacheInvalidation(result, chatId, content, accessInfo, toolSlug);
      } else {
        await this.handleCacheInvalidation(result, chatId, query, accessInfo, toolSlug);
      }

      // ===== CONSTRUCCIÓN DE RESPUESTA CENTRALIZADA =====
      const response = this.buildOptimizedResponse(
        result, req, accessInfo, tokenInfo, tokenWarning, tokenInfo.preValidationWarning, postResponseWarning,
        toolSlug, toolId, toolInfo, getToolNameById, isMultimodal ? `${toolSlug}_multimodal` : toolSlug
      );

      logger.info(`Controlador completado exitosamente`, { toolSlug, userId, success: result?.success });

      return sendResponseOnce(200, response);

    } catch (error) {
      if (responseAlreadySent) {
        console.warn(`⚠️ Error después de respuesta enviada para ${toolSlug}:`, error.message);
        return;
      }

      const tokenError = this.handleTokenError(error, req, toolSlug);
      if (tokenError) {
        return sendResponseOnce(tokenError.status, tokenError.response);
      }

      logSecurityEvent(`${toolSlug.toUpperCase()}_QUERY_ERROR`, `Error procesando ${toolSlug}`, {
        userId: req.body.userId || req.user?.id_user,
        query: req.body.query ? req.body.query.substring(0, 100) + '...' : 'N/A',
        error: error.message,
        ip: req.ip,
        hasAccessInfo: !!req.accessInfo
      }, 'medium');

      const statusCode = error.message.includes("UUID v4") ? 400 : 500;

      return sendResponseOnce(statusCode, {
        success: false,
        error: error.message,
        errorType: `${toolSlug}_processing_error`,
        toolInfo: this.buildToolInfo(toolSlug, toolId, toolInfo, accessInfo, getToolNameById, req.body.herramientaId),
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  /**
   * 🎯 MÉTODO ULTRA-CENTRALIZADO: Manejo completo de controller AVA
   * REEMPLAZA: 90% del código duplicado en controladores AVA
   */
  async handleCompleteAvaController(req, res, options = {}) {
    const {
      validationErrors,
      avaAccessInfo,
      tokenInfo,
      tokenWarning,
      avaType,
      defaultAvaName,
      serviceFunction,
      skipSave = false,
      isMultimodal = false
    } = options;

    try {
      // ===== VALIDACIÓN DE ENTRADA =====
      if (validationErrors.length > 0) {
        logSecurityEvent(`${avaType.toUpperCase()}_VALIDATION_ERROR`, `Error de validación en ${avaType}`, {
          userId: req.body.userId || req.user?.id_user,
          errors: validationErrors,
          ip: req.ip
        }, 'medium');

        return res.status(400).json({
          success: false,
          errors: validationErrors
        });
      }

      const { userId } = req.body;
      const chatId = req.body.chatId;
      const query = req.body.query;
      const content = req.body.content;

      const tokenValidation = await this.handleCompleteTokenValidation(req, res, {
        chatId,
        userId,
        query: query || this._extractTextFromContent(content),
        content,
        accessInfo: avaAccessInfo,
        toolSlug: avaType,
        responseType: isMultimodal ? 'multimodal' : 'normal',
        skipSave
      });

      if (!tokenValidation.shouldContinue) {
        return res.status(tokenValidation.statusCode).json(tokenValidation.response);
      }

      req.tokenInfo = tokenValidation.tokenInfo;
      req.tokenWarning = tokenValidation.tokenWarning;
      req.preValidationWarning = tokenValidation.preValidationWarning;
      req.preValidationInfo = tokenValidation.preValidationInfo;

      logger.info(`Validación completa exitosa - Ejecutando servicio`, { avaType, userId, chatId });

      // ===== EJECUTAR SERVICIO =====
      const result = await serviceFunction(req.body);

      const postResponseWarning = await this.handlePostValidation(
        result, chatId, userId, avaAccessInfo, skipSave, avaType
      );

      if (isMultimodal) {
        await this.handleMultimodalCacheInvalidation(result, chatId, content, avaAccessInfo, avaType);
      } else {
        await this.handleCacheInvalidation(result, chatId, query, avaAccessInfo, avaType);
      }

      // ===== CONSTRUCCIÓN DE RESPUESTA CENTRALIZADA =====
      const responseMethod = isMultimodal ? 'buildAvaMultimodalResponse' : 'buildAvaResponse';
      const response = this[responseMethod](
        result, req, avaAccessInfo, tokenValidation.tokenInfo, tokenValidation.tokenWarning,
        tokenValidation.preValidationWarning, postResponseWarning, avaType, defaultAvaName
      );

      logger.info(`Controlador AVA completado exitosamente`, { avaType, userId, success: result?.success });
      res.json(response);

    } catch (error) {
      const tokenError = this.handleTokenError(error, req, avaType);
      if (tokenError) {
        return res.status(tokenError.status).json(tokenError.response);
      }

      logSecurityEvent(`${avaType.toUpperCase()}_QUERY_ERROR`, `Error procesando ${avaType}`, {
        userId: req.body.userId || req.user?.id_user,
        query: req.body.query ? req.body.query.substring(0, 100) + '...' : 'N/A',
        error: error.message,
        ip: req.ip,
        hasAccessInfo: !!req.accessInfo
      }, 'medium');

      const statusCode = error.message.includes("UUID v4") ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  /**
   * 🚀 NUEVO: Log de acceso exitoso centralizado
   */
  logSuccessfulAccess(req, accessInfo, tokenInfo, tokenWarning, toolSlug, toolId, getToolNameById) {
    logSecurityEvent(`${toolSlug.toUpperCase()}_ACCESS_GRANTED`, `Acceso concedido a herramienta ${toolSlug}`, {
      userId: req.body.userId || req.user?.id_user,
      toolSlug: toolSlug,
      toolId: toolId,
      toolName: getToolNameById ? getToolNameById(toolId) : toolSlug,
      isPremium: accessInfo.isPremium || false,
      isAdmin: accessInfo.isAdmin || false,
      hasTokenWarning: !!tokenWarning,
      tokenPercentage: tokenInfo.percentage || 0,
      accessType: accessInfo.toolAccess?.type || 'unknown',
      limits: accessInfo.toolAccess?.limits || null,
      ip: req.ip
    }, 'info');

    logger.info(`Acceso concedido a herramienta`, {
      toolSlug,
      userId: req.body.userId,
      isPremium: accessInfo.isPremium,
      isAdmin: accessInfo.isAdmin
    });
  },

  buildOptimizedResponse(result, req, accessInfo, tokenInfo, tokenWarning, preValidationWarning, postResponseWarning, toolSlug, toolId, toolInfo, getToolNameById, controllerType = 'tool') {

    logger.debug('buildOptimizedResponse iniciado', {
      hasTokenInfo: !!tokenInfo,
      tokenInfoCurrent: tokenInfo?.current,
      tokenInfoMax: tokenInfo?.max,
      hasTokenWarning: !!tokenWarning,
      hasPostResponseWarning: !!postResponseWarning,
      toolSlug
    });

    const baseResponse = {
      ...result,

      tokenInfo: this.buildTokenInfo(accessInfo, tokenInfo, result, `ultra_centralized_${toolSlug}`),

      warnings: this.buildWarnings(tokenWarning, preValidationWarning, postResponseWarning, toolSlug),

      toolInfo: this.buildToolInfo(toolSlug, toolId, toolInfo, accessInfo, getToolNameById, req.body.herramientaId),

      // ⭐ LÍMITES ESPECÍFICOS DINÁMICOS DEL BACKEND ⭐
      toolLimits: this.buildDynamicToolLimits(toolSlug, accessInfo),

      accessInfo: {
        isPremium: accessInfo.isPremium || false,
        isAdmin: accessInfo.isAdmin || false,
        toolSlug: toolSlug,
        accessType: accessInfo.toolAccess?.type || (accessInfo.isAdmin ? 'admin_unlimited' : 'limited'),
        specificLimits: accessInfo.toolAccess?.limits || null
      },

      timestamp: new Date().toISOString(),
      controllerType: controllerType
    };

    this.addWarningFlags(baseResponse, preValidationWarning, postResponseWarning);

    logger.debug('buildOptimizedResponse completado', {
      hasTokenInfo: !!baseResponse.tokenInfo,
      hasWarnings: baseResponse.warnings?.length > 0,
      hasFlags: !!(baseResponse._hasTokenWarning || baseResponse._shouldShowTokenWarning)
    });

    return this.cleanResponse(baseResponse);
  },

  addWarningFlags(result, preValidationWarning, postResponseWarning) {
    logger.debug('addWarningFlags iniciado', {
      hasPreValidationWarning: !!preValidationWarning,
      hasPostResponseWarning: !!postResponseWarning
    });

    if (preValidationWarning) {
      result._hasPreWarning = true;
      result._preWarningExact = true;
      logger.debug('Pre-warning flags añadidos');
    }

    if (postResponseWarning) {
      result._hasPostWarning = true;
      result._postWarningLevel = postResponseWarning.level;
      result._shouldShowTokenWarning = true;
      result._warningPercentage = postResponseWarning.percentage;
      result._warningExactCalculation = true;
      logger.debug('Post-warning flags añadidos', {
        level: postResponseWarning.level,
        percentage: postResponseWarning.percentage
      });
    }

    if (result.tokenInfo && result.tokenInfo.current && result.tokenInfo.max &&
      typeof result.tokenInfo.current === 'number' && typeof result.tokenInfo.max === 'number') {

      const percentage = (result.tokenInfo.current / result.tokenInfo.max) * 100;
      logger.debug('Verificando warning automático', {
        current: result.tokenInfo.current,
        max: result.tokenInfo.max,
        percentage: percentage.toFixed(1),
        shouldWarn: percentage >= 75
      });

      if (percentage >= 75) {
        result._hasTokenWarning = true;
        result._shouldShowTokenWarning = true;
        result._warningPercentage = Math.round(percentage);
        result._warningExactCalculation = true;
        result.tokenWarning = {
          current: result.tokenInfo.current,
          max: result.tokenInfo.max,
          level: 'high',
          percentage: Math.round(percentage),
          source: 'automatic_75_percent',
          message: `Chat acercándose al límite (${Math.round(percentage)}% usado)`
        };
        logger.warn('Warning automático añadido al 75%', {
          percentage: Math.round(percentage),
          current: result.tokenInfo.current,
          max: result.tokenInfo.max
        });
      }
    }

    return result;
  },

  buildTokenInfo(accessInfo, tokenInfo, result, method = 'ultra_centralized') {
    logger.debug('buildTokenInfo iniciado', {
      hasAccessInfo: !!accessInfo,
      isAdmin: accessInfo?.isAdmin,
      hasTokenInfo: !!tokenInfo,
      tokenInfoCurrent: tokenInfo?.current,
      tokenInfoMax: tokenInfo?.max,
      method
    });

    if (accessInfo?.isAdmin) {
      logger.debug('Admin bypass - retornando admin token info');
      return this._buildAdminTokenInfo();
    }

    if (!tokenInfo?.current) {
      logger.warn('tokenInfo.current no existe, retornando null', {
        hasTokenInfo: !!tokenInfo,
        current: tokenInfo?.current,
        max: tokenInfo?.max
      });
      return null;
    }

    const finalTokenInfo = {
      current: result?.tokenInfo?.final || tokenInfo.current,
      max: tokenInfo.max,
      percentage: result?.tokenInfo?.percentage || tokenInfo.percentage,
      remaining: result?.tokenInfo?.remaining || tokenInfo.remaining,
      method: tokenInfo.method || method,
      exactCalculation: true,
      isAdmin: false
    };

    logger.debug('buildTokenInfo completado exitosamente', finalTokenInfo);
    return finalTokenInfo;
  },

  // tokenManager.js - VERSIÓN CORREGIDA
  buildDynamicToolLimits(toolSlug, accessInfo) {
    try {
      if (accessInfo?.isAdmin) {
        return {
          toolSlug,
          type: 'admin_unlimited',
          daily: { unlimited: true },
          hourly: { unlimited: true },
          isUnlimited: true,
          userType: 'admin'
        };
      }

      if (accessInfo?.isPremium) {
        return {
          toolSlug,
          type: 'premium_unlimited',
          daily: { unlimited: true },
          hourly: { unlimited: true },
          isUnlimited: true,
          userType: 'premium'
        };
      }

      const toolAccess = accessInfo?.toolAccess;
      if (toolAccess && toolAccess.limits) {
        const dailyLimits = toolAccess.limits.daily || {};
        const hourlyLimits = toolAccess.limits.hourly || {};

        return {
          toolSlug,
          type: 'free_user_limits',
          daily: {
            used: dailyLimits.used || 0,
            limit: dailyLimits.limit,
            remaining: dailyLimits.remaining || Math.max(0, (dailyLimits.limit || 0) - (dailyLimits.used || 0)),
            resetTime: dailyLimits.resetTime,
            exceeded: dailyLimits.exceeded || false,
            percentage: dailyLimits.limit > 0 ? Math.round(((dailyLimits.used || 0) / dailyLimits.limit) * 100) : 0
          },
          hourly: {
            used: hourlyLimits.used || 0,
            limit: hourlyLimits.limit,
            remaining: hourlyLimits.remaining || Math.max(0, (hourlyLimits.limit || 0) - (hourlyLimits.used || 0)),
            resetTime: hourlyLimits.resetTime,
            exceeded: hourlyLimits.exceeded || false,
            percentage: hourlyLimits.limit > 0 ? Math.round(((hourlyLimits.used || 0) / hourlyLimits.limit) * 100) : 0
          },
          source: 'backend_access_validation_exact',
          isUnlimited: false,
          userType: 'free',
          hasExceeded: dailyLimits.exceeded || hourlyLimits.exceeded || false,

          warningThresholds: {
            daily: Math.round((dailyLimits.limit || 0) * 0.8),
            hourly: Math.round((hourlyLimits.limit || 0) * 0.8)
          }
        };
      }

      const toolKey = toolSlug.toUpperCase();
      const limits = AccessValidationService.LIMITS.TOOLS.FREE_USER[toolKey];

      if (limits) {
        return {
          toolSlug,
          type: 'free_user_limits_fallback',
          daily: {
            used: 0,
            limit: limits.MESSAGES_PER_DAY,
            remaining: limits.MESSAGES_PER_DAY,
            resetTime: null,
            exceeded: false,
            percentage: 0
          },
          hourly: {
            used: 0,
            limit: limits.MESSAGES_PER_HOUR,
            remaining: limits.MESSAGES_PER_HOUR,
            resetTime: null,
            exceeded: false,
            percentage: 0
          },
          source: 'access_validation_service_config',
          isUnlimited: false,
          userType: 'free',
          hasExceeded: false,

          warningThresholds: {
            daily: Math.round(limits.MESSAGES_PER_DAY * 0.8),
            hourly: Math.round(limits.MESSAGES_PER_HOUR * 0.8)
          }
        };
      }

      logger.error(`No se encontraron límites para herramienta: ${toolSlug}`);
      return {
        toolSlug,
        type: 'error_no_config',
        error: 'Tool limits not configured in AccessValidationService',
        source: 'error_no_fallback'
      };

    } catch (error) {
      logger.error(`Error construyendo límites dinámicos para ${toolSlug}`, { error: error.message });
      return {
        toolSlug,
        type: 'error',
        error: error.message,
        source: 'error_exception'
      };
    }
  },

  /**
   * 🚀 NUEVO: Construir información de herramienta centralizada
   */
  buildToolInfo(toolSlug, toolId, toolInfo, accessInfo, getToolNameById, herramientaId, tokenInfo = null, result = null) {
    const finalToolId = toolId || herramientaId;
    const toolName = toolInfo?.nombre || (getToolNameById ? getToolNameById(finalToolId) : toolSlug);

    return {
      id: finalToolId,
      slug: toolSlug,
      name: toolName,
      type: 'tool',

      hasAccess: true,
      isPremium: accessInfo?.isPremium || false,
      isAdmin: accessInfo?.isAdmin || false,
      accessType: accessInfo?.toolAccess?.type || (accessInfo?.isAdmin ? 'admin_unlimited' : 'limited'),

      limits: accessInfo?.isAdmin ? 'unlimited' : (accessInfo?.toolAccess?.limits || {}),

      ...(tokenInfo && {
        tokenUsage: {
          current: result?.tokenInfo?.final || tokenInfo.current,
          max: tokenInfo.max,
          percentage: result?.tokenInfo?.percentage || tokenInfo.percentage,
          method: tokenInfo.method || 'centralized'
        }
      }),

      processedAt: new Date().toISOString(),
      exactCalculation: true
    };
  },

  /**
   * 🔒 MÉTODOS INTERNOS ENCAPSULADOS
   */

  /**
   * ⚡ INTERNO: Pre-validación encapsulada completa
   */
  async _handlePreValidationInternal(chatId, userId, query, content, responseType, toolSlug) {
    if (!chatId || !userId) {
      return { canProceed: true, warning: null };
    }

    try {
      const textToValidate = query || this._extractTextFromContent(content);

      if (!textToValidate?.trim()) {
        return { canProceed: true, warning: null };
      }

      logger.debug(`Pre-validación encapsulada`, { toolSlug, textLength: textToValidate.length });

      const preValidation = await AccessValidationService.validateTokensWithResponseEstimate(
        chatId, userId, textToValidate, responseType
      );

      if (!preValidation.canProceed) {
        logSecurityEvent(`${toolSlug.toUpperCase()}_TOKEN_PRE_VALIDATION_FAILED`, 'Pre-validación de tokens falló', {
          userId, chatId, tokenInfo: preValidation.preValidation, toolSlug, ip: 'internal'
        }, 'medium');

        return {
          canProceed: false,
          errorResponse: this._buildPreValidationErrorResponse(preValidation)
        };
      }

      return {
        canProceed: true,
        warning: preValidation.warning ? {
          ...preValidation.warning,
          exactTokens: true
        } : null,
        preValidationInfo: preValidation.preValidation ? {
          queryTokensExact: preValidation.preValidation.queryTokens,
          estimatedResponse: preValidation.preValidation.responseEstimated,
          projectedTotal: preValidation.preValidation.projected,
          method: 'ultra_centralized'
        } : null
      };

    } catch (error) {
      logger.warn(`Error en pre-validación encapsulada`, { toolSlug, error: error.message });
      return { canProceed: true, warning: null };
    }
  },

  /**
   * ⚡ INTERNO: Validación actual encapsulada
   */
  async _handleCurrentValidationInternal(chatId, userId, toolSlug) {
    try {
      const validation = await AccessValidationService.validateTokenLimits(chatId, userId);

      if (!validation.canProceed) {
        return {
          canProceed: false,
          errorResponse: this._buildTokenLimitErrorResponse(validation, toolSlug)
        };
      }

      return {
        canProceed: true,
        tokenInfo: validation.tokenInfo,
        warning: validation.warning
      };

    } catch (error) {
      logger.warn(`Error en validación actual encapsulada`, { toolSlug, error: error.message });
      return {
        canProceed: true,
        tokenInfo: this._buildFallbackTokenInfo(error.message),
        warning: null
      };
    }
  },

  /**
   * ⚡ INTERNO: Construir respuesta de error de pre-validación
   */
  _buildPreValidationErrorResponse(preValidation) {
    return {
      success: false,
      error: {
        code: 'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED',
        message: preValidation.suggestion || 'La respuesta estimada excedería el límite de tokens'
      },
      tokenInfo: preValidation.preValidation,
      isPreValidationLimit: true,
      exactTokens: true
    };
  },

  /**
   * ⚡ INTERNO: Construir respuesta de error de límite de tokens
   */
  _buildTokenLimitErrorResponse(validation, toolSlug) {
    return {
      success: false,
      error: {
        code: 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED',
        message: `Chat excedió el límite de tokens`
      },
      tokenInfo: validation.tokenInfo,
      exactCalculation: true,
      toolSlug
    };
  },

  /**
   * ⚡ INTERNO: Token info para admin
   */
  _buildAdminTokenInfo() {
    return {
      current: 0,
      max: 'unlimited',
      percentage: 0,
      remaining: 'unlimited',
      method: 'admin_unlimited',
      exactCalculation: true,
      isAdmin: true
    };
  },

  /**
   * ⚡ INTERNO: Token info fallback
   */
  _buildFallbackTokenInfo(errorMessage) {
    return {
      current: 0,
      max: 50000,
      percentage: 0,
      remaining: 50000,
      warningLevel: 'normal',
      messageCount: 0,
      method: 'fallback_safe',
      exactCalculation: false,
      error: errorMessage
    };
  },

  /**
   * ⚡ INTERNO: Extraer texto de content multimodal
   */
  _extractTextFromContent(content) {
    if (!content || !Array.isArray(content)) return '';

    return content
      .filter(item => item && item.type === 'text')
      .map(item => item.text)
      .join('\n\n');
  },

  /**
   * ✅ MÉTODOS EXISTENTES OPTIMIZADOS (mantener compatibilidad)
   */

  /**
   * ⚡ HELPER: Construir warnings array (elimina 95% duplicación)
   */
  buildWarnings(tokenWarning, preValidationWarning, postResponseWarning, toolType = 'general') {
    const warnings = [];

    if (tokenWarning) {
      warnings.push({
        type: 'token_limit_pre',
        level: tokenWarning.level,
        message: tokenWarning.message || 'Te acercas al límite de tokens en esta conversación',
        timing: 'pre_request',
        exactCalculation: tokenWarning.exactTokens || false,
        toolType
      });
    }

    if (preValidationWarning) {
      warnings.push({
        type: `token_pre_validation_exact${toolType !== 'general' ? `_${toolType}` : ''}`,
        level: preValidationWarning.level,
        message: preValidationWarning.message,
        tokenInfo: preValidationWarning,
        timing: 'pre_validation',
        exactCalculation: true,
        toolType
      });
    }

    if (postResponseWarning) {
      warnings.push({
        type: postResponseWarning.type,
        level: postResponseWarning.level,
        message: postResponseWarning.message,
        percentage: postResponseWarning.percentage,
        action: postResponseWarning.action,
        tokenInfo: postResponseWarning.tokenInfo,
        timing: 'post_response',
        isPostResponse: true,
        exactCalculation: true,
        toolType
      });
    }

    return warnings;
  },

  /**
   * ⚡ HELPER: Post-validación condicional optimizada (elimina 100% duplicación)
   */
  async handlePostValidation(result, chatId, userId, accessInfo, skipSave = false, toolSlug = 'general') {
    if (!result?.success || !result?.answer || !chatId || !userId || accessInfo?.isAdmin || skipSave) {
      if (accessInfo?.isAdmin) {
        logger.debug(`Admin - Saltando post-validación`, { toolSlug, userId });
      } else if (skipSave) {
        logger.debug(`Skip save mode - Saltando post-validación`, { toolSlug, userId });
      }
      return null;
    }

    try {
      logger.debug(`Ejecutando post-validación`, { toolSlug, chatId, userId });

      if (typeof AccessValidationService.recalculateTokenWarningsAfterResponse === 'function') {
        const postResponseWarning = await AccessValidationService.recalculateTokenWarningsAfterResponse(chatId, userId);

        if (postResponseWarning) {
          logger.warn(`Warning post-respuesta`, {
            toolSlug,
            level: postResponseWarning.level,
            message: postResponseWarning.message
          });
          postResponseWarning.exactCalculation = true;
          result._postResponseWarning = postResponseWarning;
        } else {
          logger.debug(`Sin warnings post-respuesta`, { toolSlug, chatId });
        }

        return postResponseWarning;
      } else {
        logger.warn(`recalculateTokenWarningsAfterResponse no está disponible`, { toolSlug });
        return null;
      }
    } catch (error) {
      logger.warn(`Error en post-validación`, { toolSlug, error: error.message });
      return null;
    }
  },

  /**
   * ⚡ HELPER: Invalidar cache optimizado (elimina 100% duplicación)
   */
  async handleCacheInvalidation(result, chatId, query, accessInfo, toolSlug = 'general') {
    if (!result?.success || accessInfo?.isAdmin) {
      if (accessInfo?.isAdmin) {
        logger.debug(`Admin - Sin invalidación de cache necesaria`, { toolSlug });
      }
      return;
    }

    try {
      await tokenCounter.onMessageAdded(chatId, query);
      logger.debug(`Cache de tokens invalidado`, { toolSlug, chatId });
    } catch (cacheError) {
      logger.warn(`Error invalidando cache`, { toolSlug, error: cacheError.message });
    }
  },

  /**
   * ⚡ HELPER: Invalidar cache multimodal optimizado
   */
  async handleMultimodalCacheInvalidation(result, chatId, content, accessInfo, toolSlug = 'multimodal') {
    if (!result?.success || accessInfo?.isAdmin) {
      if (accessInfo?.isAdmin) {
        logger.debug(`Admin - Sin invalidación de cache multimodal necesaria`, { toolSlug });
      }
      return;
    }

    try {
      const extractedText = this._extractTextFromContent(content);
      await tokenCounter.onMessageAdded(chatId, extractedText || `consulta multimodal ${toolSlug}`);
      logger.debug(`Cache multimodal invalidado`, { toolSlug, chatId });
    } catch (cacheError) {
      logger.warn(`Error invalidando cache multimodal`, { toolSlug, error: cacheError.message });
    }
  },

  /**
   * ⚡ HELPER: Manejo de errores de tokens centralizado
   */
  handleTokenError(error, req, toolSlug) {
    if (error.message && error.message.includes('excedería el límite de tokens')) {
      logSecurityEvent(`${toolSlug.toUpperCase()}_TOKEN_LIMIT_ERROR`, `Error de límite de tokens en ${toolSlug}`, {
        userId: req.body.userId || req.user?.id_user,
        chatId: req.body.chatId,
        toolSlug: toolSlug,
        error: error.message,
        ip: req.ip
      }, 'medium');

      return {
        status: 400,
        response: {
          success: false,
          error: {
            code: 'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED',
            message: error.message
          },
          isPreValidationLimit: true,
          exactTokens: true,
          toolInfo: {
            toolSlug: toolSlug,
            toolName: toolSlug.charAt(0).toUpperCase() + toolSlug.slice(1)
          }
        }
      };
    }
    return null;
  },

  /**
   * ⚡ HELPER: Limpiar campos undefined de respuesta
   */
  cleanResponse(response) {
    Object.keys(response).forEach(key => {
      if (response[key] === undefined) {
        delete response[key];
      }
    });
    return response;
  },

  /**
   * 🆕 HELPER: Construir respuesta AVA centralizada (para controllers de AVAs)
   */
  buildAvaResponse(result, req, avaAccessInfo, tokenInfo, tokenWarning, preValidationWarning, postResponseWarning, avaType, defaultAvaName) {
    const response = {
      ...result,

      accessInfo: {
        avaType: avaType,
        avaId: req.body.avaId,
        avaName: avaAccessInfo.avaInfo?.nom_ava || defaultAvaName,
        careerInfo: avaAccessInfo.careerInfo ? {
          id: avaAccessInfo.careerInfo.id_carrera,
          nombre: avaAccessInfo.careerInfo.nombre,
          descripcion: avaAccessInfo.careerInfo.descripcion
        } : null,
        subscription: avaAccessInfo.subscription || null
      },

      tokenInfo: this.buildTokenInfo(avaAccessInfo, tokenInfo, result, `ultra_centralized_${avaType}`),
      warnings: this.buildWarnings(tokenWarning, preValidationWarning, postResponseWarning, avaType)
    };

    this.addWarningFlags(response, preValidationWarning, postResponseWarning);
    this.cleanResponse(response);

    return response;
  },

  /**
   * 🆕 HELPER: Construir respuesta AVA multimodal centralizada
   */
  buildAvaMultimodalResponse(result, req, avaAccessInfo, tokenInfo, tokenWarning, preValidationWarning, postResponseWarning, avaType, defaultAvaName) {
    const enhancedResult = {
      ...result,

      accessInfo: {
        avaType: `${avaType}_multimodal`,
        avaId: req.body.avaId,
        avaName: avaAccessInfo.avaInfo?.nom_ava || defaultAvaName,
        careerInfo: avaAccessInfo.careerInfo ? {
          id: avaAccessInfo.careerInfo.id_carrera,
          nombre: avaAccessInfo.careerInfo.nombre,
          descripcion: avaAccessInfo.careerInfo.descripcion
        } : null,
        subscription: avaAccessInfo.subscription || null
      },

      tokenInfo: this.buildTokenInfo(avaAccessInfo, tokenInfo, result, `ultra_centralized_multimodal_${avaType}`),
      warnings: this.buildWarnings(tokenWarning, preValidationWarning, postResponseWarning, `${avaType}_multimodal`)
    };

    this.addWarningFlags(enhancedResult, preValidationWarning, postResponseWarning);

    return enhancedResult;
  }
};