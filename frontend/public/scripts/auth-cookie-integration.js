/**
 * auth-cookie-integration.js
 * Script para integrar el sistema de autenticación con el sistema de consentimiento de cookies
 * Este script debe cargarse después de que se haya inicializado el sistema de autenticación y el sistema de cookies
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya está inicializado
    if (window.authCookieIntegrationInitialized) {
      return;
    }
    
    // Marcar como inicializado para evitar múltiples inicializaciones
    window.authCookieIntegrationInitialized = true;
    
    // Función para obtener el ID de usuario actual del sistema de autenticación
    async function getCurrentUserId() {
      try {
        // Intentar usar csrfUtils si está disponible
        const fetcher = window.csrfUtils?.fetch || window.fetch;
        
        // Verificar estado de autenticación
        const response = await fetcher('/api/usuarios/auth-status', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Error verificando estado de autenticación');
        }
        
        const result = await response.json();
        
        if (result.authenticated) {
          // Si está autenticado, publicar este userId en una variable global para que otros scripts puedan verificarlo
          window.currentUserId = result.user?.id_user || null;
          return result.user?.id_user || null;
        }
        
        // Si no está autenticado, limpiar la variable global
        window.currentUserId = null;
        return null;
      } catch (error) {
        console.error('Error obteniendo ID de usuario:', error);
        return null;
      }
    }
    
    // Observador para cuando el usuario inicia sesión o cierra sesión
    function setupAuthObserver() {
      // Verificar si ya existe un userId en el sistema
      let currentStoredUserId = null;
      
      try {
        const cookieMetadata = localStorage.getItem('cookieConsentMetadata');
        if (cookieMetadata) {
          const metadata = JSON.parse(cookieMetadata);
          currentStoredUserId = metadata.userId;
        }
      } catch (e) {
        console.error('Error leyendo metadata de cookies:', e);
      }
      
      // Función para verificar cambios de autenticación
      async function checkAuthStatus() {
        const userId = await getCurrentUserId();
        
        if (userId !== window.currentUserId) {
          console.log(`Cambio de usuario detectado: ${window.currentUserId || 'anónimo'} -> ${userId || 'anónimo'}`);
          
          // Notificar cambio de usuario al sistema de cookies
          if (window.cookieHelpers && typeof window.cookieHelpers.notifyUserChange === 'function') {
            window.cookieHelpers.notifyUserChange(userId);
          }
          
          // Actualizar la variable global
          window.currentUserId = userId;
        }
      }
      
      // Verificar estado inicial
      checkAuthStatus();
      
      // Observar cambios en URL para detectar login/logout
      let lastUrl = window.location.href;
      
      // Observador de cambios en la URL
      setInterval(() => {
        if (lastUrl !== window.location.href) {
          lastUrl = window.location.href;
          
          // Si la URL cambia, verificar estado de autenticación
          // Esto es útil para SPA o navegación que no recarga completamente la página
          setTimeout(checkAuthStatus, 500);
        }
      }, 1000);
      
      // Observar login/logout tradicional
      // Buscar botones de login y logout para agregar listeners
      const loginForm = document.querySelector('form[action*="login"]');
      const logoutBtn = document.querySelector('a[href*="logout"], button[id*="logout"]');
      
      if (loginForm) {
        loginForm.addEventListener('submit', () => {
          // Verificar después de un tiempo prudencial para permitir que se complete el login
          setTimeout(checkAuthStatus, 2000);
        });
      }
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          // Verificar después de un tiempo prudencial para permitir que se complete el logout
          setTimeout(checkAuthStatus, 2000);
        });
      }
      
      // Agregar listener para eventos AJAX de autenticación (si el sistema los emite)
      document.addEventListener('userAuthenticated', () => {
        setTimeout(checkAuthStatus, 500);
      });
      
      document.addEventListener('userLogout', () => {
        setTimeout(checkAuthStatus, 500);
      });
    }
    
    // Iniciar observación de estado de autenticación
    setupAuthObserver();
    
    console.log('Integración autenticación-cookies inicializada');
  });