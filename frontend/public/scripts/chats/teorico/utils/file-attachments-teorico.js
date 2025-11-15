/**
 * file-attachments-teorico.js - VERSIÓN UNIFICADA WELCOME + CHAT
 * 🦫 NUEVA ARQUITECTURA: Un solo sistema para welcome y chat principal
 */

import { 
  imageToBase64, 
  generateFilePreview, 
  validateFile,
  validateFileCountLimit,
  createFileFromBlob,
  generateCodePreview,
  getCodeFileIcon,
  getFileExtension,
  extractTextFromFile,
  formatFileSize,
  extractCodeFromFile,
} from '../../shared/file-handler.js';

import {
  ACADEL_FILE_MESSAGES,
  validateFileType
} from '../../shared/shared-file-constants.js';

// ====== MANAGERS GLOBALES ======
let fileAttachmentManager = null;
let welcomeFileManager = null;

/**
 * 🦫 MANAGER PRINCIPAL UNIFICADO - FUNCIONA PARA CHAT Y WELCOME
 */
class UnifiedFileAttachmentManager {
  constructor(context = 'chat') {
    this.context = context; // 'chat' o 'welcome'
    this.prefix = context === 'welcome' ? 'welcome-' : '';
    
    // Estado completamente nuevo en cada instancia
    this.state = {
      files: new Map(),
      nextId: 1,
      mediaStream: null,
      processingQueue: new Set(),
      isDestroyed: false
    };
    
    // Event Manager centralizado
    this.eventManager = new EventManager();
    
    // Lock para operaciones críticas
    this.operationLock = false;
    
    console.log(`🦫 Acadel creó nueva instancia del File Manager (${context})`);
  }

  // ====== MÉTODO PRINCIPAL DE INICIALIZACIÓN ======
  async initialize() {
    if (this.state.isDestroyed) {
      console.warn('🦫 Acadel: Intento de inicializar instancia destruida');
      return;
    }

    console.log(`🦫 Acadel inicializando sistema de archivos (${this.context})...`);
    
    this.eventManager.cleanup();
    
    const elements = this.getDOMElements();
    if (!this.validateDOMElements(elements)) {
      console.warn(`🦫 Acadel: Elementos DOM no encontrados para ${this.context}`);
      return;
    }

    this.setupAllEventListeners(elements);
    
    this.createMissingElements(elements);
    
    this.setupObservers();
    
    console.log(`✅ Acadel: Sistema de archivos listo (${this.context})`);
  }

  // ====== OBTENER ELEMENTOS DOM (ADAPTADO PARA WELCOME) ======
  getDOMElements() {
    const getElement = (id) => document.getElementById(this.prefix + id);
    const getElementByClass = (className) => document.querySelector(this.prefix ? `.${this.prefix}${className}` : `.${className}`);
    
    const elements = {
      imageUploadInput: getElement('image-input') || document.getElementById('image-upload'),
      documentUploadInput: getElement('document-input') || document.getElementById('document-upload'),
      codeUploadInput: getElement('code-input') || document.getElementById('code-upload'),
      filePreviewContainer: getElement('file-preview-container') || document.querySelector('.file-preview-container'),
      dragDropArea: getElement('drag-drop-area') || document.getElementById('drag-drop-area'),
      fileUploadContainer: getElement('file-upload-container') || document.querySelector('.file-upload-container'),
      cameraOption: getElement('camera-btn') || document.getElementById('camera-option'),
      previewModal: getElement('preview-modal') || document.getElementById('preview-modal'),
      previewClose: getElement('preview-close') || document.getElementById('preview-close')
    };

    // Elementos móviles
    if (this.context === 'chat') {
      elements.attachmentsWrapperMobile = document.querySelector('.attachments-wrapper-mobile');
      elements.attachButtonMobile = document.querySelector('.attach-btn-mobile');
      elements.imageUploadMobile = document.getElementById('image-upload-mobile');
      elements.documentUploadMobile = document.getElementById('document-upload-mobile');
      elements.codeUploadMobile = document.getElementById('code-upload-mobile');
      elements.cameraOptionMobile = document.getElementById('camera-option-mobile');
    }
    
    return elements;
  }

  // ====== VALIDAR ELEMENTOS ESENCIALES ======
  validateDOMElements(elements) {
    if (this.context === 'welcome') {
      return elements.filePreviewContainer !== null;
    } else {
      const required = ['imageUploadInput', 'documentUploadInput', 'codeUploadInput'];
      return required.some(key => elements[key] !== null);
    }
  }

  // ====== CONFIGURAR TODOS LOS EVENT LISTENERS ======
  setupAllEventListeners(elements) {
    // Inputs de archivo
    this.setupFileInputListeners(elements);
    
    // Click handlers para previews
    this.setupPreviewClickListeners(elements);
    
    // Drag & Drop
    this.setupDragDropListeners(elements);
    
    // Cámara
    this.setupCameraListeners(elements);
    
    this.setupPreviewModalListeners(elements);
    
    // Mobile (solo para chat)
    if (this.context === 'chat') {
      this.setupMobileListeners(elements);
    }
  }

  // ====== FILE INPUT LISTENERS ======
  setupFileInputListeners(elements) {
    const fileTypes = {
      imageUploadInput: 'image',
      documentUploadInput: 'document', 
      codeUploadInput: 'code',
      imageUploadMobile: 'image',
      documentUploadMobile: 'document',
      codeUploadMobile: 'code'
    };

    Object.entries(fileTypes).forEach(([elementKey, fileType]) => {
      const input = elements[elementKey];
      if (!input) return;

      this.eventManager.add(input, 'change', async (event) => {
        await this.handleFileSelection(event, fileType);
        
        if (this.context === 'welcome') {
          const attachmentOptions = document.getElementById('welcome-attachment-options');
          if (attachmentOptions) attachmentOptions.classList.remove('show');
        } else if (elements.attachmentsWrapperMobile) {
          elements.attachmentsWrapperMobile.classList.remove('active');
        }
      });
    });
  }


  // ====== PREVIEW CLICK LISTENERS ======
  setupPreviewClickListeners(elements) {
    if (!elements.filePreviewContainer) return;

    this.eventManager.add(elements.filePreviewContainer, 'click', (event) => {
      // Botón de eliminar
      const removeButton = event.target.closest('.file-preview-remove');
      if (removeButton) {
        const fileId = removeButton.dataset.fileId;
        if (fileId) this.removeFile(fileId);
        return;
      }

      // Preview del archivo
      const previewElement = event.target.closest('.file-preview');
      if (previewElement && !event.target.closest('.file-preview-remove')) {
        const fileId = previewElement.dataset.fileId;
        const fileType = previewElement.dataset.fileType;
        if (fileId) {
          setTimeout(() => this.showFilePreview(fileId, fileType), 0);
        }
      }
    });
  }

  // ====== DRAG & DROP LISTENERS UNIFICADOS ======
  setupDragDropListeners(elements) {
    if (!elements.fileUploadContainer) return;

    if (elements.fileUploadContainer.hasAttribute('data-drag-listeners')) {
      console.log('🦫 Drag listeners ya configurados, saltando...');
      return;
    }

    elements.fileUploadContainer.setAttribute('data-drag-listeners', 'true');

    const handleFilesDirectly = (files) => this.handleDroppedFiles(files);

    // Document level events
    this.eventManager.add(document, 'dragenter', (e) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) {
        // Solo mostrar si estamos en el contexto correcto
        if (this.shouldHandleDragDrop()) {
          elements.fileUploadContainer.classList.add('active');
        }
      }
    });

    this.eventManager.add(document, 'dragend', () => {
      if (this.shouldHandleDragDrop()) {
        elements.fileUploadContainer.classList.remove('active', 'dragging');
      }
    });

    this.eventManager.add(document, 'dragleave', (e) => {
      if (this.shouldHandleDragDrop() && 
          (e.clientX <= 0 || e.clientY <= 0 || 
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        elements.fileUploadContainer.classList.remove('active', 'dragging');
      }
    });

    // Container level events
    this.eventManager.add(elements.fileUploadContainer, 'dragover', (e) => {
      e.preventDefault();
      if (this.shouldHandleDragDrop()) {
        elements.fileUploadContainer.classList.add('dragging');
      }
    });

    this.eventManager.add(elements.fileUploadContainer, 'dragleave', (e) => {
      e.preventDefault();
      if (this.shouldHandleDragDrop() && 
          (!e.relatedTarget || !elements.fileUploadContainer.contains(e.relatedTarget))) {
        elements.fileUploadContainer.classList.remove('dragging');
      }
    });

    this.eventManager.add(elements.fileUploadContainer, 'drop', (e) => {
      e.preventDefault();
      e.stopPropagation(); // ← NUEVO: Evita que otros listeners procesen el mismo evento
      
      if (this.shouldHandleDragDrop()) {
        elements.fileUploadContainer.classList.remove('dragging', 'active');
        
        if (e.dataTransfer.files.length > 0) {
          console.log(`🎯 Drop interceptado por sistema unificado (${this.context}):`, e.dataTransfer.files.length, 'archivos');
          handleFilesDirectly(e.dataTransfer.files);
        }
      }
    });

    // Escape key
    this.eventManager.add(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.shouldHandleDragDrop() && 
          elements.fileUploadContainer.classList.contains('active')) {
        elements.fileUploadContainer.classList.remove('active', 'dragging');
      }
    });

    // Click outside
    this.eventManager.add(document, 'click', (e) => {
      if (this.shouldHandleDragDrop() && 
          elements.fileUploadContainer.classList.contains('active') && 
          !elements.fileUploadContainer.contains(e.target)) {
        elements.fileUploadContainer.classList.remove('active', 'dragging');
      }
    });
  }

  // ====== DETERMINAR SI DEBE MANEJAR DRAG & DROP ======
  shouldHandleDragDrop() {
    if (this.context === 'welcome') {
      return document.querySelector('.welcome-message') !== null;
    } else {
      return document.querySelector('.welcome-message') === null;
    }
  }

  // ====== CAMERA LISTENERS ======
  setupCameraListeners(elements) {
    const cameraButtons = [elements.cameraOption];
    if (elements.cameraOptionMobile) cameraButtons.push(elements.cameraOptionMobile);
    
    cameraButtons.forEach(button => {
      if (!button) return;
      
      this.eventManager.add(button, 'click', async () => {
        await this.openCamera();
        
        if (this.context === 'welcome') {
          const attachmentOptions = document.getElementById('welcome-attachment-options');
          if (attachmentOptions) attachmentOptions.classList.remove('show');
        } else {
          const attachmentOptions = document.querySelector('.attachment-options');
          if (attachmentOptions) attachmentOptions.classList.remove('show');
          if (elements.attachmentsWrapperMobile) {
            elements.attachmentsWrapperMobile.classList.remove('active');
          }
        }
      });
    });
  }

  // ====== PREVIEW MODAL LISTENERS ======
  setupPreviewModalListeners(elements) {
    if (!elements.previewClose || !elements.previewModal) return;

    this.eventManager.add(elements.previewClose, 'click', () => {
      elements.previewModal.classList.remove('show');
    });

    this.eventManager.add(document, 'keydown', (event) => {
      if (event.key === 'Escape' && elements.previewModal.classList.contains('show')) {
        elements.previewModal.classList.remove('show');
      }
    });

    this.eventManager.add(elements.previewModal, 'click', (event) => {
      if (event.target === elements.previewModal) {
        elements.previewModal.classList.remove('show');
      }
    });
  }

  // ====== MOBILE LISTENERS (SOLO CHAT) ======
  setupMobileListeners(elements) {
    if (!elements.attachmentsWrapperMobile || !elements.attachButtonMobile) return;

    this.eventManager.add(elements.attachButtonMobile, 'click', (event) => {
      event.stopPropagation();
      elements.attachmentsWrapperMobile.classList.toggle('active');
    });

    const mobileOptions = {
      'image-option-mobile': elements.imageUploadMobile,
      'document-option-mobile': elements.documentUploadMobile,
      'code-option-mobile': elements.codeUploadMobile
    };

    Object.entries(mobileOptions).forEach(([optionId, input]) => {
      const option = document.getElementById(optionId);
      if (option && input) {
        this.eventManager.add(option, 'click', () => input.click());
      }
    });

    this.eventManager.add(document, 'click', (event) => {
      if (elements.attachmentsWrapperMobile.classList.contains('active') && 
          !elements.attachmentsWrapperMobile.contains(event.target)) {
        elements.attachmentsWrapperMobile.classList.remove('active');
      }
    });

    this.eventManager.add(document, 'keydown', (event) => {
      if (event.key === 'Escape' && elements.attachmentsWrapperMobile.classList.contains('active')) {
        elements.attachmentsWrapperMobile.classList.remove('active');
      }
    });
  }

  // ====== CREAR ELEMENTOS FALTANTES ======
  createMissingElements(elements) {
    if (!elements.filePreviewContainer) {
      if (this.context === 'welcome') {
        const welcomeInputContainer = document.querySelector('.welcome-input-container');
        if (welcomeInputContainer) {
          const previewContainer = document.createElement('div');
          previewContainer.className = 'file-preview-container welcome-file-preview-container';
          previewContainer.id = 'welcome-file-preview-container';
          
          const inputContainer = welcomeInputContainer.querySelector('.input-container');
          if (inputContainer) {
            welcomeInputContainer.insertBefore(previewContainer, inputContainer);
          } else {
            welcomeInputContainer.appendChild(previewContainer);
          }
        }
      } else {
        const chatInputContainer = document.querySelector('.chat-input-container');
        if (chatInputContainer) {
          const previewContainer = document.createElement('div');
          previewContainer.className = 'file-preview-container';
          chatInputContainer.parentNode.insertBefore(previewContainer, chatInputContainer);
        }
      }
    }

    if (!elements.previewModal) {
      this.createPreviewModal();
    }
  }

  // ====== CONFIGURAR OBSERVADORES ======
  setupObservers() {
    const filePreviewContainer = this.getDOMElements().filePreviewContainer;
    if (!filePreviewContainer) return;

    if (this.previewObserver) {
      this.previewObserver.disconnect();
    }

    const updatePreviewClass = () => {
      const chatMessages = document.querySelector('.chat-messages');
      if (!chatMessages) return;

      const hasFiles = filePreviewContainer.children.length > 0;
      const isVisible = window.getComputedStyle(filePreviewContainer).display !== 'none';
      const isAtPageBottom = this.isAtBottomOfPage();

      if (hasFiles && isVisible && isAtPageBottom) {
        chatMessages.classList.add('preview-active');
      } else {
        chatMessages.classList.remove('preview-active');
      }
    };

    this.previewObserver = new MutationObserver(updatePreviewClass);
    this.previewObserver.observe(filePreviewContainer, { 
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    this.eventManager.add(window, 'scroll', updatePreviewClass);
    updatePreviewClass();
  }

  // ====== MANEJAR ARCHIVOS DROPEADOS ======
async handleDroppedFiles(files) {
  console.log(`🦫 Acadel procesando ${files.length} archivos dropeados (${this.context})`);
  
  if (!files || files.length === 0) return;
  
  // IMPORTANTE: No usar operationLock para múltiples archivos
  // Solo verificar si la instancia está destruida
  if (this.state.isDestroyed) {
    console.warn('🦫 Acadel: Instancia destruida, ignorando archivos');
    return;
  }

  try {
    const currentFiles = this.getCurrentFileCount();
    const totalFiles = currentFiles + files.length;
    
    if (!validateFileCountLimit(totalFiles)) {
      return;
    }

    let previewContainer = this.getDOMElements().filePreviewContainer;
    if (!previewContainer && this.context === 'welcome') {
      this.createMissingElements({});
      previewContainer = this.getDOMElements().filePreviewContainer;
    }

    if (!previewContainer) {
      this.showAcadelError('FILE_CORRUPTED', 'Acadel no encuentra dónde poner los archivos');
      return;
    }

    const processPromises = Array.from(files).map(async (file, index) => {
      try {
        const fileSignature = `${file.name}-${file.size}-${Date.now()}-${index}`;
        
        if (this.state.processingQueue.has(fileSignature)) {
          console.log('🦫 Acadel: Archivo duplicado ignorado:', file.name);
          return { success: false, reason: 'duplicate' };
        }
        
        this.state.processingQueue.add(fileSignature);
        
        await this.handleSingleFilePreview(file);
        
        setTimeout(() => {
          this.state.processingQueue.delete(fileSignature);
        }, 2000);
        
        return { success: true, fileName: file.name };
        
      } catch (fileError) {
        console.error('❌ Error procesando archivo:', fileError);
        this.showAcadelError('FILE_CORRUPTED', 
          `Error procesando "${file.name}": ${fileError.message}`);
        return { success: false, reason: 'error', error: fileError.message };
      }
    });

    const results = await Promise.allSettled(processPromises);
    
    let processedCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        processedCount++;
      } else {
        errorCount++;
        if (result.status === 'rejected') {
          console.error(`Error en archivo ${index}:`, result.reason);
        }
      }
    });

    if (processedCount > 0 && errorCount === 0) {
      this.showAcadelSuccess('FILES_READY', 
        `Acadel procesó ${processedCount} archivo${processedCount > 1 ? 's' : ''} perfectamente`);
    } else if (processedCount > 0 && errorCount > 0) {
      this.showAcadelWarning('FILE_PARTIALLY_READ', 
        `Acadel procesó ${processedCount} archivos exitosos, ${errorCount} con problemas`);
    } else if (errorCount > 0) {
      this.showAcadelError('FILE_CORRUPTED', 
        `Acadel no pudo procesar ningún archivo. Revisa los formatos.`);
    }

  } catch (error) {
    console.error('❌ Error general en handleDroppedFiles:', error);
    this.showAcadelError('FILE_CORRUPTED', 
      'Acadel tuvo un problema técnico procesando los archivos');
  } finally {
    const elements = this.getDOMElements();
    if (elements.fileUploadContainer) {
      elements.fileUploadContainer.classList.remove('active', 'dragging');
    }
  }
}

  // ====== OBTENER CANTIDAD ACTUAL DE ARCHIVOS ======
  getCurrentFileCount() {
    if (this.context === 'welcome') {
      return document.querySelectorAll('#welcome-file-preview-container .file-preview[data-file-id]').length;
    } else {
      return document.querySelectorAll('.file-preview-container .file-preview[data-file-id]').length;
    }
  }

  // ====== PROCESAR ARCHIVO INDIVIDUAL ======
async handleSingleFilePreview(file) {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    this.showAcadelError(typeValidation.messageKey, typeValidation.reason);
    throw new Error('Archivo no válido según Acadel');
  }

  const validationResult = await validateFile(file, typeValidation.detectedType);
  if (!validationResult.valid) {
    throw new Error('Archivo no válido según validación completa');
  }

  // ID único con timestamp para evitar colisiones
  const fileId = `${this.prefix}file-${this.state.nextId++}-${Date.now()}`;
  console.log(`🆔 Acadel generó ID: ${fileId} para: ${file.name} (${this.context})`);

  let previewHtml = '';
  if (typeValidation.detectedType === 'code') {
    previewHtml = await generateCodePreview(file, fileId);
  } else {
    previewHtml = await generateFilePreview(file, fileId);
  }

  if (validationResult.truncated) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewHtml;
    const previewElement = tempDiv.firstElementChild;
    if (previewElement) {
      previewElement.classList.add('file-truncated');
      const truncatedIndicator = document.createElement('div');
      truncatedIndicator.className = 'file-truncated-indicator';
      truncatedIndicator.title = 'Archivo muy largo - Acadel leerá parcialmente';
      previewElement.appendChild(truncatedIndicator);
      previewHtml = previewElement.outerHTML;
    }
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = previewHtml;
  const previewElement = tempDiv.firstElementChild;

  const previewContainer = this.getDOMElements().filePreviewContainer;
  previewContainer.appendChild(previewElement);

  const fileData = {
    file: file,
    type: typeValidation.detectedType,
    preview: true,
    processed: false,
    truncated: validationResult.truncated
  };

  if (typeValidation.detectedType === 'image') {
    // No esperar el base64, hacerlo en background
    imageToBase64(file).then(base64 => {
      if (this.state.files.has(fileId)) {
        this.state.files.get(fileId).previewBase64 = base64;
      }
    }).catch(error => {
      console.warn('⚠️ No se pudo generar base64 para:', file.name);
    });
  }

  this.state.files.set(fileId, fileData);
  console.log(`✅ Acadel guardó archivo: ${file.name} (${this.context})`);
}

  // ====== SELECCIÓN DE ARCHIVOS ======
  async handleFileSelection(event, fileType) {
    const file = event.target.files[0];
    if (!file) return;

    if (this.operationLock) {
      console.log('🦫 Acadel: Operación en curso, ignorando selección');
      event.target.value = '';
      return;
    }

    this.operationLock = true;

    try {
      const currentFiles = this.getCurrentFileCount();
      if (!validateFileCountLimit(currentFiles + 1)) {
        event.target.value = '';
        return;
      }

      await this.handleSingleFilePreview(file);
      this.showAcadelSuccess('FILE_PROCESSED', 
        `¡Perfecto! Acadel procesó "${file.name}" exitosamente.`);

    } catch (error) {
      console.error('❌ Error en selección de archivo:', error);
      this.showAcadelError('FILE_CORRUPTED', 
        `Error procesando "${file.name}": ${error.message}`);
    } finally {
      this.operationLock = false;
      event.target.value = '';
    }
  }

  // ====== ABRIR CÁMARA ======
  async openCamera() {
    console.log(`🦫 Acadel abriendo cámara (${this.context})...`);
    
    const currentFiles = this.getCurrentFileCount();
    if (!validateFileCountLimit(currentFiles + 1)) {
      return;
    }

    this.closeCamera();

    const cameraHTML = `
      <div id="${this.prefix}camera-container">
        <video id="${this.prefix}camera-stream" autoplay playsinline></video>
        <canvas id="${this.prefix}camera-canvas" style="display: none;"></canvas>
        <div class="camera-controls">
          <button id="${this.prefix}capture-photo">
            <i class='bx bx-camera'></i>
          </button>
          <button id="${this.prefix}close-camera">
            <i class='bx bx-x'></i>
          </button>
        </div>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cameraHTML;
    document.body.appendChild(tempDiv.firstElementChild);

    const cameraContainer = document.getElementById(`${this.prefix}camera-container`);
    const videoElement = document.getElementById(`${this.prefix}camera-stream`);
    const closeButton = document.getElementById(`${this.prefix}close-camera`);
    const captureButton = document.getElementById(`${this.prefix}capture-photo`);
    const canvasElement = document.getElementById(`${this.prefix}camera-canvas`);

    // Event listeners para cámara (temporales)
    this.eventManager.add(closeButton, 'click', () => this.closeCamera());
    this.eventManager.add(captureButton, 'click', () => 
      this.capturePhoto(videoElement, canvasElement));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });

      this.state.mediaStream = stream;
      videoElement.srcObject = stream;
      cameraContainer.classList.add('active');

      this.showAcadelSuccess('FILE_PROCESSED', 'Cámara lista. ¡Sonríe para Acadel!');
    } catch (error) {
      this.showAcadelError('FILE_CORRUPTED', 
        'Acadel no puede acceder a tu cámara. Verifica los permisos.');
      setTimeout(() => this.closeCamera(), 100);
    }
  }

  // ====== CERRAR CÁMARA ======
  closeCamera() {
    if (this.state.mediaStream) {
      this.state.mediaStream.getTracks().forEach(track => track.stop());
      this.state.mediaStream = null;
    }

    const cameraContainer = document.getElementById(`${this.prefix}camera-container`);
    if (cameraContainer) {
      cameraContainer.classList.remove('active');
      setTimeout(() => {
        if (cameraContainer.parentNode) {
          cameraContainer.parentNode.removeChild(cameraContainer);
        }
      }, 300);
    }
  }

  // ====== CAPTURAR FOTO ======
  capturePhoto(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) return;

    const { videoWidth, videoHeight } = videoElement;
    if (!videoWidth || !videoHeight) {
      this.showAcadelError('FILE_CORRUPTED', 'La cámara no está lista. Espera un momento.');
      return;
    }

    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

    canvasElement.toBlob(async (blob) => {
      try {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const fileName = `foto_acadel_${timestamp}.jpg`;
        const file = createFileFromBlob(blob, fileName, 'image/jpeg');

        await this.handleSingleFilePreview(file);
        this.closeCamera();
        this.showAcadelSuccess('FILE_PROCESSED', '¡Foto capturada! Acadel ya la tiene lista.');
      } catch (error) {
        this.showAcadelError('FILE_CORRUPTED', 
          'Error al procesar la foto. Acadel tuvo un problemita técnico.');
      }
    }, 'image/jpeg', 0.9);
  }

  // ====== MOSTRAR PREVIEW DE ARCHIVO ======
  showFilePreview(fileId, fileType) {
    const previewModal = document.getElementById(`${this.prefix}preview-modal`) || document.getElementById('preview-modal');
    const previewBody = previewModal?.querySelector('.preview-body') || document.getElementById('preview-body');
    const previewFileName = previewModal?.querySelector('.preview-title span') || document.getElementById('preview-file-name');

    if (!previewModal || !previewBody || !this.state.files.has(fileId)) return;

    const fileInfo = this.state.files.get(fileId);
    const file = fileInfo.file;

    if (previewFileName) {
      previewFileName.textContent = file.name;
    }

    previewBody.innerHTML = '';
    previewBody.className = 'preview-body';

    const loadingElement = document.createElement('div');
    loadingElement.className = 'preview-loading';
    loadingElement.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Acadel está leyendo el archivo...</p>
    `;
    previewBody.appendChild(loadingElement);

    previewModal.classList.add('show');

    if (fileType === 'image') {
      this.showImagePreview(file, previewBody);
    } else if (fileType === 'document') {
      this.showDocumentPreview(file, previewBody);
    } else if (fileType === 'code') {
      this.showCodePreview(file, previewBody);
    }
  }

  // ====== MOSTRAR PREVIEW DE IMAGEN ======
  showImagePreview(file, previewBody) {
    previewBody.classList.add('image-preview');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      previewBody.innerHTML = '';
      const imgElement = document.createElement('img');
      imgElement.src = e.target.result;
      imgElement.alt = file.name;
      previewBody.appendChild(imgElement);
    };
    reader.onerror = () => {
      this.showPreviewError(previewBody, 'Acadel no pudo mostrar la imagen');
    };
    reader.readAsDataURL(file);
    
    this.updatePreviewIcon('bx bx-image');
  }

  // ====== MOSTRAR PREVIEW DE DOCUMENTO ======
  showDocumentPreview(file, previewBody) {
    previewBody.classList.add('document-preview');
    
    extractTextFromFile(file)
      .then(content => {
        previewBody.innerHTML = '';
        
        const documentContainer = document.createElement('div');
        documentContainer.className = 'document-preview-container';
        
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'preview-file-metadata';
        metadataDiv.innerHTML = `
          <div class="metadata-info">
            <span class="metadata-item"><strong>Archivo:</strong> ${file.name}</span>
            <span class="metadata-item"><strong>Tamaño:</strong> ${formatFileSize(file.size)}</span>
            <span class="metadata-item"><strong>Caracteres:</strong> ${content.length.toLocaleString()}</span>
          </div>
        `;
        
        const textContentDiv = document.createElement('div');
        textContentDiv.className = 'document-preview-text scrollable-content';
        textContentDiv.textContent = content;
        
        documentContainer.appendChild(metadataDiv);
        documentContainer.appendChild(textContentDiv);
        previewBody.appendChild(documentContainer);
      })
      .catch(error => {
        this.showPreviewError(previewBody, 'Acadel no pudo leer el documento: ' + error.message);
      });
    
    const extension = getFileExtension(file.name);
    const iconClass = extension === 'docx' || extension === 'doc' ? 'bx bxs-file-doc' : 'bx bxs-file-txt';
    this.updatePreviewIcon(iconClass);
  }

  // ====== MOSTRAR PREVIEW DE CÓDIGO ======
  showCodePreview(file, previewBody) {
    previewBody.classList.add('code-preview');
    
    extractCodeFromFile(file)
      .then(content => {
        previewBody.innerHTML = '';
        
        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-preview-container';
        
        const extension = getFileExtension(file.name);
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'preview-file-metadata';
        metadataDiv.innerHTML = `
          <div class="metadata-info">
            <span class="metadata-item"><strong>Archivo:</strong> ${file.name}</span>
            <span class="metadata-item"><strong>Lenguaje:</strong> ${this.getLanguageName(extension)}</span>
            <span class="metadata-item"><strong>Tamaño:</strong> ${formatFileSize(file.size)}</span>
            <span class="metadata-item"><strong>Líneas:</strong> ${content.split('\n').length.toLocaleString()}</span>
          </div>
        `;
        
        const codeWrapper = document.createElement('div');
        codeWrapper.className = 'code-content-wrapper scrollable-content';
        
        const preElement = document.createElement('pre');
        preElement.className = 'code-display';
        
        const codeElement = document.createElement('code');
        codeElement.className = `language-${this.getLanguageClass(extension)}`;
        codeElement.textContent = content;
        
        preElement.appendChild(codeElement);
        codeWrapper.appendChild(preElement);
        
        codeContainer.appendChild(metadataDiv);
        codeContainer.appendChild(codeWrapper);
        previewBody.appendChild(codeContainer);
        
        setTimeout(() => {
          if (typeof hljs !== 'undefined') {
            window.hljs.highlightElement(codeElement);
          } else if (typeof Prism !== 'undefined') {
            Prism.highlightElement(codeElement);
          }
        }, 50);
      })
      .catch(error => {
        this.showPreviewError(previewBody, 'Acadel no pudo leer el código: ' + error.message);
      });
    
    const codeIcon = getCodeFileIcon(file.name);
    const finalIcon = codeIcon && codeIcon !== 'bx-code-alt' ? codeIcon : 'bx bx-code-alt';
    this.updatePreviewIcon(finalIcon);
  }

  // ====== HELPERS PARA PREVIEW ======
  showPreviewError(previewBody, errorMessage) {
    previewBody.innerHTML = '';
    previewBody.className = 'preview-body';
    
    const errorElement = document.createElement('div');
    errorElement.className = 'preview-error-container';
    errorElement.innerHTML = `
      <div class="preview-error-content">
        <i class="bx bx-error-circle"></i>
        <p>${errorMessage}</p>
      </div>
    `;
    previewBody.appendChild(errorElement);
  }

  updatePreviewIcon(iconClass) {
    const modalSelector = this.context === 'welcome' ? '#welcome-preview-modal' : '#preview-modal';
    const titleIcon = document.querySelector(`${modalSelector} .preview-title i`);
    if (titleIcon) {
      const finalIconClass = iconClass.startsWith('bx ') ? iconClass : `bx ${iconClass}`;
      titleIcon.className = finalIconClass;
    }
  }

  getLanguageName(extension) {
    const languageMap = {
      'js': 'JavaScript', 'ts': 'TypeScript', 'jsx': 'React JSX', 'tsx': 'React TSX',
      'py': 'Python', 'ipynb': 'Jupyter Notebook', 'html': 'HTML', 'htm': 'HTML',
      'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS', 'java': 'Java', 'c': 'C',
      'cpp': 'C++', 'h': 'C Header', 'cs': 'C#', 'php': 'PHP', 'rb': 'Ruby',
      'go': 'Go', 'rs': 'Rust', 'swift': 'Swift', 'json': 'JSON', 'xml': 'XML',
      'sql': 'SQL', 'sh': 'Shell Script', 'bash': 'Bash Script', 'ps1': 'PowerShell',
      'bat': 'Batch', 'yml': 'YAML', 'yaml': 'YAML', 'ini': 'INI Config', 'toml': 'TOML Config'
    };
    return languageMap[extension] || extension.toUpperCase();
  }

  getLanguageClass(extension) {
    const languageMap = {
      'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
      'py': 'python', 'ipynb': 'python', 'html': 'html', 'htm': 'html', 'css': 'css',
      'scss': 'scss', 'sass': 'sass', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
      'h': 'c', 'cs': 'csharp', 'php': 'php', 'rb': 'ruby', 'go': 'go',
      'rs': 'rust', 'swift': 'swift', 'json': 'json', 'xml': 'xml', 'sql': 'sql',
      'sh': 'bash', 'bash': 'bash', 'ps1': 'powershell', 'bat': 'batch',
      'yml': 'yaml', 'yaml': 'yaml', 'ini': 'ini', 'toml': 'toml'
    };
    return languageMap[extension] || 'text';
  }

  // ====== ELIMINAR ARCHIVO ======
  removeFile(fileId) {
    const selector = this.context === 'welcome' ? 
      `#welcome-file-preview-container .file-preview[data-file-id="${fileId}"]` :
      `.file-preview-container .file-preview[data-file-id="${fileId}"]`;
      
    const fileElement = document.querySelector(selector);
    if (fileElement) {
      fileElement.remove();
    }
    
    this.state.files.delete(fileId);
    console.log(`🦫 Acadel eliminó archivo con ID: ${fileId} (${this.context})`);
  }

  // ====== CREAR MODAL DE PREVIEW ======
  createPreviewModal() {
    const modalId = this.context === 'welcome' ? 'welcome-preview-modal' : 'preview-modal';
    
    if (document.getElementById(modalId)) return;
    
    const modalHTML = `
      <div id="${modalId}" class="preview-modal ${this.context === 'welcome' ? 'welcome-preview-modal' : ''}">
        <div class="preview-modal-content">
          <div class="preview-title">
            <i class="bx bx-file"></i>
            <span id="${this.context === 'welcome' ? 'welcome-preview-file-name' : 'preview-file-name'}">Archivo</span>
            <button id="${this.context === 'welcome' ? 'welcome-preview-close' : 'preview-close'}" class="preview-close-btn">
              <i class="bx bx-x"></i>
            </button>
          </div>
          <div id="${this.context === 'welcome' ? 'welcome-preview-body' : 'preview-body'}" class="preview-body">
          </div>
        </div>
      </div>
    `;
    
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    document.body.appendChild(modalElement.firstElementChild);

    const previewClose = document.getElementById(this.context === 'welcome' ? 'welcome-preview-close' : 'preview-close');
    const previewModal = document.getElementById(modalId);

    if (previewClose && previewModal) {
      this.eventManager.add(previewClose, 'click', () => {
        previewModal.classList.remove('show');
      });
      
      this.eventManager.add(previewModal, 'click', (event) => {
        if (event.target === previewModal) {
          previewModal.classList.remove('show');
        }
      });
      
      this.eventManager.add(document, 'keydown', (event) => {
        if (event.key === 'Escape' && previewModal.classList.contains('show')) {
          previewModal.classList.remove('show');
        }
      });
    }
  }

  // ====== OBTENER ARCHIVOS ADJUNTOS ======
  getAttachedFiles() {
    const files = [];
    
    const selector = this.context === 'welcome' ? 
      '#welcome-file-preview-container .file-preview[data-file-id]' :
      '.file-preview-container .file-preview[data-file-id]';
      
    const domFileIds = Array.from(document.querySelectorAll(selector))
      .map(el => el.dataset.fileId);
    
    if (!validateFileCountLimit(domFileIds.length)) {
      console.warn('🦫 Acadel detectó demasiados archivos al obtener');
      return [];
    }
    
    this.state.files.forEach((fileInfo, fileId) => {
      if (domFileIds.includes(fileId)) {
        const fileData = {
          id: fileId,
          file: fileInfo.file,
          type: fileInfo.type,
          forUpload: true
        };
        
        if (fileInfo.type === 'image' && fileInfo.previewBase64) {
          fileData.data = { base64: fileInfo.previewBase64 };
        }
        
        files.push(fileData);
      }
    });
    
    console.log(`🦫 Acadel preparó ${files.length} archivos para envío (${this.context})`);
    return files;
  }

  // ====== LIMPIAR ARCHIVOS ======
  clearAttachedFiles() {
    console.log(`🦫 Acadel limpiando todos los archivos (${this.context})`);
    
    this.state.files.clear();
    this.state.processingQueue.clear();
    
    const previewContainer = this.getDOMElements().filePreviewContainer;
    if (previewContainer) {
      previewContainer.innerHTML = '';
    }
    
    const elements = this.getDOMElements();
    if (elements.fileUploadContainer) {
      elements.fileUploadContainer.classList.remove('active', 'dragging');
    }
    
    if (this.context === 'welcome') {
      ['welcome-image-input', 'welcome-document-input', 'welcome-code-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
    } else {
      ['image-upload', 'document-upload', 'code-upload',
       'image-upload-mobile', 'document-upload-mobile', 'code-upload-mobile'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
    }
  }

  // ====== VERIFICAR SI HAY ARCHIVOS ======
  hasAttachedFiles() {
    const selector = this.context === 'welcome' ? 
      '#welcome-file-preview-container .file-preview[data-file-id]' :
      '.file-preview-container .file-preview[data-file-id]';
      
    const visibleFileElements = document.querySelectorAll(selector);
    const hasVisible = visibleFileElements.length > 0;
    
    if (!hasVisible && this.state.files.size > 0) {
      this.state.files.clear();
    }
    
    return hasVisible;
  }

  // ====== TRANSFERIR ARCHIVOS DESDE WELCOME AL CHAT ======
  transferFilesToChat() {
    if (this.context !== 'welcome') {
      console.warn('transferFilesToChat solo funciona desde welcome');
      return [];
    }

    const welcomeFiles = this.getAttachedFiles();
    console.log(`🚀 Transfiriendo ${welcomeFiles.length} archivos de welcome a chat`);
    
    if (welcomeFiles.length > 0) {
      window.temporaryWelcomeFiles = welcomeFiles.map(fileData => ({
        file: fileData.file,
        type: fileData.type,
        data: fileData.data || {}
      }));
    }
    
    return welcomeFiles;
  }

  // ====== RECIBIR ARCHIVOS TRANSFERIDOS DESDE WELCOME ======
  async receiveTransferredFiles() {
    if (this.context !== 'chat') {
      console.warn('receiveTransferredFiles solo funciona en chat');
      return;
    }

    if (!window.temporaryWelcomeFiles || window.temporaryWelcomeFiles.length === 0) {
      return;
    }

    console.log(`🎯 Recibiendo ${window.temporaryWelcomeFiles.length} archivos transferidos desde welcome`);

    try {
      for (const fileData of window.temporaryWelcomeFiles) {
        await this.handleSingleFilePreview(fileData.file);
      }

      console.log('✅ Archivos transferidos exitosamente');
    } catch (error) {
      console.error('❌ Error al transferir archivos:', error);
    } finally {
      delete window.temporaryWelcomeFiles;
    }
  }

  // ====== HELPERS ======
  isAtBottomOfPage() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollHeight <= clientHeight) {
      return false;
    }
    
    const scrollMargin = 100;
    return scrollTop + clientHeight >= scrollHeight - scrollMargin;
  }

  // ====== NOTIFICACIONES ACADEL ======
  showAcadelError(messageKey, customMessage = null) {
    const message = ACADEL_FILE_MESSAGES[messageKey];
    if (typeof window.acadelError === 'function') {
      window.acadelError(message.title, customMessage || message.message);
    } else {
      console.error('Acadel:', message.title, '-', customMessage || message.message);
    }
  }

  showAcadelSuccess(messageKey, customMessage = null) {
    const message = ACADEL_FILE_MESSAGES[messageKey];
    if (typeof window.acadelExito === 'function') {
      window.acadelExito(message.title, customMessage || message.message);
    } else {
      console.log('Acadel:', message.title, '-', customMessage || message.message);
    }
  }

  showAcadelWarning(messageKey, customMessage = null) {
    const message = ACADEL_FILE_MESSAGES[messageKey];
    if (typeof window.acadelWarning === 'function') {
      window.acadelWarning(message.title, customMessage || message.message);
    } else {
      console.warn('Acadel:', message.title, '-', customMessage || message.message);
    }
  }

  // ====== DESTRUIR INSTANCIA ======
  destroy() {
    console.log(`🧨 Acadel destruyendo instancia del File Manager (${this.context})`);
    
    this.state.isDestroyed = true;
    this.operationLock = false;
    
    this.closeCamera();
    
    this.eventManager.cleanup();
    
    if (this.previewObserver) {
      this.previewObserver.disconnect();
      this.previewObserver = null;
    }
    
    this.state.files.clear();
    this.state.processingQueue.clear();
    this.state.nextId = 1;
    
    const previewContainer = this.getDOMElements().filePreviewContainer;
    if (previewContainer) {
      previewContainer.innerHTML = '';
    }
    
    const elements = this.getDOMElements();
    if (elements.fileUploadContainer) {
      elements.fileUploadContainer.classList.remove('active', 'dragging');
    }
    
    console.log(`✅ Acadel destruyó instancia completamente (${this.context})`);
  }
}

// ====== EVENT MANAGER CENTRALIZADO ======
class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  add(element, event, handler, options = false) {
    if (!element) return;

    element.addEventListener(event, handler, options);

    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    this.listeners.get(element).push({ event, handler, options });
  }

  cleanup() {
    this.listeners.forEach((listenerInfos, element) => {
      listenerInfos.forEach(({ event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (e) {
          console.warn('Error removiendo listener:', e);
        }
      });
    });

    this.listeners.clear();
  }
}

// ====== FUNCIONES PÚBLICAS PARA CHAT ======

export function initFileAttachments() {
  console.log('🦫 Acadel inicializando sistema de archivos para CHAT');
  
  if (fileAttachmentManager) {
    fileAttachmentManager.destroy();
  }
  
  fileAttachmentManager = new UnifiedFileAttachmentManager('chat');
  fileAttachmentManager.initialize();
  
  setTimeout(() => {
    fileAttachmentManager.receiveTransferredFiles();
  }, 100);
  setupEmergencyDragCleanup();
}

export async function handleFileSelection(event, fileType) {
  if (fileAttachmentManager) {
    return await fileAttachmentManager.handleFileSelection(event, fileType);
  }
}

export async function openCamera() {
  if (fileAttachmentManager) {
    return await fileAttachmentManager.openCamera();
  }
}

export function showFilePreview(fileId, fileType) {
  if (fileAttachmentManager) {
    return fileAttachmentManager.showFilePreview(fileId, fileType);
  }
}

export function createPreviewModal() {
  if (fileAttachmentManager) {
    return fileAttachmentManager.createPreviewModal();
  }
}

export function getAttachedFiles() {
  if (fileAttachmentManager) {
    return fileAttachmentManager.getAttachedFiles();
  }
  return [];
}

export function clearAttachedFiles() {
  if (fileAttachmentManager) {
    return fileAttachmentManager.clearAttachedFiles();
  }
}

export function hasAttachedFiles() {
  if (fileAttachmentManager) {
    return fileAttachmentManager.hasAttachedFiles();
  }
  return false;
}

export function cleanup() {
  console.log('🧹 Acadel ejecutando cleanup público (chat)');
  if (fileAttachmentManager) {
    fileAttachmentManager.destroy();
    fileAttachmentManager = null;
  }
}

export function resetAttachmentState() {
  console.log('🔧 Reseteando estado de archivos (chat)...');
  if (fileAttachmentManager) {
    fileAttachmentManager.operationLock = false;
    fileAttachmentManager.state.processingQueue.clear();
  }
  console.log('✅ Estado reseteado (chat)');
}

// ====== NUEVAS FUNCIONES PÚBLICAS PARA WELCOME ======

export function initWelcomeFileAttachments() {
  console.log('🦫 Acadel inicializando sistema de archivos para WELCOME');
  
  if (welcomeFileManager) {
    welcomeFileManager.destroy();
  }
  
  welcomeFileManager = new UnifiedFileAttachmentManager('welcome');
  welcomeFileManager.initialize();
  setupEmergencyDragCleanup();
}

export function getWelcomeAttachedFiles() {
  if (welcomeFileManager) {
    return welcomeFileManager.getAttachedFiles();
  }
  return [];
}

export function clearWelcomeAttachedFiles() {
  if (welcomeFileManager) {
    return welcomeFileManager.clearAttachedFiles();
  }
}

export function hasWelcomeAttachedFiles() {
  if (welcomeFileManager) {
    return welcomeFileManager.hasAttachedFiles();
  }
  return false;
}

export function transferWelcomeFilesToChat() {
  if (welcomeFileManager) {
    return welcomeFileManager.transferFilesToChat();
  }
  return [];
}

export function cleanupWelcomeAttachments() {
  console.log('🧹 Acadel ejecutando cleanup público (welcome)');
  if (welcomeFileManager) {
    welcomeFileManager.destroy();
    welcomeFileManager = null;
  }
}

function setupEmergencyDragCleanup() {
  // Solo ejecutar una vez
  if (window._dragCleanupSetupTeorico) return;
  window._dragCleanupSetupTeorico = true;

  const cleanupDragAreas = () => {
    const areas = document.querySelectorAll('#drag-drop-area, .file-upload-container, #welcome-drag-drop-area');
    areas.forEach(area => {
      if (area) {
        area.classList.remove('active', 'dragging');
      }
    });
  };

  // Limpieza en casos edge
  document.addEventListener('dragend', cleanupDragAreas);
  document.addEventListener('drop', cleanupDragAreas);
  window.addEventListener('blur', cleanupDragAreas);
  document.addEventListener('mouseleave', cleanupDragAreas);
  
  // Limpieza con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cleanupDragAreas();
    }
  });

  // Limpieza después de un tiempo sin actividad de drag
  let dragTimeout;
  document.addEventListener('dragenter', () => {
    clearTimeout(dragTimeout);
    dragTimeout = setTimeout(cleanupDragAreas, 3000); // 3 segundos sin drag = limpiar
  });

  console.log('✅ Limpieza de emergencia para drag-drop configurada (teorico)');
}

if (typeof window !== 'undefined') {
  setupEmergencyDragCleanup();
}


// ====== FUNCIONES GLOBALES PARA COMPATIBILIDAD ======
export function cleanupAllEventListeners() {
  console.log('🔄 Llamada a cleanupAllEventListeners (manejado automáticamente)');
}

// Estado exportado para compatibilidad (solo lectura)
export const attachmentState = {
  get files() {
    return fileAttachmentManager ? fileAttachmentManager.state.files : new Map();
  },
  get nextId() {
    return fileAttachmentManager ? fileAttachmentManager.state.nextId : 1;
  }
};

export const welcomeAttachmentState = {
  get files() {
    return welcomeFileManager ? welcomeFileManager.state.files : new Map();
  },
  get nextId() {
    return welcomeFileManager ? welcomeFileManager.state.nextId : 1;
  }
};

// ====== FUNCIÓN GLOBAL PARA COMPATIBILIDAD ======
if (typeof window !== 'undefined') {
  window.handleDroppedFiles = function(files) {
    if (document.querySelector('.welcome-message') && welcomeFileManager) {
      return welcomeFileManager.handleDroppedFiles(files);
    } else if (fileAttachmentManager) {
      return fileAttachmentManager.handleDroppedFiles(files);
    }
  };
}

export default {
  // Funciones para chat
  initFileAttachments,
  getAttachedFiles,
  clearAttachedFiles,
  hasAttachedFiles,
  cleanup,
  createPreviewModal,
  showFilePreview,
  cleanupAllEventListeners,
  handleFileSelection,
  openCamera,
  resetAttachmentState,
  
  // Funciones para welcome
  initWelcomeFileAttachments,
  getWelcomeAttachedFiles,
  clearWelcomeAttachedFiles,
  hasWelcomeAttachedFiles,
  transferWelcomeFilesToChat,
  cleanupWelcomeAttachments
};