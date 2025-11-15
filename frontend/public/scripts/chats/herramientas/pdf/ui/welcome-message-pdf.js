import { getState } from '../core/state-pdf.js';
import { validateUUID } from '../../../shared/validators.js';
import { sanitizeText } from '../../../shared/dom-helpers.js';

import { 
  initWelcomeFileAttachments,
  hasWelcomeAttachedFiles,
  transferWelcomeFilesToChat,
  cleanupWelcomeAttachments 
} from '../utils/file-attachments-pdf.js';

import {
  validateContentLimits,
  validateFileCountLimit 
} from '../../../shared/file-handler.js';

import {
  validateFileType
} from '../../../shared/shared-file-constants.js';

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

  const pathSegments = window.location.pathname.split('/');
  const chatId = pathSegments[2];

  if (chatId && validateUUID(chatId)) {
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

  const userName = await getUserName();

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

  chatMessages.querySelectorAll('.welcome-message, .centered-input-container, .suggestions-container').forEach(el => el.remove());

  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'welcome-message';
  welcomeDiv.innerHTML = `
  <div class="welcome-container">
    <div class="welcome-icon">
      <div class="welcome-avatar"></div>
    </div>
    <div class="welcome-content">
      <h2>Bienvenido, ${sanitizeText(userName)}</h2>
      <p>Soy tu asistente virtual de PDF. ¿Cómo puedo ayudarte hoy?</p>
    </div>
  </div>
`;

  const welcomeInputContainer = document.createElement('div');
  welcomeInputContainer.className = 'centered-input-container welcome-input-container';
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
      
      <!-- Input box principal -->
      <div class="input-box auto-expand" id="welcome-input-box">
        <textarea 
          id="welcome-message-input" 
          class="centered-textarea auto-expand" 
          placeholder="Envía un mensaje a Acadelia"
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

  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.className = 'suggestions-container';

const suggestions = [
    { text: "Hacer un resumen ejecutivo del documento", icon: "bx bx-file-blank" },
    { text: "Buscar términos o conceptos específicos", icon: "bx-search-alt" },
    { text: "Analizar la estructura y organización del contenido", icon: "bx-list-check" },
    { text: "Explicar conceptos complejos de manera simple", icon: "bx-bulb" }
];

  suggestions.forEach(suggestion => {
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

        welcomeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    suggestionsDiv.appendChild(suggestionBtn);
  });

  chatMessages.appendChild(welcomeDiv);
  chatMessages.appendChild(welcomeInputContainer);
  chatMessages.appendChild(suggestionsDiv);

  console.log('📄 Inicializando sistema de archivos unificado para Welcome...');
  
  if (window.welcomeFiles) {
    window.welcomeFiles.clear();
    delete window.welcomeFiles;
  }
  
  await initWelcomeFileAttachments();

  const welcomeTextareaInit = document.getElementById('welcome-message-input');
  if (welcomeTextareaInit) {
    try {
      const characterLimitModule = await import('../../../shared/character-limit.js');
      if (typeof characterLimitModule.initCharacterLimit === 'function') {
        characterLimitModule.initCharacterLimit(welcomeTextareaInit, { variant: 'pdf' });
      }
    } catch (e) {
      console.warn('Error al inicializar límite de caracteres:', e);
    }
  }

  try {
    // 1. Configurar el botón de adjuntos
    const welcomeAttachBtn = document.getElementById('welcome-attach-btn');
    const attachmentOptions = document.getElementById('welcome-attachment-options');

    if (welcomeAttachBtn && attachmentOptions) {
      welcomeAttachBtn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();

        // Alternar visibilidad del menú
        attachmentOptions.classList.toggle('show');
      };

      document.addEventListener('click', function (event) {
        if (attachmentOptions.classList.contains('show') &&
          !welcomeAttachBtn.contains(event.target) &&
          !attachmentOptions.contains(event.target)) {
          attachmentOptions.classList.remove('show');
        }
      });
    }

    const welcomeFileUploadContainer = document.getElementById('welcome-file-upload-container');
    const welcomeDragDropArea = document.getElementById('welcome-drag-drop-area');

    if (welcomeFileUploadContainer && welcomeDragDropArea) {
      const handleWelcomeDroppedFiles = async (files) => {
        console.log('🏠 handleWelcomeDroppedFiles - Procesando en bienvenida:', files.length, 'archivos');

        if (!files || files.length === 0) return;

        try {
          let processedCount = 0;
          let errorCount = 0;

          const currentFiles = document.querySelectorAll('#welcome-file-preview-container .file-preview[data-file-id]').length;
          const totalFiles = currentFiles + files.length;
          
          if (!validateFileCountLimit(totalFiles)) {
            return;
          }

          for (const file of files) {
            try {
              const typeValidation = validateFileType(file);
              if (!typeValidation.valid) {
                acadelError(
                  "¡Archivo misterioso detectado! 🕵️", 
                  `Acadel no reconoce el tipo del archivo "${file.name}". Solo acepta imágenes, documentos y código. ¿Tienes algo más compatible?`
                );
                errorCount++;
                continue;
              }

              if (typeValidation.detectedType === 'document' || typeValidation.detectedType === 'code') {
                let contentToValidate = '';

                if (typeValidation.detectedType === 'document') {
                  const extension = file.name.split('.').pop().toLowerCase();
                  if (extension === 'docx') {
                    const { extractTextFromFile } = await import('../../../shared/file-handler.js');
                    contentToValidate = await extractTextFromFile(file);
                  } else {
                    contentToValidate = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (e) => resolve(e.target.result);
                      reader.onerror = reject;
                      reader.readAsText(file);
                    });
                  }
                } else if (typeValidation.detectedType === 'code') {
                  // Leer código
                  contentToValidate = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                  });
                }

                console.log('🔍 Validando contenido en welcome');
                const validation = validateContentLimits(contentToValidate, file.name);

                if (!validation.valid) {
                  console.log('❌ Validación de contenido falló en welcome');
                  acadelError(
                    "¡Ups! Archivo muy pesado 📚", 
                    "Acadel detectó que tu archivo tiene más contenido del que puede procesar de una vez. ¿Podrías dividirlo en partes más pequeñas?"
                  );
                  errorCount++;
                  continue;
                }
              }

              // Si llegamos aquí, el archivo pasó todas las validaciones específicas
              const validFile = file;
              
              // El sistema unificado se encargará del resto del procesamiento
              // No necesitamos handleSingleFilePreview aquí porque el sistema unificado lo hace
              console.log(`✅ Archivo ${file.name} pasó validaciones específicas de welcome`);
              processedCount++;

            } catch (fileError) {
              errorCount++;
              console.error('❌ Error validando archivo en welcome:', fileError);
              acadelError(
                "¡Archivo rebelde detectado! 🤔", 
                `Acadel tuvo problemas para leer "${file.name}". Puede ser el formato o que esté dañadito. ¿Intentas con otro?`
              );
            }
          }

          // Los archivos válidos se procesarán por el sistema unificado
          if (processedCount > 0) {
            const validFiles = [];
            let validIndex = 0;
            
            for (const file of files) {
              try {
                const typeValidation = validateFileType(file);
                if (typeValidation.valid) {
                  validFiles.push(file);
                  validIndex++;
                  if (validIndex >= processedCount) break;
                }
              } catch (e) {
                // Skip invalid files
              }
            }

            if (window.handleDroppedFiles && validFiles.length > 0) {
              await window.handleDroppedFiles(validFiles);
            }
          }

          if (processedCount > 0 && errorCount === 0) {
            console.log(`🎉 Welcome procesó ${processedCount} archivos exitosamente`);
          } else if (processedCount > 0 && errorCount > 0) {
            acadelWarning(
              "¡Algunos archivos listos! ⚠️", 
              `Acadel procesó ${processedCount} archivos exitosos, ${errorCount} tuvieron problemas`
            );
          }

        } catch (error) {
          console.error('❌ Error general en handleWelcomeDroppedFiles:', error);
          acadelError(
            "¡Sistema confundido! 🤖", 
            "Acadel tuvo un problema técnico procesando los archivos. ¿Podrías intentar de nuevo?"
          );
        } finally {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      };

      document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files') && document.querySelector('.welcome-message')) {
          welcomeFileUploadContainer.classList.add('active');
        }
      });

      welcomeFileUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (document.querySelector('.welcome-message')) {
          welcomeFileUploadContainer.classList.add('dragging');

          // IMPORTANTE: Agregar también la clase correcta que espera el CSS
          const dragArea = document.getElementById('welcome-drag-drop-area');
          if (dragArea) {
            // Asegurarse de que tenga la clase drag-drop-area (sin el prefijo welcome-)
            if (!dragArea.classList.contains('drag-drop-area')) {
              dragArea.classList.add('drag-drop-area');
            }
          }
        }
      });

      welcomeFileUploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (document.querySelector('.welcome-message') && 
            (!e.relatedTarget || !welcomeFileUploadContainer.contains(e.relatedTarget))) {
          welcomeFileUploadContainer.classList.remove('dragging');
        }
      });

      document.addEventListener('dragend', () => {
        if (document.querySelector('.welcome-message')) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      document.addEventListener('dragleave', (e) => {
        if (!document.querySelector('.welcome-message')) return;

        if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.welcome-message') &&
          welcomeFileUploadContainer.classList.contains('active')) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      document.addEventListener('click', (e) => {
        if (!document.querySelector('.welcome-message')) return;

        if (welcomeFileUploadContainer.classList.contains('active') &&
          !welcomeFileUploadContainer.contains(e.target)) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      let welcomeDragTimer;
      document.addEventListener('dragenter', () => {
        if (!document.querySelector('.welcome-message')) return;
        clearTimeout(welcomeDragTimer);
      });

      document.addEventListener('dragover', () => {
        if (!document.querySelector('.welcome-message')) return;
        clearTimeout(welcomeDragTimer);
        welcomeDragTimer = setTimeout(() => {
          if (welcomeFileUploadContainer.classList.contains('active')) {
            welcomeFileUploadContainer.classList.remove('active', 'dragging');
          }
        }, 2000); // 2 segundos sin eventos de arrastre = abandonado
      });

      welcomeFileUploadContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        console.log('🏠 Welcome drop detectado con', e.dataTransfer.files.length, 'archivos');
        
        if (e.dataTransfer.files.length > 0) {
          await handleWelcomeDroppedFiles(e.dataTransfer.files);
        }
      });
    }

    // 2. Configurar textarea autoexpandible
    const welcomeTextarea = document.getElementById('welcome-message-input');
    if (welcomeTextarea) {
      function autoResizeTextarea() {
        const scrollPos = window.scrollY;

        welcomeTextarea.style.height = 'auto';
        welcomeTextarea.style.height = (welcomeTextarea.scrollHeight) + 'px';

        window.scrollTo(0, scrollPos);
      }

      welcomeTextarea.addEventListener('input', autoResizeTextarea);
      autoResizeTextarea(); // Inicializar altura
      welcomeTextarea.focus();
    }

    const welcomeSendBtn = document.getElementById('welcome-send-btn');
    if (welcomeSendBtn && welcomeTextarea) {
      const transferAndSendMessage = async () => {
        const messageText = welcomeTextarea.value.trim();

        let exceedsCharLimit = false;
        try {
          const charLimitModule = await import('../../../shared/character-limit.js');
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

        const hasFiles = hasWelcomeAttachedFiles();
        
        if (!messageText && !hasFiles) return;

        // 1. Transferir mensaje al textarea principal
        const mainTextarea = document.getElementById('messageInput');
        if (mainTextarea) {
          mainTextarea.value = messageText;

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
            fixedSpace.style.removeProperty('opacity');
            fixedSpace.style.removeProperty('display');
            fixedSpace.style.removeProperty('pointer-events');
            fixedSpace.style.removeProperty('overflow');
            fixedSpace.style.removeProperty('visibility');

            // Forzar reflow para aplicar cambios inmediatamente
            void fixedSpace.offsetHeight;
          }

          const sendButton = document.querySelector('.input-box button:nth-child(2)');
          if (sendButton) sendButton.style.pointerEvents = 'auto';

          setTimeout(async () => {
            // 4. Eliminar elementos de bienvenida
            if (welcomeDiv && welcomeDiv.parentNode) welcomeDiv.remove();
            if (welcomeInputContainer && welcomeInputContainer.parentNode) welcomeInputContainer.remove();
            if (suggestionsDiv && suggestionsDiv.parentNode) suggestionsDiv.remove();

            cleanupWelcomeAttachments();

              acadelExito("🚀 ¡Mensaje enviado!", "Acadel transfirió tu consulta al chat principal");

            // 5. ENVIAR MENSAJE CON MÚLTIPLES FALLBACKS
            let messageSent = false;

            // Primer intento: importar chat-controller directamente
            if (!messageSent) {
              try {
                const chatController = await import('../core/chat-controller-pdf.js');
                if (typeof chatController.handleSendMessage === 'function') {
                  chatController.handleSendMessage();
                  messageSent = true;
                }
              } catch (error) {
                console.warn('Error importando chat-controller:', error);
              }
            }

            // Segundo intento: función global
            if (!messageSent && typeof window.handleSendMessage === 'function') {
              try {
                window.handleSendMessage();
                messageSent = true;
              } catch (error) {
                console.warn('Error con función global:', error);
              }
            }

            // Tercer intento: hacer clic en el botón de envío
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

            // Cuarto intento: evento personalizado
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

  import('../utils/pdf-button-controller.js').then(module => {
    if (typeof module.updatePDFButtonsVisibility === 'function') {
      module.updatePDFButtonsVisibility(false);
    }
  });

  try {
    const { hideLimitAlert } = await import('../../../shared/character-limit.js');
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
    const userId = getState('userId');

    if (!userId) {
      return 'usuario';
    }

    try {
      const authModule = await import('../api/auth-pdf.js');
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
    }

    // Respaldo: Si falla obtener el perfil o no tiene nombre, formatear el userId
    if (typeof userId === 'string' && userId.includes('@')) {
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

  if (base64.startsWith('data:')) {
    const validPattern = /^data:(image\/[a-z]+);base64,[a-zA-Z0-9+/=]+$/;
    return validPattern.test(base64) ? base64 : '';
  }

  const validBase64 = /^[a-zA-Z0-9+/=]+$/;
  return validBase64.test(base64) ? base64 : '';
}