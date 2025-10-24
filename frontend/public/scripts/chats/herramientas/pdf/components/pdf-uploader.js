/**
 * pdf-uploader.js - Versión mejorada con carga a pantalla completa y animación de chigüire
 */

import { uploadPDF, cancelPDFUpload, getProcessingMessage } from '../services/pdf-api.js';
import { initPDFCheck, togglePDFPanel } from '../services/pdf-state.js';
import { getState } from '../core/state-pdf.js';
import { showNotification } from '../ui/ui-manager-pdf.js';
import {
  updatePDFButtonsVisibility,
  initPDFButtonController
} from '../utils/pdf-button-controller.js';
import { ChiguireAnimation } from '../utils/chiguire-animation-pdf.js';

// Referencias DOM
let uploaderButton;
let uploaderModal;
let uploadInput;
let uploadForm;
let dropZone;
let errorMessage;
let closeButton;
let fileNameElement;
let submitButton;

// Referencias específicas para la pantalla de carga
let fullscreenLoader;
let loaderChiguire;
let loaderProgressBar;
let loaderProgressText;
let loaderPercentage;
let loaderCancelButton;
// NUEVO: Cargar y renderizar los mensajes del chat actual una sola vez
let hasRenderedMessages = false; // Bandera para controlar si ya se renderizaron mensajes


// Instancia de la animación del chigüire
let chiguireAnimation;

// Estado del componente
const state = {
  isUploading: false,
  selectedFile: null,
  uploadProgress: 0,
  showModal: false,
  abortController: null
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB en bytes

/**
 * Inicializa el componente
 */
export function initPDFUploader() {
  createDOMElements();
  attachEventListeners();

  // Obtener referencia al botón del panel (puede estar null al inicio)
  const panelTriggerButton = document.querySelector('.pdf-panel-trigger');

  // Inicializar controlador con las referencias disponibles
  initPDFButtonController(uploaderButton, panelTriggerButton);

  // Comprobar estado inicial del PDF para el chat actual
  checkInitialPDFState();
}

// Nueva función para verificar estado inicial
function checkInitialPDFState() {
  import('../services/pdf-state.js').then(module => {
    if (typeof module.checkPDF === 'function') {
      module.checkPDF(true).then(hasPDF => {
        updatePDFButtonsVisibility(hasPDF);
      });
    }
  });
}

/**
 * Crea los elementos DOM necesarios para el uploader
 */
function createDOMElements() {
  // 1. Crear botón flotante minimalista
  uploaderButton = document.createElement('button');
  uploaderButton.className = 'pdf-upload-button';
  uploaderButton.title = 'Subir PDF';
  uploaderButton.innerHTML = `
    <i class='bx bxs-cloud-upload'></i>
  `;
  document.body.appendChild(uploaderButton);

  // 2. Crear modal de selección de archivo (ligero)
  uploaderModal = document.createElement('div');
  uploaderModal.className = 'pdf-upload-modal';
  uploaderModal.innerHTML = `
    <div class="pdf-upload-modal-content">
      <div class="pdf-upload-modal-header">
        <h3>Subir PDF</h3>
        <button class="pdf-upload-close-button" aria-label="Cerrar">&times;</button>
      </div>
      <div class="pdf-upload-modal-body">
        <form class="pdf-upload-form">
          <div class="pdf-upload-dropzone">
            <i class='bx bxs-cloud-upload'></i>
            <p>Arrastra y suelta tu archivo PDF aquí</p>
            <p class="pdf-upload-or">- o -</p>
            <button type="button" class="pdf-select-file-button">Seleccionar archivo</button>
            <input type="file" id="pdf-file-input" accept="application/pdf" hidden />
            <p class="pdf-selected-file"></p>
          </div>
          
          <div class="pdf-upload-error"></div>
          
          <div class="pdf-upload-footer">
            <button type="button" class="pdf-upload-close-btn">Cancelar</button>
            <button type="submit" class="pdf-upload-submit-button" disabled>Subir PDF</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(uploaderModal);

  // 3. Crear loader a pantalla completa (separado del modal)
  fullscreenLoader = document.createElement('div');
  fullscreenLoader.className = 'pdf-fullscreen-loader';
  fullscreenLoader.innerHTML = `
    <div class="loader-content">
      <div class="chiguire-container chiguire-circle-container">
        <svg class="progress-ring chiguire-progress-ring" width="200" height="200" viewBox="0 0 200 200">
          <circle class="progress-ring-bg progress-ring-background" cx="100" cy="100" r="90" stroke-width="10" />
          <circle class="progress-ring-path progress-ring-circle" cx="100" cy="100" r="90" stroke-width="10" 
                  stroke-dasharray="565.48" stroke-dashoffset="565.48" />
        </svg>
        <div class="chiguire-circle chiguire-gif-container">
          <img src="/images/chiguire-walking.gif" alt="Chigüire procesando PDF" class="chiguire-gif" />
        </div>
        <div class="particles-container"></div>
      </div>
      <div class="loader-progress-text progress-text">Preparando PDF...</div>
      <div class="loader-percentage progress-percentage">0%</div>
      <button type="button" class="loader-cancel-button">
        <i class='bx bx-x'></i>
        Cancelar
      </button>
    </div>
  `;
  document.body.appendChild(fullscreenLoader);

  // 4. Obtener referencias a elementos internos
  uploadInput = document.getElementById('pdf-file-input');
  uploadForm = document.querySelector('.pdf-upload-form');
  dropZone = document.querySelector('.pdf-upload-dropzone');
  errorMessage = document.querySelector('.pdf-upload-error');
  closeButton = document.querySelector('.pdf-upload-close-button');
  fileNameElement = document.querySelector('.pdf-selected-file');
  submitButton = document.querySelector('.pdf-upload-submit-button');

  // 5. Obtener referencias para el loader a pantalla completa
  loaderChiguire = fullscreenLoader.querySelector('.chiguire-container');
  loaderProgressBar = fullscreenLoader.querySelector('.progress-ring-path');
  loaderProgressText = fullscreenLoader.querySelector('.loader-progress-text');
  loaderPercentage = fullscreenLoader.querySelector('.loader-percentage');
  loaderCancelButton = fullscreenLoader.querySelector('.loader-cancel-button');

  // 6. Inicializar ChiguireAnimation
  initChiguireAnimation();

  // 7. Configuración inicial
  errorMessage.style.display = 'none';
}

/**
 * Inicializa la animación del chigüire
 */
function initChiguireAnimation() {
  // Opciones para la animación del chigüire
  const options = {
    container: fullscreenLoader.querySelector('.chiguire-circle-container'),
    chiguire: fullscreenLoader.querySelector('.chiguire-gif'),
    progressRing: fullscreenLoader.querySelector('.progress-ring-circle'),
    progressText: fullscreenLoader.querySelector('.progress-text'),
    progressPercentage: fullscreenLoader.querySelector('.progress-percentage'),
    particleCount: 15,
    particleColors: ['#a4ac86', '#d5dac7', '#7f4f24', '#936639'],
    celebrationColors: ['#FFD700', '#FF6B6B', '#4CAF50', '#42A5F5', '#FFA726']
  };

  // Crear instancia de ChiguireAnimation
  chiguireAnimation = new ChiguireAnimation(options);
}

/**
 * Agrega los event listeners necesarios
 */
function attachEventListeners() {
  // 1. Clic en botón flotante
  uploaderButton.addEventListener('click', showUploadModal);

  // 2. Cerrar modal
  closeButton.addEventListener('click', hideUploadModal);
  document.querySelector('.pdf-upload-close-btn').addEventListener('click', hideUploadModal);
  uploaderModal.addEventListener('click', e => {
    if (e.target === uploaderModal) hideUploadModal();
  });

  // 3. Cancelar subida en progreso
  loaderCancelButton.addEventListener('click', handleCancelUpload);

  // 4. Seleccionar archivo
  document.querySelector('.pdf-select-file-button').addEventListener('click', () => {
    uploadInput.click();
  });

  // 5. Cambio en input de archivo
  uploadInput.addEventListener('change', handleFileSelection);

  // 6. Eventos de drag & drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragging');
  });

  dropZone.addEventListener('dragleave', e => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragging');

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      // Validar tipo
      if (file.type !== 'application/pdf') {
        hideUploadModal(); // ✅ CERRAR MODAL PRIMERO
        acadelWarning("Formato incorrecto", "Acadel necesita que sea un archivo PDF para poder analizarlo");
        return;
      }

      // ✅ VALIDACIÓN DE TAMAÑO
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

        hideUploadModal(); // ✅ CERRAR MODAL PRIMERO

        acadelWarning(
          "Archivo demasiado grande",
          `Tu PDF de ${fileSizeMB}MB excede el límite de 50MB. Acadel necesita archivos más pequeños`
        );
        return;
      }

      // Si pasa las validaciones
      state.selectedFile = file;
      updateSelectedFileDisplay(file.name);
      submitButton.disabled = false;
    }
  });

  // 7. Envío de formulario
  uploadForm.addEventListener('submit', e => {
    e.preventDefault();

    if (state.selectedFile) {
      handleFileUpload();
    } else {
      acadelInfo("Falta seleccionar archivo", "Acadel necesita que elijas un PDF antes de subirlo");
    }
  });
}

/**
 * Muestra el modal de selección de archivo
 */
export function showUploadModal() {
  // Resetear el estado para asegurar una inicialización limpia
  resetUploadState();

  // Mostrar modal
  state.showModal = true;
  uploaderModal.classList.add('show');
}

/**
 * Oculta el modal de subida
 */
export function hideUploadModal() {
  if (state.isUploading) {
    if (confirm('¿Estás seguro de cancelar la subida en progreso?')) {
      handleCancelUpload();
    } else {
      return;
    }
  }

  state.showModal = false;
  uploaderModal.classList.remove('show');

  // Resetear estado
  resetUploadState();
}

/**
 * Muestra el loader a pantalla completa
 */
function showFullscreenLoader() {
  console.log('Mostrando fullscreen loader con progreso 0%');

  // Actualizar el tema del GIF del chigüire
  updateChiguireTheme();

  // Resetear estado visual de forma completa
  resetProgressCircle();

  // Eliminar cualquier clase de estado anterior
  loaderChiguire.classList.remove('completed');
  loaderChiguire.classList.remove('cancelling');

  // NUEVO: Asegurar que no haya estilos inline residuales
  const progressRing = document.querySelector('.progress-ring-circle');
  if (progressRing) {
    progressRing.style.removeProperty('stroke');
  }

  // NUEVO: Restaurar clases normales y eliminar clases de estado de cancelación
  if (loaderProgressText) {
    loaderProgressText.classList.remove('cancelling');
    loaderProgressText.textContent = 'Preparando PDF...';
  }

  if (loaderPercentage) {
    loaderPercentage.classList.remove('cancelling');
    loaderPercentage.textContent = '0%';
    loaderPercentage.style.color = 'var(--pdf-primary-dark)';
  }

  // NUEVO: Forzar actualización UI para que se refleje el 0%
  if (chiguireAnimation) {
    // Resetear completamente
    chiguireAnimation.reset(false);

    // Forzar explícitamente progreso en 0%
    setTimeout(() => {
      chiguireAnimation.updateProgress(0, 'Preparando PDF...');

      // Iniciar animación después de asegurar que estamos en 0%
      chiguireAnimation.start();
    }, 50);
  }

  // Mostrar el loader
  fullscreenLoader.classList.add('active');

  // Bloquear scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Oculta el loader a pantalla completa
 */
function hideFullscreenLoader() {
  fullscreenLoader.classList.remove('active');

  // MODIFICADO: Ya no detener la animación completa, solo pausar
  if (chiguireAnimation) {
    // chiguireAnimation.stop(); // <-- COMENTADO
    // En lugar de stop(), solo pausamos la animación para mantener visual
    chiguireAnimation.pause(); // <-- NUEVO MÉTODO QUE HAY QUE CREAR
  }

  // Restaurar scroll
  document.body.style.overflow = '';
}

/**
 * Resetea el círculo de progreso
 */
function resetProgressCircle() {
  // MEJORADO: Reseteo más robusto del círculo SVG
  if (loaderProgressBar) {
    // Determinar la circunferencia basada en el elemento SVG
    const radius = parseFloat(loaderProgressBar.getAttribute('r') || 90);
    const circumference = 2 * Math.PI * radius;

    // Aplicar valores iniciales
    loaderProgressBar.style.strokeDasharray = `${circumference} ${circumference}`;
    loaderProgressBar.style.strokeDashoffset = circumference; // Estado inicial (0%)

    // NUEVO: Restaurar el color original si fue cambiado durante cancelación
    loaderProgressBar.style.removeProperty('stroke');

    console.log(`Círculo SVG reseteado: r=${radius}, circumference=${circumference}`);
  }

  // Usar ChiguireAnimation para resetear (si está disponible)
  if (chiguireAnimation) {
    chiguireAnimation.reset(false); // Reseteo completo
  }
}

/**
 * Actualiza el progreso en el círculo
 * @param {number} progress - Valor del progreso (0-100)
 * @param {string} statusText - Texto descriptivo del estado actual
 */
function updateProgressCircle(progress, statusText = null) {
  if (!loaderProgressBar) return;

  // Usar ChiguireAnimation para actualizar el progreso (si está disponible)
  if (chiguireAnimation) {
    // MODIFICADO: Asegurar que siempre se use un mensaje descriptivo estándar
    // Solo usar el statusText proporcionado si coincide con el patrón esperado
    const standardMessage = getProcessingMessage(progress);

    // Verificar si el texto proporcionado coincide con alguno de los mensajes estándar
    const isStandardMessage = [
      "Iniciando procesamiento...",
      "Extrayendo texto...",
      "Procesando páginas...",
      "Generando embeddings...",
      "Almacenando resultados...",
      "Finalizando..."
    ].includes(statusText);

    // Preferir el mensaje estándar de getProcessingMessage si el proporcionado no es estándar
    const finalMessage = isStandardMessage ? statusText : standardMessage;

    // Actualizar con el mensaje adecuado
    chiguireAnimation.updateProgress(progress, finalMessage);
    return;
  }

  // Fallback al método tradicional si no está disponible chiguireAnimation
  const circumference = 2 * Math.PI * 90; // r=90
  const offset = circumference - (progress / 100) * circumference;
  loaderProgressBar.style.strokeDashoffset = offset;

  // Actualizar texto si se proporciona
  if (loaderProgressText) {
    const standardMessage = getProcessingMessage(progress);
    loaderProgressText.textContent = standardMessage; // Siempre usar el mensaje estándar
  }

  // Actualizar porcentaje
  if (loaderPercentage) {
    loaderPercentage.textContent = `${Math.round(progress)}%`;
  }

  // Cambiar color cuando está completo
  if (progress >= 100) {
    loaderChiguire.classList.add('completed');
  }
}

/**
 * Resetea el estado del uploader
 */
function resetUploadState() {
  console.log('Reseteo completo del estado del uploader');

  state.selectedFile = null;
  state.uploadProgress = 0;
  state.isUploading = false;
  state.abortController = null;

  // Limpiar input de archivo
  if (uploadInput) {
    uploadInput.value = '';
  }

  // Resetear UI
  updateSelectedFileDisplay('');

  // Eliminar cualquier clase de cancelación o error
  if (loaderProgressText) {
    loaderProgressText.classList.remove('cancelling', 'error');
    loaderProgressText.textContent = 'Preparando PDF...';
  }

  if (loaderPercentage) {
    loaderPercentage.classList.remove('cancelling', 'error');
    loaderPercentage.textContent = '0%';
    loaderPercentage.style.color = 'var(--pdf-primary-dark)';
  }

  // NUEVO: Eliminar el mensaje de error si existe
  const errorMessageEl = document.querySelector('.loader-error-message');
  if (errorMessageEl && errorMessageEl.parentNode) {
    errorMessageEl.parentNode.removeChild(errorMessageEl);
  }

  // NUEVO: Restaurar la visibilidad del botón de cancelar
  if (loaderCancelButton) {
    loaderCancelButton.style.display = '';
  }

  // NUEVO: Eliminar clases de cancelación y error de todos los elementos relevantes
  const container = document.querySelector('.chiguire-circle-container');
  if (container) {
    container.classList.remove('cancelling', 'completed', 'error');
  }

  // NUEVO: Restaurar el color original del anillo de progreso
  const progressRing = document.querySelector('.progress-ring-circle');
  if (progressRing) {
    progressRing.style.removeProperty('stroke'); // Eliminar el estilo de color de cancelación o error
  }

  // Resetear visualmente el círculo
  resetProgressCircle();

  // Ocultar errores
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';
  submitButton.disabled = true;

  // Resetear animación del chigüire de manera completa
  if (chiguireAnimation) {
    chiguireAnimation.reset(false); // reseteo completo
  }

  // NUEVO: Asegurarse de que el loader esté oculto
  fullscreenLoader.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Maneja la selección de archivos
 * @param {Event} e - Evento change
 */
function handleFileSelection(e) {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];
    
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      
      hideUploadModal(); // Cerrar modal primero
      
      // Pequeño delay para que la transición se vea suave
      setTimeout(() => {
        acadelWarning(
          "Archivo demasiado grande", 
          `Tu PDF de ${fileSizeMB}MB excede el límite de 50MB. Acadel necesita archivos más pequeños para procesarlos eficientemente`
        );
      }, 100); // 100ms - casi imperceptible pero más suave
      
      resetUploadState();
      return;
    }

    console.log('✅ Archivo válido - procediendo');

    // Si pasa las validaciones
    state.selectedFile = file;
    updateSelectedFileDisplay(file.name);
    submitButton.disabled = false;
  }
}

/**
 * Actualiza la visualización del archivo seleccionado
 * @param {string} fileName - Nombre del archivo
 */
function updateSelectedFileDisplay(fileName) {
  if (fileName) {
    fileNameElement.textContent = `Archivo seleccionado: ${fileName}`;
    fileNameElement.style.display = 'block';
  } else {
    fileNameElement.textContent = '';
    fileNameElement.style.display = 'none';
  }
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';

  // Ocultar después de 5 segundos
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

/**
 * Detecta el tema actual y actualiza la imagen del chigüire
 */
function updateChiguireTheme() {
  const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
  const chiguireImage = document.querySelector('.chiguire-gif');

  if (chiguireImage) {
    const lightVersion = '/images/chiguire-walking.gif';
    const darkVersion = '/images/chiguire-walking-dark.gif';

    chiguireImage.src = isDarkTheme ? darkVersion : lightVersion;
  }
}

/**
 * Maneja la subida del archivo
 */
async function handleFileUpload() {
  if (state.isUploading || !state.selectedFile) return;

  state.isUploading = true;

  // Ocultar el modal de selección y mostrar el loader a pantalla completa
  uploaderModal.classList.remove('show');

  // Resetear primero para asegurar un inicio limpio
  resetProgressCircle();
  if (chiguireAnimation) {
    chiguireAnimation.reset(false); // Reset completo
  }

  // Ahora mostramos el loader
  showFullscreenLoader();

  // Crear nuevo AbortController para esta subida
  state.abortController = new AbortController();

  try {
    // Verificar si estamos en pantalla de bienvenida
    const isWelcomeScreen = document.querySelector('.welcome-message, .centered-input-container, .suggestions-container') !== null;
    let currentChatId = getState('currentChatId');
    let isNewChat = false; // Nueva bandera para rastrear si el chat es nuevo

    // Crear nuevo chat si es necesario
    if (isWelcomeScreen || !currentChatId) {
      isNewChat = true; // Marcar que estamos creando un chat nuevo

      try {
        const { createNewChat, loadChatHistory } = await import('../api/chat-pdf.js');
        const { setCurrentChat } = await import('../core/state-pdf.js');
        const { renderChatHistory, updateActiveSidebarItem } = await import('../ui/sidebar-pdf.js');
        const { updateHeaderForChat } = await import('../ui/header-manager-pdf.js');

        // Crear chat con título basado en nombre del PDF
        const pdfName = state.selectedFile.name || 'Documento PDF';
        const chatTitle = `Análisis de ${pdfName}`;

        const newChat = await createNewChat(chatTitle);

        if (newChat && newChat.id) {
          setCurrentChat(newChat.id);
          currentChatId = newChat.id;

          window.newlyCreatedChat = newChat.id;
          document.body.setAttribute('data-from-welcome', 'true');

          if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.chatPath) {
            history.pushState({}, '', URL_CONFIG.chatPath(newChat.id));
          } else {
            history.pushState({}, '', `/pdf/${newChat.id}`);
          }

          const updatedChats = await loadChatHistory();
          renderChatHistory(updatedChats);
          updateActiveSidebarItem(newChat.id);
          updateHeaderForChat(newChat.id);
        } else {
          throw new Error('No se pudo crear un nuevo chat');
        }
      } catch (error) {
        console.error('Error al crear nuevo chat para PDF:', error);
        throw new Error('Error al crear un nuevo chat para el PDF');
      }
    }

    // Subir el PDF con monitoreo de progreso real desde el backend
    // IMPORTANTE: Pasamos directamente el progreso y mensajes a updateProgressCircle sin modificaciones
    const result = await uploadPDF(
      state.selectedFile,
      (progress, statusText) => {
        // Usar directamente los valores que provienen del backend, sin intermediarios
        updateProgressCircle(progress, statusText);
      },
      state.abortController.signal
    );

    // Celebrar el éxito con la animación del chigüire
    if (chiguireAnimation) {
      chiguireAnimation.celebrate();
    }

    // Esperar un momento para mostrar la celebración
    setTimeout(() => {
      // Mantener esta línea - elimina el loader
      hideFullscreenLoader();

      // 1. Limpiar pantalla de bienvenida
      if (isWelcomeScreen) {
        const welcomeElements = document.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container');
        welcomeElements.forEach(el => {
          if (el && el.parentNode) {
            el.style.display = 'none';
            el.parentNode.removeChild(el);
          }
        });

        // 2. MODIFICADO: Restauración selectiva sin alterar diseño flexible
        const fixedSpace = document.querySelector('.fixed-space');
        const inputBox = document.querySelector('.input-box');
        const textarea = document.querySelector('#messageInput');
        const attachmentsWrapper = document.querySelector('.attachments-wrapper');

        // 2.1 Restaurar fixedSpace pero conservar layout
        if (fixedSpace) {
          // Remover solo propiedades que ocultan, sin alterar el display o flex
          fixedSpace.style.removeProperty('opacity');
          fixedSpace.style.removeProperty('display');
          fixedSpace.style.removeProperty('pointer-events');
          fixedSpace.style.removeProperty('visibility');
          fixedSpace.style.removeProperty('overflow');
          // NO alterar las propiedades flex o width
        }

        // 2.2 Restaurar el textarea explícitamente
        if (textarea) {
          textarea.disabled = false;
          textarea.readOnly = false;
          textarea.style.removeProperty('display');
          textarea.style.visibility = 'visible';
          textarea.style.opacity = '1';
          textarea.style.pointerEvents = 'auto';
          // Mantener ancho
          textarea.style.width = '100%';
          textarea.classList.remove('disabled', 'readonly');
        }

        // 2.3 Restaurar inputBox sin modificar el layout flex
        if (inputBox) {
          inputBox.style.removeProperty('display');
          inputBox.style.visibility = 'visible';
          inputBox.style.opacity = '1';
          inputBox.style.pointerEvents = 'auto';
          // NO modificar flex o width
        }

        // 2.4 Restaurar wrapper de adjuntos
        if (attachmentsWrapper) {
          attachmentsWrapper.style.removeProperty('display');
          attachmentsWrapper.style.visibility = 'visible';
          attachmentsWrapper.style.opacity = '1';
          attachmentsWrapper.style.pointerEvents = 'auto';
        }

        // 3. Crear/restaurar contenedor de previsualización
        let filePreviewContainer = document.querySelector('.file-preview-container');
        if (!filePreviewContainer && attachmentsWrapper) {
          filePreviewContainer = document.createElement('div');
          filePreviewContainer.className = 'file-preview-container';
          attachmentsWrapper.appendChild(filePreviewContainer);
        }

        // 4. Reinicializar eventos de drag & drop y adjuntos
        import('../utils/file-attachments-pdf.js').then(module => {
          if (typeof module.initFileAttachments === 'function') {
            console.log('Reinicializando sistema de adjuntos después de subir PDF');
            module.initFileAttachments();
          }
        }).catch(e => console.warn('Error al reiniciar sistema de adjuntos:', e));

        // 5. Forzar reflow para aplicar cambios
        void document.body.offsetHeight;
      }

      // Mantener estas líneas - código original
      initPDFCheck();

      if (isNewChat) {
        delete window.newlyCreatedChat;
        document.body.removeAttribute('data-from-welcome');
      }

      // IMPORTANTE: Actualización de mensajes mejorada para ambos casos
      const updateChatMessages = async () => {
        if (!currentChatId) return;

        try {
          // Importar módulos necesarios
          const chatModule = await import('../api/chat-pdf.js');
          const rendererModule = await import('../ui/message-renderer-pdf.js');

          if (typeof chatModule.loadChatMessages !== 'function' ||
            typeof rendererModule.renderChatMessages !== 'function') {
            console.warn('Funciones necesarias no disponibles para actualizar mensajes');
            return;
          }

          // Cargar mensajes del chat actual
          const messages = await chatModule.loadChatMessages(currentChatId);

          if (!Array.isArray(messages)) {
            console.warn('No se pudieron cargar mensajes: formato inválido');
            return;
          }

          // NUEVO: Si es un chat existente, refrescar la interfaz de mensajes
          if (!isNewChat) {
            console.log(`Actualizando mensajes en chat existente: ${currentChatId}`);

            // Eliminar mensajes de carga si los hay
            const loadingMessages = document.querySelectorAll('.chat-messages .ai-message.processing');
            loadingMessages.forEach(loadingMsg => {
              if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
              }
            });

            const existingMessages = document.querySelectorAll('.chat-messages .message');
            if (existingMessages.length > 0 && existingMessages.length < messages.length) {
              // Solo renderizar mensajes nuevos
              const newMessages = messages.slice(existingMessages.length);
              console.log(`Renderizando ${newMessages.length} mensajes nuevos`);

              // Reemplazar función para usarla con subconjunto de mensajes
              if (typeof rendererModule.appendChatMessages === 'function') {
                rendererModule.appendChatMessages(newMessages);
              } else {
                // Fallback: renderizar todos
                rendererModule.renderChatMessages(messages);
              }
            } else {
              // Si no tenemos mensajes o hay inconsistencia, renderizar todo
              rendererModule.renderChatMessages(messages);
            }
          }
          // Para chat nuevo, usar la lógica original
          else if (messages.length > 0 && !hasRenderedMessages) {
            // Marcar como renderizado ANTES de comenzar
            hasRenderedMessages = true;

            // Eliminar cualquier mensaje de carga
            const loadingMessages = document.querySelectorAll('.chat-messages .ai-message.processing');
            loadingMessages.forEach(loadingMsg => {
              if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
              }
            });

            // Renderizar mensajes
            rendererModule.renderChatMessages(messages);

            console.log('Mensajes cargados en chat nuevo:', messages.length);
          }

          // Hacer scroll al final en ambos casos
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages) {
            if (typeof window.scrollManager !== 'undefined' &&
              typeof window.scrollManager.scrollToBottom === 'function') {
              window.scrollManager.scrollToBottom({
                priority: 'high',
                reason: 'pdf-upload-complete'
              });
            } else {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }

        } catch (error) {
          console.error('Error al actualizar mensajes después de subir PDF:', error);
        }
      };

      // Intentar actualizar mensajes dos veces para asegurar que todos los cambios del backend se reflejen
      // Primera actualización rápida
      updateChatMessages();

      // Mostrar panel PDF y actualizar botones
      setTimeout(() => {
        togglePDFPanel(true);
        updatePDFButtonsVisibility(true);

        if (currentChatId) {
          import('../ui/sidebar-pdf.js').then(module => {
            if (typeof module.updateActiveSidebarItem === 'function') {
              module.updateActiveSidebarItem(currentChatId);
            }
          }).catch(console.error);
        }
      }, 500);

      // REFACTORIZADO: Inicialización completa según el tipo de chat
      Promise.all([
        import('../ui/header-manager-pdf.js').catch(() => null),
        import('../core/state-pdf.js').catch(() => null)
      ]).then(modules => {
        // Actualizar header en cualquier caso
        if (modules[0] && typeof modules[0].updateHeaderForChat === 'function' && currentChatId) {
          modules[0].updateHeaderForChat(currentChatId);
        }

        // Forzar actualización del estado en cualquier caso
        if (modules[1] && typeof modules[1].setCurrentChat === 'function' && currentChatId) {
          modules[1].setCurrentChat(currentChatId, true);
        }

        // Si es un chat nuevo, inicializar componentes adicionales
        if (isNewChat && currentChatId) {
          // Sincronizar estado con backend para chat nuevo
          import('../api/chat-pdf.js').then(module => {
            if (typeof module.syncChatState === 'function') {
              module.syncChatState(currentChatId).catch(e =>
                console.warn('Error al sincronizar estado del chat nuevo:', e)
              );
            }
          }).catch(console.error);
        }
      });

      acadelConfetti("🎉 ¡PDF cargado perfectamente!", "Acadel ya puede ayudarte con todo el contenido de tu documento");
    }, 2000);

  } catch (error) {
    console.error('Error subiendo PDF:', error);

    // Verificar si fue cancelación
    if (error.name === 'AbortError') {
      acadelInfo("Subida cancelada", "Acadel detuvo la subida como solicitaste");
    } else {
      // NUEVO: Mostrar interfaz de error similar a la cancelación
      console.log('Mostrando interfaz de error para la subida de PDF');

      // Obtener información del chat actual
      const chatId = getState('currentChatId');
      const isNewChat = document.body.hasAttribute('data-from-welcome') ||
        window.hasOwnProperty('newlyCreatedChat') ||
        (window.newlyCreatedChat === chatId);

      // 1. Ocultar inmediatamente el botón de cancelar
      if (loaderCancelButton) {
        loaderCancelButton.style.display = 'none';
        console.log('Botón de cancelar ocultado para mostrar error');
      }

      // 2. CRÍTICO: Mostrar el loader si no está visible
      if (!fullscreenLoader.classList.contains('active')) {
        console.log('Forzando visibilidad del loader para mostrar error');
        fullscreenLoader.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      // 3. Cambiar la interfaz para mostrar que tenemos un error
      console.log('Aplicando estilos de error al loader');

      // 3.1. Actualizar texto descriptivo con el mensaje de error
      if (loaderProgressText) {
        const errorMessage = "¡Ups! Acadel se confundió con este PDF";
        loaderProgressText.textContent = errorMessage;
        loaderProgressText.classList.remove('cancelling');
        loaderProgressText.classList.add('error'); // Usamos clase específica para error
      }

      // 3.2. Actualizar porcentaje/estado
      if (loaderPercentage) {
        loaderPercentage.textContent = "Error";
        loaderPercentage.style.color = '#e74c3c';
        loaderPercentage.classList.remove('cancelling');
        loaderPercentage.classList.add('error');
      }

      // 3.3. Cambiar color del anillo de progreso
      const progressRing = document.querySelector('.progress-ring-circle');
      if (progressRing) {
        progressRing.style.stroke = '#e74c3c';
      }

      // 3.4. Aplicar clase de error al contenedor (usando clase específica para error)
      const container = document.querySelector('.chiguire-circle-container');
      if (container) {
        container.classList.remove('completed', 'cancelling');
        container.classList.add('error');
      }

      // 3.5. Agregar un mensaje de error más descriptivo
      const errorMessageEl = document.createElement('div');
      errorMessageEl.className = 'loader-error-message';
      errorMessageEl.textContent = "Acadel necesita un momento para recuperarse";

      // Agregar el mensaje después del porcentaje
      if (loaderPercentage && loaderPercentage.parentNode) {
        loaderPercentage.parentNode.insertBefore(errorMessageEl, loaderPercentage.nextSibling);
      }

      // 4. Marcar como no está subiendo para prevenir múltiples acciones
      state.isUploading = false;

      // 5. CLAVE: Esperar 2 segundos completos mostrando la animación de error
      console.log('Esperando 2 segundos para mostrar animación de error...');

      // Bloquear el ocultar loader durante los 2 segundos
      const originalHideLoader = hideFullscreenLoader;
      hideFullscreenLoader = function () {
        console.log('Intento de ocultar loader bloqueado durante visualización de error');
        // No hace nada - bloqueamos el ocultamiento
      };

      // Pausar animación pero mantener visual
      if (chiguireAnimation) {
        chiguireAnimation.pause();
      }

      // Esperar un tiempo mínimo antes de comenzar la lógica de limpieza
      setTimeout(() => {
        console.log('Iniciando proceso de limpieza por error mientras se muestra la pantalla de error');

        // Mostrar notificación de error
        acadelError("¡Vaya! Algo salió mal", "Acadel se tropezó procesando tu PDF. Inténtalo de nuevo");

        // NUEVO: Actualizar texto para indicar que se está limpiando
        if (loaderProgressText) {
          loaderProgressText.textContent = "Acadel está ordenando sus cosas...";
        }

        // Procesar la eliminación del chat si es un chat nuevo
        if (isNewChat && chatId) {
          try {
            // Crear una secuencia encadenada de promesas para asegurar que todo ocurra en orden
            let cleanupPromise = Promise.resolve();

            // Paso 1: Marcar el chat como problemático
            cleanupPromise = cleanupPromise.then(() => {
              return import('../utils/chat-error-handler-pdf.js')
                .then(module => {
                  if (typeof module.markChatAsProblem === 'function') {
                    module.markChatAsProblem(chatId);
                    console.log(`Chat marcado como problemático: ${chatId}`);
                  }
                  return import('../api/chat-pdf.js');
                });
            });

            // Paso 2: Eliminar el chat del servidor
            cleanupPromise = cleanupPromise.then(apiModule => {
              if (typeof apiModule.deleteChat === 'function') {
                return apiModule.deleteChat(chatId)
                  .then(() => {
                    console.log(`Chat eliminado del servidor: ${chatId}`);
                    return Promise.all([
                      import('../ui/sidebar-pdf.js'),
                      apiModule
                    ]);
                  });
              }
              return Promise.all([import('../ui/sidebar-pdf.js'), apiModule]);
            });

            // Paso 3: Actualizar la sidebar y recargar la lista de chats
            cleanupPromise = cleanupPromise.then(([sidebarModule, apiModule]) => {
              if (typeof sidebarModule.removeChatFromSidebar === 'function') {
                sidebarModule.removeChatFromSidebar(chatId);
              }

              if (typeof apiModule.loadChatHistory === 'function' &&
                typeof sidebarModule.renderChatHistory === 'function') {
                return apiModule.loadChatHistory()
                  .then(updatedChats => {
                    sidebarModule.renderChatHistory(updatedChats);
                  });
              }
              return Promise.resolve();
            });

            // Paso 4: Preparar la pantalla de bienvenida
            cleanupPromise = cleanupPromise.then(() => {
              // Limpiar variables globales
              if (window.newlyCreatedChat === chatId) {
                delete window.newlyCreatedChat;
                document.body.removeAttribute('data-from-welcome');
              }

              return Promise.all([
                import('../ui/welcome-message-pdf.js'),
                import('../ui/ui-manager-pdf.js'),
                import('../core/state-pdf.js')
              ]);
            });

            // Paso 5: Último paso - Actualizar estados y mostrar bienvenida
            cleanupPromise = cleanupPromise.then(([welcomeModule, uiModule, stateModule]) => {
              if (typeof uiModule.clearChatMessages === 'function') {
                uiModule.clearChatMessages();
              }

              if (typeof stateModule.setCurrentChat === 'function') {
                stateModule.setCurrentChat(null);

                // Actualizar URL
                if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.basePath) {
                  history.pushState({}, '', URL_CONFIG.basePath);
                } else {
                  history.pushState({}, '', '/pdf');
                }

                // Ocultar textarea explícitamente
                const fixedSpace = document.querySelector('.fixed-space');
                if (fixedSpace) {
                  fixedSpace.style.opacity = '0';
                  fixedSpace.style.display = 'none';
                  fixedSpace.style.pointerEvents = 'none';
                  fixedSpace.style.overflow = 'hidden';
                  void fixedSpace.offsetHeight;
                }

                console.log('Preparado para mostrar pantalla de bienvenida');

                // Restaurar la función original de ocultamiento
                hideFullscreenLoader = originalHideLoader;

                // Ocultar loader
                hideFullscreenLoader();
                resetUploadState();

                // Mostrar mensaje de bienvenida
                if (typeof welcomeModule.showWelcomeMessage === 'function') {
                  welcomeModule.showWelcomeMessage();
                  console.log('Pantalla de bienvenida mostrada después de la limpieza');
                }
              }
            });

            // Manejo de errores en la cadena completa
            cleanupPromise.catch(e => {
              console.error('Error durante el proceso de limpieza:', e);

              // Si hay error en la cadena, igualmente restauramos y ocultamos
              hideFullscreenLoader = originalHideLoader;
              hideFullscreenLoader();
              resetUploadState();

              // Intentar mostrar bienvenida de todos modos
              import('../ui/welcome-message-pdf.js').then(module => {
                if (typeof module.showWelcomeMessage === 'function') {
                  module.showWelcomeMessage();
                }
              }).catch(err => console.error('Error final mostrando bienvenida:', err));
            });
          } catch (markError) {
            console.warn('Error al iniciar proceso de limpieza:', markError);

            // Si hay error aquí, igualmente restauramos y ocultamos
            hideFullscreenLoader = originalHideLoader;
            hideFullscreenLoader();
            resetUploadState();
          }
        } else {
          // Si no es un chat nuevo, simplemente ocultamos después de un tiempo total
          setTimeout(() => {
            // Restaurar la función original de ocultamiento
            hideFullscreenLoader = originalHideLoader;

            // Ocultar loader
            hideFullscreenLoader();
            resetUploadState();
          }, 1000); // 1 segundo adicional después de los 2 segundos iniciales
        }
      }, 2000);
    }

    // No detener la animación del chigüire inmediatamente
    // La detenemos dentro del setTimeout para permitir la visualización del error
  }
}

/**
 * Maneja la cancelación de la subida
 */
async function handleCancelUpload() {
  if (!state.isUploading || !state.abortController) return;

  console.log('Iniciando cancelación de subida de PDF');

  // NUEVO: Ocultar inmediatamente el botón de cancelar
  if (loaderCancelButton) {
    loaderCancelButton.style.display = 'none';
    console.log('Botón de cancelar ocultado');
  }

  // IMPORTANTE: Detener cualquier intento de ocultar el loader
  // Sobrescribir temporalmente la función hideFullscreenLoader
  const originalHideLoader = hideFullscreenLoader;
  hideFullscreenLoader = function () {
    console.log('Intento de ocultar loader bloqueado durante cancelación');
    // No hace nada - bloqueamos el ocultamiento
  };

  // Variable para controlar si ya se ocultó el loader
  let loaderHidden = false;

  // Obtener información del chat actual
  const chatId = getState('currentChatId');
  const userId = getState('userId');
  const wasInWelcomeScreen = document.body.hasAttribute('data-from-welcome') ||
    window.hasOwnProperty('newlyCreatedChat');

  // CRÍTICO: Mostrar el loader si no está visible
  if (!fullscreenLoader.classList.contains('active')) {
    console.log('Forzando visibilidad del loader para cancelación');
    fullscreenLoader.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Cambiar la interfaz para mostrar que estamos cancelando
  console.log('Aplicando estilos de cancelación al loader');

  // 1. Actualizar texto descriptivo
  if (loaderProgressText) {
    loaderProgressText.textContent = "Cancelando procesamiento...";
    loaderProgressText.classList.add('cancelling');
  }

  // 2. Actualizar porcentaje/estado
  if (loaderPercentage) {
    loaderPercentage.textContent = "Cancelando";
    loaderPercentage.style.color = '#e74c3c';
    loaderPercentage.classList.add('cancelling');
  }

  // 3. Cambiar color del anillo de progreso
  const progressRing = document.querySelector('.progress-ring-circle');
  if (progressRing) {
    progressRing.style.stroke = '#e74c3c';
  }

  // 4. Aplicar clase de cancelación al contenedor
  const container = document.querySelector('.chiguire-circle-container');
  if (container) {
    container.classList.remove('completed');
    container.classList.add('cancelling');
  }

  // 5. Pausar animación pero mantener visual
  if (chiguireAnimation) {
    chiguireAnimation.pause();
  }

  // 6. Marcar como no está subiendo para prevenir múltiples cancelaciones
  state.isUploading = false;

  try {
    // Abortar la petición en curso
    state.abortController.abort();
  } catch (abortError) {
    console.warn('Error al abortar la petición:', abortError);
  }

  // Notificar al servidor sobre la cancelación
  let cancelResult = { success: false };
  if (chatId && userId) {
    try {
      console.log('Enviando señal de cancelación al servidor...');
      cancelResult = await cancelPDFUpload(chatId);
      console.log('Resultado de cancelación del servidor:', cancelResult);
    } catch (error) {
      console.error('Error al notificar cancelación al servidor:', error);
    }
  }

  // CLAVE: Esperar 2 segundos completos mostrando la animación de cancelación
  console.log('Esperando 2 segundos para mostrar animación de cancelación...');

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Terminó espera, procediendo con limpieza');

  // Restaurar la función original de ocultamiento
  hideFullscreenLoader = originalHideLoader;

  try {
    // Si era un chat nuevo/temporal, eliminarlo y volver a la pantalla de bienvenida
    if (wasInWelcomeScreen || window.newlyCreatedChat === chatId) {
      try {
        console.log('Eliminando chat temporal:', chatId);
        // Actualizar mensaje visual mientras se elimina el chat
        if (loaderProgressText) {
          loaderProgressText.textContent = "Eliminando chat temporal...";
        }

        // Importar módulos necesarios y eliminar chat
        const { deleteChat, loadChatHistory } = await import('../api/chat-pdf.js');
        const { setCurrentChat } = await import('../core/state-pdf.js');
        const { renderChatHistory } = await import('../ui/sidebar-pdf.js');

        await deleteChat(chatId);
        setCurrentChat(null);

        // Actualizar URL
        if (typeof URL_CONFIG !== 'undefined' && URL_CONFIG.basePath) {
          history.pushState({}, '', URL_CONFIG.basePath);
        } else {
          history.pushState({}, '', '/pdf');
        }

        // Actualizar lista de chats
        const updatedChats = await loadChatHistory();
        renderChatHistory(updatedChats);

        // AHORA SI, ocultar el loader y limpiar estados
        console.log('Ocultando loader después de cancelación');
        hideFullscreenLoader();
        resetUploadState();

        // Limpiar mensajes y variables globales
        const uiManager = await import('../ui/ui-manager-pdf.js');
        if (typeof uiManager.clearChatMessages === 'function') {
          uiManager.clearChatMessages();
        }

        delete window.newlyCreatedChat;
        document.body.removeAttribute('data-from-welcome');

        // Mostrar notificación
        acadelInfo("Subida cancelada", "Acadel canceló la subida y limpió el chat temporal");
        // Preparar elementos para pantalla de bienvenida
        const fixedSpace = document.querySelector('.fixed-space');
        if (fixedSpace) {
          fixedSpace.style.opacity = '0';
          fixedSpace.style.display = 'none';
          fixedSpace.style.pointerEvents = 'none';
          fixedSpace.style.visibility = 'hidden';
          fixedSpace.style.overflow = 'hidden';
          void fixedSpace.offsetHeight;
        }

        // Mostrar pantalla de bienvenida
        console.log('Preparando para mostrar pantalla de bienvenida');
        const welcomeModule = await import('../ui/welcome-message-pdf.js');
        if (typeof welcomeModule.showWelcomeMessage === 'function') {
          setTimeout(() => {
            welcomeModule.showWelcomeMessage();
            console.log('Pantalla de bienvenida mostrada');
          }, 100);
        }
      } catch (error) {
        console.error('Error al eliminar chat temporal:', error);
        hideFullscreenLoader();
        resetUploadState();
        acadelWarning("Cancelado con detalles", "Acadel canceló la subida, aunque tuvo pequeñas dificultades técnicas");
      }
    } else {
      // Para chats existentes, ocultar loader y mostrar notificación
      console.log('Finalizando cancelación de chat existente');
      hideFullscreenLoader();
      resetUploadState();

      if (cancelResult.success) {
        acadelInfo("Cancelación completa", "Acadel canceló el procesamiento en el servidor");
      } else {
        acadelInfo("Cancelado localmente", "Acadel detuvo la subida en tu navegador");
      }
    }
  } catch (error) {
    console.error('Error en la finalización de cancelación:', error);
    hideFullscreenLoader();
    resetUploadState();
    acadelWarning("Problema cancelando", "Acadel tuvo dificultades cancelando la subida, pero ya se detuvo");
  }
}

/**
 * Comprueba si se debe mostrar el botón de subida
 * @param {boolean} hasPDF - Si el chat tiene un PDF
 */
export function updateUploaderVisibility(hasPDF) {
  updatePDFButtonsVisibility(hasPDF);
}

export default {
  initPDFUploader,
  showUploadModal,
  hideUploadModal,
  updateUploaderVisibility
};