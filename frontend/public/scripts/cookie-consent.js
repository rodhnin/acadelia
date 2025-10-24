// frontend/public/scripts/cookie-consent.js
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar sistema de consentimiento de cookies (solo una vez)
  if (!window.cookieConsentInitialized) {
    window.cookieConsentInitialized = true;
    initCookieConsent();
  }
});

// Variables para evitar solicitudes múltiples
let isSavingConsent = false;
let lastSaveTime = 0;
let currentUserId = null;
let userChanged = false;

// Variables para controlar botones de cookies
let isAcceptingAllCookies = false;
let isSavingCookiePreferences = false;

// Función principal de inicialización
async function initCookieConsent() {
  // No mostrar banner en la página de política de cookies
  if (window.location.pathname === '/cookie_privacy') {
    return;
  }
  
  // Verificar si ya existe consentimiento
  const consent = await checkConsentStatus();
  
  // Guardar el userId actual para comparar si cambia después
  currentUserId = consent.currentUserId || null;
  
  // Si no existe consentimiento, el API indica que debemos mostrar el banner, 
  // o ha cambiado el usuario, mostrarlo
  if (!consent.exists || consent.shouldShowBanner || userChanged) {
    console.log('Mostrando banner de cookies:', {
      exists: consent.exists,
      shouldShowBanner: consent.shouldShowBanner, 
      userChanged: userChanged
    });
    showConsentBanner();
  } else {
    // Aplicar preferencias de consentimiento existentes
    applyConsentPreferences(consent.preferences);
    
    // Registrar para fines de debugging el país donde se estableció el consentimiento
    if (consent.pais || (consent.geoData && consent.geoData.country)) {
      console.log(`Consentimiento existente desde: ${consent.pais || consent.geoData.country}`);
    }
  }
  
// Exportar funciones al objeto window para que initializer.js pueda usarlas
  window.acceptAllCookies = function() {
    // Prevenir múltiples ejecuciones
    if (isAcceptingAllCookies) {
      return;
    }
    
    // Deshabilitar botón inmediatamente
    disableAcceptAllButton();
    
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    }).finally(() => {
      // Rehabilitar botón siempre
      enableAcceptAllButton();
    });
  };
  
  window.rejectOptionalCookies = function() {
    saveConsent({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    });
  };
  
  window.saveCustomCookiePreferences = function() {
    // Prevenir múltiples ejecuciones
    if (isSavingCookiePreferences) {
      return;
    }
    
    // Deshabilitar botón inmediatamente
    disableSavePreferencesButton();
    
    const preferences = {
      essential: true, // Siempre activas
      functional: document.getElementById('functional-cookies-toggle')?.checked || false,
      analytics: document.getElementById('analytics-cookies-toggle')?.checked || false,
      marketing: document.getElementById('marketing-cookies-toggle')?.checked || false
    };
    
    saveConsent(preferences).finally(() => {
      // Rehabilitar botón siempre
      enableSavePreferencesButton();
    });
  };
  
  // Añadir event listeners a los botones del banner (como respaldo)
  setupConsentEventListeners();
  
  // Añadir listener para detectar cambios de autenticación
  document.addEventListener('userLoggedIn', handleUserStateChange);
  document.addEventListener('userLoggedOut', handleUserStateChange);
}

// Manejar cambios en el estado de autenticación del usuario
async function handleUserStateChange(event) {
  // Esperar un poco para que el sistema de autenticación se actualice completamente
  setTimeout(async () => {
    // Verificar si ha cambiado el usuario
    const consentStatus = await checkConsentStatus();
    const newUserId = consentStatus?.currentUserId || null;
    
    // Si el ID de usuario ha cambiado, verificar si debemos vincular el consentimiento
    if (newUserId !== currentUserId) {
      console.log(`Usuario cambiado: ${currentUserId || 'anónimo'} -> ${newUserId || 'anónimo'}`);
      
      // Si hay un nuevo usuario y un token de consentimiento, intentar vincular
      if (newUserId && document.cookie.includes('consent_token')) {
        await tryLinkConsent(newUserId);
      }
      
      currentUserId = newUserId;
      userChanged = true;
      
      // Verificar si necesitamos mostrar el banner para este usuario
      if (consentStatus.shouldShowBanner) {
        console.log('Mostrando banner debido a cambio de usuario');
        showConsentBanner();
      } else {
        console.log('Usuario cambió pero ya tiene consentimiento');
        // Aplicar preferencias del nuevo usuario
        applyConsentPreferences(consentStatus.preferences);
      }
    }
  }, 500);
}

// Intentar vincular el consentimiento actual al usuario recién autenticado
async function tryLinkConsent(userId) {
  try {
    if (!userId) return;
    
    const consentToken = getCookieValue('consent_token');
    if (!consentToken) return;
    
    console.log(`Intentando vincular token de consentimiento al usuario ${userId}`);
    
    const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const fetcher = window.csrfUtils?.fetch || window.fetch;
    
    const response = await fetcher('/api/cookie-consent/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ consentToken }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Error al vincular consentimiento');
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Consentimiento vinculado exitosamente al usuario');
      
      // Actualizar metadata en localStorage
      try {
        const cookieMetadata = localStorage.getItem('cookieConsentMetadata');
        if (cookieMetadata) {
          const metadata = JSON.parse(cookieMetadata);
          metadata.userId = userId;
          localStorage.setItem('cookieConsentMetadata', JSON.stringify(metadata));
        }
      } catch (e) {
        console.error('Error actualizando metadata:', e);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error vinculando consentimiento:', error);
    return false;
  }
}

// Obtener valor de una cookie por su nombre
function getCookieValue(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Función para deshabilitar botón de aceptar todas las cookies
const disableAcceptAllButton = () => {
    const acceptButton = document.getElementById('accept-all-cookies');
    
    if (acceptButton) {
        isAcceptingAllCookies = true;
        acceptButton.disabled = true;
        acceptButton.style.opacity = '0.7';
        acceptButton.style.cursor = 'not-allowed';
        
        // Cambiar el texto y agregar spinner
        const originalText = acceptButton.textContent;
        acceptButton.setAttribute('data-original-text', originalText);
        acceptButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Procesando...';
    }
};

// Función para rehabilitar botón de aceptar todas las cookies
const enableAcceptAllButton = () => {
    const acceptButton = document.getElementById('accept-all-cookies');
    
    if (acceptButton) {
        isAcceptingAllCookies = false;
        acceptButton.disabled = false;
        acceptButton.style.opacity = '1';
        acceptButton.style.cursor = 'pointer';
        
        // Restaurar el texto original
        const originalText = acceptButton.getAttribute('data-original-text') || 'Aceptar todas';
        acceptButton.textContent = originalText;
    }
};

// Función para deshabilitar botón de guardar preferencias
const disableSavePreferencesButton = () => {
    const saveButton = document.getElementById('save-cookie-preferences');
    
    if (saveButton) {
        isSavingCookiePreferences = true;
        saveButton.disabled = true;
        saveButton.style.opacity = '0.7';
        saveButton.style.cursor = 'not-allowed';
        
        // Cambiar el texto y agregar spinner
        const originalText = saveButton.textContent;
        saveButton.setAttribute('data-original-text', originalText);
        saveButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';
    }
};

// Función para rehabilitar botón de guardar preferencias
const enableSavePreferencesButton = () => {
    const saveButton = document.getElementById('save-cookie-preferences');
    
    if (saveButton) {
        isSavingCookiePreferences = false;
        saveButton.disabled = false;
        saveButton.style.opacity = '1';
        saveButton.style.cursor = 'pointer';
        
        // Restaurar el texto original
        const originalText = saveButton.getAttribute('data-original-text') || 'Guardar preferencias';
        saveButton.textContent = originalText;
    }
};

// Verificar si el usuario ya ha dado consentimiento
async function checkConsentStatus() {
  try {
    const fetcher = window.csrfUtils?.fetch || window.fetch;
    
    // Usar la ruta que siempre devuelve 200
    const response = await fetcher('/api/cookie-consent/status', {
      method: 'GET',
      credentials: 'include'
    });
    
    // Ahora response.ok siempre será true porque la API siempre devuelve 200
    const result = await response.json();
    
    // Si el consentimiento existe pero es de otro usuario, mostrar el banner
    if (result.exists && result.userId && result.currentUserId && 
        result.userId !== result.currentUserId) {
      console.log('Consentimiento encontrado pero pertenece a otro usuario');
      console.log(`Usuario actual: ${result.currentUserId}, Usuario del consentimiento: ${result.userId}`);
      result.shouldShowBanner = true;
      result.exists = false; // Ignorar preferencias de otro usuario
      userChanged = true;
    }
    
    return result;
  } catch (error) {
    console.error('Error verificando estado de consentimiento:', error);
    return {
      exists: false,
      shouldShowBanner: true,
      preferences: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false
      }
    };
  }
}

// Mostrar el banner de consentimiento de cookies
function showConsentBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    // Cargar las preferencias actuales en los toggles si existen
    try {
      const preferences = JSON.parse(localStorage.getItem('cookiePreferences')) || {};
      
      // Actualizar toggles
      if (document.getElementById('functional-cookies-toggle')) {
        document.getElementById('functional-cookies-toggle').checked = !!preferences.functional;
      }
      
      if (document.getElementById('analytics-cookies-toggle')) {
        document.getElementById('analytics-cookies-toggle').checked = !!preferences.analytics;
      }
      
      if (document.getElementById('marketing-cookies-toggle')) {
        document.getElementById('marketing-cookies-toggle').checked = !!preferences.marketing;
      }
    } catch (error) {
      console.error('Error cargando preferencias en banner:', error);
    }
    
    banner.classList.add('active');
  }
}

// Ocultar el banner de consentimiento de cookies
function hideConsentBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    banner.classList.remove('active');
  }
}

// Guardar preferencias de consentimiento con control de duplicados
async function saveConsent(preferences) {
  // Evitar múltiples solicitudes simultáneas o muy cercanas
  const now = Date.now();
  if (isSavingConsent || (now - lastSaveTime < 2000)) {
    console.log('Solicitud duplicada o demasiado frecuente, ignorando...');
    return null;
  }
  
  try {
    // Marcar como en proceso
    isSavingConsent = true;
    lastSaveTime = now;
    
    const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    // Intentar usar csrfUtils si está disponible
    const fetcher = window.csrfUtils?.fetch || window.fetch;
    
    console.log('Enviando solicitud de consentimiento:', preferences);
    
    const response = await fetcher('/api/cookie-consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(preferences),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar consentimiento');
    }
    
    const result = await response.json();
    
    // Resetear el flag de cambio de usuario después de guardar
    userChanged = false;
    
    // Aplicar las preferencias a la sesión actual
    applyConsentPreferences(preferences);
    
    // Ocultar el banner INMEDIATAMENTE después de aplicar preferencias
    hideConsentBanner();
    
    // Registrar información de país/ubicación
    if (result.pais || result.ubicacion) {
      console.log(`Consentimiento registrado desde: ${result.pais || 'País desconocido'}`);
      if (result.ubicacion) {
        console.log(`Ubicación: ${result.ubicacion}`);
      }
    }
    
    // Guardar información de país y ubicación en localStorage
    try {
      const cookieMetadata = {
        pais: result.pais || (result.geoData ? result.geoData.country : 'Desconocido'),
        ubicacion: result.ubicacion || (result.geoData ? result.geoData.formattedLocation : 'Ubicación desconocida'),
        timestamp: new Date().toISOString(),
        userId: result.userId || currentUserId || null,
        deviceToken: result.consentToken || null
      };
      localStorage.setItem('cookieConsentMetadata', JSON.stringify(cookieMetadata));
    } catch (e) {
      console.error('Error guardando metadata de consentimiento:', e);
    }
    
    return result;
  } catch (error) {
    console.error('Error guardando consentimiento:', error);
    // También ocultar el banner en caso de error para no dejar al usuario colgado
    hideConsentBanner();
    return null;
  } finally {
    // Marcar como finalizado después de un breve delay para evitar rebotes
    setTimeout(() => {
      isSavingConsent = false;
    }, 300);
  }
}

// Aplicar preferencias de consentimiento a la sesión actual
function applyConsentPreferences(preferences) {
  // Guardar preferencias en localStorage para fácil acceso
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
  
  // Para cookies funcionales:
  if (preferences.functional) {
    enableFunctionalCookies();
  } else {
    disableFunctionalCookies();
  }
  
  // Para cookies analíticas:
  if (preferences.analytics) {
    enableAnalyticsCookies();
  } else {
    disableAnalyticsCookies();
  }
  
  // Para cookies de marketing:
  if (preferences.marketing) {
    enableMarketingCookies();
  } else {
    disableMarketingCookies();
  }
}

// Habilitar cookies funcionales
function enableFunctionalCookies() {
  // Implementación para habilitar cookies funcionales
  document.cookie = "functional_enabled=true; path=/; max-age=31536000; SameSite=Lax";
  
  // Guardado de tema oscuro/claro (ejemplo)
  const enableThemeStorage = function() {
    // Si hay tema en localStorage, aplicarlo
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
    
    // Permitir cambios de tema
    const themeTogglers = document.querySelectorAll('.theme-toggle');
    themeTogglers.forEach(toggler => {
      toggler.addEventListener('click', function() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Guardar tema en localStorage
        localStorage.setItem('theme', newTheme);
        
        // Aplicar el tema
        document.documentElement.setAttribute('data-theme', newTheme);
        if (newTheme === 'dark') {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      });
    });
  };
  
  // Activar almacenamiento de tema
  enableThemeStorage();
}

// Deshabilitar cookies funcionales
function disableFunctionalCookies() {
  // Eliminar cookies funcionales, excepto las esenciales
  document.cookie = "functional_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  
  // Eliminar preferencias de tema en localStorage
  localStorage.removeItem('theme');
}

// Habilitar cookies analíticas
function enableAnalyticsCookies() {
  // Implementación para habilitar servicios analíticos
  document.cookie = "analytics_enabled=true; path=/; max-age=31536000; SameSite=Lax";
  
  // Inicializar Google Analytics si está disponible
  if (typeof ga === 'function') {
    ga('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
}

// Deshabilitar cookies analíticas
function disableAnalyticsCookies() {
  // Eliminar cookies analíticas
  document.cookie = "analytics_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  
  // Desactivar Google Analytics si está disponible
  if (typeof ga === 'function') {
    ga('consent', 'update', {
      'analytics_storage': 'denied'
    });
  }
}

// Habilitar cookies de marketing
function enableMarketingCookies() {
  // Implementación para habilitar cookies de marketing
  document.cookie = "marketing_enabled=true; path=/; max-age=31536000; SameSite=Lax";
}

// Deshabilitar cookies de marketing
function disableMarketingCookies() {
  // Eliminar cookies de marketing
  document.cookie = "marketing_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

// Configurar event listeners para el banner (cada botón con control de click único)
function setupConsentEventListeners() {
  // Aceptar todas las cookies
  const acceptAllBtn = document.getElementById('accept-all-cookies');
  if (acceptAllBtn && !acceptAllBtn._hasClickListener) {
    acceptAllBtn._hasClickListener = true;
    acceptAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.acceptAllCookies();
    });
  }
  
  // Rechazar todas las cookies (excepto esenciales)
  const rejectAllBtn = document.getElementById('reject-all-cookies');
  if (rejectAllBtn && !rejectAllBtn._hasClickListener) {
    rejectAllBtn._hasClickListener = true;
    rejectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.rejectOptionalCookies();
    });
  }
  
  // Mostrar/ocultar sección de configuración
  const customizeBtn = document.getElementById('customize-cookies');
  if (customizeBtn && !customizeBtn._hasClickListener) {
    customizeBtn._hasClickListener = true;
    customizeBtn.addEventListener('click', () => {
      const settings = document.querySelector('.cookie-settings');
      if (settings) {
        settings.classList.toggle('active');
      }
    });
  }
  
  // Botón de guardar preferencias
  const savePrefsBtn = document.getElementById('save-cookie-preferences');
  if (savePrefsBtn && !savePrefsBtn._hasClickListener) {
    savePrefsBtn._hasClickListener = true;
    savePrefsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.saveCustomCookiePreferences();
    });
  }
}

// Función auxiliar para verificar si una categoría específica de cookies está habilitada
window.isCookieCategoryEnabled = function(category) {
  try {
    const preferences = JSON.parse(localStorage.getItem('cookiePreferences'));
    return preferences && preferences[category] === true;
  } catch (error) {
    return false;
  }
};

// Función para obtener la información del país desde donde se dio consentimiento
window.getCookieConsentCountry = function() {
  try {
    const metadata = JSON.parse(localStorage.getItem('cookieConsentMetadata'));
    return metadata && metadata.pais ? metadata.pais : 'Desconocido';
  } catch (error) {
    return 'Desconocido';
  }
};

// Función para obtener la ubicación completa desde donde se dio consentimiento
window.getCookieConsentLocation = function() {
  try {
    const metadata = JSON.parse(localStorage.getItem('cookieConsentMetadata'));
    return metadata && metadata.ubicacion ? metadata.ubicacion : 'Ubicación desconocida';
  } catch (error) {
    return 'Ubicación desconocida';
  }
};

// Revocar el consentimiento de cookies (solo mantener esenciales)
window.revokeCookieConsent = async function() {
  // Evitar solicitudes duplicadas
  if (isSavingConsent) {
    return false;
  }
  
  try {
    isSavingConsent = true;
    
    const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    // Intentar usar csrfUtils si está disponible
    const fetcher = window.csrfUtils?.fetch || window.fetch;
    
    const response = await fetcher('/api/cookie-consent/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Error al revocar consentimiento');
    }
    
    const result = await response.json();
    
    // Aplicar preferencias predeterminadas (solo esenciales)
    applyConsentPreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    });
    
    // Actualizar información de país en localStorage
    if (result.pais || result.ubicacion) {
      try {
        const cookieMetadata = {
          pais: result.pais || 'Desconocido',
          ubicacion: result.ubicacion || 'Ubicación desconocida',
          timestamp: new Date().toISOString(),
          userId: currentUserId || null
        };
        localStorage.setItem('cookieConsentMetadata', JSON.stringify(cookieMetadata));
      } catch (e) {
        console.error('Error actualizando metadata de consentimiento:', e);
      }
    }
    
    // Mostrar el banner nuevamente para informar al usuario
    showConsentBanner();
    
    return true;
  } catch (error) {
    console.error('Error revocando consentimiento:', error);
    return false;
  } finally {
    isSavingConsent = false;
  }
};