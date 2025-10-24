// Módulo para creación de elementos
import { validateForm, showNotification, fetchWithCSRF, sanitizeText } from './utils-chiguiremente.js';

// Estado del módulo
const state = {
    activeTab: 'welcome-tab', // Comenzamos en la pantalla de bienvenida
    fileChangeHandlers: new Map() // Para evitar listeners duplicados
};

/**
 * Inicializa el módulo de creación
 */
export function initCreationModule() {
    console.log('Inicializando módulo de creación...');
    
    // Configurar navegación de tabs
    setupTabNavigation();
    
    // Configurar visualización de vistas previas de imágenes
    setupImagePreviews();
    
    // Configurar envío de formularios
    setupFormSubmission();
    
    // Escuchar activación de vista
    document.addEventListener('viewActivated', (event) => {
        if (event.detail.view === 'creation') {
            // Cargar datos necesarios cuando se active la vista
            loadCarrerasDropdown();
            
            // Configurar previews de nuevo (por si DOM se refresca)
            setupImagePreviews();
            
            // Resetear a la pantalla de bienvenida
            resetToWelcomeTab();
        }
    });
    
    // Cargar datos iniciales si estamos en la vista de creación
    if (window.location.hash === '#creation') {
        loadCarrerasDropdown();
    }
    
    // Asegurar que el DOM está completamente cargado
    setTimeout(() => {
        setupImagePreviews();
    }, 500);
}

/**
 * Resetea a la pestaña de bienvenida
 */
function resetToWelcomeTab() {
    // Obtener referencia a todas las pestañas y botones
    const tabButtons = document.querySelectorAll('#creation-view .tab-button');
    const tabPanes = document.querySelectorAll('#creation-view .tab-pane');
    const welcomeTab = document.getElementById('welcome-tab');
    
    // Desactivar todos los botones y tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Activar la pestaña de bienvenida
    if (welcomeTab) {
        welcomeTab.classList.add('active');
        state.activeTab = 'welcome-tab';
    }
}

/**
 * Configura la navegación entre pestañas
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('#creation-view .tab-button');
    const tabPanes = document.querySelectorAll('#creation-view .tab-pane');
    
    // Limpiar listeners existentes
    tabButtons.forEach(button => {
        // Clonar elemento para remover todos los listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Volver a obtener referencias después del clonado
    const newTabButtons = document.querySelectorAll('#creation-view .tab-button');
    
    newTabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });
}

/**
 * Maneja el click en pestañas
 * @param {Event} event - Evento click
 */
function handleTabClick(event) {
    const button = event.currentTarget;
    const tabButtons = document.querySelectorAll('#creation-view .tab-button');
    const tabPanes = document.querySelectorAll('#creation-view .tab-pane');
    
    // Ocultar pantalla de bienvenida
    const welcomeTab = document.getElementById('welcome-tab');
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
 * Configura las vistas previas de imágenes
 */
function setupImagePreviews() {
    console.log('Configurando vistas previas de imágenes...');
    
    // Lista de IDs de inputs de archivo de imagen
    const fileInputConfigs = [
        { id: 'carrera-imagen', nameId: 'carrera-image-name', previewId: 'carrera-imagen-preview-container' },
        { id: 'ava-imagen', nameId: 'ava-image-name', previewId: 'ava-imagen-preview-container' },
        { id: 'herramienta-imagen', nameId: 'herramienta-image-name', previewId: 'herramienta-imagen-preview-container' }
    ];
    
    fileInputConfigs.forEach(config => {
        const fileInput = document.getElementById(config.id);
        if (!fileInput) {
            console.warn(`No se encontró el input: ${config.id}`);
            return;
        }
        
        console.log(`Configurando vista previa para: ${config.id}`);
        
        // Remover listener anterior si existe
        if (state.fileChangeHandlers.has(config.id)) {
            fileInput.removeEventListener('change', state.fileChangeHandlers.get(config.id));
        }
        
        // Crear nuevo handler
        const handler = (event) => handleFileChange(event, config);
        state.fileChangeHandlers.set(config.id, handler);
        
        // Agregar nuevo listener
        fileInput.addEventListener('change', handler);
    });
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
    const previewContainer = document.getElementById(config.previewId);
    
    if (!previewContainer) {
        console.warn(`No se encontró el contenedor de vista previa: ${config.previewId}`);
        return;
    }
    
    if (file) {
        // Actualizar el nombre del archivo
        updateFileName(nameSpan, file.name);
        
        // Mostrar vista previa si es una imagen
        if (file.type.match('image.*')) {
            showImagePreview(file, previewContainer, fileInput, nameSpan);
        } else {
            hidePreview(previewContainer);
        }
    } else {
        // No hay archivo seleccionado
        updateFileName(nameSpan, 'No se ha seleccionado ningún archivo');
        hidePreview(previewContainer);
    }
}

/**
 * Actualiza el nombre del archivo mostrado
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
    
    // Limpiar contenedor previo
    previewContainer.innerHTML = '';
    
    // Crear estructura de previsualización
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
        // Limpiar input de archivo
        fileInput.value = '';
        
        // Actualizar UI
        updateFileName(nameSpan, 'No se ha seleccionado ningún archivo');
        hidePreview(previewContainer);
        
        // Disparar evento change para actualizar el formulario
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
        
        // Ocultar carga cuando la imagen termine de cargar
        imageElement.onload = function() {
            loadingElement.style.display = 'none';
        };
        
        // Manejar error de carga
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
 * Configura el envío de formularios
 */
function setupFormSubmission() {
    const formConfigs = [
        { id: 'carrera-creation-form', handler: handleCarreraSubmit },
        { id: 'ava-creation-form', handler: handleAvaSubmit },
        { id: 'herramienta-creation-form', handler: handleHerramientaSubmit }
    ];
    
    formConfigs.forEach(config => {
        const form = document.getElementById(config.id);
        if (form) {
            // Remover listener anterior si existe
            form.removeEventListener('submit', config.handler);
            // Agregar nuevo listener
            form.addEventListener('submit', config.handler);
        }
    });
}

/**
 * Maneja el envío del formulario de carrera
 * @param {Event} e - Evento submit
 */
async function handleCarreraSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (!validateForm(form)) {
        showNotification({
            title: 'Error de Validación',
            message: 'Por favor, complete todos los campos requeridos correctamente.',
            type: 'error'
        });
        return;
    }
    
    const originalBtnContent = getButtonContent(submitBtn);
    
    try {
        setButtonLoading(submitBtn, 'Creando...');
        
        const formData = new FormData(form);
        const response = await fetchWithCSRF('/api/carrera/carrera', {
            method: 'POST',
            body: formData
        });
        
        showNotification({
            title: 'Carrera Creada',
            message: 'La carrera ha sido creada exitosamente.',
            type: 'success'
        });
        
        resetForm(form, 'carrera-image-name', 'carrera-imagen-preview-container');
        
    } catch (error) {
        showNotification({
            title: 'Error al Crear Carrera',
            message: error.message || 'Ha ocurrido un error al intentar crear la carrera.',
            type: 'error'
        });
    } finally {
        restoreButton(submitBtn, originalBtnContent);
    }
}

/**
 * Maneja el envío del formulario de AVA
 * @param {Event} e - Evento submit
 */
async function handleAvaSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (!validateForm(form)) {
        showNotification({
            title: 'Error de Validación',
            message: 'Por favor, complete todos los campos requeridos correctamente.',
            type: 'error'
        });
        return;
    }
    
    const originalBtnContent = getButtonContent(submitBtn);
    
    try {
        setButtonLoading(submitBtn, 'Creando...');
        
        const formData = new FormData(form);
        
        // Renombrar campos para coincidir con la API
        formData.set('nom_ava', formData.get('nombre'));
        formData.set('id_carrera', formData.get('carrera'));
        formData.delete('nombre');
        formData.delete('carrera');
        
        const response = await fetchWithCSRF('/api/avas', {
            method: 'POST',
            body: formData
        });
        
        showNotification({
            title: 'AVA Creado',
            message: 'El AVA ha sido creado exitosamente.',
            type: 'success'
        });
        
        resetForm(form, 'ava-image-name', 'ava-imagen-preview-container');
        
    } catch (error) {
        showNotification({
            title: 'Error al Crear AVA',
            message: error.message || 'Ha ocurrido un error al intentar crear el AVA.',
            type: 'error'
        });
    } finally {
        restoreButton(submitBtn, originalBtnContent);
    }
}

/**
 * Maneja el envío del formulario de herramienta
 * @param {Event} e - Evento submit
 */
async function handleHerramientaSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (!validateForm(form)) {
        showNotification({
            title: 'Error de Validación',
            message: 'Por favor, complete todos los campos requeridos correctamente.',
            type: 'error'
        });
        return;
    }
    
    const originalBtnContent = getButtonContent(submitBtn);
    
    try {
        setButtonLoading(submitBtn, 'Creando...');
        
        const formData = new FormData(form);
        const response = await fetchWithCSRF('/api/herramientas', {
            method: 'POST',
            body: formData
        });
        
        showNotification({
            title: 'Herramienta Creada',
            message: 'La herramienta ha sido creada exitosamente.',
            type: 'success'
        });
        
        resetForm(form, 'herramienta-image-name', 'herramienta-imagen-preview-container');
        
    } catch (error) {
        showNotification({
            title: 'Error al Crear Herramienta',
            message: error.message || 'Ha ocurrido un error al intentar crear la herramienta.',
            type: 'error'
        });
    } finally {
        restoreButton(submitBtn, originalBtnContent);
    }
}

/**
 * Obtiene el contenido del botón de forma segura
 * @param {HTMLElement} button - Botón
 * @returns {Object} - Contenido del botón
 */
function getButtonContent(button) {
    return {
        text: button.textContent,
        disabled: button.disabled
    };
}

/**
 * Establece el estado de carga del botón
 * @param {HTMLElement} button - Botón
 * @param {string} loadingText - Texto de carga
 */
function setButtonLoading(button, loadingText) {
    button.disabled = true;
    
    // Limpiar contenido actual
    button.innerHTML = '';
    
    // Crear icono de carga
    const icon = document.createElement('i');
    icon.className = 'bx bx-loader-alt bx-spin';
    
    // Crear texto
    const text = document.createTextNode(` ${loadingText}`);
    
    // Agregar elementos
    button.appendChild(icon);
    button.appendChild(text);
}

/**
 * Restaura el estado original del botón
 * @param {HTMLElement} button - Botón
 * @param {Object} originalContent - Contenido original
 */
function restoreButton(button, originalContent) {
    button.disabled = originalContent.disabled;
    button.textContent = originalContent.text;
}

/**
 * Resetea un formulario y su vista previa
 * @param {HTMLFormElement} form - Formulario
 * @param {string} imageNameId - ID del elemento de nombre de imagen
 * @param {string} previewContainerId - ID del contenedor de vista previa
 */
function resetForm(form, imageNameId, previewContainerId) {
    form.reset();
    
    const imageNameElement = document.getElementById(imageNameId);
    if (imageNameElement) {
        imageNameElement.textContent = 'No se ha seleccionado ningún archivo';
    }
    
    const previewContainer = document.getElementById(previewContainerId);
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

/**
 * Carga las carreras disponibles en el dropdown del formulario de AVA
 */
async function loadCarrerasDropdown() {
    const select = document.getElementById('ava-carrera');
    
    if (!select) return;
    
    try {
        // Mostrar estado de carga
        select.disabled = true;
        
        // Limpiar opciones y agregar opción de carga
        select.innerHTML = '';
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Cargando carreras...';
        select.appendChild(loadingOption);
        
        // Obtener carreras del servidor
        const carreras = await fetchWithCSRF('/api/carrera/carrera', {
            method: 'GET'
        });
        
        // Limpiar opciones existentes
        select.innerHTML = '';
        
        // Agregar opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecciona una carrera';
        select.appendChild(defaultOption);
        
        // Añadir opciones de carreras
        if (Array.isArray(carreras)) {
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id_carrera;
                option.textContent = carrera.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        
        // Limpiar y mostrar error
        select.innerHTML = '';
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Error al cargar carreras';
        select.appendChild(errorOption);
        
        showNotification({
            title: 'Error de Carga',
            message: 'No se pudieron cargar las carreras. Por favor, intenta de nuevo más tarde.',
            type: 'error'
        });
    } finally {
        select.disabled = false;
    }
}