/**
 * TranscriptionButtonUpdater.js - Sistema centralizado para gestionar la visibilidad de botones de transcripción
 * OPTIMIZADO: Con notificaciones Acadel solo cuando son necesarias para el usuario
 */

import { getState } from '../core/state-agente.js';
import eventBus from '../core/event-bus-agente.js';

/**
 * Clase que gestiona la visibilidad de los botones de transcripción
 */
class TranscriptionButtonUpdater {
  constructor() {
    this.youtubePanel = null;
    this.audioPanel = null;
    this.initialized = false;
    this.updateInProgress = false;
    this.currentChatId = null;
    
    // Enlazar métodos para mantener el contexto
    this.initialize = this.initialize.bind(this);
    this.updateButtons = this.updateButtons.bind(this);
    this.onTranscriptionCompleted = this.onTranscriptionCompleted.bind(this);
    this.onChatChanged = this.onChatChanged.bind(this);
  }
  
  /**
   * Inicializa el sistema de actualización de botones
   * @param {Object} youtubePanel - Referencia al panel de YouTube
   * @param {Object} audioPanel - Referencia al panel de audio
   */
  initialize(youtubePanel, audioPanel) {
    if (this.initialized) return;
    
    this.youtubePanel = youtubePanel;
    this.audioPanel = audioPanel;
    this.currentChatId = getState('currentChatId');
    
    // Suscribirse a eventos relevantes
    this.setupEventListeners();
    
    this.initialized = true;
    
    // Actualización inicial
    this.updateButtons();
  }
  
  /**
   * Configura los listeners de eventos
   */
  setupEventListeners() {
    // Evento cuando se completa una transcripción
    eventBus.on('transcription:completed', this.onTranscriptionCompleted);
    
    // Evento cuando se procesa un audio
    eventBus.on('audio:processed', this.onTranscriptionCompleted);
    
    // Evento cuando se cancela una transcripción
    eventBus.on('transcription:cancelled', this.onTranscriptionCancelled);
    eventBus.on('media:processing:cancelled', this.onTranscriptionCancelled);
    
    // Evento cuando se cambia de chat
    eventBus.on('chat:changed', this.onChatChanged);
    
    // Evento cuando se cargan mensajes
    eventBus.on('messages:loaded', () => {
      // Verificar si el chat ha cambiado
      const chatId = getState('currentChatId');
      if (chatId && chatId !== this.currentChatId) {
        this.currentChatId = chatId;
        this.updateButtons();
      }
    });
  }

  /**
   * Método para reiniciar el panel de audio
   */
  resetAudioPanel() {
    try {
      if (this.audioPanel && typeof this.audioPanel.resetPanel === 'function') {
        this.audioPanel.resetPanel();
      } else if (window.audioPanel && typeof window.audioPanel.resetPanel === 'function') {
        window.audioPanel.resetPanel();
      } else {
        // Intento alternativo: reiniciar manualmente
        if (this.audioPanel || window.audioPanel) {
          const panel = this.audioPanel || window.audioPanel;
          
          if (typeof panel.releaseMediaResources === 'function') {
            panel.releaseMediaResources();
          }
          
          if (typeof panel.verifyResourceRelease === 'function') {
            panel.verifyResourceRelease();
          }
          
          // Reiniciar propiedades básicas
          panel.isRecording = false;
          panel.isPaused = false;
          panel.recorder = null;
          panel.audioChunks = [];
          
          // Cerrar menú si está abierto
          if (typeof panel.closeAudioMenu === 'function') {
            panel.closeAudioMenu();
          }
        }
      }
    } catch (error) {
      // SILENCIOSO: No notificar errores técnicos internos
    }
  }

  /**
   * Maneja el evento de cancelación de transcripción
   * @param {Object} data - Datos del evento
   */
  onTranscriptionCancelled(data) {
    // Reiniciar el panel de audio para permitir nuevas grabaciones
    this.resetAudioPanel();
    
    // Forzar actualización inmediata
    this.updateButtons(true);
    
    // Programar una segunda actualización para asegurar consistencia
    setTimeout(() => {
      this.updateButtons(true);
    }, 1000);
  }
  
  /**
   * Maneja el evento de cambio de chat
   * @param {Object} data - Datos del evento
   */
  onChatChanged(data) {
    // Actualizar el chatId actual
    const newChatId = data?.chatId || getState('currentChatId');
    if (newChatId !== this.currentChatId) {
      this.currentChatId = newChatId;
      
      // Programar la actualización de botones con un pequeño retraso
      // para asegurar que los datos del chat estén cargados
      setTimeout(() => {
        this.updateButtons();
      }, 300);
    }
  }
  
  /**
   * Maneja el evento de transcripción completada
   * @param {Object} data - Datos del evento
   */
  onTranscriptionCompleted(data) {
    // NOTIFICACIÓN NECESARIA: Informar al usuario que la transcripción está lista
    if (window.acadelExito) {
      window.acadelExito(
        "🎬 ¡Transcripción lista!",
        "Acadel terminó de procesar tu contenido. Ya puedes consultarme sobre él"
      );
    }
    
    // Reiniciar el panel de audio para permitir nuevas grabaciones
    this.resetAudioPanel();
    
    // Forzar actualización inmediata
    this.updateButtons(true);
    
    // Programar una segunda actualización después de un breve retraso
    setTimeout(() => {
      this.updateButtons(true);
    }, 1000);
  }
  
  /**
   * Actualiza la visibilidad de los botones basándose en el estado actual
   * @param {boolean} force - Forzar actualización incluso si hay una en progreso
   * @returns {Promise<boolean>} - Promesa que se resuelve con true si se actualizaron los botones
   */
  async updateButtons(force = false) {
    // Evitar actualizaciones concurrentes a menos que se fuerce
    if (this.updateInProgress && !force) {
      return false;
    }
    
    this.updateInProgress = true;
    
    try {
      // Obtener el chat actual
      const chatId = getState('currentChatId');
      if (!chatId) {
        // Si no hay chat activo, ocultar todos los botones
        this.hideAllButtons();
        return true;
      }
      
      // Actualizar el chatId actual
      this.currentChatId = chatId;
      
      // 1. Verificar si hay alguna transcripción completada (general)
      const transcriptionResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-transcription`);
      const transcriptionData = await transcriptionResponse.json();
      
      if (transcriptionData.success && transcriptionData.hasTranscription) {
        // Hay transcripciones - verificar el tipo específico
        
        // 2. Verificar si es un video de YouTube
        const videoResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-video`);
        const videoData = await videoResponse.json();
        
        if (videoData.success && videoData.hasVideo) {
          // Es un video de YouTube: mostrar botón de YouTube y ocultar botón de audio
          this.showYouTubeButton('youtube');
          this.hideAudioButton();
          return true;
        }
        
        // 3. Verificar si es un audio
        const audioResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-audio`);
        const audioData = await audioResponse.json();
        
        if (audioData.success && audioData.hasAudio) {
          // Es un audio: mostrar botón de YouTube (con icono de audio) y ocultar botón de audio
          this.showYouTubeButton('audio');
          this.hideAudioButton();
          return true;
        }
        
        // Si llegamos aquí, hay transcripción pero no es ni video ni audio (caso raro)
        // En este caso inusual, mantenemos oculto el botón de YouTube y mostramos el de audio
        this.hideYouTubeButton();
        this.showAudioButton();
      } else {
        // No hay transcripciones
        // Ocultar botón de YouTube y mostrar botón de audio
        this.hideYouTubeButton();
        this.showAudioButton();
      }
      
      // 4. Verificar si hay un procesamiento en curso
      this.checkForOngoingProcessing();
      
      return true;
    } catch (error) {
      // SILENCIOSO: No mostrar errores técnicos al usuario
      // En caso de error, mantener estado seguro: ocultar YouTube y mostrar audio
      this.hideYouTubeButton();
      this.showAudioButton();
      
      return false;
    } finally {
      this.updateInProgress = false;
    }
  }
  
  /**
   * Verifica si hay algún procesamiento en curso
   */
  async checkForOngoingProcessing() {
    const chatId = this.currentChatId;
    if (!chatId) return;
    
    try {
      // Verificar procesamiento de YouTube
      const youtubeProcessingChat = localStorage.getItem('youtubeProcessingChat');
      if (youtubeProcessingChat === chatId) {
        this.hideAudioButton();
        return;
      }
      
      // Verificar procesamiento de audio
      const audioProcessingChat = localStorage.getItem('audioProcessingChat');
      if (audioProcessingChat === chatId) {
        this.hideAudioButton();
        return;
      }
    } catch (error) {
      // SILENCIOSO: No notificar errores internos
    }
  }
  
  /**
   * Muestra el botón de YouTube con el modo adecuado
   * @param {string} mode - Modo de visualización ('youtube' o 'audio')
   */
  showYouTubeButton(mode) {
    if (!this.youtubePanel || !this.youtubePanel.triggerButton) return;
    
    const button = this.youtubePanel.triggerButton;
    button.style.display = 'flex';
    
    // Configurar el botón según el modo
    if (mode === 'audio') {
      button.innerHTML = '<i class="bx bx-headphone"></i>';
      button.setAttribute('title', 'Ver transcripción de audio');
    } else {
      button.innerHTML = '<i class="bx bxl-youtube"></i>';
      button.setAttribute('title', 'Ver transcripción de video');
    }
    
    // Actualizar el modo en el youtubePanel
    this.youtubePanel.currentMode = mode;
    this.youtubePanel.currentChatId = this.currentChatId;
  }
  
  /**
   * Oculta el botón de YouTube
   */
  hideYouTubeButton() {
    if (!this.youtubePanel || !this.youtubePanel.triggerButton) return;
    
    this.youtubePanel.triggerButton.style.display = 'none';
  }
  
  /**
   * Muestra el botón de audio
   */
  showAudioButton() {
    if (!this.audioPanel || !this.audioPanel.audioButton) return;
    
    this.audioPanel.audioButton.style.display = 'flex';
  }
  
  /**
   * Oculta el botón de audio
   */
  hideAudioButton() {
    if (!this.audioPanel || !this.audioPanel.audioButton) return;
    
    this.audioPanel.audioButton.style.display = 'none';
  }
  
  /**
   * Oculta todos los botones
   */
  hideAllButtons() {
    this.hideYouTubeButton();
    this.hideAudioButton();
  }
}

// Crear instancia única
const buttonUpdater = new TranscriptionButtonUpdater();

// Exportar instancia
export default buttonUpdater;