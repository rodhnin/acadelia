// immediate-theme.js
// Este script debe cargarse ANTES que cualquier CSS para evitar el flash
(function() {
  'use strict';
  
  /**
   * Aplicar tema inmediatamente sin esperar verificación de cookies
   * Esto previene el flash de tema blanco
   */
  
  let savedTheme = 'light'; // Tema predeterminado
  
  try {
    // Sin verificar consentimiento para evitar delay
    const themeFromStorage = localStorage.getItem('theme');
    
    if (themeFromStorage && (themeFromStorage === 'light' || themeFromStorage === 'dark')) {
      savedTheme = themeFromStorage;
      console.log(`Tema cargado inmediatamente: ${savedTheme}`);
    } else {
      console.log('No hay tema guardado, usando predeterminado: light');
    }
  } catch (e) {
    // Si localStorage no está disponible, usar tema predeterminado
    console.log('localStorage no disponible, usando tema predeterminado: light');
  }
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Si el body ya existe, aplicar también
  if (document.body) {
    document.body.setAttribute('data-theme', savedTheme);
  } else {
    // Si body no existe aún, aplicar cuando se cree
    document.addEventListener('DOMContentLoaded', function() {
      document.body.setAttribute('data-theme', savedTheme);
    });
  }
  
  if (savedTheme === 'dark') {
    if (document.body) {
      document.body.classList.add('dark-theme');
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.body.classList.add('dark-theme');
      });
    }
  }
  
  window._immediateThemeApplied = savedTheme;
  
  console.log(`🎨 Tema aplicado inmediatamente: ${savedTheme}`);
})();