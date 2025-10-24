/**
 * Módulo para gestionar la navegación del dashboard
 */

import { showNotification } from '../utils/notifications.js';

const navigation = {
    /**
     * Referencias a elementos del DOM
     */
    elements: {
        sidebar: null,
        mainContent: null,
        contentBackdrop: null,
        sidebarCollapseBtn: null,
        mobileSidebarToggle: null,
        navLinks: null,
        contentSections: null
    },

    /**
     * Sección actual
     */
    currentSection: 'dashboard',

    /**
     * Estado del sidebar (expandido/colapsado)
     */
    sidebarExpanded: true,

    /**
     * Inicializa la navegación
     */
    init() {
        // Obtener referencias a elementos del DOM
        this.elements.sidebar = document.getElementById('sidebar');
        this.elements.mainContent = document.getElementById('main-content');
        this.elements.contentBackdrop = document.getElementById('content-backdrop');
        this.elements.sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
        this.elements.mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
        
        // CORREGIDO: selección de enlaces de navegación
        this.elements.navLinks = document.querySelectorAll('.nav-link[data-section]');
        console.log('Nav links encontrados:', this.elements.navLinks.length);
        
        this.elements.contentSections = document.querySelectorAll('.content-section');
        console.log('Secciones de contenido encontradas:', this.elements.contentSections.length);

        // Configurar eventos
        this.setupEventListeners();
        
        // Inicializar sección actual desde URL si existe
        this.initFromUrl();
    },

    /**
     * Configura los listeners de eventos
     */
    setupEventListeners() {
        // Toggle del sidebar (versión escritorio)
        if (this.elements.sidebarCollapseBtn) {
            this.elements.sidebarCollapseBtn.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Toggle del sidebar (versión móvil)
        if (this.elements.mobileSidebarToggle) {
            this.elements.mobileSidebarToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        // Cerrar sidebar al hacer clic en el backdrop
        if (this.elements.contentBackdrop) {
            this.elements.contentBackdrop.addEventListener('click', () => {
                this.toggleMobileSidebar(false);
            });
        }

        // CORREGIDO: Links de navegación con mejor logging
        if (this.elements.navLinks && this.elements.navLinks.length > 0) {
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Clic en navegación detectado en:', link);
                    
                    const section = link.getAttribute('data-section');
                    console.log('Sección seleccionada:', section);
                    
                    if (section) {
                        this.changeSection(section);
                        
                        // En móvil, cerrar el sidebar al navegar
                        if (window.innerWidth < 992) {
                            this.toggleMobileSidebar(false);
                        }
                    }
                });
            });
        } else {
            console.error('No se encontraron enlaces de navegación');
        }

        // Escuchar eventos de cambio de tamaño de ventana
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Manejar navegación por URL (botón atrás/adelante)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.changeSection(e.state.section, false);
            }
        });
    },

    /**
     * Inicializa la navegación desde la URL
     */
    initFromUrl() {
        // Verificar si hay un hash en la URL
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            // Verificar si el hash corresponde a una sección válida
            const validSections = Array.from(this.elements.navLinks).map(link => 
                link.getAttribute('data-section')
            );
            
            if (validSections.includes(hash)) {
                this.changeSection(hash, false);
            }
        }
    },

    /**
     * Cambia la sección actual
     * @param {string} sectionId - ID de la sección a mostrar
     * @param {boolean} [updateHistory=true] - Si debe actualizar el historial del navegador
     */
    changeSection(sectionId, updateHistory = true) {
        console.log(`Cambiando a la sección: ${sectionId}`);
        
        // Actualizar enlaces de navegación
        this.elements.navLinks.forEach(link => {
            const linkSection = link.getAttribute('data-section');
            if (linkSection === sectionId) {
                link.classList.add('active');
                console.log(`Activando enlace: ${linkSection}`);
            } else {
                link.classList.remove('active');
            }
        });

        // CORREGIDO: Manejo más robusto de las secciones
        const allSections = document.querySelectorAll('.content-section');
        console.log(`Secciones encontradas: ${allSections.length}`);
        
        if (allSections.length === 0) {
            console.error('No se encontraron secciones de contenido');
        }
        
        const targetSectionId = `${sectionId}-section`;
        let targetFound = false;
        
        allSections.forEach(section => {
            console.log(`Evaluando sección: ${section.id}`);
            
            if (section.id === targetSectionId) {
                console.log(`Activando sección: ${section.id}`);
                section.classList.add('active');
                section.style.display = 'block'; // IMPORTANTE: Forzar visibilidad
                targetFound = true;
            } else {
                section.classList.remove('active');
                section.style.display = 'none'; // IMPORTANTE: Forzar ocultamiento
            }
        });
        
        if (!targetFound) {
            console.error(`No se encontró la sección con ID: ${targetSectionId}`);
        }

        // Actualizar título de la página
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            const formattedTitle = sectionId
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            pageTitle.textContent = formattedTitle === 'Dashboard' 
                ? 'Dashboard de Seguridad' 
                : formattedTitle;
        }

        // Actualizar historial del navegador
        if (updateHistory) {
            window.history.pushState({ section: sectionId }, '', `#${sectionId}`);
        }

        // Guardar sección actual
        this.currentSection = sectionId;
        
        // Disparar evento de cambio de sección
        window.dispatchEvent(new CustomEvent('sectionChanged', {
            detail: { section: sectionId }
        }));
    },

    /**
     * Alterna el estado del sidebar (escritorio)
     */
    toggleSidebar() {
        if (this.elements.sidebar && this.elements.mainContent) {
            this.sidebarExpanded = !this.sidebarExpanded;
            
            if (this.sidebarExpanded) {
                this.elements.sidebar.classList.remove('sidebar-collapsed');
                this.elements.mainContent.classList.remove('main-content-expanded');
                this.elements.sidebarCollapseBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
            } else {
                this.elements.sidebar.classList.add('sidebar-collapsed');
                this.elements.mainContent.classList.add('main-content-expanded');
                this.elements.sidebarCollapseBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
            }
        }
    },

    /**
     * Alterna el estado del sidebar (móvil)
     * @param {boolean} [force] - Opcional, forzar estado
     */
    toggleMobileSidebar(force) {
        if (this.elements.sidebar && this.elements.contentBackdrop) {
            const newState = force !== undefined ? force : !this.elements.sidebar.classList.contains('sidebar-expanded');
            
            if (newState) {
                this.elements.sidebar.classList.add('sidebar-expanded');
                this.elements.contentBackdrop.classList.add('show');
            } else {
                this.elements.sidebar.classList.remove('sidebar-expanded');
                this.elements.contentBackdrop.classList.remove('show');
            }
        }
    },

    /**
     * Maneja el cambio de tamaño de la ventana
     */
    handleResize() {
        // Si la pantalla se vuelve grande y el sidebar está expandido en móvil, restablecer
        if (window.innerWidth >= 992) {
            this.toggleMobileSidebar(false);
        }
    },

    /**
     * Navega a una sección específica
     * @param {string} sectionId - ID de la sección
     */
    navigateTo(sectionId) {
        this.changeSection(sectionId);
    },

    /**
     * Navega a una sección y muestra una notificación
     * @param {string} sectionId - ID de la sección
     * @param {string} message - Mensaje de la notificación
     */
    navigateWithNotification(sectionId, message) {
        this.changeSection(sectionId);
        showNotification('Información', message, 'info');
    }
};

export default navigation;