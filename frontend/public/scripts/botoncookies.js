// Funciones del banner de cookies
function showCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
        banner.classList.add('active');
    }
}

function hideCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
        banner.classList.remove('active');
    }
}

function toggleCookieSettings() {
    const settings = document.querySelector('.cookie-settings');
    if (settings) {
        settings.classList.toggle('active');
    }
}

// Función para guardar las preferencias de cookies
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
        
        // Guardar en localStorage para referencia rápida
        localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
        
        // Ocultar el banner
        hideCookieBanner();
        
        return true;
    } catch (error) {
        console.error('Error guardando preferencias:', error);
        return false;
    }
}

// Agregar event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Botón para abrir la configuración de cookies desde la página de políticas
    document.getElementById('open-cookie-settings')?.addEventListener('click', function() {
        showCookieBanner();
        // Asegurarse de que el panel de configuración esté visible
        const settings = document.querySelector('.cookie-settings');
        if (settings && !settings.classList.contains('active')) {
            settings.classList.add('active');
        }
    });

    // Verificar si el banner de cookies existe
    if (document.getElementById('cookie-consent-banner')) {
        // Botón para personalizar cookies
        document.getElementById('customize-cookies')?.addEventListener('click', function() {
            toggleCookieSettings();
        });
        
        // Botón para aceptar todas las cookies
        document.getElementById('accept-all-cookies')?.addEventListener('click', function() {
            saveCookiePreferences({
                essential: true,
                functional: true,
                analytics: true,
                marketing: true
            });
        });
        
        // Botón para rechazar cookies opcionales
        document.getElementById('reject-all-cookies')?.addEventListener('click', function() {
            saveCookiePreferences({
                essential: true,
                functional: false,
                analytics: false,
                marketing: false
            });
        });
        
        // Botón para guardar preferencias personalizadas
        document.getElementById('save-cookie-preferences')?.addEventListener('click', function() {
            const preferences = {
                essential: true, // Siempre activas
                functional: document.getElementById('functional-cookies-toggle')?.checked || false,
                analytics: document.getElementById('analytics-cookies-toggle')?.checked || false,
                marketing: document.getElementById('marketing-cookies-toggle')?.checked || false
            };
            
            saveCookiePreferences(preferences);
        });
    }
});