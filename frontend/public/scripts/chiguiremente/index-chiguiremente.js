// Módulo principal que coordina todas las funcionalidades
import { initDashboardModule } from './dashboard-chiguiremente.js';
import { initCreationModule } from './creation-chiguiremente.js';
import { initEditionModule } from './edition-chiguiremente.js';
import { initTrainMindModule } from './train-mind-chiguiremente.js';
import { setupThemeToggle, showNotification, setupLoader, setupConfirmModal } from './utils-chiguiremente.js';

document.addEventListener('DOMContentLoaded', () => {
    setupLoader();
    
    setupThemeToggle(updateVisualElements);
    
    setupConfirmModal();
    
    setupNavigation();
    
    initDashboardModule();
    initCreationModule();
    initEditionModule();
    initTrainMindModule();
    
    setupGlobalActions();
    
    console.log('✅ Panel de Administración inicializado correctamente');
});

// Actualiza elementos visuales cuando cambia el tema
function updateVisualElements() {
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
    
    function setActiveView() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        
        navItems.forEach(item => {
            const viewName = item.dataset.view || item.querySelector('.nav-link')?.dataset?.section;
            
            if (viewName === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        Object.keys(views).forEach(viewName => {
            if (views[viewName]) {
                if (viewName === hash) {
                    views[viewName].style.display = 'block';
                    views[viewName].classList.add('active');
                    document.dispatchEvent(new CustomEvent('viewActivated', { 
                        detail: { 
                            view: viewName,
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
    
    setActiveView();
    
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