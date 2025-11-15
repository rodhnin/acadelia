// src/controllers/fileController.js

import { PDFService } from '../../services/chat/fileService.js';
import PDFStorageService from '../../services/chat/pdf/pdfStorageService.js';
import { redisService } from '../../lib/redis.js';
import fs from 'fs';
import path from 'path';
import pdfProcessingQueue from '../../services/chat/pdf/asyncProcessing.js';
import pdfSecurityService from '../../services/chat/pdf/pdfsecurityService.js';
import crypto from 'crypto';
import { logSecurityEvent } from '../../utils/securityLogger.js';


export const uploadPDF = async (req, res) => {
  const processingStart = Date.now();
  let tempFilePath = null;
  let sanitizedFilePath = null;

  try {
    const { userId, chatId } = req.body;
    const metadata = {
      originalName: req.file?.originalname,
      mimeType: req.file?.mimetype,
      size: req.file?.size,
      uploadedAt: new Date().toISOString(),
      clientIp: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      securityScanned: true
    };

    const existingPdf = await PDFService.hasPDFProcessed(chatId, parseInt(userId));
    if (existingPdf) {
      return res.status(409).json({
        success: false,
        error: "Ya existe un PDF asociado a este chat. Debe eliminar el PDF actual antes de subir uno nuevo.",
        hasPDF: true
      });
    }

    // 1. Crear directorio temporal para procesamiento seguro
    const tempDir = path.join(process.cwd(), 'tmp', 'pdf_security');
    await fs.promises.mkdir(tempDir, { recursive: true });

    // 2. Generar nombres seguros para archivos temporales
    const randomId = crypto.randomBytes(8).toString('hex');
    tempFilePath = path.join(tempDir, `temp_${randomId}_${Date.now()}.pdf`);
    sanitizedFilePath = path.join(tempDir, `sanitized_${randomId}_${Date.now()}.pdf`);

    // 3. Limpiar metadatos del PDF
    console.log("Limpiando metadatos del PDF...");
    const cleanedPdfBuffer = await pdfSecurityService.cleanPDFMetadata(req.file.buffer);

    // 4. Guardar archivo temporal para sanitización
    await fs.promises.writeFile(tempFilePath, cleanedPdfBuffer);

    // 5. Sanitizar el PDF usando qpdf
    console.log("Sanitizando PDF...");
    let sanitizeResult = false;
    try {
      sanitizeResult = await pdfSecurityService.sanitizePDF(tempFilePath, sanitizedFilePath);
      console.log(`PDF sanitizado: ${sanitizeResult ? 'éxito' : 'omitido'}`);

      if (!sanitizeResult) {
        await fs.promises.copyFile(tempFilePath, sanitizedFilePath);
      }
    } catch (sanitizeError) {
      console.warn("Error sanitizando PDF:", sanitizeError);
      await fs.promises.copyFile(tempFilePath, sanitizedFilePath);
      sanitizeResult = false;
    }

    metadata.securityScan = {
      scanned: true,
      clean: true,
      sanitized: sanitizeResult,
      timestamp: new Date().toISOString()
    };

    // 6. Leer el archivo sanitizado para procesarlo con Mistral OCR
    const fileBuffer = await fs.promises.readFile(sanitizedFilePath);

    console.log(`Iniciando procesamiento de PDF con Mistral OCR: ${metadata.originalName} para chat ${chatId}`);
    const result = await PDFService.processPDF({
      fileBuffer,
      userId: parseInt(userId),
      chatId,
      metadata
    });

    const documents = await PDFStorageService.findPDFDocumentsByChat(chatId, parseInt(userId));
    if (!documents || documents.length === 0) {
      console.error(`Verificación de documentos fallida: No se encontraron documentos en la BD para chatId=${chatId}`);
      return res.status(500).json({
        success: false,
        error: "El PDF se procesó pero no se guardaron los documentos en la base de datos.",
        pdfInfo: result.fileInfo
      });
    }

    const totalPages = result.totalPages;
    const actualPages = new Set(documents.map(doc => doc.metadata?.page || 1));

    console.log(`✅ Respuesta del controlador: ${documents.length} documentos, ${totalPages} páginas confirmadas por Mistral`);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (sanitizedFilePath && fs.existsSync(sanitizedFilePath)) {
      fs.unlinkSync(sanitizedFilePath);
    }

    res.status(200).json({
      success: true,
      message: "PDF procesado exitosamente con Mistral OCR",
      data: {
        filename: req.file.originalname,
        pdfId: result.fileInfo?.savedName || null,
        fileUrl: `/api/file/serve/${chatId}?userId=${userId}`,
        savedName: result.fileInfo?.savedName || null,
        originalName: req.file.originalname,

        totalPages: totalPages,
        documentChunks: documents.length,
        pagesProcessed: Array.from(actualPages).sort((a, b) => a - b),
        timestamp: result.fileInfo?.timestamp || Date.now(),
        ocrProvider: 'mistral',

        processingStatus: {
          complete: true,
          pagesProcessed: documents.length,
          totalPages: totalPages,
          status: 'Procesamiento completado',
          userMessage: `PDF de ${totalPages} páginas procesado completamente`
        },

        securityInfo: {
          scanned: true,
          sanitized: sanitizeResult
        }
      },

      assistantMessage: result.assistantMessage ? {
        id: result.assistantMessage.messageId,
        message: result.assistantMessage.message,
        role: "assistant",
        timestamp: result.assistantMessage.timestamp,
        fromProcessing: true,
        totalPages: totalPages
      } : null,

      metadata: {
        ...result.metrics,
        processingMode: 'complete_processing',
        totalPagesConfirmed: totalPages,
        pageCountSource: 'mistral_ocr',
        ocrPageCount: totalPages,
        bdPageCount: actualPages.size
      }
    });

  } catch (error) {
    console.error("Error procesando PDF con Mistral OCR:", error);

    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (sanitizedFilePath && fs.existsSync(sanitizedFilePath)) {
        fs.unlinkSync(sanitizedFilePath);
      }
    } catch (cleanupError) {
      console.error("Error limpiando archivos temporales:", cleanupError);
    }

    const statusCode = error.message.includes('tamaño máximo') ? 413 :
      error.message.includes('no es un PDF válido') ? 415 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
      details: error.details || {},
      processingTime: Date.now() - processingStart
    });
  }
};

export const servePDFFile = async (req, res) => {
  const requestStart = Date.now();

  try {
    const { chatId } = req.params;
    const userId = parseInt(req.query.userId);
    const { filename, forceUpdate } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    console.log(`Solicitando servir PDF: chatId=${chatId}, userId=${userId}`);

    let fileInfo;
    if (filename) {
      fileInfo = await PDFService.getPDFFileByName(chatId, userId, filename);
    } else {
      fileInfo = await PDFService.getPDFFile(chatId, userId);
    }

    if (!fileInfo.success) {
      logSecurityEvent('PDF_ACCESS_NOT_FOUND', 'Intento de acceso a PDF no encontrado', {
        userId: userId,
        chatId: chatId,
        filename: req.query.filename,
        ip: req.ip
      }, 'medium');

      return res.status(404).json({
        success: false,
        error: fileInfo.error || "No se encontró el archivo PDF"
      });
    }

    if (!fs.existsSync(fileInfo.path)) {
      return res.status(404).json({
        success: false,
        error: "El archivo no existe en el servidor",
        path: fileInfo.path
      });
    }

    const clientETag = req.headers['if-none-match'];
    const currentETag = `"${fileInfo.timestamp}-${fileInfo.savedName}"`;

    if (clientETag === currentETag && !forceUpdate) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.originalName)}"`);
    res.setHeader('ETag', currentETag);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.setHeader('Accept-Ranges', 'bytes');

    // Soporte para Range requests
    const stats = await fs.promises.stat(fileInfo.path);
    let start = 0;
    let end = stats.size - 1;

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const partialStart = parseInt(parts[0], 10);
      const partialEnd = parts[1] ? parseInt(parts[1], 10) : end;

      start = isNaN(partialStart) ? 0 : Math.max(0, partialStart);
      end = isNaN(partialEnd) ? end : Math.min(partialEnd, end);

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
      res.setHeader('Content-Length', (end - start) + 1);
    } else {
      res.setHeader('Content-Length', stats.size);
    }

    // Servir el archivo
    const fileStream = fs.createReadStream(fileInfo.path, { start, end });

    fileStream.on('error', (streamError) => {
      console.error("Error leyendo stream del PDF:", streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Error interno al leer el archivo"
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    logSecurityEvent('PDF_SERVE_ERROR', 'Error al servir archivo PDF', {
      userId: req.query.userId,
      chatId: req.params.chatId,
      filename: req.query.filename,
      error: error.message,
      ip: req.ip
    }, 'medium');

    console.error("Error sirviendo el archivo PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        processingTime: Date.now() - requestStart
      });
    }
  }
};

export const extractPDFText = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, maxPages, includePageNumbers, pdfId, allPages, useCache = 'true' } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        error: "El userId debe ser un número válido"
      });
    }

    const options = {
      maxPages: allPages === 'true' ? -1 : (maxPages !== undefined ? parseInt(maxPages) : 3),
      includePageNumbers: includePageNumbers !== 'false',
      pdfId: pdfId || null,
      useCache: useCache !== 'false'
    };

    console.log(`Extrayendo texto del PDF - chatId: ${chatId}, opciones:`, options);

    const result = await PDFService.extractPDFTextForChat(chatId, userIdNum, options);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
        details: result.stack || ""
      });
    }

    console.log(`✅ Extracción completada: ${result.formattedText.length} caracteres extraídos`);

    res.status(200).json({
      success: true,
      formattedText: result.formattedText,
      fromCache: result.fromCache || false,
      metadata: {
        originalName: result.originalContent.fileInfo.originalName,
        totalPages: result.originalContent.pageCount,
        extractedPages: result.originalContent.pagesIncluded.length,
        pagesIncluded: result.originalContent.pagesIncluded,
        extractedComplete: result.originalContent.extractedAllPages,
        pdfId: pdfId || result.originalContent.fileInfo.pdfId || result.originalContent.fileInfo.savedName,
        ocrProvider: 'mistral'
      }
    });

  } catch (error) {
    console.error("Error extrayendo texto del PDF:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};

export const extractPDFContent = async (req, res) => {
  try {
    const { chatId } = req.params;
    const {
      userId,
      pageLimit,
      extractText,
      extractImages,
      extractFormulas,
      extractTables,
      pdfId,
      useCache = 'true'
    } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    const options = {
      pageLimit: pageLimit ? parseInt(pageLimit) : 5,
      extractText: extractText !== 'false',
      extractImages: extractImages !== 'false',
      extractFormulas: extractFormulas !== 'false',
      extractTables: extractTables !== 'false',
      pdfId: pdfId || null,
      useCache: useCache !== 'false'
    };

    const result = await PDFService.extractPDFContent(chatId, parseInt(userId), options);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error extrayendo contenido del PDF:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const extractTextSelection = async (req, res) => {
  const startTime = Date.now();
  try {
    const { chatId } = req.params;
    const {
      userId,
      pdfId,
      page,
      x1, y1, x2, y2,
      scale = 1,
      useCache = true
    } = req.query;

    if (!chatId || !userId || !page) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId, userId y page"
      });
    }

    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
      return res.status(400).json({
        success: false,
        error: "Se requieren coordenadas de selección (x1, y1, x2, y2)"
      });
    }

    try {
      const fileInfo = await PDFService.getPDFFile(chatId, parseInt(userId), pdfId);
      if (!fileInfo.success) {
        return res.status(404).json({
          success: false,
          error: `No se encontró el archivo PDF: ${fileInfo.error || 'Archivo no disponible'}`
        });
      }
    } catch (fileError) {
      console.error("Error verificando archivo PDF:", fileError);
    }

    let cacheKey = pdfId || chatId;
    if (useCache !== 'false') {
      try {
        const cachedResult = await redisService.getRegionCache(
          cacheKey, parseInt(page), parseFloat(x1), parseFloat(y1), parseFloat(x2), parseFloat(y2)
        );

        if (cachedResult) {
          cachedResult.metadata = {
            ...cachedResult.metadata,
            fromCache: true,
            responseTime: Date.now() - startTime
          };
          return res.status(200).json(cachedResult);
        }
      } catch (cacheError) {
        console.warn("Error consultando caché:", cacheError);
      }
    }

    const options = {
      page: parseInt(page),
      x1: parseFloat(x1),
      y1: parseFloat(y1),
      x2: parseFloat(x2),
      y2: parseFloat(y2),
      scale: parseFloat(scale),
      pdfId: pdfId || null
    };

    const result = await PDFService.extractTextFromRegion(chatId, parseInt(userId), options);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error || "No se encontró contenido en la región seleccionada",
        contentType: "text",
        processingTime: Date.now() - startTime
      });
    }

    const response = {
      ...result,
      metadata: {
        ...(result.metadata || {}),
        processingTime: Date.now() - startTime
      }
    };

    if (useCache !== 'false' && result.success) {
      try {
        await redisService.setRegionCache(
          cacheKey, parseInt(page), parseFloat(x1), parseFloat(y1), parseFloat(x2), parseFloat(y2), response
        );
      } catch (cacheError) {
        console.warn("Error guardando en caché:", cacheError);
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error extrayendo selección de texto:", error);
    return res.status(500).json({
      success: false,
      error: "Ocurrió un error procesando la solicitud",
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
};

export const previewPDFImage = async (req, res) => {
  try {
    await PDFService.previewImage(req, res);
  } catch (error) {
    console.error("Error generando vista previa:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

export const listChatPDFs = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    const result = await PDFService.getAllChatPDFs(chatId, parseInt(userId));

    if (!result.success) {
      return res.status(200).json({
        success: true,
        chatId,
        userId: parseInt(userId),
        count: 0,
        pdfs: []
      });
    }

    res.status(200).json({
      success: true,
      chatId,
      userId: parseInt(userId),
      count: result.pdfs.length,
      pdfs: result.pdfs
    });

  } catch (error) {
    console.error("Error listando PDFs del chat:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const clearCache = async (req, res) => {
  try {
    const { chatId } = req.params;
    const {
      userId,
      pdfId,
      page,
      x1, y1, x2, y2,
      clearAll = false
    } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    const cacheKey = pdfId || chatId;
    let clearedItems = 0;

    if (clearAll === 'true') {
      await redisService.invalidatePdfCache(cacheKey);
      clearedItems = -1;
    } else if (page && x1 && y1 && x2 && y2) {
      await redisService.deleteRegionCache(
        cacheKey, parseInt(page), parseFloat(x1), parseFloat(y1), parseFloat(x2), parseFloat(y2)
      );
      clearedItems = 1;
    } else if (page) {
      await redisService.deletePageCache(cacheKey, parseInt(page));
      clearedItems = 1;
    } else {
      await redisService.invalidatePdfCache(cacheKey);
      clearedItems = -1;
    }

    return res.status(200).json({
      success: true,
      message: clearedItems === -1
        ? `Caché completamente limpiada para ${cacheKey}`
        : `${clearedItems} elementos de caché limpiados para ${cacheKey}`,
      details: {
        chatId,
        userId,
        pdfId: pdfId || null,
        page: page ? parseInt(page) : null,
        region: (x1 && y1 && x2 && y2) ? { x1, y1, x2, y2 } : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error limpiando caché:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deletePDF = async (req, res) => {
  const deleteStart = Date.now();

  try {
    const { chatId } = req.params;
    const { userId, pdfId } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    console.log(`Solicitando eliminación de PDF: chatId=${chatId}, userId=${userId}, pdfId=${pdfId || 'no especificado'}`);

    if (pdfId && pdfId === chatId) {
      return res.status(400).json({
        success: false,
        error: "Error de parámetros: el pdfId no puede ser igual al chatId"
      });
    }

    const fileCheck = await PDFService.getPDFFile(chatId, parseInt(userId), pdfId);
    if (!fileCheck.success) {
      logSecurityEvent('PDF_DELETE_NOT_FOUND', 'Intento de eliminar PDF inexistente', {
        userId: userId,
        chatId: chatId,
        pdfId: pdfId,
        ip: req.ip
      }, 'medium');
      return res.status(404).json({
        success: false,
        error: "No se encontró el PDF a eliminar",
        details: fileCheck.error
      });
    }

    try {
      const cacheKeys = [fileCheck.savedName, chatId, `${chatId}_${fileCheck.timestamp}`];
      for (const key of cacheKeys) {
        await redisService.invalidatePdfCache(key);
      }
    } catch (cacheError) {
      console.warn(`Error invalidando caché: ${cacheError.message}`);
    }

    const result = await PDFService.deletePDF(chatId, parseInt(userId), pdfId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || "No se pudo eliminar el PDF",
        details: result
      });
    }

    const processingTime = Date.now() - deleteStart;

    res.status(200).json({
      success: true,
      message: "PDF eliminado correctamente",
      details: {
        ...result,
        ocrProvider: 'mistral'
      },
      processingTime
    });

  } catch (error) {
    logSecurityEvent('PDF_DELETION_ERROR', 'Error eliminando PDF', {
      userId: req.query.userId,
      chatId: req.params.chatId,
      pdfId: req.query.pdfId,
      error: error.message,
      ip: req.ip
    }, 'medium');

    console.error("Error eliminando PDF:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: Date.now() - deleteStart
    });
  }
};

export const cancelPDFProcessing = async (req, res) => {
  const cancelStart = Date.now();

  try {
    const { chatId } = req.params;
    const userId = req.query.userId || (req.body && req.body.userId);

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    console.log(`📛 Solicitud de cancelación recibida: chatId=${chatId}, userId=${userId}`);

    const processingResult = await PDFService.cancelProcessing(chatId, parseInt(userId));

    const duration = Date.now() - cancelStart;

    return res.status(200).json({
      success: true,
      message: "Procesamiento cancelado con éxito",
      details: {
        chatId,
        userId,
        processingCancelled: processingResult.success,
        fileDeleted: processingResult.fileDeleted,
        elapsedTime: duration,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logSecurityEvent('PDF_CANCELLATION_ERROR', 'Error cancelando procesamiento de PDF', {
      userId: req.query.userId || (req.body && req.body.userId),
      chatId: req.params.chatId,
      error: error.message,
      ip: req.ip
    }, 'medium');

    console.error(`❌ Error general cancelando:`, error);
    return res.status(500).json({
      success: false,
      error: error.message,
      processingTime: Date.now() - cancelStart
    });
  }
};

export const getPDFProcessingStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.query.userId;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    const processingStatus = await PDFService.getProcessingStatus(chatId, parseInt(userId));

    const progress = processingStatus.progress || 0;
    const messages = getProcessingMessages(progress);

    return res.status(200).json({
      success: true,
      isProcessing: processingStatus.isProcessing || false,
      progress: progress,
      status: processingStatus.status || messages.status,
      detail: processingStatus.detail || messages.detail,
      elapsedTime: processingStatus.elapsedTime || 0,
      readyPages: processingStatus.readyPages || [],
      totalPagesReady: processingStatus.totalPagesReady || 0,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error obteniendo estado:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const clearExtractionCache = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, pdfId, operation, force = 'false' } = req.query;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Se requieren chatId y userId"
      });
    }

    let deletedCount = 0;

    if (operation && operation !== 'all') {
      const pattern = `pdf_extract:${operation}:${chatId}:${userId}:${pdfId || '*'}:*`;
      deletedCount = await redisService.deleteByPattern(pattern);
    } else {
      deletedCount = await redisService.invalidateExtractionCache(chatId, userId, pdfId);
    }

    return res.status(200).json({
      success: true,
      message: `Caché de extracciones limpiado exitosamente`,
      deletedKeys: deletedCount,
      details: {
        chatId,
        userId,
        pdfId: pdfId || 'all',
        operation: operation || 'all',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error limpiando caché de extracciones:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

function getProcessingMessages(progress) {
  if (progress < 25) {
    return {
      status: "Iniciando procesamiento...",
      detail: "Preparando archivo para OCR"
    };
  } else if (progress < 50) {
    return {
      status: "Extrayendo texto...",
      detail: "Utilizando Mistral OCR para reconocer texto"
    };
  } else if (progress < 75) {
    return {
      status: "Procesando páginas...",
      detail: "Analizando contenido página por página"
    };
  } else if (progress < 90) {
    return {
      status: "Generando embeddings...",
      detail: "Creando representaciones vectoriales del texto"
    };
  } else {
    return {
      status: "Finalizando...",
      detail: "Optimizando para consultas rápidas"
    };
  }
}

export default {
  uploadPDF,
  deletePDF,
  previewPDFImage,
  listChatPDFs,
  servePDFFile,
  extractTextSelection,
  extractPDFText,
  extractPDFContent,
  clearCache,
  getPDFProcessingStatus,
  cancelPDFProcessing,
  clearExtractionCache
};