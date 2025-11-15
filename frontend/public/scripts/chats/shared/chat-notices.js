

class SimpleTokenWarningManager {
  constructor() {
    this.chatWarnings = new Map();
    this.messageWarnings = new WeakMap();
  }

  getCurrentChatId() {
    try {
      const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
      return 'default_chat';
    } catch (e) {
      return 'default_chat';
    }
  }

  hasShownWarning(messageElement = null) {
    const chatId = this.getCurrentChatId();
    const chatState = this.chatWarnings.get(chatId);
    if (chatState && chatState.hasWarning) {
      return true;
    }
    if (messageElement && this.messageWarnings.has(messageElement)) {
      const messageState = this.messageWarnings.get(messageElement);
      return messageState.hasWarning;
    }
    return false;
  }

  hasShownLimit(messageElement = null) {
    const chatId = this.getCurrentChatId();
    const chatState = this.chatWarnings.get(chatId);
    if (chatState && chatState.hasLimit) {
      return true;
    }
    if (messageElement && this.messageWarnings.has(messageElement)) {
      const messageState = this.messageWarnings.get(messageElement);
      return messageState.hasLimit;
    }
    return false;
  }

  markWarningShown(messageElement) {
    const chatId = this.getCurrentChatId();
    const chatState = this.chatWarnings.get(chatId) || { hasWarning: false, hasLimit: false };
    chatState.hasWarning = true;
    this.chatWarnings.set(chatId, chatState);

    if (messageElement) {
      const messageState = this.messageWarnings.get(messageElement) || { hasWarning: false, hasLimit: false };
      messageState.hasWarning = true;
      this.messageWarnings.set(messageElement, messageState);
    }
    console.log(`✅ [BACKEND-ALIGNED] WARNING marcado como mostrado para chat ${chatId}`);
  }

  markLimitShown(messageElement) {
    const chatId = this.getCurrentChatId();
    const chatState = this.chatWarnings.get(chatId) || { hasWarning: false, hasLimit: false };
    chatState.hasLimit = true;
    this.chatWarnings.set(chatId, chatState);

    if (messageElement) {
      const messageState = this.messageWarnings.get(messageElement) || { hasWarning: false, hasLimit: false };
      messageState.hasLimit = true;
      this.messageWarnings.set(messageElement, messageState);
    }
    console.log(`✅ [BACKEND-ALIGNED] LIMIT EXCEEDED marcado como mostrado para chat ${chatId}`);
  }

  clearChat(chatId = null) {
    const targetChatId = chatId || this.getCurrentChatId();
    if (this.chatWarnings.has(targetChatId)) {
      this.chatWarnings.delete(targetChatId);
      console.log(`🧹 [BACKEND-ALIGNED] Estado limpiado para chat ${targetChatId}`);
    }
  }

  clearAll() {
    const count = this.chatWarnings.size;
    this.chatWarnings.clear();
    if (count > 0) {
      console.log(`🧹 [BACKEND-ALIGNED] ${count} chats limpiados del estado`);
    }
  }

  getStatus() {
    return {
      totalChats: this.chatWarnings.size,
      currentChat: this.getCurrentChatId(),
      currentChatState: this.chatWarnings.get(this.getCurrentChatId()) || null
    };
  }
}

const simpleTokenManager = new SimpleTokenWarningManager();


const CONFIG = {
  NOTICE_TYPES: {
    TOKEN_WARNING: {
      id: 'token_warning',
      className: 'warning',
      icon: 'bx-error-circle',
      title: '⚠️ Acadel detecta sobrecarga cerebral',
      persistent: false,
      autoHide: false
    },
    TOKEN_LIMIT: {
      id: 'token_limit',
      className: 'error',
      icon: 'bx-x-circle',
      title: '🧠 Cerebro de capibara saturado',
      persistent: true,
      autoHide: false
    },
    NO_AVA_ACCESS: {
      id: 'no_ava_access',
      className: 'info',
      icon: 'bx-lock-alt',
      title: '🔒 Zona VIP académica',
      persistent: true,
      autoHide: false
    },
    FREE_USER_LIMIT: {
      id: 'free_user_limit',
      className: 'warning',
      icon: 'bx-time-five',
      title: '⏰ Límite de usuario gratuito alcanzado',
      persistent: true,
      autoHide: false
    },
    TOOL_LIMIT: {
      id: 'tool_limit',
      className: 'warning',
      icon: 'bx-time-five',
      title: '⏰ Límite de herramienta alcanzado',
      persistent: true,
      autoHide: false
    }
  },
  ANIMATION_DURATION: 300,
  AUTO_SCROLL_DELAY: 100,
  SELECTORS: {
    MESSAGE: '.message.ai-message',
    NOTICE: '.chat-notice',
    NOTICE_CONTAINER: '.message-content'
  }
};

// Estado del módulo - 100% DINÁMICO DEL BACKEND
let state = {
  shownNotices: new Set(),
  activeNotices: new Map(),
  storageKey: 'acadel_chatNotices',
  currentChatId: null,
  initialized: false,
  dynamicLimits: {
    maxTokensPerChat: null,
    warningThreshold: null,
    warningTokens: null,
    criticalTokens: null,
    warningPercentage: null,
    limitPercentage: null,
    lastUpdated: null,
    source: 'backend_only_exact_match',
    isFullyDynamic: true
  }
};

function shouldShowWarning(currentTokens, maxTokens, tokenInfo = null) {
  console.log(`📊 [BACKEND-ALIGNED] shouldShowWarning(${currentTokens}, ${maxTokens})`);

  if (tokenInfo && tokenInfo.isAdmin) {
    console.log(`👑 [BACKEND-ALIGNED] Admin detectado - Sin warnings`);
    return false;
  }

  if (tokenInfo && tokenInfo.max === 'unlimited') {
    console.log(`💎 [BACKEND-ALIGNED] Usuario premium con tokens ilimitados - Sin warnings`);
    return false;
  }

  if (typeof currentTokens !== 'number' || typeof maxTokens !== 'number' || maxTokens <= 0) {
    console.warn(`⚠️ [BACKEND-ALIGNED] Datos básicos inválidos para warning`);
    return false;
  }

  if (tokenInfo && tokenInfo.warningLevel) {
    const result = tokenInfo.warningLevel === 'high';
    console.log(`📊 [BACKEND-ALIGNED] Warning por warningLevel=${tokenInfo.warningLevel}: ${result}`);
    return result;
  }

  if (tokenInfo && tokenInfo.warningThreshold && typeof tokenInfo.warningThreshold === 'number') {
    const result = currentTokens >= tokenInfo.warningThreshold;
    console.log(`📊 [BACKEND-ALIGNED] Warning por warningThreshold=${tokenInfo.warningThreshold}: ${result}`);
    return result;
  }

  if (state.dynamicLimits.warningThreshold && typeof state.dynamicLimits.warningThreshold === 'number') {
    const result = currentTokens >= state.dynamicLimits.warningThreshold;
    console.log(`📊 [BACKEND-ALIGNED] Warning por threshold dinámico=${state.dynamicLimits.warningThreshold}: ${result}`);
    return result;
  }

  const warningThreshold = Math.round(maxTokens * 0.75);
  const result = currentTokens >= warningThreshold;

  console.log(`📊 [BACKEND-ALIGNED] Warning EXACTO como backend: current=${currentTokens}, threshold=${warningThreshold}(75% de ${maxTokens}): ${result}`);

  return result;
}
function shouldShowLimit(currentTokens, maxTokens, tokenInfo = null) {
  console.log(`📊 [BACKEND-ALIGNED] shouldShowLimit(${currentTokens}, ${maxTokens})`);

  if (tokenInfo && (tokenInfo.isAdmin || tokenInfo.max === 'unlimited')) {
    return false;
  }

  if (typeof currentTokens !== 'number' || typeof maxTokens !== 'number' || maxTokens <= 0) {
    console.warn(`⚠️ [BACKEND-ALIGNED] Datos básicos inválidos para limit`);
    return false;
  }

  if (tokenInfo && tokenInfo.criticalThreshold && typeof tokenInfo.criticalThreshold === 'number') {
    const result = currentTokens >= tokenInfo.criticalThreshold;
    console.log(`📊 [BACKEND-ALIGNED] Limit por criticalThreshold=${tokenInfo.criticalThreshold}: ${result}`);
    return result;
  }

  if (state.dynamicLimits.criticalTokens && typeof state.dynamicLimits.criticalTokens === 'number') {
    const result = currentTokens >= state.dynamicLimits.criticalTokens;
    console.log(`📊 [BACKEND-ALIGNED] Limit por threshold crítico dinámico=${state.dynamicLimits.criticalTokens}: ${result}`);
    return result;
  }

  // COPIA EXACTA de AccessValidationService: "if (totalTokens >= maxTokens)"
  const result = currentTokens >= maxTokens;
  console.log(`📊 [BACKEND-ALIGNED] Limit EXACTO como backend: current=${currentTokens} >= max=${maxTokens}: ${result}`);

  return result;
}

function updateDynamicLimits(tokenInfo) {
  if (!tokenInfo || typeof tokenInfo !== 'object') {
    console.warn(`⚠️ [BACKEND-ALIGNED] tokenInfo inválido:`, tokenInfo);
    return false;
  }

  let updated = false;

  if (tokenInfo.max && typeof tokenInfo.max === 'number' && tokenInfo.max > 0) {
    state.dynamicLimits.maxTokensPerChat = tokenInfo.max;
    updated = true;
  }

  if (tokenInfo.warningThreshold && typeof tokenInfo.warningThreshold === 'number') {
    state.dynamicLimits.warningThreshold = tokenInfo.warningThreshold;
    state.dynamicLimits.warningTokens = tokenInfo.warningThreshold;
    updated = true;
  }

  if (tokenInfo.criticalThreshold && typeof tokenInfo.criticalThreshold === 'number') {
    state.dynamicLimits.criticalTokens = tokenInfo.criticalThreshold;
    updated = true;
  }

  if (tokenInfo.warningPercentage && typeof tokenInfo.warningPercentage === 'number') {
    state.dynamicLimits.warningPercentage = tokenInfo.warningPercentage;
    updated = true;
  }

  if (tokenInfo.limitPercentage && typeof tokenInfo.limitPercentage === 'number') {
    state.dynamicLimits.limitPercentage = tokenInfo.limitPercentage;
    updated = true;
  }

  if (updated) {
    state.dynamicLimits.lastUpdated = new Date();
    console.log(`📊 [BACKEND-ALIGNED] Límites actualizados EXACTAMENTE del backend`);
  }

  return updated;
}

export function updateDynamicToolLimits(toolLimitsData) {
  if (!toolLimitsData || typeof toolLimitsData !== 'object') {
    console.warn(`⚠️ [TOOL LIMITS] Datos inválidos:`, toolLimitsData);
    return false;
  }

  console.log(`📊 [TOOL LIMITS] Actualizando límites dinámicos:`, toolLimitsData);

  if (!window.dynamicToolLimits) {
    window.dynamicToolLimits = {};
  }

  window.dynamicToolLimits[toolLimitsData.toolSlug] = {
    daily: toolLimitsData.daily,
    hourly: toolLimitsData.hourly,
    type: toolLimitsData.type,
    isUnlimited: toolLimitsData.isUnlimited || false,

    warningThresholds: toolLimitsData.warningThresholds || {
      daily: toolLimitsData.daily?.limit ? Math.round(toolLimitsData.daily.limit * 0.8) : 0,
      hourly: toolLimitsData.hourly?.limit ? Math.round(toolLimitsData.hourly.limit * 0.8) : 0
    },

    lastUpdated: new Date().toISOString()
  };

  if (toolLimitsData.type === 'free_user_limits' && toolLimitsData.daily && toolLimitsData.daily.limit > 0) {
    const { used, limit } = toolLimitsData.daily;
    const percentage = (used / limit) * 100;

    const warningThreshold = toolLimitsData.warningThresholds?.daily || Math.round(limit * 0.8);
    const warningPercentage = (warningThreshold / limit) * 100;

    console.log(`📊 [TOOL LIMITS] ${toolLimitsData.toolSlug}: ${used}/${limit} (${percentage.toFixed(1)}%) - Warning at ${warningThreshold} (${warningPercentage}%)`);

    if (used >= warningThreshold) {
      console.log(`⚠️ [TOOL LIMITS] ${toolLimitsData.toolSlug} alcanzó threshold dinámico`);

      setTimeout(() => {
        const lastAiMessage = document.querySelector('.chat-messages .ai-message:last-child');
        if (lastAiMessage && typeof showFreeUserLimitNotice === 'function') {
          showFreeUserLimitNotice(
            lastAiMessage,
            'daily',
            {
              used: used,
              limit: limit,
              remaining: limit - used,
              resetTime: toolLimitsData.daily.resetTime,
              toolName: toolLimitsData.toolSlug,
              percentage: percentage,
              warningThreshold: warningThreshold,
              isExact: true,
              source: 'dynamic_backend_limits'
            }
          );
        }
      }, 500);
    }
  }

  return true;
}

export function detectAndShowNotices(messageElement, backendResponse) {
  if (!messageElement || !backendResponse) return;

  try {
    let responseData = backendResponse;
    if (typeof backendResponse === 'string') {
      try {
        responseData = JSON.parse(backendResponse);
      } catch (e) {
        return;
      }
    }

    console.log('🔍 [BACKEND-ALIGNED] Analizando respuesta EXACTA del backend');

    if (responseData.accessInfo?.isAdmin || responseData.tokenInfo?.isAdmin) {
      console.log('👑 [BACKEND-ALIGNED] Admin detectado - Sin avisos');
      return;
    }

    if (responseData.tokenInfo?.max === 'unlimited') {
      console.log('💎 [BACKEND-ALIGNED] Usuario premium con tokens ilimitados - Sin avisos');
      return;
    }

    if (responseData.error && !responseData.success) {
      handleBackendError(messageElement, responseData);
      return;
    }

    const backendFlags = {
      hasPreWarning: responseData._hasPreWarning,
      preWarningExact: responseData._preWarningExact,
      hasPostWarning: responseData._hasPostWarning,
      postWarningLevel: responseData._postWarningLevel,
      shouldShowTokenWarning: responseData._shouldShowTokenWarning,
      warningPercentage: responseData._warningPercentage,
      warningExactCalculation: responseData._warningExactCalculation
    };

    const activeFlags = Object.keys(backendFlags).filter(key => backendFlags[key]);

    if (activeFlags.length > 0) {
      console.log(`🚨 [BACKEND-ALIGNED] FLAGS EXACTOS del tokenManager detectados:`, activeFlags);

      if (responseData.tokenInfo && responseData.tokenInfo.current && responseData.tokenInfo.max) {
        const { current, max } = responseData.tokenInfo;

        if (shouldShowWarning(current, max, responseData.tokenInfo)) {
          showTokenWarningNotice(messageElement, current, max, responseData.tokenInfo);
          return;
        }

        if (shouldShowLimit(current, max, responseData.tokenInfo)) {
          showTokenLimitNotice(messageElement, max, responseData.tokenInfo);
          return;
        }
      }
    }

    if (responseData.toolLimits && responseData.toolLimits.toolSlug) {
      console.log(`🔧 [BACKEND-ALIGNED] Detectando límites específicos para: ${responseData.toolLimits.toolSlug}`);

      updateDynamicToolLimits(responseData.toolLimits);

      if (responseData.toolLimits.type === 'free_user_limits' && responseData.toolLimits.hasExceeded) {
        console.log(`⚠️ [BACKEND-ALIGNED] Límite excedido para ${responseData.toolLimits.toolSlug}`);

        const limitType = responseData.toolLimits.daily?.exceeded ? 'daily' : 'hourly';
        const limitData = responseData.toolLimits[limitType];

        showSpecificToolLimitNotice(messageElement, {
          toolSlug: responseData.toolLimits.toolSlug,
          limitType: limitType,
          specificLimits: limitData,
          resetTime: limitData.resetTime
        }, responseData);
        return;
      }
    }

    if (responseData.warnings && Array.isArray(responseData.warnings)) {
      handleBackendWarningsExact(messageElement, responseData.warnings, responseData);
      return;
    }

    if (responseData.tokenInfo && responseData.tokenInfo.current && responseData.tokenInfo.max) {
      const { current, max } = responseData.tokenInfo;

      if (shouldShowLimit(current, max, responseData.tokenInfo)) {
        showTokenLimitNotice(messageElement, max, responseData.tokenInfo);
        return;
      }

      if (shouldShowWarning(current, max, responseData.tokenInfo)) {
        showTokenWarningNotice(messageElement, current, max, responseData.tokenInfo);
        return;
      }
    }

  } catch (error) {
    console.warn('⚠️ [BACKEND-ALIGNED] Error procesando respuesta:', error);
  }
}

function handleBackendWarningsExact(messageElement, warnings, responseData) {
  console.log(`📊 [BACKEND-ALIGNED] Procesando warnings array EXACTO del tokenManager`);

  const tokenWarnings = warnings.filter(w =>
    w.type && (
      w.type === 'token_limit_pre' ||           // EXACTO de tokenManager.buildWarnings
      w.type === 'token_pre_validation_exact' ||
      w.type.startsWith('token_pre_validation_exact_') ||
      w.type === 'token_limit_warning'
    ) && w.level === 'high'  // EXACTO como tokenManager: level debe ser 'high'
  );

  if (tokenWarnings.length > 0) {
    const firstWarning = tokenWarnings[0];
    console.log(`⚠️ [BACKEND-ALIGNED] Warning detectado tipo: ${firstWarning.type}`);

    if (firstWarning.tokenInfo || responseData.tokenInfo) {
      const tokenInfo = firstWarning.tokenInfo || responseData.tokenInfo;
      const { current, max } = tokenInfo;

      if (shouldShowWarning(current, max, tokenInfo)) {
        showTokenWarningNotice(messageElement, current, max, tokenInfo);
      } else if (shouldShowLimit(current, max, tokenInfo)) {
        showTokenLimitNotice(messageElement, max, tokenInfo);
      }
    }
  }
}

function showBackendToolLimitNotice(messageElement, backendData) {
  console.log(`📊 [BACKEND TOOL NOTICE] Datos recibidos del backend:`, backendData);

  const toolSlug = backendData.toolSlug || 'unknown';
  const toolName = backendData.toolName ||
    backendData.toolInfo?.name ||
    backendData.toolInfo?.nombre ||
    toolSlug.toUpperCase();

  const limitType = backendData.activeLimitType ||
    (backendData.limits?.daily?.exceeded ? 'daily' : 'hourly');

  const limitData = backendData.activeLimitData ||
    backendData.limits?.[limitType] ||
    {};

  console.log(`🔧 [TOOL NOTICE] Datos procesados:`, {
    toolSlug,
    toolName,
    limitType,
    limitData,
    hasResetTime: !!limitData.resetTime
  });

  const used = limitData.used;
  const limit = limitData.limit;
  const remaining = limitData.remaining;
  const percentage = limitData.percentage;
  const resetTime = limitData.resetTime;

  let message, details;

  if (limitType === 'daily') {
    if (used !== undefined && limit !== undefined) {
      message = `🚫 Límite diario alcanzado para ${toolName}: ${used}/${limit} mensajes`;
    } else {
      message = `🚫 Límite diario alcanzado para ${toolName}`;
    }
  } else {
    if (used !== undefined && limit !== undefined) {
      message = `⏱️ Límite por hora alcanzado para ${toolName}: ${used}/${limit} mensajes`;
    } else {
      message = `⏱️ Límite por hora alcanzado para ${toolName}`;
    }
  }

  if (resetTime) {
    const resetDate = new Date(resetTime);
    const now = new Date();

    if (limitType === 'daily') {
      const resetTimeString = resetDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      if (resetDate.toDateString() === now.toDateString()) {
        details = `Se restablece hoy a las ${resetTimeString}.`;
      } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (resetDate.toDateString() === tomorrow.toDateString()) {
          details = `Se restablece mañana a las ${resetTimeString}.`;
        } else {
          details = `Se restablece el ${resetDate.toLocaleDateString('es-ES')} a las ${resetTimeString}.`;
        }
      }
    } else {
      const diffMs = resetDate - now;
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));

      if (diffMinutes <= 1) {
        details = `Se restablece en menos de 1 minuto.`;
      } else if (diffMinutes < 60) {
        details = `Se restablece en ${diffMinutes} minutos.`;
      } else {
        const resetTimeString = resetDate.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });
        details = `Se restablece a las ${resetTimeString}.`;
      }
    }

    if (remaining !== undefined) {
      details += ` Tendrás ${remaining} mensajes adicionales.`;
    }
    if (percentage !== undefined) {
      details += ` (${percentage.toFixed(1)}% usado)`;
    }
  } else {
    console.warn(`⚠️ [BACKEND ERROR] No se recibió resetTime del backend para ${toolName}`);
    details = `Error: No se pudo obtener tiempo de restablecimiento del backend.`;
  }

  console.log(`✅ [BACKEND TOOL NOTICE] Mostrando aviso:`, {
    message,
    details,
    toolName,
    limitType,
    resetTime,
    source: 'backend_exact_data'
  });

  showNotice(messageElement, {
    type: 'TOOL_LIMIT',
    message,
    details,
    actionButton: {
      text: '💎 Upgrade a Premium',
      action: 'upgrade_for_tool',
      handler: () => {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🛒 Acadel recomienda upgrade', `Acceso ilimitado a ${toolName} con Premium`);
        }
        window.open(`/tienda?source=tool_limit&tool=${toolSlug}`, '_blank');
      }
    }
  });
}

function handleBackendError(messageElement, responseData) {
  const { error } = responseData;
  const errorCode = error?.code || '';

  console.log(`🚫 [BACKEND ERROR] Procesando error del backend:`, {
    code: errorCode,
    hasAvaInfo: !!responseData.avaInfo,
    hasCareerInfo: !!responseData.careerInfo,
    responseData: responseData
  });

  if (errorCode.includes('AVA_ACCESS')) {
    console.log(`🔒 [AVA ACCESS] Mostrando aviso de acceso denegado`);
    
    const avaName = responseData.avaInfo?.nom_ava || 'contenido académico especializado';
    const careerName = responseData.careerInfo?.nombre || 'esta carrera';
    
    if (errorCode === 'AVA_ACCESS.CAREER_NOT_PURCHASED') {
      showFreeUserAvaAccessNotice(messageElement, avaName, careerName, responseData.upgradeInfo || {});
      return;
    } else {
      showNoAvaAccessNotice(messageElement, avaName, responseData.upgradeInfo || {});
      return;
    }
  }

  if (errorCode.includes('TOOL_') && errorCode.includes('_LIMIT_REACHED')) {
    console.log(`🔧 [TOOL LIMIT] Usando datos COMPLETOS del backend`);
    showBackendToolLimitNotice(messageElement, responseData);
    return;
  }

  if (errorCode.includes('TOKEN_LIMITS')) {
    showTokenLimitNotice(messageElement, error.maxTokens, responseData.tokenInfo);
    return;
  }

  console.warn(`⚠️ [BACKEND ERROR] Error no manejado específicamente:`, errorCode);
}


export function debugBackendData(backendResponse) {
  console.group('🔍 [DEBUG] Datos completos del backend');
  console.log('📊 Response raw:', backendResponse);

  if (backendResponse.toolSlug) {
    console.log('🔧 Tool detectada:', {
      toolSlug: backendResponse.toolSlug,
      toolName: backendResponse.toolInfo?.name,
      toolId: backendResponse.toolInfo?.id
    });
  }

  if (backendResponse.limits) {
    console.log('📊 Límites:', {
      daily: backendResponse.limits.daily,
      hourly: backendResponse.limits.hourly
    });
  }

  if (backendResponse.toolLimits) {
    console.log('🎯 Tool Limits:', backendResponse.toolLimits);
  }

  console.groupEnd();
  return backendResponse;
}

export function showTokenWarningNotice(messageElement, currentTokens, maxTokens, tokenInfo = null, forceShow = false) {
  // Bypass admin/premium
  if (shouldBypassNotices(tokenInfo)) {
    return;
  }

  if (!validateTokenData(currentTokens, maxTokens)) {
    return;
  }

  if (shouldBypassNotices(tokenInfo)) {
    return;
  }

  if (simpleTokenManager.hasShownWarning(messageElement)) {
    console.log(`🚫 [BACKEND-ALIGNED] WARNING ya mostrado para este chat - BLOQUEADO`);
    return;
  }

  if (!shouldShowWarning(currentTokens, maxTokens, tokenInfo)) {
    console.log(`🚫 [BACKEND-ALIGNED] No procede warning según backend`);
    return;
  }

  updateDynamicLimits({ max: maxTokens, current: currentTokens, ...tokenInfo });

  simpleTokenManager.markWarningShown(messageElement);

  showNotice(messageElement, {
    type: 'TOKEN_WARNING',
    message: `⚠️ Mi cerebro de capibara está llegando al límite de la conversación`,
    details: `Acadel sugiere preparar un nuevo chat pronto para mejores respuestas.`,
    actionButton: {
      text: '📋 Entendido',
      action: 'acknowledge_warning',
      handler: () => {
        const noticeElement = messageElement.querySelector('.chat-notice[data-notice-type="token_warning"]');
        if (noticeElement) {
          const noticeKey = noticeElement.getAttribute('data-notice-key');
          hideNotice(noticeElement, noticeKey);
        }
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('👌 Acadel apreciado', 'Gracias por estar atento. Seguiré funcionando bien por un tiempo más.');
        }
      }
    }
  });

  console.log(`✅ [BACKEND-ALIGNED] WARNING mostrado según configuración EXACTA del backend`);
}

export function showTokenLimitNotice(messageElement, maxTokens = null, tokenInfo = null, forceShow = false) {
  if (shouldBypassNotices(tokenInfo)) {
    return;
  }

  if (!forceShow && simpleTokenManager.hasShownLimit(messageElement)) {
    console.log(`🚫 [BACKEND-ALIGNED] LIMIT EXCEEDED ya mostrado para este chat - BLOQUEADO`);
    return;
  }
  if (tokenInfo && (tokenInfo.isAdmin || tokenInfo.max === 'unlimited')) {
    console.log(`🚫 [BACKEND-ALIGNED] Usuario admin/premium ilimitado - Limit bloqueado`);
    return;
  }

  if (simpleTokenManager.hasShownLimit(messageElement)) {
    console.log(`🚫 [BACKEND-ALIGNED] LIMIT EXCEEDED ya mostrado para este chat - BLOQUEADO`);
    return;
  }

  if (typeof maxTokens === 'number') {
    updateDynamicLimits({ max: maxTokens, current: maxTokens, ...tokenInfo });
  }

  simpleTokenManager.markLimitShown(messageElement);

  showNotice(messageElement, {
    type: 'TOKEN_LIMIT',
    message: `🚨 ¡ALTO! Mi cerebro de capibara alcanzó su máxima capacidad para esta conversación`,
    details: `Acadel procesó todo el contenido posible y NECESITA una nueva conversación. Hasta los capibaras más inteligentes tienen límites.`,
    actionButton: {
      text: '🎓 Nuevo Chat Obligatorio',
      action: 'new_chat_required',
      handler: () => {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🚀 Acadel al rescate', 'Creando nuevo chat para continuar');
        }
        setTimeout(() => {
          if (typeof handleNewChat === 'function') {
            handleNewChat();
            return;
          }
          if (typeof window.handleNewChat === 'function') {
            window.handleNewChat();
            return;
          }
          const currentPath = window.location.pathname;
          const basePath = currentPath.split('/').slice(0, 2).join('/');
          history.pushState({}, '', basePath);
          window.location.reload();
        }, 500);
      }
    }
  });

  console.log(`🚨 [BACKEND-ALIGNED] LIMIT EXCEEDED mostrado según backend`);
}

function shouldBypassNotices(tokenInfo) {
  return tokenInfo && (tokenInfo.isAdmin || tokenInfo.max === 'unlimited');
}

export function showSmartTokenNotice(messageElement, currentTokens, maxTokens, percentage = null, tokenInfo = null) {
  if (shouldBypassNotices(tokenInfo)) {
    return 'admin_or_premium_unlimited';
  }

  if (!validateTokenData(currentTokens, maxTokens)) {
    console.warn(`⚠️ [BACKEND-ALIGNED] Datos de tokens inválidos del backend`);
    return 'invalid_tokens';
  }

  updateDynamicLimits({ max: maxTokens, current: currentTokens, ...tokenInfo });

  console.log(`🤖 [BACKEND-ALIGNED] Evaluando según backend EXACTO sin mostrar cantidades`);

  if (shouldShowLimit(currentTokens, maxTokens, tokenInfo)) {
    console.log(`🚨 [BACKEND-ALIGNED] CRÍTICO según backend`);
    showTokenLimitNotice(messageElement, maxTokens, tokenInfo);
    return 'limit_exceeded';
  }

  if (shouldShowWarning(currentTokens, maxTokens, tokenInfo)) {
    if (!simpleTokenManager.hasShownWarning(messageElement)) {
      console.log(`⚠️ [BACKEND-ALIGNED] WARNING según backend`);
      showTokenWarningNotice(messageElement, currentTokens, maxTokens, tokenInfo);
      return 'warning_shown';
    } else {
      console.log(`🚫 [BACKEND-ALIGNED] WARNING ya mostrado según backend`);
      return 'warning_already_shown';
    }
  }

  console.log(`✅ [BACKEND-ALIGNED] OK según backend`);
  return 'no_notice_needed';
}


function validateTokenData(currentTokens, maxTokens) {
  if (typeof currentTokens !== 'number' || currentTokens < 0) {
    console.warn(`⚠️ [BACKEND-ALIGNED] currentTokens inválido: ${currentTokens}`);
    return false;
  }

  if (typeof maxTokens !== 'number' || maxTokens <= 0) {
    console.warn(`⚠️ [BACKEND-ALIGNED] maxTokens inválido: ${maxTokens}`);
    return false;
  }

  return true;
}

function getCurrentChatId() {
  try {
    const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    return window.app?.state?.currentChat?.id ||
      window.getState?.('currentChat')?.id ||
      'acadel_default_chat';
  } catch (e) {
    console.warn('Acadel no pudo determinar el chatId:', e);
    return 'acadel_default_chat';
  }
}


function createNoticeElement(config, data) {
  const { message, details, actionButton, noticeKey } = data;

  const noticeDiv = document.createElement('div');
  noticeDiv.className = `chat-notice acadel-notice ${config.className}`;
  noticeDiv.setAttribute('data-notice-type', config.id);
  noticeDiv.setAttribute('data-notice-key', noticeKey);
  noticeDiv.setAttribute('data-acadel-notice', 'true');

  const iconDiv = document.createElement('div');
  iconDiv.className = 'notice-icon acadel-icon';
  const iconElement = document.createElement('i');
  iconElement.className = `bx ${config.icon}`;
  iconDiv.appendChild(iconElement);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'notice-content acadel-content';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'notice-title acadel-title';
  titleDiv.textContent = config.title;
  contentDiv.appendChild(titleDiv);

  const messageDiv = document.createElement('div');
  messageDiv.className = 'notice-message acadel-message';
  messageDiv.textContent = message;
  contentDiv.appendChild(messageDiv);

  if (details) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'notice-details acadel-details';
    detailsDiv.textContent = details;
    contentDiv.appendChild(detailsDiv);
  }

  if (actionButton) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'notice-actions acadel-actions';
    const button = document.createElement('button');
    button.className = 'notice-action-btn acadel-action-btn';
    button.setAttribute('data-action', actionButton.action || 'default');
    button.textContent = actionButton.text;

    button.addEventListener('click', () => {
      if (typeof actionButton.handler === 'function') {
        actionButton.handler();
      } else if (actionButton.url) {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🌍 Acadel te redirige', 'Abriendo nueva ventana académica en 3... 2... 1...');
        }
        window.open(actionButton.url, '_blank');
      }
    });

    actionsDiv.appendChild(button);
    contentDiv.appendChild(actionsDiv);
  }

  const closeDiv = document.createElement('div');
  closeDiv.className = 'notice-close acadel-close';
  const closeButton = document.createElement('button');
  closeButton.className = 'notice-close-btn acadel-close-btn';
  closeButton.setAttribute('aria-label', 'Cerrar aviso de Acadel');
  closeButton.setAttribute('title', 'Acadel entiende que ya leíste esto');
  const closeIcon = document.createElement('i');
  closeIcon.className = 'bx bx-x';
  closeButton.appendChild(closeIcon);

  closeButton.addEventListener('click', () => {
    if (typeof window.acadelInfo === 'function') {
      window.acadelInfo('👋 Acadel se despide', 'Aviso cerrado. Acadel estará aquí cuando me necesites');
    }
    hideNotice(noticeDiv, noticeKey);
  });

  closeDiv.appendChild(closeButton);

  noticeDiv.appendChild(iconDiv);
  noticeDiv.appendChild(contentDiv);
  noticeDiv.appendChild(closeDiv);

  return noticeDiv;
}

function hideNotice(noticeElement, noticeKey) {
  if (!noticeElement) return;

  noticeElement.style.opacity = '0';
  noticeElement.style.transform = 'translateX(100%) scale(0.9)';
  noticeElement.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  setTimeout(() => {
    if (noticeElement.parentNode) {
      noticeElement.parentNode.removeChild(noticeElement);
    }
  }, CONFIG.ANIMATION_DURATION);

  if (noticeKey) {
    state.shownNotices.delete(noticeKey);
    state.activeNotices.delete(noticeKey);
    removeNoticeFromStorage(noticeKey);
  }
}

function removeExistingNotice(messageElement, type) {
  const noticeTypeId = CONFIG.NOTICE_TYPES[type]?.id;
  if (!noticeTypeId) return;

  const existingNotices = messageElement.querySelectorAll(
    `.chat-notice[data-notice-type="${noticeTypeId}"]`
  );

  existingNotices.forEach(notice => {
    const noticeKey = notice.getAttribute('data-notice-key');
    hideNotice(notice, noticeKey);
  });
}

function saveNoticeToStorage(noticeKey) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(state.storageKey) || '[]');
    if (!stored.includes(noticeKey)) {
      stored.push(noticeKey);
      sessionStorage.setItem(state.storageKey, JSON.stringify(stored));
    }
  } catch (e) {
    console.warn('Acadel tuvo problemas guardando el aviso:', e);
  }
}

function removeNoticeFromStorage(noticeKey) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(state.storageKey) || '[]');
    const filtered = stored.filter(key => key !== noticeKey);
    sessionStorage.setItem(state.storageKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Acadel tuvo problemas eliminando el aviso:', e);
  }
}

function loadStoredNotices() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(state.storageKey) || '[]');
    stored.forEach(noticeKey => {
      state.shownNotices.add(noticeKey);
    });
  } catch (e) {
    console.warn('Acadel tuvo problemas cargando avisos guardados:', e);
  }
}

export function initChatNotices(options = {}) {
  if (state.initialized) return;

  state.currentChatId = getCurrentChatId();
  loadStoredNotices();

  window.addEventListener('popstate', () => {
    clearChatNotices();
    state.currentChatId = getCurrentChatId();
  });

  document.addEventListener('newChatCreated', () => {
    clearChatNotices();
    state.currentChatId = getCurrentChatId();
  });

  state.initialized = true;
  console.log('🦫 Sistema de avisos 100% ALINEADO CON BACKEND del Profesor Acadel inicializado correctamente');
}

export function showNotice(aiMessageElement, noticeData) {
  const { type, message, details, actionButton } = noticeData;
  const noticeConfig = CONFIG.NOTICE_TYPES[type];

  if (!noticeConfig || !aiMessageElement) {
    console.warn('Acadel encontró configuración de aviso inválida o elemento perdido');
    return;
  }

  const chatId = getCurrentChatId();
  const noticeKey = `${chatId}_${noticeConfig.id}`;

  if (state.shownNotices.has(noticeKey) && !noticeConfig.persistent) {
    return;
  }

  removeExistingNotice(aiMessageElement, type);

  const noticeElement = createNoticeElement(noticeConfig, {
    message,
    details,
    actionButton,
    noticeKey
  });

  aiMessageElement.appendChild(noticeElement);

  state.shownNotices.add(noticeKey);
  state.activeNotices.set(noticeKey, noticeElement);

  if (noticeConfig.persistent) {
    saveNoticeToStorage(noticeKey);
  }

  setTimeout(() => {
    noticeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, CONFIG.AUTO_SCROLL_DELAY);
}

export function showNoAvaAccessNotice(messageElement, avaName = 'especializado', upgradeInfo = {}) {
  showNotice(messageElement, {
    type: 'NO_AVA_ACCESS',
    message: `¡Ups! El contenido ${avaName} está en la sección VIP de Acadel`,
    details: 'Como buen capibara académico, Acadel protege el conocimiento premium. Adquiere la carrera correspondiente para acceder a mi sabiduría más exclusiva.',
    actionButton: {
      text: '💎 Ver Planes VIP',
      action: 'upgrade',
      handler: () => {
        const upgradeUrl = upgradeInfo.url || '/tienda';
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🛒 Acadel te lleva de compras', 'Abriendo la tienda académica más cool del universo');
        }
        window.open(upgradeUrl, '_blank');
      }
    }
  });
}

export function showFreeUserLimitNotice(messageElement, limitType = 'daily', limitInfo = {}) {
  const { resetTime = null } = limitInfo;

  let message, details;

  if (limitType === 'daily') {
    message = `🚫 Has alcanzado tu límite diario de mensajes como usuario gratuito`;
    details = `Ya usaste mensajes hoy. ${resetTime ? `Se restablece mañana a las ${new Date(resetTime).toLocaleTimeString()}.` : 'Se restablece en 24 horas.'}`;
  } else if (limitType === 'hourly') {
    message = `⏱️ Has alcanzado tu límite de mensajes por hora como usuario gratuito`;
    details = `Ya usaste mensajes en esta hora. ${resetTime ? `Se restablece a las ${new Date(resetTime).toLocaleTimeString()}.` : 'Se restablece en 1 hora.'}`;
  } else {
    message = `🚫 Límite de usuario gratuito alcanzado`;
    details = `Necesitas una suscripción premium para continuar usando esta función.`;
  }

  showNotice(messageElement, {
    type: 'FREE_USER_LIMIT',
    message,
    details,
    actionButton: {
      text: '💎 Ver Planes Premium',
      action: 'upgrade_to_premium',
      handler: () => {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🛒 Acadel te lleva de compras', 'Abriendo planes premium para usuarios ambiciosos');
        }
        setTimeout(() => {
          if (typeof window.handleUpgrade === 'function') {
            window.handleUpgrade();
            return;
          }
          window.open('/tienda', '_blank');
        }, 500);
      }
    }
  });
}

function showSpecificToolLimitNotice(messageElement, errorData, responseData) {
  const toolSlug = errorData.toolSlug || extractToolFromError(errorData.code);
  const toolName = getToolDisplayName(toolSlug);
  const limitType = errorData.limitType || (errorData.code?.includes('DAILY') ? 'daily' : 'hourly');
  const specificLimits = errorData.specificLimits || {};

  const used = specificLimits.used || 0;
  const limit = specificLimits.limit || 0;
  const resetTime = specificLimits.resetTime || errorData.resetTime;

  const timeText = limitType === 'daily' ? 'diario' : 'por hora';
  const resetText = resetTime ? `Se restablece a las ${new Date(resetTime).toLocaleTimeString()}` : 'Se restablece pronto';

  showNotice(messageElement, {
    type: 'TOOL_LIMIT',
    message: `🚫 Límite ${timeText} alcanzado para ${toolName}`,
    details: `Has usado ${used}/${limit} consultas ${timeText}. ${resetText}.`,
    actionButton: {
      text: '💎 Upgrade a Premium',
      action: 'upgrade_for_tool',
      handler: () => {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🛒 Acadel recomienda upgrade', `Acceso ilimitado a ${toolName} con Premium`);
        }
        window.open('/tienda?source=tool_limit&tool=' + toolSlug, '_blank');
      }
    }
  });

  console.log(`🚫 [BACKEND-ALIGNED] Tool limit mostrado: ${toolName} ${timeText} ${used}/${limit}`);
}

function extractToolFromError(errorCode) {
  if (errorCode.includes('PDF')) return 'pdf';
  if (errorCode.includes('AGENT')) return 'agente';
  return 'general';
}

function getToolDisplayName(toolSlug) {
  const names = {
    'pdf': 'PDF',
    'agente': 'Agente',
    'agent': 'Agente',
    'general': 'Herramienta'
  };
  return names[toolSlug] || toolSlug.toUpperCase();
}

export function checkAndShowNotices(messageElement, content) {
  detectAndShowNotices(messageElement, content);
}

export function checkErrorForNotices(messageElement, errorMessage) {
  try {
    let errorData = {};
    try {
      errorData = JSON.parse(errorMessage);
    } catch (e) {
      if (errorMessage.includes('token') && errorMessage.includes('limit')) {
        showTokenLimitNotice(messageElement, "límite establecido");
        return;
      }
      if (errorMessage.includes('acceso') || errorMessage.includes('access')) {
        showNoAvaAccessNotice(messageElement);
        return;
      }
    }

    if (errorData.error) {
      const errorCode = errorData.error.code;

      if (errorCode === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED') {
        const maxTokens = errorData.error.maxTokens || errorData.maxTokens || "límite establecido";
        showTokenLimitNotice(messageElement, maxTokens, errorData.tokenInfo);
      }

      if (errorCode === 'AVA_ACCESS.CAREER_NOT_PURCHASED' ||
        errorCode === 'AVA_ACCESS.INVALID_AVA') {
        showNoAvaAccessNotice(messageElement);
      }
    }

    if (errorData.tokenLimitExceeded) {
      const { max } = errorData.tokenLimitExceeded;
      showTokenLimitNotice(messageElement, max, errorData.tokenInfo);
    }

  } catch (error) {
    console.warn('Acadel tuvo problemas verificando avisos en error:', error);
  }
}

export function processResponseWithDynamicTokens(messageElement, responseData) {
  if (responseData.tokenInfo && responseData.tokenInfo.current && responseData.tokenInfo.max) {
    const { current, max } = responseData.tokenInfo;

    if (validateTokenData(current, max)) {
      console.log(`📊 [BACKEND-ALIGNED] Procesando respuesta según backend`);

      if (shouldShowWarning(current, max, responseData.tokenInfo) || shouldShowLimit(current, max, responseData.tokenInfo)) {
        showSmartTokenNotice(messageElement, current, max, null, responseData.tokenInfo);
      }
    }
  } else {
    console.log(`ℹ️ [BACKEND-ALIGNED] No hay información válida de tokens del backend en la respuesta`);
  }
}

export function clearChatNotices() {
  const chatId = getCurrentChatId();

  Array.from(state.shownNotices).forEach(noticeKey => {
    if (noticeKey.startsWith(`${chatId}_`)) {
      state.shownNotices.delete(noticeKey);
    }
  });

  Array.from(state.activeNotices.entries()).forEach(([noticeKey, noticeElement]) => {
    if (noticeKey.startsWith(`${chatId}_`)) {
      hideNotice(noticeElement, noticeKey);
    }
  });

  try {
    const stored = JSON.parse(sessionStorage.getItem(state.storageKey) || '[]');
    const filtered = stored.filter(key => !key.startsWith(`${chatId}_`));
    sessionStorage.setItem(state.storageKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Acadel tuvo problemas limpiando avisos del storage:', e);
  }
}

export function clearTokenWarnings() {
  simpleTokenManager.clearAll();
  console.log('🧹 [BACKEND-ALIGNED] Estado de warnings limpiado - límites dinámicos conservados');
}

export function debugTokenWarnings() {
  const status = simpleTokenManager.getStatus();
  const dynamicStatus = {
    maxTokensPerChat: state.dynamicLimits.maxTokensPerChat || 'No configurado',
    warningThreshold: state.dynamicLimits.warningThreshold || 'No configurado',
    warningTokens: state.dynamicLimits.warningTokens || 'No configurado',
    criticalTokens: state.dynamicLimits.criticalTokens || 'No configurado',
    warningPercentage: state.dynamicLimits.warningPercentage || 'No configurado',
    limitPercentage: state.dynamicLimits.limitPercentage || 'No configurado',
    lastUpdated: state.dynamicLimits.lastUpdated || 'Nunca',
    source: state.dynamicLimits.source,
    isFullyDynamic: state.dynamicLimits.isFullyDynamic
  };

  const debugInfo = {
    simpleTokenStatus: status,
    dynamicLimits: dynamicStatus,
    noticesInDOM: document.querySelectorAll('.chat-notice[data-notice-type*="token"]').length,
    warningNotices: document.querySelectorAll('.chat-notice[data-notice-type="token_warning"]').length,
    limitNotices: document.querySelectorAll('.chat-notice[data-notice-type="token_limit"]').length,
    currentChatId: state.currentChatId || simpleTokenManager.getCurrentChatId(),
    hasWarningShown: simpleTokenManager.hasShownWarning(),
    hasLimitShown: simpleTokenManager.hasShownLimit(),
    functionTests: {
      shouldShowWarning: typeof shouldShowWarning === 'function',
      shouldShowLimit: typeof shouldShowLimit === 'function',
      showSmartTokenNotice: typeof showSmartTokenNotice === 'function',
      updateDynamicLimits: typeof updateDynamicLimits === 'function'
    }
  };

  console.group('🔍 [DEBUG] Estado completo del sistema de avisos 100% ALINEADO CON BACKEND');
  console.log('📊 Estado del SimpleTokenManager:', status);
  console.log('⚙️ Límites dinámicos:', dynamicStatus);
  console.log('🎯 Avisos en DOM:', {
    total: debugInfo.noticesInDOM,
    warnings: debugInfo.warningNotices,
    limits: debugInfo.limitNotices
  });
  console.log('🌐 Estado global:', {
    chatId: debugInfo.currentChatId,
    hasWarning: debugInfo.hasWarningShown,
    hasLimit: debugInfo.hasLimitShown
  });
  console.log('🔧 Funciones disponibles:', debugInfo.functionTests);
  console.groupEnd();

  return debugInfo;
}

export function cleanup() {
  state.activeNotices.forEach((noticeElement, noticeKey) => {
    hideNotice(noticeElement, noticeKey);
  });

  try {
    sessionStorage.removeItem(state.storageKey);
  } catch (e) {
    console.warn('Acadel tuvo problemas limpiando storage:', e);
  }

  simpleTokenManager.clearAll();

  state.shownNotices.clear();
  state.activeNotices.clear();
  state.currentChatId = null;
  state.initialized = false;

  state.dynamicLimits = {
    maxTokensPerChat: null,
    warningThreshold: null,
    warningTokens: null,
    criticalTokens: null,
    warningPercentage: null,
    limitPercentage: null,
    lastUpdated: null,
    source: 'backend_only_exact_match',
    isFullyDynamic: true
  };

  console.log('🦫 [BACKEND-ALIGNED] Sistema de avisos 100% alineado con backend limpiado completamente');
}

export function getDynamicLimitsInfo() {
  return {
    maxTokensPerChat: state.dynamicLimits.maxTokensPerChat,
    warningThreshold: state.dynamicLimits.warningThreshold,
    warningTokens: state.dynamicLimits.warningTokens,
    criticalTokens: state.dynamicLimits.criticalTokens,
    warningPercentage: state.dynamicLimits.warningPercentage,
    limitPercentage: state.dynamicLimits.limitPercentage,
    lastUpdated: state.dynamicLimits.lastUpdated,
    source: state.dynamicLimits.source,
    isFullyDynamic: state.dynamicLimits.isFullyDynamic,
    isConfigured: !!(state.dynamicLimits.maxTokensPerChat && state.dynamicLimits.warningThreshold)
  };
}

export function getCurrentTokenLimit() {
  return state.dynamicLimits.maxTokensPerChat;
}

export function showFreeUserAvaAccessNotice(messageElement, avaName = 'contenido académico', careerName = 'esta carrera', upgradeInfo = {}) {
  console.log(`🔒 [AVA ACCESS] Mostrando aviso de usuario gratuito:`, {
    avaName,
    careerName,
    upgradeInfo
  });

  showNotice(messageElement, {
    type: 'NO_AVA_ACCESS',
    message: `🚫 Usuario gratuito: No puedes acceder a ${avaName}`,
    details: `Este contenido académico especializado requiere suscripción a "${careerName}". Los usuarios gratuitos no tienen acceso a AVAs premium.`,
    actionButton: {
      text: '💎 Ver Suscripciones',
      action: 'upgrade_to_career',
      handler: () => {
        if (typeof window.acadelInfo === 'function') {
          window.acadelInfo('🎓 Acadel te ayuda a crecer', `Descubre cómo acceder a ${avaName} con una suscripción académica`);
        }
        
        setTimeout(() => {
          const upgradeUrl = upgradeInfo.url || `/tienda?career=${encodeURIComponent(careerName)}`;
          
          if (typeof window.handleCareerUpgrade === 'function') {
            window.handleCareerUpgrade(careerName, avaName);
            return;
          }
          if (typeof window.handleUpgrade === 'function') {
            window.handleUpgrade();
            return;
          }
          
          window.open(upgradeUrl, '_blank');
        }, 500);
      }
    }
  });

  console.log(`✅ [AVA ACCESS] Aviso de usuario gratuito mostrado para ${avaName}`);
}

export default {
  detectAndShowNotices,
  initChatNotices,
  showNotice,
  showTokenWarningNotice,
  showTokenLimitNotice,
  showSmartTokenNotice,
  showNoAvaAccessNotice,
  showFreeUserLimitNotice,
  showFreeUserAvaAccessNotice,  // ← NUEVA FUNCIÓN
  checkAndShowNotices,
  processResponseWithDynamicTokens,
  checkErrorForNotices,
  clearChatNotices,
  clearTokenWarnings,
  debugTokenWarnings,
  getDynamicLimitsInfo,
  updateDynamicLimits,
  getCurrentTokenLimit,
  shouldShowWarning,
  shouldShowLimit,
  cleanup,
  simpleTokenManager: simpleTokenManager
};

if (typeof window !== 'undefined') {
  window.AcadelChatNotices = {
    detectAndShowNotices,
    initChatNotices,
    showNotice,
    showTokenWarningNotice,
    showTokenLimitNotice,
    showSmartTokenNotice,
    updateDynamicToolLimits,
    showNoAvaAccessNotice,
    showFreeUserLimitNotice,
    showFreeUserAvaAccessNotice,  // ← NUEVA FUNCIÓN
    checkAndShowNotices,
    processResponseWithDynamicTokens,
    checkErrorForNotices,
    clearChatNotices,
    clearTokenWarnings,
    debugTokenWarnings,
    getDynamicLimitsInfo,
    updateDynamicLimits,
    getCurrentTokenLimit,
    shouldShowWarning,
    shouldShowLimit,
    cleanup,
    simpleTokenManager: simpleTokenManager
  };

  window.debugTokenWarnings = debugTokenWarnings;
  window.quickTokenDebug = function () {
    console.clear();
    console.log('🚀 [QUICK DEBUG] Iniciando diagnóstico 100% ALINEADO CON BACKEND...');
    debugTokenWarnings();
    console.log('\n📋 [QUICK DEBUG] Comandos útiles:');
    console.log('• testTokenWarning(1200, 1500) - Probar warning al 80%');
    console.log('• debugTokenWarnings() - Ver estado completo');
    console.log('• getDynamicLimitsInfo() - Ver límites dinámicos');
  };

  console.log('🦫 Sistema de avisos 100% ALINEADO CON BACKEND del Profesor Acadel disponible globalmente como window.AcadelChatNotices');
}