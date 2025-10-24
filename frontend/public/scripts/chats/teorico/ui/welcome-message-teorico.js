import { getState } from '../core/state-teorico.js';
import { validateUUID } from '../../shared/validators.js';
import { createElement, sanitizeText } from '../../shared/dom-helpers.js';
import { getCurrentVariant, getWelcomeConfig } from '../core/config-teorico.js';

// 🦫 IMPORTAR FUNCIONES DEL SISTEMA UNIFICADO DE ARCHIVOS
import { 
  initWelcomeFileAttachments,
  getWelcomeAttachedFiles,
  clearWelcomeAttachedFiles,
  hasWelcomeAttachedFiles,
  transferWelcomeFilesToChat,
  cleanupWelcomeAttachments 
} from '../utils/file-attachments-teorico.js';

// 🦫 IMPORTAR FUNCIONES DE VALIDACIÓN DESDE SHARED
import {
  validateFile,
  validateContentLimits,
  validateFileCountLimit 
} from '../../shared/file-handler.js';

import {
  validateFileType
} from '../../shared/shared-file-constants.js';

let sendMessageHandler = null;

export function registerSendMessageHandler(handler) {
  sendMessageHandler = handler;
}

/**
 * Aplica múltiples estilos a un elemento de forma segura
 * @param {HTMLElement} element - Elemento al que aplicar los estilos
 * @param {Object} styles - Objeto con estilos {propiedad: valor}
 * @param {boolean} removeIfNull - Si es true, elimina las propiedades con valor null
 * @returns {boolean} - Éxito de la operación
 */
export function applyStyles(element, styles = {}, removeIfNull = true) {
  if (!element) return false;

  try {
    for (const [prop, value] of Object.entries(styles)) {
      if (value === null && removeIfNull) {
        element.style.removeProperty(prop);
      } else if (value !== null) {
        element.style[prop] = value;
      }
    }
    return true;
  } catch (error) {
    console.warn('Error al aplicar estilos:', error);
    return false;
  }
}

/**
 * Caché global para elementos DOM frecuentemente accedidos
 * Evita repetir costosas consultas querySelector
 */
const domCache = {};

/**
 * Obtiene un elemento del DOM, usando caché si está disponible
 * @param {string} selector - Selector CSS del elemento
 * @param {boolean} forceRefresh - Si es true, ignora el caché y busca de nuevo
 * @returns {HTMLElement|null} - Elemento encontrado o null
 */
export function getCachedElement(selector, forceRefresh = false) {
  if (forceRefresh || !domCache[selector]) {
    domCache[selector] = document.querySelector(selector);
  }
  return domCache[selector];
}

/**
 * Limpia el caché de elementos DOM
 * @param {Array} selectors - Selectores específicos a limpiar (o todos si se omite)
 */
export function clearDomCache(selectors) {
  if (Array.isArray(selectors)) {
    selectors.forEach(selector => delete domCache[selector]);
  } else {
    Object.keys(domCache).forEach(key => delete domCache[key]);
  }
}

export async function showWelcomeMessage() {
  const currentVariant = getCurrentVariant();
  const variantConfig = getWelcomeConfig();

  // INMEDIATAMENTE oculta el textarea original para evitar flasheo
  const fixedSpace = getCachedElement('.fixed-space');
  if (fixedSpace) {
    applyStyles(fixedSpace, {
      opacity: '0',
      display: 'none',
      pointerEvents: 'none',
      overflow: 'hidden'
    });
    // Forzar reflow para aplicar estilos inmediatamente
    void fixedSpace.offsetHeight;
  }

  // Verificar si estamos en una ruta con ID de chat
  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];

  if (chatId && validateUUID(chatId)) {
    // Restaurar visibilidad del textarea original ya que no mostraremos bienvenida
    if (fixedSpace) {
      applyStyles(fixedSpace, {
        opacity: null,
        display: null,
        pointerEvents: null,
        overflow: null
      });
    }
    return;
  }

  // Obtener nombre del usuario
  const userName = await getUserName();

  // Obtener referencias a elementos existentes
  const chatMessages = document.querySelector('.chat-messages');

  if (!chatMessages) {
    // Si no hay contenedor de mensajes, restaurar visibility y salir
    if (fixedSpace) {
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('visibility');
      fixedSpace.style.removeProperty('pointer-events');
    }
    return;
  }

  // Limpiar cualquier mensaje de bienvenida previo
  chatMessages.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container').forEach(el => el.remove());

  // Crear mensaje de bienvenida personalizado
  const welcomeDiv = createElement('div', {
    className: `welcome-message ${variantConfig.cssClass}`
  });

  const welcomeContainer = createElement('div', { className: 'welcome-container' });
  const welcomeIcon = createElement('div', { className: 'welcome-icon' });
  const welcomeAvatar = createElement('div', { className: 'welcome-avatar' });

  // Añadir el icono específico de la variante
  const headerIconEl = createElement('i', {
    className: `bx ${variantConfig.headerIcon} header-icon`
  });

  welcomeIcon.appendChild(headerIconEl);
  welcomeIcon.appendChild(welcomeAvatar);

  const welcomeContent = createElement('div', { className: 'welcome-content' });

  // Titulo personalizado con el nombre del usuario
  const welcomeTitle = createElement('h2', {},
    `${variantConfig.title}, ${sanitizeText(userName)}`
  );

  // Mensaje personalizado
  const welcomeText = createElement('p', {}, variantConfig.message);

  welcomeContent.appendChild(welcomeTitle);
  welcomeContent.appendChild(welcomeText);
  welcomeContainer.appendChild(welcomeIcon);
  welcomeContainer.appendChild(welcomeContent);
  welcomeDiv.appendChild(welcomeContainer);

  // Crear contenedor de input para nuevo chat con placeholder personalizado
  const welcomeInputContainer = document.createElement('div');
  welcomeInputContainer.className = `centered-input-container welcome-input-container ${variantConfig.cssClass}-input`;
  welcomeInputContainer.innerHTML = `
        <div class="input-container welcome-input" id="welcome-input-container">
          <!-- Contenedor de previsualización de archivos -->
          <div class="welcome-file-preview-container" id="welcome-file-preview-container"></div>
          
          <!-- Área de drag & drop -->
          <div class="welcome-file-upload-container" id="welcome-file-upload-container">
            <div class="welcome-drag-drop-area" id="welcome-drag-drop-area">
              <i class='bx bx-upload upload-icon'></i>
              <p class="welcome-upload-main-text">Arrastra tus archivos aquí</p>
              <div class="welcome-upload-details">
                <p class="welcome-upload-secondary-text">Imágenes, documentos o archivos de código</p>
                <p class="welcome-upload-secondary-text">Máximo 4 archivos por chat y 10MB cada uno</p>
              </div>
            </div>
          </div>
          
          <!-- Botón de adjuntos -->
          <div class="welcome-attachments-wrapper" id="welcome-attachments-wrapper">
            <div class="welcome-attachment-button" id="welcome-attachment-button">
              <button class="welcome-attach-btn" id="welcome-attach-btn" aria-label="Adjuntar archivo">
                <i class='bx bx-paperclip'></i>
              </button>
              
              <div class="attachment-options" id="welcome-attachment-options">
                <label for="welcome-image-input" class="attachment-option" title="Subir imagen">
                  <i class='bx bx-image'></i>
                  <span>Imagen</span>
                </label>
                <div class="attachment-option" id="welcome-camera-btn" title="Tomar foto">
                  <i class='bx bx-camera'></i>
                  <span>Tomar foto</span>
                </div>
                <label for="welcome-document-input" class="attachment-option" title="Subir documento">
                  <i class='bx bx-file'></i>
                  <span>Documento</span>
                </label>
                <label for="welcome-code-input" class="attachment-option" title="Subir código">
                  <i class='bx bx-code-alt'></i>
                  <span>Código</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Input box principal con placeholder personalizado -->
          <div class="input-box auto-expand" id="welcome-input-box">
            <textarea 
              id="welcome-message-input" 
              class="centered-textarea auto-expand" 
              placeholder="${variantConfig.textareaPlaceholder}"
              rows="1"></textarea>
            <button id="welcome-send-btn" class="attach-btn welcome-specific-btn">
              <i class='bx bx-up-arrow-alt'></i>
              <span class="chat-button-label">Enviar</span>
            </button>
            
            <!-- Inputs ocultos para archivos -->
            <input type="file" id="welcome-image-input" accept="image/png,image/jpeg,image/jpg,image/webp" hidden>
            <input type="file" id="welcome-document-input" accept=".txt,.docx" hidden>
            <input type="file" id="welcome-code-input" accept=".js,.py,.html,.css,.java,.c,.cpp,.h,.php,.rb,.ts,.go,.swift,.json,.xml,.sql,.sh" hidden>
          </div>
        </div>
      `;

  // Crear contenedor de sugerencias con sugerencias específicas para la variante
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.className = `suggestions-container ${variantConfig.cssClass}-suggestions`;

  // Usar las sugerencias específicas para la variante actual
  variantConfig.suggestions.forEach(suggestion => {
    const suggestionBtn = document.createElement('button');
    suggestionBtn.className = 'suggestion-item';
    suggestionBtn.innerHTML = `
          <i class='bx ${suggestion.icon}'></i>
          <span>${suggestion.text}</span>
        `;

    suggestionBtn.addEventListener('click', function () {
      const welcomeTextarea = document.getElementById('welcome-message-input');
      if (welcomeTextarea) {
        welcomeTextarea.value = suggestion.text;
        welcomeTextarea.focus();

        // Disparar evento input para que se ajuste el tamaño
        welcomeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    suggestionsDiv.appendChild(suggestionBtn);
  });

  // Añadir elementos al DOM
  chatMessages.appendChild(welcomeDiv);
  chatMessages.appendChild(welcomeInputContainer);
  chatMessages.appendChild(suggestionsDiv);

  // 🦫 INICIALIZAR SISTEMA UNIFICADO DE ARCHIVOS PARA WELCOME
  console.log('🦫 Inicializando sistema de archivos unificado para Welcome...');
  
  // Limpiar sistema anterior si existe
  if (window.welcomeFiles) {
    window.welcomeFiles.clear();
    delete window.welcomeFiles;
  }
  
  // Inicializar el sistema unificado
  await initWelcomeFileAttachments();

  // Inicializar limitador de caracteres para el textarea de bienvenida
  const welcomeTextareaInit = document.getElementById('welcome-message-input');
  if (welcomeTextareaInit) {
    try {
      const characterLimitModule = await import('../../shared/character-limit.js');
      if (typeof characterLimitModule.initCharacterLimit === 'function') {
        characterLimitModule.initCharacterLimit(welcomeTextareaInit, { variant: getCurrentVariant() });
      }
    } catch (e) {
      console.warn('Error al inicializar límite de caracteres:', e);
    }
  }

  // Configurar funcionalidades inmediatamente (sin setTimeout)
  try {
    // 1. Configurar el botón de adjuntos
    const welcomeAttachBtn = document.getElementById('welcome-attach-btn');
    const attachmentOptions = document.getElementById('welcome-attachment-options');

    if (welcomeAttachBtn && attachmentOptions) {
      // Configurar de manera directa para evitar problemas de event bubbling
      welcomeAttachBtn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();

        // Alternar visibilidad del menú
        attachmentOptions.classList.toggle('show');
      };

      // Cerrar al hacer clic fuera
      document.addEventListener('click', function (event) {
        if (attachmentOptions.classList.contains('show') &&
          !welcomeAttachBtn.contains(event.target) &&
          !attachmentOptions.contains(event.target)) {
          attachmentOptions.classList.remove('show');
        }
      });
    }

    // 🚫 ELIMINADO COMPLETAMENTE: Todo el sistema específico de drag & drop de welcome
    // Solo se usa el sistema unificado ahora

    // 2. Configurar textarea autoexpandible
    const welcomeTextarea = document.getElementById('welcome-message-input');
    if (welcomeTextarea) {
      function autoResizeTextarea() {
        // Guardar la posición de scroll actual y la posición del cursor
        const scrollPos = window.scrollY;

        welcomeTextarea.style.height = 'auto';
        welcomeTextarea.style.height = (welcomeTextarea.scrollHeight) + 'px';

        // Restaurar la posición de scroll para evitar saltos
        window.scrollTo(0, scrollPos);
      }

      welcomeTextarea.addEventListener('input', autoResizeTextarea);
      autoResizeTextarea(); // Inicializar altura
      welcomeTextarea.focus();
    }

    // 3. 🦫 CONFIGURAR BOTÓN DE ENVÍO CON SISTEMA UNIFICADO
    const welcomeSendBtn = document.getElementById('welcome-send-btn');
    if (welcomeSendBtn && welcomeTextarea) {
      // Función principal para transferir y enviar mensaje - VERSIÓN SIMPLIFICADA CON SISTEMA UNIFICADO
const transferAndSendMessage = async () => {
  const messageText = welcomeTextarea.value.trim();

  // Verificar límite de caracteres
  let exceedsCharLimit = false;
  try {
    const charLimitModule = await import('../../shared/character-limit.js');
    if (messageText && typeof charLimitModule.exceedsLimit === 'function') {
      exceedsCharLimit = charLimitModule.exceedsLimit(messageText);
      if (exceedsCharLimit && typeof charLimitModule.showLimitExceededAlert === 'function') {
        charLimitModule.showLimitExceededAlert();
      }
    }
  } catch (e) {
    console.warn('Error al verificar límite de caracteres:', e);
  }

  // Si excede el límite, detener ejecución
  if (exceedsCharLimit) return;

  // 🦫 USAR SISTEMA UNIFICADO PARA VALIDAR ARCHIVOS
  const hasFiles = hasWelcomeAttachedFiles();
  
  // Validación original
  if (!messageText && !hasFiles) return;

  // 1. Transferir mensaje al textarea principal
  const mainTextarea = document.getElementById('messageInput');
  if (mainTextarea) {
    mainTextarea.value = messageText;

    // 2. 🦫 TRANSFERIR ARCHIVOS USANDO SISTEMA UNIFICADO
    if (hasFiles) {
      try {
        console.log('🚀 Transfiriendo archivos usando sistema unificado...');
        const transferredFiles = transferWelcomeFilesToChat();
        console.log(`✅ ${transferredFiles.length} archivos transferidos exitosamente`);
      } catch (error) {
        console.error('❌ Error transfiriendo archivos:', error);
      }
    }

    // MODIFICACIÓN CLAVE: Restaurar visibilidad del textarea original
    const fixedSpace = document.querySelector('.fixed-space');
    if (fixedSpace) {
      // Restaurar completamente todas las propiedades CSS
      fixedSpace.style.removeProperty('opacity');
      fixedSpace.style.removeProperty('display');
      fixedSpace.style.removeProperty('pointer-events');
      fixedSpace.style.removeProperty('overflow');
      fixedSpace.style.removeProperty('visibility');

      // Forzar reflow para aplicar cambios inmediatamente
      void fixedSpace.offsetHeight;
    }

    // Restaurar visibilidad de botones
    const sendButton = document.querySelector('.input-box button:nth-child(2)');
    if (sendButton) sendButton.style.pointerEvents = 'auto';

    // Esperar un instante para que la UI se actualice
    setTimeout(async () => {
      // 4. Eliminar elementos de bienvenida
      if (welcomeDiv && welcomeDiv.parentNode) welcomeDiv.remove();
      if (welcomeInputContainer && welcomeInputContainer.parentNode) welcomeInputContainer.remove();
      if (suggestionsDiv && suggestionsDiv.parentNode) suggestionsDiv.remove();

      // 🦫 LIMPIAR SISTEMA UNIFICADO DE WELCOME
      cleanupWelcomeAttachments();

      // ⭐ NOTIFICACIÓN ACADEL:
        acadelExito("🚀 ¡Mensaje enviado!", "Acadel transfirió tu consulta al chat principal");

      // 5. ENVIAR MENSAJE CON MÚLTIPLES FALLBACKS
      let messageSent = false;

      // Primer intento: usar sendMessageHandler registrado
      if (sendMessageHandler) {
        try {
          sendMessageHandler();
          messageSent = true;
        } catch (error) {
          console.warn('Error con sendMessageHandler:', error);
        }
      }

      // Segundo intento: importar chat-controller directamente
      if (!messageSent) {
        try {
          const chatController = await import('../core/chat-controller-teorico.js');
          if (typeof chatController.handleSendMessage === 'function') {
            chatController.handleSendMessage();
            messageSent = true;
          }
        } catch (error) {
          console.warn('Error importando chat-controller:', error);
        }
      }

      // Tercer intento: función global
      if (!messageSent && typeof window.handleSendMessage === 'function') {
        try {
          window.handleSendMessage();
          messageSent = true;
        } catch (error) {
          console.warn('Error con función global:', error);
        }
      }

      // Cuarto intento: hacer clic en el botón de envío
      if (!messageSent) {
        const sendBtn = document.querySelector('#sendButton') || 
                       document.querySelector('.send-button') ||
                       document.querySelector('button[type="submit"]') ||
                       document.querySelector('.input-box button:last-child');
        
        if (sendBtn) {
          try {
            sendBtn.click();
            messageSent = true;
          } catch (error) {
            console.warn('Error haciendo clic en botón:', error);
          }
        }
      }

      // Quinto intento: evento personalizado
      if (!messageSent) {
        try {
          window.dispatchEvent(new CustomEvent('sendMessageRequest', {
            detail: { 
              message: messageText, 
              hasFiles: hasFiles 
            }
          }));
          messageSent = true;
        } catch (error) {
          console.warn('Error con evento personalizado:', error);
        }
      }

      // Si nada funcionó, mostrar error
      if (!messageSent) {
        acadelError(
          "¡Ups! Sistema confundido 🤖", 
          "Acadel no encontró la forma de enviar tu mensaje. Esto es raro... ¿puedes intentar refrescar la página?"
        );
      }
    }, 50);
  }
};

      // Configurar eventos con funciones explícitas (no usar referencias directas)
      welcomeSendBtn.addEventListener('click', function (e) {
        e.preventDefault();
        transferAndSendMessage();
      });

      welcomeTextarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          transferAndSendMessage();
        }
      });
    }

  } catch (error) {
    console.error('Error al inicializar funcionalidades del mensaje de bienvenida:', error);
  }
  
  // Opcional: Añadir atributo data-variant para uso en CSS
  welcomeDiv.setAttribute('data-variant', currentVariant);
  welcomeInputContainer.setAttribute('data-variant', currentVariant);
  suggestionsDiv.setAttribute('data-variant', currentVariant);

  // Opcional: Actualizar el aria-label del asistente para accesibilidad
  const assistantElements = document.querySelectorAll('.welcome-avatar');
  assistantElements.forEach(el => {
    el.setAttribute('aria-label', variantConfig.assistantLabel);
  });

  // Ocultar cualquier alerta de límite que pueda estar visible
  try {
    const { hideLimitAlert } = await import('../../shared/character-limit.js');
    if (typeof hideLimitAlert === 'function') {
      hideLimitAlert();
    }
  } catch (e) {
    console.warn('Error al ocultar alerta de límite:', e);
  }
}

/**
 * Obtiene el nombre del usuario desde su perfil.
 * @returns {Promise<string>} Nombre del usuario desde el perfil o valor formateado del userId
 */
async function getUserName() {
  try {
    // Obtener userId del estado global
    const userId = getState('userId');

    if (!userId) {
      return 'usuario';
    }

    // Intentar obtener el perfil del usuario usando fetchUserProfile
    try {
      // Importar dinámicamente el módulo auth para acceder a fetchUserProfile
      const authModule = await import('../api/auth-teorico.js');
      const profile = await authModule.fetchUserProfile(userId);

      // Si se obtuvo el perfil correctamente, extraer el nombre
      if (profile) {
        if (profile.nombre && profile.apellido) {
          return `${profile.nombre} ${profile.apellido}`;
        } else if (profile.nombre) {
          return profile.nombre;
        }
      }
    } catch (profileError) {
      console.warn('Error al obtener perfil para nombre:', profileError);
      // Continuar con el método de respaldo si falla obtener el perfil
    }

    // Respaldo: Si falla obtener el perfil o no tiene nombre, formatear el userId
    // Respaldo: Si falla obtener el perfil o no tiene nombre, formatear el userId
    if (typeof userId === 'string' && userId.includes('@')) {
      // Permitir solo caracteres alfanuméricos para máxima seguridad
      const namePart = userId.split('@')[0].replace(/[^a-z0-9._-]/gi, '');
      return namePart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    }

    return userId;
  } catch (e) {
    console.warn('Error en getUserName:', e);
    return 'usuario';
  }
}

/**
 * Valida y sanitiza una cadena base64
 * @param {string} base64 - String base64 a validar
 * @returns {string} - String base64 válido o cadena vacía
 */
export function sanitizeBase64(base64) {
  if (!base64 || typeof base64 !== 'string') return '';

  // Verificar si es un data URL válido
  if (base64.startsWith('data:')) {
    const validPattern = /^data:(image\/[a-z]+);base64,[a-zA-Z0-9+/=]+$/;
    return validPattern.test(base64) ? base64 : '';
  }

  // Verificar si es base64 crudo
  const validBase64 = /^[a-zA-Z0-9+/=]+$/;
  return validBase64.test(base64) ? base64 : '';
}