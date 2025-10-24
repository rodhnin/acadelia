// chatUI.js - REFACTORIZADO para usar SOLO el sistema centralizado
import { streamQuery } from '../api/marketingAPI.js';
import { integrateExplainComponent } from './explainComponent.js';
import { createMarkdownStreamHandler } from './markdownStreamHandler.js';

// ✨ IMPORTACIONES CENTRALIZADAS - TODO EL MARKDOWN VIENE DE AQUÍ
import { 
  renderMarkdownComplete, 
  processSpecialElements,
  initMarkdownParser 
} from '../utils/markdownParser.js';

// Variables de estado del chat
let chatHistory = [];
let isProcessing = false;
let currentController = null;
let isFirstMessage = true;

// Para rastrear notificaciones en la sesión actual
let sessionNotifications = {
  profiles: [],
  contents: [],
  trends: [],
  memory: []
};

// Inicializar UI del chat - SIMPLIFICADA
export async function initChatUI(container) {
  if (!container) {
    console.error('No se encontró el contenedor para el chat');
    return;
  }
  
  // ✨ ASEGURAR INICIALIZACIÓN DEL SISTEMA CENTRALIZADO
  initMarkdownParser();
  
  // ✨ EXPONER SOLO LAS FUNCIONES CENTRALIZADAS
  if (!window.renderMarkdown) {
    window.renderMarkdown = renderMarkdownComplete;
  }
  if (!window.processSpecialElements) {
    window.processSpecialElements = processSpecialElements;
  }
  
  // Configurar listeners para notificaciones
  setupNotificationListeners();
  
  // Configurar manejadores de eventos
  setupEventListeners();
  
  // Inicializar observer para thinking gifs si está disponible
  if (window.initThinkingObserver) {
    window.initThinkingObserver();
  }
  
  // Inicializar sistema de scroll
  initScrollSystem();
  
  // Mostrar pantalla de presentación o inicializar chat directo
  showWelcomeScreen();
  
  console.log('✅ Chat UI inicializado con sistema de markdown CENTRALIZADO');
}

// Configurar listeners para notificaciones - SIN CAMBIOS
function setupNotificationListeners() {
  window.addEventListener('newNotifications', handleNewNotifications);
  window.addEventListener('notificationsCleared', handleNotificationsCleared);
  
  console.log('🔔 Listeners de notificaciones configurados en chatUI');
}

// [Las funciones de notificaciones permanecen igual...]
function handleNewNotifications(event) {
  const { notifications, hasNewContent } = event.detail;
  
  if (!hasNewContent) return;
  
  console.log('📱 Chat UI recibió notificaciones:', notifications.total);
  
  sessionNotifications = {
    profiles: notifications.notifications.profiles || [],
    contents: notifications.notifications.contents || [],
    trends: notifications.notifications.trends || [],
    memory: notifications.notifications.memory || []
  };
  
  if (notifications.total > 0) {
    showNotificationMessage(notifications);
  }
}

function handleNotificationsCleared() {
  console.log('🧹 Chat UI: Notificaciones limpiadas');
  
  sessionNotifications = {
    profiles: [],
    contents: [],
    trends: [],
    memory: []
  };
}

// [showNotificationMessage y funciones relacionadas permanecen igual...]
function showNotificationMessage(notifications) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  const existingNotification = chatMessages.querySelector('.acadelia-notif-chat-message');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notificationMessage = document.createElement('div');
  notificationMessage.className = 'acadelia-notif-chat-message';
  
  const summary = generateNotificationSummary(notifications);
  
  notificationMessage.innerHTML = `
    <div class="acadelia-notif-chat-content">
      <div class="acadelia-notif-chat-icon">
        <i class='bx bx-info-circle'></i>
      </div>
      <div class="acadelia-notif-chat-text">
        <strong>Nueva información guardada</strong>
        <p>${summary}</p>
        <div class="acadelia-notif-chat-actions">
          <button class="acadelia-notif-chat-btn acadelia-notif-primary" data-action="open-sidebar">
            <i class='bx bx-show'></i> Ver todo
          </button>
          <button class="acadelia-notif-chat-btn acadelia-notif-secondary" data-action="mark-read">
            <i class='bx bx-check'></i> Marcar como leído
          </button>
        </div>
      </div>
    </div>
  `;
  
  const openSidebarBtn = notificationMessage.querySelector('[data-action="open-sidebar"]');
  const markReadBtn = notificationMessage.querySelector('[data-action="mark-read"]');
  
  openSidebarBtn.addEventListener('click', () => {
    openSidebarToViewData();
  });
  
  markReadBtn.addEventListener('click', (e) => {
    markNotificationAsRead(e.target);
  });
  
  chatMessages.appendChild(notificationMessage);
  
  setTimeout(() => {
    ensureScrollToBottom();
  }, 100);
  
  setTimeout(() => {
    if (notificationMessage.parentNode) {
      notificationMessage.remove();
    }
  }, 20000);
}

function generateNotificationSummary(notifications) {
  const parts = [];
  
  if (notifications.byType.profiles > 0) {
    const count = notifications.byType.profiles;
    parts.push(`${count} perfil${count > 1 ? 'es' : ''} de estudiante${count > 1 ? 's' : ''}`);
  }
  
  if (notifications.byType.contents > 0) {
    const count = notifications.byType.contents;
    parts.push(`${count} idea${count > 1 ? 's' : ''} de contenido`);
  }
  
  if (notifications.byType.trends > 0) {
    const count = notifications.byType.trends;
    parts.push(`${count} tendencia${count > 1 ? 's' : ''} educativa${count > 1 ? 's' : ''}`);
  }
  
  if (notifications.byType.memory > 0) {
    const count = notifications.byType.memory;
    parts.push(`${count} insight${count > 1 ? 's' : ''} estratégico${count > 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) {
    return 'Se guardó nueva información en la base de datos.';
  } else if (parts.length === 1) {
    return `Se guardó ${parts[0]} en la base de datos.`;
  } else if (parts.length === 2) {
    return `Se guardaron ${parts[0]} y ${parts[1]} en la base de datos.`;
  } else {
    const lastPart = parts.pop();
    return `Se guardaron ${parts.join(', ')} y ${lastPart} en la base de datos.`;
  }
}

// [Las funciones de scroll e inicialización permanecen igual...]
function initScrollSystem() {
  const scrollObserver = setupContentObserver();
  
  window.addEventListener('resize', () => {
    setTimeout(() => {
      ensureScrollToBottom();
    }, 100);
  });
  
  window.ensureScrollToBottom = ensureScrollToBottom;
  
  return {
    scrollObserver,
    cleanup: () => {
      if (scrollObserver) {
        scrollObserver.disconnect();
      }
    }
  };
}

function setupContentObserver() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return null;
  
  const observer = new MutationObserver((mutations) => {
    let shouldScroll = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldScroll = true;
      }
      
      if (mutation.type === 'characterData') {
        shouldScroll = true;
      }
    });
    
    if (shouldScroll) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessages;
      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
      
      if (distanceFromBottom < 200) {
        setTimeout(() => {
          ensureScrollToBottom();
        }, 50);
      }
    }
  });
  
  observer.observe(chatMessages, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  return observer;
}

function ensureScrollToBottom() {
  const chatMessagesEl = document.getElementById('chat-messages');
  if (!chatMessagesEl) return;
  
  if (window.forceScrollToBottom) {
    window.forceScrollToBottom();
    return;
  }
  
  try {
    chatMessagesEl.scrollTo({
      top: chatMessagesEl.scrollHeight,
      behavior: 'smooth'
    });
    
    setTimeout(() => {
      if (chatMessagesEl.scrollTop < chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight - 50) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }
    }, 150);
    
  } catch (error) {
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
}

// [Las funciones de welcome screen permanecen igual hasta transitionToChat...]

function showWelcomeScreen() {
  const chatMessages = document.getElementById('chat-messages');
  const fixedSpace = document.querySelector('.fixed-space');
  
  const welcomeScreen = document.createElement('div');
  welcomeScreen.className = 'welcome-screen';
  welcomeScreen.id = 'welcome-screen';
  
  welcomeScreen.innerHTML = `
    <div class="welcome-content">
      <div class="welcome-main">
        <div class="welcome-avatar">
          <div class="avatar-container">
            <div class="welcome-gif"></div>
          </div>
        </div>
        <div class="welcome-text">
          <h1 class="welcome-title">¡Bienvenido a Acadelia Marketing IA!</h1>
          <p class="welcome-description">
            Soy tu asistente especializado en marketing educativo. Puedo ayudarte a:
          </p>
          <ul class="welcome-features">
            <li><i class='bx bx-user'></i> Analizar perfiles de estudiantes</li>
            <li><i class='bx bx-file'></i> Crear estrategias de contenido</li>
            <li><i class='bx bx-trending-up'></i> Identificar tendencias educativas</li>
            <li><i class='bx bx-palette'></i> Generar ideas creativas</li>
          </ul>
        </div>
      </div>
      
      <div class="welcome-input-section">
        <div class="welcome-input-container">
          <div class="input-box welcome-input">
            <textarea 
              id="welcomeMessageInput" 
              placeholder="¿En qué puedo ayudarte hoy? Escribe tu consulta de marketing educativo..."></textarea>
            <button id="welcomeSendButton">
              <i class='bx bx-up-arrow-alt'></i>
            </button>
          </div>
        </div>
        
        <div class="prompt-suggestions">
          <div class="suggestions-grid">
            <button class="suggestion-card" data-prompt="Ayúdame a crear una estrategia de contenido para estudiantes de medicina de primer año">
              <i class='bx bx-file'></i>
              <span>Estrategia de contenido</span>
            </button>
            <button class="suggestion-card" data-prompt="¿Cuáles son las tendencias actuales en marketing educativo digital?">
              <i class='bx bx-trending-up'></i>
              <span>Tendencias educativas</span>
            </button>
            <button class="suggestion-card" data-prompt="Analiza el perfil de un estudiante de ingeniería que necesita apoyo en matemáticas">
              <i class='bx bx-user-circle'></i>
              <span>Análisis de perfil</span>
            </button>
            <button class="suggestion-card" data-prompt="Genera ideas para una campaña de redes sociales dirigida a estudiantes universitarios">
              <i class='bx bx-share-alt'></i>
              <span>Campaña redes sociales</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  chatMessages.innerHTML = '';
  chatMessages.appendChild(welcomeScreen);
  
  if (fixedSpace) {
    fixedSpace.style.display = 'none';
  }
  
  setupWelcomeEvents();
}

function setupWelcomeEvents() {
  const welcomeInput = document.getElementById('welcomeMessageInput');
  const welcomeSendButton = document.getElementById('welcomeSendButton');
  const suggestionCards = document.querySelectorAll('.suggestion-card');
  
  if (welcomeInput) {
    welcomeInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    welcomeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleWelcomeMessage();
      }
    });
    
    setTimeout(() => {
      welcomeInput.focus();
    }, 100);
  }
  
  if (welcomeSendButton) {
    welcomeSendButton.addEventListener('click', handleWelcomeMessage);
  }
  
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (welcomeInput && prompt) {
        welcomeInput.value = prompt;
        welcomeInput.style.height = 'auto';
        welcomeInput.style.height = Math.min(welcomeInput.scrollHeight, 120) + 'px';
        welcomeInput.focus();
        
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          card.style.transform = '';
        }, 150);
      }
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

async function handleWelcomeMessage() {
  const welcomeInput = document.getElementById('welcomeMessageInput');
  const message = welcomeInput.value.trim();
  
  if (!message) {
    welcomeInput.style.borderColor = '#ff6b6b';
    setTimeout(() => {
      welcomeInput.style.borderColor = '';
    }, 1000);
    return;
  }
  
  await transitionToChat(message);
}

async function transitionToChat(firstMessage) {
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatMessages = document.getElementById('chat-messages');
  const fixedSpace = document.querySelector('.fixed-space');
  const mainContent = document.querySelector('.main-content');
  
  if (mainContent) {
    mainContent.classList.add('transitioning-to-chat');
  }
  
  welcomeScreen.style.animation = 'fadeOutUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
  
  await new Promise(resolve => setTimeout(resolve, 600));
  
  chatMessages.innerHTML = '';
  if (fixedSpace) {
    fixedSpace.style.display = 'block';
    fixedSpace.style.animation = 'slideUpIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
  }
  
  setupEventListeners();
  
  setTimeout(() => {
    ensureScrollToBottom();
  }, 100);
  
  isFirstMessage = false;
  await processFirstMessage(firstMessage);
  
  setTimeout(() => {
    if (mainContent) {
      mainContent.classList.remove('transitioning-to-chat');
    }
    ensureScrollToBottom();
  }, 100);
}

async function processFirstMessage(message) {
  appendUserMessage(message);
  chatHistory.push({ role: 'user', content: message });
  
  // ✨ NUEVO: Configurar estado de procesamiento como en handleSendMessage
  setInputDisabled(true);
  
  const sendButton = document.getElementById('sendButton');
  if (sendButton) {
    sendButton.innerHTML = '<i class="bx bx-x"></i><span class="chat-button-label">Cancelar</span>';
    sendButton.classList.add('cancel-mode');
  }
  
  isProcessing = true;
  setStatus('Procesando...');
  
  try {
    await handleQuery(message);
  } catch (error) {
    console.error('Error procesando primer mensaje:', error);
    appendSystemMessage('❌ Error procesando tu consulta. Por favor, intenta de nuevo.');
  } finally {
    // ✨ NUEVO: Restaurar estado completo como en handleSendMessage
    isProcessing = false;
    setStatus('');
    currentController = null;
    setInputDisabled(false);
    
    if (sendButton) {
      sendButton.innerHTML = '<i class="bx bx-up-arrow-alt"></i><span class="chat-button-label">Enviar</span>';
      sendButton.classList.remove('cancel-mode');
    }
  }
}

// [setupEventListeners y handleSendMessage permanecen igual...]

function setupEventListeners() {
  const sendButton = document.getElementById('sendButton');
  if (sendButton) {
    sendButton.removeEventListener('click', handleSendMessage);
    sendButton.addEventListener('click', handleSendMessage);
  }
  
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.removeEventListener('keydown', handleInputKeydown);
    messageInput.removeEventListener('input', autoResizeTextarea);
    
    messageInput.addEventListener('keydown', handleInputKeydown);
    messageInput.addEventListener('input', autoResizeTextarea);
    
    if (!isFirstMessage) {
      messageInput.focus();
    }
  }
}

function handleInputKeydown(e) {
  const inputEl = document.getElementById('messageInput');
  
  // Prevenir escritura si está deshabilitado
  if (inputEl && inputEl.disabled) {
    e.preventDefault();
    return;
  }
  
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
}

// ✨ NUEVA FUNCIÓN: Controlar estado del input
function setInputDisabled(disabled) {
  const inputEl = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  
  if (inputEl) {
    inputEl.disabled = disabled;
    inputEl.style.opacity = disabled ? '0.6' : '1';
    inputEl.style.cursor = disabled ? 'not-allowed' : 'text';
    
    if (disabled) {
      inputEl.placeholder = 'Esperando respuesta de la IA...';
    } else {
      inputEl.placeholder = '¿En qué puedo ayudarte hoy? Escribe tu consulta de marketing educativo...';
      // Enfocar el input cuando se rehabilite (opcional)
      setTimeout(() => inputEl.focus(), 100);
    }
  }
  
  if (sendButton) {
    // Mantener el botón habilitado pero cambiar su comportamiento
    sendButton.style.opacity = disabled ? '0.8' : '1';
  }
}

async function handleSendMessage() {
  if (isProcessing) {
    // ✨ NUEVA FUNCIONALIDAD: Mostrar alerta en lugar de cancelar
    if (window.showNotification) {
      window.showNotification(
        'Por motivos de compatibilidad es mejor esperar la respuesta de la IA', 
        'info', 
        3000
      );
    } else {
      // Fallback si no hay sistema de notificaciones
      alert('Por motivos de compatibilidad es mejor esperar la respuesta de la IA');
    }
    return; // No hacer nada más, mantener el procesamiento
  }
  
  const inputEl = document.getElementById('messageInput');
  const message = inputEl.value.trim();
  
  if (!message) return;
  
  inputEl.value = '';
  autoResizeTextarea.call(inputEl);
  
  appendUserMessage(message);
  chatHistory.push({ role: 'user', content: message });
  
  // ✨ NUEVO: Deshabilitar el input y cambiar botón
  setInputDisabled(true);
  
  const sendButton = document.getElementById('sendButton');
  if (sendButton) {
    sendButton.innerHTML = '<i class="bx bx-x"></i><span class="chat-button-label">Cancelar</span>';
    sendButton.classList.add('cancel-mode');
  }
  
  isProcessing = true;
  setStatus('Procesando...');
  
  try {
    await handleQuery(message);
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    appendSystemMessage('❌ Error procesando tu consulta. Por favor, intenta de nuevo.');
  } finally {
    // ✨ NUEVO: Rehabilitar el input y restaurar botón
    isProcessing = false;
    setStatus('');
    currentController = null;
    setInputDisabled(false);
    
    if (sendButton) {
      sendButton.innerHTML = '<i class="bx bx-up-arrow-alt"></i><span class="chat-button-label">Enviar</span>';
      sendButton.classList.remove('cancel-mode');
    }
  }
}

// FUNCIÓN PRINCIPAL DE CONSULTA - CORREGIDA PARA USAR SISTEMA CENTRALIZADO
async function handleQuery(query) {
  const messageEl = createMessageElement('assistant');
  appendMessageElement(messageEl);
  
  setThinkingState(messageEl, true);
  
  let receivedMetadata = {
    agentsUsed: [],
    agentSelection: null,
    explanation: null,
    detectedElements: [],
    stats: null,
    notifications: null
  };
  
  let streamHandler = null;
  
  try {
    if (supportsStreaming()) {
      currentController = new AbortController();
      
      // ✨ EL HANDLER AHORA USA EL SISTEMA CENTRALIZADO
      console.log('🎬 Creando MarkdownStreamHandler con sistema centralizado...');
      streamHandler = createMarkdownStreamHandler(messageEl, currentController);
      console.log('✅ MarkdownStreamHandler creado exitosamente');
      
      setStatus('Escribiendo...');
      
      await streamQuery(
        query,
        // Callback para chunks
        chunk => {
          console.log('📦 Chunk recibido en chatUI:', chunk.substring(0, 50) + '...');
          if (streamHandler && chunk) {
            try {
              streamHandler.processChunk(chunk);
            } catch (chunkError) {
              console.error('❌ Error procesando chunk:', chunkError);
              const contentEl = messageEl.querySelector('.message-content');
              if (contentEl) {
                contentEl.innerHTML = (contentEl.innerHTML || '') + chunk;
              }
            }
          }
        },
        // Callback onComplete
        (responseMetadata) => {
          console.log('🏁 Stream completado en chatUI. Metadatos:', responseMetadata);
          
          setThinkingState(messageEl, false);
          
          if (streamHandler) {
            try {
              streamHandler.complete();
              console.log('✅ Stream handler completado exitosamente');
            } catch (completeError) {
              console.error('❌ Error completando stream handler:', completeError);
            }
          }
          
          setStatus('');
          
          if (responseMetadata) {
            receivedMetadata = {
              ...receivedMetadata,
              ...responseMetadata
            };
            
            console.log('📋 Metadatos consolidados:', receivedMetadata);
            
            if (responseMetadata.notifications && responseMetadata.notifications.total > 0) {
              console.log('📱 Notificaciones recibidas en metadatos:', responseMetadata.notifications.total);
              processResponseNotifications(responseMetadata.notifications);
            }
          }
          
          if (receivedMetadata && (receivedMetadata.explanation || receivedMetadata.agentsUsed?.length > 0)) {
            console.log('💡 Integrando componente de explicación...');
            setTimeout(() => {
              integrateExplainComponent(receivedMetadata, query, messageEl);
            }, 300);
          }
          
          const finalContent = streamHandler ? streamHandler.getContent() : '';
          chatHistory.push({ 
            role: 'assistant', 
            content: finalContent,
            agentsUsed: receivedMetadata?.agentsUsed,
            explanation: receivedMetadata?.explanation?.explanation,
            notifications: receivedMetadata?.notifications
          });
          
          if (receivedMetadata?.detectedElements) {
            saveDetectedElements(receivedMetadata.detectedElements);
          }
        },
        // Callback onError
        (error) => {
          console.error('❌ Error en streaming:', error);
          
          setThinkingState(messageEl, false);
          
          if (streamHandler) {
            try {
              streamHandler.cleanup();
            } catch (cleanupError) {
              console.error('Error limpiando handler:', cleanupError);
            }
          }
          
          const contentEl = messageEl.querySelector('.message-content');
          if (contentEl) {
            contentEl.innerHTML = '❌ Error: No se pudo completar la respuesta.';
          }
          
          setStatus('');
          
          chatHistory.push({ 
            role: 'assistant', 
            content: '❌ Error: No se pudo completar la respuesta.'
          });
        }
      );
    } else {
      console.log('⚠️ Streaming no soportado, usando fallback...');
      
      setStatus('Esperando respuesta...');
      
      // Para fallback también usar el sistema centralizado
      streamHandler = createMarkdownStreamHandler(messageEl, null);
    }
  } catch (error) {
    console.error('❌ Error crítico en consulta:', error);
    
    setThinkingState(messageEl, false);
    
    if (streamHandler) {
      try {
        streamHandler.cleanup();
      } catch (cleanupError) {
        console.error('Error limpiando handler tras error:', cleanupError);
      }
    }
    
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
      contentEl.innerHTML = '❌ Error: No se pudo obtener respuesta del servidor. Por favor, intenta nuevamente.';
    }
    
    setStatus('');
    
    chatHistory.push({ 
      role: 'assistant', 
      content: '❌ Error: No se pudo obtener respuesta del servidor.' 
    });
  } finally {
    if (streamHandler) {
      setTimeout(() => {
        try {
          streamHandler.cleanup();
        } catch (cleanupError) {
          console.error('Error en limpieza final:', cleanupError);
        }
      }, 2000);
    }
  }
}

function supportsStreaming() {
  return typeof ReadableStream !== 'undefined' && 
         typeof TextDecoderStream !== 'undefined';
}

// [Las funciones de procesamiento de notificaciones y elementos permanecen igual...]

function processResponseNotifications(notifications) {
  console.log('📱 Procesando notificaciones en chatUI:', notifications.total);
  
  if (notifications.byType.profiles > 0) {
    console.log(`💡 Hint: ${notifications.byType.profiles} perfil(es) guardado(s) - Ver en modal de Perfiles`);
  }
  
  if (notifications.byType.contents > 0) {
    console.log(`💡 Hint: ${notifications.byType.contents} contenido(s) guardado(s) - Ver en modal de Contenido`);
  }
  
  if (notifications.byType.trends > 0) {
    console.log(`💡 Hint: ${notifications.byType.trends} tendencia(s) guardada(s) - Ver en modal de Tendencias`);
  }
  
  if (notifications.byType.memory > 0) {
    console.log(`💡 Hint: ${notifications.byType.memory} insight(s) guardado(s) - Ver en modal de Memoria`);
  }
}

function saveDetectedElements(elements) {
  if (!elements || elements.length === 0) return;
  
  elements.forEach(element => {
    if (!element.type || !element.data) return;
    
    switch (element.type) {
      case 'profile':
        saveToModal('profiles', element.data);
        break;
      case 'content':
        saveToModal('content', element.data);
        break;
      case 'trend':
        saveToModal('trends', element.data);
        break;
    }
  });
}

function saveToModal(modalType, data) {
  const containerId = modalType + 'Container';
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  const emptyMessage = container.querySelector('.empty-message');
  if (emptyMessage) {
    emptyMessage.remove();
  }
  
  let element = null;
  
  switch (modalType) {
    case 'profiles':
      element = createProfileCard(data);
      break;
    case 'content':
      element = createContentCard(data);
      break;
    case 'trends':
      element = createTrendCard(data);
      break;
  }
  
  if (element) {
    container.appendChild(element);
    
    if (window.showNotification) {
      window.showNotification(`Nuevo ${modalType === 'profiles' ? 'perfil' : (modalType === 'content' ? 'contenido' : 'tendencia')} guardado`, 'success');
    }
  }
}

// [Las funciones createProfileCard, createContentCard, createTrendCard permanecen igual...]

function createProfileCard(profile) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.id = profile.id;
  
  card.innerHTML = `
    <h3><i class='bx bx-user-circle'></i> Perfil: ${profile.metadata?.carrera || 'Usuario'}</h3>
    <div class="profile-details">
      ${profile.metadata?.edad ? `<div class="profile-field"><span>Edad:</span> ${profile.metadata.edad}</div>` : ''}
      ${profile.metadata?.nivel_academico ? `<div class="profile-field"><span>Nivel:</span> ${profile.metadata.nivel_academico}</div>` : ''}
      ${profile.metadata?.curso ? `<div class="profile-field"><span>Curso:</span> ${profile.metadata.curso}</div>` : ''}
      
      ${profile.metadata?.hobbies && profile.metadata.hobbies.length > 0 ? 
        `<div class="profile-field"><span>Intereses:</span> 
          <div class="tag-container">
            ${profile.metadata.hobbies.map(h => `<span class="tag">${h}</span>`).join('')}
          </div>
        </div>` : ''}
      
      ${profile.metadata?.actitudes ? 
        `<div class="profile-field"><span>Actitudes:</span>
          <div class="profile-attitudes">
            ${Object.entries(profile.metadata.actitudes).map(([key, value]) => 
              `<div class="attitude-meter">
                <span>${key}:</span>
                <div class="meter">
                  <div class="meter-fill" style="width: ${value * 100}%"></div>
                </div>
                <span>${(value * 100).toFixed(0)}%</span>
              </div>`
            ).join('')}
          </div>
        </div>` : ''}
        
      ${profile.metadata?.canales_preferidos && profile.metadata.canales_preferidos.length > 0 ? 
        `<div class="profile-field"><span>Canales preferidos:</span> 
          <div class="tag-container">
            ${profile.metadata.canales_preferidos.map(c => `<span class="tag">${c}</span>`).join('')}
          </div>
        </div>` : ''}
        
      ${profile.metadata?.desafíos && profile.metadata.desafíos.length > 0 ? 
        `<div class="profile-field"><span>Desafíos:</span> 
          <div class="tag-container">
            ${profile.metadata.desafíos.map(d => `<span class="tag">${d}</span>`).join('')}
          </div>
        </div>` : ''}
    </div>
  `;
  
  return card;
}

function createContentCard(content) {
  const card = document.createElement('div');
  card.className = 'content-card';
  card.dataset.id = content.id;
  
  card.innerHTML = `
    <div class="content-header">
      <h3><i class='bx bx-file'></i> ${content.type?.charAt(0).toUpperCase() + content.type?.slice(1) || 'Contenido'}: ${content.payload?.title || 'Contenido'}</h3>
      <span class="content-channel">${content.channel || ''}</span>
    </div>
    <div class="content-details">
      ${content.payload?.description ? 
        `<div class="content-description">${content.payload.description}</div>` : ''}
      
      ${content.payload?.target_audience ? 
        `<div class="content-field"><span>Audiencia:</span> ${content.payload.target_audience}</div>` : ''}
        
      ${content.payload?.caption ? 
        `<div class="content-field"><span>Texto principal:</span> "${content.payload.caption}"</div>` : ''}
        
      ${content.payload?.subcaption ? 
        `<div class="content-field"><span>Texto secundario:</span> "${content.payload.subcaption}"</div>` : ''}
        
      ${content.payload?.target_emotion ? 
        `<div class="content-field"><span>Emoción objetivo:</span> ${content.payload.target_emotion}</div>` : ''}
        
      ${content.payload?.educational_value ? 
        `<div class="content-field"><span>Valor educativo:</span> ${content.payload.educational_value}</div>` : ''}
    </div>
  `;
  
  return card;
}

function createTrendCard(trend) {
  const card = document.createElement('div');
  card.className = 'trend-card';
  card.dataset.id = trend.id;
  
  card.innerHTML = `
    <div class="trend-header">
      <h3><i class='bx bx-trending-up'></i> Tendencia: ${trend.theme || 'Tendencia'}</h3>
      <div class="trend-popularity" title="Popularidad: ${(trend.popularity * 100).toFixed(0)}%">
        <div class="trend-meter">
          <div class="trend-meter-fill" style="width: ${trend.popularity * 100}%"></div>
        </div>
        <span>${(trend.popularity * 100).toFixed(0)}%</span>
      </div>
    </div>
    
    ${trend.analysis ? `
      <div class="trend-analysis">
        <h4>Análisis</h4>
        ${trend.analysis.marketing_opportunities ? `
          <div class="trend-section">
            <h5>Oportunidades</h5>
            <ul>
              ${trend.analysis.marketing_opportunities.map(opp => `<li>${opp}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${trend.analysis.recommended_channels ? `
          <div class="trend-section">
            <h5>Canales recomendados</h5>
            <div class="tag-container">
              ${trend.analysis.recommended_channels.map(ch => `<span class="tag">${ch}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;
  
  return card;
}

function autoResizeTextarea() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 150) + 'px';
}

function setStatus(status) {
  const statusEl = document.getElementById('chat-status');
  if (!statusEl) return;
  
  statusEl.textContent = status;
  statusEl.className = 'chat-status';
  
  if (status.includes('Escribiendo')) {
    statusEl.classList.add('typing');
  }
}

function setThinkingState(messageElement, isThinking = true) {
  if (!messageElement) return;
  
  const aiProfile = messageElement.querySelector('.ai-profile');
  const messageContent = messageElement.querySelector('.message-content');
  
  if (aiProfile) {
    if (isThinking) {
      aiProfile.classList.add('thinking');
      
      setTimeout(() => {
        if (typeof applyThinkingGif === 'function') {
          applyThinkingGif(aiProfile);
        } else {
          const currentTheme = document.body.getAttribute('data-theme') || 'light';
          const isDark = currentTheme === 'dark';
          
          const gifUrl = isDark ? 
            'var(--avatar-loading-path-dark)' : 
            'var(--avatar-loading-path-light)';
          
          aiProfile.style.background = `${gifUrl} center / cover no-repeat`;
        }
      }, 50);
      
    } else {
      aiProfile.classList.remove('thinking');
      aiProfile.style.backgroundImage = '';
      aiProfile.style.background = '';
    }
  }
  
  if (messageContent) {
    if (isThinking) {
      messageContent.classList.add('loading');
    } else {
      messageContent.classList.remove('loading');
    }
  }
  
  if (isThinking) {
    messageElement.classList.add('processing');
  } else {
    messageElement.classList.remove('processing');
  }
}

function createMessageElement(role) {
  const element = document.createElement('div');
  element.className = `message message-${role}`;
  
  if (role === 'user') {
    element.innerHTML = `<div class="message-content"></div>`;
  } else if (role === 'assistant') {
    element.innerHTML = `
      <div class="ai-profile"></div>
      <div class="message-content"></div>
    `;
  } else {
    element.innerHTML = `<div class="message-content"></div>`;
  }
  
  return element;
}

function appendMessageElement(element) {
  const chatMessagesEl = document.getElementById('chat-messages');
  if (!chatMessagesEl) {
    console.error('No se encontró el contenedor de mensajes');
    return;
  }
  
  chatMessagesEl.appendChild(element);
  
  requestAnimationFrame(() => {
    setTimeout(() => {
      ensureScrollToBottom();
    }, 10);
  });
  
  return element;
}

function appendUserMessage(content) {
  const element = createMessageElement('user');
  element.querySelector('.message-content').textContent = content;
  
  const addedElement = appendMessageElement(element);
  
  setTimeout(() => {
    ensureScrollToBottom();
  }, 50);
  
  return addedElement;
}

// ✨ FUNCIONES DE RENDERIZADO AHORA USAN SISTEMA CENTRALIZADO
function appendAssistantMessage(content) {
  const element = createMessageElement('assistant');
  
  // ✨ USAR FUNCIÓN CENTRALIZADA
  element.querySelector('.message-content').innerHTML = renderMarkdownComplete(content);
  
  const addedElement = appendMessageElement(element);
  
  // ✨ USAR FUNCIÓN CENTRALIZADA
  processSpecialElements(element, true);
  
  setTimeout(() => {
    ensureScrollToBottom();
  }, 200);
  
  return addedElement;
}

function appendSystemMessage(content) {
  const element = document.createElement('div');
  element.className = 'message message-system';
  
  // ✨ USAR FUNCIÓN CENTRALIZADA
  element.innerHTML = renderMarkdownComplete(content);
  
  const addedElement = appendMessageElement(element);
  
  // ✨ USAR FUNCIÓN CENTRALIZADA
  processSpecialElements(element);
  
  setTimeout(() => {
    ensureScrollToBottom();
  }, 200);
  
  return addedElement;
}

// ✨ ELIMINADA LA FUNCIÓN renderMarkdown LOCAL - USA SOLO LA CENTRALIZADA

// FUNCIONES GLOBALES - ACTUALIZADAS PARA USAR SISTEMA CENTRALIZADO
window.openSidebarToViewData = function() {
  console.log('👁️ Abriendo sidebar para ver datos');
  
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  
  if (window.innerWidth <= 768) {
    sidebar.classList.add('mobile-open');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  } else {
    if (!sidebar.classList.contains('pinned')) {
      sidebar.classList.add('pinned');
      localStorage.setItem('sidebar-pinned', 'true');
    }
  }
  
  if (window.showNotification) {
    window.showNotification('Revisa las secciones marcadas en el sidebar para ver la nueva información', 'info', 4000);
  }
  
  const notificationMessage = document.querySelector('.acadelia-notif-chat-message');
  if (notificationMessage) {
    notificationMessage.remove();
  }
};

window.markNotificationAsRead = function(button) {
  console.log('✅ Marcando notificación como leída');
  
  if (window.notificationService && typeof window.notificationService.clearAll === 'function') {
    window.notificationService.clearAll().then(response => {
      if (response.success) {
        if (window.showNotification) {
          window.showNotification('Información marcada como leída', 'success', 2000);
        }
      }
    });
  }
  
  const notificationMessage = button.closest('.acadelia-notif-chat-message');
  if (notificationMessage) {
    notificationMessage.remove();
  }
};

// ✨ EXPOSICIÓN GLOBAL USANDO FUNCIONES CENTRALIZADAS
window.setThinkingState = setThinkingState;
window.renderMarkdown = renderMarkdownComplete; // Usa la función centralizada
window.processSpecialElements = processSpecialElements; // Usa la función centralizada
window.ensureScrollToBottom = ensureScrollToBottom;

// Exportar funciones
export {
  appendUserMessage,
  appendAssistantMessage,
  appendSystemMessage,
  setStatus,
  setThinkingState,
  ensureScrollToBottom,
  sessionNotifications,
  handleNewNotifications,
  handleNotificationsCleared
};