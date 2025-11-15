/**
 * content-processing.js - Módulo para procesamiento de contenido multimodal pdf
 * ACTUALIZADO: Con soporte completo para documentos clickeables
 */

import { parseMarkdownToHTML } from '../utils/markdown-pdf.js';
import { truncateFileName } from '../../../shared/file-handler.js';

// Variable para almacenar la función initializeFileAttachmentHandlers
let _initializeFileAttachmentHandlers = null;

/**
 * Módulo para procesamiento de contenido multimodal con soporte para documentos clickeables
 */
const contentProcessing = {
  // Método para inicializar la referencia a initializeFileAttachmentHandlers
  initialize(config) {
    if (config && typeof config.initializeFileAttachmentHandlers === 'function') {
      _initializeFileAttachmentHandlers = config.initializeFileAttachmentHandlers;
    }
  },

  // Caché para mejorar rendimiento de JSON parsing
  _parseCache: new Map(),
  _cacheLimit: 50,

  /**
   * Parsea JSON preservando expresiones matemáticas/LaTeX
   * @param {string} jsonText - Texto JSON que puede contener expresiones LaTeX
   * @returns {Object|string} - Objeto parseado o texto original si falla
   */
  parseJsonPreservingMath(jsonText) {
    // Validaciones rápidas iniciales
    if (typeof jsonText !== 'string') return jsonText;
    if (!jsonText.trim().startsWith('{') && !jsonText.trim().startsWith('[')) {
      return jsonText;
    }

    const cacheKey = jsonText.length > 100
      ? jsonText.substring(0, 50) + jsonText.length + jsonText.substring(jsonText.length - 50)
      : jsonText;

    if (this._parseCache.has(cacheKey)) {
      return this._parseCache.get(cacheKey);
    }

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (e) {
      // Si falla, probar estrategias alternativas
      try {
        // Caso 1: JSON con comillas extras
        if (jsonText.trim().startsWith('"') && jsonText.trim().endsWith('"')) {
          const innerJson = jsonText.slice(1, -1).replace(/\\"/g, '"');
          return this.parseJsonPreservingMath(innerJson);
        }

        // Caso 2: JSON con LaTeX - usar tokens para preservar expresiones
        const replacements = [
          { pattern: /\\\\int/g, token: "__INT__" },
          { pattern: /\\\\frac/g, token: "__FRAC__" },
          { pattern: /\\\\sin/g, token: "__SIN__" },
          { pattern: /\\\\cos/g, token: "__COS__" },
          { pattern: /\\\\tan/g, token: "__TAN__" },
          { pattern: /\\\\cot/g, token: "__COT__" },
          { pattern: /\\\\sec/g, token: "__SEC__" },
          { pattern: /\\\\csc/g, token: "__CSC__" },
          { pattern: /\\\\ln/g, token: "__LN__" },
          { pattern: /\\\\log/g, token: "__LOG__" },
          { pattern: /\\\\exp/g, token: "__EXP__" },
          { pattern: /\\\\quad/g, token: "__QUAD__" },
          { pattern: /\\\\neq/g, token: "__NEQ__" },
          { pattern: /\\\|/g, token: "__PIPE__" },
          { pattern: /\\{/g, token: "__LBRACE__" },
          { pattern: /\\}/g, token: "__RBRACE__" },
          { pattern: /\\\\/g, token: "__BSLASH__" }
        ];

        let processedJson = jsonText;
        for (const { pattern, token } of replacements) {
          processedJson = processedJson.replace(pattern, token);
        }

        const parsed = JSON.parse(processedJson);

        const restoreTokens = (obj) => {
          if (typeof obj === 'string') {
            let result = obj;
            const originalMap = {
              "__INT__": "\\\\int", "__FRAC__": "\\\\frac", "__SIN__": "\\\\sin",
              "__COS__": "\\\\cos", "__TAN__": "\\\\tan", "__COT__": "\\\\cot",
              "__SEC__": "\\\\sec", "__CSC__": "\\\\csc", "__LN__": "\\\\ln",
              "__LOG__": "\\\\log", "__EXP__": "\\\\exp", "__QUAD__": "\\\\quad",
              "__NEQ__": "\\\\neq", "__PIPE__": "\\|", "__LBRACE__": "\\{",
              "__RBRACE__": "\\}", "__BSLASH__": "\\\\"
            };

            for (const token in originalMap) {
              result = result.replace(new RegExp(token, 'g'), originalMap[token]);
            }
            return result;
          } else if (Array.isArray(obj)) {
            return obj.map(restoreTokens);
          } else if (obj && typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
              result[key] = restoreTokens(obj[key]);
            }
            return result;
          }
          return obj;
        };

        result = restoreTokens(parsed);
      } catch (error) {
        // Si todo falla, devolver el texto original
        result = jsonText;
      }
    }

    this._parseCache.set(cacheKey, result);
    if (this._parseCache.size > this._cacheLimit) {
      const firstKey = this._parseCache.keys().next().value;
      this._parseCache.delete(firstKey);
    }

    return result;
  },

  /**
   * ⭐ NUEVO: Detecta y procesa contenido multimodal con soporte para documentos ⭐
   * @param {string} content - Contenido a analizar
   * @param {boolean} isAIResponse - Si es respuesta de IA o mensaje de usuario
   * @returns {string} - Contenido procesado en formato HTML o contenido original
   */
  detectMultimodalContent(content, isAIResponse = false) {
    if (typeof content !== 'string') return content;

    // PUNTO CRÍTICO: Si es respuesta de IA, siempre devolver el contenido original sin procesar
    if (isAIResponse) {
      return content;
    }

    // Verificación rápida para exámenes
    if ((content.includes('"type":"exam"') || content.includes('"exam":')) &&
        (content.includes('"questions":[') || content.includes('"questions":'))) {
      try {
        const parsedExam = this.parseJsonPreservingMath(content);
        if (parsedExam && (parsedExam.type === 'exam' || parsedExam.exam)) {
          return content;
        }
      } catch (e) {
        console.warn('Error al intentar procesar examen:', e);
      }
    }

    let originalJsonData = null;
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      try {
        originalJsonData = this.parseJsonPreservingMath(content);
        console.log("JSON detectado y parseado exitosamente");
      } catch (e) {
        console.warn('Error al parsear contenido como JSON:', e);
      }
    }

    // Detección multimodal estándar
    const hasMultimodalHTML = content.includes('<div class="multimodal-container">');
    const isJson = content.startsWith('{') && content.endsWith('}');
    
    // ⭐ NUEVO: Detección mejorada de imágenes Y documentos ⭐
    let hasImageIndicator = false;
    let hasDocumentIndicator = false;

    if (originalJsonData) {
      hasImageIndicator = originalJsonData.hasImage === true;
      hasDocumentIndicator = originalJsonData.hasDocuments === true;
    }
    else if (content.includes('imagen adjunta') || content.includes('imágenes adjuntas')) {
      const isInCode = content.includes('```') &&
        content.includes('imagen adjunta') &&
        content.indexOf('```') < content.indexOf('imagen adjunta');

      const isInExample = /ejemplo.*imagen adjunta|imagen adjunta.*ejemplo/i.test(content);

      hasImageIndicator = !isInCode && !isInExample &&
        (/\bimagen adjunta\b/i.test(content) ||
         /\bimágenes adjuntas\b/i.test(content));
    }

    // ⭐ NUEVO: Detectar documentos ⭐
    if (content.includes('documento adjunto') || content.includes('documentos adjuntos') ||
        content.includes('archivo adjunto') || content.includes('archivos adjuntos')) {
      hasDocumentIndicator = true;
    }

    // Si no hay indicadores, devolver contenido original
    if (!hasMultimodalHTML && !hasImageIndicator && !hasDocumentIndicator && 
        !(originalJsonData && (originalJsonData.hasImage || originalJsonData.hasDocuments))) {
      return content;
    }

    // Si ya es HTML multimodal, no modificar
    if (hasMultimodalHTML) {
      return content;
    }

    // ⭐ CASO PARA JSON MULTIMODAL COMPLETO CON IMÁGENES Y/O DOCUMENTOS ⭐
    if (originalJsonData) {
      if (originalJsonData.hasImage === true &&
          originalJsonData.images &&
          Array.isArray(originalJsonData.images) &&
          originalJsonData.images.length > 0) {
        
        return this._formatMultimodalContent(originalJsonData);
      }

      // ⭐ NUEVO: Verificar si es multimodal con documentos ⭐
      if (originalJsonData.hasDocuments === true &&
          originalJsonData.documents &&
          Array.isArray(originalJsonData.documents) &&
          originalJsonData.documents.length > 0) {
        
        return this._formatMultimodalContent(originalJsonData);
      }

      // Si tiene flag pero no array válido
      if (originalJsonData.hasImage === true || originalJsonData.hasDocuments === true) {
        return this._formatMultimodalContent(originalJsonData);
      }
    }

    // CASO PARA JSON ESTRUCTURADO CON IMÁGENES O DOCUMENTOS
    if ((isJson) && (hasImageIndicator || hasDocumentIndicator)) {
      try {
        const jsonData = this._extractMultimodalJson(content);
        if (jsonData) {
          return this._formatMultimodalContent(jsonData);
        }
      } catch (err) {
        console.warn('Error procesando JSON multimodal:', err);
      }
    }

    return content;
  },

  /**
   * ⭐ NUEVO: Extrae información de imágenes Y documentos de JSON ⭐
   * @private
   */
  _extractMultimodalJson(content) {
    // CASO 1: JSON doblemente serializado
    if (content.startsWith('"') && content.endsWith('"') && content.includes('\\"')) {
      try {
        const parsedOuter = JSON.parse(content);
        
        if (typeof parsedOuter === 'string') {
          if ((parsedOuter.startsWith('{') || parsedOuter.startsWith('[')) &&
              (parsedOuter.endsWith('}') || parsedOuter.endsWith(']'))) {
            try {
              const innerParsed = JSON.parse(parsedOuter);
              
              if (innerParsed && (
                (innerParsed.images && Array.isArray(innerParsed.images)) ||
                (innerParsed.documents && Array.isArray(innerParsed.documents))
              )) {
                innerParsed.hasImage = innerParsed.images && innerParsed.images.length > 0;
                innerParsed.hasDocuments = innerParsed.documents && innerParsed.documents.length > 0;
                return innerParsed;
              }

              return innerParsed;
            } catch (e) {
              return { text: parsedOuter };
            }
          } else {
            return { text: parsedOuter };
          }
        } else if (typeof parsedOuter === 'object' && parsedOuter !== null) {
          return parsedOuter;
        }

        return parsedOuter;
      } catch (e) {
        console.warn('Error procesando JSON doblemente serializado:', e);
      }
    }
    
    // CASO 2: JSON directo
    if (content.startsWith('{') && content.endsWith('}')) {
      try {
        const parsed = this.parseJsonPreservingMath(content);

        if (parsed) {
          // Imágenes o documentos directos en raíz
          if ((parsed.images && Array.isArray(parsed.images)) ||
              (parsed.documents && Array.isArray(parsed.documents))) {
            return parsed;
          }

          // Imágenes o documentos en data o message
          if (parsed.data && (
            (parsed.data.images && Array.isArray(parsed.data.images)) ||
            (parsed.data.documents && Array.isArray(parsed.data.documents))
          )) {
            parsed.images = parsed.data.images || parsed.images;
            parsed.documents = parsed.data.documents || parsed.documents;
            return parsed;
          }

          if (parsed.message && (
            (parsed.message.images && Array.isArray(parsed.message.images)) ||
            (parsed.message.documents && Array.isArray(parsed.message.documents))
          )) {
            parsed.images = parsed.message.images || parsed.images;
            parsed.documents = parsed.message.documents || parsed.documents;
            return parsed;
          }
        }

        return parsed;
      } catch (e) {
        console.warn('Error procesando JSON directo:', e);
      }
    }

    // CASO 3: Extracción por patrones regulares
    const hasImageMatch = content.match(/[\"']hasImage[\"']\s*:\s*(true|false)/);
    const hasDocumentsMatch = content.match(/[\"']hasDocuments[\"']\s*:\s*(true|false)/);
    const imageCountMatch = content.match(/[\"']imageCount[\"']\s*:\s*(\d+)/);
    const documentCountMatch = content.match(/[\"']documentCount[\"']\s*:\s*(\d+)/);
    const imagesPathMatch = content.match(/[\"']path[\"']\s*:\s*[\"']([^\"']*)[\"']/);

    if (hasImageMatch || hasDocumentsMatch || imageCountMatch || documentCountMatch || imagesPathMatch) {
      const result = {
        text: '',
        hasImage: hasImageMatch ? hasImageMatch[1] === 'true' : false,
        hasDocuments: hasDocumentsMatch ? hasDocumentsMatch[1] === 'true' : false,
        imageCount: imageCountMatch ? parseInt(imageCountMatch[1], 10) : 0,
        documentCount: documentCountMatch ? parseInt(documentCountMatch[1], 10) : 0
      };

      if (imagesPathMatch) {
        result.images = [{
          path: imagesPathMatch[1],
          type: 'image'
        }];
      }

      return result;
    }

    return null;
  },

  /**
   * ⭐ NUEVO: Formatea contenido multimodal con imágenes Y documentos ⭐
   * @private
   * @param {Object} jsonData - Datos JSON con estructura multimodal
   * @returns {string} HTML formateado
   */
  _formatMultimodalContent(jsonData) {
    if (!jsonData) return '';

    const text = jsonData.text || '';
    const images = jsonData.images || [];
    const documents = jsonData.documents || [];
    const hasImages = images.length > 0 || jsonData.hasImage === true;
    const hasDocuments = documents.length > 0 || jsonData.hasDocuments === true;
    const imageCount = jsonData.imageCount || jsonData.totalImageCount || images.length || 0;
    const documentCount = jsonData.documentCount || jsonData.totalDocumentCount || documents.length || 0;

    let html = '<div class="multimodal-container">';

    const cleanedText = text.trim();
    const isDefaultQuery = ["Consulta con imagen", "Analiza esta imagen:", "Consulta con archivos adjuntos", ""].includes(cleanedText);

    if (!isDefaultQuery && cleanedText) {
      html += `<div class="multimodal-text">${parseMarkdownToHTML ? parseMarkdownToHTML(cleanedText) : cleanedText}</div>`;
    }

    // Contenedor para adjuntos
    html += `<div class="multimodal-attachments">`;

    // ⭐ PROCESAR IMÁGENES ⭐
    if (images.length > 0) {
      const validImages = images.filter(img => img && img.path);

      if (validImages.length > 0) {
      html += `<div class="chat-image-gallery">`;
      validImages.forEach(img => {
        html += `
          <div class="chat-image-item clickable" onclick="window.showFullImage('${_escapeHtml(img.path)}')">
            <img src="${_escapeHtml(img.path)}" alt="Imagen adjunta">
          </div>
        `;
      });
      html += `</div>`;
      } else {
        const fileConfig = this._getFileIconAndColor('image');
        const imgCount = imageCount || images.length;
        const imageLabel = imgCount === 1 ? 'imagen' : 'imágenes';

        html += `
        <div class="attachment-indicator image">
          <i class="bx ${fileConfig.icon}"></i>
          <span>${imgCount} ${imageLabel} adjunta${imgCount !== 1 ? 's' : ''}</span>
        </div>
      `;
      }
    } else if (hasImages) {
      const fileConfig = this._getFileIconAndColor('image');
      const imgCount = imageCount || 1;
      const imageLabel = imgCount === 1 ? 'imagen' : 'imágenes';

      html += `
      <div class="attachment-indicator image">
        <i class="bx ${fileConfig.icon}"></i>
        <span>${imgCount} ${imageLabel} adjunta${imgCount !== 1 ? 's' : ''}</span>
      </div>
    `;
    }

    // ⭐ PROCESAR DOCUMENTOS ⭐
    if (documents.length > 0) {
      const validDocuments = documents.filter(doc => doc && doc.fileId);

      if (validDocuments.length > 0) {
        html += `<div class="document-previews">`;

        validDocuments.forEach(doc => {
          const fileConfig = this._getFileIconAndColor(doc.attachmentType || 'document');
          const fileName = this._truncateFileName(doc.originalName || 'Documento', 25);
          
          html += `
          <div class="document-preview clickable" 
               data-file-id="${doc.fileId}" 
               data-file-name="${doc.originalName || 'Documento'}"
               data-attachment-type="${doc.attachmentType || 'document'}"
               data-language="${doc.language || ''}"
               title="${doc.originalName || 'Documento'}">
            <i class="bx ${fileConfig.icon} document-icon"></i>
            <span class="document-name">${fileName}</span>
            <small class="document-size">${this._formatFileSize(doc.fileSize || 0)}</small>
          </div>
        `;
        });

        html += `</div>`;
      } else {
        const fileConfig = this._getFileIconAndColor('document');
        const docCount = documentCount || documents.length;
        const documentLabel = docCount === 1 ? 'documento' : 'documentos';

        html += `
        <div class="attachment-indicator document">
          <i class="bx ${fileConfig.icon}"></i>
          <span>${docCount} ${documentLabel} adjunto${docCount !== 1 ? 's' : ''}</span>
        </div>
      `;
      }
    } else if (hasDocuments) {
      const fileConfig = this._getFileIconAndColor('document');
      const docCount = documentCount || 1;
      const documentLabel = docCount === 1 ? 'documento' : 'documentos';

      html += `
      <div class="attachment-indicator document">
        <i class="bx ${fileConfig.icon}"></i>
        <span>${docCount} ${documentLabel} adjunto${docCount !== 1 ? 's' : ''}</span>
      </div>
    `;
    }

    html += '</div></div>';

    return html;
  },

  /**
   * ⭐ NUEVO: Limpia y procesa elementos multimodales existentes en el DOM ⭐
   * @param {HTMLElement} container - Contenedor con elementos multimodales
   * @param {boolean} isAIMessage - Si es mensaje de IA
   * @returns {boolean} - true si se realizaron cambios
   */
  cleanMultimodalExistingContent(container, isAIMessage = false) {
    if (isAIMessage === undefined) {
      isAIMessage = container.closest('.ai-message') !== null;
    }

    // PUNTO CRÍTICO: Si es mensaje de IA, NO procesar nada
    if (isAIMessage) {
      return false;
    }

    const multimodalContainers = container.querySelectorAll('.multimodal-container');
    if (multimodalContainers.length === 0) return false;

    multimodalContainers.forEach(multimodal => {
      this._cleanStandardMultimodal(multimodal);
    });

    return true;
  },

  /**
   * ⭐ NUEVO: Procesa mensajes existentes para hacer documentos clickeables ⭐
   * @param {HTMLElement} container - Contenedor de mensajes (opcional, por defecto todo el chat)
   */
  processExistingDocuments(container = null) {
    const searchContainer = container || document.querySelector('.chat-messages');
    if (!searchContainer) return;

    console.log('🔍 Procesando documentos existentes...');

    const documentPreviews = searchContainer.querySelectorAll('.document-preview:not(.clickable)');
    
    documentPreviews.forEach(docElement => {
      const fileId = docElement.dataset.fileId;
      if (fileId) {
        // Hacer clickeable
        docElement.classList.add('clickable');
        
        if (!docElement.onclick) {
          docElement.addEventListener('click', (e) => {
            e.preventDefault();
contentProcessing.handleDocumentClick(docElement);
          });
        }
        
        console.log(`✅ Documento procesado: ${docElement.dataset.fileName || 'Sin nombre'}`);
      }
    });

    // También buscar indicadores genéricos de documentos en mensajes JSON
    const userMessages = searchContainer.querySelectorAll('.user-message');
    userMessages.forEach(messageElement => {
      try {
        const textElements = messageElement.querySelectorAll('.message-text, .multimodal-text');
        textElements.forEach(textElement => {
          const originalText = textElement.dataset.originalText;
          if (originalText) {
            try {
              const decodedText = decodeURIComponent(originalText);
              const parsedContent = this.parseJsonPreservingMath(decodedText);
              
              if (parsedContent && parsedContent.hasDocuments && parsedContent.documents) {
                // Re-procesar el mensaje con documentos clickeables
                const multimodalHTML = this._formatMultimodalContent(parsedContent);
                
                const messageContent = messageElement.querySelector('.message-content');
                if (messageContent) {
                  messageContent.innerHTML = multimodalHTML;
                  
                  this.activateDocumentEvents(messageContent);
                  
                  console.log(`✅ Mensaje reprocessado con ${parsedContent.documents.length} documentos`);
                }
              }
            } catch (e) {
              console.warn('Error al reprocesar mensaje:', e);
            }
          }
        });
      } catch (e) {
        console.warn('Error al procesar mensaje de usuario:', e);
      }
    });
  },

  /**
   * ⭐ NUEVO: Activa eventos de click para documentos en un contenedor ⭐
   * @param {HTMLElement} container - Contenedor que contiene documentos
   */
  activateDocumentEvents(container) {
    const documentPreviews = container.querySelectorAll('.document-preview.clickable');
    
    documentPreviews.forEach(docElement => {
      docElement.removeEventListener('click', this.handleDocumentClick);
      
      docElement.addEventListener('click', (e) => {
        e.preventDefault();
        contentProcessing.handleDocumentClick(docElement);
      });
    });
  },

/**
 * ⭐ FUNCIÓN CORREGIDA: Maneja el click en un documento con import correcto ⭐
 */
async handleDocumentClick(docElement) {
  const fileId = docElement.dataset.fileId;
  const fileName = docElement.dataset.fileName || 'Documento';
  const attachmentType = docElement.dataset.attachmentType || 'document';
  const language = docElement.dataset.language || '';

  console.log(`📂 handleDocumentClick iniciado para: ${fileName} (${fileId})`);

  if (!fileId) {
    console.error("❌ No hay fileId disponible");
    acadelError("📂 ¡Archivo perdido!", "Acadel no encuentra la referencia del documento");
    return;
  }

  if (docElement.dataset.loading === 'true') {
    console.log('⏳ Documento ya está cargando, saltando...');
    return;
  }

  docElement.dataset.loading = 'true';

  const originalContent = docElement.innerHTML;
  const loadingNotificationId = acadelLoading("📂 Abriendo documento", `Acadel está leyendo "${fileName}" para ti`);
  
  docElement.innerHTML = `
    <i class="bx bx-loader-alt bx-spin document-icon"></i>
    <span class="document-name">Cargando...</span>
  `;

  try {
    console.log(`🔍 Haciendo petición a: /api/documents/${fileId}/content`);
    
    const response = await fetch(`/api/documents/${fileId}/content`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    console.log(`✅ Respuesta recibida, procesando contenido...`);
    const documentData = await extractDocumentContent(response, fileName);
    
    if (!documentData.success) {
      throw new Error(documentData.error || 'Error al obtener contenido del documento');
    }

    let content = null;
    
    if (documentData.file && documentData.file.extractedContent) {
      content = documentData.file.extractedContent;
    } else if (documentData.content) {
      content = documentData.content;
    } else if (documentData.extractedContent) {
      content = documentData.extractedContent;
    }

    if (!content) {
      throw new Error('El documento está vacío');
    }

    console.log(`✅ Contenido extraído: ${content.length} caracteres`);
    
    const fileInfo = documentData.file || {};
    const finalFileName = fileInfo.originalName || fileName;
    const finalLanguage = fileInfo.language || language;
    const finalAttachmentType = fileInfo.attachmentType || attachmentType;
    const fileExtension = finalFileName.split('.').pop().toLowerCase();

    let previewData;
    let previewType = 'code';

    if (this._isHtmlFile(fileExtension)) {
      previewData = {
        title: finalFileName,
        code: content,
        language: 'html',
        isDocument: true
      };
      console.log('🌐 Configurado como HTML');
      
    } else if (this._isCodeFile(fileExtension, finalAttachmentType)) {
      previewData = {
        title: finalFileName,
        code: content,
        language: this._detectLanguageFromFileName(finalFileName),
        isDocument: true
      };
      console.log('🔧 Configurado como código');
      
    } else {
      previewData = {
        title: finalFileName,
        codeContent: this._formatTextContent(content, finalFileName, fileExtension),
        isDocument: true
      };
      console.log('📄 Configurado como documento de texto');
    }

    console.log('🚀 Intentando abrir preview panel con datos:', {
      title: previewData.title,
      type: previewType,
      hasContent: !!previewData.code || !!previewData.codeContent
    });

    // ⭐ CORRECCIÓN CRÍTICA: Import correcto del preview panel ⭐
    try {
      console.log('📦 Importando preview-panel-pdf.js...');
      const previewModule = await import('../components/preview-panel-pdf.js');
      console.log('✅ Módulo preview-panel-pdf.js importado:', Object.keys(previewModule));
      
      if (typeof previewModule.showPreviewPanel === 'function') {
        console.log('🎯 Llamando a showPreviewPanel...');
        previewModule.showPreviewPanel(previewData, previewType);
        console.log('✅ showPreviewPanel ejecutado');
        
        if (loadingNotificationId) {
          acadelCerrar(loadingNotificationId);
        }

        if (['html', 'htm'].includes(fileExtension)) {
          acadelExito("🌐 ¡Página web abierta!", `Acadel cargó "${fileName}" perfectamente`);
        } else if (['js', 'ts', 'py', 'java', 'cpp', 'css'].includes(fileExtension)) {
          acadelExito("💻 ¡Código listo!", `Acadel tiene "${fileName}" preparado para revisar`);
        } else {
          acadelExito("📄 ¡Documento abierto!", `Acadel leyó "${fileName}" completamente`);
        }

        docElement.innerHTML = originalContent;
        
      } else {
        console.error('❌ showPreviewPanel no es una función en el módulo importado');
        throw new Error('showPreviewPanel no disponible en preview-panel-pdf.js');
      }
      
    } catch (importError) {
      console.error('❌ Error al importar preview-panel-pdf.js:', importError);
      
      // ⭐ FALLBACK: Intentar con preview-panel-teorico.js ⭐
      try {
        console.log('🔄 Intentando fallback con preview-panel-teorico.js...');
        const fallbackModule = await import('../components/preview-panel-teorico.js');
        
        if (typeof fallbackModule.showPreviewPanel === 'function') {
          console.log('✅ Usando fallback preview-panel-teorico.js');
          fallbackModule.showPreviewPanel(previewData, previewType);
          
          if (loadingNotificationId) {
            acadelCerrar(loadingNotificationId);
          }
          
          acadelExito("📄 ¡Documento abierto!", `Acadel leyó "${fileName}" con panel alternativo`);
          docElement.innerHTML = originalContent;
          
        } else {
          throw new Error('Fallback también falló');
        }
        
      } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError);
        
        if (loadingNotificationId) {
          acadelCerrar(loadingNotificationId);
        }
        
        acadelError("📂 ¡Problema con el visor!", "Acadel no pudo abrir el panel, pero el documento está bien");
        
        this._showSimpleModal(finalFileName, content, previewData.language || 'text');
      }
    }

  } catch (error) {
    console.error('❌ Error general al cargar documento:', error);
    
    if (loadingNotificationId) {
      acadelCerrar(loadingNotificationId);
    }
    
    acadelError("📂 ¡No pude abrir el documento!", `Error: ${error.message}`);
    
  } finally {
    delete docElement.dataset.loading;
    
    if (docElement.innerHTML.includes('Cargando...')) {
      docElement.innerHTML = originalContent;
    }
  }
},
  /**
   * ⭐ NUEVO: Formatea contenido de documento para preview ⭐
   * @private
   */
  _formatDocumentContent(content, fileName, attachmentType) {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html', 'xml', 'json'].includes(fileExtension)) {
      return `
        <div class="code-header">
          <span class="code-language">${this._detectLanguageFromFileName(fileName)}</span>
        </div>
        <pre><code class="language-${fileExtension}">${this._escapeHtml(content)}</code></pre>
      `;
    }
    
    return `
      <div class="document-header">
        <span class="document-type">${attachmentType.toUpperCase()}</span>
        <span class="document-name">${fileName}</span>
      </div>
      <div class="document-content">
        <pre>${this._escapeHtml(content)}</pre>
      </div>
    `;
  },

  /**
   * ⭐ NUEVO: Detecta lenguaje de programación por nombre de archivo ⭐
   * @private
   */
  _detectLanguageFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'css': 'css',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'bash',
      'sql': 'sql'
    };
    
    return languageMap[extension] || 'text';
  },

  /**
   * ⭐ NUEVO: Escapa HTML para mostrar contenido como texto ⭐
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * ⭐ NUEVO: Trunca nombre de archivo ⭐
   * @private
   */
  _truncateFileName(fileName, maxLength) {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const maxNameLength = maxLength - extension.length - 4; // -4 para "..." y "."
    
    if (maxNameLength <= 0) return '...' + extension;
    
    return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
  },

  /**
   * ⭐ NUEVO: Formatea tamaño de archivo ⭐
   * @private
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * Limpia un contenedor multimodal estándar
   * @private
   */
  _cleanStandardMultimodal(multimodal) {
    try {
      let nextSibling = multimodal.nextSibling;
      while (nextSibling) {
        const currentSibling = nextSibling;
        nextSibling = nextSibling.nextSibling;

        if (currentSibling.nodeName === 'BR' ||
          (currentSibling.nodeType === 3 && currentSibling.textContent.trim() === '')) {
          currentSibling.parentNode.removeChild(currentSibling);
        }
      }

      const textElement = multimodal.querySelector('.multimodal-text');
      if (textElement && !textElement.hasAttribute('data-cleaned')) {
        const originalText = textElement.innerText || textElement.textContent || '';
        textElement.innerHTML = originalText.trim();
        textElement.setAttribute('data-cleaned', 'true');
      }

      // ⭐ NUEVO: Activar eventos para documentos ⭐
      this.activateDocumentEvents(multimodal);

      if (multimodal.querySelector('.file-name-clickable')) {
        this._initializeFileHandlers(multimodal);
      }
    } catch (error) {
      console.error('Error al limpiar mensaje multimodal:', error);
    }
  },

  /**
   * Inicializa los manejadores de eventos para archivos adjuntos
   * @private
   */
  _initializeFileHandlers(container) {
    if (typeof _initializeFileAttachmentHandlers === 'function') {
      _initializeFileAttachmentHandlers(container);
    } else if (container.querySelector('.file-name-clickable')) {
      setTimeout(() => {
        if (typeof _initializeFileAttachmentHandlers === 'function') {
          _initializeFileAttachmentHandlers(container);
        }
      }, 100);
    }
  },

  /**
   * Obtiene el ícono y color para un tipo de archivo
   * @private
   */
  _getFileIconAndColor(fileType) {
    const iconMap = {
      'document': { icon: 'bxs-file-txt', color: '#3498db' },
      'code': { icon: 'bx-code-alt', color: '#e74c3c' },
      'image': { icon: 'bx-image', color: '#10b981' },
      'pdf': { icon: 'bxs-file-pdf', color: '#e74c3c' },
      'excel': { icon: 'bxs-spreadsheet', color: '#27ae60' },
      'zip': { icon: 'bxs-file-archive', color: '#f39c12' },
      'audio': { icon: 'bxs-music', color: '#9b59b6' },
      'video': { icon: 'bxs-video', color: '#e67e22' }
    };

    return iconMap[fileType] || iconMap['document'];
  },

  /**
 * Verifica si es un archivo de código
 */
_isCodeFile(extension, attachmentType) {
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'json', 'xml', 'yaml', 'yml'];
  return attachmentType === 'code' || codeExtensions.includes(extension);
},

/**
 * Verifica si es un archivo HTML
 */
_isHtmlFile(extension) {
  return ['html', 'htm'].includes(extension);
},

/**
 * Formatea contenido HTML con estructura especial
 */
_formatHtmlContent(content, fileName) {
  let cleanContent = content;
  
  // Si el contenido parece estar mal escapado, intentar limpiarlo
  if (cleanContent.includes('\\n') || cleanContent.includes('\\r') || cleanContent.includes('\\"')) {
    cleanContent = cleanContent
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  }
  
  const lines = cleanContent.split('\n').length;
  const hasDoctype = cleanContent.toLowerCase().includes('<!doctype');
  const hasHtmlTag = cleanContent.toLowerCase().includes('<html');
  const hasBodyTag = cleanContent.toLowerCase().includes('<body');
  const hasHeadTag = cleanContent.toLowerCase().includes('<head');
  
  let htmlType = 'HTML';
  if (hasDoctype && hasHtmlTag && hasBodyTag && hasHeadTag) {
    htmlType = 'HTML Completo';
  } else if (hasHtmlTag) {
    htmlType = 'HTML Parcial';
  } else if (cleanContent.includes('<div') || cleanContent.includes('<span')) {
    htmlType = 'Fragmento HTML';
  }
  
  const frameworks = [];
  if (cleanContent.includes('bootstrap')) frameworks.push('Bootstrap');
  if (cleanContent.includes('jquery')) frameworks.push('jQuery');
  if (cleanContent.includes('vue')) frameworks.push('Vue.js');
  if (cleanContent.includes('react')) frameworks.push('React');
  if (cleanContent.includes('angular')) frameworks.push('Angular');
  
  const frameworkInfo = frameworks.length > 0 ? ` • ${frameworks.join(', ')}` : '';
  
  return `
    <div class="code-header">
      <span class="code-language">HTML</span>
      <span class="file-info">${this._escapeHtml(fileName)} (${this._formatFileSize(cleanContent.length)})</span>
    </div>
    <div class="html-content-wrapper">
      <div class="html-info">
        <i class="bx bx-code-alt"></i>
        <span>${htmlType} - ${lines} líneas${frameworkInfo}</span>
      </div>
      <pre><code class="language-html">${this._escapeHtml(cleanContent)}</code></pre>
    </div>
  `;
},


/**
 * Formatea contenido de texto con header mejorado
 */
_formatTextContent(content, fileName, extension) {
  const lines = content.split('\n').length;
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const chars = content.length;
  
  const fileTypeMap = {
    'txt': 'Documento de Texto',
    'md': 'Markdown',
    'csv': 'Datos CSV',
    'json': 'Datos JSON',
    'xml': 'Documento XML',
    'log': 'Archivo de Log',
    'conf': 'Archivo de Configuración',
    'ini': 'Archivo de Configuración',
    'yaml': 'Archivo YAML',
    'yml': 'Archivo YAML'
  };
  
  const fileType = fileTypeMap[extension] || 'Documento';
  
  // Análisis básico del contenido
  const analysis = [];
  if (extension === 'json') {
    try {
      JSON.parse(content);
      analysis.push('JSON válido');
    } catch (e) {
      analysis.push('JSON con errores');
    }
  }
  
  if (extension === 'csv') {
    const commas = (content.match(/,/g) || []).length;
    const semicolons = (content.match(/;/g) || []).length;
    const delimiter = commas > semicolons ? 'comas' : 'punto y coma';
    analysis.push(`Separador: ${delimiter}`);
  }
  
  if (content.includes('http://') || content.includes('https://')) {
    analysis.push('Contiene URLs');
  }
  
  if (content.includes('@') && content.includes('.com')) {
    analysis.push('Contiene emails');
  }
  
  const analysisText = analysis.length > 0 ? ` • ${analysis.join(' • ')}` : '';
  
  return `
    <div class="document-header">
      <div class="document-info">
        <i class="bx bx-file-txt"></i>
        <div class="document-details">
          <h3>${this._escapeHtml(fileName)}</h3>
          <div class="document-stats">
            <span><i class="bx bx-text"></i> ${lines} líneas</span>
            <span><i class="bx bx-chat"></i> ${words} palabras</span>
            <span><i class="bx bx-data"></i> ${this._formatFileSize(chars)}</span>
            <span><i class="bx bx-file"></i> ${fileType}</span>
          </div>
          ${analysisText ? `<div style="margin-top: 4px; font-size: 0.8rem; color: #6c757d;">${analysisText}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="document-content">
      <pre class="text-content">${this._escapeHtml(content)}</pre>
    </div>
  `;
},

/**
 * Formatea contenido de error
 */
_formatErrorContent(fileName, errorMessage) {
  return `
    <div class="error-header">
      <i class="bx bx-error-circle"></i>
      <h3>Error al cargar: ${this._escapeHtml(fileName)}</h3>
    </div>
    <div class="error-content">
      <div class="error-message">
        <p><strong>Mensaje de error:</strong></p>
        <pre>${this._escapeHtml(errorMessage)}</pre>
      </div>
      <div class="error-suggestions">
        <p><strong>Posibles soluciones:</strong></p>
        <ul>
          <li>Verificar que el archivo no esté corrupto</li>
          <li>Intentar subir el archivo nuevamente</li>
          <li>Contactar soporte si el problema persiste</li>
        </ul>
      </div>
    </div>
  `;
},

/**
 * Detecta lenguaje de programación por nombre de archivo
 */
_detectLanguageFromFileName(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript', 
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'css': 'css',
    'html': 'html',
    'htm': 'html',
    'xml': 'xml',
    'json': 'json',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'bash',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml'
  };
  
  return languageMap[extension] || 'text';
},

/**
 * Formatea tamaño de archivo
 */
_formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
},

/**
 * Escapa HTML para mostrar contenido como texto
 */
_escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  
  // Si el texto es muy largo (más de 100KB), procesarlo por chunks para evitar problemas de rendimiento
  if (text.length > 100000) {
    let result = '';
    const chunkSize = 10000;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      div.textContent = chunk;
      result += div.innerHTML;
    }
    
    return result;
  } else {
    div.textContent = text;
    return div.innerHTML;
  }
},

// ⭐ MODAL SIMPLE MEJORADO ⭐
_showSimpleModal(fileName, content, language) {
  console.log('📱 Mostrando modal simple mejorado');
  
  const extension = fileName.split('.').pop().toLowerCase();
  const isHtml = this._isHtmlFile(extension);
  const isCode = this._isCodeFile(extension, 'code');
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 8px;
    width: 90%;
    height: 90%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;
  
  // Header con información del archivo
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  `;
  
  const fileInfo = document.createElement('div');
  fileInfo.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  
  const icon = isHtml ? 'bx-code-alt' : isCode ? 'bx-code-curly' : 'bx-file-txt';
  const lines = content.split('\n').length;
  const size = this._formatFileSize(content.length);
  
  fileInfo.innerHTML = `
    <i class="bx ${icon}" style="font-size: 1.5rem; color: #007bff;"></i>
    <div>
      <h3 style="margin: 0; color: #333;">${this._escapeHtml(fileName)}</h3>
      <small style="color: #666;">${lines} líneas • ${size}</small>
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    color: #666;
  `;
  closeBtn.innerHTML = '×';
  closeBtn.onmouseover = () => closeBtn.style.background = '#e9ecef';
  closeBtn.onmouseout = () => closeBtn.style.background = 'none';
  
  header.appendChild(fileInfo);
  header.appendChild(closeBtn);
  
  // Contenido
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = `
    flex: 1;
    padding: 20px;
    overflow: auto;
    background: #ffffff;
  `;
  
  const pre = document.createElement('pre');
  pre.style.cssText = `
    margin: 0;
    white-space: pre-wrap;
    font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
    font-size: 14px;
    line-height: 1.4;
    background: ${isCode || isHtml ? '#f8f9fa' : '#fff'};
    padding: 16px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
  `;
  
  const code = document.createElement('code');
  code.textContent = content;
  code.className = `language-${language}`;
  
  pre.appendChild(code);
  contentDiv.appendChild(pre);
  modalContent.appendChild(header);
  modalContent.appendChild(contentDiv);
  modal.appendChild(modalContent);
  
  // Eventos de cierre
  closeBtn.onclick = () => {
    document.body.removeChild(modal);
    console.log('📱 Modal cerrado');
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  document.body.appendChild(modal);
  
  if (window.hljs && (isCode || isHtml)) {
    setTimeout(() => {
      try {
        window.hljs.highlightElement(code);
        console.log('🎨 Highlighting aplicado');
      } catch (e) {
        console.warn('⚠️ Error aplicando highlighting:', e);
      }
    }, 100);
  }
}
};

/**
 * ⭐ FUNCIÓN SUPER ROBUSTA: Extractor de contenido que NO trunca HTML ⭐
 * Reemplaza completamente la lógica de extracción en handleDocumentClick
 */
async function extractDocumentContent(response, fileName) {
  console.log('🔍 Iniciando extracción robusta de contenido...');
  
  const rawText = await response.text();
  
  console.log(`📄 Texto crudo obtenido: ${rawText.length} caracteres`);
  console.log('📄 Primeros 300 caracteres:', rawText.substring(0, 300));
  
  // Intento 1: JSON parsing directo
  try {
    const documentData = JSON.parse(rawText);
    console.log('✅ JSON parseado directamente');
    return documentData;
    
  } catch (jsonError) {
    console.log('❌ Error en JSON directo, intentando métodos alternativos...');
    console.log('❌ Error específico:', jsonError.message);
    
    // MÉTODO MEJORADO: Extracción más inteligente
    if (rawText.includes('{"success":true') && rawText.includes('"extractedContent":')) {
      console.log('🔧 Método mejorado: Extracción inteligente de JSON...');
      
      try {
        const contentMarker = '"extractedContent":"';
        const contentStartIndex = rawText.indexOf(contentMarker);
        
        if (contentStartIndex === -1) {
          throw new Error('No se encontró extractedContent');
        }
        
        const contentDataStart = contentStartIndex + contentMarker.length;
        
        // ⭐ LISTA COMPLETA DE MARCADORES DE METADATOS ⭐
        let endMarkers = [
          '","language":"html"',
          '","language":"',
          '","attachmentType":"',
          '","createdAt":"',     // ← NUEVO: Para eliminar timestamps
          '","updatedAt":"',     // ← NUEVO: Para eliminar timestamps
          '","accessed_at":"',   // ← NUEVO: Para eliminar timestamps  
          '","created_at":"',    // ← NUEVO: Snake_case variant
          '","updated_at":"',    // ← NUEVO: Snake_case variant
          '","fileSize":',       // ← NUEVO: Para eliminar metadata de tamaño
          '","mimeType":"',      // ← NUEVO: Para eliminar tipo MIME
          '","isScanned":',      // ← NUEVO: Para eliminar flags de seguridad
          '","scanResult":',     // ← NUEVO: Para eliminar resultados de scan
          '","isSafe":',         // ← NUEVO: Para eliminar flags de seguridad
          '","isProcessed":',    // ← NUEVO: Para eliminar flags de procesamiento
          '"}]',
          '"}',
          '","'
        ];
        
        let contentEnd = rawText.length - 1;
        let foundMarker = null;
        
        for (const marker of endMarkers) {
          const lastIndex = rawText.lastIndexOf(marker);
          if (lastIndex > contentDataStart && lastIndex < contentEnd) {
            contentEnd = lastIndex;
            foundMarker = marker;
            break;
          }
        }
        
        console.log(`🎯 Marcador final encontrado: "${foundMarker}" en posición ${contentEnd}`);
        
        let extractedContent = rawText.substring(contentDataStart, contentEnd);
        
        console.log(`🎯 Contenido extraído: ${extractedContent.length} caracteres (RAW)`);
        
        // ⭐ VALIDACIÓN DE TAMAÑO ANTES DE DECODIFICAR ⭐
        if (extractedContent.length < 500) {
          console.warn('⚠️ Contenido parece muy corto, intentando método alternativo...');
          throw new Error('Contenido truncado detectado');
        }
        
        // ⭐ LIMPIEZA AVANZADA DE RESIDUOS ⭐
        const metadataPatterns = [
          /","createdAt":"[^"]*".*$/,
          /","updatedAt":"[^"]*".*$/,
          /","accessed_at":"[^"]*".*$/,
          /","created_at":"[^"]*".*$/,
          /","updated_at":"[^"]*".*$/,
          /","fileSize":\d+.*$/,
          /","mimeType":"[^"]*".*$/,
          /","isScanned":(true|false).*$/,
          /","scanResult":"[^"]*".*$/,
          /","isSafe":(true|false).*$/,
          /","isProcessed":(true|false).*$/,
          /","processingError":"[^"]*".*$/,
          /"\}.*$/  // Cualquier cosa después de }
        ];
        
        for (const pattern of metadataPatterns) {
          extractedContent = extractedContent.replace(pattern, '');
        }
        
        console.log('🎯 Primeros 200 caracteres después de limpieza:', extractedContent.substring(0, 200));
        console.log('🎯 Últimos 100 caracteres después de limpieza:', extractedContent.substring(Math.max(0, extractedContent.length - 100)));
        
        extractedContent = extractedContent
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\');
        
        console.log(`✅ Contenido decodificado final: ${extractedContent.length} caracteres`);
        
        // ⭐ VALIDACIÓN FINAL PARA HTML ⭐
        if (fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm')) {
          if (extractedContent.includes('<!DOCTYPE html') || extractedContent.includes('<html')) {
            console.log('✅ HTML válido detectado');
            
            if (extractedContent.includes('</html>')) {
              console.log('✅ HTML tiene etiqueta de cierre correcta');
            } else if (extractedContent.trim().endsWith('>')) {
              console.log('✅ HTML termina con etiqueta válida');
            } else {
              console.warn('⚠️ HTML podría estar incompleto, pero continuando...');
            }
          }
        }
        
        const result = {
          success: true,
          file: {
            extractedContent: extractedContent,
            originalName: fileName,
            language: 'html',
            attachmentType: 'code'
          }
        };
        
        return result;
        
      } catch (method1Error) {
        console.warn('❌ Método mejorado falló:', method1Error.message);
      }
    }
    
    // MÉTODO 2: Búsqueda directa más agresiva
    if (rawText.includes('<!DOCTYPE html') || rawText.includes('<html')) {
      console.log('🔧 Método 2: Búsqueda directa más agresiva...');
      
      try {
        let htmlStart = rawText.indexOf('<!DOCTYPE html');
        if (htmlStart === -1) {
          htmlStart = rawText.indexOf('<html');
        }
        
        if (htmlStart === -1) {
          throw new Error('No se encontró inicio de HTML');
        }
        
        // ⭐ BÚSQUEDA MEJORADA DEL FINAL ⭐
        let htmlEnd = rawText.lastIndexOf('</html>');
        if (htmlEnd !== -1) {
          htmlEnd += 7; // incluir "</html>"
          console.log('🎯 Encontrado </html> en posición:', htmlEnd);
        } else {
          // Si no hay </html>, buscar otros marcadores del final
          const endPatterns = [
            '","language"',
            '","attachmentType"',
            '","createdAt"',
            '","updatedAt"',
            '","fileSize"',
            '"}',
            '}'
          ];
          
          for (const pattern of endPatterns) {
            const lastIndex = rawText.lastIndexOf(pattern);
            if (lastIndex > htmlStart) {
              htmlEnd = lastIndex;
              console.log(`🎯 Encontrado marcador alternativo "${pattern}" en posición:`, lastIndex);
              break;
            }
          }
          
          if (!htmlEnd) {
            htmlEnd = rawText.length - 10; // seguro hacia atrás
            console.log('🎯 Usando posición segura hacia atrás:', htmlEnd);
          }
        }
        
        let extractedHtml = rawText.substring(htmlStart, htmlEnd);
        
        // ⭐ LIMPIEZA ESPECÍFICA PARA HTML ⭐
        extractedHtml = extractedHtml
          .replace(/","createdAt":"[^"]*".*$/, '')
          .replace(/","updatedAt":"[^"]*".*$/, '')
          .replace(/","[^"]*":[^,}]*.*$/, '') // Cualquier otro campo JSON
          .replace(/\}.*$/, ''); // Cualquier cosa después de }
        
        extractedHtml = extractedHtml
          .replace(/\\r\\n/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\');
        
        console.log(`✅ HTML extraído y limpio: ${extractedHtml.length} caracteres`);
        
        const result = {
          success: true,
          file: {
            extractedContent: extractedHtml,
            originalName: fileName,
            language: 'html',
            attachmentType: 'code'
          }
        };
        
        return result;
        
      } catch (method2Error) {
        console.warn('❌ Método 2 falló:', method2Error.message);
      }
    }
    
    // Si todo falla
    throw new Error(`No se pudo extraer el contenido. Error: ${jsonError.message}`);
  }
}


/**
 * ⭐ NUEVA: Procesa mensajes inmediatamente sin delays ⭐
 */
function processMessagesImmediately(container = null) {
  const searchContainer = container || document.querySelector('.chat-messages');
  if (!searchContainer) return;

  console.log('⚡ Procesamiento inmediato de mensajes iniciado...');

  const userMessages = searchContainer.querySelectorAll('.user-message');
  
  userMessages.forEach(messageElement => {
    try {
      const textElements = messageElement.querySelectorAll('.message-text, .message-content, .multimodal-text');
      
      textElements.forEach(textElement => {
        const content = textElement.textContent || textElement.innerHTML;
        
        if (content && 
            typeof content === 'string' && 
            !textElement.hasAttribute('data-processed') &&
            content.trim().startsWith('{') &&
            (content.includes('hasDocuments') || 
             content.includes('documents') || 
             content.includes('hasImage') || 
             content.includes('images'))) {
          
          console.log('⚡ Procesando JSON inmediatamente...');
          
          const processedContent = contentProcessing.detectMultimodalContent(content, false);
          
          if (processedContent !== content) {
            textElement.innerHTML = processedContent;
            textElement.setAttribute('data-processed', 'true');
            
            contentProcessing.activateDocumentEvents(textElement);
            
            console.log('✅ JSON procesado inmediatamente');
          }
        }
        
        // También verificar data-original-text
        const originalText = textElement.dataset?.originalText;
        if (originalText && !textElement.hasAttribute('data-processed')) {
          try {
            const decodedText = decodeURIComponent(originalText);
            if (decodedText.trim().startsWith('{') && 
                (decodedText.includes('hasDocuments') || decodedText.includes('documents'))) {
              
              const processedHTML = contentProcessing.detectMultimodalContent(decodedText, false);
              if (processedHTML !== decodedText) {
                textElement.innerHTML = processedHTML;
                textElement.setAttribute('data-processed', 'true');
                
                contentProcessing.activateDocumentEvents(textElement);
                console.log('✅ originalText procesado inmediatamente');
              }
            }
          } catch (e) {
            console.warn('Error al procesar originalText:', e);
          }
        }
      });
      
    } catch (error) {
      console.error('Error al procesar mensaje inmediatamente:', error);
    }
  });
}

/**
 * ⭐ NUEVA: Procesa un elemento de mensaje inmediatamente ⭐
 */
function processMessageElementImmediately(messageElement) {
  try {
    const textElements = messageElement.querySelectorAll('.message-text, .message-content, div');
    
    textElements.forEach(textElement => {
      const content = textElement.textContent || textElement.innerHTML;
      
      // Solo procesar si parece JSON y no ha sido procesado
      if (content && 
          typeof content === 'string' && 
          !textElement.hasAttribute('data-processed') &&
          content.trim().startsWith('{') &&
          (content.includes('hasDocuments') || 
           content.includes('documents') || 
           content.includes('hasImage') || 
           content.includes('images'))) {
        
        console.log('⚡ Procesamiento inmediato de JSON detectado');
        
        try {
          const processedContent = contentProcessing.detectMultimodalContent(content, false);
          
          if (processedContent !== content) {
            textElement.innerHTML = processedContent;
            textElement.setAttribute('data-processed', 'true');
            
            contentProcessing.activateDocumentEvents(textElement);
            
            console.log('✅ JSON procesado inmediatamente');
          }
        } catch (processingError) {
          console.warn('Error en procesamiento inmediato:', processingError);
          
          requestAnimationFrame(() => {
            const processedContent = contentProcessing.detectMultimodalContent(content, false);
            
            if (processedContent !== content) {
              textElement.innerHTML = processedContent;
              textElement.setAttribute('data-processed', 'true');
              contentProcessing.activateDocumentEvents(textElement);
            }
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error al procesar elemento inmediatamente:', error);
  }
}

contentProcessing.processMessagesImmediately = processMessagesImmediately;
contentProcessing.processMessageElementImmediately = processMessageElementImmediately;

export { processMessagesImmediately, processMessageElementImmediately };


export default contentProcessing;

// También exportar funciones individuales para un uso más directo
export const detectMultimodalContent = (content, isAIResponse) =>
  contentProcessing.detectMultimodalContent(content, isAIResponse);

export const cleanMultimodalExistingContent = (container, isAIMessage) =>
  contentProcessing.cleanMultimodalExistingContent(container, isAIMessage);

export const parseJsonPreservingMath = (jsonText) =>
  contentProcessing.parseJsonPreservingMath(jsonText);

// ⭐ NUEVAS EXPORTACIONES ⭐
export const processExistingDocuments = (container) =>
  contentProcessing.processExistingDocuments(container);

export const activateDocumentEvents = (container) =>
  contentProcessing.activateDocumentEvents(container);

export const handleDocumentClick = (docElement) =>
  contentProcessing.handleDocumentClick(docElement);