// backend/controllers/shared/accessStatusController.js (OPTIMIZADO PARA VELOCIDAD)

import { AccessValidationService } from "../../services/shared/accessValidationService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { userAccessStatus } from "../../utils/shared/responseTemplates.js";
import { ERROR_CODES } from "../../utils/shared/errorCodes.js";
import logger from '../../utils/logger.js'; // ← WINSTON LOGGER

/**
 * ⚡ CONTROLADOR OPTIMIZADO: Estado de acceso ultrarrápido con cache agresivo
 * OBJETIVO: Reducir tiempo de respuesta de queries BD redundantes
 */
export const AccessStatusController = {

  /**
   * ⚡ ULTRA-OPTIMIZADO: Estado completo del usuario con bypass admin
   */
  async getUserAccessStatus(req, res) {
    try {
      const { userId } = req.params;

      // ✅ Validación rápida
      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario inválido"
          }
        });
      }

      // ✅ Verificación de autorización optimizada
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        logSecurityEvent('ACCESS_STATUS_UNAUTHORIZED', 'Intento de acceder al estado de otro usuario', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id_user,
          userRole: req.user.id_rol,
          ip: req.ip
        }, 'high');

        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado para ver este estado de acceso"
          }
        });
      }

      // 🚀 OBTENER TODO EL STATUS EN UNA SOLA LLAMADA OPTIMIZADA
      const [userStatus, stats] = await Promise.all([
        AccessValidationService.getUserStatus(Number(userId)),
        AccessValidationService.getUserUsageStats(Number(userId))
      ]);

      // ⚡ BYPASS DIRECTO PARA ADMINS - SIN QUERIES ADICIONALES
      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Respuesta directa sin validaciones adicionales', { userId });
        
        const adminAccessData = {
          isPremium: true,
          isAdmin: true,
          subscriptions: [],
          avas: [],
          dailyLimits: { unlimited: true },
          hourlyLimits: { unlimited: true },
          toolLimits: 'unlimited',
          privileges: {
            unlimitedTools: true,
            unlimitedTokens: true,
            accessAllAvas: true,
            adminAccess: true,
            specificToolLimits: 'unlimited'
          }
        };

        const response = userAccessStatus(Number(userId), adminAccessData);

        // ⚡ Log simplificado para admin
        logSecurityEvent('ACCESS_STATUS_CONSULTED', 'Estado de acceso admin consultado', {
          userId: userId,
          consultedBy: req.user?.id_user,
          isAdmin: true,
          ip: req.ip
        }, 'info');

        return res.json(response);
      }

      // 📋 USUARIOS REGULARES: Usar stats ya obtenidos
      logger.debug('Usuario regular - Construyendo respuesta con datos optimizados', { 
        userId, 
        isPremium: stats.isPremium 
      });

      // 🚀 NO HACER QUERIES ADICIONALES - USAR SOLO LO QUE YA TENEMOS
      const accessData = {
        isPremium: stats.isPremium,
        isAdmin: false,
        subscriptions: [],
        avas: [],
        dailyLimits: stats.dailyLimit === 'unlimited' ? { unlimited: true } : { limit: stats.dailyLimit, used: stats.todayMessages },
        hourlyLimits: stats.hourlyLimit === 'unlimited' ? { unlimited: true } : { limit: stats.hourlyLimit, used: stats.hourMessages },
        toolLimits: stats.toolLimits,
        privileges: {
          unlimitedTools: stats.isPremium,
          unlimitedTokens: false,
          accessAllAvas: false,
          adminAccess: false,
          specificToolLimits: stats.toolLimits
        }
      };

      const response = userAccessStatus(Number(userId), accessData);

      // ⚡ Log optimizado
      logSecurityEvent('ACCESS_STATUS_CONSULTED', 'Estado de acceso consultado', {
        userId: userId,
        consultedBy: req.user?.id_user,
        isPremium: stats.isPremium,
        isAdmin: false,
        ip: req.ip
      }, 'info');

      res.json(response);

    } catch (error) {
      logSecurityEvent('ACCESS_STATUS_ERROR', 'Error consultando estado de acceso', {
        userId: req.params.userId,
        consultedBy: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');

      logger.error('Error in getUserAccessStatus', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error obteniendo estado de acceso"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Verificación de AVA con bypass admin
   */
  async checkAvaAccess(req, res) {
    try {
      const { userId, avaId } = req.params;

      if (!Number.isInteger(Number(userId)) || !Number.isInteger(Number(avaId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELDS,
            message: "IDs de usuario y AVA requeridos"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        logSecurityEvent('AVA_ACCESS_CHECK_UNAUTHORIZED', 'Verificación no autorizada de acceso a AVA', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id_user,
          avaId: avaId,
          ip: req.ip
        }, 'high');

        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER STATUS UNA SOLA VEZ
      const userStatus = await AccessValidationService.getUserStatus(Number(userId));

      // ⚡ BYPASS DIRECTO PARA ADMINS
      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Acceso completo a AVA (BYPASS)', { userId, avaId });

        const adminResponse = {
          success: true,
          userId: Number(userId),
          avaId: Number(avaId),
          hasAccess: true,
          isAdmin: true,
          accessDetails: {
            canProceed: true,
            accessType: 'admin_unlimited',
            avaInfo: null, // Se puede obtener después si es necesario
            careerInfo: null,
            subscription: null,
            errorCode: null,
            adminAccess: true
          },
          timestamp: new Date().toISOString()
        };

        logSecurityEvent('AVA_ACCESS_CHECK_COMPLETED', 'Verificación de acceso a AVA completada (admin)', {
          userId: userId,
          avaId: avaId,
          requester: req.user?.id_user,
          hasAccess: true,
          isAdmin: true,
          accessType: 'admin_unlimited',
          ip: req.ip
        }, 'info');

        return res.json(adminResponse);
      }

      // 📋 USUARIOS REGULARES: Validación completa
      const validation = await AccessValidationService.validateAvaAccess(Number(userId), Number(avaId));

      logSecurityEvent('AVA_ACCESS_CHECK_COMPLETED', 'Verificación de acceso a AVA completada', {
        userId: userId,
        avaId: avaId,
        requester: req.user?.id_user,
        hasAccess: validation.canProceed,
        isAdmin: false,
        accessType: validation.accessType || 'subscription',
        ip: req.ip
      }, 'info');

      res.json({
        success: true,
        userId: Number(userId),
        avaId: Number(avaId),
        hasAccess: validation.canProceed,
        isAdmin: false,
        accessDetails: {
          canProceed: validation.canProceed,
          accessType: validation.accessType || 'subscription',
          avaInfo: validation.avaInfo,
          careerInfo: validation.careerInfo,
          subscription: validation.subscription,
          errorCode: validation.errorCode,
          adminAccess: false
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('AVA_ACCESS_CHECK_ERROR', 'Error verificando acceso a AVA', {
        userId: req.params.userId,
        avaId: req.params.avaId,
        requester: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');

      logger.error('Error checking AVA access', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error verificando acceso a AVA"
        }
      });
    }
  },

  /**
   * ⚡ ULTRA-OPTIMIZADO: Verificación de herramientas con bypass admin
   */
  async checkToolAccess(req, res) {
    try {
      const { userId } = req.params;

      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario inválido"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER TODO EN PARALELO PARA MÁXIMA VELOCIDAD
      const [userStatus, stats] = await Promise.all([
        AccessValidationService.getUserStatus(Number(userId)),
        AccessValidationService.getUserUsageStats(Number(userId))
      ]);

      // ⚡ BYPASS DIRECTO PARA ADMINS
      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Acceso ilimitado a herramientas (BYPASS)', { userId });

        const adminResponse = {
          success: true,
          userId: Number(userId),
          toolAccess: {
            canProceed: true,
            isPremium: true,
            isAdmin: true,
            type: 'admin_unlimited',
            limits: { unlimited: true },
            usage: { unlimited: true },
            specificToolLimits: 'unlimited',
            privileges: {
              unlimited: true,
              adminOverride: true,
              specificUnlimited: true
            }
          },
          timestamp: new Date().toISOString()
        };

        return res.json(adminResponse);
      }

      // 📋 USUARIOS REGULARES: Validación optimizada con datos ya obtenidos
      const validation = await AccessValidationService.validateToolAccess(Number(userId), userStatus.isPremium);

      res.json({
        success: validation.success,
        userId: Number(userId),
        toolAccess: {
          canProceed: validation.canProceed,
          isPremium: userStatus.isPremium,
          isAdmin: false,
          type: validation.type,
          limits: validation.limits,
          usage: validation.usage,
          specificToolLimits: stats.toolLimits,
          privileges: {
            unlimited: userStatus.isPremium,
            adminOverride: false,
            specificUnlimited: userStatus.isPremium
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error checking tool access', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error verificando acceso a herramientas"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Verificación específica de herramienta con bypass admin
   */
  async checkSpecificToolAccess(req, res) {
    try {
      const { userId, toolSlug } = req.params;

      if (!Number.isInteger(Number(userId)) || !toolSlug) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELDS,
            message: "ID de usuario y slug de herramienta requeridos"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER STATUS UNA SOLA VEZ
      const userStatus = await AccessValidationService.getUserStatus(Number(userId));

      // ⚡ BYPASS DIRECTO PARA ADMINS
      if (userStatus.isAdmin) {
        logger.debug('Usuario es ADMIN - Acceso directo a herramienta (BYPASS)', { 
          userId, 
          toolSlug 
        });

        const adminResponse = {
          success: true,
          userId: Number(userId),
          toolSlug: toolSlug,
          hasAccess: true,
          toolAccess: {
            canProceed: true,
            isPremium: true,
            isAdmin: true,
            type: 'admin_unlimited',
            toolId: null,
            toolName: toolSlug,
            limits: { unlimited: true },
            errorCode: null,
            specificTool: true
          },
          timestamp: new Date().toISOString()
        };

        logSecurityEvent('SPECIFIC_TOOL_ACCESS_CHECK', 'Verificación de acceso a herramienta específica (admin)', {
          userId: userId,
          toolSlug: toolSlug,
          requester: req.user?.id_user,
          hasAccess: true,
          isAdmin: true,
          ip: req.ip
        }, 'info');

        return res.json(adminResponse);
      }

      // 📋 USUARIOS REGULARES: Validación específica optimizada
      const validation = await AccessValidationService.validateSpecificToolAccess(
        Number(userId), 
        toolSlug, 
        userStatus.isPremium
      );

      logSecurityEvent('SPECIFIC_TOOL_ACCESS_CHECK', 'Verificación de acceso a herramienta específica', {
        userId: userId,
        toolSlug: toolSlug,
        requester: req.user?.id_user,
        hasAccess: validation.canProceed,
        isAdmin: false,
        isPremium: userStatus.isPremium,
        limits: validation.limits,
        ip: req.ip
      }, 'info');

      res.json({
        success: validation.success,
        userId: Number(userId),
        toolSlug: toolSlug,
        hasAccess: validation.canProceed,
        toolAccess: {
          canProceed: validation.canProceed,
          isPremium: userStatus.isPremium,
          isAdmin: false,
          type: validation.type,
          toolId: validation.toolId,
          toolName: validation.toolName || toolSlug,
          limits: validation.limits,
          errorCode: validation.errorCode,
          specificTool: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('SPECIFIC_TOOL_ACCESS_ERROR', 'Error verificando acceso a herramienta específica', {
        userId: req.params.userId,
        toolSlug: req.params.toolSlug,
        requester: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');

      logger.error('Error checking specific tool access', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error verificando acceso a herramienta específica"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Estadísticas de uso con bypass admin
   */
  async getUserUsageStats(req, res) {
    try {
      const { userId } = req.params;

      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario inválido"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER STATS OPTIMIZADOS (ya incluye verificación de admin interno)
      const stats = await AccessValidationService.getUserUsageStats(Number(userId));

      logSecurityEvent('USER_USAGE_STATS_ACCESSED', 'Estadísticas de uso consultadas', {
        userId: userId,
        requester: req.user?.id_user,
        isPremium: stats.isPremium,
        isAdmin: stats.isAdmin,
        totalMessages: stats.totalMessages,
        ip: req.ip
      }, 'info');

      // 👑 RESPUESTA ENRIQUECIDA CON INFORMACIÓN ADMIN
      const enrichedStats = {
        ...stats,
        privileges: {
          unlimitedDaily: stats.isAdmin,
          unlimitedHourly: stats.isAdmin,
          adminOverride: stats.isAdmin,
          specificToolsUnlimited: stats.isAdmin
        },
        limits: {
          daily: stats.isAdmin ? 'unlimited' : stats.dailyLimit,
          hourly: stats.isAdmin ? 'unlimited' : stats.hourlyLimit,
          type: stats.isAdmin ? 'admin_unlimited' : (stats.isPremium ? 'premium' : 'free'),
          specificTools: stats.toolLimits
        }
      };

      res.json({
        success: true,
        userId: Number(userId),
        stats: enrichedStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('USER_USAGE_STATS_ERROR', 'Error obteniendo estadísticas de uso', {
        userId: req.params.userId,
        requester: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');

      logger.error('Error getting user usage stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error obteniendo estadísticas de uso"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Configuración de límites (solo admins)
   */
  async getToolLimitsConfiguration(req, res) {
    try {
      // ✅ Solo admins pueden ver la configuración completa
      if (req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "Solo administradores pueden ver la configuración"
          }
        });
      }

      // 🚀 Obtener configuración directa (sin queries BD)
      const config = AccessValidationService.getToolLimitsConfiguration();

      logSecurityEvent('TOOL_LIMITS_CONFIG_ACCESSED', 'Configuración de límites consultada', {
        requester: req.user?.id_user,
        isAdmin: true,
        ip: req.ip
      }, 'info');

      res.json({
        success: true,
        configuration: config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting tool limits configuration', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error obteniendo configuración de límites"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Recursos accesibles con bypass admin
   */
  async getAccessibleResources(req, res) {
    try {
      const { userId } = req.params;

      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario inválido"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER STATUS OPTIMIZADO
      const [userStatus, stats] = await Promise.all([
        AccessValidationService.getUserStatus(Number(userId)),
        AccessValidationService.getUserUsageStats(Number(userId))
      ]);

      // 👑 CONSTRUIR RECURSOS CON BYPASS ADMIN
      const resources = {
        tools: {
          agent: {
            id: 'agente',
            slug: 'agente',
            name: "Agente",
            type: "tool",
            hasAccess: true,
            limits: userStatus.isAdmin ? "unlimited" : (userStatus.isPremium ? "unlimited" : "limited"),
            specificLimits: userStatus.isAdmin ? "unlimited" : (stats.toolLimits?.agente || {}),
            description: "Asistente educativo general",
            adminAccess: userStatus.isAdmin
          },
          pdf: {
            id: 'pdf',
            slug: 'pdf',
            name: "PDF",
            type: "tool",
            hasAccess: true,
            limits: userStatus.isAdmin ? "unlimited" : (userStatus.isPremium ? "unlimited" : "limited"),
            specificLimits: userStatus.isAdmin ? "unlimited" : (stats.toolLimits?.pdf || {}),
            description: "Análisis de documentos PDF",
            adminAccess: userStatus.isAdmin
          }
        },
        avas: [],
        features: {
          unlimitedTools: userStatus.isAdmin || userStatus.isPremium,
          unlimitedTokens: userStatus.isAdmin,
          avaAccess: false,
          premiumSupport: userStatus.isAdmin || userStatus.isPremium,
          adminPrivileges: userStatus.isAdmin,
          specificToolLimits: stats.toolLimits,
          tokenLimitPerChat: userStatus.isAdmin ? 'unlimited' : 50000
        }
      };

      res.json({
        success: true,
        userId: Number(userId),
        isAdmin: userStatus.isAdmin,
        resources,
        summary: {
          totalTools: 2,
          accessibleTools: 2,
          totalAvas: 0,
          isPremium: userStatus.isPremium,
          isAdmin: userStatus.isAdmin,
          accessType: userStatus.isAdmin ? 'admin_unlimited' : (userStatus.isPremium ? 'premium' : 'free'),
          specificToolLimitsConfigured: Object.keys(stats.toolLimits || {}).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getAccessibleResources', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error obteniendo recursos accesibles"
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Carreras accesibles con bypass admin
   */
  async getAccessibleCareers(req, res) {
    try {
      const { userId } = req.params;

      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario debe ser un número"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        logSecurityEvent('ACCESSIBLE_CAREERS_UNAUTHORIZED', 'Consulta no autorizada de carreras accesibles', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id_user,
          ip: req.ip
        }, 'high');

        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 BYPASS ADMIN DIRECTO
      const userStatus = await AccessValidationService.getUserStatus(Number(userId));

      // Para simplificar, usar array vacío por ahora - se puede expandir
      const careers = [];

      logSecurityEvent('ACCESSIBLE_CAREERS_ACCESS', 'Consulta de carreras accesibles', {
        userId: userId,
        requester: req.user?.id_user,
        careersCount: careers.length,
        isAdmin: userStatus.isAdmin,
        ip: req.ip
      }, 'info');
      
      res.status(200).json({
        success: true,
        userId: Number(userId),
        isAdmin: userStatus.isAdmin,
        careers: careers.map(career => ({
          ...career,
          adminAccess: userStatus.isAdmin
        })),
        summary: {
          totalAccessibleCareers: careers.length,
          hasAccessToCareers: careers.length > 0,
          accessType: userStatus.isAdmin ? 'admin_unlimited' : 'subscription',
          adminPrivileges: userStatus.isAdmin
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('ACCESSIBLE_CAREERS_ERROR', 'Error obteniendo carreras accesibles', {
        userId: req.params.userId,
        requester: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');
      
      logger.error('Error getting accessible careers', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.DATABASE_ERROR,
          message: `Error obteniendo carreras accesibles: ${error.message}`
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Verificación de carrera con bypass admin
   */
  async checkCareerAccess(req, res) {
    try {
      const { userId, careerId } = req.params;

      if (!Number.isInteger(Number(userId)) || !Number.isInteger(Number(careerId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "Los IDs deben ser números"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        logSecurityEvent('CAREER_ACCESS_UNAUTHORIZED', 'Verificación no autorizada de acceso a carrera', {
          requestedUserId: userId,
          authenticatedUserId: req.user.id_user,
          careerId: careerId,
          ip: req.ip
        }, 'high');

        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 BYPASS ADMIN DIRECTO
      const userStatus = await AccessValidationService.getUserStatus(Number(userId));
      const hasAccess = userStatus.isAdmin; // Los admins tienen acceso a todo

      logSecurityEvent('CAREER_ACCESS_CHECK', 'Verificación de acceso a carrera', {
        userId: userId,
        careerId: careerId,
        hasAccess: hasAccess,
        isAdmin: userStatus.isAdmin,
        accessType: userStatus.isAdmin ? 'admin_unlimited' : 'subscription',
        requester: req.user?.id_user,
        ip: req.ip
      }, 'info');
      
      res.status(200).json({
        success: true,
        userId: Number(userId),
        careerId: Number(careerId),
        hasAccess,
        isAdmin: userStatus.isAdmin,
        accessType: userStatus.isAdmin ? 'admin_unlimited' : 'subscription',
        adminPrivileges: userStatus.isAdmin,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('CAREER_ACCESS_ERROR', 'Error verificando acceso a carrera', {
        userId: req.params.userId,
        careerId: req.params.careerId,
        requester: req.user?.id_user,
        error: error.message,
        ip: req.ip
      }, 'medium');
      
      logger.error('Error checking career access', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.DATABASE_ERROR,
          message: `Error verificando acceso: ${error.message}`
        }
      });
    }
  },

  /**
   * ⚡ OPTIMIZADO: Recomendaciones de upgrade con bypass admin
   */
  async getUpgradeRecommendations(req, res) {
    try {
      const { userId } = req.params;

      if (!Number.isInteger(Number(userId))) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION.INVALID_USER_ID,
            message: "ID de usuario inválido"
          }
        });
      }

      // ✅ Verificación de autorización
      if (req.user?.id_user && Number(userId) !== req.user.id_user && req.user?.id_rol !== 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
            message: "No autorizado"
          }
        });
      }

      // 🚀 OBTENER STATUS OPTIMIZADO
      const [userStatus, stats] = await Promise.all([
        AccessValidationService.getUserStatus(Number(userId)),
        AccessValidationService.getUserUsageStats(Number(userId))
      ]);

      const recommendations = [];

      // 👑 ADMINS NO NECESITAN RECOMENDACIONES DE UPGRADE
      if (!userStatus.isAdmin) {
        if (!userStatus.isPremium) {
          // Verificar si está cerca de los límites específicos por herramienta
          const toolLimits = stats.toolLimits || {};
          let needsUpgrade = false;
          
          Object.keys(toolLimits).forEach(toolSlug => {
            const limits = toolLimits[toolSlug];
            if (limits && limits.daily) {
              const dailyUsage = stats.todayMessages / limits.daily;
              if (dailyUsage > 0.8) {
                needsUpgrade = true;
              }
            }
          });

          if (needsUpgrade) {
            recommendations.push({
              type: 'premium_upgrade',
              priority: 'high',
              title: 'Actualiza a Premium',
              reason: 'Estás cerca de alcanzar tus límites específicos por herramienta',
              benefits: [
                'Acceso ilimitado a todas las herramientas',
                'Sin límites específicos por herramienta (PDF y Agente)',
                'Sin límites de mensajes por día',
                'Soporte prioritario'
              ],
              action: {
                url: '/tienda',
                buttonText: 'Actualizar a Premium'
              }
            });
          }
        }
      }

      logSecurityEvent('UPGRADE_RECOMMENDATIONS_CONSULTED', 'Recomendaciones de upgrade consultadas', {
        userId: userId,
        isPremium: userStatus.isPremium,
        isAdmin: userStatus.isAdmin,
        recommendationsCount: recommendations.length,
        ip: req.ip
      }, 'info');

      res.json({
        success: true,
        userId: Number(userId),
        isAdmin: userStatus.isAdmin,
        currentStatus: {
          isPremium: userStatus.isPremium,
          isAdmin: userStatus.isAdmin,
          accessibleAvas: 0,
          usage: {
            dailyUsage: userStatus.isAdmin ? 'unlimited' : `${stats.todayMessages}/${stats.dailyLimit}`,
            hourlyUsage: userStatus.isAdmin ? 'unlimited' : `${stats.hourMessages}/${stats.hourlyLimit}`,
            specificToolLimits: stats.toolLimits
          },
          privileges: {
            unlimitedAccess: userStatus.isAdmin,
            adminOverride: userStatus.isAdmin
          }
        },
        recommendations,
        message: userStatus.isAdmin ? 'Los administradores tienen acceso completo sin restricciones' : undefined,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logSecurityEvent('UPGRADE_RECOMMENDATIONS_ERROR', 'Error obteniendo recomendaciones de upgrade', {
        userId: req.params.userId,
        error: error.message,
        ip: req.ip
      }, 'medium');

      logger.error('Error in getUpgradeRecommendations', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
          message: "Error obteniendo recomendaciones"
        }
      });
    }
  }
};