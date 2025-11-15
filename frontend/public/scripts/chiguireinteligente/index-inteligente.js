/**
 * Punto de entrada para el Panel de Administración Financiera
 * Carga todos los módulos necesarios e inicializa la aplicación
 */

document.addEventListener('DOMContentLoaded', () => {
  import('./app-inteligente.js')
    .then(module => {
      module.default.init();
    })
    .catch(error => {
      console.error('Error al cargar módulos:', error);
      hideLoadingScreen();
      alert('Error al cargar la aplicación. Por favor, recarga la página.');
    });

  // NUEVO: Añadir evento directo para el botón de tema
  setTimeout(() => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function(e) {
        console.log('Direct theme toggle click from index.js');
        // Si la aplicación no ha terminado de cargarse, esto servirá como respaldo
        if (window.financeAdmin && window.financeAdmin.eventBus) {
          window.financeAdmin.eventBus.emit('themeToggleClicked', {});
        }
      });
    }
  }, 1000); // Esperar para asegurarse de que todo está cargado
});

/**
 * Oculta la pantalla de carga con una animación suave
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.remove();
    }, 500); // coincide con la duración de la transición CSS
  }
}

// Exponer funciones clave globalmente para uso en otros módulos
window.financeAdmin = {
  hideLoadingScreen
};

// NUEVO: Añadir función global para cambiar el tema
window.financeAdmin.toggleTheme = function() {
  const themeManager = window.financeAdmin.themeManager;
  if (themeManager) {
    return themeManager.toggleTheme();
  } else {
    console.warn('ThemeManager no disponible para toggle global');
    return false;
  }
};