// Utilidades específicas para validación y manejo de herramientas


import { isValidUUID } from "./validators.js";

import {
  SUPPORTED_FILES,
  createSupportedMimeTypesConfig,
  validateFileTypeBackend,
  inferMimeTypeFromExtensionBackend
} from "./backend-file-constants.js";

/**
 * Mapeo de tipos de herramientas a IDs
 */
export const TOOL_TYPE_MAP = {
  'agent': 2,
  'pdf': 1
};

/**
 * IDs válidos de herramientas
 */
export const VALID_HERRAMIENTA_IDS = [1, 2]; // PDF=1, Agent=2

/**
 * ✅ USAR CONFIGURACIÓN CENTRALIZADA EN LUGAR DE DUPLICAR
 * Obtiene tipos de documento soportados desde backend-file-constants.js
 */
export const getSupportedDocumentTypes = () => {
  const supportedMimeTypesConfig = createSupportedMimeTypesConfig();
  
  return {
    mimeTypes: [
      // Documentos
      ...Object.keys(SUPPORTED_FILES.DOCUMENTS.mimeTypes),
      // Código
      ...Object.keys(SUPPORTED_FILES.CODE.mimeTypes)
    ],
    extensions: [
      // Documentos
      ...SUPPORTED_FILES.DOCUMENTS.extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`),
      // Código  
      ...SUPPORTED_FILES.CODE.extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`)
    ]
  };
};

/**
 * ✅ FUNCIÓN ACTUALIZADA QUE USA LA CONFIGURACIÓN CENTRALIZADA
 * Verifica si un tipo MIME corresponde a un documento soportado
 */
export const isSupportedDocumentType = (mimeType) => {
  const supportedTypes = getSupportedDocumentTypes();
  return supportedTypes.mimeTypes.includes(mimeType);
};

/**
 * ✅ FUNCIÓN ACTUALIZADA QUE USA LA CONFIGURACIÓN CENTRALIZADA
 * Verifica si una extensión corresponde a un documento soportado
 */
export const isSupportedDocumentExtension = (extension) => {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  const supportedTypes = getSupportedDocumentTypes();
  return supportedTypes.extensions.includes(normalizedExt.toLowerCase());
};

/**
 * Verifica si un string es un UUID versión 4 válido
 */
export const isValidUUIDv4 = (uuid) => {
  if (!isValidUUID(uuid)) return false;
  
  const normalizedUUID = uuid.replace(/-/g, '').toLowerCase();
  const version = parseInt(normalizedUUID[12], 16);
  const variant = parseInt(normalizedUUID[16], 16);
  
  return version === 4 && variant >= 8 && variant <= 11;
};

/**
 * Detecta si un item de contenido es un documento
 */
export const isDocumentItem = (item) => {
  if (!item || typeof item !== 'object') return false;
  
  if (item.type === 'file' || item.type === 'document' || item.type === 'application') {
    return true;
  }
  
  if (item.file_url || item.data_url) {
    // Si tiene información de tipo MIME, verificar que sea documento
    if (item.mime_type || item.mimeType) {
      const mimeType = item.mime_type || item.mimeType;
      return isSupportedDocumentType(mimeType);
    }
    
    // Si tiene nombre de archivo, verificar extensión
    if (item.name || item.filename) {
      const filename = item.name || item.filename;
      const extension = filename.split('.').pop();
      return isSupportedDocumentExtension(extension);
    }
    
    // Si es data URL, verificar el tipo MIME en la URL
    if (item.data_url && typeof item.data_url === 'string') {
      const mimeMatch = item.data_url.match(/^data:([^;]+);/);
      if (mimeMatch) {
        return isSupportedDocumentType(mimeMatch[1]);
      }
    }
  }
  
  return false;
};

/**
 * Extrae información de archivos del contenido multimodal
 * @param {Array} content - Contenido multimodal
 * @returns {Object} - Información de archivos
 */
export const extractFileInfo = (content) => {
  if (!Array.isArray(content)) {
    return {
      hasImages: false,
      hasDocuments: false,
      imageCount: 0,
      documentCount: 0,
      totalFiles: 0
    };
  }
  
  const images = content.filter(item => item.type === 'image_url');
  const documents = content.filter(item => isDocumentItem(item));
  
  return {
    hasImages: images.length > 0,
    hasDocuments: documents.length > 0,
    imageCount: images.length,
    documentCount: documents.length,
    totalFiles: images.length + documents.length,
    images,
    documents
  };
};

/**
 * Genera un resumen de los archivos adjuntos para logging (específico para herramientas)
 * @param {Array} content - Contenido multimodal
 * @returns {string} - Resumen de archivos
 */
export const generateAttachmentsSummary = (content) => {
  const fileInfo = extractFileInfo(content);
  
  if (fileInfo.totalFiles === 0) {
    return "Sin archivos adjuntos";
  }
  
  const parts = [];
  
  if (fileInfo.hasImages) {
    parts.push(`${fileInfo.imageCount} imagen${fileInfo.imageCount !== 1 ? 'es' : ''}`);
  }
  
  if (fileInfo.hasDocuments) {
    const docNames = fileInfo.documents
      .map(doc => doc.name || doc.filename || 'documento')
      .slice(0, 3); // Mostrar solo los primeros 3
    
    const docSummary = docNames.join(', ');
    const remaining = fileInfo.documentCount - docNames.length;
    
    parts.push(`${fileInfo.documentCount} documento${fileInfo.documentCount !== 1 ? 's' : ''} (${docSummary}${remaining > 0 ? ` y ${remaining} más` : ''})`);
  }
  
  return parts.join(' y ');
};

/**
 * ✅ VALIDACIÓN ESPECÍFICA PARA CONSULTAS DE HERRAMIENTAS
 * @param {Object} params - Parámetros de la consulta
 * @returns {Array} - Array de errores (vacío si no hay errores)
 */
export const validateToolQueryParams = (params) => {
  const { userId, query, herramientaId, chatId } = params;
  const errors = [];
  
  console.log('🔍 Validando parámetros de herramienta:', {
    userId: userId,
    herramientaId: herramientaId,
    hasQuery: !!query,
    chatId: chatId,
    queryLength: query?.length
  });
  
  
  // 1. Validar userId
  if (!userId) {
    errors.push("userId es requerido");
  } else if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
    errors.push("userId debe ser un número entero positivo");
  }
  
  // 2. Validar query
  if (!query) {
    errors.push("query es requerido");
  } else if (typeof query !== 'string') {
    errors.push("query debe ser un string");
  } else if (query.trim() === '') {
    errors.push("query no puede estar vacío");
  } else if (query.length > 10000) {
    errors.push("query excede el límite máximo de 10000 caracteres");
  }
  
  // 3. Validar herramientaId
  if (!herramientaId) {
    errors.push("herramientaId es requerido para herramientas");
  } else if (!Number.isInteger(Number(herramientaId))) {
    errors.push("herramientaId debe ser un número entero");
  } else if (!VALID_HERRAMIENTA_IDS.includes(Number(herramientaId))) {
    errors.push(`herramientaId debe ser uno de: ${VALID_HERRAMIENTA_IDS.join(', ')} (1=PDF, 2=Agente)`);
  }
  
  
  // 4. Validar chatId (OPCIONAL - puede ser undefined para crear chat automáticamente)
  if (chatId !== undefined && chatId !== null && chatId !== '') {
    if (!isValidUUID(chatId)) {
      errors.push("chatId debe ser un UUID válido");
    } else if (!isValidUUIDv4(chatId)) {
      errors.push("chatId debe ser específicamente un UUID versión 4");
    }
  }
  
  console.log('🔍 Errores de validación encontrados:', errors);
  
  return errors;
};

/**
 * ✅ VALIDACIÓN ESPECÍFICA PARA CONSULTAS MULTIMODALES DE HERRAMIENTAS (ACTUALIZADA)
 * @param {Object} params - Parámetros de la consulta multimodal
 * @returns {Array} - Array de errores (vacío si no hay errores)
 */
export const validateToolMultimodalParams = (params) => {
  const { userId, herramientaId, chatId, content } = params;
  const errors = [];
  
  console.log('🔍 Validando parámetros multimodales de herramienta:', {
    userId: userId,
    herramientaId: herramientaId,
    hasContent: !!content,
    chatId: chatId,
    contentLength: Array.isArray(content) ? content.length : 0
  });
  
  
  // 1. Validar userId
  if (!userId) {
    errors.push("userId es requerido");
  } else if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
    errors.push("userId debe ser un número entero positivo");
  }
  
  // 2. Validar herramientaId
  if (!herramientaId) {
    errors.push("herramientaId es requerido para herramientas");
  } else if (!Number.isInteger(Number(herramientaId))) {
    errors.push("herramientaId debe ser un número entero");
  } else if (!VALID_HERRAMIENTA_IDS.includes(Number(herramientaId))) {
    errors.push(`herramientaId debe ser uno de: ${VALID_HERRAMIENTA_IDS.join(', ')} (1=PDF, 2=Agente)`);
  }
  
  // 3. Validar content
  if (!content) {
    errors.push("content es requerido para consultas multimodales");
  } else if (!Array.isArray(content)) {
    errors.push("content debe ser un array");
  } else if (content.length === 0) {
    errors.push("content no puede estar vacío");
  } else if (content.length > 25) { // Aumentado como en pathologyutils
    errors.push("Demasiados elementos en content. Máximo permitido: 25");
  } else {
    content.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`El elemento ${index} del contenido debe ser un objeto válido`);
        return;
      }
      
      if (!item.type) {
        errors.push(`El elemento ${index} del contenido debe tener un 'type'`);
      } else if (!['text', 'image_url', 'file', 'document', 'application'].includes(item.type)) {
        errors.push(`El elemento ${index} tiene un tipo desconocido: ${item.type}`);
      }
      
      if (item.type === 'text') {
        if (!item.text || typeof item.text !== 'string') {
          errors.push(`El elemento ${index} de tipo 'text' debe tener un campo 'text' válido`);
        } else if (item.text.length > 100000) { // Aumentado como en pathologyutils
          errors.push(`El elemento ${index} de tipo 'text' excede el límite de 100000 caracteres`);
        }
      }
      
      if (item.type === 'image_url') {
        if (!item.image_url) {
          errors.push(`El elemento ${index} de tipo 'image_url' debe tener un campo 'image_url' válido`);
        } else if (typeof item.image_url === 'object' && !item.image_url.url) {
          errors.push(`El elemento ${index} de tipo 'image_url' debe tener un campo 'image_url.url' válido`);
        } else if (typeof item.image_url === 'string') {
          try {
            const url = new URL(item.image_url);
            if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
              errors.push(`El elemento ${index} tiene una URL con protocolo no permitido`);
            }
          } catch (e) {
            errors.push(`El elemento ${index} tiene una URL inválida`);
          }
        } else if (typeof item.image_url === 'object' && item.image_url.url) {
          try {
            const url = new URL(item.image_url.url);
            if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
              errors.push(`El elemento ${index} tiene una URL con protocolo no permitido`);
            }
          } catch (e) {
            errors.push(`El elemento ${index} tiene una URL inválida`);
          }
        }
      }
      
      if (['file', 'document', 'application'].includes(item.type)) {
        // Debe tener al menos file_url o data_url
        if (!item.file_url && !item.data_url) {
          errors.push(`El elemento ${index} de tipo '${item.type}' debe tener 'file_url' o 'data_url'`);
        }
        
        if (item.file_url) {
          if (typeof item.file_url !== 'string') {
            errors.push(`El elemento ${index} tiene un 'file_url' inválido`);
          } else {
            try {
              const url = new URL(item.file_url);
              if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
                errors.push(`El elemento ${index} tiene una URL de archivo con protocolo no permitido`);
              }
            } catch (e) {
              errors.push(`El elemento ${index} tiene una URL de archivo inválida`);
            }
          }
        }
        
        if (item.data_url) {
          if (typeof item.data_url !== 'string') {
            errors.push(`El elemento ${index} tiene un 'data_url' inválido`);
          } else if (!item.data_url.startsWith('data:')) {
            errors.push(`El elemento ${index} tiene un 'data_url' con formato incorrecto`);
          }
        }
        
        if (item.name && typeof item.name !== 'string') {
          errors.push(`El elemento ${index} tiene un nombre de archivo inválido`);
        }
        
        if (item.filename && typeof item.filename !== 'string') {
          errors.push(`El elemento ${index} tiene un nombre de archivo inválido`);
        }
        
        if (item.mime_type && !isSupportedDocumentType(item.mime_type)) {
          errors.push(`El elemento ${index} tiene un tipo MIME no soportado: ${item.mime_type}`);
        }
        
        if (item.mimeType && !isSupportedDocumentType(item.mimeType)) {
          errors.push(`El elemento ${index} tiene un tipo MIME no soportado: ${item.mimeType}`);
        }
        
        if (item.size && (!Number.isInteger(item.size) || item.size <= 0)) {
          errors.push(`El elemento ${index} tiene un tamaño de archivo inválido`);
        } else if (item.size && item.size > 10 * 1024 * 1024) { // 10MB
          errors.push(`El elemento ${index} excede el tamaño máximo de archivo (10MB)`);
        }
      }
    });
  }
  
  
  // 4. Validar chatId (OPCIONAL)
  if (chatId !== undefined && chatId !== null && chatId !== '') {
    if (!isValidUUID(chatId)) {
      errors.push("chatId debe ser un UUID válido");
    } else if (!isValidUUIDv4(chatId)) {
      errors.push("chatId debe ser específicamente un UUID versión 4");
    }
  }
  
  console.log('🔍 Errores de validación multimodal encontrados:', errors);
  
  return errors;
};

/**
 * ✅ FUNCIÓN PARA EXTRAER TEXTO DE CONTENIDO MULTIMODAL
 * @param {Array} content - Contenido multimodal
 * @returns {string} - Texto extraído y sanitizado
 */
export const extractTextFromToolMultimodal = (content) => {
  if (!Array.isArray(content)) {
    console.warn('⚠️ extractTextFromToolMultimodal: content no es un array');
    return "";
  }
  
  try {
    const extractedText = content
      .filter(item => item && item.type === 'text' && typeof item.text === 'string')
      .map(item => {
        return item.text.substring(0, 10000);
      })
      .join("\n\n")
      // Limitar longitud total
      .substring(0, 25000);
    
    console.log('📝 Texto extraído de contenido multimodal:', {
      originalItems: content.length,
      textItems: content.filter(item => item?.type === 'text').length,
      extractedLength: extractedText.length
    });
    
    return extractedText;
  } catch (error) {
    console.error('❌ Error extrayendo texto de contenido multimodal:', error);
    return "";
  }
};

/**
 * ✅ FUNCIÓN PARA VALIDAR TIPO DE HERRAMIENTA
 * @param {string} toolType - Tipo de herramienta ('agent', 'pdf')
 * @returns {number|null} - ID de herramienta o null si es inválido
 */
export const getToolIdByType = (toolType) => {
  if (!toolType || typeof toolType !== 'string') {
    return null;
  }
  
  const normalizedType = toolType.toLowerCase().trim();
  return TOOL_TYPE_MAP[normalizedType] || null;
};

/**
 * ✅ FUNCIÓN PARA OBTENER NOMBRE DE HERRAMIENTA POR ID
 * @param {number} toolId - ID de herramienta
 * @returns {string|null} - Nombre de herramienta o null si es inválido
 */
export const getToolNameById = (toolId) => {
  const typeMap = Object.entries(TOOL_TYPE_MAP).find(([_, id]) => id === Number(toolId));
  return typeMap ? typeMap[0] : null;
};

/**
 * ✅ FUNCIÓN PARA SANITIZAR CONSULTA DE HERRAMIENTA
 * @param {string} query - Consulta a sanitizar
 * @returns {string} - Consulta sanitizada
 */
export const sanitizeToolQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/script/gi, '') // Eliminar "script" (case insensitive)
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers como onclick=
    // Mantener caracteres educativos: letras, números, espacios, signos matemáticos
    .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ.,;:!?¿¡()\[\]{}+=\-*/%^$€@#&|\\~`'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    // Limitar longitud
    .substring(0, 10000);
};

/**
 * ✅ FUNCIÓN PARA VALIDAR PARÁMETROS MÍNIMOS DE HERRAMIENTAS
 * @param {Object} params - Parámetros básicos
 * @returns {Object} - Resultado de validación con errores y parámetros normalizados
 */
export const validateBasicToolParams = (params) => {
  const errors = [];
  const normalized = {};
  
  if (params.userId) {
    const userIdNum = Number(params.userId);
    if (Number.isInteger(userIdNum) && userIdNum > 0) {
      normalized.userId = userIdNum;
    } else {
      errors.push('userId debe ser un número entero positivo');
    }
  } else {
    errors.push('userId es requerido');
  }
  
  if (params.herramientaId) {
    const herramientaIdNum = Number(params.herramientaId);
    if (Number.isInteger(herramientaIdNum) && VALID_HERRAMIENTA_IDS.includes(herramientaIdNum)) {
      normalized.herramientaId = herramientaIdNum;
    } else {
      errors.push(`herramientaId debe ser uno de: ${VALID_HERRAMIENTA_IDS.join(', ')}`);
    }
  } else {
    errors.push('herramientaId es requerido');
  }
  
  if (params.chatId && params.chatId !== null && params.chatId !== '') {
    if (isValidUUID(params.chatId)) {
      normalized.chatId = params.chatId;
    } else {
      errors.push('chatId debe ser un UUID válido');
    }
  } else {
    normalized.chatId = null; // Chat se creará automáticamente
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalized
  };
};

/**
 * ✅ FUNCIÓN DE DEBUG PARA LOGGING DE HERRAMIENTAS
 * @param {string} operation - Operación siendo ejecutada
 * @param {Object} params - Parámetros de la operación
 * @param {Object} extra - Información adicional
 */
export const logToolOperation = (operation, params, extra = {}) => {
  console.log(`🔧 [TOOL-${operation.toUpperCase()}]`, {
    timestamp: new Date().toISOString(),
    operation,
    userId: params.userId,
    herramientaId: params.herramientaId,
    toolName: getToolNameById(params.herramientaId),
    chatId: params.chatId,
    hasQuery: !!params.query,
    queryLength: params.query?.length,
    ...extra
  });
};

export default {
  validateToolQueryParams,
  validateToolMultimodalParams,
  extractTextFromToolMultimodal,
  getToolIdByType,
  getToolNameById,
  sanitizeToolQuery,
  validateBasicToolParams,
  logToolOperation,
  generateAttachmentsSummary,
  extractFileInfo,
  isDocumentItem,
  isSupportedDocumentType,
  isSupportedDocumentExtension,
  TOOL_TYPE_MAP,
  VALID_HERRAMIENTA_IDS,
};