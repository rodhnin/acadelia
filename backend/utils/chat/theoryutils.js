import { isValidUUID } from "./validators.js";

import {
  SUPPORTED_FILES,
  createSupportedMimeTypesConfig
} from "./backend-file-constants.js";

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

export const isSupportedDocumentType = (mimeType) => {
  const supportedTypes = getSupportedDocumentTypes();
  return supportedTypes.mimeTypes.includes(mimeType);
};

export const isSupportedDocumentExtension = (extension) => {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  const supportedTypes = getSupportedDocumentTypes();
  return supportedTypes.extensions.includes(normalizedExt.toLowerCase());
};

export const isDocumentItem = (item) => {
  if (!item || typeof item !== 'object') return false;
  
  if (item.type === 'file' || item.type === 'document') {
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

export const validateQueryParams = (params) => {
  const { userId, query, avaId, chatId } = params;
  const errors = [];
  
  if (!userId || !query || !avaId || !chatId) {
    errors.push("Todos los campos son requeridos: userId, query, avaId, chatId");
    return errors; // Salir temprano si faltan campos esenciales
  }
  
  if (!Number.isInteger(userId) || userId <= 0) {
    errors.push("userId debe ser un número entero positivo");
  }
  
  if (!Number.isInteger(avaId) || avaId <= 0) {
    errors.push("avaId debe ser un número entero positivo");
  }
  
  if (!isValidUUID(chatId)) {
    errors.push("Formato de chatId inválido (debe ser UUID v4)");
  } else if (!isValidUUIDv4(chatId)) {
    errors.push("El chatId debe ser específicamente un UUID versión 4");
  }
  
  return errors;
};

/**
 * FUNCIÓN ACTUALIZADA: Validación mejorada para contenido multimodal con soporte de documentos
 */
export const validateMultimodalParams = (params) => {
  const { userId, avaId, chatId, content } = params;
  const errors = [];
  
  if (!userId || !avaId || !chatId || !content) {
    errors.push("Todos los campos son requeridos: userId, avaId, chatId, content");
    return errors; // Salir temprano si faltan campos esenciales
  }
  
  if (!Number.isInteger(userId) || userId <= 0) {
    errors.push("userId debe ser un número entero positivo");
  }
  
  if (!Number.isInteger(avaId) || avaId <= 0) {
    errors.push("avaId debe ser un número entero positivo");
  }
  
  if (!isValidUUID(chatId)) {
    errors.push("Formato de chatId inválido (debe ser UUID v4)");
  } else if (!isValidUUIDv4(chatId)) {
    errors.push("El chatId debe ser específicamente un UUID versión 4");
  }
  
  if (!Array.isArray(content)) {
    errors.push("El campo 'content' debe ser un array");
  } else if (content.length === 0) {
    errors.push("El campo 'content' no puede estar vacío");
  } else {
    if (content.length > 25) { // Aumentado para permitir más archivos
      errors.push("Demasiados elementos en 'content'. Máximo permitido: 25");
    }
    
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
        } else if (item.text.length > 100000) {
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
      
      // NUEVA VALIDACIÓN: Para elementos de archivo/documento
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
  
  return errors;
};

/**
 * NUEVA FUNCIÓN: Función auxiliar para extraer texto seguro de contenido multimodal
 * @param {Array} content - Contenido multimodal
 * @returns {string} - Texto extraído
 */
export const extractTextFromMultimodal = (content) => {
  if (!Array.isArray(content)) return "";
  
  return content
    .filter(item => item && item.type === 'text' && typeof item.text === 'string')
    .map(item => {
      return item.text.substring(0, 10000);
    })
    .join("\n\n")
    // Limitar longitud total para prevenir ataques DoS
    .substring(0, 25000);
};

/**
 * NUEVA FUNCIÓN: Extrae información de archivos del contenido multimodal
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
 * NUEVA FUNCIÓN: Genera un resumen de los archivos adjuntos para logging
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