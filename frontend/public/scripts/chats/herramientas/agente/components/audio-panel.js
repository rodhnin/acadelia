/**
 * audio-panel.js - Componente para grabar y subir audio y reutilizar el panel existente
 * OPTIMIZADO: Con notificaciones Acadel solo cuando son necesarias para el usuario
 */
import { getState } from '../core/state-agente.js';
import { 
  createElement, 
  addClass, 
  removeClass, 
  addEvent
} from '../../../shared/dom-helpers.js';
import eventBus from '../core/event-bus-agente.js';
import { 
  hideAudioProcessingLoader, 
  showMediaProcessingLoader,
  startProcessingCheck 
 } from '../ui/ui-manager-agente.js';
import { youtubePanel } from '../components/youtube-panel.js';

// Clase para gestionar el panel de audio
export class AudioPanel {
  constructor() {
    this.isVisible = false;
    this.isRecording = false;
    this.isPaused = false;
    this.hasPermission = false;
    this.recorder = null;
    this.audioChunks = [];
    this.recordingTimer = null;
    this.recordingTime = 0;
    this.audioStream = null;
    this.audioButton = null;
    this.audioMenu = null;
    this.currentChatId = null;
    this.lastRecordingState = null; // Para rastrear el último estado de grabación
    
    // Enlazar métodos para mantener el contexto
    this.toggleAudioMenu = this.toggleAudioMenu.bind(this);
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.pauseResumeRecording = this.pauseResumeRecording.bind(this);
    this.cancelRecording = this.cancelRecording.bind(this);
    this.confirmSendRecording = this.confirmSendRecording.bind(this);
    this.cancelSendRecording = this.cancelSendRecording.bind(this);
    this.uploadAudio = this.uploadAudio.bind(this);
    this.updateRecordingTime = this.updateRecordingTime.bind(this);
    this.processRecordedAudio = this.processRecordedAudio.bind(this);
    this.closeAudioMenu = this.closeAudioMenu.bind(this);
    this.checkForAudio = this.checkForAudio.bind(this);
    this.releaseMediaResources = this.releaseMediaResources.bind(this);
    this.verifyResourceRelease = this.verifyResourceRelease.bind(this);
    this.detectOptimalMimeType = this.detectOptimalMimeType.bind(this);
    this.getFileExtensionFromMimeType = this.getFileExtensionFromMimeType.bind(this);
  }
  
  /**
   * Inicializa el componente de audio
   */
  init() {
    // Antes de inicializar, asegurarse de que no hay recursos activos de sesiones anteriores
    this.releaseMediaResources();
    
    this.createAudioButton();
    
    this.checkForAudio();
    
    eventBus.on('chat:changed', () => this.checkForAudio());
    
    // También verificar cuando cambie el chat directamente desde el estado
    const currentChatId = getState('currentChatId');
    this.currentChatId = currentChatId;
    
    setTimeout(() => {
      const updatedChatId = getState('currentChatId');
      if (updatedChatId) {
        this.currentChatId = updatedChatId;
        this.checkForAudio();
      }
    }, 2000);
    
    return this;
  }
  
  /**
   * Crea el botón flotante para audio
   */
  createAudioButton() {
    const existingButton = document.querySelector('.audio-panel-trigger');
    if (existingButton) {
      existingButton.remove();
    }
    
    const button = createElement('button', {
      className: 'audio-panel-trigger'
    });
    button.innerHTML = '<i class="bx bx-microphone"></i>';
    button.setAttribute('title', 'Grabar o subir audio');
    button.style.display = 'none'; // Inicialmente oculto
    
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = '';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
    });
    
    // Al hacer clic, mostrar/ocultar el menú
    addEvent(button, 'click', this.toggleAudioMenu);
    
    document.body.appendChild(button);
    this.audioButton = button;
    
    this.createAudioMenu();
  }

/**
 * Método compartido para preparar la interfaz de usuario después de procesar audio
 * Este método debe agregarse a la clase AudioPanel en audio-panel.js
 */
prepareUIAfterAudioProcessing() {
  try {
    // 1. Limpiar elementos de bienvenida
    document.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container').forEach(el => {
      if (el && el.parentNode) {
        el.remove();
      }
    });
    
    // 2. Restaurar visibilidad y funcionalidad completa del textarea y componentes
    const fixedSpace = document.querySelector('.fixed-space');
    const inputBox = document.querySelector('.input-box');
    const textarea = document.querySelector('#messageInput');
    const attachmentsWrapper = document.querySelector('.attachments-wrapper');
    
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('display');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('overflow');
      fixedSpace.style.removeProperty('visibility');
      
      // Forzar reflow para aplicar cambios inmediatamente
      void fixedSpace.offsetHeight;
    }
    
    if (inputBox) {
      inputBox.style.display = '';
      inputBox.style.visibility = 'visible';
      inputBox.style.opacity = '1';
      inputBox.style.pointerEvents = 'auto';
    }
    
    if (textarea) {
      textarea.removeAttribute('disabled');
      textarea.removeAttribute('readonly');
      textarea.removeAttribute('aria-disabled');
      textarea.removeAttribute('tabindex');
      
      textarea.style.display = '';
      textarea.style.visibility = 'visible';
      textarea.style.opacity = '1';
      textarea.style.pointerEvents = 'auto';
      
      textarea.classList.remove('textarea-disabled', 'disabled', 'readonly', 'no-interact');
      
      setTimeout(() => {
        try {
          textarea.focus();
          textarea.blur(); // Técnica para "refrescar" el estado del elemento
          textarea.focus();
        } catch (e) {
        }
      }, 500);
    }
    
    if (attachmentsWrapper) {
      attachmentsWrapper.style.display = '';
    }
    
    // 3. Restaurar botones a estado interactivo
    const sendButton = document.querySelector('#sendButton');
    const mathButton = document.querySelector('#math-button');
    const attachButton = document.querySelector('#attachButton');
    
    [sendButton, mathButton, attachButton].forEach(button => {
      if (button) {
        button.style.pointerEvents = 'auto';
        button.disabled = false;
      }
    });
    
    // 4. Restaurar manejadores de eventos
    try {
      import('../core/chat-controller-agente.js').then(module => {
        if (module && typeof module.handleSendMessage === 'function') {
          const sendBtn = document.querySelector('#sendButton');
          if (sendBtn) {
            sendBtn.removeEventListener('click', module.handleSendMessage);
            sendBtn.addEventListener('click', module.handleSendMessage);
          }
          
          if (textarea && typeof module.handleKeyPress === 'function') {
            textarea.removeEventListener('keydown', module.handleKeyPress);
            textarea.addEventListener('keydown', module.handleKeyPress);
          }
        }
      }).catch(() => {
      });
      
      import('../ui/ui-manager-agente.js').then(module => {
        if (module && typeof module.handleTextareaResize === 'function') {
          if (textarea) {
            textarea.removeEventListener('input', module.handleTextareaResize);
            textarea.addEventListener('input', module.handleTextareaResize);
            
            // Forzar un reajuste inicial
            module.handleTextareaResize({ target: textarea });
          }
        }
      }).catch(() => {
      });
    } catch (e) {
    }
    
    // 5. Desbloquear UI global si es necesario
    try {
      import('../ui/ui-manager-agente.js').then(module => {
        if (module && typeof module.toggleUIState === 'function') {
          module.toggleUIState(false);
        }
      }).catch(() => {
      });
    } catch (e) {
    }

    // SOLUCIÓN COMPLETA CON LIMPIEZA DE EVENTOS: Restauración de todos los componentes de archivo
    try {
      // PRIMERA FASE: LIMPIEZA RADICAL DE EVENTOS Y ESTADOS
      
      // 1. Forzar reset de la bandera de procesamiento de archivos
      window._isProcessingFiles = false;
      
      // 2. Limpiar todos los event listeners relacionados con archivos
      const elementsToClean = [
        // Elementos de drag & drop
        document.querySelector('.file-upload-container'),
        document.getElementById('drag-drop-area'),
        
        // Contenedores de previsualización
        document.querySelector('.file-preview-container'),
        
        document.getElementById('preview-modal'),
        document.getElementById('preview-close'),
        
        // Botones e inputs
        document.getElementById('attachButton'),
        document.getElementById('image-upload'),
        document.getElementById('document-upload'),
        document.getElementById('code-upload'),
        
        // Contenedor de adjuntos
        document.querySelector('.attachments-wrapper'),
        document.querySelector('.attachment-options')
      ];
      
      const safeRemoveEvents = (element) => {
        if (!element) return;
        
        if (typeof removeAllEvents === 'function') {
          removeAllEvents(element);
        } else {
          try {
            const clone = element.cloneNode(true);
            if (element.parentNode) {
              element.parentNode.replaceChild(clone, element);
            }
          } catch (e) {
          }
        }
      };
      
      elementsToClean.forEach(safeRemoveEvents);
      
      // 3. Limpiar listeners globales específicos
      if (typeof removeAllEvents === 'function') {
        removeAllEvents(document, 'dragenter');
        removeAllEvents(document, 'dragover');
        removeAllEvents(document, 'dragleave');
        removeAllEvents(document, 'drop');
      }
      
      // 4. Restablecer estados globales pero conservar referencias a archivos
      if (window.attachmentState) {
        // Preservar los archivos pero limpiar otros estados
        const existingFiles = window.attachmentState.files;
        window.attachmentState = { 
          files: existingFiles,
          nextId: 1,
          mediaStream: null
        };
      }
      
      // SEGUNDA FASE: RESTAURACIÓN DE ELEMENTOS
      
      // 1. Restaurar contenedor de drag & drop
      const fileUploadContainer = document.querySelector('.file-upload-container');
      const dragDropArea = document.getElementById('drag-drop-area');
      
      if (fileUploadContainer) {
        fileUploadContainer.style.removeProperty('display');
        fileUploadContainer.style.removeProperty('opacity');
        fileUploadContainer.style.removeProperty('visibility');
        fileUploadContainer.style.removeProperty('pointer-events');
        fileUploadContainer.classList.remove('welcome-transition', 'disabled', 'hidden');
        fileUploadContainer.style.display = '';
        fileUploadContainer.style.opacity = '1';
        fileUploadContainer.style.visibility = 'visible';
        fileUploadContainer.style.pointerEvents = 'auto';
        fileUploadContainer.classList.remove('active', 'dragging');
        
        // Forzar reflow
        void fileUploadContainer.offsetHeight;
      }
      
      // 2. Restaurar el contenedor de previsualización - CRÍTICO PARA EL PROBLEMA
      const filePreviewContainer = document.querySelector('.file-preview-container');
      if (filePreviewContainer) {
        filePreviewContainer.style.display = '';
        filePreviewContainer.style.visibility = 'visible';
        filePreviewContainer.style.opacity = '1';
        filePreviewContainer.style.pointerEvents = 'auto'; // IMPORTANTE: Asegurar que reciba eventos
      }
      
      // 3. Restaurar wrapper de adjuntos
      const attachmentsWrapper = document.querySelector('.attachments-wrapper');
      if (attachmentsWrapper) {
        attachmentsWrapper.style.display = '';
        attachmentsWrapper.style.visibility = 'visible';
        attachmentsWrapper.style.opacity = '1';
        attachmentsWrapper.style.pointerEvents = 'auto';
      }
      
      // 4. Restaurar botón de adjuntos
      const attachButton = document.querySelector('#attachButton');
      if (attachButton) {
        attachButton.style.pointerEvents = 'auto';
        attachButton.disabled = false;
        
        attachButton.onclick = function(e) {
          e.preventDefault();
          const attachmentOptions = document.querySelector('.attachment-options');
          if (attachmentOptions) attachmentOptions.classList.toggle('show');
        };
      }
      
      // TERCERA FASE: RECONSTRUCCIÓN Y REACTIVACIÓN
      
      // 1. Primero, cargar el módulo file-attachments.js y guardar la referencia
      import('../utils/file-attachments-agente.js').then(fileAttachmentsModule => {
        
        const existingModal = document.getElementById('preview-modal');
        if (!existingModal) {
          if (typeof fileAttachmentsModule.createPreviewModal === 'function') {
            fileAttachmentsModule.createPreviewModal();
          } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.createPreviewModal === 'function') {
            fileAttachmentsModule.default.createPreviewModal();
          }
        }
        
        // IMPORTANTE: Asignar funciones al objeto window ANTES de inicializar
        if (typeof fileAttachmentsModule.showFilePreview === 'function') {
          window.showFilePreview = fileAttachmentsModule.showFilePreview;
        } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.showFilePreview === 'function') {
          window.showFilePreview = fileAttachmentsModule.default.showFilePreview;
        }
        
        if (typeof fileAttachmentsModule.handleDroppedFiles === 'function') {
          window.handleDroppedFiles = fileAttachmentsModule.handleDroppedFiles;
        } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.handleDroppedFiles === 'function') {
          window.handleDroppedFiles = fileAttachmentsModule.default.handleDroppedFiles;
        }
        
        if (typeof fileAttachmentsModule.removeFile === 'function') {
          window.removeFile = fileAttachmentsModule.removeFile;
        } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.removeFile === 'function') {
          window.removeFile = fileAttachmentsModule.default.removeFile;
        }
        
        if (typeof fileAttachmentsModule.handleFileSelection === 'function') {
          window.handleFileSelection = fileAttachmentsModule.handleFileSelection;
        } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.handleFileSelection === 'function') {
          window.handleFileSelection = fileAttachmentsModule.default.handleFileSelection;
        }
        
        // Ahora configuramos manualmente los eventos principales
        
        // 1. Configurar eventos del modal de previsualización
        const previewModal = document.getElementById('preview-modal');
        const previewClose = document.getElementById('preview-close');
        
        if (previewModal && previewClose) {
          if (typeof removeAllEvents === 'function') {
            removeAllEvents(previewClose, 'click');
          }
          
          previewClose.addEventListener('click', () => {
            previewModal.classList.remove('show');
          });
          
          // También cerrar con ESC
          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && previewModal.classList.contains('show')) {
              previewModal.classList.remove('show');
            }
          });
        }
        
        // 2. Configurar eventos para el contenedor de previsualización
        if (filePreviewContainer) {
          if (typeof removeAllEvents === 'function') {
            removeAllEvents(filePreviewContainer, 'click');
          }
          
          filePreviewContainer.addEventListener('click', (event) => {
            
            const removeButton = event.target.closest('.file-preview-remove');
            if (removeButton) {
              const fileId = removeButton.dataset.fileId;
              if (fileId && typeof window.removeFile === 'function') {
                window.removeFile(fileId);
              } else if (fileId && window.attachmentState && window.attachmentState.files) {
                window.attachmentState.files.delete(fileId);
                const fileElement = document.querySelector(`.file-preview[data-file-id="${fileId}"]`);
                if (fileElement && fileElement.parentNode) {
                  fileElement.parentNode.removeChild(fileElement);
                }
              }
              return;
            }
            
            const previewElement = event.target.closest('.file-preview');
            if (previewElement && !event.target.closest('.file-preview-remove')) {
              const fileId = previewElement.dataset.fileId;
              const fileType = previewElement.dataset.fileType;
              
              if (fileId && window.attachmentState && window.attachmentState.files.has(fileId)) {
                if (typeof window.showFilePreview === 'function') {
                  window.showFilePreview(fileId, fileType);
                } else if (typeof fileAttachmentsModule.showFilePreview === 'function') {
                  fileAttachmentsModule.showFilePreview(fileId, fileType);
                } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.showFilePreview === 'function') {
                  fileAttachmentsModule.default.showFilePreview(fileId, fileType);
                }
              }
            }
          });
        }
        
        // 3. Configurar los inputs de archivo
        ['image-upload', 'document-upload', 'code-upload'].forEach(inputId => {
          const input = document.getElementById(inputId);
          if (!input) return;
          
          input.value = ''; // Limpiar valor
          
          if (typeof removeAllEvents === 'function') {
            removeAllEvents(input, 'change');
          }
          
          const fileType = inputId.split('-')[0]; // image, document, code
          
          input.addEventListener('change', (event) => {
            if (typeof window.handleFileSelection === 'function') {
              window.handleFileSelection(event, fileType);
            } else if (typeof fileAttachmentsModule.handleFileSelection === 'function') {
              fileAttachmentsModule.handleFileSelection(event, fileType);
            } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.handleFileSelection === 'function') {
              fileAttachmentsModule.default.handleFileSelection(event, fileType);
            }
            
            const attachmentOptions = document.querySelector('.attachment-options');
            if (attachmentOptions) {
              attachmentOptions.classList.remove('show');
            }
          });
        });
        
        // 4. Inicializar el sistema completo como último paso
        if (typeof fileAttachmentsModule.initFileAttachments === 'function') {
          fileAttachmentsModule.initFileAttachments();
        } else if (fileAttachmentsModule.default && typeof fileAttachmentsModule.default.initFileAttachments === 'function') {
          fileAttachmentsModule.default.initFileAttachments();
        }
        
      }).catch(() => {
      });
      
    } catch (e) {
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
  
  /**
   * Crea el menú flotante para las opciones de audio
   */
  createAudioMenu() {
    const existingMenu = document.querySelector('.audio-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    const menu = createElement('div', {
      className: 'audio-menu'
    });
    
    menu.innerHTML = `
      <div class="audio-menu-header">
        <h3>Audio</h3>
        <button class="audio-menu-close">×</button>
      </div>
      <div class="audio-menu-content">
        <div class="audio-option record-audio">
          <i class="bx bx-microphone"></i>
          <span>Grabar audio</span>
        </div>
        <div class="audio-option upload-audio">
          <i class="bx bx-upload"></i>
          <span>Subir archivo</span>
        </div>
      </div>
      <div class="audio-recording-ui">
        <div class="recording-time">00:00</div>
        <div class="recording-controls">
          <button class="pause-recording">
            <i class="bx bx-pause-circle"></i>
            <span>Pausar</span>
          </button>
          <button class="stop-recording">
            <i class="bx bx-stop-circle"></i>
            <span>Detener</span>
          </button>
          <button class="cancel-recording">
            <i class="bx bx-x-circle"></i>
            <span>Cancelar</span>
          </button>
        </div>
        <div class="recording-status">
          <div class="recording-indicator"></div>
          <span>Grabando...</span>
        </div>
      </div>
      <div class="audio-confirmation-dialog">
        <div class="confirmation-message">¿Deseas enviar esta grabación?</div>
        <div class="confirmation-controls">
          <button class="confirm-send">
            <i class="bx bx-check"></i>
            <span>Enviar</span>
          </button>
          <button class="cancel-send">
            <i class="bx bx-x"></i>
            <span>Cancelar</span>
          </button>
        </div>
      </div>
      <input type="file" id="audio-file-input" accept="audio/*" style="display: none;">
    `;
    
    document.body.appendChild(menu);
    this.audioMenu = menu;
    
    const closeButton = menu.querySelector('.audio-menu-close');
    const recordOption = menu.querySelector('.record-audio');
    const uploadOption = menu.querySelector('.upload-audio');
    const stopRecordingButton = menu.querySelector('.stop-recording');
    const pauseRecordingButton = menu.querySelector('.pause-recording');
    const cancelRecordingButton = menu.querySelector('.cancel-recording');
    const confirmSendButton = menu.querySelector('.confirm-send');
    const cancelSendButton = menu.querySelector('.cancel-send');
    const fileInput = menu.querySelector('#audio-file-input');
    
    addEvent(closeButton, 'click', this.closeAudioMenu);
    addEvent(recordOption, 'click', this.startRecording);
    addEvent(uploadOption, 'click', this.uploadAudio);
    addEvent(stopRecordingButton, 'click', this.stopRecording);
    addEvent(pauseRecordingButton, 'click', this.pauseResumeRecording);
    addEvent(cancelRecordingButton, 'click', this.cancelRecording);
    addEvent(confirmSendButton, 'click', this.confirmSendRecording);
    addEvent(cancelSendButton, 'click', this.cancelSendRecording);
    
    addEvent(fileInput, 'change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
    
    // Estilo del menú - inicialmente oculto
    menu.style.display = 'none';
  }

  confirmSendRecording() {
    if (this.audioChunks.length === 0) {
      // NOTIFICACIÓN NECESARIA: El usuario debe saber que no hay audio
      if (window.acadelWarning) {
        window.acadelWarning(
          "🎙️ Acadel no escucha nada",
          "Parece que no se grabó audio. Mis orejas de capibara están confundidas"
        );
      }
      this.cancelSendRecording();
      return;
    }
    
    const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
    confirmationDialog.innerHTML = `
      <div class="processing-spinner"></div>
      <span>Procesando grabación...</span>
    `;
    
    this.lastRecordingState = {
      isProcessing: true,
      chunkCount: this.audioChunks.length,
      recordingTime: this.recordingTime
    };
    
    this.processRecordedAudio();
  }

  cancelSendRecording() {
    this.audioChunks = [];
    
    // Liberar recursos del micrófono (IMPORTANTE)
    this.releaseMediaResources();
    
    this.verifyResourceRelease();
    
    this.lastRecordingState = null;
    
    // Volver al menú principal
    const menuContent = this.audioMenu.querySelector('.audio-menu-content');
    const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
    
    confirmationDialog.style.display = 'none';
    menuContent.style.display = 'block';
    
    // NOTIFICACIÓN NECESARIA: Confirmar al usuario que se canceló
    if (window.acadelInfo) {
      window.acadelInfo(
        "🚫 Grabación descartada",
        "Acadel olvidó la grabación. Listo para una nueva cuando quieras"
      );
    }
  }

pauseResumeRecording() {
  if (!this.isRecording || !this.recorder) return;
  
  const pauseButton = this.audioMenu.querySelector('.pause-recording');
  const recordingStatus = this.audioMenu.querySelector('.recording-status');
  
  if (!pauseButton || !recordingStatus) return;
  
  if (!this.isPaused) {
    try {
      this.recorder.pause();
      this.isPaused = true;
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
      
      pauseButton.innerHTML = '';
      pauseButton.innerHTML = '<i class="bx bx-play-circle"></i><span>Reanudar</span>';
      
      recordingStatus.innerHTML = '';
      recordingStatus.innerHTML = `
        <div class="recording-indicator paused"></div>
        <span class="paused-text">Grabación pausada</span>
      `;
      
      removeClass(this.audioButton, 'recording');
      removeClass(this.audioButton, 'paused');
      // Pequeño delay para asegurar limpieza
      setTimeout(() => {
        addClass(this.audioButton, 'paused');
      }, 10);
      
    } catch (error) {
    }
  } else {
    try {
      this.recorder.resume();
      this.isPaused = false;
      
      this.recordingTimer = setInterval(this.updateRecordingTime, 1000);
      
      pauseButton.innerHTML = '';
      pauseButton.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pausar</span>';
      
      recordingStatus.innerHTML = '';
      recordingStatus.innerHTML = `
        <div class="recording-indicator"></div>
        <span>Grabando...</span>
      `;
      
      removeClass(this.audioButton, 'paused');
      removeClass(this.audioButton, 'recording');
      // Pequeño delay para asegurar limpieza
      setTimeout(() => {
        addClass(this.audioButton, 'recording');
      }, 10);
      
    } catch (error) {
    }
  }
  
  // Forzar reflow para asegurar que los cambios se apliquen
  if (this.audioMenu) {
    void this.audioMenu.offsetHeight;
  }
}

cancelRecording() {
  if (!this.isRecording && !this.isPaused && !this.recorder && !this.audioStream) {
    return;
  }
  
  try {
    if (this.recorder && (this.recorder.state === 'recording' || this.recorder.state === 'paused')) {
      this.recorder.stop();
    }
  } catch (e) {
  }
  
  if (this.recordingTimer) {
    clearInterval(this.recordingTimer);
    this.recordingTimer = null;
  }
  
  this.audioChunks = [];
  
  this.isRecording = false;
  this.isPaused = false;
  
  removeClass(this.audioButton, 'recording');
  removeClass(this.audioButton, 'paused');
  
  // Liberar recursos del micrófono (IMPORTANTE)
  this.releaseMediaResources();
  
  this.verifyResourceRelease();
  
  this.lastRecordingState = null;
  
  // Volver al menú principal y resetear estado visual
  const menuContent = this.audioMenu.querySelector('.audio-menu-content');
  const recordingUI = this.audioMenu.querySelector('.audio-recording-ui');
  const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
  
  if (menuContent) menuContent.style.display = 'block';
  if (recordingUI) recordingUI.style.display = 'none';
  if (confirmationDialog) confirmationDialog.style.display = 'none';
  
  const pauseButton = this.audioMenu.querySelector('.pause-recording');
  if (pauseButton) {
    pauseButton.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pausar</span>';
  }
  
  const timeDisplay = this.audioMenu.querySelector('.recording-time');
  if (timeDisplay) {
    timeDisplay.textContent = '00:00';
  }
  
  this.recordingTime = 0;
  
  // NOTIFICACIÓN NECESARIA: Informar al usuario que se canceló
  if (window.acadelInfo) {
    window.acadelInfo(
      "❌ Grabación cancelada",
      "Acadel dejó de escuchar. El micrófono está libre para una nueva grabación"
    );
  }
}

  /**
   * Método para verificar la liberación completa de los recursos
   */
verifyResourceRelease() {
  try {
    // 1. Comprobar si hay pistas activas en cualquier stream existente
    if (this.audioStream) {
      const tracks = this.audioStream.getTracks();
      if (tracks.length > 0) {
        tracks.forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
        this.audioStream = null;
      }
    }
    
    // 2. Resetear estados internos
    this.isRecording = false;
    this.isPaused = false;
    this.recordingTime = 0;
    
    // 3. Limpiar temporizador si existe
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    // 4. Limpiar clases visuales del botón principal
    if (this.audioButton) {
      removeClass(this.audioButton, 'recording');
      removeClass(this.audioButton, 'paused');
    }
    
    // 5. Resetear elementos visuales del menú si está disponible
    if (this.audioMenu) {
      const pauseButton = this.audioMenu.querySelector('.pause-recording');
      const timeDisplay = this.audioMenu.querySelector('.recording-time');
      const recordingStatus = this.audioMenu.querySelector('.recording-status');
      
      if (pauseButton) {
        pauseButton.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pausar</span>';
      }
      
      if (timeDisplay) {
        timeDisplay.textContent = '00:00';
      }
      
      if (recordingStatus) {
        recordingStatus.innerHTML = `
          <div class="recording-indicator"></div>
          <span>Grabando...</span>
        `;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

  // 5. Implementar método para liberar recursos
  releaseMediaResources() {
    // 1. Detener y limpiar el grabador si existe
    if (this.recorder) {
      try {
        if (this.recorder.state === 'recording' || this.recorder.state === 'paused') {
          this.recorder.stop();
        }
        
        try {
          this.recorder.removeEventListener('dataavailable', null);
          this.recorder.removeEventListener('stop', null);
          this.recorder.removeEventListener('error', null);
          
          // Método alternativo para eliminar todos los listeners
          const oldRecorder = this.recorder;
          this.recorder = null;
          
          // Liberar referencias para permitir recolección de basura
          oldRecorder.stream = null;
          oldRecorder.mimeType = null;
          
          // Esto ayuda en algunos navegadores a forzar la liberación
          setTimeout(() => {
            try {
              if (oldRecorder && oldRecorder.state !== 'inactive') {
                oldRecorder.stop();
              }
            } catch(e) {}
          }, 500);
          
        } catch (e) {
        }
        
        this.recorder = null;
      } catch (e) {
        this.recorder = null;
      }
    }
    
    // 2. Detener y liberar todas las pistas de audio si el stream existe
    if (this.audioStream) {
      try {
        const tracks = this.audioStream.getTracks();
        
        tracks.forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
          
          // Método agresivo para asegurar liberación
          track.enabled = false;
          track.onended = null;
          track.onmute = null;
          track.onunmute = null;
        });
        
        this.audioStream = null;
      } catch (e) {
        this.audioStream = null;
      }
    }
    
    // 3. Limpiar el estado de grabación
    this.isRecording = false;
    this.isPaused = false;
    
    // 4. Limpiar temporizador si existe
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    // 5. Resetear tiempo de grabación
    this.recordingTime = 0;
    
    // 6. Sugerir al recolector de basura que se ejecute
    try {
      if (window.gc) {
        window.gc();
      }
    } catch (e) {
      // Ignorar errores - gc no está disponible en todos los navegadores
    }
    
    return true;
  }
  
  /**
   * Muestra/oculta el menú de audio
   */
toggleAudioMenu() {
  if (this.audioMenu.style.display === 'none') {
    // LIMPIEZA PREVIA antes de mostrar
    this.cleanupMenuVisualState();
    
    // Posicionar el menú encima del botón
    const buttonRect = this.audioButton.getBoundingClientRect();
    this.audioMenu.style.bottom = (window.innerHeight - buttonRect.top + 10) + 'px';
    this.audioMenu.style.right = (window.innerWidth - buttonRect.right + buttonRect.width/2) + 'px';
    
    this.audioMenu.style.display = 'block';
    this.audioMenu.style.opacity = '0';
    this.audioMenu.style.transform = 'translateY(20px) scale(0.95)';
    
    const menuContent = this.audioMenu.querySelector('.audio-menu-content');
    const recordingUI = this.audioMenu.querySelector('.audio-recording-ui');
    const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
    
    if (menuContent) menuContent.style.display = 'none';
    if (recordingUI) recordingUI.style.display = 'none';
    if (confirmationDialog) confirmationDialog.style.display = 'none';
    
    // Pequeño delay para asegurar limpieza antes de mostrar el correcto
    setTimeout(() => {
      if (this.isRecording || this.isPaused) {
        // Hay una grabación activa o pausada, mostrar UI de grabación
        if (recordingUI) recordingUI.style.display = 'block';
        
        const pauseButton = this.audioMenu.querySelector('.pause-recording');
        const recordingStatus = this.audioMenu.querySelector('.recording-status');
        
        if (this.isPaused && pauseButton && recordingStatus) {
          pauseButton.innerHTML = '<i class="bx bx-play-circle"></i><span>Reanudar</span>';
          recordingStatus.innerHTML = `
            <div class="recording-indicator paused"></div>
            <span class="paused-text">Grabación pausada</span>
          `;
        } else if (this.isRecording && pauseButton && recordingStatus) {
          pauseButton.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pausar</span>';
          recordingStatus.innerHTML = `
            <div class="recording-indicator"></div>
            <span>Grabando...</span>
          `;
        }
        
        const timeDisplay = this.audioMenu.querySelector('.recording-time');
        if (timeDisplay) {
          const minutes = Math.floor(this.recordingTime / 60);
          const seconds = this.recordingTime % 60;
          timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
      } else if (this.lastRecordingState && this.lastRecordingState.isProcessing) {
        // Hay una grabación en proceso de confirmación
        if (confirmationDialog) confirmationDialog.style.display = 'block';
        
      } else {
        // Estado normal, mostrar menú principal
        if (menuContent) menuContent.style.display = 'block';
        
        if (this.lastRecordingState && !this.lastRecordingState.isProcessing) {
          this.releaseMediaResources();
          this.lastRecordingState = null;
        }
      }
    }, 10);
    
    setTimeout(() => {
      this.audioMenu.style.opacity = '1';
      this.audioMenu.style.transform = 'translateY(0) scale(1)';
    }, 50);
  } else {
    this.closeAudioMenu();
  }
}
  
  /**
   * Cierra el menú de audio
   */
closeAudioMenu() {
  if (!this.audioMenu) return;
  
  // Si estamos grabando (incluso pausado), preguntar al usuario
  if (this.isRecording || this.isPaused) {
    // NOTIFICACIÓN NECESARIA: El usuario debe decidir qué hacer
    if (window.acadelWarning) {
      window.acadelWarning(
        "🎙️ Acadel está grabando",
        "Hay una grabación activa. Detén o cancela la grabación antes de cerrar"
      );
    }
    return;
  }
  
  this.audioMenu.style.opacity = '0';
  this.audioMenu.style.transform = 'translateY(20px) scale(0.95)';
  
  setTimeout(() => {
    this.audioMenu.style.display = 'none';
    
    // LIMPIEZA AGRESIVA de elementos visuales
    this.cleanupMenuVisualState();
    
    if (!this.isRecording && !this.isPaused) {
      this.releaseMediaResources();
      this.verifyResourceRelease();
      
      removeClass(this.audioButton, 'recording');
      removeClass(this.audioButton, 'paused');
    }
  }, 300);
}

/**
 * Limpia agresivamente el estado visual del menú para evitar bugs visuales
 */
cleanupMenuVisualState() {
  if (!this.audioMenu) return;
  
  try {
    const elementsToClean = [
      '.pause-recording',
      '.recording-status', 
      '.recording-time',
      '.recording-indicator',
      '.audio-menu-content',
      '.audio-recording-ui',
      '.audio-confirmation-dialog'
    ];
    
    elementsToClean.forEach(selector => {
      const elements = this.audioMenu.querySelectorAll(selector);
      elements.forEach(element => {
        if (element) {
          element.classList.remove('paused', 'active', 'recording', 'visible', 'show');
          
          element.style.removeProperty('display');
          element.style.removeProperty('opacity');
          element.style.removeProperty('transform');
          element.style.removeProperty('visibility');
        }
      });
    });
    
    const pauseButton = this.audioMenu.querySelector('.pause-recording');
    if (pauseButton) {
      pauseButton.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pausar</span>';
    }
    
    const timeDisplay = this.audioMenu.querySelector('.recording-time');
    if (timeDisplay) {
      timeDisplay.textContent = '00:00';
    }
    
    const recordingStatus = this.audioMenu.querySelector('.recording-status');
    if (recordingStatus) {
      recordingStatus.innerHTML = `
        <div class="recording-indicator"></div>
        <span>Grabando...</span>
      `;
    }
    
    // Forzar reflow para aplicar cambios
    void this.audioMenu.offsetHeight;
    
  } catch (error) {
  }
}
  /**
   * Inicia la grabación de audio
   */
  async startRecording() {
    try {
      // 1. Primero, comprobar si hay una grabación activa y limpiarla
      if (this.isRecording || this.recorder) {
        this.releaseMediaResources();
        await new Promise(resolve => setTimeout(resolve, 500)); // Breve pausa para liberar recursos
      }
      
      // 2. Configuración mejorada para el grabador
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1, // Mono para mejor compatibilidad
        sampleRate: 44100 // Tasa de muestreo estándar
      };
      
      // 3. Obtener permisos y stream de audio
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: audioConstraints
        });
        this.hasPermission = true;
        
        // NOTIFICACIÓN NECESARIA: Confirmar que la grabación comenzó
        if (window.acadelExito) {
          window.acadelExito(
            "🎙️ ¡Acadel está escuchando!",
            "Micrófono activado. Habla con claridad, mis orejas de capibara están afinadas"
          );
        }
      } catch (permissionError) {
        // ERROR CAMUFLADO: Problema de permisos
        if (window.acadelError) {
          window.acadelError(
            "🔒 Micrófono bloqueado",
            "Acadel no puede acceder al micrófono. Revisa los permisos y déjame escucharte"
          );
        }
        return;
      }
      
      // 4. Determinar los formatos compatibles en este navegador - PRIORIZAR WEBM
      const formats = [
        { mimeType: 'audio/webm;codecs=opus', options: { audioBitsPerSecond: 128000 } },
        { mimeType: 'audio/webm', options: { audioBitsPerSecond: 128000 } },
        { mimeType: 'audio/ogg;codecs=opus', options: { audioBitsPerSecond: 128000 } },
        { mimeType: 'audio/ogg', options: { audioBitsPerSecond: 128000 } },
        { mimeType: 'audio/mp3' },
        { mimeType: 'audio/wav' },
        { mimeType: 'audio/mp4' },
        {}  // Formato por defecto del navegador
      ];
      
      // 5. Probar formatos hasta encontrar uno compatible
      let recorderCreated = false;
      for (const format of formats) {
        try {
          const options = { ...format.options, mimeType: format.mimeType };
          this.recorder = new MediaRecorder(this.audioStream, format.mimeType ? options : undefined);
          recorderCreated = true;
          break;
        } catch (err) {
        }
      }
      
      // 6. Verificar que se creó el grabador
      if (!recorderCreated || !this.recorder) {
        // ERROR CAMUFLADO: Navegador no compatible
        if (window.acadelError) {
          window.acadelError(
            "🦫 Acadel está confundido",
            "Tu navegador no soporta grabación de audio. Prueba con Chrome o Firefox"
          );
        }
        this.releaseMediaResources();
        return;
      }
      
      // 7. Configurar manejadores de eventos del grabador
      this.audioChunks = [];
      
      this.recorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      });
      
      this.recorder.addEventListener('error', (e) => {
        // ERROR CAMUFLADO: Error durante grabación
        if (window.acadelError) {
          window.acadelError(
            "🎙️ Acadel perdió el audio",
            "Algo interrumpió la grabación. Mis orejas de capibara se despistaron"
          );
        }
        this.releaseMediaResources();
      });
      
      this.recorder.addEventListener('stop', () => {
        // No procesamos automáticamente, esperamos confirmación
      });
      
      // 8. Hacer que el grabador capture datos cada 500ms para tener chunks más pequeños y manejables
      this.recorder.start(500);
      this.isRecording = true;
      this.isPaused = false;
      
      // 9. Mostrar UI de grabación
      const menuContent = this.audioMenu.querySelector('.audio-menu-content');
      const recordingUI = this.audioMenu.querySelector('.audio-recording-ui');
      const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
      
      menuContent.style.display = 'none';
      recordingUI.style.display = 'block';
      confirmationDialog.style.display = 'none';
      
      // 10. Iniciar temporizador
      this.recordingTime = 0;
      this.updateRecordingTime();
      this.recordingTimer = setInterval(this.updateRecordingTime, 1000);
      
      // 11. Añadir clase para efecto pulsante en el botón principal
      addClass(this.audioButton, 'recording');
      
    } catch (error) {
      // ERROR CAMUFLADO: Error general de grabación
      if (window.acadelError) {
        window.acadelError(
          "🎙️ Acadel no puede grabar",
          "Hubo un problema iniciando la grabación. Como cuando olvido dónde puse mis audífonos"
        );
      }
      this.releaseMediaResources();
    }
  }
  
  /**
   * Actualiza el temporizador de grabación
   */
  updateRecordingTime() {
    this.recordingTime++;
    const minutes = Math.floor(this.recordingTime / 60);
    const seconds = this.recordingTime % 60;
    
    const timeDisplay = this.audioMenu.querySelector('.recording-time');
    if (timeDisplay) {
      timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Limitar grabación a 100 minutos
    if (this.recordingTime >= 6000) {
      this.stopRecording();
      // NOTIFICACIÓN NECESARIA: Informar límite de tiempo
      if (window.acadelWarning) {
        window.acadelWarning(
          "⏰ Acadel necesita un descanso",
          "100 minutos de grabación es mucho para mis orejas de capibara. Terminé la grabación automáticamente"
        );
      }
    }
  }
  
  /**
   * Detiene la grabación de audio
   */
  stopRecording() {
    if (!this.isRecording || !this.recorder) return;
    
    this.lastRecordingState = {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      recordingTime: this.recordingTime,
      hasChunks: this.audioChunks.length > 0
    };
    
    try {
      this.recorder.stop();
    } catch (error) {
    }
    
    this.isRecording = false;
    this.isPaused = false;
    
    clearInterval(this.recordingTimer);
    
    removeClass(this.audioButton, 'recording');
    removeClass(this.audioButton, 'paused');
    
    // No liberar los recursos todavía, ya que podríamos necesitar los datos para enviar
    
    const recordingUI = this.audioMenu.querySelector('.audio-recording-ui');
    const confirmationDialog = this.audioMenu.querySelector('.audio-confirmation-dialog');
    
    recordingUI.style.display = 'none';
    confirmationDialog.style.display = 'block';
  }
  
  /**
   * Procesa el audio grabado y lo envía al servidor con manejo mejorado de errores
   */
  async processRecordedAudio() {
    if (!this.audioChunks || this.audioChunks.length === 0) {
      // ERROR CAMUFLADO: No hay audio para procesar
      if (window.acadelError) {
        window.acadelError(
          "🎙️ Acadel no escuchó nada",
          "No se grabó audio. Mis orejas de capibara están en silencio total"
        );
      }
      this.closeAudioMenu();
      return;
    }
    
    try {
      const totalSize = this.audioChunks.reduce((size, chunk) => size + chunk.size, 0);
      
      if (totalSize < 100) {
        // ERROR CAMUFLADO: Audio muy pequeño
        if (window.acadelWarning) {
          window.acadelWarning(
            "🎙️ Audio muy cortito",
            "La grabación es demasiado breve para procesar. Acadel necesita al menos un suspiro audible"
          );
        }
        this.closeAudioMenu();
        return;
      }
      
      const mimeType = this.recorder && this.recorder.mimeType 
        ? this.recorder.mimeType 
        : this.detectOptimalMimeType();
      
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      
      if (audioBlob.size === 0) {
        // ERROR CAMUFLADO: Blob vacío
        if (window.acadelError) {
          window.acadelError(
            "🎙️ Audio corrupto",
            "El archivo de audio está vacío. Como mi estómago antes del almuerzo"
          );
        }
        this.closeAudioMenu();
        return;
      }
      
      const extension = this.getFileExtensionFromMimeType(mimeType);
      const fileName = `grabacion_${new Date().toISOString().replace(/[:.]/g, '-')}${extension}`;
      const fileSize = audioBlob.size;
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        
        if (!base64Audio || base64Audio.length < 100) {
          // ERROR CAMUFLADO: Base64 inválido
          if (window.acadelError) {
            window.acadelError(
              "🎙️ Audio dañado",
              "La grabación se corrompió durante el procesamiento. Acadel está desconcertado"
            );
          }
          this.closeAudioMenu();
          return;
        }
        
        // Liberar recursos de grabación ANTES de cerrar el menú
        this.releaseMediaResources();
        
        this.closeAudioMenu();

        this.prepareUIAfterAudioProcessing();
        
        try {
          let chatId = getState('currentChatId');
          const userId = getState('userId');
          const herramientaId = getState('herramientaId') || 2;
          let isNewChat = false;
          
          const { createNewChat, loadChatHistory, updateChatPosition } = await import('../api/chat-agente.js');
          const { setCurrentChat } = await import('../core/state-agente.js');
          const { URL_CONFIG } = await import('../core/config-agente.js');
          const { updateHeaderForChat } = await import('../ui/header-manager-agente.js');
          const { renderChatHistory } = await import('../ui/sidebar-agente.js');
          const { clearChatMessages } = await import('../ui/ui-manager-agente.js');
          
          if (!chatId) {
            try {
              isNewChat = true;
              const chatTitle = "Transcripción de audio grabado";
              const newChat = await createNewChat(chatTitle);
              chatId = newChat.id;
              setCurrentChat(chatId);
            } catch (error) {
              // ERROR CAMUFLADO: No se pudo crear chat
              if (window.acadelError) {
                window.acadelError(
                  "💬 Acadel no puede crear chat",
                  "Hay problemas creando una conversación nueva. Como cuando se me atascan las palabras"
                );
              }
              return;
            }
          }
          
          document.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container').forEach(el => {
            if (el && el.parentNode) {
              el.remove();
            }
          });
          
          const fixedSpace = document.querySelector('.fixed-space');
          const inputBox = document.querySelector('.input-box');
          const textarea = document.querySelector('#messageInput');
          const attachmentsWrapper = document.querySelector('.attachments-wrapper');
          
          if (fixedSpace) {
            fixedSpace.style.removeProperty('opacity');
            fixedSpace.style.removeProperty('display');
            fixedSpace.style.removeProperty('pointer-events');
            fixedSpace.style.removeProperty('overflow');
            fixedSpace.style.removeProperty('visibility');
            void fixedSpace.offsetHeight;
          }
          
          if (inputBox) inputBox.style.display = '';
          if (textarea) textarea.style.display = '';
          if (attachmentsWrapper) attachmentsWrapper.style.display = '';
          
          // Si es un chat nuevo, actualizar la UI
          if (isNewChat) {
            history.pushState({}, '', URL_CONFIG.chatPath(chatId));
            clearChatMessages();
            updateHeaderForChat(chatId);
            
            try {
              const updatedChats = await loadChatHistory();
              renderChatHistory(updatedChats);
            } catch (error) {
            }
          } else {
            try {
              updateChatPosition(chatId);
            } catch (error) {
            }
          }
          
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages) {
            const { addMessageWithAttachments } = await import('../core/chat-controller-agente.js');
            
            const audioFileObj = [{
              type: 'audio',
              file: { 
                name: fileName, 
                size: fileSize,
                originalName: fileName
              },
              data: { 
                type: 'recording',
                duration: this.recordingTime,
                format: this.recorder ? this.recorder.mimeType : 'audio/webm',
                timestamp: new Date().toISOString(),
                quality: 'alta',
                source: 'grabación directa'
              }
            }];

            const audioMessage = `El audio será procesado y transcrito por el profesor Acadel...`;

            addMessageWithAttachments('user', audioMessage, audioFileObj);
          }
          
          if (!chatId || !userId) {
            // ERROR CAMUFLADO: Falta información del usuario
            if (window.acadelError) {
              window.acadelError(
                "🔍 Acadel está perdido",
                "No encuentro información del chat o usuario. Como cuando olvido dónde dejé mis anteojos"
              );
            }
            return;
          }
          
          const { showMediaProcessingLoader, hideMediaProcessingLoader } = await import('../ui/ui-manager-agente.js');
          const loaderId = await showMediaProcessingLoader(chatId, null, true);
          
          try {
            const response = await fetch('/api/audio-transcription/process-recorded-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || window.CSRF_TOKEN
              },
              body: JSON.stringify({
                userId: parseInt(userId),
                chatId,
                herramientaId: parseInt(herramientaId),
                audioData: base64Audio
              })
            });
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              throw new Error("Respuesta del servidor inválida");
            }
            
            const result = await response.json();
            
            if (!result.success) {
              throw new Error(result.error || 'Error procesando el audio');
            }
            
            if (loaderId) {
              hideMediaProcessingLoader('audio', loaderId);
            }
            
            if (result.answer) {
              const { addMessageWithAttachments } = await import('../core/chat-controller-agente.js');
              
              const aiMessageDiv = document.createElement('div');
              aiMessageDiv.className = 'message ai-message';
              
              const aiProfile = document.createElement('div');
              aiProfile.className = 'ai-profile';
              const profileImg = document.createElement('img');
              profileImg.src = window.APP_CONFIG?.assistantImagePath || './assets/img/ava-profile.png';
              profileImg.alt = 'Perfil IA';
              aiProfile.appendChild(profileImg);
              
              const contentElem = document.createElement('div');
              contentElem.className = 'message-content';
              
              const { parseMarkdownToHTML } = await import('../utils/markdown-agente.js');
              contentElem.innerHTML = parseMarkdownToHTML(result.answer);
              
              aiMessageDiv.appendChild(aiProfile);
              aiMessageDiv.appendChild(contentElem);
              
              chatMessages.appendChild(aiMessageDiv);
              
              // Scroll al final
              setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }, 100);
              
              // NOTIFICACIÓN NECESARIA: Confirmar éxito al usuario
              if (window.acadelExito) {
                window.acadelExito(
                  "🎧 ¡Audio procesado!",
                  "Acadel terminó de escuchar y analizar tu grabación. Ya puedes preguntarme sobre el contenido"
                );
              }
            }
            
            this.audioButton.style.display = 'none';
            
            import('../core/event-bus-agente.js').then(module => {
              if (module.default && typeof module.default.emit === 'function') {
                module.default.emit('audio:processed', { chatId });
              }
            });
            
            import('../components/youtube-panel.js').then(module => {
              if (module.youtubePanel && typeof module.youtubePanel.checkForVideo === 'function') {
                module.youtubePanel.checkForVideo();
              }
            });
            
          } catch (error) {
            if (loaderId) {
              hideMediaProcessingLoader('audio', loaderId);
            }
            
            // ERROR CAMUFLADO: Error del servidor
            if (window.acadelError) {
              window.acadelError(
                "🌐 Acadel perdió conexión",
                "Hubo un problema procesando el audio en mis servidores. Como cuando se me corta el internet"
              );
            }
            
            this.audioButton.style.display = 'flex';
          }
        } catch (error) {
          // ERROR CAMUFLADO: Error general
          if (window.acadelError) {
            window.acadelError(
              "🦫 Acadel está confundido",
              "Algo inesperado pasó procesando la grabación. Mi cerebro de capibara se trabó"
            );
          }
        }
      };
    } catch (error) {
      // ERROR CAMUFLADO: Error general de procesamiento
      if (window.acadelError) {
        window.acadelError(
          "🎙️ Audio problemático",
          "Hubo un error procesando la grabación. Como cuando se me enredan los cables"
        );
      }
      this.closeAudioMenu();
    }
  }

/**
 * Método para detectar el MIME type más compatible
 */
detectOptimalMimeType() {
  const safeTypes = [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav', 
    'audio/mp4',
    'audio/webm',
    'audio/ogg'
  ];
  
  // Probar cada tipo para ver si el navegador lo soporta
  for (const type of safeTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch (e) {
      // Ignorar errores y continuar probando
    }
  }
  
  // Tipo por defecto en caso de no encontrar uno compatible
  return 'audio/mp3';
}

/**
 * Obtiene la extensión de archivo correcta basada en el MIME type
 */
getFileExtensionFromMimeType(mimeType) {
  if (!mimeType) return '.mp3'; // Por defecto
  
  const mimeMap = {
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/aac': '.aac',
    'audio/flac': '.flac'
  };
  
  if (mimeMap[mimeType]) {
    return mimeMap[mimeType];
  }
  
  // Si no hay coincidencia exacta, buscar coincidencia parcial
  for (const [key, value] of Object.entries(mimeMap)) {
    if (mimeType.includes(key.split('/')[1])) {
      return value;
    }
  }
  
  // Si todo falla, usar .mp3 como fallback seguro
  return '.mp3';
}

  
  /**
   * Abre el diálogo para seleccionar un archivo de audio
   */
  uploadAudio() {
    const fileInput = this.audioMenu.querySelector('#audio-file-input');
    if (fileInput) {
      fileInput.click();
    }
  }
  
/**
 * Procesa el archivo de audio seleccionado con manejo mejorado de errores
 */
async handleFileUpload(file) {
  // Validaciones existentes...
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac', 'audio/m4a'];
  
  if (!validTypes.includes(file.type)) {
    // ERROR CAMUFLADO: Formato no soportado
    if (window.acadelWarning) {
      window.acadelWarning(
        "🎵 Formato extraño",
        "Acadel no reconoce este tipo de audio. Usa MP3, WAV, OGG o similares"
      );
    }
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    // ERROR CAMUFLADO: Archivo muy grande
    if (window.acadelWarning) {
      window.acadelWarning(
        "🐘 Archivo gigante",
        "El archivo es muy pesado para mis servidores. Máximo 50MB por favor"
      );
    }
    return;
  }
  
  this.closeAudioMenu();
  
  try {
    let chatId = getState('currentChatId');
    const userId = getState('userId');
    const herramientaId = getState('herramientaId') || 2;
    let isNewChat = false;
    
    const { createNewChat, loadChatHistory, updateChatPosition } = await import('../api/chat-agente.js');
    const { setCurrentChat } = await import('../core/state-agente.js');
    const { URL_CONFIG } = await import('../core/config-agente.js');
    const { updateHeaderForChat } = await import('../ui/header-manager-agente.js');
    const { renderChatHistory } = await import('../ui/sidebar-agente.js');
    const { clearChatMessages } = await import('../ui/ui-manager-agente.js');
    
    if (!chatId) {
      try {
        isNewChat = true;
        const chatTitle = "Transcripción de audio";
        const newChat = await createNewChat(chatTitle);
        chatId = newChat.id;
        setCurrentChat(chatId);
      } catch (error) {
        // ERROR CAMUFLADO: No se pudo crear chat
        if (window.acadelError) {
          window.acadelError(
            "💬 Acadel no puede crear chat",
            "Problemas creando conversación nueva. Como cuando se me traba la lengua"
          );
        }
        return;
      }
    }
    
    this.prepareUIAfterAudioProcessing();
    
    const fixedSpace = document.querySelector('.fixed-space');
    const inputBox = document.querySelector('.input-box');
    const textarea = document.querySelector('#messageInput');
    const attachmentsWrapper = document.querySelector('.attachments-wrapper');
    
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('display');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('overflow');
      fixedSpace.style.removeProperty('visibility');
      void fixedSpace.offsetHeight;
    }
    
    if (inputBox) inputBox.style.display = '';
    if (textarea) textarea.style.display = '';
    if (attachmentsWrapper) attachmentsWrapper.style.display = '';
    
    // Si es un chat nuevo, actualizar la UI
    if (isNewChat) {
      history.pushState({}, '', URL_CONFIG.chatPath(chatId));
      clearChatMessages();
      updateHeaderForChat(chatId);
      
      try {
        const updatedChats = await loadChatHistory();
        renderChatHistory(updatedChats);
      } catch (error) {
      }
    } else {
      try {
        updateChatPosition(chatId);
      } catch (error) {
      }
    }
    
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      const { addMessageWithAttachments } = await import('../core/chat-controller-agente.js');
      
      const audioFileObj = [{
        type: 'audio',
        file: { 
          name: file.name, 
          size: file.size,
          originalName: file.name
        },
        data: { 
          type: 'upload',
          format: file.type,
          timestamp: new Date().toISOString(),
          lastModified: new Date(file.lastModified).toISOString(),
          source: 'archivo subido'
        }
      }];

      let durationText = 'No disponible';
      try {
        const audioElement = document.createElement('audio');
        audioElement.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          audioElement.addEventListener('loadedmetadata', () => {
            if (audioElement.duration && audioElement.duration !== Infinity) {
              const duration = Math.floor(audioElement.duration);
              durationText = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} min`;
            }
            URL.revokeObjectURL(audioElement.src);
            resolve();
          });
          audioElement.addEventListener('error', () => {
            URL.revokeObjectURL(audioElement.src);
            resolve();
          });
        });
      } catch (e) {
      }

      const audioMessage = `El audio será procesado y transcrito por el profesor Acadel...`;

      addMessageWithAttachments('user', audioMessage, audioFileObj);
    }
    
    const formData = new FormData();
    formData.append('audioFile', file);
    formData.append('chatId', chatId);
    formData.append('userId', parseInt(userId));
    formData.append('herramientaId', parseInt(herramientaId));
    
    const { showMediaProcessingLoader, hideMediaProcessingLoader } = await import('../ui/ui-manager-agente.js');
    const loaderId = await showMediaProcessingLoader(chatId, null, true);
    
    try {
      const response = await fetch('/api/audio-transcription/process-audio-file', {
        method: 'POST',
        body: formData
      });
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respuesta del servidor inválida");
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error procesando el archivo de audio');
      }
      
      if (loaderId) {
        hideMediaProcessingLoader('audio', loaderId);
      }
      
      if (result.answer) {
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message';
        
        const aiProfile = document.createElement('div');
        aiProfile.className = 'ai-profile';
        const profileImg = document.createElement('img');
        profileImg.src = window.APP_CONFIG?.assistantImagePath || './assets/img/ava-profile.png';
        profileImg.alt = 'Perfil IA';
        aiProfile.appendChild(profileImg);
        
        const contentElem = document.createElement('div');
        contentElem.className = 'message-content';
        
        const { parseMarkdownToHTML } = await import('../utils/markdown-agente.js');
        contentElem.innerHTML = parseMarkdownToHTML(result.answer);
        
        aiMessageDiv.appendChild(aiProfile);
        aiMessageDiv.appendChild(contentElem);
        
        chatMessages.appendChild(aiMessageDiv);
        
        // Scroll al final
        setTimeout(() => {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
        
        // NOTIFICACIÓN NECESARIA: Confirmar éxito
        if (window.acadelExito) {
          window.acadelExito(
            "📁 ¡Archivo procesado!",
            "Acadel analizó tu archivo de audio completamente. Ya puedes preguntarme sobre su contenido"
          );
        }
      }
      
      this.audioButton.style.display = 'none';
      
      import('../core/event-bus-agente.js').then(module => {
        if (module.default && typeof module.default.emit === 'function') {
          module.default.emit('audio:processed', { chatId });
        }
      });
      
      import('../components/youtube-panel.js').then(module => {
        if (module.youtubePanel && typeof module.youtubePanel.checkForVideo === 'function') {
          module.youtubePanel.checkForVideo();
        }
      });
      
    } catch (error) {
      if (loaderId) {
        hideMediaProcessingLoader('audio', loaderId);
      }
      
      // ERROR CAMUFLADO: Error del servidor
      if (window.acadelError) {
        window.acadelError(
          "🌐 Acadel perdió conexión",
          "Problemas procesando el archivo en mis servidores. Como cuando se me corta el wifi"
        );
      }
      
      this.audioButton.style.display = 'flex';
    }
  } catch (error) {
    // ERROR CAMUFLADO: Error general
    if (window.acadelError) {
      window.acadelError(
        "📁 Archivo problemático",
        "Hubo un error procesando el archivo. Como cuando no encuentro mis llaves"
      );
    }
  }
}
  
  /**
 * Verifica si hay un audio en el chat actual
 */
  async checkForAudio() {
    const chatId = getState('currentChatId');
    if (!chatId) return;
    
    this.currentChatId = chatId;
    
    try {
      if (typeof window.buttonUpdater !== 'undefined' && window.buttonUpdater) {
        window.buttonUpdater.updateButtons();
        return;
      }
      
      
      // Primero verificar si hay un video de YouTube (prioridad sobre audio)
      const videoResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-video`);
      const videoData = await videoResponse.json();
      
      if (videoData.success && videoData.hasVideo) {
        // Hay un video, ocultar botón de audio
        if (this.audioButton) {
          this.audioButton.style.display = 'none';
        }
        return;
      }
      
      const transcriptionResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-transcription`);
      const transcriptionData = await transcriptionResponse.json();
      
      // Si hay transcripciones, verificar específicamente si son de audio
      if (transcriptionData.success && transcriptionData.hasTranscription) {
        const audioResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-audio`);
        const audioData = await audioResponse.json();
        
        if (audioData.success && audioData.hasAudio) {
          // Hay audio transcrito, ocultar botón de audio
          if (this.audioButton) {
            this.audioButton.style.display = 'none';
          }
          return;
        }
      }
      
      const audioProcessingChat = localStorage.getItem('audioProcessingChat');
      if (audioProcessingChat === chatId) {
        // Hay procesamiento de audio, ocultar botón de audio
        if (this.audioButton) {
          this.audioButton.style.display = 'none';
        }
        return;
      }
      
      // Si no hay transcripciones, no hay video, y no hay procesamiento, mostrar el botón
      if (this.audioButton) {
        this.audioButton.style.display = 'flex';
      }
    } catch (error) {
      if (this.audioButton) {
        this.audioButton.style.display = 'flex';
      }
    }
  }

  /**
   * Reinicia completamente el panel de audio para permitir nuevas grabaciones/subidas
   */
  resetPanel() {
    // 1. Liberar recursos de grabación
    this.releaseMediaResources();
    
    // 2. Verificar liberación
    this.verifyResourceRelease();
    
    // 3. Reiniciar estado interno
    this.isVisible = false;
    this.isRecording = false;
    this.isPaused = false;
    this.hasPermission = false;
    this.recorder = null;
    this.audioChunks = [];
    this.recordingTimer = null;
    this.recordingTime = 0;
    this.audioStream = null;
    this.lastRecordingState = null;
    
    // 4. Cerrar el menú de audio si está abierto
    if (this.audioMenu && this.audioMenu.style.display !== 'none') {
      this.closeAudioMenu();
    }
    
    // 5. Asegurarse de que el botón de audio está visible
    if (this.audioButton) {
      // Solo mostrarlo si no hay transcripciones existentes
      const chatId = getState('currentChatId');
      if (chatId) {
        if (window.buttonUpdater && typeof window.buttonUpdater.updateButtons === 'function') {
          window.buttonUpdater.updateButtons(true);
        } else {
          // De lo contrario, verificar transcripciones directamente
          this.checkForAudio();
        }
      } else {
        // Si no hay chat activo, ocultar el botón
        this.audioButton.style.display = 'none';
      }
    }
    
    // 6. Limpiar el input de archivo
    const fileInput = document.getElementById('audio-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
    
    // 7. Reiniciar menú flotante
    this.recreateAudioMenu();
  }

  /**
   * Recrea el menú flotante para asegurar que esté limpio de eventos antiguos
   */
  recreateAudioMenu() {
    const oldMenu = this.audioMenu;
    const wasVisible = oldMenu && oldMenu.style.display !== 'none';
    
    this.createAudioMenu();
    
    // Si el menú estaba visible, asegurarse de que siga oculto
    if (!wasVisible && this.audioMenu) {
      this.audioMenu.style.display = 'none';
    }
  }

  /**
   * Permite actualizar explícitamente el estado del botón desde fuera
   */
  updateButtonState() {
    if (typeof window.buttonUpdater !== 'undefined' && window.buttonUpdater) {
      window.buttonUpdater.updateButtons(true);
    } else {
      // De lo contrario, usar el método propio
      this.checkForAudio();
    }
  }
  
  /**
   * Fuerza la visualización del botón de audio
   */
  forceShowButton() {
    if (this.audioButton) {
      this.audioButton.style.display = 'flex';
      // Destacar temporalmente para hacerlo evidente
      this.audioButton.style.transform = 'scale(1.1)';
      setTimeout(() => {
        this.audioButton.style.transform = '';
      }, 1000);
    }
  }
}

export const audioPanel = new AudioPanel();

export default audioPanel;