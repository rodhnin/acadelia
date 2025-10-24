/**
 * Módulo para gestionar el tema del dashboard (claro/oscuro)
 */

const theme = {
    /**
     * Nombre del tema actual
     * @type {string}
     */
    currentTheme: 'light',

    /**
     * Clave para almacenar el tema en localStorage
     * @type {string}
     */
    storageKey: 'acadelia_security_theme',

    /**
     * Inicializa el tema
     */
    init() {
        // Recuperar tema de localStorage o usar claro por defecto
        this.currentTheme = localStorage.getItem(this.storageKey) || 'light';
        
        // Aplicar tema inicial
        this.applyTheme(this.currentTheme);
        
        // Configurar listener para cambio de tema
        const themeToggle = document.getElementById('theme-toggle');
        const themeLabel = document.getElementById('theme-label');
        
        if (themeToggle) {
            // Establecer estado inicial del toggle
            themeToggle.checked = this.currentTheme === 'dark';
            
            // Actualizar etiqueta de tema
            if (themeLabel) {
                themeLabel.textContent = this.currentTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
            }
            
            // Escuchar cambios en el toggle
            themeToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                this.setTheme(newTheme);
            });
        }
    },

    /**
     * Establece y aplica un tema
     * @param {string} themeName - Nombre del tema ('light' o 'dark')
     */
    setTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        
        // Guardar en localStorage
        localStorage.setItem(this.storageKey, themeName);
        
        // Actualizar etiqueta de tema
        const themeLabel = document.getElementById('theme-label');
        if (themeLabel) {
            themeLabel.textContent = themeName === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
        }
        
        // Disparar evento para que otros módulos puedan reaccionar al cambio
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: themeName }
        }));
    },

    /**
     * Aplica el tema al documento
     * @param {string} themeName - Nombre del tema ('light' o 'dark')
     */
    applyTheme(themeName) {
        if (themeName === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    },

    /**
     * Obtiene el tema actual
     * @returns {string} Nombre del tema actual
     */
    getCurrentTheme() {
        return this.currentTheme;
    },

    /**
     * Verifica si el tema actual es oscuro
     * @returns {boolean} true si el tema es oscuro
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }
};

export default theme;