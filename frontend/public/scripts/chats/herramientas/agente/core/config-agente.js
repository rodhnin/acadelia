/**
 * config.js - Configuración global para el chat de Agente/Matemáticas
 */

// Configuración de UI
export const UI_CONFIG = {
  initialContainerHeight: 129,
  maxTextareaHeight: 200,
  maxContainerHeight: 280,
  errorToastDuration: 3000,
  errorToastFadeTime: 500,
  previewTimeout: 4000, // Tiempo para ocultar la vista previa matemática
};

// Configuración de rutas de API (específicas para Agente)
export const API_ROUTES = {
  authentication: '/api/usuarios/authenticate',
  userProfile: (userId) => `/api/perfil/${userId}`, // Ruta para obtener el perfil del usuario
  chatHistory: (userId, herramientaId) => `/api/chats/chats/${userId}/tool/${herramientaId}`,
  chatMessages: (chatId) => `/api/chats/chats/${chatId}/messages`,
  chatInteraction: (chatId) => `/api/chats/${chatId}/interaction`,
  chatTitle: (chatId) => `/api/chats/chats/${chatId}/title`,
  deleteChat: (chatId) => `/api/chats/chats/${chatId}`,
  createChat: '/api/chats/chats',
  checkTokenLimits: '/api/openai/check-token-limits',  // ← AGREGAR ESTA LÍNEA
  query: '/api/openai/query-agent', // Endpoint específico para Agente
  multimodal: '/api/openai/multimodal-agent', // Nueva ruta para mensajes multimodales
  multimodalWithoutSaving: '/api/openai/multimodal-agent-without-saving'
};

// Configuración de URLs
export const URL_CONFIG = {
  basePath: '/agente', // Ruta base específica para Agente
  chatPath: (chatId) => `/agente/${chatId}` // Ruta completa para un chat específico
};

// Configuración de MathJax
export const MATHJAX_CONFIG = {
  loader: {
    load: ['input/tex', 'output/chtml']
  },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    packages: ['base', 'ams', 'autoload', 'html', 'physics'],
    tags: 'ams',
  },
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'no-math|nostem',
    processHtmlClass: 'mathjax-process'
  },
  startup: {
    typeset: false,
    pageReady: () => {
      return MathJax.startup.defaultPageReady();
    }
  }
};

// Identificadores de aplicación
export const APP_CONFIG = {
  herramientaId: 2, // ID de herramienta para Agente
  assistantName: 'Agente', // Nombre del asistente
  assistantImagePath: '/images/Perfil_claro.gif' // Imagen del asistente
};

// Mensajes para el usuario
export const MESSAGES = {
  errors: {
    authFailed: 'Autenticación fallida',
    loadChatsFailed: 'Error cargando chats',
    loadMessagesFailed: 'Error cargando mensajes',
    createChatFailed: 'Error creando nuevo chat',
    updateChatFailed: 'Error actualizando chat',
    deleteChatFailed: 'Error eliminando chat',
    invalidChat: 'Chat no válido',
    invalidResponse: 'Formato de respuesta inválido del servidor',
    invalidExam: 'Estructura de examen inválida',
    serverError: (status) => `Error del servidor (${status})`,
    processingError: 'Error en el procesamiento',
    mathJaxError: 'Error al renderizar fórmulas matemáticas'
  },
  confirmations: {
    deleteChat: '¿Estás seguro de eliminar este chat?',
    emptyChatModal: 'Este chat está vacío.'
  }
};

// Regex para detectar expresiones LaTeX
export const LATEX_PATTERNS = {
  delimiters: /\$(.*?)\$|\\\((.*?)\\\)|\$\$(.*?)\$\$/,
  commands: /(?:\\(?:,|iint|iiint|lceil|rceil|lfloor|rfloor|binom|leq|geq|frac|int|,?d|partial|lim|sin|cos|tan|cot|sec|csc|theta|pi|infty|sqrt|sum|prod|begin|end|vec|mathcal|ln|log|exp|degree|alpha|beta|gamma|delta|Delta|nabla|pm|mp|otimes|oplus|forall|exists|in|subset|supset|cup|cap|varnothing|neg|wedge|vee|approx|equiv|propto|Gamma|zeta|varphi|text|bar|hat|sigma|mu|angle|triangle|parallel|perp|cong|sim|max|min|gcd|lcm|det|argmax|argmin|to|Rightarrow|times))|(?:\^(?:\{[^}]*\}|[^\s\{\}]))/
};

// Selectores para elementos DOM
export const DOM_SELECTORS = {
  textarea: '.input-box textarea',
  container: '.input-box',
  chatList: '#chatList',
  newChatBtn: '.new-chat-btn',
  sendButton: '.input-box button:nth-child(2)',
  mathButton: '#math-button',
  attachButton: '.attach-btn',
  filePreviewContainer: '.file-preview-container',
  chatMessages: '.chat-messages',
  themeToggle: '#themeToggle',
  body: 'body',
  sidebar: '.sidebar',
  sidebarToggle: '.sidebar-toggle',
  accountItem: '#accountItem',
  imageUpload: '#image-upload',
  documentUpload: '#document-upload',
  previewContainer: '.preview-container',
  mathPanel: '#mathPanel',
  mathEditorContainer: '#math-editor-container',
  latexInput: '#latex-input',
  interactivePreview: '#interactive-preview',
  modals: {
    confirmationModal: '#confirmationModal',
    modalMessage: '#modalMessage',
    modalConfirm: '#modalConfirm',
    modalCancel: '#modalCancel',
    emptyChatModal: '#emptyChatModal',
    emptyModalClose: '#emptyModalClose'
  }
};

export default {
  UI_CONFIG,
  API_ROUTES,
  URL_CONFIG,
  MATHJAX_CONFIG,
  APP_CONFIG,
  MESSAGES,
  LATEX_PATTERNS,
  DOM_SELECTORS
};