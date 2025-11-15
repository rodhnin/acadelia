/**
 * app.js - Punto de entrada principal para la aplicación de chat matemático
 * OPTIMIZADO: Secuencia de inicialización mejorada sin dependencia de math-panel
 */
import { initializeElements, setupUIEventListeners, setupScrollBehavior } from '../ui/ui-manager-agente.js';
import { setupThemeListeners, initializeTheme } from '../ui/theme-agente.js';
import { setupSidebarListeners, initializeSidebarState } from '../ui/sidebar-agente.js';
import { setupModalListeners } from '../ui/modals-agente.js';
import { checkAuthentication } from '../api/auth-agente.js';
import { loadChatHistory } from '../api/chat-agente.js';
import { initChatController } from './chat-controller-agente.js';
import { setupMathObserver, processAllChatMessages } from '../math/math-renderer-agente.js';
import { renderChatHistory } from '../ui/sidebar-agente.js';
import { initializeMessageRenderers } from '../ui/message-renderer-agente.js';
import { initPreviewPanel } from '../components/preview-panel-agente.js';
import { initTranscriptionSystem, checkForOngoingProcessing } from '../utils/transcription-controller.js';
import { initFileAttachments } from '../utils/file-attachments-agente.js';
import { setupHeaderEventListeners } from '../ui/header-manager-agente.js';
import { loadProblematicChats } from '../utils/chat-error-handler-agente.js';
import { initMathSystem } from '../math/math-integration-agente.js';
import { initResponseInteraction } from '../utils/response-interaction-agente.js';
import { initSearchModal } from '../utils/searchat-agente.js';
import { setManagedTimeout } from '../../../shared/dom-helpers.js';
import scrollManager from '../../../shared/scroll-manager.js';
import { getState } from './state-agente.js';
// NUEVO: Importar sistema Mermaid
import { initMermaidSystem } from '../../../shared/mermaid-utils.js';
import acadelEmojiIntegration, { enhanceAcadelMessageRenderer } from '../../../shared/acadel-emoji-integration.js';

/**
 * Inicializa el sistema de scroll
 */
function initScrollSystem() {
  console.log('🤖 Acadel: Configurando sistema de navegación inteligente...');
  
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
    console.warn('🤖 Acadel: Observer en modo de compatibilidad:', e);
  }

  setupScrollBehavior();
  console.log('🤖 Acadel: ¡Sistema de navegación inteligente activado!');
}


/**
 * Inicializa la aplicación de chat matemático con secuencia optimizada
 */
async function initApp() {
  console.log("🤖 Agente Acadel iniciando terminal tecnológico:");
  console.log("- Sistema de transcripción: PREPARANDO");
  console.log("- Motor de búsqueda: INDEXANDO");
  console.log("- IA académica: CALIBRANDO");
  
  const mermaidPromise = initMermaidSystem();
  
  // ⭐ APLICAR TERMINAL TECNOLÓGICO (sin skeleton que bloquee)
  import('../ui/ui-manager-agente.js').then(uiModule => {
    if (typeof uiModule.applyInitialLoader === 'function') {
      uiModule.applyInitialLoader(); // Solo terminal, contenido visible detrás
    }
  });

  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2];

  if (!chatId || chatId === 'agente') {
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
    // FASE 1: Núcleo de IA (15%)
    console.log('🤖 Acadel: Inicializando núcleo de inteligencia artificial...');
    await initializeMessageRenderers();
    updateAcadelTechProgress(15, '🧠 Núcleo de IA cargado');

    const currentChatId = getState('currentChatId');
    if (currentChatId) {
      checkForOngoingProcessing(currentChatId);
    }

    initializeElements();
    
    import('../ui/sidebar-agente.js').then(module => {
      if (typeof module.preventInitialAnimations === 'function') {
        module.preventInitialAnimations();
      }
      if (typeof module.addSidebarPinStyles === 'function') {
        module.addSidebarPinStyles();
      }
    });

    // FASE 2: Protocolos de comunicación (30%)
    console.log('🤖 Acadel: Estableciendo protocolos de comunicación...');
    updateAcadelTechProgress(30, '📡 Protocolos establecidos');
    
    initializeSidebarState();
    initializeTheme();
    setupHeaderEventListeners();
    setupUIEventListeners();
    setupThemeListeners();
    setupSidebarListeners();
    setupModalListeners();

    // FASE 3: Sistema de navegación inteligente (45%)
    console.log('🤖 Acadel: Calibrando sistema de navegación inteligente...');
    initScrollSystem();
    await new Promise(resolve => setTimeout(resolve, 300));
    updateAcadelTechProgress(45, '🧭 Navegación inteligente activa');

    // FASE 4: Herramientas avanzadas de IA (60%)
    console.log('🤖 Acadel: Desplegando arsenal de herramientas de IA...');
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
    
    try {
      const audioInitPromise = import('../components/audio-panel.js').then(audioModule => {
        if (audioModule.audioPanel && typeof audioModule.audioPanel.init === 'function') {
          console.log('🎧 Acadel: Activando sistema de transcripción de audio...');
          audioModule.audioPanel.init();
        }
      }).catch(e => console.warn('🤖 Acadel: Sistema de audio en standby:', e));

      const messageAudioPromise = import('../ui/message-renderer-agente.js').then(messageModule => {
        if (typeof messageModule.processExistingAudioMessages === 'function') {
          console.log('🔊 Acadel: Procesando mensajes de audio existentes...');
          setTimeout(messageModule.processExistingAudioMessages, 1200);
        } else {
          setTimeout(() => {
            import('../ui/message-renderer-agente.js').then(module => {
              if (typeof module.processExistingAudioMessages === 'function') {
                module.processExistingAudioMessages();
              }
            });
          }, 2000);
        }
      }).catch(e => console.warn('🤖 Acadel: Procesamiento de audio en configuración:', e));

      Promise.allSettled([audioInitPromise, messageAudioPromise]).then(results => {
        const errors = results.filter(r => r.status === 'rejected');
        if (errors.length === 0) {
          console.log('✅ Acadel: Sistema de audio completamente operativo');
        }
      });

    } catch (error) {
      console.warn('🤖 Acadel: Sistema de audio en modo de compatibilidad:', error);
    }
    
    window.renderMermaidDiagram = async function(containerId, code) {
      const { initializeMermaidDiagram } = await import('../../../shared/mermaid-utils.js');
      return initializeMermaidDiagram(containerId, code);
    };
    
    window.showMermaidPreview = async function(button) {
      const code = button.getAttribute('data-code');
      const diagramId = button.getAttribute('data-diagram-id');
      const title = document.querySelector(`#${diagramId}`)?.getAttribute('data-title') || 'Diagrama Conceptual';
      
      const { showPreviewPanel } = await import('../components/preview-panel-agente.js');
      showPreviewPanel({ code: code, title: title }, 'mermaid');
    };

    import('../components/preview-panel-agente.js').then(module => {
      window.showPreviewPanel = module.showPreviewPanel;
    });
    
    updateAcadelTechProgress(60, '🛠️ Arsenal de herramientas desplegado');

    // FASE 5: Base de datos académica (75%)
    console.log('🤖 Acadel: Sincronizando con base de datos académica...');
    const userData = await checkAuthentication();
    const chats = await loadChatHistory();
    renderChatHistory(chats);
    updateAcadelTechProgress(75, '📚 Base de datos sincronizada');

    // FASE 6: Motores matemáticos y de análisis (90%)
    console.log('🤖 Acadel: Activando motores de análisis matemático...');
    await initMathSystem();
    setupMathObserver();
    await processAllChatMessages();

    await Promise.race([
      new Promise(resolve => setTimeout(resolve, 600)),
      new Promise(resolve => {
        if (window.MathJax && typeof window.MathJax.startup === 'object') {
          if (typeof window.MathJax.startup.promise === 'object') {
            window.MathJax.startup.promise.then(resolve);
          } else {
            setTimeout(resolve, 400);
          }
        } else {
          resolve();
        }
      })
    ]);

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout Mermaid')), 3000)
      );
      await Promise.race([mermaidPromise, timeoutPromise]);
      console.log("🤖 Acadel: Sistema de diagramas operativo");
    } catch (error) {
      console.warn("🤖 Acadel: Diagramas en modo de compatibilidad:", error);
    }

    updateAcadelTechProgress(90, '🧮 Motores de análisis activados');

    // FASE 7: Sistemas avanzados (95%)
    console.log('🤖 Acadel: Finalizando sistemas avanzados...');
    loadProblematicChats();
    initChatController();
    initResponseInteraction();
    await initSearchModal();
    window.searchModalInitialized = true;

    try {
      await initTranscriptionSystem();
      console.log('🎥 Acadel: Sistema de transcripción de video y audio activado');
      
      const monitorChatForTranscriptions = () => {
        const chatId = getState('currentChatId');
        
        if (chatId) {
          console.log('🔍 Acadel: Verificando transcripciones para chat:', chatId);
          
          if (window.transcriptionController?.checkCurrentChatForTranscriptions) {
            window.transcriptionController.checkCurrentChatForTranscriptions();
          } else if (window.youtubePanel?.checkForTranscriptions) {
            window.youtubePanel.checkForTranscriptions();
          } else if (window.youtubePanel?.checkForVideo) {
            window.youtubePanel.checkForVideo();
          }
          
          clearInterval(chatMonitorInterval);
        }
      };
      
      monitorChatForTranscriptions();
      const chatMonitorInterval = setInterval(monitorChatForTranscriptions, 2000);
      setTimeout(() => clearInterval(chatMonitorInterval), 30000);
      
    } catch (err) {
      console.warn('🤖 Acadel: Sistema de transcripción en modo de compatibilidad:', err);
    }
    
    updateAcadelTechProgress(95, '🎯 Sistemas avanzados listos');

    // FASE 8: ¡Agente operativo! (100%)
    console.log('🤖 Acadel: ¡Sistema completamente operativo!');

    // Procesamiento final de Emoji
    if (window.acadelEmojiIntegration?.initialized) {
      acadelEmojiIntegration.forceProcessAll();
      console.log('🎨 Sistema Acadel emoji procesado - ¡Tu 🦫 académico listo!');
    }
    
    setManagedTimeout(() => {
      window.appInitialized = true;

      // Scroll optimizado
      scrollManager.scrollToBottom({
        priority: 'low',
        reason: 'agente-acadel-ready'
      });

      // ⭐ Progreso final y cierre del terminal
      updateAcadelTechProgress(100, '🎉 ¡Protocolo de inicialización completado!');
      
      setManagedTimeout(() => {
        import('../ui/ui-manager-agente.js').then(uiModule => {
          if (typeof uiModule.removeAcadelTechLoader === 'function') {
            uiModule.removeAcadelTechLoader();
          } else if (typeof uiModule.removeInitialLoader === 'function') {
            uiModule.removeInitialLoader();
          }

                // ⭐ Bienvenida tecnológica del Agente Acadel
              window.acadelConfetti(
                "🚀 ¡Agente Acadel totalmente operativo! 🤖", 
                "Tu asistente de IA académica está listo para transcribir, buscar y resolver cualquier desafío de estudio. ¡Modo capibara inteligente activado!"
              );
          
          setManagedTimeout(() => {
            document.body.classList.remove('initializing');
            console.log('🤖 Agente Acadel: ¡Terminal tecnológico completamente operativo!');
          }, 500);
        });
      }, 1200);
      
    }, 900);

    try {
      window.addEventListener('popstate', () => {
        setTimeout(() => {
          import('../ui/message-renderer-agente.js').then(module => {
            if (typeof module.processExistingAudioMessages === 'function') {
              module.processExistingAudioMessages();
            }
          }).catch(e => console.warn('🤖 Acadel: Error en popstate audio:', e));
        }, 800);
      });

      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
          if (response.ok && args[0] && typeof args[0] === 'string' && 
              (args[0].includes('/api/chats/') || args[0].includes('/messages'))) {
            setTimeout(() => {
              import('../ui/message-renderer-agente.js').then(module => {
                if (typeof module.processExistingAudioMessages === 'function') {
                  module.processExistingAudioMessages();
                }
              }).catch(e => {});
            }, 1000);
          }
          return response;
        });
      };

      console.log('✅ Acadel: Listeners globales de audio configurados');
    } catch (error) {
      console.warn('🤖 Acadel: Listeners de audio en modo de compatibilidad:', error);
    }

  } catch (error) {
    console.error('🤖 Acadel: Error crítico en inicialización:', error);
    
    // Mensaje de error tecnológico
    window.acadelError(
      "🚨 ¡Error en el sistema de IA!", 
      "El Agente Acadel detectó un fallo en su matriz. Como buen capibara tech, sugiere reiniciar el sistema para recalibrar todos los protocolos."
    );

    import('../ui/ui-manager-agente.js').then(uiModule => {
      if (typeof uiModule.removeAcadelTechLoader === 'function') {
        uiModule.removeAcadelTechLoader(true);
      } else if (typeof uiModule.removeInitialLoader === 'function') {
        uiModule.removeInitialLoader(true);
      }
    });

    document.body.classList.remove('initializing');
  }
}

/**
 * Función auxiliar para actualizar progreso del terminal tecnológico
 * @param {number} progress - Progreso del 0 al 100
 * @param {string} mensaje - Mensaje del Agente Acadel
 */
function updateAcadelTechProgress(progress, mensaje = '') {
  import('../ui/ui-manager-agente.js').then(uiModule => {
    if (typeof uiModule.updateAcadelTechProgress === 'function') {
      uiModule.updateAcadelTechProgress(progress);
    }
  });
  
  if (mensaje) {
    console.log(`🤖 Agente Acadel [${progress}%]: ${mensaje}`);
  }
}

// ⭐ Funciones globales para uso en toda la aplicación
window.updateAcadelTechProgress = updateAcadelTechProgress;

// Inicialización al cargar DOM
document.addEventListener('DOMContentLoaded', initApp);

export default {
  initApp,
  updateAcadelTechProgress,
  initScrollSystem,
  acadelEmojiIntegration  // ← AGREGAR ESTA LÍNEA
};