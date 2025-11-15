
import pool from "../../lib/dbPool.js";
import { ERROR_CODES } from "../../utils/shared/errorCodes.js";
import { tokenCounter } from "./tokenCounterService.js";
import logger from '../../utils/logger.js';



const TOOL_LIMITS_CONFIG = {
  'pdf': {
    FREE_DAILY: 40,
    FREE_HOURLY: 20,
    PREMIUM_DAILY: 1000,
    PREMIUM_HOURLY: 1000
  },
  'agente': {
    FREE_DAILY: 40,
    FREE_HOURLY: 20,
    PREMIUM_DAILY: 1000,
    PREMIUM_HOURLY: 1000
  }
};

const TOKEN_LIMITS = {
  MAX_TOKENS_PER_CHAT: 50000,
  get WARNING_TOKENS() {
    return Math.round(this.MAX_TOKENS_PER_CHAT * 0.75);
  },
  get WARNING_PERCENTAGE() {
    return 75;
  }
};

export const AccessValidationService = {

  _userStatusCache: new Map(),
  _userCacheTTL: 300000, // 5 minutos
  _toolInfoCache: new Map(),
  _toolCacheExpiry: 0,
  _CACHE_TTL: 300000, // 5 minutos

  LIMITS: {
    TOOLS: (() => {
      const processed = { FREE_USER: {}, PREMIUM_USER: {} };
      Object.keys(TOOL_LIMITS_CONFIG).forEach(toolSlug => {
        const config = TOOL_LIMITS_CONFIG[toolSlug];
        processed.FREE_USER[toolSlug.toUpperCase()] = {
          MESSAGES_PER_DAY: config.FREE_DAILY,
          MESSAGES_PER_HOUR: config.FREE_HOURLY
        };
        processed.PREMIUM_USER[toolSlug.toUpperCase()] = {
          MESSAGES_PER_DAY: config.PREMIUM_DAILY,
          MESSAGES_PER_HOUR: config.PREMIUM_HOURLY
        };
      });
      return processed;
    })(),
    TOKENS: {
      MAX_TOKENS_PER_CHAT: TOKEN_LIMITS.MAX_TOKENS_PER_CHAT,
      WARNING_THRESHOLD: TOKEN_LIMITS.WARNING_TOKENS,
      WARNING_PERCENTAGE: TOKEN_LIMITS.WARNING_PERCENTAGE
    }
  },

  async getUserStatus(userId) {
    const cacheKey = `user_${userId}`;
    const now = Date.now();

    const cached = this._userStatusCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this._userCacheTTL) {
      return cached.data;
    }

    try {
      const query = `
        SELECT 
          p.id_rol,
          CASE WHEN p.id_rol = 3 THEN true ELSE false END as is_admin,
          CASE WHEN COUNT(s.id) > 0 THEN true ELSE false END as is_premium
        FROM perfil p
        LEFT JOIN suscripciones s ON p.id_usuario = s.id_user 
          AND s.status IN ('active', 'paused')
          AND (s.next_billed_at > NOW() OR s.next_billed_at IS NULL)
        WHERE p.id_usuario = $1
        GROUP BY p.id_rol
      `;

      const result = await pool.query(query, [userId]);

      const userStatus = {
        isAdmin: result.rows.length > 0 ? result.rows[0].is_admin : false,
        isPremium: result.rows.length > 0 ? result.rows[0].is_premium : false,
        userRole: result.rows.length > 0 ? result.rows[0].id_rol : null
      };

      this._userStatusCache.set(cacheKey, {
        data: userStatus,
        timestamp: now
      });

      if (this._userStatusCache.size > 1000) {
        const oldestKey = this._userStatusCache.keys().next().value;
        this._userStatusCache.delete(oldestKey);
      }

      logger.debug('User status retrieved', {
        userId,
        isAdmin: userStatus.isAdmin,
        isPremium: userStatus.isPremium
      });

      return userStatus;

    } catch (error) {
      logger.error('Error obteniendo user status', { userId, error: error.message });
      return {
        isAdmin: false,
        isPremium: false,
        userRole: null
      };
    }
  },

  async isAdminUser(userId) {
    const status = await this.getUserStatus(userId);
    return status.isAdmin;
  },

  async isPremiumUser(userId) {
    const status = await this.getUserStatus(userId);
    return status.isPremium || status.isAdmin; // Admins son premium+
  },

  async getToolInfo(toolSlug) {
    try {
      const now = Date.now();
      if (this._toolInfoCache.has(toolSlug) && now < this._toolCacheExpiry) {
        return this._toolInfoCache.get(toolSlug);
      }

      const client = await pool.connect();
      try {
        const query = 'SELECT id, nombre, slug, descripcion FROM herramienta WHERE slug = $1';
        const result = await client.query(query, [toolSlug]);

        if (result.rows.length === 0) {
          throw new Error(`Herramienta con slug '${toolSlug}' no encontrada`);
        }

        const toolInfo = result.rows[0];

        this._toolInfoCache.set(toolSlug, toolInfo);
        this._toolCacheExpiry = now + this._CACHE_TTL;

        return toolInfo;

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error(`Error obteniendo info de herramienta '${toolSlug}'`, { error: error.message });
      throw error;
    }
  },

  async validateSpecificToolAccess(userId, toolSlug, isPremium = null) {
    try {
      logger.debug('Validando acceso específico a herramienta', { toolSlug, userId });

      const userStatus = await this.getUserStatus(userId);

      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Acceso ilimitado', { userId, toolSlug });
        return {
          success: true,
          canProceed: true,
          type: 'admin_unlimited',
          toolSlug,
          isAdmin: true,
          limits: {
            daily: { unlimited: true },
            hourly: { unlimited: true }
          }
        };
      }

      if (isPremium === null) {
        isPremium = userStatus.isPremium;
      }

      const [toolInfo, usageStats] = await Promise.all([
        this.getToolInfo(toolSlug),
        this._getUsageStatsOptimized(userId, toolSlug)
      ]);

      const toolId = toolInfo.id;
      const toolKey = toolSlug.toUpperCase();
      const userType = isPremium ? 'PREMIUM_USER' : 'FREE_USER';
      const limits = this.LIMITS.TOOLS[userType][toolKey];

      if (!limits) {
        logger.warn(`No hay límites configurados para herramienta '${toolSlug}'`);
        const defaultLimits = {
          MESSAGES_PER_DAY: isPremium ? 1000 : 5,
          MESSAGES_PER_HOUR: isPremium ? 1000 : 5
        };
        return this._validateToolWithLimitsOptimized(usageStats, defaultLimits, isPremium, toolSlug, toolId);
      }

      return this._validateToolWithLimitsOptimized(usageStats, limits, isPremium, toolSlug, toolId);

    } catch (error) {
      logger.error(`Error validando acceso específico a '${toolSlug}'`, { error: error.message });
      throw new Error(`Error validando acceso a herramienta: ${error.message}`);
    }
  },

  async _getUsageStatsOptimized(userId, toolSlug = null) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const client = await pool.connect();

    try {
      let statsQuery, queryParams;

      if (toolSlug) {
        statsQuery = `
          WITH time_bounds AS (
            SELECT 
              $3::timestamp as today_start,
              $4::timestamp as hour_start
          )
          SELECT 
            COUNT(CASE WHEN ch.timestamp >= tb.today_start THEN 1 END) as daily_used,
            COUNT(CASE WHEN ch.timestamp >= tb.hour_start THEN 1 END) as hourly_used
          FROM chat_history ch
          INNER JOIN chat c ON ch.id_chat = c.id_chat
          INNER JOIN herramienta h ON c.id_herramienta = h.id
          CROSS JOIN time_bounds tb
          WHERE ch.id_user = $1 
          AND h.slug = $2
          AND ch.role = 'user'
        `;
        queryParams = [userId, toolSlug, todayStart, hourStart];
      } else {
        statsQuery = `
          WITH time_bounds AS (
            SELECT 
              $2::timestamp as today_start,
              $3::timestamp as hour_start
          )
          SELECT 
            COUNT(CASE WHEN ch.timestamp >= tb.today_start AND c.id_herramienta IS NOT NULL THEN 1 END) as daily_used,
            COUNT(CASE WHEN ch.timestamp >= tb.hour_start AND c.id_herramienta IS NOT NULL THEN 1 END) as hourly_used,
            COUNT(CASE WHEN ch.role = 'user' THEN 1 END) as total_messages,
            COUNT(DISTINCT ch.id_chat) as total_chats
          FROM chat_history ch
          INNER JOIN chat c ON ch.id_chat = c.id_chat
          CROSS JOIN time_bounds tb
          WHERE ch.id_user = $1 
          AND ch.role = 'user'
        `;
        queryParams = [userId, todayStart, hourStart];
      }

      const result = await client.query(statsQuery, queryParams);
      return result.rows[0];

    } finally {
      client.release();
    }
  },

  _validateToolWithLimitsOptimized(usageStats, limits, isPremium, toolSlug, toolId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const dailyUsed = parseInt(usageStats.daily_used) || 0;
    const hourlyUsed = parseInt(usageStats.hourly_used) || 0;

    const dailyLimit = limits.MESSAGES_PER_DAY;
    const hourlyLimit = limits.MESSAGES_PER_HOUR;

    const dailyResetTime = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const hourlyResetTime = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const dailyExceeded = dailyUsed >= dailyLimit;
    const hourlyExceeded = hourlyUsed >= hourlyLimit;

    logger.debug('Validación de límites de herramienta', {
      toolSlug,
      dailyUsed,
      dailyLimit,
      hourlyUsed,
      hourlyLimit,
      dailyExceeded,
      hourlyExceeded
    });

    return {
      success: !dailyExceeded && !hourlyExceeded,
      canProceed: !dailyExceeded && !hourlyExceeded,
      type: isPremium ? 'premium' : 'limited',
      toolSlug,
      toolId,
      toolName: toolSlug,
      isPremium,
      isAdmin: false,
      limits: {
        daily: {
          used: dailyUsed,
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - dailyUsed),
          resetTime: dailyResetTime,
          exceeded: dailyExceeded
        },
        hourly: {
          used: hourlyUsed,
          limit: hourlyLimit,
          remaining: Math.max(0, hourlyLimit - hourlyUsed),
          resetTime: hourlyResetTime,
          exceeded: hourlyExceeded
        }
      },
      errorCode: dailyExceeded
        ? ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED
        : (hourlyExceeded ? ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED : null)
    };
  },

  async validateToolAccess(userId, isPremium = null) {
    try {
      logger.debug('Validación general de herramientas iniciada', { userId, isPremium });

      const userStatus = await this.getUserStatus(userId);

      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Acceso ilimitado general concedido', { userId });
        return {
          success: true,
          canProceed: true,
          type: 'admin_unlimited',
          isPremium: true,
          isAdmin: true,
          limits: {
            daily: { unlimited: true },
            hourly: { unlimited: true }
          }
        };
      }

      if (isPremium === null) {
        isPremium = userStatus.isPremium;
      }

      if (isPremium) {
        return {
          success: true,
          canProceed: true,
          type: 'unlimited',
          isPremium: true,
          isAdmin: false
        };
      }

      const usageStats = await this._getUsageStatsOptimized(userId);

      const dailyUsed = parseInt(usageStats.daily_used) || 0;
      const hourlyUsed = parseInt(usageStats.hourly_used) || 0;

      const maxDailyLimit = Math.max(...Object.values(TOOL_LIMITS_CONFIG).map(cfg => cfg.FREE_DAILY));
      const maxHourlyLimit = Math.max(...Object.values(TOOL_LIMITS_CONFIG).map(cfg => cfg.FREE_HOURLY));

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const dailyResetTime = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const hourlyResetTime = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const dailyExceeded = dailyUsed >= maxDailyLimit;
      const hourlyExceeded = hourlyUsed >= maxHourlyLimit;

      return {
        success: !dailyExceeded && !hourlyExceeded,
        canProceed: !dailyExceeded && !hourlyExceeded,
        type: 'limited',
        isPremium: false,
        isAdmin: false,
        limits: {
          daily: {
            used: dailyUsed,
            limit: maxDailyLimit,
            remaining: Math.max(0, maxDailyLimit - dailyUsed),
            resetTime: dailyResetTime,
            exceeded: dailyExceeded
          },
          hourly: {
            used: hourlyUsed,
            limit: maxHourlyLimit,
            remaining: Math.max(0, maxHourlyLimit - hourlyUsed),
            resetTime: hourlyResetTime,
            exceeded: hourlyExceeded
          }
        },
        errorCode: dailyExceeded
          ? ERROR_CODES.TOOL_ACCESS.DAILY_LIMIT_REACHED
          : (hourlyExceeded ? ERROR_CODES.TOOL_ACCESS.HOURLY_LIMIT_REACHED : null)
      };

    } catch (error) {
      logger.error('Error validating tool access', { error: error.message });
      throw new Error(`Error validando acceso a herramientas: ${error.message}`);
    }
  },

  async validateAvaAccess(userId, avaId) {
    try {
      console.log(`🔍 [ACCESS-VALIDATION] === VALIDANDO ACCESO AVA ===`);
      console.log(`🔍 [ACCESS-VALIDATION] Usuario: ${userId}, AVA: ${avaId}`);

      const userStatus = await this.getUserStatus(userId);
      console.log(`🔍 [ACCESS-VALIDATION] User status:`, {
        isAdmin: userStatus.isAdmin,
        isPremium: userStatus.isPremium,
        userRole: userStatus.userRole
      });

      if (userStatus.isAdmin) {
        console.log(`👑 [ACCESS-VALIDATION] Usuario es ADMIN - Acceso completo concedido`);

        try {
          const client = await pool.connect();
          try {
            const avaQuery = `
            SELECT 
              a.id_ava, a.nom_ava, a.descripcion as ava_descripcion, a.id_carrera,
              c.nombre as carrera_nombre, c.descripcion as carrera_descripcion, c.imagen as carrera_imagen
            FROM ava a
            INNER JOIN carrera c ON a.id_carrera = c.id_carrera
            WHERE a.id_ava = $1
          `;

            const avaResult = await client.query(avaQuery, [avaId]);

            if (avaResult.rows.length === 0) {
              console.log(`❌ [ACCESS-VALIDATION] AVA no encontrado: ${avaId}`);
              return {
                success: false,
                canProceed: false,
                errorCode: ERROR_CODES.AVA_ACCESS.INVALID_AVA,
                avaInfo: null,
                isAdmin: true
              };
            }

            const avaInfo = avaResult.rows[0];
            console.log(`✅ [ACCESS-VALIDATION] Admin accede a AVA: ${avaInfo.nom_ava} (carrera: ${avaInfo.carrera_nombre})`);

            return {
              success: true,
              canProceed: true,
              isAdmin: true,
              accessType: 'admin_unlimited',
              avaInfo,
              careerInfo: {
                id_carrera: avaInfo.id_carrera,
                nombre: avaInfo.carrera_nombre,
                descripcion: avaInfo.carrera_descripcion,
                imagen: avaInfo.carrera_imagen
              },
              subscription: {
                id: 'admin_access',
                status: 'admin_unlimited',
                expiration: null,
                created_at: new Date()
              }
            };

          } finally {
            client.release();
          }
        } catch (error) {
          console.warn(`⚠️ [ACCESS-VALIDATION] Error obteniendo info del AVA ${avaId} para admin:`, error.message);
          return {
            success: true,
            canProceed: true,
            isAdmin: true,
            accessType: 'admin_unlimited'
          };
        }
      }

      console.log(`📋 [ACCESS-VALIDATION] Usuario regular - Verificando suscripción específica a carrera`);
      console.log(`⚠️ [ACCESS-VALIDATION] IMPORTANTE: Ser premium NO da acceso automático a AVAs`);

      const client = await pool.connect();

      try {
        const combinedQuery = `
        SELECT 
          a.id_ava, a.nom_ava, a.descripcion as ava_descripcion, a.id_carrera,
          c.nombre as carrera_nombre, c.descripcion as carrera_descripcion, c.imagen as carrera_imagen,
          s.id as subscription_id, s.status, s.next_billed_at, s.created_at,
          s.customer_id, s.subscription_id as external_subscription_id,
          CASE 
            WHEN s.status IN ('active', 'paused') AND 
                 (s.next_billed_at > NOW() OR s.next_billed_at IS NULL)
            THEN true
            ELSE false
          END as has_access
        FROM ava a
        INNER JOIN carrera c ON a.id_carrera = c.id_carrera
        LEFT JOIN suscripciones s ON c.id_carrera = s.id_carrera 
          AND s.id_user = $1 
          AND s.status IN ('active', 'paused')
        WHERE a.id_ava = $2
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

        console.log(`🔍 [ACCESS-VALIDATION] Ejecutando query de validación...`);
        const result = await client.query(combinedQuery, [userId, avaId]);

        if (result.rows.length === 0) {
          console.log(`❌ [ACCESS-VALIDATION] AVA no encontrado en BD: ${avaId}`);
          return {
            success: false,
            canProceed: false,
            errorCode: ERROR_CODES.AVA_ACCESS.INVALID_AVA,
            avaInfo: null,
            isAdmin: false
          };
        }

        const data = result.rows[0];

        console.log(`🔍 [ACCESS-VALIDATION] Datos obtenidos:`, {
          avaId: data.id_ava,
          avaName: data.nom_ava,
          carreraId: data.id_carrera,
          carreraName: data.carrera_nombre,
          subscriptionId: data.subscription_id,
          subscriptionStatus: data.status,
          hasAccess: data.has_access,
          nextBilledAt: data.next_billed_at
        });

        const avaInfo = {
          id_ava: data.id_ava,
          nom_ava: data.nom_ava,
          descripcion: data.ava_descripcion,
          id_carrera: data.id_carrera,
          carrera_nombre: data.carrera_nombre,
          carrera_descripcion: data.carrera_descripcion,
          carrera_imagen: data.carrera_imagen
        };

        const careerInfo = {
          id_carrera: data.id_carrera,
          nombre: data.carrera_nombre,
          descripcion: data.carrera_descripcion,
          imagen: data.carrera_imagen
        };

        if (!data.has_access || !data.subscription_id) {
          console.log(`❌ [ACCESS-VALIDATION] ACCESO DENEGADO - Usuario ${userId} NO tiene suscripción activa a carrera "${data.carrera_nombre}"`);
          console.log(`📋 [ACCESS-VALIDATION] Detalles del rechazo:`, {
            hasAccess: data.has_access,
            subscriptionId: data.subscription_id,
            subscriptionStatus: data.status,
            userIsPremium: userStatus.isPremium,
            mensaje: 'Ser premium no da acceso automático a AVAs - se requiere suscripción específica'
          });

          return {
            success: false,
            canProceed: false,
            errorCode: ERROR_CODES.AVA_ACCESS.CAREER_NOT_PURCHASED,
            isAdmin: false,
            avaInfo,
            careerInfo,
            userStatus: {
              isPremium: userStatus.isPremium,
              needsSpecificSubscription: true
            },
            message: `Se requiere suscripción específica a la carrera "${data.carrera_nombre}" para acceder a este AVA`
          };
        }

        console.log(`✅ [ACCESS-VALIDATION] ACCESO CONCEDIDO - Usuario ${userId} tiene suscripción válida a carrera "${data.carrera_nombre}"`);
        console.log(`📋 [ACCESS-VALIDATION] Detalles del acceso:`, {
          subscriptionId: data.subscription_id,
          subscriptionStatus: data.status,
          externalSubscriptionId: data.external_subscription_id,
          nextBilledAt: data.next_billed_at,
          userIsPremium: userStatus.isPremium
        });

        return {
          success: true,
          canProceed: true,
          isAdmin: false,
          accessType: 'career_subscription',
          avaInfo,
          careerInfo,
          subscription: {
            id: data.subscription_id,
            status: data.status,
            expiration: data.next_billed_at,
            created_at: data.created_at,
            customer_id: data.customer_id,
            external_subscription_id: data.external_subscription_id
          },
          userStatus: {
            isPremium: userStatus.isPremium,
            hasSpecificSubscription: true
          },
          message: `Acceso concedido por suscripción a carrera "${data.carrera_nombre}"`
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ [ACCESS-VALIDATION] Error crítico en validateAvaAccess:', error);
      console.error('🔍 [ACCESS-VALIDATION] Stack trace:', error.stack);

      // En caso de error, DENEGAR acceso por seguridad
      return {
        success: false,
        canProceed: false,
        isAdmin: false,
        errorCode: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        error: error.message,
        message: 'Error interno verificando acceso - acceso denegado por seguridad'
      };
    }
  },

  async validateTokenLimits(chatId, userId = null) {
    try {
      logger.debug('Validación de límites de tokens', { chatId, userId });

      if (userId) {
        const userStatus = await this.getUserStatus(userId);

        if (userStatus.isAdmin) {
          logger.debug('Usuario es ADMIN - Sin límites de tokens', { userId });
          return {
            success: true,
            canProceed: true,
            isAdmin: true,
            tokenInfo: {
              current: 0,
              max: 'unlimited',
              percentage: 0,
              remaining: 'unlimited',
              warningLevel: 'none',
              messageCount: 0,
              method: 'admin_unlimited',
              warningThreshold: 'unlimited'
            }
          };
        }
      }

      logger.debug('Usando tokenCounter optimizado', { chatId });

      const tokenResult = await tokenCounter.updateChatTokens(chatId);

      const totalTokens = tokenResult.totalTokens;
      const maxTokens = TOKEN_LIMITS.MAX_TOKENS_PER_CHAT;
      const warningTokens = TOKEN_LIMITS.WARNING_TOKENS;
      const percentage = (totalTokens / maxTokens) * 100;

      logger.debug('Tokens calculados', {
        chatId,
        totalTokens,
        maxTokens,
        percentage: percentage.toFixed(1),
        method: tokenResult.method
      });

      if (totalTokens >= maxTokens) {
        logger.warn('Chat excedió límite de tokens', { chatId, totalTokens, maxTokens });
        return {
          success: false,
          canProceed: false,
          isAdmin: false,
          errorCode: ERROR_CODES.TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED,
          tokenInfo: {
            current: totalTokens,
            max: maxTokens,
            percentage: Math.round(percentage),
            remaining: 0,
            messageCount: tokenResult.messageCount,
            method: tokenResult.method,
            exceedsLimit: true,
            warningThreshold: warningTokens,
            fromCache: tokenResult.fromCache
          }
        };
      }

      let warningLevel = 'none';
      if (totalTokens >= warningTokens) {
        warningLevel = 'high';
        logger.warn('Warning de tokens activado al 75%', { chatId, percentage: percentage.toFixed(1) });
      }

      return {
        success: true,
        canProceed: true,
        isAdmin: false,
        tokenInfo: {
          current: totalTokens,
          max: maxTokens,
          percentage: Math.round(percentage),
          remaining: maxTokens - totalTokens,
          warningLevel,
          messageCount: tokenResult.messageCount,
          method: tokenResult.method,
          warningThreshold: warningTokens,
          warningPercentage: TOKEN_LIMITS.WARNING_PERCENTAGE,
          fromCache: tokenResult.fromCache
        },
        warning: warningLevel !== 'none' ? {
          code: ERROR_CODES.TOKEN_LIMITS.WARNING_THRESHOLD,
          level: warningLevel,
          message: `Tokens al ${percentage.toFixed(1)}% del límite (75% alcanzado)`,
          percentage: Math.round(percentage),
          warningTokens: warningTokens,
          maxTokens: maxTokens
        } : null
      };

    } catch (error) {
      logger.error('Error en validación de límites de tokens', { error: error.message });

      return {
        success: true,
        canProceed: true,
        isAdmin: false,
        tokenInfo: {
          current: 0,
          max: TOKEN_LIMITS.MAX_TOKENS_PER_CHAT,
          percentage: 0,
          remaining: TOKEN_LIMITS.MAX_TOKENS_PER_CHAT,
          warningLevel: 'none',
          messageCount: 0,
          method: 'fallback_safe',
          warningThreshold: TOKEN_LIMITS.WARNING_TOKENS
        },
        fallback: true,
        error: error.message
      };
    }
  },

  async validateTokensWithResponseEstimate(chatId, userId = null, query = "", responseType = "normal") {
    try {
      logger.debug('Pre-validación de tokens iniciada', { chatId, userId, queryLength: query.length });

      if (userId) {
        const userStatus = await this.getUserStatus(userId);
        if (userStatus.isAdmin) {
          logger.debug('Usuario es ADMIN - Sin límites (pre-validación)', { userId });
          return {
            success: true,
            canProceed: true,
            isAdmin: true,
            preValidation: {
              current: 0,
              estimated: 0,
              max: 'unlimited',
              safetyMargin: 'unlimited',
              method: 'admin_unlimited'
            }
          };
        }
      }

      const currentValidation = await this.validateTokenLimits(chatId, userId);
      if (!currentValidation.success) {
        return currentValidation;
      }

      const currentTokens = currentValidation.tokenInfo.current;
      const maxTokens = TOKEN_LIMITS.MAX_TOKENS_PER_CHAT;

      const queryTokens = tokenCounter.countTokens(query);
      const responseTokensEstimate = tokenCounter.estimateResponseTokens(query, responseType);
      const totalNewTokens = queryTokens + responseTokensEstimate;
      const projectedTotal = currentTokens + totalNewTokens;

      const safetyMargin = Math.floor(maxTokens * 0.1);
      const safeLimit = maxTokens - safetyMargin;

      logger.debug('Pre-validación calculada', {
        currentTokens,
        projectedTotal,
        maxTokens,
        queryTokens,
        responseTokensEstimate
      });

      if (projectedTotal > maxTokens) {
        logger.warn('Proyección excede límite de tokens', {
          projectedTotal,
          maxTokens,
          chatId
        });
        return {
          success: false,
          canProceed: false,
          isAdmin: false,
          errorCode: ERROR_CODES.TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED,
          preValidation: {
            current: currentTokens,
            queryTokens: queryTokens,
            responseEstimated: responseTokensEstimate,
            projected: projectedTotal,
            max: maxTokens,
            exceeded: true,
            method: 'optimized_cache'
          },
          suggestion: `La consulta completa excedería el límite de ${maxTokens.toLocaleString()} tokens. Haz una pregunta más específica o inicia un nuevo chat`
        };
      }

      const warning = projectedTotal > safeLimit ? {
        level: 'high',
        message: `La consulta podría acercarse al límite de tokens`,
        current: currentTokens,
        queryTokens: queryTokens,
        responseEstimated: responseTokensEstimate,
        projected: projectedTotal,
        safeLimit: safeLimit
      } : null;

      return {
        success: true,
        canProceed: true,
        isAdmin: false,
        preValidation: {
          current: currentTokens,
          queryTokens: queryTokens,
          responseEstimated: responseTokensEstimate,
          projected: projectedTotal,
          max: maxTokens,
          safeLimit: safeLimit,
          exceeded: false,
          method: 'optimized_cache'
        },
        warning
      };

    } catch (error) {
      logger.error('Error en pre-validación de tokens', { error: error.message });
      return {
        success: true,
        canProceed: true,
        error: error.message,
        fallback: true
      };
    }
  },

  async recalculateTokenWarningsAfterResponse(chatId, userId = null) {
    try {
      if (userId) {
        const userStatus = await this.getUserStatus(userId);
        if (userStatus.isAdmin) {
          return null; // Sin warnings para admins
        }
      }

      await tokenCounter.invalidateChatCache(chatId);
      const currentValidation = await this.validateTokenLimits(chatId, userId);

      if (!currentValidation.success) {
        return {
          type: 'token_limit_exceeded',
          level: 'critical',
          message: `Chat excedió el límite de ${TOKEN_LIMITS.MAX_TOKENS_PER_CHAT.toLocaleString()} tokens`,
          action: {
            type: 'new_chat_required',
            message: 'Debes iniciar un nuevo chat para continuar',
            buttonText: 'Nuevo Chat'
          },
          tokenInfo: currentValidation.tokenInfo
        };
      }

      const tokenInfo = currentValidation.tokenInfo;
      const percentage = tokenInfo.percentage || 0;

      if (tokenInfo.current >= TOKEN_LIMITS.WARNING_TOKENS) {
        return {
          type: 'token_limit_warning',
          level: 'high',
          message: `Chat acercándose al límite (${Math.round(percentage)}% de ${TOKEN_LIMITS.MAX_TOKENS_PER_CHAT.toLocaleString()} tokens usado)`,
          percentage: Math.round(percentage),
          action: {
            type: 'new_chat_recommended',
            message: 'Considera iniciar un nuevo chat pronto',
            buttonText: 'Nuevo Chat'
          },
          tokenInfo: {
            current: tokenInfo.current,
            max: tokenInfo.max,
            remaining: tokenInfo.remaining,
            percentage: Math.round(percentage),
            method: tokenInfo.method,
            warningThreshold: TOKEN_LIMITS.WARNING_TOKENS,
            warningPercentage: TOKEN_LIMITS.WARNING_PERCENTAGE
          }
        };
      }

      return null;

    } catch (error) {
      logger.error('Error en post-response warning', { error: error.message });
      return null;
    }
  },

  async getUserUsageStats(userId) {
    try {
      const userStatus = await this.getUserStatus(userId);

      const usageStats = await this._getUsageStatsOptimized(userId);

      return {
        todayMessages: parseInt(usageStats.daily_used) || 0,
        hourMessages: parseInt(usageStats.hourly_used) || 0,
        totalMessages: parseInt(usageStats.total_messages) || 0,
        totalChats: parseInt(usageStats.total_chats) || 0,
        isPremium: userStatus.isPremium,
        isAdmin: userStatus.isAdmin,
        dailyLimit: userStatus.isAdmin ? 'unlimited' : (userStatus.isPremium ? 1000 : Math.max(...Object.values(TOOL_LIMITS_CONFIG).map(cfg => cfg.FREE_DAILY))),
        hourlyLimit: userStatus.isAdmin ? 'unlimited' : (userStatus.isPremium ? 1000 : Math.max(...Object.values(TOOL_LIMITS_CONFIG).map(cfg => cfg.FREE_HOURLY))),
        avaUsage: {},
        tokenLimits: {
          maxTokensPerChat: userStatus.isAdmin ? 'unlimited' : TOKEN_LIMITS.MAX_TOKENS_PER_CHAT,
          warningThreshold: userStatus.isAdmin ? 'unlimited' : TOKEN_LIMITS.WARNING_TOKENS,
          warningPercentage: TOKEN_LIMITS.WARNING_PERCENTAGE
        },
        toolLimits: userStatus.isAdmin ? 'unlimited' : Object.keys(TOOL_LIMITS_CONFIG).reduce((acc, toolSlug) => {
          const config = TOOL_LIMITS_CONFIG[toolSlug];
          acc[toolSlug] = {
            daily: userStatus.isPremium ? config.PREMIUM_DAILY : config.FREE_DAILY,
            hourly: userStatus.isPremium ? config.PREMIUM_HOURLY : config.FREE_HOURLY
          };
          return acc;
        }, {})
      };

    } catch (error) {
      logger.error('Error getting user usage stats', { error: error.message });
      throw new Error(`Error obteniendo estadísticas de uso: ${error.message}`);
    }
  },

  getTokenConfiguration() {
    return {
      maxTokensPerChat: TOKEN_LIMITS.MAX_TOKENS_PER_CHAT,
      warningTokens: TOKEN_LIMITS.WARNING_TOKENS,
      warningPercentage: TOKEN_LIMITS.WARNING_PERCENTAGE,
      configurationLastUpdated: new Date().toISOString(),
      systemType: 'warning_only_75_percent_optimized'
    };
  },

  getToolLimitsConfiguration() {
    return {
      toolLimits: TOOL_LIMITS_CONFIG,
      processedLimits: this.LIMITS.TOOLS,
      availableTools: Object.keys(TOOL_LIMITS_CONFIG),
      configurationLastUpdated: new Date().toISOString(),
      systemType: 'dynamic_tool_limits'
    };
  },

  clearUserStatusCache(userId = null) {
    if (userId) {
      this._userStatusCache.delete(`user_${userId}`);
    } else {
      this._userStatusCache.clear();
    }
  }
};