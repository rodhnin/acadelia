// app.js - ACTUALIZADO CON SISTEMA UNIVERSAL DE MATHJAX

import { initChatUI } from './ui/chatUI.js';

// ✨ IMPORTACIÓN CENTRALIZADA - TODO EL MARKDOWN VIENE DE AQUÍ
import { 
  initMarkdownParser, 
  renderMarkdownComplete, 
  processSpecialElements 
} from './utils/markdownParser.js';

// ✨ NUEVO: SISTEMA UNIVERSAL DE MATHJAX (reemplaza mathPreprocessor)
import { 
  processUniversalMath,
  processCompleteMath,
  reprocessAllMath,
  diagnoseMath,
  isUniversalMathReady
} from './utils/universalMathProcessor.js';

// ✨ SISTEMA UNIFICADO DE MERMAID
import { initMermaidUnified } from './utils/mermaidIntegration.js';

import { setupModalManager } from './ui/modalManager.js';
import { initThemeManager } from './ui/themeManager.js';

// Importaciones para modales
import { initInformationModal } from './modales/informationModal.js';
import { initProfilesModal } from './modales/profilesModal.js';
import { initContentModal } from './modales/contentModal.js';
import { initMemoryModal } from './modales/MemoryModal.js';
import { initTrendsModal } from './modales/TrendsModal.js';
import './utils/formatting-marketing.js';

// Servicio de notificaciones
import notificationService from './utils/notificationService.js';

// Configurar mermaid (configuración básica, el sistema unificado se encarga del resto)
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: '"Poppins", sans-serif'
  });
}

// ✨ FUNCIÓN PRINCIPAL DE INICIALIZACIÓN - RENOVADA CON SISTEMA UNIVERSAL
async function initApp() {
  try {
    console.log('🚀 Iniciando aplicación con Sistema Universal de MathJax...');
    
    // ✨ PASO 1: INICIALIZAR EL SISTEMA CENTRALIZADO DE MARKDOWN PRIMERO
    const markdownInitialized = initMarkdownParser();
    if (markdownInitialized) {
      console.log('✅ Sistema centralizado de markdown inicializado correctamente');
    } else {
      console.warn('⚠️ Advertencia: Sistema de markdown no pudo inicializarse completamente');
    }
    
    // ✨ PASO 2: INICIALIZAR SISTEMA UNIVERSAL DE MATHJAX (reemplaza initMathEnhancements)
    try {
      console.log('🧮 Inicializando Sistema Universal de MathJax...');
      
      // El sistema se auto-inicializa, solo verificamos el estado
      let mathReadyAttempts = 0;
      const waitForMathReady = () => {
        return new Promise((resolve) => {
          const checkReady = () => {
            if (isUniversalMathReady() || mathReadyAttempts > 50) {
              resolve(isUniversalMathReady());
            } else {
              mathReadyAttempts++;
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      };
      
      const mathSystemReady = await waitForMathReady();
      if (mathSystemReady) {
        console.log('✅ Sistema Universal de MathJax inicializado correctamente');
        
        // ✨ EXPONER FUNCIONES UNIVERSALES DE MATEMÁTICAS
        window.processUniversalMath = processUniversalMath;
        window.processCompleteMath = processCompleteMath;
        window.reprocessAllMath = reprocessAllMath;
        window.diagnoseMath = diagnoseMath;
        
        // Mantener compatibilidad con funciones legacy
        window.forceProcessMath = reprocessAllMath;
        window.repairCurrentPage = () => reprocessAllMath(document);
        
      } else {
        console.warn('⚠️ Sistema Universal de MathJax no pudo inicializarse completamente');
        showNotification('Sistema de matemáticas limitado', 'warning');
      }
      
    } catch (mathError) {
      console.error('❌ Error inicializando Sistema Universal de MathJax:', mathError);
      showNotification('Error en sistema de matemáticas', 'error');
    }

    // ✨ PASO 3: EXPONER FUNCIONES CENTRALIZADAS GLOBALMENTE
    window.renderMarkdownModule = renderMarkdownComplete;
    window.renderMarkdown = renderMarkdownComplete;
    window.processSpecialElementsModule = processSpecialElements;
    window.processSpecialElements = processSpecialElements;
    
    console.log('✅ Funciones centralizadas de markdown expuestas globalmente');

    // PASO 4: Inicializar servicio de notificaciones
    try {
      await notificationService.init();
      console.log('✅ Servicio de notificaciones inicializado');
      setupNotificationCallbacks();
    } catch (notificationError) {
      console.warn('⚠️ Error inicializando notificaciones:', notificationError);
    }

    // PASO 5: Configurar gestor de temas
    initThemeManager();
    
    // ✨ PASO 6: INICIALIZAR SISTEMA UNIFICADO DE MERMAID
    try {
      const mermaidManager = await initMermaidUnified();
      if (mermaidManager) {
        console.log('✅ Sistema Unificado de Mermaid inicializado correctamente');
        
        // Exponer funciones para retrocompatibilidad
        window.initializeMermaidZoomPan = () => {
          console.log('📎 Función legacy llamada - usando sistema unificado');
          return mermaidManager.reprocessAll();
        };
        
        window.processMermaidElements = (container) => {
          return mermaidManager.processContainer(container);
        };
        
        window.initializeSingleDiagramZoom = (diagram) => {
          // El sistema unificado maneja el zoom automáticamente
          return Promise.resolve();
        };
        
      } else {
        console.error('❌ Error inicializando Sistema Unificado de Mermaid');
        showNotification('Error inicializando diagramas', 'warning');
      }
    } catch (mermaidError) {
      console.error('❌ Error crítico con Mermaid:', mermaidError);
      showNotification('Diagramas no disponibles', 'warning');
    }
    
    // PASO 7: Inicializar observer para thinking gifs
    if (window.initThinkingObserver) {
      window.initThinkingObserver();
    }
    
    // ✨ PASO 8: INICIALIZAR LA INTERFAZ DEL CHAT
    await initChatUI(document.getElementById('chat-messages'));
    console.log('✅ Chat UI inicializado');
    
    // PASO 9: Inicializar modales
    try {
      initInformationModal();
      console.log('✅ Modal de información inicializada');
    } catch (modalError) {
      console.warn('⚠️ Error inicializando modal de información:', modalError);
    }

    try {
      initProfilesModal();
      console.log('✅ Modal de perfiles inicializada');
    } catch (profilesError) {
      console.warn('⚠️ Error inicializando modal de perfiles:', profilesError);
    }

    try {
      initContentModal();
      console.log('✅ Modal de contenido inicializada');
    } catch (contentError) {
      console.warn('⚠️ Error inicializando modal de contenido:', contentError);
    }

    try {
      initTrendsModal();
      console.log('✅ Modal de trends inicializada');
    } catch (contentError) {
      console.warn('⚠️ Error inicializando modal de trends:', contentError);
    }

    try {
      initMemoryModal();
      console.log('✅ Modal de memoria inicializada');
    } catch (memoryError) {
      console.warn('⚠️ Error inicializando modal de memoria:', memoryError);
    }
    
    // PASO 10: Configurar gestor de modales
    setupModalManager();
    
    // PASO 11: Configurar la funcionalidad del sidebar
    setupSidebar();
    
    // PASO 12: Configurar interacciones del sidebar con notificaciones
    setupSidebarWithNotifications();
    
    // PASO 13: Configurar accesibilidad
    setupAccessibility();
    
    // PASO 14: Configurar eventos globales
    setupGlobalEvents();
    
    // PASO 15: Configurar manejo de cambios de tema
    setupThinkingGifHandling();
    
    // PASO 16: Mostrar notificación de inicio
    setTimeout(() => {
      showNotification('Sistema de Marketing IA listo con MathJax Universal 🚀', 'success', 2000);
    }, 1000);
    
    console.log('✅ Aplicación inicializada correctamente con Sistema Universal de MathJax');
    
    // ✨ PASO 17: VERIFICAR ESTADO DE AMBOS SISTEMAS
    setTimeout(() => {
      // Estado del Sistema Mermaid
      if (window.mermaidManager) {
        const mermaidStatus = window.getMermaidStatus ? window.getMermaidStatus() : 'disponible';
        console.log('📊 Estado del Sistema Mermaid:', mermaidStatus);
      }
      
      // ✨ NUEVO: Estado del Sistema Universal de MathJax
      const mathDiagnosis = diagnoseMath();
      console.log('🧮 Diagnóstico del Sistema Universal de MathJax:', mathDiagnosis);
      
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error inicializando la aplicación:', error);
    showNotification('Error al iniciar la aplicación', 'error');
  }
}

// ✨ FUNCIÓN MEJORADA DE RESET DE MODALES CON AMBOS SISTEMAS UNIFICADOS
function resetModalState(modalType) {
  console.log(`🔄 Reiniciando modal: ${modalType}`);
  
  try {
    switch(modalType) {
      case 'information':
        resetInformationModal();
        break;
      case 'profiles':
        resetProfilesModal();
        break;
      case 'content':
        resetContentModal();
        break;
      case 'memory':
        resetMemoryModal();
        break;
      case 'trends':
        resetTrendsModal();
        break;
      default:
        console.warn(`Tipo de modal no reconocido: ${modalType}`);
    }
  } catch (error) {
    console.warn(`⚠️ Error en reset de modal ${modalType}:`, error);
  }
}

function resetInformationModal() {
  console.log('🔄 Reseteando modal de información...');
  
  const modalBody = document.querySelector('#informationModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
  }
  
  // ✨ MEJORADO: Destruir charts, diagramas Mermaid y matemáticas
  try {
    // Destruir Chart.js instances
    if (window.Chart) {
      const chartIds = [
        'profiles-chart-canvas',
        'content-chart-canvas', 
        'typeDistributionChart',
        'trendsPopularityChart'
      ];
      
      chartIds.forEach(id => {
        const chart = Chart.getChart(id);
        if (chart) {
          chart.destroy();
          console.log(`🧹 Chart destruido: ${id}`);
        }
      });
    }
    
    // ✨ NUEVO: Limpiar diagramas Mermaid usando sistema unificado
    if (window.mermaidManager && modalBody) {
      const mermaidDiagrams = modalBody.querySelectorAll('.mermaid');
      mermaidDiagrams.forEach(diagram => {
        // Limpiar zoom si existe
        if (diagram._zoomPanInstance) {
          try {
            diagram._zoomPanInstance.destroy();
          } catch (e) {
            console.warn('Error destruyendo zoom:', e);
          }
        }
        
        // Limpiar atributos
        diagram.removeAttribute('data-processed');
        diagram.removeAttribute('data-zoom-enabled');
      });
    }
    
    // ✨ NUEVO: Limpiar matemáticas renderizadas
    if (modalBody) {
      const mathElements = modalBody.querySelectorAll('.MathJax, mjx-container, .has-math-content');
      mathElements.forEach(mathEl => {
        try {
          // Limpiar clases y atributos de MathJax
          mathEl.classList.remove('has-math-content');
          mathEl.removeAttribute('data-math-confidence');
          mathEl.removeAttribute('data-math-types');
          
          // Si es un elemento MathJax renderizado, remover estilos inline
          if (mathEl.classList.contains('MathJax') || mathEl.tagName === 'MJX-CONTAINER') {
            mathEl.style.removeProperty('width');
            mathEl.style.removeProperty('max-width');
            mathEl.style.removeProperty('overflow-x');
          }
        } catch (e) {
          console.warn('Error limpiando elemento matemático:', e);
        }
      });
      
      console.log('🧹 Elementos matemáticos limpiados');
    }
    
  } catch (error) {
    console.warn('⚠️ Error limpiando gráficos, diagramas y matemáticas:', error);
  }
  
  console.log('✅ Reset de modal de información completado');
}

function resetProfilesModal() {
  console.log('🔄 Reseteando modal de perfiles...');
  
  if (window.profilesModal && typeof window.profilesModal.reset === 'function') {
    window.profilesModal.reset();
  }
  
  const modalBody = document.querySelector('#profilesModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando perfiles...</p></div>';
  }
  
  try {
    const profileChart = Chart.getChart('personality-chart');
    if (profileChart) {
      profileChart.destroy();
      console.log('🧹 Gráfico de personalidades destruido');
    }
  } catch (error) {
    console.warn('⚠️ Error destruyendo gráfico de perfiles:', error);
  }
  
  console.log('✅ Reset de modal de perfiles completado');
}

function resetContentModal() {
  console.log('🔄 Reseteando modal de contenido...');
  
  if (window.contentModal && typeof window.contentModal.reset === 'function') {
    window.contentModal.reset();
  }
  
  const modalBody = document.querySelector('#contentModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando contenido...</p></div>';
  }
  
  try {
    const contentCharts = ['typeDistributionChart', 'channelDistributionChart'];
    contentCharts.forEach(id => {
      const chart = Chart.getChart(id);
      if (chart) {
        chart.destroy();
        console.log(`🧹 Gráfico de contenido destruido: ${id}`);
      }
    });
  } catch (error) {
    console.warn('⚠️ Error destruyendo gráficos de contenido:', error);
  }
  
  console.log('✅ Reset de modal de contenido completado');
}

function resetMemoryModal() {
  console.log('🔄 Reseteando modal de memoria...');
  
  if (window.memoryModal && typeof window.memoryModal.reset === 'function') {
    window.memoryModal.reset();
  }
  
  const modalBody = document.querySelector('#memoryModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando memoria...</p></div>';
  }
  
  console.log('✅ Reset de modal de memoria completado');
}

function resetTrendsModal() {
  console.log('🔄 Reseteando modal de tendencias...');
  
  if (window.trendsModal && typeof window.trendsModal.reset === 'function') {
    window.trendsModal.reset();
  }
  
  const modalBody = document.querySelector('#trendsModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando tendencias...</p></div>';
  }
  
  try {
    const trendsCharts = ['trendsPopularityChart', 'trendsChannelChart'];
    trendsCharts.forEach(id => {
      const chart = Chart.getChart(id);
      if (chart) {
        chart.destroy();
        console.log(`🧹 Gráfico de tendencias destruido: ${id}`);
      }
    });
  } catch (error) {
    console.warn('⚠️ Error destruyendo gráficos de tendencias:', error);
  }
  
  console.log('✅ Reset de modal de tendencias completado');
}

// [Las funciones setupNotificationCallbacks y demás permanecen igual...]

function setupNotificationCallbacks() {
  notificationService.onNewNotification((notifications) => {
    console.log('📱 [TITLE] Nueva notificación, actualizando título:', notifications.total);
    updatePageTitle(notifications.total);
    playNotificationSound();
  });
  
  notificationService.onClear(() => {
    console.log('🧹 [TITLE] Limpieza completa, título a 0');
    updatePageTitle(0);
  });
  
  notificationService.onUpdate((notifications) => {
    console.log('🎨 [TITLE] Actualización UI, título a:', notifications.total);
    updatePageTitle(notifications.total);
    updateCustomBadges(notifications);
  });
  
  notificationService.onSectionCleared((section, notifications) => {
    console.log(`🧹 [TITLE] Sección ${section} limpiada, título a:`, notifications.total);
    updatePageTitle(notifications.total);
  });
  
  // ✨ SOLUCIÓN: Verificar notificaciones existentes DESPUÉS de configurar callbacks
  setTimeout(() => {
    const currentNotifications = notificationService.notifications;
    if (currentNotifications && currentNotifications.total > 0) {
      console.log('🔄 [INIT] Notificaciones existentes detectadas al inicializar:', currentNotifications.total);
      updatePageTitle(currentNotifications.total);
    } else {
      console.log('🔄 [INIT] Sin notificaciones al inicializar, título limpio');
      updatePageTitle(0);
    }
  }, 100); // Pequeño delay para asegurar que todo esté inicializado
}

function setupSidebarWithNotifications() {
  const sidebar = document.querySelector('.sidebar');
  
  if (!sidebar) {
    console.warn('Sidebar no encontrado para configurar notificaciones');
    return;
  }
  
  console.log('✅ Sidebar configurado con sistema de notificaciones');
  
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-section]');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      console.log(`📂 Clic en sección ${section}`);
    });
  });
  
  createClearNotificationsButtonWhenExpanded();
}

function createClearNotificationsButtonWhenExpanded() {
  const sidebar = document.querySelector('.sidebar');
  const sidebarFooter = sidebar?.querySelector('.sidebar-footer');
  
  if (!sidebarFooter) return;
  
  if (document.getElementById('acadelia-notif-clear-btn')) return;
  
  const clearButton = document.createElement('div');
  clearButton.id = 'acadelia-notif-clear-btn';
  clearButton.className = 'sidebar-item acadelia-notif-clear-item acadelia-notif-hidden';
  clearButton.innerHTML = `
    <i class='bx bx-check-circle'></i>
    <span class="item-text">Marcar como leídas</span>
    <span class="acadelia-notif-clear-count-badge">0</span>
  `;
  
  const firstFooterItem = sidebarFooter.querySelector('.sidebar-item');
  if (firstFooterItem) {
    sidebarFooter.insertBefore(clearButton, firstFooterItem);
  } else {
    sidebarFooter.appendChild(clearButton);
  }
  
  clearButton.addEventListener('click', async () => {
    console.log('🧹 Limpiando todas las notificaciones');
    
    const response = await notificationService.clearAll();
    if (response.success) {
      showNotification('Notificaciones marcadas como leídas', 'success', 2000);
    } else {
      showNotification('Error limpiando notificaciones', 'error', 3000);
    }
  });
  
  updateClearButtonVisibilityWhenExpanded();
  
  notificationService.onUpdate(() => {
    updateClearButtonVisibilityWhenExpanded();
  });
  
  notificationService.onClear(() => {
    updateClearButtonVisibilityWhenExpanded();
  });
  
  const observer = new MutationObserver(() => {
    updateClearButtonVisibilityWhenExpanded();
  });
  
  observer.observe(sidebar, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  sidebar.addEventListener('mouseenter', () => {
    setTimeout(() => updateClearButtonVisibilityWhenExpanded(), 100);
  });
  
  sidebar.addEventListener('mouseleave', () => {
    setTimeout(() => updateClearButtonVisibilityWhenExpanded(), 100);
  });
}

function updateClearButtonVisibilityWhenExpanded() {
  const clearButton = document.getElementById('acadelia-notif-clear-btn');
  const countBadge = clearButton?.querySelector('.acadelia-notif-clear-count-badge');
  const sidebar = document.querySelector('.sidebar');
  
  if (!clearButton || !countBadge || !sidebar) return;
  
  const totalNotifications = notificationService.notifications.total;
  const isExpanded = sidebar.classList.contains('pinned') || 
                     sidebar.matches(':hover') || 
                     sidebar.classList.contains('mobile-open');
  
  if (totalNotifications > 0 && isExpanded) {
    clearButton.classList.remove('acadelia-notif-hidden');
    clearButton.classList.add('acadelia-notif-show');
    countBadge.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
    countBadge.style.display = 'inline-flex';
  } else {
    clearButton.classList.add('acadelia-notif-hidden');
    clearButton.classList.remove('acadelia-notif-show');
    countBadge.style.display = 'none';
  }
}

function updatePageTitle(notificationCount) {
  const baseTitle = 'Marketing IA - Acadelia';
  
  // Validar que el count sea un número válido
  const count = typeof notificationCount === 'number' && notificationCount >= 0 ? 
    notificationCount : 0;
  
  if (count > 0) {
    document.title = `(${count}) ${baseTitle}`;
    console.log(`📄 Título actualizado: ${count} notificaciones`);
  } else {
    document.title = baseTitle;
    console.log('📄 Título limpiado: sin notificaciones');
  }
}

function playNotificationSound() {
  if (document.visibilityState === 'visible') {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación:', error);
    }
  }
}

function updateCustomBadges(notifications) {
  console.log('🏷️ Actualizando badges personalizados');
}

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

function setupSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const pinButton = document.querySelector('.pin-button');
  const unpinButton = document.querySelector('.unpin-button');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const mobileOverlay = document.getElementById('mobile-sidebar-overlay');
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-section]');
  
  if (!sidebar) {
    console.error('Sidebar no encontrado en el DOM');
    return;
  }
  
  const isPinned = localStorage.getItem('sidebar-pinned') === 'true';
  if (isPinned) {
    sidebar.classList.add('pinned');
  }
  
  if (pinButton) {
    pinButton.addEventListener('click', () => {
      sidebar.classList.add('pinned');
      localStorage.setItem('sidebar-pinned', 'true');
      showNotification('Sidebar fijado', 'info', 1500);
    });
  }
  
  if (unpinButton) {
    unpinButton.addEventListener('click', () => {
      sidebar.classList.remove('pinned');
      localStorage.setItem('sidebar-pinned', 'false');
      showNotification('Sidebar desfijado', 'info', 1500);
    });
  }
  
  if (mobileToggle && mobileOverlay) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      mobileOverlay.classList.add('active');
    });
    
    mobileOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    });
  }
  
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      handleSidebarItemClick(item, sidebar, mobileOverlay);
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSidebarItemClick(item, sidebar, mobileOverlay);
      }
    });
  });

  const exportChatBtn = document.getElementById('export-chat-btn');
  if (exportChatBtn) {
    exportChatBtn.addEventListener('click', () => {
      if (window.exportChat) {
        window.exportChat();
      } else {
        showNotification('Función de exportación no disponible', 'warning');
      }
    });
  }

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.removeEventListener('click', handleThemeToggle);
    
    function handleThemeToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.toggleTheme) {
        window.toggleTheme();
      } else {
        console.error('toggleTheme function not available');
      }
    }
    
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    
    const themeSwitch = themeToggleBtn.querySelector('.theme-toggle-switch');
    if (themeSwitch) {
      themeSwitch.addEventListener('click', handleThemeToggle);
    }
  }

  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
}

function handleSidebarItemClick(item, sidebar, mobileOverlay) {
  const section = item.getAttribute('data-section');
  const modalId = section + 'Modal';
  const modal = document.getElementById(modalId);
  
  if (modal) {
    console.log(`🚀 Abriendo modal de ${section} con reset...`);
    
    resetModalState(section);
    
    setTimeout(() => {
      if (window.openModal) {
        window.openModal(modal);
      } else {
        modal.classList.add('active');
        modal.dispatchEvent(new CustomEvent('modal:open'));
      }
    }, 50);
    
    if (window.innerWidth <= 768 && sidebar && mobileOverlay) {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  } else {
    console.warn(`Modal no encontrado: ${modalId}`);
  }
}

function setupAccessibility() {
  const interactiveElements = document.querySelectorAll('.sidebar-item, .theme-toggle, button');
  
  interactiveElements.forEach(element => {
    if (!element.hasAttribute('tabindex') && !element.hasAttribute('role')) {
      element.setAttribute('tabindex', '0');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal && window.closeModal) {
        window.closeModal(activeModal);
        return;
      }
      
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar.mobile-open');
        const overlay = document.querySelector('.mobile-sidebar-overlay.active');
        if (sidebar && overlay) {
          sidebar.classList.remove('mobile-open');
          overlay.classList.remove('active');
          return;
        }
      }
    }
  });
}

// ✨ EVENTOS GLOBALES MEJORADOS CON DIAGNÓSTICO DE SISTEMAS
function setupGlobalEvents() {
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar.mobile-open');
        const overlay = document.querySelector('.mobile-sidebar-overlay.active');
        if (sidebar && overlay) {
          sidebar.classList.remove('mobile-open');
          overlay.classList.remove('active');
        }
      }
      
      if (notificationService) {
        notificationService.updateIndicatorVisibility();
      }
    }, 250);
  });
  
  window.addEventListener('focus', async () => {
    console.log('👁️ Página enfocada, verificando notificaciones');
    try {
      await notificationService.loadNotifications();
    } catch (error) {
      console.warn('Error recargando notificaciones al enfocar:', error);
    }
  });
  
  window.addEventListener('offline', () => {
    showNotification('Conexión perdida. Algunas funciones pueden no estar disponibles.', 'warning', 5000);
  });
  
  window.addEventListener('online', () => {
    showNotification('Conexión restaurada', 'success', 2000);
  });
  
  window.addEventListener('error', (e) => {
    console.error('Error no capturado:', e.error);
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      showNotification('Error detectado (ver consola)', 'error', 3000);
    }
  });
  
  document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('ai-profile') || 
        e.target.classList.contains('welcome-gif')) {
      e.preventDefault();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      if (window.toggleTheme) {
        window.toggleTheme();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const informationModal = document.getElementById('informationModal');
      if (informationModal) {
        if (window.openModal) {
          window.openModal(informationModal);
        } else {
          informationModal.classList.add('active');
          informationModal.dispatchEvent(new CustomEvent('modal:open'));
        }
        
        if (window.showNotification) {
          window.showNotification('Dashboard abierto con Ctrl+D', 'info', 1500);
        }
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      if (notificationService.hasNotifications()) {
        notificationService.clearAll();
        showNotification('Notificaciones limpiadas con atajo de teclado', 'info', 2000);
      }
    }
    
    // ✨ NUEVO: Atajo para diagnóstico de sistemas
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      console.log('🔍 DIAGNÓSTICO DE SISTEMAS:');
      
      // Diagnóstico MathJax Universal
      const mathDiagnosis = diagnoseMath();
      console.table(mathDiagnosis);
      
      // Diagnóstico Mermaid
      if (window.getMermaidStatus) {
        const mermaidStatus = window.getMermaidStatus();
        console.log('📊 Estado Mermaid:', mermaidStatus);
      }
      
      showNotification('Diagnóstico de sistemas en consola', 'info', 2000);
    }
  });
}

function ensureThemeConsistency() {
  const savedTheme = localStorage.getItem('theme');
  const bodyTheme = document.body.getAttribute('data-theme');
  
  if (savedTheme && savedTheme !== bodyTheme) {
    document.body.setAttribute('data-theme', savedTheme);
    
    if (window.updateThinkingGifs) {
      setTimeout(() => {
        window.updateThinkingGifs(savedTheme);
      }, 100);
    }
  }
}

// [Sistema de notificaciones permanece igual...]

function showNotification(message, type = 'info', duration = 3000) {
  if (window.lastNotificationMessage === message && 
      Date.now() - (window.lastNotificationTime || 0) < 1000) {
    return null;
  }
  
  window.lastNotificationMessage = message;
  window.lastNotificationTime = Date.now();
  
  if (window.showAlert && typeof window.showAlert === 'function') {
    return window.showAlert(message, type, duration);
  }
  
  if (window.notifyService && typeof window.notifyService.add === 'function') {
    return window.notifyService.add(message, type, duration);
  }
  
  console.warn('⚠️ notification-service.js no disponible, usando fallback para:', message);
  
  const alertTypes = {
    success: { icon: '✅', class: 'notification-success', bgColor: '#d4edda', textColor: '#155724', borderColor: '#c3e6cb' },
    error: { icon: '❌', class: 'notification-error', bgColor: '#f8d7da', textColor: '#721c24', borderColor: '#f5c6cb' },
    warning: { icon: '⚠️', class: 'notification-warning', bgColor: '#fff3cd', textColor: '#856404', borderColor: '#faeeba' },
    info: { icon: 'ℹ️', class: 'notification-info', bgColor: '#d1ecf1', textColor: '#0c5460', borderColor: '#bee5eb' },
    loading: { icon: '⏳', class: 'notification-loading', bgColor: '#e2e3e5', textColor: '#383d41', borderColor: '#d6d8db' }
  };

  const alertData = alertTypes[type] || alertTypes.info;
  const notificationId = `notification-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const notification = document.createElement('div');
  notification.id = notificationId;
  notification.className = `notification-fallback ${alertData.class}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    min-width: 250px;
    padding: 16px 20px;
    background-color: ${alertData.bgColor};
    color: ${alertData.textColor};
    border: 1px solid ${alertData.borderColor};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    z-index: 9999;
    transform: translateX(100%);
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    cursor: pointer;
    word-wrap: break-word;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  notification.innerHTML = `
    <span class="notification-icon" style="font-size: 16px; flex-shrink: 0;">${alertData.icon}</span>
    <span class="notification-text" style="flex: 1;">${message}</span>
    ${type !== 'loading' ? '<span class="notification-close" style="font-size: 18px; opacity: 0.7; margin-left: 8px; cursor: pointer;">×</span>' : ''}
  `;
  
  document.body.appendChild(notification);
  
  const existingNotifications = document.querySelectorAll('.notification-fallback');
  if (existingNotifications.length > 1) {
    const index = Array.from(existingNotifications).indexOf(notification);
    notification.style.top = `${20 + (index * 80)}px`;
  }
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);
  
  const closeBtn = notification.querySelector('.notification-close');
  const closeNotification = () => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          try {
            notification.parentNode.removeChild(notification);
            repositionNotifications();
          } catch (e) {
            console.warn('Error eliminando notificación fallback:', e);
          }
        }
      }, 300);
    }
  };
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNotification();
    });
  }
  
  notification.addEventListener('click', closeNotification);
  
  if (type !== 'loading' && duration > 0) {
    setTimeout(closeNotification, duration);
  }
  
  function repositionNotifications() {
    const allNotifications = document.querySelectorAll('.notification-fallback');
    allNotifications.forEach((notif, index) => {
      notif.style.top = `${20 + (index * 80)}px`;
    });
  }
  
  return notificationId;
}

function showLoadingNotification(message = 'Cargando...') {
  return showNotification(message, 'loading', 0);
}

function updateNotification(id, message, type = null, duration = null) {
  if (window.notifyService && typeof window.notifyService.update === 'function') {
    return window.notifyService.update(id, message, type, duration);
  }
  
  const notification = document.getElementById(id);
  if (notification && notification.classList.contains('notification-fallback')) {
    const textSpan = notification.querySelector('.notification-text');
    if (textSpan) {
      textSpan.textContent = message;
    }
    
    if (type && type !== 'loading' && duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.click();
        }
      }, duration);
    }
  }
}

function removeNotification(id) {
  if (window.notifyService && typeof window.notifyService.remove === 'function') {
    return window.notifyService.remove(id);
  }
  
  const notification = document.getElementById(id);
  if (notification && notification.classList.contains('notification-fallback')) {
    notification.click();
  }
}

function checkNotificationServiceAvailability() {
  const isAvailable = !!(window.showAlert || window.notifyService);
  
  if (isAvailable) {
    console.log('✅ notification-service.js disponible y funcionando');
  } else {
    console.warn('⚠️ notification-service.js no disponible, usando sistema fallback');
  }
  
  return isAvailable;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureThemeConsistency();
    
    setTimeout(() => {
      checkNotificationServiceAvailability();
    }, 100);
    
    initApp();
  });
} else {
  ensureThemeConsistency();
  
  setTimeout(() => {
    checkNotificationServiceAvailability();
  }, 100);
  
  initApp();
}

// Exponer funciones globalmente
window.resetModalState = resetModalState;
window.showNotification = showNotification;
window.showLoadingNotification = showLoadingNotification;
window.updateNotification = updateNotification;
window.removeNotification = removeNotification;
window.setupThinkingGifHandling = setupThinkingGifHandling;
window.announceThemeChange = announceThemeChange;

// ✨ FUNCIONES CENTRALIZADAS Y UNIVERSALES TAMBIÉN EXPUESTAS
window.renderMarkdown = renderMarkdownComplete;
window.processSpecialElements = processSpecialElements;

// ✨ NUEVO: FUNCIONES DEL SISTEMA UNIVERSAL DE MATHJAX
window.processUniversalMath = processUniversalMath;
window.processCompleteMath = processCompleteMath;
window.reprocessAllMath = reprocessAllMath;
window.diagnoseMath = diagnoseMath;

export { 
  showNotification,
  showLoadingNotification,
  updateNotification,
  removeNotification,
  setupThinkingGifHandling,
  announceThemeChange,
  ensureThemeConsistency,
  resetModalState
};