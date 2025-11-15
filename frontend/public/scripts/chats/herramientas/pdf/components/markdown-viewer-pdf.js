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
  
  actions.appendChild(searchBtn);
  actions.appendChild(copyBtn);
  
  // Ensamblar toolbar
  toolbar.appendChild(title);
  toolbar.appendChild(actions);

  addEvent(copyBtn, 'click', () => {
    if (contentElement && contentElement.textContent) {
      navigator.clipboard.writeText(contentElement.textContent)
        .then(() => {
          addClass(copyBtn, 'copied');
          showTemporaryMessage('Acadel copió todo el contenido');
          
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
  
  document.body.appendChild(searchPanel);
  
  hideElement(searchPanel);
  
  // Eventos del panel de búsqueda
  addEvent(closeButton, 'click', toggleSearchPanel);
  addEvent(searchClearButton, 'click', clearSearch);
  addEvent(searchInput, 'keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
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
    showElement(searchPanel);
    addClass(searchPanel, 'visible');
    
    // Enfocar el input después de la animación
    setTimeout(() => {
      searchInput.focus();
    }, 300);
  } else {
    removeClass(searchPanel, 'visible');
    
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

  addEvent(document, 'mousedown', (e) => {
    if (selectionToolbar && !selectionToolbar.contains(e.target) && !contentElement.contains(e.target)) {
      hideSelectionToolbar();
    }
  });
  
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
    
    if (viewerState.search.active) {
      clearSearchHighlights();
    }
    
    viewerState.search.active = false;
    viewerState.search.results = [];
    viewerState.search.currentIndex = -1;
    viewerState.search.term = '';
    
    return;
  }
  
  viewerState.search.term = term;
  viewerState.search.active = true;
  
  clearSearchHighlights();
  
  // Realizar la búsqueda
  const regex = new RegExp(escapeRegExp(term), 'gi');
  const content = contentElement.innerHTML;
  
  const highlightedContent = content.replace(regex, match => 
    `<mark class="search-highlight">${match}</mark>`
  );
  
  contentElement.innerHTML = highlightedContent;
  
  // Recolectar todos los elementos resaltados
  const highlights = contentElement.querySelectorAll('.search-highlight');
  viewerState.search.results = Array.from(highlights);
  viewerState.search.currentIndex = viewerState.search.results.length > 0 ? 0 : -1;
  
  updateSearchResultCounter();
  
  updateSearchNavigationButtons();
  
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
  
  results.forEach(element => {
    removeClass(element, 'current-highlight');
  });
  
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
  
  if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    const offset = elementRect.top - containerRect.top - (containerRect.height / 3);
    contentElement.scrollTop += offset;
  }
}

/**
 * Limpia la búsqueda actual
 */
function clearSearch() {
  if (searchInput) {
    searchInput.value = '';
  }
  
  clearSearchHighlights();
  
  viewerState.search.active = false;
  viewerState.search.results = [];
  viewerState.search.currentIndex = -1;
  viewerState.search.term = '';
  
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
  
  const highlights = contentElement.querySelectorAll('.search-highlight, .current-highlight');
  
  highlights.forEach(highlight => {
    const textNode = document.createTextNode(highlight.textContent);
    highlight.parentNode.replaceChild(textNode, highlight);
  });
  
  contentElement.normalize();
}

/**
 * Maneja la selección de texto con lógica simplificada
 * @param {MouseEvent} e - Evento mouseup
 */
function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText === '') {
    // No ocultar inmediatamente para permitir clic en botones
    setTimeout(() => {
      if (!selectionToolbar.contains(document.activeElement)) {
        hideSelectionToolbar();
      }
    }, 100);
    return;
  }
  
  viewerState.currentSelection = selectedText;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  showSelectionToolbar(rect.left + rect.width/2, rect.top);
}

/**
 * Muestra la barra de herramientas en posición fija
 * @param {number} x - Posición X para centrar la barra
 * @param {number} y - Posición Y superior
 */
function showSelectionToolbar(x, y) {
  if (!selectionToolbar) return;
  
  selectionToolbar.style.display = 'flex';
  selectionToolbar.style.opacity = '0';
  selectionToolbar.style.visibility = 'hidden';
  
  setTimeout(() => {
    const toolbarHeight = selectionToolbar.offsetHeight;
    const toolbarWidth = selectionToolbar.offsetWidth;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let posX = x;
    if (x - (toolbarWidth / 2) < 10) {
      posX = 10 + (toolbarWidth / 2);
    } else if (x + (toolbarWidth / 2) > viewportWidth - 10) {
      posX = viewportWidth - 10 - (toolbarWidth / 2);
    }
    
    // Dejar un espacio (15px) entre la selección y la barra
    let posY = y - toolbarHeight - 15;
    if (posY < 10) {
      // Si no hay espacio arriba, mostrar debajo de la selección
      posY = y + 25;
      addClass(selectionToolbar, 'position-below');
    } else {
      removeClass(selectionToolbar, 'position-below');
    }
    
    selectionToolbar.style.position = 'fixed';
    selectionToolbar.style.left = `${posX}px`;
    selectionToolbar.style.top = `${posY}px`;
    selectionToolbar.style.transform = 'translateX(-50%)'; // Centrar horizontalmente
    selectionToolbar.style.zIndex = '99999';
    
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
      const chatController = await import('../core/chat-controller-pdf.js');
      
      if (chatController && chatController.handleSendMessage) {
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = message;
          
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
    let sentSuccessfully = false;
    
    try {
      const chatController = await import('../core/chat-controller-pdf.js');
      
      if (chatController && chatController.handleSendMessage) {
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = text;
          
          const event = new CustomEvent('sendMessageRequest');
          window.dispatchEvent(event);
          
          sentSuccessfully = true;
        }
      } else if (window.handleSendMessage) {
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
  
  hideSelectionToolbar();
  
  // IMPORTANTE: En el visor de markdown (PDF), siempre activamos modo PDF
  // El visor de markdown se usa exclusivamente para contenido de PDF extraído
  setPDFPreviewMode(true);
  console.log('Modo PDF preview activado para renderizado');
  
  // Utilizar la función parseMarkdownToHTML de markdown.js
  const htmlContent = parseMarkdownToHTML(content);
  
  contentElement.innerHTML = htmlContent;
  
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
    
    import('../../../matematico/math/mathjax-config.js')
      .then(module => {
        console.log('Módulo mathjax-config importado correctamente');
        if (typeof module.renderMath === 'function') {
          console.log('Llamando a renderMath');
          module.renderMath(contentElement)
            .then(() => console.log('Matemáticas renderizadas correctamente'))
            .catch(err => {
              console.warn('Error al renderizar matemáticas (1):', err);
              tryDirectMathJaxRendering();
            });
        } else if (typeof module.default?.renderMath === 'function') {
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
  const headers = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headers.forEach((header, index) => {
    const id = `header-${index}-${Date.now()}`;
    header.id = id;
  });
  
  contentElement.querySelectorAll('table').forEach(table => {
    addClass(table, 'markdown-table');
    
    // Envolver tabla en contenedor para scroll horizontal
    if (!table.parentElement.classList.contains('table-wrapper')) {
      const wrapper = createElement('div', { className: 'table-wrapper' });
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
  
  contentElement.querySelectorAll('ul, ol').forEach(list => {
    addClass(list, 'markdown-list');
  });
  
  // Destacar bloques de código
  contentElement.querySelectorAll('pre code').forEach(code => {
    addClass(code, 'markdown-code');
    
    if (window.hljs) {
      window.hljs.highlightElement(code);
    }
  });
  
  contentElement.querySelectorAll('img').forEach(img => {
    addClass(img, 'markdown-image');
    
    addEvent(img, 'click', () => {
      showImageLightbox(img.src, img.alt);
    });
  });
  
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
  let messageElement = document.querySelector('.temporary-message');
  
  if (!messageElement) {
    messageElement = createElement('div', { className: 'temporary-message' });
    document.body.appendChild(messageElement);
  }
  
  messageElement.textContent = sanitizeText(message);
  
  if (isError) {
    addClass(messageElement, 'error');
  } else {
    removeClass(messageElement, 'error');
  }
  
  addClass(messageElement, 'active');
  
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
    
    addEvent(lightbox, 'click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close') || e.target.parentElement.classList.contains('lightbox-close')) {
        removeClass(lightbox, 'active');
      }
    });
  }
  
  const img = lightbox.querySelector('img');
  img.src = src;
  img.alt = sanitizeText(alt) || 'Imagen';
  
  addClass(lightbox, 'active');
}

export default {
  initMarkdownViewer,
  renderMarkdownContent
};