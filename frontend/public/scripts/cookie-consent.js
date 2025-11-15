document.addEventListener('DOMContentLoaded', () => {
  if (!window.cookieConsentInitialized) {
    window.cookieConsentInitialized = true;
    initCookieConsent();
  }
});

let isSavingConsent = false;
let lastSaveTime = 0;
let currentUserId = null;
let userChanged = false;

let isAcceptingAllCookies = false;
let isSavingCookiePreferences = false;

async function initCookieConsent() {
  // No mostrar banner en la página de política de cookies
  if (window.location.pathname === '/cookie_privacy') {
    return;
  }
  
  const consent = await checkConsentStatus();
  
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
    applyConsentPreferences(consent.preferences);
    
    if (consent.pais || (consent.geoData && consent.geoData.country)) {
      console.log(`Consentimiento existente desde: ${consent.pais || consent.geoData.country}`);
    }
  }
  
  window.acceptAllCookies = function() {
    // Prevenir múltiples ejecuciones
    if (isAcceptingAllCookies) {
      return;
    }
    
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
  
  setupConsentEventListeners();
  
  document.addEventListener('userLoggedIn', handleUserStateChange);
  document.addEventListener('userLoggedOut', handleUserStateChange);
}

async function handleUserStateChange(event) {
  setTimeout(async () => {
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
      
      if (consentStatus.shouldShowBanner) {
        console.log('Mostrando banner debido a cambio de usuario');
        showConsentBanner();
      } else {
        console.log('Usuario cambió pero ya tiene consentimiento');
        applyConsentPreferences(consentStatus.preferences);
      }
    }
  }, 500);
}

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

function getCookieValue(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

const disableAcceptAllButton = () => {
    const acceptButton = document.getElementById('accept-all-cookies');
    
    if (acceptButton) {
        isAcceptingAllCookies = true;
        acceptButton.disabled = true;
        acceptButton.style.opacity = '0.7';
        acceptButton.style.cursor = 'not-allowed';
        
        const originalText = acceptButton.textContent;
        acceptButton.setAttribute('data-original-text', originalText);
        acceptButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Procesando...';
    }
};

const enableAcceptAllButton = () => {
    const acceptButton = document.getElementById('accept-all-cookies');
    
    if (acceptButton) {
        isAcceptingAllCookies = false;
        acceptButton.disabled = false;
        acceptButton.style.opacity = '1';
        acceptButton.style.cursor = 'pointer';
        
        const originalText = acceptButton.getAttribute('data-original-text') || 'Aceptar todas';
        acceptButton.textContent = originalText;
    }
};

const disableSavePreferencesButton = () => {
    const saveButton = document.getElementById('save-cookie-preferences');
    
    if (saveButton) {
        isSavingCookiePreferences = true;
        saveButton.disabled = true;
        saveButton.style.opacity = '0.7';
        saveButton.style.cursor = 'not-allowed';
        
        const originalText = saveButton.textContent;
        saveButton.setAttribute('data-original-text', originalText);
        saveButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';
    }
};

const enableSavePreferencesButton = () => {
    const saveButton = document.getElementById('save-cookie-preferences');
    
    if (saveButton) {
        isSavingCookiePreferences = false;
        saveButton.disabled = false;
        saveButton.style.opacity = '1';
        saveButton.style.cursor = 'pointer';
        
        const originalText = saveButton.getAttribute('data-original-text') || 'Guardar preferencias';
        saveButton.textContent = originalText;
    }
};

async function checkConsentStatus() {
  try {
    const fetcher = window.csrfUtils?.fetch || window.fetch;
    
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

function showConsentBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    try {
      const preferences = JSON.parse(localStorage.getItem('cookiePreferences')) || {};
      
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

function hideConsentBanner() {
  const banner = document.getElementById('cookie-consent-banner');
  if (banner) {
    banner.classList.remove('active');
  }
}

async function saveConsent(preferences) {
  // Evitar múltiples solicitudes simultáneas o muy cercanas
  const now = Date.now();
  if (isSavingConsent || (now - lastSaveTime < 2000)) {
    console.log('Solicitud duplicada o demasiado frecuente, ignorando...');
    return null;
  }
  
  try {
    isSavingConsent = true;
    lastSaveTime = now;
    
    const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
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
    
    userChanged = false;
    
    applyConsentPreferences(preferences);
    
    hideConsentBanner();
    
    if (result.pais || result.ubicacion) {
      console.log(`Consentimiento registrado desde: ${result.pais || 'País desconocido'}`);
      if (result.ubicacion) {
        console.log(`Ubicación: ${result.ubicacion}`);
      }
    }
    
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
    setTimeout(() => {
      isSavingConsent = false;
    }, 300);
  }
}

function applyConsentPreferences(preferences) {
  localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
  
  if (preferences.functional) {
    enableFunctionalCookies();
  } else {
    disableFunctionalCookies();
  }
  
  if (preferences.analytics) {
    enableAnalyticsCookies();
  } else {
    disableAnalyticsCookies();
  }
  
  if (preferences.marketing) {
    enableMarketingCookies();
  } else {
    disableMarketingCookies();
  }
}

function enableFunctionalCookies() {
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
    
    const themeTogglers = document.querySelectorAll('.theme-toggle');
    themeTogglers.forEach(toggler => {
      toggler.addEventListener('click', function() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        localStorage.setItem('theme', newTheme);
        
        document.documentElement.setAttribute('data-theme', newTheme);
        if (newTheme === 'dark') {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      });
    });
  };
  
  enableThemeStorage();
}

function disableFunctionalCookies() {
  document.cookie = "functional_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  
  localStorage.removeItem('theme');
}

function enableAnalyticsCookies() {
  document.cookie = "analytics_enabled=true; path=/; max-age=31536000; SameSite=Lax";
  
  if (typeof ga === 'function') {
    ga('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
}

function disableAnalyticsCookies() {
  document.cookie = "analytics_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  
  if (typeof ga === 'function') {
    ga('consent', 'update', {
      'analytics_storage': 'denied'
    });
  }
}

function enableMarketingCookies() {
  document.cookie = "marketing_enabled=true; path=/; max-age=31536000; SameSite=Lax";
}

function disableMarketingCookies() {
  document.cookie = "marketing_enabled=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

function setupConsentEventListeners() {
  const acceptAllBtn = document.getElementById('accept-all-cookies');
  if (acceptAllBtn && !acceptAllBtn._hasClickListener) {
    acceptAllBtn._hasClickListener = true;
    acceptAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.acceptAllCookies();
    });
  }
  
  const rejectAllBtn = document.getElementById('reject-all-cookies');
  if (rejectAllBtn && !rejectAllBtn._hasClickListener) {
    rejectAllBtn._hasClickListener = true;
    rejectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.rejectOptionalCookies();
    });
  }
  
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

window.isCookieCategoryEnabled = function(category) {
  try {
    const preferences = JSON.parse(localStorage.getItem('cookiePreferences'));
    return preferences && preferences[category] === true;
  } catch (error) {
    return false;
  }
};

window.getCookieConsentCountry = function() {
  try {
    const metadata = JSON.parse(localStorage.getItem('cookieConsentMetadata'));
    return metadata && metadata.pais ? metadata.pais : 'Desconocido';
  } catch (error) {
    return 'Desconocido';
  }
};

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
    
    applyConsentPreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    });
    
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
    
    showConsentBanner();
    
    return true;
  } catch (error) {
    console.error('Error revocando consentimiento:', error);
    return false;
  } finally {
    isSavingConsent = false;
  }
};