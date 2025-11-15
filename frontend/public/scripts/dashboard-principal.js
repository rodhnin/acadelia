(function() {
    const hasConsent = localStorage.getItem('cookiePreferences') && 
                       JSON.parse(localStorage.getItem('cookiePreferences')).functional === true;
    
    let savedTheme = 'light';
    if (hasConsent && localStorage.getItem('theme')) {
        savedTheme = localStorage.getItem('theme');
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (document.body) {
        document.body.setAttribute('data-theme', savedTheme);
    }
})();

// Script unificado para manejar todas las funcionalidades del dashboard
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    initNavMenu();

    initCornerContainers();

    console.log("Dashboard: Inicialización completada");
});

// === FUNCIONALIDAD DEL TEMA ===
function initTheme() {
    const hasConsent = localStorage.getItem('cookiePreferences') && 
                       JSON.parse(localStorage.getItem('cookiePreferences')).functional === true;
    
    let savedTheme = 'light';
    if (hasConsent && localStorage.getItem('theme')) {
        savedTheme = localStorage.getItem('theme');
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTheme();
        });
        console.log("Theme toggle configurado");
    } else {
        console.warn("Elemento themeToggle no encontrado");
    }
    
    // Atajo de teclado para cambiar tema (Alt+T)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 't') {
            toggleTheme();
        }
    });
}

function hasFunctionalConsent() {
    // Primero intentar con cookieHelpers (cookie-helpers.js)
    if (window.cookieHelpers && typeof window.cookieHelpers.hasCookieConsent === 'function') {
        return window.cookieHelpers.hasCookieConsent('functional');
    }
    
    if (window.isCookieCategoryEnabled && typeof window.isCookieCategoryEnabled === 'function') {
        return window.isCookieCategoryEnabled('functional');
    }
    
    return false;
}

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
    
    // Si no hay consentimiento, NO guardar nada
    console.log('No se guardará el tema - consentimiento de cookies funcionales requerido');
    return false;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    
    updateThemeSlider(newTheme);
    
    const hasConsent = hasFunctionalConsent();
    
    const saved = saveThemeWithConsent(newTheme);
    
    let system = 'localStorage directo';
    if (hasConsent) {
        if (window.cookieHelpers && typeof window.cookieHelpers.setStorageWithConsent === 'function') {
            system = 'cookieHelpers';
        } else if (window.isCookieCategoryEnabled && typeof window.isCookieCategoryEnabled === 'function') {
            system = 'cookie-consent';
        }
    }
    
    if (saved) {
        console.log(`Tema cambiado a: ${newTheme} (guardado con ${system})`);
    } else {
        if (hasConsent) {
            console.log(`Tema cambiado a: ${newTheme} (error al guardar)`);
        } else {
            console.log(`Tema cambiado a: ${newTheme} (NO guardado - acepta cookies funcionales para persistencia)`);
        }
    }
}

function updateThemeSlider(theme) {
    const slider = document.querySelector('.theme-slider');
    if (slider) {
        if (theme === 'dark') {
            slider.style.left = 'calc(50% - 2px)';
        } else {
            slider.style.left = '2px';
        }
    }
}

// === FUNCIONALIDAD DEL MENÚ Y DROPDOWN ===
function initNavMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navButtons = document.querySelector('.nav-buttons');

    if (menuToggle && navButtons) {
        menuToggle.addEventListener('click', () => {
            navButtons.classList.toggle('show');
            console.log("Menú móvil toggled");
        });

        document.addEventListener('click', (e) => {
            if (!navButtons.contains(e.target) && !menuToggle.contains(e.target)) {
                navButtons.classList.remove('show');
            }
        });
    }

    const accountBtn = document.getElementById('accountBtn');
    const dropdown = document.querySelector('.dropdown');
    
    if (accountBtn && dropdown) {
        accountBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevenir que el clic llegue al documento
            dropdown.classList.toggle('active');
            console.log("Dropdown de cuenta toggled");
        });
        
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    } else {
        console.warn("Elementos de dropdown no encontrados");
    }
}

// === FUNCIONALIDAD DE CONTENEDORES DE ESQUINA ===
function initCornerContainers() {
    const cornerIndicators = document.querySelectorAll('.corner-indicator');
    const cornerContainers = document.querySelectorAll('.corner-container');
    
    console.log(`Encontrados ${cornerIndicators.length} indicadores y ${cornerContainers.length} contenedores`);

    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    cornerIndicators.forEach(indicator => {
        indicator.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Clic en indicador:', indicator.className);
            
            const position = getPositionClass(indicator);
            
            // Encontrar contenedor correspondiente
            const targetContainer = document.querySelector(`.corner-container.${position}`);
            
            if (targetContainer) {
                console.log('Contenedor objetivo encontrado:', position);
                
                // Si el contenedor no está activo, activarlo
                if (!targetContainer.classList.contains('active')) {
                    cornerContainers.forEach(container => {
                        container.classList.remove('active');
                    });
                    
                    // Solución específica para Firefox
                    if (isFirefox) {
                        // Forzar repintado (hack para Firefox)
                        targetContainer.style.display = 'none';
                        // Forzar un reflow
                        void targetContainer.offsetWidth;
                        targetContainer.style.display = '';
                    }
                    
                    targetContainer.classList.add('active');
                    console.log(`Contenedor activado: ${position}`);
                    
                    disableHoverEffects(cornerIndicators);
                } else {
                    // Si ya está activo, desactivarlo
                    targetContainer.classList.remove('active');
                    
                    // Reactivar eventos de hover
                    if (window.innerWidth > 768) {
                        enableHoverEffects(cornerIndicators, cornerContainers);
                    }
                }
            } else {
                console.warn('Contenedor no encontrado para:', position);
            }
        });
    });
    
    if (window.innerWidth > 768) {
        enableHoverEffects(cornerIndicators, cornerContainers);
    }
    
    addCloseButtons(cornerContainers);
    
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.addEventListener('click', function(e) {
            // Solo si el clic fue directamente en el fondo
            if (e.target === dashboardContainer) {
                cornerContainers.forEach(container => {
                    container.classList.remove('active');
                });
                
                // Reactivar efectos de hover
                if (window.innerWidth > 768) {
                    enableHoverEffects(cornerIndicators, cornerContainers);
                }
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeContainer = document.querySelector('.corner-container.active');
            if (activeContainer) {
                activeContainer.classList.remove('active');
                
                // Reactivar efectos de hover
                if (window.innerWidth > 768) {
                    enableHoverEffects(cornerIndicators, cornerContainers);
                }
            }
        }
    });
}

function enableHoverEffects(indicators, containers) {
    if (window.innerWidth <= 768) return;
    
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    indicators.forEach(indicator => {
        if (indicator._mouseenterHandler) {
            indicator.removeEventListener('mouseenter', indicator._mouseenterHandler);
        }
        if (indicator._mouseleaveHandler) {
            indicator.removeEventListener('mouseleave', indicator._mouseleaveHandler);
        }
        
        indicator._mouseenterHandler = function() {
            const position = getPositionClass(indicator);
            const container = document.querySelector(`.corner-container.${position}`);
            
            if (container && !document.querySelector('.corner-container.active')) {
                // Solución especial para Firefox
                if (isFirefox) {
                    // Forzar repintado
                    container.style.display = 'none';
                    void container.offsetWidth;
                    container.style.display = '';
                }
                
                container.style.opacity = '1';
                container.style.pointerEvents = 'all';
                container.style.transform = 'scale(1)';
            }
        };
        
        indicator._mouseleaveHandler = function(e) {
            const position = getPositionClass(indicator);
            const container = document.querySelector(`.corner-container.${position}`);
            
            if (container && !container.classList.contains('active')) {
                // Solo ocultar si el ratón no entró al contenedor
                if (!container.contains(e.relatedTarget)) {
                    container.style.opacity = '0';
                    container.style.pointerEvents = 'none';
                    container.style.transform = 'scale(0.98)';
                }
            }
        };
        
        indicator.addEventListener('mouseenter', indicator._mouseenterHandler);
        indicator.addEventListener('mouseleave', indicator._mouseleaveHandler);
    });
    
    // También añadir eventos a los contenedores
    containers.forEach(container => {
        if (container._mouseleaveHandler) {
            container.removeEventListener('mouseleave', container._mouseleaveHandler);
        }
        
        container._mouseleaveHandler = function(e) {
            if (!container.classList.contains('active')) {
                const position = getPositionClass(container);
                const indicator = document.querySelector(`.corner-indicator.${position}`);
                
                // Solo ocultar si el ratón no entró al indicador
                if (!indicator || !indicator.contains(e.relatedTarget)) {
                    container.style.opacity = '0';
                    container.style.pointerEvents = 'none';
                    container.style.transform = 'scale(0.98)';
                }
            }
        };
        
        container.addEventListener('mouseleave', container._mouseleaveHandler);
    });
}

function disableHoverEffects(indicators) {
    indicators.forEach(indicator => {
        if (indicator._mouseenterHandler) {
            indicator.removeEventListener('mouseenter', indicator._mouseenterHandler);
        }
        if (indicator._mouseleaveHandler) {
            indicator.removeEventListener('mouseleave', indicator._mouseleaveHandler);
        }
    });
}

function addCloseButtons(containers) {
    containers.forEach(container => {
        // Solo añadir si no existe ya
        if (!container.querySelector('.close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.setAttribute('type', 'button');
            closeBtn.setAttribute('aria-label', 'Cerrar');
            closeBtn.innerHTML = '<i class="bx bx-x"></i>';
            
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                container.classList.remove('active');
                
                // Reactivar efectos de hover solo en desktop
                if (window.innerWidth > 768) {
                    const cornerIndicators = document.querySelectorAll('.corner-indicator');
                    const cornerContainers = document.querySelectorAll('.corner-container');
                    enableHoverEffects(cornerIndicators, cornerContainers);
                }
            });
            
            const cornerContent = container.querySelector('.corner-content');
            if (cornerContent) {
                cornerContent.appendChild(closeBtn);
            }
        }
    });
}

function getPositionClass(element) {
    const classes = element.className.split(' ');
    for (const cls of classes) {
        if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(cls)) {
            return cls;
        }
    }
    return '';
}

window.addEventListener('resize', () => {
    const cornerIndicators = document.querySelectorAll('.corner-indicator');
    const cornerContainers = document.querySelectorAll('.corner-container');
    
    // Reposicionar contenedores según tamaño de pantalla
    cornerContainers.forEach(container => {
        // Si hay algún contenedor activo, asegurarse de que tenga la transformación correcta
        if (container.classList.contains('active')) {
            if (window.innerWidth <= 768) {
                container.style.transform = 'translate(-50%, -50%) scale(1)';
                // Asegurarse de que esté centrado
                container.style.top = '50%';
                container.style.left = '50%';
                container.style.right = 'auto';
                container.style.bottom = 'auto';
            } else {
                container.style.transform = 'scale(1)';
                
                // Posicionar en esquina
                const position = getPositionClass(container);
                if (position.includes('left')) {
                    container.style.left = '40px';
                    container.style.right = 'auto';
                } else {
                    container.style.right = '40px';
                    container.style.left = 'auto';
                }
                
                if (position.includes('top')) {
                    container.style.top = '40px';
                    container.style.bottom = 'auto';
                } else {
                    container.style.bottom = '40px';
                    container.style.top = 'auto';
                }
            }
        }
    });
    
    if (window.innerWidth > 768) {
        // Solo habilitar hover si no hay ningún contenedor activo
        if (!document.querySelector('.corner-container.active')) {
            enableHoverEffects(cornerIndicators, cornerContainers);
        }
    } else {
        disableHoverEffects(cornerIndicators);
    }
});