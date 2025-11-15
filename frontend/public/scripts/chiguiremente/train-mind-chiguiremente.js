// Módulo renovado para entrenar la mente del asistente con subida de PDFs
import { showNotification, formatBytes, sleep, fetchWithCSRF, truncateText, setupImageFallback } from './utils-chiguiremente.js';

// Estado del módulo
const state = {
    files: [],
    processingStatus: 'idle', // idle, welcome, preparing, processing, completed, error
    progress: 0,
    currentOperation: '',
    logEntries: [],
    processingTimes: [],
    selectedAva: null,
    avas: [],
    carreras: [],
    filteredAvas: [],
    activeProcesses: new Map(), // Map para seguir múltiples procesos por ID
    results: {
        totalFiles: 0,
        totalPages: 0,
        fileResults: []
    },
    processingStartTime: null,
    carouselPosition: 0,
    carouselItemWidth: 320, // ancho aproximado de cada tarjeta + margen
    carouselVisibleItems: 4, // número de elementos visibles a la vez
    eventListenersAttached: false // Para evitar duplicación de listeners
};

/**
 * Estado del modal de embeddings
 */
const embeddingModalState = {
  avaId: null,
  filename: null,
  currentPage: 1,
  totalPages: 1,
  pages: [],
  isLoading: false
};

let activeModalStack = [];

/**
 * Registra un modal como activo y gestiona su manejo de la tecla Escape
 * @param {HTMLElement} modal - El elemento modal
 * @param {Function} closeCallback - Función para cerrar el modal
 */
function registerActiveModal(modal, closeCallback) {
  activeModalStack.push({
    modal: modal,
    closeFunc: closeCallback
  });
  
  document.removeEventListener('keydown', globalEscapeHandler);
  
  document.addEventListener('keydown', globalEscapeHandler);
}

/**
 * Desregistra un modal del stack de modales activos
 * @param {HTMLElement} modal - El elemento modal a desregistrar
 */
function unregisterActiveModal(modal) {
  activeModalStack = activeModalStack.filter(item => item.modal !== modal);
  
  // Si no quedan modales activos, quitar el listener global
  if (activeModalStack.length === 0) {
    document.removeEventListener('keydown', globalEscapeHandler);
  }
}

/**
 * Manejador global para la tecla Escape
 * Cierra solo el modal superior en el stack
 */
function globalEscapeHandler(e) {
  if (e.key === 'Escape' && activeModalStack.length > 0) {
    const topModal = activeModalStack[activeModalStack.length - 1];
    
    if (topModal && typeof topModal.closeFunc === 'function') {
      e.preventDefault();
      e.stopPropagation();
      topModal.closeFunc();
    }
  }
}

/**
 * Función para obtener elementos DOM de forma segura
 * Retorna el elemento o null si no existe
 */
function getElement(id) {
  return document.getElementById(id);
}

/**
 * Inicializa el módulo de entrenamiento
 */
export function initTrainMindModule() {
    console.log('Inicializando módulo renovado de entrenamiento...');
    
    if (window.location.hash === '#train-mind') {
        // Siempre mostrar la pantalla de bienvenida al inicializar
        resetToWelcomeView();
    }
    
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#train-mind') {
            // Siempre mostrar la pantalla de bienvenida cuando cambia a esta vista
            resetToWelcomeView();
        }
    });
    
    document.addEventListener('viewActivated', (event) => {
        if (event.detail.view === 'train-mind') {
            // Siempre mostrar la pantalla de bienvenida cuando se activa esta vista
            resetToWelcomeView();
        }
    });
    
    const continueBtn = document.getElementById('welcome-continue-btn');
    if (continueBtn) {
        continueBtn.removeEventListener('click', handleWelcomeContinue);
        continueBtn.addEventListener('click', handleWelcomeContinue);
    }
}

/**
 * Manejador para el botón de continuar desde la pantalla de bienvenida
 */
function handleWelcomeContinue() {
    state.processingStatus = 'idle';
    document.getElementById('welcome-screen').style.display = 'none';
    
    document.querySelector('.train-content-container').style.display = 'block';
    
    setupAvaSelection();
}

function resetToWelcomeView() {
    // Reiniciar el estado
    state.processingStatus = 'welcome';
    state.files = [];
    state.progress = 0;
    state.logEntries = [];
    state.processingTimes = [];
    state.activeProcesses.clear();
    state.selectedAva = null;
    state.eventListenersAttached = false; // Resetear flag de listeners
    state.results = {
        totalFiles: 0,
        totalPages: 0,
        fileResults: []
    };
    
    // Referencia a los elementos principales
    const trainMindSection = document.getElementById('train-mind-section');
    const welcomeScreen = document.getElementById('welcome-screen');
    const contentContainer = document.querySelector('.train-content-container');
    const noAvaSelected = document.getElementById('no-ava-selected');
    const selectedAvaSection = document.getElementById('selected-ava-section');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadResults = document.getElementById('upload-results');
    
    // Aplica un estilo temporal para ocultar todo durante los cambios
    // y almacena el estilo original para restaurarlo después
    const originalDisplay = trainMindSection ? trainMindSection.style.display : 'block';
    if (trainMindSection) {
        trainMindSection.style.visibility = 'hidden';
    }
    
    if (contentContainer) contentContainer.style.display = 'none';
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
        welcomeScreen.style.flexDirection = 'column';
        welcomeScreen.style.alignItems = 'center';
        welcomeScreen.style.justifyContent = 'center';
        welcomeScreen.style.width = '100%';
        welcomeScreen.style.margin = '0 auto';
    }
    
    if (noAvaSelected) noAvaSelected.style.display = 'block';
    if (selectedAvaSection) selectedAvaSection.style.display = 'none';
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadResults) uploadResults.style.display = 'none';
    
    updateChiguireTheme();

    addWelcomeAnimation();
    
    setTimeout(() => {
        if (trainMindSection) {
            trainMindSection.style.display = originalDisplay;
            trainMindSection.style.visibility = 'visible';
        }
    }, 50);
}

/**
 * Agrega efecto de animación a la pantalla de bienvenida
 */
function addWelcomeAnimation() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const professorImage = document.getElementById('professor-image');
    const neuralBubble = document.querySelector('.neural-bubble');
    
    if (welcomeScreen && professorImage && neuralBubble) {
        // Reiniciar animaciones agregando y quitando clases
        welcomeScreen.classList.remove('welcome-animation');
        professorImage.classList.remove('professor-animation');
        neuralBubble.classList.remove('bubble-animation');
        
        // Forzar un reflow para reiniciar las animaciones
        void welcomeScreen.offsetWidth;
        
        welcomeScreen.classList.add('welcome-animation');
        professorImage.classList.add('professor-animation');
        neuralBubble.classList.add('bubble-animation');
    }
}

/**
 * Actualiza la imagen del Chiguire según el tema
 */
function updateChiguireTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const chiguireImg = document.getElementById('chiguire-img');
    
    if (chiguireImg) {
        chiguireImg.src = isDarkTheme 
            ? '/images/chiguire-walking-dark.gif' 
            : '/images/chiguire-walking.gif';
    }
}

/**
 * Configura la interfaz de selección de AVA
 */
async function setupAvaSelection() {
    document.getElementById('no-ava-selected').style.display = 'block';
    document.getElementById('selected-ava-section').style.display = 'none';
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-results').style.display = 'none';
    
    await loadCarreras();
    
    await loadAvas();
    
    setupCarouselNavigation();
    
    setupFilters();
}

/**
 * Carga las carreras para el filtro
 */
async function loadCarreras() {
    try {
        const carreras = await fetchWithCSRF('/api/carrera/carrera', {
            method: 'GET'
        });
        
        if (Array.isArray(carreras)) {
            state.carreras = carreras;
            
            // Llenar el dropdown de filtro de carreras
            const carreraFilter = document.getElementById('carrera-filter');
            if (carreraFilter) {
                carreraFilter.innerHTML = '<option value="">Todas las Carreras</option>';
                
                carreras.forEach(carrera => {
                    const option = document.createElement('option');
                    option.value = carrera.id_carrera;
                    option.textContent = carrera.nombre;
                    carreraFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando carreras:', error);
        showNotification({
            title: 'Error',
            message: 'No se pudieron cargar las carreras. Por favor, intenta de nuevo.',
            type: 'error'
        });
    }
}

/**
 * Carga los AVAs disponibles para el selector
 */
async function loadAvas() {
    try {
        const avaCarousel = document.getElementById('ava-carousel');
        avaCarousel.innerHTML = `
            <div class="neural-carousel-loader">
                <div class="neural-loader-ripple">
                    <div></div>
                    <div></div>
                </div>
                <p>Cargando Asistentes Virtuales...</p>
            </div>
        `;
        
        const avas = await fetchWithCSRF('/api/avas', {
            method: 'GET'
        });
        
        state.avas = avas;
        state.filteredAvas = [...avas];
        
        renderAvaCards();
        
    } catch (error) {
        console.error('Error cargando AVAs:', error);
        
        const avaCarousel = document.getElementById('ava-carousel');
        if (avaCarousel) {
            avaCarousel.innerHTML = `
                <div class="neural-empty-selection">
                    <div class="neural-empty-icon">
                        <i class='bx bx-error-circle'></i>
                    </div>
                    <h3>Error al Cargar Asistentes</h3>
                    <p>No se pudieron cargar los asistentes virtuales. Por favor, intenta de nuevo más tarde.</p>
                </div>
            `;
        }
        
        showNotification({
            title: 'Error de Carga',
            message: 'No se pudieron cargar los AVAs. Por favor, intenta de nuevo más tarde.',
            type: 'error'
        });
    }
}

/**
 * Renderiza las tarjetas de AVA en el carrusel
 */
function renderAvaCards() {
    const avaCarousel = document.getElementById('ava-carousel');
    const template = document.getElementById('ava-card-template');
    
    avaCarousel.innerHTML = '';
    
    // Si no hay AVAs, mostrar mensaje
    if (state.filteredAvas.length === 0) {
        avaCarousel.innerHTML = `
            <div class="neural-empty-selection">
                <div class="neural-empty-icon">
                    <i class='bx bx-ghost'></i>
                </div>
                <h3>No hay Asistentes disponibles</h3>
                <p>No se encontraron asistentes virtuales que coincidan con los filtros seleccionados.</p>
            </div>
        `;
        return;
    }
    
    state.filteredAvas.forEach(ava => {
        const card = template.content.cloneNode(true);
        const hasEmbedding = !!ava.embedding_table_name;
        
        // Llenar datos
        card.querySelector('.neural-ava-card').dataset.avaId = ava.id_ava;
        card.querySelector('.neural-ava-card').dataset.hasEmbedding = hasEmbedding;
        
        // Imagen con fallback usando la función segura
        const imgElement = card.querySelector('.neural-card-image img');
        imgElement.src = ava.imagen || '/images/placeholder.jpg';
        imgElement.alt = ava.nom_ava;
        
        setupImageFallback(imgElement, '/images/placeholder.jpg');
        
        // Información básica
        card.querySelector('.neural-card-title').textContent = ava.nom_ava;
        
        const description = ava.descripcion || 'Sin descripción disponible';
        const truncatedDescription = truncateText(description, 82);
        card.querySelector('.neural-card-description').textContent = truncatedDescription;
        
        // Metadatos
        const carrera = state.carreras.find(c => c.id_carrera == ava.id_carrera);
        card.querySelector('.carrera-name').textContent = carrera ? carrera.nombre : 'Sin carrera asignada';
        
        // Estado de tabla de embeddings
        const embeddingElement = card.querySelector('.embedding-name');
        if (hasEmbedding) {
            embeddingElement.textContent = ava.embedding_table_name;
            card.querySelector('.embedding-status i').className = 'bx bx-table';
        } else {
            embeddingElement.textContent = 'Sin tabla de embeddings';
            card.querySelector('.embedding-status i').className = 'bx bx-x-circle';
        }
        
        const selectButton = card.querySelector('.neural-card-select');
        
        if (hasEmbedding) {
            selectButton.addEventListener('click', () => selectAva(ava));
        } else {
            selectButton.disabled = true;
            selectButton.textContent = 'No Disponible';
        }
        
        avaCarousel.appendChild(card);
    });
    
    // Restablecer posición del carrusel
    state.carouselPosition = 0;
    updateCarouselPosition();
}

/**
 * Configura la navegación del carrusel
 */
function setupCarouselNavigation() {
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');
    const carousel = document.getElementById('ava-carousel');
    
    if (prevButton && nextButton) {
        prevButton.removeEventListener('click', handleCarouselPrev);
        nextButton.removeEventListener('click', handleCarouselNext);
        
        prevButton.addEventListener('click', handleCarouselPrev);
        nextButton.addEventListener('click', handleCarouselNext);
    }
    
    // Nuevo: Agregar listener para el evento de scroll del carrusel
    if (carousel) {
        carousel.removeEventListener('scroll', handleCarouselScroll);
        carousel.addEventListener('scroll', handleCarouselScroll);
    }
    
    updateCarouselNavigation();
    
    // Ajustar carouselVisibleItems según el ancho de la pantalla
    updateCarouselResponsive();
    window.removeEventListener('resize', updateCarouselResponsive);
    window.addEventListener('resize', updateCarouselResponsive);
}

/**
 * Manejadores de eventos para navegación del carrusel
 */
function handleCarouselPrev() {
    navigateCarousel('prev');
}

function handleCarouselNext() {
    navigateCarousel('next');
}

function handleCarouselScroll() {
    const carousel = document.getElementById('ava-carousel');
    // Debounce para mejorar rendimiento
    clearTimeout(carousel.scrollTimeout);
    carousel.scrollTimeout = setTimeout(() => {
        const newPosition = Math.round(carousel.scrollLeft / state.carouselItemWidth);
        
        // Si la posición es diferente, actualizar el estado y la navegación
        if (newPosition !== state.carouselPosition) {
            state.carouselPosition = newPosition;
            updateCarouselNavigation();
        }
    }, 100);
}

/**
 * Actualiza la configuración responsive del carrusel
 */
function updateCarouselResponsive() {
    // Ajustar número de elementos visibles según ancho de pantalla
    const windowWidth = window.innerWidth;
    
    if (windowWidth < 576) {
        state.carouselVisibleItems = 1;
    } else if (windowWidth < 768) {
        state.carouselVisibleItems = 2;
    } else if (windowWidth < 992) {
        state.carouselVisibleItems = 3;
    } else {
        state.carouselVisibleItems = 4;
    }
    
    const maxPosition = Math.max(0, state.filteredAvas.length - state.carouselVisibleItems);
    if (state.carouselPosition > maxPosition) {
        state.carouselPosition = maxPosition;
    }
    
    updateCarouselPosition();
    updateCarouselNavigation();
}

/**
 * Navega el carrusel en la dirección especificada
 */
function navigateCarousel(direction) {
    const maxPosition = Math.max(0, state.filteredAvas.length - state.carouselVisibleItems);
    
    if (direction === 'prev' && state.carouselPosition > 0) {
        state.carouselPosition--;
    } else if (direction === 'next' && state.carouselPosition < maxPosition) {
        state.carouselPosition++;
    }
    
    updateCarouselPosition(true);
    updateCarouselNavigation();
}

/**
 * Actualiza la posición del carrusel
 */
function updateCarouselPosition(useSmooth = true) {
    const carousel = document.getElementById('ava-carousel');
    if (carousel) {
        const scrollPosition = state.carouselPosition * state.carouselItemWidth;
        carousel.scrollTo({
            left: scrollPosition,
            behavior: useSmooth ? 'smooth' : 'auto'
        });
    }
}

/**
 * Actualiza la visibilidad de los botones de navegación
 */
function updateCarouselNavigation() {
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');
    const carousel = document.getElementById('ava-carousel');
    
    if (prevButton && nextButton && carousel) {
        const maxPosition = Math.max(0, state.filteredAvas.length - state.carouselVisibleItems);
        
        prevButton.disabled = state.carouselPosition <= 0;
        nextButton.disabled = state.carouselPosition >= maxPosition;
        
        prevButton.style.opacity = state.carouselPosition <= 0 ? '0.3' : '1';
        nextButton.style.opacity = state.carouselPosition >= maxPosition ? '0.3' : '1';
    }
}

/**
 * Configura los filtros para AVAs
 */
function setupFilters() {
    // Filtro por carrera
    const carreraFilter = document.getElementById('carrera-filter');
    if (carreraFilter) {
        carreraFilter.removeEventListener('change', applyFilters);
        carreraFilter.addEventListener('change', applyFilters);
    }
    
    // Búsqueda por nombre
    const avaSearch = document.getElementById('avaneural-search');
    if (avaSearch) {
        avaSearch.removeEventListener('input', debounceSearch);
        avaSearch.addEventListener('input', debounceSearch);
    } else {
        console.error('Elemento de búsqueda no encontrado: #avaneural-search');
    }
}

function debounceSearch() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(applyFilters, 300);
}

/**
 * Aplica los filtros seleccionados
 */
function applyFilters() {
    const carreraFilter = document.getElementById('carrera-filter');
    const avaSearch = document.getElementById('avaneural-search');
    
    if (!carreraFilter || !avaSearch) {
        console.error('Elementos de filtro no encontrados');
        return;
    }
    
    const carreraValue = carreraFilter.value;
    const searchTerm = avaSearch.value.toLowerCase().trim();
    
    console.log('Aplicando filtros:', { carrera: carreraValue, busqueda: searchTerm });
    
    if (!state.avas || !Array.isArray(state.avas) || state.avas.length === 0) {
        console.error('No hay AVAs disponibles para filtrar');
        return;
    }
    
    state.filteredAvas = state.avas.filter(ava => {
        // Filtro por carrera
        const matchesCarrera = !carreraValue || ava.id_carrera == carreraValue;
        
        // Filtro por búsqueda
        const matchesSearch = !searchTerm || 
            (ava.nom_ava && ava.nom_ava.toLowerCase().includes(searchTerm)) || 
            (ava.descripcion && ava.descripcion.toLowerCase().includes(searchTerm));
        
        return matchesCarrera && matchesSearch;
    });
    
    // Restablecer posición del carrusel
    state.carouselPosition = 0;
    
    renderAvaCards();
}

/**
 * Selecciona un AVA para entrenamiento
 */
function selectAva(ava) {
    state.selectedAva = ava;
    
    document.getElementById('no-ava-selected').style.display = 'none';
    
    const selectedSection = document.getElementById('selected-ava-section');
    selectedSection.style.display = 'block';
    
    const selectedImage = document.getElementById('selected-ava-image');
    selectedImage.src = ava.imagen || '/images/placeholder.jpg';
    
    setupImageFallback(selectedImage, '/images/placeholder.jpg');
    
    document.getElementById('selected-ava-name').textContent = ava.nom_ava;
    
    const carrera = state.carreras.find(c => c.id_carrera == ava.id_carrera);
    document.getElementById('selected-ava-carrera').textContent = carrera ? carrera.nombre : 'Sin carrera';
    
    document.getElementById('selected-ava-table').textContent = ava.embedding_table_name;
    
    switchTab('training-tab');
    
    const backButton = document.getElementById('back-to-selection');
    if (backButton) {
        backButton.removeEventListener('click', handleBackToSelection);
        backButton.addEventListener('click', handleBackToSelection);
    }
    
    setupTabs();
    
    setupEnhancedDropZone();
    
    loadProcessedFiles(ava.id_ava);
}

/**
 * Manejador para volver a la selección de AVA
 */
function handleBackToSelection() {
    const selectedSection = document.getElementById('selected-ava-section');
    selectedSection.style.display = 'none';
    document.getElementById('no-ava-selected').style.display = 'block';
    state.selectedAva = null;
    state.files = [];
    state.eventListenersAttached = false; // Resetear flag
    updateFilesList();
}

/**
 * Configura las pestañas
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.neural-tab');
    
    tabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick);
        tab.addEventListener('click', handleTabClick);
    });
}

/**
 * Manejador para clics en pestañas
 */
function handleTabClick(e) {
    const tab = e.currentTarget;
    const tabs = document.querySelectorAll('.neural-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    document.querySelectorAll('.neural-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    tab.classList.add('active');
    
    const tabId = tab.dataset.tab;
    switchTab(tabId);
}

/**
 * Cambia a la pestaña especificada
 */
function switchTab(tabId) {
    document.querySelectorAll('.neural-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.neural-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    // Acciones específicas según la pestaña
    if (tabId === 'files-tab' && state.selectedAva) {
        // Recargar archivos procesados al cambiar a esta pestaña
        loadProcessedFiles(state.selectedAva.id_ava);
    }
}

/**
 * Carga la lista de archivos procesados para un AVA
 */
async function loadProcessedFiles(avaId) {
    try {
        const filesContainer = document.getElementById('processed-files-container');
        if (!filesContainer) return;
        
        filesContainer.innerHTML = `
            <div class="neural-files-loader">
                <div class="neural-loader-brain">
                    <div class="neural-loader-circle"></div>
                    <div class="neural-loader-node n1"></div>
                    <div class="neural-loader-node n2"></div>
                    <div class="neural-loader-node n3"></div>
                    <div class="neural-loader-node n4"></div>
                    <div class="neural-loader-node n5"></div>
                    <div class="neural-loader-connection c1"></div>
                    <div class="neural-loader-connection c2"></div>
                    <div class="neural-loader-connection c3"></div>
                    <div class="neural-loader-connection c4"></div>
                </div>
                <p>Cargando archivos procesados...</p>
            </div>
        `;
        
        const response = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/files`, {
            method: 'GET'
        });
        
        if (response.success && Array.isArray(response.files)) {
            state.processedFiles = response.files;
            
            document.getElementById('files-count').textContent = response.count || 0;
            
            updateProcessedStats(avaId, response);
            
            if (response.files.length === 0) {
                filesContainer.innerHTML = `
                    <div class="neural-empty-selection">
                        <div class="neural-empty-icon">
                            <i class='bx bx-file'></i>
                        </div>
                        <h3>No hay archivos procesados</h3>
                        <p>No hay archivos procesados para este Asistente Virtual.</p>
                    </div>
                `;
                return;
            }
            
            filesContainer.innerHTML = '';
            
            response.files.forEach(file => {
                const card = document.createElement('div');
                card.className = 'neural-processed-file-card';
                
                const uploadDate = new Date(file.uploaded_at);
                const formattedDate = uploadDate.toLocaleDateString() + ' ' + uploadDate.toLocaleTimeString();
                
                card.innerHTML = `
                    <div class="neural-processed-file-header">
                        <i class='bx bxs-file-pdf'></i>
                        <div class="neural-processed-file-title" title="${file.filename}">${file.filename}</div>
                    </div>
                    <div class="neural-processed-file-content">
                        <div class="neural-processed-file-stats">
                            <div class="neural-processed-file-stat">
                                <div class="neural-processed-file-stat-value">${file.pages}</div>
                                <div class="neural-processed-file-stat-label">Páginas</div>
                            </div>
                            <div class="neural-processed-file-stat">
                                <div class="neural-processed-file-stat-value">${formatDate(file.uploaded_at)}</div>
                                <div class="neural-processed-file-stat-label">Fecha</div>
                            </div>
                        </div>
                        <div class="neural-processed-file-actions">
                            <button class="neural-button secondary view-embeddings" data-filename="${file.filename}">
                                <i class='bx bx-code-block'></i> Ver contenido
                            </button>
                            <button class="neural-button danger delete-file" data-filename="${file.filename}">
                                <i class='bx bx-trash'></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
                
                filesContainer.appendChild(card);
            });
            
            configureProcesedFileButtons(avaId);
        } else {
            filesContainer.innerHTML = `
                <div class="neural-empty-selection">
                    <div class="neural-empty-icon">
                        <i class='bx bx-error-circle'></i>
                    </div>
                    <h3>Error al cargar archivos</h3>
                    <p>No se pudieron cargar los archivos procesados. Por favor, intenta de nuevo más tarde.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando archivos procesados:', error);
        
        const filesContainer = document.getElementById('processed-files-container');
        if (filesContainer) {
            filesContainer.innerHTML = `
                <div class="neural-empty-selection">
                    <div class="neural-empty-icon">
                        <i class='bx bx-error-circle'></i>
                    </div>
                    <h3>Error de conexión</h3>
                    <p>No se pudieron cargar los archivos procesados. Por favor, verifica tu conexión e intenta de nuevo.</p>
                </div>
            `;
        }
    }
}

/**
 * Actualiza las estadísticas de archivos procesados
 */
async function updateProcessedStats(avaId, filesResponse) {
    try {
        document.getElementById('total-processed-files').textContent = filesResponse.count || 0;
        
        const statsResponse = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/stats`, {
            method: 'GET'
        });
        
        if (statsResponse.success) {
            document.getElementById('total-processed-pages').textContent = statsResponse.stats.total_documents || 0;
            
            let lastUpdateText = '-';
            if (statsResponse.stats.newest_document) {
                const newestDate = new Date(statsResponse.stats.newest_document);
                lastUpdateText = newestDate.toLocaleDateString();
            }
            document.getElementById('last-processed-date').textContent = lastUpdateText;
        }
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
    }
}

/**
 * Configura los botones de las tarjetas de archivos procesados
 */
function configureProcesedFileButtons(avaId) {
    // Botones para ver embeddings
    document.querySelectorAll('.view-embeddings').forEach(button => {
        button.removeEventListener('click', handleViewEmbeddings);
        button.addEventListener('click', handleViewEmbeddings);
    });
    
    // Botones para eliminar archivos
    document.querySelectorAll('.delete-file').forEach(button => {
        button.removeEventListener('click', handleDeleteFile);
        button.addEventListener('click', handleDeleteFile);
    });
}

/**
 * Manejadores para botones de archivos procesados
 */
async function handleViewEmbeddings(e) {
    const filename = e.currentTarget.dataset.filename;
    await showEmbeddingContent(state.selectedAva.id_ava, filename);
}

function handleDeleteFile(e) {
    const filename = e.currentTarget.dataset.filename;
    confirmDeleteFile(state.selectedAva.id_ava, filename);
}

/**
 * Muestra el contenido de un embedding en un modal
 */
async function showEmbeddingContent(avaId, filename) {
  try {
    // Reiniciar estado
    embeddingModalState.avaId = avaId;
    embeddingModalState.filename = filename;
    embeddingModalState.currentPage = 1;
    embeddingModalState.totalPages = 1;
    embeddingModalState.pages = [];
    embeddingModalState.isLoading = true;
    
    const modal = getElement('embedding-content-modal');
    if (!modal) {
      console.error('No se encontró el modal de embeddings');
      return;
    }
    
    // Asegurar que los tabs estén configurados
    setupEmbeddingModalTabs();
    
    openModal(modal);
    
    const filenameElement = getElement('modal-filename');
    const timestampElement = getElement('modal-timestamp');
    const contentLoader = getElement('content-loader');
    const metadataLoader = getElement('metadata-loader');
    const contentElement = getElement('modal-content');
    const metadataElement = getElement('modal-metadata');
    
    if (filenameElement) {
      const truncatedName = truncateFilename(filename, 40);
      filenameElement.textContent = truncatedName;
      filenameElement.title = filename; // Mostrar nombre completo en tooltip
    }
    
    if (timestampElement) timestampElement.textContent = '...';
    
    setLoadingState(true);
    
    if (contentLoader) contentLoader.style.display = 'flex';
    if (metadataLoader) metadataLoader.style.display = 'flex';
    if (contentElement) contentElement.style.display = 'none';
    if (metadataElement) metadataElement.style.display = 'none';
    
    clearErrors();
    
    const contentTab = document.querySelector('.embedding-tabs .neural-tab[data-tab="content-tab"]');
    if (contentTab) contentTab.click();
    
    // Tabla de embeddings del AVA seleccionado
    const tableName = state.selectedAva?.embedding_table_name;
    if (!tableName) {
      throw new Error('No se encontró la tabla de embeddings');
    }
    
    // Primera consulta: obtener información de todas las páginas
    const pagesQuery = `
      SELECT 
        (metadata->>'page')::int as page_number,
        created_at
      FROM ${tableName}
      WHERE metadata->>'filename' = '${filename}'
      ORDER BY (metadata->>'page')::int ASC
    `;
    
    // Realizar consulta para obtener páginas
    const pagesResponse = await fetchWithCSRF('/api/query/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: pagesQuery,
        avaId
      })
    });
    
    if (pagesResponse.success && pagesResponse.data && pagesResponse.data.length > 0) {
      embeddingModalState.totalPages = pagesResponse.data.length;
      embeddingModalState.pages = pagesResponse.data;
      
      setupPageNavigation();
      setupDeleteButton();
      
      // Segunda consulta: obtener contenido de la primera página
      const contentQuery = `
        SELECT content, metadata, created_at 
        FROM ${tableName}
        WHERE 
          metadata->>'filename' = '${filename}' AND
          (metadata->>'page')::int = 1
        LIMIT 1
      `;
      
      // Realizar consulta para obtener el embedding
      const contentResponse = await fetchWithCSRF('/api/query/embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: contentQuery,
          avaId
        })
      });
      
      if (contentLoader) contentLoader.style.display = 'none';
      if (metadataLoader) metadataLoader.style.display = 'none';
      
      if (contentElement) contentElement.style.display = 'block';
      if (metadataElement) metadataElement.style.display = 'block';
      
      if (contentResponse.success && contentResponse.data && contentResponse.data.length > 0) {
        const embedding = contentResponse.data[0];
        
        if (contentElement) {
          // Asegurarse de quitar cualquier clase de error previo
          contentElement.classList.remove('error-content');
          
          contentElement.textContent = embedding.content || 'Sin contenido';
          
          if (embedding.content && embedding.content.trim().startsWith('#')) {
            contentElement.classList.add('markdown-content');
          } else {
            contentElement.classList.remove('markdown-content');
          }
        }
        
        let metadata = {};
        try {
          metadata = typeof embedding.metadata === 'string' 
            ? JSON.parse(embedding.metadata) 
            : embedding.metadata;
        } catch (e) {
          console.error('Error al parsear metadatos:', e);
          metadata = { error: 'Error al parsear metadatos' };
        }
        
        if (metadataElement) {
          // Asegurarse de quitar cualquier clase de error previo
          metadataElement.classList.remove('error-content');
          
          metadataElement.textContent = JSON.stringify(metadata, null, 2);
        }
        
        let timestamp = metadata.timestamp || embedding.created_at;
        if (timestampElement && timestamp) {
          const date = new Date(timestamp);
          timestampElement.textContent = date.toLocaleString();
        }
      } else {
        showError('modal-content', 'No se pudo cargar el contenido');
        showError('modal-metadata', 'No se pudieron cargar los metadatos');
      }
    } else {
      // No se encontraron páginas, mostrar mensaje
      if (contentLoader) contentLoader.style.display = 'none';
      if (metadataLoader) metadataLoader.style.display = 'none';
      
      if (contentElement) contentElement.style.display = 'block';
      if (metadataElement) metadataElement.style.display = 'block';
      
      showError('modal-content', 'No se encontraron páginas para este archivo');
      showError('modal-metadata', 'No se encontraron metadatos para este archivo');
      
      setupPageNavigation();
      setupDeleteButton();
    }
  } catch (error) {
    console.error('Error al cargar contenido del embedding:', error);
    
    const contentLoader = getElement('content-loader');
    const metadataLoader = getElement('metadata-loader');
    const contentElement = getElement('modal-content');
    const metadataElement = getElement('modal-metadata');
    
    if (contentLoader) contentLoader.style.display = 'none';
    if (metadataLoader) metadataLoader.style.display = 'none';
    
    if (contentElement) contentElement.style.display = 'block';
    if (metadataElement) metadataElement.style.display = 'block';
    
    showError('modal-content', 'Error al cargar contenido: ' + error.message);
    showError('modal-metadata', 'Error: ' + error.message);
    
    setupPageNavigation();
    setupDeleteButton();
  } finally {
    setLoadingState(false);
  }
}

/**
 * Configura el botón de eliminación de página
 */
function setupDeleteButton() {
  const deleteButton = getElement('delete-page-btn');
  
  if (deleteButton) {
    deleteButton.removeEventListener('click', handleDeletePageClick);
    deleteButton.addEventListener('click', handleDeletePageClick);
    
    deleteButton.disabled = embeddingModalState.totalPages <= 1;
  }
}

/**
 * Manejador para el botón de eliminar página
 */
function handleDeletePageClick() {
    showDeleteConfirmation();
}

/**
 * Configura la navegación por tabs en el modal de embeddings
 */
function setupEmbeddingModalTabs() {
  const modal = document.getElementById('embedding-content-modal');
  if (!modal) return;
  
  const tabs = modal.querySelectorAll('.embedding-tabs .neural-tab');
  
  tabs.forEach(tab => {
    tab.removeEventListener('click', handleEmbeddingTabClick);
    tab.addEventListener('click', handleEmbeddingTabClick);
  });
}

/**
 * Manejador para clics en tabs del modal de embeddings
 */
function handleEmbeddingTabClick(e) {
    const tab = e.currentTarget;
    const modal = document.getElementById('embedding-content-modal');
    if (!modal) return;
    
    modal.querySelectorAll('.embedding-tabs .neural-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    modal.querySelectorAll('.embedding-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    tab.classList.add('active');
    
    const tabId = tab.dataset.tab;
    const contentTab = modal.querySelector(`#${tabId}`);
    if (contentTab) {
        contentTab.classList.add('active');
    }
}

/**
 * Configura los botones de navegación entre páginas
 */
function setupPageNavigation() {
  const prevButton = getElement('prev-page-btn');
  const nextButton = getElement('next-page-btn');
  
  if (prevButton && nextButton) {
    prevButton.removeEventListener('click', handlePrevPageClick);
    nextButton.removeEventListener('click', handleNextPageClick);
    
    prevButton.addEventListener('click', handlePrevPageClick);
    nextButton.addEventListener('click', handleNextPageClick);
  }
  
  setupPageSelector();
}

/**
 * Manejadores para navegación de páginas
 */
function handlePrevPageClick() {
    if (embeddingModalState.currentPage > 1) {
        navigateToPage(embeddingModalState.currentPage - 1);
    }
}

function handleNextPageClick() {
    if (embeddingModalState.currentPage < embeddingModalState.totalPages) {
        navigateToPage(embeddingModalState.currentPage + 1);
    }
}

/**
 * Configura el selector de página
 */
function setupPageSelector() {
  const pageSelect = getElement('page-select');
  
  if (pageSelect) {
    pageSelect.innerHTML = '';
    
    for (let i = 1; i <= embeddingModalState.totalPages; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      pageSelect.appendChild(option);
    }
    
    pageSelect.value = embeddingModalState.currentPage;
    
    pageSelect.removeEventListener('change', handlePageSelectChange);
    pageSelect.addEventListener('change', handlePageSelectChange);
  }
}

/**
 * Manejador para cambios en el selector de página
 */
function handlePageSelectChange(e) {
    const pageNumber = parseInt(e.target.value);
    if (!isNaN(pageNumber) && pageNumber !== embeddingModalState.currentPage) {
        navigateToPage(pageNumber);
    }
}

/**
 * Muestra un mensaje de error en un elemento
 */
function showError(elementId, message) {
  const element = getElement(elementId);
  if (element) {
    // Asegurarse de que el elemento esté visible
    element.style.display = 'block';
    
    element.classList.add('error-content');
    
    element.textContent = message || 'Error desconocido';
  }
}

/**
 * Actualiza el estado de los botones de navegación
 */
function updateNavigationButtons() {
  const prevButton = getElement('prev-page-btn');
  const nextButton = getElement('next-page-btn');
  const pageSelect = getElement('page-select');
  const deleteButton = getElement('delete-page-btn');
  
  if (pageSelect) {
    pageSelect.value = embeddingModalState.currentPage;
  }
  
  if (prevButton) prevButton.disabled = embeddingModalState.currentPage <= 1 || embeddingModalState.isLoading;
  if (nextButton) nextButton.disabled = embeddingModalState.currentPage >= embeddingModalState.totalPages || embeddingModalState.isLoading;
  if (deleteButton) deleteButton.disabled = embeddingModalState.totalPages <= 1 || embeddingModalState.isLoading;
}

/**
 * Navega a una página específica
 */
async function navigateToPage(pageNumber) {
  try {
    if (pageNumber < 1 || pageNumber > embeddingModalState.totalPages) {
      return;
    }
    
    setLoadingState(true);
    
    embeddingModalState.currentPage = pageNumber;
    
    updateNavigationButtons();
    
    const contentLoader = getElement('content-loader');
    const metadataLoader = getElement('metadata-loader');
    const contentElement = getElement('modal-content');
    const metadataElement = getElement('modal-metadata');
    
    if (contentLoader) contentLoader.style.display = 'flex';
    if (metadataLoader) metadataLoader.style.display = 'flex';
    
    if (contentElement) contentElement.style.display = 'none';
    if (metadataElement) metadataElement.style.display = 'none';
    
    clearErrors();
    
    // Tabla de embeddings del AVA seleccionado
    const tableName = state.selectedAva?.embedding_table_name;
    if (!tableName) {
      throw new Error('No se encontró la tabla de embeddings');
    }
    
    const query = `
      SELECT content, metadata, created_at 
      FROM ${tableName} 
      WHERE 
        metadata->>'filename' = '${embeddingModalState.filename}' AND 
        (metadata->>'page')::int = ${pageNumber}
      LIMIT 1
    `;
    
    const response = await fetchWithCSRF('/api/query/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query,
        avaId: embeddingModalState.avaId
      })
    });
    
    if (contentLoader) contentLoader.style.display = 'none';
    if (metadataLoader) metadataLoader.style.display = 'none';
    
    if (contentElement) contentElement.style.display = 'block';
    if (metadataElement) metadataElement.style.display = 'block';
    
    if (response.success && response.data && response.data.length > 0) {
      const embedding = response.data[0];
      
      if (contentElement && metadataElement) {
        // Asegurarse de quitar cualquier clase de error previo
        contentElement.classList.remove('error-content');
        metadataElement.classList.remove('error-content');
        
        contentElement.classList.add('page-transition-in');
        metadataElement.classList.add('page-transition-in');
        
        contentElement.textContent = embedding.content || 'Sin contenido';
        
        if (embedding.content && embedding.content.trim().startsWith('#')) {
          contentElement.classList.add('markdown-content');
        } else {
          contentElement.classList.remove('markdown-content');
        }
        
        let metadata = {};
        try {
          metadata = typeof embedding.metadata === 'string' 
            ? JSON.parse(embedding.metadata) 
            : embedding.metadata;
        } catch (e) {
          console.error('Error al parsear metadatos:', e);
          metadata = { error: 'Error al parsear metadatos' };
        }
        
        metadataElement.textContent = JSON.stringify(metadata, null, 2);
        
        let timestamp = metadata.timestamp || embedding.created_at;
        const timestampElement = getElement('modal-timestamp');
        if (timestampElement && timestamp) {
          const date = new Date(timestamp);
          timestampElement.textContent = date.toLocaleString();
        }
        
        setTimeout(() => {
          contentElement.classList.remove('page-transition-in');
          metadataElement.classList.remove('page-transition-in');
        }, 300);
      }
    } else {
      showError('modal-content', 'No se pudo cargar el contenido de la página');
      showError('modal-metadata', 'No se pudieron cargar los metadatos de la página');
    }
  } catch (error) {
    console.error('Error al navegar a la página:', error);
    
    const contentLoader = getElement('content-loader');
    const metadataLoader = getElement('metadata-loader');
    if (contentLoader) contentLoader.style.display = 'none';
    if (metadataLoader) metadataLoader.style.display = 'none';
    
    showError('modal-content', 'Error al cargar página: ' + error.message);
    showError('modal-metadata', 'Error: ' + error.message);
  } finally {
    setLoadingState(false);
  }
}

/**
 * Establece el estado de carga
 */
function setLoadingState(isLoading) {
  // Elementos de control
  const prevButton = getElement('prev-page-btn');
  const nextButton = getElement('next-page-btn');
  const deleteButton = getElement('delete-page-btn');
  const pageSelect = getElement('page-select');
  
  if (prevButton) prevButton.disabled = isLoading || embeddingModalState.currentPage <= 1;
  if (nextButton) nextButton.disabled = isLoading || embeddingModalState.currentPage >= embeddingModalState.totalPages;
  if (deleteButton) deleteButton.disabled = isLoading || embeddingModalState.totalPages <= 1;
  if (pageSelect) pageSelect.disabled = isLoading;
  
  embeddingModalState.isLoading = isLoading;
}

/**
 * Recarga la información de páginas después de eliminar una
 */
async function reloadPagesInfo() {
  try {
    // Tabla de embeddings del AVA seleccionado
    const tableName = state.selectedAva?.embedding_table_name;
    if (!tableName) {
      throw new Error('No se encontró la tabla de embeddings');
    }
    
    // Consulta para obtener información actualizada de páginas (usando SELECT)
    const pagesQuery = `
      SELECT 
        (metadata->>'page')::int as page_number,
        created_at
      FROM ${tableName}
      WHERE metadata->>'filename' = '${embeddingModalState.filename}'
      ORDER BY (metadata->>'page')::int ASC
    `;
    
    // Realizar consulta para obtener páginas
    const pagesResponse = await fetchWithCSRF('/api/query/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: pagesQuery,
        avaId: embeddingModalState.avaId
      })
    });
    
    if (pagesResponse.success && pagesResponse.data) {
      embeddingModalState.totalPages = pagesResponse.data.length;
      embeddingModalState.pages = pagesResponse.data;
      
      // Navegar a la página actual o a la última disponible
      let targetPage = embeddingModalState.currentPage;
      if (targetPage > embeddingModalState.totalPages) {
        targetPage = embeddingModalState.totalPages;
      }
      
      setupPageNavigation();
      setupDeleteButton();
      
      await navigateToPage(targetPage);
    } else {
      throw new Error('Error al recargar información de páginas');
    }
  } catch (error) {
    console.error('Error al recargar información de páginas:', error);
    await navigateToPage(Math.min(embeddingModalState.currentPage, embeddingModalState.totalPages || 1));
  }
}

/**
 * Elimina una página específica
 */
async function deletePage(avaId, filename, pageNumber) {
  try {
    setLoadingState(true);
    
    showNotification({
      title: 'Eliminando página',
      message: `Eliminando página ${pageNumber} del archivo "${filename}"...`,
      type: 'info',
      duration: 2000
    });
    
    const pageIdentifier = `${filename}#page=${pageNumber}`;
    
    // Utilizar el endpoint existente para eliminar documentos
    const response = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/page/${encodeURIComponent(pageIdentifier)}`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      embeddingModalState.totalPages--;
      
      // Si se eliminó la última página, ir a la anterior
      if (pageNumber > embeddingModalState.totalPages) {
        embeddingModalState.currentPage = Math.max(1, embeddingModalState.totalPages);
      }
      
      // Si no quedan páginas, cerrar el modal
      if (embeddingModalState.totalPages <= 0) {
        closeModal(getElement('embedding-content-modal'));
        
        showNotification({
          title: 'Página eliminada',
          message: 'Se ha eliminado la última página del archivo.',
          type: 'success'
        });
        
        // Recargar la lista de archivos si es necesario
        if (state.selectedAva) {
          loadProcessedFiles(state.selectedAva.id_ava);
        }
        
        return;
      }
      
      showNotification({
        title: 'Página eliminada',
        message: `Se ha eliminado la página ${pageNumber} del archivo.`,
        type: 'success'
      });
      
      // Recargar información de páginas en el modal
      await reloadPagesInfo();
      
      // MEJORA: Actualizar también la información de "Archivos procesados"
      if (state.selectedAva) {
        loadProcessedFiles(state.selectedAva.id_ava);
      }
    } else {
      throw new Error(response.error || 'Error al eliminar la página');
    }
  } catch (error) {
    console.error('Error al eliminar página:', error);
    
    showNotification({
      title: 'Error',
      message: error.message || 'Error al eliminar la página',
      type: 'error'
    });
  } finally {
    setLoadingState(false);
  }
}

/**
 * Limpia los mensajes de error de los elementos
 */
function clearErrors() {
  const contentElement = getElement('modal-content');
  const metadataElement = getElement('modal-metadata');
  
  if (contentElement) {
    contentElement.classList.remove('error-content');
    contentElement.textContent = 'Cargando contenido...';
  }
  
  if (metadataElement) {
    metadataElement.classList.remove('error-content');
    metadataElement.textContent = 'Cargando metadatos...';
  }
}

/**
 * Muestra el modal de confirmación para eliminar una página
 */
function showDeleteConfirmation() {
  const confirmModal = getElement('confirm-delete-page-modal');
  const confirmFilename = getElement('confirm-filename');
  const confirmPage = getElement('confirm-page');
  const confirmTotalPages = getElement('confirm-total-pages');
  
  if (confirmModal && confirmFilename && confirmPage && confirmTotalPages) {
    const truncatedName = truncateFilename(embeddingModalState.filename, 40);
    
    // Llenar información
    confirmFilename.textContent = truncatedName;
    confirmFilename.title = embeddingModalState.filename; // Tooltip con nombre completo
    confirmPage.textContent = embeddingModalState.currentPage;
    confirmTotalPages.textContent = embeddingModalState.totalPages;
    
    const closeConfirmModal = () => {
      confirmModal.classList.remove('active');
      unregisterActiveModal(confirmModal);
    };
    
    confirmModal.classList.add('active');
    registerActiveModal(confirmModal, closeConfirmModal);
    
    const cancelButton = getElement('cancel-delete-page');
    const confirmButton = getElement('confirm-delete-page');
    const closeButton = confirmModal.querySelector('.neural-modal-close');
    const overlay = confirmModal.querySelector('.neural-modal-overlay');
    
    if (cancelButton) {
        cancelButton.removeEventListener('click', closeConfirmModal);
        cancelButton.addEventListener('click', closeConfirmModal);
    }
    if (closeButton) {
        closeButton.removeEventListener('click', closeConfirmModal);
        closeButton.addEventListener('click', closeConfirmModal);
    }
    if (overlay) {
        overlay.removeEventListener('click', closeConfirmModal);
        overlay.addEventListener('click', closeConfirmModal);
    }
    
    if (confirmButton) {
        const handleConfirmDelete = async () => {
            closeConfirmModal();
            await deletePage(
                embeddingModalState.avaId, 
                embeddingModalState.filename, 
                embeddingModalState.currentPage
            );
        };
        
        confirmButton.removeEventListener('click', handleConfirmDelete);
        confirmButton.addEventListener('click', handleConfirmDelete);
    }
  }
}

/**
 * Abre el modal
 */
function openModal(modal) {
  if (!modal) return;
  
  modal.classList.add('active');
  
  const closeModalFunc = () => {
    modal.classList.remove('active');
    unregisterActiveModal(modal);
  };
  
  registerActiveModal(modal, closeModalFunc);
  
  const closeButton = modal.querySelector('.neural-modal-close');
  const overlay = modal.querySelector('.neural-modal-overlay');
  
  if (closeButton) {
    closeButton.removeEventListener('click', closeModalFunc);
    closeButton.addEventListener('click', closeModalFunc);
  }
  
  if (overlay) {
    overlay.removeEventListener('click', closeModalFunc);
    overlay.addEventListener('click', closeModalFunc);
  }
}

/**
 * Cierra un modal de forma explícita
 */
function closeModal(modal) {
  if (!modal) return;
  
  modal.classList.remove('active');
  unregisterActiveModal(modal);
}

/**
 * Confirma la eliminación de un archivo
 */
function confirmDeleteFile(avaId, filename) {
    const truncatedName = truncateFilename(filename, 25);
    
    // 1. Crear el HTML del modal con IDs únicos
    const modalHTML = `
        <div class="neural-modal" id="confirm-delete-modal">
            <div class="neural-modal-overlay" id="file-delete-overlay"></div>
            <div class="neural-modal-container">
                <div class="neural-modal-header">
                    <h3>
                        <i class='bx bx-trash'></i>
                        <span>Confirmar Eliminación</span>
                    </h3>
                    <button class="neural-modal-close" id="file-delete-close">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="neural-modal-body">
                    <p>¿Estás seguro de que deseas eliminar el archivo "${truncatedName}"?</p>
                    <p class="filename-tooltip" title="${filename}">Esta acción eliminará todos los embeddings asociados y no se puede deshacer.</p>
                    
                    <div class="neural-action-container">
                        <button id="file-delete-cancel" class="neural-button secondary">
                            <i class='bx bx-x'></i>
                            <span>Cancelar</span>
                        </button>
                        <button id="file-delete-confirm" class="neural-button danger">
                            <i class='bx bx-trash'></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 2. Eliminar modal anterior si existe
    const existingModal = document.getElementById('confirm-delete-modal');
    if (existingModal && existingModal.parentNode) {
        existingModal.parentNode.removeChild(existingModal);
    }
    
    // 3. Insertar nuevo modal directamente en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 4. Obtener referencia al nuevo modal
    const modal = document.getElementById('confirm-delete-modal');
    
    // 5. Definir función para cerrar modal
    function closeDeleteModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    // 6. Activar el modal
    modal.classList.add('active');
    
    // 7. Asignar eventos usando addEventListener
    
    // Botón de cierre (X)
    const closeButton = document.getElementById('file-delete-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeDeleteModal);
    }
    
    // Botón Cancelar
    const cancelButton = document.getElementById('file-delete-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', closeDeleteModal);
    }
    
    // Botón Eliminar
    const deleteButton = document.getElementById('file-delete-confirm');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            closeDeleteModal();
            // Luego ejecutar la eliminación
            deleteProcessedFile(avaId, filename);
        });
    }
    
    // Overlay de fondo
    const overlay = document.getElementById('file-delete-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeDeleteModal);
    }
    
    // Cierre con tecla Escape
    const escKeyHandler = (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
            document.removeEventListener('keydown', escKeyHandler);
        }
    };
    document.addEventListener('keydown', escKeyHandler);
}

/**
 * Cierra el modal de confirmación
 */
function closeConfirmModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    
    setTimeout(() => {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

/**
 * Elimina un archivo procesado
 */
async function deleteProcessedFile(avaId, filename) {
    try {
        showNotification({
            title: 'Eliminando archivo',
            message: 'Eliminando embeddings del archivo...',
            type: 'info',
            duration: 2000
        });
        
        const response = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification({
                title: 'Archivo Eliminado',
                message: `Se han eliminado ${response.deletedPages || 'los'} embeddings del archivo "${filename}"`,
                type: 'success'
            });
            
            // Recargar lista de archivos
            loadProcessedFiles(avaId);
        } else {
            throw new Error(response.error || 'Error al eliminar archivo');
        }
    } catch (error) {
        console.error('Error eliminando archivo:', error);
        
        showNotification({
            title: 'Error de Eliminación',
            message: error.message || 'Ha ocurrido un error al eliminar el archivo.',
            type: 'error'
        });
    }
}

/**
 * Formatea una fecha para mostrar
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString();
}

/**
 * Muestra u oculta el indicador de procesamiento de archivos
 */
function showFileProcessingIndicator(show) {
    let processingIndicator = document.getElementById('file-processing-indicator');
    
    if (!processingIndicator && show) {
        processingIndicator = document.createElement('div');
        processingIndicator.id = 'file-processing-indicator';
        processingIndicator.className = 'neural-loading-overlay';
        processingIndicator.innerHTML = `
            <div class="neural-loading-spinner">
                <div class="neural-spinner-circle"></div>
                <p>Procesando archivos...</p>
            </div>
        `;
        document.body.appendChild(processingIndicator);
    }
    
    if (processingIndicator) {
        processingIndicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Confirma la eliminación de un archivo específico
 */
function confirmRemoveFile(index, filename) {
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    const modal = document.getElementById('confirm-modal');
    const overlay = document.getElementById('form-overlay');
    
    if (!confirmTitle || !confirmMessage || !confirmOk || !confirmCancel || !modal || !overlay) {
        console.error('Elementos de confirmación no encontrados');
        return;
    }
    
    const truncatedName = truncateFilename(filename, 40); // Un poco más largo para el modal
    
    confirmTitle.textContent = 'Eliminar archivo';
    confirmMessage.textContent = `¿Estás seguro de que deseas eliminar el archivo "${truncatedName}"?`;
    confirmMessage.title = filename; // Mostrar nombre completo en tooltip
    confirmOk.textContent = 'Eliminar';
    
    modal.style.display = 'flex';
    overlay.style.display = 'block';
    
    const okHandler = () => {
        state.files.splice(index, 1);
        
        updateFilesList();
        
        modal.style.display = 'none';
        overlay.style.display = 'none';
        const notificationName = truncateFilename(filename, 20);
        
        showNotification({
            title: 'Archivo eliminado',
            message: `Se ha eliminado "${notificationName}" de la lista.`,
            type: 'info'
        });
        
        confirmOk.removeEventListener('click', okHandler);
        confirmCancel.removeEventListener('click', cancelHandler);
    };
    
    const cancelHandler = () => {
        // Solo ocultar modal
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        confirmOk.removeEventListener('click', okHandler);
        confirmCancel.removeEventListener('click', cancelHandler);
    };
    
    confirmOk.addEventListener('click', okHandler);
    confirmCancel.addEventListener('click', cancelHandler);
}

function setupEnhancedDropZone() {
    if (state.eventListenersAttached) {
        return;
    }
    
    const dropZone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-upload');
    
    if (!dropZone || !fileInput) return;
    
    state.eventListenersAttached = true;
    
    // Click en zona activa input de archivo
    dropZone.addEventListener('click', handleDropZoneClick);
    
    // Click en enlace de búsqueda
    const browseLink = dropZone.querySelector('.neural-browse-link');
    if (browseLink) {
        browseLink.addEventListener('click', handleBrowseLinkClick);
    }
    
    // Manejador para cambios en el input de archivo
    fileInput.addEventListener('change', handleFileInputChange);
    
    // INICIO: Mejora en el feedback visual para drag and drop
    
    // Contador para manejar múltiples eventos dragenter/dragleave
    let dragCounter = 0;
    
    // Evento para mostrar efectos al iniciar arrastre (en cualquier parte del documento)
    document.addEventListener('dragenter', function(e) {
        e.preventDefault();
        dragCounter++;
        
        // Solo mostrar efecto si tenemos archivos
        if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')) {
            dropZone.classList.add('dragActive');
        }
    });
    
    // Evento al salir del documento
    document.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dragCounter--;
        
        // Solo quitar efecto si realmente salimos de la ventana
        if (dragCounter === 0) {
            dropZone.classList.remove('dragActive');
        }
    });
    
    // Eventos para la zona específica de dropzone
    dropZone.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Solo mostrar efecto si tenemos archivos
        if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')) {
            dropZone.classList.add('drag-over');
            
            // Efecto extra en el cuerpo para mostrar que es una zona válida
            document.body.classList.add('drag-active');
        }
    });
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')) {
            e.dataTransfer.dropEffect = 'copy';
            dropZone.classList.add('drag-over');
        }
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Solo quitar efecto si realmente salimos del dropzone
        // y no de un elemento hijo
        if (e.currentTarget === e.target) {
            dropZone.classList.remove('drag-over');
            document.body.classList.remove('drag-active');
        }
    });
    
    // Al soltar los archivos
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        dragCounter = 0;
        dropZone.classList.remove('drag-over');
        dropZone.classList.remove('dragActive');
        document.body.classList.remove('drag-active');
        
        showFileProcessingIndicator(true);
        
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
        
        setTimeout(() => showFileProcessingIndicator(false), 500);
    });
    
    // Eventos para cuando el arrastre termina fuera de la zona
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        dragCounter = 0;
        dropZone.classList.remove('drag-over');
        dropZone.classList.remove('dragActive');
        document.body.classList.remove('drag-active');
    });
    
    // FIN: Mejora en el feedback visual para drag and drop
    
    setupActionButtons();
}

/**
 * Manejadores de eventos para la dropzone
 */
function handleDropZoneClick(e) {
    e.stopPropagation();
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) {
        fileInput.click();
    }
}

function handleBrowseLinkClick(e) {
    e.preventDefault();
    e.stopPropagation(); // Evitar doble activación
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileInputChange() {
    const fileInput = document.getElementById('pdf-upload');
    showFileProcessingIndicator(true);
    
    handleFiles(fileInput.files);
    
    // Importante: resetear el valor del input para permitir seleccionar el mismo archivo
    fileInput.value = '';
    
    setTimeout(() => showFileProcessingIndicator(false), 500);
}

/**
 * Maneja los archivos seleccionados
 */
function handleFiles(fileList) {
    const newFiles = Array.from(fileList).filter(file => {
        if (file.type !== 'application/pdf') {
            showNotification({
                title: 'Tipo de archivo no válido',
                message: `El archivo "${file.name}" no es un PDF. Solo se permiten archivos PDF.`,
                type: 'warning'
            });
            return false;
        }
        return true;
    });
    
    if (newFiles.length === 0) return;
    
    state.files = [...state.files, ...newFiles];
    
    updateFilesList();
    
    document.getElementById('upload-files-list').style.display = 'block';
}

/**
 * Trunca un nombre de archivo manteniendo la extensión
 * @param {string} filename - Nombre del archivo a truncar
 * @param {number} maxLength - Longitud máxima (por defecto 30)
 * @return {string} - Nombre truncado con la extensión preservada
 */
function truncateFilename(filename, maxLength = 30) {
    if (!filename) return '';
    
    // Si el nombre ya es corto, devolverlo sin cambios
    if (filename.length <= maxLength) return filename;
    
    const lastDotIndex = filename.lastIndexOf('.');
    
    // Si no hay extensión o está al principio
    if (lastDotIndex <= 0) {
        return filename.substring(0, maxLength - 3) + '...';
    }
    
    const name = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex);
    
    // Reservamos espacio para '...' y la extensión completa
    const maxNameLength = maxLength - 3 - extension.length;
    
    // Si no hay suficiente espacio ni para un carácter del nombre
    if (maxNameLength <= 0) {
        return filename.substring(0, maxLength - 3) + '...';
    }
    
    return name.substring(0, maxNameLength) + '...' + extension;
}

/**
 * Actualiza la lista visual de archivos
 */
function updateFilesList() {
    const filesList = document.querySelector('.neural-files-list');
    
    if (!filesList) return;
    
    filesList.innerHTML = '';
    
    // Si no hay archivos, ocultar la sección
    if (state.files.length === 0) {
        document.getElementById('upload-files-list').style.display = 'none';
        return;
    }
    
    state.files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'neural-file-item';
        
        const displayName = truncateFilename(file.name, 35);
        
        fileItem.innerHTML = `
            <div class="neural-file-item-content">
                <i class='bx bxs-file-pdf neural-file-icon'></i>
                <div class="neural-file-info">
                    <div class="neural-file-name" title="${file.name}">${displayName}</div>
                    <div class="neural-file-meta">${formatBytes(file.size)} - ${formatDate(file.lastModified)}</div>
                </div>
            </div>
            <div class="neural-file-actions">
                <button class="neural-remove-file" data-index="${index}" title="Eliminar archivo">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `;
        
        filesList.appendChild(fileItem);
    });
    
    document.querySelectorAll('.neural-remove-file').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const filename = state.files[index].name;
            
            confirmRemoveFile(index, filename);
        });
    });
}

/**
 * Configura botones de acción
 */
function setupActionButtons() {
    // Botón iniciar procesamiento
    const startButton = document.getElementById('start-upload');
    if (startButton) {
        startButton.removeEventListener('click', startProcessing);
        startButton.addEventListener('click', startProcessing);
    }
    
    // Botón limpiar lista
    const clearButton = document.getElementById('clear-files');
    if (clearButton) {
        clearButton.removeEventListener('click', handleClearFiles);
        clearButton.addEventListener('click', handleClearFiles);
    }
    
    // Botón cancelar procesamiento
    const cancelButton = document.getElementById('cancel-processing');
    if (cancelButton) {
        cancelButton.removeEventListener('click', handleCancelProcessing);
        cancelButton.addEventListener('click', handleCancelProcessing);
    }
    
    // Botón volver a entrenar
    const backToUploadButton = document.getElementById('back-to-upload');
    if (backToUploadButton) {
        backToUploadButton.removeEventListener('click', handleBackToUpload);
        backToUploadButton.addEventListener('click', handleBackToUpload);
    }
    
    setupLogToggle();
}

/**
 * Manejadores para botones de acción
 */
function handleClearFiles() {
    if (state.files.length === 0) {
        showNotification({
            title: 'Sin archivos',
            message: 'No hay archivos para eliminar.',
            type: 'info'
        });
        return;
    }
    
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    const modal = document.getElementById('confirm-modal');
    const overlay = document.getElementById('form-overlay');
    
    if (!confirmTitle || !confirmMessage || !confirmOk || !confirmCancel || !modal || !overlay) {
        console.error('Elementos de confirmación no encontrados');
        return;
    }
    
    confirmTitle.textContent = 'Limpiar lista';
    confirmMessage.textContent = `¿Estás seguro de que deseas eliminar todos los archivos de la lista?`;
    confirmOk.textContent = 'Eliminar todos';
    
    modal.style.display = 'flex';
    overlay.style.display = 'block';
    
    const handleConfirm = () => {
        const count = state.files.length;
        state.files = [];
        updateFilesList();
        
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        // Una sola notificación independientemente del número de archivos
        showNotification({
            title: 'Lista limpiada',
            message: `Se han eliminado ${count} archivo(s) de la lista.`,
            type: 'info'
        });
        
        confirmOk.removeEventListener('click', handleConfirm);
        confirmCancel.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        confirmOk.removeEventListener('click', handleConfirm);
        confirmCancel.removeEventListener('click', handleCancel);
    };
    
    confirmOk.addEventListener('click', handleConfirm);
    confirmCancel.addEventListener('click', handleCancel);
}

function handleCancelProcessing() {
    // Por ahora solo mostramos mensaje, no se puede cancelar realmente
    showNotification({
        title: 'No se puede cancelar',
        message: 'No es posible cancelar el procesamiento una vez iniciado.',
        type: 'warning'
    });
}

function handleBackToUpload() {
    document.getElementById('upload-results').style.display = 'none';
    
    document.getElementById('selected-ava-section').style.display = 'block';
    
    switchTab('training-tab');
    
    state.progress = 0;
    state.processingStatus = 'idle';
    updateProgress(0);
}

/**
 * Configura el toggle de logs
 */
function setupLogToggle() {
    const toggleButton = document.getElementById('toggle-log');
    const logContent = document.getElementById('operation-log-content');
    
    if (toggleButton && logContent) {
        toggleButton.removeEventListener('click', handleLogToggle);
        toggleButton.addEventListener('click', handleLogToggle);
    }
}

function handleLogToggle() {
    const logContent = document.getElementById('operation-log-content');
    const toggleButton = document.getElementById('toggle-log');
    
    if (!logContent || !toggleButton) return;
    
    const isVisible = logContent.style.display !== 'none';
    
    logContent.style.display = isVisible ? 'none' : 'block';
    
    toggleButton.innerHTML = isVisible 
        ? '<i class="bx bx-chevron-down"></i>' 
        : '<i class="bx bx-chevron-up"></i>';
}

/**
 * Inicia el procesamiento de archivos
 */
async function startProcessing() {
    if (state.files.length === 0) {
        showNotification({
            title: 'Sin archivos',
            message: 'Por favor, selecciona al menos un archivo PDF para entrenar la mente del asistente.',
            type: 'warning'
        });
        return;
    }
    
    if (!state.selectedAva) {
        showNotification({
            title: 'AVA no seleccionado',
            message: 'Por favor, selecciona un AVA para almacenar los embeddings.',
            type: 'warning'
        });
        return;
    }
    
    try {
        state.processingStatus = 'preparing';
        state.progress = 0;
        state.currentOperation = 'Preparando archivos para entrenamiento...';
        state.logEntries = [];
        state.processingTimes = [];
        state.processingStartTime = Date.now();
        
        state.activeProcesses.clear();
        
        document.getElementById('selected-ava-section').style.display = 'none';
        
        document.getElementById('upload-progress').style.display = 'block';
        
        const uploadResults = document.getElementById('upload-results');
        if (uploadResults) {
            uploadResults.style.display = 'none';
        }
        
        updateProcessingUI();
        updateProgressTimer();
        
        addLogEntry(`Iniciando entrenamiento con ${state.files.length} archivos`, 'info');
        addLogEntry(`AVA seleccionado: ${state.selectedAva.nom_ava} (ID: ${state.selectedAva.id_ava})`, 'info');
        
        const userId = await getUserId();
        
        state.processingStatus = 'processing';
        state.currentOperation = `Procesando archivos (0/${state.files.length})...`;
        updateProcessingUI();
        
        let completedFiles = 0;
        
        for (let i = 0; i < state.files.length; i++) {
            const file = state.files[i];
            state.currentOperation = `Procesando archivo ${i+1}/${state.files.length}: ${file.name}`;
            updateProcessingUI();
            
            try {
                await processFile(file, i, state.selectedAva.id_ava, userId);
                completedFiles++;
                
                const fileProgress = completedFiles / state.files.length;
                updateProgress(Math.floor(fileProgress * 100));
            } catch (error) {
                console.error(`Error procesando archivo "${file.name}":`, error);
                addLogEntry(`Error procesando "${file.name}": ${error.message}`, 'error');
            }
        }
        
        state.processingStatus = 'completed';
        state.currentOperation = 'Entrenamiento completado con éxito';
        updateProgress(100);
        updateProcessingUI();
        
        addLogEntry('Entrenamiento finalizado correctamente', 'success');
        
        state.results.totalFiles = completedFiles;
        
        await showResults(state.selectedAva.id_ava);
        
        state.files = [];
        updateFilesList();
        
        showNotification({
            title: 'Entrenamiento Completado',
            message: `Se han procesado ${completedFiles} archivos correctamente.`,
            type: 'success'
        });
        
    } catch (error) {
        console.error('Error en procesamiento:', error);
        
        state.processingStatus = 'error';
        state.currentOperation = 'Error en entrenamiento: ' + error.message;
        updateProcessingUI();
        
        addLogEntry(`Error: ${error.message}`, 'error');
        
        showNotification({
            title: 'Error de Entrenamiento',
            message: error.message || 'Ha ocurrido un error al procesar los archivos.',
            type: 'error'
        });
    }
}

/**
 * Actualiza el temporizador de progreso
 */
function updateProgressTimer() {
    if (!state.processingStartTime || state.processingStatus === 'completed' || state.processingStatus === 'error') {
        return;
    }
    
    const timeElement = document.getElementById('progress-time');
    if (!timeElement) return;
    
    const elapsedSeconds = Math.floor((Date.now() - state.processingStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    setTimeout(updateProgressTimer, 1000);
}

/**
 * Obtiene el ID de usuario actual
 */
async function getUserId() {
    // Intenta obtener el ID de usuario de la sesión o de un elemento oculto
    const userIdElement = document.getElementById('current-user-id');
    
    if (userIdElement && userIdElement.value) {
        return userIdElement.value;
    }
    
    // (esto debería ser reemplazado con una implementación adecuada)
    return 1; // Usuario "admin" por defecto
}

/**
 * Actualiza interfaz de procesamiento
 */
function updateProcessingUI() {
    const operationText = document.getElementById('current-operation-text');
    if (operationText) {
        operationText.textContent = state.currentOperation;
        
        if (state.processingStatus === 'processing' || state.processingStatus === 'preparing') {
            operationText.classList.add('pulsing');
        } else {
            operationText.classList.remove('pulsing');
        }
    }
    
    updateLogs();
}

/**
 * Actualiza la barra de progreso
 */
function updateProgress(percentage) {
    state.progress = percentage;
    
    const progressPercentage = document.getElementById('progress-percentage');
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
    }
    
    const progressFill = document.querySelector('.neural-progress-fill');
    const progressGlow = document.querySelector('.neural-progress-glow');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressGlow) {
        progressGlow.style.width = `${percentage}%`;
    }
}

/**
 * Añade una entrada al log
 */
function addLogEntry(message, type = 'info') {
    const entry = {
        timestamp: new Date(),
        message,
        type
    };
    
    state.logEntries.push(entry);
    updateLogs();
}

/**
 * Actualiza la visualización de logs
 */
function updateLogs() {
    const logContent = document.getElementById('operation-log-content');
    if (!logContent) return;
    
    logContent.innerHTML = '';
    
    state.logEntries.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = `neural-log-entry ${entry.type}`;
        
        const time = entry.timestamp.toLocaleTimeString();
        logEntry.textContent = `[${time}] ${entry.message}`;
        
        logContent.appendChild(logEntry);
    });
    
    // Scroll al final
    logContent.scrollTop = logContent.scrollHeight;
}

/**
 * Procesa un archivo individual
 */
async function processFile(file, index, avaId, userId) {
    try {
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('userId', userId);
        
        // Subir archivo a la API
        addLogEntry(`Subiendo archivo "${file.name}" al servidor...`, 'info');
        
        const uploadResponse = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.success) {
            throw new Error(uploadResponse.error || 'Error al subir archivo');
        }
        
        addLogEntry(`Archivo "${file.name}" subido correctamente`, 'success');
        addLogEntry(`ID de proceso: ${uploadResponse.processId}`, 'info');
        
        const processId = uploadResponse.processId;
        state.activeProcesses.set(processId, {
            file,
            avaId,
            status: 'pending',
            progress: 0
        });
        
        await trackProcessing(processId, file.name);
        
        return true;
    } catch (error) {
        console.error(`Error procesando archivo "${file.name}":`, error);
        addLogEntry(`Error procesando "${file.name}": ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Sigue el progreso de procesamiento de un archivo
 */
async function trackProcessing(processId, fileName) {
    const maxAttempts = 300; // 5 minutos
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetchWithCSRF(`/api/ava/embeddings/process/${processId}`, {
                method: 'GET'
            });
            
            const processInfo = state.activeProcesses.get(processId);
            if (processInfo) {
                processInfo.status = response.status;
                processInfo.progress = response.progress;
                state.activeProcesses.set(processId, processInfo);
            }
            
            const progressMessage = `${fileName}: ${response.message || 'Procesando...'} (${response.progress}%)`;
            addLogEntry(progressMessage, 'info');
            
            // Si ha terminado, salir del bucle
            if (response.status === 'completed') {
                addLogEntry(`Procesamiento de "${fileName}" completado: ${response.result?.pages || 0} páginas procesadas`, 'success');
                return;
            }
            
            // Si ha fallado, lanzar error
            if (response.status === 'error') {
                throw new Error(response.message || 'Error en procesamiento');
            }
            
            await sleep(1000);
            attempts++;
            
        } catch (error) {
            console.error(`Error siguiendo progreso de ${processId}:`, error);
            addLogEntry(`Error en seguimiento de "${fileName}": ${error.message}`, 'warning');
            
            await sleep(2000);
            attempts++;
        }
    }
    
    // Si llegamos aquí, se agotó el tiempo
    throw new Error(`Tiempo de espera agotado para "${fileName}"`);
}

/**
 * Muestra la sección de resultados finales
 */
async function showResults(avaId) {
    try {
        const statsResponse = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/stats`, {
            method: 'GET'
        });
        
        const filesResponse = await fetchWithCSRF(`/api/ava/${avaId}/embeddings/files`, {
            method: 'GET'
        });
        
        document.getElementById('upload-progress').style.display = 'none';
        
        const resultsSection = document.getElementById('upload-results');
        resultsSection.style.display = 'block';
        
        const totalFiles = document.getElementById('total-files');
        const totalPages = document.getElementById('total-pages');
        const avaName = document.getElementById('ava-name');
        
        if (totalFiles) totalFiles.textContent = filesResponse.success ? filesResponse.count : state.results.totalFiles;
        if (totalPages) totalPages.textContent = statsResponse.success ? statsResponse.stats.total_documents : '0';
        if (avaName) avaName.textContent = state.selectedAva.nom_ava;
        
        const fileResultsContainer = document.getElementById('file-results-list');
        if (fileResultsContainer) {
            fileResultsContainer.innerHTML = '';
            
            // Si hay archivos en la respuesta, mostrarlos
            if (filesResponse.success && Array.isArray(filesResponse.files) && filesResponse.files.length > 0) {
                filesResponse.files.forEach(file => {
                    const card = document.createElement('div');
                    card.className = 'neural-processed-file-card';
                    
                    const uploadDate = new Date(file.uploaded_at);
                    const formattedDate = uploadDate.toLocaleDateString() + ' ' + uploadDate.toLocaleTimeString();
                    
                    card.innerHTML = `
                        <div class="neural-processed-file-header">
                            <i class='bx bxs-file-pdf'></i>
                            <div class="neural-processed-file-title" title="${file.filename}">${file.filename}</div>
                        </div>
                        <div class="neural-processed-file-content">
                            <div class="neural-processed-file-stats">
                                <div class="neural-processed-file-stat">
                                    <div class="neural-processed-file-stat-value">${file.pages || '?'}</div>
                                    <div class="neural-processed-file-stat-label">Páginas</div>
                                </div>
                                <div class="neural-processed-file-stat">
                                    <div class="neural-processed-file-stat-value">${formatDate(file.uploaded_at)}</div>
                                    <div class="neural-processed-file-stat-label">Subido</div>
                                </div>
                            </div>
                            <div class="neural-processed-file-actions">
                                <button class="neural-button secondary view-result-embeddings" data-filename="${file.filename}" data-avaid="${avaId}">
                                    <i class='bx bx-code-block'></i> Ver contenido
                                </button>
                            </div>
                        </div>
                    `;
                    
                    fileResultsContainer.appendChild(card);
                });
                
                document.querySelectorAll('.view-result-embeddings').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const filename = e.currentTarget.dataset.filename;
                        const avaId = e.currentTarget.dataset.avaid;
                        await showEmbeddingContent(avaId, filename);
                    });
                });
            } else {
                fileResultsContainer.innerHTML = `
                    <div class="neural-empty-selection">
                        <div class="neural-empty-icon">
                            <i class='bx bx-file'></i>
                        </div>
                        <p>No se encontraron archivos procesados para este AVA</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error obteniendo resultados:', error);
        
        showNotification({
            title: 'Error',
            message: 'No se pudieron obtener los resultados completos.',
            type: 'error'
        });
        
        const totalFiles = document.getElementById('total-files');
        const totalPages = document.getElementById('total-pages');
        const avaName = document.getElementById('ava-name');
        
        if (totalFiles) totalFiles.textContent = state.results.totalFiles;
        if (totalPages) totalPages.textContent = '?';
        if (avaName && state.selectedAva) avaName.textContent = state.selectedAva.nom_ava;
        
        const uploadResults = document.getElementById('upload-results');
        if (uploadResults) {
            uploadResults.style.display = 'block';
        }
    }
}

export default {
    initTrainMindModule
};