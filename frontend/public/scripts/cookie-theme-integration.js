// frontend/public/scripts/cookie-theme-integration.js
document.addEventListener('DOMContentLoaded', function() {
    // Función para aplicar tema a banner de cookies
    const applyCookieTheme = () => {
      const isDarkTheme = document.body.classList.contains('dark-theme') || 
                         document.documentElement.getAttribute('data-theme') === 'dark';
      
      const cookieBanner = document.getElementById('cookie-consent-banner');
      if (cookieBanner) {
        if (isDarkTheme) {
          cookieBanner.classList.add('dark-theme');
        } else {
          cookieBanner.classList.remove('dark-theme');
        }
      }
    };
    
    // Aplicar tema inicial
    applyCookieTheme();
    
    // Observar cambios en el tema
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          (mutation.attributeName === 'class' && mutation.target === document.body) ||
          (mutation.attributeName === 'data-theme' && mutation.target === document.documentElement)
        ) {
          applyCookieTheme();
        }
      });
    });
    
    // Comenzar observación
    observer.observe(document.body, { attributes: true });
    observer.observe(document.documentElement, { attributes: true });
  });