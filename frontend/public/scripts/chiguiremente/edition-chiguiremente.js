// Módulo para edición de elementos
import { showNotification, fetchWithCSRF, showConfirmModal, truncateText, setupImageFallback } from './utils-chiguiremente.js';

// Estado del módulo
const state = {
    activeTab: 'edit-welcome-tab',
    currentEditingItem: null,
    formOverlay: null,
    sections: {},
    carreras: [],
    eventListeners: new Map() // Para gestionar listeners y evitar duplicados
};

/**
 * Inicializa el módulo de edición
 */
export function initEditionModule() {
    console.log('Inicializando módulo de edición...');
    
    // Inicializar estado
    initState();
    
    // Configurar navegación de tabs
    setupTabNavigation();
    
    // Configurar cerrado de formularios modales
    setupFormClosing();
    
    // Configurar visualización de imágenes con preview
    setupImagePreviews();
    
    // Escuchar activación de vista
    document.addEventListener('viewActivated', (event) => {
        if (event.detail.view === 'edition') {
            handleViewActivation(event.detail);
        }
    });
    
    // Cargar datos iniciales si estamos en la vista de edición
    if (window.location.hash === '#edition') {
        loadAllData();
    }
    
    // Asegurar que el DOM está completamente cargado
    setTimeout(() => {
        setupImagePreviews();
    }, 500);
}

/**
 * Maneja la activación de la vista
 * @param {Object} detail - Detalles del evento
 */
function handleViewActivation(detail) {
    // Cargar datos cuando se active la vista
    loadAllData();
    
    // Configurar previews de nuevo (por si DOM se refresca)
    setupImagePreviews();
    
    // Obtener el estado de navegación enviado con el evento
    const navigationState = detail.navigationState;
    
    // Verificar si hay un ID de carrera para editar desde el dashboard
    const editCarreraId = sessionStorage.getItem('editCarreraId');
    
    if (editCarreraId) {
        handleEditCarreraFromDashboard(editCarreraId);
    } 
    else if (navigationState && navigationState.targetTab) {
        handleNavigationState(navigationState);
    } 
    else {
        resetToWelcomeTab();
    }
}

/**
 * Maneja la edición de carrera desde el dashboard
 * @param {string} editCarreraId - ID de la carrera a editar
 */
function handleEditCarreraFromDashboard(editCarreraId) {
    // Limpiar el storage para no volver a editar automáticamente
    sessionStorage.removeItem('editCarreraId');
    
    // Cambiar a la pestaña de carreras
    const carreraTab = document.querySelector('[data-tab="edit-carrera-tab"]');
    if (carreraTab) {
        carreraTab.click();
    }
    
    // Buscar la carrera y abrir formulario de edición
    loadItemForEdit('carrera', editCarreraId);
}

/**
 * Maneja el estado de navegación
 * @param {Object} navigationState - Estado de navegación
 */
function handleNavigationState(navigationState) {
    console.log('Activando tab específica:', navigationState.targetTab);
    
    // Limpiar el storage ahora que ya hemos usado la información
    localStorage.removeItem('navigationState');
    
    // Activar la pestaña solicitada
    const tabButton = document.querySelector(`[data-tab="${navigationState.targetTab}"]`);
    if (tabButton) {
        tabButton.click();
        
        // Si además hay un ID de carrera especificado
        if (navigationState.carreraId && navigationState.targetTab === 'edit-ava-tab') {
            handleCarreraFilter(navigationState.carreraId, navigationState.carreraName);
        }
    }
}

/**
 * Maneja el filtro de carrera
 * @param {number} carreraId - ID de la carrera
 * @param {string} carreraName - Nombre de la carrera
 */
function handleCarreraFilter(carreraId, carreraName) {
    // Esperar a que se carguen los datos y se renderice la interfaz
    setTimeout(() => {
        let categoryFound = false;
        
        // Buscar todas las categorías de AVA
        const categories = document.querySelectorAll('.ava-category');
        categories.forEach(category => {
            // Verificar si esta categoría corresponde a la carrera que buscamos
            if (category.dataset.carreraId == carreraId || 
                category.querySelector('.ava-category-title')?.textContent.includes(carreraName)) {
                
                categoryFound = true;
                expandCategory(category);
            }
        });
        
        // Si no encontramos la categoría, intentar búsqueda por nombre
        if (!categoryFound && carreraName) {
            applySearchFilter(carreraName);
        }
    }, 1500);
}

/**
 * Expande una categoría de AVA
 * @param {HTMLElement} category - Elemento de categoría
 */
function expandCategory(category) {
    const header = category.querySelector('.ava-category-header');
    if (header) {
        header.classList.add('expanded');
        
        const content = category.querySelector('.ava-category-content');
        if (content) {
            content.classList.add('expanded');
        }
        
        // Hacer scroll hacia esta categoría
        category.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Aplica filtro de búsqueda
 * @param {string} carreraName - Nombre de la carrera para filtrar
 */
function applySearchFilter(carreraName) {
    const searchInput = document.getElementById('ava-search');
    if (searchInput) {
        searchInput.value = carreraName;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Resaltar el campo de búsqueda
        searchInput.focus();
        searchInput.classList.add('filtered');
        setTimeout(() => {
            searchInput.classList.remove('filtered');
        }, 1500);
    }
}

/**
 * Configura las vistas previas de imágenes
 */
function setupImagePreviews() {
    console.log('Configurando vistas previas de imágenes para edición...');
    
    const fileInputConfigs = [
        { id: 'carrera-edit-imagen', nameId: 'carrera-edit-file-name' },
        { id: 'ava-edit-imagen', nameId: 'ava-edit-file-name' },
        { id: 'herramienta-edit-imagen', nameId: 'herramienta-edit-file-name' }
    ];
    
    fileInputConfigs.forEach(config => {
        const fileInput = document.getElementById(config.id);
        if (!fileInput) {
            console.warn(`No se encontró el input: ${config.id}`);
            return;
        }
        
        console.log(`Configurando vista previa para: ${config.id}`);
        
        // Remover listener anterior si existe
        const existingHandler = state.eventListeners.get(config.id);
        if (existingHandler) {
            fileInput.removeEventListener('change', existingHandler);
        }
        
        // Crear nuevo handler
        const handler = (event) => handleFileChange(event, config);
        state.eventListeners.set(config.id, handler);
        
        // Agregar nuevo listener
        fileInput.addEventListener('change', handler);
        
        // Crear contenedor de preview si no existe
        ensurePreviewContainer(config.id, fileInput);
    });
}

/**
 * Asegura que existe el contenedor de preview
 * @param {string} inputId - ID del input
 * @param {HTMLElement} fileInput - Elemento input
 */
function ensurePreviewContainer(inputId, fileInput) {
    const previewContainerId = `${inputId}-preview-container`;
    let previewContainer = document.getElementById(previewContainerId);
    
    if (!previewContainer) {
        console.log(`Creando contenedor de preview para: ${inputId}`);
        
        const formGroup = fileInput.closest('.form-group');
        if (formGroup) {
            previewContainer = document.createElement('div');
            previewContainer.id = previewContainerId;
            previewContainer.className = 'image-preview-container';
            previewContainer.style.display = 'none';
            
            // Insertar en la posición correcta
            const fileNameContainer = document.getElementById(`${inputId.split('-')[0]}-${inputId.split('-')[1]}-file-name`);
            if (fileNameContainer) {
                fileNameContainer.parentNode.insertBefore(previewContainer, fileNameContainer.nextSibling);
            } else {
                formGroup.appendChild(previewContainer);
            }
        }
    }
}

/**
 * Resetea a la pestaña de bienvenida
 */
function resetToWelcomeTab() {
    const tabButtons = document.querySelectorAll('[data-tab^="edit-"]');
    const tabPanes = document.querySelectorAll('#edition-view .tab-pane');
    const welcomeTab = document.getElementById('edit-welcome-tab');
    
    // Desactivar todos los botones y tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Activar la pestaña de bienvenida
    if (welcomeTab) {
        welcomeTab.classList.add('active');
        state.activeTab = 'edit-welcome-tab';
    }
}

/**
 * Maneja el cambio de archivo de imagen
 * @param {Event} event - Evento change
 * @param {Object} config - Configuración del input
 */
function handleFileChange(event, config) {
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    
    console.log(`Cambio detectado en: ${config.id}`);
    
    // Obtener elementos relacionados
    const nameSpan = document.getElementById(config.nameId);
    const previewContainerId = `${config.id}-preview-container`;
    let previewContainer = document.getElementById(previewContainerId);
    
    // Crear contenedor si no existe
    if (!previewContainer) {
        previewContainer = createPreviewContainer(config.id, fileInput);
    }
    
    if (file) {
        updateFileName(nameSpan, file.name);
        
        if (file.type.match('image.*')) {
            showImagePreview(file, previewContainer, fileInput, nameSpan);
        } else {
            hidePreview(previewContainer);
        }
    } else {
        updateFileName(nameSpan, 'No se ha seleccionado ningún archivo');
        hidePreview(previewContainer);
    }
}

/**
 * Crea un contenedor de preview
 * @param {string} inputId - ID del input
 * @param {HTMLElement} fileInput - Elemento input
 * @returns {HTMLElement} - Contenedor creado
 */
function createPreviewContainer(inputId, fileInput) {
    const formGroup = fileInput.closest('.form-group');
    if (!formGroup) {
        console.warn(`No se pudo encontrar el grupo del formulario para: ${inputId}`);
        return null;
    }
    
    const previewContainer = document.createElement('div');
    previewContainer.id = `${inputId}-preview-container`;
    previewContainer.className = 'image-preview-container';
    previewContainer.style.display = 'none';
    
    // Insertar después del elemento que muestra el nombre del archivo
    const nameSpan = document.getElementById(`${inputId.split('-')[0]}-${inputId.split('-')[1]}-file-name`);
    if (nameSpan) {
        nameSpan.parentNode.insertBefore(previewContainer, nameSpan.nextSibling);
    } else {
        formGroup.appendChild(previewContainer);
    }
    
    return previewContainer;
}

/**
 * Actualiza el nombre del archivo
 * @param {HTMLElement} nameSpan - Elemento span del nombre
 * @param {string} fileName - Nombre del archivo
 */
function updateFileName(nameSpan, fileName) {
    if (nameSpan) {
        nameSpan.textContent = fileName;
    }
}

/**
 * Oculta la vista previa
 * @param {HTMLElement} previewContainer - Contenedor de vista previa
 */
function hidePreview(previewContainer) {
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

/**
 * Muestra la vista previa de imagen
 * @param {File} file - Archivo de imagen
 * @param {HTMLElement} previewContainer - Contenedor de vista previa
 * @param {HTMLInputElement} fileInput - Input de archivo
 * @param {HTMLElement} nameSpan - Elemento span del nombre
 */
function showImagePreview(file, previewContainer, fileInput, nameSpan) {
    console.log(`Procesando vista previa para: ${file.name}`);
    
    // Limpiar contenedor
    previewContainer.innerHTML = '';
    
    // Crear elementos
    const elements = createPreviewElements(file.name);
    
    // Configurar botón de eliminar
    setupRemoveButton(elements.removeButton, fileInput, nameSpan, previewContainer);
    
    // Ensamblar estructura
    elements.header.appendChild(elements.filename);
    elements.header.appendChild(elements.removeButton);
    
    elements.imageWrapper.appendChild(elements.loading);
    elements.imageWrapper.appendChild(elements.image);
    
    previewContainer.appendChild(elements.header);
    previewContainer.appendChild(elements.imageWrapper);
    previewContainer.style.display = 'block';
    
    // Cargar imagen
    loadImagePreview(file, elements.image, elements.loading);
}

/**
 * Crea los elementos de la vista previa
 * @param {string} filename - Nombre del archivo
 * @returns {Object} - Elementos creados
 */
function createPreviewElements(filename) {
    // Header
    const header = document.createElement('div');
    header.className = 'preview-header';
    
    // Filename
    const filenameElement = document.createElement('div');
    filenameElement.className = 'preview-filename';
    filenameElement.textContent = filename;
    
    // Remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'preview-remove';
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', 'Eliminar imagen');
    
    // Icono del botón (CSP safe)
    const removeIcon = document.createElement('i');
    removeIcon.className = 'bx bx-x';
    removeButton.appendChild(removeIcon);
    
    // Image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'preview-image-wrapper';
    
    // Loading indicator
    const loading = createLoadingIndicator();
    
    // Image element
    const image = document.createElement('img');
    image.className = 'image-preview';
    image.alt = 'Vista previa';
    
    return {
        header,
        filename: filenameElement,
        removeButton,
        imageWrapper,
        loading,
        image
    };
}

/**
 * Crea el indicador de carga
 * @returns {HTMLElement} - Elemento de carga
 */
function createLoadingIndicator() {
    const loading = document.createElement('div');
    loading.className = 'preview-loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'preview-spinner';
    
    const loadingText = document.createElement('div');
    loadingText.className = 'preview-loading-text';
    loadingText.textContent = 'Cargando imagen...';
    
    loading.appendChild(spinner);
    loading.appendChild(loadingText);
    
    return loading;
}

/**
 * Configura el botón de eliminar imagen
 * @param {HTMLElement} removeButton - Botón de eliminar
 * @param {HTMLInputElement} fileInput - Input de archivo
 * @param {HTMLElement} nameSpan - Elemento span del nombre
 * @param {HTMLElement} previewContainer - Contenedor de vista previa
 */
function setupRemoveButton(removeButton, fileInput, nameSpan, previewContainer) {
    removeButton.addEventListener('click', () => {
        fileInput.value = '';
        updateFileName(nameSpan, 'No se ha seleccionado ningún archivo');
        hidePreview(previewContainer);
        fileInput.dispatchEvent(new Event('change'));
    });
}

/**
 * Carga la vista previa de imagen
 * @param {File} file - Archivo de imagen
 * @param {HTMLImageElement} imageElement - Elemento de imagen
 * @param {HTMLElement} loadingElement - Elemento de carga
 */
function loadImagePreview(file, imageElement, loadingElement) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        imageElement.src = e.target.result;
        
        imageElement.onload = function() {
            loadingElement.style.display = 'none';
        };
        
        imageElement.onerror = function() {
            console.error('Error al cargar la imagen');
            loadingElement.style.display = 'none';
        };
        
        console.log('Vista previa generada correctamente');
    };
    
    reader.onerror = function(e) {
        console.error('Error al leer el archivo:', e);
        loadingElement.style.display = 'none';
    };
    
    reader.readAsDataURL(file);
}

/**
 * Carga un elemento específico para edición
 * @param {string} section - Sección
 * @param {string} itemId - ID del elemento
 */
async function loadItemForEdit(section, itemId) {
    try {
        const { apiEndpoint } = state.sections[section];
        
        const response = await fetchWithCSRF(`${apiEndpoint}/${itemId}`);
        
        if (response) {
            openEditForm(section, response);
        }
    } catch (error) {
        console.error(`Error al cargar elemento para edición:`, error);
        
        showNotification({
            title: 'Error de Carga',
            message: 'No se pudo cargar el elemento para edición.',
            type: 'error'
        });
    }
}

/**
 * Inicializa el estado del módulo
 */
function initState() {
    state.formOverlay = document.getElementById('form-overlay');
    
    state.sections = {
        carrera: {
            grid: document.getElementById('carrera-grid'),
            editForm: document.getElementById('carrera-edit-form'),
            form: document.getElementById('carrera-form'),
            searchInput: document.getElementById('carrera-search'),
            spinner: document.getElementById('carrera-spinner'),
            apiEndpoint: '/api/carrera/carrera',
            idField: 'id_carrera',
            nameField: 'nombre',
            deleteButton: document.getElementById('carrera-delete'),
            cancelButton: document.getElementById('carrera-cancel-edit')
        },
        ava: {
            list: document.getElementById('ava-list'),
            editForm: document.getElementById('ava-edit-form'),
            form: document.getElementById('ava-form'),
            searchInput: document.getElementById('ava-search'),
            spinner: document.getElementById('ava-spinner'),
            apiEndpoint: '/api/avas',
            idField: 'id_ava',
            nameField: 'nom_ava',
            deleteButton: document.getElementById('ava-delete'),
            cancelButton: document.getElementById('ava-cancel-edit')
        },
        herramienta: {
            grid: document.getElementById('herramienta-grid'),
            editForm: document.getElementById('herramienta-edit-form'),
            form: document.getElementById('herramienta-form'),
            searchInput: document.getElementById('herramienta-search'),
            spinner: document.getElementById('herramienta-spinner'),
            apiEndpoint: '/api/herramientas',
            idField: 'id',
            nameField: 'nombre',
            deleteButton: document.getElementById('herramienta-delete'),
            cancelButton: document.getElementById('herramienta-cancel-edit')
        }
    };
}

/**
 * Configura la navegación entre pestañas
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('[data-tab^="edit-"]');
    const tabPanes = document.querySelectorAll('#edition-view .tab-pane');
    const welcomeTab = document.getElementById('edit-welcome-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleTabNavigation(button, tabButtons, tabPanes, welcomeTab);
        });
    });
}

/**
 * Maneja la navegación de pestañas
 * @param {HTMLElement} button - Botón clickeado
 * @param {NodeList} tabButtons - Todos los botones
 * @param {NodeList} tabPanes - Todos los paneles
 * @param {HTMLElement} welcomeTab - Pestaña de bienvenida
 */
function handleTabNavigation(button, tabButtons, tabPanes, welcomeTab) {
    // Ocultar pantalla de bienvenida
    if (welcomeTab) {
        welcomeTab.classList.remove('active');
    }
    
    // Desactivar todos los botones y tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Activar el botón y tab seleccionados
    button.classList.add('active');
    const tabId = button.dataset.tab;
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Actualizar estado
    state.activeTab = tabId;
}

/**
 * Configura el cerrado de formularios modales
 */
function setupFormClosing() {
    // Botones de cierre en formularios
    const closeButtons = document.querySelectorAll('.close-form');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllForms);
    });
    
    // Cerrar al hacer clic en overlay
    if (state.formOverlay) {
        state.formOverlay.addEventListener('click', closeAllForms);
    }
    
    // Botones de cancelar en formularios
    Object.values(state.sections).forEach(section => {
        if (section.cancelButton) {
            section.cancelButton.addEventListener('click', closeAllForms);
        }
    });
}

/**
 * Cierra todos los formularios modales
 */
function closeAllForms() {
    if (!state.formOverlay) return;
    
    // Remover clases activas para la animación de salida
    state.formOverlay.classList.remove('active');
    
    Object.values(state.sections).forEach(section => {
        if (section.editForm) {
            section.editForm.classList.remove('active');
        }
    });
    
    // Esperar a que termine la animación antes de ocultar completamente
    setTimeout(() => {
        Object.values(state.sections).forEach(section => {
            if (section.editForm) {
                section.editForm.style.display = 'none';
            }
        });
        
        state.formOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        state.currentEditingItem = null;
    }, 300);
}

/**
 * Carga todos los datos para las listas
 */
async function loadAllData() {
    try {
        // Cargar carreras primero
        const carreras = await fetchWithCSRF('/api/carrera/carrera', {
            method: 'GET'
        });
        
        if (Array.isArray(carreras)) {
            state.carreras = carreras;
        }
        
        // Cargar el resto de los datos
        loadList('carrera');
        loadList('ava');
        loadList('herramienta');
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }
}

/**
 * Obtiene el nombre de una carrera a partir de su ID
 * @param {number} carreraId - ID de la carrera
 * @returns {string} - Nombre de la carrera
 */
function getCarreraName(carreraId) {
    if (!carreraId) return 'Sin carrera';
    
    const carrera = state.carreras.find(c => c.id_carrera == carreraId);
    return carrera ? carrera.nombre : `Carrera #${carreraId}`;
}

/**
 * Carga lista de elementos para una sección específica
 * @param {string} sectionName - Nombre de la sección
 */
async function loadList(sectionName) {
    const section = state.sections[sectionName];
    const container = section.grid || section.list;
    const { apiEndpoint, spinner } = section;
    
    if (!container || !spinner) return;
    
    // Mostrar spinner
    spinner.style.display = 'block';
    container.innerHTML = '';
    
    try {
        const response = await fetchWithCSRF(apiEndpoint, {
            method: 'GET'
        });
        
        // Ocultar spinner
        spinner.style.display = 'none';
        
        if (sectionName === 'ava') {
            await renderAvasTable(response);
        } else {
            container.innerHTML = '';
            
            if (response.length === 0) {
                showEmptyState(container, 'No hay elementos disponibles', 'Los elementos creados aparecerán aquí');
                return;
            }
            
            renderItemsGrid(sectionName, response);
        }
        
        setupSearch(sectionName, response);
        
    } catch (error) {
        console.error(`Error al cargar elementos de ${sectionName}:`, error);
        spinner.style.display = 'none';
        
        showNotification({
            title: 'Error de Carga',
            message: `No se pudieron cargar los elementos de ${sectionName}. Por favor, intenta de nuevo más tarde.`,
            type: 'error'
        });
        
        showEmptyState(container, 'Error al cargar los datos', 'Intente de nuevo más tarde.', 'bx-error', '#f44336');
    }
}

/**
 * Muestra un estado vacío
 * @param {HTMLElement} container - Contenedor
 * @param {string} message - Mensaje principal
 * @param {string} description - Descripción
 * @param {string} icon - Clase del icono
 * @param {string} color - Color del icono
 */
function showEmptyState(container, message, description, icon = 'bx-search', color = null) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    const iconElement = document.createElement('i');
    iconElement.className = `bx ${icon}`;
    if (color) {
        iconElement.style.color = color;
    }
    
    const messageElement = document.createElement('p');
    messageElement.className = 'empty-state-message';
    messageElement.textContent = message;
    
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'empty-state-description';
    descriptionElement.textContent = description;
    
    emptyState.appendChild(iconElement);
    emptyState.appendChild(messageElement);
    emptyState.appendChild(descriptionElement);
    
    container.appendChild(emptyState);
}

/**
 * Renderiza items en formato de grid
 * @param {string} sectionName - Nombre de la sección
 * @param {Array} items - Items a renderizar
 */
function renderItemsGrid(sectionName, items) {
    const { grid, nameField, idField } = state.sections[sectionName];
    
    items.forEach(item => {
        const card = createItemCard(sectionName, item, nameField, idField);
        grid.appendChild(card);
    });
}

/**
 * Crea una tarjeta de item
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {string} nameField - Campo del nombre
 * @param {string} idField - Campo del ID
 * @returns {HTMLElement} - Tarjeta creada
 */
function createItemCard(sectionName, item, nameField, idField) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    // Crear estructura de la tarjeta
    const imageDiv = createItemImageDiv(item, nameField);
    const contentDiv = createItemContentDiv(item, nameField, sectionName);
    const actionsDiv = createItemActionsDiv(item, idField, sectionName);
    
    card.appendChild(imageDiv);
    card.appendChild(contentDiv);
    card.appendChild(actionsDiv);
    
    return card;
}

/**
 * Crea el div de imagen del item
 * @param {Object} item - Item
 * @param {string} nameField - Campo del nombre
 * @returns {HTMLElement} - Div de imagen
 */
function createItemImageDiv(item, nameField) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'item-image';
    
    const img = document.createElement('img');
    img.src = item.imagen || '/images/placeholder.jpg';
    img.alt = item[nameField];
    
    // Configurar fallback de imagen (CSP safe)
    setupImageFallback(img, '/images/placeholder.jpg');
    
    imageDiv.appendChild(img);
    return imageDiv;
}

/**
 * Crea el div de contenido del item
 * @param {Object} item - Item
 * @param {string} nameField - Campo del nombre
 * @param {string} sectionName - Nombre de la sección
 * @returns {HTMLElement} - Div de contenido
 */
function createItemContentDiv(item, nameField, sectionName) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';
    
    // Título
    const title = document.createElement('h3');
    title.className = 'item-title';
    title.textContent = item[nameField];
    
    // Descripción
    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent = truncateText(item.descripcion || 'Sin descripción disponible', 100);
    
    // Metadatos
    const metaDiv = document.createElement('div');
    metaDiv.className = 'item-meta';
    
    const metaItems = createMetaItems(sectionName, item);
    metaItems.forEach(metaItem => {
        metaDiv.appendChild(metaItem);
    });
    
    contentDiv.appendChild(title);
    contentDiv.appendChild(description);
    contentDiv.appendChild(metaDiv);
    
    return contentDiv;
}

/**
 * Crea elementos meta según el tipo de sección
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @returns {Array} - Array de elementos meta
 */
function createMetaItems(sectionName, item) {
    const metaItems = [];
    
    if (sectionName === 'carrera') {
        metaItems.push(createMetaItem('bx-code', item.month || 'N/A'));
        metaItems.push(createMetaItem('bx-code-alt', item.year || 'N/A'));
    } else if (sectionName === 'herramienta') {
        metaItems.push(createMetaItem('bx-link', item.slug || 'Sin slug'));
    }
    
    return metaItems;
}

/**
 * Crea un elemento meta
 * @param {string} iconClass - Clase del icono
 * @param {string} text - Texto
 * @returns {HTMLElement} - Elemento meta
 */
function createMetaItem(iconClass, text) {
    const metaItem = document.createElement('div');
    metaItem.className = 'item-meta-data';
    
    const icon = document.createElement('i');
    icon.className = `bx ${iconClass}`;
    
    const span = document.createElement('span');
    span.className = 'paddle-code';
    span.textContent = text;
    
    metaItem.appendChild(icon);
    metaItem.appendChild(span);
    
    return metaItem;
}

/**
 * Crea el div de acciones del item
 * @param {Object} item - Item
 * @param {string} idField - Campo del ID
 * @param {string} sectionName - Nombre de la sección
 * @returns {HTMLElement} - Div de acciones
 */
function createItemActionsDiv(item, idField, sectionName) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';
    
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.dataset.id = item[idField];
    
    const icon = document.createElement('i');
    icon.className = 'bx bx-edit';
    
    const text = document.createTextNode(' Editar');
    
    editButton.appendChild(icon);
    editButton.appendChild(text);
    
    // Agregar evento de edición
    editButton.addEventListener('click', () => {
        openEditForm(sectionName, item);
    });
    
    actionsDiv.appendChild(editButton);
    return actionsDiv;
}

/**
 * Renderiza AVAs en formato de tabla
 * @param {Array} avas - Array de AVAs
 */
async function renderAvasTable(avas) {
    const { list } = state.sections.ava;
    
    try {
        list.innerHTML = '';
        
        if (avas.length === 0) {
            showEmptyState(list, 'No hay AVAs disponibles', 'Los AVAs creados aparecerán aquí');
            return;
        }
        
        // Agrupar AVAs por carrera
        const avasByCarrera = groupAvasByCarrera(avas);
        
        // Crear tablas por carrera
        Object.values(avasByCarrera).forEach(carreraGroup => {
            const categoryContainer = createAvaCategoryContainer(carreraGroup);
            list.appendChild(categoryContainer);
        });
    } catch (error) {
        console.error('Error al renderizar tabla de AVAs:', error);
        
        showNotification({
            title: 'Error de Renderizado',
            message: 'No se pudieron mostrar los AVAs. Por favor, intenta de nuevo más tarde.',
            type: 'error'
        });
        
        showEmptyState(list, 'Error al mostrar los datos', 'Intente de nuevo más tarde.', 'bx-error', '#f44336');
    }
}

/**
 * Agrupa AVAs por carrera
 * @param {Array} avas - Array de AVAs
 * @returns {Object} - AVAs agrupados
 */
function groupAvasByCarrera(avas) {
    const avasByCarrera = {};
    
    avas.forEach(ava => {
        const carreraId = ava.id_carrera;
        const carreraKey = carreraId || 'sin-carrera';
        
        if (!avasByCarrera[carreraKey]) {
            avasByCarrera[carreraKey] = {
                id: carreraId,
                name: getCarreraName(carreraId),
                items: []
            };
        }
        avasByCarrera[carreraKey].items.push(ava);
    });
    
    return avasByCarrera;
}

/**
 * Crea un contenedor de categoría de AVA
 * @param {Object} carreraGroup - Grupo de carrera
 * @returns {HTMLElement} - Contenedor de categoría
 */
function createAvaCategoryContainer(carreraGroup) {
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'ava-category';
    categoryContainer.setAttribute('data-carrera-id', carreraGroup.id);
    
    // Crear cabecera de categoría
    const categoryHeader = createAvaCategoryHeader(carreraGroup);
    
    // Crear contenido de categoría
    const categoryContent = createAvaCategoryContent(carreraGroup);
    
    // Agregar evento para expandir/colapsar
    categoryHeader.addEventListener('click', () => {
        categoryHeader.classList.toggle('expanded');
        categoryContent.classList.toggle('expanded');
    });
    
    categoryContainer.appendChild(categoryHeader);
    categoryContainer.appendChild(categoryContent);
    
    return categoryContainer;
}

/**
 * Crea la cabecera de categoría de AVA
 * @param {Object} carreraGroup - Grupo de carrera
 * @returns {HTMLElement} - Cabecera de categoría
 */
function createAvaCategoryHeader(carreraGroup) {
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'ava-category-header';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'ava-category-title';
    
    const chevronIcon = document.createElement('i');
    chevronIcon.className = 'bx bx-chevron-right';
    
    const titleText = document.createTextNode(carreraGroup.name);
    
    titleDiv.appendChild(chevronIcon);
    titleDiv.appendChild(titleText);
    
    const badge = document.createElement('div');
    badge.className = 'ava-category-badge';
    badge.textContent = carreraGroup.items.length;
    
    categoryHeader.appendChild(titleDiv);
    categoryHeader.appendChild(badge);
    
    return categoryHeader;
}

/**
 * Crea el contenido de categoría de AVA
 * @param {Object} carreraGroup - Grupo de carrera
 * @returns {HTMLElement} - Contenido de categoría
 */
function createAvaCategoryContent(carreraGroup) {
    const categoryContent = document.createElement('div');
    categoryContent.className = 'ava-category-content';
    
    const tableContainer = document.createElement('div');
    tableContainer.className = 'ava-table-container';
    
    const table = createAvaTable(carreraGroup.items);
    tableContainer.appendChild(table);
    categoryContent.appendChild(tableContainer);
    
    return categoryContent;
}

/**
 * Crea la tabla de AVAs
 * @param {Array} avas - Array de AVAs
 * @returns {HTMLElement} - Tabla creada
 */
function createAvaTable(avas) {
    const table = document.createElement('table');
    table.className = 'ava-table';
    
    // Crear cabecera
    const thead = createAvaTableHeader();
    
    // Crear cuerpo
    const tbody = createAvaTableBody(avas);
    
    table.appendChild(thead);
    table.appendChild(tbody);
    
    return table;
}

/**
 * Crea la cabecera de la tabla de AVAs
 * @returns {HTMLElement} - Cabecera de tabla
 */
function createAvaTableHeader() {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    
    const headers = ['Imagen', 'Nombre', 'Descripción', 'Slug', 'Tabla Embeddings', 'Acciones'];
    
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        tr.appendChild(th);
    });
    
    thead.appendChild(tr);
    return thead;
}

/**
 * Crea el cuerpo de la tabla de AVAs
 * @param {Array} avas - Array de AVAs
 * @returns {HTMLElement} - Cuerpo de tabla
 */
function createAvaTableBody(avas) {
    const tbody = document.createElement('tbody');
    
    avas.forEach(ava => {
        const tr = createAvaTableRow(ava);
        tbody.appendChild(tr);
    });
    
    return tbody;
}

/**
 * Crea una fila de la tabla de AVAs
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Fila de tabla
 */
function createAvaTableRow(ava) {
    const tr = document.createElement('tr');
    
    // Imagen
    const imageTd = createAvaImageCell(ava);
    
    // Nombre
    const nameTd = createAvaNameCell(ava);
    
    // Descripción
    const descriptionTd = createAvaDescriptionCell(ava);
    
    // Slug
    const slugTd = createAvaSlugCell(ava);
    
    // Tabla de embeddings
    const embeddingTableTd = createAvaEmbeddingTableCell(ava);
    
    // Acciones
    const actionsTd = createAvaActionsCell(ava);
    
    tr.appendChild(imageTd);
    tr.appendChild(nameTd);
    tr.appendChild(descriptionTd);
    tr.appendChild(slugTd);
    tr.appendChild(embeddingTableTd);
    tr.appendChild(actionsTd);
    
    return tr;
}

/**
 * Crea la celda de imagen de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de imagen
 */
function createAvaImageCell(ava) {
    const td = document.createElement('td');
    
    const img = document.createElement('img');
    img.src = ava.imagen || '/images/placeholder.jpg';
    img.alt = ava.nom_ava;
    img.className = 'ava-image';
    
    setupImageFallback(img, '/images/placeholder.jpg');
    
    td.appendChild(img);
    return td;
}

/**
 * Crea la celda de nombre de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de nombre
 */
function createAvaNameCell(ava) {
    const td = document.createElement('td');
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'ava-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'ava-name';
    nameDiv.title = ava.nom_ava;
    nameDiv.textContent = ava.nom_ava;
    
    infoDiv.appendChild(nameDiv);
    td.appendChild(infoDiv);
    
    return td;
}

/**
 * Crea la celda de descripción de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de descripción
 */
function createAvaDescriptionCell(ava) {
    const td = document.createElement('td');
    
    const descripcionCompleta = ava.descripcion || 'Sin descripción disponible';
    const descripcion = truncateText(descripcionCompleta, 80);
    
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'ava-description';
    descriptionDiv.title = descripcionCompleta;
    descriptionDiv.setAttribute('data-full-text', descripcionCompleta);
    descriptionDiv.textContent = descripcion;
    
    td.appendChild(descriptionDiv);
    return td;
}

/**
 * Crea la celda de slug de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de slug
 */
function createAvaSlugCell(ava) {
    const td = document.createElement('td');
    
    const slugDiv = document.createElement('div');
    slugDiv.className = 'ava-slug';
    slugDiv.title = ava.slug || '—';
    slugDiv.textContent = ava.slug || '—';
    
    td.appendChild(slugDiv);
    return td;
}

/**
 * Crea la celda de tabla de embeddings de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de tabla de embeddings
 */
function createAvaEmbeddingTableCell(ava) {
    const td = document.createElement('td');
    
    const embeddingTableDiv = document.createElement('div');
    embeddingTableDiv.className = 'ava-embedding-table';
    embeddingTableDiv.title = ava.embedding_table_name || '—';
    embeddingTableDiv.textContent = ava.embedding_table_name || '—';
    
    td.appendChild(embeddingTableDiv);
    return td;
}

/**
 * Crea la celda de acciones de AVA
 * @param {Object} ava - AVA
 * @returns {HTMLElement} - Celda de acciones
 */
function createAvaActionsCell(ava) {
    const td = document.createElement('td');
    
    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.dataset.id = ava.id_ava;
    
    const icon = document.createElement('i');
    icon.className = 'bx bx-edit';
    
    const text = document.createTextNode(' Editar');
    
    editButton.appendChild(icon);
    editButton.appendChild(text);
    
    // Agregar evento de edición
    editButton.addEventListener('click', () => {
        openEditForm('ava', ava);
    });
    
    td.appendChild(editButton);
    return td;
}

/**
 * Configura búsqueda para una sección
 * @param {string} sectionName - Nombre de la sección
 * @param {Array} data - Datos para buscar
 */
function setupSearch(sectionName, data) {
    const section = state.sections[sectionName];
    const { searchInput } = section;
    const container = section.grid || section.list;
    
    if (!searchInput) return;
    
    // Limpiar eventos previos
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    state.sections[sectionName].searchInput = newSearchInput;
    
    newSearchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value, sectionName, container);
    });
}

/**
 * Maneja la búsqueda
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} sectionName - Nombre de la sección
 * @param {HTMLElement} container - Contenedor
 */
function handleSearch(searchTerm, sectionName, container) {
    const term = searchTerm.toLowerCase().trim();
    
    if (sectionName === 'ava') {
        handleAvaSearch(term, container);
    } else {
        handleGridSearch(term, container);
    }
}

/**
 * Maneja la búsqueda de AVAs
 * @param {string} searchTerm - Término de búsqueda
 * @param {HTMLElement} container - Contenedor
 */
function handleAvaSearch(searchTerm, container) {
    const categories = container.querySelectorAll('.ava-category');
    let anyVisible = false;
    
    categories.forEach(category => {
        const tableRows = category.querySelectorAll('tbody tr');
        let visibleItems = 0;
        
        tableRows.forEach(row => {
            const isVisible = checkAvaRowVisibility(row, searchTerm);
            row.style.display = isVisible ? '' : 'none';
            
            if (isVisible) {
                visibleItems++;
                anyVisible = true;
            }
        });
        
        updateCategoryVisibility(category, visibleItems, searchTerm);
    });
    
    updateSearchResults(container, anyVisible, searchTerm);
}

/**
 * Verifica la visibilidad de una fila de AVA
 * @param {HTMLElement} row - Fila de tabla
 * @param {string} searchTerm - Término de búsqueda
 * @returns {boolean} - Si es visible
 */
function checkAvaRowVisibility(row, searchTerm) {
    const name = row.querySelector('.ava-name')?.textContent.toLowerCase() || '';
    const description = row.querySelector('.ava-description')?.textContent.toLowerCase() || '';
    const slug = row.querySelector('.ava-slug')?.textContent.toLowerCase() || '';
    const embeddingTable = row.querySelector('.ava-embedding-table')?.textContent.toLowerCase() || '';
    
    return name.includes(searchTerm) || 
           description.includes(searchTerm) || 
           slug.includes(searchTerm) ||
           embeddingTable.includes(searchTerm);
}

/**
 * Actualiza la visibilidad de una categoría
 * @param {HTMLElement} category - Categoría
 * @param {number} visibleItems - Número de items visibles
 * @param {string} searchTerm - Término de búsqueda
 */
function updateCategoryVisibility(category, visibleItems, searchTerm) {
    // Actualizar contador en la categoría
    const badge = category.querySelector('.ava-category-badge');
    if (badge) {
        badge.textContent = visibleItems;
    }
    
    // Mostrar/ocultar toda la categoría
    category.style.display = visibleItems > 0 ? 'block' : 'none';
    
    // Expandir automáticamente si hay resultados
    if (searchTerm && visibleItems > 0) {
        const header = category.querySelector('.ava-category-header');
        const content = category.querySelector('.ava-category-content');
        if (header && content) {
            header.classList.add('expanded');
            content.classList.add('expanded');
        }
    }
}

/**
 * Maneja la búsqueda en grid
 * @param {string} searchTerm - Término de búsqueda
 * @param {HTMLElement} container - Contenedor
 */
function handleGridSearch(searchTerm, container) {
    const cards = container.querySelectorAll('.item-card');
    let anyVisible = false;
    
    cards.forEach(card => {
        const title = card.querySelector('.item-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.item-description')?.textContent.toLowerCase() || '';
        const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
        card.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) anyVisible = true;
    });
    
    updateSearchResults(container, anyVisible, searchTerm);
}

/**
 * Actualiza los resultados de búsqueda
 * @param {HTMLElement} container - Contenedor
 * @param {boolean} anyVisible - Si hay elementos visibles
 * @param {string} searchTerm - Término de búsqueda
 */
function updateSearchResults(container, anyVisible, searchTerm) {
    const noResultsEl = container.querySelector('.no-results');
    
    if (!anyVisible && searchTerm) {
        if (!noResultsEl) {
            const noResults = document.createElement('div');
            noResults.className = 'empty-state no-results';
            
            const icon = document.createElement('i');
            icon.className = 'bx bx-search';
            
            const message = document.createElement('p');
            message.className = 'empty-state-message';
            message.textContent = 'Sin resultados';
            
            const description = document.createElement('p');
            description.className = 'empty-state-description';
            description.textContent = `No se encontraron elementos que coincidan con "${searchTerm}"`;
            
            noResults.appendChild(icon);
            noResults.appendChild(message);
            noResults.appendChild(description);
            
            container.appendChild(noResults);
        }
    } else if (noResultsEl) {
        container.removeChild(noResultsEl);
    }
}

/**
 * Abre formulario de edición
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item a editar
 */
function openEditForm(sectionName, item) {
    state.currentEditingItem = item;
    
    const { editForm, form } = state.sections[sectionName];
    
    if (!editForm || !form) return;
    
    // Mostrar overlay
    showFormOverlay();
    
    // Mejorar estructura del modal
    enhanceModalStructure(editForm, sectionName);
    
    // Mejorar modal con sidebar
    enhanceModalWithSidebar(editForm, sectionName, item);
    
    // Mostrar formulario
    showEditForm(editForm);
    
    // Configurar formulario
    setupEditForm(sectionName, item, form);
}

/**
 * Muestra el overlay del formulario
 */
function showFormOverlay() {
    if (!state.formOverlay) return;
    
    state.formOverlay.style.display = 'block';
    setTimeout(() => {
        state.formOverlay.classList.add('active');
    }, 10);
}

/**
 * Muestra el formulario de edición
 * @param {HTMLElement} editForm - Formulario de edición
 */
function showEditForm(editForm) {
    editForm.style.display = 'flex';
    setTimeout(() => {
        editForm.classList.add('active');
    }, 10);
    
    document.body.style.overflow = 'hidden';
}

/**
 * Configura el formulario de edición
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item a editar
 * @param {HTMLElement} form - Formulario
 */
function setupEditForm(sectionName, item, form) {
    // Limpiar eventos previos (clonar formulario)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    state.sections[sectionName].form = newForm;
    
    // Restaurar eventos de file input
    setupImagePreviews();
    
    // Llenar campos del formulario
    fillFormFields(newForm, item);
    
    // Mostrar imagen actual si existe
    displayCurrentImage(sectionName, item);
    
    // Configurar eventos del formulario
    setupFormEvents(sectionName, item, newForm);
}

/**
 * Llena los campos del formulario
 * @param {HTMLElement} form - Formulario
 * @param {Object} item - Item
 */
function fillFormFields(form, item) {
    Object.keys(item).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'file') {
            field.value = item[key] || '';
        }
    });
}

/**
 * Configura los eventos del formulario
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {HTMLElement} form - Formulario
 */
function setupFormEvents(sectionName, item, form) {
    // Configurar botón de cancelar
    const cancelButton = form.querySelector('.secondary-button');
    if (cancelButton) {
        cancelButton.addEventListener('click', closeAllForms);
    }
    
    // Si estamos editando un AVA, cargar el dropdown de carreras
    if (sectionName === 'ava') {
        loadCarrerasDropdown(form, item.id_carrera);
        setupAvaSpecificFields(form, item);
    }
    
    // Configurar envío del formulario
    setupFormSubmission(sectionName, item, form);
    
    // Configurar botón de eliminación
    setupDeleteButton(sectionName, item, form);
}

/**
 * Configura campos específicos de AVA
 * @param {HTMLElement} form - Formulario
 * @param {Object} item - Item AVA
 */
function setupAvaSpecificFields(form, item) {
    const embeddingTableField = form.querySelector('#ava-edit-embedding-table');
    if (embeddingTableField) {
        embeddingTableField.setAttribute('readonly', 'readonly');
        embeddingTableField.setAttribute('disabled', 'disabled');
        embeddingTableField.classList.add('disabled-input');
        
        // Añadir mensaje de advertencia si no existe
        let warningMessage = embeddingTableField.parentNode.querySelector('.warning-message');
        if (!warningMessage) {
            warningMessage = createWarningMessage();
            embeddingTableField.parentNode.appendChild(warningMessage);
        }
    }
}

/**
 * Crea un mensaje de advertencia
 * @returns {HTMLElement} - Mensaje de advertencia
 */
function createWarningMessage() {
    const warningMessage = document.createElement('div');
    warningMessage.className = 'warning-message';
    
    const icon = document.createElement('i');
    icon.className = 'bx bx-error-circle';
    
    const text = document.createElement('span');
    text.textContent = 'Este campo no puede modificarse ya que está vinculado con información guardada. Su cambio podría ocasionar pérdida de datos.';
    
    warningMessage.appendChild(icon);
    warningMessage.appendChild(text);
    
    return warningMessage;
}

/**
 * Configura el envío del formulario
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {HTMLElement} form - Formulario
 */
function setupFormSubmission(sectionName, item, form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmission(sectionName, item, form);
    });
}

/**
 * Maneja el envío del formulario
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {HTMLElement} form - Formulario
 */
async function handleFormSubmission(sectionName, item, form) {
    const formData = new FormData(form);
    
    // Verificar si el input de imagen está vacío y eliminarlo del FormData
    const fileInput = form.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length === 0) {
        formData.delete(fileInput.name);
    }
    
    try {
        const { apiEndpoint, idField } = state.sections[sectionName];
        
        // Mostrar indicador de procesamiento
        const submitButton = form.querySelector('button[type="submit"]');
        const originalContent = showProcessingState(submitButton);
        
        // Enviar datos al servidor
        await fetchWithCSRF(`${apiEndpoint}/${item[idField]}`, {
            method: 'PUT',
            body: formData
        });
        
        // Restaurar botón
        restoreButtonState(submitButton, originalContent);
        
        // Mostrar notificación de éxito
        showNotification({
            title: 'Cambios Guardados',
            message: 'Los cambios han sido guardados exitosamente.',
            type: 'success'
        });
        
        // Cerrar formulario y recargar
        closeAllForms();
        reloadCurrentTab();
        
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        
        showNotification({
            title: 'Error al Guardar',
            message: error.message || 'Ocurrió un error al intentar guardar los cambios.',
            type: 'error'
        });
    }
}

/**
 * Muestra el estado de procesamiento del botón
 * @param {HTMLElement} button - Botón
 * @returns {Object} - Contenido original del botón
 */
function showProcessingState(button) {
    const originalContent = {
        text: button.textContent,
        disabled: button.disabled
    };
    
    button.disabled = true;
    button.innerHTML = '';
    
    const icon = document.createElement('i');
    icon.className = 'bx bx-loader-alt bx-spin';
    
    const text = document.createTextNode(' Guardando...');
    
    button.appendChild(icon);
    button.appendChild(text);
    
    return originalContent;
}

/**
 * Restaura el estado del botón
 * @param {HTMLElement} button - Botón
 * @param {Object} originalContent - Contenido original
 */
function restoreButtonState(button, originalContent) {
    button.textContent = originalContent.text;
    button.disabled = originalContent.disabled;
}

/**
 * Recarga la pestaña actual
 */
function reloadCurrentTab() {
    const activeTab = document.querySelector('#edition-view .tab-button.active');
    if (activeTab) {
        const activeTabName = activeTab.dataset.tab.replace('edit-', '').replace('-tab', '');
        loadList(activeTabName);
    }
}

/**
 * Configura el botón de eliminación
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {HTMLElement} form - Formulario
 */
function setupDeleteButton(sectionName, item, form) {
    const deleteButton = form.querySelector('.danger-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            confirmDelete(sectionName, item);
        });
    }
}

/**
 * Mejora la estructura del modal
 * @param {HTMLElement} modalElement - Elemento modal
 * @param {string} sectionName - Nombre de la sección
 */
function enhanceModalStructure(modalElement, sectionName) {
    // Verificar si ya existe la estructura mejorada
    if (modalElement.querySelector('.modal-container')) {
        return;
    }
    
    // Guardar el contenido original
    const originalForm = modalElement.querySelector('form');
    if (!originalForm) return;
    
    // Crear nueva estructura
    const modalContainer = createModalContainer(sectionName, originalForm);
    
    // Vaciar y reconstruir modal
    modalElement.innerHTML = '';
    modalElement.appendChild(modalContainer);
    
    // Configurar cierre del modal
    const closeButton = modalElement.querySelector('.close-form');
    if (closeButton) {
        closeButton.addEventListener('click', closeAllForms);
    }
}

/**
 * Crea el contenedor del modal
 * @param {string} sectionName - Nombre de la sección
 * @param {HTMLElement} originalForm - Formulario original
 * @returns {HTMLElement} - Contenedor del modal
 */
function createModalContainer(sectionName, originalForm) {
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Crear sidebar
    const modalSidebar = document.createElement('div');
    modalSidebar.className = 'modal-sidebar';
    
    // Crear contenido principal
    const modalMainContent = document.createElement('div');
    modalMainContent.className = 'modal-main-content';
    
    // Crear header
    const header = createModalHeader(sectionName);
    
    // Crear contenedor de scroll
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'form-scroll-container';
    scrollContainer.appendChild(originalForm);
    
    // Ensamblar
    modalMainContent.appendChild(header);
    modalMainContent.appendChild(scrollContainer);
    
    modalContainer.appendChild(modalSidebar);
    modalContainer.appendChild(modalMainContent);
    
    return modalContainer;
}

/**
 * Crea el header del modal
 * @param {string} sectionName - Nombre de la sección
 * @returns {HTMLElement} - Header del modal
 */
function createModalHeader(sectionName) {
    const header = document.createElement('div');
    header.className = 'edit-form-header';
    
    const h2 = document.createElement('h2');
    
    const icon = document.createElement('i');
    const { iconClass, title } = getModalHeaderInfo(sectionName);
    icon.className = `bx ${iconClass}`;
    
    const titleText = document.createTextNode(` ${title}`);
    
    h2.appendChild(icon);
    h2.appendChild(titleText);
    
    const controls = document.createElement('div');
    controls.className = 'edit-form-controls';
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'close-form';
    closeButton.setAttribute('aria-label', 'Cerrar');
    closeButton.innerHTML = '&times;';
    
    controls.appendChild(closeButton);
    
    header.appendChild(h2);
    header.appendChild(controls);
    
    return header;
}

/**
 * Obtiene la información del header del modal
 * @param {string} sectionName - Nombre de la sección
 * @returns {Object} - Información del header
 */
function getModalHeaderInfo(sectionName) {
    const headerInfo = {
        carrera: { iconClass: 'bxs-graduation', title: 'Editar Carrera' },
        ava: { iconClass: 'bx-book-content', title: 'Editar AVA' },
        herramienta: { iconClass: 'bx-wrench', title: 'Editar Herramienta' }
    };
    
    return headerInfo[sectionName] || { iconClass: 'bx-edit', title: 'Editar Item' };
}

/**
 * Mejora el modal con un sidebar contextual
 * @param {HTMLElement} modalElement - Elemento modal
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 */
function enhanceModalWithSidebar(modalElement, sectionName, item) {
    const sidebar = modalElement.querySelector('.modal-sidebar');
    if (sidebar) {
        populateSidebar(sidebar, sectionName, item);
    }
}

/**
 * Llena el sidebar con información contextual
 * @param {HTMLElement} sidebar - Sidebar
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 */
function populateSidebar(sidebar, sectionName, item) {
    sidebar.innerHTML = '';
    
    const { title, description, imageSrc, metaInfo } = getSidebarInfo(sectionName, item);
    
    // Header
    const header = createSidebarHeader(sectionName);
    
    // Imagen
    const imageDiv = createSidebarImage(imageSrc, title);
    
    // Contenido
    const content = createSidebarContent(title, description, metaInfo);
    
    // Footer
    const footer = createSidebarFooter();
    
    sidebar.appendChild(header);
    sidebar.appendChild(imageDiv);
    sidebar.appendChild(content);
    sidebar.appendChild(footer);
}

/**
 * Obtiene la información del sidebar
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @returns {Object} - Información del sidebar
 */
function getSidebarInfo(sectionName, item) {
    const truncateCode = (code, maxLength = 10) => {
        if (!code) return 'N/A';
        return code.length > maxLength ? code.substring(0, maxLength) + '...' : code;
    };
    
    let title, description, imageSrc, metaInfo;
    
    if (sectionName === 'carrera') {
        title = item.nombre || 'Carrera sin nombre';
        description = item.descripcion || 'Sin descripción';
        imageSrc = item.imagen || '/images/placeholder.jpg';
        
        const monthCode = truncateCode(item.month);
        const yearCode = truncateCode(item.year);
        
        metaInfo = [
            { icon: 'bx-code', text: `Mes: ${monthCode}` },
            { icon: 'bx-code-alt', text: `Año: ${yearCode}` }
        ];
    } else if (sectionName === 'ava') {
        title = item.nom_ava || 'AVA sin nombre';
        description = item.descripcion || 'Sin descripción';
        imageSrc = item.imagen || '/images/placeholder.jpg';
        
        metaInfo = [
            { icon: 'bx-cube', text: `Carrera: ${getCarreraName(item.id_carrera)}` },
            { icon: 'bx-link', text: `Slug: ${truncateCode(item.slug, 15)}` },
            { icon: 'bx-table', text: `Tabla: ${truncateCode(item.embedding_table_name, 15) || 'N/A'}` }
        ];
    } else if (sectionName === 'herramienta') {
        title = item.nombre || 'Herramienta sin nombre';
        description = item.descripcion || 'Sin descripción';
        imageSrc = item.imagen || '/images/placeholder.jpg';
        
        metaInfo = [
            { icon: 'bx-link', text: `Slug: ${truncateCode(item.slug, 15)}` }
        ];
    }
    
    return { title, description, imageSrc, metaInfo };
}

/**
 * Crea el header del sidebar
 * @param {string} sectionName - Nombre de la sección
 * @returns {HTMLElement} - Header del sidebar
 */
function createSidebarHeader(sectionName) {
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const h3 = document.createElement('h3');
    h3.textContent = `Editando ${sectionName}`;
    
    header.appendChild(h3);
    return header;
}

/**
 * Crea la imagen del sidebar
 * @param {string} imageSrc - URL de la imagen
 * @param {string} title - Título para el alt
 * @returns {HTMLElement} - Imagen del sidebar
 */
function createSidebarImage(imageSrc, title) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'sidebar-image';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = title;
    
    setupImageFallback(img, '/images/placeholder.jpg');
    
    imageDiv.appendChild(img);
    return imageDiv;
}

/**
 * Crea el contenido del sidebar
 * @param {string} title - Título
 * @param {string} description - Descripción
 * @param {Array} metaInfo - Información meta
 * @returns {HTMLElement} - Contenido del sidebar
 */
function createSidebarContent(title, description, metaInfo) {
    const content = document.createElement('div');
    content.className = 'sidebar-content';
    
    // Título
    const titleDiv = document.createElement('div');
    titleDiv.className = 'sidebar-title';
    titleDiv.textContent = title;
    
    // Descripción
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'sidebar-description';
    descriptionDiv.textContent = description;
    
    // Meta
    const metaDiv = document.createElement('div');
    metaDiv.className = 'sidebar-meta';
    
    metaInfo.forEach(meta => {
        const metaItem = createSidebarMetaItem(meta.icon, meta.text);
        metaDiv.appendChild(metaItem);
    });
    
    content.appendChild(titleDiv);
    content.appendChild(descriptionDiv);
    content.appendChild(metaDiv);
    
    return content;
}

/**
 * Crea un item meta del sidebar
 * @param {string} iconClass - Clase del icono
 * @param {string} text - Texto
 * @returns {HTMLElement} - Item meta
 */
function createSidebarMetaItem(iconClass, text) {
    const metaItem = document.createElement('div');
    metaItem.className = 'sidebar-meta-item';
    
    const icon = document.createElement('i');
    icon.className = `bx ${iconClass}`;
    
    const span = document.createElement('span');
    span.textContent = text;
    
    metaItem.appendChild(icon);
    metaItem.appendChild(span);
    
    return metaItem;
}

/**
 * Crea el footer del sidebar
 * @returns {HTMLElement} - Footer del sidebar
 */
function createSidebarFooter() {
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    
    const tip = document.createElement('div');
    tip.className = 'sidebar-tip';
    
    const icon = document.createElement('i');
    icon.className = 'bx bx-bulb';
    
    const span = document.createElement('span');
    span.textContent = 'Sube una nueva imagen para reemplazar la actual.';
    
    tip.appendChild(icon);
    tip.appendChild(span);
    footer.appendChild(tip);
    
    return footer;
}

/**
 * Muestra la imagen actual del elemento
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 */
function displayCurrentImage(sectionName, item) {
    if (!item.imagen) return;
    
    const fileInputId = `${sectionName}-edit-imagen`;
    const previewContainerId = `${fileInputId}-preview-container`;
    let previewContainer = document.getElementById(previewContainerId);
    
    // Crear contenedor si no existe
    if (!previewContainer) {
        const fileInput = document.getElementById(fileInputId);
        if (!fileInput) return;
        
        previewContainer = createPreviewContainer(fileInputId, fileInput);
        if (!previewContainer) return;
    }
    
    // Crear elementos para la visualización
    const elements = createCurrentImageElements(item.imagen);
    
    previewContainer.appendChild(elements.header);
    previewContainer.appendChild(elements.imageWrapper);
    previewContainer.style.display = 'block';
}

/**
 * Crea elementos para mostrar imagen actual
 * @param {string} imageSrc - URL de la imagen
 * @returns {Object} - Elementos creados
 */
function createCurrentImageElements(imageSrc) {
    const header = document.createElement('div');
    header.className = 'preview-header';
    
    const filename = document.createElement('div');
    filename.className = 'preview-filename';
    filename.textContent = 'Imagen actual';
    
    header.appendChild(filename);
    
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'preview-image-wrapper';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'image-preview';
    img.alt = 'Imagen actual';
    
    setupImageFallback(img, '/images/placeholder.jpg');
    
    imageWrapper.appendChild(img);
    
    return { header, imageWrapper };
}

/**
 * Muestra confirmación de eliminación
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item a eliminar
 */
function confirmDelete(sectionName, item) {
    const { nameField } = state.sections[sectionName];
    
    const { itemType, additionalMessage } = getDeleteConfirmationInfo(sectionName, item);
    
    showConfirmModal({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar ${itemType} "${item[nameField]}"? Esta acción no se puede deshacer.${additionalMessage}`,
        okText: 'Eliminar',
        cancelText: 'Cancelar',
        okType: 'danger',
        onConfirm: () => deleteItem(sectionName, item)
    });
}

/**
 * Obtiene información para la confirmación de eliminación
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @returns {Object} - Información de confirmación
 */
function getDeleteConfirmationInfo(sectionName, item) {
    const typeMap = {
        carrera: 'la carrera',
        ava: 'el AVA',
        herramienta: 'la herramienta'
    };
    
    const itemType = typeMap[sectionName] || 'el elemento';
    
    let additionalMessage = '';
    if (sectionName === 'ava' && item.embedding_table_name) {
        additionalMessage = ` También se eliminará la tabla de embeddings "${item.embedding_table_name}" y todos sus datos.`;
    }
    
    return { itemType, additionalMessage };
}

/**
 * Elimina un elemento
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item a eliminar
 */
async function deleteItem(sectionName, item) {
    const { apiEndpoint, idField } = state.sections[sectionName];
    
    try {
        showNotification({
            title: 'Eliminando...',
            message: 'Procesando solicitud de eliminación.',
            type: 'info',
            duration: 2000
        });
        
        await fetchWithCSRF(`${apiEndpoint}/${item[idField]}`, {
            method: 'DELETE'
        });
        
        const successMessage = getDeleteSuccessMessage(sectionName, item);
        
        showNotification({
            title: 'Elemento Eliminado',
            message: successMessage,
            type: 'success'
        });
        
        closeAllForms();
        reloadCurrentTab();
        
    } catch (error) {
        console.error('Error al eliminar:', error);
        
        const errorMessage = getDeleteErrorMessage(sectionName, item, error);
        
        showNotification({
            title: 'Error al Eliminar',
            message: errorMessage,
            type: 'error'
        });
    }
}

/**
 * Obtiene mensaje de éxito de eliminación
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @returns {string} - Mensaje de éxito
 */
function getDeleteSuccessMessage(sectionName, item) {
    if (sectionName === 'ava' && item.embedding_table_name) {
        return `El AVA y su tabla de embeddings "${item.embedding_table_name}" han sido eliminados exitosamente.`;
    }
    return 'El elemento ha sido eliminado exitosamente.';
}

/**
 * Obtiene mensaje de error de eliminación
 * @param {string} sectionName - Nombre de la sección
 * @param {Object} item - Item
 * @param {Error} error - Error
 * @returns {string} - Mensaje de error
 */
function getDeleteErrorMessage(sectionName, item, error) {
    if (sectionName === 'ava' && item.embedding_table_name) {
        return error.message || 'Ocurrió un error al intentar eliminar el AVA o su tabla de embeddings.';
    }
    return error.message || 'Ocurrió un error al intentar eliminar el elemento.';
}

/**
 * Carga las carreras para el dropdown de AVAs
 * @param {HTMLElement} form - Formulario
 * @param {number} selectedCarreraId - ID de carrera seleccionada
 */
async function loadCarrerasDropdown(form, selectedCarreraId) {
    const carreraSelect = form.querySelector('#ava-edit-carrera');
    
    if (!carreraSelect) return;
    
    try {
        carreraSelect.disabled = true;
        
        // Limpiar y mostrar carga
        carreraSelect.innerHTML = '';
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Cargando carreras...';
        carreraSelect.appendChild(loadingOption);
        
        const carreras = await fetchWithCSRF('/api/carrera/carrera', {
            method: 'GET'
        });
        
        // Limpiar opciones
        carreraSelect.innerHTML = '';
        
        // Opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecciona una carrera';
        carreraSelect.appendChild(defaultOption);
        
        // Agregar opciones de carrera
        if (carreras && Array.isArray(carreras)) {
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id_carrera;
                option.textContent = carrera.nombre;
                
                if (carrera.id_carrera == selectedCarreraId) {
                    option.selected = true;
                }
                
                carreraSelect.appendChild(option);
            });
        } else {
            throw new Error('No se recibieron datos de carreras válidos');
        }
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        
        carreraSelect.innerHTML = '';
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Error al cargar carreras';
        carreraSelect.appendChild(errorOption);
        
        showNotification({
            title: 'Error de Carga',
            message: 'No se pudieron cargar las carreras. Por favor, intenta de nuevo más tarde.',
            type: 'error'
        });
    } finally {
        carreraSelect.disabled = false;
    }
}