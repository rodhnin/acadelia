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
        this.currentTheme = localStorage.getItem(this.storageKey) || 'light';
        
        this.applyTheme(this.currentTheme);
        
        const themeToggle = document.getElementById('theme-toggle');
        const themeLabel = document.getElementById('theme-label');
        
        if (themeToggle) {
            themeToggle.checked = this.currentTheme === 'dark';
            
            if (themeLabel) {
                themeLabel.textContent = this.currentTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
            }
            
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
        
        localStorage.setItem(this.storageKey, themeName);
        
        const themeLabel = document.getElementById('theme-label');
        if (themeLabel) {
            themeLabel.textContent = themeName === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
        }
        
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