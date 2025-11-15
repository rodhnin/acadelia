/**
 * mermaid-utils.js - Utilidades para trabajar con diagramas Mermaid
 * Con integración optimizada para el sistema de temas
 */

let mermaidInitialized = false;
let mermaidLoadPromise = null;
let isUpdatingTheme = false;
let lastTheme = document.documentElement?.getAttribute('data-theme') || 'light';
let retryCount = 0;
let mermaidInitStatus = 'pending'; // 'pending', 'loading', 'success', 'failed'
let lastThemeApplied = null;

/**
 * Inicializa el sistema Mermaid
 * @returns {Promise} Promesa que se resuelve cuando Mermaid está inicializado
 */
export function initMermaidSystem() {
    // Reset de variables para garantizar inicialización limpia
    retryCount = 0;
    mermaidInitStatus = 'pending';
    lastThemeApplied = document.documentElement?.getAttribute('data-theme') || 'light';
    
    document.removeEventListener('themeChanged', handleThemeChange);
    document.addEventListener('themeChanged', handleThemeChange);
    
    // Inicialización con reintentos
    return loadMermaidWithRetry();
  }

  /**
 * Espera hasta que un contenedor tenga dimensiones válidas
 * @param {string} elementId - ID del elemento a verificar
 * @param {number} maxWait - Tiempo máximo de espera en milisegundos
 * @returns {Promise<boolean>} - Promesa que se resuelve con true si el elemento tiene dimensiones, false en caso contrario
 */
  function waitForValidDimensions(elementId, maxWait = 2000) {
    return new Promise((resolve) => {
      const element = document.getElementById(elementId);
      if (!element) {
        resolve(false);
        return;
      }
      
      // Si ya tiene dimensiones, resolver inmediatamente
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        resolve(true);
        return;
      }
      
      // Contador para limitar intentos
      let attempts = 0;
      const maxAttempts = 20;
      const checkInterval = Math.min(maxWait / maxAttempts, 250);
      
      const checker = setInterval(() => {
        attempts++;
        const element = document.getElementById(elementId);
        
        if (!element || attempts >= maxAttempts) {
          clearInterval(checker);
          resolve(false);
          return;
        }
        
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          clearInterval(checker);
          resolve(true);
        }
      }, checkInterval);
    });
  }

/**
 * Carga Mermaid con sistema de reintentos
 * Nueva función a añadir
 */
function loadMermaidWithRetry(attempt = 0) {
    const maxAttempts = 3;
    
    if (attempt > 0) {
      console.log(`Reintentando carga de Mermaid (intento ${attempt} de ${maxAttempts})...`);
    }
    
    // Evitar múltiples intentos si ya está cargando
    if (mermaidInitStatus === 'loading') {
      return mermaidLoadPromise || Promise.reject(new Error('Mermaid ya está cargando'));
    }
    
    // Si ya está inicializado correctamente, devolver inmediatamente
    if (mermaidInitStatus === 'success' && window.mermaid) {
      return Promise.resolve(window.mermaid);
    }
    
    mermaidInitStatus = 'loading';
    
    // Realizar carga
    return loadMermaidLibrary()
      .then(mermaid => {
        mermaidInitStatus = 'success';
        console.log('Mermaid cargado e inicializado exitosamente');
        
        // Asegurar que el tema actual esté aplicado
        const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
        if (lastThemeApplied !== currentTheme) {
          updateMermaidTheme(currentTheme);
          lastThemeApplied = currentTheme;
        }
        
        setTimeout(() => {
          refreshAllMermaidDiagrams().catch(error => {
            console.warn('Error actualizando diagramas existentes:', error);
          });
        }, 500);
        
        return mermaid;
      })
      .catch(error => {
        mermaidInitStatus = 'failed';
        console.error('Error inicializando Mermaid:', error);
        
        // Si aún tenemos intentos disponibles, reintentar con retraso
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * (attempt + 1), 3000); // Retraso incremental
          console.log(`Reintentando en ${delay}ms...`);
          
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              loadMermaidWithRetry(attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          });
        }
        
        // Si se acabaron los intentos, propagar error
        throw error;
      });
  }


/**
 * Maneja el cambio de tema para Mermaid
 * @param {CustomEvent} event - Evento de cambio de tema
 */
function handleThemeChange(event) {
  if (!event?.detail?.theme) return;
  
  const newTheme = event.detail.theme;
  
  // Evitar actualizaciones redundantes
  if (newTheme === lastThemeApplied && mermaidInitialized) return;
  
  console.log(`Cambio de tema detectado: ${newTheme}`);
  
  lastThemeApplied = newTheme;
  
  // Si Mermaid aún no está listo, solo actualizar la variable
  if (!window.mermaid || mermaidInitStatus !== 'success') {
    console.log('Mermaid no está disponible aún, tema pendiente de aplicar');
    return;
  }
  
  updateMermaidTheme(newTheme);
  
  // Si se indica que no es necesario actualizar los diagramas, retornar
  if (event.detail.skipDiagramRefresh) {
    console.log('Actualización de diagramas omitida por flag skipDiagramRefresh');
    return;
  }
  
  // Evitar actualizaciones simultáneas
  if (isUpdatingTheme) {
    console.log('Ya hay una actualización de tema en progreso, anidando espera');
    // Programar una actualización posterior
    setTimeout(() => {
      if (lastThemeApplied === newTheme) {
        handleThemeChange({ detail: { theme: newTheme } });
      }
    }, 1000);
    return;
  }
  
  isUpdatingTheme = true;
  
  console.log(`Actualizando diagramas con nuevo tema: ${newTheme}`);
  setTimeout(() => {
    try {
      refreshAllMermaidDiagrams()
        .finally(() => {
          // Asegurar que se desbloquee aunque haya error
          setTimeout(() => {
            isUpdatingTheme = false;
            console.log('Actualización de tema completada');
          }, 300);
        });
    } catch (error) {
      console.error('Error actualizando diagramas:', error);
      isUpdatingTheme = false;
    }
  }, 100);
}

/**
 * Carga dinámicamente la librería Mermaid si no está ya cargada
 * @returns {Promise} Promesa que se resuelve cuando Mermaid está listo
 */
export function loadMermaidLibrary() {
  // Si ya hay una promesa en curso, devolverla
  if (mermaidLoadPromise) {
    return mermaidLoadPromise;
  }
  
  console.log("Iniciando carga de Mermaid...");
  
  mermaidLoadPromise = new Promise((resolve, reject) => {
    // Si ya está inicializado, resolver inmediatamente
    if (mermaidInitialized && window.mermaid) {
      console.log("Mermaid ya inicializado, usando instancia existente");
      resolve(window.mermaid);
      return;
    }
    
    // Si el objeto ya existe pero no está inicializado
    if (window.mermaid && !mermaidInitialized) {
      console.log("Objeto Mermaid existe, inicializando configuración");
      initializeMermaidConfig();
      mermaidInitialized = true;
      resolve(window.mermaid);
      return;
    }
    
    if (document.querySelector('script[src*="mermaid"]')) {
      console.log("Script de Mermaid en proceso de carga, esperando...");
      
      const checkInterval = setInterval(() => {
        if (window.mermaid) {
          clearInterval(checkInterval);
          console.log("Mermaid detectado, inicializando");
          if (!mermaidInitialized) {
            initializeMermaidConfig();
            mermaidInitialized = true;
          }
          resolve(window.mermaid);
        }
      }, 100);
      
      // Timeout después de 5 segundos
      setTimeout(() => {
        if (!window.mermaid) {
          clearInterval(checkInterval);
          mermaidLoadPromise = null; // Reset para futuros intentos
          console.error("Tiempo de espera agotado cargando Mermaid");
          reject(new Error('Tiempo de espera agotado para cargar Mermaid'));
        }
      }, 5000);
      
      return;
    }
    
    console.log("Cargando librería Mermaid desde CDN...");
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11.5.0/dist/mermaid.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log("Mermaid cargado exitosamente");
      if (window.mermaid) {
        initializeMermaidConfig();
        mermaidInitialized = true;
        resolve(window.mermaid);
      } else {
        console.error("Error: objeto mermaid no disponible después de cargar script");
        mermaidLoadPromise = null;
        reject(new Error('No se pudo inicializar Mermaid'));
      }
    };
    
    script.onerror = (e) => {
      console.error("Error cargando script de Mermaid:", e);
      mermaidLoadPromise = null;
      reject(new Error('Error al cargar Mermaid'));
    };
    
    document.head.appendChild(script);
  });
  
  mermaidLoadPromise.catch(error => {
    console.warn("Error en carga inicial de Mermaid, limpiando para reintentar:", error);
    mermaidLoadPromise = null; // Permite reintentar
  });
  
  return mermaidLoadPromise;
}

/**
 * Inicializa la configuración de Mermaid
 */
function initializeMermaidConfig() {
  if (!window.mermaid) {
    console.error("initializeMermaidConfig: objeto mermaid no disponible");
    return;
  }
  
  const theme = document.documentElement?.getAttribute('data-theme') || 'light';
  lastTheme = theme;
  
  console.log(`Inicializando configuración de Mermaid con tema: ${theme}`);
  
  try {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose', // Para permitir interactividad
      fontSize: 16,
      fontFamily: 'Arial,sans-serif',
      useMaxWidth: false,
      logLevel: 'error',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        diagramPadding: 20
      },
      zoomEnabled: true, // Habilitar zoom
      pan: true,         // Habilitar desplazamiento
      maxZoom: 5,        // Máximo zoom permitido
      minZoom: 0.5       // Mínimo zoom permitido
    });
    
    console.log("Configuración de Mermaid completada");
  } catch (error) {
    console.error("Error configurando Mermaid:", error);
    throw error; // Re-lanzar para manejo en niveles superiores
  }
}

/**
 * Actualiza el tema de Mermaid
 * @param {string} theme - 'light' o 'dark'
 */
export function updateMermaidTheme(theme) {
  if (!window.mermaid) {
    console.warn("updateMermaidTheme: Mermaid no disponible");
    return;
  }
  
  console.log(`Actualizando tema Mermaid a: ${theme}`);
  lastTheme = theme;
  
  try {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontSize: 16,
      fontFamily: 'Arial,sans-serif',
      useMaxWidth: false,
      logLevel: 'error',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        diagramPadding: 20
      },
      // Mantener configuración de interactividad
      zoomEnabled: true,
      pan: true,
      maxZoom: 5,
      minZoom: 0.5
    });
  } catch (error) {
    console.error("Error actualizando tema Mermaid:", error);
  }
}

/**
 * Actualiza todos los diagramas Mermaid en la página
 */
export function refreshAllMermaidDiagrams() {
    console.log("Actualizando todos los diagramas Mermaid...");
    
    // Recopilar datos de todos los diagramas
    const diagrams = document.querySelectorAll('.mermaid-diagram');
    console.log(`Encontrados ${diagrams.length} diagramas para actualizar`);
    
    if (diagrams.length === 0) return Promise.resolve();
    
    // Si Mermaid no está disponible, intentar cargarlo primero
    if (!window.mermaid || mermaidInitStatus !== 'success') {
      console.log('Mermaid no disponible, cargando antes de actualizar diagramas');
      return loadMermaidWithRetry()
        .then(() => processAllDiagrams(diagrams))
        .catch(error => {
          console.error('Error cargando Mermaid para actualizar diagramas:', error);
          return Promise.reject(error);
        });
    }
    
    // Si Mermaid ya está disponible, procesar diagramas directamente
    return processAllDiagrams(diagrams);
  }

  /**
 * Función auxiliar para procesar todos los diagramas
 * Nueva función a añadir
 */
function processAllDiagrams(diagrams) {
    const renderPromises = Array.from(diagrams).map(diagram => {
      const code = diagram.getAttribute('data-code');
      const id = diagram.id;
      
      if (!code || !id) return Promise.resolve();
      
      diagram.innerHTML = `
        <div class="mermaid-loading">
          <i class="bx bx-loader-alt bx-spin"></i>
          <span>Actualizando diagrama...</span>
        </div>
      `;
      
      return new Promise(resolve => {
        setTimeout(() => {
          try {
            initializeMermaidDiagram(id, code)
              .then(success => {
                if (success) {
                  console.log(`Diagrama ${id} actualizado correctamente`);
                } else {
                  console.warn(`Problema al actualizar diagrama ${id}`);
                }
                resolve();
              })
              .catch(error => {
                console.error(`Error al actualizar diagrama ${id}:`, error);
                resolve(); // Resolver aunque haya error para continuar con otros
              });
          } catch (error) {
            console.error(`Error al procesar diagrama ${id}:`, error);
            resolve(); // Resolver aunque haya error
          }
        }, 100); // Pequeño retraso para no sobrecargarse
      });
    });
    
    return Promise.all(renderPromises);
  }

  /**
 * Método para verificar el estado de Mermaid
 * Nueva función a añadir
 */
export function getMermaidStatus() {
    return {
      initialized: mermaidInitialized,
      status: mermaidInitStatus,
      themeSynced: lastThemeApplied === document.documentElement?.getAttribute('data-theme'),
      currentTheme: lastThemeApplied,
      actualTheme: document.documentElement?.getAttribute('data-theme') || 'light'
    };
  }

  /**
 * Método para forzar sincronización de renderizado
 * Nueva función a añadir
 */
export function forceSyncMermaid() {
    const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
    
    lastThemeApplied = currentTheme;
    
    return loadMermaidWithRetry()
      .then(() => {
        // Asegurar que tengamos el tema correcto
        updateMermaidTheme(currentTheme);
        
        return refreshAllMermaidDiagrams();
      })
      .catch(error => {
        console.error('Error en sincronización forzada de Mermaid:', error);
        throw error;
      });
  }

/**
 * Convierte un diagrama Mermaid a SVG
 * @param {string} code - Código Mermaid
 * @returns {Promise<string>} Promesa que se resuelve con el SVG
 */
export async function convertMermaidToSVG(code) {
  try {
    // Asegurarse de que Mermaid esté cargado
    const mermaid = await loadMermaidLibrary();
    
    const { svg } = await mermaid.render('export-diagram', code);
    return svg;
  } catch (error) {
    console.error('Error al convertir Mermaid a SVG:', error);
    throw error;
  }
}

/**
 * Descarga un diagrama Mermaid como SVG
 * @param {string} code - Código Mermaid
 * @param {string} filename - Nombre del archivo
 */
export async function downloadMermaidAsSVG(code, filename = 'diagrama') {
  try {
    const svg = await convertMermaidToSVG(code);
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error al descargar diagrama:', error);
    return false;
  }
}

/**
 * Inicializa un diagrama Mermaid en un contenedor
 * @param {string} containerId - ID del contenedor
 * @param {string} code - Código Mermaid
 * @returns {Promise<boolean>} Promesa que se resuelve con true si tuvo éxito
 */
export async function initializeMermaidDiagram(containerId, code) {
  try {
    console.log(`Inicializando diagrama en ${containerId}`);
    // Asegurarse de que Mermaid esté cargado
    await loadMermaidLibrary();
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Contenedor no encontrado: ${containerId}`);
      return false;
    }
    
    const hasDimensions = await waitForValidDimensions(containerId);
    if (!hasDimensions) {
      console.warn(`El contenedor ${containerId} no tiene dimensiones después de esperar`);
      // Continuamos de todas formas - algunos diagramas pueden renderizarse aún sin dimensiones iniciales
    }
    
    container.innerHTML = '';
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'mermaid-controls';
    controlsDiv.innerHTML = `
      <div class="diagram-controls" id="controls-${containerId}">
        <button class="zoom-in-btn" title="Acercar"><i class="bx bx-zoom-in"></i></button>
        <button class="zoom-out-btn" title="Alejar"><i class="bx bx-zoom-out"></i></button>
        <button class="reset-zoom-btn" title="Restablecer zoom"><i class="bx bx-reset"></i></button>
      </div>
    `;
    container.appendChild(controlsDiv);
    
    const mermaidContainer = document.createElement('div');
    mermaidContainer.className = 'mermaid-container';
    
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.id = `${containerId}-diagram`;
    mermaidDiv.textContent = code;
    
    mermaidContainer.appendChild(mermaidDiv);
    container.appendChild(mermaidContainer);
    
    try {
      const currentTheme = document.documentElement?.getAttribute('data-theme') || 'light';
      
      // Siempre actualizar el tema para asegurar la sincronización
      updateMermaidTheme(currentTheme);
      
      // CLAVE: Incluir el tema en la configuración directa para asegurar que se aplique
      const config = {
        theme: currentTheme === 'dark' ? 'dark' : 'default',
        flowchart: {
          curve: 'basis',
          useMaxWidth: false,
          htmlLabels: true,
          padding: 20
        },
        suppressErrors: true // Esta opción es clave para evitar errores comunes
      };
      
      await window.mermaid.init(config, mermaidDiv);
      console.log(`Diagrama renderizado en ${containerId}`);
      
      setupDiagramInteractivity(containerId, mermaidContainer);
      
      return true;
    } catch (renderError) {
      console.error(`Error renderizando Mermaid:`, renderError);

      container.innerHTML = `
        <div class="mermaid-placeholder">
          <i class="bx bx-map"></i>
          <p>Diagrama no disponible</p>
          <button class="retry-render-btn" data-diagram-id="${containerId}" data-diagram-code="${escapeMermaidCode(code)}">
            <i class="bx bx-refresh"></i> Reintentar
          </button>
        </div>
      `;
      return false;
    }
  } catch (error) {
    console.error('Error al inicializar diagrama Mermaid:', error);
    
    const container = document.getElementById(containerId);
    if (container) {
      acadelError("🧩 Diagrama complicado", "Acadel no pudo crear este mapa conceptual. ¡A veces los diagramas se ponen rebeldes!");
      // Placeholder limpio
      container.innerHTML = `
        <div class="mermaid-placeholder">
          <i class="bx bx-map"></i>
          <p>Cargando diagrama...</p>
          <button class="retry-render-btn" onclick="window.renderMermaidDiagram('${containerId}', '${escapeMermaidCode(code)}')">
            <i class="bx bx-refresh"></i> Reintentar
          </button>
        </div>
      `;
    }
    
    return false;
  }
}

/**
 * Configura la interactividad de un diagrama Mermaid
 * @param {string} containerId - ID del contenedor principal
 * @param {HTMLElement} mermaidContainer - Contenedor del diagrama
 */
function setupDiagramInteractivity(containerId, mermaidContainer) {
  // Referencia al diagrama y sus controles
  const svgElement = mermaidContainer.querySelector('svg');
  if (!svgElement) return;
  
  let scale = 1;
  let originalWidth = svgElement.getBoundingClientRect().width;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  
  function applyTransform() {
    svgElement.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    svgElement.style.transformOrigin = 'center center';
  }
  
  const zoomInBtn = document.querySelector(`#controls-${containerId} .zoom-in-btn`);
  const zoomOutBtn = document.querySelector(`#controls-${containerId} .zoom-out-btn`);
  const resetZoomBtn = document.querySelector(`#controls-${containerId} .reset-zoom-btn`);
  
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      scale = Math.min(scale + 0.1, 5);
      applyTransform();
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      scale = Math.max(scale - 0.1, 0.5);
      applyTransform();
    });
  }
  
  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });
  }
  
  mermaidContainer.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      mermaidContainer.style.cursor = 'grabbing';
      mermaidContainer.classList.add('grabbing');
    }
  });
  
  function onMouseMove(e) {
    if (isDragging) {
      const deltaX = (e.clientX - lastX) / scale;
      const deltaY = (e.clientY - lastY) / scale;
      translateX += deltaX;
      translateY += deltaY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyTransform();
    }
  }
  
  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      mermaidContainer.style.cursor = 'grab';
      mermaidContainer.classList.remove('grabbing');
    }
  }
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  mermaidContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(5, scale + delta));
    
    const rect = mermaidContainer.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale - translateX;
    const mouseY = (e.clientY - rect.top) / scale - translateY;
    
    // Ajustar la traslación para mantener el punto bajo el cursor
    translateX = mouseX - (mouseX * newScale / scale);
    translateY = mouseY - (mouseY * newScale / scale);
    
    scale = newScale;
    applyTransform();
  }, { passive: false });
  
  mermaidContainer.style.cursor = 'grab';
  svgElement.style.transition = 'transform 0.1s ease';
}

/**
 * Escapa código Mermaid para uso en atributos HTML
 * @param {string} code - Código a escapar
 * @returns {string} Código escapado
 */
function escapeMermaidCode(code) {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '\\n');
}

// Exportación predeterminada para compatibilidad
export default {
    initMermaidSystem,
    loadMermaidLibrary,
    updateMermaidTheme,
    refreshAllMermaidDiagrams,
    convertMermaidToSVG,
    downloadMermaidAsSVG,
    initializeMermaidDiagram,
    getMermaidStatus,
    forceSyncMermaid
  };

  document.addEventListener('click', function(event) {
    if (event.target.closest('.retry-render-btn')) {
      const button = event.target.closest('.retry-render-btn');
      
      // Prevenir comportamiento predeterminado si hay un onClick
      event.preventDefault();
      
      // Encontrar el mensaje AI que contiene este diagrama
      const messageElement = button.closest('.ai-message');
      if (!messageElement) {
        console.error('No se pudo encontrar el mensaje contenedor del diagrama');
        return;
      }
      
      console.log('Intentando reintentar mensaje con diagrama Mermaid');
      
      if (typeof window.handleRetryAction === 'function') {
        window.handleRetryAction(messageElement);
        return;
      }
      
      // Alternativa si handleRetryAction no está disponible
      messageElement.classList.add('processing');
      
      const profileElement = messageElement.querySelector('.ai-profile');
      if (profileElement) {
        profileElement.classList.add('thinking');
      }
      
      const contentElement = messageElement.querySelector('.message-content');
      if (contentElement) {
        const originalContent = contentElement.innerHTML;
        
        contentElement.innerHTML = `
          <div class="thought-bubble">
            <div class="thought-bubbles">
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
              <div class="thought-bubble-dot"></div>
            </div>
          </div>
        `;
        
        setTimeout(() => {
          contentElement.innerHTML = originalContent;
          
          messageElement.classList.remove('processing');
          if (profileElement) {
            profileElement.classList.remove('thinking');
          }
          
          location.reload();
        }, 2000);
      }
    }
  });
  
  console.log('Manejador de eventos para botones de reintentar diagramas instalado');