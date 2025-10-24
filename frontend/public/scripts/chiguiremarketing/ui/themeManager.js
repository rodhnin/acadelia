// themeManager.js - ACTUALIZADO PARA SISTEMA UNIFICADO DE MERMAID
// Versión simplificada que delega Mermaid al sistema unificado

// Variable para prevenir múltiples ejecuciones simultáneas
let isChangingTheme = false;
let themeChangeTimeout = null;

// Inicializar gestor de temas
export function initThemeManager() {
  // Obtener tema guardado en localStorage o usar preferencia del sistema
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Aplicar tema inicial
  if (savedTheme) {
    setTheme(savedTheme, true); // true = inicial, no manejar Mermaid
  } else {
    setTheme(prefersDarkMode ? 'dark' : 'light', true);
  }
  
  // Mostrar documento una vez que se ha aplicado el tema
  document.body.style.visibility = 'visible';
  
  // Configurar botón de cambio de tema
  setupThemeToggle();
  
  // Configurar botón de tema del sidebar
  setupSidebarThemeToggle();
  
  // Escuchar cambios en preferencia del sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Solo cambiar automáticamente si no hay un tema guardado
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
  
  // Exponer funciones para uso global
  window.setTheme = setTheme;
  window.toggleTheme = toggleTheme;
  window.updateThinkingGifs = updateThinkingGifs;
  
  console.log('🎨 ThemeManager inicializado con integración al Sistema Unificado de Mermaid');
}

// Configurar botón de toggle en el header
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

// Configurar botón de cambio de tema en el sidebar
function setupSidebarThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

// Cambiar entre temas claro y oscuro
export function toggleTheme() {
  // Prevenir múltiples cambios simultáneos
  if (isChangingTheme) {
    console.log('⚠️ Cambio de tema ya en progreso, ignorando...');
    return;
  }
  
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  setTheme(newTheme);
  
  // Notificar cambio si existe la función
  if (window.showNotification) {
    window.showNotification(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
  }
}

// Establecer un tema específico
export function setTheme(theme, isInitial = false) {
  // Si ya estamos cambiando el tema, cancelar
  if (isChangingTheme && !isInitial) {
    console.log('⚠️ Cambio de tema en progreso, cancelando nuevo cambio');
    return;
  }
  
  // Marcar que estamos cambiando el tema
  if (!isInitial) {
    isChangingTheme = true;
    
    // Cancelar cualquier timeout previo
    if (themeChangeTimeout) {
      clearTimeout(themeChangeTimeout);
    }
  }
  
  console.log(`🎨 Aplicando tema: ${theme} ${isInitial ? '(inicial)' : ''}`);
  
  // Aplicar tema al body
  document.body.setAttribute('data-theme', theme);
  
  // Guardar en localStorage
  localStorage.setItem('theme', theme);
  
  // Actualizar iconos en botones de tema
  updateThemeIcons(theme);
  
  // Configurar tema para highlight.js
  updateCodeTheme(theme);
  
  // Actualizar gifs de thinking si existen
  updateThinkingGifs(theme);
  
  // ✨ DELEGACIÓN AL SISTEMA UNIFICADO DE MERMAID
  if (!isInitial) {
    // El MermaidManager tiene su propio listener de cambios de tema
    // No necesitamos hacer nada aquí, se actualiza automáticamente
    console.log('🎨 Tema aplicado - MermaidManager manejará los diagramas automáticamente');
    
    // Resetear flag después de un tiempo razonable
    themeChangeTimeout = setTimeout(() => {
      isChangingTheme = false;
      console.log('✅ Cambio de tema completado');
    }, 2000);
  }
}

// FUNCIÓN: Actualizar gifs de thinking según el tema
function updateThinkingGifs(theme = null) {
  if (!theme) {
    theme = document.body.getAttribute('data-theme') || 'light';
  }
  
  // Encontrar todos los avatares en estado thinking
  const thinkingAvatars = document.querySelectorAll('.ai-profile.thinking');
  
  thinkingAvatars.forEach(avatar => {
    updateThinkingGif(avatar, theme);
  });
}

// FUNCIÓN: Actualizar un gif de thinking específico
function updateThinkingGif(aiProfileElement, theme = null) {
  if (!aiProfileElement || !aiProfileElement.classList.contains('thinking')) {
    return;
  }
  
  if (!theme) {
    theme = document.body.getAttribute('data-theme') || 'light';
  }
  
  // Limpiar estilos de background existentes
  aiProfileElement.style.backgroundImage = '';
  
  // Aplicar el gif correcto según el tema
  if (theme === 'dark') {
    aiProfileElement.style.backgroundImage = 'var(--avatar-loading-path-dark)';
  } else {
    aiProfileElement.style.backgroundImage = 'var(--avatar-loading-path-light)';
  }
  
  // Asegurar que el gif se muestre correctamente
  aiProfileElement.style.backgroundSize = 'cover';
  aiProfileElement.style.backgroundPosition = 'center';
  aiProfileElement.style.backgroundRepeat = 'no-repeat';
}

// Actualizar iconos en botones de tema
function updateThemeIcons(theme) {
  // Botón principal en header
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.innerHTML = theme === 'dark' 
      ? '<i class="bx bx-sun"></i>' 
      : '<i class="bx bxs-moon"></i>';
  }
  
  // Actualizar icono del toggle switch en sidebar
  const themeIcon = document.querySelector('.theme-toggle-slider .theme-icon');
  if (themeIcon) {
    // Añadir clase de animación
    themeIcon.classList.add('changing');
    
    // Cambiar icono
    themeIcon.className = theme === 'dark' 
      ? 'theme-icon bx bx-sun changing' 
      : 'theme-icon bx bxs-moon changing';
    
    // Remover clase de animación después de la transición
    setTimeout(() => {
      themeIcon.classList.remove('changing');
    }, 300);
  }
  
  // Actualizar el slider del switch según el tema - FORZADO
  const themeSlider = document.querySelector('.theme-toggle-slider');
  if (themeSlider) {
    // Forzar actualización inmediata del estado visual
    const currentTransform = theme === 'dark' ? 'translateX(24px)' : 'translateX(0px)';
    themeSlider.style.transform = currentTransform;
    
    // También forzar con CSS class
    if (theme === 'dark') {
      document.body.classList.add('dark-theme-active');
    } else {
      document.body.classList.remove('dark-theme-active');
    }
  }
}

// Actualizar tema para highlight.js
function updateCodeTheme(theme) {
  const codeTheme = document.getElementById('code-theme');
  if (codeTheme) {
    const href = theme === 'dark' 
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
    
    codeTheme.setAttribute('href', href);
  }
  
  // Volver a aplicar highlight a bloques de código existentes DE FORMA SEGURA
  if (typeof hljs !== 'undefined') {
    try {
      // IMPORTANTE: Solo seleccionar elementos code que NO tengan hijos
      // Esto evita el error de HTML sin escapar
      document.querySelectorAll('pre code:not(:has(*))').forEach(block => {
        try {
          hljs.highlightElement(block);
        } catch (err) {
          console.warn('Error al resaltar bloque de código individual:', err);
        }
      });
    } catch (error) {
      // Fallback para navegadores que no soportan :has() (Safari más antiguo)
      document.querySelectorAll('pre code').forEach(block => {
        // Solo resaltar si no tiene elementos hijos
        if (block.children.length === 0) {
          try {
            hljs.highlightElement(block);
          } catch (err) {
            console.warn('Error al resaltar bloque de código (fallback):', err);
          }
        }
      });
    }
  }
}

// ✨ FUNCIONES SIMPLIFICADAS PARA MERMAID (DELEGACIÓN)

/**
 * ✨ NUEVA: Delegación al Sistema Unificado para cambios de tema
 * Ya no manejamos Mermaid directamente aquí
 */
function handleMermaidThemeChange(theme) {
  // El MermaidManager tiene su propio observer de cambios de tema
  // Esta función existe solo para retrocompatibilidad
  console.log(`🎨 Cambio de tema delegado al MermaidManager: ${theme}`);
  
  if (window.mermaidManager && window.mermaidManager.isInitialized) {
    console.log('✅ MermaidManager manejará el cambio automáticamente');
  } else {
    console.warn('⚠️ MermaidManager no está disponible');
  }
}

// FUNCIÓN: Crear observador para detectar nuevos avatares thinking
function createThinkingObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Buscar avatares thinking en el nodo añadido
          const thinkingAvatars = node.querySelectorAll ? 
            node.querySelectorAll('.ai-profile.thinking') : [];
          
          // También verificar si el propio nodo es un avatar thinking
          if (node.classList && node.classList.contains('ai-profile') && 
              node.classList.contains('thinking')) {
            updateThinkingGif(node);
          }
          
          // Actualizar avatares thinking encontrados
          thinkingAvatars.forEach(avatar => {
            updateThinkingGif(avatar);
          });
        }
      });
    });
  });
  
  // Iniciar observación
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

// FUNCIÓN: Establecer estado thinking
export function setThinkingState(messageElement, isThinking = true) {
  if (!messageElement) return;
  
  const aiProfile = messageElement.querySelector('.ai-profile');
  const messageContent = messageElement.querySelector('.message-content');
  
  if (aiProfile) {
    if (isThinking) {
      aiProfile.classList.add('thinking');
      // Aplicar el gif correcto inmediatamente
      updateThinkingGif(aiProfile);
    } else {
      aiProfile.classList.remove('thinking');
      // Restaurar imagen normal
      aiProfile.style.backgroundImage = '';
    }
  }
  
  if (messageContent) {
    if (isThinking) {
      messageContent.classList.add('loading');
    } else {
      messageContent.classList.remove('loading');
    }
  }
  
  // Manejar clase de procesamiento del mensaje completo
  if (isThinking) {
    messageElement.classList.add('processing');
  } else {
    messageElement.classList.remove('processing');
  }
}

// Inicializar observer cuando se carga el script
let thinkingObserver = null;

// Función para inicializar el observer (se llama desde app.js)
export function initThinkingObserver() {
  if (!thinkingObserver) {
    thinkingObserver = createThinkingObserver();
  }
  return thinkingObserver;
}

// ✨ FUNCIONES LEGACY PARA MERMAID (RETROCOMPATIBILIDAD)
// Estas funciones ya no hacen nada, el sistema unificado se encarga de todo

/**
 * @deprecated Usar Sistema Unificado de Mermaid
 */
function updateMermaidTheme(theme) {
  console.log(`🔄 updateMermaidTheme() llamada (legacy) - delegando a MermaidManager`);
  handleMermaidThemeChange(theme);
}

/**
 * @deprecated Usar Sistema Unificado de Mermaid
 */
function updateExistingMermaidDiagrams(theme) {
  console.log(`🔄 updateExistingMermaidDiagrams() llamada (legacy) - ya no necesaria`);
  // El MermaidManager maneja esto automáticamente
}

/**
 * @deprecated Usar Sistema Unificado de Mermaid
 */
function reInitializeMermaidZoom() {
  console.log(`🔄 reInitializeMermaidZoom() llamada (legacy) - ya no necesaria`);
  // El MermaidManager maneja esto automáticamente
}

// Función para anunciar cambios de tema (accesibilidad)
function announceThemeChange() {
  const currentTheme = document.body.getAttribute('data-theme') || 'light';
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = `Tema ${currentTheme === 'dark' ? 'oscuro' : 'claro'} activado`;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.parentNode.removeChild(announcement);
    }
  }, 1000);
}

function setupThinkingGifHandling() {
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-theme' && 
          mutation.target === document.body) {
        
        if (window.updateThinkingGifs) {
          setTimeout(() => {
            window.updateThinkingGifs();
          }, 100);
        }
      }
    });
  });
  
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  
  return themeObserver;
}

// ✨ EXPORTAR FUNCIONES PÚBLICAS
export default {
  initThemeManager,
  toggleTheme,
  setTheme,
  updateThinkingGifs,
  updateThinkingGif,
  setThinkingState,
  initThinkingObserver,
  // Legacy functions (mantener para retrocompatibilidad)
  updateMermaidTheme,
  handleMermaidThemeChange
};

// Hacer disponibles globalmente las funciones necesarias
window.updateThinkingGif = updateThinkingGif;
window.setThinkingState = setThinkingState;
window.announceThemeChange = announceThemeChange;
window.setupThinkingGifHandling = setupThinkingGifHandling;

// ✨ FUNCIONES LEGACY PARA RETROCOMPATIBILIDAD
window.updateMermaidTheme = updateMermaidTheme;
window.handleMermaidThemeChange = handleMermaidThemeChange;

export { 
  updateMermaidTheme, 
  handleMermaidThemeChange,
  announceThemeChange,
  setupThinkingGifHandling
};