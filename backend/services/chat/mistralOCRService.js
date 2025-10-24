// src/services/chat/mistralOCRService.js

import { Mistral } from '@mistralai/mistralai';
import { MistralConfig } from '../../lib/mistralConfig.js';
import { wasRequestCancelled } from './fileService.js';

/**
 * Servicio para interactuar con la API de Mistral OCR
 */
export const MistralOCRService = {
  /**
   * Inicializa el cliente de Mistral
   * @param {string} apiKey - La API key de Mistral (opcional, por defecto usa la de config)
   * @returns {Mistral} - Cliente inicializado
   */
  initClient(apiKey = MistralConfig.apiKey) {
    if (!apiKey) {
      throw new Error('API key de Mistral no proporcionada');
    }
    return new Mistral({ apiKey });
  },

  /**
 * Sube un archivo PDF a Mistral y procesa con OCR
 * @param {Object} options - Opciones para procesamiento
 * @param {Buffer} options.fileBuffer - Buffer del archivo PDF
 * @param {string} options.apiKey - API key de Mistral (opcional, usa la de config)
 * @param {string} options.originalFilename - Nombre original del archivo
 * @param {string} options.chatId - ID del chat (para verificar cancelación)
 * @param {number} options.userId - ID del usuario (para verificar cancelación)
 * @returns {Promise<Object>} - Resultado del procesamiento OCR
 */
async processPDFWithOCR({ 
  fileBuffer, 
  apiKey = MistralConfig.apiKey, 
  originalFilename = 'document.pdf',
  chatId = null,
  userId = null
}) {
  console.log("Iniciando procesamiento OCR con Mistral para archivo:", originalFilename);
  const startTime = Date.now();
  
  try {
    // Verificar cancelación antes de comenzar
    if (chatId && userId) {
      const isCancelled = await wasRequestCancelled(chatId, userId);
      if (isCancelled) {
        console.log(`Procesamiento OCR cancelado para chatId=${chatId}`);
        return {
          success: false,
          error: 'Procesamiento cancelado por el usuario',
          cancelled: true
        };
      }
    }
    
    // Inicializar cliente
    const client = this.initClient(apiKey);
    
    // 1. Subir el archivo a Mistral
    console.log("Subiendo archivo a Mistral...");
    const uploadedFile = await client.files.upload({
      file: {
        fileName: originalFilename,
        content: fileBuffer,
      },
      purpose: "ocr"
    });
    
    console.log(`Archivo subido con éxito. ID: ${uploadedFile.id}`);
    
    // Verificar cancelación después de subir archivo
    if (chatId && userId) {
      const isCancelled = await wasRequestCancelled(chatId, userId);
      if (isCancelled) {
        console.log(`Procesamiento OCR cancelado después de subir a Mistral para chatId=${chatId}`);
        return {
          success: false,
          error: 'Procesamiento cancelado por el usuario',
          cancelled: true,
          metadata: {
            fileId: uploadedFile.id // Devolver fileId para limpieza posterior
          }
        };
      }
    }
    
    // 2. Obtener URL firmada para el archivo
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedFile.id,
    });
    
    // 3. Procesar con OCR
    console.log("Procesando archivo con OCR...");
    const ocrResponse = await client.ocr.process({
      model: MistralConfig.model,
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
      include_image_base64: MistralConfig.ocrOptions.includeImageBase64
    });
    
    // Verificar cancelación después de procesar OCR
    if (chatId && userId) {
      const isCancelled = await wasRequestCancelled(chatId, userId);
      if (isCancelled) {
        console.log(`Procesamiento OCR cancelado después de completar OCR para chatId=${chatId}`);
        return {
          success: false,
          error: 'Procesamiento cancelado por el usuario',
          cancelled: true,
          metadata: {
            fileId: uploadedFile.id
          }
        };
      }
    }
    
    console.log("Procesamiento OCR completado");
      
      // DEBUG: Imprimir estructura básica de la respuesta
      const responseStructure = {
        hasPages: !!ocrResponse.pages,
        pageCount: ocrResponse.pages?.length || 0,
        firstPageHasMarkdown: ocrResponse.pages?.[0]?.markdown ? true : false,
        metadata: ocrResponse.metadata || {},
      };
      console.log("Estructura respuesta OCR:", JSON.stringify(responseStructure));
      
      // Asegurar que la respuesta tenga la estructura esperada
      if (!ocrResponse.pages || !Array.isArray(ocrResponse.pages)) {
        console.warn("La respuesta OCR no contiene la estructura esperada de páginas");
        // Crear estructura mínima esperada
        ocrResponse.pages = [{ markdown: `[OCR sin contenido de texto para ${originalFilename}]` }];
      }
      
      return {
        success: true,
        ocr: ocrResponse,
        metadata: {
          fileId: uploadedFile.id,
          processingTime: Date.now() - startTime,
          originalName: originalFilename
        }
      };
    } catch (error) {
      console.error("Error en procesamiento OCR con Mistral:", error);
      
      // Manejar reintentos si está configurado
      if (MistralConfig.processingOptions.maxRetries > 0) {
        console.log(`Reintentando procesamiento OCR (quedan ${MistralConfig.processingOptions.maxRetries} intentos)...`);
        // Se podría implementar la lógica de reintento aquí si es necesario
      }
      
      return {
        success: false,
        error: error.message,
        details: error.details || {},
        processingTime: Date.now() - startTime
      };
    }
  },
  
  /**
   * Convierte los resultados del OCR a formato compatible con el sistema actual
   * @param {Object} ocrResults - Resultados del OCR de Mistral
   * @param {string} userId - ID del usuario
   * @param {string} chatId - ID del chat
   * @returns {Array} - Documentos en formato compatible con el sistema actual
   */
  convertOCRToDocuments(ocrResults, userId, chatId) {
    if (!ocrResults || !ocrResults.pages || !Array.isArray(ocrResults.pages)) {
      console.error("Resultados OCR inválidos:", JSON.stringify(ocrResults || {}).slice(0, 200) + "...");
      throw new Error('Resultados OCR inválidos o vacíos');
    }
    
    // DEBUG: Imprimir información sobre las páginas
    console.log(`Convirtiendo ${ocrResults.pages.length} páginas OCR a documentos`);
    
    // Preparar documentos
    const documents = [];
    
    // Procesar cada página
    ocrResults.pages.forEach((page, pageIndex) => {
      // El pageIndex es 0-based, pero queremos que page sea 1-based
      const pageNumber = pageIndex + 1;
      
      // Verificar si la página existe y tiene estructura válida
      if (!page) {
        console.warn(`Página ${pageNumber} es inválida o vacía`);
        return; // Saltar esta página
      }
      
      // Extraer contenido de texto (asegurarse de que existe)
      // NOTA: Mistral OCR devuelve el texto en la propiedad 'markdown' no en 'content'
      let pageContent = '';
      if (page.markdown) {
        pageContent = page.markdown;
        // DEBUG: Mostrar una muestra del contenido
        console.log(`Página ${pageNumber} - Longitud texto: ${pageContent.length} caracteres`);
        if (pageContent.length > 0) {
          console.log(`Página ${pageNumber} - Muestra: ${pageContent.slice(0, 100)}...`);
        }
      } else {
        console.warn(`Página ${pageNumber} no tiene propiedad 'markdown'`);
        pageContent = `[Página ${pageNumber} sin texto reconocible]`;
      }
      
      // Detectar elementos especiales
      const specialElements = this.extractSpecialElements(page, pageNumber);
      
      // DEBUG: Informar sobre elementos especiales encontrados
      console.log(`Página ${pageNumber} - Elementos especiales: ${specialElements.images.length} imágenes, ${specialElements.tables.length} tablas, ${specialElements.formulas.length} fórmulas`);
      
      // Crear documento
      const document = {
        pageContent,
        metadata: {
          id_user: userId,
          id_chat: chatId,
          page: pageNumber,
          pageCount: ocrResults.pages.length,
          specialElements: specialElements
        }
      };
      
      documents.push(document);
    });
    
    if (documents.length === 0) {
      console.warn("No se pudo extraer ningún documento de los resultados OCR");
      // Crear al menos un documento vacío para evitar errores posteriores
      documents.push({
        pageContent: "[Documento sin contenido reconocible por OCR]",
        metadata: {
          id_user: userId,
          id_chat: chatId,
          page: 1,
          pageCount: ocrResults.pages.length || 1,
          specialElements: {
            images: [],
            formulas: [],
            tables: []
          }
        }
      });
    }
    
    return documents;
  },
  
  /**
   * Extrae elementos especiales de una página de OCR
   * @param {Object} page - Página de resultados OCR
   * @param {number} pageNumber - Número de página
   * @returns {Object} - Elementos especiales encontrados
   */
  extractSpecialElements(page, pageNumber) {
    // Verificar que page es un objeto válido
    if (!page || typeof page !== 'object') {
      console.warn(`Página inválida para pageNumber ${pageNumber}`);
      return {
        images: [],
        formulas: [],
        tables: []
      };
    }
    
    const specialElements = {
      images: [],
      formulas: [],
      tables: []
    };
    
    // Extraer imágenes
    if (page.images && Array.isArray(page.images)) {
      page.images.forEach((image, idx) => {
        // DEBUG: Información sobre la imagen encontrada
        console.log(`Página ${pageNumber} - Imagen ${idx} detectada`);
        
        specialElements.images.push({
          pageNum: pageNumber,
          reference: `page_${pageNumber}_img_${idx}`,
          type: 'image',
          source: 'mistral_ocr',
          data: image.image_base64 || null, // Mistral devuelve base64 como image_base64
          position: {
            top_left_x: image.top_left_x || 0,
            top_left_y: image.top_left_y || 0,
            bottom_right_x: image.bottom_right_x || 0,
            bottom_right_y: image.bottom_right_y || 0
          }
        });
      });
    }
    
    // Extraer tablas
    if (page.tables && Array.isArray(page.tables)) {
      page.tables.forEach((table, idx) => {
        // DEBUG: Información sobre la tabla encontrada
        console.log(`Página ${pageNumber} - Tabla ${idx} detectada con ${table.rows?.length || 0} filas`);
        
        // Procesar tabla a formato compatible
        const processedTable = {
          pageNum: pageNumber,
          reference: `page_${pageNumber}_table_${idx}`,
          type: 'table',
          source: 'mistral_ocr',
          rows: table.rows || [],
          rowCount: table.rows ? table.rows.length : 0,
          columnCount: table.rows && table.rows[0] ? table.rows[0].length : 0
        };
        
        specialElements.tables.push(processedTable);
      });
    }
    
    // Extraer fórmulas matemáticas si Mistral las proporciona
    if (page.formulas && Array.isArray(page.formulas)) {
      page.formulas.forEach((formula, idx) => {
        // DEBUG: Información sobre la fórmula encontrada
        console.log(`Página ${pageNumber} - Fórmula ${idx} detectada: ${formula.content?.slice(0, 30) || '[vacía]'}...`);
        
        specialElements.formulas.push({
          pageNum: pageNumber,
          reference: `page_${pageNumber}_formula_${idx}`,
          type: 'formula',
          content: formula.content || '',
          source: 'mistral_ocr'
        });
      });
    } else if (page.markdown && typeof page.markdown === 'string') {
      // Si Mistral no detecta fórmulas explícitamente, intentamos identificar patrones comunes
      // Este es un enfoque básico que podría ser mejorado
      const mathPatterns = [
        /\$[^$]+\$/g,                    // LaTeX inline: $formula$
        /\\\([^)]+\\\)/g,                // LaTeX inline: \(formula\)
        /\\\[[^\]]+\\\]/g,               // LaTeX block: \[formula\]
        /\\begin\{equation\}.*?\\end\{equation\}/gs,  // LaTeX equation
        /\\begin\{align\}.*?\\end\{align\}/gs,       // LaTeX align
      ];
      
      let formulaIdx = 0;
      mathPatterns.forEach(pattern => {
        try {
          const matches = page.markdown.match(pattern);
          if (matches && matches.length > 0) {
            console.log(`Página ${pageNumber} - Detectadas ${matches.length} fórmulas con patrón ${pattern}`);
            matches.forEach(match => {
              specialElements.formulas.push({
                pageNum: pageNumber,
                reference: `page_${pageNumber}_formula_${formulaIdx++}`,
                type: 'formula',
                content: match,
                detectionMethod: 'pattern',
                source: 'mistral_ocr_pattern'
              });
            });
          }
        } catch (error) {
          console.warn(`Error detectando fórmulas con patrón en página ${pageNumber}:`, error.message);
        }
      });
    }
    
    return specialElements;
  },
  
  /**
   * Elimina un archivo subido a Mistral
   * @param {string} fileId - ID del archivo en Mistral
   * @param {string} apiKey - API key de Mistral (opcional, por defecto usa la de config)
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteFile(fileId, apiKey = MistralConfig.apiKey) {
    try {
      const client = this.initClient(apiKey);
      const result = await client.files.delete({
        fileId: fileId
      });
      
      return {
        success: true,
        message: `Archivo ${fileId} eliminado con éxito`
      };
    } catch (error) {
      console.error(`Error eliminando archivo ${fileId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default MistralOCRService;