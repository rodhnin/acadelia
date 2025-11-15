/**
 * app.js teorico - Punto de entrada principal de la aplicación
 */

import { initializeElements, setupUIEventListeners, setupScrollBehavior, showError } from '../ui/ui-manager-teorico.js';
import { setupThemeListeners, initializeTheme } from '../ui/theme-teorico.js';
import { setupSidebarListeners, initializeSidebarState } from '../ui/sidebar-teorico.js';
import { setupModalListeners } from '../ui/modals-teorico.js';
import { checkAuthentication } from '../api/auth-teorico.js';
import { loadChatHistory } from '../api/chat-teorico.js';
import { initChatController } from './chat-controller-teorico.js';
import { renderChatHistory } from '../ui/sidebar-teorico.js';
import { initializeMessageRenderers } from '../ui/message-renderer-teorico.js';
import { initPreviewPanel } from '../components/preview-panel-teorico.js';
import { initFileAttachments } from '../utils/file-attachments-teorico.js';
import { setupHeaderEventListeners } from '../ui/header-manager-teorico.js';
import { loadProblematicChats } from '../utils/chat-error-handler-teorico.js';
import { initResponseInteraction } from '../utils/response-interaction-teorico.js';
import searchModalModule from '../utils/searchat-teorico.js';
import scrollManager from '../../shared/scroll-manager.js';
import { initMermaidSystem } from '../../shared/mermaid-utils.js';
import { validateUUID } from '../../shared/validators.js';
import { setManagedTimeout } from '../../shared/dom-helpers.js';
import { 
  getCurrentVariant, APP_VARIANTS, setCurrentVariantFromUrl, 
  VARIANTS, getCurrentVariantKey, getAppConfig, getApiRoutes 
} from './config-teorico.js';
import { initializeState } from './state-teorico.js';
import acadelEmojiIntegration, { enhanceAcadelMessageRenderer } from '../../shared/acadel-emoji-integration.js';

export const VARIANT_INITIALIZED_EVENT = 'variantInitialized';

export const eventDispatcher = {
  dispatchVariantInitialized(variantData) {
    const event = new CustomEvent(VARIANT_INITIALIZED_EVENT, { detail: variantData });
    document.dispatchEvent(event);
    console.log(`📣 Evento de inicialización de variante emitido:`, variantData);
  }
};

// Estado global de inicialización
const initState = {
  variantInitialized: false,
  variantData: null
};

/**
 * Inicialización sincrónica crítica - DEBE ejecutarse primero y de forma sincrónica
 * Esta función garantiza que tengamos la configuración de variante correcta antes
 * de que cualquier otro módulo intente usarla.
 */
function ensureVariantInitialization() {
  console.log("⚡ Inicialización sincrónica crítica iniciada");
  
  // Si ya está inicializado, no hacer nada
  if (initState.variantInitialized) {
    console.log("✓ Variante ya inicializada previamente");
    return true;
  }
  
  // 1. Detectar la variante desde la URL
  const path = window.location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  const firstSegment = pathSegments[0]?.toLowerCase();
  
  if (!firstSegment) {
    console.error("❌ No se pudo detectar segmento de URL");
    return false;
  }
  
  console.log(`🔍 Segmento de URL detectado: ${firstSegment}`);
  
  // 2. Verificar si ya está inicializada correctamente
  const currentVariant = getCurrentVariant();
  if (currentVariant && currentVariant.toLowerCase() === firstSegment.toLowerCase()) {
    console.log(`✓ Variante ya inicializada correctamente: ${currentVariant}`);
    
    const config = getAppConfig();
    if (config && config.avaId) {
      console.log(`✓ avaId configurado: ${config.avaId}`);
      
      const routes = getApiRoutes();
      if (routes && routes.query && !routes.query.includes('undefined')) {
        console.log(`✓ Rutas API configuradas correctamente`);
        console.log(`✓ Ruta query: ${routes.query}`);
        
        initState.variantInitialized = true;
        initState.variantData = {
          variantKey: getCurrentVariantKey(),
          urlSegment: currentVariant,
          avaId: config.avaId
        };
        
        eventDispatcher.dispatchVariantInitialized(initState.variantData);
        
        return true;
      }
    }
  }
  
  // 3. Forzar inicialización
  console.log(`⚠️ Forzando inicialización de variante: ${firstSegment}`);
  
  // Encontrar la clave de variante
  let variantKey = null;
  for (const [key, variant] of Object.entries(VARIANTS)) {
    if (variant.urlSegment.toLowerCase() === firstSegment.toLowerCase()) {
      variantKey = key;
      break;
    }
  }
  
  if (!variantKey) {
    console.error(`❌ No se encontró variante para segmento: ${firstSegment}`);
    return false;
  }
  
  const success = setCurrentVariantFromUrl(firstSegment);
  
  if (success) {
    console.log(`✓ Variante establecida manualmente: ${firstSegment}`);
    console.log(`✓ Variante actual: ${getCurrentVariant()}`);
    console.log(`✓ Clave de variante: ${getCurrentVariantKey()}`);
    
    const config = getAppConfig();
    console.log(`✓ Configuración: avaId=${config?.avaId}`);
    
    const routes = getApiRoutes();
    console.log(`✓ Ruta query: ${routes?.query}`);
    
    initState.variantInitialized = true;
    initState.variantData = {
      variantKey: getCurrentVariantKey(),
      urlSegment: firstSegment,
      avaId: config?.avaId
    };
    
    eventDispatcher.dispatchVariantInitialized(initState.variantData);
    
    return true;
  } else {
    console.error(`❌ No se pudo establecer variante: ${firstSegment}`);
    return false;
  }
}

const initResult = ensureVariantInitialization();
console.log(`Resultado de inicialización sincrónica: ${initResult ? '✓ Éxito' : '❌ Fallo'}`);

// NOVEDAD: Inicializar estado global inmediatamente después de la detección de variante
if (initResult) {
  initializeState(initState.variantData);
}

/**
 * Inicializa el sistema de scroll
 */
function initScrollSystem() {
  console.log('🦫 Acadel: Configurando navegación académica inteligente...');
  
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
    console.warn('🦫 Acadel: Pequeño problema con el observer, pero seguimos...', e);
  }

  setupScrollBehavior();
  console.log('🦫 Acadel: ¡Navegación académica configurada y responsiva!');
}

async function initApp() {
  console.log("📋 Profesor Acadel iniciando biblioteca académica:");
  console.log(`- Variante: ${getCurrentVariant()}`);
  console.log(`- avaId: ${getAppConfig()?.avaId}`);
  console.log(`- API: ${getApiRoutes()?.query}`);
  
  const mermaidPromise = initMermaidSystem();
  
  // ⭐ APLICAR BIBLIOTECA ACADÉMICA RESPONSIVA (sin skeleton que bloquee)
  import('../ui/ui-manager-teorico.js').then(uiModule => {
    if (typeof uiModule.applyInitialLoader === 'function') {
      uiModule.applyInitialLoader(); // Solo biblioteca, contenido visible detrás
    }
  });

  const pathSegments = window.location.pathname.split('/');
  const currentVariant = getCurrentVariant();
  const appConfig = getAppConfig();
  
  const variantValues = Object.values(APP_VARIANTS).map(v => v.toLowerCase());
  const chatSegmentIndex = pathSegments.findIndex(segment => 
    variantValues.includes(segment.toLowerCase())) + 1;
  const chatId = pathSegments[chatSegmentIndex];

  if (!chatId || !validateUUID(chatId)) {
    document.documentElement.classList.add('welcome-pending');
    const variantClass = currentVariant.toLowerCase().replace(/[^a-z0-9]/g, '-');
    document.documentElement.classList.add(`${variantClass}-variant`);
    document.body.classList.add('initializing');

    const fixedSpace = document.querySelector('.fixed-space');
    if (fixedSpace) {
      fixedSpace.style.opacity = '0';
      fixedSpace.style.visibility = 'hidden';
      fixedSpace.style.pointerEvents = 'none';
    }
  }

  try {
    // FASE 1: Catalogando fuentes bibliográficas (15%)
    console.log('🦫 Acadel: Catalogando fuentes bibliográficas...');
    await initializeMessageRenderers();
    updateAcadelLibraryProgress(15, '📚 Fuentes bibliográficas catalogadas');

    initializeElements();
    
    import('../ui/sidebar-teorico.js').then(module => {
      if (typeof module.preventInitialAnimations === 'function') {
        module.preventInitialAnimations();
      }
      if (typeof module.addSidebarPinStyles === 'function') {
        module.addSidebarPinStyles();
      }
    });

    // FASE 2: Organizando la biblioteca (30%)
    console.log('🦫 Acadel: Organizando estantes de la biblioteca...');
    updateAcadelLibraryProgress(30, '📖 Biblioteca académica organizada');
    
    initializeSidebarState();
    initializeTheme();
    setupHeaderEventListeners();
    setupUIEventListeners();
    setupThemeListeners();
    setupSidebarListeners();
    setupModalListeners();

    // FASE 3: Sistema de navegación académica (45%)
    console.log('🦫 Acadel: Configurando sistema de investigación...');
    initScrollSystem();
    await new Promise(resolve => setTimeout(resolve, 300));
    updateAcadelLibraryProgress(45, '🔍 Sistema de investigación configurado');

    // FASE 4: Herramientas de investigación (60%)
    console.log('🦫 Acadel: Preparando instrumentos de análisis...');
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
    
    window.renderMermaidDiagram = async function(containerId, code) {
      const { initializeMermaidDiagram } = await import('../../shared/mermaid-utils.js');
      return initializeMermaidDiagram(containerId, code);
    };
    
    window.showMermaidPreview = async function(button) {
      const code = button.getAttribute('data-code');
      const diagramId = button.getAttribute('data-diagram-id');
      const title = document.querySelector(`#${diagramId}`)?.getAttribute('data-title') || 'Mapa Conceptual';
      
      const { showPreviewPanel } = await import('../components/preview-panel-teorico.js');
      showPreviewPanel({ code: code, title: title }, 'mermaid');
    };

    import('../components/preview-panel-teorico.js').then(module => {
      window.showPreviewPanel = module.showPreviewPanel;
    });
    
    updateAcadelLibraryProgress(60, '⚗️ Instrumentos de análisis listos');

    // FASE 5: Historial de investigaciones (75%)
    console.log('🦫 Acadel: Cargando archivo de investigaciones previas...');
    const userData = await checkAuthentication();
    const chats = await loadChatHistory();
    renderChatHistory(chats);
    updateAcadelLibraryProgress(75, '📜 Archivo de investigaciones cargado');

    // FASE 6: Motores de análisis teórico (90%)
    console.log('🦫 Acadel: Inicializando motores de análisis interdisciplinario...');
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
      console.log("🦫 Acadel: Diagramas conceptuales listos");
    } catch (error) {
      console.warn("🦫 Acadel: Los diagramas tardarán un poco más...", error);
    }

    updateAcadelLibraryProgress(90, '🧠 Motores de análisis operativos');

    // FASE 7: Últimos ajustes de la biblioteca (95%)
    console.log('🦫 Acadel: Últimos ajustes en la biblioteca...');
    updateAcadelLibraryProgress(95, '🎓 Biblioteca completamente lista');

    // FASE 8: ¡Biblioteca lista! (100%)
    console.log('🦫 Acadel: ¡Biblioteca académica lista para investigar!');

    // Procesamiento final de Noto Emoji
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
              reason: 'acadel-library-final-scroll',
              useAggressiveScroll: true
            });
          }, 300);
        });
      });

      // ⭐ Progreso final y cierre de la biblioteca
      updateAcadelLibraryProgress(100, '🎉 ¡Metodología científica de inicialización completada!');
      
      setManagedTimeout(() => {
        import('../ui/ui-manager-teorico.js').then(uiModule => {
          if (typeof uiModule.removeAcadelLibraryLoader === 'function') {
            uiModule.removeAcadelLibraryLoader();
          } else if (typeof uiModule.removeInitialLoader === 'function') {
            uiModule.removeInitialLoader();
          }

                // ⭐ Bienvenida mejorada del Profesor Acadel teórico
              window.acadelConfetti(
                "🎓 ¡Biblioteca académica lista! 🦫", 
                "El Profesor Acadel ha preparado su biblioteca interdisciplinaria. ¡Desde teorías médicas hasta paradigmas psicológicos, aquí analizamos todo con rigor académico!"
              );

          
          setManagedTimeout(() => {
            document.body.classList.remove('initializing');
            console.log('🦫 Profesor Acadel: ¡Biblioteca académica completamente operativa y responsiva!');
          }, 500);
        });
      }, 1200);
      
    }, 900); // Pausa para ver el progreso completo

  } catch (error) {
    console.error('🦫 Acadel: ¡Error en la biblioteca académica!', error);
    
    // Mensaje de error con personalidad Acadel teórica
    window.acadelError(
      "🦫 ¡Oops! Pergamino defectuoso en la biblioteca", 
      "Hasta los capibara más eruditos a veces desarman mal los estantes. El Profesor Acadel sugiere recargar para reorganizar la biblioteca con nuevas teorías."
    );

    import('../ui/ui-manager-teorico.js').then(uiModule => {
      if (typeof uiModule.removeAcadelLibraryLoader === 'function') {
        uiModule.removeAcadelLibraryLoader(true);
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
 * @param {string} mensaje - Mensaje del Profesor Acadel
 */
function updateAcadelLibraryProgress(progress, mensaje = '') {
  import('../ui/ui-manager-teorico.js').then(uiModule => {
    if (typeof uiModule.updateAcadelLibraryProgress === 'function') {
      uiModule.updateAcadelLibraryProgress(progress);
    } else if (typeof uiModule.updateLoaderProgress === 'function') {
      uiModule.updateLoaderProgress(progress);
    }
  });
  
  if (mensaje) {
    console.log(`🦫 Acadel [${progress}%]: ${mensaje}`);
  }
}

// ⭐ Funciones globales para uso en toda la aplicación
window.updateAcadelLibraryProgress = updateAcadelLibraryProgress;

// Inicialización al cargar DOM
document.addEventListener('DOMContentLoaded', initApp);

export default {
  initApp,
  updateAcadelLibraryProgress,
  initScrollSystem,
  ensureVariantInitialization,
  VARIANT_INITIALIZED_EVENT,
  eventDispatcher,
  getInitializationState: () => ({ ...initState }),
  acadelEmojiIntegration  // ← AGREGAR ESTA LÍNEA
};