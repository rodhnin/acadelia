/**
 * login.js - Script completo de manejo de login
 * Compatible con las modificaciones del backend para usar códigos 200 con indicadores de estado
 */

document.addEventListener('DOMContentLoaded', async () => {
    const isDevelopment = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    let googleAuthState = {
        isInitialized: false,
        isInitializing: false,
        hasError: false
    };

    // ==================== SUPRESIÓN DE ERRORES ====================

    // Supresión de errores específicos en la consola
    (function () {
        // Referencias a las funciones originales
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleLog = console.log;

        // Patrones de mensajes a suprimir
        const errorPatterns = [
            'Failed to load resource',
            '403',
            '404',
            '409',
            '429',
            'Conflict',
            'GSI_LOGGER',
            'origin is not allowed',
            'client ID',
            'm=credential',
            'message channel closed',
            'asynchronous response'
        ];

        console.error = function (...args) {
            const shouldSuppress = args.some(arg => {
                if (typeof arg === 'string') {
                    return errorPatterns.some(pattern => arg.includes(pattern));
                }
                return false;
            });

            // Si debe suprimirse, no mostrar o convertir a log para depuración
            if (shouldSuppress) {
                if (isDevelopment) {
                    // Opcionalmente, mostrar como log para depuración
                    // originalConsoleLog('[Suprimido]', ...args);
                }
                return;
            }

            // Si no debe suprimirse, mostrar normalmente
            originalConsoleError.apply(console, args);
        };

        console.warn = function (...args) {
            // Suprimir warnings específicos
            if (args.some(arg =>
                typeof arg === 'string' && (
                    arg.includes('no autenticado: NO_TOKEN') ||
                    arg.includes('GSI_LOGGER')
                )
            )) {
                return;
            }

            originalConsoleWarn.apply(console, args);
        };

        // Interceptar promesas no manejadas
        window.addEventListener('unhandledrejection', function (event) {
            if (event.reason && event.reason.message && (
                event.reason.message.includes('message channel closed') ||
                event.reason.message.includes('asynchronous response')
            )) {
                // Prevenir que el error aparezca en la consola
                event.preventDefault();
                return false;
            }
        }, true);

        if (isDevelopment) {
            originalConsoleLog('✅ Supresión de errores activada');
        }
    })();

    // ==================== UTILIDADES Y DETECCIÓN DE MENSAJES ====================

    const detectLogoutMessage = () => {
        // 1. Verificar si hay mensaje en sessionStorage (método original)
        const logoutMessage = sessionStorage.getItem('logout_message');
        if (logoutMessage) {
            showAlert(logoutMessage, 'info');
            sessionStorage.removeItem('logout_message');
            return true;
        }

        // 2. Verificar parámetros de URL (método nuevo)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('session')) {
            const sessionStatus = urlParams.get('session');

            if (sessionStatus === 'revoked') {
                showAlert('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.', 'info');
                history.replaceState(null, '', window.location.pathname);
                return true;
            }
            else if (sessionStatus === 'expired') {
                showAlert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'info');
                history.replaceState(null, '', window.location.pathname);
                return true;
            }
        }

        // 3. Verificar si hay un token expirado en cookies (método de respaldo)
        const hasExpiredToken = document.cookie.includes('token=;') ||
            document.cookie.includes('token=; ') ||
            document.cookie.includes('refresh_token=;');
        if (hasExpiredToken) {
            showAlert('Sesión finalizada. Por favor inicia sesión nuevamente.', 'info');
            return true;
        }

        // 4. Verificar si el usuario fue redireccionado (referrer)
        const referrer = document.referrer;
        if (referrer &&
            referrer.includes(window.location.host) &&
            !referrer.includes('login') &&
            !referrer.includes('register') &&
            !localStorage.getItem('normalNavigation')) {
            showAlert('Tu sesión anterior ha finalizado. Por favor inicia sesión nuevamente.', 'info');
            return true;
        }

        return false;
    };

    detectLogoutMessage();

    document.querySelectorAll('a').forEach(link => {
        if (!link.href.includes('login')) {
            link.addEventListener('click', () => {
                localStorage.setItem('normalNavigation', 'true');
                setTimeout(() => localStorage.removeItem('normalNavigation'), 5000);
            });
        }
    });

    // Oculta todo el contenido de la página inicialmente
    document.body.style.display = 'none';

    // ==================== VERIFICACIÓN DE AUTENTICACIÓN ====================

    const checkAuthentication = async () => {
        try {
            const response = await fetch('/api/usuarios/auth-status', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                if (isDevelopment) {
                    console.log('Error en respuesta de auth-status:', response.status);
                }
                document.body.style.display = 'flex';
                return false;
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                if (isDevelopment) {
                    console.log('Error al procesar respuesta JSON:', parseError);
                }
                document.body.style.display = 'flex';
                return false;
            }

            if (data.authenticated) {
                if (isDevelopment) {
                    console.log('Usuario autenticado:', data.user);
                }

                // Redirigir a la página principal
                window.location.href = 'principal';
                return true;
            }
            // No autenticado
            else {
                // Podemos verificar la razón específica
                if (data.reason === 'TOKEN_EXPIRED' && document.cookie.includes('refresh_token')) {
                    if (isDevelopment) {
                        console.log('Token expirado. Intentando renovar...');
                    }

                    try {
                        const refreshResponse = await fetch('/api/usuarios/refresh-token', {
                            method: 'POST',
                            credentials: 'include'
                        });

                        if (refreshResponse.ok) {
                            const checkAgain = await fetch('/api/usuarios/auth-status', {
                                method: 'GET',
                                credentials: 'include'
                            });

                            if (!checkAgain.ok) {
                                document.body.style.display = 'flex';
                                return false;
                            }

                            const refreshData = await checkAgain.json();

                            if (refreshData.authenticated) {
                                if (isDevelopment) {
                                    console.log('Token renovado exitosamente');
                                }
                                window.location.href = 'principal';
                                return true;
                            }
                        }
                    } catch (refreshError) {
                        if (isDevelopment) {
                            console.log('Error al renovar token:', refreshError);
                        }
                    }
                }

                // No autenticado o error en renovación
                if (isDevelopment) {
                    console.log(`Usuario no autenticado: ${data.reason || 'desconocido'}`);
                }

                document.body.style.display = 'flex';
                return false;
            }
        } catch (error) {
            // Error general
            if (isDevelopment) {
                console.log(`Error general en verificación:`, error);
            }

            document.body.style.display = 'flex';
            return false;
        }
    };

    await checkAuthentication();

    // ==================== ELEMENTOS DOM Y VARIABLES ====================

    // Referencias a elementos del DOM
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');
    const linkRegistro = document.querySelector('.link-registro');
    const linkIngresar = document.querySelector('.link-ingresar');
    const wrapper = document.querySelector('.wrapper');
    const ghostBtnRegistro = document.querySelector('.ghost-btn.link-registro');
    const ghostBtnIngresar = document.querySelector('.ghost-btn.link-ingresar');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const backToLoginLinks = document.querySelectorAll('.back-to-login');
    const recoveryForm = document.getElementById('recoveryForm');

    // Referencias a los wrappers
    const loginWrapper = document.getElementById('login-wrapper');
    const emailConfirmationWrapper = document.getElementById('email-confirmation-wrapper');
    const passwordRecoveryWrapper = document.getElementById('password-recovery-wrapper');
    const verificationWrapper = document.getElementById('verification-wrapper');



    // ==================== FUNCIONES DE CONTROL DE BOTONES ====================



    // Variable para controlar el estado del botón de login
    let isLoginProcessing = false;

    // Variable para controlar el estado del botón de registro
    let isRegisterProcessing = false;

    // Variable para controlar el estado del botón de verificación
    let isVerifyProcessing = false;

    // ==================== FUNCIONES AUXILIARES ====================

    const showWrapper = (wrapperToShow) => {
        [loginWrapper, emailConfirmationWrapper, passwordRecoveryWrapper, verificationWrapper].forEach(wrapper => {
            if (wrapper) {
                wrapper.style.display = 'none';
                wrapper.classList.remove('slide-in');
                wrapper.classList.add('slide-out');
            }
        });

        if (wrapperToShow) {
            wrapperToShow.style.display = 'flex';
            setTimeout(() => {
                wrapperToShow.classList.remove('slide-out');
                wrapperToShow.classList.add('slide-in');
            }, 50);
        }
    };


    const disableLoginButton = () => {
        const loginButton = formLogin.querySelector('button[type="submit"]');

        if (loginButton) {
            isLoginProcessing = true;
            loginButton.disabled = true;
            loginButton.style.opacity = '0.7';
            loginButton.style.cursor = 'not-allowed';

            const originalText = loginButton.textContent;
            loginButton.setAttribute('data-original-text', originalText);
            loginButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Procesando...';

            // También deshabilitar el formulario completo para evitar submit con Enter
            const inputs = formLogin.querySelectorAll('input');
            inputs.forEach(input => {
                input.setAttribute('data-tabindex', input.tabIndex);
                input.tabIndex = -1;
            });
        }
    };

    const enableLoginButton = () => {
        const loginButton = formLogin.querySelector('button[type="submit"]');

        if (loginButton) {
            isLoginProcessing = false;
            loginButton.disabled = false;
            loginButton.style.opacity = '1';
            loginButton.style.cursor = 'pointer';

            const originalText = loginButton.getAttribute('data-original-text') || 'Ingresar';
            loginButton.textContent = originalText;

            // Rehabilitar inputs
            const inputs = formLogin.querySelectorAll('input');
            inputs.forEach(input => {
                const originalTabIndex = input.getAttribute('data-tabindex');
                if (originalTabIndex) {
                    input.tabIndex = parseInt(originalTabIndex);
                    input.removeAttribute('data-tabindex');
                } else {
                    input.tabIndex = 0;
                }
            });
        }
    };


    const disableRegisterButton = () => {
        const registerButton = formRegistro.querySelector('button[type="submit"]');

        if (registerButton) {
            isRegisterProcessing = true;
            registerButton.disabled = true;
            registerButton.style.opacity = '0.7';
            registerButton.style.cursor = 'not-allowed';

            const originalText = registerButton.textContent;
            registerButton.setAttribute('data-original-text', originalText);
            registerButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Procesando...';

            // También deshabilitar el formulario completo para evitar submit con Enter
            const inputs = formRegistro.querySelectorAll('input');
            inputs.forEach(input => {
                input.setAttribute('data-tabindex', input.tabIndex);
                input.tabIndex = -1;
            });
        }
    };

    const enableRegisterButton = () => {
        const registerButton = formRegistro.querySelector('button[type="submit"]');

        if (registerButton) {
            isRegisterProcessing = false;
            registerButton.disabled = false;
            registerButton.style.opacity = '1';
            registerButton.style.cursor = 'pointer';

            const originalText = registerButton.getAttribute('data-original-text') || 'Registrarse';
            registerButton.textContent = originalText;

            // Rehabilitar inputs
            const inputs = formRegistro.querySelectorAll('input');
            inputs.forEach(input => {
                const originalTabIndex = input.getAttribute('data-tabindex');
                if (originalTabIndex) {
                    input.tabIndex = parseInt(originalTabIndex);
                    input.removeAttribute('data-tabindex');
                } else {
                    input.tabIndex = 0;
                }
            });
        }
    };



    const disableVerifyButton = () => {
        const verifyButton = document.getElementById('verify-button');

        if (verifyButton) {
            isVerifyProcessing = true;
            verifyButton.disabled = true;
            verifyButton.style.opacity = '0.7';
            verifyButton.style.cursor = 'not-allowed';

            const originalText = verifyButton.textContent;
            verifyButton.setAttribute('data-original-text', originalText);
            verifyButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Verificando...';

            // También deshabilitar el input de código para evitar cambios
            const codeInput = document.getElementById('verification-code');
            if (codeInput) {
                codeInput.setAttribute('data-tabindex', codeInput.tabIndex);
                codeInput.tabIndex = -1;
                codeInput.disabled = true;
            }
        }
    };

    const enableVerifyButton = () => {
        const verifyButton = document.getElementById('verify-button');

        if (verifyButton) {
            isVerifyProcessing = false;
            verifyButton.disabled = false;
            verifyButton.style.opacity = '1';
            verifyButton.style.cursor = 'pointer';

            const originalText = verifyButton.getAttribute('data-original-text') || 'Verificar y acceder';
            verifyButton.innerHTML = '<i class="bx bx-check"></i> ' + originalText.replace(/^.*?\s/, ''); // Mantener solo el texto sin el icono

            // Rehabilitar el input de código
            const codeInput = document.getElementById('verification-code');
            if (codeInput) {
                const originalTabIndex = codeInput.getAttribute('data-tabindex');
                if (originalTabIndex) {
                    codeInput.tabIndex = parseInt(originalTabIndex);
                    codeInput.removeAttribute('data-tabindex');
                } else {
                    codeInput.tabIndex = 0;
                }
                codeInput.disabled = false;
            }
        }
    };
    // ==================== FUNCIONES PRINCIPALES ====================

    const handleLogin = async (email, password, isNewUser = false) => {
        // Prevenir múltiples ejecuciones
        if (isLoginProcessing) {
            return;
        }

        disableLoginButton();

        try {
            const notificationId = window.notifyService.loading("Verificando credenciales...");

            const retryKey = 'login_retry_until';
            const retryUntil = localStorage.getItem(retryKey);

            if (retryUntil && parseInt(retryUntil) > Date.now()) {
                const secondsLeft = Math.ceil((parseInt(retryUntil) - Date.now()) / 1000);
                window.notifyService.update(notificationId, `Demasiados intentos. Por favor espera ${secondsLeft} segundos.`, 'error', 3000);
                throw new Error(`Demasiados intentos. Por favor espera ${secondsLeft} segundos.`);
            }

            // Primera llamada a login-status para verificar credenciales
            let statusResponse;
            try {
                statusResponse = await fetch('/api/usuarios/login-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({
                        correo: email,
                        contraseña: password
                    }),
                    credentials: 'include'
                });
            } catch (networkError) {
                if (isDevelopment) {
                    console.log('Error de red en login-status:', networkError);
                }
                window.notifyService.update(notificationId, 'Error de conexión. Por favor verifica tu internet.', 'error', 4000);
                throw new Error('Error de conexión. Por favor verifica tu internet.');
            }

            if (!statusResponse.ok) {
                if (isDevelopment) {
                    console.log(`Error en login-status: ${statusResponse.status}`);
                }
                window.notifyService.update(notificationId, 'Error al verificar credenciales', 'error', 3000);
                throw new Error('Error al verificar credenciales');
            }

            let statusData;
            try {
                statusData = await statusResponse.json();
            } catch (parseError) {
                if (isDevelopment) {
                    console.log('Error al parsear respuesta de login-status:', parseError);
                }
                window.notifyService.update(notificationId, 'Error al procesar respuesta del servidor', 'error', 3000);
                throw new Error('Error al procesar respuesta del servidor');
            }

            window.notifyService.update(notificationId, "Validando acceso...", 'info');

            // NUEVO: Verificar si es una cuenta de Google
            if (statusData.reason === "GOOGLE_ACCOUNT" || statusData.isGoogleAccount) {
                // Destacar el botón de Google
                const googleButton = document.getElementById('customGoogleBtn');
                if (googleButton) {
                    googleButton.classList.add('highlight-google-button');

                    setTimeout(() => {
                        googleButton.classList.remove('highlight-google-button');
                    }, 5000);
                }

                // Mensaje personalizado para cuentas de Google
                window.notifyService.update(notificationId, 'Esta cuenta fue creada con Google. Por favor, usa el botón "Ingresar con Google" para iniciar sesión.', 'error', 5000);
                throw new Error('Esta cuenta fue creada con Google. Por favor, usa el botón "Ingresar con Google" para iniciar sesión.');
            }

            // NUEVO: Verificar si el correo ha sido verificado
            if (statusData.reason === "EMAIL_NOT_VERIFIED" ||
                (statusData.status === "error" && statusData.code === "EMAIL_NOT_VERIFIED")) {

                window.notifyService.update(notificationId, 'Cuenta no verificada. Por favor verifica tu correo electrónico.', 'warning', 4000);

                const userEmailElement = document.getElementById('userEmail');
                if (userEmailElement) {
                    userEmailElement.textContent = email;
                }

                const resendButton = document.querySelector('.resend-btn');
                if (resendButton && !resendButton.hasAttribute('email-set')) {
                    resendButton.setAttribute('email-set', 'true');
                    resendButton.addEventListener('click', async () => {
                        try {
                            const resendId = window.notifyService.loading('Enviando correo de verificación...');

                            const response = await fetch('/api/usuarios/resend-verification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ correo: email })
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                window.notifyService.update(resendId, errorData.error || 'Error al reenviar correo', 'error', 3000);
                                throw new Error(errorData.error || 'Error al reenviar correo');
                            }

                            window.notifyService.update(resendId, 'Se ha reenviado el correo de verificación', 'success', 3000);
                        } catch (error) {
                            window.notifyService.add(error.message, 'error', 3000);
                        }
                    });
                }

                showWrapper(emailConfirmationWrapper);

                throw new Error('Por favor verifica tu correo electrónico para iniciar sesión');
            }

            if (statusData.status === "error") {
                if (statusData.code === "RATE_LIMITED" && statusData.retryAfter) {
                    const retryTime = Date.now() + (statusData.retryAfter * 1000);
                    localStorage.setItem(retryKey, retryTime.toString());
                    window.notifyService.update(notificationId, `Demasiados intentos. Por favor espera ${statusData.retryAfter} segundos.`, 'error', 4000);
                    throw new Error(`Demasiados intentos. Por favor espera ${statusData.retryAfter} segundos.`);
                }

                window.notifyService.update(notificationId, statusData.error || 'Error de autenticación', 'error', 3000);
                throw new Error(statusData.error || 'Error de autenticación');
            }

            // Si hay una sesión activa que requiere verificación
            if (statusData.status === "verification_required" ||
                (statusData.reason === 'ACTIVE_SESSION' && statusData.requiresVerification)) {

                window.notifyService.update(notificationId, 'Verificación adicional requerida...', 'info');

                if (isDevelopment) {
                    console.log('Detectada sesión activa, requiere verificación');
                }

                // Llamada a login para generar un intento de inicio de sesión
                let loginResponse;
                try {
                    loginResponse = await fetch('/api/usuarios/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        body: JSON.stringify({
                            correo: email,
                            contraseña: password
                        }),
                        credentials: 'include'
                    });
                } catch (loginNetworkError) {
                    if (isDevelopment) {
                        console.log('Error de red en login:', loginNetworkError);
                    }
                    window.notifyService.update(notificationId, 'Error de conexión al iniciar sesión', 'error', 3000);
                    throw new Error('Error de conexión al iniciar sesión');
                }

                let loginData;
                try {
                    loginData = await loginResponse.json();
                } catch (loginParseError) {
                    if (isDevelopment) {
                        console.log('Error al parsear respuesta de login:', loginParseError);
                    }
                    window.notifyService.update(notificationId, 'Error al procesar respuesta del servidor', 'error', 3000);
                    throw new Error('Error al procesar respuesta del servidor');
                }

                if ((loginResponse.status === 200 && loginData.status === "verification_required") ||
                    (loginResponse.status === 409) ||
                    (loginData.requiresVerification)) {

                    window.notifyService.update(notificationId, 'Verificación de seguridad enviada a tu correo', 'success', 3000);

                    if (loginData.attemptId) {
                        showVerificationModal(email, loginData.attemptId);
                        return;
                    } else {
                        if (isDevelopment) {
                            console.log('Respuesta de verificación incompleta:', loginData);
                        }
                        window.notifyService.update(notificationId, 'Error al procesar la verificación', 'error', 3000);
                        throw new Error('Error al procesar la verificación');
                    }
                } else if (!loginResponse.ok || loginData.status === "error") {
                    window.notifyService.update(notificationId, loginData.error || 'Error de autenticación', 'error', 3000);
                    throw new Error(loginData.error || 'Error de autenticación');
                }
            }
            // Si las credenciales son incorrectas
            else if (!statusData.authenticated) {
                if (isDevelopment) {
                    console.log('Credenciales inválidas:', statusData);
                }
                window.notifyService.update(notificationId, statusData.message || 'Credenciales inválidas', 'error', 3000);
                throw new Error(statusData.message || 'Credenciales inválidas');
            }
            // Si todo está bien y podemos proceder con el login
            else {
                window.notifyService.update(notificationId, 'Credenciales correctas, iniciando sesión...', 'info');

                if (isDevelopment) {
                    console.log('Credenciales válidas, procediendo con login');
                }

                // Ahora hacer el login real para obtener los tokens
                let loginResponse;
                try {
                    loginResponse = await fetch('/api/usuarios/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        body: JSON.stringify({
                            correo: email,
                            contraseña: password
                        }),
                        credentials: 'include'
                    });
                } catch (loginNetworkError) {
                    if (isDevelopment) {
                        console.log('Error de red en login final:', loginNetworkError);
                    }
                    window.notifyService.update(notificationId, 'Error de conexión al completar inicio de sesión', 'error', 3000);
                    throw new Error('Error de conexión al completar inicio de sesión');
                }

                if (!loginResponse.ok) {
                    let errorData;
                    try {
                        errorData = await loginResponse.json();
                        window.notifyService.update(notificationId, errorData.error || 'Error de autenticación', 'error', 3000);
                        throw new Error(errorData.error || 'Error de autenticación');
                    } catch (errorParseError) {
                        if (isDevelopment) {
                            console.log('Error al parsear error de login:', errorParseError);
                        }
                        window.notifyService.update(notificationId, 'Error en la respuesta del servidor', 'error', 3000);
                        throw new Error('Error en la respuesta del servidor');
                    }
                }

                if (isNewUser) {
                    window.notifyService.update(notificationId, "Registro exitoso. Completando perfil...", 'success', 3000);
                    // Breve retraso antes de redireccionar
                    setTimeout(() => {
                        window.location.href = 'register_perfil';
                    }, 1500);
                } else {
                    window.notifyService.update(notificationId, "Inicio de sesión exitoso", 'success', 2000);
                    // Breve retraso antes de redireccionar
                    setTimeout(() => {
                        window.location.href = 'principal';
                    }, 1000);
                }
            }

        } catch (error) {
            // El error ya se ha mostrado en notificación dentro del código

            document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'refresh_token=; Path=/api/usuarios/refresh-token; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        } finally {
            // IMPORTANTE: Rehabilitar el botón siempre, sin importar si fue exitoso o con error
            enableLoginButton();
        }
    };

    const saveCredentials = (email, password, remember) => {
        if (remember) {
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userPassword', btoa(password)); // Codificación básica
            localStorage.setItem('rememberUser', 'true');
        } else {
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userPassword');
            localStorage.removeItem('rememberUser');
        }
    };

    const loadSavedCredentials = () => {
        const savedEmail = localStorage.getItem('userEmail');
        const savedPassword = localStorage.getItem('userPassword');
        const rememberUser = localStorage.getItem('rememberUser');

        if (savedEmail && savedPassword && rememberUser) {
            const emailInput = document.getElementById('correoLogin');
            const passwordInput = document.getElementById('contraseñaLogin');
            const rememberCheckbox = document.getElementById('recordarme');

            if (emailInput) emailInput.value = savedEmail;
            if (passwordInput) {
                try {
                    passwordInput.value = atob(savedPassword); // Decodificación
                } catch (e) {
                    // Si hay error en la decodificación, limpiar
                    localStorage.removeItem('userPassword');
                }
            }
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    };

    function showVerificationModal(email, attemptId) {
        const verificationEmailElement = document.getElementById('verification-email');
        if (verificationEmailElement) {
            verificationEmailElement.textContent = email;
        }

        verificationWrapper.dataset.attemptId = attemptId;

        const codeInput = document.getElementById('verification-code');
        if (codeInput) {
            codeInput.value = '';
        }

        const resendButton = document.getElementById('resend-button');
        if (resendButton) {
            resendButton.setAttribute('disabled', 'true');
            resendButton.style.opacity = '0.5';
            resendButton.style.pointerEvents = 'none';
        }

        showWrapper(verificationWrapper);

        startCountdown();

        if (!verificationWrapper.dataset.eventsSet) {
            const verifyButton = document.getElementById('verify-button');
            if (verifyButton) {
                verifyButton.addEventListener('click', () => {
                    // Evitar múltiples envíos
                    if (isVerifyProcessing) {
                        return;
                    }

                    const code = document.getElementById('verification-code').value;
                    const currentEmail = document.getElementById('verification-email').textContent;
                    const currentAttemptId = verificationWrapper.dataset.attemptId;

                    if (code && code.length === 6) {
                        verifyCode(currentEmail, code, currentAttemptId);
                    } else {
                        showAlert('Por favor ingresa el código completo de 6 dígitos', 'warning');
                    }
                });
            }

            const resendButton = document.getElementById('resend-button');
            if (resendButton) {
                resendButton.addEventListener('click', () => {
                    if (!resendButton.hasAttribute('disabled')) {
                        const currentEmail = document.getElementById('verification-email').textContent;
                        const currentAttemptId = verificationWrapper.dataset.attemptId;
                        requestNewCode(currentEmail, currentAttemptId);
                    }
                });
            }

            // Formato para el input de código (solo números)
            const codeInput = document.getElementById('verification-code');
            if (codeInput) {
                codeInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }

            verificationWrapper.dataset.eventsSet = 'true';
        }

        // Aviso de código enviado
        showAlert('Hemos enviado un código de verificación a tu correo', 'info');
    }

    function startCountdown() {
        let minutes = 10;
        let seconds = 0;
        const countdownElement = document.getElementById('countdown');
        const resendButton = document.getElementById('resend-button');

        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }

        if (resendButton) {
            resendButton.setAttribute('disabled', 'true');
            resendButton.style.opacity = '0.5';
            resendButton.style.pointerEvents = 'none';
        }

        const interval = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(interval);
                    countdownElement.textContent = '00:00';

                    if (resendButton) {
                        resendButton.removeAttribute('disabled');
                        resendButton.style.opacity = '1';
                        resendButton.style.pointerEvents = 'auto';
                    }
                    return;
                }
                minutes--;
                seconds = 59;
            } else {
                seconds--;
            }

            const displayMinutes = minutes.toString().padStart(2, '0');
            const displaySeconds = seconds.toString().padStart(2, '0');
            countdownElement.textContent = `${displayMinutes}:${displaySeconds}`;
        }, 1000);

        window.countdownInterval = interval;
    }

    async function requestNewCode(email, attemptId) {
        try {
            const notificationId = window.notifyService.loading('Solicitando nuevo código...');

            const csrfToken = window.csrfUtils ? window.csrfUtils.refreshToken() : null;

            const response = await fetch('/api/usuarios/login-attempts/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                },
                body: JSON.stringify({
                    email,
                    attemptId
                }),
                credentials: 'include'
            });

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                window.notifyService.update(notificationId, 'Error al procesar la respuesta del servidor', 'error', 3000);
                throw new Error('Error al procesar la respuesta del servidor');
            }

            if (!response.ok || (data.status === "error")) {
                window.notifyService.update(notificationId, data.error || 'Error al solicitar un nuevo código', 'error', 3000);
                throw new Error(data.error || 'Error al solicitar un nuevo código');
            }

            window.notifyService.update(notificationId, 'Hemos enviado un nuevo código a tu correo', 'success', 3000);

            // Reiniciar contador
            startCountdown();

        } catch (error) {
            // El error ya se muestra en notificación
        }
    }

    async function verifyCode(email, code, attemptId) {
        disableVerifyButton();

        try {
            if (!email || !code || !attemptId) {
                window.notifyService.add('Datos incompletos para verificación', 'error', 3000);
                return;
            }

            const notificationId = window.notifyService.loading('Verificando código...');

            // 1. Obtener un token CSRF fresco para esta solicitud crucial
            let csrfToken = null;
            if (window.csrfUtils && typeof window.csrfUtils.refreshToken === 'function') {
                try {
                    csrfToken = window.csrfUtils.refreshToken();
                } catch (csrfError) {
                    if (isDevelopment) {
                        console.log('Error al obtener token CSRF:', csrfError);
                    }
                }
            }

            // 2. Realizar la solicitud con el token CSRF
            const response = await fetch('/api/usuarios/login-attempts/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                },
                body: JSON.stringify({
                    email,
                    code,
                    attemptId,
                    forceLogin: true // Forzar inicio de sesión (cerrar otras sesiones)
                }),
                credentials: 'include' // Esencial para cookies
            });

            // 3. Procesar la respuesta
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                if (isDevelopment) {
                    console.log('Error al parsear respuesta de verificación:', parseError);
                }
                window.notifyService.update(notificationId, 'Error al procesar la respuesta del servidor', 'error', 3000);
                throw new Error('Error al procesar la respuesta del servidor');
            }

            // 4. Verificar si hay error en la respuesta
            if (!response.ok || (data.status === "error")) {
                window.notifyService.update(notificationId, data.error || 'Código inválido o expirado', 'error', 3000);
                throw new Error(data.error || 'Código inválido o expirado');
            }

            // 5. Limpiar intervalos
            if (window.countdownInterval) {
                clearInterval(window.countdownInterval);
            }

            window.notifyService.update(notificationId, 'Verificación exitosa, iniciando sesión...', 'success');

            // 6. Limpiar el campo de código
            const codeInput = document.getElementById('verification-code');
            if (codeInput) {
                codeInput.value = '';
            }

            // 7. Esperar un momento antes de redirigir
            await new Promise(resolve => setTimeout(resolve, 1500));

            window.notifyService.update(notificationId, 'Redirigiendo a tu cuenta...', 'success', 1500);

            // 8. Redirigir después de un breve momento adicional
            setTimeout(() => {
                window.location.href = 'principal';
            }, 500);

        } catch (error) {
            // El error ya se muestra en notificación
        } finally {
            // IMPORTANTE: Rehabilitar el botón siempre, sin importar si fue exitoso o con error
            enableVerifyButton();
        }
    }


    // ==================== GOOGLE SIGN-IN ====================

    const updateGoogleButtonState = (state) => {
        const customGoogleBtn = document.getElementById('customGoogleBtn');
        const googleRegisterBtn = document.querySelector('.social-button.google-register');

        const buttons = [customGoogleBtn, googleRegisterBtn].filter(btn => btn);

        buttons.forEach(button => {
            if (!button) return;

            const span = button.querySelector('span');

            switch (state) {
                case 'loading':
                    button.disabled = true;
                    button.style.opacity = '0.7';
                    button.style.cursor = 'not-allowed';
                    if (span) {
                        span.setAttribute('data-original-text', span.textContent);
                        span.innerHTML = '<i class="bx bx-loader-alt bx-spin" style="margin-right: 8px;"></i>Cargando Google...';
                    }
                    break;

                case 'ready':
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    if (span) {
                        const originalText = span.getAttribute('data-original-text');
                        if (originalText) {
                            span.textContent = originalText;
                        }
                    }
                    break;

                case 'error':
                    button.disabled = true;
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    if (span) {
                        span.setAttribute('data-original-text', span.textContent);
                        span.textContent = 'Google no disponible';
                    }
                    break;
            }
        });
    };

    // ==================== FUNCIÓN CORREGIDA - SIN ERRORES ====================

    const initializeGoogleAuth = async () => {
        try {
            const configResponse = await fetch('/api/config');
            const config = await configResponse.json();
            window.APP_CONFIG = config;

            if (!window.APP_CONFIG.GOOGLE_CLIENT_ID) {
                console.warn('Google Client ID no disponible');
                hideGoogleButtons();
                return;
            }

            // ⭐ MARCAR COMO LISTO (no necesitamos SDK para redirect)
            googleAuthState.isInitialized = true;
            googleAuthState.isInitializing = false;
            googleAuthState.hasError = false;
            updateGoogleButtonState('ready');

            setupGoogleRedirectButtons();

            if (isDevelopment) {
                console.log('✅ Google Auth redirect inicializado');
            }

        } catch (error) {
            googleAuthState.hasError = true;
            hideGoogleButtons();

            if (isDevelopment) {
                console.log('❌ Error en configuración Google:', error);
            }
        }
    };
    // ==================== CAMBIAR SOLO ESTA LÍNEA ====================

const setupGoogleRedirectButtons = () => {
    const handleGoogleRedirect = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const button = e.currentTarget;
        
        // Prevenir múltiples clicks
        if (button.dataset.processing === 'true') {
            return;
        }
        
        button.dataset.processing = 'true';
        const originalHTML = button.innerHTML;
        
        try {
            const span = button.querySelector('span');
            if (span) {
                span.innerHTML = '<i class="bx bx-loader-alt bx-spin" style="margin-right: 8px;"></i>Conectando con Google...';
            }

            if (!window.APP_CONFIG?.GOOGLE_CLIENT_ID) {
                const configResponse = await fetch('/api/config');
                if (!configResponse.ok) throw new Error('Error cargando configuración');
                
                const config = await configResponse.json();
                window.APP_CONFIG = config;
                
                if (!config.GOOGLE_CLIENT_ID) {
                    throw new Error('Google Client ID no configurado');
                }
            }

            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const redirectUri = isLocalhost 
                ? `${window.location.protocol}//${window.location.host}/api/usuarios/google-login`
                : 'https://acadelia.es/api/usuarios/google-login';

            const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            googleAuthUrl.searchParams.set('client_id', window.APP_CONFIG.GOOGLE_CLIENT_ID);
            googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
            googleAuthUrl.searchParams.set('response_type', 'code');
            googleAuthUrl.searchParams.set('scope', 'openid email profile');
            googleAuthUrl.searchParams.set('access_type', 'offline');
            googleAuthUrl.searchParams.set('prompt', 'select_account');

            // Redirigir
            window.location.href = googleAuthUrl.toString();
            
        } catch (error) {
            console.error('Error en Google Auth:', error);
            showAlert(error.message || 'Error al conectar con Google', 'error');
            
            button.innerHTML = originalHTML;
            button.dataset.processing = 'false';
        }
    };

    const setupButton = (selector) => {
        const button = document.querySelector(selector);
        if (button) {
            button.removeEventListener('click', handleGoogleRedirect);
            button.addEventListener('click', handleGoogleRedirect);
            console.log(`✅ Botón Google configurado: ${selector}`);
        }
    };

    setupButton('#customGoogleBtn');
    setupButton('.social-button.google-register');
};

    // ⭐ FUNCIÓN PARA OCULTAR BOTONES
    const hideGoogleButtons = () => {
        const customGoogleBtn = document.getElementById('customGoogleBtn');
        const googleRegisterBtn = document.querySelector('.social-button.google-register');

        [customGoogleBtn, googleRegisterBtn].forEach(button => {
            if (button) {
                button.style.display = 'none';
            }
        });

        if (isDevelopment) {
            console.log('🔒 Botones de Google ocultos - servicio no disponible');
        }
    };

    // ==================== MANEJO DEL DOM Y EVENTOS ====================

    loadSavedCredentials();

    if (linkRegistro) {
        linkRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.add('active');
        });
    }

    if (linkIngresar) {
        linkIngresar.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.remove('active');
        });
    }

    // Botones ghost para cambiar entre formularios
    if (ghostBtnRegistro) {
        ghostBtnRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.add('active');
        });
    }

    if (ghostBtnIngresar) {
        ghostBtnIngresar.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.remove('active');
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Evitar múltiples envíos
            if (isLoginProcessing) {
                return;
            }

            const email = document.getElementById('correoLogin').value;
            const password = document.getElementById('contraseñaLogin').value;
            const rememberMe = document.getElementById('recordarme')?.checked || false;

            if (!email || !password) {
                showAlert('Por favor completa todos los campos', 'warning');
                return;
            }

            saveCredentials(email, password, rememberMe);

            await handleLogin(email, password);
        });
    }

    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Evitar múltiples envíos
            if (isRegisterProcessing) {
                return;
            }

            const email = document.getElementById('correoRegistro').value;
            const password = document.getElementById('contraseñaRegistro').value;
            const confirmPassword = document.getElementById('confirmarContraseña').value;
            const acceptTerms = document.getElementById('aceptarTerminos').checked;

            if (!email || !password || !confirmPassword) {
                showAlert('Por favor completa todos los campos', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Las contraseñas no coinciden', 'warning');
                return;
            }

            if (!acceptTerms) {
                showAlert('Debes aceptar los términos y condiciones para registrarte', 'warning');
                return;
            }

            disableRegisterButton();

            try {
                const notificationId = window.notifyService.loading('Verificando disponibilidad...');

                const checkResponse = await fetch('/api/usuarios/registration-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: email }),
                    credentials: 'include'
                });

                if (!checkResponse.ok) {
                    window.notifyService.update(notificationId, 'Error al verificar disponibilidad del correo', 'error', 3000);
                    throw new Error('Error al verificar disponibilidad del correo');
                }

                const checkData = await checkResponse.json();

                if (!checkData.available) {
                    window.notifyService.update(notificationId, checkData.message || 'Este correo ya está registrado', 'warning', 3000);
                    throw new Error(checkData.message || 'Este correo ya está registrado');
                }

                window.notifyService.update(notificationId, 'Creando cuenta...', 'info');

                const response = await fetch('/api/usuarios/usuarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        correo: email,
                        contraseña: password,
                        confirmarContraseña: confirmPassword,
                        aceptarTerminos: acceptTerms
                    }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    window.notifyService.update(notificationId, errorData.error || 'Error en el registro', 'error', 3000);
                    throw new Error(errorData.error || 'Error en el registro');
                }

                const data = await response.json();

                const userEmailElement = document.getElementById('userEmail');
                if (userEmailElement) {
                    userEmailElement.textContent = email;
                }

                const resendButton = document.querySelector('.resend-btn');
                if (resendButton) {
                    const newResendBtn = resendButton.cloneNode(true);
                    resendButton.parentNode.replaceChild(newResendBtn, resendButton);

                    newResendBtn.addEventListener('click', async () => {
                        try {
                            const resendId = window.notifyService.loading('Enviando correo de verificación...');

                            const response = await fetch('/api/usuarios/resend-verification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ correo: email })
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                window.notifyService.update(resendId, errorData.error || 'Error al reenviar correo', 'error', 3000);
                                throw new Error(errorData.error || 'Error al reenviar correo');
                            }

                            window.notifyService.update(resendId, 'Se ha reenviado el correo de verificación', 'success', 3000);
                        } catch (error) {
                            window.notifyService.add(error.message, 'error', 3000);
                        }
                    });
                }

                showWrapper(emailConfirmationWrapper);

                window.notifyService.update(notificationId, 'Registro exitoso. Por favor, verifica tu correo electrónico.', 'success', 3000);

            } catch (error) {
                // El error ya se mostró en la notificación

            } finally {
                // IMPORTANTE: Rehabilitar el botón siempre
                enableRegisterButton();
            }
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showWrapper(passwordRecoveryWrapper);
        });
    }

    backToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showWrapper(loginWrapper);
            wrapper.classList.remove('active'); // Asegurarse de mostrar el login, no el registro
        });
    });

    if (recoveryForm) {
        recoveryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('recoveryEmail').value;

            if (!email) {
                showAlert('Por favor ingresa tu correo electrónico', 'warning');
                return;
            }

            try {
                showAlert('Procesando solicitud...', 'info');

                const csrfToken = window.csrfUtils && typeof window.csrfUtils.refreshToken === 'function' ?
                    window.csrfUtils.refreshToken() : null;

                const response = await fetch('/api/usuarios/request-reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                    },
                    body: JSON.stringify({ correo: email })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al procesar la solicitud');
                }

                showAlert('Si el correo existe, recibirás instrucciones para restablecer tu contraseña', 'success');

                document.getElementById('recoveryEmail').value = '';

                // Volver a la vista de login después de un tiempo
                setTimeout(() => {
                    showWrapper(loginWrapper);
                }, 1000);
            } catch (error) {
                showAlert(error.message || 'Error al procesar la solicitud', 'error');
            }
        });
    }

    const resendButton = document.querySelector('.resend-btn');
    if (resendButton) {
        resendButton.addEventListener('click', () => {
            const userEmail = document.getElementById('userEmail').textContent;
            showAlert(`Se reenviará el correo de confirmación a: ${userEmail}`, 'info');
        });
    }

    // ==================== VALIDACIÓN DE CONTRASEÑAS ====================

    const togglePasswordButtons = document.querySelectorAll('.toggle-password');

    togglePasswordButtons.forEach((button) => {
        button.addEventListener('click', function (e) {
            e.preventDefault();

            const input = this.closest('.input-box').querySelector('input');
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bx-show');
                icon.classList.add('bx-hide');
                this.setAttribute('aria-label', 'Ocultar contraseña');
                this.setAttribute('title', 'Ocultar contraseña');
            } else {
                input.type = 'password';
                icon.classList.remove('bx-hide');
                icon.classList.add('bx-show');
                this.setAttribute('aria-label', 'Mostrar contraseña');
                this.setAttribute('title', 'Mostrar contraseña');
            }
        });
    });

    const passwordRegister = document.getElementById('contraseñaRegistro');
    const confirmPassword = document.getElementById('confirmarContraseña');

    if (passwordRegister) {
        passwordRegister.addEventListener('input', function () {
            validatePasswordStrength(this.value);

            // Si hay algo en la confirmación, validar coincidencia
            if (confirmPassword && confirmPassword.value) {
                validatePasswordMatch(this.value, confirmPassword.value);
            }
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', function () {
            validatePasswordMatch(passwordRegister.value, this.value);
        });
    }

    function validatePasswordStrength(password) {
        const existingIndicator = document.querySelector('.password-strength');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (!password) return;

        let strength = 0;
        let message = '';
        let color = '';

        // Criterios de validación
        if (password.length >= 8) strength += 1;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
        if (password.match(/\d/)) strength += 1;
        if (password.match(/[^a-zA-Z\d]/)) strength += 1;

        if (strength === 0) {
            message = 'Muy débil';
            color = '#ff4d4d';
        } else if (strength === 1) {
            message = 'Débil';
            color = '#ffa64d';
        } else if (strength === 2) {
            message = 'Media';
            color = '#ffff4d';
        } else if (strength === 3) {
            message = 'Fuerte';
            color = '#4dff4d';
        } else {
            message = 'Muy fuerte';
            color = '#4d4dff';
        }

        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';

        const passwordInput = document.getElementById('contraseñaRegistro');
        const parentDiv = passwordInput.closest('.input-box');
        parentDiv.insertAdjacentElement('afterend', strengthIndicator);

        strengthIndicator.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill"></div>
            </div>
            <span style="color: ${color};">${message}</span>
        `;

        const strengthFill = strengthIndicator.querySelector('.strength-fill');
        strengthFill.style.width = `${(strength / 4) * 100}%`;
        strengthFill.style.backgroundColor = color;

        setTimeout(() => {
            strengthFill.style.transition = 'width 0.3s ease-in-out';
        }, 10);
    }

    function validatePasswordMatch(password, confirm) {
        const existingMessage = document.querySelector('.password-match');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!confirm) return;

        const matchMessage = document.createElement('div');
        matchMessage.className = 'password-match';

        if (password === confirm) {
            matchMessage.innerHTML = '<span style="color: #4dff4d;">✓ Las contraseñas coinciden</span>';
        } else {
            matchMessage.innerHTML = '<span style="color: #ff4d4d;">✗ Las contraseñas no coinciden</span>';
        }

        matchMessage.style.marginTop = '-10px';
        matchMessage.style.marginBottom = '10px';
        matchMessage.style.fontSize = '0.8rem';
        matchMessage.style.width = '100%';

        const confirmInput = document.getElementById('confirmarContraseña');
        const parentDiv = confirmInput.closest('.input-box');
        parentDiv.insertAdjacentElement('afterend', matchMessage);
    }

    // ==================== INICIALIZACIÓN FINAL ====================

    setTimeout(initializeGoogleAuth, 200);
});