/**
 * Script mejorado para la página de términos y condiciones
 * Incluye notificaciones del proceso de aceptación y mejoras visuales
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Ocultar contenido inicialmente
    
    // Referencias a elementos del DOM
    const ingresarBtn = document.querySelector('.ingresar-btn');
    const mobileBtns = document.querySelector('.mobile-menu');
    const termsContent = document.querySelector('.terms-content');
    const termsHeader = document.querySelector('.terms-header');
    
    // Estado de la página
    const pageState = {
        isAuthenticated: false,
        currentVersion: '',
        isRequired: false,
        userId: null,
        userEmail: ''
    };
    
    // Crear el overlay de procesamiento
    createProcessingOverlay();
    
    // Obtener parámetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    pageState.isRequired = urlParams.get('required') === 'true';
    pageState.currentVersion = urlParams.get('version') || '1.0';
    
    // Verificar autenticación
    await checkAuthentication();
    
    // Si está autenticado y requiere aceptación, mostrar mensaje y botón
    if (pageState.isAuthenticated && pageState.isRequired) {
        showAcceptanceRequiredMessage();
        addAcceptTermsButton();
    }
    
    // Siempre mostrar el contenido de la página después de verificar
    
    /**
     * Crea el overlay de procesamiento
     */
    function createProcessingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'processing-overlay';
        overlay.id = 'processingOverlay';
        
        overlay.innerHTML = `
            <div class="processing-container">
                <div class="processing-spinner"></div>
                <div class="processing-text">Procesando tu solicitud</div>
                <div class="processing-subtext">Esto solo tomará un momento...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    /**
     * Muestra el overlay de procesamiento
     */
    function showProcessingOverlay(message = 'Procesando tu solicitud') {
        const overlay = document.getElementById('processingOverlay');
        const textElement = overlay.querySelector('.processing-text');
        
        if (textElement) {
            textElement.textContent = message;
        }
        
        overlay.classList.add('show');
    }
    
    /**
     * Oculta el overlay de procesamiento
     */
    function hideProcessingOverlay() {
        const overlay = document.getElementById('processingOverlay');
        overlay.classList.remove('show');
    }
    
    /**
     * Verifica si el usuario está autenticado
     */
    async function checkAuthentication() {
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
            
            const data = await response.json();
            
            if (data.authenticated) {
                console.log('Usuario autenticado:', data.user);
                pageState.isAuthenticated = true;
                pageState.userId = data.user.id_user;
                pageState.userEmail = data.user.correo;
                
                // Mostrar mensaje de bienvenida personalizado
                showAlert(`Bienvenido, ${data.user.nombre || 'Usuario'}`, 'success', 2000);
  // Usuario autenticado - los botones permanecen ocultos (por CSS)
// No agregar la clase show-login-buttons
                
                // Si el usuario está autenticado pero no fue redirigido,
                // verificar si ya aceptó los términos actuales
                if (!pageState.isRequired) {
                    await checkTermsAcceptance();
                }
            } else {
               document.body.classList.add('show-login-buttons');
            }
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            
            // Mostrar mensaje de error
            showAlert('Error al verificar tu estado de sesión. Intenta recargando la página.', 'error');
            
            // En caso de error, mostrar los botones de ingreso
document.body.classList.add('show-login-buttons');
        }
    }
    
    /**
     * Verifica si el usuario ya ha aceptado los términos actuales
     */
    async function checkTermsAcceptance() {
        try {
            showAlert('Verificando aceptación de términos...', 'info', 2000);
            
            const response = await fetch('/api/terminos/verificar', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.warn('Error al verificar términos:', response.status);
                showAlert('No pudimos verificar el estado de tus términos', 'warning');
                return;
            }
            
            const data = await response.json();
            pageState.currentVersion = data.currentVersion;
            
            // Si ya ha aceptado, no mostrar botón ni mensaje
            if (data.hasAccepted) {
                console.log('Términos ya aceptados');
                showAlert('Ya has aceptado los términos y condiciones actuales', 'success', 3000);
            } else {
                // Si no ha aceptado pero está en la página de términos voluntariamente,
                // mostrar botón de aceptación sin el mensaje de requerimiento
                showAlert('Se recomienda aceptar los términos actualizados', 'info', 4000);
                addAcceptTermsButton();
            }
        } catch (error) {
            console.error('Error al verificar aceptación de términos:', error);
            showAlert('Error al verificar aceptación de términos', 'error');
        }
    }
    
    /**
     * Muestra mensaje de que se requiere aceptación de términos
     */
    function showAcceptanceRequiredMessage() {
        // Crear contenedor de alerta
        const alertContainer = document.createElement('div');
        alertContainer.className = 'terms-alert required';
        
        // Crear ícono de alerta
        const alertIcon = document.createElement('i');
        alertIcon.className = 'bx bx-error-circle';
        
        // Crear texto de la alerta
        const alertText = document.createElement('div');
        alertText.className = 'alert-text';
        alertText.innerHTML = `
            <strong>Se requiere tu aceptación</strong>
            <p>Para continuar utilizando Acadelia, debes aceptar los Términos y Condiciones actualizados (versión ${pageState.currentVersion}). Si no deseas aceptar estos términos, puedes gestionar el cierre de tu cuenta desde tu perfil.</p>
        `;
        
        // Ensamblar alerta
        alertContainer.appendChild(alertIcon);
        alertContainer.appendChild(alertText);
        
        // Añadir efectos de animación
        alertContainer.style.opacity = '0';
        alertContainer.style.transform = 'translateY(-10px)';
        
        // Insertar después del header de términos
        if (termsHeader) {
            termsHeader.insertAdjacentElement('afterend', alertContainer);
        } else {
            // Fallback si no existe el header
            const container = document.querySelector('.terms-container');
            if (container) {
                container.insertAdjacentElement('afterbegin', alertContainer);
            }
        }
        
        // Mostrar con animación
        setTimeout(() => {
            alertContainer.style.transition = 'all 0.5s ease';
            alertContainer.style.opacity = '1';
            alertContainer.style.transform = 'translateY(0)';
        }, 100);
    }
    
    /**
     * Añade botón para aceptar términos al final de la página
     */
    function addAcceptTermsButton() {
        // Crear contenedor para botones
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'terms-buttons';
        
        // Crear botón de aceptar
        const acceptButton = document.createElement('button');
        acceptButton.className = 'terms-button accept';
        acceptButton.innerHTML = '<i class="bx bx-check-circle" style="margin-right: 8px;"></i>Aceptar Términos y Condiciones';
        acceptButton.addEventListener('click', handleAcceptTerms);
        
        // Crear botón de rechazar/gestionar cuenta
        const rejectButton = document.createElement('button');
        rejectButton.className = 'terms-button reject';
        rejectButton.innerHTML = '<i class="bx bx-cog" style="margin-right: 8px;"></i>Gestionar mi cuenta';
        rejectButton.addEventListener('click', () => {
            showProcessingOverlay('Redirigiendo a tu perfil...');
            setTimeout(() => {
                window.location.href = '/delete-account';
            }, 800);
        });
        
        // Añadir botones al contenedor con animación de entrada
        buttonContainer.style.opacity = '0';
        buttonContainer.style.transform = 'translateY(20px)';
        
        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(rejectButton);
        
        // Añadir al final del contenido
        if (termsContent) {
            termsContent.appendChild(buttonContainer);
        } else {
            // Fallback si no existe el contenedor de términos
            const container = document.querySelector('.terms-container');
            if (container) {
                container.appendChild(buttonContainer);
            }
        }
        
        // Mostrar con animación
        setTimeout(() => {
            buttonContainer.style.transition = 'all 0.5s ease';
            buttonContainer.style.opacity = '1';
            buttonContainer.style.transform = 'translateY(0)';
        }, 300);
        
    }
    
    /**
     * Maneja la aceptación de términos
     */
    async function handleAcceptTerms() {
        try {
            // Mostrar overlay de procesamiento
            showProcessingOverlay('Procesando tu aceptación...');
            
            // Obtener token CSRF
            const csrfToken = getCsrfToken();
            
            // Simular retraso para procesamiento (solo para demo, puedes quitar esto)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Enviar solicitud de aceptación
            const response = await fetch('/api/terminos/aceptar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    version: pageState.currentVersion
                })
            });
            
            // Ocultar overlay de procesamiento
            hideProcessingOverlay();
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al aceptar términos');
            }
            
            // Procesar respuesta
            const data = await response.json();
            
            if (data.success) {
                // Mostrar mensaje de éxito
                showAlert('¡Términos aceptados correctamente! Redirigiendo...', 'success');
                
                // Deshabilitar los botones
                const acceptButton = document.querySelector('.terms-button.accept');
                const rejectButton = document.querySelector('.terms-button.reject');
                
                if (acceptButton) {
                    acceptButton.disabled = true;
                    acceptButton.style.opacity = '0.7';
                    acceptButton.innerHTML = '<i class="bx bx-check-double" style="margin-right: 8px;"></i>Términos Aceptados';
                }
                
                if (rejectButton) {
                    rejectButton.style.display = 'none';
                }
                
                // Redireccionar después de un breve retraso
                setTimeout(() => {
                    showProcessingOverlay('Redirigiendo a la página principal...');
                    setTimeout(() => {
                        window.location.href = '/principal';
                    }, 800);
                }, 1500);
            } else {
                throw new Error('Error al procesar la aceptación');
            }
        } catch (error) {
            console.error('Error al aceptar términos:', error);
            hideProcessingOverlay();
            showAlert('Error: ' + error.message, 'error');
        }
    }
    
    /**
     * Obtiene token CSRF
     */
    function getCsrfToken() {
        // Si existe csrfUtils, usarlo
        if (window.csrfUtils && typeof window.csrfUtils.getToken === 'function') {
            return window.csrfUtils.getToken();
        }
        
        // Intentar obtener de meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            const token = metaTag.getAttribute('content');
            return token;
        }
        
        return null;
    }
    
    /**
     * Muestra una alerta personalizada
     */
    function showAlert(message, type = 'info', duration = 3000) {
        const alertTypes = {
            success: { icon: '<i class="bx bx-check-circle"></i>', class: 'alert-success' },
            error: { icon: '<i class="bx bx-error-circle"></i>', class: 'alert-error' },
            warning: { icon: '<i class="bx bx-error"></i>', class: 'alert-warning' },
            info: { icon: '<i class="bx bx-info-circle"></i>', class: 'alert-info' }
        };

        // Eliminar alertas anteriores del mismo tipo
        const existingAlerts = document.querySelectorAll(`.custom-alert.${alertTypes[type].class}`);
        existingAlerts.forEach(alert => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        });

        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert ${alertTypes[type].class}`;
        
        alertDiv.innerHTML = `
            <span class="alert-icon">${alertTypes[type].icon}</span>
            <div class="alert-content">${message}</div>
        `;

        document.body.appendChild(alertDiv);
        
        // Agregar la clase después de un breve retraso para permitir la animación
        setTimeout(() => alertDiv.classList.add('show'), 10);
        
        // Eliminar la alerta después del tiempo especificado
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 400);
        }, duration);
    }
});