/**
 * cookie-helpers.js
 * Funciones auxiliares para verificar consentimiento de cookies
 * y acceder a localStorage de manera segura.
 */

(function() {
  /**
   * Verifica si existe consentimiento para una categoría específica de cookies
   * @param {string} category - Categoría de cookie (functional, analytics, marketing)
   * @returns {boolean} - true si hay consentimiento, false en caso contrario
   */
  function hasCookieConsent(category) {
    try {
      const cookieMetadata = localStorage.getItem('cookieConsentMetadata');
      const cookiePreferences = localStorage.getItem('cookiePreferences');
      
      if (!cookiePreferences) {
        console.log('No hay preferencias de cookies almacenadas');
        return false;
      }
      
      const preferences = JSON.parse(cookiePreferences);
      
      // Si hay metadata, verificar que pertenece al usuario actual
      if (cookieMetadata) {
        try {
          const metadata = JSON.parse(cookieMetadata);
          const userId = metadata.userId;
          
          // Si hay un userId en la metadata, verificar que coincida con el usuario actual
          // (esto requeriría que la aplicación establezca window.currentUserId)
          if (userId && window.currentUserId && userId !== window.currentUserId) {
            console.log(`Advertencia: Metadata de cookies pertenece a otro usuario (${userId} vs ${window.currentUserId})`);
            // En este caso, aún usamos las preferencias pero advertimos
          }
        } catch (metadataError) {
          console.error('Error analizando metadata de cookies:', metadataError);
        }
      }
      
      return preferences && preferences[category] === true;
    } catch (error) {
      console.error(`Error verificando consentimiento para cookies ${category}:`, error);
      return false;
    }
  }

  /**
   * Accede de manera segura a un valor en localStorage, verificando primero el consentimiento
   * @param {string} key - Clave a buscar en localStorage
   * @param {string} cookieCategory - Categoría de cookie requerida (functional, analytics, marketing)
   * @param {*} defaultValue - Valor predeterminado si no hay consentimiento o la clave no existe
   * @returns {*} - Valor almacenado o valor predeterminado
   */
  function getStorageWithConsent(key, cookieCategory, defaultValue) {
    if (hasCookieConsent(cookieCategory) && localStorage.getItem(key) !== null) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`Error accediendo a ${key} en localStorage:`, error);
      }
    }
    return defaultValue;
  }

  /**
   * Guarda un valor en localStorage, verificando primero el consentimiento
   * @param {string} key - Clave para almacenar en localStorage
   * @param {*} value - Valor a almacenar
   * @param {string} cookieCategory - Categoría de cookie requerida (functional, analytics, marketing)
   * @returns {boolean} - true si se guardó correctamente, false en caso contrario
   */
  function setStorageWithConsent(key, value, cookieCategory) {
    if (!hasCookieConsent(cookieCategory)) {
      console.log(`No hay consentimiento para cookies ${cookieCategory}, no se guardará ${key}`);
      return false;
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error guardando ${key} en localStorage:`, error);
      return false;
    }
  }
  
  /**
   * Emite un evento de cambio de usuario para que el sistema de cookies pueda actualizar
   * @param {string|number} userId - ID del usuario (null para usuario no autenticado)
   */
  function notifyUserChange(userId) {
    try {
      window.currentUserId = userId;
      
      if (userId) {
        const loginEvent = new CustomEvent('userLoggedIn', { detail: { userId } });
        document.dispatchEvent(loginEvent);
        console.log(`Notificación de inicio de sesión emitida para usuario: ${userId}`);
      } else {
        const logoutEvent = new CustomEvent('userLoggedOut');
        document.dispatchEvent(logoutEvent);
        console.log('Notificación de cierre de sesión emitida');
      }
      
      try {
        const cookieMetadata = localStorage.getItem('cookieConsentMetadata');
        if (cookieMetadata) {
          const metadata = JSON.parse(cookieMetadata);
          metadata.userId = userId;
          localStorage.setItem('cookieConsentMetadata', JSON.stringify(metadata));
        }
      } catch (metadataError) {
        console.error('Error actualizando metadata de cookies:', metadataError);
      }
    } catch (error) {
      console.error('Error notificando cambio de usuario:', error);
    }
  }

  // Exponer las funciones globalmente a través del objeto window.cookieHelpers
  window.cookieHelpers = {
    hasCookieConsent,
    getStorageWithConsent,
    setStorageWithConsent,
    notifyUserChange
  };
})();