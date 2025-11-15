/**
 * youtube-panel.js - Componente optimizado para mostrar y controlar transcripciones de YouTube y audio
 * OPTIMIZADO: Con notificaciones Acadel solo cuando son necesarias para el usuario
 */
import { DOM_SELECTORS } from '../core/config-agente.js';
import { getState } from '../core/state-agente.js';
import { 
  createElement, 
  setManagedTimeout, 
  addClass, 
  removeClass, 
  clearElement, 
  addEvent,
  removeEvent 
} from '../../../shared/dom-helpers.js';
import { copyToClipboard } from '../utils/clipboard-agente.js';

// Clase principal para el panel de transcripciones
export class YouTubePanel {
    constructor() {
        this.isVisible = false;
        this.videoData = null;
        this.audioData = null;
        this.player = null;
        this.ytPlayer = null; // Instancia del YouTube Player API
        this.audioPlayer = null; // Elemento de audio para transcripciones de audio
        this.currentChatId = null;
        this.currentTimeoutId = null;
        this.selectionActions = null;
        this.currentSelection = null;
        this.timestamps = [];
        this.panelContainer = null;
        this.searchResults = []; // Almacena los resultados de búsqueda
        this.currentSearchIndex = -1; // Índice actual en los resultados
        this.manuallyCloseSelectionActions = false; // Flag para indicar cierre manual
        this.currentlyHighlightedSegment = null; // Segmento actualmente destacado
        this.playerStateInterval = null; // Intervalo para verificar estado del reproductor
        this.currentMode = null; // 'youtube' o 'audio'
        
        // Enlazar métodos para mantener el contexto
        this.togglePanel = this.togglePanel.bind(this);
        this.initPanelContent = this.initPanelContent.bind(this);
        this.handleTimestampClick = this.handleTimestampClick.bind(this);
        this.handleSelectionChange = this.handleSelectionChange.bind(this);
        this.useAsPrompt = this.useAsPrompt.bind(this);
        this.onPanelClose = this.onPanelClose.bind(this);
        this.hideSelectionActions = this.hideSelectionActions.bind(this);
        
        // Métodos para búsqueda y descarga
        this.performSearch = this.performSearch.bind(this);
        this.navigateSearch = this.navigateSearch.bind(this);
        this.downloadTranscription = this.downloadTranscription.bind(this);
        
        // Método para copiar texto con integración al sistema de clipboard
        this.copySelectedText = this.copySelectedText.bind(this);
        
        // Métodos para sincronización de transcripción con video
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
        this.trackCurrentTime = this.trackCurrentTime.bind(this);
        this.highlightCurrentSegment = this.highlightCurrentSegment.bind(this);
        this.clearHighlightedSegment = this.clearHighlightedSegment.bind(this);
      }

      /**
 * Reinicia los datos del panel para evitar mostrar información del chat anterior
 * Debe llamarse cuando se cambia de chat
 */
resetPanelData() {
  this.videoData = null;
  this.audioData = null;
  this.player = null;
  this.ytPlayer = null;
  this.audioPlayer = null;
  this.timestamps = [];
  this.searchResults = [];
  this.currentSearchIndex = -1;
  this.currentlyHighlightedSegment = null;
  
  this.pauseMediaPlayback();
  
  this.stopTrackingTime();
  
  // Si el panel está visible, cerrarlo
  if (this.isVisible) {
    this.togglePanel();
  }
  
  if (this.panelContainer) {
    const contentContainer = this.panelContainer.querySelector('.youtube-transcription-container');
    if (contentContainer) {
      contentContainer.innerHTML = '';
    }
    
    const titleElement = this.panelContainer.querySelector('.youtube-panel-title');
    if (titleElement) {
      titleElement.textContent = 'Transcripción';
    }
  }
  
  this.currentMode = null;
}
  
  /**
   * Inicializa el panel de transcripciones
   */
  init() {
    this.createTriggerButton();
    this.createPanelContainer();
    this.setupEventListeners();
    
    return this;
  }
  
  /**
   * Crea el botón para mostrar/ocultar el panel
   */
  createTriggerButton() {
    const existingButton = document.querySelector('.youtube-panel-trigger');
    if (existingButton) {
      existingButton.remove();
    }
    
    const button = createElement('button', {
      className: 'youtube-panel-trigger'
    });
    button.innerHTML = '<i class="bx bxl-youtube"></i>';
    button.setAttribute('title', 'Ver transcripción');
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
    
    addEvent(button, 'click', this.togglePanel);
    
    document.body.appendChild(button);
    this.triggerButton = button;
    
    // Método de prueba para forzar la visibilidad del botón
    this.forceShowButton = () => {
      this.triggerButton.style.display = 'flex';
      // Destacar temporalmente para hacerlo evidente
      this.triggerButton.style.transform = 'scale(1.1)';
      setTimeout(() => {
        this.triggerButton.style.transform = '';
      }, 1000);
    };
  }
  
  /**
   * Crea el contenedor del panel
   */
  createPanelContainer() {
    const existingPanel = document.querySelector('.youtube-panel-container');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    const container = createElement('div', {
      className: 'youtube-panel-container'
    });
    container.innerHTML = `
      <div class="youtube-panel-header">
        <h2 class="youtube-panel-title">Transcripción</h2>
        <button class="youtube-panel-close">×</button>
      </div>
      <div class="youtube-spinner">
        <i class="bx bx-loader-alt"></i>
        <p>Cargando transcripción...</p>
      </div>
    `;
    
    document.body.appendChild(container);
    this.panelContainer = container;
    
    const closeButton = container.querySelector('.youtube-panel-close');
    if (closeButton) {
      removeEvent(closeButton, 'click');
      closeButton.addEventListener('click', () => this.onPanelClose());
    }
    
    this.selectionActions = createElement('div', {
      className: 'youtube-selection-actions'
    });
    this.selectionActions.innerHTML = `
      <button class="youtube-selection-action use-prompt" title="Usar como pregunta">
        <i class="bx bx-chat"></i>
        <span class="youtube-tooltip">Usar como pregunta</span>
      </button>
      <button class="youtube-selection-action copy-text" title="Copiar texto">
        <i class="bx bx-copy"></i>
        <span class="youtube-tooltip">Copiar texto</span>
      </button>
      <button class="youtube-selection-action close-menu" title="Cerrar menú">
        <i class="bx bx-x"></i>
        <span class="youtube-tooltip">Cerrar</span>
      </button>
    `;
    document.body.appendChild(this.selectionActions);
    
    this.setupSelectionActionButtons();
  }
  
  /**
   * Configura los botones de acción de selección
   */
  setupSelectionActionButtons() {
    const usePromptBtn = this.selectionActions.querySelector('.use-prompt');
    const copyTextBtn = this.selectionActions.querySelector('.copy-text');
    const closeActionBtn = this.selectionActions.querySelector('.close-menu');
    
    if (usePromptBtn) {
      usePromptBtn.replaceWith(usePromptBtn.cloneNode(true)); // Elimina todos los eventos
      const newUsePromptBtn = this.selectionActions.querySelector('.use-prompt');
      newUsePromptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.useAsPrompt();
        return false;
      });
    }
    
    if (copyTextBtn) {
      copyTextBtn.replaceWith(copyTextBtn.cloneNode(true)); // Elimina todos los eventos
      const newCopyTextBtn = this.selectionActions.querySelector('.copy-text');
      newCopyTextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.copySelectedText();
        return false;
      });
    }
    
    if (closeActionBtn) {
      closeActionBtn.replaceWith(closeActionBtn.cloneNode(true)); // Elimina todos los eventos
      const newCloseActionBtn = this.selectionActions.querySelector('.close-menu');
      newCloseActionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.manuallyCloseSelectionActions = true;
        this.hideSelectionActions();
        return false;
      });
    }
  }
  
  /**
   * Configura los event listeners para el panel
   */
  setupEventListeners() {
    document.addEventListener('mouseup', (e) => {
      // Evitar capturar selección si estamos haciendo clic en un botón específico
      if (e.target.closest('.youtube-panel-close') || 
          e.target.closest('.youtube-selection-action')) {
        return;
      }
      
      // Pequeño retraso para asegurar que la selección esté completa
      setTimeout(() => this.handleSelectionChange(e), 10);
    });
    
    document.addEventListener('mousedown', (e) => {
      // Si el clic fue dentro del menú de selección, no hacer nada
      if (this.selectionActions && this.selectionActions.contains(e.target)) {
        return;
      }
      
      // Si el clic fue en el botón de cerrar, no interferir
      if (e.target.closest('.youtube-panel-close')) {
        return;
      }
      
      // Si el menú está visible y se clickea fuera, cerrar el menú
      if (this.selectionActions && 
          this.selectionActions.classList.contains('visible') && 
          !e.target.closest('.youtube-selection-action')) {
        // Solo cerramos si no hay selección activa o si el clic fue fuera de la selección
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          this.hideSelectionActions();
        }
      }
    });
    
    if (this.panelContainer) {
      // Evitar que clics en el contenido afecten al chat, pero permitir botón de cierre
      this.panelContainer.addEventListener('click', (e) => {
        // No detener propagación para el botón de cierre
        if (e.target.closest('.youtube-panel-close')) {
          return;
        }
        
        e.stopPropagation();
      });
    }
  }
  
  /**
   * Verifica si hay video o audio transcrito para el chat actual
   */
  async checkForTranscriptions() {
    const chatId = getState('currentChatId');
    if (!chatId) return;
    
    try {
      // Primero verificar si hay video
      const videoResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-video`);
      const videoData = await videoResponse.json();
      
      if (videoData.success && videoData.hasVideo) {
        // Hay un video - mostrar el botón y cambiar el icono
        if (this.triggerButton) {
          this.triggerButton.style.display = 'flex';
          this.triggerButton.innerHTML = '<i class="bx bxl-youtube"></i>';
          this.triggerButton.setAttribute('title', 'Ver transcripción de video');
          this.currentChatId = chatId;
          this.currentMode = 'youtube';
        }
        return;
      }
      
      // Si no hay video, verificar si hay audio
      const audioResponse = await fetch(`/api/video-transcription/chat/${chatId}/has-audio`);
      const audioData = await audioResponse.json();
      
      if (audioData.success && audioData.hasAudio) {
        // Hay un audio - mostrar el botón y cambiar el icono
        if (this.triggerButton) {
          this.triggerButton.style.display = 'flex';
          this.triggerButton.innerHTML = '<i class="bx bx-headphone"></i>';
          this.triggerButton.setAttribute('title', 'Ver transcripción de audio');
          this.currentChatId = chatId;
          this.currentMode = 'audio';
        }
        return;
      }
      
      // Si no hay nada, ocultar el botón
      if (this.triggerButton) {
        this.triggerButton.style.display = 'none';
      }
      
      if (this.isVisible) {
        this.togglePanel(); // Cerrar panel si estaba abierto
      }
      
    } catch (error) {
    }
  }
  
  /**
   * Verifica si hay un video en el chat actual (para compatibilidad con el código existente)
   */
  async checkForVideo() {
    await this.checkForTranscriptions();
  }
  
  /**
   * Muestra/oculta el panel de transcripciones
   */
togglePanel() {
    if (this.isVisible) {
      removeClass(this.panelContainer, 'active');
      document.body.classList.remove('youtube-panel-open'); // ← AGREGAR ESTA LÍNEA
      this.isVisible = false;
      
      this.pauseMediaPlayback();
      
      this.stopTrackingTime();
      
      // Si hay un menú de selección visible, ocultarlo
      this.hideSelectionActions();
    } else {
      addClass(this.panelContainer, 'active');
      document.body.classList.add('youtube-panel-open'); // ← AGREGAR ESTA LÍNEA
      this.isVisible = true;
      
      // Animación sutil de contenido
      const content = this.panelContainer.querySelector('.youtube-transcription-container');
      if (content) {
        content.style.opacity = '0';
        setTimeout(() => {
          content.style.opacity = '1';
          content.style.transition = 'opacity 0.3s ease';
        }, 300);
      }
      
      const currentState = getState ? getState('currentChatId') : null;
      const needsReload = (!this.videoData && !this.audioData) || 
                          (this.currentChatId !== currentState) ||
                          (!this.timestamps || this.timestamps.length === 0);
      
      // Si el chat actual es diferente, limpiar datos anteriores
      if (this.currentChatId !== currentState) {
        this.videoData = null;
        this.audioData = null;
        this.timestamps = [];
        
        this.currentChatId = currentState;
        
        // Limpieza visual
        const contentContainer = this.panelContainer.querySelector('.youtube-transcription-container');
        if (contentContainer) {
          contentContainer.innerHTML = '<div class="loading-message">Cargando transcripción para el nuevo chat...</div>';
        }
      }
      
      if (needsReload) {
        this.currentChatId = currentState;
        
        const spinner = this.panelContainer.querySelector('.youtube-spinner');
        if (spinner) {
          spinner.style.display = 'flex';
        }
        
        this.loadTranscriptionData();
      }
    }
  }
  
/**
 * Pausa cualquier reproducción de medios (video o audio)
 */
pauseMediaPlayback() {
  try {
    if (this.currentMode === 'youtube') {
      // Método 1: Usar API oficial de YouTube
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      } 
      // Método 2: Usar postMessage para iframe
      else if (this.player) {
        this.player.contentWindow.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}', 
          '*'
        );
      }
    }
    
    if (this.currentMode === 'audio' && this.audioPlayer) {
      this.audioPlayer.pause();
      
      try {
        const currentVolume = this.audioPlayer.volume;
        this.audioPlayer.volume = 0; // Silenciar primero para prevenir sonidos al cambiar
        
        this.audioPlayer.currentTime = 0;
        
        setTimeout(() => {
          if (this.audioPlayer) this.audioPlayer.volume = currentVolume;
        }, 100);
      } catch (innerError) {
      }
    }
    
    if (this.panelContainer) {
      const audioplayers = this.panelContainer.querySelectorAll('audio');
      if (audioplayers.length > 0) {
        audioplayers.forEach(audio => {
          if (!audio.paused) {
            audio.pause();
          }
        });
      }
    }
  } catch (error) {
  }
}
  
  /**
   * Detiene el seguimiento de tiempo del reproductor
   */
  stopTrackingTime() {
    if (this.playerStateInterval) {
      clearInterval(this.playerStateInterval);
      this.playerStateInterval = null;
    }
    
    this.clearHighlightedSegment();
  }
  
  /**
   * Cierra el panel
   */
  onPanelClose() {
    // Si el menú de selección está visible, ocultarlo primero
    if (this.selectionActions && this.selectionActions.classList.contains('visible')) {
      this.hideSelectionActions();
    }
    
    this.stopTrackingTime();
    
    this.togglePanel();
  }
  
  /**
   * Carga los datos de transcripción (video o audio)
   */
  async loadTranscriptionData() {
    if (!this.currentChatId) return;
    
    try {
      const spinner = this.panelContainer.querySelector('.youtube-spinner');
      if (spinner) {
        spinner.style.display = 'flex';
      }
      
      if (this.currentMode === 'youtube') {
        const response = await fetch(`/api/video-transcription/chat/${this.currentChatId}/video-data`);
        const data = await response.json();
        
        if (data.success) {
          this.videoData = data.video;
          this.audioData = null;
          await this.initPanelContent();
        } else {
          // ERROR CAMUFLADO: No se pudieron cargar datos de video
          this.showError('Acadel no puede encontrar el video. Como cuando pierdo mis anteojos y están en mi cabeza');
        }
      } else if (this.currentMode === 'audio') {
        const response = await fetch(`/api/video-transcription/chat/${this.currentChatId}/audio-data`);
        const data = await response.json();
        
        if (data.success) {
          this.audioData = data.audio;
          this.videoData = null;
          await this.initPanelContent();
        } else {
          // ERROR CAMUFLADO: No se pudieron cargar datos de audio
          this.showError('Acadel no puede encontrar el audio. Mis orejas de capibara están despistadas');
        }
      } else {
        // ERROR CAMUFLADO: Tipo de transcripción no válido
        this.showError('Acadel está confundido sobre qué tipo de transcripción mostrar. Mi cerebro se trabó');
      }
    } catch (error) {
      // ERROR CAMUFLADO: Error de conexión
      this.showError('Acadel perdió la conexión. Como cuando se me corta el internet en plena clase');
    } finally {
      const spinner = this.panelContainer.querySelector('.youtube-spinner');
      if (spinner) {
        spinner.style.display = 'none';
      }
    }
  }
  
  /**
   * Inicializa el contenido del panel
   */
  async initPanelContent() {
    if (this.currentMode === 'youtube') {
      return this.initYouTubePanelContent();
    } else if (this.currentMode === 'audio') {
      return this.initAudioPanelContent();
    } else {
      return this.showError('Acadel no sabe qué tipo de transcripción mostrar. Su cerebro de capibara está en cortocircuito');
    }
  }
  
  /**
   * Inicializa el contenido del panel para YouTube
   */
  async initYouTubePanelContent() {
    if (!this.videoData || !this.videoData.metadata) {
      return this.showError('Acadel no tiene datos del video. Como cuando olvido dónde guardé mis apuntes');
    }
    
    const { metadata, transcriptions } = this.videoData;
    
    const panelTitle = this.panelContainer.querySelector('.youtube-panel-title');
    if (panelTitle) {
      panelTitle.textContent = metadata.title || 'Transcripción de Video';
    }
    
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="youtube-video-container">
        <div id="youtube-player"></div>
      </div>
      <div class="youtube-video-info">
        <h3>${metadata.title || 'Video de YouTube'}</h3>
        <div class="youtube-video-meta">
          <span>${metadata.channel || 'Canal desconocido'}</span>
          <span>${this.formatDuration(metadata.duration)}</span>
        </div>
      </div>
      <div class="youtube-search-container">
        <div class="youtube-search-box">
          <i class="bx bx-search"></i>
          <input type="text" id="youtube-search-input" placeholder="Buscar...">
        </div>
        <div class="youtube-search-controls">
          <span class="youtube-search-count" id="youtube-search-count">0 resultados</span>
          <button class="youtube-search-button prev" id="youtube-search-prev" disabled>
            <i class="bx bx-chevron-up"></i>
          </button>
          <button class="youtube-search-button next" id="youtube-search-next" disabled>
            <i class="bx bx-chevron-down"></i>
          </button>
        </div>
        <button class="youtube-download-button" id="youtube-download-button" title="Descargar transcripción">
          <i class="bx bx-download"></i>
        </button>
      </div>
      <div class="youtube-transcription-container">
        <!-- Las transcripciones se cargarán aquí -->
      </div>
    `;
    
    clearElement(this.panelContainer);
    this.panelContainer.appendChild(content);
    
    // Re-agregar el header
    const header = document.createElement('div');
    header.className = 'youtube-panel-header';
    header.innerHTML = `
      <h2 class="youtube-panel-title">${metadata.title || 'Transcripción de Video'}</h2>
      <button class="youtube-panel-close">×</button>
    `;
    this.panelContainer.insertBefore(header, this.panelContainer.firstChild);
    
    // Reconectar el evento de cierre
    const closeButton = header.querySelector('.youtube-panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.onPanelClose());
    }
    
    this.initYouTubePlayer(metadata.videoId);
    
    this.processTranscriptions(transcriptions);
    
    this.setupSearchControls();
  }
  
  /**
   * Inicializa el contenido del panel para audio
   */
  async initAudioPanelContent() {
    if (!this.audioData || !this.audioData.metadata) {
      return this.showError('Acadel no tiene datos del audio. Como cuando se me olvida dónde dejé mis auriculares');
    }
    
    const { metadata, transcriptions } = this.audioData;
    
    const panelTitle = this.panelContainer.querySelector('.youtube-panel-title');
    if (panelTitle) {
      panelTitle.textContent = metadata.title || 'Transcripción de Audio';
    }
    
    const content = document.createElement('div');
    
    const playbackUrl = metadata.playbackUrl || '';
    
    content.innerHTML = `
      <div class="youtube-video-container audio-player-container">
        <audio id="audio-player" controls ${playbackUrl ? `src="${playbackUrl}"` : ''}>
          <source type="audio/mpeg">
          Tu navegador no soporta el elemento de audio.
        </audio>
      </div>
      <div class="youtube-video-info">
        <h3>${metadata.title || 'Grabación de Audio'}</h3>
        <div class="youtube-video-meta">
          <span>${metadata.type || 'Audio'}</span>
          <span>${this.formatDuration(metadata.duration)}</span>
        </div>
      </div>
      <div class="youtube-search-container">
        <div class="youtube-search-box">
          <i class="bx bx-search"></i>
          <input type="text" id="youtube-search-input" placeholder="Buscar en la transcripción...">
        </div>
        <div class="youtube-search-controls">
          <span class="youtube-search-count" id="youtube-search-count">0 resultados</span>
          <button class="youtube-search-button prev" id="youtube-search-prev" disabled>
            <i class="bx bx-chevron-up"></i>
          </button>
          <button class="youtube-search-button next" id="youtube-search-next" disabled>
            <i class="bx bx-chevron-down"></i>
          </button>
        </div>
        <button class="youtube-download-button" id="youtube-download-button" title="Descargar transcripción">
          <i class="bx bx-download"></i>
        </button>
      </div>
      <div class="youtube-transcription-container">
        <!-- Las transcripciones se cargarán aquí -->
      </div>
    `;
    
    clearElement(this.panelContainer);
    this.panelContainer.appendChild(content);
    
    // Re-agregar el header
    const header = document.createElement('div');
    header.className = 'youtube-panel-header';
    header.innerHTML = `
      <h2 class="youtube-panel-title">${metadata.title || 'Transcripción de Audio'}</h2>
      <button class="youtube-panel-close">×</button>
    `;
    this.panelContainer.insertBefore(header, this.panelContainer.firstChild);
    
    // Reconectar el evento de cierre
    const closeButton = header.querySelector('.youtube-panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.onPanelClose());
    }
    
    this.initAudioPlayer();
    
    this.processTranscriptions(transcriptions);
    
    this.setupSearchControls();
  }
  
  /**
   * Configurar controles de búsqueda
   */
  setupSearchControls() {
    const searchInput = this.panelContainer.querySelector('#youtube-search-input');
    const prevButton = this.panelContainer.querySelector('#youtube-search-prev');
    const nextButton = this.panelContainer.querySelector('#youtube-search-next');
    const downloadButton = this.panelContainer.querySelector('#youtube-download-button');
    
    if (searchInput) {
      addEvent(searchInput, 'input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value);
        }, 300);
      });
    }
    
    // Botones de navegación por resultados
    if (prevButton) {
      addEvent(prevButton, 'click', () => this.navigateSearch('prev'));
    }
    
    if (nextButton) {
      addEvent(nextButton, 'click', () => this.navigateSearch('next'));
    }
    
    // Botón de descarga
    if (downloadButton) {
      addEvent(downloadButton, 'click', this.downloadTranscription);
    }
  }
  
  /**
   * Inicializa el reproductor de YouTube con la API
   * @param {string} videoId - ID del video de YouTube
   */
  initYouTubePlayer(videoId) {
    if (!videoId) return;
    
    this.stopTrackingTime();
    
    if (typeof YT !== 'undefined' && YT.Player) {
      this.ytPlayer = new YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          fs: 1
        },
        events: {
          'onReady': this.onPlayerReady,
          'onStateChange': this.onPlayerStateChange
        }
      });
    } else {
      const playerContainer = document.getElementById('youtube-player');
      if (playerContainer) {
        playerContainer.innerHTML = `
          <iframe 
            id="youtube-iframe"
            src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            frameborder="0">
          </iframe>
        `;
        this.player = document.getElementById('youtube-iframe');
      }
      
      this.loadYouTubeAPI().then(() => {
        // Reintentar después de cargar la API
        setTimeout(() => {
          this.initYouTubePlayer(videoId);
        }, 2000);
      }).catch(() => {
      });
    }
  }
  
  /**
   * Inicializa el reproductor de audio
   */
  initAudioPlayer() {
    this.audioPlayer = document.getElementById('audio-player');
    
    if (!this.audioPlayer) {
      return;
    }
    
    this.audioPlayer.addEventListener('play', () => {
      this.startTrackingTime();
    });
    
    this.audioPlayer.addEventListener('pause', () => {
      this.stopTrackingTime();
    });
    
    this.audioPlayer.addEventListener('ended', () => {
      this.stopTrackingTime();
    });
  }
  
  /**
   * Carga la API de YouTube de forma dinámica
   * @returns {Promise} Promesa que se resuelve cuando la API está cargada
   */
  loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      if (typeof YT !== 'undefined' && YT.Player) {
        resolve();
        return;
      }
      
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      
      // Callback cuando se carga la API
      window.onYouTubeIframeAPIReady = function() {
        resolve();
      };
      
      tag.onerror = function() {
        reject(new Error('Error al cargar la API de YouTube'));
      };
      
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Timeout para evitar esperar indefinidamente
      setTimeout(() => {
        if (typeof YT === 'undefined' || !YT.Player) {
          reject(new Error('Timeout al cargar la API de YouTube'));
        }
      }, 10000);
    });
  }
  
  /**
   * Callback cuando el reproductor de YouTube está listo
   * @param {Event} event - Evento de YouTube
   */
  onPlayerReady(event) {
  }
  
  /**
   * Callback para cambios de estado del reproductor de YouTube
   * @param {Event} event - Evento de YouTube con datos de estado
   */
  onPlayerStateChange(event) {
    // YT.PlayerState.PLAYING = 1
    if (event.data === 1) {
      this.startTrackingTime();
    } else {
      this.stopTrackingTime();
    }
  }
  
  /**
   * Inicia el seguimiento del tiempo actual de reproducción
   */
  startTrackingTime() {
    this.stopTrackingTime();
    
    this.playerStateInterval = setInterval(this.trackCurrentTime, 200);
  }
  
  /**
   * Realiza seguimiento del tiempo actual de reproducción
   */
  trackCurrentTime() {
    if (!this.isVisible) return;
    
    try {
      let currentTime = 0;
      
      if (this.currentMode === 'youtube' && this.ytPlayer) {
        currentTime = this.ytPlayer.getCurrentTime();
      } else if (this.currentMode === 'audio' && this.audioPlayer) {
        currentTime = this.audioPlayer.currentTime;
      }
      
      if (!isNaN(currentTime)) {
        this.highlightCurrentSegment(currentTime);
      }
    } catch (error) {
      this.stopTrackingTime();
    }
  }
  
  /**
   * Resalta el segmento actual basado en el tiempo de reproducción
   * @param {number} currentTime - Tiempo actual en segundos
   */
  highlightCurrentSegment(currentTime) {
    if (!this.timestamps || !this.timestamps.length) return;
    
    const currentSegment = this.timestamps.find(segment => 
      currentTime >= segment.startSeconds && 
      currentTime <= segment.endSeconds
    );
    
    if (!currentSegment || 
        (this.currentlyHighlightedSegment && 
         this.currentlyHighlightedSegment.startSeconds === currentSegment.startSeconds &&
         this.currentlyHighlightedSegment.endSeconds === currentSegment.endSeconds)) {
      return;
    }
    
    this.clearHighlightedSegment();
    
    this.currentlyHighlightedSegment = currentSegment;
    
    const sections = this.panelContainer.querySelectorAll('.youtube-transcription-section');
    let highlightedSection = null;
    
    sections.forEach(section => {
      const marker = section.querySelector('.youtube-timestamp-marker');
      if (!marker) return;
      
      const startSeconds = parseFloat(marker.getAttribute('data-start'));
      const endSeconds = parseFloat(marker.getAttribute('data-end'));
      
      if (startSeconds === currentSegment.startSeconds && 
          endSeconds === currentSegment.endSeconds) {
        // Encontrar la sección correspondiente
        const textElement = section.querySelector('.youtube-transcription-text');
        if (textElement) {
          textElement.classList.add('youtube-current-segment');
          marker.classList.add('active');
          highlightedSection = section;
        }
      }
    });
    
    // Hacer scroll a la sección resaltada si se encontró
    if (highlightedSection) {
      const container = this.panelContainer.querySelector('.youtube-transcription-container');
      if (container) {
        // Scroll suave hacia el elemento pero dejando margen superior
        container.scrollTo({
          top: highlightedSection.offsetTop,
          behavior: 'smooth'
        });
      }
    }
  }
  
  /**
   * Limpia el segmento actualmente resaltado
   */
  clearHighlightedSegment() {
    const container = this.panelContainer;
    if (!container) return;
    
    const highlightedTexts = container.querySelectorAll('.youtube-current-segment');
    highlightedTexts.forEach(el => el.classList.remove('youtube-current-segment'));
    
    const activeMarkers = container.querySelectorAll('.youtube-timestamp-marker.active');
    activeMarkers.forEach(marker => {
      // Mantener marcador activo si fue activado manualmente
      if (!marker.hasAttribute('data-manually-activated')) {
        marker.classList.remove('active');
      }
    });
    
    this.currentlyHighlightedSegment = null;
  }
  
  /**
   * Procesa las transcripciones y las muestra
   * @param {Array} transcriptions - Array de transcripciones
   */
  processTranscriptions(transcriptions) {
    const transcriptionContainer = this.panelContainer.querySelector('.youtube-transcription-container');
    if (!transcriptionContainer) return;
    
    this.timestamps = [];
    
    transcriptions.forEach(trans => {
      if (trans.timestamps && Array.isArray(trans.timestamps)) {
        this.timestamps.push(...trans.timestamps);
      }
    });
    
    this.timestamps.sort((a, b) => a.startSeconds - b.startSeconds);
    
    if (this.timestamps.length === 0) {
      transcriptionContainer.innerHTML = '<p class="no-transcriptions">No hay transcripciones disponibles.</p>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    this.timestamps.forEach(item => {
      const section = document.createElement('div');
      section.className = 'youtube-transcription-section';
      section.setAttribute('data-start', item.startSeconds);
      section.setAttribute('data-end', item.endSeconds);
      
      const timestampMarker = document.createElement('span');
      timestampMarker.className = 'youtube-timestamp-marker';
      timestampMarker.textContent = `${item.startTime} - ${item.endTime}`;
      timestampMarker.setAttribute('data-start', item.startSeconds);
      timestampMarker.setAttribute('data-end', item.endSeconds);
      addEvent(timestampMarker, 'click', this.handleTimestampClick);
      
      const text = document.createElement('p');
      text.className = 'youtube-transcription-text';
      text.textContent = item.content || '';
      
      section.appendChild(timestampMarker);
      section.appendChild(text);
      fragment.appendChild(section);
    });
    
    clearElement(transcriptionContainer);
    transcriptionContainer.appendChild(fragment);
  }
  
  /**
   * Maneja el clic en una marca de tiempo
   * @param {Event} e - Evento de clic
   */
  handleTimestampClick(e) {
    const startTime = parseFloat(e.currentTarget.getAttribute('data-start'));
    
    e.currentTarget.setAttribute('data-manually-activated', 'true');
    
    // Navegamos al tiempo específico según el tipo de reproductor
    if (!isNaN(startTime)) {
      try {
        if (this.currentMode === 'youtube') {
          // Método preferido para YouTube: usar API
          if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
            this.ytPlayer.seekTo(startTime, true);
            this.ytPlayer.playVideo();
          } else if (this.player) {
            // Método alternativo - recargar el iframe con el parámetro start
            const videoId = this.videoData.metadata.videoId;
            if (videoId) {
              this.player.src = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&autoplay=1&rel=0&modestbranding=1`;
            }
          }
        } else if (this.currentMode === 'audio' && this.audioPlayer) {
          this.audioPlayer.currentTime = startTime;
          this.audioPlayer.play();
        }
      } catch (error) {
      }
      
      // Resaltar visualmente el elemento clickeado
      const allMarkers = this.panelContainer.querySelectorAll('.youtube-timestamp-marker');
      allMarkers.forEach(marker => {
        marker.classList.remove('active');
        marker.removeAttribute('data-manually-activated');
      });
      e.currentTarget.classList.add('active');
      
      setTimeout(() => {
        e.currentTarget.removeAttribute('data-manually-activated');
      }, 3000);
      
      // Desplazarse a la sección si es necesario
      const section = e.currentTarget.closest('.youtube-transcription-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
  
  /**
   * Maneja el cambio de selección de texto
   */
  handleSelectionChange() {
    // Solo procesar si el panel está visible
    if (!this.isVisible) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      return;
    }
    
    let insideTranscription = false;
    let node = selection.anchorNode;
    
    while (node != null) {
      if (node.classList && node.classList.contains('youtube-transcription-container')) {
        insideTranscription = true;
        break;
      }
      
      if (node.parentNode) {
        node = node.parentNode;
      } else {
        break;
      }
    }
    
    if (!insideTranscription) {
      return;
    }
    
    this.currentSelection = selection.toString().trim();
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    this.selectionActions.style.opacity = '0';
    this.selectionActions.style.top = `${rect.bottom + window.scrollY + 10}px`;
    this.selectionActions.style.left = `${rect.left + window.scrollX}px`;
    
    // Solo mostrar si no está ya visible
    if (!this.selectionActions.classList.contains('visible')) {
      this.manuallyCloseSelectionActions = false;
      
      addClass(this.selectionActions, 'visible');
      
      setTimeout(() => {
        this.selectionActions.style.opacity = '1';
        this.selectionActions.style.transition = 'opacity 0.25s cubic-bezier(0.19, 1, 0.22, 1)';
      }, 50);
    }
  }
  
  /**
   * Oculta las acciones de selección
   */
  hideSelectionActions() {
    if (!this.selectionActions) return;
    
    this.selectionActions.style.opacity = '0';
    
    setTimeout(() => {
      removeClass(this.selectionActions, 'visible');
      
      // Solo limpiamos la selección si fue solicitado explícitamente
      if (this.manuallyCloseSelectionActions) {
        this.currentSelection = null;
        this.manuallyCloseSelectionActions = false;
      }
    }, 150);
  }
  
  /**
   * Usa el texto seleccionado como prompt en el chat
   */
  useAsPrompt() {
    if (!this.currentSelection) return;
    
    const textarea = document.querySelector(DOM_SELECTORS.textarea);
    if (!textarea) return;
    
    const promptText = `Explicame esto: ${this.currentSelection}`;
    
    textarea.value = promptText;
    
    // Enfocar el textarea y simular un evento de input para actualizar la UI
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // NOTIFICACIÓN NECESARIA: Confirmar que el texto se agregó al chat
    if (window.acadelExito) {
      window.acadelExito(
        "💬 ¡Pregunta lista!",
        "Acadel agregó el texto seleccionado al chat. ¡Envía la pregunta cuando quieras!"
      );
    }
    
    // Dar feedback visual pero sin cerrar el menú
    const promptBtn = this.selectionActions.querySelector('.use-prompt');
    if (promptBtn) {
      const originalHTML = promptBtn.innerHTML;
      const checkIcon = '<i class="bx bx-check"></i><span class="youtube-tooltip">¡Listo!</span>';
      
      promptBtn.innerHTML = checkIcon;
      
      setManagedTimeout(() => {
        promptBtn.innerHTML = originalHTML;
      }, 1000, 'prompt-feedback');
    }
  }
  
  /**
   * Copia el texto seleccionado al portapapeles
   */
  copySelectedText() {
    if (!this.currentSelection) return;
    
    // Botón para feedback visual
    const copyBtn = this.selectionActions.querySelector('.copy-text');
    
    copyToClipboard(this.currentSelection, { 
      button: copyBtn,
      showNotification: true
    });
  }
  
  /**
   * Muestra un mensaje de error en el panel
   */
  showError(message) {
    const content = document.createElement('div');
    content.className = 'youtube-error-message';
    content.innerHTML = `
      <div>
        <i class="bx bx-error-circle"></i>
        <p>${message}</p>
      </div>
    `;
    
    clearElement(this.panelContainer);
    this.panelContainer.appendChild(content);
    
    // Re-agregar el header
    const header = document.createElement('div');
    header.className = 'youtube-panel-header';
    header.innerHTML = `
      <h2 class="youtube-panel-title">Error</h2>
      <button class="youtube-panel-close">×</button>
    `;
    this.panelContainer.insertBefore(header, this.panelContainer.firstChild);
    
    // Reconectar el evento de cierre
    const closeButton = header.querySelector('.youtube-panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.onPanelClose());
    }
  }
  
  /**
   * Realiza la búsqueda en el texto de las transcripciones
   * @param {string} query - Texto a buscar
   */
  performSearch(query) {
    this.clearHighlights();
    this.searchResults = [];
    this.currentSearchIndex = -1;
    
    if (!query || query.trim() === '') {
      this.updateSearchCount(0);
      return;
    }
    
    const textSections = this.panelContainer.querySelectorAll('.youtube-transcription-text');
    
    let totalMatches = 0;
    
    textSections.forEach((section, sectionIndex) => {
      const text = section.textContent;
      const lcText = text.toLowerCase();
      const lcQuery = query.toLowerCase();
      
      if (!section.dataset.originalText) {
        section.dataset.originalText = text;
      }
      
      let lastIndex = 0;
      let index;
      
      while ((index = lcText.indexOf(lcQuery, lastIndex)) > -1) {
        this.searchResults.push({
          section,
          sectionIndex,
          startIndex: index,
          endIndex: index + query.length
        });
        
        lastIndex = index + query.length;
        totalMatches++;
      }
    });
    
    // Resaltar los resultados en el texto
    this.highlightSearchResults();
    
    this.updateSearchCount(totalMatches);
    
    // Navegar al primer resultado si hay alguno
    if (totalMatches > 0) {
      this.navigateSearch('next');
    }
  }
  
  /**
   * Resalta los resultados de la búsqueda
   */
  highlightSearchResults() {
    const sectionMap = new Map();
    
    this.searchResults.forEach(result => {
      if (!sectionMap.has(result.section)) {
        sectionMap.set(result.section, []);
      }
      sectionMap.get(result.section).push(result);
    });
    
    sectionMap.forEach((results, section) => {
      const originalText = section.dataset.originalText;
      if (!originalText) return;
      
      results.sort((a, b) => b.startIndex - a.startIndex);
      
      let html = originalText;
      results.forEach(result => {
        const before = html.substring(0, result.startIndex);
        const match = html.substring(result.startIndex, result.endIndex);
        const after = html.substring(result.endIndex);
        
        html = before + 
               `<span class="youtube-search-match" data-index="${this.searchResults.findIndex(r => 
                  r.section === result.section && 
                  r.startIndex === result.startIndex
                )}">${match}</span>` + 
               after;
      });
      
      section.innerHTML = html;
    });
  }
  
  /**
   * Limpia los resaltados de búsqueda
   */
  clearHighlights() {
    const textSections = this.panelContainer.querySelectorAll('.youtube-transcription-text');
    
    textSections.forEach(section => {
      if (section.dataset.originalText) {
        section.textContent = section.dataset.originalText;
      }
    });
    
    const activeMatch = this.panelContainer.querySelector('.youtube-search-match.active');
    if (activeMatch) {
      activeMatch.classList.remove('active');
    }
  }
  
  /**
   * Navega entre los resultados de búsqueda
   * @param {string} direction - Dirección ('prev' o 'next')
   */
  navigateSearch(direction) {
    if (this.searchResults.length === 0) return;
    
    if (direction === 'next') {
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
    } else {
      this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
    }
    
    const previousActive = this.panelContainer.querySelector('.youtube-search-match.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }
    
    const matches = this.panelContainer.querySelectorAll('.youtube-search-match');
    const activeMatch = Array.from(matches).find(
      match => parseInt(match.dataset.index) === this.currentSearchIndex
    );
    
    if (activeMatch) {
      activeMatch.classList.add('active');
      
      // Desplazarse al resultado
      activeMatch.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  /**
   * Actualiza el contador de resultados y estado de botones
   * @param {number} count - Número de resultados
   */
  updateSearchCount(count) {
    const countElement = this.panelContainer.querySelector('#youtube-search-count');
    const prevButton = this.panelContainer.querySelector('#youtube-search-prev');
    const nextButton = this.panelContainer.querySelector('#youtube-search-next');
    
    if (countElement) {
      countElement.textContent = count === 1 
        ? '1 resultado' 
        : `${count} resultados`;
    }
    
    const hasResults = count > 0;
    if (prevButton) prevButton.disabled = !hasResults;
    if (nextButton) nextButton.disabled = !hasResults;
  }
  
  /**
   * Formatea la duración en segundos a formato legible
   * @param {number} seconds - Duración en segundos
   * @returns {string} - Duración formateada
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Desconocida';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}:`;
    result += `${minutes.toString().padStart(2, '0')}:`;
    result += secs.toString().padStart(2, '0');
    
    return result;
  }
  
  /**
   * Genera y descarga un archivo .txt con la transcripción completa
   */
  downloadTranscription() {
    if ((!this.videoData && !this.audioData) || !this.timestamps.length) {
      // ERROR CAMUFLADO: No hay transcripción disponible
      if (window.acadelWarning) {
        window.acadelWarning(
          "📄 Acadel no encuentra nada",
          "No hay transcripción disponible para descargar. Como cuando busco mis apuntes y no los encuentro"
        );
      }
      return;
    }
    
    let title, source;
    if (this.currentMode === 'youtube') {
      title = this.videoData.metadata.title || 'Video de YouTube';
      source = this.videoData.metadata.channel || 'Canal desconocido';
    } else {
      title = this.audioData.metadata.title || 'Grabación de audio';
      source = this.audioData.metadata.type || 'Audio';
    }
    
    let content = `Transcripción: ${title}\n`;
    content += `Fuente: ${source}\n\n`;
    content += `Fecha de descarga: ${new Date().toLocaleString()}\n\n`;
    content += `=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=".=\n\n`;
    
    this.timestamps.forEach(timestamp => {
      content += `[${timestamp.startTime} - ${timestamp.endTime}]\n`;
      content += `${timestamp.content || ''}\n\n`;
    });
    
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcripcion-${this.sanitizeFilename(title)}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // NOTIFICACIÓN NECESARIA: Confirmar descarga exitosa
      if (window.acadelExito) {
        window.acadelExito(
          "📥 ¡Descarga completa!",
          "Acadel guardó la transcripción en tu computadora. Búscala en tu carpeta de descargas"
        );
      }
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      // ERROR CAMUFLADO: Error en la descarga
      if (window.acadelError) {
        window.acadelError(
          "📥 Descarga fallida",
          "Acadel no pudo guardar el archivo. Como cuando se me olvida dónde puse las llaves"
        );
      }
    }
  }
  
  /**
   * Sanitiza un nombre de archivo eliminando caracteres problemáticos
   * @param {string} filename - Nombre original
   * @returns {string} - Nombre sanitizado
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[\\/:*?"<>|]/g, '-') // Reemplazar caracteres prohibidos
      .replace(/\s+/g, '_')          // Reemplazar espacios con guiones bajos
      .replace(/_+/g, '_')           // Evitar múltiples guiones seguidos
      .replace(/[^\w\-. ]/g, '')     // Eliminar otros caracteres especiales
      .substring(0, 100);            // Limitar longitud
  }
}

export const youtubePanel = new YouTubePanel();

export default youtubePanel;