/**
 * Sistema mejorado de autenticación y seguridad
 * Versión optimizada con mejor tolerancia a renovaciones de JWT
 * 
 * Características mejoradas:
 * - Tolerancia a renovaciones automáticas de JWT
 * - Retry inteligente en verificaciones
 * - Mejor manejo de estados temporales inconsistentes
 * - Detección mejorada de intentos de inicio de sesión
 * - Sincronización robusta con el backend
 */

// Configuración global del sistema de autenticación
const AUTH_CONFIG = {
    // Intervalos de verificación (milisegundos) - 🆕 AUMENTADOS PARA REDUCIR PRESIÓN
    SESSION: {
        INTERVAL: 420000,              // 7 minutos (aumentado de 5)
        MIN_TIME_BETWEEN_CHECKS: 90000, // 1.5 minutos entre verificaciones (aumentado)
        lastCheck: 0,                   // Timestamp de la última verificación
        RETRY_DELAY: 1000,              // 🆕 Delay entre reintentos
        MAX_RETRIES: 3                  // 🆕 Máximo de reintentos
    },
    
    // Longpolling
    LONGPOLL: {
        TIMEOUT: 35000,             // 35 segundos máximo de conexión
        RECONNECT_DELAY: 1000,      // 1 segundo entre reconexiones (aumentado)
        ERROR_RETRY_DELAY: 5000     // 5 segundos de espera tras error (aumentado)
    },
    
    // Tiempos de espera (milisegundos)
    TIMEOUTS: {
        LOGOUT_REDIRECT: 2000,      // Espera antes de redireccionar en logout
        RESET_VERIFICATION: 5000,   // Espera antes de reiniciar verificación
        AUTH_VERIFICATION: 3000     // 🆕 Timeout para verificaciones de auth
    },
    
    // Rutas de la API
    API: {
        AUTH: '/api/usuarios/authenticate',
        REFRESH: '/api/usuarios/refresh-token',
        CHECK_SESSION: '/api/usuarios/check-session',
        PROFILE: '/api/perfil/',
        LOGOUT: '/api/usuarios/logout',
        LOGIN_ATTEMPTS: '/api/usuarios/login-attempts/',
        LOGIN_RESPONSE: '/api/usuarios/login-attempts/response',
    },
    
    // Rutas de navegación
    ROUTES: {
        LOGIN: 'login',
        PRINCIPAL: 'principal'
    },
    
    // Rutas de imágenes
    IMAGES: {
        CHIGUIRE_SAD: '/images/chiguiresad.webp',
        CHIGUIRE_WORRIED: '/images/chiguirepreocupado.webp',
        CHIGUIRE_ALARMED: '/images/chiguirealarmado.webp'
    }
};

// Flag global para manejar el estado de cierre de sesión
const SESSION_STATE = {
    isBeingTerminated: false,
    renewalInProgress: false  // 🆕 Flag para renovaciones
};

// Estado global del sistema de longpolling
const LONGPOLL_STATE = {
    isPolling: false,
    shouldContinuePolling: true
};

// Control de estado de autenticación global
const AUTH_STATE = {
    verificationInProgress: false,
    verificationCompleted: false,
    lastSuccessfulVerification: 0,  // 🆕 Timestamp de última verificación exitosa
    consecutiveErrors: 0            // 🆕 Contador de errores consecutivos
};

// Control de estado para modales de intento de login
const LOGIN_ATTEMPT_STATE = {
    isModalShowing: false,
    currentAttemptId: null,
    lastProcessedAttempt: null,
    modalProcessingTimeout: null
};

/**
 * 🆕 Función de retry inteligente para operaciones de autenticación
 */
async function retryOperation(operation, maxRetries = 3, delay = 1000, operationName = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 ${operationName} - Intento ${attempt}/${maxRetries}`);
            const result = await operation();
            
            if (attempt > 1) {
                console.log(`✅ ${operationName} exitosa después de ${attempt} intentos`);
            }
            
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ ${operationName} falló (intento ${attempt}/${maxRetries}):`, error.message);
            
            if (attempt < maxRetries) {
                // Delay exponencial: 1s, 2s, 4s
                const waitTime = delay * Math.pow(2, attempt - 1);
                console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    console.error(`❌ ${operationName} falló después de ${maxRetries} intentos`);
    throw lastError;
}

/**
 * Inicializa el sistema de autenticación y seguridad
 */
document.addEventListener('DOMContentLoaded', () => {
    verifyUserAuth()
        .then(userData => {
            if (userData) {
                console.log('👤 Usuario autenticado:', userData.correo);
                
                // Solo configurar monitoreo básico
                setupSessionMonitor();
                setupLoginAttemptMonitor(userData.userId);
                setupLogoutButton();
            }
        })
        .catch(error => {
            console.error('❌ Error durante la inicialización:', error);
        });
});

/**
 * 🆕 Verifica la autenticación del usuario con retry inteligente
 */
async function verifyUserAuth() {
    if (AUTH_STATE.verificationInProgress) {
        console.log('📊 Verificación de autenticación ya en progreso, esperando...');
        while (AUTH_STATE.verificationInProgress) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (AUTH_STATE.verificationCompleted && window.lastAuthData) {
            console.log('📋 Usando datos de autenticación previamente obtenidos');
            return window.lastAuthData;
        }
    }
    
    AUTH_STATE.verificationInProgress = true;
    
    try {
        console.log('🔑 Iniciando verificación de autenticación...');
        
        // 🆕 Usar retry inteligente para la verificación
        const authResult = await retryOperation(async () => {
            const response = await fetchWithCsrf(AUTH_CONFIG.API.AUTH, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                timeout: AUTH_CONFIG.TIMEOUTS.AUTH_VERIFICATION
            });

            if (!response.ok) {
                if (response.status === 401) {
                    try {
                        const errorData = await response.json();
                        
                        if (errorData.code === "SESSION_REVOKED") {
                            console.warn('Sesión revocada detectada');
                            AUTH_STATE.verificationInProgress = false;
                            showSessionEndedModal('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.');
                            return null;
                        }
                    } catch (parseError) {
                        console.warn('Error al analizar respuesta de error:', parseError);
                    }
                    
                    AUTH_STATE.verificationInProgress = false;
                    showSessionEndedModal('Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.');
                    return null;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        }, 3, 500, 'Verificación de autenticación');

        if (!authResult) {
            AUTH_STATE.verificationInProgress = false;
            return null;
        }

        const authData = extractUserData(authResult);
        
        // 🆕 Marcar si el token fue renovado
        if (authResult.tokenWasRenewed) {
            console.log('🔄 Token fue renovado automáticamente durante la verificación');
            SESSION_STATE.renewalInProgress = false; // Reset flag si estaba activo
        }
        
        if (authData.userId) {
            if (!window.userProfileVerified) {
                await verifyUserProfile(authData.userId);
                window.userProfileVerified = true;
            }
        } else {
            console.warn('No se verificó el perfil porque el ID de usuario no está disponible');
        }

        const termsAccepted = await verifyTermsAcceptance();
        if (!termsAccepted) {
            AUTH_STATE.verificationInProgress = false;
            return null;
        }

        window.lastAuthData = authData;
        AUTH_STATE.verificationCompleted = true;
        AUTH_STATE.verificationInProgress = false;
        AUTH_STATE.lastSuccessfulVerification = Date.now(); // 🆕 Marcar timestamp
        AUTH_STATE.consecutiveErrors = 0; // 🆕 Reset contador de errores
        
        console.log('✅ Verificación de autenticación completada exitosamente');
        return authData;
        
    } catch (error) {
        AUTH_STATE.verificationInProgress = false;
        AUTH_STATE.consecutiveErrors++; // 🆕 Incrementar contador de errores
        
        console.error('Error de autenticación:', error.message);
        
        // 🆕 Solo redirigir si hay múltiples errores consecutivos o es un error crítico
        if (AUTH_STATE.consecutiveErrors >= 3 || error.message.includes('401')) {
            window.location.href = AUTH_CONFIG.ROUTES.LOGIN;
        }
        
        return null;
    }
}

/**
 * Extrae los datos relevantes del usuario
 */
function extractUserData(userData) {
    const userId = userData.id_user || userData.id || userData.user?.id_user || userData.user?.id;
    const correo = userData.correo || userData.email || userData.user?.correo || userData.user?.email;
    
    if (!userId) {
        console.warn('No se pudo determinar el ID de usuario:', userData);
    }
    
    return { userId, correo, tokenWasRenewed: userData.tokenWasRenewed };
}

/**
 * 🆕 Verifica si el usuario tiene un perfil completo con retry
 */
async function verifyUserProfile(userId) {
    if (window.profileVerifiedForUser === userId) {
        console.log('✅ Perfil ya verificado, omitiendo verificación redundante');
        return window.lastProfileData || null;
    }
    
    if (!userId || userId === 'undefined') {
        console.error('Se intentó verificar perfil con ID inválido:', userId);
        return null;
    }

    try {
        const profileResult = await retryOperation(async () => {
            const response = await fetchWithCsrf(`${AUTH_CONFIG.API.PROFILE}${userId}`, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Error al obtener el perfil`);
            }

            return await response.json();
        }, 2, 1000, 'Verificación de perfil');

        if (profileResult) {
            console.log('✅ Perfil encontrado:', profileResult);
            window.profileVerifiedForUser = userId;
            window.lastProfileData = profileResult;
        }
        
        return profileResult;
        
    } catch (error) {
        console.error('Error al verificar el perfil:', error);
        return null;
    }
}

/**
 * Wrapper para fetch con soporte CSRF automático y timeout
 */
async function fetchWithCsrf(url, options = {}) {
    // 🆕 Agregar timeout si no está presente
    if (options.timeout && !options.signal) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout);
        options.signal = controller.signal;
        delete options.timeout;
    }
    
    if (window.csrfUtils && typeof window.csrfUtils.fetch === 'function') {
        return window.csrfUtils.fetch(url, options);
    }
    
    console.warn('csrfUtils no disponible, usando fetch normal con interceptor');
    options.credentials = options.credentials || 'include';
    return fetch(url, options);
}

/**
 * 🆕 Verifica si el usuario ha aceptado los términos y condiciones con retry
 */
async function verifyTermsAcceptance() {
    console.log('🔍 Verificando aceptación de términos y condiciones');
    
    try {
        const termsResult = await retryOperation(async () => {
            const response = await fetchWithCsrf('/api/terminos/verificar', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                timeout: 3000
            });
            
            if (response.status === 401 || response.status === 403) {
                console.log('🔑 Error de autenticación al verificar términos');
                return { hasAccepted: false, authError: true };
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Error al verificar términos`);
            }
            
            return await response.json();
        }, 2, 1000, 'Verificación de términos');
        
        if (termsResult.authError) {
            return false;
        }
        
        if (!termsResult.hasAccepted) {
            console.log(`⚠️ Términos v${termsResult.currentVersion} no aceptados, redirigiendo...`);
            showAlert('Es necesario aceptar los términos y condiciones', 'warning');
            window.location.href = '/terminos_condiciones?required=true&version=' + termsResult.currentVersion;
            return false;
        }
        
        console.log('✅ Términos aceptados correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error al verificar términos:', error);
        return false;
    }
}

/**
 * Configura el sistema de monitoreo de sesión
 */
function setupSessionMonitor() {
    const checkInterval = setInterval(checkSessionState, AUTH_CONFIG.SESSION.INTERVAL);
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            const now = Date.now();
            if (now - AUTH_CONFIG.SESSION.lastCheck >= AUTH_CONFIG.SESSION.MIN_TIME_BETWEEN_CHECKS) {
                setTimeout(checkSessionState, 500); // 🆕 Pequeño delay al volver a la pestaña
            }
        }
    });
    
    console.log('✅ Sistema de monitoreo de sesión configurado (cada 7 minutos)');
}

/**
 * 🆕 Verifica el estado actual de la sesión con retry inteligente
 */
async function checkSessionState() {
    const now = Date.now();
    if (now - AUTH_CONFIG.SESSION.lastCheck < AUTH_CONFIG.SESSION.MIN_TIME_BETWEEN_CHECKS) return;
    
    if (SESSION_STATE.isBeingTerminated) {
        console.log('🔒 Sesión en proceso de cierre, saltando verificación');
        return;
    }
    
    // 🆕 Si hay una renovación en progreso, esperar
    if (SESSION_STATE.renewalInProgress) {
        console.log('🔄 Renovación de token en progreso, saltando verificación');
        return;
    }
    
    AUTH_CONFIG.SESSION.lastCheck = now;
    
    try {
        console.log('🔍 Verificando estado de sesión...');
        
        const sessionResult = await retryOperation(async () => {
            const response = await fetchWithCsrf(AUTH_CONFIG.API.CHECK_SESSION, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                timeout: 5000
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    return { status: 'unauthenticated', serverError: true };
                }
                throw new Error(`HTTP ${response.status}: Error en verificación de sesión`);
            }
            
            return await response.json();
        }, 2, 1000, 'Verificación de sesión');
        
        if (sessionResult.serverError) {
            showSessionEndedModal('Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.');
            return;
        }
        
        console.log('📊 Estado de sesión:', sessionResult.status);
        
        // 🆕 Marcar si el token fue renovado
        if (sessionResult.tokenRenewed) {
            console.log('🔄 Token fue renovado automáticamente durante la verificación de sesión');
            SESSION_STATE.renewalInProgress = false;
        }
        
        switch (sessionResult.status) {
            case 'active':
                console.log('✅ Sesión activa confirmada');
                AUTH_STATE.consecutiveErrors = 0; // 🆕 Reset contador de errores
                return;
                
            case 'revoked':
                console.warn('💥 Sesión confirmada como revocada por el servidor');
                showSessionEndedModal('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.');
                return;
                
            case 'unauthenticated':
                console.warn('💥 Usuario no autenticado según el servidor');
                showSessionEndedModal('Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.');
                return;
                
            case 'error':
                console.warn('⚠️ Error en verificación de sesión:', sessionResult.message);
                AUTH_STATE.consecutiveErrors++;
                
                if (sessionResult.message && sessionResult.message.includes('revocada')) {
                    showSessionEndedModal(sessionResult.message);
                } else if (AUTH_STATE.consecutiveErrors >= 3) {
                    showSessionEndedModal('Se detectaron múltiples errores de sesión. Por favor, inicia sesión nuevamente.');
                }
                return;
                
            default:
                console.warn('⚠️ Estado de sesión desconocido:', sessionResult.status);
                AUTH_STATE.consecutiveErrors++;
                return;
        }
        
    } catch (error) {
        console.log('⚠️ Error en verificación de sesión:', error.message);
        AUTH_STATE.consecutiveErrors++;
        
        // 🆕 Solo actuar si hay múltiples errores consecutivos
        if (AUTH_STATE.consecutiveErrors >= 4) {
            console.error('💥 Múltiples errores consecutivos en verificación de sesión');
            showSessionEndedModal('Ocurrió un error en la verificación de sesión. Por favor, inicia sesión nuevamente.');
            AUTH_STATE.consecutiveErrors = 0;
        } else {
            console.log(`📶 Error de sesión ${AUTH_STATE.consecutiveErrors}/4 - continuando`);
        }
    }
}

// 🆕 Función para obtener información amigable del User-Agent
function getDisplayUserAgentInfo(attemptData) {
    if (attemptData.userAgentDisplay) {
        return {
            display: attemptData.userAgentDisplay,
            detailed: attemptData.userAgentInfo,
            security: attemptData.securityInfo,
            raw: attemptData.userAgent
        };
    }
    
    const userAgent = attemptData.userAgent || 'Dispositivo desconocido';
    let displayText = userAgent;
    
    // Detección simple de navegadores
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
        displayText = '🔴 Google Chrome';
    } else if (userAgent.includes('Firefox')) {
        displayText = '🦊 Mozilla Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        displayText = '🧭 Safari';
    } else if (userAgent.includes('Edge')) {
        displayText = '🔷 Microsoft Edge';
    }
    
    // Detección simple de OS
    if (userAgent.includes('Windows')) {
        displayText += ' en Windows 🪟';
    } else if (userAgent.includes('Mac OS')) {
        displayText += ' en macOS 🍎';
    } else if (userAgent.includes('Linux')) {
        displayText += ' en Linux 🐧';
    } else if (userAgent.includes('Android')) {
        displayText += ' en Android 🤖';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        displayText += ' en iOS 📱';
    }
    
    return {
        display: displayText,
        detailed: null,
        security: null,
        raw: userAgent
    };
}

/**
 * Crea elementos HTML para mostrar información detallada del dispositivo
 */
function createDetailedDeviceInfo(userAgentInfo) {
    if (!userAgentInfo.detailed || !userAgentInfo.detailed.isValid) {
        return `
            <div class="auth-data-field">
                <span class="auth-data-label">Dispositivo:</span>
                <span class="auth-data-value">${userAgentInfo.display}</span>
            </div>
        `;
    }
    
    const { browser, os, device } = userAgentInfo.detailed;
    
    return `
        <div class="auth-data-field">
            <span class="auth-data-label">Navegador:</span>
            <span class="auth-data-value device-info">
                <span class="device-icon">${browser.icon}</span>
                <span class="device-text">${browser.name}${browser.version ? ` ${browser.version}` : ''}</span>
            </span>
        </div>
        <div class="auth-data-field">
            <span class="auth-data-label">Sistema:</span>
            <span class="auth-data-value device-info">
                <span class="device-icon">${os.icon}</span>
                <span class="device-text">${os.name}</span>
            </span>
        </div>
        <div class="auth-data-field">
            <span class="auth-data-label">Dispositivo:</span>
            <span class="auth-data-value device-info">
                <span class="device-icon">${device.icon}</span>
                <span class="device-text">${device.name}</span>
            </span>
        </div>
    `;
}

/**
 * Determina el nivel de riesgo del intento
 */
function assessSecurityRisk(userAgentInfo) {
    if (userAgentInfo.security) {
        return userAgentInfo.security.riskLevel;
    }
    
    if (!userAgentInfo.detailed || !userAgentInfo.detailed.isValid) {
        return 'high';
    }
    
    if (userAgentInfo.detailed.browser.name === 'Desconocido' || 
        userAgentInfo.detailed.os.name === 'Desconocido') {
        return 'high';
    }
    
    if (userAgentInfo.detailed.browser.name === 'Internet Explorer') {
        return 'medium';
    }
    
    return 'low';
}

/**
 * Configura el sistema de monitoreo de intentos de inicio de sesión
 */
function setupLoginAttemptMonitor(userId) {
    if (!userId) {
        console.warn('No se puede configurar monitoreo de intentos de login sin ID de usuario');
        return;
    }
    
    if (window.loginMonitorUserId === userId) {
        console.log('Monitoreo de login ya configurado para este usuario');
        return;
    }
    
    window.loginMonitorUserId = userId;
    console.log(`✅ Configurando monitoreo de intentos de login para usuario ${userId}`);
    
    const checkLoginAttemptsRealTime = async () => {
        if (LONGPOLL_STATE.isPolling || !LONGPOLL_STATE.shouldContinuePolling || SESSION_STATE.isBeingTerminated) {
            return;
        }
        
        LONGPOLL_STATE.isPolling = true;
        
        try {
            if (SESSION_STATE.isBeingTerminated) {
                LONGPOLL_STATE.isPolling = false;
                return;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AUTH_CONFIG.LONGPOLL.TIMEOUT);
            
            const response = await fetchWithCsrf(
                `${AUTH_CONFIG.API.LOGIN_ATTEMPTS}${userId}/longpoll?_=${Date.now()}`, 
                {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);
            
            if (response.status === 401) {
                try {
                    const errorData = await response.json();
                    if (errorData.code === "SESSION_REVOKED") {
                        console.warn('💥 Sesión revocada detectada en longpolling');
                        showSessionEndedModal('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.');
                        return;
                    }
                } catch (e) {
                    // Ignorar error de parsing
                }
            }
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.pendingAttempt) {
                    if (!isNewLoginAttempt(data.pendingAttempt)) {
                        console.log('Intento de login ya procesado, ignorando...');
                        return;
                    }
                    
                    LONGPOLL_STATE.shouldContinuePolling = false;
                    
                    showLoginAttemptAlertSafe(data.pendingAttempt);
                    console.log('🔔 Intento de inicio de sesión detectado');
                    showAlert('Intento de inicio de sesión detectado', 'warning');
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Error en monitoreo de intentos de login:', error);
                
                if (!SESSION_STATE.isBeingTerminated) {
                    await new Promise(resolve => 
                        setTimeout(resolve, AUTH_CONFIG.LONGPOLL.ERROR_RETRY_DELAY)
                    );
                }
            }
        } finally {
            LONGPOLL_STATE.isPolling = false;
            
            if (LONGPOLL_STATE.shouldContinuePolling && !SESSION_STATE.isBeingTerminated) {
                setTimeout(
                    checkLoginAttemptsRealTime, 
                    AUTH_CONFIG.LONGPOLL.RECONNECT_DELAY
                );
            }
        }
    };
    
    window.addEventListener('beforeunload', () => {
        LONGPOLL_STATE.shouldContinuePolling = false;
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            LONGPOLL_STATE.shouldContinuePolling = true;
            if (!LONGPOLL_STATE.isPolling) {
                setTimeout(checkLoginAttemptsRealTime, 1000); // 🆕 Delay al volver a la pestaña
            }
        } else {
            LONGPOLL_STATE.shouldContinuePolling = false;
        }
    });
    
    window.resetLoginAttemptMonitor = () => {
        console.log('🔄 Reiniciando monitoreo de intentos de inicio de sesión');
        
        LOGIN_ATTEMPT_STATE.isModalShowing = false;
        LOGIN_ATTEMPT_STATE.currentAttemptId = null;
        
        if (document.visibilityState === 'visible') {
            LONGPOLL_STATE.shouldContinuePolling = true;
            setTimeout(checkLoginAttemptsRealTime, 2000);
        }
    };
    
    checkLoginAttemptsRealTime();
    
    setTimeout(() => {
        if (!LONGPOLL_STATE.isPolling) {
            checkPendingLoginAttempts(userId);
        }
    }, 1000);
}

function isNewLoginAttempt(attemptData) {
    if (!attemptData.id) {
        return true;
    }
    
    if (LOGIN_ATTEMPT_STATE.isModalShowing) {
        console.log('Modal ya visible, ignorando nuevo intento');
        return false;
    }
    
    if (LOGIN_ATTEMPT_STATE.lastProcessedAttempt === attemptData.id) {
        console.log('Intento ya procesado:', attemptData.id);
        return false;
    }
    
    return true;
}

async function checkPendingLoginAttempts(userId) {
    if (LOGIN_ATTEMPT_STATE.isModalShowing) {
        console.log('Modal ya visible, omitiendo verificación de intentos pendientes');
        return;
    }
    
    try {
        const response = await fetchWithCsrf(
            `${AUTH_CONFIG.API.LOGIN_ATTEMPTS}${userId}?_=${Date.now()}`, 
            {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            if (data.pendingAttempt && !document.getElementById('login-attempt-modal')) {
                if (isNewLoginAttempt(data.pendingAttempt)) {
                    LONGPOLL_STATE.shouldContinuePolling = false;
                    
                    showLoginAttemptAlertSafe(data.pendingAttempt);
                    showAlert('Se ha detectado un intento de inicio de sesión pendiente', 'warning');
                }
            }
        }
    } catch (error) {
        console.warn('Error verificando intentos pendientes:', error);
    }
}

function showLoginAttemptAlertSafe(attemptData) {
    if (LOGIN_ATTEMPT_STATE.isModalShowing) {
        console.log('Modal de intento de login ya visible, ignorando...');
        return;
    }
    
    if (document.getElementById('login-attempt-modal')) {
        console.log('Modal DOM ya existe, ignorando...');
        return;
    }
    
    LOGIN_ATTEMPT_STATE.isModalShowing = true;
    LOGIN_ATTEMPT_STATE.currentAttemptId = attemptData.id;
    LOGIN_ATTEMPT_STATE.lastProcessedAttempt = attemptData.id;
    
    if (LOGIN_ATTEMPT_STATE.modalProcessingTimeout) {
        clearTimeout(LOGIN_ATTEMPT_STATE.modalProcessingTimeout);
    }
    
    LOGIN_ATTEMPT_STATE.modalProcessingTimeout = setTimeout(() => {
        console.log('Timeout de modal alcanzado, limpiando estado...');
        LOGIN_ATTEMPT_STATE.isModalShowing = false;
        LOGIN_ATTEMPT_STATE.currentAttemptId = null;
    }, 30000);
    
    showLoginAttemptAlert(attemptData);
}

/**
 * Muestra una alerta de intento de inicio de sesión
 */
function showLoginAttemptAlert(attemptData) {
    const overlay = document.createElement('div');
    overlay.id = 'login-attempt-modal';
    overlay.className = 'auth-overlay';
    
    const messageBox = document.createElement('div');
    messageBox.className = 'auth-modal';
    
    const header = document.createElement('div');
    header.className = 'auth-header';
    
    const userAgentInfo = getDisplayUserAgentInfo(attemptData);
    const riskLevel = assessSecurityRisk(userAgentInfo);
    
    let imageClass = 'auth-image-warning';
    let imageSrc = AUTH_CONFIG.IMAGES.CHIGUIRE_WORRIED;
    let badgeIcon = 'bx-shield-quarter';
    let badgeText = 'Alerta de Seguridad';
    
    if (riskLevel === 'high') {
        imageClass = 'auth-image-danger';
        imageSrc = AUTH_CONFIG.IMAGES.CHIGUIRE_ALARMED;
        badgeIcon = 'bx-shield-x';
        badgeText = 'Riesgo Alto';
    } else if (riskLevel === 'low') {
        imageClass = 'auth-image-info';
        badgeIcon = 'bx-shield';
        badgeText = 'Verificación';
    }
    
    const imageContainer = document.createElement('div');
    imageContainer.className = `auth-image-container ${imageClass}`;

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = 'Profesor Acadel Detective';
    image.className = riskLevel === 'high' ? 'auth-image auth-image-alarmed' : 'auth-image';
    
    const titleSection = document.createElement('div');
    titleSection.className = 'auth-title-section';
    
    const title = document.createElement('h3');
    title.className = 'auth-title';
    title.textContent = riskLevel === 'high' ? 
        'Intento sospechoso detectado' : 
        'Intento de acceso detectado';
    
    const subtitle = document.createElement('p');
    subtitle.className = 'auth-subtitle';
    subtitle.textContent = `El Profesor Acadel ha detectado un intento de inicio de sesión desde ${userAgentInfo.display}`;
    
    const badge = document.createElement('div');
    badge.className = 'auth-badge';
    badge.innerHTML = `<i class="bx ${badgeIcon}"></i> ${badgeText}`;
    
    const content = document.createElement('div');
    content.className = 'auth-content';
    
    const msgParagraph = document.createElement('div');
    msgParagraph.className = 'auth-text';
    msgParagraph.innerHTML = '<p>Se ha detectado un intento de inicio de sesión en tu cuenta de Acadelia. El Profesor Acadel, en su rol de investigador, ha registrado los siguientes detalles:</p>';
    
    const ipInfo = attemptData.ipAddress || 'IP desconocida';
    const locationInfo = attemptData.location || 'Ubicación desconocida';
    const dateTime = new Date(attemptData.timestamp).toLocaleString();
    
    const dataContainer = document.createElement('div');
    dataContainer.className = 'auth-data-container';
    
    const deviceInfoHTML = createDetailedDeviceInfo(userAgentInfo);
    
    dataContainer.innerHTML = `
        ${deviceInfoHTML}
        <div class="auth-data-field">
            <span class="auth-data-label">Ubicación:</span>
            <span class="auth-data-value">${locationInfo}</span>
        </div>
        <div class="auth-data-field">
            <span class="auth-data-label">Dirección IP:</span>
            <span class="auth-data-value">${ipInfo}</span>
        </div>
        <div class="auth-data-field">
            <span class="auth-data-label">Fecha y hora:</span>
            <span class="auth-data-value">${dateTime}</span>
        </div>
    `;
    
    const question = document.createElement('div');
    question.className = 'auth-question';
    
    if (riskLevel === 'high') {
        question.innerHTML = `
            <span style="color: #e74c3c;">⚠️ Este intento parece sospechoso.</span><br>
            ¿Reconoces este intento de inicio de sesión?
        `;
    } else {
        question.textContent = '¿Reconoces este intento de inicio de sesión?';
    }
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'auth-buttons';
    
    const yesButton = document.createElement('button');
    yesButton.className = 'auth-button auth-button-success';
    yesButton.innerHTML = '<i class="bx bx-check"></i> Sí, soy yo';
    yesButton.addEventListener('click', () => handleLoginApproval(attemptData.id, true));
    
    const noButton = document.createElement('button');
    noButton.className = 'auth-button auth-button-danger';
    noButton.innerHTML = '<i class="bx bx-x"></i> No, no soy yo';
    noButton.addEventListener('click', () => handleLoginApproval(attemptData.id, false));
    
    if (userAgentInfo.raw && window.location.hash.includes('debug')) {
        const debugInfo = document.createElement('details');
        debugInfo.style.marginTop = '15px';
        debugInfo.style.fontSize = '12px';
        debugInfo.innerHTML = `
            <summary style="cursor: pointer; color: #666;">Información técnica</summary>
            <pre style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 11px; overflow-x: auto;">${userAgentInfo.raw}</pre>
        `;
        content.appendChild(debugInfo);
    }
    
    buttonsContainer.appendChild(yesButton);
    buttonsContainer.appendChild(noButton);
    
    imageContainer.appendChild(image);
    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);
    header.appendChild(imageContainer);
    header.appendChild(titleSection);
    header.appendChild(badge);
    
    content.appendChild(msgParagraph);
    content.appendChild(dataContainer);
    content.appendChild(question);
    content.appendChild(buttonsContainer);
    
    messageBox.appendChild(header);
    messageBox.appendChild(content);
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
}

/**
 * Maneja la aprobación o rechazo de un intento de inicio de sesión
 */
async function handleLoginApproval(attemptId, approved) {
    try {
        LOGIN_ATTEMPT_STATE.isModalShowing = false;
        LOGIN_ATTEMPT_STATE.currentAttemptId = null;
        
        if (LOGIN_ATTEMPT_STATE.modalProcessingTimeout) {
            clearTimeout(LOGIN_ATTEMPT_STATE.modalProcessingTimeout);
            LOGIN_ATTEMPT_STATE.modalProcessingTimeout = null;
        }
        
        const modal = document.getElementById('login-attempt-modal');
        if (modal) modal.remove();
        
        if (approved) {
            const message = "Permitiendo inicio de sesión en el otro dispositivo...";
            showSessionEndedModal(message);
            console.log('✅ Permitiendo inicio de sesión...');
            showAlert('Permitiendo inicio de sesión en el otro dispositivo', 'info');
        } else {
            showSecurityWarningModal();
            showAlert('Has bloqueado el intento de inicio de sesión', 'success');
        }
        
        const response = await fetchWithCsrf(AUTH_CONFIG.API.LOGIN_RESPONSE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attemptId,
                approved
            })
        });
        
        if (!response.ok) {
            throw new Error('Error procesando la respuesta');
        }
        
        if (!approved) {
            console.log('❌ Has bloqueado el intento de inicio de sesión');
        }
        
        if (typeof window.resetLoginAttemptMonitor === 'function') {
            setTimeout(() => {
                window.resetLoginAttemptMonitor();
            }, AUTH_CONFIG.TIMEOUTS.RESET_VERIFICATION);
        }
        
    } catch (error) {
        console.error('Error al procesar respuesta de intento de login:', error);
        showAlert('Error al procesar tu respuesta. Por favor, inténtalo de nuevo.', 'error');
        
        LOGIN_ATTEMPT_STATE.isModalShowing = false;
        LOGIN_ATTEMPT_STATE.currentAttemptId = null;
    }
}

/**
 * Muestra un modal de advertencia de seguridad
 */
function showSecurityWarningModal() {
    const overlay = document.createElement('div');
    overlay.id = 'security-warning-modal';
    overlay.className = 'auth-overlay';
    
    const messageBox = document.createElement('div');
    messageBox.className = 'auth-modal';
    
    const header = document.createElement('div');
    header.className = 'auth-header';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'auth-image-container auth-image-danger';

    const image = document.createElement('img');
    image.src = AUTH_CONFIG.IMAGES.CHIGUIRE_ALARMED;
    image.alt = 'Profesor Acadel Alarmado';
    image.className = 'auth-image auth-image-alarmed';
    
    const titleSection = document.createElement('div');
    titleSection.className = 'auth-title-section';
    
    const title = document.createElement('h3');
    title.className = 'auth-title';
    title.textContent = 'Acceso bloqueado';
    
    const subtitle = document.createElement('p');
    subtitle.className = 'auth-subtitle';
    subtitle.textContent = 'El Profesor Acadel ha bloqueado el intento de acceso sospechoso';
    
    const badge = document.createElement('div');
    badge.className = 'auth-badge';
    badge.innerHTML = '<i class="bx bx-shield-x"></i> Alerta de Seguridad';
    
    const content = document.createElement('div');
    content.className = 'auth-content';
    
    const msgParagraph = document.createElement('div');
    msgParagraph.className = 'auth-text';
    msgParagraph.innerHTML = '<p><strong>Has bloqueado un intento de inicio de sesión no autorizado en tu cuenta.</strong></p><p>El Profesor Acadel, en su rol de guardián de la seguridad académica, recomienda las siguientes medidas para proteger tu cuenta:</p>';
    
    const securityWarning = document.createElement('div');
    securityWarning.className = 'auth-security-warning';
    
    const securitySteps = document.createElement('div');
    securitySteps.className = 'auth-security-steps';
    
    securitySteps.innerHTML = `
        <div class="auth-step">
            <div class="auth-step-number">1</div>
            <div class="auth-step-text">Cambiar tu contraseña inmediatamente</div>
        </div>
        <div class="auth-step">
            <div class="auth-step-number">2</div>
            <div class="auth-step-text">Verificar la actividad reciente en tu cuenta</div>
        </div>
        <div class="auth-step">
            <div class="auth-step-number">3</div>
            <div class="auth-step-text">Asegurarte de tener un correo electrónico de recuperación actualizado</div>
        </div>
    `;
    
    const additionalText = document.createElement('p');
    additionalText.className = 'auth-text';
    additionalText.innerHTML = 'Estas medidas ayudarán a proteger tu información académica y personal de futuros intentos de acceso no autorizados.';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'auth-button auth-button-info';
    closeButton.innerHTML = '<i class="bx bx-check-shield"></i> Entendido';
    closeButton.addEventListener('click', closeSecurityWarningModal);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'auth-buttons';
    buttonsContainer.appendChild(closeButton);
    
    securityWarning.appendChild(securitySteps);
    
    imageContainer.appendChild(image);
    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);
    header.appendChild(imageContainer);
    header.appendChild(titleSection);
    header.appendChild(badge);
    
    content.appendChild(msgParagraph);
    content.appendChild(securityWarning);
    content.appendChild(additionalText);
    content.appendChild(buttonsContainer);
    
    messageBox.appendChild(header);
    messageBox.appendChild(content);
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
}

/**
 * Cierra el modal de advertencia y reinicia el monitoreo
 */
function closeSecurityWarningModal() {
    const modal = document.getElementById('security-warning-modal');
    if (modal) {
        modal.remove();
        
        LOGIN_ATTEMPT_STATE.isModalShowing = false;
        LOGIN_ATTEMPT_STATE.currentAttemptId = null;
        
        if (typeof window.resetLoginAttemptMonitor === 'function') {
            setTimeout(() => {
                window.resetLoginAttemptMonitor();
            }, 1000);
        }
    }
}

/**
 * Muestra el modal de finalización de sesión
 */
function showSessionEndedModal(message = null) {
    if (SESSION_STATE.isBeingTerminated) {
        console.log('🔒 Proceso de finalización ya iniciado, ignorando llamada duplicada');
        return;
    }
    
    const existingModal = document.getElementById('session-ended-modal');
    if (existingModal) {
        console.log('🔒 Modal ya existe, ignorando llamada duplicada');
        return;
    }
    
    SESSION_STATE.isBeingTerminated = true;
    
    console.log('🔒 Iniciando proceso de finalización de sesión:', message);
    
    stopAllVerifications();
    
    const displayMessage = message || 'Tu sesión ha expirado. Serás redirigido a la página de inicio de sesión.';

    const overlay = document.createElement('div');
    overlay.id = 'session-ended-modal';
    overlay.className = 'auth-overlay';
    
    overlay.setAttribute('data-session-modal', 'true');
    
    const messageBox = document.createElement('div');
    messageBox.className = 'auth-modal';
    
    const header = document.createElement('div');
    header.className = 'auth-header';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'auth-image-container auth-image-info';
    
    const image = document.createElement('img');
    image.src = AUTH_CONFIG.IMAGES.CHIGUIRE_SAD;
    image.alt = 'Profesor Acadel Triste';
    image.className = 'auth-image';
    
    const titleSection = document.createElement('div');
    titleSection.className = 'auth-title-section';
    
    const title = document.createElement('h3');
    title.className = 'auth-title';
    title.textContent = 'Sesión finalizada';
    
    const subtitle = document.createElement('p');
    subtitle.className = 'auth-subtitle';
    subtitle.textContent = 'El Profesor Acadel debe despedirse por ahora';
    
    const badge = document.createElement('div');
    badge.className = 'auth-badge';
    badge.innerHTML = '<i class="bx bx-log-out-circle"></i> Sesión cerrada';
    
    const content = document.createElement('div');
    content.className = 'auth-content';
    
    const msgParagraph = document.createElement('p');
    msgParagraph.className = 'auth-text';
    msgParagraph.textContent = displayMessage;
    
    const pulsingDot = document.createElement('div');
    pulsingDot.className = 'auth-pulsing-dot';
    
    imageContainer.appendChild(image);
    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);
    header.appendChild(imageContainer);
    header.appendChild(titleSection);
    header.appendChild(badge);
    
    content.appendChild(msgParagraph);
    content.appendChild(pulsingDot);
    
    messageBox.appendChild(header);
    messageBox.appendChild(content);
    overlay.appendChild(messageBox);
    
    document.body.appendChild(overlay);
    
    document.body.classList.add('auth-no-pointer-events');
    overlay.classList.add('auth-allow-pointer-events');
    
    try {
        localStorage.setItem('logout_backup_message', displayMessage);
        localStorage.setItem('logout_backup_timestamp', Date.now().toString());
    } catch (e) {
        console.warn('Error guardando en localStorage:', e);
    }
    
    console.log('⏱️ Esperando antes de redireccionar...');
    
    const logoutTimeout = setTimeout(() => {
        const currentModal = document.getElementById('session-ended-modal');
        if (currentModal && currentModal === overlay) {
            console.log('⏱️ Tiempo cumplido, ejecutando logout final...');
            logoutUser(message);
        } else {
            console.log('🔒 Modal ya no es el actual, ignorando timeout');
        }
    }, AUTH_CONFIG.TIMEOUTS.LOGOUT_REDIRECT);
    
    overlay.logoutTimeout = logoutTimeout;
}

/**
 * Detiene todas las verificaciones y polling activos
 */
function stopAllVerifications() {
    console.log('🛑 Deteniendo todas las verificaciones y polling...');
    
    try {
        const dummyInterval = setInterval(() => {}, 999999);
        const highestId = dummyInterval;
        clearInterval(dummyInterval);
        
        for (let i = 1; i <= highestId; i++) {
            clearInterval(i);
        }
        
        console.log(`🧹 Limpiados intervalos 1-${highestId}`);
    } catch (e) {
        console.warn('Error limpiando intervalos:', e);
    }
    
    try {
        const dummyTimeout = setTimeout(() => {}, 999999);
        const highestTimeoutId = dummyTimeout;
        clearTimeout(dummyTimeout);
        
        for (let i = 1; i <= highestTimeoutId; i++) {
            clearTimeout(i);
        }
        
        console.log(`🧹 Limpiados timeouts 1-${highestTimeoutId}`);
    } catch (e) {
        console.warn('Error limpiando timeouts:', e);
    }
    
    LONGPOLL_STATE.shouldContinuePolling = false;
    LONGPOLL_STATE.isPolling = false;
    
    AUTH_CONFIG.SESSION.lastCheck = Date.now() + (24 * 60 * 60 * 1000);
    
    LOGIN_ATTEMPT_STATE.isModalShowing = false;
    LOGIN_ATTEMPT_STATE.currentAttemptId = null;
    LOGIN_ATTEMPT_STATE.shouldContinuePolling = false;
    
    const existingModal = document.getElementById('session-ended-modal');
    if (existingModal && existingModal.logoutTimeout) {
        clearTimeout(existingModal.logoutTimeout);
        console.log('🧹 Cancelado timeout de modal existente');
    }
    
    console.log('✅ Todas las verificaciones detenidas correctamente');
}

/**
 * Configura el botón de cerrar sesión
 */
function setupLogoutButton() {
    const logoutLinks = [
        document.querySelector('.dropdown-item .bx-log-out')?.closest('a'),
        document.querySelector('a[href=""]')?.closest('.dropdown-item'),
        document.querySelector('a:has(.bx-log-out)'),
        ...Array.from(document.querySelectorAll('a')).filter(a => 
            a.textContent.includes('Cerrar sesión') || 
            a.textContent.includes('Logout') || 
            a.textContent.includes('Cerrar Sesión') ||
            a.innerHTML.includes('bx-log-out')
        )
    ].filter(Boolean);

    console.log(`🔒 Configurando logout para ${logoutLinks.length} elementos`);

    logoutLinks.forEach(link => {
        if (link) {
            const newLink = link.cloneNode(true);
            if (link.parentNode) {
                link.parentNode.replaceChild(newLink, link);
            }
            
            newLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await logoutUser();
            });
        }
    });
}

/**
 * 🆕 Realiza el proceso de logout con retry mejorado
 */
async function logoutUser(message = null) {
    if (window.logoutInProgress) {
        console.log('🔒 Logout ya en progreso, ignorando llamada duplicada');
        return;
    }
    
    window.logoutInProgress = true;
    
    console.log('🔒 Iniciando proceso de logout' + (message ? ': ' + message : ''));
    
    try {
        await retryOperation(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetchWithCsrf(AUTH_CONFIG.API.LOGOUT, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 403) {
                    console.warn('🔄 Error CSRF en logout, limpiando cache...');
                    
                    if (window.csrfUtils && window.csrfUtils.clearCache) {
                        window.csrfUtils.clearCache();
                    }
                    
                    throw new Error('CSRF_ERROR'); // Esto causará un retry
                }
                
                throw new Error(`Error en servidor: ${response.status}`);
            }
            
            console.log('✅ Logout exitoso en servidor');
            return true;
            
        }, 3, 500, 'Logout en servidor');
        
    } catch (error) {
        console.warn('⚠️ Error en logout de servidor, procediendo con limpieza local:', error.message);
    }
    
    console.log('🧹 Procediendo con limpieza local...');
    clearDataAndRedirect(message);
}

/**
 * Limpia los datos locales y redirige al login
 */
function clearDataAndRedirect(message = null) {
    console.log('🧹 Iniciando limpieza completa de datos locales...');
    
    const beaconUrl = AUTH_CONFIG.API.LOGOUT;
    const beaconSuccess = navigator.sendBeacon(beaconUrl);
    console.log(`Beacon de logout: ${beaconSuccess ? 'enviado' : 'fallido'}`);
    
    const cookiesToClear = [
        'token',
        'refresh_token', 
        'XSRF-TOKEN',
        'csrf-token',
        'session',
        'connect.sid'
    ];
    
    cookiesToClear.forEach(cookieName => {
        const paths = ['/', '/api/', '/api/usuarios/', '/api/usuarios/refresh-token'];
        const domains = [
            undefined, 
            window.location.hostname,
            '.' + window.location.hostname
        ];
        
        paths.forEach(path => {
            domains.forEach(domain => {
                const cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
                document.cookie = domain ? cookieString + ` domain=${domain};` : cookieString;
            });
        });
    });
    
    document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
    });
    
    try {
        localStorage.clear();
        sessionStorage.clear();
        
        if (window.indexedDB) {
            indexedDB.deleteDatabase('acadelia');
            indexedDB.deleteDatabase('acadelia-cache');
        }
        
        if (window.openDatabase) {
            const db = window.openDatabase('', '', '', '');
            if (db) {
                db.transaction(tx => tx.executeSql('DELETE FROM sessions'));
            }
        }
        
        if (message) {
            sessionStorage.setItem('logout_message', message);
        }
    } catch (e) {
        console.warn('Error limpiando storage:', e);
    }
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
        });
    }
    
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    
    console.log('✅ Limpieza completa de datos locales finalizada');
    
    let sessionStatus = 'logout';
    if (message && message.includes('otro dispositivo')) {
        sessionStatus = 'revoked';
    } else if (message && message.includes('expirado')) {
        sessionStatus = 'expired';
    }
    
    const url = `${AUTH_CONFIG.ROUTES.LOGIN}?session=${sessionStatus}&timestamp=${Date.now()}`;
    window.location.href = url;
}

/**
 * Muestra una alerta personalizada
 */
function showAlert(message, type = 'info', duration = 3000) {
    if (window.showAlert) {
        return window.showAlert(message, type, duration);
    } else if (window.notifyService) {
        return window.notifyService.add(message, type, duration);
    } else {
        const alertTypes = {
            success: { icon: '✓', class: 'alert-success' },
            error: { icon: '⚠', class: 'alert-error' },
            warning: { icon: '⚠', class: 'alert-warning' },
            info: { icon: 'ⓘ', class: 'alert-info' }
        };

        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert ${alertTypes[type].class}`;
        
        alertDiv.innerHTML = `
            <span class="alert-icon">${alertTypes[type].icon}</span>
            <div class="alert-content">${message}</div>
        `;

        document.body.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.classList.add('show'), 10);
        
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 400);
        }, duration);
    }
}