/**
 * app.js pdf - Punto de entrada principal de la aplicación
 */

import { initializeElements, setupUIEventListeners, setupScrollBehavior } from '../ui/ui-manager-pdf.js';
import { setupThemeListeners, initializeTheme } from '../ui/theme-pdf.js';
import { setupSidebarListeners, initializeSidebarState } from '../ui/sidebar-pdf.js';
import { setupModalListeners } from '../ui/modals-pdf.js';
import { checkAuthentication } from '../api/auth-pdf.js';
import { loadChatHistory } from '../api/chat-pdf.js';
import { initChatController } from './chat-controller-pdf.js';
import { renderChatHistory } from '../ui/sidebar-pdf.js';
import { initializeMessageRenderers } from '../ui/message-renderer-pdf.js';
import { initPreviewPanel } from '../components/preview-panel-pdf.js';
import { setManagedTimeout } from '../../../shared/dom-helpers.js';
import { initFileAttachments } from '../utils/file-attachments-pdf.js';
import { setupHeaderEventListeners } from '../ui/header-manager-pdf.js';
import { loadProblematicChats } from '../utils/chat-error-handler-pdf.js';
import { initResponseInteraction } from '../utils/response-interaction-pdf.js';
import searchModalModule from '../utils/searchat-pdf.js';

import scrollManager from '../../../shared/scroll-manager.js';
// NUEVO: Importar sistema Mermaid
import { initMermaidSystem } from '../../../shared/mermaid-utils.js';
import { initializePDF } from '../pdf-init.js';
import acadelEmojiIntegration, { enhanceAcadelMessageRenderer } from '../../../shared/acadel-emoji-integration.js';

/**
 * Inicializa el sistema de scroll
 */
function initScrollSystem() {
  console.log('🦫 Acadel: Configurando navegación inteligente por documentos...');
  
  scrollManager.init({
    behavior: {
      useAutoInsteadOfSmooth: true,
      forceReflowBeforeScroll: true,
      useMultipleAttempts: true,
      useAggressiveScroll: true,
      debugMode: false,
      retryCount: 5,
      retryDelay: 100,
      waitForImagesLoad: true,
      waitForAnimationsComplete: true,
      monitorDOMChanges: true,
      maintainScrollPosition: true
    }
  });

  if (typeof scrollManager.setupBrowserZoomHandler === 'function') {
    scrollManager.setupBrowserZoomHandler();
  }
  
  // Observer de mensajes para scroll inteligente
  try {
    const chatMessagesContainer = document.querySelector('.chat-messages');
    if (chatMessagesContainer) {
      const messagesObserver = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
          if (scrollManager && typeof scrollManager.adjustScrollAfterDOMChange === 'function') {
            scrollManager.adjustScrollAfterDOMChange();
          } else {
            requestAnimationFrame(() => {
              void chatMessagesContainer.offsetHeight;
              chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            });
          }
        }
      });
      
      messagesObserver.observe(chatMessagesContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      
      window._messagesObserver = messagesObserver;
    }
  } catch (e) {
    console.warn('🦫 Acadel: Pequeño problema con el índice, pero seguimos organizando...', e);
  }

  setupScrollBehavior();
  console.log('🦫 Acadel: ¡Navegación por documentos configurada y optimizada!');
}


async function initApp() {
  console.log("📋 Profesor Acadel abriendo su biblioteca digital:");
  console.log("📚 Preparando archivo personal de documentos PDF");
  console.log("🗂️ Configurando sistema de análisis textual avanzado");
  
  const mermaidPromise = initMermaidSystem();

    // ⭐ APLICAR PIZARRÓN RESPONSIVO (sin skeleton que bloquee)
  import('../ui/ui-manager-pdf.js').then(uiModule => {
    if (typeof uiModule.applyInitialLoader === 'function') {
      uiModule.applyInitialLoader(); // Solo pizarrón, contenido visible detrás
    }
  });
  
console.log('🔍 DEBUG: Inicializando MathJax desde app.js');
const mathJaxPromise = import('../../../matematico/math/mathjax-config.js').then(module => {
  console.log('✅ DEBUG: Módulo MathJax cargado en app.js:', module);
  console.log('✅ DEBUG: Funciones disponibles en app.js:', Object.keys(module));
  
  if (typeof module.initMathJax === 'function') {
    return module.initMathJax().then(() => {
      console.log('🎯 DEBUG: MathJax inicializado exitosamente en app.js');
      // Hacer las funciones disponibles globalmente
      window.renderMath = module.renderMath;
      window.containsMath = module.containsMath;
      window.ensureMathJaxInitialized = module.ensureMathJaxInitialized;

      
      console.log('🌐 DEBUG: Funciones MathJax disponibles globalmente');
    });

    
  } else {
    console.error('❌ DEBUG: función initMathJax no encontrada en app.js. Funciones disponibles:', Object.keys(module));
  }
}).catch(error => {
  console.error('❌ DEBUG: Error inicializando MathJax en app.js desde ruta corregida:', error);
});
setTimeout(() => {
  console.log('🔍 DEBUG: Verificación post-inicialización MathJax:');
  console.log('  - window.MathJax exists:', !!window.MathJax);
  console.log('  - window.MathJax.typesetPromise:', !!(window.MathJax && window.MathJax.typesetPromise));
  console.log('  - mathJaxReady desde ventana:', window.renderMath ? 'Funciones disponibles' : 'Funciones NO disponibles');
}, 2000);


  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2];
  
  if (!chatId || chatId === 'pdf') {
    document.documentElement.classList.add('welcome-pending');
    document.body.classList.add('initializing');

    const fixedSpace = document.querySelector('.fixed-space');
    if (fixedSpace) {
      fixedSpace.style.opacity = '0';
      fixedSpace.style.visibility = 'hidden';
      fixedSpace.style.pointerEvents = 'none';
    }
  }

  try {
    // FASE 1: Organizando estantes digitales (15%)
    console.log('🦫 Acadel: Organizando mis estantes digitales...');
    await initializeMessageRenderers();
    updateBibliotecaProgress(15, '📚 Estantes digitales organizados');

    initializeElements();
    
    import('../ui/sidebar-pdf.js').then(module => {
      if (typeof module.preventInitialAnimations === 'function') {
        module.preventInitialAnimations();
      }
      if (typeof module.addSidebarPinStyles === 'function') {
        module.addSidebarPinStyles();
      }
    });

    // FASE 2: Preparando sistema de catalogación (30%)
    console.log('🦫 Acadel: Limpiando el polvo de mis documentos...');
    updateBibliotecaProgress(30, '🗂️ Sistema de catalogación listo');
    
    initializeSidebarState();
    initializeTheme();
    setupHeaderEventListeners();
    setupUIEventListeners();
    setupThemeListeners();
    setupSidebarListeners();
    setupModalListeners();

    // FASE 3: Configurando navegación de archivo (45%)
    console.log('🦫 Acadel: Configurando mi sistema de navegación...');
    initScrollSystem();
    await new Promise(resolve => setTimeout(resolve, 300));
    updateBibliotecaProgress(45, '🔍 Navegación de archivo configurada');

    // FASE 4: Herramientas de análisis PDF (60%)
    console.log('🦫 Acadel: Preparando lectores de PDF cuánticos...');
    initPreviewPanel();
    initFileAttachments();

    console.log('🎨 Acadel: Configurando sistema emoji académico...');
    try {
      await acadelEmojiIntegration.init();
      enhanceAcadelMessageRenderer();
      console.log('✅ Sistema Acadel emoji listo - Tu 🦫 académico se verá perfecto');
    } catch (error) {
      console.warn('⚠️ Sistema Acadel emoji no pudo inicializarse:', error);
    }
    
    initializePDF()
    .then(success => {
      console.log('🦫 Acadel: Sistema PDF', success ? 'operativo' : 'con ajustes menores');
      updateBibliotecaProgress(55, '📄 Lectores PDF operativos');
    })
    .catch(error => {
      console.warn('🦫 Acadel: Pequeño ajuste en el sistema PDF:', error);
    });
    
    window.renderMermaidDiagram = async function(containerId, code) {
      const { initializeMermaidDiagram } = await import('../../../shared/mermaid-utils.js');
      return initializeMermaidDiagram(containerId, code);
    };
    
    window.showMermaidPreview = async function(button) {
      const code = button.getAttribute('data-code');
      const diagramId = button.getAttribute('data-diagram-id');
      const title = document.querySelector(`#${diagramId}`)?.getAttribute('data-title') || 'Diagrama del Documento';
      
      const { showPreviewPanel } = await import('../components/preview-panel-pdf.js');
      showPreviewPanel({ code: code, title: title }, 'mermaid');
    };

    import('../components/preview-panel-pdf.js').then(module => {
      window.showPreviewPanel = module.showPreviewPanel;
    });
    
    updateBibliotecaProgress(60, '🔧 Herramientas de análisis listas');

    // FASE 5: Cargando archivo histórico (75%)
    console.log('🦫 Acadel: Cargando mi archivo histórico de documentos...');
    const userData = await checkAuthentication();
    const chats = await loadChatHistory();
    renderChatHistory(chats);
    updateBibliotecaProgress(75, '📚 Archivo histórico cargado');

    // FASE 6: Motores de análisis textual (90%)
    console.log('🦫 Acadel: Iniciando motores de análisis textual...');
    loadProblematicChats();
    initChatController();
    initResponseInteraction();
    await searchModalModule.initSearchModal();
    window.searchModalInitialized = true;

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout Mermaid')), 3000)
      );
      await Promise.race([mermaidPromise, timeoutPromise]);
      console.log("🦫 Acadel: Diagramas de documentos listos");
    } catch (error) {
      console.warn("🦫 Acadel: Los diagramas tardarán un poco más...", error);
    }

    updateBibliotecaProgress(90, '🧠 Motores de análisis operativos');

    // FASE 7: Finalización de la biblioteca (95%)
    console.log('🦫 Acadel: Último repaso de mi biblioteca digital...');
    updateBibliotecaProgress(95, '🎯 Biblioteca completamente organizada');

    // FASE 8: ¡Biblioteca abierta al público! (100%)
    console.log('🦫 Acadel: ¡Biblioteca digital lista para analizar PDFs!');

    // Procesamiento final de Emoji
    if (window.acadelEmojiIntegration?.initialized) {
      acadelEmojiIntegration.forceProcessAll();
      console.log('🎨 Sistema Acadel emoji procesado - ¡Tu 🦫 académico listo!');
    }
    
    setManagedTimeout(() => {
      window.appInitialized = true;

      // Scroll optimizado multi-intento
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void document.documentElement.offsetHeight;
          
          scrollManager.scrollToBottom({
            priority: 'high',
            reason: 'biblioteca-acadel-ready',
            useAggressiveScroll: true,
            retryCount: 5,
            retryDelay: 100
          });
          
          setTimeout(() => {
            scrollManager.scrollToBottom({
              priority: 'high',
              reason: 'acadel-biblioteca-final-check',
              useAggressiveScroll: true
            });
          }, 300);
        });
      });

      // ⭐ Progreso final y cierre de la biblioteca
      updateBibliotecaProgress(100, '🎉 ¡Catálogo bibliográfico completado!');
      
      setManagedTimeout(() => {
        import('../ui/ui-manager-pdf.js').then(uiModule => {
          if (typeof uiModule.removeAcadelBibliotecaLoader === 'function') {
            uiModule.removeAcadelBibliotecaLoader();
          } else if (typeof uiModule.removeInitialLoader === 'function') {
            uiModule.removeInitialLoader();
          }
          
                // ⭐ Bienvenida especializada del Bibliotecario Acadel
                window.acadelConfetti(
                  "🏛️ ¡Biblioteca digital abierta! 🦫", 
                  "El Profesor Acadel ha organizado su archivo personal. ¡Desde documentos simples hasta textos académicos complejos, aquí analizamos todo con sabiduría de capibara bibliotecario!"
                );

          setManagedTimeout(() => {
            document.body.classList.remove('initializing');
            console.log('🦫 Profesor Acadel: ¡Biblioteca digital completamente operativa y catalogada!');
          }, 500);
        });
      }, 1200);
      
    }, 900); // Pausa para ver el progreso completo

  } catch (error) {
    console.error('🦫 Acadel: ¡Error en la biblioteca digital!', error);
    
    // Mensaje de error con personalidad de bibliotecario
    window.acadelError(
      "🦫 ¡Oops! Libros desordenados en la biblioteca", 
      "Hasta los capibara más organizados a veces derribamos una estantería. El Profesor Acadel sugiere recargar para reorganizar toda la biblioteca desde cero."
    );

    import('../ui/ui-manager-pdf.js').then(uiModule => {
      if (typeof uiModule.removeAcadelBibliotecaLoader === 'function') {
        uiModule.removeAcadelBibliotecaLoader(true);
      } else if (typeof uiModule.removeInitialLoader === 'function') {
        uiModule.removeInitialLoader(true);
      }
    });

    document.body.classList.remove('initializing');
  }
}

/**
 * Función auxiliar para actualizar progreso de la biblioteca
 * @param {number} progress - Progreso del 0 al 100
 * @param {string} mensaje - Mensaje del Bibliotecario Acadel
 */
function updateBibliotecaProgress(progress, mensaje = '') {
  import('../ui/ui-manager-pdf.js').then(uiModule => {
    if (typeof uiModule.updateAcadelBibliotecaProgress === 'function') {
      uiModule.updateAcadelBibliotecaProgress(progress);
    }
  });
  
  if (mensaje) {
    console.log(`🦫 Bibliotecario Acadel [${progress}%]: ${mensaje}`);
  }
}

// ⭐ Funciones globales para uso en toda la aplicación PDF
window.updateBibliotecaProgress = updateBibliotecaProgress;

// Inicialización al cargar DOM
document.addEventListener('DOMContentLoaded', initApp);

export default {
  initApp,
  updateBibliotecaProgress,
  initScrollSystem,
  acadelEmojiIntegration  // ← AGREGAR ESTA LÍNEA
};