/**
 * Gestor de temas (claro/oscuro) para la aplicación
 * Versión actualizada con verificación de consentimiento de cookies
 */
export class ThemeManager {
    constructor() {
      this.THEME_KEY = 'financeDashboard_darkMode';
      this.darkModeEnabled = false;
      this.themeToggle = null;
    }
    
    /**
     * Inicializa el gestor de temas
     */
    init() {
      console.log('Inicializando gestor de temas');
      
      // Obtener preferencia guardada
      this.loadThemePreference();
      
      // Aplicar tema inicial
      this.applyTheme();
      
      // Obtener referencia al toggle de tema
      this.themeToggle = document.getElementById('theme-toggle');
      
      // Sincronizar estado del toggle con tema actual
      if (this.themeToggle) {
        this.themeToggle.checked = this.darkModeEnabled;
        
        // Escuchar cambios en el toggle
        this.themeToggle.addEventListener('change', () => {
          this.toggleTheme();
        });
      }
      
      // Escuchar cambios en las preferencias del sistema
      this.setupSystemPreferenceListener();
      
      return true;
    }
    
    /**
     * Carga la preferencia de tema guardada con verificación de consentimiento
     */
    loadThemePreference() {
      try {
        // Cambiar a tema claro por defecto
        this.darkModeEnabled = false;
        
        // Verificar si cookieHelpers está disponible
        if (window.cookieHelpers) {
          // Usar cookieHelpers para obtener la preferencia guardada con verificación de consentimiento
          const savedPreference = window.cookieHelpers.getStorageWithConsent(this.THEME_KEY, 'functional', null);
          
          if (savedPreference !== null) {
            // Usar preferencia guardada
            this.darkModeEnabled = savedPreference === 'true';
            console.log(`Tema cargado con consentimiento: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
          } else {
            // Si no hay preferencia guardada o no hay consentimiento, usar preferencia del sistema
            this.darkModeEnabled = window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log(`Tema basado en preferencia del sistema: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
          }
        } else {
          // Si cookieHelpers no está disponible, intentar obtener directamente del localStorage
          // pero con advertencia
          console.warn('cookieHelpers no disponible, accediendo directamente a localStorage');
          const savedPreference = localStorage.getItem(this.THEME_KEY);
          
          if (savedPreference !== null) {
            // Usar preferencia guardada
            this.darkModeEnabled = savedPreference === 'true';
          } else {
            // Si no hay preferencia guardada, usar preferencia del sistema
            this.darkModeEnabled = window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
        }
        
        console.log(`Tema final cargado: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
      } catch (error) {
        // En caso de error (por ejemplo, localStorage no disponible)
        console.warn('Error al cargar preferencia de tema:', error);
        this.darkModeEnabled = false;
      }
    }
    
    /**
     * Guarda la preferencia de tema actual con verificación de consentimiento
     */
    saveThemePreference() {
      try {
        // Verificar si cookieHelpers está disponible
        if (window.cookieHelpers) {
          // Guardar con verificación de consentimiento
          const saved = window.cookieHelpers.setStorageWithConsent(
            this.THEME_KEY, 
            this.darkModeEnabled.toString(), 
            'functional'
          );
          
          if (!saved) {
            console.warn('No se pudo guardar preferencia de tema - falta consentimiento para cookies funcionales');
          } else {
            console.log(`Tema guardado con consentimiento: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
          }
        } else {
          // Si cookieHelpers no está disponible, intentar guardar directamente en localStorage
          // pero con advertencia
          console.warn('cookieHelpers no disponible, guardando directamente en localStorage');
          localStorage.setItem(this.THEME_KEY, this.darkModeEnabled.toString());
        }
      } catch (error) {
        console.warn('Error al guardar preferencia de tema:', error);
      }
    }
    
    /**
     * Aplica el tema actual al documento
     */
    applyTheme() {
      console.log("APLICANDO TEMA:", this.darkModeEnabled ? "OSCURO" : "CLARO");
      
      // Activar transiciones (si es la primera vez)
      if (!document.documentElement.classList.contains('theme-transitions-enabled')) {
        document.documentElement.classList.add('theme-transitions-enabled');
      }
      
      // Aplicar directamente al body y html
      if (this.darkModeEnabled) {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
      }
      
      // No necesitamos forzar un repintado como antes
      // El resto de la función queda igual
      
      // Actualizar meta tag de theme-color para la barra de direcciones en móvil
      this.updateMetaThemeColor();
      
      // Indicar explícitamente a otros scripts que el tema ha cambiado
      document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: {
          darkMode: this.darkModeEnabled,
          timestamp: new Date()
        }
      }));
      
      // Más logs para debug
      console.log("Estado final del tema:", document.body.classList.contains('dark-mode'));
    }
    
    /**
     * Actualiza la meta etiqueta theme-color para la barra de direcciones en móvil
     */
    updateMetaThemeColor() {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      
      if (!metaThemeColor) {
        // Si no existe, crear la meta etiqueta
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      
      // Establecer el color según el tema
      metaThemeColor.content = this.darkModeEnabled ? '#212529' : '#f0efe7';
    }
    
    /**
     * Actualiza la etiqueta del toggle de tema
     * @param {string} text - Texto a mostrar
     */
    updateThemeLabel(text) {
      const themeLabel = document.getElementById('theme-label');
      if (themeLabel) {
        themeLabel.textContent = text;
      }
    }
    
    /**
     * Alterna entre temas claro y oscuro
     */
    toggleTheme() {
      try {
        console.log('toggleTheme called, current state:', this.darkModeEnabled);
        
        // Invertir estado actual
        this.darkModeEnabled = !this.darkModeEnabled;
        
        // Guardar preferencia (con verificación de consentimiento)
        this.saveThemePreference();
        
        // Aplicar tema
        this.applyTheme();
        
        // Sincronizar explícitamente el estado del toggle
        if (this.themeToggle) {
          this.themeToggle.checked = this.darkModeEnabled;
          console.log('Toggle state updated to:', this.themeToggle.checked);
        } else {
          console.warn('Theme toggle not found when trying to update its state');
        }
        
        console.log(`Tema cambiado a: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
        
        return this.darkModeEnabled;
      } catch (error) {
        console.error('Error al cambiar tema:', error);
        return this.darkModeEnabled;
      }
    }
    
    /**
     * Configura listener para cambios en preferencias del sistema
     */
    setupSystemPreferenceListener() {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Función para manejar cambios
      const handleSystemThemeChange = (e) => {
        // Solo cambiar si no hay preferencia guardada
        let preferenceExists = false;
        
        // Verificar con cookieHelpers si está disponible
        if (window.cookieHelpers) {
          // Verificar consentimiento y existencia de preferencia
          const savedPreference = window.cookieHelpers.getStorageWithConsent(this.THEME_KEY, 'functional', null);
          preferenceExists = savedPreference !== null;
        } else {
          // Verificar directamente
          preferenceExists = localStorage.getItem(this.THEME_KEY) !== null;
        }
        
        if (!preferenceExists) {
          this.darkModeEnabled = e.matches;
          this.applyTheme();
          
          // Sincronizar toggle
          if (this.themeToggle) {
            this.themeToggle.checked = this.darkModeEnabled;
          }
          
          console.log(`Tema ajustado a preferencia del sistema: ${this.darkModeEnabled ? 'oscuro' : 'claro'}`);
        }
      };
      
      // Añadir listener con soporte para navegadores antiguos
      try {
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else {
          // Fallback para navegadores antiguos
          mediaQuery.addListener(handleSystemThemeChange);
        }
      } catch (error) {
        console.warn('Error al configurar listener de preferencias del sistema:', error);
      }
    }
    
    /**
     * Dispara evento personalizado para cambios de tema
     */
    dispatchThemeChangedEvent() {
      const event = new CustomEvent('themeChanged', {
        detail: {
          darkMode: this.darkModeEnabled,
          timestamp: new Date()
        }
      });
      
      document.dispatchEvent(event);
    }
    
    /**
     * Retorna si el modo oscuro está activo
     * @returns {boolean} Estado del modo oscuro
     */
    isDarkMode() {
      return this.darkModeEnabled;
    }
    
    /**
     * Establece un tema específico
     * @param {boolean} dark - Si se debe activar el modo oscuro
     */
    setTheme(dark) {
      if (this.darkModeEnabled !== dark) {
        this.darkModeEnabled = dark;
        this.saveThemePreference();
        this.applyTheme();
        
        // Sincronizar toggle
        if (this.themeToggle) {
          this.themeToggle.checked = this.darkModeEnabled;
        }
      }
    }
  }