// theme-principal.js - Versión corregida sin flash
// NO aplicar tema aquí ya que immediate-theme.js ya lo hizo

// Código que se ejecuta cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM - con comprobaciones de existencia
  const themeToggle = document.getElementById('themeToggle') || document.querySelector('[data-function="theme-toggle"]');
  const mobileThemeToggle = document.getElementById('mobileThemeToggle') || document.querySelector('[data-function="mobile-theme-toggle"]');
  const menuToggle = document.getElementById('menuToggle') || document.querySelector('[data-function="menu-toggle"]');
  const accountBtn = document.getElementById('accountBtn');
  const dropdown = document.querySelector('.dropdown');
  
  // Determinar el tipo de layout de la página
  const isHeaderLayout = document.querySelector('header .nav-buttons');
  const isSidebarLayout = document.querySelector('.sidebar');
  
  // Función auxiliar para verificar consentimiento con ambos sistemas
  function hasFunctionalConsent() {
    // Primero intentar con cookieHelpers (cookie-helpers.js)
    if (window.cookieHelpers && typeof window.cookieHelpers.hasCookieConsent === 'function') {
      return window.cookieHelpers.hasCookieConsent('functional');
    }
    
    // Fallback a cookie-consent.js
    if (window.isCookieCategoryEnabled && typeof window.isCookieCategoryEnabled === 'function') {
      return window.isCookieCategoryEnabled('functional');
    }
    
    return false;
  }
  
  // Función auxiliar para guardar tema con consentimiento
  function saveThemeWithConsent(theme) {
    // Con cookieHelpers
    if (window.cookieHelpers && typeof window.cookieHelpers.setStorageWithConsent === 'function') {
      return window.cookieHelpers.setStorageWithConsent('theme', theme, 'functional');
    }
    
    // Con cookie-consent (verificar consentimiento y guardar en localStorage)
    if (hasFunctionalConsent()) {
      try {
        localStorage.setItem('theme', theme);
        return true;
      } catch (e) {
        console.error('Error guardando tema en localStorage:', e);
        return false;
      }
    }
    
    // Si no hay consentimiento, guardar de todas formas para la sesión actual
    // (esto evita problemas de UX donde el usuario cambia tema pero no se guarda)
    try {
      localStorage.setItem('theme', theme);
      console.log('Tema guardado sin verificar consentimiento (sesión actual)');
      return true;
    } catch (e) {
      console.error('Error guardando tema:', e);
      return false;
    }
  }
  
  // Obtener tema actual (ya aplicado por immediate-theme.js)
  let currentTheme = window._immediateThemeApplied || 
                     document.documentElement.getAttribute('data-theme') || 
                     'light';
  
  console.log(`Tema actual detectado: ${currentTheme}`);
  
  // Verificar si necesitamos validar contra cookies
  const hasConsent = hasFunctionalConsent();
  if (hasConsent) {
    console.log('Consentimiento de cookies funcionales: ✅ Activo');
  } else {
    console.log('Consentimiento de cookies funcionales: ❌ No otorgado');
    console.log('💡 Hint: Acepta las cookies funcionales para guardar permanentemente tu preferencia de tema');
  }
  
  // Configurar inicialmente los iconos según el tema actual
  if (document.querySelectorAll('.social-link:has(svg)').length > 0) {
    // Solo preparar los iconos si existen en la página
    setupTwitterIcons();
    updateTwitterIcons(currentTheme);
  }
  
  // Código para toggle del menú
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      const navButtons = document.querySelector('.nav-buttons');
      if (navButtons) {
        navButtons.classList.toggle('show');
      }
    });
    console.log('Event listener de menú configurado');
  } else {
    // Solo mostrar warning en páginas con header layout que deberían tener menuToggle
    if (isHeaderLayout && !isSidebarLayout) {
      console.warn('Toggle de menú no encontrado en el DOM. Agregue un elemento con id="menuToggle" o data-function="menu-toggle"');
    }
  }
  
  // Función para cambiar el tema
  function toggleTheme() {
    // Determinar el tema actual
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Aplicar el nuevo tema a HTML y body INMEDIATAMENTE
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    
    // Aplicar clase CSS legacy si es necesario
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    // Detectar qué sistema de cookies está disponible y usar el apropiado
    const hasConsent = hasFunctionalConsent();
    
    // Intentar guardar (con o sin consentimiento para mejor UX)
    const saved = saveThemeWithConsent(newTheme);
    
    // Determinar qué sistema se usó para el log
    let system = 'localStorage directo';
    if (hasConsent) {
      if (window.cookieHelpers && typeof window.cookieHelpers.setStorageWithConsent === 'function') {
        system = 'cookieHelpers';
      } else if (window.isCookieCategoryEnabled && typeof window.isCookieCategoryEnabled === 'function') {
        system = 'cookie-consent';
      }
    }
    
    if (saved) {
      if (hasConsent) {
        console.log(`Tema cambiado a: ${newTheme} (guardado con ${system})`);
      } else {
        console.log(`Tema cambiado a: ${newTheme} (guardado temporalmente, acepta cookies funcionales para persistencia)`);
      }
    } else {
      console.log(`Tema cambiado a: ${newTheme} (no se pudo guardar)`);
    }
    
    // Actualizar los SVGs para el nuevo tema si existen
    if (document.querySelectorAll('.theme-icon-container').length > 0) {
      updateTwitterIcons(newTheme);
    }
    
    // Actualizar la variable global
    window._immediateThemeApplied = newTheme;
  }
  
  // Función para preparar los iconos de Twitter
  function setupTwitterIcons() {
    // Buscar todos los enlaces de Twitter en la página
    const twitterLinks = document.querySelectorAll('.social-link:has(svg)');
    
    twitterLinks.forEach(link => {
      // Guardar el contenido del link original
      const originalSvgContent = link.innerHTML;
      
      // Crear un contenedor para ambos SVGs
      const container = document.createElement('div');
      container.className = 'theme-icon-container';
      container.style.position = 'relative';
      
      // Crear el SVG para modo claro (el original)
      const lightIcon = document.createElement('div');
      lightIcon.className = 'light-mode-icon';
      lightIcon.innerHTML = originalSvgContent;
      
      // Crear el SVG para modo oscuro
      const darkIcon = document.createElement('div');
      darkIcon.className = 'dark-mode-icon';
      darkIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="15" height="15" viewBox="0,0,256,256">
        <g fill="#fffcfc" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(10.66667,10.66667)"><path d="M2.36719,3l7.0957,10.14063l-6.72266,7.85938h2.64063l5.26367,-6.16992l4.31641,6.16992h6.91016l-7.42187,-10.625l6.29102,-7.375h-2.59961l-4.86914,5.6875l-3.97266,-5.6875zM6.20703,5h2.04883l9.77734,14h-2.03125z"></path></g></g>
      </svg>`;
      
      // Configurar los estilos para ambos modos
      lightIcon.style.position = 'absolute';
      lightIcon.style.top = '-12px';
      lightIcon.style.left = '-7px';
      
      darkIcon.style.position = 'absolute';
      darkIcon.style.top = '-12px';
      darkIcon.style.left = '-7px';
      
      // Agregar ambos iconos al contenedor
      container.appendChild(lightIcon);
      container.appendChild(darkIcon);
      
      // Reemplazar el contenido del enlace original
      link.innerHTML = '';
      link.appendChild(container);
    });
  }
  
  // Función para actualizar la visibilidad de los iconos según el tema
  function updateTwitterIcons(theme) {
    const lightIcons = document.querySelectorAll('.light-mode-icon');
    const darkIcons = document.querySelectorAll('.dark-mode-icon');
    
    if (theme === 'dark') {
      // Mostrar iconos de modo oscuro, ocultar iconos de modo claro
      lightIcons.forEach(icon => icon.style.display = 'none');
      darkIcons.forEach(icon => icon.style.display = 'block');
    } else {
      // Mostrar iconos de modo claro, ocultar iconos de modo oscuro
      lightIcons.forEach(icon => icon.style.display = 'block');
      darkIcons.forEach(icon => icon.style.display = 'none');
    }
  }
  
  // Configurar toggle de tema según el tipo de layout
  if (isSidebarLayout) {
    // PÁGINAS CON SIDEBAR - Solo necesitan mobileThemeToggle
    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
      });
      console.log('Event listener de tema configurado (sidebar/móvil)');
    } else {
      console.warn('Página con sidebar: Toggle de tema móvil no encontrado. Agregue un elemento con id="mobileThemeToggle"');
    }
  } else if (isHeaderLayout) {
    // PÁGINAS CON HEADER - Necesitan themeToggle y opcionalmente mobileThemeToggle
    if (themeToggle) {
      themeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
      });
      console.log('Event listener de tema configurado (header/desktop)');
    } else {
      console.warn('Página con header: Toggle de tema desktop no encontrado. Agregue un elemento con id="themeToggle"');
    }

    // Toggle móvil opcional para páginas con header
    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
      });
      console.log('Event listener de tema móvil configurado (header)');
    }
  } else {
    // Páginas sin layout específico - intentar configurar ambos si existen
    if (themeToggle) {
      themeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
      });
      console.log('Event listener de tema configurado (desktop)');
    }

    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTheme();
      });
      console.log('Event listener de tema configurado (móvil)');
    }
  }
  
  // Manejar el dropdown de cuenta
  if (accountBtn && dropdown) {
    accountBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });
    
    // Cerrar el dropdown cuando se hace clic fuera
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  }
  
  // Debug: Agregar un atajo de teclado para cambiar tema (Alt+T)
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 't') {
      toggleTheme();
    }
  });
});