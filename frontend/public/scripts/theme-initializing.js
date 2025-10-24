// Aplicar clase de inicialización inmediatamente
document.documentElement.classList.add('theme-initializing');

// Precargar tema desde localStorage y manejar específicamente el header
(function() {
  // Verificar explícitamente el consentimiento para cookies funcionales
  let savedTheme = 'light'; // Tema predeterminado si no hay consentimiento
  
  try {
    const cookiePreferences = localStorage.getItem('cookiePreferences');
    if (cookiePreferences) {
      const preferences = JSON.parse(cookiePreferences);
      // Solo obtener el tema guardado si hay consentimiento para cookies funcionales
      if (preferences && preferences.functional === true && localStorage.getItem('theme')) {
        savedTheme = localStorage.getItem('theme');
        console.log('Tema cargado de localStorage con consentimiento:', savedTheme);
      } else {
        console.log('No hay consentimiento para cookies funcionales, usando tema predeterminado');
      }
    }
  } catch (error) {
    console.error('Error al verificar consentimiento de cookies:', error);
  }
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Crear estilo en línea específicamente para el header
  const headerStyle = document.createElement('style');
  headerStyle.id = 'header-theme-preload';
  
  // Definir estilos específicos según el tema
  if (savedTheme === 'dark') {
    headerStyle.textContent = `
      /* Estilos inmediatos para el header en modo oscuro */
      .main-header {
        background-color: #1a1a1a !important;
        color: #e1e1e1 !important;
        transition: none !important;
      }
      .header-title, .header-subtitle {
        color: #e1e1e1 !important;
        transition: none !important;
      }
      .theme-toggle i, .action-button i, .new-chat-container i {
        color: #cccccc !important;
        transition: none !important;
      }
    `;
  } else {
    headerStyle.textContent = `
      /* Estilos inmediatos para el header en modo claro */
      .main-header {
        background-color: #f0efe7 !important;
        color: #333333 !important;
        transition: none !important;
      }
      .header-title, .header-subtitle {
        color: #333333 !important;
        transition: none !important;
      }
    `;
  }
  
  // Agregar el estilo inmediatamente para que se aplique antes de cualquier renderizado
  document.head.appendChild(headerStyle);
  
  // Hacer visible después de un tiempo mínimo para garantizar que los estilos se hayan aplicado
  window.addEventListener('DOMContentLoaded', () => {
    // Mantener el estilo del header por un poco más de tiempo que el resto de la página
    setTimeout(() => {
      document.documentElement.classList.remove('theme-initializing');
      
      // Remover los estilos forzados del header después de completar la transición
      setTimeout(() => {
        const headerPreload = document.getElementById('header-theme-preload');
        if (headerPreload) {
          headerPreload.remove();
        }
      }, 200); // Dar un poco más de tiempo para que las transiciones CSS tomen efecto
    }, 50);
  });
})();