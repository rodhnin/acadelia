/**
 * config.js - Configuración global de la aplicación
 */

// Configuración de URLs
export const URL_CONFIG = {
  basePath: '/pdf', // Ruta base específica para pdf
  chatPath: (chatId) => `/pdf/${chatId}` // Ruta completa para un chat específico
};

// Identificadores de aplicación
export const APP_CONFIG = {
  herramientaId: 1, // ID de herramienta para PDF
  assistantName: 'PDF', // Nombre del asistente
  assistantImagePath: '/images/Perfil_claro.gif' // Imagen del asistente
};

// Configuración de UI
export const UI_CONFIG = {
  initialContainerHeight: 129,
  maxTextareaHeight: 200,
  maxContainerHeight: 280,
  errorToastDuration: 3000,
  errorToastFadeTime: 500
};

// Configuración de rutas de API
export const API_ROUTES = {
  authentication: '/api/usuarios/authenticate',
  userProfile: (userId) => `/api/perfil/${userId}`, // Ruta para obtener el perfil del usuario
  chatHistory: (userId, herramientaId) => `/api/chats/chats/${userId}/tool/${herramientaId}`,
  chatMessages: (chatId) => `/api/chats/chats/${chatId}/messages`,
  chatTitle: (chatId) => `/api/chats/chats/${chatId}/title`,
  chatInteraction: (chatId) => `/api/chats/${chatId}/interaction`,
  deleteChat: (chatId) => `/api/chats/chats/${chatId}`,
  createChat: '/api/chats/chats',
  checkTokenLimits: '/api/openai/check-token-limits',  // ← AGREGAR ESTA LÍNEA
  query: '/api/openai/query-pdf',
  multimodal: '/api/openai/multimodal-pdf',
  multimodalWithoutSaving: '/api/openai/multimodal-pdf-without-saving'
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
    processingError: 'Error en el procesamiento'
  },
  confirmations: {
    deleteChat: '¿Estás seguro de eliminar este chat?',
    emptyChatModal: 'Este chat está vacío.'
  }
};

// Selectores para elementos DOM
export const DOM_SELECTORS = {
  textarea: '.input-box textarea',
  container: '.input-box',
  chatList: '#chatList',
  newChatBtn: '.new-chat-btn',
  sendButton: '.input-box button:nth-child(2)',
  chatMessages: '.chat-messages',
  attachButton: '.attach-btn', 
  filePreviewContainer: '.file-preview-container',
  imageUpload: '#image-upload',
  documentUpload: '#document-upload',
  themeToggle: '#themeToggle',
  body: 'body',
  sidebar: '.sidebar',
  sidebarToggle: '.sidebar-toggle',
  accountItem: '#accountItem',
  modals: {
    confirmationModal: '#confirmationModal',
    modalMessage: '#modalMessage',
    modalConfirm: '#modalConfirm',
    modalCancel: '#modalCancel',
    emptyChatModal: '#emptyChatModal',
    emptyModalClose: '#emptyModalClose'
  }
};

// Regex para detectar expresiones LaTeX (común para todas las variantes)
export const LATEX_PATTERNS = {
  delimiters: /\$(.*?)\$|\\\((.*?)\\\)|\$\$(.*?)\$\$/,
  commands: /(?:\\(?:,|iint|iiint|lceil|rceil|lfloor|rfloor|binom|leq|geq|frac|int|,?d|partial|lim|sin|cos|tan|cot|sec|csc|theta|pi|infty|sqrt|sum|prod|begin|end|vec|mathcal|ln|log|exp|degree|alpha|beta|gamma|delta|Delta|nabla|pm|mp|otimes|oplus|forall|exists|in|subset|supset|cup|cap|varnothing|neg|wedge|vee|approx|equiv|propto|Gamma|zeta|varphi|text|bar|hat|sigma|mu|angle|triangle|parallel|perp|cong|sim|max|min|gcd|lcm|det|argmax|argmin|to|Rightarrow|times))|(?:\^(?:\{[^}]*\}|[^\s\{\}]))/
};

export default {
  URL_CONFIG,
  UI_CONFIG,
  API_ROUTES,
  MESSAGES,
  DOM_SELECTORS
};