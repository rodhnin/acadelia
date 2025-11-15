

// Script para gestión de cookies en cuenta
document.addEventListener('DOMContentLoaded', function() {
    // Referencia al botón de gestionar cookies

        // Variables para controlar botones de cookies en cuenta
    let isAcceptingAllCookiesAccount = false;
    let isSavingCookiePreferencesAccount = false;
    const openCookieSettingsBtn = document.getElementById('open-cookie-settings');
    
    if (openCookieSettingsBtn) {
        openCookieSettingsBtn.addEventListener('click', function() {
            // Primero cargar las preferencias actuales de cookies
            loadCurrentCookiePreferences();
            
            showCookieBanner();
            
            // Asegurarse de que el panel de configuración esté visible
            const settings = document.querySelector('.cookie-settings');
            if (settings && !settings.classList.contains('active')) {
                settings.classList.add('active');
            }
        });
    }
    
    function showCookieBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.add('active');
        } else {
            console.error('Banner de cookies no encontrado');
            // Si no existe el banner, inicializar
            if (typeof initCookieConsent === 'function') {
                initCookieConsent();
            } else if (typeof window.initCookieConsent === 'function') {
                window.initCookieConsent();
            } else {
                console.error('Función initCookieConsent no disponible');
                loadCookieConsentScript();
            }
        }
    }
    
    function hideCookieBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.remove('active');
            
            // Asegurarse de que el panel de configuración también se cierre
            const settings = document.querySelector('.cookie-settings');
            if (settings) {
                settings.classList.remove('active');
                settings.setAttribute('data-visible', 'false');
                settings.style.display = 'none';
            }
        }
    }
    
    async function saveCookiePreferences(preferences) {
        try {
            const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await window.csrfUtils.fetch('/api/cookie-consent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(preferences),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Error al guardar preferencias');
            }
            
            localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
            
            return true;
        } catch (error) {
            console.error('Error guardando preferencias:', error);
            return false;
        }
    }
    
    function loadCookieConsentScript() {
        if (!document.querySelector('script[src="/scripts/cookie-consent-initializer.js"]')) {
            const script = document.createElement('script');
            script.src = '/scripts/cookie-consent-initializer.js';
            document.body.appendChild(script);
            
            script.onload = function() {
                console.log('Script de cookies cargado con éxito');
                // Tras cargar, esperar un momento y mostrar banner
                setTimeout(() => {
                    showCookieBanner();
                }, 500);
            };
        }
    }
    
    const disableAcceptAllButtonAccount = () => {
        const acceptButton = document.getElementById('accept-all-cookies');
        
        if (acceptButton) {
            isAcceptingAllCookiesAccount = true;
            acceptButton.disabled = true;
            acceptButton.style.opacity = '0.7';
            acceptButton.style.cursor = 'not-allowed';
            
            const originalText = acceptButton.textContent;
            acceptButton.setAttribute('data-original-text', originalText);
            acceptButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Procesando...';
        }
    };

    const enableAcceptAllButtonAccount = () => {
        const acceptButton = document.getElementById('accept-all-cookies');
        
        if (acceptButton) {
            isAcceptingAllCookiesAccount = false;
            acceptButton.disabled = false;
            acceptButton.style.opacity = '1';
            acceptButton.style.cursor = 'pointer';
            
            const originalText = acceptButton.getAttribute('data-original-text') || 'Aceptar todas';
            acceptButton.textContent = originalText;
        }
    };

    const disableSavePreferencesButtonAccount = () => {
        const saveButton = document.getElementById('save-cookie-preferences');
        
        if (saveButton) {
            isSavingCookiePreferencesAccount = true;
            saveButton.disabled = true;
            saveButton.style.opacity = '0.7';
            saveButton.style.cursor = 'not-allowed';
            
            const originalText = saveButton.textContent;
            saveButton.setAttribute('data-original-text', originalText);
            saveButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';
        }
    };

    const enableSavePreferencesButtonAccount = () => {
        const saveButton = document.getElementById('save-cookie-preferences');
        
        if (saveButton) {
            isSavingCookiePreferencesAccount = false;
            saveButton.disabled = false;
            saveButton.style.opacity = '1';
            saveButton.style.cursor = 'pointer';
            
            const originalText = saveButton.getAttribute('data-original-text') || 'Guardar preferencias';
            saveButton.textContent = originalText;
        }
    };


    async function loadCurrentCookiePreferences() {
        try {
            const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await window.csrfUtils.fetch('/api/cookie-consent/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });
            
            // Ahora response.ok siempre será true
            const data = await response.json();
            
            if (data && data.preferences) {
                console.log('Preferencias actuales cargadas:', data.preferences);
                
                const functionalToggle = document.getElementById('functional-cookies-toggle');
                const analyticsToggle = document.getElementById('analytics-cookies-toggle');
                const marketingToggle = document.getElementById('marketing-cookies-toggle');
                
                if (functionalToggle) functionalToggle.checked = data.preferences.functional;
                if (analyticsToggle) analyticsToggle.checked = data.preferences.analytics;
                if (marketingToggle) marketingToggle.checked = data.preferences.marketing;
            }
        } catch (error) {
            console.error('Error cargando preferencias de cookies:', error);
        }
    }
    
    function ensureCookieListeners() {
        const saveBtn = document.getElementById('save-cookie-preferences');
        if (saveBtn && !saveBtn._hasCustomListener) {
            saveBtn.addEventListener('click', handleSavePreferences);
            saveBtn._hasCustomListener = true;
        }
        
    const acceptAllBtn = document.getElementById('accept-all-cookies');
    if (acceptAllBtn && !acceptAllBtn._hasCustomListener) {
        acceptAllBtn.addEventListener('click', async () => {
            // Evitar múltiples clics
            if (isAcceptingAllCookiesAccount) {
                return;
            }
            
            disableAcceptAllButtonAccount();
            
            try {
                if (typeof window.acceptAllCookies === 'function') {
                    await window.acceptAllCookies();
                } else {
                    const preferences = {
                        essential: true,
                        functional: true,
                        analytics: true,
                        marketing: true
                    };
                    await saveCookiePreferences(preferences);
                }
                
                hideCookieBanner();
                
                showNotification('Preferencias guardadas', 'Todas las cookies han sido aceptadas.', 'success');
                
            } catch (error) {
                console.error('Error aceptando cookies:', error);
                showNotification('Error', 'Hubo un problema al guardar las preferencias.', 'error');
            } finally {
                // Rehabilitar botón después de un breve delay
                setTimeout(() => {
                    enableAcceptAllButtonAccount();
                }, 200);
            }
        });
        acceptAllBtn._hasCustomListener = true;
    }
        
        const rejectBtn = document.getElementById('reject-all-cookies');
        if (rejectBtn && !rejectBtn._hasCustomListener) {
            rejectBtn.addEventListener('click', () => {
                if (typeof window.rejectOptionalCookies === 'function') {
                    window.rejectOptionalCookies();
                } else {
                    const preferences = {
                        essential: true,
                        functional: false,
                        analytics: false,
                        marketing: false
                    };
                    saveCookiePreferences(preferences);
                }
                
                showNotification('Preferencias guardadas', 'Solo se utilizarán cookies esenciales.', 'success');
                
                setTimeout(hideCookieBanner, 1000);
            });
            rejectBtn._hasCustomListener = true;
        }
    }
    
  // Manejador para el botón de guardar preferencias personalizadas
    async function handleSavePreferences() {
        // Evitar múltiples clics
        if (isSavingCookiePreferencesAccount) {
            return;
        }
        
        disableSavePreferencesButtonAccount();
        
        try {
            if (typeof window.saveCustomCookiePreferences === 'function') {
                await window.saveCustomCookiePreferences();
            } else {
                const preferences = {
                    essential: true, // Siempre activas
                    functional: document.getElementById('functional-cookies-toggle')?.checked || false,
                    analytics: document.getElementById('analytics-cookies-toggle')?.checked || false,
                    marketing: document.getElementById('marketing-cookies-toggle')?.checked || false
                };
                
                await saveCookiePreferences(preferences);
            }
            
            hideCookieBanner();
            
            showNotification('Preferencias guardadas', 'Tus preferencias de cookies han sido actualizadas.', 'success');
            
        } catch (error) {
            console.error('Error guardando preferencias:', error);
            showNotification('Error', 'Hubo un problema al guardar las preferencias.', 'error');
        } finally {
            // Rehabilitar botón después de un breve delay
            setTimeout(() => {
                enableSavePreferencesButtonAccount();
            }, 200);
        }
    }
    
    function showNotification(title, message, type = 'info') {
        if (window.showCustomAlert) {
            window.showCustomAlert(title, message, type);
        } else {
            const alertHTML = `
                <div class="custom-alert alert-${type}">
                    <div class="alert-icon">
                        <i class='bx ${getIconForType(type)}'></i>
                    </div>
                    <div class="alert-content">
                        <p>${title}</p>
                        <p>${message}</p>
                    </div>
                </div>
            `;
            
            const alertContainer = document.createElement('div');
            alertContainer.innerHTML = alertHTML;
            document.body.appendChild(alertContainer.firstElementChild);
            
            const alert = document.querySelector('.custom-alert');
            setTimeout(() => alert.classList.add('show'), 10);
            
            setTimeout(() => {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }, 3000);
        }
    }
    
    function getIconForType(type) {
        switch(type) {
            case 'success': return 'bx-check-circle';
            case 'error': return 'bx-error-circle';
            case 'warning': return 'bx-error';
            default: return 'bx-info-circle';
        }
    }
    
    // Buscamos el botón de personalizar cookies y arreglamos su comportamiento
    function fixCustomizeButtonBehavior() {
        const customizeButton = document.getElementById('customize-cookies');
        if (customizeButton) {
            const newButton = customizeButton.cloneNode(true);
            customizeButton.parentNode.replaceChild(newButton, customizeButton);
            
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Botón Personalizar clickeado (event listener corregido)');
                
                const settings = document.querySelector('.cookie-settings');
                if (!settings) {
                    console.error('ERROR: Elemento .cookie-settings no encontrado');
                    return;
                }
                
                const isVisible = settings.classList.contains('active');
                console.log('Panel visible:', isVisible);
                
                if (isVisible) {
                    settings.style.display = 'none';
                    settings.classList.remove('active');
                    settings.setAttribute('data-visible', 'false');
                    console.log('Panel ocultado');
                } else {
                    settings.style.display = 'block';
                    settings.classList.add('active');
                    settings.setAttribute('data-visible', 'true');
                    console.log('Panel mostrado');
                    
                    // Forzar la visibilidad después de un momento
                    setTimeout(function() {
                        settings.style.display = 'block';
                    }, 10);
                }
            });
        }
    }

    // cuando el banner de cookies se inserte dinámicamente
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.id === 'cookie-consent-banner') {
                        console.log('Banner de cookies detectado, añadiendo listeners');
                        ensureCookieListeners();
                        fixCustomizeButtonBehavior();
                        break;
                    }
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // También intentar asegurar listeners al cargar
    ensureCookieListeners();
    
    setTimeout(fixCustomizeButtonBehavior, 500);
});