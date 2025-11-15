/**
 * app.js Mátematico - Punto de entrada principal para la aplicación de chat matemático
 * OPTIMIZADO: Secuencia de inicialización mejorada con soporte para Mermaid
 */
import { initializeElements, setupUIEventListeners, setupScrollBehavior } from '../ui/ui-manager-matematico.js';
import { setupThemeListeners, initializeTheme } from '../ui/theme-matematico.js';
import { setupSidebarListeners, initializeSidebarState } from '../ui/sidebar-matematico.js';
import { setupModalListeners } from '../ui/modals-matematico.js';
import { checkAuthentication } from '../api/auth-matematico.js';
import { loadChatHistory } from '../api/chat-matematico.js';
import { initChatController } from './chat-controller-matematico.js';
import { setupMathObserver, processAllChatMessages } from '../math/math-renderer.js';
import { renderChatHistory } from '../ui/sidebar-matematico.js';
import { initializeMessageRenderers } from '../ui/message-renderer-matematico.js';
import { initPreviewPanel } from '../components/preview-panel-matematico.js';
import { initFileAttachments } from '../utils/file-attachments-matematico.js';
import { setupHeaderEventListeners } from '../ui/header-manager-matematico.js';
import { loadProblematicChats } from '../utils/chat-error-handler-matematico.js';
import { initMathSystem } from '../math/math-integration.js';
import { initResponseInteraction } from '../utils/response-interaction-matematico.js';
import { initSearchModal } from '../utils/searchat-matematico.js';
import { setManagedTimeout } from '../../shared/dom-helpers.js';
import scrollManager from '../../shared/scroll-manager.js';
import { initMermaidSystem } from '../../shared/mermaid-utils.js';
import { 
  getCurrentVariant, APP_VARIANTS, getAppConfig, setCurrentVariantFromUrl, 
  VARIANTS, getCurrentVariantKey, getApiRoutes 
} from './config-matematico.js';
import { validateUUID } from '../../shared/validators.js';
import { initializeState } from './state-matematico.js';
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
 * Sistema de scroll optimizado para el aula matemática
 */
function initScrollSystem() {
  console.log('🦫 Acadel: Configurando scroll matemático inteligente...');
  
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
  console.log('🦫 Acadel: ¡Scroll matemático configurado y responsivo!');
}

/**
 * Función auxiliar para actualizar progreso del pizarrón
 * @param {number} progress - Progreso del 0 al 100
 * @param {string} mensaje - Mensaje del Profesor Acadel
 */
function updateAcadelProgress(progress, mensaje = '') {
  import('../ui/ui-manager-matematico.js').then(uiModule => {
    if (typeof uiModule.updateAcadelLoaderProgress === 'function') {
      uiModule.updateAcadelLoaderProgress(progress);
    }
  });
  
  if (mensaje) {
    console.log(`🦫 Acadel [${progress}%]: ${mensaje}`);
  }
}

/**
 * Inicializa la aplicación de chat matemático con secuencia optimizada
 */
async function initApp() {
  console.log("📋 Profesor Acadel iniciando pizarrón matemático:");
  console.log(`- Variante: ${getCurrentVariant()}`);
  console.log(`- avaId: ${getAppConfig()?.avaId}`);
  console.log(`- API: ${getApiRoutes()?.query}`);
  
  const mermaidPromise = initMermaidSystem();
  
  // ⭐ APLICAR PIZARRÓN RESPONSIVO (sin skeleton que bloquee)
  import('../ui/ui-manager-matematico.js').then(uiModule => {
    if (typeof uiModule.applyInitialLoader === 'function') {
      uiModule.applyInitialLoader(); // Solo pizarrón, contenido visible detrás
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
    // FASE 1: Herramientas básicas (15%)
    console.log('🦫 Acadel: Preparando herramientas de tiza...');
    await initializeMessageRenderers();
    updateAcadelProgress(15, '🔧 Herramientas de tiza listas');

    initializeElements();
    
    import('../ui/sidebar-matematico.js').then(module => {
      if (typeof module.preventInitialAnimations === 'function') {
        module.preventInitialAnimations();
      }
      if (typeof module.addSidebarPinStyles === 'function') {
        module.addSidebarPinStyles();
      }
    });

    // FASE 2: Configuración del pizarrón (30%)
    console.log('🦫 Acadel: Limpiando el pizarrón...');
    updateAcadelProgress(30, '📐 Pizarrón limpio y listo');
    
    initializeSidebarState();
    initializeTheme();
    setupHeaderEventListeners();
    setupUIEventListeners();
    setupThemeListeners();
    setupSidebarListeners();
    setupModalListeners();

    // FASE 3: Sistema de navegación (45%)
    console.log('🦫 Acadel: Calibrando la experiencia de clase...');
    initScrollSystem();
    await new Promise(resolve => setTimeout(resolve, 300));
    updateAcadelProgress(45, '📊 Navegación de aula configurada');

    // FASE 4: Herramientas avanzadas (60%)
    console.log('🦫 Acadel: Preparando calculadoras y herramientas...');
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
      
      const { showPreviewPanel } = await import('../components/preview-panel-matematico.js');
      showPreviewPanel({ code: code, title: title }, 'mermaid');
    };

    import('../components/preview-panel-matematico.js').then(module => {
      window.showPreviewPanel = module.showPreviewPanel;
    });
    
    updateAcadelProgress(60, '🔧 Calculadoras y herramientas listas');

    // FASE 5: Historial académico (75%)
    console.log('🦫 Acadel: Cargando historial de clases anteriores...');
    const userData = await checkAuthentication();
    const chats = await loadChatHistory();
    renderChatHistory(chats);
    updateAcadelProgress(75, '📚 Historial de clases cargado');

    // FASE 6: Motores matemáticos (90%)
    console.log('🦫 Acadel: Inicializando motores de cálculo cuántico...');
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
      console.log("🦫 Acadel: Diagramas matemáticos listos");
    } catch (error) {
      console.warn("🦫 Acadel: Los diagramas tardarán un poco más...", error);
    }

    updateAcadelProgress(90, '🧮 Motores matemáticos operativos');

    // FASE 7: Finalización (95%)
    console.log('🦫 Acadel: Último repaso del pizarrón...');
    loadProblematicChats();
    initChatController();
    initResponseInteraction();
    await initSearchModal();
    window.searchModalInitialized = true;
    updateAcadelProgress(95, '🎯 Pizarrón completamente listo');

    // FASE 8: ¡Clase lista! (100%)
    console.log('🦫 Acadel: ¡Pizarrón listo para enseñar matemáticas!');

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
            reason: 'pizarron-acadel-ready',
            useAggressiveScroll: true,
            retryCount: 5,
            retryDelay: 100
          });
          
          setTimeout(() => {
            scrollManager.scrollToBottom({
              priority: 'high',
              reason: 'acadel-final-scroll-check',
              useAggressiveScroll: true
            });
          }, 300);
        });
      });

      // ⭐ Progreso final y cierre del pizarrón
      updateAcadelProgress(100, '🎉 ¡Teorema de inicialización del pizarrón completado!');
      
      setManagedTimeout(() => {
        import('../ui/ui-manager-matematico.js').then(uiModule => {
          if (typeof uiModule.removeAcadelInitialLoader === 'function') {
            uiModule.removeAcadelInitialLoader();
          } else if (typeof uiModule.removeInitialLoader === 'function') {
            uiModule.removeInitialLoader();
          }

                // ⭐ Bienvenida mejorada del Profesor Acadel
            window.acadelConfetti(
              "🎓 ¡Pizarrón matemático listo! 🦫", 
              "El Profesor Acadel ha preparado su aula cuántica. ¡Desde ecuaciones simples hasta teoremas complejos, aquí resolvemos todo con estilo de capibara!"
            );

          
          setManagedTimeout(() => {
            document.body.classList.remove('initializing');
            console.log('🦫 Profesor Acadel: ¡Pizarrón matemático completamente operativo y responsivo!');
          }, 500);
        });
      }, 1200);
      
    }, 900); // Pausa para ver el progreso completo

  } catch (error) {
    console.error('🦫 Acadel: ¡Error en el pizarrón matemático!', error);
    
    // Mensaje de error con personalidad Acadel
    window.acadelError(
      "🦫 ¡Oops! Tiza defectuosa en el pizarrón", 
      "Hasta los capibara más sabios a veces escriben mal en la pizarra. El Profesor Acadel sugiere recargar para limpiar el pizarrón y empezar con ecuaciones frescas y nuevas."
    );

    import('../ui/ui-manager-matematico.js').then(uiModule => {
      if (typeof uiModule.removeAcadelInitialLoader === 'function') {
        uiModule.removeAcadelInitialLoader(true);
      } else if (typeof uiModule.removeInitialLoader === 'function') {
        uiModule.removeInitialLoader(true);
      }
    });

    document.body.classList.remove('initializing');
  }
}

// ⭐ Funciones globales para uso en toda la aplicación
window.updateAcadelProgress = updateAcadelProgress;

// Inicialización al cargar DOM
document.addEventListener('DOMContentLoaded', initApp);

export default {
  initApp,
  updateAcadelProgress,
  initScrollSystem,
  ensureVariantInitialization,
  VARIANT_INITIALIZED_EVENT,
  eventDispatcher,
  getInitializationState: () => ({ ...initState }),
  acadelEmojiIntegration  // ← AGREGAR ESTA LÍNEA
};