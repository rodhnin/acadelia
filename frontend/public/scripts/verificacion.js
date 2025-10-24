// ===== 🚀 SCRIPT DE VERIFICACIÓN ANTI-FLASHEO COMPLETO =====
// Colocar este script en el <head> de tu index.html, justo después de los meta tags

(function() {
  'use strict';
  
  console.log('🔍 [AUTH] Verificación anti-flasheo iniciada');
  
  // ===== ⚙️ CONFIGURACIÓN =====
  const CONFIG = {
    DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    CACHE_DURATION: 30000, // 30 segundos
    TIMEOUT_DURATION: 3000, // 3 segundos
    REDIRECT_URL: 'principal',
    AUTH_ENDPOINT: '/api/usuarios/auth-status'
  };
  
  // ===== 📦 CACHE SIMPLE =====
  const AuthCache = {
    get: function(key) {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },
    
    set: function(key, value, ttl = CONFIG.CACHE_DURATION) {
      try {
        const item = {
          value: value,
          expiry: Date.now() + ttl
        };
        sessionStorage.setItem(key, JSON.stringify(item));
      } catch (e) {
        if (CONFIG.DEVELOPMENT) console.warn('⚠️ [AUTH] No se pudo guardar en cache:', e);
      }
    },
    
    isValid: function(key) {
      const item = this.get(key);
      return item && Date.now() < item.expiry;
    },
    
    clear: function(key) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        if (CONFIG.DEVELOPMENT) console.warn('⚠️ [AUTH] No se pudo limpiar cache:', e);
      }
    }
  };
  
  // ===== 🎨 MANEJO DE UI =====
  const UIManager = {
    addLoadingOverlay: function() {
      const overlay = document.createElement('div');
      overlay.className = 'auth-loading-overlay';
      overlay.innerHTML = `
        <div class="auth-loading-spinner"></div>
        <div class="auth-loading-text">Verificando acceso...</div>
      `;
      document.body.appendChild(overlay);
      return overlay;
    },
    
    setBodyClass: function(className) {
      document.body.className = className;
    },
    
    showPublicPage: function() {
      console.log('✅ [AUTH] Mostrando página pública');
      
      // Remover overlay de loading si existe
      const overlay = document.querySelector('.auth-loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }
      
      // Mostrar página con animación
      this.setBodyClass('auth-verified');
      
      // Asegurar que el contenido sea visible
      setTimeout(() => {
        if (document.body.style.opacity !== '1') {
          document.body.style.opacity = '1';
          document.body.style.visibility = 'visible';
        }
      }, 100);
    },
    
    showRedirecting: function() {
      console.log('🚀 [AUTH] Preparando redirección...');
      this.setBodyClass('redirecting');
    }
  };
  
  // ===== 🔐 VALIDADOR DE JWT =====
  const JWTValidator = {
    isValidFormat: function(token) {
      return token && typeof token === 'string' && token.includes('.') && token.split('.').length === 3;
    },
    
    decodePayload: function(token) {
      try {
        const payload = token.split('.')[1];
        const decoded = atob(payload);
        return JSON.parse(decoded);
      } catch (e) {
        return null;
      }
    },
    
    isExpired: function(payload) {
      if (!payload || !payload.exp) return true;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp <= now;
    },
    
    validate: function(token) {
      if (!this.isValidFormat(token)) {
        return { valid: false, reason: 'Formato inválido' };
      }
      
      const payload = this.decodePayload(token);
      if (!payload) {
        return { valid: false, reason: 'No se pudo decodificar' };
      }
      
      if (this.isExpired(payload)) {
        return { valid: false, reason: 'Token expirado' };
      }
      
      return { valid: true, payload: payload };
    }
  };
  
  // ===== 🍪 EXTRACTOR DE COOKIES =====
  const CookieManager = {
    get: function(name) {
      try {
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find(row => row.startsWith(name + '='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
      } catch (e) {
        if (CONFIG.DEVELOPMENT) console.warn('⚠️ [AUTH] Error extrayendo cookie:', e);
        return null;
      }
    },
    
    getAuthToken: function() {
      return this.get('token');
    }
  };
  
  // ===== ⚡ VERIFICACIÓN SÚPER RÁPIDA =====
  const QuickAuth = {
    check: function() {
      // Verificar cache primero
      if (AuthCache.isValid('auth_status')) {
        const cached = AuthCache.get('auth_status');
        if (cached && cached.value === 'authenticated') {
          if (CONFIG.DEVELOPMENT) console.log('🚀 [AUTH] Cache válido - Redirección inmediata');
          this.redirect();
          return true;
        }
      }
      
      // Verificar token de cookie
      const token = CookieManager.getAuthToken();
      if (token) {
        const validation = JWTValidator.validate(token);
        if (validation.valid) {
          if (CONFIG.DEVELOPMENT) {
            console.log('🚀 [AUTH] Token válido detectado - Redirección ultra-rápida');
            console.log('Token expira en:', new Date(validation.payload.exp * 1000));
          }
          
          // Guardar en cache y redirigir
          AuthCache.set('auth_status', 'authenticated');
          this.redirect();
          return true;
        } else {
          if (CONFIG.DEVELOPMENT) console.log('⚠️ [AUTH] Token inválido:', validation.reason);
          AuthCache.clear('auth_status');
        }
      }
      
      return false;
    },
    
    redirect: function() {
      UIManager.showRedirecting();
      
      // Usar replace para mejor UX (no agrega entrada al historial)
      setTimeout(() => {
        window.location.replace(CONFIG.REDIRECT_URL);
      }, 50); // Pequeño delay para permitir que se vea la transición
    }
  };
  
  // ===== 🌐 VERIFICACIÓN COMPLETA VÍA API =====
  const FullAuth = {
    check: async function() {
      try {
        if (CONFIG.DEVELOPMENT) console.log('🔍 [AUTH] Iniciando verificación completa vía API');
        
        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_DURATION);
        
        const response = await fetch(CONFIG.AUTH_ENDPOINT, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const authData = await response.json();
        
        if (authData.authenticated) {
          if (CONFIG.DEVELOPMENT) {
            console.log('✅ [AUTH] Usuario autenticado vía API');
            if (authData.tokenRenewed) {
              console.log('🔄 [AUTH] Token renovado automáticamente');
            }
          }
          
          // Guardar en cache y redirigir
          AuthCache.set('auth_status', 'authenticated');
          QuickAuth.redirect();
          return true;
        } else {
          // No autenticado
          AuthCache.clear('auth_status');
          
          if (CONFIG.DEVELOPMENT) {
            const reason = authData.reason || 'Desconocido';
            console.warn(`⚠️ [AUTH] Usuario no autenticado: ${authData.message || reason}`);
          }
          
          UIManager.showPublicPage();
          return false;
        }
        
      } catch (error) {
        AuthCache.clear('auth_status');
        
        if (error.name === 'AbortError') {
          if (CONFIG.DEVELOPMENT) console.warn('⚠️ [AUTH] Timeout en verificación');
        } else {
          if (CONFIG.DEVELOPMENT) console.warn('⚠️ [AUTH] Error en verificación:', error.message);
        }
        
        // En caso de error, mostrar la página pública
        UIManager.showPublicPage();
        return false;
      }
    }
  };
  
  // ===== 🚀 INICIALIZACIÓN PRINCIPAL =====
  const AuthCheck = {
    init: function() {
      // Establecer estado inicial
      UIManager.setBodyClass('auth-checking');
      
      // Verificación súper rápida primero
      const quickResult = QuickAuth.check();
      
      if (!quickResult) {
        // Si no se redirigió rápidamente, hacer verificación completa
        this.performFullCheck();
      }
    },
    
    performFullCheck: function() {
      // Verificar si el DOM está listo
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.executeFullCheck();
        });
      } else {
        this.executeFullCheck();
      }
    },
    
    executeFullCheck: async function() {
      // Añadir overlay de loading si es necesario
      if (document.body && !document.querySelector('.auth-loading-overlay')) {
        UIManager.addLoadingOverlay();
      }
      
      // Ejecutar verificación completa
      await FullAuth.check();
    }
  };
  
  // ===== 🎯 EJECUTAR INMEDIATAMENTE =====
  
  // Si el DOM ya está listo, ejecutar inmediatamente
  if (document.readyState !== 'loading') {
    AuthCheck.init();
  } else {
    // Si no, ejecutar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
      AuthCheck.init();
    });
  }
  
  // También ejecutar en el próximo tick para casos extremos
  setTimeout(() => {
    if (document.body && !document.body.classList.contains('auth-verified') && !document.body.classList.contains('redirecting')) {
      if (CONFIG.DEVELOPMENT) console.log('🔄 [AUTH] Ejecutando verificación de respaldo');
      AuthCheck.init();
    }
  }, 100);
  
  // ===== 🛡️ MANEJO DE ERRORES GLOBALES =====
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('auth')) {
      if (CONFIG.DEVELOPMENT) console.error('❌ [AUTH] Error no manejado:', event.reason);
      
      // Fallback: mostrar página pública
      setTimeout(() => {
        if (!document.body.classList.contains('auth-verified') && !document.body.classList.contains('redirecting')) {
          UIManager.showPublicPage();
        }
      }, 1000);
    }
  });
  
  if (CONFIG.DEVELOPMENT) {
    console.log('✅ [AUTH] Sistema anti-flasheo inicializado correctamente');
  }
  
})();