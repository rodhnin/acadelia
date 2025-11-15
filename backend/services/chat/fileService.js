// src/services/chat/fileService.js

import { embeddings } from '../../lib/openai.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importaciones refactorizadas
import PDFStorageService from './pdf/pdfStorageService.js';
import PDFUtils from './pdf/pdfUtils.js';
import pdfProcessingQueue from './pdf/asyncProcessing.js';
import { checkFontPaths } from './pdf/pdfConfig.js';
import { MistralOCRService } from './mistralOCRService.js';
import PDFImageRenderer from './pdf/pdfImageRenderer.js';
import { redisService } from '../../lib/redis.js';
import { saveMessage } from '../../utils/chat/chat.js';
import pool from '../../lib/dbPool.js';

checkFontPaths();

const DEFAULT_CONFIG = {
  maxFileSize: 50 * 1024 * 1024,
  chunkSize: 3500,
  chunkOverlap: 1000,
  maxConcurrentEmbeddings: 5,
  tempFileTimeout: 5 * 60 * 1000,
  validMimeTypes: ['application/pdf']
};

/**
 * Servicio principal para procesar y gestionar archivos PDF con Mistral OCR
 * VERSIÓN OPTIMIZADA - Elimina redundancias y centraliza funcionalidad
 */
export const PDFService = {
  config: DEFAULT_CONFIG,

  // Inicializa métricas de procesamiento
  initMetrics() {
    return {
      startTime: Date.now(),
      totalChunks: 0,
      processedChunks: 0,
      failedChunks: 0,
      imageCount: 0,
      formulaCount: 0,
      tableCount: 0,
      specialElements: {
        images: [],
        formulas: [],
        tables: []
      }
    };
  },

  /**
   * 🚀 FUNCIÓN PRINCIPAL SIMPLIFICADA - Procesa PDF completo
   */
  async processPDF({ fileBuffer, userId, chatId, metadata = {} }) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootDir = path.resolve(__dirname, '../../..');
    const tmpDir = path.join(rootDir, 'tmp');
    let tempFilePath = '';

    this.processingMetrics = this.initMetrics();
    registerProcessing(chatId, userId, metadata.tempFiles || []);

    try {
      updateProcessingProgress(chatId, userId, 0, 'Iniciando procesamiento');

      await PDFUtils.validateFile(fileBuffer, this.config.maxFileSize);
      updateProcessingProgress(chatId, userId, 10, 'Archivo validado correctamente');

      if (await shouldAbortProcessing(chatId, userId, 'post-validate')) {
        throw new Error('Procesamiento cancelado por el usuario');
      }

      const fileInfo = await PDFStorageService.savePDFFile(
        fileBuffer, chatId, userId, metadata.originalName || 'document.pdf'
      );
      updateProcessingProgress(chatId, userId, 20, 'Archivo guardado');

      metadata.fileInfo = {
        savedName: fileInfo.savedName,
        relativePath: fileInfo.relativePath,
        size: fileInfo.size,
        fullPath: fileInfo.path,
        totalPages: null // Será establecido por Mistral OCR
      };

      await fs.promises.mkdir(tmpDir, { recursive: true });
      tempFilePath = await PDFUtils.saveTempFileStream(fileBuffer, tmpDir);

      if (!metadata.tempFiles) metadata.tempFiles = [];
      metadata.tempFiles.push(tempFilePath);

      updateProcessingProgress(chatId, userId, 40, 'Procesando con Mistral OCR');

      const ocrResult = await this.processCompletePDFWithMistral(
        fileBuffer, userId, chatId, metadata, fileInfo
      );

      const totalPages = ocrResult.totalPages;
      metadata.fileInfo.totalPages = totalPages;

      updateProcessingProgress(chatId, userId, 70, `OCR completado - ${totalPages} páginas`);

      await PDFStorageService.storeDocumentsInDB(
        ocrResult.allDocuments, userId, chatId, metadata,
        this.processingMetrics, this.generateEmbedding.bind(this)
      );

      updateProcessingProgress(chatId, userId, 90, 'Documentos guardados');

      const messageInfo = await this.sendCompletionMessage(userId, chatId, metadata, totalPages);

      updateProcessingProgress(chatId, userId, 100, 'Procesamiento completado');
      completeProcessing(chatId, userId);

      return {
        status: 'fully_processed',
        chunks: ocrResult.allDocuments.length,
        fileInfo: fileInfo,
        totalPages: totalPages,
        pagesProcessed: totalPages,
        backgroundProcessing: false,
        assistantMessage: messageInfo,
        metrics: {
          ...this.processingMetrics,
          processingTime: Date.now() - this.processingMetrics.startTime,
          ocrProvider: 'mistral',
          totalPages: totalPages
        }
      };

    } catch (error) {
      console.error('Error procesando PDF:', error);
      const key = `${chatId}_${userId}`;
      const info = processingRegistry.get(key);
      if (info) {
        info.isProcessing = false;
        info.status = `Error: ${error.message}`;
        processingRegistry.set(key, info);
      }
      throw PDFUtils.enhanceError(error, this.processingMetrics);
    } finally {
      if (tempFilePath) {
        try {
          if (process.env.TEMP_PDF_PATH === tempFilePath) {
            delete process.env.TEMP_PDF_PATH;
          }
        } catch (cleanupError) {
          console.warn("Error manipulando variable de entorno:", cleanupError.message);
        }
      }
    }
  },

  /**
   * ✅ FUNCIÓN SIMPLIFICADA - Procesamiento con Mistral OCR
   */
  async processCompletePDFWithMistral(fileBuffer, userId, chatId, metadata, fileInfo) {
    try {
      console.log("Procesando PDF completo con Mistral OCR...");

      const { result: ocrResult } = await pdfProcessingQueue.enqueue(
        async () => {
          if (await shouldAbortProcessing(chatId, userId, 'pre-ocr')) {
            throw new Error('Procesamiento cancelado por el usuario');
          }

          const result = await MistralOCRService.processPDFWithOCR({
            fileBuffer,
            originalFilename: metadata.originalName || 'document.pdf',
            chatId,
            userId
          });

          if (!result.success) {
            throw new Error(`Error OCR: ${result.error}`);
          }

          return result;
        },
        {
          priority: 3,
          pdfId: fileInfo.savedName,
          timeout: 180000,
          maxAttempts: 2,
          chatId: chatId,
          pageType: 'full_pdf'
        }
      );

      const allDocuments = MistralOCRService.convertOCRToDocuments(ocrResult.ocr, userId, chatId);

      let actualPageCount = 1;
      if (ocrResult.ocr && ocrResult.ocr.pages && Array.isArray(ocrResult.ocr.pages)) {
        actualPageCount = ocrResult.ocr.pages.length;
        console.log(`📄 Mistral OCR detectó: ${actualPageCount} páginas`);
      } else {
        actualPageCount = allDocuments.length > 0 ?
          Math.max(...allDocuments.map(doc => doc.metadata?.page || 1)) : 1;
      }

      if (metadata.fileInfo) {
        metadata.fileInfo.totalPages = actualPageCount;
      }

      if (allDocuments.length === 0) {
        throw new Error('El procesamiento OCR no generó documentos válidos');
      }

      console.log(`✅ OCR completado: ${allDocuments.length} documentos de ${actualPageCount} páginas`);

      return {
        allDocuments: allDocuments,
        ocrMetadata: ocrResult.metadata,
        totalPages: actualPageCount
      };
    } catch (error) {
      console.error('Error procesando PDF completo:', error);
      throw error;
    }
  },

  /**
   * ✅ MENSAJE ÚNICO SIMPLIFICADO
   */
  async sendCompletionMessage(userId, chatId, metadata, totalPages) {
    try {
      console.log(`📤 Enviando mensaje de completado para PDF de ${totalPages} páginas`);

      const completionMessage = `## 📄 PDF Procesado Completamente

**Nombre:** ${metadata.fileInfo?.originalName || 'Documento'}
**Páginas:** ${totalPages} páginas
**Estado:** ✅ Procesamiento completado

Tu documento PDF ha sido procesado exitosamente y está listo para consultas.`;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let messageEmbedding = null;
        try {
          messageEmbedding = await Promise.race([
            embeddings.embedQuery(completionMessage),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 15000))
          ]);
        } catch (embeddingError) {
          console.warn(`⚠️ Error en embedding: ${embeddingError.message}`);
          messageEmbedding = new Array(1536).fill(0.2);
        }

        const herramientaId = metadata.herramientaId || 1;

        const messageResult = await saveMessage({
          client, userId, avaId: herramientaId, chatId,
          role: "assistant", message: completionMessage, embedding: messageEmbedding
        });

        await client.query('COMMIT');

        console.log(`✅ Mensaje de completado enviado exitosamente`);

        return {
          messageId: messageResult?.id || null,
          message: completionMessage,
          totalPages: totalPages,
          timestamp: Date.now(),
          sent: true
        };

      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error("❌ Error guardando mensaje:", dbError);
        return {
          messageId: null,
          message: completionMessage,
          totalPages: totalPages,
          timestamp: Date.now(),
          sent: false,
          fallback: true
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ Error en mensaje de completado: ${error.message}`);
      return {
        messageId: null,
        message: `PDF de ${totalPages || 'múltiples'} páginas procesado exitosamente`,
        totalPages: totalPages || 1,
        timestamp: Date.now(),
        sent: false,
        fallback: true
      };
    }
  },

  /**
   * Verifica el estado de procesamiento de un PDF
   */
  async getProcessingStatus(chatId, userId) {
    try {
      const key = `${chatId}_${userId}`;
      const info = processingRegistry.get(key);

      if (!info) {
        try {
          const hasPdfCheck = await this.hasPDFProcessed(chatId, userId);
          if (hasPdfCheck) {
            return {
              isProcessing: false,
              progress: 100,
              status: 'PDF procesado completamente',
              elapsedTime: 0,
              backgroundProcessing: false,
              backgroundProgress: 100,
              readyPages: await PDFStorageService.getReadyPageNumbers(chatId, userId)
            };
          }
        } catch (checkError) {
          console.warn(`Error verificando PDF: ${checkError.message}`);
        }

        return {
          isProcessing: false,
          progress: 0,
          status: 'No hay procesamiento activo',
          backgroundProcessing: false,
          backgroundProgress: 0,
          readyPages: []
        };
      }

      if (info.cancelled && info.isProcessing) {
        info.isProcessing = false;
        info.status = 'Procesamiento cancelado';
      }

      const elapsedTime = Date.now() - info.startTime;

      let readyPages = [];
      try {
        readyPages = await PDFStorageService.getReadyPageNumbers(chatId, userId);
      } catch (error) {
        console.warn('Error obteniendo páginas listas:', error.message);
      }

      return {
        ...info,
        elapsedTime,
        readyPages,
        totalPagesReady: readyPages.length
      };
    } catch (error) {
      console.error(`Error obteniendo estado: ${error.message}`);
      return {
        isProcessing: false,
        progress: 0,
        status: 'Error al obtener estado',
        error: error.message,
        backgroundProcessing: false,
        backgroundProgress: 0,
        readyPages: []
      };
    }
  },

  /**
   * Cancela un procesamiento en curso
   */
  async cancelProcessing(chatId, userId) {
    return await cancelProcessing(chatId, userId);
  },

  /**
   * Genera un embedding para un texto
   */
  async generateEmbedding(text) {
    if (!text || text.trim() === '') {
      console.warn("Intento de generar embedding para texto vacío");
      return null;
    }

    try {
      const { result } = await pdfProcessingQueue.enqueue(
        async () => {
          const embedding = await embeddings.embedQuery(text);
          return Array.isArray(embedding) ? embedding : null;
        },
        {
          priority: 0,
          timeout: 15000
        }
      );

      return result;
    } catch (error) {
      console.error("Error generando embedding:", error.message);
      return null;
    }
  },

  /**
   * Obtiene información del PDF procesado
   */
  async getPDFInfo(chatId, userId) {
    try {
      const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, userId);

      if (!documents || documents.length === 0) {
        return {
          found: false,
          message: "No se encontraron documentos PDF para este chat"
        };
      }

      const pageCount = new Set();
      const specialElements = {
        images: [],
        formulas: [],
        tables: []
      };

      documents.forEach(doc => {
        if (doc.metadata && doc.metadata.page) {
          pageCount.add(doc.metadata.page);
        }

        if (doc.metadata && doc.metadata.specialElements) {
          const elements = doc.metadata.specialElements;
          if (elements.images) specialElements.images.push(...elements.images);
          if (elements.formulas) specialElements.formulas.push(...elements.formulas);
          if (elements.tables) specialElements.tables.push(...elements.tables);
        }
      });

      const fileInfo = await PDFStorageService.getPDFFileInfo(chatId, userId);

      return {
        found: true,
        chunksCount: documents.length,
        pageCount: pageCount.size,
        metadata: documents[0]?.metadata || {},
        elementCounts: {
          images: specialElements.images.length,
          formulas: specialElements.formulas.length,
          tables: specialElements.tables.length
        },
        ocrProvider: 'mistral',
        fileInfo: fileInfo.success ? {
          originalName: fileInfo.originalName,
          relativePath: fileInfo.relativePath,
          size: fileInfo.size
        } : null
      };
    } catch (error) {
      console.error('Error obteniendo información del PDF:', error);
      throw error;
    }
  },

  /**
   * ✅ EXTRACCIÓN DE TEXTO SIMPLIFICADA CON CACHÉ
   */
  async extractPDFTextForChat(chatId, userId, options = {}) {
    try {
      const {
        maxPages = 3,
        includePageNumbers = true,
        pdfId = null,
        specificPage = null,
        useCache = true
      } = options;

      console.log(`📚 Extrayendo texto del PDF - chatId: ${chatId}, userId: ${userId}, pdfId: ${pdfId || 'no especificado'}`);

      if (useCache) {
        try {
          const cacheOptions = { maxPages, includePageNumbers, specificPage };
          const cachedResult = await redisService.getTextExtractionCache(chatId, userId, pdfId, cacheOptions);

          if (cachedResult) {
            console.log(`📦 Texto servido desde caché`);
            return cachedResult;
          }
        } catch (cacheError) {
          console.warn(`⚠️ Error consultando caché de texto: ${cacheError.message}`);
        }
      }

      const result = await this._performTextExtraction(chatId, userId, options);

      if (useCache && result.success) {
        try {
          const cacheOptions = { maxPages, includePageNumbers, specificPage };
          await redisService.setTextExtractionCache(chatId, userId, pdfId, cacheOptions, result);
        } catch (cacheError) {
          console.warn(`⚠️ Error guardando en caché de texto: ${cacheError.message}`);
        }
      }

      return result;
    } catch (error) {
      console.error("❌ Error extrayendo texto del PDF:", error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  /**
   * ✅ FUNCIÓN CORE DE EXTRACCIÓN DE TEXTO
   */
  async _performTextExtraction(chatId, userId, options = {}) {
    const {
      maxPages = 3,
      includePageNumbers = true,
      pdfId = null,
      specificPage = null
    } = options;

    try {
      const extractAllPages = maxPages <= 0;

      let pdfFileInfo;
      try {
        pdfFileInfo = await PDFStorageService.getPDFFileInfo(chatId, userId, pdfId);
      } catch (pdfInfoError) {
        return {
          success: false,
          error: `Error accediendo al archivo PDF: ${pdfInfoError.message}`
        };
      }

      if (!pdfFileInfo.success) {
        return {
          success: false,
          error: pdfFileInfo.error || "No se encontró el archivo PDF"
        };
      }

      const pdfPath = pdfFileInfo.path;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        return {
          success: false,
          error: !pdfPath ? 'La ruta del archivo PDF no está disponible' : `El archivo PDF no existe en la ruta especificada: ${pdfPath}`
        };
      }

      PDFUtils.extendTempFileLife(pdfPath);

      let documents;
      try {
        documents = await PDFStorageService.findPDFDocumentsByChat(
          chatId, userId, pdfFileInfo.savedName
        );
      } catch (dbError) {
        return {
          success: false,
          error: `Error accediendo a los documentos procesados: ${dbError.message}`
        };
      }

      if (!documents || documents.length === 0) {
        return {
          success: false,
          error: "No se encontraron documentos procesados para este PDF"
        };
      }

      documents.sort((a, b) => {
        const pageA = a.metadata?.page || 0;
        const pageB = b.metadata?.page || 0;
        return pageA - pageB;
      });

      let documentsToShow = [...documents];

      if (specificPage !== null) {
        documentsToShow = documents.filter(doc =>
          doc.metadata &&
          (doc.metadata.page === parseInt(specificPage) ||
            doc.metadata.page === specificPage.toString())
        );

        if (documentsToShow.length === 0) {
          return {
            success: false,
            error: `No se encontró contenido para la página ${specificPage}`
          };
        }
      } else if (!extractAllPages && maxPages > 0) {
        const pageGroups = new Map();
        for (const doc of documents) {
          const page = doc.metadata?.page || 0;
          if (!pageGroups.has(page)) {
            pageGroups.set(page, []);
          }
          pageGroups.get(page).push(doc);
        }

        const sortedPages = Array.from(pageGroups.keys()).sort((a, b) => a - b);
        const limitedPages = sortedPages.slice(0, maxPages);

        const limitedDocs = [];
        for (const page of limitedPages) {
          const docsForPage = pageGroups.get(page) || [];
          limitedDocs.push(...docsForPage);
        }

        documentsToShow = limitedDocs;
      }

      let formattedText = "";
      let currentPage = null;
      const pagesIncluded = new Set();

      for (const doc of documentsToShow) {
        const page = doc.metadata?.page || 0;
        pagesIncluded.add(page);

        const content = doc.pageContent || doc.content || "";

        if (includePageNumbers && currentPage !== page) {
          if (formattedText) formattedText += "\n\n";
          formattedText += `--- Página ${page} ---\n\n`;
          currentPage = page;
        } else if (formattedText) {
          formattedText += "\n\n";
        }

        formattedText += content;
      }

      const pageCount = new Set(documents.map(doc => doc.metadata?.page || 0)).size;

      if (!extractAllPages && !specificPage && pageCount > pagesIncluded.size) {
        formattedText += `\n\n--- Has visto ${pagesIncluded.size} de ${pageCount} páginas. Puedes solicitar todas las páginas usando el parámetro maxPages=0. ---`;
      }

      return {
        success: true,
        formattedText,
        originalContent: {
          fileInfo: pdfFileInfo,
          pageCount: pageCount,
          pagesIncluded: Array.from(pagesIncluded).sort((a, b) => a - b),
          totalDocuments: documents.length,
          extractedDocuments: documentsToShow.length,
          extractedAllPages: extractAllPages,
          ocrProvider: 'mistral',
          pdfPath: pdfPath
        }
      };
    } catch (error) {
      console.error("❌ Error extrayendo texto del PDF:", error);
      return {
        success: false,
        error: `Error extrayendo texto: ${error.message}`,
        stack: error.stack
      };
    }
  },

  /**
   * Extrae texto de una región específica (limitado con Mistral OCR)
   */
  async extractTextFromRegion(chatId, userId, options = {}) {
    try {
      const { page, x1, y1, x2, y2, scale = 1, pdfId = null } = options;

      if (!page || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
        return {
          success: false,
          error: "Se requieren parámetros: page, x1, y1, x2, y2"
        };
      }

      try {
        const textExtractionResult = await this.extractPDFTextForChat(chatId, userId, {
          maxPages: 1,
          includePageNumbers: false,
          pdfId: pdfId,
          specificPage: page
        });

        if (textExtractionResult.success) {
          const previewUrl = `/api/file/preview/${chatId}?userId=${userId}&page=${page}&pdfId=${pdfId || ''}&raw=true`;

          return {
            success: true,
            contentType: "text",
            selectedText: "Con la tecnología actual, solo podemos extraer el texto de la página completa. " +
              "A continuación se muestra todo el contenido de la página donde seleccionaste.",
            pageContent: textExtractionResult.formattedText,
            metadata: {
              page: parseInt(page),
              pdfId: pdfId,
              region: { x1, y1, x2, y2, scale },
              ocrProvider: 'mistral',
              extractionMethod: 'full_page',
              previewUrl: previewUrl
            }
          };
        }
      } catch (textError) {
        console.log("❌ Error obteniendo texto de página:", textError);
      }

      return {
        success: false,
        error: "No se pudo extraer el texto específico de la región seleccionada",
        contentType: "text",
        note: "Mistral OCR no soporta extracción de texto de regiones específicas por coordenadas"
      };
    } catch (error) {
      console.error('Error general en extractTextFromRegion:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  /**
   * Elimina un PDF y todos sus documentos
   */
  async deletePDF(chatId, userId, pdfId = null) {
    try {
      const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, userId, pdfId);
      let mistralFileId = null;

      if (documents && documents.length > 0) {
        for (const doc of documents) {
          if (doc.metadata && doc.metadata.mistralFileId) {
            mistralFileId = doc.metadata.mistralFileId;
            break;
          }
        }
      }

      const dbResult = await PDFStorageService.deletePDFDocumentsByChat(chatId, userId, pdfId);
      const fileResult = await PDFStorageService.deletePDFFile(chatId, userId, pdfId);

      let mistralResult = { success: true, message: "No se encontró archivo en Mistral para eliminar" };
      if (mistralFileId) {
        try {
          mistralResult = await MistralOCRService.deleteFile(mistralFileId);
        } catch (mistralError) {
          console.warn("Error eliminando archivo de Mistral:", mistralError.message);
          mistralResult = {
            success: false,
            error: `Error eliminando archivo de Mistral: ${mistralError.message}`
          };
        }
      }

      return {
        success: true,
        dbResult,
        fileResult,
        mistralResult
      };
    } catch (error) {
      console.error('Error eliminando PDF:', error);
      throw error;
    }
  },

  /**
   * Extrae contenido completo del PDF
   */
  async extractPDFContent(chatId, userId, options = {}) {
    const {
      extractText = true,
      extractImages = true,
      extractFormulas = true,
      extractTables = true,
      pageLimit = 5,
      pdfId = null
    } = options;

    try {
      const fileInfo = await PDFStorageService.getPDFFileInfo(chatId, userId, pdfId);

      if (!fileInfo.success) {
        return {
          success: false,
          error: fileInfo.error
        };
      }

      const pdfPath = fileInfo.path;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        return {
          success: false,
          error: 'No se pudo acceder al archivo PDF'
        };
      }

      PDFUtils.extendTempFileLife(pdfPath);

      const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, userId, fileInfo.savedName);

      if (!documents || documents.length === 0) {
        return {
          success: false,
          error: "No se encontraron documentos procesados para este PDF"
        };
      }

      documents.sort((a, b) => {
        const pageA = a.metadata?.page || 0;
        const pageB = b.metadata?.page || 0;
        return pageA - pageB;
      });

      const limitedDocuments = pageLimit > 0 ?
        documents.filter(doc => (doc.metadata?.page || 0) <= pageLimit) :
        documents;

      const result = {
        success: true,
        metadata: {
          originalName: fileInfo.originalName,
          totalPages: documents.length > 0 ? Math.max(...documents.map(doc => doc.metadata?.page || 0)) : 0,
          extractedPages: limitedDocuments.length,
          pdfId: fileInfo.pdfId || fileInfo.savedName,
          path: pdfPath,
          source: 'mistral_ocr'
        },
        content: {
          text: [],
          images: [],
          formulas: [],
          tables: []
        },
        previewUrls: {
          firstPage: fileInfo.endpoints?.renderUrls?.firstPage,
          page: (pageNum) => fileInfo.endpoints?.renderUrls?.page(pageNum)
        }
      };

      for (const doc of limitedDocuments) {
        const pageNum = doc.metadata?.page || 0;

        if (extractText) {
          result.content.text.push({
            page: pageNum,
            content: doc.pageContent || doc.content || "",
            previewUrl: fileInfo.endpoints?.renderUrls?.page(pageNum)
          });
        }

        const elements = doc.metadata?.specialElements ||
          (typeof doc.special_elements === 'string'
            ? JSON.parse(doc.special_elements)
            : doc.special_elements) || {};

        if (extractImages && elements.images && elements.images.length > 0) {
          const pageImages = elements.images.map((img, index) => ({
            page: pageNum,
            index: index,
            reference: img.reference,
            type: 'image',
            source: img.source || 'mistral_ocr',
            previewUrl: `/api/file/preview/${chatId}?userId=${userId}&page=${pageNum}&imgIndex=${index}&pdfId=${fileInfo.savedName || pdfId}&raw=true`
          }));

          result.content.images.push(...pageImages);
        }

        if (extractFormulas && elements.formulas && elements.formulas.length > 0) {
          const pageFormulas = elements.formulas.map(formula => ({
            page: pageNum,
            content: formula.content,
            type: 'formula',
            source: formula.source || 'mistral_ocr',
            detectionMethod: formula.detectionMethod || 'mistral_ocr',
            confidence: formula.confidence || 0.9
          }));

          result.content.formulas.push(...pageFormulas);
        }

        if (extractTables && elements.tables && elements.tables.length > 0) {
          const pageTables = elements.tables.map(table => ({
            page: pageNum,
            rows: table.rows || [],
            rowCount: table.rowCount || (table.rows ? table.rows.length : 0),
            columnCount: table.columnCount || (table.rows && table.rows.length > 0 ? table.rows[0].length : 0),
            type: 'table',
            source: table.source || 'mistral_ocr',
            previewUrl: fileInfo.endpoints?.renderUrls?.page(pageNum)
          }));

          result.content.tables.push(...pageTables);
        }
      }

      return result;
    } catch (error) {
      console.error('Error extrayendo contenido del PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene todos los PDFs de un usuario en un chat específico
   */
  async getAllChatPDFs(chatId, userId, createPreviews = false) {
    try {
      const filesInfo = await PDFStorageService.getPDFFileInfo(chatId, userId, null, createPreviews, true);

      if (!filesInfo.success) {
        return filesInfo;
      }

      const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, userId);

      const documentsByPdf = {};

      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          let pdfId = null;

          if (doc.metadata) {
            const metadata = typeof doc.metadata === 'string'
              ? JSON.parse(doc.metadata)
              : doc.metadata;

            if (metadata.fileInfo && metadata.fileInfo.savedName) {
              pdfId = metadata.fileInfo.savedName;
            }
          }

          if (!pdfId) {
            pdfId = 'unknown';
          }

          if (!documentsByPdf[pdfId]) {
            documentsByPdf[pdfId] = {
              pdfId: pdfId,
              documents: [],
              pages: new Set()
            };
          }

          documentsByPdf[pdfId].documents.push({
            id: doc.id,
            content: doc.content ? doc.content.substring(0, 100) + '...' : null,
            page: doc.metadata?.page || 'unknown'
          });

          if (doc.metadata && doc.metadata.page) {
            documentsByPdf[pdfId].pages.add(doc.metadata.page);
          }
        });

        Object.keys(documentsByPdf).forEach(key => {
          documentsByPdf[key].pageCount = documentsByPdf[key].pages.size;
          documentsByPdf[key].pages = Array.from(documentsByPdf[key].pages).sort((a, b) => a - b);
        });
      }

      let pdfList = filesInfo.files || [filesInfo];
      if (!Array.isArray(pdfList)) {
        pdfList = [pdfList];
      }

      pdfList = pdfList.map(fileInfo => {
        const pdfId = fileInfo.savedName || fileInfo.pdfId;
        return {
          ...fileInfo,
          documents: documentsByPdf[pdfId] || { documents: [], pageCount: 0, pages: [] }
        };
      });

      return {
        success: true,
        chatId,
        userId,
        count: pdfList.length,
        pdfs: pdfList
      };

    } catch (error) {
      console.error('Error obteniendo PDFs del chat:', error);
      return {
        success: false,
        error: error.message,
        chatId,
        userId
      };
    }
  },

  /**
   * Genera y sirve la vista previa de una imagen o página de un PDF
   */
  async previewImage(req, res) {
    const originalTempPdfPath = process.env.TEMP_PDF_PATH;

    try {
      const { chatId } = req.params;
      const {
        userId,
        page = 1,
        imgIndex,
        pdfId = null,
        raw = false,
        width,
        height
      } = req.query;

      if (!chatId || !userId) {
        return res.status(400).json({
          success: false,
          error: "Se requieren chatId y userId"
        });
      }

      const fileInfo = await PDFStorageService.getPDFFileInfo(chatId, parseInt(userId), pdfId);

      if (!fileInfo.success) {
        return res.status(404).json({
          success: false,
          error: fileInfo.error
        });
      }

      const pdfPath = fileInfo.path;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        return res.status(404).json({
          success: false,
          error: 'No se pudo acceder al archivo PDF'
        });
      }

      process.env.TEMP_PDF_PATH = pdfPath;
      const pageNum = parseInt(page);

      const isPdftocairoAvailable = await PDFImageRenderer.checkPdftocairoAvailability();

      if (!isPdftocairoAvailable) {
        return res.status(500).json({
          success: false,
          error: "No se pudo acceder a pdftocairo. Verifica la instalación de Poppler."
        });
      }

      try {
        const { result: imageResult } = await pdfProcessingQueue.enqueue(
          async () => {
            let imageBuffer = await PDFImageRenderer.renderWithPdftocairo(pdfPath, pageNum, width ? parseInt(width) : 0);

            if (imgIndex !== undefined) {
              try {
                const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, parseInt(userId));

                let imageMetadata = null;
                const pageDocuments = documents.filter(doc =>
                  doc.metadata && doc.metadata.page === pageNum
                );

                for (const doc of pageDocuments) {
                  if (doc.special_elements) {
                    const elements = typeof doc.special_elements === 'string'
                      ? JSON.parse(doc.special_elements)
                      : doc.special_elements;

                    if (elements.images && elements.images.length > parseInt(imgIndex)) {
                      imageMetadata = elements.images[parseInt(imgIndex)];
                      break;
                    }
                  }
                }

                if (imageMetadata && imageMetadata.position) {
                  imageBuffer = await PDFImageRenderer.processImage(imageBuffer, {
                    crop: imageMetadata.position
                  });
                }
              } catch (imgError) {
                console.error(`Error extrayendo imagen específica:`, imgError);
              }
            }

            if ((width || height) && imageBuffer) {
              imageBuffer = await PDFImageRenderer.processImage(imageBuffer, {
                width: width ? parseInt(width) : null,
                height: height ? parseInt(height) : null
              });
            }

            return imageBuffer;
          },
          {
            priority: 1,
            pdfId: fileInfo.pdfId || fileInfo.savedName,
            timeout: 30000,
            maxAttempts: 2
          }
        );

        const imageBuffer = imageResult;

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', imageBuffer.length);

        if (raw === 'true' || raw === true) {
          return res.send(imageBuffer);
        }

        return res.json({
          success: true,
          metadata: {
            pdfId: fileInfo.pdfId,
            originalName: fileInfo.originalName,
            page: pageNum,
            width: width ? parseInt(width) : 'original',
            height: height ? parseInt(height) : 'proporcional'
          },
          imageData: `data:image/png;base64,${imageBuffer.toString('base64')}`
        });
      } catch (pdfError) {
        console.error("Error renderizando PDF:", pdfError);
        return res.status(500).json({
          success: false,
          error: `Error renderizando PDF: ${pdfError.message}`
        });
      }
    } catch (error) {
      console.error('Error generando vista previa de imagen:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    } finally {
      process.env.TEMP_PDF_PATH = originalTempPdfPath;
    }
  },

  /**
   * Verifica si hay un PDF procesado
   */
  async hasPDFProcessed(chatId, userId) {
    try {
      const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, userId);
      if (documents && documents.length > 0) {
        return true;
      }

      const fileInfo = await PDFStorageService.getPDFFileInfo(chatId, userId);
      if (fileInfo.success && fileInfo.path) {
        const exists = fs.existsSync(fileInfo.path);
        return exists;
      }

      return fileInfo.success;
    } catch (error) {
      console.error('Error verificando PDF procesado:', error);
      return false;
    }
  },

  /**
   * Obtiene información del archivo PDF físico por nombre
   */
  async getPDFFileByName(chatId, userId, filename) {
    try {
      if (!filename) {
        return {
          success: false,
          error: "Se requiere el nombre del archivo"
        };
      }

      const allFiles = await PDFStorageService.getPDFFileInfo(chatId, userId, null, true);

      if (!allFiles.success) {
        return allFiles;
      }

      const files = Array.isArray(allFiles.files) ? allFiles.files : [allFiles];

      const matchedFile = files.find(file =>
        file.originalName === filename ||
        file.savedName === filename ||
        file.originalName.toLowerCase().includes(filename.toLowerCase()) ||
        file.savedName.toLowerCase().includes(filename.toLowerCase())
      );

      if (!matchedFile) {
        return {
          success: false,
          error: `No se encontró un PDF con nombre '${filename}' en este chat`
        };
      }

      return {
        success: true,
        ...matchedFile
      };
    } catch (error) {
      console.error('Error obteniendo archivo PDF por nombre:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Obtiene información del archivo PDF físico
   */
  async getPDFFile(chatId, userId, pdfId = null) {
    try {
      return await PDFStorageService.getPDFFileInfo(chatId, userId, pdfId, false);
    } catch (error) {
      console.error('Error obteniendo archivo PDF:', error);
      throw error;
    }
  }
};

/**
 * ============================================================================
 * FUNCIONES DE GESTIÓN DE PROCESAMIENTO - SIMPLIFICADAS
 * ============================================================================
 */

const processingRegistry = new Map();

function registerProcessing(chatId, userId, tempFiles = []) {
  const key = `${chatId}_${userId}`;

  processingRegistry.set(key, {
    startTime: Date.now(),
    progress: 0,
    isProcessing: true,
    cancelled: false,
    tempFiles,
    status: 'Iniciando procesamiento'
  });

  setTimeout(() => {
    const info = processingRegistry.get(key);
    if (info && Date.now() - info.startTime > 10 * 60 * 1000) {
      processingRegistry.delete(key);
    }
  }, 10 * 60 * 1000);
}

function updateProcessingProgress(chatId, userId, progress, status = '') {
  const key = `${chatId}_${userId}`;
  const info = processingRegistry.get(key);

  if (info) {
    info.progress = Math.min(100, Math.max(0, progress));
    if (status) {
      info.status = status;
    }
    processingRegistry.set(key, info);
  }
}

function completeProcessing(chatId, userId) {
  const key = `${chatId}_${userId}`;
  const info = processingRegistry.get(key);

  if (info) {
    if (info.progress < 100) {
      info.progress = 100;
    }

    info.isProcessing = false;
    info.status = 'Procesamiento completado';
    processingRegistry.set(key, info);

    setTimeout(() => {
      processingRegistry.delete(key);
    }, 60 * 1000);
  }
}

export async function wasRequestCancelled(chatId, userId) {
  if (!chatId) return false;
  const key = userId ? `${chatId}_${userId}` : chatId;
  const info = processingRegistry.get(key);
  return info ? info.cancelled : false;
}

export async function shouldAbortProcessing(chatId, userId, stage = 'unknown') {
  const cancelled = await wasRequestCancelled(chatId, userId);

  if (cancelled) {
    try {
      PDFService.deletePDF(chatId, userId).catch(err => {
        console.warn(`⚠️ Error en limpieza durante abort (${stage}): ${err.message}`);
      });
    } catch (cleanupError) {
      console.warn(`⚠️ Error en intento de limpieza durante abort: ${cleanupError.message}`);
    }
    return true;
  }

  return false;
}

async function cancelProcessing(chatId, userId) {
  console.log(`🚫 Iniciando cancelación para chatId=${chatId}, userId=${userId}`);
  const key = `${chatId}_${userId}`;
  const info = processingRegistry.get(key);

  if (!info) {
    const deleteResult = await forceDeletePDF(chatId, userId);
    return {
      success: true,
      message: 'No había procesamiento activo pero se realizó limpieza preventiva',
      preventiveCleaning: true,
      fileDeleted: deleteResult.success,
      deleteDetails: deleteResult
    };
  }

  if (info && !info.isProcessing) {
    const deleteResult = await forceDeletePDF(chatId, userId);
    return {
      success: true,
      message: 'El procesamiento ya había finalizado, se realizó limpieza preventiva',
      preventiveCleaning: true,
      fileDeleted: deleteResult.success,
      deleteDetails: deleteResult
    };
  }

  info.cancelled = true;
  info.isProcessing = false;
  info.status = 'Procesamiento cancelado por el usuario';
  processingRegistry.set(key, info);

  const tempFiles = info.tempFiles || [];

  let cancelResult = { cancelled: 0 };
  try {
    cancelResult = await pdfProcessingQueue.cancelTasksForChat(chatId);
  } catch (queueError) {
    console.error(`❌ Error cancelando tareas en cola: ${queueError.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  let deleteResult = { success: false, message: "No se intentó eliminar ningún archivo" };
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
      }

      deleteResult = await PDFService.deletePDF(chatId, userId);

      if (deleteResult.success) {
        break;
      }
    } catch (deleteError) {
      deleteResult = {
        success: false,
        error: deleteError.message,
        message: `Error en intento #${retryCount + 1}`
      };
    }

    retryCount++;
  }

  if (!deleteResult.success) {
    try {
      const forceResult = await forceDeletePDF(chatId, userId);
      if (forceResult.success) {
        deleteResult = forceResult;
      }
    } catch (forceError) {
      console.error(`❌ Error en eliminación forzada: ${forceError.message}`);
    }
  }

  if (tempFiles && tempFiles.length > 0) {
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          await fs.promises.unlink(tempFile);
        }
      } catch (tempError) {
        console.warn(`⚠️ Error eliminando archivo temporal ${tempFile}: ${tempError.message}`);
      }
    }
  }

  setTimeout(() => {
    processingRegistry.delete(key);
  }, 500);

  return {
    success: true,
    message: 'Procesamiento cancelado exitosamente',
    tempFiles: info.tempFiles,
    progress: info.progress,
    elapsedTime: Date.now() - info.startTime,
    fileDeleted: deleteResult.success,
    deleteDetails: deleteResult,
    queueTasksCancelled: cancelResult.cancelled
  };
}

async function forceDeletePDF(chatId, userId) {
  try {
    let fileInfo;
    try {
      fileInfo = await PDFStorageService.getPDFFileInfo(chatId, userId);
    } catch (infoError) {
      console.warn(`⚠️ No se pudo obtener información del archivo: ${infoError.message}`);
    }

    let dbResult = { success: false, count: 0 };
    try {
      dbResult = await PDFStorageService.deletePDFDocumentsByChat(chatId, userId);
    } catch (dbError) {
      console.error(`❌ Error eliminando documentos de BD: ${dbError.message}`);
    }

    let fileResult = { success: false };
    if (fileInfo && fileInfo.success && fileInfo.path) {
      try {
        fileResult = await PDFStorageService.deletePDFFile(chatId, userId);

        if (!fileResult.success && fs.existsSync(fileInfo.path)) {
          try {
            await fs.promises.unlink(fileInfo.path);
            fileResult = { success: true, message: 'Eliminación directa exitosa' };
          } catch (unlinkError) {
            if (unlinkError.code === 'ENOENT') {
              fileResult = { success: true, message: 'Archivo ya eliminado', alreadyDeleted: true };
            }
          }
        }
      } catch (fileError) {
        console.error(`❌ Error eliminando archivo físico: ${fileError.message}`);
      }
    }

    try {
      if (redisService && typeof redisService.invalidatePdfCache === 'function') {
        await redisService.invalidatePdfCache(chatId);
      }
    } catch (redisError) {
      console.warn(`⚠️ Error limpiando caché: ${redisError.message}`);
    }

    return {
      success: dbResult.success || fileResult.success,
      message: 'Eliminación forzada completada',
      dbResult,
      fileResult
    };
  } catch (error) {
    console.error(`❌ Error general en eliminación forzada: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default PDFService;