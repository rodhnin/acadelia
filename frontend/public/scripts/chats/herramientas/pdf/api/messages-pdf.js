/**
 * messages-pdf.js - Funciones para la API de mensajes PDF OPTIMIZADO
 * Versión optimizada SOLO para multimodal - mantiene toda la lógica existente adaptada para PDF
 */

import { API_ROUTES, MESSAGES } from '../core/config-pdf.js';
import { getState } from '../core/state-pdf.js';
import {
  sanitizeText,
  setManagedTimeout
} from '../../../shared/dom-helpers.js';

/**
 * Crea las opciones de configuración básicas para peticiones
 */
function createFetchOptions(payload, signal = null) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  };

  if (signal) {
    options.signal = signal;
  }

  return options;
}

/**
 * Obtiene información básica del usuario para las peticiones API
 */
function getUserInfo() {
  return {
    userId: getState('userId'),
    herramientaId: getState('herramientaId') // ← Diferencia clave con teórico
  };
}

/**
 * Envía un mensaje al servidor y recibe la respuesta.
 * *** MANTENER SIN CAMBIOS - SOLO PARA MENSAJES NORMALES ***
 */
export async function sendMessage(message, chatId, signal = null) {
  const makeRequest = async () => {
    const { userId, herramientaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId: userId,
      herramientaId: herramientaId, // ← herramientaId en lugar de avaId
      query: safeMessage,
      chatId: chatId
    };

    const options = createFetchOptions(payload, signal);
    const response = await fetch(API_ROUTES.query, options);

    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * Obtiene solo la respuesta del modelo sin guardar en la base de datos
 * *** MANTENER SIN CAMBIOS - SOLO PARA MENSAJES NORMALES ***
 */
export async function getResponseOnly(message, chatId, signal = null) {
  const makeRequest = async () => {
    const { userId, herramientaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId: userId,
      herramientaId: herramientaId, // ← herramientaId en lugar de avaId
      query: safeMessage,
      chatId: chatId,
      skipSave: true
    };

    const options = createFetchOptions(payload, signal);
    options.headers['X-Skip-Save'] = 'true';

    const response = await fetch(API_ROUTES.query, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * *** NUEVA FUNCIÓN: Obtiene respuesta de mensaje normal sin guardar (para retry/edit) ***
 */
export async function getResponseOnlyWithoutSaving(message, chatId, signal = null) {
  const makeRequest = async () => {
    const { userId, herramientaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId: userId,
      herramientaId: herramientaId, // ← herramientaId en lugar de avaId
      query: safeMessage,
      chatId: chatId,
      skipSave: true
    };

    const options = createFetchOptions(payload, signal);
    options.headers['X-Skip-Save'] = 'true';
    options.headers['X-Retry-Edit'] = 'true';

    const response = await fetch(API_ROUTES.query, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * Convierte un archivo a base64 de forma asíncrona
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Determina el tipo MIME correcto para el archivo
 */
function getMimeTypeForFile(file, fileType) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split('.').pop().toLowerCase();

  if (fileType === 'image') {
    const imageTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    return imageTypes[extension] || 'image/jpeg';
  }

  if (fileType === 'document') {
    const docTypes = {
      'txt': 'text/plain',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'md': 'text/markdown',
      'csv': 'text/csv'
    };
    return docTypes[extension] || 'text/plain';
  }

  if (fileType === 'code') {
    const codeTypes = {
      'js': 'text/javascript',
      'py': 'text/x-python',
      'html': 'text/html',
      'css': 'text/css',
      'java': 'text/x-java-source',
      'c': 'text/x-c',
      'cpp': 'text/x-c++',
      'cs': 'text/x-csharp',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'ts': 'text/typescript',
      'go': 'text/x-go',
      'swift': 'text/x-swift',
      'json': 'application/json',
      'xml': 'text/xml',
      'sql': 'application/x-sql',
      'sh': 'application/x-sh',
      'bash': 'application/x-sh',
      'yml': 'application/yaml',
      'yaml': 'application/yaml'
    };
    return codeTypes[extension] || 'text/plain';
  }

  return 'application/octet-stream';
}

/**
 * Procesa archivos de imagen para formato multimodal
 * *** MANTENER SIN CAMBIOS ***
 */
async function processImageFiles(imageFiles) {
  const imageContent = [];

  for (const imageFile of imageFiles) {
    try {
      let base64Data;

      if (imageFile.data && imageFile.data.base64) {
        base64Data = imageFile.data.base64;
      } else {
        const { imageToBase64 } = await import('../../../shared/file-handler.js');
        base64Data = await imageToBase64(imageFile.file);
      }

      imageContent.push({
        type: "image_url",
        image_url: {
          url: base64Data,
          detail: "auto"
        }
      });
    } catch (error) {
      console.error('Error procesando imagen:', error);
    }
  }

  return imageContent;
}

/**
 * *** OPTIMIZADO: Procesa archivos de documento/código para formato multimodal ***
 */
async function processDocumentAndCodeFiles(documentFiles, codeFiles) {
  const fileContent = [];

  console.log(`📄 [PDF OPTIMIZED] Procesando ${documentFiles.length} documentos y ${codeFiles.length} archivos de código`);

  // Procesar documentos
  for (const docFile of documentFiles) {
    try {
      const dataUrl = await fileToBase64(docFile.file);
      const mimeType = getMimeTypeForFile(docFile.file, 'document');

      fileContent.push({
        type: "document",
        data_url: dataUrl,
        filename: docFile.file.name,
        mime_type: mimeType
      });

      console.log(`✅ [PDF OPTIMIZED] Documento procesado: ${docFile.file.name} (${mimeType})`);
    } catch (error) {
      console.error('Error procesando documento:', docFile.file.name, error);
    }
  }

  // Procesar archivos de código
  for (const codeFile of codeFiles) {
    try {
      const dataUrl = await fileToBase64(codeFile.file);
      const mimeType = getMimeTypeForFile(codeFile.file, 'code');

      fileContent.push({
        type: "file", // Usar "file" para código según documentación
        data_url: dataUrl,
        name: codeFile.file.name,
        mime_type: mimeType
      });

      console.log(`✅ [PDF OPTIMIZED] Código procesado: ${codeFile.file.name} (${mimeType})`);
    } catch (error) {
      console.error('Error procesando código:', codeFile.file.name, error);
    }
  }

  return fileContent;
}

/**
 * *** OPTIMIZADO: Envía un mensaje multimodal con archivos adjuntos ***
 * Mejorado para manejar archivos recuperados del backend
 */
export async function sendMessageWithAttachments(message, chatId, files, signal = null) {
  const makeRequest = async () => {
    const { userId, herramientaId } = getUserInfo(); // ← herramientaId para PDF

    console.log('📦 [MULTIMODAL PDF] Procesando archivos:', files.length);

    // *** SEPARAR ARCHIVOS RECUPERADOS Y NUEVOS ***
    const filesFromBackend = files.filter(f => f._retrievedFromBackend);
    const regularFiles = files.filter(f => !f._retrievedFromBackend);

    if (filesFromBackend.length > 0) {
      console.log(`📋 [MULTIMODAL PDF] ${filesFromBackend.length} archivos recuperados del backend`);
    }

    // Sanitizar el mensaje
    const safeMessage = message ? sanitizeText(message) : '';

    // Preparar contenido
    const content = [];

    // Agregar texto
    if (safeMessage && safeMessage.trim()) {
      content.push({
        type: "text",
        text: safeMessage
      });
    }

    // *** PROCESAR ARCHIVOS RECUPERADOS DEL BACKEND ***
    for (const fileFromBackend of filesFromBackend) {
      console.log(`📄 [MULTIMODAL PDF] Procesando archivo recuperado:`, {
        type: fileFromBackend.type,
        name: fileFromBackend.name || 'sin nombre',
        hasImageUrl: !!fileFromBackend.image_url,
        hasDataUrl: !!fileFromBackend.data_url
      });

      // *** CASO 1: IMAGEN RECUPERADA ***
      if (fileFromBackend.type === 'image_url' && fileFromBackend.image_url) {
        console.log(`🖼️ [MULTIMODAL PDF] Añadiendo imagen recuperada`);

        content.push({
          type: "image_url",
          image_url: {
            url: fileFromBackend.image_url.url,
            detail: fileFromBackend.image_url.detail || "auto"
          }
        });
      }
      // *** CASO 2: DOCUMENTO RECUPERADO ***
      else if (['file', 'document'].includes(fileFromBackend.type) && fileFromBackend.data_url) {
        console.log(`📄 [MULTIMODAL PDF] Añadiendo documento recuperado: ${fileFromBackend.name}`);

        content.push({
          type: fileFromBackend.type,
          data_url: fileFromBackend.data_url,
          filename: fileFromBackend.name,
          name: fileFromBackend.name,
          mime_type: fileFromBackend.mime_type,
          // *** AGREGAR CONTENIDO EXTRAÍDO SI ESTÁ DISPONIBLE ***
          extractedContent: fileFromBackend.extractedContent,
          attachment_type: fileFromBackend.attachment_type,
          language: fileFromBackend.language
        });
      }
      // *** CASO 3: FORMATO INESPERADO ***
      else {
        console.warn(`⚠️ [MULTIMODAL PDF] Archivo recuperado con formato inesperado:`, fileFromBackend);
      }
    }

    // *** PROCESAR ARCHIVOS REGULARES (NUEVOS) ***
    const imageFiles = regularFiles.filter(f => f.type === 'image');
    const documentFiles = regularFiles.filter(f => f.type === 'document');
    const codeFiles = regularFiles.filter(f => f.type === 'code');

    try {
      if (imageFiles.length > 0) {
        console.log(`🖼️ [MULTIMODAL PDF] Procesando ${imageFiles.length} imágenes nuevas`);
        const imageContent = await processImageFiles(imageFiles);
        content.push(...imageContent);
      }

      if (documentFiles.length > 0 || codeFiles.length > 0) {
        console.log(`📄 [MULTIMODAL PDF] Procesando ${documentFiles.length + codeFiles.length} archivos nuevos`);
        const fileContent = await processDocumentAndCodeFiles(documentFiles, codeFiles);
        content.push(...fileContent);
      }

    } catch (processingError) {
      console.error('❌ [MULTIMODAL PDF] Error procesando archivos:', processingError);
      throw new Error('Error al procesar archivos: ' + processingError.message);
    }

    // Verificar contenido
    if (content.length === 0) {
      throw new Error('No hay contenido para enviar');
    }

    console.log(`📤 [MULTIMODAL PDF] Enviando contenido completo:`, {
      items: content.length,
      tipos: content.map(c => c.type),
      texto: content.find(c => c.type === 'text')?.text?.substring(0, 50) + '...'
    });

    // Enviar
    const payload = { userId, herramientaId, chatId, content }; // ← herramientaId para PDF
    const options = createFetchOptions(payload, signal);
    const response = await fetch(API_ROUTES.multimodal, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * *** NUEVA FUNCIÓN OPTIMIZADA: Envía mensaje multimodal sin guardar en BD ***
 * Para retry/edit de mensajes multimodales - ADAPTADA PARA PDF
 */
export async function sendMessageWithAttachmentsWithoutSaving(message, chatId, files, signal = null) {
  const makeRequest = async () => {
    const { userId, herramientaId } = getUserInfo(); // ← herramientaId para PDF

    console.log('🔄 [MULTIMODAL PDF RETRY/EDIT] Procesando archivos SIN GUARDAR:', files.length);

    // *** SEPARAR ARCHIVOS RECUPERADOS Y NUEVOS ***
    const filesFromBackend = files.filter(f => f._retrievedFromBackend);
    const regularFiles = files.filter(f => !f._retrievedFromBackend);

    if (filesFromBackend.length > 0) {
      console.log(`📋 [MULTIMODAL PDF RETRY/EDIT] ${filesFromBackend.length} archivos recuperados para reintento`);
    }

    // Sanitizar el mensaje
    const safeMessage = message ? sanitizeText(message) : '';

    // Preparar contenido
    const content = [];

    // Agregar texto
    if (safeMessage && safeMessage.trim()) {
      content.push({
        type: "text",
        text: safeMessage
      });
    }

    // *** PROCESAR ARCHIVOS RECUPERADOS DEL BACKEND ***
    for (const fileFromBackend of filesFromBackend) {
      console.log(`📄 [MULTIMODAL PDF RETRY/EDIT] Procesando archivo recuperado:`, {
        type: fileFromBackend.type,
        name: fileFromBackend.name || 'sin nombre',
        hasImageUrl: !!fileFromBackend.image_url,
        hasDataUrl: !!fileFromBackend.data_url
      });

      // *** CASO 1: IMAGEN RECUPERADA ***
      if (fileFromBackend.type === 'image_url' && fileFromBackend.image_url) {
        console.log(`🖼️ [MULTIMODAL PDF RETRY/EDIT] Añadiendo imagen recuperada`);

        content.push({
          type: "image_url",
          image_url: {
            url: fileFromBackend.image_url.url,
            detail: fileFromBackend.image_url.detail || "auto"
          }
        });
      }
      // *** CASO 2: DOCUMENTO RECUPERADO ***
      else if (['file', 'document'].includes(fileFromBackend.type) && fileFromBackend.data_url) {
        console.log(`📄 [MULTIMODAL PDF RETRY/EDIT] Añadiendo documento recuperado: ${fileFromBackend.name}`);

        content.push({
          type: fileFromBackend.type,
          data_url: fileFromBackend.data_url,
          filename: fileFromBackend.name,
          name: fileFromBackend.name,
          mime_type: fileFromBackend.mime_type,
          // *** MANTENER CONTENIDO EXTRAÍDO ***
          extractedContent: fileFromBackend.extractedContent,
          attachment_type: fileFromBackend.attachment_type,
          language: fileFromBackend.language
        });
      }
      // *** CASO 3: FORMATO INESPERADO ***
      else {
        console.warn(`⚠️ [MULTIMODAL PDF RETRY/EDIT] Archivo recuperado con formato inesperado:`, fileFromBackend);
      }
    }

    // *** PROCESAR ARCHIVOS REGULARES (SI LOS HAY) ***
    const imageFiles = regularFiles.filter(f => f.type === 'image');
    const documentFiles = regularFiles.filter(f => f.type === 'document');
    const codeFiles = regularFiles.filter(f => f.type === 'code');

    try {
      if (imageFiles.length > 0) {
        console.log(`🖼️ [MULTIMODAL PDF RETRY/EDIT] Procesando ${imageFiles.length} imágenes nuevas`);
        const imageContent = await processImageFiles(imageFiles);
        content.push(...imageContent);
      }

      if (documentFiles.length > 0 || codeFiles.length > 0) {
        console.log(`📄 [MULTIMODAL PDF RETRY/EDIT] Procesando ${documentFiles.length + codeFiles.length} archivos nuevos`);
        const fileContent = await processDocumentAndCodeFiles(documentFiles, codeFiles);
        content.push(...fileContent);
      }

    } catch (processingError) {
      console.error('❌ [MULTIMODAL PDF RETRY/EDIT] Error procesando archivos:', processingError);
      throw new Error('Error al procesar archivos: ' + processingError.message);
    }

    // Verificar contenido
    if (content.length === 0) {
      throw new Error('No hay contenido para enviar');
    }

    console.log(`📤 [MULTIMODAL PDF RETRY/EDIT] Enviando contenido SIN GUARDAR:`, {
      items: content.length,
      tipos: content.map(c => c.type),
      texto: content.find(c => c.type === 'text')?.text?.substring(0, 50) + '...'
    });

    // *** ENVIAR A ENDPOINT SIN GUARDAR ***
    const payload = { userId, herramientaId, chatId, content }; // ← herramientaId para PDF
    const options = createFetchOptions(payload, signal);

    // *** USAR RUTA ESPECÍFICA PARA PDF SIN GUARDAR ***
    const response = await fetch(API_ROUTES.multimodalWithoutSaving, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * Intenta ejecutar una función con reintentos en caso de error
 * ✅ ACTUALIZADA: Sin retry para límites de herramientas específicas
 */
async function retryRequest(fn, signal = null, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    console.log('🔍 [RETRY] Error caught:', {
      name: error.name,
      isToolLimitError: error.isToolLimitError,
      isTokenLimit: error.isTokenLimit,
      isFreeUserAvaError: error.isFreeUserAvaError,
      status: error.status,
      errorCode: error.errorCode,
      retriesLeft: retries
    });

    // 🚫 NO RETRY: Cancelación del usuario
    if (error.name === 'AbortError' || (signal && signal.aborted)) {
      console.log('🚫 [RETRY] No retry for abort errors');
      throw error;
    }

    // 🚫 NO RETRY: Bad Request
    if (error.message && error.message.includes('400')) {
      console.log('🚫 [RETRY] No retry for 400 errors');
      throw error;
    }

    // 🚫 NO RETRY: Error de usuario gratuito en AVA
    if (error.isFreeUserAvaError || error.noRetry) {
      console.log('🚫 [RETRY] No retry para error AVA 402');
      throw error;
    }

    // 🚫 NO RETRY: Límites de tokens
    if (error.isTokenLimit || error.isPreValidationLimit) {
      console.log('🚫 [RETRY] No retry for token limits');
      throw error;
    }

    // 🚫 NO RETRY: Límites de herramientas (NUEVO)
    if (error.isToolLimitError) {
      console.log('🚫 [RETRY] No retry for tool limits');
      throw error;
    }

    // 🚫 NO RETRY: Status 429 (Rate Limit / Límites alcanzados)
    if (error.status === 429) {
      console.log('🚫 [RETRY] No retry for 429 rate limits');
      throw error;
    }

    // 🚫 NO RETRY: Error codes específicos de límites de herramientas
    if (error.errorCode && (
      error.errorCode.includes('TOOL_') && error.errorCode.includes('_LIMIT_REACHED') ||
      error.errorCode.includes('DAILY_LIMIT_REACHED') ||
      error.errorCode.includes('HOURLY_LIMIT_REACHED') ||
      error.errorCode.includes('MESSAGES_LIMIT_EXCEEDED') ||
      error.errorCode.includes('FREE_USER_LIMIT')
    )) {
      console.log('🚫 [RETRY] No retry for specific tool limit error codes:', error.errorCode);
      throw error;
    }

    // 🚫 NO RETRY: Mensajes de error que indican límites
    if (error.message && (
      error.message.includes('límite diario') ||
      error.message.includes('límite por hora') ||
      error.message.includes('daily limit') ||
      error.message.includes('hourly limit') ||
      error.message.includes('limit reached') ||
      error.message.includes('límite alcanzado') ||
      error.message.includes('sin mensajes') ||
      error.message.includes('quota exceeded')
    )) {
      console.log('🚫 [RETRY] No retry for limit-related error messages');
      throw error;
    }

    // ✅ VERIFICACIONES FINALES antes de retry
    if (retries === 0) {
      console.log('🚫 [RETRY] No more retries left');
      throw error;
    }

    if (signal && signal.aborted) {
      throw new DOMException('Solicitud cancelada por el usuario', 'AbortError');
    }

    console.log(`🔄 [RETRY] Retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setManagedTimeout(resolve, delay, `retry-delay-${Date.now()}`));

    if (signal && signal.aborted) {
      throw new DOMException('Solicitud cancelada por el usuario', 'AbortError');
    }

    return retryRequest(fn, signal, retries - 1, delay * 2);
  }
}

/**
 * Extrae un ID numérico de un formato de ID potencialmente compuesto
 */
function extractNumericId(id) {
  if (!id) return null;

  if (!isNaN(id)) return Number(id);

  if (typeof id === 'string' && id.includes('-')) {
    const parts = id.split('-');
    const lastPart = parts[parts.length - 1];

    if (!isNaN(lastPart)) {
      return Number(lastPart);
    }
  }

  return null;
}

/**
 * *** OPTIMIZADO: Reemplaza una interacción completa en el historial ***
 * Mejorado para manejar JSON multimodal correctamente
 */
export async function replaceInteraction(chatId, userMessageId, aiMessageId, userContent, aiContent) {
  try {
    const userId = getState('userId');

    console.log('🔍 [REPLACE PDF] Contenido recibido:', {
      userContentType: typeof userContent,
      userContentPreview: userContent?.substring(0, 100) + '...',
      isJSON: userContent?.trim().startsWith('{'),
      hasHTMLEscapes: userContent?.includes('&quot;')
    });

    // *** OPTIMIZADO: Manejo inteligente del contenido del usuario ***
    let safeUserContent;
    try {
      // *** VERIFICAR SI ES JSON MULTIMODAL ***
      if (typeof userContent === 'string' && userContent.trim().startsWith('{')) {
        // *** INTENTAR PARSEAR PARA VERIFICAR QUE ES JSON VÁLIDO ***
        JSON.parse(userContent);
        safeUserContent = userContent; // *** NO SANITIZAR JSON ***
        console.log('✅ [REPLACE PDF] JSON multimodal detectado, preservando estructura');
      } else {
        // *** ES TEXTO NORMAL, SANITIZAR ***
        safeUserContent = sanitizeText(userContent);
        console.log('✅ [REPLACE PDF] Texto normal detectado, sanitizando');
      }
    } catch (jsonError) {
      // *** SI NO ES JSON VÁLIDO, SANITIZAR COMO TEXTO ***
      safeUserContent = sanitizeText(userContent);
      console.log('✅ [REPLACE PDF] JSON inválido, sanitizando como texto');
    }

    // Preparar payload básico
    const payload = {
      userId: userId,
      userContent: safeUserContent,
      aiContent: aiContent
    };

    // Extraer IDs numéricos si es posible
    const userIdNum = extractNumericId(userMessageId);
    const aiIdNum = extractNumericId(aiMessageId);

    if (userIdNum) payload.userMessageId = userIdNum;
    if (aiIdNum) payload.aiMessageId = aiIdNum;

    console.log('📤 [REPLACE PDF] Enviando payload:', {
      userId,
      userMessageId: userIdNum,
      aiMessageId: aiIdNum,
      userContentPreview: safeUserContent?.substring(0, 100) + '...',
      aiContentPreview: aiContent?.substring(0, 100) + '...'
    });

    const response = await fetch(API_ROUTES.chatInteraction(chatId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'id_user': userId
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('❌ [REPLACE PDF] Error en replaceInteraction:', error);
    throw error;
  }
}

/**
 * Actualiza un mensaje existente en el historial del chat
 * *** MANTENER SIN CAMBIOS ***
 */
export async function updateChatMessage(chatId, messageId, content) {
  if (!chatId || !content) {
    return Promise.reject(new Error('Se requiere chatId y content para actualizar un mensaje'));
  }

  try {
    const userId = getState('userId');

    const safeContent = sanitizeText(content);

    const payload = {
      content: safeContent,
      userId
    };

    if (messageId) {
      payload.messageId = messageId;
    }

    const response = await fetch(`/api/chats/chats/${chatId}/messages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'id_user': userId
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error actualizando mensaje:', error);
    throw error;
  }
}

/**
 * ✅ handleResponse 100% DINÁMICO - SIN HARDCODEO
 * 
 * Maneja EXACTAMENTE lo que envía el backend sin fallbacks hardcodeados:
 * - TokenManager.buildOptimizedResponse()
 * - TokenManager.buildDynamicToolLimits()
 * - TokenManager.addWarningFlags()
 * - AccessValidationService error codes
 * 
 * CERO valores hardcodeados, todo dinámico del backend
 */
export async function handleResponse(response, responseText = null) {
  if (!responseText) {
    responseText = await response.text();
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error('❌ Error parsing JSON response:', responseText);
    throw new Error('Respuesta del servidor inválida');
  }

  // ===============================================
  // 🚨 MANEJO DE ERRORES (100% BACKEND CODES)
  // ===============================================

  if (!response.ok) {
    console.group(`🚨 HTTP ERROR RESPONSE`);
    console.log('Status:', response.status);
    console.log('Response Data:', data);
    console.groupEnd();

    // ✅ PARSEAR data.error (puede ser string o object)
    let parsedError = null;
    if (typeof data.error === 'string') {
      try {
        parsedError = JSON.parse(data.error);
      } catch (e) {
        // Error no es JSON, mantener como string
      }
    } else if (typeof data.error === 'object' && data.error !== null) {
      parsedError = data.error;
    }

    // ===============================================
    // 🚨 ERROR 429: LÍMITES DE USUARIOS GRATUITOS
    // ===============================================
    if (response.status === 429) {

      console.log(`🚨 [429 ERROR] Respuesta completa del backend:`, data);

      // 🎯 VERIFICAR si es error de herramienta
      const isToolError = !!(
        data.toolSlug ||
        data.toolInfo ||
        data.accessInfo?.toolSlug ||
        data.limits ||
        data.toolLimits ||
        (data.error?.code && data.error.code.includes('TOOL_'))
      );

      if (isToolError) {
        console.log(`🔧 [TOOL ERROR] Error de herramienta detectado - Extrayendo TODOS los datos del backend`);

        // ⭐ EXTRAER **ABSOLUTAMENTE TODO** lo que viene del backend
        const backendToolData = {
          // 📊 INFORMACIÓN DE HERRAMIENTA (directo del TokenManager.buildToolInfo)
          toolSlug: data.toolSlug || data.toolInfo?.slug || data.accessInfo?.toolSlug || 'PDF',
          toolName: data.toolInfo?.name || data.toolInfo?.nombre || null,
          toolId: data.toolInfo?.id || data.toolId || null,

          // 📊 LÍMITES ESPECÍFICOS (directo del TokenManager.buildDynamicToolLimits)
          limits: data.limits || {},
          toolLimits: data.toolLimits || {},

          // 📊 INFORMACIÓN DE ACCESO (directo del AccessValidationService)
          accessInfo: data.accessInfo || {},

          // 📊 INFORMACIÓN DE ERROR
          error: data.error || {},

          // 📊 TODO LO DEMÁS que venga del backend
          timestamp: data.timestamp,
          method: data.method,
          exactCalculation: data.exactCalculation,
          upgradeInfo: data.upgradeInfo || {},

          // 📊 DATOS RAW COMPLETOS
          rawBackendData: data
        };

        console.log(`📊 [BACKEND EXTRACTION] Datos extraídos del backend:`, {
          toolSlug: backendToolData.toolSlug,
          toolName: backendToolData.toolName,
          hasLimits: !!backendToolData.limits,
          hasToolLimits: !!backendToolData.toolLimits,
          limitType: backendToolData.limits?.daily?.exceeded ? 'daily' : 'hourly',
          resetTime: backendToolData.limits?.daily?.resetTime || backendToolData.limits?.hourly?.resetTime
        });

        // ⭐ CREAR ERROR CON **TODOS** LOS DATOS DEL BACKEND
        const toolLimitError = {
          isFreeUserLimit: true,
          isToolLimit: true,
          status: 429,
          message: data.error?.message || 'Límite de herramienta alcanzado',

          // 📊 USAR EXACTAMENTE lo que viene del backend
          ...backendToolData,

          // 📊 PROCESAR LÍMITE ACTIVO según backend
          activeLimitType: backendToolData.limits?.daily?.exceeded ? 'daily' : 'hourly',
          activeLimitData: backendToolData.limits?.daily?.exceeded ?
            backendToolData.limits.daily :
            backendToolData.limits.hourly,

          // 📊 METADATOS
          extractedAt: new Date().toISOString(),
          source: 'backend_complete_extraction'
        };

        console.log(`🚨 [THROWING TOOL ERROR] Error con datos COMPLETOS del backend:`, toolLimitError);
        throw toolLimitError;
      }

      // 🎯 Si no es tool error, es token error
      const tokenLimitError = {
        isTokenLimit: true,
        status: 429,
        message: data.error?.message || 'Límite de tokens excedido',
        tokenInfo: data.tokenInfo,
        maxTokens: data.tokenInfo?.max
      };
      throw tokenLimitError;
    }

    // ===============================================
    // 🚨 ERROR 400: PRE-VALIDACIÓN Y TOKENS
    // ===============================================
    if (response.status === 400) {
      const errorCode = data.error?.code || parsedError?.code;

      // 🎯 PRE-VALIDACIÓN DE TOKENS (del AccessValidationService)
      if (data.isPreValidationLimit === true ||
        errorCode === 'TOKEN_LIMITS.ESTIMATED_LIMIT_EXCEEDED') {

        const preValidationError = {
          isPreValidationLimit: true,
          status: 400,
          message: data.error?.message || parsedError?.message || 'La respuesta estimada excedería el límite de tokens',

          // 📊 INFORMACIÓN DE TOKENS (directo del backend - SIN FALLBACKS)
          tokenInfo: data.tokenInfo || {
            current: parsedError?.currentTokens,
            estimated: parsedError?.estimatedTokens,
            projected: parsedError?.projectedTokens,
            max: parsedError?.maxTokens
          },

          exactTokens: data.exactTokens,
          suggestion: parsedError?.suggestion || data.suggestion
        };
        throw preValidationError;
      }

      // 🎯 LÍMITE DE TOKENS EXCEDIDO (del AccessValidationService)
      if (errorCode === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED') {
        const tokenLimitError = {
          isTokenLimit: true,
          status: 400,
          message: data.error.message || 'El chat ha excedido su límite de tokens',
          maxTokens: data.tokenInfo?.max, // ✅ SIN fallback
          exactCalculation: data.exactCalculation,
          tokenInfo: data.tokenInfo
        };
        throw tokenLimitError;
      }

      // 🎯 LÍMITES ESPECÍFICOS DE HERRAMIENTAS (del middleware)
      if (errorCode === 'TOOL_ACCESS.DAILY_LIMIT_REACHED' ||
        errorCode === 'TOOL_ACCESS.HOURLY_LIMIT_REACHED') {

        const toolLimitError = {
          isToolLimit: true,
          isFreeUserLimit: true,
          status: 400,
          message: data.error.message || 'Límite de herramienta alcanzado',
          limitType: errorCode.includes('DAILY') ? 'daily' : 'hourly',
          toolSlug: data.toolSlug,
          limitInfo: data.limits,
          toolLimits: data.toolLimits,
          toolAccess: data.toolAccess,
          warningThresholds: data.toolLimits?.warningThresholds
        };
        throw toolLimitError;
      }
    }

    // ===============================================
    // 🚨 ERROR GENÉRICO
    // ===============================================
    let errorMessage = '';
    if (parsedError?.message) {
      errorMessage = parsedError.message;
    } else if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (data.error?.message) {
      errorMessage = data.error.message;
    } else {
      errorMessage = data.message || `Error del servidor (${response.status})`;
    }

    throw new Error(errorMessage);
  }

  // ===============================================
  // ✅ VERIFICAR SUCCESS DEL BACKEND
  // ===============================================
  if (!data.success) {
    let errorMessage = '';
    if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (data.error?.message) {
      errorMessage = data.error.message;
    } else {
      errorMessage = 'Error procesando la solicitud';
    }
    throw new Error(errorMessage);
  }

  // ===============================================
  // ✅ PROCESAMIENTO DE RESPUESTA EXITOSA
  // ===============================================
  console.group('🔍 [BACKEND] Procesando respuesta exitosa del backend');
  console.log('📊 Datos del backend:', {
    success: data.success,
    controllerType: data.controllerType,
    tokenInfo: data.tokenInfo,
    toolLimits: data.toolLimits,
    accessInfo: data.accessInfo,
    toolInfo: data.toolInfo,
    warnings: data.warnings?.length || 0,
    // FLAGS del TokenManager.addWarningFlags()
    _hasTokenWarning: data._hasTokenWarning,
    _shouldShowTokenWarning: data._shouldShowTokenWarning,
    _warningPercentage: data._warningPercentage,
    _warningExactCalculation: data._warningExactCalculation
  });

  // ===============================================
  // 👑 BYPASS ADMIN (igual que backend)
  // ===============================================
  if (data.accessInfo?.isAdmin || data.tokenInfo?.isAdmin) {
    console.log('👑 [BACKEND] Admin detectado - Sin procesamiento de warnings');
    console.groupEnd();
    return data;
  }

  // ===============================================
  // 💎 BYPASS PREMIUM ILIMITADO (igual que backend)
  // ===============================================
  if (data.tokenInfo?.max === 'unlimited' || data.accessInfo?.isPremium === true) {
    console.log('💎 [BACKEND] Usuario premium con acceso ilimitado');
    console.groupEnd();
    return data;
  }

  // ===============================================
  // 📊 PROCESAMIENTO DE TOKEN INFO - SIN HARDCODEO
  // ===============================================
  if (data.tokenInfo && typeof data.tokenInfo.current === 'number' &&
    (typeof data.tokenInfo.max === 'number' || data.tokenInfo.max === 'unlimited') &&
    data.tokenInfo.max !== 'unlimited') {

    const { current, max } = data.tokenInfo;
    const percentage = data.tokenInfo.percentage || Math.round((current / max) * 100);

    console.log(`📊 [BACKEND] TokenInfo: ${current}/${max} (${percentage}%)`);

    // 🎯 DETECTAR WARNINGS SEGÚN LÓGICA DEL BACKEND - SIN THRESHOLDS HARDCODEADOS
    let hasTokenWarning = false;
    let warningSource = '';

    // Método 1: Flag directo del TokenManager.addWarningFlags()
    if (data._hasTokenWarning || data._shouldShowTokenWarning) {
      hasTokenWarning = true;
      warningSource = 'backend_flags';
    }
    // Método 2: warningLevel del backend
    else if (data.tokenInfo.warningLevel === 'high') {
      hasTokenWarning = true;
      warningSource = 'warningLevel_high';
    }
    // Método 3: warningThreshold específico del backend
    else if (data.tokenInfo.warningThreshold && typeof data.tokenInfo.warningThreshold === 'number' && current >= data.tokenInfo.warningThreshold) {
      hasTokenWarning = true;
      warningSource = `warningThreshold_${data.tokenInfo.warningThreshold}`;
    }
    // Método 4: warningPercentage del backend
    else if (data.tokenInfo.warningPercentage && typeof data.tokenInfo.warningPercentage === 'number' && percentage >= data.tokenInfo.warningPercentage) {
      hasTokenWarning = true;
      warningSource = `warningPercentage_${data.tokenInfo.warningPercentage}`;
    }
    // Método 5: Cálculo dinámico solo si el backend no envió thresholds específicos
    else if (max && typeof max === 'number' && max > 0) {
      const dynamicWarningThreshold = Math.round(max * 0.75); // Calculado dinámicamente
      if (current >= dynamicWarningThreshold) {
        hasTokenWarning = true;
        warningSource = `calculated_75_percent_of_${max}`;
      }
    }

    if (hasTokenWarning) {
      console.log(`⚠️ [BACKEND] Token warning detectado: ${warningSource}`);

      // 📊 CREAR/ACTUALIZAR tokenWarning con datos del backend
      if (!data.tokenWarning) {
        data.tokenWarning = {
          current,
          max,
          level: 'high',
          percentage: Math.round(percentage),
          source: warningSource,
          method: data.tokenInfo.method,
          warningThreshold: data.tokenInfo.warningThreshold,
          exactCalculation: data.tokenInfo.exactCalculation
        };
      }

      // 📊 AGREGAR FLAGS si no están
      data._hasTokenWarning = true;
      data._shouldShowTokenWarning = true;
      data._warningPercentage = Math.round(percentage);
      data._warningExactCalculation = true;
    }
  }

  // ===============================================
  // 📊 PROCESAMIENTO DE WARNINGS ARRAY
  // ===============================================
  if (data.warnings && Array.isArray(data.warnings) && data.warnings.length > 0) {
    console.log(`📊 [BACKEND] Procesando ${data.warnings.length} warnings del backend`);

    // 🎯 BUSCAR WARNINGS DE TOKENS
    const tokenWarnings = data.warnings.filter(w =>
      w.type && (
        w.type.includes('token') ||
        w.type === 'token_limit_warning' ||
        w.type === 'token_limit_pre' ||
        w.type.startsWith('token_pre_validation')
      ) && w.level === 'high'
    );

    if (tokenWarnings.length > 0) {
      const firstTokenWarning = tokenWarnings[0];
      console.log(`⚠️ [BACKEND] Token warning desde array: ${firstTokenWarning.type}`);

      // 📊 APLICAR WARNING DEL ARRAY
      if (!data._hasTokenWarning) {
        data._hasTokenWarning = true;
        data._shouldShowTokenWarning = true;
        data.tokenWarning = {
          ...firstTokenWarning.tokenInfo,
          level: firstTokenWarning.level,
          message: firstTokenWarning.message,
          type: firstTokenWarning.type,
          timing: firstTokenWarning.timing,
          source: 'backend_warnings_array'
        };
      }
    }
  }

  // ===============================================
  // 📊 PROCESAMIENTO DE TOOL LIMITS - SIN HARDCODEO
  // ===============================================
  if (data.toolLimits) {
    console.log(`📊 [BACKEND] ToolLimits del backend:`, data.toolLimits);

    // 🎯 PROCESAR SEGÚN TIPO DEL BACKEND
    const { toolSlug, type, userType, isUnlimited, warningThresholds } = data.toolLimits;

    if (type === 'admin_unlimited') {
      console.log(`👑 [BACKEND] Admin unlimited para ${toolSlug}`);
      data._toolLimitStatus = 'admin_unlimited';
    }
    else if (type === 'premium_unlimited') {
      console.log(`💎 [BACKEND] Premium unlimited para ${toolSlug}`);
      data._toolLimitStatus = 'premium_unlimited';
    }
    else if (type === 'free_user_limits') {
      const { daily, hourly } = data.toolLimits;

      console.log(`📊 [BACKEND] Límites gratuitos para ${toolSlug}:`, {
        daily: daily ? `${daily.used}/${daily.limit} (${daily.percentage}%)` : 'N/A',
        hourly: hourly ? `${hourly.used}/${hourly.limit} (${hourly.percentage}%)` : 'N/A',
        warningThresholds: warningThresholds
      });

      data._toolLimitStatus = 'free_user_limits';
      data._toolLimitInfo = {
        toolSlug,
        userType: userType || 'free',
        dailyUsage: daily?.percentage,
        hourlyUsage: hourly?.percentage,
        hasExceeded: data.toolLimits.hasExceeded
      };

      // ✅ VALIDAR que tenemos límites completos del backend
      const hasValidLimits = (
        (daily?.limit && typeof daily.limit === 'number') ||
        (hourly?.limit && typeof hourly.limit === 'number')
      );

      if (!hasValidLimits) {
        console.warn(`⚠️ [BACKEND] Límites incompletos para ${toolSlug}:`, data.toolLimits);
        data._toolLimitsIncomplete = true;
      } else {
        data._toolLimitsValid = true;

        // 🎯 WARNING usando THRESHOLDS DINÁMICOS DEL BACKEND - SIN HARDCODEO
        let shouldWarn = false;
        let warningSource = '';

        if (warningThresholds) {
          // ✅ USAR warningThresholds DEL BACKEND (dinámicos)
          if (daily && warningThresholds.daily && typeof warningThresholds.daily === 'number' && daily.used >= warningThresholds.daily) {
            shouldWarn = true;
            warningSource = `daily_threshold_${warningThresholds.daily}_from_backend`;
          }

          if (hourly && warningThresholds.hourly && typeof warningThresholds.hourly === 'number' && hourly.used >= warningThresholds.hourly) {
            shouldWarn = true;
            warningSource = `hourly_threshold_${warningThresholds.hourly}_from_backend`;
          }
        } else {
          // ✅ FALLBACK CALCULADO DINÁMICAMENTE (80% de los límites reales del backend)
          const dailyThreshold = daily?.limit && typeof daily.limit === 'number' ? Math.round(daily.limit * 0.8) : null;
          const hourlyThreshold = hourly?.limit && typeof hourly.limit === 'number' ? Math.round(hourly.limit * 0.8) : null;

          if (daily && dailyThreshold && daily.used >= dailyThreshold) {
            shouldWarn = true;
            warningSource = `calculated_daily_80_percent_${dailyThreshold}_of_${daily.limit}`;
          }

          if (hourly && hourlyThreshold && hourly.used >= hourlyThreshold) {
            shouldWarn = true;
            warningSource = `calculated_hourly_80_percent_${hourlyThreshold}_of_${hourly.limit}`;
          }
        }

        if (shouldWarn) {
          console.log(`⚠️ [BACKEND] Tool limit warning: ${warningSource}`);
          data._hasToolLimitWarning = true;
          data._toolWarningSource = warningSource;
          data._toolWarningThresholds = warningThresholds;
        } else {
          console.log(`✅ [BACKEND] Tool limits OK para ${toolSlug}`);
        }
      }
    }
    else if (type && !['admin_unlimited', 'premium_unlimited', 'free_user_limits'].includes(type)) {
      console.warn(`⚠️ [BACKEND] Tipo de límite desconocido: ${type}`);
      data._toolLimitStatus = 'unknown_type';
    }
  }

  // ===============================================
  // 📊 MARCADORES FINALES PARA EL FRONTEND
  // ===============================================

  // 🎯 RESUMEN DE WARNINGS DETECTADOS
  const warningsSummary = {
    hasTokenWarning: !!data._hasTokenWarning,
    hasToolLimitWarning: !!data._hasToolLimitWarning,
    shouldShowTokenWarning: !!data._shouldShowTokenWarning,
    warningPercentage: data._warningPercentage,
    toolLimitStatus: data._toolLimitStatus,
    toolLimitsValid: !!data._toolLimitsValid,
    toolLimitsIncomplete: !!data._toolLimitsIncomplete,
    sources: {
      tokenWarning: data.tokenWarning?.source,
      toolLimits: data.toolLimits?.source,
      toolWarning: data._toolWarningSource
    }
  };

  console.log(`✅ [BACKEND] Procesamiento completado:`, warningsSummary);
  console.groupEnd();

  // 🎯 AGREGAR RESUMEN AL DATA
  data._backendProcessing = {
    completed: true,
    timestamp: new Date().toISOString(),
    warnings: warningsSummary,
    isFullyDynamic: true,
    noHardcodedValues: true
  };

  return data;
}

/**
 * ✅ FUNCIÓN MODIFICADA: saveMarkdownImage con errores silenciosos
 */
export async function saveMarkdownImage(imageUrl, chatId) {
  try {
    const payload = {
      imageUrl,
      chatId,
      checkDuplicate: true
    };

    const options = createFetchOptions(payload);

    const response = await fetch('/api/chats/save-markdown-image', options);

    // ✅ MANEJO SILENCIOSO - sin logs
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    let data;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Respuesta del servidor no válida');
    }

    // ✅ VERIFICACIÓN SILENCIOSA - sin logs
    if (!data.success) {
      const errorMsg = data.error || data.message || 'Error desconocido al guardar imagen';
      throw new Error(errorMsg);
    }

    // ✅ RETORNO SILENCIOSO - sin logs de éxito
    return data;

  } catch (error) {
    // ✅ SILENCIOSO: No throw, no console.error
    return {
      success: false,
      error: error.message,
      silent: true
    };
  }
}

export default {
  sendMessage,
  sendMessageWithAttachments,
  getResponseOnly,
  handleResponse,
  replaceInteraction,
  updateChatMessage,
  saveMarkdownImage,
  getResponseOnlyWithoutSaving,
  sendMessageWithAttachmentsWithoutSaving // ✅ NUEVA FUNCIÓN EXPORTADA
};