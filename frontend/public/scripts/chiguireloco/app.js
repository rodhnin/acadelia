/**
 * Aplicación principal del panel de seguridad
 * Coordina todos los módulos y maneja la navegación y eventos globales
 */

// UI Components
import loader from './ui/loader.js';
import theme from './ui/theme.js';
import navigation from './ui/navigation.js';
import modals from './ui/modals.js';
import { initNotifications, showNotification } from './utils/notifications.js';

// Modules
import dashboard from './modules/dashboard.js';
import events from './modules/events.js';
import blockedIps from './modules/blockedIps.js';
import loginAttempts from './modules/loginAttempts.js';
import suspiciousActivity from './modules/suspiciousActivity.js';
import userSecurity from './modules/userSecurity.js';
import configuration from './modules/configuration.js';
import maintenance from './modules/maintenance.js';
import queues from './modules/queues.js';

// Main app
const securityApp = {
    /**
     * Estado de la aplicación
     */
    state: {
        initialized: false,
        currentSection: 'dashboard',
        modules: {
            dashboard,
            events,
            blockedIps,
            loginAttempts,
            suspiciousActivity,
            userSecurity,
            configuration,
            maintenance,
            queues
        }
    },

    /**
     * Inicializa la aplicación
     */
    async init() {
        // Mostrar loader
        loader.init();
        loader.show();
        
        try {
            // Inicializar componentes de UI
            this.initUIComponents();
            
            // Inicializar módulos de manera progresiva
            await this.initModulesProgressively();
            
            // Configurar listeners globales
            this.setupGlobalEventListeners();
            
            // Marcar como inicializado
            this.state.initialized = true;
            
            // Ocultar loader después de completar inicialización
            loader.hide();
            
            // Mostrar notificación de bienvenida
            showNotification('Bienvenido', 'Panel de seguridad inicializado correctamente', 'success');
        } catch (error) {
            console.error('Error iniciando la aplicación:', error);
            
            // Actualizar loader con error
            loader.updateProgress(100, 'Error al inicializar la aplicación');
            
            // Mostrar mensaje de error
            setTimeout(() => {
                loader.hide();
                showNotification('Error', 'No se pudo inicializar la aplicación: ' + error.message, 'error');
            }, 1000);
        }
    },

    /**
     * Inicializa los componentes de UI
     */
    initUIComponents() {
        // Inicializar tema
        theme.init();
        
        // Inicializar sistema de notificaciones
        initNotifications();
        
        // Inicializar navegación
        navigation.init();
        
        // Inicializar modales
        modals.init();
        
        // Actualizar progreso
        loader.updateProgress(20, 'Inicializando interfaz de usuario...');
    },

    /**
     * Inicializa los módulos de manera progresiva
     */
    async initModulesProgressively() {
        const modules = Object.entries(this.state.modules);
        const totalModules = modules.length;
        const progressStep = 70 / totalModules; // 70% restante del progreso
        
        let currentProgress = 20; // Comenzamos en 20% después de la UI
        
        // Inicializar cada módulo secuencialmente
        for (const [name, module] of modules) {
            try {
                loader.updateProgress(currentProgress, `Cargando módulo: ${this.formatModuleName(name)}...`);
                
                // Inicializar módulo
                await module.init();
                
                // Actualizar progreso
                currentProgress += progressStep;
                loader.updateProgress(currentProgress);
            } catch (error) {
                console.error(`Error inicializando módulo ${name}:`, error);
                // Continuar con el siguiente módulo
            }
        }
        
        // Completar progreso
        loader.updateProgress(100, 'Inicialización completada');
    },

    /**
     * Configura los event listeners globales
     */
    setupGlobalEventListeners() {
        // Cuando cambia la sección activa
        window.addEventListener('sectionChanged', (e) => {
            this.handleSectionChange(e.detail.section);
        });
        
        // Cuando cambia el tema
        window.addEventListener('themechange', (e) => {
            this.handleThemeChange(e.detail.theme);
        });
        
        // Eventos para navegación entre secciones
        window.addEventListener('viewAllThreats', () => {
            navigation.navigateTo('events');
            // Aquí podríamos configurar filtros específicos
        });
        
        window.addEventListener('viewAllCriticalEvents', () => {
            navigation.navigateTo('events');
            // Aquí podríamos configurar filtros específicos
        });
        
        window.addEventListener('viewUserLoginHistory', (e) => {
            navigation.navigateTo('login-attempts');
            // Aquí podríamos configurar filtros específicos
        });
        
        window.addEventListener('viewUserSecurityLog', (e) => {
            navigation.navigateTo('events');
            // Aquí podríamos configurar filtros específicos
        });
        
        // Evento de bloqueo de IP (para actualizar datos en múltiples módulos)
        window.addEventListener('ipBlocked', () => {
            this.refreshSecurityData();
        });
        
        // Evento de revocación de tokens
        window.addEventListener('tokensRevoked', () => {
            this.refreshSecurityData();
        });
    },

    /**
     * Maneja el cambio de sección
     * @param {string} section - ID de la sección
     */
    handleSectionChange(section) {
        // Actualizar estado
        this.state.currentSection = section;
        
        // Ejecutar callbacks específicos del módulo si es necesario
        if (section === 'blocked-ips' && this.state.modules.blockedIps.onSectionActivated) {
            this.state.modules.blockedIps.onSectionActivated();
        }
        
        // Ejecutar callback para el módulo de colas
        if (section === 'queues' && this.state.modules.queues.onSectionActivated) {
            this.state.modules.queues.onSectionActivated();
        }
    },

    /**
     * Maneja el cambio de tema
     * @param {string} theme - Nombre del tema
     */
    handleThemeChange(theme) {
        // Ya manejado por theme.js, pero podríamos hacer cosas adicionales aquí
        console.log(`Tema cambiado a: ${theme}`);
    },

    /**
     * Refresca los datos de seguridad en múltiples módulos
     */
    refreshSecurityData() {
        // Disparar evento global para que los módulos se actualicen
        window.dispatchEvent(new CustomEvent('securityDataUpdated'));
    },

    /**
     * Formatea el nombre de un módulo para mostrarlo
     * @param {string} moduleName - Nombre del módulo
     * @returns {string} Nombre formateado
     */
    formatModuleName(moduleName) {
        const formattingMap = {
            'dashboard': 'Panel Principal',
            'events': 'Eventos de Seguridad',
            'blockedIps': 'IPs Bloqueadas',
            'loginAttempts': 'Intentos de Login',
            'suspiciousActivity': 'Actividad Sospechosa',
            'userSecurity': 'Seguridad por Usuario',
            'configuration': 'Configuración',
            'maintenance': 'Mantenimiento',
            'queues': 'Monitor de Colas'
        };
        
        return formattingMap[moduleName] || moduleName;
    },

    /**
     * Limpia recursos al destruir la aplicación
     */
    destroy() {
        // Limpiar event listeners globales
        window.removeEventListener('sectionChanged', this.handleSectionChange);
        window.removeEventListener('themechange', this.handleThemeChange);
        window.removeEventListener('viewAllThreats', () => {});
        window.removeEventListener('viewAllCriticalEvents', () => {});
        window.removeEventListener('viewUserLoginHistory', () => {});
        window.removeEventListener('viewUserSecurityLog', () => {});
        window.removeEventListener('ipBlocked', () => {});
        window.removeEventListener('tokensRevoked', () => {});
        
        // Destruir cada módulo
        Object.values(this.state.modules).forEach(module => {
            if (typeof module.destroy === 'function') {
                module.destroy();
            }
        });
    }
};

export default securityApp;