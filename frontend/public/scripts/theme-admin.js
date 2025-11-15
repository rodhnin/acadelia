  // Prevenir flash de cualquier contenido y mostrar pantalla de carga inmediatamente
  (function() {
    function shouldUseDarkMode() {
      try {
        if (window.cookieHelpers) {
          const savedTheme = window.cookieHelpers.getStorageWithConsent('financeDashboard_darkMode', 'functional', null);
          if (savedTheme !== null) {
            return savedTheme === 'true';
          }
        } else {
          const savedTheme = localStorage.getItem('financeDashboard_darkMode');
          if (savedTheme !== null) {
            return savedTheme === 'true';
          }
        }
      } catch (e) {
        // Ignorar errores
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    const darkModeEnabled = shouldUseDarkMode();
    
    if (darkModeEnabled) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // IMPORTANTE: Ocultar todo el contenido principal excepto la pantalla de carga
    const style = document.createElement('style');
    style.textContent = `
      /* Ocultar todo el contenido principal durante la carga */
      .dashboard-container {
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Mostrar la pantalla de carga inmediatamente */
      .loading-container {
        visibility: visible !important;
        opacity: 1 !important;
        display: flex !important;
      }
      
      /* Estilos para tema */
      html.dark-mode {
        background-color: #212529;
        color: #e9ecef;
      }
      
      html {
        background-color: #f0efe7;
        color: #333333;
      }
    `;
    document.head.appendChild(style);
    
    window._loadingStyles = style;
    
    // Cuando el DOM esté listo, aplicar al body
    document.addEventListener('DOMContentLoaded', function() {
      if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.body.setAttribute('data-theme', 'light');
      }
    });
  })();