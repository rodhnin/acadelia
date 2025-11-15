// src/services/chat/pdf/pdfStorageService.js

import pool from "../../../lib/dbPool.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redisService } from '../../../lib/redis.js';

export const PDFStorageService = {
  /**
   * Sanitiza elementos especiales para guardarlos en la base de datos
   * @param {Object} specialElements - Elementos especiales a sanitizar
   * @returns {Object} - Elementos sanitizados
   */
  sanitizeSpecialElementsForDB(specialElements) {
    if (!specialElements) {
      return {
        images: [],
        formulas: [],
        tables: []
      };
    }

    try {
      const sanitizeElement = (element, type) => {
        if (!element) return null;

        const sanitized = {
          type: element.type || type,
          pageNum: element.page || element.pageNum || 1
        };

        if (type === 'image') {
          // Propiedades para imágenes
          sanitized.reference = element.reference || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sanitized.source = element.source || 'mistral_ocr';

          if (element.data && element.data.length > 1000) {
            sanitized.hasImageData = true;
          } else {
            sanitized.data = element.data;
          }

          if (element.position) {
            sanitized.position = typeof element.position === 'object'
              ? { ...element.position }
              : element.position;
          }
        }
        else if (type === 'formula') {
          // Propiedades para fórmulas
          sanitized.content = element.content || '';
          sanitized.detectionMethod = element.detectionMethod || 'mistral_ocr';
          sanitized.source = element.source || 'mistral_ocr';

          if (element.formulaType) sanitized.formulaType = element.formulaType;
          if (element.confidence) sanitized.confidence = element.confidence;
        }
        else if (type === 'table') {
          // Propiedades para tablas
          if (element.rows && Array.isArray(element.rows)) {
            // Limitar tamaño de filas para evitar problemas con BD
            const limitedRows = element.rows.slice(0, 50).map(row =>
              Array.isArray(row) ? row.slice(0, 20).map(cell =>
                String(cell || '').substring(0, 500)
              ) : []
            );

            sanitized.rows = limitedRows;
            sanitized.rowCount = limitedRows.length;
            sanitized.columnCount = limitedRows.length > 0 ? limitedRows[0].length : 0;
          } else {
            sanitized.rows = [];
            sanitized.rowCount = 0;
            sanitized.columnCount = 0;
          }

          sanitized.source = element.source || 'mistral_ocr';
        }

        return sanitized;
      };

      const sanitized = {
        images: Array.isArray(specialElements.images)
          ? specialElements.images.map(img => sanitizeElement(img, 'image')).filter(Boolean)
          : [],
        formulas: Array.isArray(specialElements.formulas)
          ? specialElements.formulas.map(formula => sanitizeElement(formula, 'formula')).filter(Boolean)
          : [],
        tables: Array.isArray(specialElements.tables)
          ? specialElements.tables.map(table => sanitizeElement(table, 'table')).filter(Boolean)
          : []
      };

      // Prueba de serialización para detectar problemas
      try {
        const testJson = JSON.stringify(sanitized);
        return sanitized;
      } catch (jsonError) {
        console.error('Error al serializar elementos especiales:', jsonError);
        // En caso de error, intentar una versión más simplificada
        return {
          images: sanitized.images.map(img => ({
            type: img.type,
            pageNum: img.pageNum,
            reference: img.reference,
            source: img.source
          })),
          formulas: sanitized.formulas.map(f => ({
            type: f.type,
            pageNum: f.pageNum,
            content: f.content ? f.content.substring(0, 500) : '',
            detectionMethod: f.detectionMethod
          })),
          tables: sanitized.tables.map(t => ({
            type: t.type,
            pageNum: t.pageNum,
            rowCount: t.rowCount,
            columnCount: t.columnCount
          }))
        };
      }
    } catch (error) {
      console.error('Error sanitizando elementos especiales:', error);
      return {
        images: [],
        formulas: [],
        tables: []
      };
    }
  },

  /**
   * Almacena documentos en la base de datos
   * @param {Array} documents - Documentos a almacenar
   * @param {number} userId - ID del usuario
   * @param {string} chatId - ID del chat
   * @param {Object} metadata - Metadatos
   * @param {Object} processingMetrics - Métricas de procesamiento
   * @param {Function} generateEmbeddingFn - Función para generar embeddings
   */
  async storeDocumentsInDB(documents, userId, chatId, metadata, processingMetrics, generateEmbeddingFn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const batchSize = 10;

      // Información crucial para debugging
      console.log(`Almacenando ${documents.length} documentos en la BD para chatId=${chatId}, userId=${userId}`);
      console.log(`Metadata de subida: ${JSON.stringify(metadata)}`);

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const embedPromises = batch.map(doc =>
          generateEmbeddingFn(doc.pageContent).catch(err => {
            console.error(`Error embedding chunk ${i}:`, err.message);
            return null;
          })
        );
        const embeddings = await Promise.all(embedPromises);

        for (let j = 0; j < batch.length; j++) {
          const doc = batch[j];
          const embedding = embeddings[j];

          if (!embedding) {
            processingMetrics.failedChunks++;
            continue;
          }

          try {
            // 1. Asegurar que la metadata incluya la información del archivo PDF
            // Este es el punto crítico que está fallando
            const docMetadata = { ...doc.metadata } || {};

            // Asegurar que fileInfo existe y tiene savedName
            if (!docMetadata.fileInfo && metadata.fileInfo) {
              docMetadata.fileInfo = metadata.fileInfo;
              console.log(`Añadiendo fileInfo a documento: ${JSON.stringify(docMetadata.fileInfo)}`);
            }

            // Asegurar que pdfId existe
            if (!docMetadata.pdfId && metadata.fileInfo && metadata.fileInfo.savedName) {
              docMetadata.pdfId = metadata.fileInfo.savedName;
              console.log(`Añadiendo pdfId (${docMetadata.pdfId}) al documento`);
            }

            // 2. Extraer metadata y specialElements de forma segura
            const { specialElements: docSpecialElements = {}, ...cleanMetadata } = docMetadata;

            // 3. Sanitizar elementos especiales de forma segura
            const sanitizedSpecialElements = this.sanitizeSpecialElementsForDB(docSpecialElements);

            const elementCount =
              sanitizedSpecialElements.images.length +
              sanitizedSpecialElements.formulas.length +
              sanitizedSpecialElements.tables.length;

            if (elementCount > 0) {
              console.log(`Guardando documento con ${elementCount} elementos especiales:`,
                `Imágenes: ${sanitizedSpecialElements.images.length},`,
                `Fórmulas: ${sanitizedSpecialElements.formulas.length},`,
                `Tablas: ${sanitizedSpecialElements.tables.length}`);
            }

            const completeMetadata = {
              ...cleanMetadata,
              chatId: chatId,
              uploadTimestamp: Date.now(),
              uploadedBy: userId,
            };

            // 3. Insertar en la base de datos
            const query = `
            INSERT INTO pdfs (id_user, id_chat, content, metadata, embedding, special_elements)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;

            let specialElementsJson;
            try {
              specialElementsJson = JSON.stringify(sanitizedSpecialElements);
            } catch (jsonError) {
              console.error('Error serializando specialElements:', jsonError);
              specialElementsJson = JSON.stringify({
                images: [],
                formulas: [],
                tables: []
              });
            }

            const params = [
              userId,
              chatId,
              doc.pageContent,
              completeMetadata,
              `[${embedding.join(',')}]`,
              specialElementsJson
            ];

            const insertResult = await client.query(query, params);
            processingMetrics.processedChunks++;

            console.log(`✅ Documento insertado con ID: ${insertResult.rows[0].id}`);

          } catch (insertError) {
            console.error(`Error insertando chunk ${i + j}:`, insertError);
            console.error('Detalles del error:', insertError.stack || insertError.message);
            processingMetrics.failedChunks++;
          }
        }
      }

      // Verificación post-inserción
      const verifyQuery = `SELECT COUNT(*) FROM pdfs WHERE id_chat = $1 AND id_user = $2`;
      const verifyResult = await client.query(verifyQuery, [chatId, userId]);
      const documentCount = parseInt(verifyResult.rows[0].count);

      console.log(`Verificación: ${documentCount} documentos en BD para chatId=${chatId}`);

      if (documentCount === 0) {
        console.error(`⚠️ ADVERTENCIA: No se encontraron documentos después de la inserción para chatId=${chatId}`);
        throw new Error('No se encontraron documentos después de la inserción');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error general en storeDocumentsInDB: ${error.message}`);
      console.error(error.stack);
      throw error;
    } finally {
      client.release();
    }
  },


  /**
   * Busca documentos PDF por chat
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} pdfId - ID específico del PDF (opcional)
   * @returns {Promise<Array>} - Lista de documentos encontrados
   */
  async findPDFDocumentsByChat(chatId, userId, pdfId = null) {
    const client = await pool.connect();
    try {
      // Diagnóstico inicial sin límites
      const diagQuery = `SELECT COUNT(*) FROM pdfs WHERE id_chat = $1 AND id_user = $2`;
      const diagResult = await client.query(diagQuery, [chatId, userId]);
      console.log(`Diagnóstico inicial: ${diagResult.rows[0].count} documentos para chatId=${chatId}, userId=${userId}`);

      let query;
      let params;

      if (pdfId) {
        query = `
          SELECT id, content, metadata, special_elements
          FROM pdfs
          WHERE id_chat = $1 AND id_user = $2 
            AND (
              metadata->>'pdfId' = $3 
              OR metadata->'fileInfo'->>'savedName' = $3 
              OR metadata->'fileInfo'->>'savedName' LIKE $4
              OR metadata->'fileInfo'->>'originalName' LIKE $5
              OR metadata::text LIKE $6
            )
          ORDER BY (CASE WHEN metadata->>'page' ~ '^[0-9]+$' THEN (metadata->>'page')::int ELSE 0 END) ASC
        `;
        params = [chatId, userId, pdfId, `%${pdfId}%`, `%${pdfId.split('_').slice(2).join('_')}%`, `%${pdfId}%`];
        console.log(`Ejecutando búsqueda por pdfId=${pdfId}`);
      } else {
        query = `
          SELECT id, content, metadata, special_elements
          FROM pdfs
          WHERE id_chat = $1 AND id_user = $2
          ORDER BY (CASE WHEN metadata->>'page' ~ '^[0-9]+$' THEN (metadata->>'page')::int ELSE 0 END) ASC
        `;
        params = [chatId, userId];
        console.log(`Ejecutando búsqueda general para chatId=${chatId} - SIN LÍMITES`);
      }

      console.log(`SQL Query: ${query.replace(/\s+/g, ' ')}`);
      const result = await client.query(query, params);

      console.log(`findPDFDocumentsByChat: chatId=${chatId}, userId=${userId}, pdfId=${pdfId || 'null'}, encontrados=${result.rows.length} documentos`);

      if (result.rows.length === 0 && parseInt(diagResult.rows[0].count) > 0) {
        console.log(`⚠️ No se encontraron documentos con filtros. Ejecutando consulta de recuperación...`);

        const fallbackQuery = `
          SELECT id, content, metadata, special_elements
          FROM pdfs
          WHERE id_chat = $1 AND id_user = $2
          ORDER BY id ASC
        `;

        const fallbackResult = await client.query(fallbackQuery, [chatId, userId]);
        console.log(`🔄 Recuperación encontró ${fallbackResult.rows.length} documentos`);
        return fallbackResult.rows;
      }

      return result.rows;

    } catch (error) {
      console.error('Error buscando documentos PDF:', error);
      throw error;
    } finally {
      client.release();
    }
  },


  /**
   * Elimina documentos PDF de un chat
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} pdfId - ID específico del PDF (opcional)
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deletePDFDocumentsByChat(chatId, userId, pdfId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let query;
      let params;

      if (pdfId) {
        query = `
          DELETE FROM pdfs
          WHERE id_chat = $1 AND id_user = $2
          AND (
            metadata->>'pdfId' = $3 
            OR metadata->'fileInfo'->>'savedName' = $3 
            OR (metadata->>'pdfId' LIKE $4) 
            OR (metadata->'fileInfo'->>'savedName' LIKE $4)
          )
          RETURNING id
        `;
        params = [chatId, userId, pdfId, `%${pdfId}%`];
      } else {
        query = `
          DELETE FROM pdfs
          WHERE id_chat = $1 AND id_user = $2
          RETURNING id
        `;
        params = [chatId, userId];
      }

      const result = await client.query(query, params);
      await client.query('COMMIT');

      return {
        success: true,
        count: result.rowCount,
        message: `Eliminados ${result.rowCount} chunks de PDF`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error eliminando documentos PDF:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Guarda un archivo PDF en disco
   * @param {Buffer} fileBuffer - Contenido del archivo PDF
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} originalFilename - Nombre original del archivo
   * @returns {Promise<Object>} - Información del archivo guardado
   */
  async savePDFFile(fileBuffer, chatId, userId, originalFilename) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const uploadsDir = path.join(__dirname, '../../../../uploads');

      const userDir = path.join(uploadsDir, `user_${userId}`);

      await fs.promises.mkdir(uploadsDir, { recursive: true });
      await fs.promises.mkdir(userDir, { recursive: true });

      const safeFilename = this.getSafeFilename(originalFilename);
      const timestamp = Date.now();
      const finalFilename = `${chatId}_${timestamp}_${safeFilename}`;

      // Ruta completa del archivo
      const filePath = path.join(userDir, finalFilename);

      await fs.promises.writeFile(filePath, fileBuffer);

      // Información de retorno
      return {
        success: true,
        originalName: originalFilename,
        savedName: finalFilename,
        path: filePath,
        relativePath: `/uploads/user_${userId}/${finalFilename}`,
        timestamp: timestamp,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error guardando archivo PDF:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de archivos PDF guardados para un chat
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} pdfId - ID específico del PDF (opcional)
   * @param {boolean} getAllFiles - Si se deben obtener todos los archivos del chat (default: false)
   * @returns {Promise<Object>} - Información del/los archivo(s) con URLs de vista previa
   */
  async getPDFFileInfo(chatId, userId, pdfId = null, createPreviews = false, getAllFiles = false) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const userDir = path.join(__dirname, '../../../../uploads', `user_${userId}`);
      console.log(`Buscando PDFs en: ${userDir} para chatId: ${chatId}`);

      if (!fs.existsSync(userDir)) {
        console.log(`Directorio no encontrado: ${userDir}`);
        return {
          success: false,
          error: 'No se encontraron archivos para este usuario',
          details: { userDir, userId, chatId }
        };
      }

      // Listar archivos en el directorio
      const files = await fs.promises.readdir(userDir);
      console.log(`Archivos encontrados en ${userDir}: ${files.length}`);

      let pdfFiles = [];

      // Primero intentar una coincidencia exacta
      const exactMatches = files.filter(file =>
        file.startsWith(`${chatId}_`) &&
        (file.endsWith('.pdf') || path.extname(file) === '')
      );

      if (exactMatches.length > 0) {
        pdfFiles = exactMatches;
        console.log(`Encontradas ${pdfFiles.length} coincidencias exactas para chatId ${chatId}`);
      } else {
        // Si no hay coincidencias exactas, buscar coincidencias parciales
        const chatIdPrefix = chatId.substring(0, 8);
        const partialMatches = files.filter(file =>
          file.includes(chatIdPrefix) &&
          (file.endsWith('.pdf') || path.extname(file) === '')
        );

        pdfFiles = partialMatches;
        console.log(`Encontradas ${pdfFiles.length} coincidencias parciales para chatId ${chatIdPrefix}`);
      }

      if (pdfFiles.length === 0) {
        console.log(`No se encontraron PDFs para chatId ${chatId}. Mostrando todos los archivos disponibles:`);
        console.log(files.join(', '));

        return {
          success: false,
          error: 'No se encontraron archivos PDF para este chat',
          details: {
            chatId,
            userId,
            availableFiles: files.length > 0 ? files : "Ninguno"
          }
        };
      }

      pdfFiles.sort((a, b) => {
        const timestampA = a.split('_')[1];
        const timestampB = b.split('_')[1];
        return parseInt(timestampB) - parseInt(timestampA);
      });

      console.log(`PDFs ordenados por fecha: ${pdfFiles.map(f => f.split('_')[1]).join(', ')}`);

      // Si se especifica un pdfId, buscar ese archivo específico
      if (pdfId) {
        console.log(`Buscando PDF específico: ${pdfId}`);

        let specificFile = pdfFiles.find(file => file === pdfId);

        // Si no hay coincidencia exacta, buscar coincidencia parcial
        if (!specificFile) {
          specificFile = pdfFiles.find(file => file.includes(pdfId));
        }

        if (!specificFile) {
          return {
            success: false,
            error: `No se encontró el PDF con ID ${pdfId}`,
            availableFiles: pdfFiles.length > 0 ? pdfFiles : "Ninguno"
          };
        }

        pdfFiles = [specificFile];
        console.log(`PDF específico encontrado: ${specificFile}`);
      }

      // Si solo queremos un archivo (el más reciente) y no se especificó un ID y no se pidieron todos los archivos
      if (!pdfId && !getAllFiles) {
        pdfFiles = [pdfFiles[0]];
        console.log(`Usando el PDF más reciente: ${pdfFiles[0]}`);
      }

      const createFileInfoWithPreview = async (file) => {
        const filePath = path.join(userDir, file);

        if (!fs.existsSync(filePath)) {
          console.error(`Error: El archivo físico no existe: ${filePath}`);
          return null;
        }

        const stats = await fs.promises.stat(filePath);

        const parts = file.split('_');
        const originalName = parts.slice(2).join('_');

        // ⭐ SOLUCIÓN: Obtener pageCount desde la base de datos MEJORADO
        let pageCount = 0;
        let actualTotalPages = 0; // 🎯 NUEVO: Diferencia entre páginas procesadas y total real

        try {
          const documentsQuery = `
    SELECT COUNT(DISTINCT (metadata->>'page')::int) as unique_pages,
           MAX((metadata->>'page')::int) as max_page_number,
           COUNT(*) as total_documents
    FROM pdfs 
    WHERE id_chat = $1 AND id_user = $2 
    AND (
      metadata->>'pdfId' = $3 
      OR metadata->'fileInfo'->>'savedName' = $3
    )
    AND metadata->>'page' IS NOT NULL 
    AND metadata->>'page' ~ '^[0-9]+$'
  `;

          const client = await pool.connect();
          try {
            const countResult = await client.query(documentsQuery, [chatId, userId, file]);
            const uniquePages = parseInt(countResult.rows[0].unique_pages) || 0;
            const maxPageNumber = parseInt(countResult.rows[0].max_page_number) || 0;
            const totalDocuments = parseInt(countResult.rows[0].total_documents) || 0;

            const totalPagesQuery = `
      SELECT DISTINCT (metadata->'fileInfo'->>'totalPages')::int as real_total_pages
      FROM pdfs 
      WHERE id_chat = $1 AND id_user = $2 
      AND metadata->'fileInfo'->>'savedName' = $3
      AND metadata->'fileInfo'->>'totalPages' IS NOT NULL
      LIMIT 1
    `;

            const totalResult = await client.query(totalPagesQuery, [chatId, userId, file]);
            actualTotalPages = parseInt(totalResult.rows[0]?.real_total_pages) || maxPageNumber;

            pageCount = uniquePages; // Páginas actualmente procesadas

            console.log(`📄 ${file}: ${pageCount} páginas procesadas de ${actualTotalPages} totales (${totalDocuments} documentos en BD)`);

            if (actualTotalPages === 0) {
              actualTotalPages = maxPageNumber || pageCount || 1;
            }

          } finally {
            client.release();
          }
        } catch (countError) {
          console.warn(`⚠️ Error obteniendo pageCount para ${file}: ${countError.message}`);
          pageCount = 0;
          actualTotalPages = 1; // Fallback seguro
        }

        const relativePath = `/uploads/user_${userId}/${file}`;

        const endpoints = {
          // URL para acceder directamente al PDF
          directUrl: relativePath,
          // URL para renderizar una página específica como imagen (placeholders)
          renderUrls: {
            firstPage: `/api/file/preview/${chatId}?userId=${userId}&page=1&pdfId=${file}&raw=true`,
            page: (pageNum) => `/api/file/preview/${chatId}?userId=${userId}&page=${pageNum}&pdfId=${file}&raw=true`,
          },
          // URL para extraer texto
          textExtractionUrl: `/api/file/extract-text/${chatId}?userId=${userId}&pdfId=${file}`,
          // URL para extraer contenido completo
          contentExtractionUrl: `/api/file/extract-content/${chatId}?userId=${userId}&pdfId=${file}`
        };

        return {
          originalName: originalName,
          savedName: file,
          path: filePath,
          relativePath: relativePath,
          timestamp: parts[1] || Date.now().toString(),
          size: stats.size,
          lastModified: stats.mtime,
          pdfId: file,

          pageCount: pageCount,                    // ✅ Páginas actualmente procesadas
          totalPages: actualTotalPages,            // ✅ Total real de páginas
          pagesProcessed: pageCount,               // ✅ Alias para claridad
          pagesTotal: actualTotalPages,            // ✅ Alias para claridad
          isFullyProcessed: pageCount >= actualTotalPages, // ✅ NUEVO: Estado de procesamiento
          processingProgress: actualTotalPages > 0 ? Math.round((pageCount / actualTotalPages) * 100) : 100, // ✅ NUEVO: Porcentaje

          debugInfo: {
            pagesInDB: pageCount,
            totalPagesFromMetadata: actualTotalPages,
            isLargePDF: actualTotalPages > 40,
            processingStatus: pageCount >= actualTotalPages ? 'completed' : 'in_progress'
          },

          // Incluir URLs de vista previa y procesamiento en la respuesta
          endpoints: endpoints
        };
      };

      const processedFiles = await Promise.all(pdfFiles.map(createFileInfoWithPreview));
      const validFiles = processedFiles.filter(Boolean);

      if (validFiles.length === 0) {
        return {
          success: false,
          error: "Los archivos existen en el directorio pero no son accesibles físicamente",
          details: {
            chatId,
            userId,
            pdfId,
            pdfFiles
          }
        };
      }

      if (validFiles.length === 1 && !getAllFiles) {
        // Caso de un solo archivo
        console.log(`Devolviendo información de un solo PDF: ${validFiles[0].savedName}`);
        return {
          success: true,
          ...validFiles[0]
        };
      } else {
        // Caso de múltiples archivos
        console.log(`Devolviendo información de ${validFiles.length} PDFs`);
        return {
          success: true,
          count: validFiles.length,
          files: validFiles,
          chatId: chatId,
          userId: userId
        };
      }

    } catch (error) {
      console.error('Error obteniendo información del archivo PDF:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  /**
 * Elimina un archivo PDF guardado con manejo mejorado de errores
 * @param {string} chatId - ID del chat
 * @param {number} userId - ID del usuario
 * @param {string} pdfId - ID específico del PDF (opcional)
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
  async deletePDFFile(chatId, userId, pdfId = null) {
    try {
      // Primero obtenemos información del archivo
      const fileInfo = await this.getPDFFileInfo(chatId, userId, pdfId);

      if (!fileInfo.success) {
        console.log(`ℹ️ Archivo PDF no encontrado para eliminar: chatId=${chatId}, userId=${userId}, pdfId=${pdfId || 'no especificado'}`);
        return {
          success: true, // Consideramos éxito si el archivo ya no existe
          message: 'Archivo no encontrado o ya eliminado',
          notFound: true
        };
      }

      console.log(`🗑️ Eliminando archivo PDF: ${fileInfo.path}`);

      if (!fs.existsSync(fileInfo.path)) {
        console.log(`ℹ️ El archivo ya no existe físicamente: ${fileInfo.path}`);
        return {
          success: true,
          message: 'Archivo físico ya no existe',
          alreadyDeleted: true
        };
      }

      try {
        await fs.promises.unlink(fileInfo.path);
      } catch (unlinkError) {
        // Si el error es que el archivo no existe (ENOENT), consideramos éxito
        if (unlinkError.code === 'ENOENT') {
          console.log(`ℹ️ Archivo ya eliminado previamente: ${fileInfo.path}`);
          return {
            success: true,
            message: 'Archivo ya eliminado previamente',
            alreadyDeleted: true
          };
        }

        // Si es otro tipo de error, registrarlo pero no fallar la operación
        console.error(`⚠️ Error al eliminar archivo ${fileInfo.path}: ${unlinkError.message}`);
        return {
          success: true, // Aún así consideramos éxito para no bloquear el proceso
          message: 'No se pudo eliminar el archivo pero continuamos',
          error: unlinkError.message,
          partial: true
        };
      }

      const fileStillExists = fs.existsSync(fileInfo.path);
      if (fileStillExists) {
        console.warn(`⚠️ El archivo ${fileInfo.path} todavía existe después de intentar eliminarlo`);
        return {
          success: true, // Continuamos el proceso a pesar del error
          message: 'El archivo no pudo ser eliminado pero continuamos',
          warning: true
        };
      }

      console.log(`✅ Archivo eliminado correctamente: ${fileInfo.savedName}`);

      try {
        // Primero verificar que la función existe
        let cacheCleared = false;

        if (global.redisService && typeof global.redisService.invalidatePdfCache === 'function') {
          await global.redisService.invalidatePdfCache(pdfId || chatId);
          cacheCleared = true;
        } else if (redisService && typeof redisService.invalidatePdfCache === 'function') {
          await redisService.invalidatePdfCache(pdfId || chatId);
          cacheCleared = true;
        }

        if (cacheCleared) {
          console.log(`✅ Caché limpiada para PDF: ${pdfId || chatId}`);
        } else {
          console.log(`ℹ️ No se encontró función para limpiar caché`);
        }
      } catch (cacheError) {
        console.warn(`⚠️ Error limpiando caché, continuando: ${cacheError.message}`);
      }

      return {
        success: true,
        message: 'Archivo PDF eliminado correctamente',
        fileInfo: {
          originalName: fileInfo.originalName,
          savedName: fileInfo.savedName
        }
      };
    } catch (error) {
      // Error general - lo registramos pero no detenemos el proceso
      console.error('❌ Error general eliminando archivo PDF:', error);
      return {
        success: true, // Seguimos considerando éxito para no bloquear el proceso
        error: error.message,
        message: 'Error durante eliminación pero continuamos el proceso',
        critical: false
      };
    }
  },

  /**
   * Genera un nombre de archivo seguro
   * @param {string} filename - Nombre original del archivo
   * @returns {string} - Nombre seguro
   */
  getSafeFilename(filename) {
    let safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Asegurarse de que tenga extensión .pdf
    if (!safeName.toLowerCase().endsWith('.pdf')) {
      safeName += '.pdf';
    }

    return safeName;
  },

  async getPageCountFast(pdfPath) {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`Archivo PDF no encontrado: ${pdfPath}`);
      }

      const pdfBuffer = await fs.promises.readFile(pdfPath);
      const pdfString = pdfBuffer.toString('latin1');

      // MÉTODO 1: Buscar /Count en el catálogo de páginas
      const countMatches = pdfString.match(/\/Count\s+(\d+)/g);
      if (countMatches && countMatches.length > 0) {
        const counts = countMatches.map(match => parseInt(match.match(/\d+/)[0]));
        const maxCount = Math.max(...counts);

        if (maxCount > 0 && maxCount < 10000) {
          console.log(`✅ Conteo por /Count: ${maxCount} páginas`);
          return maxCount;
        }
      }

      // MÉTODO 2: Contar objetos de página directamente
      const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
      if (pageMatches && pageMatches.length > 0) {
        console.log(`✅ Conteo por objetos Page: ${pageMatches.length} páginas`);
        return pageMatches.length;
      }

      // MÉTODO 3: Buscar patrones de páginas en el stream
      const pageObjMatches = pdfString.match(/\d+\s+0\s+obj[^]*?\/Type\s*\/Page[^s]/g);
      if (pageObjMatches && pageObjMatches.length > 0) {
        console.log(`✅ Conteo por stream: ${pageObjMatches.length} páginas`);
        return pageObjMatches.length;
      }

      // MÉTODO 4: Fallback con pdf-lib si está disponible
      console.warn('⚠️ Métodos simples fallaron, intentando con pdf-lib...');
      try {
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pageCount = pdfDoc.getPageCount();
        console.log(`✅ Conteo con pdf-lib: ${pageCount} páginas`);
        return pageCount;
      } catch (pdfLibError) {
        console.error('❌ Error con pdf-lib:', pdfLibError.message);
      }

      // ÚLTIMO RECURSO: Estimación basada en tamaño del archivo
      const fileSizeKB = pdfBuffer.length / 1024;
      const estimatedPages = Math.max(1, Math.round(fileSizeKB / 100)); // ~100KB por página
      console.warn(`⚠️ Usando estimación por tamaño: ${estimatedPages} páginas`);
      return estimatedPages;

    } catch (error) {
      console.error('❌ Error en conteo de páginas:', error);
      console.log('🔄 Fallback final: 1 página');
      return 1;
    }
  },

  // ⭐ NUEVA función: Páginas ya procesadas
  async getReadyPageNumbers(chatId, userId) {
    const client = await pool.connect();
    try {
      const query = `
      SELECT DISTINCT (metadata->>'page')::int as page_number
      FROM pdfs 
      WHERE id_chat = $1 AND id_user = $2 
        AND metadata->>'page' IS NOT NULL 
        AND metadata->>'page' ~ '^[0-9]+$'
      ORDER BY page_number ASC
    `;

      const result = await client.query(query, [chatId, userId]);
      const pageNumbers = result.rows
        .map(row => row.page_number)
        .filter(page => page && page > 0);

      return pageNumbers;
    } catch (error) {
      console.error('Error obteniendo páginas listas:', error);
      return [];
    } finally {
      client.release();
    }
  }
};

export default PDFStorageService;