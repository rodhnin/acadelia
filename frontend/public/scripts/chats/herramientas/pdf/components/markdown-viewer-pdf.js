/**
 * markdown-viewer.js - Visor del contenido procesado en markdown
 * Maneja la visualización del contenido extraído del PDF en formato markdown.
 */

import { getPDFState } from '../services/pdf-state.js';
import { sendMessage } from '../api/messages-pdf.js';
import { sendPDFQuery } from '../services/pdf-api.js';
import { 
  parseMarkdownToHTML, 
  setPDFPreviewMode, 
  containsMathExpressions 
} from '../utils/markdown-pdf.js';
import { 
  createElement, 
  createElementWithHTML, 
  addEvent,
  hideElement,
  showElement,
  addClass,
  removeClass,
  sanitizeText,
  clearElement
} from '../../../shared/dom-helpers.js';

// Referencias DOM
let container;
let contentElement;
let selectionToolbar;
let searchPanel;
let searchInput;
let searchResultCounter;
let searchPrevButton;
let searchNextButton;

// Estado del visor
const viewerState = {
  isInitialized: false,
  selections: [],
  currentSelection: null,
  search: {
    active: false,
    results: [],
    currentIndex: -1,
    term: '',
    panelVisible: false
  }
};

/**
 * Inicializa el visor de markdown
 * @param {HTMLElement} containerElement - Elemento contenedor
 */
export function initMarkdownViewer(containerElement) {
  if (!containerElement) {
    console.error('No se proporcionó un contenedor para el visor de markdown');
    return;
  }

  container = containerElement;
  
  createViewerElements();
  createSearchPanel();
  attachEventListeners();
  
  viewerState.isInitialized = true;
}

/**
 * Crea los elementos DOM del visor utilizando dom-helpers
 */
function createViewerElements() {
  // Crear toolbar principal
  const toolbar = createElement('div', { className: 'markdown-viewer-toolbar' });
  
  // Título con icono Boxicons en lugar de emoji
  const title = createElement('div', { className: 'markdown-viewer-title' });
  title.innerHTML = '<i class="bx bx-cube-alt"></i> Contenido extraído';
  
  // Acciones de toolbar
  const actions = createElement('div', { className: 'markdown-viewer-actions' });
  
  // Botón de copiar
  const copyBtn = createElement('button', { 
    className: 'markdown-copy-btn', 
    title: 'Copiar todo' 
  });
  copyBtn.innerHTML = '<i class="bx bx-copy"></i>';
  
  // Botón de búsqueda (con mismo estilo que el botón de copiar)
  const searchBtn = createElement('button', { 
    className: 'markdown-copy-btn', // Usando la misma clase que el botón de copiar
    title: 'Buscar en el texto' 
  });
  searchBtn.innerHTML = '<i class="bx bx-search"></i>';
  
  // Añadir botones a las acciones en el orden invertido: primero búsqueda, luego copiar
  actions.appendChild(searchBtn);
  actions.appendChild(copyBtn);
  
  // Ensamblar toolbar
  toolbar.appendChild(title);
  toolbar.appendChild(actions);

  // Copiar con animación
  addEvent(copyBtn, 'click', () => {
    if (contentElement && contentElement.textContent) {
      navigator.clipboard.writeText(contentElement.textContent)
        .then(() => {
          // Añadir clase para animación
          addClass(copyBtn, 'copied');
          showTemporaryMessage('Acadel copió todo el contenido');
          
          // Quitar clase después de la animación
          setTimeout(() => {
            removeClass(copyBtn, 'copied');
          }, 1000);
        })
        .catch(err => {
          console.error('Error al copiar:', err);
          showTemporaryMessage('Acadel no pudo copiar el contenido', true);
        });
    }
  });
  
  // Abrir panel de búsqueda
  addEvent(searchBtn, 'click', toggleSearchPanel);
  
  // Contenido principal
  contentElement = createElement('div', { className: 'markdown-viewer-content' });
  
  // Barra de herramientas de selección - VERSIÓN NUEVA
  selectionToolbar = createElement('div', { className: 'markdown-selection-toolbar' });
  
  // Botones para acciones de selección
  const actionButtons = [
    { action: 'copy', title: 'Copiar', icon: 'bx-copy-alt' },
    { action: 'analyze', title: 'Analizar', icon: 'bx-analyse' },
    { action: 'summarize', title: 'Resumir', icon: 'bx-book-content' },
    { action: 'explain', title: 'Explicar', icon: 'bx-question-mark' },
    { action: 'chat', title: 'Enviar al chat', icon: 'bx-send' }
  ];
  
  actionButtons.forEach(btn => {
    const button = createElement('button', {
      className: 'selection-action-btn',
      title: btn.title,
      dataset: { action: btn.action }
    });
    
    button.innerHTML = `<i class='bx ${btn.icon}'></i>`;
    selectionToolbar.appendChild(button);
  });
  
  // Ensamblar todo
  clearElement(container);
  container.appendChild(toolbar);
  container.appendChild(contentElement);
  document.body.appendChild(selectionToolbar); // Añadir al body en vez del contenedor
  
  // Ocultar toolbar de selección inicialmente
  hideElement(selectionToolbar);
}

/**
 * Crea el panel flotante de búsqueda
 */
function createSearchPanel() {
  // Panel contenedor flotante
  searchPanel = createElement('div', { className: 'markdown-search-panel' });
  
  // Encabezado con título y botón de cerrar
  const panelHeader = createElement('div', { className: 'search-panel-header' });
  const panelTitle = createElement('div', { className: 'search-panel-title' });
  panelTitle.innerHTML = '<i class="bx bx-search"></i> Buscar en el texto';
  
  const closeButton = createElement('button', { 
    className: 'search-panel-close',
    title: 'Cerrar búsqueda'
  });
  closeButton.innerHTML = '<i class="bx bx-x"></i>';
  
  panelHeader.appendChild(panelTitle);
  panelHeader.appendChild(closeButton);
  
  // Contenido del panel
  const panelContent = createElement('div', { className: 'search-panel-content' });
  
  // Barra de búsqueda
  const searchBar = createElement('div', { className: 'search-bar' });
  
  // Input de búsqueda con wrapper
  const searchInputWrapper = createElement('div', { className: 'search-input-wrapper' });
  searchInputWrapper.innerHTML = '<i class="bx bx-search"></i>';
  
  searchInput = createElement('input', {
    type: 'text',
    placeholder: 'Ingresa el texto a buscar',
    className: 'search-input'
  });
  
  searchInputWrapper.appendChild(searchInput);
  
  // Botón para limpiar la búsqueda
  const searchClearButton = createElement('button', {
    className: 'search-clear-btn',
    title: 'Limpiar búsqueda'
  });
  searchClearButton.innerHTML = '<i class="bx bx-x"></i>';
  
  // Montar la barra de búsqueda
  searchBar.appendChild(searchInputWrapper);
  searchBar.appendChild(searchClearButton);
  
  // Resultados y navegación
  const searchResults = createElement('div', { className: 'search-results' });
  
  // Contador de resultados
  searchResultCounter = createElement('div', { className: 'search-result-counter' });
  searchResultCounter.textContent = 'Ingresa un término para buscar';
  
  // Botones de navegación
  const searchNavigation = createElement('div', { className: 'search-navigation' });
  
  searchPrevButton = createElement('button', {
    className: 'search-nav-btn search-prev',
    title: 'Resultado anterior'
  });
  searchPrevButton.innerHTML = '<i class="bx bx-chevron-up"></i>';
  searchPrevButton.disabled = true;
  
  searchNextButton = createElement('button', {
    className: 'search-nav-btn search-next',
    title: 'Resultado siguiente'
  });
  searchNextButton.innerHTML = '<i class="bx bx-chevron-down"></i>';
  searchNextButton.disabled = true;
  
  searchNavigation.appendChild(searchPrevButton);
  searchNavigation.appendChild(searchNextButton);
  
  // Ensamblar resultados y navegación
  searchResults.appendChild(searchResultCounter);
  searchResults.appendChild(searchNavigation);
  
  // Ensamblar el contenido del panel
  panelContent.appendChild(searchBar);
  panelContent.appendChild(searchResults);
  
  // Ensamblar el panel completo
  searchPanel.appendChild(panelHeader);
  searchPanel.appendChild(panelContent);
  
  // Añadir al body
  document.body.appendChild(searchPanel);
  
  // Ocultar panel inicialmente
  hideElement(searchPanel);
  
  // Eventos del panel de búsqueda
  addEvent(closeButton, 'click', toggleSearchPanel);
  addEvent(searchClearButton, 'click', clearSearch);
  addEvent(searchInput, 'keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
    // Cerrar al presionar Escape
    if (e.key === 'Escape') {
      toggleSearchPanel();
    }
  });
  
  // Auto-focus al input cuando se muestra el panel
  addEvent(searchPanel, 'transitionend', () => {
    if (viewerState.search.panelVisible) {
      searchInput.focus();
    }
  });
  
  // Navegación entre resultados
  addEvent(searchPrevButton, 'click', goToPreviousResult);
  addEvent(searchNextButton, 'click', goToNextResult);
}

/**
 * Muestra u oculta el panel de búsqueda
 */
function toggleSearchPanel() {
  viewerState.search.panelVisible = !viewerState.search.panelVisible;
  
  if (viewerState.search.panelVisible) {
    // Mostrar panel
    showElement(searchPanel);
    addClass(searchPanel, 'visible');
    
    // Enfocar el input después de la animación
    setTimeout(() => {
      searchInput.focus();
    }, 300);
  } else {
    // Ocultar panel
    removeClass(searchPanel, 'visible');
    
    // Esperar a que termine la animación para ocultar completamente
    setTimeout(() => {
      if (!viewerState.search.panelVisible) {
        hideElement(searchPanel);
      }
    }, 300);
  }
}

/**
 * Agrega event listeners a los controles usando dom-helpers
 */
function attachEventListeners() {  
  // Listener para selección de texto
  if (contentElement) {
    addEvent(contentElement, 'mouseup', handleTextSelection);
  }
  
  // Eventos para los botones de acción de selección
  if (selectionToolbar) {
    const actionButtons = selectionToolbar.querySelectorAll('.selection-action-btn');
    actionButtons.forEach(button => {
      addEvent(button, 'click', (e) => {
        const action = button.getAttribute('data-action');
        handleSelectionAction(action);
      });
    });
  }

  // Ocultar toolbar cuando se haga clic fuera
  addEvent(document, 'mousedown', (e) => {
    if (selectionToolbar && !selectionToolbar.contains(e.target) && !contentElement.contains(e.target)) {
      hideSelectionToolbar();
    }
  });
  
  // Manejar ESC para cancelar selección
  addEvent(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (selectionToolbar.classList.contains('active')) {
        hideSelectionToolbar();
      }
    }
  });
}

/**
 * Realiza la búsqueda en el contenido
 * @param {string} term - Término a buscar
 */
function performSearch(term) {
  term = term.trim();
  
  // Si el término está vacío o es demasiado corto, no hacer nada
  if (!term || term.length < 2) {
    searchResultCounter.textContent = 'Ingresa al menos 2 caracteres';
    searchPrevButton.disabled = true;
    searchNextButton.disabled = true;
    
    // Limpiar resaltados anteriores si hay
    if (viewerState.search.active) {
      clearSearchHighlights();
    }
    
    viewerState.search.active = false;
    viewerState.search.results = [];
    viewerState.search.currentIndex = -1;
    viewerState.search.term = '';
    
    return;
  }
  
  // Actualizar estado
  viewerState.search.term = term;
  viewerState.search.active = true;
  
  // Limpiar resaltados anteriores si hay
  clearSearchHighlights();
  
  // Realizar la búsqueda
  const regex = new RegExp(escapeRegExp(term), 'gi');
  const content = contentElement.innerHTML;
  
  // Reemplazar todas las coincidencias con spans resaltados
  const highlightedContent = content.replace(regex, match => 
    `<mark class="search-highlight">${match}</mark>`
  );
  
  // Actualizar el contenido con los resaltados
  contentElement.innerHTML = highlightedContent;
  
  // Recolectar todos los elementos resaltados
  const highlights = contentElement.querySelectorAll('.search-highlight');
  viewerState.search.results = Array.from(highlights);
  viewerState.search.currentIndex = viewerState.search.results.length > 0 ? 0 : -1;
  
  // Actualizar contador de resultados
  updateSearchResultCounter();
  
  // Actualizar estado de botones
  updateSearchNavigationButtons();
  
  // Marcar el resultado actual si hay resultados
  if (viewerState.search.results.length > 0) {
    highlightCurrentResult();
    scrollToCurrentResult();
  } else {
    // No hay resultados, mostrar mensaje
    searchResultCounter.textContent = 'No se encontraron resultados';
  }
}

/**
 * Escapa caracteres especiales para RegExp
 * @param {string} string - Cadena a escapar
 * @returns {string} Cadena escapada
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Actualiza el contador de resultados
 */
function updateSearchResultCounter() {
  const { results, currentIndex } = viewerState.search;
  
  if (results.length > 0) {
    searchResultCounter.textContent = `${currentIndex + 1} de ${results.length}`;
  } else {
    searchResultCounter.textContent = 'No se encontraron resultados';
  }
}

/**
 * Actualiza el estado de los botones de navegación
 */
function updateSearchNavigationButtons() {
  const { results, currentIndex } = viewerState.search;
  
  searchPrevButton.disabled = results.length === 0 || currentIndex <= 0;
  searchNextButton.disabled = results.length === 0 || currentIndex >= results.length - 1;
}

/**
 * Resalta el resultado actual
 */
function highlightCurrentResult() {
  const { results, currentIndex } = viewerState.search;
  
  // Quitar el resaltado actual de todos
  results.forEach(element => {
    removeClass(element, 'current-highlight');
  });
  
  // Aplicar el resaltado actual
  if (currentIndex >= 0 && currentIndex < results.length) {
    addClass(results[currentIndex], 'current-highlight');
  }
}

/**
 * Navega al resultado anterior
 */
function goToPreviousResult() {
  const { results, currentIndex } = viewerState.search;
  
  if (results.length === 0 || currentIndex <= 0) return;
  
  viewerState.search.currentIndex--;
  highlightCurrentResult();
  scrollToCurrentResult();
  updateSearchResultCounter();
  updateSearchNavigationButtons();
}

/**
 * Navega al resultado siguiente
 */
function goToNextResult() {
  const { results, currentIndex } = viewerState.search;
  
  if (results.length === 0 || currentIndex >= results.length - 1) return;
  
  viewerState.search.currentIndex++;
  highlightCurrentResult();
  scrollToCurrentResult();
  updateSearchResultCounter();
  updateSearchNavigationButtons();
}

/**
 * Desplaza la vista al resultado actual
 */
function scrollToCurrentResult() {
  const { results, currentIndex } = viewerState.search;
  
  if (results.length === 0 || currentIndex < 0 || currentIndex >= results.length) return;
  
  const currentElement = results[currentIndex];
  
  // Asegurar que el elemento es visible
  const elementRect = currentElement.getBoundingClientRect();
  const containerRect = contentElement.getBoundingClientRect();
  
  // Verificar si el elemento está fuera de vista
  if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    // Calcular una posición que coloca el elemento a 1/3 de la altura del contenedor
    const offset = elementRect.top - containerRect.top - (containerRect.height / 3);
    contentElement.scrollTop += offset;
  }
}

/**
 * Limpia la búsqueda actual
 */
function clearSearch() {
  // Limpiar campos
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Limpiar resaltados
  clearSearchHighlights();
  
  // Resetear estado
  viewerState.search.active = false;
  viewerState.search.results = [];
  viewerState.search.currentIndex = -1;
  viewerState.search.term = '';
  
  // Actualizar UI
  searchResultCounter.textContent = 'Ingresa un término para buscar';
  searchPrevButton.disabled = true;
  searchNextButton.disabled = true;
  
  // Enfocar el input de búsqueda
  if (searchInput && viewerState.search.panelVisible) {
    searchInput.focus();
  }
}

/**
 * Limpia los resaltados de búsqueda
 */
function clearSearchHighlights() {
  // Si no hay resultados activos, no hacer nada
  if (!viewerState.search.results.length) return;
  
  // Quitar spans de resaltado manteniendo el texto
  const highlights = contentElement.querySelectorAll('.search-highlight, .current-highlight');
  
  highlights.forEach(highlight => {
    const textNode = document.createTextNode(highlight.textContent);
    highlight.parentNode.replaceChild(textNode, highlight);
  });
  
  // Normalizar nodos de texto adyacentes
  contentElement.normalize();
}

/**
 * Maneja la selección de texto con lógica simplificada
 * @param {MouseEvent} e - Evento mouseup
 */
function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // Validar que hay texto seleccionado
  if (selectedText === '') {
    // No ocultar inmediatamente para permitir clic en botones
    setTimeout(() => {
      if (!selectionToolbar.contains(document.activeElement)) {
        hideSelectionToolbar();
      }
    }, 100);
    return;
  }
  
  // Guardar la selección actual
  viewerState.currentSelection = selectedText;
  
  // Obtener las coordenadas de la selección
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Mostrar la barra justo encima de la selección
  showSelectionToolbar(rect.left + rect.width/2, rect.top);
}

/**
 * Muestra la barra de herramientas en posición fija
 * @param {number} x - Posición X para centrar la barra
 * @param {number} y - Posición Y superior
 */
function showSelectionToolbar(x, y) {
  if (!selectionToolbar) return;
  
  // Obtener dimensiones de la barra (necesitamos mostrarla brevemente para medir)
  selectionToolbar.style.display = 'flex';
  selectionToolbar.style.opacity = '0';
  selectionToolbar.style.visibility = 'hidden';
  
  // Esperar un momento para que el DOM se actualice
  setTimeout(() => {
    const toolbarHeight = selectionToolbar.offsetHeight;
    const toolbarWidth = selectionToolbar.offsetWidth;
    
    // Calcular límites de pantalla
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Determinar posición X asegurando que no se salga por los lados
    let posX = x;
    if (x - (toolbarWidth / 2) < 10) {
      posX = 10 + (toolbarWidth / 2);
    } else if (x + (toolbarWidth / 2) > viewportWidth - 10) {
      posX = viewportWidth - 10 - (toolbarWidth / 2);
    }
    
    // Determinar posición Y asegurando que no se salga por arriba
    // Dejar un espacio (15px) entre la selección y la barra
    let posY = y - toolbarHeight - 15;
    if (posY < 10) {
      // Si no hay espacio arriba, mostrar debajo de la selección
      posY = y + 25;
      addClass(selectionToolbar, 'position-below');
    } else {
      removeClass(selectionToolbar, 'position-below');
    }
    
    // Establecer posición
    selectionToolbar.style.position = 'fixed';
    selectionToolbar.style.left = `${posX}px`;
    selectionToolbar.style.top = `${posY}px`;
    selectionToolbar.style.transform = 'translateX(-50%)'; // Centrar horizontalmente
    selectionToolbar.style.zIndex = '99999';
    
    // Mostrar la barra
    selectionToolbar.style.visibility = 'visible';
    selectionToolbar.style.opacity = '1';
    addClass(selectionToolbar, 'active');
    
    console.log(`Toolbar posicionado en: x=${posX}, y=${posY}`);
  }, 10);
}

/**
 * Maneja una acción sobre la selección actual
 * @param {string} action - Acción a realizar (copy, analyze, summarize, etc.)
 */
async function handleSelectionAction(action) {
  if (!viewerState.currentSelection) return;
  
  const selectedText = viewerState.currentSelection;
  
  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(selectedText)
        .then(() => {
          showTemporaryMessage('Acadel copió el texto seleccionado');
        })
        .catch(err => {
          console.error('Error al copiar:', err);
          showTemporaryMessage('Acadel no pudo copiar ese texto', true);
        });
      
      hideSelectionToolbar();
      break;
      
    case 'analyze':
      await sendPDFPrompt(`Analiza detalladamente el siguiente texto:\n\n${selectedText}`);
      hideSelectionToolbar();
      break;
      
    case 'summarize':
      await sendPDFPrompt(`Resume el siguiente texto en puntos clave:\n\n${selectedText}`);
      hideSelectionToolbar();
      break;
      
    case 'explain':
      await sendPDFPrompt(`Explica de manera detallada el significado de:\n\n${selectedText}`);
      hideSelectionToolbar();
      break;
      
    case 'chat':
      // Enviar texto directamente al chat
      await sendTextToChat(selectedText);
      hideSelectionToolbar();
      break;
      
    default:
      console.warn('Acción de selección no implementada:', action);
      hideSelectionToolbar();
  }
}

/**
 * Envía un prompt relacionado con el PDF al sistema de chat
 * @param {string} message - Mensaje a enviar
 */
async function sendPDFPrompt(message) {
  try {
    // Primero verificar si podemos usar handleSendMessage del chat-controller
    let sentSuccessfully = false;
    
    try {
      // Intentar importar handleSendMessage de chat-controller
      const chatController = await import('../core/chat-controller-pdf.js');
      
      if (chatController && chatController.handleSendMessage) {
        // Configurar mensaje en el textarea
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = message;
          
          // Disparar evento para avisarle al sistema de chat
          const event = new CustomEvent('sendMessageRequest');
          window.dispatchEvent(event);
          
          sentSuccessfully = true;
        }
      }
    } catch (importError) {
      console.warn('No se pudo importar chat-controller:', importError);
    }
    
    // Si no pudimos usar handleSendMessage, usamos la API directamente
    if (!sentSuccessfully) {
      await sendPDFQuery(message);
      showTemporaryMessage('Acadel envió tu consulta al chat');
    }
  } catch (error) {
    console.error('Error al enviar prompt:', error);
    showTemporaryMessage('Error al enviar el mensaje', true);
  }
}

/**
 * Envía texto al chat
 * @param {string} text - Texto a enviar
 */
async function sendTextToChat(text) {
  try {
    // Verificar si podemos usar handleSendMessage
    let sentSuccessfully = false;
    
    try {
      // Usar sistema de chat-controller si está disponible
      const chatController = await import('../core/chat-controller-pdf.js');
      
      if (chatController && chatController.handleSendMessage) {
        // Configurar mensaje en textarea
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = text;
          
          // Disparar evento para enviar mensaje
          const event = new CustomEvent('sendMessageRequest');
          window.dispatchEvent(event);
          
          sentSuccessfully = true;
        }
      } else if (window.handleSendMessage) {
        // Usar versión global si está disponible
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = text;
          window.handleSendMessage();
          sentSuccessfully = true;
        }
      }
    } catch (importError) {
      console.warn('No se pudo importar chat-controller:', importError);
    }
    
    // Si no pudimos usar handleSendMessage, usamos la API directamente
    if (!sentSuccessfully) {
      const chatId = getPDFState('currentChatId');
      await sendMessage(text, chatId);
      showTemporaryMessage('Acadel envió el texto al chat');
    }
  } catch (error) {
    console.error('Error al enviar texto:', error);
    showTemporaryMessage('Acadel no pudo enviar el mensaje', true);
  }
}

/**
 * Oculta la barra de herramientas de selección
 */
function hideSelectionToolbar() {
  if (!selectionToolbar) return;
  
  removeClass(selectionToolbar, 'active');
  selectionToolbar.style.display = 'none';
  selectionToolbar.style.opacity = '0';
  viewerState.currentSelection = null;
}

/**
 * Renderiza el contenido markdown utilizando markdown.js
 * Versión mejorada para asegurar renderizado LaTeX en PDF
 * @param {string} content - Contenido markdown
 */
export function renderMarkdownContent(content) {
  if (!contentElement) return;
  
  // Limpiar selección actual
  hideSelectionToolbar();
  
  // IMPORTANTE: En el visor de markdown (PDF), siempre activamos modo PDF
  // El visor de markdown se usa exclusivamente para contenido de PDF extraído
  setPDFPreviewMode(true);
  console.log('Modo PDF preview activado para renderizado');
  
  // Utilizar la función parseMarkdownToHTML de markdown.js
  const htmlContent = parseMarkdownToHTML(content);
  
  // Renderizar el contenido
  contentElement.innerHTML = htmlContent;
  
  // Añadir clases para formatear correctamente
  formatMarkdownContent();
  
  // Si hay una búsqueda activa, volver a aplicarla
  if (viewerState.search.active && viewerState.search.term) {
    performSearch(viewerState.search.term);
  }
  
  // MEJORADO: Renderizar expresiones matemáticas si están presentes
  // Realizamos una detección más agresiva de fórmulas matemáticas
  if (containsMathExpressions(content)) {
    console.log('Detectadas expresiones matemáticas en el contenido PDF');
    
    // Forzar clase math-content en el contenedor para ayudar a MathJax
    contentElement.classList.add('math-content');
    
    // Intentar primero con mathjax-config.js
    import('../../../matematico/math/mathjax-config.js')
      .then(module => {
        console.log('Módulo mathjax-config importado correctamente');
        if (typeof module.renderMath === 'function') {
          console.log('Llamando a renderMath');
          module.renderMath(contentElement)
            .then(() => console.log('Matemáticas renderizadas correctamente'))
            .catch(err => {
              console.warn('Error al renderizar matemáticas (1):', err);
              // Fallback a renderización directa con MathJax global
              tryDirectMathJaxRendering();
            });
        } else if (typeof module.default?.renderMath === 'function') {
          // Intentar con export default
          console.log('Llamando a default.renderMath');
          module.default.renderMath(contentElement)
            .catch(err => {
              console.warn('Error al renderizar matemáticas (2):', err);
              tryDirectMathJaxRendering();
            });
        } else if (typeof renderMathInContainer === 'function') {
          console.log('Llamando a renderMathInContainer');
          renderMathInContainer(contentElement)
            .catch(err => {
              console.warn('Error al renderizar matemáticas (3):', err);
              tryDirectMathJaxRendering();
            });
        } else {
          console.warn('No se encontró función de renderizado matemático');
          tryDirectMathJaxRendering();
        }
      })
      .catch(err => {
        console.warn('Error al importar mathjax-config.js:', err);
        // Intentar alternativas
        tryDirectMathJaxRendering();
      });
  }
}

/**
 * Intenta renderizar matemáticas directamente con MathJax global
 * Función de respaldo cuando fallan otros métodos
 */
function tryDirectMathJaxRendering() {
  console.log('Intentando renderización directa con MathJax');
  
  if (window.MathJax) {
    try {
      if (typeof window.MathJax.typeset === 'function') {
        window.MathJax.typeset([contentElement]);
        console.log('Renderizado con MathJax.typeset exitoso');
      } else if (typeof window.MathJax.Hub?.Queue === 'function') {
        // MathJax v2.x
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, contentElement]);
        console.log('Renderizado con MathJax.Hub.Queue exitoso');
      } else if (window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([contentElement])
          .then(() => console.log('Renderizado con MathJax.typesetPromise exitoso'))
          .catch(err => console.warn('Error en MathJax.typesetPromise:', err));
      } else {
        console.warn('MathJax disponible pero sin método de renderizado conocido');
      }
    } catch (error) {
      console.error('Error al usar MathJax global:', error);
    }
  } else {
    console.warn('MathJax no está disponible globalmente');
  }
}

/**
 * Aplica formato adicional al contenido markdown renderizado
 */
function formatMarkdownContent() {
  // Crear IDs únicos para todos los encabezados
  const headers = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headers.forEach((header, index) => {
    const id = `header-${index}-${Date.now()}`;
    header.id = id;
  });
  
  // Agregar clases a elementos específicos
  contentElement.querySelectorAll('table').forEach(table => {
    addClass(table, 'markdown-table');
    
    // Envolver tabla en contenedor para scroll horizontal
    if (!table.parentElement.classList.contains('table-wrapper')) {
      const wrapper = createElement('div', { className: 'table-wrapper' });
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
  
  // Aplicar clases a listas
  contentElement.querySelectorAll('ul, ol').forEach(list => {
    addClass(list, 'markdown-list');
  });
  
  // Destacar bloques de código
  contentElement.querySelectorAll('pre code').forEach(code => {
    addClass(code, 'markdown-code');
    
    // Intentar aplicar resaltado si está disponible
    if (window.hljs) {
      window.hljs.highlightElement(code);
    }
  });
  
  // Añadir clases a imágenes
  contentElement.querySelectorAll('img').forEach(img => {
    addClass(img, 'markdown-image');
    
    // Añadir lightbox para imágenes
    addEvent(img, 'click', () => {
      showImageLightbox(img.src, img.alt);
    });
  });
  
  // Añadir clases a blockquotes
  contentElement.querySelectorAll('blockquote').forEach(quote => {
    addClass(quote, 'markdown-blockquote');
  });
}

/**
 * Muestra un mensaje temporal
 * @param {string} message - Mensaje a mostrar
 * @param {boolean} isError - Si es un mensaje de error
 */
function showTemporaryMessage(message, isError = false) {
  // Verificar si ya existe un mensaje
  let messageElement = document.querySelector('.temporary-message');
  
  if (!messageElement) {
    messageElement = createElement('div', { className: 'temporary-message' });
    document.body.appendChild(messageElement);
  }
  
  // Configurar mensaje
  messageElement.textContent = sanitizeText(message);
  
  if (isError) {
    addClass(messageElement, 'error');
  } else {
    removeClass(messageElement, 'error');
  }
  
  addClass(messageElement, 'active');
  
  // Ocultar después de un tiempo
  setTimeout(() => {
    removeClass(messageElement, 'active');
  }, 3000);
}

/**
 * Muestra un lightbox para imágenes
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 */
function showImageLightbox(src, alt) {
  // Crear lightbox si no existe
  let lightbox = document.querySelector('.markdown-image-lightbox');
  
  if (!lightbox) {
    lightbox = createElementWithHTML('div', { className: 'markdown-image-lightbox' }, `
      <div class="lightbox-content">
        <img src="" alt="" />
        <button class="lightbox-close">
          <i class='bx bx-x'></i>
        </button>
      </div>
    `);
    
    document.body.appendChild(lightbox);
    
    // Agregar evento para cerrar
    addEvent(lightbox, 'click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close') || e.target.parentElement.classList.contains('lightbox-close')) {
        removeClass(lightbox, 'active');
      }
    });
  }
  
  // Configurar imagen
  const img = lightbox.querySelector('img');
  img.src = src;
  img.alt = sanitizeText(alt) || 'Imagen';
  
  // Mostrar
  addClass(lightbox, 'active');
}

export default {
  initMarkdownViewer,
  renderMarkdownContent
};