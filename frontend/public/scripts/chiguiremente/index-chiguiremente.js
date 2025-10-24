// Módulo principal que coordina todas las funcionalidades
import { initDashboardModule } from './dashboard-chiguiremente.js';
import { initCreationModule } from './creation-chiguiremente.js';
import { initEditionModule } from './edition-chiguiremente.js';
import { initTrainMindModule } from './train-mind-chiguiremente.js';
import { setupThemeToggle, showNotification, setupLoader, setupConfirmModal } from './utils-chiguiremente.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar cargador
    setupLoader();
    
    // Inicializar tema
    setupThemeToggle(updateVisualElements);
    
    // Inicializar modal de confirmación
    setupConfirmModal();
    
    // Inicializar navegación
    setupNavigation();
    
    // Inicializar módulos
    initDashboardModule();
    initCreationModule();
    initEditionModule();
    initTrainMindModule();
    
    // Inicializar botones de acción global
    setupGlobalActions();
    
    console.log('✅ Panel de Administración inicializado correctamente');
});

// Actualiza elementos visuales cuando cambia el tema
function updateVisualElements() {
    // Actualizar imagen del Chiguire según el tema
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const chiguireImg = document.getElementById('chiguire-img');
    
    if (chiguireImg) {
        chiguireImg.src = isDarkTheme 
            ? '/images/chiguire-walking-dark.gif' 
            : '/images/chiguire-walking.gif';
    }
}

// Gestión de navegación entre vistas
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = {
        'dashboard': document.getElementById('dashboard-view'),
        'creation': document.getElementById('creation-view'),
        'edition': document.getElementById('edition-view'),
        'train-mind': document.getElementById('train-mind-section')
    };
    
    // Establecer vista activa basada en hash URL
    function setActiveView() {
        // Obtener la vista del hash o usar 'dashboard' por defecto
        const hash = window.location.hash.substring(1) || 'dashboard';
        
        // Activar elemento de navegación correspondiente
        navItems.forEach(item => {
            const viewName = item.dataset.view || item.querySelector('.nav-link')?.dataset?.section;
            
            if (viewName === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Mostrar vista correspondiente
        Object.keys(views).forEach(viewName => {
            if (views[viewName]) {
                if (viewName === hash) {
                    views[viewName].style.display = 'block';
                    views[viewName].classList.add('active');
                    // Disparar evento personalizado para notificar a los módulos
                    document.dispatchEvent(new CustomEvent('viewActivated', { 
                        detail: { 
                            view: viewName,
                            // Añadir información del estado de navegación
                            navigationState: JSON.parse(localStorage.getItem('navigationState') || 'null')
                        } 
                    }));
                } else {
                    views[viewName].style.display = 'none';
                    views[viewName].classList.remove('active');
                }
            }
        });
    }
    
    // Establecer vista inicial
    setActiveView();
    
    // Cambiar vista al hacer clic en elementos de navegación
    navItems.forEach(item => {
        const navLink = item.querySelector('.nav-link');
        if (navLink) {
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                const viewName = navLink.dataset.section || item.dataset.view;
                if (viewName) {
                    window.location.hash = viewName;
                }
                
                // No es necesario llamar a setActiveView() porque lo hará el listener de hashchange
            });
        }
    });
    
    // Actualizar vista cuando cambia el hash de la URL
    window.addEventListener('hashchange', setActiveView);
    
    // Ver más botones
    const viewMoreCarreras = document.getElementById('view-more-carreras');
    if (viewMoreCarreras) {
        viewMoreCarreras.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = 'edition';
            
            // Asegurarse de que la pestaña de carreras esté activa
            setTimeout(() => {
                const carreraTab = document.querySelector('[data-tab="edit-carrera-tab"]');
                if (carreraTab) carreraTab.click();
            }, 100);
        });
    }
}

// Configuración de acciones globales
function setupGlobalActions() {
    // Botón de ayuda
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            showNotification({
                title: 'Centro de Ayuda',
                message: 'La documentación completa del panel de administración está disponible en la wiki interna.',
                type: 'info',
                duration: 5000
            });
        });
    }
    
    // Manejar eventos de clic en el contenido principal para ocultar sidebar móvil
    const contentBackdrop = document.getElementById('content-backdrop');
    if (contentBackdrop) {
        contentBackdrop.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('open');
            contentBackdrop.style.display = 'none';
        });
    }
    
    // Botón de toggle para sidebar móvil
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('content-backdrop');
            
            if (sidebar && backdrop) {
                sidebar.classList.toggle('open');
                backdrop.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
            }
        });
    }
}