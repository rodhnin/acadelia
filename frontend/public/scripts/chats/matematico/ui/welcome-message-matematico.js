//welcome-message.js

import { getState } from '../core/state-matematico.js';
import { validateUUID } from '../../shared/validators.js';
import { createElement, sanitizeText } from '../../shared/dom-helpers.js';
import { getCurrentVariant, getAppConfig, getWelcomeConfig } from '../core/config-matematico.js';

// 🦫 IMPORTAR FUNCIONES DEL SISTEMA UNIFICADO DE ARCHIVOS
import {
  initWelcomeFileAttachments,
  getWelcomeAttachedFiles,
  clearWelcomeAttachedFiles,
  hasWelcomeAttachedFiles,
  transferWelcomeFilesToChat,
  cleanupWelcomeAttachments
} from '../utils/file-attachments-matematico.js';

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

// Configuración por defecto en caso de variante desconocida
const DEFAULT_CONFIG = {
  title: "Bienvenido",
  message: "Soy tu asistente virtual académico. ¿Cómo puedo ayudarte hoy?",
  textareaPlaceholder: "Envía un mensaje a Acadelia",
  assistantLabel: "Asistente Académico",
  cssClass: "default-welcome",
  headerIcon: "bx-bot",
  suggestions: [
    { text: "Crear mapa conceptual sobre este tema", icon: "bx-sitemap" },
    { text: "Generar examen sobre este tema", icon: "bx-book" },
    { text: "Explicar este concepto en detalle", icon: "bx-bulb" },
    { text: "Resolver un problema relacionado", icon: "bx-help-circle" }
  ]
};

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
  // Obtener la configuración de bienvenida usando la función robusta
  const currentVariant = getCurrentVariant();
  const appConfig = getAppConfig();
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
            <button id="welcome-math-button" class="attach-btn welcome-specific-btn">
              <i class='bx bx-math'></i>
              <span class="chat-button-label">Calculadora</span>
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

    // 🦫 CONFIGURAR DRAG & DROP ESPECÍFICO PARA WELCOME (PARA COMPATIBILIDAD)
    const welcomeFileUploadContainer = document.getElementById('welcome-file-upload-container');
    const welcomeDragDropArea = document.getElementById('welcome-drag-drop-area');

    if (welcomeFileUploadContainer && welcomeDragDropArea) {
      // Función específica para manejar archivos en welcome con validación previa
      const handleWelcomeDroppedFiles = async (files) => {
        console.log('🏠 handleWelcomeDroppedFiles - Procesando en bienvenida:', files.length, 'archivos');

        if (!files || files.length === 0) return;

        try {
          let processedCount = 0;
          let errorCount = 0;

          // Validar límite total de archivos
          const currentFiles = document.querySelectorAll('#welcome-file-preview-container .file-preview[data-file-id]').length;
          const totalFiles = currentFiles + files.length;

          if (!validateFileCountLimit(totalFiles)) {
            return;
          }

          // Procesar cada archivo con validación previa
          for (const file of files) {
            try {
              // Validación de tipo usando el sistema unificado
              const typeValidation = validateFileType(file);
              if (!typeValidation.valid) {
                acadelError(
                  "¡Archivo misterioso detectado! 🕵️",
                  `Acadel no reconoce el tipo del archivo "${file.name}". Solo acepta imágenes, documentos y código. ¿Tienes algo más compatible?`
                );
                errorCount++;
                continue;
              }

              // *** VALIDACIÓN DE CONTENIDO ESPECÍFICA PARA WELCOME ***
              if (typeValidation.detectedType === 'document' || typeValidation.detectedType === 'code') {
                let contentToValidate = '';

                if (typeValidation.detectedType === 'document') {
                  const extension = file.name.split('.').pop().toLowerCase();
                  if (extension === 'docx') {
                    const { extractTextFromFile } = await import('../../shared/file-handler.js');
                    contentToValidate = await extractTextFromFile(file);
                  } else {
                    // Para TXT, leer directamente
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

                // Validar límites de contenido
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
              // Crear un objeto File (puede ser el mismo) y enviarlo al sistema unificado
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
          // Solo llamamos al sistema unificado si hay archivos válidos
          if (processedCount > 0) {
            // Filtrar solo archivos válidos para enviar al sistema unificado
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

            // Llamar al sistema unificado con archivos ya validados
            if (window.handleDroppedFiles && validFiles.length > 0) {
              await window.handleDroppedFiles(validFiles);
            }
          }

          // Mostrar resultado final
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
          // Limpiar estados visuales
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      };

      // Configurar eventos de drag & drop específicos para welcome
      // Mostrar al iniciar arrastre
      document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        // Solo si hay archivos y estamos en bienvenida
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

      // Ocultar contenedor al finalizar el arrastre
      document.addEventListener('dragend', () => {
        if (document.querySelector('.welcome-message')) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      // Detectar cuando el arrastre abandona completamente el documento
      document.addEventListener('dragleave', (e) => {
        if (!document.querySelector('.welcome-message')) return;

        // Solo ejecutar si el drag abandona completamente el documento
        if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      // Detectar cuando se presiona la tecla Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.welcome-message') &&
          welcomeFileUploadContainer.classList.contains('active')) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      // Detectar clics fuera del área de drop para ocultar el contenedor
      document.addEventListener('click', (e) => {
        if (!document.querySelector('.welcome-message')) return;

        if (welcomeFileUploadContainer.classList.contains('active') &&
          !welcomeFileUploadContainer.contains(e.target)) {
          welcomeFileUploadContainer.classList.remove('active', 'dragging');
        }
      });

      // Fallback: temporizador para abandonar arrastre
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

      // 🦫 PROCESAR ARCHIVOS SOLTADOS CON LÓGICA ESPECÍFICA DE WELCOME
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

    // 3. Configurar botón de calculadora/matemáticas - VERSIÓN FINAL CORREGIDA
    const welcomeMathButton = document.getElementById('welcome-math-button');
    if (welcomeMathButton) {
      // Eliminar paneles existentes si los hay (para evitar duplicados)
      const existingPanel = document.getElementById('welcome-mathPanel');
      if (existingPanel) existingPanel.remove();

      const existingEditorContainer = document.getElementById('welcome-math-editor-container');
      if (existingEditorContainer) existingEditorContainer.remove();

      // Crear el editor de ecuaciones MathLive (estructura que coincide con el CSS)
      const welcomeMathEditorContainer = document.createElement('div');
      welcomeMathEditorContainer.id = 'welcome-math-editor-container';
      welcomeMathEditorContainer.className = 'welcome-math-editor-container';
      welcomeMathEditorContainer.style.display = 'none'; // Inicialmente oculto

      // Estructura del editor de ecuaciones según la imagen de referencia
      welcomeMathEditorContainer.innerHTML = `
            <div class="welcome-editor-toolbar">
              <div class="welcome-editor-title">Editor De Ecuaciones</div>
              <button class="welcome-toolbar-btn welcome-send-button">Enviar al Chat</button>
            </div>
            <div class="welcome-editor-area">
              <div class="welcome-mathfield-container" id="welcome-mathfield-container">
                <math-field id="welcome-mathfield"></math-field>
              </div>
              <div class="welcome-math-symbols-panel">
                <div class="welcome-symbols-container"></div>
              </div>
            </div>
          `;

      // Crear panel matemático con la estructura completa
      const welcomeMathPanel = document.createElement('div');
      welcomeMathPanel.id = 'welcome-mathPanel';
      welcomeMathPanel.className = 'welcome-math-panel';
      welcomeMathPanel.setAttribute('data-has-math', 'true');
      welcomeMathPanel.style.display = 'none'; // Inicialmente oculto

      // Clonar la estructura completa del panel matemático con los prefijos correctos
      welcomeMathPanel.innerHTML = `
          <div class="welcome-math-grid">
            <!-- Cálculo -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Cálculo</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\int_a^b f(x)dx">
                <span class="welcome-math-preview" data-has-math="true">\\(\\int_a^b f(x)dx\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\iint_D f(x,y)dxdy">
                <span class="welcome-math-preview" data-has-math="true">\\(\\iint_D f(x,y)dxdy\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\iiint_V f(x,y,z)dxdydz">
                <span class="welcome-math-preview" data-has-math="true">\\(\\iiint_V f(x,y,z)dxdydz\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\frac{d}{dx}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\frac{d}{dx}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\frac{d^2}{dx^2}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\frac{d^2}{dx^2}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\frac{\\partial}{\\partial x}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\frac{\\partial}{\\partial x}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\frac{\\partial^2}{\\partial x^2}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\frac{\\partial^2}{\\partial x^2}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\frac{\\partial^2}{\\partial x \\partial y}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\frac{\\partial^2}{\\partial x \\partial y}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\lim_{x \\to a} f(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\lim_{x \\to a}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\lim_{x \\to \\infty} f(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\lim_{x \\to \\infty}\\)</span>
              </button>
            </div>
    
            <!-- Transformadas -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Transformadas</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\mathcal{L}\\{f(t)\\}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\mathcal{L}\\{f(t)\\}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\mathcal{L}^{-1}\\{F(s)\\}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\mathcal{L}^{-1}\\{F(s)\\}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\mathcal{F}\\{f(t)\\}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\mathcal{F}\\{f(t)\\}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\mathcal{F}^{-1}\\{F(\\omega)\\}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\mathcal{F}^{-1}\\{F(\\omega)\\}\\)</span>
              </button>
            </div>
    
            <!-- Trigonometría -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Trigonometría</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\sin(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\sin(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cos(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cos(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\tan(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\tan(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\csc(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\csc(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\sec(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\sec(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cot(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cot(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\arcsin(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\arcsin(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\arccos(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\arccos(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\arctan(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\arctan(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\sinh(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\sinh(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cosh(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cosh(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\tanh(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\tanh(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\arcsinh(\\theta)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\text{arcsinh}(\\theta)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\pi">
                <span class="welcome-math-preview" data-has-math="true">\\(\\pi\\)</span>
              </button>
            </div>
    
            <!-- Lógica y Conjuntos -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Lógica</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\forall">
                <span class="welcome-math-preview" data-has-math="true">\\(\\forall\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\exists">
                <span class="welcome-math-preview" data-has-math="true">\\(\\exists\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\in">
                <span class="welcome-math-preview" data-has-math="true">\\(\\in\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\subset">
                <span class="welcome-math-preview" data-has-math="true">\\(\\subset\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cup">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cup\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cap">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cap\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\varnothing">
                <span class="welcome-math-preview" data-has-math="true">\\(\\varnothing\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\neg">
                <span class="welcome-math-preview" data-has-math="true">\\(\\neg\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\wedge">
                <span class="welcome-math-preview" data-has-math="true">\\(\\wedge\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\vee">
                <span class="welcome-math-preview" data-has-math="true">\\(\\vee\\)</span>
              </button>
            </div>
            
            <!-- Desigualdades -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Desigualdades</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\geq">
                <span class="welcome-math-preview" data-has-math="true">\\(\\geq\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\leq">
                <span class="welcome-math-preview" data-has-math="true">\\(\\leq\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex=">">
                <span class="welcome-math-preview" data-has-math="true">\\(>\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="<">
                <span class="welcome-math-preview" data-has-math="true">\\(<\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\neq">
                <span class="welcome-math-preview" data-has-math="true">\\(\\neq\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\approx">
                <span class="welcome-math-preview" data-has-math="true">\\(\\approx\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\equiv">
                <span class="welcome-math-preview" data-has-math="true">\\(\\equiv\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\propto">
                <span class="welcome-math-preview" data-has-math="true">\\(\\propto\\)</span>
              </button>
            </div>
    
            <!-- Funciones Especiales -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Funciones Especiales</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\Gamma(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\Gamma(x)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\zeta(s)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\zeta(s)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\varphi(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\varphi(x)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\text{erf}(x)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\text{erf}(x)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\text{Re}(z)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\text{Re}(z)\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\text{Im}(z)">
                <span class="welcome-math-preview" data-has-math="true">\\(\\text{Im}(z)\\)</span>
              </button>
            </div>
    
            <!-- Geometría -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Geometría</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\angle">
                <span class="welcome-math-preview" data-has-math="true">\\(\\angle\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\triangle">
                <span class="welcome-math-preview" data-has-math="true">\\(\\triangle\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\parallel">
                <span class="welcome-math-preview" data-has-math="true">\\(\\parallel\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\perp">
                <span class="welcome-math-preview" data-has-math="true">\\(\\perp\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\cong">
                <span class="welcome-math-preview" data-has-math="true">\\(\\cong\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\sim">
                <span class="welcome-math-preview" data-has-math="true">\\(\\sim\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\circ">
                <span class="welcome-math-preview" data-has-math="true">\\(\\circ\\)</span>
              </button>
            </div>
    
            <!-- Física -->
            <div class="welcome-section-header">
              <div class="welcome-math-section">Física</div>
              <button class="welcome-toggle-btn">▼</button>
            </div>
            <div class="welcome-section-content">
              <button class="welcome-math-btn" data-latex="\\vec{v}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\vec{v}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\hat{n}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\hat{n}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\nabla \\cdot \\vec{F}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\nabla \\cdot \\vec{F}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\nabla \\times \\vec{F}">
                <span class="welcome-math-preview" data-has-math="true">\\(\\nabla \\times \\vec{F}\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\hbar">
                <span class="welcome-math-preview" data-has-math="true">\\(\\hbar\\)</span>
              </button>
              <button class="welcome-math-btn" data-latex="\\partial">
                <span class="welcome-math-preview" data-has-math="true">\\(\\partial\\)</span>
              </button>
            </div>
          </div>
          <div class="welcome-editor-toolbar">
            <div class="welcome-editor-title">Fórmulas Matemáticas</div>
            <button class="welcome-toolbar-btn welcome-send-button">Insertar</button>
            <button class="welcome-math-close-btn" aria-label="Cerrar panel">×</button>
          </div>
          `;

      // Añadir los elementos al DOM
      document.body.appendChild(welcomeMathPanel);
      document.body.appendChild(welcomeMathEditorContainer);

      // Versión mejorada del protector global
      const globalKeyboardProtector = function (e) {
        // Solo intervenir si el editor está abierto
        if (welcomeMathEditorContainer.style.display === 'flex' ||
          welcomeMathEditorContainer.style.display === 'block') {

          // CLAVE: No bloquear ningún evento si viene del mathfield
          // Esto permite que todas las teclas funcionen dentro del editor
          if (e.target.tagName === 'MATH-FIELD' ||
            e.target.closest('#welcome-mathfield-container')) {
            // Permitir que todos los eventos funcionen normalmente en el mathfield
            return;
          }

          // Solo bloquear eventos si vienen del teclado virtual
          if (e.target.closest('ml-keyboard') ||
            e.target.closest('.ML__keyboard')) {

            // Bloquear propagación para eventos del teclado virtual
            e.stopPropagation();

            // Permitir Escape para cerrar intencionalmente
            if (e.key === 'Escape') {
              welcomeMathEditorContainer.style.display = 'none';
              welcomeMathPanel.style.display = 'none';
              welcomeMathButton.classList.remove('active');
            } else {
              e.stopImmediatePropagation();
            }
          }
        }
      };

      // Añadir el listener en fase de captura
      document.addEventListener('keydown', globalKeyboardProtector, true);

      // Variable para almacenar referencia al mathfield
      let welcomeMathField = null;

      // Modifica la función initWelcomeMathField para permitir que todas las teclas funcionen
      function initWelcomeMathField() {
        const mathfieldElement = document.getElementById('welcome-mathfield');
        if (!mathfieldElement) return null;

        try {
          // Verificar si MathLive está disponible
          if (!window.MathLive) {
            console.warn('MathLive no está disponible');
            return null;
          }

          // Configuración básica sin cambios
          mathfieldElement.setAttribute('virtual-keyboard-mode', 'manual');
          mathfieldElement.setAttribute('smart-fence', 'true');
          mathfieldElement.setAttribute('smart-mode', 'true');
          mathfieldElement.setAttribute('math-mode-space', 'true');
          mathfieldElement.setAttribute('keypress-vibration', 'false');

          // SOLUCIÓN CLAVE: No agregar ningún manejador de eventos que bloquee
          // las teclas del teclado físico en el mathfield

          // En lugar de eso, asegurar que el mathfield tiene foco
          setTimeout(() => {
            mathfieldElement.focus();
          }, 100);

          return mathfieldElement;
        } catch (e) {
          console.error('Error al inicializar MathField:', e);
          return null;
        }
      }

      // Variable global para controlar función de inserción
      window.welcomeInsertLatex = function (latex) {
        const textarea = document.getElementById('welcome-message-input');
        if (!textarea) return;

        // Si tenemos un mathfield activo, insertar allí
        if (welcomeMathField && welcomeMathEditorContainer.style.display === 'flex') {
          try {
            welcomeMathField.executeCommand(['insert', latex]);
            welcomeMathField.focus();
            return;
          } catch (e) {
            console.error('Error al insertar en MathField:', e);
          }
        }

        // Formatear LaTeX con delimitadores si no los tiene
        if (!latex.startsWith('$') && !latex.startsWith('\\(')) {
          latex = '$' + latex + '$';
        }

        // Insertar en el textarea
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        textarea.value = value.substring(0, start) + latex + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + latex.length;
        textarea.focus();

        // Disparar evento input para activar autoexpand
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Ocultar panel después de insertar
        welcomeMathPanel.style.display = 'none';
        welcomeMathEditorContainer.style.display = 'none';
        welcomeMathButton.classList.remove('active');
      };

      // Configurar eventos de toggle para secciones
      function setupSectionToggles(container) {
        const toggleButtons = container.querySelectorAll('.welcome-toggle-btn');

        toggleButtons.forEach(button => {
          button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const header = this.closest('.welcome-section-header');
            if (!header) return;

            const content = header.nextElementSibling;
            if (!content || !content.classList.contains('welcome-section-content')) return;

            // Toggle visibilidad
            const isCollapsed = content.classList.contains('collapsed');
            content.classList.toggle('collapsed', !isCollapsed);

            // Actualizar ícono
            this.textContent = isCollapsed ? '▼' : '▶';
            this.classList.toggle('collapsed', !isCollapsed);

            // Renderizar matemáticas si se expande
            if (isCollapsed) {
              setTimeout(() => renderWelcomeMathInSection(content), 50);
            }
          });
        });
      }

      // Función para renderizar matemáticas en una sección
      function renderWelcomeMathInSection(section) {
        if (!window.MathJax) return;

        try {
          if (window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([section])
              .catch(err => console.warn('Error al renderizar sección:', err));
          } else if (window.MathJax.Hub) {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, section]);
          }
        } catch (e) {
          console.warn('Error al renderizar matemáticas:', e);
        }
      }

      function setupFormulaButtons(container) {
        const mathButtons = container.querySelectorAll('.welcome-math-btn');

        mathButtons.forEach(button => {
          button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const latex = this.getAttribute('data-latex');
            if (!latex) return;

            // Usar la función global de inserción
            window.welcomeInsertLatex(latex);

            // NUEVO: Re-enfocar el campo para mantener el teclado activo
            if (welcomeMathField && welcomeMathEditorContainer.style.display === 'flex') {
              setTimeout(() => {
                welcomeMathField.focus();

                // Verificar y proteger el teclado de nuevo
                const keyboard = document.querySelector('ml-keyboard');
                if (keyboard) protectVirtualKeyboard(keyboard);
              }, 20);

              // Prevenir el cierre del panel
              e.stopImmediatePropagation();
              return false;
            }
          });
        });
      }

      function protectVirtualKeyboard(keyboard) {
        if (!keyboard || keyboard._protected) return;

        keyboard._protected = true;

        // MEJORA: Aumentar el z-index y fijar posición
        keyboard.style.zIndex = '20000'; // Valor más alto para estar encima del panel
        keyboard.style.position = 'fixed';
        keyboard.style.bottom = '0';
        keyboard.style.left = '0';
        keyboard.style.width = '100%';

        // Código original - mantenerlo intacto
        keyboard.addEventListener('click', (e) => {
          e.stopPropagation();
        }, true);

        keyboard.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        }, true);

        ['keydown', 'keyup', 'keypress'].forEach(eventType => {
          keyboard.addEventListener(eventType, (e) => {
            e.stopPropagation();
          }, true);
        });

        // También proteger las teclas individuales - código original
        keyboard.querySelectorAll('button, .ML__keyboard-key').forEach(key => {
          key.addEventListener('click', (e) => {
            e.stopPropagation();
          }, true);
        });
      }

      // Configurar eventos para el editor
      const setupEditor = () => {
        // Inicializar MathField si aún no está inicializado
        if (!welcomeMathField) {
          welcomeMathField = initWelcomeMathField();

          // NUEVO: Configurar manejo específico del teclado virtual
          if (welcomeMathField) {
            // Manejar eventos específicos para evitar cierre accidental
            welcomeMathField.addEventListener('focus', () => {
              // Al obtener el foco, verificar si aparece el teclado virtual
              setTimeout(() => {
                const keyboard = document.querySelector('ml-keyboard');
                if (keyboard) {
                  protectVirtualKeyboard(keyboard);
                }
              }, 300); // Dar tiempo para que el teclado aparezca
            });

            // Interceptar el toggle del teclado virtual para protegerlo cuando aparezca
            const originalToggleVirtualKeyboard = welcomeMathField.toggleVirtualKeyboard;
            if (typeof originalToggleVirtualKeyboard === 'function') {
              welcomeMathField.toggleVirtualKeyboard = function () {
                // Llamar al método original
                const result = originalToggleVirtualKeyboard.apply(this, arguments);

                // Proteger el teclado después de que aparezca
                setTimeout(() => {
                  const keyboard = document.querySelector('ml-keyboard');
                  if (keyboard) {
                    protectVirtualKeyboard(keyboard);
                  }
                }, 100);

                return result;
              };
            }
          }
        }

        // Configurar el botón de enviar en el editor
        const editorSendButton = welcomeMathEditorContainer.querySelector('.welcome-send-button');
        if (editorSendButton) {
          editorSendButton.addEventListener('click', () => {
            if (!welcomeMathField) return;

            // Obtener contenido LaTeX
            const latex = welcomeMathField.value.trim();
            if (!latex) return;

            // Formatear e insertar en textarea
            let formattedLatex = latex;
            if (!formattedLatex.startsWith('$') && !formattedLatex.startsWith('\\(')) {
              formattedLatex = '$' + formattedLatex + '$';
            }

            // Insertar en textarea
            const textarea = document.getElementById('welcome-message-input');
            if (textarea) {
              const start = textarea.selectionStart;
              const text = textarea.value;

              textarea.value = text.substring(0, start) + formattedLatex + text.substring(start);
              textarea.selectionStart = textarea.selectionEnd = start + formattedLatex.length;
              textarea.focus();
              textarea.dispatchEvent(new Event('input', { bubbles: true }));

              // Limpiar y ocultar editor
              welcomeMathField.value = '';
              welcomeMathEditorContainer.style.display = 'none';
              welcomeMathButton.classList.remove('active');
            }
          });
        }

        // Clonar el contenido del panel para el panel de símbolos
        const symbolsContainer = welcomeMathEditorContainer.querySelector('.welcome-symbols-container');
        if (symbolsContainer && !symbolsContainer.hasChildNodes()) {
          const mathGridClone = welcomeMathPanel.querySelector('.welcome-math-grid').cloneNode(true);
          symbolsContainer.appendChild(mathGridClone);

          // Configurar eventos para los símbolos
          setupSectionToggles(symbolsContainer);
          setupFormulaButtons(symbolsContainer);

          // Colapsar todas las secciones por defecto
          symbolsContainer.querySelectorAll('.welcome-section-content').forEach(section => {
            section.classList.add('collapsed');
          });

          symbolsContainer.querySelectorAll('.welcome-toggle-btn').forEach(btn => {
            btn.textContent = '▶';
            btn.classList.add('collapsed');
          });
        }
      };

      // Configurar botón de enviar en el panel matemático
      const panelSendButton = welcomeMathPanel.querySelector('.welcome-send-button');
      if (panelSendButton) {
        panelSendButton.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          // Cerrar el panel sin insertar nada
          welcomeMathPanel.style.display = 'none';
          welcomeMathButton.classList.remove('active');
        });
      }

      // Configurar botón de cierre en el panel matemático
      const closeButton = welcomeMathPanel.querySelector('.welcome-math-close-btn');
      if (closeButton) {
        closeButton.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          welcomeMathPanel.style.display = 'none';
          welcomeMathButton.classList.remove('active');
        });
      }
      // Variables para mantener el estado y los controladores de eventos
      let keydownHandler = null;
      let clickOutsideHandler = null;

      // Crear un overlay invisible para capturar todos los eventos
      function createMathEditorOverlay() {
        // Eliminar si ya existe
        const existingOverlay = document.getElementById('math-editor-event-blocker');
        if (existingOverlay) existingOverlay.remove();

        // Crear nuevo overlay
        const overlay = document.createElement('div');
        overlay.id = 'math-editor-event-blocker';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'transparent';
        overlay.style.zIndex = '9998'; // Justo por debajo del editor
        overlay.style.pointerEvents = 'all'; // Captura todos los eventos de ratón

        // Capturar todos los eventos de teclado en el overlay directamente
        overlay.addEventListener('keydown', (e) => {
          // Permitir Escape para cerrar el panel
          if (e.key === 'Escape') return;

          // Bloquear propagación para todos los demás eventos
          e.stopPropagation();
          e.stopImmediatePropagation();
        }, true);

        // Devolver el overlay para adjuntarlo cuando se necesite
        return overlay;
      }

      // Configurar evento de clic para el botón principal
      // Configurar evento de clic para el botón principal
      welcomeMathButton.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Detectar si alguno de los paneles está visible
        const isPanelVisible = welcomeMathPanel.style.display === 'block';
        const isEditorVisible = welcomeMathEditorContainer.style.display === 'flex';

        // LIMPIAR HANDLERS ANTERIORES
        if (keydownHandler) {
          document.removeEventListener('keydown', keydownHandler, true);
          keydownHandler = null;
        }
        if (clickOutsideHandler) {
          document.removeEventListener('click', clickOutsideHandler);
          clickOutsideHandler = null;
        }

        // Eliminar overlay si existe
        const existingOverlay = document.getElementById('math-editor-event-blocker');
        if (existingOverlay) existingOverlay.remove();

        if (isPanelVisible || isEditorVisible) {
          // Cerrar ambos paneles
          welcomeMathPanel.style.display = 'none';
          welcomeMathEditorContainer.style.display = 'none';
          welcomeMathButton.classList.remove('active');

          // Eliminar cualquier teclado virtual que pueda existir
          const keyboard = document.querySelector('ml-keyboard');
          if (keyboard && keyboard.parentNode) {
            keyboard.parentNode.removeChild(keyboard);
          }
        } else {
          // Mostrar el editor en lugar del panel
          welcomeMathEditorContainer.style.display = 'flex';
          welcomeMathButton.classList.add('active');

          // CAMBIO IMPORTANTE: Posicionar el editor en la parte superior pero dejando espacio para el teclado virtual
          welcomeMathEditorContainer.style.position = 'fixed';
          welcomeMathEditorContainer.style.bottom = '40%'; // Colocar en mitad superior de la pantalla
          welcomeMathEditorContainer.style.left = '70%';
          welcomeMathEditorContainer.style.right = '0';
          welcomeMathEditorContainer.style.maxHeight = '45vh'; // Limitar altura
          welcomeMathEditorContainer.style.overflowY = 'auto'; // Permitir scroll si necesario
          welcomeMathEditorContainer.style.zIndex = '11';

          // No necesitamos overlay que cubra toda la pantalla
          // En su lugar, usamos uno que solo bloquee la parte superior
          const overlay = document.createElement('div');
          overlay.id = 'math-editor-event-blocker';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100vw';
          overlay.style.height = '50vh'; // Solo cubre mitad superior
          overlay.style.zIndex = '10';
          overlay.style.pointerEvents = 'all';
          document.body.appendChild(overlay);

          // Configurar el editor
          setupEditor();

          // NUEVO: Detector especializado para el teclado virtual
          const keyboardObserver = new MutationObserver((mutations) => {
            const keyboard = document.querySelector('ml-keyboard');
            if (keyboard && !keyboard._protected) {

              // Marcar como protegido
              keyboard._protected = true;

              // CLAVE: Forzar posición y z-index para el teclado
              keyboard.style.position = 'fixed';
              keyboard.style.bottom = '0';
              keyboard.style.left = '0';
              keyboard.style.width = '100%';
              keyboard.style.zIndex = '10000'; // Siempre sobre todo

              // Evitar propagación de eventos
              keyboard.addEventListener('mousedown', e => e.stopPropagation(), true);
              keyboard.addEventListener('click', e => e.stopPropagation(), true);
              keyboard.addEventListener('keydown', e => e.stopPropagation(), true);

              // Aislar completamente el teclado virtual
              const keyboardKeys = keyboard.querySelectorAll('.ML__keyboard-key, button, *');
              keyboardKeys.forEach(key => {
                key.addEventListener('click', e => {
                  e.stopPropagation();
                }, true);
              });
            }
          });

          // Observar cambios para detectar aparición del teclado
          keyboardObserver.observe(document.body, {
            childList: true,
            subtree: true
          });

          // Manejar clic fuera solo para la mitad superior
          overlay.addEventListener('click', (event) => {
            if (!welcomeMathEditorContainer.contains(event.target) &&
              event.target !== welcomeMathButton) {

              // Cerrar editor y limpiar
              welcomeMathEditorContainer.style.display = 'none';
              welcomeMathButton.classList.remove('active');
              overlay.remove();

              // Desconectar observer
              keyboardObserver.disconnect();

              // IMPORTANTE: No cerramos el teclado virtual automáticamente
              // para evitar interferir con el mathfield
            }
          });

          // Enfocar el campo para activar el teclado
          if (welcomeMathField) {
            setTimeout(() => {
              welcomeMathField.focus();
            }, 100);
          }
        }
      });

      // Limpiar recursos al cerrar
      function cleanupMathEditorEvents() {
        // Eliminar protector global
        document.removeEventListener('keydown', globalKeyboardProtector, true);

        // Eliminar overlay
        const overlay = document.getElementById('math-editor-event-blocker');
        if (overlay) overlay.remove();

        // IMPORTANTE: Restaurar posición original del editor
        if (welcomeMathEditorContainer) {
          welcomeMathEditorContainer.style.position = '';
          welcomeMathEditorContainer.style.bottom = '';
          welcomeMathEditorContainer.style.top = '';
          welcomeMathEditorContainer.style.left = '';
          welcomeMathEditorContainer.style.right = '';
          welcomeMathEditorContainer.style.maxHeight = '';
          welcomeMathEditorContainer.style.overflowY = '';
          welcomeMathEditorContainer.style.zIndex = '';
        }

        if (welcomeMathPanel) {
          welcomeMathPanel.style.zIndex = '';
        }

        // Limpiar handlers
        if (keydownHandler) {
          document.removeEventListener('keydown', keydownHandler, true);
          keydownHandler = null;
        }
        if (clickOutsideHandler) {
          document.removeEventListener('click', clickOutsideHandler);
          clickOutsideHandler = null;
        }

        // El teclado virtual se limpiará automáticamente al quitar el foco
      }

      // Eventos de limpieza
      window.addEventListener('popstate', function () {
        welcomeMathPanel.style.display = 'none';
        welcomeMathEditorContainer.style.display = 'none';
        welcomeMathButton.classList.remove('active');
        cleanupMathEditorEvents();
      });

      const welcomeSendBtn = document.getElementById('welcome-send-btn');
      if (welcomeSendBtn) {
        welcomeSendBtn.addEventListener('click', function () {
          welcomeMathPanel.style.display = 'none';
          welcomeMathEditorContainer.style.display = 'none';
          welcomeMathButton.classList.remove('active');
          cleanupMathEditorEvents();
        });
      }

      document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
          welcomeMathPanel.style.display = 'none';
          welcomeMathEditorContainer.style.display = 'none';
          welcomeMathButton.classList.remove('active');
          cleanupMathEditorEvents();
        });
      });

      // Asegurar limpieza cuando se elimina el panel
      const welcomeObserver = new MutationObserver((mutations) => {
        if (!document.body.contains(welcomeMathEditorContainer) ||
          !document.body.contains(welcomeMathPanel)) {
          cleanupMathEditorEvents();
          welcomeObserver.disconnect();
        }
      });

      // Observar cambios en el DOM para detectar eliminación de elementos
      welcomeObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // 4. 🦫 CONFIGURAR BOTÓN DE ENVÍO CON SISTEMA UNIFICADO
    const welcomeSendBtn = document.getElementById('welcome-send-btn');
    if (welcomeSendBtn && welcomeTextarea) {
      // ✅ PROTECCIÓN CONTRA EJECUCIÓN MÚLTIPLE
      let isTransferring = false;

      // Función principal para transferir y enviar mensaje - VERSIÓN SIMPLIFICADA CON SISTEMA UNIFICADO
      const transferAndSendMessage = async () => {
        // ✅ VERIFICAR SI YA ESTÁ EN PROGRESO
        if (isTransferring) {
          console.log('🚫 Transferencia ya en progreso, ignorando');
          return;
        }

        isTransferring = true;

        try {
          // PRIMERO: cerrar panel matemático si está abierto
          if (document.getElementById('welcome-mathPanel')) {
            document.getElementById('welcome-mathPanel').style.display = 'none';
          }
          if (document.getElementById('welcome-math-editor-container')) {
            document.getElementById('welcome-math-editor-container').style.display = 'none';
          }
          // Desactivar botón matemático
          const mathButton = document.getElementById('welcome-math-button');
          if (mathButton) {
            mathButton.classList.remove('active');
          }

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
            const mathButton = document.querySelector('#math-button');
            if (sendButton) sendButton.style.pointerEvents = 'auto';
            if (mathButton) mathButton.style.pointerEvents = 'auto';

            // Esperar un instante para que la UI se actualice
            setTimeout(() => {
              // 4. Eliminar elementos de bienvenida
              if (welcomeDiv && welcomeDiv.parentNode) welcomeDiv.remove();
              if (welcomeInputContainer && welcomeInputContainer.parentNode) welcomeInputContainer.remove();
              if (suggestionsDiv && suggestionsDiv.parentNode) suggestionsDiv.remove();

              // 🦫 LIMPIAR SISTEMA UNIFICADO DE WELCOME
              cleanupWelcomeAttachments();

              // ⭐ NOTIFICACIÓN ACADEL:
              acadelExito("🚀 ¡Mensaje enviado!", "Acadel transfirió tu consulta al chat principal");

              if (sendMessageHandler) {
                sendMessageHandler();
              } else {
                acadelError(
                  "¡Ups! Sistema confundido 🤖",
                  "Acadel no encontró la forma de enviar tu mensaje. Esto es raro... ¿puedes intentar refrescar la página?"
                );
              }
            }, 50);
          }
        } finally {
          // ✅ LIBERAR FLAG DESPUÉS DE UN DELAY
          setTimeout(() => {
            isTransferring = false;
          }, 200);
        }
      };

      // ✅ LIMPIAR LISTENERS EXISTENTES ANTES DE AGREGAR NUEVOS
      const existingClickListener = welcomeSendBtn.onclick;
      if (existingClickListener) {
        welcomeSendBtn.removeEventListener('click', existingClickListener);
      }

      // Configurar eventos con funciones explícitas (no usar referencias directas)
      welcomeSendBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation(); // ✅ EVITAR PROPAGACIÓN
        transferAndSendMessage();
      });

      welcomeTextarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation(); // ✅ EVITAR PROPAGACIÓN
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
      const authModule = await import('../api/auth-matematico.js');
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