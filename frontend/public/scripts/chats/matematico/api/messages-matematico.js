/**
 * messages.js Matemático OPTIMIZADO - Funciones para la API de mensajes con flujo multimodal mejorado
 * Versión adaptada con todas las optimizaciones del sistema teórico
 */

import { API_ROUTES, MESSAGES } from '../core/config-matematico.js';
import { getState } from '../core/state-matematico.js';
import {
  sanitizeText,
  setManagedTimeout
} from '../../shared/dom-helpers.js';


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
    avaId: getState('avaId')
  };
}

/**
 * Envía un mensaje al servidor y recibe la respuesta.
 * *** MANTENER PARA MENSAJES NORMALES ***
 */
export async function sendMessage(message, chatId, signal = null) {
  const makeRequest = async () => {
    const { userId, avaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId,
      avaId,
      query: safeMessage,
      chatId
    };

    const options = createFetchOptions(payload, signal);
    const response = await fetch(API_ROUTES.query, options);

    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * Obtiene solo la respuesta del modelo sin guardar en la base de datos
 * *** MANTENER PARA MENSAJES NORMALES ***
 */
export async function getResponseOnly(message, chatId, signal = null) {
  const makeRequest = async () => {
    const { userId, avaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId,
      avaId,
      query: safeMessage,
      chatId,
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
    const { userId, avaId } = getUserInfo();

    const safeMessage = sanitizeText(message);

    const payload = {
      userId,
      avaId,
      query: safeMessage,
      chatId,
      skipSave: true
    };

    const options = createFetchOptions(payload, signal);
    options.headers['X-Skip-Save'] = 'true';
    options.headers['X-Retry-Edit'] = 'true';

    console.log('📡 [RETRY] Intentando request SIN GUARDAR:', {
      url: API_ROUTES.query,
      headers: options.headers,
      payload: { ...payload, query: payload.query.substring(0, 50) + '...' }
    });

    // ✅ IMPORTANTE: Usar el endpoint normal con headers especiales
    // porque el endpoint "-without-saving" parece no existir
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
 */
async function processImageFiles(imageFiles) {
  const imageContent = [];

  for (const imageFile of imageFiles) {
    try {
      let base64Data;

      if (imageFile.data && imageFile.data.base64) {
        base64Data = imageFile.data.base64;
      } else {
        const { imageToBase64 } = await import('../../shared/file-handler.js');
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

  console.log(`📄 [MATEMÁTICO-OPTIMIZED] Procesando ${documentFiles.length} documentos y ${codeFiles.length} archivos de código`);

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

      console.log(`✅ [MATEMÁTICO-OPTIMIZED] Documento procesado: ${docFile.file.name} (${mimeType})`);
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

      console.log(`✅ [MATEMÁTICO-OPTIMIZED] Código procesado: ${codeFile.file.name} (${mimeType})`);
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
    const { userId, avaId } = getUserInfo();

    console.log('📦 [MATEMÁTICO-MULTIMODAL] Procesando archivos:', files.length);

    // *** SEPARAR ARCHIVOS RECUPERADOS Y NUEVOS ***
    const filesFromBackend = files.filter(f => f._retrievedFromBackend);
    const regularFiles = files.filter(f => !f._retrievedFromBackend);

    if (filesFromBackend.length > 0) {
      console.log(`📋 [MATEMÁTICO-MULTIMODAL] ${filesFromBackend.length} archivos recuperados del backend`);
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
      console.log(`📄 [MATEMÁTICO-MULTIMODAL] Procesando archivo recuperado:`, {
        type: fileFromBackend.type,
        name: fileFromBackend.name || 'sin nombre',
        hasImageUrl: !!fileFromBackend.image_url,
        hasDataUrl: !!fileFromBackend.data_url
      });

      // *** CASO 1: IMAGEN RECUPERADA ***
      if (fileFromBackend.type === 'image_url' && fileFromBackend.image_url) {
        console.log(`🖼️ [MATEMÁTICO-MULTIMODAL] Añadiendo imagen recuperada`);

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
        console.log(`📄 [MATEMÁTICO-MULTIMODAL] Añadiendo documento recuperado: ${fileFromBackend.name}`);

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
        console.warn(`⚠️ [MATEMÁTICO-MULTIMODAL] Archivo recuperado con formato inesperado:`, fileFromBackend);
      }
    }

    // *** PROCESAR ARCHIVOS REGULARES (NUEVOS) ***
    const imageFiles = regularFiles.filter(f => f.type === 'image');
    const documentFiles = regularFiles.filter(f => f.type === 'document');
    const codeFiles = regularFiles.filter(f => f.type === 'code');

    try {
      if (imageFiles.length > 0) {
        console.log(`🖼️ [MATEMÁTICO-MULTIMODAL] Procesando ${imageFiles.length} imágenes nuevas`);
        const imageContent = await processImageFiles(imageFiles);
        content.push(...imageContent);
      }

      if (documentFiles.length > 0 || codeFiles.length > 0) {
        console.log(`📄 [MATEMÁTICO-MULTIMODAL] Procesando ${documentFiles.length + codeFiles.length} archivos nuevos`);
        const fileContent = await processDocumentAndCodeFiles(documentFiles, codeFiles);
        content.push(...fileContent);
      }

    } catch (processingError) {
      console.error('❌ [MATEMÁTICO-MULTIMODAL] Error procesando archivos:', processingError);
      throw new Error('Error al procesar archivos: ' + processingError.message);
    }

    // Verificar contenido
    if (content.length === 0) {
      throw new Error('No hay contenido para enviar');
    }

    console.log(`📤 [MATEMÁTICO-MULTIMODAL] Enviando contenido completo:`, {
      items: content.length,
      tipos: content.map(c => c.type),
      texto: content.find(c => c.type === 'text')?.text?.substring(0, 50) + '...'
    });

    // Enviar
    const payload = { userId, avaId, chatId, content };
    const options = createFetchOptions(payload, signal);
    const response = await fetch(API_ROUTES.multimodal, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * *** NUEVA FUNCIÓN OPTIMIZADA: Envía mensaje multimodal sin guardar en BD ***
 * Para retry/edit de mensajes multimodales
 */
export async function sendMessageWithAttachmentsWithoutSaving(message, chatId, files, signal = null) {
  const makeRequest = async () => {
    const { userId, avaId } = getUserInfo();

    console.log('🔄 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Procesando archivos SIN GUARDAR:', files.length);

    // *** SEPARAR ARCHIVOS RECUPERADOS Y NUEVOS ***
    const filesFromBackend = files.filter(f => f._retrievedFromBackend);
    const regularFiles = files.filter(f => !f._retrievedFromBackend);

    if (filesFromBackend.length > 0) {
      console.log(`📋 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] ${filesFromBackend.length} archivos recuperados para reintento`);
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
      console.log(`📄 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Procesando archivo recuperado:`, {
        type: fileFromBackend.type,
        name: fileFromBackend.name || 'sin nombre',
        hasImageUrl: !!fileFromBackend.image_url,
        hasDataUrl: !!fileFromBackend.data_url
      });

      // *** CASO 1: IMAGEN RECUPERADA ***
      if (fileFromBackend.type === 'image_url' && fileFromBackend.image_url) {
        console.log(`🖼️ [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Añadiendo imagen recuperada`);

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
        console.log(`📄 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Añadiendo documento recuperado: ${fileFromBackend.name}`);

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
        console.warn(`⚠️ [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Archivo recuperado con formato inesperado:`, fileFromBackend);
      }
    }

    // *** PROCESAR ARCHIVOS REGULARES (SI LOS HAY) ***
    const imageFiles = regularFiles.filter(f => f.type === 'image');
    const documentFiles = regularFiles.filter(f => f.type === 'document');
    const codeFiles = regularFiles.filter(f => f.type === 'code');

    try {
      if (imageFiles.length > 0) {
        console.log(`🖼️ [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Procesando ${imageFiles.length} imágenes nuevas`);
        const imageContent = await processImageFiles(imageFiles);
        content.push(...imageContent);
      }

      if (documentFiles.length > 0 || codeFiles.length > 0) {
        console.log(`📄 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Procesando ${documentFiles.length + codeFiles.length} archivos nuevos`);
        const fileContent = await processDocumentAndCodeFiles(documentFiles, codeFiles);
        content.push(...fileContent);
      }

    } catch (processingError) {
      console.error('❌ [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Error procesando archivos:', processingError);
      throw new Error('Error al procesar archivos: ' + processingError.message);
    }

    // Verificar contenido
    if (content.length === 0) {
      throw new Error('No hay contenido para enviar');
    }

    console.log(`📤 [MATEMÁTICO-MULTIMODAL RETRY/EDIT] Enviando contenido SIN GUARDAR:`, {
      items: content.length,
      tipos: content.map(c => c.type),
      texto: content.find(c => c.type === 'text')?.text?.substring(0, 50) + '...'
    });

    // *** ENVIAR A ENDPOINT SIN GUARDAR ***
    const payload = { userId, avaId, chatId, content };
    const options = createFetchOptions(payload, signal);

    // *** USAR RUTA ESPECÍFICA PARA MATEMÁTICO SIN GUARDAR ***
    const response = await fetch(API_ROUTES.multimodalWithoutSaving, options);
    return await handleResponse(response);
  };

  return retryRequest(makeRequest, signal);
}

/**
 * Intenta ejecutar una función con reintentos en caso de error
 */
async function retryRequest(fn, signal = null, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    console.log('🔍 [RETRY] Error caught:', {
      name: error.name,
      isFreeUserAvaError: error.isFreeUserAvaError,
      noRetry: error.noRetry,
      status: error.status,
      retriesLeft: retries
    });

    // 🚫 NO RETRY: Error de usuario gratuito en AVA
    if (error.isFreeUserAvaError || error.noRetry) {
      console.log('🚫 [RETRY] No retry para error AVA 402');
      throw error;
    }

    // 🚫 NO RETRY: Errores de tokens
    if (error.isTokenLimit || error.isPreValidationLimit) {
      console.log('🚫 [RETRY] No retry for token errors');
      throw error;
    }

    // 🚫 NO RETRY: Cancelación
    if (error.name === 'AbortError' || (signal && signal.aborted)) {
      console.log('🚫 [RETRY] No retry for abort errors');
      throw error;
    }

    // 🚫 NO RETRY: Bad Request
    if (error.message && error.message.includes('400')) {
      console.log('🚫 [RETRY] No retry for 400 errors');
      throw error;
    }

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

    console.log('🔍 [MATEMÁTICO-REPLACE] Contenido recibido:', {
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
        console.log('✅ [MATEMÁTICO-REPLACE] JSON multimodal detectado, preservando estructura');
      } else {
        // *** ES TEXTO NORMAL, SANITIZAR ***
        safeUserContent = sanitizeText(userContent);
        console.log('✅ [MATEMÁTICO-REPLACE] Texto normal detectado, sanitizando');
      }
    } catch (jsonError) {
      // *** SI NO ES JSON VÁLIDO, SANITIZAR COMO TEXTO ***
      safeUserContent = sanitizeText(userContent);
      console.log('✅ [MATEMÁTICO-REPLACE] JSON inválido, sanitizando como texto');
    }

    // Preparar payload básico
    const payload = {
      userId,
      userContent: safeUserContent,
      aiContent
    };

    // Extraer IDs numéricos si es posible
    const userIdNum = extractNumericId(userMessageId);
    const aiIdNum = extractNumericId(aiMessageId);

    if (userIdNum) payload.userMessageId = userIdNum;
    if (aiIdNum) payload.aiMessageId = aiIdNum;

    console.log('📤 [MATEMÁTICO-REPLACE] Enviando payload:', {
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
    console.error('❌ [MATEMÁTICO-REPLACE] Error en replaceInteraction:', error);
    throw error;
  }
}

/**
 * Actualiza un mensaje existente en el historial del chat
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
 * ✅ HANDLE RESPONSE SIMPLIFICADA PARA AVA PREMIUM
 * Solo maneja tokens generales de conversación
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
    throw new Error('Respuesta inválida del servidor');
  }

  if (!response.ok) {
    console.log(`🚨 HTTP ERROR: ${response.status}`, data);

    // 💳 CASO ESPECÍFICO AVA: Error 402 - Usuario gratuito
    if (response.status === 402) {
      console.log(`💳 [AVA 402] Usuario gratuito sin acceso - SIN RETRY`);

      const freeUserAvaError = {
        isFreeUserAvaError: true,
        status: 402,
        errorCode: data.error?.code || 'AVA_ACCESS.FREE_USER_RESTRICTION',
        message: data.error?.message || 'Usuario gratuito sin acceso a AVA premium',
        avaInfo: data.avaInfo || null,
        careerInfo: data.careerInfo || null,
        upgradeInfo: data.upgradeInfo || null,
        responseData: data,
        // 🚫 CRÍTICO: SIN RETRY
        noRetry: true
      };
      throw freeUserAvaError;
    }

    // Otros errores AVA existentes...
    if ((response.status === 403 || response.status === 400) &&
      data.error?.code?.includes('AVA_ACCESS')) {

      const avaAccessError = {
        isAvaAccessError: true,
        status: response.status,
        errorCode: data.error.code,
        message: data.error.message || 'No tienes acceso a este contenido académico',
        avaInfo: data.avaInfo || null,
        careerInfo: data.careerInfo || null,
        upgradeInfo: data.upgradeInfo || null,
        responseData: data
      };
      throw avaAccessError;
    }

    // Error de tokens (ya existente)
    if (response.status === 429 &&
      data.error?.code === 'TOKEN_LIMITS.CHAT_LIMIT_EXCEEDED') {

      const tokenLimitError = {
        isTokenLimit: true,
        status: 429,
        message: data.error.message || 'Esta conversación ha excedido su límite de capacidad',
        maxTokens: data.tokenInfo?.max
      };
      throw tokenLimitError;
    }

    // Error genérico
    const errorMessage = data.error?.message || data.message ||
      `Error del servidor (${response.status})`;
    throw new Error(errorMessage);
  }

  if (!data.success) {
    const errorMessage = typeof data.error === 'string' ? data.error
      : typeof data.error === 'object' ? data.error.message || JSON.stringify(data.error)
        : 'Error procesando la consulta';
    throw new Error(errorMessage);
  }

  // Resto del procesamiento exitoso...
  console.log('📊 [AVA] Respuesta procesada:', {
    success: data.success,
    tokenInfo: data.tokenInfo,
    controllerType: data.controllerType
  });

  if (data.tokenInfo && data.tokenInfo.current && data.tokenInfo.max) {
    const { current, max } = data.tokenInfo;
    console.log(`📊 [AVA] Tokens del chat: ${current}/${max}`);

    if (typeof window !== 'undefined' && window.AcadelChatNotices?.updateDynamicLimits) {
      window.AcadelChatNotices.updateDynamicLimits(data.tokenInfo);
    }
  }

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
  sendMessageWithAttachmentsWithoutSaving
};