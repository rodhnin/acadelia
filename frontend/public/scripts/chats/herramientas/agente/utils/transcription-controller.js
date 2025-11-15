/**
 * transcription-controller.js - Controlador unificado para transcripciones (YouTube y audio)
 * OPTIMIZADO: Con notificaciones Acadel solo cuando son necesarias para el usuario
 */
import { youtubePanel } from '../components/youtube-panel.js';
import { audioPanel } from '../components/audio-panel.js';
import eventBus from '../core/event-bus-agente.js';
import { getState } from '../core/state-agente.js';
import { 
  checkYouTubeProcessingStatus,
  checkAudioProcessingStatus,
  showMediaProcessingLoader
} from '../ui/ui-manager-agente.js';
import { clearManagedTimeouts } from '../../../shared/dom-helpers.js';
import buttonUpdater from './TranscriptionButtonUpdater.js';

// Variable para registro de estado
let currentChatId = null;
let isPanelVisible = false;
let isInitialized = false;

/**
 * Detecta si el texto es una URL de YouTube y muestra el loader
 * @param {string} text - Texto a analizar
 * @param {string} chatId - ID del chat actual
 * @returns {boolean} - true si es una URL de YouTube
 */
export function processYouTubeURLWithLoading(text, chatId) {
  if (isValidYouTubeUrl(text)) {
    // NOTIFICACIÓN NECESARIA: Informar al usuario que se está procesando
    if (window.acadelLoading) {
      window.acadelLoading(
        "🎬 Procesando video...",
        "Acadel está analizando tu video de YouTube. Su cerebro de capibara funciona a toda velocidad"
      );
    }
    
    showMediaProcessingLoader(chatId, text, false);
    
    startProcessingCheck(chatId, false);
    
    return true;
  }
  
  return false;
}

/**
 * Detecta si se está subiendo un archivo de audio y muestra el loader
 * @param {File} file - Archivo de audio
 * @param {string} chatId - ID del chat actual
 * @returns {boolean} - true si es un archivo de audio válido
 */
export function processAudioFileWithLoading(file, chatId) {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac', 'audio/m4a'];
  
  if (file && validTypes.includes(file.type)) {
    // NOTIFICACIÓN NECESARIA: Informar al usuario que se está procesando
    if (window.acadelLoading) {
      window.acadelLoading(
        "🎙️ Procesando audio...",
        "Acadel está escuchando tu audio con sus orejas de capibara perfectamente afinadas"
      );
    }
    
    showMediaProcessingLoader(chatId, null, true);
    
    startProcessingCheck(chatId, true);
    
    return true;
  }
  
  return false;
}

/**
 * Función auxiliar para verificar si es una URL de YouTube válida
 * @param {string} url - URL a verificar
 * @returns {boolean} - true si es una URL de YouTube válida
 */
function isValidYouTubeUrl(url) {
  // Expresión regular para validar URLs de YouTube
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return youtubeRegex.test(url);
}

/**
 * Verifica si hay procesamiento de transcripción en curso y muestra el loader si es necesario
 */
export function checkForOngoingProcessing() {
  const chatId = getState('currentChatId');
  if (chatId) {
    checkYouTubeProcessingStatus(chatId);
    
    checkAudioProcessingStatus(chatId);
  }
}

/**
 * Inicializa el sistema de transcripción
 * @returns {Promise} - Promesa que se resuelve cuando el sistema está inicializado
 */
export async function initTranscriptionSystem() {
  try {
    // Evitar inicialización múltiple
    if (isInitialized) return true;
    
    youtubePanel.init();
    
    audioPanel.init();
    
    buttonUpdater.initialize(youtubePanel, audioPanel);
    
    window.youtubePanel = youtubePanel;
    window.audioPanel = audioPanel;
    window.buttonUpdater = buttonUpdater;
    window.transcriptionController = {
      checkCurrentChatForTranscriptions,
      toggleTranscriptionPanel,
      refreshTranscriptionButtons,
      cleanupTranscriptionSystem
    };
    
    setTimeout(() => {
      const chatId = getState('currentChatId');
      if (chatId) {
        buttonUpdater.updateButtons();
      }
    }, 1000);
    
    setupEventListeners();
    
    eventBus.emit('transcription:initialized', { success: true });
    
    isInitialized = true;
    return true;
  } catch (error) {
    // ERROR CAMUFLADO: No exponer el sistema, usar personalidad Acadel
    if (window.acadelWarning) {
      window.acadelWarning(
        "🦫 Acadel está confundido",
        "El sistema de transcripciones se trabó como mis patas en el lodo. Recarga la página y lo intentamos de nuevo"
      );
    }
    
    eventBus.emit('transcription:initialized', { success: false, error });
    return false;
  }
}

/**
 * Configura los escuchadores de eventos para transcripciones
 */
function setupEventListeners() {
  // Eventos de cambio de chat
  eventBus.on('chat:changed', (data) => {
    clearManagedTimeouts('transcription-notification');
    
    closeAllPanels();
  });
  
  // Evento cuando se completa una transcripción
  eventBus.on('media:processing:completed', (data) => {
    eventBus.emit('transcription:completed', data);
    
    setTimeout(() => {
      if (data.mediaType === 'youtube') {
        youtubePanel.checkForVideo();
      } else {
        youtubePanel.checkForVideo(); // Reutilizamos el panel para audio también
      }
    }, 500);
  });
  
  // Listener para cambios directos de estado para el chatId
  const originalSetCurrentChat = window.setCurrentChat;
  if (typeof originalSetCurrentChat === 'function') {
    window.setCurrentChat = function(chatId) {
      const oldChatId = getState('currentChatId');
      const result = originalSetCurrentChat.apply(this, arguments);
      
      // Si el chatId cambió, manejar el cambio
      if (chatId !== oldChatId) {
        closeAllPanels();
        
        setTimeout(() => {
          currentChatId = chatId;
          if (chatId) {
            buttonUpdater.updateButtons();
          }
        }, 300);
      }
      
      return result;
    };
  }
}

/**
 * Cierra todos los paneles de transcripción abiertos
 */
function closeAllPanels() {
  if (youtubePanel && youtubePanel.isVisible) {
    youtubePanel.togglePanel();
  }
  
  if (audioPanel) {
    const audioMenu = document.querySelector('.audio-menu');
    if (audioMenu && audioMenu.style.display === 'block') {
      audioPanel.closeAudioMenu();
    }
  }
  
  const selectionActions = document.querySelector('.youtube-selection-actions');
  if (selectionActions && selectionActions.classList.contains('visible')) {
    selectionActions.classList.remove('visible');
  }
  
  isPanelVisible = false;
}

/**
 * Verifica si el chat actual tiene transcripciones y muestra la interfaz adecuada
 * @param {boolean} forceReload - Forzar recarga de los datos del panel
 * @returns {Promise<boolean>} - Promesa que se resuelve con true si hay transcripciones
 */
export async function checkCurrentChatForTranscriptions(forceReload = false) {
  return buttonUpdater.updateButtons(forceReload);
}

/**
 * Muestra u oculta el panel de transcripción
 * @returns {boolean} - true si el panel está visible, false si no
 */
export function toggleTranscriptionPanel() {
  youtubePanel.togglePanel();
  isPanelVisible = youtubePanel.isVisible;
  return isPanelVisible;
}

/**
 * Comprueba y muestra el botón adecuado según el contenido del chat
 * Útil cuando se cambia a un chat o se carga uno nuevo
 */
export function refreshTranscriptionButtons() {
  buttonUpdater.updateButtons(true);
}

/**
 * Limpia los recursos del sistema de transcripción
 */
export function cleanupTranscriptionSystem() {
  closeAllPanels();
  
  const youtubeButton = document.querySelector('.youtube-panel-trigger');
  if (youtubeButton) youtubeButton.remove();
  
  const youtubePanelContainer = document.querySelector('.youtube-panel-container');
  if (youtubePanelContainer) youtubePanelContainer.remove();
  
  const audioButton = document.querySelector('.audio-panel-trigger');
  if (audioButton) audioButton.remove();
  
  const audioMenu = document.querySelector('.audio-menu');
  if (audioMenu) audioMenu.remove();
  
  const selectionActions = document.querySelector('.youtube-selection-actions');
  if (selectionActions) selectionActions.remove();
  
  document.removeEventListener('mouseup', youtubePanel?.handleSelectionChange);
  
  clearManagedTimeouts('transcription-notification');
  
  // Reiniciar flags
  isInitialized = false;
  currentChatId = null;
  isPanelVisible = false;
}

/**
 * Inicia verificación periódica del estado de procesamiento
 * @param {string} chatId - ID del chat
 * @param {boolean} isAudio - Indica si es audio
 */
function startProcessingCheck(chatId, isAudio = false) {
  if (chatId) {
    import('../ui/ui-manager-agente.js').then(module => {
      if (typeof module.startProcessingCheck === 'function') {
        module.startProcessingCheck(chatId, isAudio);
      }
    }).catch(() => {
    });
  }
}

export default {
  initTranscriptionSystem,
  checkCurrentChatForTranscriptions,
  toggleTranscriptionPanel,
  refreshTranscriptionButtons,
  cleanupTranscriptionSystem,
  processYouTubeURLWithLoading,
  checkForOngoingProcessing
};